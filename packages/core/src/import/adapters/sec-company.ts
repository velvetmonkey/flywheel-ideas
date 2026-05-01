import { createHash } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  ImportAdapterError,
  ImportNetworkGatedError,
  type ImportAdapter,
  type ImportContext,
  type RawCandidate,
} from '../adapter.js';

export const SEC_COMPANY_NAME = 'sec-company';

const DEFAULT_FORMS = ['10-K', '10-Q'];
const DEFAULT_YEARS = 10;
const SEC_SUBMISSIONS = 'https://data.sec.gov/submissions';
const SEC_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
const TICKER_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_REQUEST_SPACING_MS = 150;
let lastSecRequestAt = 0;

export interface SecCompanyConfig {
  years: number;
  forms: string[];
  fixtureDir?: string;
  limit_filings?: number;
}

export interface SecCompanyFilingFixture {
  cik: string;
  ticker?: string;
  company_name?: string;
  accession_no: string;
  form: string;
  filed_at: string;
  period?: string;
  primary_document?: string;
  filing_url?: string;
}

interface CompanyIdentity {
  cik: string;
  ticker?: string;
  companyName?: string;
}

interface FilingRecord {
  cik: string;
  ticker?: string;
  companyName?: string;
  accessionNo: string;
  form: string;
  filedAt: string;
  period?: string;
  primaryDocument?: string;
  filingUrl: string;
  text: string;
}

interface SectionSlice {
  key: string;
  title: string;
  text: string;
}

interface ThemeHit {
  key: string;
  title: string;
  excerpt: string;
  realized: boolean;
  confidence: number;
  rationale: string;
}

export class SecCompanyAdapter implements ImportAdapter {
  readonly name = SEC_COMPANY_NAME;

  async *scan(source: string, ctx: ImportContext): AsyncGenerator<RawCandidate> {
    const config = mergeConfig(parseSourceConfig(source), ctx.scanConfig);

    if (config.fixtureDir) {
      yield* scanFixtureDir(config);
      return;
    }

    if (!ctx.network) throw new ImportNetworkGatedError(this.name);

    const identity = await resolveCompanyIdentity(source);
    const filings = await fetchCompanyFilings(identity, config);
    for (const filing of filings) {
      yield* emitCandidatesForFiling(filing);
    }
  }
}

async function* scanFixtureDir(
  config: SecCompanyConfig,
): AsyncGenerator<RawCandidate> {
  const manifestPath = path.join(config.fixtureDir!, 'manifest.json');
  let manifest: { filings?: SecCompanyFilingFixture[] };
  try {
    manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8')) as {
      filings?: SecCompanyFilingFixture[];
    };
  } catch (err) {
    throw new ImportAdapterError(
      `fixture manifest unreadable: ${manifestPath}: ${err instanceof Error ? err.message : String(err)}`,
      SEC_COMPANY_NAME,
      config.fixtureDir!,
    );
  }
  const filings = (manifest.filings ?? [])
    .filter((f) => config.forms.includes(f.form))
    .sort((a, b) => a.filed_at.localeCompare(b.filed_at))
    .slice(0, config.limit_filings ?? Number.POSITIVE_INFINITY);

  for (const f of filings) {
    const doc = f.primary_document ?? `${f.accession_no}.txt`;
    const text = await fsp.readFile(path.join(config.fixtureDir!, doc), 'utf8');
    yield* emitCandidatesForFiling({
      cik: padCik(f.cik),
      ticker: f.ticker,
      companyName: f.company_name,
      accessionNo: f.accession_no,
      form: f.form,
      filedAt: f.filed_at,
      period: f.period,
      primaryDocument: doc,
      filingUrl: f.filing_url ?? `fixture://${config.fixtureDir}/${doc}`,
      text,
    });
  }
}

async function fetchCompanyFilings(
  identity: CompanyIdentity,
  config: SecCompanyConfig,
): Promise<FilingRecord[]> {
  const userAgent = resolveUserAgent();
  const submissions = await fetchJson<SecSubmission>(
    `${SEC_SUBMISSIONS}/CIK${identity.cik}.json`,
    userAgent,
  );
  const batches: SecRecentFilings[] = [];
  if (submissions.filings?.recent) batches.push(submissions.filings.recent);
  for (const file of submissions.filings?.files ?? []) {
    const older = await fetchJson<SecSubmissionFile>(
      `${SEC_SUBMISSIONS}/${file.name}`,
      userAgent,
    );
    batches.push(older);
  }

  const cutoffYear = new Date().getUTCFullYear() - config.years;
  const records: FilingRecord[] = [];
  for (const batch of batches) {
    for (let i = 0; i < batch.accessionNumber.length; i++) {
      const form = batch.form[i];
      const filedAt = batch.filingDate[i];
      if (!config.forms.includes(form)) continue;
      if (Number(filedAt.slice(0, 4)) < cutoffYear) continue;
      const accessionNo = batch.accessionNumber[i];
      const primaryDocument = batch.primaryDocument[i];
      const filingUrl = filingDocumentUrl(identity.cik, accessionNo, primaryDocument);
      const text = await fetchText(filingUrl, userAgent);
      records.push({
        cik: identity.cik,
        ticker: identity.ticker,
        companyName: submissions.name ?? identity.companyName,
        accessionNo,
        form,
        filedAt,
        period: batch.reportDate[i],
        primaryDocument,
        filingUrl,
        text,
      });
      if (config.limit_filings && records.length >= config.limit_filings) break;
    }
    if (config.limit_filings && records.length >= config.limit_filings) break;
  }
  return records.sort((a, b) => a.filedAt.localeCompare(b.filedAt));
}

