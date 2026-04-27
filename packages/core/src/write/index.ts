/**
 * Writer interface — the single boundary tool handlers cross to write vault
 * artifacts.
 *
 * `writeNote` and `patchFrontmatter` dispatch on the server's active write
 * path (resolved once at startup via `probeWritePath`).
 *
 * v0.4.0 — flywheel-memory is a required peer dependency. Production always
 * runs the `mcp-subprocess` tier; if the bridge is unreachable, the server
 * hard-fails at boot via `FlywheelMemoryRequiredError`. The `direct-fs`
 * tier survives only behind the `FLYWHEEL_IDEAS_TEST_MODE=1` gate, where
 * tests inject a tier via `__setWritePathForTests()`.
 *
 * Per-call mid-run subprocess failure now surfaces as a hard error rather
 * than a silent direct-fs degrade (Claude-mitigation #7): silent vault
 * divergence is worse than a loud failure. Operators restart the server.
 * The `write_path` field reports the tier actually used (always
 * `mcp-subprocess` in production; `direct-fs` only in test mode).
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
 * Mid-run subprocess failure — hard error rather than silent direct-fs degrade.
 *
 * v0.4.0 (Claude-mitigation #7): silent vault divergence between the bridge
 * and direct-fs paths is worse than a loud failure. If the subprocess crashes
 * mid-session, the operator gets a clear error on the failing tool call and
 * restarts the server.
 */
export class WriteSubprocessFailedError extends Error {
  readonly reason: string;
  readonly detail?: string;
  constructor(reason: string, detail?: string) {
    super(
      `flywheel-memory bridge write failed (${reason}${detail ? `: ${detail}` : ''}). ` +
        'Restart the server; if the bridge is genuinely unreachable, the next boot will surface the install hint.',
    );
    this.name = 'WriteSubprocessFailedError';
    this.reason = reason;
    this.detail = detail;
  }
}

/**
 * Write a new markdown note to the vault. In production the mcp-subprocess
 * tier is required; failure throws `WriteSubprocessFailedError`. In test mode
 * the active tier is whatever `__setWritePathForTests` injected (usually
 * `direct-fs`).
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
    throw new WriteSubprocessFailedError(outcome.reason, outcome.detail);
  }
  return await writeNoteDirectFs(vaultPath, relPath, frontmatter, body, options);
}

/**
 * Patch scalar frontmatter. Same dispatch + hard-fail semantics as `writeNote`.
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
    throw new WriteSubprocessFailedError(outcome.reason, outcome.detail);
  }
  return await patchFrontmatterDirectFs(vaultPath, relPath, patch);
}
