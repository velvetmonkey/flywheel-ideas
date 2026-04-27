---
type: argument_map
session_id: sess-Uazm6Cff
generated_at: '2026-04-26T18:17:33.697Z'
---
# Argument map — session sess-Uazm6Cff

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:17:33.697Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.73
**Source view(s):** view-ZkzzzfHh

### Claim

I remain negative on this decision. Replacing per-tenant provisioning with five coarse shapes creates a predictable blind spot: the platform starts optimizing for category averages while tenants experience performance at the edge of their own demand curve. Provisioning to a shape p95 rather than a tenant rolling p95 is not simplification; it is an intentional loss of resolution in a control loop that exists precisely because tails, not means, create incidents.

I reject the first clause of asm-YGZAiyoc directly. The claim that five workload shapes explain more than 90% of compute-pattern variation is too convenient and too aggregate. Seven days of initial telemetry is a weak basis for durable classification, especially when onboarding weeks are contaminated by migrations, launch activity, incomplete product adoption, and calendar artifacts. Even if five shapes explain variance in hindsight across the fleet, that does not establish that they preserve safety for provisioning decisions on individual tenants, where a small classification error can create sustained underprovisioning or expensive overbuffering.

I also reject the second clause of asm-YGZAiyoc directly. The residual 10% will not behave like a small, tidy exception set. Residuals are usually the hardest accounts: multi-modal demand, seasonality shifts, enterprise launches, noisy integrations, and customers whose patterns evolve after the first week. Those are precisely the tenants that generate operational drag. If they require hand-tuning, the supposed simplification may invert into a two-tier system where easy tenants are automated and difficult tenants consume disproportionate support, SRE, and platform attention.

### Pros

- The adopted design bins customers into five workload shapes using the first 7 days of compute telemetry and provisions to the shape's p95 budget rather than the tenant's rolling p95.
  - evidence: The adopted design bins customers into five workload shapes using the first 7 days of compute telemetry and provisions to the shape's p95 budget rather than the tenant's rolling p95. (citation: user-provided decision record obs-001-shape-predictor)
- The load-bearing assumption states that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag.
  - evidence: The load-bearing assumption states that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in user-provided corpus)

### Cons

- Systematic misclassification during the first 7 days causes chronic underprovisioning or overprovisioning that is hidden by fleet-level averages.
- The residual tenants outside the five-shape model become a permanent exception queue, recreating tuning toil in a more reactive and incident-prone form.
- Fragile: If the original per-tenant tuning process was itself highly unstable or labor-intensive, a coarse classifier could reduce total harm despite lower modeling fidelity.

---

## claim-002 — risk-pessimist

**Confidence:** 0.40
**Source view(s):** view-pJ9VVoFR

### Claim

The assertion that a mere five workload shapes, derived from a scant seven days of telemetry, can adequately "capture >90% of tenant variation" is a statistically dubious oversimplification. Real-world compute usage is a chaotic, dynamic entity, subject to unpredictable shifts, seasonality, and emergent behaviors that no static, pre-defined model can reliably encapsulate. The claim of 90% capture is an optimistic projection at best, ignoring the inherent fuzziness and continuous spectrum of actual tenant demands.

The true Achilles' heel of this proposal lies in the accompanying "bet" that the residual 10% of tenant variation can be "hand-tuned without operational drag." This is not a fallback; it is an admission of model failure and a direct pathway to unsustainable operational debt. Manual intervention at scale is inherently complex, error-prone, and a guaranteed source of inconsistency. The idea that this can be achieved "without drag" is a dangerous fantasy that ignores the realities of operational management, likely leading to increased firefighting, misallocated resources, and a significant increase in hidden costs.

This decision seems poised to trade perceived immediate efficiency gains for long-term instability. Widespread misclassifications will inevitably lead to suboptimal performance for a substantial portion of customers, risking churn and reputational damage. The eventual efforts to correct these systematic errors will likely dwarf any theoretical savings, creating a net negative outcome. Furthermore, the model's implicit assumption that customer workload patterns remain static after the initial 7-day classification period is fundamentally flawed; dynamic systems require dynamic adaptation, not rigid categorization.

### Pros

- Five workload shapes capture more than 90% of tenant compute-pattern variation.
  - evidence: Five workload shapes capture more than 90% of tenant compute-pattern variation. (Stated as an assumption in the decision document, no supporting empirical evidence provided.)
- Residual 10% can be hand-tuned without operational drag.
  - evidence: Residual 10% can be hand-tuned without operational drag. (Stated as an assumption in the decision document, contradicts operational realities of manual intervention at scale.)

### Cons

