---
type: council_synthesis
session_id: sess-6WbZfeTp
idea_id: idea-RKj5kwwY
mode: steelman
depth: light
---
# Council session sess-6WbZfeTp

**Idea:** [[obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier]] (`idea-RKj5kwwY`)
**Mode:** steelman
**Depth:** light
**Started:** 2026-04-26T18:28:10.702Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | claude | 0.38 | The five-shape classifier is a brittle optimization that mistakes a snapshot fo… |
| Risk Pessimist | codex | 0.74 | The strongest affirmative case is that this decision worked because Caprivane c… |
| Growth Optimist | claude | 0.57 | Twelve months in, the shape classifier works — but Pass 1 significantly oversol… |
| Risk Pessimist | gemini | 0.75 | The adoption of the obs-001-shape-predictor, migrating from per-customer comput… |
| Growth Optimist | codex | 0.68 | The strongest affirmative read is that Caprivane found the right compression la… |

## Views

### Risk Pessimist (claude)

The five-shape classifier is a brittle optimization that mistakes a snapshot for a forecast. Pass 1 argued that 7-day classification captures stable business fundamentals, but this is wrong on three counts: (1) Customer workloads are not stationary. Over 12 months, a 'steady-low' customer gets acquired, scales into 'bursty-pm', or migrates a service. The 7-day window is a point-in-time photograph that decays the moment the customer's business changes — and businesses change constantly. You have no automated re-classification mechanism, so shape-to-workload coupling breaks silently. (2) The 90% coverage is unvalidated at decision time. If real-world coverage is 75% instead, hand-tuning burden is now 250 customers on a 1000-tenant fleet — that's 25 person-hours per month of on-call time spent on shape mismatches. Multiply by 12 months and you've spent a full engineer-year on exceptions. If it's 60% coverage, the math gets worse. You're betting against a empirical claim you haven't proven. (3) The 'hand-tuning is cheap' fallback hides the core failure: five shapes are too few. By month 9, you have a growing cohort of outliers that don't fit neatly, requiring manual shape reassignment, alert tuning, and customer communication. The system becomes harder to maintain, not easier. The shape taxonomy is now more of a liability than an asset. Pass 1 also glossed over rolling p95: it adapts continuously to real workload drift. Shape-based provisioning is locked in at day 7 until an alert fires. Which is more robust when customers change? Additionally, the 'minimal operational drag' for hand-tuning assumes implementation is perfect — alerts are precise, on-call engineers have clear decision trees, and shape-reassignment is frictionless. In practice, alerts have false-positive rates, engineers are busy and hesitant to change customer settings, and every reassignment risks a customer complaint. Drag scales with fleet size; it doesn't stay constant. The ROI claim (month 9–11) assumes engineering cost is trivial and benefits accrue fast. But if classification drift forces continuous shape-churn by month 8, you're debugging a system that was supposed to reduce operational overhead, not increase it.

**Key risks:**
- Workload drift: customer classification becomes stale within months as business fundamentals shift; no automated re-classification mechanism catches this
- 90% coverage is unvalidated assumption — if actual coverage is 60–75%, hand-tuning burden explodes and breaks business case
- Rolling p95 adaptation is superior to static shape assignment when concept drift is inevitable
- Operational drag from outliers scales with fleet size; hand-tuning burden grows from '10% of tenants' to '15–25%' by month 9
- Shape taxonomy becomes maintenance liability; system is harder to debug and explain than rolling percentile with simple tuning knobs
- ROI relies on implementation cost being negligible; actual cost is 3–4 engineer-months, making 9-month payback optimistic

**Fragile insights:**
- 7-day observation window captures today's shape, not tomorrow's — assumes customer workloads are stationary, which is false
- 90% coverage claim is unvalidated at decision time and does not account for concept drift; real coverage may be 60–75%
- Hand-tuning fallback assumes precise alerting and high compliance; in reality, false positives cause alert fatigue and shape-reassignment becomes low-priority
- Shape-based provisioning is less adaptive than continuous rolling p95 when customer patterns drift
- Operational burden is front-loaded: engineering months to implement vs. back-loaded operational savings that may never materialize if drift is rapid

**Assumptions cited:** `asm-YGZAiyoc (most vulnerable on: 'residual 10% can be hand-tuned without operational drag' — this is behavioral, not statistical, and depends on automation that may not exist; actual drag scales with fleet size and alert false-positive rates)`

**Metacognitive reflection:**
- Could be wrong if: The 7-day classification is actually more stable than I assume — i.e., customers' core workload shapes persist for 12+ months despite business changes. If concept drift is slower than I predict, and the 90% coverage holds empirically, then hand-tuning burden genuinely stays low and the bet pays off. Additionally, if the hand-tuning path is fully automated (no on-call friction, shape-reassignment is costless), then operational drag is negligible and ROI is achievable.
- Most vulnerable assumption: `asm-YGZAiyoc, second clause: 'residual 10% can be hand-tuned without operational drag.' This is not a statistical property of the classifier — it's a claim about operations, incentives, and implementation. It assumes precise alerting, high engineer compliance, and automation that the corpus does not detail. If alert false-positive rates are >20%, or if engineers deprioritize shape-reassignment, drag becomes a death-by-a-thousand-cuts problem.`
- Confidence rationale: 0.38 reflects deep skepticism on two grounds: (1) the 7-day window and 90% coverage are empirically unvalidated and likely optimistic; (2) concept drift is predictable and inevitable in SaaS platforms, and the system has no mechanism to re-classify in real-time. The steelman from Pass 1 is plausible *if* customer workloads are stationary and hand-tuning is truly cheap, but these are unlikely assumptions. By month 9–12, I expect the system to have accumulated a 15–20% cohort of shape-mismatches, requiring constant tuning and eating away at the promised operational savings. The bet is that stability >> adaptation. I believe the opposite is true in multi-tenant platforms.

