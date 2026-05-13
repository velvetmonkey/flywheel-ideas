/**
 * ideas.db migration runner.
 *
 * Applies all migrations up to `SCHEMA_VERSION` in a single transaction per
 * step. Idempotent against clean and dirty dev databases via two mechanisms:
 *   - Object-creation statements use `CREATE TABLE/INDEX IF NOT EXISTS`.
 *   - Column-addition statements (`ALTER TABLE ... ADD COLUMN`) are guarded
 *     with `hasColumn()` so a dirty DB whose column was added out-of-band
 *     (but never recorded a `schema_version` row) still migrates cleanly
 *     instead of failing with "duplicate column name".
 *
 * Each step records its `schema_version` row in the same transaction so a
 * failed migration leaves the DB unchanged.
 */

import type { IdeasDatabase } from './db.js';
import {
  SCHEMA_SQL_V1,
  SCHEMA_SQL_V2,
  SCHEMA_SQL_V3,
  SCHEMA_SQL_V4,
  SCHEMA_SQL_V5,
  SCHEMA_SQL_V6,
  SCHEMA_SQL_V7,
  SCHEMA_SQL_V8,
  SCHEMA_SQL_V9,
  SCHEMA_SQL_V10,
  SCHEMA_SQL_V11,
  SCHEMA_SQL_V12,
  // V13 + V14 are applied programmatically below (guarded ALTER TABLE
  // statements) rather than via `db.exec(SCHEMA_SQL_VN)`. The SQL constants
  // remain exported from schema.ts as the canonical schema text and are
  // exercised by the snapshot tests.
  SCHEMA_SQL_V15,
  SCHEMA_VERSION,
} from './schema.js';

/**
 * Migration steps keyed by the version they produce. `migrateToVN` runs when
 * the DB's current MAX(schema_version.version) is less than N.
 */
const MIGRATIONS: Record<number, (db: IdeasDatabase) => void> = {
  1: (db) => {
    db.exec(SCHEMA_SQL_V1);
  },
  2: (db) => {
    db.exec(SCHEMA_SQL_V2);
  },
  3: (db) => {
    db.exec(SCHEMA_SQL_V3);
  },
  4: (db) => {
    db.exec(SCHEMA_SQL_V4);
  },
  5: (db) => {
    db.exec(SCHEMA_SQL_V5);
  },
  6: (db) => {
    db.exec(SCHEMA_SQL_V6);
  },
  7: (db) => {
    db.exec(SCHEMA_SQL_V7);
  },
  8: (db) => {
    db.exec(SCHEMA_SQL_V8);
  },
  9: (db) => {
    db.exec(SCHEMA_SQL_V9);
  },
  10: (db) => {
    db.exec(SCHEMA_SQL_V10);
  },
  11: (db) => {
    db.exec(SCHEMA_SQL_V11);
  },
  12: (db) => {
    db.exec(SCHEMA_SQL_V12);
  },
  13: (db) => {
    // SCHEMA_SQL_V13 is two bare `ALTER TABLE ADD COLUMN` statements; guard
    // each so a dirty dev DB whose columns were added out-of-band still lands
    // on V13 instead of failing with "duplicate column name". The SQL
    // constant is kept as the canonical schema text and is exercised by
    // schema.test.ts; runtime application happens through the guarded path
    // so idempotence holds.
    if (!hasColumn(db, 'ideas_company_runs', 'thesis_report_md_path')) {
      db.exec('ALTER TABLE ideas_company_runs ADD COLUMN thesis_report_md_path TEXT;');
    }
    if (!hasColumn(db, 'ideas_company_runs', 'thesis_report_json_path')) {
      db.exec('ALTER TABLE ideas_company_runs ADD COLUMN thesis_report_json_path TEXT;');
    }
  },
  14: (db) => {
    // V14 mixes guarded ALTERs and IF-NOT-EXISTS CREATEs; apply each piece
    // separately so the ALTERs do not get re-run on a partially-applied DB.
    if (!hasColumn(db, 'ideas_company_themes', 'mechanism_key')) {
      db.exec('ALTER TABLE ideas_company_themes ADD COLUMN mechanism_key TEXT;');
    }
    if (!hasColumn(db, 'ideas_company_themes', 'mechanism_title')) {
      db.exec('ALTER TABLE ideas_company_themes ADD COLUMN mechanism_title TEXT;');
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS ideas_company_run_members (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES ideas_company_runs(id) ON DELETE CASCADE,
        company TEXT NOT NULL,
        sector TEXT,
        display_name TEXT,
        source_rank INTEGER,
        source_weight TEXT,
        source TEXT,
        source_id TEXT REFERENCES ideas_import_sources(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        promoted_ideas INTEGER NOT NULL DEFAULT 0,
        promoted_assumptions INTEGER NOT NULL DEFAULT 0,
        staged_outcomes INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        UNIQUE(run_id, company)
      );
      CREATE INDEX IF NOT EXISTS idx_ideas_company_run_members_run
        ON ideas_company_run_members(run_id, status, company);
    `);
  },
  15: (db) => {
    // V15 is CREATE TABLE/INDEX IF NOT EXISTS only — safe to apply as-is.
    db.exec(SCHEMA_SQL_V15);
  },
};

/**
 * Returns true if `table` has a column called `column`. Used to guard
 * `ALTER TABLE ADD COLUMN` migrations against dirty dev databases that
 * already have the column applied out-of-band.
 */
function hasColumn(db: IdeasDatabase, table: string, column: string): boolean {
  const rows = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

/**
 * Apply all outstanding migrations. Returns the version the DB landed on.
 * Wraps every migration in a transaction so a failed step leaves the DB
 * unchanged.
 */
export function runMigrations(db: IdeasDatabase): number {
  // Ensure schema_version exists even on brand-new databases so we can query it.
  // v1 migration creates it too, but we need it before we can check the current version.
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const current = getCurrentVersion(db);

  for (let target = current + 1; target <= SCHEMA_VERSION; target++) {
    const migration = MIGRATIONS[target];
    if (!migration) {
      throw new Error(`ideas-db: missing migration for version ${target}`);
    }

    const runMigration = db.transaction(() => {
      migration(db);
      db.prepare('INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)').run(
        target,
        Date.now(),
      );
    });
    runMigration();
  }

  return getCurrentVersion(db);
}

/** Current applied schema version. Returns 0 for a fresh database. */
export function getCurrentVersion(db: IdeasDatabase): number {
  const row = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM schema_version').get() as
    | { v: number }
    | undefined;
  return row?.v ?? 0;
}
