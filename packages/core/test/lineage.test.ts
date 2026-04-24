/**
 * Unit tests for lineage.ts (v0.2 D7).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAncestry,
  getDescendants,
  getSharedAssumptions,
  openInMemoryIdeasDb,
  runMigrations,
  setIdeaExtension,
  type IdeasDatabase,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

function seedIdea(id: string, title: string = id): void {
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, `ideas/${id}.md`, title, 'evaluated', 1, 1);
}

function seedAssumption(id: string, idea_id: string): void {
  db.prepare(
    `INSERT INTO ideas_assumptions
       (id, idea_id, text, status, load_bearing, vault_path, declared_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, idea_id, `text-${id}`, 'open', 1, `assumptions/${id}.md`, 1);
}

function seedSessionAndCitation(idea_id: string, assumption_ids: string[]): void {
  const session_id = `sess-${idea_id}`;
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(session_id, idea_id, 'light', 'pre_mortem', 100);
  const view_id = `view-${idea_id}`;
  db.prepare(
    `INSERT INTO ideas_council_views
     (id, session_id, model, persona, prompt_version, persona_version, input_hash, content_vault_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(view_id, session_id, 'claude', 'risk-pessimist', 'v1', 'v1', `hash-${view_id}`, `councils/${session_id}/v.md`);
  for (const aid of assumption_ids) {
    db.prepare(
      `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
    ).run(view_id, aid);
  }
}

describe('getAncestry', () => {
  it('walks the supersedes chain backwards in depth order', () => {
    // Chain: a → b → c (c supersedes b; b supersedes a)
    seedIdea('a');
    seedIdea('b');
    seedIdea('c');
    setIdeaExtension(db, 'b', { supersedes: 'a' });
    setIdeaExtension(db, 'c', { supersedes: 'b' });

    const ancestry = getAncestry(db, 'c');
    expect(ancestry.map((n) => n.id)).toEqual(['b', 'a']);
    expect(ancestry[0].depth).toBe(1);
    expect(ancestry[1].depth).toBe(2);
  });

  it('returns empty array when no extension exists for the idea', () => {
    seedIdea('a');
    expect(getAncestry(db, 'a')).toEqual([]);
  });

  it('respects max_depth (caps cycles in malformed chains)', () => {
    seedIdea('a');
    seedIdea('b');
    setIdeaExtension(db, 'a', { supersedes: 'b' });
    setIdeaExtension(db, 'b', { supersedes: 'a' }); // cycle!
    const ancestry = getAncestry(db, 'a', { max_depth: 5 });
    expect(ancestry.length).toBeLessThanOrEqual(5);
  });

  it('returns empty when supersedes points at unknown idea', () => {
    seedIdea('a');
    setIdeaExtension(db, 'a', { supersedes: 'idea-deleted' });
    expect(getAncestry(db, 'a')).toEqual([]);
  });
});

describe('getDescendants', () => {
  it('walks the replaced_by chain forwards in depth order', () => {
    seedIdea('a');
    seedIdea('b');
    seedIdea('c');
    setIdeaExtension(db, 'a', { replaced_by: 'b' });
    setIdeaExtension(db, 'b', { replaced_by: 'c' });

    const descendants = getDescendants(db, 'a');
    expect(descendants.map((n) => n.id)).toEqual(['b', 'c']);
    expect(descendants[0].depth).toBe(1);
    expect(descendants[1].depth).toBe(2);
  });

  it('returns empty when no replaced_by chain', () => {
    seedIdea('a');
    setIdeaExtension(db, 'a', { reference_class: 'rebrands' });
    expect(getDescendants(db, 'a')).toEqual([]);
  });
});

describe('getSharedAssumptions', () => {
  it('finds other ideas citing the same assumption', () => {
    seedIdea('a');
    seedIdea('b');
    seedAssumption('asm-1', 'a');
    seedAssumption('asm-1-b', 'b');
    seedSessionAndCitation('a', ['asm-1']);
    seedSessionAndCitation('b', ['asm-1']); // both sessions cite the same assumption

    const matches = getSharedAssumptions(db, 'a');
    expect(matches).toHaveLength(1);
    expect(matches[0].idea_id).toBe('b');
    expect(matches[0].shared_assumption_count).toBe(1);
    expect(matches[0].shared_assumption_ids_sample).toEqual(['asm-1']);
  });

  it('orders by descending shared count', () => {
    seedIdea('a');
    seedIdea('b');
    seedIdea('c');
    seedAssumption('asm-1', 'a');
    seedAssumption('asm-2', 'a');
    seedSessionAndCitation('a', ['asm-1', 'asm-2']);
    seedSessionAndCitation('b', ['asm-1']); // shares 1 with a
    seedSessionAndCitation('c', ['asm-1', 'asm-2']); // shares 2 with a

    const matches = getSharedAssumptions(db, 'a');
    expect(matches.map((m) => m.idea_id)).toEqual(['c', 'b']);
    expect(matches[0].shared_assumption_count).toBe(2);
    expect(matches[1].shared_assumption_count).toBe(1);
  });

  it('excludes the input idea itself from matches', () => {
    seedIdea('a');
    seedAssumption('asm-1', 'a');
    seedSessionAndCitation('a', ['asm-1']);
    const matches = getSharedAssumptions(db, 'a');
    expect(matches).toEqual([]);
  });

  it('returns empty when input idea has no citations', () => {
    seedIdea('a');
    expect(getSharedAssumptions(db, 'a')).toEqual([]);
  });

  it('respects limit', () => {
    seedIdea('a');
    seedAssumption('asm-1', 'a');
    seedSessionAndCitation('a', ['asm-1']);
    for (const id of ['b', 'c', 'd', 'e']) {
      seedIdea(id);
      seedSessionAndCitation(id, ['asm-1']);
    }
    expect(getSharedAssumptions(db, 'a', { limit: 2 })).toHaveLength(2);
  });
});
