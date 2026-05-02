/**
 * ideas.db schema — all v0.1 tables.
 *
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/data-model.md for the
 * narrative explanation. The SQL below is the authoritative definition.
 *
 * Migration bumps: increment SCHEMA_VERSION and append a `migrateToV<N>`
 * function in migrations.ts. Fresh databases always land on the latest version.
 */

export const SCHEMA_VERSION = 14;

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

/**
 * v5 migration — Anti-Portfolio outcome memo sidecar (v0.2 Phase 1 D4).
 *
 * Per the Bessemer Anti-Portfolio pattern: when an outcome refutes any
 * assumption, the team writes a structured "which assumption failed and
 * why" memo. This is the post-mortem layer that turns one-off failures
 * into propagated learning across future ideas.
 *
 * 1:1 with `ideas_outcomes` (PK = outcome_id). The memo is OPTIONAL by
 * default — outcome.log will succeed without one — but the MCP surface
 * surfaces a strong nudge in `next_steps` when a refuting outcome is
 * logged without a memo. Hard enforcement (rejecting refuting outcomes
 * without memos) is too brittle for v0.2 alpha; users may want to log
 * the outcome immediately and write the memo later.
 *
 * `memo_json` shape (deserialised by the helper):
 *   {
 *     refuted_assumption_id?: string,    // optional pointer at the most-load-bearing failed assumption
 *     root_cause: string,                // what actually broke
 *     what_we_thought: string,           // the original assumption / belief
 *     what_actually_happened: string,    // the observed reality
 *     lesson: string                     // the durable takeaway
 *   }
 */
export const SCHEMA_SQL_V5 = `
CREATE TABLE IF NOT EXISTS ideas_outcome_memos (
  outcome_id TEXT PRIMARY KEY REFERENCES ideas_outcomes(id) ON DELETE CASCADE,
  memo_json TEXT NOT NULL,
  written_at INTEGER NOT NULL
);
`;

/**
 * v6 migration — Argument map sidecar (v0.2 Phase 1 D8).
 *
 * Per the Apr 24 roadmap addition: "Flat synthesis is enough for v0.1 — not
 * enough for reuse. A claim → pro → con → evidence tree is a better reuse
 * surface than prose-only dissent notes." Reference: Kialo argument-mapping
 * research; Loomio decision-with-context pattern.
 *
 * 1:1 with `ideas_council_sessions` (PK = session_id, ON DELETE CASCADE).
 * Generated AFTER the synthesis renders — uses the same per-cell stance +
 * key_risks + fragile_insights + evidence already parsed for synthesis,
 * deterministically restructured into a claim tree. No LLM extraction in
 * v0.2; a future revision may add LLM-driven claim grouping for tighter
 * cross-persona consolidation.
 */
export const SCHEMA_SQL_V6 = `
CREATE TABLE IF NOT EXISTS ideas_argument_maps (
  session_id TEXT PRIMARY KEY REFERENCES ideas_council_sessions(id) ON DELETE CASCADE,
  tree_json TEXT NOT NULL,
  generated_at INTEGER NOT NULL
);
`;

/**
 * v7 migration — bulk-import staging tables (v0.2 Phase 2).
 *
 * Two strictly-additive sidecars support the `import.scan` + `import.promote`
 * tool surface. Load-bearing for Phase 3's public-corpus dogfood (SEC EDGAR
 * filings, python/peps, kubernetes/kubernetes postmortems) — the corpus
 * vaults cannot be hand-authored.
 *
 *  - `ideas_import_sources` — one row per `import.scan` call. Records the
 *    adapter, the source URI (repo, CIK, PEP tree), and the scan config so
 *    re-scans can attribute candidates deterministically.
 *
 *  - `ideas_import_candidates` — one row per extracted candidate decision.
 *    Candidates are NOT vault notes; they live in the sidecar until the
 *    user calls `import.promote(candidate_id, as)`, which writes the note
 *    via the existing v0.1 writers (createIdea / declareAssumption /
 *    logOutcome) and flips the row to `state='imported'`.
 *
 * Dedup via flywheel-memory `search` (via withEvidenceReader) is best-effort;
 * when a close match exists in the vault the candidate stores the hit path
 * and score and lands in `state='duplicate'` — still promotable via an
 * explicit `override_duplicate: true` flag.
 */
