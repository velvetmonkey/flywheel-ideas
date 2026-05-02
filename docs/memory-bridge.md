# Memory bridge

**flywheel-memory is a required peer dependency in v0.4.0+.** The
flywheel-ideas server spawns `flywheel-memory` as an MCP subprocess at
startup; if the binary isn't on `PATH` (or `FLYWHEEL_MEMORY_BIN` doesn't
resolve), the server hard-fails with `FlywheelMemoryRequiredError` and a
named install command.

The bridge plays **two roles** that users need to keep distinct when
debugging:

## Two roles

### 1. Custom-category registration

flywheel-ideas writes notes with `type: idea`, `assumption`,
`council_view`, `outcome`, and `report` into the same vault that
flywheel-memory indexes. Without registration, those kinds are unknown
entity types from flywheel-memory's POV — they don't get type-boost in the
wikilink scorer and they're invisible to the citation graph.

The bridge fixes this by registering those kinds as custom categories in
flywheel-memory's `custom_categories` config. This is the original M14 purpose
of the bridge.

### 2. Active write-path transport

**Every flywheel-ideas write routes through flywheel-memory's `note` +
`vault_update_frontmatter` tools.** Reads (evidence-pack lookups,
import-dedup queries) similarly route through flywheel-memory's `search` /
`read` tools.

The practical effect: ideas / assumptions / outcomes / council artifacts / reports
are indexed instantly when they land, instead of waiting for flywheel-memory's
watcher cadence. Every flywheel-ideas tool response surfaces `write_path`
(`mcp-subprocess` in production).

If the bridge becomes unreachable mid-session (subprocess crashes, OS-level
fork failure under load), the next write throws `WriteSubprocessFailedError`
rather than silently degrading to direct-fs. The operator restarts the
server; if the bridge is genuinely missing, the next boot surfaces the
install hint. Loud failure beats silent vault divergence.

## Categories registered (role 1 detail)

| Category               | type_boost | Why |
|------------------------|-----------:|-----|
| `idea`                 | 2          | The primary citation target — the actual idea note. Higher boost so wikilinks pointing at ideas score above generic notes. |
| `assumption`           | 1          | Y-statements + signposts. |
| `council_view`         | 1          | Multi-model dissent records. |
| `outcome`              | 1          | Refutation vectors. |
| `report`               | 1          | Generated visibility surfaces, including SEC company tracker reports. |

These match the `type:` frontmatter values flywheel-ideas already writes.

## What if flywheel-memory isn't installed?

The server hard-fails at boot with `FlywheelMemoryRequiredError`. The error
message branches by failure mode so the operator gets a single concrete
next step:

```
flywheel-ideas: FlywheelMemoryRequiredError: flywheel-ideas requires the
@velvetmonkey/flywheel-memory peer to boot.
Resolved binary: flywheel-memory — not found on PATH.
Install: `npm install -g @velvetmonkey/flywheel-memory`
Or set FLYWHEEL_MEMORY_BIN=/absolute/path/to/flywheel-memory
See docs/memory-bridge.md for setup.
```

Failure kinds (drives the message branch):
- `binary_not_found` — `flywheel-memory` not on PATH (and `FLYWHEEL_MEMORY_BIN` not set). Action: install or set the env var.
- `timeout` — bridge probe exceeded the 60s default. Action: bump `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS=120000` for cold-start; if persistent, run flywheel-memory directly to inspect startup logs.
- `spawn_failed` — child failed to launch (permissions, fork failure). Action: verify `flywheel-memory --help` runs in your shell; capture stderr; file an issue.
- `tools_missing` — bridge connected but doesn't expose the required tools (`note`, `vault_update_frontmatter`). Action: upgrade — `flywheel-memory >=0.6.0` is required.
- `invalid_response` — version mismatch on the wire. Action: upgrade both packages.
- `tool_returned_error` — flywheel-memory rejected a startup call. Action: inspect logs; file an issue.

## Env knobs

| Var | Default | What |
|---|---|---|
| `FLYWHEEL_MEMORY_BIN` | `flywheel-memory` | Override binary path. Useful for non-PATH installs or testing against a custom build. |
| `FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS` | `60000` (v0.4.0; was 30000 in v0.2/v0.3) | Hard timeout for the GET+SET round-trip. Bump for cold-start `init_semantic` / model download (see below). |
| `FLYWHEEL_IDEAS_TEST_MODE` | unset | Test-only. `1` → bypass the boot gate so unit/integration tests don't need a real flywheel-memory binary. **Never set in production.** |
| `FLYWHEEL_IDEAS_DEBUG` | unset | `1` → surface transport teardown errors on stderr. |

## Cold-start gotcha

flywheel-memory does `init_semantic` lazily on first run. If your vault is
new, the first launch can take 20–60s (model download). The v0.4.0 default
60s timeout covers most cold starts; pathological cases trigger `timeout`
and the server hard-fails with a message pointing at the timeout-bump env
var.

Workaround for very-first-run on slow machines:
`FLYWHEEL_IDEAS_MEMORY_BRIDGE_TIMEOUT_MS=120000`. After init_semantic
finishes once, subsequent launches are <1s and the default 60s ceiling
is plenty.

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

---

*Last updated: 2026-04-26.*
