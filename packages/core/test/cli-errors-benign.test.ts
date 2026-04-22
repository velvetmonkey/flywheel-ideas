import { describe, it, expect } from 'vitest';
import {
  BENIGN_STDERR_PATTERNS,
  classifyCliError,
  stripBenignStderr,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// stripBenignStderr
// ---------------------------------------------------------------------------

describe('stripBenignStderr', () => {
  it('strips gemini libsecret keychain warning', () => {
    const input =
      'Keychain initialization encountered an error: libsecret-1.so.0: cannot open shared object file: No such file or directory';
    expect(stripBenignStderr(input)).toBe('');
  });

  it('strips FileKeychain fallback line', () => {
    expect(stripBenignStderr('Using FileKeychain fallback for secure storage.')).toBe('');
  });

  it('strips "Loaded cached credentials." line', () => {
    expect(stripBenignStderr('Loaded cached credentials.')).toBe('');
  });

  it('strips "Shell cwd was reset" artifact', () => {
    expect(stripBenignStderr('Shell cwd was reset to /home/ben/src')).toBe('');
  });

  it('strips all three gemini benign lines in sequence, preserves real content', () => {
    const stderr = [
      'Keychain initialization encountered an error: libsecret-1.so.0: cannot open shared object file: No such file or directory',
      'Using FileKeychain fallback for secure storage.',
      'Loaded cached credentials.',
      'Real error: something broke',
    ].join('\n');
    const result = stripBenignStderr(stderr);
    expect(result).toBe('Real error: something broke');
  });

  it('CRITICAL — does NOT strip a real auth failure that LOOKS similar', () => {
    // A real auth failure that begins with the same prefix should NOT be
    // swallowed by the benign filter. This is the gemini-review CRITICAL fix.
    const real =
      'Keychain initialization failed: API key not found — please run `gemini login`';
    expect(stripBenignStderr(real)).toBe(real);
  });

  it('does NOT strip partial-match of benign patterns', () => {
    // The libsecret regex requires full-line match. Variations like changed
    // error-class strings or different shared-object filenames should fall
    // through for classification.
    expect(
      stripBenignStderr('Keychain initialization encountered an error: different-library.so'),
    ).toBe('Keychain initialization encountered an error: different-library.so');
    expect(stripBenignStderr('Using FileKeychain fallback for secure storage.extra')).toBe(
      'Using FileKeychain fallback for secure storage.extra',
    );
  });

  it('empty string in → empty string out', () => {
    expect(stripBenignStderr('')).toBe('');
  });

  it('preserves line ordering when some lines are stripped', () => {
    const stderr = [
      'first real line',
      'Loaded cached credentials.',
      'second real line',
      'Shell cwd was reset to /tmp',
      'third real line',
    ].join('\n');
    expect(stripBenignStderr(stderr)).toBe(
      ['first real line', 'second real line', 'third real line'].join('\n'),
    );
  });
});

// ---------------------------------------------------------------------------
// BENIGN_STDERR_PATTERNS — exposed for tests
// ---------------------------------------------------------------------------

describe('BENIGN_STDERR_PATTERNS catalogue', () => {
  it('exports 4 patterns in M10 initial catalogue', () => {
    expect(BENIGN_STDERR_PATTERNS).toHaveLength(4);
  });

  it('every pattern is anchored (^ ... $)', () => {
    for (const p of BENIGN_STDERR_PATTERNS) {
      expect(p.source.startsWith('^')).toBe(true);
      expect(p.source.endsWith('$')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// classifyCliError now strips benign stderr BEFORE matching
// ---------------------------------------------------------------------------

describe('classifyCliError — with benign-stderr filter', () => {
  it('benign stderr is ignored; unknown-exit-0 stays unknown', () => {
    const stderr = 'Keychain initialization encountered an error: libsecret-1.so.0: cannot open shared object file: No such file or directory';
    const r = classifyCliError('gemini', { exit_code: 0, stderr_tail: stderr });
    expect(r.reason).toBe('unknown');
  });

  it('real failure pattern still matches when benign lines precede it', () => {
    // yargs parse error wrapped by the shell-cwd reset artifact
    const stderr = ['Shell cwd was reset to /home/ben/src', 'Unknown arguments: bogus-flag'].join(
      '\n',
    );
    const r = classifyCliError('gemini', { exit_code: 1, stderr_tail: stderr });
    expect(r.reason).toBe('parse');
  });

  it('benign-looking-but-real failure is NOT misread', () => {
    const stderr = 'Keychain initialization failed: API key not found';
    const r = classifyCliError('gemini', { exit_code: 1, stderr_tail: stderr });
    // Would be exit_nonzero (no pattern hits); would NOT be silently swept
    // to unknown, which would happen if we'd used a prefix filter.
    expect(r.reason).toBe('exit_nonzero');
  });
});