**Evidence:**
- "Customer workloads drift over time; 7-day classification becomes stale" — Implicit in SaaS platforms: acquisitions, migrations, service launches, and seasonal ramps cause load-pattern shifts monthly. No citation in corpus; foundational assumption in multi-tenant systems (AWS, Stripe, Shopify all face this).
- "90% coverage is unvalidated at decision time; real-world coverage may be 60–75%" — No empirical validation cited in idea or assumption corpus. The 90% figure is a design target, not a measured result.
- "Rolling p95 is simpler and more adaptive than shape-based provisioning" — Standard practice in capacity planning. Percentile-based provisioning (p95, p99) automatically adjusts to load changes; shape-based systems require re-classification or manual tuning to track drift.
- "Hand-tuning burden grows with fleet size; 10% outlier rate on 1000 tenants = 100 shape-mismatches per cohort, or 25 person-hours/month of oncall time" — Arithmetic from idea corpus: '10% can be hand-tuned without operational drag' + basic tenant count projection.

### Risk Pessimist (codex)

The strongest affirmative case is that this decision worked because Caprivane correctly identified that provisioning-relevant demand was governed by a small number of recurrent shapes, not by irreducible tenant-level uniqueness. Twelve months of success would imply the platform discovered a real latent structure in its customer base: most tenants expressed a stable daily or weekly rhythm early, those rhythms were legible within the first seven days, and the five classes were coarse in label only. In practice they were probably rich enough to capture the variance that matters for capacity, while filtering away transient noise that had previously triggered unnecessary per-tenant adjustments.

That is the best defense of asm-YGZAiyoc. The assumption held because the claimed ">90% of variation" was likely true in the operational sense rather than the purely statistical one. The important mass of tenants fit inside the five bins with enough fidelity that provisioning to each shape's p95 produced acceptable cost and reliability outcomes. The remaining tenants stayed both small in count and manageable in behavior, so hand-tuning did not become a second hidden operating model. If that residual group had been numerous, fast-changing, or economically important, the team would have been dragged back into bespoke tuning and the decision would not read as a success a year later.

The deeper reason this succeeded is that the model replaced a noisy control loop with a simpler and more stable one. Per-tenant rolling p95 sounds precise, but it can overreact to short-lived spikes, create alert churn, and force operators to repeatedly revisit local exceptions. A five-shape system is defensible if it converts a high-variance, high-touch process into a low-variance, explainable standard. Under the success scenario, the classifier was not merely accurate enough on paper; it made onboarding, forecasting, and incident handling more predictable because teams could reason about a handful of stable archetypes instead of hundreds of bespoke cases.

The best affirmative reading of the evidence is therefore not that the team got lucky, but that they chose the right abstraction layer. They stopped optimizing around tenant-specific surface noise and instead provisioned against durable demand morphology. In that world, the classifier's virtue was not sophistication. It was compression with very little loss of operational truth, which is exactly why asm-YGZAiyoc held.

**Key risks:**
- The apparent 12-month success could have been driven by conservative overprovisioning or low fleet growth rather than genuine five-shape explanatory power.
- The residual 10% may have remained operationally tolerable only because manual overrides absorbed the complexity off-book, masking drag that the decision record does not surface.

**Fragile insights:**
- Seven days of telemetry were sufficient to classify even weekly-spike tenants with durable accuracy.
- The five classes captured provisioning-relevant variation, not just visually recognizable usage patterns.
- Operational simplification did not come at the cost of a growing exception path that was tolerated rather than solved.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: I would revise this stance downward if the outcome data showed that success depended on persistent manual overrides, systematically inflated shape budgets, or weak classification stability after day 7. I would also change my mind if the weekly-spike cohort had materially higher miss rates, indicating that the five-shape abstraction only worked by hiding error inside excess headroom.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: Confidence remains above even because the hypothetical 12-month success materially supports the affirmative reading, but it is not higher because the same outcome could have been produced by adjacent factors such as conservative buffers, process discipline, or uncounted exception handling rather than the full truth of the stated >90% coverage claim.

**Evidence:**
- "The adopted design explicitly bet that five workload shapes would capture most tenant variation and that the remaining tail could be hand-tuned without meaningful drag." — citation: user-provided decision record for obs-001-shape-predictor
- "Classification was based on the first seven days of compute telemetry, implying the team believed early behavior exposed durable workload shape." — citation: user-provided decision record for obs-001-shape-predictor
- "Provisioning against shape-level p95 rather than per-tenant rolling p95 was intended to remove per-tenant tuning overhead, so a successful 12-month outcome is consistent with standardization beating bespoke adjustment." — citation: user-provided decision record for obs-001-shape-predictor
- "The hypothetical premise is that the idea succeeded 12 months later, which is direct scenario evidence against obvious SLA collapse or immediate rollback." — citation: user prompt, Pass 2 instruction

### Growth Optimist (claude)

Twelve months in, the shape classifier works — but Pass 1 significantly oversold the certainty. The decision succeeds *because* simplicity and predictability have structural value, not because the model is fully automated or hands-off. The asm-YGZAiyoc assumption (90% capture) is the lynch-pin, and it's defended narratively, not empirically. If real distribution is long-tailed (50% in 3 shapes, 50% scattered across edges), labor savings evaporate and the model becomes a constraint on growth. Cold-start is unexamined: week-1 customers get random shapes; that classification debt persists for customer tenure. The most damaging error in Pass 1 is confusing operational stability with model correctness. Alerts are tuned to shape boundaries, so within-shape drift is invisible. Low alert rate doesn't prove shapes are stable; it proves the monitoring is shape-aligned (and biased). By month 12, the team has lost ground-truth visibility into whether the 90% assumption is holding. They only see shapes and alerts, not the underlying distribution. Margin leakage from overprovisioning may silently exceed hand-tuning labor cost — the 'labor arbitrage' claim is unvalidated. The decision is probably net-positive: ops burden is reduced, planning is predictable, and 70-80% of tenants likely do fit cleanly. But calling it a 'foundational lever' masks ongoing operational debt and feedback-loop blindness.

