---
type: argument_map
session_id: sess-GsCekwrZ
generated_at: '2026-04-26T18:23:40.679Z'
---
# Argument map — session sess-GsCekwrZ

**Idea:** obs-001-shape-predictor — Replace per-customer compute provisioning with a 5-shape ML classifier
**Generated:** 2026-04-26T18:23:40.679Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.75
**Source view(s):** view-aHJM7eB1

### Claim

The proclaimed efficiency gains of this 5-shape ML classifier are overshadowed by the sheer audacity of its core assumptions. Expecting a mere five static categories to encapsulate the full spectrum of tenant compute behavior, especially based on a fleeting initial week of data, is fundamentally flawed. Tenant usage patterns are notoriously volatile, evolving with business cycles, application deployments, and even unpredictable user behavior. The claim that 90% of variation can be captured is, at best, wishful thinking, and more likely, a deliberate downplaying of the inevitable misclassifications. The notion that the remaining 10% – which could represent high-value, critical tenants – can be 'hand-tuned without operational drag' is a dangerous delusion. This implies a significant, ongoing manual effort, prone to human error and inconsistent application, which will likely become a substantial operational burden, negating any projected savings and introducing a new class of systemic instability. The potential for widespread under-provisioning, leading to critical performance degradation for key customers, remains my primary concern, alongside the hidden operational debt of manual intervention.

### Pros

- Adoption of a 5-shape ML classifier for per-customer compute provisioning, using the first 7 days of telemetry for classification.
  - evidence: Adoption of a 5-shape ML classifier for per-customer compute provisioning, using the first 7 days of telemetry for classification. (vault://pilot/wedge-corpus.adr-readable.jsonl)

### Cons

- Inaccurate workload shape classification leading to persistent under-provisioning and critical performance degradation for key tenants.
- Significant and unmanageable operational overhead and error rates due to the manual 'hand-tuning' of the residual tenant variations.
- Systemic instability and unexpected costs arising from the failure of the 5-shape model to adapt to evolving tenant usage patterns.
- Fragile: The assumption that 7 days of telemetry data is a stable and representative indicator of a tenant's long-term compute behavior.
- Fragile: The underestimation of the complexity, cost, and error potential associated with manually managing the remaining 10% of tenant variations.

---

## claim-002 — risk-pessimist

**Confidence:** 0.76
**Source view(s):** view-xJLqChZX

### Claim

I remain negative on this decision, but more narrowly than in Pass 1. The core downside still sits inside asm-YGZAiyoc. First, the claim that five shapes explain more than 90% of tenant compute-pattern variation is brittle because the classifier is built from only the first 7 days of telemetry, while real tenant behavior often changes after onboarding, feature rollout, or calendar effects. If that early window is not representative, the system hard-codes the wrong budget target and then repeats the error at scale.

Second, the back half of asm-YGZAiyoc is where these schemes usually fail operationally. Even if five shapes do explain around 90% of variation in a retrospective dataset, it does not follow that the residual 10% can be hand-tuned without operational drag. That residual is likely to be concentrated in the highest-growth tenants, the least predictable tenants, or the customers whose incidents matter most. Exception handling then stops being a safety valve and becomes the true provisioning system.

My revision after self-critique is that I was too quick to assume the tail would necessarily be large in operational terms. It might not be. If the misclassified tenants are small, detected early, and cheaply corrected, the model could reduce toil without much harm. But the adopted design still embeds an asymmetric failure mode: wrong classification drives either recurring underprovisioning incidents or structurally unnecessary spend, and the decision text gives no evidence that the error tail is both low-impact and operationally containable.

The counter-argument I underweighted is that per-tenant tuning may itself be noisy, slow, and error-prone, so a coarse but stable classifier could outperform a bespoke process in practice. Even so, this decision is exposed unless Caprivane has evidence that classification remains stable beyond the first 7 days and that exceptions stay rare, low-severity, and low-labor. Without that, asm-YGZAiyoc is doing too much load-bearing work for a five-bin abstraction.

### Pros

- Provisioning targets the workload shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning targets the workload shape's p95 budget rather than the tenant's actual rolling p95. (citation: user-provided decision record obs-001-shape-predictor)
- Tenant classification is derived from the first 7 days of compute telemetry.
  - evidence: Tenant classification is derived from the first 7 days of compute telemetry. (citation: user-provided decision record obs-001-shape-predictor)
- The load-bearing assumption states that five workload shapes capture more than 90% of tenant compute-pattern variation and that the residual 10% can be hand-tuned without operational drag.
  - evidence: The load-bearing assumption states that five workload shapes capture more than 90% of tenant compute-pattern variation and that the residual 10% can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in user-provided corpus excerpt)

