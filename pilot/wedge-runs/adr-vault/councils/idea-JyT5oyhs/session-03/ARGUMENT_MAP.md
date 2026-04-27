---
type: argument_map
session_id: sess-QfPs1Wyo
generated_at: '2026-04-26T23:51:21.072Z'
---
# Argument map — session sess-QfPs1Wyo

**Idea:** konflux-adr-0014 — ADR 14. Let Pipelines Proceed (konflux-ci/architecture)
**Generated:** 2026-04-26T23:51:21.072Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.85
**Source view(s):** view-3idR6AEw

### Claim

The central tenet of ADR 14 – allowing pipelines to 'succeed' despite critical scanning and linting failures – is a catastrophic design flaw, directly stemming from the flawed assumption that users will adequately heed `TEST_OUTPUT`. This approach actively cultivates complacency. By presenting a green checkmark for a pipeline that has identified significant issues, we are creating a 'success theater' where genuine problems are masked. Developers, pressured by release cycles, will inevitably default to trusting the primary pipeline status, ignoring the buried warnings in `TEST_OUTPUT`. This isn't merely 'misleading' or 'confusing'; it's a deliberate design choice that *enables* the propagation of vulnerabilities and quality regressions into production, precisely the opposite of what a robust CI system should achieve. The ADR's own 'Consequences' section, admitting users 'may be misled or confused,' is a glaring admission of this inherent risk, which we assume has manifested into a full failure over the past twelve months. The assumption that clarity is maintained and users are not misled is fundamentally naive from a risk management perspective.

### Pros

- Decision: All scanning and linting TaskRuns should *succeed* even if they find problems in the content they are evaluating. Use the `TEST_OUTPUT` result convention from [ADR-0030] to expose those results and render them for users.
  - evidence: Decision: All scanning and linting TaskRuns should *succeed* even if they find problems in the content they are evaluating. Use the `TEST_OUTPUT` result convention from [ADR-0030] to expose those results and render them for users. (konflux-adr-0014, Decision section)
- Consequences: Users should find that even if their scanners find problems, they can still build, test, and deploy to lower [Environments]. Without special treatment in [STONE-459], users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood.
  - evidence: Consequences: Users should find that even if their scanners find problems, they can still build, test, and deploy to lower [Environments]. Without special treatment in [STONE-459], users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood. (konflux-adr-0014, Consequences section)

### Cons

- Propagation of critical vulnerabilities and quality regressions into production.
- Erosion of trust in CI/CD pipeline status indicators.
- Creation of a false sense of security for development teams.
- Over-reliance on downstream, potentially less effective, compliance mechanisms.
- Fragile: The assumption that scanning/linting tasks succeeding even when they find problems communicates issues clearly without misleading users about pass/fail semantics in their CI dashboard.

---

## claim-002 — risk-pessimist

**Confidence:** 0.71
**Source view(s):** view-PdJV9fNh

### Claim

asm-aZfkCJC6 is the likeliest point of failure. Twelve months later, the postmortem says the platform overloaded the meaning of success: a green TaskRun no longer meant "no important problems found," it meant "the scanner executed and wrote something to TEST_OUTPUT." That semantic substitution is fragile because most humans, dashboards, notifications, and downstream automations privilege status before auxiliary results. If the main CI surface says success while serious findings are buried in a convention-specific result channel, the system is training users to underreact.

My revised view is that Pass 1 was directionally right, but incomplete. The failure is not only user confusion; it is governance ambiguity. Once a scanner is forbidden from failing the pipeline, severity handling moves into conventions, renderers, policy engines, and later promotion controls. That creates too many interpretation layers. A malformed `TEST_OUTPUT`, a partial renderer outage, an unrecognized scanner schema, or a mismatch between what developers saw and what enterprise-contract later enforces can all produce the same operational outcome: teams believe they are progressing normally until a later gate blocks them, or worse, a lower environment normalizes known-bad artifacts.

The strongest counter-argument is that non-blocking scans can improve throughput without harming safety if the UI is excellent and production gating is strict. I did not give that enough weight in Pass 1. But that defense still depends on asm-aZfkCJC6 holding in practice, and the ADR itself concedes the main hazard: users may be misled or confused without special treatment. In a pessimistic read, that is not a minor caveat; it is an admission that the design works only if presentation, adoption, and downstream enforcement are all unusually disciplined.

So the 12-month failure story is: the team optimized away immediate friction, but replaced one obvious failure mode with several quieter ones. Findings were seen too late, trusted too little, or interpreted inconsistently. The decision did let pipelines proceed, but it also made non-compliance operationally deniable until the most expensive moment.

### Pros

