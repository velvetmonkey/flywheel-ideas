/**
 * Vitest global setup — set FLYWHEEL_IDEAS_TEST_MODE=1 so the test-mode
 * gate (`isTestMode()`) returns true across every test in this package.
 *
 * Per Claude-mitigation #1 (v0.4.0 tightening): test-mode is a purpose-built
 * env var rather than NODE_ENV so production environments cannot accidentally
 * inherit the bypass from CI runners or dev shells.
 */

process.env.FLYWHEEL_IDEAS_TEST_MODE = '1';
