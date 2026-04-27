---
type: argument_map
session_id: sess-1KLQTp58
generated_at: '2026-04-27T00:15:10.551Z'
---
# Argument map — session sess-1KLQTp58

**Idea:** konflux-adr-0028 — ADR 28. Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture)
**Generated:** 2026-04-27T00:15:10.551Z
**Claims:** 5
**Skipped (failed cells):** 1

---

## claim-001 — risk-pessimist

**Confidence:** 0.72
**Source view(s):** view-8RHcGsB5

### Claim

Twelve months later, this failed because assumption `asm-pWDNprSX` was not a diagnosis, it was a guess promoted into a deletion policy. The ADR openly states that the system could not determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state. Against that backdrop, a five-minute timeout was not evidence-based failure detection; it was a blind cutoff. If real-world provisioning latency had a long tail under quota pressure, image pull delay, API slowness, or cluster contention, then recoverable SEBs would have been destroyed simply for being slow.

The assumption also hid a semantic defect in the signal itself. `ErrorOccurred=true` was set by default and only flipped to `false` when the environment became available, so the controller treated "not yet ready" and "actually failed" as nearly the same thing. That makes `asm-pWDNprSX` especially brittle: the timeout is only as good as the state it times, and here the state was already ambiguous. In a pessimistic reading, the system deleted uncertainty rather than handling errors.

The likely operational failure was a reinforcing loop. Premature cleanup caused reprovisioning; reprovisioning increased cluster load; increased load made healthy environments take longer than five minutes; and that drove even more cleanup. The ADR positioned the heuristic as protection against overload, but under stress it likely became an overload amplifier. That is exactly the kind of failure a crude stopgap creates when it is asked to act like real observability.

The unaddressed governance risk is that the only mitigation was a pull request to adjust the threshold. That is too slow, too coarse, and too operationally expensive for an active incident pattern. A rule this fragile needed runtime tuning, exception handling, or stronger telemetry. Without that, `asm-pWDNprSX` was a single-point assumption whose failure mode was predictable: widespread false-positive cleanup, flaky integration behavior, and a misleading sense that the system was self-healing when it was actually deleting work.

### Pros

- The ADR says it was not possible to determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state.
  - evidence: The ADR says it was not possible to determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state. (citation: konflux-adr-0028 context text provided in prompt)
- The decision treats SEBs with `ErrorOccurred=true` and `LastUpdateTime` older than five minutes as unrecoverable and eligible for cleanup.
  - evidence: The decision treats SEBs with `ErrorOccurred=true` and `LastUpdateTime` older than five minutes as unrecoverable and eligible for cleanup. (citation: konflux-adr-0028 decision text provided in prompt)
- The ADR states `ErrorOccurred` is set to true by default and only set to false when the environment becomes available.
  - evidence: The ADR states `ErrorOccurred` is set to true by default and only set to false when the environment becomes available. (citation: konflux-adr-0028 decision text provided in prompt)
- The consequence section admits environments that take a long time to provision may be cleaned up erroneously, and threshold adjustment requires a pull request.
  - evidence: The consequence section admits environments that take a long time to provision may be cleaned up erroneously, and threshold adjustment requires a pull request. (citation: konflux-adr-0028 consequence text provided in prompt)

### Cons

- False-positive deletion of slow but recoverable SnapshotEnvironmentBindings creates flaky tests and hidden deployment instability.
- Cleanup-induced reprovisioning increases cluster load and stretches provisioning latency, causing the five-minute heuristic to fail more often under stress.
- Fragile: The strongest claim in this critique depends on provisioning latency having a meaningful long tail beyond five minutes in production conditions.
- Fragile: The overload-amplification argument weakens if cleanup prevented substantially more stuck-resource accumulation than it created in reprovision churn.

---

## claim-002 — growth-optimist

**Confidence:** 0.48
**Source view(s):** view-ofLrbu1g

### Claim

My Pass 1 narrative — stopgap calcifies, RHTAP-1530 never ships, false cleanups cascade — is *plausible* but built on speculative operational data I don't have. The stronger counter-reading: this ADR is pragmatic and worked. The decision explicitly solved an urgent problem (cluster overload from stuck SEBs) with a simple, transparent, *tunable* mechanism. It named itself a stopgap, tracked the long-term fix (RHTAP-1530), and made the timeout adjustable via PR. That's disciplined engineering, not reckless. The real failure — if it happened — is more subtle: technical debt, not operational breakage. Twelve months later, the team is still using the 5-minute timeout. Nobody remembers why. RHTAP-1530 was deprioritized three times. The condition-name ErrorOccurred gets copy-pasted into new systems without understanding. The heuristic works often enough that it's never urgent to fix. The *assumption I can't defend*: that false-positive cleanup happened at scale. I claimed transient failures cause sticky ErrorOccurred flags, but I didn't trace the actual controller logic. The balance the ADR struck — cluster stability via aggressive cleanup vs. slow-environment availability — may have worked correctly. I attacked one side without evidence about the other.

