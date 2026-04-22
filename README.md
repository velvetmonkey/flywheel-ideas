# flywheel-ideas

**Track why you believed a bet, challenge it, and learn if it was right.**

A local-first *falsifiable* decision ledger for your Obsidian vault. Every idea becomes a tracked object with a lifecycle state machine, a declared-assumption ledger, a multi-model AI council that stress-tests the assumptions, and an outcome log that refutes broken assumptions and automatically flags every dependent idea for re-review. The vault compounds. Six months from now, it catches the assumption that failed.

[![license: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#roadmap)

> **Status:** pre-alpha, under active development. v0.1 in progress.

## Who this is for

- Solo founders making product, pricing, GTM, and hiring bets
- Staff+ / principal engineers making architecture and platform bets
- Consultants, investors, and researchers who revisit *why* they believed something

If you've ever made a consequential decision and six months later couldn't articulate the assumption that turned out wrong — this is for you.

## The loop

```
idea.create                          # "Should we switch to event-driven architecture?"
   ↓
assumption.declare                   # "In the context of X, facing Y, we assume Z, accepting W"
   ↓
council.run(pre_mortem)              # Real multi-model dissent attacks the assumptions
   ↓
idea.transition → committed          # You made the call
   ↓
outcome.log(refutes: [A1, A3])       # Later: reality arrived
   ↓
Every idea in your vault that relied on A1 or A3 is flagged for re-review.
```

That's the product. Everything else supports this loop.

## What makes it different

| | What it really does | The actual gap we fill |
|---|---|---|
| Notion / Jira Product Discovery | Manual idea capture + AI features | Cloud-only; no dissent; no outcome loop |
| Log4brains / adr-tools | ADRs in git | Post-hoc records; no live dissent |
| LangGraph / CrewAI | Stateful agent orchestration frameworks (with memory) | Developer libraries, not products; no vault-native decision ontology |
| autodecision | Persona deliberation + persistent runs in `~/.autodecision/` | Siloed from your knowledge graph; single-model; no outcome loop into the runs |
| obsidian-agent-client / EchoVault / PKM Assistant | AI agents in Obsidian | Plumbing; no decision ledger |

The gap nobody fills: **a local, vault-native, human-readable decision ledger with falsifiable assumptions and outcome-driven refutation propagation.**

## How it works

**Ideas are markdown notes.** Frontmatter tracks id, state, declared assumptions, lineage. The vault is source of truth; `ideas.db` is an index.

**Writes go through flywheel's shared orchestration.** Artifacts are indexed immediately — visible in flywheel-memory's search with no watcher delay. If the preferred write path isn't available, we fall back cleanly (MCP-subprocess to flywheel-memory; direct fs with a warning).

**The council is a subprocess dispatcher.** `council.run(idea_id, depth, mode)` spawns parallel child processes — one per `(model, persona)` cell — shelling out to your installed CLIs with explicit consent. Concurrency capped. Failures classified (timeout / auth / rate-limit / parse / exit-nonzero); one cell failing never aborts the session. Each cell runs a mandatory two-pass self-critique. Views persist as markdown; template synthesis distills them with evidence citations.

**Outcomes refute assumptions.** `outcome.log(refutes: [...])` marks assumptions refuted and flags every dependent idea. `outcome.log.undo` reverses if you logged by mistake. This is the compounding mechanism.

**Every response teaches you the next move.** `{result, next_steps}` — the tool surface is the onboarding flow.

## Quickstart

**Prerequisites**

- Node.js 22+
- Obsidian vault with [flywheel-memory](https://github.com/velvetmonkey/flywheel-memory) initialized *(recommended — degrades gracefully without it, but the compounding mechanism works best when writes are fully indexed)*
- One or more of `claude`, `codex`, `gemini` CLIs on `$PATH`
- `VAULT_PATH` env var pointing at your vault (no hardcoded paths)

**Install**

```bash
npm install @velvetmonkey/flywheel-ideas
```

**Wire into your MCP client**

```json
{
  "mcpServers": {
    "flywheel-ideas": {
      "command": "npx",
      "args": ["flywheel-ideas-mcp"],
      "env": { "VAULT_PATH": "/path/to/your/vault" }
    }
  }
}
```

**First flow**

```
> idea.create({title: "Move subsystem X to event-driven architecture"})
> assumption.declare({
    idea_id: "idea-abc",
    context: "current synchronous design",
    challenge: "ops burden of cross-service debugging",
    decision: "events worth the tradeoff",
    tradeoff: "observability cost",
    load_bearing: true
  })
> council.run({id: "idea-abc", mode: "pre_mortem", confirm: true})
> idea.transition({id: "idea-abc", to: "committed", reason: "council confirmed; A1 still load-bearing"})

# ... 9 months later ...
> outcome.log({
    idea_id: "idea-abc",
    text: "Migration completed. Observability cost was 3x forecast; debugging time dropped 40%. A2 refuted — cost model was wrong. A1 validated.",
    refutes: ["asm-2"], validates: ["asm-1"]
  })
# → automatically flags 3 other ideas in the vault that cited asm-2.
```

## Tool surface (v0.1)

### `idea`

- `create({title, body?})` / `read(id)` / `list({state?, limit?})` / `transition({id, to, reason?})`

### `assumption`

- `declare({idea_id, text? | structured, signpost_at?, signpost_reason?, load_bearing?})` / `list({idea_id})`
- `lock({idea_id})` / `unlock({idea_id})` — OSF-style pre-registration
- `signposts_due({window?})` — sweep for elapsed signposts (fed into `next_steps`)

### `council`

- `run({id, depth: "light"|"full", mode: "standard"|"pre_mortem", confirm})` / `view(view_id)` / `list({idea_id})`

### `outcome`

- `log({idea_id, text, refutes?: [asm_ids], validates?: [asm_ids]})` / `list({idea_id?})` / `undo(outcome_id)`

## Roadmap

### v0.1 — the closed loop *(in progress)*

The core product: four MCP tools forming `idea → assumption → council → outcome → propagation`.

- ✅ **`idea`** — `create · read · list · transition · forget`. Lifecycle state machine (8 states), atomic DB + frontmatter transitions with rollback-on-failure, stale-row filtering, `next_steps` guidance for every state.
- ✅ **`assumption`** — `declare · list · lock · unlock · signposts_due · forget`. Y-statement structured input OR free text, OSF-style pre-registration lock, load-bearing tagging, signpost-based re-evaluation surfacing.
- ⏳ **`council`** — multi-model subprocess dispatcher (claude/codex/gemini × five personas), two-pass metacognitive structure, structured evidence citations, template synthesis. *Ships across M6–M11.*
- ⏳ **`outcome`** — refutation propagation (the compounding mechanism), reversible via undo. *Ships at M12.*

Also shipping during v0.1: real `claude -p` end-to-end in CI (M13) and the install-time custom-categories integration (M14).

### v0.2 — depth on the loop + closing the feedback loop

`idea.freeze` / `council.freeze` (OSF snapshot) · metric & guardrail fields on assumptions · RAND ABP shaping + hedging actions · **Assumption Radar** (semantic vault-wide signal detection) · daily-note outcome capture · automated signpost surfacing · agent-driven outcome detection · lifecycle enforcement · `decision_delta` view · digest · lineage queries · steelman council mode · Anti-Portfolio pass memos · Ollama / LM Studio local models

### v0.3+ — operator calibration

Obsidian plugin · personal calibration dashboard (Brier trend) · persona effectiveness A/B · exportable decision portfolios · state-of-mind context capture (Farnam Street) · Brier-scored assumption updating

### Long-term

Your vault becomes an empirical record of your predictions. Personal calibration emerges over years. Cross-idea reasoning flags assumption conflicts across your roadmap. A community benchmark — seeded with the author's own historical decisions — lets anyone compare council quality.

## Design principles

- **Vault is source of truth.** `ideas.db` is an index.
- **Every response carries `next_steps`.** The tool surface teaches itself.
- **No auto-transitions, no auto-decisions.** User writes the final rationale; council provides dissent, never verdict.
- **Explicit consent per MCP spec.** Subprocess spawns + vault writes require approval; dispatches are audited.
- **Reversibility.** Outcomes can be undone; refutation propagation unwinds.
- **Single write path across the flywheel family** — writes go through `vault-core` orchestration when available.
- **Graceful degradation.** If the preferred write path isn't available, we fall back cleanly.
- **No LLM SDK lock-in.** Uses whatever CLIs you have on `$PATH`.
- **Apache 2.0.** No viral reach.
- **Tested hard.** Unit · property-based · integration · real `claude -p` e2e in CI with flake-aware demotion.

## Ecosystem

- **[vault-core](https://github.com/velvetmonkey/vault-core)** — shared core library (authoritative vault-write orchestration)
- **[flywheel-memory](https://github.com/velvetmonkey/flywheel-memory)** — vault indexing MCP
- **flywheel-ideas** *(this repo)* — decision ledger

## License

Apache 2.0. See [LICENSE](./LICENSE).
