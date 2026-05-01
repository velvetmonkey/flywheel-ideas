import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openInMemoryIdeasDb,
  runMigrations,
  SecCompanyAdapter,
  extractEligibleSections,
  extractThemeHits,
  type ImportContext,
  type RawCandidate,
} from '../src/index.js';

const FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sec-company',
  'public-tech',
  'msft',
);

function makeCtx(): ImportContext {
  const db = openInMemoryIdeasDb();
  runMigrations(db);
  return {
    db,
    vaultPath: '/tmp/nonexistent-vault',
    cacheDir: '/tmp/nonexistent-cache',
    network: false,
  };
}

async function collect(adapter: SecCompanyAdapter): Promise<RawCandidate[]> {
  const out: RawCandidate[] = [];
  for await (const c of adapter.scan(`fixture://${FIXTURE_DIR}`, makeCtx())) {
    out.push(c);
  }
  return out;
}

describe('sec-company adapter', () => {
  it('extracts eligible 10-K and 10-Q sections', () => {
    const tenK = [
      'Item 1A. Risk Factors',
      'The company depends on suppliers, manufacturers, logistics providers, and component availability. '.repeat(20),
      'Item 1B. Other',
      'Item 7. Management Discussion',
      'Management reviews revenue, customer demand, sales results, macroeconomic conditions, and operating performance. '.repeat(20),
      'Item 8. Financials',
    ].join('\n\n');
    expect(extractEligibleSections(tenK, '10-K').map((s) => s.key)).toEqual([
      'item-1a',
      'item-7',
    ]);
  });

  it('rejects table-of-contents stubs', () => {
    const tenK = [
      'Table of Contents',
      'Item 1A. Risk Factors',
      'Item 1B. Unresolved Staff Comments',
      'Item 7. Management Discussion and Analysis',
      'Item 8. Financial Statements',
    ].join('\n');
    expect(extractEligibleSections(tenK, '10-K')).toHaveLength(0);
  });

  it('classifies recurring themes and explicit realized-risk language', () => {
    const hits = extractThemeHits(
      'Supply disruption in Asia resulted in delayed shipments and adversely affected product revenue.',
    );
    expect(hits[0].key).toBe('supply-chain');
    expect(hits[0].realized).toBe(true);
    expect(hits[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('does not stage outcomes for generic risk boilerplate', () => {
    const hits = extractThemeHits(
      'Supply chain disruption, component shortages, and logistics constraints could materially adversely affect future revenue.',
    );
    expect(hits[0].key).toBe('supply-chain');
    expect(hits[0].realized).toBe(false);
  });

  it('classifies expanded SEC themes', () => {
    const hits = extractThemeHits([
      'Cybersecurity incidents, privacy regulation, and unauthorized access could affect customer trust.',
      'Data center capacity, cloud infrastructure availability, and GPU supply can constrain AI demand.',
      'Export controls, tariffs, and China trade restrictions may affect shipments.',
    ].join('\n\n'));
    expect(hits.map((h) => h.key)).toEqual([
      'cybersecurity-privacy',
      'cloud-data-center-capacity',
      'geopolitics-tariffs',
    ]);
  });

  it('emits idea, assumption, and staged outcome candidates from fixtures', async () => {
    const all = await collect(new SecCompanyAdapter());
    expect(all.filter((c) => c.kind === 'idea').length).toBeGreaterThanOrEqual(6);
    expect(all.filter((c) => c.kind === 'assumption').length).toBeGreaterThanOrEqual(8);
    const outcomes = all.filter((c) => c.kind === 'outcome');
    expect(outcomes.length).toBeGreaterThanOrEqual(1);
    expect(outcomes[0].sourceUri).toContain('sec-company://0000789019/');
    expect(outcomes.map((o) => o.extractedFields?.theme_key)).toContain('cloud-data-center-capacity');
  });
});
