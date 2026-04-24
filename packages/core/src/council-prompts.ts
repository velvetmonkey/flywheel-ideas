/**
 * Council prompt assembly.
 *
 * Light-depth runs use 2 personas: Risk Pessimist + Growth Optimist. Full
 * depth adds 3 more (the M10 5-persona set). Two modes: `standard` (attack
 * assumptions from persona's default stance) and `pre_mortem` (assume the
 * idea failed 12 months out, work backwards).
 *
 * Each cell runs the mandatory two-pass metacognitive structure — Pass 1
 * `initial_stance`, Pass 2 `self_critique` + revised `stance` — both
 * persisted to the view row.
 *
 * Prompts are deterministic. `PROMPT_VERSION` bumps when any template changes
 * so `ideas_council_views.prompt_version` is comparable across time.
 */

export const PROMPT_VERSION = '1.0.0';
export const PERSONA_VERSION = '1.0.0';

export type CouncilMode = 'standard' | 'pre_mortem';

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
  const attackInstruction = hasEvidence
    ? 'Attack each assumption explicitly. Cite assumptions by id in `assumptions_cited`. Where the evidence above contradicts or supports an assumption, surface that explicitly with the source path.'
    : 'Attack each assumption explicitly. Cite assumptions by id in `assumptions_cited`.';

  const userBody = [
    `Idea: ${input.idea_title}`,
    '',
    input.idea_body.trim() === '' ? '_(no body)_' : input.idea_body.trim(),
    '',
    'Declared assumptions:',
    assumptionsBlock,
    evidenceBlock,
    attackInstruction,
  ].join('\n');

  const pass1User = input.mode === 'pre_mortem' ? `${PRE_MORTEM_PREFIX}${userBody}` : userBody;

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
