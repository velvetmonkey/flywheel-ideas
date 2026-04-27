# Changelog

## 0.4.0 — Unreleased

**Breaking change: `@velvetmonkey/flywheel-memory` is now a required peer dependency.**

The optional-bridge posture that shipped through v0.3 made flywheel-memory a "best-effort" sidecar — present with the kill switch off, absent with the kill switch on, the server booted either way and downgraded silently. v0.4.0 retires that posture: cite-rate gains depend on flywheel-memory's evidence reader, and the optional split was YAGNI infrastructure built for hypothetical users that never arrived.

### Behaviour changes

- **Hard-fail at boot when the bridge is unreachable.** Server throws `FlywheelMemoryRequiredError` (new export from `@velvetmonkey/flywheel-ideas-core`). The error message branches by failure mode (`binary_not_found`, `timeout`, `spawn_failed`, `tools_missing`, `invalid_response`, `tool_returned_error`) so the operator gets a concrete next step — install command, timeout-bump env var, or version-upgrade hint. No silent direct-fs degrade.
- **`FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` kill switch removed.** Any boot script setting this will have it ignored. Tests use the purpose-built `FLYWHEEL_IDEAS_TEST_MODE=1` gate (see below) — production environments cannot inherit the bypass from CI runners or dev shells.
- **Direct-fs production fallback removed.** Production write path is always `mcp-subprocess`. The direct-fs writer survives only behind `FLYWHEEL_IDEAS_TEST_MODE=1` so unit/integration tests stay hermetic without requiring a real flywheel-memory binary.
- **Mid-session subprocess crash → hard error.** If the bridge dies mid-session (subprocess crash, OS fork failure under load), the next write/read throws `WriteSubprocessFailedError` (new export) or `EvidenceReaderUnavailableError` rather than silently falling back. Loud failure beats silent vault divergence (mitigation #7 from the v0.4.0 roundtable).
- **Default bridge timeout 30s → 60s.** Cold-start `init_semantic` routinely exceeded 30s on first launch; with the probe now fatal, a false-positive timeout becomes a fatal boot error. The `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS` override still works for pathological cases.
- **`peerDependencies` block added** to `@velvetmonkey/flywheel-ideas` package.json (`"@velvetmonkey/flywheel-memory": ">=0.6.0"`, `optional: false`). npm warns at install time when flywheel-memory isn't already installed.

### New surface

- `FlywheelMemoryRequiredError` (`packages/core/src/errors.ts`) — thrown by the server startup when the boot gate fails. Carries the failure kind, resolved binary path, and timeout (when relevant) so the message can be inspected programmatically.
- `WriteSubprocessFailedError` (`packages/core/src/write/index.ts`) — thrown by `writeNote` / `patchFrontmatter` when the mcp-subprocess tier is active but the per-call subprocess fails.
- `EvidenceReaderUnavailableError` (`packages/core/src/assumption-radar.ts`) — thrown by `radarAssumptions` when the per-call evidence-reader subprocess fails.
- `isTestMode()` + `TEST_MODE_ENV_VAR` (`packages/core/src/test-mode.ts`) — single source of truth for the test-mode gate.

### Testing

- New `vitest.setup.ts` in both `packages/core` and `packages/mcp-server` that sets `FLYWHEEL_IDEAS_TEST_MODE=1` for every test run.
- New `required-bridge.test.ts` asserts the failure-mode branching of `FlywheelMemoryRequiredError`.
- `server-startup.test.ts` updated to assert hard-fail (exit 1) when no bridge is reachable; mock now uses a wrapper fixture (`mock-flywheel-memory-full.mjs`) that exposes both `doctor` and the write tools the v0.4.0 probe requires.
- Test refactor sweep across ~15 files migrated `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` setups to either the centralized test-mode gate (most tests) or `FLYWHEEL_MEMORY_BIN=/nonexistent/...` (council + import-tool tests that need the spawn to fail fast without actually spawning).

### Roundtable provenance

Claude (Risk Pessimist) returned PROCEED WITH MODIFICATIONS — 8 risks, all folded into this PR (purpose-built test-mode env var, error-message disambiguation, default-timeout bump, hard-fail on mid-session crash, etc.). Gemini (Strategic Skeptic) returned HOLD until Trigger 1 — bundled-product framing unvalidated; user overrode based on time-pressure (Trigger 1 dogfood weeks out, complete-product posture wanted ahead of measurement).

### Schema

No schema migrations. v0.4.0 still on schema v8. Brier-score schema (v9) remains deferred — see roadmap.

## 0.3.0 — Unreleased

### `idea.export` — exportable decision portfolios (P2.9, 2026-04-27)

New action on the `idea` tool. Renders a markdown decision portfolio (idea + assumptions + outcomes + council excerpts + lineage) the operator can hand to one specific human — directly enables Trigger 1 of the Phase 4.5 sec-edgar gate.

```
idea.export({ idea_ids?: string[], all?: boolean, include_lineage?: boolean, redact_bodies?: boolean, output_path?: string })
```

- Markdown is the product. JSON output deferred to v0.3.1 per roundtable verdict ("JSON is a debug dump, markdown IS the product"). The renderer invests in human-readable structure: state badges, assumption tables (3-column with load-bearing star), outcome timelines with refute/validate verdicts, council session excerpts (YAML frontmatter stripped, 800-char cap with link to full SYNTHESIS.md), inline lineage block.
- **`redact_bodies: true` by default** (paranoid default) — assumptions / outcomes / council excerpts always render but idea body prose is hidden behind a redaction notice. Run with `redact_bodies: false` to include bodies.
- **`include_lineage: true` by default** — lineage is the value-add over a single freeze.
- Read-only: no DB writes, no vault writes outside the export file. Reuses `buildSnapshot()` (extracted from `createFreeze`) so the snapshot logic doesn't drift.
- Two dogfood artifacts committed: `examples/portfolio-pep-3000.md` (cite-rate pilot data) and `examples/portfolio-konflux-adrs.md` (Phase 3 wedge data + a live-validation note for the `github-repo-adr` adapter against the real `konflux-ci/architecture` repo: 37/63 ADRs parsed, 26 per-file drift skips, no source-level rejection — confirms the per-file-skip design works on real-world frontmatter drift).
- New core surface re-exported from main package: `exportIdea`, `exportPortfolio`, `listAllIdeaIds`, `renderPortfolioMarkdown`, `buildSnapshot`. Companion types: `ExportPortfolio`, `ExportedIdea`, `ExportedOutcome`, `ExportedOutcomeVerdict`, `ExportedCouncilSession`, `ExportedLineage`.

**Phase 4 (revised after roundtable) — narrow, harden, validate.**

Phase 3 wedges resolved positively on 2026-04-27 ([pilot/RESULT.wedges.md](./pilot/RESULT.wedges.md)): GAP +1.1pp on the leakage probe (reasoning, not recall), 3/3 SEC and 3/3 konflux-ci ADR readability passes, only konflux-ci/architecture has a coherent supersession arc among 12 surveyed OSS repos.

The pre-registered Phase 4 plan (Branch A) was to ship both `sec-edgar` and `github-repo-adr` adapters. A roundtable critique on the implementation plan converged on (a) ship one at a time, (b) insert a validation gate (≥1 named user OR ≥1 GitHub star within ~3 weeks of v0.3.0) before sec-edgar work begins, (c) harden the konflux adapter against per-file frontmatter drift and the GitHub rate-limit cliff. This release implements (a) and (c). Full plan: `~/.claude/plans/resum-fkllywheel-ideas-roadmap-breezy-reef.md`.

### New adapter — `github-repo-adr` (scoped to konflux-format)

Pulls Architecture Decision Records from a GitHub repo following the konflux-ci/architecture frontmatter convention (`title`, `status`, optional `superseded_by`). Per the Phase 3c census, scoped specifically to repos following this format — a "scan any GitHub repo for ADRs" framing was rejected as over-promising.

- Source spec: `github-repo-adr://owner/repo[@ref][:custom-path/]`. Default path `ADR/`.
- Per ADR: emits one `idea` candidate; one `assumption` candidate when a `## Decision` section is present; one `outcome` candidate when `status: Replaced`/`Superseded` with `superseded_by:` set, OR when `status: Deprecated`.
- Confidence: `Replaced`/`Superseded` 0.95, `Accepted` 0.9, `Deprecated` 0.85, normalised-from-typo 0.8.

#### Hardening (per the roundtable critique)

- **Per-file skip, not per-source rejection.** Single malformed ADR mid-stream logs a stderr warning and continues. Source rejected only if the *first 3 ADRs* all fail validation (clear "wrong-format-source" signal).
- **Frontmatter validation strict on field names but permissive on shape.** `superseded_by` accepts string, comma-separated string, single number (zero-padded to 4 digits), or array. `status` normalises case-insensitively against the konflux allowlist. Capitalised field names (`Title:`, `Status:`) auto-normalise. Normalised candidates carry `extractedFields.normalised: true` and confidence drops to 0.8 to flag the rescue.
- **`GITHUB_TOKEN` auth.** Adapter reads `process.env.GITHUB_TOKEN` if present and adds `Authorization: Bearer`. Unauthenticated fetch still works (60 req/hour) but emits a one-shot stderr hint about upgrading to 5000/hour. No silent rate-limit bombs.
- **403 / 429 responses parse `X-RateLimit-Remaining` and `X-RateLimit-Reset`** and surface a clear retry-after error rather than a generic 403.

#### Test fixtures

10 ADR fixtures exercising every status value, every `superseded_by` shape, every malformed-frontmatter rejection path, and a 50-ADR synthetic scan with 3 mid-stream malformed entries. 36 test cases, all green.

### Phase 4 validation gate

`sec-edgar` adapter is fully specified in the Phase 4 plan but **not implemented** in v0.3.0. Implementation is gated on at least one of:

1. A named person (not "an ADR enthusiast") using v0.2.0 + `github-repo-adr` against a real decision context with written feedback, OR
2. A public post (Show HN, r/programming, Obsidian community thread, technical blog post) generating ≥1 GitHub star or ≥1 specific user request within ~3 weeks of v0.3.0 publish.

If neither triggers, Phase 4 halts and the project pivots to GTM-only motion. The gate is recorded in a tracking GitHub issue.

### CHANGELOG follow-on items

- Codex 0.125 ChatGPT-account model gotcha: the dispatcher's default `gpt-5-codex` is rejected; users must set `FLYWHEEL_IDEAS_CODEX_MODEL=gpt-5.4` (or whatever `~/.codex/config.toml` lists). Documented in [`docs/cli-quirks.md`](./docs/cli-quirks.md#codex-model-gotcha-codex-0125).

### Schema

No schema migrations. v3.0 still on schema v8.

## 0.2.1 — Unreleased

**Pilot generalization + the `csv-corpus` wedge-test adapter.**

The v0.2 widening plan is gated on three wedge tests (train-data leakage probe, domain readability spot-checks, ADR census) before any new dedicated adapter ships. This release lands the cheap infrastructure those wedges run on top of.

### Pilot generalization

- `pilot/seed-corpus.mjs`, `pilot/score-cites-auto.mjs`, `pilot/score-cites.mjs` accept `--corpus <path>` to point at any corpus JSON. Default unchanged (`pilot/pilot-corpus.python-2-3.json`).
- `decision_pep` → `decision_id` and `outcome_pep_refs` → `outcome_refs` across the corpus schema and pilot scripts. Drops blanket `.toUpperCase()` and PEP-shape UI strings — the scoring is now domain-agnostic. Re-scoring the v0.2.0 GA artifacts produces a byte-identical decision list (modulo timestamps).
- `pilot/corpus-schema.md` — new schema doc for authoring custom corpora.

### New adapter — `csv-corpus`

The wedge-test tool. Reads a JSONL file (one decision-shaped object per line) and emits one idea + N assumptions + 0|1 outcome per row. Lets you run a council against any pasted corpus without writing a dedicated adapter for the source domain.

- Format: JSONL, not CSV (CSV cell-encoded JSON is a foot-gun).
- Source: absolute path or `file://` URL pointing at the `.jsonl`.
- Per-line shape: `{decision_id, title, body?, status?, assumptions: [...], outcome?: {...}}`.
- Source URIs include the row index for replay (`csv-corpus://<path>#row=<i>`).
- Malformed lines log to stderr and skip — a single bad row does not kill the batch.
- Synthetic 3-row test fixture (`packages/core/test/fixtures/csv-corpus/synthetic-3.jsonl`); no famous decisions in the fixture, keeping it leakage-clean.

Adapter registry now lists `csv-corpus` alongside `github-structured-docs`. No schema migrations.

## 0.2.0 — 2026-04-26

**v0.2.0 GA — depth on the loop, retrieval-native council, refutation-driven import.**

The headline: an empirical pre-registered cite-rate pilot on the Python 2→3 corpus (5 decision PEPs × 10 councils each) hit **40/40 sessions = 100% session cite rate** and **136/172 = 79.1% per-persona cite rate** against a ≥70% pre-registered gate. Full write-up: [`pilot/RESULT.md`](./pilot/RESULT.md). The council reliably identifies the load-bearing assumption that history later refuted, and its prose surfaces the actual historical refutation (sometimes naming the exact follow-up PEP that overturned the decision).

What's new since v0.1.1:

### New tools / actions

- **`import` tool** (Phase 2) — `import.scan` / `import.promote` / `import.list` / `import.read` / `import.reject`. First adapter: `github-structured-docs` (Python PEPs). Schema v7. Bulk-imports decision corpora as candidates, dedupes against the vault, promotes selected candidates to ideas / assumptions / outcomes via the existing v0.1 writers.
- **`idea.freeze` / `idea.list_freezes`** (D2 — OSF preregistration). Snapshots an idea + its locked assumptions at council-dispatch time so the council critiques what was actually preregistered, not the post-edit state.
- **`idea.ancestry` / `idea.descendants` / `idea.shared_assumptions`** (D5 — lineage queries). Walks parent / fork / supersession edges; surfaces shared load-bearing assumptions across decisions.
- **`assumption.radar`** (D7 — Assumption Radar). Semantic vault-wide scan for unstated load-bearing claims. Finds candidates the user hasn't declared yet.
- **`assumption.extension_set` / `extension_get`** (RAND ABP). Shaping + hedging actions per assumption (description / due_at / owner / status / notes). Schema v8.
- **`council.delta`** (D6 — decision_delta). Compares two council sessions for the same idea; surfaces persona stance shifts above a configurable confidence-delta threshold.
- **steelman mode** on `council.run` — defends the strongest case for the decision; counterweight to pre_mortem.

### Council depth

- **Retrieval-native council input** (alpha.1 keystone). Council opens with an evidence pack: backlinks from the vault, related ideas, refuted-assumption pattern hits, citation graph context. Required `flywheel-memory` subprocess; degrades gracefully when absent.
- **Temporal insights** (alpha.4). The evidence pack now includes a note's revision history (when, what, by whom) alongside its current state. Councils see the trajectory of an idea, not just its current snapshot.
- **`metacognitive_reflection.most_vulnerable_assumption`** field on every persona view — the persona explicitly names the one assumption it judges most fragile. Powers the cite-rate metric.

### Write path

- **flywheel-memory as the active write path** (alpha.5). Subprocess probe at startup. When flywheel-memory is installed, every idea / assumption / outcome / council artifact lands via flywheel-memory's `note` + `vault_update_frontmatter` tools — indexed instantly. `direct-fs` is the fallback. Every response surfaces `write_path` (`mcp-subprocess` or `direct-fs`).
- **`FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1`** (alpha.8). Drops `--bare` from the dispatcher's claude argv so it inherits the Claude Code CLI subscription auth instead of requiring `ANTHROPIC_API_KEY`. Default unchanged (hermetic, API-key-billed).

### Bug fixes / hardening

- `import.scan` honours `scan_config` (alpha.7). Caller's `filter` / `limit` / `pathPrefix` etc. now reach the adapter — a filtered network scan no longer walks all ~770 PEPs through the 50ms-stagger loop.
- Memory-bridge category names match the type values writers actually emit (`idea`, `assumption`, `outcome`, `council_view`). The alpha.1 names (`ideas_note`, …) had zero overlap — type_boost was a no-op across the entire ideas surface.

### Schema

Migrations v2 → v8 applied automatically on first run with each version. Idempotent + transactional.

### Pilot infrastructure (`pilot/`)

Reproducible scripts so anyone can re-run the cite-rate pilot:

- `pilot/pilot-corpus.python-2-3.json` — ground truth: 5 decision PEPs × 6 load-bearing assumptions, each annotated with the historical outcome.
- `pilot/seed-corpus.mjs` — `idea.create` + `assumption.declare` for the whole corpus into an isolated `/tmp` vault (never touches the user's real vault).
- `pilot/run-councils.mjs` — fires `council.run` × 10 per idea, mode rotation per protocol (4 pre_mortem + 3 standard + 3 steelman). Resumable. `PILOT_CLIS=…` to narrow.
- `pilot/score-cites-auto.mjs` — deterministic scorer matching each persona's `most_vulnerable_assumption` against the corpus's refuted db_id.
- `pilot/RESULT.md` — full write-up: top-line, per-mode, per-PEP, qualitative judgement of the prose, caveats, reproducibility.

### Caveats (in pilot/RESULT.md)

The headline result has a 2-CLI dispatch caveat (codex hung on MCP autoload in the dev env, so the pilot ran claude+gemini × 2 personas instead of pre-registered 3 CLIs × 2 personas), one corpus, structural-not-prose match for the metric. The qualitative read of the prose is strong: in every sampled session the council substantively attacks the refuted assumption with arguments that mirror the actual historical refutation.

## 0.2.0-alpha.8 — 2026-04-26

**`FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION` — opt-in subscription auth for
the council's `claude` cells.** Surfaced during the v0.2 cite-rate pilot:
the dispatcher's `--bare` flag is the only thing forcing claude to look
for `ANTHROPIC_API_KEY`; without it, claude inherits the logged-in
Claude Code CLI subscription auth.

Default behavior is unchanged — `--bare` stays on, dispatch is hermetic
(no MCP servers, no plugins, no session bleed) and routes through the
API key. Operators on the Claude Code subscription who want councils
billed against that subscription can now set:

```
FLYWHEEL_IDEAS_CLAUDE_USE_SUBSCRIPTION=1
```

This drops `--bare` from the spawned argv. `-p`,
`--no-session-persistence`, and the other hermeticity flags stay; only
the API-key-required gate flips.

Trade-off: subscription mode means each spawn loads the user's MCP /
plugin config. For a 50-council pilot that's a noticeable perf hit
(plugin discovery on cold start). API-key mode remains the default for
production deployments.

Test added at `packages/core/test/claude-argv.test.ts`.

## 0.2.0-alpha.7 — 2026-04-25

**Fix: `import.scan` honours `scan_config`.** The alpha.6 dispatcher accepted
`scan_config` on the tool surface, persisted it on the
`ideas_import_sources` row, but did not pass it to the adapter — so
`scan_config.filter` was silently ignored on the live `python/peps`
scan path. A filtered network scan still walked all ~770 PEPs through
the 50ms-stagger loop. Surfaced while building the v0.2 cite-rate
pilot in `pilot/`.

The fix is small and additive:

- `ImportContext` gains an optional `scanConfig: Record<string, unknown>`
  field. Adapters that need scope can read it; existing adapters that
  ignore it are unchanged.
- `scanSource` plumbs `input.scan_config` through `collectCandidates`
  into the context.
- `github-structured-docs` adapter merges `scanConfig` over the
  URI-parsed defaults — caller's `filter`, `limit`, `pathPrefix`,
  `ref`, `repo`, `fixtureDir` win. Unknown keys are ignored.

Tests added at both layers:
- `packages/core/test/import-pep-adapter.test.ts` — adapter-level
  filter + limit pass-through.
- `packages/mcp-server/test/import-tool.test.ts` — end-to-end
  `import.scan({scan_config: {filter}})` returns a single matching
  candidate.

Schema unchanged. No new env vars.

## 0.2.0-alpha.6 — 2026-04-24

**README + design-principles truth-up.** No code changes. Aligns the
public-facing docs with what the v0.2 alpha train actually shipped:

- Status banner reflects the alpha train + cite-rate-pilot GA gate
  instead of "0.1.0 GA shipped" alone.
- "How it works" describes the actual flywheel-memory subprocess write
  path (alpha.5) instead of the mythical vault-core orchestration.
- flywheel-memory promoted from "recommended" to "preferred / active
  write path when installed" in the Quickstart prerequisites.
- Tool surface enumerates all five MCP tools — `idea`, `assumption`,
  `council`, `outcome`, `import` — including the v0.2 actions
  (`freeze`, `ancestry`, `radar`, `extension_set/get`, `delta`,
  `import.scan/promote`).
- v0.2 roadmap section lists each shipped alpha by number and what's
  still outstanding (cite-rate pilot + this truth-up PR).
- Design principles + ecosystem section corrected: the active write
  path is flywheel-memory's MCP, not vault-core; M13 real `claude -p`
  e2e in CI is still pending.
- Memory-bridge hardening lines disambiguated as `v0.1 alpha.3/4/5`
  (pre-GA), not the v0.2 alpha train.

## 0.2.0-alpha.5 — 2026-04-24

**v0.2 Infrastructure migration: flywheel-memory as the active write path.**
Retires direct-fs as the default write tier. When flywheel-memory is
installed and its `note` + `vault_update_frontmatter` tools are available,
every vault write (idea, assumption, outcome, council view, synthesis,
argument map, imported notes) routes through the subprocess writer.
Direct-fs remains the fallback when the subprocess is unavailable or
times out mid-write.

Also fixes a zero-impact v0.2.0-alpha.1 bug: flywheel-memory's custom
category names (`ideas_note`, `ideas_assumption`, etc.) had no overlap
with the `type:` values actually emitted in note frontmatter (`idea`,
`assumption`, `outcome`, `council_view`). The type_boost was boosting
nothing across the entire ideas surface. Fixed in this PR so the category
registration matches the writers.

### Write path

- **Startup probe** — `probeWritePath(vaultPath)` is called once at server
  startup. Spawns flywheel-memory, calls `tools/list`, confirms `note` +
  `vault_update_frontmatter` are advertised, closes. Sets
  `getActiveWritePath()` for the server lifetime. Best-effort — all
  failure modes downgrade to `direct-fs`.
- **MCP-subprocess writer** (`packages/core/src/write/mcp-subprocess.ts`)
  — spawns a one-shot flywheel-memory subprocess per write, calls the
  corresponding tool, closes. Clones the `evidence-reader.ts` lifecycle
  exactly — same env hygiene, same spawn/teardown semantics, same
  best-effort error classification.
- **Dispatcher** (`packages/core/src/write/index.ts`) — `writeNote` and
  `patchFrontmatter` dispatch on the active tier. Per-call fallback to
  direct-fs if the subprocess skips mid-call, so no write is ever lost.
  Every response's `write_path` field reports the tier actually used.

### Category alignment fix (zero-impact bug in v0.2.0-alpha.1)

`IDEAS_CATEGORIES` in `packages/core/src/memory-bridge.ts` now registers
the names actually emitted by the note writers:

- `idea` (replaces `ideas_note`), `type_boost: 2`
- `assumption` (replaces `ideas_assumption`), `type_boost: 1`
- `council_view` (replaces `ideas_council_session`), `type_boost: 1`
- `outcome` (replaces `ideas_outcome`), `type_boost: 1`

Before: zero overlap between registered categories and emitted types, so
flywheel-memory's wikilink scorer treated every ideas note as `unknown`
and the type_boost was a no-op. After: ideas notes participate in the
graph as intended.

### API change (core internals)

- `activeWritePath` constant removed from the public surface. Callers
  migrate to `getActiveWritePath()` which returns the current tier at
  call time. MCP tool handlers all call the getter for response
  `write_path` fields.
- `writeNote` / `patchFrontmatter` in `write/index.ts` are now dispatcher
  functions. Direct-fs-specific callers (e.g. tests that want to bypass
  the dispatcher) use the renamed `writeNoteDirectFs` /
  `patchFrontmatterDirectFs`.

### Operator knobs (new)

- `FLYWHEEL_IDEAS_WRITE_SUBPROCESS_TIMEOUT_MS=...` — per-write subprocess
  timeout (default 15000ms).
- `FLYWHEEL_IDEAS_WRITE_PROBE_TIMEOUT_MS=...` — startup probe timeout
  (default 10000ms).

Reuses:
- `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` — shared kill switch (disables
  memory-bridge registrar, evidence-reader, and the write subprocess).
- `FLYWHEEL_MEMORY_BIN=<path>` — binary override.

### Test surface

+16 net tests for write-path coverage. New coverage:

- Probe: defaults to `not_probed`, returns `disabled` on kill switch,
  `binary_not_found` on missing absolute path, `tools_missing` when the
  mock doesn't advertise write tools, `subprocess_ok` happy path.
- Subprocess writer: happy path writes note via mock, forced tool errors
  surface as `tool_returned_error`, missing binary classified cleanly.
- Subprocess frontmatter patch: happy path, forced errors.
- Dispatcher: `direct-fs` path when tier is direct-fs, per-call fallback
  to direct-fs when the tier is `mcp-subprocess` but the subprocess
  skips. Category alignment test updated to assert the new names.

### Why alpha still

v0.2.0 GA gate remains the pre-registered 10-council cite-rate pilot
against a public-corpus vault (python 2→3 via PEPs is the chosen
corpus). This PR adds load-bearing infrastructure for that pilot
without changing the gate itself.

## 0.2.0-alpha.4 — 2026-04-24

**v0.2 keystone — temporal insights in the evidence pack.** Completes the
only remaining ⏳ bullet in the v0.2.0-alpha.1 keystone query plan: a
fifth retrieval source that surfaces drift/staleness signals on the
idea's own note.

Before each `council.run`, flywheel-ideas now calls
`insights(action:'note_intelligence', path: idea.vault_path)` in parallel
with the existing four queries (search, memory.brief, graph.backlinks,
per-assumption search). The result renders as a structured signals card
in the evidence pack:

```
### Note intelligence: ideas/your-idea.md
- Quality score: 0.42
- Last modified: 2026-01-15
- Missing wikilinks: 3
- Stale sections (2):
  - Motivation — last modified 2026-01-15
  - Rationale — last modified 2026-01-15
> Summary from flywheel-memory...
```

Personas can attack assumptions grounded in stale sections or low-quality
notes — that's a drift signal the pre-migration evidence pack missed
entirely. If flywheel-memory's response is empty (stub, 404, missing
file) or carries an `error` field, the card is suppressed rather than
rendering a zero-signal shell.

### EvidenceSource surface

`kind` union widens to include `'note_intelligence'` alongside the
existing `'search' | 'memory_brief' | 'graph_backlinks' | 'assumption_search'`.
Persisted to `ideas_council_evidence.sources_json` so the audit trail
records which note-intelligence calls informed each session.

### Test surface

+4 net tests for the insights addition. New coverage in
`packages/core/test/council-evidence.test.ts`:

- Full-payload rendering (quality score + missing links + stale sections
  + last modified + summary)
- Partial payload: only the signals present render (others skipped)
- Empty payload suppressed (path-only response doesn't pollute the pack)
- Error payload suppressed
- Insights failure doesn't kill the rest of the query plan

### Why alpha still

v0.2.0 GA gate remains the pre-registered 10-council cite-rate pilot
against the python-2→3 corpus. This PR completes item 3 of the narrow
"core feature complete" scope — one item closer to dogfood readiness.

## 0.2.0-alpha.3 — 2026-04-24
**v0.2 narrow-core-complete item 4 — shaping + hedging actions on
assumptions.** Completes RAND Assumption-Based Planning's full output,
not just the `signposts[]` subset. An assumption now carries three
classes of declared action:

- `signposts[]` (v0.1) — signals that trigger re-evaluation
- `shaping_actions[]` (new) — proactive work to make the assumption
  MORE likely to hold: training, tooling, process changes, vendor
  lock-ins
- `hedging_actions[]` (new) — insurance if it DOESN'T hold: fallback
  plans, feature kill-switches, exit ramps, contingency budgets

This materially strengthens the product thesis: the vault now records
not just *what the bet is* and *when to re-check it*, but also *what
we're doing to make it work* and *what we'll do if it doesn't*.

### Schema v8

Strictly additive — two new columns on `ideas_assumption_extensions`:

```
ALTER TABLE ideas_assumption_extensions ADD COLUMN shaping_actions_json TEXT;
ALTER TABLE ideas_assumption_extensions ADD COLUMN hedging_actions_json TEXT;
```

`NULL` by default; existing rows untouched. Each action item shape
(TS-enforced in `assumption-extensions.ts`):

```typescript
interface AssumptionAction {
  description: string;       // required
  due_at?: string;           // ISO date YYYY-MM-DD
  owner?: string;
  status?: 'planned' | 'in_progress' | 'done' | 'cancelled';
  notes?: string;
}
```

Validation throws `AssumptionActionValidationError` on empty description
or unknown status. Defensive parsing on read — malformed JSON or
non-array shapes return `null` rather than crashing the reader.

### MCP surface

New `assumption` tool actions — `extension_set` + `extension_get` —
expose the full `ideas_assumption_extensions` row (including v0.2 Phase
1 D1's reference-class, metric, and mapping fields that were previously
core-only with no MCP surface):

```
assumption.extension_set({
  id: "asm-xyz",
  base_rate: 0.4,
  go_threshold: 0.6,
  predicted_metric: "activation_rate",
  threshold_value: 0.5,
  threshold_direction: "up",
  mapping: { segment: "SMB SaaS", metric: "activation_rate", threshold: "50%" },
  shaping_actions: [
    { description: "Ship onboarding playbook", owner: "growth", status: "in_progress" },
  ],
  hedging_actions: [
    { description: "Kill-switch via feature flag if activation drops 5pp" },
  ],
})

assumption.extension_get({ id: "asm-xyz" })
```

Both actions carry `next_steps` guiding users through the RAND ABP
completeness checklist (declare shaping + hedging + falsifiable metric)
when fields are missing.

### Test surface

755 tests pass (+15 net). New coverage:

- `ideas_assumption_extensions` v8 columns: shaping-only / hedging-only /
  both / explicit `null` clears / INSERT-OR-REPLACE semantics
- Validation: missing description + unknown status → structured errors
- Defensive parsing: malformed JSON, non-array JSON, items missing
  description → filtered or null
- MCP integration: `extension_set` + `extension_get` round-trip, error
  surfaces (missing id, unknown id, invalid action status), `null`
  clears, next_steps guidance

### Why alpha still

Completes item 4 of 4 in the narrow "core feature complete" scope that
precedes the python-2→3 cite-rate pilot. The GA gate remains the
pre-registered ≥70% cite-rate against a public-corpus vault.

## 0.2.0-alpha.2 — 2026-04-24

**v0.2 Phase 2 — bulk import framework + first adapter (PEPs).** Load-bearing
for the planned Phase 3 public-corpus dogfood (SEC EDGAR filings, python/peps,
kubernetes postmortems) — the corpus vaults cannot be hand-authored. Ships the
import substrate + one concrete adapter so the end-to-end scan → dedup → promote
loop is provable offline against fixtures.

### New MCP tool: `import`

Five actions:

- `import.scan({adapter, source, ...})` — dispatches to a registered source
  adapter, runs dedup via a one-shot `flywheel-memory` subprocess (same
  lifecycle as the v0.2.0-alpha.1 keystone), persists one
  `ideas_import_sources` row + N `ideas_import_candidates` rows. No vault
  writes.
- `import.promote({candidate_id, as, target_idea_id?})` — writes the vault
  note via the existing v0.1 writers (`createIdea`, `declareAssumption`,
  `logOutcome`), then flips the candidate row to `state='imported'`.
  Imported notes are byte-indistinguishable from hand-authored ones.
- `import.list`, `import.read`, `import.reject` — inspect + gate candidates
  without vault side-effects.

Every response carries `next_steps`. No auto-promotion — every vault write
requires an explicit `promote` call.

### First adapter: `github-structured-docs`

Scans a github repo whose top level contains RFC-822-style decision docs.
v0.2 Phase 2 targets `python/peps`; the adapter is written against PEP 1's
shape and reuses the same header parser for any sibling repo that follows
the convention. Per PEP, emits exactly one `idea` candidate
(confidence keyed off Status), 0..N `assumption` candidates (sentences
starting with `assumes` / `requires` / `depends on` / `presupposes`), and
0..1 `outcome` candidate for resolved PEPs (Final / Rejected / Withdrawn)
with a `Resolution` header line.

HTTP only — no clone. Supports a `fixture://<dir>` source for offline
tests.

### Dedup (in-scope this release)

Per candidate, flywheel-memory `search` runs inside the one-shot
subprocess; a top hit with `score >= 0.8` AND matching frontmatter `type`
lands the candidate as `state='duplicate'`. Still promotable via
`override_duplicate: true`. Best-effort: bridge unavailable / timeout
falls back to `pending` without hard-failing the scan.

### Schema

- New v7 migration: additive sidecars `ideas_import_sources` + `ideas_import_candidates`.
  Strictly additive — no mutation of existing rows; candidates live in the
  sidecar until promoted. Foreign-keyed to `ideas_notes(id)` via
  `target_idea_id` with `ON DELETE SET NULL` so candidate-to-idea binding
  survives idea deletion without cascading loss.

### Operator knobs (new)

- `FLYWHEEL_IDEAS_IMPORT_NETWORK=0|1` — adapters that require HTTP throw
  when `0`. Off by default; tests always set `0`.
- `FLYWHEEL_IDEAS_IMPORT_CACHE_DIR=<path>` — adapter-owned fetch cache.
  Default `~/.cache/flywheel-ideas/imports`.

Reuses:
- `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` (dedup kill switch; shared with keystone)
- `FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS` (dedup timeout; shared)

### Refactor

`idea.create` MCP handler now calls a new `createIdea()` helper in core
(`idea-create.ts`). Path + slug helpers moved to `idea-paths.ts`. Net
behavioural diff: zero — all existing idea-tool tests pass unchanged.
The refactor eliminates the duplication that would otherwise arise
between `import.promote(as:'idea')` and `idea.create`.

### Why alpha

Still alpha — v0.2.0 GA gate is the pre-registered 10-council cite-rate
pilot (≥70% cell-level path citation). Phase 2 adds surface area but does
not move that gate. Adapter set is deliberately narrow (1 of 3 locked in
the roadmap) so Phase 3 dogfood can begin against `python/peps` while
SEC EDGAR and github-repo adapters follow in separate PRs.

### Test surface

740 tests pass (+145 net for Phase 2). New coverage:
- PEP parser: header extraction, Resolution capture, malformed-document rejection
- Assumption cue heuristic: positive + negative matching
- Adapter scan in fixture mode: per-PEP kind counts, confidence bands,
  reversibility mapping, network-gate enforcement
- Candidate CRUD: source creation, persist, list filters, state transitions
  (pending → imported, pending → rejected, re-promote rejection)
- Promote path: idea write, kind-mismatch rejection, duplicate override
  semantics, assumption promotion with target idea binding
- MCP integration: tool registration alongside the existing four, scan
  with mock adapter, promote → vault file + list-state coherence, structured
  error surfaces (unknown adapter, kind mismatch, reject flow), fixture-mode
  scan end-to-end

## 0.2.0-alpha.1 — 2026-04-24

**v0.2 KEYSTONE — retrieval-native council input.** Before each
`council.run` dispatches, flywheel-ideas now spawns a one-shot
`flywheel-memory` MCP subprocess to query the user's vault (search +
memory.brief + graph.backlinks + per-load-bearing-assumption search),
assembles a markdown evidence pack, and injects it into every persona
prompt. Personas are instructed to surface where evidence contradicts or
supports declared assumptions, citing the source path explicitly.

> Thesis (per `roadmap-v0-2`): *"the decision loop is strong; the next
> gain is better context going IN, not more personas."*

The council brainstorm round (claude + copilot) attacked an earlier
"long-lived subprocess at server boot" design as over-engineered. The
shipped pattern clones the proven `memory-bridge.ts` lifecycle exactly:
spawn-then-close per `council.run`. No zombie processes, no MCP protocol
state divergence, no parent-shutdown leaks.

### Schema

- New v2 migration: additive `ideas_council_evidence` sidecar table
  (1:1 with `ideas_council_sessions`, ON DELETE CASCADE). No mutation
  of existing rows. Stores `sources_json` so users can audit which
  vault notes informed each council session.

### Tools (no MCP surface change)

The `council.run` MCP action is unchanged. Evidence assembly is
transparent: cells with evidence carry richer prompts, cells without
(reader unavailable / no vault matches) ship with the v0.1 prompt
shape. Graceful degradation surfaces a one-line stderr note when
flywheel-memory isn't installed or the subprocess can't spawn.

### Operator knobs

- `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` — kill switch (shared with the M14
  memory-bridge registrar; disables both)
- `FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS=...` — per-call timeout
  (default 5000ms)

### Pre-registered falsification gate

Per the v0.2 plan's success metric (Copilot's counter, accepted
verbatim by user): a 10-council pilot must show **≥70% of cells
explicitly cite a vault path** in their critique to validate the
keystone thesis. Below that threshold, the keystone is plumbing
without payoff and the approach reassesses. Test helper
`packages/core/test/helpers/cite-rate.ts` measures via path
substring match.

