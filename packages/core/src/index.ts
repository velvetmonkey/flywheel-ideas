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
} from './schema.js';

export { runMigrations, getCurrentVersion } from './migrations.js';

// Vault path
export { resolveVaultPath, VaultPathError } from './vault-path.js';
export type { VaultResolution } from './vault-path.js';

// Writer interface (M4 commits 1-2; v0.2 write-path migration; v0.4.0 hard-fail)
export {
  writeNote,
  writeNoteDirectFs,
  writeNoteViaSubprocess,
  WriteNotePathError,
  WriteSubprocessFailedError,
  patchFrontmatter,
  patchFrontmatterDirectFs,
  patchFrontmatterViaSubprocess,
  applyPatch,
  serializeScalar,
  PatchFrontmatterError,
  probeWritePath,
  getActiveWritePath,
  getProbeOutcome,
  __resetWritePathForTests,
  __setWritePathForTests,
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
  ProbeOptions,
  ProbeOutcome,
  WriteSubprocessOptions,
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
  generateFreezeId,
  generateImportSourceId,
  generateImportCandidateId,
  generateCompanyRunId,
  generateCompanyFilingId,
  generateCompanyThemeId,
  generateCompanyObservationId,
  generateCompanyOutcomeCandidateId,
  ID_ALPHABET,
} from './ids.js';

// Lifecycle (M4 commit 3 + v0.2 D5 enforcement)
export {
  IDEA_STATES,
  INITIAL_STATE,
  isIdeaState,
  recordTransition,
  recordTransitionEnforced,
  canTransition,
  TransitionPrereqError,
  syncTransitionFrontmatter,
  listTransitions,
} from './lifecycle.js';
export type {
  IdeaState,
  TransitionRecord,
  RecordTransitionOptions,
  RecordTransitionEnforcedOptions,
  CanTransitionResult,
} from './lifecycle.js';

// Concurrency limiter (M9)
export { ConcurrencyLimiter } from './concurrency.js';

// Council orchestrator (M8)
export {
  CouncilOrchestratorError,
  runCouncil,
  buildClaudeArgv,
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
  CouncilSessionPurpose,
  CouncilSessionRow,
  CouncilViewRow,
  CreateSessionInput,
  PersistCouncilViewInput,
} from './council-sessions.js';

export { buildCouncilEffectivenessReport } from './council-effectiveness.js';
export type {
  EffectivenessReport,
  EffectivenessReportInput,
  EffectivenessReportRow,
  EffectivenessCliRow,
  EffectivenessPersonaRow,
} from './council-effectiveness.js';

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

// decision_delta — diff between two council sessions (v0.2 D6)
export {
  computeDecisionDelta,
  DeltaInputError,
} from './decision-delta.js';
export type {
  ComputeDeltaOptions,
  DecisionDelta,
  DecisionDeltaSummary,
  DeltaCellRow,
} from './decision-delta.js';

// lineage — ancestry / descendants / shared_assumptions (v0.2 D7)
export {
  getAncestry,
  getDescendants,
  getSharedAssumptions,
} from './lineage.js';
export type {
  LineageNode,
  LineageOptions,
  SharedAssumptionMatch,
  SharedAssumptionsOptions,
} from './lineage.js';

// Assumption Radar (v0.2 D9)
export {
  radarAssumptions,
  RadarInputError,
  EvidenceReaderUnavailableError,
} from './assumption-radar.js';
export type {
  RadarHit,
  RadarOptions,
  RadarResult,
} from './assumption-radar.js';

// Argument maps (v0.2 D8)
export {
  extractArgumentTree,
  renderArgumentMapMarkdown,
  recordArgumentMap,
  getArgumentMap,
} from './argument-map.js';
export type {
  ArgumentClaim,
  ArgumentEvidence,
  ArgumentMapRow,
  ArgumentNode,
  ArgumentTree,
  ExtractArgumentTreeInput,
} from './argument-map.js';
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

// Memory bridge (M14) — flywheel-memory custom-category registration. Required
// in production (v0.4.0+); optional posture survives only behind the test-mode
// gate. See docs/memory-bridge.md.
export { registerCustomCategories, IDEAS_CATEGORIES } from './memory-bridge.js';

// Hard-fail error + test-mode gate (v0.4.0 — flywheel-memory required)
export {
  FlywheelMemoryRequiredError,
} from './errors.js';
export type {
  RequiredBridgeFailure,
  RequiredBridgeFailureKind,
} from './errors.js';
export { isTestMode, TEST_MODE_ENV_VAR } from './test-mode.js';

// Council evidence sidecar (v0.2 KEYSTONE — retrieval-native council input)
export {
  recordEvidenceSources,
  getEvidenceSources,
} from './council-evidence-store.js';
export type {
  EvidenceSource,
  EvidenceRow,
} from './council-evidence-store.js';

// Evidence reader subprocess (v0.2 KEYSTONE — one-shot MCP read of flywheel-memory)
export {
  withEvidenceReader,
  extractToolText,
} from './evidence-reader.js';
export type {
  EvidenceReader,
  EvidenceReaderOutcome,
  EvidenceReaderSkipReason,
  WithEvidenceReaderOptions,
} from './evidence-reader.js';

// Evidence pack assembler (v0.2 KEYSTONE — markdown evidence for council prompt)
export {
  assembleEvidencePack,
  truncateAtSectionBoundary,
} from './council-evidence.js';
export type {
  AssembleEvidenceOptions,
  AssumptionForEvidence,
  EvidencePack,
  IdeaForEvidence,
} from './council-evidence.js';

