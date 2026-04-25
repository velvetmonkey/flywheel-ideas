/**
 * `import.scan` orchestration — invokes the selected adapter, runs dedup on
 * every candidate, persists one `ideas_import_sources` row + N
 * `ideas_import_candidates` rows.
 *
 * Materialises the adapter's candidate stream into memory before persisting
 * so we can decide dedup status once (not per-candidate spawn). For current
 * adapter scale (~hundreds of PEPs, ~tens of 10-Ks) this is simpler than
 * streaming and the memory cost is bounded. Revisit if an adapter emits
 * thousands.
 */

import * as os from 'node:os';
import * as path from 'node:path';

import type { IdeasDatabase } from '../db.js';
import { withEvidenceReader, extractToolText } from '../evidence-reader.js';
import {
  ImportAdapterError,
  ImportNetworkGatedError,
  type CandidateState,
  type ImportContext,
  type RawCandidate,
} from './adapter.js';
import {
  buildDedupQuery,
  candidateKindMatchesFrontmatterType,
  DEFAULT_DEDUP_THRESHOLD,
  type DedupDecision,
  type DedupOptions,
} from './dedup.js';
import {
  createImportSource,
  persistCandidate,
  type ImportCandidateRow,
} from './candidates.js';
import { getAdapter } from './registry.js';

export interface ScanInput {
  adapter: string;
  source: string;
  scan_config?: Record<string, unknown>;
  target_idea_id?: string;
  /** Override the default global dedup; set to `false` to skip. */
  dedup?: DedupOptions | false;
}

export type DedupStatus =
  | 'ran'
  | 'disabled'
  | 'bridge_unavailable'
  | 'bridge_timeout'
  | 'bridge_error';

export interface ScanSummary {
  source_id: string;
  adapter: string;
  source_uri: string;
  scanned_count: number;
  pending_count: number;
  duplicate_count: number;
  dedup_status: DedupStatus;
  candidates: Array<
    Pick<
      ImportCandidateRow,
      'id' | 'candidate_kind' | 'title' | 'state' | 'confidence' | 'dedup_match_path'
    >
  >;
}

export class ImportScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportScanError';
  }
}

export async function scanSource(
  db: IdeasDatabase,
  vaultPath: string,
  input: ScanInput,
): Promise<ScanSummary> {
  const adapter = getAdapter(input.adapter);
  if (!adapter) {
    throw new ImportScanError(`unknown adapter: "${input.adapter}"`);
  }

  const network = resolveNetworkGate();
  const cacheDir = resolveCacheDir();
  const dedupEnabled = input.dedup !== false;
  const dedupOptions: DedupOptions =
    dedupEnabled && typeof input.dedup === 'object' ? input.dedup : {};

  // 1. Fetch candidates — adapter surfaces network/parse errors here.
  const raw = await collectCandidates(adapter, input.source, {
    db,
    vaultPath,
    cacheDir,
    network,
    scanConfig: input.scan_config,
  });

  // 2. Persist source row FIRST so candidates FK resolves.
  const source = createImportSource(db, {
    adapter: input.adapter,
    source_uri: input.source,
    scan_config: input.scan_config,
  });

  // 3. Dedup decisions — one subprocess for the whole batch.
  const { dedupStatus, decisions } = await decideDedupForBatch(
    vaultPath,
    raw,
    dedupEnabled,
    dedupOptions,
  );

  // 4. Persist candidates with their decisions.
  const persisted: ScanSummary['candidates'] = [];
  let pending = 0;
  let duplicates = 0;
  for (let i = 0; i < raw.length; i++) {
    const candidate = raw[i];
    const decision = decisions[i];
    const state: CandidateState = decision.matched ? 'duplicate' : 'pending';
    const row = persistCandidate(db, {
      source_id: source.id,
      adapter: input.adapter,
      candidate,
      state,
      target_idea_id: input.target_idea_id,
      dedup_match_path: decision.closest?.path,
      dedup_match_score: decision.closest?.score,
    });
    persisted.push(summariseCandidate(row));
    if (state === 'pending') pending++;
    else if (state === 'duplicate') duplicates++;
  }

  return {
    source_id: source.id,
    adapter: input.adapter,
    source_uri: input.source,
    scanned_count: persisted.length,
    pending_count: pending,
    duplicate_count: duplicates,
    dedup_status: dedupStatus,
    candidates: persisted,
  };
}

