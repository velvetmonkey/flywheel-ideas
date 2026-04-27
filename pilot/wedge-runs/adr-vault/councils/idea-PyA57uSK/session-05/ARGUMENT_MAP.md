---
type: argument_map
session_id: sess-nNn6SirP
generated_at: '2026-04-27T00:28:10.761Z'
---
# Argument map — session sess-nNn6SirP

**Idea:** konflux-adr-0028 — ADR 28. Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture)
**Generated:** 2026-04-27T00:28:10.761Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-C15rFGrh

### Claim

Pass 1 correctly identified the crude heuristic and lack of observability. However, upon reflection, I overweighted the risk of cascading cleanup and underweighted the operational context. For a *temporary* stopgap in a CI system (not a long-lived infrastructure problem), a 5-minute cutoff is defensible—most ephemeral environment provisioning likely completes in seconds to minutes, not hours. The false-positive risk is real but plausible only if >5% of healthy SEBs take >5 minutes; this wasn't verified in the ADR, so I speculated without data. The bigger vulnerability is hidden: the ADR doesn't report whether false positives *actually occurred* post-deployment, and the 'adjust via PR' workaround suggests no feedback loop was instrumented. If a metrics dashboard existed showing false-positive rate, my entire concern evaporates. The fact that ADR 0032 replaced this decision suggests the team recognized these limitations and moved to a better solution—which softens the critique of this one as 'stopgap.' The decision *admits* its stopgap nature; I shouldn't penalize it for being designed that way. Residual risk: no evidence the cutoff was calibrated to the actual provisioning time distribution, and no post-deployment observability mentioned. Still a danger, but lower magnitude than I initially claimed.

### Pros

