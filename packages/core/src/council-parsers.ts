/**
 * Per-CLI stdout → CouncilStance parsers (M8).
 *
 * M8 implements claude only. codex + gemini stubs throw NotYetImplemented —
 * they're wired in M9 alongside concurrency.
 *
 * Extraction is three-pass per council-implementation.md:
 *   1. Parse stdout as JSON array (claude's --output-format=json shape)
 *   2. findLast event with type: "result" → read `.result` string
 *   3. Attempt envelope extraction: raw parse, then fenced ```json block,
 *      then brace-match. Validate via zod.
 *
 * Returns a ParseResult union — never throws on bad input. Orchestrator
 * classifies the failure via classifyCliError.
 */

import { z } from 'zod';

// ---------- public types ----------

export const CouncilStanceSchema = z.object({
  stance: z.string().min(1),
  confidence: z.number().min(0).max(1),
  key_risks: z.array(z.string()),
  fragile_insights: z.array(z.string()),
  assumptions_cited: z.array(z.string()),
  evidence: z.array(
    z.object({
      claim: z.string(),
      source: z.string(),
    }),
  ),
  metacognitive_reflection: z.object({
    could_be_wrong_if: z.string(),
    most_vulnerable_assumption: z.string(),
    confidence_rationale: z.string(),
  }),
  // M9: Pass 2 responses include the model's critique of Pass 1. Optional so
  // Pass 1 envelopes (which precede the critique) stay backwards-compatible.
  // The orchestrator validates presence semantically for Pass 2 (not the
  // schema) to allow model-disobedience to surface as a warning, not a
  // parse failure.
  self_critique: z.string().optional(),
});

export type CouncilStance = z.infer<typeof CouncilStanceSchema>;

export type ParseResult =
  | { ok: true; stance: CouncilStance }
  | {
      ok: false;
      reason: 'no_terminal_result' | 'invalid_envelope' | 'json_parse_error';
      detail: string;
    };

export class NotYetImplementedError extends Error {
  constructor(cli: string) {
    super(`parser for "${cli}" is not yet wired — lands in M10`);
    this.name = 'NotYetImplementedError';
  }
}

// ---------- claude parser ----------

/**
 * Parse claude's `--output-format=json` stdout and extract a CouncilStance
 * from the terminal event's `result` string.
 */
export function parseClaudeStanceOutput(stdout: string): ParseResult {
  if (stdout.trim() === '') {
    return { ok: false, reason: 'json_parse_error', detail: 'empty stdout' };
  }

  let events: unknown;
  try {
    events = JSON.parse(stdout);
  } catch (err) {
    return {
      ok: false,
      reason: 'json_parse_error',
      detail: `outer parse failed: ${(err as Error).message}`,
    };
  }

  if (!Array.isArray(events)) {
    return {
      ok: false,
      reason: 'json_parse_error',
      detail: 'expected stdout to be a JSON array of events',
    };
  }

  const terminal = [...events].reverse().find(
    (e): e is { type: 'result'; result: string } =>
      typeof e === 'object' &&
      e !== null &&
      (e as { type?: unknown }).type === 'result' &&
      typeof (e as { result?: unknown }).result === 'string',
  );

  if (!terminal) {
    return {
      ok: false,
      reason: 'no_terminal_result',
      detail: 'no event with type="result" and string `result` field',
    };
  }

  return extractEnvelopeFromText(terminal.result);
}

// ---------- envelope extraction ----------

function extractEnvelopeFromText(raw: string): ParseResult {
  const trimmed = raw.trim();

  const candidates: string[] = [];
  candidates.push(trimmed);

  // Fenced ```json block
  const fenced = trimmed.match(/```json\s*\n([\s\S]*?)\n```/);
  if (fenced) candidates.push(fenced[1].trim());

  // Any fenced block (some models drop the language tag)
  const anyFence = trimmed.match(/```\s*\n([\s\S]*?)\n```/);
  if (anyFence) candidates.push(anyFence[1].trim());

  // First complete {...} via brace balance
  const braceMatch = extractBalancedObject(trimmed);
  if (braceMatch) candidates.push(braceMatch);

  let lastParseErr = '';
  let lastValidationErr = '';
  for (const candidate of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch (err) {
      lastParseErr = (err as Error).message;
      continue;
    }
    const result = CouncilStanceSchema.safeParse(parsed);
    if (result.success) {
      return { ok: true, stance: result.data };
    }
    lastValidationErr = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  }

  if (lastValidationErr) {
    return { ok: false, reason: 'invalid_envelope', detail: lastValidationErr };
  }
  return {
    ok: false,
    reason: 'json_parse_error',
    detail: lastParseErr || 'no JSON candidate parsed',
  };
}

function extractBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// ---------- codex / gemini stubs (M9) ----------

export function parseCodexStanceOutput(_stdout: string): ParseResult {
  throw new NotYetImplementedError('codex');
}

export function parseGeminiStanceOutput(_stdout: string): ParseResult {
  throw new NotYetImplementedError('gemini');
}
