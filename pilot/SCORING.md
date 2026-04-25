# Cite-rate scoring runbook

How to score the pilot once the user has run `council.run` against each
seeded idea.

## What we're measuring

For each idea in the corpus, history has already shown which load-bearing
assumption turned out wrong. The pilot question is: **does the council's
critique cite that exact assumption?**

We are NOT asking whether the council "correctly predicts" the future — that
is unfalsifiable on a per-run basis. We are asking whether the council, given
N declared assumptions on an idea, surfaces the one that ended up mattering
disproportionately in its critique.

The cite-rate hypothesis is pre-registered in
`tech/flywheel/flywheel-ideas/pilot-protocol-python-2-3.md` (in the user's
vault, not this repo). v0.2 GA gates on **≥70% cite rate** across 10 council
runs.

## Inputs

- `pilot/pilot-corpus.python-2-3.json` — ground truth: which assumption was
  refuted by which historical event.
- `pilot/last-seed.json` — written by `seed-corpus.mjs`. Maps
  `corpus_id` → real DB `db_id` for each assumption.
- The pilot vault: `/tmp/flywheel-pilot-python23/` — contains
  `councils/<idea_id>/session-NN/SYNTHESIS.md` after each `council.run`.

## Per-idea procedure

For each `entries[i]` in `last-seed.json` whose
`assumptions[*].outcome` is `refuted` or `partially_refuted`:

1. Find the SYNTHESIS.md and per-cell view notes under
   `<vault>/councils/<idea_id>/session-NN/`.
2. Search the views for the assumption text (or its key noun phrase). For
   example, for `asm-3000-quick-migration` ("The Python community will
   migrate to Python 3 within a 2–3 year window"), match on phrases like
   "migration timeline", "2–3 year", "ecosystem velocity".
3. A cite counts if **any** persona view materially attacks the assumption.
   Synthesis-only mentions count when synthesis quotes a view's attack.
4. Record per-idea: `{idea_id, refuted_assumption_id, cited: true|false, evidence_quote}`.

## Aggregate

```
cite_rate = (# refuted assumptions cited) / (# refuted assumptions in corpus)
```

Refuted-or-partially set across the corpus:
- pep-3000 / asm-3000-quick-migration (refuted)
- pep-3000 / asm-3000-cleanup-worth-pain (partially_validated — count as edge case, do not score)
- pep-3137 / asm-3137-no-u-prefix (refuted)
- pep-3131 / asm-3131-no-confusion-attacks (partially_refuted)
- pep-0358 / asm-0358-no-bytes-formatting (refuted)

That's **4 in-scope assumptions**. With 10 councils per idea (per-protocol),
the denominator becomes 40 assumption-attempts. Cite rate ≥ 28/40 (70%) =
v0.2 GA passes.

The control assumption (`asm-3105-mechanical-2to3`, validated) gets 10
councils too — used as a NEGATIVE check. If the council cites it as a
fragile assumption with the same frequency as the refuted ones, the test
has no signal — councils just cite everything.

## Why not automate the cite check

The match is semantic, not lexical. "u'' literals are safe to remove"
versus "removing the unicode literal will cause backporting friction"
are the same assumption phrased differently — a regex won't catch it,
and faking it with embeddings would just push the question down a level
(what threshold counts as a cite?). Better to score by hand the first
time and harden later if the pilot survives.
