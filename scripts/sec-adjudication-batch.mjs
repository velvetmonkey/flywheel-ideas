#!/usr/bin/env node
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  applyCompanyOutcomes,
  exportCompanyMarkdownEvidence,
  openIdeasDb,
  probeWritePath,
  readCompanyThesisReport,
  recordOutcomeMemo,
  runMigrations,
  writeCompanyBundleReports,
  writeCompanyReports,
  writeNote,
} from '../packages/core/dist/index.js';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log([
    'Usage: node scripts/sec-adjudication-batch.mjs [options]',
    '',
    'Options:',
    '  --vault <path>          SEC ledger vault (default: /home/ben/sec-dogfood/company-ledgers/sec-10y-100-company/vault)',
    '  --run-id <id>           Company run id (default: sec-10y-100-company)',
    '  --export-dir <path>     Markdown evidence export dir (default: evidence/sec-company-ledgers/<run-id>)',
    '  --batch-id <id>         Stable adjudication batch id (default: adj-YYYY-MM-DD-HHMMSS)',
    '  --limit <n>             Number of review groups in the packet (default: 20)',
    '  --decisions <path>      Apply explicit decisions JSON after writing the packet',
    '  --confirm               Required when --decisions contains accept or reject actions',
    '  --export                Refresh Markdown evidence after packet-only generation',
    '  --skip-export           Do not refresh Markdown evidence after applying decisions',
    '  --dry-run               Print the packet JSON without writing/applying',
    '',
    'Decision actions: accept, reject, defer.',
    'Accept decisions must include a full memo object or per_candidate_memos.',
  ].join('\n'));
  process.exit(0);
}

const runId = args.runId ?? 'sec-10y-100-company';
const vault = path.resolve(args.vault ?? `/home/ben/sec-dogfood/company-ledgers/${runId}/vault`);
const exportDir = path.resolve(args.exportDir ?? path.join(process.cwd(), 'evidence', 'sec-company-ledgers', runId));
const batchId = args.batchId ?? `adj-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z')}`;
const limit = Number(args.limit ?? 20);

const db = openIdeasDb(vault);
runMigrations(db);

const packet = buildPacket(db, runId, batchId, limit);
if (args.dryRun) {
  console.log(JSON.stringify(packet, null, 2));
  db.close();
  process.exit(0);
}

await probeWritePath(vault);
const packetPath = await writePacket(vault, packet);

let decisionSummary = null;
if (args.decisions) {
  const decisions = JSON.parse(await fsp.readFile(path.resolve(args.decisions), 'utf8'));
  decisionSummary = await applyDecisions(db, vault, runId, batchId, decisions, args.confirm === true);
  await writeDecisionLog(vault, runId, batchId, decisionSummary);
  await writeCompanyReports(db, vault, runId);
  await writeCompanyBundleReports(db, vault, runId);
}

const shouldExport = args.export === true || (args.decisions && args.skipExport !== true);
const exported = shouldExport
  ? await exportCompanyMarkdownEvidence(db, vault, {
    run_id: runId,
    destination_dir: exportDir,
    confirm: true,
  })
  : null;

db.close();
console.log(JSON.stringify({
  run_id: runId,
  batch_id: batchId,
  packet_path: packetPath,
  decision_summary: decisionSummary,
  exported,
}, null, 2));

function buildPacket(db, runId, batchId, limit) {
  const thesis = readCompanyThesisReport(db, runId);
  const groups = thesis.needs_human_review.slice(0, limit).map((group) => ({
    company: group.company,
    themes: group.themes,
    candidate_count: group.candidate_count,
    candidate_ids: group.candidate_ids,
    max_confidence: group.max_confidence,
    evidence: group.representative_excerpt,
    apply_command: group.apply_command,
  }));
  return {
    schema: 'sec-adjudication-batch-v1',
    run_id: runId,
    batch_id: batchId,
    generated_at: new Date().toISOString(),
    packet_path: packetRelPath(runId, batchId),
    review_group_count: groups.length,
    groups,
    decision_template: {
      schema: 'sec-adjudication-decisions-v1',
      run_id: runId,
      batch_id: batchId,
      decisions: groups.map((group) => ({
        action: 'defer',
        candidate_ids: group.candidate_ids,
        reason: 'Pending human review.',
        memo: {
          root_cause: '',
          what_we_thought: '',
          what_actually_happened: '',
          lesson: '',
        },
      })),
    },
  };
}

