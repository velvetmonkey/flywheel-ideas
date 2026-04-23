/**
 * path-security tests — focus on the symlink-composed-sensitive-target bypass
 * surfaced by gemini-2.5-pro in the alpha.3 codebase roundtable, plus a
 * trailing-slash equivalence check requested in the alpha.4 plan.
 *
 * The validatePathSecure surface has implicit coverage via patchFrontmatter +
 * direct-fs tests, but the not-yet-exists branch (where the bypass lived)
 * needs targeted coverage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  isSensitivePath,
  isWithinDirectory,
  sanitizeNotePath,
  validatePathSecure,
} from '../src/write/path-security.js';

let vault: string;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-pathsec-'));
});

afterEach(async () => {
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('validatePathSecure — symlink-composed sensitive target (gemini CRIT)', () => {
  it('blocks writes through a directory symlink that resolves to a sensitive ancestor (.git)', async () => {
    // Create the sensitive directory the attacker wants to write into
    await fsp.mkdir(path.join(vault, '.git'));
    // Create a symlink that resolves to .git but has an innocent-looking name
    await fsp.symlink(path.join(vault, '.git'), path.join(vault, 'foo'));

    // Attempt to write to vault/foo/config — pre-fix, this would be allowed
    // because the original relative path "foo/config" doesn't match `.git/config`.
    const result = await validatePathSecure(vault, 'foo/config');

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/symlink-composed target is a sensitive file/i);
  });

  it('blocks writes to .ssh/id_rsa via a symlinked ancestor', async () => {
    await fsp.mkdir(path.join(vault, '.ssh'));
    await fsp.symlink(path.join(vault, '.ssh'), path.join(vault, 'config-dir'));

    const result = await validatePathSecure(vault, 'config-dir/id_rsa');

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/sensitive/i);
  });

  it('still allows ordinary writes through a benign directory symlink', async () => {
    await fsp.mkdir(path.join(vault, 'real-notes'));
    await fsp.symlink(path.join(vault, 'real-notes'), path.join(vault, 'aliased-notes'));

    const result = await validatePathSecure(vault, 'aliased-notes/idea-001.md');

    expect(result.valid).toBe(true);
  });

  it('still blocks the original symlink-target-outside-vault check', async () => {
    await fsp.symlink(os.tmpdir(), path.join(vault, 'escape'));

    const result = await validatePathSecure(vault, 'escape/secret.md');

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/outside vault/i);
  });
});

describe('validatePathSecure — trailing-slash equivalence (alpha.4 plan)', () => {
  it('treats `foo/config` and `foo/config/` consistently when the symlink bypass would apply', async () => {
    await fsp.mkdir(path.join(vault, '.git'));
    await fsp.symlink(path.join(vault, '.git'), path.join(vault, 'foo'));

    const a = await validatePathSecure(vault, 'foo/config');
    const b = await validatePathSecure(vault, 'foo/config/');

    expect(a.valid).toBe(false);
    expect(b.valid).toBe(false);
  });
});

describe('isSensitivePath — direct unit', () => {
  it.each([
    '.git/config',
    '.git/credentials',
    '.ssh/config',
    '.ssh/id_rsa',
    '.aws/credentials',
    '.npmrc',
    '.env',
    '.env.local',
    'shadow',
  ])('blocks %s', (p) => {
    expect(isSensitivePath(p)).toBe(true);
  });

  it.each([
    'ideas/2026/04/something.md',
    'assumptions/some-claim.md',
    'outcomes/result.md',
  ])('allows %s', (p) => {
    expect(isSensitivePath(p)).toBe(false);
  });
});

describe('isWithinDirectory — sibling-prefix attack', () => {
  it('rejects sibling-directory prefix attacks (vault vs vault-sibling)', () => {
    expect(isWithinDirectory('/tmp/vault-sibling/file', '/tmp/vault')).toBe(false);
  });

  it('accepts a real child', () => {
    expect(isWithinDirectory('/tmp/vault/sub/file', '/tmp/vault')).toBe(true);
  });

  it('accepts the parent itself when allowEqual is true', () => {
    expect(isWithinDirectory('/tmp/vault', '/tmp/vault', true)).toBe(true);
  });

  it('rejects the parent itself when allowEqual is false', () => {
    expect(isWithinDirectory('/tmp/vault', '/tmp/vault', false)).toBe(false);
  });
});

describe('sanitizeNotePath — basic sanity (lightweight)', () => {
  it('lowercases + hyphenates spaces', () => {
    expect(sanitizeNotePath('My Note Title.md')).toBe('my-note-title.md');
  });

  it('strips problematic characters', () => {
    expect(sanitizeNotePath('what?*<>|.md')).toBe('what.md');
  });

  it('preserves directory segments', () => {
    expect(sanitizeNotePath('ideas/2026/My Idea.md')).toBe('ideas/2026/my-idea.md');
  });
});
