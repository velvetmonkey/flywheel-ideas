import { describe, it, expect } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyCliError,
  CLI_ERROR_PATTERNS,
  UNCATALOGUED_REASONS,
  type CliName,
} from '../src/index.js';

const FIXTURE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'cli-errors',
);

async function fixture(cli: CliName, file: string): Promise<string> {
  return await fsp.readFile(path.join(FIXTURE_ROOT, cli, file), 'utf8');
}

// ---------------------------------------------------------------------------
// Timeout + signal precedence (authoritative)
// ---------------------------------------------------------------------------

describe('classifyCliError — timeout precedence', () => {
  it('dispatcher-kill flag overrides everything', () => {
    const r = classifyCliError('claude', {
      exit_code: 0,
      stderr_tail: 'error: unknown option', // would match parse otherwise
      was_killed_by_dispatcher: true,
    });
    expect(r.reason).toBe('timeout');
    expect(r.pattern).toBe('dispatcher-killed');
  });

  it('SIGTERM → timeout', () => {
    const r = classifyCliError('codex', {
      exit_code: null,
      signal: 'SIGTERM',
    });
    expect(r.reason).toBe('timeout');
    expect(r.pattern).toBe('signal-SIGTERM');
  });

  it('SIGKILL → timeout', () => {
    const r = classifyCliError('gemini', {
      exit_code: null,
      signal: 'SIGKILL',
    });
    expect(r.reason).toBe('timeout');
  });

  it('other signals do not match timeout', () => {
    const r = classifyCliError('claude', {
      exit_code: null,
      signal: 'SIGINT',
    });
    expect(r.reason).not.toBe('timeout');
  });
});

// ---------------------------------------------------------------------------
// Golden fixtures — parse errors (per CLI)
// ---------------------------------------------------------------------------

describe('classifyCliError — parse errors from golden fixtures', () => {
  it('claude: unknown option stderr → parse', async () => {
    const stderr = await fixture('claude', 'parse-unknown-flag.txt');
    const r = classifyCliError('claude', { exit_code: 1, stderr_tail: stderr });
    expect(r.reason).toBe('parse');
    expect(r.pattern).toBe('claude-parse-unknown-option');
  });

  it('codex: unexpected argument stderr → parse', async () => {
    const stderr = await fixture('codex', 'parse-unknown-flag.txt');
    const r = classifyCliError('codex', { exit_code: 2, stderr_tail: stderr });
    expect(r.reason).toBe('parse');
    expect(r.pattern).toBe('codex-parse-clap-unexpected');
  });

  it('gemini: unknown arguments stderr → parse', async () => {
    const stderr = await fixture('gemini', 'parse-unknown-flag.txt');
    const r = classifyCliError('gemini', { exit_code: 1, stderr_tail: stderr });
    expect(r.reason).toBe('parse');
    expect(r.pattern).toBe('gemini-parse-yargs-unknown-args');
  });
});

// ---------------------------------------------------------------------------
// Golden fixtures — bad model
// ---------------------------------------------------------------------------

describe('classifyCliError — bad_model from golden fixtures', () => {
  it('claude: bad-model text appears on stdout, not stderr', async () => {
    const stdout = await fixture('claude', 'bad-model.txt');
    const r = classifyCliError('claude', {
      exit_code: 1,
      stdout_tail: stdout,
      stderr_tail: '',
    });
    expect(r.reason).toBe('bad_model');
    expect(r.pattern).toBe('claude-bad-model-stdout');
  });

  it('codex: turn.failed JSONL → bad_model', async () => {
    const stdout = await fixture('codex', 'bad-model.jsonl');
    const r = classifyCliError('codex', {
      exit_code: 1,
      stdout_tail: stdout,
      stderr_tail: '',
    });
    expect(r.reason).toBe('bad_model');
    expect(r.pattern).toBe('codex-bad-model-turn-failed');
  });

  it('codex: plain turn.failed without invalid_request_error does NOT match bad_model', () => {
    // Partial JSONL — no model reference. Should fall through to exit_nonzero.
    const stdout = '{"type":"turn.failed","error":{"message":"something else"}}\n';
    const r = classifyCliError('codex', { exit_code: 1, stdout_tail: stdout });
    expect(r.reason).toBe('exit_nonzero');
  });
});