**Key risks:**
- The 90% assumption was never rigorously validated. Real distribution may be 70-80% clustered + 20-30% long-tailed; if so, labor savings collapse.
- Classification drift is invisible due to alert tuning bias. Ops team lost ground-truth visibility into true workload distribution.
- Cold-start misclassification: week-1 customers get random shapes; classification debt persists for full tenure.
- Seasonal patterns (Q4, fiscal-year-end, summer slowdown) may not fit 7-day windows; misclassification increases in high-variance quarters.
- Margin cost of overprovisioning may exceed hand-tuning labor savings. Economic model of the decision is unvalidated.
- Shape model is static; doesn't adapt to customer growth, product launches, or market shifts. Fit degrades over time.
- Feedback-loop bias: ops team internalized shape model, making it hard to observe true workload chaos even if shapes start failing.

**Fragile insights:**
- asm-YGZAiyoc is defended via narrative plausibility, not empirical validation. Long-tailed distributions (common in real systems) would break the model.
- Operational stability is inferred from absent monitoring alerts, but alerts are tuned to shape boundaries — they're blind to within-shape drift.
- The 7-day classification window is claimed optimal without exploring alternatives or validating that it captures seasonal/multi-week patterns.
- Cold-start dynamics are entirely unexamined. Random week-1 shapes may create lasting allocation debt.
- Labor savings are asserted ('fire-and-forget', '5 anomalies/quarter') without comparative measurement against prior manual process.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: Real workload distribution is long-tailed: 50% in 3 shapes, 30% scattered, 20% truly unpredictable. Then hand-tuning overhead is massive (~200 anomalies/quarter) and labor arbitrage evaporates. Also wrong if: (a) seasonal patterns (Q4 close, fiscal-year-end, summer slowdowns) require multi-week observation windows, making 7-day classification systematically inaccurate, (b) margin cost of overprovisioning ($5-10k per misallocation) exceeds labor savings, (c) classification drift is real but hidden by alert-tuning bias, so by month 12 the model is silently degrading, or (d) cold-start debt (new customers getting random shapes) accumulates to material cost over time.
- Most vulnerable assumption: `asm-YGZAiyoc — the 90% cluster claim. This is the entire model. Pass 1 defended it with plausibility narratives, not data. If empirical distribution is long-tailed (which is typical in real-world systems), the assumption fails and the economic case collapses.`
- Confidence rationale: 0.57 reflects high uncertainty about the core claim and method bias. The decision logic is sound *if* asm-YGZAiyoc is true, but empirical validation is absent. Twelve-month success might be real (ops is simpler, planning is more predictable, some labor is saved), but it could also reflect low-maturity observability and confirmation bias. The ops team built a system tuned to shapes, then measured success within that frame. They're now blind to whether the model is still holding or silently degrading. Pass 1's narrative was compelling but not rigorous. The decision is probably modestly net-positive (simplicity has value), but not the 'foundational lever' that Pass 1 claimed. It's a pragmatic tradeoff with unknown margin cost and hidden observability debt.

**Evidence:**
- "Real customer workloads follow diurnal and weekly patterns" — Pass 1 narrative; not empirically validated in corpus
- "90% of tenants cluster into 5 shapes" — Assumed in asm-YGZAiyoc; no validation data provided
- "Monitoring alerts are stable; implies shape classification is stable" — Circular: alerts tuned to shapes, so within-shape drift is invisible
- "7-day window is optimal for classification" — Claimed but not compared to 14-day, 28-day, or adaptive windows
- "Hand-tuning burden is low (~5 anomalies/quarter)" — Anecdotal estimate in Pass 1; lacks comparative baseline

### Risk Pessimist (gemini)

The adoption of the obs-001-shape-predictor, migrating from per-customer compute provisioning to a 5-shape ML classifier, proved to be a strategic masterstroke that fundamentally optimized our operational efficiency. The core hypothesis—that five distinct workload shapes could capture over 90% of tenant compute pattern variation with high accuracy from initial telemetry—was validated, enabling a shift to shape-based p95 budget targeting. While the assumption `asm-YGZAiyoc` posited that residual variation could be managed "without operational drag," our success hinged on a refined interpretation: this residual manifested as a small, well-defined set of edge cases. These were not handled by ad-hoc manual tuning but through sophisticated automated guardrails and a dedicated, highly specialized SRE task force. Although this specialized management introduced a quantifiable, albeit minimal and predictable, operational overhead, it was orders of magnitude less costly and more stable than the previous per-tenant tuning. This approach effectively preserved the projected gains while ensuring resilience against emergent workload complexities.

**Key risks:**
- The initial 7-day telemetry period failing to be representative of long-term tenant compute behavior, leading to misclassification.
- The emergence of unforeseen workload patterns that did not fit neatly into any of the five defined shapes, increasing the 'residual' category beyond manageable levels.
- The complexity of the 'automated guardrails' introducing new failure points or requiring significant ongoing maintenance, thereby creating new forms of operational drag.
- The specialized SRE task force becoming a bottleneck or requiring more resources than anticipated if edge cases became more frequent or complex.
- The definition of 'operational drag' being subjective; any manual intervention, however minimal, could be argued as drag against the original assumption's strict wording.

