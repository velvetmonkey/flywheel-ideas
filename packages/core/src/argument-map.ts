/**
 * Argument maps (v0.2 Phase 1 D8).
 *
 * Restructures a council session's flat synthesis output into a
 * claim → pro → con → evidence tree. Per the Apr 24 roadmap addition:
 * "Flat synthesis is enough for v0.1 — not enough for reuse. A claim → pro
 * → con → evidence tree is a better reuse surface than prose-only dissent
 * notes." References: Kialo argument-mapping research; Loomio decision
 * patterns.
 *
 * **Extraction strategy (deterministic, no LLM in v0.2):**
 *   - Each per-cell parsed stance is treated as one claim in the tree:
 *     - claim.text = the cell's `stance` field
 *     - claim.source_views = [view.id]
 *     - claim.cons = entries from `key_risks` + `fragile_insights`
 *       (each annotated with the source view)
 *     - claim.pros = "evidence" entries from the same cell (claim+source pairs
 *       are weak pros; the persona surfaced them as supporting their stance)
 *     - PLUS: cross-cell agreement (Jaccard > 0.5 between two cell stances)
 *       contributes one extra pro-style "agreement" node referencing the
 *       other view
 *   - Failed cells are skipped — no stance to extract from.
 *
 * A future revision can swap deterministic extraction for LLM-driven claim
 * grouping (the same prompts that drive synthesis can build the tree). The
 * persistence + render pipeline is shape-stable so the upgrade is local.
 *
 * **Persistence:** sidecar table `ideas_argument_maps` (1:1 with sessions,
 * ON DELETE CASCADE). Tree stored as JSON — `tree_json` column.
 *
 * **Render:** markdown emitter `renderArgumentMapMarkdown(tree)` produces
 * a structured document the user can read alongside (or instead of) the
 * existing flat SYNTHESIS.md.
 */

import type { IdeasDatabase } from './db.js';
import type { CouncilViewRow } from './council-sessions.js';
import type { CouncilStance } from './council-parsers.js';
import { jaccard, tokenize } from './council-overlap.js';

export interface ArgumentEvidence {
  claim: string;
  source: string;
}

export interface ArgumentNode {
  text: string;
  /** view ids whose cells surfaced this node. */
  source_views: string[];
  evidence?: ArgumentEvidence[];
}

export interface ArgumentClaim {
  id: string;
  /** The claim text — usually a cell's stance summary. */
  text: string;
  /** view ids whose cells emitted this claim. */
  source_views: string[];
  /** Persona id that originated the claim (first contributor). */
  origin_persona: string;
  /** Cell-level confidence at the time of claim emission (0-1). */
  confidence: number | null;
  pros: ArgumentNode[];
  cons: ArgumentNode[];
}

export interface ArgumentTree {
  session_id: string;
  /** Schema-shape version for forward-compat. */
  tree_version: 1;
  claims: ArgumentClaim[];
  /** ISO timestamp matching the row's generated_at column. */
  generated_at_iso: string;
  /** Cells whose failure_reason was non-null and were skipped. */
  skipped_failed_view_ids: string[];
}

export interface ExtractArgumentTreeInput {
  session_id: string;
  views: CouncilViewRow[];
  /** Parsed stance per view id (caller usually has this from the synthesis pass). */
  stances: Map<string, CouncilStance>;
  /** Jaccard threshold above which two stances count as an "agreement" cross-pro. Default 0.5. */
  agreement_threshold?: number;
}

/**
 * Build the claim tree deterministically from the per-cell parsed stances.
 * Pure function — no DB / fs / subprocess access.
 */
export function extractArgumentTree(
  input: ExtractArgumentTreeInput,
  generated_at: number = Date.now(),
): ArgumentTree {
  const threshold = input.agreement_threshold ?? 0.5;
  const succeeded = input.views.filter((v) => v.failure_reason == null);
  const failed_ids = input.views.filter((v) => v.failure_reason != null).map((v) => v.id);

  // Pre-tokenize stances for cross-cell jaccard checks.
  const stanceTokens = new Map<string, Set<string>>();
  for (const v of succeeded) {
    const parsed = input.stances.get(v.id);
    const stance = parsed?.stance ?? v.stance ?? '';
    if (stance) stanceTokens.set(v.id, new Set(tokenize(stance)));
  }

  const claims: ArgumentClaim[] = [];
  let claim_counter = 1;

  for (const v of succeeded) {
    const parsed = input.stances.get(v.id);
    const stance = parsed?.stance ?? v.stance ?? '';
    if (!stance) continue;

    const id = `claim-${String(claim_counter).padStart(3, '0')}`;
    claim_counter += 1;

    const cons: ArgumentNode[] = [];
    if (parsed?.key_risks) {
      for (const risk of parsed.key_risks) {
        cons.push({ text: risk, source_views: [v.id] });
      }
    }
    if (parsed?.fragile_insights) {
      for (const fragile of parsed.fragile_insights) {
        cons.push({
          text: `Fragile: ${fragile}`,
          source_views: [v.id],
        });
      }
    }

    const pros: ArgumentNode[] = [];
    if (parsed?.evidence) {
      for (const e of parsed.evidence) {
        pros.push({
          text: e.claim,
          source_views: [v.id],
          evidence: [{ claim: e.claim, source: e.source }],
        });
      }
    }

    // Cross-cell agreement: any other succeeded cell whose stance Jaccard > threshold
    // contributes a pro-style agreement node.
    const myTokens = stanceTokens.get(v.id);
    if (myTokens) {
      for (const other of succeeded) {
        if (other.id === v.id) continue;
        const otherTokens = stanceTokens.get(other.id);
        if (!otherTokens) continue;
        const score = jaccard(myTokens, otherTokens);
        if (score > threshold) {
          pros.push({
            text: `Agreement from ${other.persona} (jaccard ${score.toFixed(2)})`,
            source_views: [other.id],
          });
        }
      }
    }

    claims.push({
      id,
      text: stance,
      source_views: [v.id],
      origin_persona: v.persona,
      confidence: parsed?.confidence ?? v.confidence,
      pros,
      cons,
    });
  }

  return {
    session_id: input.session_id,
    tree_version: 1,
    claims,
    generated_at_iso: new Date(generated_at).toISOString(),
    skipped_failed_view_ids: failed_ids,
  };
}

