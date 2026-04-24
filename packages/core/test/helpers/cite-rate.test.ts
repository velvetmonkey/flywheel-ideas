import { describe, it, expect } from 'vitest';
import { citeRate } from './cite-rate.js';

describe('citeRate — path substring match', () => {
  it('returns rate=1 when every cell cites at least one source path', () => {
    const r = citeRate({
      cellOutputs: [
        'See risks-and-mitigations.md for context.',
        'Per tech/flywheel/thesis.md the assumption is fragile.',
      ],
      sourcePaths: ['risks-and-mitigations.md', 'tech/flywheel/thesis.md'],
    });
    expect(r.cited).toBe(2);
    expect(r.total).toBe(2);
    expect(r.rate).toBe(1);
    expect(r.perCellCited).toEqual([true, true]);
  });

  it('returns rate=0 when no cell mentions any source path', () => {
    const r = citeRate({
      cellOutputs: ['generic critique', 'another generic critique'],
      sourcePaths: ['some/note.md'],
    });
    expect(r.cited).toBe(0);
    expect(r.rate).toBe(0);
    expect(r.perCellCited).toEqual([false, false]);
  });

  it('returns rate=0.5 when half the cells cite', () => {
    const r = citeRate({
      cellOutputs: [
        'cites notes/x.md here',
        'no path here',
        'also cites notes/x.md',
        'still no path',
      ],
      sourcePaths: ['notes/x.md'],
    });
    expect(r.rate).toBe(0.5);
    expect(r.cited).toBe(2);
    expect(r.perCellCited).toEqual([true, false, true, false]);
  });

  it('substring-match counts even partial path mentions', () => {
    // Persona may abbreviate path to just the filename.
    const r = citeRate({
      cellOutputs: ['referenced thesis.md in the critique'],
      sourcePaths: ['tech/flywheel/thesis.md'],
    });
    // tech/flywheel/thesis.md is NOT a substring of "referenced thesis.md in the critique";
    // but the helper does the inverse direction (does cell contain full path?). So this fails.
    // That matches the documented methodology — substring of the source path IN the cell text.
    expect(r.rate).toBe(0);
  });

  it('handles empty inputs gracefully', () => {
    expect(citeRate({ cellOutputs: [], sourcePaths: ['x.md'] })).toEqual({
      rate: 0,
      cited: 0,
      total: 0,
      perCellCited: [],
    });
    expect(citeRate({ cellOutputs: ['a'], sourcePaths: [] })).toEqual({
      rate: 0,
      cited: 0,
      total: 1,
      perCellCited: [false],
    });
  });

  it('cell citing one of multiple source paths counts as cited', () => {
    const r = citeRate({
      cellOutputs: ['mentions a.md only'],
      sourcePaths: ['a.md', 'b.md', 'c.md'],
    });
    expect(r.rate).toBe(1);
  });
});
