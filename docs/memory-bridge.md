# Memory bridge (M14)

flywheel-ideas writes notes with `type: ideas_note`, `ideas_assumption`,
`ideas_council_session`, and `ideas_outcome` into the same vault that
flywheel-memory indexes. Without registration, those four kinds are unknown
entity types from flywheel-memory's POV — they don't get type-boost in the
wikilink scorer and they're invisible to the citation graph.

The memory bridge fixes this by spawning `flywheel-memory` as an MCP
subprocess at flywheel-ideas server startup and registering the four kinds
as custom categories.

## What gets registered

| Category               | type_boost | Why |
|------------------------|-----------:|-----|
| `ideas_note`           | 2          | The primary citation target — the actual idea note. Higher boost so wikilinks pointing at ideas score above generic notes. |
| `ideas_assumption`     | 1          | Y-statements + signposts. |
| `ideas_council_session`| 1          | Multi-model dissent records. |
| `ideas_outcome`        | 1          | Refutation vectors. |

These match the `type:` frontmatter values flywheel-ideas already writes.

## What if flywheel-memory isn't installed?

Best-effort with stderr warning. The flywheel-ideas server boots normally;
the warning is the only sign anything was skipped:

```
flywheel-ideas: memory-bridge skipped (binary_not_found: flywheel-memory).
Ideas notes will not be boosted in flywheel-memory wikilink scoring.
Install @velvetmonkey/flywheel-memory or set FLYWHEEL_MEMORY_BIN to enable.
```

`reason` is one of:
- `binary_not_found` — `flywheel-memory` not on PATH (and `FLYWHEEL_MEMORY_BIN` not set)
- `spawn_failed` — child failed to launch for some other reason (permissions, etc.)
- `timeout` — child started but didn't finish the GET+SET handshake within the timeout
- `tool_returned_error` — flywheel-memory rejected the call (probably an ABI mismatch — file an issue)
- `invalid_response` — response wasn't shaped the way we expected (also probably an ABI mismatch)
- `disabled` — `FLYWHEEL_IDEAS_MEMORY_BRIDGE=0` was set; intentional skip

## Env knobs

| Var | Default | What |
|---|---|---|
| `FLYWHEEL_IDEAS_MEMORY_BRIDGE` | unset | `0` → skip the bridge entirely (no spawn, no warning loud enough to confuse users — just `(disabled)`). |
| `FLYWHEEL_MEMORY_BIN` | `flywheel-memory` | Override binary path. Useful for non-PATH installs or testing against a custom build. |
| `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS` | `30000` (alpha.4; was 15000 in alpha.3) | Hard timeout for the GET+SET round-trip. Bump for cold-start `init_semantic` / model download (see below). |
| `FLYWHEEL_IDEAS_DEBUG` | unset | `1` → surface transport teardown errors on stderr. |

## Cold-start gotcha

flywheel-memory does `init_semantic` lazily on first run. If your vault is
new, the first launch can take 20–60s (model download). The default 30s
timeout (alpha.4 bumped this from 15s) covers most cold starts; pathological
cases still trigger `(timeout)` and the bridge skips registration — we'd
rather skip than block server startup forever.

Workaround for very-first-run on slow machines:
`FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS=60000`. After init_semantic finishes
once, subsequent launches are <1s and the default 30s ceiling is plenty.

**Note on the SIGKILL window (alpha.4):** if the timeout DOES fire, the SDK's
`StdioClientTransport.close()` does a clean SIGTERM → 2s grace → SIGKILL of
the child. If that SIGKILL lands while flywheel-memory is mid-`init_semantic`
(model download, schema migration), it can leave a partial state. Alpha.4
dropped our redundant PID-level fallback after SDK close (the SDK already
SIGKILLs, and our extra kill couldn't help) — the 30s timeout bump is the
real mitigation. A future v0.2 enhancement may sniff stderr for `init_semantic`
markers and extend the timeout dynamically.

## What gets preserved

If you've manually added custom categories via flywheel-memory's
`doctor({action:'config', mode:'set', key:'custom_categories', value:{...}})`,
those survive. (The standalone `flywheel_config` tool was retired in
flywheel-memory T43+ and folded into `doctor(action:'config')`.) The bridge
does GET → MERGE → SET, not plain SET. Example:

Before:
```json
{ "recipe": {"type_boost": 1}, "paper": {"type_boost": 3} }
```

After flywheel-ideas startup:
```json
{
  "recipe": {"type_boost": 1},
  "paper": {"type_boost": 3},
  "ideas_note": {"type_boost": 2},
  "ideas_assumption": {"type_boost": 1},
  "ideas_council_session": {"type_boost": 1},
  "ideas_outcome": {"type_boost": 1}
}
```

Note: if you previously set one of the `ideas_*` keys yourself (e.g.
`ideas_note: {type_boost: 99}`), our value wins on every startup. The
four `ideas_*` keys are owned by flywheel-ideas.

## Subprocess hygiene

- The MCP SDK's `StdioClientTransport` only inherits a small env allowlist
  (PATH, HOME, SHELL, TERM, USER on POSIX) into the spawned child unless we
  explicitly pass keys. So `FLYWHEEL_VAULTS`, `FLYWHEEL_TOOLS`, etc. on the
  parent process do **not** leak in — the spawned flywheel-memory always runs
  in single-vault mode pinned to our `VAULT_PATH`.
- After timeout or error, we close the SDK transport (which does
  SIGTERM → 2s grace → SIGKILL on the child) and then PID-level SIGKILL as a
  fallback. PID-leak test asserts no orphaned children survive even when
  SIGTERM is ignored.

## When does the bridge run?

Once per flywheel-ideas server launch, after DB migrations and before the
MCP transport binds. That means stderr warnings appear in your Claude Code
or Codex log immediately on startup, not on first tool call.

## Multi-vault note

flywheel-memory supports multi-vault mode via `FLYWHEEL_VAULTS`. The bridge
**always pins the spawned subprocess to single-vault mode** with our
`VAULT_PATH`. Categories register on the vault flywheel-ideas was launched
against; not the user's primary vault if they differ. If you run
flywheel-ideas against multiple vaults (separate launches), each vault
gets its own custom_categories registration in its own `.flywheel/state.db`.

## Race condition (acknowledged trade-off)

GET-MERGE-SET is not atomic at the flywheel-memory side. If a second
flywheel-memory client wrote `custom_categories` between our GET and our SET,
we'd clobber that write. In practice this doesn't happen — flywheel-memory
servers are single-process per vault and the only realistic concurrent writer
is the user via the same server, sequentially. Documented as acceptable for
v0.1.
