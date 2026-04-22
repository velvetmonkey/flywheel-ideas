# Running the council (M8)

M8 wires `council.run` to a real claude subprocess dispatcher. Ships with two
sequential personas (Risk Pessimist, Growth Optimist) on a single CLI. See
`docs/cli-quirks.md` for the per-CLI spawn details and `packages/core/src/council*.ts`
for implementation.

## Prerequisites

1. `claude` CLI on `$PATH` and authenticated (`claude login` completed).
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
council.run({id: "idea-Xyz", confirm: true})
  → {status: "success", session_id: "sess-...",
     synthesis_vault_path: "councils/idea-Xyz/session-01/SYNTHESIS.md",
     views: [
       {persona: "risk-pessimist",  confidence: 0.7, ...},
       {persona: "growth-optimist", confidence: 0.4, ...}
     ],
     mode: "pre_mortem"}
```

Mode defaults to `pre_mortem` for nascent/explored ideas, `standard` for
evaluated/committed. Pass `mode: "standard"` explicitly to override.

## Per-run artifacts in the vault

```
<vault>/councils/<idea_id>/session-NN/
  SYNTHESIS.md                            # deterministic markdown summary
  claude-risk-pessimist.md                # stance + reflection + evidence
  claude-growth-optimist.md               # stance + reflection + evidence
```

`SYNTHESIS.md` contains:
- Executive table: persona × model × confidence × stance preview
- Per-view rendering (full stance, key risks, assumptions cited, metacognitive reflection, evidence)
- Evidence union (deduped across views)
- Failed cells (with reason + stderr tail)
- Next-steps checklist for `idea.read`, `assumption.signposts_due`, etc.

## What the DB records

- `ideas_council_sessions` — one row per `council.run`
- `ideas_council_views` — one row per (session, persona) even on failure
  (null stance + populated `failure_reason` + `stderr_tail` on fail)
- `ideas_dispatches` — one row per cell spawn (2 per run in M8)
- `ideas_assumption_citations` — edges from view → cited assumption ids

`initial_stance` + `self_critique` columns stay null in M8 rows. Two-pass
metacognitive structure lands in M9 and fills them.

## Tuning

| Env var | Default | Purpose |
|---|---|---|
| `FLYWHEEL_IDEAS_CELL_MODEL` | `claude-haiku-4-5-20251001` | Which claude model per cell |
| `FLYWHEEL_IDEAS_CELL_TIMEOUT_MS` | `900000` (15 min) | Per-cell timeout |
| `FLYWHEEL_IDEAS_MAX_BUFFER_BYTES` | `4194304` (4 MB) | Per-cell stdout cap |
| `FLYWHEEL_IDEAS_SPAWN_PREFIX` | _(unset)_ | JSON-encoded `[cmd, ...args]`; prepends to the claude invocation. Used by integration tests to redirect at a mock CLI. Do not set in production. |

## What's NOT in M8

| Feature | Lands in |
|---|---|
| Two-pass metacognitive structure | M9 |
| Codex + Gemini dispatch | M9 |
| Concurrency / fan-out | M9 |
| `pre_mortem` vs `steelman` mode selection refinements | v0.2 |
| LLM-based synthesis | v0.2 |
| Auth / rate_limit error classification | M9 (opportunistic capture) |

## Debugging a failed run

```bash
# See failed cells + reasons
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT session_id, persona, failure_reason, length(stderr_tail) AS stderr_len
     FROM ideas_council_views
    WHERE failure_reason IS NOT NULL
    ORDER BY rowid DESC LIMIT 10;"

# Inspect full stderr tail for a failed view
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT stderr_tail FROM ideas_council_views WHERE id = '<view-id>';"

# Read the SYNTHESIS.md — failed cells get their own section with the tail inline
cat $VAULT_PATH/councils/<idea_id>/session-NN/SYNTHESIS.md
```

Classification lives in `packages/core/src/cli-errors.ts`. If a real CLI
failure surfaces a stderr pattern not in the catalogue, add it there with a
golden fixture under `packages/core/test/fixtures/cli-errors/`.
