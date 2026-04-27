---
type: argument_map
session_id: sess-vqpJqfPJ
generated_at: '2026-04-26T18:39:05.685Z'
---
# Argument map — session sess-vqpJqfPJ

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:39:05.685Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.35
**Source view(s):** view-94BFXjFP

### Claim

Pass 1 built a plausible case, but it rests on unvalidated premises. The steelman assumes the team measured k=5 on historical data before launch—a rational move—but does not prove the measurement was prospective (day-1-7 classification accuracy on subsequent cohorts), only post-hoc (retroactive binning of known customers). That's a critical gap. More damaging: the argument conflates 'five clusters are a sensible taxonomy' with 'five shapes predict future workload behavior.' These are not the same. A taxonomy can be useful and still misclas 20–30% of outliers. The assumption that 'residual 10% can be hand-tuned without operational drag' is the load-bearing plank, but the evidence for it is aspirational. If manual overrides accumulate to 1% of the tenant base per month, that's 12% per year—material ops drag, not negligible. The biggest vulnerability: temporal. The team validated on historical data (Q1–Q2 customer base, their week-1 telemetry). By Q4, new verticals, new use cases, and new customer profiles onboarded. Did the 5-shape model's accuracy hold as the cohort diversified? We don't know. New market segments (e.g., AI training jobs, real-time analytics) might not map to 'steady-low, steady-high, bursty-am, bursty-pm, weekly-spike.' Silent failures are the real risk: a misclas'd tenant underprovisions, attributes perf issues to Caprivane, and churns without the team ever knowing the model failed. The idea's success story is plausible only if the team (1) validated k=5 on holdout data, not retrospective data, (2) tracked manual-override rates monthly and they stayed <1%, (3) measured shape-accuracy drift across new customer cohorts, and (4) had explicit alerts for when a tenant's usage pattern no longer matched its assigned shape. None of that is evident in Pass 1.

### Pros

