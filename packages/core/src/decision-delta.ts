/**
 * decision_delta — pure-function diff between two council sessions for the
 * same idea (v0.2 D6 from roadmap-v0-2 "Depth on the loop").
 *
 * Compares cells pairwise by persona + CLI. For each pair:
 *  - confidence delta
 *  - stance text similarity (Jaccard over the existing tokenize/splitSentences)
 *  - key_risks added / removed
 *  - fragile_insights added / removed
 *  - whether the failure_reason changed
 *
 * Aggregate summary surfaces the headline numbers — average confidence
 * delta, personas with significant shift (|Δconfidence| > 0.3), counts of
 * new/dropped risks. Useful for "what changed since the last council run?"
 * — the question the external reviewer flagged as more useful than abstract
 * disagreement metrics.
 *
 * Read-only over existing tables (`ideas_council_sessions`, `ideas_council_views`).
 * No schema impact.
 */

import type { IdeasDatabase } from './db.js';
import { jaccard, tokenize } from './council-overlap.js';

export interface DeltaCellRow {
  persona: string;
  cli: string;
  /** Confidence in the FROM session. Null if the cell was missing or failed. */
  confidence_from: number | null;
  /** Confidence in the TO session. Null if the cell was missing or failed. */
  confidence_to: number | null;
  /** confidence_to - confidence_from. Null when either side is null. */
  confidence_delta: number | null;
  /** Jaccard similarity of tokenised stance text. 1=identical, 0=disjoint. Null when either stance is missing. */
  stance_jaccard: number | null;
  key_risks_added: string[];
  key_risks_removed: string[];
  fragile_insights_added: string[];
  fragile_insights_removed: string[];
  /** True when the cell's failure_reason changed between sessions (incl. null↔non-null). */
  failure_changed: boolean;
  /** When non-null, indicates the cell only exists in one session. */
  side_only?: 'from' | 'to';
}

export interface DecisionDeltaSummary {
  /** Mean of cell confidence_deltas (skipping nulls). Null when no comparable cells. */
  avg_confidence_delta: number | null;
  /** Persona ids whose |Δconfidence| > significant_shift_threshold (default 0.3). */
  personas_with_significant_shift: string[];
  /** Total count of risks newly mentioned in TO that weren't in FROM. */
  new_risks_count: number;
  /** Total count of risks dropped from FROM that aren't in TO. */
  dropped_risks_count: number;
  /** Cells that changed failure status (e.g. failed → succeeded or vice versa). */
  failure_status_changes: number;
}

export interface DecisionDelta {
  idea_id: string;
  from_session_id: string;
  to_session_id: string;
  cells: DeltaCellRow[];
  summary: DecisionDeltaSummary;
}

export interface ComputeDeltaOptions {
  /** |Δconfidence| above this counts as a significant shift. Default 0.3. */
  significant_shift_threshold?: number;
}

interface CellRow {
  persona: string;
  model: string; // CLI name
  stance: string | null;
  confidence: number | null;
  failure_reason: string | null;
}

interface SessionRow {
  id: string;
  idea_id: string;
}

export class DeltaInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeltaInputError';
  }
}

/**
 * Compute the structured diff between two council sessions belonging to the
 * same idea. Throws DeltaInputError when sessions are missing or belong to
 * different ideas.
 */
export function computeDecisionDelta(
  db: IdeasDatabase,
  idea_id: string,
  from_session_id: string,
  to_session_id: string,
  options: ComputeDeltaOptions = {},
): DecisionDelta {
  const threshold = options.significant_shift_threshold ?? 0.3;

  if (from_session_id === to_session_id) {
    throw new DeltaInputError('from_session_id and to_session_id must differ');
  }

  const fromSession = db
    .prepare('SELECT id, idea_id FROM ideas_council_sessions WHERE id = ?')
    .get(from_session_id) as SessionRow | undefined;
  const toSession = db
    .prepare('SELECT id, idea_id FROM ideas_council_sessions WHERE id = ?')
    .get(to_session_id) as SessionRow | undefined;

  if (!fromSession) throw new DeltaInputError(`from_session_id not found: ${from_session_id}`);
  if (!toSession) throw new DeltaInputError(`to_session_id not found: ${to_session_id}`);
  if (fromSession.idea_id !== idea_id) {
    throw new DeltaInputError(
      `from_session ${from_session_id} belongs to idea ${fromSession.idea_id}, not ${idea_id}`,
    );
  }
  if (toSession.idea_id !== idea_id) {
    throw new DeltaInputError(
      `to_session ${to_session_id} belongs to idea ${toSession.idea_id}, not ${idea_id}`,
    );
  }

  const fromCells = db
    .prepare(
      `SELECT persona, model, stance, confidence, failure_reason
       FROM ideas_council_views WHERE session_id = ?`,
    )
    .all(from_session_id) as CellRow[];

  const toCells = db
    .prepare(
      `SELECT persona, model, stance, confidence, failure_reason
       FROM ideas_council_views WHERE session_id = ?`,
    )
    .all(to_session_id) as CellRow[];

  // Pair by (persona, model). Build a lookup map for the to-side.
  const toMap = new Map<string, CellRow>();
  for (const c of toCells) {
    toMap.set(`${c.persona}::${c.model}`, c);
  }

  const cells: DeltaCellRow[] = [];

  // First pass — for every from-cell, build a delta row (paired or from-only).
  for (const fromC of fromCells) {
    const key = `${fromC.persona}::${fromC.model}`;
    const toC = toMap.get(key);
    if (toC) {
      cells.push(buildPaired(fromC, toC));
      toMap.delete(key); // mark as consumed
    } else {
      cells.push(buildSingleSide(fromC, 'from'));
    }
  }

  // Remaining toMap entries are to-only cells.
  for (const toC of toMap.values()) {
    cells.push(buildSingleSide(toC, 'to'));
  }

  // Sort: paired cells first (by persona then cli), then from-only, then to-only.
  cells.sort((a, b) => {
    const sideRank = (c: DeltaCellRow) => (c.side_only === undefined ? 0 : c.side_only === 'from' ? 1 : 2);
    const sideDiff = sideRank(a) - sideRank(b);
    if (sideDiff !== 0) return sideDiff;
    if (a.persona !== b.persona) return a.persona.localeCompare(b.persona);
    return a.cli.localeCompare(b.cli);
  });

  const summary = computeSummary(cells, threshold);

  return {
    idea_id,
    from_session_id,
    to_session_id,
    cells,
    summary,
  };
}

