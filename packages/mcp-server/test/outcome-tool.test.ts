import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  declareAssumption,
  deleteIdeasDbFiles,
  generateCouncilSessionId,
  generateCouncilViewId,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { createConfiguredServer } from '../src/index.js';
import { connectMcpTestClient, type McpTestClient } from './helpers/mcpClient.js';

// Point MCP-level dispatches at mock CLIs just in case any test runs
// council.run end-to-end (zero real API calls).
const MOCK_CLI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'core',
  'test',
  'fixtures',
  'mock-cli',
  'mock-claude.mjs',
);
const MOCK_CODEX = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'core',
  'test',
  'fixtures',
  'mock-cli',
  'mock-codex.mjs',
);
const MOCK_GEMINI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'core',
  'test',
  'fixtures',
  'mock-cli',
  'mock-gemini.mjs',
);

let vault: string;
let db: IdeasDatabase;
let client: McpTestClient;
const savedApprove = process.env.FLYWHEEL_IDEAS_APPROVE;
const savedSpawnPrefixes = process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-outcome-tool-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
  delete process.env.FLYWHEEL_IDEAS_APPROVE;
  process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES = JSON.stringify({
    claude: ['node', MOCK_CLI],
    codex: ['node', MOCK_CODEX],
    gemini: ['node', MOCK_GEMINI],
  });
  const server = createConfiguredServer(vault, db);
  client = await connectMcpTestClient(server);
});

afterEach(async () => {
  await client.close();
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
  if (savedApprove === undefined) delete process.env.FLYWHEEL_IDEAS_APPROVE;
  else process.env.FLYWHEEL_IDEAS_APPROVE = savedApprove;
  if (savedSpawnPrefixes === undefined) delete process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES;
  else process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES = savedSpawnPrefixes;
});

function parseEnvelope(response: {
  content?: Array<{ type: string; text: string }>;
  isError?: boolean;
}): { result: any; next_steps: any[]; error?: string; isError: boolean } {
  const text = response.content?.[0]?.text ?? '{}';
  const parsed = JSON.parse(text);
  return {
    result: parsed.result ?? parsed,
    next_steps: parsed.next_steps ?? [],
    error: parsed.error,
    isError: response.isError === true,
  };
}

async function seedIdea(title: string = 'Test idea'): Promise<string> {
  const response = await client.callTool('idea', { action: 'create', title });
  return parseEnvelope(response).result.id;
}

async function seedAssumption(idea_id: string, text: string = 'an assumption'): Promise<string> {
  const { assumption } = await declareAssumption(db, vault, {
    idea_id,
    text,
    load_bearing: true,
  });
  return assumption.id;
}

function stubCitedCouncilSession(idea_id: string, assumption_ids: string[]): void {
  const session_id = generateCouncilSessionId();
  const view_id = generateCouncilViewId();
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path)
     VALUES (?, ?, 'light', 'standard', 1, 1, 's')`,
  ).run(session_id, idea_id);
  db.prepare(
    `INSERT INTO ideas_council_views (id, session_id, model, persona, prompt_version, persona_version, model_version, input_hash, initial_stance, stance, self_critique, confidence, content_vault_path, failure_reason, stderr_tail)
     VALUES (?, ?, 'claude', 'risk-pessimist', '1', '1', NULL, 'h', NULL, 's', NULL, 0.5, ?, NULL, NULL)`,
  ).run(view_id, session_id, 'v.md');
  for (const asm_id of assumption_ids) {
    db.prepare(
      `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
    ).run(view_id, asm_id);
  }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

describe('outcome tool — discovery', () => {
  it('tools/list exposes the outcome tool', async () => {
    const { tools } = await client.listTools();
    const outcome = tools.find((t) => t.name === 'outcome');
    expect(outcome).toBeDefined();
    expect(outcome?.description).toContain('compounding mechanism');
  });
});

// ---------------------------------------------------------------------------
// outcome.log — validation
// ---------------------------------------------------------------------------

describe('outcome.log — validation', () => {
  it('rejects missing idea_id', async () => {
    const response = parseEnvelope(
      await client.callTool('outcome', { action: 'log', text: 'x', refutes: ['asm-1'] }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('requires `idea_id`');
  });

  it('rejects empty text', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: '   ',
        refutes: ['asm-1'],
      }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('non-empty `text`');
  });

  it('rejects empty refutes+validates', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: 'x',
      }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('at least one');
  });

  it('rejects non-existent assumption id with idea.read hint', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: 'x',
        refutes: ['asm-missing'],
      }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('not found');
    expect(response.next_steps[0].action).toBe('idea.read');
  });
});

// ---------------------------------------------------------------------------
// outcome.log — propagation surfaces flagged_ideas
// ---------------------------------------------------------------------------

