/**
 * Council orchestrator.
 *
 * `runCouncil(db, vault, input)` creates a session, dispatches the
 * (CLI × persona) matrix concurrently across claude / codex / gemini,
 * writes a view-note + DB row per cell (even on failure), renders the
 * deterministic SYNTHESIS.md with agreement + disagreement sections,
 * and returns the result.
 *
 * Each cell is two-pass — Pass 1 stance + Pass 2 self-critique — both
 * persisted to the view row's `initial_stance` / `stance` / `self_critique`
 * columns. The CLI-interleaved matrix orders cells so the first N in
 * flight (limited by the configurable concurrency cap, default 3) hit
 * different CLIs, spreading rate-limit pressure across providers.
 *
 * No real CLI spawned during tests — callers pass `options.spawn_overrides`
 * keyed by CLI with `['node', '<mock.mjs>']` to redirect to a mock binary,
 * and `FLYWHEEL_IDEAS_NO_VERSION_PROBE=1` to skip the model_version probe.
 */

import { createHash } from 'node:crypto';
import { assemblePrompt, M8_PERSONA_SET, PERSONAS, PERSONA_VERSION, PROMPT_VERSION } from './council-prompts.js';
import type { CouncilMode, PersonaDef } from './council-prompts.js';
import { assembleEvidencePack } from './council-evidence.js';
import type { EvidencePack } from './council-evidence.js';
import { recordEvidenceSources } from './council-evidence-store.js';
import { withEvidenceReader } from './evidence-reader.js';
import type { EvidenceReader } from './evidence-reader.js';
import { bindFreezeToCouncilSession, createFreeze, getFreeze } from './freezes.js';
import {
  extractArgumentTree,
  recordArgumentMap,
  renderArgumentMapMarkdown,
} from './argument-map.js';
import { writeNote as writeNoteDirect } from './write/index.js';
import {
  parseClaudeStanceOutput,
  parseCodexStanceOutput,
  parseGeminiStanceOutput,
  type CouncilStance,
  type ParseResult,
} from './council-parsers.js';
import { spawnCliCell, type CliName } from './council-spawn.js';
import { probeCliVersion } from './cli-version.js';
import { ConcurrencyLimiter } from './concurrency.js';
import {
  completeCouncilSession,
  createCouncilSession,
  insertAssumptionCitations,
  listSessionsByIdea,
  listViewsBySession,
  persistCouncilView,
  type CouncilSessionPurpose,
  type CouncilSessionRow,
  type CouncilViewRow,
} from './council-sessions.js';
import {
  buildViewNotePath,
  renderSynthesisMarkdown,
  writeSynthesis,
} from './council-synthesis.js';
import { classifyCliError, type FailureReason } from './cli-errors.js';
import type { IdeasDatabase } from './db.js';
import { readNote } from './read/notes.js';
import { writeNote } from './write/index.js';
import { logDispatchFinish, logDispatchStart } from './dispatches.js';
import type { ApprovalScope } from './approval.js';

const CLAUDE_MODEL_DEFAULT = 'claude-haiku-4-5-20251001';
const CODEX_MODEL_DEFAULT = 'gpt-5.2';
const GEMINI_MODEL_DEFAULT = 'gemini-2.5-flash-lite';
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 min per spec
const DEFAULT_CONCURRENCY = 3;

/**
 * Codex `exec` has no --system-prompt flag. System prompt goes as a stdin
 * preamble with an unambiguous delimiter the model can orient on.
 */
const CODEX_STDIN_DELIMITER = '\n\n===USER MESSAGE===\n\n';

export interface RunCouncilInput {
  idea_id: string;
  depth?: 'light' | 'full';
  mode: CouncilMode;
  purpose?: CouncilSessionPurpose;
  outcome_id?: string | null;
  /** Session-level approval scope, for persistence into the dispatch log. */
  approval_scope: ApprovalScope;
}

