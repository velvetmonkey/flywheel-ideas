/**
 * cli-version — direct tests for probeCliVersion (alpha.5 fix D).
 *
 * Uses node itself as the "CLI" — `node --version` always emits a parseable
 * semver line. No external CLI deps. The mock-CLI fixtures (mock-claude.mjs
 * etc.) don't implement --version so we can't reuse them here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { probeCliVersion, clearVersionCache } from '../src/cli-version.js';

beforeEach(() => {
  clearVersionCache();
  delete process.env.FLYWHEEL_IDEAS_NO_VERSION_PROBE;
});

afterEach(() => {
  clearVersionCache();
});

describe('probeCliVersion', () => {
  it('parses a real CLI version (using `node --version` as a stand-in)', async () => {
    // node --version → "vX.Y.Z\n". Our regex strips the leading "v" by
    // anchoring on the first \d so we should pull X.Y.Z.
    const v = await probeCliVersion('claude' as const, { binary: 'node' });
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('caches by CLI name — second call does not re-spawn', async () => {
    const v1 = await probeCliVersion('claude' as const, { binary: 'node' });
    expect(v1).toMatch(/^\d+\.\d+\.\d+/);

    // Mutate the cached promise via the public API: a second call should
    // return the same value without invoking spawn again. Detect that by
    // pointing the second call at a non-existent binary — a fresh probe
    // would return null; a cache hit returns the original value.
    const v2 = await probeCliVersion('claude' as const, { binary: '/nonexistent/binary' });
    expect(v2).toBe(v1);
  });

  it('returns null on binary_not_found', async () => {
    const v = await probeCliVersion('codex' as const, { binary: '/nonexistent/binary' });
    expect(v).toBeNull();
  });

  it('returns null on timeout (mock CLI that ignores --version + hangs)', async () => {
    // Use `sleep 5` as a "CLI" that won't respond to --version within timeout.
    // tightTimeoutMs forces a quick failure so the test stays fast.
    const start = Date.now();
    const v = await probeCliVersion('gemini' as const, {
      binary: 'sleep',
      timeoutMs: 200,
    });
    const elapsed = Date.now() - start;
    expect(v).toBeNull();
    // Sanity: didn't actually wait the default 3s
    expect(elapsed).toBeLessThan(1500);
  }, 5_000);

  it('respects FLYWHEEL_IDEAS_NO_VERSION_PROBE=1 (no spawn, returns null)', async () => {
    process.env.FLYWHEEL_IDEAS_NO_VERSION_PROBE = '1';
    const v = await probeCliVersion('claude' as const, { binary: 'node' });
    expect(v).toBeNull();
  });

  it('clearVersionCache empties the cache', async () => {
    const v1 = await probeCliVersion('claude' as const, { binary: 'node' });
    expect(v1).toMatch(/^\d+\.\d+/);
    clearVersionCache();
    // After clearing, a probe at a bad binary should genuinely fail
    // (vs returning the cached value).
    const v2 = await probeCliVersion('claude' as const, { binary: '/nonexistent/binary' });
    expect(v2).toBeNull();
  });
});
