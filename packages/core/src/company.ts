import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { IdeasDatabase } from './db.js';
import {
  generateCompanyFilingId,
  generateCompanyObservationId,
  generateCompanyOutcomeCandidateId,
  generateCompanyRunId,
  generateCompanyThemeId,
} from './ids.js';
import {
  listCandidates,
  markCandidateRejected,
  parseExtractedFields,
  promoteCandidate,
  scanSource,
  type ImportCandidateRow,
} from './import/index.js';
import { logOutcome } from './outcome.js';

export interface CompanyTrackInput {
  companies: string[];
  years?: number;
  forms?: string[];
  confirm: boolean;
  fixture_dir?: string;
  limit_filings?: number;
}

export interface CompanyTrackResult {
  run_id: string;
  companies: string[];
  years: number;
  forms: string[];
  sources: string[];
  promoted_ideas: number;
  promoted_assumptions: number;
  staged_outcomes: number;
  report_md_path: string;
  report_json_path: string;
}

export interface CompanyReportOptions {
  run_id: string;
  company?: string;
  format?: 'markdown' | 'json' | 'both';
}

export interface CompanyApplyOutcomesInput {
  run_id: string;
  outcome_candidate_ids?: string[];
  min_confidence?: number;
  confirm: boolean;
}

export interface CompanyApplyOutcomesResult {
  run_id: string;
  applied_count: number;
  applied: Array<{ candidate_id: string; outcome_id: string; assumption_id: string }>;
}

export class CompanyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompanyInputError';
  }
}

export async function trackCompanies(
  db: IdeasDatabase,
  vaultPath: string,
  input: CompanyTrackInput,
): Promise<CompanyTrackResult> {
  if (!input.confirm) throw new CompanyInputError('company.track requires confirm: true');
  const companies = input.companies.map((c) => c.trim()).filter(Boolean);
  if (companies.length === 0) throw new CompanyInputError('company.track requires companies');
  if (companies.length > 3) throw new CompanyInputError('company.track v1 supports at most 3 companies');

  const years = input.years ?? 10;
  const forms = input.forms ?? ['10-K', '10-Q'];
  const runId = generateCompanyRunId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO ideas_company_runs (id, companies_json, years, forms_json, started_at, status)
     VALUES (?, ?, ?, ?, ?, 'running')`,
  ).run(runId, JSON.stringify(companies), years, JSON.stringify(forms), now);

  const sources: string[] = [];
  let promotedIdeas = 0;
  let promotedAssumptions = 0;
  let stagedOutcomes = 0;

  for (const company of companies) {
    const source = input.fixture_dir ? `fixture://${input.fixture_dir}` : company;
    const summary = await scanSource(db, vaultPath, {
      adapter: 'sec-company',
      source,
      scan_config: {
        years,
        forms,
        fixture_dir: input.fixture_dir,
        limit_filings: input.limit_filings,
      },
      dedup: false,
    });
    sources.push(summary.source_id);
    const candidates = listCandidates(db, { source_id: summary.source_id, limit: 1000 })
      .sort((a, b) => a.scanned_at - b.scanned_at);
    const promoted = await promoteCompanyCandidates(db, vaultPath, runId, candidates);
    promotedIdeas += promoted.ideas;
    promotedAssumptions += promoted.assumptions;
    stagedOutcomes += promoted.outcomes;
  }

  const artifacts = await writeCompanyReports(db, vaultPath, runId);
  db.prepare(
    `UPDATE ideas_company_runs
       SET completed_at = ?, status = 'completed', report_md_path = ?, report_json_path = ?
     WHERE id = ?`,
  ).run(Date.now(), artifacts.markdownPath, artifacts.jsonPath, runId);

  return {
    run_id: runId,
    companies,
    years,
    forms,
    sources,
    promoted_ideas: promotedIdeas,
    promoted_assumptions: promotedAssumptions,
    staged_outcomes: stagedOutcomes,
    report_md_path: artifacts.markdownPath,
    report_json_path: artifacts.jsonPath,
  };
}

