---
type: argument_map
session_id: sess-tN8Pe4dW
generated_at: '2026-04-27T00:22:07.334Z'
---
# Argument map — session sess-tN8Pe4dW

**Idea:** konflux-adr-0028 — ADR 28. Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture)
**Generated:** 2026-04-27T00:22:07.334Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-mywnYLiL

### Claim

Pass 1 was confident but overfit to worst-case assumptions. The core risk—that 5 minutes is an arbitrary guess, not data-driven—is solid. But I conflated three distinct failure modes (timeout too short, team cranks it, RHTAP-1530 never closes) without acknowledging ADR-32 explicitly supersedes this. The honest pre-mortem: if this failed after 12 months, it's more likely the timeout threshold was adjusted reactively (masking the underlying design flaw) rather than cleaned up by the intended fix. The load-bearing assumption crumbles if: (a) real provisioning time distribution is heavy-tailed (20%+ >10m), in which case 5m catches false positives regardless of monitoring, or (b) environment failures are so common that aggressive cleanup is justified even with collateral SEB loss. But I have no data on either. The decision's real sin is coupling error-detection (ErrorOccurred condition) to cleanup timing without a decoupled circuit-breaker or admission-control layer. That stays true whether the timeout was 5m or 15m.

### Pros

- ADR explicitly marked as superseded by ADR-32, suggesting follow-up was tracked
  - evidence: ADR explicitly marked as superseded by ADR-32, suggesting follow-up was tracked (konflux-adr-0028 header (superseded_by: [0032]))
- Decision acknowledges this is a stopgap pending RHTAP-1530, not a permanent solution
  - evidence: Decision acknowledges this is a stopgap pending RHTAP-1530, not a permanent solution (ADR footnote: 'stopgap measure' + 'generic solution being designed')
- Timeout threshold exposed as a configuration knob (pull-request adjustable), creating an escape hatch
  - evidence: Timeout threshold exposed as a configuration knob (pull-request adjustable), creating an escape hatch (Consequence section: 'timeout threshold can be adjusted via pull request')

### Cons

- 5-minute timeout is empirically unjustified: no data on real provisioning time distribution; may be too short for legitimate environments or too long to prevent cluster overload
- Stopgap patches calcify: RHTAP-1530 may have been deprioritized; team may have adjusted timeout to 15m/30m as escape hatch instead of implementing real solution
- Cleanup on timeout destroys reconciliation idempotency: erroneous SEB deletion breaks assumptions of GitOps recovery, requiring manual intervention to re-trigger provisioning
- Two separate concerns (error detection + cleanup eligibility) bundled in one condition with one knob: no way to tighten error detection without loosening cleanup tolerance
- Fragile: Assuming 5m covers 'slow' provisioning without seeing the distribution—could be median 40s, could be p99 15m
- Fragile: Assuming RHTAP-1530 was never completed—ADR-32 exists as supersession, but I don't know if it actually replaced this logic or just added parallel error handling
- Fragile: Assuming monitoring didn't exist or wasn't used—Red Hat teams typically instrument this; if they DID track erroneous cleanups, Pass 1 stance collapses
- Fragile: Assuming erroneous SEB cleanup causes cascade failures—transient Kubernetes failures usually self-heal in next reconciliation cycle

---

## claim-002 — risk-pessimist

**Confidence:** 0.90
**Source view(s):** view-9ycXRuy7

### Claim

The reliance on a simplistic 5-minute timeout for SnapshotEnvironmentBindings with an unresolved 'ErrorOccurred' condition was, predictably, a catastrophic misjudgment. This heuristic fundamentally failed to strike the required balance, leading to a cascade of failures. Either environments were provisioned far slower than the arbitrary 5-minute window, leading to resource exhaustion before cleanup could even be considered, or the 'ErrorOccurred' flag was too volatile, incorrectly triggering premature termination of services that might have eventually stabilized. The core fallacy was believing that a fixed time threshold could reliably manage the inherent variability and transient nature of cloud provisioning and error states. This led to an unstable system, failed deployments, and an overloaded cluster, proving the stopgap measure was more of a ticking time bomb.

Furthermore, the decision to classify SEBs with a 'true' ErrorOccurred condition and a LastUpdateTime of more than five minutes as 'unrecoverable' was an oversimplification of a complex problem. The 'unrecoverable' state is a nuanced judgment, not a simple time-based calculation. This attempt to automate cleanup without a more sophisticated understanding of provisioning states or error root causes was doomed to create more problems than it solved, especially given the footnote acknowledging it was a stopgap while a 'generic solution' was designed. The fact that it was superseded by ADR 32 directly attests to its inadequacy as a long-term solution, highlighting its fundamental flaws in execution and underlying assumption.

### Pros

