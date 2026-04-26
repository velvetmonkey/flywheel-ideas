# Outcome + propagation

`outcome.log` closes the compounding loop. When you refute an assumption that
turned out wrong, every idea whose council cited that assumption gets flagged
`needs_review=1`. Six months from now, the vault catches the assumption that
failed.

## The loop

```
idea.create → assumption.declare → council.run → idea.transition
                                                     ↓
                                              (months pass; reality arrives)
                                                     ↓
                              outcome.log({refutes: [asm-X]})
                                                     ↓
                                              propagation
                                                     ↓
        every idea whose council cited asm-X → needs_review=1
                                                     ↓
                                 next idea.list({needs_review: true}) surfaces them
```

## Typical call

```
outcome.log({
  idea_id: "idea-Xyz",
  text: "Migration shipped. Observability cost was 3x forecast. A2 refuted; A1 validated.",
  refutes: ["asm-A2"],
  validates: ["asm-A1"]
})
→ {
    id: "out-abc...",
    flagged_count: 3,
    flagged_ideas: [
      { id: "idea-Pqr", title: "Caching layer redesign" },
      { id: "idea-Stu", title: "API tier pricing" },
      { id: "idea-Vwx", title: "Event replay framework" }
    ],
    refuted: ["asm-A2"],
    validated: ["asm-A1"]
  }
```

The 3 flagged ideas are now `needs_review=1` — they all cited asm-A2 in their
councils and may need re-evaluation.

## Actions

| Action | Arguments | Behavior |
|---|---|---|
| `log` | `idea_id`, `text`, `refutes?` or `validates?` | Insert outcome + verdict rows; cascade needs_review; return flagged_ideas. Atomic via DB transaction. |
| `undo` | `id` | Reverse the outcome. Re-opens assumptions (or keeps them refuted if another non-undone outcome still refutes them). Clears needs_review on ideas that no longer have any refuted citation. |
| `list` | `idea_id?`, `include_stale?`, `limit?` | DESC by landed_at. Filters stale (missing markdown) by default. |
| `read` | `id` | Single-outcome detail: refuted + validated arrays, timestamps, undone_at if reversed. |

## Refutation vs validation

- **`refutes: [asm_ids]`** — assumption reality disproved. Cascades: every idea
  whose council cited the refuted assumption gets `needs_review=1`.
- **`validates: [asm_ids]`** — assumption reality confirmed. Status becomes
  `'held'`. **No cascade** — validated assumptions don't flag dependents.

You can log both in one outcome: some assumptions validated, others refuted.

## Undo semantics

**Idempotency**: second undo on an already-undone outcome returns an
`mcpError` with a friendly "already undone" message and `outcome.read`
next-step. Explicit over silent: callers can catch and treat as success.

