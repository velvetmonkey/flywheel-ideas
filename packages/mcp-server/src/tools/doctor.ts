import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildConsistencyDoctorReport,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText } from '../next_steps.js';

export function registerDoctorTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'doctor',
    [
      'Read-only diagnostics for the flywheel-ideas decision ledger. ',
      'Actions: consistency (DB/markdown drift in sqlite mode; intra-file ',
      'invariants in doc mode). Select via mode: sqlite | doc | both.',
    ].join(''),
    {
      action: z.enum(['consistency']).describe('Diagnostic report to run'),
      mode: z
        .enum(['sqlite', 'doc', 'both'])
        .optional()
        .describe(
          '[consistency] sqlite (default) inspects DB rows against their markdown mirror; doc inspects ideas-doc/ for round-trip, state/verdict, transition-order, and section-shape violations; both runs everything. See docs/consistency.md.',
        ),
    },
    async (args) => {
      try {
        if (args.action !== 'consistency') {
          return mcpError(`unknown doctor action: ${(args as { action: string }).action}`);
        }
        const mode = args.mode ?? 'sqlite';
        const report = await buildConsistencyDoctorReport(getDb(), getVaultPath(), { mode });
        return mcpText({
          result: { ...report, mode },
          next_steps: report.ok
            ? [
                {
                  action: 'idea.list',
                  example: 'idea.list({})',
                  why: 'Continue normal ledger work; no consistency drift was found.',
                },
              ]
            : [
                {
                  action: 'doctor.consistency',
                  example: `doctor.consistency({ mode: "${mode}" })`,
                  why: 'Review the reported paths and decide which ones should be repaired manually or by a future repair action.',
                },
              ],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`doctor.${args.action} failed: ${message}`, [
          {
            action: 'doctor.consistency',
            example: 'doctor.consistency({})',
            why: 'Retry the read-only report after resolving the underlying filesystem or database error.',
          },
        ]);
      }
    },
  );
}
