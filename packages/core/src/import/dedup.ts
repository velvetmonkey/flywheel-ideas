/**
 * Dedup helper — query flywheel-memory's `search` tool via a one-shot
 * evidence-reader subprocess, decide whether a candidate is a duplicate.
 *
 * Best-effort: if the subprocess is unavailable (binary missing, disabled,
 * timeout) we return `{matched: false}` so the candidate lands as `pending`.
 * Never hard-fails a scan.
 */

import { extractToolText, withEvidenceReader } from '../evidence-reader.js';
import type { RawCandidate } from './adapter.js';

/** Score at or above this + matching kind → `state='duplicate'`. */
export const DEFAULT_DEDUP_THRESHOLD = 0.8;

export interface DedupHit {
  path: string;
  score: number;
  frontmatter_type: string | null;
}

export interface DedupDecision {
  /** Closest hit regardless of threshold — useful for surfacing near-matches. */
  closest?: DedupHit;
  /** True only when `closest.score >= threshold` AND kind aligns. */
  matched: boolean;
  /** Why we returned no match. `ok` for a clean decision. */
  reason:
    | 'ok'
    | 'bridge_disabled'
    | 'bridge_unavailable'
    | 'bridge_timeout'
    | 'bridge_error'
    | 'no_hits';
}

export interface DedupOptions {
  threshold?: number;
  timeoutMs?: number;
  searchLimit?: number;
}

/**
 * Call flywheel-memory search inside a one-shot subprocess, decide duplicate.
 * Returns a DedupDecision — never throws.
 */
export async function checkDedup(
  vaultPath: string,
  candidate: RawCandidate,
  options: DedupOptions = {},
): Promise<DedupDecision> {
  const threshold = options.threshold ?? DEFAULT_DEDUP_THRESHOLD;
  const searchLimit = options.searchLimit ?? 3;
  const query = buildDedupQuery(candidate);

  const outcome = await withEvidenceReader(
    vaultPath,
    async (reader) => {
      const resp = await reader.query('search', {
        action: 'query',
        query,
        limit: searchLimit,
        detail_count: searchLimit,
      });
      return parseSearchResponse(resp);
    },
    { timeoutMs: options.timeoutMs },
  );

  if (outcome.status === 'skipped') {
    const reason =
      outcome.reason === 'timeout'
        ? 'bridge_timeout'
        : outcome.reason === 'binary_not_found' || outcome.reason === 'spawn_failed'
          ? 'bridge_unavailable'
          : 'bridge_error';
    return { matched: false, reason };
  }

  const hits = outcome.value;
  if (hits.length === 0) {
    return { matched: false, reason: 'no_hits' };
  }

  const closest = hits[0];
  const kindAligned = candidateKindMatchesFrontmatterType(
    candidate.kind,
    closest.frontmatter_type,
  );
  const matched = kindAligned && closest.score >= threshold;

  return { closest, matched, reason: 'ok' };
}

/**
 * Build the search query from a candidate — title + first 200 chars of body
 * gives flywheel-memory's hybrid BM25+semantic ranker enough signal. Don't
 * stuff the whole body: search returns diminishing precision past ~40 tokens.
 */
export function buildDedupQuery(candidate: RawCandidate): string {
  const bodyExcerpt = candidate.bodyMd.replace(/\s+/g, ' ').slice(0, 200);
  return `${candidate.title} ${bodyExcerpt}`.trim();
}

interface FlywheelSearchResult {
  path?: unknown;
  score?: unknown;
  snippet_confidence?: unknown;
  frontmatter?: unknown;
}

function parseSearchResponse(resp: unknown): DedupHit[] {
  const text = extractToolText(resp);
  if (!text) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const results = (parsed as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const hits: DedupHit[] = [];
  for (const r of results as FlywheelSearchResult[]) {
    if (!r || typeof r !== 'object') continue;
    const path = typeof r.path === 'string' ? r.path : null;
    if (!path) continue;
    // Flywheel-memory uses `score` on human output + `snippet_confidence` on
    // the llm output shape. Prefer explicit score; fall back if absent.
    const rawScore =
      typeof r.score === 'number'
        ? r.score
        : typeof r.snippet_confidence === 'number'
          ? r.snippet_confidence
          : null;
    if (rawScore === null) continue;
    const frontmatter = r.frontmatter as { type?: unknown } | null | undefined;
    const frontmatterType =
      frontmatter && typeof frontmatter.type === 'string' ? frontmatter.type : null;
    hits.push({ path, score: rawScore, frontmatter_type: frontmatterType });
  }
  return hits;
}

/**
 * Candidate kinds map 1:1 to existing frontmatter `type` values:
 *   idea       → type: 'idea'
 *   assumption → type: 'assumption'
 *   outcome    → type: 'outcome'
 *
 * A null frontmatter type cannot be matched — treat as non-aligned so we
 * don't flag unrelated notes as duplicates.
 */
export function candidateKindMatchesFrontmatterType(
  kind: 'idea' | 'assumption' | 'outcome',
  frontmatterType: string | null,
): boolean {
  return frontmatterType === kind;
}
