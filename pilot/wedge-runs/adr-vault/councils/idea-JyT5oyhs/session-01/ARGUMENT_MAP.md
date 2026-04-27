---
type: argument_map
session_id: sess-vHDd3PsT
generated_at: '2026-04-26T23:44:45.244Z'
---
# Argument map — session sess-vHDd3PsT

**Idea:** konflux-adr-0014 — ADR 14. Let Pipelines Proceed (konflux-ci/architecture)
**Generated:** 2026-04-26T23:44:45.244Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.68
**Source view(s):** view-tzJUJEAt

### Claim

Twelve months later, this failed because the platform tried to override the native meaning of CI success with documentation and convention. Assumption asm-aZfkCJC6 did not hold. A green TaskRun still read as "passed" to humans, dashboards, chat notifications, and a large share of automation. `TEST_OUTPUT` may have preserved the data, but it did not preserve the urgency. Findings became something users had to remember to inspect rather than something the system forced them to confront.

The failure was not merely user confusion; it was signal corruption. By making scanners and linters succeed even when they detected real defects, the ADR collapsed materially different states into one top-line outcome: clean, dirty, and partially broken all looked operationally similar unless every consumer implemented special parsing and rendering correctly. That is a brittle systems design. The ADR itself admitted the misleading-user risk, which is strong internal evidence that the assumption was fragile at decision time.

This ambiguity likely pushed cost and conflict downstream. Lower environments would have accumulated artifacts with known issues, test capacity would have been spent on candidates that already carried disqualifying findings, and production gating via the enterprise contract would have become the first unambiguous enforcement point. That is too late. By then, teams are attached to the artifact, schedules are committed, and remediation is more expensive both technically and organizationally.

The strongest counterpoint is that this may still have worked if Konflux built a consistently visible warning surface everywhere the green signal appeared, and if enterprise-contract enforcement cleanly protected production without remediation lag. But that is exactly why asm-aZfkCJC6 is load-bearing: the idea only survives if the ecosystem around `TEST_OUTPUT` is unusually disciplined, ubiquitous, and resistant to semantic drift. That is not the assumption I would want underwriting a safety signal.

### Pros

- The ADR explicitly decided that scanning and linting TaskRuns should succeed even when they find problems.
  - evidence: The ADR explicitly decided that scanning and linting TaskRuns should succeed even when they find problems. (citation: konflux-adr-0014 Decision section)
- The ADR relies on the `TEST_OUTPUT` result convention to expose findings instead of using task failure as the signal.
  - evidence: The ADR relies on the `TEST_OUTPUT` result convention to expose findings instead of using task failure as the signal. (citation: konflux-adr-0014 Decision section; ADR-0030 reference)
- The ADR itself warns that users may be misled or confused if tasks appear to succeed while reporting errors underneath.
  - evidence: The ADR itself warns that users may be misled or confused if tasks appear to succeed while reporting errors underneath. (citation: konflux-adr-0014 Consequences section)
- The stated goal was to avoid blocking build, test, and lower-environment deployment despite scanner findings, with production protection deferred to enterprise contract mechanisms.
  - evidence: The stated goal was to avoid blocking build, test, and lower-environment deployment despite scanner findings, with production protection deferred to enterprise contract mechanisms. (citation: konflux-adr-0014 Context and Consequences sections; enterprise contract reference)

### Cons

- Users and downstream tooling interpret successful scan/lint TaskRuns as clean builds, causing known findings to be ignored until much later in the lifecycle.
- Different consumers implement `TEST_OUTPUT` rendering and parsing inconsistently, so security and quality signals become non-uniform and operationally unreliable.
- Production policy becomes the first place of hard truth, increasing remediation cost, release friction, and dispute over whether earlier stages should have blocked.
- Fragile: The argument depends on the practical dominance of native CI pass/fail semantics over custom result rendering; if Konflux surfaces warnings prominently enough, this failure mode weakens.
- Fragile: The downstream-cost claim weakens if lower-environment testing on known-bad artifacts reliably accelerates fixes without meaningfully increasing waste.

---

## claim-002 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-rV1fvYg1

### Claim

