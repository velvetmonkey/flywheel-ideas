---
type: argument_map
session_id: sess-AUKyqF4H
generated_at: '2026-04-27T00:04:27.545Z'
---
# Argument map — session sess-AUKyqF4H

**Idea:** konflux-adr-0014 — ADR 14. Let Pipelines Proceed (konflux-ci/architecture)
**Generated:** 2026-04-27T00:04:27.545Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.52
**Source view(s):** view-V8GX6gWG

### Claim

The decision is sound *if* downstream systems work. The logic is clean: task success != code safety. Scanning tasks should complete and expose findings in TEST_OUTPUT; gates (enterprise-contract) block unsafe code before production. Users proceed to lower envs, test, fix, re-push—that's good DX. But I overestimated the risk in Pass 1. My 'semantic trap' argument assumed TEST_OUTPUT is hidden and users ignore it without evidence. The real vulnerability is simpler: the design *depends entirely on STONE-459 surfacing results prominently*. If that issue is backlogged, abandoned, or results in poor UX, the decision fails—not from inherent flaw, but from missing infrastructure. The habituation argument is speculative; I have no data that green tasks with findings create lasting blindness. The bigger risk I missed: if teams *can't easily access TEST_OUTPUT* from their normal workflow (not via deep link or JSON API), they will ignore it, not from apathy but from friction. That's not a user-behavior problem; it's a UX failure downstream.

### Pros

