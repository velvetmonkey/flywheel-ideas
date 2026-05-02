/**
 * MCP-subprocess write path — the production write path in v0.4.0.
 *
 * Spawns `flywheel-memory` as a one-shot MCP subprocess per write, calls the
 * `note` or `vault_update_frontmatter` tool, closes. Routes all vault I/O
 * through flywheel-memory so imported + hand-authored + council notes share
 * one write path.
 *
 * v0.4.0 — flywheel-memory is required at boot, so a per-call write failure
 * is a transient mid-session error. The dispatcher (`write/index.ts`) now
 * throws `WriteSubprocessFailedError` on a skipped outcome rather than
 * silently falling back to direct-fs (mitigation #7: loud failure beats
 * silent vault divergence).
 *
 * Clones the spawn-then-close lifecycle from `evidence-reader.ts` exactly.
 *
 * Returns a structured outcome `{status: 'ok'|'skipped', ...}` rather than
 * throwing — the dispatcher unwraps to either a result or a thrown error.
 *
 * Env knobs:
 *  - `FLYWHEEL_MEMORY_BIN=/path/to/flywheel-memory`  — override binary
 *  - `FLYWHEEL_IDEAS_WRITE_SUBPROCESS_TIMEOUT_MS=...` — override 15000ms default
 *  - `FLYWHEEL_IDEAS_DEBUG=1`                        — surface transport teardown
 */

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { extractToolText } from '../evidence-reader.js';
import type { WriteNoteOptions, WriteNoteResult } from './direct-fs.js';
import type { FrontmatterPatch, PatchFrontmatterResult } from './patch-frontmatter.js';

export type WriteSubprocessSkipReason =
  | 'binary_not_found'
  | 'spawn_failed'
  | 'timeout'
  | 'tool_returned_error'
  | 'invalid_response';

export type WriteSubprocessOutcome<T> =
  | { status: 'ok'; value: T }
  | { status: 'skipped'; reason: WriteSubprocessSkipReason; detail?: string };

