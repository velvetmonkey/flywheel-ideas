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
  activeWritePath,
  AssumptionInputError,
  AssumptionNotFoundError,
  declareAssumption,
  findDueSignposts,
  forgetAssumption,
  getAssumption,
  IdeaNotFoundError,
  listAssumptions,
  lockAssumption,
  unlockAssumption,
  type IdeasDatabase,
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
      'assumptions whose re-eval date has elapsed), forget (remove DB row). ',
      'Every response includes next_steps.',
    ].join(''),
    {
      action: z
        .enum(['declare', 'list', 'lock', 'unlock', 'signposts_due', 'forget'])
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
      write_path: activeWritePath,
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
        write_path: activeWritePath,
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
        write_path: activeWritePath,
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
      write_path: activeWritePath,
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
      write_path: activeWritePath,
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
