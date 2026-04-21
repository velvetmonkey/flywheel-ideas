/**
 * Note reader — gray-matter-based, stale-tolerant.
 *
 * Reads are fast-path and always go direct; flywheel-memory's orchestration is
 * only useful for writes. Missing files return `{ exists: false }` instead of
 * throwing so `idea.read` callers can surface a `stale_row` hint to the user.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';

export interface ReadNoteResult {
  exists: boolean;
  vault_path: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Read a vault note's frontmatter + body.
 *
 * @param vaultPath absolute vault root
 * @param relPath   vault-relative path (forward slashes ok)
 */
export function readNote(vaultPath: string, relPath: string): ReadNoteResult {
  const full = path.join(vaultPath, relPath);
  if (!fs.existsSync(full)) {
    return {
      exists: false,
      vault_path: relPath,
      frontmatter: {},
      body: '',
    };
  }

  const raw = fs.readFileSync(full, 'utf8');
  const parsed = matter(raw);
  return {
    exists: true,
    vault_path: relPath,
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}
