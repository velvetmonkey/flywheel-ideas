import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  approvalsFilePath,
  approvalStatusForResponse,
  grantApprovalFile,
  readPersistedApproval,
  resolveApproval,
  revokeApprovalFile,
} from '../src/index.js';

let vault: string;
const savedEnv = process.env.FLYWHEEL_IDEAS_APPROVE;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-approval-'));
  delete process.env.FLYWHEEL_IDEAS_APPROVE;
});

afterEach(async () => {
  await fsp.rm(vault, { recursive: true, force: true });
  if (savedEnv === undefined) delete process.env.FLYWHEEL_IDEAS_APPROVE;
  else process.env.FLYWHEEL_IDEAS_APPROVE = savedEnv;
});

// ---------------------------------------------------------------------------
// env var path
// ---------------------------------------------------------------------------

describe('resolveApproval — env var', () => {
  it('never → blocked with reason=never_env', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'never';
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'never_env' });
  });

  it('always → granted with source=env, scope=always', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'always';
    const s = await resolveApproval(vault);
    expect(s.granted).toBe(true);
    if (s.granted) {
      expect(s.scope).toBe('always');
      expect(s.source).toBe('env');
      expect(s.binaries).toEqual(['claude', 'codex', 'gemini']);
    }
  });

  it('session → granted with source=env, scope=session', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const s = await resolveApproval(vault);
    expect(s.granted).toBe(true);
    if (s.granted) {
      expect(s.scope).toBe('session');
      expect(s.source).toBe('env');
    }
  });

  it('unrecognized value → treated as unset (no_approval if no file)', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'yolo';
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'no_approval' });
  });

  it('env precedence: never env overrides always file', async () => {
    await grantApprovalFile(vault, 'always');
    process.env.FLYWHEEL_IDEAS_APPROVE = 'never';
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'never_env' });
  });

  it('env precedence: always env overrides never file', async () => {
    await grantApprovalFile(vault, 'never');
    process.env.FLYWHEEL_IDEAS_APPROVE = 'always';
    const s = await resolveApproval(vault);
    expect(s.granted).toBe(true);
  });

  it('case-insensitive env values', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'ALWAYS';
    const s = await resolveApproval(vault);
    expect(s.granted).toBe(true);
  });

  it('trims whitespace in env value', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = '  session  ';
    const s = await resolveApproval(vault);
    expect(s.granted).toBe(true);
    if (s.granted) expect(s.scope).toBe('session');
  });
});

// ---------------------------------------------------------------------------
// file path
// ---------------------------------------------------------------------------

describe('resolveApproval — persistent file', () => {
  it('missing file → no_approval', async () => {
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'no_approval' });
  });

  it('{scope:"always"} → granted with source=persistent', async () => {
    const granted_at = 1714000000000;
    await grantApprovalFile(vault, 'always', { granted_at });
    const s = await resolveApproval(vault);
    expect(s).toMatchObject({
      granted: true,
      scope: 'always',
      source: 'persistent',
      granted_at,
    });
  });

  it('{scope:"never"} → blocked with reason=never_persisted', async () => {
    await grantApprovalFile(vault, 'never');
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'never_persisted' });
  });

  it('file with wrong schema version → no_approval (file ignored)', async () => {
    const file = approvalsFilePath(vault);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(
      file,
      JSON.stringify({ schema: 999, approvals: [{ feature: 'council_dispatch', scope: 'always', granted_at: 1, binaries: [] }] }),
    );
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'no_approval' });
  });

  it('malformed JSON → no_approval (doesn\'t crash)', async () => {
    const file = approvalsFilePath(vault);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, '{ not json');
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'no_approval' });
  });

  it('file with approval for different feature → ignored', async () => {
    const file = approvalsFilePath(vault);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(
      file,
      JSON.stringify({
        schema: 1,
        approvals: [{ feature: 'other_feature', scope: 'always', granted_at: 1, binaries: [] }],
      }),
    );
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'no_approval' });
  });

  it('.flywheel/ directory missing → no_approval without crash', async () => {
    // Vault temp dir exists but .flywheel does not.
    const s = await resolveApproval(vault);
    expect(s).toEqual({ granted: false, reason: 'no_approval' });
  });

  it('binaries snapshot preserved on read', async () => {
    await grantApprovalFile(vault, 'always', {
      binaries: ['claude', 'custom-cli'],
    });
    const p = await readPersistedApproval(vault);
    expect(p?.binaries).toEqual(['claude', 'custom-cli']);
  });
});

// ---------------------------------------------------------------------------
// grant / revoke
// ---------------------------------------------------------------------------

describe('grantApprovalFile / revokeApprovalFile', () => {
  it('creates .flywheel/ directory if missing', async () => {
    await grantApprovalFile(vault, 'always');
    const file = approvalsFilePath(vault);
    await expect(fsp.stat(file)).resolves.toBeDefined();
  });

  it('overwrites existing approval for same feature', async () => {
    await grantApprovalFile(vault, 'always');
    await grantApprovalFile(vault, 'never');
    const p = await readPersistedApproval(vault);
    expect(p?.scope).toBe('never');
  });

  it('revoke deletes file when no approvals remain', async () => {
    await grantApprovalFile(vault, 'always');
    const removed = await revokeApprovalFile(vault);
    expect(removed).toBe(true);
    await expect(fsp.stat(approvalsFilePath(vault))).rejects.toThrow();
  });

  it('revoke returns false when no matching feature', async () => {
    const removed = await revokeApprovalFile(vault);
    expect(removed).toBe(false);
  });

  it('writes atomically (no .tmp files survive)', async () => {
    await grantApprovalFile(vault, 'always');
    const dir = path.dirname(approvalsFilePath(vault));
    const entries = await fsp.readdir(dir);
    const tmpCount = entries.filter((e) => e.endsWith('.tmp')).length;
    expect(tmpCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// approvalStatusForResponse
// ---------------------------------------------------------------------------

describe('approvalStatusForResponse', () => {
  it('shapes a granted state with env+file pointers', async () => {
    process.env.FLYWHEEL_IDEAS_APPROVE = 'session';
    const s = await resolveApproval(vault);
    const payload = approvalStatusForResponse(vault, s);
    expect(payload.granted).toBe(true);
    expect(payload.scope).toBe('session');
    expect(payload.source).toBe('env');
    expect(payload.env_var).toBe('FLYWHEEL_IDEAS_APPROVE');
    expect(payload.approvals_file).toBe(approvalsFilePath(vault));
  });

  it('shapes a blocked state with reason', async () => {
    await grantApprovalFile(vault, 'never');
    const s = await resolveApproval(vault);
    const payload = approvalStatusForResponse(vault, s);
    expect(payload.granted).toBe(false);
    expect(payload.reason).toBe('never_persisted');
    expect(payload.scope).toBeUndefined();
  });

  it('no_approval carries env_var + approvals_file hints', async () => {
    const s = await resolveApproval(vault);
    const payload = approvalStatusForResponse(vault, s);
    expect(payload.granted).toBe(false);
    expect(payload.reason).toBe('no_approval');
    expect(payload.env_var).toBe('FLYWHEEL_IDEAS_APPROVE');
    expect(payload.approvals_file).toContain('.flywheel');
  });
});
