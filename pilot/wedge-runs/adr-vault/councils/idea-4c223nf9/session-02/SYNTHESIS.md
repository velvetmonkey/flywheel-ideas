---
type: council_synthesis
session_id: sess-g7LjRL1E
idea_id: idea-4c223nf9
mode: pre_mortem
depth: light
---
# Council session sess-g7LjRL1E

**Idea:** [[konflux-adr-0001 — ADR 1. Pipeline Service Phase 1 (konflux-ci/architecture)]] (`idea-4c223nf9`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T23:24:24.942Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | gemini | 0.85 | This architectural gamble on kcp's APIBinding/APIExport model for a scalable Te… |
| Risk Pessimist | claude | 0.48 | Pass 1 narrated architectural failure under the assumption of collapse. Revised… |
| Growth Optimist | claude | 0.54 | My Pass 1 critique had the right shape but was overconfident and missing crucia… |
| Risk Pessimist | codex | 0.68 | Twelve months later, I would blame failure first on asm-7JioVbM6. APIBinding/AP… |
| Growth Optimist | gemini | 0.55 | The initial vision of konflux-adr-0001, to offer Tekton pipelines as a managed … |
| Growth Optimist | codex | 0.62 | Twelve months later, I still think the failure centered on asm-7JioVbM6. The up… |

## Views

### Risk Pessimist (gemini)

This architectural gamble on kcp's APIBinding/APIExport model for a scalable Tekton-as-a-service was a predictable disaster, a testament to optimism over realism. The promise of abstracting Tekton's inherent complexity through kcp's substrate crumbled under the weight of its own limitations. We were shackled from the outset by the inability to sync crucial `TaskRun` objects and access vital components like Tekton Results, effectively hobbling any genuine multi-cluster scalability or unified API access. The reliance on a single workload cluster for ingress proved a dead end, entirely negating the supposed benefits of a distributed Tekton offering and forcing operational overhead onto the Pipeline Service team. This wasn't a robust substrate; it was a bottleneck, forcing a costly and inevitable pivot to a more integrated operator model because the initial vision was fundamentally incompatible with the reality of managing complex, stateful distributed systems at scale.

The assumption that kcp's `APIBinding/APIExport` model was the right substrate for offering Tekton-as-a-service across multiple workload clusters was a critical misjudgment. The consequences clearly show that this abstraction layer was insufficient for the granular control and unified access required by Tekton, leading to significant workarounds and limitations that undermined the entire premise. The failure to integrate key components and scale ingress across clusters demonstrates a critical misunderstanding of how to apply kcp's model to such a demanding service.

**Key risks:**
- Inability to synchronize critical Tekton `TaskRun` objects to KCP, limiting functional interaction.
- Significant operational overhead due to direct management of workload clusters instead of leveraging kcp's abstraction.
- Failure to achieve true multi-cluster scalability, with ingress limited to a single cluster.
- Lack of unified access to essential Tekton features like Tekton Results, requiring extensive additional work.
- Tekton code's inherent complexity and lack of kcp-awareness necessitating unfeasible refactoring or forking.

**Fragile insights:**
- kcp's `APIBinding/APIExport` model is sufficiently robust and flexible to serve as the primary substrate for abstracting and scaling complex, stateful distributed systems like Tekton across multiple workload clusters.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Evidence could emerge that the `APIBinding/APIExport` model *is* fundamentally capable of handling such workloads, and the observed failures were solely due to specific implementation errors, a lack of mature supporting kcp controllers (e.g., for Tekton Results remote access, multi-cluster ingress), or a failure to sufficiently refactor Tekton's internal libraries. If it could be demonstrated that these specific issues were addressable within the kcp substrate without a complete architectural pivot, my stance might be too severe.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The explicit consequences listed in the ADR directly contradict the assumed scalability and broad applicability of the kcp substrate for Tekton. The fact that the decision was superseded by a fundamentally different approach (operator model) provides strong post-hoc validation of the initial architectural risk. The confidence reflects the clear failure narrative supported by the ADR's own text, while acknowledging that absolute certainty is elusive without deeper analysis of potential implementation oversights versus inherent substrate limitations.

**Evidence:**
- "Tekton code utilizes libraries that are not simple to refactor and make "kcp aware."" — ADR 0001 Context
- "`TaskRun` objects cannot be synced to KCP." — ADR 0001 Consequences
- "Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team." — ADR 0001 Consequences
- "We are limited to one workload cluster - the gateway cannot load balance traffic across clusters." — ADR 0001 Consequences
- "Tekton Results can only be accessed on workload clusters. It would require additional changes/patches to make it accessible from kcp." — ADR 0001 Consequences

### Risk Pessimist (claude)

Pass 1 narrated architectural failure under the assumption of collapse. Revised reading: the decision succeeded *tactically* but was *strategically fragile*. It worked for Phase 1 (APIBinding/APIExport safely offering Tekton to App Studio/HACBS on a single workload cluster). The failure wasn't that Phase 1 broke in production; it was that Phase 1 → Phase 2 transition required full substrate replacement (ADR-0009's Operator model), revealing the APIBinding path was a *scoped sandbox*, not an *extensible foundation*. Each Phase 1 choice (single workload cluster, TaskRun exclusion, GLBC ingress dependency, workload-cluster-only Results visibility) was a known trade-off, not a hidden flaw. But *together* they created path dependencies that locked the team into a one-cluster ceiling. The fatal assumption wasn't 'APIBinding fails technically'; it was 'APIBinding's distributed nature scales vertically without architectural replacement.' It doesn't. The decision was locally rational for Phase 1, globally non-extensible for multi-cluster growth.

**Key risks:**
- APIBinding architecture is not vertically scalable — multi-cluster Tekton requires dispatcher/federation patterns that APIBinding cannot express. Phase 1 success masked this until growth forced Phase 2.
- Scoped Phase 1 created path dependencies that became technical debt — App Studio/HACBS workloads built against PipelineRun-only API (no TaskRun), workload-cluster-only Results. Phase 2 migration required rewriting both service *and* consumer contracts.
- kcp maturity asymmetry — the decision treated APIExport/sync as battle-tested distribution mechanisms, but GLBC remained experimental and single-cluster ingress stayed ad-hoc. Betting on experimental tech for a 'customer 0' service was optimistic.
- Phase 1 framing as 'foundation' when it was 'sandbox' — team assumed incremental Operator overlay would compose onto APIBinding. Discovery that Operator meant full substrate replacement suggests mis-estimation of architectural evolvability.

