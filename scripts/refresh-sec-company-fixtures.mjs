#!/usr/bin/env node
/**
 * Refresh the reduced real-SEC fixture corpus used by sec-company tests.
 *
 * The script stores only eligible text sections, not full SEC HTML filings,
 * to keep the repository small while preserving real filing language.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const outRoot = path.join(repoRoot, 'packages/core/test/fixtures/sec-company/public-tech');
const companies = ['AAPL', 'MSFT', 'NVDA'];
const SEC_SUBMISSIONS = 'https://data.sec.gov/submissions';
const SEC_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
const TICKER_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_REQUEST_SPACING_MS = 200;
let lastSecRequestAt = 0;

const userAgent = process.env.FLYWHEEL_IDEAS_SEC_USER_AGENT;
if (!userAgent || !/contact:|@/.test(userAgent)) {
  throw new Error(
    'Set FLYWHEEL_IDEAS_SEC_USER_AGENT with contact text, e.g. ' +
      '"flywheel-ideas fixture refresh contact: you@example.com"',
  );
}

await fs.rm(outRoot, { recursive: true, force: true });
await fs.mkdir(outRoot, { recursive: true });

const tickerMap = await fetchJson(TICKER_URL);
for (const ticker of companies) {
  const identity = Object.values(tickerMap).find((row) => row.ticker === ticker);
  if (!identity) throw new Error(`ticker not found: ${ticker}`);

  const cik = padCik(String(identity.cik_str));
  const submissions = await fetchJson(`${SEC_SUBMISSIONS}/CIK${cik}.json`);
  const selected = selectFixtureFilings(cik, ticker, identity.title, submissions);
  const fixtureDir = path.join(outRoot, ticker.toLowerCase());
  await fs.mkdir(fixtureDir, { recursive: true });

  const manifest = { filings: [] };
  for (const filing of selected) {
    const url = filingDocumentUrl(cik, filing.accession_no, filing.primary_document);
    const raw = await fetchText(url);
    const sections = extractEligibleSections(raw, filing.form);
    if (sections.length === 0) {
      throw new Error(`no eligible sections extracted for ${ticker} ${filing.form} ${filing.filed_at}`);
    }
    const doc = `${ticker.toLowerCase()}-${filing.filed_at}-${filing.form.toLowerCase().replace(/[^a-z0-9]+/g, '')}.txt`;
    await fs.writeFile(path.join(fixtureDir, doc), renderSnapshot(sections), 'utf8');
    manifest.filings.push({
      ...filing,
      primary_document: doc,
      filing_url: url,
      fixture_note: 'Reduced text snapshot containing eligible SEC sections only.',
    });
    console.error(`${ticker} ${filing.form} ${filing.filed_at}: ${sections.map((s) => s.key).join(', ')}`);
  }

  await fs.writeFile(path.join(fixtureDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function selectFixtureFilings(cik, ticker, companyName, submissions) {
  const recent = submissions.filings?.recent;
  if (!recent) throw new Error(`no recent filings for ${ticker}`);
  const filings = [];
  for (let i = 0; i < recent.accessionNumber.length; i++) {
    const form = recent.form[i];
    if (form !== '10-K' && form !== '10-Q') continue;
    filings.push({
      cik,
      ticker,
      company_name: submissions.name ?? companyName,
      accession_no: recent.accessionNumber[i],
      form,
      filed_at: recent.filingDate[i],
      period: recent.reportDate[i],
      primary_document: recent.primaryDocument[i],
    });
  }
  const latest10k = filings.find((f) => f.form === '10-K');
  const latest10q = filings.find((f) => f.form === '10-Q');
  const older10k = filings
    .filter((f) => f.form === '10-K')
    .find((f) => Number(f.filed_at.slice(0, 4)) <= Number(latest10k.filed_at.slice(0, 4)) - 3);
  return [older10k, latest10k, latest10q]
    .filter(Boolean)
    .sort((a, b) => a.filed_at.localeCompare(b.filed_at));
}

function extractEligibleSections(raw, form) {
  const text = htmlToText(raw);
  const defs = form === '10-K'
    ? [
        ['item-1a', 'Item 1A Risk Factors', headingRegex(['item', '1a']), [headingRegex(['item', '1b']), headingRegex(['item', '2'])]],
        ['item-7', 'Item 7 MD&A', headingRegex(['item', '7']), [headingRegex(['item', '7a']), headingRegex(['item', '8'])]],
      ]
    : [
        ['part-i-item-2', 'Part I Item 2 MD&A', itemHeadingRegex('2'), [itemHeadingRegex('3'), partHeadingRegex('ii')]],
        ['part-ii-item-1a', 'Part II Item 1A Risk Factors', itemHeadingRegex('1a'), [itemHeadingRegex('2'), itemHeadingRegex('3')]],
      ];
  return defs.map(([key, title, start, ends]) => extractByHeading(text, key, title, start, ends)).filter(Boolean);
}

function extractByHeading(text, key, title, startRegex, endRegexes) {
  const lines = text.split(/\n+/);
  const starts = lines.flatMap((line, index) => (startRegex.test(normalizeHeading(line)) ? [index] : []));
  const candidates = starts
    .map((start) => collectSectionBody(lines, start, endRegexes))
    .filter(isSubstantiveSection)
    .sort((a, b) => scoreSection(b) - scoreSection(a));
  return candidates[0] ? { key, title, text: candidates[0].slice(0, 12000) } : null;
}

function collectSectionBody(lines, start, endRegexes) {
  const out = [];
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

function isSubstantiveSection(body) {
  if (body.length < 500) return false;
  if (body.split(/\s+/).filter(Boolean).length < 80) return false;
  if (body.toLowerCase().includes('table of contents') && body.length < 2000) return false;
  return /(risk|revenue|sales|operations|results|management|competition|customer|supplier|regulation|cyber|cash|cloud|inventory|demand)/i.test(body);
}

function scoreSection(body) {
  const lower = body.toLowerCase();
  const themeBonus = [
    /supply|supplier|manufactur|logistics|component|foundry/,
    /competition|competitor|pricing|market share/,
    /demand|customer|sales|revenue/,
    /cyber|privacy|data breach/,
    /cloud|data center|capacity|gpu/,
    /ai|artificial intelligence|r&d/,
    /regulation|legal|litigation/,
    /foreign currency|macroeconomic|inflation/,
  ].filter((pattern) => pattern.test(lower)).length * 500;
  return body.length + themeBonus;
}

function renderSnapshot(sections) {
  return `${sections.flatMap((section) => [section.title, '', section.text]).join('\n\n')}\n`;
}

async function fetchJson(url) {
  await throttleSecRequest();
  const res = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SEC fetch failed ${res.status}: ${url}`);
  return res.json();
}

async function fetchText(url) {
  await throttleSecRequest();
  const res = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'text/html,text/plain' } });
  if (!res.ok) throw new Error(`SEC filing fetch failed ${res.status}: ${url}`);
  return res.text();
}

async function throttleSecRequest() {
  const wait = Math.max(0, lastSecRequestAt + SEC_REQUEST_SPACING_MS - Date.now());
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastSecRequestAt = Date.now();
}

function htmlToText(input) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function headingRegex(parts) {
  return new RegExp(`^${parts.map(escapeRegex).join('[\\s\\.\\-:]*')}(?:\\b|\\s|\\.)`, 'i');
}

function partHeadingRegex(part) {
  return headingRegex(['part', part]);
}

function itemHeadingRegex(item) {
  return new RegExp(`^(?:part[\\s\\.\\-:]*[ivx]+[\\s\\.\\-:]+)?item[\\s\\.\\-:]*${escapeRegex(item)}(?:\\b|\\s|\\.)`, 'i');
}

function normalizeHeading(line) {
  return line
    .replace(/\u00a0/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[•·]/g, ' ')
    .trim()
    .toLowerCase();
}

function filingDocumentUrl(cik, accessionNo, doc) {
  return `${SEC_ARCHIVES}/${Number(cik)}/${accessionNo.replace(/-/g, '')}/${doc}`;
}

function padCik(cik) {
  return cik.replace(/\D/g, '').padStart(10, '0');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
