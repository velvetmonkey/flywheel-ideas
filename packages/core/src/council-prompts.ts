/**
 * Council prompt assembly.
 *
 * Light-depth runs use 2 personas: Risk Pessimist + Growth Optimist. Full
 * depth adds 3 more (the M10 5-persona set). Three modes:
 *  - `standard` — attack assumptions from persona's default stance
 *  - `pre_mortem` — assume the idea failed 12 months out, work backwards
 *  - `steelman` — argue the strongest possible case FOR the idea; defend
 *    each assumption with the best version of why it holds. Counterweight
 *    to pre_mortem; prevents users training into permanent pessimism.
 *    (v0.2 D3, per the rigor-imports section of roadmap-v0-2.)
 *
 * Each cell runs the mandatory two-pass metacognitive structure — Pass 1
 * `initial_stance`, Pass 2 `self_critique` + revised `stance` — both
 * persisted to the view row.
 *
 * Prompts are deterministic. `PROMPT_VERSION` bumps when any template changes
 * so `ideas_council_views.prompt_version` is comparable across time.
 */

// v1.2.0 — added anti_portfolio retrospective mode.
export const PROMPT_VERSION = '1.2.0';
export const PERSONA_VERSION = '1.0.0';

export type CouncilMode = 'standard' | 'pre_mortem' | 'steelman' | 'anti_portfolio';

export interface PersonaDef {
  /** Stable machine-key used in file paths + DB rows: `risk-pessimist` */
  id: string;
  /** Human-facing name: `Risk Pessimist` */
  name: string;
  /** One-line role description, rendered into the system prompt. */
  description: string;
}

/** v0.1 council matrix ships 5 personas; M8 dispatches only the first two. */
export const PERSONAS: readonly PersonaDef[] = [
  {
    id: 'risk-pessimist',
    name: 'Risk Pessimist',
    description:
      'identifies downside and failure modes; overlooks opportunity cost.',
  },
  {
    id: 'growth-optimist',
    name: 'Growth Optimist',
    description:
      'sees upside and creative alternatives; misses execution risk.',
  },
  {
    id: 'competitor-strategist',
    name: 'Competitor Strategist',
    description:
      'reasons about market dynamics and competitive response; overestimates rationality.',
  },
  {
    id: 'regulator',
    name: 'Regulator',
    description:
      'surfaces legal and compliance exposure; overweights unlikely regulations.',
  },
  {
    id: 'customer-advocate',
    name: 'Customer Advocate',
    description:
      'centers user value and end-to-end experience; ignores unit economics.',
  },
] as const;

export const M8_PERSONA_SET: ReadonlyArray<PersonaDef> = [PERSONAS[0], PERSONAS[1]];

const JSON_ENVELOPE_CONTRACT = `Respond with EXACTLY this JSON envelope and nothing else. No prose before or after. No markdown fences. No code blocks.

{
  "stance": "<your answer, 2-5 paragraphs, in your persona's voice>",
  "confidence": <number between 0.0 and 1.0>,
  "key_risks": ["<risk 1>", "<risk 2>"],
  "fragile_insights": ["<insight vulnerable to assumption failure>"],
  "assumptions_cited": ["<assumption id like asm-abc>"],
  "evidence": [{"claim": "<claim>", "source": "<url | vault://path | citation>"}],
  "metacognitive_reflection": {
    "could_be_wrong_if": "<evidence that would falsify your stance>",
    "most_vulnerable_assumption": "<assumption id>",
    "confidence_rationale": "<why this confidence number>"
  }
}`;

const PRE_MORTEM_PREFIX = `Assume this idea has failed 12 months from now. Work backwards — what went wrong? Attack every declared assumption as a candidate cause.

---

`;

// v0.2 D3 — counterweight to pre_mortem. Forces personas to surface the
// strongest possible affirmative case so the user isn't trained into
// permanent pessimism by repeated pre_mortem dispatches.
const STEELMAN_PREFIX = `Assume this idea succeeded 12 months from now. Work backwards — why? Argue the strongest possible affirmative case. For every declared assumption, articulate the best version of why it held and what evidence supports that conclusion. Your persona's default skepticism is suspended for this run; channel it into finding the most compelling defense, not the most compelling attack.

---

`;

const ANTI_PORTFOLIO_PREFIX = `This is a retrospective anti-portfolio review. Reality has already refuted one or more assumptions behind the idea. Your job is not to decide whether the bet is good now; your job is to diagnose what was wrong, which assumption failed, and how the lesson should be stated so future decisions improve.

---

`;

export interface PromptInput {
  persona: PersonaDef;
  mode: CouncilMode;
  idea_title: string;
  idea_body: string;
  assumptions: Array<{
    id: string;
    text: string;
    load_bearing: boolean;
  }>;
  /**
   * Which pass. Defaults to 1 (backwards-compatible with M8 single-pass
   * callers). Pass 2 requires `pass1_stance` to inject; pass 1 omits it.
   */
  pass?: 1 | 2;
  /**
   * The full Pass 1 stance text (the envelope's `stance` field, not the
   * whole response). Required when `pass` is 2.
   */
  pass1_stance?: string;
  /**
   * Pre-assembled markdown evidence pack from flywheel-memory (v0.2 KEYSTONE
   * — retrieval-native council input). Injected into the user message after
   * the declared assumptions block, before the "Attack each assumption"
   * instruction. When undefined or null, the prompt has the v0.1 shape (no
   * evidence section). Asssembled once per `runCouncil` and shared across
   * cells.
   */
  evidence?: string | null;
}

