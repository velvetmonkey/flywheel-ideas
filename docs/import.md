# Bulk import

The `import` tool surface seeds the vault from external decision corpora. The tool's two-step flow lets you scan a corpus into a staging area before any vault writes happen, then promote candidates one at a time with explicit consent.

## Why bulk import

The rest of the flywheel-ideas tool surface assumes you write decisions one at a time — an idea created by hand, an assumption declared by hand, a council run on demand. That's the right shape for the closed loop, but it's not the right shape for *seeding*. Two cases where seeding matters:

1. **Bootstrapping from existing decision records.** You already have ADRs in your repo, RFCs in a markdown tree, a Notion database of past calls — you don't want to retype them all.
2. **Wedge / pilot tests.** The cite-rate pilot and Phase 3 wedges run against corpora of 5–10 decisions each. The fastest way to ingest a JSONL corpus into a fresh vault is the `csv-corpus` adapter.

## The two-step flow

The flow is structured so that scanning a corpus *never* writes to the canonical vault:

```
import.scan({adapter, source})
    ↓
<vault>/imports/<source-id>/                 # candidates land here, NOT in the vault root
    ├── candidate-001.md                     # one markdown file per candidate
    ├── candidate-002.md
    └── …
    ↓
import.list({source_id})                     # review what landed
    ↓
import.promote({candidate_id, as: 'idea'|'assumption'|'outcome'})
    ↓
<vault>/ideas/, <vault>/assumptions/, …      # NOW the canonical vault is written
```

The `imports/` directory acts as a staging tier. Candidates carry a `state` (`'new' | 'duplicate' | 'promoted' | 'rejected'`) and a `confidence` score (`0..1`). Duplicates against the existing vault — detected via flywheel-memory's semantic search at scan time — are flagged automatically and require `override_duplicate: true` on `promote` to land.

Reads (`import.list`, `import.read`) and rejects (`import.reject`) are lightweight; only `promote` produces vault writes.

## The three adapters shipped today

### `github-structured-docs` (v0.2 GA)

Scans RFC-822-headered markdown trees — the format used by Python PEPs, Rust RFCs, Kubernetes KEPs, and similar.

```
import.scan({
  adapter: "github-structured-docs",
  source: "python/peps@main:peps/"        # or "owner/repo", "owner/repo@ref"
})
```

The adapter pulls each markdown file under the source path, parses the RFC-822 header (`PEP:`, `Title:`, `Status:`, `Created:`, `Replaces:`, etc.), maps `Status` → `import_state` heuristically (`Final` → `new`, `Withdrawn`/`Rejected` → `new` flagged, etc.), and computes a `confidence` score keyed off whether the entry has a structured header at all (`confidence: 0.9` for a clean RFC-822 header, lower for malformed entries).

The python-2-3 cite-rate pilot's `pilot/pilot-corpus.python-2-3.json` is a hand-curated subset of what this adapter would emit if pointed at the python/peps tree — proof of the format's tractability.

### `csv-corpus` (v0.2.1)

JSONL adapter. The "paste any decision corpus into a `.jsonl` file and run a council against it" path. Used for the Phase 3 wedge tests.

```
import.scan({
  adapter: "csv-corpus",
  source: "/abs/path/to/corpus.jsonl"      # or "file:///abs/path/to/corpus.jsonl"
})
```

Expected line shape (one decision per line):

```json
{
  "decision_id": "obs-001-shape-predictor",
  "title": "Use a shape-predictor for ML classification",
  "body": "Full decision context — what was decided and why",
  "load_bearing_assumptions": [
    {
      "id": "asm-001-five-shapes",
      "text": "Five shapes are sufficient for the classifier's domain coverage",
      "outcome_tag": "refuted",
      "most_vulnerable_assumption": true
    }
  ]
}
```

Source URI shape on the resulting candidate's frontmatter: `csv-corpus://abs/path#row=N`.

The full schema (with all optional fields and the `outcome_tag` allowlist) is in [`pilot/corpus-schema.md`](../pilot/corpus-schema.md).

