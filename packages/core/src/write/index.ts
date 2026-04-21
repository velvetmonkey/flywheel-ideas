/**
 * Writer interface module — the single boundary tool handlers cross to write
 * vault artifacts.
 *
 * Every tool handler imports from this module, never from `fs` or `gray-matter`
 * directly. Today the implementation is entirely direct-fs (Option D of the
 * plan). When vault-core gains its write orchestration (Option B) or when we
 * spawn flywheel-memory as a subprocess (Option C), those land as alternative
 * implementations under the same interface — no tool-handler rewrites needed.
 *
 * The `activeWritePath` identifier propagates onto every tool response's
 * `result.write_path` field so the calling agent can surface degraded-mode
 * warnings in `next_steps` when appropriate.
 */

export { writeNote, WriteNotePathError } from './direct-fs.js';
export type { WriteNoteOptions, WriteNoteResult } from './direct-fs.js';

export type WritePathTier = 'direct-fs' | 'mcp-subprocess' | 'vault-core';

/** v0.1 ships direct-fs only. Feature-detection for B/C lands in a later milestone. */
export const activeWritePath: WritePathTier = 'direct-fs';

export {
  validatePath,
  validatePathSecure,
  isSensitivePath,
  isWithinDirectory,
  sanitizeNotePath,
} from './path-security.js';
