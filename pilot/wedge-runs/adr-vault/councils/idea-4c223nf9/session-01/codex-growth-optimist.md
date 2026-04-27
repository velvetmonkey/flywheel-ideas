---
type: council_view
session_id: sess-Mnp3Jv58
idea_id: idea-4c223nf9
model: codex
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:72bdbfcfa6505e696698c91d2f0081c7215f1e8362dd1d7146c2b15565d27aaf'
failure_reason: null
confidence: 0.62
---
## Revised stance (Pass 2)

I still think the instinct behind this ADR was smart: create one Tekton-shaped platform surface so new services can start faster. If this failed 12 months later, I would not read that as proof that shared pipelines were a bad ambition. I would read it as a failure to pick the right abstraction layer soon enough. The team tried to turn a control-plane mechanism into a product boundary, and that usually looks clean before it collides with real workflow edges.

Attack asm-7JioVbM6 directly. If kcp's APIBinding/APIExport model were the right substrate for Tekton-as-a-service at the scale this team hoped to reach, it would preserve the parts of Tekton that matter operationally as more tenants and clusters arrive. The ADR records the opposite: TaskRun objects cannot sync to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results stay on workload clusters, and ingress is limited to one workload cluster. Those are not cosmetic gaps. They cut across debugging, observability, event flow, and multi-cluster traffic, which are exactly the surfaces that get more important as adoption grows.

The more interesting failure mode is that this architecture may have delivered enough value for customer 0 to feel promising while still blocking generalization. Once the Pipeline Service team also had to directly manage workload clusters, the supposed shared substrate stopped reducing coordination and started concentrating bespoke ownership. My optimistic read is that the upside never disappeared; it just needed a thinner, more opinionated service contract around customer outcomes, or an operator-first path earlier, instead of trying to mirror Tekton's native surface through kcp. In that sense, the project likely failed not because the vision lacked upside, but because asm-7JioVbM6 asked the substrate to be both compatibility layer and scale engine, and it was not strong enough to be both.

**Confidence:** 0.62

## Self-critique (Pass 2)

Pass 1 was directionally useful but too quick to make architectural mismatch the whole story. I leaned heavily on the missing surface area in the consequences section and underweighted the possibility that Phase 1 was intentionally narrow and could still have succeeded if consumers mostly needed PipelineRun-level workflows. I also treated replacement by ADR-0009 as suggestive evidence against this path, when supersession can just mean normal iteration. The counter-argument I had not surfaced is that APIBinding/APIExport may have been good enough as a temporary adoption bridge, and the real miss may have been product packaging: no crisp opinionated API, no satisfying cluster-local observability story, and no explicit optimization for a constrained workload profile.

## Initial stance (Pass 1)

I would read this failure as a strong platform instinct routed through the wrong abstraction layer. The upside inside asm-7JioVbM6 was real: a shared Tekton service across clusters could have reduced adoption time for every future service. But 12 months later, the bet likely failed because APIBinding and APIExport delivered a clean control-plane story on top of messy workload-cluster realities. The team bought conceptual elegance and inherited operational fragmentation.

Attack asm-7JioVbM6 directly: if kcp's APIBinding and APIExport model were truly the right substrate at the scale this team wanted, it would preserve the important parts of the product surface. This design explicitly says it does not. TaskRun objects cannot be synced to KCP, PaC-created PipelineRuns are not visible on kcp, Tekton Results stay on workload clusters, and ingress is constrained to one workload cluster. That is exactly how a substrate reveals itself as wrong for the job: the more you scale it, the more missing edges turn into product defects.

My optimistic read is that the vision still had legs, but Phase 1 probably tried to make Tekton fit kcp before defining a thinner, more opinionated service boundary around the user outcome. Once the Pipeline Service team also had to directly manage workload clusters, the supposed shared substrate stopped compounding and started accumulating bespoke ownership. Twelve months later, adoption likely plateaued, customer 0 exceptions became the roadmap, and the replacement ADR won because this path could not turn special cases into a scalable default.

## Key risks

- The chosen kcp substrate preserved API shape but dropped user-critical pipeline behaviors like TaskRun visibility, Results access, and PaC visibility.
- Direct ownership of workload clusters turned a reusable platform bet into an operationally bespoke service that became harder to generalize with each customer.

## Fragile insights

- If most real consumers only needed PipelineRun-level execution and accepted cluster-local debugging, my argument that the substrate was wrong weakens substantially.
- ADR-0009 superseding this design may reflect planned maturation rather than proof that asm-7JioVbM6 was fundamentally flawed.

## Assumptions cited

- `asm-7JioVbM6`

## Metacognitive reflection

- **Could be wrong if:** I would change my mind if later evidence showed that multiple services onboarded successfully across multiple workload clusters, customers were satisfied with a PipelineRun-only surface, cluster-local Results and TaskRun access did not materially hurt debugging or adoption, and direct cluster ownership remained operationally light.
- **Most vulnerable assumption:** `asm-7JioVbM6`
- **Confidence rationale:** Moderate confidence because the failure story is grounded in explicit limitations documented by the ADR itself, but lower than Pass 1 because those limitations prove friction, not necessarily fatality, under a narrower product scope.

## Evidence

- "The ADR says TaskRun objects cannot be synced to KCP and App Studio and HACBS components may only interact with PipelineRun objects directly." — citation: konflux-adr-0001, Consequences
- "The ADR says PaC-created PipelineRun objects are not visible on kcp." — citation: konflux-adr-0001, Consequences
- "The ADR says ingress is limited to one workload cluster because the gateway cannot load balance traffic across clusters." — citation: konflux-adr-0001, Consequences
- "The ADR says Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001, Consequences
- "The ADR says workload clusters for Pipeline Service need to be directly managed by the Pipeline Service team and cannot rely on general compute as a service from CPS." — citation: konflux-adr-0001, Consequences
- "The ADR context says making Tekton kcp-aware would require upstream acceptance or a Tekton fork with local patches." — citation: konflux-adr-0001, Context