### Why alpha

Alpha cycle exists for the dogfood signal that sets the GA gate. v0.2.0
GA cuts only after a 10-council pilot meets the cite-rate threshold and
the keystone changes council quality in a way the user can articulate.
Use `npx -y @velvetmonkey/flywheel-ideas@alpha` to opt in; the `latest`
dist-tag stays on v0.1.x stable.

### Test surface

564 tests pass (+38 net for v0.2). Eight new test surfaces:
schema v2 upgrade, evidence-store CRUD, evidence-reader subprocess
(kill switch, binary resolution, happy path, timeout, helper),
evidence-pack assembler (query plan, degradation, budget enforcement,
section-boundary truncation), council wiring (override, skip, null,
two-pass survival), cite-rate measurement.

## 0.1.1 — 2026-04-24

**Dogfood-driven carry-overs from v0.1.0 GA.** All three fixes were surfaced
by the GA dogfood ([docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md)) —
real-world signal turned three known-unknowns into known-knowns.

### Fixed

- **`council.run` now respects the `clis` arg.** Previously, passing
  `clis: ['claude','gemini']` was silently dropped at the MCP zod schema
  layer; the orchestrator dispatched all three CLIs anyway. The schema now
  declares `clis: z.array(z.enum(['claude','codex','gemini'])).optional()`
  and the handler passes it through to `runCouncil()` as `clis_override`.
  Three new tests cover one-CLI / two-CLI / default-three-CLI paths.
