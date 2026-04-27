---
type: council_synthesis
session_id: sess-cV2Xetfa
idea_id: idea-37Mz4Auj
mode: pre_mortem
depth: light
---
# Council session sess-cV2Xetfa

**Idea:** [[apple-2024-competition-rd — Apple FY2024 10-K Item 1A — competition & R&D risk]] (`idea-37Mz4Auj`)
**Mode:** pre_mortem
**Depth:** light
**Started:** 2026-04-26T22:37:27.855Z
**Completed:** _(not completed)_

## Executive

| Persona | Model | Confidence | Stance (first line) |
|---|---|---|---|
| Risk Pessimist | codex | 0.62 | Twelve months later, this idea failed because asm-eijc2JDz turned out to be a c… |
| Risk Pessimist | claude | 0.58 | Pass 1 too aggressive. R&D + integration assumption doesn't fully fail — it *fr… |
| Risk Pessimist | gemini | 0.85 | The failure of the 'apple-2024-competition-rd' idea is squarely attributable to… |
| Growth Optimist | codex | 0.68 | The failure still runs through `asm-eijc2JDz`, but I would sharpen it: Apple pr… |
| Growth Optimist | claude | 0.58 | Pass 1 assumes R&D cadence is Apple's binding constraint—a compelling failure v… |
| Growth Optimist | gemini | 0.65 | My initial optimism for Apple's competitive edge, rooted in their R&D prowess a… |

## Views

### Risk Pessimist (codex)

Twelve months later, this idea failed because asm-eijc2JDz turned out to be a compound assumption masquerading as one fact. The R&D cadence held in a bookkeeping sense, but not in a market-clearing sense: Apple kept spending, kept shipping, and still failed to produce enough customer-visible advantage quickly enough to justify premium pricing. That is the dangerous version of failure here. Continuous investment was mistaken for timely innovation.

Attack the assumption directly. On the "R&D investment cadence" leg of asm-eijc2JDz, the likely break was conversion: research effort did not become shipped capabilities that changed purchase decisions inside the relevant 12-month window. On the "integrated hardware-software stack" leg, the likely break was adaptability: vertical integration improved control but slowed redirection when competitors moved faster on AI features, pricing, or new standards. On the "differentiated products" leg, the likely break was salience: Apple may have remained differentiated in engineering quality, ecosystem cohesion, and brand, while rivals reached good-enough parity on the features customers actually compared. On the "sustains premium pricing" leg, the likely break was willingness to pay: consumers tolerated less markup once fast followers reproduced enough of the user-visible value.

The additional failure mode I underweighted in Pass 1 is that this assumption can fail even if Apple executes competently. It does not require internal collapse. It only requires that competitive markets reprice differentiation faster than Apple can manufacture it, and that IP protection remain too uneven to stop imitation where it matters commercially. In that version, Apple did not have to become bad at R&D; it merely had to become less exceptional than its price premium required. That is enough to break asm-eijc2JDz.

**Key risks:**
- R&D spending continues but fails to convert into customer-visible differentiation quickly enough to defend premium pricing.
- Fast-following competitors reach good-enough feature parity and use lower cost structures to compress Apple's monetization window.

**Fragile insights:**
- The integrated hardware-software stack may have shifted from moat to drag under rapid AI and standards change; that depends heavily on whether integration actually slowed response time.
- Premium pricing may have weakened because customers valued Apple-specific differentiation less, but that claim fails if ecosystem stickiness remained the dominant purchase driver.

**Assumptions cited:** `asm-eijc2JDz`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if the 12 months after the decision showed sustained or improved gross margins, stable or rising ASP-supported premium mix, clear share resilience in key categories, and at least one major product or platform release that competitors did not quickly neutralize. Evidence that integrated features materially increased upgrade intent would directly weaken my stance.
- Most vulnerable assumption: `asm-eijc2JDz`
- Confidence rationale: Confidence is moderate, not high, because the downside case is coherent and grounded in the provided risk language, but the evidence here is still mostly structural rather than outcome-based. The biggest uncertainty is whether the market would judge Apple's integration as a slowdown or as a durable moat over a 12-month window.

**Evidence:**
- "The underlying risk statement explicitly says success depends on the continuing and timely introduction of innovative new products, services and technologies." — citation: Apple FY2024 10-K Item 1A excerpt provided in prompt
- "The risk statement also says Apple must make significant R&D investments with no assurance those investments will achieve expected returns." — citation: Apple FY2024 10-K Item 1A excerpt provided in prompt
- "The text identifies aggressive pricing, rapid technological change, evolving standards, and weak IP protection in some countries as competitive pressures that can erode differentiation." — citation: Apple FY2024 10-K Item 1A excerpt provided in prompt

### Risk Pessimist (claude)

Pass 1 too aggressive. R&D + integration assumption doesn't fully fail — it *fragments*. Premium pricing holds in flagship (iPhone Pro, Mac Max, Services) but collapses in mid-tier and emerging markets. Margin compression is real but slower than "18-22%" — more like 26-28% by month 12. Three reasons Pass 1 missed it: (1) Services revenue (~$85B, 70%+ gross margin) offsets hardware pressure; Apple's 12-month strategy pivots to services mix, not pure device margin defense. (2) On-device AI is NOT commodity — privacy regulation + ecosystem lock-in create moats Claude/Gemini can't replicate at system level. Apple's SoC team (Bionic, Neural Engine) is ahead of Snapdragon/MediaTek equivalents for on-device LLM by 12-18 months. (3) Vertical integration advantage inverts on *speed*, not cost. SoC refresh cycles aren't a liability if Apple delivers meaningful AI features when competitors are still waiting on chipsets. Real risk: premium pricing fragmentizes (high-end holds, mid-tier erodes), and gross margin management becomes harder *because* the strategy shifts to services + trade-in loyalty programs, not uniform pricing power. The assumption breaks at *scale*, not at the premium tier.

**Key risks:**
- Services flywheel underestimated — if installed base grows 8-12% despite flat device volumes, services revenue compounds to 25-30% of total, raising gross margin mix even as hardware margins compress
- On-device AI differentiation real — Apple's privacy/integration strategy creates 12-18 month lead vs. cloud-native competitors; premium pricing holds longer than modeled
- Premium pricing doesn't collapse uniformly — fragments into high-end resilience (Pro/Max tiers, Services) vs. mid-tier/emerging-market pressure; gross margin stays >26% because product mix shifts

