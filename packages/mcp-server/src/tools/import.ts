/**
 * `import` MCP tool — bulk-import staging surface (v0.2 Phase 2).
 *
 * Actions:
 *   - `scan`    — invoke a registered source adapter against an external
 *                 source; persist candidates with dedup decisions
 *   - `promote` — write a staged candidate to the vault via the existing
 *                 v0.1 writers (createIdea / declareAssumption / logOutcome)
 *   - `list`    — enumerate candidates (filter by source, state, kind)
 *   - `read`    — single-candidate detail for inspection before promote
 *   - `reject`  — mark a candidate rejected (no vault write)
 *
 * All responses carry `next_steps`. No auto-promotion; scan never touches
 * the vault, and every vault write requires an explicit `promote` call.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getActiveWritePath,
  CandidateStateError,
  getCandidate,
  getImportSource,
  ImportAdapterError,
  ImportNetworkGatedError,
  ImportScanError,
  listAdapters,
  listCandidates,
  markCandidateRejected,
  parseExtractedFields,
  promoteCandidate,
  PromoteNotFoundError,
  PromoteValidationError,
  scanSource,
  type CandidateKind,
  type CandidateState,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../next_steps.js';

// Side-effect: registers the built-in adapters (github-structured-docs, csv-corpus).
import '@velvetmonkey/flywheel-ideas-core';

export function registerImportTool(
  server: McpServer,
  getVaultPath: () => string,
  getDb: () => IdeasDatabase,
): void {
  server.tool(
    'import',
    [
      'Bulk-import decision-shaped content from external sources into the ',
      'staging sidecar (ideas_import_candidates). Actions: scan (invoke an ',
      'adapter → persist candidates with dedup), promote (write one ',
      'candidate to the vault via the existing v0.1 writers), list / read ',
      '(inspect candidates before promotion), reject (discard without ',
      'writing). No auto-promotion — every vault write requires an explicit ',
      'promote call. Adapters surface candidates with a 0..1 confidence ',
      'score; the user is the gate.',
    ].join(''),
    {
      action: z.enum(['scan', 'promote', 'list', 'read', 'reject']).describe('Operation'),
      // scan
      adapter: z.string().optional().describe('[scan] Adapter name, e.g. "github-structured-docs" or "csv-corpus"'),
      source: z.string().optional().describe('[scan] Source identifier (adapter-specific; github-structured-docs: "owner/repo", "owner/repo@ref", "owner/repo:path/", or "fixture://<dir>"; csv-corpus: absolute path or file:// URL to a .jsonl corpus)'),
      scan_config: z
        .record(z.unknown())
        .optional()
        .describe('[scan] Opaque JSON blob passed through to the adapter (reserved)'),
      target_idea_id: z
        .string()
        .optional()
        .describe('[scan|promote] Bind all candidates from this scan to an existing idea (assumption/outcome promotes)'),
      dedup: z
        .union([
          z.literal(false),
          z.object({
            threshold: z.number().min(0).max(1).optional(),
            timeoutMs: z.number().int().positive().optional(),
            searchLimit: z.number().int().min(1).max(10).optional(),
          }),
        ])
        .optional()
        .describe('[scan] Set to false to skip dedup; pass an object to tune the threshold/timeout'),
      // promote / read / reject
      candidate_id: z.string().optional().describe('[promote|read|reject] Candidate id'),
      as: z
        .enum(['idea', 'assumption', 'outcome'])
        .optional()
        .describe('[promote] Kind to promote as (must match candidate_kind)'),
      override_duplicate: z
        .boolean()
        .optional()
        .describe('[promote] Required when promoting a candidate flagged state=duplicate'),
      refutes: z.array(z.string()).optional().describe('[promote] For outcomes: assumption ids to refute'),
      validates: z.array(z.string()).optional().describe('[promote] For outcomes: assumption ids to validate'),
      // list
      source_id: z.string().optional().describe('[list] Filter to one scan source'),
      state: z
        .enum(['pending', 'imported', 'rejected', 'duplicate'])
        .optional()
        .describe('[list] Filter by state'),
      candidate_kind: z
        .enum(['idea', 'assumption', 'outcome'])
        .optional()
        .describe('[list] Filter by kind'),
      limit: z.number().int().min(1).max(500).optional().describe('[list] Max results (default 200)'),
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'scan':
            return await handleScan(getVaultPath(), getDb(), args);
          case 'promote':
            return await handlePromote(getVaultPath(), getDb(), args);
          case 'list':
            return handleList(getDb(), args);
          case 'read':
            return handleRead(getDb(), args);
          case 'reject':
            return handleReject(getDb(), args);
          default:
            return mcpError(`unknown action: ${(args as { action: string }).action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(`import.${args.action} failed: ${message}`, [
          {
            action: 'import.list',
            example: 'import.list({})',
            why: 'Inspect existing candidates for context.',
          },
        ]);
      }
    },
  );
}

// ---------- import.scan ----------

async function handleScan(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    adapter?: string;
    source?: string;
    scan_config?: Record<string, unknown>;
    target_idea_id?: string;
    dedup?: false | { threshold?: number; timeoutMs?: number; searchLimit?: number };
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.adapter) {
    return mcpError('scan requires `adapter`', [
      {
        action: 'import.scan',
        example: `import.scan({ adapter: "github-structured-docs", source: "python/peps" })`,
        why: `Available adapters: ${listAdapters().join(', ')}.`,
      },
    ]);
  }
  if (!args.source) {
    return mcpError('scan requires `source`', [
      {
        action: 'import.scan',
        example: `import.scan({ adapter: "${args.adapter}", source: "owner/repo" })`,
        why: 'Source is adapter-specific — for github-structured-docs, use "owner/repo" or "fixture://<dir>".',
      },
    ]);
  }
  try {
    const summary = await scanSource(db, vaultPath, {
      adapter: args.adapter,
      source: args.source,
      scan_config: args.scan_config,
      target_idea_id: args.target_idea_id,
      dedup: args.dedup,
    });

    const next_steps: NextStep[] = [];
    if (summary.duplicate_count > 0) {
      next_steps.push({
        action: 'import.list',
        example: `import.list({ source_id: "${summary.source_id}", state: "duplicate" })`,
        why: `${summary.duplicate_count} candidate(s) flagged as duplicates of existing vault notes — inspect before overriding.`,
      });
    }
    if (summary.pending_count > 0) {
      const first = summary.candidates.find((c) => c.state === 'pending');
      next_steps.push({
        action: 'import.promote',
        example: first
          ? `import.promote({ candidate_id: "${first.id}", as: "${first.candidate_kind}" })`
          : 'import.promote({ candidate_id: "...", as: "idea" })',
        why: `${summary.pending_count} candidate(s) ready to promote. Promoting writes the vault note via the existing v0.1 writers.`,
      });
    }
    if (summary.dedup_status !== 'ran' && summary.dedup_status !== 'disabled') {
      next_steps.push({
        action: 'import.scan',
        example: `import.scan({ adapter: "${args.adapter}", source: "${args.source}" })`,
        why: `Dedup was ${summary.dedup_status} (flywheel-memory subprocess unavailable). Install/configure @velvetmonkey/flywheel-memory and re-scan to get duplicate flags.`,
      });
    }
    next_steps.push({
      action: 'import.list',
      example: `import.list({ source_id: "${summary.source_id}" })`,
      why: 'Full candidate list for this scan.',
    });

    return mcpText({
      result: {
        ...summary,
        write_path: getActiveWritePath(),
      },
      next_steps,
    });
  } catch (err) {
    if (err instanceof ImportNetworkGatedError) {
      return mcpError(err.message, [
        {
          action: 'import.scan',
          example: 'FLYWHEEL_IDEAS_IMPORT_NETWORK=1 (env) then re-run scan',
          why: 'Network egress is gated off by default; set the env var to allow the adapter to fetch.',
        },
      ]);
    }
    if (err instanceof ImportAdapterError) {
      return mcpError(err.message, [
        {
          action: 'import.scan',
          example: `import.scan({ adapter: "${args.adapter}", source: "fixture://<dir>" })`,
          why: 'Use a fixture directory to debug parse errors without network.',
        },
      ]);
    }
    if (err instanceof ImportScanError) {
      return mcpError(err.message, [
        {
          action: 'import.scan',
          example: 'import.scan({ adapter: "github-structured-docs", source: "python/peps" })',
          why: `Available adapters: ${listAdapters().join(', ')}.`,
        },
      ]);
    }
    throw err;
  }
}

// ---------- import.promote ----------

async function handlePromote(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    candidate_id?: string;
    as?: CandidateKind;
    target_idea_id?: string;
    override_duplicate?: boolean;
    refutes?: string[];
    validates?: string[];
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.candidate_id) {
    return mcpError('promote requires `candidate_id`', [
      {
        action: 'import.list',
        example: 'import.list({ state: "pending" })',
        why: 'List pending candidates to find the one to promote.',
      },
    ]);
  }
  if (!args.as) {
    return mcpError('promote requires `as` (idea | assumption | outcome)', [
      {
        action: 'import.read',
        example: `import.read({ candidate_id: "${args.candidate_id}" })`,
        why: 'Read the candidate to confirm its kind before promoting.',
      },
    ]);
  }
  try {
    const result = await promoteCandidate(db, vaultPath, {
      candidate_id: args.candidate_id,
      as: args.as,
      target_idea_id: args.target_idea_id,
      override_duplicate: args.override_duplicate,
      refutes: args.refutes,
      validates: args.validates,
    });
    const next_steps: NextStep[] = nextStepsAfterPromote(result);
    return mcpText({
      result: {
        ...result,
        write_path: getActiveWritePath(),
      },
      next_steps,
    });
  } catch (err) {
    if (err instanceof PromoteNotFoundError) {
      return mcpError(err.message, [
        {
          action: 'import.list',
          example: 'import.list({})',
          why: 'List candidates to confirm the id.',
        },
      ]);
    }
    if (err instanceof PromoteValidationError) {
      return mcpError(err.message, [
        {
          action: 'import.read',
          example: `import.read({ candidate_id: "${args.candidate_id}" })`,
          why: 'Read the candidate to confirm its kind + state before retrying.',
        },
      ]);
    }
    if (err instanceof CandidateStateError) {
      return mcpError(err.message, [
        {
          action: 'import.read',
          example: `import.read({ candidate_id: "${args.candidate_id}" })`,
          why: 'Candidate is not in a promotable state — read to confirm its current state.',
        },
      ]);
    }
    throw err;
  }
}

function nextStepsAfterPromote(
  result: Awaited<ReturnType<typeof promoteCandidate>>,
): NextStep[] {
  if (result.kind === 'idea') {
    return [
      {
        action: 'assumption.declare',
        example: `assumption.declare({ idea_id: "${result.promoted_id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
        why: 'Follow the compounding loop — declare load-bearing assumptions before stress-testing.',
      },
      {
        action: 'idea.read',
        example: `idea.read({ id: "${result.promoted_id}" })`,
        why: 'Verify the imported idea and its frontmatter.',
      },
    ];
  }
  if (result.kind === 'assumption' && result.details.kind === 'assumption') {
    return [
      {
        action: 'council.run',
        example: `council.run({ id: "${result.details.idea_id}", confirm: true })`,
        why: 'Run the council against the parent idea now that this assumption is declared.',
      },
    ];
  }
  if (result.kind === 'outcome' && result.details.kind === 'outcome') {
    const flagged = result.details.flagged_count;
    if (flagged > 0) {
      return [
        {
          action: 'idea.list',
          example: 'idea.list({ needs_review: true })',
          why: `This outcome refutation cascaded to ${flagged} idea(s). Review the flagged queue.`,
        },
      ];
    }
    return [
      {
        action: 'outcome.read',
        example: `outcome.read({ id: "${result.promoted_id}" })`,
        why: 'Re-read the imported outcome for full detail.',
      },
    ];
  }
  return [];
}

// ---------- import.list ----------

function handleList(
  db: IdeasDatabase,
  args: {
    source_id?: string;
    state?: CandidateState;
    candidate_kind?: CandidateKind;
    limit?: number;
  },
): ReturnType<typeof mcpText> {
  const rows = listCandidates(db, {
    source_id: args.source_id,
    state: args.state,
    candidate_kind: args.candidate_kind,
    limit: args.limit,
  });
  const next_steps: NextStep[] = [];
  if (rows.length === 0) {
    next_steps.push({
      action: 'import.scan',
      example: 'import.scan({ adapter: "github-structured-docs", source: "python/peps" })',
      why: `No candidates yet. Available adapters: ${listAdapters().join(', ')}.`,
    });
  } else {
    const pending = rows.find((r) => r.state === 'pending');
    if (pending) {
      next_steps.push({
        action: 'import.promote',
        example: `import.promote({ candidate_id: "${pending.id}", as: "${pending.candidate_kind}" })`,
        why: 'Promote the first pending candidate.',
      });
    } else {
      next_steps.push({
        action: 'import.read',
        example: `import.read({ candidate_id: "${rows[0].id}" })`,
        why: 'Inspect the most recent candidate.',
      });
    }
  }
  return mcpText({
    result: {
      candidates: rows.map((r) => ({
        id: r.id,
        source_id: r.source_id,
        adapter: r.adapter,
        candidate_kind: r.candidate_kind,
        title: r.title,
        confidence: r.confidence,
        state: r.state,
        dedup_match_path: r.dedup_match_path,
        dedup_match_score: r.dedup_match_score,
        source_uri: r.source_uri,
        scanned_at: r.scanned_at,
        imported_at: r.imported_at,
        imported_vault_path: r.imported_vault_path,
      })),
      count: rows.length,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

// ---------- import.read ----------

function handleRead(
  db: IdeasDatabase,
  args: { candidate_id?: string },
): ReturnType<typeof mcpText> {
  if (!args.candidate_id) {
    return mcpError('read requires `candidate_id`', [
      {
        action: 'import.list',
        example: 'import.list({})',
        why: 'List candidates to find the id.',
      },
    ]);
  }
  const row = getCandidate(db, args.candidate_id);
  if (!row) return mcpError(`candidate not found: ${args.candidate_id}`);
  const source = getImportSource(db, row.source_id);
  const extracted = parseExtractedFields(row);

  const next_steps: NextStep[] = [];
  if (row.state === 'pending' || row.state === 'duplicate') {
    next_steps.push({
      action: 'import.promote',
      example:
        row.candidate_kind === 'idea'
          ? `import.promote({ candidate_id: "${row.id}", as: "idea"${row.state === 'duplicate' ? ', override_duplicate: true' : ''} })`
          : `import.promote({ candidate_id: "${row.id}", as: "${row.candidate_kind}", target_idea_id: "...", refutes: [] })`,
      why:
        row.state === 'duplicate'
          ? 'Promote anyway by overriding the duplicate flag.'
          : 'Write this candidate to the vault via the existing v0.1 writer.',
    });
    next_steps.push({
      action: 'import.reject',
      example: `import.reject({ candidate_id: "${row.id}" })`,
      why: 'Discard without writing if the candidate is not useful.',
    });
  } else {
    next_steps.push({
      action: 'import.list',
      example: `import.list({ source_id: "${row.source_id}" })`,
      why: 'Other candidates in the same scan.',
    });
  }

  return mcpText({
    result: {
      id: row.id,
      source_id: row.source_id,
      adapter: row.adapter,
      candidate_kind: row.candidate_kind,
      title: row.title,
      body_md: row.body_md,
      extracted_fields: extracted,
      confidence: row.confidence,
      state: row.state,
      source_uri: row.source_uri,
      dedup_match_path: row.dedup_match_path,
      dedup_match_score: row.dedup_match_score,
      target_idea_id: row.target_idea_id,
      scanned_at: row.scanned_at,
      imported_at: row.imported_at,
      imported_vault_path: row.imported_vault_path,
      imported_entity_id: row.imported_entity_id,
      source: source
        ? {
            adapter: source.adapter,
            source_uri: source.source_uri,
            scanned_at: source.scanned_at,
          }
        : null,
      write_path: getActiveWritePath(),
    },
    next_steps,
  });
}

// ---------- import.reject ----------

function handleReject(
  db: IdeasDatabase,
  args: { candidate_id?: string },
): ReturnType<typeof mcpText> {
  if (!args.candidate_id) {
    return mcpError('reject requires `candidate_id`', [
      {
        action: 'import.list',
        example: 'import.list({ state: "pending" })',
        why: 'List candidates to find the id.',
      },
    ]);
  }
  try {
    markCandidateRejected(db, args.candidate_id);
    return mcpText({
      result: {
        candidate_id: args.candidate_id,
        state: 'rejected' as const,
        write_path: getActiveWritePath(),
      },
      next_steps: [
        {
          action: 'import.list',
          example: 'import.list({ state: "pending" })',
          why: 'List remaining pending candidates.',
        },
      ],
    });
  } catch (err) {
    if (err instanceof CandidateStateError) {
      return mcpError(err.message, [
        {
          action: 'import.read',
          example: `import.read({ candidate_id: "${args.candidate_id}" })`,
          why: 'Confirm the candidate state before retrying.',
        },
      ]);
    }
    throw err;
  }
}
