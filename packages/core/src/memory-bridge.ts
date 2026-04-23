/**
 * memory-bridge — best-effort registration of `ideas_*` custom categories with
 * flywheel-memory on flywheel-ideas server startup (M14).
 *
 * Why this exists: flywheel-ideas writes notes with `type: ideas_note` etc. into
 * the same vault flywheel-memory indexes. Without registering them as custom
 * categories, flywheel-memory's wikilink scorer treats them as unknown noise.
 * Registering them lets the four note kinds participate in the graph.
 *
 * Behaviour:
 *  - Spawn `flywheel-memory` as an MCP subprocess via the SDK.
 *  - GET-MERGE-SET on `doctor({action:'config', mode:'get'/'set', key:'custom_categories'})`
 *    so a user's pre-existing custom categories (e.g. `recipe`, `paper`) are
 *    preserved. (The standalone `flywheel_config` tool was retired in
 *    flywheel-memory T43+ and folded into `doctor(action:'config')`.)
 *  - Best-effort: never throw. Returns `{status:'skipped', reason:...}` if the
 *    binary is missing, the call times out, or the response is malformed.
 *
 * Env knobs:
 *  - `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0`              — kill switch (no spawn)
 *  - `FLYWHEEL_MEMORY_BIN=/path/to/flywheel-memory`— override binary resolution
 *  - `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS=...` — override 15000ms default
 *  - `FLYWHEEL_IDEAS_DEBUG=1`                      — surface transport teardown
 *                                                    errors on stderr
 *
 * Env hygiene: the SDK's `StdioClientTransport` only inherits a small allowlist
 * (PATH, HOME, etc.) into the child unless we explicitly pass keys via `env:`.
 * That means `FLYWHEEL_VAULTS`, `FLYWHEEL_TOOLS`, etc. on the parent process
 * are NOT inherited into the spawned flywheel-memory — we keep it in single-vault
 * mode pinned to our `VAULT_PATH`. See node_modules/@modelcontextprotocol/sdk
 * /dist/esm/client/stdio.js DEFAULT_INHERITED_ENV_VARS.
 */

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export const IDEAS_CATEGORIES: Record<string, { type_boost: number }> = {
  ideas_note: { type_boost: 2 },
  ideas_assumption: { type_boost: 1 },
  ideas_council_session: { type_boost: 1 },
  ideas_outcome: { type_boost: 1 },
};

export type MemoryBridgeSkipReason =
  | 'binary_not_found'
  | 'spawn_failed'
  | 'timeout'
  | 'tool_returned_error'
  | 'invalid_response'
  | 'disabled';

export type MemoryBridgeResult =
  | { status: 'registered'; categories: string[]; preserved: string[] }
  | { status: 'skipped'; reason: MemoryBridgeSkipReason; detail?: string };

export interface RegisterOptions {
  /** Override binary path. Defaults to `FLYWHEEL_MEMORY_BIN` env, then `flywheel-memory`. */
  binary?: string;
  /** Args passed to the binary. Defaults to `[]`. Tests may pass `['--shim', path]`. */
  args?: string[];
  /** Hard timeout. Defaults to `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS` env, then 15000ms. */
  timeoutMs?: number;
  /** Extra env overlaid before our pinned VAULT_PATH/FLYWHEEL_TRANSPORT. */
  env?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const REGISTRAR_NAME = 'flywheel-ideas-registrar';
const REGISTRAR_VERSION = '0.1.x';

export async function registerCustomCategories(
  vaultPath: string,
  opts: RegisterOptions = {},
): Promise<MemoryBridgeResult> {
  if (process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE === '0') {
    return { status: 'skipped', reason: 'disabled' };
  }

  const binary = opts.binary ?? process.env.FLYWHEEL_MEMORY_BIN ?? 'flywheel-memory';
  const args = opts.args ?? [];
  const timeoutMs = resolveTimeout(opts.timeoutMs);

  // Precheck: an absolute-path binary that doesn't exist is unambiguously
  // binary_not_found. cross-spawn on Windows wraps the resulting spawn
  // failure as a generic Error without an ENOENT code, so we can't rely on
  // post-hoc classification. (Caught by Windows CI in M14 dogfood PR.)
  if (isAbsolute(binary) && !existsSync(binary)) {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary };
  }

  const env: Record<string, string> = {
    ...(opts.env ?? {}),
    VAULT_PATH: vaultPath,
    FLYWHEEL_TRANSPORT: 'stdio',
  };

  const transport = new StdioClientTransport({
    command: binary,
    args,
    env,
    stderr: 'pipe', // suppress flywheel-memory chatter on our parent stderr
  });
  const client = new Client(
    { name: REGISTRAR_NAME, version: REGISTRAR_VERSION },
    { capabilities: {} },
  );

