---
type: council_view
session_id: sess-BDC7CHSv
idea_id: idea-4c223nf9
model: codex
persona: risk-pessimist
persona_name: Risk Pessimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:2ab408b551c655329dda576cb338988eafbb8dcffa5b2b9b3fab6f71e25352f0'
failure_reason: null
confidence: 0.66
---
## Revised stance (Pass 2)

Twelve months later, this failed because asm-7JioVbM6 was false. kcp's APIBinding/APIExport model was not the right substrate for offering Tekton-as-a-service across multiple workload clusters at the scale implied here. The ADR itself describes a service surface that is already fractured: other services can use Tekton APIs in kcp, but TaskRuns cannot sync there, Tekton Results remain on workload clusters, and PaC-created PipelineRuns are not visible in kcp. That is not a clean platform contract; it is a split-brain control plane with missing state.

The multi-cluster claim was especially weak. asm-7JioVbM6 assumes this substrate can carry growth across multiple workload clusters, yet the consequences section admits PaC ingress is limited to one workload cluster because the gateway cannot load balance across clusters. That is a direct attack on the assumption, not a side note. Once usage grew, failover, routing, tenancy isolation, and capacity management would have become custom exceptions rather than properties of the platform.

Operations likely finished the failure. The ADR states workload clusters had to be directly managed by the Pipeline Service team instead of consumed as generic compute from CPS. That converts a reusable service into a fleet-management obligation. Combine that with a hybrid deployment model, using the OpenShift Pipelines Operator where possible and raw manifests otherwise, and the likely result is drift, painful upgrades, and slow cross-plane debugging under load.

My revised view is narrower than Pass 1 on one point: I cannot prove from the ADR alone that these seams became outages rather than merely ugly constraints. The unaddressed counter-argument is that Phase 1 may have been a deliberately temporary bridge. Even so, if we assume failure twelve months later, the most plausible story is still that asm-7JioVbM6 failed under real adoption pressure because the chosen substrate never delivered a coherent, scalable, multi-cluster service boundary.

**Confidence:** 0.66

## Self-critique (Pass 2)

Pass 1 was directionally strong but too linear. I treated every documented limitation as if it necessarily converted into production failure, when some may have remained tolerable if adoption stayed modest. I also underplayed the strongest counter-argument: this could have been an intentionally short-lived bridge architecture, so later replacement would not itself prove failure. My weakest move was inferring operational collapse without incident data, onboarding counts, or the rationale in ADR-0009.

## Initial stance (Pass 1)

Twelve months later, this failed because the core premise in asm-7JioVbM6 was wrong: kcp's APIBinding/APIExport model was not a stable substrate for Tekton-as-a-service at the operational scale implied by the decision. The design never really produced one coherent service surface. Instead it split control and observability across kcp and workload clusters, so the user-facing API lived in one place while critical execution state, results, ingress behavior, and some controller realities lived somewhere else. That is not scale; that is abstraction debt.

The failure mode was predictable. Every limitation in the consequences section became a production tax: `TaskRun` objects could not sync to kcp, Tekton Results stayed marooned on workload clusters, PaC needed bespoke ingress forwarding, and the gateway could not balance across clusters. Those are not edge cases. They are the exact seams operators and customers hit first when adoption rises. As more teams tried to use the service, the platform likely accumulated brittle exceptions, partial visibility, and support escalations because the substrate could not present a complete, cluster-agnostic contract.

The operational model then finished the job. The ADR explicitly says workload clusters had to be directly managed by the Pipeline Service team rather than consumed as generic compute from CPS. That converts a supposedly reusable platform layer into a team-owned fleet burden. Once growth arrived, onboarding new clusters, keeping controllers aligned, mixing operator-managed and manifest-managed components, and debugging cross-plane behavior likely drove reliability down and change velocity with it. A service that requires bespoke cluster ownership to simulate centralization usually collapses under its own operational surface area.

## Key risks

- The service boundary is split between kcp and workload clusters, so operators and customers lose a single authoritative view of execution state.
- PaC traffic is funneled through a one-workload-cluster ingress path, creating a scale and availability bottleneck against the stated multi-cluster ambition.
- Direct ownership of workload clusters by the Pipeline Service team turns growth into an operational headcount problem.
- Mixing operator-managed and manifest-managed Tekton components increases configuration drift and upgrade regression risk.

## Fragile insights

- The one-cluster PaC limitation is only decisive if PaC adoption and multi-cluster demand actually grow materially within the twelve-month window.
- Direct cluster management only becomes a fatal burden if CPS or adjacent platform abstractions do not mature quickly enough to absorb that ownership cost.

## Assumptions cited

- `asm-7JioVbM6`

## Metacognitive reflection

- **Could be wrong if:** I would revise downward if production evidence showed multiple workload clusters were onboarded successfully, PaC demand stayed within the one-cluster limit without incident, support load remained low despite cluster-local TaskRuns and Results, and ADR-0009 replaced this design mainly for simplification or governance rather than because Phase 1 was failing.
- **Most vulnerable assumption:** `asm-7JioVbM6`
- **Confidence rationale:** Confidence is moderate because the ADR itself documents structural constraints that cut directly against the scaling assumption. Confidence is not high because I do not have incident data, adoption numbers, team capacity data, or the contents of ADR-0009 to distinguish awkward-but-viable from genuinely failing.

## Evidence

- "The ADR says other services use an APIBinding to execute PipelineRuns in kcp, but TaskRun objects cannot be synced to kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says Tekton Results can only be accessed on workload clusters and would require additional changes or patches to be accessible from kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says PaC needs separate ingress forwarding on kcp and is limited to one workload cluster because the gateway cannot load balance across clusters." — citation: konflux-adr-0001, Consequences
- "The ADR says workload clusters need to be directly managed by the Pipeline Service team and cannot rely on generic compute from CPS." — citation: konflux-adr-0001, Consequences
- "The decision is marked Replaced and superseded by ADR-0009." — citation: konflux-adr-0001, Status/Metadata
