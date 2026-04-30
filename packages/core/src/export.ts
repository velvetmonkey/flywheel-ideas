/**
 * Export — read-only portfolio aggregator (P2.9).
 *
 * Builds a portable, side-effect-free snapshot of an idea + its outcomes +
 * council sessions + (optional) lineage. Reuses `buildSnapshot()` for the
 * freeze-shape core; adds outcomes-with-verdicts join and disk-read of
 * SYNTHESIS.md.
 *
 * Read-only — no DB writes, no vault writes. The output is the artifact.
 *
 * Companion renderer in `export-markdown.ts` produces the human-readable
 * markdown bundle.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IdeasDatabase } from './db.js';
import {
  buildSnapshot,
  listFreezesByIdea,
  type FreezeSnapshot,
} from './freezes.js';
import { getAncestry, getDescendants, type LineageNode } from './lineage.js';

export interface ExportedOutcomeVerdict {
  assumption_id: string;
  assumption_text: string;
  verdict: 'refuted' | 'validated';
}

export interface ExportedOutcome {
  id: string;
  text: string;
  landed_at: number;
  landed_at_iso: string;
  vault_path: string;
  undone_at: number | null;
  verdicts: ExportedOutcomeVerdict[];
}

export interface ExportedCouncilSession {
  id: string;
  mode: string;
  depth: string;
  started_at: number;
  started_at_iso: string;
  completed_at: number | null;
  synthesis_vault_path: string | null;
  synthesis_md: string | null;
  synthesis_missing: boolean;
}

export interface ExportedLineage {
  ancestors: LineageNode[];
  descendants: LineageNode[];
}

export interface ExportedIdea {
  snapshot: FreezeSnapshot;
  /** id of the persisted freeze used for this idea, or null if a transient snapshot was built. */
  freeze_id: string | null;
  outcomes: ExportedOutcome[];
  council_sessions: ExportedCouncilSession[];
  lineage?: ExportedLineage;
}

export interface ExportPortfolio {
  schema_version: 2;
  exported_at: number;
  exported_at_iso: string;
  vault_path: string;
  ideas: ExportedIdea[];
}

export interface ExportIdeaOptions {
  /** Include ancestry + descendants lineage block. Default true. */
  include_lineage?: boolean;
  /** Include private idea context in the exported artifact. Default false. */
  include_private_context?: boolean;
}

function stripPrivateContext(snapshot: FreezeSnapshot): FreezeSnapshot {
  return {
    ...snapshot,
    idea: {
      ...snapshot.idea,
      context: null,
      extension: snapshot.idea.extension
        ? {
            ...snapshot.idea.extension,
            context: null,
          }
        : null,
    },
  };
}

/**
 * Build a portable, read-only snapshot of an idea + its outcomes + council
 * sessions + (optional) lineage. Reuses `buildSnapshot()` for the freeze-shape
 * core; adds outcomes-with-verdicts join and disk-read of SYNTHESIS.md.
 *
 * If a persisted freeze exists for the idea, the latest one's snapshot is
 * reused (deterministic — same idea + freeze → same snapshot bytes). If no
 * freeze exists, a transient snapshot is built without persisting.
 *
 * Behaviour for missing artifacts:
 * - Idea row missing → throws IdeaNotFoundError (from buildSnapshot).
 * - SYNTHESIS.md missing on disk → session listed with `synthesis_missing: true`.
 * - Body missing on disk → empty body in snapshot (buildSnapshot's existing behaviour).
 */