async function collectCandidates(
  adapter: ReturnType<typeof getAdapter> & object,
  source: string,
  ctx: ImportContext,
): Promise<RawCandidate[]> {
  const out: RawCandidate[] = [];
  try {
    for await (const c of adapter.scan(source, ctx)) {
      out.push(c);
    }
  } catch (err) {
    if (err instanceof ImportNetworkGatedError) throw err;
    if (err instanceof ImportAdapterError) throw err;
    throw new ImportScanError(
      `adapter "${adapter.name}" failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return out;
}

async function decideDedupForBatch(
  vaultPath: string,
  candidates: RawCandidate[],
  enabled: boolean,
  options: DedupOptions,
): Promise<{ dedupStatus: DedupStatus; decisions: DedupDecision[] }> {
  if (!enabled) {
    return {
      dedupStatus: 'disabled',
      decisions: candidates.map(() => skipped('bridge_disabled')),
    };
  }
  if (candidates.length === 0) {
    return { dedupStatus: 'ran', decisions: [] };
  }

  const outcome = await withEvidenceReader(
    vaultPath,
    async (reader) => {
      const results: DedupDecision[] = [];
      for (const candidate of candidates) {
        results.push(
          await dedupOneViaReader(
            reader,
            candidate,
            options.threshold ?? DEFAULT_DEDUP_THRESHOLD,
            options.searchLimit ?? 3,
          ),
        );
      }
      return results;
    },
    { timeoutMs: options.timeoutMs },
  );

  if (outcome.status === 'ok') {
    return { dedupStatus: 'ran', decisions: outcome.value };
  }

  const dedupStatus: DedupStatus =
    outcome.reason === 'disabled'
      ? 'bridge_unavailable'
      : outcome.reason === 'timeout'
        ? 'bridge_timeout'
        : outcome.reason === 'binary_not_found' || outcome.reason === 'spawn_failed'
          ? 'bridge_unavailable'
          : 'bridge_error';
  const skipReason =
    dedupStatus === 'bridge_timeout'
      ? 'bridge_timeout'
      : dedupStatus === 'bridge_error'
        ? 'bridge_error'
        : 'bridge_unavailable';
  return {
    dedupStatus,
    decisions: candidates.map(() => skipped(skipReason)),
  };
}

async function dedupOneViaReader(
  reader: { query: (tool: string, args: Record<string, unknown>) => Promise<unknown> },
  candidate: RawCandidate,
  threshold: number,
  searchLimit: number,
): Promise<DedupDecision> {
  try {
    const resp = await reader.query('search', {
      action: 'query',
      query: buildDedupQuery(candidate),
      limit: searchLimit,
      detail_count: searchLimit,
    });
    const text = extractToolText(resp);
    if (!text) return { matched: false, reason: 'no_hits' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { matched: false, reason: 'no_hits' };
    }
    const results = (parsed as { results?: unknown }).results;
    if (!Array.isArray(results) || results.length === 0) {
      return { matched: false, reason: 'no_hits' };
    }
    const first = results[0] as {
      path?: unknown;
      score?: unknown;
      snippet_confidence?: unknown;
      frontmatter?: { type?: unknown } | null;
    };
    const hitPath = typeof first.path === 'string' ? first.path : null;
    if (!hitPath) return { matched: false, reason: 'no_hits' };
    const score =
      typeof first.score === 'number'
        ? first.score
        : typeof first.snippet_confidence === 'number'
          ? first.snippet_confidence
          : 0;
    const frontmatterType =
      first.frontmatter && typeof first.frontmatter.type === 'string'
        ? first.frontmatter.type
        : null;
    const closest = { path: hitPath, score, frontmatter_type: frontmatterType };
    const kindAligned = candidateKindMatchesFrontmatterType(
      candidate.kind,
      frontmatterType,
    );
    return {
      closest,
      matched: kindAligned && score >= threshold,
      reason: 'ok',
    };
  } catch {
    return { matched: false, reason: 'bridge_error' };
  }
}

function skipped(
  reason:
    | 'bridge_disabled'
    | 'bridge_unavailable'
    | 'bridge_timeout'
    | 'bridge_error',
): DedupDecision {
  return { matched: false, reason };
}

function summariseCandidate(row: ImportCandidateRow): ScanSummary['candidates'][number] {
  return {
    id: row.id,
    candidate_kind: row.candidate_kind,
    title: row.title,
    state: row.state,
    confidence: row.confidence,
    dedup_match_path: row.dedup_match_path,
  };
}

function resolveNetworkGate(): boolean {
  const raw = process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK;
  if (raw === undefined || raw === '') return false;
  return raw !== '0' && raw.toLowerCase() !== 'false';
}

function resolveCacheDir(): string {
  const raw = process.env.FLYWHEEL_IDEAS_IMPORT_CACHE_DIR;
  if (raw && raw.length > 0) return raw;
  return path.join(os.homedir(), '.cache', 'flywheel-ideas', 'imports');
}
