/**
 * Writer interface — the single boundary tool handlers cross to write vault
 * artifacts.
 *
 * v0.2 write-path migration: `writeNote` and `patchFrontmatter` dispatch on
 * the server's active write path (resolved once at startup via
 * `probeWritePath`).
 *
 *   - `mcp-subprocess` (preferred): all I/O through flywheel-memory's `note`
 *     + `vault_update_frontmatter` tools. Unifies the write path with memory's
 *     wikilink scorer, citation graph, and frontmatter conventions.
 *   - `direct-fs` (fallback): gray-matter + `fsp` locally. Used when
 *     flywheel-memory is unavailable (not installed, subprocess skipped, or
 *     `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0`).
 *
 * Per-call resilience: even after startup probe selects `mcp-subprocess`, a
 * mid-run subprocess failure (spawn race, transient timeout) falls back to
 * direct-fs for THAT call so the write still lands. The response's
 * `write_path` field reports the tier actually used.
 */

import { writeNoteDirectFs, WriteNotePathError } from './direct-fs.js';
import type {
  WriteNoteOptions,
  WriteNoteResult,
  WritePathLabel,
} from './direct-fs.js';
import { patchFrontmatterDirectFs, PatchFrontmatterError } from './patch-frontmatter.js';
import type {
  FrontmatterPatch,
  PatchFrontmatterResult,
  ScalarValue,
} from './patch-frontmatter.js';
import { applyPatch, serializeScalar } from './patch-frontmatter.js';
import {
  writeNoteViaSubprocess,
  patchFrontmatterViaSubprocess,
  type WriteSubprocessOptions,
} from './mcp-subprocess.js';
import { getActiveWritePath } from './probe.js';

export type WritePathTier = WritePathLabel;

export { WriteNotePathError };
export type { WriteNoteOptions, WriteNoteResult };
export { PatchFrontmatterError, applyPatch, serializeScalar };
export type { FrontmatterPatch, PatchFrontmatterResult, ScalarValue };

export {
  validatePath,
  validatePathSecure,
  isSensitivePath,
  isWithinDirectory,
  sanitizeNotePath,
} from './path-security.js';

// Probe surface (tests + server startup)
export {
  probeWritePath,
  getActiveWritePath,
  getProbeOutcome,
  __resetWritePathForTests,
  __setWritePathForTests,
} from './probe.js';
export type { ProbeOptions, ProbeOutcome } from './probe.js';

// Direct re-exports for callers that want the raw tiers (tests, subprocess
// writer's internal fallback)
export { writeNoteDirectFs, patchFrontmatterDirectFs };
export {
  writeNoteViaSubprocess,
  patchFrontmatterViaSubprocess,
} from './mcp-subprocess.js';
export type { WriteSubprocessOptions } from './mcp-subprocess.js';

/**
 * Write a new markdown note to the vault. Dispatches on active write path;
 * falls back to direct-fs if the mcp-subprocess tier skips mid-call.
 */
export async function writeNote(
  vaultPath: string,
  relPath: string,
  frontmatter: Record<string, unknown>,
  body: string,
  options: WriteNoteOptions & WriteSubprocessOptions = {},
): Promise<WriteNoteResult> {
  if (getActiveWritePath() === 'mcp-subprocess') {
    const outcome = await writeNoteViaSubprocess(
      vaultPath,
      relPath,
      frontmatter,
      body,
      options,
    );
    if (outcome.status === 'ok') {
      return outcome.value;
    }
    // Per-call fallback. Log once and continue with direct-fs so the write
    // still lands. Prefer info-level on stderr so operators see the
    // degraded mode without noisy per-call warnings in normal use.
    process.stderr.write(
      `flywheel-ideas: mcp-subprocess write skipped (${outcome.reason}${
        outcome.detail ? `: ${outcome.detail}` : ''
      }) — falling back to direct-fs for ${relPath}\n`,
    );
  }
  return await writeNoteDirectFs(vaultPath, relPath, frontmatter, body, options);
}

/**
 * Patch scalar frontmatter on an existing note. Dispatches on active write
 * path; falls back to direct-fs if the subprocess tier skips mid-call.
 */
export async function patchFrontmatter(
  vaultPath: string,
  relPath: string,
  patch: FrontmatterPatch,
  options: WriteSubprocessOptions = {},
): Promise<PatchFrontmatterResult> {
  if (getActiveWritePath() === 'mcp-subprocess') {
    const outcome = await patchFrontmatterViaSubprocess(
      vaultPath,
      relPath,
      patch,
      options,
    );
    if (outcome.status === 'ok') {
      return outcome.value;
    }
    process.stderr.write(
      `flywheel-ideas: mcp-subprocess patch skipped (${outcome.reason}${
        outcome.detail ? `: ${outcome.detail}` : ''
      }) — falling back to direct-fs for ${relPath}\n`,
    );
  }
  return await patchFrontmatterDirectFs(vaultPath, relPath, patch);
}