- **CLI auth + rate_limit error classification.** `auth` and `rate_limit`
  were declared but uncatalogued through GA. v0.1.1 wires patterns for
  both across all three CLIs:
  - `claude-auth-not-logged-in` — real fixture from the GA dogfood
    (`"Not logged in · Please run /login"` + `"error":"authentication_failed"`).
  - `codex-auth-turn-failed`, `codex-rate-limit-turn-failed`,
    `claude-rate-limit`, `gemini-auth-missing-key`, `gemini-rate-limit` —
    synthesized from public CLI/API docs; fixture headers mark them
    `SYNTHESIZED 2026-04-24` for swap-on-real-capture.
  - `UNCATALOGUED_REASONS` is now empty; the test suite asserts every
    CLI carries patterns for both `auth` and `rate_limit`.

### Added

- **M13 — real `claude -p` E2E test scaffold.** New
  `packages/core/test/council.real-e2e.test.ts` runs `runCouncil()` against
  the real `claude` CLI end-to-end. Self-skipped when
  `RUN_REAL_COUNCIL_TESTS=1` is unset, so normal `npm test` is unaffected.
  Vitest per-test retry (2) + cell-level isolation already in `runCouncil()`
  give the flake-aware demotion the M13 spec called for. CI wiring
  deferred — the workflow_dispatch + `run-e2e` PR-label gate is implemented
  in the test scaffold's prose, but no CI job is registered until the
  Anthropic OAuth secret is configured (intentional; opt-in when ready).

