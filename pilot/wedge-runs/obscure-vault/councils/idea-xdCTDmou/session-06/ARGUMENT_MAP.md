---
type: argument_map
session_id: sess-3dSXUDwM
generated_at: '2026-04-26T20:51:46.753Z'
---
# Argument map — session sess-3dSXUDwM

**Idea:** obs-004-mouse-entropy-bot — Detect bot traffic via mouse-movement entropy on signup forms
**Generated:** 2026-04-26T20:51:46.753Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.48
**Source view(s):** view-aNdfirvH

### Claim

Mouse entropy remains a fragile bot signal, but my Pass 1 frame may have overstated the threat scale. The core vulnerability stands: p<0.05 statistical significance does not guarantee practical blocking fidelity, especially across device/accessibility profiles. HOWEVER, basic bot traffic (Selenium, macro tools, JavaScript-driven clicks) IS mechanically low-entropy—straight-line trajectories, pixel-perfect precision, no micro-tremors. If entropy is one signal among many (rate-limit, CAPTCHA, email verification) rather than a hard gate, the risk profile inverts: it becomes a cheap pre-filter on 95%+ of high-volume commodity bots, with fallback flows protecting accessibility users. The brief states 'blocks signups' (hard gate language), which is where my pessimism holds: a single-signal blocker will sacrifice legitimate users for marginal bot deferral. The arms race risk is real but slower than I suggested—requires adversary to reverse-engineer the metric AND invest in slow/manual entry, which undercuts the economics of mass account farming. What I under-weighted: entropy as a SCREENING signal (not verdict). What I remain pessimistic on: no mention of precision/recall data, accessibility fallbacks, or actual post-deployment fraud/churn impact in the corpus.

### Pros

- Most bot signup traffic is Selenium/macro-driven, which IS low-entropy (straight-line, precise clicks)
  - evidence: Most bot signup traffic is Selenium/macro-driven, which IS low-entropy (straight-line, precise clicks) (implicit in decision corpus; consistent with commodity bot tooling)
- p<0.05 statistical significance does not guarantee practical precision/recall or cross-device generalization
  - evidence: p<0.05 statistical significance does not guarantee practical precision/recall or cross-device generalization (standard ML/statistics; false-positive cost not disclosed in brief)
- Mouse tracking for bot detection creates GDPR/CCPA consent + compliance risk
  - evidence: Mouse tracking for bot detection creates GDPR/CCPA consent + compliance risk (regulatory liability independent of efficacy; not addressed in corpus)

### Cons

- Hard-gate entropy check (no fallback) blocks accessibility users (tremors, mobility aids, trackpad lag) at disproportionate rates
- False-positive rate on humans not disclosed; p<0.05 alone is insufficient—need precision/recall data generalized across browsers/OSes/devices
- Mouse tracking consent + privacy compliance liability (GDPR, CCPA implications not addressed in corpus)
- Once threshold pattern escapes (via captured signups or reverse-engineering), adversaries learn optimal fake trajectory; arms race begins but takes 6-18 months, not immediate
- Assumes entropy detector not combined with other signals; if used as standalone gate, churn on legitimate users may outweigh fraud reduction
- Fragile: 200ms observation window suffices for statistical significance but not practical fidelity under real-world device variance (driver timing, network jitter, touch input profiles)
- Fragile: Bulk-automation bot traffic is mechanically low-entropy, but adversaries who can afford slow/manual entry (costly but possible for high-value accounts) easily defeat entropy check
- Fragile: Confuses 'detectable difference at p<0.05' with 'reliable blocking signal'—the former is necessary, not sufficient
- Fragile: Arms race is slower than commodity bots suggest, but persistent once threshold is known; security theater risk is moderate, not immediate

---

## claim-002 — risk-pessimist

**Confidence:** 0.68
**Source view(s):** view-YiLvAnXz

### Claim

I remain negative on this as a blocking control. Assumption [asm-ATByByb1] contains two separate leaps: first, that 200ms of mouse movement is enough for a statistically meaningful separation that survives production conditions; second, that scoring below the threshold means the signup is reliably automated. I do not accept either leap at decision quality. A p<0.05 result can show sample separation and still fail operationally once browser variance, device variance, trackpads, autofill, keyboard-first behavior, accessibility tooling, and sparse interaction patterns enter the mix.

