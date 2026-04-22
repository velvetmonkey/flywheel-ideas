/**
 * `idea` MCP tool — create, read, list, transition.
 *
 * Action-based registration mirroring flywheel-memory's pattern: one tool, a
 * flat schema, action-discriminated handler. The schema shape is compatible
 * with how MCP clients (including Claude Code) surface tool hints; a zod
 * `discriminatedUnion` would be cleaner in TypeScript but has worse MCP-SDK
 * interop today.
 *
 * Every response is `{result, next_steps}` — see `next_steps.ts`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  activeWritePath,
  filterStaleRows,
  generateIdeaId,
  IDEA_STATES,
  INITIAL_STATE,
  isIdeaState,
  listTransitions,
  readNote,
  recordTransition,
  type IdeasDatabase,
  type IdeaState,
  patchFrontmatter,
  writeNote,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../next_steps.js';

/**
 * Register the `idea` tool on a server. Captures the vault path + DB handle
 * via getters so tests can swap implementations.
 */
export function registerIdeaTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'idea',
    [
      'Manage the idea lifecycle in your decision ledger.',
      'Actions: create (new markdown note), read (full note + frontmatter), ',
      'list (paginated), transition (move lifecycle state; records a transition).',
      'Every response includes next_steps to guide the next action.',
    ].join(''),
    {
      action: z
        .enum(['create', 'read', 'list', 'transition', 'forget'])
        .describe('Operation to perform'),
      title: z
        .string()
        .min(1)
        .max(200)
        .optional()
        .describe('[create] Idea title — kebab-slugged into the filename'),
      body: z
        .string()
        .optional()
        .describe('[create] Markdown body (omit for an empty scaffold)'),
      id: z
        .string()
        .optional()
        .describe('[read|transition] Idea id returned by a prior create'),
      state: z
        .enum(IDEA_STATES as unknown as [string, ...string[]])
        .optional()
        .describe('[list] Filter by state'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('[list] Max results (default 50)'),
      to: z
        .enum(IDEA_STATES as unknown as [string, ...string[]])
        .optional()
        .describe('[transition] Target state'),
      reason: z
        .string()
        .optional()
        .describe('[transition] Free-form note explaining the move'),
      include_stale: z
        .boolean()
        .optional()
        .describe('[list] Include ideas whose markdown file is missing from the vault (default: false)'),
    },
    async (args) => {
      // Top-level error boundary: unhandled exceptions from handler I/O or
      // parse failures must NOT bubble as opaque JSON-RPC errors — they skip
      // the `{result, next_steps}` contract the LLM relies on. Wrap every
      // dispatch and return an `mcpError` with the thrown message as the
      // recovery hint.
      try {
        switch (args.action) {
          case 'create':
            return await handleCreate(getVaultPath(), getDb(), args);
          case 'read':
            return handleRead(getVaultPath(), getDb(), args);
          case 'list':
            return handleList(getVaultPath(), getDb(), args);
          case 'transition':
            return await handleTransition(getVaultPath(), getDb(), args);
          case 'forget':
            return handleForget(getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`idea.${args.action} failed: ${message}`, [
          {
            action: 'idea.list',
            example: 'idea.list({})',
            why: 'Inspect the current state of the ledger to diagnose.',
          },
        ]);
      }
    },
  );
}

// ---------- idea.create ----------

async function handleCreate(
  vaultPath: string,
  db: IdeasDatabase,
  args: { title?: string; body?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.title) {
    return mcpError('create requires `title`', [
      {
        action: 'idea.create',
        example: 'idea.create({ title: "Your idea, one sentence" })',
        why: 'Title becomes the kebab-slug filename plus the frontmatter title — keep it short and specific.',
      },
    ]);
  }

  const now = Date.now();
  const id = generateIdeaId();
  const relPath = buildIdeaPath(args.title, now);

  const frontmatter = {
    id,
    type: 'idea',
    state: INITIAL_STATE,
    title: args.title,
    created_at: new Date(now).toISOString(),
  };
  const body = args.body ?? `# ${args.title}\n\n`;

  const writeResult = await writeNote(vaultPath, relPath, frontmatter, body);

  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, writeResult.vault_path, args.title, INITIAL_STATE, now, now);

  const next_steps: NextStep[] = [
    {
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
      why: 'Y-statement assumptions give the council specific claims to attack later. Declare them before running council so the stress-test is grounded.',
    },
    {
      action: 'idea.read',
      example: `idea.read({ id: "${id}" })`,
      why: 'Verify the markdown note was written with the expected frontmatter.',
    },
  ];

  return mcpText({
    result: {
      id,
      state: INITIAL_STATE,
      title: args.title,
      vault_path: writeResult.vault_path,
      write_path: writeResult.write_path,
      created_at: now,
    },
    next_steps,
  });
}

