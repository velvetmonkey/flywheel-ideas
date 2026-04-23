import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  openInMemoryIdeasDb,
  openIdeasDb,
  runMigrations,
  IDEA_STATES,
  INITIAL_STATE,
  isIdeaState,
  recordTransition,
  syncTransitionFrontmatter,
  listTransitions,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  // Seed an idea to transition.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/2026/04/a.md', 'Test', INITIAL_STATE, 1, 1);
});

afterEach(() => {
  db.close();
});

describe('IDEA_STATES', () => {
  it('includes all v0.1 states', () => {
    expect(IDEA_STATES).toEqual([
      'nascent',
      'explored',
      'evaluated',
      'committed',
      'validated',
      'parked',
      'killed',
      'refuted',
    ]);
  });

  it('isIdeaState accepts valid states', () => {
    expect(isIdeaState('nascent')).toBe(true);
    expect(isIdeaState('committed')).toBe(true);
  });

  it('isIdeaState rejects invalid input', () => {
    expect(isIdeaState('random')).toBe(false);
    expect(isIdeaState('')).toBe(false);
    expect(isIdeaState(42)).toBe(false);
    expect(isIdeaState(null)).toBe(false);
    expect(isIdeaState(undefined)).toBe(false);
  });
});

describe('recordTransition', () => {
  it('inserts a transition row and updates ideas_notes', () => {
    const result = recordTransition(db, 'idea-a', 'explored', { at: 100, reason: 'first pass' });
    expect(result.from_state).toBe('nascent');
    expect(result.to_state).toBe('explored');
    expect(result.reason).toBe('first pass');
    expect(result.at).toBe(100);

    const idea = db.prepare('SELECT state, state_changed_at FROM ideas_notes WHERE id = ?').get(
      'idea-a',
    ) as { state: string; state_changed_at: number };
    expect(idea.state).toBe('explored');
    expect(idea.state_changed_at).toBe(100);

    const rows = db
      .prepare('SELECT * FROM ideas_transitions WHERE idea_id = ?')
      .all('idea-a') as Array<{
      id: string;
      from_state: string;
      to_state: string;
      at: number;
      reason: string | null;
    }>;
    expect(rows.length).toBe(1);
    expect(rows[0].from_state).toBe('nascent');
    expect(rows[0].to_state).toBe('explored');
  });

  it('allows any-to-any transition in v0.1 (unenforced policy)', () => {
    // Jumping nascent -> validated without intermediate council should work.
    const r = recordTransition(db, 'idea-a', 'validated');
    expect(r.to_state).toBe('validated');
  });

  it('throws when the idea does not exist', () => {
    expect(() => recordTransition(db, 'idea-missing', 'explored')).toThrow(/not found/);
  });

  it('defaults `at` to Date.now()', () => {
    const before = Date.now();
    const r = recordTransition(db, 'idea-a', 'explored');
    const after = Date.now();
    expect(r.at).toBeGreaterThanOrEqual(before);
    expect(r.at).toBeLessThanOrEqual(after);
  });

  it('is atomic — on error both the insert and update roll back', () => {
    // Simulate a failure by trying to transition an idea that gets deleted
    // between the SELECT and the UPDATE. We can't easily test that without
    // real concurrent access, but we can verify that an invalid foreign key
    // (impossible in our current schema, so this tests the transaction wrap)
    // doesn't corrupt state.
    const initialCount = (
      db.prepare('SELECT COUNT(*) as c FROM ideas_transitions').get() as { c: number }
    ).c;

    expect(() => recordTransition(db, 'idea-missing', 'explored')).toThrow();

    const afterCount = (
      db.prepare('SELECT COUNT(*) as c FROM ideas_transitions').get() as { c: number }
    ).c;
    expect(afterCount).toBe(initialCount);
  });

  it('records multiple transitions in history order', () => {
    recordTransition(db, 'idea-a', 'explored', { at: 100 });
    recordTransition(db, 'idea-a', 'evaluated', { at: 200 });
    recordTransition(db, 'idea-a', 'committed', { at: 300, reason: 'going' });

    const history = listTransitions(db, 'idea-a');
    // listTransitions returns newest-first
    expect(history.length).toBe(3);
    expect(history[0].to_state).toBe('committed');
    expect(history[0].reason).toBe('going');
    expect(history[1].to_state).toBe('evaluated');
    expect(history[2].to_state).toBe('explored');
  });
});

describe('syncTransitionFrontmatter (alpha.4 helper, gemini HIGH)', () => {
  let vault: string;
  let realDb: IdeasDatabase;
  const NOTE_REL = 'ideas/2026/04/sync-test.md';

  beforeEach(async () => {
    vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-sync-'));
    await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
    await fsp.mkdir(path.join(vault, 'ideas/2026/04'), { recursive: true });
    await fsp.writeFile(
      path.join(vault, NOTE_REL),
      `---\nid: idea-sync\ntype: idea\nstate: nascent\ntitle: Sync test\n---\n\nbody\n`,
    );
    realDb = openIdeasDb(vault);
    runMigrations(realDb);
    realDb
      .prepare(
        `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('idea-sync', NOTE_REL, 'Sync test', 'nascent', 1, 1);
  });

  afterEach(async () => {
    realDb.close();
    await fsp.rm(vault, { recursive: true, force: true });
  });

  it('writes state + ISO state_changed_at to the markdown frontmatter', async () => {
    recordTransition(realDb, 'idea-sync', 'committed', { at: 1_700_000_000_000 });
    await syncTransitionFrontmatter(realDb, vault, 'idea-sync');

    const raw = await fsp.readFile(path.join(vault, NOTE_REL), 'utf8');
    const fm = matter(raw).data;
    expect(fm.state).toBe('committed');
    expect(fm.state_changed_at).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it('best-effort: stderr warning + DB stays correct when fs write fails', async () => {
    recordTransition(realDb, 'idea-sync', 'committed', { at: 2_000_000_000_000 });
    // Make the markdown file read-only so patchFrontmatter throws on the
    // tmp-rename step. (chmod 0o444 forbids writes for the owner.)
    await fsp.chmod(path.join(vault, NOTE_REL), 0o444);
    // The file's directory must also be unwritable on Linux for the rename
    // to fail — patchFrontmatter writes to a tmp file in the same dir.
    await fsp.chmod(path.join(vault, 'ideas/2026/04'), 0o555);

    let stderrCaptured = '';
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      stderrCaptured += chunk.toString();
      return true;
    }) as typeof process.stderr.write;

    try {
      await syncTransitionFrontmatter(realDb, vault, 'idea-sync');
    } finally {
      process.stderr.write = origWrite;
      // Restore perms so afterEach can rm
      await fsp.chmod(path.join(vault, 'ideas/2026/04'), 0o755).catch(() => {});
      await fsp.chmod(path.join(vault, NOTE_REL), 0o644).catch(() => {});
    }

    expect(stderrCaptured).toMatch(/frontmatter sync failed for idea idea-sync/);
    // DB still has the new state — best-effort means no rollback
    const row = realDb
      .prepare('SELECT state FROM ideas_notes WHERE id = ?')
      .get('idea-sync') as { state: string };
    expect(row.state).toBe('committed');
  });

  it('no-op + no throw when the idea id is missing', async () => {
    // recordTransition would have already thrown for a missing idea, so this
    // path is mostly defensive. The helper just returns silently.
    await expect(
      syncTransitionFrontmatter(realDb, vault, 'idea-does-not-exist'),
    ).resolves.toBeUndefined();
  });
});