- The ADR explicitly requires scanning and linting TaskRuns to succeed even when they find problems.
  - evidence: The ADR explicitly requires scanning and linting TaskRuns to succeed even when they find problems. (konflux-adr-0014: Decision)
- The ADR relies on the `TEST_OUTPUT` result convention to expose findings rather than pipeline failure semantics.
  - evidence: The ADR relies on the `TEST_OUTPUT` result convention to expose findings rather than pipeline failure semantics. (konflux-adr-0014: Decision; ADR-0030 citation)
- The ADR acknowledges a risk that users may be misled or confused if tasks appear to succeed while reporting errors underneath.
  - evidence: The ADR acknowledges a risk that users may be misled or confused if tasks appear to succeed while reporting errors underneath. (konflux-adr-0014: Consequences)
- The intended safety model shifts protection of production to enterprise-contract rather than scanner task failure.
  - evidence: The intended safety model shifts protection of production to enterprise-contract rather than scanner task failure. (konflux-adr-0014: Context)

### Cons

- Green TaskRun semantics cause users and automations to treat serious findings as non-urgent, reducing remediation rates.
- Severity interpretation drifts across scanner output, `TEST_OUTPUT` rendering, and enterprise-contract enforcement, causing surprise late-stage blocks or silent misses.
- Fragile: The stance weakens substantially if Konflux surfaces `TEST_OUTPUT` findings as prominently as failure states across dashboards, alerts, and APIs.
- Fragile: The argument depends on later production gating being imperfectly correlated with what developers saw earlier; strong correlation would reduce the downside.

---

## claim-003 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-VonbeYjh

### Claim

Pass 1 identified a real risk, but overstated certainty of failure. The assumption—that task success + metadata visibility = clear user communication without misled expectations—is load-bearing and fragile, especially if STONE-459 visualization was weak or adoption lagged. But the decision didn't uniformly fail. What actually happened likely depends on three variables I ignored: (1) whether enterprise-contract gates were enforced in practice (existing, not future), (2) whether STONE-459 was eventually built well or remained vaporware, (3) whether target users (high-compliance orgs) actually configured strict policies downstream. If all three answered poorly: Pass 1's narrative holds—security incidents, green-pipeline cargo-cult behavior, non-compliant code shipped. If even one was handled well (e.g., enterprise-contract was properly deployed), the decision could work despite the assumption's fragility. The alternative (blocking scanners by default) creates its own failure mode: teams disable scanning, ignore results, reach integration testing less often—which may increase undetected issues. Pass 1 claimed the decision 'traded certainty of blocked pipeline for false hope'—but blocking pipelines on *every* scan finding (especially high false-positive rates in SAST/clair) is itself a form of technical debt disguised as rigor. The real risk isn't the decision; it's weak follow-through on downstream enforcement and user education.

### Pros

- ADR references STONE-459 as future work for user-facing rendering; unclear if ever delivered
  - evidence: ADR references STONE-459 as future work for user-facing rendering; unclear if ever delivered (ADR section: 'Without special treatment in [STONE-459], users may be misled or confused')
- Enterprise-contract mentioned as existing mechanism but downstream enforcement is optional, not mandatory
  - evidence: Enterprise-contract mentioned as existing mechanism but downstream enforcement is optional, not mandatory (ADR section: 'protects production from non-compliant builds via mechanisms in the [enterprise contract]')
- No outcome data provided on actual security incidents or user compliance behavior post-decision
  - evidence: No outcome data provided on actual security incidents or user compliance behavior post-decision (Decision corpus—no refutation outcomes logged)

### Cons

- STONE-459 visualization was never built or built with poor UX, leaving scan results buried and unactionable
- Enterprise-contract policy was optional; teams configuring weak or no policies allowed non-compliant builds to production
- Developers defaulted to 'green = safe' heuristic despite metadata, ignoring scan results in TEST_OUTPUT
- High false-positive rates in SAST/clair caused alert fatigue; users tuned out warnings over time
- No mandatory enforcement mechanism at image-build time; scanning was advisory-only in practice
- Fragile: Clear communication through metadata + downstream processes depends entirely on those processes being built well and adopted—both unknown
- Fragile: Exit-code semantics are sticky in CI/CD muscle memory; making tasks succeed when they find problems requires strong UX to override expectations
- Fragile: The assumption bundles two claims: (1) non-blocking scans are safe if results are visible, (2) users will act on visible results. First is design philosophy; second is behavioral assumption with weak evidence
- Fragile: Enterprise-contract was framed as 'protection' but only works if configured and enforced; optional enforcement is no enforcement

---

## claim-004 — growth-optimist

**Confidence:** 0.60
**Source view(s):** view-tFGWiPZf

### Claim

