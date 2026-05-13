/**
 * Doc-mode file format — parser, serializer, struct types.
 *
 * Implements the contract specified in `docs/single-doc-format.md`.
 * Pure functions: no DB, no fs, no MCP. The MCP-side handlers in
 * `packages/mcp-server/src/tools/idea/doc-mode.ts` orchestrate file IO
 * around these primitives.
 *
 * The single invariant this module exists to enforce:
 *
 *   render(parse(text)) === text          // byte-identical round trip
 *
 * for any well-formed input. The conformance test in
 * `packages/core/test/single-doc-format.test.ts` runs this property
 * against golden fixtures and fast-check property generators.
 *
 * Format summary (full spec in docs/single-doc-format.md):
 *
 *   - YAML frontmatter (id, type=idea, backend=doc, state, title,
 *     created_at, updated_at)
 *   - "# <title>" H1
 *   - "## Claim"             — bet, one or two sentences
 *   - "## Test condition"    — what would refute it
 *   - "## Assumptions"       — zero or more "### Assumption: <id>"
 *     sub-blocks, each followed by a ~~~yaml fenced block
 *   - "## Evidence log"      — append-only "- <iso> — <note>" bullets
 *   - "## Verdict"           — empty, or `state: ...` + `rationale: ...`
 *   - "## Lesson"            — populated when verdict is fail
 *
 * Headers are emitted in this exact order whether or not the section is
 * populated. Empty sections render as the header line followed by a
 * single blank line — same shape every time. That uniformity is what
 * makes round-trip deterministic.
 */

const IDEA_STATES = [
  'nascent',
  'explored',
  'evaluated',
  'committed',
  'validated',
  'refuted',
  'parked',
  'killed',
] as const;
export type DocIdeaState = (typeof IDEA_STATES)[number];

const ASSUMPTION_STATUSES = ['open', 'locked', 'refuted', 'validated'] as const;
export type DocAssumptionStatus = (typeof ASSUMPTION_STATUSES)[number];

const VERDICT_STATES = ['pass', 'fail', 'parked'] as const;
export type DocVerdictState = (typeof VERDICT_STATES)[number];

export interface DocAssumption {
  id: string;
  text: string;
  loadBearing: boolean;
  signpostAt: string | null;
  status: DocAssumptionStatus;
}

export interface DocEvidenceEntry {
  timestamp: string;
  note: string;
}

export interface DocVerdict {
  state: DocVerdictState;
  rationale: string;
}

export interface DocModeIdea {
  id: string;
  title: string;
  state: DocIdeaState;
  createdAt: string;
  updatedAt: string;
  claim: string;
  testCondition: string;
  assumptions: DocAssumption[];
  evidenceLog: DocEvidenceEntry[];
  verdict: DocVerdict | null;
  lesson: string;
}

export class DocFormatError extends Error {
  readonly kind: string;
  constructor(kind: string, message: string) {
    super(`${kind}: ${message}`);
    this.kind = kind;
    this.name = 'DocFormatError';
  }
}

const SECTION_HEADERS = [
  '## Claim',
  '## Test condition',
  '## Assumptions',
  '## Evidence log',
  '## Verdict',
  '## Lesson',
] as const;

type SectionHeader = (typeof SECTION_HEADERS)[number];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Serialize a DocModeIdea struct to canonical Markdown. The output is
 * deterministic: same struct → same bytes, every time, on every
 * platform.
 */
export function renderDocIdea(idea: DocModeIdea): string {
  const out: string[] = [];

  // Frontmatter — fixed field order so round-trip is stable.
  out.push('---');
  out.push(`id: ${idea.id}`);
  out.push('type: idea');
  out.push('backend: doc');
  out.push(`state: ${idea.state}`);
  out.push(`title: ${yamlScalar(idea.title)}`);
  out.push(`created_at: ${idea.createdAt}`);
  out.push(`updated_at: ${idea.updatedAt}`);
  out.push('---');
  out.push('');
  out.push(`# ${idea.title}`);
  out.push('');

  emitProseSection(out, '## Claim', idea.claim);
  emitProseSection(out, '## Test condition', idea.testCondition);

  out.push('## Assumptions');
  if (idea.assumptions.length === 0) {
    // Empty section: blank body line + blank separator. Same shape as
    // every other empty section so the spacing between headers is
    // uniform and round-trip stays byte-identical.
    out.push('');
    out.push('');
  } else {
    for (const assumption of idea.assumptions) {
      out.push('');
      out.push(`### Assumption: ${assumption.id}`);
      out.push('~~~yaml');
      out.push(`text: ${yamlScalar(assumption.text)}`);
      out.push(`load_bearing: ${assumption.loadBearing}`);
      out.push(`signpost_at: ${assumption.signpostAt ?? 'null'}`);
      out.push(`status: ${assumption.status}`);
      out.push('~~~');
    }
    out.push('');
  }

  out.push('## Evidence log');
  if (idea.evidenceLog.length === 0) {
    out.push('');
    out.push('');
  } else {
    for (const entry of idea.evidenceLog) {
      out.push(`- ${entry.timestamp} — ${entry.note}`);
    }
    out.push('');
  }

  out.push('## Verdict');
  if (idea.verdict === null) {
    out.push('');
    out.push('');
  } else {
    out.push(`state: ${idea.verdict.state}`);
    out.push(`rationale: ${yamlScalar(idea.verdict.rationale)}`);
    out.push('');
  }

  emitProseSection(out, '## Lesson', idea.lesson);

  // Drop the trailing empty line so the file ends with exactly one \n
  // (added by the final join + newline below). Without this the file
  // gets two trailing newlines and round-trip fails.
  while (out.length > 0 && out[out.length - 1] === '') {
    out.pop();
  }

  return out.join('\n') + '\n';
}

