/**
 * ID generation for flywheel-ideas entities.
 *
 * Uses a base58-inspired alphabet (digits + Latin letters, confusable glyphs
 * 0/O/I/l removed) so ids are copy-paste-safe in terminal output and remain
 * URL-safe. IDs have an entity-prefix (`idea-`, `asm-`, `out-`, etc.) and 8
 * random characters for ~47 bits of entropy — collision-free for any realistic
 * per-user vault.
 *
 * Uses `node:crypto.randomBytes` directly so there is no external dependency
 * on `nanoid`. Matches the flywheel-memory choice of keeping the runtime lean.
 */

import { randomBytes } from 'node:crypto';

/** Digits + letters with 0/O/I/l removed — safe to paste into CLIs and URLs. */
export const ID_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const DEFAULT_ID_LENGTH = 8;

/**
 * Generate an id like `<prefix>-<random>` using the safe alphabet.
 *
 * @param prefix short entity tag, e.g. `"idea"`, `"asm"`, `"out"`.
 * @param length number of random characters. Defaults to 8.
 */
export function generateId(prefix: string, length: number = DEFAULT_ID_LENGTH): string {
  if (!/^[a-z]+$/.test(prefix)) {
    throw new Error(`generateId: prefix must be lowercase letters only, got "${prefix}"`);
  }
  if (length < 1 || !Number.isInteger(length)) {
    throw new Error(`generateId: length must be a positive integer, got ${length}`);
  }

  // Reject bytes that would bias the modulo, consistent with uniform sampling.
  const threshold = Math.floor(256 / ID_ALPHABET.length) * ID_ALPHABET.length;
  let out = '';
  while (out.length < length) {
    const bytes = randomBytes(length - out.length);
    for (const b of bytes) {
      if (b < threshold) {
        out += ID_ALPHABET[b % ID_ALPHABET.length];
        if (out.length === length) break;
      }
    }
  }
  return `${prefix}-${out}`;
}

export const generateIdeaId = (): string => generateId('idea');
export const generateAssumptionId = (): string => generateId('asm');
export const generateOutcomeId = (): string => generateId('out');
export const generateCouncilSessionId = (): string => generateId('sess');
export const generateCouncilViewId = (): string => generateId('view');
export const generateTransitionId = (): string => generateId('trans');
export const generateDispatchId = (): string => generateId('disp');
export const generateFreezeId = (): string => generateId('fr');
