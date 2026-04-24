# Changelog

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
