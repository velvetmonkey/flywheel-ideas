/**
 * Persistence helpers for the v3 sidecar table `ideas_idea_extensions`.
 *
 * Captures the per-idea fields surfaced by the Apr 24 2026 roadmap addition:
 * - `alternatives[]` — ADR-style alternatives ruled out + why
 * - `reversible` — whether this decision is hard to reverse (ADR pattern)
 * - `supersedes` / `replaced_by` — supersession chain across idea iterations
 * - `reference_class` — Good-Judgment base-rate identification (e.g. the
 *   class of comparable historical decisions to anchor the base rate against)
 *
 * Strictly opt-in. v0.1 / v0.2.0-alpha.1 ideas have no extension row — the
 * helpers return `null` for unset ideas. Callers that don't care about the
 * enrichment never need to touch this module.
 *
 * 1:1 with `ideas_notes` (PK = idea_id, ON DELETE CASCADE). INSERT OR REPLACE
 * semantics so re-setting the extension is a single round-trip.
 */

import type { IdeasDatabase } from './db.js';

/**
 * One alternative considered when making the decision. ADR pattern: surface
 * what was ruled out so future-you can audit the reasoning. `why_rejected`
 * is the load-bearing field — alternatives without rejection rationale are
 * useless for later learning.
 */
export interface AlternativeEntry {
  title: string;
  why_rejected: string;
  /** Optional: rough confidence the rejection was correct (0-1). */
  confidence?: number;
}

/** Reversibility classification per ADR convention. */
export type Reversibility = 'easy' | 'hard' | 'one_way';

export interface IdeaExtensionInput {
  alternatives?: AlternativeEntry[];
  reversible?: Reversibility | null;
  supersedes?: string | null; // idea_id this replaces
  replaced_by?: string | null; // idea_id that replaces this (forward pointer)
  reference_class?: string | null;
}

export interface IdeaExtensionRow {
  idea_id: string;
  alternatives: AlternativeEntry[] | null;
  reversible: Reversibility | null;
  supersedes: string | null;
  replaced_by: string | null;
  reference_class: string | null;
  updated_at: number;
}

/**
 * Map our type-level `Reversibility` to the INTEGER column. `null` → null.
 * Encoding: 0 = easy, 1 = hard, 2 = one_way. Choice of integer instead of
 * TEXT is for cheap range queries ("show me all hard-or-one-way decisions").
 */
function encodeReversible(r: Reversibility | null | undefined): number | null {
  if (r === undefined || r === null) return null;
  if (r === 'easy') return 0;
  if (r === 'hard') return 1;
  return 2;
}

function decodeReversible(n: number | null): Reversibility | null {
  if (n === null) return null;
  if (n === 0) return 'easy';
  if (n === 1) return 'hard';
  return 'one_way';
}

/**
 * Insert or replace the extension row for `idea_id`. Throws on FK violation
 * if the parent idea doesn't exist (caller responsibility — usually safe
 * since callers chain off idea.create / idea.read).
 */
export function setIdeaExtension(
  db: IdeasDatabase,
  idea_id: string,
  input: IdeaExtensionInput,
  updated_at: number = Date.now(),
): void {
  const alternatives_json =
    input.alternatives === undefined ? null : JSON.stringify(input.alternatives);
  db.prepare(
    `INSERT OR REPLACE INTO ideas_idea_extensions
       (idea_id, alternatives_json, reversible, supersedes, replaced_by, reference_class, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    idea_id,
    alternatives_json,
    encodeReversible(input.reversible),
    input.supersedes ?? null,
    input.replaced_by ?? null,
    input.reference_class ?? null,
    updated_at,
  );
}

/** Read the extension row for `idea_id`. Returns null if no row exists. */
export function getIdeaExtension(
  db: IdeasDatabase,
  idea_id: string,
): IdeaExtensionRow | null {
  const row = db
    .prepare(
      `SELECT idea_id, alternatives_json, reversible, supersedes, replaced_by, reference_class, updated_at
       FROM ideas_idea_extensions WHERE idea_id = ?`,
    )
    .get(idea_id) as
    | {
        idea_id: string;
        alternatives_json: string | null;
        reversible: number | null;
        supersedes: string | null;
        replaced_by: string | null;
        reference_class: string | null;
        updated_at: number;
      }
    | undefined;
  if (!row) return null;
  let alternatives: AlternativeEntry[] | null = null;
  if (row.alternatives_json) {
    try {
      const parsed = JSON.parse(row.alternatives_json);
      alternatives = Array.isArray(parsed) ? (parsed as AlternativeEntry[]) : null;
    } catch {
      alternatives = null;
    }
  }
  return {
    idea_id: row.idea_id,
    alternatives,
    reversible: decodeReversible(row.reversible),
    supersedes: row.supersedes,
    replaced_by: row.replaced_by,
    reference_class: row.reference_class,
    updated_at: row.updated_at,
  };
}

/** Hard-delete the extension row. The parent idea is untouched. */
export function clearIdeaExtension(db: IdeasDatabase, idea_id: string): void {
  db.prepare('DELETE FROM ideas_idea_extensions WHERE idea_id = ?').run(idea_id);
}
