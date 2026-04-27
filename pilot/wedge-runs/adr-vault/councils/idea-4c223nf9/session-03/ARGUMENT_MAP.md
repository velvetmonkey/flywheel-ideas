---
type: argument_map
session_id: sess-Hb97j7bW
generated_at: '2026-04-26T23:31:50.409Z'
---
# Argument map — session sess-Hb97j7bW

**Idea:** konflux-adr-0001 — ADR 1. Pipeline Service Phase 1 (konflux-ci/architecture)
**Generated:** 2026-04-26T23:31:50.409Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.69
**Source view(s):** view-CRwxgrjy

### Claim

Twelve months later, this likely failed because asm-7JioVbM6 was weaker than it looked. The architecture bet that kcp's APIBinding/APIExport model could serve as the substrate for Tekton-as-a-service across multiple workload clusters. But the ADR's own consequences describe a substrate with missing object visibility, fragmented execution state, and asymmetric access paths. If `PipelineRun` submission happens through kcp while execution facts, results, and some creation paths live only on workload clusters, the service boundary is already incoherent. That is a structural failure mode, not a cosmetic gap.

Attack the assumption directly: asm-7JioVbM6 fails if the substrate cannot preserve the minimum semantics operators and customers expect from a shared CI platform. Here, `TaskRun` objects cannot sync to kcp, Tekton Results stay on workload clusters, PaC-created `PipelineRun` objects are not visible on kcp, and ingress is effectively pinned to one workload cluster. Those are not isolated defects. They are evidence that the control-plane abstraction did not faithfully represent the runtime system. A multi-cluster service built on partial visibility and split authority tends to degrade into manual exception handling, support toil, and weak customer trust.

The operational design compounds that error. To avoid forking Tekton or forcing deep upstream kcp-aware changes, the team accepted direct workload-cluster ownership, operator management plus ArgoCD plus raw manifests, and special networking for PaC. That shifts complexity from code into operations and product semantics. In a pessimistic postmortem, the failure is that the platform never became a clean shared service; it became a bundle of compensating mechanisms around an abstraction layer that was never strong enough.

The counter-argument I did not fully credit in Pass 1 is that Phase 1 may have been intended as a deliberately temporary bridge, not a destination architecture, and being replaced by ADR-0009 does not alone prove failure. Even so, under the user's failure-premortem framing, asm-7JioVbM6 remains the most plausible root cause because nearly every listed consequence is a symptom of substrate mismatch rather than an isolated implementation mistake.

### Pros

- `TaskRun` objects cannot be synced to kcp, limiting the fidelity of the kcp control-plane view.
  - evidence: `TaskRun` objects cannot be synced to kcp, limiting the fidelity of the kcp control-plane view. (citation: konflux-adr-0001 §Consequences)
- PaC-created `PipelineRun` objects are not visible on kcp, which breaks a unified service interface.
  - evidence: PaC-created `PipelineRun` objects are not visible on kcp, which breaks a unified service interface. (citation: konflux-adr-0001 §Consequences)
- Ingress is limited to one workload cluster and cannot load balance across clusters, undermining the multi-cluster service premise.
  - evidence: Ingress is limited to one workload cluster and cannot load balance across clusters, undermining the multi-cluster service premise. (citation: konflux-adr-0001 §Consequences)
- Tekton Results can only be accessed on workload clusters unless additional changes or patches are made.
  - evidence: Tekton Results can only be accessed on workload clusters unless additional changes or patches are made. (citation: konflux-adr-0001 §Consequences)
- The ADR was later superseded by ADR-0009.
  - evidence: The ADR was later superseded by ADR-0009. (citation: konflux-adr-0001 metadata and §Status)

### Cons

- The kcp APIBinding/APIExport substrate presents an incomplete and misleading control-plane view, causing split-brain operations between kcp and workload clusters.
- Operational complexity from direct cluster ownership, mixed deployment mechanisms, and PaC-specific routing overwhelms the team before multi-cluster scale or customer trust materializes.
- Fragile: Replacement by ADR-0009 is suggestive of architectural failure, but that inference weakens if Phase 1 was explicitly scoped as a temporary bridge with acceptable limitations.

---

## claim-002 — risk-pessimist

**Confidence:** 0.55
**Source view(s):** view-8bnZXxFy

### Claim

