/**
 * Direct-fs write implementation — Option D of the write-path plan.
 *
 * Creates new markdown notes atomically with exclusive-create semantics:
 * - Temp file name uses `crypto.randomBytes` so concurrent writes can't collide.
 * - Temp file is opened with `wx` so we surface an error if the tmp target
 *   already exists (defense in depth against random collision + lingering dev
 *   artifacts).
 * - Final rename destination uses `link`+`unlink` on the tmp OR
 *   `fsp.rename` guarded by an explicit exclusive-create check via
 *   `fsp.open(full, 'wx')` first. The `wx` probe serializes concurrent
 *   `idea.create` callers that happen to generate the same target path — POSIX
 *   rename will otherwise silently overwrite, losing data.
 *
 * Mutating existing notes goes through `patchFrontmatter.ts`, not this module.
 * gray-matter's stringify is destructive on existing user content (strips
 * comments, reformats dates, normalizes line endings) — it's only safe for new
 * files we fully own.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
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

export type WritePathLabel = 'direct-fs' | 'mcp-subprocess' | 'vault-core';

export interface WriteNoteResult {
  vault_path: string;
  write_path: WritePathLabel;
}

/**
 * Generate a tmp-file suffix collision-safe under concurrent writes.
 *
 * Previously used `Date.now() + pid` which collides if two processes (or async
 * tasks in the same process) spawn tmp files in the same millisecond. 8 bytes
 * of crypto-random gives 2^64 suffix space.
 */
function tmpSuffix(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Write a new markdown note to the vault via direct filesystem I/O.
 *
 * This is the Option D tier — the public `writeNote` in ../index.ts
 * dispatches to this when `activeWritePath === 'direct-fs'` or falls back
 * here when the mcp-subprocess tier fails mid-write.
 *
 * @throws WriteNotePathError when the relative path fails security validation
 *         OR when the target file already exists and `overwrite` is false.
 */
export async function writeNoteDirectFs(
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

  // Ensure parent directory exists
  await fsp.mkdir(path.dirname(full), { recursive: true });

  // Unless overwrite was explicitly requested, reserve the destination with
  // an exclusive-create open. This serializes concurrent creators that resolve
  // to the same path — rename is unconditional on POSIX and would otherwise
  // silently clobber. Close the handle immediately; we rewrite via tmp+rename
  // below. Leaving a zero-byte file on the exclusive-create path is the
  // trade-off for serialization; if the subsequent write fails, we remove it.
  let reservedHandle = null;
  if (!options.overwrite) {
    try {
      reservedHandle = await fsp.open(full, 'wx');
      await reservedHandle.close();
      reservedHandle = null;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new WriteNotePathError(`file already exists: ${relPath}`);
      }
      throw err;
    }
  }

  const serialized = matter.stringify(body, frontmatter);
  const tmpPath = path.join(path.dirname(full), `.${path.basename(full)}.${tmpSuffix()}.tmp`);

  try {
    // 'wx' on the tmp itself to guard against the tiny window where another
    // process might pick the same random suffix.
    const tmpHandle = await fsp.open(tmpPath, 'wx');
    try {
      await tmpHandle.writeFile(serialized, { encoding: 'utf8' });
    } finally {
      await tmpHandle.close();
    }
    await fsp.rename(tmpPath, full);
  } catch (err) {
    // Best-effort cleanup of both tmp and the reserved zero-byte file (if we
    // created it).
    try {
      await fsp.unlink(tmpPath);
    } catch {
      /* ignore */
    }
    if (!options.overwrite) {
      try {
        await fsp.unlink(full);
      } catch {
        /* ignore */
      }
    }
    throw err;
  }

  return {
    vault_path: relPath,
    write_path: 'direct-fs',
  };
}
