/**
 * Doc-mode end-to-end tests.
 *
 * Drives the doc-mode wedge through its actual file IO: create an
 * idea, append an assumption, log a verdict, transition, list. Asserts
 * the .md files appear on disk in the right shape and that round-trip
 * through parse + render survives every mutation.
 *
 * The format-level conformance (byte-identical round-trip) is covered
 * by packages/core/test/single-doc-format.test.ts. This file covers
 * the MCP handler orchestration: vault paths, dispatch, error shapes,
 * and the lifecycle the user actually performs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  openIdeasDb,
  parseDocIdea,
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
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-doc-e2e-'));
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

describe('doc-mode lifecycle — single idea', () => {
  it('create writes a .md under ideas-doc/ with frontmatter + sections', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', {
        action: 'create',
        backend: 'doc',
        title: 'Replace home thermostat',
        body: 'Smart thermostat should pay back in under two years.',
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.backend).toBe('doc');
    expect(response.result.state).toBe('nascent');
    expect(response.result.vault_path).toMatch(/^ideas-doc\/replace-home-thermostat-idea-/);

    const fileText = await fsp.readFile(path.join(vault, response.result.vault_path), 'utf8');
    const parsed = parseDocIdea(fileText);
    expect(parsed.id).toBe(response.result.id);
    expect(parsed.title).toBe('Replace home thermostat');
    expect(parsed.claim).toMatch(/pay back in under two years/);
    expect(parsed.state).toBe('nascent');
    expect(parsed.assumptions).toEqual([]);
    expect(parsed.verdict).toBeNull();

    // No SQLite row should exist for doc-mode ideas
    const sqliteRow = db
      .prepare('SELECT id FROM ideas_notes WHERE id = ?')
      .get(response.result.id);
    expect(sqliteRow).toBeUndefined();
  });

  it('full lifecycle: create → declare → transition → log verdict → read', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', {
        action: 'create',
        backend: 'doc',
        title: 'Migrate to Postgres 18',
      }),
    );
    expect(create.isError).toBe(false);
    const ideaId = create.result.id;

    const declare = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        backend: 'doc',
        idea_id: ideaId,
        text: 'Vacuum performance regression is bounded under our workload',
        load_bearing: true,
        signpost_at: Date.parse('2026-09-01T00:00:00Z'),
      }),
    );
    expect(declare.isError).toBe(false);
    expect(declare.result.backend).toBe('doc');

    const transition = parseEnvelope(
      await client.callTool('idea', {
        action: 'transition',
        backend: 'doc',
        id: ideaId,
        to: 'explored',
      }),
    );
    expect(transition.isError).toBe(false);
    expect(transition.result.from_state).toBe('nascent');
    expect(transition.result.to_state).toBe('explored');

    const log = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        backend: 'doc',
        idea_id: ideaId,
        text: 'Vacuum regression came in at 4x — refuted. Rolled back.',
        refutes: ['ignored-in-doc-mode'],
      }),
    );
    expect(log.isError).toBe(false);
    expect(log.result.verdict.state).toBe('fail');
    expect(log.result.state).toBe('refuted');

    const read = parseEnvelope(
      await client.callTool('idea', { action: 'read', backend: 'doc', id: ideaId }),
    );
    expect(read.isError).toBe(false);
    expect(read.result.state).toBe('refuted');
    expect(read.result.assumptions).toHaveLength(1);
    expect(read.result.assumptions[0].text).toMatch(/Vacuum performance regression/);
    expect(read.result.verdict).toEqual({
      state: 'fail',
      rationale: 'Vacuum regression came in at 4x — refuted. Rolled back.',
    });

    // The on-disk file must still be parse-clean after every mutation.
    const fileText = await fsp.readFile(path.join(vault, read.result.vault_path), 'utf8');
    expect(() => parseDocIdea(fileText)).not.toThrow();
  });

  it('list returns doc-mode ideas only, sorted by updated_at desc', async () => {
    const first = parseEnvelope(
      await client.callTool('idea', { action: 'create', backend: 'doc', title: 'First' }),
    );
    // tiny delay so updated_at differs
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = parseEnvelope(
      await client.callTool('idea', { action: 'create', backend: 'doc', title: 'Second' }),
    );

    const list = parseEnvelope(
      await client.callTool('idea', { action: 'list', backend: 'doc' }),
    );
    expect(list.isError).toBe(false);
    expect(list.result.count).toBe(2);
    expect(list.result.ideas[0].id).toBe(second.result.id);
    expect(list.result.ideas[1].id).toBe(first.result.id);
  });

  it('transition rejects invalid target state with clear error', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', backend: 'doc', title: 'Bet X' }),
    );
    const response = parseEnvelope(
      await client.callTool('idea', {
        action: 'transition',
        backend: 'doc',
        id: create.result.id,
        to: 'committed', // invalid from nascent (must go through explored → evaluated)
      }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/invalid transition: nascent → committed/);
  });

  it('outcome.log rejects when neither verdict nor refutes/validates provided', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', backend: 'doc', title: 'Bet Y' }),
    );
    const response = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        backend: 'doc',
        idea_id: create.result.id,
        text: 'No verdict signal given.',
      }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/requires a verdict/);
  });
});
