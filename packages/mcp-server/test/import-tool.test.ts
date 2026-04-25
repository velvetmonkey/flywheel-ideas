import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deleteIdeasDbFiles,
  openIdeasDb,
  runMigrations,
  __resetRegistryForTests,
  registerAdapter,
  GithubStructuredDocsAdapter,
  type IdeasDatabase,
  type ImportAdapter,
  type ImportContext,
  type RawCandidate,
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
  'peps',
);

let vault: string;
let db: IdeasDatabase;
let client: McpTestClient;

class MockAdapter implements ImportAdapter {
  readonly name = 'mock-adapter';
  constructor(private readonly seeds: RawCandidate[]) {}
  async *scan(_source: string, _ctx: ImportContext): AsyncGenerator<RawCandidate> {
    for (const c of this.seeds) yield c;
  }
}

function parseResp(resp: unknown): Record<string, unknown> {
  const r = resp as {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  return JSON.parse(r.content[0].text);
}

function isErrorResp(resp: unknown): boolean {
  return (resp as { isError?: boolean }).isError === true;
}

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-import-tool-'));
  db = openIdeasDb(vault);
  runMigrations(db);
  // Register built-ins + a mock adapter for tests. __resetRegistryForTests
  // clears first so mock doesn't collide.
  __resetRegistryForTests();
  registerAdapter(new GithubStructuredDocsAdapter());
  registerAdapter(
    new MockAdapter([
      {
        kind: 'idea',
        title: 'Canned Idea A',
        bodyMd: '# Canned Idea A\n\nSeed content.',
        confidence: 0.9,
        sourceUri: 'mock://a',
      },
      {
        kind: 'idea',
        title: 'Canned Idea B',
        bodyMd: '# Canned Idea B\n\nAnother seed.',
        confidence: 0.8,
        sourceUri: 'mock://b',
      },
      {
        kind: 'assumption',
        title: 'A canned assumption',
        bodyMd: 'We assume the seed is load-bearing.',
        confidence: 0.6,
        sourceUri: 'mock://c',
      },
    ]),
  );
  const server = createConfiguredServer(vault, db);
  client = await connectMcpTestClient(server);
});

afterEach(async () => {
  await client.close();
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
  __resetRegistryForTests();
  registerAdapter(new GithubStructuredDocsAdapter());
});

