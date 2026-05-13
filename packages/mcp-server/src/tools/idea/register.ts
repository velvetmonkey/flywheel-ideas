/**
 * `idea` MCP tool — create, read, list, transition, and the rest.
 *
 * Action-based registration mirroring flywheel-memory's pattern: one tool, a
 * flat schema, action-discriminated handler. The schema shape is compatible
 * with how MCP clients (including Claude Code) surface tool hints; a zod
 * `discriminatedUnion` would be cleaner in TypeScript but has worse MCP-SDK
 * interop today.
 *
 * Per-action handlers live in sibling modules under `./tools/idea/`. This file
 * owns the tool registration, the input schema, and the dispatch switch +
 * top-level error boundary. Every response is `{result, next_steps}` —
 * see `next_steps.ts`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  IDEA_STATES,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpNotSupportedInDocMode } from '../../next_steps.js';
import { handleCreate } from './create.js';
import { handleRead } from './read.js';
import { handleList } from './list.js';
import { handleTransition } from './transition.js';
import { handleForget } from './forget.js';
import { handleFreeze, handleListFreezes } from './freeze.js';
import { handleAncestry, handleDescendants, handleSharedAssumptions } from './lineage.js';
import { handleExport } from './export.js';
import { handleReport } from './report.js';
import {
  docCreate,
  docList,
  docRead,
  docTransition,
  IDEA_DOC_MODE_ACTIONS,
  type IdeaActionName,
} from './doc-mode.js';

/**
 * Register the `idea` tool on a server. Captures the vault path + DB handle
 * via getters so tests can swap implementations.
 */
