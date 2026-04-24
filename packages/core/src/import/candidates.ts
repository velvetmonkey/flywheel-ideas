/**
 * CRUD over `ideas_import_sources` + `ideas_import_candidates`.
 *
 * Strictly DB-only — no vault writes, no subprocess. Dedup and write-through
 * live in their own modules so this file stays mechanical and easy to reason
 * about under schema-migration changes.
 */

import type { IdeasDatabase } from '../db.js';
import { generateImportCandidateId, generateImportSourceId } from '../ids.js';
import type { CandidateKind, CandidateState, RawCandidate } from './adapter.js';

export interface ImportSourceRow {
  id: string;
  adapter: string;
  source_uri: string;
  scan_config_json: string | null;
  scanned_at: number;
}

export interface ImportCandidateRow {
  id: string;
  source_id: string;
  adapter: string;
  candidate_kind: CandidateKind;
  title: string;
  body_md: string;
  extracted_fields_json: string | null;
  confidence: number;
  source_uri: string;
  dedup_match_path: string | null;
  dedup_match_score: number | null;
  state: CandidateState;
  target_idea_id: string | null;
  scanned_at: number;
  imported_at: number | null;
  imported_vault_path: string | null;
  imported_entity_id: string | null;
}

export interface CreateImportSourceInput {
  adapter: string;
  source_uri: string;
  scan_config?: Record<string, unknown>;
  scanned_at?: number;
}

export function createImportSource(
  db: IdeasDatabase,
  input: CreateImportSourceInput,
): ImportSourceRow {
  const id = generateImportSourceId();
  const now = input.scanned_at ?? Date.now();
  const config = input.scan_config ? JSON.stringify(input.scan_config) : null;
  db.prepare(
    `INSERT INTO ideas_import_sources (id, adapter, source_uri, scan_config_json, scanned_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.adapter, input.source_uri, config, now);
  return {
    id,
    adapter: input.adapter,
    source_uri: input.source_uri,
    scan_config_json: config,
    scanned_at: now,
  };
}

export interface PersistCandidateInput {
  source_id: string;
  adapter: string;
  candidate: RawCandidate;
  target_idea_id?: string;
  dedup_match_path?: string;
  dedup_match_score?: number;
  state?: CandidateState;
  scanned_at?: number;
}

export function persistCandidate(
  db: IdeasDatabase,
  input: PersistCandidateInput,
): ImportCandidateRow {
  const id = generateImportCandidateId();
  const now = input.scanned_at ?? Date.now();
  const state: CandidateState = input.state ?? 'pending';
  const extracted = input.candidate.extractedFields
    ? JSON.stringify(input.candidate.extractedFields)
    : null;
  db.prepare(
    `INSERT INTO ideas_import_candidates (
       id, source_id, adapter, candidate_kind, title, body_md,
       extracted_fields_json, confidence, source_uri,
       dedup_match_path, dedup_match_score, state, target_idea_id,
       scanned_at, imported_at, imported_vault_path, imported_entity_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
  ).run(
    id,
    input.source_id,
    input.adapter,
    input.candidate.kind,
    input.candidate.title,
    input.candidate.bodyMd,
    extracted,
    input.candidate.confidence,
    input.candidate.sourceUri,
    input.dedup_match_path ?? null,
    input.dedup_match_score ?? null,
    state,
    input.target_idea_id ?? null,
    now,
  );
  return {
    id,
    source_id: input.source_id,
    adapter: input.adapter,
    candidate_kind: input.candidate.kind,
    title: input.candidate.title,
    body_md: input.candidate.bodyMd,
    extracted_fields_json: extracted,
    confidence: input.candidate.confidence,
    source_uri: input.candidate.sourceUri,
    dedup_match_path: input.dedup_match_path ?? null,
    dedup_match_score: input.dedup_match_score ?? null,
    state,
    target_idea_id: input.target_idea_id ?? null,
    scanned_at: now,
    imported_at: null,
    imported_vault_path: null,
    imported_entity_id: null,
  };
}

export function getCandidate(
  db: IdeasDatabase,
  id: string,
): ImportCandidateRow | null {
  const row = db
    .prepare(`SELECT * FROM ideas_import_candidates WHERE id = ?`)
    .get(id) as ImportCandidateRow | undefined;
  return row ?? null;
}

export function getImportSource(
  db: IdeasDatabase,
  id: string,
): ImportSourceRow | null {
  const row = db
    .prepare(`SELECT * FROM ideas_import_sources WHERE id = ?`)
    .get(id) as ImportSourceRow | undefined;
  return row ?? null;
}

export interface ListCandidatesOptions {
  source_id?: string;
  state?: CandidateState;
  candidate_kind?: CandidateKind;
  target_idea_id?: string;
  limit?: number;
}

export function listCandidates(
  db: IdeasDatabase,
  options: ListCandidatesOptions = {},
): ImportCandidateRow[] {
  const clauses: string[] = [];
  const params: Array<string | number> = [];
  if (options.source_id) {
    clauses.push('source_id = ?');
    params.push(options.source_id);
  }
  if (options.state) {
    clauses.push('state = ?');
    params.push(options.state);
  }
  if (options.candidate_kind) {
    clauses.push('candidate_kind = ?');
    params.push(options.candidate_kind);
  }
  if (options.target_idea_id) {
    clauses.push('target_idea_id = ?');
    params.push(options.target_idea_id);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = options.limit ?? 200;
  const sql = `
    SELECT * FROM ideas_import_candidates
    ${where}
    ORDER BY scanned_at DESC
    LIMIT ?
  `;
  return db.prepare(sql).all(...params, limit) as ImportCandidateRow[];
}

export interface MarkImportedInput {
  id: string;
  imported_vault_path: string;
  imported_entity_id: string;
  imported_at?: number;
}

export function markCandidateImported(
  db: IdeasDatabase,
  input: MarkImportedInput,
): void {
  const now = input.imported_at ?? Date.now();
  const res = db
    .prepare(
      `UPDATE ideas_import_candidates
         SET state = 'imported',
             imported_at = ?,
             imported_vault_path = ?,
             imported_entity_id = ?
       WHERE id = ? AND state IN ('pending', 'duplicate')`,
    )
    .run(now, input.imported_vault_path, input.imported_entity_id, input.id);
  if (res.changes === 0) {
    throw new CandidateStateError(
      `candidate ${input.id} is not pending/duplicate (may already be imported or rejected)`,
    );
  }
}

export function markCandidateRejected(db: IdeasDatabase, id: string): void {
  const res = db
    .prepare(
      `UPDATE ideas_import_candidates
         SET state = 'rejected'
       WHERE id = ? AND state IN ('pending', 'duplicate')`,
    )
    .run(id);
  if (res.changes === 0) {
    throw new CandidateStateError(
      `candidate ${id} is not pending/duplicate`,
    );
  }
}

export class CandidateStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateStateError';
  }
}

export function parseExtractedFields(
  row: Pick<ImportCandidateRow, 'extracted_fields_json'>,
): Record<string, unknown> | null {
  if (!row.extracted_fields_json) return null;
  try {
    const parsed = JSON.parse(row.extracted_fields_json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
