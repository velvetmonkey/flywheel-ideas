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

  // Atomic write-to-tmp + rename (same flow as writeNote).
  const tmpName = `.${path.basename(full)}.${process.pid}.${Date.now()}.tmp`;
  const tmpPath = path.join(path.dirname(full), tmpName);
  try {
    await fsp.writeFile(tmpPath, patched, 'utf8');
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
