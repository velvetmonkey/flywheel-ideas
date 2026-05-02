import type {
  SecCurrentBet,
  SecLedgerReport,
  SecLessonCaptured,
  SecReviewEvent,
} from './sec-ledger-report.js';

export interface CompanyThesisReport {
  report_kind: 'company_thesis';
  run_id: string | null;
  as_of_date: string | null;
  executive_readout: {
    companies: string[];
    filings_scanned: number;
    current_bets: number;
    review_events: number;
    staged_candidates: number;
    accepted_failures: number;
    accepted_lessons: number;
    missing_lessons: number;
    thesis_posture: 'visibility_only' | 'needs_review' | 'lessons_closed' | 'empty';
  };
  current_thesis_dependencies: ThesisDependency[];
  prior_failures_and_lessons: ThesisLesson[];
  needs_human_review: ThesisReviewEvent[];
  cross_company_patterns: CrossCompanyPattern[];
  watch_next: ThesisWatchpoint[];
  limits: string[];
  markdown: string;
}

export interface ThesisDependency {
  company: string;
  theme: string;
  assumption_id: string;
  observation_count: number;
  review_pressure: number;
  latest_seen_at: string;
  freshness: string;
  why_it_matters: string;
}

export interface ThesisLesson {
  lesson: string;
  verdict_count: number;
  companies: string[];
  themes: string[];
  outcome_ids: string[];
  representative_context: string;
}

export interface ThesisReviewEvent {
  id: string;
  company: string;
  themes: string[];
  candidate_count: number;
  candidate_ids: string[];
  max_confidence: number;
  latest_seen_at: string | null;
  representative_excerpt: string;
  apply_command: string;
}

export interface CrossCompanyPattern {
  theme: string;
  companies: string[];
  open_bet_count: number;
  total_observations: number;
  review_pressure: number;
  latest_seen_at: string;
}

export interface ThesisWatchpoint {
  company: string;
  theme: string;
  reason: string;
  next_action: string;
  evidence: string;
}

const LIMITS = [
  'This is decision support, not investment advice or a buy/sell recommendation.',
  'SEC disclosures are issuer-authored evidence; they are useful but not independent proof of business reality.',
  'A staged review event is not a pass/fail verdict until a human applies it.',
  'The report does not use price feeds, valuation models, technical indicators, or portfolio allocation.',
];

export function buildCompanyThesisReport(
  ledger: SecLedgerReport,
): CompanyThesisReport {
  const runId = ledger.run && !(ledger.run as { missing?: boolean }).missing
    ? String((ledger.run as { id?: unknown }).id ?? '')
    : null;
  const dependencies = buildDependencies(ledger.current_bets);
  const lessons = buildLessons(ledger.lessons_captured);
  const reviewEvents = buildReviewEvents(ledger.review_queue);
  const patterns = buildCrossCompanyPatterns(ledger.current_bets);
  const watchpoints = buildWatchpoints(ledger.review_queue, ledger.current_bets);
  const readout = {
    companies: ledger.executive_summary.companies,
    filings_scanned: ledger.executive_summary.filings_scanned,
    current_bets: ledger.executive_summary.current_bets,
    review_events: ledger.executive_summary.review_events,
    staged_candidates: ledger.executive_summary.staged_candidates,
    accepted_failures: ledger.executive_summary.accepted_failures,
    accepted_lessons: ledger.executive_summary.accepted_lessons,
    missing_lessons: ledger.executive_summary.missing_lessons,
    thesis_posture: thesisPosture(ledger),
  };
  const report: Omit<CompanyThesisReport, 'markdown'> = {
    report_kind: 'company_thesis',
    run_id: runId,
    as_of_date: ledger.as_of_date,
    executive_readout: readout,
    current_thesis_dependencies: dependencies,
    prior_failures_and_lessons: lessons,
    needs_human_review: reviewEvents,
    cross_company_patterns: patterns,
    watch_next: watchpoints,
    limits: LIMITS,
  };
  return {
    ...report,
    markdown: renderCompanyThesisMarkdown(report),
  };
}

