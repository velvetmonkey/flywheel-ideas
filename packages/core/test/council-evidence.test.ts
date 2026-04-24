/**
 * Unit tests for the v0.2 KEYSTONE evidence pack assembler.
 *
 * Uses an inline stub `EvidenceReader` (no subprocess) — these are
 * pure-function tests of query orchestration, parsing, rendering, and
 * budget enforcement. Subprocess + mock-flywheel-memory integration
 * scenarios land in B5 alongside the wired-up council changes.
 */

import { describe, it, expect } from 'vitest';
import {
  assembleEvidencePack,
  truncateAtSectionBoundary,
  type EvidenceReader,
} from '../src/index.js';

/** Inline stub reader; per-tool callbacks return canned MCP responses. */
function stubReader(handlers: Record<string, (args: unknown) => unknown>): EvidenceReader {
  return {
    async query(toolName, args) {
      const h = handlers[toolName];
      if (!h) return { content: [{ type: 'text', text: '{"results":[]}' }] };
      const result = h(args);
      return result;
    },
  };
}

function textRes(payload: unknown): { content: Array<{ type: string; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

const IDEA = {
  title: 'Should we adopt event-driven architecture?',
  body: 'Considering EDA for subsystem X.',
  vault_path: 'ideas/eda-subsystem-x.md',
};

describe('assembleEvidencePack — happy path', () => {
  it('renders header + per-source blocks + cited footer for a search hit', async () => {
    const reader = stubReader({
      search: () =>
        textRes({
          results: [
            {
              path: 'tech/flywheel/risks-and-mitigations.md',
              section_content:
                'The compounding thesis dies if users do not log outcomes. External review identified this as the single biggest risk.',
              confidence_score: 0.87,
            },
          ],
        }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
    });

    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    const md = pack.evidence!;
    expect(md).toContain('## Evidence retrieved from your vault');
    expect(md).toContain('### Source: tech/flywheel/risks-and-mitigations.md (score: 0.87)');
    expect(md).toContain('> The compounding thesis dies');
    expect(md).toContain('### Cited vault notes');
    expect(md).toContain('- tech/flywheel/risks-and-mitigations.md');

    expect(pack.sources).toHaveLength(1);
    expect(pack.sources[0]).toEqual({
      kind: 'search',
      path: 'tech/flywheel/risks-and-mitigations.md',
      score: 0.87,
    });
  });

  it('combines search + memory + backlinks + assumption-search results', async () => {
    const reader = stubReader({
      search: (args) => {
        const a = args as { query: string };
        if (a.query.includes('event-driven')) {
          return textRes({
            results: [
              {
                path: 'ideas/eda-prior.md',
                section_content: 'Prior EDA exploration notes.',
                confidence_score: 0.7,
              },
            ],
          });
        }
        // assumption search
        return textRes({
          results: [
            {
              path: 'daily-notes/2026-04-15.md',
              section_content: 'Ops burden conversation with team.',
              confidence_score: 0.6,
            },
          ],
        });
      },
      memory: () =>
        textRes({
          results: [
            {
              entity: 'Should we adopt event-driven architecture?',
              value: 'Decision context — last revisited 2026-04-10.',
            },
          ],
        }),
      graph: () =>
        textRes({
          incoming_edges: [
            { source: 'roadmap.md', weight: 0.5 },
            { source: 'meeting-notes-2026-04-12.md', weight: 0.3 },
          ],
        }),
    });

    const pack = await assembleEvidencePack(reader, IDEA, [
      { text: 'Ops burden of cross-service debugging is the real driver', load_bearing: true },
    ]);

    expect(pack.evidence).not.toBeNull();
    const md = pack.evidence!;
    expect(md).toContain('### Source: ideas/eda-prior.md');
    expect(md).toContain('### Source: memory://Should we adopt event-driven architecture?');
    expect(md).toContain('### Source: daily-notes/2026-04-15.md');
    expect(md).toContain('### Notes that link to this idea');
    expect(md).toContain('- roadmap.md');
    expect(md).toContain('- meeting-notes-2026-04-12.md');

    // Sources persisted: 3 main + 2 backlinks = 5
    expect(pack.sources).toHaveLength(5);
    const kinds = pack.sources.map((s) => s.kind).sort();
    expect(kinds).toEqual([
      'assumption_search',
      'graph_backlinks',
      'graph_backlinks',
      'memory_brief',
      'search',
    ]);
  });
});

describe('assembleEvidencePack — note_intelligence (temporal insights)', () => {
  it('renders note_intelligence payload as a structured signals card', async () => {
    const reader = stubReader({
      search: () => textRes({ results: [] }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
      insights: () =>
        textRes({
          path: 'ideas/eda-subsystem-x.md',
          quality_score: 0.42,
          missing_link_count: 3,
          last_modified: '2026-01-15',
          stale_sections: [
            { heading: 'Motivation', last_modified: '2026-01-15' },
            { heading: 'Rationale', last_modified: '2026-01-15' },
          ],
          summary: 'Quality is low — note has been static while surrounding topics moved.',
        }),
    });

    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    const md = pack.evidence!;
    expect(md).toContain('### Note intelligence: ideas/eda-subsystem-x.md');
    expect(md).toContain('- Quality score: 0.42');
    expect(md).toContain('- Missing wikilinks: 3');
    expect(md).toContain('- Last modified: 2026-01-15');
    expect(md).toContain('- Stale sections (2):');
    expect(md).toContain('  - Motivation — last modified 2026-01-15');
    expect(md).toContain('> Quality is low — note has been static');

    const intel = pack.sources.find((s) => s.kind === 'note_intelligence');
    expect(intel).toBeDefined();
    expect(intel!.path).toBe('ideas/eda-subsystem-x.md');
    expect(intel!.score).toBe(0.42);
  });

  it('renders only the signals present (partial payload)', async () => {
    const reader = stubReader({
      search: () =>
        textRes({
          results: [{ path: 'a.md', section_content: 'A excerpt.', confidence_score: 0.5 }],
        }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
      insights: () =>
        textRes({
          path: 'ideas/eda-subsystem-x.md',
          // Only one signal present — missing_link_count.
          missing_link_count: 7,
        }),
    });

    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    expect(pack.evidence!).toContain('### Note intelligence: ideas/eda-subsystem-x.md');
    expect(pack.evidence!).toContain('- Missing wikilinks: 7');
    expect(pack.evidence!).not.toContain('- Quality score');
    expect(pack.evidence!).not.toContain('- Stale sections');
  });

  it('suppresses the card when the payload has no signals (empty/stub response)', async () => {
    const reader = stubReader({
      search: () =>
        textRes({
          results: [{ path: 'a.md', section_content: 'A excerpt.', confidence_score: 0.5 }],
        }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
      insights: () => textRes({ path: 'ideas/eda-subsystem-x.md' }),
    });

    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    expect(pack.evidence!).not.toContain('### Note intelligence');
    expect(pack.sources.find((s) => s.kind === 'note_intelligence')).toBeUndefined();
  });

  it('skips the insights card when the tool returns an error', async () => {
    const reader = stubReader({
      search: () =>
        textRes({
          results: [{ path: 'a.md', section_content: 'A excerpt.', confidence_score: 0.5 }],
        }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
      insights: () => textRes({ error: 'note not found' }),
    });

    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    expect(pack.evidence!).not.toContain('### Note intelligence');
    expect(pack.sources.find((s) => s.kind === 'note_intelligence')).toBeUndefined();
  });

  it('one query failing (insights) does not kill the rest', async () => {
    const reader = stubReader({
      search: () =>
        textRes({
          results: [{ path: 'a.md', section_content: 'A excerpt.', confidence_score: 0.5 }],
        }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
      insights: () => {
        throw new Error('insights tool exploded');
      },
    });
    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    expect(pack.evidence!).toContain('### Source: a.md');
    expect(pack.sources.find((s) => s.kind === 'note_intelligence')).toBeUndefined();
  });
});

describe('assembleEvidencePack — degradation', () => {
  it('returns {evidence:null, sources:[]} when all queries fail', async () => {
    const reader = stubReader({
      search: () => {
        throw new Error('boom');
      },
      memory: () => {
        throw new Error('boom');
      },
      graph: () => {
        throw new Error('boom');
      },
    });
    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).toBeNull();
    expect(pack.sources).toEqual([]);
  });

  it('one query failing degrades cleanly (others survive)', async () => {
    const reader = stubReader({
      search: () =>
        textRes({
          results: [{ path: 'a.md', section_content: 'A excerpt.', confidence_score: 0.5 }],
        }),
      memory: () => {
        throw new Error('memory tool exploded');
      },
      graph: () => {
        throw new Error('graph tool exploded');
      },
    });
    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).not.toBeNull();
    expect(pack.evidence!).toContain('### Source: a.md');
    expect(pack.sources).toHaveLength(1);
  });

  it('returns null evidence when search returns empty + no other sources', async () => {
    const reader = stubReader({
      search: () => textRes({ results: [] }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
    });
    const pack = await assembleEvidencePack(reader, IDEA, []);
    expect(pack.evidence).toBeNull();
    expect(pack.sources).toEqual([]);
  });
});

describe('assembleEvidencePack — budget enforcement', () => {
  it('drops weakest source when budget would be exceeded', async () => {
    // Long excerpts so 2 sources fit but 3 do not under a tight budget.
    const longExcerpt = 'X'.repeat(500);
    const reader = stubReader({
      search: () =>
        textRes({
          results: [
            { path: 'high.md', section_content: longExcerpt, confidence_score: 0.9 },
            { path: 'mid.md', section_content: longExcerpt, confidence_score: 0.6 },
            { path: 'low.md', section_content: longExcerpt, confidence_score: 0.3 },
          ],
        }),
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
    });

    // Budget tight enough to drop the lowest-score source.
    const pack = await assembleEvidencePack(reader, IDEA, [], { max_tokens: 300 });
    expect(pack.evidence).not.toBeNull();
    expect(pack.evidence!).toContain('high.md');
    // low.md has the lowest score and should be the first to drop.
    expect(pack.sources.map((s) => s.path)).not.toContain('low.md');
  });

  it('respects max_assumption_queries cap', async () => {
    const reader = stubReader({
      search: (args) => {
        const a = args as { query: string };
        // assumption-search queries
        return textRes({
          results: [{ path: `hit-for-${a.query.slice(0, 5)}.md`, section_content: 'x', confidence_score: 0.5 }],
        });
      },
      memory: () => textRes([]),
      graph: () => textRes({ incoming_edges: [] }),
    });

    const assumptions = [
      { text: 'asm one', load_bearing: true },
      { text: 'asm two', load_bearing: true },
      { text: 'asm three', load_bearing: true },
      { text: 'asm four', load_bearing: true }, // over the cap of 3
      { text: 'asm five — not load-bearing', load_bearing: false }, // skipped
    ];

    const pack = await assembleEvidencePack(reader, IDEA, assumptions, {
      max_assumption_queries: 3,
    });
    // Idea-title search (1 hit) + 3 assumption searches (1 hit each) = 4.
    // No memory, no backlinks.
    const assumptionHits = pack.sources.filter((s) => s.kind === 'assumption_search');
    expect(assumptionHits.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// truncateAtSectionBoundary — pure helper
// ---------------------------------------------------------------------------

describe('truncateAtSectionBoundary', () => {
  it('returns input unchanged when shorter than max', () => {
    expect(truncateAtSectionBoundary('short', 100)).toBe('short');
  });

  it('truncates at preceding ## section header when one exists in slice', () => {
    const text = 'Intro paragraph.\n## Heading One\nContent A.\n## Heading Two\nContent B further down.';
    const result = truncateAtSectionBoundary(text, 50);
    expect(result).toContain('[…truncated]');
    expect(result).toContain('Content A.');
    // Should not contain the next ## that would have been past max.
    expect(result).not.toContain('Heading Two');
  });

  it('falls back to paragraph boundary when no section header in slice', () => {
    const text = 'Sentence one. Sentence two.\n\nParagraph two starts here and goes on for a while with more words.';
    const result = truncateAtSectionBoundary(text, 40);
    expect(result).toContain('[…truncated]');
    expect(result).not.toContain('Paragraph two starts');
  });

  it('falls back to sentence boundary when no paragraph break', () => {
    const text = 'One sentence here. Two more words. Three more words. Four more words. Five more words.';
    const result = truncateAtSectionBoundary(text, 40);
    expect(result).toContain('[…truncated]');
    // Should end at a sentence boundary (period).
    expect(result.includes('. […truncated]') || result.includes('. ')).toBe(true);
  });

  it('hard-slices when no good boundary is available', () => {
    const text = 'A'.repeat(1000); // no breaks anywhere
    const result = truncateAtSectionBoundary(text, 100);
    expect(result.length).toBeLessThanOrEqual(115); // 100 + ' […truncated]' suffix
    expect(result).toContain('[…truncated]');
  });
});
