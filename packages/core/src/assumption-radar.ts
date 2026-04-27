/**
 * Assumption Radar (v0.2 D9) — surface vault hits that *might* validate
 * or refute open assumptions.
 *
 * Per the roadmap-v0-2 Closing-the-feedback-loop section: query the whole
 * vault for signals on each declared assumption, surface them as candidate
 * outcome triggers. Shortens the loop from "I have to remember to check"
 * to "the system surfaces relevant signals while I'm in my flow".
 *
 * **Scope-locked design (per the v0.2 brainstorm council verdict):** Radar
 * surfaces `related_mention` hits ONLY — no keyword-based
 * `potential_refutation` / `potential_validation` classification. The
 * brainstorm-round council attacked auto-classification ("failed" /
 * "wrong" / "validated") as the same fuzzy heuristic that breaks the
 * falsifiability thesis when LLM-extracted assumptions go fuzzy. By
 * returning related-mention only, we let the human (or the calling LLM
 * agent under explicit user supervision) read the excerpt and decide
 * whether it's a refute / validate signal. The outcome.log call stays
 * human-driven; Radar provides the surface, never the verdict.
 *
 * Reuses the evidence-reader subprocess (`withEvidenceReader`) — one-shot
 * per `radar` call.
 *
 * v0.4.0 — flywheel-memory is required at boot, so a per-call reader spawn
 * failure is a transient mid-session error rather than a missing dependency.
 * Radar now throws `EvidenceReaderUnavailableError` (mitigation #7: surface
 * loud failures, not silent vault divergence) instead of degrading silently.
 * Timeout knob (`FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS`) still tunes the
 * per-call ceiling.
 */

import type { IdeasDatabase } from './db.js';
import { extractToolText, withEvidenceReader, type EvidenceReader } from './evidence-reader.js';

export interface RadarHit {
  assumption_id: string;
  assumption_text: string;
  /** Vault path of the matching note (excluding the assumption's own file). */
  vault_path: string;
  /** Excerpt from the matching section. May be truncated upstream. */
  excerpt: string;
  /** flywheel-memory hybrid confidence_score (0-1). Null when unavailable. */
  score: number | null;
}

export interface RadarOptions {
  /** Restrict to assumptions of a single idea. Mutually exclusive with all_load_bearing. */
  idea_id?: string;
  /** Sweep ALL load-bearing open assumptions across the vault. Mutually exclusive with idea_id. */
  all_load_bearing?: boolean;
  /** Max hits per assumption. Default 5. */
  limit_per_assumption?: number;
  /** Max assumptions to scan (caps the subprocess query budget). Default 20. */
  max_assumptions?: number;
  /** Override evidence-reader binary path. Forwarded to withEvidenceReader. */
  evidence_reader_binary?: string;
  /** Override evidence-reader binary args. */
  evidence_reader_args?: string[];
  /** Override per-call timeout. */
  evidence_reader_timeout_ms?: number;
  /**
   * Test-injection hook — when provided, skip the subprocess spawn entirely
   * and use this reader directly. Production callers leave undefined.
   */
  reader_override?: EvidenceReader;
}

export interface RadarResult {
  hits: RadarHit[];
  assumptions_scanned: number;
}

export class RadarInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RadarInputError';
  }
}

/**
 * Thrown when the evidence-reader subprocess fails to spawn for a Radar
 * call. v0.4.0 — flywheel-memory was required at boot, so this represents
 * a transient mid-session failure (subprocess crash, OS fork failure under
 * load) rather than a missing dependency. Operators retry, restart, or
 * inspect logs; no silent degrade.
 */
export class EvidenceReaderUnavailableError extends Error {
  readonly reason: string;
  readonly detail?: string;
  constructor(reason: string, detail?: string) {
    super(
      `assumption.radar: evidence-reader subprocess failed (${reason}${detail ? `: ${detail}` : ''}). ` +
        'flywheel-memory was reachable at boot but the per-call spawn failed. ' +
        'Retry; if reproducible, run `flywheel-memory --help` directly to inspect.',
    );
    this.name = 'EvidenceReaderUnavailableError';
    this.reason = reason;
    this.detail = detail;
  }
}

interface AssumptionRow {
  id: string;
  text: string;
  vault_path: string;
}

const DEFAULT_LIMIT_PER_ASSUMPTION = 5;
const DEFAULT_MAX_ASSUMPTIONS = 20;