## 0.1.0 — 2026-04-23

**v0.1.0 GA — first stable cut.** Cuts straight from alpha.5 after a
re-dogfood of the published artifact, including one real `claude` + `gemini`
council session. Full transcript + findings: [docs/dogfood-v0.1-ga.md](./docs/dogfood-v0.1-ga.md).

This is the first stable release on the npm `latest` dist-tag.

### What's in v0.1.0

The local-first falsifiable decision ledger. Four MCP tools forming the
closed loop `idea → assumption → council → outcome → propagation`:

- **`idea`** — markdown-first idea lifecycle (8 states); atomic DB +
  frontmatter transitions with rollback-on-failure; stale-row filtering;
  `idea.list({needs_review: true})` filter for the compounding-mechanism
  queue.
- **`assumption`** — Y-statement structured input + free-text fallback;
  OSF-style pre-registration locks; load-bearing tagging; signpost-based
  re-evaluation surfacing.
- **`council`** — multi-model subprocess dispatcher (claude / codex /
  gemini); 3 × 5 = 15 cells at full depth; mandatory two-pass metacognitive
  structure per cell; CLI-interleaved concurrency for rate-limit safety;
  per-cell failure isolation; deterministic SYNTHESIS.md with sentence-
  level Jaccard agreement + disagreement sections; out-of-band approval
  gate (the LLM cannot grant or revoke its own consent).