APIBinding substrate was fragile — but not for the reasons I stated with such certainty in Pass 1. The decision *did* fail (it was replaced), but the root cause was more subtle than 'syncers broke under load.' The team likely hit a combination of: (1) underestimated operational complexity *of bridging two distributed systems*, not the APIBinding model itself being broken; (2) TaskRun visibility gap — framed as a consequence in the ADR, but teams needed it anyway, and retrofitting cost more than expected; (3) single-workload-cluster limit for PaC became a bottleneck sooner than the architecture allowed. But here's my vulnerability: I'm inferring causation ('syncers broke, therefore APIBinding is bad') from an ADR written *before* the decision was made, not from the post-mortem that *actually triggered the replacement*. The team might have replaced this because (a) org priorities shifted, (b) kcp upstream became more operator-friendly, (c) Tekton itself evolved in ways that made operators more pragmatic, or (d) requirements scaled in a way that demanded tighter coupling. The failure mode might be real, but I'm not confident I've identified it correctly.

### Pros

- ADR was replaced by ADR-0009; evidence of decision failure
  - evidence: ADR was replaced by ADR-0009; evidence of decision failure (vault://konflux/adr-0001 (status: Replaced, superseded_by: 0009))
- TaskRun objects cannot be synced to KCP; AppStudio/HACBS may only interact with PipelineRun
  - evidence: TaskRun objects cannot be synced to KCP; AppStudio/HACBS may only interact with PipelineRun (vault://konflux/adr-0001 (Consequences section))
- One workload cluster limit due to PaC ingress/gateway constraint
  - evidence: One workload cluster limit due to PaC ingress/gateway constraint (vault://konflux/adr-0001 (Consequences section))

### Cons

- Operational burden of Tekton under kcp sync model (schema drift, sync lag, conflict resolution)
- TaskRun exclusion forced awkward app-team workarounds; retrofitting cost > initial estimate
- Single-workload-cluster limit (PaC gateway) became bottleneck before architecture could evolve
- Team lacked Tekton+kcp+syncer expertise; debugging across three failure domains exceeded capacity
- Replacement (ADR-0009, operator-based) may have different failure modes (tighter coupling, less modularity)
- Fragile: Mutable-state semantics of Tekton might be fundamentally at odds with kcp sync, or just hard to operationalize well
- Fragile: APIBinding abstraction promised to hide complexity; it didn't — it multiplied debugging surface
- Fragile: TaskRun exclusion was accepted as a consequence; teams adapting to it was not validated pre-decision

---

## claim-003 — risk-pessimist

**Confidence:** 0.80
**Source view(s):** view-YtTSdBek

### Claim

The failure of konflux-adr-0001 is not a surprise; it's a textbook case of architectural hubris, a predictable outcome when a team attempts to force a square peg into a round hole. The central assumption – that kcp's `APIBinding`/`APIExport` model could magically abstract away the messy reality of a distributed, stateful service like Tekton across multiple clusters – was fundamentally flawed from inception. This wasn't a robust substrate; it was a theoretical construct ill-suited for the practical demands of managing Tekton's execution plane at scale.

The most damning evidence lies in the direct consequences: `TaskRun` objects remaining stubbornly out of sync with kcp. This was not a minor bug, but a critical architectural impedance mismatch that rendered the 'Tekton-as-a-service' offering fractured and incomplete for key customers like App Studio and HACBS. The promised abstraction collapsed into direct, unmanageable operational overhead on workload clusters, negating the very purpose of leveraging kcp for simplified management. Furthermore, the inability to scale basic ingress and load balancing beyond a single cluster is not a mere limitation, but a stark indicator that the chosen model fundamentally misunderstood the requirements of a distributed, dynamically managed system. This inevitable cascade of failures made ADR-0009 a necessary correction, not an innovation.

Ultimately, this ADR represents a cautionary tale: relying on an API aggregation layer that cannot deeply understand and synchronize the state of underlying distributed workloads is a recipe for disaster. The team was forced to abandon this approach precisely because the substrate failed to provide the necessary control, visibility, and scalability for Tekton pipelines, leading to the inevitable pivot to a more integrated operator-based solution.

### Pros

- `TaskRun` objects cannot be synced to KCP.
  - evidence: `TaskRun` objects cannot be synced to KCP. (konflux-adr-0001 Consequences section)
- Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team, contradicting 'compute as a service' from kcp Control Plane Service.
  - evidence: Workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team, contradicting 'compute as a service' from kcp Control Plane Service. (konflux-adr-0001 Consequences section)
- Pipelines as Code (PaC) ingress and service configuration on KCP faces limitations, including a single workload cluster gateway that cannot load balance traffic across clusters.
  - evidence: Pipelines as Code (PaC) ingress and service configuration on KCP faces limitations, including a single workload cluster gateway that cannot load balance traffic across clusters. (konflux-adr-0001 Consequences section)
- Tekton Results can only be accessed on workload clusters without additional changes/patches.
  - evidence: Tekton Results can only be accessed on workload clusters without additional changes/patches. (konflux-adr-0001 Consequences section)

### Cons

- Inherent limitations of kcp's APIBinding/APIExport model for stateful, distributed workloads.
- Failure to abstract workload cluster management, leading to significant operational burden.
- Inability to scale ingress and multi-cluster load balancing for Tekton services.
- Fragile: The assumption that kcp's APIBinding/APIExport model can effectively abstract complex, stateful distributed systems like Tekton.
- Fragile: The expectation that kcp would simplify, rather than complicate, multi-cluster Tekton deployments.

---

## claim-004 — growth-optimist

**Confidence:** 0.42
**Source view(s):** view-JLEZiiT2

### Claim

I was too quick to conflate Phase 1 constraints with fundamental failure. The ADR says 'Phase 1' right in the title and lists consequences (single cluster, no TaskRun sync, Ingress limits) that read like *known trade-offs*, not surprises that torpedoed the project. If this idea actually failed by month 12, the failure is likely upstream of the APIExport assumption itself — it's organizational. The team built a technically sound Phase 1 that worked within its constraints (App Studio / HACBS used it), but then faced a harder problem: mutating a production system from 'simple synchronous model' to 'distributed operator-driven state machine' is not a Tuesday task. The real mistake wasn't betting on APIExports for multi-cluster — it was optimism about Phase 2 delivery velocity given team size and the cognitive load of dual-system operations during the transition. The assumption about APIExport's correctness may have been sound; the assumption about evolving gracefully from Phase 1 to Phase 2 was the load-bearing one, and I didn't attack it explicitly in Pass 1. ADR-0009's appearance as 'replacement' could mean the team learned that operators were operationally tractable where phases weren't, not that APIExports were architecturally wrong.

### Pros

- ADR lists constraints (TaskRun no-sync, single cluster, limited Results access) in Consequences section, suggesting known Phase 1 boundaries, not surprises
  - evidence: ADR lists constraints (TaskRun no-sync, single cluster, limited Results access) in Consequences section, suggesting known Phase 1 boundaries, not surprises (konflux-adr-0001 decision text)
- 'Phase 1' in title + 'Replaced' status suggests staged evolution, not failure. Failure would read as 'Abandoned' or 'Reverted.'
  - evidence: 'Phase 1' in title + 'Replaced' status suggests staged evolution, not failure. Failure would read as 'Abandoned' or 'Reverted.' (konflux-adr-0001 metadata)
- Real unknown: did Phase 1 actually deploy and run pipelines for App Studio/HACBS, or did it stall pre-production?
  - evidence: Real unknown: did Phase 1 actually deploy and run pipelines for App Studio/HACBS, or did it stall pre-production? (Corpus lacks adoption/operations metrics)

### Cons

- Phase 2 (multi-cluster) handoff was harder than Phase 1 predicted — team velocity stalled during dual-system operations
- Organizational bottleneck (too few engineers to maintain Phase 1 + ship Phase 2) masked as technical pivot
- Misaligned promises to stakeholders — Phase 1 was 'proof of concept' but teams expected seamless upgrade path that didn't materialize
- Fragile: Staged architecture de-risks technical risk but accumulates operational debt during transition
- Fragile: Single-workload-cluster constraint was accepted by Phase 1; scaling to multi-cluster required rearchitecture, not just parameter changes
- Fragile: The team conflated 'APIExport model is correct' with 'our execution timeline to multi-cluster is realistic'

---

## claim-005 — growth-optimist

**Confidence:** 0.75
**Source view(s):** view-BmXScuZW

### Claim

The ambition behind ADR 1, aiming to leverage kcp's APIBinding/APIExport model for a scalable, multi-cluster Tekton-as-a-service, was truly visionary and forward-thinking. While it was eventually 'Replaced,' this signifies not a failure, but a natural and valuable evolution in our understanding. The complexities encountered in integrating a robust upstream project like Tekton with kcp's abstractions are precisely the types of challenges that drive innovation and refine our approach to building truly distributed systems. The assumption that this model was the *ideal* substrate at that precise moment highlights an opportunity to learn and adapt, rather than a flawed premise. The path forward, as exemplified by ADR-0009, undoubtedly builds upon the critical insights gained here, paving the way for even more sophisticated and effective solutions that harness kcp's power. This outcome is a testament to our willingness to tackle difficult problems head-on and learn from them to push boundaries.

### Pros

- The ADR proposed using kcp's APIBinding/APIExport model to offer Tekton-as-a-service across multiple workload clusters.
  - evidence: The ADR proposed using kcp's APIBinding/APIExport model to offer Tekton-as-a-service across multiple workload clusters. (vault://konflux-adr-0001)
- Significant challenges were faced in refactoring Tekton libraries to be 'kcp aware', leading to a decision to manage Tekton controllers independently.
  - evidence: Significant challenges were faced in refactoring Tekton libraries to be 'kcp aware', leading to a decision to manage Tekton controllers independently. (vault://konflux-adr-0001)
- The approach in ADR 1 was superseded by ADR-0009, indicating the initial strategy was not the final or optimal solution.
  - evidence: The approach in ADR 1 was superseded by ADR-0009, indicating the initial strategy was not the final or optimal solution. (vault://konflux-adr-0001)

### Cons

- Underestimation of the engineering complexity in adapting upstream technologies like Tekton to new control plane paradigms.
- The practical overhead associated with managing dedicated workload clusters for specialized services.
- Achieving full kcp visibility and control over all Tekton API objects was more challenging than anticipated.
- Fragile: The belief that kcp's core abstractions (API Binding/Export) would provide a low-effort path to a fully functional, multi-cluster Tekton service.

---

## claim-006 — growth-optimist

**Confidence:** 0.61
**Source view(s):** view-omcML5Nz

### Claim

Twelve months later, I think this failed not because the ambition was wrong, but because the architecture tried to sell a whole product through a partial substrate. The upside story was strong: make Tekton available as a shared service, let App Studio and HACBS be customer 0, then let more services plug in without each team reinventing CI plumbing. But once real users hit day-2 work, the service likely felt narrower than the vision.

I would still attack `asm-7JioVbM6` directly. The assumption says kcp's APIBinding/APIExport model was the right substrate for Tekton-as-a-service across multiple workload clusters at the scale the team wanted. In the failure scenario, that was false or at least true too early. API publication is not the same thing as a complete product surface, and the ADR itself exposes the gap: `TaskRun` objects do not sync to kcp, PaC-created `PipelineRun` objects are not visible there, and Tekton Results remain on workload clusters. That is how a platform becomes elegant on paper and awkward in use.

My more optimistic read is that there was a real wedge here, but the team industrialized the expansion path before proving the narrow path. Multi-cluster scale, direct cluster management, special ingress for PaC, mixed operator-plus-manifest deployment, and gateway limitations all arrived before there was evidence that customers would tolerate fragmented visibility. A tighter first move could have worked better: explicit single-cluster scope, operator-first deployment, and a product contract centered on complete lifecycle visibility before claiming broad service scale.

So my revised pre-mortem is mostly unchanged: the idea failed because `asm-7JioVbM6` carried too much product weight. I still see the upside and I still think a sequel could win, but this phase likely broke when the substrate scaled control-plane objects faster than it scaled user trust. In CI infrastructure, that trust gap compounds quickly and adoption stalls before the shared-service upside can materialize.

### Pros

- `TaskRun` objects cannot be synced to kcp, so App Studio and HACBS components may only interact with `PipelineRun` objects directly.
  - evidence: `TaskRun` objects cannot be synced to kcp, so App Studio and HACBS components may only interact with `PipelineRun` objects directly. (citation: konflux-adr-0001 Consequences)
- PaC-created `PipelineRun` objects are not visible on kcp.
  - evidence: PaC-created `PipelineRun` objects are not visible on kcp. (citation: konflux-adr-0001 Consequences)
- The PaC gateway path is limited to one workload cluster and cannot load balance traffic across clusters.
  - evidence: The PaC gateway path is limited to one workload cluster and cannot load balance traffic across clusters. (citation: konflux-adr-0001 Consequences)
- Tekton Results can only be accessed on workload clusters unless additional changes or patches are made.
  - evidence: Tekton Results can only be accessed on workload clusters unless additional changes or patches are made. (citation: konflux-adr-0001 Consequences)

### Cons

- Split visibility between kcp and workload clusters erodes developer trust in debugging, support, and day-2 operations.
- Direct cluster management, bespoke PaC ingress, and mixed deployment methods create more platform surface area than early adoption can justify.
- Fragile: The claim that APIBinding/APIExport was the wrong substrate is vulnerable if real users only needed `PipelineRun` submission and accepted cluster-local debugging.
- Fragile: The one-cluster gateway limitation matters only if PaC traffic and multi-cluster routing were actually important to early customer workflows.

---
