/**
 * Doc-mode format conformance tests.
 *
 * The single contract for the portable single-document mode is the
 * byte-identical round-trip rule:
 *
 *   render(parse(text)) === text
 *
 * for every well-formed input. This file enforces it via:
 *   - golden fixtures under test/fixtures/single-doc/
 *   - fast-check property over generated DocModeIdea structs
 *   - negative cases (malformed inputs throw DocFormatError with the
 *     right `kind` discriminator)
 *
 * If you change the renderer or parser, run this file first. If a
 * golden fixture diff is intentional, update the fixture and call the
 * change out in the PR. Doc-mode consumers (other apps embedding the
 * format) parse against these same files.
 */

import { describe, it, expect } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import fc from 'fast-check';
import {
  DOC_ASSUMPTION_STATUSES,
  DOC_IDEA_STATES,
  DOC_VERDICT_STATES,
  DocFormatError,
  parseDocIdea,
  renderDocIdea,
  type DocModeIdea,
} from '../src/doc-mode/format.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'single-doc');

async function readFixture(name: string): Promise<string> {
  return fsp.readFile(path.join(FIXTURES_DIR, name), 'utf8');
}

describe('doc-mode format — golden fixtures round-trip', () => {
  it.each(['minimal.md', 'full-lifecycle.md'])(
    '%s parses then re-renders byte-identical to the source',
    async (name) => {
      const source = await readFixture(name);
      const parsed = parseDocIdea(source);
      const rendered = renderDocIdea(parsed);
      expect(rendered).toBe(source);
    },
  );

  it.each(['minimal.md', 'full-lifecycle.md'])(
    '%s accepts CRLF input and canonicalizes to LF on round-trip',
    async (name) => {
      const lfSource = await readFixture(name);
      const crlfSource = lfSource.replace(/\n/g, '\r\n');
      const parsed = parseDocIdea(crlfSource);
      expect(renderDocIdea(parsed)).toBe(lfSource);
    },
  );

  it('full-lifecycle.md parses every section into the expected struct', async () => {
    const source = await readFixture('full-lifecycle.md');
    const parsed = parseDocIdea(source);
    expect(parsed.id).toBe('idea-7q2xv9bn');
    expect(parsed.state).toBe('refuted');
    expect(parsed.assumptions).toHaveLength(1);
    expect(parsed.assumptions[0].status).toBe('refuted');
    expect(parsed.evidenceLog).toHaveLength(2);
    expect(parsed.evidenceLog[0].timestamp).toBe('2026-04-18T14:22:00Z');
    expect(parsed.verdict).toEqual({
      state: 'fail',
      rationale:
        'Export-control geometry turned demand risk into a quantified write-down inside the test window. Hedging did not absorb the front edge of the shock.',
    });
    expect(parsed.lesson).toMatch(/Geopolitical access constraints/);
  });
});

describe('doc-mode format — property: render-then-parse returns same struct', () => {
  it('survives arbitrary well-formed inputs', () => {
    fc.assert(
      fc.property(arbDocIdea(), (idea) => {
        const rendered = renderDocIdea(idea);
        const parsed = parseDocIdea(rendered);
        expect(parsed).toEqual(idea);
      }),
      { numRuns: 100 },
    );
  });
});

