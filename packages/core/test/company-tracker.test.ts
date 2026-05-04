import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyCompanyOutcomes,
  evaluateCompanyRun,
  exportCompanyMarkdownEvidence,
  generateCouncilSessionId,
  generateCouncilViewId,
  generateIdeaId,
  openIdeasDb,
  readCompanyRun,
  readCompanyThesisReport,
  recordOutcomeMemo,
  runMigrations,
  trackCompanies,
  writeCompanyBundleReports,
  buildSecCompanyLedgerReport,
  type IdeasDatabase,
} from '../src/index.js';

const FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sec-company',
  'public-tech',
);

const FIVE_SECTOR_COHORT = [
  ['Information Technology', ['AAPL', 'MSFT', 'NVDA']],
  ['Consumer Discretionary', ['AMZN', 'TSLA', 'HD']],
  ['Communication Services', ['GOOGL', 'META', 'NFLX']],
  ['Health Care', ['LLY', 'JNJ', 'MRK']],
  ['Energy', ['XOM', 'CVX', 'COP']],
] as const;

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-company-'));
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  await rmWithRetries(vault);
});

async function rmWithRetries(target: string): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await fsp.rm(target, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EBUSY' && code !== 'EPERM') throw err;
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  try {
    await fsp.rm(target, { recursive: true, force: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (process.platform !== 'win32' || (code !== 'EBUSY' && code !== 'EPERM')) throw err;
  }
}

async function createFiveSectorFixtureDir(root: string): Promise<string> {
  const out = path.join(root, 'five-sector-fixtures');
  await fsp.mkdir(out, { recursive: true });
  const templates = ['aapl', 'msft', 'nvda'];
  let index = 0;
  for (const [, tickers] of FIVE_SECTOR_COHORT) {
    for (const ticker of tickers) {
      const template = templates[index % templates.length];
      await copyCompanyFixtureAlias(template, ticker, index + 1, out);
      index += 1;
    }
  }
  return out;
}

async function copyCompanyFixtureAlias(
  template: string,
  ticker: string,
  index: number,
  out: string,
): Promise<void> {
  const src = path.join(FIXTURE_DIR, template);
  const dest = path.join(out, ticker.toLowerCase());
  await fsp.cp(src, dest, { recursive: true });
  const manifestPath = path.join(dest, 'manifest.json');
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8')) as {
    filings: Array<Record<string, unknown>>;
  };
  const cik = String(9000000000 + index).padStart(10, '0');
  manifest.filings = manifest.filings.map((filing, filingIndex) => ({
    ...filing,
    cik,
    ticker,
    company_name: `${ticker} Fixture Corp`,
    accession_no: `${cik}-${String(index).padStart(2, '0')}-${String(filingIndex + 1).padStart(6, '0')}`,
    filing_url: `fixture://${ticker.toLowerCase()}/${filing.primary_document}`,
  }));
  await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function buildFiveSectorMetadata(): Record<string, { sector: string; display_name: string; source_rank: number; source: string }> {
  const metadata: Record<string, { sector: string; display_name: string; source_rank: number; source: string }> = {};
  for (const [sector, tickers] of FIVE_SECTOR_COHORT) {
    tickers.forEach((ticker, index) => {
      metadata[ticker] = {
        sector,
        display_name: `${ticker} Fixture Corp`,
        source_rank: index + 1,
        source: 'test-five-sector-fixture',
      };
    });
  }
  return metadata;
}

function tableCounts(): { filings: number; themes: number; observations: number; outcomes: number } {
  const filings = db.prepare(`SELECT COUNT(*) as n FROM ideas_company_filings`).get() as { n: number };
  const themes = db.prepare(`SELECT COUNT(*) as n FROM ideas_company_themes`).get() as { n: number };
  const observations = db.prepare(`SELECT COUNT(*) as n FROM ideas_company_observations`).get() as { n: number };
  const outcomes = db.prepare(`SELECT COUNT(*) as n FROM ideas_company_outcome_candidates`).get() as { n: number };
  return {
    filings: filings.n,
    themes: themes.n,
    observations: observations.n,
    outcomes: outcomes.n,
  };
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        out.push(path.relative(root, abs));
      }
    }
  }
  await walk(root);
  return out.sort();
}

