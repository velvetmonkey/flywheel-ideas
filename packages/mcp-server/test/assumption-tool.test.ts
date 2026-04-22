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
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-asm-integ-'));
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

async function seedIdea(title: string = 'Parent idea'): Promise<string> {
  const create = parseEnvelope(
    await client.callTool('idea', { action: 'create', title }),
  );
  return create.result.id;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

describe('assumption tool — discovery', () => {
  it('tools/list exposes the assumption tool', async () => {
    const { tools } = await client.listTools();
    const asm = tools.find((t) => t.name === 'assumption');
    expect(asm).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// declare
// ---------------------------------------------------------------------------

describe('assumption tool — declare', () => {
  it('creates a Y-statement assumption', async () => {
    const ideaId = await seedIdea();
    const response = await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      context: 'SMB operators',
      challenge: 'low retention',
      decision: 'pricing is the blocker',
      tradeoff: 'may be onboarding instead',
      load_bearing: true,
    });
    const { result, next_steps, isError } = parseEnvelope(response);
    expect(isError).toBe(false);
    expect(result.id).toMatch(/^asm-/);
    expect(result.idea_id).toBe(ideaId);
    expect(result.load_bearing).toBe(true);
    expect(result.status).toBe('open');
    expect(result.vault_path).toMatch(/^assumptions\/pricing-is-the-blocker-\d+\.md$/);

    const raw = await fsp.readFile(path.join(vault, result.vault_path), 'utf8');
    const fm = matter(raw);
    expect(fm.data.type).toBe('assumption');
    expect(fm.data.idea_id).toBe(ideaId);
    expect(fm.content).toContain('In the context of');

    // next_steps should guide toward lock and council
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('assumption.list');
    expect(actions).toContain('council.run');
  });

  it('accepts free text', async () => {
    const ideaId = await seedIdea();
    const response = await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'pricing is the blocker',
    });
    const { result, isError } = parseEnvelope(response);
    expect(isError).toBe(false);
    expect(result.text).toBe('pricing is the blocker');
  });

  it('errors when parent idea does not exist', async () => {
    const response = await client.callTool('assumption', {
      action: 'declare',
      idea_id: 'idea-missing',
      text: 'x',
    });
    const { isError } = parseEnvelope(response);
    expect(isError).toBe(true);
  });

  it('errors when neither text nor structured fields are provided', async () => {
    const ideaId = await seedIdea();
    const response = await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
    });
    const { isError, next_steps } = parseEnvelope(response);
    expect(isError).toBe(true);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('assumption.declare');
  });

  it('errors helpfully when idea_id is missing', async () => {
    const response = await client.callTool('assumption', {
      action: 'declare',
      text: 'x',
    });
    const { isError, next_steps } = parseEnvelope(response);
    expect(isError).toBe(true);
    const actions = next_steps.map((s) => s.action);
    expect(actions).toContain('idea.list');
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('assumption tool — list', () => {
  it('returns assumptions for an idea in declared order', async () => {
    const ideaId = await seedIdea();
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'first',
    });
    await new Promise((r) => setTimeout(r, 5));
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'second',
    });

    const response = await client.callTool('assumption', {
      action: 'list',
      idea_id: ideaId,
    });
    const { result } = parseEnvelope(response);
    expect(result.count).toBe(2);
    expect(result.assumptions[0].text).toBe('first');
    expect(result.assumptions[1].text).toBe('second');
  });

  it('filters stale assumptions by default', async () => {
    const ideaId = await seedIdea();
    const first = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'kept',
      }),
    ).result;
    const second = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'stale',
      }),
    ).result;
    await fsp.unlink(path.join(vault, second.vault_path));

    const list = parseEnvelope(
      await client.callTool('assumption', { action: 'list', idea_id: ideaId }),
    );
    expect(list.result.count).toBe(1);
    expect(list.result.assumptions[0].id).toBe(first.id);
    expect(list.result.stale_hidden).toBe(1);
  });

  it('surfaces stale when include_stale: true', async () => {
    const ideaId = await seedIdea();
    const r = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'stale',
      }),
    ).result;
    await fsp.unlink(path.join(vault, r.vault_path));

    const list = parseEnvelope(
      await client.callTool('assumption', {
        action: 'list',
        idea_id: ideaId,
        include_stale: true,
      }),
    );
    expect(list.result.count).toBe(1);
    expect(list.result.assumptions[0].stale).toBe(true);
  });

  it('errors when idea_id is missing', async () => {
    const { isError } = parseEnvelope(
      await client.callTool('assumption', { action: 'list' }),
    );
    expect(isError).toBe(true);
  });

  it('nudges toward declare when the idea has no assumptions', async () => {
    const ideaId = await seedIdea();
    const list = parseEnvelope(
      await client.callTool('assumption', { action: 'list', idea_id: ideaId }),
    );
    const actions = list.next_steps.map((s: { action: string }) => s.action);
    expect(actions).toContain('assumption.declare');
  });
});