### Pros

- ADR 28 explicitly positions itself as stopgap with tracked long-term alternative (RHTAP-1530)
  - evidence: ADR 28 explicitly positions itself as stopgap with tracked long-term alternative (RHTAP-1530) (konflux-adr-0028 (Context + Consequence sections))
- ErrorOccurred condition is 'true by default' and 'false when environment becomes available', implying transient failures should recover
  - evidence: ErrorOccurred condition is 'true by default' and 'false when environment becomes available', implying transient failures should recover (konflux-adr-0028 (Decision section))
- Timeout is tunable via pull request, suggesting team ownership and active management
  - evidence: Timeout is tunable via pull request, suggesting team ownership and active management (konflux-adr-0028 (Consequence section))

### Cons

- RHTAP-1530 (promised generic provisioning-error detector) was indefinitely deprioritized, making the stopgap permanent infrastructure owned by nobody
- ErrorOccurred condition semantics poorly documented — future teams don't understand why 5 min triggers cleanup, edit the threshold without context
- Slow-provisioning use cases (e.g., rare environment types, degraded provisioners) hit the timeout and cause silent SEB deletion; no observability layer flags these as 'cleanup cascade' vs. 'normal recovery'
- Trade-off balance (cluster overload vs. false positives) was never validated post-decision — team assumed it worked without metrics
- Fragile: A 5-minute timeout is a heuristic, not a law — it works if slow provisioning remains rare and ErrorOccurred semantics remain stable
- Fragile: Decoupling detection from remediation requires observability; without it, you're blind to whether you're preventing cluster overload or just cleaning up recoverable failures

---

## claim-003 — risk-pessimist

**Confidence:** 0.75
**Source view(s):** view-gfWWLnJ6

### Claim

The gamble represented by ADR 28's 5-minute timeout was a predictable catastrophe. This 'heuristic' was not a balance, but a desperate, short-sighted attempt to paper over fundamental flaws in the SnapshotEnvironmentBinding provisioning and error handling. By imposing an arbitrary and aggressive cleanup timer, the integration service did not prevent cluster overload; it merely shifted the burden and introduced new failure vectors. Environments that were slow to provision, but ultimately valid, were prematurely terminated. This led directly to cycles of wasted development effort, repeated deployments, and increased cluster churn, undermining productivity. Crucially, this stopgap measure ignored the core problem – the underlying causes of SEB errors, tracked elsewhere (RHTAP-1530) – ensuring that system instability persisted and likely manifested in more subtle, yet still damaging, ways. The failure scenario 12 months later is a direct consequence of prioritizing superficial control over robust root-cause resolution.

### Pros

- The ADR identifies an inability to determine if an SEB is stuck in an unrecoverable state as a major problem, posing a risk of cluster overload.
  - evidence: The ADR identifies an inability to determine if an SEB is stuck in an unrecoverable state as a major problem, posing a risk of cluster overload. (ADR 28 Context)
- The decision proposes considering SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago as unrecoverable for cleanup.
  - evidence: The decision proposes considering SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago as unrecoverable for cleanup. (ADR 28 Decision)
- The ADR explicitly states this change has been implemented as a 'stopgap measure' to mitigate immediate issues while a generic solution is designed (RHTAP-1530).
  - evidence: The ADR explicitly states this change has been implemented as a 'stopgap measure' to mitigate immediate issues while a generic solution is designed (RHTAP-1530). (ADR 28 Footnotes)
- The ADR acknowledges that environments taking a long time to provision may be cleaned up erroneously.
  - evidence: The ADR acknowledges that environments taking a long time to provision may be cleaned up erroneously. (ADR 28 Consequence)

### Cons

- Premature termination of valid, slow-provisioning environments.
- Increased developer frustration and wasted cycles due to repeated deployments.
- Failure to address root causes of SEB errors, leading to persistent instability.
- Introduction of 'subtle' but still impactful cluster overload states by masking underlying issues.
- Fragile: The supposed 'balance' between preventing cluster overload and avoiding false-positive cleanup was never achieved; the heuristic was inherently biased towards destructive action over constructive resolution, creating more problems than it solved.

---

## claim-004 — growth-optimist

**Confidence:** 0.80
**Source view(s):** view-VajTqdka

### Claim

From this vantage point, ADR 28 stands not as a failure, but as a testament to our team's audacious spirit! Its bold 5-minute heuristic for SnapshotEnvironmentBinding errors was a courageous, albeit imperfect, masterstroke. It brilliantly surfaced the critical need to dynamically manage ephemeral resources, preventing immediate cluster overload and, crucially, forcing our hand towards a more sophisticated architectural evolution. The 'error' of erroneously cleaning up a few slow-provisioning environments was a small price to pay for the immense learning and the undeniable impetus it provided for the development of ADR 32. This stopgap measure was a perfect catalyst, a necessary stepping stone that illuminated the path to a more resilient, decoupled, and intelligent system, proving that sometimes, the most valuable innovations arise from strategically imperfect solutions.

