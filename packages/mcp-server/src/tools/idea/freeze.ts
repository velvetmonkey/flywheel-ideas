import {
  createFreeze,
  FreezeIdeaNotFoundError,
  FreezeInputError,
  getActiveWritePath,
  listFreezesByIdea,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

/**
 * Snapshot the idea + its open assumptions for OSF-style preregistration.
 * Optional: amendment chain via `supersedes_freeze_id` + `amendment_rationale`.
 *
 * The MCP surface deliberately does NOT accept `council_session_id` directly —
 * a freeze gets bound to a council session via `council.run({freeze_id: ...})`
 * or `council.run({freeze: true})` (auto-create).
 */
export function handleFreeze(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string; supersedes_freeze_id?: string; amendment_rationale?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('freeze requires `id` (the idea_id to snapshot)', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the id you want to preregister.',
      },
    ]);
  }
  try {
    const fr = createFreeze(db, vaultPath, args.id, {
      supersedes_freeze_id: args.supersedes_freeze_id,
      amendment_rationale: args.amendment_rationale,
    });
    const next_steps: NextStep[] = [
      {
        action: 'council.run',
        example: `council.run({ id: "${args.id}", confirm: true, depth: "light", freeze_id: "${fr.id}" })`,
        why: 'Bind this freeze to a council session — the council audit trail will anchor against this snapshot.',
      },
      {
        action: 'idea.list_freezes',
        example: `idea.list_freezes({ id: "${args.id}" })`,
        why: 'List the freeze chain for this idea (newest first, including amendments).',
      },
    ];
    if (!args.supersedes_freeze_id) {
      next_steps.push({
        action: 'idea.freeze',
        example: `idea.freeze({ id: "${args.id}", supersedes_freeze_id: "${fr.id}", amendment_rationale: "<what changed and why>" })`,
        why: 'If you later need to amend the preregistration (added/removed assumptions, revised metrics), file a transparent amendment that supersedes this freeze.',
      });
    }
    return mcpText({
      result: {
        id: fr.id,
        idea_id: fr.idea_id,
        council_session_id: fr.council_session_id,
        supersedes_freeze_id: fr.supersedes_freeze_id,
        amendment_rationale: fr.amendment_rationale,
        frozen_at: fr.frozen_at,
        snapshot: {
          snapshot_version: fr.snapshot.snapshot_version,
          frozen_at_iso: fr.snapshot.frozen_at_iso,
          idea_title: fr.snapshot.idea.title,
          idea_state: fr.snapshot.idea.state,
          assumption_count: fr.snapshot.assumptions.length,
          load_bearing_count: fr.snapshot.assumptions.filter((a) => a.load_bearing).length,
          locked_count: fr.snapshot.assumptions.filter((a) => a.locked_at !== null).length,
        },
        write_path: getActiveWritePath(),
      },
      next_steps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof FreezeIdeaNotFoundError) {
      return mcpError(message, [
        {
          action: 'idea.list',
          example: 'idea.list({})',
          why: 'Idea not found — list to confirm the id.',
        },
      ]);
    }
    if (err instanceof FreezeInputError) {
      return mcpError(message, [
        {
          action: 'idea.list_freezes',
          example: `idea.list_freezes({ id: "${args.id}" })`,
          why: 'Inspect the freeze chain for this idea to find the right supersedes_freeze_id.',
        },
      ]);
    }
    throw err;
  }
}

export function handleListFreezes(
  db: IdeasDatabase,
  args: { id?: string; freeze_order?: 'asc' | 'desc'; limit?: number },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('list_freezes requires `id` (the idea_id whose freezes to list)', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the id whose freeze chain you want to inspect.',
      },
    ]);
  }
  const freezes = listFreezesByIdea(db, args.id, {
    order: args.freeze_order ?? 'desc',
    limit: args.limit,
  });
  const next_steps: NextStep[] =
    freezes.length === 0
      ? [
          {
            action: 'idea.freeze',
            example: `idea.freeze({ id: "${args.id}" })`,
            why: 'No freezes yet — create the first preregistration snapshot.',
          },
        ]
      : [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${args.id}" })`,
            why: 'Re-read the idea for current (post-freeze) state.',
          },
        ];
  return mcpText({
    result: {
      idea_id: args.id,
      count: freezes.length,
      freezes: freezes.map((f: import('@velvetmonkey/flywheel-ideas-core').FreezeRow) => ({
        id: f.id,
        council_session_id: f.council_session_id,
        supersedes_freeze_id: f.supersedes_freeze_id,
        amendment_rationale: f.amendment_rationale,
        frozen_at: f.frozen_at,
        frozen_at_iso: f.snapshot.frozen_at_iso,
        idea_title: f.snapshot.idea.title,
        idea_state: f.snapshot.idea.state,
        assumption_count: f.snapshot.assumptions.length,
      })),
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}