**Overlapping refutations**: if outcome Y and Z both refute assumption A,
undoing Y does NOT reopen A (Z's refutation still stands). The assumption's
`refuted_at` column tracks the EARLIEST still-active refuter's landed_at —
so stacked refutations preserve the truth "when was this first flagged."

**needs_review clearing is sticky**: undoing an outcome clears `needs_review`
on an idea only if **no other non-undone outcome** still refutes an assumption
that idea cites. Ideas that cited multiple assumptions across multiple outcomes
stay flagged until ALL refutations are unwound.

## What the DB records

- `ideas_outcomes` — one row per logged outcome; `undone_at` nullable
- `ideas_outcome_verdicts` — edges outcome → assumption with `verdict IN ('refuted', 'validated')`
- `ideas_assumptions.status` — derived from outstanding verdicts on each undo; written directly on each log
- `ideas_assumptions.refuted_at` — `MIN(landed_at)` across active refuters
- `ideas_notes.needs_review` — set to 1 for every idea whose council cited any refuted assumption; cleared on undo only if no active refutation remains

## Vault artifacts

```
<vault>/outcomes/<slug>-<id_suffix>.md
```

Where `id_suffix` is the full 8-char random tail of `generateOutcomeId()`.
Frontmatter carries: `id`, `type: outcome`, `idea_id`, `landed_at`,
`refutes[]`, `validates[]`, `undone_at` (null until reversed).

Body contains the outcome text verbatim + section listing refuted/validated
assumption ids.

## Source-of-truth invariant

The DB is authoritative for queries (status, refuted_at, needs_review).
Assumption markdown frontmatter is synced **best-effort** after each
transaction commits — vault is a human-readable mirror. If fs writes fail,
the DB stays correct; stderr logs a warning. A future sync tool can
reconcile drift; in v0.1 this is acceptable trade-off for performance.

Alpha.4 extends best-effort sync to two more fields: `state` /
`state_changed_at` on `idea` notes (via `syncTransitionFrontmatter`) and
`needs_review` on flagged ideas (via `outcome.log` cascade + `outcome.undo`
clearance). Both follow the same contract — DB authoritative, stderr on
failure, no rollback.

### Frontmatter sync semantics (which mutations rollback vs best-effort)

Different vault mutations have different consistency guarantees on fs
failure. Pinning the contract so future readers don't second-guess:

| Mutation | On fs failure | Why |
|---|---|---|
| `assumption.lock` (`lockAssumption`) | **Rollback DB** | OSF-style pre-registration is a strict commitment; "locked but not synced" is meaningfully wrong. |
| `idea.transition` via MCP tool (`tools/idea.ts`) | **Rollback DB** | The user's tool call returned an error; DB and frontmatter stay aligned at the pre-transition state. |
| `recordTransition` library helper + `syncTransitionFrontmatter` | Best-effort + stderr warn | Library callers that prefer DB-authoritative mirror semantics; tools/idea.ts gives stricter rollback. |
| `outcome.log` assumption status sync | Best-effort + stderr warn | Multiple assumptions cascade; partial-success is recoverable + the DB stays correct. |
| `outcome.log` `needs_review` cascade (alpha.4 fix 5) | Best-effort + stderr warn | One outcome can flag N ideas; rolling back a 10-idea cascade because idea #8's markdown was locked would elevate the read-only mirror to an authoritative constraint. |
| `outcome.undo` `needs_review` clearance | Best-effort + stderr warn | Symmetric with log path. |

**`needs_review` is written exclusively by the `outcome.log` / `outcome.undo` paths.** Verified
via grep — schema declares the column, only the outcome.log/undo paths
touch it. Any future source (signpost sweep, agent-driven detection, etc.)
must coordinate with the outcome-clearing path so `undo` doesn't wipe flags
set by the other source.

## Testing

Outcome + propagation has heavy property-based coverage because silent bugs
here corrupt the compounding mechanism invisibly:

- **Round-trip**: log + undo = pre-log DB state (bytewise on statuses +
  needs_review flags)
- **Commutativity**: log [Y, Z, W]; undo in ANY permutation; final DB
  state is identical. fast-check generates permutations with deterministic
  seed replay on CI failure.
- **Stacked refutation**: multiple outcomes refute the same assumption;
  undoing one leaves the assumption refuted via the others.
- **Refuted_at correctness**: the earliest still-active refuter's timestamp
  sticks, not the most recent one.
- **Sticky needs_review**: undo clears flags only when NO other outcome
  still refutes an assumption the idea cites.

## Debugging

```bash
# Flagged ideas
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT id, title FROM ideas_notes WHERE needs_review = 1;"

# Who refutes this assumption (and are they still active?)
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT v.outcome_id, o.undone_at, o.text
     FROM ideas_outcome_verdicts v
     JOIN ideas_outcomes o ON v.outcome_id = o.id
    WHERE v.assumption_id = 'asm-XYZ'
      AND v.verdict = 'refuted';"

# Citation graph: which views cited this assumption
sqlite3 $VAULT_PATH/.flywheel/ideas.db \
  "SELECT s.idea_id, v.persona, v.model
     FROM ideas_assumption_citations c
     JOIN ideas_council_views v ON v.id = c.view_id
     JOIN ideas_council_sessions s ON s.id = v.session_id
    WHERE c.assumption_id = 'asm-XYZ';"
```

## What landed since v0.1

See [CHANGELOG.md](../CHANGELOG.md) for the full release history. The v0.2 GA
notes cover `decision_delta`, `assumption.radar`, lineage queries (`ancestry`
/ `descendants` / `shared_assumptions`), and steelman mode. Memory-bridge
custom-category registration shipped in v0.1 alpha.3 — see
[`memory-bridge.md`](./memory-bridge.md).

Still NOT shipped, intentionally:
- **`outcome.forget`** — audit trail matters; outcomes can only be undone, never deleted.
- **Real `claude -p` E2E in continuous CI** — explicitly not pursued. Live-CLI coverage runs as the v0.1 GA dogfood + the v0.2 cite-rate pilot.
- **Automated outcome detection** (vault-scanning for outcome-shaped notes) — still on the roadmap; the user logs outcomes by hand for now.

---

*Last updated: 2026-04-26.*
