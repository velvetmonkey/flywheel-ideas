# flywheel-ideas

**A local-first assumption ledger that shows what is still live, what broke, and what else now needs review.**

flywheel-ideas runs as an MCP server against your Obsidian vault. It captures decisions as assumptions, records dated evidence, and logs what actually happened. The important part is propagation: when `outcome.log` refutes an assumption, every dependent idea is flagged with `needs_review`.

The current proof surface is **company tracking**. It turns public SEC 10-K and 10-Q filings into an assumption ledger: recurring issuer-disclosed risks become current bets, later mentions become dated observations, and explicit realized-risk language becomes a review queue. Nothing counts as pass/fail until you accept a staged candidate through `company.apply_outcomes`, which uses the same `outcome.log` path as manual decisions.

## What It Does

- **Decision ledger:** `idea.create`, `assumption.declare`, `council.run`, `outcome.log`.
- **Company tracker:** `company.track` scans public-company filings and turns recurring risks into current bets.
- **Visibility report:** `idea.report({ report_kind: "sec_company" })` shows current bets, review queue, accepted verdicts, and dependent ideas needing review.
- **Outcome loop:** strict realized-risk detections are staged first; only accepted outcomes become pass/fail verdicts.
- **Vault-native storage:** notes stay as Markdown in your vault, with `ideas.db` as the local index.
- **Multi-model dissent:** council runs can dispatch to `claude`, `codex`, and `gemini` CLIs.

## Where The Value Exists

This is not SEC search, a stock picker, or a claim that filings independently prove reality. Existing tools already summarize and search filings. The value here is the lifecycle: evidence stays attached to assumptions, outcomes change assumption status, and refutations propagate to related decisions.

```text
SEC filings -> dated observations -> current bets -> review queue -> accepted outcomes -> needs_review propagation
```

A live AAPL/MSFT/NVDA dogfood run showed the scale of the workflow: 125 filings over 10 years compressed into 36 tracked company/theme assumptions, 2,192 dated observations, 36 staged outcome candidates, and 22 review events.

Example lifecycle:

- A filing discloses a recurring theme such as NVIDIA supply/demand risk. That becomes an open assumption: a current bet.
- Later filings add dated observations to the same assumption instead of creating disconnected notes.
- If a later filing says NVIDIA incurred a charge because demand diminished, that excerpt is grouped into the outcome review queue with its SEC source URI.
- If you accept it, `company.apply_outcomes` calls `outcome.log`, refutes the linked assumption, and flags dependent ideas for review.

## The Main Workflow

### Track Companies

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

This creates a company tracker run:

- scans SEC filings
- extracts eligible Risk Factors and MD&A sections
- groups recurring themes such as supply chain, competition, demand, liquidity, and regulation
- creates idea and assumption records
- records dated observations for each recurring theme
- stages strict realized-risk outcome candidates
- writes Markdown and JSON reports under `reports/`

Review the result:

Tool: `company`

```json
{
  "action": "report",
  "run_id": "run-...",
  "format": "both"
}
```

Or read the operator-facing ledger view:

Tool: `idea`

```json
{
  "action": "report",
  "report_kind": "sec_company",
  "run_id": "run-..."
}
```

The report leads with current bets, staged review events, accepted pass/fail verdicts, and dependent ideas that now need review.

Apply reviewed outcomes:

Tool: `company`

```json
{
  "action": "apply_outcomes",
  "run_id": "run-...",
  "min_confidence": 0.9,
  "confirm": true
}
```

`company.track` does **not** directly mutate assumption status from detected outcomes. Only `company.apply_outcomes` calls `outcome.log`.

### Track Your Own Decisions

Tool: `idea`

```json
{
  "action": "create",
  "title": "Move billing to usage-based pricing",
  "body": "Decision context...",
  "context": {
    "situational_context": "Planning Q3 pricing work",
    "expected_outcome": "Higher expansion revenue without raising churn"
  }
}
```

Tool: `assumption`

