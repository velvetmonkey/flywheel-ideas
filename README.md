# flywheel-ideas

**Track your bets, preserve the evidence, and learn when reality proves you wrong.**

When decisions go wrong, the useful evidence usually gets scattered: the original bet, what you believed, what happened later, which related decisions now need review, and what lesson should carry forward. `flywheel-ideas` keeps that lifecycle together inside your Markdown vault.

The core loop is simple:

```text
bet -> evidence over time -> possible failure -> accepted outcome -> lesson -> related bets to review
```

This is a general decision and assumption tracker. The strongest current proof is the company thesis report, which uses SEC filings as a hard test corpus: lots of dated evidence, repeated assumptions, later realized-risk language, and a deterministic readout of what still needs human judgment.

## What It Does

- Tracks decisions as explicit bets and load-bearing assumptions.
- Attaches new evidence to existing assumptions instead of creating disconnected notes.
- Shows which bets are still live.
- Stages possible failures for human review instead of auto-declaring verdicts.
- Logs accepted outcomes as pass/fail evidence.
- Captures durable lessons from failed assumptions.
- Flags related ideas when a shared assumption fails.

The product value is not "AI reads documents." The value is a durable trail from belief to evidence to outcome to lesson.

For public companies, the main artifact is now a personal-investor thesis report. It does not say "buy" or "sell." It shows the live assumptions your company thesis depends on, where similar assumptions failed before, what needs review, and what to watch next.

## Worked Example: Three Companies Over Ten Years

The SEC dogfood run tracked AAPL, MSFT, and NVDA across 10 years of 10-K and 10-Q filings.

```text
125 filings
  -> 36 tracked company/theme assumptions
  -> 2,192 dated observations
  -> 36 staged outcome candidates
  -> 22 review events
  -> 9 accepted failures after curated review
  -> 9 lesson memos
```

Before review, the tool had not claimed anything had failed. It had created visibility: 36 current bets and a review queue.

After accepting three representative review groups, the ledger changed:

- Current bets dropped from 36 to 29.
- Accepted failures rose from 0 to 9.
- Lesson memos rose from 0 to 9.
- Review work remaining dropped from 22 events to 19.

See [`docs/sec-lifecycle-dogfood.md`](./docs/sec-lifecycle-dogfood.md) for the run details and [`scripts/sec-lifecycle-dogfood.mjs`](./scripts/sec-lifecycle-dogfood.mjs) for the reproducible driver.

## Concrete Examples

### NVIDIA: Demand Became Inventory Risk

- **Bet:** NVIDIA could manage demand and inventory/channel risk without material disruption.
- **Evidence:** Filings repeatedly disclosed demand, supply, and channel risks.
- **Failure event:** NVIDIA later disclosed that H20 export-license restrictions contributed to a $4.5B excess inventory and purchase-obligation charge after H20 demand diminished.
- **Lesson:** Geopolitical access constraints can turn demand risk into inventory write-down risk before the commercial opportunity fully disappears.

### Apple: Supply, Channel, And Demand Failed Together

- **Bet:** Apple could manage supply-chain, channel, and geopolitical disruption without material disruption.
- **Evidence:** Filings repeatedly disclosed dependence on global manufacturing, logistics, retail stores, and channel partners.
- **Failure event:** Apple disclosed COVID-era manufacturing and logistics disruption, temporary iPhone supply shortages, worldwide sales effects, and retail/channel closures.
- **Lesson:** A distributed hardware business can see supply, channel, and demand assumptions fail together when a shock closes both factories and points of sale.

### Microsoft: AI/Cloud Upside Had Cost Drag

- **Bet:** Microsoft could manage AI, R&D, and cloud/data-center capacity investment without material disruption.
- **Evidence:** Filings repeatedly disclosed compute capacity, AI talent, cloud infrastructure, and technology investment risks.
- **Failure event:** Microsoft disclosed operating expense growth driven by Gaming impairment-related expenses and continued investment in compute capacity, AI talent, and data.
- **Lesson:** AI and cloud capacity bets should track both strategic upside and the impairment/opex drag created when adjacent hardware or gaming assumptions weaken.

The Microsoft example is intentionally weaker than the NVIDIA and Apple examples. It is a useful cost/impairment signal, not a clean strategic thesis failure. The point is that the system makes review judgment explicit instead of pretending every detected event is equally strong.

## What Is Novel Here?

Existing tools can search filings, summarize documents, manage notes, or run an AI critique. `flywheel-ideas` is different because it connects the lifecycle:

- A bet stays linked to its evidence over time.
- A later outcome can change the status of the original assumption.
- A failed shared assumption can flag related ideas for review.
- A lesson memo turns a one-off failure into reusable judgment.
- The report separates current bets, pending review work, accepted failures, and missing lessons.

