import type { IdeasDatabase } from './db.js';
import { PERSONAS } from './council-prompts.js';
import { getOutcomeMemo } from './outcome-memos.js';

export interface EffectivenessReportInput {
  from_ms: number;
  to_ms: number;
  persona_ids?: string[];
  cli_ids?: string[];
}

export interface EffectivenessReportRow {
  sample_size: number;
  refuted_assumption_citation_rate: number | null;
  most_vulnerable_match_rate: number | null;
  load_bearing_denominator: number;
  load_bearing_refuted_citation_rate: number | null;
}

export interface EffectivenessCliRow extends EffectivenessReportRow {
  cli_id: string;
}

export interface EffectivenessPersonaRow extends EffectivenessReportRow {
  persona_id: string;
  cli_breakdown: EffectivenessCliRow[];
}

export interface EffectivenessReport {
  from_ms: number;
  to_ms: number;
  qualifying_outcome_count: number;
  successful_view_count: number;
  personas: EffectivenessPersonaRow[];
}

interface ScoreAccumulator {
  sample_size: number;
  refuted_hits: number;
  most_vulnerable_hits: number;
  load_bearing_denominator: number;
  load_bearing_refuted_hits: number;
}

interface ScoredView {
  persona_id: string;
  cli_id: string;
  cited_ground_truth: boolean;
  matches_most_vulnerable: boolean;
  load_bearing_ground_truth: boolean;
}

function emptyAccumulator(): ScoreAccumulator {
  return {
    sample_size: 0,
    refuted_hits: 0,
    most_vulnerable_hits: 0,
    load_bearing_denominator: 0,
    load_bearing_refuted_hits: 0,
  };
}

function finalizeRow(acc: ScoreAccumulator): EffectivenessReportRow {
  return {
    sample_size: acc.sample_size,
    refuted_assumption_citation_rate:
      acc.sample_size > 0 ? acc.refuted_hits / acc.sample_size : null,
    most_vulnerable_match_rate:
      acc.sample_size > 0 ? acc.most_vulnerable_hits / acc.sample_size : null,
    load_bearing_denominator: acc.load_bearing_denominator,
    load_bearing_refuted_citation_rate:
      acc.load_bearing_denominator > 0
        ? acc.load_bearing_refuted_hits / acc.load_bearing_denominator
        : null,
  };
}

function scoreView(acc: ScoreAccumulator, view: ScoredView): void {
  acc.sample_size += 1;
  if (view.cited_ground_truth) acc.refuted_hits += 1;
  if (view.matches_most_vulnerable) acc.most_vulnerable_hits += 1;
  if (view.load_bearing_ground_truth) {
    acc.load_bearing_denominator += 1;
    if (view.cited_ground_truth) acc.load_bearing_refuted_hits += 1;
  }
}

