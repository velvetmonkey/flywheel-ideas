/**
 * Persistence helpers for the v3 sidecar table `ideas_idea_extensions`.
 *
 * Captures the per-idea fields surfaced by roadmap additions:
 * - `alternatives[]` — ADR-style alternatives ruled out + why
 * - `reversible` — whether this decision is hard to reverse
 * - `supersedes` / `replaced_by` — supersession chain
 * - `reference_class` — base-rate anchor
 * - `context_json` — private, write-once decision-journal context (P2.11)
 *
 * Rows are 1:1 with `ideas_notes` (PK = idea_id, ON DELETE CASCADE). Writes
 * are merge-safe rather than `INSERT OR REPLACE` so new sidecar fields do not
 * accidentally erase sibling fields.
 */

import type { IdeasDatabase } from './db.js';

export interface AlternativeEntry {
  title: string;
  why_rejected: string;
  confidence?: number;
}

export type Reversibility = 'easy' | 'hard' | 'one_way';

export interface IdeaContextInput {
  situational_context?: string;
  mental_or_physical_state?: string;
  expected_outcome?: string;
  review_date?: string;
}

export interface IdeaContext {
  situational_context: string | null;
  mental_or_physical_state: string | null;
  expected_outcome: string | null;
  review_date: string | null;
  alternatives_considered: AlternativeEntry[] | null;
}

export interface IdeaExtensionInput {
  alternatives?: AlternativeEntry[] | null;
  reversible?: Reversibility | null;
  supersedes?: string | null;
  replaced_by?: string | null;
  reference_class?: string | null;
  context?: IdeaContextInput | null;
}

export interface IdeaExtensionRow {
  idea_id: string;
  alternatives: AlternativeEntry[] | null;
  reversible: Reversibility | null;
  supersedes: string | null;
  replaced_by: string | null;
  reference_class: string | null;
  context: IdeaContext | null;
  updated_at: number;
}

interface IdeaExtensionDbRow {
  idea_id: string;
  alternatives_json: string | null;
  reversible: number | null;
  supersedes: string | null;
  replaced_by: string | null;
  reference_class: string | null;
  context_json: string | null;
  updated_at: number;
}

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

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseAlternatives(json: string | null): AlternativeEntry[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as AlternativeEntry[]) : null;
  } catch {
    return null;
  }
}

function parseContext(
  context_json: string | null,
  alternatives: AlternativeEntry[] | null,
): IdeaContext | null {
  let raw: Record<string, unknown> | null = null;
  if (context_json) {
    try {
      const parsed = JSON.parse(context_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        raw = parsed as Record<string, unknown>;
      }
    } catch {
      raw = null;
    }
  }

  const context: IdeaContext = {
    situational_context: normalizeOptionalString(raw?.situational_context),
    mental_or_physical_state: normalizeOptionalString(raw?.mental_or_physical_state),
    expected_outcome: normalizeOptionalString(raw?.expected_outcome),
    review_date: normalizeOptionalString(raw?.review_date),
    alternatives_considered: alternatives,
  };

  if (
    context.situational_context === null &&
    context.mental_or_physical_state === null &&
    context.expected_outcome === null &&
    context.review_date === null &&
    context.alternatives_considered === null
  ) {
    return null;
  }

  return context;
}

function encodeContext(context: IdeaContextInput | null | undefined): string | null | undefined {
  if (context === undefined) return undefined;
  if (context === null) return null;
  return JSON.stringify({
    situational_context: context.situational_context ?? null,
    mental_or_physical_state: context.mental_or_physical_state ?? null,
    expected_outcome: context.expected_outcome ?? null,
    review_date: context.review_date ?? null,
  });
}

function decodeIdeaExtensionRow(row: IdeaExtensionDbRow): IdeaExtensionRow {
  const alternatives = parseAlternatives(row.alternatives_json);
  return {
    idea_id: row.idea_id,
    alternatives,
    reversible: decodeReversible(row.reversible),
    supersedes: row.supersedes,
    replaced_by: row.replaced_by,
    reference_class: row.reference_class,
    context: parseContext(row.context_json, alternatives),
    updated_at: row.updated_at,
  };
}

function getIdeaExtensionDbRow(db: IdeasDatabase, idea_id: string): IdeaExtensionDbRow | null {
  const row = db
    .prepare(
      `SELECT idea_id, alternatives_json, reversible, supersedes, replaced_by, reference_class, context_json, updated_at
       FROM ideas_idea_extensions WHERE idea_id = ?`,
    )
    .get(idea_id) as IdeaExtensionDbRow | undefined;
  return row ?? null;
}

export function setIdeaExtension(
  db: IdeasDatabase,
  idea_id: string,
  input: IdeaExtensionInput,
  updated_at: number = Date.now(),
): void {
  const existing = getIdeaExtensionDbRow(db, idea_id);
  const alternatives_json =
    input.alternatives === undefined
      ? existing?.alternatives_json ?? null
      : input.alternatives === null
        ? null
        : JSON.stringify(input.alternatives);
  const reversible =
    input.reversible === undefined
      ? existing?.reversible ?? null
      : encodeReversible(input.reversible);
  const supersedes = input.supersedes === undefined ? existing?.supersedes ?? null : input.supersedes;
  const replaced_by =
    input.replaced_by === undefined ? existing?.replaced_by ?? null : input.replaced_by;
  const reference_class =
    input.reference_class === undefined
      ? existing?.reference_class ?? null
      : input.reference_class;
  const context_json =
    encodeContext(input.context) === undefined
      ? existing?.context_json ?? null
      : (encodeContext(input.context) ?? null);

  db.prepare(
    `INSERT INTO ideas_idea_extensions
       (idea_id, alternatives_json, reversible, supersedes, replaced_by, reference_class, context_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(idea_id) DO UPDATE SET
       alternatives_json = excluded.alternatives_json,
       reversible = excluded.reversible,
       supersedes = excluded.supersedes,
       replaced_by = excluded.replaced_by,
       reference_class = excluded.reference_class,
       context_json = excluded.context_json,
       updated_at = excluded.updated_at`,
  ).run(
    idea_id,
    alternatives_json,
    reversible,
    supersedes ?? null,
    replaced_by ?? null,
    reference_class ?? null,
    context_json,
    updated_at,
  );
}

export function getIdeaExtension(
  db: IdeasDatabase,
  idea_id: string,
): IdeaExtensionRow | null {
  const row = getIdeaExtensionDbRow(db, idea_id);
  if (!row) return null;
  return decodeIdeaExtensionRow(row);
}

export function getIdeaContext(
  db: IdeasDatabase,
  idea_id: string,
): IdeaContext | null {
  return getIdeaExtension(db, idea_id)?.context ?? null;
}

export function clearIdeaExtension(db: IdeasDatabase, idea_id: string): void {
  db.prepare('DELETE FROM ideas_idea_extensions WHERE idea_id = ?').run(idea_id);
}
