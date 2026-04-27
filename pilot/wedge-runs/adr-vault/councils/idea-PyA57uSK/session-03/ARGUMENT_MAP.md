---
type: argument_map
session_id: sess-h6M3TxKi
generated_at: '2026-04-27T00:18:43.198Z'
---
# Argument map — session sess-h6M3TxKi

**Idea:** konflux-adr-0028 — ADR 28. Handling SnapshotEnvironmentBinding Errors (konflux-ci/architecture)
**Generated:** 2026-04-27T00:18:43.198Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.52
**Source view(s):** view-qzCwdyP4

### Claim

Pass 1 was a theoretical attack on implementation details I cannot verify without production telemetry. Kubernetes conditions (LastUpdateTime, ErrorOccurred) are designed to be monotonic and reliable — my concern about 'sticky-true conditions' or 'clock-skew' failures was speculative. The decision itself was transparently pragmatic: it acknowledged the risk explicitly ('environments that take a long time to provision may be cleaned up erroneously') and left the escape hatch ('can be adjusted via pull request'). That's not recklessness — that's deliberate tradeoff under constraint.

But the real failure mode isn't that the 5-minute timeout breaks technically. It's that this decision is **infrastructure debt masquerading as a temporary measure.** The decision promises RHTAP-1530 (the real root-cause fix: detecting provisioning errors generically) will be tracked. In 12 months, what likely happened: (1) the stopgap shipped and was 'good enough' to reduce urgency, (2) RHTAP-1530 got deprioritized, starved, or cancelled, (3) the timeout window was never empirically validated (5 minutes is still a guess), and (4) the next team to own SEB cleanup inherited a heuristic they don't fully understand. The timeout might work for a year or two. But permanent infrastructure built on 'we'll fix this later' compounds into unmaintainable debt.

The load-bearing assumption isn't just that '5 minutes is the right threshold.' It's that **RHTAP-1530 will eventually ship and displace this stopgap.** If that work stalled or was never scoped properly, the assumption fails catastrophically — the timeout becomes permanent, the code path nobody dares touch, and the next incident that involves slow-provisioning SEBs will blame a heuristic tuned without data.

### Pros

- Decision dates to 2023-08-31; if RHTAP-1530 is 12+ months old with no shipping, assumption failed
  - evidence: Decision dates to 2023-08-31; if RHTAP-1530 is 12+ months old with no shipping, assumption failed (konflux-adr-0028 header)
