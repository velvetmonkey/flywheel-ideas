---
type: council_view
session_id: sess-EGg1M5Bb
idea_id: idea-fFBmkB8n
model: claude
persona: risk-pessimist
persona_name: Risk Pessimist
mode: steelman
prompt_version: 1.1.0
persona_version: 1.0.0
input_hash: 'sha256:5c22f272396bb7c5c327f887ddde74b3292ce9221addd23a006654a5c5a804bd'
failure_reason: null
confidence: 0.43
---
## Revised stance (Pass 2)

The assumption narrowly held — EUR invoices shipped, basic reconciliation balanced. But the steelman conflates operational success with architectural validation. Here's the risk: legacy systems are empirically tangled; 'works in year 1' does not prove 'data layer is currency-agnostic.' The audit found hardcoded currency logic *concentrated* in display — but 'concentrated' ≠ 'absent from core.' Tax and reconciliation assumed to be currency-agnostic is a leap: rounding rules differ per currency (USD 2 decimals, JPY none), VAT thresholds are jurisdiction-specific, and reconciliation assumes ledger entries are tagged correctly. If hardcoded USD was embedded in account mapping or rounding tables, the core claim fails. The 12-month outcome is a narrow validation: EUR invoices render; reconciliation balanced. But we don't know if the team tested mixed-currency ledgers at scale, handled edge cases (€0.01 with 25% VAT), or stress-tested concurrency. The system could be held together by patches, manual corrections during reconciliation, or luck (small transaction volume, no genuine mixed-currency scenarios yet). One year in a 15-year-old codebase is a small sample. Hidden assumptions are the default in legacy billing systems. Month 18 or month 36 might reveal rounding bugs, reconciliation failures, or tax-calculation edge cases that the year-1 rollout didn't expose.

**Confidence:** 0.43

## Initial stance (Pass 1)

The assumption holds. Audit findings + 12-month successful outcome confirm hardcoded currency logic is concentrated in display/formatting. Here's why: (1) 2009-era systems at scale almost always underwent separation-of-concerns refactor cycles. By 2010s, the pattern was mainstream — data logic separate from presentation. A 15-year-old live system that's still billing means it was architected to survive currency variations. (2) Tax and reconciliation logic is mathematically currency-agnostic. VAT/GST is a percentage applied to an amount. The amount is stored as a neutral number (cents or decimals). The engine doesn't care if that amount is denominated in USD, EUR, or GBP — it multiplies the same way. Reconciliation is balance-matching, not currency-specific arithmetic. (3) The 12-month outcome proves it: EUR rolled out, invoices render, tax calculations landed, reconciliation balanced. That only happens if the core assumption was true. The team traced data flow (likely via code audit + test execution) and found: amounts stored as numeric fields (no currency enum), tax logic applied to those numbers (no hardcoded rates or rounding rules per-currency), and currency formatting concentrated in display functions (locale-aware symbol/decimal rendering). This is textbook billing-system architecture.

## Key risks

- Rounding-rule hardcoding: USD is 2 decimals; next currency (JPY, CHF, BHD) may have different precision requirements, forcing core changes
- Reconciliation 'balanced' via undisclosed normalization: system may silently convert EUR→USD at fixed rate for ledger matching, hiding multi-currency incompatibility
- Account mapping as hidden currency hardcoding: if ledger schema maps amount to 'USD revenue account,' multi-currency support requires account revaluation at every transaction—scalability breaks
- Edge-case rounding failures: very small amounts (€0.01) combined with high-tax jurisdictions (25% VAT) may surface precision bugs not caught in year-1 testing
- Mixed-currency ledger never tested: all EUR invoices may be converted to USD upstream; genuine multi-currency reconciliation may fail when attempted

## Fragile insights

- Assumption that 'tax/reconciliation logic is mathematically currency-agnostic' omits jurisdiction-specific VAT thresholds, rounding rules per currency, and ledger-entry tagging requirements
- Claim that 'a 15-year-old live system at scale almost always underwent separation-of-concerns refactor cycles' is backwards: most legacy billing systems are tangled; that this one was clean enough to avoid rewrite is surprising and should trigger skepticism, not confidence
- Equating 'successful EUR rollout in year 1' with 'validated currency-agnostic architecture' ignores that patches, manual corrections, or narrow test scenarios (single-currency-per-invoice only) could explain the outcome

## Assumptions cited

- `asm-JCY5PVZk`

## Metacognitive reflection

- **Could be wrong if:** The system is genuinely architected for currency abstraction: ledger entries store amount + currency separately; rounding logic is parameterized per currency; tax calculation is jurisdiction-aware; reconciliation operates on currency-tagged balances. In that case, the year-1 outcome validates the assumption and adds a third currency is indeed isolated to display. We'd find this out by: (1) inspecting ledger schema (does it have a currency column?), (2) testing month-end close with mixed-currency transactions at 10k+ scale, (3) adding GBP and confirming no core changes needed.
- **Most vulnerable assumption:** `asm-JCY5PVZk itself — the claim that 'data, tax, and reconciliation layers are currency-agnostic.' Success in year 1 validates the narrow claim ('USD assumptions don't block EUR rollout') but not the broad claim ('the architecture is truly currency-agnostic'). Hidden assumptions in rounding tables, account mapping, or VAT logic could still exist, invisible to a surface audit and untripped by EUR-only ledgers in year 1.`
- **Confidence rationale:** 0.43 reflects: (1) the system did roll out and reconcile, a non-trivial positive signal (+0.3), (2) legacy systems are empirically hard and year-1 success is a small sample in a 15-year codebase (−0.25), (3) 'concentrated in display' is an audit snapshot, not a proof of absence from core (−0.15), (4) no evidence of stress-testing mixed-currency scenarios or edge cases (−0.10), (5) rounding/VAT/account-mapping assumptions unvalidated (−0.07). Not lower because the operational outcome is real and the audit probably caught obvious USD hardcoding. Not higher because legacy-system risk is structural.

## Evidence

- "Legacy systems rarely undergo clean refactors; architectural tangles are the default" — empirical pattern in billing-system audits; the fact Lumeyra's system was rewrite-free is itself a red flag
- "Rounding rules and VAT thresholds differ per currency (JPY: 0 decimals, USD: 2, CHF: varies; VAT caps per region)" — ISO 4217, OECD tax code; if hardcoded rounding per USD in core, adding GBP/JPY forces logic changes
- "'Reconciliation balanced' does not prove multi-currency logic is correct; could reflect narrow testing, manual corrections, or use of fixed-rate conversion to USD" — accounting-system failure modes; common to observe balance-sheet balance via offset accounts or GL normalization that masks currency incompatibility
