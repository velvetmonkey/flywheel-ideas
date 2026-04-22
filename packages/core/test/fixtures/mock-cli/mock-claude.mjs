#!/usr/bin/env node
/**
 * Mock claude CLI for council-spawn + orchestrator tests.
 *
 * Reads stdin, emits a JSON array matching claude's --output-format=json shape,
 * then exits. Behaviour is controlled by environment variables so a single mock
 * handles every happy/sad path.
 *
 * Env knobs:
 *   FLYWHEEL_TEST_RESULT          — string inserted as the terminal `result` field.
 *                                   Default: a valid JSON envelope string.
 *   FLYWHEEL_TEST_RESULT_FILE     — alternative to above: read `result` from file.
 *   FLYWHEEL_TEST_STDERR          — write this to stderr before exiting.
 *   FLYWHEEL_TEST_EXIT            — exit with this numeric code (default 0).
 *   FLYWHEEL_TEST_HANG_MS         — sleep this many ms before exiting (simulates slow cell / timeout).
 *   FLYWHEEL_TEST_STDOUT_RAW      — skip normal output, write this raw string to stdout.
 *   FLYWHEEL_TEST_STDOUT_BYTES    — write this many bytes of padding to stdout first (maxBuffer tests).
 *   FLYWHEEL_TEST_ECHO_STDIN_TO   — file to write the received stdin to (for assertion).
 *   FLYWHEEL_TEST_IGNORE_SIGTERM  — on SIGTERM, continue running (tests SIGKILL escalation on Linux).
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
    // If stdin never ends (test didn't close), resolve on timeout so we don't hang the test.
    setTimeout(() => resolve(buf), 5000).unref();
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function defaultEnvelope() {
  return JSON.stringify({
    stance: 'Mock stance from mock-claude. This is a deterministic placeholder that satisfies the envelope schema.',
    confidence: 0.72,
    key_risks: ['Mock risk 1', 'Mock risk 2'],
    fragile_insights: ['Mock fragile insight'],
    assumptions_cited: ['asm-mock-1'],
    evidence: [{ claim: 'mock claim', source: 'vault://mock/path' }],
    metacognitive_reflection: {
      could_be_wrong_if: 'mock reasons',
      most_vulnerable_assumption: 'asm-mock-1',
      confidence_rationale: 'mock confidence rationale',
    },
  });
}

async function main() {
  if (process.env.FLYWHEEL_TEST_IGNORE_SIGTERM === '1') {
    process.on('SIGTERM', () => {
      // Intentionally ignore — exercises the SIGKILL escalation path.
    });
  }

  const stdinData = await readStdin();

  if (process.env.FLYWHEEL_TEST_ECHO_STDIN_TO) {
    try {
      fs.writeFileSync(process.env.FLYWHEEL_TEST_ECHO_STDIN_TO, stdinData, 'utf8');
    } catch {
      // non-fatal for the mock
    }
  }

  const hangMs = Number.parseInt(process.env.FLYWHEEL_TEST_HANG_MS ?? '0', 10);
  if (hangMs > 0) {
    await sleep(hangMs);
  }

  if (process.env.FLYWHEEL_TEST_STDERR) {
    process.stderr.write(process.env.FLYWHEEL_TEST_STDERR);
  }

  if (process.env.FLYWHEEL_TEST_STDOUT_RAW !== undefined) {
    process.stdout.write(process.env.FLYWHEEL_TEST_STDOUT_RAW);
  } else {
    const pad = Number.parseInt(process.env.FLYWHEEL_TEST_STDOUT_BYTES ?? '0', 10);
    if (pad > 0) {
      process.stdout.write('x'.repeat(pad));
    }

    let resultStr;
    if (process.env.FLYWHEEL_TEST_RESULT_FILE) {
      resultStr = fs.readFileSync(process.env.FLYWHEEL_TEST_RESULT_FILE, 'utf8');
    } else {
      resultStr = process.env.FLYWHEEL_TEST_RESULT ?? defaultEnvelope();
    }

    const events = [
      { type: 'system', subtype: 'init', session_id: 'mock-session' },
      { type: 'result', subtype: 'success', result: resultStr },
    ];
    process.stdout.write(JSON.stringify(events));
  }

  const exitCode = Number.parseInt(process.env.FLYWHEEL_TEST_EXIT ?? '0', 10);
  process.exit(Number.isFinite(exitCode) ? exitCode : 0);
}

main().catch((err) => {
  process.stderr.write(`mock-claude fatal: ${err?.message ?? String(err)}\n`);
  process.exit(99);
});