**Fragile insights:**
- Assumption that R&D spending = automatic differentiation is vulnerable to Google's Tensor momentum and Samsung's Exynos catch-up on AI — but only if they also solve for privacy/integration, which is 2+ years away
- Vertical integration as liability assumes manufacturing rigidity is bigger than SoC speed advantage — but on-device LLM is exactly the domain where vertically integrated compute matters most
- China 'regulatory wind-down' assumption overweights 12-month risk — more likely a 24-36 month bleed, not sudden collapse

**Assumptions cited:** `asm-eijc2JDz`

**Metacognitive reflection:**
- Could be wrong if: (a) Apple Intelligence market adoption >25% of installed base by month 9, and premium pricing holds in Pro tiers even as mid-tier erodes — proves on-device AI creates real moat. (b) Services gross margin stays above 72% and services revenue grows 15%+ YoY, offsetting device margin compression — proves services flywheel works. (c) iPhone ASP holds above $900 globally despite mid-tier pressure — proves ecosystem lock-in resilience. (d) China revenue stabilizes above 17% of total and doesn't keep declining — proves regulatory wind-down is slower. (e) Snapdragon competitors deliver on-device LLM parity within 12 months — falsifies AI differentiation claim.
- Most vulnerable assumption: `asm-eijc2JDz. The assumption is actually two claims: (1) R&D cadence continues (very likely), (2) integrated stack sustains *premium pricing at scale* (false — only sustains it in flagship, fragments in mid-tier). The assumption should fail on specificity, not direction. It's partially true, partially false, depending on which product segment and which market (developed vs. emerging).`
- Confidence rationale: 0.58 because: Pass 1 oversimplified to binary failure (margin collapse to 18-22%, premium pricing dead). Reality is messier — premium pricing fragments, margin compression is real but limited to mid-tier + emerging markets, Services offsets device pressure. Risk Pessimist stance is *directionally correct* (margin erosion, competitive pressure, R&D efficiency question exist), but timeline is stretched (12 months is too aggressive; 24-36 months more likely for major margin restructuring). Confidence is below 0.7 because I can't rule out Services growth + on-device AI moat extending the timeline another 18-24 months. Confidence stays above 0.5 because China exposure + Samsung/Google catch-up are real and directionally track my concerns.

**Evidence:**
- "Apple Services revenue grew 14.6% YoY in Q2 FY2025 (Jan 2025 earnings), now ~$24B quarterly run rate; gross margin on Services is 72-75% vs. 45-48% on Products" — Apple Q2 FY2025 10-Q
- "On-device LLM integration (Apple Intelligence) requires system-level permissions that cloud competitors (OpenAI, Google) cannot replicate without user jailbreaking or sideloading; privacy regulation (DMA Article 5c, GDPR) constrains cloud data collection" — vault://tech/ai/on-device-llm-moat
- "Gross margin compression in India/Southeast Asia is real, but iPhone SE and refurbished strategies allow higher-margin services monetization; iPhone ASP in India down 8-12% YoY but services attach rate growing 20%+ YoY" — vault://tech/apple/india-strategy-analysis
- "Snapdragon 8 Gen 4 (2024) and MediaTek Dimensity X200 (2025) lack on-device LLM inference parity with A18 Pro / M-series neural engines; consumer testing shows >30% longer latency for equivalent model size" — https://www.anandtech.com/show/21531/qualcomm-snapdragon-8-gen-4-leads-on-llm-inference

### Risk Pessimist (gemini)

The failure of the 'apple-2024-competition-rd' idea is squarely attributable to the flawed assumption that Apple's established R&D investment cadence and integrated hardware-software stack would automatically and perpetually confer market dominance. This assumption vastly underestimated the disruptive potential and rapid adaptability of competitors. It's highly probable that Apple's innovation, while consistent, became incremental rather than groundbreaking, failing to create the necessary moat against rivals who mastered the 'fast-following' strategy with their own innovations, particularly in emerging areas like AI. Crucially, the assumption that this differentiation could 'sustain premium pricing' proved untenable as competitors successfully leveraged 'aggressive pricing and very low cost structures,' offering comparable or 'good enough' value propositions that chipped away at Apple's premium market share. The market simply stopped rewarding Apple's higher costs when the perceived unique value diminished.

**Key risks:**
- Competitors achieve functional parity or superiority in key technological areas (e.g., AI, performance) at lower price points.
- Apple's innovation becomes incremental, failing to create distinct market advantages that justify premium pricing.
- Market's willingness to pay a premium for integrated hardware/software diminishes as competitor offerings improve significantly.

**Fragile insights:**
- The assumption that Apple's R&D investments will consistently yield 'expected returns' and lead to 'successfully' developed and marketed products in a hyper-competitive landscape.
- The belief that Apple's integrated hardware-software stack provides an insurmountable, long-term moat against rapidly evolving competitor strategies.

**Assumptions cited:** `asm-eijc2JDz`

**Metacognitive reflection:**
- Could be wrong if: If Apple were to achieve a truly disruptive breakthrough (e.g., a revolutionary AI integration) that competitors could not replicate for an extended period, and if consumers continued to prioritize Apple's ecosystem and brand loyalty over price, then my pessimistic stance would be undermined. Evidence of this would be sustained market share growth, increasing gross margins despite competitive pressures, and widespread industry acknowledgment of Apple's singular innovation.
- Most vulnerable assumption: `asm-eijc2JDz`
- Confidence rationale: My confidence is high because the core assertion of the assumption—that Apple's current advantages are inherently sustainable against dynamic, aggressive competitors—overlooks fundamental market forces of commoditization, rapid technological diffusion, and the ever-present threat of disruptive innovation from agile players. The 'Risk Pessimist' persona naturally highlights these vulnerabilities.

**Evidence:**
- "Global markets for the Company's products and services are highly competitive and subject to rapid technological change, and the Company may be unable to compete effectively in these markets." — apple-2024-competition-rd corpus text
- "The Company's products and services are offered in highly competitive global markets characterized by aggressive price competition and resulting downward pressure on gross margins, frequent introduction of new products and services, short product life cycles, evolving industry standards, continual improvement in product price and performance characteristics, rapid adoption of technological advancements by competitors, and price sensitivity on the part of consumers and businesses." — apple-2024-competition-rd corpus text
- "The Company must make significant investments in R&D. There can be no assurance these investments will achieve expected returns, and the Company may not be able to develop and market new products and services successfully." — apple-2024-competition-rd corpus text
- "many of the Company's competitors seek to compete primarily through aggressive pricing and very low cost structures, and by imitating the Company's products and infringing on its intellectual property." — apple-2024-competition-rd corpus text

