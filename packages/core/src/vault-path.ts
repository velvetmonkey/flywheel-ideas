/**
 * VAULT_PATH resolution and install-time validation.
 *
 * All filesystem operations in flywheel-ideas resolve paths relative to the
 * user's vault, never a hardcoded location. Callers pass the resolved vault
 * path down to every write/read primitive.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FLYWHEEL_DIR } from './schema.js';

export interface VaultResolution {
  vaultPath: string;
  flywheelDir: string;
}

export class VaultPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultPathError';
  }
}

/**
 * Resolve and validate the vault path.
 *
 * @throws VaultPathError if the env var is missing, the path doesn't exist, or
 *         the `.flywheel/` directory is absent (flywheel-memory not initialized).
 */
export function resolveVaultPath(
  options: { env?: NodeJS.ProcessEnv } = {},
): VaultResolution {
  const env = options.env ?? process.env;
  const raw = env.VAULT_PATH;

  if (!raw || raw.trim() === '') {
    throw new VaultPathError(
      'VAULT_PATH environment variable is required. ' +
        'Point it at an Obsidian vault that has flywheel-memory initialized.',
    );
  }

  const vaultPath = path.resolve(raw);
  if (!fs.existsSync(vaultPath)) {
    throw new VaultPathError(`VAULT_PATH "${vaultPath}" does not exist.`);
  }

  const flywheelDir = path.join(vaultPath, FLYWHEEL_DIR);
  if (!fs.existsSync(flywheelDir)) {
    throw new VaultPathError(
      `"${flywheelDir}" does not exist. ` +
        'Initialize flywheel-memory in this vault first — see https://github.com/velvetmonkey/flywheel-memory.',
    );
  }

  return { vaultPath, flywheelDir };
}