### `github-repo-adr` (v0.3.0, scoped to konflux-format)

Pulls Architecture Decision Records from a GitHub repo. Per the Phase 3c census ([`pilot/wedge-research.adr-availability.md`](../pilot/wedge-research.adr-availability.md)), the adapter is **scoped to the konflux-ci/architecture frontmatter convention** — a general "scan any GitHub repo" framing was rejected during planning as over-promising. Repos following the konflux convention can use it; others can't, and the adapter rejects the source up front rather than silently emit garbage candidates.

```
import.scan({
  adapter: "github-repo-adr",
  source: "konflux-ci/architecture"               // → ref=main, path=ADR/
  // or "konflux-ci/architecture@v1.2.3"          // explicit ref
  // or "konflux-ci/architecture@main:docs/adr/"  // custom path
})
```

The required konflux frontmatter shape:

```yaml
---
title: "28. Handling SEB Errors"
status: Superseded                          # Accepted | Replaced | Superseded | Deprecated
superseded_by: ["0032"]                     # also accepts string, number, comma-separated string
topics:                                     # optional
  - integration-tests
applies_to:                                 # optional
  - snapshot-environment-binding
---
```

Per ADR, the adapter emits:

- **One `idea` candidate** — the ADR itself, body assembled from Context + Decision + Consequences sections
- **One `assumption` candidate** when a `## Decision` section is present and substantive (≥30 chars). Linked to the idea via `extractedFields.parent_idea_source_uri`.
- **One `outcome` candidate** when:
  - `status: Replaced` or `Superseded` *and* `superseded_by:` is set → outcome refers to the superseder ADR, refutes the assumption (confidence 0.95)
  - `status: Deprecated` → outcome refutes the assumption with no superseder reference (confidence 0.85)
  - `status: Accepted` → no outcome (assumption stays declared)

Source URIs:

- Idea: `github-repo-adr://owner/repo@ref:ADR/NNNN-title.md#idea`
- Assumption: `github-repo-adr://owner/repo@ref:ADR/NNNN-title.md#assumption`
- Outcome: `github-repo-adr://owner/repo@ref:ADR/NNNN-title.md#outcome`

#### Hardening

The adapter applies four hardening choices that diverge from a naïve implementation:

1. **Per-file skip, not per-source rejection.** A single malformed ADR mid-stream (typo, missing field, bad status value) logs a stderr warning and the scan continues. Only if the *first 3 ADRs* all fail validation does the adapter reject the source — at that point the user is clearly running it against a non-konflux-format repo, not encountering one bad file in a good repo.
2. **Frontmatter validation strict on field names but permissive on shape.** `superseded_by` accepts string, string[], number, comma-separated string. `status` normalises case-insensitively (`accepted` → `Accepted`). Capitalised field names (`Title:`, `Status:`) auto-normalise. Candidates that needed any normalisation carry `extractedFields.normalised: true` and confidence drops to 0.8 — a signal to the reviewer that the source isn't pristine.
3. **`GITHUB_TOKEN` auth.** Set `GITHUB_TOKEN` in the env to upgrade from 60 req/hour (unauthenticated) to 5000 req/hour. The adapter emits a one-shot stderr hint when running unauthenticated.
4. **Rate-limit responses parse the `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers** and surface a clear retry-after error rather than throwing a generic 403.

#### What's not in scope

- ADR formats other than konflux's frontmatter convention — see [`pilot/wedge-research.adr-availability.md`](../pilot/wedge-research.adr-availability.md). Repos using `# Status: ` body-section conventions, MADR templates, or arc42's variant won't parse and the source will be rejected.
- Auto-promotion. Even with high-confidence Replaced/Superseded outcomes, every promotion goes through `import.promote` with explicit user consent.


## Per-candidate confidence + dedup

Every adapter emits `confidence: 0..1` per candidate. The persister runs a dedup check at scan time using flywheel-memory's semantic search (when the bridge is up) — candidates whose title or body match an existing vault note above a similarity threshold are flagged `state: 'duplicate'` with the matched note's id.

