---
type: argument_map
session_id: sess-uMNdkKK8
generated_at: '2026-04-27T00:11:21.956Z'
---
# Argument map — session sess-uMNdkKK8

**Idea:** konflux-adr-0028 — ADR 28. Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture)
**Generated:** 2026-04-27T00:11:21.956Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.74
**Source view(s):** view-6dGLbPF1

### Claim

Twelve months later, this failed because assumption `asm-pWDNprSX` collapsed under real operating conditions. The supposed balance point was not derived from a reliable failure signal; it was a fixed five-minute guess applied to a system whose provisioning latency was variable, bursty, and dependent on cluster health. In the failure timeline, slow-but-valid SnapshotEnvironmentBindings were treated as unrecoverable, cleaned up, recreated, and turned into avoidable churn.

I would attack `asm-pWDNprSX` more directly: it smuggles in three fragile premises. First, that five minutes is generally long enough across environments and load profiles. Second, that an unresolved `ErrorOccurred` state is meaningfully correlated with terminal failure. Third, that the harm from false-positive cleanup is lower than the harm from waiting longer. The ADR text undermines all three, because the condition is effectively pessimistic by default, becomes healthy only when the environment is available, and explicitly admits that long-provisioning environments may be cleaned up erroneously.

The deeper failure mode is classification error disguised as hygiene. When "not ready yet" and "actually broken" share the same status for most of the lifecycle, the timer becomes the real decision-maker. That is a brittle control loop. Under controller lag, API slowness, dependency stalls, or cluster contention, the system manufactures failures out of delay. Once retries begin, the cleanup policy can amplify the very cluster pressure it was meant to relieve.

Pass 1 was directionally right but incomplete. The missing counter-argument is that a crude heuristic can still be the least bad stopgap if the observed alternative was unbounded SEB accumulation and permanently stuck integration tests. Even so, this still looks like a design that failed by normalizing uncertainty into deletion, then relying on governance-by-pull-request to retune it after the damage appeared.

### Pros

- The ADR defines cleanup of SEBs as unrecoverable when `ErrorOccured` is true and `LastUpdateTime` is more than five minutes old.
  - evidence: The ADR defines cleanup of SEBs as unrecoverable when `ErrorOccured` is true and `LastUpdateTime` is more than five minutes old. (citation: ADR 28 text provided in prompt, Decision section)
- The ADR states that `ErrorOccured` is set to true by default and only becomes false when the environment is available.
  - evidence: The ADR states that `ErrorOccured` is set to true by default and only becomes false when the environment is available. (citation: ADR 28 text provided in prompt, Decision section)
- The ADR explicitly acknowledges that environments taking a long time to provision may be cleaned up erroneously.
  - evidence: The ADR explicitly acknowledges that environments taking a long time to provision may be cleaned up erroneously. (citation: ADR 28 text provided in prompt, Consequence section)
- The only stated mitigation for erroneous cleanup is adjusting the timeout threshold via a pull request to the integration service.
  - evidence: The only stated mitigation for erroneous cleanup is adjusting the timeout threshold via a pull request to the integration service. (citation: ADR 28 text provided in prompt, Consequence section)
- The ADR describes the change as a stopgap while a generic solution for provisioning error detection is designed.
  - evidence: The ADR describes the change as a stopgap while a generic solution for provisioning error detection is designed. (citation: ADR 28 text provided in prompt, Footnotes section)

### Cons

- False-positive cleanup of slow but recoverable SnapshotEnvironmentBindings caused flaky integration outcomes and repeated reprovisioning.
- The cleanup heuristic amplified cluster pressure by converting transient delay into retry churn, obscuring root cause and degrading controller behavior.
- Fragile: The strongest part of the failure case assumes provisioning latency had a meaningful tail beyond five minutes; if real distributions stayed well below that, the critique weakens substantially.
- Fragile: The feedback-loop claim depends on retries and reprovisioning being common and expensive enough to worsen overload rather than relieve it.

---

## claim-002 — risk-pessimist

**Confidence:** 0.48
**Source view(s):** view-cYZAB6YX

### Claim