### Cons

- The first-7-days classifier may lock tenants into the wrong workload shape, causing systematic underprovisioning or overprovisioning for long periods.
- The supposed hand-tuned residual may concentrate in the most operationally expensive tenants, turning exceptions into an unbounded pager and escalation queue.
- Fragile: The tail risk is only decisive if misclassified tenants are disproportionately large, fast-changing, or incident-prone; if they are mostly small and easily corrected, this critique weakens.
- Fragile: Seven-day telemetry may be adequate if tenant workloads stabilize unusually early in this product domain.

---

## claim-003 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-P3A1KzMd

### Claim

Five shapes likely DO NOT capture 90% of tenant variation—the claim is empirically unvalidated, and the corpus contains no cluster analysis, silhouette metrics, or hold-out validation. But I overestimated the consequences. If the model is conservative (defaults to generous budgets rather than lean ones), misclassification might cost 3-5% extra spend, not SLO dark. The real failure mode is the HIGH-VALUE TENANT in the 10% residual: they grow 30x post-launch, get classified as steady-low, and you have a support crisis. Hand-tuning might be rare enough (2-3 tenants initially) that it's not operational drag—yet. The plan's blind spot is still reclassification: no mention of re-eval cadence, drift detection, or automated promotion to dynamic provisioning if a shape assignment breaks. Workload patterns drift (steady-low → weekly-spike after reporting season kicks in), and there's no feedback loop. The 5-shape taxonomy might be sufficient for cost-cutting, but it's fragile when real customers have tails.

### Pros

