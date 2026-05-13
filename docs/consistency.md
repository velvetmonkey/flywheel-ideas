# Consistency policy

This is the contract for how flywheel-ideas keeps the SQLite ledger
(`<vault>/.flywheel/ideas.db`) and the human-readable Markdown notes in
sync, and how that contract changes in the upcoming portable single-document
mode. It exists so callers (and the `doctor.consistency` tool) have one
explicit reference to audit against.

## Two backends

| Backend | Status | Source of truth | Where state lives |
| --- | --- | --- | --- |
| `sqlite` (default) | Shipped | SQLite database | `<vault>/.flywheel/ideas.db` plus one Markdown file per idea / assumption / outcome / council session under `<vault>/ideas/`, `<vault>/councils/`, etc. |
| `doc` | Designed, not implemented | The Markdown file itself | One portable `.md` per idea under `<vault>/ideas-doc/`. No DB. |

The rest of this document specifies each backend in turn. The `doc` mode
section is normative even though no code implements it yet — it is the
contract the doc-mode handlers will be measured against, and it locks the
shape of the `doctor.consistency` check that ships before doc-mode does.

---

## SQLite mode

**Authoritative store:** SQLite. The Markdown files are a human-readable
mirror of DB state. When the two disagree, the DB is what the rest of the
ledger reads from; the Markdown is what humans read and what Obsidian
indexes. The two are kept aligned by the rules below.

### Per-operation consistency guarantee