describe('import MCP tool', () => {
  it('lists the tool with the other four', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toContain('import');
    expect(names).toContain('idea');
    expect(names).toContain('assumption');
    expect(names).toContain('council');
    expect(names).toContain('outcome');
  });

  it('scan → persists source + candidates; dedup skipped when bridge disabled', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    try {
      const resp = await client.callTool('import', {
        action: 'scan',
        adapter: 'mock-adapter',
        source: 'ignored',
      });
      const body = parseResp(resp) as {
        result: {
          source_id: string;
          scanned_count: number;
          pending_count: number;
          duplicate_count: number;
          dedup_status: string;
          candidates: Array<{ id: string; candidate_kind: string; state: string }>;
        };
      };
      expect(body.result.scanned_count).toBe(3);
      expect(body.result.pending_count).toBe(3);
      expect(body.result.duplicate_count).toBe(0);
      expect(['disabled', 'bridge_unavailable']).toContain(body.result.dedup_status);
      expect(body.result.candidates.every((c) => c.state === 'pending')).toBe(true);
    } finally {
      delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    }
  });

  it('scan_config.filter passes through to the adapter', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    try {
      const resp = await client.callTool('import', {
        action: 'scan',
        adapter: 'github-structured-docs',
        source: `fixture://${FIXTURE_DIR}`,
        scan_config: { filter: '^pep-0008\\.rst$' },
      });
      const body = parseResp(resp) as {
        result: {
          scanned_count: number;
          candidates: Array<{ candidate_kind: string; title: string }>;
        };
      };
      const ideas = body.result.candidates.filter((c) => c.candidate_kind === 'idea');
      expect(ideas.length).toBe(1);
      expect(ideas[0].title).toMatch(/Style Guide/);
    } finally {
      delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    }
  });

  it('scan error surfaces unknown adapter in a structured error', async () => {
    const resp = await client.callTool('import', {
      action: 'scan',
      adapter: 'nonexistent-adapter',
      source: 'x',
    });
    expect(isErrorResp(resp)).toBe(true);
    const body = parseResp(resp) as { error: string };
    expect(body.error).toMatch(/unknown adapter/);
  });

  it('promote creates the vault note + flips candidate state', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    try {
      const scan = parseResp(
        await client.callTool('import', {
          action: 'scan',
          adapter: 'mock-adapter',
          source: 'ignored',
        }),
      ) as {
        result: { candidates: Array<{ id: string; candidate_kind: string }> };
      };
      const ideaCandidate = scan.result.candidates.find((c) => c.candidate_kind === 'idea')!;
      expect(ideaCandidate).toBeDefined();

      const promoteResp = await client.callTool('import', {
        action: 'promote',
        candidate_id: ideaCandidate.id,
        as: 'idea',
      });
      const promoteBody = parseResp(promoteResp) as {
        result: { kind: string; promoted_id: string; vault_path: string };
      };
      expect(promoteBody.result.kind).toBe('idea');
      expect(promoteBody.result.promoted_id).toMatch(/^idea-/);

      const full = path.join(vault, promoteBody.result.vault_path);
      const stat = await fsp.stat(full);
      expect(stat.isFile()).toBe(true);

      const listResp = await client.callTool('import', {
        action: 'list',
        state: 'imported',
      });
      const listBody = parseResp(listResp) as {
        result: { candidates: Array<{ id: string; state: string }> };
      };
      expect(listBody.result.candidates.find((c) => c.id === ideaCandidate.id)?.state).toBe(
        'imported',
      );
    } finally {
      delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    }
  });

  it('promote rejects kind mismatch with structured next_steps', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    try {
      const scan = parseResp(
        await client.callTool('import', {
          action: 'scan',
          adapter: 'mock-adapter',
          source: 'ignored',
        }),
      ) as {
        result: { candidates: Array<{ id: string; candidate_kind: string }> };
      };
      const assumptionCand = scan.result.candidates.find(
        (c) => c.candidate_kind === 'assumption',
      )!;
      const resp = await client.callTool('import', {
        action: 'promote',
        candidate_id: assumptionCand.id,
        as: 'idea',
      });
      expect(isErrorResp(resp)).toBe(true);
      const body = parseResp(resp) as { error: string; next_steps: unknown[] };
      expect(body.error).toMatch(/candidate kind/);
      expect(Array.isArray(body.next_steps)).toBe(true);
    } finally {
      delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    }
  });

  it('reject flips a pending candidate', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    try {
      const scan = parseResp(
        await client.callTool('import', {
          action: 'scan',
          adapter: 'mock-adapter',
          source: 'ignored',
        }),
      ) as { result: { candidates: Array<{ id: string }> } };
      const id = scan.result.candidates[0].id;
      const resp = await client.callTool('import', {
        action: 'reject',
        candidate_id: id,
      });
      const body = parseResp(resp) as { result: { state: string } };
      expect(body.result.state).toBe('rejected');
    } finally {
      delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    }
  });

  it('scan with github-structured-docs fixture mode produces PEP candidates', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    try {
      const resp = await client.callTool('import', {
        action: 'scan',
        adapter: 'github-structured-docs',
        source: `fixture://${FIXTURE_DIR}`,
      });
      const body = parseResp(resp) as {
        result: {
          scanned_count: number;
          candidates: Array<{ candidate_kind: string; title: string }>;
        };
      };
      expect(body.result.scanned_count).toBeGreaterThan(0);
      const kinds = new Set(body.result.candidates.map((c) => c.candidate_kind));
      expect(kinds.has('idea')).toBe(true);
    } finally {
      delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    }
  });
});
