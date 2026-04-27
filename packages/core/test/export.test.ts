/**
 * Unit tests for export.ts + export-markdown.ts (P2.9 — exportable decision portfolios).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  createFreeze,
  declareAssumption,
  deleteIdeasDbFiles,
  exportIdea,
  exportPortfolio,
  listAllIdeaIds,
  logOutcome,
  openIdeasDb,
  renderPortfolioMarkdown,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-export-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

async function seedIdea(id: string, title: string, body = '', state = 'evaluated', created_at = 1): Promise<void> {
  const relPath = `ideas/${id}.md`;
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, relPath, title, state, created_at, created_at);
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(
    path.join(vault, relPath),
    `---\ntitle: ${title}\n---\n\n${body}\n`,
    'utf8',
  );
}

async function seedAssumption(idea_id: string, text: string, load_bearing = false): Promise<string> {
  const result = await declareAssumption(db, vault, { idea_id, text, load_bearing });
  return result.assumption.id;
}

async function seedCouncilSession(
  idea_id: string,
  opts: { id?: string; mode?: string; synthesis_md?: string | null } = {},
): Promise<{ id: string; synthesis_path: string | null }> {
  const id = opts.id ?? `sess-${idea_id}`;
  const mode = opts.mode ?? 'pre_mortem';
  let synthesisRel: string | null = null;
  if (opts.synthesis_md !== null) {
    synthesisRel = `councils/${idea_id}/${id}/SYNTHESIS.md`;
    const absPath = path.join(vault, synthesisRel);
    await fsp.mkdir(path.dirname(absPath), { recursive: true });
    await fsp.writeFile(absPath, opts.synthesis_md ?? '# Synthesis\n\nSample council synthesis prose.\n', 'utf8');
  }
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, idea_id, 'light', mode, 100, 200, synthesisRel);
  return { id, synthesis_path: synthesisRel };
}

describe('exportIdea', () => {
  it('returns idea + assumptions + outcomes + council_sessions + lineage', async () => {
    await seedIdea('idea-a', 'Migrate to event-driven', 'Body about EDA.');
    await seedAssumption('idea-a', 'Ops team can absorb the complexity', true);
    await seedAssumption('idea-a', 'Latency stays under 100ms', false);
    await seedCouncilSession('idea-a', { synthesis_md: '# Test synthesis\n\nThe council debated the ops question.' });

    const exported = exportIdea(db, vault, 'idea-a');

    expect(exported.snapshot.idea.title).toBe('Migrate to event-driven');
    expect(exported.snapshot.assumptions).toHaveLength(2);
    expect(exported.freeze_id).toBeNull(); // no persisted freeze; transient snapshot
    expect(exported.outcomes).toHaveLength(0);
    expect(exported.council_sessions).toHaveLength(1);
    expect(exported.council_sessions[0].synthesis_md).toContain('The council debated');
    expect(exported.council_sessions[0].synthesis_missing).toBe(false);
    expect(exported.lineage).toBeDefined();
    expect(exported.lineage?.ancestors).toEqual([]);
    expect(exported.lineage?.descendants).toEqual([]);
  });

  it('reuses persisted freeze if one exists', async () => {
    await seedIdea('idea-a', 'Migrate to event-driven', 'Body about EDA.');
    await seedAssumption('idea-a', 'Assumption 1', true);
    const fr = createFreeze(db, vault, 'idea-a', {}, 5000);

    const exported = exportIdea(db, vault, 'idea-a');

    expect(exported.freeze_id).toBe(fr.id);
    expect(exported.snapshot.frozen_at_iso).toBe(fr.snapshot.frozen_at_iso);
  });

  it('surfaces outcomes with refute/validate verdicts and resolved assumption text', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    const a1 = await seedAssumption('idea-a', 'Throughput holds at 5x', true);
    const a2 = await seedAssumption('idea-a', 'Cost is acceptable', true);

    await logOutcome(db, vault, {
      idea_id: 'idea-a',
      text: 'Throughput broke at 3x. Cost held.',
      refutes: [a1],
      validates: [a2],
    });

    const exported = exportIdea(db, vault, 'idea-a');

    expect(exported.outcomes).toHaveLength(1);
    const o = exported.outcomes[0];
    expect(o.text).toContain('Throughput broke');
    expect(o.verdicts).toHaveLength(2);
    const refute = o.verdicts.find((v) => v.verdict === 'refuted');
    const validate = o.verdicts.find((v) => v.verdict === 'validated');
    expect(refute?.assumption_text).toContain('Throughput');
    expect(validate?.assumption_text).toContain('Cost');
  });

  it('marks synthesis_missing when SYNTHESIS.md is absent on disk', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    await seedCouncilSession('idea-a', { synthesis_md: 'will be deleted' });
    // Delete the SYNTHESIS.md to simulate it going missing
    const sessRow = db.prepare('SELECT synthesis_vault_path FROM ideas_council_sessions WHERE id = ?').get('sess-idea-a') as { synthesis_vault_path: string };
    await fsp.rm(path.join(vault, sessRow.synthesis_vault_path));

    const exported = exportIdea(db, vault, 'idea-a');

    expect(exported.council_sessions).toHaveLength(1);
    expect(exported.council_sessions[0].synthesis_missing).toBe(true);
    expect(exported.council_sessions[0].synthesis_md).toBeNull();
  });

  it('omits lineage when include_lineage: false', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    const exported = exportIdea(db, vault, 'idea-a', { include_lineage: false });
    expect(exported.lineage).toBeUndefined();
  });

  it('throws IdeaNotFoundError for missing idea', () => {
    expect(() => exportIdea(db, vault, 'idea-missing')).toThrow(/not found/);
  });
});

describe('exportPortfolio', () => {
  it('returns one ExportedIdea per id, in input order', async () => {
    await seedIdea('idea-a', 'A', 'a body', 'evaluated', 100);
    await seedIdea('idea-b', 'B', 'b body', 'committed', 200);

    const portfolio = exportPortfolio(db, vault, ['idea-b', 'idea-a'], {}, 9999);

    expect(portfolio.schema_version).toBe(1);
    expect(portfolio.exported_at).toBe(9999);
    expect(portfolio.ideas).toHaveLength(2);
    expect(portfolio.ideas[0].snapshot.idea.id).toBe('idea-b'); // input order preserved
    expect(portfolio.ideas[1].snapshot.idea.id).toBe('idea-a');
  });
});

describe('listAllIdeaIds', () => {
  it('returns all ideas ordered by created_at ascending', async () => {
    await seedIdea('idea-c', 'C', '', 'evaluated', 300);
    await seedIdea('idea-a', 'A', '', 'evaluated', 100);
    await seedIdea('idea-b', 'B', '', 'evaluated', 200);

    const ids = listAllIdeaIds(db);
    expect(ids).toEqual(['idea-a', 'idea-b', 'idea-c']);
  });
});

describe('renderPortfolioMarkdown', () => {
  it('redacts body by default; includes body when redact_bodies: false', async () => {
    await seedIdea('idea-a', 'Test idea', 'SECRET BODY CONTENT');
    await seedAssumption('idea-a', 'Test assumption', true);

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);

    const redacted = renderPortfolioMarkdown(portfolio); // default redact_bodies: true
    expect(redacted).not.toContain('SECRET BODY CONTENT');
    expect(redacted).toContain('Body redacted');

    const open = renderPortfolioMarkdown(portfolio, { redact_bodies: false });
    expect(open).toContain('SECRET BODY CONTENT');
    expect(open).not.toContain('Body redacted');
  });

  it('renders assumptions table with load-bearing star', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    await seedAssumption('idea-a', 'Load-bearing assumption', true);
    await seedAssumption('idea-a', 'Casual assumption', false);

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md = renderPortfolioMarkdown(portfolio, { redact_bodies: false });

    expect(md).toMatch(/\| `asm-[a-zA-Z0-9]+` \| `open` \| ⭐ \| Load-bearing assumption \|/);
    expect(md).toMatch(/\| `asm-[a-zA-Z0-9]+` \| `open` \|  \| Casual assumption \|/);
  });

  it('includes outcome verdicts with refute/validate sections', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    const a1 = await seedAssumption('idea-a', 'Throughput holds', true);
    const a2 = await seedAssumption('idea-a', 'Cost holds', true);
    await logOutcome(db, vault, {
      idea_id: 'idea-a',
      text: 'Real outcome happened.',
      refutes: [a1],
      validates: [a2],
    });

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md = renderPortfolioMarkdown(portfolio, { redact_bodies: false });

    expect(md).toContain('Real outcome happened.');
    expect(md).toContain('**Refutes:**');
    expect(md).toContain('**Validates:**');
    expect(md).toContain('Throughput holds');
    expect(md).toContain('Cost holds');
  });

  it('shows missing-synthesis notice for sessions without SYNTHESIS.md', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    await seedCouncilSession('idea-a', { synthesis_md: null });

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md = renderPortfolioMarkdown(portfolio);

    expect(md).toContain('Synthesis: _missing');
  });

  it('renders no-outcomes / no-council placeholders when bare', async () => {
    await seedIdea('idea-a', 'Test', 'body');

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md = renderPortfolioMarkdown(portfolio);

    expect(md).toContain('No outcomes logged');
    expect(md).toContain('No council sessions on record');
  });

  it('escapes pipe characters in assumption text for markdown tables', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    await seedAssumption('idea-a', 'Tradeoff: A | B | C', false);

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md = renderPortfolioMarkdown(portfolio);

    expect(md).toContain('Tradeoff: A \\| B \\| C');
  });

  it('truncates long synthesis prose at 800 chars with truncation marker', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    const longSynth = 'x'.repeat(2000);
    await seedCouncilSession('idea-a', { synthesis_md: longSynth });

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md = renderPortfolioMarkdown(portfolio);

    expect(md).toContain('…');
    expect(md).toContain('Truncated. Full synthesis at');
  });

  it('output is deterministic for the same portfolio', async () => {
    await seedIdea('idea-a', 'Test', 'body');
    await seedAssumption('idea-a', 'A1', true);

    const portfolio = exportPortfolio(db, vault, ['idea-a'], {}, 1000);
    const md1 = renderPortfolioMarkdown(portfolio);
    const md2 = renderPortfolioMarkdown(portfolio);
    expect(md1).toBe(md2);
  });
});
