/**
 * ideas.db — open/close helpers + pragma defaults.
 *
 * Pragma choices mirror flywheel-memory's state.db (WAL, NORMAL sync, 64MB
 * cache, memory temp store) so tests and dev environments behave identically
 * across the two databases sharing the same .flywheel/ directory.
 */

import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FLYWHEEL_DIR, IDEAS_DB_FILENAME } from './schema.js';

export type IdeasDatabase = Database.Database;

/** Resolve the ideas.db path for a vault, creating the .flywheel dir if missing. */
export function getIdeasDbPath(vaultPath: string): string {
  const flywheelDir = path.join(vaultPath, FLYWHEEL_DIR);
  if (!fs.existsSync(flywheelDir)) {
    fs.mkdirSync(flywheelDir, { recursive: true });
  }
  return path.join(flywheelDir, IDEAS_DB_FILENAME);
}

/** Open (or create) the ideas.db for a vault, applying pragmas but NOT running migrations. */
export function openIdeasDb(vaultPath: string): IdeasDatabase {
  const dbPath = getIdeasDbPath(vaultPath);
  const db = new Database(dbPath);
  applyPragmas(db);
  return db;
}

/** Open an in-memory ideas.db — for tests. No migrations applied. */
export function openInMemoryIdeasDb(): IdeasDatabase {
  const db = new Database(':memory:');
  applyPragmas(db);
  return db;
}

function applyPragmas(db: IdeasDatabase): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
}

/** Delete ideas.db + WAL/SHM sidecars. Call only in tests. */
export function deleteIdeasDbFiles(vaultPath: string): void {
  const base = getIdeasDbPath(vaultPath);
  for (const suffix of ['', '-wal', '-shm']) {
    const target = base + suffix;
    try {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    } catch {
      // best effort
    }
  }
}
