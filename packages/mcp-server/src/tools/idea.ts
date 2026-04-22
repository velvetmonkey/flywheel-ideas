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
        .enum(['create', 'read', 'list', 'transition'])
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
    },
    async (args) => {
      switch (args.action) {
        case 'create':
          return handleCreate(getVaultPath(), getDb(), args);
        case 'read':
          return handleRead(getVaultPath(), getDb(), args);
        case 'list':
          return handleList(getDb(), args);
        case 'transition':
          return handleTransition(getVaultPath(), getDb(), args);
        default:
          return mcpError(`unknown action: ${(args as { action: string }).action}`);
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
    return mcpError('create requires `title`');
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
  if (!args.id) return mcpError('read requires `id`');

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
    // stale row — markdown gone
    return mcpText({
      result: {
        id: row.id,
        state: row.state,
        title: row.title,
        vault_path: row.vault_path,
        write_path: activeWritePath,
        stale_row: true,
        note: 'Markdown file missing from vault — database row kept for history. The note may have been renamed or deleted outside flywheel-ideas.',
      },
      next_steps: [
        {
          action: 'idea.list',
          example: 'idea.list({})',
          why: 'Find the idea again in case it was renamed elsewhere.',
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
  const steps: NextStep[] = [];

  if (state === 'nascent' || state === 'explored') {
    steps.push({
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
      why: 'Declaring Y-statement assumptions is the prerequisite for a useful council run — the council attacks specific load-bearing claims.',
    });
  }

  if (noTransitionsYet && state === 'nascent') {
    steps.push({
      action: 'idea.transition',
      example: `idea.transition({ id: "${id}", to: "explored", reason: "initial exploration complete" })`,
      why: 'Move the idea forward once you have rough framing — this records the state change in the transition log.',
    });
  }

  if (state === 'explored' || state === 'evaluated') {
    steps.push({
      action: 'council.run',
      example: `council.run({ id: "${id}", depth: "light", mode: "pre_mortem" })`,
      why: 'Pre-mortem mode asks the council to assume the idea has already failed and reconstruct why — counters founder optimism before commitment. (Tool ships in a later milestone.)',
    });
  }

  return steps;
}

// ---------- idea.list ----------

function handleList(
  db: IdeasDatabase,
  args: { state?: string; limit?: number },
): ReturnType<typeof mcpText> {
  const limit = args.limit ?? 50;
  const rows = args.state
    ? (db
        .prepare(
          `SELECT id, title, state, needs_review, created_at, state_changed_at, vault_path
           FROM ideas_notes WHERE state = ?
           ORDER BY state_changed_at DESC LIMIT ?`,
        )
        .all(args.state, limit) as Array<{
        id: string;
        title: string;
        state: string;
        needs_review: number;
        created_at: number;
        state_changed_at: number;
        vault_path: string;
      }>)
    : (db
        .prepare(
          `SELECT id, title, state, needs_review, created_at, state_changed_at, vault_path
           FROM ideas_notes
           ORDER BY state_changed_at DESC LIMIT ?`,
        )
        .all(limit) as Array<{
        id: string;
        title: string;
        state: string;
        needs_review: number;
        created_at: number;
        state_changed_at: number;
        vault_path: string;
      }>);

  const ideas = rows.map((r) => ({
    id: r.id,
    title: r.title,
    state: r.state,
    needs_review: Boolean(r.needs_review),
    created_at: r.created_at,
    state_changed_at: r.state_changed_at,
    vault_path: r.vault_path,
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
          why: 'No ideas yet — create the first one.',
        },
      ];

  return mcpText({
    result: {
      ideas,
      count: ideas.length,
      filter: { state: (args.state as IdeaState | undefined) ?? null, limit },
      write_path: activeWritePath,
    },
    next_steps,
  });
}

// ---------- idea.transition ----------

async function handleTransition(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string; to?: string; reason?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) return mcpError('transition requires `id`');
  if (!args.to) return mcpError('transition requires `to`');
  if (!isIdeaState(args.to)) {
    return mcpError(`invalid target state "${args.to}" — must be one of ${IDEA_STATES.join(', ')}`);
  }

  const row = db
    .prepare('SELECT vault_path, state FROM ideas_notes WHERE id = ?')
    .get(args.id) as { vault_path: string; state: string } | undefined;
  if (!row) return mcpError(`idea not found: ${args.id}`);

  const transition = recordTransition(db, args.id, args.to, { reason: args.reason });

  const patchResult = await patchFrontmatter(vaultPath, row.vault_path, {
    state: args.to,
    state_changed_at: new Date(transition.at).toISOString(),
  });

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
