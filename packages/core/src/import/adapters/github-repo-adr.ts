/**
 * `github-repo-adr` import adapter — Architecture Decision Records, scoped to
 * the konflux-ci/architecture frontmatter convention.
 *
 * The Phase 3c census surveyed 12 OSS repos for coherent ADR supersession
 * arcs (`pilot/wedge-research.adr-availability.md`); only `konflux-ci/
 * architecture` carried enough markdown-frontmatter ADRs with `superseded_by`
 * references to make a generic parser worth shipping. The adapter accepts
 * `owner/repo` as a source spec but explicitly rejects the source up front
 * if the first three ADRs do not match the konflux convention — pretending
 * to "scan any GitHub repo for ADRs" was rejected during planning as
 * over-promising.
 *
 * What it emits per ADR:
 *   - exactly one `idea` candidate (the ADR's decision; confidence keyed off
 *     status — Replaced/Superseded score 0.95, Accepted 0.9, Deprecated 0.85,
 *     normalised-from-typo 0.8)
 *   - 0..1 `assumption` candidate when a `## Decision` section is present and
 *     substantive (≥30 chars). Linked to the idea via
 *     `extractedFields.parent_idea_source_uri`.
 *   - 0..1 `outcome` candidate:
 *       - `status: Replaced` or `Superseded` + `superseded_by:` set →
 *         outcome refers to the superseder ADR, refutes the assumption above
 *       - `status: Deprecated` → outcome refutes the assumption with no
 *         superseder reference
 *       - `status: Accepted` → no outcome (the assumption stays declared)
 *
 * Hardening (per Phase 4 plan roundtable critique):
 *   - **Per-file skip, not per-source rejection.** A single malformed ADR
 *     mid-stream logs a stderr warning and continues. Only if the FIRST
 *     THREE ADRs fail validation does the adapter reject the source — at
 *     that point the user is clearly running the adapter against a
 *     non-konflux-format repo, not encountering one bad file in a good repo.
 *   - **Frontmatter validation is strict on field names but permissive on
 *     shape.** `superseded_by` accepts string, string[], number, or number[];
 *     the validator normalises. `status` normalises case-insensitively
 *     against the allowlist (Accepted/Replaced/Superseded/Deprecated).
 *   - **GITHUB_TOKEN auth.** Reads `process.env.GITHUB_TOKEN` if present; a
 *     stderr hint is emitted once per process when missing. Unauthenticated
 *     fetches still work (60 req/hr) but a clear surface tells the user how
 *     to upgrade to 5000 req/hr.
 *   - **403 / rate-limit responses parse `X-RateLimit-Remaining` and
 *     `X-RateLimit-Reset`** and surface a clear retry-after error rather
 *     than throwing a generic 403.
 *
 * Source URIs:
 *   - idea:       github-repo-adr://owner/repo@ref:ADR/NNNN-foo.md#idea
 *   - assumption: github-repo-adr://owner/repo@ref:ADR/NNNN-foo.md#assumption
 *   - outcome:    github-repo-adr://owner/repo@ref:ADR/NNNN-foo.md#outcome
 *
 * Dedup is handled centrally in scan.ts; this adapter does not talk to
 * flywheel-memory.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  ImportAdapterError,
  ImportNetworkGatedError,
  type ImportAdapter,
  type ImportContext,
  type RawCandidate,
} from '../adapter.js';

export const GITHUB_REPO_ADR_NAME = 'github-repo-adr';

const DEFAULT_REF = 'main';
const DEFAULT_PATH_PREFIX = 'ADR/';

/**
 * Konflux frontmatter `status` allowlist. Case-insensitive matching;
 * normalised back to canonical case before being stored in
 * `extractedFields.adr_status`.
 */
const VALID_STATUSES = ['Accepted', 'Replaced', 'Superseded', 'Deprecated'] as const;
type AdrStatus = typeof VALID_STATUSES[number];

/**
 * Source-rejection threshold. Parse the first N ADRs; if ALL are malformed,
 * reject the source up front with a clear error pointing at the konflux
 * convention. Otherwise log per-file skips and continue.
 */
const REJECT_AFTER_CONSECUTIVE_BAD = 3;

