# Pilot — empirical evidence

flywheel-ideas claims to surface the assumption that history later refuted. This document describes the two pre-registered evaluations that test that claim and what they do and don't establish.

Both runs and their reproducibility scripts are checked into the repo. Verdicts here are summarised; full results live in [`pilot/RESULT.md`](../pilot/RESULT.md) (cite-rate pilot) and [`pilot/RESULT.wedges.md`](../pilot/RESULT.wedges.md) (Phase 3 wedges).

## Evaluation 1 — v0.2 cite-rate pilot (Python 2→3)

### What it tests

For each of 5 Python 2→3 decisions whose outcomes are public history, run the council blind and ask: *did the council, when asked to critique the decision, name the assumption that history later refuted as the most-vulnerable one?*

The 5 decisions:

| `decision_id` | Decision | Historical reversal mechanism |
|---|---|---|
| `pep-3000` | "We can deprecate Python 2 and have everyone migrated within a few years" | PEP 414 (2012) reinstated `u''` literals; Python 2.7 EOL extended from 2015 to 2020 |
| `pep-3137` | "Bytes/str cleanup: drop `u''` literals to force the migration" | PEP 414 reverses; `u''` re-allowed |
| `pep-0358` | "Bytes formatting via `%` is salvageable as `bytes.__mod__`" | PEP 461 (3.5) re-adds it after community pressure |
| `pep-3131` | "Allow non-ASCII identifiers" | Largely fine in libraries; controversial in security-sensitive code |
| `pep-3105` | "`print` becomes a function" *(control case — no reversal)* | Stayed; behaved as designed |

### How the score is computed

Auto-scored by [`pilot/score-cites-auto.mjs`](../pilot/score-cites-auto.mjs). For each council session, the persona's `most_vulnerable_assumption` field (a structured `asm-ID` reference) is checked against the corpus's `most_vulnerable_assumption` ground-truth. Two metrics:

- **Per-session cite rate.** Did *at least one* persona in the session pick the right `asm-ID`?
- **Per-persona cite rate.** Of all persona × session × CLI cells, what fraction picked it?

Pre-registered GA gate: ≥70% per-session.

### Result

**100% per-session, 79% per-persona** (49/50 sessions; 1 session timed out). PEP 3000's per-persona was 75% (the hardest, because the historical reversal involves multiple intertwined assumptions); PEP 3105 (the control) was 100% per-persona because it was correctly *not* refuted.

Per-mode breakdown was striking: **steelman 98% per-persona** (forced to defend the strongest version, the personas reasoned hardest about which assumption was actually load-bearing); **pre_mortem 67% per-persona** (mode-driven noise: "imagine it failed, reason backwards" sometimes lands on the wrong failure mode).

In sampled prose, the council names PEP 414 explicitly as the historical reversal mechanism *without it being in the council's prompt context*. That is the qualitative signal — the council isn't just pattern-matching `most_vulnerable_assumption` IDs; it's reasoning about the actual mechanism.

### Caveats

- **Single corpus.** All 5 entries are Python 2→3 PEPs. The risk that the model has read the post-mortems and is recalling rather than reasoning was the explicit motivation for the Phase 3 wedge tests below.
- **Single rater.** Cite-rate matching is structural (`asm-ID` equality), not prose-level. A persona that names the right `asm-ID` for the wrong reason still counts.
- **2-of-3 CLIs.** Codex hung partway through the original baseline run; the published 100% / 79% number is a `claude + gemini` result. The Phase 3 wedges later ran with all three after the codex `gpt-5.4` env override.
- **Cite-rate ≥70% is a published commitment, not a calibration.** The threshold was registered before the run, not chosen after.

## Evaluation 2 — Phase 3 wedges

The python-2-3 cite-rate is a real signal, but the model has read every PEP. Three pre-registered probes were designed before any further widening to falsify the strongest interpretations of the python-2-3 result.

### Wedge 3a — Train-data leakage probe

**Question:** Is the cite-rate measuring *reasoning*, or *training-data recall*?

**Setup.** Two synthetic-shape-matched corpora, 5 entries × 1 load-bearing assumption each:

