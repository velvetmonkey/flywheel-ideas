import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  patchFrontmatterViaSubprocess,
  writeNoteViaSubprocess,
  writeNotesViaSubprocess,
} from '../src/write/index.js';

const MOCK_FM = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-flywheel-memory.mjs',
);

let tmp: string;

beforeEach(async () => {
  tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-write-sub-'));
  delete process.env.FLYWHEEL_MEMORY_BIN;
});

afterEach(async () => {
  await fsp.rm(tmp, { recursive: true, force: true });
});

function mockOpts(env: Record<string, string>) {
  return { binary: 'node', args: [MOCK_FM], env };
}

describe('writeNoteViaSubprocess', () => {
  it('writes via note tool and returns mcp-subprocess write_path', async () => {
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'ideas/2026/04/sample-abc.md',
      { type: 'idea', title: 'sample', id: 'idea-xyz' },
      '# sample\n\nbody',
      mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', MOCK_FM_WRITE_ROOT: tmp }),
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.value.write_path).toBe('mcp-subprocess');
    expect(outcome.value.vault_path).toBe('ideas/2026/04/sample-abc.md');
    const file = path.join(tmp, 'ideas/2026/04/sample-abc.md');
    const stat = await fsp.stat(file);
    expect(stat.isFile()).toBe(true);
  });

  it('defaults imported notes to skip wikilinks but lets report callers opt in', async () => {
    const log = path.join(tmp, 'invocations.jsonl');

    await writeNoteViaSubprocess(
      tmp,
      'ideas/default.md',
      { type: 'idea' },
      'body',
      mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', MOCK_FM_INVOKE_LOG: log }),
    );
    await writeNoteViaSubprocess(
      tmp,
      'reports/report.md',
      { type: 'report' },
      'body',
      {
        ...mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', MOCK_FM_INVOKE_LOG: log }),
        skipWikilinks: false,
        suggestOutgoingLinks: true,
        maxSuggestions: 8,
      },
    );

    const invocations = (await fsp.readFile(log, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as {
        args: {
          path: string;
          skipWikilinks?: boolean;
          suggestOutgoingLinks?: boolean;
          maxSuggestions?: number;
        };
      });
    expect(invocations[0].args.path).toBe('ideas/default.md');
    expect(invocations[0].args.skipWikilinks).toBe(true);
    expect(invocations[0].args.suggestOutgoingLinks).toBe(false);
    expect(invocations[1].args.path).toBe('reports/report.md');
    expect(invocations[1].args.skipWikilinks).toBe(false);
    expect(invocations[1].args.suggestOutgoingLinks).toBe(true);
    expect(invocations[1].args.maxSuggestions).toBe(8);
  });

  it('returns the actual path reported by flywheel-memory', async () => {
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'reports/Company-Tracker-run-AbC.md',
      { type: 'report' },
      'body',
      mockOpts({
        MOCK_FM_SUPPORTS_NOTE: '1',
        MOCK_FM_RETURN_PATH: 'reports/company-tracker-run-abc.md',
      }),
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.value.vault_path).toBe('reports/company-tracker-run-abc.md');
  });

  it('writes a batch through one subprocess session', async () => {
    const log = path.join(tmp, 'invocations.jsonl');
    const pidLog = path.join(tmp, 'pids.txt');
    const outcome = await writeNotesViaSubprocess(
      tmp,
      [
        {
          relPath: 'reports/a.md',
          frontmatter: { type: 'report', id: 'a' },
          body: 'a',
          options: { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 4 },
        },
        {
          relPath: 'reports/b.md',
          frontmatter: { type: 'report', id: 'b' },
          body: 'b',
          options: { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 4 },
        },
      ],
      mockOpts({
        MOCK_FM_SUPPORTS_NOTE: '1',
        MOCK_FM_INVOKE_LOG: log,
        MOCK_FM_PID_LOG: pidLog,
      }),
    );

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.value.map((result) => result.vault_path)).toEqual(['reports/a.md', 'reports/b.md']);
    const invocations = (await fsp.readFile(log, 'utf8')).trim().split('\n');
    expect(invocations).toHaveLength(2);
    const pids = (await fsp.readFile(pidLog, 'utf8')).trim().split('\n');
    expect(new Set(pids).size).toBe(1);
  });

  it('returns skipped tool_returned_error when tool reports failure', async () => {
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'x.md',
      { type: 'idea' },
      'body',
      mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', MOCK_FM_NOTE_FORCE_ERROR: '1' }),
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('tool_returned_error');
  });

  it('returns skipped tool_returned_error when MCP flags the note response as an error', async () => {
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'x.md',
      { type: 'idea' },
      'body',
      mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', MOCK_FM_MCP_ERROR: '1' }),
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('tool_returned_error');
  });

  it.each([
    ['missing text content', { MOCK_FM_NO_CONTENT: '1' }],
    ['malformed JSON', { MOCK_FM_MALFORMED_JSON: '1' }],
    ['plain text', { MOCK_FM_PLAIN_TEXT: '1' }],
    ['missing success field', { MOCK_FM_MISSING_SUCCESS: '1' }],
    ['missing path field', { MOCK_FM_MISSING_PATH: '1' }],
  ])('returns skipped invalid_response for note %s', async (_name, env) => {
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'x.md',
      { type: 'idea' },
      'body',
      mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', ...env }),
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('invalid_response');
  });

  it('binary_not_found for missing absolute binary', async () => {
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'x.md',
      { type: 'idea' },
      'body',
      { binary: '/nonexistent/flywheel-memory' },
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('binary_not_found');
  });

  it('reaps a timed-out writer subprocess even when it ignores SIGTERM', async () => {
    const pidFile = path.join(tmp, 'writer.pid');
    const outcome = await writeNoteViaSubprocess(
      tmp,
      'reports/hanging.md',
      { type: 'report' },
      'body',
      {
        ...mockOpts({
          MOCK_FM_SUPPORTS_NOTE: '1',
          MOCK_FM_HANG_MS: '10000',
          MOCK_FM_IGNORE_SIGTERM: '1',
          MOCK_FM_PID_FILE: pidFile,
        }),
        timeoutMs: 100,
      },
    );

    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('timeout');
    const pid = Number.parseInt(await fsp.readFile(pidFile, 'utf8'), 10);
    expect(Number.isFinite(pid)).toBe(true);
    expect(await waitForDead(pid, 2_000)).toBe(true);
  }, 10_000);
});

