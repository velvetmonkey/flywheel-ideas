import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  openIdeasDb,
  runMigrations,
  deleteIdeasDbFiles,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { createConfiguredServer } from '../src/index.js';
import { connectMcpTestClient, type McpTestClient } from './helpers/mcpClient.js';

let vault: string;
let db: IdeasDatabase;
let client: McpTestClient;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-integ-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
  const server = createConfiguredServer(vault, db);
  client = await connectMcpTestClient(server);
});

afterEach(async () => {
  await client.close();
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

/** Extract the `{result, next_steps, error?}` envelope from an MCP tool response. */
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

describe('idea tool — discovery', () => {
  it('tools/list exposes the idea tool', async () => {
    const { tools } = await client.listTools();
    const idea = tools.find((t) => t.name === 'idea');
    expect(idea).toBeDefined();
    expect(idea?.description).toMatch(/idea lifecycle/i);
  });
});

describe('idea tool — create', () => {
  it('creates an idea with markdown + db row + next_steps', async () => {
    const response = await client.callTool('idea', {
      action: 'create',
      title: 'Launch a paid newsletter',
    });
    const { result, next_steps, isError } = parseEnvelope(response);
    expect(isError).toBe(false);

    expect(result.id).toMatch(/^idea-[A-Za-z0-9]{8}$/);
    expect(result.state).toBe('nascent');
    expect(result.title).toBe('Launch a paid newsletter');
    expect(result.vault_path).toMatch(/^ideas\/\d{4}\/\d{2}\/launch-a-paid-newsletter-\d+\.md$/);
    expect(result.write_path).toBe('direct-fs');

    // Markdown file exists with expected frontmatter
    const raw = await fsp.readFile(path.join(vault, result.vault_path), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.id).toBe(result.id);
    expect(parsed.data.state).toBe('nascent');
    expect(parsed.data.type).toBe('idea');
    expect(parsed.data.title).toBe('Launch a paid newsletter');

    // DB row exists
    const row = db.prepare('SELECT * FROM ideas_notes WHERE id = ?').get(result.id) as {
      id: string;
      state: string;
      title: string;
    };
    expect(row.state).toBe('nascent');

    // next_steps guide the user toward declaring assumptions
    expect(next_steps.length).toBeGreaterThan(0);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('assumption.declare');
  });

  it('accepts optional body', async () => {
    const response = await client.callTool('idea', {
      action: 'create',
      title: 'Event-driven architecture',
      body: '# My idea\n\nCustom body.\n',
    });
    const { result } = parseEnvelope(response);
    const raw = await fsp.readFile(path.join(vault, result.vault_path), 'utf8');
    expect(raw).toContain('Custom body.');
  });

  it('errors when title is missing', async () => {
    const response = await client.callTool('idea', { action: 'create' });
    const { isError } = parseEnvelope(response);
    expect(isError).toBe(true);
  });
});

describe('idea tool — read', () => {
  it('returns frontmatter + body for an existing idea', async () => {
    const create = await client.callTool('idea', {
      action: 'create',
      title: 'Test idea',
    });
    const { result: createResult } = parseEnvelope(create);

    const read = await client.callTool('idea', { action: 'read', id: createResult.id });
    const { result, next_steps, isError } = parseEnvelope(read);
    expect(isError).toBe(false);

    expect(result.id).toBe(createResult.id);
    expect(result.state).toBe('nascent');
    expect(result.frontmatter.id).toBe(createResult.id);
    expect(result.transition_count).toBe(0);

    // Should nudge toward assumption.declare for a nascent idea
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('assumption.declare');
  });

  it('returns error envelope for unknown idea', async () => {
    const response = await client.callTool('idea', { action: 'read', id: 'idea-missing1' });
    const { isError } = parseEnvelope(response);
    expect(isError).toBe(true);
  });

  it('returns stale_row hint when markdown is externally deleted', async () => {
    const create = await client.callTool('idea', { action: 'create', title: 'Stale test' });
    const { result: createResult } = parseEnvelope(create);
    await fsp.unlink(path.join(vault, createResult.vault_path));

    const read = await client.callTool('idea', { action: 'read', id: createResult.id });
    const { result } = parseEnvelope(read);
    expect(result.stale_row).toBe(true);
  });
});

describe('idea tool — list', () => {
  it('returns paginated results newest-first', async () => {
    const a = parseEnvelope(await client.callTool('idea', { action: 'create', title: 'Alpha' })).result;
    // Small delay to distinguish timestamps
    await new Promise((r) => setTimeout(r, 5));
    const b = parseEnvelope(await client.callTool('idea', { action: 'create', title: 'Beta' })).result;

    const list = await client.callTool('idea', { action: 'list' });
    const { result } = parseEnvelope(list);
    expect(result.count).toBe(2);
    expect(result.ideas[0].id).toBe(b.id);
    expect(result.ideas[1].id).toBe(a.id);
  });

  it('filters by state', async () => {
    await client.callTool('idea', { action: 'create', title: 'A' });
    const second = parseEnvelope(await client.callTool('idea', { action: 'create', title: 'B' })).result;
    await client.callTool('idea', { action: 'transition', id: second.id, to: 'explored' });

    const listExplored = await client.callTool('idea', { action: 'list', state: 'explored' });
    const { result } = parseEnvelope(listExplored);
    expect(result.count).toBe(1);
    expect(result.ideas[0].id).toBe(second.id);
  });

  it('nudges user to create an idea when list is empty', async () => {
    const list = await client.callTool('idea', { action: 'list' });
    const { next_steps } = parseEnvelope(list);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('idea.create');
  });

  it('filters stale ideas by default and reports hidden count', async () => {
    const a = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Kept' }),
    ).result;
    const b = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Stale' }),
    ).result;
    await fsp.unlink(path.join(vault, b.vault_path));

    const list = await client.callTool('idea', { action: 'list' });
    const { result, next_steps } = parseEnvelope(list);
    expect(result.count).toBe(1);
    expect(result.ideas[0].id).toBe(a.id);
    expect(result.stale_hidden).toBe(1);

    // Should include a pointer to show stale ideas
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('idea.list');
  });

  it('surfaces stale ideas when include_stale: true', async () => {
    const a = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Stale' }),
    ).result;
    await fsp.unlink(path.join(vault, a.vault_path));

    const list = await client.callTool('idea', {
      action: 'list',
      include_stale: true,
    });
    const { result } = parseEnvelope(list);
    expect(result.count).toBe(1);
    expect(result.ideas[0].stale).toBe(true);
  });

  it('filters by needs_review: true (alpha.5 fix A)', async () => {
    const flagged = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Flagged' }),
    ).result;
    const clean = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Clean' }),
    ).result;
    // Flip needs_review on `flagged` directly via DB — outcome.log path
    // requires assumption + council scaffolding which is out of scope here.
    db.prepare('UPDATE ideas_notes SET needs_review = 1 WHERE id = ?').run(flagged.id);

    const list = await client.callTool('idea', { action: 'list', needs_review: true });
    const { result } = parseEnvelope(list);
    expect(result.count).toBe(1);
    expect(result.ideas[0].id).toBe(flagged.id);
    expect(result.ideas[0].needs_review).toBe(true);
    // Sanity: the unflagged idea is excluded
    expect(result.ideas.find((i: { id: string }) => i.id === clean.id)).toBeUndefined();
  });

  it('filters by needs_review: false (alpha.5 fix A)', async () => {
    const flagged = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Flagged' }),
    ).result;
    const clean = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Clean' }),
    ).result;
    db.prepare('UPDATE ideas_notes SET needs_review = 1 WHERE id = ?').run(flagged.id);

    const list = await client.callTool('idea', { action: 'list', needs_review: false });
    const { result } = parseEnvelope(list);
    expect(result.count).toBe(1);
    expect(result.ideas[0].id).toBe(clean.id);
  });

  it('AND-combines needs_review with state filter (alpha.5 fix A)', async () => {
    const a = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'A' }),
    ).result;
    const b = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'B' }),
    ).result;
    const c = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'C' }),
    ).result;
    // a: nascent + flagged. b: committed + flagged. c: committed + clean.
    db.prepare('UPDATE ideas_notes SET needs_review = 1 WHERE id IN (?, ?)').run(a.id, b.id);
    await client.callTool('idea', { action: 'transition', id: b.id, to: 'committed' });
    await client.callTool('idea', { action: 'transition', id: c.id, to: 'committed' });

    const list = await client.callTool('idea', {
      action: 'list',
      state: 'committed',
      needs_review: true,
    });
    const { result } = parseEnvelope(list);
    expect(result.count).toBe(1);
    expect(result.ideas[0].id).toBe(b.id);
  });
});