export interface RunCouncilOptions {
  /**
   * Legacy shorthand for `spawn_overrides.claude`. Overrides the claude
   * binary spawn (tests use ['node', MOCK_CLI]).
   */
  spawn_override?: string[];
  /**
   * Per-CLI spawn prefix overrides. When set, each CLI's entry replaces the
   * default binary resolution. Tests point at mock-claude.mjs / mock-codex.mjs.
   */
  spawn_overrides?: Partial<Record<CliName, string[]>>;
  /** Legacy claude model override. Prefer per-CLI env vars. */
  model_override?: string;
  /** Per-CLI model overrides. Fallback chain: this → env var → per-CLI default. */
  model_overrides?: Partial<Record<CliName, string>>;
  /** Override per-cell timeout (default from FLYWHEEL_IDEAS_CELL_TIMEOUT_MS or 15m). */
  timeout_ms_override?: number;
  /** Override the persona set (M9 defaults to M8_PERSONA_SET — 2 personas). */
  personas_override?: readonly PersonaDef[];
  /** Override the CLI set (M9 defaults to ['claude','codex']; M10 adds gemini). */
  clis_override?: readonly CliName[];
  /** Override maxConcurrent (default FLYWHEEL_IDEAS_MAX_CONCURRENCY or 3). */
  max_concurrency_override?: number;
  /**
   * Test-injection hook for the v0.2 KEYSTONE retrieval-native council
   * input. When provided, runCouncil skips the flywheel-memory subprocess
   * spawn and uses this evidence pack directly. Pass `{evidence: null,
   * sources: []}` to simulate "reader unavailable" without spawning.
   */
  evidence_override?: EvidencePack;
  /**
   * Skip evidence assembly entirely (no subprocess spawn, no DB row written).
   * Equivalent to `evidence_override: {evidence: null, sources: []}` but
   * skips the assembler call. Used in tests that don't care about evidence.
   */
  skip_evidence?: boolean;
  /** Override evidence-reader binary path. Forwarded to withEvidenceReader. */
  evidence_reader_binary?: string;
  /** Override evidence-reader binary args. Forwarded to withEvidenceReader. */
  evidence_reader_args?: string[];
  /**
   * v0.2 D2 — OSF preregistration binding. When `true`, runCouncil creates
   * a fresh freeze for the idea AT dispatch time and binds it to the new
   * council session. Mutually exclusive with `freeze_id`.
   */
  freeze?: boolean;
  /**
   * v0.2 D2 — Bind an existing freeze to the council session about to
   * dispatch. The freeze must already exist and reference the same idea.
   * Mutually exclusive with `freeze: true`.
   */
  freeze_id?: string;
}

/** Light-depth CLI roster (M10): all 3 CLIs for every council.run. */
const LIGHT_CLI_SET: readonly CliName[] = ['claude', 'codex', 'gemini'];

/** Full-depth CLI roster — same as light but with all 5 personas. */
const FULL_CLI_SET: readonly CliName[] = ['claude', 'codex', 'gemini'];

/** Full-depth persona roster (M10): all 5 shipped personas. */
const FULL_PERSONA_SET: readonly PersonaDef[] = PERSONAS;

/**
 * Interleave a persona × cli matrix so consecutive cells cycle through
 * CLIs. Under a global concurrency limiter, the in-flight set will contain
 * at most 1 cell per CLI as long as concurrency ≤ number of CLIs. This
 * prevents rate-limit bursts on any single provider (pre-M10 roundtable
 * CRITICAL finding).
 *
 * Given personas=[RP, GO] and clis=[claude, codex, gemini], the output is:
 *   [claude/RP, codex/RP, gemini/RP, claude/GO, codex/GO, gemini/GO]
 *
 * NOT [claude/RP, claude/GO, codex/RP, codex/GO, ...] which would burst
 * both claude calls at once under max=3 concurrency.
 */
function buildInterleavedMatrix(
  clis: readonly CliName[],
  personas: readonly PersonaDef[],
): Array<{ cli: CliName; persona: PersonaDef }> {
  const cells: Array<{ cli: CliName; persona: PersonaDef }> = [];
  for (const persona of personas) {
    for (const cli of clis) {
      cells.push({ cli, persona });
    }
  }
  return cells;
}

export interface CouncilViewResult {
  id: string;
  session_id: string;
  model: string;
  persona: string;
  confidence: number | null;
  failure_reason: FailureReason | null;
  content_vault_path: string;
}

export interface RunCouncilResult {
  session_id: string;
  mode: CouncilMode;
  purpose: CouncilSessionPurpose;
  outcome_id: string | null;
  synthesis_vault_path: string;
  views: CouncilViewResult[];
  failed_any: boolean;
  status: 'success' | 'failed';
  /** v0.2 D2 — set when the session was bound to (or auto-created) a freeze. */
  freeze_id: string | null;
}

export class CouncilOrchestratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouncilOrchestratorError';
  }
}

