#!/usr/bin/env node
/**
 * run-councils.mjs — fire `council.run` × N per seeded idea.
 *
 * Reads `pilot/last-seed.json` (written by `seed-corpus.mjs`) and runs
 * the protocol-mandated 10 sessions per idea, rotating modes (4
 * pre_mortem + 3 standard + 3 steelman) per
 * `tech/flywheel/flywheel-ideas/pilot-protocol-python-2-3.md`.
 *
 * Real CLI dispatches → real API costs. The script does not gate the
 * spend itself; the user does, by deciding when to invoke it.
 *
 * Resumable: appends to `pilot/last-councils.json`. Re-running skips
 * idea/session-index combinations that already have a session_id
 * recorded. Use `--restart` to wipe and start over.
 *
 * Requires:
 *   - VAULT_PATH (or PILOT_VAULT) pointing at the pilot vault from
 *     seed-corpus.mjs (default `/tmp/flywheel-pilot-python23`).
 *   - At least one of `claude`, `codex`, `gemini` on PATH.
 *   - FLYWHEEL_IDEAS_APPROVE=session (or `always`) — set automatically
 *     by this script.
 *
 * Usage:
 *   node pilot/run-councils.mjs              # run remaining sessions
 *   node pilot/run-councils.mjs --restart    # wipe last-councils.json
 *   node pilot/run-councils.mjs --dry-run    # print plan, do not dispatch
 *   SESSIONS_PER_IDEA=2 node pilot/run-councils.mjs   # smoke test
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VAULT = process.env.PILOT_VAULT || '/tmp/flywheel-pilot-python23';
const BIN =
  process.env.PILOT_BIN ||
  resolve(__dirname, '..', 'packages/mcp-server/dist/index.js');

const SEED_PATH = resolve(__dirname, 'last-seed.json');
const SESSIONS_PATH = resolve(__dirname, 'last-councils.json');
const SESSIONS_PER_IDEA = Number(process.env.SESSIONS_PER_IDEA ?? 10);

// PILOT_CLIS=claude,gemini narrows the dispatcher to a CLI subset
// (matches council.run({clis: [...]} ). Useful when one CLI in the env
// is broken (auth, rate limit, MCP-loading hang) — the protocol's
// 3-CLI ideal becomes a documented partial in last-councils.json.
const PILOT_CLIS = process.env.PILOT_CLIS
  ? process.env.PILOT_CLIS.split(',').map((s) => s.trim()).filter(Boolean)
  : null;

// 4 pre_mortem + 3 standard + 3 steelman, deterministic order so that
// the n-th session of each idea uses the same mode (eases scoring).
const MODE_PLAN = [
  'pre_mortem', 'pre_mortem', 'pre_mortem', 'pre_mortem',
  'standard', 'standard', 'standard',
  'steelman', 'steelman', 'steelman',
];

const flagRestart = process.argv.includes('--restart');
const flagDryRun = process.argv.includes('--dry-run');

if (!existsSync(SEED_PATH)) {
  console.error(`[pilot] no seed file at ${SEED_PATH} — run seed-corpus.mjs first`);
  process.exit(2);
}
const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));

let sessions;
if (flagRestart || !existsSync(SESSIONS_PATH)) {
  sessions = { vault: VAULT, started_at: new Date().toISOString(), runs: [] };
} else {
  sessions = JSON.parse(readFileSync(SESSIONS_PATH, 'utf8'));
  if (!Array.isArray(sessions.runs)) sessions.runs = [];
}

function persistSessions() {
  writeFileSync(SESSIONS_PATH, JSON.stringify(sessions, null, 2));
}

function alreadyRun(ideaId, index) {
  return sessions.runs.some(
    (r) => r.idea_id === ideaId && r.index === index && r.session_id,
  );
}

const planned = [];
for (const entry of seed.entries) {
  for (let i = 0; i < Math.min(SESSIONS_PER_IDEA, MODE_PLAN.length); i++) {
    if (alreadyRun(entry.idea_id, i)) continue;
    planned.push({
      idea_id: entry.idea_id,
      decision_id: entry.decision_id,
      index: i,
      mode: MODE_PLAN[i],
    });
  }
}

console.error(`[pilot] vault: ${VAULT}`);
console.error(`[pilot] ideas: ${seed.entries.length}, sessions/idea: ${SESSIONS_PER_IDEA}`);
console.error(`[pilot] planned: ${planned.length}, already complete: ${sessions.runs.length}`);
if (PILOT_CLIS) console.error(`[pilot] clis filter: ${PILOT_CLIS.join(', ')}`);
if (flagDryRun) {
  for (const p of planned) console.error(`  ${p.decision_id} #${p.index} (${p.mode})`);
  process.exit(0);
}
if (planned.length === 0) {
  console.error('[pilot] nothing to do — all sessions already recorded.');
  process.exit(0);
}

mkdirSync(`${VAULT}/.flywheel`, { recursive: true });

const child = spawn('node', [BIN], {
  env: {
    ...process.env,
    VAULT_PATH: VAULT,
    FLYWHEEL_IDEAS_MEMORY_BRIDGE: '0',
    FLYWHEEL_IDEAS_APPROVE: 'session',
  },
  stdio: ['pipe', 'pipe', 'inherit'],
});

let buf = '';
const pending = new Map();
child.stdout.on('data', (chunk) => {
  buf += chunk.toString('utf8');
  let nl;
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      }
    } catch {}
  }
});

let nextId = 1;
function rpc(method, params, timeoutMs = 600_000) {
  const id = nextId++;
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.get(id).reject(new Error(`timeout: ${method}#${id}`));
        pending.delete(id);
      }
    }, timeoutMs);
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return promise;
}

function unwrap(resp, label) {
  if (resp.error) throw new Error(`${label}: ${JSON.stringify(resp.error)}`);
  const text = resp.result?.content?.[0]?.text;
  if (!text) throw new Error(`${label}: no content`);
  const parsed = JSON.parse(text);
  if (parsed.error) throw new Error(`${label}: ${parsed.error}`);
  return parsed;
}

try {
  const initResp = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'pilot-run-councils', version: '0' },
  });
  console.error(`[pilot] server: ${initResp.result?.serverInfo?.name}@${initResp.result?.serverInfo?.version}`);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const approval = unwrap(
    await rpc('tools/call', {
      name: 'council',
      arguments: { action: 'approval_status' },
    }),
    'approval_status',
  );
  console.error(`[pilot] approval: ${approval.result?.scope ?? 'unknown'} (${approval.result?.source ?? '?'})`);
  if (approval.result?.scope === 'never') {
    throw new Error('approval scope is "never" — unset FLYWHEEL_IDEAS_APPROVE or grant manually');
  }

  for (let i = 0; i < planned.length; i++) {
    const p = planned[i];
    const t0 = Date.now();
    console.error(
      `[pilot] [${i + 1}/${planned.length}] ${p.decision_id} #${p.index} (${p.mode}) → council.run...`,
    );

    let runResult;
    try {
      const resp = await rpc('tools/call', {
        name: 'council',
        arguments: {
          action: 'run',
          id: p.idea_id,
          mode: p.mode,
          depth: 'light',
          confirm: true,
          ...(PILOT_CLIS ? { clis: PILOT_CLIS } : {}),
        },
      });
      runResult = unwrap(resp, 'council.run');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ! failed in ${Date.now() - t0}ms: ${msg}`);
      sessions.runs.push({
        idea_id: p.idea_id,
        decision_id: p.decision_id,
        index: p.index,
        mode: p.mode,
        ran_at: new Date().toISOString(),
        error: msg,
      });
      persistSessions();
      continue;
    }

    const elapsed = Date.now() - t0;
    const out = runResult.result;
    console.error(
      `  ✓ session=${out.session_id} views=${out.views?.length ?? 0} failed_any=${out.failed_any} (${elapsed}ms)`,
    );
    sessions.runs.push({
      idea_id: p.idea_id,
      decision_id: p.decision_id,
      index: p.index,
      mode: p.mode,
      ran_at: new Date().toISOString(),
      session_id: out.session_id,
      synthesis_vault_path: out.synthesis_vault_path,
      view_paths: (out.views ?? []).map((v) => v.content_vault_path).filter(Boolean),
      failed_any: out.failed_any,
      elapsed_ms: elapsed,
    });
    persistSessions();
  }

  console.error(`[pilot] done. ${sessions.runs.length} sessions in ${SESSIONS_PATH}`);
} finally {
  child.kill('SIGTERM');
}
