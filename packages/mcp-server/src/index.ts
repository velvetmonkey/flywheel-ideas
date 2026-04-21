#!/usr/bin/env node
/**
 * flywheel-ideas — MCP server entrypoint.
 *
 * The local-first falsifiable decision ledger. Scaffolded at M1.
 * Tool registration (idea, assumption, council, outcome) lands in later milestones.
 *
 * See ~/obsidian/Ben/tech/flywheel/flywheel-ideas/ for the full plan.
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PACKAGE_VERSION } from '@velvetmonkey/flywheel-ideas-core';

function resolveVaultPath(): string {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    process.stderr.write(
      'flywheel-ideas: VAULT_PATH environment variable is required.\n' +
        'Point it at an Obsidian vault that has flywheel-memory initialized.\n',
    );
    process.exit(1);
  }
  const abs = resolve(vaultPath);
  if (!existsSync(abs)) {
    process.stderr.write(`flywheel-ideas: VAULT_PATH "${abs}" does not exist.\n`);
    process.exit(1);
  }
  const flywheelDir = join(abs, '.flywheel');
  if (!existsSync(flywheelDir)) {
    process.stderr.write(
      `flywheel-ideas: "${flywheelDir}" does not exist.\n` +
        'Initialize flywheel-memory in this vault first — see https://github.com/velvetmonkey/flywheel-memory.\n',
    );
    process.exit(1);
  }
  return abs;
}

async function main(): Promise<void> {
  const vaultPath = resolveVaultPath();

  const server = new McpServer({
    name: 'flywheel-ideas',
    version: PACKAGE_VERSION,
  });

  // Tool registration lands in milestones M4 (idea), M5 (assumption), M6-M10 (council), M12 (outcome).
  // v0.1 scaffold only — no tools yet.
  void vaultPath; // will be used once tools are wired

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`flywheel-ideas fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
