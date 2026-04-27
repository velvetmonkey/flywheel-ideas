/**
 * Shared error types for flywheel-ideas-core.
 *
 * `FlywheelMemoryRequiredError` is the boot-time hard-fail surfaced when the
 * flywheel-memory bridge is not reachable in production. The error message
 * branches by failure mode so the operator gets a single concrete next step
 * rather than a generic "something went wrong".
 */

export type RequiredBridgeFailureKind =
  | 'binary_not_found'
  | 'timeout'
  | 'spawn_failed'
  | 'tools_missing'
  | 'invalid_response'
  | 'tool_returned_error';

export interface RequiredBridgeFailure {
  kind: RequiredBridgeFailureKind;
  /** Resolved binary path (or 'flywheel-memory' if PATH-based). Always set. */
  binary: string;
  /** Probe / register timeout in ms. Set when `kind === 'timeout'`. */
  timeoutMs?: number;
  /** Free-form detail from the underlying probe outcome. */
  detail?: string;
}

export class FlywheelMemoryRequiredError extends Error {
  readonly kind: RequiredBridgeFailureKind;
  readonly binary: string;
  readonly timeoutMs?: number;
  readonly detail?: string;

  constructor(failure: RequiredBridgeFailure) {
    super(buildMessage(failure));
    this.name = 'FlywheelMemoryRequiredError';
    this.kind = failure.kind;
    this.binary = failure.binary;
    this.timeoutMs = failure.timeoutMs;
    this.detail = failure.detail;
  }
}

function buildMessage(failure: RequiredBridgeFailure): string {
  const header =
    'flywheel-ideas requires the @velvetmonkey/flywheel-memory peer to boot.';
  const detail = failure.detail ? ` (${failure.detail})` : '';
  switch (failure.kind) {
    case 'binary_not_found':
      return [
        header,
        `Resolved binary: ${failure.binary}${detail} — not found on PATH.`,
        'Install: `npm install -g @velvetmonkey/flywheel-memory`',
        'Or set FLYWHEEL_MEMORY_BIN=/absolute/path/to/flywheel-memory',
        'See docs/memory-bridge.md for setup.',
      ].join('\n');
    case 'timeout':
      return [
        header,
        `Bridge probe timed out after ${failure.timeoutMs}ms${detail}.`,
        'Cold-start init_semantic can exceed the default; bump the ceiling:',
        '  FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS=120000',
        'If the timeout persists, run flywheel-memory directly to inspect startup logs.',
      ].join('\n');
    case 'spawn_failed':
      return [
        header,
        `Spawn failed for ${failure.binary}${detail}.`,
        'The binary was located but the subprocess could not be started.',
        'Verify `flywheel-memory --help` runs in your shell. Capture stderr and file an issue at',
        '  https://github.com/velvetmonkey/flywheel-ideas/issues',
      ].join('\n');
    case 'tools_missing':
      return [
        header,
        `Bridge connected but does not expose the required tools${detail}.`,
        'flywheel-memory >=0.6.0 must be installed (the peerDep declared in package.json).',
        'Run `flywheel-memory --version` and upgrade if older than 0.6.0.',
      ].join('\n');
    case 'invalid_response':
      return [
        header,
        `Bridge returned an unexpected response${detail}.`,
        'Likely a version mismatch between flywheel-ideas and flywheel-memory.',
        'Upgrade both to their latest releases and retry.',
      ].join('\n');
    case 'tool_returned_error':
      return [
        header,
        `Bridge returned a tool error during startup${detail}.`,
        'Inspect flywheel-memory logs (run it directly to surface stderr).',
        'If reproducible, file an issue at https://github.com/velvetmonkey/flywheel-ideas/issues',
      ].join('\n');
  }
}
