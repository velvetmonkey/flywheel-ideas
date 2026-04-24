/**
 * Unit tests for outcome-memos.ts (v0.2 Phase 1 D4 — Anti-Portfolio).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearOutcomeMemo,
  findRefutingOutcomesWithoutMemos,
  getOutcomeMemo,
  openInMemoryIdeasDb,
  OutcomeMemoInputError,
  recordOutcomeMemo,
  runMigrations,
  type IdeasDatabase,
  type OutcomeMemo,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  // Seed FK chain: idea → assumption → outcome → verdict.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'committed', 1, 1);
  db.prepare(
    `INSERT INTO ideas_assumptions
       (id, idea_id, text, status, load_bearing, vault_path, declared_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run('asm-1', 'idea-a', 'Assumption 1', 'open', 1, 'assumptions/a1.md', 2);
  db.prepare(
    `INSERT INTO ideas_outcomes (id, idea_id, text, vault_path, landed_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run('out-1', 'idea-a', 'Reality arrived', 'outcomes/o1.md', 100);
});

afterEach(() => {
  db.close();
});

const validMemo: OutcomeMemo = {
  refuted_assumption_id: 'asm-1',
  root_cause: 'Pricing assumption was anchored on a competitor that exited the market',
  what_we_thought: 'Customers would tolerate $X/seat',
  what_actually_happened: 'Churn spiked at $X-2; market reset lower',
  lesson: 'Anchor pricing on willingness-to-pay survey BEFORE comp scan, not after',
};

describe('outcome-memos — happy path', () => {
  it('records and reads back a full memo', () => {
    recordOutcomeMemo(db, 'out-1', validMemo, 1234);
    const row = getOutcomeMemo(db, 'out-1');
    expect(row).not.toBeNull();
    expect(row?.outcome_id).toBe('out-1');
    expect(row?.memo).toEqual(validMemo);
    expect(row?.written_at).toBe(1234);
  });

  it('memo without refuted_assumption_id is valid (whole-bet memo)', () => {
    const wholeBet: OutcomeMemo = {
      root_cause: 'Hiring delay killed the launch window',
      what_we_thought: 'We would hire two engineers by Q2',
      what_actually_happened: 'Q3 before first hire',
      lesson: 'Don\'t commit to launch dates that depend on speculative hires',
    };
    recordOutcomeMemo(db, 'out-1', wholeBet);
    expect(getOutcomeMemo(db, 'out-1')?.memo.refuted_assumption_id).toBeUndefined();
  });

  it('INSERT OR REPLACE — second write overwrites', () => {
    recordOutcomeMemo(db, 'out-1', validMemo, 100);
    const revised: OutcomeMemo = {
      ...validMemo,
      lesson: 'Updated lesson after reflection',
    };
    recordOutcomeMemo(db, 'out-1', revised, 200);
    const row = getOutcomeMemo(db, 'out-1');
    expect(row?.memo.lesson).toBe('Updated lesson after reflection');
    expect(row?.written_at).toBe(200);
  });
});

describe('outcome-memos — validation', () => {
  it.each(['root_cause', 'what_we_thought', 'what_actually_happened', 'lesson'] as const)(
    'rejects missing %s',
    (field) => {
      const broken = { ...validMemo, [field]: '' };
      expect(() => recordOutcomeMemo(db, 'out-1', broken)).toThrow(OutcomeMemoInputError);
    },
  );

  it('rejects whitespace-only required fields', () => {
    expect(() => recordOutcomeMemo(db, 'out-1', { ...validMemo, lesson: '   ' })).toThrow(
      OutcomeMemoInputError,
    );
  });
});

describe('outcome-memos — read paths', () => {
  it('returns null for unknown outcome_id', () => {
    expect(getOutcomeMemo(db, 'out-doesnotexist')).toBeNull();
  });

  it('handles malformed memo_json defensively (returns stub, no throw)', () => {
    db.prepare(
      `INSERT INTO ideas_outcome_memos (outcome_id, memo_json, written_at) VALUES (?, ?, ?)`,
    ).run('out-1', 'not valid json {', 1);
    const row = getOutcomeMemo(db, 'out-1');
    expect(row).not.toBeNull();
    expect(row?.memo.lesson).toBe('');
  });

  it('FK violation on unknown outcome_id', () => {
    expect(() => recordOutcomeMemo(db, 'out-nonexistent', validMemo)).toThrow(/FOREIGN KEY/i);
  });

  it('cascades delete from ideas_outcomes', () => {
    recordOutcomeMemo(db, 'out-1', validMemo);
    db.prepare('DELETE FROM ideas_outcomes WHERE id = ?').run('out-1');
    expect(getOutcomeMemo(db, 'out-1')).toBeNull();
  });

  it('clearOutcomeMemo removes the row but leaves the parent', () => {
    recordOutcomeMemo(db, 'out-1', validMemo);
    clearOutcomeMemo(db, 'out-1');
    expect(getOutcomeMemo(db, 'out-1')).toBeNull();
    const out = db.prepare('SELECT id FROM ideas_outcomes WHERE id = ?').get('out-1');
    expect(out).toBeDefined();
  });
});

describe('findRefutingOutcomesWithoutMemos', () => {
  it('returns outcome ids that refute AND lack memos', () => {
    // Seed a verdict making out-1 a refuting outcome.
    db.prepare(
      `INSERT INTO ideas_outcome_verdicts (outcome_id, assumption_id, verdict)
       VALUES (?, ?, ?)`,
    ).run('out-1', 'asm-1', 'refuted');

    const without = findRefutingOutcomesWithoutMemos(db, ['out-1']);
    expect(without).toEqual(['out-1']);
  });

  it('returns empty when memo exists', () => {
    db.prepare(
      `INSERT INTO ideas_outcome_verdicts (outcome_id, assumption_id, verdict)
       VALUES (?, ?, ?)`,
    ).run('out-1', 'asm-1', 'refuted');
    recordOutcomeMemo(db, 'out-1', validMemo);
    expect(findRefutingOutcomesWithoutMemos(db, ['out-1'])).toEqual([]);
  });

  it('returns empty when outcome only validates (no refute verdicts)', () => {
    db.prepare(
      `INSERT INTO ideas_outcome_verdicts (outcome_id, assumption_id, verdict)
       VALUES (?, ?, ?)`,
    ).run('out-1', 'asm-1', 'validated');
    expect(findRefutingOutcomesWithoutMemos(db, ['out-1'])).toEqual([]);
  });

  it('handles empty input', () => {
    expect(findRefutingOutcomesWithoutMemos(db, [])).toEqual([]);
  });
});