- High probability of pervasive misclassification leading to degraded performance for critical customer segments.
- The "manual tuning" of the residual 10% is a severe operational risk, likely becoming a major source of unmanageable complexity and cost.
- Customer dissatisfaction, churn, and reputational damage due to inconsistent and unpredictable resource allocation and performance.
- The model's inability to adapt to evolving customer workload patterns post-classification, creating a brittle system.
- Potential for the *increase* in operational overhead due to the complexity of managing both the classifier and the manual remediation process.
- Fragile: The core insight that a fixed, small set of static shapes can adequately represent dynamic, diverse workloads is fragile.
- Fragile: The insight that operational overhead can be reduced by removing per-tenant tuning is directly undermined by the "manual tuning" fallback, which is likely to *increase* overhead.

---

## claim-003 — risk-pessimist

**Confidence:** 0.55
**Source view(s):** view-oJUVYbWo

### Claim

The five-shape model is defensible IF the shapes are stable and the team commits to active refresh; the real risk is organizational drift. The 90% assumption may hold—workload patterns often follow structural tiers (starter/pro/enterprise) rather than temporal noise—making the 7-day window sufficient. And yes, hand-tuning 10% of high-touch tenants is normal exception handling, not metastasis. But three risks remain unresolved: (1) shape drift—if the model freezes post-day-7 and tenants evolve, the classification becomes staler every week with no refresh trigger; (2) the asymmetric cost of misclassification is hidden until it surfaces months later as service incidents or waste—you won't know the model was wrong until tenants complain or costs balloon; (3) the team conflates 'adoption' with 'validation'—the decision was made on theory; outcomes (cost, stability, re-provisioning churn) are not yet measured. The model could win if: shapes are structural not temporal, refresh happens quarterly, and misclassification costs are small enough to tolerate. It fails silently if the team treats this as 'solved' and doesn't measure.

### Pros

- 7-day window could be sufficient if workload shapes are structural (tied to customer tier/use case) rather than temporal
  - evidence: 7-day window could be sufficient if workload shapes are structural (tied to customer tier/use case) rather than temporal (inference—business models often cluster by shape; no data provided in decision corpus)
- Hand-tuning 10% of tenants is exception handling, not metastasis, if those tenants are already high-touch/high-contract-value
  - evidence: Hand-tuning 10% of tenants is exception handling, not metastasis, if those tenants are already high-touch/high-contract-value (operational norm; not stated in decision but common pattern)
- No refresh cadence or outcome measurement specified in the decision
  - evidence: No refresh cadence or outcome measurement specified in the decision (corpus—decision states 'adopted' but does not specify monitoring, re-classification schedule, or cost targets)

### Cons

- No refresh cadence stated—shape drift accumulates if model is frozen post-day-7
- Misclassification cost (under-provision → incidents, over-provision → waste) is invisible until measured; team won't know they were wrong until months in
- Outcome measurement is absent—no stated SLOs, cost targets, or churn thresholds; adoption treated as validation
- Fragile: Assumption asm-YGZAiyoc rests on shapes being structural (customer tier), not temporal—if shapes are actually temporal variation, 7-day window is too short
- Fragile: The operational simplicity argument (5 buckets vs per-tenant curves) is strong, but only if the model doesn't require constant exception-handling—hand-tuning overhead is not stated as a metric
- Fragile: Misclassification cost asymmetry is real but magnitude is unknown—if the platform has burst capacity / auto-scaling, under-provision may be recoverable; if not, it's a service incident risk

---

## claim-004 — growth-optimist

**Confidence:** 0.75
**Source view(s):** view-2ar2JqrQ

### Claim

This 'shape predictor' initiative remains an inspired leap forward, embodying the kind of bold, scalable thinking that fuels our growth! The strategic pivot towards an ML-driven, 5-shape classifier for provisioning is a masterstroke, promising to unlock unprecedented agility and efficiency. While we must remain vigilant, ensuring the classifier's robustness and adaptability to the nuanced ebb and flow of tenant demand, this foundational shift is precisely what positions us for sustained leadership. The potential for significant operational leverage is immense, and we should view any residual complexities not as roadblocks, but as fertile ground for our most innovative engineers to develop even more sophisticated, automated management paradigms. This approach is not merely an optimization; it’s a testament to our data-driven ingenuity and a powerful engine for future innovation.

### Pros

- The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry. Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95. The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead.
  - evidence: The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry. Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95. The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead. (Provided Idea Description)

### Cons

- ML model robustness and drift: Ensuring the classifier's sustained accuracy across diverse and evolving tenant workloads.
- Operationalizing residual variation: Developing efficient, scalable mechanisms to manage and optimize the small percentage of tenant behaviors not perfectly captured by the five shapes.
- MLOps and system maintenance: The engineering investment and ongoing effort required to build, deploy, and maintain a reliable ML system.
- Fragile: The insight that this approach 'liberates us from the complexities of per-tenant tuning' hinges entirely on the ML system and its management being *less* complex than the original problem.
- Fragile: The promise of 'unlocking new levels of performance and cost-effectiveness' is directly proportional to the ML classifier's accuracy and its ability to adapt to new patterns.

