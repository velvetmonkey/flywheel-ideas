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
const MIN_SECTION_CHARS = 500;
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
            decision: `${companyLabel} can manage ${theme.title.toLowerCase()} risk without material disruption.`,
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
      extractByHeading(cleaned, 'item-1a', 'Item 1A Risk Factors', headingRegex(['item', '1a']), [
        headingRegex(['item', '1b']),
        headingRegex(['item', '2']),
      ]),
      extractByHeading(cleaned, 'item-7', 'Item 7 MD&A', headingRegex(['item', '7']), [
        headingRegex(['item', '7a']),
        headingRegex(['item', '8']),
      ]),
    ].filter((s): s is SectionSlice => Boolean(s));
  }
  if (form === '10-Q') {
    return [
      extractByHeading(cleaned, 'part-i-item-2', 'Part I Item 2 MD&A', itemHeadingRegex('2'), [
        itemHeadingRegex('3'),
        partHeadingRegex('ii'),
      ]),
      extractByHeading(cleaned, 'part-ii-item-1a', 'Part II Item 1A Risk Factors', itemHeadingRegex('1a'), [
        itemHeadingRegex('2'),
        itemHeadingRegex('3'),
      ]),
    ].filter((s): s is SectionSlice => Boolean(s));
  }
  return [];
}

function extractByHeading(
  text: string,
  key: string,
  title: string,
  startRegex: RegExp,
  endRegexes: RegExp[],
): SectionSlice | null {
  const lines = text.split(/\n+/);
  const starts = lines.flatMap((line, index) => (startRegex.test(normalizeHeading(line)) ? [index] : []));
  if (starts.length === 0) return null;

  const candidates = starts
    .map((start) => collectSectionBody(lines, start, endRegexes))
    .filter(isSubstantiveSection)
    .sort((a, b) => scoreSection(b) - scoreSection(a));
  const body = candidates[0]?.trim() ?? '';
  return body ? { key, title, text: body } : null;
}

function collectSectionBody(lines: string[], start: number, endRegexes: RegExp[]): string {
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const body = out.join(' ');
    if (endRegexes.some((regex) => regex.test(normalizeHeading(line)))) {
      if (isSubstantiveSection(body)) break;
    }
    if (line) out.push(line);
    if (body.length > 12000) break;
  }
  return out.join('\n\n').trim();
}

function headingRegex(parts: string[]): RegExp {
  return new RegExp(`^${parts.map(escapeRegex).join('[\\s\\.\\-:]*')}(?:\\b|\\s|\\.)`, 'i');
}

function partHeadingRegex(part: string): RegExp {
  return headingRegex(['part', part]);
}

function itemHeadingRegex(item: string): RegExp {
  return new RegExp(`^(?:part[\\s\\.\\-:]*[ivx]+[\\s\\.\\-:]+)?item[\\s\\.\\-:]*${escapeRegex(item)}(?:\\b|\\s|\\.)`, 'i');
}

function normalizeHeading(line: string): string {
  return line
    .replace(/\u00a0/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[•·]/g, ' ')
    .trim()
    .toLowerCase();
}

function isSubstantiveSection(body: string): boolean {
  if (body.length < MIN_SECTION_CHARS) return false;
  const lower = body.toLowerCase();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 80) return false;
  if (lower.includes('table of contents') && body.length < 2000) return false;
  return /(risk|revenue|sales|operations|results|management|competition|customer|supplier|regulation|cyber|cash|cloud|inventory|demand)/i.test(body);
}

function scoreSection(body: string): number {
  const lower = body.toLowerCase();
  const themeBonus = extractThemeHits(body).length * 500;
  const boilerplatePenalty = lower.includes('references to particular years') ? 1000 : 0;
  return body.length + themeBonus - boilerplatePenalty;
}

export function extractThemeHits(text: string): ThemeHit[] {
  const paragraphs = normalizeEvidenceText(text).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const hits = new Map<string, ThemeHit>();
  for (const p of paragraphs) {
    const sentences = splitSentences(p);
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const lower = sentence.toLowerCase();
      const themes = classifyThemes(lower);
      if (themes.length === 0) continue;
      const realized = isExplicitRealization(lower);
      const excerpt = evidenceWindow(sentences, i);
      for (const theme of themes) {
        const current = hits.get(theme.key);
        if (current?.realized) continue;
        if (current && !realized) continue;
        hits.set(theme.key, {
          ...theme,
          excerpt,
          realized,
          confidence: realized ? 0.92 : 0.78,
          rationale: realized
            ? 'Filing language states this risk had an actual effect on operations, results, costs, or supply.'
            : 'Risk theme disclosed without strict realized-outcome language.',
        });
      }
    }
  }
  return [...hits.values()];
}

