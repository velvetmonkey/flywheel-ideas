# Pilot infrastructure

Reproducible scripts for the v0.2 cite-rate pilot. Exercises the published
`@velvetmonkey/flywheel-ideas` binary against an isolated test vault — never
the user's real Obsidian vault.

## Layout

- `scan-peps.mjs` — drives `import.scan` against a real GitHub PEP corpus.
  Spawns the published binary, JSON-RPC over stdio, captures candidates.
- `pilot-corpus.python-2-3.json` — registry of PEPs to import + the
  ground-truth outcome for each (refuted / validated). Read by the pilot
  protocol; written by hand from Python history.

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

1. **Scan** — `node pilot/scan-peps.mjs` populates the candidate sidecars.
2. **Promote** — selected candidates become ideas + load-bearing
   assumptions in the pilot vault.
3. **Mark outcomes** — known refutations from `pilot-corpus.python-2-3.json`
   land via `outcome.log` BEFORE councils run (this is what makes it a
   cite-rate pilot — we know what the council should be paying attention to).
4. **Council** — `council.run` per idea. **Real API calls.** User-driven.
5. **Score** — count cites of the load-bearing assumptions that history
   refuted. ≥70% = v0.2 GA gate passes.
