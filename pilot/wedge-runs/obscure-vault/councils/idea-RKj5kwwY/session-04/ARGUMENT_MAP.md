---
type: argument_map
session_id: sess-M6zb35e3
generated_at: '2026-04-26T18:14:14.290Z'
---
# Argument map — session sess-M6zb35e3

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:14:14.290Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.85
**Source view(s):** view-Jjob1x9k

### Claim

This 'solution' was fundamentally hobbled by an aggressively optimistic, statistically questionable premise. The declared assumption that five coarse-grained workload shapes could accurately encompass the nuanced and dynamic compute behaviors of diverse tenants – capturing over 90% of variation – is a recipe for disaster. In complex, real-world systems, such broad categorizations invariably fail to account for critical edge cases. The 'residual 10%' is not trivial noise; it represents the unpredictable, high-impact outliers that inevitably break simplified models and lead to operational chaos.

Furthermore, the notion that these outliers could be 'hand-tuned without operational drag' is a dangerous delusion. Manual intervention, especially for numerous edge cases, is inherently inefficient, error-prone, and scales poorly, directly contradicting the project's goal of reducing overhead. This 'simplification' likely replaced a known, albeit complex, provisioning model with an unpredictable, unmanageable one. The assumed failure 12 months later is therefore not a surprise, but the predictable outcome of building a critical system on such fragile and unrealistic assumptions, leading to chronic under-provisioning, performance meltdowns, and an escalating firefighting burden.

### Pros

- The decision to adopt a 5-shape ML classifier was predicated on the assumption that these shapes would capture >90% of tenant compute-pattern variation and that the residual 10% could be hand-tuned without operational drag.
  - evidence: The decision to adopt a 5-shape ML classifier was predicated on the assumption that these shapes would capture >90% of tenant compute-pattern variation and that the residual 10% could be hand-tuned without operational drag. (Decision-ID obs-001-shape-predictor, corpus description)

### Cons

- Misclassification leading to chronic under-provisioning for high-value tenants.
- The operational overhead of manually managing unclassified or misclassified edge cases becoming unmanageable.
- Inherent inability of a static, simplified ML model to adapt to dynamic and diverse tenant compute behaviors.
- Systemic performance degradation and increased customer dissatisfaction due to inaccurate resource allocation.
- Fragile: The core belief that a static, 5-category classification can accurately model dynamic, highly variable tenant compute demands.
- Fragile: The unfounded optimism that the 'residual' 10% of tenant patterns would be trivial to manage manually.
- Fragile: The dangerous notion that operational drag can be eliminated through manual intervention for edge cases.

---

## claim-002 — risk-pessimist

**Confidence:** 0.74
**Source view(s):** view-H3BFgQDh

### Claim

Twelve months later, this failed because the compression premise in asm-YGZAiyoc was false in the only place that mattered: production variance with customer-specific consequences. Five shapes may have described the center of the fleet in a slide-deck sense, but they did not safely capture the operationally important tail. The missed residual was not harmless noise. It concentrated exactly the tenants with mixed regimes, launch spikes, calendar effects, and behavior shifts that coarse buckets handle badly. Once provisioning stopped tracking each tenant's actual rolling p95 and started inheriting a shape-level p95 budget, under-provisioning incidents and over-provisioning waste both became systematic rather than exceptional.

The second half of asm-YGZAiyoc failed as well. The claim that the unexplained remainder could be hand-tuned without operational drag was the kind of sentence that only survives before contact with operations. Manual exceptions do not stay small when classification is derived from the first 7 days, because early telemetry is often unrepresentative, immature, or distorted by onboarding behavior. Misclassified tenants accumulated. Overrides multiplied. Ownership blurred between platform, SRE, and account teams. The supposed simplification turned into a shadow per-tenant provisioning layer, except now it was reactive, political, and less observable.

The deeper failure was that the team treated model stability as a substitute for workload truth. Even if five shapes explained more than 90% of statistical variation on a backtest, that would not prove they captured the variance that drives outages, latency breaches, or expensive headroom. This decision was vulnerable to a familiar category error: optimizing for taxonomy neatness rather than consequence-weighted fit. In a postmortem, asm-YGZAiyoc would read as doubly optimistic: first that five bins were enough, second that the leftover cases would stay cheap. Both parts were load-bearing. Both were credible failure roots.

