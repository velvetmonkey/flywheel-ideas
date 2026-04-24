/**
 * `github-structured-docs` import adapter — first concrete adapter.
 *
 * Scans a github repository whose top level contains RFC-822-style structured
 * decision docs. v0.2 Phase 2 targets `python/peps`; the adapter is written
 * against the shape of PEP 1 (peps/pep-0001.rst) and reuses the same header
 * parser for any sibling repo that follows the convention.
 *
 * What it emits per PEP:
 *   - exactly one `idea` candidate (the proposal itself; confidence keyed
 *     off Status)
 *   - 0..N `assumption` candidates — sentences in Motivation / Rationale
 *     sections that begin with `assumes`, `requires`, `depends on`,
 *     `presupposes`, or `this PEP assumes`
 *   - 0..1 `outcome` candidate when Status ∈ {Final, Rejected, Withdrawn}
 *     and the header carries a Resolution line
 *
 * HTTP only — no repo clone. Sources are fetched from
 * `https://raw.githubusercontent.com/<repo>/<ref>/<path>`. Callers can
 * substitute a fixture filesystem via `adapterHooks` for tests.
 *
 * Dedup is handled centrally in scan.ts; this adapter does not talk to
 * flywheel-memory.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  ImportAdapterError,
  ImportNetworkGatedError,
  type ImportAdapter,
  type ImportContext,
  type RawCandidate,
} from '../adapter.js';

export const GITHUB_STRUCTURED_DOCS_NAME = 'github-structured-docs';

const DEFAULT_REPO = 'python/peps';
const DEFAULT_REF = 'main';
const DEFAULT_PATH_PREFIX = 'peps/';

/**
 * Fetch hooks — overrideable for tests. Default implementations hit the
 * network; fixture tests supply file-reading replacements.
 */
export interface AdapterHooks {
  listTree(repo: string, ref: string, prefix: string): Promise<string[]>;
  fetchFile(repo: string, ref: string, filePath: string): Promise<string>;
}

/**
 * Parsed config passed via `scan_config` OR embedded in `source`. The
 * canonical `source` shape is `"owner/repo"` but the adapter also accepts
 * `"owner/repo@ref"` and `"owner/repo:path/prefix/"` forms for dogfood
 * convenience.
 */
export interface GithubStructuredDocsConfig {
  repo?: string;
  ref?: string;
  pathPrefix?: string;
  /** Regex filter applied to basenames. */
  filter?: string;
  /** Hard cap on PEPs processed — pins test runtime. */
  limit?: number;
  /** Read from disk instead of network — used when `network=false`. */
  fixtureDir?: string;
}

export class GithubStructuredDocsAdapter implements ImportAdapter {
  readonly name = GITHUB_STRUCTURED_DOCS_NAME;

  constructor(private readonly hooks: AdapterHooks = defaultHooks()) {}