function buildPaired(fromC: CellRow, toC: CellRow): DeltaCellRow {
  const confidence_delta =
    fromC.confidence !== null && toC.confidence !== null ? toC.confidence - fromC.confidence : null;

  const stance_jaccard =
    fromC.stance && toC.stance
      ? jaccard(new Set(tokenize(fromC.stance)), new Set(tokenize(toC.stance)))
      : null;

  const fromRisks = parseStringArray(fromC, 'key_risks');
  const toRisks = parseStringArray(toC, 'key_risks');
  const fromInsights = parseStringArray(fromC, 'fragile_insights');
  const toInsights = parseStringArray(toC, 'fragile_insights');

  return {
    persona: fromC.persona,
    cli: fromC.model,
    confidence_from: fromC.confidence,
    confidence_to: toC.confidence,
    confidence_delta,
    stance_jaccard,
    key_risks_added: setDiff(toRisks, fromRisks),
    key_risks_removed: setDiff(fromRisks, toRisks),
    fragile_insights_added: setDiff(toInsights, fromInsights),
    fragile_insights_removed: setDiff(fromInsights, toInsights),
    failure_changed: fromC.failure_reason !== toC.failure_reason,
  };
}

function buildSingleSide(c: CellRow, side: 'from' | 'to'): DeltaCellRow {
  const risks = parseStringArray(c, 'key_risks');
  const insights = parseStringArray(c, 'fragile_insights');
  return {
    persona: c.persona,
    cli: c.model,
    confidence_from: side === 'from' ? c.confidence : null,
    confidence_to: side === 'to' ? c.confidence : null,
    confidence_delta: null,
    stance_jaccard: null,
    key_risks_added: side === 'to' ? risks : [],
    key_risks_removed: side === 'from' ? risks : [],
    fragile_insights_added: side === 'to' ? insights : [],
    fragile_insights_removed: side === 'from' ? insights : [],
    failure_changed: c.failure_reason !== null,
    side_only: side,
  };
}

/**
 * Pull a string-array field (key_risks / fragile_insights) out of a cell row
 * by re-parsing the persisted view-content frontmatter or stance JSON.
 *
 * The current view rows store stance as a free-form text body — the
 * structured fields (key_risks, fragile_insights) are persisted only on the
 * disk markdown via the synthesis writer, not directly in the DB row. To
 * keep this read pure-DB without fs round-trips, we attempt to parse the
 * stance text as JSON and pull arrays from it; if it isn't JSON (free-form
 * text), we return [].
 *
 * If a future schema bump promotes key_risks/fragile_insights to dedicated
 * columns, swap this for direct field reads.
 */
function parseStringArray(c: CellRow, field: 'key_risks' | 'fragile_insights'): string[] {
  if (!c.stance) return [];
  try {
    const parsed = JSON.parse(c.stance);
    if (parsed && typeof parsed === 'object') {
      const arr = (parsed as Record<string, unknown>)[field];
      if (Array.isArray(arr) && arr.every((s) => typeof s === 'string')) {
        return arr as string[];
      }
    }
  } catch {
    /* non-JSON stance — return empty */
  }
  return [];
}

function setDiff(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return a.filter((x) => !bSet.has(x));
}

function computeSummary(cells: DeltaCellRow[], threshold: number): DecisionDeltaSummary {
  const deltas = cells
    .map((c) => c.confidence_delta)
    .filter((d): d is number => d !== null);
  const avg_confidence_delta =
    deltas.length === 0 ? null : deltas.reduce((s, d) => s + d, 0) / deltas.length;

  const personas_with_significant_shift = Array.from(
    new Set(
      cells
        .filter((c) => c.confidence_delta !== null && Math.abs(c.confidence_delta) > threshold)
        .map((c) => c.persona),
    ),
  );

  const new_risks_count = cells.reduce((s, c) => s + c.key_risks_added.length, 0);
  const dropped_risks_count = cells.reduce((s, c) => s + c.key_risks_removed.length, 0);
  const failure_status_changes = cells.filter((c) => c.failure_changed).length;

  return {
    avg_confidence_delta,
    personas_with_significant_shift,
    new_risks_count,
    dropped_risks_count,
    failure_status_changes,
  };
}