- **`outcome`** — log refute + validate verdicts; refutation cascades
  through the citation graph and flags every dependent idea
  `needs_review = 1`; reversible via `outcome.undo` with sticky-refutation
  semantics for multi-outcome overlap; per-outcome `model_version` captured
  from `<cli> --version` at session start.

Plus a **memory-bridge** that registers `ideas_*` note types as custom
categories with `flywheel-memory` on startup so ideas notes participate in
the shared wikilink scorer + citation graph.

### v0.1.0 = M1 → M14 + alpha.4 hardening + alpha.5 consolidation

Aggregating what shipped across the alpha train:

- **M1–M3**: monorepo scaffold, idea + lifecycle, schema + migrations.
- **M4–M5**: write-path orchestration (direct-fs + planned vault-core
  paths), assumption surface with Y-statements + signposts.
- **M6**: out-of-band approval plane + dispatch audit log.
- **M7**: CLI-quirks catalogue + error classifier baseline.
- **M8–M10**: real council dispatcher (claude → codex → gemini); two-pass
  self-critique; concurrency limiter; CLI-interleaved matrix; full
  3 × 5 cells; strict benign-stderr filter.
- **M11**: synthesis with agreement / disagreement via sentence-level
  Jaccard.
- **M12**: outcome propagation — the compounding mechanism.
- **M14**: memory-bridge custom-category registration.
- **alpha.4 hardening**: 3 CRITICAL + 5 HIGH (path-security symlink
  bypass, maxBuffer SIGKILL escalation, Windows `.cmd`-shim regression
  test, frontmatter sync for transitions + needs_review,
  `isDirectInvocation` Windows fix, `PACKAGE_VERSION` crash hardening,
  memory-bridge cold-start timeout).
