/**
 * Public surface for the bulk-import subsystem (v0.2 Phase 2).
 *
 * Module side-effect: registering the built-in adapters on first import so
 * the MCP tool can look them up by name without each callsite re-registering.
 */

import {
  GithubStructuredDocsAdapter,
  GITHUB_STRUCTURED_DOCS_NAME,
} from './adapters/github-structured-docs.js';
import { CsvCorpusAdapter, CSV_CORPUS_NAME } from './adapters/csv-corpus.js';
import {
  GithubRepoAdrAdapter,
  GITHUB_REPO_ADR_NAME,
} from './adapters/github-repo-adr.js';
import { registerAdapter } from './registry.js';

export * from './adapter.js';
export * from './candidates.js';
export * from './dedup.js';
export * from './registry.js';
export * from './scan.js';
export * from './promote.js';
export {
  GithubStructuredDocsAdapter,
  GITHUB_STRUCTURED_DOCS_NAME,
  parsePepDocument,
  extractAssumptionSentences,
} from './adapters/github-structured-docs.js';
export { CsvCorpusAdapter, CSV_CORPUS_NAME } from './adapters/csv-corpus.js';
export {
  GithubRepoAdrAdapter,
  GITHUB_REPO_ADR_NAME,
  parseAdr,
  extractMarkdownSection,
  __resetStderrOnceForTests,
} from './adapters/github-repo-adr.js';

// Register built-in adapters once per process. `registerAdapter` guards
// against double-registration at the same name — safe to import this module
// from multiple consumers.
function safeRegister(factory: () => Parameters<typeof registerAdapter>[0]) {
  try {
    registerAdapter(factory());
  } catch (err) {
    // Only suppress the "already registered" case — anything else is a bug.
    if (!(err instanceof Error) || !/already registered/.test(err.message)) {
      throw err;
    }
  }
}

safeRegister(() => new GithubStructuredDocsAdapter());
safeRegister(() => new CsvCorpusAdapter());
safeRegister(() => new GithubRepoAdrAdapter());

export const BUILTIN_ADAPTER_NAMES = [
  GITHUB_STRUCTURED_DOCS_NAME,
  CSV_CORPUS_NAME,
  GITHUB_REPO_ADR_NAME,
];
