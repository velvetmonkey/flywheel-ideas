#!/usr/bin/env node
/**
 * flywheel-ideas — MCP server entrypoint.
 *
 * The local-first falsifiable decision ledger. v0.1 ships the `idea` tool;
 * `assumption`, `council`, and `outcome` land in later milestones. See
 * ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full plan.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  openIdeasDb,
  PACKAGE_VERSION,
  resolveVaultPath,
  runMigrations,
  VaultPathError,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { registerAssumptionTool } from './tools/assumption.js';
import { registerIdeaTool } from './tools/idea.js';

/**
 * Build a configured MCP server bound to a specific vault + database.
 * Exported so integration tests can construct a server against a temp vault
 * without going through the CLI / stdio transport.
 */
export function createConfiguredServer(
  vaultPath: string,
  db: IdeasDatabase,
): McpServer {
  const server = new McpServer({
    name: 'flywheel-ideas',
    version: PACKAGE_VERSION,
  });

  registerIdeaTool(
    server,
    () => vaultPath,
    () => db,
  );
  registerAssumptionTool(
    server,
    () => vaultPath,
    () => db,
  );

  return server;
}

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

  const db = openIdeasDb(vaultPath);
  runMigrations(db);

  const server = createConfiguredServer(vaultPath, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run when executed directly (not when imported by tests / other entry points)
const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? '');

if (isDirectInvocation) {
  main().catch((err) => {
    process.stderr.write(
      `flywheel-ideas fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
