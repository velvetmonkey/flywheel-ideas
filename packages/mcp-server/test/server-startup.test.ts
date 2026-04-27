/**
 * Server-startup integration tests (v0.4.0 — flywheel-memory required).
 *
 * Spawn the bundled `dist/index.js` with various env knobs and assert:
 *   - Production boot (no FLYWHEEL_IDEAS_TEST_MODE) hard-fails when the
 *     bridge is unreachable.
 *   - Boot succeeds when the bridge mock is supplied.
 *   - Test-mode boot (FLYWHEEL_IDEAS_TEST_MODE=1) skips the bridge entirely
 *     so unit/integration tests don't need a real flywheel-memory binary.
 *
 * These are e2e against the bundled binary, not unit tests, so they require
 * `npm run build` to have run.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_BIN = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'dist',
  'index.js',
);

// Wrapper that exposes both `doctor` (memory-bridge) and the write tools
// (`note`, `vault_update_frontmatter`) the v0.4.0 probe requires. Plain
// mock-flywheel-memory.mjs only registers `doctor` by default, which would
// trip the hard-fail probe in production-mode tests.
const MOCK_FM = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'core',
  'test',
  'fixtures',
  'mock-flywheel-memory-full.mjs',
);

let vaultPath: string;
let child: ChildProcessWithoutNullStreams | null = null;

beforeAll(async () => {
  // Sanity — the bundle must exist (npm run build).
  await fsp.access(SERVER_BIN);
});

beforeEach(async () => {
  vaultPath = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-startup-'));
  await fsp.mkdir(path.join(vaultPath, '.flywheel'), { recursive: true });
});

afterEach(async () => {
  if (child) {
    if (child.exitCode === null) {
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      // Wait for child to fully exit so its better-sqlite3 file handles
      // release. Otherwise Windows EBUSY on unlink ideas.db.
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 2000);
        t.unref();
        child!.once('close', () => {
          clearTimeout(t);
          resolve();
        });
      });
    }
    child = null;
  }
  // Windows: even after process exit, file handles may linger briefly.
  // Retry the rm a few times before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fsp.rm(vaultPath, { recursive: true, force: true });
      break;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
});

interface SpawnResult {
  stderr: string;
  initResponse: string | null;
  exitCode: number | null;
}

async function spawnAndInit(env: Record<string, string>): Promise<SpawnResult> {
  // Important: do NOT pass FLYWHEEL_IDEAS_TEST_MODE here unless the test
  // explicitly opts in — these tests exercise the production startup path.
  child = spawn('node', [SERVER_BIN], {
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      VAULT_PATH: vaultPath,
      ...env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;

  let stderr = '';
  let stdout = '';
  child.stderr.on('data', (c: Buffer) => (stderr += c.toString('utf8')));
  child.stdout.on('data', (c: Buffer) => (stdout += c.toString('utf8')));

  // Send initialize request
  const initReq = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'startup-test', version: '0' },
    },
  };
  child.stdin.write(JSON.stringify(initReq) + '\n');

  // Wait for initialize response OR exit (hard-fail path) — up to 30s
  // (bridge probe can hold us up to 60s default but boot tests bump down).
  const initResponse = await waitForLineOrExit(
    () => stdout,
    (line) => line.includes('"id":1'),
    () => child!.exitCode,
    30_000,
  );

  return { stderr, initResponse, exitCode: child.exitCode };
}

async function waitForLineOrExit(
  getBuf: () => string,
  predicate: (line: string) => boolean,
  getExit: () => number | null,
  timeoutMs: number,
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const buf = getBuf();
    for (const line of buf.split('\n')) {
      if (predicate(line)) return line;
    }
    if (getExit() !== null) return null;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

describe('server startup — v0.4.0 required-bridge', () => {
  it('hard-fails (exit 1) when flywheel-memory binary is missing in production', async () => {
    const { stderr, initResponse, exitCode } = await spawnAndInit({
      FLYWHEEL_MEMORY_BIN: '/nonexistent/path/flywheel-memory',
      FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS: '500',
    });
    expect(initResponse).toBeNull();
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('FlywheelMemoryRequiredError');
    expect(stderr).toContain('@velvetmonkey/flywheel-memory');
  }, 30_000);

  it('boots successfully when the mock bridge is on PATH', async () => {
    const { stderr, initResponse } = await spawnAndInit({
      FLYWHEEL_MEMORY_BIN: MOCK_FM,
      FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS: '8000',
    });
    expect(initResponse).not.toBeNull();
    expect(stderr).not.toContain('FlywheelMemoryRequiredError');
  }, 30_000);

  it('boots fast in test mode (FLYWHEEL_IDEAS_TEST_MODE=1) without spawning the bridge', async () => {
    const start = Date.now();
    const { initResponse } = await spawnAndInit({
      FLYWHEEL_IDEAS_TEST_MODE: '1',
    });
    const elapsed = Date.now() - start;
    expect(initResponse).not.toBeNull();
    // No bridge spawn — should be <2s start (allow CI overhead)
    expect(elapsed).toBeLessThan(2000);
  }, 10_000);

  // Skip the POSIX symlink test on Windows. Symlink creation on Windows
  // requires Developer Mode or admin (alpha.4 finding). Windows npm doesn't
  // even use symlinks for global bins — it generates `.cmd` shims, which
  // the next test exercises.
  it.skipIf(process.platform === 'win32')('boots when invoked through a PATH-style symlink (alpha.2 dogfood regression, POSIX path)', async () => {
    const symlinkPath = path.join(vaultPath, 'flywheel-ideas-mcp-symlink');
    await fsp.symlink(SERVER_BIN, symlinkPath);
    await fsp.chmod(symlinkPath, 0o755).catch(() => {});

    child = spawn('node', [symlinkPath], {
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        VAULT_PATH: vaultPath,
        FLYWHEEL_IDEAS_TEST_MODE: '1', // skip bridge to keep this fast
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;

    let stdout = '';
    child.stdout.on('data', (c: Buffer) => (stdout += c.toString('utf8')));

    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'symlink-test', version: '0' },
        },
      }) + '\n',
    );

    const initResponse = await waitForLineOrExit(
      () => stdout,
      (line) => line.includes('"id":1'),
      () => child!.exitCode,
      5_000,
    );
    expect(initResponse).not.toBeNull();
    expect(initResponse).toContain('"id":1');
  }, 10_000);

  // The Windows analogue of the symlink test. npm install -g on Windows
  // generates a `.cmd` shim that does `node "<full path to dist/index.js>" %*`.
  it.skipIf(process.platform !== 'win32')('boots when invoked through a Windows .cmd shim (Windows install path)', async () => {
    const cmdShim = path.join(vaultPath, 'flywheel-ideas-mcp.cmd');
    await fsp.writeFile(cmdShim, `@node "${SERVER_BIN}" %*\r\n`);

    child = spawn('cmd.exe', ['/c', cmdShim], {
      env: {
        PATH: process.env.PATH ?? '',
        USERPROFILE: process.env.USERPROFILE ?? '',
        APPDATA: process.env.APPDATA ?? '',
        VAULT_PATH: vaultPath,
        FLYWHEEL_IDEAS_TEST_MODE: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;

    let stdout = '';
    child.stdout.on('data', (c: Buffer) => (stdout += c.toString('utf8')));

    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'cmd-shim-test', version: '0' },
        },
      }) + '\n',
    );

    const initResponse = await waitForLineOrExit(
      () => stdout,
      (line) => line.includes('"id":1'),
      () => child!.exitCode,
      5_000,
    );
    expect(initResponse).not.toBeNull();
    expect(initResponse).toContain('"id":1');
  }, 10_000);
});