// ---------------------------------------------------------------------------
// lock / unlock
// ---------------------------------------------------------------------------

describe('assumption tool — lock / unlock', () => {
  it('locks sets locked_at in both DB and frontmatter', async () => {
    const ideaId = await seedIdea();
    const declare = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'lockable',
      }),
    ).result;

    const lock = parseEnvelope(
      await client.callTool('assumption', { action: 'lock', id: declare.id }),
    );
    expect(lock.isError).toBe(false);
    expect(lock.result.locked_at).toBeGreaterThan(0);

    const raw = await fsp.readFile(path.join(vault, declare.vault_path), 'utf8');
    expect(raw).toMatch(/locked_at:\s*"?\d{4}-\d{2}-\d{2}T/);
  });

  it('unlock clears locked_at (writes null frontmatter)', async () => {
    const ideaId = await seedIdea();
    const declare = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'lockable',
      }),
    ).result;
    await client.callTool('assumption', { action: 'lock', id: declare.id });

    const unlock = parseEnvelope(
      await client.callTool('assumption', { action: 'unlock', id: declare.id }),
    );
    expect(unlock.result.locked_at).toBeNull();

    const raw = await fsp.readFile(path.join(vault, declare.vault_path), 'utf8');
    expect(raw).toMatch(/locked_at:\s*null/);
  });

  it('errors when id is missing', async () => {
    expect(parseEnvelope(await client.callTool('assumption', { action: 'lock' })).isError).toBe(true);
    expect(parseEnvelope(await client.callTool('assumption', { action: 'unlock' })).isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// signposts_due
// ---------------------------------------------------------------------------

describe('assumption tool — signposts_due', () => {
  it('returns assumptions with elapsed signposts', async () => {
    const ideaId = await seedIdea();
    const past = Date.now() - 60_000;
    const declare = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'due',
        load_bearing: true,
        signpost_at: past,
      }),
    ).result;
    const future = Date.now() + 60_000;
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'future',
      load_bearing: true,
      signpost_at: future,
    });

    const response = parseEnvelope(
      await client.callTool('assumption', { action: 'signposts_due' }),
    );
    expect(response.result.count).toBe(1);
    expect(response.result.due[0].id).toBe(declare.id);
    expect(response.result.due[0].elapsed_ms).toBeGreaterThan(0);
  });

  it('extends horizon with window_ms', async () => {
    const ideaId = await seedIdea();
    const soon = Date.now() + 30_000;
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'soon',
      load_bearing: true,
      signpost_at: soon,
    });

    const zeroWindow = parseEnvelope(
      await client.callTool('assumption', { action: 'signposts_due' }),
    );
    expect(zeroWindow.result.count).toBe(0);

    const widened = parseEnvelope(
      await client.callTool('assumption', {
        action: 'signposts_due',
        window_ms: 60_000,
      }),
    );
    expect(widened.result.count).toBe(1);
  });

  it('excludes non-load-bearing and non-open assumptions', async () => {
    const ideaId = await seedIdea();
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'not-load-bearing',
      signpost_at: Date.now() - 1000,
      // load_bearing: false (default)
    });

    const response = parseEnvelope(
      await client.callTool('assumption', { action: 'signposts_due' }),
    );
    expect(response.result.count).toBe(0);
  });

  it('scopes by idea_id', async () => {
    const a = await seedIdea('A');
    const b = await seedIdea('B');
    const past = Date.now() - 1000;
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: a,
      text: 'a',
      load_bearing: true,
      signpost_at: past,
    });
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: b,
      text: 'b',
      load_bearing: true,
      signpost_at: past,
    });
    const scoped = parseEnvelope(
      await client.callTool('assumption', {
        action: 'signposts_due',
        idea_id: a,
      }),
    );
    expect(scoped.result.count).toBe(1);
    expect(scoped.result.due[0].idea_id).toBe(a);
  });

  it('nudges to browse when nothing is due', async () => {
    const response = parseEnvelope(
      await client.callTool('assumption', { action: 'signposts_due' }),
    );
    expect(response.result.count).toBe(0);
    const actions = response.next_steps.map((s: { action: string }) => s.action);
    expect(actions).toContain('idea.list');
  });
});

