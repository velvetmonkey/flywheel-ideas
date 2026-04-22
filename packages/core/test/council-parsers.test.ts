import { describe, it, expect } from 'vitest';
import {
  NotYetImplementedError,
  parseClaudeStanceOutput,
  parseCodexStanceOutput,
  parseGeminiStanceOutput,
  type CouncilStance,
} from '../src/index.js';

const validEnvelope: CouncilStance = {
  stance: 'This switches risk concentration from many small bills to a few big ones.',
  confidence: 0.65,
  key_risks: ['Budget surprise at top accounts', 'Churn on variable bill spikes'],
  fragile_insights: ['Cost-to-serve is sub-linear'],
  assumptions_cited: ['asm-a1', 'asm-a2'],
  evidence: [
    { claim: 'Usage-based converts better at the top', source: 'vault://ref/claim1' },
    { claim: 'Churn spikes on surprise bills', source: 'https://example.com/study' },
  ],
  metacognitive_reflection: {
    could_be_wrong_if: 'Top accounts prefer predictability',
    most_vulnerable_assumption: 'asm-a1',
    confidence_rationale: 'Base rate for pricing changes is uncertain',
  },
};

function claudeStdoutFromResult(resultStr: string): string {
  return JSON.stringify([
    { type: 'system', subtype: 'init', session_id: 'x' },
    { type: 'result', subtype: 'success', result: resultStr },
  ]);
}

describe('parseClaudeStanceOutput — success paths', () => {
  it('extracts a valid envelope from the terminal result field', () => {
    const stdout = claudeStdoutFromResult(JSON.stringify(validEnvelope));
    const result = parseClaudeStanceOutput(stdout);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stance.stance).toBe(validEnvelope.stance);
      expect(result.stance.confidence).toBeCloseTo(0.65);
    }
  });

  it('extracts envelope wrapped in fenced ```json block', () => {
    const wrapped = `Here is my answer:\n\n\`\`\`json\n${JSON.stringify(validEnvelope)}\n\`\`\``;
    const stdout = claudeStdoutFromResult(wrapped);
    const result = parseClaudeStanceOutput(stdout);
    expect(result.ok).toBe(true);
  });

  it('extracts envelope wrapped in bare ``` block', () => {
    const wrapped = `\`\`\`\n${JSON.stringify(validEnvelope)}\n\`\`\``;
    const stdout = claudeStdoutFromResult(wrapped);
    const result = parseClaudeStanceOutput(stdout);
    expect(result.ok).toBe(true);
  });

  it('falls back to brace match when envelope has surrounding prose', () => {
    const wrapped = `Sure, here's my stance:\n${JSON.stringify(validEnvelope)}\n\nLet me know if you want more.`;
    const stdout = claudeStdoutFromResult(wrapped);
    const result = parseClaudeStanceOutput(stdout);
    expect(result.ok).toBe(true);
  });
});

describe('parseClaudeStanceOutput — failure paths', () => {
  it('empty stdout → json_parse_error', () => {
    const r = parseClaudeStanceOutput('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('json_parse_error');
  });

  it('non-JSON stdout → json_parse_error', () => {
    const r = parseClaudeStanceOutput('not json at all');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('json_parse_error');
  });

  it('valid JSON but not an array → json_parse_error', () => {
    const r = parseClaudeStanceOutput('{"type":"result","result":"x"}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('json_parse_error');
  });

  it('array with no terminal result event → no_terminal_result', () => {
    const stdout = JSON.stringify([{ type: 'system', subtype: 'init' }]);
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_terminal_result');
  });

  it('result string is not JSON → json_parse_error', () => {
    const stdout = claudeStdoutFromResult('just some prose');
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('json_parse_error');
  });

  it('missing required field in envelope → invalid_envelope', () => {
    const { stance, ...partial } = validEnvelope;
    const stdout = claudeStdoutFromResult(JSON.stringify(partial));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_envelope');
      expect(r.detail.toLowerCase()).toContain('stance');
    }
  });

  it('confidence > 1 → invalid_envelope', () => {
    const bad = { ...validEnvelope, confidence: 1.5 };
    const stdout = claudeStdoutFromResult(JSON.stringify(bad));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_envelope');
  });

  it('evidence.source non-string → invalid_envelope', () => {
    const bad = {
      ...validEnvelope,
      evidence: [{ claim: 'x', source: 42 as unknown as string }],
    };
    const stdout = claudeStdoutFromResult(JSON.stringify(bad));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_envelope');
  });

  it('result event prefers the LAST matching entry', () => {
    const first = JSON.stringify({ ...validEnvelope, stance: 'FIRST' });
    const last = JSON.stringify({ ...validEnvelope, stance: 'LAST' });
    const stdout = JSON.stringify([
      { type: 'result', result: first },
      { type: 'assistant', message: 'noise' },
      { type: 'result', result: last },
    ]);
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stance.stance).toBe('LAST');
  });
});

describe('codex / gemini stubs', () => {
  it('codex parser throws NotYetImplementedError', () => {
    expect(() => parseCodexStanceOutput('')).toThrow(NotYetImplementedError);
  });

  it('gemini parser throws NotYetImplementedError', () => {
    expect(() => parseGeminiStanceOutput('')).toThrow(NotYetImplementedError);
  });

  it('NotYetImplementedError message references a future milestone', () => {
    try {
      parseCodexStanceOutput('');
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toMatch(/M(9|10)/);
    }
  });
});

// ---------------------------------------------------------------------------
// Pass 2 envelope schema — self_critique optional for backwards compat (M9)
// ---------------------------------------------------------------------------

describe('CouncilStance schema — self_critique (M9)', () => {
  it('Pass 1 envelope WITHOUT self_critique validates (backwards compat)', () => {
    const stdout = claudeStdoutFromResult(JSON.stringify(validEnvelope));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stance.self_critique).toBeUndefined();
  });

  it('Pass 2 envelope WITH self_critique validates', () => {
    const pass2 = { ...validEnvelope, self_critique: 'On reflection, I may have overweighted risk.' };
    const stdout = claudeStdoutFromResult(JSON.stringify(pass2));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stance.self_critique).toBe('On reflection, I may have overweighted risk.');
    }
  });

  it('self_critique present but non-string → invalid_envelope', () => {
    const bad = { ...validEnvelope, self_critique: 42 as unknown as string };
    const stdout = claudeStdoutFromResult(JSON.stringify(bad));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(false);
  });

  it('empty string self_critique is valid (edge case, model may skimp)', () => {
    const minimal = { ...validEnvelope, self_critique: '' };
    const stdout = claudeStdoutFromResult(JSON.stringify(minimal));
    const r = parseClaudeStanceOutput(stdout);
    expect(r.ok).toBe(true);
  });
});