async function writePacket(vault, packet) {
  const body = renderPacketMarkdown(packet);
  const result = await writeNote(
    vault,
    packet.packet_path,
    {
      id: `sec-adjudication-${packet.batch_id}`,
      type: 'report',
      report_kind: 'company_adjudication_batch',
      schema: packet.schema,
      run_id: packet.run_id,
      batch_id: packet.batch_id,
      source: 'flywheel-ideas',
    },
    body,
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 4, timeoutMs: 30_000 },
  );
  return result.vault_path;
}

async function applyDecisions(db, vault, runId, batchId, decisionsFile, confirm) {
  if (decisionsFile.run_id !== runId) throw new Error(`decisions run_id ${decisionsFile.run_id} does not match ${runId}`);
  if (decisionsFile.batch_id !== batchId) throw new Error(`decisions batch_id ${decisionsFile.batch_id} does not match ${batchId}`);
  const decisions = Array.isArray(decisionsFile.decisions) ? decisionsFile.decisions : [];
  const hasMutation = decisions.some((decision) => decision.action === 'accept' || decision.action === 'reject');
  if (hasMutation && !confirm) throw new Error('--confirm is required to apply accept/reject decisions');

  const summary = {
    schema: 'sec-adjudication-decision-summary-v1',
    run_id: runId,
    batch_id: batchId,
    decided_at: new Date().toISOString(),
    accepted: [],
    rejected: [],
    deferred: [],
  };

  for (const decision of decisions) {
    const action = String(decision.action ?? '').toLowerCase();
    const candidateIds = normalizeCandidateIds(decision.candidate_ids);
    assertCandidates(db, runId, candidateIds);
    if (action === 'accept') {
      const result = await applyCompanyOutcomes(db, vault, {
        run_id: runId,
        outcome_candidate_ids: candidateIds,
        confirm: true,
      });
      for (const applied of result.applied) {
        const memo = memoForApplied(decision, applied);
        recordOutcomeMemo(db, applied.outcome_id, memo);
      }
      summary.accepted.push({
        candidate_ids: candidateIds,
        reason: stringOrEmpty(decision.reason),
        applied: result.applied,
      });
    } else if (action === 'reject') {
      const now = Date.now();
      db.prepare(
        `UPDATE ideas_company_outcome_candidates
            SET state = 'rejected', applied_at = ?
          WHERE run_id = ? AND state = 'staged' AND id IN (${candidateIds.map(() => '?').join(',')})`,
      ).run(now, runId, ...candidateIds);
      summary.rejected.push({
        candidate_ids: candidateIds,
        reason: requiredString(decision.reason, 'reject decisions require reason'),
      });
    } else if (action === 'defer') {
      summary.deferred.push({
        candidate_ids: candidateIds,
        reason: requiredString(decision.reason, 'defer decisions require reason'),
      });
    } else {
      throw new Error(`unsupported decision action: ${decision.action}`);
    }
  }

  return summary;
}

async function writeDecisionLog(vault, runId, batchId, summary) {
  await writeNote(
    vault,
    decisionRelPath(runId, batchId),
    {
      id: `sec-adjudication-${batchId}-decisions`,
      type: 'report',
      report_kind: 'company_adjudication_decisions',
      schema: summary.schema,
      run_id: runId,
      batch_id: batchId,
      source: 'flywheel-ideas',
    },
    renderDecisionMarkdown(summary),
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 4, timeoutMs: 30_000 },
  );
}

