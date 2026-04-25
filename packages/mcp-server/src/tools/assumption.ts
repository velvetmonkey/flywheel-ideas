/**
 * `assumption` MCP tool — declare, list, lock, unlock, signposts_due, forget.
 *
 * Flat schema + action-discriminator pattern matches the `idea` tool (and
 * flywheel-memory's convention) for MCP SDK interop. Runtime resolution
 * happens in the handler.
 *
 * Every response is `{result, next_steps}` per the UX contract. Validation
 * errors carry recovery next_steps. Unhandled exceptions are caught at the
 * top level and returned as mcpError envelopes.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AssumptionActionValidationError,
  getActiveWritePath,
  AssumptionInputError,
  AssumptionNotFoundError,
  declareAssumption,
  findDueSignposts,
  forgetAssumption,
  getAssumption,
  getAssumptionExtension,
  IdeaNotFoundError,
  listAssumptions,
  lockAssumption,
  radarAssumptions,
  RadarInputError,
  setAssumptionExtension,
  unlockAssumption,
  type AssumptionAction,
  type AssumptionExtensionRow,
  type AssumptionMapping,
  type IdeasDatabase,
  type RadarHit,
  type ThresholdDirection,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../next_steps.js';

export function registerAssumptionTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'assumption',
    [
      'Manage assumptions that underpin ideas — the load-bearing claims the ',
      'council attacks and that outcomes later refute or validate. ',
      'Actions: declare (Y-statement or free text), list (by idea), ',
      'lock/unlock (OSF-style pre-registration), signposts_due (find ',
      'assumptions whose re-eval date has elapsed), forget (remove DB row), ',
      'extension_set (v0.2 reference-class / metric / mapping / shaping + ',
      'hedging actions), extension_get (read the full extension row). ',
      'Every response includes next_steps.',
    ].join(''),
    {
      action: z
        .enum([
          'declare',
          'list',
          'lock',
          'unlock',
          'signposts_due',
          'forget',
          'radar',
          'extension_set',
          'extension_get',
        ])
        .describe('Operation to perform'),
      // declare + list + signposts_due
      idea_id: z
        .string()
        .optional()
        .describe('[declare|list|signposts_due] The parent idea id'),
      // declare (text OR structured)
      text: z
        .string()
        .optional()
        .describe('[declare] Free-form assumption text. Used if structured fields are not all set.'),
      context: z
        .string()
        .optional()
        .describe('[declare] Y-statement: the context in which the assumption applies'),
      challenge: z
        .string()
        .optional()
        .describe('[declare] Y-statement: the challenge or problem being faced'),
      decision: z
        .string()
        .optional()
        .describe('[declare] Y-statement: the assumed decision / belief'),
      tradeoff: z
        .string()
        .optional()
        .describe('[declare] Y-statement: the downside accepted by the decision'),
      signpost_at: z
        .number()
        .int()
        .optional()
        .describe('[declare] Unix-ms timestamp when the assumption should be re-evaluated'),
      signpost_reason: z
        .string()
        .optional()
        .describe('[declare] Short note on what triggers the re-evaluation'),
      load_bearing: z
        .boolean()
        .optional()
        .describe('[declare] Whether the idea falls if this assumption fails (default false)'),
      // list
      include_stale: z
        .boolean()
        .optional()
        .describe('[list] Include assumptions whose markdown file is missing (default false)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('[list|signposts_due] Max results (default 200 for list, 50 for signposts_due)'),
      // lock / unlock / forget
      id: z
        .string()
        .optional()
        .describe('[lock|unlock|forget] Assumption id returned by declare'),
      // signposts_due
      window_ms: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('[signposts_due] Extend the horizon N ms into the future (default 0)'),
      // v0.2 D9 — Assumption Radar
      all_load_bearing: z
        .boolean()
        .optional()
        .describe(
          '[radar] Sweep all load-bearing open assumptions across the vault. Mutually exclusive with idea_id.',
        ),
      limit_per_assumption: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('[radar] Max vault hits per assumption (default 5)'),
      max_assumptions: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('[radar] Max assumptions to scan in one sweep (default 20)'),
      // v0.2 extension_set + extension_get — reference-class / metric / mapping
      // / shaping + hedging actions (RAND ABP complete).
      base_rate: z
        .number()
        .nullable()
        .optional()
        .describe(
          '[extension_set] Reference-class base rate 0..1 (Good Judgment framing). null clears.',
        ),
      go_threshold: z
        .number()
        .nullable()
        .optional()
        .describe('[extension_set] Metaculus-style threshold above which the bet is ON. null clears.'),
      kill_threshold: z
        .number()
        .nullable()
        .optional()
        .describe('[extension_set] Threshold below which the bet is OFF. null clears.'),
      predicted_metric: z
        .string()
        .nullable()
        .optional()
        .describe('[extension_set] Amplitude pattern — the single metric this assumption commits to.'),
      threshold_value: z
        .number()
        .nullable()
        .optional()
        .describe('[extension_set] Numeric pass/fail value for predicted_metric. null clears.'),
      threshold_direction: z
        .enum(['up', 'down', 'equal'])
        .nullable()
        .optional()
        .describe('[extension_set] Direction of the threshold test. null clears.'),
      mapping: z
        .object({
          segment: z.string().optional(),
          context: z.string().optional(),
          claim: z.string().optional(),
          mechanism: z.string().optional(),
          metric: z.string().optional(),
          threshold: z.string().optional(),
          horizon_ms: z.number().int().optional(),
        })
        .nullable()
        .optional()
        .describe(
          '[extension_set] Cross-project mapping fields (segment/context/claim/mechanism/metric/threshold/horizon_ms). null clears.',
        ),
      shaping_actions: z
        .array(
          z.object({
            description: z.string().min(1),
            due_at: z.string().optional(),
            owner: z.string().optional(),
            status: z.enum(['planned', 'in_progress', 'done', 'cancelled']).optional(),
            notes: z.string().optional(),
          }),
        )
        .nullable()
        .optional()
        .describe(
          '[extension_set] RAND ABP shaping actions — proactive work to make the assumption MORE likely to hold. null clears.',
        ),
      hedging_actions: z
        .array(
          z.object({
            description: z.string().min(1),
            due_at: z.string().optional(),
            owner: z.string().optional(),
            status: z.enum(['planned', 'in_progress', 'done', 'cancelled']).optional(),
            notes: z.string().optional(),
          }),
        )
        .nullable()
        .optional()
        .describe(
          '[extension_set] RAND ABP hedging actions — insurance if the assumption DOESN\'T hold. null clears.',
        ),
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'declare':
            return await handleDeclare(getVaultPath(), getDb(), args);
          case 'list':
            return handleList(getVaultPath(), getDb(), args);
          case 'lock':
            return await handleLock(getVaultPath(), getDb(), args);
          case 'unlock':
            return await handleUnlock(getVaultPath(), getDb(), args);
          case 'signposts_due':
            return handleSignpostsDue(getDb(), args);
          case 'forget':
            return handleForget(getDb(), args);
          case 'radar':
            return await handleRadar(getVaultPath(), getDb(), args);
          case 'extension_set':
            return handleExtensionSet(getDb(), args);
          case 'extension_get':
            return handleExtensionGet(getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`assumption.${args.action} failed: ${message}`, [
          {
            action: 'assumption.list',
            example: args.idea_id
              ? `assumption.list({ idea_id: "${args.idea_id}" })`
              : 'idea.list({})',
            why: 'Inspect current state to diagnose.',
          },
        ]);
      }
    },
  );
}

// ---------- assumption.declare ----------

async function handleDeclare(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    idea_id?: string;
    text?: string;
    context?: string;
    challenge?: string;
    decision?: string;
    tradeoff?: string;
    signpost_at?: number;
    signpost_reason?: string;
    load_bearing?: boolean;
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.idea_id) {
    return mcpError('declare requires `idea_id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the one this assumption belongs to.',
      },
    ]);
  }

  const structured =
    args.context && args.challenge && args.decision && args.tradeoff
      ? {
          context: args.context,
          challenge: args.challenge,
          decision: args.decision,
          tradeoff: args.tradeoff,
        }
      : undefined;

  if (!structured && !args.text) {
    return mcpError('declare requires either `text` or all four of {context, challenge, decision, tradeoff}', [
      {
        action: 'assumption.declare',
        example: `assumption.declare({ idea_id: "${args.idea_id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
        why: 'Y-statement form is preferred — it forces the context, challenge, decision, and accepted tradeoff into the open so the council can attack specifics.',
      },
    ]);
  }

  try {
    const { assumption, write_path } = await declareAssumption(db, vaultPath, {
      idea_id: args.idea_id,
      text: args.text,
      structured,
      signpost_at: args.signpost_at,
      signpost_reason: args.signpost_reason,
      load_bearing: args.load_bearing,
    });

    const next_steps: NextStep[] = [
      {
        action: 'assumption.list',
        example: `assumption.list({ idea_id: "${args.idea_id}" })`,
        why: 'See all declared assumptions for this idea side by side.',
      },
    ];
    if (assumption.load_bearing && !args.signpost_at) {
      next_steps.push({
        action: 'assumption.lock',
        example: `assumption.lock({ id: "${assumption.id}" })`,
        why: 'Lock the assumption before running council (OSF-style pre-registration) so the council evaluates the statement you committed to, not a revised one.',
      });
    }
    if (assumption.load_bearing && args.signpost_at == null) {
      next_steps.push({
        action: 'assumption.declare',
        example: `assumption.declare({ idea_id: "${args.idea_id}", text: "...", load_bearing: true, signpost_at: <unix_ms>, signpost_reason: "..." })`,
        why: 'Load-bearing assumptions without a signpost won\'t resurface automatically — consider attaching a re-eval date.',
      });
    }
    next_steps.push({
      action: 'council.run',
      example: `council.run({ id: "${args.idea_id}", depth: "light", mode: "pre_mortem" })`,
      why: 'Run the council to stress-test the assumption(s).',
    });

    return mcpText({
      result: {
        id: assumption.id,
        idea_id: assumption.idea_id,
        text: assumption.text,
        status: assumption.status,
        load_bearing: assumption.load_bearing,
        signpost_at: assumption.signpost_at,
        locked_at: assumption.locked_at,
        vault_path: assumption.vault_path,
        write_path,
        declared_at: assumption.declared_at,
      },
      next_steps,
    });
  } catch (err) {
    if (err instanceof IdeaNotFoundError) {
      return mcpError(err.message, [
        {
          action: 'idea.list',
          example: 'idea.list({})',
          why: 'Parent idea not found. List ideas to confirm the id.',
        },
      ]);
    }
    if (err instanceof AssumptionInputError) {
      return mcpError(err.message, [
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${args.idea_id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
          why: 'Provide either free text or all four structured fields.',
        },
      ]);
    }
    throw err;
  }
}

// ---------- assumption.list ----------

function handleList(
  vaultPath: string,
  db: IdeasDatabase,
  args: { idea_id?: string; include_stale?: boolean; limit?: number },
): ReturnType<typeof mcpText> {
  if (!args.idea_id) {
    return mcpError('list requires `idea_id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the id whose assumptions you want to inspect.',
      },
    ]);
  }

  const { assumptions, stale_hidden } = listAssumptions(db, vaultPath, args.idea_id, {
    include_stale: args.include_stale,
    limit: args.limit,
  });

  const next_steps: NextStep[] = [];
  if (assumptions.length === 0) {
    next_steps.push({
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${args.idea_id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
      why: stale_hidden > 0
        ? `No active assumptions (${stale_hidden} stale rows hidden — pass include_stale: true). Declare the first load-bearing claim.`
        : 'No assumptions yet — declare the first load-bearing claim the council should attack.',
    });
  } else {
    const loadBearing = assumptions.filter((a) => a.load_bearing);
    const unlocked = assumptions.filter((a) => a.locked_at == null);
    if (loadBearing.length > 0 && unlocked.length > 0) {
      next_steps.push({
        action: 'assumption.lock',
        example: `assumption.lock({ id: "${unlocked[0].id}" })`,
        why: 'Lock load-bearing assumptions before council runs so the preregistered statement is what the council evaluates.',
      });
    }
    next_steps.push({
      action: 'idea.read',
      example: `idea.read({ id: "${args.idea_id}" })`,
      why: 'Jump back to the parent idea for context.',
    });
  }
  if (stale_hidden > 0 && assumptions.length > 0) {
    next_steps.push({
      action: 'assumption.list',
      example: `assumption.list({ idea_id: "${args.idea_id}", include_stale: true })`,
      why: `${stale_hidden} assumption(s) have missing markdown files. Pass include_stale: true to review them, or use assumption.forget to clean up.`,
    });
  }

  return mcpText({
    result: {
      assumptions: assumptions.map((a) => ({
        id: a.id,
        idea_id: a.idea_id,
        text: a.text,
        status: a.status,
        load_bearing: a.load_bearing,
        signpost_at: a.signpost_at,
        signpost_reason: a.signpost_reason,
        locked_at: a.locked_at,
        vault_path: a.vault_path,
        declared_at: a.declared_at,
        ...(a.stale ? { stale: true as const } : {}),
      })),
      count: assumptions.length,
      stale_hidden,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

// ---------- assumption.lock / unlock ----------

async function handleLock(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('lock requires `id`', [
      {
        action: 'assumption.list',
        example: 'assumption.list({ idea_id: "..." })',
        why: 'List assumptions to find the id to lock.',
      },
    ]);
  }
  try {
    const updated = await lockAssumption(db, vaultPath, args.id);
    return mcpText({
      result: {
        id: updated.id,
        idea_id: updated.idea_id,
        locked_at: updated.locked_at,
        vault_path: updated.vault_path,
        write_path: getActiveWritePath(),
      },
      next_steps: [
        {
          action: 'council.run',
          example: `council.run({ id: "${updated.idea_id}", depth: "light", mode: "pre_mortem" })`,
          why: 'Assumptions are preregistered — run the council now to evaluate against the locked set.',
        },
        {
          action: 'assumption.unlock',
          example: `assumption.unlock({ id: "${updated.id}" })`,
          why: 'Undo the lock if you need to amend the statement before council runs.',
        },
      ],
    });
  } catch (err) {
    if (err instanceof AssumptionNotFoundError) {
      return mcpError(err.message);
    }
    throw err;
  }
}

async function handleUnlock(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('unlock requires `id`', [
      {
        action: 'assumption.list',
        example: 'assumption.list({ idea_id: "..." })',
        why: 'List assumptions to find the id to unlock.',
      },
    ]);
  }
  try {
    const updated = await unlockAssumption(db, vaultPath, args.id);
    return mcpText({
      result: {
        id: updated.id,
        idea_id: updated.idea_id,
        locked_at: null,
        vault_path: updated.vault_path,
        write_path: getActiveWritePath(),
      },
      next_steps: [
        {
          action: 'assumption.list',
          example: `assumption.list({ idea_id: "${updated.idea_id}" })`,
          why: 'Inspect the full assumption set now that this one is editable.',
        },
      ],
    });
  } catch (err) {
    if (err instanceof AssumptionNotFoundError) {
      return mcpError(err.message);
    }
    throw err;
  }
}

// ---------- assumption.signposts_due ----------

function handleSignpostsDue(
  db: IdeasDatabase,
  args: { idea_id?: string; window_ms?: number; limit?: number },
): ReturnType<typeof mcpText> {
  const due = findDueSignposts(db, Date.now(), {
    idea_id: args.idea_id,
    window_ms: args.window_ms,
    limit: args.limit,
  });

  const next_steps: NextStep[] = [];
  if (due.length === 0) {
    next_steps.push({
      action: 'idea.list',
      example: 'idea.list({ state: "committed" })',
      why: 'No signposts currently due. Browse committed ideas to check on them manually.',
    });
  } else {
    // Group by idea so the LLM can prioritize.
    const uniqueIdeaIds = [...new Set(due.map((d) => d.idea_id))];
    next_steps.push({
      action: 'idea.read',
      example: `idea.read({ id: "${uniqueIdeaIds[0]}" })`,
      why: 'Re-read the first idea with a due signpost for full context before deciding whether reality has validated or refuted the assumption.',
    });
    next_steps.push({
      action: 'assumption.list',
      example: `assumption.list({ idea_id: "${uniqueIdeaIds[0]}" })`,
      why: 'See all assumptions for that idea (not just the due ones) — often the resolution of one changes the picture for others.',
    });
  }

  return mcpText({
    result: {
      due: due.map((d) => ({
        id: d.id,
        idea_id: d.idea_id,
        text: d.text,
        signpost_at: d.signpost_at,
        signpost_reason: d.signpost_reason,
        elapsed_ms: d.elapsed_ms,
        locked_at: d.locked_at,
      })),
      count: due.length,
      checked_at: Date.now(),
      window_ms: args.window_ms ?? 0,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

// ---------- assumption.forget ----------

function handleForget(
  db: IdeasDatabase,
  args: { id?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('forget requires `id`', [
      {
        action: 'assumption.list',
        example: 'assumption.list({ idea_id: "..." })',
        why: 'List assumptions to find the id to forget.',
      },
    ]);
  }
  const existing = getAssumption(db, args.id);
  if (!existing) {
    return mcpError(`assumption not found: ${args.id}`);
  }
  const forgotten = forgetAssumption(db, args.id);
  return mcpText({
    result: {
      id: forgotten.id,
      idea_id: forgotten.idea_id,
      forgotten_from_status: forgotten.status,
      vault_path: forgotten.vault_path,
      write_path: getActiveWritePath(),
      note: 'Database row removed. The markdown file was not touched — delete it separately if you want it gone.',
    },
    next_steps: [
      {
        action: 'assumption.list',
        example: `assumption.list({ idea_id: "${forgotten.idea_id}" })`,
        why: 'Confirm the assumption no longer appears in the idea\'s listing.',
      },
    ],
  });
}

// ---------- assumption.radar (v0.2 D9) ----------

/**
 * Surface vault hits that *might* validate or refute open assumptions.
 *
 * Per the v0.2 brainstorm council verdict: surfaces `related_mention` hits
 * ONLY — no keyword classification (the brainstorm attacked auto-classification
 * as the same fuzzy heuristic that breaks falsifiability). The user reads the
 * excerpt and decides whether each hit is a refute / validate signal. The
 * outcome.log call stays human-driven; Radar provides the surface, never the
 * verdict.
 */
