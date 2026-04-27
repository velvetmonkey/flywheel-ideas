---
type: council_view
session_id: sess-oFqSpfmC
idea_id: idea-RKj5kwwY
model: claude
persona: risk-pessimist
persona_name: Risk Pessimist
mode: steelman
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:4e0540e1f875f0cb744ebd8e6b13013920a0c7d25ca7ea87e4fe3757dfc8a178'
failure_reason: null
confidence: 0.38
---
## Revised stance (Pass 2)

The 5-shape classifier succeeded, but the success was narrower and more fragile than the steelman admits. The shapes did capture real clustering in the *initial cohort*—the early-adopter segment likely had stable, predictable workloads. But 90% capture is almost certainly a post-hoc metric measured on that same cohort, not a prediction about new tenants. The 7-day window was insufficient to detect seasonal, quarterly, or growth-driven drift; a 'steady-low' tenant that doubled compute in month 4 would still be classified as steady-low until re-evaluation. The 10% 'hand-tuned' tail is the canary. If hand-tuning cost $400k/year (even 3-4 FTEs at 5% capacity), the savings arithmetic becomes $400k tuning ops vs. $600k excess provisioning = break-even, not a clear win. More damaging: the steelman assumes classification stability. Real workloads drift. As the customer base diversified 12 months post-launch—more startups, more IoT, more ML workloads—the distribution likely shifted away from the original five modes. A classifier trained on Month 1 has no mechanism to detect this drift. The team probably saw *new* tenants that didn't fit the shapes and quietly absorbed them into 'closest match,' degrading precision silently. The operational overhead didn't disappear; it shifted from upfront tuning to ongoing exception handling and complaint resolution. Finally, there was no control group. Did the team A/B test 5-shape provisioning against a simpler baseline (rolling p95 + 1.3x multiplier)? Without it, the claim that *the shapes* drove savings—rather than just 'standardized provisioning'—is unfalsifiable. The idea may have succeeded by making provisioning more predictable, not because five shapes have any special power. Feedback loops didn't validate the shapes; they validated 'don't hand-tune each customer,' which is a different claim.

**Confidence:** 0.38

## Self-critique (Pass 2)

Pass 1 (the steelman) made several unwarranted leaps: (1) assumed 7 days was 'enough signal' without justifying why seasonal/drift patterns could be ignored; (2) treated 'hand-tuning the 10%' as cost-neutral and rare, when it's likely a growing ops burden; (3) claimed 'feedback loops validated the shapes held' without evidence that shape accuracy didn't degrade over time; (4) attributed savings to 'the shapes' when they might flow from 'standardized provisioning'—a much simpler hypothesis; (5) assumed new tenants 'followed the same modes' because they did during Month 2-3, not because the shapes remained predictive over 12 months in a larger, more diverse cohort. The steelman took post-hoc narrative at face value. A Risk Pessimist reads the same evidence and sees a team that solved a real problem (per-tenant tuning overhead) with a pragmatic but brittle tool (five hard-coded categories) and didn't publicly acknowledge its failure modes. The 90% capture rate is almost certainly narrower than claimed—90% of *early adopters*, not 90% of *all customers*. That's a material difference.

## Initial stance (Pass 1)

The 5-shape classifier succeeded because it mapped to genuine structure in the customer base, not arbitrary bucketing. Production telemetry from Caprivane's first cohort likely showed hard clustering around workload modes: small SaaS tenants (steady-low), enterprise deployments (steady-high), marketing-automation shops with AM campaigns (bursty-am), analytics pipelines running PM batches (bursty-pm), and enterprises with Monday rebalances (weekly-spike). Seven days of hourly data per tenant gave ~168 samples—enough signal for a classifier to separate these modes cleanly (likely 80%+ accuracy per-tenant). The critical insight: the 10% tail wasn't uniformly distributed. It probably clustered into 3-4 edge cases (e.g., "multi-mode hybrid" tenants that shift patterns with season). These outliers were either rare enough to hand-tune affordably, or the shape-based p95 provisioning had enough slack that misfits still landed within acceptable bounds. The bigger win was operational: onboarding 1,000 new tenants on a single classifier workflow instead of 1,000 bespoke tuning sessions eliminated procedural drift, reduced classification time from 2 days to 2 hours, and cut SLA disputes by removing human judgment variance. Feedback loops 6-12 months in likely revealed that the shapes held—new tenants followed the same modes—making the model self-vindicating. Cost analysis 12 months post-launch probably showed <5% excess provisioning cost (the cost of occasional misfits) against 40% savings in ops labor and zero late-night tuning escalations. The assumption held not because ML is magic, but because the team did basic cluster validation on historical data first.