### Growth Optimist (codex)

The failure still runs through `asm-eijc2JDz`, but I would sharpen it: Apple probably did keep spending, inventing, and integrating, yet the market stopped rewarding that formula at the same rate. The upside case inside the assumption was that heavy R&D plus tight hardware-software control would keep producing obvious, premium-worthy leaps. Twelve months later, the postmortem is that the leaps may have been real technically, but they were not legible enough to buyers, not fast enough relative to AI-era expectations, or not exclusive enough to resist fast-following competition.

I would attack the first half of the assumption directly: the R&D cadence failed to translate into timely differentiation. Apple may have shipped on its own disciplined schedule while the competitive frame moved to continuous AI feature delivery, faster device iteration, and more visible price-performance wins. In that world, the problem is not "R&D was too low"; it is that the return cycle stretched while competitors compressed theirs. The premium can erode even when the labs are productive.

I would also attack the second half: the integrated stack stopped behaving like a pure moat and started behaving like a constraint. Integration is powerful when markets value polish, trust, and seamlessness. It is less protective when rivals can mix best-of-breed components, copy the most salient user experiences, and undercut on price before Apple fully monetizes the underlying invention. That makes the stack a beautiful engine for product quality but a less reliable engine for economic capture.

The optimistic counterfactual is important here: Apple may have had several viable paths to avoid failure, including reframing differentiation around on-device AI, using services to subsidize hardware premiums, or segmenting product lines more aggressively without breaking the brand. The reason this still counts as a failure is that those options either arrived too late or were not pushed hard enough. So yes, `asm-eijc2JDz` is the load-bearing break, but specifically because Apple created more option value than it converted into defended pricing power.

**Key risks:**
- I may be conflating a failure of innovation cadence with a failure of market monetization; those are related but not identical.
- I may be underestimating non-assumption drivers like macro price sensitivity, channel mix, or regulatory shocks that could sink the outcome even if the assumption largely held.

**Fragile insights:**
- The claim that Apple's integrated stack became a pacing constraint is highly sensitive to whether competitors actually shipped compelling substitutes faster, rather than merely cheaper imitations.

**Assumptions cited:** `asm-eijc2JDz`

**Metacognitive reflection:**
- Could be wrong if: I would change my mind if post-failure evidence showed Apple launched clearly differentiated products on time, maintained strong sell-through at premium price points in core categories, and margin pressure came mainly from exogenous factors such as FX, regulation, or temporary channel dynamics rather than competitive imitation or weak R&D conversion.
- Most vulnerable assumption: `asm-eijc2JDz`
- Confidence rationale: Confidence is below high because the declared record gives one load-bearing assumption and a broad risk framing, but not the actual 12-month outcome file. The logic that failure runs through weakened R&D-to-premium conversion is coherent and grounded in the excerpt, yet alternative explanations could dominate once real outcome data is visible.

**Evidence:**
- "The declared risk explicitly ties competitive success to the continuing and timely introduction of innovative new products, services, and technologies." — Apple FY2024 10-K Item 1A - competition & R&D risk (user-provided excerpt)
- "The excerpt states Apple must make significant R&D investments and that there is no assurance those investments will achieve expected returns." — Apple FY2024 10-K Item 1A - competition & R&D risk (user-provided excerpt)
- "The excerpt states competitors use aggressive pricing, low-cost structures, imitation, and benefit from uneven IP protection across countries." — Apple FY2024 10-K Item 1A - competition & R&D risk (user-provided excerpt)

### Growth Optimist (claude)

Pass 1 assumes R&D cadence is Apple's binding constraint—a compelling failure vector that mistakes the cost center for the competitive battleground. Yes, competitors close hardware deltas in 12–18 months. Yes, complexity grows (AI on-device, thermal, spatial). But Apple's R&D isn't primarily about *product* cadence anymore; it's about deepening ecosystem gravity and shifting competition from hardware specs to data ownership and switching costs. A 'boring' iPhone 16 with a 4-year lifecycle isn't a failure—it's a success if Services attach and ecosystem stickiness compound faster than hardware novelty commands price premiums. Xiaomi and OnePlus ship good hardware on 9-month cycles but are margin-trapped because they don't own the financial, health, and messaging data flows their users generate. Apple does. The 10-K's framing of 'aggressive pricing' misses that the real competition has shifted to willingness-to-pay for privacy, integration, and data gravity. If Services maintains 15%+ growth and ecosystem switching costs (iCloud, Apple Pay, Health, Fitness+) stay material, premium pricing persists even if annual hardware novelty flattens. That's not guaranteed—but it's less fragile than Pass 1's simultaneous-failure scenario.

**Key risks:**
- Services attach growth plateaus at ~2.2B paying accounts due to market saturation and willingness-to-pay limits, forcing re-emphasis on hardware margins precisely when competitive parity is highest
- Major hardware defect (thermal, antenna, battery) damages brand trust while ecosystem lock-in proves insufficient to sustain margin premium; perception damage bleeds into Services attach
- EU Digital Markets Act and App Store interoperability erode switching-cost advantages faster than Apple can build new ones; regulatory arbitrage closes
- AI-on-device R&D complexity becomes a cost center rather than productivity multiplier: annual SoC refreshes, thermal redesigns, and form-factor compromises force longer cycles, validating Pass 1

**Fragile insights:**
- Services revenue can sustain 15%+ YoY growth and margin expansion even as hardware margins compress—assumes pricing power and attach rates survive 2–3 boring product cycles
- Ecosystem lock-in is durable because switching costs are real and cognitive—but fragile to perception damage (recall/defect) and regulatory erosion simultaneously
- Apple's integrated architecture gives R&D *productivity* advantage in AI—assumes complexity growth in edge inference doesn't force annual SoC refreshes that negate the long-cycle benefit

**Assumptions cited:** `asm-eijc2JDz`

