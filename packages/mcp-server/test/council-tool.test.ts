import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvalsFilePath,
  deleteIdeasDbFiles,
  grantApprovalFile,
  listDispatches,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { createConfiguredServer } from '../src/index.js';
import { connectMcpTestClient, type McpTestClient } from './helpers/mcpClient.js';

// Point MCP-level council.run dispatches at the mock CLI so tests never
// invoke the real claude binary.
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
const savedSpawn = process.env.FLYWHEEL_IDEAS_SPAWN_PREFIX;
const savedSpawnPrefixes = process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-council-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
  delete process.env.FLYWHEEL_IDEAS_APPROVE;
  // Per-CLI spawn overrides so M10 light matrix (claude + codex + gemini)
  // can run entirely against mocks, zero real-API calls in CI.
  process.env.FLYWHEEL_IDEAS_SPAWN_PREFIXES = JSON.stringify({
    claude: ['node', MOCK_CLI],
    codex: ['node', MOCK_CODEX],
    gemini: ['node', MOCK_GEMINI],
  });
  delete process.env.FLYWHEEL_IDEAS_SPAWN_PREFIX;
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
  if (savedSpawn === undefined) delete process.env.FLYWHEEL_IDEAS_SPAWN_PREFIX;
  else process.env.FLYWHEEL_IDEAS_SPAWN_PREFIX = savedSpawn;
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

async function seedIdea(): Promise<string> {
  const response = await client.callTool('idea', { action: 'create', title: 'Test idea' });
  return parseEnvelope(response).result.id;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

describe('council tool — discovery', () => {
  it('tools/list exposes the council tool', async () => {
    const { tools } = await client.listTools();
    const council = tools.find((t) => t.name === 'council');
    expect(council).toBeDefined();
    expect(council?.description).toContain('approval');
  });
});

// ---------------------------------------------------------------------------
// council.run — validation
// ---------------------------------------------------------------------------

describe('council.run — validation', () => {
  it('rejects missing id with idea.list hint', async () => {
    const response = parseEnvelope(await client.callTool('council', { action: 'run' }));
    expect(response.isError).toBe(true);
    expect(response.error).toContain('requires `id`');
    expect(response.next_steps[0].action).toBe('idea.list');
  });

  it('rejects unknown idea_id with idea.list hint', async () => {
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: 'idea-missing', confirm: true }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('idea not found');
    expect(response.next_steps[0].action).toBe('idea.list');
  });

  it('rejects when confirm is not true', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('confirm: true');
    expect(response.next_steps[0].example).toContain('confirm: true');
  });
});

// ---------------------------------------------------------------------------
// council.run — approval gate
// ---------------------------------------------------------------------------

describe('council.run — approval gate', () => {
  it('no approval → error points at env var + approvals file', async () => {
    const ideaId = await seedIdea();
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('FLYWHEEL_IDEAS_APPROVE');
    expect(response.error).toContain('.flywheel');
    expect(response.error).toContain('cannot be granted from this tool');
  });

  it('env=session → real dispatch with source=env + success status', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.status).toBe('success');
    expect(response.result.approval_source).toBe('env');
    expect(response.result.approval_scope).toBe('session');
    // M10 light matrix: 3 CLIs × 2 personas = 6 views
    expect(response.result.views).toHaveLength(6);
    expect(response.result.synthesis_vault_path).toMatch(/councils\/.*\/session-01\/SYNTHESIS\.md/);
  });

  it('env=always → real dispatch, source=env scope=always', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'always';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.result.status).toBe('success');
    expect(response.result.approval_source).toBe('env');
    expect(response.result.approval_scope).toBe('always');
  });

  it('file=always → real dispatch with source=persistent', async () => {
    const ideaId = await seedIdea();
    await grantApprovalFile(vault, 'always');
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.approval_source).toBe('persistent');
    expect(response.result.approval_scope).toBe('always');
    expect(response.result.status).toBe('success');
  });

  it('file=never → error points at manual file delete', async () => {
    const ideaId = await seedIdea();
    await grantApprovalFile(vault, 'never');
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('never');
    expect(response.error).toContain(approvalsFilePath(vault));
  });

  it('env=never overrides file=always (env precedence)', async () => {
    const ideaId = await seedIdea();
    await grantApprovalFile(vault, 'always');
    process.env.FLYWHEEL_IDEAS_APPROVE = 'never';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toContain('FLYWHEEL_IDEAS_APPROVE=never');
  });
});