export function exportIdea(
  db: IdeasDatabase,
  vaultPath: string,
  idea_id: string,
  options: ExportIdeaOptions = {},
): ExportedIdea {
  const freezes = listFreezesByIdea(db, idea_id, { order: 'desc', limit: 1 });
  let snapshot: FreezeSnapshot;
  let freeze_id: string | null = null;
  if (freezes.length > 0) {
    snapshot = freezes[0].snapshot;
    freeze_id = freezes[0].id;
  } else {
    snapshot = buildSnapshot(db, vaultPath, idea_id);
  }
  if (options.include_private_context !== true) {
    snapshot = stripPrivateContext(snapshot);
  }

  // Outcomes + verdicts join. assumption text resolved from ideas_assumptions
  // via LEFT JOIN — a verdict against a forgotten assumption surfaces as
  // empty text rather than throwing.
  const outcomeRows = db
    .prepare(
      `SELECT id, idea_id, text, vault_path, landed_at, undone_at
       FROM ideas_outcomes WHERE idea_id = ?
       ORDER BY landed_at ASC, id ASC`,
    )
    .all(idea_id) as Array<{
    id: string;
    idea_id: string;
    text: string;
    vault_path: string;
    landed_at: number;
    undone_at: number | null;
  }>;

  const outcomes: ExportedOutcome[] = outcomeRows.map((o) => {
    const verdictRows = db
      .prepare(
        `SELECT v.assumption_id, v.verdict, a.text
         FROM ideas_outcome_verdicts v
         LEFT JOIN ideas_assumptions a ON a.id = v.assumption_id
         WHERE v.outcome_id = ?
         ORDER BY v.assumption_id ASC`,
      )
      .all(o.id) as Array<{ assumption_id: string; verdict: string; text: string | null }>;

    return {
      id: o.id,
      text: o.text,
      landed_at: o.landed_at,
      landed_at_iso: new Date(o.landed_at).toISOString(),
      vault_path: o.vault_path,
      undone_at: o.undone_at,
      verdicts: verdictRows.map((v) => ({
        assumption_id: v.assumption_id,
        assumption_text: v.text ?? '',
        verdict: v.verdict as 'refuted' | 'validated',
      })),
    };
  });

  // Council sessions + SYNTHESIS.md disk read.
  const sessionRows = db
    .prepare(
      `SELECT id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path
       FROM ideas_council_sessions WHERE idea_id = ?
       ORDER BY started_at ASC, id ASC`,
    )
    .all(idea_id) as Array<{
    id: string;
    idea_id: string;
    depth: string;
    mode: string;
    started_at: number;
    completed_at: number | null;
    synthesis_vault_path: string | null;
  }>;

  const council_sessions: ExportedCouncilSession[] = sessionRows.map((s) => {
    let synthesis_md: string | null = null;
    let synthesis_missing = false;
    if (s.synthesis_vault_path) {
      const absPath = path.isAbsolute(s.synthesis_vault_path)
        ? s.synthesis_vault_path
        : path.join(vaultPath, s.synthesis_vault_path);
      try {
        synthesis_md = fs.readFileSync(absPath, 'utf8');
      } catch {
        synthesis_missing = true;
      }
    } else {
      synthesis_missing = true;
    }
    return {
      id: s.id,
      mode: s.mode,
      depth: s.depth,
      started_at: s.started_at,
      started_at_iso: new Date(s.started_at).toISOString(),
      completed_at: s.completed_at,
      synthesis_vault_path: s.synthesis_vault_path,
      synthesis_md,
      synthesis_missing,
    };
  });

  const include_lineage = options.include_lineage ?? true;
  let lineage: ExportedLineage | undefined;
  if (include_lineage) {
    lineage = {
      ancestors: getAncestry(db, idea_id),
      descendants: getDescendants(db, idea_id),
    };
  }

  return {
    snapshot,
    freeze_id,
    outcomes,
    council_sessions,
    lineage,
  };
}

export interface ExportPortfolioOptions extends ExportIdeaOptions {
  // Reserved for future expansion (format selectors, page size, etc.).
}

/**
 * Build a multi-idea portfolio. Order of `ideas` in the result matches input
 * order, allowing callers to control the rendering sequence.
 */
export function exportPortfolio(
  db: IdeasDatabase,
  vaultPath: string,
  idea_ids: string[],
  options: ExportPortfolioOptions = {},
  now: number = Date.now(),
): ExportPortfolio {
  const ideas = idea_ids.map((id) => exportIdea(db, vaultPath, id, options));
  return {
    schema_version: 2,
    exported_at: now,
    exported_at_iso: new Date(now).toISOString(),
    vault_path: vaultPath,
    ideas,
  };
}

/**
 * Convenience: list all idea ids in the vault for the `all: true` export path.
 * (`idea.forget` deletes the row, so we don't need to filter by state here —
 * any row in `ideas_notes` represents a present-day idea.)
 */
export function listAllIdeaIds(db: IdeasDatabase): string[] {
  const rows = db
    .prepare(`SELECT id FROM ideas_notes ORDER BY created_at ASC, id ASC`)
    .all() as Array<{ id: string }>;
  return rows.map((r) => r.id);
}