The more dangerous part of [asm-ATByByb1] is the implied exclusivity of the signal. Low-entropy movement is not bot-unique. Efficient legitimate users can produce little or no usable mouse trace in 200ms, especially if they tab into fields, paste values, rely on password managers, or barely move the pointer before submit. Because the adopted design hard-blocks rather than escalates to a secondary challenge, even modest calibration error becomes silent signup loss.

My revised view is slightly narrower, not softer: mouse entropy may be acceptable as one weak feature in a broader risk model, but it is brittle as a standalone gate. [asm-ATByByb1] still fails under adversarial adaptation because attackers can add synthetic jitter, curved paths, or replayed traces more cheaply than legitimate low-motion users can prove innocence. That asymmetry keeps the downside concentrated on real users while the control decays under pressure.

### Pros

- The adopted detector measures client-side mouse-movement entropy during signup and blocks signups that score below a threshold.
  - evidence: The adopted detector measures client-side mouse-movement entropy during signup and blocks signups that score below a threshold. (citation: obs-004-mouse-entropy-bot decision record)
- Declared assumption [asm-ATByByb1] states that 200ms of observation is enough to distinguish humans from bots at p<0.05 and that sub-threshold signups are reliably automated.
  - evidence: Declared assumption [asm-ATByByb1] states that 200ms of observation is enough to distinguish humans from bots at p<0.05 and that sub-threshold signups are reliably automated. (citation: asm-ATByByb1)

### Cons

- Legitimate signups with low, delayed, or absent mouse activity are hard-blocked, causing silent conversion loss and support burden.
- Attackers adapt with synthetic jitter or replayed human-like traces, turning the detector into a bypassable control that still creates internal false confidence.
- Fragile: My strongest objection weakens materially if real production evaluation shows negligible false positives across accessibility, autofill, keyboard-first, mobile/trackpad, and browser-diverse cohorts.
- Fragile: I may be overstating near-term attacker adaptation if the active bot population is dominated by low-effort commodity scripts.

---

## claim-003 — risk-pessimist

**Confidence:** 0.65
**Source view(s):** view-biDas75s

### Claim

The core premise of this bot detection strategy is built on a brittle foundation of optimistic assumptions about both adversarial limitations and the precision of client-side observation. While theoretically sound under controlled conditions, expecting 200 milliseconds of mouse-movement data to reliably distinguish humans from sophisticated bots at a p<0.05 threshold is a gamble. The assumption that all sub-threshold detections unequivocally point to automated activity is particularly precarious. It ignores the evolution of botting techniques designed to mimic human behavior precisely, and crucially, overlooks the high potential for false positives. Users with accessibility needs, those employing precision input devices, or even individuals experiencing lag could be unfairly flagged and blocked. This introduces significant operational risk, alienating genuine users and potentially creating only a minor inconvenience for determined attackers who will inevitably adapt. This strategy appears to be a superficial defense, assuming adversaries will remain static and users will conform to expected interaction patterns.

### Pros

- The Verdant Trust security team adopted a client-side bot detector that measures mouse-movement entropy during signup form interaction.
  - evidence: The Verdant Trust security team adopted a client-side bot detector that measures mouse-movement entropy during signup form interaction. (obs-004-mouse-entropy-bot)
- The bet: human mouse-movement is high-entropy and distinguishable from automated clicks (low entropy, straight-line trajectories, exact pixel-precision) at p<0.05 with 200ms of observation.
  - evidence: The bet: human mouse-movement is high-entropy and distinguishable from automated clicks (low entropy, straight-line trajectories, exact pixel-precision) at p<0.05 with 200ms of observation. (obs-004-mouse-entropy-bot)
- The detector blocks signups that score below the threshold.
  - evidence: The detector blocks signups that score below the threshold. (obs-004-mouse-entropy-bot)
- Load-bearing assumption: 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05; sub-threshold signups are reliably automated.
  - evidence: Load-bearing assumption: 200ms of mouse-movement observation is enough to distinguish human users from automated bots at p<0.05; sub-threshold signups are reliably automated. (obs-004-mouse-entropy-bot)

### Cons

