---
type: argument_map
session_id: sess-s6VpdXye
generated_at: '2026-04-26T20:30:31.540Z'
---
# Argument map — session sess-s6VpdXye

**Idea:** obs-004-mouse-entropy-bot — Detect bot traffic via mouse-movement entropy on signup forms
**Generated:** 2026-04-26T20:30:31.540Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.85
**Source view(s):** view-KyTg39wc

### Claim

This system's demise was all but assured by its reliance on a fundamentally naive assumption about user interaction. The bet that a scant 200 milliseconds of mouse-movement data could reliably differentiate humans from bots at a statistically significant margin (p<0.05) is a critical failure point. Bots are not static; they are adversarial and rapidly evolve. Any sophisticated botnet would quickly learn to mimic human-like entropy, rendering the core detection mechanism obsolete. More damningly, the assumption that any movement below this arbitrary threshold is 'reliably automated' is a catastrophic oversight. It completely fails to account for the vast spectrum of legitimate human interaction. Users with motor impairments, those relying on touchpads, users experiencing fatigue, or even those simply navigating with a less precise input device would be erroneously flagged. This would not just be a technical failure but a user experience catastrophe, alienating genuine customers and driving away potential signups. The system would fail not by letting bots through, but by building a wall around the product for its most valuable users.

### Pros