// ---------- idea.read ----------

function handleRead(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('read requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List existing ideas to find the id you meant to read.',
      },
    ]);
  }

  const row = db
    .prepare(
      `SELECT id, vault_path, title, state, needs_review, created_at, state_changed_at
       FROM ideas_notes WHERE id = ?`,
    )
    .get(args.id) as
    | {
        id: string;
        vault_path: string;
        title: string;
        state: string;
        needs_review: number;
        created_at: number;
        state_changed_at: number;
      }
    | undefined;

  if (!row) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List existing ideas to find the one you meant.',
      },
    ]);
  }

  const note = readNote(vaultPath, row.vault_path);
  const history = listTransitions(db, row.id);

  if (!note.exists) {
    // stale row — markdown gone. Point toward repair, NOT idea.list (which
    // would loop back to this same orphan by default).
    return mcpText({
      result: {
        id: row.id,
        state: row.state,
        title: row.title,
        vault_path: row.vault_path,
        write_path: activeWritePath,
        stale_row: true,
        note: 'Markdown file missing from vault — database row kept. The note may have been renamed or deleted outside flywheel-ideas.',
      },
      next_steps: [
        {
          action: 'idea.forget',
          example: `idea.forget({ id: "${row.id}" })`,
          why: 'If the idea is truly gone (deleted intentionally), remove the database pointer so it stops appearing in listings.',
        },
        {
          action: 'idea.list',
          example: 'idea.list({ include_stale: true })',
          why: 'Show all ideas INCLUDING stale ones to check if the file was renamed elsewhere. Stale ideas are filtered from the default listing.',
        },
      ],
    });
  }

  const next_steps = buildReadNextSteps(row.id, row.state as IdeaState, history.length === 0);

  return mcpText({
    result: {
      id: row.id,
      state: row.state,
      title: row.title,
      vault_path: row.vault_path,
      write_path: activeWritePath,
      needs_review: Boolean(row.needs_review),
      created_at: row.created_at,
      state_changed_at: row.state_changed_at,
      frontmatter: note.frontmatter,
      body: note.body,
      transition_count: history.length,
    },
    next_steps,
  });
}