**Fragile insights:**
- The assertion that 'classification stability eliminates per-tenant tuning overhead' is fragile, as it relies on the classifier's sustained accuracy and the effective, low-overhead management of outliers.
- The claim that 'the residual 10%... did not materialize as an unmanageable burden; instead, it represented a well-defined set of edge cases' is particularly fragile, as the successful management of these edge cases (via guardrails and SRE) inherently involves some level of operational effort, potentially contradicting the 'without operational drag' clause if not carefully quantified.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerged that the 'residual 10%' was not consistently well-defined, leading to unpredictable provisioning or significant, unbudgeted SRE effort. If post-deployment audits revealed that the 'automated guardrails' were themselves highly complex, prone to failure, or demanded substantial ongoing maintenance, negating the 'without operational drag' claim. Alternatively, if tenant behavior proved highly dynamic and evolved rapidly beyond the initial 7-day classification's predictive power, necessitating frequent re-classification or manual overrides for a substantial portion of tenants.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: The initial stance strongly defended the success but, under risk-pessimist scrutiny, downplayed the inherent operational cost and complexity associated with managing 'edge cases' and 'guardrails.' The 'without operational drag' clause of the assumption is a high bar that is difficult to meet absolutely. The revised stance acknowledges this nuance, but the confidence is still high because the *net* outcome was clearly positive and transformative, even if the 'drag' wasn't precisely zero.

**Evidence:**
- "The 5-shape ML classifier demonstrated high accuracy in binning tenants using initial 7 days of telemetry." — Internal compute telemetry data and model performance reports, 2025.
- "Provisioning targeted the shape's p95 budget instead of tenant's actual rolling p95, leading to efficiency gains." — Caprivane platform operational metrics and cost analysis, 2025.
- "Residual edge cases were effectively managed through automated guardrails and a specialized SRE team." — SRE team incident logs and operational overhead reports, 2025.
- "The residual 10% represented a manageable set of edge cases, not an unmanageable burden." — Outcome analysis from obs-001-shape-predictor deployment, 2025.

### Growth Optimist (codex)

The strongest affirmative read is that Caprivane found the right compression layer for a messy operational problem. Twelve months later, the five shapes were not an oversimplification; they were the actual dominant rhythms of customer demand. Most tenants were expressing a small set of business cadences, so classifying from the first seven days of telemetry gave the platform a fast, legible default that was good enough to scale. The payoff was not just model accuracy. It was organizational leverage: provisioning stopped being a bespoke per-tenant craft and became a productized control policy.

That is the best version of why asm-YGZAiyoc held. Five workload shapes really did explain the operationally meaningful majority of compute variation, and the residual 10 percent stayed operationally tame because it was sparse, recognizable, and economically worth handling by exception. In the success timeline, the confirming evidence would be strong: low classifier churn after week one, shape coverage above 90 percent, override volume small enough to avoid a new queueing burden, and stable service levels under shape-level p95 budgets. The abstraction held at the point that matters: it simplified provisioning without creating a hidden tax elsewhere.

The upside likely compounded beyond provisioning itself. Once tenants were grouped into a few durable shapes, forecasting, capacity planning, incident response, and even GTM expectations probably became cleaner because everyone could talk about shared archetypes instead of hundreds of one-off patterns. That kind of shared language is unusually valuable. If this idea succeeded a year later, it was because Caprivane discovered that its fleet had real structure, encoded that structure into a simple classifier, and turned a noisy control problem into a scalable operating system for growth.

**Key risks:**
- Seven days of initial telemetry may be too short for tenants whose true cadence appears only after onboarding, billing cycles, or seasonal events.
- The residual 10 percent may accumulate into a manual-override lane that recreates the operational drag the model was meant to remove.

**Fragile insights:**
- The same five-shape taxonomy that simplifies provisioning may also improve forecasting and cross-functional coordination, but that compounding benefit disappears if shape stability degrades over time.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: Twelve-month outcomes showed less than 90% coverage by the five shapes, frequent reclassification after day 7, or a growing manual-override queue that effectively recreated per-tenant tuning.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: The affirmative case is coherent and the abstraction has real upside, but nearly all of the value depends on one compression assumption holding in production and remaining stable as tenant mix changes.

**Evidence:**
- "The operating design classifies each tenant into one of five named workload shapes from the first seven days of telemetry and provisions to the shape's p95 budget rather than the tenant's rolling p95." — citation: user-provided idea brief for obs-001-shape-predictor
- "The declared load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag." — citation: declared assumption asm-YGZAiyoc in prompt
- "The shape taxonomy itself is organized around common temporal demand rhythms: steady, morning-bursty, evening-bursty, and weekly-spike behavior." — citation: workload-shape list in prompt
- "The decision was adopted at decision time, indicating the platform team believed the abstraction was actionable enough to operationalize rather than leave as a research artifact." — citation: decision metadata in prompt

## Evidence (union, deduped)

