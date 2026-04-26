/**
 * `csv-corpus` import adapter — the wedge-test tool.
 *
 * Reads a JSONL file (one JSON object per line) and emits one idea +
 * N assumptions + 0|1 outcome per object. The adapter is the cheapest
 * way to feed a council against an arbitrary corpus without writing a
 * dedicated adapter for the source domain.
 *
 * The "csv" name is colloquial — the actual format is JSONL. CSV
 * cell-encoded JSON is a foot-gun (escaping quoted strings inside
 * comma-separated fields), so we skip it. JSONL keeps each row a
 * standalone JSON object the user can hand-edit.
 *
 * Source: absolute path or `file://` URL pointing at the `.jsonl` file.
 *
 * No network. Malformed lines are logged to stderr and skipped — a single
 * bad row should not kill the batch.
 *
 * Per-line shape (each line a JSON object):
 *   {
 *     "decision_id": "obj-001",
 *     "title": "...",
 *     "body": "...",                 // optional, defaults to title
 *     "status": "...",               // optional, free text
 *     "assumptions": [
 *       {"id": "asm-001-a", "text": "...",
 *        "load_bearing": true,        // optional, default true
 *        "outcome": "refuted",        // optional ground-truth tag
 *        "outcome_evidence": "..."}   // optional
 *     ],
 *     "outcome": {                    // optional whole-decision outcome
 *       "text": "...",
 *       "refutes": ["asm-001-a"],
 *       "validates": []
 *     }
 *   }
 *
 * Source URIs:
 *   - idea:       csv-corpus://<absPath>#row=<i>
 *   - assumption: csv-corpus://<absPath>#row=<i>/asm=<asm_id>
 *   - outcome:    csv-corpus://<absPath>#row=<i>/outcome
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ImportAdapterError,
  type ImportAdapter,
  type ImportContext,
  type RawCandidate,
} from '../adapter.js';

export const CSV_CORPUS_NAME = 'csv-corpus';

interface CorpusAssumption {
  id?: unknown;
  text?: unknown;
  load_bearing?: unknown;
  outcome?: unknown;
  outcome_evidence?: unknown;
  outcome_refs?: unknown;
}

interface CorpusOutcome {
  text?: unknown;
  refutes?: unknown;
  validates?: unknown;
}

interface CorpusEntry {
  decision_id?: unknown;
  title?: unknown;
  body?: unknown;
  status?: unknown;
  assumptions?: unknown;
  outcome?: unknown;
}

export class CsvCorpusAdapter implements ImportAdapter {
  readonly name = CSV_CORPUS_NAME;

  // eslint-disable-next-line require-yield
  async *scan(
    source: string,
    _ctx: ImportContext,
  ): AsyncGenerator<RawCandidate> {
    const absPath = resolveSourcePath(source);
    let raw: string;
    try {
      raw = await fsp.readFile(absPath, 'utf8');
    } catch (err) {
      throw new ImportAdapterError(
        `cannot read corpus file "${absPath}": ${err instanceof Error ? err.message : String(err)}`,
        this.name,
        source,
      );
    }

    const lines = raw.split('\n');
    let rowIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      rowIndex++;
      let entry: CorpusEntry;
      try {
        entry = JSON.parse(line) as CorpusEntry;
      } catch (err) {
        process.stderr.write(
          `[flywheel-ideas] csv-corpus: skipped row ${rowIndex} (line ${i + 1}): ` +
            `parse error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        continue;
      }

      yield* emitFromEntry(entry, rowIndex, absPath);
    }
  }
}

function* emitFromEntry(
  entry: CorpusEntry,
  rowIndex: number,
  absPath: string,
): Generator<RawCandidate> {
  const decisionId = stringOr(entry.decision_id, '').trim();
  const title = stringOr(entry.title, '').trim();
  if (!decisionId || !title) {
    process.stderr.write(
      `[flywheel-ideas] csv-corpus: skipped row ${rowIndex}: missing decision_id or title\n`,
    );
    return;
  }

  const baseUri = `csv-corpus://${absPath}#row=${rowIndex}`;
  const status = stringOrNull(entry.status);
  const body = stringOr(entry.body, title).trim();

  yield {
    kind: 'idea',
    title,
    bodyMd: renderIdeaBody(decisionId, title, status, body),
    extractedFields: {
      decision_id: decisionId,
      ...(status ? { status } : {}),
    },
    confidence: 0.9,
    sourceUri: baseUri,
  };

  const assumptions = Array.isArray(entry.assumptions) ? entry.assumptions : [];
  for (const a of assumptions) {
    if (!isObject(a)) continue;
    const asm = a as CorpusAssumption;
    const asmId = stringOr(asm.id, '').trim();
    const text = stringOr(asm.text, '').trim();
    if (!asmId || !text) {
      process.stderr.write(
        `[flywheel-ideas] csv-corpus: row ${rowIndex} assumption skipped: missing id or text\n`,
      );
      continue;
    }
    const loadBearing = asm.load_bearing === false ? false : true;
    yield {
      kind: 'assumption',
      title: truncate(text, 80),
      bodyMd: text,
      extractedFields: {
        decision_id: decisionId,
        corpus_id: asmId,
        load_bearing: loadBearing,
        ...(typeof asm.outcome === 'string' ? { outcome: asm.outcome } : {}),
        ...(typeof asm.outcome_evidence === 'string'
          ? { outcome_evidence: asm.outcome_evidence }
          : {}),
        ...(Array.isArray(asm.outcome_refs)
          ? { outcome_refs: asm.outcome_refs.filter((r): r is string => typeof r === 'string') }
          : {}),
      },
      confidence: 0.9,
      sourceUri: `${baseUri}/asm=${asmId}`,
    };
  }

  if (isObject(entry.outcome)) {
    const o = entry.outcome as CorpusOutcome;
    const outcomeText = stringOr(o.text, '').trim();
    if (outcomeText) {
      yield {
        kind: 'outcome',
        title: `Outcome: ${title}`,
        bodyMd: outcomeText,
        extractedFields: {
          decision_id: decisionId,
          ...(Array.isArray(o.refutes)
            ? { refutes: o.refutes.filter((r): r is string => typeof r === 'string') }
            : {}),
          ...(Array.isArray(o.validates)
            ? {
                validates: o.validates.filter(
                  (r): r is string => typeof r === 'string',
                ),
              }
            : {}),
        },
        confidence: 0.9,
        sourceUri: `${baseUri}/outcome`,
      };
    }
  }
}

function renderIdeaBody(
  decisionId: string,
  title: string,
  status: string | null,
  body: string,
): string {
  const parts: string[] = [`# ${title}`, ''];
  parts.push(`**Decision-ID:** ${decisionId}`);
  if (status) parts.push(`**Status:** ${status}`);
  parts.push('', body, '');
  return parts.join('\n').trim() + '\n';
}

function resolveSourcePath(source: string): string {
  if (source.startsWith('file://')) {
    try {
      return fileURLToPath(source);
    } catch (err) {
      throw new ImportAdapterError(
        `invalid file:// URL: ${source}`,
        CSV_CORPUS_NAME,
        source,
      );
    }
  }
  if (!path.isAbsolute(source)) {
    throw new ImportAdapterError(
      `csv-corpus source must be an absolute path or file:// URL (got: "${source}")`,
      CSV_CORPUS_NAME,
      source,
    );
  }
  return source;
}

function stringOr(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}
