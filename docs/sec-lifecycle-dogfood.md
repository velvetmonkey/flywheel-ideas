# SEC Lifecycle Dogfood

Run date: 2026-05-01

This dogfood used the 10-year AAPL/MSFT/NVDA SEC company tracker run and then exercised the full lifecycle after PR #49: review staged outcomes, accept a curated subset, write lesson memos, and re-render the SEC ledger report.

The checked-in reproduction driver is [`scripts/sec-lifecycle-dogfood.mjs`](../scripts/sec-lifecycle-dogfood.mjs). It copies a source dogfood vault, applies selected review groups in the copy, writes lesson memos, and emits before/after ledger reports.

Original local artifact path from this run: `/home/ben/sec-dogfood/flywheel-sec-lifecycle-2026-05-01T21-51-52-671Z/`.

Raw generated reports from the exploratory full, strict, and lifecycle SEC runs are stored locally under `/home/ben/sec-dogfood/`. The checked-in material is the durable evidence summary plus the reproduction driver; generated vault copies and report JSON/Markdown bundles are intentionally left out of git.

## Input Run

- Companies: AAPL, MSFT, NVDA
- Source run: `run-JQAXefAj`
- Filings scanned: 125
- Tracked assumptions: 36
- Dated observations: 2,192
- Staged outcome candidates: 36
- Review events: 22

## Before Review

- Current bets: 36
- Accepted failures: 0
- Accepted lessons: 0
- Missing lesson memos: 0
- Triage completion: 0/36 candidates, 0%

At this point the value is visibility, not verdicts: the tool has compressed a 10-year filing corpus into a live assumption ledger and a review queue, but it has not yet said what passed or failed.

## Accepted Review Events

Three review groups were accepted in a copied dogfood vault:

- `og-001` NVDA / Demand, Inventory and channel: H20 export-license restrictions led to a $4.5 billion excess inventory and purchase-obligation charge after demand diminished.
- `og-002` AAPL / Customer and platform dependency, Geopolitics and tariffs, Supply chain: COVID-era disruption created temporary iPhone supply shortages, affected worldwide sales, and closed retail/channel points of sale.
- `og-006` MSFT / AI, R&D, and technology, Cloud and data center capacity: operating expenses increased due to Gaming impairment-related expenses and continued compute capacity, AI talent, and data investment.

The NVDA and AAPL events are strong examples of realized-risk language. The MSFT event is useful but weaker: it is a cost/impairment signal attached to AI/cloud-capacity themes, not a clean strategic thesis failure. That distinction matters because this tool should make review judgment visible rather than pretend every detected event is equally strong.

## After Review

- Current bets: 29
- Review events remaining: 19
- Staged candidates remaining: 27
- Accepted failures: 9
- Accepted lessons: 9
- Missing lesson memos: 0
- Triage completion: 9/36 candidates, 25%

## Lessons Captured

- NVDA: Geopolitical access constraints can turn demand risk into inventory write-down risk before the commercial opportunity fully disappears.
- AAPL: A distributed hardware business can see supply, channel, and demand assumptions fail together when a shock closes both factories and points of sale.
- MSFT: AI and cloud capacity bets should track both strategic upside and the impairment/opex drag created when adjacent hardware or gaming assumptions weaken.

## Product Readout

The novel part is not the SEC data or an AI summary. The useful surface is the lifecycle:

- Filings create dated evidence attached to stable assumptions.
- Review events show where reality may have contradicted those assumptions.
- Accepted outcomes change assumption status from open to failed.
- Lesson memos turn failure into reusable judgment.
- The report separates current bets, remaining review work, accepted failures, and missing lessons.

This README update addresses the first clarity gap by leading with the dogfood examples and explaining what is novel. The remaining product gap is report clarity: the SEC ledger report itself should make the "current bets -> review queue -> accepted failures -> lessons" loop obvious without needing a developer to explain it.
