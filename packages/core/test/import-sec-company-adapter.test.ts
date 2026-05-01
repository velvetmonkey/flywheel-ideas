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
const NVDA_FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sec-company',
  'public-tech',
  'nvda',
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

async function collect(adapter: SecCompanyAdapter, fixtureDir = FIXTURE_DIR): Promise<RawCandidate[]> {
  const out: RawCandidate[] = [];
  for await (const c of adapter.scan(`fixture://${fixtureDir}`, makeCtx())) {
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

  it('extracts headings with SEC HTML entities', () => {
    const tenK = [
      'Item&#160;1A. Risk Factors',
      'The company depends on suppliers, manufacturers, logistics providers, component availability, and demand. January&#8239;26 disclosures describe these risks. '.repeat(20),
      'Item&#160;1B. Other',
    ].join('\n\n');
    const sections = extractEligibleSections(tenK, '10-K');
    expect(sections.map((s) => s.key)).toContain('item-1a');
    expect(sections[0].text).not.toContain('&#160;');
    expect(sections[0].text).not.toContain('&#8239;');
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
      'We experienced supply disruption in Asia and recorded remediation costs for delayed shipments.',
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

  it.each([
    'Supply chain disruption, component shortages, and logistics constraints could materially adversely affect future revenue.',
    'Worsening economic conditions may result in lower cloud demand and adversely affect our revenue.',
    'If suppliers cannot provide components, manufacturing delays could reduce sales.',
    'Cybersecurity incidents may continue to result in remediation costs and customer trust issues.',
    'Future customer demand may decline if macroeconomic conditions deteriorate.',
    'Supply constraints have not materially affected revenue or results of operations.',
    'In the event of financial turmoil, there could be tightening in credit markets resulting in product delays.',
    'An industrial accident at a supplier could occur and could result in serious injuries, disruption to business, and harm to reputation.',
    'Demand mismatches have resulted in product shortages and harmed financial results, and could reoccur.',
    'We currently devote significant resources to data center markets where we have a limited operating history.',
    'We have introduced GPUs with limited mining capability and increased supply to miners.',
  ])('keeps conditional or negated risk language as observations: %s', (text) => {
    const hits = extractThemeHits(text);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.realized)).toBe(false);
    expect(hits.every((h) => h.confidence < 0.9)).toBe(true);
  });

  it.each([
    'We incurred a $4.5 billion charge for excess inventory as customer demand diminished.',
    'We recorded an inventory charge after supply commitments exceeded demand.',
    'The Company experienced supply disruption and recorded remediation costs.',
    'Our operations have adversely affected product revenue after a cybersecurity breach.',
    'As a result, the Company recorded a $1.2 billion charge to align costs with demand.',
  ])('stages concrete realized-risk language: %s', (text) => {
    const hits = extractThemeHits(text);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.realized)).toBe(true);
    expect(hits.find((h) => h.realized)?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('uses cleaned, bounded, theme-centered evidence windows', () => {
    const hits = extractThemeHits([
      'Forward-looking statements may include terms like could and future.',
      'The Company&#8217;s supply chain disruption resulted in delayed shipments and increased costs.',
      'Unrelated boilerplate follows. '.repeat(100),
    ].join(' '));
    expect(hits[0].excerpt.length).toBeLessThanOrEqual(900);
    expect(hits[0].excerpt).toContain("Company's supply chain disruption");
    expect(hits[0].excerpt).not.toContain('&#8217;');
  });

  it('classifies expanded SEC themes', () => {
    const hits = extractThemeHits([
      'Cybersecurity incidents, privacy regulation, and unauthorized access could affect customer trust.',
      'Data center capacity, cloud infrastructure availability, and GPU supply can constrain AI demand.',
      'Export controls, tariffs, and China trade restrictions may affect shipments.',
    ].join('\n\n'));
    expect(hits.map((h) => h.key)).toEqual(expect.arrayContaining([
      'cybersecurity-privacy',
      'cloud-data-center-capacity',
      'geopolitics-tariffs',
    ]));
  });

  it('emits idea, assumption, and staged outcome candidates from fixtures', async () => {
    const all = await collect(new SecCompanyAdapter(), NVDA_FIXTURE_DIR);
    expect(all.filter((c) => c.kind === 'idea').length).toBeGreaterThanOrEqual(6);
    expect(all.filter((c) => c.kind === 'assumption').length).toBeGreaterThanOrEqual(8);
    const outcomes = all.filter((c) => c.kind === 'outcome');
    expect(outcomes.length).toBeGreaterThanOrEqual(1);
    expect(outcomes[0].sourceUri).toContain('sec-company://0001045810/');
    expect(outcomes.every((o) => o.confidence >= 0.9)).toBe(true);
    expect(outcomes.every((o) => o.extractedFields?.explicit_realization === true)).toBe(true);
    expect(outcomes.map((o) => o.bodyMd).join('\n')).not.toContain('&#160;');
  });
});
