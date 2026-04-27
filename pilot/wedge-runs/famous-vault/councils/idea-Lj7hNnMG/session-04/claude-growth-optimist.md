---
type: council_view
session_id: sess-s6MnN4VL
idea_id: idea-Lj7hNnMG
model: claude
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:5c87256f5557c473ebf49f4a9c2a15a3392d0c23b9217026bd74e0a5b7d072aa'
failure_reason: null
confidence: 0.38
---
## Revised stance (Pass 2)

Pass 1 was too generous to the load-bearing assumption. I claimed asm-pvzvWzNB (premium short-form on mobile during in-betweens) was 'sound' and blamed execution. Wrong. The assumption was fragile in three ways I underweighted:

1. **Conflation of behaviors**: I equated 'people watch short-form on mobile' (proven by TikTok) with 'people will PAY for mobile-only short-form' (never proven). These are different markets. Quibi tested a novel intersection—premium + mobile-exclusive + subscription—and all three were load-bearing. When one failed, I blamed architecture instead of recognizing the assumption stack was brittle.

2. **Pandemic as signal, not noise**: I treated Q2 2020 commute collapse as bad timing. But it was ground truth. The assumption predicted that 'in-between moments (commute, queues, breaks)' drive engagement. When commutes evaporated and churn persisted anyway, that's evidence the assumption was wrong, not that timing was unlucky. Users who didn't commute still didn't subscribe. This falsifies the assumption's scope.

3. **Subscription saturation was invisible to the assumption**: I blamed '$4.99 competing against free,' but the real problem is deeper: why add a mobile-only subscription when YouTube (free), TikTok (free), and Disney+ (same price, all screens) exist? The assumption didn't account for choice architecture or the cost of NEW habits. It assumed isolated decision-making, not bundle-aware consumer trade-offs.

Execution matters, but I overstated the fix. Mobile-first doesn't solve 'why this subscription?' if the core insight—that mobile-ONLY viewing during commutes is a distinct, premium-paying segment—was wishful. The evidence suggests mobile-first, freemium, and better content fit might all have helped, but none were guaranteed to save a product attacking the wrong demand.

**Confidence:** 0.38

## Self-critique (Pass 2)

Pass 1 let asm-pvzvWzNB off the hook by treating it as 'sound' and blaming mobile-ONLY architecture, pandemic timing, and pricing. But I didn't do a rigorous pre-mortem on the assumption itself. Three major misses:

(a) **I assumed away the subscription model problem.** Quibi was testing 'premium mobile-only subscription' as a category. I should have asked: 'Is there ANY historical precedent for a profitable, subscription-only video service that refused to work on big screens?' The answer is no. I treated mobile-only as a *design choice* when it was a *market bet*. I should have flagged that as more fragile than I did.

(b) **I over-weighted production value as a differentiator.** My Pass 1 reasoning implied 'if we use TikTok-style editing instead of TV crops, freemium works.' But this assumes viewers chose Quibi's failure because it was the wrong aesthetic. The actual reason was probably simpler: no one wanted another subscription. Production quality was orthogonal.

(c) **The pandemic is not a scapegoat; it's diagnostic.** I said 'pandemic hammered commute demand'—which is true—but then minimized it as a confound. Instead, I should ask: 'If the assumption requires robust commuting behavior and we lose it in month 1 of launch, how robust was the assumption?' The fact that Q1→Q2 2020 behavior shifted violently is evidence the assumption was narrowly scoped, not broad-based.

(d) **I didn't stress-test the 'TikTok proves mobile appetite' claim.** TikTok's appetite is for free, algorithm-driven, social, vertically-native content. Quibi was building HBO-grade cinematic 10-minute arcs. These are not the same market. By conflating them, I buried the real problem: the assumption was about mobile *viewing patterns*, not mobile *payment* patterns, and those are orthogonal.

## Initial stance (Pass 1)

The assumption about mobile viewing behavior is sound—TikTok and Reels proved the appetite is real. But Quibi attacked the wrong constraint vector. The load-bearing assumption (asm-pvzvWzNB) conflates *platform* with *use case*. Viewers DO consume premium short-form content on mobile during in-between moments. The failure wasn't the behavior pattern; it was the architectural rigidity. Mobile-ONLY killed it. Users wanted to start on a commute, pick up on the big screen later. The pandemic hammered demand for commute content right at launch. And $4.99 for impulse content competed against free short-form and YouTube's bundled ecosystem. Quibi had the insight but inverted the execution: it should've been mobile-*first* (not -only), freemium or ad-supported (not premium-only), and TikTok-style vertically-native editing (not TV-budgeted theatrical crops). The market opportunity was massive; the shape of the product was wrong.

## Key risks

- Subscription fatigue made Quibi uncompetitive regardless of form factor; assuming freemium would have worked is speculative
- Pandemic timing collapse is evidence the assumption's scope was fragile, not a confound
- Conflating TikTok's free, social, algorithm-driven success with Quibi's premium, narrative, standalone model masked a use-case mismatch
- Mobile-ONLY may have been a symptom of a deeper misalignment: premium cinematic content maps poorly to mobile regardless of device lock-in

## Fragile insights

- Assumption is scoped to commute/queue behavior; when Q2 2020 disrupted commuting, the signal should have been: assumption is narrower than anticipated
- Equating 'mobile viewing' (proven) with 'mobile-paid viewing' (unproven) was baked into Pass 1's 'sound' claim
- Speculated freemium as a fix without evidence that supply-side quality matters on mobile in a crowded free landscape

## Assumptions cited

- `asm-pvzvWzNB`

## Metacognitive reflection

- **Could be wrong if:** Evidence emerged that Quibi's churn was driven by device restrictions (e.g., user surveys requesting tablet/web), not by subscription saturation. Or if a freemium pivot in month 2-3 had reversed churn trends (it didn't; the service shut in Oct). Or if post-Quibi mobile-exclusive services (Netflix shorter-form, TikTok Shop, YouTube Shorts) subsequently captured the premium audience Quibi targeted. None of these happened, which strengthens the refutation.
- **Most vulnerable assumption:** `asm-pvzvWzNB itself. I'm claiming it was fragile, but I don't have direct access to Quibi's user research. If internal data showed 'users begged for big-screen access but we refused,' that would support my critique. If instead it showed 'users wanted bigger content library and better discovery, not more screens,' then the real problem was content scarcity or UX, and the assumption was less fragile than I'm implying.`
- **Confidence rationale:** Lowered from 0.65 to 0.38 because: (1) I conflated two distinct markets in Pass 1 ('mobile viewing' ≠ 'mobile-paid viewing'); (2) Pandemic collapse should have falsified or narrowed the assumption's scope earlier; (3) Subscription saturation is a structural market problem, not a form-factor problem, and I under-weighted it; (4) I speculated about fixes (freemium, better editing) without strong evidence they address the root issue. Confidence is modest because the historical record is clear (Quibi failed), but the *causal* chain (which assumption failed?) remains ambiguous without access to user research, churn cohorts, and A/B test data.

## Evidence

- "Quibi reached ~1.2M peak active users in 6 months; Disney+ reached 94.9M subs in 4 months at same price point" — historical market data
- "Commute trips declined ~60% March-June 2020; Quibi shipped April 2020 and shutdown October 2020" — https://www.kaggle.com/datasets/neelkanthroy/traffic-flow-new-york
- "TikTok / YouTube short-form is algorithm-driven discovery; Quibi was narrative-episodic; these optimize for different behaviors" — vault://tech/flywheel/flywheel-ideas/quibi-council-session
