---
type: council_view
session_id: sess-FZggNkmK
idea_id: idea-xdCTDmou
model: claude
persona: growth-optimist
persona_name: Growth Optimist
mode: steelman
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:16b85a40aecbf074d8dd1ad662d210740ed9f94372eb54891aa670732dba1c78'
failure_reason: null
confidence: 0.52
---
## Revised stance (Pass 2)

obs-004-mouse-entropy-bot succeeded in the short term because Verdant Trust exploited an asymmetry: commodity bots (Selenium, Puppeteer, headless browsers) in 2025 didn't implement entropy spoofing, while human signup interaction inherently generates motor-control variation. For a bounded threat model—unsophisticated automation filling forms at scale—the signal was strong and effect size large enough to justify deployment. But this success is contingent on three fragile conditions that likely eroded within 12 months: (1) the entropy gap is wide enough that device/connection/accessibility variance doesn't collapse it in production, (2) attackers hadn't yet adapted with trivial jitter injection, and (3) false-positive rates on real users (especially mobile and accessibility-tool users) remained acceptably low. The assumption held because adoption likely precluded sophisticated adversaries and the bar was low-effort automation, not defense against determined actors. The team's speed-to-deploy suggests they saw adoption as a 'win enough signups without bot noise' threshold, not a cryptographic guarantee. If the idea succeeded in year 1, it probably because they kept metrics tight (monitor FPR weekly, measure bot-catch decay) and were willing to adjust thresholds. If the 12-month horizon included one attacker learning to add Gaussian noise to coordinates, the system degrades fast.

**Confidence:** 0.52

## Self-critique (Pass 2)

Pass 1 made several unjustified leaps that I should surface now. (1) I accepted the entropy signal strength without skepticism—claiming 'six to eight orders of magnitude' difference—but entropy is continuous, and overlapping distributions are common in real systems. I didn't ask for evidence that the signal survives in production across device types, connection quality, and accessibility tools. (2) I cited Stallings 1997 as if it directly validates the system, but that's 25–30-year-old lab work. I didn't surface the huge gap between controlled keystroke-dynamics research and noisy web-form signup. (3) I treated 'adoption suggests strong internal validation' as meaningful, but adoption proves organizational confidence, not empirical rigor. If the team rushed it to production without pilot studies on diverse user cohorts, we wouldn't know from the decision record. (4) I glossed over accessibility: I claimed 'even those with motor impairments retain non-zero entropy,' but some motor conditions produce low entropy, and adaptive tools (eye trackers, voice control, switch adapters) may produce near-deterministic trajectories. Real accessibility impact could be significant. (5) I underweighted adversarial durability: jitter is trivial (add Gaussian noise, done), so the system relies on obscurity. Once word spreads (and in security, it does), bots adapt. I called spoofing 'rare' but didn't seriously model the timeline for widespread adoption. (6) I didn't pressure-test the '1–2% false-positive' claim. For a system rejecting 1 in 50 legitimate signups, signup conversion loss is material. I should have asked: how was this measured? On what population? Does it hold on mobile? With assistive tech? (7) I didn't ask what 'success' actually means in the outcome corpus. Did the system reduce bot attacks? Maintain signup conversion? Avoid accessibility complaints? The prompt leaves this undefined, and I should have noted that.

## Initial stance (Pass 1)

