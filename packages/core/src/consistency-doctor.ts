import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { IdeasDatabase } from './db.js';

export type ConsistencyIssueKind =
  | 'missing_markdown'
  | 'orphan_markdown'
  | 'stale_frontmatter'
  | 'incomplete_council_session'
  | 'failed_council_view';

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
};

export async function buildConsistencyDoctorReport(
  db: IdeasDatabase,
  vaultPath: string,
): Promise<ConsistencyDoctorReport> {
  const issues: ConsistencyDoctorIssue[] = [];

  await inspectIdeas(db, vaultPath, issues);
  await inspectAssumptions(db, vaultPath, issues);
  await inspectOutcomes(db, vaultPath, issues);
  await inspectCouncil(db, vaultPath, issues);
  await inspectOrphanMarkdown(db, vaultPath, issues);

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
