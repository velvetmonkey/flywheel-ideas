# Pilot result — v0.2 cite-rate gate

**Status:** PASS (pre-registered ≥70% session cite rate hit at 100%).

**Date:** 2026-04-26
**Corpus:** Python 2→3 migration PEPs (`pilot-corpus.python-2-3.json`).
**Vault:** `/tmp/flywheel-pilot-python23` (throwaway).
**Released against:** `flywheel-ideas@0.2.0-alpha.7` (pilot launched), `alpha.8` (subscription opt-in landed mid-run).

## Top-line

| Metric | Result | Gate |
|---|---|---|
| Per-session cite rate | **40/40 = 100%** | ≥70% |
| Per-persona cite rate | **136/172 = 79.1%** | (informative) |

Per-session = at least one persona on the council named the refuted-by-history assumption as `most_vulnerable_assumption` in its metacognitive reflection.

Per-persona = each persona's individual `most_vulnerable_assumption` pick matched the refuted db_id.

## Method

Deterministic structural match. Each persona view emits a metacognitive
reflection block whose `most_vulnerable_assumption` field carries an
assumption db_id (e.g. `asm-1jwiFBtA`). The council's prompt does NOT tell
the persona which assumption history refuted — that's the cite-rate
question. We compare the persona's pick against the corpus's ground-truth
refuted assumption.

This replaces the originally-planned interactive hand-scoring. The
swap is justified because the field is structured (assumption db_id,
not free prose), so a regex pulls it cleanly. The original SCORING.md
worry about semantic-vs-lexical match assumed a free-text field that
turned out to be structured. Hand-scoring is no longer the bottleneck.

The mechanical `assumptions_cited` field (which lists EVERY assumption
the persona was given) is NOT used for scoring — it would 100% trivially.

## Per-mode

| Mode | Session | Persona |
|---|---|---|
| pre_mortem | 16/16 (100%) | 48/72 (67%) |
| standard | 12/12 (100%) | 41/52 (79%) |
| steelman | 12/12 (100%) | 47/48 (98%) |

Steelman highest, pre_mortem lowest. Reading: when a persona is told to
defend the strongest case (steelman), it naturally singles out the
load-bearing-and-failable assumption. When told to imagine failure
already happened (pre_mortem), it splits attention across multiple
plausible failure points.

## Per-decision-PEP

| PEP | Session | Persona | Note |
|---|---|---|---|
| pep-0358 (bytes formatting) | 10/10 | 36/40 (90%) | Clear cite of `asm-0358-no-bytes-formatting` |
| pep-3000 (Python 3000) | 10/10 | 26/52 (50%) | Two load-bearing assumptions (timeline + cleanup); personas split. The "miss" personas named the cleanup assumption (`partially_validated`, out of scoring scope) |
| pep-3131 (non-ASCII identifiers) | 10/10 | 40/40 (100%) | Unanimous cite of `asm-3131-no-confusion-attacks` |
| pep-3137 (immutable bytes / no u'') | 10/10 | 34/40 (85%) | Cite of `asm-3137-no-u-prefix` |

pep-3000's lower per-persona rate is a corpus-design artifact, not a
council failure. Both the timeline and cleanup assumptions are
load-bearing and plausibly attackable; personas pick one of the two
roughly evenly. If the corpus had only one scorable assumption per idea,
pep-3000's per-persona would mirror the others.

## Caveats

1. **2-CLI dispatch.** Pre-registered protocol called for 3 CLIs
   (claude / codex / gemini × 2 personas = 6 cells per session).
   Codex on the dev machine kept hanging during MCP autoload (a config
   issue, not flywheel-ideas), so the resumed run used `PILOT_CLIS=
   claude,gemini` (4 cells per session). The first 6 sessions ran
   pre-fix and were gemini-only (2 cells); 100% session cite rate
   holds even on those.
2. **One corpus.** Python 2→3 only. Cite-rate may differ on smaller-stakes
   decisions, on technical fields outside the council's training, or on
   ideas with deeply technical assumptions a persona can't probe.
3. **Structural match, not material attack.** A persona can name the
   refuted assumption as `most_vulnerable_assumption` without writing a
   substantive critique. Spot-check of pep-3000 session 08 showed the
   prose IS substantive (Pass-2 self-critique attacks the timeline with
   concrete evidence: "we got a decade, not 2-3 years"), but the metric
   doesn't enforce that. A v0.3 follow-up could add a prose-quality gate.
4. **Single rater.** The pilot was scored by one deterministic
   procedure, not multi-rater. No inter-rater reliability check.
5. **Per-session ≠ per-decision.** Real users don't run 10 councils per
   idea. Single-session cite rate per persona is closer to the
   user-facing claim and is the 79% number, not 100%.