  let pidSeen: number | null = null;
  const onConnected = (): void => {
    pidSeen = transport.pid;
  };

  try {
    return await raceWithTimeout(runRegistration(client, transport, onConnected), timeoutMs);
  } catch (err) {
    return classifyError(err, binary, timeoutMs);
  } finally {
    try {
      await client.close();
    } catch (closeErr) {
      if (process.env.FLYWHEEL_IDEAS_DEBUG === '1') {
        process.stderr.write(
          `flywheel-ideas: memory-bridge close error: ${(closeErr as Error).message}\n`,
        );
      }
    }
    if (pidSeen !== null) {
      await ensureChildExited(pidSeen);
    }
  }
}

async function runRegistration(
  client: Client,
  transport: StdioClientTransport,
  onConnected: () => void,
): Promise<MemoryBridgeResult> {
  await client.connect(transport);
  onConnected();

  const getRes = await client.callTool({
    name: 'doctor',
    arguments: { action: 'config', mode: 'get' },
  });
  const getText = extractText(getRes);
  if (getText === null) {
    return { status: 'skipped', reason: 'invalid_response', detail: 'get returned no text content' };
  }
  let existing: Record<string, { type_boost?: number }>;
  try {
    const cfg = JSON.parse(getText) as {
      custom_categories?: Record<string, { type_boost?: number }>;
      error?: string;
    };
    if (cfg.error !== undefined) {
      return { status: 'skipped', reason: 'tool_returned_error', detail: cfg.error };
    }
    existing = cfg.custom_categories ?? {};
  } catch (err) {
    return {
      status: 'skipped',
      reason: 'invalid_response',
      detail: `get parse error: ${(err as Error).message}`,
    };
  }

  const merged = { ...existing, ...IDEAS_CATEGORIES };
  const preserved = Object.keys(existing).filter((k) => !(k in IDEAS_CATEGORIES));

  const setRes = await client.callTool({
    name: 'doctor',
    arguments: { action: 'config', mode: 'set', key: 'custom_categories', value: merged },
  });
  const setText = extractText(setRes);
  if (setText === null) {
    return { status: 'skipped', reason: 'invalid_response', detail: 'set returned no text content' };
  }
  let setCfg: { custom_categories?: Record<string, { type_boost?: number }>; error?: string };
  try {
    setCfg = JSON.parse(setText) as typeof setCfg;
  } catch (err) {
    return {
      status: 'skipped',
      reason: 'invalid_response',
      detail: `set parse error: ${(err as Error).message}`,
    };
  }
  if (setCfg.error !== undefined) {
    return { status: 'skipped', reason: 'tool_returned_error', detail: setCfg.error };
  }
  const echoed = setCfg.custom_categories ?? {};
  for (const k of Object.keys(IDEAS_CATEGORIES)) {
    if (!(k in echoed)) {
      return {
        status: 'skipped',
        reason: 'invalid_response',
        detail: `set echo missing ${k}`,
      };
    }
  }

  return {
    status: 'registered',
    categories: Object.keys(IDEAS_CATEGORIES),
    preserved,
  };
}

function classifyError(err: unknown, binary: string, timeoutMs: number): MemoryBridgeResult {
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return { status: 'skipped', reason: 'timeout', detail: `${timeoutMs}ms` };
  }
  const e = err as NodeJS.ErrnoException;
  if (e?.code === 'ENOENT') {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary };
  }
  // Windows: cross-spawn doesn't always preserve ENOENT — fall back to
  // string-matching the message for the binary path.
  const msg = e?.message ?? String(err);
  if (msg.includes(binary) && /ENOENT|not found|cannot find|no such file/i.test(msg)) {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary };
  }
  return { status: 'skipped', reason: 'spawn_failed', detail: msg };
}

function extractText(res: unknown): string | null {
  if (typeof res !== 'object' || res === null) return null;
  const content = (res as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const item of content) {
    if (
      typeof item === 'object' &&
      item !== null &&
      (item as { type?: string }).type === 'text'
    ) {
      const text = (item as { text?: unknown }).text;
      if (typeof text === 'string') return text;
    }
  }
  return null;
}

function raceWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
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

function resolveTimeout(opt?: number): number {
  if (typeof opt === 'number' && Number.isFinite(opt) && opt > 0) return opt;
  const env = process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS;
  if (env) {
    const n = Number.parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_TIMEOUT_MS;
}

async function ensureChildExited(pid: number): Promise<void> {
  if (!isAlive(pid)) return;
  // Wait briefly for SDK's own SIGTERM + SIGKILL escalation in close() to land.
  await new Promise((r) => setTimeout(r, 1000));
  if (!isAlive(pid)) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/T', '/F', '/PID', String(pid)], { windowsHide: true });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // ESRCH = already dead; ignore.
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
