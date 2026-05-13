import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { IdeasDatabase } from './db.js';
import {
  DOC_MODE_FOLDER,
  DocFormatError,
  parseDocIdea,
  renderDocIdea,
  type DocModeIdea,
} from './doc-mode/format.js';

export type ConsistencyIssueKind =
  | 'missing_markdown'
  | 'orphan_markdown'
  | 'stale_frontmatter'
  | 'incomplete_council_session'
  | 'failed_council_view'
  | 'doc_round_trip_failed'
  | 'doc_state_verdict_mismatch'
  | 'doc_transition_out_of_order'
  | 'doc_malformed_section';

export type ConsistencyDoctorMode = 'sqlite' | 'doc' | 'both';

export interface ConsistencyDoctorOptions {
  /** Default 'sqlite' (backward-compatible with v0.4 callers). */
  mode?: ConsistencyDoctorMode;
}

export type ConsistencyIssueSeverity = 'info' | 'warning' | 'error';

export interface ConsistencyDoctorIssue {
  kind: ConsistencyIssueKind;
  severity: ConsistencyIssueSeverity;
  table?: string;
  id?: string;
  path?: string;
  field?: string;
  db_value?: unknown;
  markdown_value?: unknown;
  detail: string;
}

export interface ConsistencyDoctorReport {
  ok: boolean;
  issue_count: number;
  counts: Record<ConsistencyIssueKind, number>;
  issues: ConsistencyDoctorIssue[];
}

type Frontmatter = Record<string, unknown>;

const EMPTY_COUNTS: Record<ConsistencyIssueKind, number> = {
  missing_markdown: 0,
  orphan_markdown: 0,
  stale_frontmatter: 0,
  incomplete_council_session: 0,
  failed_council_view: 0,
  doc_round_trip_failed: 0,
  doc_state_verdict_mismatch: 0,
  doc_transition_out_of_order: 0,
  doc_malformed_section: 0,
};

export async function buildConsistencyDoctorReport(
  db: IdeasDatabase,
  vaultPath: string,
  options: ConsistencyDoctorOptions = {},
): Promise<ConsistencyDoctorReport> {
  const mode = options.mode ?? 'sqlite';
  const issues: ConsistencyDoctorIssue[] = [];

  if (mode === 'sqlite' || mode === 'both') {
    await inspectIdeas(db, vaultPath, issues);
    await inspectAssumptions(db, vaultPath, issues);
    await inspectOutcomes(db, vaultPath, issues);
    await inspectCouncil(db, vaultPath, issues);
    await inspectOrphanMarkdown(db, vaultPath, issues);
  }
  if (mode === 'doc' || mode === 'both') {
    await inspectDocMode(vaultPath, issues);
  }

  const counts = { ...EMPTY_COUNTS };
  for (const issue of issues) counts[issue.kind] += 1;
  return {
    ok: issues.length === 0,
    issue_count: issues.length,
    counts,
    issues,
  };
}

async function inspectIdeas(
  db: IdeasDatabase,
  vaultPath: string,
  issues: ConsistencyDoctorIssue[],
): Promise<void> {
  const rows = db
    .prepare(
      `SELECT id, vault_path, title, state, needs_review, created_at
         FROM ideas_notes
        ORDER BY id`,
    )
    .all() as Array<{
    id: string;
    vault_path: string;
    title: string;
    state: string;
    needs_review: number;
    created_at: number;
  }>;

  for (const row of rows) {
    const fm = await readFrontmatter(vaultPath, row.vault_path);
    if (!fm) {
      missing(issues, 'ideas_notes', row.id, row.vault_path);
      continue;
    }
    compare(issues, 'ideas_notes', row.id, row.vault_path, 'id', row.id, fm.id);
    compare(issues, 'ideas_notes', row.id, row.vault_path, 'type', 'idea', fm.type);
    compare(issues, 'ideas_notes', row.id, row.vault_path, 'title', row.title, fm.title);
    compare(issues, 'ideas_notes', row.id, row.vault_path, 'state', row.state, fm.state);
    compare(
      issues,
      'ideas_notes',
      row.id,
      row.vault_path,
      'created_at',
      new Date(row.created_at).toISOString(),
      frontmatterDate(fm.created_at),
    );
    if (row.needs_review === 1) {
      compare(
        issues,
        'ideas_notes',
        row.id,
        row.vault_path,
        'needs_review',
        true,
        fm.needs_review,
      );
    }
  }
}

