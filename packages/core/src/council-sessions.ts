/**
 * DB helpers for `ideas_council_sessions` + `ideas_council_views` (M8).
 *
 * M8 writes single-pass views (initial_stance + self_critique stay null;
 * M9's two-pass fills them). `listSessionsByIdea` uses `started_at DESC, id DESC`
 * ordering — the id tiebreaker addresses the ORDER BY stability gotcha called
 * out in exploration.
 */

import type { IdeasDatabase } from './db.js';
import {
  generateCouncilSessionId,
  generateCouncilViewId,
} from './ids.js';
import type { FailureReason } from './cli-errors.js';

export interface CreateSessionInput {
  idea_id: string;
  depth: 'light' | 'full';
  mode: 'standard' | 'pre_mortem';
}

export interface CouncilSessionRow {
  id: string;
  idea_id: string;
  depth: string;
  mode: string;
  started_at: number;
  completed_at: number | null;
  synthesis_vault_path: string | null;
}

export interface CouncilViewRow {
  id: string;
  session_id: string;
  model: string;
  persona: string;
  prompt_version: string;
  persona_version: string;
  model_version: string | null;
  input_hash: string;
  initial_stance: string | null;
  stance: string | null;
  self_critique: string | null;
  confidence: number | null;
  content_vault_path: string;
  failure_reason: FailureReason | null;
  stderr_tail: string | null;
}

export function createCouncilSession(
  db: IdeasDatabase,
  input: CreateSessionInput,
): { id: string; started_at: number } {
  const id = generateCouncilSessionId();
  const started_at = Date.now();
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path)
     VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
  ).run(id, input.idea_id, input.depth, input.mode, started_at);
  return { id, started_at };
}

export function completeCouncilSession(
  db: IdeasDatabase,
  session_id: string,
  options: { synthesis_vault_path?: string | null; completed_at?: number } = {},
): void {
  const completed_at = options.completed_at ?? Date.now();
  const synthesis = options.synthesis_vault_path ?? null;
  db.prepare(
    `UPDATE ideas_council_sessions
        SET completed_at = ?, synthesis_vault_path = ?
      WHERE id = ?`,
  ).run(completed_at, synthesis, session_id);
}

export function getCouncilSession(
  db: IdeasDatabase,
  id: string,
): CouncilSessionRow | null {
  const row = db
    .prepare(
      `SELECT id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path
         FROM ideas_council_sessions WHERE id = ?`,
    )
    .get(id) as CouncilSessionRow | undefined;
  return row ?? null;
}

export function listSessionsByIdea(
  db: IdeasDatabase,
  idea_id: string,
  options: { limit?: number } = {},
): CouncilSessionRow[] {
  const limit = options.limit ?? 50;
  return db
    .prepare(
      `SELECT id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path
         FROM ideas_council_sessions
        WHERE idea_id = ?
        ORDER BY started_at DESC, id DESC
        LIMIT ?`,
    )
    .all(idea_id, limit) as CouncilSessionRow[];
}

export interface PersistCouncilViewInput {
  session_id: string;
  model: string;
  persona: string;
  prompt_version: string;
  persona_version: string;
  model_version: string | null;
  input_hash: string;
  initial_stance: string | null;
  stance: string | null;
  self_critique: string | null;
  confidence: number | null;
  content_vault_path: string;
  failure_reason: FailureReason | null;
  stderr_tail: string | null;
}

export function persistCouncilView(
  db: IdeasDatabase,
  input: PersistCouncilViewInput,
): { id: string } {
  const id = generateCouncilViewId();
  db.prepare(
    `INSERT INTO ideas_council_views (
       id, session_id, model, persona,
       prompt_version, persona_version, model_version,
       input_hash,
       initial_stance, stance, self_critique,
       confidence,
       content_vault_path,
       failure_reason, stderr_tail
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.session_id,
    input.model,
    input.persona,
    input.prompt_version,
    input.persona_version,
    input.model_version,
    input.input_hash,
    input.initial_stance,
    input.stance,
    input.self_critique,
    input.confidence,
    input.content_vault_path,
    input.failure_reason,
    input.stderr_tail,
  );
  return { id };
}

export function listViewsBySession(
  db: IdeasDatabase,
  session_id: string,
): CouncilViewRow[] {
  return db
    .prepare(
      `SELECT id, session_id, model, persona,
              prompt_version, persona_version, model_version,
              input_hash,
              initial_stance, stance, self_critique,
              confidence,
              content_vault_path,
              failure_reason, stderr_tail
         FROM ideas_council_views
        WHERE session_id = ?
        ORDER BY rowid ASC`,
    )
    .all(session_id) as CouncilViewRow[];
}

/**
 * Insert (view_id, assumption_id) rows. Silently skips assumption IDs that
 * aren't present in `ideas_assumptions` — keeps the dispatcher resilient to
 * a model citing a malformed/hallucinated id.
 *
 * Idempotent: the primary key is (view_id, assumption_id), so calling with the
 * same pair twice is a no-op thanks to `INSERT OR IGNORE`.
 */
export function insertAssumptionCitations(
  db: IdeasDatabase,
  view_id: string,
  assumption_ids: string[],
): { inserted: number; skipped: number } {
  if (assumption_ids.length === 0) return { inserted: 0, skipped: 0 };

  const existing = db
    .prepare(
      `SELECT id FROM ideas_assumptions WHERE id IN (${assumption_ids.map(() => '?').join(',')})`,
    )
    .all(...assumption_ids) as Array<{ id: string }>;
  const existingSet = new Set(existing.map((r) => r.id));

  const insert = db.prepare(
    `INSERT OR IGNORE INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
  );

  let inserted = 0;
  let skipped = 0;
  for (const asm_id of assumption_ids) {
    if (!existingSet.has(asm_id)) {
      skipped++;
      continue;
    }
    const info = insert.run(view_id, asm_id);
    if (info.changes > 0) inserted++;
  }
  return { inserted, skipped };
}
