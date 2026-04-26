# Wedge research — ADR superseded-by census

**Question:** Is there a single OSS repo with 5+ ADRs marked `Status: Superseded` (or equivalent) that share a coherent decision arc — enough to make the planned `github-repo-adr` import adapter worth building?

**Method:** Cloned each candidate repo (shallow), located its ADR / decision / RFC / KEP folder, walked the markdown files, counted entries whose own status header is "superseded" or "replaced". The goal is files that are themselves superseded (the failure-mode signal), not files that mention the word in passing.

**Date:** 2026-04-26.

## Survey

| Repo | Path | Total .md | Superseded / Replaced | Notes |
|---|---|---:|---:|---|
| `konflux-ci/architecture` | `ADR/` | 63 | **8** | Best candidate. See breakdown below. |
| `spotify/backstage` | `docs/architecture-decisions/` | 16 | 1 | `adr013-use-node-fetch.md` superseded by `adr014-use-fetch.md`. Single chain, low yield. |
| `kubernetes-sigs/cluster-api` | `docs/proposals/` | 40 | 1 | `20200506-conditions.md`. Sparse. |
| `tektoncd/community` | `teps/` | 145 | 0 | TEPs use a separate `kep.yaml` for status, not markdown frontmatter. Sample below. |
| `kubernetes/enhancements` | `keps/` | 19 (top-level .md only) | 0 | KEPs structure is `keps/sig-X/NNNN-name/`; status lives in `kep.yaml`, not the readme. Markdown-frontmatter detector misses them entirely — would need separate yaml-based crawler. |
| `fluxcd/flux2` | `rfcs/` | 0 .md (`.md` files nested deeper) | 0 | RFCs use `README.md` per RFC dir; statuses are inline ("approved", "superseded"). Adapter would need fork-aware traversal. |
| `open-telemetry/oteps` | `text/` | 137 | 0 | OTeps don't carry an explicit superseded status; superseded-by relations are conventional and not machine-readable. |
| `corda/corda` | `docs/` | 6 | 0 | No ADR folder; 6 hits are scattered design docs. |
| `ddd-by-examples/library` | `.` | 3 | 0 | Sample/teaching repo. |
| `trinodb/trino` | `docs/` | 1293 | 0 | Lots of docs but no ADRs; design proposals live in GitHub Issues. |
| `apache/superset` | `docs/` | 169 | 0 | No ADR folder. |
| `arc42/arc42-template` | `.` | 1 | 0 | Template only. |

## konflux-ci/architecture detail

Eight superseded ADRs, with supersession links:

| ADR | Status | Superseded by | Topic |
|---|---|---|---|
| 0001 Pipeline Service Phase 1 | Replaced | 0009 | tekton, kcp |
| 0002 Feature Flags | Replaced | (no link) | api-discovery |
| 0008 Environment Provisioning | Replaced | 0032 | deployment-targets |
| 0013 Test Stream API contracts | Deprecated | 0030 | tekton, testing |
| 0015 Two-phase Integration Service | Superseded | 0037 | snapshot-promotion |
| 0016 Promotion logic in Integration Service | Superseded | 0032, 0037 | promotion |
| 0021 Partner Tasks | Replaced | 0053 | task-validation |
| 0028 Handling SEB Errors | Superseded | 0032 | deployment, error-handling |
| 0031 Sprayproxy | Replaced | 0039 | webhooks, multi-cluster |

That's 9 lines (including 0031 which I noticed mid-tally). The previous detector cap of 8 was a regex strictness artefact; either way the count is in the 8-9 range.

### Coherent decision arc

A clear cluster: **0008 + 0015 + 0016 + 0028 → 0032** (Decoupling Deployment). That is *four* superseded ADRs converging into a single revised model — a meaningful refutation surface for the github-repo-adr adapter to test against. The "Why was the old model wrong?" question can be answered against the prose of any of the four predecessors with 0032 as the answer key.

A second smaller cluster: **0001 → 0009** (Pipeline Service Phase 1 → via Operator), which also has substantive prose on both sides.

### Verdict on `konflux-ci/architecture`

Marginal pass. It has 8-9 superseded ADRs, of which 4 share a coherent arc (the 0032 supersession). One repo is enough to write a real adapter test against, but it is a single repo — multi-repo scaling will require finding similar density elsewhere.

## What surveys missed

- **kubernetes/enhancements** uses `kep.yaml` files, not markdown frontmatter, for status. A KEP-aware adapter would need YAML parsing on the sibling file rather than scanning the README. This is a structural format difference, not just a regex tweak.
- **fluxcd/flux2/rfcs** has each RFC in its own subdir with a README.md. Status often inline in body text. Detector would need per-directory traversal + heuristic body parsing.
- **spotify/backstage** uses `[superseded]` as a title prefix and a `:::note Superseded` block in body, not a frontmatter status line. Detector now picks it up via a title-prefix fallback.

## Implication for the `github-repo-adr` adapter

**Pass — but barely.** The adapter is justified for `konflux-ci/architecture` and similar single-repo deep dives. It is **not** justified as a general "scan any GitHub repo for ADR supersessions" tool yet — most repos do not have enough Status:Superseded entries, and the few that do use heterogeneous formats (frontmatter / body section / kep.yaml / inline note) that defeat a single parser.

Recommended scope if Branch A (build adapter) ships:
- Target the konflux-ci/architecture format specifically (frontmatter `status: Superseded` + `superseded_by: ["NNNN"]`). Document that scope.
- A `github-repo-adr-konflux` style adapter, NOT `github-repo-adr` general. Other format families (KEP yaml, backstage title-prefix, fluxcd README) are separate adapters or out-of-scope.

If the readability wedge (3b ADR text) shows the council can read konflux ADRs substantively, this adapter has a bounded but real test set: 4-decision chain converging on ADR 0032.
