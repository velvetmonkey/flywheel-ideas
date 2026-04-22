# Release / publish workflow

Two packages ship from this repo:

1. `@velvetmonkey/flywheel-ideas-core` — internal domain library
2. `@velvetmonkey/flywheel-ideas` — the MCP server (what end users install)

**Order matters.** `flywheel-ideas` depends on `flywheel-ideas-core` at an exact
version (`"0.1.0-alpha.0"` etc). The dep is resolved at install-time from npm,
not from the workspace. **Core must be on npm before the server publishes.**

## Release cadence (v0.1 pre-alpha)

- Alpha versions track v0.1 milestones: `0.1.0-alpha.<N>` where `<N>` bumps
  on each published snapshot
- Do not tag a release without CI green on main
- Both packages bump to the same version in lockstep — the mcp-server dep
  references core by exact version

## Prerequisites

- npm login active as the `velvetmonkey` org member
- Clean working tree on `main`, CI green
- Node 22+, npm 9+

## Step-by-step

1. **Bump version in both packages**
   ```bash
   cd packages/core
   npm version 0.1.0-alpha.N --no-git-tag-version
   cd ../mcp-server
   npm version 0.1.0-alpha.N --no-git-tag-version
   # Also update the dep reference:
   # "@velvetmonkey/flywheel-ideas-core": "0.1.0-alpha.N"
   ```

2. **Commit the bump + tag**
   ```bash
   cd ../..
   git add -A
   git commit -m "chore(release): v0.1.0-alpha.N"
   git tag v0.1.0-alpha.N
   git push origin main --tags
   ```

3. **Publish core first** (it runs `clean && build && test` via `prepublishOnly`)
   ```bash
   cd packages/core
   npm publish
   ```

4. **Wait 30-60 seconds** for npm registry to propagate, then publish server
   ```bash
   cd ../mcp-server
   npm publish
   ```

5. **Verify**
   ```bash
   npm view @velvetmonkey/flywheel-ideas-core
   npm view @velvetmonkey/flywheel-ideas
   # Smoke-test the published CLI:
   npx @velvetmonkey/flywheel-ideas@0.1.0-alpha.N --help 2>&1 || true
   ```

6. **Announce** on the GitHub release page linked to the tag.

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

## Unpublishing

npm allows unpublish within 72 hours of a publish. Beyond that window, versions
cannot be removed — only deprecated. Plan version bumps carefully during alpha.

If you need to unpublish in-window:
```bash
npm unpublish @velvetmonkey/flywheel-ideas@0.1.0-alpha.N
npm unpublish @velvetmonkey/flywheel-ideas-core@0.1.0-alpha.N
```

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
