#!/usr/bin/env node
/**
 * flywheel-ideas — MCP server entrypoint.
 *
 * The local-first falsifiable decision ledger. Tool registration lands
 * incrementally across milestones M4 (idea), M5 (assumption), M6-M10 (council),
 * M12 (outcome). See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full
 * plan.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  PACKAGE_VERSION,
  resolveVaultPath,
  VaultPathError,
} from '@velvetmonkey/flywheel-ideas-core';

async function main(): Promise<void> {
  let vaultPath: string;
  try {
    ({ vaultPath } = resolveVaultPath());
  } catch (err) {
    if (err instanceof VaultPathError) {
      process.stderr.write(`flywheel-ideas: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  const server = new McpServer({
    name: 'flywheel-ideas',
    version: PACKAGE_VERSION,
  });

  // Tool registration lands in milestones M4 (idea), M5 (assumption), M6-M10 (council), M12 (outcome).
  void vaultPath;

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(
    `flywheel-ideas fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});