const THEME_CATALOG: Array<Pick<ThemeHit, 'key' | 'title'> & { pattern: RegExp }> = [
  { key: 'cybersecurity-privacy', title: 'Cybersecurity and privacy', pattern: /(cyber|security incident|data breach|privacy|personal data|ransomware|unauthorized access)/ },
  { key: 'cloud-data-center-capacity', title: 'Cloud and data center capacity', pattern: /(cloud|data center|datacenter|server|capacity|gpu capacity|compute capacity|infrastructure|availability zone)/ },
  { key: 'ai-rd-technology', title: 'AI, R&D, and technology', pattern: /(artificial intelligence|generative ai|\bai\b|research and development|r&d|technology transition|innovation|technical|semiconductor design)/ },
  { key: 'geopolitics-tariffs', title: 'Geopolitics and tariffs', pattern: /(geopolitical|tariff|trade restriction|export control|sanction|china|taiwan|russia|ukraine|israel|middle east)/ },
  { key: 'customer-platform-dependency', title: 'Customer and platform dependency', pattern: /(customer concentration|major customer|platform|app store|oem|channel partner|strategic partner|dependency|ecosystem)/ },
  { key: 'inventory-channel', title: 'Inventory and channel', pattern: /(inventory|channel inventory|reseller|distributor|sell-through|sell-in|backlog|order cancellation)/ },
  { key: 'supply-chain', title: 'Supply chain', pattern: /(supply|supplier|manufactur|logistics|component|foundry|fab|assembly|procurement|shortage)/ },
  { key: 'competition', title: 'Competition', pattern: /(competition|competitor|competitive|pricing pressure|margin pressure|market share|substitute product)/ },
  { key: 'demand', title: 'Demand', pattern: /(demand|customer demand|consumer|sales volume|revenue|net sales|unit sales|end market|seasonality)/ },
  { key: 'liquidity', title: 'Liquidity', pattern: /(liquidity|cash|credit|interest rate|debt|capital market|financing|counterparty|investment portfolio)/ },
  { key: 'regulation-legal', title: 'Regulation and legal', pattern: /(regulation|regulatory|legal|litigation|compliance|government investigation|antitrust|intellectual property|tax law)/ },
  { key: 'macro-fx', title: 'Macro and foreign exchange', pattern: /(macroeconomic|inflation|recession|foreign currency|currency exchange|fx|interest rates|economic conditions)/ },
];

function classifyThemes(lower: string): Array<Pick<ThemeHit, 'key' | 'title'>> {
  return THEME_CATALOG.filter((theme) => theme.pattern.test(lower));
}

function isExplicitRealization(lower: string): boolean {
  if (hasNegatedImpact(lower)) return false;
  const hasActualTrigger = [
    /\b(resulted in|resulting in|caused|led to|has led to|have led to|has resulted in|have resulted in)\b.{0,140}\b(shortages?|delays?|declines?|decreases?|disruptions?|loss(?:es)?|impairments?|charges?|expenses?|costs?|outages?|breaches?|penalties|fines?|constraints?|reductions?|reduced sales|harmed|limited|constrained|remediation)\b/,
    /\b(we experienced|we incurred|we recorded|we recognized|we suffered|we wrote down|we wrote off)\b.{0,140}\b(shortages?|delays?|declines?|decreases?|disruptions?|loss(?:es)?|impairments?|charges?|expenses?|costs?|outages?|breaches?|penalties|fines?|constraints?|reductions?|inventory provisions?|remediation)\b/,
    /\b(shortages?|delays?|declines?|decreases?|disruptions?|loss(?:es)?|impairments?|charges?|expenses?|outages?|breaches?|penalties|fines?|constraints?|reductions?|incidents?)\b.{0,140}\b(adversely affected|materially affected|reduced|increased costs|lowered|limited|constrained|harmed|negatively impacted)\b/,
    /\b\d+(?:\.\d+)?\s?%\b.{0,140}\b(decline|decrease|increase in costs|reduction|adverse impact|headwind)\b/,
    /\$\s?\d+(?:\.\d+)?\s?(?:million|billion)\b.{0,140}\b(charge|cost|expense|loss|impairment|penalty|fine|provision)\b/,
  ].some((pattern) => pattern.test(lower));
  if (!hasActualTrigger) return false;
  return !isPurelyConditional(lower);
}

function hasNegatedImpact(lower: string): boolean {
  return /\b(has not|have not|did not|does not|do not|not expected to|not materially|no material|without material)\b.{0,80}\b(affected|impact|resulted|caused|led to|loss|charge|expense|cost|disruption|delay|decline)\b/.test(lower);
}

function isPurelyConditional(lower: string): boolean {
  const actualMarkers = /\b(resulted in|resulting in|caused|led to|has led|have led|has resulted|have resulted|we experienced|we incurred|we recorded|we recognized|we suffered|adversely affected|materially affected|was due to|were due to)\b/;
  if (actualMarkers.test(lower)) return false;
  return /\b(could|may|might|would|can|potential|future|if|not expected to)\b/.test(lower);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"$])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function evidenceWindow(sentences: string[], index: number): string {
  const parts = sentences.slice(Math.max(0, index - 1), Math.min(sentences.length, index + 2));
  return parts.join(' ').slice(0, 900).trim();
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
  return normalizeEvidenceText(input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\r/g, ''));
}

function normalizeEvidenceText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\r/g, '')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    ldquo: '"',
    lsquo: "'",
    nbsp: ' ',
    quot: '"',
    rdquo: '"',
    rsquo: "'",
    lt: '<',
  };
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) return codePointToString(Number.parseInt(key.slice(2), 16), match);
    if (key.startsWith('#')) return codePointToString(Number.parseInt(key.slice(1), 10), match);
    return named[key] ?? match;
  });
}

function codePointToString(value: number, fallback: string): string {
  if (!Number.isFinite(value)) return fallback;
  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
}

function hashText(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
