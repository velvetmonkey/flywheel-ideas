---
type: council_view
session_id: sess-Mnp3Jv58
idea_id: idea-4c223nf9
model: codex
persona: risk-pessimist
persona_name: Risk Pessimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:c2e3c3c3ff5172d8419d7b66e24b9976c6e7701334ab04631afaa379d7a67f2c'
failure_reason: null
confidence: 0.7
---
## Revised stance (Pass 2)

Twelve months later, this most likely failed because the architecture asked one assumption to carry too much weight. asm-7JioVbM6 says kcp's APIBinding/APIExport model was the right substrate for offering Tekton-as-a-service across multiple workload clusters at the planned scale. If that assumption was wrong, the system did not merely suffer implementation pain; it lost the coherence of its control plane. The ADR already describes a design where the user-facing API layer and the execution reality diverge.

Attack on asm-7JioVbM6 directly: the listed consequences read like substrate mismatch, not incidental edge cases. `TaskRun` objects cannot sync to KCP. PaC-created `PipelineRun` objects are not visible on kcp. Tekton Results stay on workload clusters. Ingress is effectively constrained to one workload cluster. That means the supposed shared service cannot provide a complete, consistent story for execution state, triggering, results, and routing as it grows. A platform built on partial truth eventually becomes operationally deceptive.

The operating model makes the failure mode worse. The Pipeline Service team had to directly manage workload clusters, rely partly on the OpenShift Pipelines Operator, partly on raw manifests, and support multiple internal customers while depending on upstream Tekton code that was explicitly hard to make kcp-aware. That is how version skew, upgrade fragility, drift, and incident finger-pointing become normal. Once scale or customer variety increases, every exception stops being local and starts becoming platform debt.

My revised view is slightly narrower than Pass 1: the fact that ADR-0001 was later replaced by ADR-0009 is suggestive, not conclusive, evidence. But the stronger case does not depend on that replacement. The ADR itself documents enough architectural asymmetry to predict failure in day-2 operations. The likely postmortem is that asm-7JioVbM6 was accepted before the team had proven full lifecycle visibility, cross-cluster routing, and sustainable ownership boundaries.

**Confidence:** 0.70

## Self-critique (Pass 2)

Pass 1 leaned too hard on the ADR being replaced and treated that as near-proof of failure. That is an inference, not ground truth. I also blurred the difference between an awkward architecture and a failed one; a bounded phase-one system can survive with known gaps if the load, customer count, and support expectations remain low. The strongest counter-argument I underplayed is that this may have been a deliberately transitional design whose purpose was speed, not long-term elegance.

## Initial stance (Pass 1)

Twelve months later, this failed because it treated asm-7JioVbM6 as an architectural foundation when it was really a scaling hypothesis with poor evidence. APIBinding/APIExport may have looked like a neat service boundary for Tekton-as-a-service, but the ADR already shows the substrate leaking at critical seams. If the control plane cannot faithfully surface the objects, events, and results that users need, then the abstraction is not simplifying the system; it is hiding failure until integration time.

Attack on asm-7JioVbM6 directly: if kcp's APIBinding/APIExport model was not the right substrate for multi-cluster Tekton, then the entire service inherited permanent mismatch. The declared consequences are the warning signs: TaskRuns cannot sync to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results remain on workload clusters, and ingress is effectively limited to one workload cluster. Those are not minor gaps. They mean the platform cannot provide a coherent API, observability story, or routing model as usage grows. At scale, every customer integration becomes a special case and every outage becomes harder to diagnose because the control plane view is incomplete by design.

The operational failure mode is equally straightforward. The team had to directly manage workload clusters, deploy some controllers through the OpenShift Pipelines Operator, deploy others through raw manifests, and do so for multiple internal customers while depending on upstream Tekton that was explicitly hard to make kcp-aware. That creates version skew, upgrade fragility, ownership confusion, and an expanding support surface. In a pessimistic read, Phase 1 did not fail because execution was weak; it failed because the architecture institutionalized exceptions, and replacement by ADR-0009 is exactly the kind of correction you make after discovering the substrate bet was wrong.

## Key risks

- Control-plane truth diverges from workload-cluster reality, leaving execution objects, triggers, and results only partially visible through kcp.
- Direct cluster ownership plus mixed deployment mechanisms creates upgrade skew, drift, and unclear operational ownership across teams.

## Fragile insights

- Supersession by ADR-0009 may reflect architectural failure, but it could also reflect planned maturation rather than a failed outcome.
- The one-workload-cluster ingress limitation is only fatal if actual adoption required meaningful multi-cluster balancing within the first year.

## Assumptions cited

- `asm-7JioVbM6`

## Metacognitive reflection

- **Could be wrong if:** I would change my mind if 12-month outcome evidence showed multiple customers successfully using APIBinding/APIExport-backed Tekton with acceptable SLOs, manageable support load, and documented mitigations for TaskRun visibility, PaC visibility, results access, and ingress constraints.
- **Most vulnerable assumption:** `asm-7JioVbM6`
- **Confidence rationale:** Confidence is moderate because the ADR itself records several structural limitations that plausibly break a multi-cluster service model. Confidence is not higher because I do not have direct outcome data, and replacement by ADR-0009 is only suggestive rather than dispositive.

## Evidence

- "The ADR states that `TaskRun` objects cannot be synced to KCP, limiting direct interaction to `PipelineRun` objects." — citation: konflux-adr-0001, Consequences
- "The ADR states that PaC-created `PipelineRun` objects are not visible on kcp and that gateway traffic is limited to one workload cluster." — citation: konflux-adr-0001, Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001, Consequences
- "The ADR states that workload clusters must be directly managed by the Pipeline Service team rather than relying on generalized compute from CPS." — citation: konflux-adr-0001, Consequences
- "The ADR context states that Tekton libraries are not simple to refactor to be kcp-aware and that upstream acceptance or a fork would be required." — citation: konflux-adr-0001, Context
