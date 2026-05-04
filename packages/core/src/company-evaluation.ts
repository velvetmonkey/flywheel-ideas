import { createHash } from 'node:crypto';
import type { IdeasDatabase } from './db.js';
import {
  generateCompanyEvaluationAttemptId,
  generateCompanyEvaluationTargetId,
} from './ids.js';
import { logDispatchFinish, logDispatchStart } from './dispatches.js';
import { spawnCliCell, type CliName } from './council-spawn.js';
import { writeNote } from './write/index.js';
import { readCompanyRun } from './company.js';
import type { ApprovalScope } from './approval.js';

export const COMPANY_EVALUATION_PROMPT_VERSION = 'company-eval-v1';

export type CompanyEvaluationStage =
  | 'filing_section_meaning'
  | 'assumption_quality'
  | 'outcome_validity'
  | 'thesis_delta'
  | 'cross_sector_pattern'
  | 'adjudication_packet';
export type CompanyEvaluationDecision =
  | 'meaningful_signal'
  | 'mostly_boilerplate'
  | 'assumption_sound'
  | 'assumption_weak'
  | 'valid_failure'
  | 'valid_validation'
  | 'not_an_outcome'
  | 'ambiguous'
  | 'insufficient_evidence'
  | 'thesis_strengthened'
  | 'thesis_weakened'
  | 'thesis_unchanged'
  | 'new_watchpoint'
  | 'pattern_meaningful'
  | 'pattern_boilerplate'
  | 'adjudication_ready'
  | 'needs_more_evidence';

export interface CompanyEvaluateInput {
  run_id: string;
  stage: CompanyEvaluationStage;
  target_ids?: string[];
  limit?: number;
  resume?: boolean;
  confirm: boolean;
}

export interface CompanyEvaluateOptions {
  evaluator?: CompanyEvaluator;
  cli?: CliName;
  model?: string;
  timeout_ms?: number;
  approval_scope?: ApprovalScope;
  spawn_prefix?: string[];
}

export interface CompanyEvaluateResult {
  run_id: string;
  stage: CompanyEvaluationStage;
  selected_targets: number;
  evaluated_targets: number;
  skipped_targets: number;
  attempts: CompanyEvaluationAttemptRow[];
  summary_paths: {
    evaluation_index: string;
    thesis_deltas: string;
    disputes: string;
  };
}

export interface CompanyEvaluationPayload {
  run_id: string;
  stage: CompanyEvaluationStage;
  target_kind: string;
  target_id: string;
  target_label: string;
  selection_reason: string;
  evidence_refs: string[];
  evidence: Record<string, unknown>;
}

export interface CompanyEvaluationOutput {
  decision: CompanyEvaluationDecision;
  confidence: number | null;
  abstention_reason?: string | null;
  summary: string;
  rationale: string;
  evidence_refs: string[];
  uncertainty?: string | null;
  recommended_next_step?: string | null;
}

export type CompanyEvaluator = (
  payload: CompanyEvaluationPayload,
) => Promise<CompanyEvaluationOutput>;

export interface CompanyEvaluationTargetRow {
  id: string;
  run_id: string;
  stage: CompanyEvaluationStage;
  target_kind: string;
  target_id: string;
  input_hash: string;
  selection_rank: number;
  selection_reason: string;
  status: string;
  latest_attempt_id: string | null;
  created_at: number;
}

export interface CompanyEvaluationAttemptRow {
  id: string;
  target_id: string;
  run_id: string;
  stage: CompanyEvaluationStage;
  target_kind: string;
  target_id_value: string;
  input_hash: string;
  prompt_version: string;
  model: string;
  decision: CompanyEvaluationDecision;
  confidence: number | null;
  abstention_reason: string | null;
  evidence_refs_json: string;
  output_json: string;
  latency_ms: number;
  created_at: number;
}

interface SelectedTarget {
  rank: number;
  payload: CompanyEvaluationPayload;
  input_hash: string;
}

export class CompanyEvaluationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompanyEvaluationInputError';
  }
}