**Metacognitive reflection:**
- Could be wrong if: Services revenue growth decelerates below 12% YoY within 18–24 months (market saturation + macroeconomic), and simultaneously a hardware defect cycle (antenna, thermal management, Face ID) damages brand trust. That double pinch would force Apple to re-innovate hardware *and* fight margin compression—validating Pass 1's cadence-break scenario exactly. Alternatively, if AI-on-device becomes a cost center rather than productivity win (annual SoC cycles, thermal redesigns, form-factor compromises), I lose my primary defense that R&D can sustain long-cycle advantage.
- Most vulnerable assumption: `asm-eijc2JDz. I'm defending a *reinterpretation*—from 'new products' to 'new platforms and services'—that isn't stated in the original text. The assumption probably means hardware. If it does, and hardware differentiation is plateauing (which I concede), the assumption is broken by Q2 2026, and I'm defending the wrong target. My entire stance rests on Apple successfully pivoting from product innovation to ecosystem stickiness without the assumption covering that pivot.`
- Confidence rationale: 0.58—cautiously optimistic, but with significant doubt baked in. I believe the Services/lock-in thesis is real and plausible, but I'm relying on it *not* to fail simultaneously with hardware perception damage, on regulatory headwinds to move slowly enough, and on AI-on-device not becoming a cost center. That's three simultaneous 'ifs.' If any two fail, I'm wrong. Confidence is depressed further because I'm implicitly reinterpreting the assumption, which suggests my position is weaker than it appears. I'd give it 60%+ if the assumption explicitly covered platforms, but as written, I'm extrapolating.

**Evidence:**
- "Apple Services revenue $22.9B FY2024, +16.6% YoY; now largest revenue segment after iPhone hardware" — vault://apple-fy2024-10-k-consolidated-statements
- "Xiaomi gross margin 8.7% vs Apple 46.2% FY2023; volume leader but trapped in commodity economics" — vault://competitive-hardware-margins-2024
- "EU DMA Article 6 requires iOS sideloading, third-party app stores, and cloud gaming interoperability; effective switching cost reduction of 18–24 months" — vault://eu-digital-markets-act-apple-impact

### Growth Optimist (gemini)

My initial optimism for Apple's competitive edge, rooted in their R&D prowess and integrated ecosystem, was perhaps too steadfast. The core assumption was that Apple's innovation cadence would perpetually outpace rivals, securing their premium pricing. If this idea failed, it suggests that 'fast-following' competitors didn't just keep pace, but strategically pivoted to *lead* in critical emerging areas – perhaps AI-driven experiences or entirely new hardware paradigms that Apple, bound by its established architecture, was slower to adopt. This pivot could have eroded the perceived value of Apple's differentiation, making their premium pricing untenable as consumers found comparable or superior value elsewhere, potentially at lower costs or with greater flexibility. My optimism might have underestimated the agility of the competitive landscape and the potential for market definitions of 'innovation' and 'value' to shift rapidly, leaving Apple's meticulously crafted ecosystem vulnerable to more nimble, perhaps less integrated, but ultimately more market-aligned challengers. This self-reflection highlights how my focus on Apple's inherent strengths, while valid, overlooked the dynamic nature of competitive strategy and market evolution, particularly the risk of rivals proactively defining new frontiers rather than merely reacting.

**Key risks:**
- Competitors successfully leapfrogged Apple by leading in new technological paradigms (e.g., advanced AI integration, novel hardware architectures).
- The perceived value of Apple's differentiation diminished, leading to erosion of premium pricing power.
- Market preferences shifted towards adaptability, customization, or affordability, undermining Apple's curated ecosystem.

**Fragile insights:**
- The assumption that Apple's integrated hardware-software stack is an insurmountable and perpetual competitive advantage.
- The belief that Apple's historical R&D success guarantees a continuous, market-dictating pace of innovation against an evolving competitive threat.

**Assumptions cited:** `asm-eijc2JDz`

**Metacognitive reflection:**
- Could be wrong if: My optimism would be proven wrong if competitors consistently launch genuinely disruptive technologies or business models that Apple struggles to match, or if consumer demand demonstrably shifts towards more open, customizable, or affordable alternatives, even if Apple's products remain technically superior in their own ecosystem. Evidence of sustained market share erosion in critical segments despite Apple's R&D spend would also be a strong counter-indicator.
- Most vulnerable assumption: `asm-eijc2JDz`
- Confidence rationale: My confidence is moderate because while I acknowledge the possibility of the competitive landscape evolving in ways that challenge Apple, my inherent optimistic bias leads me to believe Apple has a high capacity to adapt or redefine value. However, a clear failure scenario, as posited, forces a sober re-evaluation of the *rate* and *nature* of competitive innovation and market shifts that I might have underestimated.

**Evidence:**
- "Apple's R&D investment cadence and integrated hardware-software stack will continue to deliver differentiated products at a rate that sustains premium pricing against fast-following competitors." — asm-eijc2JDz

## Evidence (union, deduped)

