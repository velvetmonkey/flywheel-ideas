# Dogfood — alpha.2 → alpha.3 (M14)

The plan called for a live run of v0.1.0-alpha.2 against real CLIs on a real
idea, with findings rolled into the alpha.3 / v0.1.0 release notes.

This document is the run + findings. **Spoiler: the dogfood found two
critical bugs in alpha.2 that would have broken every end-user install.
Both are fixed in alpha.3.**

## What I did

1. Installed `@velvetmonkey/flywheel-ideas@0.1.0-alpha.2` globally via npm.
2. Pointed it at a fresh scratch vault `/tmp/flywheel-ideas-dogfood` with
   `FLYWHEEL_IDEAS_APPROVE=session`.
3. Drove an MCP session via a small JSON-RPC stdin/stdout driver
   (`/tmp/dogfood-driver.mjs`). Goal: walk the closed loop end-to-end on
   the idea "Should I keep building flywheel-ideas or pivot?"
4. After hitting the alpha.2 bugs, switched to the alpha.3 candidate
   (this branch's local build) and re-ran.

I deliberately skipped `council.run` in this pass — it dispatches real
claude/codex/gemini CLIs, which costs API tokens, and the M9 codex hang
is a known issue. Council dispatch will be exercised in M13.

## Findings

### CRITICAL #1 — alpha.2 binary silently no-ops on install

**Repro:** `npm install -g @velvetmonkey/flywheel-ideas@0.1.0-alpha.2`,
then run `flywheel-ideas-mcp`. The bin script (a symlink into
`lib/node_modules/.../dist/index.js`) starts, then **exits 0 immediately
without serving any MCP requests**. Same behaviour via `npx`.

**Root cause:** `dist/index.js` line 1559:
```js
const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? "");
```

Under Node ESM, `import.meta.url` is the **realpath** of the module
(`file:///...lib/.../dist/index.js`). But `process.argv[1]` is the
**symlink path** the shell resolved (`/.../bin/flywheel-ideas-mcp`).
Neither comparison matches → `isDirectInvocation = false` → `main()`
never runs → process exits.

**Impact:** Every `npm install -g` and `npx` invocation of alpha.2 is
silently broken. Local-checkout `node dist/index.js` works because there
the two paths are identical.

**Why it wasn't caught:** all integration tests spawn the bundled binary
via `node dist/index.js` (direct path), never through a symlink. `mcp-testing-kit`
uses `createConfiguredServer()` directly — also bypasses `main()`.

**Fix (alpha.3):** resolve `argv[1]`'s realpath and compare against the
module's `fileURLToPath(import.meta.url)`:
```ts
const isDirectInvocation = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  const modulePath = fileURLToPath(import.meta.url);
  if (argv1 === modulePath) return true;
  try { if (realpathSync(argv1) === modulePath) return true; } catch { /* ignore */ }
  return false;
})();
```

### CRITICAL #2 — `PACKAGE_VERSION` constant frozen at `0.1.0-alpha.0`

**Repro:** in any alpha.0/alpha.1/alpha.2 install, the MCP server's
`initialize` response advertises `serverInfo.version = "0.1.0-alpha.0"`
regardless of which version the user actually installed.

**Root cause:** `packages/core/src/index.ts:8` was a hard-coded literal
`'0.1.0-alpha.0'`. Bumping `package.json` on each release didn't bump
this constant — it was missed in the release flow.

**Impact:** users (and downstream tooling that gates on server version)
can't distinguish alpha.0 from alpha.2. Bug reports against "alpha.2"
look like they're against "alpha.0".

**Fix (alpha.3):** read `version` from `package.json` at runtime:
```ts
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
export const PACKAGE_VERSION = pkg.version;
```
Always tracks the installed version. No more drift.

### M14 finding — `flywheel_config` is retired in current flywheel-memory

The original M14 plan called `flywheel_config({mode:'set', key:'custom_categories', ...})`
on the flywheel-memory subprocess. That tool was retired in flywheel-memory
T43+ and **does not exist in the currently-published v2.11.2**. The bridge's
first invocation skipped with `invalid_response: get parse error: Unexpected token 'M', "MCP error "...`

**Resolved during M14:** updated to `doctor({action:'config', mode:'get'/'set', key:'custom_categories', ...})`,
which is the canonical surface in v2.11.2+. Verified end-to-end against the
shipped flywheel-memory v2.11.2:

```sh
$ sqlite3 /tmp/flywheel-ideas-dogfood/.flywheel/state.db \
    "SELECT value FROM flywheel_config WHERE key='custom_categories'"
{"ideas_note":{"type_boost":2},"ideas_assumption":{"type_boost":1},"ideas_council_session":{"type_boost":1},"ideas_outcome":{"type_boost":1}}
```

This is the actual validation of the M14 thesis: at server startup,
flywheel-memory now knows the four `ideas_*` types are real entity categories
and will boost wikilink scores accordingly.

### Working correctly

- `idea.create` — markdown landed at the expected vault path with valid
  frontmatter; response carries `next_steps` pointing at `assumption.declare`
  and `idea.read`.
- `assumption.declare` — Y-statement schema (`context/challenge/decision/tradeoff`)
  works as documented; `text` field also works as alternative; `signpost_at`
  + `signpost_reason` persist; assumption text is rendered as a readable
  Y-statement narrative.
- `assumption.list` — returns all assumptions with full structure including
  signposts. Stale-row filtering works.
- `outcome.log` — refute + validate both work; flagged_count is 0 here
  because this single-idea dogfood has no other ideas citing the refuted
  assumption (which is the correct behaviour). Atomic transaction; markdown
  written; vault path includes the 8-char id suffix as designed.
- `outcome.list` — pulls back the freshly-logged outcome with idle stale-hidden=0.
- `council.approval_status` — read-only inspector returns env-resolved
  approval state correctly.

### Cosmetic / docs lag (defer to alpha.3 cleanup)

- `council.run` next_step text says *"Real council dispatcher lands in M8"*.
  M8 shipped 6 weeks ago. Stale doc string in `tools/council.ts`.
- The `idea.transition` next_step examples in `idea.read` are a bit terse
  — first-time users may need to look at `docs/idea.md` (which doesn't
  exist yet — M-something).

## Three concrete asks for v0.1.0 GA

1. **Block the bin-symlink bug regression.** Add an integration test that
   spawns `flywheel-ideas-mcp` through a symlinked path (mirroring how
   `npm install -g` delivers it) and asserts the server boots. If `npm test`
   would have caught it, alpha.2 wouldn't have shipped broken.
2. **Wire `PACKAGE_VERSION` to package.json in the release script.** The
   alpha.3 fix reads at runtime — that's good — but explicitly verify
   the release CI builds the right number into the artifact via a smoke
   test that calls `initialize` and asserts version-equals-package-json.
3. **Refresh stale doc strings.** Run a sweep: any next_step example or
   tool description that says "lands in M*" should be removed since
   v0.1 is shipping.

## What I learned (qualitative)

- The MCP tool surface is small enough to be navigable in a single session.
  The action-discriminator pattern (4 tools × ~5 actions) keeps cognitive
  load down vs ~20 separate tools.
- `next_steps` are genuinely helpful — when assumption.declare rejected my
  malformed input, the error message and example handed me the right
  shape immediately.
- The Y-statement rendering ("In the context of X, facing Y, we assume Z,
  accepting W") reads better than I expected. Forcing the four-part
  structure surfaced ambiguity in my own assumptions that a free-text
  field would have hidden.

## What's NOT validated by this dogfood

- **Real council dispatch.** No real claude/codex/gemini was invoked. M13
  picks this up with PR-gated `claude -p` e2e in CI.
- **Cross-idea propagation.** `flagged_count: 0` here — the test would
  need 2+ ideas with overlapping assumption citations. Existing M12
  unit tests cover this; live multi-idea propagation will be a future
  user's experience, not mine.
- **Multi-vault.** Single vault throughout.
- **Synthesis quality on real LLM output.** M11's overlap algorithm was
  validated against synthetic stances; real-LLM behaviour is the M13/v0.2
  feedback loop.

## Verdict

alpha.3 is the cut, not v0.1.0 GA. Two CRITICAL bugs found that need
to be in users' hands before we declare GA. Re-dogfood after alpha.3 ships
to confirm the bin-install path actually works.