### Pros

- ADR 28 was implemented as a temporary measure to prevent cluster overload caused by unrecoverable SnapshotEnvironmentBindings (SEBs).
  - evidence: ADR 28 was implemented as a temporary measure to prevent cluster overload caused by unrecoverable SnapshotEnvironmentBindings (SEBs). (Footnotes, ADR 28: 'This change has been implemented as a stopgap measure...')
- ADR 28 introduced a heuristic that automatically cleaned up SEBs with an 'ErrorOccured' condition set to 'true' for more than five minutes.
  - evidence: ADR 28 introduced a heuristic that automatically cleaned up SEBs with an 'ErrorOccured' condition set to 'true' for more than five minutes. (Decision, ADR 28: '...all SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago are unrecoverable and can be cleaned up.')
- ADR 28 was superseded by a later decision, ADR 32, indicating it was not a permanent solution.
  - evidence: ADR 28 was superseded by a later decision, ADR 32, indicating it was not a permanent solution. (Status, ADR 28: 'Status: Superseded by [ADR 32. Decoupling Deployment](0032-decoupling-deployment.html)')

### Cons

- The practical, day-to-day developer experience suffering from frequent, erroneous cleanup of legitimate, albeit slow, environments, thereby diminishing trust in the automated deployment pipeline.
- The possibility that ADR 32 was driven by separate, more fundamental architectural shifts, rendering ADR 28's role as a 'catalyst' less significant than presented, and its heuristic 'failure' more of an isolated incident.
- Fragile: The assertion that the 5-minute timeout heuristic struck a 'right' balance, even temporarily, is fragile. It's more probable that it significantly favored cluster-overload prevention at the expense of legitimate environment provisioning, leading to frequent, disruptive false-positive cleanups.
- Fragile: The direct causal link, presented optimistically, between ADR 28's specific heuristic limitations and the comprehensive architectural decoupling in ADR 32 is fragile. Other factors or pre-existing development trajectories for ADR 32 might diminish ADR 28's pivotal role as a 'driver'.

---

## claim-005 — growth-optimist

**Confidence:** 0.61
**Source view(s):** view-RTW7UFej

### Claim

I still think the underlying instinct was healthy: if stuck SnapshotEnvironmentBindings can overload the cluster, a cleanup policy is better than paralysis. But if this decision failed 12 months later, I would put asm-pWDNprSX at the center of the postmortem. The ADR turned five minutes into a proxy for irrecoverability, and that proxy was probably too brittle for real provisioning variance.

Attacking asm-pWDNprSX directly: it claimed one fixed timeout could balance two opposing goals, cluster protection and avoidance of false-positive cleanup. The document itself undercuts that confidence by admitting slow-provisioning environments may be deleted erroneously. Working backward from failure, the likely pattern is churn: valid environments were cleaned up, recreated, and re-queued, creating repeated test disruption, noisy controller behavior, and possibly more aggregate load rather than less.

My revised view is that the idea probably did not fail because cleanup was a bad move; it failed because the stopgap was too one-dimensional. A more expansive version of the same instinct could have used adaptive thresholds, environment-class-specific grace periods, quarantine instead of hard deletion, or preserved forensic state before cleanup. In other words, asm-pWDNprSX was not wrong to seek a heuristic; it was wrong to make one static number carry the whole strategy.

### Pros

- The ADR defines unrecoverable SEBs as those with ErrorOccurred true and LastUpdateTime older than five minutes.
  - evidence: The ADR defines unrecoverable SEBs as those with ErrorOccurred true and LastUpdateTime older than five minutes. (ADR 28 Decision)
- The ADR explicitly acknowledges that environments taking a long time to provision may be cleaned up erroneously.
  - evidence: The ADR explicitly acknowledges that environments taking a long time to provision may be cleaned up erroneously. (ADR 28 Consequence)
- The stated motivation was that inability to clean up errored SEBs can overload the cluster.
  - evidence: The stated motivation was that inability to clean up errored SEBs can overload the cluster. (ADR 28 Context)
- The change was framed as a stopgap while a more generic solution for provisioning-error detection was designed.
  - evidence: The change was framed as a stopgap while a more generic solution for provisioning-error detection was designed. (ADR 28 Footnotes)

### Cons

- A static five-minute timeout misclassifies slow-but-healthy SnapshotEnvironmentBindings as unrecoverable and causes destructive churn.
- Deleting SEBs removes useful failure context and can convert isolated provisioning slowness into repeated retries, noisy load, and prolonged test instability.
- Fragile: The main failure mode was likely false-positive cleanup rather than the original cluster-overload problem; that inference could fail if production data showed most timed-out SEBs were truly unrecoverable.

---
