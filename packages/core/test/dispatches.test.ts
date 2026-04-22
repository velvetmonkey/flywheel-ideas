import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  forgetDispatch,
  getDispatch,
  listDispatches,
  logDispatchFinish,
  logDispatchStart,
  openInMemoryIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('logDispatchStart', () => {
  it('writes a row with started_at set and finished_at null', () => {
    const before = Date.now();
    const { id, started_at } = logDispatchStart(db, {
      session_id: null,
      cli: 'claude',
      argv: ['-p', '--output-format', 'json'],
      approval_scope: 'session',
    });
    const after = Date.now();
    expect(id).toMatch(/^disp-/);
    expect(started_at).toBeGreaterThanOrEqual(before);
    expect(started_at).toBeLessThanOrEqual(after);

    const row = getDispatch(db, id);
    expect(row).toMatchObject({
      id,
      cli: 'claude',
      argv: ['-p', '--output-format', 'json'],
      approval_scope: 'session',
      started_at,
      finished_at: null,
    });
  });

  it('accepts null session_id (M6 stub has no council session)', () => {
    const { id } = logDispatchStart(db, {
      session_id: null,
      cli: 'codex',
      argv: [],
      approval_scope: 'always',
    });
    expect(getDispatch(db, id)?.session_id).toBeNull();
  });

  it('argv round-trips as JSON (array preserved exactly)', () => {
    const argv = ['--flag', '-x', 'value with spaces', '--json'];
    const { id } = logDispatchStart(db, {
      session_id: null,
      cli: 'gemini',
      argv,
      approval_scope: 'session',
    });
    expect(getDispatch(db, id)?.argv).toEqual(argv);
  });

  it('empty argv round-trips as empty array', () => {
    const { id } = logDispatchStart(db, {
      session_id: null,
      cli: 'claude',
      argv: [],
      approval_scope: 'session',
    });
    expect(getDispatch(db, id)?.argv).toEqual([]);
  });
});

describe('logDispatchFinish', () => {
  it('sets finished_at on existing row', () => {
    const { id } = logDispatchStart(db, {
      session_id: null,
      cli: 'claude',
      argv: [],
      approval_scope: 'session',
    });
    logDispatchFinish(db, id);
    const row = getDispatch(db, id);
    expect(row?.finished_at).not.toBeNull();
    expect(row?.finished_at).toBeGreaterThanOrEqual(row!.started_at);
  });

  it('accepts explicit finished_at override (for deterministic tests)', () => {
    const { id } = logDispatchStart(db, {
      session_id: null,
      cli: 'claude',
      argv: [],
      approval_scope: 'session',
    });
    logDispatchFinish(db, id, { finished_at: 9_999_999_999 });
    expect(getDispatch(db, id)?.finished_at).toBe(9_999_999_999);
  });

  it('unknown id is a no-op (no throw)', () => {
    expect(() => logDispatchFinish(db, 'disp-missing')).not.toThrow();
  });
});

describe('listDispatches', () => {
  it('orders by started_at DESC', () => {
    const { id: a } = logDispatchStart(db, {
      session_id: null,
      cli: 'claude',
      argv: [],
      approval_scope: 'session',
    });
    // Force a distinct started_at by stepping clock forward via a second insert.
    // better-sqlite3 is synchronous; inserts happen fast but still distinct most
    // of the time. When they collide, the rowid ordering + DESC still gives a
    // stable result; the test checks presence, not index.
    const { id: b } = logDispatchStart(db, {
      session_id: null,
      cli: 'codex',
      argv: [],
      approval_scope: 'session',
    });
    const rows = listDispatches(db);
    expect(rows.map((r) => r.id)).toEqual(expect.arrayContaining([a, b]));
    // Most recent started_at first
    expect(rows[0].started_at).toBeGreaterThanOrEqual(rows[rows.length - 1].started_at);
  });

  it('respects limit', () => {
    for (let i = 0; i < 5; i++) {
      logDispatchStart(db, { session_id: null, cli: 'claude', argv: [], approval_scope: 'session' });
    }
    expect(listDispatches(db, { limit: 2 })).toHaveLength(2);
  });

  it('filters by session_id', () => {
    logDispatchStart(db, { session_id: null, cli: 'claude', argv: [], approval_scope: 'session' });
    // A dispatch with a session_id requires an existing session row (FK). Seed one.
    db.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-a', 'ideas/idea-a.md', 'A', 'nascent', 1, 1);
    db.prepare(
      `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('sess-a', 'idea-a', 'light', 'standard', 1);
    const { id } = logDispatchStart(db, {
      session_id: 'sess-a',
      cli: 'codex',
      argv: [],
      approval_scope: 'always',
    });

    const byNull = listDispatches(db).filter((r) => r.session_id === null);
    expect(byNull).toHaveLength(1);
    const bySession = listDispatches(db, { session_id: 'sess-a' });
    expect(bySession).toHaveLength(1);
    expect(bySession[0].id).toBe(id);
  });

  it('default limit is 50', () => {
    for (let i = 0; i < 60; i++) {
      logDispatchStart(db, { session_id: null, cli: 'claude', argv: [], approval_scope: 'session' });
    }
    expect(listDispatches(db)).toHaveLength(50);
  });

  it('empty table returns empty array', () => {
    expect(listDispatches(db)).toEqual([]);
  });
});

describe('forgetDispatch', () => {
  it('removes the row and returns true', () => {
    const { id } = logDispatchStart(db, {
      session_id: null,
      cli: 'claude',
      argv: [],
      approval_scope: 'session',
    });
    expect(forgetDispatch(db, id)).toBe(true);
    expect(getDispatch(db, id)).toBeNull();
  });

  it('unknown id returns false', () => {
    expect(forgetDispatch(db, 'disp-missing')).toBe(false);
  });
});