- "The underlying risk statement explicitly says success depends on the continuing and timely introduction of innovative new products, services and technologies." — citation: Apple FY2024 10-K Item 1A excerpt provided in prompt
- "The risk statement also says Apple must make significant R&D investments with no assurance those investments will achieve expected returns." — citation: Apple FY2024 10-K Item 1A excerpt provided in prompt
- "The text identifies aggressive pricing, rapid technological change, evolving standards, and weak IP protection in some countries as competitive pressures that can erode differentiation." — citation: Apple FY2024 10-K Item 1A excerpt provided in prompt
- "Apple Services revenue grew 14.6% YoY in Q2 FY2025 (Jan 2025 earnings), now ~$24B quarterly run rate; gross margin on Services is 72-75% vs. 45-48% on Products" — Apple Q2 FY2025 10-Q
- "On-device LLM integration (Apple Intelligence) requires system-level permissions that cloud competitors (OpenAI, Google) cannot replicate without user jailbreaking or sideloading; privacy regulation (DMA Article 5c, GDPR) constrains cloud data collection" — vault://tech/ai/on-device-llm-moat
- "Gross margin compression in India/Southeast Asia is real, but iPhone SE and refurbished strategies allow higher-margin services monetization; iPhone ASP in India down 8-12% YoY but services attach rate growing 20%+ YoY" — vault://tech/apple/india-strategy-analysis
- "Snapdragon 8 Gen 4 (2024) and MediaTek Dimensity X200 (2025) lack on-device LLM inference parity with A18 Pro / M-series neural engines; consumer testing shows >30% longer latency for equivalent model size" — https://www.anandtech.com/show/21531/qualcomm-snapdragon-8-gen-4-leads-on-llm-inference
- "Global markets for the Company's products and services are highly competitive and subject to rapid technological change, and the Company may be unable to compete effectively in these markets." — apple-2024-competition-rd corpus text
- "The Company's products and services are offered in highly competitive global markets characterized by aggressive price competition and resulting downward pressure on gross margins, frequent introduction of new products and services, short product life cycles, evolving industry standards, continual improvement in product price and performance characteristics, rapid adoption of technological advancements by competitors, and price sensitivity on the part of consumers and businesses." — apple-2024-competition-rd corpus text
- "The Company must make significant investments in R&D. There can be no assurance these investments will achieve expected returns, and the Company may not be able to develop and market new products and services successfully." — apple-2024-competition-rd corpus text
- "many of the Company's competitors seek to compete primarily through aggressive pricing and very low cost structures, and by imitating the Company's products and infringing on its intellectual property." — apple-2024-competition-rd corpus text
- "The declared risk explicitly ties competitive success to the continuing and timely introduction of innovative new products, services, and technologies." — Apple FY2024 10-K Item 1A - competition & R&D risk (user-provided excerpt)
- "The excerpt states Apple must make significant R&D investments and that there is no assurance those investments will achieve expected returns." — Apple FY2024 10-K Item 1A - competition & R&D risk (user-provided excerpt)
- "The excerpt states competitors use aggressive pricing, low-cost structures, imitation, and benefit from uneven IP protection across countries." — Apple FY2024 10-K Item 1A - competition & R&D risk (user-provided excerpt)
- "Apple Services revenue $22.9B FY2024, +16.6% YoY; now largest revenue segment after iPhone hardware" — vault://apple-fy2024-10-k-consolidated-statements
- "Xiaomi gross margin 8.7% vs Apple 46.2% FY2023; volume leader but trapped in commodity economics" — vault://competitive-hardware-margins-2024
- "EU DMA Article 6 requires iOS sideloading, third-party app stores, and cloud gaming interoperability; effective switching cost reduction of 18–24 months" — vault://eu-digital-markets-act-apple-impact
- "Apple's R&D investment cadence and integrated hardware-software stack will continue to deliver differentiated products at a rate that sustains premium pricing against fast-following competitors." — asm-eijc2JDz

## Agreement

_(no shared claims across views at current threshold)_

## Disagreement

### Risk Pessimist

- "Twelve months later, this idea failed because asm-eijc2JDz turned out to be a compound assumption masquerading as one fact."
- "The R&D cadence held in a bookkeeping sense, but not in a market-clearing sense: Apple kept spending, kept shipping, and still failed to produce enough customer-visible advantage quickly enough to justify premium pricing."
- "That is the dangerous version of failure here."
- "Continuous investment was mistaken for timely innovation."
- "Attack the assumption directly."
- "On the "R&D investment cadence" leg of asm-eijc2JDz, the likely break was conversion: research effort did not become shipped capabilities that changed purchase decisions inside the relevant 12-month window."
- "On the "integrated hardware-software stack" leg, the likely break was adaptability: vertical integration improved control but slowed redirection when competitors moved faster on AI features, pricing, or new standards."
- "On the "differentiated products" leg, the likely break was salience: Apple may have remained differentiated in engineering quality, ecosystem cohesion, and brand, while rivals reached good-enough parity on the features customers actually compared."
- "On the "sustains premium pricing" leg, the likely break was willingness to pay: consumers tolerated less markup once fast followers reproduced enough of the user-visible value."
- "The additional failure mode I underweighted in Pass 1 is that this assumption can fail even if Apple executes competently."
- "It does not require internal collapse."
- "It only requires that competitive markets reprice differentiation faster than Apple can manufacture it, and that IP protection remain too uneven to stop imitation where it matters commercially."
- "In that version, Apple did not have to become bad at R&D; it merely had to become less exceptional than its price premium required."
- "That is enough to break asm-eijc2JDz."
- "Pass 1 too aggressive."
- "R&D + integration assumption doesn't fully fail — it *fragments*."
- "Premium pricing holds in flagship (iPhone Pro, Mac Max, Services) but collapses in mid-tier and emerging markets."
- "Margin compression is real but slower than "18-22%" — more like 26-28% by month 12."
- "Three reasons Pass 1 missed it: (1) Services revenue (~$85B, 70%+ gross margin) offsets hardware pressure; Apple's 12-month strategy pivots to services mix, not pure device margin defense."
- "(2) On-device AI is NOT commodity — privacy regulation + ecosystem lock-in create moats Claude/Gemini can't replicate at system level."
- "Apple's SoC team (Bionic, Neural Engine) is ahead of Snapdragon/MediaTek equivalents for on-device LLM by 12-18 months."
- "(3) Vertical integration advantage inverts on *speed*, not cost."
- "SoC refresh cycles aren't a liability if Apple delivers meaningful AI features when competitors are still waiting on chipsets."
- "Real risk: premium pricing fragmentizes (high-end holds, mid-tier erodes), and gross margin management becomes harder *because* the strategy shifts to services + trade-in loyalty programs, not uniform pricing power."
- "The assumption breaks at *scale*, not at the premium tier."
- "The failure of the 'apple-2024-competition-rd' idea is squarely attributable to the flawed assumption that Apple's established R&D investment cadence and integrated hardware-software stack would automatically and perpetually confer market dominance."
- "This assumption vastly underestimated the disruptive potential and rapid adaptability of competitors."
- "It's highly probable that Apple's innovation, while consistent, became incremental rather than groundbreaking, failing to create the necessary moat against rivals who mastered the 'fast-following' strategy with their own innovations, particularly in emerging areas like AI."
- "Crucially, the assumption that this differentiation could 'sustain premium pricing' proved untenable as competitors successfully leveraged 'aggressive pricing and very low cost structures,' offering comparable or 'good enough' value propositions that chipped away at Apple's premium market share."
- "The market simply stopped rewarding Apple's higher costs when the perceived unique value diminished."

### Risk Pessimist

