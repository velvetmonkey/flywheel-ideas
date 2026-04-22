/**
 * Dispatch audit-log helpers for `ideas_dispatches`.
 *
 * M6 ships these as unit-tested primitives. They are NOT called from the MCP
 * tool surface until M8 (real dispatcher). The M6 council.run stub does not
 * write dispatch rows — avoids synthetic audit data accumulating in the
 * user's vault during the stub milestone.
 *
 * argv storage constraint (enforced starting M8): CLI prompts route via
 * `child.stdin.write(prompt)`, never as argv. argv carries flags only — e.g.
 * `['-p', '--output-format', 'json']`. This guarantees `ideas_dispatches.argv`
 * never holds user-idea text.
 */

import type { IdeasDatabase } from './db.js';
import { generateDispatchId } from './ids.js';
import type { ApprovalScope } from './approval.js';

export interface LogDispatchStartInput {
  session_id: string | null;
  cli: string;
  argv: string[];
  approval_scope: ApprovalScope;
}

export interface LogDispatchStartResult {
  id: string;
  started_at: number;
}

export interface DispatchRow {
  id: string;
  session_id: string | null;
  cli: string;
  argv: string[];
  approval_scope: ApprovalScope;
  started_at: number;
  finished_at: number | null;
}

export interface ListDispatchesOptions {
  session_id?: string;
  limit?: number;
}

export function logDispatchStart(
  db: IdeasDatabase,
  input: LogDispatchStartInput,
): LogDispatchStartResult {
  const id = generateDispatchId();
  const started_at = Date.now();
  db.prepare(
    `INSERT INTO ideas_dispatches (id, session_id, cli, argv, approval_scope, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    id,
    input.session_id,
    input.cli,
    JSON.stringify(input.argv),
    input.approval_scope,
    started_at,
  );
  return { id, started_at };
}

export function logDispatchFinish(
  db: IdeasDatabase,
  id: string,
  options: { finished_at?: number } = {},
): void {
  const finished_at = options.finished_at ?? Date.now();
  db.prepare(`UPDATE ideas_dispatches SET finished_at = ? WHERE id = ?`).run(
    finished_at,
    id,
  );
}

export function listDispatches(
  db: IdeasDatabase,
  options: ListDispatchesOptions = {},
): DispatchRow[] {
  const limit = options.limit ?? 50;
  const params: unknown[] = [];
  let where = '';
  if (options.session_id !== undefined) {
    where = `WHERE session_id = ?`;
    params.push(options.session_id);
  }
  params.push(limit);
  const rows = db
    .prepare(
      `SELECT id, session_id, cli, argv, approval_scope, started_at, finished_at
         FROM ideas_dispatches
         ${where}
        ORDER BY started_at DESC
        LIMIT ?`,
    )
    .all(...params) as Array<{
    id: string;
    session_id: string | null;
    cli: string;
    argv: string;
    approval_scope: string;
    started_at: number;
    finished_at: number | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    session_id: r.session_id,
    cli: r.cli,
    argv: JSON.parse(r.argv) as string[],
    approval_scope: r.approval_scope as ApprovalScope,
    started_at: r.started_at,
    finished_at: r.finished_at,
  }));
}

export function forgetDispatch(db: IdeasDatabase, id: string): boolean {
  const info = db.prepare(`DELETE FROM ideas_dispatches WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function getDispatch(
  db: IdeasDatabase,
  id: string,
): DispatchRow | null {
  const row = db
    .prepare(
      `SELECT id, session_id, cli, argv, approval_scope, started_at, finished_at
         FROM ideas_dispatches
        WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        session_id: string | null;
        cli: string;
        argv: string;
        approval_scope: string;
        started_at: number;
        finished_at: number | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    session_id: row.session_id,
    cli: row.cli,
    argv: JSON.parse(row.argv) as string[],
    approval_scope: row.approval_scope as ApprovalScope,
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}