export interface AdapterHooks {
  listTree(repo: string, ref: string, prefix: string): Promise<string[]>;
  fetchFile(repo: string, ref: string, filePath: string): Promise<string>;
}

export interface GithubRepoAdrConfig {
  repo?: string;
  ref?: string;
  pathPrefix?: string;
  /** Regex filter applied to basenames. */
  filter?: string;
  /** Hard cap on ADRs processed — pins test runtime. */
  limit?: number;
  /** Read from disk instead of network. */
  fixtureDir?: string;
}

/**
 * Internal: a successfully-parsed ADR ready for emit.
 */
interface ParsedAdr {
  title: string;
  status: AdrStatus;
  supersededBy: string[] | undefined;
  topics: string[] | undefined;
  appliesTo: string[] | undefined;
  /** Body markdown (after frontmatter strip). */
  body: string;
  /** Extracted markdown sections — null when absent. */
  decision: string | null;
  context: string | null;
  consequences: string | null;
  /** True if any field needed normalisation (typo rescue). */
  normalised: boolean;
}

export class GithubRepoAdrAdapter implements ImportAdapter {
  readonly name = GITHUB_REPO_ADR_NAME;

  constructor(private readonly hooks: AdapterHooks = defaultHooks()) {}

  async *scan(
    source: string,
    ctx: ImportContext,
  ): AsyncGenerator<RawCandidate> {
    const config = mergeScanConfig(parseSource(source), ctx.scanConfig);

    if (config.fixtureDir) {
      yield* scanFixtureDir(config);
      return;
    }

    if (!ctx.network) {
      throw new ImportNetworkGatedError(this.name);
    }

    if (!config.repo) {
      throw new ImportAdapterError(
        `source "${source}" missing required owner/repo`,
        this.name,
        source,
      );
    }

    yield* scanRepo(this.hooks, config, this.name, source);
  }
}

// ---------------------------------------------------------------------------
// Repo scan (network mode)
// ---------------------------------------------------------------------------