function buildReadNextSteps(id: string, state: IdeaState, noTransitionsYet: boolean): NextStep[] {
  // The "every response teaches the next move" contract requires at least one
  // entry for every state. Terminal states (killed) still get something useful
  // (browse the ledger) so the LLM is never stranded.
  const steps: NextStep[] = [];

  switch (state) {
    case 'nascent':
      steps.push(
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
          why: 'Declaring Y-statement assumptions is the prerequisite for a useful council run — the council attacks specific load-bearing claims.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "explored", reason: "initial exploration complete" })`,
          why: 'Move the idea forward once you have rough framing — this records the state change in the transition log.',
        },
      );
      break;

    case 'explored':
      steps.push(
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
          why: 'If you have not declared assumptions yet, do it now — the council needs load-bearing claims to attack.',
        },
        {
          action: 'council.run',
          example: `council.run({ id: "${id}", depth: "light", mode: "pre_mortem" })`,
          why: 'Pre-mortem mode asks the council to assume the idea has already failed and reconstruct why — counters founder optimism before commitment. (Tool ships in a later milestone.)',
        },
      );
      break;

    case 'evaluated':
      steps.push(
        {
          action: 'council.run',
          example: `council.run({ id: "${id}", depth: "full", mode: "standard" })`,
          why: 'A full-depth standard-mode council is appropriate once the idea is well-framed. Pairs with any prior pre-mortem run.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "committed", reason: "council surfaced no fatal risks; committing" })`,
          why: 'Commit the idea so you can later log outcomes against it. Requires a human rationale.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "parked", reason: "revisit after <signpost>" })`,
          why: 'Park the idea if the council raised risks that are not yet resolvable. Parked ideas come back via signpost surfacing (v0.2).',
        },
      );
      break;

    case 'committed':
      steps.push(
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${id}", context: "...", signpost_at: <unix-ms>, load_bearing: true })`,
          why: 'For committed ideas, declare load-bearing assumptions with signposts so the system can surface them for re-evaluation later. (Tool ships in a later milestone.)',
        },
        {
          action: 'outcome.log',
          example: `outcome.log({ idea_id: "${id}", text: "...", refutes: [], validates: [] })`,
          why: 'When reality arrives, log the outcome and which declared assumptions it validated or refuted. This is the compounding mechanism. (Tool ships in a later milestone.)',
        },
      );
      break;

    case 'validated':
      steps.push(
        {
          action: 'idea.list',
          example: 'idea.list({ state: "committed" })',
          why: 'Browse other committed ideas — a validated outcome often invalidates or reinforces assumptions for them too.',
        },
        {
          action: 'idea.create',
          example: 'idea.create({ title: "Next bet building on this result" })',
          why: 'Validated outcomes are often springboards — create a follow-on idea that branches from this learning.',
        },
      );
      break;

    case 'refuted':
      steps.push(
        {
          action: 'idea.list',
          example: 'idea.list({ state: "committed" })',
          why: 'Browse other committed ideas — a refuted outcome often flags assumptions shared across the roadmap. (Assumption-propagation automation ships in v0.2.)',
        },
        {
          action: 'outcome.log',
          example: `outcome.log({ idea_id: "${id}", text: "post-mortem: what specifically broke, what we learned" })`,
          why: 'If the refutation log is sparse, expand it — the learning is the value of a failed bet. (Tool ships in a later milestone.)',
        },
      );
      break;

    case 'parked':
      steps.push(
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "explored", reason: "<why-now>" })`,
          why: 'Un-park the idea when conditions have changed — this creates a new transition record and restarts the loop.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "killed", reason: "permanently wrong fit" })`,
          why: 'If the idea is truly dead, move it to killed. The transition log preserves history for future reference.',
        },
      );
      break;

    case 'killed':
      steps.push(
        {
          action: 'idea.list',
          example: 'idea.list({ state: "committed" })',
          why: 'Killed is terminal — there is nothing to do here. Browse active ideas instead.',
        },
        {
          action: 'idea.forget',
          example: `idea.forget({ id: "${id}" })`,
          why: 'If the killed idea is truly dead to you (no future reference value), forget it to clean up the ledger.',
        },
      );
      break;
  }

  // Suppress the "move forward" nudge if the user has already moved the idea
  // once (the nascent→explored nudge is only relevant for brand-new ideas
  // that have not transitioned yet).
  if (!noTransitionsYet && state === 'nascent') {
    return steps.filter((s) => !s.example.includes('to: "explored"'));
  }

  return steps;
}

// ---------- idea.list ----------

interface IdeaListRow {
  id: string;
  title: string;
  state: string;
  needs_review: number;
  created_at: number;
  state_changed_at: number;
  vault_path: string;
}

