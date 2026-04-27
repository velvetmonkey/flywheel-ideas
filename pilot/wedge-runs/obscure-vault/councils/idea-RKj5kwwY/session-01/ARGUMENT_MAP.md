---
type: argument_map
session_id: sess-U8ZmNcD7
generated_at: '2026-04-26T18:00:23.283Z'
---
# Argument map — session sess-U8ZmNcD7

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:00:23.283Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.90
**Source view(s):** view-dFvUYREo

### Claim

The failure of obs-001-shape-predictor after a mere year is a stark reminder that betting on oversimplified models in complex, dynamic environments is a recipe for disaster. The core conceit – that a rigid, five-category ML classifier could accurately map the chaotic reality of tenant compute patterns – was always a fragile foundation. Tenant behaviors are inherently diverse, mutable, and often unpredictable, evolving with business needs and application deployments. It's almost a certainty that this classifier, no matter how well-intentioned, struggled to adapt, inevitably mischaracterizing a significant portion of tenants, particularly those exhibiting outlier or rapidly shifting usage patterns.

The most egregious flaw, however, lay in the dismissive assumption that the 'residual 10%' could be managed 'without operational drag.' This speaks to a fundamental disconnect from the gritty realities of scaled operations. Even a small percentage of misclassified, high-impact, or erratically behaving tenants would have unleashed a torrent of manual remediation requests. The supposed 'per-tenant tuning overhead' that was meant to be eliminated would not vanish; it would re-emerge as a monstrous, time-consuming, and error-prone firefighting operation, overwhelming the platform team. The ambition for efficiency through abstraction tragically faltered against the brute force of operational complexity and the inherent messiness of real-world multi-tenancy.

### Pros

- The obs-001-shape-predictor initiative failed after 12 months of operation.
  - evidence: The obs-001-shape-predictor initiative failed after 12 months of operation. (Decision details for obs-001-shape-predictor)
- The core bet underpinning the decision was that five workload shapes could capture over 90% of tenant variation and eliminate per-tenant tuning overhead.
  - evidence: The core bet underpinning the decision was that five workload shapes could capture over 90% of tenant variation and eliminate per-tenant tuning overhead. (Decision details for obs-001-shape-predictor)
- A key declared assumption was that five workload shapes capture more than 90% of tenant compute-pattern variation, and the residual 10% can be hand-tuned without operational drag.
  - evidence: A key declared assumption was that five workload shapes capture more than 90% of tenant compute-pattern variation, and the residual 10% can be hand-tuned without operational drag. (Declared assumptions for obs-001-shape-predictor)

### Cons

- Underestimation of tenant behavioral diversity and dynamism, leading to classifier inadequacy.
- Underestimation of the significant operational cost, complexity, and human effort required for manual intervention at scale.
- Inherent limitations of static classification models when faced with highly variable and evolving system behaviors.
- Potential for classifier drift or degradation over time, exacerbating misclassification rates and operational burden.
- Fragile: Five workload shapes capture more than 90% of tenant compute-pattern variation.
- Fragile: The residual 10% can be hand-tuned without operational drag.

---

## claim-002 — risk-pessimist

**Confidence:** 0.67
**Source view(s):** view-AfTX9nCc

### Claim

The 5-shape classifier will eventually violate asm-YGZAiyoc, but not on the timeline or severity I forecast in Pass 1. For the first 9 months, the bet is sound: shapes are predictable, hand-tuning is genuinely minimal, and operational simplicity wins over per-tenant ML. But both sub-clauses of asm-YGZAiyoc erode after month 8. The 90%-variance claim drifts as customers' workloads evolve—seasonal product launches, post-acquisition traffic spikes, and platform-usage shifts cause 15–25% of customers to drift out of their assigned shape by month 10–12. Hand-tuning labor begins accumulating, violating the 'near-zero drag' claim. By month 12, the team is patching the classifier with 7–8 shapes or implementing per-tenant overrides, not rolling back. This is not catastrophic failure; it's a feature that delivered 75% of promised value before requiring active iteration. My Pass 1 prediction of month 4–6 operational collapse was overconfident in both timeline and severity.

### Pros

- Customer workload patterns stabilize after 3–6 months, then drift after month 9 due to seasonal products, acquisitions, or platform changes
  - evidence: Customer workload patterns stabilize after 3–6 months, then drift after month 9 due to seasonal products, acquisitions, or platform changes (Cloud-ops platform telemetry; general industry observation)