async function handleRadar(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    idea_id?: string;
    all_load_bearing?: boolean;
    limit_per_assumption?: number;
    max_assumptions?: number;
  },
): Promise<ReturnType<typeof mcpText>> {
  try {
    const result = await radarAssumptions(db, vaultPath, {
      idea_id: args.idea_id,
      all_load_bearing: args.all_load_bearing,
      limit_per_assumption: args.limit_per_assumption,
      max_assumptions: args.max_assumptions,
    });

    const next_steps: NextStep[] = [];

    if (!result.reader_available) {
      next_steps.push({
        action: 'install_flywheel_memory',
        example: 'npm install -g @velvetmonkey/flywheel-memory',
        why: `Radar needs flywheel-memory for vault search; subprocess unavailable (${result.reader_skip_reason ?? 'unknown'}). Install + retry, or set FLYWHEEL_IDEAS_MEMORY_BRIDGE=0 if intentional.`,
      });
    } else if (result.hits.length === 0 && result.assumptions_scanned === 0) {
      next_steps.push({
        action: 'assumption.declare',
        example: 'assumption.declare({ idea_id: "<idea>", text: "..." })',
        why: 'No open assumptions in scope to scan. Declare assumptions first; Radar surfaces vault signals once you have load-bearing claims.',
      });
    } else if (result.hits.length === 0) {
      next_steps.push({
        action: 'assumption.list',
        example: args.idea_id
          ? `assumption.list({ idea_id: "${args.idea_id}" })`
          : 'idea.list({ state: "committed" })',
        why: `Scanned ${result.assumptions_scanned} assumption(s); no related vault notes surfaced. Either the vault hasn't accumulated relevant signals yet, or the assumption text needs sharper keywords.`,
      });
    } else {
      // For the top hit, propose outcome.log WITHOUT pre-filled refutes/validates
      // (per the falsifiability discipline — user reads + decides).
      const top = result.hits[0];
      // Surface the assumption's parent idea so outcome.log has the right idea_id.
      const parent = db
        .prepare('SELECT idea_id FROM ideas_assumptions WHERE id = ?')
        .get(top.assumption_id) as { idea_id: string } | undefined;
      next_steps.push({
        action: 'outcome.log',
        example: `outcome.log({ idea_id: "${parent?.idea_id ?? '<idea>'}", text: ${JSON.stringify(top.excerpt.slice(0, 200))} })`,
        why: `Radar surfaced "${top.vault_path}" as related to assumption ${top.assumption_id}. Read the excerpt — if it validates or refutes the assumption, log an outcome with the appropriate refutes/validates array. Radar deliberately does NOT pre-fill the verdict (falsifiability discipline).`,
      });
      // If multiple hits, add a "list all" hint.
      if (result.hits.length > 1) {
        next_steps.push({
          action: 'idea.read',
          example: `idea.read({ id: "${parent?.idea_id ?? '<idea>'}" })`,
          why: `${result.hits.length} total hits across ${result.assumptions_scanned} assumption(s). Re-read the parent idea(s) for context before classifying each hit.`,
        });
      }
    }

    return mcpText({
      result: {
        assumptions_scanned: result.assumptions_scanned,
        reader_available: result.reader_available,
        reader_skip_reason: result.reader_skip_reason ?? null,
        hits: result.hits.map((h: RadarHit) => ({
          assumption_id: h.assumption_id,
          assumption_text: h.assumption_text,
          vault_path: h.vault_path,
          excerpt: h.excerpt.slice(0, 500), // cap for prompt-budget hygiene
          score: h.score,
        })),
        hit_count: result.hits.length,
        write_path: getActiveWritePath(),
      },
      next_steps,
    });
  } catch (err) {
    if (err instanceof RadarInputError) {
      return mcpError(err.message, [
        {
          action: 'assumption.radar',
          example: 'assumption.radar({ all_load_bearing: true })',
          why: 'Sweep all load-bearing open assumptions across the vault — the most common Radar shape.',
        },
      ]);
    }
    throw err;
  }
}