describe('idea tool — forget', () => {
  it('removes the db row without deleting the markdown file', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Forget me' }),
    ).result;

    const forget = await client.callTool('idea', { action: 'forget', id: create.id });
    const { result, isError } = parseEnvelope(forget);
    expect(isError).toBe(false);
    expect(result.id).toBe(create.id);
    expect(result.forgotten_from_state).toBe('nascent');

    // DB row gone
    const row = db.prepare('SELECT id FROM ideas_notes WHERE id = ?').get(create.id);
    expect(row).toBeUndefined();

    // File still on disk — we never delete user data
    const exists = await fsp
      .access(path.join(vault, create.vault_path))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('errors helpfully when forgetting an unknown id', async () => {
    const r = await client.callTool('idea', { action: 'forget', id: 'idea-missing' });
    const { isError } = parseEnvelope(r);
    expect(isError).toBe(true);
  });

  it('stale_row next_steps point to forget, breaking the list-loop', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Orphan' }),
    ).result;
    await fsp.unlink(path.join(vault, create.vault_path));

    const read = await client.callTool('idea', { action: 'read', id: create.id });
    const { result, next_steps } = parseEnvelope(read);
    expect(result.stale_row).toBe(true);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('idea.forget');
  });
});

describe('idea tool — transition', () => {
  it('records the transition and updates both DB and frontmatter', async () => {
    const create = await client.callTool('idea', { action: 'create', title: 'T-test' });
    const { result: createResult } = parseEnvelope(create);

    const trans = await client.callTool('idea', {
      action: 'transition',
      id: createResult.id,
      to: 'explored',
      reason: 'initial exploration done',
    });
    const { result, isError } = parseEnvelope(trans);
    expect(isError).toBe(false);

    expect(result.from_state).toBe('nascent');
    expect(result.to_state).toBe('explored');
    expect(result.reason).toBe('initial exploration done');

    // DB row updated
    const dbRow = db.prepare('SELECT state FROM ideas_notes WHERE id = ?').get(createResult.id) as {
      state: string;
    };
    expect(dbRow.state).toBe('explored');

    // ideas_transitions row exists
    const tRow = db.prepare('SELECT * FROM ideas_transitions WHERE idea_id = ?').get(
      createResult.id,
    ) as { from_state: string; to_state: string };
    expect(tRow.from_state).toBe('nascent');
    expect(tRow.to_state).toBe('explored');

    // Frontmatter patched
    const raw = await fsp.readFile(path.join(vault, createResult.vault_path), 'utf8');
    const fm = matter(raw).data;
    expect(fm.state).toBe('explored');
    expect(fm.state_changed_at).toBeDefined();
  });

  it('rejects invalid target state', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'X' }),
    ).result;

    const trans = await client.callTool('idea', {
      action: 'transition',
      id: create.id,
      to: 'bogus' as any,
    });
    // Either zod validation fails or our runtime check rejects — both paths error.
    expect(trans.isError === true || parseEnvelope(trans).isError === true).toBe(true);
  });

  it('next_steps after transitioning to committed suggest outcome logging', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Ship test' }),
    ).result;

    const trans = await client.callTool('idea', {
      action: 'transition',
      id: create.id,
      to: 'committed',
      reason: 'going',
    });
    const { next_steps } = parseEnvelope(trans);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('assumption.declare');
  });

  it('rolls back DB transition when fs patch fails (atomicity)', async () => {
    // Create then externally delete the markdown so patchFrontmatter will
    // fail on the next transition attempt. We expect the DB to be rolled
    // back to the pre-transition state.
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Atomic test' }),
    ).result;

    // Delete the markdown file out-of-band.
    await fsp.unlink(path.join(vault, create.vault_path));

    // Try to transition — the patchFrontmatter call inside handleTransition
    // should fail because the file doesn't exist, and the handler should
    // roll back the DB transition.
    const trans = await client.callTool('idea', {
      action: 'transition',
      id: create.id,
      to: 'explored',
    });
    const { isError } = parseEnvelope(trans);
    expect(isError).toBe(true);

    // DB state must NOT have advanced — rollback must have restored 'nascent'.
    const row = db.prepare('SELECT state FROM ideas_notes WHERE id = ?').get(create.id) as {
      state: string;
    };
    expect(row.state).toBe('nascent');

    // No transition rows should exist for this idea (the attempted one was
    // rolled back).
    const transitions = db
      .prepare('SELECT COUNT(*) as c FROM ideas_transitions WHERE idea_id = ?')
      .all(create.id) as Array<{ c: number }>;
    expect(transitions[0].c).toBe(0);
  });

  it('records multiple transitions in history', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Multi' }),
    ).result;

    // v0.2 D5 — bypass_enforcement: true so this lifecycle-mechanics test
    // doesn't have to satisfy council/lock/outcome prereqs (those are tested
    // separately in the enforcement describe block below).
    await client.callTool('idea', {
      action: 'transition', id: create.id, to: 'explored', bypass_enforcement: true,
    });
    await client.callTool('idea', {
      action: 'transition', id: create.id, to: 'evaluated', bypass_enforcement: true,
    });
    await client.callTool('idea', {
      action: 'transition', id: create.id, to: 'committed', bypass_enforcement: true,
    });

    const read = await client.callTool('idea', { action: 'read', id: create.id });
    const { result } = parseEnvelope(read);
    expect(result.state).toBe('committed');
    expect(result.transition_count).toBe(3);
  });
});