export function renderCompanyThesisMarkdown(
  report: Omit<CompanyThesisReport, 'markdown'>,
): string {
  const lines: string[] = [];
  lines.push(`# Company Thesis Report ${report.run_id ?? ''}`.trim());
  lines.push('');
  lines.push('A deterministic decision-support view of current company bets, prior failures, unresolved review events, and next watchpoints.');
  lines.push('');
  lines.push('## Executive Readout');
  lines.push('');
  const s = report.executive_readout;
  if (s.companies.length === 0) {
    lines.push('No company tracker run exists yet.');
  } else {
    lines.push(`- Companies: ${s.companies.join(', ')}`);
    lines.push(`- Filings scanned: ${s.filings_scanned}`);
    lines.push(`- Current thesis dependencies: ${s.current_bets} open bet(s).`);
    lines.push(`- Human review queue: ${s.review_events} event(s), ${s.staged_candidates} staged candidate(s).`);
    lines.push(`- Accepted failures: ${s.accepted_failures}; lessons recorded: ${s.accepted_lessons}; missing lesson memos: ${s.missing_lessons}.`);
    lines.push(`- Posture: ${postureLabel(s.thesis_posture)}`);
  }
  lines.push('');
  lines.push('## Current Thesis Dependencies');
  lines.push('');
  if (report.current_thesis_dependencies.length === 0) {
    lines.push('No open company/theme assumptions are currently being carried.');
  } else {
    for (const dep of report.current_thesis_dependencies) {
      lines.push(`- **${dep.company} / ${dep.theme}** - ${dep.freshness}, review pressure ${dep.review_pressure}, ${dep.observation_count} observation(s), latest ${dep.latest_seen_at}`);
      lines.push(`  - Assumption: ${dep.assumption_id}`);
      lines.push(`  - Why it matters: ${dep.why_it_matters}`);
    }
  }
  lines.push('');
  lines.push('## Prior Failures And Lessons');
  lines.push('');
  if (report.prior_failures_and_lessons.length === 0) {
    lines.push('No accepted failure lessons have been recorded yet.');
  } else {
    for (const lesson of report.prior_failures_and_lessons) {
      lines.push(`- **${lesson.lesson}**`);
      lines.push(`  - Evidence: ${lesson.verdict_count} accepted failure verdict(s) across ${lesson.companies.join(', ')} / ${lesson.themes.join(', ')}`);
      lines.push(`  - Representative context: ${lesson.representative_context}`);
      lines.push(`  - Outcomes: ${lesson.outcome_ids.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('## What Needs Human Review');
  lines.push('');
  if (report.needs_human_review.length === 0) {
    lines.push('No staged review events are waiting for human judgment.');
  } else {
    for (const event of report.needs_human_review) {
      lines.push(`- **${event.company} / ${event.themes.join(', ')}** - ${event.candidate_count} candidate(s), confidence up to ${event.max_confidence}`);
      lines.push(`  - Candidate IDs: ${event.candidate_ids.join(', ')}`);
      lines.push(`  - Apply after review: \`${event.apply_command}\``);
      lines.push(`  - Evidence: ${event.representative_excerpt.replace(/\s+/g, ' ').slice(0, 300)}`);
    }
  }
  lines.push('');
  lines.push('## Cross-Company Patterns');
  lines.push('');
  if (report.cross_company_patterns.length === 0) {
    lines.push('No open theme currently appears across more than one tracked company.');
  } else {
    for (const pattern of report.cross_company_patterns) {
      lines.push(`- **${pattern.theme}**: ${pattern.open_bet_count} open bet(s) across ${pattern.companies.join(', ')}, ${pattern.total_observations} observation(s), review pressure ${pattern.review_pressure}, latest ${pattern.latest_seen_at}`);
    }
  }
  lines.push('');
  lines.push('## What To Watch Next');
  lines.push('');
  if (report.watch_next.length === 0) {
    lines.push('No active watchpoints were generated for this run.');
  } else {
    for (const watch of report.watch_next) {
      lines.push(`- **${watch.company} / ${watch.theme}**`);
      lines.push(`  - Reason: ${watch.reason}`);
      lines.push(`  - Next action: ${watch.next_action}`);
      lines.push(`  - Evidence: ${watch.evidence}`);
    }
  }
  lines.push('');
  lines.push('## Limits');
  lines.push('');
  for (const limit of report.limits) {
    lines.push(`- ${limit}`);
  }
  return `${lines.join('\n')}\n`;
}

function buildDependencies(bets: SecCurrentBet[]): ThesisDependency[] {
  return bets.slice(0, 12).map((bet) => ({
    company: bet.company,
    theme: bet.theme,
    assumption_id: bet.assumption_id,
    observation_count: bet.observation_count,
    review_pressure: bet.review_pressure,
    latest_seen_at: bet.latest_seen_at,
    freshness: bet.freshness,
    why_it_matters: bet.review_pressure > 0
      ? 'Staged evidence exists; review before treating this assumption as intact.'
      : 'Recurring issuer disclosures make this a live dependency to keep tracking.',
  }));
}