export async function evaluateCompanyRun(
  db: IdeasDatabase,
  vaultPath: string,
  input: CompanyEvaluateInput,
  options: CompanyEvaluateOptions = {},
): Promise<CompanyEvaluateResult> {
  if (!input.confirm) throw new CompanyEvaluationInputError('company.evaluate requires confirm: true');
  const run = readCompanyRun(db, input.run_id);
  const selected = selectTargets(run, input);
  const evaluator = options.evaluator ?? buildCliEvaluator(db, options);
  const attempts: CompanyEvaluationAttemptRow[] = [];
  let skipped = 0;

  for (const selectedTarget of selected) {
    const target = ensureEvaluationTarget(db, selectedTarget);
    if (input.resume !== false && target.status === 'reviewed' && target.latest_attempt_id) {
      skipped += 1;
      continue;
    }

    const started = Date.now();
    const output = await evaluator(selectedTarget.payload);
    const attempt = recordEvaluationAttempt(db, {
      target,
      payload: selectedTarget.payload,
      output,
      model: options.model ?? process.env.FLYWHEEL_IDEAS_COMPANY_EVAL_MODEL ?? resolveDefaultModel(options.cli ?? 'codex'),
      latency_ms: Date.now() - started,
    });
    attempts.push(attempt);
  }

  const summaryPaths = await writeCompanyEvaluationSummaries(db, vaultPath, input.run_id);
  return {
    run_id: input.run_id,
    stage: input.stage,
    selected_targets: selected.length,
    evaluated_targets: attempts.length,
    skipped_targets: skipped,
    attempts,
    summary_paths: summaryPaths,
  };
}

export function listCompanyEvaluationAttempts(
  db: IdeasDatabase,
  runId: string,
): CompanyEvaluationAttemptRow[] {
  return db.prepare(
    `SELECT * FROM ideas_company_evaluation_attempts
      WHERE run_id = ?
      ORDER BY created_at DESC, id DESC`,
  ).all(runId) as CompanyEvaluationAttemptRow[];
}

export async function writeCompanyEvaluationSummaries(
  db: IdeasDatabase,
  vaultPath: string,
  runId: string,
): Promise<CompanyEvaluateResult['summary_paths']> {
  const attempts = listCompanyEvaluationAttempts(db, runId);
  const baseDir = `reports/company-runs/${runId.toLowerCase()}`;
  const pages = [
    {
      path: `${baseDir}/evaluation-index.md`,
      id: `company-run-${runId}-evaluation-index`,
      body: renderEvaluationIndex(runId, attempts),
    },
    {
      path: `${baseDir}/thesis-deltas.md`,
      id: `company-run-${runId}-thesis-deltas`,
      body: renderThesisDeltas(runId, attempts),
    },
    {
      path: `${baseDir}/disputes.md`,
      id: `company-run-${runId}-disputes`,
      body: renderDisputes(runId, attempts),
    },
  ];
  const written = new Map<string, string>();
  for (const page of pages) {
    const result = await writeNote(
      vaultPath,
      page.path,
      {
        id: page.id,
        type: 'report',
        report_kind: 'company_evaluation',
        run_id: runId,
        source: 'flywheel-ideas',
      },
      page.body,
      { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 12 },
    );
    written.set(page.path, result.vault_path);
  }
  return {
    evaluation_index: written.get(`${baseDir}/evaluation-index.md`) ?? `${baseDir}/evaluation-index.md`,
    thesis_deltas: written.get(`${baseDir}/thesis-deltas.md`) ?? `${baseDir}/thesis-deltas.md`,
    disputes: written.get(`${baseDir}/disputes.md`) ?? `${baseDir}/disputes.md`,
  };
}

function selectTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  if (input.stage === 'filing_section_meaning') return selectFilingSectionTargets(run, input);
  if (input.stage === 'assumption_quality') return selectAssumptionQualityTargets(run, input);
  if (input.stage === 'outcome_validity') return selectOutcomeTargets(run, input);
  if (input.stage === 'thesis_delta') return selectThesisDeltaTargets(run, input);
  if (input.stage === 'cross_sector_pattern') return selectCrossSectorPatternTargets(run, input);
  return selectAdjudicationPacketTargets(run, input);
}

function limitRows<T>(rows: T[], input: CompanyEvaluateInput): T[] {
  return rows.slice(0, input.limit ?? rows.length);
}

function selectFilingSectionTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  const observations = run.observations as Array<Record<string, unknown>>;
  const filings = (run.filings as Array<Record<string, unknown>>)
    .filter((row) => !input.target_ids || input.target_ids.includes(String(row.id)))
    .sort((a, b) => String(a.filed_at).localeCompare(String(b.filed_at)) || String(a.accession_no).localeCompare(String(b.accession_no)));
  return limitRows(filings, input).map((filing, index) => {
    const filingObservations = observations.filter((row) => row.filing_id === filing.id);
    const payload: CompanyEvaluationPayload = {
      run_id: input.run_id,
      stage: input.stage,
      target_kind: 'company_filing',
      target_id: String(filing.id),
      target_label: `${filing.ticker ?? filing.cik} ${filing.form} ${filing.filed_at}`,
      selection_reason: 'chronological filing-section meaning review',
      evidence_refs: [String(filing.filing_url)],
      evidence: {
        filing,
        observations: filingObservations,
        instruction: 'Decide whether this filing section contains thesis-relevant evidence or mostly boilerplate. Do not recommend trading action.',
      },
    };
    return { rank: index + 1, payload, input_hash: hashPayload(payload) };
  });
}

function selectAssumptionQualityTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  const observations = run.observations as Array<Record<string, unknown>>;
  const themes = (run.themes as Array<Record<string, unknown>>)
    .filter((row) => !input.target_ids || input.target_ids.includes(String(row.assumption_id ?? row.id)))
    .sort((a, b) => String(a.ticker ?? a.cik).localeCompare(String(b.ticker ?? b.cik)) || String(a.theme_key).localeCompare(String(b.theme_key)));
  return limitRows(themes, input).map((theme, index) => {
    const themeObservations = observations.filter((row) => row.theme_id === theme.id);
    const payload: CompanyEvaluationPayload = {
      run_id: input.run_id,
      stage: input.stage,
      target_kind: 'company_assumption_theme',
      target_id: String(theme.assumption_id ?? theme.id),
      target_label: `${theme.ticker ?? theme.cik} / ${theme.title}`,
      selection_reason: 'assumption quality review across accumulated observations',
      evidence_refs: themeObservations.map((row) => String(row.source_uri)).slice(0, 12),
      evidence: {
        theme,
        observations: themeObservations,
        instruction: 'Decide whether this is a clear falsifiable company assumption or a weak/generic restatement of filing language.',
      },
    };
    return { rank: index + 1, payload, input_hash: hashPayload(payload) };
  });
}

function selectOutcomeTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  const outcomes = (run.outcomes as Array<Record<string, unknown>>)
    .filter((row) => row.state === 'staged')
    .filter((row) => !input.target_ids || input.target_ids.includes(String(row.id)))
    .sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0));
  const themes = new Map((run.themes as Array<Record<string, unknown>>).map((row) => [String(row.id), row]));
  const filings = new Map((run.filings as Array<Record<string, unknown>>).map((row) => [String(row.id), row]));
  return limitRows(outcomes, input).map((outcome, index) => {
    const theme = themes.get(String(outcome.theme_id));
    const filing = filings.get(String(outcome.filing_id));
    const evidenceRefs = [String(outcome.source_uri)];
    const payload: CompanyEvaluationPayload = {
      run_id: input.run_id,
      stage: input.stage,
      target_kind: 'company_outcome_candidate',
      target_id: String(outcome.id),
      target_label: `${theme?.ticker ?? theme?.cik ?? 'unknown'} / ${theme?.title ?? 'unknown theme'}`,
      selection_reason: `ranked by staged candidate confidence ${outcome.confidence}`,
      evidence_refs: evidenceRefs,
      evidence: {
        candidate: outcome,
        linked_theme: theme,
        linked_filing: filing,
        instruction: 'Decide whether the cited filing excerpt describes a realized event that should be reviewed as a possible pass/fail outcome. Abstain if the evidence is boilerplate, issuer spin, or not clearly linked to the assumption.',
      },
    };
    return { rank: index + 1, payload, input_hash: hashPayload(payload) };
  });
}

function selectThesisDeltaTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  const summaries = (run.company_summaries as Array<Record<string, unknown>>)
    .filter((row) => !input.target_ids || input.target_ids.includes(String(row.ticker ?? row.cik)))
    .sort((a, b) => Number(b.staged_outcome_count ?? 0) - Number(a.staged_outcome_count ?? 0) || String(a.ticker ?? a.cik).localeCompare(String(b.ticker ?? b.cik)));
  const outcomes = run.outcome_groups as Array<Record<string, unknown>>;
  return limitRows(summaries, input).map((summary, index) => {
    const company = String(summary.ticker ?? summary.cik);
    const companyOutcomes = outcomes.filter((group) => String(group.company) === company);
    const payload: CompanyEvaluationPayload = {
      run_id: input.run_id,
      stage: input.stage,
      target_kind: 'company',
      target_id: company,
      target_label: company,
      selection_reason: 'company thesis delta review ranked by staged outcomes and ticker',
      evidence_refs: companyOutcomes.flatMap((group) => group.source_uris as string[] ?? []).slice(0, 10),
      evidence: {
        company_summary: summary,
        staged_review_events: companyOutcomes,
        instruction: 'Identify what changed in the company thesis from the accumulated filing evidence. Classify whether the thesis strengthened, weakened, stayed unchanged, or needs a new watchpoint. Do not recommend trading action.',
      },
    };
    return { rank: index + 1, payload, input_hash: hashPayload(payload) };
  });
}

function selectCrossSectorPatternTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  const patterns = (run.cross_sector_patterns as Array<Record<string, unknown>>)
    .filter((row) => !input.target_ids || input.target_ids.includes(String(row.pattern_key)))
    .sort((a, b) => Number(b.realized_candidate_count ?? 0) - Number(a.realized_candidate_count ?? 0) || Number(b.observation_count ?? 0) - Number(a.observation_count ?? 0));
  return limitRows(patterns, input).map((pattern, index) => {
    const examples = pattern.examples as Array<Record<string, unknown>> | undefined;
    const payload: CompanyEvaluationPayload = {
      run_id: input.run_id,
      stage: input.stage,
      target_kind: 'company_cross_sector_pattern',
      target_id: String(pattern.pattern_key),
      target_label: `${pattern.theme_title} / ${pattern.mechanism_title}`,
      selection_reason: 'cross-sector pattern validation ranked by realized candidates and observations',
      evidence_refs: (examples ?? []).map((example) => `${example.company}:${example.observed_at}`).slice(0, 12),
      evidence: {
        pattern,
        instruction: 'Decide whether this cross-sector pattern is a meaningful shared mechanism or mostly SEC boilerplate.',
      },
    };
    return { rank: index + 1, payload, input_hash: hashPayload(payload) };
  });
}

function selectAdjudicationPacketTargets(run: Record<string, unknown>, input: CompanyEvaluateInput): SelectedTarget[] {
  const groups = (run.outcome_groups as Array<Record<string, unknown>>)
    .filter((row) => !input.target_ids || input.target_ids.includes(String(row.id)))
    .sort((a, b) => Number(b.candidate_count ?? 0) - Number(a.candidate_count ?? 0) || String(a.company).localeCompare(String(b.company)));
  return limitRows(groups, input).map((group, index) => {
    const payload: CompanyEvaluationPayload = {
      run_id: input.run_id,
      stage: input.stage,
      target_kind: 'company_adjudication_packet',
      target_id: String(group.id),
      target_label: `${group.company} / ${(group.themes as string[] | undefined)?.join(', ') ?? 'unknown themes'}`,
      selection_reason: 'human adjudication packet review ranked by grouped staged outcomes',
      evidence_refs: (group.source_uris as string[] | undefined) ?? [],
      evidence: {
        review_group: group,
        instruction: 'Decide whether this packet is ready for human accept/reject review or needs more evidence.',
      },
    };
    return { rank: index + 1, payload, input_hash: hashPayload(payload) };
  });
}