**Fragile insights:**
- Assumption 'kcp APIBinding/APIExport is the right substrate' was tested only under Phase 1 constraints (single cluster, small consumer base, predictable load). Failure mode: assumption holds for Phase 1, breaks at Phase 2 scale. Decision was locally correct, globally incomplete.
- The decision presents Consequences as trade-offs ('TaskRun sync impossible,' 'Results workload-cluster-only') as *accepted limits*, not *discovered flaws*. This framing obscures whether the team understood these limits were *non-negotiable* or *Phase 1 only*. Replacement by Operator suggests they were non-negotiable.

**Assumptions cited:** `asm-7JioVbM6 (kcp's APIBinding/APIExport model is the right substrate for Tekton-as-a-service across multiple workload clusters at growth scale)`

**Metacognitive reflection:**
- Could be wrong if: App Studio/HACBS operated Phase 1 successfully for 12+ months without operational incidents, and team feedback was 'Phase 1 works as scoped.' Replacement by Operator was planned roadmap evolution (Phase 1→2 always assumed substrate change), not emergency remediation. If Phase 1 delivered its intended value on schedule, the 'failure' narrative is wrong — it's a successful *interim* design that was intentionally superseded. The corpus gives no evidence of crash or customer pain.
- Most vulnerable assumption: `My own claim (Pass 1): 'team lacks DevOps footprint to operationalize multiple workload clusters.' I generated this from thin air. The corpus never says ops capacity failed; it says *architecture requires* direct cluster management. I conflated architectural constraint with organizational incapacity. Second vulnerability: assuming 'APIBinding's webhook propagation fails under Tekton's finalizers.' I have no evidence of sync failure. The single-workload-cluster design may have *sidestepped* the problem by keeping webhooks on the workload cluster only.`
- Confidence rationale: Pass 1 was ~0.8 confidence on a narrative of technical incompatibility + organizational bottleneck. On Pass 2 reflection: most claims were speculative reinterpretations of *intentional scope limits* as *hidden failures*. The team accepted single-cluster, TaskRun exclusion, and GLBC dependency as Phase 1 trade-offs (Consequences section reads as lucid, not surprised). The one robust claim: Phase 1→2 transition required full substrate swap, not incremental overlay. This suggests non-extensibility, a real risk. But that's a *planning failure* (underestimating growth inflection point), not a *Phase 1 architectural failure* (building Phase 1 wrong). Hence 0.48: I have a plausible failure narrative, but lack direct evidence the narrative is correct. Replacement by ADR-0009 proves the substrate changed, not that Phase 1 was broken.

**Evidence:**
- "ADR-0001 was replaced by ADR-0009 (Pipeline Service via Operator), indicating substrate re-architecture, not incremental upgrade" — konflux-adr-0001 corpus: 'Status: Replaced, Superseded by 0009'
- "Single workload cluster acknowledged as permanent constraint ('We are limited to one workload cluster — the gateway cannot load balance traffic across clusters')" — konflux-adr-0001 corpus, Consequences section
- "TaskRun exclusion presented as design boundary, not implementation gap ('TaskRun objects cannot be synced to KCP. App Studio and HACBS components may only interact with PipelineRun objects directly')" — konflux-adr-0001 corpus, Consequences section
- "GLBC ingress dependency noted as 'add-on capability,' implying non-stable abstraction" — konflux-adr-0001 corpus, Consequences section

### Growth Optimist (claude)

