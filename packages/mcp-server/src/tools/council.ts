/**
 * `council` MCP tool — approval-gated dispatcher surface.
 *
 * M6 scope: ship the consent plane. Actions:
 *   - `run` — approval-gated stub. Returns `{status: 'dispatcher_pending'}`
 *     when approved. **No dispatch row written** — real dispatcher lands in
 *     M8 and will be the first caller of `logDispatchStart`.
 *   - `approval_status` — read-only inspection of current approval state.
 *
 * Mutation is **not exposed**. Approval is set out-of-band:
 *   - Env var `FLYWHEEL_IDEAS_APPROVE=always|session|never` (preferred for
 *     one-off grants; takes precedence over the file).
 *   - Manual edit of `<vault>/.flywheel/ideas-approvals.json` for persistent
 *     grants across server restarts.
 *
 * Rationale: MCP tool arguments are model-generated. A grant/reset action
 * on the tool surface means any sufficiently-eager LLM can self-grant or
 * clear a user's `never` block. Keeping consent mutation out-of-band makes
 * the user the only principal that can change the state.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getActiveWritePath,
  approvalStatusForResponse,
  approvalsFilePath,
  computeDecisionDelta,
  CouncilOrchestratorError,
  DeltaInputError,
  resolveApproval,
  runCouncil,
  type CouncilMode,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../next_steps.js';

const APPROVAL_ENV_VAR = 'FLYWHEEL_IDEAS_APPROVE';

export function registerCouncilTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'council',
    [
      'Multi-model AI council that stress-tests the assumptions behind an ',
      'idea. Spawns one subprocess per (CLI × persona) cell — full depth ',
      'is 3 CLIs (claude, codex, gemini) × 5 personas = 15 cells, each ',
      'doing a two-pass metacognitive run. Concurrency capped (default 3); ',
      'failures classified per cell; one cell failing never aborts the ',
      'session; synthesis distills agreement + disagreement across views. ',
      'Actions: run (approval-gated; spawns subprocesses), approval_status ',
      '(read-only). Approval is set out-of-band via env var ',
      'FLYWHEEL_IDEAS_APPROVE or a manual edit of ',
      '<vault>/.flywheel/ideas-approvals.json — the LLM cannot grant, ',
      'revoke, or reset approval. Every response includes next_steps.',
    ].join(''),
    {
      action: z
        .enum(['run', 'approval_status', 'delta'])
        .describe('Operation to perform'),
      // run
      id: z.string().optional().describe('[run] The idea id to dispatch the council against'),
      depth: z
        .enum(['light', 'full'])
        .optional()
        .describe('[run] light = 2 models x 2 personas; full = 3 x 5 (default light)'),
      mode: z
        .enum(['standard', 'pre_mortem', 'steelman'])
        .optional()
        .describe(
          '[run] standard (attack from default stance) | pre_mortem (assume failure, work backwards) | steelman (defend strongest case for; counterweight to pre_mortem). Default: pre_mortem for nascent/explored ideas, standard otherwise.',
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          '[run] Required true to acknowledge the council will spawn CLI subprocesses. Separate from the out-of-band approval gate.',
        ),
      clis: z
        .array(z.enum(['claude', 'codex', 'gemini']))
        .optional()
        .describe(
          '[run] CLI subset to dispatch against (default: all three per depth). Useful for narrowing a session to one or two installed CLIs.',
        ),
      freeze: z
        .boolean()
        .optional()
        .describe(
          '[run] v0.2 OSF preregistration — create a fresh freeze snapshotting the idea + open assumptions AT dispatch time, bind to this council session. Mutually exclusive with freeze_id.',
        ),
      freeze_id: z
        .string()
        .optional()
        .describe(
          '[run] v0.2 OSF preregistration — bind a pre-existing freeze (from `idea.freeze`) to this council session. Mutually exclusive with `freeze: true`.',
        ),
      // v0.2 D6 — decision_delta read-side
      idea_id: z
        .string()
        .optional()
        .describe('[delta] Idea whose two sessions to compare'),
      from_session_id: z
        .string()
        .optional()
        .describe('[delta] Earlier session id'),
      to_session_id: z
        .string()
        .optional()
        .describe('[delta] Later session id'),
      significant_shift_threshold: z
        .number()
        .optional()
        .describe('[delta] |Δconfidence| above this counts as a significant persona shift (default 0.3)'),
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'run':
            return await handleRun(getVaultPath(), getDb(), args);
          case 'approval_status':
            return await handleApprovalStatus(getVaultPath());
          case 'delta':
            return handleDelta(getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`council.${args.action} failed: ${message}`, [
          {
            action: 'council.approval_status',
            example: 'council.approval_status({})',
            why: 'Inspect current approval state to diagnose.',
          },
        ]);
      }
    },
  );
}

// ---------- council.run ----------

async function handleRun(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    id?: string;
    depth?: 'light' | 'full';
    mode?: 'standard' | 'pre_mortem' | 'steelman';
    confirm?: boolean;
    clis?: Array<'claude' | 'codex' | 'gemini'>;
    freeze?: boolean;
    freeze_id?: string;
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('run requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the id to dispatch the council against.',
      },
    ]);
  }

  const idea = db
    .prepare(`SELECT id, state FROM ideas_notes WHERE id = ?`)
    .get(args.id) as { id: string; state: string } | undefined;
  if (!idea) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'The idea id does not exist. List ideas to confirm the id.',
      },
    ]);
  }

  if (args.confirm !== true) {
    return mcpError(
      'council.run requires confirm: true. This will spawn the claude CLI (one subprocess per persona). M8 ships claude + two personas (Risk Pessimist, Growth Optimist).',
      [
        {
          action: 'council.run',
          example: `council.run({ id: "${args.id}", depth: "light", confirm: true })`,
          why: 'Re-call with confirm: true to acknowledge subprocess spawn. Approval is a separate out-of-band gate.',
        },
      ],
    );
  }

  const state = await resolveApproval(vaultPath);
  if (!state.granted) {
    const file = approvalsFilePath(vaultPath);
    if (state.reason === 'never_env') {
      return mcpError(
        `Council dispatch blocked by ${APPROVAL_ENV_VAR}=never. Unset the env var or set it to always/session to proceed.`,
        [
          {
            action: 'council.approval_status',
            example: 'council.approval_status({})',
            why: 'Confirm the current env-var value and the approvals file location.',
          },
        ],
      );
    }
    if (state.reason === 'never_persisted') {
      return mcpError(
        `Council dispatch blocked by a persistent "never" decision at ${file}. Delete or edit that file to revoke the block.`,
        [
          {
            action: 'council.approval_status',
            example: 'council.approval_status({})',
            why: 'Confirm the file path and current state before editing.',
          },
        ],
      );
    }
    return mcpError(
      `No council-dispatch approval on record. Approve via env var ${APPROVAL_ENV_VAR}=session|always at server launch, or create ${file} with {schema:1, approvals:[{feature:"council_dispatch", scope:"always", granted_at:<unix_ms>, binaries:["claude","codex","gemini"]}]}. Approval cannot be granted from this tool — the user must set it out-of-band.`,
      [
        {
          action: 'council.approval_status',
          example: 'council.approval_status({})',
          why: 'Inspect the env-var name and approvals-file path expected by this vault.',
        },
      ],
    );
  }

  // APPROVED — real dispatch (M8).
  const mode: CouncilMode = args.mode ?? defaultModeForState(idea.state);

  // Test-injection hooks:
  //   FLYWHEEL_IDEAS_SPAWN_PREFIX = JSON array (legacy, claude-only)
  //   FLYWHEEL_IDEAS_SPAWN_PREFIXES = JSON object keyed by cli name
  //     e.g. '{"claude":["node","/path/mock-claude.mjs"],
  //            "codex":["node","/path/mock-codex.mjs"]}'
  // Unset in production.
  const spawn_override = resolveSpawnOverride();
  const spawn_overrides = resolveSpawnOverrides();

  let outcome;
  try {
    outcome = await runCouncil(
      db,
      vaultPath,
      {
        idea_id: args.id,
        depth: args.depth ?? 'light',
        mode,
        approval_scope: state.scope,
      },
      {
        spawn_override,
        spawn_overrides,
        clis_override: args.clis,
        freeze: args.freeze,
        freeze_id: args.freeze_id,
      },
    );
  } catch (err) {
    if (err instanceof CouncilOrchestratorError) {
      return mcpError(`council dispatch failed: ${err.message}`, [
        {
          action: 'idea.list',
          example: 'idea.list({})',
          why: 'Sanity-check the idea state before retrying.',
        },
      ]);
    }
    throw err;
  }

  const next_steps: NextStep[] = [
    {
      action: 'read_file',
      example: outcome.synthesis_vault_path,
      why: 'Read the deterministic synthesis comparing the two personas side-by-side.',
    },
    {
      action: 'idea.read',
      example: `idea.read({ id: "${args.id}" })`,
      why: 'Re-read the idea with council context now present in the vault.',
    },
    {
      action: 'assumption.signposts_due',
      example: `assumption.signposts_due({ idea_id: "${args.id}" })`,
      why: 'Any assumption the council flagged as fragile? Check signposts.',
    },
  ];

  if (outcome.failed_any) {
    next_steps.unshift({
      action: 'council.run',
      example: `council.run({ id: "${args.id}", confirm: true, mode: "${mode}" })`,
      why: 'One or more cells failed. The synthesis carries failure reasons + stderr tails — retry after diagnosing.',
    });
  }

  return mcpText({
    result: {
      status: outcome.status,
      session_id: outcome.session_id,
      synthesis_vault_path: outcome.synthesis_vault_path,
      views: outcome.views.map((v) => ({
        id: v.id,
        persona: v.persona,
        model: v.model,
        confidence: v.confidence,
        failure_reason: v.failure_reason,
        content_vault_path: v.content_vault_path,
      })),
      mode: outcome.mode,
      failed_any: outcome.failed_any,
      approval_source: state.source,
      approval_scope: state.scope,
      freeze_id: outcome.freeze_id,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

function resolveSpawnOverride(): string[] | undefined {
  const raw = process.env.FLYWHEEL_IDEAS_SPAWN_PREFIX;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed as string[];
    }
  } catch {
    // fall through
  }
  return undefined;
}

function resolveSpawnOverrides(): Partial<Record<'claude' | 'codex' | 'gemini', string[]>> | undefined {
  const raw = process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const out: Partial<Record<'claude' | 'codex' | 'gemini', string[]>> = {};
    for (const cli of ['claude', 'codex', 'gemini'] as const) {
      const v = (parsed as Record<string, unknown>)[cli];
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        out[cli] = v as string[];
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

function defaultModeForState(state: string): CouncilMode {
  // Per closed-loop spec: nascent/explored default to pre_mortem (counter
  // founder optimism early); evaluated/committed default to standard.
  if (state === 'nascent' || state === 'explored') return 'pre_mortem';
  return 'standard';
}

// ---------- council.approval_status ----------

async function handleApprovalStatus(
  vaultPath: string,
): Promise<ReturnType<typeof mcpText>> {
  const state = await resolveApproval(vaultPath);
  const payload = approvalStatusForResponse(vaultPath, state);

  const next_steps: NextStep[] = [];
  if (state.granted) {
    next_steps.push(
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'Pick an idea to stress-test with the council.',
      },
      {
        action: 'council.run',
        example: 'council.run({ id: "<idea_id>", confirm: true, depth: "light", mode: "pre_mortem" })',
        why: 'Run a real council session — spawns the configured CLI subprocesses with the approved scope. Light depth is 2 personas; full is 5.',
      },
    );
  } else {
    next_steps.push(
      {
        action: 'set_env',
        example: `${APPROVAL_ENV_VAR}=session npx @velvetmonkey/flywheel-ideas`,
        why: 'Session-scope approval: set the env var at server launch for a one-time grant.',
      },
      {
        action: 'edit_file',
        example: `echo '{"schema":1,"approvals":[{"feature":"council_dispatch","scope":"always","granted_at":${Date.now()},"binaries":["claude","codex","gemini"]}]}' > ${payload.approvals_file}`,
        why: 'Persistent approval: manually create the approvals file. The LLM cannot do this via MCP — you (the user) must.',
      },
    );
  }

  return mcpText({
    result: {
      ...payload,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

// ---------- council.delta (v0.2 D6) ----------

/**
 * Compute the structured diff between two council sessions for the same
 * idea. Read-only over existing tables. Useful for "what changed since the
 * last council run?" — the question the external reviewer flagged as more
 * useful than abstract disagreement metrics.
 */