async function promoteCompanyCandidates(
  db: IdeasDatabase,
  vaultPath: string,
  runId: string,
  candidates: ImportCandidateRow[],
): Promise<{ ideas: number; assumptions: number; outcomes: number }> {
  const ideaBySourceUri = new Map<string, string>();
  const themeByKey = new Map<string, { themeId: string; assumptionId: string }>();
  let ideas = 0;
  let assumptions = 0;
  let outcomes = 0;

  for (const row of candidates.filter((c) => c.candidate_kind === 'idea')) {
    const res = await promoteCandidate(db, vaultPath, {
      candidate_id: row.id,
      as: 'idea',
      override_duplicate: true,
    });
    ideaBySourceUri.set(row.source_uri, res.promoted_id);
    recordFilingIfNeeded(db, runId, row);
    ideas++;
  }

  for (const row of candidates.filter((c) => c.candidate_kind === 'assumption')) {
    const fields = parseExtractedFields(row);
    const themeKey = stringField(fields, 'theme_key');
    const parentSource = stringField(fields, 'parent_idea_source_uri');
    const targetIdea = parentSource ? ideaBySourceUri.get(parentSource) : undefined;
    if (!themeKey || !targetIdea) {
      markCandidateRejected(db, row.id);
      continue;
    }
    const filingId = recordFilingIfNeeded(db, runId, row);
    const existing = themeByKey.get(themeKey);
    if (existing) {
      recordObservation(db, runId, existing.themeId, filingId, row);
      markCandidateRejected(db, row.id);
      continue;
    }
    const res = await promoteCandidate(db, vaultPath, {
      candidate_id: row.id,
      as: 'assumption',
      target_idea_id: targetIdea,
      override_duplicate: true,
    });
    const themeId = recordTheme(db, runId, row, res.promoted_id);
    recordObservation(db, runId, themeId, filingId, row);
    themeByKey.set(themeKey, { themeId, assumptionId: res.promoted_id });
    assumptions++;
  }

  for (const row of candidates.filter((c) => c.candidate_kind === 'outcome')) {
    const fields = parseExtractedFields(row);
    const themeKey = stringField(fields, 'theme_key');
    const matched = themeKey ? themeByKey.get(themeKey) : undefined;
    if (!matched) {
      markCandidateRejected(db, row.id);
      continue;
    }
    const filingId = recordFilingIfNeeded(db, runId, row);
    recordOutcomeCandidate(db, runId, matched.themeId, matched.assumptionId, filingId, row);
    outcomes++;
  }

  return { ideas, assumptions, outcomes };
}

