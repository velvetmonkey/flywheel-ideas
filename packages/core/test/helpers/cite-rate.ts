/**
 * Cite-rate measurement helper for the v0.2 KEYSTONE pilot gate.
 *
 * Per the v0.2 plan's pre-registered falsification signal (Copilot's
 * counter-thesis, accepted by the user verbatim): *"≥70% of cells from a
 * 10-council pilot must explicitly cite a vault path or vault-note title
 * in their critique"*. Below that threshold, the keystone is plumbing
 * without payoff and the approach reassesses.
 *
 * This helper is NOT exercised in CI. It runs against the captured
 * SYNTHESIS.md / per-cell markdowns from a real dogfood pilot — typically
 * via a one-off script or REPL.
 *
 * Methodology (locked by user 2026-04-24): **path substring match**.
 * For each persona cell output, check if any of the source paths from
 * that session's evidence pack appears as a substring in the cell's
 * stance / critique text. Counts a cite even if the persona only
 * mentions `risks-and-mitigations.md` without the full path. Lower bound
 * on real engagement; will under-count semantic engagement that doesn't
 * use path syntax.
 */

export interface CiteRateInput {
  /** Per-cell stance / critique text. One entry per council cell across the pilot. */
  cellOutputs: string[];
  /** All source paths surfaced in the pilot's evidence packs (deduped). */
  sourcePaths: string[];
}

export interface CiteRateResult {
  rate: number;
  cited: number;
  total: number;
  /** Per-cell flag: true if cell mentions at least one source path. */
  perCellCited: boolean[];
}

export function citeRate(input: CiteRateInput): CiteRateResult {
  const { cellOutputs, sourcePaths } = input;
  const total = cellOutputs.length;
  if (total === 0) {
    return { rate: 0, cited: 0, total: 0, perCellCited: [] };
  }
  const perCellCited = cellOutputs.map((cell) =>
    sourcePaths.some((p) => cell.includes(p)),
  );
  const cited = perCellCited.filter(Boolean).length;
  return {
    rate: cited / total,
    cited,
    total,
    perCellCited,
  };
}