describe('outcome.log — propagation response', () => {
  it('returns flagged_ideas when refutation cascades', async () => {
    const ideaA = await seedIdea('A');
    const asmA = await seedAssumption(ideaA);
    const ideaB = await seedIdea('B');
    stubCitedCouncilSession(ideaB, [asmA]);

    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'Reality: asm wrong',
        refutes: [asmA],
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.flagged_count).toBe(1);
    expect(response.result.flagged_ideas[0].id).toBe(ideaB);
    expect(response.result.refuted).toEqual([asmA]);
    expect(response.result.validated).toEqual([]);

    // next_steps should point at the flagged idea
    const actions = response.next_steps.map((s: any) => s.action);
    expect(actions).toContain('idea.read');
    expect(actions).toContain('outcome.undo');
  });

  it('empty flagged_ideas still returns outcome.undo next-step', async () => {
    const ideaA = await seedIdea('A');
    const asmA = await seedAssumption(ideaA);
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'x',
        refutes: [asmA],
      }),
    );
    expect(response.result.flagged_count).toBe(0);
    const actions = response.next_steps.map((s: any) => s.action);
    expect(actions).toContain('outcome.undo');
  });
});

// ---------------------------------------------------------------------------
// outcome.undo
// ---------------------------------------------------------------------------

