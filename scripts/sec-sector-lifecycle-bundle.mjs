#!/usr/bin/env node
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  evaluateCompanyRun,
  exportCompanyMarkdownEvidence,
  openIdeasDb,
  probeWritePath,
  runCouncil,
  runMigrations,
  trackCompanies,
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

const COMPANY_EVALUATION_STAGES = [
  'filing_section_meaning',
  'assumption_quality',
  'outcome_validity',
  'thesis_delta',
  'cross_sector_pattern',
  'adjudication_packet',
];
const DEFAULT_EVAL_LIMITS = {
  filing_section_meaning: 40,
  assumption_quality: 40,
  outcome_validity: 40,
  thesis_delta: 25,
  cross_sector_pattern: 25,
  adjudication_packet: 25,
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log([
    'Usage: node scripts/sec-sector-lifecycle-bundle.mjs [options]',
    '',
    'Options:',
    '  --ledger-id <id>       Stable compounding ledger id (default: sec-10y-100-company)',
    '  --refresh-id <id>      Human-readable refresh id (default: current ISO timestamp)',
    '  --vault <path>         Generated Flywheel vault path',
    '  --out-dir <path>       Local working directory for the ledger vault',
    '  --export-dir <path>    Markdown-only evidence export directory',
    '  --run-id <id>          Alias for --ledger-id when compatibility is needed',
    '  --years <n>            SEC lookback window (default: 10)',
    '  --start-date <date>    Optional lower filing date bound, YYYY-MM-DD',
    '  --end-date <date>      Optional upper filing date bound, YYYY-MM-DD',
    '  --pilot <n>            Use only the first n companies for a smoke run',
    '  --limit-filings <n>    Limit filings per company for development only',
    '  --retry-failed-only    Only retry companies already marked failed in the ledger',
    '  --ignore-sec-cooldown  Continue walking companies after SEC cooldown errors',
    '  --skip-evaluation      Skip LLM company evaluation stages',
    '  --eval-limit <n>       Limit targets per evaluation stage (default: bounded per stage)',
    '  --eval-all             Evaluate every target in every stage',
    '  --eval-cli <name>      Evaluator CLI: codex, claude, or gemini',
    '  --eval-model <name>    Evaluator model override',
    '  --skip-council         Skip council/personality sample runs',
    '  --skip-export          Skip Markdown evidence export after tracking/evaluation',
    '  --council-sample <n>   Number of imported ideas to escalate to council (default: 3)',
    '  --dry-run              Print the planned cohort and paths without running',
  ].join('\n'));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const ledgerId = args.ledgerId ?? args.runId ?? 'sec-10y-100-company';
const refreshId = args.refreshId ?? `refresh-${stamp}`;
const outDir = path.resolve(args.outDir ?? `/home/ben/sec-dogfood/company-ledgers/${ledgerId}`);
const vault = path.resolve(args.vault ?? path.join(outDir, 'vault'));
const runId = ledgerId;
const exportDir = path.resolve(args.exportDir ?? path.join(process.cwd(), 'evidence', 'sec-company-ledgers', ledgerId));
const { companies, metadata, sectors } = buildCohort(args.pilot ? Number(args.pilot) : undefined);

if (args.dryRun) {
  console.log(JSON.stringify({
    ledger_id: ledgerId,
    run_id: runId,
    refresh_id: refreshId,
    out_dir: outDir,
    vault,
    export_dir: exportDir,
    years: Number(args.years ?? 10),
    start_date: args.startDate ?? null,
    end_date: args.endDate ?? null,
    company_count: companies.length,
    sectors,
    evaluation: args.skipEvaluation ? 'skipped' : {
      stages: COMPANY_EVALUATION_STAGES,
      limit_per_stage: evaluationLimitPlan(args),
      cli: args.evalCli ?? process.env.FLYWHEEL_IDEAS_COMPANY_EVAL_CLI ?? 'codex',
      model: args.evalModel ?? process.env.FLYWHEEL_IDEAS_COMPANY_EVAL_MODEL ?? null,
    },
    council: args.skipCouncil ? 'skipped' : {
      sample_size: Number(args.councilSample ?? 3),
      depth: 'light',
      modes: ['standard', 'pre_mortem'],
    },
  }, null, 2));
  process.exit(0);
}

if (process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK !== '1') {
  throw new Error('set FLYWHEEL_IDEAS_IMPORT_NETWORK=1 before running live SEC scans');
}
if (!process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT) {
  throw new Error('set FLYWHEEL_IDEAS_SEC_USER_AGENT to an SEC-compliant app/contact user agent');
}

await fsp.mkdir(outDir, { recursive: true });
await fsp.mkdir(vault, { recursive: true });
await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });

