# flywheel-ideas

**Track why you believed a bet, challenge it, and learn if it was right.**

A local-first *falsifiable* decision ledger for your Obsidian vault. Every idea becomes a tracked object with a lifecycle state machine, a declared-assumption ledger, a multi-model AI council that stress-tests the assumptions, and an outcome log that refutes broken assumptions and automatically flags every dependent idea for re-review. The vault compounds. Six months from now, it catches the assumption that failed.

[![npm version](https://img.shields.io/npm/v/@velvetmonkey/flywheel-ideas.svg)](https://www.npmjs.com/package/@velvetmonkey/flywheel-ideas)
[![license: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![status: stable](https://img.shields.io/badge/status-stable-blue.svg)](#roadmap)

> **Status:** v0.2.0 GA on `latest`. v0.3.0 (`github-repo-adr` adapter, scoped to konflux-format) staged on `main`.
>
> Two pre-registered evaluations have completed:
> - **v0.2 cite-rate pilot (Python 2→3):** 100% per-session, 79% per-persona ([pilot/RESULT.md](./pilot/RESULT.md))
> - **Phase 3 wedges (leakage probe + cross-domain readability):** GAP +1.1pp (synthetic obscure corpus narrowly *beat* famous post-mortems → reasoning, not recall) · 3/3 SEC 10-K and 3/3 konflux-ci ADR entries surfaced specific operational detail ([pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md))
>
> CI runs lint, npm-audit, build, core + mcp-server tests, and a Node 22/24 × ubuntu/windows matrix. Live `claude -p` end-to-end happens during dogfood + pilot runs, not as continuous CI.

## Who this is for

**Built for *consequential bets* — the decisions you'd want to revisit a year later.** Architecture choices. Pricing model rewrites. Platform migrations. Strategic hiring. Research-direction calls. The kind of decision where "I knew it might fail because of X" is a story you wish you could replay.

- Solo founders making product, pricing, GTM, and hiring bets
- Staff+ / principal engineers making architecture and platform bets
- Consultants, investors, and researchers who revisit *why* they believed something

**It is *not* for routine product backlog or casual brainstorming.** Jira Product Discovery, Notion, and the like already cover that territory; adding a council step to a low-stakes ticket is friction without payoff. The compounding mechanism only earns its keep when the cited assumption matters six months later.

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

## How we know it works

Two pre-registered evaluations, both with their reproducibility scripts checked in.

### v0.2 cite-rate pilot — Python 2→3

**Setup.** Five Python 2→3 decisions whose outcomes are public history (PEP 3000 timeline, PEP 3137 `u''` literals, PEP 0358 bytes formatting, PEP 3131 non-ASCII identifiers, PEP 3105 print function as a control). Each entry declares the load-bearing assumptions historians would later attack. The council is run *blind* (outcomes are not seeded).

**Metric.** Did the council, when asked to critique each decision, name the assumption that history later refuted as the most-vulnerable one? Pre-registered ≥70% session cite rate.

**Result.** 100% per-session, 79% per-persona (49/50 sessions hit; 1 timeout). In sampled prose, the council names PEP 414 explicitly as the historical reversal mechanism *without being told that PEP 414 exists in its prompt context*. Reproducibility: [`pilot/RESULT.md`](./pilot/RESULT.md), reproducibility scripts at [`pilot/seed-corpus.mjs`](./pilot/seed-corpus.mjs) + [`pilot/score-cites-auto.mjs`](./pilot/score-cites-auto.mjs).

### Phase 3 wedges — falsification probes

The python-2-3 result is a real signal, but it's also the kind of signal where the model has read every PEP. Three pre-registered probes were designed to falsify the strongest interpretations *before* widening to additional adapter domains:

| Probe | Question | Pre-registered rule | Result |
|---|---|---|---|
| **3a — leakage** | Is the cite rate measuring *reasoning*, or *training-data recall*? | famous-vs-synthetic GAP ≥ −10pp → reasoning | famous 96.9% per-persona; obscure synthetic 98.0% — GAP **+1.1pp** (obscure marginally *higher* than famous; recall hypothesis rejected) |
| **3b SEC** | Can the council parse SEC 10-K Item 1A risk-factor prose? | ≥2/3 entries cite a specific operational detail | **3/3** — TSMC capacity reallocation 18-24mo; Greater China ~20% revenue; AppleCare+ / iCloud+ as first cuts in credit events |
| **3b ADR** | Can the council parse ADR markdown? | ≥2/3 entries cite the architectural mechanism | **3/3** — kcp APIBinding/APIExport, `TaskRun` sync semantics, the named ADR-0028 5-minute timeout as the load-bearing parameter |
| **3c — ADR census** | Which OSS repos have a coherent supersession arc worth adapter scope? | qualitative survey | konflux-ci/architecture is the only one (12 surveyed) — future github-repo-adr adapter must scope to konflux-format only |

Reproducibility: [`pilot/RESULT.wedges.md`](./pilot/RESULT.wedges.md), corpora at [`pilot/wedge-corpus.*.jsonl`](./pilot/), full council prose preserved in [`pilot/wedge-runs/`](./pilot/wedge-runs/).

### Caveats — what the evaluations honestly don't establish

Trust friction matters more than usual when the product is asking users to trust a decision system. Naming the gaps:

- **Single-rater scoring.** The `most_vulnerable_assumption` cite-rate match is structural (the persona's chosen `asm-ID` against the corpus-tagged `refuted` assumption), not prose-level. A persona that names the right `asm-ID` but for the wrong reason still counts as a hit.
- **Two-of-three CLIs in some sessions.** The python-2-3 baseline ran with `claude + gemini` (codex hung partway through). The wedges ran with all three after the codex `gpt-5.4` env override; reproducibility instructions reflect this.
- **Wedge-corpora structure inflates per-persona scores.** The wedge corpora declare 1 LBA per entry; the python-2-3 baseline declared multiple. The 96–98% wedge per-persona scores are *not* directly comparable to the 79% python-2-3 baseline — they're testing different things (leakage / readability vs. multi-LBA scoring).
- **Cite-rate ≥70% was the GA gate, not a guarantee.** A model that always mistakes which assumption broke would still cite *some* assumption, and a corpus author choosing what to mark `load_bearing` makes the target. We pre-registered the threshold *before* the GA run; it's a published commitment, not a calibration.
- **6 partial-session failures across 130 sessions** in the wedge runs (1 full timeout in steelman + 5 single-view gemini `parse` errors). Recorded transparently in the run results; none affected verdict signs.

### What's NOT proved

These claims would require evidence the project does not yet have. Naming them so users can decide whether the product earns the trust it's asking for:

- **Real-world decision improvement.** The council surfaces dissent, but the user writes the final rationale. Whether that dissent shifts what the user actually decides — and whether that shift is for the better — is unmeasured. The product is *out-of-scope by design* for the "did this council make the call right" question.
- **Six-month retention.** The compounding thesis requires that an outcome logged six months from now finds and flags the assumption that broke. The propagation mechanism is tested unit-level + property-based, but no real user has logged a real refutation against a real prior council yet.
- **Market demand.** 0 stars, 0 forks, 0 issues today. Cite-rate evidence does not translate to "people want this in production" — that's a separate hypothesis, untested.
- **Generalization beyond the wedge domains.** Python migration history (in training), SEC Item 1A boilerplate (in training), and konflux-ci ADRs (open-source markdown) all skew toward "the model has read material in this register." A private decision corpus (Confluence pages, internal RFCs, regulated-industry wiki) might or might not behave like the public test set.

## Quickstart

The setup has real prerequisites. Three tiers, in order of completeness:

### Minimum viable (single-CLI, no flywheel-memory)

What you actually need for the closed loop to work end-to-end:

- Node.js 22+
- An MCP-aware client (Claude Desktop, Claude Code, Cursor, etc.)
- *One* of `claude`, `codex`, or `gemini` CLI on `$PATH`, authenticated
- `VAULT_PATH` env var pointing at any directory you want to use as the vault (it doesn't have to be an existing Obsidian vault — `.flywheel/ideas.db` will be created on first run)

Trade-off vs. full setup: council fan-out drops to 1 CLI × 2 personas (no cross-model dissent), notes write via `direct-fs` and aren't indexed until you point flywheel-memory at the directory later.

### Recommended (Obsidian vault + flywheel-memory + 2 CLIs)

For real council dissent + instant indexing:

- The minimum-viable list above
- An Obsidian vault you actually use
- [flywheel-memory](https://github.com/velvetmonkey/flywheel-memory) installed and initialized against the same vault — when present, becomes the active write path so flywheel-ideas notes are indexed the moment they're written
- A *second* CLI on `$PATH` (the council disagreement signal needs at least two models to have a "delta")

### Full (all three CLIs, council at full matrix)

For the matrix the cite-rate pilot was run against:

- Recommended list above
- All three CLIs (`claude`, `codex`, `gemini`) on `$PATH`, all authenticated
- Per-CLI model env (defaults work for most cases — see [`docs/council.md`](./docs/council.md) for `FLYWHEEL_IDEAS_{CLAUDE,CODEX,GEMINI}_MODEL`). **Note for codex on a ChatGPT-account login:** since codex 0.125, the dispatcher's default `gpt-5-codex` is rejected — set `FLYWHEEL_IDEAS_CODEX_MODEL=gpt-5.4` (or whatever your `~/.codex/config.toml` specifies as `model`) to override.
- Approval granted out-of-band — `FLYWHEEL_IDEAS_APPROVE=session|always` or a `<vault>/.flywheel/ideas-approvals.json` file (see [CLAUDE.md](./CLAUDE.md) "Safety" for the file format)

### Install

The `flywheel-ideas` MCP server runs as a subprocess launched by your MCP
client. You don't need to `npm install` it globally — `npx` will fetch +
cache it on first use.

Grant approval for council dispatch *out-of-band* (the LLM cannot grant it
itself):

```bash
# Session-scoped (recommended while getting started)
export FLYWHEEL_IDEAS_APPROVE=session
# Persistent across restarts — edit <vault>/.flywheel/ideas-approvals.json manually
```

### Wire into your MCP client

Example `mcp.json` entry:

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

### First flow

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
  - `github-repo-adr` (v0.3.0) — Architecture Decision Records following the konflux-ci/architecture frontmatter convention (`title`, `status`, optional `superseded_by`). Per the Phase 3c census, scoped to repos following this format; the adapter rejects the source up front for any other convention. Source: `owner/repo[@ref][:custom-path/]`.

Full operator guide for the import flow: [`docs/import.md`](./docs/import.md).

## Lineage — Architecture Decision Records, extended

The shape flywheel-ideas writes — *context · challenge · decision · tradeoff · status · assumptions · outcome* — is the [Architecture Decision Record](https://adr.github.io) convention that's been in industry use since Michael Nygard's 2011 essay. The structured form is the same one [Microsoft's Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architectural-decisions) and [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/welcome.html) recommend for capturing decisions worth revisiting.

What flywheel-ideas adds on top of that convention:

1. **Explicit, declared assumptions** as first-class objects, not prose buried inside the "Decision" section.
2. **Multi-model AI dissent** before the call is committed (the council).
3. **Outcome-driven refutation propagation** — when one assumption breaks, every dependent idea is auto-flagged.

If you read your team's existing ADRs and think "the call I made would be more useful next year if I'd captured the *assumption* that turned out to break" — that's the gap this product fills. The ADR convention names the artifact; flywheel-ideas makes it falsifiable.

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

### Phase 3 wedges *(complete 2026-04-27)*

Three falsification probes — train-data leakage GAP, SEC + ADR readability spot-checks, ADR superseded-by census — all cleared their pre-registered gates. Headline: **reasoning, not recall** (synthetic obscure corpus marginally outperformed famous post-mortems). Cross-domain readability holds for SEC 10-K Item 1A and konflux-ci ADRs. Full verdicts and reproducibility: [pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md).

### Phase 4 — multi-domain adapters *(in flight, post-roundtable revision)*

Branch A was confirmed by the wedges; a roundtable critique on the implementation plan reduced the v0.3.0 scope from "ship both adapters" to "ship one, gate the second behind external validation." The revised plan:

- ✅ **v0.3.0 — `github-repo-adr` adapter, scoped to konflux-format.** Hardened against per-file frontmatter drift (per-file skip, not per-source rejection), `GITHUB_TOKEN` auth, 403 / 429 retry-after handling. Per the Phase 3c census, scoped specifically to repos following the konflux-ci convention; a general "scan any repo for ADRs" framing was rejected as over-promising. Source URI: `github-repo-adr://owner/repo@ref:adr/0028.md`. A frontmatter `status: superseded` + `superseded_by: 0032` becomes an `outcome.log({refutes: [...]})` candidate, gated on user consent at `import.promote`. Full guide: [`docs/import.md`](./docs/import.md).
- ⏸️ **Validation gate before any sec-edgar work.** At least one of: a named user with written feedback against v0.3.0 + `github-repo-adr` for a real decision context, OR a public post (Show HN, r/programming, etc.) generating ≥1 GitHub star or ≥1 specific user request within ~3 weeks of v0.3.0 publish. If neither triggers, Phase 4 halts; the project pivots to GTM-only motion.
- ⏳ **`sec-edgar` adapter (gated, deferred).** Specifications kept in the Phase 4 plan; implementation does not begin until the gate clears. Will pull Item 1A risk factors from EDGAR with a global rate-limit singleton (SEC's 2 req/sec policy) and a fallback whole-section parser when paragraph-splitting heuristics underperform.

### Carry-over from v0.2 GA *(still queued)*

- ⏳ Anti-Portfolio pass memos · Ollama / LM Studio local models · daily-note outcome capture · agent-driven outcome detection
- ⏳ `rate_limit` failure-classifier pattern (opportunistic capture during Phase 4 pilots)
- ⏳ Steelman-mode `tools/call#10` 600s deadline audit (one full-session timeout in the wedge runs landed on a steelman session — investigate whether steelman produces longer output that hits the JSON-RPC layer timeout)

### v0.3 — operator calibration

Obsidian plugin · personal calibration dashboard (Brier trend) · persona effectiveness A/B · exportable decision portfolios · state-of-mind context capture (Farnam Street) · Brier-scored assumption updating.

### What's next to prove (not "more features")

The mechanism story is now in. The empirical questions that remain — and that the v0.3+ work is partly aimed at answering:

1. **Does this change real decisions?** Currently unmeasured. v0.3's calibration dashboard lets the user see whether Brier scores on locked assumptions improve over time as they use the loop.
2. **Do users come back six months later because the system caught the assumption that failed?** The propagation mechanism works (unit + property tested). Whether real-world users actually log real-world refutations against real prior councils is an entirely separate hypothesis.
3. **Does broad market demand exist?** 0 stars, 0 forks, 0 issues today. Cite-rate evidence ≠ adoption evidence. v0.3's exportable decision portfolios + Obsidian plugin lower the friction-to-share, which is the cheapest experiment we can run on (3).

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
- **Tested hard.** Unit · property-based · integration via vitest. CI runs lint, npm-audit, build, core + mcp-server suites, and a Node 22/24 × ubuntu/windows full matrix. Live `claude -p` end-to-end ran during the v0.1 GA dogfood ([docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md)), the v0.2 cite-rate pilot ([pilot/RESULT.md](./pilot/RESULT.md)), and the Phase 3 wedges ([pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md)) — not as continuous CI.
- **Falsification before widening.** New domains and adapters land *after* a pre-registered probe rules out the most parsimonious null hypotheses (recall, generic restatement, training-data overlap), not before. The Phase 3 wedge plan was published in skeleton form and the decision rules were fixed *before* the council runs landed — see [pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md).

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
