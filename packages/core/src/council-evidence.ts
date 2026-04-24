/**
 * council-evidence — assemble a vault-grounded evidence pack for a council
 * cell prompt (v0.2 KEYSTONE).
 *
 * The retrieval-native council input thesis (per roadmap-v0-2): *"the
 * decision loop is strong; the next gain is better context going IN, not
 * more personas."* Before each `council.run` dispatches, query
 * flywheel-memory's tools and inject the relevant vault context as a
 * markdown block in the persona prompt.
 *
 * Query plan (4 sources):
 *   1. `search(query: idea.title, limit: 5)` — top-5 hybrid hits ranked by score
 *   2. `memory(action:'brief', entity: idea.title)` — entity-scoped facts/decisions
 *   3. `graph(action:'backlinks', path: idea.vault_path)` — top backlinks (path-only footer)
 *   4. For first 3 load-bearing assumptions: `search(query: assumption.text, limit: 3)`
 *      — refute/validate signal scaffolding for the council to attack
 *
 * Best-effort: every individual query is wrapped in try/catch. A failed
 * query drops that source; the remaining pack still renders. If the
 * EvidenceReader is unavailable (kill switch / binary missing), return
 * `{evidence: null, sources: []}` immediately so the caller proceeds with
 * the v0.1 prompt shape.
 *
 * Truncation: drops sources from the bottom of the (score-sorted) list
 * until the rendered markdown fits the token budget. If a single source's
 * excerpt exceeds the budget alone, the excerpt is truncated at the
 * nearest section-header boundary (## / ###) — never mid-sentence.
 */

import type { EvidenceReader } from './evidence-reader.js';
import { extractToolText } from './evidence-reader.js';
import type { EvidenceSource } from './council-evidence-store.js';

/** Per-source rendered chunk before budget enforcement. */
interface RenderedSource {
  source: EvidenceSource;
  /** The full ### Source: ... block including excerpt + score. */
  markdown: string;
}

export interface IdeaForEvidence {
  title: string;
  body: string;
  vault_path: string;
}

export interface AssumptionForEvidence {
  text: string;
  load_bearing: boolean;
}

export interface AssembleEvidenceOptions {
  /** Token budget for the assembled markdown. Default 1500 (~6000 chars). */
  max_tokens?: number;
  /** Max load-bearing assumptions to scaffold per-assumption searches for. Default 3. */
  max_assumption_queries?: number;
  /** Hits per assumption search. Default 3. */
  hits_per_assumption?: number;
  /** Excerpt cap per individual source (chars) before budget enforcement. Default 600. */
  max_excerpt_chars?: number;
  /** Top-K vault hits for the idea-title search. Default 5. */
  top_k_idea_search?: number;
  /** Top-K backlinks to surface as a footer. Default 10. */
  top_k_backlinks?: number;
}

export interface EvidencePack {
  /** Rendered markdown to inject into the user message; null if no evidence. */
  evidence: string | null;
  /** The sources that survived budget enforcement (for DB persistence). */
  sources: EvidenceSource[];
}

const APPROX_CHARS_PER_TOKEN = 4; // crude — good enough for budget enforcement, no tokenizer dep.

const DEFAULTS: Required<AssembleEvidenceOptions> = {
  max_tokens: 1500,
  max_assumption_queries: 3,
  hits_per_assumption: 3,
  max_excerpt_chars: 600,
  top_k_idea_search: 5,
  top_k_backlinks: 10,
};

/**
 * Run the query plan, render the markdown, enforce the budget. Best-effort
 * end to end — never throws.
 */
