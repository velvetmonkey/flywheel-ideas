/**
 * Anti-Portfolio outcome-memo persistence (v0.2 Phase 1 D4).
 *
 * Per the Bessemer Anti-Portfolio pattern: when reality refutes a load-bearing
 * assumption, the team writes a structured "which assumption failed and why"
 * memo. The memo turns a one-off failure into a propagated lesson — the
 * `lesson` field is the durable bit that future ideas/assumptions can cite.
 *
 * This module owns the sidecar table CRUD only. The MCP `outcome.log` action
 * accepts an optional `memo` arg and persists it via `recordOutcomeMemo`.
 * When a refuting outcome ships without a memo, the MCP surface adds a strong
 * `next_steps` nudge — soft enforcement, not hard.
 */

import type { IdeasDatabase } from './db.js';

/**
 * Structured post-mortem fields. All required EXCEPT `refuted_assumption_id`,
 * which is an optional pointer at the most-load-bearing failed assumption
 * when the user wants to disambiguate. The memo as a whole addresses the bet,
 * not a per-assumption row.
 */
export interface OutcomeMemo {
  /** Optional disambiguator: which assumption was the load-bearing failure. */
  refuted_assumption_id?: string;
  /** What actually broke — the proximate cause. */
  root_cause: string;
  /** The original assumption / belief that turned out wrong. */
  what_we_thought: string;
  /** The observed reality that contradicted it. */
  what_actually_happened: string;
  /** The durable takeaway for future bets. */
  lesson: string;
}

export interface OutcomeMemoRow {
  outcome_id: string;
  memo: OutcomeMemo;
  written_at: number;
}

export class OutcomeMemoInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutcomeMemoInputError';
  }
}

/**
 * Validate the memo shape — all four required string fields non-empty.
 * Throws OutcomeMemoInputError on missing fields. The MCP surface wraps
 * this to produce structured errors.
 */
function validateMemo(memo: OutcomeMemo): void {
  for (const field of ['root_cause', 'what_we_thought', 'what_actually_happened', 'lesson'] as const) {
    const value = memo[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new OutcomeMemoInputError(
        `outcome memo requires non-empty ${field}`,
      );
    }
  }
}

/**
 * Insert or replace the memo for an outcome. Throws on FK violation if
 * the outcome doesn't exist (caller responsibility — usually the memo
 * write follows immediately after outcome.log).
 */
export function recordOutcomeMemo(
  db: IdeasDatabase,
  outcome_id: string,
  memo: OutcomeMemo,
  written_at: number = Date.now(),
): void {
  validateMemo(memo);
  db.prepare(
    `INSERT OR REPLACE INTO ideas_outcome_memos (outcome_id, memo_json, written_at)
     VALUES (?, ?, ?)`,
  ).run(outcome_id, JSON.stringify(memo), written_at);
}

export function getOutcomeMemo(db: IdeasDatabase, outcome_id: string): OutcomeMemoRow | null {
  const row = db
    .prepare(
      `SELECT outcome_id, memo_json, written_at FROM ideas_outcome_memos WHERE outcome_id = ?`,
    )
    .get(outcome_id) as { outcome_id: string; memo_json: string; written_at: number } | undefined;
  if (!row) return null;
  let memo: OutcomeMemo;
  try {
    const parsed = JSON.parse(row.memo_json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.root_cause === 'string' &&
      typeof parsed.what_we_thought === 'string' &&
      typeof parsed.what_actually_happened === 'string' &&
      typeof parsed.lesson === 'string'
    ) {
      memo = parsed as OutcomeMemo;
    } else {
      // Defensive — return a stub so callers don't crash on partially-corrupt rows.
      memo = {
        root_cause: '',
        what_we_thought: '',
        what_actually_happened: '',
        lesson: '',
      };
    }
  } catch {
    memo = {
      root_cause: '',
      what_we_thought: '',
      what_actually_happened: '',
      lesson: '',
    };
  }
  return { outcome_id: row.outcome_id, memo, written_at: row.written_at };
}

export function clearOutcomeMemo(db: IdeasDatabase, outcome_id: string): void {
  db.prepare('DELETE FROM ideas_outcome_memos WHERE outcome_id = ?').run(outcome_id);
}

/**
 * Convenience: list outcome ids in `outcome_ids` that DO refute at least
 * one assumption AND DON'T have a memo. Used by the MCP nudge path to
 * surface "you have N un-memo'd refutations" hints.
 */
export function findRefutingOutcomesWithoutMemos(
  db: IdeasDatabase,
  outcome_ids: string[],
): string[] {
  if (outcome_ids.length === 0) return [];
  const placeholders = outcome_ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT DISTINCT v.outcome_id
       FROM ideas_outcome_verdicts v
       LEFT JOIN ideas_outcome_memos m ON m.outcome_id = v.outcome_id
       WHERE v.outcome_id IN (${placeholders})
         AND v.verdict = 'refuted'
         AND m.outcome_id IS NULL`,
    )
    .all(...outcome_ids) as Array<{ outcome_id: string }>;
  return rows.map((r) => r.outcome_id);
}