async function inspectAssumptions(
  db: IdeasDatabase,
  vaultPath: string,
  issues: ConsistencyDoctorIssue[],
): Promise<void> {
  const rows = db
    .prepare(
      `SELECT id, idea_id, status, load_bearing, signpost_at, signpost_reason,
              vault_path, declared_at
         FROM ideas_assumptions
        ORDER BY id`,
    )
    .all() as Array<{
    id: string;
    idea_id: string;
    status: string;
    load_bearing: number;
    signpost_at: number | null;
    signpost_reason: string | null;
    vault_path: string;
    declared_at: number;
  }>;

  for (const row of rows) {
    const fm = await readFrontmatter(vaultPath, row.vault_path);
    if (!fm) {
      missing(issues, 'ideas_assumptions', row.id, row.vault_path);
      continue;
    }
    compare(issues, 'ideas_assumptions', row.id, row.vault_path, 'id', row.id, fm.id);
    compare(issues, 'ideas_assumptions', row.id, row.vault_path, 'type', 'assumption', fm.type);
    compare(issues, 'ideas_assumptions', row.id, row.vault_path, 'idea_id', row.idea_id, fm.idea_id);
    compare(issues, 'ideas_assumptions', row.id, row.vault_path, 'status', row.status, fm.status);
    compare(
      issues,
      'ideas_assumptions',
      row.id,
      row.vault_path,
      'load_bearing',
      row.load_bearing === 1,
      fm.load_bearing,
    );
    compare(
      issues,
      'ideas_assumptions',
      row.id,
      row.vault_path,
      'declared_at',
      new Date(row.declared_at).toISOString(),
      frontmatterDate(fm.declared_at),
    );
    if (row.signpost_at != null) {
      compare(
        issues,
        'ideas_assumptions',
        row.id,
        row.vault_path,
        'signpost_at',
        new Date(row.signpost_at).toISOString(),
        frontmatterDate(fm.signpost_at),
      );
    }
    if (row.signpost_reason != null) {
      compare(
        issues,
        'ideas_assumptions',
        row.id,
        row.vault_path,
        'signpost_reason',
        row.signpost_reason,
        fm.signpost_reason,
      );
    }
  }
}

async function inspectOutcomes(
  db: IdeasDatabase,
  vaultPath: string,
  issues: ConsistencyDoctorIssue[],
): Promise<void> {
  const rows = db
    .prepare(
      `SELECT id, idea_id, vault_path, landed_at, undone_at
         FROM ideas_outcomes
        ORDER BY id`,
    )
    .all() as Array<{
    id: string;
    idea_id: string;
    vault_path: string;
    landed_at: number;
    undone_at: number | null;
  }>;

  const verdictStmt = db.prepare(
    `SELECT assumption_id, verdict
       FROM ideas_outcome_verdicts
      WHERE outcome_id = ?
      ORDER BY assumption_id`,
  );

  for (const row of rows) {
    const fm = await readFrontmatter(vaultPath, row.vault_path);
    if (!fm) {
      missing(issues, 'ideas_outcomes', row.id, row.vault_path);
      continue;
    }
    const verdicts = verdictStmt.all(row.id) as Array<{
      assumption_id: string;
      verdict: string;
    }>;
    const refutes = verdicts
      .filter((verdict) => verdict.verdict === 'refuted')
      .map((verdict) => verdict.assumption_id);
    const validates = verdicts
      .filter((verdict) => verdict.verdict === 'validated')
      .map((verdict) => verdict.assumption_id);

    compare(issues, 'ideas_outcomes', row.id, row.vault_path, 'id', row.id, fm.id);
    compare(issues, 'ideas_outcomes', row.id, row.vault_path, 'type', 'outcome', fm.type);
    compare(issues, 'ideas_outcomes', row.id, row.vault_path, 'idea_id', row.idea_id, fm.idea_id);
    compare(
      issues,
      'ideas_outcomes',
      row.id,
      row.vault_path,
      'landed_at',
      new Date(row.landed_at).toISOString(),
      frontmatterDate(fm.landed_at),
    );
    compare(issues, 'ideas_outcomes', row.id, row.vault_path, 'refutes', refutes, fm.refutes);
    compare(issues, 'ideas_outcomes', row.id, row.vault_path, 'validates', validates, fm.validates);
    compare(
      issues,
      'ideas_outcomes',
      row.id,
      row.vault_path,
      'undone_at',
      row.undone_at == null ? null : new Date(row.undone_at).toISOString(),
      row.undone_at == null ? fm.undone_at ?? null : frontmatterDate(fm.undone_at),
    );
  }
}

