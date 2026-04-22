import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import { writeNote, readNote, WriteNotePathError } from '../src/index.js';

let vault: string;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-test-'));
  // flywheel-ideas install-time check wants .flywheel/ to exist — not
  // required for writeNote itself, but good habit.
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
});

afterEach(async () => {
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('writeNote', () => {
  it('creates a new markdown note with frontmatter + body', async () => {
    const result = await writeNote(
      vault,
      'ideas/2026/04/test.md',
      { id: 'idea-abc', state: 'nascent', type: 'idea' },
      '# Test\n\nSome body content.\n',
    );

    expect(result.vault_path).toBe('ideas/2026/04/test.md');
    expect(result.write_path).toBe('direct-fs');

    const raw = await fsp.readFile(path.join(vault, 'ideas/2026/04/test.md'), 'utf8');
    expect(raw).toContain('id: idea-abc');
    expect(raw).toContain('state: nascent');
    expect(raw).toContain('# Test');
  });

  it('creates intermediate directories', async () => {
    await writeNote(vault, 'ideas/2026/04/deep.md', { id: 'idea-xyz' }, 'body');
    expect(fs.existsSync(path.join(vault, 'ideas/2026/04/deep.md'))).toBe(true);
  });

  it('refuses to overwrite by default', async () => {
    await writeNote(vault, 'ideas/a.md', { id: 'idea-1' }, 'first');
    await expect(
      writeNote(vault, 'ideas/a.md', { id: 'idea-1' }, 'second'),
    ).rejects.toThrow(/already exists/i);
  });

  it('overwrites when explicitly requested', async () => {
    await writeNote(vault, 'ideas/a.md', { id: 'idea-1' }, 'first');
    await writeNote(
      vault,
      'ideas/a.md',
      { id: 'idea-1' },
      'second',
      { overwrite: true },
    );
    const raw = await fsp.readFile(path.join(vault, 'ideas/a.md'), 'utf8');
    expect(raw).toContain('second');
  });

  it('rejects absolute paths', async () => {
    await expect(
      writeNote(vault, '/etc/passwd', { id: 'x' }, 'evil'),
    ).rejects.toThrow(WriteNotePathError);
  });

  it('rejects path traversal', async () => {
    await expect(
      writeNote(vault, '../escaped.md', { id: 'x' }, 'evil'),
    ).rejects.toThrow(WriteNotePathError);
  });

  it('rejects sensitive paths', async () => {
    await expect(
      writeNote(vault, 'subdir/.env', { id: 'x' }, 'evil'),
    ).rejects.toThrow(WriteNotePathError);
    await expect(
      writeNote(vault, '.ssh/id_rsa', { id: 'x' }, 'evil'),
    ).rejects.toThrow(WriteNotePathError);
  });

  it('writes atomically — no tmp file remains on success', async () => {
    await writeNote(vault, 'ideas/atomic.md', { id: 'idea-1' }, 'body');
    const dir = await fsp.readdir(path.join(vault, 'ideas'));
    expect(dir.filter((f) => f.includes('.tmp')).length).toBe(0);
  });

  it('serializes concurrent creates to the same path via exclusive-create', async () => {
    // Both callers race to create ideas/race.md. Exactly one should succeed,
    // the other should surface EEXIST-like rejection via WriteNotePathError.
    const results = await Promise.allSettled([
      writeNote(vault, 'ideas/race.md', { id: 'idea-1' }, 'first'),
      writeNote(vault, 'ideas/race.md', { id: 'idea-2' }, 'second'),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // The loser's rejection should be a WriteNotePathError about existence.
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(WriteNotePathError);
    expect((err as Error).message).toMatch(/already exists/);

    // Winner's content is on disk, verbatim.
    const raw = await fsp.readFile(path.join(vault, 'ideas/race.md'), 'utf8');
    expect(raw).toMatch(/first|second/);
  });

  it('tmp-file suffix is collision-safe under bursty concurrent writes', async () => {
    // 50 parallel writes to distinct paths in the same directory should all
    // succeed — the random tmp suffix prevents collisions that a
    // time-plus-pid suffix would hit under a busy event loop.
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        writeNote(vault, `ideas/burst-${i}.md`, { id: `idea-${i}` }, `body ${i}`),
      ),
    );
    const dir = await fsp.readdir(path.join(vault, 'ideas'));
    const mdFiles = dir.filter((f) => f.endsWith('.md'));
    const tmpFiles = dir.filter((f) => f.includes('.tmp'));
    expect(mdFiles.length).toBe(50);
    expect(tmpFiles.length).toBe(0);
  });
});

describe('readNote', () => {
  it('returns frontmatter + body for an existing note', async () => {
    await writeNote(
      vault,
      'ideas/x.md',
      { id: 'idea-1', state: 'nascent' },
      'Body text\n',
    );
    const r = readNote(vault, 'ideas/x.md');
    expect(r.exists).toBe(true);
    expect(r.frontmatter.id).toBe('idea-1');
    expect(r.frontmatter.state).toBe('nascent');
    expect(r.body.trim()).toBe('Body text');
  });

  it('returns exists:false for missing notes (no throw)', () => {
    const r = readNote(vault, 'ideas/does-not-exist.md');
    expect(r.exists).toBe(false);
    expect(r.frontmatter).toEqual({});
    expect(r.body).toBe('');
  });
});

describe('writeNote → readNote round-trip', () => {
  it('preserves string frontmatter values exactly', async () => {
    const fm = {
      id: 'idea-a1b2c3d4',
      state: 'nascent',
      type: 'idea',
      title: 'Test with "quotes" and em-dash —',
    };
    await writeNote(vault, 'ideas/r.md', fm, 'body');
    const r = readNote(vault, 'ideas/r.md');

    // gray-matter is known to preserve string roundtrips. This guards against
    // accidental regression (e.g. if we swap matter.stringify for another
    // serializer).
    expect(r.frontmatter).toEqual(fm);
  });

  it('parses YAML arrays from frontmatter', async () => {
    await writeNote(
      vault,
      'ideas/arr.md',
      { id: 'idea-1', tags: ['alpha', 'beta'] },
      'x',
    );
    const raw = await fsp.readFile(path.join(vault, 'ideas/arr.md'), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.tags).toEqual(['alpha', 'beta']);
  });
});