Twelve months on, looking back at 'Let Pipelines Proceed,' the vision remains undeniably powerful. The intent to accelerate developer velocity by decoupling progress from immediate compliance perfection was, and remains, a stroke of genius. This ADR unlocked tremendous potential by ensuring that critical feedback loops weren't choked by the friction of scanning and linting failures, allowing developers to iterate rapidly on features and integration testing. The `TEST_OUTPUT` convention, in its ideal form, was meant to be a sophisticated signal, providing rich diagnostic data without the blunt instrument of a pipeline-breaking error. If this vision has indeed faltered, it points not to a flaw in the ADR's core philosophy, but to the challenges of execution and adoption. It suggests that the downstream tooling or user enablement required to truly *leverage* this advanced signaling mechanism may not have fully matured, leaving the brilliant intent partially unrealized and, regrettably, open to misinterpretation.

The critical insight was that progress and feedback could coexist, fostering a more dynamic development environment. The ADR aimed to shift the paradigm from 'fail fast and stop' to 'inform and continue,' recognizing that developer momentum is a precious commodity. If this has backfired, it's likely because the *communication* layer – translating raw `TEST_OUTPUT` into actionable understanding for every developer – proved more complex than anticipated. The ADR's reliance on the enterprise contract and [STONE-459] to protect production, while sound in principle, might have been insufficient if the clarity of early warnings was compromised. This is a classic case where the ambitious leap forward requires equally ambitious support systems, and perhaps those support systems faced unforeseen hurdles. The core tenet of enabling forward momentum, however, remains a vital principle for any growth-oriented engineering culture.

### Pros

- The ADR 'Let Pipelines Proceed' assumes that scan/lint tasks succeeding even when they find problems, with results exposed via TEST_OUTPUT, communicates issues clearly without misleading users about pass/fail semantics in their CI dashboard.
  - evidence: The ADR 'Let Pipelines Proceed' assumes that scan/lint tasks succeeding even when they find problems, with results exposed via TEST_OUTPUT, communicates issues clearly without misleading users about pass/fail semantics in their CI dashboard. (ADR 14: assumption asm-aZfkCJC6)
- The ADR acknowledges a risk that users may be misled or confused if tasks appear to succeed but report errors under the hood, relying on downstream mechanisms for mitigation.
  - evidence: The ADR acknowledges a risk that users may be misled or confused if tasks appear to succeed but report errors under the hood, relying on downstream mechanisms for mitigation. (ADR 14: Consequences section)

### Cons

- Failure of downstream tooling to adequately present or interpret `TEST_OUTPUT`, leading to user confusion.
- Developers prioritizing pipeline progression over addressing issues highlighted in `TEST_OUTPUT`, creating technical debt or security vulnerabilities that bypass the enterprise contract.
- Underestimation of the behavioral change required from developers to actively seek out and act on non-blocking feedback.
- Fragile: The `TEST_OUTPUT` convention provides a clear and unambiguous communication channel for scan/lint issues.
- Fragile: Developers will inherently understand and act upon non-blocking feedback mechanisms like `TEST_OUTPUT` without significant external guidance or enhanced UI.

---

## claim-005 — growth-optimist

**Confidence:** 0.48
**Source view(s):** view-BxcckRi8

### Claim

Pass 1 conflates implementation delay with assumption failure. The decision was sound—don't block devs on *findings*, gate production on *policy*. That's sophisticated. The failure wasn't the principle; it was that two mechanisms needed coupling and they shipped async. Enterprise-contract gating *was* the real boundary—not TEST_OUTPUT clarity. If gating never materialized or was optional, that's the broken dependency, not the core insight. Scanning findings in TEST_OUTPUT are *discoverable* if someone (dashboard, CLI, policy) forces the conversation. Pass 1 assumes silence means the convention failed; I'd bet it means the enforcement layer never existed. Developers would absolutely drill into TEST_OUTPUT if production deployments depended on it. The cognitive burden is real, but it's not 'pass means safe'—it's 'pass means local progress; production requires explicit review.' That's a clear contract if it's *wired in*. The assumption didn't fail; the execution plan did. Shorter: ADR-0014 is right, Konflux just didn't build enterprise-contract with teeth before shipping it.

### Pros

- Tekton PipelineRun failure is all-or-nothing; tasks that fail cause the whole run to fail
  - evidence: Tekton PipelineRun failure is all-or-nothing; tasks that fail cause the whole run to fail (ADR-0014 context: 'in Tekton, a failing TaskRun causes the whole PipelineRun to fail')
- ADR-0014 explicitly ties to ADR-0032 (Decoupling Deployment) and enterprise-contract architecture, suggesting production gating was the intended mechanism
  - evidence: ADR-0014 explicitly ties to ADR-0032 (Decoupling Deployment) and enterprise-contract architecture, suggesting production gating was the intended mechanism (ADR-0014 Relates-to: ADR 32. Decoupling Deployment)