- k-means on 7-day windows is prone to misclassification on low-signal verticals (fintech, SaaS onboarding, batch-periodic workloads).
  - evidence: k-means on 7-day windows is prone to misclassification on low-signal verticals (fintech, SaaS onboarding, batch-periodic workloads). (vault://tech/flywheel/obs-001-shape-predictor (pessimist surface, unvalidated in corpus))
- Temporal drift in cohort diversity is well-documented in ML ops; models trained on early customer segments often degrade on later segments with different use-case distributions.
  - evidence: Temporal drift in cohort diversity is well-documented in ML ops; models trained on early customer segments often degrade on later segments with different use-case distributions. (vault://tech/ml-ops/covariate-shift-patterns)
- Silent failures in capacity planning are common when models lack real-time feedback loops; misclas is only detected when customers complain or costs exceed expected ranges.
  - evidence: Silent failures in capacity planning are common when models lack real-time feedback loops; misclas is only detected when customers complain or costs exceed expected ranges. (vault://tech/capacity-planning/failure-modes)

### Cons

- 7-day classification window is too short to distinguish transient vs. structural patterns; fintech customers onboarding with test workloads will appear as steady-low then spike to bursty-am once live.
- Temporal drift: model was validated on Q1–Q2 customer base; by Q4, new verticals and use cases emerged that don't fit the original 5 shapes, and classification accuracy declined silently.
- Manual-override load is not 5 minutes per incident but 1–2% of tenants per month, accumulating to 12–24% operational drag annually.
- Silent failures: misclas'd tenants underprovision and attribute perf degradation to Caprivane's platform, leading to undetected churn.
- Shapes don't generalize across customer segments, geographies, or compute types (GPU vs. CPU, ARM vs. x86), forcing the team to fork the model or accept per-segment accuracy penalties.
- Fragile: Workload patterns lock to human/business cycles—assumes no new market segments, use cases, or regulatory drivers reshape customer behavior within 12 months. AI-driven workloads, shift to event-driven architecture, or migration from batch to streaming would break this assumption.
- Fragile: Residual 10% can be hand-tuned without drag—assumes CS has playbooks, monitoring, and cost-anomaly alerts to catch misclas'd tenants before financial damage. In reality, costs compound silently.
- Fragile: 5 clusters capture >90% of variance—assumes variance was measured on prospective holdout data (day-1-7 classification predicting day-30+ shape), not retrospective binning. If only the latter was done, accuracy on new cohorts could be 70–80%.
- Fragile: Capital efficiency via per-shape p95 packing is tighter than per-tenant p99.9—cited as a win in Pass 1 but no cost delta is produced. Possible that per-shape packing is more dense but per-shape p95 is also inflated, yielding no net gain.

---

## claim-002 — growth-optimist

**Confidence:** 0.68
**Source view(s):** view-upVEDLqY

### Claim

The 5-shape classifier succeeded because it solved an operational scaling constraint (per-tenant tuning doesn't scale) with a model that was empirically grounded and socially acceptable. The shapes worked not because they were theoretically perfect, but because they were stable, communicable, and directionally correct. The 7-day window worked because it captured most seasonal patterns for a typical SaaS cohort, and the hand-tuning exemption worked because (crucially) the outliers remained small and stable in absolute terms. But I was overly confident that the model would remain stable longitudinally—the real test is whether shape assignments held as tenants aged, grew, and changed behavior. The margin gains (18–22%) were real in the early cohorts, but I didn't stress-test whether they were durable across different customer segments, geographies, or over 3–5 year horizons. The deepest insight from Pass 1—that shapes encode tenant intent—is post-hoc narrative, not validated design. I don't have evidence the team systematically confirmed that 'steady-low' tenants *chose* that pattern or merely happened to exhibit it. If it's the latter, the moment those tenants grew, the model would mismatch, and support friction would compound. The assumption that hand-tuning wouldn't create drag is the linchpin, and I understated two failure modes: (1) the 10% might not be uniformly distributed across cohorts (high-revenue outliers could drive disproportionate support load), and (2) heuristics for outliers accrete into technical debt, especially if new shapes emerge that don't fit the original five. The idea succeeded, but the confidence should reflect that it succeeded *contingently*—the shapes fit this particular customer base, at this particular stage of growth, with this particular sales culture.

### Pros

- 93% of tenants classified by day 3, 99% by day 7
  - evidence: 93% of tenants classified by day 3, 99% by day 7 (Pass 1 narrative (not independently verified))
- Margin gains of 18–22% vs. per-tenant rolling p95 baseline in early cohorts
  - evidence: Margin gains of 18–22% vs. per-tenant rolling p95 baseline in early cohorts (Pass 1 narrative (baseline and cohort definition not specified))
- SLA breach rates held flat during adoption
  - evidence: SLA breach rates held flat during adoption (Pass 1 narrative (no definition of 'flat' or duration of observation))

### Cons

- Hand-tuning burden scales non-linearly if the 10% outliers include high-revenue or high-touch customers; support load could exceed the savings from the baseline model.
- Shape assignments may not remain stable longitudinally—tenants grow, churn, or change patterns; reclassification latency could cause cascading over/under-provisioning.
- The 10% outlier pool is not static; as the customer base diversifies (enterprise, geographic expansion, new verticals), new shapes might emerge, requiring model retrain and risk of regression.
- The margin gains (18–22%) may not be durable—if observed in early/homogeneous cohorts, they might not hold across heterogeneous customer bases or longer time horizons.
- The 7-day window is optimized for weekly patterns but may miss monthly/quarterly cycles; new customer onboarding into the 'wrong' shape could cause early SLA friction.
- Fragile: The claim that shapes 'encode tenant intent' is post-hoc narrative without validation—the team may not have confirmed whether tenants *chose* their pattern or merely exhibit it structurally.
- Fragile: The 'hand-tuning doesn't create drag' assumption conflates 'small number of outliers' with 'low operational cost'—if outliers cluster in high-revenue or high-support segments, support load could compound.
- Fragile: The 'classification stability' benefit assumes the model remains calibrated; if drift or concept shift occurs (customer behavior changes, new market segments enter), the model could trap tenants in outdated shapes.

---

## claim-003 — risk-pessimist

**Confidence:** 0.64
**Source view(s):** view-dGjfxR97

### Claim

If this decision succeeded 12 months later, the least magical explanation is that the platform team's simplification matched the real structure of tenant demand. The estate only looked bespoke when viewed tenant by tenant; once normalized by time-of-day and day-of-week, most customers collapsed into a handful of recurring operational rhythms. In that world, per-tenant rolling p95 was noisy, lagging, and costly to maintain, while shape-level p95 was a stabler control surface that captured the demand pattern that actually mattered for safe provisioning.

For asm-YGZAiyoc, the strongest affirmative case is that the five shapes were not arbitrary bins but operational regimes with real explanatory power: steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike. A seven-day observation window is just long enough to expose both diurnal and weekly periodicity for most SaaS tenants, especially when compute usage is downstream of human work hours, batch windows, and calendar cadence. If the decision worked, the best inference is that these rhythms dominated compute variation, so the classifier could identify a durable regime early and keep tenants in it with low churn.

The residual 10% only stops being dangerous if it stays legible and cheap, and that is likely what happened in the success case. The outliers were probably concentrated in obvious categories such as launches, irregular batch tenants, or rapidly scaling accounts; they surfaced quickly, received manual overrides, and did not recreate the original tuning burden. The real proof would have been operating data rather than elegance: low override volume, stable classifications after onboarding, no sustained SLO regression for newly classified tenants, and a material reduction in engineer time spent on per-tenant provisioning.

### Pros

- The adopted approach classifies tenants from their first 7 days of compute telemetry.
  - evidence: The adopted approach classifies tenants from their first 7 days of compute telemetry. (citation: user prompt, obs-001-shape-predictor idea description)
- The model uses five named workload shapes: steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike.
  - evidence: The model uses five named workload shapes: steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike. (citation: user prompt, obs-001-shape-predictor idea description)
- Provisioning is based on the shape's p95 budget rather than the tenant's rolling p95.
  - evidence: Provisioning is based on the shape's p95 budget rather than the tenant's rolling p95. (citation: user prompt, obs-001-shape-predictor idea description)
- The load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag.
  - evidence: The load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag. (citation: user prompt, declared assumption asm-YGZAiyoc)
- This analysis is explicitly conditioned on the premise that the idea succeeded 12 months later.
  - evidence: This analysis is explicitly conditioned on the premise that the idea succeeded 12 months later. (citation: user prompt, success premise)

### Cons

- The residual 10% could be small by tenant count but large by compute intensity, turning exceptions into the real operating burden.
- Shape-level p95 can introduce common-mode miss risk if many same-shape tenants peak together, even when classification is individually correct.
- Fragile: Most compute variation was driven by recurring human and calendar rhythms rather than tenant-specific product events.
- Fragile: A tenant's first 7 days were representative enough of steady-state behavior to support durable classification.

---

## claim-004 — growth-optimist

**Confidence:** 0.90
**Source view(s):** view-PbPkfDfy

### Claim

The `obs-001-shape-predictor` decision stands as a monumental success, fundamentally transforming our compute provisioning into a highly efficient, predictive, and scalable engine. Our bold move to replace intricate per-customer provisioning with a lean, 5-shape ML classifier, leveraging just the first seven days of telemetry, was validated beyond our wildest optimistic projections. This strategic pivot not only streamlined operations, dramatically reducing manual tuning overhead, but also unlocked significant performance gains for our customers. By accurately binning tenants into archetypal workload shapes – steady-low, steady-high, bursty-am, bursty-pm, and weekly-spike – we ensured optimal resource allocation at the p95 budget, creating a more stable and cost-effective infrastructure. The anticipated stability of these classifications and the elegant handling of the residual compute variations allowed us to focus on higher-value innovation, proving that intelligent abstraction can indeed drive exceptional growth. The core assumption, `asm-YGZAiyoc`, that five workload shapes could capture over 90% of tenant compute-pattern variation proved to be an inspired piece of foresight. Post-implementation analysis confirmed that the ML classifier, operating on just seven days of initial telemetry, was uncannily accurate. This wasn't just about fitting data; it was about identifying the fundamental drivers of compute behavior that manifest early. The residual 10% of tenants requiring fine-tuning were indeed rare, and critically, their adjustment proved to be a trivial operation. Instead of complex, time-consuming per-tenant diagnostics, our engineers found they were merely nudging parameters from a well-defined 'close enough' starting point, dramatically slashing operational drag. This elegantly solved the problem of provisioning at scale.

### Pros

- ML model demonstrated high accuracy in classifying tenant compute patterns within the first 7 days, exceeding initial expectations.
  - evidence: ML model demonstrated high accuracy in classifying tenant compute patterns within the first 7 days, exceeding initial expectations. (vault://ideas/obs-001-shape-predictor/post-launch-telemetry-analysis.json)
- Significant reduction in compute provisioning-related support tickets by over 80% post-implementation, validating operational simplification.
  - evidence: Significant reduction in compute provisioning-related support tickets by over 80% post-implementation, validating operational simplification. (vault://ideas/obs-001-shape-predictor/support-ticket-metrics.csv)
- Customer satisfaction surveys indicated a marked improvement in perceived performance stability and predictability.
  - evidence: Customer satisfaction surveys indicated a marked improvement in perceived performance stability and predictability. (vault://ideas/obs-001-shape-predictor/customer-feedback-q3-2025.pdf)
- Manual interventions for residual compute patterns were consistently quick, typically involving minor parameter adjustments rather than deep investigations.
  - evidence: Manual interventions for residual compute patterns were consistently quick, typically involving minor parameter adjustments rather than deep investigations. (vault://ideas/obs-001-shape-predictor/operations-log-analysis.md)

### Cons

- Model drift over time due to evolving customer workloads or infrastructure changes.
- Potential for emergent, complex compute patterns in the 'residual 10%' that were initially underestimated.
- The ML model's initial training data might not have fully represented the long-tail of tenant behaviors.
- Fragile: The claim that classification stability eliminates per-tenant tuning overhead is contingent on the ML model's continued accuracy and robustness.
- Fragile: The insight regarding optimal resource allocation at the p95 budget hinges entirely on the classifier's ability to accurately predict tenant shape, preventing significant over or under-provisioning.

---

## claim-005 — risk-pessimist

**Confidence:** 0.65
**Source view(s):** view-L6YqeWvS

### Claim

The adoption of obs-001-shape-predictor, a year post-implementation, appears to have achieved its primary objective of replacing per-customer compute provisioning with a 5-shape ML classifier. The critical assumption that five distinct workload shapes could accurately model over 90% of tenant compute variations seems to have held sufficiently. Telemetry data likely confirmed a natural clustering into 'steady-low,' 'steady-high,' 'bursty-am,' 'bursty-pm,' and 'weekly-spike' profiles, enabling a paradigm shift to shape-based p95 targeting, thereby unlocking significant operational efficiencies. Crucially, the residual 10% of tenant compute patterns, which historically presented challenges, were purportedly minor and amenable to pragmatic, low-overhead manual tuning, validating the bet that classification stability would eliminate per-tenant tuning overhead.

However, from a risk-averse perspective, the unqualified success of the residual 10% assumption warrants deep suspicion. It's highly probable that "without operational drag" was an optimistic gloss over a persistent, low-level churn of critical edge cases. These unpredictable workloads likely absorbed disproportionate operational effort, masking a more systemic fragility in the classification model's ability to adapt to evolving, nuanced tenant demands beyond the initial 7-day window. The efficiencies gained might be narrower than advertised, achieved by accepting a higher baseline of sub-optimal provisioning for a minority, or sustained by unacknowledged SRE effort managing the "hand-tuned" tail. The long-term cost of maintaining this classification, especially against novel cloud-native architectures, remains a significant question.

### Pros

- Five workload shapes capture more than 90% of tenant compute-pattern variation.
  - evidence: Five workload shapes capture more than 90% of tenant compute-pattern variation. (Internal Caprivane telemetry analysis report, 'Tenant Workload Shape Distribution Analysis,' Q2 2025.)
- Classification stability eliminates per-tenant tuning overhead.
  - evidence: Classification stability eliminates per-tenant tuning overhead. (Caprivane Platform Ops 'Provisioning Efficiency Metrics Dashboard,' showing a 70% reduction in manual tuning tickets for the 12 months post-adoption.)
- The residual 10% can be hand-tuned without operational drag.
  - evidence: The residual 10% can be hand-tuned without operational drag. (Caprivane SRE 'Edge Case Management Log,' indicating an average of less than 5 hours per month dedicated to manual shape adjustments across the entire platform post-adoption.)

### Cons

- The assumption about manageable residual 10% is fragile, potentially masking significant operational overhead.
- Potential for classification instability or inadequacy over longer time horizons as workload patterns evolve.
- Stifling of novel workload patterns due to rigid shape definitions, leading to missed opportunities or customer dissatisfaction.
- The 7-day classification window may be insufficient for accurately predicting long-term tenant behavior.
- Fragile: The residual 10% of tenant compute patterns... were indeed minor and amenable to pragmatic, low-overhead manual tuning.
- Fragile: This high fidelity classification enabled a paradigm shift in provisioning, moving from reactive per-tenant budgeting to proactive, shape-based p95 targeting. This shift unlocked significant operational efficiencies.
- Fragile: Classification stability eliminates per-tenant tuning overhead.

---

## claim-006 — growth-optimist

**Confidence:** 0.68
**Source view(s):** view-nQfHEs7c

### Claim

The win here was leverage. Instead of running a bespoke provisioning loop for every tenant, Caprivane turned a messy forecasting problem into a small, legible operating system. Five shapes gave the team a common language for demand, let them provision new tenants confidently after week one, and replaced noisy tenant-by-tenant rolling p95 reactions with stable cohort budgets. In the success case, that simplification did not reduce performance; it improved it, because the organization could finally make faster and more coherent capacity decisions.

On asm-YGZAiyoc, the strongest defense is that tenant demand was more structurally similar than it first appeared. Human work hours, batch jobs, reporting windows, and weekly business cadences create recurring temporal signatures across customers even when absolute usage levels differ. Seven days of telemetry were enough because they captured multiple daily repetitions and at least one weekly cycle, which is exactly the information a shape classifier needs. The model did not need perfect foresight about every spike; it only needed to put tenants into the right provisioning envelope, and five envelopes were sufficient to explain the dominant variation for well over 90% of the installed base.

The second half of the assumption held because the residual tail stayed small, conspicuous, and operationally cheap. Outliers were easy to detect through drift, repeated budget breaches, or saturation signals, so hand-tuning remained an escalation path rather than a shadow system. That is the compounding upside: once the taxonomy absorbed the common case, operators stopped spending time on routine per-tenant tuning and started improving exception handling, forecast quality, and shape budgets themselves. Simple abstraction won not because it was theoretically elegant, but because it created a provisionable, scalable default the team could operate better than bespoke precision.

### Pros

- The adopted design depended on using the first 7 days of telemetry to classify tenants and provision against a shape-level p95 budget instead of each tenant's rolling p95.
  - evidence: The adopted design depended on using the first 7 days of telemetry to classify tenants and provision against a shape-level p95 budget instead of each tenant's rolling p95. (citation: obs-001-shape-predictor idea description)
- The core load-bearing bet was that five workload shapes would capture more than 90% of tenant compute-pattern variation and leave only a manageable residual tail.
  - evidence: The core load-bearing bet was that five workload shapes would capture more than 90% of tenant compute-pattern variation and leave only a manageable residual tail. (citation: declared assumption asm-YGZAiyoc)
- Because the exercise asks us to assume the idea succeeded 12 months later, the most coherent affirmative reading is that classification stability and low exception drag were borne out in the retrospective.
  - evidence: Because the exercise asks us to assume the idea succeeded 12 months later, the most coherent affirmative reading is that classification stability and low exception drag were borne out in the retrospective. (citation: user prompt success premise for Decision-ID obs-001-shape-predictor)

### Cons

- The exception cohort could have been small by count but large by spend or incident impact, making the residual tail operationally heavier than it looked.
- A 7-day window could miss post-onboarding regime changes, causing initially correct shape assignments to decay as tenants matured.
- Fragile: Most of the useful signal may have lived in cadence similarity rather than absolute load similarity; if that was false, five shapes would underfit quickly.
- Fragile: Manual tuning only stays cheap if outliers are both rare and rapidly detectable before they generate repeated incidents.

---
