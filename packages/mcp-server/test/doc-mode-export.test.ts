/**
 * idea.export_doc — SQLite → doc-mode migration tests.
 *
 * Drives an existing SQLite-mode idea through declare + outcome.log,
 * then exports it as a portable doc-mode .md and asserts the result
 * round-trips clean through parseDocIdea + doctor.consistency.
 *
 * One-way migration by design (no import-back); these tests cover the
 * full carry-out path the wedge plan promised: alpha users can take
 * their existing ledger out into the doc format and into other apps.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildConsistencyDoctorReport,
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
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-export-doc-'));
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

describe('idea.export_doc — happy path', () => {
  it('exports a SQLite idea with assumptions + verdict into doc-mode .md', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', {
        action: 'create',
        title: 'Migrate ingestion to Kinesis',
        body: 'Vendor benchmarks suggest sub-150ms p99 at 2x current peak.',
      }),
    );
    expect(create.isError).toBe(false);
    const ideaId = create.result.id;

    const declare = parseEnvelope(
      await client.callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: 'Kinesis sustains p99 < 150ms under our burst pattern',
        load_bearing: true,
        signpost_at: Date.parse('2026-08-01T00:00:00Z'),
      }),
    );
    expect(declare.isError).toBe(false);
    const assumptionId = declare.result.id;

    const log = parseEnvelope(
      await client.callTool('outcome', {
        action: 'log',
        idea_id: ideaId,
        text: 'Black Friday p99 hit 480ms. Failed.',
        refutes: [assumptionId],
      }),
    );
    expect(log.isError).toBe(false);

    const exp = parseEnvelope(
      await client.callTool('idea', {
        action: 'export_doc',
        id: ideaId,
      }),
    );
    expect(exp.error, JSON.stringify(exp)).toBeUndefined();
    expect(exp.isError).toBe(false);
    expect(exp.result.sqlite_id).toBe(ideaId);
    expect(exp.result.doc_path).toMatch(/^ideas-doc\/migrate-ingestion-to-kinesis-/);
    expect(exp.result.assumptions_count).toBe(1);
    expect(exp.result.has_verdict).toBe(true);

    const docText = await fsp.readFile(path.join(vault, exp.result.doc_path), 'utf8');
    const parsed = parseDocIdea(docText);
    expect(parsed.id).toBe(ideaId);
    // SQLite mode does not auto-transition the idea on outcome.log
    // (hard product rule: no auto-transitions). The idea stays in
    // 'nascent' until the user explicitly transitions. Doc-mode
    // permits state=nascent + a draft verdict block.
    expect(parsed.state).toBe('nascent');
    expect(parsed.assumptions).toHaveLength(1);
    expect(parsed.assumptions[0].status).toBe('refuted');
    expect(parsed.verdict).toEqual({
      state: 'fail',
      rationale: 'Black Friday p99 hit 480ms. Failed.',
    });

    // Doctor mode: 'doc' must report ok on the freshly-exported file.
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(true);
  });

  it('exports an idea with no assumptions and no outcome cleanly', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Just a thought' }),
    );
    const exp = parseEnvelope(
      await client.callTool('idea', { action: 'export_doc', id: create.result.id }),
    );
    expect(exp.isError).toBe(false);
    expect(exp.result.assumptions_count).toBe(0);
    expect(exp.result.has_verdict).toBe(false);
    const text = await fsp.readFile(path.join(vault, exp.result.doc_path), 'utf8');
    expect(() => parseDocIdea(text)).not.toThrow();
  });
});

describe('idea.export_doc — guard rails', () => {
  it('rejects missing id', async () => {
    const exp = parseEnvelope(
      await client.callTool('idea', { action: 'export_doc' }),
    );
    expect(exp.isError).toBe(true);
    expect(exp.error).toMatch(/requires `id`/);
  });

  it('rejects unknown id', async () => {
    const exp = parseEnvelope(
      await client.callTool('idea', { action: 'export_doc', id: 'idea-nope' }),
    );
    expect(exp.isError).toBe(true);
    expect(exp.error).toMatch(/idea not found/);
  });

  it('refuses to overwrite existing file without overwrite: true', async () => {
    const create = parseEnvelope(
      await client.callTool('idea', { action: 'create', title: 'Twice exported' }),
    );
    const first = parseEnvelope(
      await client.callTool('idea', { action: 'export_doc', id: create.result.id }),
    );
    expect(first.isError).toBe(false);

    const second = parseEnvelope(
      await client.callTool('idea', { action: 'export_doc', id: create.result.id }),
    );
    expect(second.isError).toBe(true);
    expect(second.error).toMatch(/refusing to overwrite/);

    const forced = parseEnvelope(
      await client.callTool('idea', {
        action: 'export_doc',
        id: create.result.id,
        overwrite: true,
      }),
    );
    expect(forced.isError).toBe(false);
  });
});
