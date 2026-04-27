import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  __resetWritePathForTests,
  __setWritePathForTests,
  patchFrontmatter,
  writeNote,
  WriteSubprocessFailedError,
} from '../src/write/index.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-write-dispatch-'));
  __resetWritePathForTests();
});

afterEach(async () => {
  await fsp.rm(tmp, { recursive: true, force: true });
  __resetWritePathForTests();
});

describe('writeNote dispatcher', () => {
  it('uses direct-fs when active tier is direct-fs', async () => {
    __setWritePathForTests({ active: 'direct-fs', reason: 'not_probed', binary: 'flywheel-memory' });
    const result = await writeNote(
      tmp,
      'ideas/a.md',
      { type: 'idea', title: 'a' },
      '# a\n',
    );
    expect(result.write_path).toBe('direct-fs');
    const full = path.join(tmp, 'ideas/a.md');
    const raw = await fsp.readFile(full, 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.title).toBe('a');
  });

  it('throws WriteSubprocessFailedError when mcp-subprocess tier is active but the subprocess fails (no silent direct-fs fallback)', async () => {
    // v0.4.0 — mid-session subprocess failure surfaces as a hard error,
    // not a silent direct-fs fallback (Claude-mitigation #7).
    __setWritePathForTests({ active: 'mcp-subprocess', reason: 'subprocess_ok', binary: '/nonexistent/flywheel-memory' });
    process.env.FLYWHEEL_MEMORY_BIN = '/nonexistent/flywheel-memory';
    try {
      await expect(
        writeNote(tmp, 'ideas/b.md', { type: 'idea', title: 'b' }, '# b\n'),
      ).rejects.toBeInstanceOf(WriteSubprocessFailedError);
      // The vault file should NOT have been written via direct-fs.
      const full = path.join(tmp, 'ideas/b.md');
      await expect(fsp.access(full)).rejects.toThrow();
    } finally {
      delete process.env.FLYWHEEL_MEMORY_BIN;
    }
  });
});

describe('patchFrontmatter dispatcher', () => {
  it('uses direct-fs when active tier is direct-fs', async () => {
    __setWritePathForTests({ active: 'direct-fs', reason: 'not_probed', binary: 'flywheel-memory' });
    // Seed a file first via direct-fs writeNote
    await writeNote(tmp, 'ideas/c.md', { type: 'idea', title: 'c', state: 'nascent' }, '# c\n');
    const result = await patchFrontmatter(tmp, 'ideas/c.md', { state: 'explored' });
    expect(result.write_path).toBe('direct-fs');
    const raw = await fsp.readFile(path.join(tmp, 'ideas/c.md'), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.state).toBe('explored');
  });

  it('throws WriteSubprocessFailedError when mcp-subprocess tier fails (no silent direct-fs fallback)', async () => {
    __setWritePathForTests({ active: 'direct-fs', reason: 'not_probed', binary: 'flywheel-memory' });
    await writeNote(
      tmp,
      'ideas/d.md',
      { type: 'idea', title: 'd', state: 'nascent' },
      '# d\n',
    );

    __setWritePathForTests({ active: 'mcp-subprocess', reason: 'subprocess_ok', binary: '/nonexistent/flywheel-memory' });
    process.env.FLYWHEEL_MEMORY_BIN = '/nonexistent/flywheel-memory';
    try {
      await expect(
        patchFrontmatter(tmp, 'ideas/d.md', { state: 'explored' }),
      ).rejects.toBeInstanceOf(WriteSubprocessFailedError);
      // Frontmatter on disk must remain unchanged.
      const raw = await fsp.readFile(path.join(tmp, 'ideas/d.md'), 'utf8');
      const parsed = matter(raw);
      expect(parsed.data.state).toBe('nascent');
    } finally {
      delete process.env.FLYWHEEL_MEMORY_BIN;
    }
  });
});
