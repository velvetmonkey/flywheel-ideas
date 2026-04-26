#!/usr/bin/env node
/**
 * score-cites-auto.mjs — deterministic cite-rate scorer.
 *
 * Match semantics:
 *
 * Every persona view names ONE `most_vulnerable_assumption` in its
 * metacognitive reflection. That field is the persona's load-bearing
 * pick — if the persona thinks asm-X is the most fragile, asm-X gets
 * named there. The `assumptions_cited` field, by contrast, is just a
 * mechanical echo of all assumptions the persona was given — it 100%s
 * trivially.
 *
 * So we score against `most_vulnerable_assumption`:
 *   - per-persona cite: did this persona name the refuted assumption?
 *   - per-session cite: did at least one persona in the session?
 *   - aggregate cite rate (default = per-session) vs. pre-registered ≥70%.
 *
 * Each decision carries `method: "deterministic-most-vulnerable-match"`.
 *
 * Outputs:
 *   - pilot/last-scores.json — compatible with the interactive scorer.
 *   - stdout — per-mode + per-decision-id breakdown + miss list.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * Mirror of seed-corpus.mjs's loadCorpus — accepts python-2-3 JSON and
 * csv-corpus-shaped JSONL. Returns `{entries: [{decision_id,
 * load_bearing_assumptions: [{id, text, outcome}]}]}`.
 */
function loadCorpus(p) {
  const raw = readFileSync(p, 'utf8');
  const isJsonl = p.endsWith('.jsonl') || looksLikeJsonl(raw);
  if (!isJsonl) return JSON.parse(raw);
  const entries = [];
  const lines = raw.split('\n');
  let rowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    rowIndex++;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (!obj.decision_id || !obj.title) continue;
    const lba = Array.isArray(obj.load_bearing_assumptions)
      ? obj.load_bearing_assumptions
      : Array.isArray(obj.assumptions)
        ? obj.assumptions.filter((a) => a && a.load_bearing !== false)
        : [];
    entries.push({
      decision_id: obj.decision_id,
      title: obj.title,
      load_bearing_assumptions: lba.map((a) => ({
        id: a.id,
        text: a.text,
        outcome: a.outcome,
        outcome_evidence: a.outcome_evidence,
      })),
    });
  }
  return { entries };
}

function looksLikeJsonl(raw) {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length >= 2 && lines.every((l) => l.startsWith('{'));
}

const CORPUS_PATH = parseCorpusFlag(
  process.argv,
  resolve(__dirname, 'pilot-corpus.python-2-3.json'),
);
const SEED_PATH = resolve(__dirname, 'last-seed.json');
const SESSIONS_PATH = resolve(__dirname, 'last-councils.json');
const SCORES_PATH = resolve(__dirname, 'last-scores.json');

const corpus = loadCorpus(CORPUS_PATH);
const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
const sessions = JSON.parse(readFileSync(SESSIONS_PATH, 'utf8'));

const SCORABLE_OUTCOMES = new Set(['refuted', 'partially_refuted']);

const seedByDecisionId = new Map(seed.entries.map((e) => [e.decision_id, e]));
const sessionsByIdea = new Map();
for (const r of sessions.runs ?? []) {
  if (!r.session_id) continue;
  if (!sessionsByIdea.has(r.idea_id)) sessionsByIdea.set(r.idea_id, []);
  sessionsByIdea.get(r.idea_id).push(r);
}

function readNote(vaultRelPath) {
  if (!vaultRelPath) return '';
  const full = join(VAULT, vaultRelPath);
  try {
    return readFileSync(full, 'utf8');
  } catch {
    return '';
  }
}

