/**
 * ideas.db schema — all v0.1 tables.
 *
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/data-model.md for the
 * narrative explanation. The SQL below is the authoritative definition.
 *
 * Migration bumps: increment SCHEMA_VERSION and append a `migrateToV<N>`
 * function in migrations.ts. Fresh databases always land on the latest version.
 */

export const SCHEMA_VERSION = 4;

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

/**
 * v2 migration — sidecar table for retrieval-native council evidence (v0.2 KEYSTONE).
 *
 * Strictly additive: new table only, no mutation of existing rows. Avoids the
 * "schema migration risky for experimental product" concern raised in the
 * v0.2 brainstorm council session. Stores the evidence pack sources surfaced
 * to each council *session* (1:1 with `ideas_council_sessions`) — every cell
 * within a session sees the same pack, so persisting per-view would write
 * N=6-15 identical rows per session. Keyed at session level for clean audit:
 * "show me which vault notes informed *this* council session".
 */
export const SCHEMA_SQL_V2 = `
CREATE TABLE IF NOT EXISTS ideas_council_evidence (
  session_id TEXT PRIMARY KEY REFERENCES ideas_council_sessions(id) ON DELETE CASCADE,
  sources_json TEXT NOT NULL,
  retrieved_at INTEGER NOT NULL
);
`;

/**
 * v3 migration — schema enrichment for v0.2 Phase 1 (D1).
 *
 * Two strictly-additive sidecar tables:
 *
 *  - `ideas_idea_extensions` — per-idea fields surfaced from the Apr 24 2026
 *    roadmap addition: `alternatives_json`, `reversible`, `supersedes`,
 *    `replaced_by`, plus the `reference_class` field from the
 *    Reference-classes-and-thresholds gap. ADR-style enrichment (alternatives
 *    ruled out, reversibility classification, supersession chain) +
 *    Good-Judgment base-rate identification.
 *
 *  - `ideas_assumption_extensions` — per-assumption fields surfaced from the
 *    Apr 24 additions: base_rate / go_threshold / kill_threshold (Reference
 *    classes), predicted_metric / threshold_value / threshold_direction
 *    (Falsifiable-metric assumptions; Amplitude pattern), plus a
 *    `mapping_json` blob carrying the seven structured-field map (segment,
 *    context, claim, mechanism, metric, threshold, horizon_ms) from the
 *    Cross-project assumption mapping section. mapping_json stays JSON
 *    rather than flat columns because Phase 1 only needs to STORE the data;
 *    rich SQL queries against the mapping fields are a Phase 4 concern.
 *
 * Both sidecars are 1:1 with their parent (PK = parent.id, ON DELETE CASCADE).
 * v0.1 / v0.2.0-alpha.1 callers are unaffected — no extension row required.
 */
export const SCHEMA_SQL_V3 = `
CREATE TABLE IF NOT EXISTS ideas_idea_extensions (
  idea_id TEXT PRIMARY KEY REFERENCES ideas_notes(id) ON DELETE CASCADE,
  alternatives_json TEXT,
  reversible INTEGER,
  supersedes TEXT,
  replaced_by TEXT,
  reference_class TEXT,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_idea_ext_supersedes ON ideas_idea_extensions(supersedes) WHERE supersedes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_idea_ext_replaced_by ON ideas_idea_extensions(replaced_by) WHERE replaced_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS ideas_assumption_extensions (
  assumption_id TEXT PRIMARY KEY REFERENCES ideas_assumptions(id) ON DELETE CASCADE,
  base_rate REAL,
  go_threshold REAL,
  kill_threshold REAL,
  predicted_metric TEXT,
  threshold_value REAL,
  threshold_direction TEXT,
  mapping_json TEXT,
  updated_at INTEGER NOT NULL
);
`;

/**
 * v4 migration — Freeze / preregister table for v0.2 Phase 1 (D2).
 *
 * OSF-style pre-registration: capture a timestamp + read-only snapshot of
 * the idea text + declared assumptions + locked statuses + idea/assumption
 * extensions BEFORE the council runs. Later outcome verdicts evaluate
 * against the frozen set, preventing goalpost-shift.
 *
 * Amendments allowed via the supersession chain (OSF pattern): a new freeze
 * with `supersedes_freeze_id` pointing at the prior + a required
 * `amendment_rationale`. The prior freeze remains immutable on disk.
 *
 * `council_session_id` is optional — set when the freeze is bound to a
 * specific council session (auto-bound by `council.run({freeze: true})` or
 * `council.run({freeze_id: ...})`). NULL when the freeze stands alone as
 * pure preregistration without an immediate council binding.
 *
 * Snapshot stored as JSON blob — `snapshot_json` carries the full
 * point-in-time state. Read back via JSON.parse + light shape validation.
 */
export const SCHEMA_SQL_V4 = `
CREATE TABLE IF NOT EXISTS ideas_freezes (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas_notes(id) ON DELETE CASCADE,
  council_session_id TEXT REFERENCES ideas_council_sessions(id) ON DELETE SET NULL,
  snapshot_json TEXT NOT NULL,
  supersedes_freeze_id TEXT,
  amendment_rationale TEXT,
  frozen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_freezes_idea ON ideas_freezes(idea_id);
CREATE INDEX IF NOT EXISTS idx_ideas_freezes_council
  ON ideas_freezes(council_session_id) WHERE council_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_freezes_supersedes
  ON ideas_freezes(supersedes_freeze_id) WHERE supersedes_freeze_id IS NOT NULL;
`;
