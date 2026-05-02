/**
 * memory-bridge — registration of `ideas_*` custom categories with
 * flywheel-memory on flywheel-ideas server startup.
 *
 * Why this exists: flywheel-ideas writes notes with `type: idea` etc. into
 * the same vault flywheel-memory indexes. Without registering them as custom
 * categories, flywheel-memory's wikilink scorer treats them as unknown noise.
 * Registering them lets the note kinds participate in the graph.
 *
 * Behaviour:
 *  - Spawn `flywheel-memory` as an MCP subprocess via the SDK.
 *  - GET-MERGE-SET on `doctor({action:'config', mode:'get'/'set', key:'custom_categories'})`
 *    so a user's pre-existing custom categories (e.g. `recipe`, `paper`) are
 *    preserved. (The standalone `flywheel_config` tool was retired in
 *    flywheel-memory T43+ and folded into `doctor(action:'config')`.)
 *  - Returns `{status:'registered'|'skipped', ...}`. The caller (server startup)
 *    converts a `'skipped'` result into a hard-fail `FlywheelMemoryRequiredError`
 *    in production; tests run under `FLYWHEEL_IDEAS_TEST_MODE=1` and bypass
 *    the gate via `__setWritePathForTests()` instead.
 *
 * v0.4.0 — flywheel-memory is a required peer dependency. The legacy
 * `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` kill switch was removed; production
 * boots fail-loud when the bridge isn't reachable. Tests use the
 * purpose-built `FLYWHEEL_IDEAS_TEST_MODE=1` gate (see `test-mode.ts`).
 *
 * Env knobs:
 *  - `FLYWHEEL_MEMORY_BIN=/path/to/flywheel-memory`— override binary resolution
 *  - `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS=...` — override 60000ms default
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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Category names MUST match the `type:` frontmatter emitted by the note
 * writers — otherwise flywheel-memory's scorer treats every ideas note as
 * `unknown` and the type_boost does nothing.
 *
 * Emitted types (verified 2026-04-24):
 *   - `idea`          (packages/core/src/idea-create.ts:50)
 *   - `assumption`    (packages/core/src/assumptions.ts:195)
 *   - `outcome`       (packages/core/src/outcome.ts:229)
 *   - `council_view`  (packages/core/src/council.ts:666)
 *   - `report`        (packages/core/src/company.ts:294)
 *
 * Prior alpha.x shipped names prefixed with `ideas_` (ideas_note,
 * ideas_assumption, ideas_council_session, ideas_outcome). None of those
 * matched any emitted `type` value, so the boost was zero across the
 * entire ideas surface. Fixed in the v0.2 write-path migration.
 *
 * SYNTHESIS.md + ARGUMENT_MAP.md write via council.ts:666 with
 * `type: 'council_view'`; the synthesis is one council_view among N and
 * doesn't need a separate category.
 */
export const IDEAS_CATEGORIES: Record<string, { type_boost: number }> = {
  idea: { type_boost: 2 },
  assumption: { type_boost: 1 },
  council_view: { type_boost: 1 },
  outcome: { type_boost: 1 },
  report: { type_boost: 1 },
};

export type MemoryBridgeSkipReason =
  | 'binary_not_found'
  | 'spawn_failed'
  | 'timeout'
  | 'tool_returned_error'
  | 'invalid_response';

export type MemoryBridgeResult =
  | { status: 'registered'; categories: string[]; preserved: string[]; binary: string }
  | { status: 'skipped'; reason: MemoryBridgeSkipReason; detail?: string; binary: string; timeoutMs?: number };

export interface RegisterOptions {
  /** Override binary path. Defaults to `FLYWHEEL_MEMORY_BIN` env, then `flywheel-memory`. */
  binary?: string;
  /** Args passed to the binary. Defaults to `[]`. Tests may pass `['--shim', path]`. */
  args?: string[];
  /** Hard timeout. Defaults to `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS` env, then 60000ms. */
  timeoutMs?: number;
  /** Extra env overlaid before our pinned VAULT_PATH/FLYWHEEL_TRANSPORT. */
  env?: Record<string, string>;
}

// 60s default — bumped from 30s in v0.4.0 (Claude-mitigation #3): cold
// init_semantic routinely exceeds 30s on first launch, and now that the
// bridge is required, a probe timeout becomes a fatal boot error rather
// than a stderr warning. Pathological cases override via
// FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = 60_000;
const REGISTRAR_NAME = 'flywheel-ideas-registrar';
const REGISTRAR_VERSION = '0.1.x';

export async function registerCustomCategories(
  vaultPath: string,
  opts: RegisterOptions = {},
): Promise<MemoryBridgeResult> {
  const binary = opts.binary ?? process.env.FLYWHEEL_MEMORY_BIN ?? 'flywheel-memory';
  const args = opts.args ?? [];
  const timeoutMs = resolveTimeout(opts.timeoutMs);

  // Precheck: an absolute-path binary that doesn't exist is unambiguously
  // binary_not_found. cross-spawn on Windows wraps the resulting spawn
  // failure as a generic Error without an ENOENT code, so we can't rely on
  // post-hoc classification. (Caught by Windows CI in M14 dogfood PR.)
  if (isAbsolute(binary) && !existsSync(binary)) {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary, binary, timeoutMs };
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

  try {
    const inner = await raceWithTimeout(runRegistration(client, transport), timeoutMs);
    return attachContext(inner, binary, timeoutMs);
  } catch (err) {
    return attachContext(classifyError(err, binary, timeoutMs), binary, timeoutMs);
  } finally {
    // SDK's StdioClientTransport.close() does stdin.end() → 2s grace →
    // SIGTERM → 2s grace → SIGKILL. We previously had our own PID-level
    // SIGKILL fallback after this, but it was redundant — the SDK already
    // escalates, and our extra kill couldn't help when the SDK's SIGKILL
    // landed during init_semantic. Removed in alpha.4. The 30s default
    // timeout is the actual mitigation for the corruption window.
    try {
      await client.close();
    } catch (closeErr) {
      if (process.env.FLYWHEEL_IDEAS_DEBUG === '1') {
        process.stderr.write(
          `flywheel-ideas: memory-bridge close error: ${(closeErr as Error).message}\n`,
        );
      }
    }
  }
}

type InnerResult =
  | { status: 'registered'; categories: string[]; preserved: string[] }
  | { status: 'skipped'; reason: MemoryBridgeSkipReason; detail?: string };

function attachContext(
  inner: InnerResult,
  binary: string,
  timeoutMs: number,
): MemoryBridgeResult {
  if (inner.status === 'registered') {
    return { ...inner, binary };
  }
  return { ...inner, binary, timeoutMs };
}

async function runRegistration(
  client: Client,
  transport: StdioClientTransport,
): Promise<InnerResult> {
  await client.connect(transport);

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

function classifyError(err: unknown, binary: string, timeoutMs: number): InnerResult {
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