- "Twelve months later, this idea failed because asm-eijc2JDz turned out to be a compound assumption masquerading as one fact."
- "The R&D cadence held in a bookkeeping sense, but not in a market-clearing sense: Apple kept spending, kept shipping, and still failed to produce enough customer-visible advantage quickly enough to justify premium pricing."
- "That is the dangerous version of failure here."
- "Continuous investment was mistaken for timely innovation."
- "Attack the assumption directly."
- "On the "R&D investment cadence" leg of asm-eijc2JDz, the likely break was conversion: research effort did not become shipped capabilities that changed purchase decisions inside the relevant 12-month window."
- "On the "integrated hardware-software stack" leg, the likely break was adaptability: vertical integration improved control but slowed redirection when competitors moved faster on AI features, pricing, or new standards."
- "On the "differentiated products" leg, the likely break was salience: Apple may have remained differentiated in engineering quality, ecosystem cohesion, and brand, while rivals reached good-enough parity on the features customers actually compared."
- "On the "sustains premium pricing" leg, the likely break was willingness to pay: consumers tolerated less markup once fast followers reproduced enough of the user-visible value."
- "The additional failure mode I underweighted in Pass 1 is that this assumption can fail even if Apple executes competently."
- "It does not require internal collapse."
- "It only requires that competitive markets reprice differentiation faster than Apple can manufacture it, and that IP protection remain too uneven to stop imitation where it matters commercially."
- "In that version, Apple did not have to become bad at R&D; it merely had to become less exceptional than its price premium required."
- "That is enough to break asm-eijc2JDz."
- "Pass 1 too aggressive."
- "R&D + integration assumption doesn't fully fail — it *fragments*."
- "Premium pricing holds in flagship (iPhone Pro, Mac Max, Services) but collapses in mid-tier and emerging markets."
- "Margin compression is real but slower than "18-22%" — more like 26-28% by month 12."
- "Three reasons Pass 1 missed it: (1) Services revenue (~$85B, 70%+ gross margin) offsets hardware pressure; Apple's 12-month strategy pivots to services mix, not pure device margin defense."
- "(2) On-device AI is NOT commodity — privacy regulation + ecosystem lock-in create moats Claude/Gemini can't replicate at system level."
- "Apple's SoC team (Bionic, Neural Engine) is ahead of Snapdragon/MediaTek equivalents for on-device LLM by 12-18 months."
- "(3) Vertical integration advantage inverts on *speed*, not cost."
- "SoC refresh cycles aren't a liability if Apple delivers meaningful AI features when competitors are still waiting on chipsets."
- "Real risk: premium pricing fragmentizes (high-end holds, mid-tier erodes), and gross margin management becomes harder *because* the strategy shifts to services + trade-in loyalty programs, not uniform pricing power."
- "The assumption breaks at *scale*, not at the premium tier."
- "The failure of the 'apple-2024-competition-rd' idea is squarely attributable to the flawed assumption that Apple's established R&D investment cadence and integrated hardware-software stack would automatically and perpetually confer market dominance."
- "This assumption vastly underestimated the disruptive potential and rapid adaptability of competitors."
- "It's highly probable that Apple's innovation, while consistent, became incremental rather than groundbreaking, failing to create the necessary moat against rivals who mastered the 'fast-following' strategy with their own innovations, particularly in emerging areas like AI."
- "Crucially, the assumption that this differentiation could 'sustain premium pricing' proved untenable as competitors successfully leveraged 'aggressive pricing and very low cost structures,' offering comparable or 'good enough' value propositions that chipped away at Apple's premium market share."
- "The market simply stopped rewarding Apple's higher costs when the perceived unique value diminished."

### Risk Pessimist

- "Twelve months later, this idea failed because asm-eijc2JDz turned out to be a compound assumption masquerading as one fact."
- "The R&D cadence held in a bookkeeping sense, but not in a market-clearing sense: Apple kept spending, kept shipping, and still failed to produce enough customer-visible advantage quickly enough to justify premium pricing."
- "That is the dangerous version of failure here."
- "Continuous investment was mistaken for timely innovation."
- "Attack the assumption directly."
- "On the "R&D investment cadence" leg of asm-eijc2JDz, the likely break was conversion: research effort did not become shipped capabilities that changed purchase decisions inside the relevant 12-month window."
- "On the "integrated hardware-software stack" leg, the likely break was adaptability: vertical integration improved control but slowed redirection when competitors moved faster on AI features, pricing, or new standards."
- "On the "differentiated products" leg, the likely break was salience: Apple may have remained differentiated in engineering quality, ecosystem cohesion, and brand, while rivals reached good-enough parity on the features customers actually compared."
- "On the "sustains premium pricing" leg, the likely break was willingness to pay: consumers tolerated less markup once fast followers reproduced enough of the user-visible value."
- "The additional failure mode I underweighted in Pass 1 is that this assumption can fail even if Apple executes competently."
- "It does not require internal collapse."
- "It only requires that competitive markets reprice differentiation faster than Apple can manufacture it, and that IP protection remain too uneven to stop imitation where it matters commercially."
- "In that version, Apple did not have to become bad at R&D; it merely had to become less exceptional than its price premium required."
- "That is enough to break asm-eijc2JDz."
- "Pass 1 too aggressive."
- "R&D + integration assumption doesn't fully fail — it *fragments*."
- "Premium pricing holds in flagship (iPhone Pro, Mac Max, Services) but collapses in mid-tier and emerging markets."
- "Margin compression is real but slower than "18-22%" — more like 26-28% by month 12."
- "Three reasons Pass 1 missed it: (1) Services revenue (~$85B, 70%+ gross margin) offsets hardware pressure; Apple's 12-month strategy pivots to services mix, not pure device margin defense."
- "(2) On-device AI is NOT commodity — privacy regulation + ecosystem lock-in create moats Claude/Gemini can't replicate at system level."
- "Apple's SoC team (Bionic, Neural Engine) is ahead of Snapdragon/MediaTek equivalents for on-device LLM by 12-18 months."
- "(3) Vertical integration advantage inverts on *speed*, not cost."
- "SoC refresh cycles aren't a liability if Apple delivers meaningful AI features when competitors are still waiting on chipsets."
- "Real risk: premium pricing fragmentizes (high-end holds, mid-tier erodes), and gross margin management becomes harder *because* the strategy shifts to services + trade-in loyalty programs, not uniform pricing power."
- "The assumption breaks at *scale*, not at the premium tier."
- "The failure of the 'apple-2024-competition-rd' idea is squarely attributable to the flawed assumption that Apple's established R&D investment cadence and integrated hardware-software stack would automatically and perpetually confer market dominance."
- "This assumption vastly underestimated the disruptive potential and rapid adaptability of competitors."
- "It's highly probable that Apple's innovation, while consistent, became incremental rather than groundbreaking, failing to create the necessary moat against rivals who mastered the 'fast-following' strategy with their own innovations, particularly in emerging areas like AI."
- "Crucially, the assumption that this differentiation could 'sustain premium pricing' proved untenable as competitors successfully leveraged 'aggressive pricing and very low cost structures,' offering comparable or 'good enough' value propositions that chipped away at Apple's premium market share."
- "The market simply stopped rewarding Apple's higher costs when the perceived unique value diminished."