## Key risks

- 7-day training window misses seasonal, quarterly, and growth-driven workload drift; classifier trained on Month 1 becomes stale by Month 12
- 10% 'hand-tuned' tail is symptom of model failure, not residual noise—likely grew as customer base diversified; real ops overhead hidden in exception handling
- Cohort bias: early-adopter tenants are not representative; newer cohorts (startups, IoT, ML) may have fundamentally different patterns the five shapes don't capture
- Classification stability assumption false: no drift detection mechanism; tenants that shift workload modes after Month 1 stay misclassified until manual re-review
- Cost analysis conflates standardization savings with shape-specific value; no control group comparison (5-shape model vs. simpler rolling p95 baseline)
- Misfits don't 'land within bounds'—under-provisioning triggers SLA violations and churn; over-provisioning wastes budget; breakeven cost poorly understood

## Fragile insights

- The 90% capture claim is measured on the *same cohort* that defined the shapes; generalization to new cohorts is not validated
- Operational savings are real, but they flow from 'stopped doing per-tenant customization,' not from '5 shapes capture 90% of variation'
- The 'feedback loops validated it' narrative assumes constant-composition customer base; real growth changes the distribution
- Misfits absorb into exception handling and manual override; the 10% tail didn't vanish, it became invisible

## Assumptions cited

- `asm-YGZAiyoc`

## Metacognitive reflection

- **Could be wrong if:** The team actually measured drift post-launch and found shapes remained stable across cohorts; if new tenants genuinely clustered into the original five modes; if the 10% tail shrank over time (not grew); if A/B testing showed 5-shape model materially outperformed rolling-p95 baseline; if hand-tuning cost was truly negligible (< 1 FTE); if SLA violations in the shape-misfit group were not statistically higher than control.
- **Most vulnerable assumption:** `asm-YGZAiyoc. The 90% capture claim is almost certainly true *within the training cohort* but not generalizable. The team conflates 'high accuracy on historical data' with 'five shapes are universal and stable.' Workload distributions shift with customer composition, market conditions, and product maturity. A stationary 90% capture rate over 12 months is improbable without active model retraining or drift detection.`
- **Confidence rationale:** 0.38 reflects high confidence in the failure mode (shape drift, cohort bias, hand-tuning hidden cost) but uncertainty about whether the team caught and mitigated these problems post-launch. The steelman assumes they didn't: no drift detection, no retraining, no public acknowledgment of the 10% exception load. If the team *did* discover these issues and invested in a 'shapes v2' with seasonal modes, drift detection, and quarterly retraining, the idea could still have succeeded despite the v1 fragility. But the prompt doesn't claim that—it claims the 5-shape model itself succeeded. On the evidence presented, it's a narrow, fragile success that probably looked worse 18 months post-launch when new cohorts arrived and shaped distribution shifted.

## Evidence

- "7-day window insufficient to detect seasonal/quarterly patterns; workloads drift over 12 months" — citation: classical time-series risk—training horizon must exceed cycle length to capture all modes
- "Early-adopter cohorts are not representative of growth-stage customer diversity; later cohorts likely skew toward unmodeled workload types" — citation: B2B platform growth patterns (Slack, Stripe, etc.) show maturation cohorts have different characteristics than seed cohorts
- "10% hand-tuning is admission that 5-shape model doesn't capture remaining variation; hand-tuning cost is hidden operational drag" — citation: post-hoc cost analysis often omits exception-handling labor, SLA penalties, and churn risk
- "No control-group comparison against simpler baseline (rolling p95 + multiplier); unclear whether shapes themselves provided value or just standardization" — citation: standard ML evaluation practice requires holdout A/B test or comparison to null hypothesis
