/**
 * Public-API surface snapshot.
 *
 * Asserts the set of names exported by the package barrel matches the
 * checked-in snapshot. The snapshot is a literal sorted list of all exported
 * binding names (functions, classes, consts, types).
 *
 * Reason to gate on this:
 *   - schema.ts has grown silently past the barrel (V13/V14/V15 were added
 *     to schema.ts but the barrel still only re-exported V1–V12 for several
 *     releases). A snapshot fails loud on the next drift.
 *   - We publish to npm; accidental removals are breaking changes. The diff
 *     in this snapshot lands in code review before the breaking change ships.
 *
 * Workflow when this test fails:
 *   1. Intentional API change? Update the snapshot
 *      (`npx vitest run -u test/api-surface.test.ts`) and call the
 *      change out in the PR description.
 *   2. Accidental drift? Add the missing export to packages/core/src/index.ts
 *      (or remove the orphan) until the snapshot is clean.
 */

import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';

describe('api surface', () => {
  it('exported names match the snapshot', () => {
    const exported = Object.keys(core).sort();
    expect(exported).toMatchSnapshot();
  });

  it('schema-version constant matches the highest re-exported SCHEMA_SQL_V*', () => {
    // Catches the inverse-drift case: barrel exports through V15 but
    // SCHEMA_VERSION was bumped to V16 without adding the new SQL constant
    // to the barrel.
    const versions = Object.keys(core)
      .filter((name) => /^SCHEMA_SQL_V\d+$/.test(name))
      .map((name) => Number(name.replace('SCHEMA_SQL_V', '')))
      .sort((a, b) => a - b);
    const highest = versions[versions.length - 1];
    expect(highest).toBe(core.SCHEMA_VERSION);
  });
});
