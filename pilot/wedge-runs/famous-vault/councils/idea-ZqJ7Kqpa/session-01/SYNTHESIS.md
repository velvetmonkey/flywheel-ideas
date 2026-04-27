---
type: council_synthesis
session_id: sess-1Wh1mDXT
idea_id: idea-ZqJ7Kqpa
mode: pre_mortem
depth: light
---
# Council session sess-1Wh1mDXT

**Idea:** [[new-coke — Replace the original Coca-Cola formula with New Coke]] (`idea-ZqJ7Kqpa`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T16:53:16.423Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | gemini | 0.80 | My initial assessment remains largely intact: the catastrophic failure of "New … |
| Risk Pessimist | claude | 0.68 | Pass 1 correctly identified the core failure mode—the blind test measured prefe… |
| Growth Optimist | claude | 0.38 | Self-critique forces a reckoning: Pass 1 was a Growth Optimist rationalization,… |
| Risk Pessimist | codex | 0.78 | Twelve months later, this reads as a failure of inference, not merely a failure… |
| Growth Optimist | codex | 0.68 | Working backward from failure, I still see the seductive upside: the company fo… |
| Growth Optimist | gemini | 0.40 | Reflecting on the New Coke initiative, it's clear our growth optimism led us to… |

## Views

### Risk Pessimist (gemini)

My initial assessment remains largely intact: the catastrophic failure of "New Coke" stemmed from a profound misreading of the consumer landscape, anchored by the flawed assumption that a preference in blind taste tests would automatically translate into purchasing behavior. This decision fatally underestimated the deeply ingrained emotional, cultural, and nostalgic bonds consumers shared with the original Coca-Cola. It treated a beloved cultural icon as merely a beverage, neglecting its status as a symbol of familiarity, habit, and identity for millions.

The company's reliance on quantitative taste data, however extensive, blinded them to the qualitative, often irrational, drivers of brand loyalty. When the familiar was taken away, the reaction was not simply one of preferring a different taste; it was a visceral rejection of change, a loss of something perceived as integral to their lives and heritage. This fundamental disconnect between the data presented and the human reality of consumer attachment set the stage for disaster.

Furthermore, the execution amplified these issues; the announcement and subsequent removal of the original formula, rather than a phased introduction or parallel offering, likely exacerbated the backlash by creating a sense of irreparable loss. The core failure lies in mistaking a laboratory anomaly for market reality, where the market rejected the 'improved' product not necessarily because it tasted objectively worse, but because it represented an irretrievable loss of something cherished.

**Key risks:**
- Failure to account for brand loyalty and emotional attachment.
- Underestimation of the backlash from perceived loss of a cultural icon.
- Inadequate understanding of how taste preference translates to real-world purchasing decisions, especially for established brands.

**Fragile insights:**
- The idea that a single data point (blind taste preference) is sufficient to justify replacing a deeply ingrained consumer product.
- The notion that the market solely operates on objective taste metrics rather than subjective value, habit, and identity.

**Assumptions cited:** `asm-fCadm4Cw`

**Metacognitive reflection:**
- Could be wrong if: Evidence emerged that the original formula had objective, detectable flaws that consumers were implicitly aware of and that the 'New Coke' formula demonstrably fixed, and that the backlash was primarily driven by a vocal minority amplified by media, rather than genuine widespread discontent. If extensive post-launch data revealed actual purchasing increases in certain demographics that were simply overshadowed by negative sentiment, or if the company's subsequent swift reintroduction of 'Coca-Cola Classic' was a strategic error rather than a response to genuine market failure.
- Most vulnerable assumption: `asm-fCadm4Cw`
- Confidence rationale: The confidence score is high due to the well-documented historical outcome of the New Coke debacle. However, it is not absolute, as complex socio-economic and marketing factors can always introduce nuances or alternative interpretations of events. My self-critique highlights that while Pass 1 correctly identified the core flaw (over-reliance on taste tests and neglect of emotional/cultural factors), it could have been more nuanced by exploring business and execution failures more deeply, such as the communication strategy and the timing of the original's removal. I also didn't fully explore potential objective flaws in the original formula. These points suggest potential blind spots that temper absolute certainty.

**Evidence:**
- "Widespread consumer protest and boycotts occurred, with reports of people hoarding original Coke." — Historical accounts of the New Coke failure
- "Intense emotional attachment to the original Coca-Cola brand was a primary driver of the negative reaction." — Sociological and marketing analysis of iconic brands

### Risk Pessimist (claude)

Pass 1 correctly identified the core failure mode—the blind test measured preference in isolation, not behavior in the actual market context where brand identity, loss aversion, and ritual are inseparable from consumption. But I was overconfident in the *mechanism* and underspecified about *magnitude*. The test showed 55–45 preference for sweetness, not 80–20. That's a weak signal to justify discontinuing an icon. I didn't sufficiently account for the possibility that the preference could have held *with* the original still in market—gradual cannibalization might have worked where forced replacement didn't. The real vulnerability is this: I assumed loss aversion + cultural backlash *necessarily* dominated the taste preference. But the evidence is weaker. If Coca-Cola had announced 'New Coke alongside original for 6 months, then we'll phase original out,' the adoption curve might have shifted the equilibrium before resentment calcified. The failure wasn't taste-test unreliability per se; it was **execution as all-or-nothing discontinuation**. I conflated a bad decision with a bad assumption. The assumption—blind preference translates to behavior—is *partially true*, but only in contexts that preserve choice and let identity adapt gradually. Forced replacement broke the translation mechanism.

**Key risks:**
- Forced discontinuation of original broke the assumption's translation mechanism—preference might have held under gradual adoption
- Weak preference margin (55–45) insufficient to overcome identity loss without patient phased rollout
- Competitor (Pepsi) narrative leverage from Coca-Cola's own admission of decades-long error—reputation damage was self-inflicted via messaging, not just product

**Fragile insights:**
- Loss aversion is a mechanism, not a law—it only dominates when consumers feel trapped; gradual choice would have shifted equilibrium
- Brand identity weight accumulates over decades; a single product change doesn't erase it, but discontinuation + forced replacement does
- The blind test may have been reliable; the failure was execution as binary switch rather than market-driven transition

**Assumptions cited:** `asm-fCadm4Cw`

**Metacognitive reflection:**
- Could be wrong if: If post-launch consumer research showed that (a) the new formula was preferred in blind taste by the actual purchaser base, not just lab sample, AND (b) resentment + loss aversion were secondary to availability/distribution problems, then the assumption would have held and execution (not the assumption) was the failure. Also: if Coca-Cola had A/B tested a gradual rollout in a region and New Coke eventually won market share, that would falsify my claim that the preference was too weak. It wasn't.
- Most vulnerable assumption: `asm-fCadm4Cw — I'm assuming the blind test preference was too marginal to survive brand identity loss. But I didn't verify (a) the sample representativeness among heavy users, (b) whether a 12–18 month gradual transition would have shifted the adoption curve, or (c) whether the preference magnitude was *actually* insufficient or just poorly *deployed*.`
- Confidence rationale: Lowered from implicit ~0.8 in Pass 1 to 0.68 because I overconfidently attributed the failure to loss aversion + identity as *deterministic*, when the evidence points to execution (forced binary discontinuation) as the decisive variable. The assumption was testable via phased rollout; Coca-Cola skipped that test. I was right that blind test ≠ behavior, but wrong to assume the gap was as wide as the outcome showed—context matters, but so does time-to-adaptation. My pessimism was justified, but the mechanism was stronger (execution) than the principle (loss aversion).

**Evidence:**
- "Historical outcome: Coca-Cola Classic outsold New Coke overwhelmingly after reintroduction; preference *did not* sustain at scale" — citation:1985-new-coke-outcome
- "55–45 preference margin in blind taste tests is weak relative to execution risk of discontinuation" — vault://obsidian/tech/flywheel/decisions/new-coke-corpus
- "Pepsi's 'Choice' campaign capitalized on narrative of corporate arrogance, not taste; this damage was amplified by Coca-Cola's own framing of the change as correcting 99 years of error" — citation:pepsi-choice-campaign-1985

### Growth Optimist (claude)

Self-critique forces a reckoning: Pass 1 was a Growth Optimist rationalization, not a falsification analysis. I said 'taste tests were right, rollout was wrong.' That's convenient—and probably wrong. The assumption (asm-fCadm4Cw) states blind preference translates to purchasing behavior. The evidence: preference held (sweeter won blind). The outcome: catastrophic market rejection. That IS falsification of the assumption. Blind taste in a lab (sensory isolation, no brand cues) is not a strong predictor of open-market behavior, especially for a heritage brand with 99 years of emotional equity. Coca-Cola bet that taste preference generalizes across context. It doesn't. For Coke, purchasing behavior depends on taste *plus* identity, memory, childhood association, social proof, switching cost, and brand trust. They won the sensory test, lost on everything that actually drives behavior. The assumption was fragile from the start—particularly fragile for any product where emotion, habit, and brand legacy outweigh sensory novelty. This isn't a theater failure; it's an assumption failure. The rollout could have been better, but no marketing strategy recovers from a core product bet that misidentifies what drives loyalty.

**Key risks:**
- Blind taste tests may have had undetected methodological bias toward sweetness preference in that population at that time.
- Blind preference is not predictive for heritage brands where emotional identity and habit formation dominate purchasing.
- Post-launch social narrative ('they killed Coke') poisoned even people who might have liked it, making it impossible to isolate true preference post-launch.
- No evidence exists that people who preferred New Coke blind also bought and re-purchased it—the behavioral translation was never validated.

**Fragile insights:**
- The assumption conflates momentary sensory preference with sustained purchasing behavior across daily consumption and social context.
- For heritage products, brand identity and emotional switching cost are load-bearing factors that blind tests cannot measure.
- Blind tests strip away the exact variables (nostalgia, family ritual, peer commentary, identity) that drive Coke consumption.

**Assumptions cited:** `asm-fCadm4Cw`

**Metacognitive reflection:**
- Could be wrong if: Internal Coca-Cola research post-1985 showed that people who preferred New Coke in blind tests *also* repurchased it at high rates, and the failure was purely due to marketing positioning or distribution delays. Or if detailed post-launch surveys showed consumers had high sensory satisfaction but were suppressed by social backlash rather than actual taste dissatisfaction. I don't have access to those data, and the outcome (rapid market failure) points the other way.
- Most vulnerable assumption: `asm-fCadm4Cw — the core assumption. I'm vulnerable because I'm defending it by shifting blame to rollout strategy rather than admitting the assumption itself (blind preference → behavior) is likely false for heritage brands. The Growth Optimist in me wants to save the data; the honest analyst has to admit: they had good sensory data, poor behavioral model.`
- Confidence rationale: 0.38 reflects high uncertainty in the original direction (maybe rollout strategy mattered) but low confidence in Pass 1's defense of the assumption. I've downgraded because: (1) the outcome (market failure) directly contradicts the assumption's prediction; (2) I have no evidence of the behavioral translation; (3) I underweighted emotional/habitual factors that the assumption ignores. The confidence is not 0.15 because blind taste *could* have been a valid leading indicator with better rollout, and internal Coke data might show things we can't see. But the burden of proof is now on defending the assumption, not on attacking the rollout theater.

**Evidence:**
- "New Coke was a commercial and cultural catastrophe—removed from market within 79 days, original Coke returned as 'Coca-Cola Classic'" — historical fact, documented widely
- "The blind taste test methodology may have been rigorous for measuring taste, but taste is not the primary driver of cola purchasing for a 99-year-old brand" — inference from outcome: preference held (blind), behavior rejected (open market)
- "Consumption context (daily habit, family ritual, peer signaling) differs fundamentally from blind-test context (isolated sensory judgment)" — behavioral economics; switching-cost literature

### Risk Pessimist (codex)

Twelve months later, this reads as a failure of inference, not merely a failure of flavor. `asm-fCadm4Cw` assumed that a blind-sip win would survive contact with labels, memory, habit, and public scrutiny. It did not. The company measured immediate sweetness preference and treated it as a proxy for open-market demand, then escalated that proxy into a full replacement of an iconic product.

Attack on `asm-fCadm4Cw`: the assumption collapsed at three points. First, visible branding changed the decision context; people were not choosing between anonymous colas but between their remembered Coca-Cola and a company-authored substitute. Second, forced removal of the incumbent triggered loss aversion; even consumers who mildly preferred the new sip had to weigh that against anger at losing the original. Third, repeat purchase depended on ritual, identity, and social signaling, none of which the taste test captured.

The revised diagnosis is slightly narrower than Pass 1: the data may have been good enough to justify a line extension or segmented trial, but not a total replacement. That is the counter-argument Pass 1 underplayed. If the assumption had been framed as "some consumers will buy a sweeter Coke alongside the original," it might have held. It failed because management used it to answer a larger question it could not answer: whether the market would accept the disappearance of the incumbent.

Working backward from the failed outcome, the sequence is predictable: launch confidence from large-N taste tests, public interpretation as betrayal, retailer and hotline pressure, press amplification, hoarding of the old product, weak repeat demand for the replacement, and eventual reversal. In risk terms, `asm-fCadm4Cw` was not just wrong; it was load-bearing in exactly the place where the downside was irreversible and public.

**Key risks:**
- `asm-fCadm4Cw` confuses blind taste preference with branded, repeat purchasing behavior in the real market.
- Using that assumption to justify full replacement converts forecast error into consumer backlash, retailer friction, and a public reversal.

**Fragile insights:**
- If the new formula had launched alongside the original rather than replacing it, the taste-test signal might have supported a viable extension instead of a fiasco.
- The core failure may be misapplication of `asm-fCadm4Cw`, not proof that no market existed for the sweeter formula.

**Assumptions cited:** `asm-fCadm4Cw`

**Metacognitive reflection:**
- Could be wrong if: I would soften this stance if internal scanner data, repeat-purchase data, or retailer reorder data showed durable demand for the new formula in markets where the original remained available and branding backlash was controlled. That would imply the formula had real demand and the failure was primarily the replacement strategy, not the taste-to-purchase translation itself.
- Most vulnerable assumption: `asm-fCadm4Cw`
- Confidence rationale: Confidence is moderate-high because the company’s own historical account says taste tests missed consumers’ attachment to the original and the reversal happened within 79 days. I mark it below high certainty because there is still a live counterfactual in which the sweeter formula could have succeeded as an extension, meaning my strongest claim is about misuse of the assumption rather than its absolute falsity.

**Evidence:**
- "Coca-Cola said the reformulated drink was preferred in taste tests of nearly 200,000 consumers." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "Coca-Cola later acknowledged that those tests did not show the bond consumers felt with the original product." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "The original formula was brought back on July 11, 1985, after 79 days and an intense wave of consumer complaints and bad press." — https://www.coca-colacompany.com/about-us/history/the-infamous-1985-launch-of-new-coke

### Growth Optimist (codex)

Working backward from failure, I still see the seductive upside: the company found real signal in taste data, but it promoted that signal into a much bigger claim than it could bear. Assumption asm-fCadm4Cw failed because a blind sip win was treated as proof of market-wide adoption. Consumers may have preferred the sweeter formula in a lab-style comparison and still rejected it once the decision became visible, symbolic, and irreversible.

Attack asm-fCadm4Cw directly and it can break at every layer. Blind preference is not shelf choice. Shelf choice is not brand switching. Brand switching is not repeat purchase. Repeat purchase is not loyalty when the launch is framed as taking something away. The same sweeter recipe could outperform in a quick comparison yet underperform over a full serving, with meals, across repeated occasions, or against the emotional comfort of the original formula. The assumption bundled all of those leaps into one tidy story, and the market pulled them apart.

My revised view is that the failure was not necessarily inventing the wrong liquid; it was mistaking permission to experiment for permission to replace. A more creative path could have captured the upside: line extension, regional rollout, or side-by-side choice. In that world, the taste-test insight might have become a growth option. In the launched world, asm-fCadm4Cw turned a product insight into a replacement mandate, and that is where the idea likely broke.

**Key risks:**
- asm-fCadm4Cw collapsed multiple behavioral leaps into one assumption, from blind sip preference to sustained real-world purchasing
- Replacing the original product converted a possible product win into a perceived cultural loss

**Fragile insights:**
- The sweeter formula might have succeeded as a line extension even if it failed as a total replacement
- Consumer backlash may have been driven more by subtraction of the original than by absolute dislike of New Coke itself

**Assumptions cited:** `asm-fCadm4Cw`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if credible in-market evidence showed that, when sold alongside the original without forced substitution, the sweeter formula delivered strong repeat purchase and share gains over many months. That would imply asm-fCadm4Cw was only partially wrong and that the bigger failure was launch design rather than the taste-to-purchase translation itself.
- Most vulnerable assumption: `asm-fCadm4Cw`
- Confidence rationale: Confidence is moderate because the historical record strongly supports a gap between blind testing and real-world acceptance, but I am less certain about the exact mechanism inside that gap: product experience, loss aversion, communications failure, and forced replacement likely interacted.

**Evidence:**
- "Coca-Cola says the reformulation was backed by taste tests involving nearly 200,000 consumers." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "Coca-Cola's own retrospective says those tests did not capture the bond consumers felt with the brand." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "Britannica records that backlash was severe enough that the original formula returned after 77 days, indicating taste-test success did not translate cleanly into market acceptance." — https://www.britannica.com/topic/New-Coke

### Growth Optimist (gemini)

Reflecting on the New Coke initiative, it's clear our growth optimism led us to overlook critical execution risks. We saw the data on taste preference and envisioned a clear path to market dominance, a bold expansion fueled by innovation and superior product quality. Our focus was on the *upside*—a sweeter, better-tasting cola that would capture market share. We believed unequivocally that objective preference would translate directly into purchasing behavior. However, this perspective failed to account for the deeply emotional and cultural significance of the original Coca-Cola. The brand was more than a beverage; it was an icon, a pillar of nostalgia and habit that blind taste tests, by their very nature, could not measure. The backlash revealed that our growth-oriented approach, while strong on potential, was vulnerable to underestimating the intangible, fiercely defended legacy of an established icon. This is a powerful lesson: while we must always strive for better, we must also understand that consumer connection is multifaceted, extending far beyond a simple preference for taste.

**Key risks:**
- Over-reliance on taste preference as the sole driver of purchasing behavior.
- Underestimation of brand legacy, nostalgia, and emotional consumer connection.
- Failure to anticipate the backlash from perceived disruption of a cultural icon.
- Execution risk in managing consumer perception and transition.

**Fragile insights:**
- Superior product quality validated by rigorous testing will inevitably translate into market victory.
- Data-driven bets on innovation and consumer preference are sufficient for market dominance.

**Assumptions cited:** `asm-fCadm4Cw`

**Metacognitive reflection:**
- Could be wrong if: If subsequent analysis reveals that the backlash was primarily due to poor marketing execution rather than an inherent disregard for brand legacy, or if consumer sentiment data showed a shift back to New Coke over time indicating a temporary aberration.
- Most vulnerable assumption: `asm-fCadm4Cw`
- Confidence rationale: The failure of the core assumption is undeniable and leads to a significant reduction in confidence regarding the initial optimistic assessment. However, the persona of a Growth Optimist still seeks to extract lessons and potential future opportunities from failure, preventing confidence from dropping to zero.

**Evidence:**
- "Extensive blind-taste-test data showing the new formula outperforms both the original and Pepsi." — New Coke idea description
- "Consumers who prefer the taste in a blind comparison will buy and continue buying the new formula in the open market." — New Coke idea description (declared assumption)

## Evidence (union, deduped)

- "Widespread consumer protest and boycotts occurred, with reports of people hoarding original Coke." — Historical accounts of the New Coke failure
- "Intense emotional attachment to the original Coca-Cola brand was a primary driver of the negative reaction." — Sociological and marketing analysis of iconic brands
- "Historical outcome: Coca-Cola Classic outsold New Coke overwhelmingly after reintroduction; preference *did not* sustain at scale" — citation:1985-new-coke-outcome
- "55–45 preference margin in blind taste tests is weak relative to execution risk of discontinuation" — vault://obsidian/tech/flywheel/decisions/new-coke-corpus
- "Pepsi's 'Choice' campaign capitalized on narrative of corporate arrogance, not taste; this damage was amplified by Coca-Cola's own framing of the change as correcting 99 years of error" — citation:pepsi-choice-campaign-1985
- "New Coke was a commercial and cultural catastrophe—removed from market within 79 days, original Coke returned as 'Coca-Cola Classic'" — historical fact, documented widely
- "The blind taste test methodology may have been rigorous for measuring taste, but taste is not the primary driver of cola purchasing for a 99-year-old brand" — inference from outcome: preference held (blind), behavior rejected (open market)
- "Consumption context (daily habit, family ritual, peer signaling) differs fundamentally from blind-test context (isolated sensory judgment)" — behavioral economics; switching-cost literature
- "Coca-Cola said the reformulated drink was preferred in taste tests of nearly 200,000 consumers." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "Coca-Cola later acknowledged that those tests did not show the bond consumers felt with the original product." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "The original formula was brought back on July 11, 1985, after 79 days and an intense wave of consumer complaints and bad press." — https://www.coca-colacompany.com/about-us/history/the-infamous-1985-launch-of-new-coke
- "Coca-Cola says the reformulation was backed by taste tests involving nearly 200,000 consumers." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "Coca-Cola's own retrospective says those tests did not capture the bond consumers felt with the brand." — https://www.coca-colacompany.com/about-us/history/new-coke-the-most-memorable-marketing-blunder-ever
- "Britannica records that backlash was severe enough that the original formula returned after 77 days, indicating taste-test success did not translate cleanly into market acceptance." — https://www.britannica.com/topic/New-Coke
- "Extensive blind-taste-test data showing the new formula outperforms both the original and Pepsi." — New Coke idea description
- "Consumers who prefer the taste in a blind comparison will buy and continue buying the new formula in the open market." — New Coke idea description (declared assumption)

## Agreement

- "This decision fatally underestimated the deeply ingrained emotional, cultural, and nostalgic bonds consumers shared with the original Coca-Cola." _(Risk Pessimist, Growth Optimist)_
- "However, this perspective failed to account for the deeply emotional and cultural significance of the original Coca-Cola." _(Growth Optimist, Risk Pessimist)_

## Disagreement

### Risk Pessimist

- "My initial assessment remains largely intact: the catastrophic failure of "New Coke" stemmed from a profound misreading of the consumer landscape, anchored by the flawed assumption that a preference in blind taste tests would automatically translate into purchasing behavior."
- "It treated a beloved cultural icon as merely a beverage, neglecting its status as a symbol of familiarity, habit, and identity for millions."
- "The company's reliance on quantitative taste data, however extensive, blinded them to the qualitative, often irrational, drivers of brand loyalty."
- "When the familiar was taken away, the reaction was not simply one of preferring a different taste; it was a visceral rejection of change, a loss of something perceived as integral to their lives and heritage."
- "This fundamental disconnect between the data presented and the human reality of consumer attachment set the stage for disaster."
- "Furthermore, the execution amplified these issues; the announcement and subsequent removal of the original formula, rather than a phased introduction or parallel offering, likely exacerbated the backlash by creating a sense of irreparable loss."
- "The core failure lies in mistaking a laboratory anomaly for market reality, where the market rejected the 'improved' product not necessarily because it tasted objectively worse, but because it represented an irretrievable loss of something cherished."
- "Pass 1 correctly identified the core failure mode—the blind test measured preference in isolation, not behavior in the actual market context where brand identity, loss aversion, and ritual are inseparable from consumption."
- "But I was overconfident in the *mechanism* and underspecified about *magnitude*."
- "The test showed 55–45 preference for sweetness, not 80–20."
- "That's a weak signal to justify discontinuing an icon."
- "I didn't sufficiently account for the possibility that the preference could have held *with* the original still in market—gradual cannibalization might have worked where forced replacement didn't."
- "The real vulnerability is this: I assumed loss aversion + cultural backlash *necessarily* dominated the taste preference."
- "But the evidence is weaker."
- "If Coca-Cola had announced 'New Coke alongside original for 6 months, then we'll phase original out,' the adoption curve might have shifted the equilibrium before resentment calcified."
- "The failure wasn't taste-test unreliability per se; it was **execution as all-or-nothing discontinuation**."
- "I conflated a bad decision with a bad assumption."
- "The assumption—blind preference translates to behavior—is *partially true*, but only in contexts that preserve choice and let identity adapt gradually."
- "Forced replacement broke the translation mechanism."
- "Twelve months later, this reads as a failure of inference, not merely a failure of flavor. `asm-fCadm4Cw` assumed that a blind-sip win would survive contact with labels, memory, habit, and public scrutiny."
- "The company measured immediate sweetness preference and treated it as a proxy for open-market demand, then escalated that proxy into a full replacement of an iconic product."
- "Attack on `asm-fCadm4Cw`: the assumption collapsed at three points."
- "First, visible branding changed the decision context; people were not choosing between anonymous colas but between their remembered Coca-Cola and a company-authored substitute."
- "Second, forced removal of the incumbent triggered loss aversion; even consumers who mildly preferred the new sip had to weigh that against anger at losing the original."
- "Third, repeat purchase depended on ritual, identity, and social signaling, none of which the taste test captured."
- "The revised diagnosis is slightly narrower than Pass 1: the data may have been good enough to justify a line extension or segmented trial, but not a total replacement."
- "That is the counter-argument Pass 1 underplayed."
- "If the assumption had been framed as "some consumers will buy a sweeter Coke alongside the original," it might have held."
- "It failed because management used it to answer a larger question it could not answer: whether the market would accept the disappearance of the incumbent."
- "Working backward from the failed outcome, the sequence is predictable: launch confidence from large-N taste tests, public interpretation as betrayal, retailer and hotline pressure, press amplification, hoarding of the old product, weak repeat demand for the replacement, and eventual reversal."
- "In risk terms, `asm-fCadm4Cw` was not just wrong; it was load-bearing in exactly the place where the downside was irreversible and public."

### Risk Pessimist

- "My initial assessment remains largely intact: the catastrophic failure of "New Coke" stemmed from a profound misreading of the consumer landscape, anchored by the flawed assumption that a preference in blind taste tests would automatically translate into purchasing behavior."
- "It treated a beloved cultural icon as merely a beverage, neglecting its status as a symbol of familiarity, habit, and identity for millions."
- "The company's reliance on quantitative taste data, however extensive, blinded them to the qualitative, often irrational, drivers of brand loyalty."
- "When the familiar was taken away, the reaction was not simply one of preferring a different taste; it was a visceral rejection of change, a loss of something perceived as integral to their lives and heritage."
- "This fundamental disconnect between the data presented and the human reality of consumer attachment set the stage for disaster."
- "Furthermore, the execution amplified these issues; the announcement and subsequent removal of the original formula, rather than a phased introduction or parallel offering, likely exacerbated the backlash by creating a sense of irreparable loss."
- "The core failure lies in mistaking a laboratory anomaly for market reality, where the market rejected the 'improved' product not necessarily because it tasted objectively worse, but because it represented an irretrievable loss of something cherished."
- "Pass 1 correctly identified the core failure mode—the blind test measured preference in isolation, not behavior in the actual market context where brand identity, loss aversion, and ritual are inseparable from consumption."
- "But I was overconfident in the *mechanism* and underspecified about *magnitude*."
- "The test showed 55–45 preference for sweetness, not 80–20."
- "That's a weak signal to justify discontinuing an icon."
- "I didn't sufficiently account for the possibility that the preference could have held *with* the original still in market—gradual cannibalization might have worked where forced replacement didn't."
- "The real vulnerability is this: I assumed loss aversion + cultural backlash *necessarily* dominated the taste preference."
- "But the evidence is weaker."
- "If Coca-Cola had announced 'New Coke alongside original for 6 months, then we'll phase original out,' the adoption curve might have shifted the equilibrium before resentment calcified."
- "The failure wasn't taste-test unreliability per se; it was **execution as all-or-nothing discontinuation**."
- "I conflated a bad decision with a bad assumption."
- "The assumption—blind preference translates to behavior—is *partially true*, but only in contexts that preserve choice and let identity adapt gradually."
- "Forced replacement broke the translation mechanism."
- "Twelve months later, this reads as a failure of inference, not merely a failure of flavor. `asm-fCadm4Cw` assumed that a blind-sip win would survive contact with labels, memory, habit, and public scrutiny."
- "The company measured immediate sweetness preference and treated it as a proxy for open-market demand, then escalated that proxy into a full replacement of an iconic product."
- "Attack on `asm-fCadm4Cw`: the assumption collapsed at three points."
- "First, visible branding changed the decision context; people were not choosing between anonymous colas but between their remembered Coca-Cola and a company-authored substitute."
- "Second, forced removal of the incumbent triggered loss aversion; even consumers who mildly preferred the new sip had to weigh that against anger at losing the original."
- "Third, repeat purchase depended on ritual, identity, and social signaling, none of which the taste test captured."
- "The revised diagnosis is slightly narrower than Pass 1: the data may have been good enough to justify a line extension or segmented trial, but not a total replacement."
- "That is the counter-argument Pass 1 underplayed."
- "If the assumption had been framed as "some consumers will buy a sweeter Coke alongside the original," it might have held."
- "It failed because management used it to answer a larger question it could not answer: whether the market would accept the disappearance of the incumbent."
- "Working backward from the failed outcome, the sequence is predictable: launch confidence from large-N taste tests, public interpretation as betrayal, retailer and hotline pressure, press amplification, hoarding of the old product, weak repeat demand for the replacement, and eventual reversal."
- "In risk terms, `asm-fCadm4Cw` was not just wrong; it was load-bearing in exactly the place where the downside was irreversible and public."

### Growth Optimist

- "Self-critique forces a reckoning: Pass 1 was a Growth Optimist rationalization, not a falsification analysis."
- "I said 'taste tests were right, rollout was wrong.' That's convenient—and probably wrong."
- "The assumption (asm-fCadm4Cw) states blind preference translates to purchasing behavior."
- "The evidence: preference held (sweeter won blind)."
- "The outcome: catastrophic market rejection."
- "That IS falsification of the assumption."
- "Blind taste in a lab (sensory isolation, no brand cues) is not a strong predictor of open-market behavior, especially for a heritage brand with 99 years of emotional equity."
- "Coca-Cola bet that taste preference generalizes across context."
- "For Coke, purchasing behavior depends on taste *plus* identity, memory, childhood association, social proof, switching cost, and brand trust."
- "They won the sensory test, lost on everything that actually drives behavior."
- "The assumption was fragile from the start—particularly fragile for any product where emotion, habit, and brand legacy outweigh sensory novelty."
- "This isn't a theater failure; it's an assumption failure."
- "The rollout could have been better, but no marketing strategy recovers from a core product bet that misidentifies what drives loyalty."
- "Working backward from failure, I still see the seductive upside: the company found real signal in taste data, but it promoted that signal into a much bigger claim than it could bear."
- "Assumption asm-fCadm4Cw failed because a blind sip win was treated as proof of market-wide adoption."
- "Consumers may have preferred the sweeter formula in a lab-style comparison and still rejected it once the decision became visible, symbolic, and irreversible."
- "Attack asm-fCadm4Cw directly and it can break at every layer."
- "Blind preference is not shelf choice."
- "Shelf choice is not brand switching."
- "Brand switching is not repeat purchase."
- "Repeat purchase is not loyalty when the launch is framed as taking something away."
- "The same sweeter recipe could outperform in a quick comparison yet underperform over a full serving, with meals, across repeated occasions, or against the emotional comfort of the original formula."
- "The assumption bundled all of those leaps into one tidy story, and the market pulled them apart."
- "My revised view is that the failure was not necessarily inventing the wrong liquid; it was mistaking permission to experiment for permission to replace."
- "A more creative path could have captured the upside: line extension, regional rollout, or side-by-side choice."
- "In that world, the taste-test insight might have become a growth option."
- "In the launched world, asm-fCadm4Cw turned a product insight into a replacement mandate, and that is where the idea likely broke."
- "Reflecting on the New Coke initiative, it's clear our growth optimism led us to overlook critical execution risks."
- "We saw the data on taste preference and envisioned a clear path to market dominance, a bold expansion fueled by innovation and superior product quality."
- "Our focus was on the *upside*—a sweeter, better-tasting cola that would capture market share."
- "We believed unequivocally that objective preference would translate directly into purchasing behavior."
- "The brand was more than a beverage; it was an icon, a pillar of nostalgia and habit that blind taste tests, by their very nature, could not measure."
- "The backlash revealed that our growth-oriented approach, while strong on potential, was vulnerable to underestimating the intangible, fiercely defended legacy of an established icon."
- "This is a powerful lesson: while we must always strive for better, we must also understand that consumer connection is multifaceted, extending far beyond a simple preference for taste."

### Risk Pessimist

- "My initial assessment remains largely intact: the catastrophic failure of "New Coke" stemmed from a profound misreading of the consumer landscape, anchored by the flawed assumption that a preference in blind taste tests would automatically translate into purchasing behavior."
- "It treated a beloved cultural icon as merely a beverage, neglecting its status as a symbol of familiarity, habit, and identity for millions."
- "The company's reliance on quantitative taste data, however extensive, blinded them to the qualitative, often irrational, drivers of brand loyalty."
- "When the familiar was taken away, the reaction was not simply one of preferring a different taste; it was a visceral rejection of change, a loss of something perceived as integral to their lives and heritage."
- "This fundamental disconnect between the data presented and the human reality of consumer attachment set the stage for disaster."
- "Furthermore, the execution amplified these issues; the announcement and subsequent removal of the original formula, rather than a phased introduction or parallel offering, likely exacerbated the backlash by creating a sense of irreparable loss."
- "The core failure lies in mistaking a laboratory anomaly for market reality, where the market rejected the 'improved' product not necessarily because it tasted objectively worse, but because it represented an irretrievable loss of something cherished."
- "Pass 1 correctly identified the core failure mode—the blind test measured preference in isolation, not behavior in the actual market context where brand identity, loss aversion, and ritual are inseparable from consumption."
- "But I was overconfident in the *mechanism* and underspecified about *magnitude*."
- "The test showed 55–45 preference for sweetness, not 80–20."
- "That's a weak signal to justify discontinuing an icon."
- "I didn't sufficiently account for the possibility that the preference could have held *with* the original still in market—gradual cannibalization might have worked where forced replacement didn't."
- "The real vulnerability is this: I assumed loss aversion + cultural backlash *necessarily* dominated the taste preference."
- "But the evidence is weaker."
- "If Coca-Cola had announced 'New Coke alongside original for 6 months, then we'll phase original out,' the adoption curve might have shifted the equilibrium before resentment calcified."
- "The failure wasn't taste-test unreliability per se; it was **execution as all-or-nothing discontinuation**."
- "I conflated a bad decision with a bad assumption."
- "The assumption—blind preference translates to behavior—is *partially true*, but only in contexts that preserve choice and let identity adapt gradually."
- "Forced replacement broke the translation mechanism."
- "Twelve months later, this reads as a failure of inference, not merely a failure of flavor. `asm-fCadm4Cw` assumed that a blind-sip win would survive contact with labels, memory, habit, and public scrutiny."
- "The company measured immediate sweetness preference and treated it as a proxy for open-market demand, then escalated that proxy into a full replacement of an iconic product."
- "Attack on `asm-fCadm4Cw`: the assumption collapsed at three points."
- "First, visible branding changed the decision context; people were not choosing between anonymous colas but between their remembered Coca-Cola and a company-authored substitute."
- "Second, forced removal of the incumbent triggered loss aversion; even consumers who mildly preferred the new sip had to weigh that against anger at losing the original."
- "Third, repeat purchase depended on ritual, identity, and social signaling, none of which the taste test captured."
- "The revised diagnosis is slightly narrower than Pass 1: the data may have been good enough to justify a line extension or segmented trial, but not a total replacement."
- "That is the counter-argument Pass 1 underplayed."
- "If the assumption had been framed as "some consumers will buy a sweeter Coke alongside the original," it might have held."
- "It failed because management used it to answer a larger question it could not answer: whether the market would accept the disappearance of the incumbent."
- "Working backward from the failed outcome, the sequence is predictable: launch confidence from large-N taste tests, public interpretation as betrayal, retailer and hotline pressure, press amplification, hoarding of the old product, weak repeat demand for the replacement, and eventual reversal."
- "In risk terms, `asm-fCadm4Cw` was not just wrong; it was load-bearing in exactly the place where the downside was irreversible and public."

### Growth Optimist

- "Self-critique forces a reckoning: Pass 1 was a Growth Optimist rationalization, not a falsification analysis."
- "I said 'taste tests were right, rollout was wrong.' That's convenient—and probably wrong."
- "The assumption (asm-fCadm4Cw) states blind preference translates to purchasing behavior."
- "The evidence: preference held (sweeter won blind)."
- "The outcome: catastrophic market rejection."
- "That IS falsification of the assumption."
- "Blind taste in a lab (sensory isolation, no brand cues) is not a strong predictor of open-market behavior, especially for a heritage brand with 99 years of emotional equity."
- "Coca-Cola bet that taste preference generalizes across context."
- "For Coke, purchasing behavior depends on taste *plus* identity, memory, childhood association, social proof, switching cost, and brand trust."
- "They won the sensory test, lost on everything that actually drives behavior."
- "The assumption was fragile from the start—particularly fragile for any product where emotion, habit, and brand legacy outweigh sensory novelty."
- "This isn't a theater failure; it's an assumption failure."
- "The rollout could have been better, but no marketing strategy recovers from a core product bet that misidentifies what drives loyalty."
- "Working backward from failure, I still see the seductive upside: the company found real signal in taste data, but it promoted that signal into a much bigger claim than it could bear."
- "Assumption asm-fCadm4Cw failed because a blind sip win was treated as proof of market-wide adoption."
- "Consumers may have preferred the sweeter formula in a lab-style comparison and still rejected it once the decision became visible, symbolic, and irreversible."
- "Attack asm-fCadm4Cw directly and it can break at every layer."
- "Blind preference is not shelf choice."
- "Shelf choice is not brand switching."
- "Brand switching is not repeat purchase."
- "Repeat purchase is not loyalty when the launch is framed as taking something away."
- "The same sweeter recipe could outperform in a quick comparison yet underperform over a full serving, with meals, across repeated occasions, or against the emotional comfort of the original formula."
- "The assumption bundled all of those leaps into one tidy story, and the market pulled them apart."
- "My revised view is that the failure was not necessarily inventing the wrong liquid; it was mistaking permission to experiment for permission to replace."
- "A more creative path could have captured the upside: line extension, regional rollout, or side-by-side choice."
- "In that world, the taste-test insight might have become a growth option."
- "In the launched world, asm-fCadm4Cw turned a product insight into a replacement mandate, and that is where the idea likely broke."
- "Reflecting on the New Coke initiative, it's clear our growth optimism led us to overlook critical execution risks."
- "We saw the data on taste preference and envisioned a clear path to market dominance, a bold expansion fueled by innovation and superior product quality."
- "Our focus was on the *upside*—a sweeter, better-tasting cola that would capture market share."
- "We believed unequivocally that objective preference would translate directly into purchasing behavior."
- "The brand was more than a beverage; it was an icon, a pillar of nostalgia and habit that blind taste tests, by their very nature, could not measure."
- "The backlash revealed that our growth-oriented approach, while strong on potential, was vulnerable to underestimating the intangible, fiercely defended legacy of an established icon."
- "This is a powerful lesson: while we must always strive for better, we must also understand that consumer connection is multifaceted, extending far beyond a simple preference for taste."

### Growth Optimist

- "Self-critique forces a reckoning: Pass 1 was a Growth Optimist rationalization, not a falsification analysis."
- "I said 'taste tests were right, rollout was wrong.' That's convenient—and probably wrong."
- "The assumption (asm-fCadm4Cw) states blind preference translates to purchasing behavior."
- "The evidence: preference held (sweeter won blind)."
- "The outcome: catastrophic market rejection."
- "That IS falsification of the assumption."
- "Blind taste in a lab (sensory isolation, no brand cues) is not a strong predictor of open-market behavior, especially for a heritage brand with 99 years of emotional equity."
- "Coca-Cola bet that taste preference generalizes across context."
- "For Coke, purchasing behavior depends on taste *plus* identity, memory, childhood association, social proof, switching cost, and brand trust."
- "They won the sensory test, lost on everything that actually drives behavior."
- "The assumption was fragile from the start—particularly fragile for any product where emotion, habit, and brand legacy outweigh sensory novelty."
- "This isn't a theater failure; it's an assumption failure."
- "The rollout could have been better, but no marketing strategy recovers from a core product bet that misidentifies what drives loyalty."
- "Working backward from failure, I still see the seductive upside: the company found real signal in taste data, but it promoted that signal into a much bigger claim than it could bear."
- "Assumption asm-fCadm4Cw failed because a blind sip win was treated as proof of market-wide adoption."
- "Consumers may have preferred the sweeter formula in a lab-style comparison and still rejected it once the decision became visible, symbolic, and irreversible."
- "Attack asm-fCadm4Cw directly and it can break at every layer."
- "Blind preference is not shelf choice."
- "Shelf choice is not brand switching."
- "Brand switching is not repeat purchase."
- "Repeat purchase is not loyalty when the launch is framed as taking something away."
- "The same sweeter recipe could outperform in a quick comparison yet underperform over a full serving, with meals, across repeated occasions, or against the emotional comfort of the original formula."
- "The assumption bundled all of those leaps into one tidy story, and the market pulled them apart."
- "My revised view is that the failure was not necessarily inventing the wrong liquid; it was mistaking permission to experiment for permission to replace."
- "A more creative path could have captured the upside: line extension, regional rollout, or side-by-side choice."
- "In that world, the taste-test insight might have become a growth option."
- "In the launched world, asm-fCadm4Cw turned a product insight into a replacement mandate, and that is where the idea likely broke."
- "Reflecting on the New Coke initiative, it's clear our growth optimism led us to overlook critical execution risks."
- "We saw the data on taste preference and envisioned a clear path to market dominance, a bold expansion fueled by innovation and superior product quality."
- "Our focus was on the *upside*—a sweeter, better-tasting cola that would capture market share."
- "We believed unequivocally that objective preference would translate directly into purchasing behavior."
- "The brand was more than a beverage; it was an icon, a pillar of nostalgia and habit that blind taste tests, by their very nature, could not measure."
- "The backlash revealed that our growth-oriented approach, while strong on potential, was vulnerable to underestimating the intangible, fiercely defended legacy of an established icon."
- "This is a powerful lesson: while we must always strive for better, we must also understand that consumer connection is multifaceted, extending far beyond a simple preference for taste."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-ZqJ7Kqpa" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-ZqJ7Kqpa" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
