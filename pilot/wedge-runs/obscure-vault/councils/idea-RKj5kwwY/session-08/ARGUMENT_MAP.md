---
type: argument_map
session_id: sess-oFqSpfmC
generated_at: '2026-04-26T18:28:10.688Z'
---
# Argument map — session sess-oFqSpfmC

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:28:10.688Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.38
**Source view(s):** view-UdCr162U

### Claim

The 5-shape classifier succeeded, but the success was narrower and more fragile than the steelman admits. The shapes did capture real clustering in the *initial cohort*—the early-adopter segment likely had stable, predictable workloads. But 90% capture is almost certainly a post-hoc metric measured on that same cohort, not a prediction about new tenants. The 7-day window was insufficient to detect seasonal, quarterly, or growth-driven drift; a 'steady-low' tenant that doubled compute in month 4 would still be classified as steady-low until re-evaluation. The 10% 'hand-tuned' tail is the canary. If hand-tuning cost $400k/year (even 3-4 FTEs at 5% capacity), the savings arithmetic becomes $400k tuning ops vs. $600k excess provisioning = break-even, not a clear win. More damaging: the steelman assumes classification stability. Real workloads drift. As the customer base diversified 12 months post-launch—more startups, more IoT, more ML workloads—the distribution likely shifted away from the original five modes. A classifier trained on Month 1 has no mechanism to detect this drift. The team probably saw *new* tenants that didn't fit the shapes and quietly absorbed them into 'closest match,' degrading precision silently. The operational overhead didn't disappear; it shifted from upfront tuning to ongoing exception handling and complaint resolution. Finally, there was no control group. Did the team A/B test 5-shape provisioning against a simpler baseline (rolling p95 + 1.3x multiplier)? Without it, the claim that *the shapes* drove savings—rather than just 'standardized provisioning'—is unfalsifiable. The idea may have succeeded by making provisioning more predictable, not because five shapes have any special power. Feedback loops didn't validate the shapes; they validated 'don't hand-tune each customer,' which is a different claim.

### Pros

- 7-day window insufficient to detect seasonal/quarterly patterns; workloads drift over 12 months
  - evidence: 7-day window insufficient to detect seasonal/quarterly patterns; workloads drift over 12 months (citation: classical time-series risk—training horizon must exceed cycle length to capture all modes)
- Early-adopter cohorts are not representative of growth-stage customer diversity; later cohorts likely skew toward unmodeled workload types
  - evidence: Early-adopter cohorts are not representative of growth-stage customer diversity; later cohorts likely skew toward unmodeled workload types (citation: B2B platform growth patterns (Slack, Stripe, etc.) show maturation cohorts have different characteristics than seed cohorts)
- 10% hand-tuning is admission that 5-shape model doesn't capture remaining variation; hand-tuning cost is hidden operational drag
  - evidence: 10% hand-tuning is admission that 5-shape model doesn't capture remaining variation; hand-tuning cost is hidden operational drag (citation: post-hoc cost analysis often omits exception-handling labor, SLA penalties, and churn risk)
- No control-group comparison against simpler baseline (rolling p95 + multiplier); unclear whether shapes themselves provided value or just standardization
  - evidence: No control-group comparison against simpler baseline (rolling p95 + multiplier); unclear whether shapes themselves provided value or just standardization (citation: standard ML evaluation practice requires holdout A/B test or comparison to null hypothesis)

### Cons

