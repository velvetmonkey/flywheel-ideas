/**
 * Subprocess spawner for council cells (M8).
 *
 * Invariants (each backed by test coverage):
 * - `stdio: ['pipe','pipe','pipe']` — capture stdin, stdout, stderr separately.
 * - **Continuous stdout+stderr consumption via `.on('data')` from first tick** —
 *   prevents the classic pipe deadlock where a child blocks on a full stdout
 *   kernel buffer while the parent waits for stdin to drain.
 * - **`child.stdin.end(prompt)` in a single call** after data listeners are
 *   attached. Fixes the M7-documented codex hang (it waits for stdin EOF even
 *   when prompt is on argv).
 * - `was_killed_by_dispatcher` is set BEFORE the kill signal fires, so a racy
 *   exit event still surfaces the dispatcher's intent to `classifyCliError`.
 * - Timeout kill is platform-branched:
 *     Linux/mac → `process.kill(-pid, 'SIGTERM')` (kills the process group),
 *                 10s grace, then `SIGKILL` to the group.
 *     Windows   → `spawnSync('taskkill', ['/T','/F','/PID', pid])` (tree
 *                 kill, forced; Windows doesn't have POSIX signals).
 *   `detached: true` is the Linux trigger that makes the child its own PGID.
 *   On Windows `detached: true` creates a new console window, which we don't
 *   want; Windows stays with default (attached) and relies on taskkill /T.
 * - `maxBuffer` is enforced on stdout (default 4 MB, env override
 *   `FLYWHEEL_IDEAS_MAX_BUFFER_BYTES`). Exceeding it kills the child and
 *   returns a truncated stdout with `was_killed_by_dispatcher = true` so
 *   callers classify it as a timeout-adjacent failure.
 * - `duration_ms` is always populated.
 */

import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';

const TAIL_BYTES = 4 * 1024;
const DEFAULT_MAX_BUFFER = 4 * 1024 * 1024;
const DEFAULT_KILL_GRACE_MS = 10_000;

export type CliName = 'claude' | 'codex' | 'gemini';

export interface SpawnCellInput {
  cli: CliName;
  /** The argv AFTER the cli name. Must NOT contain idea text (stdin carries that). */
  argv: string[];
  stdin_prompt: string;
  timeout_ms: number;
  kill_grace_ms?: number;
  cwd?: string;
  env_override?: NodeJS.ProcessEnv;
  /**
   * Override the resolved binary (for tests: point at mock-claude.mjs).
   * Default: the CLI name itself (resolved via $PATH by spawn).
   */
  binary_override?: string;
  /**
   * Override the spawn prefix (for tests: ['node', <script_path>] when binary_override
   * is a JS file). When provided, `binary_override` is ignored.
   */
  spawn_prefix?: string[];
}

export interface SpawnResult {
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stdout_tail: string;
  stderr_tail: string;
  was_killed_by_dispatcher: boolean;
  duration_ms: number;
  /** True if the kill was because maxBuffer was exceeded (vs timeout). */
  exceeded_max_buffer: boolean;
}

