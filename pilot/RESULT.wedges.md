# Phase 3 wedge tests — results + Branch decision

**Status:** corpora authored + ADR census complete; council runs PENDING.

This file is published in skeleton form so the experiment design and pre-registered decision rules are visible before any API spend. The verdict sections are filled in once the wedge councils run.

**Date:** 2026-04-26.

## Why

The v0.2.0 GA result (100% session cite rate on Python 2→3) is the headline. Before widening to a multi-corpus pilot, two questions need answering:

1. **Is the cite rate measuring reasoning, or training-data recall?** Famous decisions (Google+, Quibi, Microsoft Bob, Amazon Fire Phone, New Coke) are in every model's training data along with their post-mortems. If the council scores high on famous cases, that may mean memorization, not reasoning. **Wedge 3a** answers this.
2. **Can the council parse SEC legalese / ADR boilerplate well enough to identify load-bearing risks?** Cheaper to spot-check than to build the dedicated adapters. **Wedge 3b** answers this.

A third question — **does any single OSS repo carry enough superseded ADRs to make a `github-repo-adr` adapter worth building?** — is read-only research, no API spend. **Wedge 3c.**

## Wedge 3a — Train-data leakage probe

### Design

Two synthetic-shape-matched corpora:
- `pilot/wedge-corpus.famous.jsonl` — 5 famous decisions (Google+, Quibi, Microsoft Bob, Amazon Fire Phone, New Coke), each with one load-bearing assumption tagged `refuted` per the public post-mortem.
- `pilot/wedge-corpus.obscure.jsonl` — 5 hypothetical decisions (5-shape ML classifier, shadow throttle, currency-add-to-legacy, mouse-entropy bot detector, auto-tune sampling). Synthesised to mirror the python-2-3 corpus's assumption-shape (one load-bearing-and-fragile claim per entry) but with content fictional by construction. Specific company names ("Caprivane", "Frosthaven", "Lumeyra", "Verdant Trust", "Wexham"), specific numeric thresholds, specific failure modes — not derivable from training data.

Both corpora have exactly **5 entries × 1 scorable load-bearing assumption** per entry (matching the python-2-3 entries pep-3137 / pep-3131 / pep-0358).

### Pre-registered decision rule

Compute famous and obscure cite rates separately. Compute the GAP.

| GAP | Verdict |
|---|---|
| `obscure - famous` ≥ -10pp (i.e., obscure within 10pp of famous, or higher) | **Reasoning, not recall.** Multi-corpus widening claim survives. Proceed to Phase 4 Branch A. |
| `famous - obscure` ≥ 15pp (i.e., obscure significantly underperforms famous) | **Recall dominant.** Multi-domain widening would manufacture vanity metrics. Pivot to Phase 4 Branch B (deepen python-2-3 corpus). |
| Between (-10pp..15pp gap; mixed signal) | Read prose qualitatively, decide case-by-case. Default: lean toward Branch B (more conservative). |

The `±10pp` / `15pp` thresholds are arbitrary but pre-registered. Justification: the python-2-3 per-persona rate was 79% with a ~15pp spread between modes (pre_mortem 67%, steelman 98%). A 10pp gap is below mode-driven noise; a 15pp gap is at the edge of what mode-rotation explains. Larger gaps need a non-noise explanation, and "model recalls famous post-mortems" is the obvious one.

### Run

```bash
# Famous corpus
PILOT_VAULT=/tmp/flywheel-pilot-wedge-famous \
  node pilot/seed-corpus.mjs --corpus pilot/wedge-corpus.famous.jsonl
PILOT_VAULT=/tmp/flywheel-pilot-wedge-famous \
FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1 \
PILOT_CLIS=claude,gemini \
  node pilot/run-councils.mjs
PILOT_VAULT=/tmp/flywheel-pilot-wedge-famous \
  node pilot/score-cites-auto.mjs --corpus pilot/wedge-corpus.famous.jsonl

# Obscure corpus (after teardown of /tmp/flywheel-pilot-wedge-famous if you reuse the path)
PILOT_VAULT=/tmp/flywheel-pilot-wedge-obscure \
  node pilot/seed-corpus.mjs --corpus pilot/wedge-corpus.obscure.jsonl
# ... (same run + score)
```

### Result — PENDING

| | Famous | Obscure | GAP |
|---|---|---|---|
| Per-session cite rate | TBD | TBD | TBD |
| Per-persona cite rate | TBD | TBD | TBD |

Verdict: TBD.

