/**
 * @velvetmonkey/flywheel-ideas-core
 *
 * Core domain logic for the flywheel-ideas decision ledger.
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full plan.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read this package's version from package.json at module-load time so the
 * MCP server's advertised serverInfo.version always tracks what users
 * actually installed. (M14 dogfood found that the previous hard-coded
 * literal had drifted to 0.1.0-alpha.0 across alpha.1 + alpha.2 releases.)
 *
 * Wrapped in try/catch — if the package.json is missing or unreadable
 * (downstream bundlers that exclude package.json files; broken installs;
 * permissions), we fall back to `'unknown'` rather than crashing every
 * importer of `@velvetmonkey/flywheel-ideas-core`. (Alpha.4 hardening
 * after the codebase roundtable flagged the bare readFileSync as a
 * module-init crash surface.)
 *
 * Exported separately + accepts a custom `read` function for test injection.
 */
export function readPackageVersion(
  read: (p: string) => string = (p) => readFileSync(p, 'utf8'),
): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = read(join(here, '..', 'package.json'));
    const pkg = JSON.parse(raw) as { version?: string };
    if (typeof pkg.version === 'string' && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    /* fall through to 'unknown' */
  }
  return 'unknown';
}

export const PACKAGE_VERSION = readPackageVersion();

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
  syncTransitionFrontmatter,
  listTransitions,
} from './lifecycle.js';
export type { IdeaState, TransitionRecord, RecordTransitionOptions } from './lifecycle.js';

// Concurrency limiter (M9)
export { ConcurrencyLimiter } from './concurrency.js';

// Council orchestrator (M8)
export {
  CouncilOrchestratorError,
  runCouncil,
} from './council.js';
export type {
  CouncilViewResult,
  RunCouncilInput,
  RunCouncilOptions,
  RunCouncilResult,
} from './council.js';

// Council primitives (M8)
export {
  PROMPT_VERSION,
  PERSONA_VERSION,
  PERSONAS,
  M8_PERSONA_SET,
  assemblePrompt,
} from './council-prompts.js';
export type {
  CouncilMode,
  PersonaDef,
  PromptInput,
  AssembledPrompt,
} from './council-prompts.js';

export {
  CouncilStanceSchema,
  NotYetImplementedError,
  parseClaudeStanceOutput,
  parseCodexStanceOutput,
  parseGeminiStanceOutput,
} from './council-parsers.js';
export type {
  CouncilStance,
  ParseResult,
} from './council-parsers.js';

export {
  spawnCliCell,
} from './council-spawn.js';
export type {
  SpawnCellInput,
  SpawnResult,
} from './council-spawn.js';

export {
  completeCouncilSession,
  createCouncilSession,
  getCouncilSession,
  insertAssumptionCitations,
  listSessionsByIdea,
  listViewsBySession,
  persistCouncilView,
} from './council-sessions.js';
export type {
  CouncilSessionRow,
  CouncilViewRow,
  CreateSessionInput,
  PersistCouncilViewInput,
} from './council-sessions.js';

export {
  buildViewNotePath,
  renderSynthesisMarkdown,
  writeSynthesis,
} from './council-synthesis.js';
export type {
  SynthesisInput,
  WriteSynthesisInput,
} from './council-synthesis.js';

// Sentence-level overlap extractor (M11)
export {
  DEFAULT_JACCARD_THRESHOLD,
  extractOverlap,
  jaccard,
  splitSentences,
  tokenize,
} from './council-overlap.js';
export type {
  AgreementFragment,
  DisagreementBucket,
  OverlapResult,
  ViewStanceInput,
} from './council-overlap.js';

// CLI error classification (M7 + M10 benign-stderr filter)
export {
  classifyCliError,
  CLI_ERROR_PATTERNS,
  UNCATALOGUED_REASONS,
  BENIGN_STDERR_PATTERNS,
  stripBenignStderr,
} from './cli-errors.js';
export type {
  CliErrorClassification,
  CliErrorContext,
  CliName,
  FailureReason,
} from './cli-errors.js';

// Outcome + propagation (M12)
export {
  buildOutcomePath,
  computeOutcomeDigest,
  forgetOutcome,
  getOutcome,
  listOutcomes,
  logOutcome,
  OutcomeAlreadyUndoneError,
  OutcomeInputError,
  OutcomeNotFoundError,
  undoOutcome,
} from './outcome.js';
export type {
  FlaggedIdea,
  ListOutcomesOptions,
  ListOutcomesResult,
  OutcomeLogInput,
  OutcomeLogResult,
  OutcomeRow,
  OutcomeUndoResult,
} from './outcome.js';

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

// Memory bridge (M14) — best-effort flywheel-memory custom-category registration
export { registerCustomCategories, IDEAS_CATEGORIES } from './memory-bridge.js';
export type {
  MemoryBridgeResult,
  MemoryBridgeSkipReason,
  RegisterOptions as MemoryBridgeRegisterOptions,
} from './memory-bridge.js';
