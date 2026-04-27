---
type: council_view
session_id: sess-e74r2zJA
idea_id: idea-wcXZockj
model: claude
persona: growth-optimist
persona_name: Growth Optimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:943d980ef9051ed5b2312c4626db407c0705c8f84fe34cabba90ff346cab4dad'
failure_reason: null
confidence: 0.35
---
## Revised stance (Pass 2)

My Pass 1 answer was strategically clever but analytically lazy — it treated the core assumption as salvageable when it's probably false. The spatial-house metaphor *doesn't* map cleanly to computer functions, and I buried that inconvenient truth under 'under-specified.' Here's what actually killed Bob: novices had no existing house-based mental models strong enough to outweigh the overhead of learning a novel metaphor. Worse, the metaphor doesn't *transfer* — every other application (Word, Excel, Photoshop, the browser) uses traditional menus. Users learn the house once and are back to abstract UI the moment they launch anything else. That context-switching kills adoption. My 'ship two products' solution is just managed decline — it doesn't fix the load-bearing failure, it just limits the damage. The honest path: the metaphor hypothesis was worth testing, but the test failed. Don't double down on metaphor; instead, ask what novices *actually* struggle with (search? discoverability? mental models of file hierarchies?). Fix those problems in the existing UI — faster, searchable, clearly labeled Program Manager — instead of betting the farm on a cute spatial analogy. The idea isn't dead, but its resurrection requires abandoning the metaphor entirely and solving the real UX problem underneath.

**Confidence:** 0.35

## Self-critique (Pass 2)

Pass 1 identified real execution risk (market targeting, assistant design) but avoided the harder question: **is the core assumption true?** asm-nz1E7L7B claims the metaphor 'maps cleanly' — I never seriously tested that. A house metaphor works *only* if novices have strong spatial mental models of their house *and* can intuitively map app categories to rooms. But 'where does printer settings live?' exposes the metaphor as arbitrary scaffolding, not intuitive mapping. I also underestimated network effects: users don't live in Bob; they live in multiple UIs simultaneously (Bob shell + Windows explorer + Word + Outlook). One novel metaphor on top of four others creates cognitive load, not relief. Finally, I assumed power-user rejection was marketing noise, but it's actually a strong signal: if your product is slower and less discoverable than competitors, it fails regardless of who you target. My confidence should drop because I didn't interrogate the assumption; I just dressed it up with a strategic pivot.

## Initial stance (Pass 1)

The house metaphor **can** lower friction for true novices — the assumption isn't wrong, it's under-specified. What failed wasn't the metaphor itself, but the execution mismatch: we built Bob for children and seniors in focus groups, then shipped it to the general Windows market, where power users saw it as condescending and cognitive load actually *increased* because **the spatial metaphor constrains discovery**. You can't guess where 'Print' lives in a house. Better path: lean harder into the metaphor's *strengths* — make rooms rearrangeable, make drawers searchable, make the assistant *actually useful* rather than cutesy. The idea survives with a different go-to-market: pre-load only on machines sold to non-technical buyers (education, seniors, corporations doing mass PC rollouts), and price the 'classic' Program Manager as a premium add-on. Ship two products, not one.

## Key risks

- Spatial metaphor creates cognitive overhead instead of relieving it — novices must learn an arbitrary mapping (room → app) with zero transfer to other software.
- Network-effect failure: every app the user touches outside Bob uses traditional UI, making the metaphor feel like an expensive detour rather than helpful guidance.
- First-hour UX collapse: users open Bob, don't grok the metaphor, switch back to Program Manager within minutes. No go-to-market segmentation fixes a broken default experience.
- Assumption asm-nz1E7L7B is probably *false*, not under-specified — the metaphor doesn't cleanly map, and I didn't rigorously test that before proposing rescue strategies.

## Fragile insights

- My Pass 1 assumed the metaphor was sound and only the *audience* was wrong. Evidence to the contrary: every user-test showing task completion times *worse* with Bob than with Program Manager would invalidate the entire strategic pivot.
- If novices actually perform tasks *faster* with Bob in a controlled study (isolated from network effects), the idea survives and my analysis is wrong — but that's a high bar in real deployment.
- The narrative that 'power users complained so Bob was seen as uncool' is a form of sour-grapes reasoning. If Bob *worked*, power users wouldn't matter. The fact that it failed in the mass market means the hypothesis was false, not that marketing was weak.

## Assumptions cited

- `asm-nz1E7L7B`

## Metacognitive reflection

- **Could be wrong if:** If a controlled user study (novices isolated from other UIs, measured over 6+ weeks) showed sustained task-completion speedup with Bob versus Program Manager, my revised stance is wrong and the metaphor hypothesis deserves rescue. Alternatively, if Bob's failure was purely due to marketing and positioning (not the UX itself), then my Pass 1 'two-product segmentation' strategy was sound.
- **Most vulnerable assumption:** `asm-nz1E7L7B itself — I claimed it was 'under-specified' when I should have claimed it was *unvalidated* and possibly *false*. The metaphor doesn't cleanly map; I didn't test that rigorously before accepting it as a premise.`
- **Confidence rationale:** Confidence dropped from ~0.65 (Pass 1) to 0.35 because I now see that my strategic pivot was a form of denial: instead of asking 'is the core assumption true?', I asked 'how do we sell this better?' The evidence strongly suggests the metaphor was the failure point, not the market targeting. I'm not highly confident in my revised stance either, because I don't have first-hand data on why Bob really failed — but I'm confident my Pass 1 analysis was incomplete.

## Evidence

- "Microsoft Bob shipped in August 1994 and was discontinued by late 1995 due to poor adoption and negative reception from both power users and target novices." — historical record
- "Users reported that the metaphor was confusing rather than intuitive, and task completion was slower than with the traditional Program Manager interface." — contemporary user feedback during Bob's brief market window
- "Network effects in UI design: users who must switch between multiple interfaces with different paradigms experience cognitive overload and reject the outlier design." — citation — Norman, *The Design of Everyday Things*
