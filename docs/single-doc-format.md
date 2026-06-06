# Single-document format (doc-mode contract)

Doc mode represents one idea as a single portable Markdown file. The file
**is** the state — there is no SQLite database, no sidecar JSON, no
external index. Other apps embedding flywheel-ideas as a feature read
and write this format directly; the file is the contract.

This document is normative. The format conformance test in
`packages/core/test/single-doc-format.test.ts` (added in the doc-mode
wedge) enforces it. Implementation lives behind `backend: 'doc'` on
the `idea` / `assumption` / `outcome` MCP tools.

## File location and naming

```
<vault>/ideas-doc/<slug>-<id>.md
```

- `<slug>` — kebab-cased title (whitespace → `-`, lower-case, ASCII
  letters / digits / hyphens only).
- `<id>` — same nanoid format as SQLite mode (`idea-<8 chars>`).
- One file per idea. No sub-folders. Files are independent.

## Frontmatter

```yaml
---
id: idea-<nanoid>
type: idea
backend: doc
state: nascent | explored | evaluated | committed | validated | refuted | parked | killed
title: <one-line>
created_at: <ISO-8601 UTC>
updated_at: <ISO-8601 UTC>
---
```

- `id` and `type` are immutable after creation.
- `backend: doc` is required and identifies the file as doc-mode. Files
  without this field are not parsed as doc-mode ideas by `idea.list`.
- `state` is the canonical state. `idea.transition` updates it in place.
- `title` mirrors the H1 below; renamers update both. (Round-trip rule
  treats them as one value; out-of-sync titles fail
  `doc_round_trip_failed`.)
- `created_at` is immutable. `updated_at` is touched on every mutation.

## Section order (canonical)

Every doc-mode file has these sections in this order. Missing required
sections fail `doc_malformed_section`. Empty sections are written as the
header only.

| # | Header | Required | Purpose |
| --- | --- | --- | --- |
| 1 | `# <title>` | yes | Title H1; matches frontmatter `title`. |
| 2 | `## Claim` | yes | The bet, in one or two sentences. |
| 3 | `## Test condition` | yes | What outcome would refute the bet. |
| 4 | `## Assumptions` | yes (may be empty) | Zero or more `### Assumption: <id>` sub-blocks. |
| 5 | `## Evidence log` | yes (may be empty) | Append-only dated entries. |
| 6 | `## Verdict` | yes (may be empty) | Single verdict block; transitions move it, do not append. |
| 7 | `## Lesson` | yes (may be empty) | Populated when verdict is `fail`. |

### Assumption sub-blocks

Each assumption is a `### Assumption: <assumption-id>` sub-header with a
fenced YAML block:

```markdown
### Assumption: asm-9k3xv2pq
~~~yaml
text: Inventory risk increases when geopolitical export restrictions land
load_bearing: true
signpost_at: 2026-09-01T00:00:00Z
status: open
~~~
```

- `<assumption-id>` is `asm-<8 chars>` (nanoid).
- `status` is one of `open | locked | refuted | validated`.
- `signpost_at` is optional; ISO-8601 UTC when present.
- The fenced block uses triple-tilde fences to avoid colliding with body
  prose that contains triple backticks.

### Evidence log

```markdown
## Evidence log
- 2026-04-18T14:22:00Z — NVDA Q1 FY25 filing cites $4.5B H20 inventory charge.
- 2026-05-02T09:11:00Z — Author follow-up: ordered to retract export licenses confirmed.
```

- Each entry is a [[bullets|bullet]] of the form `- <ISO-8601 UTC> — <one-line note>`.
- Order is chronological (oldest first). Timestamps must be monotonically
  non-decreasing within the section; violations fail
  `doc_transition_out_of_order`.

### Verdict block

```markdown
## Verdict
state: fail
rationale: Export controls turned demand risk into a quantified
inventory write-down, refuting the "inventory risk manageable" claim.
```

- Exactly one verdict block, or empty (header only).
- `state` is one of `pass | fail | parked`. (Independent from frontmatter
  `state`; the frontmatter `state` is the lifecycle marker, the verdict
  `state` is the final adjudication on the claim.)
- Frontmatter `state` must be [[consistency|consistent]] with verdict `state`: if
  frontmatter is `validated`, verdict must be `pass`; if `refuted`,
  verdict must be `fail`; if `parked`, verdict must be `parked`.
  Mismatches fail `doc_state_verdict_mismatch`.

## Round-trip rule

The single non-negotiable invariant:

```
render(parse(file)) === file   // byte-identical
```

Doc-mode handlers parse the file to an in-memory struct, mutate the
struct, and re-render the file. The re-rendered output must be
byte-for-byte identical to the input when no logical change has been
made. This means:

- Section headers always use exactly the casing shown above.
- Empty sections render as the header line + a single trailing newline.
- Fenced YAML blocks use `~~~yaml` … `~~~` (triple-tilde), never
  triple-backtick.
- Trailing whitespace on lines is stripped on render.
- The file ends with exactly one `\n`.
- Lists in `## Evidence log` use `- ` (hyphen-space) at column 0.

`doctor.consistency` with `mode: 'doc'` runs round-trip on every file
and flags violations as `doc_round_trip_failed`.

## Backend boundary

Doc mode is the **embeddable lifecycle** for a single idea. The [[features]]
that require cross-idea state — council dispatch, [[outcome]] propagation,
lineage / ancestry / descendants, shared-assumption detection, SEC
company tracking — are SQLite-only. The corresponding actions return
`not_supported_in_doc_mode` when called with `backend: 'doc'`.

See [`docs/consistency.md`](./consistency.md) for the full per-action
matrix and reasoning.

## Migration

Existing SQLite-mode ideas can be exported into doc-mode files via
`idea.export_doc({ id })` (added in the doc-mode wedge). One file per
idea, byte-conformant to this spec. Import-back from doc to SQLite is
deliberately deferred — the alpha story is "carry an idea out of the
ledger and into other apps," not "round-trip into the council loop."

## Example (canonical)

```markdown
---
id: idea-7q2xv9bn
type: idea
backend: doc
state: refuted
title: NVDA inventory risk is manageable through demand-side hedging
created_at: 2026-03-04T11:00:00Z
updated_at: 2026-05-09T16:42:00Z
---

# NVDA inventory risk is manageable through demand-side hedging

## Claim
NVIDIA can absorb a sudden export-control shock without a material
inventory write-down because demand-side hedging (long-cycle contracts +
hyperscaler diversification) absorbs the front-end pressure.

## Test condition
A filing within 18 months disclosing an inventory or
purchase-obligation charge directly attributed to export restrictions on
H20-class accelerators.

## Assumptions
### Assumption: asm-4p1cnz3k
~~~yaml
text: Hyperscaler demand diversification offsets single-region demand collapse
load_bearing: true
signpost_at: 2026-09-30T00:00:00Z
status: refuted
~~~

## Evidence log
- 2026-04-18T14:22:00Z — NVDA Q1 FY25 filing cites $4.5B H20 inventory and purchase-obligation charge.
- 2026-05-02T09:11:00Z — Author confirms charge is licence-restriction driven, not demand-shock driven.

## Verdict
state: fail
rationale: Export-control geometry turned demand risk into a quantified
write-down inside the test window. Hedging did not absorb the front
edge of the shock.

## Lesson
Geopolitical access constraints can collapse demand-side hedging before
the commercial opportunity fully disappears. Inventory-risk assumptions
sitting downstream of export-controlled SKUs should carry a tighter
signpost than diversified ones, regardless of demand-side hedging.
```
