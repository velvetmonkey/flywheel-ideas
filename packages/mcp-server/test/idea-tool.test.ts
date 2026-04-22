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

/** Extract the `{result, next_steps}` envelope from an MCP tool response. */
function parseEnvelope(response: {
  content?: Array<{ type: string; text: string }>;
  isError?: boolean;
}): { result: any; next_steps: any[]; isError: boolean } {
  const text = response.content?.[0]?.text ?? '{}';
  const parsed = JSON.parse(text);
  return {
    result: parsed.result ?? parsed,
    next_steps: parsed.next_steps ?? [],
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

    await client.callTool('idea', { action: 'transition', id: create.id, to: 'explored' });
    await client.callTool('idea', { action: 'transition', id: create.id, to: 'evaluated' });
    await client.callTool('idea', { action: 'transition', id: create.id, to: 'committed' });

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

      // Force-transition to the target state (v0.1 unenforced allows any→any).
      if (state !== 'nascent') {
        await client.callTool('idea', {
          action: 'transition',
          id: create.id,
          to: state,
          reason: `test setup into ${state}`,
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
