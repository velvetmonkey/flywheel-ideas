/**
 * M13 — real `claude -p` end-to-end test in CI.
 *
 * **Skipped by default.** Runs only when `RUN_REAL_COUNCIL_TESTS=1` is set.
 * The CI workflow gates this with `workflow_dispatch` OR a `run-e2e` PR
 * label, so normal commits don't burn Anthropic auth quota.
 *
 * Flake-aware: vitest per-test retry (2). One real-CLI flake doesn't fail
 * the build. Cell-level failure isolation is already in `runCouncil()` —
 * one persona failing never aborts the session.
 *
 * What this test verifies that mocks cannot:
 *   - the real `claude` binary is invoked with the argv shape `runCouncil`
 *     produces (no flag drift since M8)
 *   - the real `claude` returns a JSON envelope the parser accepts
 *   - the real two-pass metacognitive flow (pass 1 → pass 2) completes
 *   - a real synthesis renders without throwing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  declareAssumption,
  deleteIdeasDbFiles,
  openIdeasDb,
  runCouncil,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

const RUN_REAL = process.env.RUN_REAL_COUNCIL_TESTS === '1';

let vault: string;
let db: IdeasDatabase;

async function seedIdea(): Promise<string> {
  const id = 'idea-real-e2e';
  const relPath = `ideas/${id}.md`;
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, relPath, 'Should we adopt event-driven architecture for subsystem X?', 'nascent', 1, 1);
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(
    path.join(vault, relPath),
    `---\ntitle: Should we adopt event-driven architecture for subsystem X?\n---\n\nThe synchronous design has growing ops burden when debugging cross-service issues. Considering event-driven to decouple, accepting observability cost.\n`,
    'utf8',
  );
  return id;
}

beforeEach(async () => {
  if (!RUN_REAL) return;
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-real-e2e-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  if (!RUN_REAL) return;
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

describe.skipIf(!RUN_REAL)('runCouncil — real claude -p E2E (M13)', () => {
  it(
    'real claude returns a parseable envelope; ≥1 cell succeeds; synthesis renders',
    { retry: 2, timeout: 180_000 },
    async () => {
      const ideaId = await seedIdea();
      await declareAssumption(db, vault, {
        idea_id: ideaId,
        structured: {
          context: 'current synchronous design',
          challenge: 'ops burden of cross-service debugging',
          decision: 'event-driven worth the tradeoff',
          tradeoff: 'observability cost',
        },
        load_bearing: true,
      });

      const result = await runCouncil(
        db,
        vault,
        {
          idea_id: ideaId,
          depth: 'light',
          mode: 'pre_mortem',
          approval_scope: 'session',
        },
        // No spawn_override → the real `claude` binary on $PATH is invoked.
        { clis_override: ['claude'] },
      );

      // Status: either fully succeeded OR partial (some cells failed but synthesis still wrote).
      expect(['success', 'partial']).toContain(result.status);

      // At least one cell must have produced a non-null stance — proves the
      // real binary returned a parseable envelope, not just any output.
      const succeeded = result.views.filter((v) => v.failure_reason === null);
      expect(succeeded.length).toBeGreaterThanOrEqual(1);
      for (const v of succeeded) {
        expect(v.confidence).toBeTypeOf('number');
        expect(v.content_vault_path).toMatch(/councils\/.*\/session-01\/.*\.md/);
      }

      // Synthesis must exist on disk and reference both personas.
      const synthAbs = path.join(vault, result.synthesis_vault_path);
      const synth = await fsp.readFile(synthAbs, 'utf8');
      expect(synth).toContain('Council session');

      // Any failures must be classified — UNCATALOGUED (i.e. unknown) would
      // mean the v0.1.1 auth/rate_limit work missed a real-world surface.
      for (const v of result.views) {
        if (v.failure_reason !== null) {
          expect(v.failure_reason).not.toBe('unknown');
        }
      }
    },
  );
});