const db = openIdeasDb(vault);
runMigrations(db);
await probeWritePath(vault);

const startedAt = new Date().toISOString();
const result = await trackCompanies(db, vault, {
  ledger_id: ledgerId,
  run_id: runId,
  refresh_id: refreshId,
  compound: true,
  companies,
  years: Number(args.years ?? 10),
  start_date: args.startDate,
  end_date: args.endDate,
  forms: ['10-K', '10-Q'],
  confirm: true,
  limit_filings: args.limitFilings ? Number(args.limitFilings) : undefined,
  retry_failed_only: args.retryFailedOnly === true,
  stop_on_sec_cooldown: args.ignoreSecCooldown !== true,
  max_companies: 125,
  company_metadata: metadata,
});
const evaluationResults = [];
if (!args.skipEvaluation) {
  for (const stage of COMPANY_EVALUATION_STAGES) {
    evaluationResults.push(await evaluateCompanyRun(db, vault, {
      run_id: runId,
      stage,
      limit: evaluationLimitForStage(stage, args),
      confirm: true,
    }, {
      cli: args.evalCli,
      model: args.evalModel,
      timeout_ms: args.evalTimeoutMs ? Number(args.evalTimeoutMs) : undefined,
    }));
  }
}

const councilResults = [];
if (!args.skipCouncil) {
  const sampleSize = Number(args.councilSample ?? 3);
  const ideaRows = db.prepare(
    `SELECT id FROM ideas_notes ORDER BY created_at LIMIT ?`,
  ).all(sampleSize);
  for (const row of ideaRows) {
    for (const mode of ['standard', 'pre_mortem']) {
      const councilResult = await runCouncil(db, vault, {
        idea_id: row.id,
        depth: 'light',
        mode,
        purpose: 'predictive',
        approval_scope: 'session',
      }, {
        timeout_ms_override: args.councilTimeoutMs ? Number(args.councilTimeoutMs) : undefined,
      });
      councilResults.push({ idea_id: row.id, depth: 'light', ...councilResult });
    }
  }
}
const exported = args.skipExport ? null : await exportCompanyMarkdownEvidence(db, vault, {
  run_id: runId,
  destination_dir: exportDir,
  confirm: true,
});
const completedAt = new Date().toISOString();

const manifest = {
  schema: 'sec-company-ledger-run-v1',
  ledger_id: ledgerId,
  run_id: runId,
  refresh_id: refreshId,
  started_at: startedAt,
  completed_at: completedAt,
  out_dir: outDir,
  vault,
  export_dir: exportDir,
  years: Number(args.years ?? 10),
  start_date: args.startDate ?? null,
  end_date: args.endDate ?? null,
  cohort_source: 'US500 S&P 500 sector leaders checked 2026-05-02; SEC ticker map validates run-time lookups',
  company_count: companies.length,
  sectors,
  result,
  evaluation_results: evaluationResults,
  council_results: councilResults.map((item) => ({
    session_id: item.session_id,
    idea_id: item.idea_id,
    mode: item.mode,
    depth: item.depth,
    status: item.status,
    view_count: item.views.length,
    synthesis_path: item.synthesis_vault_path,
  })),
  exported,
};
await fsp.writeFile(path.join(outDir, 'README.md'), renderRunReadme(manifest), 'utf8');
db.close();
console.log(exportDir);