async function* emitCandidatesForFiling(
  filing: FilingRecord,
): AsyncGenerator<RawCandidate> {
  const sections = extractEligibleSections(filing.text, filing.form);
  for (const section of sections) {
    const base = `sec-company://${filing.cik}/${filing.accessionNo}#${section.key}`;
    const companyLabel = filing.ticker ?? filing.companyName ?? filing.cik;
    const ideaTitle = `${companyLabel} ${filing.filedAt} ${filing.form} ${section.title}`;
    yield {
      kind: 'idea',
      title: ideaTitle,
      bodyMd: renderIdeaBody(filing, section),
      confidence: 0.82,
      sourceUri: `${base}:idea`,
      extractedFields: {
        sec_company: filingFields(filing),
        section_key: section.key,
        excerpt_hash: hashText(section.text),
      },
    };

    const themes = extractThemeHits(section.text);
    for (const theme of themes) {
      yield {
        kind: 'assumption',
        title: `${companyLabel} ${theme.title} risk remains manageable`,
        bodyMd: theme.excerpt,
        confidence: 0.78,
        sourceUri: `${base}:theme:${theme.key}:assumption`,
        extractedFields: {
          parent_idea_source_uri: `${base}:idea`,
          sec_company: filingFields(filing),
          section_key: section.key,
          theme_key: theme.key,
          theme_title: theme.title,
          excerpt_hash: hashText(theme.excerpt),
          load_bearing: true,
          structured: {
            context: `${companyLabel} disclosed ${theme.title.toLowerCase()} risk in ${filing.form} ${filing.filedAt}.`,
            challenge: theme.excerpt,
            decision: `${companyLabel} can manage this recurring risk without material disruption.`,
            tradeoff: 'The filing language is company-authored risk disclosure, not an independent forecast.',
          },
        },
      };

      if (theme.realized) {
        yield {
          kind: 'outcome',
          title: `Realized: ${companyLabel} ${theme.title} risk`,
          bodyMd: theme.excerpt,
          confidence: theme.confidence,
          sourceUri: `${base}:theme:${theme.key}:outcome`,
          extractedFields: {
            sec_company: filingFields(filing),
            section_key: section.key,
            theme_key: theme.key,
            theme_title: theme.title,
            excerpt_hash: hashText(theme.excerpt),
            rationale: theme.rationale,
            explicit_realization: true,
          },
        };
      }
    }
  }
}

export function extractEligibleSections(text: string, form: string): SectionSlice[] {
  const cleaned = htmlToText(text);
  if (form === '10-K') {
    return [
      ['item-1a', 'Item 1A Risk Factors', ['Item 1A', 'Risk Factors']],
      ['item-7', 'Item 7 MD&A', ['Item 7', 'Management']],
    ].flatMap(([key, title, markers]) =>
      extractByMarkers(cleaned, key as string, title as string, markers as string[]),
    );
  }
  if (form === '10-Q') {
    return [
      ['part-ii-item-1a', 'Part II Item 1A Risk Factors', ['Part II', 'Item 1A', 'Risk Factors']],
      ['part-i-item-2', 'Part I Item 2 MD&A', ['Part I', 'Item 2', 'Management']],
    ].flatMap(([key, title, markers]) =>
      extractByMarkers(cleaned, key as string, title as string, markers as string[]),
    );
  }
  return [];
}

function extractByMarkers(
  text: string,
  key: string,
  title: string,
  markers: string[],
): SectionSlice[] {
  const lines = text.split(/\n+/);
  const start = lines.findIndex((line) => markers.every((m) => line.toLowerCase().includes(m.toLowerCase())));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^item\s+\d+[a-z]?\.?\s+/i.test(line) || /^part\s+[ivx]+/i.test(line)) {
      if (out.join(' ').length > 400) break;
    }
    if (line) out.push(line);
    if (out.join(' ').length > 5000) break;
  }
  const body = out.join('\n\n').trim();
  return body ? [{ key, title, text: body }] : [];
}

export function extractThemeHits(text: string): ThemeHit[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const hits = new Map<string, ThemeHit>();
  for (const p of paragraphs) {
    const lower = p.toLowerCase();
    const theme = classifyTheme(lower);
    if (!theme) continue;
    if (hits.has(theme.key)) continue;
    const realized = isExplicitRealization(lower);
    hits.set(theme.key, {
      ...theme,
      excerpt: p.slice(0, 1600),
      realized,
      confidence: realized ? 0.92 : 0.78,
      rationale: realized
        ? 'Later filing language explicitly states the risk affected operations or results.'
        : 'Risk theme disclosed without explicit realization language.',
    });
  }
  return [...hits.values()];
}