My Pass 1 critique had the right shape but was overconfident and missing crucial grounding. The decision to bet on kcp's APIBinding/APIExport model as the substrate for multi-cluster Tekton was defensible at decision time — it showed foresight about future scale and avoided forking Tekton. But I was too enamored with the elegance and too quick to dismiss it as 'operationally naive' without examining *which specific failure mode* killed it. Twelve months in, the likely culprits are: (a) kcp's actual maturity curve didn't match the team's needs or timeline, (b) the team's growth trajectory didn't require multi-cluster Tekton, so the abstraction felt premature, or (c) the operational burden of maintaining a separate Pipeline Service adapter layer exceeded the benefit of the clean separation. What I underweighted in Pass 1 is that assumption asm-7JioVbM6 isn't a single bet — it's conditional on multiple external factors (kcp's evolution, organizational growth, upstream Tekton changes) that the ADR authors couldn't fully control. The decision was sound *relative to 2022 information*, but the preconditions shifted. As a Growth Optimist, I should defend: if kcp had matured as hoped, and if the team had scaled to multi-cluster pipelines, this architecture would have aged beautifully. The failure is validation, not design.

**Key risks:**
- kcp's maturity at decision time was unproven; the bet was on a trajectory that may not have materialized
- Growth assumptions: multi-cluster Tekton execution urgency may have been overestimated; if the team stayed single-cluster, the substrate abstraction was premature
- Operational surface area: maintaining a separate Pipeline Service introduces deployment, debugging, and expertise costs that may have exceeded the benefit of clean separation
- Tekton evolution: upstream may have added features (multi-cluster federation, kcp-aware patterns) that made the wrapper layer redundant
- Organizational context: kcp's position in Red Hat's strategy and HACBS' own growth trajectory could have shifted during the 12 months, invalidating the preconditions

**Fragile insights:**
- Architectural elegance (APIBinding/APIExport abstraction) justifies operational complexity and the cost of a separate service — this proved too optimistic
- The team would have sufficient kcp expertise and organizational commitment to debug state-sync and adoption issues — likely underestimated
- kcp would evolve at a pace matching the Pipeline Service team's needs — may have stalled
- Multi-cluster Tekton execution was on the critical path; growth trajectory validated this — possibly aspirational, not actual

**Assumptions cited:** `asm-7JioVbM6 (declared, load-bearing)`, `Implicit: kcp's maturity would reach production-grade by 12 months`, `Implicit: the team would grow to require multi-cluster Tekton at meaningful scale`, `Implicit: the operational overhead of a separate Pipeline Service would be acceptable`, `Implicit: Tekton's upstream wouldn't add competing multi-cluster patterns`

**Metacognitive reflection:**
- Could be wrong if: ADR-0009 solves a different problem entirely (e.g., organizational structure, deployment model) rather than addressing kcp immaturity. Or if kcp actually matured as expected and the failure was cultural/organizational (Pipeline Service team lacked kcp expertise, not kcp itself). Or if the real blocker was one of the stated Consequences (Results access, Ingress limitations) rather than the substrate model.
- Most vulnerable assumption: `asm-7JioVbM6, but specifically the sub-clauses: (1) that kcp would reach sufficient maturity within a 12-month window, (2) that 'the scale this team plans to grow into' was both real and multi-cluster-critical, (3) that the operational cost of the separate service was acceptable. The assumption trades multiple contingent bets into one; if any fails, the whole foundation cracks.`
- Confidence rationale: 0.54 reflects high uncertainty. I have the right *diagnosis shape* (bets on external projects are vulnerable; growth assumptions are fragile), but I lack crucial grounding: What does ADR-0009 actually say? When did the decision start failing in practice? Did the team ever reach the scale where multi-cluster Tekton mattered? Was kcp the bottleneck, or was it something else (Tekton Results, Ingress, or organizational friction with a separate service)? I'm reasoning backwards from 'it was superseded' with limited data, so confidence must be low.

**Evidence:**
- "ADR-0001 was superseded by ADR-0009 (suggests the original approach was insufficient)" — vault://tech/konflux/adr/0001
- "ADR explicitly flags Ingress load-balancing limitation (one cluster only) and Results visibility gaps" — vault://tech/konflux/adr/0001 Consequences section
- "TaskRun sync limitation constrains API surface; clients can only use PipelineRun, not finer-grained control" — vault://tech/konflux/adr/0001 Consequences section

### Risk Pessimist (codex)

Twelve months later, I would blame failure first on asm-7JioVbM6. APIBinding/APIExport was assumed to be the right substrate for Tekton-as-a-service across a growing set of workload clusters, but the ADR itself describes an architecture where the important execution truth never becomes global. `TaskRun` cannot sync to kcp, Tekton Results stay on workload clusters, and PaC-created `PipelineRun`s are invisible in kcp. That is not a stable substrate; it is a partial facade that trains users to expect abstraction and then forces them back into cluster-local reality during incidents.

The second break is scale economics. The service team had to manage workload clusters directly, could not lean on CPS, and had to mix operator-managed deployment with direct manifests. That means every new cluster adds drift risk, upgrade choreography, and more recovery paths to test. A substrate that is supposed to improve with more consumers instead accumulates bespoke operational debt per cluster.

The multi-cluster story is especially weak. The ADR accepts separate ingress plumbing for PaC through kcp GLBC, acknowledges that PaC gatewaying is limited to one workload cluster, and leaves observability fragmented. I would expect onboarding beyond asm-7JioVbM6's implied growth case to stall because the platform promise and the user experience diverge: consumers bind once in kcp, but the moment something subtle fails they need service-team intervention and cluster-specific knowledge.

My attack on asm-7JioVbM6 is direct: if APIBinding/APIExport were the right growth substrate, the declared consequences would trend toward uniformity, portability, and lower marginal toil. Instead they advertise exceptions, locality leaks, and ownership concentration. The likely failure mode is not dramatic technical collapse; it is slower and worse: rising ops burden, weak debuggability, constrained multi-cluster expansion, and eventual replacement by a model that puts control nearer to where Tekton actually runs.

**Key risks:**
- The kcp-facing API hides cluster-local behavior poorly, creating a support-heavy platform that fails exactly when users need end-to-end visibility.
- Direct per-cluster ownership plus mixed operator/manifests deployment causes upgrade drift, incident amplification, and weak multi-cluster economics.

**Fragile insights:**
- The case assumes consumers needed global visibility into `TaskRun`, Results, and PaC-created `PipelineRun`s rather than only `PipelineRun` submission and coarse status.
- The claim that one-workload-cluster PaC gatewaying blocks growth assumes PaC was central to adoption rather than a temporary edge path.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if 12 months of operating data showed that multiple workload clusters were added with low incident growth, most consumers succeeded with `PipelineRun`-level workflows without needing `TaskRun` or Results visibility in kcp, and support volume did not concentrate on cluster-local debugging or PaC routing.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Confidence is moderate because the ADR itself lists the abstraction leaks and scale constraints that drive this failure story, but I am still extrapolating from design consequences rather than from outcome data.

**Evidence:**
- "The ADR states that `TaskRun` objects cannot be synced to KCP and App Studio and HACBS components may only interact with `PipelineRun` objects directly." — konflux-adr-0001, Consequences
- "The ADR states that workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team and cannot rely on CPS." — konflux-adr-0001, Consequences
- "The ADR uses the OpenShift Pipelines Operator where possible and direct manifests otherwise." — konflux-adr-0001, Decision
- "The ADR states that PaC needs separate ingress and service configuration on KCP, that PaC-created `PipelineRun` objects are not visible on kcp, and that the gateway is limited to one workload cluster." — konflux-adr-0001, Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters without additional changes or patches." — konflux-adr-0001, Consequences

### Growth Optimist (gemini)

The initial vision of konflux-adr-0001, to offer Tekton pipelines as a managed service via kcp's robust APIBinding/APIExport model, was truly forward-thinking. It's a shame it was superseded, but I maintain that the core concept of leveraging kcp's substrate for scalable, multi-cluster services is fundamentally sound. The challenges encountered, such as TaskRun sync limitations and the direct management of workload clusters, are not indictments of the kcp model itself, but rather highlight the complexities of integrating a sophisticated, distributed system like Tekton. We should have leaned further into creative solutions: perhaps developing more advanced kcp syncers or specialized middleware to elegantly bridge Tekton's distributed state with kcp's abstraction. The operational burden for the Pipeline Service team, while significant, points to an engineering opportunity rather than an insurmountable flaw. The promise of a unified, declarative Tekton-as-a-service remains an attractive goal, and the principles of this ADR deserve a second look for future integrations.

**Key risks:**
- The inherent difficulty in mapping Tekton's distributed execution state (e.g., TaskRun lifecycle and results) onto kcp's event-driven, API-centric reconciliation model without significant custom engineering.
- The substantial operational overhead and specialized expertise required by the Pipeline Service team to manage Tekton controllers directly on workload clusters, deviating from the expected "compute as a service" paradigm.
- Underestimating the effort and potential upstream friction involved in making Tekton's core libraries "kcp aware" or maintaining forks.

**Fragile insights:**
- The optimistic assumption that kcp's APIBinding/APIExport model could serve as a universally applicable substrate for any distributed workload, without fully accounting for the unique state-management and operational demands of systems like Tekton.
- The belief that innovative middleware or sync mechanisms could effortlessly abstract away the inherent distributed complexities of Tekton, downplaying the potential for significant engineering debt or performance bottlenecks.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Further investigation reveals that the fundamental distributed architecture of Tekton, particularly its state management and inter-cluster communication for task execution and results, is intrinsically incompatible with kcp's declarative, API-centric model. If the 'Consequences' like inability to sync TaskRuns and limited ingress capabilities are not merely implementation details but fundamental limitations of the kcp substrate for this specific use case, my stance would be incorrect.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The initial assessment was highly optimistic, but the detailed 'Consequences' section of the ADR points to significant practical hurdles and a shift in operational responsibility that were likely critical factors in its replacement. This suggests the initial optimism may have underestimated the real-world engineering and architectural friction of fitting Tekton's distributed nature into the kcp model.

**Evidence:**
- "Tekton code utilizes libraries that are not simple to refactor and make 'kcp aware.'" — ADR text: Context section
- "`TaskRun` objects cannot be synced to KCP." — ADR text: Consequences section
- "Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team." — ADR text: Consequences section
- "We are limited to one workload cluster - the gateway cannot load balance traffic across clusters." — ADR text: Consequences section

### Growth Optimist (codex)

Twelve months later, I still think the failure centered on asm-7JioVbM6. The upside thesis was attractive: use kcp's APIBinding/APIExport model to expose Tekton once, then let many services attach across workload clusters without each team rebuilding the stack. But that only compounds if the substrate feels like a complete service boundary. Here it likely did not. The control API lived in kcp while too much operational truth stayed on workload clusters, so the thing meant to simplify growth probably multiplied places users had to look.

Attacking asm-7JioVbM6 directly: being able to project Tekton APIs through kcp was not the same as having the right substrate for Tekton-as-a-service at the team's intended scale. The ADR already documents the fracture lines: TaskRuns could not sync to kcp, Tekton Results stayed cluster-local, PaC-triggered PipelineRuns were not visible on kcp, and PaC ingress was limited to one workload cluster. That turns a multi-cluster platform story into a partial abstraction. Customer 0 might tolerate that; later adopters usually do not reward partial abstractions.

I still see a positive alternate path. A narrower operator-led service with strong end-to-end visibility could have proven demand first and layered kcp federation later. In the failure timeline, the team likely reached for elegant platform generality before the product loop was stable. Once asm-7JioVbM6 bent, the rest of the design choices stopped looking like pragmatic bridge steps and started looking like evidence that Phase 1 had chosen the wrong center of gravity.

**Key risks:**
- The kcp APIBinding/APIExport layer created a product surface that was too incomplete for teams beyond customer 0, depressing adoption and increasing support load.
- Direct workload-cluster ownership, cluster-local results, and PaC special-casing erased the expected leverage of a shared multi-cluster service.

**Fragile insights:**
- My claim that the split control-plane/data-plane experience doomed the service is fragile if most consumers only needed PipelineRun submission and were comfortable doing debugging on workload clusters.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if 6-12 months of outcome data showed multiple non-App Studio teams adopted the service through APIBinding with low support burden, acceptable incident rates, and most day-to-day pipeline operations stayed coherent despite the listed kcp/workload-cluster split.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The ADR itself documents enough architectural seams to make this failure story plausible, especially around visibility and multi-cluster behavior. Confidence stays moderate, not high, because I am inferring outcomes from design consequences rather than from actual adoption, reliability, or operator-effort data.

**Evidence:**
- "The ADR positions kcp APIBinding/APIExport as the user-facing way other services would execute PipelineRuns and access Tekton APIs." — citation: konflux-adr-0001 §Decision, §Consequences
- "The ADR states that TaskRun objects cannot be synced to kcp, so App Studio and HACBS components may only interact with PipelineRun objects directly." — citation: konflux-adr-0001 §Consequences
- "The ADR says workload clusters for Pipeline Service must be directly managed by the Pipeline Service team rather than relying on general compute from CPS." — citation: konflux-adr-0001 §Consequences
- "The ADR records that PaC needs separate ingress, PaC-created PipelineRuns are not visible on kcp, and the gateway is limited to one workload cluster." — citation: konflux-adr-0001 §Consequences
- "The ADR records that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 §Consequences

## Evidence (union, deduped)

- "Tekton code utilizes libraries that are not simple to refactor and make "kcp aware."" — ADR 0001 Context
- "`TaskRun` objects cannot be synced to KCP." — ADR 0001 Consequences
- "Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team." — ADR 0001 Consequences
- "We are limited to one workload cluster - the gateway cannot load balance traffic across clusters." — ADR 0001 Consequences
- "Tekton Results can only be accessed on workload clusters. It would require additional changes/patches to make it accessible from kcp." — ADR 0001 Consequences
- "ADR-0001 was replaced by ADR-0009 (Pipeline Service via Operator), indicating substrate re-architecture, not incremental upgrade" — konflux-adr-0001 corpus: 'Status: Replaced, Superseded by 0009'
- "Single workload cluster acknowledged as permanent constraint ('We are limited to one workload cluster — the gateway cannot load balance traffic across clusters')" — konflux-adr-0001 corpus, Consequences section
- "TaskRun exclusion presented as design boundary, not implementation gap ('TaskRun objects cannot be synced to KCP. App Studio and HACBS components may only interact with PipelineRun objects directly')" — konflux-adr-0001 corpus, Consequences section
- "GLBC ingress dependency noted as 'add-on capability,' implying non-stable abstraction" — konflux-adr-0001 corpus, Consequences section
- "ADR-0001 was superseded by ADR-0009 (suggests the original approach was insufficient)" — vault://tech/konflux/adr/0001
- "ADR explicitly flags Ingress load-balancing limitation (one cluster only) and Results visibility gaps" — vault://tech/konflux/adr/0001 Consequences section
- "TaskRun sync limitation constrains API surface; clients can only use PipelineRun, not finer-grained control" — vault://tech/konflux/adr/0001 Consequences section
- "The ADR states that `TaskRun` objects cannot be synced to KCP and App Studio and HACBS components may only interact with `PipelineRun` objects directly." — konflux-adr-0001, Consequences
- "The ADR states that workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team and cannot rely on CPS." — konflux-adr-0001, Consequences
- "The ADR uses the OpenShift Pipelines Operator where possible and direct manifests otherwise." — konflux-adr-0001, Decision
- "The ADR states that PaC needs separate ingress and service configuration on KCP, that PaC-created `PipelineRun` objects are not visible on kcp, and that the gateway is limited to one workload cluster." — konflux-adr-0001, Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters without additional changes or patches." — konflux-adr-0001, Consequences
- "Tekton code utilizes libraries that are not simple to refactor and make 'kcp aware.'" — ADR text: Context section
- "`TaskRun` objects cannot be synced to KCP." — ADR text: Consequences section
- "Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team." — ADR text: Consequences section
- "We are limited to one workload cluster - the gateway cannot load balance traffic across clusters." — ADR text: Consequences section
- "The ADR positions kcp APIBinding/APIExport as the user-facing way other services would execute PipelineRuns and access Tekton APIs." — citation: konflux-adr-0001 §Decision, §Consequences
- "The ADR states that TaskRun objects cannot be synced to kcp, so App Studio and HACBS components may only interact with PipelineRun objects directly." — citation: konflux-adr-0001 §Consequences
- "The ADR says workload clusters for Pipeline Service must be directly managed by the Pipeline Service team rather than relying on general compute from CPS." — citation: konflux-adr-0001 §Consequences
- "The ADR records that PaC needs separate ingress, PaC-created PipelineRuns are not visible on kcp, and the gateway is limited to one workload cluster." — citation: konflux-adr-0001 §Consequences
- "The ADR records that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 §Consequences

## Agreement

- "Twelve months later, I would blame failure first on asm-7JioVbM6." _(Risk Pessimist, Growth Optimist)_
- "The multi-cluster story is especially weak." _(Risk Pessimist, Growth Optimist)_
- "Twelve months later, I still think the failure centered on asm-7JioVbM6." _(Growth Optimist, Risk Pessimist)_
- "That turns a multi-cluster platform story into a partial abstraction." _(Growth Optimist, Risk Pessimist)_

## Disagreement

### Risk Pessimist

- "This architectural gamble on kcp's APIBinding/APIExport model for a scalable Tekton-as-a-service was a predictable disaster, a testament to optimism over realism."
- "The promise of abstracting Tekton's inherent complexity through kcp's substrate crumbled under the weight of its own limitations."
- "We were shackled from the outset by the inability to sync crucial `TaskRun` objects and access vital components like Tekton Results, effectively hobbling any genuine multi-cluster scalability or unified API access."
- "The reliance on a single workload cluster for ingress proved a dead end, entirely negating the supposed benefits of a distributed Tekton offering and forcing operational overhead onto the Pipeline Service team."
- "This wasn't a robust substrate; it was a bottleneck, forcing a costly and inevitable pivot to a more integrated operator model because the initial vision was fundamentally incompatible with the reality of managing complex, stateful distributed systems at scale."
- "The assumption that kcp's `APIBinding/APIExport` model was the right substrate for offering Tekton-as-a-service across multiple workload clusters was a critical misjudgment."
- "The consequences clearly show that this abstraction layer was insufficient for the granular control and unified access required by Tekton, leading to significant workarounds and limitations that undermined the entire premise."
- "The failure to integrate key components and scale ingress across clusters demonstrates a critical misunderstanding of how to apply kcp's model to such a demanding service."
- "Pass 1 narrated architectural failure under the assumption of collapse."
- "Revised reading: the decision succeeded *tactically* but was *strategically fragile*."
- "It worked for Phase 1 (APIBinding/APIExport safely offering Tekton to App Studio/HACBS on a single workload cluster)."
- "The failure wasn't that Phase 1 broke in production; it was that Phase 1 → Phase 2 transition required full substrate replacement (ADR-0009's Operator model), revealing the APIBinding path was a *scoped sandbox*, not an *extensible foundation*."
- "Each Phase 1 choice (single workload cluster, TaskRun exclusion, GLBC ingress dependency, workload-cluster-only Results visibility) was a known trade-off, not a hidden flaw."
- "But *together* they created path dependencies that locked the team into a one-cluster ceiling."
- "The fatal assumption wasn't 'APIBinding fails technically'; it was 'APIBinding's distributed nature scales vertically without architectural replacement.' It doesn't."
- "The decision was locally rational for Phase 1, globally non-extensible for multi-cluster growth."
- "APIBinding/APIExport was assumed to be the right substrate for Tekton-as-a-service across a growing set of workload clusters, but the ADR itself describes an architecture where the important execution truth never becomes global. `TaskRun` cannot sync to kcp, Tekton Results stay on workload clusters, and PaC-created `PipelineRun`s are invisible in kcp."
- "That is not a stable substrate; it is a partial facade that trains users to expect abstraction and then forces them back into cluster-local reality during incidents."
- "The second break is scale economics."
- "The service team had to manage workload clusters directly, could not lean on CPS, and had to mix operator-managed deployment with direct manifests."
- "That means every new cluster adds drift risk, upgrade choreography, and more recovery paths to test."
- "A substrate that is supposed to improve with more consumers instead accumulates bespoke operational debt per cluster."
- "The ADR accepts separate ingress plumbing for PaC through kcp GLBC, acknowledges that PaC gatewaying is limited to one workload cluster, and leaves observability fragmented."
- "I would expect onboarding beyond asm-7JioVbM6's implied growth case to stall because the platform promise and the user experience diverge: consumers bind once in kcp, but the moment something subtle fails they need service-team intervention and cluster-specific knowledge."
- "My attack on asm-7JioVbM6 is direct: if APIBinding/APIExport were the right growth substrate, the declared consequences would trend toward uniformity, portability, and lower marginal toil."
- "Instead they advertise exceptions, locality leaks, and ownership concentration."
- "The likely failure mode is not dramatic technical collapse; it is slower and worse: rising ops burden, weak debuggability, constrained multi-cluster expansion, and eventual replacement by a model that puts control nearer to where Tekton actually runs."

### Risk Pessimist

- "This architectural gamble on kcp's APIBinding/APIExport model for a scalable Tekton-as-a-service was a predictable disaster, a testament to optimism over realism."
- "The promise of abstracting Tekton's inherent complexity through kcp's substrate crumbled under the weight of its own limitations."
- "We were shackled from the outset by the inability to sync crucial `TaskRun` objects and access vital components like Tekton Results, effectively hobbling any genuine multi-cluster scalability or unified API access."
- "The reliance on a single workload cluster for ingress proved a dead end, entirely negating the supposed benefits of a distributed Tekton offering and forcing operational overhead onto the Pipeline Service team."
- "This wasn't a robust substrate; it was a bottleneck, forcing a costly and inevitable pivot to a more integrated operator model because the initial vision was fundamentally incompatible with the reality of managing complex, stateful distributed systems at scale."
- "The assumption that kcp's `APIBinding/APIExport` model was the right substrate for offering Tekton-as-a-service across multiple workload clusters was a critical misjudgment."
- "The consequences clearly show that this abstraction layer was insufficient for the granular control and unified access required by Tekton, leading to significant workarounds and limitations that undermined the entire premise."
- "The failure to integrate key components and scale ingress across clusters demonstrates a critical misunderstanding of how to apply kcp's model to such a demanding service."
- "Pass 1 narrated architectural failure under the assumption of collapse."
- "Revised reading: the decision succeeded *tactically* but was *strategically fragile*."
- "It worked for Phase 1 (APIBinding/APIExport safely offering Tekton to App Studio/HACBS on a single workload cluster)."
- "The failure wasn't that Phase 1 broke in production; it was that Phase 1 → Phase 2 transition required full substrate replacement (ADR-0009's Operator model), revealing the APIBinding path was a *scoped sandbox*, not an *extensible foundation*."
- "Each Phase 1 choice (single workload cluster, TaskRun exclusion, GLBC ingress dependency, workload-cluster-only Results visibility) was a known trade-off, not a hidden flaw."
- "But *together* they created path dependencies that locked the team into a one-cluster ceiling."
- "The fatal assumption wasn't 'APIBinding fails technically'; it was 'APIBinding's distributed nature scales vertically without architectural replacement.' It doesn't."
- "The decision was locally rational for Phase 1, globally non-extensible for multi-cluster growth."
- "APIBinding/APIExport was assumed to be the right substrate for Tekton-as-a-service across a growing set of workload clusters, but the ADR itself describes an architecture where the important execution truth never becomes global. `TaskRun` cannot sync to kcp, Tekton Results stay on workload clusters, and PaC-created `PipelineRun`s are invisible in kcp."
- "That is not a stable substrate; it is a partial facade that trains users to expect abstraction and then forces them back into cluster-local reality during incidents."
- "The second break is scale economics."
- "The service team had to manage workload clusters directly, could not lean on CPS, and had to mix operator-managed deployment with direct manifests."
- "That means every new cluster adds drift risk, upgrade choreography, and more recovery paths to test."
- "A substrate that is supposed to improve with more consumers instead accumulates bespoke operational debt per cluster."
- "The ADR accepts separate ingress plumbing for PaC through kcp GLBC, acknowledges that PaC gatewaying is limited to one workload cluster, and leaves observability fragmented."
- "I would expect onboarding beyond asm-7JioVbM6's implied growth case to stall because the platform promise and the user experience diverge: consumers bind once in kcp, but the moment something subtle fails they need service-team intervention and cluster-specific knowledge."
- "My attack on asm-7JioVbM6 is direct: if APIBinding/APIExport were the right growth substrate, the declared consequences would trend toward uniformity, portability, and lower marginal toil."
- "Instead they advertise exceptions, locality leaks, and ownership concentration."
- "The likely failure mode is not dramatic technical collapse; it is slower and worse: rising ops burden, weak debuggability, constrained multi-cluster expansion, and eventual replacement by a model that puts control nearer to where Tekton actually runs."

### Growth Optimist

- "My Pass 1 critique had the right shape but was overconfident and missing crucial grounding."
- "The decision to bet on kcp's APIBinding/APIExport model as the substrate for multi-cluster Tekton was defensible at decision time — it showed foresight about future scale and avoided forking Tekton."
- "But I was too enamored with the elegance and too quick to dismiss it as 'operationally naive' without examining *which specific failure mode* killed it."
- "Twelve months in, the likely culprits are: (a) kcp's actual maturity curve didn't match the team's needs or timeline, (b) the team's growth trajectory didn't require multi-cluster Tekton, so the abstraction felt premature, or (c) the operational burden of maintaining a separate Pipeline Service adapter layer exceeded the benefit of the clean separation."
- "What I underweighted in Pass 1 is that assumption asm-7JioVbM6 isn't a single bet — it's conditional on multiple external factors (kcp's evolution, organizational growth, upstream Tekton changes) that the ADR authors couldn't fully control."
- "The decision was sound *relative to 2022 information*, but the preconditions shifted."
- "As a Growth Optimist, I should defend: if kcp had matured as hoped, and if the team had scaled to multi-cluster pipelines, this architecture would have aged beautifully."
- "The failure is validation, not design."
- "The initial vision of konflux-adr-0001, to offer Tekton pipelines as a managed service via kcp's robust APIBinding/APIExport model, was truly forward-thinking."
- "It's a shame it was superseded, but I maintain that the core concept of leveraging kcp's substrate for scalable, multi-cluster services is fundamentally sound."
- "The challenges encountered, such as TaskRun sync limitations and the direct management of workload clusters, are not indictments of the kcp model itself, but rather highlight the complexities of integrating a sophisticated, distributed system like Tekton."
- "We should have leaned further into creative solutions: perhaps developing more advanced kcp syncers or specialized middleware to elegantly bridge Tekton's distributed state with kcp's abstraction."
- "The operational burden for the Pipeline Service team, while significant, points to an engineering opportunity rather than an insurmountable flaw."
- "The promise of a unified, declarative Tekton-as-a-service remains an attractive goal, and the principles of this ADR deserve a second look for future integrations."
- "The upside thesis was attractive: use kcp's APIBinding/APIExport model to expose Tekton once, then let many services attach across workload clusters without each team rebuilding the stack."
- "But that only compounds if the substrate feels like a complete service boundary."
- "Here it likely did not."
- "The control API lived in kcp while too much operational truth stayed on workload clusters, so the thing meant to simplify growth probably multiplied places users had to look."
- "Attacking asm-7JioVbM6 directly: being able to project Tekton APIs through kcp was not the same as having the right substrate for Tekton-as-a-service at the team's intended scale."
- "The ADR already documents the fracture lines: TaskRuns could not sync to kcp, Tekton Results stayed cluster-local, PaC-triggered PipelineRuns were not visible on kcp, and PaC ingress was limited to one workload cluster."
- "Customer 0 might tolerate that; later adopters usually do not reward partial abstractions."
- "I still see a positive alternate path."
- "A narrower operator-led service with strong end-to-end visibility could have proven demand first and layered kcp federation later."
- "In the failure timeline, the team likely reached for elegant platform generality before the product loop was stable."
- "Once asm-7JioVbM6 bent, the rest of the design choices stopped looking like pragmatic bridge steps and started looking like evidence that Phase 1 had chosen the wrong center of gravity."

### Risk Pessimist

- "This architectural gamble on kcp's APIBinding/APIExport model for a scalable Tekton-as-a-service was a predictable disaster, a testament to optimism over realism."
- "The promise of abstracting Tekton's inherent complexity through kcp's substrate crumbled under the weight of its own limitations."
- "We were shackled from the outset by the inability to sync crucial `TaskRun` objects and access vital components like Tekton Results, effectively hobbling any genuine multi-cluster scalability or unified API access."
- "The reliance on a single workload cluster for ingress proved a dead end, entirely negating the supposed benefits of a distributed Tekton offering and forcing operational overhead onto the Pipeline Service team."
- "This wasn't a robust substrate; it was a bottleneck, forcing a costly and inevitable pivot to a more integrated operator model because the initial vision was fundamentally incompatible with the reality of managing complex, stateful distributed systems at scale."
- "The assumption that kcp's `APIBinding/APIExport` model was the right substrate for offering Tekton-as-a-service across multiple workload clusters was a critical misjudgment."
- "The consequences clearly show that this abstraction layer was insufficient for the granular control and unified access required by Tekton, leading to significant workarounds and limitations that undermined the entire premise."
- "The failure to integrate key components and scale ingress across clusters demonstrates a critical misunderstanding of how to apply kcp's model to such a demanding service."
- "Pass 1 narrated architectural failure under the assumption of collapse."
- "Revised reading: the decision succeeded *tactically* but was *strategically fragile*."
- "It worked for Phase 1 (APIBinding/APIExport safely offering Tekton to App Studio/HACBS on a single workload cluster)."
- "The failure wasn't that Phase 1 broke in production; it was that Phase 1 → Phase 2 transition required full substrate replacement (ADR-0009's Operator model), revealing the APIBinding path was a *scoped sandbox*, not an *extensible foundation*."
- "Each Phase 1 choice (single workload cluster, TaskRun exclusion, GLBC ingress dependency, workload-cluster-only Results visibility) was a known trade-off, not a hidden flaw."
- "But *together* they created path dependencies that locked the team into a one-cluster ceiling."
- "The fatal assumption wasn't 'APIBinding fails technically'; it was 'APIBinding's distributed nature scales vertically without architectural replacement.' It doesn't."
- "The decision was locally rational for Phase 1, globally non-extensible for multi-cluster growth."
- "APIBinding/APIExport was assumed to be the right substrate for Tekton-as-a-service across a growing set of workload clusters, but the ADR itself describes an architecture where the important execution truth never becomes global. `TaskRun` cannot sync to kcp, Tekton Results stay on workload clusters, and PaC-created `PipelineRun`s are invisible in kcp."
- "That is not a stable substrate; it is a partial facade that trains users to expect abstraction and then forces them back into cluster-local reality during incidents."
- "The second break is scale economics."
- "The service team had to manage workload clusters directly, could not lean on CPS, and had to mix operator-managed deployment with direct manifests."
- "That means every new cluster adds drift risk, upgrade choreography, and more recovery paths to test."
- "A substrate that is supposed to improve with more consumers instead accumulates bespoke operational debt per cluster."
- "The ADR accepts separate ingress plumbing for PaC through kcp GLBC, acknowledges that PaC gatewaying is limited to one workload cluster, and leaves observability fragmented."
- "I would expect onboarding beyond asm-7JioVbM6's implied growth case to stall because the platform promise and the user experience diverge: consumers bind once in kcp, but the moment something subtle fails they need service-team intervention and cluster-specific knowledge."
- "My attack on asm-7JioVbM6 is direct: if APIBinding/APIExport were the right growth substrate, the declared consequences would trend toward uniformity, portability, and lower marginal toil."
- "Instead they advertise exceptions, locality leaks, and ownership concentration."
- "The likely failure mode is not dramatic technical collapse; it is slower and worse: rising ops burden, weak debuggability, constrained multi-cluster expansion, and eventual replacement by a model that puts control nearer to where Tekton actually runs."

### Growth Optimist

- "My Pass 1 critique had the right shape but was overconfident and missing crucial grounding."
- "The decision to bet on kcp's APIBinding/APIExport model as the substrate for multi-cluster Tekton was defensible at decision time — it showed foresight about future scale and avoided forking Tekton."
- "But I was too enamored with the elegance and too quick to dismiss it as 'operationally naive' without examining *which specific failure mode* killed it."
- "Twelve months in, the likely culprits are: (a) kcp's actual maturity curve didn't match the team's needs or timeline, (b) the team's growth trajectory didn't require multi-cluster Tekton, so the abstraction felt premature, or (c) the operational burden of maintaining a separate Pipeline Service adapter layer exceeded the benefit of the clean separation."
- "What I underweighted in Pass 1 is that assumption asm-7JioVbM6 isn't a single bet — it's conditional on multiple external factors (kcp's evolution, organizational growth, upstream Tekton changes) that the ADR authors couldn't fully control."
- "The decision was sound *relative to 2022 information*, but the preconditions shifted."
- "As a Growth Optimist, I should defend: if kcp had matured as hoped, and if the team had scaled to multi-cluster pipelines, this architecture would have aged beautifully."
- "The failure is validation, not design."
- "The initial vision of konflux-adr-0001, to offer Tekton pipelines as a managed service via kcp's robust APIBinding/APIExport model, was truly forward-thinking."
- "It's a shame it was superseded, but I maintain that the core concept of leveraging kcp's substrate for scalable, multi-cluster services is fundamentally sound."
- "The challenges encountered, such as TaskRun sync limitations and the direct management of workload clusters, are not indictments of the kcp model itself, but rather highlight the complexities of integrating a sophisticated, distributed system like Tekton."
- "We should have leaned further into creative solutions: perhaps developing more advanced kcp syncers or specialized middleware to elegantly bridge Tekton's distributed state with kcp's abstraction."
- "The operational burden for the Pipeline Service team, while significant, points to an engineering opportunity rather than an insurmountable flaw."
- "The promise of a unified, declarative Tekton-as-a-service remains an attractive goal, and the principles of this ADR deserve a second look for future integrations."
- "The upside thesis was attractive: use kcp's APIBinding/APIExport model to expose Tekton once, then let many services attach across workload clusters without each team rebuilding the stack."
- "But that only compounds if the substrate feels like a complete service boundary."
- "Here it likely did not."
- "The control API lived in kcp while too much operational truth stayed on workload clusters, so the thing meant to simplify growth probably multiplied places users had to look."
- "Attacking asm-7JioVbM6 directly: being able to project Tekton APIs through kcp was not the same as having the right substrate for Tekton-as-a-service at the team's intended scale."
- "The ADR already documents the fracture lines: TaskRuns could not sync to kcp, Tekton Results stayed cluster-local, PaC-triggered PipelineRuns were not visible on kcp, and PaC ingress was limited to one workload cluster."
- "Customer 0 might tolerate that; later adopters usually do not reward partial abstractions."
- "I still see a positive alternate path."
- "A narrower operator-led service with strong end-to-end visibility could have proven demand first and layered kcp federation later."
- "In the failure timeline, the team likely reached for elegant platform generality before the product loop was stable."
- "Once asm-7JioVbM6 bent, the rest of the design choices stopped looking like pragmatic bridge steps and started looking like evidence that Phase 1 had chosen the wrong center of gravity."

### Growth Optimist

- "My Pass 1 critique had the right shape but was overconfident and missing crucial grounding."
- "The decision to bet on kcp's APIBinding/APIExport model as the substrate for multi-cluster Tekton was defensible at decision time — it showed foresight about future scale and avoided forking Tekton."
- "But I was too enamored with the elegance and too quick to dismiss it as 'operationally naive' without examining *which specific failure mode* killed it."
- "Twelve months in, the likely culprits are: (a) kcp's actual maturity curve didn't match the team's needs or timeline, (b) the team's growth trajectory didn't require multi-cluster Tekton, so the abstraction felt premature, or (c) the operational burden of maintaining a separate Pipeline Service adapter layer exceeded the benefit of the clean separation."
- "What I underweighted in Pass 1 is that assumption asm-7JioVbM6 isn't a single bet — it's conditional on multiple external factors (kcp's evolution, organizational growth, upstream Tekton changes) that the ADR authors couldn't fully control."
- "The decision was sound *relative to 2022 information*, but the preconditions shifted."
- "As a Growth Optimist, I should defend: if kcp had matured as hoped, and if the team had scaled to multi-cluster pipelines, this architecture would have aged beautifully."
- "The failure is validation, not design."
- "The initial vision of konflux-adr-0001, to offer Tekton pipelines as a managed service via kcp's robust APIBinding/APIExport model, was truly forward-thinking."
- "It's a shame it was superseded, but I maintain that the core concept of leveraging kcp's substrate for scalable, multi-cluster services is fundamentally sound."
- "The challenges encountered, such as TaskRun sync limitations and the direct management of workload clusters, are not indictments of the kcp model itself, but rather highlight the complexities of integrating a sophisticated, distributed system like Tekton."
- "We should have leaned further into creative solutions: perhaps developing more advanced kcp syncers or specialized middleware to elegantly bridge Tekton's distributed state with kcp's abstraction."
- "The operational burden for the Pipeline Service team, while significant, points to an engineering opportunity rather than an insurmountable flaw."
- "The promise of a unified, declarative Tekton-as-a-service remains an attractive goal, and the principles of this ADR deserve a second look for future integrations."
- "The upside thesis was attractive: use kcp's APIBinding/APIExport model to expose Tekton once, then let many services attach across workload clusters without each team rebuilding the stack."
- "But that only compounds if the substrate feels like a complete service boundary."
- "Here it likely did not."
- "The control API lived in kcp while too much operational truth stayed on workload clusters, so the thing meant to simplify growth probably multiplied places users had to look."
- "Attacking asm-7JioVbM6 directly: being able to project Tekton APIs through kcp was not the same as having the right substrate for Tekton-as-a-service at the team's intended scale."
- "The ADR already documents the fracture lines: TaskRuns could not sync to kcp, Tekton Results stayed cluster-local, PaC-triggered PipelineRuns were not visible on kcp, and PaC ingress was limited to one workload cluster."
- "Customer 0 might tolerate that; later adopters usually do not reward partial abstractions."
- "I still see a positive alternate path."
- "A narrower operator-led service with strong end-to-end visibility could have proven demand first and layered kcp federation later."
- "In the failure timeline, the team likely reached for elegant platform generality before the product loop was stable."
- "Once asm-7JioVbM6 bent, the rest of the design choices stopped looking like pragmatic bridge steps and started looking like evidence that Phase 1 had chosen the wrong center of gravity."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-4c223nf9" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-4c223nf9" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
