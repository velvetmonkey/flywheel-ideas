import {
  filterStaleRows,
  getActiveWritePath,
  type IdeasDatabase,
  type IdeaState,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpText, type NextStep } from '../../next_steps.js';

interface IdeaListRow {
  id: string;
  title: string;
  state: string;
  needs_review: number;
  created_at: number;
  state_changed_at: number;
  vault_path: string;
}

export function handleList(
  vaultPath: string,
  db: IdeasDatabase,
  args: { state?: string; needs_review?: boolean; limit?: number; include_stale?: boolean },
): ReturnType<typeof mcpText> {
  const limit = args.limit ?? 50;

  const where: string[] = [];
  const bind: unknown[] = [];
  if (args.state) {
    where.push('state = ?');
    bind.push(args.state);
  }
  if (args.needs_review === true) {
    where.push('needs_review = 1');
  } else if (args.needs_review === false) {
    where.push('needs_review = 0');
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT id, title, state, needs_review, created_at, state_changed_at, vault_path
       FROM ideas_notes ${whereSql}
       ORDER BY state_changed_at DESC LIMIT ?`,
    )
    .all(...bind, limit) as IdeaListRow[];

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
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}
