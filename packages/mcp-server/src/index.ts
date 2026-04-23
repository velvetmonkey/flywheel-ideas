#!/usr/bin/env node
/**
 * flywheel-ideas — MCP server entrypoint.
 *
 * The local-first falsifiable decision ledger. v0.1 ships the `idea` tool;
 * `assumption`, `council`, and `outcome` land in later milestones. See
 * ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full plan.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  openIdeasDb,
  PACKAGE_VERSION,
  registerCustomCategories,
  resolveVaultPath,
  runMigrations,
  VaultPathError,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { registerAssumptionTool } from './tools/assumption.js';
import { registerCouncilTool } from './tools/council.js';
import { registerIdeaTool } from './tools/idea.js';
import { registerOutcomeTool } from './tools/outcome.js';

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
  registerCouncilTool(
    server,
    () => vaultPath,
    () => db,
  );
  registerOutcomeTool(
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

  // M14 — best-effort flywheel-memory custom-category registration. Bounded
  // by a 15s default timeout; failure is non-fatal and surfaces a one-line
  // stderr warning so users notice the missing-binary case.
  const reg = await registerCustomCategories(vaultPath);
  if (reg.status === 'skipped') {
    const detail = reg.detail ? `: ${reg.detail}` : '';
    process.stderr.write(
      `flywheel-ideas: memory-bridge skipped (${reg.reason}${detail}). ` +
        `Ideas notes will not be boosted in flywheel-memory wikilink scoring. ` +
        `Install @velvetmonkey/flywheel-memory or set FLYWHEEL_MEMORY_BIN to enable.\n`,
    );
  }

  const server = createConfiguredServer(vaultPath, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run when executed directly (not when imported by tests / other entry points).
// Robust against PATH-symlinked global installs and `npx`: compare argv[1]'s
// realpath to the module's realpath. (The earlier startsWith/endsWith
// heuristic failed silently when invoked via the bin shim — alpha.2 dogfood
// found this. Alpha.4 also realpaths the module side after the codebase
// roundtable surfaced a Windows drive-letter case-mismatch risk.)
const isDirectInvocation = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  let modulePath: string;
  try {
    modulePath = fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
  if (argv1 === modulePath) return true;
  let realModulePath: string;
  try {
    realModulePath = realpathSync(modulePath);
  } catch {
    realModulePath = modulePath;
  }
  try {
    if (realpathSync(argv1) === realModulePath) return true;
  } catch {
    // ignore — fall through to false
  }
  return false;
})();

if (isDirectInvocation) {
  main().catch((err) => {
    process.stderr.write(
      `flywheel-ideas fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
