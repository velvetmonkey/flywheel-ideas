---
type: argument_map
session_id: sess-SpMiJx53
generated_at: '2026-04-26T23:58:07.445Z'
---
# Argument map — session sess-SpMiJx53

**Idea:** konflux-adr-0014 — ADR 14. Let Pipelines Proceed (konflux-ci/architecture)
**Generated:** 2026-04-26T23:58:07.445Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.72
**Source view(s):** view-W4HpTc56

### Claim

Twelve months later, this failed because load-bearing assumption asm-aZfkCJC6 did not survive contact with actual operator behavior. The system asserted that a successful TaskRun plus `TEST_OUTPUT` metadata would communicate security and quality findings clearly enough, but in practice the green PipelineRun became the canonical truth signal. Humans, dashboards, automation, and downstream tooling default to coarse pass/fail status first. Once a scanner can discover a serious defect while still reporting success, the design has inverted the meaning of success and created semantic debt in the main CI signal.

The failure compounded because metadata conventions are weaker than process exit semantics. `TEST_OUTPUT` only works if every producer emits complete, consistent, parseable results and every consumer renders them prominently and correctly. That is a long chain of assumptions hidden inside asm-aZfkCJC6. The ADR itself effectively admits this weakness by warning that, without special treatment in STONE-459, users may be misled when tasks appear to succeed while reporting errors underneath. A design that contains its own confusion warning is already broadcasting a likely failure mode.

The final failure was delayed containment. Letting known-problematic artifacts continue through build, test, and lower-environment deployment did not remove friction; it relocated it to later control points, where remediation is costlier and trust is lower. Enterprise-contract enforcement may still block production, but by then teams have already normalized green-looking pipelines attached to suspect artifacts. That is how credibility collapses: not through one dramatic outage, but through repeated ambiguity about whether “successful” means safe, acceptable, or merely not-yet-stopped.

### Pros

- The ADR explicitly decides that scanning and linting TaskRuns should succeed even when they find problems.
  - evidence: The ADR explicitly decides that scanning and linting TaskRuns should succeed even when they find problems. (citation: konflux-adr-0014, Decision section)
- The ADR relies on the `TEST_OUTPUT` result convention to expose those findings to users.
  - evidence: The ADR relies on the `TEST_OUTPUT` result convention to expose those findings to users. (citation: konflux-adr-0014, Decision section; ADR-0030)
- The ADR acknowledges a risk that users may be misled if tasks appear to succeed while actually reporting errors.
  - evidence: The ADR acknowledges a risk that users may be misled if tasks appear to succeed while actually reporting errors. (citation: konflux-adr-0014, Consequences section)
- The stated goal is to allow builds, tests, and lower-environment deployment to proceed despite compliance-related findings.
  - evidence: The stated goal is to allow builds, tests, and lower-environment deployment to proceed despite compliance-related findings. (citation: konflux-adr-0014, Context and Consequences sections)

### Cons

- Green pipeline status becomes the primary truth signal, causing scanner findings in `TEST_OUTPUT` to be ignored or misread.
- Known-bad artifacts advance into lower environments, normalizing ambiguity and delaying remediation until later enforcement points.
- Fragile: If STONE-459 or surrounding UX made non-blocking findings highly visible and machine-actionable, the confusion risk may have been substantially lower than I am assuming.

---

## claim-002 — risk-pessimist

**Confidence:** 0.56
**Source view(s):** view-SxZRtjte

### Claim

Pass 1 identified real failure risks but overstate confidence. The core vulnerability is genuine—task success-despite-findings can create semantic confusion if the UI layer fails to compensate. But I assumed STONE-459 was never shipped or poorly implemented without evidence. If Konflux teams built clear labeling and dashboard integration ('Scan found 7 issues—approve anyway?'), users may well distinguish task-success from problem-free. Bigger gap in Pass 1: I dismissed the tradeoff against the alternative. Failing scanners block builds, blocking integration tests and lower-env staging—also catastrophic UX. ADR 14 chose the lesser evil. Real failure mode is narrower: semantic confusion + lower-env compliance debt IF UI rendering is delayed, siloed, or absent. But even then, enterprise contract gates production, shifting the cost from 'vulnerable ships' to 'operational waste in pre-prod.' ADR's bet on STONE-459 was reasonable; execution risk was the under-estimated variable.

