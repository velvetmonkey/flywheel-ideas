# Running the council

`council.run` is a real multi-model subprocess dispatcher. The full matrix:
**claude + codex + gemini × 5 personas = up to 15 cells × 2 passes
= 30 CLI invocations at `depth: "full"`**. Default `depth: "light"` runs
6 cells (3 CLIs × 2 personas). See [`docs/cli-quirks.md`](./cli-quirks.md) for
per-CLI spawn details and `packages/core/src/council*.ts` for implementation.

## Modes

`council.run({mode})` accepts three modes:

- `pre_mortem` — *default for nascent / explored ideas.* Personas imagine the decision has already failed and reason backwards from the failure to the assumption that broke. Used to surface fragility before commit.
- `standard` — balanced critique. Personas weigh the decision on its merits, no failure-imagination prompt.
- `steelman` — defends the strongest version of the decision. Counterweight to `pre_mortem`. Useful before logging an outcome that refutes the idea — forces a final, honest "best case" before letting reality close the loop.

## Prerequisites

1. One or more of `claude`, `codex`, `gemini` on `$PATH`, authenticated.
   Missing CLIs produce per-cell failures but don't abort the session.
2. Approval granted out-of-band — either `FLYWHEEL_IDEAS_APPROVE=session|always`
   at server launch, or a manual edit of `<vault>/.flywheel/ideas-approvals.json`.
   See CLAUDE.md "Safety" section for the file format.

## Typical flow

```
idea.create({title: "Switch pricing from seat to usage"})
  → idea-Xyz
assumption.declare({
  idea_id: "idea-Xyz",
  context: "SMB CRM",
  challenge: "low conversion at the top",
  decision: "usage-based converts better at the top",
  tradeoff: "may churn on surprise bills",
  load_bearing: true,
  signpost_at: <unix_ms 60 days out>
})
council.run({id: "idea-Xyz", confirm: true, depth: "light"})
  → {status: "success", session_id: "sess-...",
     synthesis_vault_path: "councils/idea-Xyz/session-01/SYNTHESIS.md",
     views: [
       {persona: "risk-pessimist",  model: "claude", confidence: 0.72, ...},
       {persona: "risk-pessimist",  model: "codex",  confidence: 0.65, ...},
       {persona: "risk-pessimist",  model: "gemini", confidence: 0.70, ...},
       {persona: "growth-optimist", model: "claude", confidence: 0.48, ...},
       {persona: "growth-optimist", model: "codex",  confidence: 0.52, ...},
       {persona: "growth-optimist", model: "gemini", confidence: 0.44, ...}
     ],
     mode: "pre_mortem"}
```

Mode defaults to `pre_mortem` for nascent/explored ideas, `standard` for
evaluated/committed. Pass `mode: "standard"` explicitly to override.

## Matrix

| Depth | CLIs | Personas | Cells | Two-pass spawns | Approx cost (haiku) |
|---|---|---|---|---|---|
| `light` (default) | claude + codex + gemini | Risk Pessimist + Growth Optimist | 6 | 12 | ~$0.24 |
| `full` | claude + codex + gemini | all 5 | 15 | 30 | ~$3.00 |

Full-depth adds the Competitor Strategist, Regulator, and Customer Advocate
personas. Cost is rough — real pricing varies by provider and prompt size.

Before fan-out, the orchestrator logs a one-line plan to stderr:
```
[flywheel-ideas] council.run depth=light: 6 cells × 2 passes = 12 dispatches, max concurrency 3
```

## Concurrency

Max 3 in-flight cells by default; `FLYWHEEL_IDEAS_MAX_CONCURRENCY` env
override. Cells are **interleaved by CLI** in the dispatch queue — the
first 3 cells sent into the limiter are always 3 different providers.
Prevents rate-limit bursts on any single CLI.

Per-cell work is held through both passes (one cell = Pass 1 + Pass 2
sequentially inside the same limiter slot).

## Per-run artifacts in the vault

```
<vault>/councils/<idea_id>/session-NN/
  SYNTHESIS.md                            # deterministic markdown summary
  claude-risk-pessimist.md                # stance + reflection + evidence
  codex-risk-pessimist.md
  gemini-risk-pessimist.md
  claude-growth-optimist.md
  codex-growth-optimist.md
  gemini-growth-optimist.md
  # (at depth=full: 15 files total, one per CLI×persona)
```

`SYNTHESIS.md` contains:
- Executive table: persona × model × confidence × stance preview
- Per-view rendering (full stance, key risks, assumptions cited, metacognitive reflection, evidence)
- Evidence union (deduped across views)
- Failed cells (with reason + stderr tail)
- Next-steps checklist for `idea.read`, `assumption.signposts_due`, etc.

## Two-pass metacognitive structure

Each cell runs 2 passes:

**Pass 1** — initial stance. Persona produces its first answer.
**Pass 2** — self-critique. Persona receives Pass 1 output and the prompt:
> *"(a) Could you be wrong? (b) Which assumption are you most vulnerable on? (c) What counter-argument haven't you surfaced yet?"*

