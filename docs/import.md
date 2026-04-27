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

## The two adapters shipped today

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

## What's not yet shipped

A planned `sec-edgar` adapter (Item 1A risk factors → assumption candidates) and a planned `github-repo-adr` adapter scoped to konflux-format ADRs are on the Phase 4 roadmap. Both passed their wedge readability gates ([`docs/pilot.md`](./pilot.md#wedge-3b--domain-readability-spot-check)) and are queued for build.

---

*Last updated: 2026-04-27.*