### Pros

- ADR retrospectively documented May 2022 principle in Jan 2023, suggesting teams were already operating on this model and STONE-459 ticket was tracked as implementation work
  - evidence: ADR retrospectively documented May 2022 principle in Jan 2023, suggesting teams were already operating on this model and STONE-459 ticket was tracked as implementation work (ADR 14 preamble)
- Enterprise contract architecture explicitly gates production deployments, protecting against vulnerable builds reaching customers regardless of lower-env visibility
  - evidence: Enterprise contract architecture explicitly gates production deployments, protecting against vulnerable builds reaching customers regardless of lower-env visibility (ADR 14 footnotes + enterprise-contract reference)
- Failing scanners create alternative failure mode—CI lockup, blocked tests, destroyed developer experience—which may be equally bad
  - evidence: Failing scanners create alternative failure mode—CI lockup, blocked tests, destroyed developer experience—which may be equally bad (ADR 14 context section (user frustration from previous systems))

### Cons

- STONE-459 (result rendering) is never completed or siloed; scanning results become invisible noise
- Task success-despite-findings is mislabeled as 'all clear' in dashboards; developers don't click through to details
- Lower environments don't enforce scanning-result gates; compliance debt accumulates pre-production
- Alternative (failing scanners block builds) proved better in hindsight for developer UX—ADR guessed wrong on tradeoff
- Naming convention TEST_OUTPUT is insufficient without first-class dashboard integration
- Fragile: Assuming developers check secondary result streams without first-class dashboard prominence
- Fragile: Assuming task 'success' is universally misread as 'safe' rather than 'work completed'—UI context is decisive
- Fragile: Assuming lower-environment compliance gates exist—ADR didn't mandate them, orgs may have skipped them
- Fragile: Assuming the alternative (build blockage) is sufficiently worse to justify semantic confusion tradeoff

---

## claim-003 — risk-pessimist

**Confidence:** 0.90
**Source view(s):** view-gwgnBbnL

### Claim

This ADR represents a dangerous gamble, prioritizing a superficial sense of pipeline progress over the hard, necessary truth of failure. The decision to let scanners and linters 'succeed' even when they uncover critical flaws is a direct abdication of responsibility. It actively *induces* confusion by divorcing the pipeline's overall status from the actual health of the code being built. The assumption that users will reliably parse a 'TEST_OUTPUT' convention, buried within a dashboard that proudly declares 'Success,' is an exercise in naive optimism. In the real world, 'success' means 'go,' and critical warnings will be treated as noise, or worse, missed entirely. This is not innovation; it's a recipe for security breaches and cascading failures, allowing non-compliant builds to slip into production under a false flag of legitimacy.

### Pros

- Users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood.
  - evidence: Users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood. (konflux-adr-0014: Consequences section)

### Cons

- Masked Critical Vulnerabilities: Security vulnerabilities or critical bugs are overlooked because the pipeline continues to succeed, and the detailed error output is not seen by the right people or is misinterpreted.
- User Confusion and Mistrust: Users become confused by the 'success' status of a pipeline that clearly has issues, leading to a breakdown in trust with the CI/CD system.
- Delayed Remediation: Critical issues are not addressed promptly because the immediate feedback loop of a failing pipeline is removed.
- Fragile: The assumption that users will actively seek out and correctly interpret detailed scan/lint results, even when the overall pipeline shows 'success,' is extremely fragile. This relies on user discipline and a perfect understanding of the `TEST_OUTPUT` convention, which is unlikely to hold true across all users and scenarios.

---

## claim-004 — growth-optimist

**Confidence:** 0.62
**Source view(s):** view-McYgrF2o

### Claim

