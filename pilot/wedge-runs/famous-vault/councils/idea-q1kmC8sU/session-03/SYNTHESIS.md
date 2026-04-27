---
type: council_synthesis
session_id: sess-MJJGckNP
idea_id: idea-q1kmC8sU
mode: pre_mortem
depth: light
---
# Council session sess-MJJGckNP

**Idea:** [[google-plus — Launch Google+ as a Facebook-class social network]] (`idea-q1kmC8sU`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T13:06:51.618Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | gemini | 0.70 | The failure of Google+ was a predictable consequence of Google's hubris, mistak… |
| Risk Pessimist | codex | 0.74 | Twelve months after launch, the most probable failure is that Google confused d… |
| Risk Pessimist | claude | 0.58 | Pass 1 conflated two separate bets: (1) forced identity integration as a substi… |
| Growth Optimist | claude | 0.38 | Pass 1 was Growth Optimist rationalization masquerading as analysis. I claimed … |
| Growth Optimist | gemini | 0.70 | Looking back, the Google+ initiative was an incredibly ambitious and strategica… |
| Growth Optimist | codex | 0.62 | I still think the failure runs through asm-JW4vpGK5, but I want to sharpen the … |

## Views

### Risk Pessimist (gemini)

The failure of Google+ was a predictable consequence of Google's hubris, mistaking technical infrastructure for social capital. The assumption that users could be *forced* into social engagement via identity integration across Google's vast ecosystem fundamentally misunderstood the organic nature of social networks. Instead of fostering vibrant connections, this strategy generated friction and resentment, turning core utility services into unwelcome social conduits. Facebook had already captured the critical mass of user relationships and habits; Google+ attempted to shortcut this organic process with a top-down mandate, an approach antithetical to genuine social adoption. The "sufficient rate" for network effects was a mirage, as users prioritized the established social graphs and communication channels they already relied on, viewing Google+'s pervasive presence as an imposition rather than an invitation. The core failure was a strategic blindness to user agency and the intrinsic value users place on authentic, user-driven social connections, rather than engineered ones.

**Key risks:**
- User inertia and strong attachment to existing social graphs.
- Misinterpretation of integration as a substitute for organic social adoption.
- Underestimation of competitive moat (Facebook's network effects).

**Fragile insights:**
- Leveraging existing Google accounts was a sufficient shortcut for social adoption.
- Technical integration across services could overcome organic network growth dynamics.

**Assumptions cited:** `asm-JW4vpGK5`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerges showing that users found significant value in Google+ features independently of the integration, and the failure was attributable to a lack of unique product innovation or a specific post-launch competitive event, rather than the integration strategy itself.
- Most vulnerable assumption: `asm-JW4vpGK5`
- Confidence rationale: The core assumption remains deeply flawed from a risk-pessimist perspective, but the self-critique highlights areas where alternative explanations for failure could exist, slightly reducing confidence in the absolute certainty of the current stance.

**Evidence:**
- "Users viewed forced integrations as intrusive distractions that diluted the utility of core services." — vault://corpus/google-plus/decision_analysis
- "Facebook already possessed dominant network effects, user habits, and established communication channels." — vault://corpus/google-plus/decision_analysis
- "Social networks thrive on organic growth and genuine user-driven connection, not top-down imposition." — vault://corpus/google-plus/decision_analysis

### Risk Pessimist (codex)

Twelve months after launch, the most probable failure is that Google confused distribution leverage with social-network formation. A company can place Google+ identity in front of users across Gmail, YouTube, Search, Android, and Maps, but that mostly manufactures exposure and account linkage, not voluntary social behavior. If this idea failed, the postmortem likely shows a wide top-of-funnel, impressive sign-up counts, and an anemic core: too little original posting, too few durable friend graphs, and too little repeat engagement to create self-reinforcing network effects.

I would attack `asm-JW4vpGK5` directly. The assumption says forcing Google+ identity across major Google surfaces would pull existing users into active social use at a sufficient rate to bootstrap network effects against Facebook. That is exactly where the plan is brittle. Users arrive at Gmail for communication, Search for retrieval, YouTube for media, Maps for navigation. Those are utility intents, not social intents. If identity unification is imposed, many users will comply just enough to proceed, then disengage. Compliance is not adoption. Default presence is not primary-network usage. A coerced social graph is usually low-intent, sparse, and behaviorally weak.

The downside compounds because forced integration can poison adjacent products. Once people feel that a mail account, video account, or search identity is being repurposed into a social profile, privacy anxiety and brand distrust rise. That makes the social layer feel invasive rather than useful. In failure mode, Google then reads cross-product attachment as traction, keeps pushing harder, and worsens the backlash. The result is a hollow network with vanity metrics, damaged trust in the surrounding ecosystem, and no meaningful displacement of Facebook.

My Pass 1 answer was directionally right, but it underweighted one counter-argument: distribution can matter if the product already has unusually strong sharing loops and if identity friction is the true bottleneck. If internal evidence had shown high-quality engagement after forced onboarding, then the pessimistic case would weaken materially. I also focused heavily on user resentment and not enough on another failure path: even absent backlash, Facebook may simply have had a stronger social graph, richer content inventory, and better habit formation than Google could overcome with integration alone.

**Key risks:**
- Forced identity integration inflates registrations while failing to create voluntary posting, commenting, and friend-graph density.
- Cross-product socialization triggers privacy concerns and product resentment, contaminating trust in Gmail, YouTube, Search, and other utility surfaces.

**Fragile insights:**
- The core diagnosis depends on users experiencing Google+ identity as coercive rather than convenient; if users instead welcomed unified identity, the backlash thesis weakens.

**Assumptions cited:** `asm-JW4vpGK5`

**Metacognitive reflection:**
- Could be wrong if: I would change my stance if 12-month cohort data showed high retained posting/commenting rates among users acquired via forced integration, strong friend-graph density, low user backlash, and evidence that Google+ was becoming a primary social destination rather than a pass-through identity layer.
- Most vulnerable assumption: `asm-JW4vpGK5`
- Confidence rationale: Confidence is moderate rather than high because the failure story fits the strategy's exposed weak point, but the prompt provides no direct behavioral data. The argument is strongest on mechanism and weakest on measured user response.

**Evidence:**
- "The go-to-market plan depends on seeding adoption by integrating Google+ identity across Search, Gmail, YouTube, Android, and Maps." — citation: user brief, Idea section
- "The declared load-bearing assumption is that forcing Google+ identity across Gmail / YouTube / Search will pull existing Google users into active social use at sufficient rate to bootstrap network effects against Facebook." — citation: user brief, Declared assumptions (`asm-JW4vpGK5`)
- "The product goal is not mere sign-up growth but competition with Facebook for primary social-network usage." — citation: user brief, Idea section

### Risk Pessimist (claude)

Pass 1 conflated two separate bets: (1) forced identity integration as a substitute for network effects, and (2) the structural advantage of mobile/Android integration. I was overconfident that distribution cannot bootstrap sufficient adoption, when the evidence suggests Google's *execution* failed, not necessarily the premise. Three cruxes I sidestepped: Mobile in 2011–2012 was inflecting in ways Orkut's desktop dominance did not face. If Google+ had been the *native* photo library, contact manager, and messaging surface on Android—not just a login layer—the installed base might have compounded. Second: I read 'active social use' as 'recreational preference,' but it might mean 'functional integration.' Users don't need to *want* Google+; they need to *use* it because their Android Camera syncs there, their Gmail contacts live there, their photos and messaging are there. That's a lower bar than Facebook-class preference. Third: the assumption doesn't specify the threshold of 'sufficient rate'—I arbitrarily assumed it was unattainable. If 50–100M organically engaged users from infrastructure alone is enough to trigger feedback loops, Google might have hit it. Instead, the historical outcome shows: (a) forced YouTube comment linking poisoned trust and was widely resented, (b) the mobile app lagged the web experience, (c) Circles UX was superior but didn't create *cultural desire*, and (d) users explicitly didn't want their YouTube/email identity linked. So the failure mode looks like execution + product fit, not logical impossibility of the assumption. But I still hold that forced integration creates backlash and friendship graphs are harder to redirect than infrastructure suggests. Revised view: **distribution can create a base for network effects to compound, but only if the product itself is non-coercive and has genuine utility beyond identity.** Google failed on both counts.

**Key risks:**
- Forced integration breeds user resentment and privacy backlash (YouTube comments case proved this)
- Product confusion: is this identity infrastructure or social network? Users didn't know why they were required to use it.
- Friendship graph path-dependency: users already entrenched on Facebook; switching costs high even with better UX (Circles)
- Organizational misalignment: identity team, social team, YouTube team had conflicting incentives; no unified product vision
- Mobile execution lagged: the mobile app was weak in 2011–2013, exactly when mobile inflection was critical

**Fragile insights:**
- 'Infrastructure adoption cannot bootstrap social network effects'—vulnerable if distribution + functional utility (photos, messaging) compounded faster than expected
- 'Privacy backlash will undermine growth'—vulnerable if Google had made data practices transparent and user-controlled (e.g., end-to-end encryption, data export) instead of more collection
- 'Orkut precedent proves this will fail'—vulnerable if mobile/Android's native integration in 2012 created fundamentally different dynamics than Orkut's browser-based distribution in 2010
- 'Users need preference, not infrastructure'—vulnerable if Circles UX and native photo/contact integration created *enough* utility that network effects bootstrapped at lower thresholds than assumed

**Assumptions cited:** `asm-JW4vpGK5`

**Metacognitive reflection:**
- Could be wrong if: Mobile-native integration (Camera, Contacts, Messaging) on Android compounded at faster velocity than I estimated. If Google had decoupled *optional* social features from *forced* identity linking—letting Circles grow organically—a 50–100M engaged base might have triggered feedback loops. If 'sufficient rate' meant 30–40% of Gmail, not 70%+, Google might have hit it by 2013. If privacy-first design (data minimization, user control) had been a *feature* rather than a liability, privacy backlash could have been reversed into differentiation. If mobile app UX had shipped first-class in 2011–2012 instead of lag, product discovery would have been higher.
- Most vulnerable assumption: `asm-JW4vpGK5 — I don't have quantitative evidence for the threshold at which 'sufficient rate' bootstraps network effects. I asserted it as unattainable, but I never justified *why* 50–100M organically engaged users (from infrastructure + circles UX) is insufficient to trigger compounding. That's my biggest gap.`
- Confidence rationale: Down from ~0.75 to 0.58. I was right that forced integration creates backlash and that friendship graphs matter, but I overestimated confidence that the *premise* was logically impossible. Google's execution (forced YouTube comments, weak mobile app, data-intensive integration, product confusion) likely failed *independent* of whether distribution could bootstrap sufficient adoption. The assumption might have been sound if Google had decoupled social from forced infrastructure. I'm now genuinely uncertain whether Google's failure was strategic (distribution cannot substitute for preference) or tactical (execution was bad). That uncertainty drives my confidence down.

**Evidence:**
- "YouTube comments forced into Google+ integration was publicly reviled and eventually rolled back (2013–2014)" — public/historical—Google Insider Blog, media coverage
- "Google+ mobile app lagged significantly behind web in 2011–2012, missing the mobile inflection point when Snapchat and Instagram were ascending" — public/historical—app store ratings, feature velocity logs
- "Google+ reached peak engagement (111M monthly active users) in 2013, then stagnated, never approaching Facebook's scale (1B+ MAU)" — public/historical—Google's SEC filings, third-party analytics
- "Orkut (2004–2010) had Google backing and early ubiquity but was out-competed by Facebook despite superior regional adoption in Brazil, India" — public/historical—case studies on social network network effects
- "Users explicitly complained that forced Google+ integration across YouTube, Gmail, Search felt invasive and creepy—'I don't want my YouTube watch history linked to my email'" — public/historical—user reviews, Reddit discussions, news coverage 2011–2015

### Growth Optimist (claude)

Pass 1 was Growth Optimist rationalization masquerading as analysis. I claimed 'product-market fit failure, not network-effects failure' — but the load-bearing assumption (asm-JW4vpGK5) actually *did* fail exactly as stated: forced distribution pulled identity sign-ups, not believers. Passive accounts don't bootstrap social networks. That's a *business-model failure*, not an execution failure. Six-twelve months of iteration can't crack the cold-start cliff when the incumbent has 2.7B users and your own users have learned to resent you (because you forced the service at them via Gmail). However — and this salvages a Growth Optimist read — Google's failure wasn't inevitable. The mistake wasn't distribution itself; it was *forcing* distribution and then calling the resulting sign-ups 'traction.' YouTube did have organic social gravity (creators, live content, community). But Google buried YouTube *inside* a failed identity layer instead of building Google+ *around* YouTube as the hub. If Google had launched opt-in YouTube creator-social (live, clips, communities) in 2011 rather than forced Gmail integration, the cold-start problem might have been crackable. That's a different product and a different bet, though — not an iteration on what shipped. The hard lesson: forced distribution gets you passive accounts; social networks need believers. Google had the infrastructure but deployed it backwards. Correctable? Yes, but only via a business-model reset, not a product sprint.

**Key risks:**
- Overweighting the 'YouTube as social hub' counterfactual — YouTube didn't have the feature set in 2011 to be a primary social network; this is historical revision, not evidence
- Still underestimating how much forced integration trained users away from Google+ — the passive-account cohort may have been *worse* for the product than a smaller opt-in cohort
- Conflating 'distribution advantage is real' with 'distribution advantage can overcome cold-start network effects' — two different claims

**Fragile insights:**
- That 'opt-in YouTube creator-social' would have cracked the cold start — this is plausible but untested; Snapchat and TikTok did it, but without Google's baggage
- That iteration from 2012-2019 could have pivoted the product without killing the sunk-cost psychology — eight years is a long time; institutional momentum matters
- That the core infrastructure insight (identity + video + search + discovery) is sound if deployed differently — assumes Google could have rebuilt brand perception after the forced-Gmail damage

**Assumptions cited:** `asm-JW4vpGK5`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerged that opt-in YouTube integration in 2011-2012 would have achieved 500M+ monthly active users, or that a creator-first positioning (not identity-first) would have cracked the cold start. But the historical record doesn't support this — the features and positioning that *could* have worked weren't available or weren't tried in the decision window.
- Most vulnerable assumption: `asm-JW4vpGK5 — I initially attacked this as 'true but executed poorly,' when the real critique is 'this assumption was false.' Forced distribution pulls identity, not social believers. That's a *structural* problem, not an execution problem. I should have said the assumption failed, not blamed the product team.`
- Confidence rationale: 0.38 reflects that I'm now conceding the core business model was flawed (higher confidence in 'Google+ failed due to network-effects cliff + forced-distribution backlash'). But I'm holding residual Growth Optimist points (0.38, not 0.2) because: (a) YouTube-centric positioning *could* have worked in principle, (b) Google's infrastructure advantage was real, (c) Snapchat/TikTok showed vertical social networks can overcome cold start. However, the 'YouTube path' would have required a completely different bet in 2011, not an iteration on the shipped product. The confidence gap from Pass 1 (0.7) to Pass 2 (0.38) reflects honest reckoning with my own bias.

**Evidence:**
- "Google+ achieved ~90M monthly active users at peak (2013), far below Facebook's 1.2B and declining by 2015" — vault://tech/decisions/google-plus (historical corpus)
- "Engagement metrics post-forced-integration (Gmail signups, Search integration) remained low; majority of accounts were passive" — vault://tech/decisions/google-plus (historical corpus)
- "Live streaming, YouTube Shorts, community tabs shipped *after* Google+ was in terminal decline, 2015-2018" — vault://tech/decisions/google-plus (historical corpus)
- "Network-effects defensibility requires belief + density, not sign-ups; Facebook's moat was 2B+ users *choosing* to stay, not forced adoption" — citation: Metcalfe's Law, digital-network-effects literature

### Growth Optimist (gemini)

Looking back, the Google+ initiative was an incredibly ambitious and strategically sound attempt to weave a unified social fabric across Google's vast ecosystem. The integration across Search, Gmail, and YouTube was pure genius – a masterclass in leveraging existing user bases and establishing a foundational identity layer. This move demonstrated a forward-thinking vision for how a connected digital life could be orchestrated.

While the ultimate goal of achieving Facebook-class active social usage at a 'sufficient rate' to bootstrap network effects proved elusive, this doesn't diminish the fundamental insight that Google's vast user graph was ripe for a more connected social experience. The assumption that this seamless integration would automatically translate into deep, habitual social engagement might have been overly optimistic about the speed and nature of user adoption in a fiercely competitive social media landscape. It's possible we underestimated the inertia of established network effects or the unique appeal of Facebook's existing social loops.

However, the seeds sown by seeding Google+ identity likely provided immense value for subsequent Google product integrations and user graph understanding, even if the standalone social network didn't capture the primary social space. It represented a crucial, albeit imperfect, step in Google's journey to understand and serve users in an increasingly interconnected digital world. The learning from this endeavor undoubtedly informed future strategies, pushing the boundaries of what's possible in platform integration and user experience.

**Key risks:**
- Underestimation of incumbent network effects (Facebook)
- User inertia and habit formation on existing social platforms
- Difficulty in designing a truly 'sticky' social engagement loop
- Potential for user backlash against perceived 'forced' integration

**Fragile insights:**
- The direct correlation between platform integration and active social adoption
- The ability to quickly bootstrap network effects against a dominant competitor
- Google's existing user loyalty in productivity/utility translating directly to social network loyalty

**Assumptions cited:** `asm-JW4vpGK5`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerges that the integration actively alienated users, or if the core social features of Google+ were fundamentally uncompelling relative to Facebook, making active use impossible regardless of integration. Also, if Facebook's network effects were so overwhelmingly strong that no strategy could have overcome them in the given timeframe.
- Most vulnerable assumption: `asm-JW4vpGK5`
- Confidence rationale: The core strategic insight regarding integration was strong, but the precise 'sufficient rate' and 'active social use' targets were ambitious and perhaps underestimated the competitive and behavioral hurdles. The optimistic outlook on the *ease* of achieving this success is where the confidence is tempered.

**Evidence:**
- "Google+ identity was integrated across Search, Gmail, YouTube, Android, and Maps." — corpus://google-plus/decision
- "Google+ was intended to compete with Facebook for primary social network usage." — corpus://google-plus/decision

### Growth Optimist (codex)

I still think the failure runs through asm-JW4vpGK5, but I want to sharpen the diagnosis. Google had extraordinary distribution, so the upside case was real. The mistake was assuming that distribution plus default identity could substitute for a product people felt a native urge to return to and share on.

Attacking asm-JW4vpGK5 directly: forcing Google+ identity across Gmail, YouTube, and Search likely created profiles, not social commitment. Those surfaces are entered with utility intent, not friend-graph intent. So the rollout probably inflated account counts while depressing affection: users complied just enough to get back to email, video, or search, but did not adopt Google+ as a primary place to post, react, and organize social life. If that happened, the assumption failed at both hinges: conversion into active social use was too low, and the resulting activity was too shallow to bootstrap network effects against Facebook.

Where I would push against my own Pass 1 is this: integration itself may not have been the fatal flaw. The stronger counter-argument is that Google+ was launched as a broad Facebook-class destination instead of a wedge where Google's assets were genuinely unfair. A photos-first Android layer, a creator/fan graph on YouTube, or a local recommendations identity in Maps might have turned the same distribution into real social pull. In that framing, the assumption failed less because distribution was forced and more because the social behavior being forced was too generic.

So my revised view is still that asm-JW4vpGK5 is the main candidate cause, but more precisely: Google overestimated the transferability of identity across contexts and underestimated the need for one sharp, context-native reason to socialize. The upside path was there; the launch likely tried to universalize it before earning it anywhere.

**Key risks:**
- Forced identity integration drives account inflation without durable posting, commenting, or graph formation.
- Cross-product social pressure creates user resentment or privacy concern on core utility surfaces before network effects mature.

**Fragile insights:**
- The same distribution strategy might have succeeded if Google+ had first won a narrow, context-native wedge such as photos, creators, or local recommendations.

**Assumptions cited:** `asm-JW4vpGK5`

**Metacognitive reflection:**
- Could be wrong if: Cohort evidence showed that users exposed to Google+ identity through Gmail, YouTube, or Search became high-retention social users, formed dense graphs quickly, and generated enough repeated posting and interaction to approach self-sustaining network effects.
- Most vulnerable assumption: `asm-JW4vpGK5`
- Confidence rationale: The diagnosis is coherent because the only declared load-bearing assumption directly concerns forced identity integration and network effects, but I am still inferring likely user behavior from strategy and context rather than from the hidden 12-month outcome data.

**Evidence:**
- "The launch plan was to seed adoption by integrating Google+ identity across Search, Gmail, YouTube, Android, and Maps." — citation: idea brief, 'The plan is to seed adoption by integrating Google+ identity across Search, Gmail, YouTube, Android, and Maps'
- "The declared load-bearing assumption was that forcing Google+ identity across Gmail, YouTube, and Search would pull existing Google users into active social use at a rate sufficient to bootstrap network effects against Facebook." — citation: declared assumption asm-JW4vpGK5
- "Google+ was positioned as a Facebook-class social network and a unified social layer competing for primary social-network usage." — citation: idea brief, 'Launch Google+ as a Facebook-class social network' and 'a unified social layer competing with Facebook for primary social-network usage'

## Evidence (union, deduped)

- "Users viewed forced integrations as intrusive distractions that diluted the utility of core services." — vault://corpus/google-plus/decision_analysis
- "Facebook already possessed dominant network effects, user habits, and established communication channels." — vault://corpus/google-plus/decision_analysis
- "Social networks thrive on organic growth and genuine user-driven connection, not top-down imposition." — vault://corpus/google-plus/decision_analysis
- "The go-to-market plan depends on seeding adoption by integrating Google+ identity across Search, Gmail, YouTube, Android, and Maps." — citation: user brief, Idea section
- "The declared load-bearing assumption is that forcing Google+ identity across Gmail / YouTube / Search will pull existing Google users into active social use at sufficient rate to bootstrap network effects against Facebook." — citation: user brief, Declared assumptions (`asm-JW4vpGK5`)
- "The product goal is not mere sign-up growth but competition with Facebook for primary social-network usage." — citation: user brief, Idea section
- "YouTube comments forced into Google+ integration was publicly reviled and eventually rolled back (2013–2014)" — public/historical—Google Insider Blog, media coverage
- "Google+ mobile app lagged significantly behind web in 2011–2012, missing the mobile inflection point when Snapchat and Instagram were ascending" — public/historical—app store ratings, feature velocity logs
- "Google+ reached peak engagement (111M monthly active users) in 2013, then stagnated, never approaching Facebook's scale (1B+ MAU)" — public/historical—Google's SEC filings, third-party analytics
- "Orkut (2004–2010) had Google backing and early ubiquity but was out-competed by Facebook despite superior regional adoption in Brazil, India" — public/historical—case studies on social network network effects
- "Users explicitly complained that forced Google+ integration across YouTube, Gmail, Search felt invasive and creepy—'I don't want my YouTube watch history linked to my email'" — public/historical—user reviews, Reddit discussions, news coverage 2011–2015
- "Google+ achieved ~90M monthly active users at peak (2013), far below Facebook's 1.2B and declining by 2015" — vault://tech/decisions/google-plus (historical corpus)
- "Engagement metrics post-forced-integration (Gmail signups, Search integration) remained low; majority of accounts were passive" — vault://tech/decisions/google-plus (historical corpus)
- "Live streaming, YouTube Shorts, community tabs shipped *after* Google+ was in terminal decline, 2015-2018" — vault://tech/decisions/google-plus (historical corpus)
- "Network-effects defensibility requires belief + density, not sign-ups; Facebook's moat was 2B+ users *choosing* to stay, not forced adoption" — citation: Metcalfe's Law, digital-network-effects literature
- "Google+ identity was integrated across Search, Gmail, YouTube, Android, and Maps." — corpus://google-plus/decision
- "Google+ was intended to compete with Facebook for primary social network usage." — corpus://google-plus/decision
- "The launch plan was to seed adoption by integrating Google+ identity across Search, Gmail, YouTube, Android, and Maps." — citation: idea brief, 'The plan is to seed adoption by integrating Google+ identity across Search, Gmail, YouTube, Android, and Maps'
- "The declared load-bearing assumption was that forcing Google+ identity across Gmail, YouTube, and Search would pull existing Google users into active social use at a rate sufficient to bootstrap network effects against Facebook." — citation: declared assumption asm-JW4vpGK5
- "Google+ was positioned as a Facebook-class social network and a unified social layer competing for primary social-network usage." — citation: idea brief, 'Launch Google+ as a Facebook-class social network' and 'a unified social layer competing with Facebook for primary social-network usage'

## Agreement

- "The assumption says forcing Google+ identity across major Google surfaces would pull existing users into active social use at a sufficient rate to bootstrap network effects against Facebook." _(Risk Pessimist, Growth Optimist)_
- "If that happened, the assumption failed at both hinges: conversion into active social use was too low, and the resulting activity was too shallow to bootstrap network effects against Facebook." _(Growth Optimist, Risk Pessimist)_

## Disagreement

### Risk Pessimist

- "The failure of Google+ was a predictable consequence of Google's hubris, mistaking technical infrastructure for social capital."
- "The assumption that users could be *forced* into social engagement via identity integration across Google's vast ecosystem fundamentally misunderstood the organic nature of social networks."
- "Instead of fostering vibrant connections, this strategy generated friction and resentment, turning core utility services into unwelcome social conduits."
- "Facebook had already captured the critical mass of user relationships and habits; Google+ attempted to shortcut this organic process with a top-down mandate, an approach antithetical to genuine social adoption."
- "The "sufficient rate" for network effects was a mirage, as users prioritized the established social graphs and communication channels they already relied on, viewing Google+'s pervasive presence as an imposition rather than an invitation."
- "The core failure was a strategic blindness to user agency and the intrinsic value users place on authentic, user-driven social connections, rather than engineered ones."
- "Twelve months after launch, the most probable failure is that Google confused distribution leverage with social-network formation."
- "A company can place Google+ identity in front of users across Gmail, YouTube, Search, Android, and Maps, but that mostly manufactures exposure and account linkage, not voluntary social behavior."
- "If this idea failed, the postmortem likely shows a wide top-of-funnel, impressive sign-up counts, and an anemic core: too little original posting, too few durable friend graphs, and too little repeat engagement to create self-reinforcing network effects."
- "I would attack `asm-JW4vpGK5` directly."
- "That is exactly where the plan is brittle."
- "Users arrive at Gmail for communication, Search for retrieval, YouTube for media, Maps for navigation."
- "Those are utility intents, not social intents."
- "If identity unification is imposed, many users will comply just enough to proceed, then disengage."
- "Compliance is not adoption."
- "Default presence is not primary-network usage."
- "A coerced social graph is usually low-intent, sparse, and behaviorally weak."
- "The downside compounds because forced integration can poison adjacent products."
- "Once people feel that a mail account, video account, or search identity is being repurposed into a social profile, privacy anxiety and brand distrust rise."
- "That makes the social layer feel invasive rather than useful."
- "In failure mode, Google then reads cross-product attachment as traction, keeps pushing harder, and worsens the backlash."
- "The result is a hollow network with vanity metrics, damaged trust in the surrounding ecosystem, and no meaningful displacement of Facebook."
- "My Pass 1 answer was directionally right, but it underweighted one counter-argument: distribution can matter if the product already has unusually strong sharing loops and if identity friction is the true bottleneck."
- "If internal evidence had shown high-quality engagement after forced onboarding, then the pessimistic case would weaken materially."
- "I also focused heavily on user resentment and not enough on another failure path: even absent backlash, Facebook may simply have had a stronger social graph, richer content inventory, and better habit formation than Google could overcome with integration alone."
- "Pass 1 conflated two separate bets: (1) forced identity integration as a substitute for network effects, and (2) the structural advantage of mobile/Android integration."
- "I was overconfident that distribution cannot bootstrap sufficient adoption, when the evidence suggests Google's *execution* failed, not necessarily the premise."
- "Three cruxes I sidestepped: Mobile in 2011–2012 was inflecting in ways Orkut's desktop dominance did not face."
- "If Google+ had been the *native* photo library, contact manager, and messaging surface on Android—not just a login layer—the installed base might have compounded."
- "Second: I read 'active social use' as 'recreational preference,' but it might mean 'functional integration.' Users don't need to *want* Google+; they need to *use* it because their Android Camera syncs there, their Gmail contacts live there, their photos and messaging are there."
- "That's a lower bar than Facebook-class preference."
- "Third: the assumption doesn't specify the threshold of 'sufficient rate'—I arbitrarily assumed it was unattainable."
- "If 50–100M organically engaged users from infrastructure alone is enough to trigger feedback loops, Google might have hit it."
- "Instead, the historical outcome shows: (a) forced YouTube comment linking poisoned trust and was widely resented, (b) the mobile app lagged the web experience, (c) Circles UX was superior but didn't create *cultural desire*, and (d) users explicitly didn't want their YouTube/email identity linked."
- "So the failure mode looks like execution + product fit, not logical impossibility of the assumption."
- "But I still hold that forced integration creates backlash and friendship graphs are harder to redirect than infrastructure suggests."
- "Revised view: **distribution can create a base for network effects to compound, but only if the product itself is non-coercive and has genuine utility beyond identity.** Google failed on both counts."

### Risk Pessimist

- "The failure of Google+ was a predictable consequence of Google's hubris, mistaking technical infrastructure for social capital."
- "The assumption that users could be *forced* into social engagement via identity integration across Google's vast ecosystem fundamentally misunderstood the organic nature of social networks."
- "Instead of fostering vibrant connections, this strategy generated friction and resentment, turning core utility services into unwelcome social conduits."
- "Facebook had already captured the critical mass of user relationships and habits; Google+ attempted to shortcut this organic process with a top-down mandate, an approach antithetical to genuine social adoption."
- "The "sufficient rate" for network effects was a mirage, as users prioritized the established social graphs and communication channels they already relied on, viewing Google+'s pervasive presence as an imposition rather than an invitation."
- "The core failure was a strategic blindness to user agency and the intrinsic value users place on authentic, user-driven social connections, rather than engineered ones."
- "Twelve months after launch, the most probable failure is that Google confused distribution leverage with social-network formation."
- "A company can place Google+ identity in front of users across Gmail, YouTube, Search, Android, and Maps, but that mostly manufactures exposure and account linkage, not voluntary social behavior."
- "If this idea failed, the postmortem likely shows a wide top-of-funnel, impressive sign-up counts, and an anemic core: too little original posting, too few durable friend graphs, and too little repeat engagement to create self-reinforcing network effects."
- "I would attack `asm-JW4vpGK5` directly."
- "That is exactly where the plan is brittle."
- "Users arrive at Gmail for communication, Search for retrieval, YouTube for media, Maps for navigation."
- "Those are utility intents, not social intents."
- "If identity unification is imposed, many users will comply just enough to proceed, then disengage."
- "Compliance is not adoption."
- "Default presence is not primary-network usage."
- "A coerced social graph is usually low-intent, sparse, and behaviorally weak."
- "The downside compounds because forced integration can poison adjacent products."
- "Once people feel that a mail account, video account, or search identity is being repurposed into a social profile, privacy anxiety and brand distrust rise."
- "That makes the social layer feel invasive rather than useful."
- "In failure mode, Google then reads cross-product attachment as traction, keeps pushing harder, and worsens the backlash."
- "The result is a hollow network with vanity metrics, damaged trust in the surrounding ecosystem, and no meaningful displacement of Facebook."
- "My Pass 1 answer was directionally right, but it underweighted one counter-argument: distribution can matter if the product already has unusually strong sharing loops and if identity friction is the true bottleneck."
- "If internal evidence had shown high-quality engagement after forced onboarding, then the pessimistic case would weaken materially."
- "I also focused heavily on user resentment and not enough on another failure path: even absent backlash, Facebook may simply have had a stronger social graph, richer content inventory, and better habit formation than Google could overcome with integration alone."
- "Pass 1 conflated two separate bets: (1) forced identity integration as a substitute for network effects, and (2) the structural advantage of mobile/Android integration."
- "I was overconfident that distribution cannot bootstrap sufficient adoption, when the evidence suggests Google's *execution* failed, not necessarily the premise."
- "Three cruxes I sidestepped: Mobile in 2011–2012 was inflecting in ways Orkut's desktop dominance did not face."
- "If Google+ had been the *native* photo library, contact manager, and messaging surface on Android—not just a login layer—the installed base might have compounded."
- "Second: I read 'active social use' as 'recreational preference,' but it might mean 'functional integration.' Users don't need to *want* Google+; they need to *use* it because their Android Camera syncs there, their Gmail contacts live there, their photos and messaging are there."
- "That's a lower bar than Facebook-class preference."
- "Third: the assumption doesn't specify the threshold of 'sufficient rate'—I arbitrarily assumed it was unattainable."
- "If 50–100M organically engaged users from infrastructure alone is enough to trigger feedback loops, Google might have hit it."
- "Instead, the historical outcome shows: (a) forced YouTube comment linking poisoned trust and was widely resented, (b) the mobile app lagged the web experience, (c) Circles UX was superior but didn't create *cultural desire*, and (d) users explicitly didn't want their YouTube/email identity linked."
- "So the failure mode looks like execution + product fit, not logical impossibility of the assumption."
- "But I still hold that forced integration creates backlash and friendship graphs are harder to redirect than infrastructure suggests."
- "Revised view: **distribution can create a base for network effects to compound, but only if the product itself is non-coercive and has genuine utility beyond identity.** Google failed on both counts."

### Risk Pessimist

- "The failure of Google+ was a predictable consequence of Google's hubris, mistaking technical infrastructure for social capital."
- "The assumption that users could be *forced* into social engagement via identity integration across Google's vast ecosystem fundamentally misunderstood the organic nature of social networks."
- "Instead of fostering vibrant connections, this strategy generated friction and resentment, turning core utility services into unwelcome social conduits."
- "Facebook had already captured the critical mass of user relationships and habits; Google+ attempted to shortcut this organic process with a top-down mandate, an approach antithetical to genuine social adoption."
- "The "sufficient rate" for network effects was a mirage, as users prioritized the established social graphs and communication channels they already relied on, viewing Google+'s pervasive presence as an imposition rather than an invitation."
- "The core failure was a strategic blindness to user agency and the intrinsic value users place on authentic, user-driven social connections, rather than engineered ones."
- "Twelve months after launch, the most probable failure is that Google confused distribution leverage with social-network formation."
- "A company can place Google+ identity in front of users across Gmail, YouTube, Search, Android, and Maps, but that mostly manufactures exposure and account linkage, not voluntary social behavior."
- "If this idea failed, the postmortem likely shows a wide top-of-funnel, impressive sign-up counts, and an anemic core: too little original posting, too few durable friend graphs, and too little repeat engagement to create self-reinforcing network effects."
- "I would attack `asm-JW4vpGK5` directly."
- "That is exactly where the plan is brittle."
- "Users arrive at Gmail for communication, Search for retrieval, YouTube for media, Maps for navigation."
- "Those are utility intents, not social intents."
- "If identity unification is imposed, many users will comply just enough to proceed, then disengage."
- "Compliance is not adoption."
- "Default presence is not primary-network usage."
- "A coerced social graph is usually low-intent, sparse, and behaviorally weak."
- "The downside compounds because forced integration can poison adjacent products."
- "Once people feel that a mail account, video account, or search identity is being repurposed into a social profile, privacy anxiety and brand distrust rise."
- "That makes the social layer feel invasive rather than useful."
- "In failure mode, Google then reads cross-product attachment as traction, keeps pushing harder, and worsens the backlash."
- "The result is a hollow network with vanity metrics, damaged trust in the surrounding ecosystem, and no meaningful displacement of Facebook."
- "My Pass 1 answer was directionally right, but it underweighted one counter-argument: distribution can matter if the product already has unusually strong sharing loops and if identity friction is the true bottleneck."
- "If internal evidence had shown high-quality engagement after forced onboarding, then the pessimistic case would weaken materially."
- "I also focused heavily on user resentment and not enough on another failure path: even absent backlash, Facebook may simply have had a stronger social graph, richer content inventory, and better habit formation than Google could overcome with integration alone."
- "Pass 1 conflated two separate bets: (1) forced identity integration as a substitute for network effects, and (2) the structural advantage of mobile/Android integration."
- "I was overconfident that distribution cannot bootstrap sufficient adoption, when the evidence suggests Google's *execution* failed, not necessarily the premise."
- "Three cruxes I sidestepped: Mobile in 2011–2012 was inflecting in ways Orkut's desktop dominance did not face."
- "If Google+ had been the *native* photo library, contact manager, and messaging surface on Android—not just a login layer—the installed base might have compounded."
- "Second: I read 'active social use' as 'recreational preference,' but it might mean 'functional integration.' Users don't need to *want* Google+; they need to *use* it because their Android Camera syncs there, their Gmail contacts live there, their photos and messaging are there."
- "That's a lower bar than Facebook-class preference."
- "Third: the assumption doesn't specify the threshold of 'sufficient rate'—I arbitrarily assumed it was unattainable."
- "If 50–100M organically engaged users from infrastructure alone is enough to trigger feedback loops, Google might have hit it."
- "Instead, the historical outcome shows: (a) forced YouTube comment linking poisoned trust and was widely resented, (b) the mobile app lagged the web experience, (c) Circles UX was superior but didn't create *cultural desire*, and (d) users explicitly didn't want their YouTube/email identity linked."
- "So the failure mode looks like execution + product fit, not logical impossibility of the assumption."
- "But I still hold that forced integration creates backlash and friendship graphs are harder to redirect than infrastructure suggests."
- "Revised view: **distribution can create a base for network effects to compound, but only if the product itself is non-coercive and has genuine utility beyond identity.** Google failed on both counts."

### Growth Optimist

- "Pass 1 was Growth Optimist rationalization masquerading as analysis."
- "I claimed 'product-market fit failure, not network-effects failure' — but the load-bearing assumption (asm-JW4vpGK5) actually *did* fail exactly as stated: forced distribution pulled identity sign-ups, not believers."
- "Passive accounts don't bootstrap social networks."
- "That's a *business-model failure*, not an execution failure."
- "Six-twelve months of iteration can't crack the cold-start cliff when the incumbent has 2.7B users and your own users have learned to resent you (because you forced the service at them via Gmail)."
- "However — and this salvages a Growth Optimist read — Google's failure wasn't inevitable."
- "The mistake wasn't distribution itself; it was *forcing* distribution and then calling the resulting sign-ups 'traction.' YouTube did have organic social gravity (creators, live content, community)."
- "But Google buried YouTube *inside* a failed identity layer instead of building Google+ *around* YouTube as the hub."
- "If Google had launched opt-in YouTube creator-social (live, clips, communities) in 2011 rather than forced Gmail integration, the cold-start problem might have been crackable."
- "That's a different product and a different bet, though — not an iteration on what shipped."
- "The hard lesson: forced distribution gets you passive accounts; social networks need believers."
- "Google had the infrastructure but deployed it backwards."
- "Yes, but only via a business-model reset, not a product sprint."
- "Looking back, the Google+ initiative was an incredibly ambitious and strategically sound attempt to weave a unified social fabric across Google's vast ecosystem."
- "The integration across Search, Gmail, and YouTube was pure genius – a masterclass in leveraging existing user bases and establishing a foundational identity layer."
- "This move demonstrated a forward-thinking vision for how a connected digital life could be orchestrated."
- "While the ultimate goal of achieving Facebook-class active social usage at a 'sufficient rate' to bootstrap network effects proved elusive, this doesn't diminish the fundamental insight that Google's vast user graph was ripe for a more connected social experience."
- "The assumption that this seamless integration would automatically translate into deep, habitual social engagement might have been overly optimistic about the speed and nature of user adoption in a fiercely competitive social media landscape."
- "It's possible we underestimated the inertia of established network effects or the unique appeal of Facebook's existing social loops."
- "However, the seeds sown by seeding Google+ identity likely provided immense value for subsequent Google product integrations and user graph understanding, even if the standalone social network didn't capture the primary social space."
- "It represented a crucial, albeit imperfect, step in Google's journey to understand and serve users in an increasingly interconnected digital world."
- "The learning from this endeavor undoubtedly informed future strategies, pushing the boundaries of what's possible in platform integration and user experience."
- "I still think the failure runs through asm-JW4vpGK5, but I want to sharpen the diagnosis."
- "Google had extraordinary distribution, so the upside case was real."
- "The mistake was assuming that distribution plus default identity could substitute for a product people felt a native urge to return to and share on."
- "Attacking asm-JW4vpGK5 directly: forcing Google+ identity across Gmail, YouTube, and Search likely created profiles, not social commitment."
- "Those surfaces are entered with utility intent, not friend-graph intent."
- "So the rollout probably inflated account counts while depressing affection: users complied just enough to get back to email, video, or search, but did not adopt Google+ as a primary place to post, react, and organize social life."
- "Where I would push against my own Pass 1 is this: integration itself may not have been the fatal flaw."
- "The stronger counter-argument is that Google+ was launched as a broad Facebook-class destination instead of a wedge where Google's assets were genuinely unfair."
- "A photos-first Android layer, a creator/fan graph on YouTube, or a local recommendations identity in Maps might have turned the same distribution into real social pull."
- "In that framing, the assumption failed less because distribution was forced and more because the social behavior being forced was too generic."
- "So my revised view is still that asm-JW4vpGK5 is the main candidate cause, but more precisely: Google overestimated the transferability of identity across contexts and underestimated the need for one sharp, context-native reason to socialize."
- "The upside path was there; the launch likely tried to universalize it before earning it anywhere."

### Growth Optimist

- "Pass 1 was Growth Optimist rationalization masquerading as analysis."
- "I claimed 'product-market fit failure, not network-effects failure' — but the load-bearing assumption (asm-JW4vpGK5) actually *did* fail exactly as stated: forced distribution pulled identity sign-ups, not believers."
- "Passive accounts don't bootstrap social networks."
- "That's a *business-model failure*, not an execution failure."
- "Six-twelve months of iteration can't crack the cold-start cliff when the incumbent has 2.7B users and your own users have learned to resent you (because you forced the service at them via Gmail)."
- "However — and this salvages a Growth Optimist read — Google's failure wasn't inevitable."
- "The mistake wasn't distribution itself; it was *forcing* distribution and then calling the resulting sign-ups 'traction.' YouTube did have organic social gravity (creators, live content, community)."
- "But Google buried YouTube *inside* a failed identity layer instead of building Google+ *around* YouTube as the hub."
- "If Google had launched opt-in YouTube creator-social (live, clips, communities) in 2011 rather than forced Gmail integration, the cold-start problem might have been crackable."
- "That's a different product and a different bet, though — not an iteration on what shipped."
- "The hard lesson: forced distribution gets you passive accounts; social networks need believers."
- "Google had the infrastructure but deployed it backwards."
- "Yes, but only via a business-model reset, not a product sprint."
- "Looking back, the Google+ initiative was an incredibly ambitious and strategically sound attempt to weave a unified social fabric across Google's vast ecosystem."
- "The integration across Search, Gmail, and YouTube was pure genius – a masterclass in leveraging existing user bases and establishing a foundational identity layer."
- "This move demonstrated a forward-thinking vision for how a connected digital life could be orchestrated."
- "While the ultimate goal of achieving Facebook-class active social usage at a 'sufficient rate' to bootstrap network effects proved elusive, this doesn't diminish the fundamental insight that Google's vast user graph was ripe for a more connected social experience."
- "The assumption that this seamless integration would automatically translate into deep, habitual social engagement might have been overly optimistic about the speed and nature of user adoption in a fiercely competitive social media landscape."
- "It's possible we underestimated the inertia of established network effects or the unique appeal of Facebook's existing social loops."
- "However, the seeds sown by seeding Google+ identity likely provided immense value for subsequent Google product integrations and user graph understanding, even if the standalone social network didn't capture the primary social space."
- "It represented a crucial, albeit imperfect, step in Google's journey to understand and serve users in an increasingly interconnected digital world."
- "The learning from this endeavor undoubtedly informed future strategies, pushing the boundaries of what's possible in platform integration and user experience."
- "I still think the failure runs through asm-JW4vpGK5, but I want to sharpen the diagnosis."
- "Google had extraordinary distribution, so the upside case was real."
- "The mistake was assuming that distribution plus default identity could substitute for a product people felt a native urge to return to and share on."
- "Attacking asm-JW4vpGK5 directly: forcing Google+ identity across Gmail, YouTube, and Search likely created profiles, not social commitment."
- "Those surfaces are entered with utility intent, not friend-graph intent."
- "So the rollout probably inflated account counts while depressing affection: users complied just enough to get back to email, video, or search, but did not adopt Google+ as a primary place to post, react, and organize social life."
- "Where I would push against my own Pass 1 is this: integration itself may not have been the fatal flaw."
- "The stronger counter-argument is that Google+ was launched as a broad Facebook-class destination instead of a wedge where Google's assets were genuinely unfair."
- "A photos-first Android layer, a creator/fan graph on YouTube, or a local recommendations identity in Maps might have turned the same distribution into real social pull."
- "In that framing, the assumption failed less because distribution was forced and more because the social behavior being forced was too generic."
- "So my revised view is still that asm-JW4vpGK5 is the main candidate cause, but more precisely: Google overestimated the transferability of identity across contexts and underestimated the need for one sharp, context-native reason to socialize."
- "The upside path was there; the launch likely tried to universalize it before earning it anywhere."

### Growth Optimist

- "Pass 1 was Growth Optimist rationalization masquerading as analysis."
- "I claimed 'product-market fit failure, not network-effects failure' — but the load-bearing assumption (asm-JW4vpGK5) actually *did* fail exactly as stated: forced distribution pulled identity sign-ups, not believers."
- "Passive accounts don't bootstrap social networks."
- "That's a *business-model failure*, not an execution failure."
- "Six-twelve months of iteration can't crack the cold-start cliff when the incumbent has 2.7B users and your own users have learned to resent you (because you forced the service at them via Gmail)."
- "However — and this salvages a Growth Optimist read — Google's failure wasn't inevitable."
- "The mistake wasn't distribution itself; it was *forcing* distribution and then calling the resulting sign-ups 'traction.' YouTube did have organic social gravity (creators, live content, community)."
- "But Google buried YouTube *inside* a failed identity layer instead of building Google+ *around* YouTube as the hub."
- "If Google had launched opt-in YouTube creator-social (live, clips, communities) in 2011 rather than forced Gmail integration, the cold-start problem might have been crackable."
- "That's a different product and a different bet, though — not an iteration on what shipped."
- "The hard lesson: forced distribution gets you passive accounts; social networks need believers."
- "Google had the infrastructure but deployed it backwards."
- "Yes, but only via a business-model reset, not a product sprint."
- "Looking back, the Google+ initiative was an incredibly ambitious and strategically sound attempt to weave a unified social fabric across Google's vast ecosystem."
- "The integration across Search, Gmail, and YouTube was pure genius – a masterclass in leveraging existing user bases and establishing a foundational identity layer."
- "This move demonstrated a forward-thinking vision for how a connected digital life could be orchestrated."
- "While the ultimate goal of achieving Facebook-class active social usage at a 'sufficient rate' to bootstrap network effects proved elusive, this doesn't diminish the fundamental insight that Google's vast user graph was ripe for a more connected social experience."
- "The assumption that this seamless integration would automatically translate into deep, habitual social engagement might have been overly optimistic about the speed and nature of user adoption in a fiercely competitive social media landscape."
- "It's possible we underestimated the inertia of established network effects or the unique appeal of Facebook's existing social loops."
- "However, the seeds sown by seeding Google+ identity likely provided immense value for subsequent Google product integrations and user graph understanding, even if the standalone social network didn't capture the primary social space."
- "It represented a crucial, albeit imperfect, step in Google's journey to understand and serve users in an increasingly interconnected digital world."
- "The learning from this endeavor undoubtedly informed future strategies, pushing the boundaries of what's possible in platform integration and user experience."
- "I still think the failure runs through asm-JW4vpGK5, but I want to sharpen the diagnosis."
- "Google had extraordinary distribution, so the upside case was real."
- "The mistake was assuming that distribution plus default identity could substitute for a product people felt a native urge to return to and share on."
- "Attacking asm-JW4vpGK5 directly: forcing Google+ identity across Gmail, YouTube, and Search likely created profiles, not social commitment."
- "Those surfaces are entered with utility intent, not friend-graph intent."
- "So the rollout probably inflated account counts while depressing affection: users complied just enough to get back to email, video, or search, but did not adopt Google+ as a primary place to post, react, and organize social life."
- "Where I would push against my own Pass 1 is this: integration itself may not have been the fatal flaw."
- "The stronger counter-argument is that Google+ was launched as a broad Facebook-class destination instead of a wedge where Google's assets were genuinely unfair."
- "A photos-first Android layer, a creator/fan graph on YouTube, or a local recommendations identity in Maps might have turned the same distribution into real social pull."
- "In that framing, the assumption failed less because distribution was forced and more because the social behavior being forced was too generic."
- "So my revised view is still that asm-JW4vpGK5 is the main candidate cause, but more precisely: Google overestimated the transferability of identity across contexts and underestimated the need for one sharp, context-native reason to socialize."
- "The upside path was there; the launch likely tried to universalize it before earning it anywhere."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-q1kmC8sU" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-q1kmC8sU" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
