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
  activeWritePath,
  approvalStatusForResponse,
  approvalsFilePath,
  CouncilOrchestratorError,
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
      'idea. In v0.1 the real dispatcher lands in M8 — M6 ships the consent ',
      'plane (approval-gated stub) so the safety UX can be exercised now. ',
      'Actions: run (approval-gated; returns dispatcher_pending in M6), ',
      'approval_status (read-only). Approval is set out-of-band via env ',
      'var FLYWHEEL_IDEAS_APPROVE or a manual edit of ',
      '<vault>/.flywheel/ideas-approvals.json — the LLM cannot grant, ',
      'revoke, or reset approval. Every response includes next_steps.',
    ].join(''),
    {
      action: z.enum(['run', 'approval_status']).describe('Operation to perform'),
      // run
      id: z.string().optional().describe('[run] The idea id to dispatch the council against'),
      depth: z
        .enum(['light', 'full'])
        .optional()
        .describe('[run] light = 2 models x 2 personas; full = 3 x 5 (default light)'),
      mode: z
        .enum(['standard', 'pre_mortem'])
        .optional()
        .describe('[run] standard stance vs backwards-from-failure pre_mortem (default pre_mortem)'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          '[run] Required true to acknowledge the council will spawn CLI subprocesses. Separate from the out-of-band approval gate.',
        ),
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'run':
            return await handleRun(getVaultPath(), getDb(), args);
          case 'approval_status':
            return await handleApprovalStatus(getVaultPath());
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
  args: { id?: string; depth?: 'light' | 'full'; mode?: 'standard' | 'pre_mortem'; confirm?: boolean },
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

  // Test-injection hook: FLYWHEEL_IDEAS_SPAWN_PREFIX can be a JSON array
  // (e.g., ["node","/path/to/mock-claude.mjs"]) to redirect the spawn at
  // a mock binary without changing the MCP surface. Unset in production.
  const spawn_override = resolveSpawnOverride();

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
      { spawn_override },
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
      write_path: activeWritePath,
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
        why: 'Pick an idea to stress-test. Real council dispatcher lands in M8.',
      },
      {
        action: 'council.run',
        example: 'council.run({ id: "<idea_id>", confirm: true, depth: "light", mode: "pre_mortem" })',
        why: 'Exercise the approval-gated stub end-to-end (returns dispatcher_pending until M8).',
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
      write_path: activeWritePath,
    },
    next_steps,
  });
}
