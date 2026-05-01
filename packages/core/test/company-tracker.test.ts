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
  buildSecCompanyLedgerReport,
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
      sec_ledger_report: {
        executive_summary: {
          current_bets: number;
          review_events: number;
          staged_candidates: number;
          accepted_failures: number;
          triage_completion: { applied_candidates: number; total_candidates: number; percent: number };
        };
        current_bets: Array<{
          assumption_status: string;
          review_pressure: number;
          freshness: string;
          latest_seen_at: string;
          observation_count: number;
        }>;
        review_queue: Array<{ candidate_ids: string[]; apply_command: string; status: string }>;
        accepted_verdicts: unknown[];
      };
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
    expect(data.sec_ledger_report.executive_summary.current_bets).toBeGreaterThan(0);
    expect(data.sec_ledger_report.executive_summary.review_events).toBe(data.sec_ledger_report.review_queue.length);
    expect(data.sec_ledger_report.executive_summary.staged_candidates).toBe(result.staged_outcomes);
    expect(data.sec_ledger_report.executive_summary.accepted_failures).toBe(0);
    expect(data.sec_ledger_report.executive_summary.triage_completion.applied_candidates).toBe(0);
    expect(data.sec_ledger_report.current_bets[0].assumption_status).toBe('open');
    expect(data.sec_ledger_report.current_bets[0].review_pressure).toBeGreaterThanOrEqual(data.sec_ledger_report.current_bets.at(-1)?.review_pressure ?? 0);
    expect(['fresh', 'cooling', 'stale']).toContain(data.sec_ledger_report.current_bets[0].freshness);
    expect(data.sec_ledger_report.review_queue[0].status).toBe('needs_human_review');
    expect(data.sec_ledger_report.review_queue[0].apply_command).toContain('company.apply_outcomes');
    expect(data.sec_ledger_report.accepted_verdicts).toHaveLength(0);
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
      sec_ledger_report: {
        executive_summary: {
          accepted_failures: number;
          staged_candidates: number;
          triage_completion: { applied_candidates: number; total_candidates: number; percent: number };
        };
        current_bets: Array<{ assumption_id: string }>;
        review_queue: unknown[];
        accepted_verdicts: Array<{ verdict: string; outcome_id: string; assumption_id: string }>;
      };
    };
    expect(data.outcomes[0].state).toBe('applied');
    expect(data.outcomes[0].applied_outcome_id).toMatch(/^out-/);
    expect(data.sec_ledger_report.executive_summary.accepted_failures).toBe(result.staged_outcomes);
    expect(data.sec_ledger_report.executive_summary.staged_candidates).toBe(0);
    expect(data.sec_ledger_report.executive_summary.triage_completion.percent).toBe(100);
    expect(data.sec_ledger_report.review_queue).toHaveLength(0);
    expect(data.sec_ledger_report.accepted_verdicts[0].verdict).toBe('refuted');
    expect(data.sec_ledger_report.accepted_verdicts[0].outcome_id).toMatch(/^out-/);
    const currentBetIds = new Set(data.sec_ledger_report.current_bets.map((bet) => bet.assumption_id));
    for (const verdict of data.sec_ledger_report.accepted_verdicts) {
      expect(currentBetIds.has(verdict.assumption_id)).toBe(false);
    }
  });

  it('returns a clear empty SEC ledger report before any company run', () => {
    const report = buildSecCompanyLedgerReport(db);
    expect(report.run).toBeNull();
    expect(report.current_bets).toHaveLength(0);
    expect(report.markdown).toContain('No SEC company tracker run exists yet');
  });
});
