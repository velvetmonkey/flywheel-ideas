/**
 * @velvetmonkey/flywheel-ideas-core
 *
 * Core domain logic for the flywheel-ideas decision ledger.
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full plan.
 */

export const PACKAGE_VERSION = '0.1.0-alpha.0';

// Database
export {
  type IdeasDatabase,
  getIdeasDbPath,
  openIdeasDb,
  openInMemoryIdeasDb,
  deleteIdeasDbFiles,
} from './db.js';

export {
  SCHEMA_VERSION,
  IDEAS_DB_FILENAME,
  FLYWHEEL_DIR,
  SCHEMA_SQL_V1,
} from './schema.js';

export { runMigrations, getCurrentVersion } from './migrations.js';