`import.promote` rejects a `duplicate`-state candidate unless `override_duplicate: true` is passed. This is the one place the tool surface refuses to obey blindly: a duplicate is the most likely user error, and silently writing it would corrupt the citation graph.

## Worked example — the python-2-3 wedge subset

```bash
# 1. Author the corpus (5 entries, JSONL, one decision per line)
cat > /tmp/wedge.jsonl <<'EOF'
{"decision_id":"pep-3000","title":"Deprecate Python 2","body":"...","load_bearing_assumptions":[{"id":"asm-pep-3000-mig-window","text":"Migration in <5 years","outcome_tag":"refuted","most_vulnerable_assumption":true}]}
{"decision_id":"pep-3105","title":"print as a function","body":"...","load_bearing_assumptions":[{"id":"asm-pep-3105-syntax","text":"Function form is strictly clearer","outcome_tag":"validated"}]}
EOF

# 2. Scan into a fresh vault
PILOT_VAULT=/tmp/flywheel-pilot-wedge \
  node pilot/seed-corpus.mjs --corpus /tmp/wedge.jsonl
# (Equivalent to import.scan + per-candidate import.promote, scripted)

# 3. List what landed
sqlite3 /tmp/flywheel-pilot-wedge/.flywheel/ideas.db \
  "SELECT id, title, state FROM ideas_notes;"

# 4. Run councils against them
PILOT_VAULT=/tmp/flywheel-pilot-wedge \
  node pilot/run-councils.mjs

# 5. Score
PILOT_VAULT=/tmp/flywheel-pilot-wedge \
  node pilot/score-cites-auto.mjs --corpus /tmp/wedge.jsonl
```

`pilot/seed-corpus.mjs` is a programmatic shortcut that calls `import.scan` and `import.promote` in sequence (skipping the user-consent gate, which is appropriate for pilot harnesses). For interactive use through Claude Code or another MCP client, the `import.promote` gate is the right shape — you review each candidate before it lands.

## Company tracker

`sec-company` is the low-level SEC import adapter behind the `company` MCP tool. It scans 10-K and 10-Q filings, extracts eligible Risk Factors and MD&A sections, emits recurring risk-theme assumptions, and stages explicit realized-risk outcome candidates.

```
import.scan({
  adapter: "sec-company",
  source: "ticker:AAPL",
  scan_config: { years: 10, forms: ["10-K", "10-Q"] }
})
```

For normal use, prefer the higher-level company workflow:

```
company.track({
  companies: ["AAPL", "MSFT", "NVDA"],
  years: 10,
  forms: ["10-K", "10-Q"],
  confirm: true
})
```

For sector-scale dogfood, use the reusable bundle driver:

```
npm run build
export FLYWHEEL_IDEAS_IMPORT_NETWORK=1
export FLYWHEEL_IDEAS_SEC_USER_AGENT="your-app-name contact: you@example.com"
node scripts/sec-sector-lifecycle-bundle.mjs
```

The driver tracks 10 companies in each of the 11 GICS sectors, persists per-company run-member status for resume, and writes `reports/company-runs/<run_id>/index.md` as the top-level Flywheel-linked table of contents. Cross-sector pages compare mechanism-level patterns, not just shared SEC risk keywords.

Outcome safety rule: the adapter may detect explicit realized-risk language, but it does not call `outcome.log`. Those candidates are staged and become canonical outcomes only through:

```
company.apply_outcomes({ run_id: "...", min_confidence: 0.9, confirm: true })
```

The regression fixture corpus lives at `packages/core/test/fixtures/sec-company/public-tech/`.
It contains reduced real SEC text snapshots for AAPL, MSFT, and NVDA: latest 10-K,
latest 10-Q, and one older 10-K per company. Refresh it with:

```
FLYWHEEL_IDEAS_SEC_USER_AGENT="flywheel-ideas fixture refresh contact: you@example.com" \
  node scripts/refresh-sec-company-fixtures.mjs
```

The refresh script writes only eligible sections, not full SEC filings, so the
tests stay deterministic without committing large raw HTML files.

---

*Last updated: 2026-05-02.*
