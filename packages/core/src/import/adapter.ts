/**
 * Adapter interface for bulk-import (v0.2 Phase 2).
 *
 * Adapters scan an external source (a github tree, a SEC CIK, a directory of
 * ADRs) and emit `RawCandidate`s — decision-shaped content with a confidence
 * score. Candidates are NOT written to the vault by the adapter; the
 * `import.scan` tool persists them to `ideas_import_candidates` and the user
 * gates each one via `import.promote`. This is the reproducibility contract
 * for the Phase 3 public-corpus dogfood: every promotion is an explicit
 * human act, attributable to a source URI.
 *
 * Adapters are async generators so a large scan (hundreds of PEPs) can
 * stream candidates to the persister without holding the full set in memory.
 */

import type { IdeasDatabase } from '../db.js';
import type { EvidenceReader } from '../evidence-reader.js';

/** Kinds of content an adapter can extract from a source. */
export type CandidateKind = 'idea' | 'assumption' | 'outcome';

/** Lifecycle state of a persisted candidate row. */
export type CandidateState = 'pending' | 'imported' | 'rejected' | 'duplicate';

/**
 * A single candidate produced by an adapter. Not yet persisted, not yet
 * dedup-checked — the persister in `candidates.ts` handles those steps.
 */
export interface RawCandidate {
  kind: CandidateKind;
  title: string;
  bodyMd: string;
  /**
   * Adapter-specific structured fields serialised JSON-style. For PEPs this
   * carries `{pep_number, pep_type, reversible, supersedes, replaced_by,
   * alternatives, authors}`. Promoters may map these onto the target entity
   * extension sidecars; the adapter does not do that mapping itself.
   */
  extractedFields?: Record<string, unknown>;
  /** 0..1 — per-adapter heuristic. Used for surfacing, not for auto-promotion. */
  confidence: number;
  /** Per-candidate source URI (e.g. the raw PEP URL). */
  sourceUri: string;
}

/**
 * Context passed to every adapter scan. The adapter owns its fetch + parse,
 * but must respect the `network` gate and the optional `reader` for dedup.
 */
export interface ImportContext {
  /** Open ideas.db handle. Adapters are read-only w.r.t. the DB. */
  db: IdeasDatabase;
  /** Absolute vault path (only used by adapters that inspect local files). */
  vaultPath: string;
  /**
   * Best-effort flywheel-memory reader for dedup queries. Absent when
   * `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` or the binary is unavailable.
   * Adapters may use it to short-circuit fetching when a vault match already
   * exists. The persister also runs dedup centrally — adapters SHOULD NOT
   * re-implement dedup logic, just opt to skip cheap known-duplicates.
   */
  reader?: EvidenceReader;
  /** Absolute directory for adapter-owned fetch caches. */
  cacheDir: string;
  /**
   * Network egress gate. Adapters that need HTTP must throw when this is
   * false. Tests run with `network=false` and supply fixture fixtures.
   */
  network: boolean;
}

/**
 * A source adapter. `name` is the identifier surfaced on `import.scan({adapter})`.
 * `scan` yields candidates lazily so a large source streams into the persister.
 */
export interface ImportAdapter {
  readonly name: string;
  scan(source: string, ctx: ImportContext): AsyncGenerator<RawCandidate>;
}

/** Thrown by adapters when the source cannot be parsed. */
export class ImportAdapterError extends Error {
  constructor(
    message: string,
    public readonly adapter: string,
    public readonly source: string,
  ) {
    super(message);
    this.name = 'ImportAdapterError';
  }
}

/** Thrown when network access is required but gated off. */
export class ImportNetworkGatedError extends Error {
  constructor(public readonly adapter: string) {
    super(
      `adapter "${adapter}" requires network access; set FLYWHEEL_IDEAS_IMPORT_NETWORK=1`,
    );
    this.name = 'ImportNetworkGatedError';
  }
}
