---
id: company-run-sec-10y-100-company-candidate-noise
type: report
report_kind: company_candidate_noise
schema: sec-company-ledger-markdown-v1
run_id: sec-10y-100-company
entity_id: company-run-sec-10y-100-company-candidate-noise
entity_type: company_candidate_noise
source: flywheel-ideas
date: '2026-05-08'
created: '2026-05-08T16:38:07.578Z'
---
# Candidate Noise sec-10y-100-company

This page explains staged outcome candidates that are not in the active human review queue.

## Summary

- Staged candidates total: 31
- Visible review candidates: 0
- Suppressed candidates: 31
- Suppressed because the linked assumption is already refuted: 31
- Suppressed because the linked assumption is otherwise closed: 0
- Suppressed for other grouping reasons: 0

## Why This Matters

- [[reports/company-runs/sec-10y-100-company/review-queue|Human review queue]] is the active judgment surface, not every raw staged candidate.
- A staged candidate tied to an already-refuted assumption is duplicate pressure, not a new open decision.
- Keeping the count visible prevents the dashboard from hiding noise while avoiding repeated human review of the same failed assumption.

## Examples

- **NVDA / Supply chain** (cout-eGqEKVbF)
  - Reason: linked assumption is already refuted
  - Assumption: asm-iGQnHDHS (refuted)
  - Source: sec-company://0001045810/0001045810-20-000065#part-i-item-2:theme:supply-chain:outcome
  - Evidence: During the first quarter of fiscal year 2021, we experienced disruptions to our supply chain and logistical services provided by outsourcing partners and component supply, primarily based in Asia. These disruptions adve…
- **NVDA / Supply chain** (cout-pAypMBtb)
  - Reason: linked assumption is already refuted
  - Assumption: asm-iGQnHDHS (refuted)
  - Source: sec-company://0001045810/0001045810-20-000065#part-ii-item-1a:theme:supply-chain:outcome
  - Evidence: impact, our workforce and operations, the operations of our customers and our partners, and those of our respective vendors and suppliers (including our subcontractors and third-party contract manufacturers). For exampl…
- **MSFT / AI, R&D, and technology** (cout-h4HuM9Cw)
  - Reason: linked assumption is already refuted
  - Assumption: asm-e7XCszRn (refuted)
  - Source: sec-company://0000789019/0001564590-18-019062#item-7:theme:ai-rd-technology:outcome
  - Evidence: Operating income increased $2.9 billion or 11%, primarily due to higher gross margin and lower impairment and restructuring expenses, offset in part by an increase in research and development and sales and marketing exp…
- **MU / Demand** (cout-XaZnFr8J)
  - Reason: linked assumption is already refuted
  - Assumption: asm-PNGucCzS (refuted)
  - Source: sec-company://0000723125/0000723125-21-000012#part-i-item-2:theme:demand:outcome
  - Evidence: The ultimate severity and duration of these economic repercussions, including any resulting impact on our business, remain largely unknown and ultimately will depend on many factors. As a result, we have experienced vol…
- **MU / Inventory and channel** (cout-svAshmvZ)
  - Reason: linked assumption is already refuted
  - Assumption: asm-mohAyweE (refuted)
  - Source: sec-company://0000723125/0000723125-21-000052#part-i-item-2:theme:inventory-channel:outcome
  - Evidence: In the third quarter of 2021, we recognized a charge of $435 million included in restructure and asset impairments (and a tax benefit of $104 million included in income tax (provision) benefit) to write down the assets …
- **MU / Inventory and channel** (cout-iM8KYY62)
  - Reason: linked assumption is already refuted
  - Assumption: asm-mohAyweE (refuted)
  - Source: sec-company://0000723125/0000723125-21-000065#item-7:theme:inventory-channel:outcome
  - Evidence: the expected consideration, net of estimated selling costs, to be realized from the sale of these assets and liabilities. In the second quarter of 2021, we also recognized a charge of $49 million to cost of goods sold t…
- **MU / Inventory and channel** (cout-tcEdEDqs)
  - Reason: linked assumption is already refuted
  - Assumption: asm-mohAyweE (refuted)
  - Source: sec-company://0000723125/0000723125-22-000048#item-7:theme:inventory-channel:outcome
  - Evidence: In 2021, we recognized a charge of $435 million included in restructure and asset impairments in connection with the definitive agreement with TI (and a tax benefit of $104 million included in income tax (provision) ben…
- **MU / AI, R&D, and technology** (cout-j3YJZLsU)
  - Reason: linked assumption is already refuted
  - Assumption: asm-o5RkVgmn (refuted)
  - Source: sec-company://0000723125/0000723125-23-000022#part-i-item-2:theme:ai-rd-technology:outcome
  - Evidence: We expect the plan to be substantially completed by the end of the third quarter of 2023. As a result of the 2023 Restructure Plan, we expect to realize cost savings of approximately $130 million per quarter (approximat…

## Flywheel Audit

```flywheel-audit-json
{
  "schema": "sec-company-ledger-markdown-v1",
  "run_id": "sec-10y-100-company",
  "entity_id": "company-run-sec-10y-100-company-candidate-noise",
  "entity_type": "company_candidate_noise",
  "path": "reports/company-runs/sec-10y-100-company/candidate-noise.md"
}
```