function classifyTheme(lower: string): Pick<ThemeHit, 'key' | 'title'> | null {
  if (/(supply|supplier|manufactur|logistics|inventory|component)/.test(lower)) {
    return { key: 'supply-chain', title: 'Supply chain' };
  }
  if (/(competition|competitor|pricing|margin|market share)/.test(lower)) {
    return { key: 'competition', title: 'Competition' };
  }
  if (/(demand|customer|consumer|sales|revenue)/.test(lower)) {
    return { key: 'demand', title: 'Demand' };
  }
  if (/(liquidity|cash|credit|interest rate|debt|capital)/.test(lower)) {
    return { key: 'liquidity', title: 'Liquidity' };
  }
  if (/(regulation|regulatory|legal|litigation|compliance|government)/.test(lower)) {
    return { key: 'regulation', title: 'Regulation' };
  }
  return null;
}

function isExplicitRealization(lower: string): boolean {
  return /(adversely affected|materially affected|we experienced|resulted in|we incurred|decline was due to|disruption|shortage|litigation resulted|regulatory action)/.test(lower);
}

function renderIdeaBody(filing: FilingRecord, section: SectionSlice): string {
  return [
    `# ${filing.companyName ?? filing.ticker ?? filing.cik} ${filing.form} ${section.title}`,
    '',
    `Filed: ${filing.filedAt}`,
    `Source: ${filing.filingUrl}`,
    '',
    section.text,
  ].join('\n');
}

function filingFields(filing: FilingRecord): Record<string, unknown> {
  return {
    cik: filing.cik,
    ticker: filing.ticker,
    company_name: filing.companyName,
    accession_no: filing.accessionNo,
    form: filing.form,
    filed_at: filing.filedAt,
    period: filing.period,
    filing_url: filing.filingUrl,
  };
}

function parseSourceConfig(source: string): Partial<SecCompanyConfig> {
  if (source.startsWith('fixture://')) {
    return { fixtureDir: source.slice('fixture://'.length) };
  }
  return {};
}

function mergeConfig(
  sourceConfig: Partial<SecCompanyConfig>,
  scanConfig?: Record<string, unknown>,
): SecCompanyConfig {
  const forms = Array.isArray(scanConfig?.forms)
    ? scanConfig.forms.filter((v): v is string => typeof v === 'string')
    : DEFAULT_FORMS;
  return {
    years: typeof scanConfig?.years === 'number' ? Math.max(1, Math.floor(scanConfig.years)) : DEFAULT_YEARS,
    forms: forms.filter((f) => DEFAULT_FORMS.includes(f)),
    fixtureDir: typeof scanConfig?.fixture_dir === 'string' ? scanConfig.fixture_dir : sourceConfig.fixtureDir,
    limit_filings: typeof scanConfig?.limit_filings === 'number' ? Math.max(1, Math.floor(scanConfig.limit_filings)) : undefined,
  };
}

async function resolveCompanyIdentity(source: string): Promise<CompanyIdentity> {
  if (source.startsWith('cik:')) return { cik: padCik(source.slice(4)) };
  const ticker = source.startsWith('ticker:') ? source.slice(7).toUpperCase() : source.toUpperCase();
  const data = await fetchJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
    TICKER_URL,
    resolveUserAgent(),
  );
  const found = Object.values(data).find((row) => row.ticker.toUpperCase() === ticker);
  if (!found) throw new ImportAdapterError(`ticker not found: ${ticker}`, SEC_COMPANY_NAME, source);
  return { cik: padCik(String(found.cik_str)), ticker, companyName: found.title };
}

function filingDocumentUrl(cik: string, accessionNo: string, doc: string): string {
  return `${SEC_ARCHIVES}/${Number(cik)}/${accessionNo.replace(/-/g, '')}/${doc}`;
}

async function fetchJson<T>(url: string, userAgent: string): Promise<T> {
  await throttleSecRequest();
  const res = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SEC fetch failed ${res.status}: ${url}`);
  return (await res.json()) as T;
}

async function fetchText(url: string, userAgent: string): Promise<string> {
  await throttleSecRequest();
  const res = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'text/html,text/plain' } });
  if (!res.ok) throw new Error(`SEC filing fetch failed ${res.status}: ${url}`);
  return res.text();
}

async function throttleSecRequest(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastSecRequestAt + SEC_REQUEST_SPACING_MS - now);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastSecRequestAt = Date.now();
}

function resolveUserAgent(): string {
  return process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT ?? 'flywheel-ideas/0.4.0 contact@example.com';
}

function padCik(cik: string): string {
  return cik.replace(/\D/g, '').padStart(10, '0');
}

function htmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hashText(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

interface SecSubmission {
  name?: string;
  filings?: {
    recent: SecRecentFilings;
    files?: Array<{ name: string }>;
  };
}

type SecSubmissionFile = SecRecentFilings;

interface SecRecentFilings {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  form: string[];
  primaryDocument: string[];
}
