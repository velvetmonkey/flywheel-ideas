/**
 * Doc-mode backend boundary tests.
 *
 * Covers the dispatch gate added in the B1 commit: every tool now
 * accepts an optional `backend: 'sqlite' | 'doc'` field, defaulting to
 * 'sqlite'. This file asserts that:
 *
 *   - Unsupported (tool, action) pairs invoked with backend='doc' return
 *     a stable `not_supported_in_doc_mode: ...` error and a next_steps
 *     hint pointing back to backend='sqlite'.
 *   - Supported (tool, action) pairs invoked with backend='doc' return
 *     the staged `doc_mode_in_flight: ...` placeholder. The B2 commit
 *     swaps these placeholders for real doc-mode handler implementations
 *     and the tests against this file's `doc_mode_in_flight` arm will be
 *     replaced with file-content assertions.
 *   - The sqlite path remains the default and is unchanged.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
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
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-docmode-'));
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

// ---------------------------------------------------------------------------
// idea tool
// ---------------------------------------------------------------------------

describe('doc-mode boundary — idea tool', () => {
  it('supported action create routes to doc-mode handler (success)', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', {
        action: 'create',
        backend: 'doc',
        title: 'Boundary smoke',
      }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.backend).toBe('doc');
    expect(response.result.id).toMatch(/^idea-/);
  });

  it('supported action list routes to doc-mode handler (empty result on fresh vault)', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'list', backend: 'doc' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.backend).toBe('doc');
    expect(response.result.ideas).toEqual([]);
  });

  it('supported action read without id routes to doc-mode handler (validation error)', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'read', backend: 'doc' }),
    );
    // The doc-mode handler — not the placeholder — produces this error
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/doc-mode read requires `id`/);
  });

  it('supported action transition without id routes to doc-mode handler (validation error)', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'transition', backend: 'doc' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/doc-mode transition requires `id`/);
  });

  it.each([
    'forget',
    'freeze',
    'list_freezes',
    'ancestry',
    'descendants',
    'shared_assumptions',
    'export',
    'report',
  ] as const)('unsupported action %s returns not_supported_in_doc_mode', async (action) => {
    const response = parseEnvelope(
      await client.callTool('idea', { action, backend: 'doc' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/not_supported_in_doc_mode: idea\.\w+/);
    expect(response.next_steps[0].example).toContain('backend: "sqlite"');
  });

  it('default backend (omitted) routes to sqlite path unchanged', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'list' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.ideas).toEqual([]);
  });

  it('explicit backend: "sqlite" routes to sqlite path unchanged', async () => {
    const response = parseEnvelope(
      await client.callTool('idea', { action: 'list', backend: 'sqlite' }),
    );
    expect(response.isError).toBe(false);
    expect(response.result.ideas).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// assumption tool
// ---------------------------------------------------------------------------

describe('doc-mode boundary — assumption tool', () => {
  it('supported action declare without idea_id routes to doc-mode handler (validation error)', async () => {
    const response = parseEnvelope(
      await client.callTool('assumption', { action: 'declare', backend: 'doc' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/doc-mode assumption.declare requires `idea_id`/);
  });

  it.each([
    'list',
    'lock',
    'unlock',
    'signposts_due',
    'forget',
    'radar',
    'extension_set',
    'extension_get',
  ] as const)('unsupported action %s returns not_supported_in_doc_mode', async (action) => {
    const response = parseEnvelope(
      await client.callTool('assumption', { action, backend: 'doc' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/not_supported_in_doc_mode: assumption\.\w+/);
  });
});

// ---------------------------------------------------------------------------
// outcome tool
// ---------------------------------------------------------------------------

describe('doc-mode boundary — outcome tool', () => {
  it('supported action log without idea_id routes to doc-mode handler (validation error)', async () => {
    const response = parseEnvelope(
      await client.callTool('outcome', { action: 'log', backend: 'doc' }),
    );
    expect(response.isError).toBe(true);
    expect(response.error).toMatch(/doc-mode outcome.log requires `idea_id`/);
  });

  it.each(['undo', 'list', 'read', 'memo_upsert'] as const)(
    'unsupported action %s returns not_supported_in_doc_mode',
    async (action) => {
      const response = parseEnvelope(
        await client.callTool('outcome', { action, backend: 'doc' }),
      );
      expect(response.isError).toBe(true);
      expect(response.error).toMatch(/not_supported_in_doc_mode: outcome\.\w+/);
    },
  );
});

// ---------------------------------------------------------------------------
// council tool — every action rejected
// ---------------------------------------------------------------------------

describe('doc-mode boundary — council tool rejects all actions', () => {
  it.each(['run', 'approval_status', 'delta', 'effectiveness_report'] as const)(
    '%s with backend=doc returns not_supported_in_doc_mode',
    async (action) => {
      const response = parseEnvelope(
        await client.callTool('council', { action, backend: 'doc' }),
      );
      expect(response.isError).toBe(true);
      expect(response.error).toMatch(/not_supported_in_doc_mode: council\.\w+/);
    },
  );
});

// ---------------------------------------------------------------------------
// company tool — every action rejected
// ---------------------------------------------------------------------------

describe('doc-mode boundary — company tool rejects all actions', () => {
  it.each(['track', 'evaluate', 'read', 'report', 'apply_outcomes'] as const)(
    '%s with backend=doc returns not_supported_in_doc_mode',
    async (action) => {
      const response = parseEnvelope(
        await client.callTool('company', { action, backend: 'doc' }),
      );
      expect(response.isError).toBe(true);
      expect(response.error).toMatch(/not_supported_in_doc_mode: company\.\w+/);
    },
  );
});
