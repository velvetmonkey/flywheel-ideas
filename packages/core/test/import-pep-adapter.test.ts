import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GithubStructuredDocsAdapter,
  extractAssumptionSentences,
  parsePepDocument,
  type ImportContext,
  type RawCandidate,
} from '../src/index.js';
import { openInMemoryIdeasDb, runMigrations } from '../src/index.js';

const FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'peps',
);

function makeCtx(): ImportContext {
  const db = openInMemoryIdeasDb();
  runMigrations(db);
  return {
    db,
    vaultPath: '/tmp/nonexistent-vault-for-parser-tests',
    cacheDir: '/tmp/nonexistent-cache',
    network: false,
  };
}

async function collectAll(
  adapter: GithubStructuredDocsAdapter,
  source: string,
  ctx: ImportContext,
): Promise<RawCandidate[]> {
  const out: RawCandidate[] = [];
  for await (const c of adapter.scan(source, ctx)) out.push(c);
  return out;
}

describe('parsePepDocument', () => {
  it('returns null for a file without an RFC-822 header', () => {
    const parsed = parsePepDocument('Motivation\n==========\n\nNo header.');
    expect(parsed).toBeNull();
  });

  it('extracts core header fields', () => {
    const doc = [
      'PEP: 8',
      'Title: Style Guide',
      'Status: Active',
      'Type: Process',
      'Author: Guido van Rossum, Barry Warsaw',
      'Created: 05-Jul-2001',
      '',
      'Abstract',
      '========',
      '',
      'Body text here.',
      '',
    ].join('\n');
    const parsed = parsePepDocument(doc);
    expect(parsed).not.toBeNull();
    expect(parsed!.header.pepNumber).toBe('8');
    expect(parsed!.header.title).toBe('Style Guide');
    expect(parsed!.header.status).toBe('Active');
    expect(parsed!.header.authors).toEqual(['Guido van Rossum', 'Barry Warsaw']);
  });

  it('captures a Resolution line when present', () => {
    const doc = [
      'PEP: 404',
      'Title: Unrelease',
      'Status: Final',
      'Type: Informational',
      'Resolution: https://example.com/decision',
      '',
      'Body.',
    ].join('\n');
    const parsed = parsePepDocument(doc);
    expect(parsed!.header.resolution).toBe('https://example.com/decision');
  });
});

describe('extractAssumptionSentences', () => {
  it('matches cue phrases at the start of a sentence', () => {
    const hits = extractAssumptionSentences([
      'This PEP assumes that network access is unreliable. We ship fine.',
      'The plan depends on upstream providing a stable API.',
      'Nothing special here.',
    ]);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits.some((h) => /assumes that network/.test(h))).toBe(true);
    expect(hits.some((h) => /depends on upstream/.test(h))).toBe(true);
  });

  it('rejects vague sentences without cue phrases', () => {
    const hits = extractAssumptionSentences([
      'Users may sometimes prefer spaces over tabs. Nobody knows why.',
    ]);
    expect(hits).toEqual([]);
  });
});

describe('GithubStructuredDocsAdapter (fixture mode)', () => {
  it('emits idea + assumption + optional outcome per PEP', async () => {
    const adapter = new GithubStructuredDocsAdapter();
    const ctx = makeCtx();
    const all = await collectAll(adapter, `fixture://${FIXTURE_DIR}`, ctx);

    const ideas = all.filter((c) => c.kind === 'idea');
    const assumptions = all.filter((c) => c.kind === 'assumption');
    const outcomes = all.filter((c) => c.kind === 'outcome');

    // Three well-formed PEPs; malformed one is skipped silently.
    expect(ideas.length).toBe(3);
    // Each has at least one assumption cue.
    expect(assumptions.length).toBeGreaterThanOrEqual(3);
    // Two of three PEPs (404, 3000) have Resolution + Final status → outcome.
    expect(outcomes.length).toBe(2);
  });

  it('maps Status=Final to high confidence + reversible=false', async () => {
    const adapter = new GithubStructuredDocsAdapter();
    const ctx = makeCtx();
    const all = await collectAll(adapter, `fixture://${FIXTURE_DIR}`, ctx);
    const pep404 = all.find(
      (c) => c.kind === 'idea' && (c.extractedFields?.pep_number as string) === '404',
    );
    expect(pep404).toBeDefined();
    expect(pep404!.confidence).toBe(1.0);
    expect(pep404!.extractedFields!.reversible).toBe(false);
    expect(pep404!.extractedFields!.status).toBe('Final');
  });

  it('yields a source URI per candidate', async () => {
    const adapter = new GithubStructuredDocsAdapter();
    const ctx = makeCtx();
    const all = await collectAll(adapter, `fixture://${FIXTURE_DIR}`, ctx);
    for (const c of all) {
      expect(c.sourceUri).toMatch(/^fixture:\/\//);
      expect(c.sourceUri).toContain('peps/pep-');
    }
  });

  it('network mode requires FLYWHEEL_IDEAS_IMPORT_NETWORK', async () => {
    const adapter = new GithubStructuredDocsAdapter();
    const ctx = { ...makeCtx(), network: false };
    const gen = adapter.scan('python/peps', ctx);
    await expect(gen.next()).rejects.toMatchObject({
      name: 'ImportNetworkGatedError',
    });
  });

  it('honours scan_config.filter from the import context', async () => {
    const adapter = new GithubStructuredDocsAdapter();
    const ctx: ImportContext = { ...makeCtx(), scanConfig: { filter: '^pep-3000\\.rst$' } };
    const all = await collectAll(adapter, `fixture://${FIXTURE_DIR}`, ctx);
    const ideas = all.filter((c) => c.kind === 'idea');
    expect(ideas.length).toBe(1);
    expect(ideas[0].extractedFields?.pep_number).toBe('3000');
  });

  it('honours scan_config.limit from the import context', async () => {
    const adapter = new GithubStructuredDocsAdapter();
    const ctx: ImportContext = { ...makeCtx(), scanConfig: { limit: 1 } };
    const all = await collectAll(adapter, `fixture://${FIXTURE_DIR}`, ctx);
    expect(all.filter((c) => c.kind === 'idea').length).toBe(1);
  });
});
