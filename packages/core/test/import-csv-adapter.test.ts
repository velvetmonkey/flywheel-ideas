import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CsvCorpusAdapter,
  type ImportContext,
  type RawCandidate,
} from '../src/index.js';
import { openInMemoryIdeasDb, runMigrations } from '../src/index.js';

const FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'csv-corpus',
  'synthetic-3.jsonl',
);

function makeCtx(): ImportContext {
  const db = openInMemoryIdeasDb();
  runMigrations(db);
  return {
    db,
    vaultPath: '/tmp/nonexistent-vault-for-csv-corpus-tests',
    cacheDir: '/tmp/nonexistent-cache',
    network: false,
  };
}

async function collectAll(
  adapter: CsvCorpusAdapter,
  source: string,
  ctx: ImportContext,
): Promise<RawCandidate[]> {
  const out: RawCandidate[] = [];
  for await (const c of adapter.scan(source, ctx)) out.push(c);
  return out;
}

describe('CsvCorpusAdapter', () => {
  it('emits one idea per row + N assumptions + 0|1 outcome', async () => {
    const adapter = new CsvCorpusAdapter();
    const all = await collectAll(adapter, FIXTURE_PATH, makeCtx());

    const ideas = all.filter((c) => c.kind === 'idea');
    const assumptions = all.filter((c) => c.kind === 'assumption');
    const outcomes = all.filter((c) => c.kind === 'outcome');

    expect(ideas.length).toBe(3); // 3 rows
    expect(assumptions.length).toBe(4); // 2 + 1 + 1
    expect(outcomes.length).toBe(1); // only obj-001 has an outcome
  });

  it('encodes the row index in every source URI', async () => {
    const adapter = new CsvCorpusAdapter();
    const all = await collectAll(adapter, FIXTURE_PATH, makeCtx());

    for (const c of all) {
      expect(c.sourceUri).toMatch(/^csv-corpus:\/\//);
      expect(c.sourceUri).toMatch(/#row=\d+/);
    }
    const obj001Asm = all.find(
      (c) => c.kind === 'assumption' && (c.extractedFields?.corpus_id as string) === 'asm-001-a',
    );
    expect(obj001Asm?.sourceUri).toContain('#row=0/asm=asm-001-a');

    const outcome = all.find((c) => c.kind === 'outcome');
    expect(outcome?.sourceUri).toContain('#row=0/outcome');
  });

  it('passes through outcome tags on assumption candidates', async () => {
    const adapter = new CsvCorpusAdapter();
    const all = await collectAll(adapter, FIXTURE_PATH, makeCtx());
    const refuted = all.find(
      (c) => c.kind === 'assumption' && (c.extractedFields?.corpus_id as string) === 'asm-001-a',
    );
    expect(refuted?.extractedFields?.outcome).toBe('refuted');
    expect(refuted?.extractedFields?.load_bearing).toBe(true);
    expect(typeof refuted?.extractedFields?.outcome_evidence).toBe('string');
  });

  it('honours load_bearing: false on assumption rows', async () => {
    const adapter = new CsvCorpusAdapter();
    const all = await collectAll(adapter, FIXTURE_PATH, makeCtx());
    const validated = all.find(
      (c) => c.kind === 'assumption' && (c.extractedFields?.corpus_id as string) === 'asm-003-a',
    );
    expect(validated?.extractedFields?.load_bearing).toBe(false);
  });

  it('accepts a file:// URL as source', async () => {
    const adapter = new CsvCorpusAdapter();
    const url = pathToFileURL(FIXTURE_PATH).href;
    const all = await collectAll(adapter, url, makeCtx());
    expect(all.filter((c) => c.kind === 'idea').length).toBe(3);
  });

  it('rejects relative paths', async () => {
    const adapter = new CsvCorpusAdapter();
    const gen = adapter.scan('./synthetic-3.jsonl', makeCtx());
    await expect(gen.next()).rejects.toMatchObject({
      name: 'ImportAdapterError',
    });
  });

  it('skips malformed lines without killing the batch', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-corpus-test-'));
    const filePath = path.join(tmp, 'mixed.jsonl');
    fs.writeFileSync(
      filePath,
      [
        '{"decision_id":"a-1","title":"valid one","assumptions":[]}',
        'NOT JSON AT ALL',
        '{"decision_id":"a-2","title":"valid two","assumptions":[]}',
        '',
        '{"missing_title":true,"decision_id":"a-3"}',
        '{"decision_id":"a-4","title":"valid three","assumptions":[]}',
      ].join('\n'),
    );

    const adapter = new CsvCorpusAdapter();
    const all = await collectAll(adapter, filePath, makeCtx());
    const ideas = all.filter((c) => c.kind === 'idea');
    expect(ideas.map((c) => c.title)).toEqual(['valid one', 'valid two', 'valid three']);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('surfaces a clear error when the file does not exist', async () => {
    const adapter = new CsvCorpusAdapter();
    const gen = adapter.scan('/tmp/does-not-exist-flywheel-ideas-csv.jsonl', makeCtx());
    await expect(gen.next()).rejects.toMatchObject({
      name: 'ImportAdapterError',
      adapter: 'csv-corpus',
    });
  });
});
