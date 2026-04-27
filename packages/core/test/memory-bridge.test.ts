import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IDEAS_CATEGORIES,
  registerCustomCategories,
} from '../src/memory-bridge.js';

const MOCK_FM = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-flywheel-memory.mjs',
);

let tmpdir: string;
let vaultPath: string;

beforeEach(async () => {
  tmpdir = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-mb-'));
  vaultPath = path.join(tmpdir, 'vault');
  await fsp.mkdir(path.join(vaultPath, '.flywheel'), { recursive: true });

  // Reset env knobs that may leak between tests
  delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS;
  delete process.env.FLYWHEEL_MEMORY_BIN;
});

afterEach(async () => {
  await fsp.rm(tmpdir, { recursive: true, force: true });
});

function asMock(env?: Record<string, string>): {
  binary: string;
  args: string[];
  env?: Record<string, string>;
} {
  return { binary: 'node', args: [MOCK_FM], env };
}

describe('registerCustomCategories — happy path', () => {
  it('registers all four categories when flywheel-memory has no pre-existing customs', async () => {
    const result = await registerCustomCategories(vaultPath, asMock());
    expect(result.status).toBe('registered');
    if (result.status !== 'registered') return;
    expect(result.categories.sort()).toEqual(Object.keys(IDEAS_CATEGORIES).sort());
    expect(result.preserved).toEqual([]);
  });

  it('two back-to-back calls both succeed (idempotent)', async () => {
    const a = await registerCustomCategories(vaultPath, asMock());
    const b = await registerCustomCategories(vaultPath, asMock());
    expect(a.status).toBe('registered');
    expect(b.status).toBe('registered');
  });
});