export async function spawnCliCell(input: SpawnCellInput): Promise<SpawnResult> {
  const maxBuffer = resolveMaxBuffer();
  const killGrace = input.kill_grace_ms ?? DEFAULT_KILL_GRACE_MS;

  const { cmd, args } = resolveCommand(input);

  const started = Date.now();
  let stdoutSize = 0;
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let stderrSize = 0;

  let was_killed_by_dispatcher = false;
  let exceeded_max_buffer = false;

  const child = spawn(cmd, args, {
    cwd: input.cwd,
    env: input.env_override ? { ...process.env, ...input.env_override } : process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    // Linux/mac: detach so the child gets its own PGID; we kill the group.
    // Windows: never detach (would open a new console); rely on taskkill /T.
    detached: process.platform !== 'win32',
    windowsHide: true,
  }) as ChildProcessWithoutNullStreams;

  // Attach data listeners FIRST — prevents pipe deadlock where a blocking
  // child stdout write stalls stdin.end() below.
  child.stdout.on('data', (chunk: Buffer) => {
    stdoutSize += chunk.length;
    if (stdoutSize <= maxBuffer) {
      stdoutChunks.push(chunk);
    } else if (!exceeded_max_buffer) {
      exceeded_max_buffer = true;
      was_killed_by_dispatcher = true;
      killTree(child, 'SIGTERM');
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk);
    stderrSize += chunk.length;
    // Keep only the tail in memory to bound footprint.
    if (stderrSize > TAIL_BYTES * 4) {
      // Compact to the last TAIL_BYTES*2 (headroom for next chunk)
      const combined = Buffer.concat(stderrChunks);
      const keep = combined.subarray(Math.max(0, combined.length - TAIL_BYTES * 2));
      stderrChunks.length = 0;
      stderrChunks.push(keep);
      stderrSize = keep.length;
    }
  });

  // Feed stdin in one call — safe for prompts up to Node's default high-water
  // mark (16KB). Council prompts are well under this. Larger prompts would
  // need write() + 'drain' handling; M8 asserts small prompts via tests.
  try {
    child.stdin.end(input.stdin_prompt);
  } catch {
    // Child may have died before we could write. We still await exit below.
  }

  // Timeout
  const timeoutHandle = setTimeout(() => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    was_killed_by_dispatcher = true;
    killTree(child, 'SIGTERM');
    // Grace period for child to finish write-flush, then SIGKILL on Linux.
    // On Windows taskkill /F already force-kills — grace is moot.
    if (process.platform !== 'win32') {
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          killTree(child, 'SIGKILL');
        }
      }, killGrace).unref();
    }
  }, input.timeout_ms);
  timeoutHandle.unref();

  const { exit_code, signal } = await new Promise<{
    exit_code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    const onDone = (code: number | null, sig: NodeJS.Signals | null): void => {
      clearTimeout(timeoutHandle);
      resolve({ exit_code: code, signal: sig });
    };
    // `close` fires AFTER stdio streams have closed — safer than `exit` for
    // ensuring our on('data') collectors flushed.
    child.once('close', onDone);
    child.once('error', (err) => {
      // spawn() error (e.g., ENOENT). Surface as a nulled exit + record
      // the error on stderr buffer for classifier introspection.
      stderrChunks.push(Buffer.from(`[spawn error] ${err.message}\n`));
      onDone(null, null);
    });
  });

  const duration_ms = Date.now() - started;

  const stdoutBuf = Buffer.concat(stdoutChunks);
  const stderrBuf = Buffer.concat(stderrChunks);
  const stdoutStr = stdoutBuf.toString('utf8');
  const stderrStr = stderrBuf.toString('utf8');

  return {
    exit_code,
    signal,
    stdout: stdoutStr,
    stdout_tail: tail(stdoutStr, TAIL_BYTES),
    stderr_tail: tail(stderrStr, TAIL_BYTES),
    was_killed_by_dispatcher,
    duration_ms,
    exceeded_max_buffer,
  };
}

// ---------- platform-branch kill ----------

function killTree(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;

  if (process.platform === 'win32') {
    // On Windows: taskkill /T (tree) /F (force) — signals don't map.
    try {
      spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], {
        windowsHide: true,
      });
    } catch {
      // taskkill missing — best-effort fallback
      try {
        child.kill(signal);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  // Linux/mac: kill the whole process group (negative pid).
  try {
    process.kill(-child.pid, signal);
  } catch (err) {
    // ESRCH = already dead. EPERM = foreign PGID (shouldn't happen with detached).
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ESRCH') {
      // Fallback to direct-child kill
      try {
        child.kill(signal);
      } catch {
        /* ignore */
      }
    }
  }
}

// ---------- helpers ----------

function tail(s: string, bytes: number): string {
  const b = Buffer.from(s, 'utf8');
  if (b.length <= bytes) return s;
  // Slice tail and decode; may split a multi-byte char — rare with CLIs; acceptable for diagnostic tail.
  return b.subarray(b.length - bytes).toString('utf8');
}

function resolveMaxBuffer(): number {
  const raw = process.env.FLYWHEEL_IDEAS_MAX_BUFFER_BYTES;
  if (!raw) return DEFAULT_MAX_BUFFER;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BUFFER;
}

function resolveCommand(input: SpawnCellInput): { cmd: string; args: string[] } {
  if (input.spawn_prefix && input.spawn_prefix.length > 0) {
    const [head, ...rest] = input.spawn_prefix;
    return { cmd: head, args: [...rest, ...input.argv] };
  }
  const cmd = input.binary_override ?? input.cli;
  return { cmd, args: input.argv };
}
