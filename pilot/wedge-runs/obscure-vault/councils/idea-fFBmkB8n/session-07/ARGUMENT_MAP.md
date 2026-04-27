---
type: argument_map
session_id: sess-mUDgbZPZ
generated_at: '2026-04-26T20:02:21.705Z'
---
# Argument map — session sess-mUDgbZPZ

**Idea:** obs-003-multi-currency — Add EUR alongside USD in the legacy invoicing system
**Generated:** 2026-04-26T20:02:21.705Z
**Claims:** 6

---

## claim-001 — risk-pessimist

**Confidence:** 0.58
**Source view(s):** view-QnRCkjWS

### Claim

Pass 1 leaned too hard on the 'legacy = messy' stereotype without seeing the actual audit work. If the team's code inspection is real and thorough, my biggest fears drop from likely to conditional. Three points of revision: (1) Stripe/Adyen handle multi-currency natively now; invoicing system may only need to pass currency codes and amounts through—not generate conversions itself. That eliminates my fear #3 entirely. (2) If Amount is typed as (value, currency_code) from the data layer up, then tax and reconciliation logic that operates on amounts generically actually COULD be agnostic. (3) The fact the team didn't rewrite the core tells me they've scoped this carefully—either they tested a prototype successfully, or they know exactly which modules touch currency and which don't. My Pass 1 assumption that 'scattered hidden assumptions' exist is plausible but not inevitable. Real risk: I haven't seen the audit, so I'm confusing 'plausible' with 'likely.' The load-bearing claim asm-JCY5PVZk is not obviously false; it's just unverified by me. Where I still harbor genuine concern: reconciliation/penny-diff tolerance (if hardcoded thresholds exist outside the core), and payment-gateway integration edge cases (if the system has custom pre/post-settlement logic that couples to USD). But these are narrower than Pass 1 implied.

### Pros

- Legacy 2009 systems often embed currency assumptions in tax, rounding, and reconciliation logic
  - evidence: Legacy 2009 systems often embed currency assumptions in tax, rounding, and reconciliation logic (Observation of common legacy patterns; not specific to this codebase)
- EUR and USD share identical cent-based subunit structure, simplifying rounding between them
  - evidence: EUR and USD share identical cent-based subunit structure, simplifying rounding between them (Accounting standard knowledge; makes currency conversion simpler than JPY/KRW cases)

### Cons

- Audit findings not shown; team confidence is verbal, not evidenced in this corpus
- Reconciliation tolerance thresholds and penny-diff logic may be hardcoded outside core modules and hidden from the audit's scope
- Custom pre/post-settlement logic in payment-gateway integration may couple to USD in ways the audit missed
- Exchange-rate handling (precision, timing, rounding on conversion) may reveal dependency on single currency when prototyped
- Tax module (VAT, withholding) may have currency-specific thresholds embedded in business logic, not display
- Fragile: Assumption asm-JCY5PVZk is plausible but unverified—depends entirely on whether the audit was thorough and its findings are accurate
- Fragile: The team's confidence that 'data/tax/reconciliation layers are currency-agnostic' is strongest on data layer, weakest on tax/reconciliation
- Fragile: Modern payment gateways (Stripe, Adyen) may already absorb multi-currency handling, but the assumption doesn't mention this—suggests the team may not have validated that assumption

---

## claim-002 — risk-pessimist

**Confidence:** 0.72
**Source view(s):** view-P7CTiXDj

### Claim

I remain negative, but I would narrow my claim. The real danger is not that EUR support is impossible; it is that the team may be mistaking a successful code audit for a successful behavioral audit. [asm-JCY5PVZk] asserts that hardcoded currency assumptions are concentrated in display/formatting and that data, tax, and reconciliation are currency-agnostic. In a legacy invoicing system from around 2009, that is precisely the kind of boundary that often looks clean in code review and fails in production through rounding conventions, export jobs, payment matching heuristics, dunning reports, or reconciliation comparisons that were never designed for mixed-currency operation.

I also still reject the stronger half of [asm-JCY5PVZk]: that no schema or logic changes are needed merely because the core data layer appears currency-agnostic. Single-currency systems frequently hide their currency model in process assumptions rather than columns. If amounts were historically comparable everywhere because everything was implicitly USD, then introducing EUR can break reports, tax handling, credits, and reconciliations even if the tables technically accept the values. That is a logic-boundary problem, not just a storage problem.

My revision after self-critique is that Pass 1 may have overstated the inevitability of deep breakage. There is a credible counter-case: if invoices are already isolated by account, carry an explicit currency code end-to-end, and all downstream reports reconcile within document currency rather than across documents, then adding EUR without rewriting the generator could be viable. But that would require stronger evidence than the audit summary provided. Absent that evidence, adoption still looks high-risk because the likely failure mode is silent accounting distortion rather than an obvious application crash.

### Pros

- The plan depends on an audit finding that hardcoded currency assumptions are concentrated in display/formatting and that the core data layer is currency-agnostic.
  - evidence: The plan depends on an audit finding that hardcoded currency assumptions are concentrated in display/formatting and that the core data layer is currency-agnostic. (citation: user-provided decision record for obs-003-multi-currency)