### Pros

- The adopted design provisions to a shape's p95 budget rather than the tenant's actual rolling p95 after classifying from the first 7 days of telemetry.
  - evidence: The adopted design provisions to a shape's p95 budget rather than the tenant's actual rolling p95 after classifying from the first 7 days of telemetry. (citation: user-provided idea description for obs-001-shape-predictor)
- The declared load-bearing assumption states that five workload shapes capture more than 90% of tenant compute-pattern variation and that the residual can be hand-tuned without operational drag.
  - evidence: The declared load-bearing assumption states that five workload shapes capture more than 90% of tenant compute-pattern variation and that the residual can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in prompt)
- The stated bet is that classification stability eliminates per-tenant tuning overhead.
  - evidence: The stated bet is that classification stability eliminates per-tenant tuning overhead. (citation: user-provided idea description for obs-001-shape-predictor)

### Cons

- The residual variation outside the five shapes contains the highest-consequence tenants, so coarse shape-level p95 budgets create both incidents and waste.
- Manual exception handling grows into a shadow provisioning system, recreating per-tenant tuning overhead with worse observability and unclear ownership.
- Fragile: If the first 7 days of telemetry are materially unrepresentative for many tenants, classification error will compound over time rather than decay.
- Fragile: A model can exceed 90% variance capture on aggregate metrics while still missing the small subset of behaviors that dominate operational pain.

---

## claim-003 — risk-pessimist

**Confidence:** 0.62
**Source view(s):** view-JTSp9Jmr

### Claim

Shape model failed. Load-bearing assumption asm-YGZAiyoc under-specified on both fronts: coverage likely ≠90%, residual concentrates in high-value tenants; hand-tuning cost likely exceeded savings. Most probable: team discovers gap Q1–Q2 post-deploy when escalations spike. OR: patterns drift over 12mo, system feedback-blind (stopped per-tenant monitoring), SLAs miss silently until customer escalations force reclassification. Either path violates asm-YGZAiyoc. Traded responsive-but-expensive adaptation for rigid-but-cheap batch shapes. Rigidity cost under-specified at decision time. Assumption fragile because: (1) 90% coverage unvalidated on survivor-biased cohort; (2) 7-day window too short for growth/seasonal variance; (3) hand-tuning ops overhead estimate lacked ground truth (frequency, time-per-tenant, escalation rate).

### Pros

