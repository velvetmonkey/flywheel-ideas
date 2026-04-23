#!/usr/bin/env node
/**
 * Mock flywheel-memory MCP server for memory-bridge tests (M14).
 *
 * Speaks the MCP stdio protocol via the SDK and exposes a single tool,
 * `flywheel_config`. Behaviour is driven by env knobs so a single mock covers
 * every happy/sad path.
 *
 * Env knobs:
 *   MOCK_FM_GET_PAYLOAD       JSON string used as the `get` response text
 *                             (defaults to empty custom_categories).
 *   MOCK_FM_SET_PAYLOAD       JSON string used as the `set` response text
 *                             (defaults to echoing the value back).
 *   MOCK_FM_HANG_MS           Sleep this many ms before every tool response.
 *   MOCK_FM_NO_CONTENT        '1' → return `content:[]` (no text item).
 *   MOCK_FM_INVOKE_LOG        Path: append `{tool, args}\n` for every call.
 *   MOCK_FM_ENV_DUMP          Path: write `process.env` to this file at start.
 *   MOCK_FM_PID_FILE          Path: write `process.pid` to this file at start.
 *   MOCK_FM_IGNORE_SIGTERM    '1' → ignore SIGTERM (escalation tests).
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

server.tool(
  'flywheel_config',
  'Mock flywheel-memory config tool',
  {
    mode: z.enum(['get', 'set']),
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
          JSON.stringify({ tool: 'flywheel_config', args }) + '\n',
        );
      } catch {
        /* non-fatal */
      }
    }

    if (process.env.MOCK_FM_NO_CONTENT === '1') {
      return { content: [] };
    }

    if (args.mode === 'get') {
      const text = process.env.MOCK_FM_GET_PAYLOAD ?? defaultGet();
      return { content: [{ type: 'text', text }] };
    } else {
      const text = process.env.MOCK_FM_SET_PAYLOAD ?? defaultSet(args.value);
      return { content: [{ type: 'text', text }] };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
