---
type: council_view
session_id: sess-g7LjRL1E
idea_id: idea-4c223nf9
model: codex
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:a39aa3e7cdd426ebf6e64e5dfbbb3c8b8cb29b0204a9897318c687a1c5c845db'
failure_reason: null
confidence: 0.62
---
## Revised stance (Pass 2)

Twelve months later, I still think the failure centered on asm-7JioVbM6. The upside thesis was attractive: use kcp's APIBinding/APIExport model to expose Tekton once, then let many services attach across workload clusters without each team rebuilding the stack. But that only compounds if the substrate feels like a complete service boundary. Here it likely did not. The control API lived in kcp while too much operational truth stayed on workload clusters, so the thing meant to simplify growth probably multiplied places users had to look.

Attacking asm-7JioVbM6 directly: being able to project Tekton APIs through kcp was not the same as having the right substrate for Tekton-as-a-service at the team's intended scale. The ADR already documents the fracture lines: TaskRuns could not sync to kcp, Tekton Results stayed cluster-local, PaC-triggered PipelineRuns were not visible on kcp, and PaC ingress was limited to one workload cluster. That turns a multi-cluster platform story into a partial abstraction. Customer 0 might tolerate that; later adopters usually do not reward partial abstractions.

I still see a positive alternate path. A narrower operator-led service with strong end-to-end visibility could have proven demand first and layered kcp federation later. In the failure timeline, the team likely reached for elegant platform generality before the product loop was stable. Once asm-7JioVbM6 bent, the rest of the design choices stopped looking like pragmatic bridge steps and started looking like evidence that Phase 1 had chosen the wrong center of gravity.

**Confidence:** 0.62

## Self-critique (Pass 2)

Pass 1 probably overstated how automatically fatal the split between kcp and workload clusters would be. Internal platform teams sometimes succeed with awkward internals if they dramatically reduce onboarding or standardize governance, and I did not have adoption, support, or incident data to prove that this abstraction actually repelled users. The counter-argument I underplayed is that Phase 1 may have been intentionally transitional: if customer 0 mostly needed PipelineRun submission and not full kcp-native observability, then these limitations could have been acceptable stepping stones rather than proof that the substrate was wrong. I also leaned on the fact that the ADR was later replaced, which is suggestive but not dispositive.

## Initial stance (Pass 1)

Twelve months later, I think this failed because the team optimized for future platform leverage before proving that kcp's APIBinding/APIExport model could behave like a clean product surface for Tekton. Assumption asm-7JioVbM6 was supposed to turn Pipeline Service into a shared growth engine across many workload clusters. Instead, it likely produced a split-brain experience: APIs appeared in kcp, but the most operationally important artifacts and behaviors still lived on workload clusters. That is a bad substrate for a service that needs to feel simple, composable, and immediately useful to new internal customers.

Once asm-7JioVbM6 cracked, the rest of the design probably amplified the failure. The ADR already admits that TaskRuns could not be synced to kcp, Tekton Results stayed on workload clusters, and PaC-triggered PipelineRuns were not visible on kcp. So the promised Tekton-as-a-service abstraction was incomplete on day one. Customer 0 may have tolerated that because they were motivated, but follow-on teams likely saw an awkward product boundary: control plane in one place, debugging and observability in another, ingress special-casing for PaC, and direct cluster management by the Pipeline Service team instead of generic compute. That kind of substrate does not compound adoption; it taxes every new adopter.

The optimistic read is that there was still a real opportunity here, just on a different path. If the team had treated kcp as an integration layer rather than the core tenancy and API substrate for multi-cluster Tekton, they might have shipped a narrower operator-led service with stronger end-to-end visibility and then expanded. In the failure scenario, they likely reached for platform-generalization too early, and asm-7JioVbM6 turned out to be the load-bearing mistake: the model looked elegant for scale, but it could not carry the lived developer experience required for scale.

## Key risks

- The kcp APIBinding/APIExport layer created a product surface that was too incomplete for teams beyond customer 0, depressing adoption and increasing support load.
- Direct workload-cluster ownership, cluster-local results, and PaC special-casing erased the expected leverage of a shared multi-cluster service.

## Fragile insights

- My claim that the split control-plane/data-plane experience doomed the service is fragile if most consumers only needed PipelineRun submission and were comfortable doing debugging on workload clusters.

## Assumptions cited

- `asm-7JioVbM6`

## Metacognitive reflection

- **Could be wrong if:** I would change my mind if 6-12 months of outcome data showed multiple non-App Studio teams adopted the service through APIBinding with low support burden, acceptable incident rates, and most day-to-day pipeline operations stayed coherent despite the listed kcp/workload-cluster split.
- **Most vulnerable assumption:** `asm-7JioVbM6`
- **Confidence rationale:** The ADR itself documents enough architectural seams to make this failure story plausible, especially around visibility and multi-cluster behavior. Confidence stays moderate, not high, because I am inferring outcomes from design consequences rather than from actual adoption, reliability, or operator-effort data.

## Evidence

- "The ADR positions kcp APIBinding/APIExport as the user-facing way other services would execute PipelineRuns and access Tekton APIs." — citation: konflux-adr-0001 §Decision, §Consequences
- "The ADR states that TaskRun objects cannot be synced to kcp, so App Studio and HACBS components may only interact with PipelineRun objects directly." — citation: konflux-adr-0001 §Consequences
- "The ADR says workload clusters for Pipeline Service must be directly managed by the Pipeline Service team rather than relying on general compute from CPS." — citation: konflux-adr-0001 §Consequences
- "The ADR records that PaC needs separate ingress, PaC-created PipelineRuns are not visible on kcp, and the gateway is limited to one workload cluster." — citation: konflux-adr-0001 §Consequences
- "The ADR records that Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 §Consequences