function handleDelta(
  db: IdeasDatabase,
  args: {
    idea_id?: string;
    from_session_id?: string;
    to_session_id?: string;
    significant_shift_threshold?: number;
  },
): ReturnType<typeof mcpText> {
  if (!args.idea_id || !args.from_session_id || !args.to_session_id) {
    return mcpError(
      'delta requires `idea_id`, `from_session_id`, and `to_session_id`',
      [
        {
          action: 'idea.read',
          example: 'idea.read({ id: "<idea_id>" })',
          why: 'Inspect the idea to find candidate session ids in its council history.',
        },
      ],
    );
  }
  try {
    const delta = computeDecisionDelta(db, args.idea_id, args.from_session_id, args.to_session_id, {
      significant_shift_threshold: args.significant_shift_threshold,
    });
    const next_steps: NextStep[] = [];
    if (delta.summary.personas_with_significant_shift.length > 0) {
      next_steps.push({
        action: 'read_file',
        example: '<vault path of the to_session SYNTHESIS.md>',
        why: `${delta.summary.personas_with_significant_shift.length} persona(s) shifted significantly (|Δconfidence| > ${args.significant_shift_threshold ?? 0.3}). Read the new synthesis for the revised reasoning.`,
      });
    }
    if (delta.summary.new_risks_count > 0) {
      next_steps.push({
        action: 'idea.read',
        example: `idea.read({ id: "${args.idea_id}" })`,
        why: `${delta.summary.new_risks_count} new risk(s) surfaced in the second session. Review the idea for whether those risks now require new assumptions.`,
      });
    }
    if (next_steps.length === 0) {
      next_steps.push({
        action: 'idea.read',
        example: `idea.read({ id: "${args.idea_id}" })`,
        why: 'No significant shifts. Re-read the idea for context on what stayed stable.',
      });
    }
    return mcpText({ result: { ...delta, write_path: getActiveWritePath() }, next_steps });
  } catch (err) {
    if (err instanceof DeltaInputError) {
      return mcpError(err.message, [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${args.idea_id}" })`,
          why: 'Verify the idea + session ids before retrying.',
        },
      ]);
    }
    throw err;
  }
}
