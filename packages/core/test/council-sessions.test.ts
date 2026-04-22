import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  completeCouncilSession,
  createCouncilSession,
  getCouncilSession,
  insertAssumptionCitations,
  listSessionsByIdea,
  listViewsBySession,
  openInMemoryIdeasDb,
  persistCouncilView,
  PROMPT_VERSION,
  PERSONA_VERSION,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

function seedIdea(id: string = 'idea-a'): void {
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, `ideas/${id}.md`, 'test', 'nascent', 1, 1);
}

function seedAssumption(id: string, idea_id: string = 'idea-a'): void {
  db.prepare(
    `INSERT INTO ideas_assumptions (
       id, idea_id, vault_path, status, text, load_bearing, declared_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, idea_id, `assumptions/${id}.md`, 'open', 'asm text', 0, 1);
}

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('createCouncilSession', () => {
  it('writes row and returns id + started_at', () => {
    seedIdea();
    const { id, started_at } = createCouncilSession(db, {
      idea_id: 'idea-a',
      depth: 'light',
      mode: 'pre_mortem',
    });
    expect(id).toMatch(/^sess-/);
    expect(started_at).toBeGreaterThan(0);

    const row = getCouncilSession(db, id);
    expect(row).toMatchObject({
      id,
      idea_id: 'idea-a',
      depth: 'light',
      mode: 'pre_mortem',
      completed_at: null,
      synthesis_vault_path: null,
    });
  });

  it('rejects session for non-existent idea (FK)', () => {
    expect(() =>
      createCouncilSession(db, { idea_id: 'idea-missing', depth: 'light', mode: 'standard' }),
    ).toThrow();
  });
});

describe('completeCouncilSession', () => {
  it('sets completed_at + synthesis_vault_path', () => {
    seedIdea();
    const { id } = createCouncilSession(db, {
      idea_id: 'idea-a',
      depth: 'light',
      mode: 'standard',
    });
    completeCouncilSession(db, id, {
      synthesis_vault_path: 'councils/idea-a/session-01/SYNTHESIS.md',
    });
    const row = getCouncilSession(db, id);
    expect(row?.completed_at).not.toBeNull();
    expect(row?.synthesis_vault_path).toBe('councils/idea-a/session-01/SYNTHESIS.md');
  });

  it('accepts explicit completed_at for deterministic tests', () => {
    seedIdea();
    const { id } = createCouncilSession(db, { idea_id: 'idea-a', depth: 'light', mode: 'standard' });
    completeCouncilSession(db, id, { completed_at: 9_999_999_999 });
    expect(getCouncilSession(db, id)?.completed_at).toBe(9_999_999_999);
  });
});

describe('listSessionsByIdea', () => {
  it('orders by started_at DESC with id tiebreaker', () => {
    seedIdea();
    const a = createCouncilSession(db, { idea_id: 'idea-a', depth: 'light', mode: 'standard' });
    const b = createCouncilSession(db, { idea_id: 'idea-a', depth: 'light', mode: 'standard' });
    const rows = listSessionsByIdea(db, 'idea-a');
    expect(rows.map((r) => r.id)).toContain(a.id);
    expect(rows.map((r) => r.id)).toContain(b.id);
    // DESC ordering: most-recent first
    expect(rows[0].started_at).toBeGreaterThanOrEqual(rows[rows.length - 1].started_at);
  });

  it('limit honored', () => {
    seedIdea();
    for (let i = 0; i < 3; i++) {
      createCouncilSession(db, { idea_id: 'idea-a', depth: 'light', mode: 'standard' });
    }
    expect(listSessionsByIdea(db, 'idea-a', { limit: 2 })).toHaveLength(2);
  });

  it('returns [] for unknown idea', () => {
    expect(listSessionsByIdea(db, 'idea-none')).toEqual([]);
  });
});

describe('persistCouncilView', () => {
  let session_id: string;

  beforeEach(() => {
    seedIdea();
    session_id = createCouncilSession(db, {
      idea_id: 'idea-a',
      depth: 'light',
      mode: 'standard',
    }).id;
  });

  it('persists full successful view row', () => {
    const { id } = persistCouncilView(db, {
      session_id,
      model: 'claude',
      persona: 'risk-pessimist',
      prompt_version: PROMPT_VERSION,
      persona_version: PERSONA_VERSION,
      model_version: 'claude-haiku-4-5',
      input_hash: 'sha256:abc',
      initial_stance: null,
      stance: 'stance text',
      self_critique: null,
      confidence: 0.7,
      content_vault_path: 'councils/idea-a/session-01/claude-risk-pessimist.md',
      failure_reason: null,
      stderr_tail: null,
    });

    expect(id).toMatch(/^view-/);
    const rows = listViewsBySession(db, session_id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      persona: 'risk-pessimist',
      stance: 'stance text',
      confidence: 0.7,
      failure_reason: null,
      initial_stance: null,
      self_critique: null,
    });
  });

  it('persists failed view row (stance null, failure_reason set)', () => {
    persistCouncilView(db, {
      session_id,
      model: 'claude',
      persona: 'growth-optimist',
      prompt_version: PROMPT_VERSION,
      persona_version: PERSONA_VERSION,
      model_version: null,
      input_hash: 'sha256:xyz',
      initial_stance: null,
      stance: null,
      self_critique: null,
      confidence: null,
      content_vault_path: 'councils/idea-a/session-01/claude-growth-optimist.md',
      failure_reason: 'timeout',
      stderr_tail: 'killed by dispatcher',
    });
    const rows = listViewsBySession(db, session_id);
    expect(rows[0].failure_reason).toBe('timeout');
    expect(rows[0].stance).toBeNull();
    expect(rows[0].stderr_tail).toBe('killed by dispatcher');
  });
});

describe('insertAssumptionCitations', () => {
  let view_id: string;

  beforeEach(() => {
    seedIdea();
    seedAssumption('asm-1');
    seedAssumption('asm-2');
    const session_id = createCouncilSession(db, {
      idea_id: 'idea-a',
      depth: 'light',
      mode: 'standard',
    }).id;
    const view = persistCouncilView(db, {
      session_id,
      model: 'claude',
      persona: 'risk-pessimist',
      prompt_version: PROMPT_VERSION,
      persona_version: PERSONA_VERSION,
      model_version: null,
      input_hash: 'h',
      initial_stance: null,
      stance: 's',
      self_critique: null,
      confidence: 0.5,
      content_vault_path: 'x',
      failure_reason: null,
      stderr_tail: null,
    });
    view_id = view.id;
  });

  it('inserts rows for known assumption ids', () => {
    const result = insertAssumptionCitations(db, view_id, ['asm-1', 'asm-2']);
    expect(result).toEqual({ inserted: 2, skipped: 0 });
  });

  it('silently skips unknown assumption ids', () => {
    const result = insertAssumptionCitations(db, view_id, ['asm-1', 'asm-nope', 'asm-also-nope']);
    expect(result).toEqual({ inserted: 1, skipped: 2 });
  });

  it('is idempotent — calling twice inserts nothing the second time', () => {
    insertAssumptionCitations(db, view_id, ['asm-1']);
    const result = insertAssumptionCitations(db, view_id, ['asm-1']);
    expect(result.inserted).toBe(0);
  });

  it('empty input is a no-op', () => {
    expect(insertAssumptionCitations(db, view_id, [])).toEqual({ inserted: 0, skipped: 0 });
  });
});