function emitProseSection(out: string[], header: string, body: string): void {
  out.push(header);
  if (body.trim().length === 0) {
    out.push('');
    out.push('');
    return;
  }
  out.push(body.trimEnd());
  out.push('');
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a doc-mode Markdown file into a DocModeIdea struct. Throws
 * DocFormatError when required fields are missing or sections are
 * malformed. Does not attempt to repair; the doctor diagnoses, the
 * caller decides whether to fix.
 */
export function parseDocIdea(text: string): DocModeIdea {
  const { frontmatter, body } = splitFrontmatter(text);

  const id = requireString(frontmatter, 'id');
  const type = requireString(frontmatter, 'type');
  if (type !== 'idea') {
    throw new DocFormatError('doc_malformed_section', `frontmatter type must be "idea", got "${type}"`);
  }
  const backend = requireString(frontmatter, 'backend');
  if (backend !== 'doc') {
    throw new DocFormatError('doc_malformed_section', `frontmatter backend must be "doc", got "${backend}"`);
  }
  const state = requireString(frontmatter, 'state');
  if (!IDEA_STATES.includes(state as DocIdeaState)) {
    throw new DocFormatError('doc_malformed_section', `invalid state "${state}"`);
  }
  const title = requireString(frontmatter, 'title');
  const createdAt = requireString(frontmatter, 'created_at');
  const updatedAt = requireString(frontmatter, 'updated_at');

  const sections = splitSections(body);
  if (sections.titleH1 !== title) {
    throw new DocFormatError(
      'doc_malformed_section',
      `H1 "${sections.titleH1}" does not match frontmatter title "${title}"`,
    );
  }

  return {
    id,
    title,
    state: state as DocIdeaState,
    createdAt,
    updatedAt,
    claim: sections.bodies.get('## Claim') ?? '',
    testCondition: sections.bodies.get('## Test condition') ?? '',
    assumptions: parseAssumptions(sections.bodies.get('## Assumptions') ?? ''),
    evidenceLog: parseEvidenceLog(sections.bodies.get('## Evidence log') ?? ''),
    verdict: parseVerdict(sections.bodies.get('## Verdict') ?? ''),
    lesson: (sections.bodies.get('## Lesson') ?? '').trim(),
  };
}

interface SplitFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}

function splitFrontmatter(text: string): SplitFrontmatter {
  if (!text.startsWith('---\n')) {
    throw new DocFormatError('doc_malformed_section', 'file does not start with `---` frontmatter fence');
  }
  const endIndex = text.indexOf('\n---\n', 4);
  if (endIndex < 0) {
    throw new DocFormatError('doc_malformed_section', 'frontmatter closing `---` fence not found');
  }
  const fmText = text.slice(4, endIndex);
  const body = text.slice(endIndex + 5);
  const frontmatter: Record<string, unknown> = {};
  for (const rawLine of fmText.split('\n')) {
    if (rawLine.trim().length === 0) continue;
    const colonAt = rawLine.indexOf(':');
    if (colonAt < 0) {
      throw new DocFormatError('doc_malformed_section', `frontmatter line missing colon: ${rawLine}`);
    }
    const key = rawLine.slice(0, colonAt).trim();
    const value = parseYamlScalar(rawLine.slice(colonAt + 1).trim());
    frontmatter[key] = value;
  }
  return { frontmatter, body };
}

interface SplitSections {
  titleH1: string;
  bodies: Map<SectionHeader, string>;
}