describe('idea tool — next_steps coverage for all 8 states', () => {
  // The "every response teaches the next move" contract requires that
  // idea.read returns at least one next_step for every state — no dead ends.
  const terminalStates = ['validated', 'refuted', 'parked', 'killed'] as const;
  const activeStates = ['nascent', 'explored', 'evaluated', 'committed'] as const;

  for (const state of [...activeStates, ...terminalStates]) {
    it(`returns ≥ 1 next_step when reading an idea in state "${state}"`, async () => {
      const create = parseEnvelope(
        await client.callTool('idea', { action: 'create', title: `State ${state}` }),
      ).result;

      // Force-transition to the target state. v0.2 D5 added prereq
      // enforcement (council/lock/outcome) — bypass it here so this
      // next_steps-coverage test doesn't have to set up the full chain.
      if (state !== 'nascent') {
        await client.callTool('idea', {
          action: 'transition',
          id: create.id,
          to: state,
          reason: `test setup into ${state}`,
          bypass_enforcement: true,
        });
      }

      const read = await client.callTool('idea', { action: 'read', id: create.id });
      const { result, next_steps, isError } = parseEnvelope(read);
      expect(isError).toBe(false);
      expect(result.state).toBe(state);
      expect(next_steps.length).toBeGreaterThan(0);
      // Every next_step has all three required fields
      for (const step of next_steps) {
        expect(step.action).toBeTruthy();
        expect(step.example).toBeTruthy();
        expect(step.why).toBeTruthy();
      }
    });
  }

  it('terminal killed state points to idea.list + idea.forget', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Dead end' }),
    ).result;
    await client.callTool('idea', {
      action: 'transition',
      id: create.id,
      to: 'killed',
      reason: 'not worth pursuing',
    });

    const read = await client.callTool('idea', { action: 'read', id: create.id });
    const { next_steps } = parseEnvelope(read);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('idea.list');
    expect(actions).toContain('idea.forget');
  });

  it('validated state points to browsing committed siblings + create-next', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Shipped' }),
    ).result;
    await client.callTool('idea', {
      action: 'transition',
      id: create.id,
      to: 'validated',
      reason: 'outcome confirmed',
    });

    const read = await client.callTool('idea', { action: 'read', id: create.id });
    const { next_steps } = parseEnvelope(read);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('idea.list');
    expect(actions).toContain('idea.create');
  });
});

