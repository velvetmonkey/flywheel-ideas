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
 * Categories `auth` and `rate_limit` were declared but uncatalogued through
 * v0.1.0 GA. v0.1.1 wires patterns for both, using a real captured
 * `claude` auth transcript from the GA dogfood (`docs/dogfood-v0.1-ga.md`)
 * for `claude-auth`; the other five (`codex`/`gemini` × `auth`/`rate_limit`,
 * plus `claude-rate-limit`) are synthesized from public CLI/API docs and
 * marked `SYNTHESIZED` in their fixture headers — replace when real
 * failures are captured during dogfood.
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
    {
      id: 'claude-auth-not-logged-in',
      reason: 'auth',
      stream: 'stdout',
      // Real GA-dogfood capture: stdout payload "Not logged in · Please run /login"
      // and the JSON-shaped "error": "authentication_failed" both appear in the same response.
      regex: /Not logged in[^\n]*Please run \/login|"error"\s*:\s*"authentication_failed"/,
    },
    {
      id: 'claude-rate-limit',
      reason: 'rate_limit',
      stream: 'stdout',
      // SYNTHESIZED 2026-04-24 from Anthropic API rate-limit error format.
      // Replace with real capture if/when one arrives.
      regex: /"type"\s*:\s*"rate_limit_error"|exceeded your[^\n]*rate limit/i,
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
    {
      id: 'codex-auth-turn-failed',
      reason: 'auth',
      stream: 'stdout',
      // SYNTHESIZED 2026-04-24 — codex turn.failed with authentication-error payload.
      // Real capture pending; format matches the observed turn.failed shape from M7.
      regex: /"type"\s*:\s*"turn\.failed"[^\n]*authentication/i,
    },
    {
      id: 'codex-rate-limit-turn-failed',
      reason: 'rate_limit',
      stream: 'stdout',
      // SYNTHESIZED 2026-04-24 — codex turn.failed with rate-limit payload.
      // Real capture pending.
      regex: /"type"\s*:\s*"turn\.failed"[^\n]*rate[_-]?limit/i,
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
    {
      id: 'gemini-auth-missing-key',
      reason: 'auth',
      stream: 'stderr',
      // SYNTHESIZED 2026-04-24 from Google AI Studio API + gemini-cli docs.
      // Real capture pending.
      regex: /API key not (?:valid|found)|GEMINI_API_KEY[^\n]*not set|PERMISSION_DENIED/i,
    },
    {
      id: 'gemini-rate-limit',
      reason: 'rate_limit',
      stream: 'stderr',
      // SYNTHESIZED 2026-04-24 from Google API quota/rate-limit error format.
      // Real capture pending.
      regex: /^.*429[^\n]*Too Many Requests|RESOURCE_EXHAUSTED|Quota exceeded/m,
    },
  ],
};

/**
 * Benign stderr lines to strip BEFORE regex classification (M10).
 *
 * M7 documented that gemini on Linux without libsecret emits keychain
 * warnings that are **not** auth failures — they're fallbacks to a file
 * keychain. Stripping them keeps the classifier from misreading them
 * OR (more dangerously) from letting a subsequent real auth error match
 * a pattern tuned for the benign prefix.
 *
 * Each pattern is a FULL-LINE regex anchored with `^` and `$` (via `/m` flag
 * at match time). Partial prefix matches are deliberately NOT used — a
 * prefix-strip of `/^Keychain initialization/` would hide a real failure
 * like `"Keychain initialization failed: API key not found"`.
 */
export const BENIGN_STDERR_PATTERNS: readonly RegExp[] = [
  // gemini on Linux without libsecret — known exact line
  /^Keychain initialization encountered an error: libsecret-1\.so\.0: cannot open shared object file: No such file or directory$/m,
  // gemini fallback note after the keychain warning
  /^Using FileKeychain fallback for secure storage\.$/m,
  // gemini credentials load message
  /^Loaded cached credentials\.$/m,
  // shell hook artifact on this workstation (all three CLIs)
  /^Shell cwd was reset to .+$/m,
];

/**
 * Strip benign lines from a stderr buffer, returning only the lines the
 * classifier should scan. Exported for test assertions.
 */
export function stripBenignStderr(stderr: string): string {
  if (!stderr) return stderr;
  const lines = stderr.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();
    const isBenign = BENIGN_STDERR_PATTERNS.some((re) => re.test(trimmed));
    if (!isBenign) kept.push(line);
  }
  return kept.join('\n');
}

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
  // Strip benign lines (keychain warnings, cwd resets) before pattern
  // matching so the real classifier isn't fooled by noise.
  const stderr = stripBenignStderr(ctx.stderr_tail ?? '');

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
 * Empty as of v0.1.1 — `auth` and `rate_limit` are now wired (claude-auth
 * from real dogfood capture; the other five from public-docs synthesis,
 * marked in fixture headers). The test suite asserts this list so any
 * regression is visible in CI output.
 */
export const UNCATALOGUED_REASONS: readonly FailureReason[] = [];