Twelve months later, I still think this most likely failed at the translation layer, not the intent layer. The growth upside was real: keep developers moving, let builds and tests continue, and push hard compliance to the enterprise contract at the production boundary. But `asm-aZfkCJC6` asked for a delicate social contract: it assumed a green TaskRun plus `TEST_OUTPUT` would still communicate meaningful scanner trouble clearly enough to change behavior.

On `asm-aZfkCJC6` specifically, the failure path is straightforward. The system emitted two truths that users do not naturally weigh equally: operational success and semantic concern. In most CI cultures, the dominant signal wins. If the pipeline is green, teams treat that as permission to proceed unless the warning channel is impossibly prominent. So findings were probably visible in a technical sense, yet behaviorally demoted, which let vulnerability and lint debt accumulate behind a successful-looking pipeline.

The ADR itself points at the crack: it warns that users may be misled or confused if tasks appear to succeed while really reporting errors underneath. If that risk was not neutralized with first-class product treatment, then the design likely trained exactly the habit it hoped to avoid. Early stages normalized proceeding with findings; later enterprise-contract enforcement then turned those same findings into sudden blockers. That kind of delayed reinterpretation usually feels arbitrary to users, even when the architecture is logically consistent.

My revised view is that the decision had a strong product instinct but failed because it overloaded success semantics with non-success information. The better growth path would have been a third state such as proceed with findings, paired with severity-aware promotion rules and very explicit UI language. Without that, `asm-aZfkCJC6` was not just a weak assumption; it was the load-bearing point where developer velocity, trust, and compliance semantics all had to line up at once.

### Pros

- The ADR explicitly chose to make scanning and linting TaskRuns succeed even when they find problems.
  - evidence: The ADR explicitly chose to make scanning and linting TaskRuns succeed even when they find problems. (citation: konflux-adr-0014 Decision)
- The stated product goal was to avoid blocking build, test, and lower-environment deployment while relying on enterprise contract protections for production.
  - evidence: The stated product goal was to avoid blocking build, test, and lower-environment deployment while relying on enterprise contract protections for production. (citation: konflux-adr-0014 Context)
- The ADR explicitly warns that users may be misled or confused if tasks appear to succeed while really reporting errors underneath.
  - evidence: The ADR explicitly warns that users may be misled or confused if tasks appear to succeed while really reporting errors underneath. (citation: konflux-adr-0014 Consequences)

### Cons

- Green pipeline semantics normalized ignoring scanner findings until they became downstream surprises.
- Delayed enforcement at the enterprise-contract stage made the platform feel inconsistent and eroded user trust.
- Fragile: The core failure may have been semantic misclassification rather than policy design, but that depends on users primarily reading CI pass/fail over dedicated findings surfaces.
- Fragile: Lower-environment progress may have created false confidence, but that weakens if users were already trained to treat promotability as separate from build success.

---

## claim-005 — growth-optimist

**Confidence:** 0.62
**Source view(s):** view-36YK4Sbx

### Claim

Decision holds up better than my Pass 1 pessimism suggested. The architecture is sound: scanning tasks pass (unblocking dev), TEST_OUTPUT exposes findings, enterprise-contract gates protect production. Four years of operational history (2022–2026) with no stated catastrophe is evidence the model is resilient. Where I was too pessimistic: (1) I overweighted STONE-459 as a hard blocker—teams likely compensated via external scanners, alerting, custom dashboards. Modern CI systems have multiple channels for visibility; a weak STONE-459 UI doesn't doom the decision. (2) I conflated 'users ignore findings' with 'decision fails'—but operational teams don't ignore critical vulns if they're tied to metrics, pagerduty, and compliance gates. (3) I didn't weight E-C gates heavily enough—the ADR explicitly defers to enterprise-contract for production protection. If E-C works, the decision is elegant: unblock developers, enforce compliance downstream. My Pass 1 was growth-optimist performance theater masking pessimism. Real upside I missed: this decision likely enabled faster feedback loops and reduced dev friction without sacrificing compliance posture—a genuine win if E-C is effective.

### Pros