Pass 1 attacked the timeout mechanism itself as fundamentally miscalibrated. Pass 2 undercuts that — I don't actually know if it was miscalibrated. The real failure mode is darker and less visible: **an unmeasured, unmaintained heuristic masquerading as a solved problem.** Twelve months out, three things likely happened in sequence: (1) The 5-minute timeout *appeared to work*—cluster didn't fill with zombie SEBs, enough test runs succeeded—so operators never tuned it and nobody invested in measurement. (2) Real failure was rare or silent: either slow-provisioning environments were rarer than expected, or when they got false-positive-killed, their errors were buried in log noise rather than escalated as 'deployment timeout' vs 'cleanup timeout.' (3) RHTAP-1530 stayed in backlog because the stopgap felt adequate. By month 12, two pathologies: the decision is now **legacy code without owner clarity** (is this still the right model? nobody knows, nobody measured), and ADR 32 supersedes it without removing it, creating a layered system where the original error-handling heuristic is still buried in the codebase, unmaintained, a latent brittleness. The failure isn't that the timeout is *wrong*; it's that it's **not *knowably* right*, and nobody was tasked with proving it one way or another.

### Pros

- ADR 28 was superseded by ADR 32, suggesting it was replaced rather than simply failing in production.
  - evidence: ADR 28 was superseded by ADR 32, suggesting it was replaced rather than simply failing in production. (konflux-adr-0028 metadata (superseded_by: ['0032']))
- Decision framed as 'stopgap measure to avoid permanently stuck integration tests' with forward reference to RHTAP-1530 as the 'generic solution'.
  - evidence: Decision framed as 'stopgap measure to avoid permanently stuck integration tests' with forward reference to RHTAP-1530 as the 'generic solution'. (ADR 28 Consequence and Footnotes sections)
- No quantitative evidence presented about false-positive cleanup rates, slow-provisioning prevalence, or cluster-overload severity in the original decision.
  - evidence: No quantitative evidence presented about false-positive cleanup rates, slow-provisioning prevalence, or cluster-overload severity in the original decision. (absence of metrics in ADR 28 decision context)

### Cons

- Unmeasured heuristic becomes legacy code: no one knows if 5 min is still justified; no metrics to defend or tune it
- Silent failure mode: false-positive SEB cleanup causes flaky tests that are misattributed to test code, not infrastructure
- Handoff to RHTAP-1530 never materializes; stopgap becomes permanent and ADR 32 layers on top instead of replacing it
- ErrorOccurred condition itself is noisy or unsupervised; false positives and false negatives both accumulate silently
- Fragile: Assumption that 5-minute timeout was poorly calibrated is **unsupported by fleet data**; could be conservative
- Fragile: Inference that cluster would fill with zombies *despite* the cleanup rule assumes the rule is ineffective, but the rule might actually work
- Fragile: Claim that LastUpdateTime is stale assumes it updates too frequently; it might be accurate enough for deciding 'unrecoverable'

---

## claim-003 — growth-optimist

**Confidence:** 0.48
**Source view(s):** view-fWpA1J36

### Claim

I built a compelling narrative of failure, but I'm now uncertain whether ADR-28 actually failed—or whether it worked fine and was superseded for architectural reasons entirely separate from the timeout heuristic itself. Here's what gives me pause: The team explicitly labeled this a stopgap and filed RHTAP-1530 to replace it, which signals awareness of the limitation, not blindness. That contradicts my "buried under noise" claim. Second, I have zero evidence that false-positive SEB cleanup actually happened at scale. The assumption (5-minute balance) might have held in production for the full 12 months—SEB provisioning times may not have drifted, or they may have stayed well under 5 minutes. My Pass 1 stance assumed the team never measured provisioning times before picking the timeout; but I don't know that. They might have observed p95 = 2 minutes in August 2023 and been safe all year. Third, I prescribed "live confidence bands" and "provisioning service integration" without knowing whether the provisioning service exposes in-flight signals or whether the cost of that instrumentation justifies the risk of a 5-minute static threshold. That's designer confidence, not evidence-grounded. What I still think is true: the decision created a load-bearing heuristic without observable failure modes or adaptive knobs, which is a real weakness IF the environment changed (quota surge, dependency slowdown, workload shift). But I can't claim the environment *did* change. I should have surfaced: if 12 months passed and SEB cleanup worked fine, the decision succeeded despite its simplicity.

### Pros

