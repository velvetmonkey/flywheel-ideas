/**
 * cli-version — probe `<cli> --version` and cache the result per session.
 *
 * Wired into `runCouncilCell` to populate `ideas_council_views.model_version`
 * (alpha.5 fix D — was hard-coded `null` despite cli-quirks.md documenting
 * the column should carry the per-cell CLI version). Caching by CLI name
 * avoids per-cell spawn overhead on a 30-cell full council; first cell pays
 * the probe, rest are instant.
 *
 * Test escape: `FLYWHEEL_IDEAS_NO_VERSION_PROBE=1` disables the probe and
 * returns `null` without spawning. Lets unit tests that mock the council
 * CLIs (council-spawn tests, council orchestrator tests) avoid shelling
 * out to the real `claude` / `codex` / `gemini` binaries on every run.
 */

import { spawn } from 'node:child_process';

export type CliName = 'claude' | 'codex' | 'gemini';

const versionCache = new Map<CliName, Promise<string | null>>();

export interface ProbeOptions {
  /** Override the binary path. Defaults to the CLI name (resolved via PATH). */
  binary?: string;
  /** Hard timeout in ms. Defaults to 3000. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 3_000;

export async function probeCliVersion(
  cli: CliName,
  opts: ProbeOptions = {},
): Promise<string | null> {
  if (process.env.FLYWHEEL_IDEAS_NO_VERSION_PROBE === '1') {
    return null;
  }
  const cached = versionCache.get(cli);
  if (cached) return cached;
  const promise = doProbe(cli, opts);
  versionCache.set(cli, promise);
  return promise;
}

async function doProbe(cli: CliName, opts: ProbeOptions): Promise<string | null> {
  const bin = opts.binary ?? cli;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve) => {
    let proc;
    try {
      // stdio: pipe stderr too — some CLI wrappers emit version on stderr
      // and we'd silently get null otherwise.
      proc = spawn(bin, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      resolve(null);
      return;
    }

    let buf = '';
    proc.stdout?.on('data', (c: Buffer) => {
      buf += c.toString('utf8');
    });
    proc.stderr?.on('data', (c: Buffer) => {
      buf += c.toString('utf8');
    });

    // Capture the timer + clear it on success/error so it doesn't blindly
    // fire after a clean resolve and call proc.kill() on a dead pid.
    const t = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* already gone */
      }
      resolve(null);
    }, timeoutMs);
    t.unref();

    const finish = (v: string | null): void => {
      clearTimeout(t);
      resolve(v);
    };

    proc.once('close', () => finish(parseVersion(buf)));
    proc.once('error', () => finish(null));
  });
}

/**
 * Pull a semver-shaped substring from the CLI's --version output.
 *
 * Examples (real CLIs, 2026-04):
 *   claude --version  → "1.0.30 (Claude Code)"
 *   codex --version   → "codex 0.5.2"
 *   gemini --version  → "0.5.0"
 *
 * Anything matching `\d+\.\d+\.\d+(extras)?` qualifies. If multiple
 * matches, take the first — for the formats we care about, the first
 * match is the version proper.
 */
function parseVersion(raw: string): string | null {
  const m = raw.match(/(\d+\.\d+\.\d+(?:[\w.-]*)?)/);
  return m ? m[1] : null;
}

/**
 * Drop the cached probes. Tests should call this in `beforeEach` so
 * a slow / flaky probe in one test doesn't bleed into the next.
 */
export function clearVersionCache(): void {
  versionCache.clear();
}