describe('patchFrontmatterViaSubprocess', () => {
  it('passes through to vault_update_frontmatter + returns mcp-subprocess path', async () => {
    const outcome = await patchFrontmatterViaSubprocess(
      tmp,
      'ideas/sample.md',
      { state: 'explored', locked_at: null },
      mockOpts({ MOCK_FM_SUPPORTS_FRONTMATTER: '1' }),
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.value.write_path).toBe('mcp-subprocess');
    expect(outcome.value.vault_path).toBe('ideas/sample.md');
    expect(outcome.value.keys_changed.sort()).toEqual(['locked_at', 'state']);
  });

  it('propagates forced tool error as skipped tool_returned_error', async () => {
    const outcome = await patchFrontmatterViaSubprocess(
      tmp,
      'x.md',
      { state: 'committed' },
      mockOpts({
        MOCK_FM_SUPPORTS_FRONTMATTER: '1',
        MOCK_FM_FRONTMATTER_FORCE_ERROR: '1',
      }),
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('tool_returned_error');
  });

  it('propagates MCP error flag as skipped tool_returned_error', async () => {
    const outcome = await patchFrontmatterViaSubprocess(
      tmp,
      'x.md',
      { state: 'committed' },
      mockOpts({
        MOCK_FM_SUPPORTS_FRONTMATTER: '1',
        MOCK_FM_MCP_ERROR: '1',
      }),
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('tool_returned_error');
  });

  it.each([
    ['missing text content', { MOCK_FM_NO_CONTENT: '1' }],
    ['malformed JSON', { MOCK_FM_MALFORMED_JSON: '1' }],
    ['plain text', { MOCK_FM_PLAIN_TEXT: '1' }],
    ['missing success field', { MOCK_FM_MISSING_SUCCESS: '1' }],
    ['missing path field', { MOCK_FM_MISSING_PATH: '1' }],
  ])('returns skipped invalid_response for frontmatter %s', async (_name, env) => {
    const outcome = await patchFrontmatterViaSubprocess(
      tmp,
      'x.md',
      { state: 'committed' },
      mockOpts({
        MOCK_FM_SUPPORTS_FRONTMATTER: '1',
        ...env,
      }),
    );
    expect(outcome.status).toBe('skipped');
    if (outcome.status !== 'skipped') return;
    expect(outcome.reason).toBe('invalid_response');
  });
});

async function waitForDead(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !isPidAlive(pid);
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
