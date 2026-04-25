/**
 * Runtime probe for the active write path.
 *
 * Called once at server startup (see packages/mcp-server/src/index.ts). Tries
 * to spawn flywheel-memory + issue a trivial tools/list to confirm the binary
 * is present and speaks MCP. If yes, write I/O routes through the
 * mcp-subprocess writer; else it falls back to direct-fs.
 *
 * Design note: the probe's only job is TIER SELECTION. It is not responsible
 * for the first real write — that happens per-tool-call through `writeNote`,
 * which also handles per-call subprocess failures with direct-fs fallback.
 * Kept deliberately cheap: one spawn, one tools/list call, close.
 *
 * Module-level state: `resolvedWritePath` is mutable so the probe can set it
 * once at startup and every subsequent `getActiveWritePath()` call is O(1).
 * Tests reset via `__resetWritePathForTests` to avoid cross-test leakage.
 */

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { WritePathLabel } from './direct-fs.js';

const PROBE_NAME = 'flywheel-ideas-write-probe';
const PROBE_VERSION = '0.2.x';
const DEFAULT_PROBE_TIMEOUT_MS = 10_000;

export type ProbeOutcome = {
  active: WritePathLabel;
  reason:
    | 'subprocess_ok'
    | 'disabled'
    | 'binary_not_found'
    | 'spawn_failed'
    | 'timeout'
    | 'tools_missing'
    | 'not_probed';
  detail?: string;
};

// Module-level state — written once by probe, read by getActiveWritePath.
// Starts as 'direct-fs' with reason='not_probed' so tests that never call the
// probe still see a sensible value (and one that matches pre-migration
// behaviour).
let resolvedOutcome: ProbeOutcome = {
  active: 'direct-fs',
  reason: 'not_probed',
};

export function getActiveWritePath(): WritePathLabel {
  return resolvedOutcome.active;
}

export function getProbeOutcome(): ProbeOutcome {
  return resolvedOutcome;
}

/** Test-only. Resets to the pre-probe default. */
export function __resetWritePathForTests(): void {
  resolvedOutcome = { active: 'direct-fs', reason: 'not_probed' };
}

/** Test-only. Force a specific outcome without spawning. */
export function __setWritePathForTests(outcome: ProbeOutcome): void {
  resolvedOutcome = outcome;
}

export interface ProbeOptions {
  binary?: string;
  args?: string[];
  timeoutMs?: number;
  env?: Record<string, string>;
}

/**
 * Probe the flywheel-memory subprocess and set the active write path.
 * Returns the outcome. Never throws — all failures downgrade to 'direct-fs'.
 */
export async function probeWritePath(
  vaultPath: string,
  options: ProbeOptions = {},
): Promise<ProbeOutcome> {
  if (process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE === '0') {
    resolvedOutcome = { active: 'direct-fs', reason: 'disabled' };
    return resolvedOutcome;
  }

  const binary = options.binary ?? process.env.FLYWHEEL_MEMORY_BIN ?? 'flywheel-memory';
  const args = options.args ?? [];
  const timeoutMs = resolveProbeTimeout(options.timeoutMs);

  if (isAbsolute(binary) && !existsSync(binary)) {
    resolvedOutcome = {
      active: 'direct-fs',
      reason: 'binary_not_found',
      detail: binary,
    };
    return resolvedOutcome;
  }

  const env: Record<string, string> = {
    ...(options.env ?? {}),
    VAULT_PATH: vaultPath,
    FLYWHEEL_TRANSPORT: 'stdio',
  };

  const transport = new StdioClientTransport({
    command: binary,
    args,
    env,
    stderr: 'pipe',
  });
  const client = new Client(
    { name: PROBE_NAME, version: PROBE_VERSION },
    { capabilities: {} },
  );

  try {
    const tools = await raceProbeTimeout(
      (async () => {
        await client.connect(transport);
        return await client.listTools();
      })(),
      timeoutMs,
    );
    const names = new Set(
      (tools.tools ?? []).map((t: { name?: unknown }) =>
        typeof t.name === 'string' ? t.name : '',
      ),
    );
    const hasWriteTools = names.has('note') && names.has('vault_update_frontmatter');
    resolvedOutcome = hasWriteTools
      ? { active: 'mcp-subprocess', reason: 'subprocess_ok' }
      : {
          active: 'direct-fs',
          reason: 'tools_missing',
          detail: `expected note + vault_update_frontmatter; got ${Array.from(names).sort().join(',') || '(none)'}`,
        };
    return resolvedOutcome;
  } catch (err) {
    resolvedOutcome = classifyProbeError(err, binary, timeoutMs);
    return resolvedOutcome;
  } finally {
    try {
      await client.close();
    } catch (closeErr) {
      if (process.env.FLYWHEEL_IDEAS_DEBUG === '1') {
        process.stderr.write(
          `flywheel-ideas: probe close error: ${(closeErr as Error).message}\n`,
        );
      }
    }
  }
}

function classifyProbeError(
  err: unknown,
  binary: string,
  timeoutMs: number,
): ProbeOutcome {
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return { active: 'direct-fs', reason: 'timeout', detail: `${timeoutMs}ms` };
  }
  const e = err as NodeJS.ErrnoException;
  if (e?.code === 'ENOENT') {
    return { active: 'direct-fs', reason: 'binary_not_found', detail: binary };
  }
  const msg = e?.message ?? String(err);
  if (msg.includes(binary) && /ENOENT|not found|cannot find|no such file/i.test(msg)) {
    return { active: 'direct-fs', reason: 'binary_not_found', detail: binary };
  }
  return { active: 'direct-fs', reason: 'spawn_failed', detail: msg };
}

function raceProbeTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    t.unref();
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function resolveProbeTimeout(opt?: number): number {
  if (typeof opt === 'number' && Number.isFinite(opt) && opt > 0) return opt;
  const env = process.env.FLYWHEEL_IDEAS_WRITE_PROBE_TIMEOUT_MS;
  if (env) {
    const n = Number.parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_PROBE_TIMEOUT_MS;
}
