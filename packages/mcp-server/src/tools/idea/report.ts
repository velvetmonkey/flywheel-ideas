import {
  buildSecCompanyLedgerReport,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export function handleReport(
  db: IdeasDatabase,
  args: { report_kind?: 'sec_company'; run_id?: string },
): ReturnType<typeof mcpText> {
  if (args.report_kind !== 'sec_company') {
    return mcpError('idea.report requires `report_kind: "sec_company"`', [
      {
        action: 'idea.report',
        example: 'idea.report({ report_kind: "sec_company" })',
        why: 'Render the SEC company assumption ledger: current bets, review queue, accepted verdicts, and dependent ideas needing review.',
      },
    ]);
  }
  const report = buildSecCompanyLedgerReport(db, { run_id: args.run_id });
  const next_steps: NextStep[] = [];
  if (!report.run || (report.run as { missing?: boolean }).missing === true) {
    next_steps.push({
      action: 'company.track',
      example: 'company.track({ companies: ["AAPL", "MSFT", "NVDA"], years: 10, confirm: true })',
      why: 'Create a SEC company tracker run before reading the ledger report.',
    });
  } else if (report.review_queue.length > 0) {
    next_steps.push({
      action: 'company.apply_outcomes',
      example: report.review_queue[0].apply_command,
      why: 'Review a staged event and apply the candidate IDs only if the evidence should enter the pass/fail ledger.',
    });
  } else {
    next_steps.push({
      action: 'company.track',
      example: 'company.track({ companies: ["AAPL", "MSFT", "NVDA"], years: 10, confirm: true })',
      why: 'Refresh the SEC company tracker when you want a newer evidence snapshot.',
    });
  }
  return mcpText({
    result: report,
    next_steps,
  });
}