describe('idea tool — error envelope hardening', () => {
  it('validation errors carry recovery next_steps', async () => {
    const r = await client.callTool('idea', { action: 'create' }); // missing title
    const { isError } = parseEnvelope(r);
    expect(isError).toBe(true);

    const text = r.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);
    expect(parsed.next_steps).toBeDefined();
    expect(parsed.next_steps.length).toBeGreaterThan(0);
  });

  it('unhandled errors surface as mcpError envelopes (not raw JSON-RPC)', async () => {
    // Force an internal error: create an idea, then intentionally corrupt
    // its row so a subsequent read blows up on a SELECT that joins...
    // Actually simpler: pass a bad arg that sneaks past zod but fails in the
    // handler. We already test this in practice via the stale-transition
    // rollback test. Here just verify the outer try/catch is wired.
    const r = await client.callTool('idea', {
      action: 'transition',
      id: 'idea-nonexistent',
      to: 'explored',
    });
    const { isError } = parseEnvelope(r);
    expect(isError).toBe(true);
    const text = r.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);
    // Must be structured, not a raw error string
    expect(parsed.error).toBeTruthy();
    expect(parsed.next_steps).toBeDefined();
  });
});

// ===========================================================================
// idea.freeze + idea.list_freezes (v0.2 D2)
// ===========================================================================

