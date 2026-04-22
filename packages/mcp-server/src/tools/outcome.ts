/**
 * `outcome` MCP tool — the compounding mechanism surface (M12).
 *
 * Actions:
 *   - `log`  — record what happened; refute/validate assumptions;
 *              cascade flags to dependent ideas
 *   - `undo` — reverse a prior log atomically
 *   - `list` — ordered by landed_at DESC; filters by idea
 *   - `read` — single-outcome detail
 *
 * `next_steps` point at the newly-flagged ideas so the calling agent
 * can surface them to the user. Without the cascade surfaced, the
 * compounding mechanism is invisible.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  activeWritePath,
  getOutcome,
  listOutcomes,
  logOutcome,
  OutcomeAlreadyUndoneError,
  OutcomeInputError,
  OutcomeNotFoundError,
  undoOutcome,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../next_steps.js';

export function registerOutcomeTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'outcome',
    [
      'Record what happened after an idea landed: refute assumptions that ',
      'turned out wrong, validate ones that turned out right. Refutations ',
      'cascade through the citation graph — every other idea that cited ',
      'the refuted assumption in its council gets flagged for re-review ',
      '(needs_review=1). This is the compounding mechanism — without it, ',
      'the vault is a journal; with it, assumption failures propagate. ',
      'Every response includes next_steps; reversible via outcome.undo.',
    ].join(''),
    {
      action: z.enum(['log', 'undo', 'list', 'read']).describe('Operation to perform'),
      // log
      idea_id: z
        .string()
        .optional()
        .describe('[log] Idea this outcome belongs to (usually the idea the outcome happened on)'),
      text: z
        .string()
        .optional()
        .describe('[log] Free-form description of what happened and what was learned'),
      refutes: z
        .array(z.string())
        .optional()
        .describe('[log] Assumption ids that reality proved wrong'),
      validates: z
        .array(z.string())
        .optional()
        .describe('[log] Assumption ids that reality confirmed'),
      // undo / read
      id: z
        .string()
        .optional()
        .describe('[undo|read] Outcome id'),
      // list
      include_stale: z
        .boolean()
        .optional()
        .describe('[list] Include outcomes whose markdown file is missing (default false)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('[list] Max results (default 200)'),
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'log':
            return await handleLog(getVaultPath(), getDb(), args);
          case 'undo':
            return await handleUndo(getVaultPath(), getDb(), args);
          case 'list':
            return handleList(getVaultPath(), getDb(), args);
          case 'read':
            return handleRead(getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`outcome.${args.action} failed: ${message}`, [
          {
            action: 'outcome.list',
            example: args.idea_id
              ? `outcome.list({ idea_id: "${args.idea_id}" })`
              : 'outcome.list({})',
            why: 'Inspect existing outcomes for context.',
          },
        ]);
      }
    },
  );
}

// ---------- outcome.log ----------

async function handleLog(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    idea_id?: string;
    text?: string;
    refutes?: string[];
    validates?: string[];
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.idea_id) {
    return mcpError('log requires `idea_id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'Find the idea this outcome belongs to.',
      },
    ]);
  }
  if (!args.text || !args.text.trim()) {
    return mcpError('log requires non-empty `text`', [
      {
        action: 'outcome.log',
        example: `outcome.log({ idea_id: "${args.idea_id}", text: "What happened...", refutes: ["asm-..."] })`,
        why: 'Describe what reality showed — the text is human-readable audit for future re-review.',
      },
    ]);
  }

  try {
    const result = await logOutcome(db, vaultPath, {
      idea_id: args.idea_id,
      text: args.text,
      refutes: args.refutes,
      validates: args.validates,
    });

    const next_steps: NextStep[] = [];
    if (result.flagged_ideas.length > 0) {
      next_steps.push({
        action: 'idea.read',
        example: `idea.read({ id: "${result.flagged_ideas[0].id}" })`,
        why: `Re-review "${result.flagged_ideas[0].title}" — its council cited an assumption you just refuted. ${
          result.flagged_ideas.length > 1 ? result.flagged_ideas.length - 1 + ' more idea(s) also flagged.' : ''
        }`,
      });
      next_steps.push({
        action: 'idea.list',
        example: 'idea.list({ state: "committed" })',
        why: 'See all committed ideas with needs_review flags set by this outcome.',
      });
    }
    next_steps.push({
      action: 'outcome.undo',
      example: `outcome.undo({ id: "${result.outcome.id}" })`,
      why: 'Reverse this outcome if you logged it by mistake — refutation unwinds idempotently.',
    });

    return mcpText({
      result: {
        id: result.outcome.id,
        idea_id: result.outcome.idea_id,
        vault_path: result.outcome.vault_path,
        landed_at: result.outcome.landed_at,
        refuted: result.refuted,
        validated: result.validated,
        flagged_ideas: result.flagged_ideas,
        flagged_count: result.flagged_ideas.length,
        write_path: result.write_path,
      },
      next_steps,
    });
  } catch (err) {
    if (err instanceof OutcomeInputError) {
      return mcpError(err.message, [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${args.idea_id}" })`,
          why: 'Confirm the idea and its assumption ids before retrying.',
        },
      ]);
    }
    throw err;
  }
}

// ---------- outcome.undo ----------

async function handleUndo(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('undo requires `id`', [
      {
        action: 'outcome.list',
        example: 'outcome.list({})',
        why: 'List outcomes to find the one to reverse.',
      },
    ]);
  }
  try {
    const result = await undoOutcome(db, vaultPath, args.id);
    const next_steps: NextStep[] = [
      {
        action: 'idea.list',
        example: 'idea.list({ state: "committed" })',
        why: 'Confirm that needs_review flags cleared on ideas that only depended on this outcome.',
      },
      {
        action: 'outcome.read',
        example: `outcome.read({ id: "${result.outcome.id}" })`,
        why: 'Re-read the now-undone outcome for audit.',
      },
    ];
    return mcpText({
      result: {
        id: result.outcome.id,
        undone_at: result.outcome.undone_at,
        status_changes: result.status_changes,
        cleared_ideas: result.cleared_ideas,
        write_path: result.write_path,
      },
      next_steps,
    });
  } catch (err) {
    if (err instanceof OutcomeNotFoundError) {
      return mcpError(err.message, [
        {
          action: 'outcome.list',
          example: 'outcome.list({})',
          why: 'List outcomes to confirm the id.',
        },
      ]);
    }
    if (err instanceof OutcomeAlreadyUndoneError) {
      return mcpError(err.message, [
        {
          action: 'outcome.read',
          example: `outcome.read({ id: "${args.id}" })`,
          why: 'The outcome is already undone — read the current state.',
        },
      ]);
    }
    throw err;
  }
}

// ---------- outcome.list ----------

function handleList(
  vaultPath: string,
  db: IdeasDatabase,
  args: { idea_id?: string; include_stale?: boolean; limit?: number },
): ReturnType<typeof mcpText> {
  const { outcomes, stale_hidden, count } = listOutcomes(db, vaultPath, {
    idea_id: args.idea_id,
    include_stale: args.include_stale,
    limit: args.limit,
  });

  const next_steps: NextStep[] = [];
  if (outcomes.length === 0) {
    next_steps.push({
      action: 'outcome.log',
      example: args.idea_id
        ? `outcome.log({ idea_id: "${args.idea_id}", text: "What happened...", refutes: [...] })`
        : 'outcome.log({ idea_id: "...", text: "...", refutes: [...] })',
      why:
        stale_hidden > 0
          ? `No live outcomes (${stale_hidden} stale rows hidden — pass include_stale: true to inspect).`
          : 'No outcomes yet. Log the first one once an idea lands — refutation propagates to dependent ideas.',
    });
  } else {
    next_steps.push({
      action: 'outcome.read',
      example: `outcome.read({ id: "${outcomes[0].id}" })`,
      why: 'Read the most recent outcome for full detail (refutes, validates, frontmatter).',
    });
  }

  return mcpText({
    result: {
      outcomes: outcomes.map((o) => ({
        id: o.id,
        idea_id: o.idea_id,
        text: o.text,
        vault_path: o.vault_path,
        landed_at: o.landed_at,
        undone_at: o.undone_at,
        ...(o.stale ? { stale: true as const } : {}),
      })),
      count,
      stale_hidden,
      write_path: activeWritePath,
    },
    next_steps,
  });
}

// ---------- outcome.read ----------

function handleRead(
  db: IdeasDatabase,
  args: { id?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('read requires `id`', [
      {
        action: 'outcome.list',
        example: 'outcome.list({})',
        why: 'List outcomes to find the id.',
      },
    ]);
  }
  const row = getOutcome(db, args.id);
  if (!row) return mcpError(`outcome not found: ${args.id}`);

  const verdicts = db
    .prepare(
      `SELECT assumption_id, verdict FROM ideas_outcome_verdicts WHERE outcome_id = ?`,
    )
    .all(args.id) as Array<{ assumption_id: string; verdict: string }>;
  const refuted = verdicts.filter((v) => v.verdict === 'refuted').map((v) => v.assumption_id);
  const validated = verdicts.filter((v) => v.verdict === 'validated').map((v) => v.assumption_id);

  const next_steps: NextStep[] = [];
  if (row.undone_at === null) {
    next_steps.push({
      action: 'outcome.undo',
      example: `outcome.undo({ id: "${row.id}" })`,
      why: 'Reverse the outcome if it was logged by mistake.',
    });
  } else {
    next_steps.push({
      action: 'idea.read',
      example: `idea.read({ id: "${row.idea_id}" })`,
      why: 'The outcome is undone. Re-read the parent idea for current state.',
    });
  }

  return mcpText({
    result: {
      id: row.id,
      idea_id: row.idea_id,
      text: row.text,
      vault_path: row.vault_path,
      landed_at: row.landed_at,
      undone_at: row.undone_at,
      refuted,
      validated,
      write_path: activeWritePath,
    },
    next_steps,
  });
}
