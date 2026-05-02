#!/usr/bin/env node
/**
 * Mock flywheel-memory MCP server for memory-bridge tests (M14).
 *
 * Speaks the MCP stdio protocol via the SDK and exposes a single tool,
 * `doctor`, mirroring real flywheel-memory's surface for `action:'config'`.
 * Behaviour is driven by env knobs so a single mock covers every happy/sad
 * path.
 *
 * Env knobs:
 *   MOCK_FM_GET_PAYLOAD            JSON string used as the `get` response text
 *                                  (defaults to empty custom_categories).
 *   MOCK_FM_SET_PAYLOAD            JSON string used as the `set` response text
 *                                  (defaults to echoing the value back).
 *   MOCK_FM_HANG_MS                Sleep this many ms before every tool response.
 *   MOCK_FM_NO_CONTENT             '1' → return `content:[]` (no text item).
 *   MOCK_FM_INVOKE_LOG             Path: append `{tool, args}\n` for every call.
 *   MOCK_FM_ENV_DUMP               Path: write `process.env` to this file at start.
 *   MOCK_FM_PID_FILE               Path: write `process.pid` to this file at start.
 *   MOCK_FM_IGNORE_SIGTERM         '1' → ignore SIGTERM (escalation tests).
 *   MOCK_FM_SUPPORTS_NOTE          '1' → register the `note` tool (v0.2 write-path tests).
 *   MOCK_FM_SUPPORTS_FRONTMATTER   '1' → register `vault_update_frontmatter`.
 *   MOCK_FM_WRITE_ROOT             Abs dir — when set + SUPPORTS_NOTE, writes note content there.
 *   MOCK_FM_NOTE_FORCE_ERROR       '1' → `note` returns success:false.
 *   MOCK_FM_FRONTMATTER_FORCE_ERROR '1' → `vault_update_frontmatter` returns success:false.
 */

import * as fs from 'node:fs';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

if (process.env.MOCK_FM_IGNORE_SIGTERM === '1') {
  process.on('SIGTERM', () => {});
}

if (process.env.MOCK_FM_ENV_DUMP) {
  try {
    fs.writeFileSync(process.env.MOCK_FM_ENV_DUMP, JSON.stringify(process.env));
  } catch {
    /* non-fatal */
  }
}

if (process.env.MOCK_FM_PID_FILE) {
  try {
    fs.writeFileSync(process.env.MOCK_FM_PID_FILE, String(process.pid));
  } catch {
    /* non-fatal */
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const defaultGet = () =>
  JSON.stringify({
    vault_name: 'mock-vault',
    custom_categories: {},
  });

const defaultSet = (value) =>
  JSON.stringify({
    vault_name: 'mock-vault',
    custom_categories: value,
  });

const server = new McpServer({ name: 'mock-flywheel-memory', version: '0.0.0' });

function logInvoke(tool, args) {
  if (process.env.MOCK_FM_INVOKE_LOG) {
    try {
      fs.appendFileSync(
        process.env.MOCK_FM_INVOKE_LOG,
        JSON.stringify({ tool, args }) + '\n',
      );
    } catch {
      /* non-fatal */
    }
  }
}

// ---- note tool (v0.2 write-path migration tests) ----
if (process.env.MOCK_FM_SUPPORTS_NOTE === '1') {
  server.tool(
    'note',
    'Mock flywheel-memory note tool (create only for write-path tests)',
    {
      action: z.enum(['create', 'move', 'rename', 'delete']),
      path: z.string(),
      content: z.string().optional(),
      frontmatter: z.record(z.any()).optional(),
      overwrite: z.boolean().optional(),
      skipWikilinks: z.boolean().optional(),
      suggestOutgoingLinks: z.boolean().optional(),
      maxSuggestions: z.number().optional(),
      destination: z.string().optional(),
      new_name: z.string().optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const hang = Number.parseInt(process.env.MOCK_FM_HANG_MS ?? '0', 10);
      if (hang > 0) await sleep(hang);
      logInvoke('note', args);

      if (process.env.MOCK_FM_NOTE_FORCE_ERROR === '1') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'forced' }) }],
        };
      }

      const writeRoot = process.env.MOCK_FM_WRITE_ROOT;
      if (writeRoot && args.action === 'create') {
        try {
          const full = `${writeRoot}/${args.path}`;
          const dir = full.substring(0, full.lastIndexOf('/'));
          fs.mkdirSync(dir, { recursive: true });
          const fm = args.frontmatter
            ? `---\n${Object.entries(args.frontmatter)
                .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                .join('\n')}\n---\n`
            : '';
          fs.writeFileSync(full, fm + (args.content ?? ''), { flag: 'w' });
        } catch (err) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(err) }) }],
          };
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, path: process.env.MOCK_FM_RETURN_PATH ?? args.path }) }],
      };
    },
  );
}

// ---- vault_update_frontmatter tool (v0.2 write-path migration tests) ----
if (process.env.MOCK_FM_SUPPORTS_FRONTMATTER === '1') {
  server.tool(
    'vault_update_frontmatter',
    'Mock flywheel-memory vault_update_frontmatter (merge-only)',
    {
      path: z.string(),
      frontmatter: z.record(z.any()),
      only_if_missing: z.boolean().optional(),
      dry_run: z.boolean().optional(),
      commit: z.boolean().optional(),
    },
    async (args) => {
      const hang = Number.parseInt(process.env.MOCK_FM_HANG_MS ?? '0', 10);
      if (hang > 0) await sleep(hang);
      logInvoke('vault_update_frontmatter', args);

      if (process.env.MOCK_FM_FRONTMATTER_FORCE_ERROR === '1') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'forced' }) }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: args.path,
              frontmatter: args.frontmatter,
            }),
          },
        ],
      };
    },
  );
}

server.tool(
  'doctor',
  'Mock flywheel-memory doctor tool (action:config only)',
  {
    action: z.enum(['health', 'diagnosis', 'stats', 'pipeline', 'config', 'log']),
    mode: z.enum(['get', 'set']).optional(),
    key: z.string().optional(),
    value: z.unknown().optional(),
  },
  async (args) => {
    const hang = Number.parseInt(process.env.MOCK_FM_HANG_MS ?? '0', 10);
    if (hang > 0) await sleep(hang);

    if (process.env.MOCK_FM_INVOKE_LOG) {
      try {
        fs.appendFileSync(
          process.env.MOCK_FM_INVOKE_LOG,
          JSON.stringify({ tool: 'doctor', args }) + '\n',
        );
      } catch {
        /* non-fatal */
      }
    }

    if (process.env.MOCK_FM_NO_CONTENT === '1') {
      return { content: [] };
    }

    if (args.action !== 'config') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `mock only supports action:config (got ${args.action})` }),
          },
        ],
      };
    }

    if (args.mode === 'set') {
      const text = process.env.MOCK_FM_SET_PAYLOAD ?? defaultSet(args.value);
      return { content: [{ type: 'text', text }] };
    } else {
      // mode is 'get' or unspecified — both treated as get (matches real flywheel-memory)
      const text = process.env.MOCK_FM_GET_PAYLOAD ?? defaultGet();
      return { content: [{ type: 'text', text }] };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
