#!/usr/bin/env node
/**
 * scan-peps.mjs — drive import.scan against the fixture PEP corpus.
 *
 * Spawns the published @velvetmonkey/flywheel-ideas binary, JSON-RPCs over
 * stdio, and dumps the candidate sidecars produced by the
 * github-structured-docs adapter.
 *
 * Stays out of the user's vault — uses an isolated PILOT_VAULT path
 * (default /tmp/flywheel-pilot-python23) which the script creates.
 *
 * Reads from `pilot/fixtures/python-2-3-peps/` rather than live GitHub:
 * the alpha.6 adapter does not propagate `scan_config.filter` through to
 * the github-structured-docs scanner, so filtered network scans degrade
 * to "fetch every PEP, ~35s of stagger." Fixtures keep the pilot fast
 * and reproducible. Refresh the fixtures with the curl loop in
 * `pilot/README.md` if you want a newer snapshot.
 *
 * Usage:
 *   node pilot/scan-peps.mjs               # scan all fixture PEPs
 *   node pilot/scan-peps.mjs <regex>       # filter fixture filenames
 *   PILOT_VAULT=/path node pilot/scan-peps.mjs
 */

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VAULT = process.env.PILOT_VAULT || '/tmp/flywheel-pilot-python23';
const BIN =
  process.env.PILOT_BIN ||
  resolve(__dirname, '..', 'packages/mcp-server/dist/index.js');
const FIXTURE_DIR = resolve(__dirname, 'fixtures/python-2-3-peps');

const corpusPath = resolve(__dirname, 'pilot-corpus.python-2-3.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const corpusPeps = new Set(corpus.entries.map((e) => e.decision_pep));
for (const e of corpus.entries) {
  for (const a of e.load_bearing_assumptions) {
    for (const ref of a.outcome_pep_refs ?? []) corpusPeps.add(ref);
  }
}

const filter = process.argv[2];

mkdirSync(`${VAULT}/.flywheel`, { recursive: true });

console.error(`[pilot] vault:    ${VAULT}`);
console.error(`[pilot] bin:      ${BIN}`);
console.error(`[pilot] fixtures: ${FIXTURE_DIR}`);
if (filter) console.error(`[pilot] filter:   ${filter}`);
console.error(`[pilot] corpus:   ${[...corpusPeps].sort().join(', ')}`);

const child = spawn('node', [BIN], {
  env: {
    ...process.env,
    VAULT_PATH: VAULT,
    FLYWHEEL_IDEAS_MEMORY_BRIDGE: '0',
    FLYWHEEL_IDEAS_APPROVE: 'never',
  },
  stdio: ['pipe', 'pipe', 'inherit'],
});

let stdoutBuf = '';
const responses = new Map();

child.stdout.on('data', (chunk) => {
  stdoutBuf += chunk.toString('utf8');
  let nl;
  while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
    const line = stdoutBuf.slice(0, nl).trim();
    stdoutBuf = stdoutBuf.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && responses.has(msg.id)) {
        responses.get(msg.id).resolve(msg);
        responses.delete(msg.id);
      }
    } catch (err) {
      console.error('[pilot] non-JSON line:', line);
    }
  }
});

let nextId = 1;
function call(method, params) {
  const id = nextId++;
  const promise = new Promise((resolve, reject) => {
    responses.set(id, { resolve, reject });
    setTimeout(() => {
      if (responses.has(id)) {
        responses.get(id).reject(new Error(`timeout: ${method}#${id}`));
        responses.delete(id);
      }
    }, 60_000);
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return promise;
}

try {
  const initResp = await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'pilot-scan', version: '0' },
  });
  console.error(
    `[pilot] server: ${initResp.result?.serverInfo?.name}@${initResp.result?.serverInfo?.version}`,
  );

  child.stdin.write(
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n',
  );

  const t0 = Date.now();
  const scanResp = await call('tools/call', {
    name: 'import',
    arguments: {
      action: 'scan',
      adapter: 'github-structured-docs',
      source: `fixture://${FIXTURE_DIR}`,
      ...(filter ? { scan_config: { filter } } : {}),
    },
  });
  const elapsed = Date.now() - t0;

  if (scanResp.error) {
    console.error('[pilot] error:', JSON.stringify(scanResp.error, null, 2));
    process.exit(1);
  }

  const text = scanResp.result?.content?.[0]?.text;
  const payload = text ? JSON.parse(text) : null;

  console.error(`[pilot] scan finished in ${elapsed}ms`);
  console.log(JSON.stringify(payload, null, 2));
} finally {
  child.kill('SIGTERM');
}
