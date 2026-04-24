import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import matter from 'gray-matter';
import {
  CandidateStateError,
  createImportSource,
  createIdea,
  deleteIdeasDbFiles,
  getCandidate,
  openIdeasDb,
  persistCandidate,
  promoteCandidate,
  PromoteValidationError,
  runMigrations,
  type IdeasDatabase,
  type RawCandidate,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

function raw(overrides: Partial<RawCandidate> = {}): RawCandidate {
  return {
    kind: 'idea',
    title: 'Imported Decision',
    bodyMd: '# Imported Decision\n\nBody from a PEP.',
    confidence: 0.9,
    sourceUri: 'fixture://sample',
    extractedFields: {},
    ...overrides,
  };
}

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-import-promote-'));
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

describe('promoteCandidate(as=idea)', () => {
  it('writes the markdown note + flips row to imported', async () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, { source_id: src.id, adapter: 'a', candidate: raw() });

    const result = await promoteCandidate(db, vault, {
      candidate_id: c.id,
      as: 'idea',
    });

    expect(result.kind).toBe('idea');
    expect(result.promoted_id).toMatch(/^idea-/);
    expect(result.vault_path).toMatch(/^ideas\/\d{4}\/\d{2}\/.+\.md$/);

    const full = path.join(vault, result.vault_path);
    const raw_text = await fsp.readFile(full, 'utf8');
    const parsed = matter(raw_text);
    expect(parsed.data.type).toBe('idea');
    expect(parsed.data.title).toBe('Imported Decision');

    const row = getCandidate(db, c.id)!;
    expect(row.state).toBe('imported');
    expect(row.imported_entity_id).toBe(result.promoted_id);
  });

  it('refuses promotion when kind mismatches', async () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw({ kind: 'assumption' }),
    });

    await expect(
      promoteCandidate(db, vault, { candidate_id: c.id, as: 'idea' }),
    ).rejects.toBeInstanceOf(PromoteValidationError);
  });

  it('refuses promotion of a duplicate without override', async () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw(),
      state: 'duplicate',
      dedup_match_path: 'ideas/existing.md',
      dedup_match_score: 0.95,
    });

    await expect(
      promoteCandidate(db, vault, { candidate_id: c.id, as: 'idea' }),
    ).rejects.toBeInstanceOf(PromoteValidationError);

    const withOverride = await promoteCandidate(db, vault, {
      candidate_id: c.id,
      as: 'idea',
      override_duplicate: true,
    });
    expect(withOverride.kind).toBe('idea');
  });

  it('refuses re-promotion of imported rows', async () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, { source_id: src.id, adapter: 'a', candidate: raw() });
    await promoteCandidate(db, vault, { candidate_id: c.id, as: 'idea' });
    await expect(
      promoteCandidate(db, vault, { candidate_id: c.id, as: 'idea' }),
    ).rejects.toBeInstanceOf(CandidateStateError);
  });
});

describe('promoteCandidate(as=assumption)', () => {
  it('requires target_idea_id', async () => {
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw({ kind: 'assumption', title: 'An assumption' }),
    });
    await expect(
      promoteCandidate(db, vault, { candidate_id: c.id, as: 'assumption' }),
    ).rejects.toBeInstanceOf(PromoteValidationError);
  });

  it('writes an assumption bound to an existing idea', async () => {
    const idea = await createIdea(db, vault, { title: 'Parent Idea' });
    const src = createImportSource(db, { adapter: 'a', source_uri: 'u' });
    const c = persistCandidate(db, {
      source_id: src.id,
      adapter: 'a',
      candidate: raw({
        kind: 'assumption',
        title: 'Shared API assumption',
        bodyMd: 'We assume upstream keeps the API stable for 12 months.',
      }),
    });
    const result = await promoteCandidate(db, vault, {
      candidate_id: c.id,
      as: 'assumption',
      target_idea_id: idea.id,
    });
    expect(result.kind).toBe('assumption');
    expect(result.promoted_id).toMatch(/^asm-/);
    expect(result.vault_path).toMatch(/^assumptions\/.+\.md$/);
  });
});
