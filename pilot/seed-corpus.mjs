#!/usr/bin/env node
/**
 * seed-corpus.mjs — create a pilot corpus in an isolated vault.
 *
 * For each entry in the corpus JSON (default
 * `pilot/pilot-corpus.python-2-3.json`, override with `--corpus <path>`):
 *   1. idea.create — title from corpus entry
 *   2. assumption.declare — one per load_bearing_assumption
 *      (load_bearing: true; text uses the history-grounded wording)
 *
 * Outcomes are NOT logged here. They're the ground truth for scoring
 * the council's cite rate AFTER councils run — logging them up front
 * would tip the scale (the council prompt would see "this assumption
 * was already refuted" and trivially cite it).
 *
 * The mapping from corpus.id → real DB asm_id is written to
 * `pilot/last-seed.json` so the scoring script knows which asm_ids to
 * look for in the council critiques.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VAULT = process.env.PILOT_VAULT || '/tmp/flywheel-pilot-python23';
const BIN =
  process.env.PILOT_BIN ||
  resolve(__dirname, '..', 'packages/mcp-server/dist/index.js');

function parseCorpusFlag(argv, defaultPath) {
  const idx = argv.indexOf('--corpus');
  if (idx === -1) return defaultPath;
  const v = argv[idx + 1];
  if (!v) {
    console.error('[pilot] --corpus requires a path argument');
    process.exit(2);
  }
  return resolve(process.cwd(), v);
}

const corpusPath = parseCorpusFlag(
  process.argv,
  resolve(__dirname, 'pilot-corpus.python-2-3.json'),
);
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));

mkdirSync(`${VAULT}/.flywheel`, { recursive: true });

console.error(`[pilot] vault: ${VAULT}`);
console.error(`[pilot] corpus: ${corpusPath}${corpus.$domain ? ` (domain: ${corpus.$domain})` : ''}`);
console.error(`[pilot] entries to seed: ${corpus.entries.length}`);

const child = spawn('node', [BIN], {
  env: {
    ...process.env,
    VAULT_PATH: VAULT,
    FLYWHEEL_IDEAS_MEMORY_BRIDGE: '0',
    FLYWHEEL_IDEAS_APPROVE: 'never',
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
    } catch {
      console.error('[pilot] non-JSON:', line);
    }
  }
});

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.get(id).reject(new Error(`timeout: ${method}#${id}`));
        pending.delete(id);
      }
    }, 30_000);
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return promise;
}

function unwrap(resp, label) {
  if (resp.error) throw new Error(`${label} error: ${JSON.stringify(resp.error)}`);
  const text = resp.result?.content?.[0]?.text;
  if (!text) throw new Error(`${label}: no content text`);
  return JSON.parse(text);
}

async function callTool(name, args) {
  const resp = await rpc('tools/call', { name, arguments: args });
  return unwrap(resp, `${name}.${args.action}`);
}

try {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'pilot-seed', version: '0' },
  });
  console.error(`[pilot] server: ${init.result?.serverInfo?.name}@${init.result?.serverInfo?.version}`);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const seedResults = [];

  for (const entry of corpus.entries) {
    const ideaResult = await callTool('idea', {
      action: 'create',
      title: `${entry.decision_id} — ${entry.title}`,
      body: [
        `Decision-ID: ${entry.decision_id}`,
        `Status (at decision time): ${entry.status ?? '(unknown)'}`,
        '',
        `This idea represents the historical decision in ${entry.decision_id}.`,
        'Load-bearing assumptions are declared separately and reflect the',
        `wording from the corpus. Outcomes are stored in the corpus file`,
        `(NOT logged on the idea), to be used as ground truth when scoring`,
        'council cite rate.',
      ].join('\n'),
    });
    const ideaId = ideaResult.result?.id;
    if (!ideaId) throw new Error(`no idea id from create: ${JSON.stringify(ideaResult)}`);
    console.error(`[pilot] created ${entry.decision_id}: ${ideaId}`);

    const assumptionMap = [];
    for (const asm of entry.load_bearing_assumptions) {
      const asmResult = await callTool('assumption', {
        action: 'declare',
        idea_id: ideaId,
        text: asm.text,
        load_bearing: true,
      });
      const asmId = asmResult.result?.id;
      if (!asmId) throw new Error(`no assumption id: ${JSON.stringify(asmResult)}`);
      console.error(`  declared ${asm.id} → ${asmId}`);
      assumptionMap.push({
        corpus_id: asm.id,
        db_id: asmId,
        outcome: asm.outcome,
        text: asm.text,
      });
    }

    seedResults.push({
      decision_id: entry.decision_id,
      idea_id: ideaId,
      assumptions: assumptionMap,
    });
  }

  const outPath = resolve(__dirname, 'last-seed.json');
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        vault: VAULT,
        corpus: corpusPath,
        domain: corpus.$domain ?? null,
        seeded_at: new Date().toISOString(),
        entries: seedResults,
      },
      null,
      2,
    ),
  );
  console.error(`[pilot] seed map → ${outPath}`);
  console.log(JSON.stringify({ ok: true, count: seedResults.length, vault: VAULT, corpus: corpusPath }, null, 2));
} finally {
  child.kill('SIGTERM');
}