function buildCohort(limit) {
  const companies = [];
  const metadata = {};
  const sectors = [];
  for (const [sector, tickers] of DEFAULT_COHORT) {
    const remaining = typeof limit === 'number' ? Math.max(0, limit - companies.length) : tickers.length;
    const selected = tickers.slice(0, remaining);
    if (selected.length === 0) break;
    selected.forEach((ticker, index) => {
      companies.push(ticker);
      metadata[ticker] = {
        sector,
        source_rank: index + 1,
        source: 'us500-sp500-sector-weight-leaders',
      };
    });
    sectors.push({ sector, count: selected.length, tickers: selected });
    if (typeof limit === 'number' && companies.length >= limit) break;
  }
  return { companies, metadata, sectors };
}

function renderRunReadme(manifest) {
  return [
    '# SEC Company Ledger Run',
    '',
    `Ledger id: ${manifest.ledger_id}`,
    `Run id: ${manifest.run_id}`,
    `Refresh id: ${manifest.refresh_id}`,
    `Vault: ${manifest.vault}`,
    `Markdown evidence: ${manifest.export_dir}`,
    `Companies: ${manifest.company_count}`,
    `Lookback: ${manifest.years} years`,
    `Evaluation stages: ${manifest.evaluation_results.length}`,
    `Council sessions: ${manifest.council_results.length}`,
    '',
    '## Main Entry',
    '',
    `Open \`reports/company-runs/${manifest.run_id.toLowerCase()}/index.md\` in the Markdown evidence snapshot.`,
    '',
    '## Evidence Policy',
    '',
    '- The local working vault may contain SQLite state and raw cache files needed to refresh the ledger.',
    '- The repository evidence export contains Markdown only: no SQLite, JSON, JSONL, WAL/SHM, or raw cache files.',
    '- Re-run with the same `--ledger-id` to compound into the same ledger rather than creating a dated dataset.',
    '',
    '## Notes',
    '',
    '- Corpus notes and reports are written through Flywheel with wikilink suggestions enabled at write time.',
    '- Company evaluation stages are run before export so LLM judgments, disputes, thesis deltas, and adjudication packets are part of the Markdown corpus.',
    '- Council/personality samples are persisted as Markdown under `councils/` and included in the Markdown-only evidence export.',
    '- SEC filings are processed oldest-to-newest inside each company scan so the ledger can be read as an accumulating history.',
    '- This is decision support and evidence organization, not investment advice.',
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
    else if (arg === '--export-dir') out.exportDir = argv[++i];
    else if (arg === '--ledger-id') out.ledgerId = argv[++i];
    else if (arg === '--refresh-id') out.refreshId = argv[++i];
    else if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--years') out.years = argv[++i];
    else if (arg === '--start-date') out.startDate = argv[++i];
    else if (arg === '--end-date') out.endDate = argv[++i];
    else if (arg === '--pilot') out.pilot = argv[++i];
    else if (arg === '--limit-filings') out.limitFilings = argv[++i];
    else if (arg === '--retry-failed-only') out.retryFailedOnly = true;
    else if (arg === '--ignore-sec-cooldown') out.ignoreSecCooldown = true;
    else if (arg === '--skip-evaluation') out.skipEvaluation = true;
    else if (arg === '--eval-limit') out.evalLimit = argv[++i];
    else if (arg === '--eval-all') out.evalAll = true;
    else if (arg === '--eval-cli') out.evalCli = argv[++i];
    else if (arg === '--eval-model') out.evalModel = argv[++i];
    else if (arg === '--eval-timeout-ms') out.evalTimeoutMs = argv[++i];
    else if (arg === '--skip-council') out.skipCouncil = true;
    else if (arg === '--skip-export') out.skipExport = true;
    else if (arg === '--council-sample') out.councilSample = argv[++i];
    else if (arg === '--council-timeout-ms') out.councilTimeoutMs = argv[++i];
    else if (arg === '--dry-run') out.dryRun = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function evaluationLimitForStage(stage, parsedArgs) {
  if (parsedArgs.evalAll) return undefined;
  if (parsedArgs.evalLimit) return Number(parsedArgs.evalLimit);
  return DEFAULT_EVAL_LIMITS[stage];
}

function evaluationLimitPlan(parsedArgs) {
  if (parsedArgs.evalAll) return null;
  if (parsedArgs.evalLimit) return Number(parsedArgs.evalLimit);
  return DEFAULT_EVAL_LIMITS;
}