// ---------------------------------------------------------------------------
// Dispatch audit — M8 writes one row per cell (2 per successful run)
// ---------------------------------------------------------------------------

describe('council.run — dispatch audit (M10 light matrix behavior)', () => {
  it('writes 12 dispatch rows per approved run (3 CLIs × 2 personas × 2 passes)', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'always';
    await client.callTool('council', { action: 'run', id: ideaId, confirm: true });
    const rows = listDispatches(db);
    expect(rows).toHaveLength(12);
    const byCli = new Map<string, number>();
    for (const row of rows) {
      expect(row.approval_scope).toBe('always');
      expect(row.finished_at).not.toBeNull();
      byCli.set(row.cli, (byCli.get(row.cli) ?? 0) + 1);
    }
    expect(byCli.get('claude')).toBe(4);
    expect(byCli.get('codex')).toBe(4);
    expect(byCli.get('gemini')).toBe(4);
  });

  it('does not write on rejected run (no approval)', async () => {
    const ideaId = await seedIdea();
    await client.callTool('council', { action: 'run', id: ideaId, confirm: true });
    expect(listDispatches(db)).toEqual([]);
  });

  it('does not write on rejected run (never)', async () => {
    const ideaId = await seedIdea();
    await grantApprovalFile(vault, 'never');
    await client.callTool('council', { action: 'run', id: ideaId, confirm: true });
    expect(listDispatches(db)).toEqual([]);
  });

  it('accumulates dispatch rows across multiple approved runs', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    for (let i = 0; i < 3; i++) {
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true });
    }
    expect(listDispatches(db)).toHaveLength(36); // 3 runs × 3 CLIs × 2 personas × 2 passes
  });
});

// ---------------------------------------------------------------------------
// M8 response shape + synthesis artifact
// ---------------------------------------------------------------------------

describe('council.run — M8 response shape', () => {
  it('response carries session_id + synthesis_vault_path + view summaries', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.result.session_id).toMatch(/^sess-/);
    // M10 light matrix: 3 CLIs × 2 personas = 6 views
    expect(response.result.views).toHaveLength(6);
    const personas = response.result.views.map((v: any) => v.persona).sort();
    expect(personas).toEqual([
      'growth-optimist',
      'growth-optimist',
      'growth-optimist',
      'risk-pessimist',
      'risk-pessimist',
      'risk-pessimist',
    ]);
    const models = new Set(response.result.views.map((v: any) => v.model));
    expect(models).toEqual(new Set(['claude', 'codex', 'gemini']));
    for (const v of response.result.views) {
      expect(v.content_vault_path).toMatch(/councils\/.*\/session-01\/.*\.md/);
      expect(typeof v.confidence).toBe('number');
      expect(v.failure_reason).toBeNull();
    }
  });

  it('synthesis file exists on disk after approved run', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    const full = path.join(vault, response.result.synthesis_vault_path);
    const content = await fsp.readFile(full, 'utf8');
    expect(content).toContain('Council session');
    expect(content).toContain('Risk Pessimist');
    expect(content).toContain('Growth Optimist');
  });

  it('defaults mode to pre_mortem for nascent ideas', async () => {
    const ideaId = await seedIdea(); // nascent default
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    expect(response.result.mode).toBe('pre_mortem');
  });

  it('explicit mode=standard overrides the nascent → pre_mortem default', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', {
        action: 'run',
        id: ideaId,
        confirm: true,
        mode: 'standard',
      }),
    );
    expect(response.result.mode).toBe('standard');
  });

  it('next_steps include reading the synthesis', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'run', id: ideaId, confirm: true }),
    );
    const actions = response.next_steps.map((s: any) => s.action);
    expect(actions).toContain('read_file');
    expect(actions).toContain('idea.read');
  });

  it('depth=full succeeds: 15 views (3 CLIs × 5 personas), 30 dispatches', async () => {
    const ideaId = await seedIdea();
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const response = parseEnvelope(
      await client.callTool('council', {
        action: 'run',
        id: ideaId,
        confirm: true,
        depth: 'full',
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.status).toBe('success');
    expect(response.result.views).toHaveLength(15);
    expect(listDispatches(db)).toHaveLength(30);
    const models = new Set(response.result.views.map((v: any) => v.model));
    expect(models).toEqual(new Set(['claude', 'codex', 'gemini']));
    const personas = new Set(response.result.views.map((v: any) => v.persona));
    expect(personas).toEqual(
      new Set([
        'risk-pessimist',
        'growth-optimist',
        'competitor-strategist',
        'regulator',
        'customer-advocate',
      ]),
    );
  }, 30_000);
});