async function seedDependentIdeaCitingAssumption(
  assumptionId: string,
  title: string,
): Promise<string> {
  const ideaId = generateIdeaId();
  const vaultPath = `ideas/${ideaId}.md`;
  const now = Date.now();
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, 'explored', ?, ?)`,
  ).run(ideaId, vaultPath, title, now, now);
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(
    path.join(vault, vaultPath),
    `---\ntitle: ${title}\nneeds_review: false\n---\n\nThis follow-on thesis cites a company assumption through a prior council view.\n`,
    'utf8',
  );

  const sessionId = generateCouncilSessionId();
  const viewId = generateCouncilViewId();
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path, purpose)
     VALUES (?, ?, 'light', 'standard', ?, ?, ?, 'predictive')`,
  ).run(sessionId, ideaId, now, now, `councils/${ideaId}/session-01/SYNTHESIS.md`);
  db.prepare(
    `INSERT INTO ideas_council_views (
       id, session_id, model, persona,
       prompt_version, persona_version, model_version,
       input_hash,
       initial_stance, stance, self_critique, confidence,
       content_vault_path, failure_reason, stderr_tail
     ) VALUES (?, ?, 'mock-model', 'risk-pessimist', 'test', 'test', NULL, 'sha256:test',
               NULL, 'The thesis depends on a company assumption.', NULL, 0.7,
               ?, NULL, NULL)`,
  ).run(viewId, sessionId, `councils/${ideaId}/session-01/view.md`);
  db.prepare(
    `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
  ).run(viewId, assumptionId);
  return ideaId;
}

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
      evaluation_attempts: unknown[];
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
    expect(data.evaluation_attempts).toHaveLength(0);

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
    expect(index).toContain('Shadow LLM evaluation index');
    const matrix = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/sector-assumption-matrix.md`), 'utf8');
    expect(matrix).toContain('# Sector Assumption Matrix');
    const patterns = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/cross-sector-patterns.md`), 'utf8');
    expect(patterns).toContain('# Cross-Sector Patterns');
    expect(patterns).toContain('Mechanism-level comparison');
    expect(index).toContain('[[reports/company-runs/');
    expect(index).toContain('Markdown manifest');
    expect(index).toContain('Rebuild instructions');
    expect(index).toContain('```flywheel-audit-json');
    const manifest = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/manifest.md`), 'utf8');
    expect(manifest).toContain('schema: sec-company-ledger-markdown-v1');
    expect(manifest).toContain('```flywheel-audit-json');
  }, 30_000);

  it('supports stable compounding ledger refreshes without duplicating prior artifacts', async () => {
    const first = await trackCompanies(db, vault, {
      ledger_id: 'sec-10y-pilot',
      refresh_id: 'refresh-001',
      compound: true,
      companies: ['AAPL'],
      years: 10,
      forms: ['10-K', '10-Q'],
      start_date: '2022-01-01',
      end_date: '2025-12-31',
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    expect(first.run_id).toBe('sec-10y-pilot');
    expect(first.ledger_id).toBe('sec-10y-pilot');
    expect(first.refresh_id).toBe('refresh-001');
    expect(first.start_date).toBe('2022-01-01');
    expect(first.end_date).toBe('2025-12-31');

    const countsAfterFirst = tableCounts();
    expect(countsAfterFirst.filings).toBe(2);

    const second = await trackCompanies(db, vault, {
      ledger_id: 'sec-10y-pilot',
      refresh_id: 'refresh-002',
      compound: true,
      companies: ['AAPL'],
      years: 10,
      forms: ['10-K', '10-Q'],
      start_date: '2022-01-01',
      end_date: '2026-12-31',
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    expect(second.run_id).toBe(first.run_id);
    const countsAfterSecond = tableCounts();
    expect(countsAfterSecond.filings).toBeGreaterThan(countsAfterFirst.filings);
    expect(countsAfterSecond.filings).toBe(3);
    expect(countsAfterSecond.themes).toBe(countsAfterFirst.themes);
    expect(countsAfterSecond.observations).toBeGreaterThanOrEqual(countsAfterFirst.observations);

    const third = await trackCompanies(db, vault, {
      ledger_id: 'sec-10y-pilot',
      refresh_id: 'refresh-003',
      compound: true,
      companies: ['AAPL'],
      years: 10,
      forms: ['10-K', '10-Q'],
      start_date: '2022-01-01',
      end_date: '2026-12-31',
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });
    expect(third.run_id).toBe(first.run_id);
    expect(tableCounts()).toEqual(countsAfterSecond);
  }, 30_000);

  it('exports markdown-only rebuildable evidence snapshots', async () => {
    const result = await trackCompanies(db, vault, {
      ledger_id: 'sec-10y-markdown-only',
      compound: true,
      companies: ['AAPL', 'MSFT'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });
    const destination = path.join(vault, 'markdown-export');
    const exported = await exportCompanyMarkdownEvidence(db, vault, {
      run_id: result.run_id,
      destination_dir: destination,
      confirm: true,
    });

    expect(exported.copied_markdown).toBeGreaterThan(5);
    const files = (await listFiles(destination)).map((file) => file.split(path.sep).join('/'));
    expect(files.length).toBe(exported.copied_markdown);
    expect(files.every((file) => file.endsWith('.md'))).toBe(true);
    expect(files.some((file) => file.startsWith('ideas/'))).toBe(true);
    expect(files.some((file) => file.startsWith('assumptions/'))).toBe(true);
    expect(files.some((file) => file.endsWith('manifest.md'))).toBe(true);
    expect(files.some((file) => file.endsWith('rebuild.md'))).toBe(true);
    expect(files.some((file) => file.endsWith('.json'))).toBe(false);
    expect(files.some((file) => file.includes('.flywheel') || file.endsWith('.db'))).toBe(false);
    const manifest = await fsp.readFile(path.join(destination, `reports/company-runs/${result.run_id.toLowerCase()}/manifest.md`), 'utf8');
    expect(manifest).toContain('```flywheel-audit-json');
    expect(manifest).toContain('"schema": "sec-company-ledger-markdown-v1"');
  }, 30_000);

  it('retries interrupted running members in failed-only resume mode', async () => {
    const first = await trackCompanies(db, vault, {
      ledger_id: 'sec-10y-interrupted-resume',
      compound: true,
      companies: ['AAPL', 'MSFT'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });
    const countsAfterFirst = tableCounts();
    db.prepare(
      `UPDATE ideas_company_run_members
          SET status = 'running', error = NULL, completed_at = NULL
        WHERE run_id = ? AND company = 'MSFT'`,
    ).run(first.run_id);

    const resumed = await trackCompanies(db, vault, {
      ledger_id: 'sec-10y-interrupted-resume',
      compound: true,
      retry_failed_only: true,
      companies: ['AAPL', 'MSFT'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    expect(resumed.run_id).toBe(first.run_id);
    expect(resumed.failed_companies).toEqual([]);
    expect(tableCounts()).toEqual(countsAfterFirst);
    const members = db.prepare(
      `SELECT company, status FROM ideas_company_run_members WHERE run_id = ? ORDER BY company`,
    ).all(first.run_id) as Array<{ company: string; status: string }>;
    expect(members).toEqual([
      { company: 'AAPL', status: 'completed' },
      { company: 'MSFT', status: 'completed' },
    ]);
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

  it('runs shadow evaluations without mutating canonical outcomes', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['AAPL', 'MSFT', 'NVDA'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
    });

    const evaluated = await evaluateCompanyRun(db, vault, {
      run_id: result.run_id,
      stage: 'outcome_validity',
      limit: 2,
      confirm: true,
    }, {
      model: 'mock-evaluator',
      evaluator: async (payload) => ({
        decision: 'ambiguous',
        confidence: 0.6,
        abstention_reason: 'fixture review intentionally abstains',
        summary: `Reviewed ${payload.target_label}`,
        rationale: 'The cited excerpt needs human review before canonical application.',
        evidence_refs: payload.evidence_refs,
        uncertainty: 'Mock evaluator cannot adjudicate issuer language.',
        recommended_next_step: 'human review',
      }),
    });

    expect(evaluated.selected_targets).toBeGreaterThan(0);
    expect(evaluated.evaluated_targets).toBe(evaluated.selected_targets);
    expect(evaluated.summary_paths.evaluation_index).toContain('evaluation-index.md');

    const data = readCompanyRun(db, result.run_id) as {
      evaluation_attempts: Array<{ decision: string; model: string }>;
      outcomes: Array<{ state: string; applied_outcome_id: string | null }>;
    };
    expect(data.evaluation_attempts).toHaveLength(evaluated.evaluated_targets);
    expect(data.evaluation_attempts[0].decision).toBe('ambiguous');
    expect(data.evaluation_attempts[0].model).toBe('mock-evaluator');
    expect(data.outcomes.every((outcome) => outcome.state === 'staged')).toBe(true);
    expect(data.outcomes.every((outcome) => outcome.applied_outcome_id === null)).toBe(true);

    const refuted = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(refuted.n).toBe(0);

    const index = await fsp.readFile(path.join(vault, evaluated.summary_paths.evaluation_index), 'utf8');
    expect(index).toContain('Shadow LLM evaluations');
    expect(index).toContain('ambiguous');
    const disputes = await fsp.readFile(path.join(vault, evaluated.summary_paths.disputes), 'utf8');
    expect(disputes).toContain('Items here need human review');

    const resumed = await evaluateCompanyRun(db, vault, {
      run_id: result.run_id,
      stage: 'outcome_validity',
      limit: 2,
      confirm: true,
    }, {
      model: 'mock-evaluator',
      evaluator: async () => {
        throw new Error('resume should skip unchanged reviewed targets');
      },
    });
    expect(resumed.evaluated_targets).toBe(0);
    expect(resumed.skipped_targets).toBe(evaluated.selected_targets);
  }, 30_000);

  it('selects every SEC lifecycle artifact category for exhaustive mock LLM evaluation', async () => {
    const result = await trackCompanies(db, vault, {
      companies: ['AAPL', 'MSFT', 'NVDA'],
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: FIXTURE_DIR,
      company_metadata: {
        AAPL: { sector: 'Information Technology' },
        MSFT: { sector: 'Information Technology' },
        NVDA: { sector: 'Information Technology' },
      },
    });
    const run = readCompanyRun(db, result.run_id) as {
      filings: unknown[];
      themes: unknown[];
      outcomes: unknown[];
      company_summaries: unknown[];
      cross_sector_patterns: unknown[];
      outcome_groups: unknown[];
    };
    const stages = [
      ['filing_section_meaning', run.filings.length, 'meaningful_signal'],
      ['assumption_quality', run.themes.length, 'assumption_sound'],
      ['outcome_validity', run.outcomes.length, 'valid_failure'],
      ['thesis_delta', run.company_summaries.length, 'thesis_weakened'],
      ['cross_sector_pattern', run.cross_sector_patterns.length, 'pattern_meaningful'],
      ['adjudication_packet', run.outcome_groups.length, 'adjudication_ready'],
    ] as const;

    for (const [stage, expected, decision] of stages) {
      const evaluated = await evaluateCompanyRun(db, vault, {
        run_id: result.run_id,
        stage,
        confirm: true,
      }, {
        model: 'mock-exhaustive-evaluator',
        evaluator: async (payload) => ({
          decision,
          confidence: 0.8,
          summary: `Reviewed ${payload.target_kind}`,
          rationale: `Mock exhaustive ${stage} review.`,
          evidence_refs: payload.evidence_refs,
        }),
      });
      expect(evaluated.selected_targets).toBe(expected);
      expect(evaluated.evaluated_targets).toBe(expected);
    }

    const attempts = db.prepare(
      `SELECT stage, COUNT(*) as n FROM ideas_company_evaluation_attempts GROUP BY stage`,
    ).all() as Array<{ stage: string; n: number }>;
    const byStage = new Map(attempts.map((row) => [row.stage, row.n]));
    for (const [stage, expected] of stages) {
      if (expected === 0) expect(byStage.has(stage)).toBe(false);
      else expect(byStage.get(stage)).toBe(expected);
    }
  }, 30_000);

  it('runs the full SEC product loop across 5 sectors with 3 companies each', async () => {
    const fixtureDir = await createFiveSectorFixtureDir(vault);
    const companies = FIVE_SECTOR_COHORT.flatMap(([, tickers]) => [...tickers]);
    const companyMetadata = buildFiveSectorMetadata();
    const result = await trackCompanies(db, vault, {
      companies,
      years: 10,
      forms: ['10-K', '10-Q'],
      confirm: true,
      fixture_dir: fixtureDir,
      company_metadata: companyMetadata,
    });

    expect(result.completed_companies).toBe(15);
    expect(result.failed_companies).toEqual([]);
    expect(result.staged_outcomes).toBeGreaterThan(0);

    const outcomeReview = await evaluateCompanyRun(db, vault, {
      run_id: result.run_id,
      stage: 'outcome_validity',
      limit: 5,
      confirm: true,
    }, {
      model: 'mock-evaluator',
      evaluator: async (payload) => ({
        decision: 'valid_failure',
        confidence: 0.92,
        summary: `Validated realized-risk candidate for ${payload.target_label}`,
        rationale: 'Fixture evidence is treated as a high-confidence realized event for full-loop testing.',
        evidence_refs: payload.evidence_refs,
        uncertainty: null,
        recommended_next_step: 'human apply selected outcome after review',
      }),
    });
    const thesisReview = await evaluateCompanyRun(db, vault, {
      run_id: result.run_id,
      stage: 'thesis_delta',
      limit: 5,
      confirm: true,
    }, {
      model: 'mock-evaluator',
      evaluator: async (payload) => ({
        decision: 'thesis_weakened',
        confidence: 0.81,
        summary: `${payload.target_label} has a weakened thesis because staged evidence needs review.`,
        rationale: 'The company has staged realized-risk evidence that should reduce confidence until adjudicated.',
        evidence_refs: payload.evidence_refs,
        uncertainty: 'Fixture aliases reuse reduced SEC evidence, so this is a process test rather than a market claim.',
        recommended_next_step: 'review accepted outcome candidates and capture lessons',
      }),
    });

    expect(outcomeReview.evaluated_targets).toBeGreaterThan(0);
    expect(thesisReview.evaluated_targets).toBe(5);

    const selectedCandidateId = outcomeReview.attempts[0].target_id_value;
    const selectedCandidate = db.prepare(
      `SELECT id, assumption_id FROM ideas_company_outcome_candidates WHERE id = ?`,
    ).get(selectedCandidateId) as { id: string; assumption_id: string } | undefined;
    expect(selectedCandidate?.assumption_id).toMatch(/^asm-/);

    const dependentIdeaId = await seedDependentIdeaCitingAssumption(
      selectedCandidate!.assumption_id,
      'Follow-on sector allocation thesis',
    );
    const beforeApply = db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`)
      .get(dependentIdeaId) as { needs_review: number };
    expect(beforeApply.needs_review).toBe(0);

    const applied = await applyCompanyOutcomes(db, vault, {
      run_id: result.run_id,
      outcome_candidate_ids: [selectedCandidateId],
      confirm: true,
    });
    expect(applied.applied_count).toBe(1);
    expect(applied.applied[0].candidate_id).toBe(selectedCandidateId);

    const refutedAssumption = db.prepare(`SELECT status FROM ideas_assumptions WHERE id = ?`)
      .get(selectedCandidate!.assumption_id) as { status: string };
    expect(refutedAssumption.status).toBe('refuted');
    const dependentAfterApply = db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`)
      .get(dependentIdeaId) as { needs_review: number };
    expect(dependentAfterApply.needs_review).toBe(1);
    const dependentMarkdown = await fsp.readFile(path.join(vault, `ideas/${dependentIdeaId}.md`), 'utf8');
    expect(dependentMarkdown).toContain('needs_review: true');

    recordOutcomeMemo(db, applied.applied[0].outcome_id, {
      refuted_assumption_id: selectedCandidate!.assumption_id,
      root_cause: 'Realized SEC risk evidence weakened a previously open company assumption.',
      what_we_thought: 'The company could carry the risk without material disruption.',
      what_actually_happened: 'A later filing disclosed realized-risk evidence requiring human acceptance.',
      lesson: 'Recurring risk disclosure becomes valuable when it is linked to accepted outcomes and downstream review.',
    });
    await writeCompanyBundleReports(db, vault, result.run_id);

    const finalData = readCompanyRun(db, result.run_id) as {
      evaluation_attempts: Array<{ stage: string; decision: string }>;
      sector_matrix: Array<{ sector: string; company_count: number }>;
      company_summaries: Array<{ ticker: string; sector: string }>;
      sec_ledger_report: {
        executive_summary: {
          accepted_failures: number;
          accepted_lessons: number;
          missing_lessons: number;
          staged_candidates: number;
        };
        needs_review: Array<{ id: string; title: string }>;
        lessons_captured: Array<{ lesson: string; verdict_count: number; companies: string[]; themes: string[] }>;
        accepted_verdicts: Array<{ outcome_id: string; assumption_id: string; memo: { lesson: string } | null }>;
        markdown: string;
      };
      company_thesis_report: {
        executive_readout: { accepted_failures: number; accepted_lessons: number };
        prior_failures_and_lessons: Array<{ lesson: string; verdict_count: number }>;
        markdown: string;
      };
    };
    expect(finalData.company_summaries).toHaveLength(15);
    expect(finalData.sector_matrix).toHaveLength(5);
    expect(finalData.sector_matrix.every((sector) => sector.company_count === 3)).toBe(true);
    expect(finalData.evaluation_attempts.filter((attempt) => attempt.stage === 'outcome_validity')).toHaveLength(outcomeReview.evaluated_targets);
    expect(finalData.evaluation_attempts.filter((attempt) => attempt.stage === 'thesis_delta')).toHaveLength(thesisReview.evaluated_targets);
    expect(finalData.evaluation_attempts.map((attempt) => attempt.decision)).toContain('valid_failure');
    expect(finalData.evaluation_attempts.map((attempt) => attempt.decision)).toContain('thesis_weakened');
    expect(finalData.sec_ledger_report.executive_summary.accepted_failures).toBe(1);
    expect(finalData.sec_ledger_report.executive_summary.accepted_lessons).toBe(1);
    expect(finalData.sec_ledger_report.executive_summary.missing_lessons).toBe(0);
    expect(finalData.sec_ledger_report.needs_review.map((idea) => idea.id)).toContain(dependentIdeaId);
    expect(finalData.sec_ledger_report.lessons_captured).toHaveLength(1);
    expect(finalData.sec_ledger_report.lessons_captured[0].verdict_count).toBe(1);
    expect(finalData.sec_ledger_report.accepted_verdicts[0].memo?.lesson).toContain('Recurring risk disclosure');
    expect(finalData.sec_ledger_report.markdown).toContain('Dependent Ideas Needing Review');
    expect(finalData.company_thesis_report.executive_readout.accepted_failures).toBe(1);
    expect(finalData.company_thesis_report.executive_readout.accepted_lessons).toBe(1);
    expect(finalData.company_thesis_report.prior_failures_and_lessons[0].lesson).toContain('Recurring risk disclosure');
    expect(finalData.company_thesis_report.markdown).toContain('## Prior Failures And Lessons');

    const bundleIndex = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/index.md`), 'utf8');
    expect(bundleIndex).toContain('Shadow LLM evaluations: 10');
    expect(bundleIndex).toContain('Accepted failures: 1');
    const evalIndex = await fsp.readFile(path.join(vault, outcomeReview.summary_paths.evaluation_index), 'utf8');
    expect(evalIndex).toContain('valid_failure');
    expect(evalIndex).toContain('thesis_weakened');
    const acceptedLessons = await fsp.readFile(path.join(vault, `reports/company-runs/${result.run_id.toLowerCase()}/accepted-lessons.md`), 'utf8');
    expect(acceptedLessons).toContain('Recurring risk disclosure');
  }, 60_000);

  it('returns a clear empty SEC ledger report before any company run', () => {
    const report = buildSecCompanyLedgerReport(db);
    expect(report.run).toBeNull();
    expect(report.current_bets).toHaveLength(0);
    expect(report.lessons_captured).toHaveLength(0);
    expect(report.markdown).toContain('No SEC company tracker run exists yet');
    expect(report.markdown).toContain('Run `company.track');
  });
});
