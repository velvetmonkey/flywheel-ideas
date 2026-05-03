/**
 * Real-world SEC company lifecycle E2E.
 *
 * Skipped by default. Enable with:
 *
 *   RUN_REAL_SEC_COMPANY_E2E=1 npm run test -w @velvetmonkey/flywheel-ideas-core -- company-real-e2e
 *
 * This test intentionally uses live SEC network fetches and a real LLM CLI
 * evaluator. It writes a durable output folder so the run can be inspected
 * outside Vitest. Normal CI must not depend on this test.
 */

import { describe, expect, it } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  evaluateCompanyRun,
  openIdeasDb,
  readCompanyRun,
  runMigrations,
  trackCompanies,
  writeCompanyBundleReports,
  type IdeasDatabase,
} from '../src/index.js';

const RUN_REAL = process.env.RUN_REAL_SEC_COMPANY_E2E === '1';

const DEFAULT_COHORT = [
  ['Information Technology', ['AAPL', 'MSFT', 'NVDA']],
  ['Consumer Discretionary', ['AMZN', 'TSLA', 'HD']],
  ['Communication Services', ['GOOGL', 'META', 'NFLX']],
  ['Health Care', ['LLY', 'JNJ', 'MRK']],
  ['Energy', ['XOM', 'CVX', 'COP']],
] as const;

describe.skipIf(!RUN_REAL)('company tracker — real SEC + real LLM E2E', () => {
  it(
    'produces a durable real-world lifecycle output bundle',
    { timeout: 30 * 60 * 1000, retry: 0 },
    async () => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outRoot = process.env.FLYWHEEL_IDEAS_SEC_E2E_OUT_DIR
        ?? path.join(os.homedir(), 'sec-dogfood', 'real-e2e-runs');
      const outDir = path.join(outRoot, stamp);
      const vault = path.join(outDir, 'vault');
      await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });

      const previousNetwork = process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK;
      const previousUserAgent = process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT;
      process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK = '1';
      process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT =
        previousUserAgent ?? 'flywheel-ideas real-sec-e2e contact: velvetmonkey';

      let db: IdeasDatabase | null = null;
      try {
        db = openIdeasDb(vault);
        runMigrations(db);

        const companies = resolveCompanies();
        const runId = `real-sec-e2e-${stamp.toLowerCase()}`;
        const years = numberEnv('FLYWHEEL_IDEAS_SEC_E2E_YEARS', 3);
        const limitFilings = numberEnv('FLYWHEEL_IDEAS_SEC_E2E_LIMIT_FILINGS', 2);
        const evalLimit = numberEnv('FLYWHEEL_IDEAS_SEC_E2E_EVAL_LIMIT', 5);
        const result = await trackCompanies(db, vault, {
          run_id: runId,
          companies,
          years,
          forms: ['10-K', '10-Q'],
          confirm: true,
          limit_filings: limitFilings,
          max_companies: 125,
          company_metadata: buildMetadata(companies),
        });

        const outcomeEvaluation = result.staged_outcomes > 0
          ? await evaluateCompanyRun(db, vault, {
            run_id: result.run_id,
            stage: 'outcome_validity',
            limit: evalLimit,
            confirm: true,
          })
          : null;

        const thesisEvaluation = await evaluateCompanyRun(db, vault, {
          run_id: result.run_id,
          stage: 'thesis_delta',
          limit: evalLimit,
          confirm: true,
        });
        const bundle = await writeCompanyBundleReports(db, vault, result.run_id);
        const report = readCompanyRun(db, result.run_id) as {
          evaluation_attempts: unknown[];
          run_members: Array<{ status: string }>;
          company_summaries: unknown[];
        };

        const manifest = {
          schema: 1,
          run_id: result.run_id,
          out_dir: outDir,
          vault,
          companies,
          years,
          limit_filings: limitFilings,
          eval_limit: evalLimit,
          result,
          outcome_evaluation: outcomeEvaluation,
          thesis_evaluation: thesisEvaluation,
          bundle,
          report_summary: {
            evaluation_attempts: report.evaluation_attempts.length,
            company_summaries: report.company_summaries.length,
            completed_members: report.run_members.filter((member) => member.status === 'completed').length,
          },
          generated_at: new Date().toISOString(),
        };
        await fsp.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
        await fsp.writeFile(path.join(outDir, 'README.md'), renderReadme(manifest), 'utf8');

        expect(result.completed_companies).toBeGreaterThan(0);
        expect(report.company_summaries.length).toBeGreaterThan(0);
        expect(thesisEvaluation.evaluated_targets).toBeGreaterThan(0);
        expect(report.evaluation_attempts.length).toBeGreaterThan(0);
        await expect(fsp.stat(path.join(vault, bundle.indexPath))).resolves.toBeDefined();
      } finally {
        db?.close();
        if (previousNetwork === undefined) delete process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK;
        else process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK = previousNetwork;
        if (previousUserAgent === undefined) delete process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT;
        else process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT = previousUserAgent;
      }
    },
  );
});

function resolveCompanies(): string[] {
  const raw = process.env.FLYWHEEL_IDEAS_SEC_E2E_COMPANIES;
  if (raw) return raw.split(',').map((ticker) => ticker.trim().toUpperCase()).filter(Boolean);
  return DEFAULT_COHORT.flatMap(([, tickers]) => [...tickers]);
}

function buildMetadata(companies: string[]): Record<string, { sector: string; source_rank: number; source: string }> {
  const metadata: Record<string, { sector: string; source_rank: number; source: string }> = {};
  for (const [sector, tickers] of DEFAULT_COHORT) {
    tickers.forEach((ticker, index) => {
      if (companies.includes(ticker)) {
        metadata[ticker] = {
          sector,
          source_rank: index + 1,
          source: 'real-sec-e2e-default-cohort',
        };
      }
    });
  }
  for (const ticker of companies) {
    metadata[ticker] ??= {
      sector: 'Custom',
      source_rank: 1,
      source: 'real-sec-e2e-custom-cohort',
    };
  }
  return metadata;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function renderReadme(manifest: { run_id: string; vault: string; bundle: { indexPath: string }; companies: string[] }): string {
  return [
    '# Real SEC + LLM Company Lifecycle E2E',
    '',
    `Run id: ${manifest.run_id}`,
    `Vault: ${manifest.vault}`,
    `Companies: ${manifest.companies.join(', ')}`,
    '',
    '## Start Here',
    '',
    `Open \`${manifest.bundle.indexPath}\` inside the generated vault.`,
    '',
    '## Notes',
    '',
    '- This run uses live SEC data and a real LLM CLI evaluator.',
    '- It is decision-support output, not investment advice.',
    '- The output folder is intentionally not deleted after the test.',
    '',
  ].join('\n');
}