export async function runCouncil(
  db: IdeasDatabase,
  vault_path: string,
  input: RunCouncilInput,
  options: RunCouncilOptions = {},
): Promise<RunCouncilResult> {
  const depth: 'light' | 'full' = input.depth ?? 'light';
  const purpose: CouncilSessionPurpose = input.purpose ?? 'predictive';

  const idea = db
    .prepare(`SELECT id, vault_path, title FROM ideas_notes WHERE id = ?`)
    .get(input.idea_id) as { id: string; vault_path: string; title: string } | undefined;
  if (!idea) {
    throw new CouncilOrchestratorError(`idea not found: ${input.idea_id}`);
  }

  // Read body from disk; graceful fallback for missing markdown
  const note = readNote(vault_path, idea.vault_path);
  const idea_body = note.exists ? note.body : '';

  const assumptions = db
    .prepare(
      `SELECT id, text, load_bearing, status FROM ideas_assumptions
        WHERE idea_id = ? AND status != 'refuted'
        ORDER BY declared_at ASC, id ASC`,
    )
    .all(input.idea_id) as Array<{
    id: string;
    text: string;
    load_bearing: number | boolean;
    status: string;
  }>;

  const normalizedAssumptions = assumptions.map((a) => ({
    id: a.id,
    text: a.text,
    load_bearing: Boolean(a.load_bearing),
  }));

  // 1. Create session (1-based index computed BEFORE insertion + 1)
  const existingSessions = listSessionsByIdea(db, input.idea_id);
  const session_index = existingSessions.length + 1;

  const { id: session_id } = createCouncilSession(db, {
    idea_id: input.idea_id,
    depth,
    mode: input.mode,
    purpose,
    outcome_id: input.outcome_id ?? null,
  });

  // 1.5 v0.2 D2 — OSF preregistration binding. Mutually exclusive options:
  //     - `freeze: true` → snapshot the idea right now, bind to this session
  //     - `freeze_id: <id>` → validate + bind a pre-existing freeze
  //     - neither → no binding (v0.1 / v0.2-alpha.1 behaviour preserved)
  const freeze_id = await resolveFreezeBinding(db, vault_path, input.idea_id, session_id, options);

  // 2. v0.2 KEYSTONE — assemble retrieval-native evidence pack ONCE per
  //    session, share across all cells. Best-effort: if the flywheel-memory
  //    subprocess can't spawn, the cells fall back to v0.1 prompt shape.
  //    The pack's sources are persisted to the ideas_council_evidence
  //    sidecar table for audit.
  const pack = await resolveEvidencePack(vault_path, idea, normalizedAssumptions, options);
  if (pack.sources.length > 0) {
    recordEvidenceSources(db, session_id, pack.sources);
    process.stderr.write(
      `[flywheel-ideas] council.run: ${pack.sources.length} evidence source(s) injected into prompt\n`,
    );
  }

  // 3. Build the interleaved matrix (persona × cli, interleaved by cli so
  //    consecutive cells cycle through providers).
  const personas =
    options.personas_override ?? (depth === 'full' ? FULL_PERSONA_SET : M8_PERSONA_SET);
  const clis =
    options.clis_override ?? (depth === 'full' ? FULL_CLI_SET : LIGHT_CLI_SET);
  const cells = buildInterleavedMatrix(clis, personas);

  const maxConcurrent = resolveMaxConcurrency(options);
  const limiter = new ConcurrencyLimiter(maxConcurrent);

  // Cost-visibility log for large runs. 30 cell dispatches × $~0.10/call is
  // real money for alpha users; surface the plan before spawning.
  const expectedDispatches = cells.length * 2; // two-pass
  if (cells.length >= 6) {
    process.stderr.write(
      `[flywheel-ideas] council.run depth=${depth}: ${cells.length} cells × 2 passes = ${expectedDispatches} dispatches, max concurrency ${maxConcurrent}\n`,
    );
  }

  const settled = await Promise.allSettled(
    cells.map((cell) =>
      limiter.run(() =>
        runCouncilCell(db, vault_path, {
          session_id,
          session_index,
          idea: { id: idea.id, title: idea.title, body: idea_body },
          persona: cell.persona,
          mode: input.mode,
          assumptions: normalizedAssumptions,
          cli: cell.cli,
          approval_scope: input.approval_scope,
          options,
          evidence: pack.evidence,
        }),
      ),
    ),
  );

  const viewResults: CouncilViewResult[] = [];
  const parsedStances = new Map<string, CouncilStance>();
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      viewResults.push(r.value.summary);
      if (r.value.stance) parsedStances.set(r.value.summary.id, r.value.stance);
    } else {
      // runCouncilCell is designed never to throw — if we see a rejection
      // here it's an unrecovered bug. Surface it rather than silently drop.
      throw r.reason instanceof Error
        ? r.reason
        : new Error(`council cell rejected unexpectedly: ${String(r.reason)}`);
    }
  }

  // 3. Render + write synthesis
  const session: CouncilSessionRow = {
    id: session_id,
    idea_id: input.idea_id,
    depth,
    mode: input.mode,
    purpose,
    outcome_id: input.outcome_id ?? null,
    started_at: existingSessions[0]?.started_at ?? Date.now(),
    completed_at: null,
    synthesis_vault_path: null,
  };
  // Refresh session from DB to get authoritative started_at
  const freshSession = db
    .prepare(
      `SELECT id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path
               , purpose, outcome_id
         FROM ideas_council_sessions WHERE id = ?`,
    )
    .get(session_id) as CouncilSessionRow | undefined;
  if (freshSession) Object.assign(session, freshSession);

  const viewsForSynthesis: CouncilViewRow[] = listViewsBySession(db, session_id);
  const synthesisBody = renderSynthesisMarkdown({
    session,
    views: viewsForSynthesis,
    stances: parsedStances,
    idea_title: idea.title,
    idea_id: input.idea_id,
  });
  const synthesis = await writeSynthesis({
    vault_path,
    session_id,
    idea_id: input.idea_id,
    session_index,
    content: synthesisBody,
  });

  // 4. v0.2 D8 — extract + persist + render the argument map alongside the synthesis.
  //    Best-effort: failure to write the sidecar / file does not abort the session.
  try {
    const tree = extractArgumentTree({
      session_id,
      views: viewsForSynthesis,
      stances: parsedStances,
    });
    recordArgumentMap(db, tree);
    const argumentMd = renderArgumentMapMarkdown(tree, idea.title);
    const synth_dir = synthesis.relative_path.replace(/\/SYNTHESIS\.md$/, '');
    if (synth_dir !== synthesis.relative_path) {
      // Write ARGUMENT_MAP.md as a sibling to SYNTHESIS.md.
      await writeNoteDirect(
        vault_path,
        `${synth_dir}/ARGUMENT_MAP.md`,
        { type: 'argument_map', session_id, generated_at: tree.generated_at_iso },
        argumentMd,
      );
    }
  } catch (err) {
    process.stderr.write(
      `[flywheel-ideas] council.run: argument-map generation failed (${(err as Error).message}); session continues without it\n`,
    );
  }

  // 5. Complete session
  completeCouncilSession(db, session_id, {
    synthesis_vault_path: synthesis.relative_path,
  });

  const failed_any = viewResults.some((v) => v.failure_reason != null);
  return {
    session_id,
    mode: input.mode,
    purpose,
    outcome_id: input.outcome_id ?? null,
    synthesis_vault_path: synthesis.relative_path,
    views: viewResults,
    failed_any,
    status: failed_any ? 'failed' : 'success',
    freeze_id,
  };
}