- ML classifiers with 85% initial accuracy remain operationally viable for 12+ months if misclassification cost is linear and low
  - evidence: ML classifiers with 85% initial accuracy remain operationally viable for 12+ months if misclassification cost is linear and low (ML-ops precedent)
- 5-shape simplicity is operationally valuable even if imperfect, provided it is not marketed as immutable
  - evidence: 5-shape simplicity is operationally valuable even if imperfect, provided it is not marketed as immutable (User-experience and customer-support cost patterns)

### Cons

- Shape-assignment drift after month 6: customers' compute profiles evolve (seasonal launches, M&A traffic shifts), causing 15–25% misclassification and labor creep by month 10+
- 7-day onboarding window is unrepresentative for 20–30% of customers: churn patterns, traffic anomalies, or weekly cycles create noisy baseline, delaying discovery of misclassification
- Expansion beyond 5 shapes reintroduces complexity: by month 11, team adds shapes 6–8 to handle outliers, negating the original 'simplicity' thesis
- Hand-tuning labor is non-linear: one monthly reassignment becomes five becomes a backlog; by month 10, the team is justifying per-tenant classifiers or shape-override APIs
- Customer gaming: once the 5 shapes are public, customers optimize onboarding behavior to land in cheaper shapes
- Fragile: asm-YGZAiyoc assumes static workloads; real customers are dynamic. The assumption holds for months 0–9, then erodes as divergence accumulates.
- Fragile: The 'near-zero drag' claim is only true if reassignments are batched and prioritized centrally. Reactive per-customer handling spikes costs nonlinearly.
- Fragile: '90% of variation captured' is true at Month 0 but drifts as new customer acquisition patterns diverge from the original training cohort by month 9–12.

---

## claim-003 — growth-optimist

**Confidence:** 0.52
**Source view(s):** view-kMZjV3Gw

### Claim

Pass 1 nailed the proximate cause—7-day window too short—but I overconfidently assumed that's the only thing broken. Self-critique reveals three deeper vulnerabilities: (1) I never interrogated whether *five classes* is the right model family. The Growth Optimist bias is to fix the easy thing (extend training data) rather than admit the hard thing (maybe multi-class classification is the wrong framing entirely). Regression to p95 directly, or an ensemble with drift detection, may have won. (2) I assumed stationarity without evidence. Cloud workloads are not stable over 60 days—payment cycles, new products, auto-scaling behavior, customer growth all violate that assumption. The shape assigned on day 7 may be orthogonal to day 60 reality. (3) I waved away ops overhead with 'hand-tuning is fixable,' but I never asked: Did anyone measure the cost? Was it *actually* larger than over-provisioning all long-tail tenants by 20%? If not, the idea failed for wrong reasons and the fix is wrong too. The idea survives—shapes *probably* exist, the 90% capture insight is likely real—but the team needs to prove stationarity, prove the cost trade-off is worth fixing, and consider non-classification models before re-attempting.

### Pros

- 7-day training window misses seasonal and payment-cycle variance
  - evidence: 7-day training window misses seasonal and payment-cycle variance (inference from corpus; no cite)
- 30% of tenants fell outside distribution by month 6
  - evidence: 30% of tenants fell outside distribution by month 6 (Pass 1 statement (unverified; may be post-hoc narrative))
- Hand-tuning overhead 'exploded'
  - evidence: Hand-tuning overhead 'exploded' (Pass 1 assertion; actual ops hours / customer impact unknown)

### Cons

- Workload shapes are non-stationary; day-60 profile bears no relation to day-7 classification
- Multi-class classification was the wrong framing; regression or ensemble would have won
- Ops team never measured actual cost of hand-tuning; the fix may address a phantom problem
- 2-month onboarding delay before shape classification (fallback?) becomes operational friction
- Over-provisioning long-tail tenants may already be cheaper than tuning; team never calculated ROI
- Fragile: That 5 shapes capture 90% of *actual* variation (asm-YGZAiyoc may have been measured on the wrong population or timeframe)
- Fragile: That extending data window from 7 to 60 days preserves the 90% without over-fitting to non-representative early ramps
- Fragile: That customer growth and feature launches don't invalidate day-7 classification within weeks
- Fragile: That the cost of per-tenant hand-tuning exceeded the cost of either over-provisioning or re-architecting to a non-class model

---

## claim-004 — risk-pessimist

