import type { IdeasDatabase } from './db.js';
import type { OutcomeMemo } from './outcome-memos.js';

export interface SecLedgerReportOptions {
  run_id?: string;
}

export interface SecLedgerReport {
  report_kind: 'sec_company';
  run: Record<string, unknown> | null;
  as_of_date: string | null;
  executive_summary: {
    companies: string[];
    filings_scanned: number;
    tracked_assumptions: number;
    observations: number;
    current_bets: number;
    review_events: number;
    staged_candidates: number;
    accepted_failures: number;
    accepted_validations: number;
    accepted_lessons: number;
    missing_lessons: number;
    triage_completion: {
      applied_candidates: number;
      total_candidates: number;
      percent: number;
    };
  };
  current_bets: SecCurrentBet[];
  review_queue: SecReviewEvent[];
  accepted_verdicts: SecAcceptedVerdict[];
  lessons_captured: SecLessonCaptured[];
  needs_review: SecNeedsReviewIdea[];
  markdown: string;
}

export interface SecCurrentBet {
  company: string;
  theme: string;
  theme_key: string;
  assumption_id: string;
  assumption_status: string;
  observation_count: number;
  staged_candidate_count: number;
  review_pressure: number;
  first_seen_at: string;
  latest_seen_at: string;
  freshness: 'fresh' | 'cooling' | 'stale';
}

export interface SecReviewEvent {
  id: string;
  company: string;
  candidate_count: number;
  candidate_ids: string[];
  assumption_ids: string[];
  themes: string[];
  first_seen_at: string | null;
  latest_seen_at: string | null;
  max_confidence: number;
  representative_source_uri: string | null;
  representative_excerpt: string;
  status: 'needs_human_review';
  apply_command: string;
}

export interface SecAcceptedVerdict {
  candidate_id: string;
  outcome_id: string;
  verdict: 'refuted' | 'validated';
  assumption_id: string;
  assumption_text: string;
  company: string;
  theme: string;
  source_uri: string;
  landed_at: number | null;
  landed_at_iso: string | null;
  memo: OutcomeMemo | null;
  memo_written_at: number | null;
  lesson_status: 'memo_recorded' | 'needs_memo';
  memo_command: string;
}

export interface SecLessonCaptured {
  lesson: string;
  verdict_count: number;
  companies: string[];
  themes: string[];
  assumption_ids: string[];
  outcome_ids: string[];
  learned_at: string | null;
  latest_landed_at: string | null;
  representative: {
    company: string;
    theme: string;
    outcome_id: string;
    root_cause: string;
    what_we_thought: string;
    what_actually_happened: string;
  };
}

export interface SecNeedsReviewIdea {
  id: string;
  title: string;
  state: string;
  vault_path: string;
}

interface CompanyRunRow {
  id: string;
  companies_json: string;
  years: number;
  forms_json: string;
  started_at: number;
  completed_at: number | null;
  status: string;
  report_md_path: string | null;
  report_json_path: string | null;
}

interface FilingRow {
  id: string;
  run_id: string;
  cik: string;
  ticker: string | null;
  company_name: string | null;
  accession_no: string;
  form: string;
  filed_at: string;
  period: string | null;
  filing_url: string;
}

interface ThemeRow {
  id: string;
  run_id: string;
  cik: string;
  ticker: string | null;
  theme_key: string;
  title: string;
  first_seen_at: string;
  latest_seen_at: string;
  assumption_id: string | null;
  assumption_status: string | null;
  assumption_text: string | null;
}

interface ObservationRow {
  id: string;
  run_id: string;
  theme_id: string;
  filing_id: string;
  section_key: string;
  source_uri: string;
  excerpt_hash: string;
  excerpt: string;
  observed_at: string;
}

