# CLI dispatch quirks

One-page characterization of the three council-dispatch targets — `claude`,
`codex`, `gemini`. Originally captured during the M7 spike on a Linux/WSL2
workstation; revised as `auth` patterns landed during the v0.1 GA dogfood.

Probes covered: success calls, parse errors, bad-model errors, synthetic
SIGTERM timeout, real `auth` failure (claude). `rate_limit` fixtures still
require an opportunistic capture — safely inducing them burns budget.

Patterns live in `packages/core/src/cli-errors.ts`. Golden fixtures are
at `packages/core/test/fixtures/cli-{characterization,errors}/`.

## Versions (pinned during initial capture)

| CLI | Version | Invocation |
|---|---|---|
| claude | 2.1.117 (Claude Code) | `claude -p --output-format=json --model=... [prompt]` |
| codex | codex-cli 0.121–0.125 | `codex exec --json [--skip-git-repo-check] [prompt]` |
| gemini | 0.36.0 | `gemini -p [prompt] -o json -m <model>` |

The dispatcher logs `<cli> --version` into `ideas_council_views.model_version`
on each run; min-version pinning is on the v0.3+ roadmap.

## Prompt-input mechanism

| CLI | Mechanism | Notes |
|---|---|---|
| claude | `-p <prompt>` positional, OR piped stdin | `-p`/`--print` required for non-interactive. Stdin works without a flag. |
| codex | `codex exec <prompt>` positional, OR `-` + stdin, OR piped stdin appended as `<stdin>` block | `exec` subcommand is the non-interactive form. Top-level `codex [prompt]` is interactive. |
| gemini | `-p <prompt>` + optional appended stdin | `--prompt` accepts the primary prompt; stdin is concatenated if piped. |

**Hard constraint for `ideas_dispatches.argv`:** prompts route via
`child.stdin.write()` + `child.stdin.end()`, NOT via argv. The safety-approval
spec says "No secrets in argv" and the audit-log should not carry user idea
text. All three CLIs accept stdin-only prompts cleanly.

## Stdin termination (important!)

**Codex reads stdin even when the prompt is on argv** and will hang until
stdin is closed. Observed stderr note: `"Reading additional input from
stdin..."`. The dispatcher must:

```ts
child.stdin.end();   // always, even if no prompt written
```

Claude and gemini are stdin-agnostic when the prompt is on argv, but
closing stdin is harmless.

## Stdout JSON schemas (three completely different shapes)

### claude `--output-format=json`

Single JSON **array** of event objects. Events include `{type:"system", subtype:"init"}`, one or more `{type:"assistant", message:{...}}`, optional `{type:"rate_limit_event"}`, terminal `{type:"result", result:"<text>", ...}`. The `result` string on the final event is the model's final output text. Fixture: `packages/core/test/fixtures/cli-characterization/claude-success.json`.

Parser: wait until process closes, `JSON.parse(stdout)`, `.findLast(e => e.type === 'result').result`.

### codex `exec --json`

**JSONL** (newline-delimited JSON). Events observed: `thread.started`, `turn.started`, `item.completed` (with `{id, type:"agent_message", text:"..."}`), `turn.completed` (with `usage`). On failure: `error` event + `turn.failed` with nested stringified-JSON error. Fixture: `codex-success.jsonl`.

Parser: stream-split by newline, JSON.parse each line. Final `agent_message.text` is the model output. `turn.failed` indicates failure even before process exits.

### gemini `-o json`

Single JSON **object** at end of output: `{session_id, response, stats: {models: {...}}}`. `response` is the output text. Fixture: `gemini-success.json`.

Parser: `JSON.parse(stdout)`, `.response`.

## Where errors surface (stdout vs stderr)

| CLI | Parse errors | Bad-model | Auth errors |
|---|---|---|---|
| claude | **stderr** (`error: unknown option`) | **stdout** (`There's an issue with the selected model...`) | **stdout** (`"Not logged in · Please run /login"`, `"error": "authentication_failed"`) — captured during v0.1 GA dogfood ([`docs/dogfood-v0.1-ga.md`](./dogfood-v0.1-ga.md)) |
| codex | **stderr** (`error: unexpected argument`) | **stdout** JSONL (`turn.failed` + nested `invalid_request_error`) | not yet captured |
| gemini | **stderr** (`Unknown arguments:`) | not yet captured | not yet captured |

**Observation:** claude emits user-facing runtime errors to **stdout** where
stderr is empty (exit 1 but nothing on stderr). The classifier in
`cli-errors.ts` reads both streams.

## Exit codes

- claude: 0 on success, 1 on runtime error, 1 on unknown-option
- codex: 0 on success, 1 on runtime error, **2 on clap arg-parse failure**
- gemini: 0 on success, 1 on arg-parse failure

`signal === 'SIGTERM' | 'SIGKILL'` is the authoritative timeout signal —
all three CLIs die silently when SIGTERMed mid-call (no farewell stderr).
Dispatcher sets `was_killed_by_dispatcher: true` before the PGID-kill; the
classifier honors that flag first.

## Auth story