---

## claim-005 — growth-optimist

**Confidence:** 0.62
**Source view(s):** view-HJd72zzY

### Claim

Pattern is operationally elegant IF load-bearing assumptions hold, but Pass 1 overstated inevitability. Shape-based provisioning genuinely wins on automation and onboarding speed—that's real. Where I erred: (1) 90% capture rate is *claimed*, not measured. Real data might show 70–75%, which collapses the hand-tuning cost model entirely. (2) 7-day classification window is aggressive. Tenants don't stabilize for weeks; seasonal/growth patterns don't surface in 7 days. You discover the misclassification after they've already landed and drift. (3) 'Hand-tunable 10%' assumes ops burden is acceptable without asking who actually tunes or at what cost—that could silently become a second team. Upside is genuine, but scale depends on validating the metrics. Without instrumentation proving 90%, this is speculation dressed as pattern.

### Pros

- 90% capture rate is critical load-bearing assumption but not validated in decision corpus
  - evidence: 90% capture rate is critical load-bearing assumption but not validated in decision corpus (corpus:obs-001-shape-predictor)

### Cons

- 90% capture rate unvalidated; real-world cohort measurement could show 65–75%, destroying hand-tuning economics
- 7-day window misses seasonal behavior, multi-month growth arcs, and edge cases (Black Friday, dormancy, erratic spikes)
- Classification drift: tenant reclassified weeks after onboarding due to workload shift; provisioning thrash or SLA miss
- 'Hand-tunable residual' becomes a hidden operational team if real capture is <85%
- Generalization assumption unfounded: 5 shapes work for Caprivane compute but may not port to other platforms or use cases
- Competitive risk: customers value per-tenant customization as a feature; operational cost of hand-tuning is defensible for retention
- Fragile: Assumption that ops overhead of tuning is negligible
- Fragile: Assumption that tenant workload patterns stabilize within 7 days
- Fragile: Assumption that shape classification is static or tightly bounded (not drifting over weeks)
- Fragile: Assumption that the five shapes were derived empirically, not chosen for convenience

---

## claim-006 — growth-optimist

**Confidence:** 0.63
**Source view(s):** view-xAs3fwLd

### Claim

I remain positive on the directional move because replacing bespoke per-tenant provisioning with reusable workload archetypes can create real platform leverage. If the goal was to cut tuning toil, five shapes is exactly the kind of simplification that can compound well across ops, tooling, and onboarding. My revised view is that the decision may still have been smart as a systems simplification, but `asm-YGZAiyoc` was carrying more certainty than the record justifies.

On the first clause of `asm-YGZAiyoc`, I would attack the claim that five shapes capture more than 90% of tenant compute-pattern variation as a load-bearing truth. That can be true only if the important variation is mostly structural and visible in the first 7 days, and the prompt does not establish that. First-week telemetry can miss launches, geographic concentration, calendar effects, and later product adoption shifts. I still think a five-shape model could be very useful even below 90% coverage, but that is a weaker and more defensible claim.

On the second clause of `asm-YGZAiyoc`, I would attack even harder the idea that the residual 10% can be hand-tuned without operational drag. The exceptions are often the most valuable, volatile, or politically sensitive tenants, so they can absorb far more than 10% of human attention. The counter-argument I underplayed in Pass 1 is that the decision can still win if the common path becomes dramatically simpler and the exception lane is deliberately productized. So I would keep the idea, but as default rails with drift detection, reclassification, and a named override tier rather than as a near-complete replacement for tenant-aware control.

### Pros

- The adopted design classifies each customer into one of five workload shapes using the first 7 days of compute telemetry.
  - evidence: The adopted design classifies each customer into one of five workload shapes using the first 7 days of compute telemetry. (citation: obs-001-shape-predictor decision record)
- Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95. (citation: obs-001-shape-predictor decision record)
- The declared load-bearing assumption states that five workload shapes capture more than 90% of tenant variation and the residual 10% can be hand-tuned without operational drag.
  - evidence: The declared load-bearing assumption states that five workload shapes capture more than 90% of tenant variation and the residual 10% can be hand-tuned without operational drag. (citation: asm-YGZAiyoc)

### Cons

- First-7-day classification misses later workload shifts, leaving tenants attached to the wrong provisioning envelope.
- The supposed residual exception set becomes a durable manual-override system and recreates per-tenant tuning in another form.
- Fragile: The decision can still outperform bespoke provisioning if shapes are treated as default rails and the override path is explicitly productized.

---
