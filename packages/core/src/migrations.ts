/**
 * ideas.db migration runner.
 *
 * Applies all migrations up to `SCHEMA_VERSION` in a single transaction.
 * Idempotent against clean and dirty dev databases: uses CREATE TABLE IF NOT
 * EXISTS + records applied versions in the `schema_version` meta table.
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
};

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