- Unvalidated 90% clustering claim is standard in platform-provisioning literature; most organizations discover actual cluster count post-deployment
  - evidence: Unvalidated 90% clustering claim is standard in platform-provisioning literature; most organizations discover actual cluster count post-deployment (vault://tech/flywheel/flywheel-ideas/ (common pattern from prior decision reviews))
- Workload patterns drift; stable patterns rarely hold across day-7 baseline to day-90 in cloud tenants
  - evidence: Workload patterns drift; stable patterns rarely hold across day-7 baseline to day-90 in cloud tenants (observational (typical SAAS onboarding behavior))

### Cons

- Misclassification cascades to high-value customers after growth phase (post-day-7 burst)
- No reclassification strategy = workload drift causes creeping SLO violations or cost bleed after 60–90 days
- Unvalidated 90% claim; likely true error rate is 12–18%, making 'hand-tuned residual' larger and more expensive than disclosed
- Conservative shape budgets mask cost; aggressive shape budgets risk under-provisioning for outliers
- Fragile: The 'residual 10% hand-tuned without drag' holds only if hand-tuning is <2% of ops labor and customer complexity doesn't skew toward the residual
- Fragile: Five shapes remain stable only if tenant workload patterns are stationary over the first year; seasonal/reporting cycles violate stationarity
- Fragile: Cluster stability assumed without measurement; high-dimensional compute telemetry often clusters into >10 stable classes

---

## claim-004 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-UyemEzcf

### Claim

Shapes as an abstraction beat per-tenant tuning on its face. But 5 shapes locked at onboarding + 90% variance assumption + "hand-tune the 10%" is untested and risky.

Pass 1 I was enamored with simplicity and imagined a product roadmap (quarterly re-inference, auto-expand, shape-migration SLAs) that doesn't exist yet. That's classic Growth Optimist: spot one good move and immediately build the empire on top of it.

The core vulnerability is assumption asm-YGZAiyoc: "5 shapes capture >90% variance AND hand-tuning 10% costs nothing." I have zero evidence either is true. In practice:

- 7-day inference window is probably too short. A tenant classified steady-low on day 7 might go bursty-pm by month 2 when they launch a feature. Re-classification overhead could dwarf whatever you saved by not tuning per-tenant at day 0.
- "Hand-tune 10%" assumes exceptions are cheap. They're not. Every exception is a ticket, a spreadsheet row, a one-off SLA. If 10% means 200 tenants per 2000-tenant install base, that's 200 ongoing support cases.
- Variance distribution could be heavily skewed (e.g., 70% of variance in steady-low vs steady-high threshold, 30% split across bursty patterns). If so, 5 shapes buys less tractability than it seems.

The idea is solid directionally. But the wager is underbaked. Before adopting, I'd ask: (a) What % of tenants re-classify within 6 months? If >30%, the shape stability assumption fails and per-tenant tuning looks cheap by comparison. (b) How many support tickets are "customer in wrong shape"? (c) Is the 90% number measured or aspirational?

### Pros

- Hand-tuning operational cost is unknown; need ticket/SLA-exception audit before claiming 10% residual is cheap
  - evidence: Hand-tuning operational cost is unknown; need ticket/SLA-exception audit before claiming 10% residual is cheap (none — this is a gap, not evidence)
- 7-day inference window is arbitrary; weekly-spike pattern needs ≥14 days to observe full cycle, seasonal patterns need 21-90 days
  - evidence: 7-day inference window is arbitrary; weekly-spike pattern needs ≥14 days to observe full cycle, seasonal patterns need 21-90 days (standard ML practice (temporal data needs ≥2 full cycles to be reliable))
- Shape stability under growth is high-risk: startup classified as steady-low month 0 → steady-high month 3 → bursty-pm month 6
  - evidence: Shape stability under growth is high-risk: startup classified as steady-low month 0 → steady-high month 3 → bursty-pm month 6 (SaaS platform dynamics (typical scaling S-curve + feature launches shift compute pattern))

### Cons

- 7-day classification window misses seasonal patterns (month-end, quarterly reports); tenants drift out of assigned shape within months, creating re-tuning overhead that rivals original per-tenant cost
- Hand-tuning 10% residual is operationally expensive in practice: every exception becomes a support ticket, SLA override, or one-off provisioning rule
- Shape inference may overfit to cohort (e.g., SaaS startups); enterprise or data-intensive customers could violate 90% variance assumption
- Misclassification cost asymmetry: under-provisioning is worse than over-provisioning, but 5-shape model assumes symmetric cost and may bias toward under-allocation
- Fragile: "Hand-tune the 10% strategically" assumes hand-tuning is cheap; real operational data needed to validate this
- Fragile: Quarterly re-inference and auto-expand are speculative (not in current plan); adoption without them risks classification stall
- Fragile: Shape discovery is "not baked" claim assumes you'll revisit taxonomy; if 5 shapes are locked at release, tenants stuck in stale buckets

---

## claim-005 — growth-optimist

**Confidence:** 0.85
**Source view(s):** view-xKa7m8ev

### Claim

This 'shape predictor' initiative is a visionary stride forward, embodying the very spirit of growth and intelligent scaling that Caprivane thrives on. By pivoting from bespoke per-customer compute provisioning to an elegant, ML-driven classification model, we're not merely optimizing; we're fundamentally redefining our operational paradigm. The adoption of five distinct workload shapes is a masterstroke of abstraction, promising to unlock unprecedented levels of efficiency, reduce engineering overhead, and liberate our teams to pursue more innovative initiatives. This is a bold, forward-thinking bet that leverages sophisticated pattern recognition to conquer a critical scaling challenge, laying a robust foundation for sustained growth and operational excellence.

### Pros

- A tenant-classification model bins customers into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike).
  - evidence: A tenant-classification model bins customers into one of five workload shapes (steady-low, steady-high, bursty-am, bursty-pm, weekly-spike). (Idea Description)
- Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95. (Idea Description)
- The 5 shapes capture >90% of tenant variation.
  - evidence: The 5 shapes capture >90% of tenant variation. (Idea Description)
- Classification stability eliminates per-tenant tuning overhead.
  - evidence: Classification stability eliminates per-tenant tuning overhead. (Idea Description)
- Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag.
  - evidence: Five workload shapes capture more than 90% of tenant compute-pattern variation; the residual 10% can be hand-tuned without operational drag. (Declared Assumption: asm-YGZAiyoc)

### Cons

- The ML model's accuracy may degrade over time due to data drift or evolving tenant behaviors.
- Managing the 'residual 10%' of tenants not perfectly fitting the five shapes could incur unexpected operational drag.
- The complexity and maintenance overhead of the ML classification system might be underestimated.
- Critical customer impact from misclassification (e.g., under-provisioning for high-demand tenants) could outweigh projected savings.
- Fragile: The assumption that manual tuning of the residual 10% of tenant patterns will be inherently 'without operational drag'.
- Fragile: The implicit certainty that the five predefined shapes are sufficient indefinitely without requiring model adaptation for new or unforeseen workload patterns.
- Fragile: The absolute feasibility of achieving and maintaining the target of capturing >90% of tenant compute-pattern variation.

---

## claim-006 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-fucWyChH

### Claim

I still lean yes, but more conditionally than in Pass 1. The core attraction remains strong: replacing bespoke per-tenant provisioning with five canonical shapes can turn capacity management into a productized system instead of an endless tuning service. If that simplification works even approximately, it creates operating leverage, faster onboarding defaults, and a cleaner path to automated provisioning policy.

I want to attack `asm-YGZAiyoc` directly. Its first claim is that five workload shapes explain more than 90% of tenant variation. That could be false in a very specific way: tenant fleets often look simple in aggregate while hiding a long tail of rare-but-expensive patterns, and a first 7-day window may mostly capture onboarding posture rather than steady-state demand. If those edge cases cluster around high-revenue or high-volatility customers, the model can look statistically elegant while being economically wrong.

The second claim inside `asm-YGZAiyoc` is that the residual 10% can be hand-tuned without operational drag. That is the part I underweighted before. Residuals are rarely random; they tend to be the noisiest, fastest-changing, most support-intensive tenants. If the exception lane becomes a permanent artisanal service for exactly the hardest customers, the organization may preserve most of the old toil while losing the precision of per-tenant tuning.

Even with that critique, I still see upside if the classifier is treated as a routing prior, not a hard budget cage. The creative version of this decision is: standardize the common path, expose low-confidence and drift signals early, and promote misfits into an explicit premium exception workflow. In that form, the five-shape model does not need to be perfectly true to be strategically useful; it only needs to compress the easy majority without silently harming the valuable minority.

### Pros

- The adopted design bins each customer into one of five workload shapes using the first 7 days of compute telemetry.
  - evidence: The adopted design bins each customer into one of five workload shapes using the first 7 days of compute telemetry. (citation: user-provided brief, obs-001-shape-predictor)
- Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95.
  - evidence: Provisioning targets the shape's p95 budget rather than the tenant's actual rolling p95. (citation: user-provided brief, obs-001-shape-predictor)
- The load-bearing assumption is that five workload shapes capture more than 90% of tenant variation and the remaining 10% can be hand-tuned without operational drag.
  - evidence: The load-bearing assumption is that five workload shapes capture more than 90% of tenant variation and the remaining 10% can be hand-tuned without operational drag. (citation: declared assumption asm-YGZAiyoc in user-provided brief)

### Cons

- The 7-day classifier may lock tenants into the wrong shape based on onboarding behavior, creating chronic under- or over-provisioning.
- The residual 10% may contain the most operationally expensive tenants, so hand-tuning them could recreate the original toil under a smaller but sharper tail.
- Fragile: The decision works best if the classifier is a routing prior with visible drift handling rather than a fixed budget assignment; that upside collapses if the operating model treats shape labels as permanent truth.

---