- **alpha.5 consolidation**: `idea.list` `needs_review` filter,
  `model_version` capture, stale-milestone-reference sweep across
  comments + tool descriptions.

516 tests on the matrix (Linux + Windows × Node 22 + 24).

### Known gaps (carry to v0.1.1 / v0.2)

- M13 — real `claude -p` end-to-end test in CI with flake-aware demotion.
- CLI-error classifier auth + rate_limit patterns. The GA dogfood captured
  a real `claude` "Not logged in · Please run /login" failure; the
  authentication_failed payload should be classified as `auth` not
  `exit_nonzero`.
- `council.run`'s `clis` arg isn't respected — the orchestrator dispatches
  all 3 CLIs even when a subset is requested via the MCP tool args.
- Lifecycle prerequisite enforcement (transitions are recorded but not
  validated in v0.1; v0.2 work).
- v0.2 product surface: LLM-based synthesis, Assumption Radar (proactive
  semantic vault-wide signal detection), `idea.freeze`/`council.freeze`
  (OSF snapshots), steelman council mode, lineage queries, decision_delta
  view.

### Install

```bash
npm install -g @velvetmonkey/flywheel-ideas
```

Or in `.mcp.json`:

```json
{
  "mcpServers": {
    "flywheel-ideas": {
      "command": "npx",
      "args": ["-y", "@velvetmonkey/flywheel-ideas"],
      "env": { "VAULT_PATH": "/path/to/your/vault" }
    }
  }
}
```

