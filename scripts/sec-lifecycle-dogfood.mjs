#!/usr/bin/env node
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  applyCompanyOutcomes,
  buildSecCompanyLedgerReport,
  getProbeOutcome,
  openIdeasDb,
  probeWritePath,
  recordOutcomeMemo,
  renderSecCompanyLedgerMarkdown,
  runMigrations,
  writeCompanyReports,
} from '../packages/core/dist/index.js';

const DEFAULT_GROUPS = ['og-001', 'og-002', 'og-006'];

const args = parseArgs(process.argv.slice(2));
if (!args.sourceVault || !args.runId) {
  console.error('Usage: node scripts/sec-lifecycle-dogfood.mjs --source-vault <vault> --run-id <run_id> [--out-dir <dir>] [--groups og-001,og-002,og-006]');
  process.exit(2);
}

const sourceVault = path.resolve(args.sourceVault);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(args.outDir ?? `/home/ben/sec-dogfood/flywheel-sec-lifecycle-${stamp}`);
const workVault = path.join(outDir, 'vault');
const selectedGroupIds = (args.groups ?? DEFAULT_GROUPS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await fsp.mkdir(outDir, { recursive: true });
await fsp.cp(sourceVault, workVault, { recursive: true, force: true });

const db = openIdeasDb(workVault);
runMigrations(db);
await probeWritePath(workVault);

const before = buildSecCompanyLedgerReport(db, { run_id: args.runId });
await fsp.writeFile(path.join(outDir, 'before-sec-ledger.md'), before.markdown);
await fsp.writeFile(path.join(outDir, 'before-sec-ledger.json'), JSON.stringify(before, null, 2));

const selectedGroups = before.review_queue.filter((group) => selectedGroupIds.includes(group.id));
if (selectedGroups.length !== selectedGroupIds.length) {
  const found = new Set(selectedGroups.map((group) => group.id));
  const missing = selectedGroupIds.filter((id) => !found.has(id));
  throw new Error(`selected review group(s) not found in staged queue: ${missing.join(', ')}`);
}

const applied = [];
for (const group of selectedGroups) {
  const result = await applyCompanyOutcomes(db, workVault, {
    run_id: args.runId,
    outcome_candidate_ids: group.candidate_ids,
    confirm: true,
  });
  applied.push({ group, result });
  for (const row of result.applied) {
    const candidate = getCandidate(db, row.candidate_id);
    recordOutcomeMemo(db, row.outcome_id, memoFor(group, candidate, row.assumption_id));
  }
}
const refreshedReports = await writeCompanyReports(db, workVault, args.runId);

const after = buildSecCompanyLedgerReport(db, { run_id: args.runId });
await fsp.writeFile(path.join(outDir, 'after-sec-ledger.md'), after.markdown);
await fsp.writeFile(path.join(outDir, 'after-sec-ledger.json'), JSON.stringify(after, null, 2));
await fsp.writeFile(path.join(outDir, 'lifecycle-summary.md'), renderLifecycleSummary({ before, after, applied, outDir }));
await fsp.writeFile(path.join(outDir, 'summary.json'), JSON.stringify({
  source_vault: sourceVault,
  work_vault: workVault,
  write_probe: getProbeOutcome(),
  run_id: args.runId,
  refreshed_reports: refreshedReports,
  selected_groups: selectedGroupIds,
  before: before.executive_summary,
  after: after.executive_summary,
  applied: applied.map(({ group, result }) => ({
    group_id: group.id,
    company: group.company,
    themes: group.themes,
    candidate_ids: group.candidate_ids,
    outcome_ids: result.applied.map((row) => row.outcome_id),
    representative_excerpt: group.representative_excerpt,
  })),
}, null, 2));

db.close();
console.log(outDir);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source-vault') out.sourceVault = argv[++i];
    else if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--out-dir') out.outDir = argv[++i];
    else if (arg === '--groups') out.groups = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function getCandidate(db, candidateId) {
  return db.prepare(
    `SELECT c.id, t.title AS theme_title, c.source_uri, c.excerpt, c.rationale
       FROM ideas_company_outcome_candidates c
       JOIN ideas_company_themes t ON t.id = c.theme_id
      WHERE c.id = ?`,
  ).get(candidateId);
}

function memoFor(group, candidate, assumptionId) {
  const theme = candidate?.theme_title ?? group.themes.join(' / ');
  if (group.company === 'NVDA') {
    return {
      refuted_assumption_id: assumptionId,
      root_cause: 'US export controls restricted H20 access to the China market and converted demand risk into an inventory and purchase-obligation charge.',
      what_we_thought: `${group.company} could manage ${theme.toLowerCase()} risk without material disruption.`,
      what_actually_happened: 'NVIDIA disclosed a $4.5 billion H20 charge tied to excess inventory and purchase obligations after demand diminished under new export-license requirements.',
      lesson: 'Geopolitical access constraints can turn demand risk into inventory write-down risk before the commercial opportunity fully disappears.',
    };
  }
  if (group.company === 'AAPL') {
    return {
      refuted_assumption_id: assumptionId,
      root_cause: 'COVID public-health measures disrupted manufacturing, logistics, retail stores, and channel partner points of sale.',
      what_we_thought: `${group.company} could manage ${theme.toLowerCase()} risk without material disruption.`,
      what_actually_happened: 'Apple disclosed temporary iPhone supply shortages, affected worldwide sales, and adverse China demand effects from store and channel closures.',
      lesson: 'A distributed hardware business can see supply, channel, and demand assumptions fail together when a shock closes both factories and points of sale.',
    };
  }
  return {
    refuted_assumption_id: assumptionId,
    root_cause: 'Gaming impairments and continued AI/data-center investment increased operating expenses.',
    what_we_thought: `${group.company} could manage ${theme.toLowerCase()} risk without material disruption.`,
    what_actually_happened: 'Microsoft disclosed operating expense growth driven by Gaming impairment-related expenses and continued investment in compute capacity, AI talent, and data.',
    lesson: 'AI and cloud capacity bets should track both strategic upside and the impairment/opex drag created when adjacent hardware or gaming assumptions weaken.',
  };
}

function renderLifecycleSummary({ before, after, applied, outDir }) {
  const lines = [
    '# SEC Lifecycle Dogfood',
    '',
    `Output directory: ${outDir}`,
    '',
    '## Before',
    '',
    summaryBullets(before.executive_summary).join('\n'),
    '',
    '## Applied Review Events',
    '',
  ];
  for (const { group, result } of applied) {
    lines.push(`- ${group.id} ${group.company} / ${group.themes.join(', ')}: applied ${result.applied_count} candidate(s).`);
    lines.push(`  Evidence: ${group.representative_excerpt}`);
  }
  lines.push('', '## After', '', summaryBullets(after.executive_summary).join('\n'), '', '## Lessons');
  for (const verdict of after.accepted_verdicts.filter((v) => v.memo)) {
    lines.push(`- ${verdict.company} / ${verdict.theme}: ${verdict.memo.lesson}`);
  }
  return `${lines.join('\n')}\n`;
}

function summaryBullets(summary) {
  return [
    `- Filings scanned: ${summary.filings_scanned}`,
    `- Tracked assumptions: ${summary.tracked_assumptions}`,
    `- Observations: ${summary.observations}`,
    `- Current bets: ${summary.current_bets}`,
    `- Review events: ${summary.review_events}`,
    `- Staged candidates: ${summary.staged_candidates}`,
    `- Accepted failures: ${summary.accepted_failures}`,
    `- Accepted lessons: ${summary.accepted_lessons}`,
    `- Missing lessons: ${summary.missing_lessons}`,
    `- Triage completion: ${summary.triage_completion.applied_candidates}/${summary.triage_completion.total_candidates} (${summary.triage_completion.percent}%)`,
  ];
}