function splitSections(body: string): SplitSections {
  const lines = body.split('\n');
  let i = 0;
  // Skip leading blanks
  while (i < lines.length && lines[i].trim().length === 0) i++;
  if (i >= lines.length || !lines[i].startsWith('# ')) {
    throw new DocFormatError('doc_malformed_section', 'body must start with an H1 title');
  }
  const titleH1 = lines[i].slice(2).trim();
  i++;

  const bodies = new Map<SectionHeader, string>();
  let currentHeader: SectionHeader | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (currentHeader !== null) {
      bodies.set(currentHeader, joinBody(buffer));
    }
    buffer = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (SECTION_HEADERS.includes(line as SectionHeader)) {
      flush();
      currentHeader = line as SectionHeader;
    } else {
      if (currentHeader === null) {
        if (line.trim().length === 0) continue;
        throw new DocFormatError(
          'doc_malformed_section',
          `body content before first section header: "${line}"`,
        );
      }
      buffer.push(line);
    }
  }
  flush();

  for (const required of SECTION_HEADERS) {
    if (!bodies.has(required)) {
      throw new DocFormatError('doc_malformed_section', `missing required section: ${required}`);
    }
  }

  return { titleH1, bodies };
}

function joinBody(lines: string[]): string {
  // Trim leading and trailing blank lines but preserve internal blanks
  // so prose paragraphs round-trip.
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim().length === 0) start++;
  while (end > start && lines[end - 1].trim().length === 0) end--;
  return lines.slice(start, end).join('\n');
}

function parseAssumptions(body: string): DocAssumption[] {
  if (body.trim().length === 0) return [];
  const assumptions: DocAssumption[] = [];
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().length === 0) {
      i++;
      continue;
    }
    if (!line.startsWith('### Assumption: ')) {
      throw new DocFormatError(
        'doc_malformed_section',
        `assumption block expected, got: "${line}"`,
      );
    }
    const id = line.slice('### Assumption: '.length).trim();
    i++;
    if (i >= lines.length || lines[i] !== '~~~yaml') {
      throw new DocFormatError(
        'doc_malformed_section',
        `assumption ${id} missing opening ~~~yaml fence`,
      );
    }
    i++;
    const yamlLines: string[] = [];
    while (i < lines.length && lines[i] !== '~~~') {
      yamlLines.push(lines[i]);
      i++;
    }
    if (i >= lines.length) {
      throw new DocFormatError(
        'doc_malformed_section',
        `assumption ${id} missing closing ~~~ fence`,
      );
    }
    i++;
    assumptions.push(parseAssumptionFields(id, yamlLines));
  }
  return assumptions;
}

function parseAssumptionFields(id: string, lines: string[]): DocAssumption {
  const fields = parseYamlBlock(lines);
  const text = stringField(fields, 'text', `assumption ${id}`);
  const loadBearing = boolField(fields, 'load_bearing', `assumption ${id}`);
  const signpostRaw = fields.get('signpost_at');
  const signpostAt = signpostRaw === undefined || signpostRaw === 'null' ? null : signpostRaw;
  const status = stringField(fields, 'status', `assumption ${id}`);
  if (!ASSUMPTION_STATUSES.includes(status as DocAssumptionStatus)) {
    throw new DocFormatError(
      'doc_malformed_section',
      `assumption ${id} has invalid status "${status}"`,
    );
  }
  return {
    id,
    text,
    loadBearing,
    signpostAt,
    status: status as DocAssumptionStatus,
  };
}

function parseEvidenceLog(body: string): DocEvidenceEntry[] {
  if (body.trim().length === 0) return [];
  const entries: DocEvidenceEntry[] = [];
  let lastTimestamp: string | null = null;
  for (const line of body.split('\n')) {
    if (line.trim().length === 0) continue;
    if (!line.startsWith('- ')) {
      throw new DocFormatError(
        'doc_malformed_section',
        `evidence log entry must start with "- ", got: "${line}"`,
      );
    }
    const rest = line.slice(2);
    const sepIndex = rest.indexOf(' — ');
    if (sepIndex < 0) {
      throw new DocFormatError(
        'doc_malformed_section',
        `evidence log entry missing " — " separator: "${line}"`,
      );
    }
    const timestamp = rest.slice(0, sepIndex);
    const note = rest.slice(sepIndex + 3);
    if (lastTimestamp !== null && timestamp < lastTimestamp) {
      throw new DocFormatError(
        'doc_transition_out_of_order',
        `evidence log timestamp "${timestamp}" precedes earlier entry "${lastTimestamp}"`,
      );
    }
    lastTimestamp = timestamp;
    entries.push({ timestamp, note });
  }
  return entries;
}

