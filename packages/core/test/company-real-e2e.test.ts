/**
 * Real-world SEC company lifecycle E2E.
 *
 * Skipped by default. Enable with:
 *
 *   RUN_REAL_SEC_COMPANY_E2E=1 npm run test -w @velvetmonkey/flywheel-ideas-core -- company-real-e2e
 *
 * This test intentionally uses live SEC network fetches and a real LLM CLI
 * evaluator. It writes a durable output folder so the run can be inspected
 * outside Vitest. Normal CI must not depend on this test.
 */

import { describe, expect, it } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  applyCompanyOutcomes,
  declareAssumption,
  evaluateCompanyRun,
  generateCouncilSessionId,
  generateCouncilViewId,
  generateIdeaId,
  getActiveWritePath,
  openIdeasDb,
  probeWritePath,
  readCompanyRun,
  recordOutcomeMemo,
  runCouncil,
  runMigrations,
  trackCompanies,
  writeNote,
  writeCompanyBundleReports,
  type IdeasDatabase,
} from '../src/index.js';

const RUN_REAL = process.env.RUN_REAL_SEC_COMPANY_E2E === '1';

const DEFAULT_COHORT = [
  ['Information Technology', ['AAPL', 'MSFT', 'NVDA']],
  ['Consumer Discretionary', ['AMZN', 'TSLA', 'HD']],
  ['Communication Services', ['GOOGL', 'META', 'NFLX']],
  ['Health Care', ['LLY', 'JNJ', 'MRK']],
  ['Energy', ['XOM', 'CVX', 'COP']],
] as const;

describe.skipIf(!RUN_REAL)('company tracker — real SEC + real LLM E2E', () => {
  it(
    'produces a durable real-world lifecycle output bundle',
    { timeout: 30 * 60 * 1000, retry: 0 },
    async () => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outRoot = process.env.FLYWHEEL_IDEAS_SEC_E2E_OUT_DIR
        ?? path.join(os.homedir(), 'sec-dogfood', 'real-e2e-runs');
      const outDir = path.join(outRoot, stamp);
      const vault = path.join(outDir, 'vault');
      await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });

      const previousNetwork = process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK;
      const previousUserAgent = process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT;
      process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK = '1';
      process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT =
        previousUserAgent ?? 'flywheel-ideas real-sec-e2e contact: velvetmonkey';

      let db: IdeasDatabase | null = null;
      try {
        db = openIdeasDb(vault);
        runMigrations(db);
        const writeProbe = await probeWritePath(vault);

        const companies = resolveCompanies();
        const runId = `real-sec-e2e-${stamp.toLowerCase()}`;
        const years = numberEnv('FLYWHEEL_IDEAS_SEC_E2E_YEARS', 3);
        const limitFilings = numberEnv('FLYWHEEL_IDEAS_SEC_E2E_LIMIT_FILINGS', 2);
        const evalLimit = numberEnv('FLYWHEEL_IDEAS_SEC_E2E_EVAL_LIMIT', 5);
        const result = await trackCompanies(db, vault, {
          run_id: runId,
          companies,
          years,
          forms: ['10-K', '10-Q'],
          confirm: true,
          limit_filings: limitFilings,
          max_companies: 125,
          company_metadata: buildMetadata(companies),
        });

        const outcomeEvaluation = result.staged_outcomes > 0
          ? await evaluateCompanyRun(db, vault, {
            run_id: result.run_id,
            stage: 'outcome_validity',
            limit: evalLimit,
            confirm: true,
          })
          : null;

        const thesisEvaluation = await evaluateCompanyRun(db, vault, {
          run_id: result.run_id,
          stage: 'thesis_delta',
          limit: evalLimit,
          confirm: true,
        });
        const afterEvaluation = readCompanyRun(db, result.run_id) as CompanyRunReport;
        const adjudication = await simulateHumanAdjudication(db, vault, result.run_id, afterEvaluation);
        const crossSectorCouncil = await runCrossSectorCouncil(db, vault, result.run_id, afterEvaluation);
        const bundle = await writeCompanyBundleReports(db, vault, result.run_id);
        const bundleVerification = await verifyBundleArtifacts(vault, bundle);
        const evidenceSourceCount = countCouncilEvidenceSources(db, String(crossSectorCouncil.session_id ?? ''));
        const report = readCompanyRun(db, result.run_id) as {
          evaluation_attempts: unknown[];
          run_members: Array<{ status: string }>;
          company_summaries: unknown[];
          sec_ledger_report: {
            executive_summary: {
              accepted_failures: number;
              accepted_lessons: number;
            };
            needs_review: unknown[];
            lessons_captured: unknown[];
          };
        };

        const manifest = {
          schema: 1,
          run_id: result.run_id,
          out_dir: outDir,
          vault,
          write_path: getActiveWritePath(),
          write_probe: writeProbe,
          companies,
          years,
          limit_filings: limitFilings,
          eval_limit: evalLimit,
          result,
          outcome_evaluation: outcomeEvaluation,
          thesis_evaluation: thesisEvaluation,
          adjudication,
          cross_sector_council: crossSectorCouncil,
          bundle,
          bundle_verification: bundleVerification,
          council_evidence_sources: evidenceSourceCount,
          report_summary: {
            evaluation_attempts: report.evaluation_attempts.length,
            company_summaries: report.company_summaries.length,
            completed_members: report.run_members.filter((member) => member.status === 'completed').length,
            accepted_failures: report.sec_ledger_report.executive_summary.accepted_failures,
            accepted_lessons: report.sec_ledger_report.executive_summary.accepted_lessons,
            dependent_needs_review: report.sec_ledger_report.needs_review.length,
            lessons_captured: report.sec_ledger_report.lessons_captured.length,
          },
          generated_at: new Date().toISOString(),
        };
        await fsp.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
        await fsp.writeFile(path.join(outDir, 'README.md'), renderReadme(manifest), 'utf8');

        expect(result.completed_companies).toBeGreaterThan(0);
        expect(report.company_summaries.length).toBeGreaterThan(0);
        expect(thesisEvaluation.evaluated_targets).toBeGreaterThan(0);
        expect(report.evaluation_attempts.length).toBeGreaterThan(0);
        expect(crossSectorCouncil.status).toBe('ran');
        expect(crossSectorCouncil.council.status).toBe('success');
        expect(evidenceSourceCount).toBeGreaterThan(0);
        expect(adjudication.status).toBe('applied');
        expect(adjudication.dependent_needs_review).toBe(true);
        expect(bundleVerification.missing).toEqual([]);
      } finally {
        db?.close();
        if (previousNetwork === undefined) delete process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK;
        else process.env.FLYWHEEL_IDEAS_IMPORT_NETWORK = previousNetwork;
        if (previousUserAgent === undefined) delete process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT;
        else process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT = previousUserAgent;
      }
    },
  );
});