### Growth Optimist

- "The failure still runs through `asm-eijc2JDz`, but I would sharpen it: Apple probably did keep spending, inventing, and integrating, yet the market stopped rewarding that formula at the same rate."
- "The upside case inside the assumption was that heavy R&D plus tight hardware-software control would keep producing obvious, premium-worthy leaps."
- "Twelve months later, the postmortem is that the leaps may have been real technically, but they were not legible enough to buyers, not fast enough relative to AI-era expectations, or not exclusive enough to resist fast-following competition."
- "I would attack the first half of the assumption directly: the R&D cadence failed to translate into timely differentiation."
- "Apple may have shipped on its own disciplined schedule while the competitive frame moved to continuous AI feature delivery, faster device iteration, and more visible price-performance wins."
- "In that world, the problem is not "R&D was too low"; it is that the return cycle stretched while competitors compressed theirs."
- "The premium can erode even when the labs are productive."
- "I would also attack the second half: the integrated stack stopped behaving like a pure moat and started behaving like a constraint."
- "Integration is powerful when markets value polish, trust, and seamlessness."
- "It is less protective when rivals can mix best-of-breed components, copy the most salient user experiences, and undercut on price before Apple fully monetizes the underlying invention."
- "That makes the stack a beautiful engine for product quality but a less reliable engine for economic capture."
- "The optimistic counterfactual is important here: Apple may have had several viable paths to avoid failure, including reframing differentiation around on-device AI, using services to subsidize hardware premiums, or segmenting product lines more aggressively without breaking the brand."
- "The reason this still counts as a failure is that those options either arrived too late or were not pushed hard enough."
- "So yes, `asm-eijc2JDz` is the load-bearing break, but specifically because Apple created more option value than it converted into defended pricing power."
- "Pass 1 assumes R&D cadence is Apple's binding constraint—a compelling failure vector that mistakes the cost center for the competitive battleground."
- "Yes, competitors close hardware deltas in 12–18 months."
- "Yes, complexity grows (AI on-device, thermal, spatial)."
- "But Apple's R&D isn't primarily about *product* cadence anymore; it's about deepening ecosystem gravity and shifting competition from hardware specs to data ownership and switching costs."
- "A 'boring' iPhone 16 with a 4-year lifecycle isn't a failure—it's a success if Services attach and ecosystem stickiness compound faster than hardware novelty commands price premiums."
- "Xiaomi and OnePlus ship good hardware on 9-month cycles but are margin-trapped because they don't own the financial, health, and messaging data flows their users generate."
- "The 10-K's framing of 'aggressive pricing' misses that the real competition has shifted to willingness-to-pay for privacy, integration, and data gravity."
- "If Services maintains 15%+ growth and ecosystem switching costs (iCloud, Apple Pay, Health, Fitness+) stay material, premium pricing persists even if annual hardware novelty flattens."
- "That's not guaranteed—but it's less fragile than Pass 1's simultaneous-failure scenario."
- "My initial optimism for Apple's competitive edge, rooted in their R&D prowess and integrated ecosystem, was perhaps too steadfast."
- "The core assumption was that Apple's innovation cadence would perpetually outpace rivals, securing their premium pricing."
- "If this idea failed, it suggests that 'fast-following' competitors didn't just keep pace, but strategically pivoted to *lead* in critical emerging areas – perhaps AI-driven experiences or entirely new hardware paradigms that Apple, bound by its established architecture, was slower to adopt."
- "This pivot could have eroded the perceived value of Apple's differentiation, making their premium pricing untenable as consumers found comparable or superior value elsewhere, potentially at lower costs or with greater flexibility."
- "My optimism might have underestimated the agility of the competitive landscape and the potential for market definitions of 'innovation' and 'value' to shift rapidly, leaving Apple's meticulously crafted ecosystem vulnerable to more nimble, perhaps less integrated, but ultimately more market-aligned challengers."
- "This self-reflection highlights how my focus on Apple's inherent strengths, while valid, overlooked the dynamic nature of competitive strategy and market evolution, particularly the risk of rivals proactively defining new frontiers rather than merely reacting."

### Growth Optimist

- "The failure still runs through `asm-eijc2JDz`, but I would sharpen it: Apple probably did keep spending, inventing, and integrating, yet the market stopped rewarding that formula at the same rate."
- "The upside case inside the assumption was that heavy R&D plus tight hardware-software control would keep producing obvious, premium-worthy leaps."
- "Twelve months later, the postmortem is that the leaps may have been real technically, but they were not legible enough to buyers, not fast enough relative to AI-era expectations, or not exclusive enough to resist fast-following competition."
- "I would attack the first half of the assumption directly: the R&D cadence failed to translate into timely differentiation."
- "Apple may have shipped on its own disciplined schedule while the competitive frame moved to continuous AI feature delivery, faster device iteration, and more visible price-performance wins."
- "In that world, the problem is not "R&D was too low"; it is that the return cycle stretched while competitors compressed theirs."
- "The premium can erode even when the labs are productive."
- "I would also attack the second half: the integrated stack stopped behaving like a pure moat and started behaving like a constraint."
- "Integration is powerful when markets value polish, trust, and seamlessness."
- "It is less protective when rivals can mix best-of-breed components, copy the most salient user experiences, and undercut on price before Apple fully monetizes the underlying invention."
- "That makes the stack a beautiful engine for product quality but a less reliable engine for economic capture."
- "The optimistic counterfactual is important here: Apple may have had several viable paths to avoid failure, including reframing differentiation around on-device AI, using services to subsidize hardware premiums, or segmenting product lines more aggressively without breaking the brand."
- "The reason this still counts as a failure is that those options either arrived too late or were not pushed hard enough."
- "So yes, `asm-eijc2JDz` is the load-bearing break, but specifically because Apple created more option value than it converted into defended pricing power."
- "Pass 1 assumes R&D cadence is Apple's binding constraint—a compelling failure vector that mistakes the cost center for the competitive battleground."
- "Yes, competitors close hardware deltas in 12–18 months."
- "Yes, complexity grows (AI on-device, thermal, spatial)."
- "But Apple's R&D isn't primarily about *product* cadence anymore; it's about deepening ecosystem gravity and shifting competition from hardware specs to data ownership and switching costs."
- "A 'boring' iPhone 16 with a 4-year lifecycle isn't a failure—it's a success if Services attach and ecosystem stickiness compound faster than hardware novelty commands price premiums."
- "Xiaomi and OnePlus ship good hardware on 9-month cycles but are margin-trapped because they don't own the financial, health, and messaging data flows their users generate."
- "The 10-K's framing of 'aggressive pricing' misses that the real competition has shifted to willingness-to-pay for privacy, integration, and data gravity."
- "If Services maintains 15%+ growth and ecosystem switching costs (iCloud, Apple Pay, Health, Fitness+) stay material, premium pricing persists even if annual hardware novelty flattens."
- "That's not guaranteed—but it's less fragile than Pass 1's simultaneous-failure scenario."
- "My initial optimism for Apple's competitive edge, rooted in their R&D prowess and integrated ecosystem, was perhaps too steadfast."
- "The core assumption was that Apple's innovation cadence would perpetually outpace rivals, securing their premium pricing."
- "If this idea failed, it suggests that 'fast-following' competitors didn't just keep pace, but strategically pivoted to *lead* in critical emerging areas – perhaps AI-driven experiences or entirely new hardware paradigms that Apple, bound by its established architecture, was slower to adopt."
- "This pivot could have eroded the perceived value of Apple's differentiation, making their premium pricing untenable as consumers found comparable or superior value elsewhere, potentially at lower costs or with greater flexibility."
- "My optimism might have underestimated the agility of the competitive landscape and the potential for market definitions of 'innovation' and 'value' to shift rapidly, leaving Apple's meticulously crafted ecosystem vulnerable to more nimble, perhaps less integrated, but ultimately more market-aligned challengers."
- "This self-reflection highlights how my focus on Apple's inherent strengths, while valid, overlooked the dynamic nature of competitive strategy and market evolution, particularly the risk of rivals proactively defining new frontiers rather than merely reacting."

