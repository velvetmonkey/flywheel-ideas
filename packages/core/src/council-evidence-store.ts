/**
 * Persistence helpers for the v2 sidecar table `ideas_council_evidence`.
 *
 * The retrieval-native council input keystone (v0.2) records, per session,
 * the vault sources that informed every cell's prompt. This is the "show your
 * work" surface — users can audit which vault notes shaped a council session.
 *
 * Strictly append-only. One row per `ideas_council_sessions` row (1:1 by
 * session_id PK + FK with ON DELETE CASCADE). Sessions that ran without
 * evidence (reader unavailable, idea had no vault matches) simply have no
 * row here.
 */

import type { IdeasDatabase } from './db.js';

/**
 * One source surfaced to a council cell. `kind` identifies which
 * flywheel-memory tool produced it (search / memory_brief / graph_backlinks /
 * assumption_search). `score` is the flywheel-memory hybrid confidence_score
 * when applicable.
 */
export interface EvidenceSource {
  kind: 'search' | 'memory_brief' | 'graph_backlinks' | 'assumption_search';
  path: string;
  score?: number;
}

export interface EvidenceRow {
  session_id: string;
  sources: EvidenceSource[];
  retrieved_at: number;
}

/**
 * Insert the evidence sources for a given view. Idempotent on session_id (PK).
 * Throws on FK violation if the view doesn't exist — caller is responsible
 * for ordering: persistCouncilView first, then recordEvidenceSources.
 */
export function recordEvidenceSources(
  db: IdeasDatabase,
  session_id: string,
  sources: EvidenceSource[],
  retrieved_at: number = Date.now(),
): void {
  db.prepare(
    `INSERT OR REPLACE INTO ideas_council_evidence (session_id, sources_json, retrieved_at)
     VALUES (?, ?, ?)`,
  ).run(session_id, JSON.stringify(sources), retrieved_at);
}

/** Read the evidence row for a view. Returns null if no row exists. */
export function getEvidenceSources(
  db: IdeasDatabase,
  session_id: string,
): EvidenceRow | null {
  const row = db
    .prepare(
      `SELECT session_id, sources_json, retrieved_at
       FROM ideas_council_evidence WHERE session_id = ?`,
    )
    .get(session_id) as
    | { session_id: string; sources_json: string; retrieved_at: number }
    | undefined;
  if (!row) return null;
  let sources: EvidenceSource[];
  try {
    const parsed = JSON.parse(row.sources_json);
    sources = Array.isArray(parsed) ? (parsed as EvidenceSource[]) : [];
  } catch {
    // Defensive — malformed JSON in the DB shouldn't crash the reader.
    sources = [];
  }
  return {
    session_id: row.session_id,
    sources,
    retrieved_at: row.retrieved_at,
  };
}
