/**
 * Persistence helpers for the v3 sidecar table `ideas_assumption_extensions`.
 *
 * Captures the per-assumption fields surfaced by the Apr 24 2026 roadmap
 * additions:
 *
 * - `base_rate` / `go_threshold` / `kill_threshold` — Good-Judgment-style
 *   reference-class anchoring + Metaculus-style structured probability
 *   thresholds. Lets outcomes classify into validated / refuted /
 *   inconclusive / guardrail_breach instead of binary.
 *
 * - `predicted_metric` / `threshold_value` / `threshold_direction` —
 *   Amplitude experiment-goal pattern. Falsifiable-metric assumptions: the
 *   assumption commits to a measurable claim, which makes outcome-time
 *   adjudication mechanical.
 *
 * - `mapping_json` — the seven structured-field map from the
 *   Cross-project assumption mapping section: `{segment, context, claim,
 *   mechanism, metric, threshold, horizon_ms}`. Stored as JSON rather than
 *   flat columns — Phase 1 only needs to STORE; Phase 4 cross-project
 *   propagation may reshape into flat columns later.
 *
 * Strictly opt-in. v0.1 / v0.2.0-alpha.1 assumptions have no extension row.
 *
 * 1:1 with `ideas_assumptions` (PK = assumption_id, ON DELETE CASCADE).
 * INSERT OR REPLACE semantics.
 */

import type { IdeasDatabase } from './db.js';

export type ThresholdDirection = 'up' | 'down' | 'equal';

/**
 * The seven structured fields per the Cross-project assumption mapping
 * section. Distinct from the v1 Y-statement fields (context, challenge,
 * decision, tradeoff) — this is a more rigorous form aimed at making
 * cross-project mapping computable.
 */
export interface AssumptionMapping {
  segment?: string;
  context?: string;
  claim?: string;
  mechanism?: string;
  metric?: string;
  threshold?: string;
  horizon_ms?: number;
}

export interface AssumptionExtensionInput {
  base_rate?: number | null;
  go_threshold?: number | null;
  kill_threshold?: number | null;
  predicted_metric?: string | null;
  threshold_value?: number | null;
  threshold_direction?: ThresholdDirection | null;
  mapping?: AssumptionMapping | null;
}

export interface AssumptionExtensionRow {
  assumption_id: string;
  base_rate: number | null;
  go_threshold: number | null;
  kill_threshold: number | null;
  predicted_metric: string | null;
  threshold_value: number | null;
  threshold_direction: ThresholdDirection | null;
  mapping: AssumptionMapping | null;
  updated_at: number;
}

export function setAssumptionExtension(
  db: IdeasDatabase,
  assumption_id: string,
  input: AssumptionExtensionInput,
  updated_at: number = Date.now(),
): void {
  const mapping_json =
    input.mapping === undefined ? null : input.mapping === null ? null : JSON.stringify(input.mapping);
  db.prepare(
    `INSERT OR REPLACE INTO ideas_assumption_extensions
       (assumption_id, base_rate, go_threshold, kill_threshold,
        predicted_metric, threshold_value, threshold_direction,
        mapping_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    assumption_id,
    input.base_rate ?? null,
    input.go_threshold ?? null,
    input.kill_threshold ?? null,
    input.predicted_metric ?? null,
    input.threshold_value ?? null,
    input.threshold_direction ?? null,
    mapping_json,
    updated_at,
  );
}

export function getAssumptionExtension(
  db: IdeasDatabase,
  assumption_id: string,
): AssumptionExtensionRow | null {
  const row = db
    .prepare(
      `SELECT assumption_id, base_rate, go_threshold, kill_threshold,
              predicted_metric, threshold_value, threshold_direction,
              mapping_json, updated_at
       FROM ideas_assumption_extensions WHERE assumption_id = ?`,
    )
    .get(assumption_id) as
    | {
        assumption_id: string;
        base_rate: number | null;
        go_threshold: number | null;
        kill_threshold: number | null;
        predicted_metric: string | null;
        threshold_value: number | null;
        threshold_direction: string | null;
        mapping_json: string | null;
        updated_at: number;
      }
    | undefined;
  if (!row) return null;
  let mapping: AssumptionMapping | null = null;
  if (row.mapping_json) {
    try {
      const parsed = JSON.parse(row.mapping_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        mapping = parsed as AssumptionMapping;
      }
    } catch {
      mapping = null;
    }
  }
  return {
    assumption_id: row.assumption_id,
    base_rate: row.base_rate,
    go_threshold: row.go_threshold,
    kill_threshold: row.kill_threshold,
    predicted_metric: row.predicted_metric,
    threshold_value: row.threshold_value,
    threshold_direction:
      row.threshold_direction === 'up' ||
      row.threshold_direction === 'down' ||
      row.threshold_direction === 'equal'
        ? row.threshold_direction
        : null,
    mapping,
    updated_at: row.updated_at,
  };
}

export function clearAssumptionExtension(
  db: IdeasDatabase,
  assumption_id: string,
): void {
  db.prepare('DELETE FROM ideas_assumption_extensions WHERE assumption_id = ?').run(
    assumption_id,
  );
}
