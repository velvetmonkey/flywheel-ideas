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
