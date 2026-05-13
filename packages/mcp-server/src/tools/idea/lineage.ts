import {
  getActiveWritePath,
  getAncestry,
  getDescendants,
  getSharedAssumptions,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export function handleAncestry(
  db: IdeasDatabase,
  args: { id?: string; max_depth?: number },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('ancestry requires `id`', [
      { action: 'idea.list', example: 'idea.list({})', why: 'Find the idea id whose ancestry to walk.' },
    ]);
  }
  const ancestors = getAncestry(db, args.id, { max_depth: args.max_depth });
  const next_steps: NextStep[] =
    ancestors.length === 0
      ? [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${args.id}" })`,
            why: 'No ancestors — this idea is at the root of any supersession chain it participates in.',
          },
        ]
      : [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${ancestors[0].id}" })`,
            why: `Read the immediate parent (${ancestors[0].title}) for context on what this idea supersedes.`,
          },
        ];
  return mcpText({
    result: {
      idea_id: args.id,
      ancestors,
      count: ancestors.length,
      max_depth: args.max_depth ?? 20,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

export function handleDescendants(
  db: IdeasDatabase,
  args: { id?: string; max_depth?: number },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('descendants requires `id`', [
      { action: 'idea.list', example: 'idea.list({})', why: 'Find the idea id whose descendants to walk.' },
    ]);
  }
  const descendants = getDescendants(db, args.id, { max_depth: args.max_depth });
  const next_steps: NextStep[] =
    descendants.length === 0
      ? [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${args.id}" })`,
            why: 'No descendants — this idea has not been superseded.',
          },
        ]
      : [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${descendants[descendants.length - 1].id}" })`,
            why: `Read the most-recent descendant (${descendants[descendants.length - 1].title}) — the current incarnation of this lineage.`,
          },
        ];
  return mcpText({
    result: {
      idea_id: args.id,
      descendants,
      count: descendants.length,
      max_depth: args.max_depth ?? 20,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

export function handleSharedAssumptions(
  db: IdeasDatabase,
  args: { id?: string; limit?: number },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('shared_assumptions requires `id`', [
      { action: 'idea.list', example: 'idea.list({})', why: 'Find the idea id whose shared assumptions to surface.' },
    ]);
  }
  const matches = getSharedAssumptions(db, args.id, { limit: args.limit });
  const next_steps: NextStep[] =
    matches.length === 0
      ? [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${args.id}" })`,
            why: 'No other ideas cite the same assumptions yet. Cross-project propagation kicks in once you have a portfolio of related bets.',
          },
        ]
      : [
          {
            action: 'idea.read',
            example: `idea.read({ id: "${matches[0].idea_id}" })`,
            why: `Read "${matches[0].title}" — shares ${matches[0].shared_assumption_count} assumption(s) with this idea. If you refute one of them later, both ideas will need re-review.`,
          },
        ];
  return mcpText({
    result: {
      idea_id: args.id,
      matches,
      count: matches.length,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}
