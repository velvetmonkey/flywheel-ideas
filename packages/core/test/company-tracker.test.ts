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
  readCompanyThesisReport,
  recordOutcomeMemo,
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
    expect(result.completed_companies).toBe(3);
    expect(result.failed_companies).toEqual([]);
    expect(result.report_md_path).toBe(`reports/company-tracker-${result.run_id.toLowerCase()}.md`);
    expect(result.thesis_report_md_path).toBe(`reports/company-thesis-${result.run_id.toLowerCase()}.md`);

    await expect(fsp.stat(path.join(vault, result.report_md_path))).resolves.toBeDefined();
    await expect(fsp.stat(path.join(vault, result.report_json_path))).resolves.toBeDefined();
    await expect(fsp.stat(path.join(vault, result.thesis_report_md_path))).resolves.toBeDefined();
    await expect(fsp.stat(path.join(vault, result.thesis_report_json_path))).resolves.toBeDefined();

    const markdown = await fsp.readFile(path.join(vault, result.report_md_path), 'utf8');
    expect(markdown).toContain('type: report');
    expect(markdown).toContain('report_kind: sec_company_tracker');
    expect(markdown).toContain(`run_id: ${result.run_id}`);
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

    const thesisMarkdown = await fsp.readFile(path.join(vault, result.thesis_report_md_path), 'utf8');
    expect(thesisMarkdown).toContain('type: report');
    expect(thesisMarkdown).toContain('report_kind: company_thesis');
    expect(thesisMarkdown).toContain('## Executive Readout');
    expect(thesisMarkdown).toContain('## Current Thesis Dependencies');
    expect(thesisMarkdown).toContain('## Prior Failures And Lessons');
    expect(thesisMarkdown).toContain('## What Needs Human Review');
    expect(thesisMarkdown).toContain('## Cross-Company Patterns');
    expect(thesisMarkdown).toContain('## What To Watch Next');
    expect(thesisMarkdown).toContain('## Limits');
    expect(thesisMarkdown).toContain('not investment advice');

    const data = readCompanyRun(db, result.run_id) as {
      company_thesis_report: {
        report_kind: string;
        executive_readout: {
          current_bets: number;
          review_events: number;
          staged_candidates: number;
          accepted_failures: number;
        };
        current_thesis_dependencies: unknown[];
        needs_human_review: unknown[];
        cross_company_patterns: unknown[];
        watch_next: unknown[];
        markdown: string;
      };
      filings: unknown[];
      company_summaries: unknown[];
      theme_matrix: unknown[];
      sector_matrix: Array<{ sector: string; company_count: number; top_themes: string[] }>;
      cross_sector_patterns: Array<{
        theme_title: string;
        mechanism_title: string;
        sectors: string[];
        companies: string[];
        signal: string;
        learning: string;
      }>;
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
        markdown: string;
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
    expect(data.sector_matrix.length).toBeGreaterThanOrEqual(1);
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
    expect(data.company_thesis_report.report_kind).toBe('company_thesis');
    expect(data.company_thesis_report.executive_readout.current_bets).toBe(data.sec_ledger_report.executive_summary.current_bets);
    expect(data.company_thesis_report.executive_readout.review_events).toBe(data.sec_ledger_report.executive_summary.review_events);
    expect(data.company_thesis_report.executive_readout.staged_candidates).toBe(result.staged_outcomes);
    expect(data.company_thesis_report.executive_readout.accepted_failures).toBe(0);
    expect(data.company_thesis_report.current_thesis_dependencies.length).toBeGreaterThan(0);
    expect(data.company_thesis_report.needs_human_review.length).toBeGreaterThan(0);
    expect(data.company_thesis_report.cross_company_patterns.length).toBeGreaterThan(0);
    expect(data.company_thesis_report.watch_next.length).toBeGreaterThan(0);
    expect(data.company_thesis_report.markdown).toContain('## What To Watch Next');
    expect(readCompanyThesisReport(db, result.run_id).report_kind).toBe('company_thesis');
    expect(data.sec_ledger_report.markdown).toContain('## Lifecycle Snapshot');
    expect(data.sec_ledger_report.markdown).toContain('This report tracks the loop: current bets -> evidence over time -> review queue -> accepted outcomes -> lessons.');
    expect(data.sec_ledger_report.markdown).toContain('## Operator Next Step');
    expect(data.sec_ledger_report.markdown).toContain('## Lifecycle Status');
    expect(data.sec_ledger_report.markdown).toContain('Visibility only so far');
    expect(data.sec_ledger_report.markdown).toContain('Review the highest-pressure event');
    expect(data.sec_ledger_report.markdown).toContain(`- Current bets: ${data.sec_ledger_report.executive_summary.current_bets} open company/theme assumption(s) still being carried.`);
    expect(data.sec_ledger_report.markdown).toContain(`- Review queue: ${data.sec_ledger_report.executive_summary.review_events} event(s), ${data.sec_ledger_report.executive_summary.staged_candidates} staged candidate(s) awaiting human judgment.`);
    expect(data.outcomes).toHaveLength(result.staged_outcomes);
    expect(data.outcomes[0].state).toBe('staged');
    expect(data.outcomes[0].applied_outcome_id).toBeNull();

    const refuted = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(refuted.n).toBe(0);

    const assumptionPaths = db.prepare(
      `SELECT vault_path FROM ideas_assumptions ORDER BY vault_path`,
    ).all() as Array<{ vault_path: string }>;
    expect(new Set(assumptionPaths.map((row) => row.vault_path)).size).toBe(assumptionPaths.length);
  }, 30_000);

  it('tracks sector metadata, supports more than three companies, and writes bundle pages', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['AAPL', 'MSFT', 'NVDA', 'AAPL'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
      company_metadata: {
        AAPL: { sector: 'Consumer Discretionary', display_name: 'Apple Inc', source_rank: 1, source: 'test' },
        MSFT: { sector: 'Information Technology', display_name: 'Microsoft Corp', source_rank: 2, source: 'test' },
        NVDA: { sector: 'Information Technology', display_name: 'NVIDIA Corp', source_rank: 3, source: 'test' },
      },
    });

    expect(result.completed_companies).toBe(3);
    const data = readCompanyRun(db, result.run_id) as {
      run_members: Array<{ company: string; sector: string; status: string }>;
      company_summaries: Array<{ ticker: string; sector: string; display_name: string }>;
      sector_matrix: Array<{ sector: string; company_count: number; observation_count: number }>;
      cross_sector_patterns: Array<{ mechanism_key: string; mechanism_title: string; sectors: string[]; learning: string }>;
    };
    expect(data.run_members).toHaveLength(3);
    expect(data.run_members.every((member) => member.status === 'completed')).toBe(true);
    expect(data.company_summaries.find((summary) => summary.ticker === 'MSFT')?.sector).toBe('Information Technology');
    expect(data.sector_matrix.map((row) => row.sector)).toContain('Information Technology');

    const index = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/index.md`), 'utf8');
    expect(index).toContain('## Top Down');
    expect(index).toContain('[[reports/company-runs/');
    const matrix = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/sector-assumption-matrix.md`), 'utf8');
    expect(matrix).toContain('# Sector Assumption Matrix');
    const patterns = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/cross-sector-patterns.md`), 'utf8');
    expect(patterns).toContain('# Cross-Sector Patterns');
    expect(patterns).toContain('Mechanism-level comparison');
  }, 30_000);

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
        markdown: string;
        executive_summary: {
          accepted_failures: number;
          accepted_lessons: number;
          missing_lessons: number;
          staged_candidates: number;
          triage_completion: { applied_candidates: number; total_candidates: number; percent: number };
        };
        current_bets: Array<{ assumption_id: string }>;
        review_queue: unknown[];
        lessons_captured: unknown[];
        accepted_verdicts: Array<{
          verdict: string;
          outcome_id: string;
          assumption_id: string;
          memo: { lesson: string } | null;
          memo_command: string;
        }>;
      };
    };
    expect(data.outcomes[0].state).toBe('applied');
    expect(data.outcomes[0].applied_outcome_id).toMatch(/^out-/);
    expect(data.sec_ledger_report.executive_summary.accepted_failures).toBe(result.staged_outcomes);
    expect(data.sec_ledger_report.executive_summary.accepted_lessons).toBe(0);
    expect(data.sec_ledger_report.executive_summary.missing_lessons).toBe(result.staged_outcomes);
    expect(data.sec_ledger_report.executive_summary.staged_candidates).toBe(0);
    expect(data.sec_ledger_report.executive_summary.triage_completion.percent).toBe(100);
    expect(data.sec_ledger_report.review_queue).toHaveLength(0);
    expect(data.sec_ledger_report.lessons_captured).toHaveLength(0);
    expect(data.sec_ledger_report.accepted_verdicts[0].verdict).toBe('refuted');
    expect(data.sec_ledger_report.accepted_verdicts[0].outcome_id).toMatch(/^out-/);
    expect(data.sec_ledger_report.accepted_verdicts[0].memo).toBeNull();
    expect(data.sec_ledger_report.accepted_verdicts[0].memo_command).toContain('outcome.memo_upsert');
    expect(data.sec_ledger_report.markdown).toContain('## Lifecycle Snapshot');
    expect(data.sec_ledger_report.markdown).toContain('- Accepted outcomes:');
    expect(data.sec_ledger_report.markdown).toContain(`- Lessons: 0 recorded memo(s), ${result.staged_outcomes} missing memo(s).`);
    expect(data.sec_ledger_report.markdown).toContain('Write the missing lesson memo');
    expect(data.sec_ledger_report.markdown).toContain(`but ${result.staged_outcomes} still need lesson memos`);
    expect(data.sec_ledger_report.markdown).toContain('## Lessons Captured');
    expect(data.sec_ledger_report.markdown).toContain('No lesson memos recorded yet.');
    const currentBetIds = new Set(data.sec_ledger_report.current_bets.map((bet) => bet.assumption_id));
    for (const verdict of data.sec_ledger_report.accepted_verdicts) {
      expect(currentBetIds.has(verdict.assumption_id)).toBe(false);
    }

    recordOutcomeMemo(db, data.sec_ledger_report.accepted_verdicts[0].outcome_id, {
      root_cause: 'H20 export restrictions reduced usable inventory value.',
      what_we_thought: 'Demand and channel assumptions would remain open.',
      what_actually_happened: 'The filing disclosed a charge tied to diminished H20 demand.',
      lesson: 'Export controls can convert demand risk into inventory write-down risk.',
    });
    if (data.sec_ledger_report.accepted_verdicts[1]) {
      recordOutcomeMemo(db, data.sec_ledger_report.accepted_verdicts[1].outcome_id, {
        root_cause: 'Repeated H20 export restrictions reduced usable inventory value.',
        what_we_thought: 'Demand and channel assumptions would remain open.',
        what_actually_happened: 'Another filing disclosed the same charge pattern tied to diminished H20 demand.',
        lesson: '  Export controls can convert demand risk into inventory write-down risk.  ',
      });
    }
    const withMemo = readCompanyRun(db, result.run_id) as {
      company_thesis_report: {
        executive_readout: { accepted_failures: number; accepted_lessons: number; missing_lessons: number };
        prior_failures_and_lessons: Array<{ lesson: string; verdict_count: number }>;
        markdown: string;
      };
      sec_ledger_report: {
        markdown: string;
        executive_summary: { accepted_lessons: number; missing_lessons: number };
        lessons_captured: Array<{
          lesson: string;
          verdict_count: number;
          companies: string[];
          themes: string[];
          outcome_ids: string[];
          representative: { what_actually_happened: string };
        }>;
        accepted_verdicts: Array<{ memo: { lesson: string } | null }>;
      };
    };
    const expectedMemoCount = data.sec_ledger_report.accepted_verdicts[1] ? 2 : 1;
    expect(withMemo.sec_ledger_report.executive_summary.accepted_lessons).toBe(expectedMemoCount);
    expect(withMemo.sec_ledger_report.executive_summary.missing_lessons).toBe(result.staged_outcomes - expectedMemoCount);
    expect(withMemo.sec_ledger_report.accepted_verdicts[0].memo?.lesson).toBe('Export controls can convert demand risk into inventory write-down risk.');
    expect(withMemo.sec_ledger_report.lessons_captured).toHaveLength(1);
    expect(withMemo.sec_ledger_report.lessons_captured[0].lesson).toBe('Export controls can convert demand risk into inventory write-down risk.');
    expect(withMemo.sec_ledger_report.lessons_captured[0].verdict_count).toBe(expectedMemoCount);
    expect(withMemo.sec_ledger_report.lessons_captured[0].companies).toContain('NVDA');
    expect(withMemo.sec_ledger_report.lessons_captured[0].themes.length).toBeGreaterThan(0);
    expect(withMemo.sec_ledger_report.lessons_captured[0].outcome_ids).toHaveLength(expectedMemoCount);
    expect(withMemo.sec_ledger_report.lessons_captured[0].representative.what_actually_happened).toContain('diminished H20 demand');
    expect(withMemo.sec_ledger_report.markdown).toContain(`- Lessons: ${expectedMemoCount} recorded memo(s), ${result.staged_outcomes - expectedMemoCount} missing memo(s).`);
    expect(withMemo.sec_ledger_report.markdown).toContain('## Lessons Captured');
    expect(withMemo.sec_ledger_report.markdown).toContain('Lesson: Export controls can convert demand risk into inventory write-down risk.');
    expect(withMemo.sec_ledger_report.markdown).toContain(`Evidence: ${expectedMemoCount} accepted failure verdict(s)`);
    expect(withMemo.company_thesis_report.executive_readout.accepted_failures).toBe(result.staged_outcomes);
    expect(withMemo.company_thesis_report.executive_readout.accepted_lessons).toBe(expectedMemoCount);
    expect(withMemo.company_thesis_report.executive_readout.missing_lessons).toBe(result.staged_outcomes - expectedMemoCount);
    expect(withMemo.company_thesis_report.prior_failures_and_lessons[0].lesson).toBe('Export controls can convert demand risk into inventory write-down risk.');
    expect(withMemo.company_thesis_report.prior_failures_and_lessons[0].verdict_count).toBe(expectedMemoCount);
    expect(withMemo.company_thesis_report.markdown).toContain('## Prior Failures And Lessons');
  });

  it('returns a clear empty SEC ledger report before any company run', () => {
    const report = buildSecCompanyLedgerReport(db);
    expect(report.run).toBeNull();
    expect(report.current_bets).toHaveLength(0);
    expect(report.lessons_captured).toHaveLength(0);
    expect(report.markdown).toContain('No SEC company tracker run exists yet');
    expect(report.markdown).toContain('Run `company.track');
  });
});
