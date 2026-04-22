import { describe, it, expect } from 'vitest';
import {
  assemblePrompt,
  M8_PERSONA_SET,
  PERSONAS,
  PERSONA_VERSION,
  PROMPT_VERSION,
} from '../src/index.js';

const sampleIdea = {
  idea_title: 'Switch pricing from seat to usage',
  idea_body:
    'Current seat-based pricing underserves low-volume teams and overcharges high-volume. Hypothesis: usage-based converts better at the top.',
  assumptions: [
    { id: 'asm-a1', text: 'Top-tier teams will tolerate variable bills', load_bearing: true },
    { id: 'asm-a2', text: 'Cost-to-serve scales sub-linearly with usage', load_bearing: false },
  ],
};

describe('council-prompts — constants', () => {
  it('PROMPT_VERSION + PERSONA_VERSION are non-empty', () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PERSONA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('PERSONAS ships 5 entries in stable order', () => {
    expect(PERSONAS.map((p) => p.id)).toEqual([
      'risk-pessimist',
      'growth-optimist',
      'competitor-strategist',
      'regulator',
      'customer-advocate',
    ]);
  });

  it('M8_PERSONA_SET has Risk Pessimist then Growth Optimist', () => {
    expect(M8_PERSONA_SET.map((p) => p.id)).toEqual(['risk-pessimist', 'growth-optimist']);
  });
});

describe('assemblePrompt — system prompt', () => {
  it('includes persona name + description', () => {
    const { system } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(system).toContain('Risk Pessimist');
    expect(system).toContain('identifies downside');
  });

  it('includes JSON envelope schema verbatim', () => {
    const { system } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(system).toContain('"stance"');
    expect(system).toContain('"metacognitive_reflection"');
    expect(system).toContain('"could_be_wrong_if"');
    expect(system).toContain('"most_vulnerable_assumption"');
  });

  it('is stable across runs (snapshot)', () => {
    const { system } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(system).toMatchSnapshot();
  });

  it('snapshot: Growth Optimist system prompt differs from Risk Pessimist', () => {
    const { system: s1 } = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea });
    const { system: s2 } = assemblePrompt({ persona: PERSONAS[1], mode: 'standard', ...sampleIdea });
    expect(s1).not.toBe(s2);
    expect(s2).toContain('Growth Optimist');
  });
});

describe('assemblePrompt — user message', () => {
  it('renders assumptions with id and load-bearing flag', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(user).toContain('[asm-a1, load-bearing]');
    expect(user).toContain('[asm-a2]');
    expect(user).not.toContain('[asm-a2, load-bearing]');
  });

  it('includes idea title and body verbatim', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(user).toContain(sampleIdea.idea_title);
    expect(user).toContain('usage-based converts better at the top');
  });

  it('standard mode does NOT include pre_mortem prefix', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(user).not.toContain('Assume this idea has failed');
  });

  it('pre_mortem mode prepends the failure-backwards prefix', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'pre_mortem',
      ...sampleIdea,
    });
    expect(user.startsWith('Assume this idea has failed 12 months from now')).toBe(true);
    expect(user).toContain(sampleIdea.idea_title);
  });

  it('zero-assumption idea still produces well-formed message', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      idea_title: 't',
      idea_body: 'b',
      assumptions: [],
    });
    expect(user).toContain('_(no declared assumptions)_');
    expect(user).toContain('Attack each assumption');
  });

  it('empty idea body surfaces placeholder rather than blank line', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      idea_title: 't',
      idea_body: '',
      assumptions: [],
    });
    expect(user).toContain('_(no body)_');
  });

  it('snapshot: pre_mortem user message', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'pre_mortem',
      ...sampleIdea,
    });
    expect(user).toMatchSnapshot();
  });
});

describe('assemblePrompt — digest material', () => {
  it('is deterministic (same inputs → same digest)', () => {
    const a = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea });
    const b = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea });
    expect(a.digest_material).toBe(b.digest_material);
  });

  it('differs across personas', () => {
    const a = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea });
    const b = assemblePrompt({ persona: PERSONAS[1], mode: 'standard', ...sampleIdea });
    expect(a.digest_material).not.toBe(b.digest_material);
  });

  it('differs across modes', () => {
    const a = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea });
    const b = assemblePrompt({ persona: PERSONAS[0], mode: 'pre_mortem', ...sampleIdea });
    expect(a.digest_material).not.toBe(b.digest_material);
  });
});
