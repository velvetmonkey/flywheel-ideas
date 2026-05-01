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
  'public-tech',
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
  it('tracks the 3-company fixture corpus, writes a comparison brief, and stages outcomes without applying them', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['AAPL', 'MSFT', 'NVDA'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    expect(result.promoted_ideas).toBeGreaterThanOrEqual(9);
    expect(result.promoted_assumptions).toBeGreaterThanOrEqual(12);
    expect(result.staged_outcomes).toBeGreaterThanOrEqual(1);

    await expect(fsp.stat(path.join(vault, result.report_md_path))).resolves.toBeDefined();
    await expect(fsp.stat(path.join(vault, result.report_json_path))).resolves.toBeDefined();

    const markdown = await fsp.readFile(path.join(vault, result.report_md_path), 'utf8');
    expect(markdown).toContain('## Lifecycle Summary');
    expect(markdown).toContain('## Company Summaries');
    expect(markdown).toContain('## Cross-Company Theme Matrix');
    expect(markdown).toContain('## Observation Evidence Examples');
    expect(markdown).toContain('## Realized Outcome Review Events');
    expect(markdown).toContain('## Realized Outcome Candidates');
    expect(markdown).toContain('grouped into');
    expect(markdown).toContain('Value signal: recurring issuer-authored evidence');
    expect(markdown).not.toMatch(/&#(?:x?[0-9a-f]+|[a-z]+);/i);
    expect(markdown).toContain('AAPL');
    expect(markdown).toContain('MSFT');
    expect(markdown).toContain('NVDA');

    const data = readCompanyRun(db, result.run_id) as {
      filings: unknown[];
      company_summaries: unknown[];
      theme_matrix: unknown[];
      lifecycle_summary: {
        filings_scanned: number;
        themes_tracked: number;
        observations: number;
        cross_company_themes: number;
        staged_outcomes: number;
        applied_outcomes: number;
      };
      observation_examples: Array<{ excerpt: string; source_uri: string }>;
      outcome_groups: Array<{
        id: string;
        candidate_count: number;
        candidate_ids: string[];
        themes: string[];
        source_uris: string[];
        representative_excerpt: string;
      }>;
      outcomes: Array<{ state: string; applied_outcome_id: string | null }>;
    };
    expect(data.filings).toHaveLength(9);
    expect(data.company_summaries).toHaveLength(3);
    expect(data.theme_matrix.length).toBeGreaterThanOrEqual(3);
    expect(data.lifecycle_summary.filings_scanned).toBe(9);
    expect(data.lifecycle_summary.observations).toBeGreaterThan(0);
    expect(data.lifecycle_summary.staged_outcomes).toBe(result.staged_outcomes);
    expect(data.observation_examples.length).toBeGreaterThan(0);
    expect(data.observation_examples[0].source_uri).toContain('sec-company://');
    expect(data.observation_examples.every((e) => e.excerpt.length <= 900)).toBe(true);
    expect(data.observation_examples.map((e) => e.excerpt).join('\n')).not.toMatch(/&#(?:x?[0-9a-f]+|[a-z]+);/i);
    expect(data.outcome_groups.length).toBeGreaterThan(0);
    expect(data.outcome_groups.length).toBeLessThanOrEqual(result.staged_outcomes);
    expect(data.outcome_groups[0].id).toMatch(/^og-/);
    expect(data.outcome_groups[0].candidate_count).toBe(data.outcome_groups[0].candidate_ids.length);
    expect(data.outcome_groups[0].themes.length).toBeGreaterThan(0);
    expect(data.outcome_groups[0].source_uris[0]).toContain('sec-company://');
    expect(data.outcome_groups[0].representative_excerpt.length).toBeGreaterThan(0);
    expect(data.outcomes).toHaveLength(result.staged_outcomes);
    expect(data.outcomes[0].state).toBe('staged');
    expect(data.outcomes[0].applied_outcome_id).toBeNull();

    const refuted = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(refuted.n).toBe(0);

    const assumptionPaths = db.prepare(
      `SELECT vault_path FROM ideas_assumptions ORDER BY vault_path`,
    ).all() as Array<{ vault_path: string }>;
    expect(new Set(assumptionPaths.map((row) => row.vault_path)).size).toBe(assumptionPaths.length);
  });

  it('bulk applies reviewed staged outcomes through outcome.log', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['NVDA'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    expect(result.staged_outcomes).toBeGreaterThanOrEqual(1);

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
