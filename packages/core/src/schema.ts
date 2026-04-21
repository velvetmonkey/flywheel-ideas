/**
 * ideas.db schema — all v0.1 tables.
 *
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/data-model.md for the
 * narrative explanation. The SQL below is the authoritative definition.
 *
 * Migration bumps: increment SCHEMA_VERSION and append a `migrateToV<N>`
 * function in migrations.ts. Fresh databases always land on the latest version.
 */

export const SCHEMA_VERSION = 1;

export const IDEAS_DB_FILENAME = 'ideas.db';
export const FLYWHEEL_DIR = '.flywheel';

/**
 * All table-creation statements. Uses CREATE TABLE IF NOT EXISTS everywhere so
 * that running the initial migration against a partially-populated dev database
 * is idempotent.
 *
 * The schema_version table records applied migration versions; the runner
 * reads MAX(version) to decide what still needs to run.
 */
export const SCHEMA_SQL_V1 = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ideas_notes (
  id TEXT PRIMARY KEY,
  vault_path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  state_changed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_notes_state ON ideas_notes(state);
CREATE INDEX IF NOT EXISTS idx_ideas_notes_needs_review ON ideas_notes(needs_review) WHERE needs_review = 1;

CREATE TABLE IF NOT EXISTS ideas_transitions (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas_notes(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  at INTEGER NOT NULL,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_transitions_idea ON ideas_transitions(idea_id, at);

CREATE TABLE IF NOT EXISTS ideas_assumptions (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas_notes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  context TEXT,
  challenge TEXT,
  decision TEXT,
  tradeoff TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  load_bearing INTEGER NOT NULL DEFAULT 0,
  signpost_at INTEGER,
  signpost_reason TEXT,
  locked_at INTEGER,
  vault_path TEXT NOT NULL UNIQUE,
  declared_at INTEGER NOT NULL,
  refuted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ideas_assumptions_idea ON ideas_assumptions(idea_id);
CREATE INDEX IF NOT EXISTS idx_ideas_assumptions_status ON ideas_assumptions(status);
CREATE INDEX IF NOT EXISTS idx_ideas_assumptions_signpost ON ideas_assumptions(signpost_at) WHERE signpost_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS ideas_council_sessions (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas_notes(id) ON DELETE CASCADE,
  depth TEXT NOT NULL,
  mode TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  synthesis_vault_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_council_sessions_idea ON ideas_council_sessions(idea_id);

CREATE TABLE IF NOT EXISTS ideas_council_views (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ideas_council_sessions(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  persona TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  persona_version TEXT NOT NULL,
  model_version TEXT,
  input_hash TEXT NOT NULL,
  initial_stance TEXT,
  stance TEXT,
  self_critique TEXT,
  confidence REAL,
  content_vault_path TEXT NOT NULL,
  failure_reason TEXT,
  stderr_tail TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_council_views_session ON ideas_council_views(session_id);

CREATE TABLE IF NOT EXISTS ideas_assumption_citations (
  view_id TEXT NOT NULL REFERENCES ideas_council_views(id) ON DELETE CASCADE,
  assumption_id TEXT NOT NULL REFERENCES ideas_assumptions(id) ON DELETE CASCADE,
  PRIMARY KEY (view_id, assumption_id)
);

CREATE INDEX IF NOT EXISTS idx_ideas_citations_assumption ON ideas_assumption_citations(assumption_id);

CREATE TABLE IF NOT EXISTS ideas_outcomes (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas_notes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vault_path TEXT NOT NULL UNIQUE,
  landed_at INTEGER NOT NULL,
  undone_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ideas_outcomes_idea ON ideas_outcomes(idea_id);

CREATE TABLE IF NOT EXISTS ideas_outcome_verdicts (
  outcome_id TEXT NOT NULL REFERENCES ideas_outcomes(id) ON DELETE CASCADE,
  assumption_id TEXT NOT NULL REFERENCES ideas_assumptions(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  PRIMARY KEY (outcome_id, assumption_id)
);

CREATE TABLE IF NOT EXISTS ideas_dispatches (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES ideas_council_sessions(id) ON DELETE SET NULL,
  cli TEXT NOT NULL,
  argv TEXT NOT NULL,
  approval_scope TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ideas_dispatches_session ON ideas_dispatches(session_id);
`;