// ---------------------------------------------------------------------------
// forget
// ---------------------------------------------------------------------------

describe('assumption tool — forget', () => {
  it('removes the DB row but leaves markdown', async () => {
    const ideaId = await seedIdea();
    const declare = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'forget-me',
      }),
    ).result;

    const forget = parseEnvelope(
      await client.callTool('assumption', { action: 'forget', id: declare.id }),
    );
    expect(forget.isError).toBe(false);
    expect(forget.result.id).toBe(declare.id);

    const list = parseEnvelope(
      await client.callTool('assumption', { action: 'list', idea_id: ideaId }),
    );
    expect(list.result.count).toBe(0);

    const exists = await fsp
      .access(path.join(vault, declare.vault_path))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('errors on unknown id', async () => {
    const response = parseEnvelope(
      await client.callTool('assumption', { action: 'forget', id: 'asm-missing' }),
    );
    expect(response.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-linking: idea.read surfaces assumption hints
// ---------------------------------------------------------------------------

describe('idea.read cross-linking with assumptions', () => {
  it('suggests declare when idea has no assumptions', async () => {
    const ideaId = await seedIdea();
    const read = parseEnvelope(
      await client.callTool('idea', { action: 'read', id: ideaId }),
    );
    const actions = read.next_steps.map((s: { action: string }) => s.action);
    expect(actions).toContain('assumption.declare');
  });

  it('surfaces list-hint when signposts are due', async () => {
    const ideaId = await seedIdea();
    const past = Date.now() - 60_000;
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'due',
      load_bearing: true,
      signpost_at: past,
    });

    const read = parseEnvelope(
      await client.callTool('idea', { action: 'read', id: ideaId }),
    );
    const listStep = read.next_steps.find(
      (s: { action: string; why: string }) =>
        s.action === 'assumption.list' && /elapsed signpost/i.test(s.why),
    );
    expect(listStep).toBeDefined();
  });

  it('does not surface a due-signpost hint when nothing is due', async () => {
    const ideaId = await seedIdea();
    const future = Date.now() + 60_000;
    await client.callTool('assumption', {
      action: 'declare',
      idea_id: ideaId,
      text: 'future',
      load_bearing: true,
      signpost_at: future,
    });

    const read = parseEnvelope(
      await client.callTool('idea', { action: 'read', id: ideaId }),
    );
    // The cross-link helper must NOT inject the "elapsed signpost" hint when
    // no signposts are due. (The state-baseline next_steps for `nascent`
    // independently include `assumption.declare` — that is unrelated.)
    const listWithElapsedHint = read.next_steps.find(
      (s: { action: string; why: string }) =>
        s.action === 'assumption.list' && /elapsed signpost/i.test(s.why),
    );
    expect(listWithElapsedHint).toBeUndefined();
  });
});