export function registerIdeaTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'idea',
    [
      'Manage the idea lifecycle in your decision ledger.',
      'Actions: create (new markdown note), read (full note + frontmatter), ',
      'list (paginated), transition (move lifecycle state; records a transition), ',
      'report (read-only ledger visibility).',
      'Every response includes next_steps to guide the next action.',
    ].join(''),
    {
      action: z
        .enum([
          'create', 'read', 'list', 'transition', 'forget',
          'freeze', 'list_freezes',
          'ancestry', 'descendants', 'shared_assumptions',
          'export', 'report',
        ])
        .describe('Operation to perform'),
      backend: z
        .enum(['sqlite', 'doc'])
        .optional()
        .describe(
          '[all] Storage backend. "sqlite" (default) is the canonical ledger with full feature set: council, outcome propagation, lineage, SEC tracking. "doc" is the embeddable single-file lifecycle — supports create/read/list/transition only; cross-idea actions return not_supported_in_doc_mode. See docs/single-doc-format.md for the file contract.',
        ),
      title: z
        .string()
        .min(1)
        .max(200)
        .optional()
        .describe('[create] Idea title — kebab-slugged into the filename'),
      body: z
        .string()
        .optional()
        .describe('[create] Markdown body (omit for an empty scaffold)'),
      context: z
        .object({
          situational_context: z.string().optional(),
          mental_or_physical_state: z.string().optional(),
          expected_outcome: z.string().optional(),
          review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          alternatives_considered: z
            .array(
              z.object({
                title: z.string().min(1),
                why_rejected: z.string().min(1),
              }),
            )
            .optional(),
        })
        .optional()
        .describe('[create] Optional private decision-journal context. Stored canonically in the DB sidecar, not in markdown, not exported by default.'),
      id: z
        .string()
        .optional()
        .describe('[read|transition] Idea id returned by a prior create'),
      state: z
        .enum(IDEA_STATES as unknown as [string, ...string[]])
        .optional()
        .describe('[list] Filter by state'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('[list] Max results (default 50)'),
      needs_review: z
        .boolean()
        .optional()
        .describe('[list] Filter by the needs_review flag set by outcome.log refutation cascades. true → only flagged ideas (the compounding mechanism\'s queue); false → only un-flagged.'),
      to: z
        .enum(IDEA_STATES as unknown as [string, ...string[]])
        .optional()
        .describe('[transition] Target state'),
      reason: z
        .string()
        .optional()
        .describe('[transition] Free-form note explaining the move'),
      include_stale: z
        .boolean()
        .optional()
        .describe('[list] Include ideas whose markdown file is missing from the vault (default: false)'),
      // freeze + list_freezes — OSF preregistration (v0.2 Phase 1 D2)
      supersedes_freeze_id: z
        .string()
        .optional()
        .describe('[freeze] Mark this freeze as an amendment to a prior freeze (OSF transparent-amendment chain). Requires amendment_rationale.'),
      amendment_rationale: z
        .string()
        .optional()
        .describe('[freeze] Required when supersedes_freeze_id is set; explains what changed and why.'),
      freeze_order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('[list_freezes] Sort order (default desc — newest first)'),
      // v0.2 D5 — lifecycle enforcement
      bypass_enforcement: z
        .boolean()
        .optional()
        .describe(
          '[transition] Skip prerequisite checks (council before evaluated, locked load-bearing assumption before committed, outcome before validated/refuted). Default: false. Set true ONLY for cleanup / migration / explicit override; the discipline gate is the whole point.',
        ),
      // v0.2 D7 — lineage queries
      max_depth: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('[ancestry|descendants] Max chain depth to walk (default 20). Caps cycles in malformed supersession data.'),
      // P2.9 — exportable decision portfolios
      idea_ids: z
        .array(z.string())
        .optional()
        .describe('[export] Explicit list of idea ids to export. Mutex with `all`.'),
      all: z
        .boolean()
        .optional()
        .describe('[export] Export every idea in the vault. Mutex with `idea_ids`. Use deliberately — large vaults produce large bundles.'),
      include_lineage: z
        .boolean()
        .optional()
        .describe('[export] Include ancestry + descendants lineage block per idea. Default true (lineage is the value-add over a single freeze).'),
      redact_bodies: z
        .boolean()
        .optional()
        .describe('[export] Hide idea body prose in the rendered markdown. Default true (paranoid default — assumptions / outcomes / council excerpts always render).'),
      output_path: z
        .string()
        .optional()
        .describe('[export] Override the default output path. Relative paths resolve under the vault. Default: `exports/portfolio-<timestamp>.md`.'),
      include_private_context: z
        .boolean()
        .optional()
        .describe('[export] Include private idea context in the export artifact. Default false.'),
      report_kind: z
        .enum(['sec_company'])
        .optional()
        .describe('[report] Report to render. `sec_company` summarizes current SEC company bets, review queue, accepted verdicts, and dependent ideas needing review.'),
      run_id: z
        .string()
        .optional()
        .describe('[report] Optional company tracker run id. Defaults to the latest run for `report_kind: sec_company`.'),
    },
    async (args) => {
      // Top-level error boundary: unhandled exceptions from handler I/O or
      // parse failures must NOT bubble as opaque JSON-RPC errors — they skip
      // the `{result, next_steps}` contract the LLM relies on. Wrap every
      // dispatch and return an `mcpError` with the thrown message as the
      // recovery hint.
      try {
        // Doc-mode boundary: if the caller asked for the portable
        // single-file backend, gate the action against the supported set
        // before touching the SQLite handlers. Unsupported actions return
        // a stable not_supported_in_doc_mode error; supported actions get
        // dispatched to their doc-mode counterpart (or, in this commit, to
        // a stub pending the B2 implementation).
        if (args.backend === 'doc') {
          const docAction = args.action as IdeaActionName;
          if (!IDEA_DOC_MODE_ACTIONS.has(docAction)) {
            return mcpNotSupportedInDocMode(`idea.${docAction}`);
          }
          switch (docAction) {
            case 'create':
              return await docCreate(getVaultPath(), args);
            case 'read':
              return await docRead(getVaultPath(), args);
            case 'list':
              return await docList(getVaultPath(), args);
            case 'transition':
              return await docTransition(getVaultPath(), args);
          }
        }

        switch (args.action) {
          case 'create':
            return await handleCreate(getVaultPath(), getDb(), args);
          case 'read':
            return handleRead(getVaultPath(), getDb(), args);
          case 'list':
            return handleList(getVaultPath(), getDb(), args);
          case 'transition':
            return await handleTransition(getVaultPath(), getDb(), args);
          case 'forget':
            return handleForget(getDb(), args);
          case 'freeze':
            return handleFreeze(getVaultPath(), getDb(), args);
          case 'list_freezes':
            return handleListFreezes(getDb(), args);
          case 'ancestry':
            return handleAncestry(getDb(), args);
          case 'descendants':
            return handleDescendants(getDb(), args);
          case 'shared_assumptions':
            return handleSharedAssumptions(getDb(), args);
          case 'export':
            return handleExport(getVaultPath(), getDb(), args);
          case 'report':
            return handleReport(getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`idea.${args.action} failed: ${message}`, [
          {
            action: 'idea.list',
            example: 'idea.list({})',
            why: 'Inspect the current state of the ledger to diagnose.',
          },
        ]);
      }
    },
  );
}