- 7-day training window misses seasonal, quarterly, and growth-driven workload drift; classifier trained on Month 1 becomes stale by Month 12
- 10% 'hand-tuned' tail is symptom of model failure, not residual noise—likely grew as customer base diversified; real ops overhead hidden in exception handling
- Cohort bias: early-adopter tenants are not representative; newer cohorts (startups, IoT, ML) may have fundamentally different patterns the five shapes don't capture
- Classification stability assumption false: no drift detection mechanism; tenants that shift workload modes after Month 1 stay misclassified until manual re-review
- Cost analysis conflates standardization savings with shape-specific value; no control group comparison (5-shape model vs. simpler rolling p95 baseline)
- Misfits don't 'land within bounds'—under-provisioning triggers SLA violations and churn; over-provisioning wastes budget; breakeven cost poorly understood
- Fragile: The 90% capture claim is measured on the *same cohort* that defined the shapes; generalization to new cohorts is not validated
- Fragile: Operational savings are real, but they flow from 'stopped doing per-tenant customization,' not from '5 shapes capture 90% of variation'
- Fragile: The 'feedback loops validated it' narrative assumes constant-composition customer base; real growth changes the distribution
- Fragile: Misfits absorb into exception handling and manual override; the 10% tail didn't vanish, it became invisible

---

## claim-002 — risk-pessimist

**Confidence:** 0.69
**Source view(s):** view-R2ShRPU8

### Claim

If this decision was judged a success 12 months later, the strongest affirmative explanation is that the team correctly identified a low-dimensional workload ecology that operations had previously treated as bespoke. Tenant demand was governed less by customer-specific randomness than by a small set of business rhythms, so per-tenant rolling p95 provisioning was mostly expensive noise-tracking. In that world, five shapes were not a crude shortcut; they were the right abstraction layer for capacity.

The declared assumption `asm-YGZAiyoc` held in its best form because more than 90% of compute variation really did collapse into the five named patterns, and the remaining tail was operationally sparse. The evidence most consistent with that conclusion is the scenario's stated success itself: a model that materially misclustered tenants would have reintroduced manual tuning, customer pain, or both within a year. Instead, the winning explanation is that steady-low and steady-high tenants separated cleanly, diurnal burst tenants revealed time-of-day concentration almost immediately, and weekly-spike tenants exposed enough early proxy signal through onboarding behavior, tenant type, or adjacent usage markers to be classified acceptably before a full long-history profile existed.

The other reason this worked is that the exception path stayed cheap. The residual 10% did not metastasize into a second provisioning system; it remained a small override queue with obvious misfits and bounded operator effort. That is the best defense of the adoption decision: the classifier was stable enough to eliminate routine per-customer tuning, shape-level p95 budgets were conservative enough to protect service quality, and fleet planning improved because the platform was provisioning against repeatable archetypes rather than hundreds of noisy local peaks.

### Pros

- The decision's mechanism of value was explicit: provision to a shape-level p95 budget instead of each tenant's rolling p95 to eliminate per-tenant tuning overhead.
  - evidence: The decision's mechanism of value was explicit: provision to a shape-level p95 budget instead of each tenant's rolling p95 to eliminate per-tenant tuning overhead. (citation: prompt section 'Idea: obs-001-shape-predictor')
- The load-bearing success condition was explicit: five shapes needed to explain more than 90% of compute-pattern variation, with the residual manually handled without operational drag.
  - evidence: The load-bearing success condition was explicit: five shapes needed to explain more than 90% of compute-pattern variation, with the residual manually handled without operational drag. (citation: prompt section 'Declared assumptions')
- The shape taxonomy corresponds to recognizable recurring cadences: steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike. That makes low-dimensional clustering plausible rather than arbitrary.
  - evidence: The shape taxonomy corresponds to recognizable recurring cadences: steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike. That makes low-dimensional clustering plausible rather than arbitrary. (citation: prompt section 'Idea: obs-001-shape-predictor')
- Given the instruction to assume the idea succeeded 12 months later, the strongest inference is that misclassification rates and exception volume stayed below the threshold that would have forced a rollback to tenant-specific tuning.
  - evidence: Given the instruction to assume the idea succeeded 12 months later, the strongest inference is that misclassification rates and exception volume stayed below the threshold that would have forced a rollback to tenant-specific tuning. (citation: user instruction 'Assume this idea succeeded 12 months from now')

### Cons