export function buildCouncilEffectivenessReport(
  db: IdeasDatabase,
  input: EffectivenessReportInput,
): EffectivenessReport {
  const outcomeRows = db
    .prepare(
      `SELECT id, idea_id, landed_at
         FROM ideas_outcomes
        WHERE undone_at IS NULL
          AND landed_at >= ?
          AND landed_at <= ?
        ORDER BY landed_at ASC, id ASC`,
    )
    .all(input.from_ms, input.to_ms) as Array<{ id: string; idea_id: string; landed_at: number }>;

  const scoredViews: ScoredView[] = [];
  let qualifying_outcome_count = 0;

  for (const outcome of outcomeRows) {
    const memo = getOutcomeMemo(db, outcome.id);
    let ground_truth_assumption_id = memo?.memo.refuted_assumption_id ?? null;
    if (!ground_truth_assumption_id) {
      const refuted = db
        .prepare(
          `SELECT assumption_id
             FROM ideas_outcome_verdicts
            WHERE outcome_id = ? AND verdict = 'refuted'
            ORDER BY assumption_id ASC`,
        )
        .all(outcome.id) as Array<{ assumption_id: string }>;
      if (refuted.length === 1) {
        ground_truth_assumption_id = refuted[0].assumption_id;
      }
    }
    if (!ground_truth_assumption_id) continue;

    const groundTruth = db
      .prepare(
        `SELECT id, load_bearing
           FROM ideas_assumptions
          WHERE id = ?`,
      )
      .get(ground_truth_assumption_id) as
      | { id: string; load_bearing: number | boolean }
      | undefined;
    if (!groundTruth) continue;

    const session = db
      .prepare(
        `SELECT id
           FROM ideas_council_sessions
          WHERE idea_id = ?
            AND purpose = 'predictive'
            AND completed_at IS NOT NULL
            AND completed_at < ?
          ORDER BY completed_at DESC, id DESC
          LIMIT 1`,
      )
      .get(outcome.idea_id, outcome.landed_at) as { id: string } | undefined;
    if (!session) continue;

    const views = db
      .prepare(
        `SELECT id, model, persona, most_vulnerable_assumption_id
           FROM ideas_council_views
          WHERE session_id = ?
            AND failure_reason IS NULL
            AND stance IS NOT NULL
          ORDER BY rowid ASC`,
      )
      .all(session.id) as Array<{
      id: string;
      model: string;
      persona: string;
      most_vulnerable_assumption_id: string | null;
    }>;
    if (views.length === 0) continue;

    qualifying_outcome_count += 1;
    for (const view of views) {
      const citations = db
        .prepare(
          `SELECT DISTINCT assumption_id
             FROM ideas_assumption_citations
            WHERE view_id = ?`,
        )
        .all(view.id) as Array<{ assumption_id: string }>;
      const citedSet = new Set(citations.map((row) => row.assumption_id));
      scoredViews.push({
        persona_id: view.persona,
        cli_id: view.model,
        cited_ground_truth: citedSet.has(ground_truth_assumption_id),
        matches_most_vulnerable:
          view.most_vulnerable_assumption_id === ground_truth_assumption_id,
        load_bearing_ground_truth: Boolean(groundTruth.load_bearing),
      });
    }
  }

  const requestedPersonas = new Set(input.persona_ids ?? []);
  const requestedClis = new Set(input.cli_ids ?? []);
  const filterPersona = input.persona_ids && input.persona_ids.length > 0;
  const filterCli = input.cli_ids && input.cli_ids.length > 0;

  const personaAcc = new Map<string, ScoreAccumulator>();
  const cliAccByPersona = new Map<string, Map<string, ScoreAccumulator>>();

  for (const view of scoredViews) {
    if (filterPersona && !requestedPersonas.has(view.persona_id)) continue;
    if (filterCli && !requestedClis.has(view.cli_id)) continue;

    const persona = personaAcc.get(view.persona_id) ?? emptyAccumulator();
    scoreView(persona, view);
    personaAcc.set(view.persona_id, persona);

    const cliMap = cliAccByPersona.get(view.persona_id) ?? new Map<string, ScoreAccumulator>();
    const cli = cliMap.get(view.cli_id) ?? emptyAccumulator();
    scoreView(cli, view);
    cliMap.set(view.cli_id, cli);
    cliAccByPersona.set(view.persona_id, cliMap);
  }

  for (const persona_id of requestedPersonas) {
    if (!personaAcc.has(persona_id)) personaAcc.set(persona_id, emptyAccumulator());
    if (!cliAccByPersona.has(persona_id)) cliAccByPersona.set(persona_id, new Map());
    const cliMap = cliAccByPersona.get(persona_id)!;
    for (const cli_id of requestedClis) {
      if (!cliMap.has(cli_id)) cliMap.set(cli_id, emptyAccumulator());
    }
  }

  if (filterCli && !filterPersona) {
    for (const persona of PERSONAS) {
      if (!personaAcc.has(persona.id)) personaAcc.set(persona.id, emptyAccumulator());
      if (!cliAccByPersona.has(persona.id)) cliAccByPersona.set(persona.id, new Map());
      const cliMap = cliAccByPersona.get(persona.id)!;
      for (const cli_id of requestedClis) {
        if (!cliMap.has(cli_id)) cliMap.set(cli_id, emptyAccumulator());
      }
    }
  }

  const personas: EffectivenessPersonaRow[] = [...personaAcc.entries()]
    .filter(([, acc]) => acc.sample_size > 0 || filterPersona || filterCli)
    .map(([persona_id, acc]) => {
      const cliMap = cliAccByPersona.get(persona_id) ?? new Map<string, ScoreAccumulator>();
      const cli_breakdown = [...cliMap.entries()]
        .filter(([, cliAcc]) => cliAcc.sample_size > 0 || filterCli)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cli_id, cliAcc]) => ({
          cli_id,
          ...finalizeRow(cliAcc),
        }));
      return {
        persona_id,
        ...finalizeRow(acc),
        cli_breakdown,
      };
    })
    .sort((a, b) => {
      const aRate = a.refuted_assumption_citation_rate ?? -1;
      const bRate = b.refuted_assumption_citation_rate ?? -1;
      if (bRate !== aRate) return bRate - aRate;
      if (b.sample_size !== a.sample_size) return b.sample_size - a.sample_size;
      return a.persona_id.localeCompare(b.persona_id);
    });

  const successful_view_count = personas.reduce((sum, row) => sum + row.sample_size, 0);

  return {
    from_ms: input.from_ms,
    to_ms: input.to_ms,
    qualifying_outcome_count,
    successful_view_count,
    personas,
  };
}
