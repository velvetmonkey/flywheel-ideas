/**
 * Unit tests for the v0.2 KEYSTONE evidence-reader subprocess wrapper.
 *
 * Uses the existing mock-flywheel-memory.mjs fixture (exposes `doctor`)
 * for happy-path coverage. Tool-specific assembler tests (search / memory
 * / graph mocks) land in B5.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractToolText,
  withEvidenceReader,
} from '../src/index.js';

const MOCK = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-flywheel-memory.mjs',
);
const VAULT = '/tmp/flywheel-ideas-evidence-reader-test'; // arbitrary; mock doesn't read it

const savedKill = process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
const savedTimeout = process.env.FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS;

afterEach(() => {
  if (savedKill === undefined) delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
  else process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = savedKill;
  if (savedTimeout === undefined) delete process.env.FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS;
  else process.env.FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS = savedTimeout;
});

describe('withEvidenceReader — kill switch + binary resolution', () => {
  it('FLYWHEEL_IDEAS_MEMORY_BRIDGE=0 → skipped:disabled, fn never called', async () => {
    process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
    let called = false;
    const result = await withEvidenceReader(VAULT, async () => {
      called = true;
      return 'never';
    });
    expect(result).toEqual({ status: 'skipped', reason: 'disabled' });
    expect(called).toBe(false);
  });

  it('absolute binary path that does not exist → skipped:binary_not_found', async () => {
    delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    const result = await withEvidenceReader(
      VAULT,
      async () => 'never',
      { binary: '/nonexistent/path/to/flywheel-memory' },
    );
    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') {
      expect(result.reason).toBe('binary_not_found');
      expect(result.detail).toBe('/nonexistent/path/to/flywheel-memory');
    }
  });
});

describe('withEvidenceReader — happy path against mock', () => {
  it('spawns mock, runs query, returns {status:"ok", value}', async () => {
    delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    const result = await withEvidenceReader(
      VAULT,
      async (reader) => {
        const res = await reader.query('doctor', { action: 'config', mode: 'get' });
        const text = extractToolText(res);
        expect(text).not.toBeNull();
        const parsed = JSON.parse(text!);
        expect(parsed).toHaveProperty('vault_name');
        expect(parsed).toHaveProperty('custom_categories');
        return parsed.vault_name as string;
      },
      { binary: 'node', args: [MOCK] },
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.value).toBe('mock-vault');
    }
  });

  it('multiple queries within one subprocess lifetime', async () => {
    delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    const result = await withEvidenceReader(
      VAULT,
      async (reader) => {
        const r1 = await reader.query('doctor', { action: 'config', mode: 'get' });
        const r2 = await reader.query('doctor', { action: 'config', mode: 'get' });
        return [r1, r2].every((r) => extractToolText(r) !== null);
      },
      { binary: 'node', args: [MOCK] },
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.value).toBe(true);
  });
});

describe('withEvidenceReader — timeout', () => {
  it('inner fn exceeding timeout → skipped:timeout', async () => {
    delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    const result = await withEvidenceReader(
      VAULT,
      async (_reader) => {
        // Sleep longer than the timeout below — never returns.
        await new Promise((r) => setTimeout(r, 5_000));
        return 'never';
      },
      { binary: 'node', args: [MOCK], timeoutMs: 200 },
    );
    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') {
      expect(result.reason).toBe('timeout');
    }
  }, 10_000);

  it('FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS env knob respected', async () => {
    delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
    process.env.FLYWHEEL_IDEAS_EVIDENCE_READER_TIMEOUT_MS = '150';
    const result = await withEvidenceReader(
      VAULT,
      async (_reader) => {
        await new Promise((r) => setTimeout(r, 5_000));
        return 'never';
      },
      { binary: 'node', args: [MOCK] },
    );
    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') expect(result.reason).toBe('timeout');
  }, 10_000);
});

describe('extractToolText helper', () => {
  it('returns text from a well-formed MCP response', () => {
    const res = { content: [{ type: 'text', text: '{"hello":"world"}' }] };
    expect(extractToolText(res)).toBe('{"hello":"world"}');
  });

  it('returns null when content array is missing', () => {
    expect(extractToolText({})).toBeNull();
    expect(extractToolText(null)).toBeNull();
    expect(extractToolText('not an object')).toBeNull();
  });

  it('returns null when no text-typed item is present', () => {
    expect(extractToolText({ content: [{ type: 'image', data: 'x' }] })).toBeNull();
    expect(extractToolText({ content: [] })).toBeNull();
  });

  it('returns the first text item when multiple are present', () => {
    const res = {
      content: [
        { type: 'text', text: 'first' },
        { type: 'text', text: 'second' },
      ],
    };
    expect(extractToolText(res)).toBe('first');
  });
});
