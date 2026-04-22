import { describe, it, expect } from 'vitest';
import {
  DEFAULT_JACCARD_THRESHOLD,
  extractOverlap,
  jaccard,
  splitSentences,
  tokenize,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

describe('splitSentences', () => {
  it('splits on period + space + capital', () => {
    expect(splitSentences('Pricing risks churn. Cost matters. Done.')).toEqual([
      'Pricing risks churn.',
      'Cost matters.',
      'Done.',
    ]);
  });

  it('splits on newlines', () => {
    expect(splitSentences('First line\nSecond line\nThird')).toEqual([
      'First line',
      'Second line',
      'Third',
    ]);
  });

  it('preserves trailing punctuation', () => {
    expect(splitSentences('Done! What now? Next step.')).toEqual([
      'Done!',
      'What now?',
      'Next step.',
    ]);
  });

  it('handles empty / whitespace input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   \n\n ')).toEqual([]);
  });

  it('normalizes excess whitespace', () => {
    expect(splitSentences('First.\n\n\n\nSecond.')).toEqual(['First.', 'Second.']);
  });
});

describe('tokenize', () => {
  it('lowercases + splits on non-alphanumeric', () => {
    expect(tokenize('Hello, World!')).toEqual(new Set(['hello', 'world']));
  });

  it('filters stopwords (the, and, is)', () => {
    expect(tokenize('The cost and risks is high')).toEqual(new Set(['cost', 'risks', 'high']));
  });

  it('filters 1-2 char tokens', () => {
    expect(tokenize('a big I go')).toEqual(new Set(['big']));
  });

  it('is a set (duplicates collapse)', () => {
    const t = tokenize('cost cost cost risk');
    expect(t.size).toBe(2);
    expect(t).toEqual(new Set(['cost', 'risk']));
  });

  it('handles empty input', () => {
    expect(tokenize('')).toEqual(new Set());
  });
});

describe('jaccard', () => {
  it('identical sets → 1.0', () => {
    const s = new Set(['a', 'b', 'c']);
    expect(jaccard(s, new Set(['a', 'b', 'c']))).toBeCloseTo(1);
  });

  it('disjoint sets → 0', () => {
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0);
  });

  it('partial overlap: 1 shared of 3 unique → 1/3', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3);
  });

  it('empty set pairs → 0', () => {
    expect(jaccard(new Set(), new Set(['a']))).toBe(0);
    expect(jaccard(new Set(['a']), new Set())).toBe(0);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// extractOverlap — the workhorse
// ---------------------------------------------------------------------------

describe('extractOverlap — agreement + disagreement extraction', () => {
  it('returns empty result for single view (no peer)', () => {
    const r = extractOverlap([
      {
        persona: 'risk-pessimist',
        persona_name: 'Risk Pessimist',
        stance: 'Pricing churn is a major concern. Migration cost balloons.',
      },
    ]);
    expect(r.agreement).toEqual([]);
    // With 1 view, every sentence is "disagreement" (nothing to compare)
    expect(r.disagreement).toHaveLength(1);
  });

  it('finds agreement when two views share obvious phrasing', () => {
    const r = extractOverlap([
      {
        persona: 'risk-pessimist',
        persona_name: 'Risk Pessimist',
        stance: 'Pricing change risks top-account churn. Customers hate surprise bills.',
      },
      {
        persona: 'regulator',
        persona_name: 'Regulator',
        stance: 'Pricing change risks top-account churn significantly. Legal exposure is limited.',
      },
    ]);
    expect(r.agreement.length).toBeGreaterThan(0);
    // The first shared sentence should attribute to both personas
    const first = r.agreement[0];
    expect(first.personas.sort()).toEqual(['regulator', 'risk-pessimist']);
    expect(first.persona_names.sort()).toEqual(['Regulator', 'Risk Pessimist']);
  });

  it('sentences with no cross-view match become disagreement, attributed to originator', () => {
    const r = extractOverlap([
      {
        persona: 'risk-pessimist',
        stance: 'Unit economics break at scale. Churn happens within first billing cycle.',
      },
      {
        persona: 'growth-optimist',
        stance: 'Top accounts will tolerate variable pricing. Retention improves long term.',
      },
    ]);
    // No shared word content → everything is disagreement
    expect(r.agreement.length).toBe(0);
    expect(r.disagreement).toHaveLength(2);
    const rpBucket = r.disagreement.find((b) => b.persona === 'risk-pessimist')!;
    expect(rpBucket.sentences.some((s) => s.includes('Unit economics'))).toBe(true);
  });

  it('threshold is honored: lower threshold → more agreement', () => {
    const views = [
      {
        persona: 'risk-pessimist',
        stance: 'Pricing risks are elevated.',
      },
      {
        persona: 'competitor-strategist',
        stance: 'Pricing moves telegraph intent.',
      },
    ];
    const low = extractOverlap(views, { threshold: 0.1 });
    const high = extractOverlap(views, { threshold: 0.9 });
    expect(low.agreement.length).toBeGreaterThanOrEqual(high.agreement.length);
  });

  it('short sentences (< MIN_SENTENCE_WORDS) are dropped', () => {
    const r = extractOverlap([
      { persona: 'a', stance: 'Ok. Yes. A very real statement about pricing and churn strategies.' },
      { persona: 'b', stance: 'Ok. Yes. Another real statement about pricing and churn strategies.' },
    ]);
    // "Ok." and "Yes." are below MIN_SENTENCE_WORDS and don't create spurious agreement
    const agreed = r.agreement.map((a) => a.sentence);
    expect(agreed.every((s) => !['Ok.', 'Yes.'].includes(s))).toBe(true);
  });

  it('agreement is deterministic across invocations', () => {
    const views = [
      { persona: 'a', stance: 'Pricing change risks top-account churn. Migration cost balloons.' },
      { persona: 'b', stance: 'Pricing change risks top-account churn heavily. Revenue stable.' },
    ];
    const a = extractOverlap(views);
    const b = extractOverlap(views);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('three-way agreement: all three views share → attribution lists all three', () => {
    const stance = 'Pricing change risks top-account churn substantially.';
    const r = extractOverlap([
      { persona: 'a', stance },
      { persona: 'b', stance },
      { persona: 'c', stance },
    ]);
    expect(r.agreement.length).toBeGreaterThan(0);
    expect(r.agreement[0].personas.sort()).toEqual(['a', 'b', 'c']);
  });

  it('DEFAULT_JACCARD_THRESHOLD is 0.3', () => {
    expect(DEFAULT_JACCARD_THRESHOLD).toBe(0.3);
  });

  it('FLYWHEEL_IDEAS_OVERLAP_JACCARD env overrides the default', () => {
    const prev = process.env.FLYWHEEL_IDEAS_OVERLAP_JACCARD;
    process.env.FLYWHEEL_IDEAS_OVERLAP_JACCARD = '0.95';
    try {
      const r = extractOverlap([
        { persona: 'a', stance: 'Pricing change risks top-account churn. Some other claim entirely.' },
        { persona: 'b', stance: 'Pricing change risks top-account churn. Different unrelated observation.' },
      ]);
      // With very high threshold, only exact-ish matches should agree
      // (no disjoint sentences slip in)
      for (const frag of r.agreement) {
        expect(frag.sentence.toLowerCase()).toContain('pricing');
      }
    } finally {
      if (prev === undefined) delete process.env.FLYWHEEL_IDEAS_OVERLAP_JACCARD;
      else process.env.FLYWHEEL_IDEAS_OVERLAP_JACCARD = prev;
    }
  });
});