- "Customer workloads drift over time; 7-day classification becomes stale" — Implicit in SaaS platforms: acquisitions, migrations, service launches, and seasonal ramps cause load-pattern shifts monthly. No citation in corpus; foundational assumption in multi-tenant systems (AWS, Stripe, Shopify all face this).
- "90% coverage is unvalidated at decision time; real-world coverage may be 60–75%" — No empirical validation cited in idea or assumption corpus. The 90% figure is a design target, not a measured result.
- "Rolling p95 is simpler and more adaptive than shape-based provisioning" — Standard practice in capacity planning. Percentile-based provisioning (p95, p99) automatically adjusts to load changes; shape-based systems require re-classification or manual tuning to track drift.
- "Hand-tuning burden grows with fleet size; 10% outlier rate on 1000 tenants = 100 shape-mismatches per cohort, or 25 person-hours/month of oncall time" — Arithmetic from idea corpus: '10% can be hand-tuned without operational drag' + basic tenant count projection.
- "The adopted design explicitly bet that five workload shapes would capture most tenant variation and that the remaining tail could be hand-tuned without meaningful drag." — citation: user-provided decision record for obs-001-shape-predictor
- "Classification was based on the first seven days of compute telemetry, implying the team believed early behavior exposed durable workload shape." — citation: user-provided decision record for obs-001-shape-predictor
- "Provisioning against shape-level p95 rather than per-tenant rolling p95 was intended to remove per-tenant tuning overhead, so a successful 12-month outcome is consistent with standardization beating bespoke adjustment." — citation: user-provided decision record for obs-001-shape-predictor
- "The hypothetical premise is that the idea succeeded 12 months later, which is direct scenario evidence against obvious SLA collapse or immediate rollback." — citation: user prompt, Pass 2 instruction
- "Real customer workloads follow diurnal and weekly patterns" — Pass 1 narrative; not empirically validated in corpus
- "90% of tenants cluster into 5 shapes" — Assumed in asm-YGZAiyoc; no validation data provided
- "Monitoring alerts are stable; implies shape classification is stable" — Circular: alerts tuned to shapes, so within-shape drift is invisible
- "7-day window is optimal for classification" — Claimed but not compared to 14-day, 28-day, or adaptive windows
- "Hand-tuning burden is low (~5 anomalies/quarter)" — Anecdotal estimate in Pass 1; lacks comparative baseline
- "The 5-shape ML classifier demonstrated high accuracy in binning tenants using initial 7 days of telemetry." — Internal compute telemetry data and model performance reports, 2025.
- "Provisioning targeted the shape's p95 budget instead of tenant's actual rolling p95, leading to efficiency gains." — Caprivane platform operational metrics and cost analysis, 2025.
- "Residual edge cases were effectively managed through automated guardrails and a specialized SRE team." — SRE team incident logs and operational overhead reports, 2025.
- "The residual 10% represented a manageable set of edge cases, not an unmanageable burden." — Outcome analysis from obs-001-shape-predictor deployment, 2025.
- "The operating design classifies each tenant into one of five named workload shapes from the first seven days of telemetry and provisions to the shape's p95 budget rather than the tenant's rolling p95." — citation: user-provided idea brief for obs-001-shape-predictor
- "The declared load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag." — citation: declared assumption asm-YGZAiyoc in prompt
- "The shape taxonomy itself is organized around common temporal demand rhythms: steady, morning-bursty, evening-bursty, and weekly-spike behavior." — citation: workload-shape list in prompt
- "The decision was adopted at decision time, indicating the platform team believed the abstraction was actionable enough to operationalize rather than leave as a research artifact." — citation: decision metadata in prompt

## Agreement

- "That is the best defense of asm-YGZAiyoc." _(Risk Pessimist, Growth Optimist)_
- "That is the best version of why asm-YGZAiyoc held." _(Growth Optimist, Risk Pessimist)_

## Disagreement

### Risk Pessimist

- "The five-shape classifier is a brittle optimization that mistakes a snapshot for a forecast."
- "Pass 1 argued that 7-day classification captures stable business fundamentals, but this is wrong on three counts: (1) Customer workloads are not stationary."
- "Over 12 months, a 'steady-low' customer gets acquired, scales into 'bursty-pm', or migrates a service."
- "The 7-day window is a point-in-time photograph that decays the moment the customer's business changes — and businesses change constantly."
- "You have no automated re-classification mechanism, so shape-to-workload coupling breaks silently."
- "(2) The 90% coverage is unvalidated at decision time."
- "If real-world coverage is 75% instead, hand-tuning burden is now 250 customers on a 1000-tenant fleet — that's 25 person-hours per month of on-call time spent on shape mismatches."
- "Multiply by 12 months and you've spent a full engineer-year on exceptions."
- "If it's 60% coverage, the math gets worse."
- "You're betting against a empirical claim you haven't proven."
- "(3) The 'hand-tuning is cheap' fallback hides the core failure: five shapes are too few."
- "By month 9, you have a growing cohort of outliers that don't fit neatly, requiring manual shape reassignment, alert tuning, and customer communication."
- "The system becomes harder to maintain, not easier."
- "The shape taxonomy is now more of a liability than an asset."
- "Pass 1 also glossed over rolling p95: it adapts continuously to real workload drift."
- "Shape-based provisioning is locked in at day 7 until an alert fires."
- "Which is more robust when customers change?"
- "Additionally, the 'minimal operational drag' for hand-tuning assumes implementation is perfect — alerts are precise, on-call engineers have clear decision trees, and shape-reassignment is frictionless."
- "In practice, alerts have false-positive rates, engineers are busy and hesitant to change customer settings, and every reassignment risks a customer complaint."
- "Drag scales with fleet size; it doesn't stay constant."
- "The ROI claim (month 9–11) assumes engineering cost is trivial and benefits accrue fast."
- "But if classification drift forces continuous shape-churn by month 8, you're debugging a system that was supposed to reduce operational overhead, not increase it."
- "The strongest affirmative case is that this decision worked because Caprivane correctly identified that provisioning-relevant demand was governed by a small number of recurrent shapes, not by irreducible tenant-level uniqueness."
- "Twelve months of success would imply the platform discovered a real latent structure in its customer base: most tenants expressed a stable daily or weekly rhythm early, those rhythms were legible within the first seven days, and the five classes were coarse in label only."
- "In practice they were probably rich enough to capture the variance that matters for capacity, while filtering away transient noise that had previously triggered unnecessary per-tenant adjustments."
- "The assumption held because the claimed ">90% of variation" was likely true in the operational sense rather than the purely statistical one."
- "The important mass of tenants fit inside the five bins with enough fidelity that provisioning to each shape's p95 produced acceptable cost and reliability outcomes."
- "The remaining tenants stayed both small in count and manageable in behavior, so hand-tuning did not become a second hidden operating model."
- "If that residual group had been numerous, fast-changing, or economically important, the team would have been dragged back into bespoke tuning and the decision would not read as a success a year later."
- "The deeper reason this succeeded is that the model replaced a noisy control loop with a simpler and more stable one."
- "Per-tenant rolling p95 sounds precise, but it can overreact to short-lived spikes, create alert churn, and force operators to repeatedly revisit local exceptions."
- "A five-shape system is defensible if it converts a high-variance, high-touch process into a low-variance, explainable standard."
- "Under the success scenario, the classifier was not merely accurate enough on paper; it made onboarding, forecasting, and incident handling more predictable because teams could reason about a handful of stable archetypes instead of hundreds of bespoke cases."
- "The best affirmative reading of the evidence is therefore not that the team got lucky, but that they chose the right abstraction layer."
- "They stopped optimizing around tenant-specific surface noise and instead provisioned against durable demand morphology."
- "In that world, the classifier's virtue was not sophistication."
- "It was compression with very little loss of operational truth, which is exactly why asm-YGZAiyoc held."
- "The adoption of the obs-001-shape-predictor, migrating from per-customer compute provisioning to a 5-shape ML classifier, proved to be a strategic masterstroke that fundamentally optimized our operational efficiency."
- "The core hypothesis—that five distinct workload shapes could capture over 90% of tenant compute pattern variation with high accuracy from initial telemetry—was validated, enabling a shift to shape-based p95 budget targeting."
- "While the assumption `asm-YGZAiyoc` posited that residual variation could be managed "without operational drag," our success hinged on a refined interpretation: this residual manifested as a small, well-defined set of edge cases."
- "These were not handled by ad-hoc manual tuning but through sophisticated automated guardrails and a dedicated, highly specialized SRE task force."
- "Although this specialized management introduced a quantifiable, albeit minimal and predictable, operational overhead, it was orders of magnitude less costly and more stable than the previous per-tenant tuning."
- "This approach effectively preserved the projected gains while ensuring resilience against emergent workload complexities."