describe('outcome.undo via MCP', () => {
  it('reverses a prior log and clears needs_review on flagged ideas', async () => {
    const ideaA = await seedIdea('A');
    const asmA = await seedAssumption(ideaA);
    const ideaB = await seedIdea('B');
    stubCitedCouncilSession(ideaB, [asmA]);

    const log = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'x',
        refutes: [asmA],
      }),
    );
    expect(
      (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaB) as any)
        ?.needs_review,
    ).toBe(1);

    const undo = parseEnvelope(
      await client.callTool('outcome', { action: 'undo', id: log.result.id }),
    );
    expect(undo.isError).toBe(false);
    expect(undo.result.cleared_ideas).toEqual([ideaB]);
    expect(undo.result.status_changes).toEqual([
      { assumption_id: asmA, from: 'refuted', to: 'open' },
    ]);
  });

  it('already-undone returns mcpError with outcome.read next-step', async () => {
    const ideaA = await seedIdea();
    const asmA = await seedAssumption(ideaA);
    const log = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'x',
        refutes: [asmA],
      }),
    );
    await client.callTool('outcome', { action: 'undo', id: log.result.id });
    const second = parseEnvelope(
      await client.callTool('outcome', { action: 'undo', id: log.result.id }),
    );
    expect(second.isError).toBe(true);
    expect(second.error).toContain('already undone');
    expect(second.next_steps.some((s: any) => s.action === 'outcome.read')).toBe(true);
  });

  it('unknown id returns mcpError with list next-step', async () => {
    const response = parseEnvelope(
      await client.callTool('outcome', { action: 'undo', id: 'out-missing' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('outcome not found');
    expect(response.next_steps[0].action).toBe('outcome.list');
  });
});

// ---------------------------------------------------------------------------
// outcome.list + outcome.read
// ---------------------------------------------------------------------------

describe('outcome.list / outcome.read', () => {
  it('list returns outcomes newest-first for an idea', async () => {
    const ideaId = await seedIdea();
    const asm1 = await seedAssumption(ideaId, 'first');
    const asm2 = await seedAssumption(ideaId, 'second');
    const a = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: 'a',
        refutes: [asm1],
      }),
    );
    await new Promise((r) => setTimeout(r, 3));
    const b = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: 'b',
        validates: [asm2],
      }),
    );
    const list = parseEnvelope(
      await client.callTool('outcome', { action: 'list', idea_id: ideaId }),
    );
    expect(list.result.outcomes.map((o: any) => o.id)).toEqual([
      b.result.id,
      a.result.id,
    ]);
    expect(list.result.count).toBe(2);
    expect(list.result.stale_hidden).toBe(0);
  });

  it('list empty → next_steps points at outcome.log', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('outcome', { action: 'list', idea_id: ideaId }),
    );
    expect(response.result.outcomes).toEqual([]);
    expect(response.next_steps[0].action).toBe('outcome.log');
  });

  it('read returns refuted + validated arrays', async () => {
    const ideaId = await seedIdea();
    const asm1 = await seedAssumption(ideaId, 'first');
    const asm2 = await seedAssumption(ideaId, 'second');
    const log = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: 'x',
        refutes: [asm1],
        validates: [asm2],
      }),
    );
    const read = parseEnvelope(
      await client.callTool('outcome', { action: 'read', id: log.result.id }),
    );
    expect(read.result.refuted).toEqual([asm1]);
    expect(read.result.validated).toEqual([asm2]);
    expect(read.result.undone_at).toBeNull();
  });

  it('read on unknown id → mcpError', async () => {
    const response = parseEnvelope(
      await client.callTool('outcome', { action: 'read', id: 'out-missing' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('outcome not found');
  });
});

// ===========================================================================
// outcome.log — Anti-Portfolio memo (v0.2 D4)
// ===========================================================================

describe('outcome.log — Anti-Portfolio memo (v0.2 D4)', () => {
  const validMemo = {
    root_cause: 'Pricing anchored on a competitor that exited the market',
    what_we_thought: 'Customers would tolerate $X/seat',
    what_actually_happened: 'Churn spiked at $X-2; market reset lower',
    lesson: 'Anchor pricing on willingness-to-pay survey before comp scan',
  };

  it('refuting outcome WITHOUT memo: result.memo_recorded=false + nudge in next_steps', async () => {
    const ideaA = await seedIdea();
    const asmA = await seedAssumption(ideaA);
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'X happened',
        refutes: [asmA],
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.memo_recorded).toBe(false);
    // First next_step should be the memo nudge.
    expect(response.next_steps[0].action).toBe('outcome.memo_upsert');
    expect(response.next_steps[0].why).toContain('Anti-Portfolio');
    expect(response.next_steps[0].example).toContain('memo:');
  });

  it('refuting outcome WITH memo: result.memo_recorded=true + no memo nudge', async () => {
    const ideaA = await seedIdea();
    const asmA = await seedAssumption(ideaA);
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'X happened',
        refutes: [asmA],
        memo: validMemo,
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.memo_recorded).toBe(true);
    const memoNudge = response.next_steps.find(
      (s: any) => s.action === 'outcome.memo_upsert' && s.why?.includes('Anti-Portfolio'),
    );
    expect(memoNudge).toBeUndefined();
    // Memo persisted in DB.
    const row = db
      .prepare('SELECT memo_json FROM ideas_outcome_memos WHERE outcome_id = ?')
      .get(response.result.id) as { memo_json: string } | undefined;
    expect(row).toBeDefined();
    const parsed = JSON.parse(row!.memo_json);
    expect(parsed.lesson).toContain('Anchor pricing');
  });

  it('validating-only outcome (no refutes) does NOT nudge for memo', async () => {
    const ideaA = await seedIdea();
    const asmA = await seedAssumption(ideaA);
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'It worked',
        validates: [asmA],
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.memo_recorded).toBe(false);
    const memoNudge = response.next_steps.find((s: any) =>
      s.why?.includes('Anti-Portfolio'),
    );
    expect(memoNudge).toBeUndefined();
  });

  it('memo with missing required field is rejected at the schema boundary', async () => {
    const ideaA = await seedIdea();
    const asmA = await seedAssumption(ideaA);
    const r = await client.callTool('outcome', {
      action: 'log',
      idea_id: ideaA,
      text: 'X happened',
      refutes: [asmA],
      memo: { root_cause: 'x', what_we_thought: 'y', what_actually_happened: 'z' /* lesson missing */ },
    });
    // MCP SDK validates against the zod schema BEFORE our handler runs and
    // returns isError=true with a non-JSON "MCP error: ..." text. Either
    // shape (structured envelope or raw error text) counts as rejection.
    expect(r.isError).toBe(true);
    const text = r.content?.[0]?.text ?? '';
    expect(text).toMatch(/lesson|error|invalid|min(?:imum)?|required/i);
    // Verify no outcome was persisted.
    const count = db.prepare('SELECT COUNT(*) as c FROM ideas_outcomes').get() as { c: number };
    expect(count.c).toBe(0);
  });

  it('outcome.memo_upsert creates then replaces the canonical memo, and outcome.read exposes it', async () => {
    const ideaA = await seedIdea();
    const asmA = await seedAssumption(ideaA);
    const log = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaA,
        text: 'Reality broke the assumption',
        refutes: [asmA],
      }),
    );

    const createMemo = parseEnvelope(
      await client.callTool('outcome', {
        action: 'memo_upsert',
        outcome_id: log.result.id,
        memo: validMemo,
      }),
    );
    expect(createMemo.isError).toBe(false);
    expect(createMemo.result.operation).toBe('created');

    const replacement = {
      ...validMemo,
      lesson: 'Replaced lesson',
    };
    const replaceMemo = parseEnvelope(
      await client.callTool('outcome', {
        action: 'memo_upsert',
        outcome_id: log.result.id,
        memo: replacement,
      }),
    );
    expect(replaceMemo.isError).toBe(false);
    expect(replaceMemo.result.operation).toBe('replaced');
    expect(replaceMemo.result.memo.lesson).toBe('Replaced lesson');
    expect(replaceMemo.result.memo_written_at).toBeGreaterThanOrEqual(
      createMemo.result.memo_written_at,
    );

    const read = parseEnvelope(
      await client.callTool('outcome', { action: 'read', id: log.result.id }),
    );
    expect(read.result.memo.lesson).toBe('Replaced lesson');
    expect(typeof read.result.memo_written_at).toBe('number');
  });
});