export interface AssembledPrompt {
  system: string;
  user: string;
  /** Stable-input digest material — for hashing. Excludes any timestamps. */
  digest_material: string;
}

const PASS_2_REFLECTION = `---

Your Pass 1 stance was:

{PASS1_STANCE}

Now reflect critically on your own answer:
  (a) Could you be wrong? What specific evidence would change your mind?
  (b) Which declared assumption are you most vulnerable on?
  (c) What counter-argument haven't you surfaced yet?

Respond with the SAME JSON envelope, but now include:
  - "stance": your REVISED stance (may be unchanged from Pass 1; may differ)
  - "self_critique": your honest critique of Pass 1 (REQUIRED in Pass 2)
  - "confidence": updated number — often lower after self-critique
  - other fields: revised as appropriate`;

/**
 * Produce the system + user messages for a single council cell.
 * Deterministic — identical inputs produce identical strings.
 */
export function assemblePrompt(input: PromptInput): AssembledPrompt {
  const system = [
    `You are a ${input.persona.name} on a decision council. You ${input.persona.description}`,
    '',
    JSON_ENVELOPE_CONTRACT,
  ].join('\n');

  const assumptionsBlock =
    input.assumptions.length > 0
      ? input.assumptions
          .map(
            (a) =>
              `- [${a.id}${a.load_bearing ? ', load-bearing' : ''}] ${a.text}`,
          )
          .join('\n')
      : '_(no declared assumptions)_';

  // v0.2 KEYSTONE: evidence pack injects between the assumptions block and
  // the "Attack each assumption" instruction. Persona system prompt stays
  // pure (just role + JSON contract); evidence is task input.
  const hasEvidence = input.evidence != null && input.evidence.length > 0;
  const evidenceBlock = hasEvidence ? `\n${input.evidence}\n` : '';
  // v0.2 D3 — instruction flips under steelman to defend rather than attack.
  const taskInstruction = buildTaskInstruction(input.mode, hasEvidence);

  const userBody = [
    `Idea: ${input.idea_title}`,
    '',
    input.idea_body.trim() === '' ? '_(no body)_' : input.idea_body.trim(),
    '',
    'Declared assumptions:',
    assumptionsBlock,
    evidenceBlock,
    taskInstruction,
  ].join('\n');

  const pass1User =
    input.mode === 'pre_mortem'
      ? `${PRE_MORTEM_PREFIX}${userBody}`
      : input.mode === 'steelman'
        ? `${STEELMAN_PREFIX}${userBody}`
        : input.mode === 'anti_portfolio'
          ? `${ANTI_PORTFOLIO_PREFIX}${userBody}`
        : userBody;

  let user: string;
  const pass = input.pass ?? 1;
  if (pass === 2) {
    if (!input.pass1_stance) {
      throw new Error('assemblePrompt: pass=2 requires pass1_stance');
    }
    const reflection = PASS_2_REFLECTION.replace('{PASS1_STANCE}', input.pass1_stance);
    user = `${pass1User}\n\n${reflection}`;
  } else {
    user = pass1User;
  }

  // Digest material is the concatenation of system + user — stable, deterministic.
  // Pass 2 digest differs from Pass 1 (includes Pass 1 stance), so input_hash
  // distinguishes the two passes in ideas_dispatches.
  const digest_material = `${system}\n\n---\n\n${user}`;

  return { system, user, digest_material };
}

/**
 * Mode-aware task instruction. Steelman flips polarity (defend vs attack);
 * standard + pre_mortem keep the attack-each-assumption framing.
 */
function buildTaskInstruction(mode: CouncilMode, hasEvidence: boolean): string {
  if (mode === 'steelman') {
    const evidenceClause = hasEvidence
      ? ' Where the evidence above supports an assumption, cite it with the source path; where it might contradict, account for the contradiction in the strongest defense.'
      : '';
    return `Defend each assumption with the strongest case for why it holds. Cite assumptions by id in \`assumptions_cited\`.${evidenceClause}`;
  }
  if (mode === 'anti_portfolio') {
    const evidenceClause = hasEvidence
      ? ' Use the retrospective context and any evidence above to identify which assumption actually failed, not just which one was easiest to attack.'
      : '';
    return `Diagnose the failure retrospectively. Identify the assumption most responsible, explain what the decision-makers got wrong, and state the durable lesson. Cite assumptions by id in \`assumptions_cited\`.${evidenceClause}`;
  }
  const evidenceClause = hasEvidence
    ? ' Where the evidence above contradicts or supports an assumption, surface that explicitly with the source path.'
    : '';
  return `Attack each assumption explicitly. Cite assumptions by id in \`assumptions_cited\`.${evidenceClause}`;
}