function parseVerdict(body: string): DocVerdict | null {
  if (body.trim().length === 0) return null;
  const fields = parseYamlBlock(body.split('\n'));
  const state = stringField(fields, 'state', 'verdict');
  if (!VERDICT_STATES.includes(state as DocVerdictState)) {
    throw new DocFormatError('doc_malformed_section', `invalid verdict state "${state}"`);
  }
  const rationale = stringField(fields, 'rationale', 'verdict');
  return { state: state as DocVerdictState, rationale };
}

// ---------------------------------------------------------------------------
// YAML helpers (deliberately narrow — only what the format needs)
// ---------------------------------------------------------------------------

function parseYamlBlock(lines: string[]): Map<string, string> {
  const fields = new Map<string, string>();
  let pendingKey: string | null = null;
  let pendingLines: string[] = [];

  const flushPending = (): void => {
    if (pendingKey !== null) {
      fields.set(pendingKey, pendingLines.join('\n').trim());
    }
    pendingKey = null;
    pendingLines = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/u, '');
    if (line.length === 0) continue;
    const colonAt = line.indexOf(':');
    const looksLikeKey =
      colonAt > 0 &&
      /^[A-Za-z_][A-Za-z0-9_]*$/u.test(line.slice(0, colonAt)) &&
      !raw.startsWith(' ');
    if (looksLikeKey) {
      flushPending();
      pendingKey = line.slice(0, colonAt).trim();
      pendingLines = [line.slice(colonAt + 1).trim()];
    } else if (pendingKey !== null) {
      pendingLines.push(line.replace(/^\s+/u, ''));
    }
  }
  flushPending();
  return fields;
}

function stringField(fields: Map<string, string>, key: string, context: string): string {
  const value = fields.get(key);
  if (value === undefined) {
    throw new DocFormatError('doc_malformed_section', `${context} missing required field "${key}"`);
  }
  return parseYamlScalar(value) as string;
}

function boolField(fields: Map<string, string>, key: string, context: string): boolean {
  const value = fields.get(key);
  if (value === undefined) {
    throw new DocFormatError('doc_malformed_section', `${context} missing required field "${key}"`);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new DocFormatError(
    'doc_malformed_section',
    `${context} field "${key}" must be true or false, got "${value}"`,
  );
}

function requireString(
  frontmatter: Record<string, unknown>,
  key: string,
): string {
  const value = frontmatter[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new DocFormatError('doc_malformed_section', `frontmatter missing required string "${key}"`);
  }
  return value;
}

/**
 * Format a value for the YAML right-hand side. Quotes when the value
 * contains characters YAML cannot safely round-trip unquoted (colons in
 * the middle of a value, leading/trailing whitespace, single quotes).
 * Newlines in the value are not supported in this narrow format — call
 * sites pre-normalize to single line.
 */
function yamlScalar(value: string): string {
  if (value.length === 0) return "''";
  // Already-safe characters: letters, digits, basic punctuation, no
  // leading whitespace, no colon-space sequence (YAML key separator),
  // no leading "- " (list marker).
  const safe = /^[^'"\n#:&*!|>%@`{}\[\],][^'"\n]*$/u.test(value)
    && !value.includes(': ')
    && !value.startsWith('- ')
    && value.trim() === value;
  if (safe) return value;
  return `'${value.replace(/'/g, "''")}'`;
}

function parseYamlScalar(raw: string): string | number | boolean | null {
  if (raw === '') return '';
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Quoted form: '...' with doubled '' escape for embedded quote.
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return raw.slice(1, -1);
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Vault-relative path to the doc-mode file for an idea. Slug is the
 * kebab-cased title, lowercase ASCII letters / digits / hyphens only.
 * Stable across renames: the id suffix is the durable identifier.
 */
export function buildDocIdeaPath(slug: string, id: string): string {
  const safeSlug = slug
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-\s]/gu, '')
    .trim()
    .replace(/\s+/gu, '-')
    .toLowerCase();
  const tail = safeSlug.length === 0 ? id : `${safeSlug}-${id}`;
  return `ideas-doc/${tail}.md`;
}

export function slugifyDocTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-\s]/gu, '')
    .trim()
    .replace(/\s+/gu, '-')
    .toLowerCase();
}

export const DOC_MODE_FOLDER = 'ideas-doc';

export {
  IDEA_STATES as DOC_IDEA_STATES,
  ASSUMPTION_STATUSES as DOC_ASSUMPTION_STATUSES,
  VERDICT_STATES as DOC_VERDICT_STATES,
};
