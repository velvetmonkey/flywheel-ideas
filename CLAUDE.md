# flywheel-ideas — Claude Code Instructions

**flywheel-ideas** — the local-first falsifiable decision ledger. Fourth sibling in the flywheel family. Turns an Obsidian vault into a compounding decision system with multi-model AI council dissent + outcome-driven refutation propagation.

Full product context + design + milestones live in the vault at `~/obsidian/Ben/tech/flywheel/flywheel-ideas/`. This file is the code-adjacent pointer only.

---

## Architecture

```
flywheel-ideas/
├── packages/
│   ├── core/                    # @velvetmonkey/flywheel-ideas-core (private workspace)
│   │   └── src/
│   │       ├── schema.ts        # ideas.db tables + migrations
│   │       ├── ids.ts
│   │       ├── write/           # Option B (vault-core) | C (mcp-subprocess) | D (direct-fs)
│   │       ├── read/notes.ts
│   │       ├── lifecycle.ts     # state machine (v0.1 unenforced)
│   │       ├── assumptions.ts   # Y-statement + signposts + OSF lock
│   │       ├── outcome.ts       # propagation logic
│   │       ├── council.ts       # subprocess dispatcher + two-pass self-critique
│   │       ├── concurrency.ts   # inline limiter (max 3 default)
│   │       ├── personas.ts      # Growth Optimist / Risk Pessimist / etc.
│   │       ├── prompts.ts       # standard / pre_mortem templates
│   │       ├── cli-errors.ts    # per-CLI regex catalogue
│   │       ├── approval.ts      # MCP consent + dispatch log
│   │       └── vault-path.ts    # resolve VAULT_PATH, no hardcoded paths
│   └── mcp-server/              # @velvetmonkey/flywheel-ideas (published binary)
│       └── src/
│           ├── tools/           # idea.ts, assumption.ts, council.ts, outcome.ts
│           ├── next_steps.ts    # shared {result, next_steps} builder
│           └── server.ts
├── test/
│   ├── unit/ · integration/ · e2e/
│   ├── fixtures/demo-vault/
│   └── helpers/
└── vitest.config.ts (per package; pool: 'forks', maxWorkers: 1)
```

## Commands

```bash
npm install
npm run build    # both packages via workspace
npm test         # full suite
npm run lint     # tsc --noEmit
npm run dev      # watch mode
```

## The closed loop (v0.1 scope — this is the product)

```
idea.create → assumption.declare → council.run(pre_mortem) → idea.transition → outcome.log(refutes) → propagation
```

Four MCP tools, ~15 actions total. Everything else in the roadmap supports this.

## Hard product rules

- **No auto-transitions.** User writes final decision rationale.
- **No auto-decisions.** Council output is dissent, never verdict.
- **Dissent always visible.** Synthesis surfaces disagreement, not consensus-washing.
- **Mandatory two-pass metacognitive structure per council cell.** `initial_stance` + `self_critique` + revised `stance` all persisted.
- **Reversibility.** `outcome.log.undo` exists from day one.
- **Every response carries `next_steps`.**
- **No hardcoded paths.** Everything via `VAULT_PATH` env.

## Safety (MCP-spec-compliant)

- `confirm: true` required on `council.run` (acknowledges subprocess spawn)
- **Approval is out-of-band.** The LLM cannot grant, revoke, or reset the
  council-dispatch approval — mutation is not exposed on the tool surface.
- Binary allowlist; no hidden shell construction
- Vault-write path-security inherited from vault-core (or replicated in direct-fs fallback)

### Granting / revoking council-dispatch approval

Approval is resolved with env-var precedence over a persistent file:

```
FLYWHEEL_IDEAS_APPROVE=always|session|never   # preferred — set at server launch
<vault>/.flywheel/ideas-approvals.json         # persistent — manual user edit
```

Precedence: env-var-never > env-var-always/session > file-never > file-always > no-approval.

**Session (one-off, no persistence):**
```bash
FLYWHEEL_IDEAS_APPROVE=session npx @velvetmonkey/flywheel-ideas
```

**Always (persists across restarts):** create the file manually with
```json
{
  "schema": 1,
  "approvals": [
    {
      "feature": "council_dispatch",
      "scope": "always",
      "granted_at": 1714000000000,
      "binaries": ["claude", "codex", "gemini"]
    }
  ]
}
```

**Revoke:** delete the file, or set `FLYWHEEL_IDEAS_APPROVE=never`.

**Inspect:** `council.approval_status` (read-only) — reports current state
without mutation.

### Audit

`ideas_dispatches` is the audit trail — `cli`, `argv`, `approval_scope`,
`started_at`, `finished_at`. M6 ships the helper primitives but does **not**
write rows; the real council dispatcher in M8 is the first caller. The argv
column will carry flags only (prompts route via stdin) to keep user idea
text out of the audit log.

## Testing

- Vitest 4.x; `pool: 'forks'`, `maxWorkers: 1` (verbatim from flywheel-memory — required for better-sqlite3 teardown on Windows)
- fast-check for parsers, concurrency, propagation
- `mcp-testing-kit` for in-memory MCP round-trips
- **Real `claude -p` e2e in CI from day one**, PR-gated with flake-aware demotion
- Temp vault per test via `fs.mkdtempSync`; real better-sqlite3 file; cleanup in `afterEach`

## Write-path architecture (runtime feature-detection)

- **Option B (preferred):** library import from vault-core once `core/write/*` orchestration lifts there
- **Option C (fallback):** spawn flywheel-memory MCP as child, call note/frontmatter tools over stdio
- **Option D (degraded):** direct fs + gray-matter with warning in every `next_steps`

Detection at startup via `packages/core/src/write/writer.ts`. `result.write_path` field on every tool response reports active tier.

## Dependencies

- `@velvetmonkey/flywheel-ideas-core` — workspace sibling
- `@modelcontextprotocol/sdk` — MCP protocol
- `better-sqlite3` — ideas.db
- `gray-matter` — frontmatter
- `zod` — tool-input validation

No LLM SDKs. No outside product dependencies. CLI subprocesses only.

## License

Apache-2.0

## Full plan + research

See `~/obsidian/Ben/tech/flywheel/flywheel-ideas/` — 21 notes covering thesis, competitive landscape, data model, council design, write-path architecture, safety, testing, milestones, v0.2/v0.3 roadmaps, long-term vision, research agenda, risks, decisions log, seven review rounds.
