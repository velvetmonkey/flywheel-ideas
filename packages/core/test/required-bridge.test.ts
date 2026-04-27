/**
 * Unit tests for v0.4.0 required-bridge wiring.
 *
 * Asserts:
 *  - `isTestMode()` reflects the FLYWHEEL_IDEAS_TEST_MODE env var
 *  - `FlywheelMemoryRequiredError` renders the right operator-facing message
 *    for each failure kind
 *
 * The end-to-end "production hard-fail" assertion lives in
 * `packages/mcp-server/test/server-startup.test.ts` (it requires the bundled
 * dist binary).
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  FlywheelMemoryRequiredError,
  isTestMode,
  TEST_MODE_ENV_VAR,
} from '../src/index.js';

const SAVED_TEST_MODE = process.env[TEST_MODE_ENV_VAR];

afterEach(() => {
  if (SAVED_TEST_MODE === undefined) delete process.env[TEST_MODE_ENV_VAR];
  else process.env[TEST_MODE_ENV_VAR] = SAVED_TEST_MODE;
});

describe('isTestMode', () => {
  it('returns true when env var is "1"', () => {
    process.env[TEST_MODE_ENV_VAR] = '1';
    expect(isTestMode()).toBe(true);
  });

  it('returns false when env var is unset', () => {
    delete process.env[TEST_MODE_ENV_VAR];
    expect(isTestMode()).toBe(false);
  });

  it('returns false for any non-"1" value', () => {
    process.env[TEST_MODE_ENV_VAR] = 'true';
    expect(isTestMode()).toBe(false);
    process.env[TEST_MODE_ENV_VAR] = 'yes';
    expect(isTestMode()).toBe(false);
    process.env[TEST_MODE_ENV_VAR] = '';
    expect(isTestMode()).toBe(false);
  });
});

describe('FlywheelMemoryRequiredError messages', () => {
  it('binary_not_found surfaces the install command', () => {
    const err = new FlywheelMemoryRequiredError({
      kind: 'binary_not_found',
      binary: '/nonexistent/flywheel-memory',
    });
    expect(err.message).toContain('npm install -g @velvetmonkey/flywheel-memory');
    expect(err.message).toContain('/nonexistent/flywheel-memory');
    expect(err.kind).toBe('binary_not_found');
  });

  it('timeout surfaces the timeout-bump env var', () => {
    const err = new FlywheelMemoryRequiredError({
      kind: 'timeout',
      binary: 'flywheel-memory',
      timeoutMs: 60000,
    });
    expect(err.message).toContain('FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS');
    expect(err.message).toContain('60000ms');
  });

  it('spawn_failed points at the issue tracker', () => {
    const err = new FlywheelMemoryRequiredError({
      kind: 'spawn_failed',
      binary: 'flywheel-memory',
      detail: 'EAGAIN',
    });
    expect(err.message).toContain('Spawn failed');
    expect(err.message).toContain('EAGAIN');
    expect(err.message).toContain('issues');
  });

  it('tools_missing recommends a version upgrade', () => {
    const err = new FlywheelMemoryRequiredError({
      kind: 'tools_missing',
      binary: 'flywheel-memory',
      detail: 'expected note + vault_update_frontmatter',
    });
    expect(err.message).toContain('>=0.6.0');
    expect(err.message).toContain('--version');
  });

  it('serializes well — name set, instanceof works', () => {
    const err = new FlywheelMemoryRequiredError({
      kind: 'binary_not_found',
      binary: 'flywheel-memory',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FlywheelMemoryRequiredError);
    expect(err.name).toBe('FlywheelMemoryRequiredError');
  });
});
