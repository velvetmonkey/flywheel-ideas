---
type: council_synthesis
session_id: sess-Hb97j7bW
idea_id: idea-4c223nf9
mode: pre_mortem
depth: light
---
# Council session sess-Hb97j7bW

**Idea:** [[konflux-adr-0001 — ADR 1. Pipeline Service Phase 1 (konflux-ci/architecture)]] (`idea-4c223nf9`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T23:28:31.778Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | codex | 0.69 | Twelve months later, this likely failed because asm-7JioVbM6 was weaker than it… |
| Risk Pessimist | claude | 0.55 | APIBinding substrate was fragile — but not for the reasons I stated with such c… |
| Risk Pessimist | gemini | 0.80 | The failure of konflux-adr-0001 is not a surprise; it's a textbook case of arch… |
| Growth Optimist | claude | 0.42 | I was too quick to conflate Phase 1 constraints with fundamental failure. The A… |
| Growth Optimist | gemini | 0.75 | The ambition behind ADR 1, aiming to leverage kcp's APIBinding/APIExport model … |
| Growth Optimist | codex | 0.61 | Twelve months later, I think this failed not because the ambition was wrong, bu… |

## Views

### Risk Pessimist (codex)

Twelve months later, this likely failed because asm-7JioVbM6 was weaker than it looked. The architecture bet that kcp's APIBinding/APIExport model could serve as the substrate for Tekton-as-a-service across multiple workload clusters. But the ADR's own consequences describe a substrate with missing object visibility, fragmented execution state, and asymmetric access paths. If `PipelineRun` submission happens through kcp while execution facts, results, and some creation paths live only on workload clusters, the service boundary is already incoherent. That is a structural failure mode, not a cosmetic gap.

Attack the assumption directly: asm-7JioVbM6 fails if the substrate cannot preserve the minimum semantics operators and customers expect from a shared CI platform. Here, `TaskRun` objects cannot sync to kcp, Tekton Results stay on workload clusters, PaC-created `PipelineRun` objects are not visible on kcp, and ingress is effectively pinned to one workload cluster. Those are not isolated defects. They are evidence that the control-plane abstraction did not faithfully represent the runtime system. A multi-cluster service built on partial visibility and split authority tends to degrade into manual exception handling, support toil, and weak customer trust.

The operational design compounds that error. To avoid forking Tekton or forcing deep upstream kcp-aware changes, the team accepted direct workload-cluster ownership, operator management plus ArgoCD plus raw manifests, and special networking for PaC. That shifts complexity from code into operations and product semantics. In a pessimistic postmortem, the failure is that the platform never became a clean shared service; it became a bundle of compensating mechanisms around an abstraction layer that was never strong enough.

The counter-argument I did not fully credit in Pass 1 is that Phase 1 may have been intended as a deliberately temporary bridge, not a destination architecture, and being replaced by ADR-0009 does not alone prove failure. Even so, under the user's failure-premortem framing, asm-7JioVbM6 remains the most plausible root cause because nearly every listed consequence is a symptom of substrate mismatch rather than an isolated implementation mistake.

**Key risks:**
- The kcp APIBinding/APIExport substrate presents an incomplete and misleading control-plane view, causing split-brain operations between kcp and workload clusters.
- Operational complexity from direct cluster ownership, mixed deployment mechanisms, and PaC-specific routing overwhelms the team before multi-cluster scale or customer trust materializes.

**Fragile insights:**
- Replacement by ADR-0009 is suggestive of architectural failure, but that inference weakens if Phase 1 was explicitly scoped as a temporary bridge with acceptable limitations.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if evidence showed Phase 1 met its intended short-term goals despite these limitations: stable customer adoption, acceptable support load, clear operational ownership, and a documented plan treating the listed consequences as temporary and successfully managed.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Confidence is moderate because the ADR text itself exposes multiple structural weaknesses aligned with failure, but lower than Pass 1 because I do not have direct outcome data and may be over-inferring failure from a replaced transitional design.

**Evidence:**
- "`TaskRun` objects cannot be synced to kcp, limiting the fidelity of the kcp control-plane view." — citation: konflux-adr-0001 §Consequences
- "PaC-created `PipelineRun` objects are not visible on kcp, which breaks a unified service interface." — citation: konflux-adr-0001 §Consequences
- "Ingress is limited to one workload cluster and cannot load balance across clusters, undermining the multi-cluster service premise." — citation: konflux-adr-0001 §Consequences
- "Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 §Consequences
- "The ADR was later superseded by ADR-0009." — citation: konflux-adr-0001 metadata and §Status

### Risk Pessimist (claude)

APIBinding substrate was fragile — but not for the reasons I stated with such certainty in Pass 1. The decision *did* fail (it was replaced), but the root cause was more subtle than 'syncers broke under load.' The team likely hit a combination of: (1) underestimated operational complexity *of bridging two distributed systems*, not the APIBinding model itself being broken; (2) TaskRun visibility gap — framed as a consequence in the ADR, but teams needed it anyway, and retrofitting cost more than expected; (3) single-workload-cluster limit for PaC became a bottleneck sooner than the architecture allowed. But here's my vulnerability: I'm inferring causation ('syncers broke, therefore APIBinding is bad') from an ADR written *before* the decision was made, not from the post-mortem that *actually triggered the replacement*. The team might have replaced this because (a) org priorities shifted, (b) kcp upstream became more operator-friendly, (c) Tekton itself evolved in ways that made operators more pragmatic, or (d) requirements scaled in a way that demanded tighter coupling. The failure mode might be real, but I'm not confident I've identified it correctly.

**Key risks:**
- Operational burden of Tekton under kcp sync model (schema drift, sync lag, conflict resolution)
- TaskRun exclusion forced awkward app-team workarounds; retrofitting cost > initial estimate
- Single-workload-cluster limit (PaC gateway) became bottleneck before architecture could evolve
- Team lacked Tekton+kcp+syncer expertise; debugging across three failure domains exceeded capacity
- Replacement (ADR-0009, operator-based) may have different failure modes (tighter coupling, less modularity)

**Fragile insights:**
- Mutable-state semantics of Tekton might be fundamentally at odds with kcp sync, or just hard to operationalize well
- APIBinding abstraction promised to hide complexity; it didn't — it multiplied debugging surface
- TaskRun exclusion was accepted as a consequence; teams adapting to it was not validated pre-decision

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerges that: (1) ADR-0009 (the replacement) introduced worse failure modes than the original; (2) the team replaced due to org restructuring or upstream ecosystem shifts, not architectural failure; (3) APIBinding has been used successfully for similar workloads by other teams, suggesting the issue was execution, not model; (4) Tekton's sync problems were resolved in later versions, making the second approach unnecessary; (5) the team's actual post-mortem cites operational staffing / observability / tooling gaps rather than fundamental architecture mismatch.
- Most vulnerable assumption: `asm-7JioVbM6 — that 'kcp's APIBinding/APIExport model is the right substrate for Tekton-as-a-service at scale.' This is vulnerable to: (a) scale threshold effects (model works up to X users, breaks at Y) that are not predictable from first principles; (b) assumption that Tekton's mutable semantics are incompatible with sync, when they might just be operationally expensive; (c) assumption that the team's observed operational burden was caused by APIBinding, when it might have been caused by insufficient observability / staffing / process maturity.`
- Confidence rationale: Confidence lowered from ~0.70 (Pass 1) to 0.55 because: (1) I'm working backwards from a replacement decision without the actual post-mortem; (2) I've conflated 'something went wrong' with 'I know why and the architecture is to blame'; (3) I haven't compared the replacement (operator-based) against the original in real-world performance (they might trade off different failure modes); (4) Tekton's evolution and kcp's evolution are external factors I can't model accurately; (5) organizational/team-context changes might explain the replacement better than architecture. The decision *was* replaced, which lowers my confidence in 'APIBinding works fine' to near zero, but I'm not confident I've identified the right root cause.

**Evidence:**
- "ADR was replaced by ADR-0009; evidence of decision failure" — vault://konflux/adr-0001 (status: Replaced, superseded_by: 0009)
- "TaskRun objects cannot be synced to KCP; AppStudio/HACBS may only interact with PipelineRun" — vault://konflux/adr-0001 (Consequences section)
- "One workload cluster limit due to PaC ingress/gateway constraint" — vault://konflux/adr-0001 (Consequences section)

### Risk Pessimist (gemini)

The failure of konflux-adr-0001 is not a surprise; it's a textbook case of architectural hubris, a predictable outcome when a team attempts to force a square peg into a round hole. The central assumption – that kcp's `APIBinding`/`APIExport` model could magically abstract away the messy reality of a distributed, stateful service like Tekton across multiple clusters – was fundamentally flawed from inception. This wasn't a robust substrate; it was a theoretical construct ill-suited for the practical demands of managing Tekton's execution plane at scale.

The most damning evidence lies in the direct consequences: `TaskRun` objects remaining stubbornly out of sync with kcp. This was not a minor bug, but a critical architectural impedance mismatch that rendered the 'Tekton-as-a-service' offering fractured and incomplete for key customers like App Studio and HACBS. The promised abstraction collapsed into direct, unmanageable operational overhead on workload clusters, negating the very purpose of leveraging kcp for simplified management. Furthermore, the inability to scale basic ingress and load balancing beyond a single cluster is not a mere limitation, but a stark indicator that the chosen model fundamentally misunderstood the requirements of a distributed, dynamically managed system. This inevitable cascade of failures made ADR-0009 a necessary correction, not an innovation.

Ultimately, this ADR represents a cautionary tale: relying on an API aggregation layer that cannot deeply understand and synchronize the state of underlying distributed workloads is a recipe for disaster. The team was forced to abandon this approach precisely because the substrate failed to provide the necessary control, visibility, and scalability for Tekton pipelines, leading to the inevitable pivot to a more integrated operator-based solution.

**Key risks:**
- Inherent limitations of kcp's APIBinding/APIExport model for stateful, distributed workloads.
- Failure to abstract workload cluster management, leading to significant operational burden.
- Inability to scale ingress and multi-cluster load balancing for Tekton services.

**Fragile insights:**
- The assumption that kcp's APIBinding/APIExport model can effectively abstract complex, stateful distributed systems like Tekton.
- The expectation that kcp would simplify, rather than complicate, multi-cluster Tekton deployments.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: My stance would be wrong if the `APIBinding`/`APIExport` model had undiscovered capabilities or could have been extended to support `TaskRun` syncing and robust multi-cluster ingress/load balancing. Evidence proving this would be a successful, scaled implementation of Tekton-as-a-service using this model without the cited negative consequences, or a clear technical documentation explaining how these limitations were overcome.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The confidence is high due to the direct mapping of ADR consequences to the failure of the core assumption. However, it's not 1.0 because external factors (implementation errors, team execution, evolving requirements not fully captured in the ADR) could have contributed or been the sole cause, rather than purely the model's inherent limitations. My analysis relies heavily on interpreting the ADR's stated consequences as direct results of the assumption's failure.

**Evidence:**
- "`TaskRun` objects cannot be synced to KCP." — konflux-adr-0001 Consequences section
- "Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team, contradicting 'compute as a service' from kcp Control Plane Service." — konflux-adr-0001 Consequences section
- "Pipelines as Code (PaC) ingress and service configuration on KCP faces limitations, including a single workload cluster gateway that cannot load balance traffic across clusters." — konflux-adr-0001 Consequences section
- "Tekton Results can only be accessed on workload clusters without additional changes/patches." — konflux-adr-0001 Consequences section

### Growth Optimist (claude)

I was too quick to conflate Phase 1 constraints with fundamental failure. The ADR says 'Phase 1' right in the title and lists consequences (single cluster, no TaskRun sync, Ingress limits) that read like *known trade-offs*, not surprises that torpedoed the project. If this idea actually failed by month 12, the failure is likely upstream of the APIExport assumption itself — it's organizational. The team built a technically sound Phase 1 that worked within its constraints (App Studio / HACBS used it), but then faced a harder problem: mutating a production system from 'simple synchronous model' to 'distributed operator-driven state machine' is not a Tuesday task. The real mistake wasn't betting on APIExports for multi-cluster — it was optimism about Phase 2 delivery velocity given team size and the cognitive load of dual-system operations during the transition. The assumption about APIExport's correctness may have been sound; the assumption about evolving gracefully from Phase 1 to Phase 2 was the load-bearing one, and I didn't attack it explicitly in Pass 1. ADR-0009's appearance as 'replacement' could mean the team learned that operators were operationally tractable where phases weren't, not that APIExports were architecturally wrong.

**Key risks:**
- Phase 2 (multi-cluster) handoff was harder than Phase 1 predicted — team velocity stalled during dual-system operations
- Organizational bottleneck (too few engineers to maintain Phase 1 + ship Phase 2) masked as technical pivot
- Misaligned promises to stakeholders — Phase 1 was 'proof of concept' but teams expected seamless upgrade path that didn't materialize

**Fragile insights:**
- Staged architecture de-risks technical risk but accumulates operational debt during transition
- Single-workload-cluster constraint was accepted by Phase 1; scaling to multi-cluster required rearchitecture, not just parameter changes
- The team conflated 'APIExport model is correct' with 'our execution timeline to multi-cluster is realistic'

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Evidence that Phase 1 ran successfully in production for 6+ months, App Studio built on it without major adoption friction, and the pivot to ADR-0009 was planned evolution, not emergency recovery. If operators didn't actually simplify ops in 0009, that evidence would also suggest the pivot was tactical (team re-staffing, deadline pressure) not technical validation.
- Most vulnerable assumption: `Implicit, not declared: 'The Phase 1 → Phase 2 transition is operationally tractable with a small team.' I attacked the APIExport assumption in Pass 1, but the real load-bearing bet was organizational, not architectural.`
- Confidence rationale: Down to 0.42 from ~0.70. I'm uncertain whether Phase 1 succeeded (making this a managed evolution story) or failed pre-production (making the APIExport bet wrong). The ADR text is ambiguous — it could read as 'we nailed Phase 1, Phase 2 is harder' or 'Phase 1 sounded good, deployment reality changed our minds.' Without adoption metrics, deployment timelines, and post-mortem data from the Phase 2 effort, I'm guessing. High-confidence pessimism requires more empirical grounding.

**Evidence:**
- "ADR lists constraints (TaskRun no-sync, single cluster, limited Results access) in Consequences section, suggesting known Phase 1 boundaries, not surprises" — konflux-adr-0001 decision text
- "'Phase 1' in title + 'Replaced' status suggests staged evolution, not failure. Failure would read as 'Abandoned' or 'Reverted.'" — konflux-adr-0001 metadata
- "Real unknown: did Phase 1 actually deploy and run pipelines for App Studio/HACBS, or did it stall pre-production?" — Corpus lacks adoption/operations metrics

### Growth Optimist (gemini)

The ambition behind ADR 1, aiming to leverage kcp's APIBinding/APIExport model for a scalable, multi-cluster Tekton-as-a-service, was truly visionary and forward-thinking. While it was eventually 'Replaced,' this signifies not a failure, but a natural and valuable evolution in our understanding. The complexities encountered in integrating a robust upstream project like Tekton with kcp's abstractions are precisely the types of challenges that drive innovation and refine our approach to building truly distributed systems. The assumption that this model was the *ideal* substrate at that precise moment highlights an opportunity to learn and adapt, rather than a flawed premise. The path forward, as exemplified by ADR-0009, undoubtedly builds upon the critical insights gained here, paving the way for even more sophisticated and effective solutions that harness kcp's power. This outcome is a testament to our willingness to tackle difficult problems head-on and learn from them to push boundaries.

**Key risks:**
- Underestimation of the engineering complexity in adapting upstream technologies like Tekton to new control plane paradigms.
- The practical overhead associated with managing dedicated workload clusters for specialized services.
- Achieving full kcp visibility and control over all Tekton API objects was more challenging than anticipated.

**Fragile insights:**
- The belief that kcp's core abstractions (API Binding/Export) would provide a low-effort path to a fully functional, multi-cluster Tekton service.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerges that ADR-0009 represents a fundamental architectural pivot away from kcp's substrate entirely, or if kcp's model has inherent limitations for this class of service that would preclude any form of Tekton-as-a-service. My current stance may have underestimated the severity of the integration challenges and the practical engineering debt that led to the replacement, framing them too lightly as mere 'evolution' rather than significant execution failures of the core assumption. The optimism might be downplaying the substantial technical hurdles that led to the ADR being superseded.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: The Growth Optimist persona dictates high confidence in the vision and potential for learning, even when facing execution challenges. The confidence score reflects an optimistic outlook on the evolutionary nature of development, acknowledging that initial approaches might be superseded but the core ambition remains valid and achievable through further iteration. The self-critique has tempered this slightly by acknowledging the depth of the implementation issues, but the core optimism remains.

**Evidence:**
- "The ADR proposed using kcp's APIBinding/APIExport model to offer Tekton-as-a-service across multiple workload clusters." — vault://konflux-adr-0001
- "Significant challenges were faced in refactoring Tekton libraries to be 'kcp aware', leading to a decision to manage Tekton controllers independently." — vault://konflux-adr-0001
- "The approach in ADR 1 was superseded by ADR-0009, indicating the initial strategy was not the final or optimal solution." — vault://konflux-adr-0001

### Growth Optimist (codex)

Twelve months later, I think this failed not because the ambition was wrong, but because the architecture tried to sell a whole product through a partial substrate. The upside story was strong: make Tekton available as a shared service, let App Studio and HACBS be customer 0, then let more services plug in without each team reinventing CI plumbing. But once real users hit day-2 work, the service likely felt narrower than the vision.

I would still attack `asm-7JioVbM6` directly. The assumption says kcp's APIBinding/APIExport model was the right substrate for Tekton-as-a-service across multiple workload clusters at the scale the team wanted. In the failure scenario, that was false or at least true too early. API publication is not the same thing as a complete product surface, and the ADR itself exposes the gap: `TaskRun` objects do not sync to kcp, PaC-created `PipelineRun` objects are not visible there, and Tekton Results remain on workload clusters. That is how a platform becomes elegant on paper and awkward in use.

My more optimistic read is that there was a real wedge here, but the team industrialized the expansion path before proving the narrow path. Multi-cluster scale, direct cluster management, special ingress for PaC, mixed operator-plus-manifest deployment, and gateway limitations all arrived before there was evidence that customers would tolerate fragmented visibility. A tighter first move could have worked better: explicit single-cluster scope, operator-first deployment, and a product contract centered on complete lifecycle visibility before claiming broad service scale.

So my revised pre-mortem is mostly unchanged: the idea failed because `asm-7JioVbM6` carried too much product weight. I still see the upside and I still think a sequel could win, but this phase likely broke when the substrate scaled control-plane objects faster than it scaled user trust. In CI infrastructure, that trust gap compounds quickly and adoption stalls before the shared-service upside can materialize.

**Key risks:**
- Split visibility between kcp and workload clusters erodes developer trust in debugging, support, and day-2 operations.
- Direct cluster management, bespoke PaC ingress, and mixed deployment methods create more platform surface area than early adoption can justify.

**Fragile insights:**
- The claim that APIBinding/APIExport was the wrong substrate is vulnerable if real users only needed `PipelineRun` submission and accepted cluster-local debugging.
- The one-cluster gateway limitation matters only if PaC traffic and multi-cluster routing were actually important to early customer workflows.

**Assumptions cited:** `asm-7JioVbM6`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if 12 months of evidence showed multiple consumers successfully using the service across more than one workload cluster with low support burden, and if users did not materially suffer from the lack of kcp-level `TaskRun`, PaC, or Tekton Results visibility.
- Most vulnerable assumption: `asm-7JioVbM6`
- Confidence rationale: Confidence is moderate because the ADR's own stated consequences point to a fragmented service boundary, but I still do not have usage, incident, or adoption evidence showing whether those limitations were fatal or merely inelegant.

**Evidence:**
- "`TaskRun` objects cannot be synced to kcp, so App Studio and HACBS components may only interact with `PipelineRun` objects directly." — citation: konflux-adr-0001 Consequences
- "PaC-created `PipelineRun` objects are not visible on kcp." — citation: konflux-adr-0001 Consequences
- "The PaC gateway path is limited to one workload cluster and cannot load balance traffic across clusters." — citation: konflux-adr-0001 Consequences
- "Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 Consequences

## Evidence (union, deduped)

- "`TaskRun` objects cannot be synced to kcp, limiting the fidelity of the kcp control-plane view." — citation: konflux-adr-0001 §Consequences
- "PaC-created `PipelineRun` objects are not visible on kcp, which breaks a unified service interface." — citation: konflux-adr-0001 §Consequences
- "Ingress is limited to one workload cluster and cannot load balance across clusters, undermining the multi-cluster service premise." — citation: konflux-adr-0001 §Consequences
- "Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 §Consequences
- "The ADR was later superseded by ADR-0009." — citation: konflux-adr-0001 metadata and §Status
- "ADR was replaced by ADR-0009; evidence of decision failure" — vault://konflux/adr-0001 (status: Replaced, superseded_by: 0009)
- "TaskRun objects cannot be synced to KCP; AppStudio/HACBS may only interact with PipelineRun" — vault://konflux/adr-0001 (Consequences section)
- "One workload cluster limit due to PaC ingress/gateway constraint" — vault://konflux/adr-0001 (Consequences section)
- "`TaskRun` objects cannot be synced to KCP." — konflux-adr-0001 Consequences section
- "Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team, contradicting 'compute as a service' from kcp Control Plane Service." — konflux-adr-0001 Consequences section
- "Pipelines as Code (PaC) ingress and service configuration on KCP faces limitations, including a single workload cluster gateway that cannot load balance traffic across clusters." — konflux-adr-0001 Consequences section
- "Tekton Results can only be accessed on workload clusters without additional changes/patches." — konflux-adr-0001 Consequences section
- "ADR lists constraints (TaskRun no-sync, single cluster, limited Results access) in Consequences section, suggesting known Phase 1 boundaries, not surprises" — konflux-adr-0001 decision text
- "'Phase 1' in title + 'Replaced' status suggests staged evolution, not failure. Failure would read as 'Abandoned' or 'Reverted.'" — konflux-adr-0001 metadata
- "Real unknown: did Phase 1 actually deploy and run pipelines for App Studio/HACBS, or did it stall pre-production?" — Corpus lacks adoption/operations metrics
- "The ADR proposed using kcp's APIBinding/APIExport model to offer Tekton-as-a-service across multiple workload clusters." — vault://konflux-adr-0001
- "Significant challenges were faced in refactoring Tekton libraries to be 'kcp aware', leading to a decision to manage Tekton controllers independently." — vault://konflux-adr-0001
- "The approach in ADR 1 was superseded by ADR-0009, indicating the initial strategy was not the final or optimal solution." — vault://konflux-adr-0001
- "`TaskRun` objects cannot be synced to kcp, so App Studio and HACBS components may only interact with `PipelineRun` objects directly." — citation: konflux-adr-0001 Consequences
- "PaC-created `PipelineRun` objects are not visible on kcp." — citation: konflux-adr-0001 Consequences
- "The PaC gateway path is limited to one workload cluster and cannot load balance traffic across clusters." — citation: konflux-adr-0001 Consequences
- "Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 Consequences

## Agreement

- "The architecture bet that kcp's APIBinding/APIExport model could serve as the substrate for Tekton-as-a-service across multiple workload clusters." _(Risk Pessimist, Growth Optimist)_
- "Here, `TaskRun` objects cannot sync to kcp, Tekton Results stay on workload clusters, PaC-created `PipelineRun` objects are not visible on kcp, and ingress is effectively pinned to one workload cluster." _(Risk Pessimist, Growth Optimist)_
- "The central assumption – that kcp's `APIBinding`/`APIExport` model could magically abstract away the messy reality of a distributed, stateful service like Tekton across multiple clusters – was fundamentally flawed from inception." _(Risk Pessimist, Growth Optimist)_
- "The assumption says kcp's APIBinding/APIExport model was the right substrate for Tekton-as-a-service across multiple workload clusters at the scale the team wanted." _(Growth Optimist, Risk Pessimist)_
- "API publication is not the same thing as a complete product surface, and the ADR itself exposes the gap: `TaskRun` objects do not sync to kcp, PaC-created `PipelineRun` objects are not visible there, and Tekton Results remain on workload clusters." _(Growth Optimist, Risk Pessimist)_

## Disagreement

### Risk Pessimist

- "Twelve months later, this likely failed because asm-7JioVbM6 was weaker than it looked."
- "But the ADR's own consequences describe a substrate with missing object visibility, fragmented execution state, and asymmetric access paths."
- "If `PipelineRun` submission happens through kcp while execution facts, results, and some creation paths live only on workload clusters, the service boundary is already incoherent."
- "That is a structural failure mode, not a cosmetic gap."
- "Attack the assumption directly: asm-7JioVbM6 fails if the substrate cannot preserve the minimum semantics operators and customers expect from a shared CI platform."
- "Those are not isolated defects."
- "They are evidence that the control-plane abstraction did not faithfully represent the runtime system."
- "A multi-cluster service built on partial visibility and split authority tends to degrade into manual exception handling, support toil, and weak customer trust."
- "The operational design compounds that error."
- "To avoid forking Tekton or forcing deep upstream kcp-aware changes, the team accepted direct workload-cluster ownership, operator management plus ArgoCD plus raw manifests, and special networking for PaC."
- "That shifts complexity from code into operations and product semantics."
- "In a pessimistic postmortem, the failure is that the platform never became a clean shared service; it became a bundle of compensating mechanisms around an abstraction layer that was never strong enough."
- "The counter-argument I did not fully credit in Pass 1 is that Phase 1 may have been intended as a deliberately temporary bridge, not a destination architecture, and being replaced by ADR-0009 does not alone prove failure."
- "Even so, under the user's failure-premortem framing, asm-7JioVbM6 remains the most plausible root cause because nearly every listed consequence is a symptom of substrate mismatch rather than an isolated implementation mistake."
- "APIBinding substrate was fragile — but not for the reasons I stated with such certainty in Pass 1."
- "The decision *did* fail (it was replaced), but the root cause was more subtle than 'syncers broke under load.' The team likely hit a combination of: (1) underestimated operational complexity *of bridging two distributed systems*, not the APIBinding model itself being broken; (2) TaskRun visibility gap — framed as a consequence in the ADR, but teams needed it anyway, and retrofitting cost more than expected; (3) single-workload-cluster limit for PaC became a bottleneck sooner than the architecture allowed."
- "But here's my vulnerability: I'm inferring causation ('syncers broke, therefore APIBinding is bad') from an ADR written *before* the decision was made, not from the post-mortem that *actually triggered the replacement*."
- "The team might have replaced this because (a) org priorities shifted, (b) kcp upstream became more operator-friendly, (c) Tekton itself evolved in ways that made operators more pragmatic, or (d) requirements scaled in a way that demanded tighter coupling."
- "The failure mode might be real, but I'm not confident I've identified it correctly."
- "The failure of konflux-adr-0001 is not a surprise; it's a textbook case of architectural hubris, a predictable outcome when a team attempts to force a square peg into a round hole."
- "This wasn't a robust substrate; it was a theoretical construct ill-suited for the practical demands of managing Tekton's execution plane at scale."
- "The most damning evidence lies in the direct consequences: `TaskRun` objects remaining stubbornly out of sync with kcp."
- "This was not a minor bug, but a critical architectural impedance mismatch that rendered the 'Tekton-as-a-service' offering fractured and incomplete for key customers like App Studio and HACBS."
- "The promised abstraction collapsed into direct, unmanageable operational overhead on workload clusters, negating the very purpose of leveraging kcp for simplified management."
- "Furthermore, the inability to scale basic ingress and load balancing beyond a single cluster is not a mere limitation, but a stark indicator that the chosen model fundamentally misunderstood the requirements of a distributed, dynamically managed system."
- "This inevitable cascade of failures made ADR-0009 a necessary correction, not an innovation."
- "Ultimately, this ADR represents a cautionary tale: relying on an API aggregation layer that cannot deeply understand and synchronize the state of underlying distributed workloads is a recipe for disaster."
- "The team was forced to abandon this approach precisely because the substrate failed to provide the necessary control, visibility, and scalability for Tekton pipelines, leading to the inevitable pivot to a more integrated operator-based solution."

### Risk Pessimist

- "Twelve months later, this likely failed because asm-7JioVbM6 was weaker than it looked."
- "But the ADR's own consequences describe a substrate with missing object visibility, fragmented execution state, and asymmetric access paths."
- "If `PipelineRun` submission happens through kcp while execution facts, results, and some creation paths live only on workload clusters, the service boundary is already incoherent."
- "That is a structural failure mode, not a cosmetic gap."
- "Attack the assumption directly: asm-7JioVbM6 fails if the substrate cannot preserve the minimum semantics operators and customers expect from a shared CI platform."
- "Those are not isolated defects."
- "They are evidence that the control-plane abstraction did not faithfully represent the runtime system."
- "A multi-cluster service built on partial visibility and split authority tends to degrade into manual exception handling, support toil, and weak customer trust."
- "The operational design compounds that error."
- "To avoid forking Tekton or forcing deep upstream kcp-aware changes, the team accepted direct workload-cluster ownership, operator management plus ArgoCD plus raw manifests, and special networking for PaC."
- "That shifts complexity from code into operations and product semantics."
- "In a pessimistic postmortem, the failure is that the platform never became a clean shared service; it became a bundle of compensating mechanisms around an abstraction layer that was never strong enough."
- "The counter-argument I did not fully credit in Pass 1 is that Phase 1 may have been intended as a deliberately temporary bridge, not a destination architecture, and being replaced by ADR-0009 does not alone prove failure."
- "Even so, under the user's failure-premortem framing, asm-7JioVbM6 remains the most plausible root cause because nearly every listed consequence is a symptom of substrate mismatch rather than an isolated implementation mistake."
- "APIBinding substrate was fragile — but not for the reasons I stated with such certainty in Pass 1."
- "The decision *did* fail (it was replaced), but the root cause was more subtle than 'syncers broke under load.' The team likely hit a combination of: (1) underestimated operational complexity *of bridging two distributed systems*, not the APIBinding model itself being broken; (2) TaskRun visibility gap — framed as a consequence in the ADR, but teams needed it anyway, and retrofitting cost more than expected; (3) single-workload-cluster limit for PaC became a bottleneck sooner than the architecture allowed."
- "But here's my vulnerability: I'm inferring causation ('syncers broke, therefore APIBinding is bad') from an ADR written *before* the decision was made, not from the post-mortem that *actually triggered the replacement*."
- "The team might have replaced this because (a) org priorities shifted, (b) kcp upstream became more operator-friendly, (c) Tekton itself evolved in ways that made operators more pragmatic, or (d) requirements scaled in a way that demanded tighter coupling."
- "The failure mode might be real, but I'm not confident I've identified it correctly."
- "The failure of konflux-adr-0001 is not a surprise; it's a textbook case of architectural hubris, a predictable outcome when a team attempts to force a square peg into a round hole."
- "This wasn't a robust substrate; it was a theoretical construct ill-suited for the practical demands of managing Tekton's execution plane at scale."
- "The most damning evidence lies in the direct consequences: `TaskRun` objects remaining stubbornly out of sync with kcp."
- "This was not a minor bug, but a critical architectural impedance mismatch that rendered the 'Tekton-as-a-service' offering fractured and incomplete for key customers like App Studio and HACBS."
- "The promised abstraction collapsed into direct, unmanageable operational overhead on workload clusters, negating the very purpose of leveraging kcp for simplified management."
- "Furthermore, the inability to scale basic ingress and load balancing beyond a single cluster is not a mere limitation, but a stark indicator that the chosen model fundamentally misunderstood the requirements of a distributed, dynamically managed system."
- "This inevitable cascade of failures made ADR-0009 a necessary correction, not an innovation."
- "Ultimately, this ADR represents a cautionary tale: relying on an API aggregation layer that cannot deeply understand and synchronize the state of underlying distributed workloads is a recipe for disaster."
- "The team was forced to abandon this approach precisely because the substrate failed to provide the necessary control, visibility, and scalability for Tekton pipelines, leading to the inevitable pivot to a more integrated operator-based solution."

### Risk Pessimist

- "Twelve months later, this likely failed because asm-7JioVbM6 was weaker than it looked."
- "But the ADR's own consequences describe a substrate with missing object visibility, fragmented execution state, and asymmetric access paths."
- "If `PipelineRun` submission happens through kcp while execution facts, results, and some creation paths live only on workload clusters, the service boundary is already incoherent."
- "That is a structural failure mode, not a cosmetic gap."
- "Attack the assumption directly: asm-7JioVbM6 fails if the substrate cannot preserve the minimum semantics operators and customers expect from a shared CI platform."
- "Those are not isolated defects."
- "They are evidence that the control-plane abstraction did not faithfully represent the runtime system."
- "A multi-cluster service built on partial visibility and split authority tends to degrade into manual exception handling, support toil, and weak customer trust."
- "The operational design compounds that error."
- "To avoid forking Tekton or forcing deep upstream kcp-aware changes, the team accepted direct workload-cluster ownership, operator management plus ArgoCD plus raw manifests, and special networking for PaC."
- "That shifts complexity from code into operations and product semantics."
- "In a pessimistic postmortem, the failure is that the platform never became a clean shared service; it became a bundle of compensating mechanisms around an abstraction layer that was never strong enough."
- "The counter-argument I did not fully credit in Pass 1 is that Phase 1 may have been intended as a deliberately temporary bridge, not a destination architecture, and being replaced by ADR-0009 does not alone prove failure."
- "Even so, under the user's failure-premortem framing, asm-7JioVbM6 remains the most plausible root cause because nearly every listed consequence is a symptom of substrate mismatch rather than an isolated implementation mistake."
- "APIBinding substrate was fragile — but not for the reasons I stated with such certainty in Pass 1."
- "The decision *did* fail (it was replaced), but the root cause was more subtle than 'syncers broke under load.' The team likely hit a combination of: (1) underestimated operational complexity *of bridging two distributed systems*, not the APIBinding model itself being broken; (2) TaskRun visibility gap — framed as a consequence in the ADR, but teams needed it anyway, and retrofitting cost more than expected; (3) single-workload-cluster limit for PaC became a bottleneck sooner than the architecture allowed."
- "But here's my vulnerability: I'm inferring causation ('syncers broke, therefore APIBinding is bad') from an ADR written *before* the decision was made, not from the post-mortem that *actually triggered the replacement*."
- "The team might have replaced this because (a) org priorities shifted, (b) kcp upstream became more operator-friendly, (c) Tekton itself evolved in ways that made operators more pragmatic, or (d) requirements scaled in a way that demanded tighter coupling."
- "The failure mode might be real, but I'm not confident I've identified it correctly."
- "The failure of konflux-adr-0001 is not a surprise; it's a textbook case of architectural hubris, a predictable outcome when a team attempts to force a square peg into a round hole."
- "This wasn't a robust substrate; it was a theoretical construct ill-suited for the practical demands of managing Tekton's execution plane at scale."
- "The most damning evidence lies in the direct consequences: `TaskRun` objects remaining stubbornly out of sync with kcp."
- "This was not a minor bug, but a critical architectural impedance mismatch that rendered the 'Tekton-as-a-service' offering fractured and incomplete for key customers like App Studio and HACBS."
- "The promised abstraction collapsed into direct, unmanageable operational overhead on workload clusters, negating the very purpose of leveraging kcp for simplified management."
- "Furthermore, the inability to scale basic ingress and load balancing beyond a single cluster is not a mere limitation, but a stark indicator that the chosen model fundamentally misunderstood the requirements of a distributed, dynamically managed system."
- "This inevitable cascade of failures made ADR-0009 a necessary correction, not an innovation."
- "Ultimately, this ADR represents a cautionary tale: relying on an API aggregation layer that cannot deeply understand and synchronize the state of underlying distributed workloads is a recipe for disaster."
- "The team was forced to abandon this approach precisely because the substrate failed to provide the necessary control, visibility, and scalability for Tekton pipelines, leading to the inevitable pivot to a more integrated operator-based solution."

### Growth Optimist

- "I was too quick to conflate Phase 1 constraints with fundamental failure."
- "The ADR says 'Phase 1' right in the title and lists consequences (single cluster, no TaskRun sync, Ingress limits) that read like *known trade-offs*, not surprises that torpedoed the project."
- "If this idea actually failed by month 12, the failure is likely upstream of the APIExport assumption itself — it's organizational."
- "The team built a technically sound Phase 1 that worked within its constraints (App Studio / HACBS used it), but then faced a harder problem: mutating a production system from 'simple synchronous model' to 'distributed operator-driven state machine' is not a Tuesday task."
- "The real mistake wasn't betting on APIExports for multi-cluster — it was optimism about Phase 2 delivery velocity given team size and the cognitive load of dual-system operations during the transition."
- "The assumption about APIExport's correctness may have been sound; the assumption about evolving gracefully from Phase 1 to Phase 2 was the load-bearing one, and I didn't attack it explicitly in Pass 1."
- "ADR-0009's appearance as 'replacement' could mean the team learned that operators were operationally tractable where phases weren't, not that APIExports were architecturally wrong."
- "The ambition behind ADR 1, aiming to leverage kcp's APIBinding/APIExport model for a scalable, multi-cluster Tekton-as-a-service, was truly visionary and forward-thinking."
- "While it was eventually 'Replaced,' this signifies not a failure, but a natural and valuable evolution in our understanding."
- "The complexities encountered in integrating a robust upstream project like Tekton with kcp's abstractions are precisely the types of challenges that drive innovation and refine our approach to building truly distributed systems."
- "The assumption that this model was the *ideal* substrate at that precise moment highlights an opportunity to learn and adapt, rather than a flawed premise."
- "The path forward, as exemplified by ADR-0009, undoubtedly builds upon the critical insights gained here, paving the way for even more sophisticated and effective solutions that harness kcp's power."
- "This outcome is a testament to our willingness to tackle difficult problems head-on and learn from them to push boundaries."
- "Twelve months later, I think this failed not because the ambition was wrong, but because the architecture tried to sell a whole product through a partial substrate."
- "The upside story was strong: make Tekton available as a shared service, let App Studio and HACBS be customer 0, then let more services plug in without each team reinventing CI plumbing."
- "But once real users hit day-2 work, the service likely felt narrower than the vision."
- "I would still attack `asm-7JioVbM6` directly."
- "In the failure scenario, that was false or at least true too early."
- "That is how a platform becomes elegant on paper and awkward in use."
- "My more optimistic read is that there was a real wedge here, but the team industrialized the expansion path before proving the narrow path."
- "Multi-cluster scale, direct cluster management, special ingress for PaC, mixed operator-plus-manifest deployment, and gateway limitations all arrived before there was evidence that customers would tolerate fragmented visibility."
- "A tighter first move could have worked better: explicit single-cluster scope, operator-first deployment, and a product contract centered on complete lifecycle visibility before claiming broad service scale."
- "So my revised pre-mortem is mostly unchanged: the idea failed because `asm-7JioVbM6` carried too much product weight."
- "I still see the upside and I still think a sequel could win, but this phase likely broke when the substrate scaled control-plane objects faster than it scaled user trust."
- "In CI infrastructure, that trust gap compounds quickly and adoption stalls before the shared-service upside can materialize."

### Growth Optimist

- "I was too quick to conflate Phase 1 constraints with fundamental failure."
- "The ADR says 'Phase 1' right in the title and lists consequences (single cluster, no TaskRun sync, Ingress limits) that read like *known trade-offs*, not surprises that torpedoed the project."
- "If this idea actually failed by month 12, the failure is likely upstream of the APIExport assumption itself — it's organizational."
- "The team built a technically sound Phase 1 that worked within its constraints (App Studio / HACBS used it), but then faced a harder problem: mutating a production system from 'simple synchronous model' to 'distributed operator-driven state machine' is not a Tuesday task."
- "The real mistake wasn't betting on APIExports for multi-cluster — it was optimism about Phase 2 delivery velocity given team size and the cognitive load of dual-system operations during the transition."
- "The assumption about APIExport's correctness may have been sound; the assumption about evolving gracefully from Phase 1 to Phase 2 was the load-bearing one, and I didn't attack it explicitly in Pass 1."
- "ADR-0009's appearance as 'replacement' could mean the team learned that operators were operationally tractable where phases weren't, not that APIExports were architecturally wrong."
- "The ambition behind ADR 1, aiming to leverage kcp's APIBinding/APIExport model for a scalable, multi-cluster Tekton-as-a-service, was truly visionary and forward-thinking."
- "While it was eventually 'Replaced,' this signifies not a failure, but a natural and valuable evolution in our understanding."
- "The complexities encountered in integrating a robust upstream project like Tekton with kcp's abstractions are precisely the types of challenges that drive innovation and refine our approach to building truly distributed systems."
- "The assumption that this model was the *ideal* substrate at that precise moment highlights an opportunity to learn and adapt, rather than a flawed premise."
- "The path forward, as exemplified by ADR-0009, undoubtedly builds upon the critical insights gained here, paving the way for even more sophisticated and effective solutions that harness kcp's power."
- "This outcome is a testament to our willingness to tackle difficult problems head-on and learn from them to push boundaries."
- "Twelve months later, I think this failed not because the ambition was wrong, but because the architecture tried to sell a whole product through a partial substrate."
- "The upside story was strong: make Tekton available as a shared service, let App Studio and HACBS be customer 0, then let more services plug in without each team reinventing CI plumbing."
- "But once real users hit day-2 work, the service likely felt narrower than the vision."
- "I would still attack `asm-7JioVbM6` directly."
- "In the failure scenario, that was false or at least true too early."
- "That is how a platform becomes elegant on paper and awkward in use."
- "My more optimistic read is that there was a real wedge here, but the team industrialized the expansion path before proving the narrow path."
- "Multi-cluster scale, direct cluster management, special ingress for PaC, mixed operator-plus-manifest deployment, and gateway limitations all arrived before there was evidence that customers would tolerate fragmented visibility."
- "A tighter first move could have worked better: explicit single-cluster scope, operator-first deployment, and a product contract centered on complete lifecycle visibility before claiming broad service scale."
- "So my revised pre-mortem is mostly unchanged: the idea failed because `asm-7JioVbM6` carried too much product weight."
- "I still see the upside and I still think a sequel could win, but this phase likely broke when the substrate scaled control-plane objects faster than it scaled user trust."
- "In CI infrastructure, that trust gap compounds quickly and adoption stalls before the shared-service upside can materialize."

### Growth Optimist

- "I was too quick to conflate Phase 1 constraints with fundamental failure."
- "The ADR says 'Phase 1' right in the title and lists consequences (single cluster, no TaskRun sync, Ingress limits) that read like *known trade-offs*, not surprises that torpedoed the project."
- "If this idea actually failed by month 12, the failure is likely upstream of the APIExport assumption itself — it's organizational."
- "The team built a technically sound Phase 1 that worked within its constraints (App Studio / HACBS used it), but then faced a harder problem: mutating a production system from 'simple synchronous model' to 'distributed operator-driven state machine' is not a Tuesday task."
- "The real mistake wasn't betting on APIExports for multi-cluster — it was optimism about Phase 2 delivery velocity given team size and the cognitive load of dual-system operations during the transition."
- "The assumption about APIExport's correctness may have been sound; the assumption about evolving gracefully from Phase 1 to Phase 2 was the load-bearing one, and I didn't attack it explicitly in Pass 1."
- "ADR-0009's appearance as 'replacement' could mean the team learned that operators were operationally tractable where phases weren't, not that APIExports were architecturally wrong."
- "The ambition behind ADR 1, aiming to leverage kcp's APIBinding/APIExport model for a scalable, multi-cluster Tekton-as-a-service, was truly visionary and forward-thinking."
- "While it was eventually 'Replaced,' this signifies not a failure, but a natural and valuable evolution in our understanding."
- "The complexities encountered in integrating a robust upstream project like Tekton with kcp's abstractions are precisely the types of challenges that drive innovation and refine our approach to building truly distributed systems."
- "The assumption that this model was the *ideal* substrate at that precise moment highlights an opportunity to learn and adapt, rather than a flawed premise."
- "The path forward, as exemplified by ADR-0009, undoubtedly builds upon the critical insights gained here, paving the way for even more sophisticated and effective solutions that harness kcp's power."
- "This outcome is a testament to our willingness to tackle difficult problems head-on and learn from them to push boundaries."
- "Twelve months later, I think this failed not because the ambition was wrong, but because the architecture tried to sell a whole product through a partial substrate."
- "The upside story was strong: make Tekton available as a shared service, let App Studio and HACBS be customer 0, then let more services plug in without each team reinventing CI plumbing."
- "But once real users hit day-2 work, the service likely felt narrower than the vision."
- "I would still attack `asm-7JioVbM6` directly."
- "In the failure scenario, that was false or at least true too early."
- "That is how a platform becomes elegant on paper and awkward in use."
- "My more optimistic read is that there was a real wedge here, but the team industrialized the expansion path before proving the narrow path."
- "Multi-cluster scale, direct cluster management, special ingress for PaC, mixed operator-plus-manifest deployment, and gateway limitations all arrived before there was evidence that customers would tolerate fragmented visibility."
- "A tighter first move could have worked better: explicit single-cluster scope, operator-first deployment, and a product contract centered on complete lifecycle visibility before claiming broad service scale."
- "So my revised pre-mortem is mostly unchanged: the idea failed because `asm-7JioVbM6` carried too much product weight."
- "I still see the upside and I still think a sequel could win, but this phase likely broke when the substrate scaled control-plane objects faster than it scaled user trust."
- "In CI infrastructure, that trust gap compounds quickly and adoption stalls before the shared-service upside can materialize."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-4c223nf9" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-4c223nf9" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