function buildLessons(lessons: SecLessonCaptured[]): ThesisLesson[] {
  return lessons.map((lesson) => ({
    lesson: lesson.lesson,
    verdict_count: lesson.verdict_count,
    companies: lesson.companies,
    themes: lesson.themes,
    outcome_ids: lesson.outcome_ids,
    representative_context: lesson.representative.what_actually_happened,
  }));
}

function buildReviewEvents(events: SecReviewEvent[]): ThesisReviewEvent[] {
  return events.slice(0, 12).map((event) => ({
    id: event.id,
    company: event.company,
    themes: event.themes,
    candidate_count: event.candidate_count,
    candidate_ids: event.candidate_ids,
    max_confidence: event.max_confidence,
    latest_seen_at: event.latest_seen_at,
    representative_excerpt: event.representative_excerpt,
    apply_command: event.apply_command,
  }));
}

function buildCrossCompanyPatterns(bets: SecCurrentBet[]): CrossCompanyPattern[] {
  const groups = new Map<string, SecCurrentBet[]>();
  for (const bet of bets) {
    const current = groups.get(bet.theme) ?? [];
    current.push(bet);
    groups.set(bet.theme, current);
  }
  return [...groups.entries()]
    .map(([theme, rows]) => ({
      theme,
      companies: uniqueSorted(rows.map((row) => row.company)),
      open_bet_count: rows.length,
      total_observations: rows.reduce((sum, row) => sum + row.observation_count, 0),
      review_pressure: rows.reduce((sum, row) => sum + row.review_pressure, 0),
      latest_seen_at: maxString(rows.map((row) => row.latest_seen_at)) ?? 'n/a',
    }))
    .filter((pattern) => pattern.companies.length > 1)
    .sort((a, b) =>
      b.review_pressure - a.review_pressure ||
      b.total_observations - a.total_observations ||
      a.theme.localeCompare(b.theme),
    );
}

function buildWatchpoints(events: SecReviewEvent[], bets: SecCurrentBet[]): ThesisWatchpoint[] {
  const watchpoints: ThesisWatchpoint[] = [];
  for (const event of events.slice(0, 5)) {
    watchpoints.push({
      company: event.company,
      theme: event.themes.join(', '),
      reason: `${event.candidate_count} staged outcome candidate(s) need human review.`,
      next_action: event.apply_command,
      evidence: event.representative_excerpt.replace(/\s+/g, ' ').slice(0, 300),
    });
  }
  const seen = new Set(watchpoints.map((w) => `${w.company}:${w.theme}`));
  for (const bet of bets.filter((b) => b.review_pressure > 0).slice(0, 5)) {
    const key = `${bet.company}:${bet.theme}`;
    if (seen.has(key)) continue;
    watchpoints.push({
      company: bet.company,
      theme: bet.theme,
      reason: `Open assumption has review pressure ${bet.review_pressure}.`,
      next_action: `Review staged candidates linked to assumption ${bet.assumption_id} before carrying this bet forward.`,
      evidence: `${bet.observation_count} observation(s), latest ${bet.latest_seen_at}.`,
    });
    seen.add(key);
  }
  if (watchpoints.length === 0) {
    for (const bet of bets.slice(0, 5)) {
      watchpoints.push({
        company: bet.company,
        theme: bet.theme,
        reason: 'High-observation open assumption remains part of the current thesis.',
        next_action: 'Keep tracking future filings for contradictory realized-risk language.',
        evidence: `${bet.observation_count} observation(s), latest ${bet.latest_seen_at}.`,
      });
    }
  }
  return watchpoints.slice(0, 8);
}

function thesisPosture(ledger: SecLedgerReport): CompanyThesisReport['executive_readout']['thesis_posture'] {
  const s = ledger.executive_summary;
  if (s.companies.length === 0) return 'empty';
  if (s.staged_candidates > 0) return 'needs_review';
  if (s.accepted_failures > 0 && s.missing_lessons === 0) return 'lessons_closed';
  return 'visibility_only';
}

function postureLabel(posture: CompanyThesisReport['executive_readout']['thesis_posture']): string {
  if (posture === 'needs_review') return 'evidence needs human review before thesis confidence should increase.';
  if (posture === 'lessons_closed') return 'accepted failures have durable lessons; use them when reviewing future bets.';
  if (posture === 'visibility_only') return 'the ledger has visibility, but no accepted pass/fail verdicts yet.';
  return 'no company thesis data yet.';
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function maxString(values: string[]): string | null {
  const filtered = values.filter(Boolean).sort();
  return filtered.at(-1) ?? null;
}
