# Quickstart

Install flywheel-ideas, register it with your MCP client, and walk
through your first idea — claim, assumption, verdict — in about five
minutes. No SEC corpus, no council dispatch, no scripts. The default
single-line workflow that you'll repeat for every real decision you log.

## What you'll have at the end

- A working MCP server with the `idea`, `assumption`, `council`,
  `outcome`, `company`, `import`, and `doctor` tools available to
  your AI client.
- One real `.md` idea file on disk, with frontmatter, a declared
  assumption, and an accepted-verdict outcome attached.
- Enough understanding to read [`docs/RUNBOOK.md`](./RUNBOOK.md) for
  the full per-tool reference.

## Prerequisites

- **Node.js 22+** (`node -v` to check).
- **A folder you want to use as a vault.** Any directory works.
  flywheel-ideas writes Markdown into it and stores a SQLite database
  at `<vault>/.flywheel/ideas.db`. Throughout this guide we'll use
  `~/my-vault`.
- **An MCP-aware client.** Claude Code, Codex CLI, or any other client
  that can launch an MCP server over stdio.

You do **not** need: a GitHub account, internet access (until you run
the council tool), the SEC corpus, or any of the dogfood scripts in
`scripts/`. Those are for advanced use later.

## 1. Install

flywheel-ideas requires its sibling [`@velvetmonkey/flywheel-memory`](https://github.com/velvetmonkey/flywheel-memory)
as a peer — the memory server is the bridge that does Markdown reads
and writes against your vault. Install both:

```bash
npm install -g @velvetmonkey/flywheel-memory @velvetmonkey/flywheel-ideas
```

(`npx -y @velvetmonkey/flywheel-ideas` also works for one-off runs,
but registering it with your MCP client is simpler when both binaries
are on `PATH`.)

Confirm the binaries are reachable:

```bash
which flywheel-memory && which flywheel-ideas-mcp
```

## 2. Create the vault folder

```bash
mkdir -p ~/my-vault
```

That's it. No `.flywheel/` subfolder, no `ideas.db`, no `ideas/`
directory. flywheel-ideas creates everything it needs on first run.

## 3. Register the server with your MCP client

### Claude Code

Add an entry to `~/.config/claude/.mcp.json` (or the project-scoped
`.mcp.json` in any folder where you want flywheel-ideas available):

```json
{
  "mcpServers": {
    "flywheel-ideas": {
      "command": "flywheel-ideas-mcp",
      "env": {
        "VAULT_PATH": "/home/you/my-vault",
        "FLYWHEEL_IDEAS_APPROVE": "session"
      }
    }
  }
}
```

Restart Claude Code, or run `/mcp` and confirm `flywheel-ideas`
appears with seven tools (idea, assumption, council, outcome, company,
import, doctor).

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.flywheel-ideas]
command = "flywheel-ideas-mcp"
[mcp_servers.flywheel-ideas.env]
VAULT_PATH = "/home/you/my-vault"
FLYWHEEL_IDEAS_APPROVE = "session"
```

Open a new Codex session and run `/mcp list` to confirm.

### What the env vars mean

| Var | What it does | When to change |
| --- | --- | --- |
| `VAULT_PATH` | Where flywheel-ideas reads and writes. | Per-project: point at any folder you want a separate ledger for. |
| `FLYWHEEL_IDEAS_APPROVE` | Council subprocess approval. `session` grants approval for the lifetime of this MCP server process — never persists. | Keep `session` for the quickstart; you don't run council yet. See [`docs/council.md`](./council.md) for `always` and persistent file modes. |

## 4. Your first idea

Open a chat with your MCP-aware client. The exact UI varies, but every
step below is one tool call your AI agent makes on your behalf — paste
the snippet or describe the action in your own words.

### a. Create the idea

Ask your agent to run:

```
idea.create({
  title: "Replace home thermostat with smart thermostat",
  body: "Current dumb thermostat is fine but I think a smart one will save energy and pay back in under two years."
})
```

What happens on disk:

```
~/my-vault/
├── .flywheel/
│   └── ideas.db                       ← SQLite ledger, created on first call
└── ideas/
    └── 2026/05/
        └── replace-home-thermostat-with-smart-thermostat-<timestamp>.md