export async function assembleEvidencePack(
  reader: EvidenceReader,
  idea: IdeaForEvidence,
  assumptions: AssumptionForEvidence[],
  options: AssembleEvidenceOptions = {},
): Promise<EvidencePack> {
  const opts = { ...DEFAULTS, ...options };
  const budgetChars = opts.max_tokens * APPROX_CHARS_PER_TOKEN;

  // Run the four query types in parallel; allSettled never throws.
  const [searchRes, memoryRes, backlinksRes, assumptionResAll] = await Promise.allSettled([
    runIdeaSearch(reader, idea.title, opts.top_k_idea_search),
    runMemoryBrief(reader, idea.title),
    runBacklinks(reader, idea.vault_path, opts.top_k_backlinks),
    runAssumptionSearches(reader, assumptions, opts.max_assumption_queries, opts.hits_per_assumption),
  ]);

  const renderedSearch = collectFulfilled(searchRes, []);
  const renderedMemory = collectFulfilled(memoryRes, []);
  const renderedBacklinks = collectFulfilled(backlinksRes, []);
  const renderedAssumptions = collectFulfilled(assumptionResAll, []);

  // Render each source as a ### Source block. Assumption searches get a
  // distinct "kind" but the same per-source structure.
  const allRendered: RenderedSource[] = [
    ...renderedSearch.map((s) => renderSearchHit(s, opts.max_excerpt_chars)),
    ...renderedMemory.map((s) => renderMemoryBrief(s, opts.max_excerpt_chars)),
    ...renderedAssumptions.map((s) => renderSearchHit(s, opts.max_excerpt_chars)),
  ];

  // Sort by score desc so budget-trimming drops the weakest first. Sources
  // without a score (memory_brief) sort to the end.
  allRendered.sort((a, b) => (b.source.score ?? -1) - (a.source.score ?? -1));

  // Enforce the budget by dropping from the tail.
  const kept: RenderedSource[] = [];
  let runningChars = 0;
  for (const r of allRendered) {
    if (runningChars + r.markdown.length > budgetChars) break;
    kept.push(r);
    runningChars += r.markdown.length;
  }

  // Backlinks footer is path-only and cheap; render last regardless of budget
  // unless budget is already blown (in which case skip even the footer).
  const backlinksFooter =
    renderedBacklinks.length > 0 && runningChars < budgetChars
      ? renderBacklinksFooter(renderedBacklinks)
      : '';

  if (kept.length === 0 && backlinksFooter === '') {
    return { evidence: null, sources: [] };
  }

  const header = `## Evidence retrieved from your vault\n`;
  const body = kept.map((r) => r.markdown).join('\n');
  const citedFooter = renderCitedFooter(kept.map((r) => r.source));
  const evidence = [header, body, backlinksFooter, citedFooter]
    .filter((s) => s.length > 0)
    .join('\n');

  const sources: EvidenceSource[] = [
    ...kept.map((r) => r.source),
    ...renderedBacklinks,
  ];

  return { evidence, sources };
}

// ---------------------------------------------------------------------------
// Query runners — each returns EvidenceSource[] with `.excerpt` carried in a
// transient field on the source via the rendered shape (we keep excerpt out
// of the persisted EvidenceSource type — only kind/path/score are persisted).
// ---------------------------------------------------------------------------

interface QueryHit extends EvidenceSource {
  excerpt: string;
}

async function runIdeaSearch(
  reader: EvidenceReader,
  query: string,
  limit: number,
): Promise<QueryHit[]> {
  try {
    const res = await reader.query('search', {
      action: 'query',
      query,
      limit,
      detail_count: limit,
    });
    return parseSearchResults(res, 'search');
  } catch {
    return [];
  }
}

async function runMemoryBrief(
  reader: EvidenceReader,
  entity: string,
): Promise<QueryHit[]> {
  try {
    const res = await reader.query('memory', {
      action: 'brief',
      entity,
    });
    const text = extractToolText(res);
    if (text === null) return [];
    const parsed = JSON.parse(text);
    // memory.brief shape varies; we accept either a single record or array.
    const records: Array<Record<string, unknown>> = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { results?: unknown }).results)
        ? ((parsed as { results: Array<Record<string, unknown>> }).results)
        : [parsed as Record<string, unknown>];
    return records
      .filter((r) => typeof (r.value ?? r.text) === 'string')
      .map((r) => ({
        kind: 'memory_brief' as const,
        path: typeof r.entity === 'string' ? `memory://${r.entity}` : `memory://${entity}`,
        excerpt: String(r.value ?? r.text ?? ''),
      }));
  } catch {
    return [];
  }
}

async function runBacklinks(
  reader: EvidenceReader,
  vault_path: string,
  limit: number,
): Promise<EvidenceSource[]> {
  try {
    const res = await reader.query('graph', {
      action: 'backlinks',
      path: vault_path,
    });
    const text = extractToolText(res);
    if (text === null) return [];
    const parsed = JSON.parse(text) as {
      incoming_edges?: Array<{ source?: string; weight?: number }>;
    };
    const edges = parsed.incoming_edges ?? [];
    return edges
      .slice(0, limit)
      .filter((e): e is { source: string; weight?: number } => typeof e.source === 'string')
      .map((e) => ({
        kind: 'graph_backlinks' as const,
        path: e.source,
        score: typeof e.weight === 'number' ? e.weight : undefined,
      }));
  } catch {
    return [];
  }
}

