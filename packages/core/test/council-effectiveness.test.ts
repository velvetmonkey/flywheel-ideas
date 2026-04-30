import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fsp from 'node:fs/promises';
import {
  buildCouncilEffectivenessReport,
  declareAssumption,
  deleteIdeasDbFiles,
  logOutcome,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-effectiveness-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

async function seedIdea(id = 'idea-a'): Promise<void> {
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, 'evaluated', 1, 1)`,
  ).run(id, `ideas/${id}.md`, id);
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(path.join(vault, `ideas/${id}.md`), `# ${id}\n`, 'utf8');
}

function insertView(params: {
  session_id: string;
  idea_id: string;
  completed_at: number;
  purpose?: 'predictive' | 'retrospective';
  model?: string;
  persona?: string;
  cited_assumption_id?: string;
  most_vulnerable_assumption_id?: string | null;
}): void {
  const purpose = params.purpose ?? 'predictive';
  const model = params.model ?? 'claude';
  const persona = params.persona ?? 'risk-pessimist';
  const view_id = `view-${params.session_id}`;
  db.prepare(
    `INSERT INTO ideas_council_sessions
       (id, idea_id, depth, mode, purpose, outcome_id, started_at, completed_at, synthesis_vault_path)
     VALUES (?, ?, 'light', 'standard', ?, NULL, ?, ?, ?)`,
  ).run(
    params.session_id,
    params.idea_id,
    purpose,
    params.completed_at - 1,
    params.completed_at,
    `councils/${params.session_id}/SYNTHESIS.md`,
  );
  db.prepare(
    `INSERT INTO ideas_council_views
       (id, session_id, model, persona, prompt_version, persona_version, model_version, input_hash,
        initial_stance, stance, self_critique, confidence, most_vulnerable_assumption_id,
        content_vault_path, failure_reason, stderr_tail)
     VALUES (?, ?, ?, ?, '1', '1', NULL, ?, 'initial', 'stance', 'critique', 0.7, ?, ?, NULL, NULL)`,
  ).run(
    view_id,
    params.session_id,
    model,
    persona,
    `hash-${view_id}`,
    params.most_vulnerable_assumption_id ?? null,
    `councils/${params.session_id}/${view_id}.md`,
  );
  if (params.cited_assumption_id) {
    db.prepare(
      `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
    ).run(view_id, params.cited_assumption_id);
  }
}

describe('buildCouncilEffectivenessReport', () => {
  it('returns explicit zero-sample rows for cli-only filters', () => {
    const report = buildCouncilEffectivenessReport(db, {
      from_ms: 0,
      to_ms: 10,
      cli_ids: ['claude'],
    });
    expect(report.qualifying_outcome_count).toBe(0);
    expect(report.successful_view_count).toBe(0);
    expect(report.personas.length).toBeGreaterThan(0);
    expect(report.personas.every((row) => row.sample_size === 0)).toBe(true);
    expect(report.personas.every((row) => row.cli_breakdown[0]?.cli_id === 'claude')).toBe(true);
  });

  it('uses the latest predictive pre-outcome session and excludes retrospective sessions', async () => {
    await seedIdea('idea-a');
    const asm = (
      await declareAssumption(db, vault, {
        idea_id: 'idea-a',
        text: 'ground truth',
        load_bearing: true,
      })
    ).assumption.id;

    insertView({
      session_id: 'sess-old',
      idea_id: 'idea-a',
      completed_at: 100,
      cited_assumption_id: undefined,
      most_vulnerable_assumption_id: null,
    });
    insertView({
      session_id: 'sess-latest',
      idea_id: 'idea-a',
      completed_at: 200,
      cited_assumption_id: asm,
      most_vulnerable_assumption_id: asm,
    });
    insertView({
      session_id: 'sess-retro',
      idea_id: 'idea-a',
      completed_at: 250,
      purpose: 'retrospective',
      cited_assumption_id: undefined,
      most_vulnerable_assumption_id: null,
    });

    const outcome = await logOutcome(
      db,
      vault,
      {
        idea_id: 'idea-a',
        text: 'Reality refuted the assumption',
        refutes: [asm],
      },
      300,
    );

    const report = buildCouncilEffectivenessReport(db, {
      from_ms: outcome.outcome.landed_at - 1,
      to_ms: outcome.outcome.landed_at + 1,
    });

    expect(report.qualifying_outcome_count).toBe(1);
    expect(report.successful_view_count).toBe(1);
    expect(report.personas).toHaveLength(1);
    expect(report.personas[0].refuted_assumption_citation_rate).toBe(1);
    expect(report.personas[0].most_vulnerable_match_rate).toBe(1);
  });
});
