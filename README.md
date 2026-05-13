<div align="center">
  <img src="header.png" alt="Flywheel" width="256"/>
  <h1>Flywheel Ideas</h1>
  <p><strong>A local-first decision ledger that turns messy evidence into falsifiable bets, accepted outcomes, and reusable lessons.</strong></p>
</div>

`flywheel-ideas` is for people who make judgment calls and want a memory
that compounds. It keeps the original bet, the assumptions behind it,
the evidence that arrives later, the human verdict on whether the bet
failed, and the lesson that should change future decisions.

The core loop:

```text
bet -> assumption -> evidence over time -> possible failure -> accepted outcome -> lesson -> related bets to review
```

The product value is not "AI reads documents." The value is a durable
trail from belief to evidence to outcome to lesson — one that survives
every project switch, every laptop migration, and every notebook lost
to bit rot.

---

## Start here

New? Read **[`docs/QUICKSTART.md`](./docs/QUICKSTART.md)** — install
and walk through one real idea in five minutes. No SEC corpus, no
council dispatch, just `idea.create` → `assumption.declare` →
`outcome.log`.

For the full per-tool reference, read **[`docs/RUNBOOK.md`](./docs/RUNBOOK.md)**.

The rest of this README is the longer-form story: what you actually do
with the tool, what it looks like in use, what compounds over time,
and the public-evidence proof against ten years of SEC filings.

---

## What you actually do with it

Three illustrative use cases. None of them require the SEC corpus or
the council. They are the basic loop you'll run dozens of times before
you reach for anything advanced.

### Personal: "I should replace the thermostat"

```
idea.create({ title: "Replace home thermostat with smart thermostat" })
  → ideas/2026/05/replace-home-thermostat-...md created

assumption.declare({
  idea_id: ...,
  context: "3-bedroom apartment, gas heating",
  challenge: "Pay-back time depends on the device actually changing our heating pattern",
  decision: "Assume year-1 heating bill drops at least 12%",
  signpost_at: "2027-04-01"
})

# ...one year later

outcome.log({
  idea_id: ...,
  text: "Bill went UP 4% — the smart schedule did not match our occupancy",
  refutes: [the assumption id]
})
```

What you now own: a small Markdown record of a real bet you made, the
specific claim it depended on, the date you said to check, and the
outcome with the lesson. Six months from now when you're tempted to buy
the next "smart" device, the ledger surfaces this refuted assumption.

### Professional: an architecture decision

```
idea.create({ title: "Move ingestion pipeline from Kafka to Kinesis" })

assumption.declare({
  idea_id: ...,
  context: "Current Kafka cluster is 4 brokers, 18-month-old version",
  challenge: "Latency under burst load is the differentiator we care about",
  decision: "Assume Kinesis sustains p99 < 150ms at 2x current peak",
  signpost_at: <three months>
})

council.run({ id: ..., depth: "light", mode: "pre_mortem", confirm: true })
  → spawns claude / codex / gemini × 2 personas in parallel
  → writes councils/<idea-id>/session-1/SYNTHESIS.md
  → surfaces dissent BEFORE you commit

idea.transition({ id: ..., to: "committed" })

# ...three months and one incident later

outcome.log({
  idea_id: ...,
  text: "p99 hit 480ms under the Black Friday spike. Failed.",
  refutes: [the latency assumption],
  text_lessons: "Burst-latency claims need synthetic-load evidence, not vendor benchmarks"
})
```

Now: every *other* architecture idea in your ledger that depended on
vendor latency benchmarks is flagged `needs_review`. You see it next
time you run `idea.list({ needs_review: true })`. That's the
compounding mechanism — one accepted failure can flag five related
bets you forgot you made.

### Public evidence: the ten-year SEC ledger