- False Positives: Blocking legitimate human users due to input device variations, accessibility needs, or network conditions.
- Adversarial Adaptation: Bots will evolve to mimic high-entropy mouse movements or employ entirely different evasion tactics.
- Inadequate Discriminatory Power: The 200ms observation window and p<0.05 threshold may prove insufficient against advanced bots designed to simulate human interaction patterns.
- Performance & Privacy Burdens: Client-side processing can impact form performance, and the collection of detailed mouse data raises privacy concerns.
- Fragile: The assertion that sub-threshold signups are "reliably automated" is fragile. Any instance of a legitimate user being blocked due to imprecise detection (i.e., a false positive) directly invalidates the "reliably" aspect, exposing the system's weakness.

---

## claim-004 — growth-optimist

**Confidence:** 0.48
**Source view(s):** view-VHgWibws

### Claim

The 200ms entropy window is clever—I still believe mouse behavior has signal. But my Pass 1 answer dodged the hard questions and dressed up unvalidated assumptions as "reasonable hedges." I was seduced by the elegance and the promise of a "layered defense," which let me avoid owning the actual delivery risk. Here's the honest recount: First, I have no visibility into real false-positive rates. I said "1-2% is a rounding error"—but 1% of a high-volume signup funnel is hundreds of blocked humans daily. That's a leak, not noise. Second, I downplayed accessibility discrimination. Users with tremor, arthritis, or cerebral palsy will score *lower* entropy and skew blocked; users with jittery bots will score *higher*. The system likely has disparate impact against motor disabilities, and I buried that. Third, I was too sanguine about bot adaptation. Puppeteer and Playwright are not state secrets. Once this lands, every bot-as-a-service adds jitter (or a random squiggle) for 200ms and the detector becomes noise. I framed that as "future problem," which is cowardly—it's a *present* problem you're choosing to defer. The core load-bearing assumption—that 200ms observation reliably distinguishes humans from bots—rests on three embedded claims I didn't pressure-test: (1) window size is sufficient, (2) the threshold holds at p<0.05, and (3) sub-threshold means reliably automated. Claim 3 is the weakest. Entropy could be capturing tremor, age, anxiety, caffeine, or motor-control conditions—not bot/human at all. Without that data, I'm optimizing for a signal that might not exist.

### Pros

