/**
 * Server-startup integration tests (M14).
 *
 * Spawn the bundled `dist/index.js` with various env knobs and assert:
 *   - the memory-bridge stderr warning lands when expected
 *   - the MCP server still answers `initialize` after the bridge attempt
 *
 * These are e2e against the bundled binary, not unit tests, so they require
 * `npm run build` to have run. Vitest's globalSetup or just CI ordering
 * handles that.
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

const MOCK_FM = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'core',
  'test',
  'fixtures',
  'mock-flywheel-memory.mjs',
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
}

async function spawnAndInit(env: Record<string, string>): Promise<SpawnResult> {
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

  // Wait for initialize response (or up to 25s — bridge can hold us up to 15s)
  const initResponse = await waitForLine(
    () => stdout,
    (line) => line.includes('"id":1'),
    25_000,
  );

  return { stderr, initResponse };
}

async function waitForLine(
  getBuf: () => string,
  predicate: (line: string) => boolean,
  timeoutMs: number,
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const buf = getBuf();
    for (const line of buf.split('\n')) {
      if (predicate(line)) return line;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

describe('server startup — memory-bridge', () => {
  it('boots + warns on stderr when flywheel-memory binary is missing', async () => {
    const { stderr, initResponse } = await spawnAndInit({
      FLYWHEEL_MEMORY_BIN: '/nonexistent/path/flywheel-memory',
      FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS: '500',
    });
    expect(initResponse).not.toBeNull();
    expect(initResponse).toContain('"id":1');
    expect(stderr).toContain('memory-bridge skipped (binary_not_found');
    expect(stderr).toContain('Install @velvetmonkey/flywheel-memory');
  }, 30_000);

  it('boots silently (no memory-bridge warning) when registration succeeds via mock', async () => {
    const { stderr, initResponse } = await spawnAndInit({
      FLYWHEEL_MEMORY_BIN: MOCK_FM,
      FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS: '8000',
    });
    expect(initResponse).not.toBeNull();
    expect(stderr).not.toContain('memory-bridge skipped');
  }, 30_000);

  it('boots fast with no spawn attempt when FLYWHEEL_IDEAS_MEMORY_BRIDGE=0', async () => {
    const start = Date.now();
    const { stderr, initResponse } = await spawnAndInit({
      FLYWHEEL_IDEAS_MEMORY_BRIDGE: '0',
    });
    const elapsed = Date.now() - start;
    expect(initResponse).not.toBeNull();
    expect(stderr).toContain('memory-bridge skipped (disabled)');
    // Fast path — no subprocess spawn should mean <2s start (allow CI overhead)
    expect(elapsed).toBeLessThan(2000);
  }, 10_000);

  // Skip the POSIX symlink test on Windows. Symlink creation on Windows
  // requires Developer Mode or admin (alpha.4 finding). Windows npm doesn't
  // even use symlinks for global bins — it generates `.cmd` shims, which
  // the next test exercises.
  it.skipIf(process.platform === 'win32')('boots when invoked through a PATH-style symlink (alpha.2 dogfood regression, POSIX path)', async () => {
    // alpha.2 silently no-op'd when invoked via the bin symlink npm install
    // -g creates on POSIX. Mirror that: symlink the dist binary into tmpdir
    // and spawn via the symlink. The fixed isDirectInvocation must resolve
    // realpath.
    const symlinkPath = path.join(vaultPath, 'flywheel-ideas-mcp-symlink');
    await fsp.symlink(SERVER_BIN, symlinkPath);
    await fsp.chmod(symlinkPath, 0o755).catch(() => {});

    child = spawn('node', [symlinkPath], {
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        VAULT_PATH: vaultPath,
        FLYWHEEL_IDEAS_MEMORY_BRIDGE: '0', // skip the bridge to keep this fast
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

    const initResponse = await waitForLine(
      () => stdout,
      (line) => line.includes('"id":1'),
      5_000,
    );
    expect(initResponse).not.toBeNull();
    expect(initResponse).toContain('"id":1');
  }, 10_000);

  // The Windows analogue of the symlink test. npm install -g on Windows
  // generates a `.cmd` shim that does `node "<full path to dist/index.js>" %*`.
  // The shim makes argv[1] an absolute path to the .js file (no symlink
  // realpath dance), which exercises the simpler equality branch of
  // isDirectInvocation. Alpha.4 fix 3.
  it.skipIf(process.platform !== 'win32')('boots when invoked through a Windows .cmd shim (Windows install path)', async () => {
    const cmdShim = path.join(vaultPath, 'flywheel-ideas-mcp.cmd');
    await fsp.writeFile(cmdShim, `@node "${SERVER_BIN}" %*\r\n`);

    child = spawn('cmd.exe', ['/c', cmdShim], {
      env: {
        PATH: process.env.PATH ?? '',
        USERPROFILE: process.env.USERPROFILE ?? '',
        APPDATA: process.env.APPDATA ?? '',
        VAULT_PATH: vaultPath,
        FLYWHEEL_IDEAS_MEMORY_BRIDGE: '0',
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

    const initResponse = await waitForLine(
      () => stdout,
      (line) => line.includes('"id":1'),
      5_000,
    );
    expect(initResponse).not.toBeNull();
    expect(initResponse).toContain('"id":1');
  }, 10_000);
});
