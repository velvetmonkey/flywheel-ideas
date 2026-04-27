/**
 * Test-mode gate.
 *
 * The hard-fail boot path skips the flywheel-memory bridge requirement only
 * when `FLYWHEEL_IDEAS_TEST_MODE=1`. This is a *purpose-built* env var (not
 * NODE_ENV) so production environments cannot accidentally inherit the
 * test-mode bypass from CI runners or dev shells.
 *
 * Set explicitly in vitest setup (`vitest.setup.ts`) — never set in shipped
 * environments. The single source of truth lives here so the test-mode check
 * doesn't get sprinkled across files with subtle drift.
 */

const TEST_MODE_ENV = 'FLYWHEEL_IDEAS_TEST_MODE';

export function isTestMode(): boolean {
  return process.env[TEST_MODE_ENV] === '1';
}

/**
 * The env var name. Exported so docs / error messages can reference it
 * without hard-coding the string in multiple places.
 */
export const TEST_MODE_ENV_VAR = TEST_MODE_ENV;