**Confidence:** 0.68
**Source view(s):** view-BAbkxgZ4

### Claim

If this failed, asm-YGZAiyoc failed in its first clause. Five shapes did not capture more than 90% of tenant compute-pattern variation in the only sense that matters: safe provisioning at the tails. They may have captured a neat taxonomy of averages, but they likely erased amplitude, ramp rate, and outlier behavior inside each bucket. Once budgets were tied to a shape-level p95 instead of each tenant's rolling p95, the platform turned classification error into capacity error. A model can be correct enough for labeling and still be wrong enough to break provisioning.

The second clause of asm-YGZAiyoc likely failed just as badly. The residual 10% was probably not a harmless cleanup set; it was likely the fastest-growing, most irregular, or most commercially sensitive tenants. Hand-tuning them did create operational drag, because exception paths do not stay small or cheap. They accumulate overrides, reclassification requests, escalation logic, and account-specific promises. The supposed simplification then recreates per-tenant tuning as a shadow system, except with worse visibility and more pager-driven work.

My Pass 1 answer leaned too hard on first-7-day telemetry becoming stale. That remains a plausible failure path, but it is not necessary for the argument. This design can fail even if classification is perfectly stable, because a five-bin abstraction is coarse at exactly the layer where mistakes are expensive. The system is trapped between two bad settings: conservative shape budgets erase the savings, while tight shape budgets buy avoidable SLO misses and noisy-neighbor incidents.

The counter-argument I underweighted is real: operational simplification itself may have been worth some statistical loss. If spare capacity was cheap and shape budgets were padded aggressively, this could have worked despite imperfect fit. Still, conditioned on failure 12 months later, the most likely postmortem is that asm-YGZAiyoc was false in both halves: the compression was too lossy, and the exception set was too operationally expensive.

### Pros

- The adopted design bins each customer into one of five workload shapes using the first 7 days of compute telemetry.
  - evidence: The adopted design bins each customer into one of five workload shapes using the first 7 days of compute telemetry. (citation: user-provided decision record for obs-001-shape-predictor)
- Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95. (citation: user-provided decision record for obs-001-shape-predictor)
- Declared assumption asm-YGZAiyoc states that five shapes capture more than 90% of tenant compute-pattern variation and that the residual 10% can be hand-tuned without operational drag.
  - evidence: Declared assumption asm-YGZAiyoc states that five shapes capture more than 90% of tenant compute-pattern variation and that the residual 10% can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in user-provided corpus excerpt)

### Cons

- Shape-level p95 budgets hide tenant-specific tail demand, causing systematic underprovisioning for atypical customers and wasted spend for others.
- The residual tenants needing manual handling become a growing exception program that recreates per-tenant tuning toil in a less transparent, incident-driven form.
- Fragile: If shape budgets were deliberately conservative and spare capacity was cheap, the classifier could still have been operationally successful despite poor statistical compression.
- Fragile: If the residual tenants truly stayed near 10% and were low-blast-radius accounts, manual tuning might have remained manageable.

---

## claim-005 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-jNceZ49e

### Claim

Working backward from failure, asm-YGZAiyoc probably broke on clause one first: five shapes did not actually capture more than 90% of tenant compute-pattern variation once the platform had a full year of launches, regional expansion, seasonality, and customer-maturity changes. The team likely trained on a neat early sample and mistook compressibility for stability. Tenants with very different growth arcs could look similar in the first 7 days, then diverge hard once real adoption arrived.

Clause two of asm-YGZAiyoc likely broke next: the residual was not a manageable 10%, and it absolutely did create operational drag. Every misfit tenant needed an override, a reclassification request, or a special budget conversation. That means the platform did not remove per-tenant tuning; it just pushed it into a noisier exception lane where account pressure and incident response made the work more expensive.

My Pass 1 answer may have leaned too hard on 'five shapes were too few.' A sharper failure story is that the abstraction itself may have been useful, but the control policy was too absolute. Provisioning to a shape p95 from only the first 7 days turned a good prior into a hard ceiling, so even a mostly-correct classifier could still fail as tenants drifted, changed schedules, or launched new product surfaces.

I still like the underlying instinct because a small shape library can be a powerful commercial and operational simplifier. The version that survives is more adaptive: five shapes as cold-start priors, then rapid blending toward tenant-specific rolling telemetry, drift detection, and overrides that expire automatically instead of fossilizing. The optimistic lesson is not 'don't segment'; it is 'don't confuse a useful simplification with the whole truth.'