// ---------- per-cell orchestration ----------

interface RunCellInput {
  session_id: string;
  session_index: number;
  idea: { id: string; title: string; body: string };
  persona: PersonaDef;
  mode: CouncilMode;
  assumptions: Array<{ id: string; text: string; load_bearing: boolean }>;
  cli: CliName;
  approval_scope: ApprovalScope;
  options: RunCouncilOptions;
  /** v0.2 KEYSTONE — pre-assembled evidence pack shared across all cells in a session. */
  evidence: string | null;
}

interface RunCellResult {
  summary: CouncilViewResult;
  stance: CouncilStance | null;
}

interface PassOutcome {
  parsed: CouncilStance | null;
  failure_reason: FailureReason | null;
  stderrForLog: string;
  stdout_tail: string;
  input_hash: string;
  argv: string[];
}

async function executePass(
  db: IdeasDatabase,
  input: RunCellInput,
  passNum: 1 | 2,
  pass1_stance: string | undefined,
): Promise<PassOutcome> {
  const prompt = assemblePrompt({
    persona: input.persona,
    mode: input.mode,
    idea_title: input.idea.title,
    idea_body: input.idea.body,
    assumptions: input.assumptions,
    pass: passNum,
    pass1_stance,
    evidence: input.evidence,
  });
  const input_hash = `sha256:${createHash('sha256').update(prompt.digest_material).digest('hex')}`;

  const model = resolveModelForCli(input.options, input.cli);
  const argv = buildArgvForCli(input.cli, model, prompt.system);
  const stdinPayload = buildStdinForCli(input.cli, prompt.system, prompt.user);
  const timeout_ms = resolveTimeout(input.options);

  const dispatch = logDispatchStart(db, {
    session_id: input.session_id,
    cli: input.cli,
    argv,
    approval_scope: input.approval_scope,
  });

  let spawnResult;
  try {
    spawnResult = await spawnCliCell({
      cli: input.cli,
      argv,
      stdin_prompt: stdinPayload,
      timeout_ms,
      spawn_prefix: resolveSpawnPrefix(input.options, input.cli),
    });
  } finally {
    logDispatchFinish(db, dispatch.id);
  }

  let failure_reason: FailureReason | null = null;
  let parsed: CouncilStance | null = null;
  let stderrForLog = spawnResult.stderr_tail;

  if (
    spawnResult.was_killed_by_dispatcher ||
    spawnResult.signal ||
    spawnResult.exit_code !== 0
  ) {
    const classification = classifyCliError(input.cli, {
      exit_code: spawnResult.exit_code,
      signal: spawnResult.signal,
      stdout_tail: spawnResult.stdout_tail,
      stderr_tail: spawnResult.stderr_tail,
      was_killed_by_dispatcher: spawnResult.was_killed_by_dispatcher,
    });
    failure_reason = classification.reason;
  } else {
    const parseResult = parseForCli(input.cli, spawnResult.stdout);
    if (parseResult.ok) {
      parsed = parseResult.stance;
      if (passNum === 2 && !parsed.self_critique) {
        // Model disobedience: Pass 2 response lacks self_critique. Not a
        // parse failure (schema allows it) — but surface as stderr diagnostic
        // so the audit trail shows the gap.
        stderrForLog = stderrForLog.length
          ? `${stderrForLog}\n[pass2] missing self_critique field (model disobeyed directive)`
          : '[pass2] missing self_critique field (model disobeyed directive)';
      }
    } else {
      failure_reason = 'parse';
      stderrForLog = stderrForLog.length
        ? `${stderrForLog}\n[parse] ${parseResult.detail}`
        : `[parse] ${parseResult.detail}`;
    }
  }

  return {
    parsed,
    failure_reason,
    stderrForLog,
    stdout_tail: spawnResult.stdout_tail,
    input_hash,
    argv,
  };
}