The `@alpha` dist-tag has been removed; `latest` now points at v0.1.0
stable. The next pre-release train (v0.2 alpha) will re-create `@alpha`.

## 0.1.0-alpha.5 — 2026-04-23

Consolidation milestone — last release candidate before v0.1.0 GA.
Sourced from an external code-review re-appraisal that scored the repo
"good progress, real product, still early, not yet trustworthy enough to
call mature." Their core thesis: tighten the surface so the repo tells
one consistent story. 4 fixes; no new product surface.

### Added

- **`idea.list({needs_review: true})` filter.** The compounding
  mechanism's queue (ideas flagged for re-review by outcome.log
  refutation cascades) was returned in results but couldn't be queried.
  Filter is index-supported via the partial index on `needs_review = 1`
  added in M3. `outcome.log` next_steps now suggest the new filter so
  users discover it immediately after their first cascade.
- **`ideas_council_views.model_version` capture.** New
  `packages/core/src/cli-version.ts` `probeCliVersion(cli)` helper
  spawns `<cli> --version`, parses the first semver-shaped substring,
  caches by CLI name (a 30-cell council pays the probe at most 3 times),
  hard 3s timeout. The 2 hard-coded `model_version: null` sites in
  `council.ts` now `await probeCliVersion(input.cli)`.
  `FLYWHEEL_IDEAS_NO_VERSION_PROBE=1` disables the probe in tests.

### Changed

- **Stale milestone references swept** across MCP tool descriptions +
  next_step `why` strings (council/idea/assumption) AND core developer
  comments (council.ts, council-prompts.ts, council-parsers.ts, MCP
  server entrypoint). Removed "(Tool ships in a later milestone.)"
  parentheticals on shipped surfaces; rewrote file headers from M8/M9
  future-tense to present-tense describing what actually ships.
  External re-appraisal called this "construction-site vibe"; gemini
  roundtable round 2 expanded the sweep into core/src/.

### Tests

515 tests total (was 506, +9): 411 core + 104 mcp + 1 skipped
(platform-gated). New: 6 cli-version tests using `node --version` as
the real-CLI stand-in; 3 idea-tool tests for the needs_review filter.
Full Linux/Windows × Node 22/24 matrix.

### Out of scope (carries forward)

- M13 — real `claude -p` E2E in CI with flake-aware demotion.
- CLI auth / rate_limit error patterns — need real failure samples to
  write the regex; defer to v0.1.1 unless a sample lands.
- Lifecycle prerequisite enforcement — by-design unenforced in v0.1.

## 0.1.0-alpha.4 — 2026-04-23

Last release candidate before v0.1.0 GA. Targeted bug-fix release —
3 CRITICAL + 5 HIGH from a 2-agent codebase roundtable on alpha.3
(gemini-2.5-pro + claude-sonnet-4) + a docs/release polish pass.

### Fixed

- **CRITICAL** — Path-security symlink bypass on sensitive files.
  `validatePathSecure`'s not-yet-exists branch resolved the deepest
  existing ancestor's symlink and verified it was inside the vault, but
  never re-checked `isSensitivePath` on the composed real target. An
  agent could create `vault/foo -> .git` and write to `foo/config`
  (matching neither blacklist) and the write was approved. Now
  reconstruct the expected real target from `realAncestorPath + leftover`
  and re-run `isSensitivePath` before approval.
- **CRITICAL** — `maxBuffer`-exceed path missed SIGKILL escalation.
  A SIGTERM-ignoring child that flooded stdout would hang the cell and
  permanently occupy a concurrency-limiter slot until the 15-min global
  timeout fired. Extracted `scheduleEscalatingKill` shared by timeout
  and maxBuffer paths.
