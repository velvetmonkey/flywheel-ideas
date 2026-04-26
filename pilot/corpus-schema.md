# Pilot corpus schema

The cite-rate pilot scores a council against a corpus of historical decisions
whose outcomes are known. A corpus is a JSON file of one shape; the same shape
drives `seed-corpus.mjs`, `run-councils.mjs`, and the scoring scripts.

`pilot/pilot-corpus.python-2-3.json` is the reference corpus (Py3K-era PEPs
paired with their post-decision refutations). New corpora go in `pilot/` and
are passed to the scripts via `--corpus <path>`.

## Top-level

```jsonc
{
  "$schema_version": 1,         // integer; bumped on breaking schema changes
  "$domain": "python-2-3",      // free-form label, used in stderr only
  "$comment": "...",            // optional, for humans
  "entries": [ /* see below */ ]
}
```

`$schema_version` is the only field the scripts validate. `$domain` is a
human-readable label printed in stderr; it MUST NOT be used as a key, prefix,
or formatter — pilot scripts treat it as opaque.

## `entries[]`

```jsonc
{
  "decision_id": "pep-3000",      // required, unique per corpus
  "title": "...",                 // required, human-readable
  "status": "Final",              // optional free-text (e.g. "Final", "Accepted")
  "load_bearing_assumptions": [
    {
      "id": "asm-3000-quick-migration",  // required, unique within entry
      "text": "...",                     // required, the assumption itself
      "outcome": "refuted",              // required, see Outcomes
      "outcome_evidence": "...",         // required when outcome is scoring-eligible
      "outcome_refs": ["pep-0466"]       // optional, free-form pointer list
    }
  ]
}
```

### `decision_id`

Lowercase, kebab-case identifier. The convention for the python-2-3 corpus is
`pep-NNNN`; for other domains it is whatever maps cleanly to your data
(`adr-0023`, `gh-issue-1245`, `obj-001`). Pilot scripts treat it as an opaque
string — no upper-casing, no regex, no formatting.

### `outcome`

One of:

| Value | Meaning | Scored? |
|---|---|---|
| `refuted` | History overturned the assumption. | yes |
| `partially_refuted` | History showed the assumption was partially wrong (a meaningful sub-case broke). | yes |
| `validated` | History confirmed the assumption. | no (control case) |
| `partially_validated` | History confirmed most of the assumption; a sub-case broke. | no |

Only `refuted` / `partially_refuted` assumptions are scored against the
council's `most_vulnerable_assumption` field. The other outcomes exist so
control cases can sit in the same corpus without being mistaken for misses.

### `outcome_evidence`

Free-text description of *what* refuted (or validated) the assumption.
**Not surfaced to the council** — it is the answer key.

### `outcome_refs`

Optional free-form pointer list (PEP IDs, ADR IDs, URLs). Pilot scripts do not
parse it. It exists for human readers reproducing the result.

### `load_bearing_assumptions[].id`

Unique within the entry. Convention is `asm-<decision-suffix>-<slug>`.

## Authoring a new corpus

1. Pick a `$domain` label and create `pilot/<domain>.json` (or `.jsonl` if
   using the `csv-corpus` import adapter — see Phase 2 of the widening plan).
2. For each decision, write the entry shape above. Keep `outcome_evidence`
   substantive — that text is the answer key the scoring does not use, but
   future readers (you, six months later) need it to re-judge.
3. Aim for ≥1 `refuted` or `partially_refuted` assumption per entry, plus
   optional `validated` controls.
4. Run `node pilot/seed-corpus.mjs --corpus pilot/<your-corpus>.json`.
5. Run `node pilot/run-councils.mjs`.
6. Run `node pilot/score-cites-auto.mjs --corpus pilot/<your-corpus>.json`.

## What the scripts do NOT assume

- No upper-casing or canonical format on `decision_id` (it's whatever you wrote).
- No `pep-NNNN` regex anywhere — the python-2-3 corpus is one possible domain,
  not a baked-in shape.
- No domain-specific UI strings — stderr labels say "decision" / "decision-id".

If you find a script that *does* assume PEP shape, that's a bug — file it.