async function runCouncilCell(
  db: IdeasDatabase,
  vault_path: string,
  input: RunCellInput,
): Promise<RunCellResult> {
  const content_vault_path = buildViewNotePath(
    input.idea.id,
    input.session_index,
    input.cli,
    input.persona.id,
  );

  // Pass 1 — initial stance (no Pass 1 output to inject)
  const pass1 = await executePass(db, input, 1, undefined);

  // If Pass 1 failed at spawn or parse level, persist a failed view row and
  // skip Pass 2 (no point in a critique pass with no stance to critique).
  if (pass1.failure_reason || !pass1.parsed) {
    const noteFrontmatter = baseNoteFrontmatter(input, pass1.input_hash, null, pass1.failure_reason);
    const noteBody = buildViewNoteBody({
      pass1: null,
      pass2: null,
      failure_reason: pass1.failure_reason,
      stderrForLog: pass1.stderrForLog,
      stdout_tail: pass1.stdout_tail,
    });
    await writeNote(vault_path, content_vault_path, noteFrontmatter, noteBody, { overwrite: true });

    const view = persistCouncilView(db, {
      session_id: input.session_id,
      model: input.cli,
      persona: input.persona.id,
      prompt_version: PROMPT_VERSION,
      persona_version: PERSONA_VERSION,
      model_version: await probeCliVersion(input.cli),
      input_hash: pass1.input_hash,
      initial_stance: null,
      stance: null,
      self_critique: null,
      confidence: null,
      most_vulnerable_assumption_id: null,
      content_vault_path,
      failure_reason: pass1.failure_reason,
      stderr_tail: pass1.stderrForLog || null,
    });
    return {
      summary: {
        id: view.id,
        session_id: input.session_id,
        model: input.cli,
        persona: input.persona.id,
        confidence: null,
        failure_reason: pass1.failure_reason,
        content_vault_path,
      },
      stance: null,
    };
  }

  // Pass 1 succeeded — proceed to Pass 2 with Pass 1 stance injected.
  const pass2 = await executePass(db, input, 2, pass1.parsed.stance);

  // Final view row combines both passes:
  // - initial_stance = Pass 1 stance (always populated now we reached here)
  // - stance + self_critique = Pass 2 values if Pass 2 succeeded, else null
  // - confidence = Pass 2 confidence (authoritative revision) if present, else Pass 1
  // - failure_reason = Pass 2's failure if it had one; null on full success
  const combinedStance = pass2.parsed?.stance ?? null;
  const combinedSelfCritique = pass2.parsed?.self_critique ?? null;
  const combinedConfidence = pass2.parsed?.confidence ?? pass1.parsed.confidence;
  const combinedFailureReason = pass2.failure_reason;
  // Concatenate stderr from both passes for audit visibility on Pass 2 failures
  const combinedStderr =
    pass2.stderrForLog && pass2.stderrForLog !== pass1.stderrForLog
      ? pass1.stderrForLog
        ? `[pass1]\n${pass1.stderrForLog}\n[pass2]\n${pass2.stderrForLog}`
        : pass2.stderrForLog
      : pass1.stderrForLog;

  const noteFrontmatter = baseNoteFrontmatter(
    input,
    pass2.input_hash,
    combinedConfidence,
    combinedFailureReason,
  );
  const noteBody = buildViewNoteBody({
    pass1: pass1.parsed,
    pass2: pass2.parsed,
    failure_reason: combinedFailureReason,
    stderrForLog: combinedStderr,
    stdout_tail: pass2.stdout_tail,
  });
  await writeNote(vault_path, content_vault_path, noteFrontmatter, noteBody, { overwrite: true });

  const view = persistCouncilView(db, {
    session_id: input.session_id,
    model: input.cli,
    persona: input.persona.id,
    prompt_version: PROMPT_VERSION,
    persona_version: PERSONA_VERSION,
    model_version: await probeCliVersion(input.cli),
    // input_hash records Pass 2 (the authoritative pass for the final stance).
    // Pass 1's hash lives in the ideas_dispatches row's argv for audit.
    input_hash: pass2.input_hash,
    initial_stance: pass1.parsed.stance,
    stance: combinedStance,
    self_critique: combinedSelfCritique,
    confidence: combinedConfidence,
    most_vulnerable_assumption_id: normalizeMostVulnerableAssumptionId(
      input.assumptions,
      pass2.parsed?.metacognitive_reflection.most_vulnerable_assumption ??
        pass1.parsed.metacognitive_reflection.most_vulnerable_assumption ??
        null,
    ),
    content_vault_path,
    failure_reason: combinedFailureReason,
    stderr_tail: combinedStderr || null,
  });

  // Citations come from Pass 2 (the revised authoritative view).
  // If Pass 2 failed, fall back to Pass 1's citations so the edges aren't lost.
  const citations = pass2.parsed?.assumptions_cited ?? pass1.parsed.assumptions_cited;
  if (citations.length > 0) {
    insertAssumptionCitations(db, view.id, citations);
  }

  return {
    summary: {
      id: view.id,
      session_id: input.session_id,
      model: input.cli,
      persona: input.persona.id,
      confidence: combinedConfidence,
      failure_reason: combinedFailureReason,
      content_vault_path,
    },
    // Return the Pass 2 stance (or fall back to Pass 1 if Pass 2 failed) so
    // the synthesis can render the authoritative revision.
    stance: pass2.parsed ?? pass1.parsed,
  };
}