- **CRITICAL** — Windows `.cmd`-shim regression test. The alpha.3
  Windows test used POSIX symlinks (which Windows npm doesn't actually
  use). Added a real `.cmd`-shim test gated to win32; the symlink test
  is now POSIX-only.
- **HIGH** — `recordTransition` divergence between DB and frontmatter.
  Added new `syncTransitionFrontmatter` helper for library consumers
  (the MCP tool path already had stricter rollback).
- **HIGH** — `outcome.log` / `undoOutcome` never synced `needs_review`
  to dependent ideas' markdown frontmatter. Added best-effort cascade
  patch on both paths so the compounding-mechanism flag is visible in
  Obsidian.
- **HIGH** — `isDirectInvocation` only realpath'd `argv[1]`, not the
  module side. Windows drive-letter case mismatch could break the bin
  invocation. Now realpath both sides.
- **HIGH** — `PACKAGE_VERSION` `readFileSync(package.json)` had no
  try/catch. A missing/unreadable file would crash every importer of
  `@velvetmonkey/flywheel-ideas-core` at module-init. Wrapped with
  `'unknown'` fallback. Refactored to exported `readPackageVersion`
  with injectable file reader for testability.
- **HIGH** — Memory-bridge default timeout bumped from 15s to 30s.
  Cold-start `init_semantic` (model download / schema migration)
  routinely exceeded 15s, tripping a SIGKILL during state.db work.
  Override unchanged via `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS`.
  Also dropped the redundant PID-level SIGKILL fallback after SDK
  close — the SDK already escalates, and our extra kill couldn't help
  when the SDK's SIGKILL hit init_semantic. The 30s bump is the actual
  mitigation.

### Docs

- README updated: M-status flips (M11/M12/M14 ✅; M13 + GA ⏳),
  install snippet now uses the `@alpha` dist-tag explicitly.
- `docs/memory-bridge.md`: switched documented API from the retired
  `flywheel_config` to `doctor({action:'config'})`; bumped timeout text
  to 30s; refreshed cold-start guidance.
- `docs/outcome.md`: new "Frontmatter sync semantics" subsection
  pinning which mutations rollback DB on fs failure (`lockAssumption`,
  `idea.transition` MCP tool) vs which are best-effort (`recordTransition`
  library helper, `outcome.log/undo` cascades).
- `RELEASE.md`: new pre-publish `npm pack` smoke step; **`npm publish
  --tag alpha` now mandatory** so alpha versions don't claim `@latest`;
  rollback playbook added.

### Tests

36 new tests (506 total: 405 core + 101 mcp-server, +1 skipped on
Linux): 24 path-security tests (symlink-bypass + isSensitivePath/
isWithinDirectory/sanitizeNotePath direct coverage), 1 council-spawn
maxBuffer-with-SIGTERM-ignoring-child test, 3 syncTransitionFrontmatter
tests, 2 outcome needs_review-sync tests, 6 PACKAGE_VERSION/
readPackageVersion tests, 1 Windows .cmd-shim test (skipped on Linux).
Full Linux/Windows × Node 22/24 matrix.

## 0.1.0-alpha.3 — 2026-04-23

**Critical fixes** caught during M14 dogfood + new memory-bridge integration.

### Fixed
- **CRITICAL** — `flywheel-ideas-mcp` binary silently no-op on PATH
  installs (`npm install -g`, `npx`). The `isDirectInvocation` check
  compared `import.meta.url` (realpath) against `process.argv[1]`
  (symlink path), causing `main()` to never run. Resolved via
  `realpathSync` comparison.
- **CRITICAL** — `serverInfo.version` advertised stale `0.1.0-alpha.0`
  on every release because the constant was hard-coded. Now read from
  `package.json` at runtime.

### Added — M14 (memory-bridge + dogfood)
- New `memory-bridge` module on flywheel-ideas server startup. Best-effort
  spawn of `flywheel-memory` MCP subprocess; calls `doctor({action:'config',
  mode:'set', key:'custom_categories'})` to register `ideas_note`,
  `ideas_assumption`, `ideas_council_session`, `ideas_outcome` as known
  entity types. Does GET → MERGE → SET so user-defined customs (e.g.
  `recipe`, `paper`) survive intact.
- 15s default timeout, overridable via `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS`.
  `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` disables the bridge entirely.
- Failure is non-fatal — server boots normally with a one-line stderr
  warning when the binary is missing or times out.
- Live-run validated end-to-end against `@velvetmonkey/flywheel-memory@2.11.2`.

### Docs
- New: `docs/memory-bridge.md` — operator-facing one-pager.
- New: `docs/dogfood-alpha2.md` — full dogfood transcript + findings.
- `CLAUDE.md` — added "Memory bridge (M14)" section.

### Changed
- 24 new tests (470 total): 20 unit tests on memory-bridge (happy path,
  merge-preservation, 6 skip reasons, env hygiene, PID-leak after a
  SIGTERM-ignored child); 4 server-startup integration tests
  (binary-missing, success, kill-switch, **symlink-invocation regression**
  that would have caught the alpha.2 bin-install bug).

## 0.1.0-alpha.2 — 2026-04-22

The compounding mechanism — closes the v0.1 closed loop.

### Added — M12 (outcome + propagation)
- `outcome.log({idea_id, text, refutes?, validates?})` — record what
  reality showed; refutation cascades to every idea whose council cited
  the refuted assumption (sets `needs_review=1`).
- `outcome.undo(id)` — idempotent reversal with sticky-refutation
  semantics (multi-outcome overlap correctly preserves still-active
  refutations; `refuted_at` tracks earliest still-active refuter).
- `outcome.list({idea_id?, include_stale?, limit?})` and `outcome.read(id)`.
- 66 new tests including fast-check property coverage of round-trip,
  commutativity, sticky needs_review, and `refuted_at` correctness.

## 0.1.0-alpha.1 — 2026-04-22

Synthesis + council polish.

### Added
- M11 — synthesis agreement + disagreement sections via sentence-level
  Jaccard overlap; rendered into `SYNTHESIS.md` per session.
- M10 — full 3×5 matrix dispatch (3 CLIs × 5 personas) with
  CLI-interleaved concurrency to spread rate-limit pressure.

### Changed
- M10 hardened gemini envelope validation (explicit `.response` checks),
  stricter benign-stderr filtering (full-line anchored regex; fabricated
  auth failures pass through).

## 0.1.0-alpha.0 — 2026-04-21

First public release. M3-M9.

### Added
- `idea.create/list/read/transition` — markdown-first idea lifecycle.
- `assumption.declare/list/lock/unlock/signposts_due/forget` — Y-statement
  assumptions with OSF-style pre-registration locks.
- `council.run/approval_status` — multi-model council dispatcher (claude,
  codex, gemini), two-pass metacognitive structure, approval-gated.
- Full closed-loop infrastructure ready for M12 to wire the propagation
  layer.