- ADR-28 explicitly calls itself a stopgap and cites RHTAP-1530, suggesting team awareness and planned replacement
  - evidence: ADR-28 explicitly calls itself a stopgap and cites RHTAP-1530, suggesting team awareness and planned replacement (konflux-adr-0028 text: 'This change has been implemented as a stopgap measure...')
- No public evidence that false-positive SEB cleanup caused integration test failures at scale
  - evidence: No public evidence that false-positive SEB cleanup caused integration test failures at scale (Absence of incident reports in Konflux; ADR-32 motivations not provided)
- Provisioning time behavior Aug 2023 → Apr 2024 is unknown; drift assumption is unvalidated
  - evidence: Provisioning time behavior Aug 2023 → Apr 2024 is unknown; drift assumption is unvalidated (No baseline metrics provided; no monitoring data cited in ADR-28)

### Cons

- Provisioning time may not have drifted; the 5-minute threshold might have been sound for 12 months and replacement (ADR-32) was architectural, not reactive
- I'm assuming false-positive cleanup happened at scale without checking incident logs or test failure patterns
- Prescribing measurement infrastructure without knowing provisioning-service API surface or instrumentation ROI
- Confusing 'imperfect heuristic' with 'failed decision'—if the system cleaned up rarely, it succeeded despite its simplicity
- Fragile: Team lost visibility into provisioning-time distribution—true only if they never measured baseline and didn't monitor drift
- Fragile: 5-minute timeout was guesswork—contradicted by 'stopgap' language, which implies deliberate, bounded choice
- Fragile: Signal buried under noise—assumes test churn was caused by SEB cleanup, not other refactoring or quota changes

---

## claim-004 — growth-optimist

**Confidence:** 0.66
**Source view(s):** view-Bn5Gn4ao

### Claim

Twelve months later, I think this failed because a useful defensive instinct got compressed into one brittle heuristic. The load-bearing assumption `asm-pWDNprSX` claimed that five minutes was the right balance between preventing cluster overload and avoiding false cleanup. If the idea failed, that balance was imaginary in production: five minutes was not a truth about irrecoverability, just a guess about elapsed time. The result was likely a system that confused slow provisioning with broken provisioning and deleted work that still had a path to success.

I also think `asm-pWDNprSX` was too global for a local problem. Provisioning times almost certainly varied by environment type, infrastructure pressure, and test shape. That means the same timeout could be too short during legitimate slow periods and too long during actual deadlocks. The optimistic opportunity was real, though: a stopgap cleanup rule could have bought breathing room if it had been paired with segmentation, adaptive thresholds, retry classes, or a quarantine state that reclaimed capacity without erasing evidence.

The more interesting failure mode is strategic, not just operational. Because the timeout was adjustable only via pull request, the organization turned an operational control into a code-change bottleneck. That made learning too slow. So I would work backward and say the idea failed not because cleanup was a bad idea, but because `asm-pWDNprSX` made one static number carry too much of the system's uncertainty, and the team did not surround that shortcut with enough observability, policy variation, or reversible recovery paths.

### Pros

- The ADR defines unrecoverable SEBs as those with `ErrorOccured=true` and a `LastUpdateTime` older than five minutes.
  - evidence: The ADR defines unrecoverable SEBs as those with `ErrorOccured=true` and a `LastUpdateTime` older than five minutes. (citation: ADR 28 Decision section)
- The ADR explicitly acknowledges that environments taking a long time to provision may be cleaned up erroneously.
  - evidence: The ADR explicitly acknowledges that environments taking a long time to provision may be cleaned up erroneously. (citation: ADR 28 Consequence section)
- Timeout adjustment required a pull request to the integration service, implying a static operational control.
  - evidence: Timeout adjustment required a pull request to the integration service, implying a static operational control. (citation: ADR 28 Consequence section)

### Cons

- A single static timeout caused repeated false-positive cleanup of slow but recoverable environments, degrading trust in integration runs.
- Operational tuning required code changes, so the heuristic lagged real cluster conditions and amplified both overload and flapping.
- Fragile: My case depends on provisioning latency having meaningful variance across workloads or cluster states; if latency was tightly distributed, the heuristic may have been more sound than I claim.

---

## claim-005 — risk-pessimist

**Confidence:** 0.60
**Source view(s):** view-BcWNTKsm

