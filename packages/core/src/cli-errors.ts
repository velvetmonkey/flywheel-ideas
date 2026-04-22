/**
 * CLI error classification catalogue (M7 output).
 *
 * Given the exit code / signal / stdout-tail / stderr-tail of a finished
 * CLI child, return the failure category the M8 dispatcher persists in
 * `ideas_council_views.failure_reason`. Each (CLI, reason) tuple is backed
 * by a golden fixture at `packages/core/test/fixtures/cli-errors/<cli>/`
 * captured during the M7 spike.
 *
 * Spike notes (see `docs/cli-quirks.md`):
 *  - **claude** surfaces some user-facing errors (e.g. bad model) on
 *    **stdout**, not stderr. Classification must read both.
 *  - **codex** emits structured JSONL events to stdout even for failures
 *    (`turn.failed` with a nested stringified JSON error). Classify by
 *    event type, not plain regex.
 *  - **gemini** uses yargs and prefixes parse errors with
 *    `Unknown arguments:`.
 *
 * Categories `auth` and `rate_limit` are declared but have no patterns
 * wired yet — capturing real failures responsibly requires either a
 * staging account or the user copying stderr from their own CLI. The
 * dispatcher falls through to `unknown` with the stderr tail preserved;
 * M8 adds patterns as real failures accumulate.
 */

export type CliName = 'claude' | 'codex' | 'gemini';

export type FailureReason =
  | 'parse'
  | 'auth'
  | 'rate_limit'
  | 'bad_model'
  | 'timeout'
  | 'exit_nonzero'
  | 'unknown';

export interface CliErrorContext {
  exit_code: number | null;
  signal?: NodeJS.Signals | null;
  /** Last ~4KB of stdout; some CLIs (notably claude) surface errors here. */
  stdout_tail?: string;
  /** Last ~4KB of stderr. */
  stderr_tail?: string;
  /**
   * Dispatcher-side flag: our PGID-kill fired. Guaranteed `timeout` regardless
   * of what (if anything) the CLI wrote before dying.
   */
  was_killed_by_dispatcher?: boolean;
}

export interface CliErrorClassification {
  reason: FailureReason;
  /** Human-readable pattern id that fired (for audit + debugging). */
  pattern?: string;
  /** The substring that matched (truncated for logs). */
  match?: string;
}

interface Pattern {
  id: string;
  reason: FailureReason;
  stream: 'stdout' | 'stderr';
  regex: RegExp;
}

/**
 * Per-CLI pattern catalogue. Ordering within a CLI matters — first match wins.
 * Most specific patterns first. `unknown`/`exit_nonzero` are fallbacks applied
 * outside this table.
 */
const PATTERNS: Record<CliName, Pattern[]> = {
  claude: [
    {
      id: 'claude-parse-unknown-option',
      reason: 'parse',
      stream: 'stderr',
      // "error: unknown option '--foo'"
      regex: /^error:\s+unknown option/m,
    },
    {
      id: 'claude-bad-model-stdout',
      reason: 'bad_model',
      stream: 'stdout',
      // "There's an issue with the selected model (XYZ). It may not exist..."
      regex: /There's an issue with the selected model/,
    },
  ],
  codex: [
    {
      id: 'codex-parse-clap-unexpected',
      reason: 'parse',
      stream: 'stderr',
      // clap: "error: unexpected argument '--foo' found"
      regex: /^error:\s+unexpected argument/m,
    },
    {
      id: 'codex-bad-model-turn-failed',
      reason: 'bad_model',
      stream: 'stdout',
      // JSONL event: {"type":"turn.failed","error":{"message":"... invalid_request_error ... model ... not supported ..."}}
      regex: /"type":"turn\.failed"[^\n]*invalid_request_error[^\n]*model/,
    },
  ],
  gemini: [
    {
      id: 'gemini-parse-yargs-unknown-args',
      reason: 'parse',
      stream: 'stderr',
      // yargs: "Unknown arguments: foo, bar"
      regex: /^Unknown arguments:/m,
    },
    // TODO M8: bad-model probe was blocked during M7 capture.
  ],
};

/**
 * Classify the finished-child outcome into one of the FailureReason values.
 *
 * Precedence:
 *   1. Dispatcher-side kill flag → `timeout` (authoritative)
 *   2. Signal-based kill (SIGTERM/SIGKILL) → `timeout`
 *   3. Catalogued pattern match → its reason
 *   4. Non-zero exit without match → `exit_nonzero`
 *   5. Zero exit with no match → `unknown` (should be rare; caller typically
 *      doesn't classify zero-exit runs)
 */
export function classifyCliError(
  cli: CliName,
  ctx: CliErrorContext,
): CliErrorClassification {
  if (ctx.was_killed_by_dispatcher) {
    return { reason: 'timeout', pattern: 'dispatcher-killed' };
  }
  if (ctx.signal === 'SIGTERM' || ctx.signal === 'SIGKILL') {
    return { reason: 'timeout', pattern: `signal-${ctx.signal}` };
  }

  const patterns = PATTERNS[cli];
  const stdout = ctx.stdout_tail ?? '';
  const stderr = ctx.stderr_tail ?? '';

  for (const p of patterns) {
    const haystack = p.stream === 'stdout' ? stdout : stderr;
    const m = haystack.match(p.regex);
    if (m) {
      return {
        reason: p.reason,
        pattern: p.id,
        match: truncate(m[0], 200),
      };
    }
  }

  if (ctx.exit_code !== null && ctx.exit_code !== 0) {
    return { reason: 'exit_nonzero', pattern: `exit-${ctx.exit_code}` };
  }

  return { reason: 'unknown' };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/**
 * Expose the pattern catalogue for test assertions (golden-fixture coverage).
 * Not part of the runtime API — tests only.
 */
export const CLI_ERROR_PATTERNS: Readonly<Record<CliName, readonly Pattern[]>> =
  PATTERNS;

/**
 * Explicit list of categories that DO NOT yet have catalogued patterns.
 * M8 must add these before the dispatcher can distinguish auth/rate-limit
 * from generic `exit_nonzero`. The test suite asserts this list so the
 * TODO is visible in CI output.
 */
export const UNCATALOGUED_REASONS: readonly FailureReason[] = ['auth', 'rate_limit'];