const decisions = [];
for (const entry of corpus.entries) {
  const seedEntry = seedByDecisionId.get(entry.decision_id);
  if (!seedEntry) continue;
  const ideaSessions = sessionsByIdea.get(seedEntry.idea_id) ?? [];
  for (const asm of entry.load_bearing_assumptions) {
    if (!SCORABLE_OUTCOMES.has(asm.outcome)) continue;
    // Find the db_id the seed phase recorded for this corpus_id.
    const seedAsm = seedEntry.assumptions.find((a) => a.corpus_id === asm.id);
    if (!seedAsm) {
      console.error(`[pilot] no db_id for ${asm.id} — skipping`);
      continue;
    }
    const dbId = seedAsm.db_id;

    for (const s of ideaSessions) {
      const views = (s.view_paths ?? []).map((p) => ({
        path: p,
        content: readNote(p),
      }));

      // Per-persona check: extract Most-vulnerable-assumption line and
      // see whether it names the refuted db_id.
      let personaHits = 0;
      const personaLines = [];
      for (const v of views) {
        const m = v.content.match(/most vulnerable assumption[^\n`]*`([a-z]+-[A-Za-z0-9]+)/i);
        const named = m ? m[1] : null;
        const personaCited = named === dbId;
        if (personaCited) personaHits += 1;
        personaLines.push({ path: v.path, named, cited: personaCited });
      }

      const sessionCited = personaHits > 0;

      decisions.push({
        session_id: s.session_id,
        assumption_corpus_id: asm.id,
        assumption_db_id: dbId,
        decision_id: entry.decision_id,
        session_mode: s.mode,
        session_index: s.index,
        cited: sessionCited,
        persona_hits: personaHits,
        persona_total: views.length,
        persona_lines: personaLines,
        method: 'deterministic-most-vulnerable-match',
        scored_at: new Date().toISOString(),
      });
    }
  }
}

const scores = {
  vault: VAULT,
  scored_at: new Date().toISOString(),
  decisions,
};
writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2));

const total = decisions.length;
const cited = decisions.filter((d) => d.cited).length;
const rate = total === 0 ? 0 : cited / total;

const personaTotal = decisions.reduce((a, d) => a + d.persona_total, 0);
const personaCited = decisions.reduce((a, d) => a + d.persona_hits, 0);
const personaRate = personaTotal === 0 ? 0 : personaCited / personaTotal;

console.log('='.repeat(78));
console.log(`Pilot: cite-rate scoring`);
console.log(`(match: persona's "most_vulnerable_assumption" == refuted db_id)`);
console.log('='.repeat(78));
console.log(`Per-session  (≥1 persona cited the refuted assumption):`);
console.log(`  ${cited}/${total} sessions = ${(rate * 100).toFixed(1)}%`);
console.log(`  GA gate: ${rate >= 0.7 ? 'PASS (≥70%)' : 'FAIL (<70%)'}`);
console.log(`Per-persona  (each persona's most_vulnerable_assumption pick):`);
console.log(`  ${personaCited}/${personaTotal} personas = ${(personaRate * 100).toFixed(1)}%`);

const byMode = {};
const byDecisionId = {};
for (const d of decisions) {
  byMode[d.session_mode] ??= { sessions: 0, cited: 0, ph: 0, pt: 0 };
  byMode[d.session_mode].sessions += 1;
  byMode[d.session_mode].ph += d.persona_hits;
  byMode[d.session_mode].pt += d.persona_total;
  if (d.cited) byMode[d.session_mode].cited += 1;

  byDecisionId[d.decision_id] ??= { sessions: 0, cited: 0, ph: 0, pt: 0 };
  byDecisionId[d.decision_id].sessions += 1;
  byDecisionId[d.decision_id].ph += d.persona_hits;
  byDecisionId[d.decision_id].pt += d.persona_total;
  if (d.cited) byDecisionId[d.decision_id].cited += 1;
}

console.log('\nPer-mode (session / persona):');
for (const m of Object.keys(byMode).sort()) {
  const b = byMode[m];
  console.log(
    `  ${m.padEnd(12)} session ${b.cited}/${b.sessions} (${((b.cited / b.sessions) * 100).toFixed(1)}%)  ` +
      `persona ${b.ph}/${b.pt} (${((b.ph / b.pt) * 100).toFixed(1)}%)`,
  );
}
console.log('\nPer-decision-id (session / persona):');
for (const p of Object.keys(byDecisionId).sort()) {
  const b = byDecisionId[p];
  console.log(
    `  ${p.padEnd(12)} session ${b.cited}/${b.sessions} (${((b.cited / b.sessions) * 100).toFixed(1)}%)  ` +
      `persona ${b.ph}/${b.pt} (${((b.ph / b.pt) * 100).toFixed(1)}%)`,
  );
}
const misses = decisions.filter((x) => !x.cited);
if (misses.length > 0) {
  console.log('\nSession misses (zero personas named refuted asm as most vulnerable):');
  for (const d of misses) {
    const named = d.persona_lines.map((p) => p.named ?? 'null').join(', ');
    console.log(`  ${d.decision_id} #${d.session_index} (${d.session_mode}) — expected ${d.assumption_db_id}; personas named: ${named}`);
  }
}
console.log(`\nFull decisions saved to: ${SCORES_PATH}`);
