/**
 * Unit tests for decision-delta.ts (v0.2 D6).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computeDecisionDelta,
  DeltaInputError,
  openInMemoryIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  // Seed two ideas + sessions for FK chain.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'evaluated', 1, 1);
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-b', 'ideas/b.md', 'B', 'evaluated', 1, 1);
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run('sess-a-1', 'idea-a', 'light', 'pre_mortem', 100);
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run('sess-a-2', 'idea-a', 'light', 'standard', 200);
});

afterEach(() => {
  db.close();
});

function seedView(
  session_id: string,
  persona: string,
  cli: string,
  body: { stance?: string; confidence?: number; failure_reason?: string },
): string {
  const id = `view-${session_id}-${persona}-${cli}`;
  db.prepare(
    `INSERT INTO ideas_council_views
     (id, session_id, model, persona, prompt_version, persona_version, input_hash,
      stance, confidence, failure_reason, content_vault_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    session_id,
    cli,
    persona,
    'v1',
    'v1',
    `hash-${id}`,
    body.stance ?? null,
    body.confidence ?? null,
    body.failure_reason ?? null,
    `councils/${session_id}/${persona}-${cli}.md`,
  );
  return id;
}

describe('computeDecisionDelta — validation', () => {
  it('throws when from_session_id and to_session_id are equal', () => {
    expect(() => computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-1')).toThrow(
      DeltaInputError,
    );
  });

  it('throws when from_session_id is unknown', () => {
    expect(() => computeDecisionDelta(db, 'idea-a', 'sess-missing', 'sess-a-2')).toThrow(
      /from_session_id not found/,
    );
  });

  it('throws when to_session_id belongs to a different idea', () => {
    db.prepare(
      `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('sess-b-1', 'idea-b', 'light', 'pre_mortem', 300);
    expect(() => computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-b-1')).toThrow(
      /belongs to idea idea-b/,
    );
  });
});

describe('computeDecisionDelta — pairing + diff', () => {
  it('paired cells: confidence delta + jaccard + key_risks added/removed', () => {
    const fromStance = JSON.stringify({
      stance: 'sentence one and another sentence',
      confidence: 0.5,
      key_risks: ['risk-A', 'risk-B'],
      fragile_insights: ['insight-X'],
    });
    const toStance = JSON.stringify({
      stance: 'sentence one and another sentence with some new words',
      confidence: 0.8,
      key_risks: ['risk-B', 'risk-C'],
      fragile_insights: ['insight-X', 'insight-Y'],
    });
    seedView('sess-a-1', 'risk-pessimist', 'claude', { stance: fromStance, confidence: 0.5 });
    seedView('sess-a-2', 'risk-pessimist', 'claude', { stance: toStance, confidence: 0.8 });

    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.cells).toHaveLength(1);
    const cell = delta.cells[0];
    expect(cell.persona).toBe('risk-pessimist');
    expect(cell.cli).toBe('claude');
    expect(cell.confidence_from).toBe(0.5);
    expect(cell.confidence_to).toBe(0.8);
    expect(cell.confidence_delta).toBeCloseTo(0.3, 6);
    expect(cell.stance_jaccard).toBeGreaterThan(0); // some overlap
    expect(cell.stance_jaccard).toBeLessThan(1); // not identical
    expect(cell.key_risks_added).toEqual(['risk-C']);
    expect(cell.key_risks_removed).toEqual(['risk-A']);
    expect(cell.fragile_insights_added).toEqual(['insight-Y']);
    expect(cell.fragile_insights_removed).toEqual([]);
    expect(cell.failure_changed).toBe(false);
    expect(cell.side_only).toBeUndefined();
  });

  it('side_only=from when persona missing in to_session', () => {
    seedView('sess-a-1', 'growth-optimist', 'gemini', { stance: '{}', confidence: 0.7 });
    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.cells).toHaveLength(1);
    expect(delta.cells[0].side_only).toBe('from');
    expect(delta.cells[0].confidence_from).toBe(0.7);
    expect(delta.cells[0].confidence_to).toBeNull();
  });

  it('side_only=to when persona only present in to_session', () => {
    seedView('sess-a-2', 'regulator', 'codex', { stance: '{}', confidence: 0.4 });
    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.cells).toHaveLength(1);
    expect(delta.cells[0].side_only).toBe('to');
    expect(delta.cells[0].confidence_to).toBe(0.4);
    expect(delta.cells[0].confidence_from).toBeNull();
  });

  it('failure_changed=true when failure_reason flips between sessions', () => {
    seedView('sess-a-1', 'risk-pessimist', 'claude', { stance: '{}', failure_reason: 'parse' });
    seedView('sess-a-2', 'risk-pessimist', 'claude', { stance: '{}', failure_reason: null });
    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.cells[0].failure_changed).toBe(true);
  });

  it('non-JSON stance returns empty key_risks/fragile_insights without throwing', () => {
    seedView('sess-a-1', 'risk-pessimist', 'claude', { stance: 'plain text stance', confidence: 0.5 });
    seedView('sess-a-2', 'risk-pessimist', 'claude', { stance: 'another plain text', confidence: 0.6 });
    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.cells[0].key_risks_added).toEqual([]);
    expect(delta.cells[0].fragile_insights_removed).toEqual([]);
  });
});

describe('computeDecisionDelta — summary', () => {
  it('avg_confidence_delta + significant_shift_threshold + risk counts', () => {
    seedView('sess-a-1', 'risk-pessimist', 'claude', {
      stance: JSON.stringify({ key_risks: ['x'] }),
      confidence: 0.5,
    });
    seedView('sess-a-2', 'risk-pessimist', 'claude', {
      stance: JSON.stringify({ key_risks: ['y', 'z'] }),
      confidence: 0.9, // delta = +0.4 (above threshold 0.3)
    });
    seedView('sess-a-1', 'growth-optimist', 'codex', {
      stance: JSON.stringify({ key_risks: ['a'] }),
      confidence: 0.6,
    });
    seedView('sess-a-2', 'growth-optimist', 'codex', {
      stance: JSON.stringify({ key_risks: ['a'] }),
      confidence: 0.65, // delta = +0.05 (below threshold)
    });

    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.summary.avg_confidence_delta).toBeCloseTo((0.4 + 0.05) / 2, 6);
    expect(delta.summary.personas_with_significant_shift).toEqual(['risk-pessimist']);
    // risk-pessimist: 'x' removed, 'y'+'z' added → 2 added / 1 removed.
    // growth-optimist: no change.
    expect(delta.summary.new_risks_count).toBe(2);
    expect(delta.summary.dropped_risks_count).toBe(1);
    expect(delta.summary.failure_status_changes).toBe(0);
  });

  it('avg_confidence_delta is null when no comparable cells', () => {
    seedView('sess-a-1', 'risk-pessimist', 'claude', {});
    seedView('sess-a-2', 'risk-pessimist', 'claude', {});
    const delta = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2');
    expect(delta.summary.avg_confidence_delta).toBeNull();
  });

  it('custom significant_shift_threshold respected', () => {
    seedView('sess-a-1', 'risk-pessimist', 'claude', { confidence: 0.5 });
    seedView('sess-a-2', 'risk-pessimist', 'claude', { confidence: 0.65 }); // delta = 0.15
    const lax = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2', {
      significant_shift_threshold: 0.1,
    });
    expect(lax.summary.personas_with_significant_shift).toEqual(['risk-pessimist']);
    const strict = computeDecisionDelta(db, 'idea-a', 'sess-a-1', 'sess-a-2', {
      significant_shift_threshold: 0.5,
    });
    expect(strict.summary.personas_with_significant_shift).toEqual([]);
  });
});