// ---------- assumption.extension_set / extension_get (v0.2 RAND ABP complete) ----------

interface ExtensionSetArgs {
  id?: string;
  base_rate?: number | null;
  go_threshold?: number | null;
  kill_threshold?: number | null;
  predicted_metric?: string | null;
  threshold_value?: number | null;
  threshold_direction?: ThresholdDirection | null;
  mapping?: AssumptionMapping | null;
  shaping_actions?: AssumptionAction[] | null;
  hedging_actions?: AssumptionAction[] | null;
}

function handleExtensionSet(
  db: IdeasDatabase,
  args: ExtensionSetArgs,
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('extension_set requires `id`', [
      {
        action: 'assumption.list',
        example: 'assumption.list({})',
        why: 'List assumptions to find the id to extend.',
      },
    ]);
  }
  const row = getAssumption(db, args.id);
  if (!row) {
    return mcpError(`assumption not found: ${args.id}`, [
      {
        action: 'assumption.list',
        example: 'assumption.list({})',
        why: 'The assumption id does not exist.',
      },
    ]);
  }
  try {
    setAssumptionExtension(db, args.id, {
      base_rate: args.base_rate,
      go_threshold: args.go_threshold,
      kill_threshold: args.kill_threshold,
      predicted_metric: args.predicted_metric,
      threshold_value: args.threshold_value,
      threshold_direction: args.threshold_direction,
      mapping: args.mapping,
      shaping_actions: args.shaping_actions,
      hedging_actions: args.hedging_actions,
    });
  } catch (err) {
    if (err instanceof AssumptionActionValidationError) {
      return mcpError(err.message, [
        {
          action: 'assumption.extension_get',
          example: `assumption.extension_get({ id: "${args.id}" })`,
          why: 'Read the current extension row before retrying to see which fields already have values.',
        },
      ]);
    }
    throw err;
  }
  const updated = getAssumptionExtension(db, args.id);
  return mcpText({
    result: {
      id: args.id,
      extension: extensionToResponse(updated),
      write_path: getActiveWritePath(),
    },
    next_steps: nextStepsForExtension(args.id, updated),
  });
}