// Idea path helpers (shared between idea.create + import.promote)
export { buildIdeaPath, slugifyIdeaTitle } from './idea-paths.js';
export { createIdea } from './idea-create.js';
export type { CreateIdeaInput, CreateIdeaResult } from './idea-create.js';

// Bulk-import subsystem (v0.2 Phase 2)
export {
  // adapter types
  ImportAdapterError,
  ImportNetworkGatedError,
  // registry
  registerAdapter,
  getAdapter,
  listAdapters,
  __resetRegistryForTests,
  // candidates CRUD
  createImportSource,
  persistCandidate,
  getCandidate,
  getImportSource,
  listCandidates,
  markCandidateImported,
  markCandidateRejected,
  parseExtractedFields,
  CandidateStateError,
  // dedup
  checkDedup,
  buildDedupQuery,
  candidateKindMatchesFrontmatterType,
  DEFAULT_DEDUP_THRESHOLD,
  // scan + promote
  scanSource,
  ImportScanError,
  promoteCandidate,
  PromoteValidationError,
  PromoteNotFoundError,
  // built-in adapters
  GithubStructuredDocsAdapter,
  GITHUB_STRUCTURED_DOCS_NAME,
  parsePepDocument,
  extractAssumptionSentences,
  CsvCorpusAdapter,
  CSV_CORPUS_NAME,
  GithubRepoAdrAdapter,
  GITHUB_REPO_ADR_NAME,
  parseAdr,
  extractMarkdownSection,
  __resetStderrOnceForTests,
  SecCompanyAdapter,
  SEC_COMPANY_NAME,
  extractEligibleSections,
  extractThemeHits,
  BUILTIN_ADAPTER_NAMES,
} from './import/index.js';
export type {
  CandidateKind,
  CandidateState,
  ImportAdapter,
  ImportContext,
  RawCandidate,
} from './import/adapter.js';
export type {
  ImportCandidateRow,
  ImportSourceRow,
  ListCandidatesOptions,
  MarkImportedInput,
  PersistCandidateInput,
  CreateImportSourceInput,
} from './import/candidates.js';
export type { DedupDecision, DedupHit, DedupOptions } from './import/dedup.js';
export type { ScanInput, ScanSummary, DedupStatus } from './import/scan.js';
export type { PromoteInput, PromoteResult, PromoteDetails } from './import/promote.js';
export type { AdapterHooks, GithubStructuredDocsConfig } from './import/adapters/github-structured-docs.js';

// Company tracker (Company Adapter v1)
export {
  applyCompanyOutcomes,
  readCompanyRun,
  trackCompanies,
  writeCompanyReports,
  CompanyInputError,
} from './company.js';
export type {
  CompanyApplyOutcomesInput,
  CompanyApplyOutcomesResult,
  CompanyReportOptions,
  CompanyTrackInput,
  CompanyTrackResult,
} from './company.js';

// v3 idea-extensions sidecar (v0.2 Phase 1 D1)
export {
  getIdeaContext,
  setIdeaExtension,
  getIdeaExtension,
  clearIdeaExtension,
} from './idea-extensions.js';
export type {
  AlternativeEntry,
  IdeaContext,
  IdeaContextInput,
  IdeaExtensionInput,
  IdeaExtensionRow,
  Reversibility,
} from './idea-extensions.js';

// v3 assumption-extensions sidecar (v0.2 Phase 1 D1 + v0.2 narrow-core-complete item 4)
export {
  setAssumptionExtension,
  getAssumptionExtension,
  clearAssumptionExtension,
  AssumptionActionValidationError,
} from './assumption-extensions.js';
export type {
  AssumptionExtensionInput,
  AssumptionExtensionRow,
  AssumptionMapping,
  ThresholdDirection,
  AssumptionAction,
  AssumptionActionStatus,
} from './assumption-extensions.js';

// v4 freezes — OSF preregistration (v0.2 Phase 1 D2)
export {
  buildSnapshot,
  createFreeze,
  getFreeze,
  listFreezesByIdea,
  bindFreezeToCouncilSession,
  FreezeInputError,
  FreezeNotFoundError,
  IdeaNotFoundError as FreezeIdeaNotFoundError,
} from './freezes.js';
export type {
  CreateFreezeOptions,
  FreezeRow,
  FreezeSnapshot,
  ListFreezesOptions as ListFreezesByIdeaOptions,
} from './freezes.js';

// P2.9 — exportable decision portfolios
export {
  exportIdea,
  exportPortfolio,
  listAllIdeaIds,
} from './export.js';
export type {
  ExportPortfolio,
  ExportedIdea,
  ExportedOutcome,
  ExportedOutcomeVerdict,
  ExportedCouncilSession,
  ExportedLineage,
  ExportIdeaOptions,
  ExportPortfolioOptions,
} from './export.js';
export { renderPortfolioMarkdown } from './export-markdown.js';
export type { RenderPortfolioOptions } from './export-markdown.js';

// v5 outcome memos — Anti-Portfolio post-mortem (v0.2 Phase 1 D4)
export {
  recordOutcomeMemo,
  getOutcomeMemo,
  clearOutcomeMemo,
  findRefutingOutcomesWithoutMemos,
  OutcomeMemoInputError,
} from './outcome-memos.js';
export type {
  OutcomeMemo,
  OutcomeMemoRow,
} from './outcome-memos.js';

// CLI version probe (alpha.5 fix D) — populates ideas_council_views.model_version
export { probeCliVersion, clearVersionCache } from './cli-version.js';
export type { ProbeOptions as CliVersionProbeOptions } from './cli-version.js';
export type {
  MemoryBridgeResult,
  MemoryBridgeSkipReason,
  RegisterOptions as MemoryBridgeRegisterOptions,
} from './memory-bridge.js';
