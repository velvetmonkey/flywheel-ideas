import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
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

function isoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

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
  it('keeps returned result, DB row, and markdown frontmatter in agreement', async () => {
    const now = Date.UTC(2026, 4, 11, 12, 0, 0);

    const result = await createIdea(db, vault, {
      id: 'idea-consistent',
      title: 'Consistent Idea',
      now,
      extraFrontmatter: {
        id: 'wrong-id',
        type: 'wrong-type',
        title: 'Wrong Title',
        state: 'wrong-state',
        created_at: 'wrong-date',
        source: 'test',
      },
    });

    const row = db
      .prepare(
        `SELECT id, vault_path, title, state, created_at, state_changed_at
           FROM ideas_notes
          WHERE id = ?`,
      )
      .get(result.id) as {
      id: string;
      vault_path: string;
      title: string;
      state: string;
      created_at: number;
      state_changed_at: number;
    };

    expect(row).toEqual({
      id: result.id,
      vault_path: result.vault_path,
      title: result.title,
      state: result.state,
      created_at: result.created_at,
      state_changed_at: result.created_at,
    });

    const raw = await fsp.readFile(path.join(vault, result.vault_path), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.id).toBe(result.id);
    expect(parsed.data.type).toBe('idea');
    expect(parsed.data.title).toBe(result.title);
    expect(parsed.data.state).toBe(result.state);
    expect(isoString(parsed.data.created_at)).toBe(new Date(now).toISOString());
    expect(parsed.data.source).toBe('test');
    expect(parsed.content).toBe('# Consistent Idea\n\n');
  });

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