function handleList(
  vaultPath: string,
  db: IdeasDatabase,
  args: { state?: string; limit?: number; include_stale?: boolean },
): ReturnType<typeof mcpText> {
  const limit = args.limit ?? 50;
  const rows = args.state
    ? (db
        .prepare(
          `SELECT id, title, state, needs_review, created_at, state_changed_at, vault_path
           FROM ideas_notes WHERE state = ?
           ORDER BY state_changed_at DESC LIMIT ?`,
        )
        .all(args.state, limit) as IdeaListRow[])
    : (db
        .prepare(
          `SELECT id, title, state, needs_review, created_at, state_changed_at, vault_path
           FROM ideas_notes
           ORDER BY state_changed_at DESC LIMIT ?`,
        )
        .all(limit) as IdeaListRow[]);

  // Filter stale (markdown-missing) rows unless the caller explicitly asked
  // for them. This breaks the stale_row infinite-loop where idea.read on a
  // stale idea would naively suggest idea.list, which would return the same
  // orphan, which would lead the agent back to read.
  const includeStale = args.include_stale === true;
  const { kept, staleSkipped } = filterStaleRows(vaultPath, rows, {
    include_stale: includeStale,
  });

  const ideas = kept.map((r) => ({
    id: r.id,
    title: r.title,
    state: r.state,
    needs_review: Boolean(r.needs_review),
    created_at: r.created_at,
    state_changed_at: r.state_changed_at,
    vault_path: r.vault_path,
    ...(r.stale ? { stale: true as const } : {}),
  }));

  const next_steps: NextStep[] = ideas.length
    ? [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${ideas[0].id}" })`,
          why: 'Dive into the most-recently-updated idea for full content and history.',
        },
      ]
    : [
        {
          action: 'idea.create',
          example: 'idea.create({ title: "..." })',
          why: staleSkipped > 0
            ? `No active ideas (${staleSkipped} stale rows were hidden — pass include_stale: true to see them). Create a new one.`
            : 'No ideas yet — create the first one.',
        },
      ];

  if (staleSkipped > 0 && ideas.length > 0) {
    next_steps.push({
      action: 'idea.list',
      example: 'idea.list({ include_stale: true })',
      why: `${staleSkipped} stale rows (markdown deleted externally) were hidden. Pass include_stale: true to review them, or use idea.forget to clean up.`,
    });
  }

  return mcpText({
    result: {
      ideas,
      count: ideas.length,
      stale_hidden: staleSkipped,
      filter: {
        state: (args.state as IdeaState | undefined) ?? null,
        limit,
        include_stale: includeStale,
      },
      write_path: activeWritePath,
    },
    next_steps,
  });
}

// ---------- idea.forget ----------

/**
 * Remove the database row for an idea. Does NOT delete the markdown file —
 * user data is never deleted by the MCP surface. Intended for cleaning up
 * stale rows after the markdown was externally removed, or for pruning
 * long-terminal ideas that no longer need tracking.
 */
function handleForget(
  db: IdeasDatabase,
  args: { id?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('forget requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({ include_stale: true })',
        why: 'List ideas (including stale ones) to find the id to forget.',
      },
    ]);
  }

  const row = db.prepare('SELECT state, title FROM ideas_notes WHERE id = ?').get(args.id) as
    | { state: string; title: string }
    | undefined;
  if (!row) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({ include_stale: true })',
        why: 'Confirm the id — possibly already forgotten.',
      },
    ]);
  }

  // Cascading deletes from ideas_notes remove transitions/assumptions/etc
  // per the schema's ON DELETE CASCADE. The markdown file is intentionally
  // left on disk — user data is not destroyed by flywheel-ideas.
  db.prepare('DELETE FROM ideas_notes WHERE id = ?').run(args.id);

  return mcpText({
    result: {
      id: args.id,
      forgotten_from_state: row.state,
      title: row.title,
      write_path: activeWritePath,
      note: 'Database row removed. The markdown file on disk (if any) was not touched — delete it separately if you want it gone.',
    },
    next_steps: [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'Confirm the idea no longer appears in listings.',
      },
    ],
  });
}

// ---------- idea.transition ----------

