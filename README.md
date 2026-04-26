# flywheel-ideas

**Track why you believed a bet, challenge it, and learn if it was right.**

A local-first *falsifiable* decision ledger for your Obsidian vault. Every idea becomes a tracked object with a lifecycle state machine, a declared-assumption ledger, a multi-model AI council that stress-tests the assumptions, and an outcome log that refutes broken assumptions and automatically flags every dependent idea for re-review. The vault compounds. Six months from now, it catches the assumption that failed.

[![npm version](https://img.shields.io/npm/v/@velvetmonkey/flywheel-ideas.svg)](https://www.npmjs.com/package/@velvetmonkey/flywheel-ideas)
[![license: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![status: stable](https://img.shields.io/badge/status-stable-blue.svg)](#roadmap)

> **Status:** v0.2.0 GA on `latest` (the pre-registered cite-rate pilot on Python 2→3 hit 100% session / 79% per-persona — see [pilot/RESULT.md](./pilot/RESULT.md)). v0.2.1 (csv-corpus import adapter) staged on `main`. CI runs lint, npm-audit, build, core + mcp-server tests, and a Node 22/24 × ubuntu/windows matrix; live `claude -p` E2E ran as the v0.1 GA dogfood + v0.2 cite-rate pilot, not as continuous CI.

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

**Writes go through flywheel-memory when available.** On startup, the server probes for a flywheel-memory MCP subprocess. If found, every idea / assumption / outcome / council artifact lands via flywheel-memory's `note` + `vault_update_frontmatter` tools — indexed the moment it's written, no watcher delay. If flywheel-memory is unreachable, the server falls back to direct filesystem writes with `gray-matter`; every response's `write_path` field reports the active tier (`mcp-subprocess` or `direct-fs`).

**The council is a subprocess dispatcher.** `council.run(idea_id, depth, mode)` spawns parallel child processes — one per `(model, persona)` cell — shelling out to your installed CLIs with explicit consent. Concurrency capped. Failures classified (timeout / auth / rate-limit / parse / exit-nonzero); one cell failing never aborts the session. Each cell runs a mandatory two-pass self-critique. Views persist as markdown; template synthesis distills them with evidence citations.

**Outcomes refute assumptions.** `outcome.log(refutes: [...])` marks assumptions refuted and flags every dependent idea. `outcome.log.undo` reverses if you logged by mistake. This is the compounding mechanism.

**Every response teaches you the next move.** `{result, next_steps}` — the tool surface is the onboarding flow.

## Quickstart

**Prerequisites**

- Node.js 22+
- Obsidian vault with [flywheel-memory](https://github.com/velvetmonkey/flywheel-memory) initialized *(preferred — when present, it becomes the active write path so notes are indexed instantly. Without it, the server falls back to direct filesystem writes; the compounding loop still works but indexing is on flywheel-memory's normal cadence.)*
- One or more of `claude`, `codex`, `gemini` CLIs on `$PATH`
- `VAULT_PATH` env var pointing at your vault (no hardcoded paths)

**Install**

The `flywheel-ideas` MCP server runs as a subprocess launched by your MCP
client (Claude Desktop, Claude Code, Cursor, etc.). You don't need to `npm
install` it globally — `npx` will fetch + cache it on first use.

Grant approval for council dispatch *out-of-band* (the LLM cannot grant it
itself):

```bash
# Session-scoped (recommended while getting started)
export FLYWHEEL_IDEAS_APPROVE=session
# Persistent across restarts — edit <vault>/.flywheel/ideas-approvals.json manually
```

**Wire into your MCP client** (example `mcp.json` entry):

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

The `-y` flag auto-accepts the initial `npx` download prompt. After the
first run the server is cached locally; subsequent launches are instant.

Prefer a global install? `npm install -g @velvetmonkey/flywheel-ideas`,
then point the MCP client at `flywheel-ideas-mcp` directly.

When a v0.2 pre-release train starts, opt in via the `@alpha` dist-tag
(e.g. `npx -y @velvetmonkey/flywheel-ideas@alpha`). The `latest` tag
always tracks the most recent stable.

See [CHANGELOG.md](./CHANGELOG.md) for what's new in each release.

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

## Tool surface

Five MCP tools, action-dispatched. Every response carries `{result, next_steps, write_path}`.

### `idea` (v0.1 + v0.2 lineage)

- `create({title, body?})` / `read(id)` / `list({state?, limit?})` / `transition({id, to, reason?})` / `forget(id)`
- `freeze({id})` / `list_freezes({id})` — OSF-style snapshot of an idea + its locked assumptions
- `ancestry({id})` / `descendants({id})` / `shared_assumptions({ids})` — lineage queries

### `assumption` (v0.1 + v0.2 RAND ABP)

- `declare({idea_id, text? | structured, signpost_at?, signpost_reason?, load_bearing?})` / `list({idea_id})` / `forget(id)`
- `lock({idea_id})` / `unlock({idea_id})` — OSF-style pre-registration
- `signposts_due({window?})` — sweep for elapsed signposts (fed into `next_steps`)
- `radar({query | idea_id})` — semantic vault-wide scan for unstated load-bearing claims
- `extension_set({id, shaping_actions?, hedging_actions?})` / `extension_get({id})` — RAND Assumption-Based Planning shaping + hedging actions

### `council` (v0.1 + v0.2 delta)

- `run({id, depth: "light"|"full", mode: "standard"|"pre_mortem"|"steelman", confirm})` / `view(view_id)` / `list({idea_id})`
- `delta({id})` — what's changed across council sessions for the same idea
- `approval_status` — read-only inspection of the out-of-band consent state

### `outcome`

- `log({idea_id, text, refutes?: [asm_ids], validates?: [asm_ids]})` / `read(id)` / `list({idea_id?})` / `undo(outcome_id)`

### `import` (v0.2 — bulk corpus ingestion)

- `scan({adapter, source, idea_id?, filter?})` — adapter scans a corpus, persists candidates with dedup against the vault.
- `promote({candidate_id, as: 'idea'|'assumption'|'outcome', target_idea_id?, override_duplicate?})` / `list({source_id?, state?})` / `read(id)` / `reject(id)`
- Adapters:
  - `github-structured-docs` (v0.2 GA) — RFC-822-headered markdown trees like Python PEPs. Source: `owner/repo`, `owner/repo@ref`, or `owner/repo:path/`.
  - `csv-corpus` (v0.2.1) — JSONL. Paste any decision corpus into a `.jsonl` file (one decision per line, `{decision_id, title, body, assumptions: [...]}`) and run a council against it. Source: absolute path or `file://` URL.

## Roadmap

### v0.1 — the closed loop *(shipped 2026-04-23)*

The core product: four MCP tools forming `idea → assumption → council → outcome → propagation`.

- ✅ **`idea`** — `create · read · list · transition · forget`. Lifecycle state machine (8 states), atomic DB + frontmatter transitions with rollback-on-failure, stale-row filtering, `next_steps` guidance for every state.
- ✅ **`assumption`** — `declare · list · lock · unlock · signposts_due · forget`. Y-statement structured input OR free text, OSF-style pre-registration lock, load-bearing tagging, signpost-based re-evaluation surfacing.
- ✅ **`council`** — multi-model subprocess dispatcher + deterministic synthesis.
  - ✅ M6: approval / dispatch-log plane (out-of-band consent; LLM cannot self-grant)
  - ✅ M7: CLI characterization + error classifier (claude/codex/gemini quirks catalogued)
  - ✅ M8: real claude dispatcher, 2 personas, single-pass, deterministic `SYNTHESIS.md`, pre_mortem mode
  - ✅ M9: two-pass metacognitive + codex dispatch + concurrency limiter
  - ✅ M10: gemini dispatch + full matrix (3 × 5 = 15 cells) + CLI-interleaved concurrency + strict benign-stderr filter
  - ✅ M11: evidence-aware synthesis with sentence-level Jaccard agreement/disagreement sections
- ✅ **`outcome`** — refutation propagation (the compounding mechanism), reversible via undo. Shipped at M12.
- ✅ **memory-bridge** — flywheel-memory custom-category registration on startup (M14, v0.1 alpha.3). Path-security + maxBuffer + frontmatter-sync hardening shipped in v0.1 alpha.4. Consolidation (`needs_review` filter, model_version capture, comment sweep) shipped in v0.1 alpha.5.

**v0.1.0 GA shipped 2026-04-23.** Items that were carrying out of v0.1 GA, resolved or deferred:
- ✅ **`clis` arg passthrough on `council.run`** — shipped; the v0.2 pilot uses `PILOT_CLIS=claude,gemini` to drop codex, and `council.run({clis: [...]})` honours the subset.
- ◐ **CLI-error classifier `auth` pattern** — captured during the v0.1 GA dogfood ([docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md)); `rate_limit` still TODO until a real failure sample shows up.
- ⛔ **Real `claude -p` E2E in CI with flake-aware demotion** — explicitly *not* pursued as continuous CI. The hermeticity / cost / flake trade-off is unfavourable for a per-PR job. Live-CLI coverage instead lives in the v0.1 GA dogfood + the v0.2 cite-rate pilot — see "Tested hard" in [Design principles](#design-principles).

### v0.2 — depth on the loop + closing the feedback loop *(GA shipped 2026-04-26)*

Retrieval-native council input, lineage queries (`ancestry` / `descendants` / `shared_assumptions`), `idea.freeze` (OSF snapshot), `assumption.radar`, `council.delta`, steelman mode, RAND-style shaping/hedging actions, bulk import (`import.scan` / `promote`), temporal insights in the evidence pack, flywheel-memory as the active write path. Schema v2 → v8. Pre-registered cite-rate pilot on Python 2→3 passed with 100% session / 79% per-persona (see [pilot/RESULT.md](./pilot/RESULT.md)). Full release notes: [CHANGELOG.md](./CHANGELOG.md).

### v0.2.1 — staged on `main`

- ✅ Pilot generalization — `decision_pep` → `decision_id` rename + `--corpus <path>` flag on the pilot scripts (corpus shape no longer assumes PEP).
- ✅ `csv-corpus` import adapter — JSONL wedge-test tool. Paste any corpus into a `.jsonl` and run a council against it.

### Next gate — wedge tests

Three falsification probes designed before any further widening claims: train-data leakage probe (synthetic-vs-famous corpora, ±10pp pre-registered threshold), domain readability spot-checks (SEC 10-K Item 1A + ADR markdown), ADR superseded-by census across 12 OSS repos. Design + reproducibility: [pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md). Verdicts pending council runs.

### Carry-over from v0.2 GA

- ⏳ Anti-Portfolio pass memos · Ollama / LM Studio local models · daily-note outcome capture · agent-driven outcome detection.

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
- **Single write path when flywheel-memory is present** — writes route through flywheel-memory's MCP tools so artifacts are indexed instantly.
- **Graceful degradation.** Without flywheel-memory, the server falls back to direct filesystem writes; `write_path` on every response surfaces the active tier.
- **No LLM SDK lock-in.** Uses whatever CLIs you have on `$PATH`.
- **Apache 2.0.** No viral reach.
- **Tested hard.** Unit · property-based · integration via vitest. CI runs lint, npm-audit, build, core + mcp-server suites, and a Node 22/24 × ubuntu/windows full matrix. Live `claude -p` end-to-end ran during the v0.1 GA dogfood ([docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md)) and the v0.2 cite-rate pilot ([pilot/RESULT.md](./pilot/RESULT.md)) — not as continuous CI.

## Ecosystem

- **[flywheel-memory](https://github.com/velvetmonkey/flywheel-memory)** — vault indexing MCP. When installed, becomes the active write path (alpha.5+) so flywheel-ideas artifacts are indexed instantly.
- **[vault-core](https://github.com/velvetmonkey/vault-core)** — shared core library used by flywheel-memory. Library-level reuse from flywheel-ideas (Option B) is on the long-term roadmap; for now flywheel-ideas ships its own writer + the MCP-subprocess bridge.
- **flywheel-ideas** *(this repo)* — decision ledger

## Packages

This repo publishes two npm packages. Most users only interact with the first:

| Package | Purpose | Users |
|---|---|---|
| [`@velvetmonkey/flywheel-ideas`](https://www.npmjs.com/package/@velvetmonkey/flywheel-ideas) | The MCP server users add to their client config | End users |
| [`@velvetmonkey/flywheel-ideas-core`](https://www.npmjs.com/package/@velvetmonkey/flywheel-ideas-core) | Internal domain library the server depends on | Transitive |

Release + publish workflow: see [RELEASE.md](./RELEASE.md).

## License

Apache 2.0. See [LICENSE](./LICENSE).