export const SCHEMA_SQL_V7 = `
CREATE TABLE IF NOT EXISTS ideas_import_sources (
  id TEXT PRIMARY KEY,
  adapter TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  scan_config_json TEXT,
  scanned_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_import_sources_adapter
  ON ideas_import_sources(adapter, scanned_at);

CREATE TABLE IF NOT EXISTS ideas_import_candidates (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES ideas_import_sources(id) ON DELETE CASCADE,
  adapter TEXT NOT NULL,
  candidate_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  extracted_fields_json TEXT,
  confidence REAL NOT NULL,
  source_uri TEXT NOT NULL,
  dedup_match_path TEXT,
  dedup_match_score REAL,
  state TEXT NOT NULL DEFAULT 'pending',
  target_idea_id TEXT REFERENCES ideas_notes(id) ON DELETE SET NULL,
  scanned_at INTEGER NOT NULL,
  imported_at INTEGER,
  imported_vault_path TEXT,
  imported_entity_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_import_cand_source
  ON ideas_import_candidates(source_id);
CREATE INDEX IF NOT EXISTS idx_ideas_import_cand_state
  ON ideas_import_candidates(state);
CREATE INDEX IF NOT EXISTS idx_ideas_import_cand_target
  ON ideas_import_candidates(target_idea_id) WHERE target_idea_id IS NOT NULL;
`;

/**
 * v8 migration — shaping + hedging actions per assumption (RAND ABP complete).
 *
 * Per roadmap-v0-2 narrow-core-complete scope (item 4): complete RAND
 * Assumption-Based Planning's full output, not just the `signposts[]`
 * subset. Adds two new columns to `ideas_assumption_extensions`:
 *
 *   - `shaping_actions_json` — JSON array of actions we take to make the
 *     assumption MORE likely to hold. Proactive: training, tooling,
 *     process changes, vendor lock-ins.
 *   - `hedging_actions_json` — JSON array of actions we take as insurance
 *     if the assumption DOESN'T hold. Reactive: fallback plans, alerts,
 *     exit ramps, contingency budgets.
 *
 * Both default NULL. Strictly additive — ALTER TABLE ADD COLUMN is safe in
 * SQLite and leaves existing rows untouched.
 *
 * Each action item shape (enforced at the TS layer in
 * `assumption-extensions.ts`):
 *   {
 *     description: string,        // required
 *     due_at?: string (ISO date),
 *     owner?: string,
 *     status?: 'planned' | 'in_progress' | 'done' | 'cancelled',
 *     notes?: string
 *   }
 */
export const SCHEMA_SQL_V8 = `
ALTER TABLE ideas_assumption_extensions ADD COLUMN shaping_actions_json TEXT;
ALTER TABLE ideas_assumption_extensions ADD COLUMN hedging_actions_json TEXT;
`;

/**
 * v9 migration — private idea context sidecar enrichment (P2.11).
 *
 * Adds `context_json` to `ideas_idea_extensions`. This is canonical storage
 * for private, write-once decision-journal context captured at `idea.create`
 * time. Structured alternatives remain in `alternatives_json` so we do not
 * duplicate them inside the private context blob.
 */
export const SCHEMA_SQL_V9 = `
ALTER TABLE ideas_idea_extensions ADD COLUMN context_json TEXT;
`;

/**
 * v10 migration — council session purpose scoping + retrospective linkage (P1.6).
 *
 * `purpose` distinguishes normal predictive sessions from retrospective
 * anti-portfolio runs. `outcome_id` links retrospective sessions to the
 * outcome they are analyzing.
 */
export const SCHEMA_SQL_V10 = `
ALTER TABLE ideas_council_sessions ADD COLUMN purpose TEXT NOT NULL DEFAULT 'predictive';
ALTER TABLE ideas_council_sessions ADD COLUMN outcome_id TEXT REFERENCES ideas_outcomes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_council_sessions_purpose ON ideas_council_sessions(purpose);
CREATE INDEX IF NOT EXISTS idx_ideas_council_sessions_idea_completed
  ON ideas_council_sessions(idea_id, purpose, completed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_council_sessions_outcome
  ON ideas_council_sessions(outcome_id) WHERE outcome_id IS NOT NULL;
`;

