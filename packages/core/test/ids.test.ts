import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  generateId,
  generateIdeaId,
  generateAssumptionId,
  ID_ALPHABET,
} from '../src/index.js';

describe('generateId', () => {
  it('produces prefix-shaped ids', () => {
    const id = generateId('idea');
    expect(id).toMatch(/^idea-[A-Za-z0-9]{8}$/);
  });

  it('respects custom length', () => {
    const id = generateId('x', 16);
    expect(id).toMatch(/^x-[A-Za-z0-9]{16}$/);
  });

  it('rejects invalid prefix', () => {
    expect(() => generateId('Bad-prefix')).toThrow();
    expect(() => generateId('has space')).toThrow();
    expect(() => generateId('')).toThrow();
  });

  it('rejects invalid length', () => {
    expect(() => generateId('x', 0)).toThrow();
    expect(() => generateId('x', -1)).toThrow();
    expect(() => generateId('x', 1.5)).toThrow();
  });

  it('uses only the safe alphabet (no confusables 0/O/I/l)', () => {
    const ids = Array.from({ length: 1000 }, () => generateIdeaId());
    for (const id of ids) {
      const body = id.slice('idea-'.length);
      for (const ch of body) {
        expect(ID_ALPHABET).toContain(ch);
      }
      expect(body).not.toMatch(/[0OIl]/);
    }
  });

  it('produces unique ids at scale (no collisions across 10k draws)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generateIdeaId();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it('helper functions produce correctly-prefixed ids', () => {
    expect(generateIdeaId()).toMatch(/^idea-/);
    expect(generateAssumptionId()).toMatch(/^asm-/);
  });

  it('property: any valid (prefix, length) produces a syntactically correct id', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => /^[a-z]+$/.test(s)),
        fc.integer({ min: 1, max: 32 }),
        (prefix, length) => {
          const id = generateId(prefix, length);
          const re = new RegExp(`^${prefix}-[A-Za-z0-9]{${length}}$`);
          expect(id).toMatch(re);
        },
      ),
      { numRuns: 100 },
    );
  });
});