function ensureEvaluationTarget(db: IdeasDatabase, selected: SelectedTarget): CompanyEvaluationTargetRow {
  const now = Date.now();
  const existing = db.prepare(
    `SELECT * FROM ideas_company_evaluation_targets
      WHERE run_id = ? AND stage = ? AND target_kind = ? AND target_id = ? AND input_hash = ?`,
  ).get(
    selected.payload.run_id,
    selected.payload.stage,
    selected.payload.target_kind,
    selected.payload.target_id,
    selected.input_hash,
  ) as CompanyEvaluationTargetRow | undefined;
  if (existing) return existing;
  const id = generateCompanyEvaluationTargetId();
  db.prepare(
    `INSERT INTO ideas_company_evaluation_targets
       (id, run_id, stage, target_kind, target_id, input_hash, selection_rank, selection_reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(
    id,
    selected.payload.run_id,
    selected.payload.stage,
    selected.payload.target_kind,
    selected.payload.target_id,
    selected.input_hash,
    selected.rank,
    selected.payload.selection_reason,
    now,
  );
  return db.prepare(`SELECT * FROM ideas_company_evaluation_targets WHERE id = ?`).get(id) as CompanyEvaluationTargetRow;
}

function recordEvaluationAttempt(
  db: IdeasDatabase,
  input: {
    target: CompanyEvaluationTargetRow;
    payload: CompanyEvaluationPayload;
    output: CompanyEvaluationOutput;
    model: string;
    latency_ms: number;
  },
): CompanyEvaluationAttemptRow {
  const id = generateCompanyEvaluationAttemptId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO ideas_company_evaluation_attempts
       (id, target_id, run_id, stage, target_kind, target_id_value, input_hash,
        prompt_version, model, decision, confidence, abstention_reason,
        evidence_refs_json, output_json, latency_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.target.id,
    input.target.run_id,
    input.target.stage,
    input.target.target_kind,
    input.target.target_id,
    input.target.input_hash,
    COMPANY_EVALUATION_PROMPT_VERSION,
    input.model,
    input.output.decision,
    input.output.confidence,
    input.output.abstention_reason ?? null,
    JSON.stringify(input.output.evidence_refs),
    JSON.stringify(input.output),
    input.latency_ms,
    now,
  );
  db.prepare(
    `UPDATE ideas_company_evaluation_targets
        SET status = 'reviewed', latest_attempt_id = ?
      WHERE id = ?`,
  ).run(id, input.target.id);
  return db.prepare(`SELECT * FROM ideas_company_evaluation_attempts WHERE id = ?`).get(id) as CompanyEvaluationAttemptRow;
}

function buildCliEvaluator(db: IdeasDatabase, options: CompanyEvaluateOptions): CompanyEvaluator {
  const cli = options.cli ?? cliFromEnv();
  const model = options.model ?? process.env.FLYWHEEL_IDEAS_COMPANY_EVAL_MODEL ?? resolveDefaultModel(cli);
  return async (payload) => {
    const prompt = buildEvaluationPrompt(payload);
    const dispatch = logDispatchStart(db, {
      session_id: null,
      cli,
      argv: buildEvalArgv(cli, model, prompt.system),
      approval_scope: options.approval_scope ?? 'session',
    });
    let stdout = '';
    try {
      const result = await spawnCliCell({
        cli,
        argv: buildEvalArgv(cli, model, prompt.system),
        stdin_prompt: buildEvalStdin(cli, prompt.system, prompt.user),
        timeout_ms: options.timeout_ms ?? 10 * 60 * 1000,
        spawn_prefix: options.spawn_prefix,
      });
      stdout = result.stdout;
      if (result.exit_code !== 0 || result.signal || result.was_killed_by_dispatcher) {
        return {
          decision: 'insufficient_evidence',
          confidence: null,
          abstention_reason: `evaluator subprocess failed: exit=${result.exit_code ?? 'null'} signal=${result.signal ?? 'null'}`,
          summary: 'Evaluation did not complete.',
          rationale: result.stderr_tail || result.stdout_tail,
          evidence_refs: payload.evidence_refs,
        };
      }
      return parseEvaluationOutput(stdout, payload.evidence_refs);
    } finally {
      logDispatchFinish(db, dispatch.id);
    }
  };
}

function buildEvaluationPrompt(payload: CompanyEvaluationPayload): { system: string; user: string } {
  const system = [
    'You evaluate SEC filing evidence for a falsifiable company thesis ledger.',
    'You are not giving investment advice and must not recommend trades.',
    'Return strict JSON only with keys: decision, confidence, abstention_reason, summary, rationale, evidence_refs, uncertainty, recommended_next_step.',
    'Use decision values only from the stage contract. Prefer ambiguous or insufficient_evidence over forced certainty.',
  ].join(' ');
  const user = JSON.stringify({
    prompt_version: COMPANY_EVALUATION_PROMPT_VERSION,
    stage: payload.stage,
    target: {
      kind: payload.target_kind,
      id: payload.target_id,
      label: payload.target_label,
    },
    allowed_decisions: allowedDecisionsForStage(payload.stage),
    evidence_refs: payload.evidence_refs,
    evidence: payload.evidence,
  }, null, 2);
  return { system, user };
}

function allowedDecisionsForStage(stage: CompanyEvaluationStage): CompanyEvaluationDecision[] {
  if (stage === 'filing_section_meaning') return ['meaningful_signal', 'mostly_boilerplate', 'ambiguous', 'insufficient_evidence'];
  if (stage === 'assumption_quality') return ['assumption_sound', 'assumption_weak', 'ambiguous', 'insufficient_evidence'];
  if (stage === 'outcome_validity') return ['valid_failure', 'valid_validation', 'not_an_outcome', 'ambiguous', 'insufficient_evidence'];
  if (stage === 'thesis_delta') return ['thesis_strengthened', 'thesis_weakened', 'thesis_unchanged', 'new_watchpoint', 'ambiguous', 'insufficient_evidence'];
  if (stage === 'cross_sector_pattern') return ['pattern_meaningful', 'pattern_boilerplate', 'ambiguous', 'insufficient_evidence'];
  return ['adjudication_ready', 'needs_more_evidence', 'ambiguous', 'insufficient_evidence'];
}

function parseEvaluationOutput(stdout: string, fallbackRefs: string[]): CompanyEvaluationOutput {
  const parsed = parseJsonish(extractCodexAgentMessage(stdout) ?? stdout);
  const raw = typeof parsed.result === 'string' ? parseJsonish(parsed.result) : parsed;
  const decision = normalizeDecision(raw.decision);
  return {
    decision,
    confidence: normalizeConfidence(raw.confidence),
    abstention_reason: typeof raw.abstention_reason === 'string' ? raw.abstention_reason : null,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    rationale: typeof raw.rationale === 'string' ? raw.rationale : '',
    evidence_refs: Array.isArray(raw.evidence_refs)
      ? raw.evidence_refs.filter((ref): ref is string => typeof ref === 'string')
      : fallbackRefs,
    uncertainty: typeof raw.uncertainty === 'string' ? raw.uncertainty : null,
    recommended_next_step: typeof raw.recommended_next_step === 'string' ? raw.recommended_next_step : null,
  };
}

function extractCodexAgentMessage(stdout: string): string | null {
  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  for (const line of [...lines].reverse()) {
    try {
      const event = JSON.parse(line) as unknown;
      if (
        typeof event === 'object' &&
        event !== null &&
        (event as { type?: unknown }).type === 'item.completed' &&
        typeof (event as { item?: unknown }).item === 'object' &&
        (event as { item: { type?: unknown } }).item !== null &&
        (event as { item: { type?: unknown } }).item.type === 'agent_message' &&
        typeof (event as { item: { text?: unknown } }).item.text === 'string'
      ) {
        return (event as { item: { text: string } }).item.text;
      }
    } catch {
      // Non-JSON lines are allowed in CLI output; raw parsing below handles them.
    }
  }
  return null;
}

function parseJsonish(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (direct && typeof direct === 'object') return direct as Record<string, unknown>;
  } catch {
    // fall through to brace extraction
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const extracted = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    if (extracted && typeof extracted === 'object') return extracted as Record<string, unknown>;
  }
  throw new CompanyEvaluationInputError('LLM evaluator did not return parseable JSON');
}

function normalizeDecision(value: unknown): CompanyEvaluationDecision {
  const allowed: CompanyEvaluationDecision[] = [
    'meaningful_signal',
    'mostly_boilerplate',
    'assumption_sound',
    'assumption_weak',
    'valid_failure',
    'valid_validation',
    'not_an_outcome',
    'ambiguous',
    'insufficient_evidence',
    'thesis_strengthened',
    'thesis_weakened',
    'thesis_unchanged',
    'new_watchpoint',
    'pattern_meaningful',
    'pattern_boilerplate',
    'adjudication_ready',
    'needs_more_evidence',
  ];
  return allowed.includes(value as CompanyEvaluationDecision)
    ? value as CompanyEvaluationDecision
    : 'insufficient_evidence';
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function renderEvaluationIndex(runId: string, attempts: CompanyEvaluationAttemptRow[]): string {
  const lines = [
    `# Evaluation Index ${runId}`,
    '',
    'Shadow LLM evaluations review SEC evidence without mutating canonical assumptions or outcomes.',
    '',
    '| Stage | Target | Decision | Confidence | Evidence |',
    '|---|---|---|---:|---|',
  ];
  for (const attempt of attempts) {
    const refs = JSON.parse(attempt.evidence_refs_json) as string[];
    lines.push(`| ${attempt.stage} | ${attempt.target_id_value} | ${attempt.decision} | ${attempt.confidence ?? 'n/a'} | ${refs.slice(0, 2).join('<br>')} |`);
  }
  if (attempts.length === 0) lines.push('| none | none | none | n/a | no shadow evaluations yet |');
  return `${lines.join('\n')}\n`;
}

