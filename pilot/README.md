# Pilot infrastructure

Reproducible scripts for the v0.2 cite-rate pilot. Exercises the published
`@velvetmonkey/flywheel-ideas` binary against an isolated test vault — never
the user's real Obsidian vault.

## Layout

- `pilot-corpus.python-2-3.json` — registry of decision PEPs + their
  load-bearing assumptions, each annotated with the historical outcome
  (refuted / validated / partially_*). Hand-curated ground truth.
- `scan-peps.mjs` — drives `import.scan` against the fixture PEP set
  via the published binary. Confirms the import pipeline works.
- `seed-corpus.mjs` — `idea.create` + `assumption.declare` for every
  corpus entry into an isolated pilot vault. Writes the
  `corpus_id → db_id` map to `last-seed.json`.
- `run-councils.mjs` — fires `council.run` × 10 per seeded idea, mode
  rotation per protocol (4 pre_mortem + 3 standard + 3 steelman).
  Real CLI dispatches. Resumable via `last-councils.json`.
- `score-cites.mjs` — interactive hand-scorer. For each
  (idea, refuted-assumption, session) triple, prints the assumption
  text + synthesis side-by-side and takes y/n. Writes `last-scores.json`.
- `fixtures/python-2-3-peps/` — frozen RST snapshots so scans are
  deterministic without network.

## Pilot vault

Default: `/tmp/flywheel-pilot-python23/`. Override with `PILOT_VAULT=/path`.

```bash
mkdir -p /tmp/flywheel-pilot-python23/.flywheel
node pilot/scan-peps.mjs
```

## Why a separate vault

The cite-rate pilot writes ~10 ideas + their councils' SYNTHESIS.md +
per-cell view notes. That's a lot of test artifacts the user does not want
in their personal knowledge graph. Pilot vault is throwaway; the result
goes in a single summary note that the user copies (or links) into their
real vault.

## Running pilot stages

```bash
# 1. Sanity-check the import pipeline (writes last-scan.json)
node pilot/scan-peps.mjs

# 2. Seed the pilot vault — 5 ideas + 6 load-bearing assumptions
node pilot/seed-corpus.mjs

# 3. Run all 50 councils (5 ideas × 10 sessions). REAL API CALLS.
#    Pre-flight: SESSIONS_PER_IDEA=2 node pilot/run-councils.mjs --dry-run
#    Resume after interruption: just rerun (skips completed sessions).
node pilot/run-councils.mjs

# 4. Score each (idea, refuted-assumption, session) by hand
node pilot/score-cites.mjs

# Re-print the aggregate without re-prompting:
node pilot/score-cites.mjs --report-only
```

Outcomes from `pilot-corpus.python-2-3.json` are NOT logged on the seeded
ideas — they're the post-hoc scoring key. Logging them up front would tip
the council prompt.

≥70% cite rate across the scorable pairs = v0.2 GA gate passes.
