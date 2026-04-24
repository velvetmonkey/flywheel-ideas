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

// ---------------------------------------------------------------------------
// v0.2 D5 — Lifecycle prerequisite enforcement
// ---------------------------------------------------------------------------

/**
 * Outcome of a `canTransition` check. `{ok: true}` means the transition is
 * allowed; `{ok: false}` carries a structured reason for the MCP layer to
 * surface as next_steps.
 */
export type CanTransitionResult =
  | { ok: true }
  | {
      ok: false;
      /** Stable machine-key for the failed prereq, e.g. 'no_council_session'. */
      reason_code: string;
      /** Human-readable explanation, surfaced via MCP next_steps. */
      reason: string;
      /** Concrete recovery hint — e.g. "Run a council first via council.run({...})". */
      recovery_hint?: string;
    };

/**
 * Domain prerequisite checks for v0.2 lifecycle enforcement.
 *
 * Rules (per roadmap-v0-2 D5):
 *  - explored → evaluated  : requires ≥1 council session for the idea
 *  - evaluated → committed : requires ≥1 locked load-bearing assumption
 *  - committed → validated : requires ≥1 outcome (non-undone) for the idea
 *  - committed → refuted   : requires ≥1 outcome with at least one refute verdict
 *
 * All other transitions (parked, killed, backwards moves, etc.) are
 * unchecked — these are user-driven recovery / housekeeping moves that
 * shouldn't block on data prereqs.
 *
 * Pure read function — does not mutate. Wrap with `recordTransitionEnforced`
 * for the throw-on-failure flow.
 */
export function canTransition(
  db: IdeasDatabase,
  ideaId: string,
  toState: IdeaState,
): CanTransitionResult {
  // Pull the current state up front; some prereqs depend on the from-state.
  const row = db
    .prepare('SELECT state FROM ideas_notes WHERE id = ?')
    .get(ideaId) as { state: string } | undefined;
  if (!row) {
    return {
      ok: false,
      reason_code: 'idea_not_found',
      reason: `idea "${ideaId}" not found`,
    };
  }
  const fromState = row.state as IdeaState;

  // Fast-path: no prereqs apply to non-checked targets.
  if (toState !== 'evaluated' && toState !== 'committed' && toState !== 'validated' && toState !== 'refuted') {
    return { ok: true };
  }

  // explored → evaluated : ≥1 council session
  if (fromState === 'explored' && toState === 'evaluated') {
    const sessionCount = (db
      .prepare('SELECT COUNT(*) as c FROM ideas_council_sessions WHERE idea_id = ?')
      .get(ideaId) as { c: number }).c;
    if (sessionCount === 0) {
      return {
        ok: false,
        reason_code: 'no_council_session',
        reason: 'evaluated requires at least one council session — the council\'s job is to surface dissent before evaluation',
        recovery_hint: `Run a council first: council.run({ id: "${ideaId}", confirm: true, depth: "light", mode: "pre_mortem" })`,
      };
    }
  }

  // evaluated → committed : ≥1 locked load-bearing assumption (OSF preregistration discipline)
  if (fromState === 'evaluated' && toState === 'committed') {
    const lockedLoadBearing = (db
      .prepare(
        `SELECT COUNT(*) as c FROM ideas_assumptions
         WHERE idea_id = ? AND load_bearing = 1 AND locked_at IS NOT NULL AND status != 'refuted'`,
      )
      .get(ideaId) as { c: number }).c;
    if (lockedLoadBearing === 0) {
      return {
        ok: false,
        reason_code: 'no_locked_load_bearing_assumption',
        reason: 'committed requires at least one LOCKED load-bearing assumption — committing without preregistering a load-bearing claim makes later outcome adjudication unfalsifiable',
        recovery_hint: `Lock a load-bearing assumption: assumption.lock({ id: "<load-bearing assumption id>" }). Use assumption.list({ idea_id: "${ideaId}" }) to find one.`,
      };
    }
  }

  // committed → validated : ≥1 non-undone outcome
  if (fromState === 'committed' && toState === 'validated') {
    const outcomeCount = (db
      .prepare(
        `SELECT COUNT(*) as c FROM ideas_outcomes
         WHERE idea_id = ? AND undone_at IS NULL`,
      )
      .get(ideaId) as { c: number }).c;
    if (outcomeCount === 0) {
      return {
        ok: false,
        reason_code: 'no_outcome_logged',
        reason: 'validated requires at least one logged outcome — moving committed→validated without outcome data skips the compounding mechanism',
        recovery_hint: `Log an outcome first: outcome.log({ idea_id: "${ideaId}", text: "<what happened>", validates: ["<assumption ids>"] })`,
      };
    }
  }

  // committed → refuted : ≥1 outcome with at least one refute verdict
  if (fromState === 'committed' && toState === 'refuted') {
    const refutingOutcomes = (db
      .prepare(
        `SELECT COUNT(DISTINCT o.id) as c
         FROM ideas_outcomes o
         JOIN ideas_outcome_verdicts v ON v.outcome_id = o.id
         WHERE o.idea_id = ? AND o.undone_at IS NULL AND v.verdict = 'refuted'`,
      )
      .get(ideaId) as { c: number }).c;
    if (refutingOutcomes === 0) {
      return {
        ok: false,
        reason_code: 'no_refuting_outcome',
        reason: 'refuted requires an outcome with at least one refute verdict — refuting without an outcome row leaves the cascade un-cited',
        recovery_hint: `Log a refuting outcome first: outcome.log({ idea_id: "${ideaId}", text: "<what broke>", refutes: ["<assumption ids>"] })`,
      };
    }
  }

  return { ok: true };
}

/** Structured error thrown by `recordTransitionEnforced` when canTransition fails. */
export class TransitionPrereqError extends Error {
  readonly reason_code: string;
  readonly reason: string;
  readonly recovery_hint?: string;
  constructor(check: Exclude<CanTransitionResult, { ok: true }>) {
    super(`transition blocked: ${check.reason_code} — ${check.reason}`);
    this.name = 'TransitionPrereqError';
    this.reason_code = check.reason_code;
    this.reason = check.reason;
    this.recovery_hint = check.recovery_hint;
  }
}

export interface RecordTransitionEnforcedOptions extends RecordTransitionOptions {
  /**
   * When true, skip the `canTransition` prereq check. Used by tests + library
   * code that want raw transitions for setup. NEVER expose this to MCP
   * arguments without explicit user consent — the whole point of enforcement
   * is the discipline gate.
   */
  bypass_enforcement?: boolean;
}

/**
 * Wraps `recordTransition` with a prereq check (`canTransition`). Throws
 * `TransitionPrereqError` when the check fails, unless
 * `options.bypass_enforcement` is true.
 *
 * Recommended for MCP-layer callers; library consumers can use the raw
 * `recordTransition` (no checks) for setup or migration scenarios.
 */
export function recordTransitionEnforced(
  db: IdeasDatabase,
  ideaId: string,
  toState: IdeaState,
  options: RecordTransitionEnforcedOptions = {},
): TransitionRecord {
  if (!options.bypass_enforcement) {
    const check = canTransition(db, ideaId, toState);
    if (!check.ok) {
      throw new TransitionPrereqError(check);
    }
  }
  return recordTransition(db, ideaId, toState, {
    at: options.at,
    reason: options.reason,
  });
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