async function runAssumptionSearches(
  reader: EvidenceReader,
  assumptions: AssumptionForEvidence[],
  maxQueries: number,
  hitsPer: number,
): Promise<QueryHit[]> {
  const loadBearing = assumptions.filter((a) => a.load_bearing).slice(0, maxQueries);
  if (loadBearing.length === 0) return [];

  const settled = await Promise.allSettled(
    loadBearing.map(async (a) => {
      try {
        const res = await reader.query('search', {
          action: 'query',
          query: a.text,
          limit: hitsPer,
          detail_count: hitsPer,
        });
        return parseSearchResults(res, 'assumption_search');
      } catch {
        return [];
      }
    }),
  );

  const out: QueryHit[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') out.push(...s.value);
  }
  return out;
}

function parseSearchResults(
  res: unknown,
  kind: 'search' | 'assumption_search',
): QueryHit[] {
  const text = extractToolText(res);
  if (text === null) return [];
  let parsed: { results?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const results = Array.isArray(parsed.results) ? parsed.results : [];
  return results
    .filter((r) => typeof r.path === 'string')
    .map((r) => {
      const score = typeof r.confidence_score === 'number' ? r.confidence_score : undefined;
      const excerpt =
        typeof r.section_content === 'string'
          ? r.section_content
          : typeof r.snippet === 'string'
            ? r.snippet
            : '';
      return {
        kind,
        path: r.path as string,
        score,
        excerpt,
      };
    })
    .filter((q) => q.excerpt.length > 0);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderSearchHit(hit: QueryHit, maxExcerptChars: number): RenderedSource {
  const excerpt = truncateAtSectionBoundary(hit.excerpt, maxExcerptChars);
  const scoreSuffix = hit.score !== undefined ? ` (score: ${hit.score.toFixed(2)})` : '';
  const markdown = `### Source: ${hit.path}${scoreSuffix}\n\n${blockquote(excerpt)}\n`;
  return {
    source: { kind: hit.kind, path: hit.path, score: hit.score },
    markdown,
  };
}

function renderMemoryBrief(hit: QueryHit, maxExcerptChars: number): RenderedSource {
  const excerpt = truncateAtSectionBoundary(hit.excerpt, maxExcerptChars);
  const markdown = `### Source: ${hit.path}\n\n${blockquote(excerpt)}\n`;
  return {
    source: { kind: hit.kind, path: hit.path, score: hit.score },
    markdown,
  };
}

function renderBacklinksFooter(backlinks: EvidenceSource[]): string {
  const items = backlinks.map((b) => `- ${b.path}`).join('\n');
  return `### Notes that link to this idea\n\n${items}\n`;
}

function renderCitedFooter(sources: EvidenceSource[]): string {
  if (sources.length === 0) return '';
  const items = sources.map((s) => `- ${s.path}`).join('\n');
  return `### Cited vault notes\n\n${items}\n`;
}

function blockquote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * Truncate text at the nearest preceding markdown section boundary if the
 * full text exceeds `max`. Section boundaries: `## ` or `### ` at start of
 * line. Falls back to paragraph boundary (`\n\n`), then sentence boundary
 * (`. `), then hard slice. Never breaks mid-sentence if avoidable.
 */
export function truncateAtSectionBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  // Prefer last section boundary in the slice.
  const sectionMatch = /\n#{2,3} /g;
  let lastSection = -1;
  for (const m of slice.matchAll(sectionMatch)) {
    lastSection = m.index ?? -1;
  }
  if (lastSection > max * 0.3) return slice.slice(0, lastSection) + '\n[…truncated]';
  // Fall back to last blank line.
  const lastPara = slice.lastIndexOf('\n\n');
  if (lastPara > max * 0.5) return slice.slice(0, lastPara) + '\n[…truncated]';
  // Fall back to last sentence.
  const lastSentence = slice.lastIndexOf('. ');
  if (lastSentence > max * 0.5) return slice.slice(0, lastSentence + 1) + ' […truncated]';
  // Hard slice.
  return slice + ' […truncated]';
}

function collectFulfilled<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}
