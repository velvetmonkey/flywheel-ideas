#!/usr/bin/env node
/**
 * score-cites.mjs — interactive hand-scorer for the cite-rate pilot.
 *
 * For every (idea, refuted-or-partially-refuted assumption, council
 * session) tuple, presents:
 *   - The assumption text the council should have attacked,
 *   - The synthesis + view note contents from that session,
 *   - A [y]es/[n]o/[s]kip prompt asking whether the council materially
 *     cited the assumption.
 *
 * Aggregates to cite_rate = cited / scorable. ≥70% = v0.2 GA gate
 * passes (per the pre-registered protocol).
 *
 * Reads:
 *   - pilot/pilot-corpus.python-2-3.json (ground truth)
 *   - pilot/last-seed.json (corpus_id → db_id mapping)
 *   - pilot/last-councils.json (session paths from run-councils.mjs)
 * Writes:
 *   - pilot/last-scores.json (per-pair decisions + aggregate cite_rate)
 *
 * Usage:
 *   node pilot/score-cites.mjs                # interactive
 *   node pilot/score-cites.mjs --report-only  # re-print last summary
 *   node pilot/score-cites.mjs --resume       # only score unscored pairs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT = process.env.PILOT_VAULT || '/tmp/flywheel-pilot-python23';

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

const CORPUS_PATH = parseCorpusFlag(
  process.argv,
  resolve(__dirname, 'pilot-corpus.python-2-3.json'),
);
const SEED_PATH = resolve(__dirname, 'last-seed.json');
const SESSIONS_PATH = resolve(__dirname, 'last-councils.json');
const SCORES_PATH = resolve(__dirname, 'last-scores.json');

const flagReportOnly = process.argv.includes('--report-only');
const flagResume = process.argv.includes('--resume');

function loadJson(p, label) {
  if (!existsSync(p)) {
    console.error(`[pilot] missing ${label}: ${p}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

let scores;
if (existsSync(SCORES_PATH)) {
  scores = JSON.parse(readFileSync(SCORES_PATH, 'utf8'));
} else {
  scores = { vault: VAULT, started_at: new Date().toISOString(), decisions: [] };
}

if (flagReportOnly) {
  printAggregate(scores);
  process.exit(0);
}

const corpus = loadJson(CORPUS_PATH, 'corpus');
const seed = loadJson(SEED_PATH, 'seed map');
const sessions = loadJson(SESSIONS_PATH, 'council sessions');

const seedByDecisionId = new Map(seed.entries.map((e) => [e.decision_id, e]));
const sessionsByIdea = new Map();
for (const r of sessions.runs ?? []) {
  if (!r.session_id) continue;
  if (!sessionsByIdea.has(r.idea_id)) sessionsByIdea.set(r.idea_id, []);
  sessionsByIdea.get(r.idea_id).push(r);
}

const SCORABLE_OUTCOMES = new Set(['refuted', 'partially_refuted']);

const pairs = [];
for (const entry of corpus.entries) {
  const seedEntry = seedByDecisionId.get(entry.decision_id);
  if (!seedEntry) continue;
  const ideaSessions = sessionsByIdea.get(seedEntry.idea_id) ?? [];
  if (ideaSessions.length === 0) continue;
  for (const asm of entry.load_bearing_assumptions) {
    if (!SCORABLE_OUTCOMES.has(asm.outcome)) continue;
    for (const s of ideaSessions) {
      pairs.push({
        decision_id: entry.decision_id,
        idea_title: entry.title,
        idea_id: seedEntry.idea_id,
        session_id: s.session_id,
        session_index: s.index,
        session_mode: s.mode,
        assumption_corpus_id: asm.id,
        assumption_text: asm.text,
        outcome_evidence: asm.outcome_evidence,
        synthesis_vault_path: s.synthesis_vault_path,
        view_paths: s.view_paths ?? [],
      });
    }
  }
}

console.error(`[pilot] scorable pairs: ${pairs.length}`);
if (pairs.length === 0) {
  console.error('[pilot] no scorable pairs — did you run run-councils.mjs first?');
  process.exit(1);
}

const decisionKey = (p) => `${p.session_id}|${p.assumption_corpus_id}`;
const alreadyScored = new Set(scores.decisions.map((d) => `${d.session_id}|${d.assumption_corpus_id}`));

const queue = pairs.filter((p) => !flagResume || !alreadyScored.has(decisionKey(p)));
console.error(`[pilot] to score this run: ${queue.length} (skipping ${pairs.length - queue.length})`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function readNote(vaultRelPath) {
  if (!vaultRelPath) return null;
  const full = join(VAULT, vaultRelPath);
  try {
    return readFileSync(full, 'utf8');
  } catch {
    return null;
  }
}

function snippet(text, maxChars = 4000) {
  if (!text) return '(no content)';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + `\n…[truncated ${text.length - maxChars} chars]`;
}

try {
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    console.log('\n' + '='.repeat(78));
    console.log(`[${i + 1}/${queue.length}] ${p.decision_id} session #${p.session_index} (${p.session_mode})`);
    console.log(`Idea: ${p.idea_title}`);
    console.log(`Assumption to look for (corpus_id=${p.assumption_corpus_id}):`);
    console.log(`  "${p.assumption_text}"`);
    console.log(`Why it matters (NOT shown to council):`);
    console.log(`  ${p.outcome_evidence}`);
    console.log('-'.repeat(78));
    const synthesis = readNote(p.synthesis_vault_path);
    console.log('SYNTHESIS:');
    console.log(snippet(synthesis));
    if (p.view_paths.length > 0) {
      console.log('-'.repeat(78));
      console.log(`Per-view notes: ${p.view_paths.length}`);
      for (let j = 0; j < p.view_paths.length; j++) {
        console.log(`  [${j + 1}] ${p.view_paths[j]}`);
      }
    }
    console.log('-'.repeat(78));

    let answer;
    while (!answer) {
      const raw = (await rl.question(
        'Did the council materially cite this assumption? [y]es / [n]o / [v]iew N / [s]kip / [q]uit: ',
      )).trim().toLowerCase();
      if (raw === 'y' || raw === 'n' || raw === 's' || raw === 'q') {
        answer = raw;
      } else if (raw.startsWith('v')) {
        const n = Number(raw.slice(1).trim()) || 1;
        const path = p.view_paths[n - 1];
        if (path) {
          console.log('-'.repeat(78));
          console.log(`VIEW ${n}:`);
          console.log(snippet(readNote(path)));
          console.log('-'.repeat(78));
        } else {
          console.log(`(no view ${n})`);
        }
      } else {
        console.log("Enter y / n / s / q (or v1, v2, … to peek at a view note)");
      }
    }

    if (answer === 'q') break;
    if (answer === 's') continue;

    const decision = {
      session_id: p.session_id,
      assumption_corpus_id: p.assumption_corpus_id,
      decision_id: p.decision_id,
      session_mode: p.session_mode,
      session_index: p.session_index,
      cited: answer === 'y',
      scored_at: new Date().toISOString(),
    };
    // Replace prior decision for the same key, if any.
    scores.decisions = scores.decisions.filter(
      (d) => !(d.session_id === decision.session_id && d.assumption_corpus_id === decision.assumption_corpus_id),
    );
    scores.decisions.push(decision);
    writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2));
  }
} finally {
  rl.close();
}

printAggregate(scores);

function printAggregate(s) {
  const total = s.decisions.length;
  const cited = s.decisions.filter((d) => d.cited).length;
  const rate = total === 0 ? 0 : cited / total;
  console.log('\n' + '='.repeat(78));
  console.log(`Decisions: ${total}`);
  console.log(`Cited:     ${cited}`);
  console.log(`Cite rate: ${(rate * 100).toFixed(1)}%`);
  console.log(`GA gate:   ${rate >= 0.7 ? 'PASS (≥70%)' : 'FAIL (<70%)'}`);
  if (total === 0) return;
  const byMode = {};
  for (const d of s.decisions) {
    if (!byMode[d.session_mode]) byMode[d.session_mode] = { total: 0, cited: 0 };
    byMode[d.session_mode].total += 1;
    if (d.cited) byMode[d.session_mode].cited += 1;
  }
  console.log('Per-mode:');
  for (const m of Object.keys(byMode).sort()) {
    const { total: t, cited: c } = byMode[m];
    console.log(`  ${m.padEnd(10)} ${c}/${t} (${((c / t) * 100).toFixed(1)}%)`);
  }
}