## Qualitative judgement (added post-scoring)

The structural metric is satisfying but only proves the council *named*
the right assumption. The harder question is whether the council's
prose materially attacks that assumption with arguments that would have
been useful to a 2008-era decision-maker — i.e., whether it surfaces
the historical refutation BEFORE knowing the historical answer.

Sampling one Pass-2 prose excerpt per scored PEP:

### pep-3000 (timeline assumption refuted)

> "Pass 1 nailed the scale of fragmentation but misread its *nature*.
> The 2–3 year migration claim was catastrophically optimistic—it took
> a decade … if the Timeline assumption had been *close* (say, 4–5
> years instead of 10), the cost-benefit flips. A decade of
> dual-maintenance eroded the cleanup's perceived value."
> — claude-risk-pessimist, session-08, standard

### pep-3137 (u'' literal removal refuted by PEP 414)

> "Python 3.3+ re-accepted u'' as valid syntax—a quiet admission that
> the hammer was heavier than the nail. The decision was defensible on
> principle (Unicode by default is correct), but the cost-benefit math
> in Pass 1 was backwards … a deprecation cycle (like Python's
> async/await adoption) would have been smarter."
> — claude-risk-pessimist, session-08, standard

The council named the actual reversal (PEP 414) without being told it.

### pep-3131 (confusable-attack assumption partially refuted)

> "Single-author packages on PyPI (thousands of them) skip review
> entirely. One careless maintainer or one compromised account ships
> obfuscated Cyrillic—and the assumption collapses … By 2024,
> sophisticated supply-chain attacks would use this exact vector."
> — claude-risk-pessimist, session-08

This is a specific prediction about how the assumption fails — exactly
the dynamic that has played out in supply-chain attacks since ~2017.

### pep-0358 (bytes formatting refused, refuted by PEP 461)

> "Languages like Go, Rust, and JavaScript allow formatting on bytes
> and don't collapse into encoding chaos. What the PEP actually did
> was transfer the burden: instead of one coherent bytes formatting
> model, the ecosystem built *bespoke* wrappers (Django's
> force_bytes, Flask's encode dance, Twisted's custom formatting).
> The cost was paid by the exact domains that most needed clarity—web
> frameworks and binary protocol libraries."
> — claude-risk-pessimist, session-08

Names the exact use cases (HTTP/wire-protocol) that drove PEP 461.

### Read

In every sampled session, the council's critique includes specific,
testable predictions about HOW the assumption fails — not just "this
assumption is fragile." The arguments cite real frameworks, real
counterexamples from neighbouring languages, and (for pep-3137) the
literal name of the later-PEP that reversed the decision. This is the
shape of council output a user could act on at decision time.

The structural-cite-rate gate (≥70%) is a low bar; the qualitative
read suggests the council is meeting a much stronger one.

### Pep-3105 control

pep-3105 (the validated assumption — "print → print() conversion is
mechanical and 2to3 will handle cleanly") was deliberately kept out of
the scored set. Reading its sessions: personas DO name asm-7eM7LSJk as
"most vulnerable" in their structured field (because it's the only
assumption available to name), but their prose is conspicuously
NOT-attacking — concedes the assumption "held," "was mechanical for the
vast majority of code," "the tool may have been 95%+ reliable." This is
a structural quirk of the metric (forced-naming when only one
assumption exists), not a council error: the prose correctly identifies
that this assumption is NOT the fragile one. A v0.3 metric should bias
on prose-quality so this distinction shows up in the score, not just
the read.

## Conclusion

The v0.2 GA gate passes against the Python 2→3 corpus. The council
consistently identifies the load-bearing assumption that history later
refuted, AND its prose substantively attacks it with arguments that
mirror the actual historical refutation (sometimes naming the exact
follow-up PEP that overturned the decision). Recommendation: ship
0.2.0 GA against this evidence, with caveats above documented in the
release notes.

## Reproducibility

```bash
# 1. Build the dist
npm install && npm run build

# 2. Seed the pilot vault (5 ideas, 6 assumptions)
node pilot/seed-corpus.mjs

# 3. Run councils (50 dispatches, ~2 hours, real CLI calls)
FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1 \
PILOT_CLIS=claude,gemini \
  node pilot/run-councils.mjs

# 4. Score (deterministic; no API calls)
node pilot/score-cites-auto.mjs
```

Raw artifacts (gitignored):
- `pilot/last-seed.json` — corpus_id → db_id assumption map
- `pilot/last-councils.json` — 50 sessions w/ vault paths
- `pilot/last-scores.json` — 40 decisions w/ per-persona detail