// ---------------------------------------------------------------------------
// council.approval_status
// ---------------------------------------------------------------------------

describe('council.approval_status', () => {
  it('reports no_approval with env_var + approvals_file pointers', async () => {
    const response = parseEnvelope(
      await client.callTool('council', { action: 'approval_status' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.granted).toBe(false);
    expect(response.result.reason).toBe('no_approval');
    expect(response.result.env_var).toBe('FLYWHEEL_IDEAS_APPROVE');
    expect(response.result.approvals_file).toContain('.flywheel');
    // next_steps should explain out-of-band grant
    const actions = response.next_steps.map((s: any) => s.action);
    expect(actions).toContain('set_env');
    expect(actions).toContain('edit_file');
  });

  it('reports granted when env=always', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'always';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'approval_status' }),
    );
    expect(response.result.granted).toBe(true);
    expect(response.result.source).toBe('env');
    expect(response.result.scope).toBe('always');
    expect(response.result.binaries).toEqual(['claude', 'codex', 'gemini']);
  });

  it('reports granted when persistent file=always', async () => {
    await grantApprovalFile(vault, 'always', { granted_at: 1714000000000 });
    const response = parseEnvelope(
      await client.callTool('council', { action: 'approval_status' }),
    );
    expect(response.result.granted).toBe(true);
    expect(response.result.source).toBe('persistent');
    expect(response.result.granted_at).toBe(1714000000000);
  });

  it('reports blocked with reason=never_persisted when file=never', async () => {
    await grantApprovalFile(vault, 'never');
    const response = parseEnvelope(
      await client.callTool('council', { action: 'approval_status' }),
    );
    expect(response.result.granted).toBe(false);
    expect(response.result.reason).toBe('never_persisted');
  });

  it('env=never overrides file=always in status read', async () => {
    await grantApprovalFile(vault, 'always');
    process.env.FLYWHEEL_IDEAS_APPROVE = 'never';
    const response = parseEnvelope(
      await client.callTool('council', { action: 'approval_status' }),
    );
    expect(response.result.granted).toBe(false);
    expect(response.result.reason).toBe('never_env');
  });

  it('never exposes a grant action in next_steps (LLM cannot self-approve)', async () => {
    const response = parseEnvelope(
      await client.callTool('council', { action: 'approval_status' }),
    );
    const actions = response.next_steps.map((s: any) => s.action);
    // Grant/reset MUST NOT appear as callable actions
    expect(actions).not.toContain('council.approval_grant');
    expect(actions).not.toContain('council.approval_reset');
    expect(actions).not.toContain('approval.grant');
  });
});

// ---------------------------------------------------------------------------
// Tool surface — explicitly no mutation exposed
// ---------------------------------------------------------------------------

describe('council tool — immutable surface (MCP consent invariant)', () => {
  it('does not expose approval_grant / approval_reset actions', async () => {
    // The zod schema restricts action to ['run', 'approval_status']; unknown
    // actions should produce an error at the SDK layer OR fall through to the
    // handler's default mcpError.
    const response = await client.callTool('council', { action: 'approval_reset' }).catch(
      (err: unknown) => ({
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }) }],
        isError: true,
      }),
    );
    expect(response.isError).toBe(true);
  });
});