/**
 * v11 migration — persist the persona's named most-vulnerable assumption (P2.10).
 *
 * This lets effectiveness reporting compare what a view called out most
 * strongly against the later ground-truth failed assumption.
 */
export const SCHEMA_SQL_V11 = `
ALTER TABLE ideas_council_views ADD COLUMN most_vulnerable_assumption_id TEXT REFERENCES ideas_assumptions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_council_views_most_vulnerable
  ON ideas_council_views(most_vulnerable_assumption_id) WHERE most_vulnerable_assumption_id IS NOT NULL;
`;

/**
 * v12 migration — company tracker sidecars (Company Adapter v1).
 *
 * These tables keep SEC company-tracking metadata out of the canonical
 * idea/assumption/outcome tables while linking back to promoted entities.
 * Detection may stage outcome candidates here; only company.apply_outcomes
 * calls outcome.log and records applied_outcome_id.
 */
export const SCHEMA_SQL_V12 = `
CREATE TABLE IF NOT EXISTS ideas_company_runs (
  id TEXT PRIMARY KEY,
  companies_json TEXT NOT NULL,
  years INTEGER NOT NULL,
  forms_json TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL,
  report_md_path TEXT,
  report_json_path TEXT
);

CREATE TABLE IF NOT EXISTS ideas_company_filings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ideas_company_runs(id) ON DELETE CASCADE,
  cik TEXT NOT NULL,
  ticker TEXT,
  company_name TEXT,
  accession_no TEXT NOT NULL,
  form TEXT NOT NULL,
  filed_at TEXT NOT NULL,
  period TEXT,
  filing_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_company_filings_run
  ON ideas_company_filings(run_id, cik, filed_at);

CREATE TABLE IF NOT EXISTS ideas_company_themes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ideas_company_runs(id) ON DELETE CASCADE,
  cik TEXT NOT NULL,
  ticker TEXT,
  theme_key TEXT NOT NULL,
  title TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  latest_seen_at TEXT NOT NULL,
  assumption_id TEXT REFERENCES ideas_assumptions(id) ON DELETE SET NULL,
  UNIQUE(run_id, cik, theme_key)
);

CREATE INDEX IF NOT EXISTS idx_ideas_company_themes_run
  ON ideas_company_themes(run_id, cik);

CREATE TABLE IF NOT EXISTS ideas_company_observations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ideas_company_runs(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES ideas_company_themes(id) ON DELETE CASCADE,
  filing_id TEXT NOT NULL REFERENCES ideas_company_filings(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  excerpt_hash TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_company_observations_theme
  ON ideas_company_observations(theme_id, observed_at);

CREATE TABLE IF NOT EXISTS ideas_company_outcome_candidates (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ideas_company_runs(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES ideas_company_themes(id) ON DELETE CASCADE,
  assumption_id TEXT REFERENCES ideas_assumptions(id) ON DELETE SET NULL,
  filing_id TEXT NOT NULL REFERENCES ideas_company_filings(id) ON DELETE CASCADE,
  source_uri TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  confidence REAL NOT NULL,
  rationale TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'staged',
  applied_outcome_id TEXT REFERENCES ideas_outcomes(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  applied_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ideas_company_outcomes_run
  ON ideas_company_outcome_candidates(run_id, state);
`;

/**
 * v13 migration — company thesis report artifact paths.
 *
 * The detailed tracker report remains the audit artifact. The thesis report is
 * the investor-readable decision-support surface derived from the same ledger.
 */
export const SCHEMA_SQL_V13 = `
ALTER TABLE ideas_company_runs ADD COLUMN thesis_report_md_path TEXT;
ALTER TABLE ideas_company_runs ADD COLUMN thesis_report_json_path TEXT;
`;

/**
 * v14 migration - per-company run members for large sector bundles.
 *
 * Large SEC runs need resumability and per-company status. The member table is
 * additive and keeps sector metadata out of the historical run JSON blobs.
 */
export const SCHEMA_SQL_V14 = `
ALTER TABLE ideas_company_themes ADD COLUMN mechanism_key TEXT;
ALTER TABLE ideas_company_themes ADD COLUMN mechanism_title TEXT;

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
`;