In short: it compounds judgment. The database is not just a pile of notes; it remembers what you believed, what reality later said, and what else that should cause you to revisit.

## What It Is Not

- Not a stock picker.
- Not SEC search.
- Not a claim that filings independently prove business reality.
- Not an AI summarizer with a nicer UI.
- Not an automated verdict engine. Outcomes are staged first and accepted by a human.

## How To Run The Company Tracker

Tool: `company`

```json
{
  "action": "track",
  "companies": ["AAPL", "MSFT", "NVDA"],
  "years": 10,
  "forms": ["10-K", "10-Q"],
  "confirm": true
}
```

This scans SEC filings, extracts eligible Risk Factors and MD&A sections, groups recurring themes, records dated observations, stages strict realized-risk candidates, and writes reports under `reports/`.

Read the ledger view:

```json
{
  "action": "report",
  "report_kind": "thesis",
  "run_id": "run-..."
}
```

Use `report_kind: "tracker"` for the detailed audit report. The thesis report is the investor-readable decision-support view; the tracker report is the lower-level evidence ledger.

Apply reviewed outcomes:

```json
{
  "action": "apply_outcomes",
  "run_id": "run-...",
  "outcome_candidate_ids": ["cout-..."],
  "confirm": true
}
```

`company.track` never mutates assumption status directly. Only `company.apply_outcomes` logs accepted outcomes.

## Track Your Own Decisions

The same lifecycle works for private product, engineering, or personal decisions:

```text
create idea -> declare assumptions -> gather evidence -> log outcome -> write lesson -> review related ideas
```

The basic tools are:

- `idea`: create, read, list, export, and report on decisions.
- `assumption`: declare and manage load-bearing assumptions.
- `outcome`: log what happened, mark assumptions validated/refuted, and write lesson memos.
- `company`: run the SEC company tracker proof surface.
- `council`: optional advanced review when you want model-assisted critique.
- `import`: ingest structured external decision corpora.

Detailed tool examples live in [`docs/import.md`](./docs/import.md), [`docs/outcome.md`](./docs/outcome.md), and [`docs/council.md`](./docs/council.md).

## Install

Requirements:

- Node.js 22+
- an MCP-aware client
- an Obsidian vault or Markdown folder
- `flywheel-memory` installed for the same vault
- a clear SEC user agent if running live SEC scans

Example MCP config:

```json
{
  "mcpServers": {
    "flywheel-ideas": {
      "command": "npx",
      "args": ["-y", "@velvetmonkey/flywheel-ideas"],
      "env": {
        "VAULT_PATH": "/path/to/your/vault",
        "FLYWHEEL_IDEAS_APPROVE": "session"
      }
    }
  }
}
```

`flywheel-memory` is a required peer dependency. If it is missing or unreachable, the server fails at startup instead of silently writing around the index.

For live SEC scans:

```bash
export FLYWHEEL_IDEAS_IMPORT_NETWORK=1
export FLYWHEEL_IDEAS_SEC_USER_AGENT="your-app-name contact: you@example.com"
```

## Reports And Artifacts

Company tracker reports are written to:

```text
reports/company-tracker-<run_id>.md
reports/company-tracker-<run_id>.json
reports/company-thesis-<run_id>.md
reports/company-thesis-<run_id>.json
```

The Markdown reports are Flywheel notes with `type: report`; tracker reports use `report_kind: sec_company_tracker`, and thesis reports use `report_kind: company_thesis`. Production writes go through flywheel-memory markup/linking. JSON reports remain raw machine-readable artifacts.

SEC ledger visibility is available through `idea.report({ report_kind: "sec_company" })`.

Decision portfolio exports are written through `idea.export`.

Private idea context is stored in the DB sidecar and is excluded from exports unless `include_private_context: true` is passed.

The May 2026 SEC dogfood generated several local raw report bundles under `/home/ben/sec-dogfood/`. The repo intentionally checks in the reproducible driver and the lifecycle readout, not every generated vault/report copy.

## Evidence And Limits

The original decision-loop claim was tested against public historical corpora:

- Python 2 to 3 cite-rate pilot: [`pilot/RESULT.md`](./pilot/RESULT.md)
- SEC and ADR readability wedges: [`pilot/RESULT.wedges.md`](./pilot/RESULT.wedges.md)
- SEC lifecycle dogfood: [`docs/sec-lifecycle-dogfood.md`](./docs/sec-lifecycle-dogfood.md)

Those evaluations show that the system can identify and track load-bearing assumptions in known decision records and public filings. They do not prove market demand, investment value, or that the system improves every real-world decision.

## Packages

| Package | Purpose |
|---|---|
| `@velvetmonkey/flywheel-ideas` | MCP server |
| `@velvetmonkey/flywheel-ideas-core` | Internal core library |

## License

Apache-2.0