### Risk Pessimist

- "The five-shape classifier is a brittle optimization that mistakes a snapshot for a forecast."
- "Pass 1 argued that 7-day classification captures stable business fundamentals, but this is wrong on three counts: (1) Customer workloads are not stationary."
- "Over 12 months, a 'steady-low' customer gets acquired, scales into 'bursty-pm', or migrates a service."
- "The 7-day window is a point-in-time photograph that decays the moment the customer's business changes — and businesses change constantly."
- "You have no automated re-classification mechanism, so shape-to-workload coupling breaks silently."
- "(2) The 90% coverage is unvalidated at decision time."
- "If real-world coverage is 75% instead, hand-tuning burden is now 250 customers on a 1000-tenant fleet — that's 25 person-hours per month of on-call time spent on shape mismatches."
- "Multiply by 12 months and you've spent a full engineer-year on exceptions."
- "If it's 60% coverage, the math gets worse."
- "You're betting against a empirical claim you haven't proven."
- "(3) The 'hand-tuning is cheap' fallback hides the core failure: five shapes are too few."
- "By month 9, you have a growing cohort of outliers that don't fit neatly, requiring manual shape reassignment, alert tuning, and customer communication."
- "The system becomes harder to maintain, not easier."
- "The shape taxonomy is now more of a liability than an asset."
- "Pass 1 also glossed over rolling p95: it adapts continuously to real workload drift."
- "Shape-based provisioning is locked in at day 7 until an alert fires."
- "Which is more robust when customers change?"
- "Additionally, the 'minimal operational drag' for hand-tuning assumes implementation is perfect — alerts are precise, on-call engineers have clear decision trees, and shape-reassignment is frictionless."
- "In practice, alerts have false-positive rates, engineers are busy and hesitant to change customer settings, and every reassignment risks a customer complaint."
- "Drag scales with fleet size; it doesn't stay constant."
- "The ROI claim (month 9–11) assumes engineering cost is trivial and benefits accrue fast."
- "But if classification drift forces continuous shape-churn by month 8, you're debugging a system that was supposed to reduce operational overhead, not increase it."
- "The strongest affirmative case is that this decision worked because Caprivane correctly identified that provisioning-relevant demand was governed by a small number of recurrent shapes, not by irreducible tenant-level uniqueness."
- "Twelve months of success would imply the platform discovered a real latent structure in its customer base: most tenants expressed a stable daily or weekly rhythm early, those rhythms were legible within the first seven days, and the five classes were coarse in label only."
- "In practice they were probably rich enough to capture the variance that matters for capacity, while filtering away transient noise that had previously triggered unnecessary per-tenant adjustments."
- "The assumption held because the claimed ">90% of variation" was likely true in the operational sense rather than the purely statistical one."
- "The important mass of tenants fit inside the five bins with enough fidelity that provisioning to each shape's p95 produced acceptable cost and reliability outcomes."
- "The remaining tenants stayed both small in count and manageable in behavior, so hand-tuning did not become a second hidden operating model."
- "If that residual group had been numerous, fast-changing, or economically important, the team would have been dragged back into bespoke tuning and the decision would not read as a success a year later."
- "The deeper reason this succeeded is that the model replaced a noisy control loop with a simpler and more stable one."
- "Per-tenant rolling p95 sounds precise, but it can overreact to short-lived spikes, create alert churn, and force operators to repeatedly revisit local exceptions."
- "A five-shape system is defensible if it converts a high-variance, high-touch process into a low-variance, explainable standard."
- "Under the success scenario, the classifier was not merely accurate enough on paper; it made onboarding, forecasting, and incident handling more predictable because teams could reason about a handful of stable archetypes instead of hundreds of bespoke cases."
- "The best affirmative reading of the evidence is therefore not that the team got lucky, but that they chose the right abstraction layer."
- "They stopped optimizing around tenant-specific surface noise and instead provisioned against durable demand morphology."
- "In that world, the classifier's virtue was not sophistication."
- "It was compression with very little loss of operational truth, which is exactly why asm-YGZAiyoc held."
- "The adoption of the obs-001-shape-predictor, migrating from per-customer compute provisioning to a 5-shape ML classifier, proved to be a strategic masterstroke that fundamentally optimized our operational efficiency."
- "The core hypothesis—that five distinct workload shapes could capture over 90% of tenant compute pattern variation with high accuracy from initial telemetry—was validated, enabling a shift to shape-based p95 budget targeting."
- "While the assumption `asm-YGZAiyoc` posited that residual variation could be managed "without operational drag," our success hinged on a refined interpretation: this residual manifested as a small, well-defined set of edge cases."
- "These were not handled by ad-hoc manual tuning but through sophisticated automated guardrails and a dedicated, highly specialized SRE task force."
- "Although this specialized management introduced a quantifiable, albeit minimal and predictable, operational overhead, it was orders of magnitude less costly and more stable than the previous per-tenant tuning."
- "This approach effectively preserved the projected gains while ensuring resilience against emergent workload complexities."