```json
{
  "action": "declare",
  "idea_id": "idea-...",
  "context": "In mid-market accounts",
  "challenge": "buyers are used to seat-based pricing",
  "decision": "usage-based pricing will map better to value",
  "tradeoff": "billing predictability gets worse",
  "load_bearing": true
}
```

Tool: `council`

```json
{
  "action": "run",
  "id": "idea-...",
  "mode": "pre_mortem",
  "depth": "light",
  "confirm": true
}
```

Tool: `outcome`

```json
{
  "action": "log",
  "idea_id": "idea-...",
  "text": "Expansion improved, but churn rose in small accounts.",
  "refutes": ["asm-..."]
}
```

## Install

Requirements:

- Node.js 22+
- an MCP-aware client
- an Obsidian vault or Markdown folder
- `flywheel-memory` installed for the same vault
- at least two of `claude`, `codex`, and `gemini` on `PATH` if you want council runs

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

For live SEC scans, set a clear user agent:

```bash
export FLYWHEEL_IDEAS_IMPORT_NETWORK=1
export FLYWHEEL_IDEAS_SEC_USER_AGENT="your-app-name contact: you@example.com"
```

## Tool Surface

### Tool: `company`

- `action: "track"` scans companies and writes a tracker run.
- `action: "read"` reads the latest or selected run.
- `action: "report"` returns report paths and structured data.
- `action: "apply_outcomes"` logs reviewed staged outcomes.

### Tool: `idea`

- actions: `create`, `read`, `list`, `transition`, `forget`, `freeze`, `list_freezes`, `ancestry`, `descendants`, `shared_assumptions`, `export`, `report`

### Tool: `assumption`

- actions: `declare`, `list`, `lock`, `unlock`, `signposts_due`, `forget`, `radar`, `extension_set`, `extension_get`

### Tool: `council`

- actions: `run`, `delta`, `effectiveness_report`, `approval_status`

Council modes include `standard`, `pre_mortem`, `steelman`, and `anti_portfolio`.

### Tool: `outcome`

- actions: `log`, `read`, `list`, `undo`, `memo_upsert`

### Tool: `import`

- actions: `scan`, `promote`, `list`, `read`, `reject`

Built-in adapters:

- `sec-company`: SEC 10-K/10-Q company tracker primitive
- `github-repo-adr`: Konflux-style ADR repositories
- `github-structured-docs`: PEP/RFC-style markdown trees
- `csv-corpus`: JSONL decision corpora

## Reports And Artifacts

Company tracker reports are written to:

```text
reports/company-tracker-<run_id>.md
reports/company-tracker-<run_id>.json
```

Decision portfolio exports are written through `idea.export`.

SEC ledger visibility is available through `idea.report({ report_kind: "sec_company" })`.

Private idea context is stored in the DB sidecar and is excluded from exports unless `include_private_context: true` is passed.

## Evidence

The original decision-loop claim was tested against public historical corpora:

- Python 2 to 3 cite-rate pilot: [`pilot/RESULT.md`](./pilot/RESULT.md)
- SEC and ADR readability wedges: [`pilot/RESULT.wedges.md`](./pilot/RESULT.wedges.md)

Those evaluations show that the council can often identify load-bearing assumptions in known decision records. They do not prove market demand, investment value, or that the system improves every real-world decision.

## Useful Docs

- Import and company tracker details: [`docs/import.md`](./docs/import.md)
- Council behavior and CLI notes: [`docs/council.md`](./docs/council.md)
- Memory bridge setup: [`docs/memory-bridge.md`](./docs/memory-bridge.md)
- Release notes: [`CHANGELOG.md`](./CHANGELOG.md)
- Release process: [`RELEASE.md`](./RELEASE.md)

## Packages

| Package | Purpose |
|---|---|
| `@velvetmonkey/flywheel-ideas` | MCP server |
| `@velvetmonkey/flywheel-ideas-core` | Internal core library |

## License

Apache 2.0. See [`LICENSE`](./LICENSE).
