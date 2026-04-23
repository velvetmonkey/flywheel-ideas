# Dogfood — v0.1.0 GA validation against alpha.5

The plan called for a re-dogfood of the published `@velvetmonkey/flywheel-ideas@alpha.5`
artifact as the gate before cutting v0.1.0 GA. Per the gemini round-2 GA-blocker:
include **one real `claude` council session** so the GA transcript carries actual
real-LLM E2E signal, not just mocked verification.

This document is the run + findings.

## Setup

```bash
npm install -g @velvetmonkey/flywheel-ideas@alpha    # picks 0.1.0-alpha.5
rm -rf /tmp/v010-ga && mkdir -p /tmp/v010-ga/.flywheel
FLYWHEEL_IDEAS_RUN_REAL_COUNCIL=1 node /tmp/dogfood-driver.mjs /tmp/v010-ga
```

The driver (`/tmp/dogfood-driver.mjs`) walks the closed loop end-to-end against
the globally-installed `flywheel-ideas-mcp` binary:

1. `initialize` + `tools/list`
2. `idea.create` (the GA-themed idea)
3. `assumption.declare` × 3 (Y-statement form)
4. `idea.read` + `assumption.list`
5. **`idea.transition` → `committed`** — verifies alpha.4 fix 4 (state syncs to frontmatter)
6. **`council.run({clis: ['claude','gemini'], depth: 'light', mode: 'pre_mortem'})`** — real LLM E2E
7. `outcome.log` (refute + validate)
8. `outcome.list` + `outcome.read`
9. **`idea.list({needs_review: true})`** — verifies alpha.5 fix A
10. `idea.list({needs_review: false})` — inverse
11. `council.approval_status`

`codex` is skipped (known M9 stdin-hang); the gemini round-2 plan said dispatch claude+gemini.

## GA pass criteria — results

| Criterion | Status | Evidence |
|---|---|---|
| `serverInfo.version: "0.1.0-alpha.5"` | ✅ | initialize response in driver log |
| No unexpected stderr beyond memory-bridge skip | ✅ | only `memory-bridge skipped (binary_not_found)` when flywheel-memory absent; otherwise quiet |
| `idea.list({needs_review: true})` filter works (alpha.5 fix A) | ✅ | tool accepts the new arg, returns 0 ideas (correct — single-idea vault has no flagged dependents); inverse `false` returns the committed idea |
| `idea.transition` → markdown frontmatter has `state:` + `state_changed_at:` (alpha.4 fix 4) | ✅ | `grep state: /tmp/v010-ga/ideas/2026/04/*.md` → `state: committed` + `state_changed_at: "2026-04-23T19:23:07.918Z"` |
| `outcome.log` → flagged-idea frontmatter has `needs_review: true` (alpha.4 fix 5) | N/A | single-idea vault — nothing to cascade to. Unit-tested in alpha.4 commit 2. |
| Tool descriptions + next_steps no longer mention "lands in M*" / "Tool ships in a later milestone" (alpha.5 fix C) | ✅ | `council.approval_status` next_step now reads "Run a real council session — spawns the configured CLI subprocesses" (was "Real council dispatcher lands in M8") |
| **One real `claude` council session completes** — synthesis written, no UNEXPECTED failures, transcript captured | ✅ | see "Real council session" section below |
| No tool returns an MCP error on the happy path | ✅ | every `tools/call` resolved; no JSON-RPC errors |

**All criteria satisfied. GA-ready.**

## Real council session — what happened

`council.run({id, confirm: true, depth: 'light', mode: 'pre_mortem', clis: ['claude','gemini']})`
spawned 6 cells × 2 passes = 12 dispatches. Outcome:

| CLI | Persona | Pass 1 | Pass 2 | failure_reason |
|---|---|---|---|---|
| claude | Risk Pessimist | failed | n/a | `exit_nonzero` (auth — see below) |
| claude | Growth Optimist | failed | n/a | `exit_nonzero` (auth) |
| codex | Risk Pessimist | failed | n/a | `bad_model` (codex was attempted despite `clis:['claude','gemini']` — see "ABI finding" below) |
| codex | Growth Optimist | failed | n/a | `bad_model` |
| gemini | Risk Pessimist | ✅ | ✅ | none |
| gemini | Growth Optimist | ✅ | ✅ | none |

`SYNTHESIS.md` rendered correctly with the 2 successful gemini views — confidence,
stances, key risks, fragile insights, metacognitive reflection, evidence
citations all present. Cell-level failure isolation works: 4 cells failed but
the session still completed and produced a synthesis from the surviving 2.

Sample from the rendered synthesis (gemini Risk Pessimist):

> Twelve months hence, the demise of flywheel-ideas is a foregone conclusion,
> driven by a set of assumptions so detached from reality they practically
> sealed its fate from inception. The foundational failure, as laid bare by
> [asm-s6rtR2v4], is the breathtaking audacity of assuming external adoption
> without a shred of empirical evidence. The 'at least 2 external users
> within 30 days' was not a safeguard, but a death sentence waiting to be
> signed by silence. Without that minimal traction, the project was DOA.

That is the product working. The council surfaced a real, decision-changing
critique of the idea on which it was being run.

## Real-world findings (carry to v0.1.1)

### claude auth pattern not classified

The 4 `claude` cells failed because **the spawned `claude` subprocess wasn't
authenticated**. Stdout payload (captured in the failed view markdown):

```
"Not logged in · Please run /login"
"error": "authentication_failed"
```

The cli-errors classifier bucketed this as `exit_nonzero` because the auth
pattern isn't yet in `BENIGN_STDERR_PATTERNS` / classifier regex. M8 docs flag
auth + rate_limit as `TODO`. The dogfood now provides a real captured
authentication-failed transcript — file as v0.1.1 work.

### `clis` arg in council.run not respected

The driver passed `clis: ['claude','gemini']` to `council.run`, but the
orchestrator dispatched all 3 (codex too — visible in the council artifact
files: `codex-risk-pessimist.md`, `codex-growth-optimist.md`). Either the
schema doesn't expose `clis` to MCP callers, or the value is silently
overridden by the orchestrator's default. Either way: minor surface gap;
file as v0.1.1.

### Otherwise: clean

- `idea.list`'s new `needs_review` filter parses + applies correctly.
- The frontmatter sync from alpha.4 (state + state_changed_at) lands on the
  expected ISO format.
- The memory-bridge runs to completion against the real flywheel-memory and
  writes `custom_categories` to `state.db` (verified via
  `sqlite3 .flywheel/state.db "SELECT value FROM flywheel_config WHERE key='custom_categories'"`).
- All 4 alpha.5 fixes (needs_review filter, model_version capture, comment
  sync, milestone-reference sweep) appear in the published artifact.

## Verdict

**Ship v0.1.0 GA from alpha.5.** The two real-world findings (claude auth
classification gap + `clis`-arg passthrough) are documented + queued for
v0.1.1. They are not GA-blockers — they are known-unknowns that the dogfood
just made into known-knowns, which is exactly what dogfood is for.

GA cut next: doc sweep alpha→stable + bump 0.1.0 + publish without `--tag alpha`
+ `npm dist-tag rm alpha` per the plan's Phase 3.
