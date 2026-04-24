/**
 * Unit tests for freezes.ts (v0.2 Phase 1 D2 — OSF preregistration).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  bindFreezeToCouncilSession,
  createFreeze,
  declareAssumption,
  deleteIdeasDbFiles,
  FreezeInputError,
  FreezeNotFoundError,
  getFreeze,
  listFreezesByIdea,
  openIdeasDb,
  runMigrations,
  setAssumptionExtension,
  setIdeaExtension,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-freezes-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

async function seedIdea(id = 'idea-a', title = 'Test idea', body = 'A short body.'): Promise<void> {
  const relPath = `ideas/${id}.md`;
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, relPath, title, 'evaluated', 1, 1);
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(
    path.join(vault, relPath),
    `---\ntitle: ${title}\n---\n\n${body}\n`,
    'utf8',
  );
}

async function seedAssumption(idea_id: string, text: string, load_bearing = false): Promise<string> {
  const result = await declareAssumption(db, vault, {
    idea_id,
    text,
    load_bearing,
  });
  return result.assumption.id;
}

async function seedCouncilSession(idea_id: string, id = 'sess-1'): Promise<string> {
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, idea_id, 'light', 'pre_mortem', 100);
  return id;
}

describe('createFreeze — happy path', () => {
  it('snapshots idea + assumptions + body', async () => {
    await seedIdea('idea-a', 'Migrate to event-driven', 'Body about EDA.');
    await seedAssumption('idea-a', 'Ops team can absorb the complexity', true);
    await seedAssumption('idea-a', 'Latency stays under 100ms', false);

    const fr = createFreeze(db, vault, 'idea-a', {}, 5000);
    expect(fr.id).toMatch(/^fr-/);
    expect(fr.idea_id).toBe('idea-a');
    expect(fr.frozen_at).toBe(5000);
    expect(fr.snapshot.snapshot_version).toBe(1);
    expect(fr.snapshot.idea.title).toBe('Migrate to event-driven');
    expect(fr.snapshot.idea.body).toContain('Body about EDA');
    expect(fr.snapshot.idea.state).toBe('evaluated');
    expect(fr.snapshot.idea.extension).toBeNull();
    expect(fr.snapshot.assumptions).toHaveLength(2);
    expect(fr.snapshot.assumptions[0].load_bearing).toBe(true);
    expect(fr.snapshot.assumptions[1].load_bearing).toBe(false);
    expect(fr.snapshot.assumptions[0].extension).toBeNull();
    expect(fr.snapshot.frozen_at_iso).toMatch(/^1970-01-01T/); // 5000ms epoch
  });

  it('captures idea + assumption extensions when present', async () => {
    await seedIdea('idea-a');
    const asm_id = await seedAssumption('idea-a', 'Asm 1', true);

    setIdeaExtension(db, 'idea-a', { reversible: 'hard', reference_class: 'rebrands 2018-2024' });
    setAssumptionExtension(db, asm_id, {
      base_rate: 0.65,
      go_threshold: 0.8,
      mapping: { segment: 'enterprise', metric: 'churn_rate' },
    });

    const fr = createFreeze(db, vault, 'idea-a');
    expect(fr.snapshot.idea.extension?.reversible).toBe('hard');
    expect(fr.snapshot.idea.extension?.reference_class).toBe('rebrands 2018-2024');
    expect(fr.snapshot.assumptions[0].extension?.base_rate).toBe(0.65);
    expect(fr.snapshot.assumptions[0].extension?.mapping?.segment).toBe('enterprise');
  });

  it('excludes refuted assumptions from the snapshot', async () => {
    await seedIdea('idea-a');
    const asm_open = await seedAssumption('idea-a', 'Open one');
    const asm_refuted = await seedAssumption('idea-a', 'Will be refuted');
    db.prepare("UPDATE ideas_assumptions SET status = 'refuted' WHERE id = ?").run(asm_refuted);

    const fr = createFreeze(db, vault, 'idea-a');
    expect(fr.snapshot.assumptions).toHaveLength(1);
    expect(fr.snapshot.assumptions[0].id).toBe(asm_open);
  });

  it('handles missing-body gracefully — empty body, no throw', async () => {
    db.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-noted', 'ideas/missing.md', 'No file', 'nascent', 1, 1);
    // No file written for ideas/missing.md.

    const fr = createFreeze(db, vault, 'idea-noted');
    expect(fr.snapshot.idea.body).toBe('');
  });
});

describe('createFreeze — validation', () => {
  it('throws when idea does not exist', () => {
    expect(() => createFreeze(db, vault, 'idea-nonexistent')).toThrow(/idea not found/);
  });

  it('throws when supersedes_freeze_id without amendment_rationale', async () => {
    await seedIdea('idea-a');
    const fr1 = createFreeze(db, vault, 'idea-a');
    expect(() =>
      createFreeze(db, vault, 'idea-a', { supersedes_freeze_id: fr1.id }),
    ).toThrow(FreezeInputError);
  });

  it('throws when supersedes_freeze_id is unknown', async () => {
    await seedIdea('idea-a');
    expect(() =>
      createFreeze(db, vault, 'idea-a', {
        supersedes_freeze_id: 'fr-doesnotexist',
        amendment_rationale: 'amending',
      }),
    ).toThrow(/unknown freeze/);
  });

  it('throws when supersedes_freeze_id belongs to a different idea', async () => {
    await seedIdea('idea-a');
    await seedIdea('idea-b');
    const fr_a = createFreeze(db, vault, 'idea-a');
    expect(() =>
      createFreeze(db, vault, 'idea-b', {
        supersedes_freeze_id: fr_a.id,
        amendment_rationale: 'amending',
      }),
    ).toThrow(/belongs to idea idea-a/);
  });

  it('amendment chain: valid amendment succeeds; both versions readable', async () => {
    await seedIdea('idea-a');
    await seedAssumption('idea-a', 'v1 assumption');

    const fr1 = createFreeze(db, vault, 'idea-a', {}, 1000);
    expect(fr1.snapshot.assumptions).toHaveLength(1);

    // Add a new assumption between freezes.
    await seedAssumption('idea-a', 'v2 added assumption', true);

    const fr2 = createFreeze(
      db,
      vault,
      'idea-a',
      {
        supersedes_freeze_id: fr1.id,
        amendment_rationale: 'Added load-bearing assumption discovered during dogfood',
      },
      2000,
    );
    expect(fr2.supersedes_freeze_id).toBe(fr1.id);
    expect(fr2.amendment_rationale).toContain('Added load-bearing');
    expect(fr2.snapshot.assumptions).toHaveLength(2);

    // Prior freeze still immutable + readable.
    const re_read = getFreeze(db, fr1.id);
    expect(re_read?.snapshot.assumptions).toHaveLength(1);
  });
});

describe('getFreeze + listFreezesByIdea', () => {
  it('getFreeze returns null for unknown id', () => {
    expect(getFreeze(db, 'fr-doesnotexist')).toBeNull();
  });

  it('getFreeze handles malformed snapshot_json defensively', async () => {
    await seedIdea('idea-a');
    const fr = createFreeze(db, vault, 'idea-a');
    // Corrupt the row directly.
    db.prepare('UPDATE ideas_freezes SET snapshot_json = ? WHERE id = ?').run('not valid json {', fr.id);
    const re_read = getFreeze(db, fr.id);
    expect(re_read).not.toBeNull();
    expect(re_read?.snapshot.assumptions).toEqual([]);
    expect(re_read?.snapshot.idea.title).toBe(''); // bare-minimum shape
  });

  it('listFreezesByIdea returns newest-first by default; respects limit + asc', async () => {
    await seedIdea('idea-a');
    const fr1 = createFreeze(db, vault, 'idea-a', {}, 1000);
    const fr2 = createFreeze(db, vault, 'idea-a', {
      supersedes_freeze_id: fr1.id,
      amendment_rationale: 'r2',
    }, 2000);
    const fr3 = createFreeze(db, vault, 'idea-a', {
      supersedes_freeze_id: fr2.id,
      amendment_rationale: 'r3',
    }, 3000);

    const desc = listFreezesByIdea(db, 'idea-a');
    expect(desc.map((f) => f.id)).toEqual([fr3.id, fr2.id, fr1.id]);

    const asc = listFreezesByIdea(db, 'idea-a', { order: 'asc' });
    expect(asc.map((f) => f.id)).toEqual([fr1.id, fr2.id, fr3.id]);

    const limited = listFreezesByIdea(db, 'idea-a', { limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it('cascades delete from ideas_notes', async () => {
    await seedIdea('idea-a');
    const fr = createFreeze(db, vault, 'idea-a');
    db.prepare('DELETE FROM ideas_notes WHERE id = ?').run('idea-a');
    expect(getFreeze(db, fr.id)).toBeNull();
  });
});

describe('bindFreezeToCouncilSession', () => {
  it('binds an unbound freeze', async () => {
    await seedIdea('idea-a');
    const sess = await seedCouncilSession('idea-a');
    const fr = createFreeze(db, vault, 'idea-a');
    expect(fr.council_session_id).toBeNull();

    const bound = bindFreezeToCouncilSession(db, fr.id, sess);
    expect(bound.council_session_id).toBe(sess);
  });

  it('idempotent — re-binding the same session is a no-op', async () => {
    await seedIdea('idea-a');
    const sess = await seedCouncilSession('idea-a');
    const fr = createFreeze(db, vault, 'idea-a');
    bindFreezeToCouncilSession(db, fr.id, sess);
    const second = bindFreezeToCouncilSession(db, fr.id, sess);
    expect(second.council_session_id).toBe(sess);
  });

  it('throws when re-binding to a different session', async () => {
    await seedIdea('idea-a');
    const sess1 = await seedCouncilSession('idea-a', 'sess-1');
    const sess2 = await seedCouncilSession('idea-a', 'sess-2');
    const fr = createFreeze(db, vault, 'idea-a');
    bindFreezeToCouncilSession(db, fr.id, sess1);
    expect(() => bindFreezeToCouncilSession(db, fr.id, sess2)).toThrow(FreezeInputError);
  });

  it('throws on unknown freeze', () => {
    expect(() => bindFreezeToCouncilSession(db, 'fr-unknown', 'sess-1')).toThrow(FreezeNotFoundError);
  });

  it('FK ON DELETE SET NULL — deleting council session clears the binding', async () => {
    await seedIdea('idea-a');
    const sess = await seedCouncilSession('idea-a');
    const fr = createFreeze(db, vault, 'idea-a');
    bindFreezeToCouncilSession(db, fr.id, sess);
    db.prepare('DELETE FROM ideas_council_sessions WHERE id = ?').run(sess);
    const re_read = getFreeze(db, fr.id);
    expect(re_read).not.toBeNull();
    expect(re_read?.council_session_id).toBeNull();
  });
});