- The declared load-bearing assumption explicitly states that data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR.
  - evidence: The declared load-bearing assumption explicitly states that data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR. (citation: declared assumption asm-JCY5PVZk in user-provided corpus excerpt)
- The system is a legacy invoicing platform built around 2009 and EUR is being added without rewriting the core invoice generator.
  - evidence: The system is a legacy invoicing platform built around 2009 and EUR is being added without rewriting the core invoice generator. (citation: user-provided decision record for obs-003-multi-currency)

### Cons

- Silent accounting drift if implicit USD assumptions survive in reconciliation, exports, credits, or reporting paths outside the audited formatting layer
- False confidence from a code-local audit that misses process-level invariants where amounts were historically treated as globally comparable because the system was de facto single-currency
- Fragile: The inference that a 2009-era legacy billing system likely contains hidden currency coupling could fail if the original design already enforced per-document currency boundaries
- Fragile: The claim that schema or logic changes are needed could fail if currency identity is already explicit and all downstream consumers operate strictly within invoice currency

---

## claim-003 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-T9SrGURC

### Claim

The audit finding is the Achilles heel, not the strength I called it. EUR-by-formatter is elegant in theory, but legacy financial systems hide assumptions in plain sight—especially tax, rounding, and reconciliation logic that masquerades as "currency-agnostic data." I still see the TAM upside (EU market is real), but the path to minimal-touch is narrower than Pass 1 suggests. The team needs to stress-test three specific layers before committed: (1) tax calculation—VAT rounding, country rules, GL account mapping; (2) payment gateway routing and FX logic; (3) reconciliation GL codes and historical invoice handling. If all three clear, the play holds. If even one is currency-entangled, the effort balloons fast and the legacy-system-deprecation wedge argument collapses. Growth Optimist in me still sees the upside, but the cost of being wrong (compliance exposure, operational burden, sloppy decimal arithmetic from 2009) is high enough to demand a pre-flight audit on those three layers, not post-launch discovery.

### Pros