async function seedIdea(): Promise<string> {
  const response = await client.callTool('idea', { action: 'create', title: 'Freeze test idea' });
  return parseEnvelope(response).result.id;
}

async function seedAssumption(idea_id: string, text: string, load_bearing = false): Promise<string> {
  const r = await client.callTool('assumption', {
    action: 'declare',
    idea_id,
    text,
    load_bearing,
  });
  return parseEnvelope(r).result.id;
}

describe('idea.freeze (v0.2 D2)', () => {
  it('snapshots idea + assumptions; returns metadata + next_steps', async () => {
    const ideaId = await seedIdea();
    await seedAssumption(ideaId, 'Load-bearing one', true);
    await seedAssumption(ideaId, 'Non-load-bearing one', false);

    const response = parseEnvelope(
      await client.callTool('idea', { action: 'freeze', id: ideaId }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.id).toMatch(/^fr-[A-Za-z0-9]{8}$/);
    expect(response.result.idea_id).toBe(ideaId);
    expect(response.result.council_session_id).toBeNull();
    expect(response.result.supersedes_freeze_id).toBeNull();
    expect(response.result.snapshot.assumption_count).toBe(2);
    expect(response.result.snapshot.load_bearing_count).toBe(1);

    // next_steps should propose binding to council.run + listing freezes + amendment
    const actions = response.next_steps.map((s: any) => s.action);
    expect(actions).toContain('council.run');
    expect(actions).toContain('idea.list_freezes');
    expect(actions).toContain('idea.freeze'); // amendment hint
    const councilStep = response.next_steps.find((s: any) => s.action === 'council.run');
    expect(councilStep.example).toContain(`freeze_id: "${response.result.id}"`);
  });

  it('rejects freeze without id', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'freeze' }),
    );
    expect(response.isError).toBe(true);
    const text = (await client.callTool('idea', { action: 'freeze' })).content?.[0]?.text ?? '{}';
    expect(JSON.parse(text).error).toContain('idea_id');
  });

  it('rejects freeze for unknown idea', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'freeze', id: 'idea-doesnotexist' }),
    );
    expect(response.isError).toBe(true);
    const text = (await client.callTool('idea', { action: 'freeze', id: 'idea-doesnotexist' }))
      .content?.[0]?.text ?? '{}';
    expect(JSON.parse(text).error).toContain('idea not found');
  });

  it('amendment chain: supersedes_freeze_id without rationale errors; with rationale succeeds', async () => {
    const ideaId = await seedIdea();
    await seedAssumption(ideaId, 'v1 assumption');
    const fr1 = parseEnvelope(
      await client.callTool('idea', { action: 'freeze', id: ideaId }),
    ).result;

    // Missing rationale → error
    const noRationale = parseEnvelope(
      await client.callTool('idea', {
        action: 'freeze',
        id: ideaId,
        supersedes_freeze_id: fr1.id,
      }),
    );
    expect(noRationale.isError).toBe(true);

    // Add a new assumption + amend
    await seedAssumption(ideaId, 'v2 added assumption', true);
    const fr2 = parseEnvelope(
      await client.callTool('idea', {
        action: 'freeze',
        id: ideaId,
        supersedes_freeze_id: fr1.id,
        amendment_rationale: 'Added load-bearing assumption discovered during dogfood',
      }),
    );
    expect(fr2.isError).toBe(false);
    expect(fr2.result.supersedes_freeze_id).toBe(fr1.id);
    expect(fr2.result.snapshot.assumption_count).toBe(2);
  });
});

