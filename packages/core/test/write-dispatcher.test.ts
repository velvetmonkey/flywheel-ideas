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
} from '../src/write/index.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-write-dispatch-'));
  __resetWritePathForTests();
  delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
});

afterEach(async () => {
  await fsp.rm(tmp, { recursive: true, force: true });
  __resetWritePathForTests();
});

describe('writeNote dispatcher', () => {
  it('uses direct-fs when active tier is direct-fs', async () => {
    __setWritePathForTests({ active: 'direct-fs', reason: 'disabled' });
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

  it('falls back to direct-fs when mcp-subprocess tier is selected but binary missing', async () => {
    // Tier is mcp-subprocess but we point at a missing binary so
    // writeNoteViaSubprocess returns skipped. The dispatcher should still
    // land the write via direct-fs.
    __setWritePathForTests({ active: 'mcp-subprocess', reason: 'subprocess_ok' });
    process.env.FLYWHEEL_MEMORY_BIN = '/nonexistent/flywheel-memory';
    const result = await writeNote(
      tmp,
      'ideas/b.md',
      { type: 'idea', title: 'b' },
      '# b\n',
    );
    expect(result.write_path).toBe('direct-fs');
    const full = path.join(tmp, 'ideas/b.md');
    const raw = await fsp.readFile(full, 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.title).toBe('b');
    delete process.env.FLYWHEEL_MEMORY_BIN;
  });
});

describe('patchFrontmatter dispatcher', () => {
  it('uses direct-fs when active tier is direct-fs', async () => {
    __setWritePathForTests({ active: 'direct-fs', reason: 'disabled' });
    // Seed a file first via direct-fs writeNote
    await writeNote(tmp, 'ideas/c.md', { type: 'idea', title: 'c', state: 'nascent' }, '# c\n');
    const result = await patchFrontmatter(tmp, 'ideas/c.md', { state: 'explored' });
    expect(result.write_path).toBe('direct-fs');
    const raw = await fsp.readFile(path.join(tmp, 'ideas/c.md'), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.state).toBe('explored');
  });

  it('falls back to direct-fs when mcp-subprocess tier fails', async () => {
    __setWritePathForTests({ active: 'direct-fs', reason: 'disabled' });
    await writeNote(
      tmp,
      'ideas/d.md',
      { type: 'idea', title: 'd', state: 'nascent' },
      '# d\n',
    );

    __setWritePathForTests({ active: 'mcp-subprocess', reason: 'subprocess_ok' });
    process.env.FLYWHEEL_MEMORY_BIN = '/nonexistent/flywheel-memory';
    const result = await patchFrontmatter(tmp, 'ideas/d.md', { state: 'explored' });
    expect(result.write_path).toBe('direct-fs');
    const raw = await fsp.readFile(path.join(tmp, 'ideas/d.md'), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.state).toBe('explored');
    delete process.env.FLYWHEEL_MEMORY_BIN;
  });
});