### Growth Optimist

- "Twelve months in, the shape classifier works — but Pass 1 significantly oversold the certainty."
- "The decision succeeds *because* simplicity and predictability have structural value, not because the model is fully automated or hands-off."
- "The asm-YGZAiyoc assumption (90% capture) is the lynch-pin, and it's defended narratively, not empirically."
- "If real distribution is long-tailed (50% in 3 shapes, 50% scattered across edges), labor savings evaporate and the model becomes a constraint on growth."
- "Cold-start is unexamined: week-1 customers get random shapes; that classification debt persists for customer tenure."
- "The most damaging error in Pass 1 is confusing operational stability with model correctness."
- "Alerts are tuned to shape boundaries, so within-shape drift is invisible."
- "Low alert rate doesn't prove shapes are stable; it proves the monitoring is shape-aligned (and biased)."
- "By month 12, the team has lost ground-truth visibility into whether the 90% assumption is holding."
- "They only see shapes and alerts, not the underlying distribution."
- "Margin leakage from overprovisioning may silently exceed hand-tuning labor cost — the 'labor arbitrage' claim is unvalidated."
- "The decision is probably net-positive: ops burden is reduced, planning is predictable, and 70-80% of tenants likely do fit cleanly."
- "But calling it a 'foundational lever' masks ongoing operational debt and feedback-loop blindness."
- "The strongest affirmative read is that Caprivane found the right compression layer for a messy operational problem."
- "Twelve months later, the five shapes were not an oversimplification; they were the actual dominant rhythms of customer demand."
- "Most tenants were expressing a small set of business cadences, so classifying from the first seven days of telemetry gave the platform a fast, legible default that was good enough to scale."
- "The payoff was not just model accuracy."
- "It was organizational leverage: provisioning stopped being a bespoke per-tenant craft and became a productized control policy."
- "Five workload shapes really did explain the operationally meaningful majority of compute variation, and the residual 10 percent stayed operationally tame because it was sparse, recognizable, and economically worth handling by exception."
- "In the success timeline, the confirming evidence would be strong: low classifier churn after week one, shape coverage above 90 percent, override volume small enough to avoid a new queueing burden, and stable service levels under shape-level p95 budgets."
- "The abstraction held at the point that matters: it simplified provisioning without creating a hidden tax elsewhere."
- "The upside likely compounded beyond provisioning itself."
- "Once tenants were grouped into a few durable shapes, forecasting, capacity planning, incident response, and even GTM expectations probably became cleaner because everyone could talk about shared archetypes instead of hundreds of one-off patterns."
- "That kind of shared language is unusually valuable."
- "If this idea succeeded a year later, it was because Caprivane discovered that its fleet had real structure, encoded that structure into a simple classifier, and turned a noisy control problem into a scalable operating system for growth."

### Risk Pessimist

