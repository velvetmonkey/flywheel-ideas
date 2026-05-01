import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deleteIdeasDbFiles,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { createConfiguredServer } from '../src/index.js';
import { connectMcpTestClient, type McpTestClient } from './helpers/mcpClient.js';

const FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'core',
  'test',
  'fixtures',
  'sec-company',
  'public-tech',
);

let vault: string;
let db: IdeasDatabase;
let client: McpTestClient;

function parseResp(resp: unknown): Record<string, unknown> {
  const r = resp as { content: Array<{ type: string; text: string }> };
  return JSON.parse(r.content[0].text);
}

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-company-tool-'));
  db = openIdeasDb(vault);
  runMigrations(db);
  client = await connectMcpTestClient(createConfiguredServer(vault, db));
});

afterEach(async () => {
  await client.close();
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('company MCP tool', () => {
  it('is registered', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('company');
  });

  it('tracks fixtures and applies staged outcomes only on explicit call', async () => {
    const tracked = parseResp(await client.callTool('company', {
      action: 'track',
      companies: ['MSFT'],
      fixture_dir: FIXTURE_DIR,
      confirm: true,
    })) as { result: { run_id: string; staged_outcomes: number } };

    expect(tracked.result.run_id).toMatch(/^run-/);
    expect(tracked.result.staged_outcomes).toBeGreaterThanOrEqual(1);
    const before = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(before.n).toBe(0);

    const applied = parseResp(await client.callTool('company', {
      action: 'apply_outcomes',
      run_id: tracked.result.run_id,
      min_confidence: 0.9,
      confirm: true,
    })) as { result: { applied_count: number } };

    expect(applied.result.applied_count).toBe(tracked.result.staged_outcomes);
    const after = db.prepare(`SELECT COUNT(*) as n FROM ideas_outcome_verdicts`).get() as { n: number };
    expect(after.n).toBe(tracked.result.staged_outcomes);
  });
});