interface EvaluationAttempt {
  target_id_value: string;
  decision: string;
  confidence: number | null;
  output_json: string;
}

interface CompanyRunReport {
  evaluation_attempts: EvaluationAttempt[];
  outcomes: Array<{
    id: string;
    state: string;
    assumption_id: string | null;
    confidence: number;
    rationale: string;
    source_uri: string;
    excerpt: string;
  }>;
  cross_sector_patterns: Array<Record<string, unknown>>;
}

async function simulateHumanAdjudication(
  db: IdeasDatabase,
  vault: string,
  runId: string,
  report: CompanyRunReport,
): Promise<Record<string, unknown>> {
  const outcomeAttempts = report.evaluation_attempts
    .filter((attempt) => attempt.decision === 'valid_failure' || attempt.decision === 'valid_validation')
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const selectedId = outcomeAttempts[0]?.target_id_value
    ?? report.outcomes.find((outcome) => outcome.state === 'staged' && outcome.assumption_id)?.id
    ?? null;
  if (!selectedId) {
    return {
      status: 'skipped',
      reason: 'no staged outcome candidate with linked assumption',
    };
  }

  const candidate = report.outcomes.find((outcome) => outcome.id === selectedId);
  if (!candidate?.assumption_id) {
    return {
      status: 'skipped',
      reason: 'selected candidate has no linked assumption',
      selected_candidate_id: selectedId,
    };
  }

  const dependentIdeaId = await seedDependentIdeaCitingAssumption(db, vault, candidate.assumption_id);
  const applied = await applyCompanyOutcomes(db, vault, {
    run_id: runId,
    outcome_candidate_ids: [selectedId],
    confirm: true,
  });
  if (applied.applied[0]) {
    recordOutcomeMemo(db, applied.applied[0].outcome_id, {
      refuted_assumption_id: candidate.assumption_id,
      root_cause: 'Real SEC filing evidence was accepted as a realized-risk event in the E2E simulation.',
      what_we_thought: 'The company could carry the disclosed risk without material disruption.',
      what_actually_happened: candidate.rationale,
      lesson: 'A company thesis becomes more valuable when recurring disclosed risks are connected to accepted outcomes and downstream review.',
    });
  }

  const dependent = db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`)
    .get(dependentIdeaId) as { needs_review: number } | undefined;
  return {
    status: 'applied',
    selected_candidate_id: selectedId,
    evaluator_supported_apply: outcomeAttempts.some((attempt) => attempt.target_id_value === selectedId),
    applied,
    dependent_idea_id: dependentIdeaId,
    dependent_needs_review: dependent?.needs_review === 1,
  };
}

async function seedDependentIdeaCitingAssumption(
  db: IdeasDatabase,
  vault: string,
  assumptionId: string,
): Promise<string> {
  const ideaId = generateIdeaId();
  const requestedVaultPath = `ideas/${ideaId}.md`;
  const now = Date.now();
  const write = await writeNote(
    vault,
    requestedVaultPath,
    {
      id: ideaId,
      type: 'idea',
      title: 'Dependent portfolio thesis for SEC E2E',
      state: 'explored',
      needs_review: false,
    },
    'This dependent thesis intentionally cites a company assumption so accepted SEC outcomes can test refutation propagation.',
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 8 },
  );
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, 'explored', ?, ?)`,
  ).run(ideaId, write.vault_path, 'Dependent portfolio thesis for SEC E2E', now, now);

  const sessionId = generateCouncilSessionId();
  const viewId = generateCouncilViewId();
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path, purpose)
     VALUES (?, ?, 'light', 'standard', ?, ?, ?, 'predictive')`,
  ).run(sessionId, ideaId, now, now, `councils/${ideaId}/session-01/SYNTHESIS.md`);
  db.prepare(
    `INSERT INTO ideas_council_views (
       id, session_id, model, persona,
       prompt_version, persona_version, model_version,
       input_hash,
       initial_stance, stance, self_critique, confidence,
       content_vault_path, failure_reason, stderr_tail
     ) VALUES (?, ?, 'real-e2e-seeded', 'risk-pessimist', 'real-e2e', 'real-e2e', NULL, 'sha256:real-e2e',
               NULL, 'The dependent thesis relies on this company assumption.', NULL, 0.7,
               ?, NULL, NULL)`,
  ).run(viewId, sessionId, `councils/${ideaId}/session-01/view.md`);
  db.prepare(
    `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
  ).run(viewId, assumptionId);
  return ideaId;
}

