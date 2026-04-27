---
type: council_view
session_id: sess-BDC7CHSv
idea_id: idea-4c223nf9
model: claude
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:da18e5a2d1c0b7a83a77afdee721715f200f3684cafe089fb678227ea65433e5'
failure_reason: null
confidence: 0.58
---
## Revised stance (Pass 2)

Right direction, wrong substrate — but not for the reason Pass 1 stated. APIExport boundary was real, yes. BUT the actual killer was unstated: team underestimated ops burden for 'directly managed' workload clusters. That assumption — [that Pipeline Service could staff ops at the cost they budgeted] — never got stress-tested. Tekton-via-APIExport could have worked with different controller patterns (eventual-consistency-aware reconcilers, for example). Other orgs have made kcp proxying work by accepting async feedback loops. The real failure: didn't invest in controller refactoring because team assumed 'upstream acceptance' or 'fork maintenance' was untenable. It was untenable — but only because they didn't resource it. ADR-0009's operator pattern is simpler, lower-risk, but not obviously better at scale. If the org had 2-3 engineers dedicated to Tekton kcp-awareness for 6 months in 2023, this decision might have held. Instead, team chose the locally-optimized path (operator per cluster) over the globally-ambitious path (multi-cluster via APIExport). That's not failure — it's scope contraction under constraint.

**Confidence:** 0.58

## Self-critique (Pass 2)

Pass 1 was too focused on the technical nosedive (controller sync, watch loops) and missed the REAL load-bearing assumption: org capacity. I noted ops overhead as a 'secondary' factor. It wasn't secondary — it was *primary*. Pass 1 treated the replacement as inevitable ('operator pattern looked cheaper'). But cheaper for whom, and over what horizon? If you're planning kcp platform growth, an operator-per-cluster locks you into higher long-term maintenance. The question never asked: could the team have succeeded with different investment? Also — I didn't surface that kcp itself *did* improve between 2022 and 2024. By the time ADR-0009 landed, kcp had better eventual-consistency semantics, better syncer reliability. Maybe the decision was right for 2022 but should have been *revisited* in 2023 instead of replaced. I conflated 'replaced in the ADR log' with 'failed.' It might have been 'deferred' instead.

## Initial stance (Pass 1)

Bold vision — multi-cluster Tekton-as-a-service through kcp's APIBinding/APIExport. Upside: legitimate. ONE assumption carries the entire load: that APIExport could proxy Tekton's controller semantics cleanly. It couldn't.

Here's what broke: Tekton assumes local cluster state, local controller loops, synchronous feedback. kcp APIExport introduces latency, eventual consistency, cross-boundary state splits. Tekton's Status subresources and watch loops didn't survive the boundary. Controller reconciliation loops de-synchronized.

Secondary: workload cluster management became the hidden cost. Promised 'managed clusters' turned into runbook overhead. Team had to staff ops. Adoption friction — other services found it simpler to run Tekton locally or use a simpler abstraction.

The vision was directionally right. The substrate wasn't ready in 2022. kcp itself iterated. By month 8, operator-based pattern (ADR-0009) looked cheaper than maintaining APIExport glue. Replaced it.

## Key risks

- Org capacity assumption was never locked. No headcount plan, no timeline for Tekton upstreaming or forking. Optimism gap.
- kcp stability was a moving target 2022–2024. Bet on future, but didn't commit to the future — i.e., didn't allocate engineers to make the bet work.
- ADR-0009 itself has hidden costs: operator version skew, multi-cluster consistency challenges in a different form, increased toil per cluster added. Didn't compare total cost of ownership.

## Fragile insights

- APIExport could have worked with controller redesign — but redesign was out of scope and out of reach.
- The 'simplicity' of operator pattern is real in month 0 but masks compounding toil. This may not have been an improvement at all, just a different shape of pain.
- kcp matured. The substrate might work today. No evidence in the corpus that anyone revisited the idea after kcp stabilized.

## Assumptions cited

- `asm-7JioVbM6 [load-bearing: declared in corpus]`
- `[implicit] team can staff dedicated ops for 'directly managed' workload clusters without hiring`
- `[implicit] APIExport maintainability via open-source (Tekton upstream or fork) is achievable given team constraints`
- `[implicit] operator-per-cluster scales as smoothly as multi-cluster APIExport (it doesn't)`

## Metacognitive reflection

- **Could be wrong if:** The team actually *tried* controller refactoring in 2023–2024 and it failed. Or: ADR-0009 has proven robust and low-toil in production, making the operator pattern objectively better. Or: kcp's eventual-consistency model remained a blocker even after stabilization — i.e., the problem was *architectural*, not just *temporal*. If any of those are true, then I'm wrong to blame org capacity; the substrate was genuinely unsuitable. Also wrong if the team never had capacity for both branches (APIExport *and* ops expertise) — in which case the decision was forced, not optimistic.
- **Most vulnerable assumption:** `That org capacity was the bottleneck, not substrate viability. If Tekton's reconciliation loops are *fundamentally* incompatible with eventual-consistency (not just 'hard to adapt'), then the decision was right regardless of team size. I'm betting on 'hard to adapt' instead of 'fundamentally broken.' No data to support that bet.`
- **Confidence rationale:** 0.58 reflects high uncertainty. The technical failure (watch loops, status sync) is documented and real. But the org-capacity hypothesis is speculative — no evidence in the corpus of staffing plans, timeline negotiations, or revisitation decision gates. I'm also skeptical of my own optimism: operator pattern *is* simpler, and sometimes simpler wins. The downside is I'm pattern-matching to 'ambitious idea killed by org constraints' rather than 'genuinely bad substrate choice.' Without a postmortem or outcome.log entry, I can't be confident either way. Dropped from Pass 1 confidence (maybe ~0.72) because self-critique revealed I was underweighting the technical reality of the sync problem and overweighting the org-factor hypothesis.

## Evidence

- "kcp eventual-consistency model was a mismatch for Tekton's synchronous controller loops in 2022, but kcp matured substantially by 2024." — kcp release notes + general k8s eventual-consistency literature; no specific vault note
- "ADR-0009 replaced ADR-0001 without explicit cost-benefit comparison in decision record." — corpus: ADR-0001 marked 'Replaced', ADR-0009 presumably describes the operator pattern
- "Operator-per-cluster introduces different scaling toil (version skew, drift, consistency) vs. APIExport-per-platform." — implicit in the corpus structure; no explicit analysis found