function renderThesisDeltas(runId: string, attempts: CompanyEvaluationAttemptRow[]): string {
  const thesisAttempts = attempts.filter((attempt) => attempt.stage === 'thesis_delta');
  const lines = [`# Thesis Deltas ${runId}`, ''];
  if (thesisAttempts.length === 0) {
    lines.push('No thesis-delta evaluations have been run yet.');
  } else {
    for (const attempt of thesisAttempts) {
      const output = JSON.parse(attempt.output_json) as CompanyEvaluationOutput;
      lines.push(`- **${attempt.target_id_value}**: ${attempt.decision} (${attempt.confidence ?? 'n/a'})`);
      lines.push(`  - ${output.summary}`);
      if (output.uncertainty) lines.push(`  - Uncertainty: ${output.uncertainty}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderDisputes(runId: string, attempts: CompanyEvaluationAttemptRow[]): string {
  const disputes = attempts.filter((attempt) =>
    attempt.decision === 'ambiguous' ||
    attempt.decision === 'insufficient_evidence' ||
    attempt.confidence === null ||
    attempt.confidence < 0.65);
  const lines = [`# Disputes ${runId}`, '', 'Items here need human review or council escalation before any canonical action.', ''];
  if (disputes.length === 0) {
    lines.push('No low-confidence or abstained evaluations yet.');
  } else {
    for (const attempt of disputes) {
      const output = JSON.parse(attempt.output_json) as CompanyEvaluationOutput;
      lines.push(`- **${attempt.stage} / ${attempt.target_id_value}**: ${attempt.decision} (${attempt.confidence ?? 'n/a'})`);
      lines.push(`  - ${output.rationale || output.summary}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function hashPayload(payload: CompanyEvaluationPayload): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function cliFromEnv(): CliName {
  const raw = process.env.FLYWHEEL_IDEAS_COMPANY_EVAL_CLI;
  return raw === 'claude' || raw === 'gemini' || raw === 'codex' ? raw : 'codex';
}

function resolveDefaultModel(cli: CliName): string {
  if (cli === 'claude') return process.env.FLYWHEEL_IDEAS_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
  if (cli === 'gemini') return process.env.FLYWHEEL_IDEAS_GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
  return process.env.FLYWHEEL_IDEAS_CODEX_MODEL ?? 'gpt-5.2';
}

function buildEvalArgv(cli: CliName, model: string, systemPrompt: string): string[] {
  if (cli === 'claude') {
    const argv = ['-p', '--output-format=json', `--model=${model}`, '--no-session-persistence'];
    if (process.env.FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION !== '1') argv.unshift('--bare');
    argv.push(`--system-prompt=${systemPrompt}`);
    return argv;
  }
  if (cli === 'gemini') return ['-p', systemPrompt, '-o', 'json', '-m', model];
  return ['exec', '--json', '--skip-git-repo-check', '--ephemeral', '--model', model];
}

function buildEvalStdin(cli: CliName, systemPrompt: string, userMessage: string): string {
  if (cli === 'codex') return `${systemPrompt}\n\n===USER MESSAGE===\n\n${userMessage}`;
  return userMessage;
}
