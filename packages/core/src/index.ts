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

// Vault path
export { resolveVaultPath, VaultPathError } from './vault-path.js';
export type { VaultResolution } from './vault-path.js';

// Writer interface (M4 commits 1-2)
export {
  writeNote,
  WriteNotePathError,
  patchFrontmatter,
  applyPatch,
  serializeScalar,
  PatchFrontmatterError,
  activeWritePath,
  validatePath,
  validatePathSecure,
  isSensitivePath,
  isWithinDirectory,
  sanitizeNotePath,
} from './write/index.js';
export type {
  WriteNoteOptions,
  WriteNoteResult,
  WritePathTier,
  FrontmatterPatch,
  PatchFrontmatterResult,
  ScalarValue,
} from './write/index.js';

// Reader
export { readNote } from './read/notes.js';
export type { ReadNoteResult } from './read/notes.js';

// Shared helpers
export { filterStaleRows } from './stale-filter.js';
export type {
  StaleFilterable,
  FilterStaleOptions,
  FilterStaleResult,
} from './stale-filter.js';

// IDs (M4 commit 3)
export {
  generateId,
  generateIdeaId,
  generateAssumptionId,
  generateOutcomeId,
  generateCouncilSessionId,
  generateCouncilViewId,
  generateTransitionId,
  generateDispatchId,
  ID_ALPHABET,
} from './ids.js';

// Lifecycle (M4 commit 3)
export {
  IDEA_STATES,
  INITIAL_STATE,
  isIdeaState,
  recordTransition,
  listTransitions,
} from './lifecycle.js';
export type { IdeaState, TransitionRecord, RecordTransitionOptions } from './lifecycle.js';

// CLI error classification (M7)
export {
  classifyCliError,
  CLI_ERROR_PATTERNS,
  UNCATALOGUED_REASONS,
} from './cli-errors.js';
export type {
  CliErrorClassification,
  CliErrorContext,
  CliName,
  FailureReason,
} from './cli-errors.js';

// Approval (M6)
export {
  approvalsFilePath,
  approvalStatusForResponse,
  grantApprovalFile,
  readPersistedApproval,
  resolveApproval,
  revokeApprovalFile,
} from './approval.js';
export type {
  ApprovalFeature,
  ApprovalScope,
  ApprovalState,
  ApprovalStatusPayload,
  EnvApprovalValue,
  PersistedApproval,
} from './approval.js';

// Dispatches (M6)
export {
  forgetDispatch,
  getDispatch,
  listDispatches,
  logDispatchFinish,
  logDispatchStart,
} from './dispatches.js';
export type {
  DispatchRow,
  ListDispatchesOptions,
  LogDispatchStartInput,
  LogDispatchStartResult,
} from './dispatches.js';

// Assumptions (M5)
export {
  declareAssumption,
  getAssumption,
  listAssumptions,
  lockAssumption,
  unlockAssumption,
  findDueSignposts,
  forgetAssumption,
  renderYStatement,
  buildAssumptionPath,
  buildAssumptionNextStepsForIdea,
  AssumptionNotFoundError,
  IdeaNotFoundError,
  AssumptionInputError,
} from './assumptions.js';
export type {
  AssumptionStatus,
  AssumptionStructured,
  AssumptionDeclareInput,
  AssumptionRow,
  DeclareAssumptionResult,
  ListAssumptionsOptions,
  ListAssumptionsResult,
  DueSignpostEntry,
  FindDueSignpostsOptions,
  AssumptionNextStepHint,
} from './assumptions.js';