export interface WriteSubprocessOptions {
  binary?: string;
  args?: string[];
  timeoutMs?: number;
  env?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const WRITER_NAME = 'flywheel-ideas-writer';
const WRITER_VERSION = '0.2.x';

/**
 * Write a new note via flywheel-memory's `note({action: 'create'})` tool.
 * Mirrors the direct-fs `writeNote` signature so the dispatcher can swap
 * implementations without caller changes.
 */
export async function writeNoteViaSubprocess(
  vaultPath: string,
  relPath: string,
  frontmatter: Record<string, unknown>,
  body: string,
  options: WriteNoteOptions & WriteSubprocessOptions = {},
): Promise<WriteSubprocessOutcome<WriteNoteResult>> {
  return await withMemoryWriter(vaultPath, async (client) => {
    const resp = await client.callTool({
      name: 'note',
      arguments: {
        action: 'create',
        path: relPath,
        content: body,
        frontmatter,
        overwrite: options.overwrite === true,
        // Imported notes keep direct-fs semantics by default. Generated
        // reports can opt into Flywheel markup with skipWikilinks:false.
        skipWikilinks: options.skipWikilinks ?? true,
      },
    });
    return parseNoteCreateResponse(resp, relPath);
  }, options);
}

/**
 * Patch frontmatter on an existing note via flywheel-memory's
 * `vault_update_frontmatter` tool. The tool merges by default (preserves
 * existing fields) matching the direct-fs patch semantics.
 */
export async function patchFrontmatterViaSubprocess(
  vaultPath: string,
  relPath: string,
  patch: FrontmatterPatch,
  options: WriteSubprocessOptions = {},
): Promise<WriteSubprocessOutcome<PatchFrontmatterResult>> {
  const requestedKeys = Object.keys(patch);
  return await withMemoryWriter(vaultPath, async (client) => {
    const resp = await client.callTool({
      name: 'vault_update_frontmatter',
      arguments: {
        path: relPath,
        frontmatter: patch,
        only_if_missing: false,
        dry_run: false,
      },
    });
    return parseFrontmatterPatchResponse(resp, relPath, requestedKeys);
  }, options);
}

// ---------------------------------------------------------------------------
// Core runner + env hygiene (clones evidence-reader lifecycle)
// ---------------------------------------------------------------------------

async function withMemoryWriter<T>(
  vaultPath: string,
  fn: (client: Client) => Promise<T>,
  options: WriteSubprocessOptions = {},
): Promise<WriteSubprocessOutcome<T>> {
  const binary = options.binary ?? process.env.FLYWHEEL_MEMORY_BIN ?? 'flywheel-memory';
  const args = options.args ?? [];
  const timeoutMs = resolveTimeout(options.timeoutMs);

  if (isAbsolute(binary) && !existsSync(binary)) {
    return { status: 'skipped', reason: 'binary_not_found', detail: binary };
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
    { name: WRITER_NAME, version: WRITER_VERSION },
    { capabilities: {} },
  );

  try {
    return await raceWithTimeout(
      (async () => {
        await client.connect(transport);
        const value = await fn(client);
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
          `flywheel-ideas: mcp-subprocess write close error: ${(closeErr as Error).message}\n`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

function parseNoteCreateResponse(
  resp: unknown,
  relPath: string,
): WriteNoteResult {
  // flywheel-memory's note.create typically returns `{content: [{type: 'text', text: <json>}]}`
  // where the JSON carries `{success, path, ...}`. We don't need to parse
  // deeply — if the call succeeded, the note was written at relPath.
  const text = extractToolText(resp);
  if (text) {
    try {
      const parsed = JSON.parse(text) as { success?: unknown; path?: unknown };
      if (parsed.success === false) {
        throw new SubprocessToolError(
          `note.create reported failure: ${JSON.stringify(parsed)}`,
        );
      }
    } catch (err) {
      if (err instanceof SubprocessToolError) throw err;
      // Unparseable text is not fatal — the note probably wrote fine; we'll
      // surface 'invalid_response' only if the MCP layer itself errored.
    }
  }
  return { vault_path: relPath, write_path: 'mcp-subprocess' };
}

function parseFrontmatterPatchResponse(
  resp: unknown,
  relPath: string,
  requestedKeys: string[],
): PatchFrontmatterResult {
  // flywheel-memory's vault_update_frontmatter merges + returns the merged
  // block. We don't get per-key changed/appended diffs back, so we report
  // all requested keys as `keys_changed`. Semantic difference from
  // direct-fs (which distinguishes changed vs appended), but direct-fs's
  // own internal callers don't consume that distinction at runtime. Any
  // callers that do can re-read the file themselves; the MCP surface
  // exposes the combined set.
  const text = extractToolText(resp);
  if (text) {
    try {
      const parsed = JSON.parse(text) as { success?: unknown };
      if (parsed.success === false) {
        throw new SubprocessToolError(
          `vault_update_frontmatter reported failure: ${text.slice(0, 200)}`,
        );
      }
    } catch (err) {
      if (err instanceof SubprocessToolError) throw err;
      // non-JSON body is not fatal
    }
  }
  return {
    vault_path: relPath,
    write_path: 'mcp-subprocess',
    keys_changed: requestedKeys,
    keys_appended: [],
  };
}

class SubprocessToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubprocessToolError';
  }
}

function classifyError<T>(
  err: unknown,
  binary: string,
  timeoutMs: number,
): WriteSubprocessOutcome<T> {
  if (err instanceof SubprocessToolError) {
    return { status: 'skipped', reason: 'tool_returned_error', detail: err.message };
  }
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
  const env = process.env.FLYWHEEL_IDEAS_WRITE_SUBPROCESS_TIMEOUT_MS;
  if (env) {
    const n = Number.parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_TIMEOUT_MS;
}