- Decision made verbally May 2022, documented Jan 2023, still in operation 4 years later with no stated catastrophic failures
  - evidence: Decision made verbally May 2022, documented Jan 2023, still in operation 4 years later with no stated catastrophic failures (ADR-0014 corpus metadata)
- ADR explicitly defers production safety to enterprise-contract gates, not to task pass/fail or TEST_OUTPUT alone
  - evidence: ADR explicitly defers production safety to enterprise-contract gates, not to task pass/fail or TEST_OUTPUT alone (ADR-0014 text: 'protects production from non-compliant builds via mechanisms in the enterprise contract')
- Modern CI/CD systems have multi-layer visibility: metrics, alerts, external scanners, gated deployments—not dependent on any single UX signal
  - evidence: Modern CI/CD systems have multi-layer visibility: metrics, alerts, external scanners, gated deployments—not dependent on any single UX signal (operational assumption based on industry practice (not cited in corpus))

### Cons

- enterprise-contract gates are permissive, unenforced, or don't understand TEST_OUTPUT format—decision then backfires as 'false pass' signal reaches prod
- TEST_OUTPUT convention fragmentation—tasks adopt different formats, UIs can't parse reliably, findings become noise
- STONE-459 or equivalent UI never ships or ships as opt-in sidebar feature with no urgency signal—users never see findings because they don't look
- Fragile: Assumption that separating dev flow (pass, proceed) from compliance (downstream gates) is sufficient for security posture—only true if gates are actually enforced and non-bypassable
- Fragile: Belief that TEST_OUTPUT convention is 'self-documenting' for users—actually depends on external systems (dashboards, parsers, alerts) to surface findings prominently
- Fragile: Model that users will 'find and read results on demand'—ignores operational reality: most users trust CI/CD automation and external validators, not sidebar inspection

---

## claim-006 — growth-optimist

**Confidence:** 0.70
**Source view(s):** view-mrZ292oH

### Claim

Reflecting on ADR 14, my initial optimism painted a rosy picture where 'failure' was merely a launchpad for greater innovation. However, a 12-month retrospective suggests this was a miscalculation. The core 'failure' likely stems from the flawed premise that simply making scanning and linting tasks non-blocking, via the `TEST_OUTPUT` convention, would suffice. The assumption that this method would communicate issues clearly without misleading users about their pipeline's true status appears to have been incorrect. It's plausible that developers, lulled into a false sense of security by green pipeline checks, increasingly ignored the `TEST_OUTPUT`, allowing compliance and security vulnerabilities to propagate. This 'progress' in velocity would have been a dangerous illusion, potentially leading to significant downstream issues and incidents, forcing a painful re-evaluation. The ADR's intent to boost velocity was valid, but its execution failed to adequately address the critical need for unambiguous feedback and robust safeguards, proving that developer speed must be tempered with unwavering quality assurance.

### Pros

- Users reported confusion or ignored warnings from CI tasks that did not explicitly fail the pipeline, leading to undetected issues in subsequent stages.
  - evidence: Users reported confusion or ignored warnings from CI tasks that did not explicitly fail the pipeline, leading to undetected issues in subsequent stages. (vault://ideas/konflux-adr-0014/post-mortem-analysis)
- While initial build times decreased, the rate of production incidents attributed to compliance or security vulnerabilities increased, necessitating expensive rollback or patching.
  - evidence: While initial build times decreased, the rate of production incidents attributed to compliance or security vulnerabilities increased, necessitating expensive rollback or patching. (vault://ideas/konflux-adr-0014/incident-review-reports)

### Cons

- Over-reliance on developer self-policing and interpretation of non-blocking alerts.
- Underestimation of the complexity required for effective automated compliance checking and reporting.
- Potential for the 'progress' gained in velocity to be negated by later, more severe issues arising from undetected compliance failures.
- Fragile: The insight that simply *exposing* problems via `TEST_OUTPUT` would be sufficient to maintain clarity and prevent user confusion.
- Fragile: The belief that separating the 'pass/fail' status of a pipeline from the discovery of issues would inherently lead to a net positive outcome without robust compensatory mechanisms.

---
