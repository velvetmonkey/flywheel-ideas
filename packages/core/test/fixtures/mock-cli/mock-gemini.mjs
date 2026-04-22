#!/usr/bin/env node
/**
 * Mock gemini CLI for council-spawn + orchestrator tests.
 *
 * Mirrors real gemini `-p <prompt> -o json` output: single JSON object
 * `{session_id, response, stats}` where `.response` is the model's reply
 * (wrapping our envelope, often verbatim).
 *
 * Env knobs (aligned with mock-claude.mjs / mock-codex.mjs):
 *   FLYWHEEL_TEST_RESULT          — string inserted as .response.
 *   FLYWHEEL_TEST_RESULT_P1       — Pass 1 result. Used if stdin lacks Pass 2 marker.
 *   FLYWHEEL_TEST_RESULT_P2       — Pass 2 result. Used when stdin has marker.
 *   FLYWHEEL_TEST_STDERR          — write to stderr before exiting.
 *   FLYWHEEL_TEST_EXIT            — exit code (default 0).
 *   FLYWHEEL_TEST_EXIT_ON_PASS    — only non-zero exit on this pass.
 *   FLYWHEEL_TEST_HANG_MS         — sleep before exiting.
 *   FLYWHEEL_TEST_HANG_ON_PASS    — only hang on this pass.
 *   FLYWHEEL_TEST_STDOUT_RAW      — write raw string, skip JSON envelope.
 *   FLYWHEEL_TEST_EMIT_EMPTY_RESPONSE — emit {session_id, response: "", stats: {}} (parser edge case).
 *   FLYWHEEL_TEST_EMIT_NULL_RESPONSE  — emit {session_id, response: null, stats: {}}.
 *   FLYWHEEL_TEST_ECHO_STDIN_TO   — file to write received stdin (for assertion).
 *   FLYWHEEL_TEST_IGNORE_SIGTERM  — on SIGTERM, continue running.
 *   FLYWHEEL_TEST_EMIT_KEYCHAIN_WARNING — write the benign Linux libsecret
 *                                   warning to stderr (classifier should strip).
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
    stance: 'Mock gemini Pass 1 stance — deterministic placeholder.',
    confidence: 0.64,
    key_risks: ['Gemini risk A'],
    fragile_insights: ['Gemini fragile insight'],
    assumptions_cited: ['asm-mock-1'],
    evidence: [{ claim: 'gemini claim', source: 'vault://gemini/mock' }],
    metacognitive_reflection: {
      could_be_wrong_if: 'gemini mock reasons',
      most_vulnerable_assumption: 'asm-mock-1',
      confidence_rationale: 'gemini mock rationale',
    },
  });
}

function defaultEnvelopeP2() {
  return JSON.stringify({
    stance: 'Mock gemini Pass 2 revised stance — after self-critique.',
    confidence: 0.48,
    key_risks: ['Gemini risk A (revised)'],
    fragile_insights: ['Gemini fragile insight revised'],
    assumptions_cited: ['asm-mock-1'],
    evidence: [{ claim: 'gemini claim revised', source: 'vault://gemini/mock' }],
    metacognitive_reflection: {
      could_be_wrong_if: 'gemini mock reasons (revised)',
      most_vulnerable_assumption: 'asm-mock-1',
      confidence_rationale: 'gemini rationale after critique',
    },
    self_critique: 'Pass 1 may have over-indexed gemini heuristics.',
  });
}

function detectPass(stdinData) {
  return stdinData.includes('Pass 1 stance was:') ? 2 : 1;
}

function shellResetArtifact() {
  // Simulates the same shell-hook artifact real gemini emits in this env.
  return 'Shell cwd was reset to /home/ben/src\n';
}

function keychainWarning() {
  return [
    'Keychain initialization encountered an error: libsecret-1.so.0: cannot open shared object file: No such file or directory',
    'Using FileKeychain fallback for secure storage.',
    'Loaded cached credentials.',
  ].join('\n') + '\n';
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

  // Benign warnings to stderr (mirrors real gemini on Linux without libsecret)
  if (process.env.FLYWHEEL_TEST_EMIT_KEYCHAIN_WARNING === '1') {
    process.stderr.write(keychainWarning());
  }
  if (process.env.FLYWHEEL_TEST_STDERR) {
    process.stderr.write(process.env.FLYWHEEL_TEST_STDERR);
  }

  if (process.env.FLYWHEEL_TEST_STDOUT_RAW !== undefined) {
    process.stdout.write(process.env.FLYWHEEL_TEST_STDOUT_RAW);
  } else if (process.env.FLYWHEEL_TEST_EMIT_EMPTY_RESPONSE === '1') {
    process.stdout.write(JSON.stringify({ session_id: 'mock', response: '', stats: {} }));
  } else if (process.env.FLYWHEEL_TEST_EMIT_NULL_RESPONSE === '1') {
    process.stdout.write(JSON.stringify({ session_id: 'mock', response: null, stats: {} }));
  } else {
    let responseStr;
    if (process.env.FLYWHEEL_TEST_RESULT) {
      responseStr = process.env.FLYWHEEL_TEST_RESULT;
    } else if (pass === 2) {
      responseStr = process.env.FLYWHEEL_TEST_RESULT_P2 ?? defaultEnvelopeP2();
    } else {
      responseStr = process.env.FLYWHEEL_TEST_RESULT_P1 ?? defaultEnvelopeP1();
    }
    process.stdout.write(
      JSON.stringify({
        session_id: 'mock-session-id',
        response: responseStr,
        stats: {
          models: {
            'gemini-2.5-flash-lite': {
              api: { totalRequests: 1, totalErrors: 0, totalLatencyMs: 100 },
              tokens: { input: 100, prompt: 100, candidates: 20, total: 150, cached: 0 },
            },
          },
        },
      }),
    );
  }

  // Shell cwd reset artifact (mirrors the real environment's hook)
  process.stderr.write(shellResetArtifact());

  const baseExit = Number.parseInt(process.env.FLYWHEEL_TEST_EXIT ?? '0', 10);
  let exitCode = Number.isFinite(baseExit) ? baseExit : 0;
  const exitOnPass = process.env.FLYWHEEL_TEST_EXIT_ON_PASS;
  if (exitOnPass && String(pass) !== exitOnPass) {
    exitCode = 0;
  }
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`mock-gemini fatal: ${err?.message ?? String(err)}\n`);
  process.exit(99);
});