async function* scanRepo(
  hooks: AdapterHooks,
  config: GithubRepoAdrConfig,
  adapterName: string,
  source: string,
): AsyncGenerator<RawCandidate> {
  const repo = config.repo!;
  const ref = config.ref ?? DEFAULT_REF;
  const prefix = config.pathPrefix ?? DEFAULT_PATH_PREFIX;

  let tree: string[];
  try {
    tree = await hooks.listTree(repo, ref, prefix);
  } catch (err) {
    throw new ImportAdapterError(
      `failed to list ${repo}@${ref}:${prefix}: ${err instanceof Error ? err.message : String(err)}`,
      adapterName,
      source,
    );
  }

  const filtered = filterTree(tree, config);
  const capped = filtered.slice(0, config.limit ?? filtered.length);

  let consecutiveBad = 0;
  let totalBad = 0;
  let totalProcessed = 0;

  for (const filePath of capped) {
    let content: string;
    try {
      content = await hooks.fetchFile(repo, ref, filePath);
    } catch (err) {
      // Fetch errors do NOT count toward the konflux-format-rejection
      // threshold (transient network issues should not be confused with
      // wrong-format-source). Skip and continue.
      process.stderr.write(
        `[flywheel-ideas] github-repo-adr: fetch failed for ${filePath}: ` +
          `${err instanceof Error ? err.message : String(err)}\n`,
      );
      continue;
    }

    totalProcessed++;
    const parsed = parseAdr(content);
    if (!parsed) {
      consecutiveBad++;
      totalBad++;
      process.stderr.write(
        `[flywheel-ideas] github-repo-adr: skipped ${filePath} (malformed konflux frontmatter)\n`,
      );

      if (
        consecutiveBad >= REJECT_AFTER_CONSECUTIVE_BAD &&
        totalProcessed === REJECT_AFTER_CONSECUTIVE_BAD
      ) {
        throw new ImportAdapterError(
          `source ${repo}@${ref}:${prefix} rejected: first ${REJECT_AFTER_CONSECUTIVE_BAD} ADRs ` +
            `had malformed konflux-format frontmatter (required: title, status, optional ` +
            `superseded_by). Adapter is scoped to konflux-ci/architecture; see ` +
            `pilot/wedge-research.adr-availability.md.`,
          adapterName,
          source,
        );
      }
      continue;
    }

    consecutiveBad = 0; // reset on a good ADR
    const sourceUriBase = `github-repo-adr://${repo}@${ref}:${filePath}`;
    yield* emitFromParsed(parsed, sourceUriBase, filePath);
    await smallStagger();
  }

  if (totalBad > 0) {
    process.stderr.write(
      `[flywheel-ideas] github-repo-adr: completed scan; skipped ${totalBad}/${capped.length} ADRs (malformed frontmatter)\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// Fixture-directory scan (test mode, network=false)
// ---------------------------------------------------------------------------

async function* scanFixtureDir(
  config: GithubRepoAdrConfig,
): AsyncGenerator<RawCandidate> {
  const dir = config.fixtureDir!;
  let entries: string[];
  try {
    entries = await fsp.readdir(dir);
  } catch (err) {
    throw new ImportAdapterError(
      `fixture dir unreadable: ${dir}: ${err instanceof Error ? err.message : String(err)}`,
      GITHUB_REPO_ADR_NAME,
      dir,
    );
  }
  const re = config.filter ? new RegExp(config.filter) : null;
  const filtered = entries
    .filter((f) => /\.md$/i.test(f))
    .filter((f) => !re || re.test(f))
    .sort();
  const capped = filtered.slice(0, config.limit ?? filtered.length);

  let consecutiveBad = 0;
  let totalProcessed = 0;
  let totalBad = 0;

  for (const filename of capped) {
    const full = path.join(dir, filename);
    const content = await fsp.readFile(full, 'utf8');

    totalProcessed++;
    const parsed = parseAdr(content);
    if (!parsed) {
      consecutiveBad++;
      totalBad++;
      process.stderr.write(
        `[flywheel-ideas] github-repo-adr: skipped ${filename} (malformed konflux frontmatter)\n`,
      );
      if (
        consecutiveBad >= REJECT_AFTER_CONSECUTIVE_BAD &&
        totalProcessed === REJECT_AFTER_CONSECUTIVE_BAD
      ) {
        throw new ImportAdapterError(
          `fixture dir ${dir} rejected: first ${REJECT_AFTER_CONSECUTIVE_BAD} ADRs all had ` +
            `malformed konflux-format frontmatter.`,
          GITHUB_REPO_ADR_NAME,
          dir,
        );
      }
      continue;
    }
    consecutiveBad = 0;
    const sourceUriBase = `fixture://${dir}/${filename}`;
    yield* emitFromParsed(parsed, sourceUriBase, filename);
  }

  if (totalBad > 0) {
    process.stderr.write(
      `[flywheel-ideas] github-repo-adr: completed fixture scan; skipped ${totalBad}/${capped.length} ADRs\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// Candidate emission
// ---------------------------------------------------------------------------

function* emitFromParsed(
  parsed: ParsedAdr,
  sourceUriBase: string,
  adrPath: string,
): Generator<RawCandidate> {
  const baseConfidence = confidenceForStatus(parsed.status, parsed.normalised);

  // ---- idea candidate (always emitted) ----
  yield {
    kind: 'idea',
    title: parsed.title,
    bodyMd: renderIdeaBody(parsed),
    extractedFields: {
      adr_status: parsed.status,
      adr_path: adrPath,
      superseded_by: parsed.supersededBy ?? null,
      topics: parsed.topics ?? null,
      applies_to: parsed.appliesTo ?? null,
      normalised: parsed.normalised,
    },
    confidence: baseConfidence,
    sourceUri: `${sourceUriBase}#idea`,
  };

  // ---- assumption candidate (only if Decision section present + substantive) ----
  if (parsed.decision && parsed.decision.length >= 30) {
    yield {
      kind: 'assumption',
      title: truncate(`Decision: ${parsed.title}`, 80),
      bodyMd: parsed.decision,
      extractedFields: {
        adr_status: parsed.status,
        adr_path: adrPath,
        parent_idea_source_uri: `${sourceUriBase}#idea`,
      },
      confidence: baseConfidence,
      sourceUri: `${sourceUriBase}#assumption`,
    };
  }

  // ---- outcome candidate ----
  // Replaced / Superseded with a superseded_by reference → refutation
  if (
    (parsed.status === 'Replaced' || parsed.status === 'Superseded') &&
    parsed.supersededBy &&
    parsed.supersededBy.length > 0
  ) {
    yield {
      kind: 'outcome',
      title: `${parsed.status}: ${parsed.title}`,
      bodyMd: renderOutcomeBody(parsed),
      extractedFields: {
        adr_status: parsed.status,
        adr_path: adrPath,
        superseded_by: parsed.supersededBy,
        superseder_path: parsed.supersededBy[0],
        refutes_source_uri: `${sourceUriBase}#assumption`,
      },
      confidence: 0.95,
      sourceUri: `${sourceUriBase}#outcome`,
    };
  } else if (parsed.status === 'Deprecated') {
    // Deprecated without a successor — refute the assumption with no superseder.
    yield {
      kind: 'outcome',
      title: `Deprecated: ${parsed.title}`,
      bodyMd: renderOutcomeBody(parsed),
      extractedFields: {
        adr_status: parsed.status,
        adr_path: adrPath,
        refutes_source_uri: `${sourceUriBase}#assumption`,
      },
      confidence: 0.85,
      sourceUri: `${sourceUriBase}#outcome`,
    };
  }
}

function renderIdeaBody(parsed: ParsedAdr): string {
  const parts: string[] = [];
  parts.push(`# ${parsed.title}`);
  parts.push('');
  parts.push(`**Status:** ${parsed.status}`);
  if (parsed.supersededBy && parsed.supersededBy.length > 0) {
    parts.push(`**Superseded by:** ${parsed.supersededBy.join(', ')}`);
  }
  if (parsed.topics && parsed.topics.length > 0) {
    parts.push(`**Topics:** ${parsed.topics.join(', ')}`);
  }
  parts.push('');
  if (parsed.context) {
    parts.push('## Context', '', parsed.context, '');
  }
  if (parsed.decision) {
    parts.push('## Decision', '', parsed.decision, '');
  }
  if (parsed.consequences) {
    parts.push('## Consequences', '', parsed.consequences, '');
  }
  return parts.join('\n').trim() + '\n';
}

function renderOutcomeBody(parsed: ParsedAdr): string {
  const parts: string[] = [];
  parts.push(`Status: ${parsed.status}`);
  if (parsed.supersededBy && parsed.supersededBy.length > 0) {
    parts.push(`Superseded by: ${parsed.supersededBy.join(', ')}`);
  }
  parts.push('');
  if (parsed.consequences) {
    parts.push(parsed.consequences);
  } else {
    parts.push(
      `ADR "${parsed.title}" reached terminal state ${parsed.status}; the load-bearing ` +
        `assumption captured in the Decision section did not survive subsequent review.`,
    );
  }
  return parts.join('\n').trim() + '\n';
}

// ---------------------------------------------------------------------------
// ADR parsing
// ---------------------------------------------------------------------------

export function parseAdr(content: string): ParsedAdr | null {
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(content);
  } catch {
    // gray-matter threw on YAML parse — frontmatter unsalvageable
    return null;
  }

  const data = parsed.data ?? {};
  if (!data || typeof data !== 'object') return null;

  const title = pickString(data, 'title');
  const statusRaw = pickString(data, 'status');
  if (!title || !statusRaw) return null;

  const status = normaliseStatus(statusRaw);
  if (!status) return null;

  const supersededByRaw = pickField(data, 'superseded_by') ?? pickField(data, 'superseded-by');
  const supersededBy = normaliseSupersededBy(supersededByRaw);

  // Detect normalisation events. status normalised iff the input wasn't
  // canonically cased; superseded_by normalised iff it wasn't already string[].
  const statusNormalised = statusRaw.trim() !== status;
  const supersededByNormalised =
    supersededByRaw !== undefined && supersededByRaw !== null && !isPlainStringArray(supersededByRaw);
  const normalised = statusNormalised || supersededByNormalised;

  const topics = pickStringArray(data, 'topics');
  const appliesTo = pickStringArray(data, 'applies_to');

  const body = parsed.content ?? '';
  return {
    title,
    status,
    supersededBy,
    topics,
    appliesTo,
    body,
    decision: extractMarkdownSection(body, 'Decision'),
    context: extractMarkdownSection(body, 'Context'),
    consequences: extractMarkdownSection(body, 'Consequences'),
    normalised,
  };
}

function pickField(data: Record<string, unknown>, key: string): unknown {
  // Try canonical key first, then case-insensitive lookup.
  if (key in data) return data[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(data)) {
    if (k.toLowerCase() === lower) return data[k];
  }
  return undefined;
}

function pickString(data: Record<string, unknown>, key: string): string | null {
  const v = pickField(data, key);
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function pickStringArray(data: Record<string, unknown>, key: string): string[] | undefined {
  const v = pickField(data, key);
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return [v.trim()];
  }
  return undefined;
}

function normaliseStatus(raw: string): AdrStatus | null {
  const lower = raw.trim().toLowerCase();
  for (const valid of VALID_STATUSES) {
    if (valid.toLowerCase() === lower) return valid;
  }
  return null;
}

function normaliseSupersededBy(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    const out = raw
      .map((v) => {
        if (typeof v === 'number') return String(v).padStart(4, '0');
        return String(v).trim();
      })
      .filter(Boolean);
    return out.length > 0 ? out : undefined;
  }
  if (typeof raw === 'string') {
    const items = raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  if (typeof raw === 'number') {
    return [String(raw).padStart(4, '0')];
  }
  return undefined;
}

function isPlainStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/**
 * Extract a markdown section by heading name (case-insensitive). Section ends
 * at the next heading at the same or higher level (e.g. a `## Decision`
 * section ends at the next `##` or `#`; a `### Decision` section ends at the
 * next `###` or higher).
 */
export function extractMarkdownSection(body: string, heading: string): string | null {
  if (!body) return null;
  const lines = body.split('\n');
  const startRe = new RegExp(`^(#{1,6})\\s+${escapeRegex(heading)}\\b.*$`, 'i');
  let startLine = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = startRe.exec(lines[i]);
    if (m) {
      startLine = i + 1;
      startLevel = m[1].length;
      break;
    }
  }
  if (startLine < 0) return null;

  let end = lines.length;
  for (let i = startLine; i < lines.length; i++) {
    const m = /^(#{1,6})\s/.exec(lines[i]);
    if (m && m[1].length <= startLevel) {
      end = i;
      break;
    }
  }
  return lines.slice(startLine, end).join('\n').trim() || null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

function confidenceForStatus(status: AdrStatus, normalised: boolean): number {
  if (normalised) return 0.8;
  switch (status) {
    case 'Replaced':
    case 'Superseded':
      return 0.95;
    case 'Accepted':
      return 0.9;
    case 'Deprecated':
      return 0.85;
  }
}

// ---------------------------------------------------------------------------
// Source-spec parsing + helpers
// ---------------------------------------------------------------------------

function parseSource(source: string): GithubRepoAdrConfig {
  if (source.startsWith('fixture://')) {
    return { fixtureDir: source.slice('fixture://'.length) };
  }
  // Strip optional `github-repo-adr://` URI scheme prefix.
  const stripped = source.startsWith('github-repo-adr://')
    ? source.slice('github-repo-adr://'.length)
    : source;

  const config: GithubRepoAdrConfig = {};
  let rest = stripped;
  // path prefix marker is `:` AFTER an `@ref` (ref doesn't contain `:`).
  // Strategy: find `:` preceded by either `@` or `/repo` boundary.
  const atIdx = rest.indexOf('@');
  let refAndPath: string | null = null;
  if (atIdx >= 0) {
    refAndPath = rest.slice(atIdx + 1);
    rest = rest.slice(0, atIdx);
  }
  // Now `rest` is `owner/repo`; `refAndPath` is `[ref][:path/]` (or null).
  if (refAndPath !== null) {
    const colonIdx = refAndPath.indexOf(':');
    if (colonIdx >= 0) {
      config.ref = refAndPath.slice(0, colonIdx).trim();
      config.pathPrefix = refAndPath.slice(colonIdx + 1).trim();
    } else {
      config.ref = refAndPath.trim();
    }
  } else {
    // No `@ref`; path may still appear: `owner/repo:path/`
    const colonIdx = rest.indexOf(':');
    if (colonIdx >= 0) {
      config.pathPrefix = rest.slice(colonIdx + 1).trim();
      rest = rest.slice(0, colonIdx);
    }
  }
  if (rest) config.repo = rest.trim();
  if (config.pathPrefix && !config.pathPrefix.endsWith('/')) {
    config.pathPrefix = config.pathPrefix + '/';
  }
  return config;
}

function mergeScanConfig(
  base: GithubRepoAdrConfig,
  scanConfig: Record<string, unknown> | undefined,
): GithubRepoAdrConfig {
  if (!scanConfig) return base;
  const out: GithubRepoAdrConfig = { ...base };
  if (typeof scanConfig.repo === 'string') out.repo = scanConfig.repo;
  if (typeof scanConfig.ref === 'string') out.ref = scanConfig.ref;
  if (typeof scanConfig.pathPrefix === 'string') out.pathPrefix = scanConfig.pathPrefix;
  if (typeof scanConfig.filter === 'string') out.filter = scanConfig.filter;
  if (typeof scanConfig.limit === 'number' && Number.isFinite(scanConfig.limit)) {
    out.limit = scanConfig.limit;
  }
  if (typeof scanConfig.fixtureDir === 'string') out.fixtureDir = scanConfig.fixtureDir;
  return out;
}

function filterTree(tree: string[], config: GithubRepoAdrConfig): string[] {
  const prefix = config.pathPrefix ?? DEFAULT_PATH_PREFIX;
  const re = config.filter ? new RegExp(config.filter) : null;
  return tree
    .filter((p) => p.startsWith(prefix))
    .filter((p) => /\.md$/i.test(p))
    .filter((p) => !re || re.test(p.replace(/^.*\//, '')))
    .sort();
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

async function smallStagger(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50));
}

// ---------------------------------------------------------------------------
// Default hooks (real HTTP fetch with GITHUB_TOKEN + 403 awareness)
// ---------------------------------------------------------------------------

const STDERR_ONCE_KEYS = new Set<string>();
function stderrOnce(key: string, msg: string): void {
  if (STDERR_ONCE_KEYS.has(key)) return;
  STDERR_ONCE_KEYS.add(key);
  process.stderr.write(msg);
}

/** Test-only: clear the once-per-process stderr-hint memo. */
export function __resetStderrOnceForTests(): void {
  STDERR_ONCE_KEYS.clear();
}

function defaultHooks(): AdapterHooks {
  return {
    async listTree(repo, ref, prefix) {
      const url = `https://api.github.com/repos/${repo}/contents/${prefix.replace(/\/$/, '')}?ref=${encodeURIComponent(ref)}`;
      const res = await fetchWithGitHubAuth(url, {
        Accept: 'application/vnd.github+json',
      });
      const json = (await res.json()) as Array<{ path?: string; type?: string }> | { path?: string; type?: string };
      const items = Array.isArray(json) ? json : [json];
      return items
        .filter((e) => e && e.type === 'file' && typeof e.path === 'string')
        .map((e) => e.path as string);
    },
    async fetchFile(repo, ref, filePath) {
      const url = `https://raw.githubusercontent.com/${repo}/${ref}/${filePath}`;
      const res = await fetchWithGitHubAuth(url, {});
      return await res.text();
    },
  };
}

async function fetchWithGitHubAuth(
  url: string,
  baseHeaders: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = { ...baseHeaders };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    stderrOnce(
      'github-repo-adr-no-token',
      `[flywheel-ideas] github-repo-adr: GITHUB_TOKEN not set; using unauthenticated fetch ` +
        `(60 req/hr). For 5000 req/hr, set GITHUB_TOKEN to a personal access token with ` +
        `public_repo scope.\n`,
    );
  }

  const res = await fetch(url, { headers });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining') ?? '?';
    const limit = res.headers.get('x-ratelimit-limit') ?? '?';
    const reset = res.headers.get('x-ratelimit-reset');
    const resetIso = reset ? new Date(Number(reset) * 1000).toISOString() : 'unknown';
    const hint = token
      ? ''
      : ' Set GITHUB_TOKEN to a personal access token with public_repo scope to upgrade to 5000/hr.';
    throw new Error(
      `GitHub rate-limited (status ${res.status}; ${remaining}/${limit} reqs remaining; retry after ${resetIso}).${hint}`,
    );
  }
  if (!res.ok) {
    throw new Error(`github fetch ${res.status}: ${url}: ${await res.text()}`);
  }
  return res;
}