  async *scan(
    source: string,
    ctx: ImportContext,
  ): AsyncGenerator<RawCandidate> {
    const config = parseSource(source);

    // Fixture-directory mode — read PEP-formatted files off disk. Used in
    // unit tests and for replaying cached scans. Doesn't need the network
    // gate.
    if (config.fixtureDir) {
      const entries = await readFixtureDir(config.fixtureDir, config);
      for (const { filename, content } of entries.slice(0, config.limit ?? entries.length)) {
        yield* emitFromContent(filename, content, sourceUriForFixture(config, filename));
      }
      return;
    }

    if (!ctx.network) {
      throw new ImportNetworkGatedError(this.name);
    }

    const repo = config.repo ?? DEFAULT_REPO;
    const ref = config.ref ?? DEFAULT_REF;
    const prefix = config.pathPrefix ?? DEFAULT_PATH_PREFIX;

    let tree: string[];
    try {
      tree = await this.hooks.listTree(repo, ref, prefix);
    } catch (err) {
      throw new ImportAdapterError(
        `failed to list ${repo}@${ref}:${prefix}: ${err instanceof Error ? err.message : String(err)}`,
        this.name,
        source,
      );
    }

    const filtered = filterTree(tree, config);
    const capped = filtered.slice(0, config.limit ?? filtered.length);

    for (const filePath of capped) {
      let content: string;
      try {
        content = await this.hooks.fetchFile(repo, ref, filePath);
      } catch (err) {
        // Single-file failure should not kill the batch — surface a stderr
        // note and keep scanning. The cite-rate pilot tolerates partial scans.
        process.stderr.write(
          `[flywheel-ideas] github-structured-docs: skipped ${filePath}: ` +
            `${err instanceof Error ? err.message : String(err)}\n`,
        );
        continue;
      }
      const basename = filePath.replace(/^.*\//, '');
      const sourceUri = `https://raw.githubusercontent.com/${repo}/${ref}/${filePath}`;
      yield* emitFromContent(basename, content, sourceUri);
      await smallStagger();
    }
  }
}

function* emitFromContent(
  basename: string,
  content: string,
  sourceUri: string,
): Generator<RawCandidate> {
  const parsed = parsePepDocument(content);
  if (!parsed) return;
  const { header, sections } = parsed;

  // ---- idea candidate (always emitted) ----
  const ideaConfidence = confidenceFromStatus(header.status);
  const title = header.title ?? basename.replace(/\.(rst|md)$/, '');
  yield {
    kind: 'idea',
    title,
    bodyMd: renderIdeaBody(header, sections),
    extractedFields: {
      pep_number: header.pepNumber,
      pep_type: header.type,
      status: header.status,
      reversible: isReversible(header.status),
      supersedes: header.supersedes,
      replaced_by: header.supersededBy,
      authors: header.authors,
      created: header.created,
      resolution: header.resolution,
    },
    confidence: ideaConfidence,
    sourceUri,
  };

  // ---- assumption candidates ----
  const assumptionTexts = extractAssumptionSentences([
    sections.motivation ?? '',
    sections.rationale ?? '',
  ]);
  for (const text of assumptionTexts) {
    yield {
      kind: 'assumption',
      title: truncate(text, 80),
      bodyMd: text,
      extractedFields: {
        source_pep: header.pepNumber,
        status: header.status,
      },
      confidence: 0.6,
      sourceUri,
    };
  }

  // ---- outcome candidate (only for resolved PEPs with a Resolution line) ----
  if (header.resolution && statusIsResolved(header.status)) {
    yield {
      kind: 'outcome',
      title: `Resolution: ${title}`,
      bodyMd: `Status: ${header.status ?? 'unknown'}\n\n${header.resolution}`,
      extractedFields: {
        status: header.status,
        resolution: header.resolution,
        source_pep: header.pepNumber,
      },
      confidence: confidenceFromStatus(header.status),
      sourceUri,
    };
  }
}

// ---------------------------------------------------------------------------
// PEP parsing
// ---------------------------------------------------------------------------

interface PepHeader {
  pepNumber: string | null;
  title: string | null;
  type: string | null;
  status: string | null;
  authors: string[];
  created: string | null;
  resolution: string | null;
  supersedes: string | null;
  supersededBy: string | null;
}

interface PepSections {
  motivation: string | null;
  rationale: string | null;
  abstract: string | null;
}

interface ParsedPep {
  header: PepHeader;
  sections: PepSections;
}

export function parsePepDocument(content: string): ParsedPep | null {
  const normalised = content.replace(/\r\n/g, '\n').replace(/\t/g, '    ');
  const { header, rest } = splitHeaderAndBody(normalised);
  if (!header) return null;
  return {
    header,
    sections: extractSections(rest),
  };
}

function splitHeaderAndBody(doc: string): {
  header: PepHeader | null;
  rest: string;
} {
  const lines = doc.split('\n');
  const entries: Array<{ key: string; value: string }> = [];
  let cursor = 0;
  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor];
    if (line.trim() === '') {
      // PEP header ends at the first blank line.
      cursor++;
      break;
    }
    const match = /^([A-Za-z][A-Za-z0-9-]*):\s?(.*)$/.exec(line);
    if (match) {
      entries.push({ key: match[1].toLowerCase(), value: match[2] });
    } else if (entries.length > 0 && /^\s+/.test(line)) {
      // continuation line of previous entry
      entries[entries.length - 1].value += ' ' + line.trim();
    } else {
      break;
    }
  }
  if (entries.length === 0) {
    return { header: null, rest: doc };
  }
  const pick = (name: string) => {
    const e = entries.find((x) => x.key === name);
    return e?.value.trim() ?? null;
  };
  const authorsRaw = pick('author');
  const authors = authorsRaw
    ? authorsRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const header: PepHeader = {
    pepNumber: pick('pep'),
    title: pick('title'),
    type: pick('type'),
    status: pick('status'),
    authors,
    created: pick('created'),
    resolution: pick('resolution'),
    supersedes: pick('replaces') ?? pick('supersedes'),
    supersededBy: pick('superseded-by') ?? pick('replaced-by'),
  };
  return { header, rest: lines.slice(cursor).join('\n') };
}