obs-004-mouse-entropy-bot succeeded because the team identified a large, easily-detectable signal that separates human motor control from mechanical automation. The assumption held: human signup interaction generates high-entropy mouse trajectories (3-4 bits/sample) while commodity bots produce near-zero entropy (pre-computed paths, exact coordinates, constant velocity). The gap is enormous—six to eight orders of magnitude—making p<0.05 achievable with modest sample sizes. 200ms at typical polling rates (100-240Hz) yields 20-50 data points, more than enough to reliably distinguish the distributions when effect size is this large (Cohen's d >> 2). The threshold succeeds because the real threat—commodity bots, off-the-shelf Selenium/Puppeteer, headless-browser form-filling—doesn't implement mouse-jitter spoofing. Implementing entropy simulation is computationally expensive and requires domain knowledge that hasn't percolated into the attack tooling ecosystem. Real humans, even those with motor impairments, retain non-zero entropy; the threshold catches 'clearly mechanical' movement, not 'slow.' HCI literature backs the signal: mouse dynamics have been a biometric differentiator since Stallings' 1997 work. The team's adoption suggests strong internal validation. Success cascaded from low false-positive rates (~1-2%, acceptable for security), high false-negative suppression (95%+ commodity bots caught), and zero friction (invisible client-side check requiring no user interaction). The cost to attackers is high—custom bot with jitter engine is rare—while the benefit to Verdant Trust is immediate: blocking low-hanging automation without nuking signup conversion.

## Key risks

- Entropy gap assumed large; real distributions in production (mobile, accessibility, latency) may overlap more than lab settings suggest, collapsing p<0.05 claim
- Adversarial durability: jitter spoofing is computationally trivial (5 lines of code); once known (inevitable), bot false-negative rate collapses within weeks
- Accessibility false-positive risk glossed over: some motor conditions (Parkinson's, tremor) and accessibility tools (eye trackers, head-control software) produce low-entropy movement, causing real users to be rejected at signup
- No evidence of pre-deployment validation on real user populations; adoption claim does not prove internal testing happened
- Device and network variance underestimated: touchpad vs. optical mouse, 4G vs. fiber, browser input-lag buffering, and refresh-rate differences all introduce noise that may mask the signal

## Fragile insights

- Human entropy is high relative to unmodified bots, but 'high' is defined relative to commodity automation in 2025, not absolute theoretical bounds. Once jitter becomes standard, nothing distinguishes them.
- False-positive rate claim (1–2%) is the lynchpin; if real rate is 5%+, signup conversion loss is material and the system fails. No data presented to validate this.
- Stallings 1997 biometric work is 25–30 years old and lab-based; generalization to noisy real-world signup forms (especially mobile) is unvalidated.
- Adoption signals internal confidence but not empirical validation. Teams deploy for many reasons (speed, cost, political wins) independent of evidence.
- 'Zero friction' is only true if *both* false-positive and false-negative rates hold. If either moves 2–3%, the system becomes operationally painful.

## Assumptions cited

- `asm-ATByByb1`

## Metacognitive reflection

- **Could be wrong if:** Real-world entropy distributions overlap more than effect-size calculations assume (e.g., touchpad users, high-latency networks, accessibility tools produce entropy in the bot range); false-positive rate exceeds 3–5% on mobile/diverse cohorts, causing measurable signup-conversion loss; attackers learn about entropy detection within weeks and widely adopt jitter spoofing (collapsing false-negative rate from 95% to <50%); the system was deployed without rigorous pre-production testing on representative user populations; accessibility impact becomes a compliance liability.
- **Most vulnerable assumption:** `asm-ATByByb1 — the claim that 200ms observation yields p<0.05 separation. This assumes (a) entropy distributions are truly well-separated in production, (b) device/network/accessibility variance doesn't introduce noise that collapses the gap, and (c) the threshold is calibrated such that legitimate user entropy always exceeds it. No production validation data is presented. Real effect size could be much smaller (Cohen's d ≈ 0.8–1.2, not >> 2), making p<0.05 unachievable with 20–50 samples.`
- **Confidence rationale:** 0.52 reflects deep uncertainty about whether the load-bearing assumption held in production. Pass 1 claimed ~0.75 confidence based on signal strength + adoption + HCI precedent. Revised to 0.52 because (1) effect size is assumed but unvalidated, (2) device/network/accessibility noise could collapse the signal, (3) adversarial durability is fragile (jitter is trivial), (4) false-positive rate claim is unsupported, (5) no evidence of pre-deployment validation on diverse cohorts, (6) 'success' is undefined. The idea may well have worked in year 1 (commodity bots were easy targets), but its durability over 12 months depends on factors I can't verify from the record: actual FPR on mobile, bot-catch rate decay over time as attackers adapt, and user-impact metrics (did signup conversion hold?). I'm moderately confident the idea worked *initially*, but skeptical it remained effective 12 months later without active threshold tuning and threat-model updates.

## Evidence

- "Human mouse trajectories have higher entropy than deterministic bot paths (supporting evidence exists in HCI literature)" — Stallings, W. (1997).Passwordless authentication using keystroke dynamics. Security protocols workshop — but generalization to web signup forms unvalidated
- "Commodity bots (Selenium, Puppeteer) historically did not implement entropy spoofing in 2024–2025" — Observed practice; however, once the attack surface is known, adaptation is trivial and likely within weeks
- "Entropy measurement can distinguish 20–50 samples (200ms at 100–240Hz polling) with statistical significance" — Information theory suggests large effect size (Cohen's d >> 2) is needed; no real production data provided
