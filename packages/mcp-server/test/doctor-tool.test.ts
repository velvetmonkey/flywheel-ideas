import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  deleteIdeasDbFiles,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { createConfiguredServer } from '../src/index.js';
import { connectMcpTestClient, type McpTestClient } from './helpers/mcpClient.js';

let vault: string;
let db: IdeasDatabase;
let client: McpTestClient;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-doctor-'));
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

describe('doctor tool', () => {
  it('is exposed in tools/list', async () => {
    const { tools } = await client.listTools();
    const doctor = tools.find((tool) => tool.name === 'doctor');
    expect(doctor).toBeDefined();
    expect(doctor?.description).toMatch(/diagnostics/i);
  });

  it('returns a read-only consistency report', async () => {
    db.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-missing', 'ideas/missing.md', 'Missing', 'nascent', 1, 1);

    const response = await client.callTool('doctor', { action: 'consistency' });
    const { result, next_steps, isError } = parseEnvelope(response);

    expect(isError).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.counts.missing_markdown).toBe(1);
    expect(result.issues[0]).toMatchObject({
      kind: 'missing_markdown',
      table: 'ideas_notes',
      id: 'idea-missing',
      path: 'ideas/missing.md',
    });
    expect(next_steps[0].action).toBe('doctor.consistency');
  });
});