function normalizeMostVulnerableAssumptionId(
  assumptions: Array<{ id: string }>,
  value: string | null,
): string | null {
  if (!value || value.trim() === '') return null;
  return assumptions.some((assumption) => assumption.id === value) ? value : null;
}

function baseNoteFrontmatter(
  input: RunCellInput,
  input_hash: string,
  confidence: number | null,
  failure_reason: FailureReason | null,
): Record<string, unknown> {
  return {
    type: 'council_view',
    session_id: input.session_id,
    idea_id: input.idea.id,
    model: input.cli,
    persona: input.persona.id,
    persona_name: input.persona.name,
    mode: input.mode,
    prompt_version: PROMPT_VERSION,
    persona_version: PERSONA_VERSION,
    input_hash,
    failure_reason: failure_reason ?? null,
    confidence,
  };
}

// ---------- helpers ----------

function resolveModelForCli(options: RunCouncilOptions, cli: CliName): string {
  // Precedence: per-CLI override → legacy claude override (claude only) →
  // per-CLI env var → legacy generic env var → per-CLI default.
  const perCli = options.model_overrides?.[cli];
  if (perCli) return perCli;
  if (cli === 'claude' && options.model_override) return options.model_override;

  const envVar = `FLYWHEEL_IDEAS_${cli.toUpperCase()}_MODEL`;
  const fromCliEnv = process.env[envVar];
  if (fromCliEnv) return fromCliEnv;

  if (cli === 'claude' && process.env.FLYWHEEL_IDEAS_CELL_MODEL) {
    return process.env.FLYWHEEL_IDEAS_CELL_MODEL;
  }

  if (cli === 'claude') return CLAUDE_MODEL_DEFAULT;
  if (cli === 'codex') return CODEX_MODEL_DEFAULT;
  return GEMINI_MODEL_DEFAULT;
}

function resolveSpawnPrefix(options: RunCouncilOptions, cli: CliName): string[] | undefined {
  // Per-CLI overrides win. Legacy `spawn_override` applies to claude only
  // (the M8 single-CLI assumption).
  const perCli = options.spawn_overrides?.[cli];
  if (perCli) return perCli;
  if (cli === 'claude' && options.spawn_override) return options.spawn_override;
  return undefined;
}

function resolveMaxConcurrency(options: RunCouncilOptions): number {
  if (options.max_concurrency_override !== undefined && options.max_concurrency_override > 0) {
    return options.max_concurrency_override;
  }
  const raw = process.env.FLYWHEEL_IDEAS_MAX_CONCURRENCY;
  if (!raw) return DEFAULT_CONCURRENCY;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CONCURRENCY;
}

