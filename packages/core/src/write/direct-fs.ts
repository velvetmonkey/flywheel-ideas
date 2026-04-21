/**
 * Direct-fs write implementation — Option D of the write-path plan.
 *
 * Creates new markdown notes atomically (write-to-tmp + rename). Path
 * validation uses flywheel-memory's `validatePathSecure` verbatim (copied into
 * `path-security.ts`) so symlink escapes and sensitive-file patterns reject.
 *
 * Mutating existing notes goes through `patchFrontmatter.ts`, not this module.
 * gray-matter's stringify is destructive on existing user content (strips
 * comments, reformats dates, normalizes line endings) — it's only safe for new
 * files we fully own.
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import { validatePathSecure, type PathValidationResult } from './path-security.js';

export class WriteNotePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WriteNotePathError';
  }
}

export interface WriteNoteOptions {
  /** Overwrite existing file. Defaults to false (throws if file exists). */
  overwrite?: boolean;
}

export interface WriteNoteResult {
  vault_path: string;
  write_path: 'direct-fs';
}

/**
 * Write a new markdown note to the vault.
 *
 * @throws WriteNotePathError when the relative path fails security validation.
 * @throws Error (EEXIST-like) when the file exists and `overwrite` is false.
 */
export async function writeNote(
  vaultPath: string,
  relPath: string,
  frontmatter: Record<string, unknown>,
  body: string,
  options: WriteNoteOptions = {},
): Promise<WriteNoteResult> {
  const validation: PathValidationResult = await validatePathSecure(vaultPath, relPath);
  if (!validation.valid) {
    throw new WriteNotePathError(validation.reason ?? 'path validation failed');
  }

  const full = path.join(vaultPath, relPath);
  if (!options.overwrite && fs.existsSync(full)) {
    throw new WriteNotePathError(`file already exists: ${relPath}`);
  }

  // Ensure parent directory exists
  await fsp.mkdir(path.dirname(full), { recursive: true });

  const serialized = matter.stringify(body, frontmatter);

  // Atomic write: write to sibling tmp file, then rename.
  // Using a hidden tmp name in the same directory keeps the rename cross-FS-safe
  // (always same filesystem). Suffix is random-ish to avoid collisions across
  // rapid concurrent writes to different target files in the same directory.
  const tmpName = `.${path.basename(full)}.${process.pid}.${Date.now()}.tmp`;
  const tmpPath = path.join(path.dirname(full), tmpName);

  try {
    await fsp.writeFile(tmpPath, serialized, 'utf8');
    await fsp.rename(tmpPath, full);
  } catch (err) {
    // Best-effort cleanup
    try {
      await fsp.unlink(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }

  return {
    vault_path: relPath,
    write_path: 'direct-fs',
  };
}