- The decision was made May 2022 and documented retroactively Jan 2023, suggesting it was an unwritten principle for ~8 months before formalization
  - evidence: The decision was made May 2022 and documented retroactively Jan 2023, suggesting it was an unwritten principle for ~8 months before formalization (ADR-0014: 'We originally made this decision verbally in May of 2022, and have been operating with it as an unwritten principle')

### Cons

- Enterprise-contract gating was never implemented as mandatory; production checks were optional or bypassable, collapsing the boundary assumption
- Teams abandoned TEST_OUTPUT convention mid-flight and reverted to fail-fast scanning because the UX tax (checking hidden results) was too high under deadline pressure
- Developers genuinely couldn't act on scanning findings (no time to remediate security issues mid-sprint), so TEST_OUTPUT became noise instead of signal
- Dashboard integration never shipped; TEST_OUTPUT convention existed but was invisible without explicit log inspection; findings were exposed but undiscoverable
- Fragile: Exposing findings via TEST_OUTPUT is sufficient to communicate issues without misleading users (assumes downstream visibility tooling exists or will exist)
- Fragile: Enterprise-contract will enforce production gating with teeth (assumes it was built and made mandatory, not optional)
- Fragile: Developers will systematically check TEST_OUTPUT results even for passing tasks (assumes UX/alerts make it unmissable or habit-forming)
- Fragile: Teams value local iteration progress highly enough to tolerate inverted pass/fail semantics (assumes cultural buy-in to new mental model)

---

## claim-006 — growth-optimist

**Confidence:** 0.56
**Source view(s):** view-kA3QZEYA

### Claim

I still think the failure most likely centered on `asm-aZfkCJC6`, but I would revise the diagnosis slightly. The upside thesis was real: letting pipelines proceed was a smart attempt to preserve developer flow, keep lower-environment learning loops alive, and shift governance to a later, more appropriate control point. If this idea failed 12 months later, it was probably because that elegant separation between velocity and compliance never became legible enough in day-to-day product behavior.

Attacking `asm-aZfkCJC6` directly: the assumption was that scanner and linter tasks could report success, expose findings through `TEST_OUTPUT`, and still communicate risk clearly enough that users would not be misled by green CI semantics. That is where the design likely broke. The platform asked users to treat results payloads as the real signal while the dashboard still advertised success as the dominant signal. In a busy delivery system, teams optimize for what is visible, sortable, automatable, and culturally reinforced. If "success with findings" looked too much like plain success, the assumption collapsed under normal human behavior rather than technical failure.

What makes this a particularly painful failure mode is that the original instinct was probably net-positive at first. Teams likely moved faster, got more builds into test, and appreciated not being blocked by every scanner complaint. But that very success may have hidden the accumulating cost: findings became ambient noise, lower environments filled with artifacts carrying unresolved issues, and enforcement moved to a later stage where remediation was slower and more political. Instead of friction disappearing, it got deferred and concentrated.

The counterfactual I did not emphasize enough in Pass 1 is that the problem may not have been "letting pipelines proceed" at all. The failure could have come from incomplete productization around it: weak result rendering, poor notification design, missing severity thresholds, or no distinct state like "proceeded with findings." In other words, the growth move may still have been right; the missing piece was a better expression layer that turned permissive execution into a visible, governable intermediate state rather than a semantic alias for green.

### Pros

- The ADR explicitly decided that scanning and linting TaskRuns should succeed even when they find problems.
  - evidence: The ADR explicitly decided that scanning and linting TaskRuns should succeed even when they find problems. (citation: konflux-adr-0014 Decision section)
- The ADR anticipated a user-understanding risk by noting that tasks may appear to succeed while really reporting errors under the hood unless specially rendered.
  - evidence: The ADR anticipated a user-understanding risk by noting that tasks may appear to succeed while really reporting errors under the hood unless specially rendered. (citation: konflux-adr-0014 Consequences section)
- The stated product goal was to avoid blocking build, test, and lower-environment deployment, while relying on enterprise contract to protect production from non-compliant builds.
  - evidence: The stated product goal was to avoid blocking build, test, and lower-environment deployment, while relying on enterprise contract to protect production from non-compliant builds. (citation: konflux-adr-0014 Context section)

### Cons

- Green TaskRun semantics trained users and tooling to ignore scanner findings carried in `TEST_OUTPUT`.
- Compliance pain was deferred downstream to enterprise contract or promotion stages, where fixes became slower and more disruptive.
- Fragile: The failure may have been caused less by the ADR's core policy and more by the absence of a first-class "proceeded with findings" UX state.

---
