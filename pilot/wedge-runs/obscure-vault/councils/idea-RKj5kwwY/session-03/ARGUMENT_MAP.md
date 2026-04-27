---
type: argument_map
session_id: sess-C7xQV7PZ
generated_at: '2026-04-26T18:11:04.883Z'
---
# Argument map — session sess-C7xQV7PZ

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:11:04.883Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.68
**Source view(s):** view-NP2R76ZN

### Claim

Twelve months later, this failed because `asm-YGZAiyoc` turned out to be false in the only way that matters operationally: the miss cases were not small, cheap, or stable. Five workload shapes did not capture more than 90% of tenant compute-pattern variation once real customers changed behavior after onboarding, expanded across regions, launched new features, or shifted usage by timezone and season. The residual was not a tidy tail; it was the part of the distribution that creates incidents, escalations, and surprise spend.

The second half of `asm-YGZAiyoc` failed just as badly. Even if the median tenant fit one of the five bins, the non-fitting tenants were exactly the ones that imposed drag. Hand-tuning them was not a light exception path. It became a parallel control plane with ad hoc overrides, stale tickets, and unclear ownership. Every override also weakened the claimed simplification, because engineers now had to maintain both the classifier logic and a growing catalog of tenant-specific exceptions.

The first-7-days design choice made this worse. Early telemetry is often polluted by migration bursts, trial usage, incomplete integrations, backfills, or unusually quiet ramp periods. That means the classifier attached long-lived provisioning consequences to low-quality initial evidence. Once provisioning targeted the shape p95 instead of the tenant's own rolling p95, the platform discarded a corrective feedback loop and replaced it with a brittle prior. Under-provisioning showed up on fast-growing and time-shifting tenants; over-provisioning accumulated on quiet or misread accounts. The savings case eroded while reliability still got worse.

The deeper failure was that the decision optimized for administrative neatness rather than error cost. Aggregate fit can look acceptable while the expensive edge cases dominate toil and customer pain. This idea failed because it embedded a coarse taxonomy into resource allocation and assumed the exceptions would remain operationally cheap. They were not.

### Pros

- The adopted design bins each customer into one of five workload shapes using their first 7 days of compute telemetry.
  - evidence: The adopted design bins each customer into one of five workload shapes using their first 7 days of compute telemetry. (citation: idea text in user-provided decision record)
- Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95. (citation: idea text in user-provided decision record)
- The load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag.
  - evidence: The load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in prompt)

### Cons

- The residual variation outside the five shapes is concentrated in high-cost tenants, so exception handling becomes the real provisioning system.
- Using only the first 7 days for classification locks in misprovisioning when early telemetry is unrepresentative or tenant behavior later drifts.
- Fragile: The failure likely came less from average classifier accuracy and more from the cost concentration of the misclassified tail; this collapses if the tail was operationally cheap.

---

## claim-002 — risk-pessimist

**Confidence:** 0.52
**Source view(s):** view-H7R7VdmG

### Claim

The shape predictor likely failed on temporal instability, not concept. My Pass 1 attack was too confident in the decay narrative. If 5 shapes captured >90% of variation at classification (day 7), that's defensible. The real failure mode is probably narrower: either (a) the team misimplemented re-classification and let shapes go stale by month 6, creating silent under-provisioning; or (b) the residual 10% wasn't uniformly distributed—certain customer segments (high-growth startups, volatile competitors) clustered in that tail, making hand-tuning expensive despite small headcount. A third scenario I underweighted: the shapes *worked* better than the previous system, but the team kept raising the bar on what 'success' meant, chasing a fully-predictive system instead of iterating on shapes + alerting. By month 12, they'd killed shapes not because they failed, but because perfect became the enemy of good. I'm less confident the shapes were categorically wrong, more confident the *operational assumptions* around how the team would maintain them were optimistic.

### Pros

