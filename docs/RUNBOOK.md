# Runbook

Reference for every MCP tool that flywheel-ideas exposes. Use this once
you've finished [`QUICKSTART.md`](./QUICKSTART.md) and want to know
*what each call actually does to your vault*.

For per-argument schemas (every required and optional field, with
descriptions), call the tool through your MCP client — the server
returns full zod-schema hints. This document is the higher-level
narrative: what each action means, what shows up on disk, and what to
typically do next.

## The seven tools

| Tool | Purpose |
| --- | --- |
| [`idea`](#idea) | The lifecycle of a decision — create, transition, freeze, export, report. |
| [`assumption`](#assumption) | The load-bearing claims a decision depends on. |
| [`council`](#council) | Multi-model AI critique cells. Spawns CLI subprocesses. Approval-gated. |
| [`outcome`](#outcome) | What reality showed. The compounding mechanism. |
| [`company`](#company) | SEC filing tracker. Public-company assumption ledger over time. |
| [`import`](#import) | Bulk ingest of decision corpora (RFCs, ADRs, CSV/JSONL). |
| [`doctor`](#doctor) | Read-only diagnostics on ledger drift. |

## Backend matrix (current and planned)

| Tool | Action(s) | `sqlite` mode | `doc` mode (planned) |
| --- | --- | --- | --- |
| `idea` | `create`, `read`, `list`, `transition` | ✅ | ✅ |
| `idea` | `freeze`, `list_freezes`, `ancestry`, `descendants`, `shared_assumptions`, `export`, `report` | ✅ | ❌ not supported |
| `idea` | `export_doc` (planned) | ✅ | ✅ |
| `assumption` | `declare` | ✅ | ✅ |
| `assumption` | `list`, `lock`, `unlock`, `signposts_due`, `forget`, `radar`, `extension_set`, `extension_get` | ✅ | ❌ |
| `council` | all | ✅ | ❌ |
| `outcome` | `log` (verdict only, no propagation) | ✅ | ✅ |
| `outcome` | `undo`, `list`, `read`, `memo_upsert` | ✅ | ❌ |
| `company` | all | ✅ | ❌ |
| `import` | all | ✅ | ❌ |
| `doctor` | `consistency` | ✅ | ✅ (separate issue kinds) |

Cells marked ❌ return `not_supported_in_doc_mode` with a hint to
switch the idea back to the `sqlite` backend. See
[`docs/single-doc-format.md`](./single-doc-format.md) for the doc-mode
file contract and [`docs/consistency.md`](./consistency.md) for the
reasoning.

---

## Disk layout (canonical SQLite mode)

After ten ideas with assumptions, two council runs, three outcomes, and
one SEC company-tracker run, your vault looks like:

```
<vault>/
├── .flywheel/
│   ├── ideas.db                              ← SQLite ledger (canonical state)
│   └── ideas-approvals.json                  ← council-dispatch approvals (optional)
├── ideas/
│   └── 2026/05/
│       ├── replace-thermostat-7q2xv9bn.md    ← one file per idea
│       ├── replace-thermostat-7q2xv9bn/
│       │   ├── assumptions/
│       │   │   └── asm-4p1cnz3k.md
│       │   └── outcomes/
│       │       └── out-VxXuqAUS.md
│       └── ...
├── councils/
│   └── replace-thermostat-7q2xv9bn/
│       └── session-1/
│           ├── SYNTHESIS.md                  ← per-session dissent summary
│           ├── view-<id>-claude-skeptic.md
│           ├── view-<id>-codex-optimist.md
│           └── ...
├── exports/
│   └── portfolio-2026-05-13T...md            ← shareable bundle from idea.export
├── reports/
│   └── company-runs/
│       └── sec-10y-100-company/
│           ├── dashboard.md
│           ├── thesis.md
│           ├── review-queue.md
│           ├── accepted-lessons.md
│           └── ...
└── imports/
    └── <source-id>/                          ← staging area, never canonical
        └── candidate-<id>.md
```

`.flywheel/ideas.db` is the source of truth. Every Markdown file is a
human-readable mirror; the doctor (`doctor.consistency`) is the only
sanctioned drift detector. See [`docs/consistency.md`](./consistency.md)
for the full per-operation policy.

---

## `idea`

The decision lifecycle. Twelve actions; first four cover ~90% of daily
use. Lifecycle states: `nascent → explored → evaluated → committed → validated | refuted | parked → killed`.

| Action | What it does | What lands on disk | Typical next step |
| --- | --- | --- | --- |
| `create` | New idea row + Markdown note. Optional private decision-journal context (stored DB-side only, not in markdown). | `ideas/<yyyy>/<mm>/<slug>-<id>.md` + DB row | `assumption.declare` |
| `read` | Full note (frontmatter + body) + transition history + assumption hints. | nothing | `assumption.declare`, `council.run`, or `idea.transition` (state-aware hints) |
| `list` | Paginated browse. Filter by `state`, `needs_review`, `include_stale`. | nothing | `idea.read` on the top entry |
| `transition` | Move the idea between lifecycle states. Records a transition row and patches frontmatter. Enforces prereqs (council before `evaluated`, locked load-bearing assumption before `committed`, outcome before `validated`/`refuted`). `bypass_enforcement: true` is the escape hatch. | DB transition row + frontmatter patch | `idea.read` to confirm, then state-specific next action |
| `forget` | Delete the DB row (cascades to assumptions, outcomes, council sessions). Markdown is intentionally **not** deleted. | DB row removed | `idea.list` |
| `freeze` | OSF-style preregistration snapshot of the idea + open assumptions. Supports amendment chains via `supersedes_freeze_id`. | DB freeze row (no separate markdown) | `council.run({ freeze_id: ... })` |
| `list_freezes` | Walk the freeze chain (newest first by default). | nothing | `idea.read` |
| `ancestry` | Walk supersession chain backwards from this idea. | nothing | `idea.read` on the immediate parent |
| `descendants` | Walk supersession chain forwards. | nothing | `idea.read` on the latest descendant |
| `shared_assumptions` | Other ideas that cite the same assumptions. The cross-bet flag system. | nothing | `idea.read` on the highest-overlap match |
| `export` | Render a portfolio Markdown bundle (one file, many ideas). Body redaction on by default; assumptions / outcomes / council excerpts always included. | `exports/portfolio-<ts>.md` | cold-read the bundle |
| `report` | Render a read-only report. Today: `report_kind: "sec_company"` summarizes current bets, review queue, accepted verdicts, dependent ideas needing review. | nothing (in-memory aggregation) | `company.apply_outcomes` on a staged event |

---

## `assumption`

Y-statement claims attached to ideas. Nine actions. The most important
fields on `declare` are `context`, `challenge`, `decision`, `tradeoff` —
together they form the Y-statement that the council attacks.

| Action | What it does | What lands on disk |
| --- | --- | --- |
| `declare` | New assumption row + Markdown note. `signpost_at: <future-ms>` enables re-evaluation surfacing. `load_bearing: true` enforces the "locked before commit" gate. | `ideas/<idea-id>/assumptions/<id>.md` + DB row |
| `list` | All assumptions for an idea (or globally). | nothing |
| `lock` | Lock an assumption against further edits (OSF pre-registration). | DB update + frontmatter patch |
| `unlock` | Reverse a lock. | DB update + frontmatter patch |
| `signposts_due` | Surface assumptions whose `signpost_at` has passed and that have not yet been refuted or validated. This is the re-evaluation queue. | nothing |
| `forget` | Delete the DB row. Markdown left intact (surfaced by doctor as `orphan_markdown`). | DB row removed |
| `radar` | Search the assumption corpus via flywheel-memory's evidence reader. Returns ranked matches with confidence. | nothing |
| `extension_set` / `extension_get` | Optional RAND ABP-style hedging / shaping action metadata attached to an assumption. Sidecar, never required. | DB extension row |

---

## `council`

Multi-model AI dissent. Spawns `claude`, `codex`, `gemini` CLI
subprocesses in parallel under a concurrency limiter. Requires
`confirm: true` on every `run` (acknowledges the spawn) and an active
approval grant (env var `FLYWHEEL_IDEAS_APPROVE=session|always` or a
persistent file at `<vault>/.flywheel/ideas-approvals.json`).

| Action | What it does | What lands on disk |
| --- | --- | --- |
| `run` | Light or full council pass. `depth: "light"` = 6 cells (3 CLIs × 2 personas). `depth: "full"` = 15 cells (3 × 5). Two passes per cell — `initial_stance` then `self_critique` + revised `stance`. Modes: `pre_mortem`, `standard`, `steelman`, `anti_portfolio`. Optional `freeze_id` to anchor against a preregistration. | `councils/<idea-id>/session-<N>/SYNTHESIS.md` + per-view notes; DB rows in `ideas_council_sessions`, `ideas_council_views`, `ideas_dispatches` |
| `approval_status` | Read-only approval state (no mutation possible from the tool surface). | nothing |
| `delta` | Diff two council sessions for the same idea — what changed in dissent between runs. | nothing |
| `effectiveness_report` | Which personas / CLIs surfaced the load-bearing dissent that later proved useful (telemetry-driven). | nothing |

The council is the gate on `idea.transition({ to: "evaluated" })` —
without at least one completed council session for an idea, the
transition is blocked unless `bypass_enforcement: true`.

---

## `outcome`

What reality showed after the bet landed. The compounding mechanism:
refuted assumptions cascade `needs_review=1` to every other idea citing
them.

| Action | What it does | What lands on disk |
| --- | --- | --- |
| `log` | Record an outcome with `text` + optional `refutes` / `validates` (lists of assumption ids). Cascades the refutation: any idea whose council cited a refuted assumption is flagged for review. Reversible. | `ideas/<idea-id>/outcomes/<id>.md` + DB row + per-flagged-idea frontmatter patch |
| `undo` | Reverse a prior log. Idempotent (sticky-refutation semantics — if another outcome later refuted the same assumption, the assumption stays refuted). | DB update + frontmatter patches |
| `list` | All outcomes for an idea (or globally). Filter by `since`, `kind`, `undone`. | nothing |
| `read` | Full outcome record. | nothing |
| `memo_upsert` | Attach or update a lesson memo (Anti-Portfolio pattern — what we learned). | DB row |

The `signposts_due` action on `assumption` is the **producer**;
`outcome.log` is the **consumer**. Together they're the loop that turns
"I had a feeling about this" into "here's what the evidence shows."

---

## `company`

SEC EDGAR filing tracker. Public-company 10-K and 10-Q filings become
current bets + dated observations + staged outcome candidates that
become accepted pass/fail verdicts through `outcome.log`. Heavy: prefer
the dogfood scripts (`scripts/sec-lifecycle-dogfood.mjs`) for bulk runs.

| Action | What it does | What lands on disk |
| --- | --- | --- |
| `track` | Scan filings for a list of companies over N years. Stages company themes, observations, and outcome candidates. `confirm: true` required. | `reports/company-runs/<run-id>/` (dashboard, thesis, review-queue, candidate-noise, accepted-lessons) + DB rows |
| `evaluate` | Optional shadow LLM evaluation pass — uses claude / codex / gemini to score staged candidates. Sidecar, never mutates canonical ledger. | DB rows in `ideas_company_evaluation_targets`, `ideas_company_evaluation_attempts` |
| `read` | Read a previously-produced thesis report. | nothing |
| `report` | Render thesis report markdown. | nothing |
| `apply_outcomes` | Promote staged outcome candidates into accepted ledger outcomes via `outcome.log`. Idempotent at the candidate-id level. | per-candidate outcomes + frontmatter patches |

See [`docs/sec-corpus-walkthrough.md`](./sec-corpus-walkthrough.md) for
the full workflow narrative.

---

## `import`

Bulk ingest of decision corpora into the ledger. Two-step flow: `scan`
writes to a staging area only; `promote` requires explicit per-candidate
consent before any canonical vault write happens.

Built-in adapters: `github-structured-docs` (PEPs, RFCs in RFC-822
format), `csv-corpus` (JSONL — one decision per line), `github-repo-adr`
(architecture decision records in Konflux-style markdown trees),
`sec-company` (SEC EDGAR filings).

| Action | What it does | What lands on disk |
| --- | --- | --- |
| `scan` | Read the source, parse via the named adapter, dedup against existing vault content, write candidates to staging. | `imports/<source-id>/*.md` (staging only — never canonical) + DB rows in `ideas_import_sources`, `ideas_import_candidates` |
| `promote` | Promote one or more candidates to canonical ideas + assumptions. `override_duplicate: true` required for dedup-flagged matches. | Canonical `ideas/...` markdown + DB rows (same path as `idea.create`) |
| `list` | Browse staged candidates. Filter by source, state, kind. | nothing |
| `read` | Full candidate (parsed fields + raw body). | nothing |
| `reject` | Mark a candidate as rejected (won't be promoted, kept for audit). | DB update |

---

## `doctor`

Read-only diagnostics. Reports drift; does not repair. See
[`docs/consistency.md`](./consistency.md) for the policy and the
deferred-repair-actions rationale.

| Action | What it does | What it reports |
| --- | --- | --- |
| `consistency` | Walk every `ideas_notes`, `ideas_assumptions`, `ideas_outcomes`, `ideas_council_sessions` row and compare to its Markdown mirror. Scan `ideas/` for orphan markdown. | `missing_markdown`, `orphan_markdown`, `stale_frontmatter`, `incomplete_council_session`, `failed_council_view` — each issue includes table, id, path, field, and a human-readable detail. |

Doc-mode invariants (added with the doc-mode wedge):
`doc_round_trip_failed`, `doc_state_verdict_mismatch`,
`doc_transition_out_of_order`, `doc_malformed_section`. Selected via
`mode: 'sqlite' | 'doc' | 'both'`.

---

## What you do over time

Day 1: install, register, walk through QUICKSTART, end with one idea on
disk. Doctor reports clean.

Week 1: declare assumptions on every decision worth a week's thought.
Run `council.run` on the two that matter most (it costs minutes of CLI
spawn time + tokens — don't run it on everything). Log outcomes when
reality arrives.

Month 1: `idea.list({ needs_review: true })` becomes the most useful
single command. It's the queue of bets whose foundations shifted. Keep
the queue at zero — accept or reject each one.

Quarter 1: `assumption.signposts_due` produces hits. Each one is a bet
that asked you to re-check at a specific future date. Re-evaluate.

Year 1: `idea.export` gives you a portfolio markdown of every decision
you logged, with the lesson memos attached. If you log nothing, you
get nothing. If you log diligently, the portfolio is a compounding
artifact of how your judgment shifted.

The value is not "AI reads documents." The value is a durable trail
from belief → assumption → evidence → outcome → lesson, queryable in
ways a notebook cannot match.