## Wedge 3b — Domain readability spot-check

### Design

Two small corpora with REAL text from each domain:
- `pilot/wedge-corpus.sec-readable.jsonl` — 3 Item 1A excerpts (~1500 chars each) from Apple's FY2024 10-K covering supply-chain/geopolitics, competition/R&D, and macroeconomic risk.
- `pilot/wedge-corpus.adr-readable.jsonl` — 3 ADRs from `konflux-ci/architecture`: ADR 1 (Pipeline Service Phase 1, Replaced), ADR 14 (Let Pipelines Proceed, Accepted), ADR 28 (Handling SEB Errors, Superseded).

Each entry declares a single placeholder assumption restating the implicit risk-acceptance position from the source text. Outcome tag is `validated` so the auto-scorer skips it (this is a qualitative read, not a cite-rate test).

### Test

Run **5 councils per entry** (3 SEC × 5 = 15 sessions; 3 ADR × 5 = 15 sessions). Read the prose. The question is binary per entry: does the council surface a substantive, domain-specific risk-factor reading, or does it produce generic restatement?

Pass criteria: at least 2 of 3 SEC entries and 2 of 3 ADR entries produce council prose that names at least one specific operational/technical detail from the source (e.g., for Apple supply chain: explicitly identifies single-country concentration risk in China; for konflux ADR-28: explicitly identifies the 5-minute timeout as the load-bearing parameter).

### Run

```bash
PILOT_VAULT=/tmp/flywheel-pilot-wedge-sec \
  node pilot/seed-corpus.mjs --corpus pilot/wedge-corpus.sec-readable.jsonl
PILOT_VAULT=/tmp/flywheel-pilot-wedge-sec \
SESSIONS_PER_IDEA=5 \
FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1 \
PILOT_CLIS=claude,gemini \
  node pilot/run-councils.mjs

# Then read the synthesis files in /tmp/flywheel-pilot-wedge-sec/councils/<idea>/session-NN/SYNTHESIS.md
```

Same drill for ADR.

### Result — PENDING

SEC: TBD. ADR: TBD. Branch implication: TBD.

## Wedge 3c — ADR superseded-by census

**Status:** complete. Full write-up: [`pilot/wedge-research.adr-availability.md`](./wedge-research.adr-availability.md).

**Headline:** `konflux-ci/architecture` is the only surveyed repo with a coherent supersession arc — 8-9 ADRs marked superseded/replaced, of which 4 (0008, 0015, 0016, 0028) converge on a single revised ADR (0032 — Decoupling Deployment). All other surveyed repos have ≤1 superseded ADR or use a non-markdown-frontmatter format that defeats a generic parser.

**Implication:** if Phase 4 Branch A ships, the github-repo-adr adapter should be scoped to the konflux-ci frontmatter format specifically. A general "scan any GitHub repo" framing would over-promise — only one repo in the surveyed sample meets the bar.

## Branch decision — PENDING

The Phase 4 branch will be decided after wedges 3a + 3b run and produce verdicts.

- **Branch A** (build sec-edgar + github-repo-adr): requires 3a verdict that leakage is NOT dominant AND 3b verdict that both SEC and ADR domains are readably-parseable AND 3c verdict (already in: konflux scoped only).
- **Branch B** (deepen python-2-3 corpus to 50 entries): default if 3a shows leakage dominant, regardless of 3b.
- **Branch C** (ship one adapter only): if 3b shows readability passes for one domain but not the other.

## Reproducibility

```bash
# Build
npm install && npm run build

# Phase 3 corpora are checked into pilot/.

# Phase 3a (famous + obscure) — see "Wedge 3a — Run" above.
# Phase 3b (sec + adr) — see "Wedge 3b — Run" above.
# Phase 3c (census) — wedge-research.adr-availability.md is fully reproducible from the cloned repos in /tmp/adr-census/ + the python script at /tmp/superseded-count.py (saved in conversation history).

# Score artifacts (all local, gitignored):
#   /tmp/flywheel-pilot-wedge-famous/.flywheel/ideas.db
#   /tmp/flywheel-pilot-wedge-obscure/.flywheel/ideas.db
#   pilot/last-seed.json (overwritten per wedge run)
#   pilot/last-councils.json (overwritten per wedge run)
#   pilot/last-scores.json (overwritten per wedge run)
```

To preserve scores between wedge runs, copy `pilot/last-scores.json` to `pilot/last-scores.<wedge>.json` after each scoring step.
