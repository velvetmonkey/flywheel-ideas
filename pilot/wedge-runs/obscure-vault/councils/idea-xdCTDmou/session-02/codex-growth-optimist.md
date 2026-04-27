---
type: council_view
session_id: sess-s6VpdXye
idea_id: idea-xdCTDmou
model: codex
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:778cd5f7749cea19f9948d08eae716a77f5279678c3ad4b5e6332aff7d9e5705'
failure_reason: null
confidence: 0.63
---
## Revised stance (Pass 2)

I still see why this looked attractive: it was elegant, cheap, and privacy-light. But if obs-004-mouse-entropy-bot failed 12 months later, my revised read is that Verdant Trust converted a promising signal into a blocking control before it had earned that level of authority. Assumption asm-ATByByb1 likely broke at its very first clause: 200ms was too thin a behavioral slice to support production-grade certainty.

The middle of asm-ATByByb1 likely broke too. A statistically significant separation in aggregate is not the same thing as a safe per-signup threshold in the wild. Legitimate users can arrive via touch, pen, keyboard-only, assistive tech, autofill, password managers, remote desktops, or just very direct cursor paths, so low movement is not the same as automation. My inference is that the team mistook statistical significance for operational calibration.

The tail of asm-ATByByb1 probably failed from the attacker side as well. Once the rule mattered economically, bot operators had a clear path to adaptation: add jitter, curves, pauses, imperfect targeting, or learned human-like trajectories inside the observation window. That would make sub-threshold traffic no longer reliably automated, while better bots rose above the line and honest users still ate the friction.

So I still like the ingredient, but not the product decision. Mouse entropy could have worked as a weak feature, a step-up trigger, or a ranking signal inside a broader risk model. The likely failure was not that the idea had no upside; it was that one narrow cue was promoted into a hard veto before cross-device coverage, adversarial robustness, and per-session calibration were proven.

**Confidence:** 0.63

## Self-critique (Pass 2)

Pass 1 was directionally right but too intuitive. I leaned on false-positive and adaptation stories without separating the three distinct leaps inside asm-ATByByb1: sample sufficiency, statistical validity, and operational reliability. I also underplayed the strongest counter-argument: if the signup funnel was overwhelmingly desktop and mouse-heavy, and the detector sat in front of softer fallback checks rather than acting alone, the 200ms window might have performed better than I assumed.

## Initial stance (Pass 1)

I can see why this was adopted: it promised a lightweight, privacy-preserving, client-side signal that could turn signup abuse into a tractable classification problem. If this failed 12 months later, my first read is that the elegance was real but the compression was too aggressive. The whole system leaned on one narrow behavioral cue and then promoted it from a useful hint into a blocking gate.

Assumption asm-ATByByb1 is the main break point. Two hundred milliseconds was probably not enough stable signal in production, even if it looked statistically clean in a test set. Real users arrive through trackpads, touchscreens, accessibility devices, keyboard-first flows, autofill, password managers, remote desktops, laggy browsers, and distracted partial interactions. In that world, low entropy does not reliably mean automated. The team likely mistook statistical significance in aggregate for safety to block per session, and the result was false positives on legitimate signups.

The same assumption also likely failed from the other side: bots did not stay low-entropy for long. Once the rule became economically meaningful, attackers only needed to add jitter, curves, pauses, and imperfect pixel targeting to manufacture human-looking movement inside that 200ms window. That turns the detector into a tax on honest users while better bots pass anyway. I still like the underlying instinct, but the winning version was probably to use mouse entropy as one weak feature in a broader risk model, not as a hard threshold that decided who gets to create an account.

## Key risks

- Legitimate users with little or no mouse movement were falsely blocked because low entropy was treated as bot certainty.
- Attackers adapted quickly with synthetic or jittered trajectories, collapsing the detector's precision while preserving user friction.

## Fragile insights

- The biggest error may have been turning mouse entropy from a weak risk feature into a hard block; that insight weakens if production data showed near-zero false positives on the actual device mix.

## Assumptions cited

- `asm-ATByByb1`

## Metacognitive reflection

- **Could be wrong if:** I would change my mind if Verdant Trust had production evidence showing very low false positives across desktop, touch, keyboard-only, and accessibility cohorts, plus sustained attacker failure to recover after deployment.
- **Most vulnerable assumption:** `asm-ATByByb1`
- **Confidence rationale:** Moderate confidence fits here because the assumption bundles several strong claims into one leap, and the literature supports concern about short windows, practical validity, and adversarial adaptation. The uncertainty is in the unseen production mix: a narrow desktop-only funnel could have made this detector more viable than I am inferring.

## Evidence

- "A benchmark study found mouse-dynamics error rates improved substantially with longer windows, dropping from 14.26% EER at 11 seconds to 2.64% at 110 seconds." — https://doi.org/10.1109/ICB.2012.6199780
- "A review of mouse-dynamics authentication argued that prior evaluations had limitations that raise doubts about practical real-world effectiveness." — https://doi.org/10.1145/1966913.1966983
- "A USENIX robot-detection system using client-side mouse activity reported 80% of humans were identified within 20 requests and 95% within 57 requests, indicating much slower evidence accumulation than a 200ms form window." — https://www.usenix.org/event/usenix06/tech/full_papers/park/park_html/paper.html
- "W3C Pointer Events defines a hardware-agnostic input model for mouse, pen, and touch, and touch activation can involve zero or more pointermove events depending on movement." — https://www.w3.org/TR/pointerevents3/
- "W3C accessibility guidance says web functionality should be operable through a keyboard interface, so legitimate signup paths may exist without mouse behavior at all." — https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible
- "Published work shows bots can generate human-like mouse trajectories with deep learning, and GAN-based web bots have been described as evading movement-based detection even when the defender knows the attack method." — https://doi.org/10.1109/access.2021.3111098
