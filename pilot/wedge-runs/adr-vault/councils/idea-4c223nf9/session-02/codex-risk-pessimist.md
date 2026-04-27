---
type: council_view
session_id: sess-g7LjRL1E
idea_id: idea-4c223nf9
model: codex
persona: risk-pessimist
persona_name: Risk Pessimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:b47801ecb1f954c6370752427856068e235a2cf8f35f19b11d965e9010588f75'
failure_reason: null
confidence: 0.68
---
## Revised stance (Pass 2)

Twelve months later, I would blame failure first on asm-7JioVbM6. APIBinding/APIExport was assumed to be the right substrate for Tekton-as-a-service across a growing set of workload clusters, but the ADR itself describes an architecture where the important execution truth never becomes global. `TaskRun` cannot sync to kcp, Tekton Results stay on workload clusters, and PaC-created `PipelineRun`s are invisible in kcp. That is not a stable substrate; it is a partial facade that trains users to expect abstraction and then forces them back into cluster-local reality during incidents.

The second break is scale economics. The service team had to manage workload clusters directly, could not lean on CPS, and had to mix operator-managed deployment with direct manifests. That means every new cluster adds drift risk, upgrade choreography, and more recovery paths to test. A substrate that is supposed to improve with more consumers instead accumulates bespoke operational debt per cluster.

The multi-cluster story is especially weak. The ADR accepts separate ingress plumbing for PaC through kcp GLBC, acknowledges that PaC gatewaying is limited to one workload cluster, and leaves observability fragmented. I would expect onboarding beyond asm-7JioVbM6's implied growth case to stall because the platform promise and the user experience diverge: consumers bind once in kcp, but the moment something subtle fails they need service-team intervention and cluster-specific knowledge.

My attack on asm-7JioVbM6 is direct: if APIBinding/APIExport were the right growth substrate, the declared consequences would trend toward uniformity, portability, and lower marginal toil. Instead they advertise exceptions, locality leaks, and ownership concentration. The likely failure mode is not dramatic technical collapse; it is slower and worse: rising ops burden, weak debuggability, constrained multi-cluster expansion, and eventual replacement by a model that puts control nearer to where Tekton actually runs.

**Confidence:** 0.68

## Self-critique (Pass 2)

Pass 1 leaned too hard on architectural purity and may have overstated how fatal the locality leaks were. If most consumers only needed `PipelineRun` submission plus coarse status, then missing `TaskRun` sync and cluster-local Results might have been tolerable for a phase-1 service. I also underplayed the strongest counter-argument: avoiding a deep Tekton fork or risky upstream kcp-aware refactor may have been the least-bad option, even if the resulting platform was awkward.

## Initial stance (Pass 1)

Twelve months later, this failed because the core bet in asm-7JioVbM6 was wrong. APIBinding/APIExport was treated as if exposing Tekton APIs through kcp would be equivalent to providing Tekton as a service, but the architecture never achieved that equivalence. The control-plane objects lived in kcp while critical execution reality stayed trapped on workload clusters: `TaskRun` could not sync, Tekton Results stayed cluster-local, and PaC-created `PipelineRun`s were invisible in kcp. That is not a platform substrate; it is a leaky facade. Users got an API that implied global visibility and multi-cluster abstraction, then discovered the important debugging, status, and automation paths still required cluster-specific knowledge.

The second failure mode is operational. The ADR says the Pipeline Service team had to directly manage workload clusters rather than rely on CPS, had to combine Operator-managed Tekton with extra direct manifests, and had to add separate ingress plumbing for PaC through kcp GLBC. That stack is brittle before scale and worse after scale. Every new workload cluster would multiply upgrade choreography, config drift, incident surface area, and ownership burden. The architecture also admitted a one-workload-cluster limit for PaC gatewaying, which directly undermines the assumption that this substrate was right for growth across multiple workload clusters.

I would attack asm-7JioVbM6 explicitly: if APIBinding/APIExport were the right substrate, the service should have become simpler and more uniform as adoption increased. Instead, every declared consequence points toward more exceptions, more locality leaks, and more bespoke platform management. Customer 0 may have tolerated that because they were close to the builders; broader consumers would not. The likely end state is predictable: poor operability, weak debuggability, stalled multi-cluster expansion, and replacement by a model that puts control closer to where Tekton actually runs.

## Key risks

- The kcp-facing API hides cluster-local behavior poorly, creating a support-heavy platform that fails exactly when users need end-to-end visibility.
- Direct per-cluster ownership plus mixed operator/manifests deployment causes upgrade drift, incident amplification, and weak multi-cluster economics.

## Fragile insights

- The case assumes consumers needed global visibility into `TaskRun`, Results, and PaC-created `PipelineRun`s rather than only `PipelineRun` submission and coarse status.
- The claim that one-workload-cluster PaC gatewaying blocks growth assumes PaC was central to adoption rather than a temporary edge path.

## Assumptions cited

- `asm-7JioVbM6`

## Metacognitive reflection

- **Could be wrong if:** I would change my mind if 12 months of operating data showed that multiple workload clusters were added with low incident growth, most consumers succeeded with `PipelineRun`-level workflows without needing `TaskRun` or Results visibility in kcp, and support volume did not concentrate on cluster-local debugging or PaC routing.
- **Most vulnerable assumption:** `asm-7JioVbM6`
- **Confidence rationale:** Confidence is moderate because the ADR itself lists the abstraction leaks and scale constraints that drive this failure story, but I am still extrapolating from design consequences rather than from outcome data.

## Evidence

- "The ADR states that `TaskRun` objects cannot be synced to KCP and App Studio and HACBS components may only interact with `PipelineRun` objects directly." — konflux-adr-0001, Consequences
- "The ADR states that workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team and cannot rely on CPS." — konflux-adr-0001, Consequences
- "The ADR uses the OpenShift Pipelines Operator where possible and direct manifests otherwise." — konflux-adr-0001, Decision
- "The ADR states that PaC needs separate ingress and service configuration on KCP, that PaC-created `PipelineRun` objects are not visible on kcp, and that the gateway is limited to one workload cluster." — konflux-adr-0001, Consequences
- "The ADR states that Tekton Results can only be accessed on workload clusters without additional changes or patches." — konflux-adr-0001, Consequences