/**
 * Run the Radar against the in-scope assumptions. Best-effort: when the
 * evidence-reader subprocess can't spawn, returns
 * `{hits: [], assumptions_scanned: 0, reader_available: false}` so the MCP
 * layer can surface the install-flywheel-memory hint.
 */
export async function radarAssumptions(
  db: IdeasDatabase,
  vaultPath: string,
  options: RadarOptions = {},
): Promise<RadarResult> {
  if (options.idea_id && options.all_load_bearing) {
    throw new RadarInputError(
      'radar accepts either `idea_id` (scope to one idea) or `all_load_bearing: true` (sweep all load-bearing) — not both',
    );
  }
  if (!options.idea_id && !options.all_load_bearing) {
    throw new RadarInputError(
      'radar requires either `idea_id` or `all_load_bearing: true`',
    );
  }

  const limit_per_assumption = options.limit_per_assumption ?? DEFAULT_LIMIT_PER_ASSUMPTION;
  const max_assumptions = options.max_assumptions ?? DEFAULT_MAX_ASSUMPTIONS;

  // Resolve in-scope assumptions. Always: status='open' (refuted / held are
  // out of scope — held already has its outcome; refuted is settled).
  let assumptions: AssumptionRow[];
  if (options.idea_id) {
    assumptions = db
      .prepare(
        `SELECT id, text, vault_path FROM ideas_assumptions
         WHERE idea_id = ? AND status = 'open'
         ORDER BY load_bearing DESC, declared_at ASC
         LIMIT ?`,
      )
      .all(options.idea_id, max_assumptions) as AssumptionRow[];
  } else {
    assumptions = db
      .prepare(
        `SELECT id, text, vault_path FROM ideas_assumptions
         WHERE status = 'open' AND load_bearing = 1
         ORDER BY declared_at ASC
         LIMIT ?`,
      )
      .all(max_assumptions) as AssumptionRow[];
  }

  if (assumptions.length === 0) {
    return { hits: [], assumptions_scanned: 0 };
  }

  // Test-injection path — skip the subprocess spawn entirely.
  if (options.reader_override) {
    const reader = options.reader_override;
    const hits = await runRadarQueries(reader, assumptions, limit_per_assumption);
    return { hits, assumptions_scanned: assumptions.length };
  }

  const outcome = await withEvidenceReader(
    vaultPath,
    async (reader) => {
      return await runRadarQueries(reader, assumptions, limit_per_assumption);
    },
    {
      binary: options.evidence_reader_binary,
      args: options.evidence_reader_args,
      timeoutMs: options.evidence_reader_timeout_ms,
    },
  );

  if (outcome.status === 'ok') {
    return {
      hits: outcome.value,
      assumptions_scanned: assumptions.length,
    };
  }
  throw new EvidenceReaderUnavailableError(outcome.reason, outcome.detail);
}

/**
 * Inner query loop, factored so the reader_override test path and the
 * production withEvidenceReader path share the same logic.
 */
async function runRadarQueries(
  reader: EvidenceReader,
  assumptions: AssumptionRow[],
  limit_per_assumption: number,
): Promise<RadarHit[]> {
  const allHits: RadarHit[] = [];
  for (const asm of assumptions) {
        try {
          const res = await reader.query('search', {
            action: 'query',
            query: asm.text,
            limit: limit_per_assumption,
            detail_count: limit_per_assumption,
          });
          const text = extractToolText(res);
          if (text === null) continue;
          let parsed: { results?: Array<Record<string, unknown>> };
          try {
            parsed = JSON.parse(text);
          } catch {
            continue;
          }
          const results = Array.isArray(parsed.results) ? parsed.results : [];
          for (const r of results) {
            if (typeof r.path !== 'string') continue;
            // Exclude the assumption's own file from its own results.
            if (r.path === asm.vault_path) continue;
            const excerpt =
              typeof r.section_content === 'string'
                ? r.section_content
                : typeof r.snippet === 'string'
                  ? r.snippet
                  : '';
            if (excerpt.length === 0) continue;
            const score = typeof r.confidence_score === 'number' ? r.confidence_score : null;
            allHits.push({
              assumption_id: asm.id,
              assumption_text: asm.text,
              vault_path: r.path,
              excerpt,
              score,
            });
          }
    } catch {
      // Per-assumption query failure is non-fatal — continue with remaining.
      continue;
    }
  }
  return allHits;
}
