import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { IdeasDatabase } from './db.js';
import {
  generateCompanyFilingId,
  generateCompanyObservationId,
  generateCompanyOutcomeCandidateId,
  generateCompanyRunId,
  generateCompanyRunMemberId,
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
import {
  buildCompanyThesisReport,
  type CompanyThesisReport,
} from './company-thesis-report.js';
import {
  buildSecCompanyLedgerReport,
  renderSecCompanyLedgerMarkdown,
  type SecLedgerReport,
} from './sec-ledger-report.js';
import { writeNote } from './write/index.js';

export interface CompanyTrackInput {
  run_id?: string;
  companies: string[];
  years?: number;
  forms?: string[];
  confirm: boolean;
  fixture_dir?: string;
  limit_filings?: number;
  company_metadata?: Record<string, CompanyMetadata>;
  max_companies?: number;
}

export interface CompanyMetadata {
  sector?: string;
  display_name?: string;
  source_rank?: number;
  source_weight?: string;
  source?: string;
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
  completed_companies: number;
  failed_companies: Array<{ company: string; error: string }>;
  report_md_path: string;
  report_json_path: string;
  thesis_report_md_path: string;
  thesis_report_json_path: string;
}

export interface CompanyReportOptions {
  run_id: string;
  report_kind?: 'tracker' | 'thesis';
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
  const companies = [...new Set(input.companies.map((c) => c.trim()).filter(Boolean))];
  if (companies.length === 0) throw new CompanyInputError('company.track requires companies');
  const maxCompanies = input.max_companies ?? 125;
  if (companies.length > maxCompanies) throw new CompanyInputError(`company.track supports at most ${maxCompanies} companies per run`);

  const years = input.years ?? 10;
  const forms = input.forms ?? ['10-K', '10-Q'];
  const runId = input.run_id ?? generateCompanyRunId();
  const now = Date.now();
  const existingRun = db.prepare(`SELECT id FROM ideas_company_runs WHERE id = ?`).get(runId);
  if (!existingRun) {
    db.prepare(
      `INSERT INTO ideas_company_runs (id, companies_json, years, forms_json, started_at, status)
       VALUES (?, ?, ?, ?, ?, 'running')`,
    ).run(runId, JSON.stringify(companies), years, JSON.stringify(forms), now);
  } else {
    db.prepare(
      `UPDATE ideas_company_runs SET companies_json = ?, years = ?, forms_json = ?, status = 'running' WHERE id = ?`,
    ).run(JSON.stringify(companies), years, JSON.stringify(forms), runId);
  }

  const sources: string[] = [];
  let promotedIdeas = 0;
  let promotedAssumptions = 0;
  let stagedOutcomes = 0;
  let completedCompanies = 0;
  const failedCompanies: Array<{ company: string; error: string }> = [];

  for (const company of companies) {
    const metadata = resolveCompanyMetadata(input.company_metadata, company);
    const member = ensureRunMember(db, runId, company, metadata);
    if (member.status === 'completed') {
      if (member.source_id) sources.push(member.source_id);
      promotedIdeas += member.promoted_ideas;
      promotedAssumptions += member.promoted_assumptions;
      stagedOutcomes += member.staged_outcomes;
      completedCompanies++;
      continue;
    }
    try {
      markRunMemberStarted(db, member.id);
      const fixtureDir = input.fixture_dir
        ? await resolveCompanyFixtureDir(input.fixture_dir, company, companies.length)
        : undefined;
      const source = fixtureDir ? `fixture://${fixtureDir}` : company;
      const summary = await scanSource(db, vaultPath, {
        adapter: 'sec-company',
        source,
        scan_config: {
          years,
          forms,
          fixture_dir: fixtureDir,
          limit_filings: input.limit_filings,
        },
        dedup: false,
      });
      sources.push(summary.source_id);
      const candidates = listCandidates(db, { source_id: summary.source_id, limit: 5000 })
        .sort((a, b) => a.scanned_at - b.scanned_at);
      const promoted = await promoteCompanyCandidates(db, vaultPath, runId, candidates);
      promotedIdeas += promoted.ideas;
      promotedAssumptions += promoted.assumptions;
      stagedOutcomes += promoted.outcomes;
      completedCompanies++;
      markRunMemberCompleted(db, member.id, summary.source_id, promoted);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failedCompanies.push({ company, error });
      markRunMemberFailed(db, member.id, error);
    }
  }

  const artifacts = await writeCompanyReports(db, vaultPath, runId);
  await writeCompanyBundleReports(db, vaultPath, runId);
  db.prepare(
    `UPDATE ideas_company_runs
       SET completed_at = ?, status = ?,
           report_md_path = ?, report_json_path = ?,
           thesis_report_md_path = ?, thesis_report_json_path = ?
     WHERE id = ?`,
  ).run(
    Date.now(),
    failedCompanies.length > 0 ? 'partial_failed' : 'completed',
    artifacts.markdownPath,
    artifacts.jsonPath,
    artifacts.thesisMarkdownPath,
    artifacts.thesisJsonPath,
    runId,
  );

  return {
    run_id: runId,
    companies,
    years,
    forms,
    sources,
    promoted_ideas: promotedIdeas,
    promoted_assumptions: promotedAssumptions,
    staged_outcomes: stagedOutcomes,
    completed_companies: completedCompanies,
    failed_companies: failedCompanies,
    report_md_path: artifacts.markdownPath,
    report_json_path: artifacts.jsonPath,
    thesis_report_md_path: artifacts.thesisMarkdownPath,
    thesis_report_json_path: artifacts.thesisJsonPath,
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
    const sec = objectField(fields, 'sec_company');
    const cik = stringField(sec, 'cik') ?? 'unknown';
    const parentSource = stringField(fields, 'parent_idea_source_uri');
    const targetIdea = parentSource ? ideaBySourceUri.get(parentSource) : undefined;
    if (!themeKey || !targetIdea) {
      markCandidateRejected(db, row.id);
      continue;
    }
    const filingId = recordFilingIfNeeded(db, runId, row);
    const compoundThemeKey = `${cik}:${themeKey}`;
    const existing = themeByKey.get(compoundThemeKey);
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
    themeByKey.set(compoundThemeKey, { themeId, assumptionId: res.promoted_id });
    assumptions++;
  }

  for (const row of candidates.filter((c) => c.candidate_kind === 'outcome')) {
    const fields = parseExtractedFields(row);
    const themeKey = stringField(fields, 'theme_key');
    const sec = objectField(fields, 'sec_company');
    const cik = stringField(sec, 'cik') ?? 'unknown';
    const matched = themeKey ? themeByKey.get(`${cik}:${themeKey}`) : undefined;
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

export function readCompanyThesisReport(db: IdeasDatabase, runId: string): CompanyThesisReport {
  const data = buildReportData(db, runId);
  return data.company_thesis_report as CompanyThesisReport;
}

export async function writeCompanyBundleReports(
  db: IdeasDatabase,
  vaultPath: string,
  runId: string,
): Promise<{ indexPath: string; writtenPaths: string[] }> {
  const data = buildReportData(db, runId);
  const run = data.run as Record<string, unknown>;
  const baseDir = `reports/company-runs/${runId.toLowerCase()}`;
  const pages = buildCompanyBundlePages(data, baseDir);
  const writtenPaths: string[] = [];
  for (const page of pages) {
    const result = await writeNote(
      vaultPath,
      page.path,
      {
        id: page.id,
        type: 'report',
        report_kind: page.kind,
        run_id: run.id,
        source: 'flywheel-ideas',
      },
      page.body,
      { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 12 },
    );
    writtenPaths.push(result.vault_path);
  }
  return { indexPath: `${baseDir}/index.md`, writtenPaths };
}

export async function writeCompanyReports(
  db: IdeasDatabase,
  vaultPath: string,
  runId: string,
): Promise<{
  markdownPath: string;
  jsonPath: string;
  thesisMarkdownPath: string;
  thesisJsonPath: string;
}> {
  const data = buildReportData(db, runId);
  const dir = path.join(vaultPath, 'reports');
  await fsp.mkdir(dir, { recursive: true });
  const base = `company-tracker-${runId.toLowerCase()}`;
  const markdownPath = `reports/${base}.md`;
  const jsonPath = `reports/${base}.json`;
  const thesisBase = `company-thesis-${runId.toLowerCase()}`;
  const thesisMarkdownPath = `reports/${thesisBase}.md`;
  const thesisJsonPath = `reports/${thesisBase}.json`;
  const markdownResult = await writeNote(
    vaultPath,
    markdownPath,
    buildCompanyReportFrontmatter(data),
    renderCompanyMarkdown(data),
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 8 },
  );
  const actualMarkdownPath = markdownResult.vault_path;
  const thesisReport = data.company_thesis_report as CompanyThesisReport;
  const thesisMarkdownResult = await writeNote(
    vaultPath,
    thesisMarkdownPath,
    buildCompanyThesisFrontmatter(data),
    thesisReport.markdown,
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 8 },
  );
  const actualThesisMarkdownPath = thesisMarkdownResult.vault_path;
  await fsp.writeFile(path.join(vaultPath, jsonPath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fsp.writeFile(path.join(vaultPath, thesisJsonPath), `${JSON.stringify(thesisReport, null, 2)}\n`, 'utf8');
  db.prepare(
    `UPDATE ideas_company_runs
        SET report_md_path = ?, report_json_path = ?,
            thesis_report_md_path = ?, thesis_report_json_path = ?
      WHERE id = ?`,
  ).run(actualMarkdownPath, jsonPath, actualThesisMarkdownPath, thesisJsonPath, runId);
  return {
    markdownPath: actualMarkdownPath,
    jsonPath,
    thesisMarkdownPath: actualThesisMarkdownPath,
    thesisJsonPath,
  };
}

function buildCompanyReportFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const run = data.run as Record<string, unknown>;
  return {
    id: `company-tracker-${run.id}`,
    type: 'report',
    report_kind: 'sec_company_tracker',
    run_id: run.id,
    companies: parseJsonArray(run.companies_json),
    forms: parseJsonArray(run.forms_json),
    years: run.years,
    source: 'flywheel-ideas',
  };
}

function buildCompanyThesisFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const base = buildCompanyReportFrontmatter(data);
  return {
    ...base,
    id: `company-thesis-${(data.run as Record<string, unknown>).id}`,
    report_kind: 'company_thesis',
  };
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildReportData(db: IdeasDatabase, runId: string): Record<string, unknown> {
  const run = db.prepare(`SELECT * FROM ideas_company_runs WHERE id = ?`).get(runId) as Record<string, unknown>;
  const filings = db.prepare(`SELECT * FROM ideas_company_filings WHERE run_id = ? ORDER BY cik, filed_at`).all(runId);
  const themes = db.prepare(`SELECT * FROM ideas_company_themes WHERE run_id = ? ORDER BY cik, theme_key`).all(runId);
  const observations = db.prepare(`SELECT * FROM ideas_company_observations WHERE run_id = ? ORDER BY observed_at`).all(runId);
  const outcomes = db.prepare(`SELECT * FROM ideas_company_outcome_candidates WHERE run_id = ? ORDER BY confidence DESC`).all(runId);
  const runMembers = db.prepare(`SELECT * FROM ideas_company_run_members WHERE run_id = ? ORDER BY sector, company`).all(runId);
  const companySummaries = buildCompanySummaries(filings, themes, observations, outcomes);
  const companySummariesWithMetadata = attachCompanyMetadata(companySummaries, runMembers);
  const themeMatrix = buildThemeMatrix(themes, observations);
  const sectorMatrix = buildSectorMatrix(companySummariesWithMetadata, themes, observations, outcomes, runMembers);
  const crossSectorPatterns = buildCrossSectorPatterns(themes, observations, outcomes, runMembers);
  const lifecycleSummary = buildLifecycleSummary(filings, themes, observations, outcomes);
  const observationExamples = buildObservationExamples(themes, observations, filings);
  const outcomeGroups = buildOutcomeGroups(outcomes, themes, filings);
  const secLedgerReport = buildSecCompanyLedgerReport(db, { run_id: runId });
  const companyThesisReport = buildCompanyThesisReport(secLedgerReport);
  const highConfidenceOutcomes = (outcomes as Array<Record<string, unknown>>).filter((o) => Number(o.confidence) >= 0.9);
  const reviewOutcomes = (outcomes as Array<Record<string, unknown>>).filter((o) => Number(o.confidence) < 0.9);
  return {
    run,
    filings,
    themes,
    observations,
    outcomes,
    lifecycle_summary: lifecycleSummary,
    value_summary: {
      primary_value: 'Auditable recurring-risk observations across dated SEC filings.',
      outcome_policy: 'Only strict realized-risk language is staged; canonical outcomes require company.apply_outcomes.',
      limitation: 'SEC disclosures are issuer-authored evidence, not independent truth or investment advice.',
    },
    observation_examples: observationExamples,
    outcome_groups: outcomeGroups,
    sec_ledger_report: secLedgerReport,
    company_thesis_report: companyThesisReport,
    run_members: runMembers,
    company_summaries: companySummariesWithMetadata,
    theme_matrix: themeMatrix,
    sector_matrix: sectorMatrix,
    cross_sector_patterns: crossSectorPatterns,
    high_confidence_outcomes: highConfidenceOutcomes,
    review_outcomes: reviewOutcomes,
  };
}

function renderCompanyMarkdown(data: Record<string, unknown>): string {
  const run = data.run as Record<string, unknown>;
  const filings = data.filings as Array<Record<string, unknown>>;
  const themes = data.themes as Array<Record<string, unknown>>;
  const outcomes = data.outcomes as Array<Record<string, unknown>>;
  const summaries = data.company_summaries as Array<Record<string, unknown>>;
  const matrix = data.theme_matrix as Array<Record<string, unknown>>;
  const sectorMatrix = data.sector_matrix as Array<Record<string, unknown>>;
  const crossSectorPatterns = data.cross_sector_patterns as Array<Record<string, unknown>>;
  const lifecycle = data.lifecycle_summary as Record<string, unknown>;
  const examples = data.observation_examples as Array<Record<string, unknown>>;
  const outcomeGroups = data.outcome_groups as Array<Record<string, unknown>>;
  const secLedgerReport = data.sec_ledger_report as SecLedgerReport;
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
    renderSecCompanyLedgerMarkdown(secLedgerReport).trim(),
    '',
    '## Lifecycle Summary',
    '',
    `- Corpus: ${lifecycle.filings_scanned} SEC filing(s) scanned.`,
    `- Observation ledger: ${lifecycle.observations} dated observation(s) grouped into ${lifecycle.themes_tracked} tracked assumption theme(s).`,
    `- Cross-company comparison: ${lifecycle.cross_company_themes} theme(s) appeared in more than one company.`,
    `- Realized outcome candidates: ${lifecycle.staged_outcomes} staged, ${lifecycle.applied_outcomes} applied.`,
    `- Value signal: recurring issuer-authored evidence is organized for review; outcomes are not applied until explicitly accepted.`,
    '',
    '## Company Summaries',
    '',
  ];
  for (const summary of summaries) {
    lines.push(`### ${summary.ticker ?? summary.cik}`);
    lines.push('');
    lines.push(`- Filings scanned: ${summary.filing_count}`);
    lines.push(`- Window: ${summary.first_filing_at ?? 'n/a'} to ${summary.latest_filing_at ?? 'n/a'}`);
    lines.push(`- Themes tracked: ${summary.theme_count}`);
    lines.push(`- Observations: ${summary.observation_count}`);
    lines.push(`- Staged outcomes: ${summary.staged_outcome_count}`);
    lines.push('');
    const topThemes = summary.top_themes as Array<Record<string, unknown>>;
    for (const theme of topThemes) {
      lines.push(`- **${theme.title ?? theme.theme_key}**: ${theme.observation_count} observation(s), latest ${theme.latest_seen_at ?? 'n/a'}, assumption ${theme.assumption_id ?? 'none'}`);
    }
    lines.push('');
  }
  lines.push(
    '## Cross-Company Theme Matrix',
    '',
    '| Theme | Companies | Observations | Latest Seen |',
    '|---|---:|---:|---|',
  );
  for (const row of matrix) {
    const companies = row.companies as string[];
    lines.push(`| ${row.title ?? row.theme_key} | ${companies.join(', ')} | ${row.observation_count} | ${row.latest_seen_at ?? 'n/a'} |`);
  }
  lines.push(
    '',
    '## Sector Assumption Matrix',
    '',
    '| Sector | Companies | Themes | Observations | Staged Outcomes | Top Shared Themes |',
    '|---|---:|---:|---:|---:|---|',
  );
  for (const row of sectorMatrix) {
    const topThemes = row.top_themes as string[];
    lines.push(`| ${row.sector} | ${row.company_count} | ${row.theme_count} | ${row.observation_count} | ${row.staged_outcome_count} | ${topThemes.join(', ')} |`);
  }
  lines.push('', '## Cross-Sector Mechanism Patterns', '');
  if (crossSectorPatterns.length === 0) {
    lines.push('No mechanism-level pattern appears across more than one sector yet.');
  } else {
    for (const pattern of crossSectorPatterns.slice(0, 20)) {
      const sectors = pattern.sectors as string[];
      const companies = pattern.companies as string[];
      lines.push(`- **${pattern.theme_title} / ${pattern.mechanism_title}**: ${sectors.length} sector(s), ${companies.length} company(ies), ${pattern.observation_count} observation(s), ${pattern.realized_candidate_count} realized candidate(s).`);
      lines.push(`  - Sectors: ${sectors.join(', ')}`);
    }
  }
  lines.push('', '## Observation Evidence Examples', '');
  for (const example of examples) {
    lines.push(`- **${example.company} / ${example.theme_title}** (${example.observed_at}, ${example.section_key})`);
    lines.push(`  - Source: ${example.source_uri}`);
    lines.push(`  - ${String(example.excerpt ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
  }
  lines.push(
    '',
    '## Realized Outcome Review Events',
    '',
    `${outcomes.filter((o) => o.state === 'staged').length} staged candidate(s) grouped into ${outcomeGroups.length} review event(s). Apply still operates on candidate IDs; groups are for review only.`,
    '',
  );
  for (const group of outcomeGroups) {
    const themesForGroup = group.themes as string[];
    const candidates = group.candidate_ids as string[];
    const sources = group.source_uris as string[];
    lines.push(`- **${group.company}** ${group.first_seen_at ?? 'n/a'}${group.latest_seen_at && group.latest_seen_at !== group.first_seen_at ? ` to ${group.latest_seen_at}` : ''}: ${group.candidate_count} candidate(s), ${themesForGroup.join(', ')}`);
    lines.push(`  - Candidate IDs: ${candidates.join(', ')}`);
    lines.push(`  - Representative source: ${sources[0] ?? 'n/a'}`);
    lines.push(`  - ${String(group.representative_excerpt ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
  }
  lines.push(
    '',
    '## Realized Outcome Candidates',
    '',
    'These candidates are staged for human review. Applying them requires company.apply_outcomes.',
    '',
  );
  for (const outcome of outcomes.filter((o) => o.state === 'staged')) {
    lines.push(`- **${outcome.confidence}** ${outcome.rationale} (${outcome.source_uri})`);
    lines.push(`  - ${String(outcome.excerpt ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
  }
  lines.push('', '## Source Themes', '');
  for (const theme of themes) {
    lines.push(`- **${theme.ticker ?? theme.cik} / ${theme.title}**: first ${theme.first_seen_at}, latest ${theme.latest_seen_at}, assumption ${theme.assumption_id ?? 'none'}`);
  }
  return `${lines.join('\n')}\n`;
}

interface BundlePage {
  id: string;
  kind: string;
  path: string;
  body: string;
}

function buildCompanyBundlePages(data: Record<string, unknown>, baseDir: string): BundlePage[] {
  const run = data.run as Record<string, unknown>;
  const runId = String(run.id);
  const thesis = data.company_thesis_report as CompanyThesisReport;
  const summaries = data.company_summaries as Array<Record<string, unknown>>;
  const sectorMatrix = data.sector_matrix as Array<Record<string, unknown>>;
  const themeMatrix = data.theme_matrix as Array<Record<string, unknown>>;
  const crossSectorPatterns = data.cross_sector_patterns as Array<Record<string, unknown>>;
  const outcomeGroups = data.outcome_groups as Array<Record<string, unknown>>;
  const secLedgerReport = data.sec_ledger_report as SecLedgerReport;
  const pages: BundlePage[] = [];
  const indexLinks = [
    `- [[${baseDir}/thesis|Company thesis]]`,
    `- [[${baseDir}/tracker|Evidence tracker]]`,
    `- [[${baseDir}/sector-assumption-matrix|Sector assumption matrix]]`,
    `- [[${baseDir}/cross-sector-patterns|Cross-sector patterns]]`,
    `- [[${baseDir}/review-queue|Human review queue]]`,
    `- [[${baseDir}/accepted-lessons|Accepted lessons]]`,
    `- [[${baseDir}/run-delta|Run delta]]`,
  ];
  for (const sector of sectorMatrix) {
    indexLinks.push(`- [[${baseDir}/sectors/${slugify(String(sector.sector))}|${sector.sector}]]`);
  }
  for (const summary of summaries) {
    indexLinks.push(`- [[${baseDir}/companies/${slugify(String(summary.ticker ?? summary.cik))}|${summary.ticker ?? summary.cik}]]`);
  }
  pages.push({
    id: `company-run-${runId}-index`,
    kind: 'company_sector_bundle_index',
    path: `${baseDir}/index.md`,
    body: [
      `# Company Sector Run ${runId}`,
      '',
      'A Flywheel-linked table of contents for the company lifecycle bundle.',
      '',
      '## Top Down',
      '',
      ...indexLinks,
      '',
      '## Executive Readout',
      '',
      `- Companies requested: ${parseJsonArray(run.companies_json).length}`,
      `- Filings scanned: ${secLedgerReport.executive_summary.filings_scanned}`,
      `- Current bets: ${secLedgerReport.executive_summary.current_bets}`,
      `- Review events: ${secLedgerReport.executive_summary.review_events}`,
      `- Accepted failures: ${secLedgerReport.executive_summary.accepted_failures}`,
      '',
    ].join('\n'),
  });
  pages.push({
    id: `company-run-${runId}-thesis`,
    kind: 'company_sector_bundle_thesis',
    path: `${baseDir}/thesis.md`,
    body: thesis.markdown,
  });
  pages.push({
    id: `company-run-${runId}-tracker`,
    kind: 'company_sector_bundle_tracker',
    path: `${baseDir}/tracker.md`,
    body: renderCompanyMarkdown(data),
  });
  pages.push({
    id: `company-run-${runId}-sector-matrix`,
    kind: 'company_sector_matrix',
    path: `${baseDir}/sector-assumption-matrix.md`,
    body: renderSectorMatrixPage(runId, sectorMatrix, themeMatrix),
  });
  pages.push({
    id: `company-run-${runId}-cross-sector-patterns`,
    kind: 'company_cross_sector_patterns',
    path: `${baseDir}/cross-sector-patterns.md`,
    body: renderCrossSectorPatternsPage(runId, crossSectorPatterns),
  });
  pages.push({
    id: `company-run-${runId}-review-queue`,
    kind: 'company_review_queue',
    path: `${baseDir}/review-queue.md`,
    body: renderReviewQueuePage(runId, outcomeGroups),
  });
  pages.push({
    id: `company-run-${runId}-accepted-lessons`,
    kind: 'company_accepted_lessons',
    path: `${baseDir}/accepted-lessons.md`,
    body: renderAcceptedLessonsPage(runId, thesis),
  });
  pages.push({
    id: `company-run-${runId}-delta`,
    kind: 'company_run_delta',
    path: `${baseDir}/run-delta.md`,
    body: renderRunDeltaPlaceholder(runId),
  });
  for (const sector of sectorMatrix) {
    pages.push({
      id: `company-run-${runId}-sector-${slugify(String(sector.sector))}`,
      kind: 'company_sector_page',
      path: `${baseDir}/sectors/${slugify(String(sector.sector))}.md`,
      body: renderSectorPage(runId, sector, summaries),
    });
  }
  for (const summary of summaries) {
    pages.push({
      id: `company-run-${runId}-company-${slugify(String(summary.ticker ?? summary.cik))}`,
      kind: 'company_page',
      path: `${baseDir}/companies/${slugify(String(summary.ticker ?? summary.cik))}.md`,
      body: renderCompanyPage(runId, summary),
    });
  }
  for (const theme of themeMatrix.slice(0, 50)) {
    pages.push({
      id: `company-run-${runId}-theme-${slugify(String(theme.theme_key ?? theme.title))}`,
      kind: 'company_theme_page',
      path: `${baseDir}/themes/${slugify(String(theme.theme_key ?? theme.title))}.md`,
      body: renderThemePage(runId, theme),
    });
  }
  for (const pattern of crossSectorPatterns.slice(0, 50)) {
    pages.push({
      id: `company-run-${runId}-pattern-${slugify(String(pattern.pattern_key))}`,
      kind: 'company_cross_sector_pattern_page',
      path: `${baseDir}/patterns/${slugify(String(pattern.pattern_key))}.md`,
      body: renderCrossSectorPatternPage(runId, pattern),
    });
  }
  return pages;
}

function renderSectorMatrixPage(
  runId: string,
  sectorMatrix: Array<Record<string, unknown>>,
  themeMatrix: Array<Record<string, unknown>>,
): string {
  const lines = [
    `# Sector Assumption Matrix ${runId}`,
    '',
    '## Sectors',
    '',
    '| Sector | Companies | Themes | Observations | Staged Outcomes | Top Themes |',
    '|---|---:|---:|---:|---:|---|',
  ];
  for (const row of sectorMatrix) {
    const topThemes = row.top_themes as string[];
    lines.push(`| ${row.sector} | ${row.company_count} | ${row.theme_count} | ${row.observation_count} | ${row.staged_outcome_count} | ${topThemes.join(', ')} |`);
  }
  lines.push('', '## Shared Assumptions Across Companies', '');
  for (const row of themeMatrix.filter((theme) => (theme.companies as string[]).length > 1).slice(0, 30)) {
    const companies = row.companies as string[];
    lines.push(`- **${row.title ?? row.theme_key}** appears across ${companies.join(', ')} with ${row.observation_count} observation(s).`);
  }
  return `${lines.join('\n')}\n`;
}

function renderReviewQueuePage(runId: string, outcomeGroups: Array<Record<string, unknown>>): string {
  const lines = [`# Human Review Queue ${runId}`, ''];
  if (outcomeGroups.length === 0) {
    lines.push('No staged review events are waiting for human judgment.');
  } else {
    for (const group of outcomeGroups) {
      const candidates = group.candidate_ids as string[];
      const themes = group.themes as string[];
      lines.push(`- **${group.company} / ${themes.join(', ')}**: ${group.candidate_count} candidate(s).`);
      lines.push(`  - Candidate IDs: ${candidates.join(', ')}`);
      lines.push(`  - Evidence: ${String(group.representative_excerpt ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderCrossSectorPatternsPage(
  runId: string,
  patterns: Array<Record<string, unknown>>,
): string {
  const lines = [
    `# Cross-Sector Patterns ${runId}`,
    '',
    'Mechanism-level comparison prevents generic SEC boilerplate from looking more meaningful than it is.',
    '',
    '| Pattern | Sectors | Companies | Observations | Realized Candidates | Signal |',
    '|---|---:|---:|---:|---:|---|',
  ];
  for (const pattern of patterns) {
    const sectors = pattern.sectors as string[];
    const companies = pattern.companies as string[];
    lines.push(`| [[patterns/${slugify(String(pattern.pattern_key))}|${pattern.theme_title} / ${pattern.mechanism_title}]] | ${sectors.length} | ${companies.length} | ${pattern.observation_count} | ${pattern.realized_candidate_count} | ${pattern.signal} |`);
  }
  if (patterns.length === 0) lines.push('| none | 0 | 0 | 0 | 0 | no cross-sector mechanism pattern yet |');
  return `${lines.join('\n')}\n`;
}

function renderCrossSectorPatternPage(runId: string, pattern: Record<string, unknown>): string {
  const sectors = pattern.sectors as string[];
  const companies = pattern.companies as string[];
  const examples = pattern.examples as Array<Record<string, unknown>>;
  const lines = [
    `# ${pattern.theme_title} / ${pattern.mechanism_title} ${runId}`,
    '',
    `- Theme: ${pattern.theme_title}`,
    `- Mechanism: ${pattern.mechanism_title}`,
    `- Sectors: ${sectors.join(', ')}`,
    `- Companies: ${companies.join(', ')}`,
    `- Observations: ${pattern.observation_count}`,
    `- Realized candidates: ${pattern.realized_candidate_count}`,
    `- Signal: ${pattern.signal}`,
    '',
    '## What We Can Learn',
    '',
    String(pattern.learning),
    '',
    '## Evidence Examples',
    '',
  ];
  for (const example of examples) {
    lines.push(`- **${example.company} / ${example.sector}** (${example.observed_at})`);
    lines.push(`  - ${String(example.excerpt ?? '').replace(/\s+/g, ' ').slice(0, 350)}`);
  }
  return `${lines.join('\n')}\n`;
}

function renderAcceptedLessonsPage(runId: string, thesis: CompanyThesisReport): string {
  const lines = [`# Accepted Lessons ${runId}`, ''];
  if (thesis.prior_failures_and_lessons.length === 0) {
    lines.push('No accepted failure lessons have been recorded yet.');
  } else {
    for (const lesson of thesis.prior_failures_and_lessons) {
      lines.push(`- **${lesson.lesson}**`);
      lines.push(`  - Companies: ${lesson.companies.join(', ')}`);
      lines.push(`  - Themes: ${lesson.themes.join(', ')}`);
      lines.push(`  - Outcomes: ${lesson.outcome_ids.join(', ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderRunDeltaPlaceholder(runId: string): string {
  return [
    `# Run Delta ${runId}`,
    '',
    'No prior run manifest was supplied to this core bundle writer.',
    '',
    'The sector dogfood script writes a richer run-over-run delta when it finds a previous local manifest.',
    '',
  ].join('\n');
}

function renderSectorPage(
  runId: string,
  sector: Record<string, unknown>,
  summaries: Array<Record<string, unknown>>,
): string {
  const companies = summaries.filter((summary) => summary.sector === sector.sector);
  const lines = [
    `# ${sector.sector} ${runId}`,
    '',
    `- Companies: ${(sector.companies as string[]).join(', ')}`,
    `- Observations: ${sector.observation_count}`,
    `- Staged outcomes: ${sector.staged_outcome_count}`,
    '',
    '## Companies',
    '',
  ];
  for (const company of companies) {
    lines.push(`- [[companies/${slugify(String(company.ticker ?? company.cik))}|${company.ticker ?? company.cik}]]: ${company.observation_count} observation(s), ${company.staged_outcome_count} staged outcome(s).`);
  }
  return `${lines.join('\n')}\n`;
}

function renderCompanyPage(runId: string, summary: Record<string, unknown>): string {
  const topThemes = summary.top_themes as Array<Record<string, unknown>>;
  const lines = [
    `# ${summary.ticker ?? summary.cik} ${runId}`,
    '',
    `- Company: ${summary.display_name ?? summary.company_name ?? summary.ticker}`,
    `- Sector: ${summary.sector ?? 'Unclassified'}`,
    `- Filings scanned: ${summary.filing_count}`,
    `- Window: ${summary.first_filing_at ?? 'n/a'} to ${summary.latest_filing_at ?? 'n/a'}`,
    `- Observations: ${summary.observation_count}`,
    `- Staged outcomes: ${summary.staged_outcome_count}`,
    '',
    '## Top Themes',
    '',
  ];
  for (const theme of topThemes) {
    lines.push(`- **${theme.title ?? theme.theme_key}**: ${theme.observation_count} observation(s), latest ${theme.latest_seen_at ?? 'n/a'}, assumption ${theme.assumption_id ?? 'none'}`);
  }
  return `${lines.join('\n')}\n`;
}

function renderThemePage(runId: string, theme: Record<string, unknown>): string {
  const companies = theme.companies as string[];
  return [
    `# ${theme.title ?? theme.theme_key} ${runId}`,
    '',
    `- Companies: ${companies.join(', ')}`,
    `- Observations: ${theme.observation_count}`,
    `- Latest seen: ${theme.latest_seen_at ?? 'n/a'}`,
    '',
  ].join('\n');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
}

async function resolveCompanyFixtureDir(baseDir: string, company: string, companyCount: number): Promise<string> {
  if (companyCount === 1 && await hasManifest(baseDir)) return baseDir;
  const ticker = company.replace(/^ticker:/i, '').trim().toLowerCase();
  const candidate = path.join(baseDir, ticker);
  if (await hasManifest(candidate)) return candidate;
  if (await hasManifest(baseDir)) return baseDir;
  throw new CompanyInputError(`fixture manifest not found for ${company}: expected ${candidate}/manifest.json`);
}

async function hasManifest(dir: string): Promise<boolean> {
  try {
    await fsp.access(path.join(dir, 'manifest.json'));
    return true;
  } catch {
    return false;
  }
}

interface CompanyRunMemberRow {
  id: string;
  run_id: string;
  company: string;
  sector: string | null;
  display_name: string | null;
  source_rank: number | null;
  source_weight: string | null;
  source: string | null;
  source_id: string | null;
  status: string;
  promoted_ideas: number;
  promoted_assumptions: number;
  staged_outcomes: number;
  error: string | null;
  started_at: number | null;
  completed_at: number | null;
}

function ensureRunMember(
  db: IdeasDatabase,
  runId: string,
  company: string,
  metadata: CompanyMetadata,
): CompanyRunMemberRow {
  const existing = db.prepare(
    `SELECT * FROM ideas_company_run_members WHERE run_id = ? AND company = ?`,
  ).get(runId, company) as CompanyRunMemberRow | undefined;
  if (existing) {
    db.prepare(
      `UPDATE ideas_company_run_members
          SET sector = ?, display_name = ?, source_rank = ?, source_weight = ?, source = ?
        WHERE id = ?`,
    ).run(
      metadata.sector ?? existing.sector,
      metadata.display_name ?? existing.display_name,
      metadata.source_rank ?? existing.source_rank,
      metadata.source_weight ?? existing.source_weight,
      metadata.source ?? existing.source,
      existing.id,
    );
    return db.prepare(`SELECT * FROM ideas_company_run_members WHERE id = ?`).get(existing.id) as CompanyRunMemberRow;
  }
  const id = generateCompanyRunMemberId();
  db.prepare(
    `INSERT INTO ideas_company_run_members
       (id, run_id, company, sector, display_name, source_rank, source_weight, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
  ).run(
    id,
    runId,
    company,
    metadata.sector ?? null,
    metadata.display_name ?? null,
    metadata.source_rank ?? null,
    metadata.source_weight ?? null,
    metadata.source ?? null,
  );
  return db.prepare(`SELECT * FROM ideas_company_run_members WHERE id = ?`).get(id) as CompanyRunMemberRow;
}

function markRunMemberStarted(db: IdeasDatabase, memberId: string): void {
  db.prepare(
    `UPDATE ideas_company_run_members
        SET status = 'running', error = NULL, started_at = COALESCE(started_at, ?)
      WHERE id = ?`,
  ).run(Date.now(), memberId);
}

function markRunMemberCompleted(
  db: IdeasDatabase,
  memberId: string,
  sourceId: string,
  promoted: { ideas: number; assumptions: number; outcomes: number },
): void {
  db.prepare(
    `UPDATE ideas_company_run_members
        SET status = 'completed', source_id = ?, promoted_ideas = ?,
            promoted_assumptions = ?, staged_outcomes = ?, error = NULL, completed_at = ?
      WHERE id = ?`,
  ).run(sourceId, promoted.ideas, promoted.assumptions, promoted.outcomes, Date.now(), memberId);
}

function markRunMemberFailed(db: IdeasDatabase, memberId: string, error: string): void {
  db.prepare(
    `UPDATE ideas_company_run_members
        SET status = 'failed', error = ?, completed_at = ?
      WHERE id = ?`,
  ).run(error.slice(0, 1000), Date.now(), memberId);
}

function resolveCompanyMetadata(
  metadata: Record<string, CompanyMetadata> | undefined,
  company: string,
): CompanyMetadata {
  if (!metadata) return {};
  const keys = [company, company.toUpperCase(), company.toLowerCase(), company.replace(/^ticker:/i, '')];
  for (const key of keys) {
    const value = metadata[key];
    if (value) return value;
  }
  return {};
}

function buildCompanySummaries(
  filings: unknown[],
  themes: unknown[],
  observations: unknown[],
  outcomes: unknown[],
): Array<Record<string, unknown>> {
  const filingRows = filings as Array<Record<string, unknown>>;
  const themeRows = themes as Array<Record<string, unknown>>;
  const observationRows = observations as Array<Record<string, unknown>>;
  const outcomeRows = outcomes as Array<Record<string, unknown>>;
  const ciks = [...new Set(filingRows.map((f) => String(f.cik)))].sort();
  return ciks.map((cik) => {
    const companyFilings = filingRows.filter((f) => f.cik === cik);
    const companyThemes = themeRows.filter((t) => t.cik === cik);
    const companyThemeIds = new Set(companyThemes.map((t) => t.id));
    const companyObservations = observationRows.filter((o) => companyThemeIds.has(o.theme_id));
    const companyOutcomes = outcomeRows.filter((o) => companyThemeIds.has(o.theme_id));
    return {
      cik,
      ticker: companyFilings[0]?.ticker,
      company_name: companyFilings[0]?.company_name,
      filing_count: companyFilings.length,
      first_filing_at: minString(companyFilings.map((f) => stringish(f.filed_at))),
      latest_filing_at: maxString(companyFilings.map((f) => stringish(f.filed_at))),
      theme_count: companyThemes.length,
      observation_count: companyObservations.length,
      staged_outcome_count: companyOutcomes.filter((o) => o.state === 'staged').length,
      top_themes: companyThemes
        .map((theme) => {
          const themeObservations = companyObservations.filter((o) => o.theme_id === theme.id);
          return {
            theme_key: theme.theme_key,
            title: theme.title,
            assumption_id: theme.assumption_id,
            observation_count: themeObservations.length,
            first_seen_at: theme.first_seen_at,
            latest_seen_at: theme.latest_seen_at,
          };
        })
        .sort((a, b) => Number(b.observation_count) - Number(a.observation_count) || String(a.title).localeCompare(String(b.title)))
        .slice(0, 8),
    };
  });
}

function attachCompanyMetadata(
  summaries: Array<Record<string, unknown>>,
  members: unknown[],
): Array<Record<string, unknown>> {
  const memberRows = members as CompanyRunMemberRow[];
  const byCompany = new Map(memberRows.map((row) => [row.company.toUpperCase(), row]));
  return summaries.map((summary) => {
    const ticker = stringish(summary.ticker).toUpperCase();
    const member = byCompany.get(ticker);
    return {
      ...summary,
      sector: member?.sector ?? 'Unclassified',
      display_name: member?.display_name ?? summary.company_name ?? summary.ticker,
      source_rank: member?.source_rank ?? null,
      source_weight: member?.source_weight ?? null,
      source: member?.source ?? null,
      member_status: member?.status ?? null,
    };
  });
}

function buildSectorMatrix(
  summaries: Array<Record<string, unknown>>,
  themes: unknown[],
  observations: unknown[],
  outcomes: unknown[],
  members: unknown[],
): Array<Record<string, unknown>> {
  const themeRows = themes as Array<Record<string, unknown>>;
  const observationRows = observations as Array<Record<string, unknown>>;
  const outcomeRows = outcomes as Array<Record<string, unknown>>;
  const memberRows = members as CompanyRunMemberRow[];
  const sectorByTicker = new Map<string, string>();
  for (const member of memberRows) {
    sectorByTicker.set(member.company.toUpperCase(), member.sector ?? 'Unclassified');
  }
  for (const summary of summaries) {
    sectorByTicker.set(stringish(summary.ticker).toUpperCase(), stringish(summary.sector) || 'Unclassified');
  }

  const bySector = new Map<string, {
    sector: string;
    companies: Set<string>;
    themes: Set<string>;
    observation_count: number;
    staged_outcome_count: number;
    themeCounts: Map<string, number>;
  }>();
  for (const member of memberRows) {
    const sector = member.sector ?? 'Unclassified';
    const current = bySector.get(sector) ?? emptySector(sector);
    current.companies.add(member.company);
    bySector.set(sector, current);
  }
  for (const theme of themeRows) {
    const ticker = stringish(theme.ticker).toUpperCase();
    const sector = sectorByTicker.get(ticker) ?? 'Unclassified';
    const current = bySector.get(sector) ?? emptySector(sector);
    current.companies.add(ticker || stringish(theme.cik));
    current.themes.add(stringish(theme.theme_key) || 'unknown');
    const themeObservations = observationRows.filter((o) => o.theme_id === theme.id);
    current.observation_count += themeObservations.length;
    const label = stringish(theme.title) || stringish(theme.theme_key) || 'unknown';
    current.themeCounts.set(label, (current.themeCounts.get(label) ?? 0) + themeObservations.length);
    current.staged_outcome_count += outcomeRows.filter((o) => o.theme_id === theme.id && o.state === 'staged').length;
    bySector.set(sector, current);
  }
  return [...bySector.values()]
    .map((row) => ({
      sector: row.sector,
      companies: [...row.companies].sort(),
      company_count: row.companies.size,
      theme_count: row.themes.size,
      observation_count: row.observation_count,
      staged_outcome_count: row.staged_outcome_count,
      top_themes: [...row.themeCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([theme]) => theme),
    }))
    .sort((a, b) => String(a.sector).localeCompare(String(b.sector)));
}

function buildCrossSectorPatterns(
  themes: unknown[],
  observations: unknown[],
  outcomes: unknown[],
  members: unknown[],
): Array<Record<string, unknown>> {
  const themeRows = themes as Array<Record<string, unknown>>;
  const observationRows = observations as Array<Record<string, unknown>>;
  const outcomeRows = outcomes as Array<Record<string, unknown>>;
  const memberRows = members as CompanyRunMemberRow[];
  const sectorByTicker = new Map(memberRows.map((member) => [member.company.toUpperCase(), member.sector ?? 'Unclassified']));
  const themeById = new Map(themeRows.map((theme) => [String(theme.id), theme]));
  const groups = new Map<string, {
    pattern_key: string;
    theme_key: string;
    theme_title: string;
    mechanism_key: string;
    mechanism_title: string;
    sectors: Set<string>;
    companies: Set<string>;
    observation_count: number;
    realized_candidate_count: number;
    examples: Array<Record<string, unknown>>;
  }>();

  for (const observation of observationRows) {
    const theme = themeById.get(String(observation.theme_id));
    if (!theme) continue;
    const themeKey = stringish(theme.theme_key) || 'unknown-theme';
    const mechanismKey = stringish(theme.mechanism_key) || mechanismKeyFromExcerpt(stringish(observation.excerpt));
    const key = `${themeKey}:${mechanismKey}`;
    const ticker = stringish(theme.ticker).toUpperCase();
    const sector = sectorByTicker.get(ticker) ?? 'Unclassified';
    const current = groups.get(key) ?? {
      pattern_key: key,
      theme_key: themeKey,
      theme_title: stringish(theme.title) || themeKey,
      mechanism_key: mechanismKey,
      mechanism_title: stringish(theme.mechanism_title) || mechanismTitleFromKey(mechanismKey),
      sectors: new Set<string>(),
      companies: new Set<string>(),
      observation_count: 0,
      realized_candidate_count: 0,
      examples: [],
    };
    current.sectors.add(sector);
    current.companies.add(ticker || stringish(theme.cik) || 'unknown');
    current.observation_count++;
    if (current.examples.length < 6) {
      current.examples.push({
        company: ticker || stringish(theme.cik) || 'unknown',
        sector,
        observed_at: observation.observed_at,
        excerpt: observation.excerpt,
      });
    }
    groups.set(key, current);
  }

  for (const outcome of outcomeRows.filter((row) => row.state === 'staged' || row.state === 'applied')) {
    const theme = themeById.get(String(outcome.theme_id));
    if (!theme) continue;
    const themeKey = stringish(theme.theme_key) || 'unknown-theme';
    const mechanismKey = stringish(theme.mechanism_key) || mechanismKeyFromExcerpt(stringish(outcome.excerpt));
    const key = `${themeKey}:${mechanismKey}`;
    const current = groups.get(key);
    if (current) current.realized_candidate_count++;
  }

  return [...groups.values()]
    .filter((group) => group.sectors.size > 1 && group.mechanism_key !== 'generic-risk-disclosure')
    .map((group) => ({
      pattern_key: group.pattern_key,
      theme_key: group.theme_key,
      theme_title: group.theme_title,
      mechanism_key: group.mechanism_key,
      mechanism_title: group.mechanism_title,
      sectors: [...group.sectors].sort(),
      companies: [...group.companies].sort(),
      observation_count: group.observation_count,
      realized_candidate_count: group.realized_candidate_count,
      signal: crossSectorSignal(group.sectors.size, group.realized_candidate_count),
      learning: crossSectorLearning(group.theme_title, group.mechanism_title, group.sectors.size, group.realized_candidate_count),
      examples: group.examples,
    }))
    .sort((a, b) =>
      Number(b.realized_candidate_count) - Number(a.realized_candidate_count) ||
      (b.sectors as string[]).length - (a.sectors as string[]).length ||
      Number(b.observation_count) - Number(a.observation_count) ||
      String(a.theme_title).localeCompare(String(b.theme_title)),
    );
}

function mechanismKeyFromExcerpt(excerpt: string): string {
  const lower = excerpt.toLowerCase();
  if (/(export control|export license|sanction|trade restriction)/.test(lower)) return 'export-controls-sanctions';
  if (/(single supplier|sole supplier|foundry|fab|contract manufacturer|assembly)/.test(lower)) return 'single-supplier-manufacturing';
  if (/(commodity|raw material|input cost|fuel cost|inflationary pressure)/.test(lower)) return 'commodity-input-cost';
  if (/(consumer demand|customer demand|end market|unit sales|sales volume)/.test(lower)) return 'consumer-demand-shock';
  if (/(investigation|litigation|lawsuit|antitrust|fine|penalty)/.test(lower)) return 'regulatory-investigation-litigation';
  if (/(data breach|security incident|ransomware|outage|unauthorized access)/.test(lower)) return 'data-breach-outage';
  if (/(capacity|capital expenditure|capex|operating expense|data center|inventory charge)/.test(lower)) return 'capacity-investment-opex';
  if (/(interest rate|credit market|liquidity|debt|financing|capital market)/.test(lower)) return 'interest-credit-liquidity';
  if (/(china|taiwan|russia|ukraine|middle east|foreign|geographic)/.test(lower)) return 'geographic-concentration';
  if (/(major customer|customer concentration|platform|app store|channel partner|oem)/.test(lower)) return 'platform-customer-concentration';
  return 'generic-risk-disclosure';
}

function mechanismTitleFromKey(key: string): string {
  return key.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

function crossSectorSignal(sectorCount: number, realizedCandidates: number): string {
  if (realizedCandidates > 0) return 'shared mechanism with realized-risk evidence';
  if (sectorCount >= 4) return 'broad shared mechanism to monitor';
  return 'emerging cross-sector mechanism';
}

function crossSectorLearning(
  theme: string,
  mechanism: string,
  sectorCount: number,
  realizedCandidates: number,
): string {
  if (realizedCandidates > 0) {
    return `${theme} is not just recurring boilerplate: the ${mechanism.toLowerCase()} mechanism has already produced realized-risk candidates in this run, so related open bets in other sectors deserve review.`;
  }
  return `${theme} appears through the ${mechanism.toLowerCase()} mechanism across ${sectorCount} sectors. Treat this as a watchpoint until later filings show whether it remains disclosure-only or turns into realized outcomes.`;
}

function emptySector(sector: string): {
  sector: string;
  companies: Set<string>;
  themes: Set<string>;
  observation_count: number;
  staged_outcome_count: number;
  themeCounts: Map<string, number>;
} {
  return {
    sector,
    companies: new Set<string>(),
    themes: new Set<string>(),
    observation_count: 0,
    staged_outcome_count: 0,
    themeCounts: new Map<string, number>(),
  };
}

function buildLifecycleSummary(
  filings: unknown[],
  themes: unknown[],
  observations: unknown[],
  outcomes: unknown[],
): Record<string, unknown> {
  const themeRows = themes as Array<Record<string, unknown>>;
  const outcomeRows = outcomes as Array<Record<string, unknown>>;
  const companiesByTheme = new Map<string, Set<string>>();
  for (const theme of themeRows) {
    const key = stringish(theme.theme_key) || 'unknown';
    const companies = companiesByTheme.get(key) ?? new Set<string>();
    companies.add(stringish(theme.ticker) || stringish(theme.cik) || 'unknown');
    companiesByTheme.set(key, companies);
  }
  return {
    filings_scanned: filings.length,
    themes_tracked: themes.length,
    observations: observations.length,
    cross_company_themes: [...companiesByTheme.values()].filter((companies) => companies.size > 1).length,
    staged_outcomes: outcomeRows.filter((o) => o.state === 'staged').length,
    applied_outcomes: outcomeRows.filter((o) => o.state === 'applied').length,
  };
}

function buildObservationExamples(
  themes: unknown[],
  observations: unknown[],
  filings: unknown[],
): Array<Record<string, unknown>> {
  const themeRows = themes as Array<Record<string, unknown>>;
  const observationRows = observations as Array<Record<string, unknown>>;
  const filingRows = filings as Array<Record<string, unknown>>;
  const filingById = new Map(filingRows.map((filing) => [String(filing.id), filing]));
  const sortedThemes = themeRows
    .map((theme) => ({
      theme,
      count: observationRows.filter((o) => o.theme_id === theme.id).length,
    }))
    .sort((a, b) => b.count - a.count || String(a.theme.title).localeCompare(String(b.theme.title)));
  const picked = new Set<string>();
  const examples: Array<Record<string, unknown>> = [];
  for (const { theme } of sortedThemes) {
    const company = stringish(theme.ticker) || stringish(theme.cik) || 'unknown';
    if (picked.has(company) && examples.length >= 3) continue;
    const observation = observationRows.find((o) => o.theme_id === theme.id);
    if (!observation) continue;
    const filing = filingById.get(String(observation.filing_id));
    examples.push({
      company,
      theme_key: theme.theme_key,
      theme_title: theme.title,
      observed_at: observation.observed_at,
      section_key: observation.section_key,
      source_uri: observation.source_uri,
      filing_url: filing?.filing_url,
      excerpt: observation.excerpt,
    });
    picked.add(company);
    if (examples.length >= 6) break;
  }
  return examples;
}

function buildOutcomeGroups(
  outcomes: unknown[],
  themes: unknown[],
  filings: unknown[],
): Array<Record<string, unknown>> {
  const outcomeRows = outcomes as Array<Record<string, unknown>>;
  const themeRows = themes as Array<Record<string, unknown>>;
  const filingRows = filings as Array<Record<string, unknown>>;
  const themeById = new Map(themeRows.map((theme) => [String(theme.id), theme]));
  const filingById = new Map(filingRows.map((filing) => [String(filing.id), filing]));
  const groups = new Map<string, {
    company: string;
    fingerprint: string;
    candidate_ids: string[];
    source_uris: string[];
    themes: Set<string>;
    theme_keys: Set<string>;
    filing_dates: string[];
    representative_excerpt: string;
    max_confidence: number;
  }>();
  for (const outcome of outcomeRows.filter((o) => o.state === 'staged')) {
    const theme = themeById.get(String(outcome.theme_id));
    const filing = filingById.get(String(outcome.filing_id));
    const company = stringish(theme?.ticker) || stringish(filing?.ticker) || stringish(theme?.cik) || stringish(filing?.cik) || 'unknown';
    const excerpt = stringish(outcome.excerpt);
    const fingerprint = outcomeFingerprint(excerpt);
    const key = `${company}:${fingerprint}`;
    const current = groups.get(key) ?? {
      company,
      fingerprint,
      candidate_ids: [],
      source_uris: [],
      themes: new Set<string>(),
      theme_keys: new Set<string>(),
      filing_dates: [],
      representative_excerpt: excerpt,
      max_confidence: 0,
    };
    current.candidate_ids.push(String(outcome.id));
    current.source_uris.push(stringish(outcome.source_uri));
    current.themes.add(stringish(theme?.title) || stringish(outcome.theme_id) || 'unknown');
    current.theme_keys.add(stringish(theme?.theme_key) || 'unknown');
    const filedAt = stringish(filing?.filed_at);
    if (filedAt) current.filing_dates.push(filedAt);
    current.max_confidence = Math.max(current.max_confidence, Number(outcome.confidence) || 0);
    if (!current.representative_excerpt || excerpt.length > current.representative_excerpt.length) {
      current.representative_excerpt = excerpt;
    }
    groups.set(key, current);
  }
  const sorted = [...groups.values()]
    .map((group) => ({
      company: group.company,
      fingerprint: group.fingerprint,
      candidate_count: group.candidate_ids.length,
      candidate_ids: group.candidate_ids,
      source_uris: [...new Set(group.source_uris.filter(Boolean))],
      themes: [...group.themes].sort(),
      theme_keys: [...group.theme_keys].sort(),
      first_seen_at: minString(group.filing_dates),
      latest_seen_at: maxString(group.filing_dates),
      max_confidence: group.max_confidence,
      representative_excerpt: group.representative_excerpt,
    }))
    .sort((a, b) => Number(b.candidate_count) - Number(a.candidate_count) || String(a.company).localeCompare(String(b.company)) || String(a.first_seen_at).localeCompare(String(b.first_seen_at)));
  return sorted.map((group, index) => ({
    ...group,
    id: `og-${String(index + 1).padStart(3, '0')}`,
  }));
}

function outcomeFingerprint(excerpt: string): string {
  const normalized = excerpt
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\$?\d+(?:\.\d+)?%?/g, '#')
    .replace(/\b(?:fiscal|calendar)?\s?20\d{2}\b/g, 'year')
    .replace(/[^a-z0-9#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.slice(0, 120) || 'unknown';
}

function buildThemeMatrix(themes: unknown[], observations: unknown[]): Array<Record<string, unknown>> {
  const themeRows = themes as Array<Record<string, unknown>>;
  const observationRows = observations as Array<Record<string, unknown>>;
  const byKey = new Map<string, {
    theme_key: string;
    title: string;
    companies: Set<string>;
    observation_count: number;
    latest_seen_at: string | null;
  }>();
  for (const theme of themeRows) {
    const key = stringish(theme.theme_key) || 'unknown';
    const current = byKey.get(key) ?? {
      theme_key: key,
      title: stringish(theme.title) || key,
      companies: new Set<string>(),
      observation_count: 0,
      latest_seen_at: null,
    };
    current.companies.add(stringish(theme.ticker) || stringish(theme.cik) || 'unknown');
    const themeObservations = observationRows.filter((o) => o.theme_id === theme.id);
    current.observation_count += themeObservations.length;
    current.latest_seen_at = maxString([current.latest_seen_at, ...themeObservations.map((o) => stringish(o.observed_at))]);
    byKey.set(key, current);
  }
  return [...byKey.values()]
    .map((row) => ({
      theme_key: row.theme_key,
      title: row.title,
      companies: [...row.companies].sort(),
      observation_count: row.observation_count,
      latest_seen_at: row.latest_seen_at,
    }))
    .sort((a, b) => b.companies.length - a.companies.length || Number(b.observation_count) - Number(a.observation_count) || String(a.title).localeCompare(String(b.title)));
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
       (id, run_id, cik, ticker, theme_key, title, mechanism_key, mechanism_title, first_seen_at, latest_seen_at, assumption_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    runId,
    stringField(sec, 'cik') ?? '',
    stringField(sec, 'ticker'),
    stringField(fields, 'theme_key') ?? '',
    stringField(fields, 'theme_title') ?? row.title,
    stringField(fields, 'mechanism_key'),
    stringField(fields, 'mechanism_title'),
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

function stringish(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function minString(values: Array<string | null>): string | null {
  const filtered = values.filter((v): v is string => Boolean(v));
  return filtered.length > 0 ? filtered.sort()[0] : null;
}

function maxString(values: Array<string | null>): string | null {
  const filtered = values.filter((v): v is string => Boolean(v));
  return filtered.length > 0 ? filtered.sort()[filtered.length - 1] : null;
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
