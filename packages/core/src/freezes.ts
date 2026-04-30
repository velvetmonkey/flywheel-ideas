/**
 * Freezes — OSF-style preregistration snapshots (v0.2 Phase 1 D2).
 *
 * **Why:** the OSF preregistration pattern locks the hypothesis + analysis
 * plan + pass/fail criteria BEFORE the experiment runs. Later outcomes are
 * evaluated against the locked plan, preventing goalpost-shift.
 *
 * **For flywheel-ideas:** freeze the idea text + body + state + all open
 * declared assumptions (with their locked-at status + extensions) at a
 * point in time. Optionally bind to a council session so the council
 * audit trail anchors against the same snapshot. Later outcome verdicts
 * cite the freeze id, making it mechanical to ask "did the result match
 * the prediction we committed to, OR are we judging against a revised
 * yardstick?"
 *
 * **Immutability + amendments.** Freeze rows are insert-only — the
 * `snapshot_json` column never mutates after write. To revise a freeze
 * (OSF's "transparent amendment" pattern), create a new freeze with
 * `supersedes_freeze_id` pointing at the prior + a required
 * `amendment_rationale`. The chain is auditable; the prior snapshots
 * remain on the record forever.
 *
 * **Council binding.** `council_session_id` is optional. Three usage
 * patterns:
 *   1. Standalone preregistration — no council binding; just locking the
 *      plan for later outcome adjudication.
 *   2. `council.run({freeze: true})` — auto-create a freeze AT dispatch
 *      time, bind the freeze to the new session.
 *   3. `council.run({freeze_id: ...})` — bind a pre-existing freeze to a
 *      council session that's about to dispatch.
 */

import * as path from 'node:path';
import { generateFreezeId } from './ids.js';
import type { IdeasDatabase } from './db.js';
import { readNote } from './read/notes.js';
import {
  getIdeaContext,
  getIdeaExtension,
  type IdeaContext,
  type IdeaExtensionRow,
} from './idea-extensions.js';
import { getAssumptionExtension, type AssumptionExtensionRow } from './assumption-extensions.js';

/**
 * Snapshot of an idea + its open assumptions at the moment of freeze.
 * Persisted as JSON in `ideas_freezes.snapshot_json`. Versioned so that
 * future schema bumps can detect old snapshots and decline to deserialize
 * unsafely (rather than silently producing a wrong-shape object).
 */
export interface FreezeSnapshot {
  /** Snapshot shape version — bump on breaking changes to the JSON shape. */
  snapshot_version: 2;
  /** Frozen idea state (DB row + body from disk + extension if present). */
  idea: {
    id: string;
    title: string;
    vault_path: string;
    state: string;
    body: string;
    context: IdeaContext | null;
    extension: IdeaExtensionRow | null;
  };
  /**
   * Frozen assumptions — non-refuted at freeze time. Includes the v1 Y-statement
   * fields, the `load_bearing` flag, the `locked_at` status, and the v3
   * extension row if present.
   */
  assumptions: Array<{
    id: string;
    text: string;
    context: string | null;
    challenge: string | null;
    decision: string | null;
    tradeoff: string | null;
    status: string;
    load_bearing: boolean;
    signpost_at: number | null;
    signpost_reason: string | null;
    locked_at: number | null;
    vault_path: string;
    declared_at: number;
    extension: AssumptionExtensionRow | null;
  }>;
  /** ISO timestamp matching the row's `frozen_at` column for human readability. */
  frozen_at_iso: string;
}

export interface FreezeRow {
  id: string;
  idea_id: string;
  council_session_id: string | null;
  snapshot: FreezeSnapshot;
  supersedes_freeze_id: string | null;
  amendment_rationale: string | null;
  frozen_at: number;
}

interface LegacyFreezeSnapshot {
  snapshot_version: 1;
  idea: {
    id: string;
    title: string;
    vault_path: string;
    state: string;
    body: string;
    extension: IdeaExtensionRow | null;
  };
  assumptions: FreezeSnapshot['assumptions'];
  frozen_at_iso: string;
}

export interface CreateFreezeOptions {
  /** Bind to an existing council session at create time. */
  council_session_id?: string;
  /** Mark this freeze as an amendment to a prior one (OSF transparent-amendment pattern). */
  supersedes_freeze_id?: string;
  /** Required when `supersedes_freeze_id` is set; explains what changed and why. */
  amendment_rationale?: string;
}

export class FreezeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FreezeInputError';
  }
}

export class FreezeNotFoundError extends Error {
  constructor(id: string) {
    super(`freeze not found: ${id}`);
    this.name = 'FreezeNotFoundError';
  }
}

export class IdeaNotFoundError extends Error {
  constructor(id: string) {
    super(`idea not found: ${id}`);
    this.name = 'IdeaNotFoundError';
  }
}

/**
 * Build a transient snapshot of the current idea + open assumptions WITHOUT
 * persisting anything. Reused by `createFreeze` (which persists) and by
 * `idea.export` (which doesn't — exports are read-only by design).
 *
 * Reads body from disk; reads extensions if present. Returns the snapshot.
 *
 * Throws `IdeaNotFoundError` when the idea row is missing.
 */
