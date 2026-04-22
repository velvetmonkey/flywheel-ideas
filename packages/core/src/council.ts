/**
 * Council orchestrator (M8).
 *
 * `runCouncil(db, vault, input)` creates a session, iterates the M8 persona
 * set (Risk Pessimist, Growth Optimist) SEQUENTIALLY on claude, writes a
 * view-note + DB row per cell (even on failure), renders deterministic
 * SYNTHESIS.md, and returns the result.
 *
 * Single-pass per cell in M8. Two-pass (initial_stance + self_critique) is
 * deferred to M9 — the columns stay null in M8 rows. Sequential dispatch is
 * a queue-of-one; M9 layers the concurrency limiter on top.
 *
 * No real CLI spawned during tests — callers pass `options.spawn_override`
 * with `['node', '<mock-claude.mjs>']` to redirect to the mock binary.
 */

import { createHash } from 'node:crypto';
import { assemblePrompt, M8_PERSONA_SET, PERSONA_VERSION, PROMPT_VERSION } from './council-prompts.js';
import type { CouncilMode, PersonaDef } from './council-prompts.js';
import {
  parseClaudeStanceOutput,
  type CouncilStance,
} from './council-parsers.js';
import { spawnCliCell, type CliName } from './council-spawn.js';
import {
  completeCouncilSession,
  createCouncilSession,
  insertAssumptionCitations,
  listSessionsByIdea,
  listViewsBySession,
  persistCouncilView,
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
import { writeNote } from './write/direct-fs.js';
import { logDispatchFinish, logDispatchStart } from './dispatches.js';
import type { ApprovalScope } from './approval.js';

const CLAUDE_MODEL_DEFAULT = 'claude-haiku-4-5-20251001';
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 min per spec

export interface RunCouncilInput {
  idea_id: string;
  depth?: 'light' | 'full';
  mode: CouncilMode;
  /** Session-level approval scope, for persistence into the dispatch log. */
  approval_scope: ApprovalScope;
}

export interface RunCouncilOptions {
  /** Override the claude binary spawn (tests use ['node', MOCK_CLI]). */
  spawn_override?: string[];
  /** Override claude model selection (default from FLYWHEEL_IDEAS_CELL_MODEL or haiku). */
  model_override?: string;
  /** Override per-cell timeout (default from FLYWHEEL_IDEAS_CELL_TIMEOUT_MS or 15m). */
  timeout_ms_override?: number;
  /** Override the persona set (M8 defaults to M8_PERSONA_SET). */
  personas_override?: readonly PersonaDef[];
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
  synthesis_vault_path: string;
  views: CouncilViewResult[];
  failed_any: boolean;
  status: 'success' | 'failed';
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
    depth: input.depth ?? 'light',
    mode: input.mode,
  });

  // 2. Iterate personas sequentially (queue-of-one)
  const personas = options.personas_override ?? M8_PERSONA_SET;
  const viewResults: CouncilViewResult[] = [];
  const parsedStances = new Map<string, CouncilStance>();

  for (const persona of personas) {
    const result = await runCouncilCell(db, vault_path, {
      session_id,
      session_index,
      idea: { id: idea.id, title: idea.title, body: idea_body },
      persona,
      mode: input.mode,
      assumptions: normalizedAssumptions,
      cli: 'claude',
      approval_scope: input.approval_scope,
      options,
    });
    viewResults.push(result.summary);
    if (result.stance) parsedStances.set(result.summary.id, result.stance);
  }

  // 3. Render + write synthesis
  const session: CouncilSessionRow = {
    id: session_id,
    idea_id: input.idea_id,
    depth: input.depth ?? 'light',
    mode: input.mode,
    started_at: existingSessions[0]?.started_at ?? Date.now(),
    completed_at: null,
    synthesis_vault_path: null,
  };
  // Refresh session from DB to get authoritative started_at
  const freshSession = db
    .prepare(
      `SELECT id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path
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

  // 4. Complete session
  completeCouncilSession(db, session_id, {
    synthesis_vault_path: synthesis.relative_path,
  });

  const failed_any = viewResults.some((v) => v.failure_reason != null);
  return {
    session_id,
    mode: input.mode,
    synthesis_vault_path: synthesis.relative_path,
    views: viewResults,
    failed_any,
    status: failed_any ? 'failed' : 'success',
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
}

interface RunCellResult {
  summary: CouncilViewResult;
  stance: CouncilStance | null;
}

async function runCouncilCell(
  db: IdeasDatabase,
  vault_path: string,
  input: RunCellInput,
): Promise<RunCellResult> {
  const prompt = assemblePrompt({
    persona: input.persona,
    mode: input.mode,
    idea_title: input.idea.title,
    idea_body: input.idea.body,
    assumptions: input.assumptions,
  });
  const input_hash = `sha256:${createHash('sha256').update(prompt.digest_material).digest('hex')}`;

  const model = resolveModel(input.options);
  const argv = buildClaudeArgv(model, prompt.system);

  const timeout_ms = resolveTimeout(input.options);
  const content_vault_path = buildViewNotePath(
    input.idea.id,
    input.session_index,
    input.cli,
    input.persona.id,
  );

  // Dispatch audit row (start)
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
      stdin_prompt: prompt.user,
      timeout_ms,
      spawn_prefix: input.options.spawn_override,
    });
  } finally {
    logDispatchFinish(db, dispatch.id);
  }

  // Classify outcome
  let failure_reason: FailureReason | null = null;
  let stance_text: string | null = null;
  let confidence: number | null = null;
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
    const parseResult = parseClaudeStanceOutput(spawnResult.stdout);
    if (parseResult.ok) {
      parsed = parseResult.stance;
      stance_text = parsed.stance;
      confidence = parsed.confidence;
    } else {
      failure_reason = 'parse';
      // Save parse diagnostic into stderr_tail for audit visibility
      stderrForLog = stderrForLog.length
        ? `${stderrForLog}\n[parse] ${parseResult.detail}`
        : `[parse] ${parseResult.detail}`;
    }
  }

  // Write per-view markdown note
  const noteFrontmatter = {
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
  const noteBody = buildViewNoteBody({ stance: parsed, failure_reason, stderrForLog, stdout_tail: spawnResult.stdout_tail });
  await writeNote(vault_path, content_vault_path, noteFrontmatter, noteBody, {
    overwrite: true,
  });

  // Persist view row
  const view = persistCouncilView(db, {
    session_id: input.session_id,
    model: input.cli,
    persona: input.persona.id,
    prompt_version: PROMPT_VERSION,
    persona_version: PERSONA_VERSION,
    model_version: null,
    input_hash,
    initial_stance: null, // two-pass → M9
    stance: stance_text,
    self_critique: null,
    confidence,
    content_vault_path,
    failure_reason,
    stderr_tail: stderrForLog || null,
  });

  if (parsed && parsed.assumptions_cited.length > 0) {
    insertAssumptionCitations(db, view.id, parsed.assumptions_cited);
  }

  return {
    summary: {
      id: view.id,
      session_id: input.session_id,
      model: input.cli,
      persona: input.persona.id,
      confidence,
      failure_reason,
      content_vault_path,
    },
    stance: parsed,
  };
}

// ---------- helpers ----------

function resolveModel(options: RunCouncilOptions): string {
  return (
    options.model_override ??
    process.env.FLYWHEEL_IDEAS_CELL_MODEL ??
    CLAUDE_MODEL_DEFAULT
  );
}

function resolveTimeout(options: RunCouncilOptions): number {
  if (options.timeout_ms_override !== undefined) return options.timeout_ms_override;
  const raw = process.env.FLYWHEEL_IDEAS_CELL_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function buildClaudeArgv(model: string, systemPrompt: string): string[] {
  // M7 recommended invocation. System prompt on argv is the persona+rules
  // (no idea text); user message (which holds idea text) goes via stdin.
  return [
    '--bare',
    '-p',
    '--output-format=json',
    `--model=${model}`,
    '--no-session-persistence',
    `--system-prompt=${systemPrompt}`,
  ];
}

interface ViewNoteBodyInput {
  stance: CouncilStance | null;
  failure_reason: FailureReason | null;
  stderrForLog: string;
  stdout_tail: string;
}

function buildViewNoteBody(input: ViewNoteBodyInput): string {
  if (input.failure_reason) {
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
      parts.push('## Stdout (tail)');
      parts.push('');
      parts.push('```');
      parts.push(input.stdout_tail.trim());
      parts.push('```');
      parts.push('');
    }
    return parts.join('\n');
  }

  if (!input.stance) return '_(no stance)_\n';

  const parts = [
    '## Stance',
    '',
    input.stance.stance,
    '',
    `**Confidence:** ${input.stance.confidence.toFixed(2)}`,
    '',
  ];
  if (input.stance.key_risks.length > 0) {
    parts.push('## Key risks', '');
    for (const r of input.stance.key_risks) parts.push(`- ${r}`);
    parts.push('');
  }
  if (input.stance.fragile_insights.length > 0) {
    parts.push('## Fragile insights', '');
    for (const f of input.stance.fragile_insights) parts.push(`- ${f}`);
    parts.push('');
  }
  if (input.stance.assumptions_cited.length > 0) {
    parts.push('## Assumptions cited', '');
    for (const a of input.stance.assumptions_cited) parts.push(`- \`${a}\``);
    parts.push('');
  }
  parts.push('## Metacognitive reflection', '');
  parts.push(`- **Could be wrong if:** ${input.stance.metacognitive_reflection.could_be_wrong_if}`);
  parts.push(
    `- **Most vulnerable assumption:** \`${input.stance.metacognitive_reflection.most_vulnerable_assumption}\``,
  );
  parts.push(
    `- **Confidence rationale:** ${input.stance.metacognitive_reflection.confidence_rationale}`,
  );
  parts.push('');
  if (input.stance.evidence.length > 0) {
    parts.push('## Evidence', '');
    for (const e of input.stance.evidence) {
      parts.push(`- "${e.claim}" — ${e.source}`);
    }
    parts.push('');
  }
  return parts.join('\n');
}
