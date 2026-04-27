import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  __resetWritePathForTests,
  __setWritePathForTests,
  getActiveWritePath,
  getProbeOutcome,
  probeWritePath,
} from '../src/write/index.js';

const MOCK_FM = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-flywheel-memory.mjs',
);

let tmp: string;

beforeEach(async () => {
  tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-write-probe-'));
  delete process.env.FLYWHEEL_MEMORY_BIN;
  delete process.env.FLYWHEEL_IDEAS_WRITE_PROBE_TIMEOUT_MS;
  __resetWritePathForTests();
});

afterEach(async () => {
  await fsp.rm(tmp, { recursive: true, force: true });
  __resetWritePathForTests();
});

describe('probeWritePath', () => {
  it('defaults to direct-fs when never probed', () => {
    expect(getActiveWritePath()).toBe('direct-fs');
    expect(getProbeOutcome().reason).toBe('not_probed');
  });

  it('returns binary_not_found for a missing absolute binary', async () => {
    const outcome = await probeWritePath(tmp, { binary: '/nonexistent/flywheel-memory' });
    expect(outcome.active).toBe('direct-fs');
    expect(outcome.reason).toBe('binary_not_found');
  });

  it('selects mcp-subprocess when mock exposes both write tools', async () => {
    const env = {
      MOCK_FM_SUPPORTS_NOTE: '1',
      MOCK_FM_SUPPORTS_FRONTMATTER: '1',
    };
    const outcome = await probeWritePath(tmp, {
      binary: 'node',
      args: [MOCK_FM],
      env,
    });
    expect(outcome.active).toBe('mcp-subprocess');
    expect(outcome.reason).toBe('subprocess_ok');
    expect(getActiveWritePath()).toBe('mcp-subprocess');
  });

  it('falls back to direct-fs when write tools are missing', async () => {
    // Mock without MOCK_FM_SUPPORTS_* → only `doctor` is registered
    const outcome = await probeWritePath(tmp, { binary: 'node', args: [MOCK_FM], env: {} });
    expect(outcome.active).toBe('direct-fs');
    expect(outcome.reason).toBe('tools_missing');
  });

  it('__setWritePathForTests lets tests force the tier', () => {
    __setWritePathForTests({ active: 'mcp-subprocess', reason: 'subprocess_ok', binary: 'flywheel-memory' });
    expect(getActiveWritePath()).toBe('mcp-subprocess');
    __resetWritePathForTests();
    expect(getActiveWritePath()).toBe('direct-fs');
  });
});
