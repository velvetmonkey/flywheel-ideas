/**
 * Assumption domain logic.
 *
 * Assumptions are Y-statement-shaped claims attached to an idea. They capture
 * what the idea *depends on* so the council can attack the load-bearing
 * claims directly, and so outcome.log (M12) can propagate refutations across
 * ideas that cite the same assumption.
 *
 * v0.1 surface:
 *   - declareAssumption  — idea-FK validated; writeNote + DB insert with
 *     orphan-file rollback on DB failure.
 *   - listAssumptions    — by idea, with stale filtering.
 *   - lockAssumption     — OSF-style pre-registration. Sets locked_at.
 *   - unlockAssumption   — clears locked_at (writes null, not deletes).
 *   - findDueSignposts   — load-bearing + open + signpost elapsed.
 *   - forgetAssumption   — hard-delete the DB row; leave the markdown on
 *     disk.
 *   - renderYStatement   — pure; the body template used by declare.
 *   - buildAssumptionNextStepsForIdea — exported helper so idea.read can
 *     surface due-signpost and no-assumption hints without coupling the idea
 *     tool to assumption SQL.
 *
 * v0.1 state-machine policy: assumption.status is `open` at declaration.
 * Status mutation to `refuted` is driven by outcome.log (M12). `held` lands in
 * v0.2 as an explicit "validated by signpost but outcome not yet logged"
 * concept. No recordTransition analog for assumption status is shipped in
 * M5 — the concept is simpler (3 terminal values, outcome-driven) and an
 * abstraction only pays for itself if v0.2 adds transitions the user
 * controls directly.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { IdeasDatabase } from './db.js';
import { generateAssumptionId } from './ids.js';
import { filterStaleRows } from './stale-filter.js';
import { patchFrontmatter, writeNote } from './write/index.js';

export type AssumptionStatus = 'open' | 'held' | 'refuted';

export interface AssumptionStructured {
  context: string;
  challenge: string;
  decision: string;
  tradeoff: string;
}

export interface AssumptionDeclareInput {
  idea_id: string;
  /** Free-form Y-statement text. Mutually exclusive with `structured`. */
  text?: string;
  /** Structured Y-statement fields. Preferred over `text` when all four present. */
  structured?: AssumptionStructured;
  /** Unix ms timestamp for a future re-evaluation trigger. */
  signpost_at?: number;
  signpost_reason?: string;
  load_bearing?: boolean;
}

export interface AssumptionRow {
  id: string;
  idea_id: string;
  text: string;
  context: string | null;
  challenge: string | null;
  decision: string | null;
  tradeoff: string | null;
  status: AssumptionStatus;
  load_bearing: boolean;
  signpost_at: number | null;
  signpost_reason: string | null;
  locked_at: number | null;
  vault_path: string;
  declared_at: number;
  refuted_at: number | null;
}

export interface DeclareAssumptionResult {
  assumption: AssumptionRow;
  write_path: 'direct-fs';
}

export class AssumptionNotFoundError extends Error {
  constructor(id: string) {
    super(`assumption not found: ${id}`);
    this.name = 'AssumptionNotFoundError';
  }
}

export class IdeaNotFoundError extends Error {
  constructor(id: string) {
    super(`idea not found: ${id}`);
    this.name = 'IdeaNotFoundError';
  }
}

export class AssumptionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssumptionInputError';
  }
}

/**
 * Render a Y-statement body from structured fields.
 *
 * Users' words are passed through verbatim; we don't sanitize markdown
 * metacharacters. If a value contains markdown (`**bold**`, links, etc.) it
 * renders as intended.
 */
export function renderYStatement(s: AssumptionStructured): string {
  return (
    `In the context of **${s.context}**, facing **${s.challenge}**, ` +
    `we assume **${s.decision}**, accepting **${s.tradeoff}**.\n`
  );
}

/** Build a kebab-slug from the "decision" field or first chars of free text. */
function slugifyForAssumption(source: string): string {
  return (
    source
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'assumption'
  );
}

