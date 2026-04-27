---
type: council_view
session_id: sess-w3JZZS7X
idea_id: idea-wcXZockj
model: codex
persona: risk-pessimist
persona_name: Risk Pessimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:6e9201eab867b0ef3c5f4de1539398bf32652ed7ca8ceb57cd6355fb30ef0b36'
failure_reason: null
confidence: 0.71
---
## Revised stance (Pass 2)

Assumption asm-nz1E7L7B still looks like the break point, but I would state it more precisely now: both halves of the assumption failed. The residential-house metaphor did not map cleanly enough onto computing. It mapped cleanly enough onto a demo. In real use, novices had to learn a decorative house ontology on top of the computer ontology, then infer which room, object, or helper corresponded to the task they actually wanted. That is not simplification. That is translation overhead disguised as friendliness.

The speed claim inside asm-nz1E7L7B is where the bet becomes especially brittle. Even if the house reduced initial intimidation for some first-time users, it only justifies itself if that comfort converts into faster task completion and easier recovery from mistakes than Program Manager. A 12-month failure is consistent with the opposite: slower navigation, weak transfer to standard Windows concepts, and a product that mostly taught users how to use Bob rather than how to use Windows. Once the metaphor leaked beyond canned household scenarios, the learning curve returned with interest.

My revision after self-critique is that Pass 1 was too monocausal. The metaphor probably was not the only failure mechanism. Childish positioning, reviewer hostility, and hardware or performance friction could all have accelerated the collapse. But that does not rescue asm-nz1E7L7B; it condemns it further. A load-bearing novice shell cannot require ideal conditions to feel intuitive. If the metaphor only works when reviewers are charitable, the machine is overprovisioned, and the user never strays outside tightly staged tasks, then the assumption was never robust enough to carry a launch.

**Confidence:** 0.71

## Self-critique (Pass 2)

Pass 1 overfit the story to the metaphor alone. I treated stigma, performance, transfer failure, and market mismatch mostly as downstream effects without separating them cleanly. That is plausible, but it makes the argument look tighter than the evidence strictly proves. I should have drawn a clearer line between an interface concept that is intrinsically bad and an interface concept that might work in a narrow novice cohort but fails commercially because the buyer, reviewer, and actual installed-base conditions are different.

The counter-argument I underplayed is this: Bob may have helped a subset of true first-time users during initial onboarding, while still failing in market reality because those users were not the people choosing or recommending the product. In that version, asm-nz1E7L7B is not fully false in a lab sense, only commercially non-load-bearing in the real world. That possibility lowers my confidence, though not enough to reverse the conclusion.

## Initial stance (Pass 1)

Assumption asm-nz1E7L7B is the primary failure point. The residential-house metaphor did not map cleanly onto computing; it mapped cleanly onto a demo. Rooms, drawers, checkbooks, and cartoon helpers forced novices to learn a second symbolic system before they could perform ordinary tasks. That is not simplification. It is indirection. When a user has to guess whether mail is envelopes, a word processor is paper, or files live in drawers, the interface has already failed its core promise.

The same assumption also failed on speed. Bob did not make novices faster than Program Manager; it added lookup time, interpretation time, and recovery time. The metaphor leaked immediately on anything outside the canned household scenarios: multitasking, file management, Windows components, customization, and cross-application work. Worse, Bob mostly taught how to use Bob, not how to use Windows. So even when a novice succeeded inside the house, that competence did not transfer. The user faced a second learning curve later, which means the product borrowed against the future and defaulted.

Working backward from a 12-month failure, the rest is predictable. Adults read the product as childish or patronizing, reviewers amplified that stigma, and low usage prevented the metaphor from ever becoming familiar enough to offset its own cognitive overhead. Hardware and full-screen heaviness then removed any margin for forgiveness. A novice shell only works if it is obviously easier, obviously faster, and obviously worth staying in. Bob appears to have been none of the three. Once asm-nz1E7L7B broke, the launch was living on borrowed time.

## Key risks

- The house metaphor adds a second symbolic layer, forcing novices to translate household objects into computer actions before they can work.
- Any initial comfort benefit disappears once users hit tasks the metaphor does not cover cleanly, especially multitasking, file handling, and transfer to standard Windows concepts.
- If adults and reviewers perceive the shell as childish or patronizing, adoption collapses before familiarity can offset the metaphor's overhead.
- A novice shell that is heavy or slow gets interpreted as confusing; performance friction compounds usability failure.

## Fragile insights

- Some first-time users may have found the residential metaphor initially less intimidating, so the failure may reflect poor transfer and market targeting more than zero intuitive value.
- My claim that Bob made novices slower than Program Manager depends on task selection and user cohort; a narrow onboarding study could show the opposite for very simple tasks.

## Assumptions cited

- `asm-nz1E7L7B`

## Metacognitive reflection

- **Could be wrong if:** Controlled usability studies from 1995 showed novice users completing representative tasks materially faster and with fewer errors in Bob than in Program Manager, and separate evidence showed the commercial failure was driven mainly by pricing, distribution, or hardware constraints rather than the interface model itself.
- **Most vulnerable assumption:** `asm-nz1E7L7B`
- **Confidence rationale:** I still think the declared assumption failed on both mapping and speed, but the strongest alternative explanation is that Bob may have helped a narrow novice segment while failing for targeting, stigma, or performance reasons. That keeps confidence above even odds, but lower than Pass 1.

## Evidence

- "The corpus outcome explicitly marks the novice-metaphor assumption as refuted and states that the metaphor introduced more cognitive load than the UI it replaced." — vault://corpus/microsoft-bob/decision.md
- "The corpus records Bob as discontinued roughly within 12 months after poor reviews and weak sales, which is consistent with a launch that did not deliver clear novice productivity gains." — vault://corpus/microsoft-bob/decision.md
- "Microsoft's retrospective says Microsoft Bob was released on March 11, 1995 and discontinued in 1996 because usage rates were low, confirming the short failure window." — https://www.microsoft.com/en-us/microsoft-365-life-hacks/stories/gone-but-not-forgotten-m365-features
- "A contemporary review described Bob as hard to understand, patronizing, and demanding on hardware, supporting the view that the interface created friction rather than relief." — https://www.spokesman.com/stories/1995/apr/09/microsoft-bob-could-make-bill-look-bad/