- ADR 28 was superseded by ADR 32, indicating the implemented solution was not viable long-term.
  - evidence: ADR 28 was superseded by ADR 32, indicating the implemented solution was not viable long-term. (konflux-adr-0028.md)
- The decision was a 'stopgap measure' to avoid permanently stuck integration tests, implying it was not a robust solution.
  - evidence: The decision was a 'stopgap measure' to avoid permanently stuck integration tests, implying it was not a robust solution. (konflux-adr-0028.md (Footnotes))
- The ADR aimed to address the problem of determining if an SEB is stuck in an unrecoverable state to avoid cluster overload.
  - evidence: The ADR aimed to address the problem of determining if an SEB is stuck in an unrecoverable state to avoid cluster overload. (konflux-adr-0028.md (Context))
- The ADR explicitly describes the heuristic: 'true' ErrorOccurred condition and LastUpdateTime > 5 minutes.
  - evidence: The ADR explicitly describes the heuristic: 'true' ErrorOccurred condition and LastUpdateTime > 5 minutes. (konflux-adr-0028.md (Decision))

### Cons

- Erroneous cleanup of legitimate slow-provisioning environments leading to incomplete deployments and wasted effort.
- Failure to prevent cluster overload if environments provision slower than 5 minutes but never trigger the 'ErrorOccurred' condition, or if the condition is unreliable.
- Cascading failures due to the instability introduced by prematurely terminated or incorrectly cleaned-up SEBs.
- Fragile: A fixed 5-minute timeout can effectively balance cluster overload prevention against premature cleanup of slow environments.
- Fragile: The 'ErrorOccurred' condition reliably indicates an unrecoverable state for SnapshotEnvironmentBindings after a short period.

---

## claim-003 — risk-pessimist

**Confidence:** 0.69
**Source view(s):** view-wAwX1spD

### Claim

Against `asm-pWDNprSX`, the failure begins with misclassification. The ADR defines `ErrorOccurred` as `true` by default and only flips it to `false` when the environment becomes available. That means the cleanup policy used a nominal error flag to represent ordinary in-progress state, then treated five minutes of elapsed time as proof of irrecoverability. Twelve months later, that is the kind of shortcut that becomes a chronic reliability bug, not a guardrail.

The likely visible failure was false-positive cleanup of slow but healthy SnapshotEnvironmentBindings. Under normal variance, control-plane lag, noisy neighbors, or backend slowness, valid environments would cross the five-minute line and get deleted before readiness. Integration tests would look flaky, operators would lose trust in the signal, and incident triage would get harder because the controller itself kept destroying evidence of what actually went wrong.

`asm-pWDNprSX` also fails in the opposite direction. Once teams noticed valid environments being culled, the only remedy the ADR offers is changing the threshold by pull request. Raise the timeout and stuck SEBs accumulate again, reviving the original overload concern; lower it and you intensify false cleanups. A single static timeout was too brittle for heterogeneous provisioning paths and changing conditions, especially in a controller that makes destructive decisions.

The pessimistic conclusion is that this ADR encoded uncertainty as deletion policy. Even as a stopgap, it likely generated toil, threshold churn, and unclear accountability until a better design replaced it. If this idea failed after a year, the postmortem would probably say the team never had a real stuck-state detector, only a timer attached to an ambiguous condition.

### Pros

- The ADR says the `ErrorOccurred` condition is set to `true` by default and only set to `false` when the environment becomes available.
  - evidence: The ADR says the `ErrorOccurred` condition is set to `true` by default and only set to `false` when the environment becomes available. (citation: user-provided ADR 28 Decision section)
- The ADR says SEBs with `ErrorOccurred=true` and `LastUpdateTime` older than five minutes are considered unrecoverable and can be cleaned up.
  - evidence: The ADR says SEBs with `ErrorOccurred=true` and `LastUpdateTime` older than five minutes are considered unrecoverable and can be cleaned up. (citation: user-provided ADR 28 Decision section)
- The ADR explicitly warns that environments taking a long time to provision may be cleaned up erroneously and says the timeout must be adjusted via a pull request to the integration service.
  - evidence: The ADR explicitly warns that environments taking a long time to provision may be cleaned up erroneously and says the timeout must be adjusted via a pull request to the integration service. (citation: user-provided ADR 28 Consequence section)
- The ADR describes the change as a stopgap until a generic solution for detecting provisioning errors is designed.
  - evidence: The ADR describes the change as a stopgap until a generic solution for detecting provisioning errors is designed. (citation: user-provided ADR 28 Footnotes section)

### Cons

