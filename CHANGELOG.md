# Changelog

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
