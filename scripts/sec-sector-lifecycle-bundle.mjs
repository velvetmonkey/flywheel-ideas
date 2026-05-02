#!/usr/bin/env node
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  openIdeasDb,
  probeWritePath,
  runMigrations,
  trackCompanies,
  writeCompanyBundleReports,
} from '../packages/core/dist/index.js';

const DEFAULT_COHORT = [
  ['Information Technology', ['NVDA', 'AAPL', 'MSFT', 'AVGO', 'MU', 'AMD', 'INTC', 'ORCL', 'CSCO', 'PLTR']],
  ['Consumer Discretionary', ['AMZN', 'TSLA', 'HD', 'MCD', 'TJX', 'BKNG', 'LOW', 'SBUX', 'MAR', 'ABNB']],
  ['Communication Services', ['GOOGL', 'META', 'NFLX', 'TMUS', 'VZ', 'DIS', 'T', 'CMCSA', 'WBD', 'EA']],
  ['Consumer Staples', ['WMT', 'COST', 'PG', 'KO', 'PM', 'PEP', 'MO', 'MDLZ', 'MNST', 'CL']],
  ['Financials', ['BRK-B', 'JPM', 'V', 'MA', 'BAC', 'MS', 'GS', 'WFC', 'AXP', 'C']],
  ['Health Care', ['LLY', 'JNJ', 'ABBV', 'UNH', 'MRK', 'AMGN', 'TMO', 'GILD', 'ISRG', 'ABT']],
  ['Energy', ['XOM', 'CVX', 'COP', 'WMB', 'SLB', 'EOG', 'VLO', 'MPC', 'KMI', 'PSX']],
  ['Industrials', ['CAT', 'GE', 'GEV', 'RTX', 'BA', 'ETN', 'UNP', 'DE', 'UBER', 'HON']],
  ['Materials', ['LIN', 'NEM', 'FCX', 'SHW', 'CRH', 'ECL', 'APD', 'CTVA', 'NUE', 'VMC']],
  ['Utilities', ['NEE', 'CEG', 'SO', 'DUK', 'AEP', 'SRE', 'D', 'ETR', 'VST', 'XEL']],
  ['Real Estate', ['WELL', 'PLD', 'EQIX', 'AMT', 'DLR', 'SPG', 'O', 'PSA', 'VTR', 'CBRE']],
];

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('Usage: node scripts/sec-sector-lifecycle-bundle.mjs [--vault <path>] [--out-dir <path>] [--run-id <id>] [--dry-run] [--limit-filings N]');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(args.outDir ?? `/home/ben/sec-dogfood/sector-runs/${stamp}`);
const vault = path.resolve(args.vault ?? path.join(outDir, 'vault'));
const runId = args.runId ?? `sector-${stamp.toLowerCase()}`;
const { companies, metadata } = buildCohort();

if (args.dryRun) {
  console.log(JSON.stringify({
    run_id: runId,
    out_dir: outDir,
    vault,
    company_count: companies.length,
    sectors: DEFAULT_COHORT.map(([sector, tickers]) => ({ sector, count: tickers.length, tickers })),
  }, null, 2));
  process.exit(0);
}

await fsp.mkdir(outDir, { recursive: true });
await fsp.mkdir(vault, { recursive: true });
await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });

const db = openIdeasDb(vault);
runMigrations(db);
await probeWritePath(vault);

const startedAt = new Date().toISOString();
const result = await trackCompanies(db, vault, {
  run_id: runId,
  companies,
  years: Number(args.years ?? 10),
  forms: ['10-K', '10-Q'],
  confirm: true,
  limit_filings: args.limitFilings ? Number(args.limitFilings) : undefined,
  max_companies: 125,
  company_metadata: metadata,
});
const bundle = await writeCompanyBundleReports(db, vault, runId);
const completedAt = new Date().toISOString();

const manifest = {
  schema: 1,
  run_id: runId,
  started_at: startedAt,
  completed_at: completedAt,
  out_dir: outDir,
  vault,
  cohort_source: 'US500 S&P 500 sector leaders checked 2026-05-02; SEC ticker map validates run-time lookups',
  company_count: companies.length,
  sectors: DEFAULT_COHORT.map(([sector, tickers]) => ({ sector, count: tickers.length, tickers })),
  result,
  bundle,
};
await fsp.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await fsp.writeFile(path.join(outDir, 'README.md'), renderRunReadme(manifest), 'utf8');
db.close();
console.log(outDir);

function buildCohort() {
  const companies = [];
  const metadata = {};
  for (const [sector, tickers] of DEFAULT_COHORT) {
    tickers.forEach((ticker, index) => {
      companies.push(ticker);
      metadata[ticker] = {
        sector,
        source_rank: index + 1,
        source: 'us500-sp500-sector-weight-leaders',
      };
    });
  }
  return { companies, metadata };
}

function renderRunReadme(manifest) {
  return [
    '# SEC Sector Lifecycle Bundle',
    '',
    `Run id: ${manifest.run_id}`,
    `Vault: ${manifest.vault}`,
    `Companies: ${manifest.company_count}`,
    '',
    '## Main Entry',
    '',
    `Open \`${manifest.bundle.indexPath}\` in the generated vault.`,
    '',
    '## Notes',
    '',
    '- Markdown reports are written through Flywheel with wikilink suggestions enabled.',
    '- This is decision support and evidence organization, not investment advice.',
    '- Re-run with the same `--run-id` to resume failed companies.',
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') out.help = true;
    else if (arg === '--vault') out.vault = argv[++i];
    else if (arg === '--out-dir') out.outDir = argv[++i];
    else if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--years') out.years = argv[++i];
    else if (arg === '--limit-filings') out.limitFilings = argv[++i];
    else if (arg === '--dry-run') out.dryRun = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}
