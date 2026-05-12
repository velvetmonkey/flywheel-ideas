import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  buildConsistencyDoctorReport,
  deleteIdeasDbFiles,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-consistency-doctor-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

async function writeMarkdown(
  relPath: string,
  frontmatter: Record<string, unknown>,
  body: string = 'body\n',
): Promise<void> {
  const full = path.join(vault, relPath);
  await fsp.mkdir(path.dirname(full), { recursive: true });
  await fsp.writeFile(full, matter.stringify(body, frontmatter), 'utf8');
}

function seedIdea(id = 'idea-a', relPath = 'ideas/idea-a.md'): void {
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, relPath, 'Idea A', 'nascent', 1000, 1000);
}

describe('buildConsistencyDoctorReport', () => {
  it('returns ok for a clean idea/assumption/outcome ledger', async () => {
    seedIdea();
    await writeMarkdown('ideas/idea-a.md', {
      id: 'idea-a',
      type: 'idea',
      title: 'Idea A',
      state: 'nascent',
      created_at: new Date(1000).toISOString(),
    });

    db.prepare(
      `INSERT INTO ideas_assumptions
       (id, idea_id, text, status, load_bearing, vault_path, declared_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('asm-a', 'idea-a', 'assumption text', 'open', 1, 'assumptions/asm-a.md', 2000);
    await writeMarkdown('assumptions/asm-a.md', {
      id: 'asm-a',
      type: 'assumption',
      idea_id: 'idea-a',
      status: 'open',
      load_bearing: true,
      declared_at: new Date(2000).toISOString(),
    });

    db.prepare(
      `INSERT INTO ideas_outcomes (id, idea_id, text, vault_path, landed_at, undone_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    ).run('out-a', 'idea-a', 'outcome text', 'outcomes/out-a.md', 3000);
    db.prepare(
      `INSERT INTO ideas_outcome_verdicts (outcome_id, assumption_id, verdict)
       VALUES (?, ?, ?)`,
    ).run('out-a', 'asm-a', 'refuted');
    await writeMarkdown('outcomes/out-a.md', {
      id: 'out-a',
      type: 'outcome',
      idea_id: 'idea-a',
      landed_at: new Date(3000).toISOString(),
      refutes: ['asm-a'],
      validates: [],
      undone_at: null,
    });

    const report = await buildConsistencyDoctorReport(db, vault);

    expect(report.ok).toBe(true);
    expect(report.issue_count).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('reports missing markdown, stale frontmatter, orphan markdown, and council drift', async () => {
    seedIdea('idea-missing', 'ideas/missing.md');
    seedIdea('idea-stale', 'ideas/stale.md');
    await writeMarkdown('ideas/stale.md', {
      id: 'idea-stale',
      type: 'idea',
      title: 'Idea A',
      state: 'explored',
      created_at: new Date(1000).toISOString(),
    });
    await writeMarkdown('ideas/orphan.md', {
      id: 'idea-orphan',
      type: 'idea',
      title: 'Orphan',
      state: 'nascent',
      created_at: new Date(1000).toISOString(),
    });

    db.prepare(
      `INSERT INTO ideas_council_sessions
       (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    ).run('sess-a', 'idea-stale', 'light', 'standard', 4000, 'councils/sess-a/SYNTHESIS.md');
    db.prepare(
      `INSERT INTO ideas_council_views
       (id, session_id, model, persona, prompt_version, persona_version,
        input_hash, content_vault_path, failure_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'view-a',
      'sess-a',
      'claude',
      'risk-pessimist',
      '1',
      '1',
      'hash',
      'councils/sess-a/view.md',
      'timeout',
    );

    const report = await buildConsistencyDoctorReport(db, vault);
    const kinds = report.issues.map((issue) => issue.kind);

    expect(report.ok).toBe(false);
    expect(kinds).toContain('missing_markdown');
    expect(kinds).toContain('stale_frontmatter');
    expect(kinds).toContain('orphan_markdown');
    expect(kinds).toContain('incomplete_council_session');
    expect(kinds).toContain('failed_council_view');
    expect(report.counts.missing_markdown).toBeGreaterThanOrEqual(3);
    expect(
      report.issues.some(
        (issue) => issue.kind === 'stale_frontmatter' && issue.field === 'state',
      ),
    ).toBe(true);
  });
});
