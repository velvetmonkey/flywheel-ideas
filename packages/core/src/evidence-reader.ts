/**
 * evidence-reader — one-shot MCP subprocess for retrieval-native council
 * input (v0.2 KEYSTONE).
 *
 * The keystone queries flywheel-memory's `search`, `memory.brief`, and
 * `graph.backlinks` tools BEFORE each `council.run` dispatch, then injects
 * the results as evidence into persona prompts.
 *
 * Pattern: clones the spawn-then-close lifecycle from memory-bridge.ts. A
 * fresh subprocess per `council.run` (not long-lived). Inside the
 * subprocess lifetime, the caller can issue N queries via `reader.query()`.
 *
 * v0.4.0 — flywheel-memory is required at server boot, so by the time a
 * council session runs we know the bridge is reachable. A reader spawn
 * failure therefore indicates a transient mid-session problem (subprocess
 * crash, OS-level fork failure), not a missing dependency. The legacy
 * `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` kill switch was removed.
 *
 * Env knobs:
 *  - `FLYWHEEL_MEMORY_BIN=/path/to/flywheel-memory`  — override binary
 *  - `FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS=...` — override 5000ms default
 *  - `FLYWHEEL_IDEAS_DEBUG=1`                        — surface transport teardown errors
 *
 * Env hygiene matches memory-bridge: VAULT_PATH + FLYWHEEL_TRANSPORT pinned;
 * FLYWHEEL_VAULTS / FLYWHEEL_TOOLS NOT inherited (single-vault read mode).
 */

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export type EvidenceReaderSkipReason =
  | 'binary_not_found'
  | 'spawn_failed'
  | 'timeout'
  | 'invalid_response';

export type EvidenceReaderOutcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'skipped'; reason: EvidenceReaderSkipReason; detail?: string };

export interface EvidenceReader {
  /**
   * Call a flywheel-memory MCP tool. Returns the raw `tools/call` response
   * (typically `{ content: [{ type: 'text', text: '<json>' }, ...] }`).
   * Caller is responsible for parsing the text content.
   */
  query(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface WithEvidenceReaderOptions {
  /** Override binary path. Defaults to `FLYWHEEL_MEMORY_BIN` env, then `flywheel-memory`. */
  binary?: string;
  /** Args passed to the binary. Defaults to `[]`. */
  args?: string[];
  /** Hard timeout for the entire withEvidenceReader call (spawn + queries + close). */
  timeoutMs?: number;
  /** Extra env overlaid before our pinned VAULT_PATH/FLYWHEEL_TRANSPORT. */
  env?: Record<string, string>;
}

// 5s default — flywheel-memory's search/graph/memory tools are local
// SQLite reads and complete in <100ms typically. Cold-start `init_semantic`
// is the only failure mode; if it bites we surface 'timeout' and skip
// evidence for that council run rather than blocking dispatch.
const DEFAULT_TIMEOUT_MS = 30_000;
const READER_NAME = 'flywheel-ideas-evidence-reader';
const READER_VERSION = '0.2.x';

/**
 * Run an inner function with an open MCP subprocess connection to
 * flywheel-memory. The reader is open for the lifetime of `fn` and closed
 * (with the SDK's stdin.end → SIGTERM → SIGKILL escalation) afterwards.
 *
 * Best-effort: never throws. If the binary is missing, spawn fails, or the
 * inner function exceeds the timeout, returns `{status: 'skipped', reason: ...}`
 * and the caller renders the council prompt without evidence.
 */
export async function withEvidenceReader<T>(
  vaultPath: string,
  fn: (reader: EvidenceReader) => Promise<T>,
  opts: WithEvidenceReaderOptions = {},
): Promise<EvidenceReaderOutcome<T>> {
  const binary = opts.binary ?? process.env.FLYWHEEL_MEMORY_BIN ?? 'flywheel-memory';
  const args = opts.args ?? [];
  const timeoutMs = resolveTimeout(opts.timeoutMs);

  // Mirror memory-bridge's pre-spawn check — absolute path that doesn't exist
  // is unambiguously binary_not_found. cross-spawn on Windows can mask ENOENT
  // from the spawn-failure path otherwise.
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
    stderr: 'pipe',
  });
  const client = new Client(
    { name: READER_NAME, version: READER_VERSION },
    { capabilities: {} },
  );

  try {
    return await raceWithTimeout(
      (async () => {
        await client.connect(transport);
        const reader: EvidenceReader = {
          async query(toolName, queryArgs) {
            return await client.callTool({ name: toolName, arguments: queryArgs });
          },
        };
        const value = await fn(reader);
        return { status: 'ok' as const, value };
      })(),
      timeoutMs,
    );
  } catch (err) {
    return classifyError(err, binary, timeoutMs);
  } finally {
    try {
      await client.close();
    } catch (closeErr) {
      if (process.env.FLYWHEEL_IDEAS_DEBUG === '1') {
        process.stderr.write(
          `flywheel-ideas: evidence-reader close error: ${(closeErr as Error).message}\n`,
        );
      }
    }
  }
}

function classifyError<T>(
  err: unknown,
  binary: string,
  timeoutMs: number,
): EvidenceReaderOutcome<T> {
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return { status: 'skipped', reason: 'timeout', detail: `${timeoutMs}ms` };
  }
  const e = err as NodeJS.ErrnoException;
  if (e?.code === 'ENOENT') {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary };
  }
  const msg = e?.message ?? String(err);
  if (msg.includes(binary) && /ENOENT|not found|cannot find|no such file/i.test(msg)) {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary };
  }
  return { status: 'skipped', reason: 'spawn_failed', detail: msg };
}

function raceWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
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
  const env = process.env.FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS;
  if (env) {
    const n = Number.parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Helper: pull the first text-content payload out of an MCP tool response.
 * flywheel-memory tools all return `{ content: [{ type: 'text', text: '<json>' }] }`.
 */
export function extractToolText(res: unknown): string | null {
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