- ADR 14 separates task success from code safety, which is semantically cleaner than failing tasks on scan findings
  - evidence: ADR 14 separates task success from code safety, which is semantically cleaner than failing tasks on scan findings (vault://tech/flywheel/konflux-adr-0014 decision statement)
- Pre-production gates (enterprise-contract) are the real safety mechanism; proceeding to lower envs is low-risk if gates work
  - evidence: Pre-production gates (enterprise-contract) are the real safety mechanism; proceeding to lower envs is low-risk if gates work (ADR references to enterprise-contract and Environments)
- No evidence provided that users habituate to ignoring green tasks with embedded findings
  - evidence: No evidence provided that users habituate to ignoring green tasks with embedded findings (gap in ADR text and current context)

### Cons

- STONE-459 (dashboard surfacing) is deprioritized or never shipped; TEST_OUTPUT becomes de facto invisible
- No training/docs on where/how to check TEST_OUTPUT; users treat green task as genuinely safe
- Enterprise-contract has a gap (e.g., misconfigured policy); unsafe code reaches lower env before gate triggers
- Lack of audit trail; teams can't correlate TEST_OUTPUT findings with deployments for compliance
- Fragile: The decision delegates clarity to UI/UX. Without STONE-459 prominence, the convention alone communicates nothing.
- Fragile: User habituation assumes poor UI. If TEST_OUTPUT is easy to check, the risk vanishes. If it's buried, it's inevitable.
- Fragile: Enterprise-contract robustness is assumed but not discussed in this ADR. If it's brittle, the gate fails silently.

---

## claim-002 — risk-pessimist

**Confidence:** 0.66
**Source view(s):** view-mnk6wjzc

### Claim

I still read this as a semantic-integrity and control-surface risk, though less absolutely than I did in Pass 1. Forcing scanning and linting TaskRuns to go green after they discover defects deliberately breaks the normal equivalence between pipeline success and artifact acceptability. The most visible system signal now says 'proceed' at the same moment the advisory tooling is actually trying to say 'attention required.'

Assumption asm-aZfkCJC6 is the load-bearing weakness, and I would attack it directly. It assumes that exposing findings through TEST_OUTPUT communicates problems clearly enough to avoid misleading users, yet the ADR itself admits the opposite hazard: users may be confused when tasks appear to succeed while reporting errors underneath. That is not a cosmetic concern; it means the design depends on secondary presentation layers to repair a semantic distortion introduced at the execution layer.

The remaining downside is temporal as well as semantic. By allowing non-compliant artifacts to continue through build, test, and lower-environment deployment, the system shifts pain downstream and relies on enterprise-contract enforcement to recover safety later. If that later gate is strict, teams absorb rework under more schedule pressure; if it is inconsistent, green pipelines start to normalize known defects. I would only soften this stance if there were strong evidence that findings are surfaced with near-failure prominence and are usually remediated before promotion.

### Pros

- The ADR directs all scanning and linting TaskRuns to succeed even when they find problems.
  - evidence: The ADR directs all scanning and linting TaskRuns to succeed even when they find problems. (citation: ADR 14 Decision)
- The stated goal is to let users continue building, testing, and deploying to lower environments while relying on enterprise contract mechanisms to protect production.
  - evidence: The stated goal is to let users continue building, testing, and deploying to lower environments while relying on enterprise contract mechanisms to protect production. (citation: ADR 14 Context)
- The ADR explicitly warns that users may be misled or confused if tasks appear to succeed while reporting errors under the hood.
  - evidence: The ADR explicitly warns that users may be misled or confused if tasks appear to succeed while reporting errors under the hood. (citation: ADR 14 Consequences)
- The declared load-bearing assumption says TEST_OUTPUT-based reporting will communicate issues clearly without misleading users about pass/fail semantics.
  - evidence: The declared load-bearing assumption says TEST_OUTPUT-based reporting will communicate issues clearly without misleading users about pass/fail semantics. (citation: Declared assumption asm-aZfkCJC6)

### Cons

- Green pipeline status suppresses urgency around real scan findings until they reappear as late-stage release blockers.
- Humans and automation that read pass/fail state but not TEST_OUTPUT can miss or normalize security and compliance defects.
- Fragile: This stance weakens materially if Konflux elevates TEST_OUTPUT findings into highly visible summaries, alerts, and promotion checks that users actually act on.
- Fragile: The downside is smaller if scan findings are dominated by low-signal or advisory results that would otherwise create constant false blocking.

---

## claim-003 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-BVGP8Duq

### Claim

The decision's core insight—deferring enforcement from the build gate to production—is sound and does unlock velocity. But I overstated the elegance and understated the fragility. The load-bearing assumption depends entirely on STONE-459 delivering clear UX, and the decision itself admits that without it, users will be misled. That's not a solved problem; that's a bet that downstream UX work will be excellent. I also glossed over compliance regimes. Enterprises with FedRAMP, PCI-DSS, or ISO 27001 constraints may reject the whole model—letting a non-compliant build proceed through *any* environment is often an audit finding, not a development affordance. The queryability and feedback loops I suggested earlier are nice-to-haves that add complexity without addressing the core tension: if you don't block, developers see failures as noise. The shift-left mentality is partially undermined—instead of failing fast in the branch, you're succeeding always and asking devs to dig into artifacts. That's a regression in signal quality. The permission architecture is elegant in theory but operationally risky: the artifact moves through lower envs and becomes part of your corpus, your test data, possibly your deployments. Cleaning that up later is expensive. I'd revise to: the decision is *correct for velocity-focused teams* but *dangerous for compliance-first orgs* and *UX-dependent* in ways the ADR underspecifies.

### Pros

- ADR itself warns users will be misled without STONE-459 UX treatment; decision admits the core assumption is at risk.
  - evidence: ADR itself warns users will be misled without STONE-459 UX treatment; decision admits the core assumption is at risk. (konflux-adr-0014 Consequences section)
- Compliance regimes require clear audit trails of scanning results; always-succeeding scans may not satisfy FedRAMP/PCI requirements.
  - evidence: Compliance regimes require clear audit trails of scanning results; always-succeeding scans may not satisfy FedRAMP/PCI requirements. (General compliance best-practice; specific to this decision: enterprise-contract layer is unexamined here)
- Shift-left CI/CD best-practice emphasizes failing fast to catch issues early; always-succeeding scans reduce that signal.
  - evidence: Shift-left CI/CD best-practice emphasizes failing fast to catch issues early; always-succeeding scans reduce that signal. (Industry practice (Google, Stripe, etc.); not cited in ADR)

### Cons

- STONE-459 UX work never ships or is poor; users misinterpret passing tasks as clean results. Scanning becomes noise.
- Compliance orgs (FedRAMP, PCI, ISO) reject the model; non-compliant artifacts in lower envs are audit findings.
- Operator misses non-compliant builds because PipelineRun status is green; incident occurs in staging, costly to remediate.
- Scanning signal quality degrades—developers ignore TEST_OUTPUT artifacts because tasks always succeed. Shift-left fails.
- Fragile: Clear communication about findings is a design problem, not solved by a result convention. Depends on STONE-459.
- Fragile: Permission-based architectures only work if the enforcement downstream (enterprise-contract) is credible and auditable.
- Fragile: Queryable/filterable results require structured scanning output; many tools emit text reports, not JSON.
- Fragile: Acknowledged-debt feedback loops re-create gatekeeping at social layer; incentive misalignment risk.

---

## claim-004 — growth-optimist

**Confidence:** 0.62
**Source view(s):** view-GY8mipeB

### Claim

I still lean yes on ADR 14, but with a narrower claim than my first pass. The upside is real: letting pipelines proceed turns scanning and linting into continuous feedback instead of a universal stop sign, which is a strong growth pattern when the actual protection boundary is promotion to production rather than every intermediate build. That preserves developer momentum, increases the number of completed test and lower-environment runs, and gives teams more surface area to learn from findings instead of stalling at the first compliance hiccup.

But the declared assumption asm-aZfkCJC6 is doing almost all the work here, and it is shaky. I do not think "Task succeeds + TEST_OUTPUT exists" is enough to communicate risk clearly. It only works if the product experience makes findings impossible to confuse with a clean pass: prominent warnings, severity summaries, explicit advisory labeling, and downstream policy enforcement that is visibly separate from build continuity. Without that, the system teaches a dangerous mental model: green pipeline equals acceptable artifact.

The optimistic alternative I still see is not fail-fast scanning, but dual-channel signaling. Keep pipeline continuity for build/test/lower-environment flow, while adding loud, structured, machine-readable finding states that can feed dashboards, alerts, PR decoration, and promotion gates. In other words, preserve velocity in the middle of the funnel and enforce quality at the edges that matter most.

The counterweight to my optimism is that delayed enforcement can accumulate remediation debt. If teams repeatedly ship into lower environments with unresolved findings, the eventual production gate can become a traffic jam rather than a safeguard. So I support the ADR as a growth-positive architecture move, but only if the organization treats result visibility and late-stage enforcement as first-class product work rather than assuming the convention alone solves user understanding.

### Pros

- The ADR explicitly chooses for scanning and linting TaskRuns to succeed even when they find problems.
  - evidence: The ADR explicitly chooses for scanning and linting TaskRuns to succeed even when they find problems. (konflux-adr-0014, Decision section)
- The stated goal is to avoid blocking build, test, and lower-environment deployment while relying on enterprise-contract mechanisms to protect production.
  - evidence: The stated goal is to avoid blocking build, test, and lower-environment deployment while relying on enterprise-contract mechanisms to protect production. (konflux-adr-0014, Context section)
- The ADR itself acknowledges a user-confusion risk if tasks appear to succeed while reporting errors underneath.
  - evidence: The ADR itself acknowledges a user-confusion risk if tasks appear to succeed while reporting errors underneath. (konflux-adr-0014, Consequences section)

### Cons

- Users and automations may infer safety from successful TaskRuns and miss serious findings until much later in the release flow.
- Deferring enforcement to promotion time can create clustered remediation work, causing late pipeline jams and friction between delivery and compliance.
- Fragile: The growth benefit depends on findings being surfaced with enough semantic clarity that teams experience continuation as advisory, not approval.

---

## claim-005 — growth-optimist

**Confidence:** 0.80
**Source view(s):** view-Zu4B7gCT

### Claim

This 'Let Pipelines Proceed' decision is undeniably a catalyst for unlocking unparalleled development velocity and developer agility. By intelligently decoupling scanning and linting tasks, we're not just avoiding blockers; we're enabling a dynamic, continuous flow through the build, test, and pre-production deployment stages. This isn't merely about progress; it's about empowering our teams with the real-time, actionable insights delivered via the `TEST_OUTPUT` convention, transforming potential roadblocks into opportunities for proactive improvement. We are championing a culture of innovation by building a system that prioritizes dynamic responsiveness and continuous evolution.

The true 'growth' here lies in the potential for advanced tooling and UX that will build upon this foundation. While the ADR acknowledges the risk of users being misled, I see this as an exciting challenge to innovate. Instead of a rigid pipeline failure, we have a rich data stream that can power intelligent dashboards and sophisticated alert systems, providing contextually relevant feedback without disrupting the developer's immediate workflow. This ADR doesn't just permit progress; it invites us to redefine how developers interact with build feedback, making it more informative and less interruptive, fostering a proactive environment where issues are seen as signals for enhancement rather than dead ends. This is forward-thinking design that truly champions flow and continuous improvement.

### Pros

- Scanning and linting TaskRuns should succeed even if they find problems, with results exposed via the `TEST_OUTPUT` convention to allow pipeline progress.
  - evidence: Scanning and linting TaskRuns should succeed even if they find problems, with results exposed via the `TEST_OUTPUT` convention to allow pipeline progress. (konflux-adr-0014 Decision section)
- Users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood, necessitating special treatment in STONE-459.
  - evidence: Users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood, necessitating special treatment in STONE-459. (konflux-adr-0014 Consequences section)
- The purpose of linting and scanning tasks is to find problems and alert the user to take action.
  - evidence: The purpose of linting and scanning tasks is to find problems and alert the user to take action. (konflux-adr-0014 Context section)

### Cons

- Users may become complacent or confused by pipelines that appear to pass, overlooking critical issues flagged only in `TEST_OUTPUT`.
- The effectiveness of the `TEST_OUTPUT` convention relies heavily on user adoption and understanding, which may not be uniform across teams.
- Potential for critical security or quality issues to be inadvertently deprioritized or missed in the long term due to the reduced friction in the pipeline.
- Fragile: The assumption that the `TEST_OUTPUT` convention inherently provides clear, non-misleading feedback, guaranteeing users will correctly interpret non-breaking task failures without additional UX or tooling interventions.

---

## claim-006 — risk-pessimist

**Confidence:** 0.30
**Source view(s):** view-pJb5MdkQ

### Claim

This decision is a dangerous concession to perceived velocity over robust security and quality. By allowing scanning and linting tasks to report 'success' despite identifying critical flaws, the system creates a deceptive illusion of progress. The fundamental gamble lies in the assumption that developers, psychologically primed to trust a green pipeline status, will diligently sift through `TEST_OUTPUT` and act upon warnings, especially when the primary dashboard signals completion. This approach actively undermines the immediate feedback loop essential for security and quality, paving the way for vulnerabilities to propagate unchecked through development cycles, only to surface later as far more costly, impactful production incidents.

The reliance on a convention (`TEST_OUTPUT`) and a separate tracking mechanism (`STONE-459`) as a primary defense is inherently fragile. Conventions are notoriously susceptible to being overlooked, misinterpreted, or bypassed, particularly under deadline pressure or within complex CI/CD workflows. The ADR itself tacitly admits this fragility by noting that users 'may be misled or confused' without further intervention, which implies the core decision is already compromised and requires downstream, often less robust, mitigation strategies rather than a secure foundational approach. This ADR effectively sanctions a lower standard of immediate feedback, accepting an unacceptably high risk of propagating security and quality issues.

My confidence in this assessment is high, but not absolute. I could be wrong if empirical data conclusively demonstrated that the `TEST_OUTPUT` convention, in conjunction with `STONE-459`, leads to demonstrably fewer security incidents or quality regressions compared to systems where such tasks would fail the pipeline. This would require extensive, long-term evidence showing consistent and effective user action on these warnings, overriding the strong psychological bias towards accepting 'passing' pipelines. While the ADR aims to enable developer velocity, the mechanism chosen to achieve this is a flawed trade-off that prioritizes short-term perceived progress over long-term stability and security. The primary counter-argument—that velocity gains are paramount—is outweighed by the elevated and poorly mitigated risk profile.

### Pros

- The purpose of scanning and linting tasks is to find problems in user's source code or dependencies and alert the user to take action.
  - evidence: The purpose of scanning and linting tasks is to find problems in user's source code or dependencies and alert the user to take action. (ADR context)
- Users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood.
  - evidence: Users may be misled or confused if their tasks appear to succeed but really are reporting errors under the hood. (ADR Consequences)
- All scanning and linting TaskRuns should succeed even if they find problems in the content they are evaluating.
  - evidence: All scanning and linting TaskRuns should succeed even if they find problems in the content they are evaluating. (ADR Decision)
- Use the `TEST_OUTPUT` result convention from [ADR-0030] to expose those results and render them for users ([STONE-459]).
  - evidence: Use the `TEST_OUTPUT` result convention from [ADR-0030] to expose those results and render them for users ([STONE-459]). (ADR Decision)

### Cons

- Users ignoring critical security vulnerabilities due to 'passing' CI pipelines.
- Propagation of security/quality issues to production due to lack of immediate, blocking feedback.
- Fragility and potential circumvention of the `TEST_OUTPUT` convention and reliance on `STONE-459`.
- False sense of security leading to complacency and undetected issues.
- Fragile: The assumption that `TEST_OUTPUT` and `STONE-459` will effectively and reliably alert users without a pipeline failure.
- Fragile: The belief that users will consistently and diligently review `TEST_OUTPUT` even when their pipeline dashboard shows success.

---