describe('idea.list_freezes (v0.2 D2)', () => {
  it('returns empty list + create hint when no freezes', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'list_freezes', id: ideaId }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.count).toBe(0);
    expect(response.result.freezes).toEqual([]);
    const actions = response.next_steps.map((s: any) => s.action);
    expect(actions).toContain('idea.freeze');
  });

  it('returns freezes newest-first by default', async () => {
    const ideaId = await seedIdea();
    await seedAssumption(ideaId, 'Asm A');
    const fr1 = parseEnvelope(
      await client.callTool('idea', { action: 'freeze', id: ideaId }),
    ).result;
    // Brief delay so frozen_at differs (Date.now resolution).
    await new Promise((r) => setTimeout(r, 5));
    const fr2 = parseEnvelope(
      await client.callTool('idea', {
        action: 'freeze',
        id: ideaId,
        supersedes_freeze_id: fr1.id,
        amendment_rationale: 'r2',
      }),
    ).result;

    const desc = parseEnvelope(
      await client.callTool('idea', { action: 'list_freezes', id: ideaId }),
    );
    expect(desc.result.count).toBe(2);
    expect(desc.result.freezes[0].id).toBe(fr2.id);
    expect(desc.result.freezes[1].id).toBe(fr1.id);

    const asc = parseEnvelope(
      await client.callTool('idea', { action: 'list_freezes', id: ideaId, freeze_order: 'asc' }),
    );
    expect(asc.result.freezes[0].id).toBe(fr1.id);
    expect(asc.result.freezes[1].id).toBe(fr2.id);
  });

  it('rejects list_freezes without id', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'list_freezes' }),
    );
    expect(response.isError).toBe(true);
  });
});

// ===========================================================================
// idea.transition — D5 enforcement
// ===========================================================================

