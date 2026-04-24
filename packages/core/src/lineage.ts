/**
 * Lineage queries (v0.2 D7) — read-side helpers for cross-idea relationships.
 *
 * Three query shapes per the roadmap-v0-2 Depth-on-the-loop section:
 *
 *  - **ancestry**: ideas this one supersedes (walk the `supersedes` chain
 *    backwards through `ideas_idea_extensions`). Newest-first, capped depth.
 *
 *  - **descendants**: ideas that supersede this one (walk `replaced_by`
 *    forwards). Oldest-first along the chain.
 *
 *  - **shared_assumptions**: other ideas whose council sessions cited the
 *    same assumption(s) as this idea's council sessions. Surfaces the
 *    "you've made this same load-bearing claim across ideas" pattern that
 *    Phase 4 cross-project assumption mapping formalises. For now, exact
 *    assumption-id match (no canonical-assumption layer yet).
 *
 * Pure-DB read functions; no schema impact. Use SQLite recursive CTEs for
 * the chain walks — capped at a safe depth (default 20) so a malformed
 * cycle in the supersession chain doesn't loop forever.
 */

import type { IdeasDatabase } from './db.js';

export interface LineageNode {
  /** idea_id */
  id: string;
  /** Title from ideas_notes (if still present). */
  title: string;
  /** Lifecycle state at query time. */
  state: string;
  /** Vault path of the idea's markdown. */
  vault_path: string;
  /** Chain depth from the queried idea (1=immediate parent/child, 2=grandparent/grandchild, etc). */
  depth: number;
}

export interface SharedAssumptionMatch {
  /** Other idea sharing at least one cited assumption with the input. */
  idea_id: string;
  title: string;
  state: string;
  /** Number of distinct assumption ids this match shares with the input. */
  shared_assumption_count: number;
  /** Up to 5 of the shared assumption ids (sample for the MCP next_steps). */
  shared_assumption_ids_sample: string[];
}

export interface LineageOptions {
  /** Max chain depth to walk. Default 20. */
  max_depth?: number;
}

export interface SharedAssumptionsOptions {
  /** Max matches to return. Default 20. */
  limit?: number;
}

const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_SHARED_LIMIT = 20;
const SAMPLE_SHARED_IDS = 5;

/**
 * Walk the `supersedes` chain backwards from `idea_id`. Returns ancestors
 * in oldest-first order along the chain (immediate parent at depth=1).
 *
 * Includes the immediate idea? No — only ANCESTORS. Caller can fold the
 * input idea in if needed.
 */
export function getAncestry(
  db: IdeasDatabase,
  idea_id: string,
  options: LineageOptions = {},
): LineageNode[] {
  const max_depth = options.max_depth ?? DEFAULT_MAX_DEPTH;
  // SQLite recursive CTE walking ideas_idea_extensions.supersedes pointers.
  // Each step: current.supersedes → parent_id; emit parent if it exists in
  // ideas_notes; cap by depth + max_depth.
  const rows = db
    .prepare(
      `
      WITH RECURSIVE chain(id, depth) AS (
        SELECT supersedes, 1 FROM ideas_idea_extensions WHERE idea_id = ?
        UNION ALL
        SELECT x.supersedes, c.depth + 1
        FROM chain c
        JOIN ideas_idea_extensions x ON x.idea_id = c.id
        WHERE c.id IS NOT NULL AND c.depth < ?
      )
      SELECT n.id, n.title, n.state, n.vault_path, c.depth
      FROM chain c
      JOIN ideas_notes n ON n.id = c.id
      WHERE c.id IS NOT NULL
      ORDER BY c.depth ASC
      `,
    )
    .all(idea_id, max_depth) as LineageNode[];
  return rows;
}

/**
 * Walk the `replaced_by` chain forwards from `idea_id`. Returns descendants
 * in oldest-first chain order (immediate child at depth=1).
 */
export function getDescendants(
  db: IdeasDatabase,
  idea_id: string,
  options: LineageOptions = {},
): LineageNode[] {
  const max_depth = options.max_depth ?? DEFAULT_MAX_DEPTH;
  const rows = db
    .prepare(
      `
      WITH RECURSIVE chain(id, depth) AS (
        SELECT replaced_by, 1 FROM ideas_idea_extensions WHERE idea_id = ?
        UNION ALL
        SELECT x.replaced_by, c.depth + 1
        FROM chain c
        JOIN ideas_idea_extensions x ON x.idea_id = c.id
        WHERE c.id IS NOT NULL AND c.depth < ?
      )
      SELECT n.id, n.title, n.state, n.vault_path, c.depth
      FROM chain c
      JOIN ideas_notes n ON n.id = c.id
      WHERE c.id IS NOT NULL
      ORDER BY c.depth ASC
      `,
    )
    .all(idea_id, max_depth) as LineageNode[];
  return rows;
}

/**
 * Find OTHER ideas whose council sessions cited the same assumption(s) as
 * this idea's council sessions. Excludes the input idea itself.
 *
 * Cross-references via `ideas_assumption_citations` (assumption_id → view_id
 * → session_id → idea_id). Returns matches ordered by descending
 * shared_assumption_count.
 *
 * This is the precursor to Phase 4 cross-project assumption mapping. For
 * now we match by exact assumption_id; canonical-assumption mapping (where
 * "Q3 churn under 5%" in one idea binds to "SMB churn caps growth" in
 * another) lands when canonical assumptions ship.
 */
export function getSharedAssumptions(
  db: IdeasDatabase,
  idea_id: string,
  options: SharedAssumptionsOptions = {},
): SharedAssumptionMatch[] {
  const limit = options.limit ?? DEFAULT_SHARED_LIMIT;

  // Find every assumption_id cited by any council view in any session of THIS idea.
  const myAssumptions = db
    .prepare(
      `
      SELECT DISTINCT ac.assumption_id
      FROM ideas_assumption_citations ac
      JOIN ideas_council_views v ON v.id = ac.view_id
      JOIN ideas_council_sessions s ON s.id = v.session_id
      WHERE s.idea_id = ?
      `,
    )
    .all(idea_id) as Array<{ assumption_id: string }>;

  if (myAssumptions.length === 0) return [];

  const assumptionIds = myAssumptions.map((r) => r.assumption_id);
  const placeholders = assumptionIds.map(() => '?').join(',');

  // Find OTHER ideas whose sessions cited any of those assumption ids.
  const matches = db
    .prepare(
      `
      SELECT s.idea_id, n.title, n.state,
             COUNT(DISTINCT ac.assumption_id) AS shared_count,
             GROUP_CONCAT(DISTINCT ac.assumption_id) AS shared_ids
      FROM ideas_assumption_citations ac
      JOIN ideas_council_views v ON v.id = ac.view_id
      JOIN ideas_council_sessions s ON s.id = v.session_id
      JOIN ideas_notes n ON n.id = s.idea_id
      WHERE ac.assumption_id IN (${placeholders})
        AND s.idea_id != ?
      GROUP BY s.idea_id
      ORDER BY shared_count DESC, n.title ASC
      LIMIT ?
      `,
    )
    .all(...assumptionIds, idea_id, limit) as Array<{
    idea_id: string;
    title: string;
    state: string;
    shared_count: number;
    shared_ids: string;
  }>;

  return matches.map((m) => ({
    idea_id: m.idea_id,
    title: m.title,
    state: m.state,
    shared_assumption_count: m.shared_count,
    shared_assumption_ids_sample: m.shared_ids.split(',').slice(0, SAMPLE_SHARED_IDS),
  }));
}