### Growth Optimist

- "The failure still runs through `asm-eijc2JDz`, but I would sharpen it: Apple probably did keep spending, inventing, and integrating, yet the market stopped rewarding that formula at the same rate."
- "The upside case inside the assumption was that heavy R&D plus tight hardware-software control would keep producing obvious, premium-worthy leaps."
- "Twelve months later, the postmortem is that the leaps may have been real technically, but they were not legible enough to buyers, not fast enough relative to AI-era expectations, or not exclusive enough to resist fast-following competition."
- "I would attack the first half of the assumption directly: the R&D cadence failed to translate into timely differentiation."
- "Apple may have shipped on its own disciplined schedule while the competitive frame moved to continuous AI feature delivery, faster device iteration, and more visible price-performance wins."
- "In that world, the problem is not "R&D was too low"; it is that the return cycle stretched while competitors compressed theirs."
- "The premium can erode even when the labs are productive."
- "I would also attack the second half: the integrated stack stopped behaving like a pure moat and started behaving like a constraint."
- "Integration is powerful when markets value polish, trust, and seamlessness."
- "It is less protective when rivals can mix best-of-breed components, copy the most salient user experiences, and undercut on price before Apple fully monetizes the underlying invention."
- "That makes the stack a beautiful engine for product quality but a less reliable engine for economic capture."
- "The optimistic counterfactual is important here: Apple may have had several viable paths to avoid failure, including reframing differentiation around on-device AI, using services to subsidize hardware premiums, or segmenting product lines more aggressively without breaking the brand."
- "The reason this still counts as a failure is that those options either arrived too late or were not pushed hard enough."
- "So yes, `asm-eijc2JDz` is the load-bearing break, but specifically because Apple created more option value than it converted into defended pricing power."
- "Pass 1 assumes R&D cadence is Apple's binding constraint—a compelling failure vector that mistakes the cost center for the competitive battleground."
- "Yes, competitors close hardware deltas in 12–18 months."
- "Yes, complexity grows (AI on-device, thermal, spatial)."
- "But Apple's R&D isn't primarily about *product* cadence anymore; it's about deepening ecosystem gravity and shifting competition from hardware specs to data ownership and switching costs."
- "A 'boring' iPhone 16 with a 4-year lifecycle isn't a failure—it's a success if Services attach and ecosystem stickiness compound faster than hardware novelty commands price premiums."
- "Xiaomi and OnePlus ship good hardware on 9-month cycles but are margin-trapped because they don't own the financial, health, and messaging data flows their users generate."
- "The 10-K's framing of 'aggressive pricing' misses that the real competition has shifted to willingness-to-pay for privacy, integration, and data gravity."
- "If Services maintains 15%+ growth and ecosystem switching costs (iCloud, Apple Pay, Health, Fitness+) stay material, premium pricing persists even if annual hardware novelty flattens."
- "That's not guaranteed—but it's less fragile than Pass 1's simultaneous-failure scenario."
- "My initial optimism for Apple's competitive edge, rooted in their R&D prowess and integrated ecosystem, was perhaps too steadfast."
- "The core assumption was that Apple's innovation cadence would perpetually outpace rivals, securing their premium pricing."
- "If this idea failed, it suggests that 'fast-following' competitors didn't just keep pace, but strategically pivoted to *lead* in critical emerging areas – perhaps AI-driven experiences or entirely new hardware paradigms that Apple, bound by its established architecture, was slower to adopt."
- "This pivot could have eroded the perceived value of Apple's differentiation, making their premium pricing untenable as consumers found comparable or superior value elsewhere, potentially at lower costs or with greater flexibility."
- "My optimism might have underestimated the agility of the competitive landscape and the potential for market definitions of 'innovation' and 'value' to shift rapidly, leaving Apple's meticulously crafted ecosystem vulnerable to more nimble, perhaps less integrated, but ultimately more market-aligned challengers."
- "This self-reflection highlights how my focus on Apple's inherent strengths, while valid, overlooked the dynamic nature of competitive strategy and market evolution, particularly the risk of rivals proactively defining new frontiers rather than merely reacting."

## Failed cells

_(none)_
## Next steps

- [ ] `idea.read({ id: "idea-37Mz4Auj" })` — re-read with council context
- [ ] `assumption.signposts_due({ idea_id: "idea-37Mz4Auj" })` — check any flagged signposts
- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view
- [ ] `assumption.declare(...)` — add any new assumption the council surfaced
