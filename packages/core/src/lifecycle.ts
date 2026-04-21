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