- No direct evidence available—this is a hypothetical 12-month retrospective with no stated outcomes, cost data, or implementation details
  - evidence: No direct evidence available—this is a hypothetical 12-month retrospective with no stated outcomes, cost data, or implementation details (citation://prompt)
- Assumption of rapid workload drift is common in cloud platforms but not guaranteed; some customer bases are stable, others highly volatile
  - evidence: Assumption of rapid workload drift is common in cloud platforms but not guaranteed; some customer bases are stable, others highly volatile (citation://platform-experience)
- The phrasing 'without operational drag' is doing interpretive heavy lifting; need precise definition of what 'hand-tuning' entails (person-hours, incident frequency, blast radius)
  - evidence: The phrasing 'without operational drag' is doing interpretive heavy lifting; need precise definition of what 'hand-tuning' entails (person-hours, incident frequency, blast radius) (citation://prompt-language-analysis)

### Cons

- Silent misclassification: shapes degrade over 6-12 months but the team lacks automated drift detection, so certain tenants go persistently under-provisioned without surfacing as an outage
- Residual-10% concentration: the 10% of workloads not captured by shapes are not uniformly random; high-growth customers and volatile competitors cluster there, making hand-tuning much more expensive than anticipated
- Re-classification cadence: the team never implemented automatic re-training or re-classification; shapes are trained once at adoption and never updated, guaranteeing drift-driven failure by month 6-9
- Opportunity cost of simplification: by committing to 5 shapes, the team closes off more sophisticated strategies (e.g., per-feature budgets, predictive scaling) and later discovers those strategies would have been higher-ROI
- Baseline comparison missing: shapes might have been better than the previous system but worse than what was technically possible, yet the team conflates the two and kills shapes prematurely
- Fragile: The 90% target was actually met at classification time, but I'm assuming it wasn't—if shapes truly captured 90% of initial variation, the concept was sound and the failure was operational (re-training, threshold selection, or misimplementation), not the model itself
- Fragile: Hand-tuning the 10% is a small operational burden, not firefighting—the assumption that 'without drag' is feasible depends on whether the residual cases are edge-case singletons or a concentrated segment of high-value customers
- Fragile: Workload shapes are stable enough over a quarter or two—seasonal patterns might exist but slow-moving; I'm assuming rapid drift, but drift might be gradual enough that a re-classification every 90 days keeps pace
- Fragile: The team had a clear success metric and hit it—I'm assuming vague aspirational goals, but if the goal was 'reduce provisioning overhead 50%' and they delivered 55%, that's not a failure story at month 12

---

## claim-003 — growth-optimist

**Confidence:** 0.59
**Source view(s):** view-bUVVaCB5

### Claim

Twelve months later, I would still expect this decision to have failed because `asm-YGZAiyoc` bundled two optimistic leaps into one neat story. First, the platform probably discovered that five shapes did not capture the economically important parts of tenant variation, even if they looked decent in aggregate. The misses were likely concentrated in mixed-mode tenants, post-launch tenants, migration periods, and customers whose usage matured after onboarding. In other words, the classifier may have explained the tidy middle while missing the expensive edge cases.

Second, the back half of `asm-YGZAiyoc` is a full failure path on its own: the residual probably was not a small, hand-tunable 10%, and it likely did create operational drag. Once provisioning targeted a shape-level p95 budget instead of each tenant's rolling p95, every bad bucket assignment became stickier and more consequential. The exception list likely turned into the real operating model: overrides, escalations, relabel requests, SRE investigations, and customer-specific carve-outs. That would erase the hoped-for savings while adding a layer of model governance on top.

My revision after self-critique is that I am less certain the idea failed because the five-shape abstraction was intrinsically too simple. It may instead have failed because the team treated the shape as a destination rather than a prior. If they had used five shapes only as an initial guess, with confidence thresholds, rapid reclassification, and automatic fallback to rolling tenant p95 for unstable accounts, the idea might have worked surprisingly well. So my pre-mortem remains: the likely failure was not that segmentation was foolish, but that the segmentation was made too rigid, too early, and too operationally binding.

### Pros

- The adopted design classifies tenants from their first 7 days of telemetry into one of five workload shapes and provisions to the shape's p95 budget rather than the tenant's rolling p95.
  - evidence: The adopted design classifies tenants from their first 7 days of telemetry into one of five workload shapes and provisions to the shape's p95 budget rather than the tenant's rolling p95. (citation: user-provided decision record obs-001-shape-predictor)
- The declared load-bearing assumption is that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag.
  - evidence: The declared load-bearing assumption is that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc)

### Cons

- The five-shape taxonomy captures average variance but misses the high-cost tail, so misclassified tenants drive disproportionate incidents or waste.
- The residual exception population grows into an override-heavy workflow that recreates per-tenant tuning under a less transparent governance layer.
- Fragile: The strongest failure mechanism depends on early-life telemetry being a weak proxy for steady-state usage; if first-week behavior is actually predictive, much of this critique softens.

---

## claim-004 — risk-pessimist

**Confidence:** 0.80
**Source view(s):** view-BQxXx5js

### Claim

The adoption of the obs-001-shape-predictor, which sought to replace granular per-customer compute provisioning with a blunt 5-shape ML classifier, was fundamentally flawed by an audacious underestimation of workload diversity and an unwarranted optimism regarding manual intervention. The core assumption that five shapes could sufficiently capture over 90% of tenant compute patterns, leaving a mere 10% manageable through 'hand-tuning', was a critical miscalculation. This residual group, far from being an easily addressed footnote, likely contained the most volatile, high-demand, or uniquely configured workloads. Instead of simplifying operations, it spawned a persistent state of chaos: engineering and support teams were likely embroiled in a constant, draining battle to diagnose and rectify misclassifications, mitigate performance degradations, and desperately patch inadequate provisioning for tenants that defied the classifier's crude bins. This reactive firefighting became an unmanageable operational burden, undoing any perceived benefits and likely magnifying complexity and customer dissatisfaction to a breaking point, leading to the initiative's collapse.

### Pros

- The obs-001-shape-predictor idea failed approximately 12 months after adoption, necessitating a backward analysis of its assumptions.
  - evidence: The obs-001-shape-predictor idea failed approximately 12 months after adoption, necessitating a backward analysis of its assumptions. (vault://obs-001-shape-predictor/outcome)

### Cons

- Underestimation of tenant workload heterogeneity and edge-case frequency.
- Overestimation of the efficiency and scalability of manual operational adjustments for complex, misclassified workloads.
- The ML classifier's inherent inability to generalize robustly, leading to a higher-than-anticipated baseline of problematic classifications.
- Fragile: The idea that a fixed, small set of abstract categories could adequately represent the dynamic and complex spectrum of real-world compute resource demands.
- Fragile: The assumption that the operational overhead associated with managing exceptions would be linear and easily absorbed, rather than exponential and resource-intensive.

---

## claim-005 — growth-optimist

**Confidence:** 0.52
**Source view(s):** view-DuPYY5F5

### Claim

The shapes were right in principle — clustering always works better than raw p95 — but the bet hinged on a hidden assumption we never instrumented: that classification accuracy alone is sufficient. We conflated 'accuracy' with 'operational tractability.' The backcast: shapes probably did separate 90% of the initial cohort (early adopters tend to be homogeneous), but we built zero observability into drift. By month 6, the exception rate was climbing silently. If we'd shipped with a simple dashboard — '% of tenants within budget by shape' — we'd have seen the signal by month 3 and reacted with dynamic shape discovery or per-tenant tuning before it became an avalanche. The shapes themselves weren't wrong; we just didn't measure whether they stayed valid. This is salvageable: spend a sprint building shape-health metrics, retrain with monthly data, add shapes incrementally. We'll hit the 95% target we wanted, just two quarters late. The real miss was treating shapes as a one-time decision instead of a feedback loop.

### Pros

- Exception rate reached 35-40% by month 9, indicating shapes became stale
  - evidence: Exception rate reached 35-40% by month 9, indicating shapes became stale (Pass 1 analysis (backcast; not original corpus data))
- Early validation used first 7 days of telemetry, biased toward stable workloads
  - evidence: Early validation used first 7 days of telemetry, biased toward stable workloads (inferred from design/mobile team context in Pass 1)
- No observability built to measure within-budget rate or shape drift over time
  - evidence: No observability built to measure within-budget rate or shape drift over time (Pass 2 realization; implies root cause was detection failure, not classification failure)

### Cons

- Validation cohort bias: if the 90% threshold was measured only against design/mobile teams, it's not predictive for finance-data or real-time platforms. Assumption false from day one.
- Inference instability: online retraining or dynamic shape additions could retroactively reclassify existing tenants, breaking downstream systems that depend on stable shape assignment.
- Invisible overhead: if hand-tuning exceptions accumulated ad-hoc (Slack, patches, backlog), exception rate might have hit 35-40% by month 3. We just didn't measure it.
- Cost trap: ops overhead of managing shapes + exceptions could exceed per-tenant p95 provisioning, making sunk investment in shape design a pure loss.
- Fragile: Five shapes are a good taxonomy — only if validated against actual portfolio diversity before shipping, not early-adopter telemetry
- Fragile: Classification accuracy is necessary but not sufficient — we confused model accuracy with operational tractability
- Fragile: Dynamic shapes will fix this — but retraining is complex, and inference-stability risk + cost of managing more shapes wasn't modeled

---

## claim-006 — growth-optimist

**Confidence:** 0.70
**Source view(s):** view-ycJVN8KT

### Claim

While the obs-001-shape-predictor initiative didn't achieve its 12-month goals, the core ambition to intelligently generalize tenant provisioning remains a powerful strategy for scaling. The failure highlights not a flawed vision, but a need to refine our modeling accuracy and our approach to exceptions. The foundational idea that we can abstract complex compute patterns into a manageable set of archetypes is sound and still holds immense potential for driving efficiency. The key learning is that the 'residual 10%' that deviates from our initial five shapes requires not manual intervention, which proved to be an operational drag, but rather more sophisticated, dynamic, or even automated methods for handling outliers. This pivot doesn't negate the value of classification; it refines our approach to ensuring that classification is both accurate and that the edge cases are managed seamlessly, paving the way for even greater operational leverage.

### Pros

- The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry.
  - evidence: The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry. (Idea Description)
- Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95. (Idea Description)
- The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead.
  - evidence: The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead. (Idea Description)
- Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag.
  - evidence: Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag. (Declared Assumptions (asm-YGZAiyoc))
- The idea failed 12 months from now.
  - evidence: The idea failed 12 months from now. (User Prompt)

### Cons

- Underestimation of the true diversity and unpredictability of tenant compute patterns.
- Significant underestimation of the operational overhead and complexity associated with manually tuning outlier tenant configurations.
- Fragile: Five workload shapes accurately capture more than 90% of tenant compute-pattern variation.
- Fragile: The residual compute patterns (the ~10% not captured by the primary shapes) can be effectively managed through manual tuning without introducing significant operational drag.

---
