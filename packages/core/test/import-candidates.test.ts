import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CandidateStateError,
  createImportSource,
  getCandidate,
  getImportSource,
  listCandidates,
  markCandidateImported,
  markCandidateRejected,
  openInMemoryIdeasDb,
  parseExtractedFields,
  persistCandidate,
  runMigrations,
  type IdeasDatabase,
  type RawCandidate,
} from '../src/index.js';

let db: IdeasDatabase;

beforeEach(() => {
  db = openInMemoryIdeasDb();
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

function raw(overrides: Partial<RawCandidate> = {}): RawCandidate {
  return {
    kind: 'idea',
    title: 'Sample',
    bodyMd: '# Sample\n\nA candidate body.',
    confidence: 0.8,
    sourceUri: 'fixture://sample',
    extractedFields: { foo: 'bar' },
    ...overrides,
  };
}

describe('createImportSource + getImportSource', () => {
  it('creates a source row and looks it up', () => {
    const src = createImportSource(db, {
      adapter: 'test-adapter',
      source_uri: 'fixture://x',
      scan_config: { filter: 'foo' },
    });
    expect(src.id).toMatch(/^src-/);
    const loaded = getImportSource(db, src.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.adapter).toBe('test-adapter');
    expect(loaded!.scan_config_json).toContain('foo');
  });
});

describe('persistCandidate', () => {
  it('writes all structured fields including extracted JSON', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw({ confidence: 0.95 }),
    });
    const loaded = getCandidate(db, c.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.confidence).toBe(0.95);
    expect(loaded!.state).toBe('pending');
    const fields = parseExtractedFields(loaded!);
    expect(fields).toEqual({ foo: 'bar' });
  });

  it('persists dedup match fields when supplied', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw(),
      state: 'duplicate',
      dedup_match_path: 'ideas/existing.md',
      dedup_match_score: 0.92,
    });
    const loaded = getCandidate(db, c.id);
    expect(loaded!.state).toBe('duplicate');
    expect(loaded!.dedup_match_path).toBe('ideas/existing.md');
    expect(loaded!.dedup_match_score).toBe(0.92);
  });
});

describe('listCandidates', () => {
  it('filters by state + kind + source', () => {
    const srcA = createImportSource(db, { adapter: 'a', source_uri: 'ua' });
    const srcB = createImportSource(db, { adapter: 'b', source_uri: 'ub' });
    persistCandidate(db, { source_id: srcA.id, adapter: 'a', candidate: raw({ kind: 'idea' }) });
    persistCandidate(db, { source_id: srcA.id, adapter: 'a', candidate: raw({ kind: 'assumption', title: 'asm-A' }) });
    persistCandidate(db, { source_id: srcB.id, adapter: 'b', candidate: raw({ kind: 'idea', title: 'idea-B' }), state: 'duplicate' });

    expect(listCandidates(db, { source_id: srcA.id }).length).toBe(2);
    expect(listCandidates(db, { candidate_kind: 'idea' }).length).toBe(2);
    expect(listCandidates(db, { state: 'duplicate' }).length).toBe(1);
    expect(listCandidates(db, { state: 'pending', candidate_kind: 'assumption' }).length).toBe(1);
  });
});

describe('markCandidateImported', () => {
  it('flips state from pending → imported and stores vault path', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, { source_id: src.id, adapter: 'a', candidate: raw() });
    markCandidateImported(db, {
      id: c.id,
      imported_vault_path: 'ideas/2026/04/sample-123456.md',
      imported_entity_id: 'idea-xyz',
    });
    const loaded = getCandidate(db, c.id)!;
    expect(loaded.state).toBe('imported');
    expect(loaded.imported_vault_path).toBe('ideas/2026/04/sample-123456.md');
    expect(loaded.imported_entity_id).toBe('idea-xyz');
    expect(loaded.imported_at).not.toBeNull();
  });

  it('throws when the row is already imported', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, { source_id: src.id, adapter: 'a', candidate: raw() });
    markCandidateImported(db, {
      id: c.id,
      imported_vault_path: 'x.md',
      imported_entity_id: 'idea-1',
    });
    expect(() =>
      markCandidateImported(db, {
        id: c.id,
        imported_vault_path: 'y.md',
        imported_entity_id: 'idea-2',
      }),
    ).toThrow(CandidateStateError);
  });

  it('accepts promotion of duplicate-flagged rows', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw(),
      state: 'duplicate',
    });
    markCandidateImported(db, {
      id: c.id,
      imported_vault_path: 'x.md',
      imported_entity_id: 'idea-1',
    });
    expect(getCandidate(db, c.id)!.state).toBe('imported');
  });
});

describe('markCandidateRejected', () => {
  it('flips to rejected', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, { source_id: src.id, adapter: 'a', candidate: raw() });
    markCandidateRejected(db, c.id);
    expect(getCandidate(db, c.id)!.state).toBe('rejected');
  });

  it('refuses to re-reject imported rows', () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, { source_id: src.id, adapter: 'a', candidate: raw() });
    markCandidateImported(db, { id: c.id, imported_vault_path: 'x.md', imported_entity_id: 'idea-1' });
    expect(() => markCandidateRejected(db, c.id)).toThrow(CandidateStateError);
  });
});