interface OutcomeCandidateRow {
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

interface VerdictRow {
  candidate_id: string;
  outcome_id: string;
  verdict: string;
  assumption_id: string;
  assumption_text: string | null;
  landed_at: number | null;
  source_uri: string;
  theme_title: string;
  ticker: string | null;
  cik: string;
  memo_json: string | null;
  memo_written_at: number | null;
}

export function buildSecCompanyLedgerReport(
  db: IdeasDatabase,
  options: SecLedgerReportOptions = {},
): SecLedgerReport {
  const run = readRun(db, options.run_id);
  if (!run) return emptySecCompanyReport(options.run_id);

  const filings = db.prepare(`SELECT * FROM ideas_company_filings WHERE run_id = ? ORDER BY cik, filed_at`)
    .all(run.id) as FilingRow[];
  const themes = db.prepare(
    `SELECT t.*, a.status AS assumption_status, a.text AS assumption_text
       FROM ideas_company_themes t
       LEFT JOIN ideas_assumptions a ON a.id = t.assumption_id
      WHERE t.run_id = ?
      ORDER BY t.cik, t.theme_key`,
  ).all(run.id) as ThemeRow[];
  const observations = db.prepare(`SELECT * FROM ideas_company_observations WHERE run_id = ? ORDER BY observed_at`)
    .all(run.id) as ObservationRow[];
  const candidates = db.prepare(`SELECT * FROM ideas_company_outcome_candidates WHERE run_id = ? ORDER BY confidence DESC`)
    .all(run.id) as OutcomeCandidateRow[];
  const asOfDate = maxString(filings.map((f) => f.filed_at));

  const currentBets = buildCurrentBets(themes, observations, candidates, asOfDate);
  const reviewQueue = buildReviewQueue(run.id, candidates, themes, filings);
  const acceptedVerdicts = buildAcceptedVerdicts(db, run.id);
  const lessonsCaptured = buildLessonsCaptured(acceptedVerdicts);
  const needsReview = buildNeedsReview(db);
  const companies = uniqueSorted(filings.map((f) => f.ticker ?? f.cik));
  const totalCandidates = candidates.length;
  const appliedCandidates = candidates.filter((c) => c.state === 'applied').length;
  const report: Omit<SecLedgerReport, 'markdown'> = {
    report_kind: 'sec_company',
    run: run as unknown as Record<string, unknown>,
    as_of_date: asOfDate,
    executive_summary: {
      companies,
      filings_scanned: filings.length,
      tracked_assumptions: themes.length,
      observations: observations.length,
      current_bets: currentBets.filter((b) => b.freshness !== 'stale').length,
      review_events: reviewQueue.length,
      staged_candidates: candidates.filter((c) => c.state === 'staged').length,
      accepted_failures: acceptedVerdicts.filter((v) => v.verdict === 'refuted').length,
      accepted_validations: acceptedVerdicts.filter((v) => v.verdict === 'validated').length,
      accepted_lessons: acceptedVerdicts.filter((v) => v.memo !== null).length,
      missing_lessons: acceptedVerdicts.filter((v) => v.verdict === 'refuted' && v.memo === null).length,
      triage_completion: {
        applied_candidates: appliedCandidates,
        total_candidates: totalCandidates,
        percent: totalCandidates === 0 ? 100 : Math.round((appliedCandidates / totalCandidates) * 100),
      },
    },
    current_bets: currentBets,
    review_queue: reviewQueue,
    accepted_verdicts: acceptedVerdicts,
    lessons_captured: lessonsCaptured,
    needs_review: needsReview,
  };
  return {
    ...report,
    markdown: renderSecCompanyLedgerMarkdown(report),
  };
}

export function renderSecCompanyLedgerMarkdown(
  report: Omit<SecLedgerReport, 'markdown'>,
): string {
  const lines: string[] = [];
  lines.push('## SEC Company Lifecycle Report');
  lines.push('');
  if (!report.run || (report.run as { missing?: boolean }).missing === true) {
    lines.push((report.run as { id?: string } | null)?.id
      ? `SEC company tracker run ${(report.run as { id: string }).id} was not found.`
      : 'No SEC company tracker run exists yet.');
    lines.push('');
    lines.push('Run `company.track({ companies: ["AAPL", "MSFT", "NVDA"], years: 10, confirm: true })` to create the first ledger.');
    return `${lines.join('\n')}\n`;
  }
  const s = report.executive_summary;
  lines.push('This report tracks the loop: current bets -> evidence over time -> review queue -> accepted outcomes -> lessons.');
  lines.push('');
  lines.push('## Lifecycle Snapshot');
  lines.push('');
  lines.push(`- Corpus: ${s.companies.join(', ')} across ${s.filings_scanned} filing(s), ${s.tracked_assumptions} tracked assumption(s), and ${s.observations} dated observation(s).`);
  lines.push(`- Current bets: ${s.current_bets} open company/theme assumption(s) still being carried.`);
  lines.push(`- Review queue: ${s.review_events} event(s), ${s.staged_candidates} staged candidate(s) awaiting human judgment.`);
  lines.push(`- Accepted outcomes: ${s.accepted_failures} failure(s), ${s.accepted_validations} validation(s).`);
  lines.push(`- Lessons: ${s.accepted_lessons} recorded memo(s), ${s.missing_lessons} missing memo(s).`);
  lines.push(`- Triage completion: ${s.triage_completion.applied_candidates}/${s.triage_completion.total_candidates} candidate(s) applied (${s.triage_completion.percent}%).`);
  lines.push('');
  lines.push('## Operator Next Step');
  lines.push('');
  lines.push(operatorNextStep(report));
  lines.push('');
  lines.push('## Lifecycle Status');
  lines.push('');
  if (s.accepted_failures === 0 && s.accepted_validations === 0 && s.staged_candidates > 0) {
    lines.push(`Visibility only so far: the system has evidence and ${s.review_events} review event(s), but no pass/fail outcome enters the ledger until a human applies candidates.`);
  } else if (s.missing_lessons > 0) {
    lines.push(`${s.accepted_failures} failure(s) have been accepted, but ${s.missing_lessons} still need lesson memos before the knowledge loop is closed.`);
  } else if (s.accepted_failures > 0 || s.accepted_validations > 0) {
    lines.push(`${s.accepted_failures + s.accepted_validations} accepted verdict(s) are in the ledger, and all accepted failures have durable lesson memos.`);
  } else {
    lines.push('No accepted verdicts or staged outcomes are currently present for this run.');
  }
  lines.push('');
  lines.push('## Lessons Captured');
  lines.push('');
  if (report.lessons_captured.length === 0) {
    lines.push('No lesson memos recorded yet.');
  } else {
    for (const lesson of report.lessons_captured) {
      lines.push(`- **${lesson.lesson}**`);
      lines.push(`  - Evidence: ${lesson.verdict_count} accepted failure verdict(s) across ${lesson.companies.join(', ')} / ${lesson.themes.join(', ')}`);
      lines.push(`  - Representative context: ${lesson.representative.what_actually_happened}`);
      lines.push(`  - Outcomes: ${lesson.outcome_ids.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('## Current Bets');
  lines.push('');
  lines.push('Open company/theme assumptions. Staged evidence raises review pressure; it does not count as failure.');
  lines.push('');
  if (report.current_bets.length === 0) {
    lines.push('No open SEC company assumptions remain in this run.');
  } else {
    for (const bet of report.current_bets.slice(0, 12)) {
      lines.push(`- **${bet.company} / ${bet.theme}** — ${bet.freshness}, ${bet.observation_count} observation(s), review pressure ${bet.review_pressure}, latest ${bet.latest_seen_at}`);
      lines.push(`  - Assumption: ${bet.assumption_id}`);
    }
  }
  lines.push('');
  lines.push('## Outcome Review Queue');
  lines.push('');
  if (report.review_queue.length === 0) {
    lines.push('No staged SEC outcome events need review.');
  } else {
    for (const event of report.review_queue) {
      lines.push(`- **${event.company}** ${event.first_seen_at ?? 'n/a'}${event.latest_seen_at && event.latest_seen_at !== event.first_seen_at ? ` to ${event.latest_seen_at}` : ''}: ${event.candidate_count} candidate(s), ${event.themes.join(', ')}`);
      lines.push(`  - Candidate IDs: ${event.candidate_ids.join(', ')}`);
      lines.push(`  - Apply after review: \`${event.apply_command}\``);
      lines.push(`  - Source: ${event.representative_source_uri ?? 'n/a'}`);
      lines.push(`  - ${event.representative_excerpt.replace(/\s+/g, ' ').slice(0, 300)}`);
    }
  }
  lines.push('');
  lines.push('## Accepted Pass/Fail Verdicts');
  lines.push('');
  if (report.accepted_verdicts.length === 0) {
    lines.push('No accepted verdicts yet. Staged review events above are not pass/fail until applied.');
  } else {
    for (const verdict of report.accepted_verdicts) {
      const label = verdict.verdict === 'refuted' ? 'FAIL' : 'PASS';
      lines.push(`- **${label}** ${verdict.company} / ${verdict.theme}: ${verdict.assumption_id} via ${verdict.outcome_id}`);
      lines.push(`  - ${verdict.assumption_text}`);
      if (verdict.memo) {
        lines.push(`  - Lesson: ${verdict.memo.lesson}`);
      } else if (verdict.verdict === 'refuted') {
        lines.push(`  - Needs lesson memo: \`${verdict.memo_command}\``);
      }
    }
  }
  lines.push('');
  lines.push('## Dependent Ideas Needing Review');
  lines.push('');
  if (report.needs_review.length === 0) {
    lines.push('No dependent ideas are currently flagged by accepted refutations.');
  } else {
    for (const idea of report.needs_review) {
      lines.push(`- **${idea.title}** (${idea.state}) — ${idea.id}, ${idea.vault_path}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function operatorNextStep(report: Omit<SecLedgerReport, 'markdown'>): string {
  const s = report.executive_summary;
  const missingMemo = report.accepted_verdicts.find((verdict) => verdict.verdict === 'refuted' && verdict.memo === null);
  if (missingMemo) {
    return `Write the missing lesson memo for ${missingMemo.company} / ${missingMemo.theme}: \`${missingMemo.memo_command}\``;
  }
  const reviewEvent = report.review_queue[0];
  if (reviewEvent) {
    return `Review the highest-pressure event and apply only if the evidence really refutes the bet: \`${reviewEvent.apply_command}\``;
  }
  if (s.accepted_failures > 0 && s.missing_lessons === 0) {
    return 'No staged SEC outcomes remain. Use the Lessons Captured section when reviewing related decisions or future company bets.';
  }
  if (s.current_bets > 0) {
    return 'No staged SEC outcomes need review. Keep tracking future filings so current bets accumulate new evidence.';
  }
  return 'No SEC company tracker data is awaiting action.';
}

function readRun(db: IdeasDatabase, runId?: string): CompanyRunRow | null {
  const row = runId
    ? db.prepare(`SELECT * FROM ideas_company_runs WHERE id = ?`).get(runId)
    : db.prepare(`SELECT * FROM ideas_company_runs ORDER BY started_at DESC LIMIT 1`).get();
  return (row as CompanyRunRow | undefined) ?? null;
}

function emptySecCompanyReport(requestedRunId?: string): SecLedgerReport {
  const report: Omit<SecLedgerReport, 'markdown'> = {
    report_kind: 'sec_company',
    run: requestedRunId ? { id: requestedRunId, missing: true } : null,
    as_of_date: null,
    executive_summary: {
      companies: [],
      filings_scanned: 0,
      tracked_assumptions: 0,
      observations: 0,
      current_bets: 0,
      review_events: 0,
      staged_candidates: 0,
      accepted_failures: 0,
      accepted_validations: 0,
      accepted_lessons: 0,
      missing_lessons: 0,
      triage_completion: { applied_candidates: 0, total_candidates: 0, percent: 100 },
    },
    current_bets: [],
    review_queue: [],
    accepted_verdicts: [],
    lessons_captured: [],
    needs_review: [],
  };
  return { ...report, markdown: renderSecCompanyLedgerMarkdown(report) };
}

function buildCurrentBets(
  themes: ThemeRow[],
  observations: ObservationRow[],
  candidates: OutcomeCandidateRow[],
  asOfDate: string | null,
): SecCurrentBet[] {
  const observationsByTheme = countBy(observations.map((o) => o.theme_id));
  const stagedByAssumption = countBy(
    candidates
      .filter((c) => c.state === 'staged' && c.assumption_id)
      .map((c) => String(c.assumption_id)),
  );
  return themes
    .filter((theme) => theme.assumption_id && (theme.assumption_status ?? 'open') === 'open')
    .map((theme) => {
      const stagedCandidateCount = stagedByAssumption.get(String(theme.assumption_id)) ?? 0;
      return {
        company: theme.ticker ?? theme.cik,
        theme: theme.title,
        theme_key: theme.theme_key,
        assumption_id: String(theme.assumption_id),
        assumption_status: theme.assumption_status ?? 'open',
        observation_count: observationsByTheme.get(theme.id) ?? 0,
        staged_candidate_count: stagedCandidateCount,
        review_pressure: stagedCandidateCount,
        first_seen_at: theme.first_seen_at,
        latest_seen_at: theme.latest_seen_at,
        freshness: freshnessFor(theme.latest_seen_at, asOfDate),
      };
    })
    .sort((a, b) =>
      b.review_pressure - a.review_pressure ||
      freshnessRank(a.freshness) - freshnessRank(b.freshness) ||
      b.latest_seen_at.localeCompare(a.latest_seen_at) ||
      b.observation_count - a.observation_count ||
      a.company.localeCompare(b.company) ||
      a.theme.localeCompare(b.theme),
    );
}

function buildReviewQueue(
  runId: string,
  candidates: OutcomeCandidateRow[],
  themes: ThemeRow[],
  filings: FilingRow[],
): SecReviewEvent[] {
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const filingById = new Map(filings.map((filing) => [filing.id, filing]));
  const groups = new Map<string, {
    company: string;
    candidate_ids: string[];
    assumption_ids: Set<string>;
    themes: Set<string>;
    filing_dates: string[];
    source_uris: string[];
    representative_excerpt: string;
    max_confidence: number;
  }>();
  for (const candidate of candidates.filter((c) => c.state === 'staged')) {
    const theme = themeById.get(candidate.theme_id);
    const filing = filingById.get(candidate.filing_id);
    const company = theme?.ticker ?? filing?.ticker ?? theme?.cik ?? filing?.cik ?? 'unknown';
    const key = `${company}:${outcomeFingerprint(candidate.excerpt)}`;
    const current = groups.get(key) ?? {
      company,
      candidate_ids: [],
      assumption_ids: new Set<string>(),
      themes: new Set<string>(),
      filing_dates: [],
      source_uris: [],
      representative_excerpt: candidate.excerpt,
      max_confidence: 0,
    };
    current.candidate_ids.push(candidate.id);
    if (candidate.assumption_id) current.assumption_ids.add(candidate.assumption_id);
    current.themes.add(theme?.title ?? candidate.theme_id);
    if (filing?.filed_at) current.filing_dates.push(filing.filed_at);
    current.source_uris.push(candidate.source_uri);
    current.max_confidence = Math.max(current.max_confidence, candidate.confidence);
    if (candidate.excerpt.length > current.representative_excerpt.length) {
      current.representative_excerpt = candidate.excerpt;
    }
    groups.set(key, current);
  }
  return [...groups.values()]
    .map((group) => ({
      company: group.company,
      candidate_count: group.candidate_ids.length,
      candidate_ids: group.candidate_ids,
      assumption_ids: [...group.assumption_ids].sort(),
      themes: [...group.themes].sort(),
      first_seen_at: minString(group.filing_dates),
      latest_seen_at: maxString(group.filing_dates),
      max_confidence: group.max_confidence,
      representative_source_uri: uniqueSorted(group.source_uris)[0] ?? null,
      representative_excerpt: group.representative_excerpt,
    }))
    .sort((a, b) =>
      b.candidate_count - a.candidate_count ||
      a.company.localeCompare(b.company) ||
      String(a.first_seen_at ?? '').localeCompare(String(b.first_seen_at ?? '')),
    )
    .map((group, index) => ({
      id: `og-${String(index + 1).padStart(3, '0')}`,
      ...group,
      status: 'needs_human_review' as const,
      apply_command: `company.apply_outcomes({ run_id: "${runId}", outcome_candidate_ids: ${JSON.stringify(group.candidate_ids)}, confirm: true })`,
    }));
}

function buildAcceptedVerdicts(db: IdeasDatabase, runId: string): SecAcceptedVerdict[] {
  const rows = db.prepare(
    `SELECT c.id AS candidate_id,
            c.applied_outcome_id AS outcome_id,
            v.verdict,
            v.assumption_id,
            a.text AS assumption_text,
            o.landed_at,
            c.source_uri,
            t.title AS theme_title,
            t.ticker,
            t.cik,
            m.memo_json,
            m.written_at AS memo_written_at
       FROM ideas_company_outcome_candidates c
       JOIN ideas_outcome_verdicts v ON v.outcome_id = c.applied_outcome_id
       JOIN ideas_outcomes o ON o.id = v.outcome_id
       LEFT JOIN ideas_assumptions a ON a.id = v.assumption_id
       LEFT JOIN ideas_company_themes t ON t.id = c.theme_id
       LEFT JOIN ideas_outcome_memos m ON m.outcome_id = o.id
      WHERE c.run_id = ?
        AND c.state = 'applied'
      ORDER BY o.landed_at ASC, c.id ASC`,
  ).all(runId) as VerdictRow[];
  return rows.map((row) => {
    const memo = parseMemo(row.memo_json);
    return {
      candidate_id: row.candidate_id,
      outcome_id: row.outcome_id,
      verdict: row.verdict === 'validated' ? 'validated' : 'refuted',
      assumption_id: row.assumption_id,
      assumption_text: row.assumption_text ?? '',
      company: row.ticker ?? row.cik,
      theme: row.theme_title,
      source_uri: row.source_uri,
      landed_at: row.landed_at,
      landed_at_iso: row.landed_at === null ? null : new Date(row.landed_at).toISOString(),
      memo,
      memo_written_at: row.memo_written_at,
      lesson_status: memo ? 'memo_recorded' : 'needs_memo',
      memo_command: `outcome.memo_upsert({ outcome_id: "${row.outcome_id}", memo: { root_cause: "<what broke>", what_we_thought: "<original belief>", what_actually_happened: "<observed reality>", lesson: "<durable takeaway>" } })`,
    };
  });
}

function buildLessonsCaptured(verdicts: SecAcceptedVerdict[]): SecLessonCaptured[] {
  const groups = new Map<string, {
    lesson: string;
    companies: Set<string>;
    themes: Set<string>;
    assumption_ids: Set<string>;
    outcome_ids: Set<string>;
    learned_at: string | null;
    latest_landed_at: string | null;
    representative: SecLessonCaptured['representative'];
  }>();
  for (const verdict of verdicts) {
    if (verdict.verdict !== 'refuted' || !verdict.memo) continue;
    const key = normalizeLesson(verdict.memo.lesson);
    if (!key) continue;
    const landedAt = verdict.landed_at_iso;
    const existing = groups.get(key);
    if (existing) {
      existing.companies.add(verdict.company);
      existing.themes.add(verdict.theme);
      existing.assumption_ids.add(verdict.assumption_id);
      existing.outcome_ids.add(verdict.outcome_id);
      existing.learned_at = minNullableIso(existing.learned_at, landedAt);
      existing.latest_landed_at = maxNullableIso(existing.latest_landed_at, landedAt);
      continue;
    }
    groups.set(key, {
      lesson: verdict.memo.lesson.trim(),
      companies: new Set([verdict.company]),
      themes: new Set([verdict.theme]),
      assumption_ids: new Set([verdict.assumption_id]),
      outcome_ids: new Set([verdict.outcome_id]),
      learned_at: landedAt,
      latest_landed_at: landedAt,
      representative: {
        company: verdict.company,
        theme: verdict.theme,
        outcome_id: verdict.outcome_id,
        root_cause: verdict.memo.root_cause,
        what_we_thought: verdict.memo.what_we_thought,
        what_actually_happened: verdict.memo.what_actually_happened,
      },
    });
  }
  return [...groups.values()]
    .map((group) => ({
      lesson: group.lesson,
      verdict_count: group.outcome_ids.size,
      companies: [...group.companies].sort(),
      themes: [...group.themes].sort(),
      assumption_ids: [...group.assumption_ids].sort(),
      outcome_ids: [...group.outcome_ids].sort(),
      learned_at: group.learned_at,
      latest_landed_at: group.latest_landed_at,
      representative: group.representative,
    }))
    .sort((a, b) =>
      b.verdict_count - a.verdict_count ||
      String(b.latest_landed_at ?? '').localeCompare(String(a.latest_landed_at ?? '')) ||
      a.lesson.localeCompare(b.lesson),
    );
}

function parseMemo(raw: string | null): OutcomeMemo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.root_cause === 'string' &&
      typeof parsed.what_we_thought === 'string' &&
      typeof parsed.what_actually_happened === 'string' &&
      typeof parsed.lesson === 'string'
    ) {
      return parsed as OutcomeMemo;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeLesson(lesson: string): string {
  return lesson.trim().replace(/\s+/g, ' ').toLowerCase();
}

function minNullableIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxNullableIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function buildNeedsReview(db: IdeasDatabase): SecNeedsReviewIdea[] {
  return db.prepare(
    `SELECT id, title, state, vault_path
       FROM ideas_notes
      WHERE needs_review = 1
      ORDER BY state_changed_at DESC, id ASC`,
  ).all() as SecNeedsReviewIdea[];
}

function freshnessFor(latestSeenAt: string, asOfDate: string | null): SecCurrentBet['freshness'] {
  if (!asOfDate) return 'stale';
  const latest = Date.parse(`${latestSeenAt}T00:00:00Z`);
  const asOf = Date.parse(`${asOfDate}T00:00:00Z`);
  if (!Number.isFinite(latest) || !Number.isFinite(asOf)) return 'stale';
  const days = Math.max(0, Math.floor((asOf - latest) / 86_400_000));
  if (days <= 185) return 'fresh';
  if (days <= 550) return 'cooling';
  return 'stale';
}

function freshnessRank(freshness: SecCurrentBet['freshness']): number {
  if (freshness === 'fresh') return 0;
  if (freshness === 'cooling') return 1;
  return 2;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function maxString(values: string[]): string | null {
  const kept = values.filter(Boolean).sort();
  return kept.length ? kept[kept.length - 1] : null;
}

function minString(values: string[]): string | null {
  const kept = values.filter(Boolean).sort();
  return kept.length ? kept[0] : null;
}

function outcomeFingerprint(excerpt: string): string {
  return excerpt
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\$?\d+(?:\.\d+)?%?/g, '#')
    .replace(/\b(?:fiscal|calendar)?\s?20\d{2}\b/g, 'year')
    .replace(/[^a-z0-9#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'unknown';
}