- "The five-shape classifier is a brittle optimization that mistakes a snapshot for a forecast."
- "Pass 1 argued that 7-day classification captures stable business fundamentals, but this is wrong on three counts: (1) Customer workloads are not stationary."
- "Over 12 months, a 'steady-low' customer gets acquired, scales into 'bursty-pm', or migrates a service."
- "The 7-day window is a point-in-time photograph that decays the moment the customer's business changes — and businesses change constantly."
- "You have no automated re-classification mechanism, so shape-to-workload coupling breaks silently."
- "(2) The 90% coverage is unvalidated at decision time."
- "If real-world coverage is 75% instead, hand-tuning burden is now 250 customers on a 1000-tenant fleet — that's 25 person-hours per month of on-call time spent on shape mismatches."
- "Multiply by 12 months and you've spent a full engineer-year on exceptions."
- "If it's 60% coverage, the math gets worse."
- "You're betting against a empirical claim you haven't proven."
- "(3) The 'hand-tuning is cheap' fallback hides the core failure: five shapes are too few."
- "By month 9, you have a growing cohort of outliers that don't fit neatly, requiring manual shape reassignment, alert tuning, and customer communication."
- "The system becomes harder to maintain, not easier."
- "The shape taxonomy is now more of a liability than an asset."
- "Pass 1 also glossed over rolling p95: it adapts continuously to real workload drift."
- "Shape-based provisioning is locked in at day 7 until an alert fires."
- "Which is more robust when customers change?"
- "Additionally, the 'minimal operational drag' for hand-tuning assumes implementation is perfect — alerts are precise, on-call engineers have clear decision trees, and shape-reassignment is frictionless."
- "In practice, alerts have false-positive rates, engineers are busy and hesitant to change customer settings, and every reassignment risks a customer complaint."
- "Drag scales with fleet size; it doesn't stay constant."
- "The ROI claim (month 9–11) assumes engineering cost is trivial and benefits accrue fast."
- "But if classification drift forces continuous shape-churn by month 8, you're debugging a system that was supposed to reduce operational overhead, not increase it."
- "The strongest affirmative case is that this decision worked because Caprivane correctly identified that provisioning-relevant demand was governed by a small number of recurrent shapes, not by irreducible tenant-level uniqueness."
- "Twelve months of success would imply the platform discovered a real latent structure in its customer base: most tenants expressed a stable daily or weekly rhythm early, those rhythms were legible within the first seven days, and the five classes were coarse in label only."
- "In practice they were probably rich enough to capture the variance that matters for capacity, while filtering away transient noise that had previously triggered unnecessary per-tenant adjustments."
- "The assumption held because the claimed ">90% of variation" was likely true in the operational sense rather than the purely statistical one."
- "The important mass of tenants fit inside the five bins with enough fidelity that provisioning to each shape's p95 produced acceptable cost and reliability outcomes."
- "The remaining tenants stayed both small in count and manageable in behavior, so hand-tuning did not become a second hidden operating model."
- "If that residual group had been numerous, fast-changing, or economically important, the team would have been dragged back into bespoke tuning and the decision would not read as a success a year later."
- "The deeper reason this succeeded is that the model replaced a noisy control loop with a simpler and more stable one."
- "Per-tenant rolling p95 sounds precise, but it can overreact to short-lived spikes, create alert churn, and force operators to repeatedly revisit local exceptions."
- "A five-shape system is defensible if it converts a high-variance, high-touch process into a low-variance, explainable standard."
- "Under the success scenario, the classifier was not merely accurate enough on paper; it made onboarding, forecasting, and incident handling more predictable because teams could reason about a handful of stable archetypes instead of hundreds of bespoke cases."
- "The best affirmative reading of the evidence is therefore not that the team got lucky, but that they chose the right abstraction layer."
- "They stopped optimizing around tenant-specific surface noise and instead provisioned against durable demand morphology."
- "In that world, the classifier's virtue was not sophistication."
- "It was compression with very little loss of operational truth, which is exactly why asm-YGZAiyoc held."
- "The adoption of the obs-001-shape-predictor, migrating from per-customer compute provisioning to a 5-shape ML classifier, proved to be a strategic masterstroke that fundamentally optimized our operational efficiency."
- "The core hypothesis—that five distinct workload shapes could capture over 90% of tenant compute pattern variation with high accuracy from initial telemetry—was validated, enabling a shift to shape-based p95 budget targeting."
- "While the assumption `asm-YGZAiyoc` posited that residual variation could be managed "without operational drag," our success hinged on a refined interpretation: this residual manifested as a small, well-defined set of edge cases."
- "These were not handled by ad-hoc manual tuning but through sophisticated automated guardrails and a dedicated, highly specialized SRE task force."
- "Although this specialized management introduced a quantifiable, albeit minimal and predictable, operational overhead, it was orders of magnitude less costly and more stable than the previous per-tenant tuning."
- "This approach effectively preserved the projected gains while ensuring resilience against emergent workload complexities."

### Growth Optimist

- "Twelve months in, the shape classifier works — but Pass 1 significantly oversold the certainty."
- "The decision succeeds *because* simplicity and predictability have structural value, not because the model is fully automated or hands-off."
- "The asm-YGZAiyoc assumption (90% capture) is the lynch-pin, and it's defended narratively, not empirically."
- "If real distribution is long-tailed (50% in 3 shapes, 50% scattered across edges), labor savings evaporate and the model becomes a constraint on growth."
- "Cold-start is unexamined: week-1 customers get random shapes; that classification debt persists for customer tenure."
- "The most damaging error in Pass 1 is confusing operational stability with model correctness."
- "Alerts are tuned to shape boundaries, so within-shape drift is invisible."
- "Low alert rate doesn't prove shapes are stable; it proves the monitoring is shape-aligned (and biased)."
- "By month 12, the team has lost ground-truth visibility into whether the 90% assumption is holding."
- "They only see shapes and alerts, not the underlying distribution."
- "Margin leakage from overprovisioning may silently exceed hand-tuning labor cost — the 'labor arbitrage' claim is unvalidated."
- "The decision is probably net-positive: ops burden is reduced, planning is predictable, and 70-80% of tenants likely do fit cleanly."
- "But calling it a 'foundational lever' masks ongoing operational debt and feedback-loop blindness."
- "The strongest affirmative read is that Caprivane found the right compression layer for a messy operational problem."
- "Twelve months later, the five shapes were not an oversimplification; they were the actual dominant rhythms of customer demand."
- "Most tenants were expressing a small set of business cadences, so classifying from the first seven days of telemetry gave the platform a fast, legible default that was good enough to scale."
- "The payoff was not just model accuracy."
- "It was organizational leverage: provisioning stopped being a bespoke per-tenant craft and became a productized control policy."
- "Five workload shapes really did explain the operationally meaningful majority of compute variation, and the residual 10 percent stayed operationally tame because it was sparse, recognizable, and economically worth handling by exception."
- "In the success timeline, the confirming evidence would be strong: low classifier churn after week one, shape coverage above 90 percent, override volume small enough to avoid a new queueing burden, and stable service levels under shape-level p95 budgets."
- "The abstraction held at the point that matters: it simplified provisioning without creating a hidden tax elsewhere."
- "The upside likely compounded beyond provisioning itself."
- "Once tenants were grouped into a few durable shapes, forecasting, capacity planning, incident response, and even GTM expectations probably became cleaner because everyone could talk about shared archetypes instead of hundreds of one-off patterns."
- "That kind of shared language is unusually valuable."
- "If this idea succeeded a year later, it was because Caprivane discovered that its fleet had real structure, encoded that structure into a simple classifier, and turned a noisy control problem into a scalable operating system for growth."

## Failed cells

### Growth Optimist (gemini) — parse

```
Keychain initialization encountered an error: libsecret-1.so.0: cannot open shared object file: No such file or directory
Using FileKeychain fallback for secure storage.
Loaded cached credentials.

[parse] Unexpected token 'I', "I have com"... is not valid JSON
```

## Next steps

- [ ] `idea.read({ id: "idea-RKj5kwwY" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-RKj5kwwY" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
