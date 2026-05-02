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
import {
  buildSecCompanyLedgerReport,
  renderSecCompanyLedgerMarkdown,
  type SecLedgerReport,
} from './sec-ledger-report.js';
import { writeNote } from './write/index.js';

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

export async function writeCompanyReports(
  db: IdeasDatabase,
  vaultPath: string,
  runId: string,
): Promise<{ markdownPath: string; jsonPath: string }> {
  const data = buildReportData(db, runId);
  const dir = path.join(vaultPath, 'reports');
  await fsp.mkdir(dir, { recursive: true });
  const base = `company-tracker-${runId.toLowerCase()}`;
  const markdownPath = `reports/${base}.md`;
  const jsonPath = `reports/${base}.json`;
  const markdownResult = await writeNote(
    vaultPath,
    markdownPath,
    buildCompanyReportFrontmatter(data),
    renderCompanyMarkdown(data),
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 8 },
  );
  const actualMarkdownPath = markdownResult.vault_path;
  await fsp.writeFile(path.join(vaultPath, jsonPath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  db.prepare(
    `UPDATE ideas_company_runs
        SET report_md_path = ?, report_json_path = ?
      WHERE id = ?`,
  ).run(actualMarkdownPath, jsonPath, runId);
  return { markdownPath: actualMarkdownPath, jsonPath };
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
  const companySummaries = buildCompanySummaries(filings, themes, observations, outcomes);
  const themeMatrix = buildThemeMatrix(themes, observations);
  const lifecycleSummary = buildLifecycleSummary(filings, themes, observations, outcomes);
  const observationExamples = buildObservationExamples(themes, observations, filings);
  const outcomeGroups = buildOutcomeGroups(outcomes, themes, filings);
  const secLedgerReport = buildSecCompanyLedgerReport(db, { run_id: runId });
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
    company_summaries: companySummaries,
    theme_matrix: themeMatrix,
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