function resolveTimeout(options: RunCouncilOptions): number {
  if (options.timeout_ms_override !== undefined) return options.timeout_ms_override;
  const raw = process.env.FLYWHEEL_IDEAS_CELL_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

/**
 * v0.2 D2 — resolve the OSF freeze binding for a council session.
 *
 * Three paths:
 *   - `freeze: true` → create a fresh freeze snapshotting the idea + open
 *     assumptions right now, bind it to this council session. Returns the
 *     new freeze_id.
 *   - `freeze_id: <id>` → look up the existing freeze, validate it
 *     references this idea, bind it to the session. Returns the same id.
 *   - neither → return null (v0.1 / v0.2-alpha.1 behaviour preserved).
 *
 * Throws CouncilOrchestratorError on conflicts (both options set; freeze_id
 * doesn't exist; freeze_id belongs to a different idea; freeze already
 * bound to a different session).
 */
async function resolveFreezeBinding(
  db: IdeasDatabase,
  vault_path: string,
  idea_id: string,
  session_id: string,
  options: RunCouncilOptions,
): Promise<string | null> {
  if (options.freeze && options.freeze_id) {
    throw new CouncilOrchestratorError(
      'council.run accepts either `freeze: true` (auto-create) or `freeze_id` (bind existing) — not both',
    );
  }
  if (options.freeze) {
    const fr = createFreeze(db, vault_path, idea_id, { council_session_id: session_id });
    return fr.id;
  }
  if (options.freeze_id) {
    const existing = getFreeze(db, options.freeze_id);
    if (!existing) {
      throw new CouncilOrchestratorError(`freeze_id not found: ${options.freeze_id}`);
    }
    if (existing.idea_id !== idea_id) {
      throw new CouncilOrchestratorError(
        `freeze_id ${options.freeze_id} belongs to idea ${existing.idea_id}, not ${idea_id}`,
      );
    }
    bindFreezeToCouncilSession(db, options.freeze_id, session_id);
    return options.freeze_id;
  }
  return null;
}

/**
 * v0.2 KEYSTONE — resolve the evidence pack for a council session.
 *
 * Honors test-injection (`evidence_override`, `skip_evidence`) before
 * spawning the flywheel-memory subprocess. Best-effort: any failure path
 * yields `{evidence: null, sources: []}` so the council still runs.
 */
async function resolveEvidencePack(
  vault_path: string,
  idea: { title: string; vault_path: string },
  assumptions: Array<{ id: string; text: string; load_bearing: boolean }>,
  options: RunCouncilOptions,
): Promise<EvidencePack> {
  if (options.skip_evidence) return { evidence: null, sources: [] };
  if (options.evidence_override) return options.evidence_override;

  // Read body from disk for the evidence assembler — different from the
  // body the council prompt sees (which is the idea note body); the
  // assembler only uses the title for its main search.
  const ideaForEvidence = {
    title: idea.title,
    body: '', // assembler doesn't use body today; placeholder for future expansion
    vault_path: idea.vault_path,
  };
  const assumptionsForEvidence = assumptions.map((a) => ({
    text: a.text,
    load_bearing: a.load_bearing,
  }));

  const outcome = await withEvidenceReader(
    vault_path,
    async (reader: EvidenceReader) => {
      return await assembleEvidencePack(reader, ideaForEvidence, assumptionsForEvidence);
    },
    {
      binary: options.evidence_reader_binary,
      args: options.evidence_reader_args,
    },
  );

  if (outcome.status === 'ok') return outcome.value;
  // Skipped (binary_not_found / disabled / timeout / spawn_failed) — graceful
  // degradation. Surface a one-line note to stderr so users understand why
  // their council ran without vault context.
  process.stderr.write(
    `[flywheel-ideas] council.run: evidence skipped (${outcome.reason}${outcome.detail ? `: ${outcome.detail}` : ''}) — proceeding without retrieval context\n`,
  );
  return { evidence: null, sources: [] };
}

export function buildClaudeArgv(model: string, systemPrompt: string): string[] {
  // M7 recommended invocation. System prompt on argv is the persona+rules
  // (no idea text); user message (which holds idea text) goes via stdin.
  //
  // `--bare` keeps the dispatch hermetic (no MCP servers, no plugins, no
  // session bleed) but routes auth through ANTHROPIC_API_KEY only — it
  // bypasses the Claude Code subscription. Operators who want councils
  // billed against their subscription can set
  // FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1 to drop `--bare` and let
  // claude inherit the logged-in CLI auth. Trade-off: subscription mode
  // means each spawn loads the user's MCP/plugin config.
  const argv = ['-p', '--output-format=json', `--model=${model}`, '--no-session-persistence'];
  if (process.env.FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION !== '1') {
    argv.unshift('--bare');
  }
  argv.push(`--system-prompt=${systemPrompt}`);
  return argv;
}

function buildCodexArgv(model: string, _systemPrompt: string): string[] {
  // codex `exec` has no --system-prompt flag per M7 quirks. System prompt
  // is composed into stdin via buildStdinForCli. argv carries flags only.
  return [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--ephemeral',
    '--model',
    model,
  ];
}

function buildGeminiArgv(model: string, systemPrompt: string): string[] {
  // gemini `-p <prompt>` takes the system prompt as argv; stdin appends the
  // user message. System prompt is safe in argv (persona + JSON contract, no
  // idea text). User message (which CAN contain idea text) goes via stdin.
  return ['-p', systemPrompt, '-o', 'json', '-m', model];
}

function buildArgvForCli(cli: CliName, model: string, systemPrompt: string): string[] {
  switch (cli) {
    case 'claude':
      return buildClaudeArgv(model, systemPrompt);
    case 'codex':
      return buildCodexArgv(model, systemPrompt);
    case 'gemini':
      return buildGeminiArgv(model, systemPrompt);
  }
}

function buildStdinForCli(cli: CliName, systemPrompt: string, userMessage: string): string {
  if (cli === 'claude') return userMessage;
  if (cli === 'codex') {
    // System prompt prefixed into stdin with an unambiguous delimiter.
    return `${systemPrompt}${CODEX_STDIN_DELIMITER}${userMessage}`;
  }
  // gemini: system prompt in argv via `-p`; user message appends via stdin.
  return userMessage;
}

function parseForCli(cli: CliName, stdout: string): ParseResult {
  switch (cli) {
    case 'claude':
      return parseClaudeStanceOutput(stdout);
    case 'codex':
      return parseCodexStanceOutput(stdout);
    case 'gemini':
      return parseGeminiStanceOutput(stdout);
  }
}

interface ViewNoteBodyInput {
  pass1: CouncilStance | null;
  pass2: CouncilStance | null;
  failure_reason: FailureReason | null;
  stderrForLog: string;
  stdout_tail: string;
}

function buildViewNoteBody(input: ViewNoteBodyInput): string {
  // Pass 1 failed outright — no stances to render
  if (input.failure_reason && !input.pass1) {
    const parts = [
      `# Failed cell — ${input.failure_reason}`,
      '',
      '## Stderr',
      '',
      '```',
      input.stderrForLog.trim() || '_(no stderr captured)_',
      '```',
      '',
    ];
    if (input.stdout_tail.trim()) {
      parts.push('## Stdout (tail)', '', '```', input.stdout_tail.trim(), '```', '');
    }
    return parts.join('\n');
  }

  if (!input.pass1) return '_(no stance)_\n';

  // Authoritative view: Pass 2 if succeeded, else Pass 1.
  const authoritative = input.pass2 ?? input.pass1;

  const parts = [
    '## Revised stance (Pass 2)',
    '',
    input.pass2 ? input.pass2.stance : '_(Pass 2 did not succeed; see Pass 1 below)_',
    '',
    `**Confidence:** ${authoritative.confidence.toFixed(2)}`,
    '',
  ];

  if (input.pass2?.self_critique) {
    parts.push('## Self-critique (Pass 2)', '', input.pass2.self_critique, '');
  }

  parts.push('## Initial stance (Pass 1)', '', input.pass1.stance, '');

  if (input.failure_reason) {
    parts.push(`> **Pass 2 failed:** ${input.failure_reason}`, '');
    if (input.stderrForLog.trim()) {
      parts.push('```', input.stderrForLog.trim(), '```', '');
    }
  }

  if (authoritative.key_risks.length > 0) {
    parts.push('## Key risks', '');
    for (const r of authoritative.key_risks) parts.push(`- ${r}`);
    parts.push('');
  }
  if (authoritative.fragile_insights.length > 0) {
    parts.push('## Fragile insights', '');
    for (const f of authoritative.fragile_insights) parts.push(`- ${f}`);
    parts.push('');
  }
  if (authoritative.assumptions_cited.length > 0) {
    parts.push('## Assumptions cited', '');
    for (const a of authoritative.assumptions_cited) parts.push(`- \`${a}\``);
    parts.push('');
  }
  parts.push('## Metacognitive reflection', '');
  parts.push(`- **Could be wrong if:** ${authoritative.metacognitive_reflection.could_be_wrong_if}`);
  parts.push(
    `- **Most vulnerable assumption:** \`${authoritative.metacognitive_reflection.most_vulnerable_assumption}\``,
  );
  parts.push(
    `- **Confidence rationale:** ${authoritative.metacognitive_reflection.confidence_rationale}`,
  );
  parts.push('');
  if (authoritative.evidence.length > 0) {
    parts.push('## Evidence', '');
    for (const e of authoritative.evidence) {
      parts.push(`- "${e.claim}" — ${e.source}`);
    }
    parts.push('');
  }
  return parts.join('\n');
}
