import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  __resetWritePathForTests,
  __setWritePathForTests,
  buildIdeaPath,
  createIdea,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-idea-create-'));
  db = openIdeasDb(vault);
  runMigrations(db);
  __setWritePathForTests({ active: 'direct-fs', reason: 'not_probed', binary: 'flywheel-memory' });
});

afterEach(async () => {
  db.close();
  __resetWritePathForTests();
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('createIdea', () => {
  it('unlinks orphan markdown when the DB insert fails after note creation', async () => {
    const now = Date.UTC(2026, 4, 11, 12, 0, 0);
    const relPath = buildIdeaPath('Colliding Idea', now);

    db.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-collision', 'ideas/existing.md', 'Existing', 'nascent', 1, 1);

    await expect(
      createIdea(db, vault, {
        id: 'idea-collision',
        title: 'Colliding Idea',
        now,
      }),
    ).rejects.toThrow();

    await expect(fsp.access(path.join(vault, relPath))).rejects.toThrow();
    const row = db
      .prepare('SELECT vault_path, title FROM ideas_notes WHERE id = ?')
      .get('idea-collision') as { vault_path: string; title: string };
    expect(row).toEqual({ vault_path: 'ideas/existing.md', title: 'Existing' });
  });
});
