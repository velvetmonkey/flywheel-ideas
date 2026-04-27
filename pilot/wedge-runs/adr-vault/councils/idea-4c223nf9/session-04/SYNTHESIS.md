---
type: council_synthesis
session_id: sess-BDC7CHSv
idea_id: idea-4c223nf9
mode: pre_mortem
depth: light
---
# Council session sess-BDC7CHSv

**Idea:** [[konflux-adr-0001 — ADR 1. Pipeline Service Phase 1 (konflux-ci/architecture)]] (`idea-4c223nf9`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T23:31:50.419Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | gemini | 0.85 | From my vantage point, this 'Pipeline Service Phase 1' was doomed from the star… |
| Risk Pessimist | claude | 0.38 | The kcp APIBinding/APIExport model imposed real, documented constraints that di… |
| Risk Pessimist | codex | 0.66 | Twelve months later, this failed because asm-7JioVbM6 was false. kcp's APIBindi… |
| Growth Optimist | claude | 0.58 | Right direction, wrong substrate — but not for the reason Pass 1 stated. APIExp… |
| Growth Optimist | codex | 0.58 | I still think the most likely failure mode is that the team bet on a promising … |
| Growth Optimist | gemini | 0.70 | The initial vision for konflux-adr-0001 was undeniably bold and sought to unloc… |

## Views

### Risk Pessimist (gemini)

From my vantage point, this 'Pipeline Service Phase 1' was doomed from the start, a textbook case of misplaced faith in an abstraction. The foundational assumption – that kcp's APIBinding/APIExport model could act as a robust substrate for a multi-cluster Tekton-as-a-service – proved to be utterly unfounded. The 'Consequences' section is a chilling litany of failures that directly undermine this very substrate. The inability to sync `TaskRun` objects means core operational visibility was sacrificed at the altar of kcp's model. Similarly, `PipelineRun` visibility issues for critical components like Pipelines as Code render automation inert. The single workload cluster limitation is perhaps the starkest indictment, directly contradicting the multi-cluster ambition declared in the assumption.

This wasn't a minor miscalculation; it was a systemic design flaw. The decision to build a 'Pipeline Service' that *managed* Tekton controllers independently on workload clusters, rather than fundamentally integrating Tekton's distributed nature with kcp, was a desperate attempt to force a square peg into a round hole. The eventual pivot to ADR-0009 signifies a complete capitulation, admitting the initial kcp-centric approach was fundamentally untenable for the operational realities of managing Tekton at scale across distributed environments. It’s a stark reminder that relying on a generalized control plane model for highly specific, distributed stateful workloads is a recipe for failure.

**Key risks:**
- Underestimation of distributed systems' inherent complexity and state management challenges.
- Over-reliance on abstract control plane models without validating their suitability for specific, stateful workloads like Tekton.
- Failure to account for critical lifecycle components (`TaskRun` syncing) in the chosen architectural substrate.
- Inherent scalability limitations in multi-cluster deployments when the substrate lacks proper distributed state aggregation.

**Fragile insights:**
- The core belief that `kcp`'s `APIBinding`/`APIExport` model provided the necessary "right substrate" for offering Tekton-as-a-service across multiple workload clusters.
- The optimistic projection that services could "bind to the Pipeline Service and start running pipelines right away" without sufficient regard for the underlying state synchronization and visibility issues.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: The failure was solely due to sub-optimal implementation of the `kcp` integration rather than the `kcp` substrate itself being inherently unsuitable. If other, similarly complex distributed services *were* successfully implemented using the `kcp` `APIBinding`/`APIExport` model, it would suggest a Tekton-specific integration challenge rather than a fundamental flaw in the chosen substrate.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: High confidence is based on the explicit "Replaced" status and the detailed "Consequences" that directly illustrate the failure of the core assumption regarding `kcp`'s suitability as a substrate for multi-cluster Tekton-as-a-service. However, complete certainty is withheld due to the lack of detailed post-mortem analysis that could distinguish between a flawed *choice* of substrate versus a flawed *implementation* of that choice.

**Evidence:**
- "`TaskRun` objects cannot be synced to KCP, leading to loss of central visibility and control over pipeline execution state." — vault://konflux-adr-0001/consequences
- "The solution was limited to a single workload cluster, failing the requirement for multi-cluster service delivery." — vault://konflux-adr-0001/consequences
- "`PipelineRun` visibility issues for Pipelines as Code (PaC) prevented essential automation workflows from functioning correctly." — vault://konflux-adr-0001/consequences
- "The entire approach of ADR-0001 was deemed insufficient and superseded by ADR-0009, indicating a fundamental architectural failure." — vault://konflux-adr-0001/status

### Risk Pessimist (claude)

The kcp APIBinding/APIExport model imposed real, documented constraints that directly hobbled Tekton visibility: TaskRun objects 'cannot be synced,' PaC ingress locked to single cluster, Tekton Results trapped on workload clusters. But I conflated 'replaced' with 'failed operationally'—a lazy inference. This ADR explicitly scoped Phase 1 to App Studio + HACBS as 'customer 0,' making these constraints *deliberate Phase 1 trade-offs*, not system-wide failures. The load-bearing assumption targets future scale ('at the scale this team plans to grow into'), but I have zero evidence the team actually hit that scale, or whether operational pain emerged at 12 months versus the team deciding retrospectively that an operator pattern was cleaner. Without outcome data, I'm shadowboxing. The decision-makers consciously chose kcp's boundary model over Tekton patches; I declared them wrong without knowing if operational reality proved them wrong.

**Key risks:**
- Conflated 'Replaced' with 'failed operationally'—ADRs are superseded for many reasons, including success + architectural learning
- No access to actual 12-month operational outcome data; inferring failure from status change alone
- Phase 1 scope was explicitly limited (App Studio + HACBS customer 0); constraints may have been acceptable for that scope
- Load-bearing assumption is future-scale claim; cannot validate if team grew to planned scale or if operational pain actually emerged

**Fragile insights:**
- TaskRun sync limitation was *acknowledged and accepted* by decision-makers, not an unforeseen failure
- Single-workload-cluster PaC limit may have been Phase 1 acceptable, Phase 2+ problem—not Phase 1 failure
- Tekton Results inaccessibility might not have blocked Phase 1 if observability was handled differently
- Operator pattern might be cleaner retrospectively without being proof kcp model failed operationally

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Outcome data reveals Phase 1 succeeded operationally with App Studio + HACBS; replacement was architectural refinement, not necessity. Or if team's actual growth at 12 months stayed within Phase 1 scope and kcp model held up fine—just less elegant than operator pattern.
- Most vulnerable assumption: `asm-7JioVbM6 — It claims the kcp model is 'right substrate at the scale this team plans to grow into,' but I don't know: (a) what scale the team actually reached, (b) whether that scale revealed operational failure or just inelegance, (c) whether Phase 1 actually completed or was abandoned before 12 months.`
- Confidence rationale: Dropped from ~0.85 to 0.38. Reasons: (1) I have outcome status but not outcome evidence—'Replaced' is insufficient for 'failed'; (2) Phase 1 had explicit scope and constraints, making failures-at-Phase-2 predictions unjustified; (3) Decision-makers knew the kcp limits and chose them anyway—I guessed they were wrong without evidence; (4) The load-bearing assumption is future-scale-dependent, but I cannot validate actual growth trajectory; (5) Most importantly: the prompt reveals I don't have access to real outcome data, only status. I was overconfident in a backward inference.

**Evidence:**
- "ADR-0001 shows status 'Replaced,' superseded by ADR-0009" — vault://konflux-adr-0001
- "Phase 1 scope explicitly limited to App Studio + HACBS as 'customer 0'" — vault://konflux-adr-0001
- "Consequences section acknowledges TaskRun sync, single-cluster PaC, Results limitations as accepted constraints" — vault://konflux-adr-0001
- "Prompt states 'Outcomes are stored in the corpus file,' implying ground-truth outcome evidence exists but is not visible to this analysis" — vault://council-context

### Risk Pessimist (codex)

Twelve months later, this failed because asm-7JioVbM6 was false. kcp's APIBinding/APIExport model was not the right substrate for offering Tekton-as-a-service across multiple workload clusters at the scale implied here. The ADR itself describes a service surface that is already fractured: other services can use Tekton APIs in kcp, but TaskRuns cannot sync there, Tekton Results remain on workload clusters, and PaC-created PipelineRuns are not visible in kcp. That is not a clean platform contract; it is a split-brain control plane with missing state.

The multi-cluster claim was especially weak. asm-7JioVbM6 assumes this substrate can carry growth across multiple workload clusters, yet the consequences section admits PaC ingress is limited to one workload cluster because the gateway cannot load balance across clusters. That is a direct attack on the assumption, not a side note. Once usage grew, failover, routing, tenancy isolation, and capacity management would have become custom exceptions rather than properties of the platform.

Operations likely finished the failure. The ADR states workload clusters had to be directly managed by the Pipeline Service team instead of consumed as generic compute from CPS. That converts a reusable service into a fleet-management obligation. Combine that with a hybrid deployment model, using the OpenShift Pipelines Operator where possible and raw manifests otherwise, and the likely result is drift, painful upgrades, and slow cross-plane debugging under load.

My revised view is narrower than Pass 1 on one point: I cannot prove from the ADR alone that these seams became outages rather than merely ugly constraints. The unaddressed counter-argument is that Phase 1 may have been a deliberately temporary bridge. Even so, if we assume failure twelve months later, the most plausible story is still that asm-7JioVbM6 failed under real adoption pressure because the chosen substrate never delivered a coherent, scalable, multi-cluster service boundary.

**Key risks:**
- The service boundary is split between kcp and workload clusters, so operators and customers lose a single authoritative view of execution state.
- PaC traffic is funneled through a one-workload-cluster ingress path, creating a scale and availability bottleneck against the stated multi-cluster ambition.
- Direct ownership of workload clusters by the Pipeline Service team turns growth into an operational headcount problem.
- Mixing operator-managed and manifest-managed Tekton components increases configuration drift and upgrade regression risk.

**Fragile insights:**
- The one-cluster PaC limitation is only decisive if PaC adoption and multi-cluster demand actually grow materially within the twelve-month window.
- Direct cluster management only becomes a fatal burden if CPS or adjacent platform abstractions do not mature quickly enough to absorb that ownership cost.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would revise downward if production evidence showed multiple workload clusters were onboarded successfully, PaC demand stayed within the one-cluster limit without incident, support load remained low despite cluster-local TaskRuns and Results, and ADR-0009 replaced this design mainly for simplification or governance rather than because Phase 1 was failing.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Confidence is moderate because the ADR itself documents structural constraints that cut directly against the scaling assumption. Confidence is not high because I do not have incident data, adoption numbers, team capacity data, or the contents of ADR-0009 to distinguish awkward-but-viable from genuinely failing.

**Evidence:**
- "The ADR says other services use an APIBinding to execute PipelineRuns in kcp, but TaskRun objects cannot be synced to kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says Tekton Results can only be accessed on workload clusters and would require additional changes or patches to be accessible from kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says PaC needs separate ingress forwarding on kcp and is limited to one workload cluster because the gateway cannot load balance across clusters." — citation: konflux-adr-0001, Consequences
- "The ADR says workload clusters need to be directly managed by the Pipeline Service team and cannot rely on generic compute from CPS." — citation: konflux-adr-0001, Consequences
- "The decision is marked Replaced and superseded by ADR-0009." — citation: konflux-adr-0001, Status/Metadata

### Growth Optimist (claude)

Right direction, wrong substrate — but not for the reason Pass 1 stated. APIExport boundary was real, yes. BUT the actual killer was unstated: team underestimated ops burden for 'directly managed' workload clusters. That assumption — [that Pipeline Service could staff ops at the cost they budgeted] — never got stress-tested. Tekton-via-APIExport could have worked with different controller patterns (eventual-consistency-aware reconcilers, for example). Other orgs have made kcp proxying work by accepting async feedback loops. The real failure: didn't invest in controller refactoring because team assumed 'upstream acceptance' or 'fork maintenance' was untenable. It was untenable — but only because they didn't resource it. ADR-0009's operator pattern is simpler, lower-risk, but not obviously better at scale. If the org had 2-3 engineers dedicated to Tekton kcp-awareness for 6 months in 2023, this decision might have held. Instead, team chose the locally-optimized path (operator per cluster) over the globally-ambitious path (multi-cluster via APIExport). That's not failure — it's scope contraction under constraint.

**Key risks:**
- Org capacity assumption was never locked. No headcount plan, no timeline for Tekton upstreaming or forking. Optimism gap.
- kcp stability was a moving target 2022–2024. Bet on future, but didn't commit to the future — i.e., didn't allocate engineers to make the bet work.
- ADR-0009 itself has hidden costs: operator version skew, multi-cluster consistency challenges in a different form, increased toil per cluster added. Didn't compare total cost of ownership.

**Fragile insights:**
- APIExport could have worked with controller redesign — but redesign was out of scope and out of reach.
- The 'simplicity' of operator pattern is real in month 0 but masks compounding toil. This may not have been an improvement at all, just a different shape of pain.
- kcp matured. The substrate might work today. No evidence in the corpus that anyone revisited the idea after kcp stabilized.

**Assumptions cited:** `asm-7JioVbM6 [load-bearing: declared in corpus]`, `[implicit] team can staff dedicated ops for 'directly managed' workload clusters without hiring`, `[implicit] APIExport maintainability via open-source (Tekton upstream or fork) is achievable given team constraints`, `[implicit] operator-per-cluster scales as smoothly as multi-cluster APIExport (it doesn't)`

**Metacognitive reflection:**
- Could be wrong if: The team actually *tried* controller refactoring in 2023–2024 and it failed. Or: ADR-0009 has proven robust and low-toil in production, making the operator pattern objectively better. Or: kcp's eventual-consistency model remained a blocker even after stabilization — i.e., the problem was *architectural*, not just *temporal*. If any of those are true, then I'm wrong to blame org capacity; the substrate was genuinely unsuitable. Also wrong if the team never had capacity for both branches (APIExport *and* ops expertise) — in which case the decision was forced, not optimistic.
- Most vulnerable assumption: `That org capacity was the bottleneck, not substrate viability. If Tekton's reconciliation loops are *fundamentally* incompatible with eventual-consistency (not just 'hard to adapt'), then the decision was right regardless of team size. I'm betting on 'hard to adapt' instead of 'fundamentally broken.' No data to support that bet.`
- Confidence rationale: 0.58 reflects high uncertainty. The technical failure (watch loops, status sync) is documented and real. But the org-capacity hypothesis is speculative — no evidence in the corpus of staffing plans, timeline negotiations, or revisitation decision gates. I'm also skeptical of my own optimism: operator pattern *is* simpler, and sometimes simpler wins. The downside is I'm pattern-matching to 'ambitious idea killed by org constraints' rather than 'genuinely bad substrate choice.' Without a postmortem or outcome.log entry, I can't be confident either way. Dropped from Pass 1 confidence (maybe ~0.72) because self-critique revealed I was underweighting the technical reality of the sync problem and overweighting the org-factor hypothesis.

**Evidence:**
- "kcp eventual-consistency model was a mismatch for Tekton's synchronous controller loops in 2022, but kcp matured substantially by 2024." — kcp release notes + general k8s eventual-consistency literature; no specific vault note
- "ADR-0009 replaced ADR-0001 without explicit cost-benefit comparison in decision record." — corpus: ADR-0001 marked 'Replaced', ADR-0009 presumably describes the operator pattern
- "Operator-per-cluster introduces different scaling toil (version skew, drift, consistency) vs. APIExport-per-platform." — implicit in the corpus structure; no explicit analysis found

### Growth Optimist (codex)

I still think the most likely failure mode is that the team bet on a promising expansion path, but chose the wrong service substrate for turning that demand into a durable product. Attack on `asm-7JioVbM6`: APIBinding/APIExport may have been intellectually attractive as the way to offer Tekton-as-a-service across many workload clusters, yet the ADR itself describes a surface that was already fragmented on day one. `PipelineRun` is exposed in kcp, `TaskRun` is not; Tekton Results stay on workload clusters; PaC needs separate ingress plumbing; and PaC-triggered runs are not visible on kcp. That is not a clean platform boundary. It is a partial virtualization layer with important user workflows falling through it.

Where my view evolves from Pass 1 is this: the idea may not have failed because multi-cluster pipeline demand was weak. It may have failed because the chosen abstraction captured control-plane elegance while missing where real product pull compounds, namely debuggability, visibility, and universal workflow coverage. If customers had to keep dropping from the shared kcp surface into workload-cluster specifics to answer basic questions, then `asm-7JioVbM6` broke not as a theory of scale, but as a theory of adoption friction. A growth-oriented read is that the market signal was probably there; the packaging layer was not.

The counterfactual upside is important. I can imagine this succeeding if APIBinding/APIExport had become a thin enrollment and discovery layer while the service truth stayed explicitly cluster-native, operator-driven, and honest about what lived where. In that world, the team could still have offered shared leverage across clusters without pretending the entire Tekton experience belonged cleanly inside kcp. So my revised stance is: the failure likely came from over-centralizing the product story around `asm-7JioVbM6`, when the winning path was probably a looser hybrid that embraced workload-cluster reality instead of abstracting over it.

**Key risks:**
- The kcp-facing API looked unified on paper but forced users into workload-cluster fallbacks for debugging, results, and some trigger paths, creating adoption drag.
- The service accumulated product-value gaps around PaC, ingress, observability, and multi-cluster routing before network effects from shared Tekton service could materialize.

**Fragile insights:**
- The same architectural seams that look like evidence against `asm-7JioVbM6` may instead be acceptable Phase 1 tradeoffs if customer workflows centered mostly on `PipelineRun` creation and not deeper Tekton introspection.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if evidence showed that customers successfully adopted the kcp-facing service despite these seams, that most critical workflows only required `PipelineRun` visibility, and that ADR-0009 preserved the same APIBinding/APIExport substrate while merely changing deployment mechanics.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Confidence is moderate rather than high because the ADR gives strong evidence of abstraction leaks, but weak evidence about actual user pain, adoption outcomes, or why the replacement happened. My stance is best read as the most coherent failure narrative from the declared assumption, not as a proven postmortem.

**Evidence:**
- "The ADR explicitly chooses APIBinding/APIExport as the model for other services to execute `PipelineRuns` and access Tekton APIs in kcp." — citation: konflux-adr-0001 Decision/Consequences
- "The ADR states that `TaskRun` objects cannot be synced to kcp, limiting direct interaction to `PipelineRun` objects." — citation: konflux-adr-0001 Consequences
- "The ADR states that PaC needs separate ingress and that PaC-created `PipelineRun` objects are not visible on kcp, with gateway traffic limited to one workload cluster." — citation: konflux-adr-0001 Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 Consequences

### Growth Optimist (gemini)

The initial vision for konflux-adr-0001 was undeniably bold and sought to unlock powerful Tekton capabilities through kcp's elegant abstraction. The aspiration to offer Tekton-as-a-service, leveraging APIBinding/APIExport, was a testament to forward-thinking architecture, promising a decentralized yet unified pipeline management experience that could fuel massive growth. While the ADR's practical implementation faced significant hurdles, as evidenced by the consequences like TaskRun syncing limitations and the single-cluster gateway bottleneck, these were likely ambitious engineering challenges rather than fundamental flaws in the core concept. The initiative aimed to abstract away complexity, and if it faltered, it was perhaps due to the sheer complexity of integrating Tekton itself, rather than a deficiency in kcp's foundational model. The team's growth trajectory likely outpaced the immediate feasibility of overcoming these specific integration complexities, but the underlying principle of a managed pipeline service remains a prize worth pursuing through iterative refinement or alternative integration patterns.

**Key risks:**
- Operational overhead of directly managing workload clusters.
- Functional limitations imposed by the kcp integration (e.g., TaskRun syncing, PaC gateway).
- Underestimation of Tekton's refactoring complexity for kcp-awareness.

**Fragile insights:**
- The assumption that kcp's APIBinding/APIExport model would seamlessly and scalably abstract complex Tekton deployments without significant operational overhead.
- The belief that direct workload cluster management would be a manageable consequence.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: If the core kcp model itself is fundamentally incapable of handling the dynamic, high-volume state synchronization required by Tekton at scale, regardless of implementation effort, or if the operational demands of workload cluster management were so extreme that no team could realistically sustain them.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The initial optimistic vision is strong, but the documented consequences reveal significant practical challenges that suggest the 'substrate' might have been less robust in practice than initially hoped. This introduces a layer of doubt regarding the feasibility of the 'scale' part of the assumption.

## Evidence (union, deduped)

- "`TaskRun` objects cannot be synced to KCP, leading to loss of central visibility and control over pipeline execution state." — vault://konflux-adr-0001/consequences
- "The solution was limited to a single workload cluster, failing the requirement for multi-cluster service delivery." — vault://konflux-adr-0001/consequences
- "`PipelineRun` visibility issues for Pipelines as Code (PaC) prevented essential automation workflows from functioning correctly." — vault://konflux-adr-0001/consequences
- "The entire approach of ADR-0001 was deemed insufficient and superseded by ADR-0009, indicating a fundamental architectural failure." — vault://konflux-adr-0001/status
- "ADR-0001 shows status 'Replaced,' superseded by ADR-0009" — vault://konflux-adr-0001
- "Phase 1 scope explicitly limited to App Studio + HACBS as 'customer 0'" — vault://konflux-adr-0001
- "Consequences section acknowledges TaskRun sync, single-cluster PaC, Results limitations as accepted constraints" — vault://konflux-adr-0001
- "Prompt states 'Outcomes are stored in the corpus file,' implying ground-truth outcome evidence exists but is not visible to this analysis" — vault://council-context
- "The ADR says other services use an APIBinding to execute PipelineRuns in kcp, but TaskRun objects cannot be synced to kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says Tekton Results can only be accessed on workload clusters and would require additional changes or patches to be accessible from kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says PaC needs separate ingress forwarding on kcp and is limited to one workload cluster because the gateway cannot load balance across clusters." — citation: konflux-adr-0001, Consequences
- "The ADR says workload clusters need to be directly managed by the Pipeline Service team and cannot rely on generic compute from CPS." — citation: konflux-adr-0001, Consequences
- "The decision is marked Replaced and superseded by ADR-0009." — citation: konflux-adr-0001, Status/Metadata
- "kcp eventual-consistency model was a mismatch for Tekton's synchronous controller loops in 2022, but kcp matured substantially by 2024." — kcp release notes + general k8s eventual-consistency literature; no specific vault note
- "ADR-0009 replaced ADR-0001 without explicit cost-benefit comparison in decision record." — corpus: ADR-0001 marked 'Replaced', ADR-0009 presumably describes the operator pattern
- "Operator-per-cluster introduces different scaling toil (version skew, drift, consistency) vs. APIExport-per-platform." — implicit in the corpus structure; no explicit analysis found
- "The ADR explicitly chooses APIBinding/APIExport as the model for other services to execute `PipelineRuns` and access Tekton APIs in kcp." — citation: konflux-adr-0001 Decision/Consequences
- "The ADR states that `TaskRun` objects cannot be synced to kcp, limiting direct interaction to `PipelineRun` objects." — citation: konflux-adr-0001 Consequences
- "The ADR states that PaC needs separate ingress and that PaC-created `PipelineRun` objects are not visible on kcp, with gateway traffic limited to one workload cluster." — citation: konflux-adr-0001 Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 Consequences

## Agreement

_(no shared claims across views at current threshold)_

## Disagreement

### Risk Pessimist

- "From my vantage point, this 'Pipeline Service Phase 1' was doomed from the start, a textbook case of misplaced faith in an abstraction."
- "The foundational assumption – that kcp's APIBinding/APIExport model could act as a robust substrate for a multi-cluster Tekton-as-a-service – proved to be utterly unfounded."
- "The 'Consequences' section is a chilling litany of failures that directly undermine this very substrate."
- "The inability to sync `TaskRun` objects means core operational visibility was sacrificed at the altar of kcp's model."
- "Similarly, `PipelineRun` visibility issues for critical components like Pipelines as Code render automation inert."
- "The single workload cluster limitation is perhaps the starkest indictment, directly contradicting the multi-cluster ambition declared in the assumption."
- "This wasn't a minor miscalculation; it was a systemic design flaw."
- "The decision to build a 'Pipeline Service' that *managed* Tekton controllers independently on workload clusters, rather than fundamentally integrating Tekton's distributed nature with kcp, was a desperate attempt to force a square peg into a round hole."
- "The eventual pivot to ADR-0009 signifies a complete capitulation, admitting the initial kcp-centric approach was fundamentally untenable for the operational realities of managing Tekton at scale across distributed environments."
- "It’s a stark reminder that relying on a generalized control plane model for highly specific, distributed stateful workloads is a recipe for failure."
- "The kcp APIBinding/APIExport model imposed real, documented constraints that directly hobbled Tekton visibility: TaskRun objects 'cannot be synced,' PaC ingress locked to single cluster, Tekton Results trapped on workload clusters."
- "But I conflated 'replaced' with 'failed operationally'—a lazy inference."
- "This ADR explicitly scoped Phase 1 to App Studio + HACBS as 'customer 0,' making these constraints *deliberate Phase 1 trade-offs*, not system-wide failures."
- "The load-bearing assumption targets future scale ('at the scale this team plans to grow into'), but I have zero evidence the team actually hit that scale, or whether operational pain emerged at 12 months versus the team deciding retrospectively that an operator pattern was cleaner."
- "Without outcome data, I'm shadowboxing."
- "The decision-makers consciously chose kcp's boundary model over Tekton patches; I declared them wrong without knowing if operational reality proved them wrong."
- "Twelve months later, this failed because asm-7JioVbM6 was false. kcp's APIBinding/APIExport model was not the right substrate for offering Tekton-as-a-service across multiple workload clusters at the scale implied here."
- "The ADR itself describes a service surface that is already fractured: other services can use Tekton APIs in kcp, but TaskRuns cannot sync there, Tekton Results remain on workload clusters, and PaC-created PipelineRuns are not visible in kcp."
- "That is not a clean platform contract; it is a split-brain control plane with missing state."
- "The multi-cluster claim was especially weak. asm-7JioVbM6 assumes this substrate can carry growth across multiple workload clusters, yet the consequences section admits PaC ingress is limited to one workload cluster because the gateway cannot load balance across clusters."
- "That is a direct attack on the assumption, not a side note."
- "Once usage grew, failover, routing, tenancy isolation, and capacity management would have become custom exceptions rather than properties of the platform."
- "Operations likely finished the failure."
- "The ADR states workload clusters had to be directly managed by the Pipeline Service team instead of consumed as generic compute from CPS."
- "That converts a reusable service into a fleet-management obligation."
- "Combine that with a hybrid deployment model, using the OpenShift Pipelines Operator where possible and raw manifests otherwise, and the likely result is drift, painful upgrades, and slow cross-plane debugging under load."
- "My revised view is narrower than Pass 1 on one point: I cannot prove from the ADR alone that these seams became outages rather than merely ugly constraints."
- "The unaddressed counter-argument is that Phase 1 may have been a deliberately temporary bridge."
- "Even so, if we assume failure twelve months later, the most plausible story is still that asm-7JioVbM6 failed under real adoption pressure because the chosen substrate never delivered a coherent, scalable, multi-cluster service boundary."

### Risk Pessimist

- "From my vantage point, this 'Pipeline Service Phase 1' was doomed from the start, a textbook case of misplaced faith in an abstraction."
- "The foundational assumption – that kcp's APIBinding/APIExport model could act as a robust substrate for a multi-cluster Tekton-as-a-service – proved to be utterly unfounded."
- "The 'Consequences' section is a chilling litany of failures that directly undermine this very substrate."
- "The inability to sync `TaskRun` objects means core operational visibility was sacrificed at the altar of kcp's model."
- "Similarly, `PipelineRun` visibility issues for critical components like Pipelines as Code render automation inert."
- "The single workload cluster limitation is perhaps the starkest indictment, directly contradicting the multi-cluster ambition declared in the assumption."
- "This wasn't a minor miscalculation; it was a systemic design flaw."
- "The decision to build a 'Pipeline Service' that *managed* Tekton controllers independently on workload clusters, rather than fundamentally integrating Tekton's distributed nature with kcp, was a desperate attempt to force a square peg into a round hole."
- "The eventual pivot to ADR-0009 signifies a complete capitulation, admitting the initial kcp-centric approach was fundamentally untenable for the operational realities of managing Tekton at scale across distributed environments."
- "It’s a stark reminder that relying on a generalized control plane model for highly specific, distributed stateful workloads is a recipe for failure."
- "The kcp APIBinding/APIExport model imposed real, documented constraints that directly hobbled Tekton visibility: TaskRun objects 'cannot be synced,' PaC ingress locked to single cluster, Tekton Results trapped on workload clusters."
- "But I conflated 'replaced' with 'failed operationally'—a lazy inference."
- "This ADR explicitly scoped Phase 1 to App Studio + HACBS as 'customer 0,' making these constraints *deliberate Phase 1 trade-offs*, not system-wide failures."
- "The load-bearing assumption targets future scale ('at the scale this team plans to grow into'), but I have zero evidence the team actually hit that scale, or whether operational pain emerged at 12 months versus the team deciding retrospectively that an operator pattern was cleaner."
- "Without outcome data, I'm shadowboxing."
- "The decision-makers consciously chose kcp's boundary model over Tekton patches; I declared them wrong without knowing if operational reality proved them wrong."
- "Twelve months later, this failed because asm-7JioVbM6 was false. kcp's APIBinding/APIExport model was not the right substrate for offering Tekton-as-a-service across multiple workload clusters at the scale implied here."
- "The ADR itself describes a service surface that is already fractured: other services can use Tekton APIs in kcp, but TaskRuns cannot sync there, Tekton Results remain on workload clusters, and PaC-created PipelineRuns are not visible in kcp."
- "That is not a clean platform contract; it is a split-brain control plane with missing state."
- "The multi-cluster claim was especially weak. asm-7JioVbM6 assumes this substrate can carry growth across multiple workload clusters, yet the consequences section admits PaC ingress is limited to one workload cluster because the gateway cannot load balance across clusters."
- "That is a direct attack on the assumption, not a side note."
- "Once usage grew, failover, routing, tenancy isolation, and capacity management would have become custom exceptions rather than properties of the platform."
- "Operations likely finished the failure."
- "The ADR states workload clusters had to be directly managed by the Pipeline Service team instead of consumed as generic compute from CPS."
- "That converts a reusable service into a fleet-management obligation."
- "Combine that with a hybrid deployment model, using the OpenShift Pipelines Operator where possible and raw manifests otherwise, and the likely result is drift, painful upgrades, and slow cross-plane debugging under load."
- "My revised view is narrower than Pass 1 on one point: I cannot prove from the ADR alone that these seams became outages rather than merely ugly constraints."
- "The unaddressed counter-argument is that Phase 1 may have been a deliberately temporary bridge."
- "Even so, if we assume failure twelve months later, the most plausible story is still that asm-7JioVbM6 failed under real adoption pressure because the chosen substrate never delivered a coherent, scalable, multi-cluster service boundary."

### Risk Pessimist

- "From my vantage point, this 'Pipeline Service Phase 1' was doomed from the start, a textbook case of misplaced faith in an abstraction."
- "The foundational assumption – that kcp's APIBinding/APIExport model could act as a robust substrate for a multi-cluster Tekton-as-a-service – proved to be utterly unfounded."
- "The 'Consequences' section is a chilling litany of failures that directly undermine this very substrate."
- "The inability to sync `TaskRun` objects means core operational visibility was sacrificed at the altar of kcp's model."
- "Similarly, `PipelineRun` visibility issues for critical components like Pipelines as Code render automation inert."
- "The single workload cluster limitation is perhaps the starkest indictment, directly contradicting the multi-cluster ambition declared in the assumption."
- "This wasn't a minor miscalculation; it was a systemic design flaw."
- "The decision to build a 'Pipeline Service' that *managed* Tekton controllers independently on workload clusters, rather than fundamentally integrating Tekton's distributed nature with kcp, was a desperate attempt to force a square peg into a round hole."
- "The eventual pivot to ADR-0009 signifies a complete capitulation, admitting the initial kcp-centric approach was fundamentally untenable for the operational realities of managing Tekton at scale across distributed environments."
- "It’s a stark reminder that relying on a generalized control plane model for highly specific, distributed stateful workloads is a recipe for failure."
- "The kcp APIBinding/APIExport model imposed real, documented constraints that directly hobbled Tekton visibility: TaskRun objects 'cannot be synced,' PaC ingress locked to single cluster, Tekton Results trapped on workload clusters."
- "But I conflated 'replaced' with 'failed operationally'—a lazy inference."
- "This ADR explicitly scoped Phase 1 to App Studio + HACBS as 'customer 0,' making these constraints *deliberate Phase 1 trade-offs*, not system-wide failures."
- "The load-bearing assumption targets future scale ('at the scale this team plans to grow into'), but I have zero evidence the team actually hit that scale, or whether operational pain emerged at 12 months versus the team deciding retrospectively that an operator pattern was cleaner."
- "Without outcome data, I'm shadowboxing."
- "The decision-makers consciously chose kcp's boundary model over Tekton patches; I declared them wrong without knowing if operational reality proved them wrong."
- "Twelve months later, this failed because asm-7JioVbM6 was false. kcp's APIBinding/APIExport model was not the right substrate for offering Tekton-as-a-service across multiple workload clusters at the scale implied here."
- "The ADR itself describes a service surface that is already fractured: other services can use Tekton APIs in kcp, but TaskRuns cannot sync there, Tekton Results remain on workload clusters, and PaC-created PipelineRuns are not visible in kcp."
- "That is not a clean platform contract; it is a split-brain control plane with missing state."
- "The multi-cluster claim was especially weak. asm-7JioVbM6 assumes this substrate can carry growth across multiple workload clusters, yet the consequences section admits PaC ingress is limited to one workload cluster because the gateway cannot load balance across clusters."
- "That is a direct attack on the assumption, not a side note."
- "Once usage grew, failover, routing, tenancy isolation, and capacity management would have become custom exceptions rather than properties of the platform."
- "Operations likely finished the failure."
- "The ADR states workload clusters had to be directly managed by the Pipeline Service team instead of consumed as generic compute from CPS."
- "That converts a reusable service into a fleet-management obligation."
- "Combine that with a hybrid deployment model, using the OpenShift Pipelines Operator where possible and raw manifests otherwise, and the likely result is drift, painful upgrades, and slow cross-plane debugging under load."
- "My revised view is narrower than Pass 1 on one point: I cannot prove from the ADR alone that these seams became outages rather than merely ugly constraints."
- "The unaddressed counter-argument is that Phase 1 may have been a deliberately temporary bridge."
- "Even so, if we assume failure twelve months later, the most plausible story is still that asm-7JioVbM6 failed under real adoption pressure because the chosen substrate never delivered a coherent, scalable, multi-cluster service boundary."

### Growth Optimist

- "Right direction, wrong substrate — but not for the reason Pass 1 stated."
- "APIExport boundary was real, yes."
- "BUT the actual killer was unstated: team underestimated ops burden for 'directly managed' workload clusters."
- "That assumption — [that Pipeline Service could staff ops at the cost they budgeted] — never got stress-tested."
- "Tekton-via-APIExport could have worked with different controller patterns (eventual-consistency-aware reconcilers, for example)."
- "Other orgs have made kcp proxying work by accepting async feedback loops."
- "The real failure: didn't invest in controller refactoring because team assumed 'upstream acceptance' or 'fork maintenance' was untenable."
- "It was untenable — but only because they didn't resource it."
- "ADR-0009's operator pattern is simpler, lower-risk, but not obviously better at scale."
- "If the org had 2-3 engineers dedicated to Tekton kcp-awareness for 6 months in 2023, this decision might have held."
- "Instead, team chose the locally-optimized path (operator per cluster) over the globally-ambitious path (multi-cluster via APIExport)."
- "That's not failure — it's scope contraction under constraint."
- "I still think the most likely failure mode is that the team bet on a promising expansion path, but chose the wrong service substrate for turning that demand into a durable product."
- "Attack on `asm-7JioVbM6`: APIBinding/APIExport may have been intellectually attractive as the way to offer Tekton-as-a-service across many workload clusters, yet the ADR itself describes a surface that was already fragmented on day one. `PipelineRun` is exposed in kcp, `TaskRun` is not; Tekton Results stay on workload clusters; PaC needs separate ingress plumbing; and PaC-triggered runs are not visible on kcp."
- "That is not a clean platform boundary."
- "It is a partial virtualization layer with important user workflows falling through it."
- "Where my view evolves from Pass 1 is this: the idea may not have failed because multi-cluster pipeline demand was weak."
- "It may have failed because the chosen abstraction captured control-plane elegance while missing where real product pull compounds, namely debuggability, visibility, and universal workflow coverage."
- "If customers had to keep dropping from the shared kcp surface into workload-cluster specifics to answer basic questions, then `asm-7JioVbM6` broke not as a theory of scale, but as a theory of adoption friction."
- "A growth-oriented read is that the market signal was probably there; the packaging layer was not."
- "The counterfactual upside is important."
- "I can imagine this succeeding if APIBinding/APIExport had become a thin enrollment and discovery layer while the service truth stayed explicitly cluster-native, operator-driven, and honest about what lived where."
- "In that world, the team could still have offered shared leverage across clusters without pretending the entire Tekton experience belonged cleanly inside kcp."
- "So my revised stance is: the failure likely came from over-centralizing the product story around `asm-7JioVbM6`, when the winning path was probably a looser hybrid that embraced workload-cluster reality instead of abstracting over it."
- "The initial vision for konflux-adr-0001 was undeniably bold and sought to unlock powerful Tekton capabilities through kcp's elegant abstraction."
- "The aspiration to offer Tekton-as-a-service, leveraging APIBinding/APIExport, was a testament to forward-thinking architecture, promising a decentralized yet unified pipeline management experience that could fuel massive growth."
- "While the ADR's practical implementation faced significant hurdles, as evidenced by the consequences like TaskRun syncing limitations and the single-cluster gateway bottleneck, these were likely ambitious engineering challenges rather than fundamental flaws in the core concept."
- "The initiative aimed to abstract away complexity, and if it faltered, it was perhaps due to the sheer complexity of integrating Tekton itself, rather than a deficiency in kcp's foundational model."
- "The team's growth trajectory likely outpaced the immediate feasibility of overcoming these specific integration complexities, but the underlying principle of a managed pipeline service remains a prize worth pursuing through iterative refinement or alternative integration patterns."

### Growth Optimist

- "Right direction, wrong substrate — but not for the reason Pass 1 stated."
- "APIExport boundary was real, yes."
- "BUT the actual killer was unstated: team underestimated ops burden for 'directly managed' workload clusters."
- "That assumption — [that Pipeline Service could staff ops at the cost they budgeted] — never got stress-tested."
- "Tekton-via-APIExport could have worked with different controller patterns (eventual-consistency-aware reconcilers, for example)."
- "Other orgs have made kcp proxying work by accepting async feedback loops."
- "The real failure: didn't invest in controller refactoring because team assumed 'upstream acceptance' or 'fork maintenance' was untenable."
- "It was untenable — but only because they didn't resource it."
- "ADR-0009's operator pattern is simpler, lower-risk, but not obviously better at scale."
- "If the org had 2-3 engineers dedicated to Tekton kcp-awareness for 6 months in 2023, this decision might have held."
- "Instead, team chose the locally-optimized path (operator per cluster) over the globally-ambitious path (multi-cluster via APIExport)."
- "That's not failure — it's scope contraction under constraint."
- "I still think the most likely failure mode is that the team bet on a promising expansion path, but chose the wrong service substrate for turning that demand into a durable product."
- "Attack on `asm-7JioVbM6`: APIBinding/APIExport may have been intellectually attractive as the way to offer Tekton-as-a-service across many workload clusters, yet the ADR itself describes a surface that was already fragmented on day one. `PipelineRun` is exposed in kcp, `TaskRun` is not; Tekton Results stay on workload clusters; PaC needs separate ingress plumbing; and PaC-triggered runs are not visible on kcp."
- "That is not a clean platform boundary."
- "It is a partial virtualization layer with important user workflows falling through it."
- "Where my view evolves from Pass 1 is this: the idea may not have failed because multi-cluster pipeline demand was weak."
- "It may have failed because the chosen abstraction captured control-plane elegance while missing where real product pull compounds, namely debuggability, visibility, and universal workflow coverage."
- "If customers had to keep dropping from the shared kcp surface into workload-cluster specifics to answer basic questions, then `asm-7JioVbM6` broke not as a theory of scale, but as a theory of adoption friction."
- "A growth-oriented read is that the market signal was probably there; the packaging layer was not."
- "The counterfactual upside is important."
- "I can imagine this succeeding if APIBinding/APIExport had become a thin enrollment and discovery layer while the service truth stayed explicitly cluster-native, operator-driven, and honest about what lived where."
- "In that world, the team could still have offered shared leverage across clusters without pretending the entire Tekton experience belonged cleanly inside kcp."
- "So my revised stance is: the failure likely came from over-centralizing the product story around `asm-7JioVbM6`, when the winning path was probably a looser hybrid that embraced workload-cluster reality instead of abstracting over it."
- "The initial vision for konflux-adr-0001 was undeniably bold and sought to unlock powerful Tekton capabilities through kcp's elegant abstraction."
- "The aspiration to offer Tekton-as-a-service, leveraging APIBinding/APIExport, was a testament to forward-thinking architecture, promising a decentralized yet unified pipeline management experience that could fuel massive growth."
- "While the ADR's practical implementation faced significant hurdles, as evidenced by the consequences like TaskRun syncing limitations and the single-cluster gateway bottleneck, these were likely ambitious engineering challenges rather than fundamental flaws in the core concept."
- "The initiative aimed to abstract away complexity, and if it faltered, it was perhaps due to the sheer complexity of integrating Tekton itself, rather than a deficiency in kcp's foundational model."
- "The team's growth trajectory likely outpaced the immediate feasibility of overcoming these specific integration complexities, but the underlying principle of a managed pipeline service remains a prize worth pursuing through iterative refinement or alternative integration patterns."

### Growth Optimist

- "Right direction, wrong substrate — but not for the reason Pass 1 stated."
- "APIExport boundary was real, yes."
- "BUT the actual killer was unstated: team underestimated ops burden for 'directly managed' workload clusters."
- "That assumption — [that Pipeline Service could staff ops at the cost they budgeted] — never got stress-tested."
- "Tekton-via-APIExport could have worked with different controller patterns (eventual-consistency-aware reconcilers, for example)."
- "Other orgs have made kcp proxying work by accepting async feedback loops."
- "The real failure: didn't invest in controller refactoring because team assumed 'upstream acceptance' or 'fork maintenance' was untenable."
- "It was untenable — but only because they didn't resource it."
- "ADR-0009's operator pattern is simpler, lower-risk, but not obviously better at scale."
- "If the org had 2-3 engineers dedicated to Tekton kcp-awareness for 6 months in 2023, this decision might have held."
- "Instead, team chose the locally-optimized path (operator per cluster) over the globally-ambitious path (multi-cluster via APIExport)."
- "That's not failure — it's scope contraction under constraint."
- "I still think the most likely failure mode is that the team bet on a promising expansion path, but chose the wrong service substrate for turning that demand into a durable product."
- "Attack on `asm-7JioVbM6`: APIBinding/APIExport may have been intellectually attractive as the way to offer Tekton-as-a-service across many workload clusters, yet the ADR itself describes a surface that was already fragmented on day one. `PipelineRun` is exposed in kcp, `TaskRun` is not; Tekton Results stay on workload clusters; PaC needs separate ingress plumbing; and PaC-triggered runs are not visible on kcp."
- "That is not a clean platform boundary."
- "It is a partial virtualization layer with important user workflows falling through it."
- "Where my view evolves from Pass 1 is this: the idea may not have failed because multi-cluster pipeline demand was weak."
- "It may have failed because the chosen abstraction captured control-plane elegance while missing where real product pull compounds, namely debuggability, visibility, and universal workflow coverage."
- "If customers had to keep dropping from the shared kcp surface into workload-cluster specifics to answer basic questions, then `asm-7JioVbM6` broke not as a theory of scale, but as a theory of adoption friction."
- "A growth-oriented read is that the market signal was probably there; the packaging layer was not."
- "The counterfactual upside is important."
- "I can imagine this succeeding if APIBinding/APIExport had become a thin enrollment and discovery layer while the service truth stayed explicitly cluster-native, operator-driven, and honest about what lived where."
- "In that world, the team could still have offered shared leverage across clusters without pretending the entire Tekton experience belonged cleanly inside kcp."
- "So my revised stance is: the failure likely came from over-centralizing the product story around `asm-7JioVbM6`, when the winning path was probably a looser hybrid that embraced workload-cluster reality instead of abstracting over it."
- "The initial vision for konflux-adr-0001 was undeniably bold and sought to unlock powerful Tekton capabilities through kcp's elegant abstraction."
- "The aspiration to offer Tekton-as-a-service, leveraging APIBinding/APIExport, was a testament to forward-thinking architecture, promising a decentralized yet unified pipeline management experience that could fuel massive growth."
- "While the ADR's practical implementation faced significant hurdles, as evidenced by the consequences like TaskRun syncing limitations and the single-cluster gateway bottleneck, these were likely ambitious engineering challenges rather than fundamental flaws in the core concept."
- "The initiative aimed to abstract away complexity, and if it faltered, it was perhaps due to the sheer complexity of integrating Tekton itself, rather than a deficiency in kcp's foundational model."
- "The team's growth trajectory likely outpaced the immediate feasibility of overcoming these specific integration complexities, but the underlying principle of a managed pipeline service remains a prize worth pursuing through iterative refinement or alternative integration patterns."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-4c223nf9" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-4c223nf9" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
