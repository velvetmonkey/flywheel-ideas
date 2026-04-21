import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveVaultPath, VaultPathError } from '../src/index.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-vp-'));
});

afterEach(async () => {
  await fsp.rm(tempDir, { recursive: true, force: true });
});

describe('resolveVaultPath', () => {
  it('throws when VAULT_PATH is unset', () => {
    expect(() => resolveVaultPath({ env: {} })).toThrow(VaultPathError);
    expect(() => resolveVaultPath({ env: {} })).toThrow(/VAULT_PATH/);
  });

  it('throws when VAULT_PATH is empty string', () => {
    expect(() => resolveVaultPath({ env: { VAULT_PATH: '' } })).toThrow(VaultPathError);
  });

  it('throws when vault directory does not exist', () => {
    expect(() =>
      resolveVaultPath({ env: { VAULT_PATH: '/tmp/definitely-not-a-real-vault-12345' } }),
    ).toThrow(/does not exist/);
  });

  it('throws when .flywheel/ is missing (flywheel-memory not initialized)', () => {
    expect(() => resolveVaultPath({ env: { VAULT_PATH: tempDir } })).toThrow(
      /flywheel-memory/,
    );
  });

  it('returns resolved paths when vault + .flywheel exist', async () => {
    await fsp.mkdir(path.join(tempDir, '.flywheel'));
    const r = resolveVaultPath({ env: { VAULT_PATH: tempDir } });
    expect(r.vaultPath).toBe(path.resolve(tempDir));
    expect(r.flywheelDir).toBe(path.join(path.resolve(tempDir), '.flywheel'));
  });
});
