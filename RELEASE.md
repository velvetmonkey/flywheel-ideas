# Release / publish workflow

Two packages ship from this repo:

1. `@velvetmonkey/flywheel-ideas-core` — internal domain library
2. `@velvetmonkey/flywheel-ideas` — the MCP server (what end users install)

**Order matters.** `flywheel-ideas` depends on `flywheel-ideas-core` at an exact
version (`"0.2.1"` etc). The dep is resolved at install-time from npm,
not from the workspace. **Core must be on npm before the server publishes.**

## Release cadence

Two parallel tracks. v0.1.0 GA shipped, v0.2.0 GA shipped 2026-04-26, v0.2.1
(csv-corpus adapter) is staged on `main`:

**Stable releases** (`0.X.Y` and `0.X.Y+1`, etc.):
- Publish without `--tag alpha`, so npm `latest` tracks the most recent stable.
- Bump in lockstep: both packages advance to the same version, mcp-server's
  dep on core references the exact version.

**Pre-release / alpha train** (used during v0.1 → v0.2 GA cycles, currently
dormant):
- Alpha versions follow `0.X.0-alpha.<N>` where `<N>` bumps on each snapshot.
- **`npm publish --tag alpha` is mandatory** so alphas don't claim `@latest`.
- After the next stable cuts, `npm dist-tag rm @velvetmonkey/flywheel-ideas alpha`
  to retire the alpha tag (or leave it pointing at the most recent alpha if
  you want users on `@alpha` to keep tracking pre-releases).

Always:
- Do not tag a release without CI green on main
- Both packages bump to the same version in lockstep

## Prerequisites

- npm login active as the `velvetmonkey` org member
- Clean working tree on `main`, CI green
- Node 22+, npm 9+

## Step-by-step

Examples below use `0.2.X` to reflect current versioning. For an alpha cut,
substitute `0.X.0-alpha.N` and add `--tag alpha` to the publish commands (see
"Why `--tag alpha` matters" in step 5).

1. **Bump version in both packages**
   ```bash
   cd packages/core
   npm version 0.2.X --no-git-tag-version
   cd ../mcp-server
   npm version 0.2.X --no-git-tag-version
   # Also update the dep reference:
   # "@velvetmonkey/flywheel-ideas-core": "0.2.X"
   ```

2. **Commit the bump + tag**
   ```bash
   cd ../..
   git add -A
   git commit -m "chore(release): v0.2.X"
   git tag v0.2.X
   git push origin main --tags
   ```

3. **Pre-publish smoke (`npm pack` + bin spawn)** — catches packing or
   bin-shim regressions BEFORE the artifact reaches the registry. Was the
   missing safety net behind v0.1.0-alpha.2 silently shipping broken.
   ```bash
   cd packages/mcp-server
   npm pack                  # writes velvetmonkey-flywheel-ideas-0.2.X.tgz
   mkdir /tmp/pack-smoke && cd /tmp/pack-smoke
   npm init -y
   npm install ~/src/flywheel-ideas/packages/mcp-server/velvetmonkey-flywheel-ideas-0.2.X.tgz
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
     | VAULT_PATH=/tmp/pack-smoke FLYWHEEL_IDEAS_MEMORY_BRIDGE=0 \
       timeout 8 node_modules/.bin/flywheel-ideas-mcp 2>&1 \
     | grep -q '"version":"0.2.X"' && echo PASS || echo FAIL
   ```

4. **Publish core first** (it runs `clean && build && test` via `prepublishOnly`).
   ```bash
   cd packages/core
   npm publish
   ```

5. **Wait 30-60 seconds** for npm registry to propagate, then publish server.
   ```bash
   cd ../mcp-server
   npm publish
   ```

   **Why `--tag alpha` matters (alpha cuts only):** without it, npm binds the
   published version to the `latest` dist-tag, so `npm install
   @velvetmonkey/flywheel-ideas` (no version specifier) lands users on a
   pre-release. The `alpha` tag keeps the alpha train off `@latest` until
   the next GA. Stable cuts publish without `--tag alpha`.

6. **Verify**
   ```bash
   npm view @velvetmonkey/flywheel-ideas-core dist-tags
   npm view @velvetmonkey/flywheel-ideas dist-tags
   # Expect: latest = 0.2.X (alpha = previous alpha train, or unset)

   # Smoke-test the published CLI:
   npx -y @velvetmonkey/flywheel-ideas 2>&1 < /dev/null | head -5 || true
   ```

7. **Announce** on the GitHub release page linked to the tag.

## What gets included in each tarball

**`flywheel-ideas-core`** (private-ish — users don't interact directly):
- `dist/*.{js,d.ts,js.map,d.ts.map}` — the compiled domain library
- `README.md` — one-line pointer to the main repo
- `LICENSE` — Apache 2.0 (copied from repo root by `prepack`)

**`flywheel-ideas`** (the MCP server users install):
- `dist/index.js` — bundled server entry point (`bin`: `flywheel-ideas-mcp`)
- `README.md` — full user-facing docs (copied from repo root by `prepack`)
- `LICENSE` — Apache 2.0

`prepack` + `postpack` keep the repo root as the single source of truth for
README/LICENSE — they're copied into each package dir only during pack, then
removed after. Git should never see them inside `packages/*/`.

## What's NOT automated (yet)

- CI-driven publishes (workflow would need `NPM_TOKEN` secret + tag trigger)
- Changelog generation
- Release notes drafting

These can be added in a future PR. For now, publishes are local-only by the
maintainer after CI green on main.

## Troubleshooting

- **`ETARGET` when publishing server**: core's version hasn't propagated yet.
  Wait 60s and retry, or check `npm view @velvetmonkey/flywheel-ideas-core`.
- **`ENEEDAUTH`**: run `npm login` (org name: `velvetmonkey`).
- **`E403` on scoped publish**: ensure `publishConfig.access: public` is set
  in the offending package.json.
- **Test failures in `prepublishOnly`**: don't bypass. Fix the root cause; a
  published broken version is much worse than a delayed publish.

## Rollback playbook

If alpha.N ships with a regression:

**Forward-fix (preferred).** Faster + safer than unpublish (npm CDN caches
stay coherent):
1. Revert the offending commits on `main` via PR.
2. Bump to the next patch (0.2.X+1) — or alpha.N+1 if mid-alpha-train.
3. Publish via the standard 2-step flow above (add `--tag alpha` for alphas).
4. Add a CHANGELOG entry that references the regression + the fix.

**Unpublish (security-only).** Use only for security-critical defects (leaked
secret, malware in a transitive dep, etc.). The 72-hour window is hard:
```bash
npm unpublish @velvetmonkey/flywheel-ideas@0.2.X
npm unpublish @velvetmonkey/flywheel-ideas-core@0.2.X
```
After 72 hours the version cannot be removed — only deprecated:
```bash
npm deprecate @velvetmonkey/flywheel-ideas@0.2.X \
  "Critical regression — use 0.2.X+1 instead"
```
Either way: follow up with a forward-fix release ASAP so users have a working
target.
