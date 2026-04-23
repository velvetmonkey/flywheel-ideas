/**
 * Idea lifecycle state machine.
 *
 * States:
 *   nascent → explored → evaluated → committed → validated
 *                                             → parked    (reversible)
 *                                             → killed    (terminal)
 *                                             → refuted   (outcome-driven)
 *
 * v0.1 policy: transitions are RECORDED but NOT validated. A user may move
 * `nascent → committed` without a council; the transition is logged in
 * `ideas_transitions` and the frontmatter + `ideas_notes.state` row are
 * updated. v0.2 enforces prerequisites (council session before `evaluated`,
 * outcome before `validated`, etc.) — the data model is ready for that
 * enforcement; this module will gain a `canTransition` check at that point.
 *
 * This unenforced posture is intentional — it "plants the habit of moving
 * ideas through a pipeline without blocking users before we've seen the flow
 * in practice" (plan §Lifecycle).
 */

import type { IdeasDatabase } from './db.js';
import { generateTransitionId } from './ids.js';
import { patchFrontmatter } from './write/patch-frontmatter.js';

export type IdeaState =
  | 'nascent'
  | 'explored'
  | 'evaluated'
  | 'committed'
  | 'validated'
  | 'parked'
  | 'killed'
  | 'refuted';

export const IDEA_STATES: readonly IdeaState[] = [
  'nascent',
  'explored',
  'evaluated',
  'committed',
  'validated',
  'parked',
  'killed',
  'refuted',
] as const;

export const INITIAL_STATE: IdeaState = 'nascent';

/** Runtime check. Used by zod tool schemas to validate user input. */
export function isIdeaState(value: unknown): value is IdeaState {
  return typeof value === 'string' && (IDEA_STATES as readonly string[]).includes(value);
}

export interface TransitionRecord {
  id: string;
  idea_id: string;
  from_state: IdeaState;
  to_state: IdeaState;
  at: number;
  reason: string | null;
}

export interface RecordTransitionOptions {
  /** Unix ms. Defaults to `Date.now()`. */
  at?: number;
  /** Free-form reason string from the user. */
  reason?: string;
}

/**
 * Record a lifecycle transition for an idea.
 *
 * Updates `ideas_notes.state` + `ideas_notes.state_changed_at` and inserts a
 * row into `ideas_transitions`. Wrapped in a single SQLite transaction so
 * either both mutations apply or neither does.
 *
 * Throws if the idea does not exist. Does NOT validate the transition — that
 * gate lands in v0.2.
 */
export function recordTransition(
  db: IdeasDatabase,
  ideaId: string,
  toState: IdeaState,
  options: RecordTransitionOptions = {},
): TransitionRecord {
  const at = options.at ?? Date.now();
  const reason = options.reason ?? null;

  const run = db.transaction((): TransitionRecord => {
    const row = db
      .prepare('SELECT state FROM ideas_notes WHERE id = ?')
      .get(ideaId) as { state: string } | undefined;
    if (!row) {
      throw new Error(`recordTransition: idea "${ideaId}" not found`);
    }
    const fromState = row.state as IdeaState;

    const transitionId = generateTransitionId();
    db.prepare(
      `INSERT INTO ideas_transitions (id, idea_id, from_state, to_state, at, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(transitionId, ideaId, fromState, toState, at, reason);

    db.prepare('UPDATE ideas_notes SET state = ?, state_changed_at = ? WHERE id = ?').run(
      toState,
      at,
      ideaId,
    );

    return {
      id: transitionId,
      idea_id: ideaId,
      from_state: fromState,
      to_state: toState,
      at,
      reason,
    };
  });

  return run();
}

/**
 * Best-effort sync of an idea's `state` + `state_changed_at` into its
 * markdown frontmatter. Mirrors the existing `outcome.log` /
 * `assumption.markRefuted` post-txn pattern: the SQLite DB is authoritative
 * and the vault markdown is a human-readable mirror; on fs failure we log
 * a stderr warning and return without rolling back the DB.
 *
 * Why a separate helper (not folded into recordTransition): keeps
 * recordTransition a pure sync DB boundary so its existing unit tests
 * stay sync + don't need a tmpdir vault.
 *
 * **Note for callers:** the MCP `idea.transition` tool (`tools/idea.ts`)
 * uses a STRICTER pattern — it patches the frontmatter inline and
 * compensates with a DB rollback if the fs write fails. Library consumers
 * that prefer DB-authoritative + best-effort-mirror semantics should call
 * this helper after `recordTransition`. Direct `tools/idea.ts` callers
 * already get the stricter rollback semantics.
 *
 * Added in alpha.4 (gemini codebase roundtable, HIGH — exposed the
 * divergence in `recordTransition` internals; the user-facing tool path
 * was already safe via the inline patch + rollback).
 */
export async function syncTransitionFrontmatter(
  db: IdeasDatabase,
  vaultPath: string,
  ideaId: string,
): Promise<void> {
  const row = db
    .prepare(
      'SELECT state, state_changed_at, vault_path FROM ideas_notes WHERE id = ?',
    )
    .get(ideaId) as
    | { state: string; state_changed_at: number; vault_path: string }
    | undefined;
  if (!row) return; // recordTransition would have thrown for a missing idea
  try {
    await patchFrontmatter(vaultPath, row.vault_path, {
      state: row.state,
      state_changed_at: new Date(row.state_changed_at).toISOString(),
    });
  } catch (err) {
    process.stderr.write(
      `flywheel-ideas: frontmatter sync failed for idea ${ideaId}: ${
        (err as Error).message
      }\n`,
    );
  }
}

/**
 * Fetch the transition history for an idea, newest-first.
 */
export function listTransitions(db: IdeasDatabase, ideaId: string): TransitionRecord[] {
  return db
    .prepare(
      `SELECT id, idea_id, from_state, to_state, at, reason
       FROM ideas_transitions
       WHERE idea_id = ?
       ORDER BY at DESC`,
    )
    .all(ideaId) as TransitionRecord[];
}
