/**
 * Unit tests for assumption-radar.ts (v0.2 D9).
 *
 * Uses an inline stub EvidenceReader (no subprocess spawn) via the
 * reader_override option — the real subprocess path is tested in
 * evidence-reader.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  declareAssumption,
  deleteIdeasDbFiles,
  openIdeasDb,
  RadarInputError,
  radarAssumptions,
  runMigrations,
  type EvidenceReader,
  type IdeasDatabase,
} from '../src/index.js';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-radar-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
  // Seed a parent idea so assumptions FK is satisfied.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'evaluated', 1, 1);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

async function seedAsm(text: string, load_bearing = false): Promise<string> {
  const result = await declareAssumption(db, vault, {
    idea_id: 'idea-a',
    text,
    load_bearing,
  });
  return result.assumption.id;
}

function stubReader(handlers: Record<string, (args: unknown) => unknown>): EvidenceReader {
  return {
    async query(toolName, args) {
      const h = handlers[toolName];
      if (!h) return { content: [{ type: 'text', text: '{"results":[]}' }] };
      return h(args);
    },
  };
}

function textRes(payload: unknown): { content: Array<{ type: string; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

describe('radarAssumptions — input validation', () => {
  it('throws when both idea_id and all_load_bearing supplied', async () => {
    await expect(
      radarAssumptions(db, vault, { idea_id: 'idea-a', all_load_bearing: true }),
    ).rejects.toThrow(RadarInputError);
  });

  it('throws when neither idea_id nor all_load_bearing supplied', async () => {
    await expect(radarAssumptions(db, vault, {})).rejects.toThrow(RadarInputError);
  });
});

describe('radarAssumptions — happy path', () => {
  it('surfaces hits for a single idea via reader_override', async () => {
    const asm = await seedAsm('Customers will tolerate $X/seat', true);
    const reader = stubReader({
      search: () =>
        textRes({
          results: [
            {
              path: 'daily-notes/2026-04-15.md',
              section_content: 'Pricing conversation: customers actually pushed back at $X-2',
              confidence_score: 0.82,
            },
            {
              path: 'meeting-notes/2026-04-12.md',
              section_content: 'Discussed willingness to pay; mixed signals',
              confidence_score: 0.6,
            },
          ],
        }),
    });

    const result = await radarAssumptions(db, vault, {
      idea_id: 'idea-a',
      reader_override: reader,
    });
    expect(result.assumptions_scanned).toBe(1);
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0].assumption_id).toBe(asm);
    expect(result.hits[0].vault_path).toBe('daily-notes/2026-04-15.md');
    expect(result.hits[0].score).toBe(0.82);
  });

  it('all_load_bearing scope: ignores non-load-bearing assumptions', async () => {
    await seedAsm('Load-bearing one', true);
    await seedAsm('Not load-bearing', false);
    const reader = stubReader({
      search: () =>
        textRes({ results: [{ path: 'x.md', section_content: 'related', confidence_score: 0.5 }] }),
    });
    const result = await radarAssumptions(db, vault, {
      all_load_bearing: true,
      reader_override: reader,
    });
    // Only the load-bearing assumption was scanned.
    expect(result.assumptions_scanned).toBe(1);
  });

  it('excludes hits whose vault_path matches the assumption\'s own file', async () => {
    const asm = await seedAsm('Self-referencing assumption', true);
    // Look up the assumption's actual vault_path so we can collide it.
    const row = db
      .prepare('SELECT vault_path FROM ideas_assumptions WHERE id = ?')
      .get(asm) as { vault_path: string };
    const reader = stubReader({
      search: () =>
        textRes({
          results: [
            { path: row.vault_path, section_content: 'self', confidence_score: 0.9 },
            { path: 'other.md', section_content: 'other', confidence_score: 0.5 },
          ],
        }),
    });
    const result = await radarAssumptions(db, vault, {
      idea_id: 'idea-a',
      reader_override: reader,
    });
    expect(result.hits.map((h) => h.vault_path)).toEqual(['other.md']);
  });

  it('skips hits with empty excerpts', async () => {
    await seedAsm('something', true);
    const reader = stubReader({
      search: () =>
        textRes({
          results: [
            { path: 'a.md', section_content: '', confidence_score: 0.5 },
            { path: 'b.md', section_content: 'real excerpt', confidence_score: 0.5 },
          ],
        }),
    });
    const result = await radarAssumptions(db, vault, {
      idea_id: 'idea-a',
      reader_override: reader,
    });
    expect(result.hits.map((h) => h.vault_path)).toEqual(['b.md']);
  });

  it('per-assumption query failure does not abort the sweep', async () => {
    await seedAsm('asm one', true);
    await seedAsm('asm two', true);
    let calls = 0;
    const reader = stubReader({
      search: () => {
        calls += 1;
        if (calls === 1) {
          throw new Error('boom');
        }
        return textRes({ results: [{ path: 'x.md', section_content: 'hit', confidence_score: 0.5 }] });
      },
    });
    const result = await radarAssumptions(db, vault, {
      all_load_bearing: true,
      reader_override: reader,
    });
    expect(result.assumptions_scanned).toBe(2);
    expect(result.hits).toHaveLength(1);
  });
});

describe('radarAssumptions — failure modes', () => {
  it('throws EvidenceReaderUnavailableError when subprocess spawn fails (v0.4.0 — no silent degrade)', async () => {
    await seedAsm('asm', true);
    // Force a binary_not_found from the per-call spawn — flywheel-memory was
    // assumed reachable at boot, but a transient mid-session failure now
    // surfaces as a hard error instead of returning reader_available:false.
    await expect(
      radarAssumptions(db, vault, {
        idea_id: 'idea-a',
        evidence_reader_binary: '/nonexistent/flywheel-memory',
      }),
    ).rejects.toThrow(/EvidenceReaderUnavailableError|evidence-reader subprocess failed/);
  });

  it('returns empty when no in-scope assumptions', async () => {
    // No assumptions seeded.
    const result = await radarAssumptions(db, vault, { idea_id: 'idea-a' });
    expect(result.hits).toEqual([]);
    expect(result.assumptions_scanned).toBe(0);
  });

  it('respects max_assumptions cap', async () => {
    for (let i = 0; i < 25; i++) {
      await seedAsm(`load-bearing #${i}`, true);
    }
    const reader = stubReader({
      search: () => textRes({ results: [] }),
    });
    const result = await radarAssumptions(db, vault, {
      all_load_bearing: true,
      max_assumptions: 5,
      reader_override: reader,
    });
    expect(result.assumptions_scanned).toBeLessThanOrEqual(5);
  });
});
