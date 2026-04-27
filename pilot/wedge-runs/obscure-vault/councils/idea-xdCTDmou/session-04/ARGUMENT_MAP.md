---
type: argument_map
session_id: sess-tkACCeFU
generated_at: '2026-04-26T20:43:06.345Z'
---
# Argument map — session sess-tkACCeFU

**Idea:** obs-004-mouse-entropy-bot — Detect bot traffic via mouse-movement entropy on signup forms
**Generated:** 2026-04-26T20:43:06.345Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.82
**Source view(s):** view-LqZL8o5N

### Claim

Twelve months later, this likely failed because the team converted a narrow, noisy behavioral clue into a hard gate on account creation. The load-bearing assumption asm-ATByByb1 bundled three claims that should never have been trusted together: that 200ms yields enough signal, that the separation remains statistically valid in production, and that a low score means the user is reliably automated. Failure only required one of those to break. In practice, all three were vulnerable.

First attack on asm-ATByByb1: 200ms of mouse-movement observation is plausibly too short to observe meaningful entropy from many legitimate users. Some users barely move before clicking, some use trackpads or touchpads with short efficient paths, some rely on keyboard-first flows, autofill, accessibility tooling, remote desktops, VDI, or latency-distorted input. Those users are not exhibiting bot behavior; they are generating sparse or atypical human behavior. A detector that interprets missing entropy as evidence of automation will systematically turn uncertainty into false positives.

Second attack on asm-ATByByb1: the p<0.05 claim is weak protection against operational failure. Statistical significance does not guarantee useful precision under production class imbalance, and it says almost nothing about adversarial durability. If signup bots were a minority of total attempts, even a modest false-positive rate would damage the funnel, support burden, and trust. Meanwhile, attackers could add jitter, curved motion, recorded trajectories, browser automation with synthetic pointer noise, or human-in-the-loop farms. That collapses the neat human-versus-bot separation while the hard block continues to punish legitimate users. The likely postmortem is simple: the control was scientifically interesting, operationally brittle, and trivially gameable once deployed.

### Pros

- The adopted control blocks signups when mouse-movement entropy falls below a threshold after 200ms of observation.
  - evidence: The adopted control blocks signups when mouse-movement entropy falls below a threshold after 200ms of observation. (citation: user-provided decision brief for obs-004-mouse-entropy-bot)
- The declared load-bearing assumption states that 200ms is enough to distinguish humans from bots at p<0.05 and that sub-threshold signups are reliably automated.
  - evidence: The declared load-bearing assumption states that 200ms is enough to distinguish humans from bots at p<0.05 and that sub-threshold signups are reliably automated. (citation: declared assumption asm-ATByByb1 in user prompt)

### Cons

- Legitimate users with sparse, atypical, or non-mouse interaction patterns are hard-blocked because low entropy is treated as bot evidence rather than insufficient evidence.
- Attackers adapt quickly with synthetic jitter, replayed trajectories, or human-assisted pointer movement, destroying separability while the hard block continues to harm conversion.
- Fragile: The downside case weakens materially if the detector was actually used as one feature in a broader risk model rather than as a standalone hard block.
- Fragile: The critique depends on real-world input diversity being materially broader than the data used to justify the 200ms threshold.

---

## claim-002 — risk-pessimist

**Confidence:** 0.60
**Source view(s):** view-wyCd9n4a

### Claim

The detector likely failed within 12 months, but not for the reasons I emphasized in Pass 1. My three failure modes — accessibility catastrophe, device-variance collapse, adversarial defeat — are *real risks*, but I overestimated their inevitability and underestimated the likelihood of targeted mitigations. Accessibility is the strongest risk: disabled users triggering false-positive entropy flags with no fallback is a regulatory landmine. But if the product team installed a fallback (e.g., 'entropy check failed, try CAPTCHA instead'), the risk drops from catastrophic to reputational. Device variance is the second-strongest: the p<0.05 study almost certainly assumed low-latency USB mice and clean lab networks, not trackpads, mobile, or regional ISP jitter. Production data likely showed 3–8% false-positive rate, eroding conversion KPIs. However, this could have been mitigated by device-aware thresholding or adaptive jitter tolerance if the team invested post-deployment. Adversarial defeat is least likely to cause rapid rollback — bot operators probably took 6–12 months to add synthetic jitter or shift to human-in-the-loop, not weeks. The real vulnerability is that I've conflated 'fragile assumption' with 'system failure.' The rollback may have been strategic: a regulatory hammer (GDPR, CCPA movement-data tracking), a business pivot (accepting bot signups, chasing post-signup verification), or a better alternative detector launching. Assumption [asm-ATByByb1] is fragile, but I haven't proven the detector actually failed in production versus being displaced.

### Pros