async function handleTransition(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string; to?: string; reason?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('transition requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the id you want to transition.',
      },
    ]);
  }
  if (!args.to) {
    return mcpError('transition requires `to`', [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${args.id}" })`,
        why: `Check the current state before picking a target (valid states: ${IDEA_STATES.join(', ')}).`,
      },
    ]);
  }
  if (!isIdeaState(args.to)) {
    return mcpError(
      `invalid target state "${args.to}" — must be one of ${IDEA_STATES.join(', ')}`,
      [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${args.id}" })`,
          why: 'Re-read the idea and pick a valid target state from the list above.',
        },
      ],
    );
  }

  // Capture the full pre-transition row so we can roll back if the fs patch
  // fails. Without state_changed_at we couldn't restore the previous
  // "transitioned at" timestamp after a rollback.
  const row = db
    .prepare(
      'SELECT vault_path, state, state_changed_at FROM ideas_notes WHERE id = ?',
    )
    .get(args.id) as
    | { vault_path: string; state: string; state_changed_at: number }
    | undefined;
  if (!row) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'The id was not found in the database. List existing ideas to locate the right one.',
      },
    ]);
  }

  // Transition has two side effects that MUST stay consistent: DB row + fs
  // frontmatter. The DB insert+update is itself transactional
  // (recordTransition wraps in db.transaction), but if the fs patch fails we
  // would orphan the DB change. Record the transition, attempt the patch, and
  // on fs failure roll back the DB transition so the user can retry without
  // drift.
  const transition = recordTransition(db, args.id, args.to, { reason: args.reason });

  let patchResult;
  try {
    patchResult = await patchFrontmatter(vaultPath, row.vault_path, {
      state: args.to,
      state_changed_at: new Date(transition.at).toISOString(),
    });
  } catch (err) {
    // Compensating rollback: remove the transition row, restore the previous
    // state + state_changed_at on ideas_notes. Wrapped in its own transaction
    // so either the full rollback applies or neither does.
    const rollback = db.transaction(() => {
      db.prepare('DELETE FROM ideas_transitions WHERE id = ?').run(transition.id);
      db.prepare('UPDATE ideas_notes SET state = ?, state_changed_at = ? WHERE id = ?').run(
        transition.from_state,
        row.state_changed_at,
        args.id,
      );
    });
    try {
      rollback();
    } catch {
      /* best effort; we still want to surface the original error */
    }
    const message = err instanceof Error ? err.message : String(err);
    return mcpError(`transition failed mid-flight (rolled back): ${message}`, [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${args.id}" })`,
        why: 'Verify the idea is back to its pre-transition state. The fs write failed; the database transition was rolled back to match.',
      },
    ]);
  }

  const next_steps = buildTransitionNextSteps(args.id, args.to);

  return mcpText({
    result: {
      id: args.id,
      from_state: transition.from_state,
      to_state: transition.to_state,
      at: transition.at,
      reason: transition.reason,
      vault_path: row.vault_path,
      write_path: patchResult.write_path,
    },
    next_steps,
  });
}

function buildTransitionNextSteps(id: string, to: IdeaState): NextStep[] {
  const steps: NextStep[] = [
    {
      action: 'idea.read',
      example: `idea.read({ id: "${id}" })`,
      why: 'Confirm the state change is reflected in both the markdown frontmatter and the transition log.',
    },
  ];

  if (to === 'committed') {
    steps.push({
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${id}", context: "...", signpost_at: <unix-ms>, load_bearing: true })`,
      why: 'For committed ideas, declare load-bearing assumptions with signposts so the system can surface them for re-evaluation later. (Tool ships in a later milestone.)',
    });
  }

  if (to === 'validated' || to === 'refuted') {
    steps.push({
      action: 'outcome.log',
      example: `outcome.log({ idea_id: "${id}", text: "...", refutes: [], validates: [] })`,
      why: 'Record the outcome and which declared assumptions it validated or refuted — this is the compounding mechanism that flags dependent ideas. (Tool ships in a later milestone.)',
    });
  }

  return steps;
}

// ---------- helpers ----------

/**
 * Build a date-partitioned vault path for a new idea.
 *
 * Format: `ideas/YYYY/MM/<kebab-slug>-<short-id-disambiguator>.md`
 * Using a short suffix avoids collisions for same-titled ideas created in the
 * same month.
 */
export function buildIdeaPath(title: string, nowMs: number): string {
  const d = new Date(nowMs);
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const slug = slugify(title);
  const disambiguator = `${nowMs}`.slice(-6);
  return `ideas/${yyyy}/${mm}/${slug || 'idea'}-${disambiguator}.md`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