- Five shapes capture >90% of tenant variation; residual 10% hand-tunable without operational drag
  - evidence: Five shapes capture >90% of tenant variation; residual 10% hand-tunable without operational drag (vault://obs-001-shape-predictor (declared assumption asm-YGZAiyoc))
- 7-day telemetry window sufficient for stable classification over 12-month horizon
  - evidence: 7-day telemetry window sufficient for stable classification over 12-month horizon (implicit, inferred from idea design)
- Per-tenant adaptive tuning cost exceeds shape model + hand-tuning cost
  - evidence: Per-tenant adaptive tuning cost exceeds shape model + hand-tuning cost (cost-saving premise underlying idea)

### Cons

- 90% coverage claim unvalidated; high-value customers likely over-represented in residual 10%
- Workload patterns drift post-classification; feedback-loop blindness if system stops per-tenant monitoring
- Hand-tuning overhead may exceed savings if reclassification frequency high and concentrated in churn-prone tenants
- 7-day training window insufficient for seasonal/weekly/growth-trajectory patterns; model overfit to survivor cohort
- Predecessor per-tenant cost unknown; shape model may net-negative even if coverage accurate
- Fragile: Coverage >90% is load-bearing and likely false for high-growth/high-revenue subset
- Fragile: Classification stability assumed but unvalidated; pattern drift undetected if re-training infrequent
- Fragile: Shapes treated as stable, low-dimensional, uniformly-distributed; actual patterns multi-modal, correlated with unmeasured factors (geography, industry, growth stage)
- Fragile: System relies on shape p95 as proxy, stops observing actual per-tenant demand; blind to drifts below (waste) and drifts above (silent SLA misses until escalation)

---

## claim-004 — growth-optimist

**Confidence:** 0.57
**Source view(s):** view-ogS3sPrC

### Claim

My revised read is that the failure came from taking a genuinely useful compression idea and hardening it into the provisioning control plane. asm-YGZAiyoc actually contains two bets fused together: first, that five shapes explain more than 90% of meaningful tenant variation; second, that the remaining tail can be hand-tuned without reintroducing toil. If this failed 12 months later, I would expect both halves to have looked elegant in aggregate analysis and much weaker in live operations. The team probably discovered a good language for workloads, but not a safe enough substitute for tenant-aware provisioning.

On the first half of asm-YGZAiyoc, the >90% claim is exactly where I would press hardest. Five shapes can absolutely capture the obvious rhythms and still miss the variation that matters economically: tenant growth phase, launches, regional demand shocks, retry storms, batch backfills, and behavior that only appears after the first 7 days. That means the model may have explained historical variance while failing forward. A tenant can look steady-low during onboarding and become operationally unlike its assigned shape just when capacity accuracy starts to matter.

On the second half of asm-YGZAiyoc, the residual 10% was probably not small in operational terms even if it was small in population terms. The tenants outside the bins are often the loudest ones: revenue-sensitive accounts, incident-prone accounts, and accounts with special escalation paths. If those customers needed overrides, reclassification, or padded buffers, the platform team likely rebuilt per-tenant tuning as a shadow system. At that point the promised simplification flips: instead of one clean model replacing bespoke tuning, you get classifier maintenance plus bespoke tuning for the tenants leadership notices.

The upside I still see is that the underlying instinct was probably right, just overcommitted. Five shapes may have been a strong prior, onboarding default, or recommendation layer sitting above a tenant-aware autoscaling system. The likely failure was turning a helpful abstraction into a hard replacement policy. In that version of the story, the idea did not fail because shape-thinking was foolish; it failed because a promising simplifier was promoted from guide to governor before its exception surface was proven cheap.

### Pros

- The adopted design classified tenants into five workload shapes from their first 7 days of compute telemetry and provisioned to the shape p95 budget instead of the tenant's rolling p95.
  - evidence: The adopted design classified tenants into five workload shapes from their first 7 days of compute telemetry and provisioned to the shape p95 budget instead of the tenant's rolling p95. (citation: user-provided decision record obs-001-shape-predictor)
- The sole declared load-bearing assumption was that five workload shapes capture more than 90% of tenant compute-pattern variation and that the residual 10% can be hand-tuned without operational drag.
  - evidence: The sole declared load-bearing assumption was that five workload shapes capture more than 90% of tenant compute-pattern variation and that the residual 10% can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in user prompt)

### Cons

- The five-shape taxonomy fit historical telemetry but failed to predict forward tenant behavior after onboarding.
- The supposed residual 10% turned into a high-touch exception queue that recreated manual per-tenant provisioning as a shadow system.
- Fragile: If most tenants remained shape-stable well beyond day 7, my core failure story weakens materially.
- Fragile: If overrides were heavily automated and concentrated on low-consequence tenants, the operational-drag argument may be overstated.

---

## claim-005 — growth-optimist

**Confidence:** 0.55
**Source view(s):** view-iDNeWYgt

### Claim

Shapes had promise—stratification is a proven pattern—but my Pass 1 was too generous. I blamed 'execution discipline' and 'skipped validation,' but two deeper problems now seem more likely: (1) the team may have validated on test data, found ~85% accuracy, and assumed production would behave the same (learned distribution shift problem), or (2) they made a deliberate trade-off (5 static shapes for operational simplicity vs. per-tenant optimization for accuracy) and bet wrong on where the break-even point was. Static bins can't adapt to dynamic tenants. A tenant that doubles in mid-quarter or seasonalizes differently each year will always reclassify. The real failure isn't 'shapes don't work'—it's 'we built a system that doesn't measure or react to shape drift.' If the team had instrumented for reclassification churn and had a runbook for dynamic shape updates (or graduated from shapes to continuous re-optimization every 30 days), the support cost might have been manageable. I was wrong to frame version 2 as 'ensemble + more shapes.' That's optimizing within the binning paradigm. The honest path is (a) continuous per-tenant monitoring with adaptive re-provisioning, or (b) accept shapes + pay the reclassification tax. Both are more expensive than the original bet. The shapes idea isn't salvageable at the same cost; it was always fragile. Growth Optimist recovery: the lesson is 'static archetypes fail in dynamic systems'—not 'we should have done better validation' but 'we should have built observability and adaptation into the shapes themselves.'

