# flywheel-ideas

**A local-first decision ledger that turns messy evidence into falsifiable bets, accepted outcomes, and reusable lessons.**

`flywheel-ideas` is for people who make judgment calls and want a memory that compounds. It keeps the original bet, the assumptions behind it, the evidence that arrives later, the human verdict on whether the bet failed, and the lesson that should change future decisions.

The core loop is simple:

```text
bet -> evidence over time -> possible failure -> accepted outcome -> lesson -> related bets to review
```

This is a general decision and assumption tracker. The strongest current proof is the company thesis report, which uses SEC filings as a hard test corpus: lots of dated evidence, repeated assumptions, later realized-risk language, and a deterministic readout of what still needs human judgment.

The headline proof: the repo now contains a browsable 10-year SEC evidence corpus with 55 accepted failures, each linked to its original assumption and lesson memo. Start here: [`Company Sector Run`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/index.md).

If you are evaluating whether this is actually novel, read [`docs/sec-corpus-walkthrough.md`](./docs/sec-corpus-walkthrough.md). It walks through the strongest checked-in examples and separates real product value from ordinary SEC search or summarization.

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

The next product surface is a compounding SEC ledger: start 10 years back, process 10-K and 10-Q filings in chronological order, and refresh the same ledger instead of creating a fresh dated dataset every time. The point is not a bigger pile of filing summaries. The point is a long-lived memory of what each company appeared to be betting on, where those assumptions accumulated pressure, which failures were accepted by a human, and which lessons should change future review.

## Current Evidence: A 10-Year Company Memory

The current SEC proof corpus is a Markdown-only evidence snapshot at [`evidence/sec-company-ledgers/sec-10y-100-company`](./evidence/sec-company-ledgers/sec-10y-100-company/). It is generated from a local compounding ledger without committing SQLite state.

Start with the top-down table of contents:

