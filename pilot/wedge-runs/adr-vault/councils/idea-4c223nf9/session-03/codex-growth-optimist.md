---
type: council_view
session_id: sess-Hb97j7bW
idea_id: idea-4c223nf9
model: codex
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:0a9a14652df872e107266158c662ef4088c1754686ec72660b4e8618bddc8df5'
failure_reason: null
confidence: 0.61
---
## Revised stance (Pass 2)

Twelve months later, I think this failed not because the ambition was wrong, but because the architecture tried to sell a whole product through a partial substrate. The upside story was strong: make Tekton available as a shared service, let App Studio and HACBS be customer 0, then let more services plug in without each team reinventing CI plumbing. But once real users hit day-2 work, the service likely felt narrower than the vision.

I would still attack `asm-7JioVbM6` directly. The assumption says kcp's APIBinding/APIExport model was the right substrate for Tekton-as-a-service across multiple workload clusters at the scale the team wanted. In the failure scenario, that was false or at least true too early. API publication is not the same thing as a complete product surface, and the ADR itself exposes the gap: `TaskRun` objects do not sync to kcp, PaC-created `PipelineRun` objects are not visible there, and Tekton Results remain on workload clusters. That is how a platform becomes elegant on paper and awkward in use.

My more optimistic read is that there was a real wedge here, but the team industrialized the expansion path before proving the narrow path. Multi-cluster scale, direct cluster management, special ingress for PaC, mixed operator-plus-manifest deployment, and gateway limitations all arrived before there was evidence that customers would tolerate fragmented visibility. A tighter first move could have worked better: explicit single-cluster scope, operator-first deployment, and a product contract centered on complete lifecycle visibility before claiming broad service scale.

So my revised pre-mortem is mostly unchanged: the idea failed because `asm-7JioVbM6` carried too much product weight. I still see the upside and I still think a sequel could win, but this phase likely broke when the substrate scaled control-plane objects faster than it scaled user trust. In CI infrastructure, that trust gap compounds quickly and adoption stalls before the shared-service upside can materialize.

**Confidence:** 0.61

## Self-critique (Pass 2)

Pass 1 was probably too quick to treat substrate mismatch as the single root cause. I leaned hard on architectural coherence and not enough on the possibility that customer 0 may have had a narrow enough workflow that these limitations were acceptable in practice. If users mostly needed to submit `PipelineRun` objects and were comfortable debugging on workload clusters, then my argument overstates the damage.

The strongest counter-argument I did not surface is that APIBinding/APIExport may have been right enough as an enabling layer, and the real failure may have been packaging rather than substrate choice. In that version, the team did not choose the wrong foundation; they just failed to wrap it in a service boundary with strong observability, ingress, and support ergonomics. Evidence of productive multi-team adoption would push me toward that interpretation.

## Initial stance (Pass 1)

Twelve months later, this likely failed because the team correctly spotted a platform opportunity but chose the wrong layer to industrialize first. The core miss is `asm-7JioVbM6`: APIBinding/APIExport looked like a clean substrate for Tekton-as-a-service, but in practice it only exposed part of the product surface. The ADR itself admits the cracks: `TaskRun` objects cannot be synced to kcp, PaC-created `PipelineRun` objects are not visible on kcp, and Tekton Results remain stranded on workload clusters. That means the service promise was "run pipelines anywhere," while the operator reality was "debug, observe, and integrate in several places." Customers usually abandon that kind of split-brain platform quickly.

I would attack `asm-7JioVbM6` directly as the candidate root cause: the substrate optimized for API publication, not end-to-end pipeline ergonomics. A multi-cluster CI service needs consistent execution semantics, observability, ingress, and support boundaries. Here, the architecture bakes in fragmented visibility and even a one-cluster limitation for the gateway path. If the scale thesis was part of the assumption, the design undercut its own future: every new workload cluster increased operational surface area while the user-facing abstraction stayed incomplete.

A second-order failure is that the team may have mistaken "shared service" upside for "shared control plane" readiness. The upside instinct was sound: avoid forking Tekton and create a reusable service for App Studio, HACBS, and future consumers. But Phase 1 seems to have coupled that ambition to direct cluster management, mixed operator-plus-manifest deployment, and special-case ingress plumbing. That is a lot of architecture tax before proving that customers would accept the constrained API shape.

So my pre-mortem is: the idea failed not because Tekton-as-a-service was bad, but because the first version asked kcp's export/binding model to carry product requirements it was not yet good at carrying. A narrower path probably would have won: operator-first deployment, explicit single-cluster scope, and a product contract centered on complete pipeline lifecycle visibility before claiming multi-cluster service scale.

## Key risks

- Split visibility between kcp and workload clusters erodes developer trust in debugging, support, and day-2 operations.
- Direct cluster management, bespoke PaC ingress, and mixed deployment methods create more platform surface area than early adoption can justify.

## Fragile insights

- The claim that APIBinding/APIExport was the wrong substrate is vulnerable if real users only needed `PipelineRun` submission and accepted cluster-local debugging.
- The one-cluster gateway limitation matters only if PaC traffic and multi-cluster routing were actually important to early customer workflows.

## Assumptions cited

- `asm-7JioVbM6`

## Metacognitive reflection

- **Could be wrong if:** I would change my mind if 12 months of evidence showed multiple consumers successfully using the service across more than one workload cluster with low support burden, and if users did not materially suffer from the lack of kcp-level `TaskRun`, PaC, or Tekton Results visibility.
- **Most vulnerable assumption:** `asm-7JioVbM6`
- **Confidence rationale:** Confidence is moderate because the ADR's own stated consequences point to a fragmented service boundary, but I still do not have usage, incident, or adoption evidence showing whether those limitations were fatal or merely inelegant.

## Evidence

- "`TaskRun` objects cannot be synced to kcp, so App Studio and HACBS components may only interact with `PipelineRun` objects directly." — citation: konflux-adr-0001 Consequences
- "PaC-created `PipelineRun` objects are not visible on kcp." — citation: konflux-adr-0001 Consequences
- "The PaC gateway path is limited to one workload cluster and cannot load balance traffic across clusters." — citation: konflux-adr-0001 Consequences
- "Tekton Results can only be accessed on workload clusters unless additional changes or patches are made." — citation: konflux-adr-0001 Consequences
