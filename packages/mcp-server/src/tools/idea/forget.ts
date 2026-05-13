import {
  getActiveWritePath,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText } from '../../next_steps.js';

export function handleForget(
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
      write_path: getActiveWritePath(),
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
