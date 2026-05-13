/**
 * Doc-mode consistency doctor tests.
 *
 * Doc mode is intra-file (no DB ↔ markdown mirror), so the invariants
 * differ from sqlite mode: round-trip byte-identical, frontmatter state
 * agrees with the verdict block, transition timestamps monotonic,
 * required sections present and well-formed.
 *
 * These tests construct broken fixtures by hand-writing files under
 * `<vault>/ideas-doc/` and asserting each violation surfaces as the
 * right ConsistencyIssueKind.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildConsistencyDoctorReport,
  DOC_MODE_FOLDER,
  openIdeasDb,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;
let canonicalMinimal: string;

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-doctor-docmode-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  await fsp.mkdir(path.join(vault, DOC_MODE_FOLDER), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
  canonicalMinimal = await loadCanonicalMinimal();
});

afterEach(async () => {
  db.close();
  await fsp.rm(vault, { recursive: true, force: true });
});

async function writeFile(name: string, content: string): Promise<void> {
  await fsp.writeFile(path.join(vault, DOC_MODE_FOLDER, name), content, 'utf8');
}

async function loadCanonicalMinimal(): Promise<string> {
  // Load the shared format-spec fixture so this test exercises the
  // exact bytes the format-conformance test already proves round-trip.
  return fsp.readFile(
    path.join(__dirname, 'fixtures', 'single-doc', 'minimal.md'),
    'utf8',
  );
}

describe('doctor.consistency doc-mode — clean vault', () => {
  it('reports ok=true when ideas-doc/ has no files', async () => {
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(true);
    expect(report.issue_count).toBe(0);
  });

  it('reports ok=true when a canonical minimal file is present', async () => {
    await writeFile('canon.md', canonicalMinimal);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(true);
    expect(report.issue_count).toBe(0);
  });

  it('mode defaults to sqlite (backward compat)', async () => {
    // Place a broken doc file. Default mode must NOT inspect it.
    await writeFile('broken.md', 'not even close to the format');
    const report = await buildConsistencyDoctorReport(db, vault);
    expect(report.ok).toBe(true);
    expect(report.counts.doc_malformed_section).toBe(0);
  });
});

describe('doctor.consistency doc-mode — issue detection', () => {
  it('flags malformed file as doc_malformed_section', async () => {
    await writeFile('bad.md', 'not a frontmatter file at all');
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_malformed_section).toBe(1);
    expect(report.issues[0].path).toBe(`${DOC_MODE_FOLDER}/bad.md`);
  });

  it('flags out-of-order evidence log as doc_transition_out_of_order', async () => {
    const content = canonicalMinimal.replace(
      '## Evidence log\n',
      '## Evidence log\n- 2026-05-02T09:00:00Z — later first\n- 2026-04-18T14:22:00Z — earlier second\n',
    );
    await writeFile('out-of-order.md', content);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_transition_out_of_order).toBe(1);
  });

  it('flags missing required section as doc_malformed_section', async () => {
    const content = canonicalMinimal.replace('## Lesson\n', '');
    await writeFile('missing-section.md', content);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_malformed_section).toBe(1);
    expect(report.issues[0].detail).toMatch(/missing required section/);
  });

  it('flags state/verdict mismatch when state=refuted but verdict is empty', async () => {
    const content = canonicalMinimal.replace(
      'state: nascent',
      'state: refuted',
    );
    await writeFile('mismatch.md', content);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_state_verdict_mismatch).toBe(1);
    const mismatch = report.issues.find((i) => i.kind === 'doc_state_verdict_mismatch');
    expect(mismatch?.detail).toMatch(/requires a verdict block/);
  });

  it('flags state/verdict mismatch when verdict.state disagrees with frontmatter state', async () => {
    const content = canonicalMinimal.replace('state: nascent', 'state: validated').replace(
      '## Verdict\n',
      '## Verdict\nstate: fail\nrationale: but the frontmatter says validated\n',
    );
    await writeFile('disagree.md', content);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_state_verdict_mismatch).toBe(1);
  });

  it('flags created_at > updated_at as doc_transition_out_of_order', async () => {
    const content = canonicalMinimal
      .replace('created_at: 2026-05-13T10:00:00Z', 'created_at: 2026-06-01T10:00:00Z')
      .replace('updated_at: 2026-05-13T10:00:00Z', 'updated_at: 2026-05-13T10:00:00Z');
    await writeFile('backwards.md', content);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_transition_out_of_order).toBeGreaterThanOrEqual(1);
  });

  it('flags round-trip violation when file has extra trailing whitespace', async () => {
    // Adds a trailing blank line that the renderer would have stripped.
    const content = canonicalMinimal + '\n';
    await writeFile('extra-blank.md', content);
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'doc' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_round_trip_failed).toBe(1);
    expect(report.issues[0].severity).toBe('warning');
  });
});

describe('doctor.consistency mode: both', () => {
  it('runs both inspectors and aggregates counts', async () => {
    // Drop a malformed doc file alongside an empty sqlite ledger.
    await writeFile('bad.md', 'malformed');
    const report = await buildConsistencyDoctorReport(db, vault, { mode: 'both' });
    expect(report.ok).toBe(false);
    expect(report.counts.doc_malformed_section).toBe(1);
    // sqlite-side counts all stay zero on an empty DB
    expect(report.counts.missing_markdown).toBe(0);
    expect(report.counts.orphan_markdown).toBe(0);
  });
});
