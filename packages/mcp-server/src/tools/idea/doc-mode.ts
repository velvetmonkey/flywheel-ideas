/**
 * Doc-mode handler module for the `idea` MCP tool.
 *
 * Doc mode is the portable single-file backend: one `.md` per idea, no
 * SQLite. The file format is the contract (`docs/single-doc-format.md`)
 * and the consistency boundary is documented in `docs/consistency.md`.
 *
 * This commit (B1) lands the dispatch boundary only: the supported
 * action set lives in {@link IDEA_DOC_MODE_ACTIONS}, and every supported
 * action currently returns {@link docHandlerNotYetImplemented} as a
 * placeholder. The follow-up B2 commit fills in the real handlers that
 * read/write the doc-mode file format.
 *
 * Why the placeholder instead of a no-op: callers using `backend: "doc"`
 * today need a clear "this is being built, sqlite still works" signal
 * rather than silent failure or a confusing thrown error from a missing
 * code path. The placeholder explicitly documents the wedge as in-flight.
 */

import { mcpError } from '../../next_steps.js';

export type IdeaActionName =
  | 'create'
  | 'read'
  | 'list'
  | 'transition'
  | 'forget'
  | 'freeze'
  | 'list_freezes'
  | 'ancestry'
  | 'descendants'
  | 'shared_assumptions'
  | 'export'
  | 'report';

/**
 * The subset of `idea` actions that doc mode supports. Anything outside
 * this set returns `not_supported_in_doc_mode`. Kept as a `Set` so the
 * dispatch check is a single O(1) lookup.
 */
export const IDEA_DOC_MODE_ACTIONS: ReadonlySet<IdeaActionName> = new Set<IdeaActionName>([
  'create',
  'read',
  'list',
  'transition',
]);

/**
 * Placeholder response for doc-mode actions whose handlers are not yet
 * implemented. Replaced by real implementations in the B2 commit.
 */
export function docHandlerNotYetImplemented(action: IdeaActionName): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  return mcpError(
    `doc_mode_in_flight: idea.${action} doc-mode handler is staged but not yet implemented. backend: "sqlite" works today.`,
    [
      {
        action: `idea.${action}`,
        example: `idea.${action}({ /* ... */ backend: "sqlite" })`,
        why: 'Run the SQLite-backed path while doc mode lands. The format spec and dispatch boundary are committed; only the read/write handlers remain. See docs/single-doc-format.md.',
      },
    ],
  );
}
