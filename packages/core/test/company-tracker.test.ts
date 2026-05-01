import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyCompanyOutcomes,
  deleteIdeasDbFiles,
  openIdeasDb,
  readCompanyRun,
  runMigrations,
  trackCompanies,
  type IdeasDatabase,
} from '../src/index.js';

const FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sec-company',
  'apple',
);

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-company-'));
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('company tracker', () => {
  it('tracks fixture filings, writes reports, and stages outcomes without applying them', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['AAPL'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    expect(result.promoted_ideas).toBeGreaterThanOrEqual(2);
    expect(result.promoted_assumptions).toBeGreaterThanOrEqual(3);
    expect(result.staged_outcomes).toBeGreaterThanOrEqual(1);

    await expect(fsp.stat(path.join(vault, result.report_md_path))).resolves.toBeDefined();
    await expect(fsp.stat(path.join(vault, result.report_json_path))).resolves.toBeDefined();

    const data = readCompanyRun(db, result.run_id) as {
      outcomes: Array<{ state: string; applied_outcome_id: string | null }>;
    };
    expect(data.outcomes).toHaveLength(result.staged_outcomes);
    expect(data.outcomes[0].state).toBe('staged');
    expect(data.outcomes[0].applied_outcome_id).toBeNull();

    const refuted = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(refuted.n).toBe(0);
  });

  it('bulk applies reviewed staged outcomes through outcome.log', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['AAPL'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    const applied = await applyCompanyOutcomes(db, vault, {
      run_id: result.run_id,
      min_confidence: 0.9,
      confirm: true,
    });

    expect(applied.applied_count).toBe(result.staged_outcomes);
    const refuted = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(refuted.n).toBe(result.staged_outcomes);

    const data = readCompanyRun(db, result.run_id) as {
      outcomes: Array<{ state: string; applied_outcome_id: string | null }>;
    };
    expect(data.outcomes[0].state).toBe('applied');
    expect(data.outcomes[0].applied_outcome_id).toMatch(/^out-/);
  });
});