### Pros

- 5 static bins cannot adapt to tenants that scale mid-quarter or seasonalize differently; reclassification churn is inevitable, not exceptional
  - evidence: 5 static bins cannot adapt to tenants that scale mid-quarter or seasonalize differently; reclassification churn is inevitable, not exceptional (inference from failure scenario (30% support tickets = sign of systematic problem, not edge cases))
- Distribution shift in test/prod is a common failure mode in ML deployments; team may have validated on internal data and not expected production variance
  - evidence: Distribution shift in test/prod is a common failure mode in ML deployments; team may have validated on internal data and not expected production variance (standard ML systems lore (no specific citation available in scenario))

### Cons

- The original 90% assumption may have been tested internally and found true (85%), but production distribution shifted—organization learned a hard lesson about test/prod mismatch rather than validation skip
- Static shapes cannot adapt to dynamic tenants; the architecture was doomed regardless of validation rigor—the real lesson is 'architecture must measure drift and react to it'
- Recovery path (ensemble, continuous bands) may be architecturally infeasible due to integration cost with existing billing, APIs, and contracts—org may have correctly concluded shapes+support-tax is cheaper than rewrite
- The org may lack ML validation competency; if so, the 'shapes' idea was never credible, and better process won't help—the problem is organizational capability, not disciplinary
- Fragile: Assumption asm-YGZAiyoc assumes tenants are static or slowly drifting ('five shapes capture 90% of variation')—but production tenants scale, regionalize, and sesonalize dynamically, which may render the assumption untrue regardless of initial accuracy
- Fragile: The '10% hand-tune cost' was treated as residual and manageable; it exploded because there was no runbook for reclassification—but the real fragility is that *static* shapes guarantee reclassification drift, which should have been foreseeable
- Fragile: The 7-day window was meant to enable quick auto-provisioning, but may have been too short to capture seasonal variance—the trade-off between speed and accuracy was never made explicit

---

## claim-006 — growth-optimist

**Confidence:** 0.60
**Source view(s):** view-b6GGQfBK

### Claim

Looking back with the clarity of hindsight, the 'failure' of obs-001-shape-predictor after 12 months is less a story of the model itself being wrong, and more a powerful indicator of our explosive, category-defining growth. The fact that our user base evolved so rapidly that five shapes couldn't contain >90% of their compute patterns isn't a flaw in the classification idea, but a testament to its success in attracting a diverse and dynamic set of innovators. The 'residual 10%' that proved challenging to hand-tune isn't operational drag; it's the fertile ground for our *next* generation of intelligent provisioning systems. This 'drag' simply highlights the limitations of a static model in the face of dynamic growth, pushing us towards more adaptive, perhaps even AI-driven, dynamic provisioning solutions. The original assumption was a brilliant foundational step, but our users, in their innovative adoption of the platform, have clearly pushed the envelope beyond its initial parameters, demanding even more sophisticated capabilities.

### Pros

- The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry. Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: The Caprivane platform team adopted a tenant-classification model that bins each customer into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike) from their first 7 days of compute telemetry. Provisioning then targets the shape's p95 budget rather than the tenant's actual rolling p95. (Decision context: obs-001-shape-predictor)
- The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead.
  - evidence: The bet is that 5 shapes capture >90% of tenant variation and that classification stability eliminates per-tenant tuning overhead. (Decision context: obs-001-shape-predictor)
- Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag.
  - evidence: Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag. (Declared Assumption: asm-YGZAiyoc)

### Cons

- Underestimation of real-world tenant compute pattern diversity beyond the initial 5 shapes.
- Operational overhead of managing the 'residual 10%' of tenants that did not fit the model well, negating cost savings.
- Fragile: The efficiency gains from automated, shape-based provisioning will outweigh the cost of any necessary manual adjustments for edge cases.
- Fragile: The 'five shapes' abstraction is a sufficient leap in tenant classification for significant operational benefit.

---
