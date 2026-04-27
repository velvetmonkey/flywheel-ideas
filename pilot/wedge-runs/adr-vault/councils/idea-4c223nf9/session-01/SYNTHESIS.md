---
type: council_synthesis
session_id: sess-Mnp3Jv58
idea_id: idea-4c223nf9
mode: pre_mortem
depth: light
---
# Council session sess-Mnp3Jv58

**Idea:** [[konflux-adr-0001 — ADR 1. Pipeline Service Phase 1 (konflux-ci/architecture)]] (`idea-4c223nf9`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T23:20:31.683Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | gemini | 0.70 | From my risk-averse vantage point, the failure of this ADR, marked by its 'Repl… |
| Risk Pessimist | claude | 0.62 | The load-bearing assumption (asm-7JioVbM6) likely failed, but my Pass 1 diagnos… |
| Risk Pessimist | codex | 0.70 | Twelve months later, this most likely failed because the architecture asked one… |
| Growth Optimist | claude | 0.52 | Pass 1 rationalized a failure as a learning opportunity, but the evidence sugge… |
| Growth Optimist | gemini | 0.70 | This ADR, '1. Pipeline Service Phase 1', was a courageous and essential first s… |
| Growth Optimist | codex | 0.62 | I still think the instinct behind this ADR was smart: create one Tekton-shaped … |

## Views

### Risk Pessimist (gemini)

From my risk-averse vantage point, the failure of this ADR, marked by its 'Replaced' status, is a clear indictment of the foundational assumption that kcp's APIBinding/APIExport model could possibly serve as a scalable substrate for multi-cluster Tekton-as-a-service. This model, touted for its elegance, likely buckled under the sheer weight of Tekton's dynamic and distributed nature. The complexities of synchronizing `PipelineRuns` and the outright inability to sync `TaskRuns` to KCP, as documented, are not mere implementation hiccups; they are symptomatic of a core architectural mismatch. Attempting to abstract away Tekton's inherent operational demands and distribute its controllers across workload clusters, while attempting to present a unified service via kcp's limited binding mechanism, was a recipe for a synchronization nightmare and an unmanageable operational burden. The system would have devolved into a brittle, high-latency mess, constantly fighting its own abstraction layer, ultimately rendering the 'Tekton-as-a-service' vision untenable.

**Key risks:**
- Inadequate scalability of kcp's APIBinding/APIExport for managing dynamic Tekton resources across many clusters.
- Unmanageable synchronization complexity and state drift between kcp and workload clusters for Tekton operations.
- The operational burden of maintaining a brittle abstraction layer for Tekton-as-a-service.

**Fragile insights:**
- The inherent suitability and scalability of kcp's APIBinding/APIExport model for abstracting complex, distributed services like Tekton across multiple workload clusters.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Evidence surfaces indicating the kcp APIBinding/APIExport model was technically sound but poorly implemented, or that the ADR was replaced due to a strategic pivot or the emergence of a superior alternative technology (like a new Tekton operator that simplified kcp integration) rather than a fundamental flaw in the kcp substrate assumption.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The confidence is high due to the ADR's 'Replaced' status and the explicit 'Consequences' highlighting severe limitations that directly challenge the core assumption. However, the lack of granular technical details on *why* the replacement occurred prevents a perfect score, as alternative explanations (strategic shifts, external factors) are still possible.

**Evidence:**
- "ADR 0001 was 'Replaced' by ADR 0009." — konflux-adr-0001 document, "Status" and "Superceded by" sections.
- "`TaskRun` objects cannot be synced to KCP, limiting interaction to `PipelineRun` objects only." — konflux-adr-0001 document, "Consequences" section.
- "Tekton code is difficult to refactor for kcp awareness, necessitating an external service." — konflux-adr-0001 document, "Context" section.
- "The solution is limited to one workload cluster for PaC ingress." — konflux-adr-0001 document, "Consequences" section.

### Risk Pessimist (claude)

The load-bearing assumption (asm-7JioVbM6) likely failed, but my Pass 1 diagnosis was overconfident about the mechanism. I claimed kcp adoption stalled, but that's speculative—kcp's own trajectory is opaque from this vantage. More likely: the APIExport model *was* workable, but the operational cost of managing dedicated workload clusters + the TaskRun visibility gap created friction that exposed a deeper organizational misalignment. The team probably discovered that owning cluster infrastructure wasn't their core competency, and that discovery triggered the pivot to ADR-0009. The failure isn't that the design was wrong on paper; it's that the design accepted constraints (TaskRun inaccessibility, single-cluster PaC, isolated Results) that looked like acceptable tradeoffs in October 2022 but became intolerable once real workloads hit the boundary and consumers demanded workarounds. This is a *constraints-didn't-match-reality failure*, not a *technology-pivot failure*. kcp may be thriving; the team just decided it wasn't worth the operational overhead for what they actually needed to ship.

**Key risks:**
- Assumption asm-7JioVbM6 framed as technology bet, but real risk was operational (cluster management burden) and organizational (competing priorities)
- Task visibility problem was known and accepted; reframing as surprise failure may misdiagnose root cause
- kcp's actual fate post-2023 is unknown from this corpus; 'stall' narrative is inference, not evidence

**Fragile insights:**
- Claim that 'APIExport machinery cannot provide transparency at Tekton's complexity' rests on assumption that transparency was actually required; may have been a red herring
- Assertion that 'dual-path implementations' emerged as evidence of architectural failure; could instead reflect weak governance or consumer insubordination
- Inference that forking Tekton was untenable; other orgs fork successfully; may underestimate team's willingness if pushed

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: kcp adoption continued strongly post-2023 and the team simply deprioritized it; or if the team successfully executed the model despite constraints and only later found a superior alternative; or if the real driver was staffing/timeline pressure unrelated to the architecture itself
- Most vulnerable assumption: `asm-7JioVbM6 itself may be sound, but I attributed its failure to the wrong cause (kcp stall vs. operational cost vs. organizational drift). The assumption didn't fail because kcp failed; it failed because the constraints were real and the team valued ease of operations over architectural purity.`
- Confidence rationale: 0.62 reflects uncertainty on three fronts: (1) I can't verify kcp's trajectory independently; (2) I can't distinguish between architecture failure, execution failure, and organizational misalignment from the corpus alone; (3) the data point (decision → replacement in 11 months) supports failure but not root cause. High confidence in 'the decision was abandoned'; lower confidence in why.

**Evidence:**
- "ADR-0001 explicitly lists TaskRun inaccessibility as a consequence, suggesting it was known at decision time" — vault://konflux-adr-0001
- "ADR was replaced by ADR-0009 within ~11 months, indicating the model didn't survive first contact with scale" — vault://konflux-adr-0001 superseded_by field

### Risk Pessimist (codex)

Twelve months later, this most likely failed because the architecture asked one assumption to carry too much weight. asm-7JioVbM6 says kcp's APIBinding/APIExport model was the right substrate for offering Tekton-as-a-service across multiple workload clusters at the planned scale. If that assumption was wrong, the system did not merely suffer implementation pain; it lost the coherence of its control plane. The ADR already describes a design where the user-facing API layer and the execution reality diverge.

Attack on asm-7JioVbM6 directly: the listed consequences read like substrate mismatch, not incidental edge cases. `TaskRun` objects cannot sync to KCP. PaC-created `PipelineRun` objects are not visible on kcp. Tekton Results stay on workload clusters. Ingress is effectively constrained to one workload cluster. That means the supposed shared service cannot provide a complete, consistent story for execution state, triggering, results, and routing as it grows. A platform built on partial truth eventually becomes operationally deceptive.

The operating model makes the failure mode worse. The Pipeline Service team had to directly manage workload clusters, rely partly on the OpenShift Pipelines Operator, partly on raw manifests, and support multiple internal customers while depending on upstream Tekton code that was explicitly hard to make kcp-aware. That is how version skew, upgrade fragility, drift, and incident finger-pointing become normal. Once scale or customer variety increases, every exception stops being local and starts becoming platform debt.

My revised view is slightly narrower than Pass 1: the fact that ADR-0001 was later replaced by ADR-0009 is suggestive, not conclusive, evidence. But the stronger case does not depend on that replacement. The ADR itself documents enough architectural asymmetry to predict failure in day-2 operations. The likely postmortem is that asm-7JioVbM6 was accepted before the team had proven full lifecycle visibility, cross-cluster routing, and sustainable ownership boundaries.

**Key risks:**
- Control-plane truth diverges from workload-cluster reality, leaving execution objects, triggers, and results only partially visible through kcp.
- Direct cluster ownership plus mixed deployment mechanisms creates upgrade skew, drift, and unclear operational ownership across teams.

**Fragile insights:**
- Supersession by ADR-0009 may reflect architectural failure, but it could also reflect planned maturation rather than a failed outcome.
- The one-workload-cluster ingress limitation is only fatal if actual adoption required meaningful multi-cluster balancing within the first year.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if 12-month outcome evidence showed multiple customers successfully using APIBinding/APIExport-backed Tekton with acceptable SLOs, manageable support load, and documented mitigations for TaskRun visibility, PaC visibility, results access, and ingress constraints.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Confidence is moderate because the ADR itself records several structural limitations that plausibly break a multi-cluster service model. Confidence is not higher because I do not have direct outcome data, and replacement by ADR-0009 is only suggestive rather than dispositive.

**Evidence:**
- "The ADR states that `TaskRun` objects cannot be synced to KCP, limiting direct interaction to `PipelineRun` objects." — citation: konflux-adr-0001, Consequences
- "The ADR states that PaC-created `PipelineRun` objects are not visible on kcp and that gateway traffic is limited to one workload cluster." — citation: konflux-adr-0001, Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001, Consequences
- "The ADR states that workload clusters must be directly managed by the Pipeline Service team rather than relying on generalized compute from CPS." — citation: konflux-adr-0001, Consequences
- "The ADR context states that Tekton libraries are not simple to refactor to be kcp-aware and that upstream acceptance or a fork would be required." — citation: konflux-adr-0001, Context

### Growth Optimist (claude)

Pass 1 rationalized a failure as a learning opportunity, but the evidence suggests the core assumption was wrong, not just early. The kcp bet wasn't 'defensible given context'—it was *unnecessary* complexity for a problem operators already solve better. The team didn't learn how to make kcp work; they learned that kcp was the wrong layer of abstraction altogether. ADR-0009 doesn't represent a refinement of the kcp strategy—it's a pivot admitting the original bet was misguided. The single-ingress limits, TaskRun sync gaps, and the preference for direct workload cluster management aren't lessons validating the kcp approach; they're symptoms that kcp solved a problem Pipeline Service didn't have. The 'multi-substrate hedge' I suggested in Pass 1 would have buried engineering investment in a path that had no chance of being better, just cheaper coverage. The harder truth: if operators were always going to be the answer, the decision to pursue kcp was a detour that cost velocity.

**Key risks:**
- Long-term kcp investment (expertise, roadmap commitment) might still have payoff for future multi-workspace scenarios not visible in 2022
- Dismissing the kcp path might ignore genuine architectural lessons about federation that operators don't surface
- Operator-based federation may hit scaling ceilings later that kcp would have avoided—the failure is pre-mature, not post-wise

**Fragile insights:**
- That the team 'learned' from kcp: learning requires the bet to have been reasonable. If the bet was wrong from the start, it's a tax, not a lesson.
- That multi-substrate was a missed upside: only if both paths were plausible. If operator path was always better, building both is waste.
- That kcp immaturity was the blocker: what if the blocker was 'kcp isn't fit for this use case at any maturity level'?

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Future multi-workspace federation scenarios prove that the expertise and patterns from kcp paid off. Or: operators hit scaling/isolation ceilings that kcp would have solved. Or: the team's organizational growth required kcp's model even if Pipeline Service didn't.
- Most vulnerable assumption: `asm-7JioVbM6 — I'm directly attacking it rather than defending it. I'm saying the evidence falsifies it. But I'm basing that on the success of ADR-0009, which could be selection bias: we see the path that worked, not the counterfactual where kcp matured faster.`
- Confidence rationale: 0.52 is deep skepticism of my own Pass 1 reasoning. The honest confidence drop reflects that I was rationalizing. But 0.52 (not 0.3) because: the operator path *did* work, the transition *did* happen, and there's no evidence kcp would have been better even with more maturity. What I can't know: whether internal kcp knowledge seeded better decisions downstream, or whether the org lost leverage by abandoning the bet early. I'm no longer confident in the learning narrative, but I'm not confident the bet was clearly wrong at decision time either.

**Evidence:**
- "ADR-0009 (operator-based) replaced ADR-0001 (kcp-based), suggesting the original assumption was wrong, not refined" — conflict-adr-0001 status field: 'Replaced, superseded_by: 0009'
- "Pipeline Service team ended up managing workload clusters directly, not through kcp's mediated APIExport model" — ADR-0001 Consequences: 'Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team'
- "TaskRun sync gaps and single-ingress limits are symptoms of kcp being the wrong abstraction layer, not fixable immaturity issues" — ADR-0001 Consequences: single-ingress limit, TaskRun cannot be synced

### Growth Optimist (gemini)

This ADR, '1. Pipeline Service Phase 1', was a courageous and essential first step in architecting a truly scalable, distributed Tekton-as-a-service powered by kcp. The vision to abstract Tekton's complexity into a managed Pipeline Service, rather than attempting a difficult refactor or fork, was a testament to forward-thinking platform engineering. It unlocked immediate value for crucial services like App Studio and HACBS, proving the potential of kcp's `APIBinding`/`APIExport` model as a substrate for multi-cluster offerings. The challenges encountered, such as `TaskRun` sync limitations and PaC ingress constraints, were not indicative of a flawed substrate but rather the natural growing pains of pioneering a new distributed paradigm. These were invaluable lessons that directly informed the evolution to ADR-0009, pushing us towards an even more sophisticated, operator-driven solution. The journey from this Phase 1 to its successor underscores a relentless drive for innovation and a commitment to building a robust, ever-improving platform. We see this as a powerful validation of the overall direction, even as specific tactical implementations evolve.

**Key risks:**
- Execution Risk: Underestimating the engineering effort and complexity of managing Tekton controllers across multiple workload clusters directly.
- Scope Creep: The initial phase may have been too ambitious, leading to unmanageable workarounds.
- Substrate Fit: The `APIBinding`/`APIExport` model might have inherent limitations for deeply integrating complex, stateful services like Tekton.

**Fragile insights:**
- The assumption that kcp's `APIBinding`/`APIExport` model could inherently support the full spectrum of Tekton's capabilities (including `TaskRun` synchronization and advanced networking) at scale without significant custom development.
- The belief that the limitations listed were purely implementation details of Phase 1, rather than indicators of deeper architectural constraints imposed by the chosen kcp integration pattern for Tekton.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerges that ADR-0009 fundamentally moved away from the `APIBinding`/`APIExport` model for Tekton management, indicating that the substrate itself was problematic for this specific use case, rather than just the initial implementation. For instance, if ADR-0009 describes a completely different orchestration mechanism that doesn't rely on kcp's core data plane primitives for Tekton, my optimistic view of the substrate would be invalidated.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The 'Growth Optimist' persona inherently leans towards high confidence in innovative directions, but the self-critique acknowledges that the significant, explicit limitations and the fact that the ADR was 'Replaced' suggest the foundational assumption may have been overly optimistic regarding practical execution and the model's suitability for all Tekton aspects. Thus, confidence is reduced from an initial extreme high to a still optimistic but more grounded moderate-high.

**Evidence:**
- "Tekton code utilizes libraries that are not simple to refactor and make 'kcp aware.'" — ADR-0001 Context
- "`TaskRun` objects cannot be synced to KCP." — ADR-0001 Consequences
- "We are limited to one workload cluster - the gateway cannot load balance traffic across clusters." — ADR-0001 Consequences
- "Tekton Results can only be accessed on workload clusters." — ADR-0001 Consequences
- "ADR-0001 was superseded by ADR-0009." — ADR-0001 Status Section

### Growth Optimist (codex)

I still think the instinct behind this ADR was smart: create one Tekton-shaped platform surface so new services can start faster. If this failed 12 months later, I would not read that as proof that shared pipelines were a bad ambition. I would read it as a failure to pick the right abstraction layer soon enough. The team tried to turn a control-plane mechanism into a product boundary, and that usually looks clean before it collides with real workflow edges.

Attack asm-7JioVbM6 directly. If kcp's APIBinding/APIExport model were the right substrate for Tekton-as-a-service at the scale this team hoped to reach, it would preserve the parts of Tekton that matter operationally as more tenants and clusters arrive. The ADR records the opposite: TaskRun objects cannot sync to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results stay on workload clusters, and ingress is limited to one workload cluster. Those are not cosmetic gaps. They cut across debugging, observability, event flow, and multi-cluster traffic, which are exactly the surfaces that get more important as adoption grows.

The more interesting failure mode is that this architecture may have delivered enough value for customer 0 to feel promising while still blocking generalization. Once the Pipeline Service team also had to directly manage workload clusters, the supposed shared substrate stopped reducing coordination and started concentrating bespoke ownership. My optimistic read is that the upside never disappeared; it just needed a thinner, more opinionated service contract around customer outcomes, or an operator-first path earlier, instead of trying to mirror Tekton's native surface through kcp. In that sense, the project likely failed not because the vision lacked upside, but because asm-7JioVbM6 asked the substrate to be both compatibility layer and scale engine, and it was not strong enough to be both.

**Key risks:**
- The chosen kcp substrate preserved API shape but dropped user-critical pipeline behaviors like TaskRun visibility, Results access, and PaC visibility.
- Direct ownership of workload clusters turned a reusable platform bet into an operationally bespoke service that became harder to generalize with each customer.

**Fragile insights:**
- If most real consumers only needed PipelineRun-level execution and accepted cluster-local debugging, my argument that the substrate was wrong weakens substantially.
- ADR-0009 superseding this design may reflect planned maturation rather than proof that asm-7JioVbM6 was fundamentally flawed.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if later evidence showed that multiple services onboarded successfully across multiple workload clusters, customers were satisfied with a PipelineRun-only surface, cluster-local Results and TaskRun access did not materially hurt debugging or adoption, and direct cluster ownership remained operationally light.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Moderate confidence because the failure story is grounded in explicit limitations documented by the ADR itself, but lower than Pass 1 because those limitations prove friction, not necessarily fatality, under a narrower product scope.

**Evidence:**
- "The ADR says TaskRun objects cannot be synced to KCP and App Studio and HACBS components may only interact with PipelineRun objects directly." — citation: konflux-adr-0001, Consequences
- "The ADR says PaC-created PipelineRun objects are not visible on kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says ingress is limited to one workload cluster because the gateway cannot load balance traffic across clusters." — citation: konflux-adr-0001, Consequences
- "The ADR says Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001, Consequences
- "The ADR says workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team and cannot rely on general compute as a service from CPS." — citation: konflux-adr-0001, Consequences
- "The ADR context says making Tekton kcp-aware would require upstream acceptance or a Tekton fork with local patches." — citation: konflux-adr-0001, Context

## Evidence (union, deduped)

- "ADR 0001 was 'Replaced' by ADR 0009." — konflux-adr-0001 document, "Status" and "Superceded by" sections.
- "`TaskRun` objects cannot be synced to KCP, limiting interaction to `PipelineRun` objects only." — konflux-adr-0001 document, "Consequences" section.
- "Tekton code is difficult to refactor for kcp awareness, necessitating an external service." — konflux-adr-0001 document, "Context" section.
- "The solution is limited to one workload cluster for PaC ingress." — konflux-adr-0001 document, "Consequences" section.
- "ADR-0001 explicitly lists TaskRun inaccessibility as a consequence, suggesting it was known at decision time" — vault://konflux-adr-0001
- "ADR was replaced by ADR-0009 within ~11 months, indicating the model didn't survive first contact with scale" — vault://konflux-adr-0001 superseded_by field
- "The ADR states that `TaskRun` objects cannot be synced to KCP, limiting direct interaction to `PipelineRun` objects." — citation: konflux-adr-0001, Consequences
- "The ADR states that PaC-created `PipelineRun` objects are not visible on kcp and that gateway traffic is limited to one workload cluster." — citation: konflux-adr-0001, Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001, Consequences
- "The ADR states that workload clusters must be directly managed by the Pipeline Service team rather than relying on generalized compute from CPS." — citation: konflux-adr-0001, Consequences
- "The ADR context states that Tekton libraries are not simple to refactor to be kcp-aware and that upstream acceptance or a fork would be required." — citation: konflux-adr-0001, Context
- "ADR-0009 (operator-based) replaced ADR-0001 (kcp-based), suggesting the original assumption was wrong, not refined" — conflict-adr-0001 status field: 'Replaced, superseded_by: 0009'
- "Pipeline Service team ended up managing workload clusters directly, not through kcp's mediated APIExport model" — ADR-0001 Consequences: 'Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team'
- "TaskRun sync gaps and single-ingress limits are symptoms of kcp being the wrong abstraction layer, not fixable immaturity issues" — ADR-0001 Consequences: single-ingress limit, TaskRun cannot be synced
- "Tekton code utilizes libraries that are not simple to refactor and make 'kcp aware.'" — ADR-0001 Context
- "`TaskRun` objects cannot be synced to KCP." — ADR-0001 Consequences
- "We are limited to one workload cluster - the gateway cannot load balance traffic across clusters." — ADR-0001 Consequences
- "Tekton Results can only be accessed on workload clusters." — ADR-0001 Consequences
- "ADR-0001 was superseded by ADR-0009." — ADR-0001 Status Section
- "The ADR says TaskRun objects cannot be synced to KCP and App Studio and HACBS components may only interact with PipelineRun objects directly." — citation: konflux-adr-0001, Consequences
- "The ADR says PaC-created PipelineRun objects are not visible on kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says ingress is limited to one workload cluster because the gateway cannot load balance traffic across clusters." — citation: konflux-adr-0001, Consequences
- "The ADR says Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001, Consequences
- "The ADR says workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team and cannot rely on general compute as a service from CPS." — citation: konflux-adr-0001, Consequences
- "The ADR context says making Tekton kcp-aware would require upstream acceptance or a Tekton fork with local patches." — citation: konflux-adr-0001, Context

## Agreement

_(no shared claims across views at current threshold)_

## Disagreement

### Risk Pessimist

- "From my risk-averse vantage point, the failure of this ADR, marked by its 'Replaced' status, is a clear indictment of the foundational assumption that kcp's APIBinding/APIExport model could possibly serve as a scalable substrate for multi-cluster Tekton-as-a-service."
- "This model, touted for its elegance, likely buckled under the sheer weight of Tekton's dynamic and distributed nature."
- "The complexities of synchronizing `PipelineRuns` and the outright inability to sync `TaskRuns` to KCP, as documented, are not mere implementation hiccups; they are symptomatic of a core architectural mismatch."
- "Attempting to abstract away Tekton's inherent operational demands and distribute its controllers across workload clusters, while attempting to present a unified service via kcp's limited binding mechanism, was a recipe for a synchronization nightmare and an unmanageable operational burden."
- "The system would have devolved into a brittle, high-latency mess, constantly fighting its own abstraction layer, ultimately rendering the 'Tekton-as-a-service' vision untenable."
- "The load-bearing assumption (asm-7JioVbM6) likely failed, but my Pass 1 diagnosis was overconfident about the mechanism."
- "I claimed kcp adoption stalled, but that's speculative—kcp's own trajectory is opaque from this vantage."
- "More likely: the APIExport model *was* workable, but the operational cost of managing dedicated workload clusters + the TaskRun visibility gap created friction that exposed a deeper organizational misalignment."
- "The team probably discovered that owning cluster infrastructure wasn't their core competency, and that discovery triggered the pivot to ADR-0009."
- "The failure isn't that the design was wrong on paper; it's that the design accepted constraints (TaskRun inaccessibility, single-cluster PaC, isolated Results) that looked like acceptable tradeoffs in October 2022 but became intolerable once real workloads hit the boundary and consumers demanded workarounds."
- "This is a *constraints-didn't-match-reality failure*, not a *technology-pivot failure*. kcp may be thriving; the team just decided it wasn't worth the operational overhead for what they actually needed to ship."
- "Twelve months later, this most likely failed because the architecture asked one assumption to carry too much weight. asm-7JioVbM6 says kcp's APIBinding/APIExport model was the right substrate for offering Tekton-as-a-service across multiple workload clusters at the planned scale."
- "If that assumption was wrong, the system did not merely suffer implementation pain; it lost the coherence of its control plane."
- "The ADR already describes a design where the user-facing API layer and the execution reality diverge."
- "Attack on asm-7JioVbM6 directly: the listed consequences read like substrate mismatch, not incidental edge cases. `TaskRun` objects cannot sync to KCP."
- "PaC-created `PipelineRun` objects are not visible on kcp."
- "Tekton Results stay on workload clusters."
- "Ingress is effectively constrained to one workload cluster."
- "That means the supposed shared service cannot provide a complete, consistent story for execution state, triggering, results, and routing as it grows."
- "A platform built on partial truth eventually becomes operationally deceptive."
- "The operating model makes the failure mode worse."
- "The Pipeline Service team had to directly manage workload clusters, rely partly on the OpenShift Pipelines Operator, partly on raw manifests, and support multiple internal customers while depending on upstream Tekton code that was explicitly hard to make kcp-aware."
- "That is how version skew, upgrade fragility, drift, and incident finger-pointing become normal."
- "Once scale or customer variety increases, every exception stops being local and starts becoming platform debt."
- "My revised view is slightly narrower than Pass 1: the fact that ADR-0001 was later replaced by ADR-0009 is suggestive, not conclusive, evidence."
- "But the stronger case does not depend on that replacement."
- "The ADR itself documents enough architectural asymmetry to predict failure in day-2 operations."
- "The likely postmortem is that asm-7JioVbM6 was accepted before the team had proven full lifecycle visibility, cross-cluster routing, and sustainable ownership boundaries."

### Risk Pessimist

- "From my risk-averse vantage point, the failure of this ADR, marked by its 'Replaced' status, is a clear indictment of the foundational assumption that kcp's APIBinding/APIExport model could possibly serve as a scalable substrate for multi-cluster Tekton-as-a-service."
- "This model, touted for its elegance, likely buckled under the sheer weight of Tekton's dynamic and distributed nature."
- "The complexities of synchronizing `PipelineRuns` and the outright inability to sync `TaskRuns` to KCP, as documented, are not mere implementation hiccups; they are symptomatic of a core architectural mismatch."
- "Attempting to abstract away Tekton's inherent operational demands and distribute its controllers across workload clusters, while attempting to present a unified service via kcp's limited binding mechanism, was a recipe for a synchronization nightmare and an unmanageable operational burden."
- "The system would have devolved into a brittle, high-latency mess, constantly fighting its own abstraction layer, ultimately rendering the 'Tekton-as-a-service' vision untenable."
- "The load-bearing assumption (asm-7JioVbM6) likely failed, but my Pass 1 diagnosis was overconfident about the mechanism."
- "I claimed kcp adoption stalled, but that's speculative—kcp's own trajectory is opaque from this vantage."
- "More likely: the APIExport model *was* workable, but the operational cost of managing dedicated workload clusters + the TaskRun visibility gap created friction that exposed a deeper organizational misalignment."
- "The team probably discovered that owning cluster infrastructure wasn't their core competency, and that discovery triggered the pivot to ADR-0009."
- "The failure isn't that the design was wrong on paper; it's that the design accepted constraints (TaskRun inaccessibility, single-cluster PaC, isolated Results) that looked like acceptable tradeoffs in October 2022 but became intolerable once real workloads hit the boundary and consumers demanded workarounds."
- "This is a *constraints-didn't-match-reality failure*, not a *technology-pivot failure*. kcp may be thriving; the team just decided it wasn't worth the operational overhead for what they actually needed to ship."
- "Twelve months later, this most likely failed because the architecture asked one assumption to carry too much weight. asm-7JioVbM6 says kcp's APIBinding/APIExport model was the right substrate for offering Tekton-as-a-service across multiple workload clusters at the planned scale."
- "If that assumption was wrong, the system did not merely suffer implementation pain; it lost the coherence of its control plane."
- "The ADR already describes a design where the user-facing API layer and the execution reality diverge."
- "Attack on asm-7JioVbM6 directly: the listed consequences read like substrate mismatch, not incidental edge cases. `TaskRun` objects cannot sync to KCP."
- "PaC-created `PipelineRun` objects are not visible on kcp."
- "Tekton Results stay on workload clusters."
- "Ingress is effectively constrained to one workload cluster."
- "That means the supposed shared service cannot provide a complete, consistent story for execution state, triggering, results, and routing as it grows."
- "A platform built on partial truth eventually becomes operationally deceptive."
- "The operating model makes the failure mode worse."
- "The Pipeline Service team had to directly manage workload clusters, rely partly on the OpenShift Pipelines Operator, partly on raw manifests, and support multiple internal customers while depending on upstream Tekton code that was explicitly hard to make kcp-aware."
- "That is how version skew, upgrade fragility, drift, and incident finger-pointing become normal."
- "Once scale or customer variety increases, every exception stops being local and starts becoming platform debt."
- "My revised view is slightly narrower than Pass 1: the fact that ADR-0001 was later replaced by ADR-0009 is suggestive, not conclusive, evidence."
- "But the stronger case does not depend on that replacement."
- "The ADR itself documents enough architectural asymmetry to predict failure in day-2 operations."
- "The likely postmortem is that asm-7JioVbM6 was accepted before the team had proven full lifecycle visibility, cross-cluster routing, and sustainable ownership boundaries."

### Risk Pessimist

- "From my risk-averse vantage point, the failure of this ADR, marked by its 'Replaced' status, is a clear indictment of the foundational assumption that kcp's APIBinding/APIExport model could possibly serve as a scalable substrate for multi-cluster Tekton-as-a-service."
- "This model, touted for its elegance, likely buckled under the sheer weight of Tekton's dynamic and distributed nature."
- "The complexities of synchronizing `PipelineRuns` and the outright inability to sync `TaskRuns` to KCP, as documented, are not mere implementation hiccups; they are symptomatic of a core architectural mismatch."
- "Attempting to abstract away Tekton's inherent operational demands and distribute its controllers across workload clusters, while attempting to present a unified service via kcp's limited binding mechanism, was a recipe for a synchronization nightmare and an unmanageable operational burden."
- "The system would have devolved into a brittle, high-latency mess, constantly fighting its own abstraction layer, ultimately rendering the 'Tekton-as-a-service' vision untenable."
- "The load-bearing assumption (asm-7JioVbM6) likely failed, but my Pass 1 diagnosis was overconfident about the mechanism."
- "I claimed kcp adoption stalled, but that's speculative—kcp's own trajectory is opaque from this vantage."
- "More likely: the APIExport model *was* workable, but the operational cost of managing dedicated workload clusters + the TaskRun visibility gap created friction that exposed a deeper organizational misalignment."
- "The team probably discovered that owning cluster infrastructure wasn't their core competency, and that discovery triggered the pivot to ADR-0009."
- "The failure isn't that the design was wrong on paper; it's that the design accepted constraints (TaskRun inaccessibility, single-cluster PaC, isolated Results) that looked like acceptable tradeoffs in October 2022 but became intolerable once real workloads hit the boundary and consumers demanded workarounds."
- "This is a *constraints-didn't-match-reality failure*, not a *technology-pivot failure*. kcp may be thriving; the team just decided it wasn't worth the operational overhead for what they actually needed to ship."
- "Twelve months later, this most likely failed because the architecture asked one assumption to carry too much weight. asm-7JioVbM6 says kcp's APIBinding/APIExport model was the right substrate for offering Tekton-as-a-service across multiple workload clusters at the planned scale."
- "If that assumption was wrong, the system did not merely suffer implementation pain; it lost the coherence of its control plane."
- "The ADR already describes a design where the user-facing API layer and the execution reality diverge."
- "Attack on asm-7JioVbM6 directly: the listed consequences read like substrate mismatch, not incidental edge cases. `TaskRun` objects cannot sync to KCP."
- "PaC-created `PipelineRun` objects are not visible on kcp."
- "Tekton Results stay on workload clusters."
- "Ingress is effectively constrained to one workload cluster."
- "That means the supposed shared service cannot provide a complete, consistent story for execution state, triggering, results, and routing as it grows."
- "A platform built on partial truth eventually becomes operationally deceptive."
- "The operating model makes the failure mode worse."
- "The Pipeline Service team had to directly manage workload clusters, rely partly on the OpenShift Pipelines Operator, partly on raw manifests, and support multiple internal customers while depending on upstream Tekton code that was explicitly hard to make kcp-aware."
- "That is how version skew, upgrade fragility, drift, and incident finger-pointing become normal."
- "Once scale or customer variety increases, every exception stops being local and starts becoming platform debt."
- "My revised view is slightly narrower than Pass 1: the fact that ADR-0001 was later replaced by ADR-0009 is suggestive, not conclusive, evidence."
- "But the stronger case does not depend on that replacement."
- "The ADR itself documents enough architectural asymmetry to predict failure in day-2 operations."
- "The likely postmortem is that asm-7JioVbM6 was accepted before the team had proven full lifecycle visibility, cross-cluster routing, and sustainable ownership boundaries."

### Growth Optimist

- "Pass 1 rationalized a failure as a learning opportunity, but the evidence suggests the core assumption was wrong, not just early."
- "The kcp bet wasn't 'defensible given context'—it was *unnecessary* complexity for a problem operators already solve better."
- "The team didn't learn how to make kcp work; they learned that kcp was the wrong layer of abstraction altogether."
- "ADR-0009 doesn't represent a refinement of the kcp strategy—it's a pivot admitting the original bet was misguided."
- "The single-ingress limits, TaskRun sync gaps, and the preference for direct workload cluster management aren't lessons validating the kcp approach; they're symptoms that kcp solved a problem Pipeline Service didn't have."
- "The 'multi-substrate hedge' I suggested in Pass 1 would have buried engineering investment in a path that had no chance of being better, just cheaper coverage."
- "The harder truth: if operators were always going to be the answer, the decision to pursue kcp was a detour that cost velocity."
- "Pipeline Service Phase 1', was a courageous and essential first step in architecting a truly scalable, distributed Tekton-as-a-service powered by kcp."
- "The vision to abstract Tekton's complexity into a managed Pipeline Service, rather than attempting a difficult refactor or fork, was a testament to forward-thinking platform engineering."
- "It unlocked immediate value for crucial services like App Studio and HACBS, proving the potential of kcp's `APIBinding`/`APIExport` model as a substrate for multi-cluster offerings."
- "The challenges encountered, such as `TaskRun` sync limitations and PaC ingress constraints, were not indicative of a flawed substrate but rather the natural growing pains of pioneering a new distributed paradigm."
- "These were invaluable lessons that directly informed the evolution to ADR-0009, pushing us towards an even more sophisticated, operator-driven solution."
- "The journey from this Phase 1 to its successor underscores a relentless drive for innovation and a commitment to building a robust, ever-improving platform."
- "We see this as a powerful validation of the overall direction, even as specific tactical implementations evolve."
- "I still think the instinct behind this ADR was smart: create one Tekton-shaped platform surface so new services can start faster."
- "If this failed 12 months later, I would not read that as proof that shared pipelines were a bad ambition."
- "I would read it as a failure to pick the right abstraction layer soon enough."
- "The team tried to turn a control-plane mechanism into a product boundary, and that usually looks clean before it collides with real workflow edges."
- "If kcp's APIBinding/APIExport model were the right substrate for Tekton-as-a-service at the scale this team hoped to reach, it would preserve the parts of Tekton that matter operationally as more tenants and clusters arrive."
- "The ADR records the opposite: TaskRun objects cannot sync to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results stay on workload clusters, and ingress is limited to one workload cluster."
- "Those are not cosmetic gaps."
- "They cut across debugging, observability, event flow, and multi-cluster traffic, which are exactly the surfaces that get more important as adoption grows."
- "The more interesting failure mode is that this architecture may have delivered enough value for customer 0 to feel promising while still blocking generalization."
- "Once the Pipeline Service team also had to directly manage workload clusters, the supposed shared substrate stopped reducing coordination and started concentrating bespoke ownership."
- "My optimistic read is that the upside never disappeared; it just needed a thinner, more opinionated service contract around customer outcomes, or an operator-first path earlier, instead of trying to mirror Tekton's native surface through kcp."
- "In that sense, the project likely failed not because the vision lacked upside, but because asm-7JioVbM6 asked the substrate to be both compatibility layer and scale engine, and it was not strong enough to be both."

### Growth Optimist

- "Pass 1 rationalized a failure as a learning opportunity, but the evidence suggests the core assumption was wrong, not just early."
- "The kcp bet wasn't 'defensible given context'—it was *unnecessary* complexity for a problem operators already solve better."
- "The team didn't learn how to make kcp work; they learned that kcp was the wrong layer of abstraction altogether."
- "ADR-0009 doesn't represent a refinement of the kcp strategy—it's a pivot admitting the original bet was misguided."
- "The single-ingress limits, TaskRun sync gaps, and the preference for direct workload cluster management aren't lessons validating the kcp approach; they're symptoms that kcp solved a problem Pipeline Service didn't have."
- "The 'multi-substrate hedge' I suggested in Pass 1 would have buried engineering investment in a path that had no chance of being better, just cheaper coverage."
- "The harder truth: if operators were always going to be the answer, the decision to pursue kcp was a detour that cost velocity."
- "Pipeline Service Phase 1', was a courageous and essential first step in architecting a truly scalable, distributed Tekton-as-a-service powered by kcp."
- "The vision to abstract Tekton's complexity into a managed Pipeline Service, rather than attempting a difficult refactor or fork, was a testament to forward-thinking platform engineering."
- "It unlocked immediate value for crucial services like App Studio and HACBS, proving the potential of kcp's `APIBinding`/`APIExport` model as a substrate for multi-cluster offerings."
- "The challenges encountered, such as `TaskRun` sync limitations and PaC ingress constraints, were not indicative of a flawed substrate but rather the natural growing pains of pioneering a new distributed paradigm."
- "These were invaluable lessons that directly informed the evolution to ADR-0009, pushing us towards an even more sophisticated, operator-driven solution."
- "The journey from this Phase 1 to its successor underscores a relentless drive for innovation and a commitment to building a robust, ever-improving platform."
- "We see this as a powerful validation of the overall direction, even as specific tactical implementations evolve."
- "I still think the instinct behind this ADR was smart: create one Tekton-shaped platform surface so new services can start faster."
- "If this failed 12 months later, I would not read that as proof that shared pipelines were a bad ambition."
- "I would read it as a failure to pick the right abstraction layer soon enough."
- "The team tried to turn a control-plane mechanism into a product boundary, and that usually looks clean before it collides with real workflow edges."
- "If kcp's APIBinding/APIExport model were the right substrate for Tekton-as-a-service at the scale this team hoped to reach, it would preserve the parts of Tekton that matter operationally as more tenants and clusters arrive."
- "The ADR records the opposite: TaskRun objects cannot sync to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results stay on workload clusters, and ingress is limited to one workload cluster."
- "Those are not cosmetic gaps."
- "They cut across debugging, observability, event flow, and multi-cluster traffic, which are exactly the surfaces that get more important as adoption grows."
- "The more interesting failure mode is that this architecture may have delivered enough value for customer 0 to feel promising while still blocking generalization."
- "Once the Pipeline Service team also had to directly manage workload clusters, the supposed shared substrate stopped reducing coordination and started concentrating bespoke ownership."
- "My optimistic read is that the upside never disappeared; it just needed a thinner, more opinionated service contract around customer outcomes, or an operator-first path earlier, instead of trying to mirror Tekton's native surface through kcp."
- "In that sense, the project likely failed not because the vision lacked upside, but because asm-7JioVbM6 asked the substrate to be both compatibility layer and scale engine, and it was not strong enough to be both."

### Growth Optimist

- "Pass 1 rationalized a failure as a learning opportunity, but the evidence suggests the core assumption was wrong, not just early."
- "The kcp bet wasn't 'defensible given context'—it was *unnecessary* complexity for a problem operators already solve better."
- "The team didn't learn how to make kcp work; they learned that kcp was the wrong layer of abstraction altogether."
- "ADR-0009 doesn't represent a refinement of the kcp strategy—it's a pivot admitting the original bet was misguided."
- "The single-ingress limits, TaskRun sync gaps, and the preference for direct workload cluster management aren't lessons validating the kcp approach; they're symptoms that kcp solved a problem Pipeline Service didn't have."
- "The 'multi-substrate hedge' I suggested in Pass 1 would have buried engineering investment in a path that had no chance of being better, just cheaper coverage."
- "The harder truth: if operators were always going to be the answer, the decision to pursue kcp was a detour that cost velocity."
- "Pipeline Service Phase 1', was a courageous and essential first step in architecting a truly scalable, distributed Tekton-as-a-service powered by kcp."
- "The vision to abstract Tekton's complexity into a managed Pipeline Service, rather than attempting a difficult refactor or fork, was a testament to forward-thinking platform engineering."
- "It unlocked immediate value for crucial services like App Studio and HACBS, proving the potential of kcp's `APIBinding`/`APIExport` model as a substrate for multi-cluster offerings."
- "The challenges encountered, such as `TaskRun` sync limitations and PaC ingress constraints, were not indicative of a flawed substrate but rather the natural growing pains of pioneering a new distributed paradigm."
- "These were invaluable lessons that directly informed the evolution to ADR-0009, pushing us towards an even more sophisticated, operator-driven solution."
- "The journey from this Phase 1 to its successor underscores a relentless drive for innovation and a commitment to building a robust, ever-improving platform."
- "We see this as a powerful validation of the overall direction, even as specific tactical implementations evolve."
- "I still think the instinct behind this ADR was smart: create one Tekton-shaped platform surface so new services can start faster."
- "If this failed 12 months later, I would not read that as proof that shared pipelines were a bad ambition."
- "I would read it as a failure to pick the right abstraction layer soon enough."
- "The team tried to turn a control-plane mechanism into a product boundary, and that usually looks clean before it collides with real workflow edges."
- "If kcp's APIBinding/APIExport model were the right substrate for Tekton-as-a-service at the scale this team hoped to reach, it would preserve the parts of Tekton that matter operationally as more tenants and clusters arrive."
- "The ADR records the opposite: TaskRun objects cannot sync to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results stay on workload clusters, and ingress is limited to one workload cluster."
- "Those are not cosmetic gaps."
- "They cut across debugging, observability, event flow, and multi-cluster traffic, which are exactly the surfaces that get more important as adoption grows."
- "The more interesting failure mode is that this architecture may have delivered enough value for customer 0 to feel promising while still blocking generalization."
- "Once the Pipeline Service team also had to directly manage workload clusters, the supposed shared substrate stopped reducing coordination and started concentrating bespoke ownership."
- "My optimistic read is that the upside never disappeared; it just needed a thinner, more opinionated service contract around customer outcomes, or an operator-first path earlier, instead of trying to mirror Tekton's native surface through kcp."
- "In that sense, the project likely failed not because the vision lacked upside, but because asm-7JioVbM6 asked the substrate to be both compatibility layer and scale engine, and it was not strong enough to be both."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-4c223nf9" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-4c223nf9" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