export function buildSnapshot(
  db: IdeasDatabase,
  vaultPath: string,
  idea_id: string,
  now: number = Date.now(),
): FreezeSnapshot {
  const idea = db
    .prepare('SELECT id, title, vault_path, state FROM ideas_notes WHERE id = ?')
    .get(idea_id) as { id: string; title: string; vault_path: string; state: string } | undefined;
  if (!idea) {
    throw new IdeaNotFoundError(idea_id);
  }

  // Read body from disk; if the markdown is gone, snapshot with empty body
  // rather than throwing — a snapshot of a missing-body idea is still useful.
  let body = '';
  try {
    const note = readNote(vaultPath, idea.vault_path);
    if (note.exists) body = note.body;
  } catch {
    body = '';
  }

  const ideaExtension = getIdeaExtension(db, idea_id);

  const assumptionRows = db
    .prepare(
      `SELECT id, idea_id, text, context, challenge, decision, tradeoff,
              status, load_bearing, signpost_at, signpost_reason, locked_at,
              vault_path, declared_at, refuted_at
       FROM ideas_assumptions
       WHERE idea_id = ? AND status != 'refuted'
       ORDER BY declared_at ASC, id ASC`,
    )
    .all(idea_id) as Array<{
    id: string;
    idea_id: string;
    text: string;
    context: string | null;
    challenge: string | null;
    decision: string | null;
    tradeoff: string | null;
    status: string;
    load_bearing: number;
    signpost_at: number | null;
    signpost_reason: string | null;
    locked_at: number | null;
    vault_path: string;
    declared_at: number;
  }>;

  return {
    snapshot_version: 2,
    idea: {
      id: idea.id,
      title: idea.title,
      vault_path: idea.vault_path,
      state: idea.state,
      body,
      context: getIdeaContext(db, idea_id),
      extension: ideaExtension,
    },
    assumptions: assumptionRows.map((a) => ({
      id: a.id,
      text: a.text,
      context: a.context,
      challenge: a.challenge,
      decision: a.decision,
      tradeoff: a.tradeoff,
      status: a.status,
      load_bearing: a.load_bearing === 1,
      signpost_at: a.signpost_at,
      signpost_reason: a.signpost_reason,
      locked_at: a.locked_at,
      vault_path: a.vault_path,
      declared_at: a.declared_at,
      extension: getAssumptionExtension(db, a.id),
    })),
    frozen_at_iso: new Date(now).toISOString(),
  };
}

/**
 * Snapshot the current idea + open assumptions and persist as a freeze row.
 * Reads body from disk; reads extensions if present. Returns the freeze.
 *
 * Validation:
 * - `supersedes_freeze_id` requires `amendment_rationale` (OSF discipline).
 * - The supersedes freeze must exist and reference the same `idea_id`.
 */