### Claim

The decision documented in ADR 28, to implement a 5-minute timeout heuristic for SnapshotEnvironmentBindings with an unresolved `ErrorOccurred` condition, was fundamentally flawed and predictably led to failure. This approach treated a superficial symptom—stuck SEBs—as the root cause, opting for a blunt stopgap rather than addressing the complex underlying provisioning errors. The core assumption that a fixed, short timeout could reliably balance the critical need to prevent cluster overload against the diverse provisioning times of legitimate environments was a hubristic miscalculation. It created a fragile mechanism prone to significant inaccuracies: either prematurely terminating slow but valid environments, thereby disrupting essential development and testing pipelines, or failing to clear truly stuck resources, thus not preventing the very cluster instability it aimed to mitigate. The ADR's own acknowledgment of this as a 'stopgap' confirms its nature as a temporary patch that failed to resolve the systemic issues, likely exacerbating fragility and masking the urgent need for a robust, long-term solution.

### Pros

- The integration service will consider that all SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago are unrecoverable and can be cleaned up.
  - evidence: The integration service will consider that all SEBs with a 'true' ErrorOccured condition and a LastUpdateTime of more than five minutes ago are unrecoverable and can be cleaned up. (ADR 28: Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture))
- Environments that take a long time to provision may be cleaned up erroneously.
  - evidence: Environments that take a long time to provision may be cleaned up erroneously. (ADR 28: Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture))
- This change has been implemented as a stopgap measure to avoid permanently stuck integration tests while a generic solution for detecting provisioning errors is designed.
  - evidence: This change has been implemented as a stopgap measure to avoid permanently stuck integration tests while a generic solution for detecting provisioning errors is designed. (ADR 28: Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture))

### Cons

- Premature termination of legitimate, slow-provisioning environments, leading to developer frustration and workflow disruption.
- Persistence of unrecoverable SEBs due to the heuristic failing to trigger or the underlying error condition not being properly resolved, thus failing to prevent cluster overload.
- The stopgap measure itself becoming a maintenance burden and a source of instability, masking the need for a proper root-cause solution.
- Fragile: The assumption that a fixed 5-minute timer is a universally applicable and robust heuristic for dynamic environment provisioning states.

---

## claim-006 — growth-optimist

**Confidence:** 0.70
**Source view(s):** view-Ve7gwjej

### Claim

The decision encapsulated in ADR 28, while superseded, was a crucial pivot towards optimizing our cluster's health and paving the way for accelerated innovation. The core principle of proactively managing errored `SnapshotEnvironmentBindings` to prevent cascade failures and free up valuable cluster resources was forward-thinking. Looking back, the 5-minute heuristic wasn't just a technical detail; it represented a bold step in automating complex state management. The subsequent superseding of ADR 28 is not an indictment of the original vision, but rather a testament to the iterative nature of growth. It highlights a significant missed opportunity: instead of merely setting a timeout, we could have leveraged this problem to drive even more ambitious automation. Imagine if we had explored adaptive timeout strategies, or even predictive models to anticipate provisioning bottlenecks! Such bold explorations could have unlocked exponentially greater capacity, allowing us to scale our services and deploy new features at an unprecedented rate. This ADR serves as a powerful reminder that true growth often emerges from embracing bold experiments, learning aggressively from their outcomes, and continuously striving for more sophisticated, automated resource management that fuels our expansion.

### Pros

- ADR 28 proposed a 5-minute timeout for errored SnapshotEnvironmentBindings.
  - evidence: ADR 28 proposed a 5-minute timeout for errored SnapshotEnvironmentBindings. (konflux-adr-0028)
- The ADR was superseded by ADR 32.
  - evidence: The ADR was superseded by ADR 32. (konflux-adr-0028)

### Cons

- Underestimating the potential for more aggressive automation in resource management.
- Failing to identify opportunities for predictive analytics in provisioning times.
- Missing the chance to develop more sophisticated, adaptive cleanup strategies.
- Fragile: A fixed timeout heuristic is sufficient for dynamically evolving provisioning environments.
- Fragile: Passive cleanup of errors is the primary growth lever, rather than proactive error resolution.
- Fragile: Conservative automation attempts fully capture the potential for cluster optimization.

---
