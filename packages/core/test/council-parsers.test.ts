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

// ---------- codex parser (M9) ----------

function codexStdoutFromAgentText(text: string, opts: { includeFailed?: boolean } = {}): string {
  const events: unknown[] = [
    { type: 'thread.started', thread_id: 'mock-thread' },
    { type: 'turn.started' },
    { type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text } },
    { type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 20 } },
  ];
  if (opts.includeFailed) {
    events.splice(3, 1, { type: 'turn.failed', error: { message: 'mock failed' } });
  }
  return events.map((e) => JSON.stringify(e)).join('\n');
}

describe('parseCodexStanceOutput — success paths', () => {
  it('extracts valid envelope from terminal agent_message text', () => {
    const stdout = codexStdoutFromAgentText(JSON.stringify(validEnvelope));
    const r = parseCodexStanceOutput(stdout);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stance.stance).toBe(validEnvelope.stance);
  });

  it('extracts envelope wrapped in fenced ```json block inside agent_message.text', () => {
    const wrapped = `Sure, here goes:\n\n\`\`\`json\n${JSON.stringify(validEnvelope)}\n\`\`\``;
    const stdout = codexStdoutFromAgentText(wrapped);
    const r = parseCodexStanceOutput(stdout);
    expect(r.ok).toBe(true);
  });

  it('skips individual malformed JSONL lines but still finds agent_message', () => {
    const events = [
      'not-json-line',
      JSON.stringify({ type: 'thread.started' }),
      'another-malformed',
      JSON.stringify({
        type: 'item.completed',
        item: { id: 'x', type: 'agent_message', text: JSON.stringify(validEnvelope) },
      }),
      JSON.stringify({ type: 'turn.completed' }),
    ];
    const r = parseCodexStanceOutput(events.join('\n'));
    expect(r.ok).toBe(true);
  });
});

describe('parseCodexStanceOutput — failure paths', () => {
  it('empty stdout → json_parse_error', () => {
    const r = parseCodexStanceOutput('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('json_parse_error');
  });

  it('all lines malformed → json_parse_error', () => {
    const r = parseCodexStanceOutput('garbage1\ngarbage2\n');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('json_parse_error');
  });

  it('turn.failed event → json_parse_error with codex-specific detail', () => {
    const events = [
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({ type: 'turn.failed', error: { message: 'some error' } }),
    ];
    const r = parseCodexStanceOutput(events.join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('json_parse_error');
      expect(r.detail).toContain('turn.failed');
    }
  });

  it('no agent_message event → no_terminal_result', () => {
    const events = [
      JSON.stringify({ type: 'thread.started' }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({ type: 'turn.completed' }),
    ];
    const r = parseCodexStanceOutput(events.join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_terminal_result');
  });

  it('agent_message.text not valid JSON → json_parse_error', () => {
    const stdout = codexStdoutFromAgentText('not-json prose');
    const r = parseCodexStanceOutput(stdout);
    expect(r.ok).toBe(false);
  });

  it('agent_message.text valid JSON but bad envelope → invalid_envelope', () => {
    const { stance, ...partial } = validEnvelope;
    const stdout = codexStdoutFromAgentText(JSON.stringify(partial));
    const r = parseCodexStanceOutput(stdout);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_envelope');
  });

  it('picks the LATEST agent_message when multiple exist', () => {
    const first = JSON.stringify({ ...validEnvelope, stance: 'FIRST' });
    const last = JSON.stringify({ ...validEnvelope, stance: 'LAST' });
    const events = [
      JSON.stringify({ type: 'item.completed', item: { id: 'a', type: 'agent_message', text: first } }),
      JSON.stringify({ type: 'item.completed', item: { id: 'b', type: 'agent_message', text: last } }),
    ];
    const r = parseCodexStanceOutput(events.join('\n'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stance.stance).toBe('LAST');
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
