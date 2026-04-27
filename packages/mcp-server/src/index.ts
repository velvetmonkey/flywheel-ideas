#!/usr/bin/env node
/**
 * flywheel-ideas — MCP server entrypoint.
 *
 * The local-first falsifiable decision ledger. Five tools — `idea`,
 * `assumption`, `council`, `outcome`, `import` — backed by a required
 * flywheel-memory peer that handles vault writes, retrieval, and the
 * `ideas_*` custom-category registration.
 *
 * v0.4.0 — flywheel-memory is a required peer dependency. The server
 * hard-fails at boot via `FlywheelMemoryRequiredError` when the bridge
 * isn't reachable. Tests bypass the gate via `FLYWHEEL_IDEAS_TEST_MODE=1`
 * and inject a write tier with `__setWritePathForTests()`.
 *
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full plan.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  FlywheelMemoryRequiredError,
  getProbeOutcome,
  isTestMode,
  openIdeasDb,
  PACKAGE_VERSION,
  probeWritePath,
  registerCustomCategories,
  resolveVaultPath,
  runMigrations,
  VaultPathError,
  type IdeasDatabase,
  type RequiredBridgeFailure,
} from '@velvetmonkey/flywheel-ideas-core';
import { registerAssumptionTool } from './tools/assumption.js';
import { registerCouncilTool } from './tools/council.js';
import { registerIdeaTool } from './tools/idea.js';
import { registerImportTool } from './tools/import.js';
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
  registerImportTool(
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

  // v0.4.0 — flywheel-memory is required. Bridge probes hard-fail unless
  // FLYWHEEL_IDEAS_TEST_MODE=1 is set, in which case tests inject a tier
  // via `__setWritePathForTests()` and skip the spawn path entirely.
  if (!isTestMode()) {
    const reg = await registerCustomCategories(vaultPath);
    if (reg.status === 'skipped') {
      throw new FlywheelMemoryRequiredError({
        kind: reg.reason,
        binary: reg.binary,
        timeoutMs: reg.timeoutMs,
        detail: reg.detail,
      });
    }

    await probeWritePath(vaultPath);
    const probe = getProbeOutcome();
    if (probe.active !== 'mcp-subprocess') {
      // Probe always sets binary + timeoutMs after running; subprocess_ok /
      // not_probed cannot reach this branch (active === 'mcp-subprocess' or
      // probe didn't run, both excluded).
      const failure: RequiredBridgeFailure = {
        kind:
          probe.reason === 'subprocess_ok' || probe.reason === 'not_probed'
            ? 'spawn_failed'
            : probe.reason,
        binary: probe.binary ?? 'flywheel-memory',
        timeoutMs: probe.timeoutMs,
        detail: probe.detail,
      };
      throw new FlywheelMemoryRequiredError(failure);
    }
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
