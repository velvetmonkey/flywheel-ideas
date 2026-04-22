# CLI Quirks (M7 spike output)

One-page characterization of the three council-dispatch targets — `claude`,
`codex`, `gemini`. Captured on a Linux/WSL2 workstation against current
CLI versions (see table) with responsibly-bounded probes (success calls,
parse errors, bad-model errors, synthetic SIGTERM timeout). Auth and
rate-limit fixtures are intentionally omitted — safely inducing them
requires either staging-account credentials or the user's own capture
(see "Gaps" at the bottom).

Patterns live in `packages/core/src/cli-errors.ts`. Golden fixtures are
at `packages/core/test/fixtures/cli-{characterization,errors}/`.

## Versions (pinned during M7 capture)

| CLI | Version | Invocation |
|---|---|---|
| claude | 2.1.117 (Claude Code) | `claude -p --output-format=json --model=... [prompt]` |
| codex | codex-cli 0.121.0 | `codex exec --json [--skip-git-repo-check] [prompt]` |
| gemini | 0.36.0 | `gemini -p [prompt] -o json -m <model>` |

M8 dispatcher should pin min-versions (e.g. claude ≥ 2.1.x) and log
`<cli> --version` into `ideas_council_views.model_version` on each run.

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
stdin..."`. M8 dispatcher must:

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
| claude | **stderr** (`error: unknown option`) | **stdout** (`There's an issue with the selected model...`) | TODO M8 — not captured |
| codex | **stderr** (`error: unexpected argument`) | **stdout** JSONL (`turn.failed` + nested `invalid_request_error`) | TODO M8 |
| gemini | **stderr** (`Unknown arguments:`) | TODO M8 (probe blocked) | TODO M8 |

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
via the `auth` FailureReason (catalogued in M8).

## Benign stderr noise to ignore

- `"Shell cwd was reset to ..."` — shell hook artifact, present on every
  invocation in this environment
- `"Keychain initialization encountered an error: libsecret-1.so.0..."` —
  gemini falls back to file-keychain on Linux without libsecret
- `"Using FileKeychain fallback for secure storage."` — gemini benign
- `"Loaded cached credentials."` — gemini benign

M8's stderr-tail capture should strip these before matching the pattern
catalogue, or the catalogue should be tolerant.

## Flag choices for council cells (M8)

Recommended invocations for M8 dispatcher:

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

## Gaps (M8 must close)

1. **Auth failure regex** for all three CLIs. Capture by revoking/expiring
   credentials on a staging account, or by user-provided fixtures.
2. **Rate-limit failure regex** — all three surface these when quota is
   exhausted, but probing from within the normal dispatch path burns
   budget. Capture opportunistically during M8 dogfooding; catalogue grows.
3. **Gemini bad-model fixture** — blocked at M7 capture. Fill during M8.
4. **Stdout-buffering max for claude** — claude's success JSON is ~5KB
   for a trivial prompt (mostly cache-creation telemetry). A 15-min cell
   with longer output could exceed expected buffer sizes. M8 should set
   explicit maxBuffer on the spawn.
5. **Version-drift tests** — CI should fail if any CLI's stderr format
   changes in a way that breaks the catalogue. Consider a manual
   integration test job (not in default CI — needs credentials) that
   runs `<cli> --help` against the live binary and asserts known flags
   still exist.

## References

- Spec: `~/obsidian/Ben/tech/flywheel/flywheel-ideas/council-implementation.md`
  (matrix, two-pass metacognitive structure, failure taxonomy)
- Code: `packages/core/src/cli-errors.ts` + tests
- Fixtures: `packages/core/test/fixtures/cli-{characterization,errors}/`