describe('idea.transition — lifecycle prereq enforcement (v0.2 D5)', () => {
  it('explored → evaluated WITHOUT council session is BLOCKED', async () => {
    const ideaId = await seedIdea();
    await client.callTool('idea', {
      action: 'transition', id: ideaId, to: 'explored', bypass_enforcement: true,
    });
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'evaluated' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('no_council_session');
    // Recovery hint surfaced in the first next_step's `why` field.
    const why = response.next_steps[0]?.why ?? '';
    expect(why).toContain('council.run');
    // Bypass option is the second next_step.
    expect(response.next_steps[1]?.example).toContain('bypass_enforcement: true');
  });

  it('explored → evaluated WITH council session succeeds', async () => {
    const ideaId = await seedIdea();
    await client.callTool('idea', {
      action: 'transition', id: ideaId, to: 'explored', bypass_enforcement: true,
    });
    // Seed a council session row directly (skip the real council dispatch).
    db.prepare(
      `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('sess-d5-1', ideaId, 'light', 'pre_mortem', 100);
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'evaluated' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.to_state).toBe('evaluated');
  });

  it('evaluated → committed WITHOUT locked load-bearing assumption is BLOCKED', async () => {
    const ideaId = await seedIdea();
    await client.callTool('idea', {
      action: 'transition', id: ideaId, to: 'evaluated', bypass_enforcement: true,
    });
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'committed' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('no_locked_load_bearing_assumption');
  });

  it('evaluated → committed WITH locked load-bearing assumption succeeds', async () => {
    const ideaId = await seedIdea();
    await client.callTool('idea', {
      action: 'transition', id: ideaId, to: 'evaluated', bypass_enforcement: true,
    });
    const asm = await seedAssumption(ideaId, 'Load-bearing claim', true);
    await client.callTool('assumption', { action: 'lock', id: asm });
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'committed' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.to_state).toBe('committed');
  });

  it('committed → validated WITHOUT outcome is BLOCKED', async () => {
    const ideaId = await seedIdea();
    await client.callTool('idea', {
      action: 'transition', id: ideaId, to: 'committed', bypass_enforcement: true,
    });
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'validated' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('no_outcome_logged');
  });

  it('committed → refuted WITHOUT a refuting outcome is BLOCKED', async () => {
    const ideaId = await seedIdea();
    await client.callTool('idea', {
      action: 'transition', id: ideaId, to: 'committed', bypass_enforcement: true,
    });
    // Logging a validating-only outcome is NOT enough.
    const asm = await seedAssumption(ideaId, 'a');
    await client.callTool('outcome', {
      action: 'log', idea_id: ideaId, text: 'validates only', validates: [asm],
    });
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'refuted' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('no_refuting_outcome');
  });

  it('bypass_enforcement: true skips all checks (matches old behaviour)', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('idea', {
        action: 'transition',
        id: ideaId,
        to: 'committed',
        bypass_enforcement: true,
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.to_state).toBe('committed');
  });

  it('non-checked transitions (to parked / killed) work without prereqs', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', id: ideaId, to: 'parked' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.to_state).toBe('parked');
  });
});

// ===========================================================================
// idea.ancestry / descendants / shared_assumptions (v0.2 D7)
// ===========================================================================

describe('idea.ancestry / descendants / shared_assumptions (v0.2 D7)', () => {
  it('ancestry walks supersedes chain backwards', async () => {
    const a = await seedIdea();
    const b = await seedIdea();
    const c = await seedIdea();
    // b supersedes a; c supersedes b. Use raw DB so we don't need an MCP
    // surface for setting extensions yet.
    db.prepare(
      `INSERT INTO ideas_idea_extensions (idea_id, supersedes, updated_at) VALUES (?, ?, ?)`,
    ).run(b, a, 1);
    db.prepare(
      `INSERT INTO ideas_idea_extensions (idea_id, supersedes, updated_at) VALUES (?, ?, ?)`,
    ).run(c, b, 2);

    const response = parseEnvelope(
      await client.callTool('idea', { action: 'ancestry', id: c }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.ancestors.map((n: any) => n.id)).toEqual([b, a]);
    expect(response.result.count).toBe(2);
  });

  it('descendants walks replaced_by chain forwards', async () => {
    const a = await seedIdea();
    const b = await seedIdea();
    db.prepare(
      `INSERT INTO ideas_idea_extensions (idea_id, replaced_by, updated_at) VALUES (?, ?, ?)`,
    ).run(a, b, 1);

    const response = parseEnvelope(
      await client.callTool('idea', { action: 'descendants', id: a }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.descendants.map((n: any) => n.id)).toEqual([b]);
  });

  it('shared_assumptions surfaces other ideas citing the same assumption', async () => {
    const a = await seedIdea();
    const b = await seedIdea();
    const asm = await seedAssumption(a, 'shared belief');
    // Manually wire a session + citation for both ideas.
    for (const idea of [a, b]) {
      const sess_id = `sess-${idea}`;
      db.prepare(
        `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at) VALUES (?, ?, ?, ?, ?)`,
      ).run(sess_id, idea, 'light', 'pre_mortem', 100);
      const view_id = `view-${idea}`;
      db.prepare(
        `INSERT INTO ideas_council_views
         (id, session_id, model, persona, prompt_version, persona_version, input_hash, content_vault_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(view_id, sess_id, 'claude', 'risk-pessimist', 'v1', 'v1', `h-${view_id}`, `c/${view_id}.md`);
      db.prepare(
        `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
      ).run(view_id, asm);
    }

    const response = parseEnvelope(
      await client.callTool('idea', { action: 'shared_assumptions', id: a }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.matches).toHaveLength(1);
    expect(response.result.matches[0].idea_id).toBe(b);
    expect(response.result.matches[0].shared_assumption_count).toBe(1);
  });

  it('rejects ancestry without id', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'ancestry' }),
    );
    expect(response.isError).toBe(true);
  });
});
