---
type: council_view
session_id: sess-fJfkPe4J
idea_id: idea-fFBmkB8n
model: codex
persona: risk-pessimist
persona_name: Risk Pessimist
mode: pre_mortem
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:a0b655c541e3d725f8594e3faf6228bdaa2b59145fad83a66825e8a18953b42e'
failure_reason: null
confidence: 0.68
---
## Revised stance (Pass 2)

Twelve months later, this failed because asm-JCY5PVZk was comforting but too strong to survive production reality. The audit likely found the visible currency seams and then promoted that local observation into a system-wide truth. In a legacy invoicing platform from roughly 2009, currency is rarely just presentation; it tends to leak into rounding behavior, default precision, reporting assumptions, payment matching, and quiet operator workflows that were never modeled as part of the change.

Attack the first clause explicitly: hardcoded currency assumptions were not actually concentrated in display and formatting. They were merely easiest to observe there. The missed risk is under-discovery in low-traffic or off-happy-path flows: credit notes, partial refunds, aging reports, CSV exports, statement generation, manual adjustment screens, scheduled jobs, and downstream scripts. EUR then exposed inconsistent totals, rounding drift, or disagreement between UI, PDF, and exported data, which is enough to make finance distrust the system.

Attack the second clause explicitly: the data, tax, and reconciliation layers were not truly currency-agnostic just because the schemas looked generic. If amounts were stored without explicit currency identity, if VAT logic assumed USD-style precision or aggregation behavior, or if reconciliation matched by amount without strong currency partitioning, EUR created silent corruption rather than loud failure. That kind of failure is operationally worse: reports become unreliable, exceptions accumulate, and staff build spreadsheet workarounds that hide the extent of the defect.

Attack the final clause explicitly: the claim that EUR required no schema or logic changes was probably the project's most dangerous simplification. Once that boundary was declared, contradictory evidence would have been treated as edge-case cleanup instead of a signal that currency belongs in the domain model. The strongest counter-argument against my Pass 1 view is that the audit may have been mostly correct and failure instead came from rollout discipline, downstream integrations, or weak end-to-end testing. Even then, the downside case is similar: the decision underweighted domain-boundary verification and overtrusted a narrow audit.

**Confidence:** 0.68

## Self-critique (Pass 2)

Pass 1 was too certain that hidden USD semantics existed throughout the stack. That is a plausible legacy failure pattern, but I inferred it from system age and the strength of the assumption, not from direct code, schema, or incident evidence. I also bundled several different failure modes together and may have overstated how many would break at once.

The counter-argument I had not surfaced clearly enough is that asm-JCY5PVZk could be materially correct inside the legacy application, while failure still occurs at interfaces the audit did not treat as core scope: accounting exports, ERP import rules, finance operations, or testing gaps around month-end close. In that version, the problem is less 'the assumption was false everywhere' and more 'the assumption was too narrow to carry the decision.'

## Initial stance (Pass 1)

Twelve months later, this failed because the central premise in asm-JCY5PVZk was wrong in the most dangerous way: it was true enough to pass an audit, but false in production. The team found visible currency formatting hooks and mistook them for the whole problem. In a 2009 legacy invoicing system, currency is rarely just a symbol; it leaks into rounding rules, default precisions, tax calculations, invoice numbering conventions, export files, reconciliation heuristics, and every downstream assumption that "amount" implicitly means USD. EUR support then shipped as a surface patch over hidden USD semantics.

Attack the first half of asm-JCY5PVZk directly: hardcoded currency assumptions were not actually concentrated in display and formatting. They were merely easiest to see there. The failure mode is classic legacy under-discovery: the audit sampled code paths that render invoices, but missed dormant branches, batch jobs, manual correction flows, credit-note generation, aging reports, CSV exports, and integrations with accounting tooling. Once real EUR invoices hit those paths, amounts were rounded inconsistently, totals no longer matched line-item sums in edge cases, and operators lost trust because "the same invoice" produced different values depending on where it was viewed or exported.

Attack the second half of asm-JCY5PVZk directly: the data, tax, and reconciliation layers were not meaningfully currency-agnostic, even if their schemas looked generic. Currency agnosticism requires persisted currency codes, exchange-rate provenance where needed, precision rules, invariant checks against cross-currency aggregation, and reconciliation logic that never matches or offsets amounts across currencies by accident. If any of those were implicit or omitted, EUR introduced silent corruption rather than loud failure: VAT reports mixed currencies, reconciliation queues filled with false exceptions, partial payments became ambiguous, and finance teams created manual workarounds outside the system. That is the sort of failure that arrives late, after customer-facing launch, when rollback is expensive.

The final reason this failed is governance. "No schema or logic changes" was treated as a constraint to preserve delivery speed, so contradictory evidence was rationalized away instead of escalating to redesign. That pushed the team toward conditional patches around the invoice generator rather than a hard admission that currency is a domain property, not a formatting concern. The project therefore did not fail because EUR is hard; it failed because the decision framework made the cheapest hypothesis load-bearing and then optimized execution around not disproving it.

## Key risks

- Hidden USD semantics outside rendering paths cause inconsistent totals or rounding once EUR hits low-traffic workflows.
- Currency-agnostic-looking data and reconciliation logic silently mix USD and EUR in reports, payment matching, or tax handling.
- The 'no schema or logic changes' constraint suppresses escalation and turns contradictory evidence into patchwork.

## Fragile insights

- That absence of explicit currency modeling in core layers implies latent single-currency behavior rather than genuinely segregated processing.
- That reconciliation and tax failures would arise from the same root cause instead of separate operational defects.
- That the original audit sampled too little of the real execution surface to justify a system-wide conclusion.

## Assumptions cited

- `asm-JCY5PVZk`

## Metacognitive reflection

- **Could be wrong if:** I would materially revise downward if there were direct evidence that EUR was modeled or effectively partitioned end-to-end: consistent UI/PDF/export totals, explicit currency identity or equivalent segregation in persisted invoice/payment flows, separate reconciliation behavior by currency, and multiple close cycles completed without manual finance workarounds.
- **Most vulnerable assumption:** `asm-JCY5PVZk`
- **Confidence rationale:** Moderate rather than high. The declared assumption is unusually broad for a legacy billing change, so it is a credible failure candidate, but the evidence here is only the decision brief and assumption text, not code inspection, test artifacts, or postmortem data.

## Evidence

- "The adopted plan was to add EUR support to a legacy invoicing system without rewriting the core invoice generator." — citation: user brief for obs-003-multi-currency
- "The declared load-bearing assumption states that hardcoded currency assumptions are concentrated in display/formatting and that data, tax, and reconciliation layers are currency-agnostic and need no schema or logic changes for EUR." — citation: declared assumption asm-JCY5PVZk in user brief