function renderPacketMarkdown(packet) {
  const lines = [
    `# SEC Adjudication Batch ${packet.batch_id}`,
    '',
    `Run: [[reports/company-runs/${packet.run_id.toLowerCase()}/index|${packet.run_id}]]`,
    `Generated: ${packet.generated_at}`,
    '',
    'This packet is the human judgment surface for staged SEC outcome candidates. A candidate is not an accepted failure until a reviewer explicitly applies it.',
    '',
    '## Review Groups',
    '',
  ];
  for (const [index, group] of packet.groups.entries()) {
    lines.push(`### ${index + 1}. ${group.company} / ${group.themes.join(', ')}`);
    lines.push('');
    lines.push(`- Candidate count: ${group.candidate_count}`);
    lines.push(`- Candidate IDs: ${group.candidate_ids.join(', ')}`);
    lines.push(`- Max confidence: ${group.max_confidence}`);
    lines.push(`- Apply command: \`${group.apply_command}\``);
    lines.push(`- Evidence: ${group.evidence.replace(/\s+/g, ' ').slice(0, 900)}`);
    lines.push('');
    lines.push('Reviewer decision: accept / reject / defer');
    lines.push('Reason:');
    lines.push('Lesson memo if accepted:');
    lines.push('');
  }
  lines.push('## Decisions JSON Template');
  lines.push('');
  lines.push('Fill this into a local JSON file and apply it with `node scripts/sec-adjudication-batch.mjs --decisions <file> --confirm`.');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(packet.decision_template, null, 2));
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function renderDecisionMarkdown(summary) {
  const lines = [
    `# SEC Adjudication Decisions ${summary.batch_id}`,
    '',
    `Run: [[reports/company-runs/${summary.run_id.toLowerCase()}/index|${summary.run_id}]]`,
    `Decided: ${summary.decided_at}`,
    '',
    '## Accepted',
    '',
  ];
  if (summary.accepted.length === 0) lines.push('No candidates accepted in this batch.');
  for (const item of summary.accepted) {
    lines.push(`- Candidate IDs: ${item.candidate_ids.join(', ')}`);
    lines.push(`  - Reason: ${item.reason}`);
    lines.push(`  - Outcomes: ${item.applied.map((row) => row.outcome_id).join(', ')}`);
  }
  lines.push('');
  lines.push('## Rejected');
  lines.push('');
  if (summary.rejected.length === 0) lines.push('No candidates rejected in this batch.');
  for (const item of summary.rejected) {
    lines.push(`- Candidate IDs: ${item.candidate_ids.join(', ')}`);
    lines.push(`  - Reason: ${item.reason}`);
  }
  lines.push('');
  lines.push('## Deferred');
  lines.push('');
  if (summary.deferred.length === 0) lines.push('No candidates deferred in this batch.');
  for (const item of summary.deferred) {
    lines.push(`- Candidate IDs: ${item.candidate_ids.join(', ')}`);
    lines.push(`  - Reason: ${item.reason}`);
  }
  lines.push('');
  return lines.join('\n');
}

function assertCandidates(db, runId, candidateIds) {
  if (candidateIds.length === 0) throw new Error('decision requires at least one candidate id');
  const rows = db.prepare(
    `SELECT id, state FROM ideas_company_outcome_candidates
      WHERE run_id = ? AND id IN (${candidateIds.map(() => '?').join(',')})`,
  ).all(runId, ...candidateIds);
  const found = new Map(rows.map((row) => [row.id, row.state]));
  for (const id of candidateIds) {
    if (!found.has(id)) throw new Error(`candidate ${id} not found in run ${runId}`);
    if (found.get(id) !== 'staged') throw new Error(`candidate ${id} is ${found.get(id)}, expected staged`);
  }
}

function memoForApplied(decision, applied) {
  const perCandidate = decision.per_candidate_memos?.[applied.candidate_id];
  const memo = perCandidate ?? decision.memo;
  if (!memo || typeof memo !== 'object') throw new Error(`accept decision for ${applied.candidate_id} requires memo`);
  return {
    refuted_assumption_id: memo.refuted_assumption_id ?? applied.assumption_id,
    root_cause: requiredString(memo.root_cause, `memo.root_cause required for ${applied.candidate_id}`),
    what_we_thought: requiredString(memo.what_we_thought, `memo.what_we_thought required for ${applied.candidate_id}`),
    what_actually_happened: requiredString(memo.what_actually_happened, `memo.what_actually_happened required for ${applied.candidate_id}`),
    lesson: requiredString(memo.lesson, `memo.lesson required for ${applied.candidate_id}`),
  };
}

function packetRelPath(runId, batchId) {
  return `reports/company-runs/${runId.toLowerCase()}/adjudication-batches/${batchId}.md`;
}

function decisionRelPath(runId, batchId) {
  return `reports/company-runs/${runId.toLowerCase()}/adjudication-batches/${batchId}-decisions.md`;
}

function normalizeCandidateIds(value) {
  if (!Array.isArray(value)) throw new Error('decision.candidate_ids must be an array');
  return value.map((id) => String(id).trim()).filter(Boolean);
}

function requiredString(value, message) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(message);
  return value.trim();
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') out.help = true;
    else if (arg === '--vault') out.vault = argv[++i];
    else if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--export-dir') out.exportDir = argv[++i];
    else if (arg === '--batch-id') out.batchId = argv[++i];
    else if (arg === '--limit') out.limit = argv[++i];
    else if (arg === '--decisions') out.decisions = argv[++i];
    else if (arg === '--confirm') out.confirm = true;
    else if (arg === '--export') out.export = true;
    else if (arg === '--skip-export') out.skipExport = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}
