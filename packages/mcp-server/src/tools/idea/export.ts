import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  exportPortfolio,
  getActiveWritePath,
  listAllIdeaIds,
  renderPortfolioMarkdown,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export function handleExport(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    idea_ids?: string[];
    all?: boolean;
    include_lineage?: boolean;
    redact_bodies?: boolean;
    output_path?: string;
    include_private_context?: boolean;
  },
): ReturnType<typeof mcpText> {
  // Validation: idea_ids XOR all (exactly one must be provided)
  const hasIds = Array.isArray(args.idea_ids) && args.idea_ids.length > 0;
  const hasAll = args.all === true;
  if (hasIds && hasAll) {
    return mcpError('export takes either `idea_ids` OR `all: true`, not both', [
      {
        action: 'idea.export',
        example: 'idea.export({ idea_ids: ["idea-py3k"] })',
        why: 'Pick one explicit list. `all` is for whole-vault exports; `idea_ids` is for selected.',
      },
    ]);
  }
  if (!hasIds && !hasAll) {
    return mcpError('export requires either `idea_ids` (non-empty) or `all: true`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find ids to export, then call idea.export({ idea_ids: [...] }).',
      },
    ]);
  }

  const idea_ids = hasAll ? listAllIdeaIds(db) : (args.idea_ids ?? []);
  if (idea_ids.length === 0) {
    return mcpError('vault contains zero ideas — nothing to export', [
      {
        action: 'idea.create',
        example: 'idea.create({ title: "Your first idea" })',
        why: 'Create an idea before exporting.',
      },
    ]);
  }

  const include_lineage = args.include_lineage ?? true;
  const redact_bodies = args.redact_bodies ?? true;

  let portfolio;
  try {
    portfolio = exportPortfolio(db, vaultPath, idea_ids, {
      include_lineage,
      include_private_context: args.include_private_context,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return mcpError(`export failed: ${message}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'Verify all idea_ids are present in the vault.',
      },
    ]);
  }

  const markdown = renderPortfolioMarkdown(portfolio, { redact_bodies });

  // Default: <vault>/exports/portfolio-<timestamp>.md.
  const ts = new Date(portfolio.exported_at)
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace(/Z$/, '');
  const defaultRelPath = `exports/portfolio-${ts}.md`;
  const relPath = args.output_path ?? defaultRelPath;
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(vaultPath, relPath);

  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, markdown, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return mcpError(`export rendering succeeded but write failed: ${message}`, [
      {
        action: 'idea.export',
        example: `idea.export({ idea_ids: ${JSON.stringify(idea_ids.slice(0, 1))}, output_path: "/tmp/portfolio.md" })`,
        why: 'Try a different output_path that the process can write to.',
      },
    ]);
  }

  const total_assumptions = portfolio.ideas.reduce(
    (sum, idea) => sum + idea.snapshot.assumptions.length,
    0,
  );
  const total_outcomes = portfolio.ideas.reduce(
    (sum, idea) => sum + idea.outcomes.length,
    0,
  );
  const total_council_sessions = portfolio.ideas.reduce(
    (sum, idea) => sum + idea.council_sessions.length,
    0,
  );

  const next_steps: NextStep[] = [
    {
      action: 'review-export',
      example: `cat ${absPath}`,
      why: 'Cold-read the markdown bundle. The point of P2.9 is producing a shareable artifact — if it doesn\'t read cleanly, iterate.',
    },
    {
      action: 'idea.export',
      example: `idea.export({ idea_ids: ${JSON.stringify(idea_ids.slice(0, 1))}, redact_bodies: false })`,
      why: 'Re-export with bodies INCLUDED if you trust the recipient. Default redacts body prose for paranoia.',
    },
    {
      action: 'idea.report',
      example: 'idea.report({ report_kind: "sec_company" })',
      why: 'If you are using the SEC company tracker, inspect the live bets, review queue, accepted verdicts, and missing lesson memos.',
    },
  ];

  return mcpText({
    result: {
      vault_path: absPath,
      ideas_count: portfolio.ideas.length,
      total_assumptions,
      total_outcomes,
      total_council_sessions,
      bytes_written: Buffer.byteLength(markdown, 'utf8'),
      redacted: redact_bodies,
      include_lineage,
      include_private_context: args.include_private_context === true,
      schema_version: portfolio.schema_version,
      exported_at: portfolio.exported_at_iso,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}
