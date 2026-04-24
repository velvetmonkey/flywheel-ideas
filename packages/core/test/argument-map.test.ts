/**
 * Unit tests for argument-map.ts (v0.2 D8).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractArgumentTree,
  getArgumentMap,
  openInMemoryIdeasDb,
  recordArgumentMap,
  renderArgumentMapMarkdown,
  runMigrations,
  type CouncilStance,
  type IdeasDatabase,
} from '../src/index.js';
import type { CouncilViewRow } from '../src/council-sessions.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
  // Seed FK chain: idea + session.
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('idea-a', 'ideas/a.md', 'A', 'evaluated', 1, 1);
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run('sess-1', 'idea-a', 'light', 'pre_mortem', 100);
});

afterEach(() => {
  db.close();
});

function viewRow(id: string, persona: string, model: string, failure_reason: string | null = null): CouncilViewRow {
  return {
    id,
    session_id: 'sess-1',
    model,
    persona,
    prompt_version: 'v1',
    persona_version: 'v1',
    model_version: null,
    input_hash: `h-${id}`,
    initial_stance: null,
    stance: null,
    self_critique: null,
    confidence: null,
    content_vault_path: `councils/sess-1/${id}.md`,
    failure_reason,
    stderr_tail: null,
  };
}

function stance(text: string, opts: Partial<CouncilStance> = {}): CouncilStance {
  return {
    stance: text,
    confidence: 0.7,
    key_risks: [],
    fragile_insights: [],
    assumptions_cited: [],
    evidence: [],
    metacognitive_reflection: {
      could_be_wrong_if: '',
      most_vulnerable_assumption: '',
      confidence_rationale: '',
    },
    ...opts,
  };
}

describe('extractArgumentTree — happy path', () => {
  it('one cell → one claim with cons from key_risks + fragile_insights', () => {
    const v1 = viewRow('view-1', 'risk-pessimist', 'claude');
    const stances = new Map<string, CouncilStance>([
      [
        'view-1',
        stance('Pricing is the dominant lever for retention.', {
          key_risks: ['Customers churn at $X-2', 'Comp scan is stale'],
          fragile_insights: ['Conversion depends on free-tier limit'],
          confidence: 0.65,
        }),
      ],
    ]);
    const tree = extractArgumentTree({ session_id: 'sess-1', views: [v1], stances }, 1234);
    expect(tree.claims).toHaveLength(1);
    expect(tree.claims[0].id).toBe('claim-001');
    expect(tree.claims[0].origin_persona).toBe('risk-pessimist');
    expect(tree.claims[0].confidence).toBe(0.65);
    expect(tree.claims[0].cons.map((c) => c.text)).toEqual([
      'Customers churn at $X-2',
      'Comp scan is stale',
      'Fragile: Conversion depends on free-tier limit',
    ]);
    expect(tree.skipped_failed_view_ids).toEqual([]);
  });

  it('evidence entries become pros with attached evidence node', () => {
    const v1 = viewRow('view-1', 'risk-pessimist', 'claude');
    const stances = new Map<string, CouncilStance>([
      [
        'view-1',
        stance('Stance text.', {
          evidence: [
            { claim: 'Cohort 2024-Q3 churn = 8%', source: 'analytics://q3-cohort' },
            { claim: 'NPS up 12pts', source: 'survey://nps-2024-Q4' },
          ],
        }),
      ],
    ]);
    const tree = extractArgumentTree({ session_id: 'sess-1', views: [v1], stances });
    expect(tree.claims[0].pros).toHaveLength(2);
    expect(tree.claims[0].pros[0].text).toBe('Cohort 2024-Q3 churn = 8%');
    expect(tree.claims[0].pros[0].evidence?.[0].source).toBe('analytics://q3-cohort');
  });

  it('cross-cell agreement (Jaccard > threshold) adds an extra pro per agreeing cell', () => {
    const v1 = viewRow('view-1', 'risk-pessimist', 'claude');
    const v2 = viewRow('view-2', 'growth-optimist', 'claude');
    const sharedStance = 'pricing is the dominant lever for retention and growth';
    const stances = new Map<string, CouncilStance>([
      ['view-1', stance(sharedStance)],
      ['view-2', stance(sharedStance + ' particularly in the SMB segment')],
    ]);
    const tree = extractArgumentTree({
      session_id: 'sess-1',
      views: [v1, v2],
      stances,
      agreement_threshold: 0.5,
    });
    // Both cells get a claim each, and each claim should reference the OTHER as a pro.
    expect(tree.claims).toHaveLength(2);
    const claim1Pros = tree.claims[0].pros.map((p) => p.text);
    expect(claim1Pros.some((t) => /Agreement from growth-optimist/.test(t))).toBe(true);
    const claim2Pros = tree.claims[1].pros.map((p) => p.text);
    expect(claim2Pros.some((t) => /Agreement from risk-pessimist/.test(t))).toBe(true);
  });

  it('high agreement_threshold suppresses cross-cell pros for weak overlap', () => {
    const v1 = viewRow('view-1', 'risk-pessimist', 'claude');
    const v2 = viewRow('view-2', 'growth-optimist', 'claude');
    const stances = new Map<string, CouncilStance>([
      ['view-1', stance('pricing is the lever')],
      ['view-2', stance('completely different topic about hiring delays')],
    ]);
    const tree = extractArgumentTree({
      session_id: 'sess-1',
      views: [v1, v2],
      stances,
      agreement_threshold: 0.5,
    });
    for (const c of tree.claims) {
      expect(c.pros.every((p) => !/Agreement from/.test(p.text))).toBe(true);
    }
  });

  it('skips failed cells; surfaces them in skipped_failed_view_ids', () => {
    const v_ok = viewRow('view-ok', 'risk-pessimist', 'claude');
    const v_fail = viewRow('view-fail', 'growth-optimist', 'codex', 'parse');
    const stances = new Map<string, CouncilStance>([
      ['view-ok', stance('working stance')],
    ]);
    const tree = extractArgumentTree({ session_id: 'sess-1', views: [v_ok, v_fail], stances });
    expect(tree.claims).toHaveLength(1);
    expect(tree.skipped_failed_view_ids).toEqual(['view-fail']);
  });

  it('cells with no parsed stance are skipped entirely', () => {
    const v1 = viewRow('view-1', 'risk-pessimist', 'claude');
    const stances = new Map<string, CouncilStance>(); // no parse
    const tree = extractArgumentTree({ session_id: 'sess-1', views: [v1], stances });
    expect(tree.claims).toEqual([]);
  });
});

describe('renderArgumentMapMarkdown', () => {
  it('renders structured markdown with sections per claim', () => {
    const v1 = viewRow('view-1', 'risk-pessimist', 'claude');
    const stances = new Map<string, CouncilStance>([
      [
        'view-1',
        stance('Pricing is the lever.', {
          key_risks: ['churn risk'],
          evidence: [{ claim: 'q3 data', source: 'analytics' }],
          confidence: 0.5,
        }),
      ],
    ]);
    const tree = extractArgumentTree({ session_id: 'sess-1', views: [v1], stances }, 1234);
    const md = renderArgumentMapMarkdown(tree, 'My idea');
    expect(md).toContain('# Argument map — session sess-1');
    expect(md).toContain('**Idea:** My idea');
    expect(md).toContain('**Claims:** 1');
    expect(md).toContain('## claim-001 — risk-pessimist');
    expect(md).toContain('### Claim');
    expect(md).toContain('Pricing is the lever.');
    expect(md).toContain('### Pros');
    expect(md).toContain('- q3 data');
    expect(md).toContain('  - evidence: q3 data (analytics)');
    expect(md).toContain('### Cons');
    expect(md).toContain('- churn risk');
  });

  it('emits empty-tree message when no claims', () => {
    const tree = extractArgumentTree({ session_id: 'sess-1', views: [], stances: new Map() });
    const md = renderArgumentMapMarkdown(tree, 'X');
    expect(md).toContain('argument map is empty');
  });

  it('surfaces skipped cell count when present', () => {
    const v_fail = viewRow('view-fail', 'p', 'claude', 'parse');
    const tree = extractArgumentTree({
      session_id: 'sess-1',
      views: [v_fail],
      stances: new Map(),
    });
    const md = renderArgumentMapMarkdown(tree, 'X');
    expect(md).toContain('**Skipped (failed cells):** 1');
  });
});

describe('recordArgumentMap + getArgumentMap (sidecar CRUD)', () => {
  it('records and reads back the tree', () => {
    const tree = extractArgumentTree({
      session_id: 'sess-1',
      views: [viewRow('view-1', 'risk-pessimist', 'claude')],
      stances: new Map([
        ['view-1', stance('the stance', { key_risks: ['r1'] })],
      ]),
    }, 1234);
    recordArgumentMap(db, tree, 1234);
    const row = getArgumentMap(db, 'sess-1');
    expect(row).not.toBeNull();
    expect(row?.session_id).toBe('sess-1');
    expect(row?.tree.claims).toHaveLength(1);
    expect(row?.tree.claims[0].cons[0].text).toBe('r1');
    expect(row?.generated_at).toBe(1234);
  });

  it('returns null for unknown session_id', () => {
    expect(getArgumentMap(db, 'sess-missing')).toBeNull();
  });

  it('INSERT OR REPLACE — overwrites existing row', () => {
    const tree1 = extractArgumentTree({
      session_id: 'sess-1',
      views: [viewRow('v1', 'p', 'c')],
      stances: new Map([['v1', stance('v1 text')]]),
    });
    const tree2 = extractArgumentTree({
      session_id: 'sess-1',
      views: [viewRow('v2', 'q', 'd')],
      stances: new Map([['v2', stance('v2 text')]]),
    });
    recordArgumentMap(db, tree1, 100);
    recordArgumentMap(db, tree2, 200);
    const row = getArgumentMap(db, 'sess-1');
    expect(row?.tree.claims[0].text).toBe('v2 text');
    expect(row?.generated_at).toBe(200);
  });

  it('FK violation on unknown session_id', () => {
    const tree = extractArgumentTree({
      session_id: 'sess-nonexistent',
      views: [],
      stances: new Map(),
    });
    expect(() => recordArgumentMap(db, tree)).toThrow(/FOREIGN KEY/i);
  });

  it('cascades delete from ideas_council_sessions', () => {
    const tree = extractArgumentTree({
      session_id: 'sess-1',
      views: [viewRow('v1', 'p', 'c')],
      stances: new Map([['v1', stance('x')]]),
    });
    recordArgumentMap(db, tree);
    db.prepare('DELETE FROM ideas_council_sessions WHERE id = ?').run('sess-1');
    expect(getArgumentMap(db, 'sess-1')).toBeNull();
  });

  it('handles malformed tree_json defensively (returns minimal shape)', () => {
    db.prepare(
      `INSERT INTO ideas_argument_maps (session_id, tree_json, generated_at) VALUES (?, ?, ?)`,
    ).run('sess-1', 'not valid json {', 1);
    const row = getArgumentMap(db, 'sess-1');
    expect(row?.tree.claims).toEqual([]);
  });
});