The third use case is the strongest proof: ten years of SEC 10-K and
10-Q filings, processed in chronological order, with later realized
risks tied back to earlier disclosed assumptions through the same
lifecycle. See [The SEC proof corpus](#the-sec-proof-corpus) below for
the full evidence path.

---

## What compounds

The first week: a few isolated `.md` files. Looks like Obsidian notes.

The first month: `idea.list({ needs_review: true })` becomes your most
useful single command. Every accepted refutation cascades — bets you
made in unrelated projects get flagged because they shared an
underlying assumption.

The first quarter: `assumption.signposts_due` starts producing hits.
Each one is a future-dated note to yourself that this is the moment to
check the bet. Re-evaluate, accept or reject, write the lesson.

The first year: `idea.export` gives you a portfolio Markdown of every
decision you logged, with the lesson memos attached. If you logged
nothing, you get nothing. If you logged diligently, the portfolio is
a compounding artifact of how your judgment shifted — searchable,
diffable against an earlier snapshot, shareable as one file.

---

## Two backends

| Backend | Status | What it is | When to use |
| --- | --- | --- | --- |
| `sqlite` (default) | Shipped | Canonical state in `<vault>/.flywheel/ideas.db`, Markdown mirror under `<vault>/ideas/`. Full feature set: council, propagation, lineage, SEC tracker. | Anything where the compounding mechanism matters. The default. |
| `doc` | Designed, in flight | One portable `.md` per idea, no DB. Format is the contract. | Embedding a single decision lifecycle inside another app, sharing one bet outside the ledger, lightweight personal use. |

The doc-mode file contract is fully specified in
[`docs/single-doc-format.md`](./docs/single-doc-format.md). The
parallel-codepath rationale is in
[`docs/consistency.md`](./docs/consistency.md).

---

## Install (short)

Full walkthrough: [`docs/QUICKSTART.md`](./docs/QUICKSTART.md).

```bash
npm install -g @velvetmonkey/flywheel-memory @velvetmonkey/flywheel-ideas
```

Register in your MCP client (Claude Code shown):

```json
{
  "mcpServers": {
    "flywheel-ideas": {
      "command": "flywheel-ideas-mcp",
      "env": {
        "VAULT_PATH": "/path/to/your/vault",
        "FLYWHEEL_IDEAS_APPROVE": "session"
      }
    }
  }
}
```

`flywheel-memory` is a required peer. If it is missing or unreachable,
the server hard-fails at startup with `FlywheelMemoryRequiredError`
rather than silently writing around the index.

For live SEC scans:

```bash
export FLYWHEEL_IDEAS_IMPORT_NETWORK=1
export FLYWHEEL_IDEAS_SEC_CONTACT_EMAIL="you@your-domain.example"
```

---

## The SEC proof corpus

The strongest current proof is a browsable 10-year SEC evidence corpus.
It is not meant to prove the SEC data is novel. It is meant to prove
the lifecycle is useful: old assumptions stay connected to later
evidence, possible failures are staged for review, accepted outcomes
refute assumptions, and lessons survive for future decisions.

The Markdown-only evidence snapshot lives at
[`evidence/sec-company-ledgers/sec-10y-100-company`](./evidence/sec-company-ledgers/sec-10y-100-company/),
generated from a local compounding ledger without committing SQLite
state.

```text
1,468 SEC filings
  -> 349 current company/theme bets
  -> 486 shadow LLM evaluations
  -> 70 accepted failures after curated review
  -> 70 lesson memos
  -> 262 rejected candidate outcomes
  -> 0 remaining human review events
  -> 31 suppressed staged candidates tied to already-refuted assumptions
```

Entry points (in order of "show me the strongest evidence" depth):

- [`dashboard.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/dashboard.md) — one-page view of failed bets, open bets under pressure, lessons, visible review work.
- [`proof-path.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/proof-path.md) — generated reader path through the strongest lifecycle evidence.
- [`docs/sec-corpus-walkthrough.md`](./docs/sec-corpus-walkthrough.md) — skeptical-reader guide to what is novel and what is not.
- [`accepted-lessons.md`](./evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/accepted-lessons.md) — the reusable lessons from accepted failures.

This is decision support, not investment advice. The useful role is
analyst memory: what did the thesis depend on, what later challenged
it, which challenges were accepted, and what should be reviewed next?

### Representative accepted failures

These are the killer feature: the tool does not just find the filing
sentence. It keeps the earlier bet, the later contradiction, the human
verdict, and the lesson together.

**NVIDIA — export control became inventory risk.** Earlier assumption:
NVIDIA can manage AI accelerator demand and inventory risk. Later
disclosure: H20 export-license restrictions contributed to a $4.5B
excess inventory and purchase-obligation charge after H20 demand
diminished. Lesson: geopolitical access constraints can turn demand
risk into inventory write-down risk before the commercial opportunity
fully disappears.
([`out-VxXuqAUS`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-VxXuqAUS.md))

**AMD — policy shock became stranded inventory.** ~$800M of inventory
and related charges on MI308 products due to new U.S. export
restrictions. Lesson: export controls turn high-growth AI hardware
bets into inventory impairment risk; the ledger should connect
geopolitics, capacity, and channel assumptions instead of reviewing
them separately.
([`out-BqJTAbxZ`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-BqJTAbxZ.md))

**Home Depot — cyber risk became quantified cost.** Disclosed theft
of payment-card information and customer emails, $161M of pretax
expenses net of expected insurance recoveries, plus litigation
exposure. Lesson: cybersecurity risk becomes decision-grade when breach
disclosure connects unauthorized access to quantified costs.
([`out-btdioMuB`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-btdioMuB.md))

**Meta — geopolitics hit platform access before revenue.** Disclosed
a slight quarter-over-quarter decline in Family DAP driven by internet
disruptions in Iran and WhatsApp restrictions in Russia. Lesson: for
platform companies, geopolitical risk becomes decision-grade when
access restrictions are tied to measured user engagement declines.
([`out-aWE2ftCq`](./evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-aWE2ftCq.md))

Capital-allocation cases include: Lowe's exit from Australia and the
$530M impairment, Altria's $2.5B ABI investment impairment, TJX's
$242M pre-tax loss on early extinguishment of $2B of debt.

### What is novel here

Existing tools can search filings, summarize documents, manage notes,
or run an AI critique. `flywheel-ideas` is different because it
connects the lifecycle:

- A bet stays linked to its evidence over time.
- A later outcome can change the status of the original assumption.
- A failed shared assumption can flag related ideas for review.
- A lesson memo turns a one-off failure into reusable judgment.
- The report separates current bets, pending review, accepted
  failures, and missing lessons.

It compounds judgment. The database is not just a pile of notes; it
remembers what you believed, what reality later said, and what else
that should cause you to revisit.

---

## Hard product rules

These are non-negotiable and survive every refactor:

- **No auto-transitions.** The user writes the final decision rationale.
- **No auto-decisions.** Council output is dissent, never verdict.
- **Dissent always visible.** Synthesis surfaces disagreement, not consensus-washing.
- **Two-pass metacognitive structure per council cell.** `initial_stance` + `self_critique` + revised `stance` all persisted.
- **Reversibility.** `outcome.log.undo` exists from day one.
- **Every response carries `next_steps`.**
- **No hardcoded paths.** Everything via `VAULT_PATH` env.

---

## What it is not

- Not a stock picker.
- Not an SEC search tool.
- Not an AI summarizer with a nicer UI.
- Not an automated verdict engine — outcomes are staged first and accepted by a human.
- Not a claim that filings independently prove business reality.

---

## Evidence and limits

The decision-loop claim was tested against public historical corpora:

- Python 2 → 3 cite-rate pilot: [`pilot/RESULT.md`](./pilot/RESULT.md)
- SEC and ADR readability wedges: [`pilot/RESULT.wedges.md`](./pilot/RESULT.wedges.md)
- SEC lifecycle dogfood: [`docs/sec-lifecycle-dogfood.md`](./docs/sec-lifecycle-dogfood.md)
- SEC company ledger evidence target: [`evidence/sec-company-ledgers/sec-10y-100-company`](./evidence/sec-company-ledgers/sec-10y-100-company/)

Those evaluations show the system can identify and track load-bearing
assumptions in known decision records and public filings. They do
**not** prove market demand, investment value, or that the system
improves every real-world decision.

---

## Packages

| Package | Purpose |
|---|---|
| `@velvetmonkey/flywheel-ideas` | MCP server (the binary you install + register) |
| `@velvetmonkey/flywheel-ideas-core` | Internal core library (consumed by the MCP server; not a public JS API) |

## The Flywheel Suite

- **[flywheel-memory](https://github.com/velvetmonkey/flywheel-memory)** — local-first MCP server. Hybrid BM25 + semantic search, knowledge graph, safe writes over an Obsidian vault. Required peer dependency of flywheel-ideas.
- **[flywheel-crank](https://github.com/velvetmonkey/flywheel-crank)** — Obsidian plugin. Visual layer over Memory's graph: sidebar, vault health, semantic search UI.
- **flywheel-ideas** *(this repo)* — falsifiable decision ledger. Pre-registered assumptions, multi-model AI council dissent, outcome-driven refutation propagation.
- **[flywheel-geometry](https://github.com/velvetmonkey/flywheel-geometry)** — geodesic retrieval extension. v0.1 pre-registered falsifier **resolved FAIL 2026-05-10** ([postmortem](https://github.com/velvetmonkey/flywheel-geometry/blob/main/docs/trial2-postmortem.md)); successor research lane at [flywheel-concept](https://github.com/velvetmonkey/flywheel-concept).
- **[flywheel-concept](https://github.com/velvetmonkey/flywheel-concept)** — research programme on whether cross-model activations reveal structured concept geometry.

## License

Apache-2.0
