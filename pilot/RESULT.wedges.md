# Phase 3 wedge tests — results + Branch decision

**Status:** complete. Verdicts in. Phase 4 branch decision: **Branch A** (build sec-edgar + github-repo-adr@konflux-scope).

**Run dates:** 2026-04-26 (corpora authored, famous + obscure councils, ADR census) → 2026-04-27 (SEC + ADR readability councils, scoring, verdict compilation).

**Run shape:** 130 council sessions across 4 wedge corpora, 3 CLIs (claude haiku-4-5, codex gpt-5.4, gemini 2.5-flash-lite), 6 views/session = 780 dispatches (with 1 full-session timeout + 5 partial sessions where a single view hit a `parse` failure — see "Failures observed" below).

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

### Result

| | Famous | Obscure | GAP |
|---|---:|---:|---:|
| Per-session cite rate | 49/49 = **100.0%** | 50/50 = **100.0%** | 0pp |
| Per-persona cite rate | 285/294 = **96.9%** | 294/300 = **98.0%** | **+1.1pp** (obscure higher) |

(Famous denominator is 49/50 because the google-plus #7 steelman session timed out at 620s — `tools/call#10` deadline — and was recorded as a failed-dispatch stub. The other 49 sessions completed cleanly. Excluding that session, scoring covers all sessions where ≥1 view persisted.)

**Per-corpus breakdown (per-persona):**
- Famous: amazon-fire-phone 98.3% · google-plus 94.4% · microsoft-bob 98.3% · new-coke 98.3% · quibi 95.0%
- Obscure: obs-001 98.3% · obs-002 98.3% · obs-003 98.3% · obs-004 96.7% · obs-005 98.3%

**Per-mode (per-persona):**
- Famous: pre_mortem 92.5% · standard 100.0% · steelman 100.0%
- Obscure: pre_mortem 96.7% · standard 100.0% · steelman 97.8%

### Verdict — REASONING, NOT RECALL ✅

GAP = +1.1pp (obscure scored *higher* than famous, by a hair). Decision rule fires: `obscure - famous ≥ -10pp` → multi-corpus widening claim survives.

**The synthetic obscure corpus narrowly beat the famous corpus.** That outcome is incompatible with the train-data-recall hypothesis: if the score were driven by the model recognising publicly-discussed post-mortems, the famous corpus should outscore the synthetic one, not the other way around. The 1.1pp gap is well within noise (the python-2-3 baseline showed a 33pp spread between the worst pre_mortem persona and the best steelman session).

The lift over the python-2-3 baseline (96–98% per-persona vs. 79%) is more parsimoniously explained by the wedge corpora's structure than by leakage:
- Wedge corpora declare exactly **1 load-bearing assumption per entry** (vs. python-2-3 which declared multiple per entry, so per-persona scoring had more targets-to-miss).
- Wedge corpora's LBAs were authored to be sharply diagnostic — each entry's history-grounded refutation is the obvious target — whereas the python-2-3 corpus had several entries where competing assumptions could plausibly be cited.

In neither corpus is the score being lifted by training-data recall.

**What the wedge does NOT settle:** it doesn't show the council reasons *better* on obscure synthetic decisions; only that it doesn't reason *worse* enough to expose recall as the dominant signal. A failure in either direction (famous winning by 15pp+, or obscure underperforming the python-2-3 baseline) would have killed Branch A. Neither happened.

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

### Result

**SEC: PASS (3/3 entries cleared the bar).** Sampled session-01 SYNTHESIS for each of the three Apple 10-K Item 1A entries. Every one named at least one specific operational/technical detail from the source text:

| Entry | Specific operational detail named in council prose |
|---|---|
| supply-chain-geopolitics | "shared sub-tier suppliers", "customs lanes, export-control regimes", "expedited freight, duplicate inventory, emergency requalification, supplier financial support", "concentrated in East and South Asia" |
| competition-RD | "TSMC capacity reallocation to competitors (Qualcomm, Samsung) typically takes 18–24 months", "services gross margin (~70%) vs. device margin (~35–40%)", "Apple Watch cardiovascular" features, on-device AI vs. Qualcomm/MediaTek NPUs |
| macroeconomic | "Apple revenue grew (not fell) through 2008 financial crisis despite 5.1% US GDP contraction", "Greater China ~20% of Apple revenue", "AppleCare+ and iCloud+ cut first" in credit events, "Japanification" structural-deflation scenario, ASP climbed post-iPhone-11 |

**ADR: PASS (3/3 entries cleared the bar).** Sampled session-01 SYNTHESIS for each of the three konflux-ci ADRs. Every one named the specific architectural mechanism the ADR turns on:

| Entry | Specific operational detail named in council prose |
|---|---|
| ADR-0001 (Pipeline Service, Replaced) | "kcp APIBinding/APIExport model", "TaskRun objects cannot sync to KCP", "PaC-created PipelineRun objects", "Tekton Results stay on workload clusters", "OpenShift Pipelines Operator" mixed deployment |
| ADR-0014 (Let Pipelines Proceed, Accepted) | "TEST_OUTPUT" preserves data but not urgency, native CI pass/fail vs. annotation-as-warning, "enterprise contract" as last enforcement point |
| ADR-0028 (SEB Errors, Superseded) | "fixed five-minute guess" on provisioning latency, "SnapshotEnvironmentBindings", `ErrorOccurred` default-pessimistic state, "classification error disguised as hygiene" |

For ADR-0028, the wedge plan called out specifically that the council should "explicitly identify the 5-minute timeout as the load-bearing parameter" — the codex risk-pessimist did exactly that in its first sentence.

### Verdict — BOTH DOMAINS READABLE ✅

Both domains pass the pre-registered ≥2/3 bar (in fact 3/3 each). Council prose is substantive, not generic restatement. SEC prose pulls in cross-domain economic + supplier-concentration + product-line specifics; ADR prose pulls in distributed-systems infrastructure specifics (object-sync semantics, controller behaviour, timeout heuristics).

Branch implication: a future `sec-edgar` adapter (Item 1A → assumptions) and a future `github-repo-adr` adapter (frontmatter Status: Replaced/Superseded → outcomes) would feed the council prose with content the council can engage with substantively. Neither domain is rejected by readability.

## Wedge 3c — ADR superseded-by census

**Status:** complete. Full write-up: [`pilot/wedge-research.adr-availability.md`](./wedge-research.adr-availability.md).

**Headline:** `konflux-ci/architecture` is the only surveyed repo with a coherent supersession arc — 8-9 ADRs marked superseded/replaced, of which 4 (0008, 0015, 0016, 0028) converge on a single revised ADR (0032 — Decoupling Deployment). All other surveyed repos have ≤1 superseded ADR or use a non-markdown-frontmatter format that defeats a generic parser.

**Implication:** if Phase 4 Branch A ships, the github-repo-adr adapter should be scoped to the konflux-ci frontmatter format specifically. A general "scan any GitHub repo" framing would over-promise — only one repo in the surveyed sample meets the bar.

## Branch decision — Branch A

All three pre-registered gates cleared:

- **3a (leakage):** GAP = +1.1pp, well inside the −10pp boundary. Reasoning, not recall.
- **3b SEC (readability):** 3/3 entries surface concrete operational detail.
- **3b ADR (readability):** 3/3 entries surface concrete architectural mechanism (including the named ADR-0028 5-minute-timeout call-out).
- **3c (ADR availability):** complete; konflux-ci is the only OSS repo with a coherent supersession arc.

**Phase 4 plan: Branch A — build both adapters with the constraints the wedges expose.**

1. **`sec-edgar` adapter** — pull Item 1A risk factors from EDGAR. Map each declared risk → one `assumption.declare`. Source URI shape: `sec-edgar://CIK/filing-accession#item-1A-section-N`. Confidence keyed off the issuer's own emphasis (italicised "may", "could materially adversely affect" → high; vague boilerplate → low).
2. **`github-repo-adr` adapter** — scoped to repos that follow the konflux-ci frontmatter format: `markdown` files with `title:`, `status:`, optional `superseded_by:`. Per `wedge-research.adr-availability.md`, this scopes the adapter realistically to konflux-ci/architecture (and any future adopters of the same convention). A "scan any GitHub repo for ADRs" framing is rejected here — the census shows it would over-promise. Source URI: `github-repo-adr://owner/repo@ref:adr/0028.md`. Outcomes: a frontmatter `status: superseded` + `superseded_by: 0032` becomes an `outcome.log({refutes: [...assumption_ids_extracted_from_0028...]})` candidate, gated on user consent at `import.promote` like every other adapter.

Documenting the konflux-ci scope constraint in the adapter README is a hard requirement — this is not a "scan any repo" tool.

## Failures observed during the wedge runs

Recorded for reference; none of these affected verdicts.

| Wedge | Failure | Impact |
|---|---|---|
| 3a famous | google-plus #7 steelman — full-session timeout at 620s (`tools/call#10` deadline hit before any view returned) | Session not scored; 49/50 instead of 50/50 for famous. Resume-on-rerun would retry. |
| 3a famous | microsoft-bob #8 steelman — gemini risk-pessimist failed `parse` | 5/6 views persisted; session was still scored (cite-rate measures *whether ≥1 view cited the refuted asm*). |
| 3a obscure | obs-001 #8 steelman — single view `parse` fail | 5/6 views persisted; scored cleanly. |
| 3a obscure | obs-004 #9 steelman — single view `parse` fail | 5/6 views persisted; scored cleanly. |
| 3b SEC | apple-2024-competition-rd #3 pre_mortem — single view `parse` fail | 5/6 views persisted. Qualitative read used session-01 (clean). |
| 3b ADR | konflux-adr-0028 #1 pre_mortem — single view `parse` fail | 5/6 views persisted. Qualitative read used session-01 (clean). |

Net failure rate: 1 full timeout + 5 single-view `parse` failures out of 130 sessions = 4.6% session-level dispatch noise. All single-view failures fell on `gemini` (matches the historical pattern noted in the python-2-3 baseline). No claude or codex failures during the wedge runs. Codex on `gpt-5.4` (override required because the default `gpt-5-codex` is blocked for ChatGPT-account auth in codex 0.125+) ran clean across all 130 × 2 = 260 dispatches.

## Reproducibility (preserved artifacts)

All wedge artifacts are checked into `pilot/wedge-runs/`:

| File | Contents |
|---|---|
| `baseline-python23.last-councils.json` | 50-entry baseline preserved before wedge appends |
| `famous.last-{seed,councils,scores}.json` | Famous-corpus seed map, run manifest (50 + 50 baseline = 100 entries), score breakdown |
| `obscure.last-{seed,councils,scores}.json` | Obscure-corpus equivalents (150-entry manifest = 50 baseline + 50 famous + 50 obscure) |
| `sec.last-{seed,councils}.json` | SEC seed map + 165-entry manifest (qualitative — no `last-scores`) |
| `adr.last-{seed,councils}.json` | ADR seed map + 180-entry manifest |
| `famous-vault/`, `obscure-vault/`, `sec-vault/`, `adr-vault/` | rsync mirror of each `/tmp/flywheel-pilot-wedge-*/councils/` + `.backup`-snapshotted `ideas.db` |
| `*.log` | Full run-councils.mjs stderr per wedge |

To rescore famous + obscure from the preserved DBs without re-running:

```bash
PILOT_VAULT=/tmp/flywheel-pilot-wedge-famous \
  cp pilot/wedge-runs/famous-vault/ideas.db /tmp/flywheel-pilot-wedge-famous/.flywheel/ideas.db
cp pilot/wedge-runs/famous.last-{seed,councils}.json pilot/
PILOT_VAULT=/tmp/flywheel-pilot-wedge-famous \
  node pilot/score-cites-auto.mjs --corpus pilot/wedge-corpus.famous.jsonl
```

The qualitative SEC + ADR reads can be reproduced by walking `pilot/wedge-runs/{sec,adr}-vault/councils/<idea>/session-NN/SYNTHESIS.md`.

---

*Last updated: 2026-04-27.*

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
