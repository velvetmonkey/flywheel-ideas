/**
 * Outcome + propagation domain (M12) — the compounding mechanism.
 *
 * `outcome.log` records what actually happened after a decision + refutes
 * or validates assumptions. Refutation cascades through the citation graph
 * (`ideas_assumption_citations → ideas_council_views → ideas_council_sessions
 * → ideas_notes`) and flags dependent ideas with `needs_review=1`.
 *
 * `outcome.undo` reverses atomically. Critical design: when an outcome is
 * undone, assumption status is RECOMPUTED from remaining non-undone verdicts
 * (SQL CASE), never blindly reset to 'open'. This preserves correctness when
 * multiple outcomes refute the same assumption.
 *
 * Invariant: M12 is the sole writer to `ideas_notes.needs_review` in v0.1.
 * Any future source (signpost sweep, agent-driven detection, etc.) must
 * coordinate with the outcome-clearing path.
 */

import { createHash } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { generateOutcomeId } from './ids.js';
import { writeNote } from './write/direct-fs.js';
import type { IdeasDatabase } from './db.js';
import { filterStaleRows } from './stale-filter.js';
import { activeWritePath, type WritePathTier } from './write/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OutcomeLogInput {
  idea_id: string;
  text: string;
  /** Assumption ids to mark refuted. At least one of refutes/validates required. */
  refutes?: string[];
  /** Assumption ids to mark validated (→ status='held'). */
  validates?: string[];
}

export interface OutcomeRow {
  id: string;
  idea_id: string;
  text: string;
  vault_path: string;
  landed_at: number;
  undone_at: number | null;
}

export interface FlaggedIdea {
  id: string;
  title: string;
  vault_path: string;
}

export interface OutcomeLogResult {
  outcome: OutcomeRow;
  refuted: string[];
  validated: string[];
  flagged_ideas: FlaggedIdea[];
  write_path: WritePathTier;
}

export interface OutcomeUndoResult {
  outcome: OutcomeRow;
  status_changes: Array<{ assumption_id: string; from: string; to: string }>;
  cleared_ideas: string[];
  write_path: WritePathTier;
}

export interface ListOutcomesOptions {
  idea_id?: string;
  include_stale?: boolean;
  limit?: number;
}

export interface ListOutcomesResult {
  outcomes: Array<OutcomeRow & { stale: boolean }>;
  count: number;
  stale_hidden: number;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class OutcomeNotFoundError extends Error {
  constructor(id: string) {
    super(`outcome not found: ${id}`);
    this.name = 'OutcomeNotFoundError';
  }
}

export class OutcomeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutcomeInputError';
  }
}

