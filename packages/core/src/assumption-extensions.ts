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
 * RAND ABP action status. `planned` = declared but not started;
 * `in_progress` = in flight; `done` = complete; `cancelled` = abandoned.
 *
 * This is separate from assumption `status` (open/held/refuted) — an action
 * can be `done` while the parent assumption is still `open`, and vice
 * versa. Action status drives dashboards + weekly review surfaces; it does
 * NOT drive assumption-level status transitions.
 */
export type AssumptionActionStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

/**
 * One entry in `shaping_actions[]` or `hedging_actions[]`.
 *
 * `description` is the only required field. Everything else is optional so
 * users can capture an action at declaration time with minimal friction
 * and flesh it out later via `assumption.extension_set` (or equivalent).
 *
 * `due_at` uses ISO 8601 date strings (YYYY-MM-DD) for timezone-agnostic
 * readability in the markdown frontmatter.
 */
export interface AssumptionAction {
  description: string;
  due_at?: string;
  owner?: string;
  status?: AssumptionActionStatus;
  notes?: string;
}

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
  /**
   * RAND ABP shaping — proactive actions to make the assumption MORE likely
   * to hold. Pass `null` to clear; omit to leave existing rows unchanged.
   */
  shaping_actions?: AssumptionAction[] | null;
  /**
   * RAND ABP hedging — insurance actions if the assumption DOESN'T hold.
   * Pass `null` to clear; omit to leave existing rows unchanged.
   */
  hedging_actions?: AssumptionAction[] | null;
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
  shaping_actions: AssumptionAction[] | null;
  hedging_actions: AssumptionAction[] | null;
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
  const shaping_json = serializeActions(input.shaping_actions, 'shaping');
  const hedging_json = serializeActions(input.hedging_actions, 'hedging');
  db.prepare(
    `INSERT OR REPLACE INTO ideas_assumption_extensions
       (assumption_id, base_rate, go_threshold, kill_threshold,
        predicted_metric, threshold_value, threshold_direction,
        mapping_json, shaping_actions_json, hedging_actions_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    assumption_id,
    input.base_rate ?? null,
    input.go_threshold ?? null,
    input.kill_threshold ?? null,
    input.predicted_metric ?? null,
    input.threshold_value ?? null,
    input.threshold_direction ?? null,
    mapping_json,
    shaping_json,
    hedging_json,
    updated_at,
  );
}

/**
 * Validate + serialize an action array for persistence.
 *
 * - `undefined` → null (clear the column)
 * - `null`      → null (explicit clear)
 * - `[]`        → `'[]'` (explicit empty set)
 * - invalid item (no description) → throws AssumptionActionValidationError
 */
function serializeActions(
  actions: AssumptionAction[] | null | undefined,
  kind: 'shaping' | 'hedging',
): string | null {
  if (actions === undefined || actions === null) return null;
  if (!Array.isArray(actions)) {
    throw new AssumptionActionValidationError(
      `${kind}_actions must be an array, got ${typeof actions}`,
    );
  }
  for (const [i, a] of actions.entries()) {
    if (!a || typeof a !== 'object') {
      throw new AssumptionActionValidationError(
        `${kind}_actions[${i}] must be an object with a description`,
      );
    }
    if (typeof a.description !== 'string' || a.description.trim().length === 0) {
      throw new AssumptionActionValidationError(
        `${kind}_actions[${i}].description is required (non-empty string)`,
      );
    }
    if (
      a.status !== undefined &&
      !['planned', 'in_progress', 'done', 'cancelled'].includes(a.status)
    ) {
      throw new AssumptionActionValidationError(
        `${kind}_actions[${i}].status must be one of planned|in_progress|done|cancelled`,
      );
    }
  }
  return JSON.stringify(actions);
}

export class AssumptionActionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssumptionActionValidationError';
  }
}

export function getAssumptionExtension(
  db: IdeasDatabase,
  assumption_id: string,
): AssumptionExtensionRow | null {
  const row = db
    .prepare(
      `SELECT assumption_id, base_rate, go_threshold, kill_threshold,
              predicted_metric, threshold_value, threshold_direction,
              mapping_json, shaping_actions_json, hedging_actions_json, updated_at
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
        shaping_actions_json: string | null;
        hedging_actions_json: string | null;
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
    shaping_actions: parseActions(row.shaping_actions_json),
    hedging_actions: parseActions(row.hedging_actions_json),
    updated_at: row.updated_at,
  };
}

function parseActions(raw: string | null): AssumptionAction[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: AssumptionAction[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      if (typeof o.description !== 'string') continue;
      const action: AssumptionAction = { description: o.description };
      if (typeof o.due_at === 'string') action.due_at = o.due_at;
      if (typeof o.owner === 'string') action.owner = o.owner;
      if (typeof o.notes === 'string') action.notes = o.notes;
      if (
        o.status === 'planned' ||
        o.status === 'in_progress' ||
        o.status === 'done' ||
        o.status === 'cancelled'
      ) {
        action.status = o.status;
      }
      out.push(action);
    }
    return out;
  } catch {
    return null;
  }
}

export function clearAssumptionExtension(
  db: IdeasDatabase,
  assumption_id: string,
): void {
  db.prepare('DELETE FROM ideas_assumption_extensions WHERE assumption_id = ?').run(
    assumption_id,
  );
}