/** Compute the vault path for a newly declared assumption. */
export function buildAssumptionPath(
  primaryText: string,
  disambiguator: number,
): string {
  const slug = slugifyForAssumption(primaryText);
  const disamb = `${disambiguator}`.slice(-6);
  return `assumptions/${slug}-${disamb}.md`;
}

/**
 * Declare a new assumption. Atomic: writeNote first, DB insert second; on DB
 * failure the orphan markdown is `fsp.unlink`'d before the error rethrows.
 */
export async function declareAssumption(
  db: IdeasDatabase,
  vaultPath: string,
  input: AssumptionDeclareInput,
  now: number = Date.now(),
): Promise<DeclareAssumptionResult> {
  // 1. Resolve input — structured vs free text.
  const structured = input.structured;
  let text: string;
  let context: string | null = null;
  let challenge: string | null = null;
  let decision: string | null = null;
  let tradeoff: string | null = null;

  if (
    structured &&
    structured.context &&
    structured.challenge &&
    structured.decision &&
    structured.tradeoff
  ) {
    text = renderYStatement(structured);
    context = structured.context;
    challenge = structured.challenge;
    decision = structured.decision;
    tradeoff = structured.tradeoff;
  } else if (input.text && input.text.trim().length > 0) {
    text = input.text;
  } else {
    throw new AssumptionInputError(
      'declareAssumption: provide either `text` or all four of ' +
        '{context, challenge, decision, tradeoff}',
    );
  }

  // 2. Validate parent idea exists.
  const ideaRow = db
    .prepare('SELECT id, vault_path FROM ideas_notes WHERE id = ?')
    .get(input.idea_id) as { id: string; vault_path: string } | undefined;
  if (!ideaRow) {
    throw new IdeaNotFoundError(input.idea_id);
  }

  // 3. Generate id + vault path.
  const id = generateAssumptionId();
  const primaryText = decision ?? text;
  const vaultRelPath = buildAssumptionPath(primaryText, now);

  // 4. Render frontmatter + body, write the file.
  const frontmatter: Record<string, unknown> = {
    id,
    type: 'assumption',
    idea_id: input.idea_id,
    status: 'open',
    load_bearing: Boolean(input.load_bearing),
    declared_at: new Date(now).toISOString(),
  };
  if (input.signpost_at != null) {
    frontmatter.signpost_at = new Date(input.signpost_at).toISOString();
  }
  if (input.signpost_reason) {
    frontmatter.signpost_reason = input.signpost_reason;
  }

  const writeResult = await writeNote(vaultPath, vaultRelPath, frontmatter, text);

  // 5. Insert DB row. On failure, unlink the orphan markdown before rethrowing.
  try {
    db.prepare(
      `INSERT INTO ideas_assumptions
       (id, idea_id, text, context, challenge, decision, tradeoff,
        status, load_bearing, signpost_at, signpost_reason, locked_at,
        vault_path, declared_at, refuted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.idea_id,
      text,
      context,
      challenge,
      decision,
      tradeoff,
      'open',
      input.load_bearing ? 1 : 0,
      input.signpost_at ?? null,
      input.signpost_reason ?? null,
      null,
      writeResult.vault_path,
      now,
      null,
    );
  } catch (err) {
    // Rollback the orphan. Best-effort; we still rethrow the original error.
    try {
      await fsp.unlink(path.join(vaultPath, writeResult.vault_path));
    } catch {
      /* ignore */
    }
    throw err;
  }

  const row = getAssumption(db, id);
  if (!row) {
    throw new Error(`declareAssumption: failed to read back inserted row ${id}`);
  }
  return { assumption: row, write_path: writeResult.write_path };
}

export function getAssumption(db: IdeasDatabase, id: string): AssumptionRow | null {
  const row = db
    .prepare(
      `SELECT id, idea_id, text, context, challenge, decision, tradeoff,
              status, load_bearing, signpost_at, signpost_reason, locked_at,
              vault_path, declared_at, refuted_at
       FROM ideas_assumptions WHERE id = ?`,
    )
    .get(id) as RawAssumptionRow | undefined;
  return row ? hydrateRow(row) : null;
}

interface RawAssumptionRow {
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
  refuted_at: number | null;
}

function hydrateRow(r: RawAssumptionRow): AssumptionRow {
  return {
    id: r.id,
    idea_id: r.idea_id,
    text: r.text,
    context: r.context,
    challenge: r.challenge,
    decision: r.decision,
    tradeoff: r.tradeoff,
    status: r.status as AssumptionStatus,
    load_bearing: r.load_bearing === 1,
    signpost_at: r.signpost_at,
    signpost_reason: r.signpost_reason,
    locked_at: r.locked_at,
    vault_path: r.vault_path,
    declared_at: r.declared_at,
    refuted_at: r.refuted_at,
  };
}

export interface ListAssumptionsOptions {
  include_stale?: boolean;
  limit?: number;
}

export interface ListAssumptionsResult {
  assumptions: Array<AssumptionRow & { stale: boolean }>;
  stale_hidden: number;
}

export function listAssumptions(
  db: IdeasDatabase,
  vaultPath: string,
  ideaId: string,
  options: ListAssumptionsOptions = {},
): ListAssumptionsResult {
  const limit = options.limit ?? 200;
  const rawRows = db
    .prepare(
      `SELECT id, idea_id, text, context, challenge, decision, tradeoff,
              status, load_bearing, signpost_at, signpost_reason, locked_at,
              vault_path, declared_at, refuted_at
       FROM ideas_assumptions
       WHERE idea_id = ?
       ORDER BY declared_at ASC
       LIMIT ?`,
    )
    .all(ideaId, limit) as RawAssumptionRow[];
  const rows = rawRows.map(hydrateRow);

  const { kept, staleSkipped } = filterStaleRows(vaultPath, rows, {
    include_stale: options.include_stale,
  });
  return {
    assumptions: kept,
    stale_hidden: staleSkipped,
  };
}

/**
 * OSF-style pre-registration lock. Sets `locked_at` on the DB row and patches
 * the same value (ISO string) into the markdown frontmatter. Unlocking writes
 * `null` to both — patchFrontmatter serializes `null` as YAML `null`, which is
 * valid and round-trips cleanly.
 */
export async function lockAssumption(
  db: IdeasDatabase,
  vaultPath: string,
  id: string,
  now: number = Date.now(),
): Promise<AssumptionRow> {
  const row = getAssumption(db, id);
  if (!row) throw new AssumptionNotFoundError(id);
  if (row.locked_at != null) return row; // already locked — no-op

  db.prepare('UPDATE ideas_assumptions SET locked_at = ? WHERE id = ?').run(now, id);
  try {
    await patchFrontmatter(vaultPath, row.vault_path, {
      locked_at: new Date(now).toISOString(),
    });
  } catch (err) {
    // Rollback the DB update. Keep the error path tight for OSF integrity.
    db.prepare('UPDATE ideas_assumptions SET locked_at = ? WHERE id = ?').run(row.locked_at, id);
    throw err;
  }
  const updated = getAssumption(db, id);
  return updated!;
}

export async function unlockAssumption(
  db: IdeasDatabase,
  vaultPath: string,
  id: string,
): Promise<AssumptionRow> {
  const row = getAssumption(db, id);
  if (!row) throw new AssumptionNotFoundError(id);
  if (row.locked_at == null) return row; // already unlocked — no-op

  const previous = row.locked_at;
  db.prepare('UPDATE ideas_assumptions SET locked_at = NULL WHERE id = ?').run(id);
  try {
    await patchFrontmatter(vaultPath, row.vault_path, { locked_at: null });
  } catch (err) {
    db.prepare('UPDATE ideas_assumptions SET locked_at = ? WHERE id = ?').run(previous, id);
    throw err;
  }
  const updated = getAssumption(db, id);
  return updated!;
}

export interface DueSignpostEntry extends AssumptionRow {
  elapsed_ms: number;
}

export interface FindDueSignpostsOptions {
  /** Extend the horizon into the future — include signposts due within N ms. */
  window_ms?: number;
  /** Restrict to a single idea (default: all). */
  idea_id?: string;
  /** Default 50. */
  limit?: number;
}

/**
 * Find load-bearing assumptions whose signpost has elapsed (or elapses within
 * the optional forward window). Locked assumptions ARE included — locking
 * freezes the statement for council preregistration, not for outcome
 * checkpoints. `status` must be `open` (refuted/held assumptions no longer
 * need re-evaluation).
 */
export function findDueSignposts(
  db: IdeasDatabase,
  now: number = Date.now(),
  options: FindDueSignpostsOptions = {},
): DueSignpostEntry[] {
  const horizon = now + (options.window_ms ?? 0);
  const limit = options.limit ?? 50;
  const baseSql = `
    SELECT id, idea_id, text, context, challenge, decision, tradeoff,
           status, load_bearing, signpost_at, signpost_reason, locked_at,
           vault_path, declared_at, refuted_at
    FROM ideas_assumptions
    WHERE load_bearing = 1
      AND status = 'open'
      AND signpost_at IS NOT NULL
      AND signpost_at <= ?
  `;
  const rows = (
    options.idea_id
      ? (db
          .prepare(`${baseSql} AND idea_id = ? ORDER BY signpost_at ASC LIMIT ?`)
          .all(horizon, options.idea_id, limit) as RawAssumptionRow[])
      : (db
          .prepare(`${baseSql} ORDER BY signpost_at ASC LIMIT ?`)
          .all(horizon, limit) as RawAssumptionRow[])
  ).map(hydrateRow);

  return rows.map((r) => ({
    ...r,
    elapsed_ms: now - (r.signpost_at ?? now),
  }));
}

/** Hard-delete the DB row. Markdown file intentionally left on disk. */
export function forgetAssumption(db: IdeasDatabase, id: string): AssumptionRow {
  const row = getAssumption(db, id);
  if (!row) throw new AssumptionNotFoundError(id);
  db.prepare('DELETE FROM ideas_assumptions WHERE id = ?').run(id);
  return row;
}

// =============================================================================
// Cross-tool helper
// =============================================================================

export interface AssumptionNextStepHint {
  action: string;
  example: string;
  why: string;
}

/**
 * Build next_step hints for `idea.read` related to assumptions. Separated
 * from the idea tool so adding new hint rules doesn't require touching the
 * idea domain.
 *
 * Returns an ordered list; idea.read appends these after its own state-based
 * next_steps. Returns empty array when nothing assumption-related is
 * actionable.
 */
export function buildAssumptionNextStepsForIdea(
  db: IdeasDatabase,
  ideaId: string,
  now: number = Date.now(),
): AssumptionNextStepHint[] {
  const hints: AssumptionNextStepHint[] = [];

  const count = (
    db.prepare('SELECT COUNT(*) as c FROM ideas_assumptions WHERE idea_id = ?').get(ideaId) as {
      c: number;
    }
  ).c;

  if (count === 0) {
    hints.push({
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${ideaId}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
      why: 'No assumptions declared yet — the council has nothing load-bearing to attack. Declare at least one Y-statement before running council.',
    });
    return hints;
  }

  const due = findDueSignposts(db, now, { idea_id: ideaId, limit: 10 });
  if (due.length > 0) {
    hints.push({
      action: 'assumption.list',
      example: `assumption.list({ idea_id: "${ideaId}" })`,
      why: `${due.length} load-bearing assumption(s) have elapsed signposts — they were marked for re-evaluation at a date that has passed. Review them now.`,
    });
  }

  return hints;
}