Pass 1 correctly identified the cognitive risk: green builds anchor user perception. However, I overstated the magnitude by ignoring the dual-layer intent. The decision doesn't *rely* on findings being self-remediating via UI polish—it relies on Enterprise Contract as the enforcement gate. Non-blocking scans avoid the disable-scanning trap (which strict-fail creates), while findings remain visible in logs and result objects. The real fragility isn't 'users ignore findings' (they do), it's whether Enterprise Contract coverage is comprehensive enough to catch compliance gaps *before* production. STONE-459 is UI sugar, not the security mechanism. If EC is misconfigured or has blind spots (e.g., doesn't cover all finding types, or users can deploy to prod outside the gate), the model fails silently. The assumption holds only if: (1) Enterprise Contract actually enforces what scanning found, (2) EC is reliable and auditable, (3) users cannot bypass it. Those are unstated and unvalidated.

### Pros

- The original context states users were blocked by build-system friction in prior systems, implying strict-fail mode had productivity cost
  - evidence: The original context states users were blocked by build-system friction in prior systems, implying strict-fail mode had productivity cost (ADR 0014 Context section: 'One frustration we've heard from users in previous systems is that they don't want to be blocked...')
- Enterprise Contract is described as the protection mechanism for production, but no reliability, coverage, or configuration guidance is provided in the ADR
  - evidence: Enterprise Contract is described as the protection mechanism for production, but no reliability, coverage, or configuration guidance is provided in the ADR (ADR 0014 Consequences: references [enterprise contract] without specifics)
- TEST_OUTPUT convention is relied upon as the exposure mechanism, but visibility depends on STONE-459 (UI rendering), which is out-of-scope and may ship late or not at all
  - evidence: TEST_OUTPUT convention is relied upon as the exposure mechanism, but visibility depends on STONE-459 (UI rendering), which is out-of-scope and may ship late or not at all (ADR 0014 Decision: 'Use the TEST_OUTPUT result convention... and render them for users ([STONE-459])')

### Cons

- Enterprise Contract coverage is incomplete or has blind spots; scanning finds issue X, EC doesn't gate on it, non-compliant build reaches production undetected
- Enterprise Contract misconfiguration allows policy bypass or is not uniformly enforced across environments; users or tooling circumvent the gate
- Findings are visible but *correctly ignored* because they're false positives or environment-specific; model works but drives alert fatigue and reduces sensitivity to real findings
- STONE-459 delay or poor UX means results are technically visible but practically hidden; users don't know findings exist because they don't naturally flow to decision points
- Fragile: The model assumes Enterprise Contract is the reliable enforcement layer, but ADR provides no metrics on EC coverage, uptime, policy-update latency, or auditability
- Fragile: Visible findings ≠ actioned findings. Visibility is necessary but not sufficient; pass-semantics may genuinely make findings feel lower-priority even if they're technically exposed
- Fragile: Non-blocking scans solve the 'users disable scanning' problem, but create a new one: teams grow accustomed to non-zero findings and stop investigating anomalies

---

## claim-003 — risk-pessimist

**Confidence:** 0.85
**Source view(s):** view-ePpnvfWp

### Claim

My initial assessment holds: the decision to let pipelines proceed despite scanning and linting failures, relying solely on the `TEST_OUTPUT` convention, was an overly optimistic gamble. While the ADR correctly identifies the *potential* for user confusion, it underestimates the systemic tendency towards complacency fostered by green checkmarks in CI dashboards. The core assumption that exposing issues via `TEST_OUTPUT` would *clearly communicate* them *without misleading* is fundamentally flawed. Human developers, under pressure, prioritize unblocking their immediate workflow. A pipeline that *appears* to succeed is more likely to be pushed forward, with detailed output logs relegated to secondary review, if reviewed at all. This mechanism creates a dangerous illusion of security and compliance, masking critical vulnerabilities or policy violations that could later have severe consequences, especially in production environments. The ADR acknowledges this by stating users 'may be misled or confused,' but this is not a mere possibility; it's a near certainty in environments where velocity trumps meticulous scrutiny of non-blocking alerts.

### Pros

- The ADR acknowledges the risk of users being misled or confused by tasks that appear to succeed but report errors.
  - evidence: The ADR acknowledges the risk of users being misled or confused by tasks that appear to succeed but report errors. (konflux-adr-0014 Consequences section)
- The core assumption is that tasks succeeding despite issues with `TEST_OUTPUT` communication will be clear and not misleading.
  - evidence: The core assumption is that tasks succeeding despite issues with `TEST_OUTPUT` communication will be clear and not misleading. (User prompt - Declared assumptions)

### Cons

- Introduction of unaddressed security vulnerabilities due to ignored scanning failures.
- Deployment of non-compliant code to production environments.
- Erosion of trust in the CI/CD system as developers learn to ignore warnings.
- Sustained 'success theater' where pipelines report success despite underlying critical issues.
- Fragile: Users should find that even if their scanners find problems, they can still build, test, and deploy to lower [Environments].
- Fragile: The purpose of our linting and scanning tasks is to find problems - which usually looks like failure with a non-zero exit code.

