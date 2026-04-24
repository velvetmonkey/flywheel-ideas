/**
 * Unit tests for the v3 ideas_assumption_extensions sidecar CRUD helpers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearAssumptionExtension,
  getAssumptionExtension,
  openInMemoryIdeasDb,
  runMigrations,
  setAssumptionExtension,
  type AssumptionMapping,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'nascent', 1, 1);
  db.prepare(
    `INSERT INTO ideas_assumptions
       (id, idea_id, text, status, load_bearing, vault_path, declared_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run('asm-1', 'idea-a', 'Some assumption', 'open', 1, 'assumptions/a1.md', 2);
});

afterEach(() => {
  db.close();
});

describe('assumption-extensions', () => {
  it('returns null when no row exists', () => {
    expect(getAssumptionExtension(db, 'asm-1')).toBeNull();
  });

  it('records and reads back full extension', () => {
    const mapping: AssumptionMapping = {
      segment: 'B2B SaaS',
      context: 'Q3 2026 onwards',
      claim: 'CAC payback under 12 months',
      mechanism: 'Self-serve activation drives 60% of conversions',
      metric: 'cac_payback_months',
      threshold: '12',
      horizon_ms: 90 * 24 * 3600 * 1000,
    };
    setAssumptionExtension(
      db,
      'asm-1',
      {
        base_rate: 0.6,
        go_threshold: 0.7,
        kill_threshold: 0.3,
        predicted_metric: 'cac_payback_months',
        threshold_value: 12,
        threshold_direction: 'down',
        mapping,
      },
      1234,
    );
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row).not.toBeNull();
    expect(row?.assumption_id).toBe('asm-1');
    expect(row?.base_rate).toBe(0.6);
    expect(row?.go_threshold).toBe(0.7);
    expect(row?.kill_threshold).toBe(0.3);
    expect(row?.predicted_metric).toBe('cac_payback_months');
    expect(row?.threshold_value).toBe(12);
    expect(row?.threshold_direction).toBe('down');
    expect(row?.mapping).toEqual(mapping);
    expect(row?.updated_at).toBe(1234);
  });

  it('threshold_direction round-trips for all three values + null', () => {
    setAssumptionExtension(db, 'asm-1', { threshold_direction: 'up' });
    expect(getAssumptionExtension(db, 'asm-1')?.threshold_direction).toBe('up');
    setAssumptionExtension(db, 'asm-1', { threshold_direction: 'down' });
    expect(getAssumptionExtension(db, 'asm-1')?.threshold_direction).toBe('down');
    setAssumptionExtension(db, 'asm-1', { threshold_direction: 'equal' });
    expect(getAssumptionExtension(db, 'asm-1')?.threshold_direction).toBe('equal');
    setAssumptionExtension(db, 'asm-1', { threshold_direction: null });
    expect(getAssumptionExtension(db, 'asm-1')?.threshold_direction).toBeNull();
  });

  it('rejects invalid threshold_direction value from raw DB write', () => {
    db.prepare(
      `INSERT INTO ideas_assumption_extensions
         (assumption_id, threshold_direction, updated_at) VALUES (?, ?, ?)`,
    ).run('asm-1', 'sideways', 1);
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.threshold_direction).toBeNull();
  });

  it('INSERT OR REPLACE — second write overwrites', () => {
    setAssumptionExtension(db, 'asm-1', { base_rate: 0.5 }, 100);
    setAssumptionExtension(db, 'asm-1', { base_rate: 0.8, go_threshold: 0.9 }, 200);
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.base_rate).toBe(0.8);
    expect(row?.go_threshold).toBe(0.9);
    expect(row?.updated_at).toBe(200);
  });

  it('FK violation when assumption_id does not exist', () => {
    expect(() => setAssumptionExtension(db, 'asm-nonexistent', { base_rate: 0.5 })).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it('cascades delete from ideas_assumptions', () => {
    setAssumptionExtension(db, 'asm-1', { base_rate: 0.5 });
    db.prepare('DELETE FROM ideas_assumptions WHERE id = ?').run('asm-1');
    expect(getAssumptionExtension(db, 'asm-1')).toBeNull();
  });

  it('clearAssumptionExtension removes the row but leaves the parent', () => {
    setAssumptionExtension(db, 'asm-1', { base_rate: 0.5 });
    clearAssumptionExtension(db, 'asm-1');
    expect(getAssumptionExtension(db, 'asm-1')).toBeNull();
    const asm = db.prepare('SELECT id FROM ideas_assumptions WHERE id = ?').get('asm-1');
    expect(asm).toBeDefined();
  });

  it('handles malformed mapping_json defensively', () => {
    db.prepare(
      `INSERT INTO ideas_assumption_extensions
         (assumption_id, mapping_json, updated_at) VALUES (?, ?, ?)`,
    ).run('asm-1', 'not valid json {', 1);
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.mapping).toBeNull();
  });

  it('rejects non-object mapping_json (array)', () => {
    db.prepare(
      `INSERT INTO ideas_assumption_extensions
         (assumption_id, mapping_json, updated_at) VALUES (?, ?, ?)`,
    ).run('asm-1', '[1,2,3]', 1);
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.mapping).toBeNull();
  });

  it('partial mapping (only some fields) round-trips correctly', () => {
    setAssumptionExtension(db, 'asm-1', {
      mapping: { segment: 'enterprise', metric: 'churn_rate' },
    });
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.mapping).toEqual({ segment: 'enterprise', metric: 'churn_rate' });
  });
});