- [`dashboard.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/dashboard.md) gives the one-page thesis dashboard: what failed, what remains live, and what needs review.
- [`index.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/index.md) links the whole run.
- [`thesis.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/thesis.md) shows current bets, accepted failures, unresolved review work, and what to watch next.
- [`review-queue.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/review-queue.md) shows the remaining human adjudication work.
- [`accepted-lessons.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/accepted-lessons.md) shows the durable lessons created after outcome review.

```text
1,468 SEC filings
  -> 361 current company/theme bets
  -> 486 shadow LLM evaluations
  -> 55 accepted failures after curated review
  -> 55 lesson memos
  -> 253 rejected candidate outcomes
  -> 24 remaining human review events
```

Those accepted outcomes are not just summaries. The tool linked later filing evidence back to earlier assumptions, staged possible failures, required explicit human acceptance, changed the assumption status, recorded lesson memos, and regenerated the navigable Markdown reports.

Representative accepted failures now include export-control inventory charges, quantified cybersecurity breach costs, market exits, investment impairments, debt-extinguishment losses, platform access restrictions, and travel-demand collapse. The remaining queue is still visible rather than hidden: 24 review events need adjudication before they become accepted outcomes.

This is decision support, not investment advice. The value is the auditable lifecycle: what the thesis depended on, what later evidence challenged, what the human accepted, and what lesson should change future review.

The sector-scale SEC driver is [`scripts/sec-sector-lifecycle-bundle.mjs`](./scripts/sec-sector-lifecycle-bundle.mjs). It writes a linked report bundle with sector pages, company pages, theme pages, and cross-sector mechanism patterns so shared assumptions are not just keyword matches.

## Killer Feature Examples

### 1. NVIDIA: Export Control Became Inventory Risk

- **Bet:** NVIDIA could manage AI accelerator demand and inventory/channel risk.
- **Evidence:** Filings repeatedly disclosed demand, supply, and channel risks.
- **Failure event:** NVIDIA later disclosed that H20 export-license restrictions contributed to a $4.5B excess inventory and purchase-obligation charge after H20 demand diminished.
- **Lesson:** Geopolitical access constraints can turn demand risk into inventory write-down risk before the commercial opportunity fully disappears.
- **Evidence:** [`out-VxXuqAUS`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-VxXuqAUS.md), [`out-4GsRMjM5`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-4GsRMjM5.md)

### 2. AMD: Policy Shock Became Stranded Inventory

- **Bet:** AMD could manage data-center GPU demand and geopolitics risk.
- **Evidence:** The ledger carried separate assumptions for demand, inventory/channel, geopolitics, and cloud/data-center capacity.
- **Failure event:** AMD later recorded about $800M of inventory and related charges on MI308 products due to new U.S. export restrictions.
- **Lesson:** Export controls can turn a high-growth AI hardware bet into an inventory impairment risk; the ledger should connect geopolitics, capacity, and channel assumptions instead of reviewing them separately.
- **Evidence:** [`out-BqJTAbxZ`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-BqJTAbxZ.md), [`out-dkrWjofL`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-dkrWjofL.md)

### 3. Home Depot: Cyber Risk Became Quantified Cost

- **Bet:** Home Depot could manage cybersecurity and privacy risk without material disruption.
- **Evidence:** Cybersecurity remained a live company/theme assumption until a later filing disclosed realized breach impact.
- **Failure event:** Home Depot disclosed theft of payment-card information and customer emails, $161M of pretax expenses net of expected insurance recoveries, and related litigation exposure.
- **Lesson:** Cybersecurity risk becomes decision-grade when breach disclosure connects unauthorized access to quantified costs, customer data exposure, and follow-on litigation.
- **Evidence:** [`out-btdioMuB`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-btdioMuB.md)

### 4. Meta: Geopolitics Hit Platform Access Before Revenue

- **Bet:** Meta could manage geopolitics/access restrictions without material user-growth disruption.
- **Evidence:** The ledger tracked platform, customer dependency, regulation, demand, and geopolitics assumptions separately.
- **Failure event:** Meta disclosed a slight quarter-over-quarter decline in Family daily active people driven by internet disruptions in Iran and WhatsApp restrictions in Russia.
- **Lesson:** For platform companies, geopolitical risk becomes decision-grade when access restrictions are tied to measured user engagement declines, even before the filing quantifies revenue loss.
- **Evidence:** [`out-aWE2ftCq`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-aWE2ftCq.md)

### 5. Capital Allocation Failures Became Lessons

The corpus now contains several cases where abstract liquidity or capital-allocation risk became concrete:

- Lowe's exited Australia and recorded a $530M impairment: [`out-nzwXFuEc`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-nzwXFuEc.md).
- Altria recorded a $2.5B impairment after an ABI investment decline became other-than-temporary: [`out-V13Rkdgz`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-V13Rkdgz.md).
- TJX recorded a $242M pre-tax loss on early extinguishment of $2B of debt: [`out-51DsRhsa`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-51DsRhsa.md).

These are the killer feature: the tool does not just find the filing sentence. It keeps the earlier bet, the later contradiction, the human verdict, and the lesson together.

## What Is Novel Here?

Existing tools can search filings, summarize documents, manage notes, or run an AI critique. `flywheel-ideas` is different because it connects the lifecycle:

- A bet stays linked to its evidence over time.
- A later outcome can change the status of the original assumption.
- A failed shared assumption can flag related ideas for review.
- A lesson memo turns a one-off failure into reusable judgment.
- The report separates current bets, pending review work, accepted failures, and missing lessons.

In short: it compounds judgment. The database is not just a pile of notes; it remembers what you believed, what reality later said, and what else that should cause you to revisit.

## Compounding SEC Ledger Mode

The company tracker now supports stable ledgers through `ledger_id` and `compound: true`.

```ts
await company.track({
  ledger_id: "sec-10y-100-company",
  compound: true,
  companies: ["AAPL", "MSFT", "NVDA"],
  years: 10,
  forms: ["10-K", "10-Q"],
  confirm: true,
});
```

In compound mode, refreshes reuse prior filings, assumptions, observations, and outcome candidates by source keys. New filings extend the ledger; unchanged filings are not duplicated.

Generated bundle Markdown now includes a linked top-down index, a Markdown manifest, run history, rebuild instructions, and structured `flywheel-audit-json` blocks for Markdown-only evidence snapshots.

Generated idea, assumption, outcome, evaluation, and report notes request Flywheel wikilink markup and outgoing-link suggestions at write time. The SEC corpus does not depend on a later background markup pass to become navigable.

Git evidence snapshots should commit Markdown artifacts only. SQLite databases, JSON reports, JSONL logs, SEC caches, WAL/SHM files, and backups remain local operational state.

## SEC Adjudication Batches

The remaining review queue should be processed in batches, not by hand-picking isolated examples.

```bash
npm run build -w @velvetmonkey/flywheel-ideas-core
node scripts/sec-adjudication-batch.mjs \
  --run-id sec-10y-100-company \
  --limit 20 \
  --batch-id adj-sec-001
```

That writes a Flywheel-linked packet under:

```text
reports/company-runs/sec-10y-100-company/adjudication-batches/<batch-id>.md
```

Add `--export` if you want packet-only generation to refresh the Markdown evidence snapshot immediately. Applying decisions refreshes the export by default.

The packet includes a decisions JSON template. A reviewer fills each group as `accept`, `reject`, or `defer`. Accepted candidates require a structured lesson memo:

```bash
node scripts/sec-adjudication-batch.mjs \
  --run-id sec-10y-100-company \
  --batch-id adj-sec-001 \
  --decisions /path/to/decisions.json \
  --confirm
```

Applying decisions regenerates company reports, writes a decision log Markdown note, refreshes the Markdown-only evidence export, and keeps the remaining staged queue visible.

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
export FLYWHEEL_IDEAS_SEC_CONTACT_EMAIL="you@your-domain.example"
```

`FLYWHEEL_IDEAS_SEC_USER_AGENT` can still override the full header when needed, but it must include a real contact email or project URL. Placeholder agents such as `contact@example.com` are rejected.

## Reports And Artifacts

Company tracker reports are written to:

```text
reports/company-tracker-<run_id>.md
reports/company-tracker-<run_id>.json
reports/company-thesis-<run_id>.md
reports/company-thesis-<run_id>.json
reports/company-runs/<run_id>/index.md
```

The Markdown reports are Flywheel notes with `type: report`; tracker reports use `report_kind: sec_company_tracker`, thesis reports use `report_kind: company_thesis`, and sector bundles use `company_*` report kinds. Production writes request flywheel-memory markup/linking during the write. JSON reports remain raw local machine-readable artifacts and are not part of the committed SEC evidence corpus.

SEC ledger visibility is available through `idea.report({ report_kind: "sec_company" })`.

Decision portfolio exports are written through `idea.export`.

Private idea context is stored in the DB sidecar and is excluded from exports unless `include_private_context: true` is passed.

The May 2026 SEC dogfood generated local raw report bundles under `/home/ben/sec-dogfood/`. The public SEC evidence target is now the stable Markdown-only ledger snapshot at [`evidence/sec-company-ledgers/sec-10y-100-company`](./evidence/sec-company-ledgers/sec-10y-100-company/), generated from the local compounding ledger without committing SQLite state.

## Evidence And Limits

The original decision-loop claim was tested against public historical corpora:

- Python 2 to 3 cite-rate pilot: [`pilot/RESULT.md`](./pilot/RESULT.md)
- SEC and ADR readability wedges: [`pilot/RESULT.wedges.md`](./pilot/RESULT.wedges.md)
- SEC lifecycle dogfood: [`docs/sec-lifecycle-dogfood.md`](./docs/sec-lifecycle-dogfood.md)
- SEC company ledger evidence target: [`evidence/sec-company-ledgers/sec-10y-100-company`](./evidence/sec-company-ledgers/sec-10y-100-company/)

Those evaluations show that the system can identify and track load-bearing assumptions in known decision records and public filings. They do not prove market demand, investment value, or that the system improves every real-world decision.

## Packages

| Package | Purpose |
|---|---|
| `@velvetmonkey/flywheel-ideas` | MCP server |
| `@velvetmonkey/flywheel-ideas-core` | Internal core library |

## License

Apache-2.0