export async function applyCompanyOutcomes(
  db: IdeasDatabase,
  vaultPath: string,
  input: CompanyApplyOutcomesInput,
): Promise<CompanyApplyOutcomesResult> {
  if (!input.confirm) throw new CompanyInputError('company.apply_outcomes requires confirm: true');
  const min = input.min_confidence ?? 0.9;
  const ids = input.outcome_candidate_ids;
  const clauses = ['run_id = ?', "state = 'staged'", 'confidence >= ?'];
  const params: Array<string | number> = [input.run_id, min];
  if (ids && ids.length > 0) {
    clauses.push(`id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  const rows = db.prepare(
    `SELECT * FROM ideas_company_outcome_candidates
     WHERE ${clauses.join(' AND ')}
     ORDER BY confidence DESC, created_at ASC`,
  ).all(...params) as CompanyOutcomeCandidateRow[];

  const applied: CompanyApplyOutcomesResult['applied'] = [];
  for (const row of rows) {
    if (!row.assumption_id) continue;
    const idea = db.prepare(`SELECT idea_id FROM ideas_assumptions WHERE id = ?`)
      .get(row.assumption_id) as { idea_id: string } | undefined;
    if (!idea) continue;
    const outcome = await logOutcome(db, vaultPath, {
      idea_id: idea.idea_id,
      text: `${row.rationale}\n\nSource: ${row.source_uri}\n\n${row.excerpt}`,
      refutes: [row.assumption_id],
    });
    db.prepare(
      `UPDATE ideas_company_outcome_candidates
         SET state = 'applied', applied_outcome_id = ?, applied_at = ?
       WHERE id = ?`,
    ).run(outcome.outcome.id, Date.now(), row.id);
    applied.push({
      candidate_id: row.id,
      outcome_id: outcome.outcome.id,
      assumption_id: row.assumption_id,
    });
  }
  await writeCompanyReports(db, vaultPath, input.run_id);
  return { run_id: input.run_id, applied_count: applied.length, applied };
}

export function readCompanyRun(db: IdeasDatabase, runId?: string): Record<string, unknown> {
  const run = runId
    ? db.prepare(`SELECT * FROM ideas_company_runs WHERE id = ?`).get(runId)
    : db.prepare(`SELECT * FROM ideas_company_runs ORDER BY started_at DESC LIMIT 1`).get();
  if (!run) throw new CompanyInputError('company run not found');
  return buildReportData(db, (run as { id: string }).id);
}

export async function writeCompanyReports(
  db: IdeasDatabase,
  vaultPath: string,
  runId: string,
): Promise<{ markdownPath: string; jsonPath: string }> {
  const data = buildReportData(db, runId);
  const dir = path.join(vaultPath, 'reports');
  await fsp.mkdir(dir, { recursive: true });
  const base = `company-tracker-${runId}`;
  const markdownPath = `reports/${base}.md`;
  const jsonPath = `reports/${base}.json`;
  await fsp.writeFile(path.join(vaultPath, markdownPath), renderCompanyMarkdown(data), 'utf8');
  await fsp.writeFile(path.join(vaultPath, jsonPath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return { markdownPath, jsonPath };
}

function buildReportData(db: IdeasDatabase, runId: string): Record<string, unknown> {
  const run = db.prepare(`SELECT * FROM ideas_company_runs WHERE id = ?`).get(runId) as Record<string, unknown>;
  const filings = db.prepare(`SELECT * FROM ideas_company_filings WHERE run_id = ? ORDER BY cik, filed_at`).all(runId);
  const themes = db.prepare(`SELECT * FROM ideas_company_themes WHERE run_id = ? ORDER BY cik, theme_key`).all(runId);
  const observations = db.prepare(`SELECT * FROM ideas_company_observations WHERE run_id = ? ORDER BY observed_at`).all(runId);
  const outcomes = db.prepare(`SELECT * FROM ideas_company_outcome_candidates WHERE run_id = ? ORDER BY confidence DESC`).all(runId);
  return { run, filings, themes, observations, outcomes };
}

function renderCompanyMarkdown(data: Record<string, unknown>): string {
  const run = data.run as Record<string, unknown>;
  const filings = data.filings as Array<Record<string, unknown>>;
  const themes = data.themes as Array<Record<string, unknown>>;
  const outcomes = data.outcomes as Array<Record<string, unknown>>;
  const lines = [
    `# Company Tracker ${run.id}`,
    '',
    `- Companies: ${run.companies_json}`,
    `- Years: ${run.years}`,
    `- Forms: ${run.forms_json}`,
    `- Filings scanned: ${filings.length}`,
    `- Themes tracked: ${themes.length}`,
    `- Staged outcomes: ${outcomes.filter((o) => o.state === 'staged').length}`,
    `- Applied outcomes: ${outcomes.filter((o) => o.state === 'applied').length}`,
    '',
    '## Themes',
    '',
  ];
  for (const theme of themes) {
    lines.push(`- **${theme.ticker ?? theme.cik} / ${theme.title}**: first ${theme.first_seen_at}, latest ${theme.latest_seen_at}, assumption ${theme.assumption_id ?? 'none'}`);
  }
  lines.push('', '## Outcome Candidates', '');
  for (const outcome of outcomes) {
    lines.push(`- **${outcome.state} ${outcome.confidence}** ${outcome.rationale} (${outcome.source_uri})`);
  }
  return `${lines.join('\n')}\n`;
}

function recordFilingIfNeeded(db: IdeasDatabase, runId: string, row: ImportCandidateRow): string {
  const fields = parseExtractedFields(row);
  const sec = objectField(fields, 'sec_company');
  const accession = stringField(sec, 'accession_no') ?? row.source_uri;
  const existing = db.prepare(
    `SELECT id FROM ideas_company_filings WHERE run_id = ? AND accession_no = ?`,
  ).get(runId, accession) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = generateCompanyFilingId();
  db.prepare(
    `INSERT INTO ideas_company_filings
       (id, run_id, cik, ticker, company_name, accession_no, form, filed_at, period, filing_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    runId,
    stringField(sec, 'cik') ?? '',
    stringField(sec, 'ticker'),
    stringField(sec, 'company_name'),
    accession,
    stringField(sec, 'form') ?? '',
    stringField(sec, 'filed_at') ?? '',
    stringField(sec, 'period'),
    stringField(sec, 'filing_url') ?? row.source_uri,
  );
  return id;
}

function recordTheme(db: IdeasDatabase, runId: string, row: ImportCandidateRow, assumptionId: string): string {
  const fields = parseExtractedFields(row);
  const sec = objectField(fields, 'sec_company');
  const id = generateCompanyThemeId();
  const filedAt = stringField(sec, 'filed_at') ?? '';
  db.prepare(
    `INSERT INTO ideas_company_themes
       (id, run_id, cik, ticker, theme_key, title, first_seen_at, latest_seen_at, assumption_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    runId,
    stringField(sec, 'cik') ?? '',
    stringField(sec, 'ticker'),
    stringField(fields, 'theme_key') ?? '',
    stringField(fields, 'theme_title') ?? row.title,
    filedAt,
    filedAt,
    assumptionId,
  );
  return id;
}

function recordObservation(
  db: IdeasDatabase,
  runId: string,
  themeId: string,
  filingId: string,
  row: ImportCandidateRow,
): void {
  const fields = parseExtractedFields(row);
  const sec = objectField(fields, 'sec_company');
  const observedAt = stringField(sec, 'filed_at') ?? '';
  db.prepare(
    `INSERT INTO ideas_company_observations
       (id, run_id, theme_id, filing_id, section_key, source_uri, excerpt_hash, excerpt, observed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    generateCompanyObservationId(),
    runId,
    themeId,
    filingId,
    stringField(fields, 'section_key') ?? '',
    row.source_uri,
    stringField(fields, 'excerpt_hash') ?? '',
    row.body_md.slice(0, 2000),
    observedAt,
  );
  db.prepare(
    `UPDATE ideas_company_themes SET latest_seen_at = ? WHERE id = ? AND latest_seen_at < ?`,
  ).run(observedAt, themeId, observedAt);
}

function recordOutcomeCandidate(
  db: IdeasDatabase,
  runId: string,
  themeId: string,
  assumptionId: string,
  filingId: string,
  row: ImportCandidateRow,
): void {
  const fields = parseExtractedFields(row);
  db.prepare(
    `INSERT INTO ideas_company_outcome_candidates
       (id, run_id, theme_id, assumption_id, filing_id, source_uri, excerpt, confidence, rationale, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    generateCompanyOutcomeCandidateId(),
    runId,
    themeId,
    assumptionId,
    filingId,
    row.source_uri,
    row.body_md.slice(0, 2000),
    row.confidence,
    stringField(fields, 'rationale') ?? 'Explicit realized-risk language detected.',
    Date.now(),
  );
}

function objectField(obj: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const value = obj?.[key];
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringField(obj: Record<string, unknown> | null, key: string): string | undefined {
  const value = obj?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

interface CompanyOutcomeCandidateRow {
  id: string;
  run_id: string;
  theme_id: string;
  assumption_id: string | null;
  filing_id: string;
  source_uri: string;
  excerpt: string;
  confidence: number;
  rationale: string;
  state: string;
  applied_outcome_id: string | null;
  created_at: number;
  applied_at: number | null;
}
