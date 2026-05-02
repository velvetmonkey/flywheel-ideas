import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  patchFrontmatterViaSubprocess,
  writeNoteViaSubprocess,
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
      { ...mockOpts({ MOCK_FM_SUPPORTS_NOTE: '1', MOCK_FM_INVOKE_LOG: log }), skipWikilinks: false },
    );

    const invocations = (await fsp.readFile(log, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { args: { path: string; skipWikilinks?: boolean } });
    expect(invocations[0].args.path).toBe('ideas/default.md');
    expect(invocations[0].args.skipWikilinks).toBe(true);
    expect(invocations[1].args.path).toBe('reports/report.md');
    expect(invocations[1].args.skipWikilinks).toBe(false);
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
});