export class OutcomeAlreadyUndoneError extends Error {
  constructor(id: string, undone_at: number) {
    super(`outcome ${id} was already undone at ${new Date(undone_at).toISOString()}`);
    this.name = 'OutcomeAlreadyUndoneError';
  }
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Vault-relative path for a newly-logged outcome markdown file.
 *
 * Format: `outcomes/<slug>-<id_full>.md` where `id_full` is the 8-char random
 * suffix of `generateOutcomeId()`. Full suffix (not a slice) avoids UNIQUE
 * collisions on millisecond-batched logs AND in fast-check property runs.
 */
export function buildOutcomePath(text: string, outcomeId: string): string {
  const slug = slugifyForOutcome(text);
  // "out-<8chars>" → strip the "out-" prefix to get the full random suffix
  const suffix = outcomeId.startsWith('out-') ? outcomeId.slice(4) : outcomeId;
  return `outcomes/${slug}-${suffix}.md`;
}

function slugifyForOutcome(source: string): string {
  const cleaned = source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'outcome';
}

// ---------------------------------------------------------------------------
// Hash (for deterministic audit)
// ---------------------------------------------------------------------------

/**
 * Deterministic digest of the outcome log's logical content — used by tests
 * to assert input_hash-like invariants on verdict sets. Not persisted.
 */
export function computeOutcomeDigest(input: OutcomeLogInput): string {
  const canonical = JSON.stringify({
    idea_id: input.idea_id,
    text: input.text,
    refutes: [...(input.refutes ?? [])].sort(),
    validates: [...(input.validates ?? [])].sort(),
  });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

// ---------------------------------------------------------------------------
// logOutcome — the propagation entry point
// ---------------------------------------------------------------------------

export async function logOutcome(
  db: IdeasDatabase,
  vault_path: string,
  input: OutcomeLogInput,
  now: number = Date.now(),
): Promise<OutcomeLogResult> {
  // 1. Validate inputs
  if (!input.idea_id) {
    throw new OutcomeInputError('logOutcome requires idea_id');
  }
  if (!input.text || !input.text.trim()) {
    throw new OutcomeInputError('logOutcome requires non-empty text');
  }

  const refutes = [...(input.refutes ?? [])];
  const validates = [...(input.validates ?? [])];
  if (refutes.length === 0 && validates.length === 0) {
    throw new OutcomeInputError(
      'logOutcome requires at least one of refutes or validates',
    );
  }

  // Disjoint check: the same assumption can't be both refuted and validated
  const overlap = refutes.filter((id) => validates.includes(id));
  if (overlap.length > 0) {
    throw new OutcomeInputError(
      `the same assumption id cannot be both refuted and validated: ${overlap.join(', ')}`,
    );
  }

  const idea = db
    .prepare(`SELECT id FROM ideas_notes WHERE id = ?`)
    .get(input.idea_id) as { id: string } | undefined;
  if (!idea) {
    throw new OutcomeInputError(`idea not found: ${input.idea_id}`);
  }

  // Every cited assumption id must exist AND belong to this idea.
  const touched = [...new Set([...refutes, ...validates])];
  if (touched.length > 0) {
    const placeholders = touched.map(() => '?').join(',');
    const found = db
      .prepare(
        `SELECT id, idea_id FROM ideas_assumptions WHERE id IN (${placeholders})`,
      )
      .all(...touched) as Array<{ id: string; idea_id: string }>;
    const foundIds = new Set(found.map((r) => r.id));
    const missing = touched.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new OutcomeInputError(
        `assumption id(s) not found: ${missing.join(', ')}`,
      );
    }
    const foreign = found.filter((r) => r.idea_id !== input.idea_id);
    if (foreign.length > 0) {
      throw new OutcomeInputError(
        `assumption id(s) do not belong to idea ${input.idea_id}: ${foreign
          .map((r) => r.id)
          .join(', ')}`,
      );
    }
  }

  // 2. Compute outcome id + vault path
  const outcome_id = generateOutcomeId();
  const vault_rel_path = buildOutcomePath(input.text, outcome_id);

  // 3. Write markdown note BEFORE DB transaction (mirrors assumption pattern).
  //    On transaction failure, orphan file is unlinked in catch.
  const frontmatter: Record<string, unknown> = {
    id: outcome_id,
    type: 'outcome',
    idea_id: input.idea_id,
    landed_at: new Date(now).toISOString(),
    refutes,
    validates,
    undone_at: null,
  };
  const body = renderOutcomeBody(input, refutes, validates);
  await writeNote(vault_path, vault_rel_path, frontmatter, body, { overwrite: false });

  // 4. Run atomic transaction
  try {
    const propagate = db.transaction((): { flagged_ideas: FlaggedIdea[] } => {
      // 4a. Insert outcome row
      db.prepare(
        `INSERT INTO ideas_outcomes (id, idea_id, text, vault_path, landed_at, undone_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      ).run(outcome_id, input.idea_id, input.text, vault_rel_path, now);

      // 4b. Insert verdicts
      const vstmt = db.prepare(
        `INSERT INTO ideas_outcome_verdicts (outcome_id, assumption_id, verdict) VALUES (?, ?, ?)`,
      );
      for (const id of refutes) vstmt.run(outcome_id, id, 'refuted');
      for (const id of validates) vstmt.run(outcome_id, id, 'validated');

      // 4c. Update assumption status — refutes → refuted. Use COALESCE on
      //     refuted_at so the EARLIEST refuter's timestamp sticks: if the
      //     assumption was refuted earlier (and the earlier outcome is still
      //     active), refuted_at stays at its first-set value. If previously
      //     NULL (open/held), set to now.
      if (refutes.length > 0) {
        const placeholders = refutes.map(() => '?').join(',');
        db.prepare(
          `UPDATE ideas_assumptions
              SET status = 'refuted',
                  refuted_at = COALESCE(refuted_at, ?)
            WHERE id IN (${placeholders})`,
        ).run(now, ...refutes);
      }

      // 4d. Update assumption status — validates → held
      if (validates.length > 0) {
        const placeholders = validates.map(() => '?').join(',');
        db.prepare(
          `UPDATE ideas_assumptions SET status = 'held' WHERE id IN (${placeholders})`,
        ).run(...validates);
      }

      // 4e. Find flagged ideas via citation graph (only refuted assumptions propagate)
      let flagged: FlaggedIdea[] = [];
      if (refutes.length > 0) {
        flagged = queryCitingIdeas(db, refutes);
      }

      // 4f. Flip needs_review=1 on flagged ideas (excluding the idea that owned
      //     the outcome — that idea just landed its outcome; it doesn't flag
      //     itself). Distinct + ordered.
      const flaggedIds = flagged
        .map((f) => f.id)
        .filter((id) => id !== input.idea_id);
      if (flaggedIds.length > 0) {
        const placeholders = flaggedIds.map(() => '?').join(',');
        db.prepare(
          `UPDATE ideas_notes SET needs_review = 1 WHERE id IN (${placeholders})`,
        ).run(...flaggedIds);
      }

      return { flagged_ideas: flagged.filter((f) => f.id !== input.idea_id) };
    });

    const { flagged_ideas } = propagate();

    // Best-effort sync assumption markdown frontmatter with new DB status.
    // DB is authoritative; vault markdown is human-readable mirror. Failure
    // here does not roll back the transaction — users may see stale status
    // in markdown until a future sync tool. Log once per failure.
    await syncAssumptionFrontmatter(db, vault_path, touched);

    const outcome = getOutcome(db, outcome_id);
    if (!outcome) {
      throw new Error(`logOutcome: outcome ${outcome_id} disappeared after insert`);
    }

    return {
      outcome,
      refuted: refutes,
      validated: validates,
      flagged_ideas,
      write_path: activeWritePath,
    };
  } catch (err) {
    // Transaction failed → unlink orphan markdown. Best-effort; log on 2nd failure.
    try {
      await fsp.unlink(path.join(vault_path, vault_rel_path));
    } catch (unlinkErr) {
      process.stderr.write(
        `[flywheel-ideas] logOutcome orphan-file cleanup failed for ${vault_rel_path}: ${(unlinkErr as Error).message}\n`,
      );
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// undoOutcome — idempotent reversal
// ---------------------------------------------------------------------------

export async function undoOutcome(
  db: IdeasDatabase,
  vault_path: string,
  outcome_id: string,
  now: number = Date.now(),
): Promise<OutcomeUndoResult> {
  const outcome = getOutcome(db, outcome_id);
  if (!outcome) throw new OutcomeNotFoundError(outcome_id);
  if (outcome.undone_at !== null) {
    throw new OutcomeAlreadyUndoneError(outcome_id, outcome.undone_at);
  }

  // Load verdicts BEFORE mutating — we need the assumption set + pre-undo
  // statuses for the status_changes report.
  const verdicts = db
    .prepare(
      `SELECT assumption_id, verdict FROM ideas_outcome_verdicts WHERE outcome_id = ?`,
    )
    .all(outcome_id) as Array<{ assumption_id: string; verdict: string }>;
  const touched = verdicts.map((v) => v.assumption_id);

  const preStatus = new Map<string, string>();
  if (touched.length > 0) {
    const placeholders = touched.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT id, status FROM ideas_assumptions WHERE id IN (${placeholders})`,
      )
      .all(...touched) as Array<{ id: string; status: string }>;
    for (const r of rows) preStatus.set(r.id, r.status);
  }

  const flaggedBefore = touched.length > 0 ? queryCitingIdeas(db, touched.filter((id) =>
    // Only refuted assumptions propagated; include them in the candidate set
    verdicts.find((v) => v.assumption_id === id)?.verdict === 'refuted',
  )) : [];

  const cleared_ideas: string[] = [];

  db.transaction(() => {
    // a. Mark outcome undone
    db.prepare(`UPDATE ideas_outcomes SET undone_at = ? WHERE id = ?`).run(now, outcome_id);

    if (touched.length > 0) {
      const placeholders = touched.map(() => '?').join(',');

      // b. Recompute status + refuted_at for each touched assumption from
      //    remaining non-undone verdicts. This is the gemini-CRITICAL fix.
      //    If still refuted by another non-undone outcome → stay 'refuted'
      //    with refuted_at = MIN(landed_at) of remaining refuters. Else if
      //    validated by a non-undone outcome → 'held'. Else → 'open'.
      db.prepare(
        `UPDATE ideas_assumptions SET
           status = CASE
             WHEN EXISTS (
               SELECT 1 FROM ideas_outcome_verdicts v
               JOIN ideas_outcomes o ON v.outcome_id = o.id
               WHERE v.assumption_id = ideas_assumptions.id
                 AND v.verdict = 'refuted'
                 AND o.undone_at IS NULL
             ) THEN 'refuted'
             WHEN EXISTS (
               SELECT 1 FROM ideas_outcome_verdicts v
               JOIN ideas_outcomes o ON v.outcome_id = o.id
               WHERE v.assumption_id = ideas_assumptions.id
                 AND v.verdict = 'validated'
                 AND o.undone_at IS NULL
             ) THEN 'held'
             ELSE 'open'
           END,
           refuted_at = (
             SELECT MIN(o.landed_at)
               FROM ideas_outcome_verdicts v
               JOIN ideas_outcomes o ON v.outcome_id = o.id
              WHERE v.assumption_id = ideas_assumptions.id
                AND v.verdict = 'refuted'
                AND o.undone_at IS NULL
           )
         WHERE id IN (${placeholders})`,
      ).run(...touched);
    }

    // c. Sticky-refutation for needs_review on previously-flagged ideas.
    //    For each idea that this outcome flagged (flaggedBefore), if NO
    //    non-undone outcome still refutes an assumption it cites → clear to 0.
    if (flaggedBefore.length > 0) {
      const flaggedIds = flaggedBefore
        .map((f) => f.id)
        .filter((id) => id !== outcome.idea_id);

      if (flaggedIds.length > 0) {
        // stillFlagged = subset of flaggedIds that STILL have an active refuted
        // assumption cited via their council views.
        const stillFlagged = queryStillFlagged(db, flaggedIds);

        const toClear = flaggedIds.filter((id) => !stillFlagged.has(id));
        if (toClear.length > 0) {
          const placeholders = toClear.map(() => '?').join(',');
          db.prepare(
            `UPDATE ideas_notes SET needs_review = 0 WHERE id IN (${placeholders})`,
          ).run(...toClear);
          cleared_ideas.push(...toClear);
        }
      }
    }
  })();

  // d. Patch outcome markdown frontmatter (best-effort; DB is authoritative)
  try {
    const { patchFrontmatter } = await import('./write/patch-frontmatter.js');
    await patchFrontmatter(vault_path, outcome.vault_path, {
      undone_at: new Date(now).toISOString(),
    });
  } catch (err) {
    process.stderr.write(
      `[flywheel-ideas] undoOutcome frontmatter patch failed for ${outcome.vault_path}: ${(err as Error).message}\n`,
    );
  }

  // e. Sync assumption frontmatter with recomputed DB status (best-effort)
  await syncAssumptionFrontmatter(db, vault_path, touched);

  // Report status changes
  const status_changes: OutcomeUndoResult['status_changes'] = [];
  if (touched.length > 0) {
    const placeholders = touched.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT id, status FROM ideas_assumptions WHERE id IN (${placeholders})`,
      )
      .all(...touched) as Array<{ id: string; status: string }>;
    for (const r of rows) {
      const from = preStatus.get(r.id) ?? 'unknown';
      if (from !== r.status) {
        status_changes.push({ assumption_id: r.id, from, to: r.status });
      }
    }
  }

  const updated = getOutcome(db, outcome_id);
  if (!updated) throw new Error(`undoOutcome: outcome ${outcome_id} disappeared`);

  return {
    outcome: updated,
    status_changes,
    cleared_ideas,
    write_path: activeWritePath,
  };
}

// ---------------------------------------------------------------------------
// getOutcome / listOutcomes
// ---------------------------------------------------------------------------

export function getOutcome(db: IdeasDatabase, id: string): OutcomeRow | null {
  const row = db
    .prepare(
      `SELECT id, idea_id, text, vault_path, landed_at, undone_at FROM ideas_outcomes WHERE id = ?`,
    )
    .get(id) as OutcomeRow | undefined;
  return row ?? null;
}

export function listOutcomes(
  db: IdeasDatabase,
  vault_path: string,
  options: ListOutcomesOptions = {},
): ListOutcomesResult {
  const limit = options.limit ?? 200;
  const params: unknown[] = [];
  let where = '';
  if (options.idea_id) {
    where = `WHERE idea_id = ?`;
    params.push(options.idea_id);
  }
  params.push(limit);
  const rows = db
    .prepare(
      `SELECT id, idea_id, text, vault_path, landed_at, undone_at FROM ideas_outcomes
       ${where}
       ORDER BY landed_at DESC, id DESC
       LIMIT ?`,
    )
    .all(...params) as OutcomeRow[];

  const { kept, staleSkipped } = filterStaleRows(vault_path, rows, {
    include_stale: options.include_stale,
  });
  return {
    outcomes: kept,
    count: kept.length,
    stale_hidden: staleSkipped,
  };
}

export function forgetOutcome(db: IdeasDatabase, id: string): boolean {
  const info = db.prepare(`DELETE FROM ideas_outcomes WHERE id = ?`).run(id);
  return info.changes > 0;
}

// ---------------------------------------------------------------------------
// Internal: citation-graph queries
// ---------------------------------------------------------------------------

/**
 * Given a list of assumption ids, return ideas whose council session(s) had
 * a view that cited any of those assumptions. Deduplicated by idea id.
 */
function queryCitingIdeas(db: IdeasDatabase, assumption_ids: string[]): FlaggedIdea[] {
  if (assumption_ids.length === 0) return [];
  const placeholders = assumption_ids.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT DISTINCT n.id, n.title, n.vault_path
         FROM ideas_notes n
         JOIN ideas_council_sessions s ON s.idea_id = n.id
         JOIN ideas_council_views v ON v.session_id = s.id
         JOIN ideas_assumption_citations c ON c.view_id = v.id
        WHERE c.assumption_id IN (${placeholders})
        ORDER BY n.id ASC`,
    )
    .all(...assumption_ids) as FlaggedIdea[];
}

/**
 * Subset of candidate_idea_ids that STILL have at least one actively-refuted
 * assumption cited via their council views. Used by undoOutcome to decide
 * which needs_review flags to clear.
 */
function queryStillFlagged(db: IdeasDatabase, candidate_idea_ids: string[]): Set<string> {
  if (candidate_idea_ids.length === 0) return new Set();
  const placeholders = candidate_idea_ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT DISTINCT n.id
         FROM ideas_notes n
         JOIN ideas_council_sessions s ON s.idea_id = n.id
         JOIN ideas_council_views v ON v.session_id = s.id
         JOIN ideas_assumption_citations c ON c.view_id = v.id
         JOIN ideas_assumptions a ON a.id = c.assumption_id
        WHERE a.status = 'refuted'
          AND n.id IN (${placeholders})`,
    )
    .all(...candidate_idea_ids) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

// ---------------------------------------------------------------------------
// Markdown body rendering
// ---------------------------------------------------------------------------

/**
 * Best-effort sync of assumption markdown frontmatter with current DB state.
 * DB is authoritative for status queries; this keeps the vault in rough sync
 * for human readers. Failures are logged to stderr, not thrown — the DB
 * transaction has already committed, so retrying the whole op is worse
 * than stale markdown.
 */
async function syncAssumptionFrontmatter(
  db: IdeasDatabase,
  vault_path: string,
  assumption_ids: string[],
): Promise<void> {
  if (assumption_ids.length === 0) return;
  const { patchFrontmatter } = await import('./write/patch-frontmatter.js');
  const placeholders = assumption_ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, status, refuted_at, vault_path FROM ideas_assumptions WHERE id IN (${placeholders})`,
    )
    .all(...assumption_ids) as Array<{
    id: string;
    status: string;
    refuted_at: number | null;
    vault_path: string;
  }>;
  for (const row of rows) {
    try {
      await patchFrontmatter(vault_path, row.vault_path, {
        status: row.status,
        refuted_at:
          row.refuted_at !== null ? new Date(row.refuted_at).toISOString() : null,
      });
    } catch (err) {
      process.stderr.write(
        `[flywheel-ideas] assumption frontmatter sync failed for ${row.vault_path}: ${(err as Error).message}\n`,
      );
    }
  }
}

function renderOutcomeBody(
  input: OutcomeLogInput,
  refutes: string[],
  validates: string[],
): string {
  const lines = [input.text.trim(), ''];
  if (refutes.length > 0) {
    lines.push('## Refuted assumptions', '');
    for (const id of refutes) lines.push(`- \`${id}\``);
    lines.push('');
  }
  if (validates.length > 0) {
    lines.push('## Validated assumptions', '');
    for (const id of validates) lines.push(`- \`${id}\``);
    lines.push('');
  }
  return lines.join('\n');
}