function extractSections(body: string): PepSections {
  return {
    motivation: findSection(body, 'Motivation'),
    rationale: findSection(body, 'Rationale'),
    abstract: findSection(body, 'Abstract'),
  };
}

/**
 * RST uses underline-style headings — the heading is a line of text followed
 * by a line of `=`, `-`, or `~` characters. We find the section by title
 * then collect lines until the next heading-underline-pair.
 */
function findSection(body: string, heading: string): string | null {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (
      lines[i].trim().toLowerCase() === heading.toLowerCase() &&
      /^[=\-~^]+$/.test(lines[i + 1].trim())
    ) {
      const start = i + 2;
      let end = lines.length;
      for (let j = start; j < lines.length - 1; j++) {
        if (
          lines[j].trim().length > 0 &&
          lines[j + 1].trim().length > 0 &&
          /^[=\-~^]+$/.test(lines[j + 1].trim()) &&
          lines[j + 1].trim().length >= lines[j].trim().length
        ) {
          end = j;
          break;
        }
      }
      return lines.slice(start, end).join('\n').trim() || null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Assumption heuristic
// ---------------------------------------------------------------------------

const ASSUMPTION_CUES = [
  /^\s*(?:this proposal|this pep|we|the plan)\s+(?:assumes|requires|depends on|presupposes)\b/i,
  /^\s*(?:assumes|requires|depends on|presupposes)\b/i,
];

export function extractAssumptionSentences(bodies: string[]): string[] {
  const hits: string[] = [];
  for (const body of bodies) {
    if (!body) continue;
    for (const sentence of splitSentencesForPep(body)) {
      if (ASSUMPTION_CUES.some((r) => r.test(sentence))) {
        const cleaned = sentence.trim();
        if (cleaned.length > 10 && cleaned.length < 500) hits.push(cleaned);
      }
    }
  }
  return hits;
}

function splitSentencesForPep(text: string): string[] {
  // RST often uses double-space or newline-blocks for paragraph breaks.
  // Conservative sentence split: period + whitespace + capital letter OR
  // newline+newline.
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of paragraphs) {
    for (const s of p.split(/(?<=[.!?])\s+(?=[A-Z])/)) {
      const trimmed = s.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceFromStatus(status: string | null): number {
  if (!status) return 0.5;
  const s = status.toLowerCase();
  if (/final|accepted|active/.test(s)) return 1.0;
  if (/rejected|withdrawn|superseded/.test(s)) return 0.95;
  if (/draft|provisional/.test(s)) return 0.7;
  if (/deferred/.test(s)) return 0.6;
  return 0.5;
}

function isReversible(status: string | null): boolean | null {
  if (!status) return null;
  const s = status.toLowerCase();
  // Final / Active PEPs are hard to reverse (the language shipped); Rejected
  // / Withdrawn are trivially reversible (nothing shipped).
  if (/final|active|accepted/.test(s)) return false;
  if (/rejected|withdrawn|superseded|deferred|draft/.test(s)) return true;
  return null;
}

function statusIsResolved(status: string | null): boolean {
  if (!status) return false;
  return /final|rejected|withdrawn|superseded/.test(status.toLowerCase());
}

function renderIdeaBody(header: PepHeader, sections: PepSections): string {
  const parts: string[] = [];
  if (header.pepNumber) parts.push(`# PEP ${header.pepNumber}: ${header.title ?? ''}`.trim());
  else if (header.title) parts.push(`# ${header.title}`);
  parts.push('');
  if (header.status) parts.push(`**Status:** ${header.status}`);
  if (header.type) parts.push(`**Type:** ${header.type}`);
  if (header.authors.length > 0) parts.push(`**Authors:** ${header.authors.join(', ')}`);
  if (header.created) parts.push(`**Created:** ${header.created}`);
  if (header.resolution) parts.push(`**Resolution:** ${header.resolution}`);
  parts.push('');
  if (sections.abstract) {
    parts.push('## Abstract', '', sections.abstract, '');
  }
  if (sections.motivation) {
    parts.push('## Motivation', '', sections.motivation, '');
  }
  if (sections.rationale) {
    parts.push('## Rationale', '', sections.rationale, '');
  }
  return parts.join('\n').trim() + '\n';
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

function parseSource(source: string): GithubStructuredDocsConfig {
  if (source.startsWith('fixture://')) {
    return { fixtureDir: source.slice('fixture://'.length) };
  }
  const config: GithubStructuredDocsConfig = {};
  let rest = source;
  const atIdx = rest.indexOf('@');
  if (atIdx >= 0) {
    config.ref = rest.slice(atIdx + 1);
    rest = rest.slice(0, atIdx);
  }
  const colonIdx = rest.indexOf(':');
  if (colonIdx >= 0) {
    config.pathPrefix = rest.slice(colonIdx + 1);
    rest = rest.slice(0, colonIdx);
  }
  if (rest) config.repo = rest;
  return config;
}

function filterTree(tree: string[], config: GithubStructuredDocsConfig): string[] {
  const prefix = config.pathPrefix ?? DEFAULT_PATH_PREFIX;
  const re = config.filter ? new RegExp(config.filter) : null;
  return tree
    .filter((p) => p.startsWith(prefix))
    .filter((p) => /\.(rst|md)$/i.test(p))
    .filter((p) => !re || re.test(p.replace(/^.*\//, '')))
    .sort();
}

async function readFixtureDir(
  dir: string,
  config: GithubStructuredDocsConfig,
): Promise<Array<{ filename: string; content: string }>> {
  let entries: string[];
  try {
    entries = await fsp.readdir(dir);
  } catch (err) {
    throw new ImportAdapterError(
      `fixture dir unreadable: ${dir}: ${err instanceof Error ? err.message : String(err)}`,
      GITHUB_STRUCTURED_DOCS_NAME,
      dir,
    );
  }
  const re = config.filter ? new RegExp(config.filter) : null;
  const filtered = entries
    .filter((f) => /\.(rst|md)$/i.test(f))
    .filter((f) => !re || re.test(f))
    .sort();
  const out: Array<{ filename: string; content: string }> = [];
  for (const filename of filtered) {
    const full = path.join(dir, filename);
    const content = await fsp.readFile(full, 'utf8');
    out.push({ filename, content });
  }
  return out;
}

function sourceUriForFixture(
  config: GithubStructuredDocsConfig,
  filename: string,
): string {
  return `fixture://${config.fixtureDir}/${filename}`;
}

async function smallStagger(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50));
}

// ---------------------------------------------------------------------------
// Default hooks (real HTTP fetch)
// ---------------------------------------------------------------------------

function defaultHooks(): AdapterHooks {
  return {
    async listTree(repo, ref, prefix) {
      const url = `https://api.github.com/repos/${repo}/contents/${prefix.replace(/\/$/, '')}?ref=${ref}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) {
        throw new Error(`github api ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as Array<{ path?: string; type?: string }>;
      return json
        .filter((e) => e && e.type === 'file' && typeof e.path === 'string')
        .map((e) => e.path as string);
    },
    async fetchFile(repo, ref, filePath) {
      const url = `https://raw.githubusercontent.com/${repo}/${ref}/${filePath}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`raw fetch ${res.status}: ${url}`);
      }
      return await res.text();
    },
  };
}
