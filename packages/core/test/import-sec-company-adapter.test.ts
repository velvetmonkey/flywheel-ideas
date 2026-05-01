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
  'apple',
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
      'supplier risk text',
      'Item 1B. Other',
      'Item 7. Management Discussion',
      'demand text',
      'Item 8. Financials',
    ].join('\n\n');
    expect(extractEligibleSections(tenK, '10-K').map((s) => s.key)).toEqual([
      'item-1a',
      'item-7',
    ]);
  });

  it('classifies recurring themes and explicit realized-risk language', () => {
    const hits = extractThemeHits(
      'Supply disruption in Asia resulted in delayed shipments and adversely affected product revenue.',
    );
    expect(hits[0].key).toBe('supply-chain');
    expect(hits[0].realized).toBe(true);
    expect(hits[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('emits idea, assumption, and staged outcome candidates from fixtures', async () => {
    const all = await collect(new SecCompanyAdapter());
    expect(all.filter((c) => c.kind === 'idea').length).toBeGreaterThanOrEqual(2);
    expect(all.filter((c) => c.kind === 'assumption').length).toBeGreaterThanOrEqual(3);
    const outcomes = all.filter((c) => c.kind === 'outcome');
    expect(outcomes.length).toBeGreaterThanOrEqual(1);
    expect(outcomes[0].sourceUri).toContain('sec-company://0000320193/');
    expect(outcomes[0].extractedFields?.theme_key).toBe('supply-chain');
  });
});
