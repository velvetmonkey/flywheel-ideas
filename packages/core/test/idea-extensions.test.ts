/**
 * Unit tests for the v3 ideas_idea_extensions sidecar CRUD helpers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearIdeaExtension,
  getIdeaExtension,
  openInMemoryIdeasDb,
  runMigrations,
  setIdeaExtension,
  type AlternativeEntry,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  // Seed two ideas — one to extend, one to be the supersedes target.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'nascent', 1, 1);
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-b', 'ideas/b.md', 'B', 'nascent', 2, 2);
});

afterEach(() => {
  db.close();
});

describe('idea-extensions', () => {
  it('returns null when no row exists', () => {
    expect(getIdeaExtension(db, 'idea-a')).toBeNull();
  });

  it('records and reads back full extension', () => {
    const alternatives: AlternativeEntry[] = [
      { title: 'Use a managed service', why_rejected: 'Cost at our scale', confidence: 0.7 },
      { title: 'Build in-house', why_rejected: 'Team lacks ops capacity' },
    ];
    setIdeaExtension(
      db,
      'idea-a',
      {
        alternatives,
        reversible: 'hard',
        supersedes: 'idea-b',
        replaced_by: null,
        reference_class: 'Migrations of B2B SaaS billing systems 2018-2024',
      },
      1234,
    );
    const row = getIdeaExtension(db, 'idea-a');
    expect(row).not.toBeNull();
    expect(row?.idea_id).toBe('idea-a');
    expect(row?.alternatives).toEqual(alternatives);
    expect(row?.reversible).toBe('hard');
    expect(row?.supersedes).toBe('idea-b');
    expect(row?.replaced_by).toBeNull();
    expect(row?.reference_class).toBe('Migrations of B2B SaaS billing systems 2018-2024');
    expect(row?.updated_at).toBe(1234);
  });

  it('reversible round-trips for all three values + null', () => {
    setIdeaExtension(db, 'idea-a', { reversible: 'easy' });
    expect(getIdeaExtension(db, 'idea-a')?.reversible).toBe('easy');
    setIdeaExtension(db, 'idea-a', { reversible: 'one_way' });
    expect(getIdeaExtension(db, 'idea-a')?.reversible).toBe('one_way');
    setIdeaExtension(db, 'idea-a', { reversible: null });
    expect(getIdeaExtension(db, 'idea-a')?.reversible).toBeNull();
  });

  it('INSERT OR REPLACE — second write overwrites', () => {
    setIdeaExtension(db, 'idea-a', { reversible: 'hard' }, 100);
    setIdeaExtension(db, 'idea-a', { reversible: 'easy', reference_class: 'rebrand' }, 200);
    const row = getIdeaExtension(db, 'idea-a');
    expect(row?.reversible).toBe('easy');
    expect(row?.reference_class).toBe('rebrand');
    expect(row?.updated_at).toBe(200);
  });

  it('FK violation when idea_id does not exist', () => {
    expect(() => setIdeaExtension(db, 'idea-nonexistent', { reversible: 'easy' })).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it('cascades delete from ideas_notes', () => {
    setIdeaExtension(db, 'idea-a', { reversible: 'hard' });
    db.prepare('DELETE FROM ideas_notes WHERE id = ?').run('idea-a');
    expect(getIdeaExtension(db, 'idea-a')).toBeNull();
  });

  it('clearIdeaExtension removes the row but leaves the parent', () => {
    setIdeaExtension(db, 'idea-a', { reversible: 'hard' });
    clearIdeaExtension(db, 'idea-a');
    expect(getIdeaExtension(db, 'idea-a')).toBeNull();
    // Parent idea still exists.
    const idea = db.prepare('SELECT id FROM ideas_notes WHERE id = ?').get('idea-a');
    expect(idea).toBeDefined();
  });

  it('handles malformed alternatives_json defensively', () => {
    db.prepare(
      `INSERT INTO ideas_idea_extensions (idea_id, alternatives_json, updated_at) VALUES (?, ?, ?)`,
    ).run('idea-a', 'not valid json {', 1);
    const row = getIdeaExtension(db, 'idea-a');
    expect(row?.alternatives).toBeNull();
  });

  it('rejects non-array alternatives_json', () => {
    db.prepare(
      `INSERT INTO ideas_idea_extensions (idea_id, alternatives_json, updated_at) VALUES (?, ?, ?)`,
    ).run('idea-a', '{"not":"an array"}', 1);
    const row = getIdeaExtension(db, 'idea-a');
    expect(row?.alternatives).toBeNull();
  });

  it('supersedes index supports lookups by parent id', () => {
    setIdeaExtension(db, 'idea-a', { supersedes: 'idea-b' });
    const rows = db
      .prepare(
        'SELECT idea_id FROM ideas_idea_extensions WHERE supersedes = ?',
      )
      .all('idea-b') as Array<{ idea_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].idea_id).toBe('idea-a');
  });
});