export function createFreeze(
  db: IdeasDatabase,
  vaultPath: string,
  idea_id: string,
  options: CreateFreezeOptions = {},
  now: number = Date.now(),
): FreezeRow {
  // Idea-existence check first, before supersedes-validation, to preserve
  // pre-refactor error precedence. buildSnapshot below also checks, but the
  // explicit early check matches the original error ordering.
  const ideaExists = db
    .prepare('SELECT 1 FROM ideas_notes WHERE id = ?')
    .get(idea_id) as { 1: number } | undefined;
  if (!ideaExists) {
    throw new IdeaNotFoundError(idea_id);
  }

  if (options.supersedes_freeze_id) {
    if (!options.amendment_rationale || options.amendment_rationale.trim() === '') {
      throw new FreezeInputError(
        'supersedes_freeze_id requires a non-empty amendment_rationale (OSF transparent-amendment discipline)',
      );
    }
    const prior = getFreeze(db, options.supersedes_freeze_id);
    if (!prior) {
      throw new FreezeInputError(
        `supersedes_freeze_id references unknown freeze: ${options.supersedes_freeze_id}`,
      );
    }
    if (prior.idea_id !== idea_id) {
      throw new FreezeInputError(
        `supersedes_freeze_id ${options.supersedes_freeze_id} belongs to idea ${prior.idea_id}, not ${idea_id}`,
      );
    }
  }

  const snapshot = buildSnapshot(db, vaultPath, idea_id, now);

  const id = generateFreezeId();
  db.prepare(
    `INSERT INTO ideas_freezes
       (id, idea_id, council_session_id, snapshot_json,
        supersedes_freeze_id, amendment_rationale, frozen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    idea_id,
    options.council_session_id ?? null,
    JSON.stringify(snapshot),
    options.supersedes_freeze_id ?? null,
    options.amendment_rationale ?? null,
    now,
  );

  return {
    id,
    idea_id,
    council_session_id: options.council_session_id ?? null,
    snapshot,
    supersedes_freeze_id: options.supersedes_freeze_id ?? null,
    amendment_rationale: options.amendment_rationale ?? null,
    frozen_at: now,
  };
}

/**
 * Read a freeze by id. Returns null when not found.
 *
 * Defensive deserialization: malformed `snapshot_json` (shouldn't happen
 * in practice — we control the writes) is treated as `null` rather than
 * thrown. Callers can detect by checking `snapshot.snapshot_version`.
 */
export function getFreeze(db: IdeasDatabase, freeze_id: string): FreezeRow | null {
  const row = db
    .prepare(
      `SELECT id, idea_id, council_session_id, snapshot_json,
              supersedes_freeze_id, amendment_rationale, frozen_at
       FROM ideas_freezes WHERE id = ?`,
    )
    .get(freeze_id) as
    | {
        id: string;
        idea_id: string;
        council_session_id: string | null;
        snapshot_json: string;
        supersedes_freeze_id: string | null;
        amendment_rationale: string | null;
        frozen_at: number;
      }
    | undefined;
  if (!row) return null;

  let snapshot: FreezeSnapshot;
  try {
    const parsed = JSON.parse(row.snapshot_json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.snapshot_version === 'number' &&
      parsed.idea &&
      Array.isArray(parsed.assumptions)
    ) {
      snapshot = normalizeSnapshot(parsed as FreezeSnapshot | LegacyFreezeSnapshot);
    } else {
      // Fallback shape if the row was hand-edited; surface as malformed by
      // returning the bare-minimum shape so callers can still see metadata.
      snapshot = malformedSnapshot(row.idea_id, row.frozen_at);
    }
  } catch {
    snapshot = malformedSnapshot(row.idea_id, row.frozen_at);
  }

  return {
    id: row.id,
    idea_id: row.idea_id,
    council_session_id: row.council_session_id,
    snapshot,
    supersedes_freeze_id: row.supersedes_freeze_id,
    amendment_rationale: row.amendment_rationale,
    frozen_at: row.frozen_at,
  };
}

function normalizeSnapshot(snapshot: FreezeSnapshot | LegacyFreezeSnapshot): FreezeSnapshot {
  if (snapshot.snapshot_version === 2) return snapshot;
  return {
    snapshot_version: 2,
    idea: {
      ...snapshot.idea,
      context: snapshot.idea.extension?.context ?? null,
    },
    assumptions: snapshot.assumptions,
    frozen_at_iso: snapshot.frozen_at_iso,
  };
}

function malformedSnapshot(idea_id: string, frozen_at: number): FreezeSnapshot {
  return {
    snapshot_version: 2,
    idea: {
      id: idea_id,
      title: '',
      vault_path: '',
      state: 'unknown',
      body: '',
      context: null,
      extension: null,
    },
    assumptions: [],
    frozen_at_iso: new Date(frozen_at).toISOString(),
  };
}

export interface ListFreezesOptions {
  /** Order. Default 'desc' (newest first). */
  order?: 'asc' | 'desc';
  limit?: number;
}

export function listFreezesByIdea(
  db: IdeasDatabase,
  idea_id: string,
  options: ListFreezesOptions = {},
): FreezeRow[] {
  const order = options.order === 'asc' ? 'ASC' : 'DESC';
  const limit = options.limit ?? 100;
  const rows = db
    .prepare(
      `SELECT id, idea_id, council_session_id, snapshot_json,
              supersedes_freeze_id, amendment_rationale, frozen_at
       FROM ideas_freezes WHERE idea_id = ?
       ORDER BY frozen_at ${order}
       LIMIT ?`,
    )
    .all(idea_id, limit) as Array<{
    id: string;
    idea_id: string;
    council_session_id: string | null;
    snapshot_json: string;
    supersedes_freeze_id: string | null;
    amendment_rationale: string | null;
    frozen_at: number;
  }>;
  // Avoid double-parse — call getFreeze for each id rather than re-parsing inline.
  // Small N expected, simplicity beats micro-optimisation here.
  return rows
    .map((r) => getFreeze(db, r.id))
    .filter((f): f is FreezeRow => f !== null);
}

/**
 * Set `council_session_id` on an existing freeze. Used by `council.run`
 * when the dispatcher has just created the session and wants to bind a
 * pre-existing freeze to it. Idempotent — re-binding the same session is
 * a no-op; binding a different session throws.
 */
export function bindFreezeToCouncilSession(
  db: IdeasDatabase,
  freeze_id: string,
  council_session_id: string,
): FreezeRow {
  const existing = getFreeze(db, freeze_id);
  if (!existing) throw new FreezeNotFoundError(freeze_id);
  if (existing.council_session_id === council_session_id) return existing;
  if (existing.council_session_id !== null) {
    throw new FreezeInputError(
      `freeze ${freeze_id} already bound to council session ${existing.council_session_id}; cannot rebind to ${council_session_id}`,
    );
  }
  db.prepare(
    'UPDATE ideas_freezes SET council_session_id = ? WHERE id = ?',
  ).run(council_session_id, freeze_id);
  const updated = getFreeze(db, freeze_id);
  if (!updated) throw new FreezeNotFoundError(freeze_id); // should be impossible
  return updated;
}

// Quiet `path` import — reserved for future use (vault-path-aware operations
// like rendering a freeze to disk). Keeps the module self-contained without
// the import being flagged as unused by tsc.
export const _path = path;
