#!/usr/bin/env node
/**
 * Mock codex CLI for council-spawn + orchestrator tests.
 *
 * Mirrors real codex `exec --json` output: JSONL event stream with the
 * agent's text wrapped in an `item.completed` event's `item.text`.
 *
 * Env knobs (subset of mock-claude's — kept deliberately aligned so the
 * same test setup works for both):
 *   FLYWHEEL_TEST_RESULT          — string inserted as agent_message.text.
 *   FLYWHEEL_TEST_RESULT_P1       — Pass 1 result. Used when stdin lacks P2 marker.
 *   FLYWHEEL_TEST_RESULT_P2       — Pass 2 result. Used when stdin has marker.
 *   FLYWHEEL_TEST_STDERR          — write to stderr before exiting.
 *   FLYWHEEL_TEST_EXIT            — exit code (default 0).
 *   FLYWHEEL_TEST_EXIT_ON_PASS    — only non-zero exit on this pass.
 *   FLYWHEEL_TEST_HANG_MS         — sleep before exiting (timeout tests).
 *   FLYWHEEL_TEST_HANG_ON_PASS    — only hang on this pass.
 *   FLYWHEEL_TEST_STDOUT_RAW      — write raw string and skip normal JSONL output.
 *   FLYWHEEL_TEST_EMIT_TURN_FAILED — emit turn.failed event + no agent_message (parse failure test).
 *   FLYWHEEL_TEST_ECHO_STDIN_TO   — file to write received stdin (for assertion).
 *   FLYWHEEL_TEST_IGNORE_SIGTERM  — on SIGTERM, continue running.
 */

import * as fs from 'node:fs';

const readStdin = () =>
  new Promise((resolve) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buf += chunk;
    });
    process.stdin.on('end', () => resolve(buf));
    setTimeout(() => resolve(buf), 5000).unref();
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function defaultEnvelopeP1() {
  return JSON.stringify({
    stance: 'Mock codex Pass 1 stance — deterministic placeholder.',
    confidence: 0.68,
    key_risks: ['Codex risk A', 'Codex risk B'],
    fragile_insights: ['Codex fragile insight'],
    assumptions_cited: ['asm-mock-1'],
    evidence: [{ claim: 'codex claim', source: 'vault://codex/mock' }],
    metacognitive_reflection: {
      could_be_wrong_if: 'codex mock reasons',
      most_vulnerable_assumption: 'asm-mock-1',
      confidence_rationale: 'codex mock rationale',
    },
  });
}

function defaultEnvelopeP2() {
  return JSON.stringify({
    stance: 'Mock codex Pass 2 revised stance — after self-critique.',
    confidence: 0.5,
    key_risks: ['Codex risk A (revised)'],
    fragile_insights: ['Codex fragile insight revised'],
    assumptions_cited: ['asm-mock-1'],
    evidence: [{ claim: 'codex claim revised', source: 'vault://codex/mock' }],
    metacognitive_reflection: {
      could_be_wrong_if: 'codex mock reasons (revised)',
      most_vulnerable_assumption: 'asm-mock-1',
      confidence_rationale: 'codex rationale after critique',
    },
    self_critique: 'Pass 1 may have over-indexed codex heuristics.',
  });
}

function detectPass(stdinData) {
  return stdinData.includes('Pass 1 stance was:') ? 2 : 1;
}

function jsonlEvents(agentText, opts = {}) {
  const events = [
    { type: 'thread.started', thread_id: 'mock-thread' },
    { type: 'turn.started' },
  ];
  if (opts.emitTurnFailed) {
    events.push({ type: 'turn.failed', error: { message: 'mock turn.failed' } });
  } else {
    events.push({
      type: 'item.completed',
      item: { id: 'item_0', type: 'agent_message', text: agentText },
    });
    events.push({
      type: 'turn.completed',
      usage: { input_tokens: 10, output_tokens: 20 },
    });
  }
  return events.map((e) => JSON.stringify(e)).join('\n');
}

async function main() {
  if (process.env.FLYWHEEL_TEST_IGNORE_SIGTERM === '1') {
    process.on('SIGTERM', () => {});
  }

  const stdinData = await readStdin();
  const pass = detectPass(stdinData);

  if (process.env.FLYWHEEL_TEST_ECHO_STDIN_TO) {
    try {
      fs.writeFileSync(process.env.FLYWHEEL_TEST_ECHO_STDIN_TO, stdinData, 'utf8');
    } catch {
      // non-fatal
    }
  }

  const hangMs = Number.parseInt(process.env.FLYWHEEL_TEST_HANG_MS ?? '0', 10);
  const hangOnPass = process.env.FLYWHEEL_TEST_HANG_ON_PASS;
  if (hangMs > 0 && (!hangOnPass || String(pass) === hangOnPass)) {
    await sleep(hangMs);
  }

  if (process.env.FLYWHEEL_TEST_STDERR) {
    process.stderr.write(process.env.FLYWHEEL_TEST_STDERR);
  }

  if (process.env.FLYWHEEL_TEST_STDOUT_RAW !== undefined) {
    process.stdout.write(process.env.FLYWHEEL_TEST_STDOUT_RAW);
  } else {
    let agentText;
    if (process.env.FLYWHEEL_TEST_RESULT) {
      agentText = process.env.FLYWHEEL_TEST_RESULT;
    } else if (pass === 2) {
      agentText = process.env.FLYWHEEL_TEST_RESULT_P2 ?? defaultEnvelopeP2();
    } else {
      agentText = process.env.FLYWHEEL_TEST_RESULT_P1 ?? defaultEnvelopeP1();
    }
    const emitTurnFailed = process.env.FLYWHEEL_TEST_EMIT_TURN_FAILED === '1';
    process.stdout.write(jsonlEvents(agentText, { emitTurnFailed }));
  }

  const baseExit = Number.parseInt(process.env.FLYWHEEL_TEST_EXIT ?? '0', 10);
  let exitCode = Number.isFinite(baseExit) ? baseExit : 0;
  const exitOnPass = process.env.FLYWHEEL_TEST_EXIT_ON_PASS;
  if (exitOnPass && String(pass) !== exitOnPass) {
    exitCode = 0;
  }
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`mock-codex fatal: ${err?.message ?? String(err)}\n`);
  process.exit(99);
});