- **Famous corpus** ([`pilot/wedge-corpus.famous.jsonl`](../pilot/wedge-corpus.famous.jsonl)) — 5 well-publicised post-mortems: Google+, Quibi, Microsoft Bob, Amazon Fire Phone, New Coke. Each declares one LBA tagged `refuted` per the public post-mortem. *In every model's training data* alongside its outcome.
- **Obscure corpus** ([`pilot/wedge-corpus.obscure.jsonl`](../pilot/wedge-corpus.obscure.jsonl)) — 5 hypothetical decisions made by fictional companies (Caprivane, Frosthaven, Lumeyra, Verdant Trust, Wexham). Each authored to mirror the python-2-3 LBA shape but with content fictional by construction. Specific company names, specific numeric thresholds, specific failure modes — not derivable from training data.

**Pre-registered decision rule:** GAP = `obscure_per_persona − famous_per_persona`. Reasoning if GAP ≥ −10pp; recall-dominant if `famous − obscure` ≥ 15pp.

**Result.** Famous: **100% session / 96.9% per-persona**. Obscure: **100% session / 98.0% per-persona**. **GAP = +1.1pp** (obscure marginally *higher* than famous).

The synthetic corpus narrowly beat the famous one. This outcome is incompatible with the recall hypothesis: if score were driven by the model recognising publicised post-mortems, famous should outscore obscure, not the other way around. The recall hypothesis is rejected.

### Wedge 3b — Domain readability spot-check

**Question:** Can the council parse SEC legalese / ADR boilerplate well enough to identify load-bearing risks, or does it produce generic restatement?

**Setup.** Two real-text corpora, 3 entries × 5 sessions each:

- **SEC** ([`pilot/wedge-corpus.sec-readable.jsonl`](../pilot/wedge-corpus.sec-readable.jsonl)) — 3 Item 1A risk-factor excerpts (~1500 chars each) from Apple's FY2024 10-K (supply-chain/geopolitics, competition/R&D, macroeconomic).
- **ADR** ([`pilot/wedge-corpus.adr-readable.jsonl`](../pilot/wedge-corpus.adr-readable.jsonl)) — 3 ADRs from `konflux-ci/architecture`: ADR 1 (Pipeline Service Phase 1, Replaced), ADR 14 (Let Pipelines Proceed, Accepted), ADR 28 (Handling SEB Errors, Superseded).

**Pre-registered pass criterion:** ≥2/3 entries per domain produce council prose that names at least one specific operational/technical detail from the source.

**Result.** Both **3/3 PASS.**

| Entry | Specific operational detail named in council prose |
|---|---|
| Apple supply-chain | "shared sub-tier suppliers", "customs lanes, export-control regimes", "expedited freight, duplicate inventory, emergency requalification", concentrated in East/South Asia |
| Apple competition-RD | "TSMC capacity reallocation to competitors typically takes 18–24 months"; services 70% vs. device 35–40% margins; Apple Watch cardiovascular features |
| Apple macroeconomic | "Apple grew through 2008 (5.1% GDP contraction)"; Greater China ~20% revenue; AppleCare+/iCloud+ as first-cut services in credit events; "Japanification" scenario |
| konflux ADR-0001 | "kcp APIBinding/APIExport model"; `TaskRun objects cannot sync to KCP`; OpenShift Pipelines Operator |
| konflux ADR-0014 | `TEST_OUTPUT` preserves data but not urgency; native CI pass/fail vs. annotation-as-warning; "enterprise contract" as last enforcement point |
| konflux ADR-0028 | **"fixed five-minute guess"** on provisioning latency (the wedge plan called this out specifically); SnapshotEnvironmentBindings; `ErrorOccurred` default-pessimistic state |

Council prose is substantive, not generic restatement. Both domains are readable.

### Wedge 3c — ADR superseded-by census

**Question:** Which OSS repos have a coherent ADR supersession arc — i.e., a reasonable scope for a future github-repo-adr adapter?

**Method.** Shallow-cloned 12 repos (kubernetes, opentelemetry, kserve, opentofu, gardener, cilium, knative, falcoctl, knative-extensions, konflux-ci, prometheus-operator, jaegertracing) + scripted scan for ADRs with `status: superseded` or `status: replaced` in markdown frontmatter or section headings.

**Result.** Only `konflux-ci/architecture` has a coherent supersession arc — 8-9 ADRs marked superseded/replaced, of which 4 (0008, 0015, 0016, 0028) converge on a single revised ADR (0032 — Decoupling Deployment). All other surveyed repos have ≤1 superseded ADR or use a non-markdown-frontmatter format that defeats a generic parser.

**Implication.** A future `github-repo-adr` adapter must scope to repos following the konflux-format convention. A general "scan any GitHub repo for ADRs" framing would over-promise on the surveyed sample.

### Phase 3 verdict — Branch A