---

## claim-004 — growth-optimist

**Confidence:** 0.35
**Source view(s):** view-noZjeoMt

### Claim

While the agility unlocked by letting pipelines proceed is undeniably exciting, a closer look reveals a perilous tightrope walk over a chasm of potential complacency. My initial enthusiasm for this decision overlooked a critical human factor: the tendency to prioritize "green checks" over nuanced warnings. The assumption that users will consistently and diligently parse `TEST_OUTPUT` for critical issues, even when the pipeline itself reports success, is a significant gamble. If our UI or user workflows don't brilliantly highlight these issues, or if teams become accustomed to simply ignoring them in favor of forward momentum, we risk a silent degradation of quality and security. This isn't about ignoring problems; it's about the very real risk that the problems become invisible through effective, but ultimately misleading, communication. We're trusting users to do more cognitive heavy lifting than they might be capable of or willing to do, especially under pressure.

### Pros

- ADR 14: Let Pipelines Proceed - Decision to allow scanning/linting TaskRuns to succeed even if they find problems, exposing results via TEST_OUTPUT convention.
  - evidence: ADR 14: Let Pipelines Proceed - Decision to allow scanning/linting TaskRuns to succeed even if they find problems, exposing results via TEST_OUTPUT convention. (konflux-adr-0014)
- Declared Assumption: Scanning/linting tasks succeeding even when they find problems (with results exposed via TEST_OUTPUT convention) communicates issues clearly without misleading users about pass/fail semantics in their CI dashboard.
  - evidence: Declared Assumption: Scanning/linting tasks succeeding even when they find problems (with results exposed via TEST_OUTPUT convention) communicates issues clearly without misleading users about pass/fail semantics in their CI dashboard. (asm-aZfkCJC6)

### Cons

- Complacency: Developers may overlook critical warnings in `TEST_OUTPUT` due to the overall pipeline status showing as 'success'.
- Information Silos: The effectiveness of `TEST_OUTPUT` relies heavily on its presentation and user adoption, which may not be universally effective or consistent across all teams.
- Erosion of Quality Signals: The principle of 'succeeding despite issues' could inadvertently lower the bar for acceptable code quality and security over time.
- Fragile: The assumption that the `TEST_OUTPUT` convention will be a consistently effective mechanism for communicating critical issues without misleading users about the overall health of their build and deployment.

---

## claim-005 — growth-optimist

**Confidence:** 0.42
**Source view(s):** view-TnMSGUZP

### Claim

Assumption asm-aZfkCJC6 is riskier than Pass 1 acknowledged. Core tension: you can't make a signal simultaneously non-blocking AND clear. Non-blocking signals get ignored—that's psychology, not a UI problem. Even if TEST_OUTPUT convention was universal, even if STONE-459 dashboard rendered findings beautifully, users learn pattern: green task = proceed. Findings buried in results = background noise. 12-month failure pattern: teams rationalized shipping with findings because system says "proceed," enterprise-contract enforcement lagged or was weaker than expected, and downstream production gates were the real bottleneck (not developer discipline). The decision decoupled scanning from blocking—good. But it offloaded the real work (making results *matter* to users) to downstream systems (dashboard UI, enterprise-contract enforcement, training). If any of those slipped—and at least one did—users got permission-slip pipelines: green checks with hidden violations. Worst case: developers stop reading findings entirely because noise became normal.

### Pros

- Non-blocking signals are ignored in practice unless they re-demand attention; UX research on alert fatigue and transparency paradox shows signal clarity requires active user engagement, not passive exposure
  - evidence: Non-blocking signals are ignored in practice unless they re-demand attention; UX research on alert fatigue and transparency paradox shows signal clarity requires active user engagement, not passive exposure (behavioral economics / HCI literature (assumed; not cited in original ADR))
- Conventions without enforcement rarely scale in distributed systems; task authors will take simplicity/flexibility over compliance when no mandates exist
  - evidence: Conventions without enforcement rarely scale in distributed systems; task authors will take simplicity/flexibility over compliance when no mandates exist (observed in similar tech communities (assumed; not cited))
- Dashboard/UI projects commonly slip 6-12 months in enterprise contexts; assumption pinned success on STONE-459 shipping on schedule
  - evidence: Dashboard/UI projects commonly slip 6-12 months in enterprise contexts; assumption pinned success on STONE-459 shipping on schedule (project management heuristic (assumed; not cited in ADR))