```

Open the `.md` file in any editor. You'll see:

```yaml
---
id: idea-<8 chars>
type: idea
state: nascent
title: Replace home thermostat with smart thermostat
created_at: 2026-05-13T...
state_changed_at: 2026-05-13T...
---

# Replace home thermostat with smart thermostat

Current dumb thermostat is fine but I think a smart one will save energy and pay back in under two years.
```

The response from the tool includes the `id` and a `next_steps` list —
every flywheel-ideas response carries one. The next nudge is
`assumption.declare`: every claim depends on something. Declare it.

### b. Declare the load-bearing assumption

```
assumption.declare({
  idea_id: "<the id from step a>",
  context: "Considering a smart thermostat for a 3-bedroom apartment",
  challenge: "Pay-back time depends on whether the device actually changes our heating pattern in winter",
  decision: "Assume the device reduces our heating bill by at least 12% in year 1",
  tradeoff: "If it doesn't, I've spent $250 for negligible savings and one more cloud-connected box",
  signpost_at: "2027-04-01"
})
```

This adds an `assumption-<id>.md` under `ideas/<idea-id>/assumptions/`
and a row in `ideas_assumptions`. The `signpost_at` field is a future
date when the system will surface this assumption for re-evaluation
("did the bet pay off?"). Without signposts, ideas sink into the
ledger and never resurface.

### c. Log the outcome (one year later)

Skip a year. The heating bill in winter actually *increased* 4% because
the smart thermostat's "smart" schedule was wrong for your apartment.

```
outcome.log({
  idea_id: "<the same id>",
  text: "Year-1 heating cost was 4% higher, not 12% lower. The smart schedule did not match our actual occupancy. Disabled the schedule, used it as a dumb thermostat.",
  refutes: ["<the assumption id from step b>"]
})
```

What happens:

- A new `outcomes/<id>.md` records the verdict with the rationale.
- The refuted assumption is marked `status: refuted` in both DB and
  Markdown.
- Any *other* idea in your ledger that cited this same assumption
  gets flagged `needs_review: true` so you'll see it next time you run
  `idea.list({ needs_review: true })`.
- The original idea's state moves to `refuted`.

That last point is the compounding mechanism. As your ledger grows,
one accepted failure can flag five related bets you forgot you made.
That's what you don't get from a notebook.

## 5. Run the consistency check

```
doctor.consistency({})
```

You should see `ok: true` with zero issues. (See
[`docs/consistency.md`](./consistency.md) for what the doctor checks
and how it handles drift.)

## What you skipped (deliberately)

- **`council.run`** — spawning claude / codex / gemini CLIs to attack
  your assumptions in parallel. Requires those binaries installed and
  an approval grant. See [`docs/council.md`](./council.md) when ready.
- **`company.track`** — the SEC company tracker. See
  [`docs/sec-corpus-walkthrough.md`](./sec-corpus-walkthrough.md).
- **`import.scan`** — bulk ingest of decision corpora (PEPs, ADRs,
  CSV/JSONL). See [`docs/import.md`](./import.md).

## Where to go next

- **[`docs/RUNBOOK.md`](./RUNBOOK.md)** — every tool, every action,
  every required and optional argument, with the on-disk artifact
  that lands after each call.
- **[`docs/consistency.md`](./consistency.md)** — the contract for
  how SQLite and Markdown stay in sync, and what the upcoming
  portable doc-mode looks like.
- **[`docs/single-doc-format.md`](./single-doc-format.md)** — spec
  for the one-file-per-idea format that other apps can embed.
- **The README** — the SEC proof corpus showing the lifecycle running
  against ten years of 10-K and 10-Q filings.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `FlywheelMemoryRequiredError` at server start | `flywheel-memory` not on `PATH` | `which flywheel-memory` — if empty, `npm install -g @velvetmonkey/flywheel-memory`. |
| Tool calls succeed but no file appears in `~/my-vault/ideas/` | `VAULT_PATH` env var unset or pointing somewhere else | Check the env block in your `.mcp.json` / `.codex/config.toml`. Restart your client after editing. |
| `council.run` fails with `not_approved` | `FLYWHEEL_IDEAS_APPROVE` not set or set to `never` | Set `FLYWHEEL_IDEAS_APPROVE=session` in the same env block. Restart. |
| `idea.read` returns `stale_row` | The Markdown file was renamed or deleted outside flywheel-ideas | Either `idea.forget` (drop the DB row) or restore the file. |