async function runCrossSectorCouncil(
  db: IdeasDatabase,
  vault: string,
  runId: string,
  report: CompanyRunReport,
): Promise<Record<string, unknown>> {
  const ideaId = generateIdeaId();
  const requestedVaultPath = `ideas/${ideaId}.md`;
  const now = Date.now();
  const topPatterns = report.cross_sector_patterns.slice(0, 5);
  const body = [
    'This E2E idea asks whether the apparent SEC cross-sector mechanisms are meaningful or mostly boilerplate.',
    '',
    '## Candidate Patterns',
    '',
    ...topPatterns.map((pattern, index) =>
      `${index + 1}. ${String(pattern.theme_title ?? 'unknown theme')} / ${String(pattern.mechanism_title ?? 'unknown mechanism')} across ${(pattern.sectors as string[] | undefined)?.join(', ') ?? 'unknown sectors'}`,
    ),
  ].join('\n');
  const write = await writeNote(
    vault,
    requestedVaultPath,
    {
      id: ideaId,
      type: 'idea',
      title: 'Are SEC cross-sector patterns meaningful?',
      state: 'explored',
    },
    body,
    { overwrite: true, skipWikilinks: false, suggestOutgoingLinks: true, maxSuggestions: 12 },
  );
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, 'explored', ?, ?)`,
  ).run(ideaId, write.vault_path, 'Are SEC cross-sector patterns meaningful?', now, now);
  const { assumption } = await declareAssumption(db, vault, {
    idea_id: ideaId,
    text: 'The shared SEC mechanisms represent meaningful cross-sector thesis risks rather than boilerplate.',
    load_bearing: true,
  });

  const cli = resolveCouncilCli();
  const council = await runCouncil(
    db,
    vault,
    {
      idea_id: ideaId,
      depth: 'light',
      mode: 'standard',
      purpose: 'predictive',
      approval_scope: 'session',
    },
    {
      clis_override: [cli],
      max_concurrency_override: 1,
    },
  );
  return {
    status: 'ran',
    idea_id: ideaId,
    assumption_id: assumption.id,
    session_id: council.session_id,
    cli,
    council,
  };
}

async function verifyBundleArtifacts(
  vault: string,
  bundle: { indexPath: string; writtenPaths: string[] },
): Promise<{ checked: number; missing: string[] }> {
  const paths = Array.from(new Set([bundle.indexPath, ...bundle.writtenPaths]));
  const missing: string[] = [];
  for (const relPath of paths) {
    try {
      await fsp.stat(path.join(vault, relPath));
    } catch {
      missing.push(relPath);
    }
  }
  return { checked: paths.length, missing };
}

function countCouncilEvidenceSources(db: IdeasDatabase, sessionId: string): number {
  const row = db.prepare(`SELECT sources_json FROM ideas_council_evidence WHERE session_id = ?`)
    .get(sessionId) as { sources_json: string } | undefined;
  if (!row) return 0;
  try {
    const sources = JSON.parse(row.sources_json) as unknown;
    return Array.isArray(sources) ? sources.length : 0;
  } catch {
    return 0;
  }
}

function resolveCompanies(): string[] {
  const raw = process.env.FLYWHEEL_IDEAS_SEC_E2E_COMPANIES;
  if (raw) return raw.split(',').map((ticker) => ticker.trim().toUpperCase()).filter(Boolean);
  return DEFAULT_COHORT.flatMap(([, tickers]) => [...tickers]);
}

function buildMetadata(companies: string[]): Record<string, { sector: string; source_rank: number; source: string }> {
  const metadata: Record<string, { sector: string; source_rank: number; source: string }> = {};
  for (const [sector, tickers] of DEFAULT_COHORT) {
    tickers.forEach((ticker, index) => {
      if (companies.includes(ticker)) {
        metadata[ticker] = {
          sector,
          source_rank: index + 1,
          source: 'real-sec-e2e-default-cohort',
        };
      }
    });
  }
  for (const ticker of companies) {
    metadata[ticker] ??= {
      sector: 'Custom',
      source_rank: 1,
      source: 'real-sec-e2e-custom-cohort',
    };
  }
  return metadata;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveCouncilCli(): 'claude' | 'codex' | 'gemini' {
  const raw = process.env.FLYWHEEL_IDEAS_SEC_E2E_COUNCIL_CLI;
  return raw === 'claude' || raw === 'gemini' || raw === 'codex' ? raw : 'codex';
}

function renderReadme(manifest: {
  run_id: string;
  vault: string;
  bundle: { indexPath: string };
  bundle_verification?: { checked: number; missing: string[] };
  companies: string[];
  write_path: string;
  council_evidence_sources?: number;
  report_summary: {
    accepted_failures: number;
    accepted_lessons: number;
    dependent_needs_review: number;
    lessons_captured: number;
  };
  adjudication: Record<string, unknown>;
  cross_sector_council: Record<string, unknown>;
}): string {
  return [
    '# Real SEC + LLM Company Lifecycle E2E',
    '',
    `Run id: ${manifest.run_id}`,
    `Vault: ${manifest.vault}`,
    `Companies: ${manifest.companies.join(', ')}`,
    `Write path: ${manifest.write_path}`,
    '',
    '## Start Here',
    '',
    `Open \`${manifest.bundle.indexPath}\` inside the generated vault.`,
    '',
    '## Full Loop Signals',
    '',
    `- Accepted failures: ${manifest.report_summary.accepted_failures}`,
    `- Accepted lessons: ${manifest.report_summary.accepted_lessons}`,
    `- Dependent ideas needing review: ${manifest.report_summary.dependent_needs_review}`,
    `- Lessons captured: ${manifest.report_summary.lessons_captured}`,
    `- Human adjudication simulation: ${String(manifest.adjudication.status)}`,
    `- Cross-sector council: ${String(manifest.cross_sector_council.status)}`,
    `- Council evidence sources from Flywheel search: ${manifest.council_evidence_sources ?? 0}`,
    `- Bundle artifacts verified: ${manifest.bundle_verification?.checked ?? 0}`,
    '',
    '## Notes',
    '',
    '- This run uses live SEC data, a real LLM CLI evaluator, and a real council escalation.',
    '- Generated report writes request Flywheel wikilinks and outgoing-link suggestions. `Write path` shows whether flywheel-memory handled those writes or the test fell back to direct filesystem writes.',
    '- Refutation propagation is simulated by seeding a dependent idea whose prior council view cited the accepted company assumption.',
    '- It is decision-support output, not investment advice.',
    '- The output folder is intentionally not deleted after the test.',
    '',
  ].join('\n');
}