/**
 * Render the argument tree as markdown. Sectioned by claim; each claim
 * lists pros + cons + evidence. Stable output for the same input so it
 * round-trips cleanly through the diff tools.
 */
export function renderArgumentMapMarkdown(tree: ArgumentTree, idea_title: string): string {
  const lines: string[] = [];
  lines.push(`# Argument map — session ${tree.session_id}`);
  lines.push('');
  lines.push(`**Idea:** ${idea_title}`);
  lines.push(`**Generated:** ${tree.generated_at_iso}`);
  lines.push(`**Claims:** ${tree.claims.length}`);
  if (tree.skipped_failed_view_ids.length > 0) {
    lines.push(`**Skipped (failed cells):** ${tree.skipped_failed_view_ids.length}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  if (tree.claims.length === 0) {
    lines.push('_No succeeded cells — argument map is empty._');
    lines.push('');
    return lines.join('\n');
  }

  for (const c of tree.claims) {
    lines.push(`## ${c.id} — ${c.origin_persona}`);
    lines.push('');
    lines.push(`**Confidence:** ${c.confidence == null ? '—' : c.confidence.toFixed(2)}`);
    lines.push(`**Source view(s):** ${c.source_views.join(', ')}`);
    lines.push('');
    lines.push('### Claim');
    lines.push('');
    lines.push(c.text.trim());
    lines.push('');
    if (c.pros.length > 0) {
      lines.push('### Pros');
      lines.push('');
      for (const p of c.pros) {
        lines.push(`- ${p.text}`);
        if (p.evidence && p.evidence.length > 0) {
          for (const e of p.evidence) {
            lines.push(`  - evidence: ${e.claim} (${e.source})`);
          }
        }
      }
      lines.push('');
    }
    if (c.cons.length > 0) {
      lines.push('### Cons');
      lines.push('');
      for (const con of c.cons) {
        lines.push(`- ${con.text}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface ArgumentMapRow {
  session_id: string;
  tree: ArgumentTree;
  generated_at: number;
}

/**
 * Insert or replace the argument-map row for a council session.
 */
export function recordArgumentMap(
  db: IdeasDatabase,
  tree: ArgumentTree,
  generated_at: number = Date.now(),
): void {
  db.prepare(
    `INSERT OR REPLACE INTO ideas_argument_maps (session_id, tree_json, generated_at)
     VALUES (?, ?, ?)`,
  ).run(tree.session_id, JSON.stringify(tree), generated_at);
}

/**
 * Read the argument-map row for a session. Returns null when not present;
 * defensive on malformed JSON.
 */
export function getArgumentMap(db: IdeasDatabase, session_id: string): ArgumentMapRow | null {
  const row = db
    .prepare(
      `SELECT session_id, tree_json, generated_at FROM ideas_argument_maps WHERE session_id = ?`,
    )
    .get(session_id) as { session_id: string; tree_json: string; generated_at: number } | undefined;
  if (!row) return null;
  let tree: ArgumentTree;
  try {
    const parsed = JSON.parse(row.tree_json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.tree_version === 'number' &&
      Array.isArray(parsed.claims)
    ) {
      tree = parsed as ArgumentTree;
    } else {
      tree = {
        session_id: row.session_id,
        tree_version: 1,
        claims: [],
        generated_at_iso: new Date(row.generated_at).toISOString(),
        skipped_failed_view_ids: [],
      };
    }
  } catch {
    tree = {
      session_id: row.session_id,
      tree_version: 1,
      claims: [],
      generated_at_iso: new Date(row.generated_at).toISOString(),
      skipped_failed_view_ids: [],
    };
  }
  return { session_id: row.session_id, tree, generated_at: row.generated_at };
}
