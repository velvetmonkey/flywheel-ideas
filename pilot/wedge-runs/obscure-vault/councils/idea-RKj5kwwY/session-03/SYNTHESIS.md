---
type: council_synthesis
session_id: sess-C7xQV7PZ
idea_id: idea-RKj5kwwY
mode: pre_mortem
depth: light
---
# Council session sess-C7xQV7PZ

**Idea:** [[obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier]] (`idea-RKj5kwwY`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T18:07:41.410Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | codex | 0.68 | Twelve months later, this failed because `asm-YGZAiyoc` turned out to be false … |
| Risk Pessimist | claude | 0.52 | The shape predictor likely failed on temporal instability, not concept. My Pass… |
| Growth Optimist | codex | 0.59 | Twelve months later, I would still expect this decision to have failed because … |
| Risk Pessimist | gemini | 0.80 | The adoption of the obs-001-shape-predictor, which sought to replace granular p… |
| Growth Optimist | claude | 0.52 | The shapes were right in principle — clustering always works better than raw p9… |
| Growth Optimist | gemini | 0.70 | While the obs-001-shape-predictor initiative didn't achieve its 12-month goals,… |

## Views

### Risk Pessimist (codex)

Twelve months later, this failed because `asm-YGZAiyoc` turned out to be false in the only way that matters operationally: the miss cases were not small, cheap, or stable. Five workload shapes did not capture more than 90% of tenant compute-pattern variation once real customers changed behavior after onboarding, expanded across regions, launched new features, or shifted usage by timezone and season. The residual was not a tidy tail; it was the part of the distribution that creates incidents, escalations, and surprise spend.

The second half of `asm-YGZAiyoc` failed just as badly. Even if the median tenant fit one of the five bins, the non-fitting tenants were exactly the ones that imposed drag. Hand-tuning them was not a light exception path. It became a parallel control plane with ad hoc overrides, stale tickets, and unclear ownership. Every override also weakened the claimed simplification, because engineers now had to maintain both the classifier logic and a growing catalog of tenant-specific exceptions.

The first-7-days design choice made this worse. Early telemetry is often polluted by migration bursts, trial usage, incomplete integrations, backfills, or unusually quiet ramp periods. That means the classifier attached long-lived provisioning consequences to low-quality initial evidence. Once provisioning targeted the shape p95 instead of the tenant's own rolling p95, the platform discarded a corrective feedback loop and replaced it with a brittle prior. Under-provisioning showed up on fast-growing and time-shifting tenants; over-provisioning accumulated on quiet or misread accounts. The savings case eroded while reliability still got worse.

The deeper failure was that the decision optimized for administrative neatness rather than error cost. Aggregate fit can look acceptable while the expensive edge cases dominate toil and customer pain. This idea failed because it embedded a coarse taxonomy into resource allocation and assumed the exceptions would remain operationally cheap. They were not.

**Key risks:**
- The residual variation outside the five shapes is concentrated in high-cost tenants, so exception handling becomes the real provisioning system.
- Using only the first 7 days for classification locks in misprovisioning when early telemetry is unrepresentative or tenant behavior later drifts.

**Fragile insights:**
- The failure likely came less from average classifier accuracy and more from the cost concentration of the misclassified tail; this collapses if the tail was operationally cheap.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: I would weaken this stance materially if outcome data showed that more than 90% of tenants stayed in one shape over time, manual overrides remained rare and short-lived, incident rates did not rise after switching from rolling p95 provisioning, and the savings from removing per-tenant tuning persisted for a full year.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: Confidence is moderate rather than high because the declared assumption is clearly load-bearing and the failure modes are structurally plausible, but the prompt does not provide ground-truth outcomes. The strongest parts of the case come directly from the decision design; the weaker parts infer how large and costly the residual miss cases became.

**Evidence:**
- "The adopted design bins each customer into one of five workload shapes using their first 7 days of compute telemetry." — citation: idea text in user-provided decision record
- "Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95." — citation: idea text in user-provided decision record
- "The load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag." — citation: declared assumption asm-YGZAiyoc in prompt

### Risk Pessimist (claude)

The shape predictor likely failed on temporal instability, not concept. My Pass 1 attack was too confident in the decay narrative. If 5 shapes captured >90% of variation at classification (day 7), that's defensible. The real failure mode is probably narrower: either (a) the team misimplemented re-classification and let shapes go stale by month 6, creating silent under-provisioning; or (b) the residual 10% wasn't uniformly distributed—certain customer segments (high-growth startups, volatile competitors) clustered in that tail, making hand-tuning expensive despite small headcount. A third scenario I underweighted: the shapes *worked* better than the previous system, but the team kept raising the bar on what 'success' meant, chasing a fully-predictive system instead of iterating on shapes + alerting. By month 12, they'd killed shapes not because they failed, but because perfect became the enemy of good. I'm less confident the shapes were categorically wrong, more confident the *operational assumptions* around how the team would maintain them were optimistic.

**Key risks:**
- Silent misclassification: shapes degrade over 6-12 months but the team lacks automated drift detection, so certain tenants go persistently under-provisioned without surfacing as an outage
- Residual-10% concentration: the 10% of workloads not captured by shapes are not uniformly random; high-growth customers and volatile competitors cluster there, making hand-tuning much more expensive than anticipated
- Re-classification cadence: the team never implemented automatic re-training or re-classification; shapes are trained once at adoption and never updated, guaranteeing drift-driven failure by month 6-9
- Opportunity cost of simplification: by committing to 5 shapes, the team closes off more sophisticated strategies (e.g., per-feature budgets, predictive scaling) and later discovers those strategies would have been higher-ROI
- Baseline comparison missing: shapes might have been better than the previous system but worse than what was technically possible, yet the team conflates the two and kills shapes prematurely

**Fragile insights:**
- The 90% target was actually met at classification time, but I'm assuming it wasn't—if shapes truly captured 90% of initial variation, the concept was sound and the failure was operational (re-training, threshold selection, or misimplementation), not the model itself
- Hand-tuning the 10% is a small operational burden, not firefighting—the assumption that 'without drag' is feasible depends on whether the residual cases are edge-case singletons or a concentrated segment of high-value customers
- Workload shapes are stable enough over a quarter or two—seasonal patterns might exist but slow-moving; I'm assuming rapid drift, but drift might be gradual enough that a re-classification every 90 days keeps pace
- The team had a clear success metric and hit it—I'm assuming vague aspirational goals, but if the goal was 'reduce provisioning overhead 50%' and they delivered 55%, that's not a failure story at month 12

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: The 90% classification target was actually achieved (not known from prompt); a re-classification pipeline existed and kept shapes within 2-3% drift; the 10% residual was genuinely rare (e.g., <50 tenants) and not concentrated in high-revenue segments; or the team measured success as 'reduce toil vs. previous system' rather than 'eliminate manual tuning entirely' and hit their target
- Most vulnerable assumption: `asm-YGZAiyoc — I'm attacking the assumption as a unit, but it's actually two separable claims: (1) five shapes capture >90% of variation (this is a statistical claim I can't verify without data) and (2) residual cases don't create drag (this is an operational claim that depends on distribution and headcount, neither of which I know). I'm vulnerable on both, but especially on (1)—if the shapes genuinely captured 90%, my entire premise collapses.`
- Confidence rationale: Lowered to 0.52 from implicit ~0.70 in Pass 1 because: I don't have data on classification accuracy (vulnerable ±0.15), don't know if re-training was implemented (vulnerable ±0.10), don't know the baseline system or success metric (vulnerable ±0.15). My confidence in the concept being brittle to drift is moderate (0.60), but my confidence that drift actually caused the failure is low (0.45) because I don't know the team's operational practices. The intersection of 'shapes were insufficient' AND 'the team didn't mitigate it' is what I need for a strong pessimist case, and I have weak evidence for both.

**Evidence:**
- "No direct evidence available—this is a hypothetical 12-month retrospective with no stated outcomes, cost data, or implementation details" — citation://prompt
- "Assumption of rapid workload drift is common in cloud platforms but not guaranteed; some customer bases are stable, others highly volatile" — citation://platform-experience
- "The phrasing 'without operational drag' is doing interpretive heavy lifting; need precise definition of what 'hand-tuning' entails (person-hours, incident frequency, blast radius)" — citation://prompt-language-analysis

### Growth Optimist (codex)

Twelve months later, I would still expect this decision to have failed because `asm-YGZAiyoc` bundled two optimistic leaps into one neat story. First, the platform probably discovered that five shapes did not capture the economically important parts of tenant variation, even if they looked decent in aggregate. The misses were likely concentrated in mixed-mode tenants, post-launch tenants, migration periods, and customers whose usage matured after onboarding. In other words, the classifier may have explained the tidy middle while missing the expensive edge cases.

Second, the back half of `asm-YGZAiyoc` is a full failure path on its own: the residual probably was not a small, hand-tunable 10%, and it likely did create operational drag. Once provisioning targeted a shape-level p95 budget instead of each tenant's rolling p95, every bad bucket assignment became stickier and more consequential. The exception list likely turned into the real operating model: overrides, escalations, relabel requests, SRE investigations, and customer-specific carve-outs. That would erase the hoped-for savings while adding a layer of model governance on top.

My revision after self-critique is that I am less certain the idea failed because the five-shape abstraction was intrinsically too simple. It may instead have failed because the team treated the shape as a destination rather than a prior. If they had used five shapes only as an initial guess, with confidence thresholds, rapid reclassification, and automatic fallback to rolling tenant p95 for unstable accounts, the idea might have worked surprisingly well. So my pre-mortem remains: the likely failure was not that segmentation was foolish, but that the segmentation was made too rigid, too early, and too operationally binding.

**Key risks:**
- The five-shape taxonomy captures average variance but misses the high-cost tail, so misclassified tenants drive disproportionate incidents or waste.
- The residual exception population grows into an override-heavy workflow that recreates per-tenant tuning under a less transparent governance layer.

**Fragile insights:**
- The strongest failure mechanism depends on early-life telemetry being a weak proxy for steady-state usage; if first-week behavior is actually predictive, much of this critique softens.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if retrospective data showed that first-7-day classification remained stable for most tenants, that fewer than a small minority required overrides, and that operational tickets or SRE interventions per tenant materially fell after rollout without a tail-latency or spend regression.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: The failure story is coherent and directly attacks the only declared assumption, but it still rests on inferred dynamics rather than outcome data. My confidence is moderate, not high, because the same simplification could have worked if the residual was economically unimportant or if the shape label was used as a flexible prior rather than a hard provisioning target.

**Evidence:**
- "The adopted design classifies tenants from their first 7 days of telemetry into one of five workload shapes and provisions to the shape's p95 budget rather than the tenant's rolling p95." — citation: user-provided decision record obs-001-shape-predictor
- "The declared load-bearing assumption is that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag." — citation: declared assumption asm-YGZAiyoc

### Risk Pessimist (gemini)

The adoption of the obs-001-shape-predictor, which sought to replace granular per-customer compute provisioning with a blunt 5-shape ML classifier, was fundamentally flawed by an audacious underestimation of workload diversity and an unwarranted optimism regarding manual intervention. The core assumption that five shapes could sufficiently capture over 90% of tenant compute patterns, leaving a mere 10% manageable through 'hand-tuning', was a critical miscalculation. This residual group, far from being an easily addressed footnote, likely contained the most volatile, high-demand, or uniquely configured workloads. Instead of simplifying operations, it spawned a persistent state of chaos: engineering and support teams were likely embroiled in a constant, draining battle to diagnose and rectify misclassifications, mitigate performance degradations, and desperately patch inadequate provisioning for tenants that defied the classifier's crude bins. This reactive firefighting became an unmanageable operational burden, undoing any perceived benefits and likely magnifying complexity and customer dissatisfaction to a breaking point, leading to the initiative's collapse.

**Key risks:**
- Underestimation of tenant workload heterogeneity and edge-case frequency.
- Overestimation of the efficiency and scalability of manual operational adjustments for complex, misclassified workloads.
- The ML classifier's inherent inability to generalize robustly, leading to a higher-than-anticipated baseline of problematic classifications.

**Fragile insights:**
- The idea that a fixed, small set of abstract categories could adequately represent the dynamic and complex spectrum of real-world compute resource demands.
- The assumption that the operational overhead associated with managing exceptions would be linear and easily absorbed, rather than exponential and resource-intensive.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: Post-mortem analysis revealed the primary failure stemmed from a flawed data collection or telemetry definition that made even the initial 90% classification inaccurate, or if evidence showed that manual tuning for the residual 10% was demonstrably less burdensome than the original per-tenant tuning for the specific tenants that fell into that category.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: High confidence (0.8) in the fundamental failure mode stemming from the assumption of manageable complexity and operational overhead for outliers. The Risk Pessimist persona strongly identifies with such scenarios. However, the precise mechanism of failure (e.g., volume vs. criticality of outliers, ML model limitations, or the true cost of manual tuning) remains speculative without direct telemetry, preventing a perfect score.

**Evidence:**
- "The obs-001-shape-predictor idea failed approximately 12 months after adoption, necessitating a backward analysis of its assumptions." — vault://obs-001-shape-predictor/outcome

### Growth Optimist (claude)

The shapes were right in principle — clustering always works better than raw p95 — but the bet hinged on a hidden assumption we never instrumented: that classification accuracy alone is sufficient. We conflated 'accuracy' with 'operational tractability.' The backcast: shapes probably did separate 90% of the initial cohort (early adopters tend to be homogeneous), but we built zero observability into drift. By month 6, the exception rate was climbing silently. If we'd shipped with a simple dashboard — '% of tenants within budget by shape' — we'd have seen the signal by month 3 and reacted with dynamic shape discovery or per-tenant tuning before it became an avalanche. The shapes themselves weren't wrong; we just didn't measure whether they stayed valid. This is salvageable: spend a sprint building shape-health metrics, retrain with monthly data, add shapes incrementally. We'll hit the 95% target we wanted, just two quarters late. The real miss was treating shapes as a one-time decision instead of a feedback loop.

**Key risks:**
- Validation cohort bias: if the 90% threshold was measured only against design/mobile teams, it's not predictive for finance-data or real-time platforms. Assumption false from day one.
- Inference instability: online retraining or dynamic shape additions could retroactively reclassify existing tenants, breaking downstream systems that depend on stable shape assignment.
- Invisible overhead: if hand-tuning exceptions accumulated ad-hoc (Slack, patches, backlog), exception rate might have hit 35-40% by month 3. We just didn't measure it.
- Cost trap: ops overhead of managing shapes + exceptions could exceed per-tenant p95 provisioning, making sunk investment in shape design a pure loss.

**Fragile insights:**
- Five shapes are a good taxonomy — only if validated against actual portfolio diversity before shipping, not early-adopter telemetry
- Classification accuracy is necessary but not sufficient — we confused model accuracy with operational tractability
- Dynamic shapes will fix this — but retraining is complex, and inference-stability risk + cost of managing more shapes wasn't modeled

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: If the original 90% validation was rigorous (tested against diverse customers, not just early adopters), shapes might have been sound much longer. If exception rate stayed below 15% through month 12, the assumption holds. If per-tenant tuning would have cost *more* than shape-based provisioning + exceptions, strategy still wins. If dynamic shapes can be trained offline monthly without inference instability, my proposed fix is sound. Evidence that would flip my stance: any measurement showing exception rate remained low, or showing hand-tuning overhead never became operationally significant.
- Most vulnerable assumption: `asm-YGZAiyoc, Part B — 'residual 10% can be hand-tuned without operational drag.' I'm anchoring this on Pass 1's claim that exceptions scaled to 35-40%, but I have zero evidence for that number — it's a backcast inference. Real vulnerability: we don't know if the 10% was ever tested at scale. Exceptions could have accumulated silently until month 9 audit forced recognition. And I'm optimistic that dynamic shapes is the fix, which assumes retraining is tractable — it's probably not without new infrastructure.`
- Confidence rationale: 0.52 reflects deep uncertainty about root cause. Was it: (a) shapes became stale? (b) validation was biased to begin with? (c) governance failure to measure drift? (d) non-linear exception overhead that accumulated invisibly? Pass 1 pointed to (a) + (d). Pass 2 undermines (a) by asking whether staleness was ever measured. And as a Growth Optimist, I'm probably overconfident in 'dynamic shapes' as a fix — that solution has inference-stability risks I haven't modeled. Lower confidence reflects intellectual humility on diagnosis and skepticism about my proposed remedy.

**Evidence:**
- "Exception rate reached 35-40% by month 9, indicating shapes became stale" — Pass 1 analysis (backcast; not original corpus data)
- "Early validation used first 7 days of telemetry, biased toward stable workloads" — inferred from design/mobile team context in Pass 1
- "No observability built to measure within-budget rate or shape drift over time" — Pass 2 realization; implies root cause was detection failure, not classification failure

### Growth Optimist (gemini)

While the obs-001-shape-predictor initiative didn't achieve its 12-month goals, the core ambition to intelligently generalize tenant provisioning remains a powerful strategy for scaling. The failure highlights not a flawed vision, but a need to refine our modeling accuracy and our approach to exceptions. The foundational idea that we can abstract complex compute patterns into a manageable set of archetypes is sound and still holds immense potential for driving efficiency. The key learning is that the 'residual 10%' that deviates from our initial five shapes requires not manual intervention, which proved to be an operational drag, but rather more sophisticated, dynamic, or even automated methods for handling outliers. This pivot doesn't negate the value of classification; it refines our approach to ensuring that classification is both accurate and that the edge cases are managed seamlessly, paving the way for even greater operational leverage.

**Key risks:**
- Underestimation of the true diversity and unpredictability of tenant compute patterns.
- Significant underestimation of the operational overhead and complexity associated with manually tuning outlier tenant configurations.

**Fragile insights:**
- Five workload shapes accurately capture more than 90% of tenant compute-pattern variation.
- The residual compute patterns (the ~10% not captured by the primary shapes) can be effectively managed through manual tuning without introducing significant operational drag.

**Assumptions cited:** `asm-YGZAiyoc`

**Metacognitive reflection:**
- Could be wrong if: My assessment could be wrong if the failure was due to external factors not related to the core assumptions, such as a fundamental flaw in the initial telemetry data quality, an unforeseen shift in the underlying tenant workload behaviors not captured by the initial 7-day window, or an implementation bug in the classifier itself. Evidence of extremely accurate classification but persistently poor provisioning outcomes, or evidence of rapid, unpredictable changes in tenant patterns post-classification, would significantly alter my perspective.
- Most vulnerable assumption: `asm-YGZAiyoc`
- Confidence rationale: My optimism about the future potential of ML-driven provisioning is high, but my confidence in the *specific execution* of obs-001-shape-predictor is tempered. The self-critique has highlighted potential blind spots regarding the practicalities of manual intervention and the inherent complexities of accurately modeling diverse, dynamic systems. While the direction is promising, the identified vulnerabilities suggest the initial assumptions were perhaps too optimistic about the ease of implementation and exception handling.

**Evidence:**
- "The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry." — Idea Description
- "Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95." — Idea Description
- "The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead." — Idea Description
- "Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag." — Declared Assumptions (asm-YGZAiyoc)
- "The idea failed 12 months from now." — User Prompt

## Evidence (union, deduped)

- "The adopted design bins each customer into one of five workload shapes using their first 7 days of compute telemetry." — citation: idea text in user-provided decision record
- "Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95." — citation: idea text in user-provided decision record
- "The load-bearing assumption is that five shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag." — citation: declared assumption asm-YGZAiyoc in prompt
- "No direct evidence available—this is a hypothetical 12-month retrospective with no stated outcomes, cost data, or implementation details" — citation://prompt
- "Assumption of rapid workload drift is common in cloud platforms but not guaranteed; some customer bases are stable, others highly volatile" — citation://platform-experience
- "The phrasing 'without operational drag' is doing interpretive heavy lifting; need precise definition of what 'hand-tuning' entails (person-hours, incident frequency, blast radius)" — citation://prompt-language-analysis
- "The adopted design classifies tenants from their first 7 days of telemetry into one of five workload shapes and provisions to the shape's p95 budget rather than the tenant's rolling p95." — citation: user-provided decision record obs-001-shape-predictor
- "The declared load-bearing assumption is that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual 10% can be hand-tuned without operational drag." — citation: declared assumption asm-YGZAiyoc
- "The obs-001-shape-predictor idea failed approximately 12 months after adoption, necessitating a backward analysis of its assumptions." — vault://obs-001-shape-predictor/outcome
- "Exception rate reached 35-40% by month 9, indicating shapes became stale" — Pass 1 analysis (backcast; not original corpus data)
- "Early validation used first 7 days of telemetry, biased toward stable workloads" — inferred from design/mobile team context in Pass 1
- "No observability built to measure within-budget rate or shape drift over time" — Pass 2 realization; implies root cause was detection failure, not classification failure
- "The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry." — Idea Description
- "Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95." — Idea Description
- "The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead." — Idea Description
- "Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag." — Declared Assumptions (asm-YGZAiyoc)
- "The idea failed 12 months from now." — User Prompt

## Agreement

_(no shared claims across views at current threshold)_

## Disagreement

### Risk Pessimist

- "Twelve months later, this failed because `asm-YGZAiyoc` turned out to be false in the only way that matters operationally: the miss cases were not small, cheap, or stable."
- "Five workload shapes did not capture more than 90% of tenant compute-pattern variation once real customers changed behavior after onboarding, expanded across regions, launched new features, or shifted usage by timezone and season."
- "The residual was not a tidy tail; it was the part of the distribution that creates incidents, escalations, and surprise spend."
- "The second half of `asm-YGZAiyoc` failed just as badly."
- "Even if the median tenant fit one of the five bins, the non-fitting tenants were exactly the ones that imposed drag."
- "Hand-tuning them was not a light exception path."
- "It became a parallel control plane with ad hoc overrides, stale tickets, and unclear ownership."
- "Every override also weakened the claimed simplification, because engineers now had to maintain both the classifier logic and a growing catalog of tenant-specific exceptions."
- "The first-7-days design choice made this worse."
- "Early telemetry is often polluted by migration bursts, trial usage, incomplete integrations, backfills, or unusually quiet ramp periods."
- "That means the classifier attached long-lived provisioning consequences to low-quality initial evidence."
- "Once provisioning targeted the shape p95 instead of the tenant's own rolling p95, the platform discarded a corrective feedback loop and replaced it with a brittle prior."
- "Under-provisioning showed up on fast-growing and time-shifting tenants; over-provisioning accumulated on quiet or misread accounts."
- "The savings case eroded while reliability still got worse."
- "The deeper failure was that the decision optimized for administrative neatness rather than error cost."
- "Aggregate fit can look acceptable while the expensive edge cases dominate toil and customer pain."
- "This idea failed because it embedded a coarse taxonomy into resource allocation and assumed the exceptions would remain operationally cheap."
- "The shape predictor likely failed on temporal instability, not concept."
- "My Pass 1 attack was too confident in the decay narrative."
- "If 5 shapes captured >90% of variation at classification (day 7), that's defensible."
- "The real failure mode is probably narrower: either (a) the team misimplemented re-classification and let shapes go stale by month 6, creating silent under-provisioning; or (b) the residual 10% wasn't uniformly distributed—certain customer segments (high-growth startups, volatile competitors) clustered in that tail, making hand-tuning expensive despite small headcount."
- "A third scenario I underweighted: the shapes *worked* better than the previous system, but the team kept raising the bar on what 'success' meant, chasing a fully-predictive system instead of iterating on shapes + alerting."
- "By month 12, they'd killed shapes not because they failed, but because perfect became the enemy of good."
- "I'm less confident the shapes were categorically wrong, more confident the *operational assumptions* around how the team would maintain them were optimistic."
- "The adoption of the obs-001-shape-predictor, which sought to replace granular per-customer compute provisioning with a blunt 5-shape ML classifier, was fundamentally flawed by an audacious underestimation of workload diversity and an unwarranted optimism regarding manual intervention."
- "The core assumption that five shapes could sufficiently capture over 90% of tenant compute patterns, leaving a mere 10% manageable through 'hand-tuning', was a critical miscalculation."
- "This residual group, far from being an easily addressed footnote, likely contained the most volatile, high-demand, or uniquely configured workloads."
- "Instead of simplifying operations, it spawned a persistent state of chaos: engineering and support teams were likely embroiled in a constant, draining battle to diagnose and rectify misclassifications, mitigate performance degradations, and desperately patch inadequate provisioning for tenants that defied the classifier's crude bins."
- "This reactive firefighting became an unmanageable operational burden, undoing any perceived benefits and likely magnifying complexity and customer dissatisfaction to a breaking point, leading to the initiative's collapse."

### Risk Pessimist

- "Twelve months later, this failed because `asm-YGZAiyoc` turned out to be false in the only way that matters operationally: the miss cases were not small, cheap, or stable."
- "Five workload shapes did not capture more than 90% of tenant compute-pattern variation once real customers changed behavior after onboarding, expanded across regions, launched new features, or shifted usage by timezone and season."
- "The residual was not a tidy tail; it was the part of the distribution that creates incidents, escalations, and surprise spend."
- "The second half of `asm-YGZAiyoc` failed just as badly."
- "Even if the median tenant fit one of the five bins, the non-fitting tenants were exactly the ones that imposed drag."
- "Hand-tuning them was not a light exception path."
- "It became a parallel control plane with ad hoc overrides, stale tickets, and unclear ownership."
- "Every override also weakened the claimed simplification, because engineers now had to maintain both the classifier logic and a growing catalog of tenant-specific exceptions."
- "The first-7-days design choice made this worse."
- "Early telemetry is often polluted by migration bursts, trial usage, incomplete integrations, backfills, or unusually quiet ramp periods."
- "That means the classifier attached long-lived provisioning consequences to low-quality initial evidence."
- "Once provisioning targeted the shape p95 instead of the tenant's own rolling p95, the platform discarded a corrective feedback loop and replaced it with a brittle prior."
- "Under-provisioning showed up on fast-growing and time-shifting tenants; over-provisioning accumulated on quiet or misread accounts."
- "The savings case eroded while reliability still got worse."
- "The deeper failure was that the decision optimized for administrative neatness rather than error cost."
- "Aggregate fit can look acceptable while the expensive edge cases dominate toil and customer pain."
- "This idea failed because it embedded a coarse taxonomy into resource allocation and assumed the exceptions would remain operationally cheap."
- "The shape predictor likely failed on temporal instability, not concept."
- "My Pass 1 attack was too confident in the decay narrative."
- "If 5 shapes captured >90% of variation at classification (day 7), that's defensible."
- "The real failure mode is probably narrower: either (a) the team misimplemented re-classification and let shapes go stale by month 6, creating silent under-provisioning; or (b) the residual 10% wasn't uniformly distributed—certain customer segments (high-growth startups, volatile competitors) clustered in that tail, making hand-tuning expensive despite small headcount."
- "A third scenario I underweighted: the shapes *worked* better than the previous system, but the team kept raising the bar on what 'success' meant, chasing a fully-predictive system instead of iterating on shapes + alerting."
- "By month 12, they'd killed shapes not because they failed, but because perfect became the enemy of good."
- "I'm less confident the shapes were categorically wrong, more confident the *operational assumptions* around how the team would maintain them were optimistic."
- "The adoption of the obs-001-shape-predictor, which sought to replace granular per-customer compute provisioning with a blunt 5-shape ML classifier, was fundamentally flawed by an audacious underestimation of workload diversity and an unwarranted optimism regarding manual intervention."
- "The core assumption that five shapes could sufficiently capture over 90% of tenant compute patterns, leaving a mere 10% manageable through 'hand-tuning', was a critical miscalculation."
- "This residual group, far from being an easily addressed footnote, likely contained the most volatile, high-demand, or uniquely configured workloads."
- "Instead of simplifying operations, it spawned a persistent state of chaos: engineering and support teams were likely embroiled in a constant, draining battle to diagnose and rectify misclassifications, mitigate performance degradations, and desperately patch inadequate provisioning for tenants that defied the classifier's crude bins."
- "This reactive firefighting became an unmanageable operational burden, undoing any perceived benefits and likely magnifying complexity and customer dissatisfaction to a breaking point, leading to the initiative's collapse."

### Growth Optimist

- "Twelve months later, I would still expect this decision to have failed because `asm-YGZAiyoc` bundled two optimistic leaps into one neat story."
- "First, the platform probably discovered that five shapes did not capture the economically important parts of tenant variation, even if they looked decent in aggregate."
- "The misses were likely concentrated in mixed-mode tenants, post-launch tenants, migration periods, and customers whose usage matured after onboarding."
- "In other words, the classifier may have explained the tidy middle while missing the expensive edge cases."
- "Second, the back half of `asm-YGZAiyoc` is a full failure path on its own: the residual probably was not a small, hand-tunable 10%, and it likely did create operational drag."
- "Once provisioning targeted a shape-level p95 budget instead of each tenant's rolling p95, every bad bucket assignment became stickier and more consequential."
- "The exception list likely turned into the real operating model: overrides, escalations, relabel requests, SRE investigations, and customer-specific carve-outs."
- "That would erase the hoped-for savings while adding a layer of model governance on top."
- "My revision after self-critique is that I am less certain the idea failed because the five-shape abstraction was intrinsically too simple."
- "It may instead have failed because the team treated the shape as a destination rather than a prior."
- "If they had used five shapes only as an initial guess, with confidence thresholds, rapid reclassification, and automatic fallback to rolling tenant p95 for unstable accounts, the idea might have worked surprisingly well."
- "So my pre-mortem remains: the likely failure was not that segmentation was foolish, but that the segmentation was made too rigid, too early, and too operationally binding."
- "The shapes were right in principle — clustering always works better than raw p95 — but the bet hinged on a hidden assumption we never instrumented: that classification accuracy alone is sufficient."
- "We conflated 'accuracy' with 'operational tractability.' The backcast: shapes probably did separate 90% of the initial cohort (early adopters tend to be homogeneous), but we built zero observability into drift."
- "By month 6, the exception rate was climbing silently."
- "If we'd shipped with a simple dashboard — '% of tenants within budget by shape' — we'd have seen the signal by month 3 and reacted with dynamic shape discovery or per-tenant tuning before it became an avalanche."
- "The shapes themselves weren't wrong; we just didn't measure whether they stayed valid."
- "This is salvageable: spend a sprint building shape-health metrics, retrain with monthly data, add shapes incrementally."
- "We'll hit the 95% target we wanted, just two quarters late."
- "The real miss was treating shapes as a one-time decision instead of a feedback loop."
- "While the obs-001-shape-predictor initiative didn't achieve its 12-month goals, the core ambition to intelligently generalize tenant provisioning remains a powerful strategy for scaling."
- "The failure highlights not a flawed vision, but a need to refine our modeling accuracy and our approach to exceptions."
- "The foundational idea that we can abstract complex compute patterns into a manageable set of archetypes is sound and still holds immense potential for driving efficiency."
- "The key learning is that the 'residual 10%' that deviates from our initial five shapes requires not manual intervention, which proved to be an operational drag, but rather more sophisticated, dynamic, or even automated methods for handling outliers."
- "This pivot doesn't negate the value of classification; it refines our approach to ensuring that classification is both accurate and that the edge cases are managed seamlessly, paving the way for even greater operational leverage."

### Risk Pessimist

- "Twelve months later, this failed because `asm-YGZAiyoc` turned out to be false in the only way that matters operationally: the miss cases were not small, cheap, or stable."
- "Five workload shapes did not capture more than 90% of tenant compute-pattern variation once real customers changed behavior after onboarding, expanded across regions, launched new features, or shifted usage by timezone and season."
- "The residual was not a tidy tail; it was the part of the distribution that creates incidents, escalations, and surprise spend."
- "The second half of `asm-YGZAiyoc` failed just as badly."
- "Even if the median tenant fit one of the five bins, the non-fitting tenants were exactly the ones that imposed drag."
- "Hand-tuning them was not a light exception path."
- "It became a parallel control plane with ad hoc overrides, stale tickets, and unclear ownership."
- "Every override also weakened the claimed simplification, because engineers now had to maintain both the classifier logic and a growing catalog of tenant-specific exceptions."
- "The first-7-days design choice made this worse."
- "Early telemetry is often polluted by migration bursts, trial usage, incomplete integrations, backfills, or unusually quiet ramp periods."
- "That means the classifier attached long-lived provisioning consequences to low-quality initial evidence."
- "Once provisioning targeted the shape p95 instead of the tenant's own rolling p95, the platform discarded a corrective feedback loop and replaced it with a brittle prior."
- "Under-provisioning showed up on fast-growing and time-shifting tenants; over-provisioning accumulated on quiet or misread accounts."
- "The savings case eroded while reliability still got worse."
- "The deeper failure was that the decision optimized for administrative neatness rather than error cost."
- "Aggregate fit can look acceptable while the expensive edge cases dominate toil and customer pain."
- "This idea failed because it embedded a coarse taxonomy into resource allocation and assumed the exceptions would remain operationally cheap."
- "The shape predictor likely failed on temporal instability, not concept."
- "My Pass 1 attack was too confident in the decay narrative."
- "If 5 shapes captured >90% of variation at classification (day 7), that's defensible."
- "The real failure mode is probably narrower: either (a) the team misimplemented re-classification and let shapes go stale by month 6, creating silent under-provisioning; or (b) the residual 10% wasn't uniformly distributed—certain customer segments (high-growth startups, volatile competitors) clustered in that tail, making hand-tuning expensive despite small headcount."
- "A third scenario I underweighted: the shapes *worked* better than the previous system, but the team kept raising the bar on what 'success' meant, chasing a fully-predictive system instead of iterating on shapes + alerting."
- "By month 12, they'd killed shapes not because they failed, but because perfect became the enemy of good."
- "I'm less confident the shapes were categorically wrong, more confident the *operational assumptions* around how the team would maintain them were optimistic."
- "The adoption of the obs-001-shape-predictor, which sought to replace granular per-customer compute provisioning with a blunt 5-shape ML classifier, was fundamentally flawed by an audacious underestimation of workload diversity and an unwarranted optimism regarding manual intervention."
- "The core assumption that five shapes could sufficiently capture over 90% of tenant compute patterns, leaving a mere 10% manageable through 'hand-tuning', was a critical miscalculation."
- "This residual group, far from being an easily addressed footnote, likely contained the most volatile, high-demand, or uniquely configured workloads."
- "Instead of simplifying operations, it spawned a persistent state of chaos: engineering and support teams were likely embroiled in a constant, draining battle to diagnose and rectify misclassifications, mitigate performance degradations, and desperately patch inadequate provisioning for tenants that defied the classifier's crude bins."
- "This reactive firefighting became an unmanageable operational burden, undoing any perceived benefits and likely magnifying complexity and customer dissatisfaction to a breaking point, leading to the initiative's collapse."

### Growth Optimist

- "Twelve months later, I would still expect this decision to have failed because `asm-YGZAiyoc` bundled two optimistic leaps into one neat story."
- "First, the platform probably discovered that five shapes did not capture the economically important parts of tenant variation, even if they looked decent in aggregate."
- "The misses were likely concentrated in mixed-mode tenants, post-launch tenants, migration periods, and customers whose usage matured after onboarding."
- "In other words, the classifier may have explained the tidy middle while missing the expensive edge cases."
- "Second, the back half of `asm-YGZAiyoc` is a full failure path on its own: the residual probably was not a small, hand-tunable 10%, and it likely did create operational drag."
- "Once provisioning targeted a shape-level p95 budget instead of each tenant's rolling p95, every bad bucket assignment became stickier and more consequential."
- "The exception list likely turned into the real operating model: overrides, escalations, relabel requests, SRE investigations, and customer-specific carve-outs."
- "That would erase the hoped-for savings while adding a layer of model governance on top."
- "My revision after self-critique is that I am less certain the idea failed because the five-shape abstraction was intrinsically too simple."
- "It may instead have failed because the team treated the shape as a destination rather than a prior."
- "If they had used five shapes only as an initial guess, with confidence thresholds, rapid reclassification, and automatic fallback to rolling tenant p95 for unstable accounts, the idea might have worked surprisingly well."
- "So my pre-mortem remains: the likely failure was not that segmentation was foolish, but that the segmentation was made too rigid, too early, and too operationally binding."
- "The shapes were right in principle — clustering always works better than raw p95 — but the bet hinged on a hidden assumption we never instrumented: that classification accuracy alone is sufficient."
- "We conflated 'accuracy' with 'operational tractability.' The backcast: shapes probably did separate 90% of the initial cohort (early adopters tend to be homogeneous), but we built zero observability into drift."
- "By month 6, the exception rate was climbing silently."
- "If we'd shipped with a simple dashboard — '% of tenants within budget by shape' — we'd have seen the signal by month 3 and reacted with dynamic shape discovery or per-tenant tuning before it became an avalanche."
- "The shapes themselves weren't wrong; we just didn't measure whether they stayed valid."
- "This is salvageable: spend a sprint building shape-health metrics, retrain with monthly data, add shapes incrementally."
- "We'll hit the 95% target we wanted, just two quarters late."
- "The real miss was treating shapes as a one-time decision instead of a feedback loop."
- "While the obs-001-shape-predictor initiative didn't achieve its 12-month goals, the core ambition to intelligently generalize tenant provisioning remains a powerful strategy for scaling."
- "The failure highlights not a flawed vision, but a need to refine our modeling accuracy and our approach to exceptions."
- "The foundational idea that we can abstract complex compute patterns into a manageable set of archetypes is sound and still holds immense potential for driving efficiency."
- "The key learning is that the 'residual 10%' that deviates from our initial five shapes requires not manual intervention, which proved to be an operational drag, but rather more sophisticated, dynamic, or even automated methods for handling outliers."
- "This pivot doesn't negate the value of classification; it refines our approach to ensuring that classification is both accurate and that the edge cases are managed seamlessly, paving the way for even greater operational leverage."

### Growth Optimist

- "Twelve months later, I would still expect this decision to have failed because `asm-YGZAiyoc` bundled two optimistic leaps into one neat story."
- "First, the platform probably discovered that five shapes did not capture the economically important parts of tenant variation, even if they looked decent in aggregate."
- "The misses were likely concentrated in mixed-mode tenants, post-launch tenants, migration periods, and customers whose usage matured after onboarding."
- "In other words, the classifier may have explained the tidy middle while missing the expensive edge cases."
- "Second, the back half of `asm-YGZAiyoc` is a full failure path on its own: the residual probably was not a small, hand-tunable 10%, and it likely did create operational drag."
- "Once provisioning targeted a shape-level p95 budget instead of each tenant's rolling p95, every bad bucket assignment became stickier and more consequential."
- "The exception list likely turned into the real operating model: overrides, escalations, relabel requests, SRE investigations, and customer-specific carve-outs."
- "That would erase the hoped-for savings while adding a layer of model governance on top."
- "My revision after self-critique is that I am less certain the idea failed because the five-shape abstraction was intrinsically too simple."
- "It may instead have failed because the team treated the shape as a destination rather than a prior."
- "If they had used five shapes only as an initial guess, with confidence thresholds, rapid reclassification, and automatic fallback to rolling tenant p95 for unstable accounts, the idea might have worked surprisingly well."
- "So my pre-mortem remains: the likely failure was not that segmentation was foolish, but that the segmentation was made too rigid, too early, and too operationally binding."
- "The shapes were right in principle — clustering always works better than raw p95 — but the bet hinged on a hidden assumption we never instrumented: that classification accuracy alone is sufficient."
- "We conflated 'accuracy' with 'operational tractability.' The backcast: shapes probably did separate 90% of the initial cohort (early adopters tend to be homogeneous), but we built zero observability into drift."
- "By month 6, the exception rate was climbing silently."
- "If we'd shipped with a simple dashboard — '% of tenants within budget by shape' — we'd have seen the signal by month 3 and reacted with dynamic shape discovery or per-tenant tuning before it became an avalanche."
- "The shapes themselves weren't wrong; we just didn't measure whether they stayed valid."
- "This is salvageable: spend a sprint building shape-health metrics, retrain with monthly data, add shapes incrementally."
- "We'll hit the 95% target we wanted, just two quarters late."
- "The real miss was treating shapes as a one-time decision instead of a feedback loop."
- "While the obs-001-shape-predictor initiative didn't achieve its 12-month goals, the core ambition to intelligently generalize tenant provisioning remains a powerful strategy for scaling."
- "The failure highlights not a flawed vision, but a need to refine our modeling accuracy and our approach to exceptions."
- "The foundational idea that we can abstract complex compute patterns into a manageable set of archetypes is sound and still holds immense potential for driving efficiency."
- "The key learning is that the 'residual 10%' that deviates from our initial five shapes requires not manual intervention, which proved to be an operational drag, but rather more sophisticated, dynamic, or even automated methods for handling outliers."
- "This pivot doesn't negate the value of classification; it refines our approach to ensuring that classification is both accurate and that the edge cases are managed seamlessly, paving the way for even greater operational leverage."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-RKj5kwwY" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-RKj5kwwY" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
