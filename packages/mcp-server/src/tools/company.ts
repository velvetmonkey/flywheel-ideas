import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  applyCompanyOutcomes,
  CompanyInputError,
  readCompanyRun,
  trackCompanies,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../next_steps.js';

export function registerCompanyTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'company',
    [
      'Track public companies over time using SEC 10-K/10-Q filings. ',
      'Actions: track (scan companies, promote recurring risk themes, stage ',
      'realized-risk outcomes), read (latest or selected run), report ',
      '(return report paths/data), apply_outcomes (explicitly log staged ',
      'high-confidence outcomes).',
    ].join(''),
    {
      action: z.enum(['track', 'read', 'report', 'apply_outcomes']),
      companies: z.array(z.string()).max(3).optional().describe('[track] Up to 3 tickers or cik:########## sources'),
      years: z.number().int().min(1).max(20).optional().describe('[track] Backfill window; default 10'),
      forms: z.array(z.enum(['10-K', '10-Q'])).optional().describe('[track] Filing forms; default 10-K + 10-Q'),
      confirm: z.boolean().optional().describe('[track|apply_outcomes] Required true for write-side actions'),
      fixture_dir: z.string().optional().describe('[track] Test/dev fixture directory for SEC filings'),
      limit_filings: z.number().int().min(1).optional().describe('[track] Dev/test cap on filings per company'),
      run_id: z.string().optional().describe('[read|report|apply_outcomes] Company tracker run id'),
      company: z.string().optional().describe('[report] Optional company filter; reserved for v1.1'),
      format: z.enum(['markdown', 'json', 'both']).optional().describe('[report] Report format; default both'),
      outcome_candidate_ids: z.array(z.string()).optional().describe('[apply_outcomes] Specific staged candidates to apply'),
      min_confidence: z.number().min(0).max(1).optional().describe('[apply_outcomes] Default 0.9'),
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'track':
            return await handleTrack(getVaultPath(), getDb(), args);
          case 'read':
            return handleRead(getDb(), args);
          case 'report':
            return handleReport(getDb(), args);
          case 'apply_outcomes':
            return await handleApply(getVaultPath(), getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`company.${args.action} failed: ${message}`);
      }
    },
  );
}

async function handleTrack(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    companies?: string[];
    years?: number;
    forms?: string[];
    confirm?: boolean;
    fixture_dir?: string;
    limit_filings?: number;
  },
) {
  if (!args.companies || args.companies.length === 0) {
    return mcpError('company.track requires `companies`', [
      {
        action: 'company.track',
        example: 'company.track({ companies: ["AAPL", "MSFT", "NVDA"], years: 10, confirm: true })',
        why: 'Provide up to three tickers or CIK sources.',
      },
    ]);
  }
  if (args.confirm !== true) {
    return mcpError('company.track requires `confirm: true`', [
      {
        action: 'company.track',
        example: `company.track({ companies: ${JSON.stringify(args.companies)}, years: 10, confirm: true })`,
        why: 'Tracking promotes idea/assumption records and writes report artifacts.',
      },
    ]);
  }
  const result = await trackCompanies(db, vaultPath, {
    companies: args.companies,
    years: args.years,
    forms: args.forms,
    confirm: true,
    fixture_dir: args.fixture_dir,
    limit_filings: args.limit_filings,
  });
  const next_steps: NextStep[] = [
    {
      action: 'company.report',
      example: `company.report({ run_id: "${result.run_id}", format: "both" })`,
      why: 'Read the Markdown/JSON report paths and structured data.',
    },
  ];
  if (result.staged_outcomes > 0) {
    next_steps.push({
      action: 'company.apply_outcomes',
      example: `company.apply_outcomes({ run_id: "${result.run_id}", min_confidence: 0.9, confirm: true })`,
      why: `${result.staged_outcomes} realized-risk outcome candidate(s) were staged; apply only after review.`,
    });
  }
  return mcpText({ result, next_steps });
}

function handleRead(db: IdeasDatabase, args: { run_id?: string }) {
  return mcpText({
    result: readCompanyRun(db, args.run_id),
    next_steps: [
      {
        action: 'company.report',
        example: args.run_id
          ? `company.report({ run_id: "${args.run_id}" })`
          : 'company.report({ run_id: "..." })',
        why: 'Render or inspect report artifacts for this run.',
      },
    ],
  });
}

function handleReport(db: IdeasDatabase, args: { run_id?: string; format?: string }) {
  if (!args.run_id) {
    return mcpError('company.report requires `run_id`', [
      { action: 'company.read', example: 'company.read({})', why: 'Find the latest run id.' },
    ]);
  }
  return mcpText({
    result: {
      format: args.format ?? 'both',
      data: readCompanyRun(db, args.run_id),
    },
    next_steps: [
      {
        action: 'company.apply_outcomes',
        example: `company.apply_outcomes({ run_id: "${args.run_id}", min_confidence: 0.9, confirm: true })`,
        why: 'Apply reviewed staged outcomes.',
      },
    ],
  });
}

async function handleApply(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    run_id?: string;
    outcome_candidate_ids?: string[];
    min_confidence?: number;
    confirm?: boolean;
  },
) {
  if (!args.run_id) {
    return mcpError('company.apply_outcomes requires `run_id`');
  }
  if (args.confirm !== true) {
    return mcpError('company.apply_outcomes requires `confirm: true`');
  }
  try {
    const result = await applyCompanyOutcomes(db, vaultPath, {
      run_id: args.run_id,
      outcome_candidate_ids: args.outcome_candidate_ids,
      min_confidence: args.min_confidence,
      confirm: true,
    });
    return mcpText({
      result,
      next_steps: [
        {
          action: 'company.report',
          example: `company.report({ run_id: "${args.run_id}" })`,
          why: 'Confirm applied outcomes are reflected in the company report.',
        },
      ],
    });
  } catch (err) {
    if (err instanceof CompanyInputError) return mcpError(err.message);
    throw err;
  }
}
