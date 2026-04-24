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

  // v0.2 D3 — steelman mode flips polarity from attack to defend.
  it('steelman mode prepends the success-backwards prefix', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'steelman',
      ...sampleIdea,
    });
    expect(user).toMatch(/^Assume this idea succeeded 12 months from now/);
    expect(user).toContain('strongest possible affirmative case');
  });

  it('steelman mode swaps the task instruction to "Defend each assumption"', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'steelman',
      ...sampleIdea,
    });
    expect(user).toContain('Defend each assumption with the strongest case');
    expect(user).not.toContain('Attack each assumption');
  });

  it('standard mode keeps the attack instruction (regression guard)', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    expect(user).toContain('Attack each assumption');
    expect(user).not.toContain('Defend each assumption');
  });

  it('steelman + evidence: defend instruction includes "supports" phrasing', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'steelman',
      ...sampleIdea,
      evidence: '## Evidence retrieved from your vault\n\n### Source: x.md\n\n> Y',
    });
    expect(user).toContain('Defend each assumption');
    expect(user).toContain('Where the evidence above supports an assumption');
    expect(user).not.toContain('Where the evidence above contradicts');
  });

  it('snapshot: steelman user message', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'steelman',
      ...sampleIdea,
    });
    expect(user).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Pass 2 — M9 metacognitive structure
// ---------------------------------------------------------------------------

describe('assemblePrompt — Pass 2', () => {
  const pass1Stance = 'My initial stance is that pricing is the dominant factor.';

  it('throws when pass=2 and pass1_stance missing', () => {
    expect(() =>
      assemblePrompt({
        persona: PERSONAS[0],
        mode: 'standard',
        ...sampleIdea,
        pass: 2,
      }),
    ).toThrow(/pass=2 requires pass1_stance/);
  });

  it('Pass 2 user message embeds Pass 1 stance verbatim', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 2,
      pass1_stance: pass1Stance,
    });
    expect(user).toContain(pass1Stance);
  });

  it('Pass 2 includes all 3 reflection directives', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 2,
      pass1_stance: pass1Stance,
    });
    expect(user).toContain('Could you be wrong');
    expect(user).toContain('most vulnerable on');
    expect(user).toContain("haven't you surfaced yet");
  });

  it('Pass 2 requires self_critique in response envelope', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 2,
      pass1_stance: pass1Stance,
    });
    expect(user).toContain('self_critique');
    expect(user).toContain('REQUIRED in Pass 2');
  });

  it('Pass 2 user is strictly longer than Pass 1 (appended reflection block)', () => {
    const p1 = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea, pass: 1 });
    const p2 = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 2,
      pass1_stance: pass1Stance,
    });
    expect(p2.user.length).toBeGreaterThan(p1.user.length);
    expect(p2.user.startsWith(p1.user)).toBe(true);
  });

  it('digest_material differs between Pass 1 and Pass 2', () => {
    const p1 = assemblePrompt({ persona: PERSONAS[0], mode: 'standard', ...sampleIdea, pass: 1 });
    const p2 = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 2,
      pass1_stance: pass1Stance,
    });
    expect(p1.digest_material).not.toBe(p2.digest_material);
  });

  it('snapshot: Pass 2 user message', () => {
    const { user } = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 2,
      pass1_stance: pass1Stance,
    });
    expect(user).toMatchSnapshot();
  });

  it('pass defaults to 1 (backwards-compat with M8 callers)', () => {
    const withoutPass = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
    });
    const withPass1 = assemblePrompt({
      persona: PERSONAS[0],
      mode: 'standard',
      ...sampleIdea,
      pass: 1,
    });
    expect(withoutPass.digest_material).toBe(withPass1.digest_material);
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