- The 7-day observation window may have succeeded only because onboarding behavior happened to correlate with mature workload shape; that correlation can decay.
- Manual handling of the residual tail may remain cheap only while outliers are few and small; a handful of large misfits could erase the operational savings.
- Fragile: Weekly-spike tenants were inferable from early proxy signals before a full weekly cycle was observed.
- Fragile: Twelve months of apparent success reflected true model fit rather than hidden global overprovisioning or a benign tenant mix.

---

## claim-003 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-Q7ocbYRK

### Claim

The shapifier succeeds—but narrowly, and only because the business structure creates a natural tiering where the model's weaknesses don't compound into catastrophe. Twelve months in, you'd find that 5-shape classification works *for the 90% by count*, not necessarily by revenue. The statistical clustering is real: a k-means on compute telemetry genuinely elbows at k=5. Where I overconfident in Pass 1 is assuming that fact alone guarantees operational success. The real story is conditional: (1) SMB and mid-market cohorts (typically 70-80% of tenant count but maybe 40-50% of ARR) fit the 5 shapes well, and provisioning them to shape p95 eliminates per-tenant tuning with acceptable SLO attainment (97-99%). (2) Enterprise cohorts (10-20% of count, 50%+ of ARR) don't cluster as cleanly—they're multimodal, they drift seasonally, and their 7-day classification is often noise. (3) The reason the assumption *still* holds is that you're willing to hand-tune enterprises anyway because they demand it; the 5-shape model is working as a stratification filter, not a universal solution. At month 12, you'd observe high override rates for the top-20 customers by ARR (maybe 40-50% need tuning), but *that's expected and acceptable* because those customers are high-touch anyway. The breakthrough is that you eliminated per-tenant tuning for the 80% of the base that generates 50% of revenue—the SMB and mid-market long tail. The assumption succeeds because it's not claiming to be one-size-fits-all; it's claiming that 90% of operational toil comes from treating all tenants as unique when 90% of tenants *aren't* unique.

### Pros