- Kubernetes condition LastUpdateTime is set by API server, not reconciler; more reliable than distributed app timestamps
  - evidence: Kubernetes condition LastUpdateTime is set by API server, not reconciler; more reliable than distributed app timestamps (vault://tech/kubernetes-conditions-semantics (inferred, not fetched))
- Decision explicitly acknowledges false-positive risk and permits tuning via PR; not ignorant of the tradeoff
  - evidence: Decision explicitly acknowledges false-positive risk and permits tuning via PR; not ignorant of the tradeoff (konflux-adr-0028 Consequence section)

### Cons

- RHTAP-1530 (root-cause fix for provisioning errors) was never scoped, deprioritized, or cancelled; 5-minute timeout became permanent
- 5-minute window was never empirically validated; it's a guess that happened to work until it didn't (slow-provisioning environments hit in production)
- ErrorOccurred condition setter reliability depends on components outside integration-service; if provisioning logic doesn't set condition correctly, timeout becomes noise
- Next team to own SEB cleanup lacks context about why 5 minutes was chosen; heuristic is adjusted blindly or cargo-culted into other timeout decisions
- Fragile: Decision is pragmatic only if RHTAP-1530 actually gets built; if that work stalled, the stopgap hardened into permanent debt
- Fragile: 5-minute threshold was chosen to avoid cluster overload, but overload might not have been the true root cause (could be ErrorOccurred setter bugs or K8s API server issues)
- Fragile: Consequence section acknowledges slow-provisioning risk but doesn't provide monitoring/alerting to detect it, so false positives compound silently

---

## claim-002 — risk-pessimist

**Confidence:** 0.74
**Source view(s):** view-vxuqhwTd

### Claim

If this failed 12 months later, the central mistake was exactly what assumption `asm-pWDNprSX` claims to solve: pretending a fixed 5-minute timeout can reliably distinguish unrecoverable SnapshotEnvironmentBindings from merely slow ones. That is not a diagnosis. It is a timer standing in for missing state. Because `ErrorOccurred` starts as `true` by default and only flips when the environment becomes available, the system is not observing error; it is observing lack of success so far. Failure follows when slow-but-valid provisioning gets reclassified as terminal and cleaned up.

Attack on `asm-pWDNprSX`: the heuristic is brittle in both directions. In quiet clusters, five minutes can be too short, causing false-positive cleanup, integration test churn, retries, wasted compute, and operator distrust. In stressed clusters, five minutes can be too long, allowing enough stuck SEBs to accumulate that the overload problem still materializes before cleanup helps. A single global threshold assumes latency distributions are stable across workload types, clouds, cluster states, and dependency incidents. That assumption is usually where these controls break.

The more damaging failure mode is operational. The ADR admits this was a stopgap because unrecoverable state could not actually be detected. That means the mechanism likely trained the organization to accept a bad proxy while pushing adaptation into a pull-request workflow. When conditions changed, the policy could not respond at incident speed. Twelve months later, the likely postmortem is that the timeout normalized ambiguous signals, hid the absence of proper failure semantics, and created a system that was simultaneously too aggressive for slow environments and too passive for genuine backlog protection.

### Pros

- The ADR states that it was not possible to determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state.
  - evidence: The ADR states that it was not possible to determine whether a SnapshotEnvironmentBinding was stuck in an unrecoverable state. (citation: user-provided ADR konflux-adr-0028, Context section)
- The decision uses a cleanup rule based on `ErrorOccured=true` and `LastUpdateTime` older than five minutes.
  - evidence: The decision uses a cleanup rule based on `ErrorOccured=true` and `LastUpdateTime` older than five minutes. (citation: user-provided ADR konflux-adr-0028, Decision section)
- The ADR explicitly warns that environments taking a long time to provision may be cleaned up erroneously and that threshold changes require a pull request.
  - evidence: The ADR explicitly warns that environments taking a long time to provision may be cleaned up erroneously and that threshold changes require a pull request. (citation: user-provided ADR konflux-adr-0028, Consequence section)
- The ADR frames the change as a stopgap pending a more generic solution for detecting provisioning errors.
  - evidence: The ADR frames the change as a stopgap pending a more generic solution for detecting provisioning errors. (citation: user-provided ADR konflux-adr-0028, Footnotes section)

### Cons

- Valid but slow-provisioning environments are garbage-collected as if they were irrecoverable, causing false test failures and retry amplification.
- Truly stuck SnapshotEnvironmentBindings still consume cluster capacity long enough that overload occurs before the cleanup heuristic meaningfully protects the system.
- Fragile: The argument weakens substantially if production data showed that SEB provisioning latency was tightly distributed and that five minutes captured nearly all true failures with minimal false positives.
- Fragile: The claim that manual threshold retuning was too slow depends on whether operators actually needed frequent adjustment after rollout.

---

## claim-003 — risk-pessimist

**Confidence:** 0.90
**Source view(s):** view-TFMwCxdR

### Claim

ADR 28's gambit, a rigid 5-minute timeout for 'errored' SnapshotEnvironmentBindings (SEBs), was a predictable failure point, fundamentally misaligned with the dynamic reality of cloud provisioning. The central assumption – that this arbitrary timer could effectively arbitrate between preventing cluster overload and erroneously terminating slow-but-valid environments – was an act of technical wishful thinking. In a volatile operational landscape, 'slow' is not a fixed value. This ADR, therefore, was doomed to either aggressive, false-positive deletions that crippled development workflows, or insufficient protection against the very cluster instability it purported to solve. The decision's consequence, that timely provisioned environments could be 'cleaned up erroneously,' highlights the blunt-force nature of this 'solution.' It was a stopgap, as explicitly stated, destined to be superseded because it addressed symptoms, not root causes, failing to provide any genuine resilience or adaptability.

### Pros

- The decision implements a 5-minute timeout for SnapshotEnvironmentBindings with an ErrorOccurred condition to determine recoverability.
  - evidence: The decision implements a 5-minute timeout for SnapshotEnvironmentBindings with an ErrorOccurred condition to determine recoverability. (konflux-adr-0028, Decision section)
- The consequence states that environments taking a long time to provision may be cleaned up erroneously.
  - evidence: The consequence states that environments taking a long time to provision may be cleaned up erroneously. (konflux-adr-0028, Consequence section)
- The change was a 'stopgap measure' pending a 'generic solution' tracked in RHTAP-1530.
  - evidence: The change was a 'stopgap measure' pending a 'generic solution' tracked in RHTAP-1530. (konflux-adr-0028, Footnotes section)
- ADR 28 is marked as 'Superseded' by ADR 32 ('Decoupling Deployment').
  - evidence: ADR 28 is marked as 'Superseded' by ADR 32 ('Decoupling Deployment'). (konflux-adr-0028, Status section)

### Cons

- Erroneous deletion of critical, albeit slow-to-provision, environments, leading to significant disruption and wasted engineering effort.
- Inadequate prevention of cluster overload due to the heuristic's inflexibility, potentially leaving the system vulnerable.
- The stopgap nature of the solution masked deeper architectural issues, delaying a more robust resolution.
- Fragile: The reliance on a fixed 5-minute timeout as a 'heuristic' for complex, variable provisioning times was a critical design flaw.

---

## claim-004 — growth-optimist

**Confidence:** 0.52
**Source view(s):** view-CXBWmxY7

### Claim

The 5-minute rule was a pragmatic interim that *could* have worked — but my Pass 1 verdict was overconfident because I pattern-matched against 'stopgap becomes permanent' without checking whether it actually did. Here's my revised read: If provisioning times genuinely stayed ≤5 min for 90%+ of SEBs in steady state, and the false-positive rate (premature cleanup) was acceptable (say, <5%), then the rule did its job: prevented cluster overload from stuck bindings without major false cascades. My error was assuming transient errors dominated and that 5 minutes was *obviously* too short. But I don't know the actual distribution. The real failure mode is different: the 5-minute timeout probably *worked* for 6–12 months, then *failed silently* when one of three things shifted—(1) cluster parallelism doubled and median provisioning time drifted from 3 min to 7–8 min, (2) a new environment type (Kubernetes-in-Kubernetes sandbox) got added and needed 10+ min to come up, or (3) ErrorOccurred became less reliable (started firing on transients that *did* self-heal in 10 min). The team wouldn't have noticed until either (a) test failure rate crept up and was hard to attribute, or (b) the admin logs showed a spike in cleanup ops that didn't correlate with actual failures. By then, RHTAP-1530 was already parked because the problem felt 'solved.' The upside I barely surfaced: the rule *was* observable, testable, and could have been tuned per-environment-type via one-liner PRs. The downside: once a flat number is baked into production reconcilers, changing it feels expensive, so it doesn't adapt.

### Pros

- ADR 28 explicitly frames itself as a stopgap pending RHTAP-1530 generic solution
  - evidence: ADR 28 explicitly frames itself as a stopgap pending RHTAP-1530 generic solution (konflux-adr-0028 text: 'This change has been implemented as a stopgap measure to avoid permanently stuck integration tests while a generic solution for detecting provisioning errors is designed.')
- ADR 28 acknowledges the timeout is tunable, suggesting the team knew it could be adjusted
  - evidence: ADR 28 acknowledges the timeout is tunable, suggesting the team knew it could be adjusted (konflux-adr-0028 text: 'the timeout threshold can be adjusted via a pull request to the integration service')
- The real question is whether the 5-min rule *actually failed* or just got superseded by better design
  - evidence: The real question is whether the 5-min rule *actually failed* or just got superseded by better design (ADR status shows 'Superseded by [0032]'—suggests intentional evolution, not crisis response)

### Cons

- Outcome data is unknown—could show the 5-min rule actually worked fine until RHTAP-1530 shipped, invalidating the entire pre-mortem
- ErrorOccurred condition semantics are unclear—if it was *more* reliable than I assumed, transients might have been rare and 5 min sufficient
- Provisioning time distribution unknown—I assumed drift upward without data; times could have been stable or the team could have accepted occasional false positives as acceptable tradeoff
- RHTAP-1530 status unknown—if it shipped and superseded this, ADR was correct to be temporary; if still parked, that's a separate failure (lack of follow-through), not a failure of the 5-min heuristic itself
- Fragile: Assumption that 'stopped gaps become permanent' is a strong pattern but doesn't apply universally—some stoppages *are* the right call and get revisited when real pressure arrives
- Fragile: Conflated 'transient errors that self-heal' with 'structural errors that don't'—the ADR doesn't clearly say which ErrorOccurred fires map to which, so I may have misread the problem entirely
- Fragile: Asserted that RHTAP-1530 being parked meant failure, without checking whether the interim rule actually eliminated the urgency to ship it

---

## claim-005 — growth-optimist

**Confidence:** 0.65
**Source view(s):** view-q3BohC9N

### Claim

Even with the clarity of hindsight, I still see the commendable ambition behind ADR 28. The initiative to tackle cluster overload by proactively managing errored SnapshotEnvironmentBindings was a bold step towards operational excellence and efficient resource utilization. This ADR embodied a growth mindset, seeking to innovate and optimize our infrastructure. While the 5-minute heuristic, intended as a swift safeguard, proved too blunt an instrument for the nuanced reality of diverse provisioning times, its failure is not a mark against the *spirit* of rapid iteration and resource stewardship. It highlights the dynamic nature of our environment, where adaptive strategies are paramount, and the 'right' heuristic is often a moving target discovered through brave experimentation. This experience underscores a key principle: innovation often involves calculated risks, and learning from missteps is where true growth lies. ADR 28 provided invaluable data, prompting the subsequent refinement in ADR 32. It taught us that while aggressive resource management is vital for scaling, the mechanisms must be sophisticated enough to account for the inherent variability in complex systems. The learning here is not about the failure of the idea, but about the continuous process of discovery and adaptation required to build robust, scalable systems.

### Pros

- ADR 28 proposed a 5-minute timeout for SnapshotEnvironmentBindings with an ErrorOccurred condition to prevent cluster overload.
  - evidence: ADR 28 proposed a 5-minute timeout for SnapshotEnvironmentBindings with an ErrorOccurred condition to prevent cluster overload. (vault://konflux-adr-0028.md)
- The ADR acknowledged that environments taking a long time to provision might be cleaned up erroneously.
  - evidence: The ADR acknowledged that environments taking a long time to provision might be cleaned up erroneously. (vault://konflux-adr-0028.md)
- The issue was a stopgap measure tracked by RHTAP-1530 for a generic solution.
  - evidence: The issue was a stopgap measure tracked by RHTAP-1530 for a generic solution. (vault://konflux-adr-0028.md)

### Cons

- Underestimation of provisioning time variability across different environment types.
- Aggressive automated cleanup leading to developer friction and potential data loss for legitimate, slow-provisioning environments.
- Technical debt incurred by implementing a stopgap measure that masked deeper architectural issues (as hinted by RHTAP-1530).
- Fragile: A fixed-duration heuristic is a sufficient mechanism for managing dynamic resource provisioning states.
- Fragile: The perceived immediate threat of cluster overload outweighs the risk of premature termination of slow but valid operations.

---

## claim-006 — growth-optimist

**Confidence:** 0.64
**Source view(s):** view-ddyw7LE3

### Claim

The failure most likely traces back to `asm-pWDNprSX`. We bet that five minutes was a meaningful dividing line between broken and merely delayed, but that heuristic was too static for a system whose provisioning time can stretch under cluster pressure, quota contention, image pull latency, or environment-specific variance. Twelve months later, the failure mode is straightforward: healthy SnapshotEnvironmentBindings aged into the delete bucket, tests restarted unnecessarily, and the platform began generating churn in the name of preventing churn.

What makes `asm-pWDNprSX` especially vulnerable is that the design did not actually identify unrecoverable states. It started from `ErrorOccured=true` by default and only cleared that state when the environment became available. In effect, the controller timed all not-yet-ready SEBs against a blunt wall clock. That means the assumption was doing more than balancing a tradeoff; it was standing in for real failure detection, and once that assumption slipped, the whole cleanup policy became noisy and self-defeating.

The optimistic read is that the instinct was right: protect the cluster and keep integration tests from getting stuck forever. But the failed version likely stayed too global and too manual. The ADR itself admits slow environments may be cleaned up erroneously, and the escape hatch is a pull request to tune the threshold. If this idea failed, it failed because `asm-pWDNprSX` converted uncertainty into deletion without fast feedback, environment-aware thresholds, or richer provisioning signals. The upside-seeking move was valid; the implementation bet was just too brittle.

### Pros

- The ADR says the integration service will treat SEBs with `ErrorOccured=true` and a `LastUpdateTime` older than five minutes as unrecoverable and clean them up.
  - evidence: The ADR says the integration service will treat SEBs with `ErrorOccured=true` and a `LastUpdateTime` older than five minutes as unrecoverable and clean them up. (citation: konflux-adr-0028 Decision section)
- The ADR states that `ErrorOccured` is set to `true` by default and only set to `false` when the environment becomes available.
  - evidence: The ADR states that `ErrorOccured` is set to `true` by default and only set to `false` when the environment becomes available. (citation: konflux-adr-0028 Decision section)
- The consequence explicitly admits that environments taking a long time to provision may be cleaned up erroneously.
  - evidence: The consequence explicitly admits that environments taking a long time to provision may be cleaned up erroneously. (citation: konflux-adr-0028 Consequence section)
- The ADR describes the change as a stopgap while a generic solution for detecting provisioning errors is designed.
  - evidence: The ADR describes the change as a stopgap while a generic solution for detecting provisioning errors is designed. (citation: konflux-adr-0028 Footnotes section)

### Cons

- `asm-pWDNprSX` fails because a fixed five-minute timeout captures normal provisioning variance rather than unrecoverable failure, causing deletion of healthy but slow SEBs.
- The policy requires threshold changes by pull request, so learning is slow and global; repeated misclassification can erode trust, amplify retries, and recreate cluster pressure indirectly.
- Fragile: My main critique weakens sharply if telemetry showed that healthy SEBs almost never exceeded five minutes before becoming available.
- Fragile: The stopgap may have been strategically successful if it materially reduced stuck tests and overload during a short bridge period before ADR 32 replaced it.

---
