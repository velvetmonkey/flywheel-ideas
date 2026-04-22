/**
 * Shared "stale row" filter used by `idea.list` and `assumption.list`.
 *
 * A row is stale when the vault markdown file it references no longer exists.
 * The MCP tools hide stale rows from default listings (they return the same
 * orphan over and over, which trapped LLMs in infinite read→list→read loops
 * pre-M4.5) and expose them only under an explicit `include_stale` flag.
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';

export interface StaleFilterable {
  vault_path: string;
}

export interface FilterStaleOptions {
  /** When true, stale rows are returned unfiltered but annotated. */
  include_stale?: boolean;
}

export interface FilterStaleResult<T extends StaleFilterable> {
  kept: Array<T & { stale: boolean }>;
  staleSkipped: number;
}

/**
 * Partition rows into kept + skipped-stale.
 *
 * - When `include_stale` is false (default), rows pointing at missing files
 *   are dropped and counted in `staleSkipped` so callers can surface
 *   "N stale rows were hidden" hints.
 * - When `include_stale` is true, all rows are kept but each is annotated
 *   with `stale: true|false` so callers can render differently.
 */
export function filterStaleRows<T extends StaleFilterable>(
  vaultPath: string,
  rows: readonly T[],
  options: FilterStaleOptions = {},
): FilterStaleResult<T> {
  const includeStale = options.include_stale === true;
  const kept: Array<T & { stale: boolean }> = [];
  let staleSkipped = 0;

  for (const row of rows) {
    const exists = existsSync(path.join(vaultPath, row.vault_path));
    if (!exists && !includeStale) {
      staleSkipped++;
      continue;
    }
    kept.push({ ...row, stale: !exists });
  }

  return { kept, staleSkipped };
}
