#!/usr/bin/env node
/**
 * Wrapper around mock-flywheel-memory.mjs that pre-sets the env flags so the
 * mock exposes both `doctor` AND the write tools (`note`,
 * `vault_update_frontmatter`) the v0.4.0 server-startup probe requires.
 *
 * Used by server-startup.test.ts to assert the production boot path succeeds
 * end-to-end against a mock bridge.
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const real = join(here, 'mock-flywheel-memory.mjs');

const child = spawn(process.execPath, [real], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MOCK_FM_SUPPORTS_NOTE: '1',
    MOCK_FM_SUPPORTS_FRONTMATTER: '1',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    try {
      child.kill(sig);
    } catch {}
  });
}
