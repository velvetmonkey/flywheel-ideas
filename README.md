# flywheel-ideas

**Track why you made a decision worth revisiting, challenge it, and learn if it was right.**

flywheel-ideas is a local-first decision ledger that runs in your Obsidian vault. You log a decision, declare the assumptions it rests on, run a multi-CLI AI council against them, and later — when reality arrives — log an outcome. Every idea in the vault that cited a refuted assumption is automatically flagged for re-review.

What it adds over a static ADR tool: assumptions are first-class, *falsifiable* objects, not prose buried inside a Decision section; the council is real subprocess dispatch to `claude` / `codex` / `gemini`, not a single-model sycophant; refutations propagate. What it adds over a chat agent: structure persists across years. The vault is the record.

Built for consequential decisions — architecture choices, pricing model rewrites, platform migrations, strategic hires, research direction. Not for routine product backlog. Six months from now, you should be able to articulate which assumption broke and which other decisions depended on it.

[![npm version](https://img.shields.io/npm/v/@velvetmonkey/flywheel-ideas.svg)](https://www.npmjs.com/package/@velvetmonkey/flywheel-ideas)
[![license: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![status: stable](https://img.shields.io/badge/status-stable-blue.svg)](#roadmap)

> **Status:** v0.2.0 GA on `latest`. v0.4.0 staged on `main` — same closed loop as v0.2 + the v0.3 `github-repo-adr` adapter + the v0.3 `idea.export` action; **plus the breaking change that promoted [flywheel-memory](https://github.com/velvetmonkey/flywheel-memory) from optional sidecar to required peer dependency.** npm publish + announcement remain held; v0.4.0 ships when Trigger 1 dogfood feedback lands.
>
> Two pre-registered evaluations have completed:
> - **v0.2 cite-rate pilot (Python 2→3):** 100% per-session, 79% per-persona ([pilot/RESULT.md](./pilot/RESULT.md))
> - **Phase 3 wedges (leakage probe + cross-domain readability):** GAP +1.1pp (synthetic obscure corpus narrowly *beat* famous post-mortems → reasoning, not recall) · 3/3 SEC 10-K and 3/3 konflux-ci ADR entries surfaced specific operational detail ([pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md))
>
> CI runs lint, npm-audit, build, core + mcp-server tests, and a Node 22/24 × ubuntu/windows matrix. Live `claude -p` end-to-end happens during dogfood + pilot runs, not as continuous CI.

## Hero example: a decision and the assumption that broke

The pre-registered cite-rate pilot ran flywheel-ideas blind against five Python 2→3 decisions whose outcomes are public history. Walking one of them — **the decision to release Python 3 as a backward-incompatible break with Python 2** — through the loop:

**The decision.** *Python 3000.* Made 2008. Logged as an `idea` with the original [PEP body](https://peps.python.org/pep-3000/) as `body_md`.

**The declared assumptions.** Two were marked `load_bearing: true`:

- `asm-3000-quick-migration` — *"The Python community will migrate to Python 3 within a 2–3 year window after release."*
- `asm-3000-cleanup-worth-pain` — *"Cleaning up Python's design warts justifies a one-time backward-incompatibility cost."*

**The council, run blind.** `council.run({id: "idea-py3k", mode: "standard"})` spawned `claude` / `codex` / `gemini` × two personas × two passes (light depth). The council was given the decision body and the declared assumptions. It was *not* told the historical outcome.

`claude-risk-pessimist`, Pass 2 self-critique:

> Pass 1 nailed the scale of fragmentation but misread its *nature*. The 2–3 year migration claim was catastrophically optimistic — it took a decade … if the Timeline assumption had been *close* (say, 4–5 years instead of 10), the cost-benefit flips. A decade of dual-maintenance eroded the cleanup's perceived value.

The persona's structured `most_vulnerable_assumption` field came back as `asm-3000-quick-migration` — a structural match against the assumption history actually refuted. That match is what the cite-rate pilot measured. **100% per-session; 79% per-persona, across all five PEPs.** In a sibling session for `pep-3137`, the council named PEP 414 by name — *the actual historical reversal mechanism* — without that PEP being in its prompt context.

**The outcome — logged once reality arrived.**

```
> outcome.log({
    idea_id: "idea-py3k",
    text: "Migration tail ran >8 years; PEP 466 (security backports) and Py2.7 EOL extension to 2020 are evidence the timeline assumption broke.",
    refutes: ["asm-3000-quick-migration"]
  })
```

Every other idea in the vault that cited `asm-3000-quick-migration` as load-bearing is now flagged for re-review (`needs_review: 1`). That propagation is the compounding mechanism — one logged refutation, fan-out across the ledger.

Full pilot data: [`pilot/RESULT.md`](./pilot/RESULT.md). Reproducibility scripts: [`pilot/seed-corpus.mjs`](./pilot/seed-corpus.mjs), [`pilot/run-councils.mjs`](./pilot/run-councils.mjs), [`pilot/score-cites-auto.mjs`](./pilot/score-cites-auto.mjs).

## Who this is for

**Built for *consequential decisions* — the calls you'd want to revisit a year later.** Architecture choices. Pricing model rewrites. Platform migrations. Strategic hiring. Research-direction calls. The kind of decision where "I knew it might fail because of X" is a story you wish you could replay.

- Solo founders making product, pricing, GTM, and hiring decisions
- Staff+ / principal engineers making architecture and platform decisions
- Consultants, investors, and researchers who revisit *why* they believed something

**It is *not* for routine product backlog or casual brainstorming.** Jira Product Discovery, Notion, and the like already cover that territory; adding a council step to a low-stakes ticket is friction without payoff. The compounding mechanism only earns its keep when the cited assumption matters six months later.

If you've ever made a consequential decision and six months later couldn't articulate the assumption that turned out wrong — this is for you.

## Quickstart

The setup has real prerequisites. Two tiers, in order of completeness:

### Recommended (Obsidian vault + flywheel-memory + 2 CLIs)

The minimum to run the closed loop end-to-end. **flywheel-memory is required** — without it, the server hard-fails at boot with a named error pointing at the install command.

- Node.js 22+
- An MCP-aware client (Claude Desktop, Claude Code, Cursor, etc.)
- An Obsidian vault you actually use, plus a `VAULT_PATH` env var pointing at it (the directory doesn't have to be an existing Obsidian vault — `.flywheel/ideas.db` will be created on first run)
- **[flywheel-memory](https://github.com/velvetmonkey/flywheel-memory) installed and initialized against the same vault.** Required peer dependency; flywheel-ideas writes every artifact through flywheel-memory's MCP tools so the citation graph stays consistent.
- *Two* of `claude`, `codex`, `gemini` CLI on `$PATH`, authenticated (the council disagreement signal needs at least two models to have a "delta")

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

**Writes go through flywheel-memory.** On startup, the server probes for a flywheel-memory MCP subprocess. Every idea / assumption / outcome / council artifact lands via flywheel-memory's `note` + `vault_update_frontmatter` tools — indexed the moment it's written, no watcher delay. If the bridge is unreachable, the server hard-fails at boot with a `FlywheelMemoryRequiredError` naming the install command. (The legacy `direct-fs` fallback survives only behind `FLYWHEEL_IDEAS_TEST_MODE=1` so the test suite stays hermetic.)

**The council is a subprocess dispatcher.** `council.run(idea_id, depth, mode)` spawns parallel child processes — one per `(model, persona)` cell — shelling out to your installed CLIs with explicit consent. Concurrency capped. Failures classified (timeout / auth / rate-limit / parse / exit-nonzero); one cell failing never aborts the session. Each cell runs a mandatory two-pass self-critique. Views persist as markdown; template synthesis distills them with evidence citations.

**Outcomes refute assumptions.** `outcome.log(refutes: [...])` marks assumptions refuted and flags every dependent idea. `outcome.log.undo` reverses if you logged by mistake. This is the compounding mechanism.

**Every response teaches you the next move.** `{result, next_steps}` — the tool surface is the onboarding flow.

## Tool surface

Five MCP tools, action-dispatched. Every response carries `{result, next_steps, write_path}`.

### `idea` (v0.1 + v0.2 lineage + v0.3 export)

- `create({title, body?, context?})` / `read(id)` / `list({state?, limit?})` / `transition({id, to, reason?})` / `forget(id)`
- `freeze({id})` / `list_freezes({id})` — OSF-style snapshot of an idea + its locked assumptions
- `ancestry({id})` / `descendants({id})` / `shared_assumptions({ids})` — lineage queries
- `export({idea_ids? | all?, include_lineage?, redact_bodies?, include_private_context?, output_path?})` — render a markdown decision portfolio (idea + assumptions + outcomes + council excerpts + lineage) the operator can hand to a colleague. Bodies redacted by default. Private `context` is excluded by default and only rendered when `include_private_context: true`. Examples: [`examples/portfolio-pep-3000.md`](./examples/portfolio-pep-3000.md), [`examples/portfolio-konflux-adrs.md`](./examples/portfolio-konflux-adrs.md).

`context` is private decision-journal metadata captured at `idea.create` time:
- `situational_context`
- `mental_or_physical_state`
- `expected_outcome`
- `review_date`
- `alternatives_considered[]`

It is stored in the DB sidecar, returned by `idea.read`, carried through freezes, omitted from note frontmatter/body, and excluded from exports unless explicitly opted in.

### `assumption` (v0.1 + v0.2 RAND ABP)

- `declare({idea_id, text? | structured, signpost_at?, signpost_reason?, load_bearing?})` / `list({idea_id})` / `forget(id)`
- `lock({idea_id})` / `unlock({idea_id})` — OSF-style pre-registration
- `signposts_due({window?})` — sweep for elapsed signposts (fed into `next_steps`)
- `radar({query | idea_id})` — semantic vault-wide scan for unstated load-bearing claims
- `extension_set({id, shaping_actions?, hedging_actions?})` / `extension_get({id})` — RAND Assumption-Based Planning shaping + hedging actions

### `council` (v0.1 + v0.2 delta + retrospective/telemetry)

- `run({id, depth: "light"|"full", mode: "standard"|"pre_mortem"|"steelman", confirm})`
- `run({mode: "anti_portfolio", outcome_id, focus_assumption_id?, depth?, confirm})` — retrospective council pass over a refuting outcome. Returns a `proposed_memo` draft but does not mutate the canonical memo.
- `delta({idea_id, from_session_id, to_session_id})` — what's changed across council sessions for the same idea
- `effectiveness_report({from_ms, to_ms, persona_ids?, cli_ids?})` — read-only persona/CLI effectiveness rollup over predictive sessions only
- `approval_status` — read-only inspection of the out-of-band consent state

### `outcome`

- `log({idea_id, text, refutes?: [asm_ids], validates?: [asm_ids], memo?})` / `read(id)` / `list({idea_id?})` / `undo(outcome_id)`
- `memo_upsert({outcome_id, memo})` — create or replace the canonical Anti-Portfolio memo for an outcome. `outcome.read` returns `memo` + `memo_written_at`.

### `import` (v0.2 — bulk corpus ingestion)

- `scan({adapter, source, idea_id?, filter?})` — adapter scans a corpus, persists candidates with dedup against the vault.
- `promote({candidate_id, as: 'idea'|'assumption'|'outcome', target_idea_id?, override_duplicate?})` / `list({source_id?, state?})` / `read(id)` / `reject(id)`
- Adapters:
  - `github-structured-docs` (v0.2 GA) — RFC-822-headered markdown trees like Python PEPs. Source: `owner/repo`, `owner/repo@ref`, or `owner/repo:path/`.
  - `csv-corpus` (v0.2.1) — JSONL. Paste any decision corpus into a `.jsonl` file (one decision per line, `{decision_id, title, body, assumptions: [...]}`) and run a council against it. Source: absolute path or `file://` URL.
  - `github-repo-adr` (v0.3.0) — Architecture Decision Records following the konflux-ci/architecture frontmatter convention (`title`, `status`, optional `superseded_by`). Per the Phase 3c census, scoped to repos following this format; the adapter rejects the source up front for any other convention. Source: `owner/repo[@ref][:custom-path/]`.

Full operator guide for the import flow: [`docs/import.md`](./docs/import.md).
Trigger 1 dogfood path for the new queue: [`docs/trigger-1-workflow.md`](./docs/trigger-1-workflow.md).

## Lineage — Architecture Decision Records, extended

The shape flywheel-ideas writes — *context · challenge · decision · tradeoff · status · assumptions · outcome* — is the [Architecture Decision Record](https://adr.github.io) convention that's been in industry use since Michael Nygard's 2011 essay. The structured form is the same one [Microsoft's Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architectural-decisions) and [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/welcome.html) recommend for capturing decisions worth revisiting. The ADR convention has always been about decisions one would *bet* against rotting — the artifact you write so a future maintainer (or future-you) can recover the call's reasoning when the world has moved.

What flywheel-ideas adds on top of that convention:

1. **Explicit, declared assumptions** as first-class objects, not prose buried inside the "Decision" section.
2. **Multi-model AI dissent** before the call is committed (the council).
3. **Outcome-driven refutation propagation** — when one assumption breaks, every dependent idea is auto-flagged.

If you read your team's existing ADRs and think "the call I made would be more useful next year if I'd captured the *assumption* that turned out to break" — that's the gap this product fills. The ADR convention names the artifact; flywheel-ideas makes it falsifiable.

## Roadmap

### Current state *(as of 2026-04-27)*

- v0.2.0 on npm `latest`. v0.4.0 staged on `main` but **npm publish + external announcement explicitly held** — the project is in a quiet-development posture by author choice.
- **v0.4.0 — flywheel-memory promoted to required peer dependency.** Breaking change. Drops the `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` kill switch, drops direct-fs as a production fallback, hard-fails at boot if the bridge is unreachable. `peerDependencies` block declared with `optional: false`. The legacy direct-fs path survives only behind `FLYWHEEL_IDEAS_TEST_MODE=1` for hermetic test runs. Rationale: cite-rate gains depend on flywheel-memory's evidence reader, and the optional split was YAGNI infrastructure built for hypothetical users that never arrived. Roundtable: Claude PROCEED WITH MODIFICATIONS (8 mitigations folded in — purpose-built test-mode env var, error-message disambiguation, 30s→60s default timeout, hard-fail on mid-session subprocess crash); Gemini HOLD until Trigger 1 (overridden after user accepted the bundled-product framing on time-pressure grounds).
- README front-page reframed 2026-04-27 — 30-second pitch + PEP 3000 hero example, "bets" → "decisions" terminology migration.
- Phase 3 wedges cleared all gates (reasoning not recall · 3/3 SEC · 3/3 ADR · konflux-only census).
- Phase 4 PR 1 (`github-repo-adr` adapter) merged. Phase 4.5 validation-gate clock is **not running** — without a public post, Trigger 2 (≥1 star / ≥1 issue from a Show HN-style post) cannot fire; Trigger 1 (named-user feedback from dogfooding with a specific human) remains open. See [#38](https://github.com/velvetmonkey/flywheel-ideas/issues/38).
- **P0 closed.** P0.1 (pilot-harness 600s timeout) and P0.2 (`rate_limit` classifier audit) both resolved 2026-04-27.
- **P1.3 + P1.4 deferred-on-roundtable 2026-04-27.** Three consecutive HALT verdicts on infrastructure work. P1.5 reframed as dependent on a P1.4 reversal.
- **P2.9 shipped 2026-04-27 (markdown-first per roundtable).** New `idea.export` action; two dogfood artifacts committed ([pep-3000](./examples/portfolio-pep-3000.md) and [konflux-adrs](./examples/portfolio-konflux-adrs.md)); the konflux artifact also serves as live-validation of the v0.3.0 `github-repo-adr` adapter against the real public repo (37/63 ADRs parsed, 26 per-file drift skips, no source-level rejection).
- **P2.7 deferred-on-roundtable 2026-04-27 (HOLD verdict).** Strategic Skeptic: "Zero outcomes against zero priors. You are building a sophisticated calibration engine for a ghost town. Best case: 6 months dogfood to get baseline signal. PR #39 sits unmerged. Stop guessing. Merge it. Publish the dogfood artifacts. Let a real human's feedback dictate what's next." Risk Pessimist returned PROCEED WITH MODIFICATIONS (transaction coupling, undo cascade, schema NULL handling) but those concerns are moot if we don't ship.
- **Next move is Trigger 1 dogfood.** (1) Hand `examples/portfolio-pep-3000.md` or `examples/portfolio-konflux-adrs.md` to one specific human; (2) capture their written feedback against [#38](https://github.com/velvetmonkey/flywheel-ideas/issues/38). The next plan opens against whatever they actually say. Until then, every infrastructure item is shadow-boxing.
- Strategic posture (publish + announce held; Phase 4.5 gate Trigger 2 on hold) unchanged.

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
- ◐ **CLI-error classifier `auth` + `rate_limit` patterns** — `auth` captured during the v0.1 GA dogfood ([docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md)); `rate_limit` patterns shipped synthesised in v0.1.1 (`packages/core/src/cli-errors.ts:98–161`) — real-sample validation remains opportunistic.
- ⛔ **Real `claude -p` E2E in CI with flake-aware demotion** — explicitly *not* pursued as continuous CI. The hermeticity / cost / flake trade-off is unfavourable for a per-PR job. Live-CLI coverage instead lives in the v0.1 GA dogfood + the v0.2 cite-rate pilot — see "Tested hard" in [Design principles](#design-principles).

### v0.2 — depth on the loop + closing the feedback loop *(GA shipped 2026-04-26)*

Retrieval-native council input, lineage queries (`ancestry` / `descendants` / `shared_assumptions`), `idea.freeze` (OSF snapshot), `assumption.radar`, `council.delta`, steelman mode, RAND-style shaping/hedging actions, bulk import (`import.scan` / `promote`), temporal insights in the evidence pack, flywheel-memory as the active write path. Schema v2 → v8. Pre-registered cite-rate pilot on Python 2→3 passed with 100% session / 79% per-persona (see [pilot/RESULT.md](./pilot/RESULT.md)). Full release notes: [CHANGELOG.md](./CHANGELOG.md).

### v0.2.1 — staged on `main`

- ✅ Pilot generalization — `decision_pep` → `decision_id` rename + `--corpus <path>` flag on the pilot scripts (corpus shape no longer assumes PEP).
- ✅ `csv-corpus` import adapter — JSONL wedge-test tool. Paste any corpus into a `.jsonl` and run a council against it.

### v0.3.0 — staged on `main` *(rolled into v0.4.0)*

The v0.3.0 staging never published — its breaking-change cousin (v0.4.0 below) shipped over the top before npm publish landed.

- ✅ **`github-repo-adr` import adapter (konflux-format scope).** PR #37, merged 2026-04-26. Per-file skip on malformed frontmatter (not per-source rejection), `GITHUB_TOKEN` auth, 403/429 retry-after handling. Source URI: `github-repo-adr://owner/repo[@ref][:custom-path/]`. A `status: superseded` + `superseded_by:` frontmatter pair becomes an `outcome.log({refutes: [...]})` candidate at promote time. Live-validated against `konflux-ci/architecture` (37/63 ADRs parsed, 26 per-file skips, no source-level rejection — see [examples/portfolio-konflux-adrs.md](./examples/portfolio-konflux-adrs.md)).
- ✅ **`idea.export` action.** PR #39, merged 2026-04-27. Markdown-first decision portfolio renderer (idea + assumptions + outcomes + council excerpts + lineage). Bodies redacted by default, lineage on by default, JSON output deferred to v0.3.1 per roundtable verdict. Two dogfood artifacts committed.

### v0.4.0 — staged on `main` *(BREAKING; ships when Trigger 1 lands)*

The bundled-product cut: cite-rate gains depend on flywheel-memory's evidence reader, so flywheel-memory is now a required peer dependency rather than an optional sidecar.

- ✅ **Hard-fail at boot when bridge unreachable.** PR #40, merged 2026-04-27. Server throws `FlywheelMemoryRequiredError` with failure-mode-branched messages (binary missing → install command, timeout → bump env var, version mismatch → `>=0.6.0` hint, etc.).
- ✅ **`FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` kill switch removed.** Test bypass uses purpose-built `FLYWHEEL_IDEAS_TEST_MODE=1` (centralized in vitest setup files; production envs cannot inherit from CI runners or dev shells — Claude-mitigation #1).
- ✅ **Direct-fs production fallback removed.** Survives only behind `FLYWHEEL_IDEAS_TEST_MODE=1` for hermetic test runs. Production write path is always `mcp-subprocess`.
- ✅ **Mid-session subprocess crashes throw, no silent degrade.** New `WriteSubprocessFailedError` (writes), `EvidenceReaderUnavailableError` (radar reads). Loud failure beats silent vault divergence (Claude-mitigation #7).
- ✅ **Default bridge timeout 30s → 60s.** Cold-start `init_semantic` routinely exceeded 30s; with the probe now fatal, the bump prevents false-positive boot failures.
- ✅ **`peerDependencies` block declared with `optional: false`** on `@velvetmonkey/flywheel-ideas` package.json. npm warns at install time when flywheel-memory isn't present.
- ✅ **Test refactor.** ~15 affected files migrated; 2 new tests (`required-bridge.test.ts` for the error class, server-startup hard-fail assertions); new wrapper fixture `mock-flywheel-memory-full.mjs` exposes the write tools the v0.4.0 probe requires.

Roundtable: Claude PROCEED WITH MODIFICATIONS (8 mitigations all folded in); Gemini HOLD until Trigger 1 (overridden on time-pressure — Trigger 1 dogfood weeks out, complete-product posture wanted ahead of measurement). Plan archived in operator's plan-file history.

### Phase 3 wedges *(complete 2026-04-27)*

Three falsification probes — train-data leakage GAP, SEC + ADR readability spot-checks, ADR superseded-by census — all cleared their pre-registered gates. Headline: **reasoning, not recall** (synthetic obscure corpus marginally outperformed famous post-mortems). Cross-domain readability holds for SEC 10-K Item 1A and konflux-ci ADRs. Full verdicts and reproducibility: [pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md).

### Phase 4 — multi-domain adapters *(in flight, post-roundtable revision)*

Branch A was confirmed by the wedges; a roundtable critique on the implementation plan reduced the v0.3.0 scope from "ship both adapters" to "ship one, gate the second behind external validation." The revised plan:

- ✅ **v0.3.0 — `github-repo-adr` adapter, scoped to konflux-format.** Code merged on `main` (PR #37); npm publish held. Live-validated against `konflux-ci/architecture` (see [examples/portfolio-konflux-adrs.md](./examples/portfolio-konflux-adrs.md)). Hardened against per-file frontmatter drift, `GITHUB_TOKEN` auth, 403/429 retry-after handling. Source URI: `github-repo-adr://owner/repo@ref:adr/0028.md`. Full guide: [`docs/import.md`](./docs/import.md).
- ⏸️ **Validation gate before any sec-edgar work** ([#38](https://github.com/velvetmonkey/flywheel-ideas/issues/38)). At least one of: a named user with written feedback against `github-repo-adr` for a real decision context (Trigger 1), OR a public post generating ≥1 GitHub star / ≥1 specific user request (Trigger 2). Trigger 2 is **on hold** while publish + announce are held; only Trigger 1 can currently fire. No fixed clock — the gate stays open until the user dogfoods with a specific human or reverses the publish hold.
- ⏳ **`sec-edgar` adapter (gated, deferred).** Specifications kept in the Phase 4 plan; implementation does not begin until the gate clears. Will pull Item 1A risk factors from EDGAR with a global rate-limit singleton (SEC's 2 req/sec policy) and a fallback whole-section parser when paragraph-splitting heuristics underperform.

### Engineering priority queue *(2026-04-27)*

The active engineering work, ranked. Items 1–13 are the live queue; the parked items live in the [Backlog](#backlog-parked) subsection below.

**P0 — bugs + testing hygiene (hit first)**

1. ✅ **Pilot-harness 600s deadline → 1800s + timing logs + retry-once** *(resolved 2026-04-27)*. The wedge-run timeout that the roadmap originally labelled a "steelman-mode 600s timeout audit" was diagnosed: the 600s deadline lived in `pilot/run-councils.mjs:148` (the harness's `rpc()` helper), not in product code, and steelman is not intrinsically slower (sibling steelman sessions on the same idea ran 354s / 362s vs. the 620s outlier). Harness deadline raised to 1800s, per-`tools/call#N` timing logs added, retry-once on transient hang. Structural session-level timeout in `packages/core/src/council.ts` deferred per roundtable verdict — revisit only if a non-author user hits a runaway session. Full audit notes in [pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md).
2. ✅ **`rate_limit` failure-classifier pattern** *(audit-resolved 2026-04-27 — already shipped)*. Roadmap entry was stale: the patterns ship in `packages/core/src/cli-errors.ts` lines 98–161 for all 3 CLIs, marked `SYNTHESIZED 2026-04-24` (claude `"type":"rate_limit_error"` JSON shape, codex `turn.failed` rate-limit payload, gemini `429 / RESOURCE_EXHAUSTED / Quota exceeded`) with golden fixtures. The remaining open item is **real-sample validation** — confirm the synthesised regexes match a live failure when one surfaces — not a code gap. Roundtable on this entry returned HALT: do not synthesise further patterns; capture opportunistically.

**P1 — closing feature loops (queued, code-ready)**

3. ⏸️ **Ollama / LM Studio local-model dispatch** *(deferred-on-roundtable 2026-04-27)*. Original framing: extend council fan-out without API costs; broaden the test matrix. Roundtable HALT: parser/memory/concurrency surgery far beyond the 120–180 LOC estimate (llama3.1:8b output won't reliably emit the structured `most_vulnerable_assumption` JSON the cite-rate scorer depends on; 3 concurrent local cells = ~24 GB RAM; existing concurrency limiter doesn't know cells are CPU-bound). No shareable artifact. Revisit when a real user actually hits cloud-CLI rate-limits or asks for local-only operation.
4. ⏸️ **Daily-note outcome capture** *(deferred-on-roundtable 2026-04-27)*. Original framing: outcomes pile up in daily notes; sweep them into candidates. Roundtable HALT (two rounds): without LLM-based assumption-id inference (P1.5), promote requires manual asm-id assignment — same friction as `outcome.log`, time-shifted. Strategic Skeptic: "Building frictionless ingestion for a system that hasn't proven its output is valuable is like building a multi-lane highway to an empty dirt lot." The MVP fallback (a file-scanner) was rejected as a Node.js wrapper around `grep -l '\[\[idea-' ~/obsidian/Ben/daily/*.md`. Revisit only if P1.5's LLM-based variant clears its own roundtable when assumption-inference becomes feasible.
5. ⏸️ **Agent-driven outcome detection** *(reframed 2026-04-27, depends on P1.4 reversal)*. Original framing: LLM pattern-match on retro / post-mortem prose to surface outcome candidates. Now coupled to P1.4 — revisit only if an actual outcome-not-being-logged friction emerges in dogfood AND a real user signals interest in the automation. Speculative until then.
6. **Anti-Portfolio pass memos.** Council mode extension; complements `pre_mortem` / `standard` / `steelman`.
7. **Functional Deliberation Personas — cognitive role council.** New `council.run` mode that replaces the current generic `risk_pessimist` / `strategic_skeptic` pair with named cognitive roles mapped to known assumption-failure classes. Inspired by the multi-persona deliberation pattern emerging in the space but functional rather than theatrical — roles are grounded in *failure mode taxonomy*, not historical figure cosplay. Proposed roles: **The Wrecker** (fastest falsification path for the declared assumption), **The Tail Hunter** (catastrophic low-probability outcomes the base analysis ignores; structurally Taleb-adjacent without the name-drop), **The Pragmatist** (implementation friction; what ships vs. what doesn't), **The Systems Lens** (feedback loops the assumption fails to account for), **The Contrarian** (steelmans the opposite decision before synthesis, required to surface genuine opposing rationale). Multi-provider routing unchanged underneath. Outputs persist as structured `challenge_md` fields on the assumption record — not just prose in `SYNTHESIS.md` — so the challenges compound with the vault. Activation: `council.run({ mode: "roles", roles: ["wrecker", "tail_hunter"] })` or `council.run({ mode: "full-roles" })` for all five. Differentiator: roles are *functional not theatrical*; output is *persistent assumption-level* not ephemeral session verdict; refutation propagation stays intact. Added 2026-04-30 — pre-roundtable, concept stage.

**P2 — v0.3 calibration engineering**

8. ⏸️ **Brier-scored assumption updating** *(deferred-on-roundtable 2026-04-27, HOLD until Trigger 1 fires)*. Original framing: schema + scoring math + UI plumbing for `(verdict − prior)²` calibration tracking. Roundtable verdict: Gemini HOLD on YAGNI grounds (zero outcomes against zero priors → calibration engine for a ghost town; needs N≥10 for signal → 6+ months dogfood). Claude PROCEED WITH MODIFICATIONS on tactical grounds (transaction coupling, multi-LBA loop, undo cascade, schema NULL handling). Synthesis: HOLD until PR #39 merges AND a real human gives feedback (Trigger 1) AND the feedback names calibration as a felt need. Plan archived in the operator's plan-file history; revisit when triggered, not on schedule.
9. **Personal calibration dashboard** — visualises Brier trend over time. Targets the existing user (author) directly.
10. ✅ **Exportable decision portfolios** *(shipped 2026-04-27, markdown-first per roundtable)*. New `idea.export` action renders a markdown decision portfolio (idea + assumptions + outcomes + council excerpts + lineage) to `<vault>/exports/portfolio-<timestamp>.md`. Bodies redacted by default (`redact_bodies: true`). Lineage on by default. JSON output deferred to v0.3.1 per roundtable verdict ("JSON is a debug dump, markdown IS the product"). Two dogfood artifacts committed: [`examples/portfolio-pep-3000.md`](./examples/portfolio-pep-3000.md) (cite-rate pilot data) and [`examples/portfolio-konflux-adrs.md`](./examples/portfolio-konflux-adrs.md) (Phase 3 wedge data + live-validation note for `github-repo-adr`). The latter doubles as real-public-repo validation of the v0.3.0 `github-repo-adr` adapter — live scan of `konflux-ci/architecture` succeeded with 37/63 ADRs parsed and 26 skipped per-file due to frontmatter drift (no source-level rejection — graceful degrade).
11. **Persona effectiveness A/B** — instrumentation for which personas surface load-bearing dissent. Needs council-output telemetry.
12. **State-of-mind context capture** (Farnam Street) — append decision-time emotional / situational metadata to `idea.create`.

**P3 — engineering tracked, gated**

13. **`sec-edgar` adapter** — full specifications preserved in the Phase 4 plan. Gated behind Phase 4.5 ([#38](https://github.com/velvetmonkey/flywheel-ideas/issues/38)); active in the queue, but implementation begins only when Trigger 1 (named-user feedback) fires.

### Backlog *(parked)*

- **Obsidian plugin.** UI surface; orthogonal to the engine. Revisit after P2 calibration work lands and the dashboard has something to render.
- **Dogfood with one named human (Trigger 1 path)** *(promoted to active 2026-04-27 — see Current state above)*. Strategic, not engineering. Surfaced here originally so it wouldn't get lost; after the P2.7 HOLD roundtable, this is now the load-bearing next move — every infrastructure item is gated on whether a real human's feedback validates the direction.

### What's next to prove (not "more features")

The mechanism story is now in. The empirical questions that remain — and that the v0.3+ work is partly aimed at answering:

1. **Does this change real decisions?** Currently unmeasured. The Trigger 1 dogfood (one named human running flywheel-ideas against a real decision context, written feedback captured against [#38](https://github.com/velvetmonkey/flywheel-ideas/issues/38)) is the operative experiment for this question. Brier-scoring infrastructure (P2.7) is HOLD until that feedback names calibration as a felt need.
2. **Do users come back six months later because the system caught the assumption that failed?** The propagation mechanism works (unit + property tested). Whether real-world users actually log real-world refutations against real prior councils is an entirely separate hypothesis.
3. **Does broad market demand exist?** 0 stars, 0 forks, 0 issues today. Cite-rate evidence ≠ adoption evidence. The v0.3.0 `idea.export` portfolios are the friction-to-share experiment — handed to a specific human (Trigger 1) before any public-post motion (Trigger 2, on hold).

### Long-term

Your vault becomes an empirical record of your predictions. Personal calibration emerges over years. Cross-idea reasoning flags assumption conflicts across your roadmap. A community benchmark — seeded with the author's own historical decisions — lets anyone compare council quality.

## Design principles

- **Vault is source of truth.** `ideas.db` is an index.
- **Every response carries `next_steps`.** The tool surface teaches itself.
- **No auto-transitions, no auto-decisions.** User writes the final rationale; council provides dissent, never verdict.
- **Explicit consent per MCP spec.** Subprocess spawns + vault writes require approval; dispatches are audited.
- **Reversibility.** Outcomes can be undone; refutation propagation unwinds.
- **Single, required write path through flywheel-memory** (v0.4.0+). Every artifact lands via flywheel-memory's MCP tools so the citation graph + wikilink scorer stay consistent. If the bridge is unreachable, the server hard-fails at boot rather than silently degrading the index.
- **No LLM SDK lock-in.** Uses whatever CLIs you have on `$PATH`.
- **Apache 2.0.** No viral reach.
- **Tested hard.** Unit · property-based · integration via vitest. CI runs lint, npm-audit, build, core + mcp-server suites, and a Node 22/24 × ubuntu/windows full matrix. Live `claude -p` end-to-end ran during the v0.1 GA dogfood ([docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md)), the v0.2 cite-rate pilot ([pilot/RESULT.md](./pilot/RESULT.md)), and the Phase 3 wedges ([pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md)) — not as continuous CI.
- **Falsification before widening.** New domains and adapters land *after* a pre-registered probe rules out the most parsimonious null hypotheses (recall, generic restatement, training-data overlap), not before. The Phase 3 wedge plan was published in skeleton form and the decision rules were fixed *before* the council runs landed — see [pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md).

## Ecosystem

- **[flywheel-memory](https://github.com/velvetmonkey/flywheel-memory)** — vault indexing MCP. **Required peer dependency in v0.4.0+** — the active write path for every artifact, plus the source of evidence-pack lookups, dedup queries, and the assumption radar.
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