- ADR 0028 is explicitly superseded by ADR 0032 (Decoupling Deployment), suggesting team recognized limitations and found better solution.
  - evidence: ADR 0028 is explicitly superseded by ADR 0032 (Decoupling Deployment), suggesting team recognized limitations and found better solution. (vault://konflux/adr-0028-snapshot-binding-errors (superseded_by field))
- Decision admits it is 'stopgap measure' pending generic solution (RHTAP-1530); this legitimizes temporary crude heuristic design.
  - evidence: Decision admits it is 'stopgap measure' pending generic solution (RHTAP-1530); this legitimizes temporary crude heuristic design. (vault://konflux/adr-0028-snapshot-binding-errors (Footnotes section))

### Cons

- SEB provisioning time distribution not validated; 5-minute cutoff could exceed p99 of healthy provisioning, causing false-positive cleanup.
- No post-deployment observability mentioned; team may not know if false positives actually occur or how often.
- Cleanup controller itself has no rate-limiting; under sustained cluster stress, cleanup cascades could theoretically amplify load.
- Feedback loop missing; no signal for when the threshold should be adjusted dynamically (requires manual PR).
- Fragile: The 'death spiral' hypothesis depends on provisioning being slow AND cleanup happening frequently; neither is evidenced in the ADR.
- Fragile: Confidence that PR-adjustment is 'only' workaround assumes no operational dashboard exists; undocumented doesn't mean absent.
- Fragile: Belief that 5 minutes is 'crude' rests on unstated assumption that provisioning times are widely distributed; they may be tightly clustered.

---

## claim-002 — risk-pessimist

**Confidence:** 0.68
**Source view(s):** view-D6SyFBRv

### Claim

I still view ADR 28 as a brittle operational workaround, but after revisiting Pass 1 I would narrow the claim. It is not obviously irrational. If stuck SnapshotEnvironmentBindings were already consuming cluster capacity and there was no reliable terminal-failure signal, a coarse timeout may have been the least-bad containment move available at the time. Even so, assumption asm-pWDNprSX remains weakly supported in the text: the ADR gives no latency distribution, no environment-specific variance, and no evidence that five minutes was calibrated against real provisioning behavior rather than selected as a convenient cutoff.

My central objection is unchanged: the design starts from a failure-biased signal and then layers a fixed wall-clock threshold on top of it. The ADR says the error condition is true by default and only flips false when the environment becomes available. That means normal in-progress provisioning can be indistinguishable from failure for some interval. If control-plane latency, cloud-provider throttling, or heavy bootstrap causes healthy environments to exceed the threshold, the system will delete viable SEBs and induce retry churn. In a degraded system, that can turn a cleanup heuristic into a load amplifier.

The strongest counter-argument, which I underweighted in Pass 1, is that the alternative may have been worse: indefinite accumulation of genuinely stuck SEBs with no automatic cleanup path. If operators had data showing successful environments almost always became ready well before five minutes, and if cleanup was cheap and idempotent, this stopgap could be defensible as damage containment. Based on the ADR text alone, though, I still rate it as high-risk technical debt rather than a dependable error-classification strategy.

### Pros

- The ADR states it was not possible at the time to determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state.
  - evidence: The ADR states it was not possible at the time to determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state. (citation: ADR 28 Context section in user-provided text)
- The decision defines SEBs with a true error condition and a LastUpdateTime older than five minutes as unrecoverable and subject to cleanup.
  - evidence: The decision defines SEBs with a true error condition and a LastUpdateTime older than five minutes as unrecoverable and subject to cleanup. (citation: ADR 28 Decision section in user-provided text)
- The consequence section explicitly admits that long-provisioning environments may be cleaned up erroneously.
  - evidence: The consequence section explicitly admits that long-provisioning environments may be cleaned up erroneously. (citation: ADR 28 Consequence section in user-provided text)
- The footnote says the change was a stopgap while a more generic provisioning-error detection solution was being designed.
  - evidence: The footnote says the change was a stopgap while a more generic provisioning-error detection solution was being designed. (citation: ADR 28 Footnotes section in user-provided text)

### Cons

- Healthy but slow-provisioning SnapshotEnvironmentBindings are deleted as false positives, creating retry churn and obscuring the real bottleneck.
- During partial outages, the five-minute cleanup rule can amplify cluster pressure instead of reducing it by repeatedly reprovisioning environments.
- Fragile: Superseded status is only weak evidence that the decision was poor; it may simply reflect expected maturation from a stopgap to a cleaner design.
- Fragile: If successful SEBs almost always became ready well under five minutes, the heuristic may have been safer in practice than the ADR text suggests.

---

## claim-003 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-JsS2Nfut

### Claim

The decision correctly identifies the problem (unrecoverable SEBs wedging the cluster) and chooses pragmatic action over deadlock. But the execution underspecifies the critical assumption: a 5-minute timeout is *a number*, not a calibrated choice. No evidence appears in the ADR that provisioning-time distributions were measured, the threshold was validated against real slow provisioners, or the false-positive cleanup rate was quantified. My Pass 1 stance leaned on "adjustability via pull request" and "eventual real solution (RHTAP-1530)," but that's wishful thinking. Pull-request adjustability is slow for an operator facing a flaky test *now*; and stopgaps historically outlive their roadmap justification when competing priorities shift. The real vulnerability: if the timeout is wrong (e.g., legitimate provisioners regularly take 6–10 minutes), the decision manufactures false-positive test failures that developers blame themselves for. That cost—lost debugging time, eroded trust in the CI system—is invisible in the ADR. I still believe triage over deadlock is the right call, but only if the team can answer: (1) What is the actual distribution of provisioning times for slow-but-legitimate environments? (2) What observability will catch false-positive cleanups? (3) Who owns the follow-up to RHTAP-1530, and what's the exit criterion? Without those answers, this is premature optimization on a guess.

### Pros

- ADR text does not specify how the 5-minute threshold was derived or validated against provisioning-time distributions
  - evidence: ADR text does not specify how the 5-minute threshold was derived or validated against provisioning-time distributions (konflux-adr-0028 (provided))
- ADR mentions RHTAP-1530 as future work but provides no commitment date, exit criterion, or responsible owner
  - evidence: ADR mentions RHTAP-1530 as future work but provides no commitment date, exit criterion, or responsible owner (konflux-adr-0028 (provided))
- ErrorOccurred condition semantics (what triggers 'true', what conditions are transient vs. unrecoverable) are not defined in the ADR
  - evidence: ErrorOccurred condition semantics (what triggers 'true', what conditions are transient vs. unrecoverable) are not defined in the ADR (konflux-adr-0028 (provided))

### Cons

- Five-minute timeout is not data-driven; may be too aggressive for legitimate slow provisioners, manufacturing false-positive test failures that erode CI trust
- Stopgap normalization: RHTAP-1530 could slip; the timeout becomes permanent policy instead of bridge
- No observable alerting on false-positive cleanups; team may not know the heuristic is misfiring
- Graduated-retry suggestion (from Pass 1) is cosmetic; doesn't solve the core problem of timeout calibration
- Root cause (why SEB creation fails so often) is unaddressed; cleanup treats symptom, not disease
- Fragile: Assumption that cluster-overload risk justifies the cost of false-positive test failures—no quantified comparison
- Fragile: Belief that PR-adjustability provides real operational flexibility; actual feedback loop is slow
- Fragile: Notion that RHTAP-1530 will actually ship and this will be revisited; competing priorities often defer foundational work

---

## claim-004 — growth-optimist

**Confidence:** 0.61
**Source view(s):** view-DdyBpzVF

### Claim

I still lean in favor of the move as a stopgap. asm-pWDNprSX has real upside because it converts an unbounded failure mode into a bounded one: if stuck SnapshotEnvironmentBindings can overload the cluster, a timer-based cleanup rule creates operating room for the rest of the platform and keeps bad states from accumulating indefinitely.

But I would attack asm-pWDNprSX more directly than I did in Pass 1. The ADR does not establish that five minutes is the right balance; it establishes that five minutes was a convenient emergency heuristic. The text itself admits that slow but healthy environments may be cleaned up erroneously, which means the assumption is not proven so much as tolerated under pressure.

My revised stance is that this was a good temporary circuit breaker, not a well-validated steady-state policy. The bigger upside path was to pair the timeout with learning or segmentation: collect provisioning latency distributions, vary thresholds by environment type, or let the provisioning side emit liveness signals. That would keep the cleanup benefit while reducing the tax of false positives and turning a blunt safeguard into a compounding operational advantage.

### Pros

- The ADR says inability to clean up errored SnapshotEnvironmentBindings can overload the cluster.
  - evidence: The ADR says inability to clean up errored SnapshotEnvironmentBindings can overload the cluster. (citation: user-provided ADR 28 Context)
- The decision cleans up SnapshotEnvironmentBindings whose ErrorOccured condition remains true for more than five minutes.
  - evidence: The decision cleans up SnapshotEnvironmentBindings whose ErrorOccured condition remains true for more than five minutes. (citation: user-provided ADR 28 Decision)
- The ADR explicitly warns that long-provisioning environments may be cleaned up erroneously and frames the change as a stopgap.
  - evidence: The ADR explicitly warns that long-provisioning environments may be cleaned up erroneously and frames the change as a stopgap. (citation: user-provided ADR 28 Consequence and Footnotes)
- The ADR is marked superseded by ADR 32, which supports reading this as an interim measure rather than a durable endpoint.
  - evidence: The ADR is marked superseded by ADR 32, which supports reading this as an interim measure rather than a durable endpoint. (citation: user-provided ADR 28 Status)

### Cons

- A fixed five-minute threshold can reap slow but healthy environments and create avoidable churn.
- Using a default-true error condition risks conflating missing readiness with actual unrecoverable failure.
- Fragile: The main value of the ADR may have been organizational and operational confidence rather than technical optimality.
- Fragile: The superseded status suggests the team itself viewed the timeout heuristic as transitional rather than foundational.

---

## claim-005 — growth-optimist

**Confidence:** 0.70
**Source view(s):** view-UH7kgnJ3

### Claim

ADR 28 stands as a brilliant example of proactive, agile engineering, a critical intervention that averted potential cluster gridlock and accelerated our development cycles. The decision to implement a time-based heuristic for SnapshotEnvironmentBinding cleanup was a masterstroke of pragmatic innovation, a bold move that prevented stagnation and unlocked critical velocity for our integration service. While it served as a necessary stopgap, its true value lies in the agility it fostered, allowing teams to iterate rapidly without the lingering threat of unrecoverable states. The very fact that it paved the way for ADR 32, a more integrated solution, highlights our commitment to continuous architectural evolution and learning from every step of our journey. This ADR empowered us to keep building, experimenting, and pushing boundaries, ensuring our platform remained dynamic and responsive to our evolving needs.

### Pros

- Unrecoverable SnapshotEnvironmentBindings can overload the cluster, making it difficult to determine if an ephemeral SEB needs to be cleaned up by the integration service's SnapshotEnvironmentBinding controller.
  - evidence: Unrecoverable SnapshotEnvironmentBindings can overload the cluster, making it difficult to determine if an ephemeral SEB needs to be cleaned up by the integration service's SnapshotEnvironmentBinding controller. (ADR 28 Context)
- The integration service will consider SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago as unrecoverable and eligible for cleanup.
  - evidence: The integration service will consider SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago as unrecoverable and eligible for cleanup. (ADR 28 Decision)
- This change was implemented as a stopgap measure to avoid permanently stuck integration tests while a generic solution for detecting provisioning errors is designed, tracked in RHTAP-1530.
  - evidence: This change was implemented as a stopgap measure to avoid permanently stuck integration tests while a generic solution for detecting provisioning errors is designed, tracked in RHTAP-1530. (ADR 28 Footnotes)
- The timeout threshold can be adjusted via a pull request to the integration service.
  - evidence: The timeout threshold can be adjusted via a pull request to the integration service. (ADR 28 Consequence)

### Cons

- Erroneous cleanup of legitimately slow-provisioning environments, impacting development workflows.
- Masking underlying, more complex provisioning issues that ADR 32 aimed to address more comprehensively.
- Fragile: The assumption that a 5-minute timeout is an optimal balance point between preventing cluster overload and avoiding premature cleanup of slow environments.

---

## claim-006 — risk-pessimist

**Confidence:** 0.90
**Source view(s):** view-hbpBD7up

### Claim

While the stated goal of preventing cluster overload from stuck SnapshotEnvironmentBindings is critical, the proposed solution in ADR 28 is a dangerously blunt instrument. The reliance on a fixed, five-minute timeout for any SEB exhibiting an `ErrorOccurred` condition is a heuristic fraught with peril. It prioritizes immediate symptom suppression over genuine problem-solving, risking the erroneous termination of legitimate, albeit slow, provisioning environments. This approach not only introduces new failure modes and potential data loss but actively masks underlying systemic issues within the SEB provisioning pipeline, which is precisely the kind of situation a robust error-handling strategy should expose, not obscure. The fact that this is a temporary measure, acknowledged by the tracking of a more comprehensive solution (RHTAP-1530), underscores its inadequacy.

Even acknowledging the possibility of an imminent cluster-wide failure, this solution appears to be a reckless gamble. It trades one potential catastrophe (overload) for another (data loss, unpredictable system behavior, and delayed root-cause analysis). A more prudent approach, even as a stopgap, would involve more nuanced diagnostics or at least a more configurable and observable timeout mechanism, rather than a hardcoded, five-minute window that is likely to misfire frequently. This ADR represents a failure to grapple with the complexity of provisioning errors, opting instead for a simplistic, high-risk workaround.

### Pros

- The integration service will consider all SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago as unrecoverable and clean them up.
  - evidence: The integration service will consider all SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago as unrecoverable and clean them up. (konflux-adr-0028)
- Environments that take a long time to provision may be cleaned up erroneously.
  - evidence: Environments that take a long time to provision may be cleaned up erroneously. (konflux-adr-0028)

### Cons

- Erroneous cleanup of legitimate, slow-provisioning environments leading to data loss or incomplete deployments.
- Masking underlying systemic issues in the SEB provisioning pipeline, delaying critical root cause analysis and perpetuating instability.
- Increased user frustration and operational burden due to unpredictable resource cleanup and the need for manual intervention or retries.
- The heuristic's arbitrary nature (5 minutes) is prone to failure as provisioning times vary significantly, making it an unreliable indicator of true unrecoverability.
- Fragile: The assertion that a 5-minute timeout on an 'ErrorOccurred' condition correctly balances cluster-overload prevention with the avoidance of false-positive cleanups for slow-provisioning environments is inherently fragile, as provisioning times are highly variable and the heuristic lacks diagnostic depth.

---
