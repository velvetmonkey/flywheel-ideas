/**
 * patchFrontmatter — surgical line-based frontmatter mutation.
 *
 * Round-tripping existing markdown through gray-matter is destructive: it
 * strips YAML comments, reformats ISO date strings, and normalizes line
 * endings. This module replaces or appends specific frontmatter keys line-by-
 * line without reserializing the rest of the document.
 *
 * Only scalar values are supported: string | number | boolean | null. Arrays
 * and objects must be patched via a full rewrite through `writeNote` — our
 * own frontmatter never uses block-scalar or multi-line array/object
 * representations, so this limitation is pragmatic, not fundamental.
 *
 * Preserves:
 * - Line endings (CRLF vs LF — detected from the file)
 * - Order of unrelated frontmatter keys
 * - Body content verbatim
 * - Other frontmatter lines the caller didn't touch
 *
 * Not preserved (v0.1 limitation, acceptable):
 * - Inline `# ...` comments on patched lines — full line is replaced
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { validatePathSecure } from './path-security.js';
import { WriteNotePathError } from './direct-fs.js';

export type ScalarValue = string | number | boolean | null;

export interface FrontmatterPatch {
  [key: string]: ScalarValue;
}

export interface PatchFrontmatterResult {
  vault_path: string;
  write_path: 'direct-fs';
  keys_changed: string[];
  keys_appended: string[];
}

export class PatchFrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatchFrontmatterError';
  }
}

const FRONTMATTER_DELIMITER = '---';

export async function patchFrontmatter(
  vaultPath: string,
  relPath: string,
  patch: FrontmatterPatch,
): Promise<PatchFrontmatterResult> {
  const validation = await validatePathSecure(vaultPath, relPath);
  if (!validation.valid) {
    throw new WriteNotePathError(validation.reason ?? 'path validation failed');
  }

  const keys = Object.keys(patch);
  if (keys.length === 0) {
    return {
      vault_path: relPath,
      write_path: 'direct-fs',
      keys_changed: [],
      keys_appended: [],
    };
  }

  const full = path.join(vaultPath, relPath);
  if (!fs.existsSync(full)) {
    throw new PatchFrontmatterError(`file not found: ${relPath}`);
  }

  const raw = await fsp.readFile(full, 'utf8');
  const { patched, keys_changed, keys_appended } = applyPatch(raw, patch);

  // Atomic write via exclusive-create tmp + rename. Crypto-random suffix
  // prevents collisions under rapid concurrent patches (e.g. transition +
  // outcome firing in the same millisecond).
  const tmpName = `.${path.basename(full)}.${randomBytes(8).toString('hex')}.tmp`;
  const tmpPath = path.join(path.dirname(full), tmpName);
  try {
    const tmpHandle = await fsp.open(tmpPath, 'wx');
    try {
      await tmpHandle.writeFile(patched, { encoding: 'utf8' });
    } finally {
      await tmpHandle.close();
    }
    await fsp.rename(tmpPath, full);
  } catch (err) {
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
    keys_changed,
    keys_appended,
  };
}

/**
 * Apply a scalar-only frontmatter patch to raw markdown text.
 *
 * Exported for unit + property testing. Pure function; no I/O.
 */
export function applyPatch(
  raw: string,
  patch: FrontmatterPatch,
): { patched: string; keys_changed: string[]; keys_appended: string[] } {
  const eol = detectLineEnding(raw);
  const lines = raw.split(/\r\n|\n/);

  // Locate frontmatter block boundaries.
  let openIdx = -1;
  let closeIdx = -1;

  // Frontmatter must start on the first line (gray-matter convention).
  if (lines.length > 0 && lines[0].trim() === FRONTMATTER_DELIMITER) {
    openIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === FRONTMATTER_DELIMITER) {
        closeIdx = i;
        break;
      }
    }
  }

  if (openIdx === -1 || closeIdx === -1) {
    throw new PatchFrontmatterError(
      'no frontmatter block found (missing --- delimiters on line 1 + later)',
    );
  }

  const keys_changed: string[] = [];
  const keys_appended: string[] = [];

  // Process each key in the patch. Mutate `lines` in place.
  for (const [key, value] of Object.entries(patch)) {
    validateKey(key);

    let matched = false;
    for (let i = openIdx + 1; i < closeIdx; i++) {
      if (lineMatchesKey(lines[i], key)) {
        // Refuse to patch a key whose existing value spans multiple lines.
        // Line-based replacement of the header would leave orphaned
        // continuation lines and produce invalid YAML. Users/tools that hit
        // this should delete the note and recreate via writeNote, or patch a
        // different key.
        if (isMultiLineValue(lines, i, openIdx, closeIdx)) {
          throw new PatchFrontmatterError(
            `refusing to patch key "${key}" — existing value spans multiple lines ` +
              `(block scalar or wrapped string). Rewrite the note via writeNote instead.`,
          );
        }
        const leadingWhitespace = lines[i].match(/^\s*/)?.[0] ?? '';
        lines[i] = `${leadingWhitespace}${key}: ${serializeScalar(value)}`;
        matched = true;
        keys_changed.push(key);
        break;
      }
    }

    if (!matched) {
      // Append before the closing ---
      lines.splice(closeIdx, 0, `${key}: ${serializeScalar(value)}`);
      closeIdx++;
      keys_appended.push(key);
    }
  }

  return {
    patched: lines.join(eol),
    keys_changed,
    keys_appended,
  };
}