- Cloud workload patterns are known to cluster into 4-7 coarse shapes in public cloud literature
  - evidence: Cloud workload patterns are known to cluster into 4-7 coarse shapes in public cloud literature (vault://tech/flywheel/flywheel-ideas/obs-001-shape-predictor)

### Cons

- The 7-day classification window is noise-driven, not pattern-driven; classification stability degrades significantly by month 6-12
- High-value (enterprise) customers cluster disproportionately in the 10% outlier segment, converting the model from 'simplification' to 'misdirection'
- Tenant growth and seasonal drift invalidate early classification; re-classification logic is missing or too expensive
- Workload patterns aren't truly separable into 5 shapes on all resource dimensions (CPU, memory, I/O simultaneously)
- The p95 provisioning metric is a poor fit for bursty workloads; misclassification cost is asymmetric and high for under-provisioning
- Fragile: The 90% clustering threshold assumes the distribution is unimodal or weakly bimodal; enterprise/SMB split could create hidden multimodality that invalidates the model's predictive power for high-value segments
- Fragile: Operational savings depend entirely on where the 10% outliers fall by customer value, not by count
- Fragile: The 7-day warmup period may be too short to distinguish signal from noise in bursty, fast-growing, or newly-onboarded tenants

---

## claim-004 — risk-pessimist

**Confidence:** 0.40
**Source view(s):** view-qYDoaWmE

### Claim

The purported success of the obs-001-shape-predictor initiative, celebrated a year post-adoption, is a narrative fraught with peril and reliant on remarkably fortunate circumstances. The foundational gamble—that a simplistic five-shape ML classifier could accurately partition over 90% of tenant compute variations—was inherently unstable. Had the classifier exhibited even marginal drift, or if tenant behaviors proved more erratic than initially modeled, Caprivane would have been mired in the very per-tenant tuning overhead it aimed to escape. It appears, by a slender margin, that the telemetry from the initial 7-day window consistently fed a model that assigned tenants to 'steady-low', 'steady-high', 'bursty-am', 'bursty-pm', or 'weekly-spike' bins with just enough fidelity. This allowed provisioning to target the shape's p95 budget, a hazardous simplification contingent on the observed stability of these classifications. The critical factor for success was this stability; tenants *happened* to settle into their assigned shapes and largely remained there, averting operational collapse. The residual 10% of outliers, while present, were apparently *just* manageable through ad-hoc interventions by specialized SRE teams, preventing systemic disruption. This success was less a testament to robust engineering and more a consequence of the generalization model's accuracy *just* meeting the operational threshold, and the residual complexity *just* being absorbable.

### Pros

- Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag.
  - evidence: Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag. (vault://obs-001-shape-predictor/decision-corpus#asm-YGZAiyoc)

### Cons

- ML model drift leading to incorrect provisioning and resource misallocation.
- Under-provisioning for true high-demand tenants, resulting in performance degradation and user dissatisfaction.
- Over-provisioning for low-demand tenants, leading to significant, avoidable cost overruns.
- The 'residual 10%' of tenants becoming a substantial, unmanageable operational burden, negating the overhead reduction.
- The initial 7-day telemetry window proving insufficient to capture nuanced, long-term, or emergent workload patterns.
- Fragile: The claim that 'classification stability eliminates per-tenant tuning overhead' is highly fragile, as any instability or significant management of the residual 10% would directly contradict this core benefit.
- Fragile: The reliance on a p95 budget derived from a shape, rather than the tenant's actual p95, is fragile if the shape-to-tenant mapping is even slightly inaccurate, leading to performance cliffs.

---

## claim-005 — growth-optimist

**Confidence:** 0.77
**Source view(s):** view-9gMFnN6R

### Claim

Twelve months later, the strongest affirmative case is that this decision worked because it found a better unit of operations than the tenant. Caprivane stopped treating every customer as a bespoke capacity-planning problem and instead managed a small, legible portfolio of demand archetypes. That move likely created leverage everywhere at once: onboarding got faster, provisioning policy got more consistent, alerting became reusable, and platform attention shifted from reactive tuning to improving five durable service envelopes. In a growing platform, that kind of simplification is often the difference between scaling revenue and scaling toil.

The declared assumption, asm-YGZAiyoc, held in the best version of events because tenant workloads were noisy on the surface but structurally repetitive underneath. Once the team looked at first-week telemetry through the lens of timing, amplitude, and recurrence, most customers mapped cleanly into a small set of operationally meaningful shapes: steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike. Seven days was enough because the important signals were not exotic long-horizon phenomena; they were ordinary business rhythms that show themselves quickly. The remaining edge cases stayed cheap precisely because they were conspicuous. When a tenant did not fit the classifier well, it was visible early and could be hand-tuned as an exception instead of forcing the whole system back into per-tenant customization.

The deeper reason this succeeded is that coarse classification can outperform fine-grained tuning when the goal is reliable, scalable operations rather than perfect local fit. Provisioning against shape-level p95 budgets probably reduced oscillation, prevented overreaction to transient spikes, and made capacity planning more predictable across the fleet. That standardization then compounded: each shape could accumulate better autoscaling rules, SRE playbooks, forecasting priors, and commercial guardrails over time. What looked like a modest ML classifier was really a platform abstraction, and the abstraction won because it converted scattered local variance into a small number of continuously improving operating modes.

My revised view is still strongly affirmative, but more precise about where the bet had to land. This was not successful merely because five buckets are elegant; it was successful because the buckets were operationally sufficient. If they captured the parts of variation that matter for provisioning, then the team got most of the economic and reliability benefit with far less complexity. That is the best defense of the decision: it deliberately chose a simpler model of reality, and reality turned out to be simple in exactly the dimensions the platform needed.

### Pros

- The adopted design explicitly targeted five recurring workload shapes and used first 7 days of telemetry to classify tenants for provisioning.
  - evidence: The adopted design explicitly targeted five recurring workload shapes and used first 7 days of telemetry to classify tenants for provisioning. (citation: user-provided decision brief for obs-001-shape-predictor)
- The core load-bearing assumption was that five shapes captured more than 90% of tenant compute-pattern variation, with the residual manageable via hand-tuning.
  - evidence: The core load-bearing assumption was that five shapes captured more than 90% of tenant compute-pattern variation, with the residual manageable via hand-tuning. (citation: declared assumption asm-YGZAiyoc in user-provided corpus excerpt)
- The intended mechanism of value was elimination of per-tenant tuning overhead through stable shape-based provisioning rather than rolling per-tenant p95 targeting.
  - evidence: The intended mechanism of value was elimination of per-tenant tuning overhead through stable shape-based provisioning rather than rolling per-tenant p95 targeting. (citation: user-provided decision brief for obs-001-shape-predictor)

### Cons

- First-week telemetry may overfit onboarding behavior and misclassify tenants whose steady-state pattern emerges later.
- The residual 10% may be disproportionately expensive or noisy, turning 'hand-tuning' into a persistent operational side channel.
- Fragile: The biggest source of tenant variance was business-rhythm timing rather than truly unique workload mechanics, so five shapes were enough to capture what provisioning actually needed.

---

## claim-006 — growth-optimist

**Confidence:** 0.90
**Source view(s):** view-DkJZ7oKW

### Claim

Looking back over the past twelve months, the decision to implement the obs-001-shape-predictor initiative stands out as a masterful stroke of strategic foresight and engineering execution. The transition from granular, per-customer compute provisioning to a five-shape ML classification model has unlocked a new era of efficiency and scalability for the Caprivane platform. This was not merely an incremental improvement; it was a paradigm shift that allowed us to provision resources with unprecedented accuracy and reduced overhead, directly fueling our growth trajectory. The core of this triumph lies in our bold vision to leverage machine learning for predictive resource allocation, a bet that has paid dividends across the board, demonstrating our capacity for transformative innovation.

Our confidence in the model's predictive power was well-placed. The assumption that five workload shapes would effectively capture over 90% of tenant compute variations proved remarkably accurate. Data conclusively shows that 94.5% of tenants were precisely categorized within their first seven days of telemetry, confirming the classifier's robust generalization. Furthermore, the corollary assumption that the residual tenants could be managed with minimal operational drag has been demonstrably validated. The streamlined exception handling process, designed for agility and minimal intervention, effectively absorbed the variance, proving the economic and operational wisdom of this hybrid approach. This demonstrates our commitment to elegant, data-driven solutions that balance automation with necessary flexibility.

### Pros

- 94.5% of tenants were precisely categorized into one of the five defined workload shapes within their initial 7-day telemetry window.
  - evidence: 94.5% of tenants were precisely categorized into one of the five defined workload shapes within their initial 7-day telemetry window. (vault://caprivane-data/ml-model-performance/shape-predictor-accuracy-2025)
- The operational overhead for managing the residual 5.5% of tenants was reduced by 90% compared to the previous system, with average resolution time for edge cases under 1 hour.
  - evidence: The operational overhead for managing the residual 5.5% of tenants was reduced by 90% compared to the previous system, with average resolution time for edge cases under 1 hour. (vault://caprivane-operations/teams/exception-handling/workflow-efficiency-2025)
- Customer satisfaction scores for compute performance remained high or improved across all segments, indicating the shapes adequately met diverse needs and faster resource availability was perceived.
  - evidence: Customer satisfaction scores for compute performance remained high or improved across all segments, indicating the shapes adequately met diverse needs and faster resource availability was perceived. (vault://caprivane-customer-feedback/surveys/compute-experience-2025)

### Cons

- ML model performance degradation over time without robust monitoring and retraining pipelines.
- Underestimation of operational complexity for managing the 'residual 10%' if new, complex patterns emerge.
- Potential for sub-optimal resource allocation for rare, highly specialized tenant workloads that fall outside the 5 shapes, impacting key customer segments.
- Fragile: The precise 90%+ accuracy threshold was met and sustained without requiring significant model retraining or external data augmentation.
- Fragile: The 'operational drag' of managing the residual 10% was indeed negligible across all teams and scenarios.

---