- Healthy but slow-provisioning SEBs are deleted as unrecoverable because `ErrorOccurred=true` is the default until readiness, making the five-minute cutoff a false-positive generator.
- Threshold tuning becomes operational whiplash: increasing the timeout revives SEB accumulation and cluster pressure, while decreasing it increases flaky cleanup and obscures real failure signals.
- Fragile: Cleanup churn may have worsened overall load rather than reduced it, but that depends on whether deleted SEBs were automatically recreated or otherwise retried at scale.
- Fragile: The fact that ADR 28 was superseded suggests recognized fragility, but supersession alone does not prove that this specific heuristic caused major production harm.

---

## claim-004 — growth-optimist

**Confidence:** 0.38
**Source view(s):** view-oGB2fxyv

### Claim

I overconfidently posited a specific failure narrative in Pass 1 without adequate evidence. The decision is marked 'Superseded,' not 'Failed,' which is weaker evidence of wrongness. If I'm honest: I don't know whether the 5-minute timeout worked or failed in practice. I pattern-matched 'stopgap' to 'eventually regretted' without data. The real failure modes are probably more architectural: either (a) the ErrorOccurred condition-setting logic was unreliable—SEBs got stuck but the condition wasn't set, so cleanup never fired—or (b) the timeout was never validated empirically, and as the system scaled or provisioning patterns changed, it became stale. The team's move to ADR 32 (decoupling deployment) suggests the root cause was deeper than a cleanup timeout. A stuck SEB is a symptom of either broken observability (can't tell if it's stuck) or broken architecture (SEBs shouldn't be ephemeral load-bearing objects in the first place). Graduating the timeout from 5 to 1/3/5 minutes wouldn't have solved either. The decision was honest about being a stopgap, which is good discipline, but it never became an observability checkpoint. That's the real loss: no metrics on whether cleanup-by-timeout actually prevented cluster overload, how many false positives occurred, or what the actual SEB provisioning-time distribution was. Without those metrics, the team couldn't have confidently kept or refined the heuristic—they had to move on to ADR 32. So: the decision may have been adequate (holding the line), or it may have been silently broken (false positives, undetected overload). I can't tell, and that uncertainty reflects the decision's core vulnerability.

### Pros

- Decision explicitly marked as stopgap pending RHTAP-1530, indicating team intended to replace it
  - evidence: Decision explicitly marked as stopgap pending RHTAP-1530, indicating team intended to replace it (konflux-adr-0028 text: 'stopgap measure to avoid permanently stuck integration tests while a generic solution for detecting provisioning errors is designed')
- Decision was superseded by ADR 32, not marked as failed—suggests working-as-intended transition rather than emergency fix
  - evidence: Decision was superseded by ADR 32, not marked as failed—suggests working-as-intended transition rather than emergency fix (konflux-adr-0028 status field: 'Superseded by [0032]')
- ADR 32 is titled 'Decoupling Deployment,' suggesting root cause was architectural, not operational timeout
  - evidence: ADR 32 is titled 'Decoupling Deployment,' suggesting root cause was architectural, not operational timeout (konflux-adr-0028 superseded_by metadata points to architectural refactor)

### Cons

- ErrorOccurred condition-setting logic was unreliable or missed entire classes of stuck SEBs, rendering the cleanup logic moot
- 5-minute timeout became stale as provisioning patterns changed, causing either cascading false-positive cleanup or insufficient cleanup (cluster still overloaded)
- Timeout heuristic was adequate but the real problem was architectural (SEBs shouldn't be ephemeral), making the decision irrelevant to actual failure
- Fragile: Assuming the 'stopgap' framing means the team intended to replace it—they may have simply forgotten and moved on (worse outcome: silent technical debt)
- Fragile: Assuming cluster overload by stuck SEBs was actually happening—it may have been theoretical or rare
- Fragile: Assuming the timeout value could be correct if just observed—the real issue may be that a single fixed threshold can't work across heterogeneous provisioning times (AWS, GCP, on-prem)

---

## claim-005 — growth-optimist

**Confidence:** 0.74
**Source view(s):** view-xxWGGF7a

### Claim

Twelve months later, this failed because the team bet that [asm-pWDNprSX] could do more than a stopgap heuristic should ever be asked to do. The 5-minute rule looked wonderfully clean: one threshold, one controller behavior, one obvious way to keep the cluster from filling with dead SEBs. The upside case was real, but the failure mode is that simplicity substituted for diagnosis. Slow provisioning, transient control-plane lag, quota contention, and genuinely unrecoverable SEBs were all compressed into the same operational signal.

That is the explicit assumption attack on [asm-pWDNprSX]: the "right heuristic" was not right across time, cluster states, or environment classes. In one regime, five minutes was too slow and allowed overload pressure to accumulate; in another, it was too fast and repeatedly deleted SEBs that would have recovered. A fixed timeout was doing adaptive policy work, so the system oscillated between waste and premature cleanup. The result was not just isolated false positives, but a credibility problem: users stopped trusting whether failed bindings were truly broken or merely impatiently culled.

The more interesting failure is organizational. Because the ADR openly labeled this as a stopgap, the team likely expected to replace it soon and therefore underinvested in telemetry, segmentation, and feedback loops around the rule. That left a narrow but dangerous path where the workaround became the operating model. The growth-positive alternative was available all along: use the heuristic as a temporary pressure valve while instrumenting environment-specific provisioning baselines and richer error classification. Failure, twelve months later, means the bridge never connected to the better road.

### Pros

- The ADR defines cleanup by treating SEBs with ErrorOccurred=true and LastUpdateTime older than five minutes as unrecoverable.
  - evidence: The ADR defines cleanup by treating SEBs with ErrorOccurred=true and LastUpdateTime older than five minutes as unrecoverable. (citation: konflux-adr-0028, Decision section provided in prompt)
- The ADR itself acknowledges a false-positive risk: environments that take a long time to provision may be cleaned up erroneously.
  - evidence: The ADR itself acknowledges a false-positive risk: environments that take a long time to provision may be cleaned up erroneously. (citation: konflux-adr-0028, Consequence section provided in prompt)
- The ADR frames the mechanism as a stopgap pending a generic solution for provisioning-error detection.
  - evidence: The ADR frames the mechanism as a stopgap pending a generic solution for provisioning-error detection. (citation: konflux-adr-0028, Footnotes section provided in prompt)
- The decision was later superseded by ADR 32, which weakens any claim that this rule was intended as a durable end-state.
  - evidence: The decision was later superseded by ADR 32, which weakens any claim that this rule was intended as a durable end-state. (citation: konflux-adr-0028 metadata and Status section provided in prompt)

### Cons

- A fixed 5-minute timeout creates false-positive cleanup loops during slow-but-healthy provisioning periods.
- A temporary heuristic becomes de facto permanent behavior, blocking investment in richer error detection and adaptive policy.
- Fragile: The strongest part of this critique depends on provisioning latency actually varying materially across environments and load conditions.
- Fragile: The institutionalization failure only holds if ADR 32 or related follow-on work did not retire this stopgap quickly enough.

---

## claim-006 — growth-optimist

**Confidence:** 0.85
**Source view(s):** view-BJLSPgek

### Claim

From a Growth Optimist perspective, ADR 28's 5-minute timeout on SnapshotEnvironmentBindings represents a pivotal moment where we prioritized containment over cultivation. The intent was to avoid immediate cluster overload, a valid concern, but the chosen heuristic was a blunt instrument that stifled the very innovation we ought to be fostering. It fundamentally underestimated the legitimate, albeit longer, provisioning times required by ambitious and complex environments. By assuming 'slow' was inherently 'erroneous,' we prematurely pruned potential growth, mistaking a temporary bottleneck for a permanent failure. This rigid approach failed to recognize that true scalability isn't just about managing current load, but about enabling future ambition. We should have been architecting for *adaptability* and *elasticity* in provisioning, allowing for genuine, time-intensive deployments to mature, rather than cutting them down with a five-minute guillotine.

This approach fundamentally underestimated the evolving nature of our infrastructure and the increasing sophistication of the applications it would host. The ADR's consequence—that environments taking longer to provision might be cleaned up erroneously—is the smoking gun. This wasn't just a bug; it was a symptom of a design philosophy that favored the known and predictable over the uncertain but potentially groundbreaking. We need to champion solutions that allow for the *scalability of ambition*, not just the *scalability of load*.

### Pros

- The heuristic was a stopgap measure and not a permanent solution.
  - evidence: The heuristic was a stopgap measure and not a permanent solution. (ADR 28 Footnotes)
- Environments taking a long time to provision may be cleaned up erroneously.
  - evidence: Environments taking a long time to provision may be cleaned up erroneously. (ADR 28 Consequences)
- A generic solution for detecting provisioning errors was being designed concurrently.
  - evidence: A generic solution for detecting provisioning errors was being designed concurrently. (ADR 28 Footnotes (RHTAP-1530))

### Cons

- Erroneous cleanup of legitimate, slow-provisioning environments, hindering development and experimentation with complex deployments.
- Failure to effectively prevent cluster overload if the `ErrorOccured` condition wasn't reliably indicative of true unrecoverable states, or if errors manifested in ways not covered by the simple timeout heuristic.
- Fragile: The core insight that the 5-minute timeout 'strangled innovation' is contingent on the assumption that truly innovative, long-provisioning deployments were actively being attempted and suppressed by this specific heuristic. If evidence suggests otherwise, or if the primary failure was persistent overload, this insight loses its weight.

---