Both stances persist in `ideas_council_views`:
- `initial_stance` — Pass 1 text
- `stance` — Pass 2 revised text (authoritative for synthesis)
- `self_critique` — Pass 2 critique of Pass 1

If Pass 1 fails (parse/spawn/timeout), Pass 2 is skipped — 1 dispatch
row, `failure_reason` set, everything else null. If Pass 2 fails,
`initial_stance` still persists so the audit keeps the partial work.

## What the DB records

- `ideas_council_sessions` — one row per `council.run` (depth, mode, synthesis path)
- `ideas_council_views` — one row per (session × cli × persona) even on failure
- `ideas_dispatches` — one row per spawn (up to 2 per cell: Pass 1 + Pass 2)
- `ideas_assumption_citations` — edges from view → cited assumption ids

## Tuning

| Env var | Default | Purpose |
|---|---|---|
| `FLYWHEEL_IDEAS_CLAUDE_MODEL` | `claude-haiku-4-5-20251001` | Per-CLI model |
| `FLYWHEEL_IDEAS_CODEX_MODEL` | `gpt-5-codex` | Per-CLI model |
| `FLYWHEEL_IDEAS_GEMINI_MODEL` | `gemini-2.5-flash-lite` | Per-CLI model |
| `FLYWHEEL_IDEAS_CELL_MODEL` | _(claude legacy)_ | Legacy — prefer per-CLI |
| `FLYWHEEL_IDEAS_CELL_TIMEOUT_MS` | `900000` (15 min) | Per-cell timeout |
| `FLYWHEEL_IDEAS_MAX_BUFFER_BYTES` | `4194304` (4 MB) | Per-cell stdout cap |
| `FLYWHEEL_IDEAS_MAX_CONCURRENCY` | `3` | Max in-flight cells |
| `FLYWHEEL_IDEAS_SPAWN_PREFIX` | _(unset)_ | Legacy JSON-array test hook |
| `FLYWHEEL_IDEAS_SPAWN_PREFIXES` | _(unset)_ | JSON-object keyed by CLI (test-only hook) |
| `FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION` | _(unset)_ | When `1`, drops `--bare` from claude argv so it inherits Claude Code subscription auth instead of requiring `ANTHROPIC_API_KEY`. Trade-off: subscription mode loads the user's MCP / plugin config on each spawn (slower cold start, less hermetic) but bills against the Claude Code subscription. Default unchanged — hermetic API-key mode. See [`docs/cli-quirks.md`](./cli-quirks.md#flag-choices-for-council-cells). |

## Debugging a failed run

```bash
# See failed cells + reasons
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT session_id, model, persona, failure_reason, length(stderr_tail) AS stderr_len
     FROM ideas_council_views
    WHERE failure_reason IS NOT NULL
    ORDER BY rowid DESC LIMIT 20;"

# Inspect full stderr tail for a failed view
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT stderr_tail FROM ideas_council_views WHERE id = '<view-id>';"

# Read the SYNTHESIS.md — failed cells get their own section with the tail inline
cat $VAULT_PATH/councils/<idea_id>/session-NN/SYNTHESIS.md
```

## Benign stderr filtering

Gemini on Linux without libsecret emits the warnings:
```
Keychain initialization encountered an error: libsecret-1.so.0: cannot open shared object file: No such file or directory
Using FileKeychain fallback for secure storage.
Loaded cached credentials.
```
Plus the shell hook artifact `Shell cwd was reset to …` on this dev environment.

These are **stripped before pattern matching** by `BENIGN_STDERR_PATTERNS`
in `cli-errors.ts` using strict full-line regex. A real failure that looks
similar (e.g. `Keychain initialization failed: API key not found`) does
NOT match the benign pattern and passes through to classification as normal.

The raw stderr is still preserved in `ideas_council_views.stderr_tail` for
audit — only the classifier view of stderr is filtered.

## What landed since v0.1

See [CHANGELOG.md](../CHANGELOG.md) for the full release history. The v0.2
GA notes cover the major additions: retrieval-native council input
(evidence pack), steelman mode, two-pass metacognitive structure,
`council.delta`, lineage queries, and the `assumption.radar` /
`idea.freeze` surface that wraps council usage.

## Failure classification

Classification lives in `packages/core/src/cli-errors.ts`. Current catalogue:
- `parse` — per-CLI arg-parser stderr (clap, commander, yargs)
- `bad_model` — claude stdout + codex turn.failed JSONL
- `timeout` — dispatcher-kill flag + SIGTERM/SIGKILL signals
- `auth` — captured during the v0.1 GA dogfood (claude `"Not logged in"` / `authentication_failed`); see [`docs/dogfood-v0.1-ga.md`](./dogfood-v0.1-ga.md).
- `exit_nonzero` — generic fallback
- `unknown` — zero exit with no matching pattern

`rate_limit` is still declared-but-uncatalogued — add patterns + a golden
fixture under `packages/core/test/fixtures/cli-errors/` when a real failure
surfaces during dogfooding or pilot runs.

---

*Last updated: 2026-04-26.*