function detectLineEnding(text: string): string {
  // If any CRLF is present, preserve CRLF; else LF. If neither, default LF.
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Does the key at `keyLineIdx` have a block-scalar or wrapped-string value
 * that spans additional lines?
 *
 * Detects two YAML patterns:
 *   - Block scalar indicators: `<key>: |` or `<key>: >` (with optional
 *     chomping/indent modifiers). Following indented lines belong to the value.
 *   - Empty value after colon + indented continuation line below (YAML folded
 *     plain scalar on next line). Rare but possible.
 *
 * A key with value on the same line (scalar + optional inline comment) always
 * returns false — safe to replace.
 */
function isMultiLineValue(
  lines: string[],
  keyLineIdx: number,
  openIdx: number,
  closeIdx: number,
): boolean {
  const keyLine = lines[keyLineIdx];
  const afterColon = keyLine.match(/^\s*[A-Za-z_][A-Za-z0-9_-]*\s*:\s*(.*?)\s*$/);
  const valuePart = afterColon?.[1] ?? '';

  // Block scalar indicator: `|` or `>` (possibly followed by chomping/indent
  // modifiers like `|-`, `|+`, `>-`, `|2`) and nothing else meaningful.
  if (/^[|>][-+]?[0-9]*\s*(#.*)?$/.test(valuePart)) {
    return true;
  }

  // Empty value on this line and the next line (still inside frontmatter) is
  // indented more than this key's indent → continuation.
  if (valuePart === '') {
    const thisIndent = keyLine.match(/^\s*/)?.[0].length ?? 0;
    if (keyLineIdx + 1 < closeIdx) {
      const nextLine = lines[keyLineIdx + 1];
      const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;
      if (nextLine.trim() !== '' && nextIndent > thisIndent) {
        return true;
      }
    }
  }

  // Guard unused params (typescript happier) — openIdx reserved for future use
  // if we need broader context checks.
  void openIdx;
  return false;
}

function validateKey(key: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
    throw new PatchFrontmatterError(
      `invalid frontmatter key "${key}" — must match /^[A-Za-z_][A-Za-z0-9_-]*$/`,
    );
  }
}

/**
 * Match a frontmatter line against a target key.
 *
 * Accepts the YAML scalar-key form `<key>:` optionally preceded by whitespace.
 * Block-scalar forms (`<key>: |`, `<key>: >`) and nested-map forms are rejected
 * by the caller's scalar-only contract; this matcher just tolerates trailing
 * content after the `:`.
 */
function lineMatchesKey(line: string, key: string): boolean {
  // Escape regex metacharacters in key — validated by validateKey to alphanumeric
  // + `_-`, but belt + braces.
  const re = new RegExp(`^\\s*${key}\\s*:(\\s|$)`);
  return re.test(line);
}

/**
 * Serialize a scalar value for a YAML frontmatter line.
 *
 * Strings are quoted with double quotes if they contain ambiguous or special
 * characters, else written bare. Numbers/booleans/null use their canonical
 * YAML spellings.
 */
export function serializeScalar(value: ScalarValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new PatchFrontmatterError(`cannot serialize non-finite number: ${value}`);
    }
    return String(value);
  }

  // string
  return needsQuoting(value) ? JSON.stringify(value) : value;
}

function needsQuoting(s: string): boolean {
  if (s.length === 0) return true;
  // Reject empty / control / multi-line
  if (/[\r\n\t]/.test(s)) return true;
  // Leading whitespace or trailing whitespace → quote
  if (/^\s|\s$/.test(s)) return true;
  // YAML reserved indicators at start of scalar (per YAML 1.2 spec 5.3)
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(s)) return true;
  // Boolean/null lookalikes
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(s)) return true;
  // Numeric lookalikes
  if (/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(s)) return true;
  // Colons inside (would be parsed as map keys)
  if (/:/.test(s)) return true;
  // Comments
  if (/#/.test(s)) return true;
  // Internal quote characters — would break a bare scalar
  if (/["']/.test(s)) return true;
  return false;
}