- Puppeteer and Playwright support mouse-movement jitter and delay injection (beatable in weeks)
  - evidence: Puppeteer and Playwright support mouse-movement jitter and delay injection (beatable in weeks) (https://playwright.dev/docs/api/class-mouse)
- Accessibility tools (eye trackers, switch control, speech-to-text) may produce systematically different movement entropy than hand-mouse users
  - evidence: Accessibility tools (eye trackers, switch control, speech-to-text) may produce systematically different movement entropy than hand-mouse users (vault://tech/flywheel/flywheel-ideas/obs-004-mouse-entropy-bot)

### Cons

- False-positive rate in production is >1%; system becomes conversion friction instead of fraud prevention
- Motor disabilities (arthritis, tremor, cerebral palsy, Parkinson's) systematically score low-entropy and get over-blocked; disparate-impact liability
- Bots adapt within weeks: Puppeteer/Playwright jitter defeats detector; 200ms threshold becomes beatable noise
- Entropy metric captures confounds (age, caffeine, anxiety, accessibility tools) instead of bot/human signal
- 200ms observation is too short; measurement uncertainty on trackpads and slow browsers compromises signal
- Fragile: Entropy is genuinely higher-dimensional than 'pixel-perfect clicks' and has *some* discriminative power
- Fragile: Client-side deployment avoids infrastructure debt and is hardware-agnostic
- Fragile: The assumption that humans are observably more chaotic than bots holds *in isolation*—but doesn't account for jitter-equipped bots or human motor variance

---

## claim-005 — growth-optimist

**Confidence:** 0.80
**Source view(s):** view-5qE6Jtqd

### Claim

This mouse-movement entropy detection is a truly groundbreaking concept! It offers an elegant path to fortify our defenses while simultaneously enhancing the user experience for legitimate customers. By tapping into the nuanced, inherently 'noisy' signature of human interaction, we're not just blocking bots; we're opening a fascinating new frontier for understanding user behavior and potentially uncovering deeper insights into digital anomalies. The potential for this to evolve into a cornerstone of our security strategy, paving the way for more intuitive and robust online interactions, is immense. While we must remain vigilant against evolving bot sophistication, the core principle is sound and promises a more seamless and secure digital future.

### Pros

- Client-side bot detector measures mouse-movement entropy during signup form interaction. The hypothesis is that human mouse-movement is high-entropy and distinguishable from automated clicks (low entropy, straight-line trajectories, exact pixel-precision) at p<0.05 with 200ms of observation. The detector blocks signups scoring below the threshold.
  - evidence: Client-side bot detector measures mouse-movement entropy during signup form interaction. The hypothesis is that human mouse-movement is high-entropy and distinguishable from automated clicks (low entropy, straight-line trajectories, exact pixel-precision) at p<0.05 with 200ms of observation. The detector blocks signups scoring below the threshold. (Corpus description of Idea: obs-004-mouse-entropy-bot)

### Cons

- Adversarial bots evolving to convincingly mimic high-entropy mouse movements.
- Potential for false positives affecting legitimate users with atypical input methods or motor impairments.
- The 200ms observation window might be insufficient to reliably distinguish humans from advanced bots, or conversely, may inconvenience legitimate users with very rapid, direct interactions.
- Fragile: The potential for this to become a foundational element in our security strategy is massive (relies entirely on the robustness of the entropy measurement and the stated assumption).
- Fragile: We could even explore variations for identifying other types of non-human interaction or even user intent (this broader vision is contingent on the success of the core detection mechanism).

---

## claim-006 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-JiUeJowg

### Claim

I still like the strategic instinct behind this decision. A cheap behavioral signal at the top of the funnel can be a very leveraged anti-abuse move, and there is real upside in forcing low-end bots to do more work before they can mass-create accounts. As a growth-optimist read, the idea has product value if it turns passive interaction data into a cost-imposing filter.

But I still attack asm-ATByByb1 on its first clause: 200ms being enough to distinguish humans from bots at p<0.05 is not the same thing as having a production-safe classifier. Statistical separability over a tiny observation window may be real, yet still fail to generalize cleanly across browsers, device types, hurried users, accessibility tooling, or users who barely move the cursor before clicking. The brief does not show that the 200ms slice is robust across those cohorts.

I also attack asm-ATByByb1 on its second clause: saying sub-threshold signups are reliably automated is the bigger leap. That converts a noisy interaction feature into a hard identity conclusion. Some legitimate users will have sparse or unusually direct motion, while capable bots can add curvature, jitter, hesitation, and pixel imperfection once this heuristic becomes economically important to evade.

So my revised stance is: the mechanism is promising, the hard block is the fragile part. I would back mouse-entropy as a ranking feature, or as a trigger for stepped friction like email verification, delayed activation, or secondary checks. The strongest counter-argument I underplayed in Pass 1 is that this detector may not need to be perfect to be valuable; if desktop-only validation shows low false positives and durable attacker-cost lift, I would become materially more supportive.

### Pros

- The adopted control is a client-side detector that measures mouse-movement entropy during signup and blocks signups below a threshold.
  - evidence: The adopted control is a client-side detector that measures mouse-movement entropy during signup and blocks signups below a threshold. (citation: user-provided decision brief for obs-004-mouse-entropy-bot)
- Declared assumption asm-ATByByb1 asserts both that 200ms is enough for statistical distinction at p<0.05 and that sub-threshold signups are reliably automated.
  - evidence: Declared assumption asm-ATByByb1 asserts both that 200ms is enough for statistical distinction at p<0.05 and that sub-threshold signups are reliably automated. (citation: declared assumption asm-ATByByb1 in the user-provided corpus excerpt)
- The brief provides the claim and policy choice, but no explicit cohort breakdown, false-positive rate, or adversarial-resilience result.
  - evidence: The brief provides the claim and policy choice, but no explicit cohort breakdown, false-positive rate, or adversarial-resilience result. (citation: inference from the contents of the user-provided decision excerpt)

### Cons

- Hard-blocking on a brittle cursor signal can suppress legitimate signups in edge cohorts or fast, low-motion user sessions.
- Attackers can adapt by synthesizing human-like mouse traces, eroding the detector's standalone value.
- Fragile: The best value of this idea may be attacker-cost imposition rather than binary bot attribution.
- Fragile: If the deployment scope is narrowly desktop-web with strong labels, the 200ms signal could perform materially better than the broad assumption wording suggests.

---
