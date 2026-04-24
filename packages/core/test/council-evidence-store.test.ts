/**
 * Unit tests for the v2 sidecar table CRUD helpers (session-keyed).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getEvidenceSources,
  openInMemoryIdeasDb,
  recordEvidenceSources,
  runMigrations,
  type EvidenceSource,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  // Seed minimum FK chain: idea → session, so session_id FK doesn't fail.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'nascent', 1, 1);
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run('sess-1', 'idea-a', 'light', 'pre_mortem', 2);
});

afterEach(() => {
  db.close();
});

describe('council-evidence-store', () => {
  it('records and reads back a row', () => {
    const sources: EvidenceSource[] = [
      { kind: 'search', path: 'tech/flywheel/risks-and-mitigations.md', score: 0.87 },
      { kind: 'memory_brief', path: 'tech/flywheel/thesis.md' },
    ];
    recordEvidenceSources(db, 'sess-1', sources, 1234);

    const row = getEvidenceSources(db, 'sess-1');
    expect(row).not.toBeNull();
    expect(row?.session_id).toBe('sess-1');
    expect(row?.retrieved_at).toBe(1234);
    expect(row?.sources).toEqual(sources);
  });

  it('returns null when no row exists for a session_id', () => {
    expect(getEvidenceSources(db, 'sess-missing')).toBeNull();
  });

  it('INSERT OR REPLACE — second write for same session_id overwrites', () => {
    recordEvidenceSources(db, 'sess-1', [{ kind: 'search', path: 'a.md' }], 100);
    recordEvidenceSources(db, 'sess-1', [{ kind: 'graph_backlinks', path: 'b.md' }], 200);
    const row = getEvidenceSources(db, 'sess-1');
    expect(row?.sources).toEqual([{ kind: 'graph_backlinks', path: 'b.md' }]);
    expect(row?.retrieved_at).toBe(200);
  });

  it('handles empty sources array', () => {
    recordEvidenceSources(db, 'sess-1', [], 1);
    const row = getEvidenceSources(db, 'sess-1');
    expect(row?.sources).toEqual([]);
  });

  it('FK violation when session_id does not exist', () => {
    expect(() => {
      recordEvidenceSources(db, 'sess-nonexistent', [{ kind: 'search', path: 'x.md' }]);
    }).toThrow(/FOREIGN KEY/i);
  });

  it('cascades delete from ideas_council_sessions', () => {
    recordEvidenceSources(db, 'sess-1', [{ kind: 'search', path: 'x.md' }]);
    db.prepare('DELETE FROM ideas_council_sessions WHERE id = ?').run('sess-1');
    expect(getEvidenceSources(db, 'sess-1')).toBeNull();
  });

  it('defensive — malformed JSON in DB returns empty sources, not throw', () => {
    db.prepare(
      `INSERT INTO ideas_council_evidence (session_id, sources_json, retrieved_at) VALUES (?, ?, ?)`,
    ).run('sess-1', 'not valid json {', 1);
    const row = getEvidenceSources(db, 'sess-1');
    expect(row?.sources).toEqual([]);
  });
});