describe('registerCustomCategories — merge preservation (gemini CRITICAL)', () => {
  it('preserves user-defined custom categories alongside ours', async () => {
    const env = {
      MOCK_FM_GET_PAYLOAD: JSON.stringify({
        vault_name: 'mock-vault',
        custom_categories: {
          recipe: { type_boost: 1 },
          paper: { type_boost: 3 },
        },
      }),
    };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('registered');
    if (result.status !== 'registered') return;
    expect(result.preserved.sort()).toEqual(['paper', 'recipe']);
    expect(result.categories.sort()).toEqual(Object.keys(IDEAS_CATEGORIES).sort());
  });

  it('forwards merged value to set so user keys + ours both reach flywheel-memory', async () => {
    const invokeLog = path.join(tmpdir, 'invocations.jsonl');
    const env = {
      MOCK_FM_GET_PAYLOAD: JSON.stringify({
        vault_name: 'mock-vault',
        custom_categories: {
          recipe: { type_boost: 1 },
          paper: { type_boost: 3 },
        },
      }),
      MOCK_FM_INVOKE_LOG: invokeLog,
    };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('registered');

    const lines = (await fsp.readFile(invokeLog, 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);
    const getCall = JSON.parse(lines[0]) as {
      tool: string;
      args: { action: string; mode: string };
    };
    expect(getCall.tool).toBe('doctor');
    expect(getCall.args.action).toBe('config');
    expect(getCall.args.mode).toBe('get');
    const setCall = JSON.parse(lines[1]) as {
      tool: string;
      args: { action: string; mode: string; key: string; value: Record<string, unknown> };
    };
    expect(setCall.tool).toBe('doctor');
    expect(setCall.args.action).toBe('config');
    expect(setCall.args.mode).toBe('set');
    expect(setCall.args.key).toBe('custom_categories');
    expect(Object.keys(setCall.args.value).sort()).toEqual(
      ['assumption', 'council_view', 'idea', 'outcome', 'paper', 'recipe'],
    );
  });

  it('our keys win when user has the same names with different values', async () => {
    const invokeLog = path.join(tmpdir, 'invocations.jsonl');
    const env = {
      MOCK_FM_GET_PAYLOAD: JSON.stringify({
        vault_name: 'mock-vault',
        custom_categories: {
          idea: { type_boost: 99 },
        },
      }),
      MOCK_FM_INVOKE_LOG: invokeLog,
    };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('registered');

    const lines = (await fsp.readFile(invokeLog, 'utf8')).trim().split('\n');
    const setCall = JSON.parse(lines[1]) as {
      args: { value: Record<string, { type_boost: number }> };
    };
    expect(setCall.args.value.idea).toEqual({ type_boost: 2 });
  });

  it('still issues set when get returns config without custom_categories key (real flywheel-memory v2.11+)', async () => {
    // Real flywheel-memory v2.11.2 omits `custom_categories` from get response
    // until something has been set. Treat omission as empty object.
    const invokeLog = path.join(tmpdir, 'invocations.jsonl');
    const env = {
      MOCK_FM_GET_PAYLOAD: JSON.stringify({
        vault_name: 'mock-vault',
        // no custom_categories key at all
      }),
      MOCK_FM_INVOKE_LOG: invokeLog,
    };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('registered');
    if (result.status !== 'registered') return;
    expect(result.preserved).toEqual([]);
  });
});

describe('registerCustomCategories — failure modes', () => {
  it('skips with binary_not_found when binary is missing', async () => {
    const result = await registerCustomCategories(vaultPath, {
      binary: '/nonexistent/path/to/flywheel-memory',
    });
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('binary_not_found');
  });

  it('skips with timeout when mock hangs past timeout budget', async () => {
    const result = await registerCustomCategories(vaultPath, {
      ...asMock({ MOCK_FM_HANG_MS: '5000' }),
      timeoutMs: 300,
    });
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('timeout');
  }, 10_000);

  it('skips with tool_returned_error when set returns {error: ...}', async () => {
    const env = {
      MOCK_FM_SET_PAYLOAD: JSON.stringify({ error: 'Unknown config key: "custom_categories"' }),
    };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('tool_returned_error');
    expect(result.detail).toContain('Unknown config key');
  });

  it('skips with invalid_response when get returns malformed JSON', async () => {
    const env = { MOCK_FM_GET_PAYLOAD: 'not-json-at-all' };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('invalid_response');
  });

  it('skips with invalid_response when get returns empty content', async () => {
    const env = { MOCK_FM_NO_CONTENT: '1' };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('invalid_response');
  });

  it('skips with invalid_response when set echo lacks our keys', async () => {
    const env = {
      MOCK_FM_SET_PAYLOAD: JSON.stringify({
        vault_name: 'mock-vault',
        custom_categories: { unrelated: { type_boost: 1 } },
      }),
    };
    const result = await registerCustomCategories(vaultPath, asMock(env));
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('invalid_response');
    expect(result.detail).toContain('set echo missing');
  });
});

describe('registerCustomCategories — env handling', () => {
  it('respects FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS env override', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS = '300';
    const result = await registerCustomCategories(vaultPath, asMock({ MOCK_FM_HANG_MS: '5000' }));
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('timeout');
  }, 10_000);

  it('explicit opts.timeoutMs overrides env', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS = '60000';
    const result = await registerCustomCategories(vaultPath, {
      ...asMock({ MOCK_FM_HANG_MS: '5000' }),
      timeoutMs: 300,
    });
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('timeout');
  }, 10_000);

  it('FLYWHEEL_MEMORY_BIN env overrides default binary', async () => {
    process.env.FLYWHEEL_MEMORY_BIN = '/nonexistent/from-env';
    const result = await registerCustomCategories(vaultPath);
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('binary_not_found');
    expect(result.detail).toBe('/nonexistent/from-env');
  });

  it('explicit opts.binary overrides FLYWHEEL_MEMORY_BIN env', async () => {
    process.env.FLYWHEEL_MEMORY_BIN = '/nonexistent/from-env';
    const result = await registerCustomCategories(vaultPath, asMock());
    expect(result.status).toBe('registered');
  });

  it('does NOT inherit FLYWHEEL_VAULTS / FLYWHEEL_TOOLS / FLYWHEEL_PRESET into the child env (gemini MEDIUM)', async () => {
    const envDump = path.join(tmpdir, 'env-dump.json');
    const prev = {
      FLYWHEEL_VAULTS: process.env.FLYWHEEL_VAULTS,
      FLYWHEEL_TOOLS: process.env.FLYWHEEL_TOOLS,
      FLYWHEEL_PRESET: process.env.FLYWHEEL_PRESET,
    };
    process.env.FLYWHEEL_VAULTS = 'other:/other';
    process.env.FLYWHEEL_TOOLS = 'full';
    process.env.FLYWHEEL_PRESET = 'power';
    try {
      const result = await registerCustomCategories(
        vaultPath,
        asMock({ MOCK_FM_ENV_DUMP: envDump }),
      );
      expect(result.status).toBe('registered');
      const dumped = JSON.parse(await fsp.readFile(envDump, 'utf8')) as Record<string, string>;
      expect(dumped.VAULT_PATH).toBe(vaultPath);
      expect(dumped.FLYWHEEL_TRANSPORT).toBe('stdio');
      expect(dumped.FLYWHEEL_VAULTS).toBeUndefined();
      expect(dumped.FLYWHEEL_TOOLS).toBeUndefined();
      expect(dumped.FLYWHEEL_PRESET).toBeUndefined();
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe('registerCustomCategories — process cleanup', () => {
  it('does not leak a child PID after a timeout (gemini HIGH)', async () => {
    const pidFile = path.join(tmpdir, 'mock.pid');
    // Use MOCK_FM_IGNORE_SIGTERM so cleanup MUST escalate to SIGKILL.
    const result = await registerCustomCategories(vaultPath, {
      ...asMock({
        MOCK_FM_HANG_MS: '15000',
        MOCK_FM_IGNORE_SIGTERM: '1',
        MOCK_FM_PID_FILE: pidFile,
      }),
      timeoutMs: 300,
    });
    expect(result.status).toBe('skipped');
    if (result.status !== 'skipped') return;
    expect(result.reason).toBe('timeout');

    // Mock should have written its pid before going to sleep
    const pidStr = await fsp.readFile(pidFile, 'utf8');
    const pid = Number.parseInt(pidStr.trim(), 10);
    expect(Number.isFinite(pid)).toBe(true);

    // Wait for SDK's own SIGTERM→2s grace→SIGKILL escalation. Alpha.4
    // dropped our PID-level SIGKILL fallback, so we rely entirely on the
    // SDK's lifecycle. SDK close() takes up to 4s end-to-end.
    await new Promise((r) => setTimeout(r, 5000));

    // Direct PID check — no shell, no cmdline matching.
    expect(isAlive(pid)).toBe(false);
  }, 20_000);

  it('debug stderr surfaces transport close errors when FLYWHEEL_IDEAS_DEBUG=1', async () => {
    // Intercept stderr writes for the duration of the call.
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const prevDebug = process.env.FLYWHEEL_IDEAS_DEBUG;
    process.env.FLYWHEEL_IDEAS_DEBUG = '1';
    try {
      // Happy-path call; SDK close should be clean → no debug output expected.
      const result = await registerCustomCategories(vaultPath, asMock());
      expect(result.status).toBe('registered');
      const debugLines = writeSpy.mock.calls
        .map((c) => String(c[0]))
        .filter((s) => s.includes('memory-bridge close error'));
      expect(debugLines).toEqual([]);
    } finally {
      writeSpy.mockRestore();
      if (prevDebug === undefined) delete process.env.FLYWHEEL_IDEAS_DEBUG;
      else process.env.FLYWHEEL_IDEAS_DEBUG = prevDebug;
    }
  });
});

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