All three use credentials out-of-band — not argv, not env-var-first:
- **claude**: OAuth via `claude login` (primary), `ANTHROPIC_API_KEY` fallback in `--bare` mode
- **codex**: OAuth via `codex login` (ChatGPT account)
- **gemini**: OAuth; stores in libsecret / file-keychain fallback

Flywheel-ideas does **not** manage credentials — each CLI's existing auth
is the source of truth. If auth fails, that's the user's problem surfaced
via the `auth` FailureReason (captured during the v0.1 GA dogfood for
claude; codex / gemini patterns still pending).

## Benign stderr noise to ignore

- `"Shell cwd was reset to ..."` — shell hook artifact, present on every
  invocation in this environment
- `"Keychain initialization encountered an error: libsecret-1.so.0..."` —
  gemini falls back to file-keychain on Linux without libsecret
- `"Using FileKeychain fallback for secure storage."` — gemini benign
- `"Loaded cached credentials."` — gemini benign

The dispatcher's stderr-tail capture strips these before matching the
pattern catalogue (`BENIGN_STDERR_PATTERNS` in `cli-errors.ts`); raw
stderr is preserved in `ideas_council_views.stderr_tail` for audit.

## Flag choices for council cells

Dispatcher invocations:

```
claude --bare -p --output-format=json --model=<model> --no-session-persistence
codex exec --json --skip-git-repo-check --ephemeral --model <model>
gemini -p -o json -m <model>
```

Rationale:
- **claude `--bare`**: skips hooks, plugins, auto-memory, CLAUDE.md
  discovery. Exactly what we want for a scoped council cell — no ambient
  context bleed from the operator's shell.
- **codex `--ephemeral`**: don't persist session files to disk; reduces
  audit-trail noise. `--skip-git-repo-check` lets the dispatcher run
  outside a git repo (the vault isn't one).
- **gemini `-o json`**: structured output. `-y`/`--yolo` (auto-approve all)
  MUST NOT be set — council cells should not execute tool calls.

### Codex model gotcha (codex 0.125+)

**Codex 0.125 added a server-side allowlist on ChatGPT-account auth.** The
dispatcher's default model (`gpt-5-codex`, set via `FLYWHEEL_IDEAS_CODEX_MODEL`)
is rejected with:

```
{"type":"error","status":400,"error":{"type":"invalid_request_error",
 "message":"The 'gpt-5-codex' model is not supported when using Codex with
 a ChatGPT account."}}
```

Probed during the Phase 3 wedge runs (2026-04-27): `gpt-5-codex`, `gpt-5`,
`gpt-5-mini`, `gpt-4o`, `gpt-4o-mini`, `o4-mini`, `codex-mini` are all
rejected. **`gpt-5.4` works** (it's the model the user's `~/.codex/config.toml`
specifies as the interactive default; the server-side allowlist permits the
account's negotiated model).

Workaround for council runs:

```bash
FLYWHEEL_IDEAS_CODEX_MODEL=gpt-5.4 \
  npx -y @velvetmonkey/flywheel-ideas
```

Or inspect your codex config to find the model your account is paired with:
`grep ^model ~/.codex/config.toml`.

For API-key-auth users (paid OpenAI API), the original `gpt-5-codex` default
should still work — the allowlist only applies to ChatGPT-account-auth.

### Subscription auth opt-in (alpha.8)

`FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1` flips the claude argv: drops
`--bare` so claude inherits the user's Claude Code CLI subscription auth
instead of requiring `ANTHROPIC_API_KEY`. Trade-off:

- **Default (unset / `0`)**: hermetic. `--bare` strips hooks, plugins,
  CLAUDE.md, MCP autoload. Fast cold start, billed against the API key.
- **`=1`**: subscription-billed. Each spawn loads the user's MCP / plugin
  config, so cold-start gets noticeably slower (plugin discovery on each
  cell). Useful when running large pilots without burning API budget.

Used during the v0.2 cite-rate pilot (50 sessions × 4 cells × 2 passes ≈
400 dispatches) so the spend went against the operator's existing Claude
Code subscription.

## Known gaps

1. **codex / gemini auth regex** — claude's `auth` pattern landed during
   the v0.1 GA dogfood; codex and gemini still need real-failure capture.
2. **Rate-limit failure regex** — all three surface these when quota is
   exhausted, but probing from within the normal dispatch path burns
   budget. Capture opportunistically during pilot runs.
3. **Gemini bad-model fixture** — never captured. Add when a real failure
   surfaces.
4. **Stdout-buffering max for claude** — claude's success JSON is ~5KB
   for a trivial prompt (mostly cache-creation telemetry). A 15-min cell
   with longer output could exceed expected buffer sizes. The dispatcher
   already sets `FLYWHEEL_IDEAS_MAX_BUFFER_BYTES` (default 4 MB).
5. **Version-drift tests** — CI should fail if any CLI's stderr format
   changes in a way that breaks the catalogue. Currently no automated
   detection — relies on dogfood / pilot runs to surface drift.

## References

- Spec: `~/obsidian/Ben/tech/flywheel/flywheel-ideas/council-implementation.md`
  (matrix, two-pass metacognitive structure, failure taxonomy)
- Code: `packages/core/src/cli-errors.ts` + tests
- Fixtures: `packages/core/test/fixtures/cli-{characterization,errors}/`

---

*Last updated: 2026-04-26.*