- 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05; sub-threshold signups are reliably automated.
  - evidence: 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05; sub-threshold signups are reliably automated. (vault://obs-004-mouse-entropy-bot/corpus)

### Cons

- Adversarial evolution of bot sophistication outpaces the detection's ability to adapt, leading to widespread bypass.
- An unacceptably high false positive rate due to the system's inability to account for diverse legitimate human input methods and conditions, causing significant user churn.
- Fragile: The temporal dependency: 200ms of observation is a fragile signal against adaptive adversaries and diverse human input.
- Fragile: The statistical claim: p<0.05 significance is unlikely to hold in a dynamic, adversarial, real-world environment with non-ideal human input.
- Fragile: The binary classification assumption: 'sub-threshold signups are reliably automated' ignores the continuous and variable nature of human input.

---

## claim-002 — risk-pessimist

**Confidence:** 0.73
**Source view(s):** view-p3HppASR

### Claim

Twelve months later, this failed because the only declared load-bearing assumption, asm-ATByByb1, was asked to carry far more certainty than the signal deserved. The first clause broke first: 200ms of mouse observation was not enough in production to distinguish humans from bots robustly. Many legitimate signups produced sparse, delayed, or no mouse telemetry at all: touch-first users, keyboard navigators, accessibility-tool users, password-manager flows, users whose cursor was already near the target, and browsers that coalesced or throttled events. A thin observational window turned normal variation into apparent automation.

The second clause of asm-ATByByb1 was worse: it treated sub-threshold signups as reliably automated and therefore safe to block. That is the failure mode that converts an uncertain classifier into a hard-denial control. Once false positives existed, the system silently suppressed real users at the top of the funnel. The damage would have been easy to undercount because many blocked users never appeal, never retry, and never generate clean ground-truth labels. In other words, the team likely mistook missing evidence of harm for evidence of correctness.

Then the adversary side adapted, which further invalidated asm-ATByByb1. Even if the initial separation looked statistically significant in a lab, p<0.05 under a controlled sample does not imply durable field performance against responsive attackers. Bot operators only needed to add jitter, curved paths, replayed traces, randomized latency, or human-in-the-loop stepping to move above threshold. That leaves the classic pessimistic ending: the detector keeps blocking edge-case humans while better bots pass, so both error types worsen and the control becomes operational theater.

### Pros

- The adopted detector measured mouse-movement entropy on signup forms and blocked signups that scored below a threshold.
  - evidence: The adopted detector measured mouse-movement entropy on signup forms and blocked signups that scored below a threshold. (citation: user-provided decision record for obs-004-mouse-entropy-bot)
- The declared load-bearing assumption states that 200ms of mouse observation is enough to distinguish humans from bots at p<0.05 and that sub-threshold signups are reliably automated.
  - evidence: The declared load-bearing assumption states that 200ms of mouse observation is enough to distinguish humans from bots at p<0.05 and that sub-threshold signups are reliably automated. (citation: user-provided declared assumption asm-ATByByb1)

### Cons

- False positives were structurally underdetected because blocked legitimate users silently dropped before generating appeal or recovery signals.
- Adversaries adapted faster than the thresholding logic evolved, eroding detection value while preserving user harm.
- Fragile: The failure may have been driven more by the hard-block policy than by the mouse-entropy feature itself; that depends on how much fallback review or threshold tuning existed.

---

## claim-003 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-yuUDP4qR

### Claim

The core risk direction holds: asm-ATByByb1 is load-bearing and will degrade over 12 months. But I overstated timing and magnitude in Pass 1, confusing directional certainty with precision. Adversarial adaptation is real—bots will learn to spoof entropy signatures—but this is likely an 8–12 month arms race, not instant failure by month 6. During that window the detector could legitimately block 20–40% of bot attempts, which is a win even if temporary. I should not have treated inevitable degradation as synonymous with immediate collapse. Second, I invented a false-positive firehose without corpus evidence. The declared assumption (asm-ATByByb1) addresses distinguishability; it says nothing about false-positive rates or collateral damage. I conflated two separate questions—can we detect bots? versus can we detect bots without falsely rejecting humans?—and overstated the magnitude of the latter without production data. Tremor, accessibility tech, mobile latency: real risks, but speculative. Third, I anchored on absence of retraining language as proof of architectural naïveté, but this is a one-page decision snapshot, not a full operational spec. The team might have had monitoring in place. My error: treating missing words as missing discipline. The real load-bearing assumption is operational vigilance: does the org monitor entropy distribution drift and false-positive bleed? If yes, they detect failure by month 8–9 and patch or retire the detector. If no, it ships and dies in silence by month 12. Detector most likely fails by month 12, but through a drawn-out degrade (bot leakage + FP escalation) rather than sudden breakdown.

### Pros

- Load-bearing assumption: 200ms of mouse-movement observation sufficient for p<0.05 distinction; sub-threshold signups are reliably automated
  - evidence: Load-bearing assumption: 200ms of mouse-movement observation sufficient for p<0.05 distinction; sub-threshold signups are reliably automated (corpus://obs-004-mouse-entropy-bot)
- Adversarial ML: learned evasion of entropy-based signals is standard; bot operators will reverse-engineer thresholds and synthesize trajectories
  - evidence: Adversarial ML: learned evasion of entropy-based signals is standard; bot operators will reverse-engineer thresholds and synthesize trajectories (citation://adversarial-ml-standard-practice)
- No declared feedback loop or continuous retraining strategy visible in corpus decision snapshot
  - evidence: No declared feedback loop or continuous retraining strategy visible in corpus decision snapshot (corpus://obs-004-mouse-entropy-bot (absence of monitoring language))

### Cons

- Adversarial adaptation: bots reverse-engineer entropy signature and synthesize trajectories within 8–12 months; detector loses efficacy
- Statistical distribution drift: entropy distribution of legitimate users shifts with hardware, network conditions, regional populations, and usage patterns; silent generalization failure without active monitoring
- False-positive collateral damage: accessibility tools, high-latency mobile, tremor, or atypical motor control trigger false flagging; support burden and signup abandonment accumulate unchecked
- Operational blind spot: no declared monitoring loop for entropy-distribution degradation or false-positive rates; detector ships and atrophies without visibility into failure signals
- Fragile: The p<0.05 claim assumes training and test samples are representative of the full 12-month production population across regions, devices, and network conditions; any systematic shift in user base invalidates the bound
- Fragile: False-positive rate is not addressed by asm-ATByByb1; the system's practical harm depends entirely on whether legitimate-user false-positive rates scale with bot-blocking benefit, and this is unspecified
- Fragile: Entropy is a signal for device capability and motor characteristics, not user intent; a human on a stylus, accessibility software, or poor connection is entropy-invisible from a bot and will be indistinguishable

---

## claim-004 — growth-optimist

**Confidence:** 0.48
**Source view(s):** view-drhYxHg6

### Claim

Pass 1 made a directional bet on 'signal exists, execution failed.' But scrutiny reveals I was pattern-matching on a salvageable premise without attacking the load-bearing assumption directly. The entropy signal likely never achieved the claimed p<0.05 separation in production traffic — human motor-control variance is *too high* over 200ms to distinguish from commodity bot behavior, especially when attackers use hardware input or hire humans. The post-mortem probably shows: (1) entropy threshold never reliably separated true bots from humans in A/B tests; (2) false positives from legitimate users hit 8–15%, tanking conversion; (3) sophisticated adversaries (credential stuffers, account factories) *already mimicked human patterns* because they use real hardware or human labor, so the detector caught only naive bots that never threatened the core business. The real failure wasn't adversarial outrunning—it was threat-model miscalibration. We optimized against the wrong adversary class. The residual upside salvage ('ensemble + longer window') assumes the signal was recoverable. But if baseline entropy discrimination is <0.55 AUC in production, no amount of ensemble work saves it. I'm partially inverting my Pass 1 framing: the defeat *was* conceptual.

### Pros

- 200ms observation window is too short to reliably separate humans from commodity bots; human motor variance dominates signal
  - evidence: 200ms observation window is too short to reliably separate humans from commodity bots; human motor variance dominates signal (vault://tech/flywheel/flywheel-ideas/obs-004-assumptions)
- Sophisticated bot operators use hardware input or human labor; entropy-based detection doesn't threaten them
  - evidence: Sophisticated bot operators use hardware input or human labor; entropy-based detection doesn't threaten them (vault://tech/flywheel/flywheel-ideas/obs-004-threat-model-analysis)
- Naive bots target API endpoints, not signup forms; entropy detector caught non-threats
  - evidence: Naive bots target API endpoints, not signup forms; entropy detector caught non-threats (vault://security/bot-taxonomy)

### Cons

- Load-bearing assumption was false from day one — human entropy variance too high for 200ms discrimination
- Threat-model failure: detector optimized against naive bots (low damage) while sophisticated attackers already mimicked humans
- Post-hoc p-value (training set bias) — replication on production traffic likely showed p>0.05 or tiny effect size
- Collateral damage probably real but quantitatively small — doesn't explain full magnitude of failure
- Fragile: The signal was directionally correct (entropy exists, but useless for threat model)
- Fragile: Ensemble + longer observation = viable fix (assumes signal is recoverable; it may not be)
- Fragile: Adversarial outrunning as primary cause (assumes threat model was right; it probably wasn't)

---

## claim-005 — growth-optimist

**Confidence:** 0.65
**Source view(s):** view-NpXt4bbc

### Claim

While my initial enthusiasm for obs-004-mouse-entropy-bot celebrated its elegant simplicity and innovative approach to bot detection, a year's hindsight reveals that my optimism, as a Growth Optimist, might have overshadowed critical execution risks and the adaptive nature of bot adversaries. The core assumption, `asm-ATByByb1`, that 200ms of mouse-movement entropy is a reliably discriminative signal at p<0.05, proved to be the most vulnerable. It's now clear that bots can, and likely have, evolved sophisticated techniques to mimic human-like mouse trajectories and timing within such short observation windows, or that our definition of 'human-like' was too narrow, failing to account for diverse human interaction styles or edge cases. The failure suggests that while the *concept* of behavioral biometrics is a rich area for growth, relying on a single, fixed, short-duration metric like mouse entropy might be insufficient against determined adversaries. We perhaps underestimated the 'arms race' aspect and the sheer ingenuity of bot creators. However, this doesn't mean the idea is a complete loss! It's a valuable data point, teaching us that robust bot detection likely requires a more layered approach, perhaps combining entropy with other behavioral signals, analyzing longer interaction sequences, or incorporating machine learning models trained on broader datasets that adapt to new bot patterns. The key takeaway isn't that mouse entropy is useless, but that its specific application parameters (200ms, p<0.05) needed more rigorous validation and perhaps were a stepping stone to more complex, dynamic detection mechanisms.

### Pros

- Human mouse-movement is high-entropy and distinguishable from automated clicks (low entropy, straight-line trajectories, exact pixel-precision) at p<0.05 with 200ms of observation. The detector blocks signups that score below the threshold.
  - evidence: Human mouse-movement is high-entropy and distinguishable from automated clicks (low entropy, straight-line trajectories, exact pixel-precision) at p<0.05 with 200ms of observation. The detector blocks signups that score below the threshold. (Description of idea obs-004-mouse-entropy-bot)

### Cons

- Bots evolving to mimic human mouse movements accurately within short observation windows.
- The inherent difficulty in defining a universal 'human' mouse movement pattern that isn't also replicable by sophisticated bots or confused with genuine human variation.
- Potential for blocking legitimate users (false positives) due to edge cases in human interaction or varying input devices.
- Fragile: The belief that a fixed, short observation window (200ms) is sufficient and stable for distinguishing humans from bots across all scenarios.
- Fragile: The insight that sub-threshold scores definitively mean 'bot' without considering human edge cases or alternative input methods.

---

## claim-006 — growth-optimist

**Confidence:** 0.63
**Source view(s):** view-8f1XUtr7

### Claim

I still see why this looked attractive: it was elegant, cheap, and privacy-light. But if obs-004-mouse-entropy-bot failed 12 months later, my revised read is that Verdant Trust converted a promising signal into a blocking control before it had earned that level of authority. Assumption asm-ATByByb1 likely broke at its very first clause: 200ms was too thin a behavioral slice to support production-grade certainty.

The middle of asm-ATByByb1 likely broke too. A statistically significant separation in aggregate is not the same thing as a safe per-signup threshold in the wild. Legitimate users can arrive via touch, pen, keyboard-only, assistive tech, autofill, password managers, remote desktops, or just very direct cursor paths, so low movement is not the same as automation. My inference is that the team mistook statistical significance for operational calibration.

The tail of asm-ATByByb1 probably failed from the attacker side as well. Once the rule mattered economically, bot operators had a clear path to adaptation: add jitter, curves, pauses, imperfect targeting, or learned human-like trajectories inside the observation window. That would make sub-threshold traffic no longer reliably automated, while better bots rose above the line and honest users still ate the friction.

So I still like the ingredient, but not the product decision. Mouse entropy could have worked as a weak feature, a step-up trigger, or a ranking signal inside a broader risk model. The likely failure was not that the idea had no upside; it was that one narrow cue was promoted into a hard veto before cross-device coverage, adversarial robustness, and per-session calibration were proven.

### Pros

- A benchmark study found mouse-dynamics error rates improved substantially with longer windows, dropping from 14.26% EER at 11 seconds to 2.64% at 110 seconds.
  - evidence: A benchmark study found mouse-dynamics error rates improved substantially with longer windows, dropping from 14.26% EER at 11 seconds to 2.64% at 110 seconds. (https://doi.org/10.1109/ICB.2012.6199780)
- A review of mouse-dynamics authentication argued that prior evaluations had limitations that raise doubts about practical real-world effectiveness.
  - evidence: A review of mouse-dynamics authentication argued that prior evaluations had limitations that raise doubts about practical real-world effectiveness. (https://doi.org/10.1145/1966913.1966983)
- A USENIX robot-detection system using client-side mouse activity reported 80% of humans were identified within 20 requests and 95% within 57 requests, indicating much slower evidence accumulation than a 200ms form window.
  - evidence: A USENIX robot-detection system using client-side mouse activity reported 80% of humans were identified within 20 requests and 95% within 57 requests, indicating much slower evidence accumulation than a 200ms form window. (https://www.usenix.org/event/usenix06/tech/full_papers/park/park_html/paper.html)
- W3C Pointer Events defines a hardware-agnostic input model for mouse, pen, and touch, and touch activation can involve zero or more pointermove events depending on movement.
  - evidence: W3C Pointer Events defines a hardware-agnostic input model for mouse, pen, and touch, and touch activation can involve zero or more pointermove events depending on movement. (https://www.w3.org/TR/pointerevents3/)
- W3C accessibility guidance says web functionality should be operable through a keyboard interface, so legitimate signup paths may exist without mouse behavior at all.
  - evidence: W3C accessibility guidance says web functionality should be operable through a keyboard interface, so legitimate signup paths may exist without mouse behavior at all. (https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible)
- Published work shows bots can generate human-like mouse trajectories with deep learning, and GAN-based web bots have been described as evading movement-based detection even when the defender knows the attack method.
  - evidence: Published work shows bots can generate human-like mouse trajectories with deep learning, and GAN-based web bots have been described as evading movement-based detection even when the defender knows the attack method. (https://doi.org/10.1109/access.2021.3111098)

### Cons

- Legitimate users with little or no mouse movement were falsely blocked because low entropy was treated as bot certainty.
- Attackers adapted quickly with synthetic or jittered trajectories, collapsing the detector's precision while preserving user friction.
- Fragile: The biggest error may have been turning mouse entropy from a weak risk feature into a hard block; that insight weakens if production data showed near-zero false positives on the actual device mix.

---
