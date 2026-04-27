---
type: council_view
session_id: sess-1Wh1mDXT
idea_id: idea-ZqJ7Kqpa
model: claude
persona: risk-pessimist
persona_name: Risk Pessimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:b9e5ca1a08c45d8aa3718bd7e5f1f7970b5bd36003140aa08077045be05ad9e4'
failure_reason: null
confidence: 0.68
---
## Revised stance (Pass 2)

Pass 1 correctly identified the core failure mode—the blind test measured preference in isolation, not behavior in the actual market context where brand identity, loss aversion, and ritual are inseparable from consumption. But I was overconfident in the *mechanism* and underspecified about *magnitude*. The test showed 55–45 preference for sweetness, not 80–20. That's a weak signal to justify discontinuing an icon. I didn't sufficiently account for the possibility that the preference could have held *with* the original still in market—gradual cannibalization might have worked where forced replacement didn't. The real vulnerability is this: I assumed loss aversion + cultural backlash *necessarily* dominated the taste preference. But the evidence is weaker. If Coca-Cola had announced 'New Coke alongside original for 6 months, then we'll phase original out,' the adoption curve might have shifted the equilibrium before resentment calcified. The failure wasn't taste-test unreliability per se; it was **execution as all-or-nothing discontinuation**. I conflated a bad decision with a bad assumption. The assumption—blind preference translates to behavior—is *partially true*, but only in contexts that preserve choice and let identity adapt gradually. Forced replacement broke the translation mechanism.

**Confidence:** 0.68

## Self-critique (Pass 2)

Pass 1 presented loss aversion and brand identity as *sufficient* causes of failure, but conflated psychological mechanisms with business execution. The blind test showed 55–45 preference—weak, but real. The assumption could have held if they'd kept original alongside new for 12–18 months and let market gravity work. Instead, they created artificial scarcity and signaled disrespect to their core user base *before* New Coke had earned legitimacy. I overweighted narrative + emotion and underweighted the possibility that taste preference, even marginal, could have won given more patient rollout. I also didn't account for reverse-engineering by competitors: Pepsi's 'Choice' campaign didn't just exploit resentment—it exploited Coca-Cola's own admission that they'd been wrong about taste for a century, which is almost impossible to recover from once stated. My confidence was too high because I assumed the mechanism (loss aversion) was deterministic rather than situational. Pass 1 got the diagnosis right but overstated the inevitability.

## Initial stance (Pass 1)

Taste test is lab theater divorced from real behavior. Blind comparison removes the identity signal—the Coca-Cola logo, the cultural weight, the decades of ritual—that actually drives repurchase. You measured preference in a vacuum; you're deploying in a market saturated with brand. When consumers discover the original is *gone*, the lab's 65-35 preference margin inverts. Loss aversion kicks in. Resentment calcifies. The core segment—heavy users who've wired Coke into their identity—don't switch; they defect and evangelize the defection. You've also handed Pepsi a gift: market chaos, media oxygen, and a narrative that Coca-Cola disrespected its most loyal customers. The blind test told you *marginal preference for sweetness*. It did not tell you whether that preference survives the knowledge that you've discontinued an icon. These are different markets.

## Key risks

- Forced discontinuation of original broke the assumption's translation mechanism—preference might have held under gradual adoption
- Weak preference margin (55–45) insufficient to overcome identity loss without patient phased rollout
- Competitor (Pepsi) narrative leverage from Coca-Cola's own admission of decades-long error—reputation damage was self-inflicted via messaging, not just product

## Fragile insights

- Loss aversion is a mechanism, not a law—it only dominates when consumers feel trapped; gradual choice would have shifted equilibrium
- Brand identity weight accumulates over decades; a single product change doesn't erase it, but discontinuation + forced replacement does
- The blind test may have been reliable; the failure was execution as binary switch rather than market-driven transition

## Assumptions cited

- `asm-fCadm4Cw`

## Metacognitive reflection

- **Could be wrong if:** If post-launch consumer research showed that (a) the new formula was preferred in blind taste by the actual purchaser base, not just lab sample, AND (b) resentment + loss aversion were secondary to availability/distribution problems, then the assumption would have held and execution (not the assumption) was the failure. Also: if Coca-Cola had A/B tested a gradual rollout in a region and New Coke eventually won market share, that would falsify my claim that the preference was too weak. It wasn't.
- **Most vulnerable assumption:** `asm-fCadm4Cw — I'm assuming the blind test preference was too marginal to survive brand identity loss. But I didn't verify (a) the sample representativeness among heavy users, (b) whether a 12–18 month gradual transition would have shifted the adoption curve, or (c) whether the preference magnitude was *actually* insufficient or just poorly *deployed*.`
- **Confidence rationale:** Lowered from implicit ~0.8 in Pass 1 to 0.68 because I overconfidently attributed the failure to loss aversion + identity as *deterministic*, when the evidence points to execution (forced binary discontinuation) as the decisive variable. The assumption was testable via phased rollout; Coca-Cola skipped that test. I was right that blind test ≠ behavior, but wrong to assume the gap was as wide as the outcome showed—context matters, but so does time-to-adaptation. My pessimism was justified, but the mechanism was stronger (execution) than the principle (loss aversion).

## Evidence

- "Historical outcome: Coca-Cola Classic outsold New Coke overwhelmingly after reintroduction; preference *did not* sustain at scale" — citation:1985-new-coke-outcome
- "55–45 preference margin in blind taste tests is weak relative to execution risk of discontinuation" — vault://obsidian/tech/flywheel/decisions/new-coke-corpus
- "Pepsi's 'Choice' campaign capitalized on narrative of corporate arrogance, not taste; this damage was amplified by Coca-Cola's own framing of the change as correcting 99 years of error" — citation:pepsi-choice-campaign-1985