All three pre-registered gates cleared. Phase 4 builds the two adapters: `sec-edgar` (Item 1A → assumptions) and `github-repo-adr@konflux-scope` (`status: superseded` + `superseded_by:` → outcome candidates).

## Failure modes observed

130 sessions × 6 views = 780 dispatches across the wedges. Failure rate 4.6% session-level:

- **1 full-session timeout** (google-plus #7 steelman, 620s, hit `tools/call#10` deadline). Recorded as a stub with `error: "timeout: tools/call#10"`. Reroll on resume would retry. Most likely cause: steelman mode produces longer output that hits the JSON-RPC layer timeout. Phase 4 hardening item: audit the per-tool-call deadline.
- **5 single-view `parse` failures**, all `gemini`. 4–6% of sessions had one of six views fail; the other 5 views persisted and the session was still scored cleanly. This matches the historical pattern from the python-2-3 baseline.
- **0 `claude` failures** across 260 dispatches.
- **0 `codex` failures** across 260 dispatches once `FLYWHEEL_IDEAS_CODEX_MODEL=gpt-5.4` worked around the codex 0.125 ChatGPT-account model allowlist (see [`docs/cli-quirks.md`](./cli-quirks.md#codex-model-gotcha-codex-0125)).

Stability ranking: **codex (gpt-5.4) > claude (haiku-4-5) > gemini (flash-lite)**.

## What the evaluations don't establish

Naming the gaps so users can decide whether the product earns the trust it asks for:

1. **Real-world decision improvement.** The council surfaces dissent; the user writes the rationale. Whether the dissent shifts what the user actually decides — and whether that shift is for the better — is unmeasured. Out-of-scope by design (the product is dissent, never verdict).
2. **Six-month retention.** The compounding thesis requires real users logging real refutations against real prior councils. None has happened yet. Property-based tests verify the propagation mechanism is sound; field-level evidence does not exist.
3. **Generalization beyond public-corpus domains.** Python migration history, SEC Item 1A boilerplate, and konflux-ci ADRs all sit in the model's training set. A private decision corpus (Confluence, internal RFCs, regulated-industry wiki) might or might not behave like the public test set. The wedges narrow the gap; they don't close it.
4. **Market demand.** 0 stars / 0 forks / 0 issues today. Cite-rate ≠ adoption.

## Reproducibility

```bash
# Phase 1: build
npm install && npm run build

# Phase 2: cite-rate pilot
PILOT_VAULT=/tmp/flywheel-pilot-python23 \
  node pilot/seed-corpus.mjs --corpus pilot/pilot-corpus.python-2-3.json
PILOT_VAULT=/tmp/flywheel-pilot-python23 \
FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1 \
PILOT_CLIS=claude,gemini \
  node pilot/run-councils.mjs
PILOT_VAULT=/tmp/flywheel-pilot-python23 \
  node pilot/score-cites-auto.mjs --corpus pilot/pilot-corpus.python-2-3.json

# Phase 3 wedges (all four corpora)
for wedge in famous obscure sec-readable adr-readable; do
  PILOT_VAULT=/tmp/flywheel-pilot-wedge-$wedge \
    node pilot/seed-corpus.mjs --corpus pilot/wedge-corpus.$wedge.jsonl
  PILOT_VAULT=/tmp/flywheel-pilot-wedge-$wedge \
  FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1 \
  FLYWHEEL_IDEAS_CODEX_MODEL=gpt-5.4 \
  PILOT_CLIS=claude,codex,gemini \
    node pilot/run-councils.mjs
  # Score (wedges 3a only — 3b is a qualitative read of SYNTHESIS.md)
  if [[ $wedge == famous || $wedge == obscure ]]; then
    PILOT_VAULT=/tmp/flywheel-pilot-wedge-$wedge \
      node pilot/score-cites-auto.mjs --corpus pilot/wedge-corpus.$wedge.jsonl
  fi
  # Snapshot before next iteration overwrites
  cp pilot/last-{seed,councils}.json pilot/wedge-runs/$wedge.last-{seed,councils}.json
done
```

`pilot/last-councils.json` appends across runs (the script's resume logic uses `(idea_id, session_index)` as the dedup key; idea_ids differ across corpora so appends are clean). Snapshot it between runs to preserve per-corpus slices for the score script.

Pre-run vault data and post-run council prose for the wedges are preserved under [`pilot/wedge-runs/`](../pilot/wedge-runs/) so the qualitative SEC + ADR reads are reviewable without re-running.

---

*Last updated: 2026-04-27.*