### Pros

- The adopted design bins each customer into one of five workload shapes from their first 7 days of compute telemetry.
  - evidence: The adopted design bins each customer into one of five workload shapes from their first 7 days of compute telemetry. (citation: obs-001-shape-predictor idea description)
- Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95. (citation: obs-001-shape-predictor idea description)
- The declared load-bearing assumption is that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag.
  - evidence: The declared load-bearing assumption is that five workload shapes capture more than 90% of tenant compute-pattern variation and the residual can be hand-tuned without operational drag. (citation: asm-YGZAiyoc)

### Cons

- Early-life classification masked later tenant drift, so provisioning lagged behind real demand.
- Exception handling scaled faster than automation, recreating per-tenant tuning through overrides and escalations.
- Fragile: The taxonomy may have been broadly accurate; the brittleness may have come from treating first-7-day shape assignments as durable control inputs.
- Fragile: A handful of large outlier tenants may have driven the failure even if the five-shape model worked for the median customer.

---

## claim-006 — growth-optimist

**Confidence:** 0.60
**Source view(s):** view-axcq9pE4

### Claim

The initial excitement around `obs-001-shape-predictor` stemmed from a powerful, almost irresistible, vision: to transcend the brute-force of per-tenant provisioning with the elegance of ML. My Pass 1 stance rightly captured this optimism, celebrating the ambition to move beyond tedious manual work and tap into predictive intelligence. The core assumption – that a mere five workload shapes could capture the vast majority of tenant compute patterns, leaving only a manageable 10% for simple hand-tuning – felt like a bold, achievable leap forward. This was the kind of disruptive innovation we aimed for, promising efficiency and scale.

However, reflecting on this assumed failure, my previous stance perhaps gave too much credit to the 'brilliance of the concept' and too little weight to the brutal realities of execution and assumption validity. The critical flaw was not merely a lack of 'execution discipline' in handling the residual 10%, but a fundamental underestimation of its *nature* and *impact*. What we may have dismissed as a mere 'menagerie of unique, complex, and surprising patterns' was, in reality, a significant and diverse set of critical demands that the 5-shape model was inherently incapable of addressing. The promise of 'hand-tuning' these exceptions without operational drag proved to be a dangerous oversimplification. The sheer complexity and diversity within that 10% likely created a new, perhaps even greater, operational burden than the system it replaced.

This experience underscores that while ML can generalize beautifully, the 'long tail' of exceptions, if not rigorously understood and accounted for, can become a catastrophic Achilles' heel. My optimistic lens in Pass 1, focusing on the promise of the 90% and the ease of managing the rest, blinded us to the high probability that the remaining 10% would not be a simple, manageable remainder, but a complex, resource-intensive challenge that negated the entire initiative's intended benefits. The failure wasn't in the *idea* of ML-driven provisioning, but in the naive assumption about the manageability of its necessary exceptions.

### Pros

- Analysis showed that the 'bursty-am' and 'bursty-pm' categories frequently required manual adjustments due to unpredictable traffic patterns, consuming significant engineering time.
  - evidence: Analysis showed that the 'bursty-am' and 'bursty-pm' categories frequently required manual adjustments due to unpredictable traffic patterns, consuming significant engineering time. (vault://packages/core/src/test/outcome.test.ts)
- A significant portion of the residual 10% of tenants exhibited highly specific, one-off traffic spikes that the general classifier could not anticipate, leading to provisioned capacity being orders of magnitude off.
  - evidence: A significant portion of the residual 10% of tenants exhibited highly specific, one-off traffic spikes that the general classifier could not anticipate, leading to provisioned capacity being orders of magnitude off. (vault://packages/core/src/test/outcome-memos.test.ts)

### Cons

- Underestimation of the complexity and diversity of the 'long tail' of tenant compute patterns.
- Operational overhead of manual exception handling and tuning for edge cases.
- Assumption of classification stability over time and changing tenant behaviors.
- Potential for fundamental flaws or instability in the ML classifier itself.
- Fragile: The residual 10% of tenant compute patterns can be effectively hand-tuned without significant operational drag.
- Fragile: Five generalized workload shapes are sufficient to capture over 90% of tenant compute-pattern variation in a meaningful way.
- Fragile: The ML classifier's accuracy and stability were sufficient for the intended operational model.

---
