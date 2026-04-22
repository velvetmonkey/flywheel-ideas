import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnCliCell, type SpawnCellInput } from '../src/index.js';

const MOCK_CLI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-cli',
  'mock-claude.mjs',
);

function baseInput(overrides: Partial<SpawnCellInput> = {}): SpawnCellInput {
  return {
    cli: 'claude',
    argv: [],
    stdin_prompt: 'hello from test',
    timeout_ms: 10_000,
    spawn_prefix: ['node', MOCK_CLI],
    ...overrides,
  };
}

let tmpdir: string;
beforeEach(async () => {
  tmpdir = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-spawn-'));
});
afterEach(async () => {
  await fsp.rm(tmpdir, { recursive: true, force: true });
});

describe('spawnCliCell — happy path', () => {
  it('captures stdout of a normal mock exit', async () => {
    const result = await spawnCliCell(baseInput());
    expect(result.exit_code).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.was_killed_by_dispatcher).toBe(false);
    expect(result.exceeded_max_buffer).toBe(false);
    expect(result.stdout).toContain('"type":"result"');
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('passes stdin to the child', async () => {
    const echoTarget = path.join(tmpdir, 'echo.txt');
    await spawnCliCell(
      baseInput({
        stdin_prompt: 'echo-me-please',
        env_override: { FLYWHEEL_TEST_ECHO_STDIN_TO: echoTarget },
      }),
    );
    const echoed = await fsp.readFile(echoTarget, 'utf8');
    expect(echoed).toBe('echo-me-please');
  });

  it('duration_ms is monotonic and reasonable', async () => {
    const result = await spawnCliCell(baseInput());
    expect(result.duration_ms).toBeLessThan(5_000);
  });
});

describe('spawnCliCell — stderr handling', () => {
  it('captures stderr tail', async () => {
    const result = await spawnCliCell(
      baseInput({
        env_override: { FLYWHEEL_TEST_STDERR: 'mock diagnostic line\n' },
      }),
    );
    expect(result.stderr_tail).toContain('mock diagnostic line');
  });

  it('stderr_tail bounded for large output', async () => {
    const big = 'X'.repeat(20_000);
    const result = await spawnCliCell(
      baseInput({
        env_override: { FLYWHEEL_TEST_STDERR: big },
      }),
    );
    // tail caps ~4KB plus slight buffer from compaction headroom
    expect(result.stderr_tail.length).toBeLessThanOrEqual(4200);
  });
});

describe('spawnCliCell — timeout', () => {
  it('hang → SIGTERM on linux/mac, taskkill on windows; was_killed_by_dispatcher=true', async () => {
    const result = await spawnCliCell(
      baseInput({
        env_override: { FLYWHEEL_TEST_HANG_MS: '5000' },
        timeout_ms: 300,
        kill_grace_ms: 500,
      }),
    );
    expect(result.was_killed_by_dispatcher).toBe(true);
    if (process.platform !== 'win32') {
      expect(result.signal === 'SIGTERM' || result.signal === 'SIGKILL').toBe(true);
    }
    expect(result.duration_ms).toBeGreaterThanOrEqual(300);
    expect(result.duration_ms).toBeLessThan(5_000);
  }, 10_000);

  it('SIGKILL escalation on linux when child ignores SIGTERM', async () => {
    if (process.platform === 'win32') return; // N/A — taskkill /F is immediate
    const result = await spawnCliCell(
      baseInput({
        env_override: {
          FLYWHEEL_TEST_HANG_MS: '10000',
          FLYWHEEL_TEST_IGNORE_SIGTERM: '1',
        },
        timeout_ms: 200,
        kill_grace_ms: 500,
      }),
    );
    expect(result.was_killed_by_dispatcher).toBe(true);
    expect(result.signal).toBe('SIGKILL');
  }, 15_000);
});

describe('spawnCliCell — maxBuffer enforcement', () => {
  it('kills child when stdout exceeds FLYWHEEL_IDEAS_MAX_BUFFER_BYTES', async () => {
    // Parent process reads FLYWHEEL_IDEAS_MAX_BUFFER_BYTES, not the child.
    const prev = process.env.FLYWHEEL_IDEAS_MAX_BUFFER_BYTES;
    process.env.FLYWHEEL_IDEAS_MAX_BUFFER_BYTES = '50000';
    try {
      const result = await spawnCliCell(
        baseInput({
          env_override: { FLYWHEEL_TEST_STDOUT_BYTES: '200000' },
          timeout_ms: 10_000,
        }),
      );
      expect(result.exceeded_max_buffer).toBe(true);
      expect(result.was_killed_by_dispatcher).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.FLYWHEEL_IDEAS_MAX_BUFFER_BYTES;
      else process.env.FLYWHEEL_IDEAS_MAX_BUFFER_BYTES = prev;
    }
  }, 15_000);
});

describe('spawnCliCell — exit code surfaces', () => {
  it('non-zero exit without timeout', async () => {
    const result = await spawnCliCell(
      baseInput({
        env_override: {
          FLYWHEEL_TEST_EXIT: '7',
          FLYWHEEL_TEST_STDOUT_RAW: '', // skip normal output
        },
      }),
    );
    expect(result.exit_code).toBe(7);
    expect(result.was_killed_by_dispatcher).toBe(false);
  });

  it('spawn error (ENOENT) surfaces via stderr + null exit', async () => {
    const result = await spawnCliCell({
      cli: 'claude',
      argv: [],
      stdin_prompt: 'x',
      timeout_ms: 2_000,
      binary_override: '/nonexistent/binary/that-does-not-exist-0x42',
    });
    expect(result.exit_code).toBeNull();
    expect(result.stderr_tail).toContain('[spawn error]');
  });
});
