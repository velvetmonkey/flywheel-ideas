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

  it('returns SEC ledger empty state through idea.report before a run exists', async () => {
    const report = parseResp(await client.callTool('idea', {
      action: 'report',
      report_kind: 'sec_company',
    })) as {
      result: {
        current_bets: unknown[];
        markdown: string;
      };
      next_steps: Array<{ action: string }>;
    };

    expect(report.result.current_bets).toHaveLength(0);
    expect(report.result.markdown).toContain('No SEC company tracker run exists yet');
    expect(report.next_steps[0].action).toBe('company.track');
  });

  it('tracks fixtures and applies staged outcomes only on explicit call', async () => {
    const tracked = parseResp(await client.callTool('company', {
      action: 'track',
      companies: ['NVDA'],
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

  it('returns latest and explicit SEC ledger reports through idea.report', async () => {
    const tracked = parseResp(await client.callTool('company', {
      action: 'track',
      companies: ['AAPL', 'MSFT', 'NVDA'],
      fixture_dir: FIXTURE_DIR,
      confirm: true,
    })) as { result: { run_id: string; staged_outcomes: number } };

    const latest = parseResp(await client.callTool('idea', {
      action: 'report',
      report_kind: 'sec_company',
    })) as {
      result: {
        run: { id: string };
        executive_summary: { staged_candidates: number; review_events: number };
        current_bets: unknown[];
        review_queue: Array<{ apply_command: string }>;
        accepted_verdicts: unknown[];
        markdown: string;
      };
      next_steps: Array<{ action: string; example: string }>;
    };

    expect(latest.result.run.id).toBe(tracked.result.run_id);
    expect(latest.result.executive_summary.staged_candidates).toBe(tracked.result.staged_outcomes);
    expect(latest.result.executive_summary.review_events).toBeGreaterThan(0);
    expect(latest.result.current_bets.length).toBeGreaterThan(0);
    expect(latest.result.review_queue[0].apply_command).toContain(tracked.result.run_id);
    expect(latest.result.accepted_verdicts).toHaveLength(0);
    expect(latest.result.markdown).toContain('## Current Bets');
    expect(latest.next_steps[0].action).toBe('company.apply_outcomes');

    const explicit = parseResp(await client.callTool('idea', {
      action: 'report',
      report_kind: 'sec_company',
      run_id: tracked.result.run_id,
    })) as { result: { run: { id: string } } };
    expect(explicit.result.run.id).toBe(tracked.result.run_id);
  });
});