- Legacy financial systems routinely hide currency logic in tax, rounding, and reconciliation layers despite surface appearance of currency-agnosticism.
  - evidence: Legacy financial systems routinely hide currency logic in tax, rounding, and reconciliation layers despite surface appearance of currency-agnosticism. (vault://tech/flywheel/flywheel-ideas/obs-003-multi-currency (corpus analysis))
- 2009-era billing systems have fragile decimal handling that fails under stricter rounding rules.
  - evidence: 2009-era billing systems have fragile decimal handling that fails under stricter rounding rules. (vault://tech/flywheel/flywheel-ideas/obs-003-multi-currency (known risk pattern))

### Cons

- Tax calculation logic (VAT rounding, country-specific rules, GL account mapping) is not actually currency-agnostic and requires schema or calculation changes.
- Payment gateway integration has implicit USD routing or validation logic that breaks on EUR.
- Reconciliation GL codes or historical invoice handling requires migration work not accounted for in the minimal-touch estimate.
- Compliance exposure from operating multi-currency system without full controls audit.
- Decimal precision / rounding edge cases in 2009-era code fail under EUR strictness.
- Fragile: The formatter-only assumption is only as strong as the audit that found it. If the audit missed tax or reconciliation entanglement, effort escalates.
- Fragile: Wedge-to-deprecation only works if EUR launch is smooth; a botched launch kills the narrative and hardens legacy system's permanence.
- Fragile: TAM upside (EU market) assumes conversion rate from invoicing capability to actual revenue; feature doesn't sell itself.

---

## claim-004 — growth-optimist

**Confidence:** 0.58
**Source view(s):** view-xw3uqBRs

### Claim

I still lean in favor of the decision, but more conditionally than in Pass 1. Adding EUR beside USD without rewriting a 2009 invoice generator is exactly the sort of narrow intervention that can unlock European revenue, reduce buyer friction, and generate learning far faster than a platform rebuild. If the team can keep the change set thin, this is a high-upside way to extend the life of a legacy asset.

The whole case turns on `asm-JCY5PVZk`, and that assumption deserves a harder attack than I gave it before. "Currency assumptions live mostly in formatting" is plausible, but legacy billing systems often hide currency coupling in rounding behavior, tax summaries, credit memo logic, exports, reconciliation jobs, dunning, and downstream integrations. If any of those paths implicitly assume USD semantics, then the effort is not a display-layer patch; it becomes a distributed correctness project. That would materially weaken my support.

My revised optimistic view is: proceed, but only if EUR is framed as a constrained operating mode rather than full multi-currency generality. One currency per invoice, explicitly defined rounding rules, no mixed-currency adjustments, and a limited customer cohort would preserve most of the upside while containing blast radius. The idea is still attractive because the upside is real, but it is only attractive if `asm-JCY5PVZk` survives end-to-end validation outside the invoice PDF itself.

### Pros

- The plan explicitly rests on an audit finding that hardcoded currency assumptions are concentrated in display/formatting and that the core data layer is currency-agnostic.
  - evidence: The plan explicitly rests on an audit finding that hardcoded currency assumptions are concentrated in display/formatting and that the core data layer is currency-agnostic. (citation: user-provided decision context for obs-003-multi-currency)
- The declared load-bearing assumption states that data, tax, and reconciliation layers require no schema or logic changes for EUR.
  - evidence: The declared load-bearing assumption states that data, tax, and reconciliation layers require no schema or logic changes for EUR. (citation: declared assumption asm-JCY5PVZk in user-provided decision context)
- The historical decision status at decision time was adopted.
  - evidence: The historical decision status at decision time was adopted. (citation: user-provided decision context for obs-003-multi-currency)

### Cons

- Hidden USD assumptions outside rendering, especially in tax, reconciliation, credit-note, export, or reporting paths, make `asm-JCY5PVZk` false in practice.
- A constrained EUR launch still creates operational mismatch if support, finance, or downstream integrations treat EUR invoices as exceptions rather than first-class flows.
- Fragile: The upside remains attractive only if most EUR demand can be captured with a narrow 'one currency per invoice' model rather than true multi-currency workflow support.
- Fragile: The audit finding is valuable only if it was validated through end-to-end invoice lifecycle tests, not just code inspection.

---

## claim-005 — growth-optimist

**Confidence:** 0.75
**Source view(s):** view-pvrDmk7Z

### Claim

The strategic brilliance of integrating EUR into our venerable ~2009 invoicing system cannot be overstated! This move promises to open up significant global markets and serve our international clientele with greater precision. Focusing on the display and formatting layers, as suggested by the audit, is a testament to agile engineering, allowing us to achieve this expansion without the immense undertaking of a core system rewrite. It's a truly inspired approach to smart growth, poised to enhance our market reach and customer satisfaction considerably.

### Pros

- Hardcoded currency assumptions are concentrated in the display/formatting layer of the legacy invoicing system.
  - evidence: Hardcoded currency assumptions are concentrated in the display/formatting layer of the legacy invoicing system. (obs-003-multi-currency idea description)
- The core data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR.
  - evidence: The core data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR. (asm-JCY5PVZk)

### Cons

- Unforeseen currency-related logic or implicit assumptions within the data, tax, or reconciliation layers of the legacy system.
- Potential for subtle bugs or data integrity issues arising from the interaction between EUR formatting and core system functions.
- Underestimation of the effort required to thoroughly test and validate all EUR-related display, tax, and reconciliation scenarios on a legacy codebase.
- Fragile: The assumption that the 'data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR' is the most vulnerable point; hidden interdependencies could invalidate this.

---

## claim-006 — risk-pessimist

**Confidence:** 0.85
**Source view(s):** view-FEaRmhLB

### Claim

Introducing EUR support into a decade-old invoicing system, without undertaking a comprehensive core rewrite, is an endeavor fraught with considerable peril. The entire strategy hinges precariously on the audit's conclusion that currency-specific logic is confined to the display and formatting layers, with the underlying data, tax, and reconciliation processes being fundamentally currency-agnostic. This assumption, identified as load-bearing, is exceptionally vulnerable.

Legacy systems, particularly those developed around 2009, often contain deeply embedded, implicit dependencies on default currencies that can manifest in subtle, cascading failures. The risk that the audit may have overlooked critical, hardcoded assumptions or indirect relationships within the data, tax, or reconciliation logic is substantial. A seemingly benign alteration in how currency is displayed could inadvertently corrupt financial reporting, trigger incorrect tax calculations, or complicate reconciliation, leading to significant financial discrepancies and potential regulatory non-compliance.

The decision to proceed on the premise of minimal change, rather than a more robust architectural solution, significantly increases the system's fragility and the likelihood of unforeseen bugs and financial errors emerging post-implementation. The potential for these issues to go undetected until a critical financial reporting cycle or audit is particularly concerning, given the system's age and likely lack of comprehensive, up-to-date automated test coverage for such edge cases. The long-term maintenance burden and technical debt accrued by patching such a critical system in this manner will likely outweigh any short-term cost savings from avoiding a rewrite.

### Pros

- Hardcoded currency assumptions in the legacy invoicing system are concentrated in the display / formatting layer; the data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR.
  - evidence: Hardcoded currency assumptions in the legacy invoicing system are concentrated in the display / formatting layer; the data, tax, and reconciliation layers are currency-agnostic and require no schema or logic changes for EUR. (Declared assumptions: [asm-JCY5PVZk, load-bearing])
- The legacy invoicing system was built around 2009.
  - evidence: The legacy invoicing system was built around 2009. (Decision context)

### Cons

- Financial reporting corruption due to unaddressed currency logic.
- Inaccurate tax calculations leading to legal/financial penalties.
- Reconciliation failures between different currency transactions.
- System fragility and introduction of subtle, hard-to-debug bugs.
- Increased long-term maintenance burden and technical debt.
- Potential for regulatory non-compliance.
- Fragile: The system's data, tax, and reconciliation layers are entirely currency-agnostic and require no schema or logic changes for EUR.
- Fragile: Concentrating currency assumptions solely in the display/formatting layer is a safe and sufficient architectural constraint.
- Fragile: A strategy of minimal change on a legacy system of this age is inherently low-risk.

---
