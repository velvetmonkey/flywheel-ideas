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

## Conclusion

The v0.2 GA gate passes against the Python 2→3 corpus. The council
consistently identifies the load-bearing assumption that history later
refuted. Recommendation: ship 0.2.0 GA against this evidence, with
caveats above documented in the release notes.

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
