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

describe('assumption-extensions — shaping + hedging actions (v0.2 RAND ABP complete)', () => {
  it('persists and reads back shaping_actions with full fields', () => {
    setAssumptionExtension(db, 'asm-1', {
      shaping_actions: [
        {
          description: 'Invest in onboarding playbook for self-serve activation',
          due_at: '2026-06-01',
          owner: 'growth',
          status: 'in_progress',
          notes: 'Blocked on content template',
        },
        {
          description: 'Lock in vendor discount for another 12 months',
          status: 'planned',
        },
      ],
    });
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.shaping_actions).toHaveLength(2);
    expect(row?.shaping_actions?.[0]).toEqual({
      description: 'Invest in onboarding playbook for self-serve activation',
      due_at: '2026-06-01',
      owner: 'growth',
      status: 'in_progress',
      notes: 'Blocked on content template',
    });
    expect(row?.shaping_actions?.[1]).toEqual({
      description: 'Lock in vendor discount for another 12 months',
      status: 'planned',
    });
  });

  it('persists and reads back hedging_actions independently of shaping', () => {
    setAssumptionExtension(db, 'asm-1', {
      hedging_actions: [
        { description: 'Feature flag kills new flow if activation drops 5pp' },
        { description: 'Keep legacy signup route open for 90 days', due_at: '2026-09-01' },
      ],
    });
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.hedging_actions).toHaveLength(2);
    expect(row?.shaping_actions).toBeNull();
  });

  it('stores both shaping and hedging arrays on the same row', () => {
    setAssumptionExtension(db, 'asm-1', {
      shaping_actions: [{ description: 'shape a' }, { description: 'shape b' }],
      hedging_actions: [{ description: 'hedge a' }],
    });
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.shaping_actions).toHaveLength(2);
    expect(row?.hedging_actions).toHaveLength(1);
  });

  it('null clears a previously-set actions array (INSERT OR REPLACE semantics)', () => {
    setAssumptionExtension(db, 'asm-1', {
      shaping_actions: [{ description: 'initial' }],
    });
    setAssumptionExtension(db, 'asm-1', {
      shaping_actions: null,
    });
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.shaping_actions).toBeNull();
  });

  it('rejects actions missing description', async () => {
    const { AssumptionActionValidationError } = await import(
      '../src/assumption-extensions.js'
    );
    expect(() =>
      setAssumptionExtension(db, 'asm-1', {
        // @ts-expect-error — deliberately missing description for the validation test
        shaping_actions: [{ due_at: '2026-06-01' }],
      }),
    ).toThrow(AssumptionActionValidationError);
  });

  it('rejects actions with unknown status', async () => {
    const { AssumptionActionValidationError } = await import(
      '../src/assumption-extensions.js'
    );
    expect(() =>
      setAssumptionExtension(db, 'asm-1', {
        shaping_actions: [
          // @ts-expect-error — deliberately invalid status
          { description: 'x', status: 'bogus' },
        ],
      }),
    ).toThrow(AssumptionActionValidationError);
  });

  it('parses defensively — malformed JSON in column returns null', () => {
    db.prepare(
      `INSERT INTO ideas_assumption_extensions
         (assumption_id, shaping_actions_json, updated_at)
       VALUES (?, ?, ?)`,
    ).run('asm-1', 'not valid json [', 1);
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.shaping_actions).toBeNull();
  });

  it('parses defensively — non-array JSON returns null', () => {
    db.prepare(
      `INSERT INTO ideas_assumption_extensions
         (assumption_id, shaping_actions_json, updated_at)
       VALUES (?, ?, ?)`,
    ).run('asm-1', '{"description":"oops"}', 1);
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.shaping_actions).toBeNull();
  });

  it('filters out array items missing description', () => {
    db.prepare(
      `INSERT INTO ideas_assumption_extensions
         (assumption_id, shaping_actions_json, updated_at)
       VALUES (?, ?, ?)`,
    ).run(
      'asm-1',
      JSON.stringify([
        { description: 'keep me' },
        { owner: 'nobody' },
        { description: 'also keep' },
      ]),
      1,
    );
    const row = getAssumptionExtension(db, 'asm-1');
    expect(row?.shaping_actions).toHaveLength(2);
    expect(row?.shaping_actions?.map((a) => a.description)).toEqual([
      'keep me',
      'also keep',
    ]);
  });
});
