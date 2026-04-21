import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  openInMemoryIdeasDb,
  runMigrations,
  getCurrentVersion,
  SCHEMA_VERSION,
} from '../src/index.js';

describe('runMigrations', () => {
  it('brings a fresh database to the current schema version', () => {
    const db = openInMemoryIdeasDb();
    const version = runMigrations(db);
    expect(version).toBe(SCHEMA_VERSION);
    db.close();
  });

  it('creates all v0.1 tables', () => {
    const db = openInMemoryIdeasDb();
    runMigrations(db);

    const expected = [
      'schema_version',
      'ideas_notes',
      'ideas_transitions',
      'ideas_assumptions',
      'ideas_council_sessions',
      'ideas_council_views',
      'ideas_assumption_citations',
      'ideas_outcomes',
      'ideas_outcome_verdicts',
      'ideas_dispatches',
    ];

    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name);

    for (const t of expected) {
      expect(names, `missing table ${t}`).toContain(t);
    }
    db.close();
  });

  it('records applied version in schema_version', () => {
    const db = openInMemoryIdeasDb();
    runMigrations(db);
    const rows = db
      .prepare('SELECT version FROM schema_version ORDER BY version')
      .all() as Array<{ version: number }>;
    expect(rows.map((r) => r.version)).toEqual([1]);
    db.close();
  });

  it('is idempotent: second run is a no-op', () => {
    const db = openInMemoryIdeasDb();
    const first = runMigrations(db);
    const second = runMigrations(db);
    expect(second).toBe(first);

    const rows = db.prepare('SELECT version FROM schema_version').all() as Array<{
      version: number;
    }>;
    expect(rows.length).toBe(1); // INSERT OR IGNORE prevented duplicate
    db.close();
  });

  it('is idempotent across repeated opens (reflecting real dev-tinker scenarios)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (runs) => {
        const db = openInMemoryIdeasDb();
        for (let i = 0; i < runs; i++) {
          runMigrations(db);
        }
        expect(getCurrentVersion(db)).toBe(SCHEMA_VERSION);
        db.close();
      }),
      { numRuns: 20 },
    );
  });

  it('respects foreign key constraints', () => {
    const db = openInMemoryIdeasDb();
    runMigrations(db);

    // Try to insert an assumption citing a non-existent idea
    expect(() => {
      db.prepare(
        `INSERT INTO ideas_assumptions
         (id, idea_id, text, status, load_bearing, vault_path, declared_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run('asm-1', 'nonexistent-idea', 'test', 'open', 0, 'assumptions/x.md', Date.now());
    }).toThrow(/FOREIGN KEY/i);

    db.close();
  });

  it('cascades deletes from ideas_notes to transitions/assumptions/outcomes', () => {
    const db = openInMemoryIdeasDb();
    runMigrations(db);

    db.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-a', 'ideas/2026/04/a.md', 'Test', 'nascent', 1, 1);

    db.prepare(
      `INSERT INTO ideas_transitions (id, idea_id, from_state, to_state, at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('t-1', 'idea-a', 'nascent', 'explored', 2);

    db.prepare(
      `INSERT INTO ideas_assumptions
       (id, idea_id, text, status, load_bearing, vault_path, declared_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('asm-1', 'idea-a', 'T', 'open', 0, 'assumptions/x.md', 3);

    db.prepare('DELETE FROM ideas_notes WHERE id = ?').run('idea-a');

    const transitions = db
      .prepare('SELECT COUNT(*) as c FROM ideas_transitions')
      .get() as { c: number };
    const assumptions = db
      .prepare('SELECT COUNT(*) as c FROM ideas_assumptions')
      .get() as { c: number };

    expect(transitions.c).toBe(0);
    expect(assumptions.c).toBe(0);

    db.close();
  });
});