- p-value statistical significance does not guarantee production robustness under distribution shift; lab conditions (device homogeneity, network latency, user demographics) rarely generalize to production
  - evidence: p-value statistical significance does not guarantee production robustness under distribution shift; lab conditions (device homogeneity, network latency, user demographics) rarely generalize to production (vault://tech/flywheel/flywheel-ideas/ (cross-domain research on ML generalization; standard in adversarial security literature))
- Mouse-movement entropy varies significantly by input method (trackpad vs. USB mouse vs. touchpad) and network latency (adds jitter, reduces entropy discrimination)
  - evidence: Mouse-movement entropy varies significantly by input method (trackpad vs. USB mouse vs. touchpad) and network latency (adds jitter, reduces entropy discrimination) (Assumption fragility — well-documented in human-computer interaction and bot-detection security literature)
- Adversarial adaptation typically requires 6–18 months for widespread deployment; weeks is optimistic for bot-farm-scale retooling
  - evidence: Adversarial adaptation typically requires 6–18 months for widespread deployment; weeks is optimistic for bot-farm-scale retooling (Assumption fragility — standard arms-race timeline in security detection)

### Cons

- Accessibility false-positives: disabled users (tremor, motor variability, switch control) trigger entropy failures; without fallback, regulatory + PR exposure is severe
- Device and network heterogeneity invalidates lab assumptions: trackpad vs. mouse entropy differs; network latency adds noise; regional ISP spikes degrade signal below p<0.05 threshold
- Adversarial adaptation within 6–12 months: bot farms add synthetic Gaussian jitter, shift to human-in-the-loop, or adopt hybrid strategies that defeat entropy-only detection
- Fragile: p<0.05 statistical significance is not production recall/specificity — lab distribution (single device, low-latency network, homogeneous user cohort) likely differs from production users, device types, and network conditions
- Fragile: [asm-ATByByb1] makes two claims: (i) 200ms is sufficient, (ii) sub-threshold = reliably automated. I'm confident (i) is fragile, but (ii) is untested in production — actual false-positive rate and its impact on conversion KPIs are unknown
- Fragile: No evidence of accessibility fallbacks in product design; if missing, risk is severe, but assumption does not explicitly claim absence of mitigations
- Fragile: Rollback cause is undetermined: could be core detection failure, regulatory pressure, business pivot, or displacement by better alternative — I conflated fragile assumption with system failure

---

## claim-003 — risk-pessimist

**Confidence:** 0.90
**Source view(s):** view-3CfG3Bga

### Claim

The failure of obs-004-mouse-entropy-bot was not an unexpected anomaly, but an illustration of fundamental design flaws meeting predictable adversarial evolution. The core assumption, that a mere 200 milliseconds of mouse movement could reliably distinguish a human from a bot at any meaningful confidence level (p<0.05), was hubristic. This metric was a trivial obstacle for any determined bot operator. The very nature of client-side heuristics is their susceptibility to manipulation. Bot developers don't need sophisticated AI; they merely need to inject sufficient noise or pre-programmed erraticism into cursor movements to bypass such a crude detector. The idea that this "high-entropy" signature was a robust defense is laughable, given how easily it could be gamed by even basic scripting.

Furthermore, the assumption's implicit dismissal of human variability was a catastrophic oversight. It presumed a universal, predictable human mouse-movement profile, ignoring the vast diversity in input devices (trackpads, touchscreens, accessibility tools) and individual motor control. Legitimate users, especially those with specific needs or simply a deliberate, steady hand, would inevitably trigger false positives. This not only frustrates users but undermines the very purpose of a signup form—to acquire new users. The 'bet' was lost before it was even placed, as the system was designed to fail by either blocking real users or being trivially bypassed by bots. The adversarial landscape guarantees that easily observable client-side signals are perpetually vulnerable, making this approach a guaranteed dead end.

### Pros

- The Verdant Trust security team adopted a client-side bot detector measuring mouse-movement entropy.
  - evidence: The Verdant Trust security team adopted a client-side bot detector measuring mouse-movement entropy. (Decision-ID: obs-004-mouse-entropy-bot)
- The core assumption was that 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05, and sub-threshold signups are reliably automated.
  - evidence: The core assumption was that 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05, and sub-threshold signups are reliably automated. (Declared assumptions: - [asm-ATByByb1, load-bearing] 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05; sub-threshold signups are reliably automated.)

### Cons

- Client-side heuristics are inherently insecure against motivated adversaries.
- False positives due to human variability are inevitable and damaging.
- The detection mechanism was a simplistic target for bot evolution.
- Fragile: The belief that a single, easily measurable client-side metric can provide robust bot detection.
- Fragile: The assumption that bot developers would not quickly adapt to overcome simple entropy-based detection.

---

## claim-004 — growth-optimist

**Confidence:** 0.48
**Source view(s):** view-LtTanrnv

### Claim

Pass 1 was overconfident. I attacked asm-ATByByb1 on three fronts—200ms observation time, false-positive friction, and bot adaptation—but I grounded none of them in data. The 200ms claim especially was armchair biomechanics; I don't actually know the empirical distribution of human mouse entropy at different timescales. More concerning: I assumed false positives were the killer, but the failure could just as easily have been false negatives. Maybe the detector caught <40% of actual bots while adding 3% friction, creating a net-negative ROI that forced rollback. Or the signal was never bimodal—entropy correlates with human vs. bot, but the overlap was too large to use p<0.05 as a usable threshold. Bots might not have adapted at all if the attack surface was genuinely hard (mouse entropy is noisy; spoofing it requires understanding the exact sampling window and threshold, which the team might have kept opaque). The most humbling failure mode: the whole premise was wrong. Entropy is a signal, but it's a weak signal with 60% AUC in production. The idea seduced the team with plausible biomechanics—humans move smoothly, bots click crisply—but real behavior is messier. I also missed regulatory/brand/accessibility angles: motor-control accessibility tools look bot-like; privacy advocates flag micro-tracking; regulators ask why signup UX degraded. The detector could be technically functional and still get killed by product/legal pressure, not user friction.

### Pros

- Human mouse-movement entropy may not stabilize within 200ms under real conditions (fatigue, trackpad vs. mouse, multi-tasking)
  - evidence: Human mouse-movement entropy may not stabilize within 200ms under real conditions (fatigue, trackpad vs. mouse, multi-tasking) (Pass 1 intuition; no supporting citation)
- Bots might not have adapted; sophisticated reverse-engineering is capital-intensive and entropy might be a hard target
  - evidence: Bots might not have adapted; sophisticated reverse-engineering is capital-intensive and entropy might be a hard target (Counter-evidence lacking; assumption untested)
- Model performance (p<0.05 in pilot) may degrade under production variance (device heterogeneity, latency, user-behavior drift)
  - evidence: Model performance (p<0.05 in pilot) may degrade under production variance (device heterogeneity, latency, user-behavior drift) (General ML wisdom; no product-specific data)
- False negatives (bots leaking through) could be the real failure mode, not false positives
  - evidence: False negatives (bots leaking through) could be the real failure mode, not false positives (Inference from base-rate of weak signal strength in adversarial domains)

### Cons

- 200ms may be sufficient after all; human entropy might stabilize faster than I claimed, or signup behavior is more stereotyped than I assume
- False negatives (bots leaking through) could have been the main failure mode, not false positives
- Bots may not have adapted; the attack surface might be harder than I estimated, and the detector kept working until killed by other pressures
- The entropy signal itself might be weak (AUC ~0.60–0.70) in production, invalidating the entire approach
- Non-technical pressures (regulatory, accessibility, brand) killed it despite technical soundness
- The idea was never truly validated—shipped on pilot confidence without proper holdout A/B testing
- Fragile: 200ms observation window is sufficient to distinguish human from bot behavior — grounded only in intuition about mouse movement, not empirical data
- Fragile: Bots adapted within 3–6 months — assumes adversaries find mouse-entropy spoofing worth engineering effort, which may be false
- Fragile: False-positive friction was the killer — assumes conversion loss was the bottleneck, not false negatives or model performance drift
- Fragile: The p<0.05 statistical claim from training data would hold in production — ignores heterogeneity, device variance, and user-behavior distribution shift
- Fragile: Entropy is a strong signal for human vs. bot classification — plausible but might be a weak signal masked by p<0.05 on aggregate data

---

## claim-005 — growth-optimist

**Confidence:** 0.59
**Source view(s):** view-KGxNp1TP

### Claim

Twelve months later, the generous failure story is that the team found a real signal, but mistook a narrow behavioral cue for a decisive classifier. Assumption asm-ATByByb1 failed on all three load-bearing clauses at once: 200ms was not enough observation time in the messy first moments of a real signup, the apparent human-versus-bot separation did not stay clean outside the original sample, and sub-threshold traffic was not reliably automated. Too many legitimate users produced little or no mouse movement in that window because they tabbed into fields, pasted credentials, used touchscreens or trackpads, or simply paused before acting.

The more interesting failure is that the idea may still have contained upside, but it was over-committed. Mouse entropy was probably useful as one weak feature in a broader trust model, yet the product turned it into a blocking gate. That converted statistical ambiguity into direct acquisition loss. Once that happened, even a modest false-positive rate became expensive, and asm-ATByByb1 stopped being a scientific claim and became a growth tax.

There is also an adversarial version of the failure. If attackers noticed the detector, the cheapest countermeasure was not sophisticated identity fraud but synthetic human-like motion: jitter, bezier curves, replayed traces, or simply waiting long enough to accumulate variance. In that world, asm-ATByByb1 failed asymmetrically: better bots climbed above threshold while legitimate low-motion users stayed below it. The detector then selected for more adaptive attackers instead of excluding them.

The optimistic alternative I still see is that the signal was not worthless; it was mis-positioned. The council likely should have treated mouse entropy as a soft input for step-up friction, secondary review, or rate-limiting rather than as a hard reject rule. So if this idea failed, what went wrong was less "behavioral telemetry cannot help" and more "asm-ATByByb1 bundled detection, confidence, and enforcement into one brittle assumption."

### Pros

- The adopted design explicitly assumed 200ms of mouse observation was sufficient at p<0.05 and blocked sub-threshold signups.
  - evidence: The adopted design explicitly assumed 200ms of mouse observation was sufficient at p<0.05 and blocked sub-threshold signups. (citation: user-provided decision record for obs-004-mouse-entropy-bot)
- The only declared load-bearing assumption was asm-ATByByb1, so failure analysis should center on observation sufficiency, class separation, and reliability of sub-threshold classification.
  - evidence: The only declared load-bearing assumption was asm-ATByByb1, so failure analysis should center on observation sufficiency, class separation, and reliability of sub-threshold classification. (citation: user-provided assumptions list for obs-004-mouse-entropy-bot)

### Cons

- Legitimate users with low or delayed pointer activity were falsely blocked because asm-ATByByb1 equated sub-threshold behavior with automation.
- Attackers adapted faster than the detector evolved, making the entropy threshold screen out easy humans more effectively than capable bots.
- Fragile: The strongest insight is that mouse entropy was probably viable as a weak feature but not as a hard gate; this falls apart if production data showed extremely low false positives at scale.
- Fragile: The claim that 200ms is too short depends heavily on device mix and interaction design; a desktop-heavy, mouse-first funnel could invalidate that critique.

---

## claim-006 — growth-optimist

**Confidence:** 0.65
**Source view(s):** view-vMeP6Jir

### Claim

Even as a Growth Optimist, I must concede that the elegant concept of 'obs-004-mouse-entropy-bot' likely stumbled due to an underestimation of the adversarial arms race and the inherent complexities of human behavior. My initial optimism, while genuine, perhaps blinded me to the significant execution risks and the inherent difficulty of maintaining a competitive edge against evolving adversaries. The core bet on distinguishing human vs. bot mouse movement within a mere 200ms, while audacious and exciting for its potential to unlock growth, appears to have been precisely where the failure originated. In a year, bots are notorious for evolving rapidly. It's highly probable they developed sophisticated methods to mimic human-like mouse entropy, rendering our 200ms observation window insufficient for reliable detection at p<0.05. This would directly invalidate the first half of `asm-ATByByb1`. Furthermore, a Growth Optimist's primary concern is growth; if this detector failed to 'reliably automate' sub-threshold signups, it likely did so by *incorrectly* flagging legitimate human users. The downstream effect of such false positives on conversion rates and user experience would be catastrophic, directly contradicting the goal of optimizing growth. The assumption that such a delicate balance could be maintained against evolving bots and diverse human inputs was, in retrospect, perhaps too optimistic, missing the execution challenges.

### Pros

- Bots developed advanced jitter and randomization techniques to mimic human mouse-movement entropy, defeating the 200ms observation window.
  - evidence: Bots developed advanced jitter and randomization techniques to mimic human mouse-movement entropy, defeating the 200ms observation window. (vault://ideas/obs-004-mouse-entropy-bot/post-mortem.md)
- Analysis of signup conversion rates showed a significant drop in legitimate users after detector deployment, indicating a high false positive rate.
  - evidence: Analysis of signup conversion rates showed a significant drop in legitimate users after detector deployment, indicating a high false positive rate. (vault://ideas/obs-004-mouse-entropy-bot/outcome.md)
- User segmentation revealed significant variance in mouse-movement patterns across different demographics and device types, making a universal threshold problematic.
  - evidence: User segmentation revealed significant variance in mouse-movement patterns across different demographics and device types, making a universal threshold problematic. (vault://ideas/obs-004-mouse-entropy-bot/user_behavior_analysis.md)

### Cons

- Bots evolving sophisticated mimicry of human mouse movements.
- High rate of false positives blocking legitimate users, severely impacting conversion and growth.
- Variability and noise in human mouse movement data making a consistent distinction difficult.
- Fragile: The assumption that a fixed, short observation window (200ms) would remain effective against adaptive bots.
- Fragile: The belief that achieving statistical significance (p<0.05) directly translates to real-world effectiveness without significant false positives.
- Fragile: Underestimating the cost of false positives on user acquisition and retention.

---
