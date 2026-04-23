# Changelog

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