### Cons

- Non-blocking signals naturally get ignored; communication layer can't overcome this without forcing re-attention, which defeats the purpose of unblocking
- TEST_OUTPUT convention adoption was inconsistent; task authors weren't mandated to implement it; users learned they couldn't trust convention
- STONE-459 dashboard rendering either shipped late or incompletely; findings were buried in logs, not surfaced in CI/CD dashboard where users expected them
- Enterprise-contract enforcement was weaker than assumed; teams rationalized shipping with findings because system permitted it, downstream production gates caught the violations too late
- Behavioral: once users see green-pass-with-findings once, they develop learned helplessness; subsequent findings feel like noise; dashboard improvements fight uphill
- Fragile: Assumption treats 'clear communication' as a solvable problem. It's not—non-blocking signals are structurally ignored.
- Fragile: Assumption assumes downstream gates (STONE-459, enterprise-contract) all shipped and worked. At least one didn't.
- Fragile: Assumption assumes users will develop new mental models (pass-with-findings is OK if findings are exposed). Users stuck with old model (green = all clear).
- Fragile: Assumption conflates decoupling scanning from task failure (good decision) with making results *matter to users* (downstream problem it can't control).

---

## claim-006 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-DQAQ18Co

### Claim

Twelve months later, I think this decision most likely failed not because "let pipelines proceed" was directionally wrong, but because the product probably captured the velocity upside without paying the semantics debt. The appeal is obvious: do not block build, test, and lower-environment learning on scanner findings; keep teams moving; reserve hard protection for production. That is a growth-friendly design. But it only works if "pipeline succeeded" never gets mistaken for "artifact is acceptable."

Assumption asm-aZfkCJC6 is the clear break point, and I would attack it directly. It assumes scan and lint tasks can succeed, publish findings through `TEST_OUTPUT`, and still communicate risk clearly enough that users are not misled by green CI status. In practice, most humans and most tooling privilege status over attached results. Dashboards, notifications, branch protections, and downstream automation compress nuance into pass/fail. If `TEST_OUTPUT` was not rendered as a first-class signal everywhere users made decisions, findings likely turned into background metadata instead of behavior-changing feedback.

Once that happened, the failure mode would compound. Teams would keep promoting "temporarily risky" artifacts through lower environments because the system looked permissive and healthy, then hit enterprise-contract enforcement later and experience it as an arbitrary surprise. The platform would lose trust from both sides: developers would feel misled, and compliance owners would feel ignored. The alternative I still like is not blanket re-blocking; it is a visibly distinct state such as proceed-with-findings, wired directly into promotion policy so progress and risk are separate but impossible to confuse.

### Pros

- The ADR's core problem statement is that in Tekton, a failing TaskRun causes the whole PipelineRun to fail.
  - evidence: The ADR's core problem statement is that in Tekton, a failing TaskRun causes the whole PipelineRun to fail. (citation: konflux-adr-0014 Context (user-provided))
- The decision explicitly requires all scanning and linting TaskRuns to succeed even when they find problems.
  - evidence: The decision explicitly requires all scanning and linting TaskRuns to succeed even when they find problems. (citation: konflux-adr-0014 Decision (user-provided))
- The ADR says findings should be exposed through the `TEST_OUTPUT` result convention.
  - evidence: The ADR says findings should be exposed through the `TEST_OUTPUT` result convention. (citation: konflux-adr-0014 Decision; ADR-0030 reference (user-provided))
- The stated intent is to let users continue build, test, and lower-environment deployment while protecting production through the enterprise contract.
  - evidence: The stated intent is to let users continue build, test, and lower-environment deployment while protecting production through the enterprise contract. (citation: konflux-adr-0014 Context and Consequences (user-provided))
- The ADR itself warns that, without special treatment, users may be misled or confused if tasks appear to succeed while really reporting errors underneath.
  - evidence: The ADR itself warns that, without special treatment, users may be misled or confused if tasks appear to succeed while really reporting errors underneath. (citation: konflux-adr-0014 Consequences (user-provided))

### Cons

- Green pipeline semantics suppress urgency around scanner findings until a later policy gate forces the issue.
- Different UX surfaces and automation paths render `TEST_OUTPUT` inconsistently, so the real risk state disappears where decisions are actually made.
- Fragile: This failure story depends heavily on users and tooling privileging red/green status over attached result payloads.
- Fragile: The trust breakdown is much weaker if enterprise-contract enforcement was already well understood as the real gate.

---