describe('doc-mode format — negative cases', () => {
  it('rejects missing closing frontmatter fence', () => {
    expect(() => parseDocIdea('---\nid: idea-x\n')).toThrow(DocFormatError);
  });

  it('rejects wrong type', () => {
    const text = baseFrontmatterReplace('type: idea', 'type: note');
    expect(() => parseDocIdea(text)).toThrow(/type must be "idea"/);
  });

  it('rejects wrong backend', () => {
    const text = baseFrontmatterReplace('backend: doc', 'backend: sqlite');
    expect(() => parseDocIdea(text)).toThrow(/backend must be "doc"/);
  });

  it('rejects invalid state', () => {
    const text = baseFrontmatterReplace('state: nascent', 'state: bogus');
    expect(() => parseDocIdea(text)).toThrow(/invalid state/);
  });

  it('rejects out-of-order evidence log timestamps', () => {
    const text = baseFrontmatter()
      .replace(
        '## Evidence log\n',
        '## Evidence log\n- 2026-05-02T09:00:00Z — later entry first\n- 2026-04-18T14:22:00Z — earlier entry second\n',
      );
    expect(() => parseDocIdea(text)).toThrow(/doc_transition_out_of_order/);
  });

  it('rejects malformed assumption block missing yaml fence', () => {
    const text = baseFrontmatter().replace(
      '## Assumptions\n',
      '## Assumptions\n\n### Assumption: asm-9k3xv2pq\ntext: missing fence\n',
    );
    expect(() => parseDocIdea(text)).toThrow(/missing opening ~~~yaml fence/);
  });

  it('rejects mismatched H1 vs frontmatter title', () => {
    const text = baseFrontmatter().replace('# A minimal idea', '# Something else');
    expect(() => parseDocIdea(text)).toThrow(/H1 .* does not match frontmatter title/);
  });

  it('rejects missing required section', () => {
    const text = baseFrontmatter().replace('## Verdict\n', '');
    expect(() => parseDocIdea(text)).toThrow(/missing required section: ## Verdict/);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseFrontmatter(): string {
  return [
    '---',
    'id: idea-aaaaaaaa',
    'type: idea',
    'backend: doc',
    'state: nascent',
    'title: A minimal idea',
    'created_at: 2026-05-13T10:00:00Z',
    'updated_at: 2026-05-13T10:00:00Z',
    '---',
    '',
    '# A minimal idea',
    '',
    '## Claim',
    '',
    '## Test condition',
    '',
    '## Assumptions',
    '',
    '## Evidence log',
    '',
    '## Verdict',
    '',
    '## Lesson',
    '',
  ].join('\n');
}

function baseFrontmatterReplace(from: string, to: string): string {
  return baseFrontmatter().replace(from, to);
}

// fast-check arbitrary for DocModeIdea structs. Generators are
// intentionally conservative — only characters and shapes the format
// can serialize losslessly. This is the contract; widening the
// generator would just produce strings the format cannot represent.
function arbDocIdea(): fc.Arbitrary<DocModeIdea> {
  return fc.record({
    id: fc.stringMatching(/^idea-[a-zA-Z0-9]{8}$/u),
    title: arbSafeLine(),
    state: fc.constantFrom(...DOC_IDEA_STATES),
    createdAt: fc.constant('2026-03-04T11:00:00Z'),
    updatedAt: fc.constant('2026-05-09T16:42:00Z'),
    claim: arbProseBlock(),
    testCondition: arbProseBlock(),
    assumptions: fc.array(arbAssumption(), { maxLength: 3 }),
    evidenceLog: fc
      .array(arbEvidenceTimestamp(), { maxLength: 4 })
      .map((timestamps) =>
        [...timestamps]
          .sort()
          .map((timestamp, i) => ({ timestamp, note: `evidence note ${i}` })),
      ),
    verdict: fc.option(
      fc.record({
        state: fc.constantFrom(...DOC_VERDICT_STATES),
        rationale: arbSafeLine(),
      }),
      { nil: null },
    ),
    lesson: fc.oneof(fc.constant(''), arbProseBlock()),
  });
}

function arbSafeLine(): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1, maxLength: 80 })
    .map((s) => s.replace(/[\r\n]/gu, ' ').replace(/\s+/gu, ' ').trim())
    .filter((s) => s.length > 0);
}

function arbProseBlock(): fc.Arbitrary<string> {
  return arbSafeLine();
}

function arbAssumption(): fc.Arbitrary<{
  id: string;
  text: string;
  loadBearing: boolean;
  signpostAt: string | null;
  status: 'open' | 'locked' | 'refuted' | 'validated';
}> {
  return fc.record({
    id: fc.stringMatching(/^asm-[a-zA-Z0-9]{8}$/u),
    text: arbSafeLine(),
    loadBearing: fc.boolean(),
    signpostAt: fc.option(fc.constant('2026-09-30T00:00:00Z'), { nil: null }),
    status: fc.constantFrom(...DOC_ASSUMPTION_STATUSES),
  });
}

function arbEvidenceTimestamp(): fc.Arbitrary<string> {
  return fc
    .integer({ min: 1, max: 28 })
    .chain((day) =>
      fc
        .integer({ min: 0, max: 23 })
        .chain((hour) =>
          fc.integer({ min: 0, max: 59 }).map((minute) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `2026-04-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;
          }),
        ),
    );
}