| Operation | DB side | Markdown side | Consistency mechanism |
| --- | --- | --- | --- |
| `idea.create` | insert row in `ideas_notes` | write `ideas/<slug>-<id>.md` | **Strict compensating write**: if the DB insert fails after the Markdown has been written, the orphan Markdown is unlinked. (PR #85.) |
| `idea.transition` | insert `ideas_transitions` row + update `ideas_notes.state/state_changed_at` (single tx) | `patchFrontmatter` updates `state` + `state_changed_at` | **Strict compensating write**: DB transition is committed first; if the fs patch fails, the DB transition is rolled back to the prior `state`/`state_changed_at`. (handlers/transition.ts.) |
| `idea.forget` | delete `ideas_notes` row (cascades to transitions/assumptions/outcomes) | nothing | **DB-only**: user data on disk is never deleted by flywheel-ideas. The orphan Markdown is surfaced by `doctor.consistency` as `orphan_markdown`; the user removes it manually if they want. |
| `idea.freeze` | insert `ideas_freezes` row containing a snapshot JSON | nothing | **DB-only**: freezes are pre-registration anchors with no separate Markdown artifact. The snapshot JSON itself is the receipt. |
| `idea.export` | nothing | write `exports/portfolio-<ts>.md` | **Read-only on DB, write-only on fs**: export aggregates and renders; it never mutates the canonical state. |
| `assumption.declare` | insert `ideas_assumptions` row | write `ideas/<idea_id>/assumptions/<id>.md` | **Strict compensating write** (same pattern as `idea.create`). |
| `assumption.lock` / `unlock` | update `ideas_assumptions` | `patchFrontmatter` updates `locked_at` mirror field | **Best-effort mirror**: DB is authoritative; fs patch failure leaves the DB locked but the markdown stale. Surfaced by doctor as `stale_frontmatter`. |
| `assumption.forget` | delete `ideas_assumptions` row | nothing | **DB-only**: orphan markdown left intact, surfaced by doctor. |
| `outcome.log` | insert `ideas_outcomes` + propagate `needs_review=1` to related ideas (single tx) | write `ideas/<idea_id>/outcomes/<id>.md` + per-related-idea frontmatter patch | **Strict on DB-side propagation, best-effort on fs mirror**: the cascading `needs_review=1` writes are transactional; the per-idea frontmatter patches are best-effort. Mirror drift on `needs_review` surfaces as `stale_frontmatter`. |
| `outcome.undo` | update `ideas_outcomes.undone_at` + reverse propagation (single tx) | per-idea frontmatter patch to clear `needs_review` | Same as `outcome.log` — transactional DB, best-effort fs mirror. |
| `outcome.memo_upsert` | upsert `ideas_outcome_memos` row | nothing today | **DB-only**: memos are not yet mirrored to markdown. |
| `council.run` | insert `ideas_council_sessions` + N × `ideas_council_views` + N × `ideas_dispatches` (per-cell tx) | write `councils/<idea_id>/session-NN/SYNTHESIS.md` + per-view notes | **Best-effort, write-then-record**: each cell's markdown is written before its DB view row is inserted; partial failures leave a session in `incomplete_council_session` state, surfaced by doctor. Reversibility is bounded — the dispatch log records what was attempted. |
| `company.track` | insert `ideas_company_runs` + per-company rows | write `reports/company-runs/<run_id>/*.md` | **Best-effort**: bulk operation; partial failures recorded against `ideas_company_run_members`. Re-running is safe and idempotent at the run-id level. |
| `company.apply_outcomes` | insert `ideas_outcomes` + propagation (same as `outcome.log`) | same as `outcome.log` | Same guarantees as `outcome.log`. |
| `import.scan` | insert `ideas_import_sources` + `ideas_import_candidates` | write `imports/<source_id>/*.md` (staging only) | **Strict-staging**: scan never writes to the canonical vault. Promote is a separate, consented step. |
| `import.promote` | insert `ideas_notes` + assumptions per candidate | write canonical `ideas/...` markdown | **Strict compensating write** (same as `idea.create`). |

### What `doctor.consistency` detects (SQLite mode)

| Issue kind | What it means |
| --- | --- |
| `missing_markdown` | DB row exists but its `vault_path` file is missing. Likely cause: Markdown deleted outside flywheel-ideas. Repair: `idea.forget`, or restore the file from VCS, or accept and ignore. |
| `orphan_markdown` | `.md` file exists under `ideas/` (or similar) with no DB row. Likely cause: `idea.forget` was used (DB row removed but file intentionally kept), or external edits created the file. Repair: delete the file manually, or re-import. |
| `stale_frontmatter` | DB and Markdown disagree on a mirrored field (`state`, `state_changed_at`, `locked_at`, `needs_review`). Likely cause: a `patchFrontmatter` write failed silently in a best-effort path, or the file was edited externally. Repair currently manual — see "Repair actions" below. |
| `incomplete_council_session` | A `council.run` started but did not record a completion timestamp. Likely cause: the process was killed mid-run, or a cell crash propagated. Repair: deferred (see below). |
| `failed_council_view` | A view row has a non-null `failure_reason`. The session itself can still be intact; this surfaces per-cell failures that did not abort the session. Read-only signal. |

### Repair actions

`doctor.consistency` is **read-only by design**. Optional repair actions
(unlinking orphan markdown, re-applying frontmatter mirrors, closing
incomplete sessions) are deliberately deferred until the read-only report
has been used long enough to know which repairs are worth automating. The
guiding rule: a repair is worth automating once we have surfaced the issue
in real use, confirmed the right fix, and verified the fix is the same
fix every time. Any new repair lands behind a `repair: true` flag, never
implicit.

---

## Doc mode (designed; not yet implemented)

**Authoritative store:** the single `.md` file. There is no SQLite database
in doc mode. The file IS the state.

### File shape (canonical)

Each idea is one Markdown file under `<vault>/ideas-doc/<slug>-<id>.md` with
the following stable structure:

```markdown
---
id: idea-<nanoid>
type: idea
backend: doc
state: nascent | explored | evaluated | committed | validated | refuted | parked | killed
title: <one line>
created_at: <iso>
updated_at: <iso>
---

## Claim
<the bet>

## Test condition
<what would refute it>

## Assumptions
### Assumption: <assumption-id>
```yaml
text: ...
load_bearing: true|false
signpost_at: <iso>
status: open | locked | refuted | validated
```

## Evidence log
- <iso> — <one-line entry>

## Verdict
<state: pass | fail | parked>
<rationale>

## Lesson
<final memo, populated when verdict is fail>
```

Round-trip rule: `parse(file) → struct → render(struct)` must be
byte-identical. This is the format conformance test that gates every
doc-mode handler.

### Per-operation consistency guarantee (doc mode)

| Operation | Doc-mode behavior |
| --- | --- |
| `idea.create` | Write a new `.md` with frontmatter + empty section scaffold. No DB. |
| `idea.read` | Parse the file; return frontmatter + sections. |
| `idea.list` | Scan `<vault>/ideas-doc/`; read frontmatter from each file. No DB. |
| `idea.transition` | Patch `state` + `updated_at` in frontmatter; update the `Verdict` block in place (transitions move the existing block, they do not append new ones). |
| `assumption.declare` | Append an `### Assumption: <id>` sub-block to the `## Assumptions` section. |
| `outcome.log` | Set the `## Verdict` block contents. The doc-mode variant accepts a verdict (`pass | fail | parked`) and rationale only — propagation, cascading, and `needs_review` flags are not supported. |
| `council.run` | **Not supported.** Returns `not_supported_in_doc_mode` with a suggestion to switch the idea to `sqlite` backend. |
| `idea.freeze`, `idea.export`, `idea.report`, `idea.ancestry`, `idea.descendants`, `idea.shared_assumptions` | **Not supported.** Same error. |
| `company.*` | **Not supported.** SEC corpus tracking requires the relational ledger. |

The honest scope of doc mode is portable single-file lifecycle for
embedding ideas into other apps. Full Flywheel — multi-bet cascading
refutation, council dispatch, SEC tracker — keeps requiring SQLite.

### What `doctor.consistency` will detect (doc mode)

| Issue kind | What it means |
| --- | --- |
| `doc_round_trip_failed` | Parse-then-render produced a non-byte-identical result. The file violates the format contract. Likely cause: hand-edit broke a fenced block or omitted a required section. |
| `doc_state_verdict_mismatch` | Frontmatter `state` is `validated`/`refuted` but the `## Verdict` block is empty or contradicts the state. |
| `doc_transition_out_of_order` | Implied transition timestamps (frontmatter `created_at` vs `updated_at` vs evidence-log dates) are non-monotonic. |
| `doc_malformed_section` | A required section (`## Claim`, `## Test condition`, `## Verdict`) is missing, or an `### Assumption: <id>` block is malformed. |

When `doctor.consistency` is invoked, callers will be able to pass
`mode: 'sqlite' | 'doc' | 'both'` (default `'sqlite'` until doc mode
ships). The two modes use independent issue kinds — there is no shared
"DB ↔ md mirror" invariant in doc mode because there is no DB.

---

## Why no shared abstraction

The roadmap considered a `RepositoryBackend` interface that both modes
would implement. We deliberately chose not to build one. SQLite is read
and written from 8+ modules (`export.ts`, `lifecycle.ts`, `lineage.ts`,
`decision-delta.ts`, `council-effectiveness.ts`, `sec-ledger-report.ts`,
`consistency-doctor.ts`, the per-tool handlers). A real abstraction has
to cover all of them or it is a leaky one that pretends to support doc
mode while half the system still hard-requires SQLite.

Instead: doc mode ships as a parallel codepath at the MCP tool boundary
(`backend: 'sqlite' | 'doc'` flag) that dispatches to a separate
`doc-mode.ts` handler set. Operations not supported in doc mode fail
loudly with `not_supported_in_doc_mode`. This is honest about the
alpha scope and avoids a months-long refactor pretending to be a wedge.