async function inspectCouncil(
  db: IdeasDatabase,
  vaultPath: string,
  issues: ConsistencyDoctorIssue[],
): Promise<void> {
  const sessions = db
    .prepare(
      `SELECT id, completed_at, synthesis_vault_path
         FROM ideas_council_sessions
        ORDER BY id`,
    )
    .all() as Array<{
    id: string;
    completed_at: number | null;
    synthesis_vault_path: string | null;
  }>;

  for (const session of sessions) {
    if (session.completed_at == null) {
      issues.push({
        kind: 'incomplete_council_session',
        severity: 'warning',
        table: 'ideas_council_sessions',
        id: session.id,
        detail: 'Council session has no completed_at timestamp.',
      });
    }
    if (session.synthesis_vault_path) {
      const exists = await pathExists(vaultPath, session.synthesis_vault_path);
      if (!exists) missing(issues, 'ideas_council_sessions', session.id, session.synthesis_vault_path);
    }
  }

  const views = db
    .prepare(
      `SELECT id, session_id, content_vault_path, failure_reason
         FROM ideas_council_views
        ORDER BY id`,
    )
    .all() as Array<{
    id: string;
    session_id: string;
    content_vault_path: string;
    failure_reason: string | null;
  }>;

  for (const view of views) {
    const exists = await pathExists(vaultPath, view.content_vault_path);
    if (!exists) missing(issues, 'ideas_council_views', view.id, view.content_vault_path);
    if (view.failure_reason) {
      issues.push({
        kind: 'failed_council_view',
        severity: 'warning',
        table: 'ideas_council_views',
        id: view.id,
        path: view.content_vault_path,
        detail: `Council view in session ${view.session_id} failed: ${view.failure_reason}`,
      });
    }
  }
}

async function inspectOrphanMarkdown(
  db: IdeasDatabase,
  vaultPath: string,
  issues: ConsistencyDoctorIssue[],
): Promise<void> {
  const known = {
    idea: ids(db, 'ideas_notes'),
    assumption: ids(db, 'ideas_assumptions'),
    outcome: ids(db, 'ideas_outcomes'),
  };

  for (const relPath of await listMarkdownFiles(vaultPath)) {
    const fm = await readFrontmatter(vaultPath, relPath);
    if (!fm) continue;
    if (fm.type !== 'idea' && fm.type !== 'assumption' && fm.type !== 'outcome') continue;
    if (typeof fm.id !== 'string') continue;
    if (!known[fm.type].has(fm.id)) {
      issues.push({
        kind: 'orphan_markdown',
        severity: 'warning',
        id: fm.id,
        path: relPath,
        detail: `Markdown file has type=${fm.type} but no matching DB row.`,
      });
    }
  }
}

function ids(db: IdeasDatabase, table: string): Set<string> {
  return new Set(
    (db.prepare(`SELECT id FROM ${table}`).all() as Array<{ id: string }>).map((row) => row.id),
  );
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(absDir: string): Promise<void> {
    let entries: Array<import('node:fs').Dirent>;
    try {
      entries = await fsp.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '.flywheel' || entry.name === 'node_modules') continue;
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(path.relative(root, abs).split(path.sep).join('/'));
      }
    }
  }
  await walk(root);
  return out.sort();
}

async function readFrontmatter(vaultPath: string, relPath: string): Promise<Frontmatter | null> {
  try {
    const raw = await fsp.readFile(path.join(vaultPath, relPath), 'utf8');
    return matter(raw).data;
  } catch {
    return null;
  }
}

async function pathExists(vaultPath: string, relPath: string): Promise<boolean> {
  try {
    await fsp.access(path.join(vaultPath, relPath));
    return true;
  } catch {
    return false;
  }
}

function missing(
  issues: ConsistencyDoctorIssue[],
  table: string,
  id: string,
  relPath: string,
): void {
  issues.push({
    kind: 'missing_markdown',
    severity: 'error',
    table,
    id,
    path: relPath,
    detail: `${table} row points at missing markdown.`,
  });
}

function compare(
  issues: ConsistencyDoctorIssue[],
  table: string,
  id: string,
  relPath: string,
  field: string,
  dbValue: unknown,
  markdownValue: unknown,
): void {
  if (JSON.stringify(dbValue) === JSON.stringify(markdownValue)) return;
  issues.push({
    kind: 'stale_frontmatter',
    severity: 'warning',
    table,
    id,
    path: relPath,
    field,
    db_value: dbValue,
    markdown_value: markdownValue,
    detail: `${table}.${field} does not match markdown frontmatter.`,
  });
}

function frontmatterDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

// ---------------------------------------------------------------------------
// Doc-mode inspector
// ---------------------------------------------------------------------------

/**
 * Walk `<vault>/ideas-doc/` and emit doc-mode issues. Doc mode is
 * intra-file (no DB to reconcile), so the invariants are different
 * from SQLite mode: round-trip byte-identical, frontmatter state
 * agrees with the verdict block, transition timestamps monotonic,
 * required sections present + well-formed.
 *
 * Files that fail to parse surface as `doc_malformed_section` (or the
 * specific kind on the DocFormatError if more precise) and are skipped
 * for the deeper checks — there is nothing useful to assert about a
 * file the parser cannot understand.
 */
async function inspectDocMode(
  vaultPath: string,
  issues: ConsistencyDoctorIssue[],
): Promise<void> {
  const folder = path.join(vaultPath, DOC_MODE_FOLDER);
  let entries: string[];
  try {
    entries = await fsp.readdir(folder);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }

  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    const relPath = `${DOC_MODE_FOLDER}/${name}`;
    const absPath = path.join(folder, name);
    const text = await fsp.readFile(absPath, 'utf8');

    let parsed: DocModeIdea;
    try {
      parsed = parseDocIdea(text);
    } catch (err) {
      if (err instanceof DocFormatError) {
        const kind: ConsistencyIssueKind =
          err.kind === 'doc_transition_out_of_order'
            ? 'doc_transition_out_of_order'
            : 'doc_malformed_section';
        issues.push({
          kind,
          severity: 'error',
          path: relPath,
          detail: err.message,
        });
        continue;
      }
      throw err;
    }

    // Round-trip invariant. Failure means the file has formatting drift
    // (whitespace, ordering, casing) that the renderer would not
    // produce — caller has to decide whether to normalize.
    const rendered = renderDocIdea(parsed);
    if (rendered !== text) {
      issues.push({
        kind: 'doc_round_trip_failed',
        severity: 'warning',
        id: parsed.id,
        path: relPath,
        detail:
          'File is not byte-identical to renderer output. Whitespace, key order, or quoting differs. Re-saving via the MCP tool will normalize.',
      });
    }

    // State / verdict agreement.
    const mismatch = detectStateVerdictMismatch(parsed);
    if (mismatch !== null) {
      issues.push({
        kind: 'doc_state_verdict_mismatch',
        severity: 'error',
        id: parsed.id,
        path: relPath,
        field: 'state',
        db_value: parsed.state,
        markdown_value: parsed.verdict?.state ?? null,
        detail: mismatch,
      });
    }

    // Transition timestamps: created_at <= updated_at, and updated_at
    // >= any evidence-log timestamp.
    if (parsed.createdAt > parsed.updatedAt) {
      issues.push({
        kind: 'doc_transition_out_of_order',
        severity: 'error',
        id: parsed.id,
        path: relPath,
        field: 'updated_at',
        db_value: parsed.updatedAt,
        markdown_value: parsed.createdAt,
        detail: `frontmatter updated_at (${parsed.updatedAt}) precedes created_at (${parsed.createdAt})`,
      });
    }
    const lastEvidence = parsed.evidenceLog[parsed.evidenceLog.length - 1];
    if (lastEvidence && lastEvidence.timestamp > parsed.updatedAt) {
      issues.push({
        kind: 'doc_transition_out_of_order',
        severity: 'error',
        id: parsed.id,
        path: relPath,
        field: 'updated_at',
        db_value: parsed.updatedAt,
        markdown_value: lastEvidence.timestamp,
        detail: `latest evidence log timestamp (${lastEvidence.timestamp}) is later than frontmatter updated_at (${parsed.updatedAt})`,
      });
    }
  }
}

function detectStateVerdictMismatch(idea: DocModeIdea): string | null {
  const requiredVerdict: Record<string, string | null> = {
    validated: 'pass',
    refuted: 'fail',
    parked: 'parked',
  };
  const expected = requiredVerdict[idea.state];
  if (expected === undefined) {
    // States that don't require a verdict (nascent/explored/evaluated/
    // committed/killed). Doc mode permits an in-progress verdict block
    // on these for drafting; nothing to flag.
    return null;
  }
  if (idea.verdict === null) {
    return `frontmatter state "${idea.state}" requires a verdict block (expected state: "${expected}") but the verdict section is empty`;
  }
  if (idea.verdict.state !== expected) {
    return `frontmatter state "${idea.state}" requires verdict.state "${expected}" but got "${idea.verdict.state}"`;
  }
  return null;
}
