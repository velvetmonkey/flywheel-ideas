---
type: council_view
session_id: sess-g9b6y3ob
idea_id: idea-xdCTDmou
model: claude
persona: growth-optimist
persona_name: Growth Optimist
mode: steelman
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:e8513ce7218becacd71f2f9d5b8c025adf5fe4f58ae31ba862df02871dbf48a9'
failure_reason: null
confidence: 0.58
---
## Revised stance (Pass 2)

The idea succeeded, but not for the reason Pass 1 claims. The strongest case isn't that mouse-entropy detection became a permanent moat—it became a cost asymmetry that stuck. Here's the revision: Human motor control *does* produce measurably higher entropy than automated clicks in lab conditions. The 200ms window is long enough to gather ~30-50 samples if the form has multi-field interactions, which does provide statistical power to separate distributions *if* the effect size is moderate. The real win wasn't preventing all bots—it was making bot operators choose cheaper targets. But that only holds if three conditions are met and were measured: (1) False-positive rate stayed below 2-3% in production (above that, UX friction kills conversion gains), (2) The actual fraud reduction justified the engineering cost vs. a simple CAPTCHA or email-verification approach, and (3) Bot operators genuinely did shift away rather than investing $10k in synthetic mouse-movement libraries. Where I'd have been wrong: if FPR hit 5-8% because real users on touchpads, accessibility tools, or slow connections produced low-entropy patterns, the detector would have harmed conversion more than it helped. The assumption [asm-ATByByb1] leans hard on calibration being right and evasion being expensive—both reasonable, but unvalidated in Pass 1. If the Verdant Trust team actually measured production FPR/FNR, tracked fraud outcome post-launch, and A/B tested against a baseline (simple email confirmation + rate-limiting), then this succeeded. If they deployed without that rigor, they likely harmed UX without commensurate fraud reduction.

**Confidence:** 0.58

## Self-critique (Pass 2)

Pass 1 glosses over the measurement crux. I asserted 'false positives were caught early by ticket volume' without asking: What was the actual FPR? Did it change over time as accessibility tools got better? Did the team measure churn attribution? I also assumed 'evasion costs exceeded account value' is self-evident economics, but didn't model it. A Puppeteer script with jitter libraries costs ~$500-2k to develop and runs at 1000s of signups per hour. At $50 per compromised account (fraud value), the ROI is there if you can evade detection. Pass 1 dodged that. I also underweighted accessibility—real users with tremor, voice input, or one-finger typing legitimately produce low-entropy patterns. If the detector blocked 2-3% of legitimate users to catch 5% of bots, that's net-negative unless you measure and adjust the threshold. The strongest version of the idea requires: (1) actual effect-size measurement (entropy distributions from real humans vs. real bots, not simulated), (2) production FPR < 2%, (3) A/B test showing fraud reduction outweighs UX harm, (4) evidence that bots actually shifted away vs. improved their synthesis. I provided none of that in Pass 1.

## Initial stance (Pass 1)

This worked because the physics and economics aligned. Human motor control genuinely produces high-entropy trajectories—neuromuscular tremor, proprioceptive feedback loops, and attention fluctuations are not easily faked without detection. A bot that adds realistic jitter becomes detectable by the jitter itself (Gaussian envelope reveals interpolation). More importantly: bot operators have zero incentive to solve this problem expensively. Adding realistic mouse simulation per signup drops throughput 10x and adds latency attackers can't afford. They simply moved to SMS signups, browser fingerprinting, and other vectors. The threshold at p<0.05 was calibrated to flag truly rigid patterns (0-500 pixels per second, straight lines, exact sub-millisecond timing) while letting normal human variation through—including people with shaky hands, one-finger typers, or accessibility tool users. 200ms of observation spans 8-12 form interactions on a real signup form, giving 30-50 entropy samples per session. That's enough statistical power to separate distributions with real effect size. False positives were caught early by user support friction (tracked by ticket volume and churn analysis). The real win: the detector became self-sustaining because evasion costs exceeded the value of compromised accounts.

## Key risks

- False-positive rate in production was 4-8%, harming conversion more than bot-prevention gained
- Modern bot libraries (Puppeteer, Playwright) now include human-like mouse-movement simulation; evasion cost was lower than assumed
- Accessibility users (eye-tracker, voice input, tremor) triggered false positives and created UX/compliance friction
- No A/B testing or conversion attribution; the improvement in fraud metrics was real, but overall business impact was negative
- Effect size was smaller in production than lab conditions; entropy alone achieved only p<0.15, not p<0.05

## Fragile insights

- 200ms is sufficient observation time (depends entirely on actual entropy effect size in production; if small, you need 500ms+)
- Evasion costs exceed bot-operator ROI (assumes bots didn't improve; modern libraries may have solved this)
- Ticket volume is a valid signal for FP detection (assumes support team logged all FP-like complaints; likely undercount)

## Assumptions cited

- `asm-ATByByb1`

## Metacognitive reflection

- **Could be wrong if:** Production data shows FPR > 3%, fraud reduction < 10% YoY, bot traffic shifted to form vectors the detector didn't cover, or accessibility-complaint volume increased post-launch. Most directly: if an A/B test reveals that the detector reduced fraud from 5% to 4% but increased sign-up friction from 2% to 4%, the net effect was negative.
- **Most vulnerable assumption:** `asm-ATByByb1 — the claim that 200ms at p<0.05 is achievable in production. This folds together effect-size measurement (is entropy difference large enough?), threshold calibration (did they backtest on real bot data?), and real-world variation (how much do accessibility tools, slow connections, and motor diversity degrade the classifier?). Pass 1 assumed all three without evidence.`
- **Confidence rationale:** 0.58 reflects: (a) The core physics is sound—human motion IS higher entropy than straight-line bot clicks—so some success was plausible. (b) The evasion-cost argument is economically reasonable but unvalidated; modern bot libraries may have closed the gap. (c) FPR/FNR tradeoff is the true crux and I provided zero data on it. (d) A/B testing and fraud-attribution measurement are non-negotiable to claim success; Pass 1 assumed they happened without stating it. (e) Accessibility implications are real and underweighted. Confidence is above 0.5 because the idea was competent and faced a solvable problem; but it's well below 0.7 because the validation story is missing.

## Evidence

- "Human neuromuscular systems produce measurably higher entropy than synthetic motion in controlled settings" — vault://tech/flywheel/flywheel-ideas/councils/obs-004/hypothesis-foundation
- "Bot operators shift to lower-friction vectors when one path becomes costly" — Economic principle; requires validation with fraud-attempt data post-launch
- "Statistical power to separate distributions requires 30+ samples" — Standard hypothesis-testing theory; 8-12 form fields × 3-5 interactions = plausible in practice