// ---------------------------------------------------------------------------
// Fallback + exit-code handling
// ---------------------------------------------------------------------------

describe('classifyCliError — fallback', () => {
  it('non-zero exit without pattern match → exit_nonzero', () => {
    const r = classifyCliError('claude', {
      exit_code: 7,
      stdout_tail: 'nothing matches',
      stderr_tail: 'nothing matches',
    });
    expect(r.reason).toBe('exit_nonzero');
    expect(r.pattern).toBe('exit-7');
  });

  it('zero exit with no match → unknown', () => {
    const r = classifyCliError('claude', {
      exit_code: 0,
      stdout_tail: '',
      stderr_tail: '',
    });
    expect(r.reason).toBe('unknown');
  });

  it('empty stdout+stderr, null exit, no signal → unknown', () => {
    const r = classifyCliError('gemini', { exit_code: null });
    expect(r.reason).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// Cross-CLI pattern isolation — claude patterns don't match codex fixtures
// ---------------------------------------------------------------------------

describe('classifyCliError — per-CLI isolation', () => {
  it('claude stderr pattern does not match against codex CLI', async () => {
    const claudeStderr = await fixture('claude', 'parse-unknown-flag.txt');
    const r = classifyCliError('codex', { exit_code: 1, stderr_tail: claudeStderr });
    // codex's parse pattern is different — should fall through to exit_nonzero
    expect(r.reason).toBe('exit_nonzero');
  });

  it('codex stderr pattern does not match against gemini CLI', async () => {
    const codexStderr = await fixture('codex', 'parse-unknown-flag.txt');
    const r = classifyCliError('gemini', { exit_code: 2, stderr_tail: codexStderr });
    expect(r.reason).toBe('exit_nonzero');
  });
});

// ---------------------------------------------------------------------------
// Catalogue introspection — makes the TODO visible in CI
// ---------------------------------------------------------------------------

describe('cli-errors catalogue coverage', () => {
  it('exposes patterns for all three CLIs', () => {
    expect(Object.keys(CLI_ERROR_PATTERNS).sort()).toEqual(['claude', 'codex', 'gemini']);
  });

  it('auth and rate_limit are explicitly UNCATALOGUED (M8 blocker)', () => {
    expect(UNCATALOGUED_REASONS).toEqual(['auth', 'rate_limit']);
    for (const cli of Object.keys(CLI_ERROR_PATTERNS) as CliName[]) {
      const reasons = CLI_ERROR_PATTERNS[cli].map((p) => p.reason);
      expect(reasons).not.toContain('auth');
      expect(reasons).not.toContain('rate_limit');
    }
  });

  it('every pattern has a non-empty id', () => {
    for (const cli of Object.keys(CLI_ERROR_PATTERNS) as CliName[]) {
      for (const p of CLI_ERROR_PATTERNS[cli]) {
        expect(p.id).toMatch(/.+/);
      }
    }
  });

  it('every pattern belongs to a declared stream', () => {
    for (const cli of Object.keys(CLI_ERROR_PATTERNS) as CliName[]) {
      for (const p of CLI_ERROR_PATTERNS[cli]) {
        expect(['stdout', 'stderr']).toContain(p.stream);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tail truncation — dispatcher will pass ~4KB buffers
// ---------------------------------------------------------------------------

describe('classifyCliError — tail truncation invariants', () => {
  it('handles 4KB stderr without crashing', () => {
    const big = 'a'.repeat(4096) + '\nerror: unknown option';
    const r = classifyCliError('claude', { exit_code: 1, stderr_tail: big });
    expect(r.reason).toBe('parse');
  });

  it('match snippet is truncated to 200 chars', () => {
    const big = 'error: unknown option ' + 'X'.repeat(5000);
    const r = classifyCliError('claude', { exit_code: 1, stderr_tail: big });
    expect(r.match?.length ?? 0).toBeLessThanOrEqual(201); // 200 + ellipsis
  });
});