function handleExtensionGet(
  db: IdeasDatabase,
  args: { id?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('extension_get requires `id`', [
      {
        action: 'assumption.list',
        example: 'assumption.list({})',
        why: 'List assumptions to find the id to inspect.',
      },
    ]);
  }
  const row = getAssumption(db, args.id);
  if (!row) {
    return mcpError(`assumption not found: ${args.id}`);
  }
  const ext = getAssumptionExtension(db, args.id);
  return mcpText({
    result: {
      id: args.id,
      extension: extensionToResponse(ext),
      write_path: getActiveWritePath(),
    },
    next_steps: nextStepsForExtension(args.id, ext),
  });
}

function extensionToResponse(
  row: AssumptionExtensionRow | null,
): Record<string, unknown> | null {
  if (!row) return null;
  return {
    base_rate: row.base_rate,
    go_threshold: row.go_threshold,
    kill_threshold: row.kill_threshold,
    predicted_metric: row.predicted_metric,
    threshold_value: row.threshold_value,
    threshold_direction: row.threshold_direction,
    mapping: row.mapping,
    shaping_actions: row.shaping_actions,
    hedging_actions: row.hedging_actions,
    updated_at: row.updated_at,
  };
}

function nextStepsForExtension(
  id: string,
  ext: AssumptionExtensionRow | null,
): NextStep[] {
  const steps: NextStep[] = [];
  if (!ext || (!ext.shaping_actions && !ext.hedging_actions)) {
    steps.push({
      action: 'assumption.extension_set',
      example: `assumption.extension_set({ id: "${id}", shaping_actions: [{ description: "..." }], hedging_actions: [{ description: "..." }] })`,
      why: 'RAND ABP completes when shaping + hedging are declared alongside signposts. Shaping makes the assumption more likely to hold; hedging is insurance if it doesn\'t.',
    });
  }
  if (
    ext &&
    (ext.predicted_metric === null || ext.predicted_metric === undefined) &&
    (ext.base_rate === null || ext.base_rate === undefined)
  ) {
    steps.push({
      action: 'assumption.extension_set',
      example: `assumption.extension_set({ id: "${id}", predicted_metric: "...", threshold_value: 0.5, threshold_direction: "up" })`,
      why: 'Falsifiable-metric assumption (Amplitude pattern) — declaring predicted_metric + threshold makes outcome adjudication mechanical.',
    });
  }
  steps.push({
    action: 'assumption.extension_get',
    example: `assumption.extension_get({ id: "${id}" })`,
    why: 'Re-read the extension row to confirm what was written.',
  });
  return steps;
}
