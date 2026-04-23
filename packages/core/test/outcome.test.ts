import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import fc from 'fast-check';
import matter from 'gray-matter';
import {
  declareAssumption,
  deleteIdeasDbFiles,
  forgetOutcome,
  generateAssumptionId,
  generateCouncilSessionId,
  generateCouncilViewId,
  generateIdeaId,
  getAssumption,
  getOutcome,
  listOutcomes,
  logOutcome,
  openIdeasDb,
  OutcomeAlreadyUndoneError,
  OutcomeInputError,
  OutcomeNotFoundError,
  runMigrations,
  undoOutcome,
  type IdeasDatabase,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

let vault: string;
let db: IdeasDatabase;

async function makeIdea(title: string = 'test idea'): Promise<string> {
  const id = generateIdeaId();
  const relPath = `ideas/${id}.md`;
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, relPath, title, 'nascent', Date.now(), Date.now());
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(
    path.join(vault, relPath),
    `---\ntitle: ${title}\n---\n\nbody\n`,
    'utf8',
  );
  return id;
}

async function makeAssumption(idea_id: string, text: string = 'an assumption'): Promise<string> {
  const { assumption } = await declareAssumption(db, vault, {
    idea_id,
    text,
    load_bearing: true,
  });
  return assumption.id;
}

/**
 * Stubs a council session + view for `idea_id` that cites `assumption_ids`.
 * Does not spawn any CLI — just inserts the DB rows M12 needs to walk the
 * citation graph.
 */
function stubCitedCouncilSession(idea_id: string, assumption_ids: string[]): string {
  const session_id = generateCouncilSessionId();
  const view_id = generateCouncilViewId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(session_id, idea_id, 'light', 'standard', now, now, `councils/${idea_id}/session-01/SYNTHESIS.md`);
  db.prepare(
    `INSERT INTO ideas_council_views (
       id, session_id, model, persona,
       prompt_version, persona_version, model_version,
       input_hash,
       initial_stance, stance, self_critique, confidence,
       content_vault_path, failure_reason, stderr_tail
     ) VALUES (?, ?, 'claude', 'risk-pessimist', '1.0.0', '1.0.0', NULL, 'h',
               NULL, 'stance', NULL, 0.7,
               ?, NULL, NULL)`,
  ).run(view_id, session_id, `councils/${idea_id}/session-01/view.md`);
  const cstmt = db.prepare(
    `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
  );
  for (const asm_id of assumption_ids) cstmt.run(view_id, asm_id);
  return session_id;
}

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-outcome-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('logOutcome — input validation', () => {
  it('rejects missing idea_id', async () => {
    await expect(
      logOutcome(db, vault, { idea_id: '', text: 'x', refutes: ['asm-1'] }),
    ).rejects.toBeInstanceOf(OutcomeInputError);
  });

  it('rejects empty text', async () => {
    const ideaId = await makeIdea();
    await expect(
      logOutcome(db, vault, { idea_id: ideaId, text: '  ', refutes: ['asm-1'] }),
    ).rejects.toBeInstanceOf(OutcomeInputError);
  });

  it('rejects when refutes + validates both empty', async () => {
    const ideaId = await makeIdea();
    await expect(
      logOutcome(db, vault, { idea_id: ideaId, text: 'x' }),
    ).rejects.toThrow(/at least one/);
  });

  it('rejects when an assumption id is both refuted and validated', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    await expect(
      logOutcome(db, vault, {
        idea_id: ideaId,
        text: 'x',
        refutes: [asmId],
        validates: [asmId],
      }),
    ).rejects.toThrow(/both refuted and validated/);
  });

  it('rejects non-existent idea_id', async () => {
    await expect(
      logOutcome(db, vault, {
        idea_id: 'idea-missing',
        text: 'x',
        refutes: ['asm-whatever'],
      }),
    ).rejects.toThrow(/idea not found/);
  });

  it('rejects non-existent assumption id', async () => {
    const ideaId = await makeIdea();
    await expect(
      logOutcome(db, vault, {
        idea_id: ideaId,
        text: 'x',
        refutes: ['asm-missing'],
      }),
    ).rejects.toThrow(/assumption id\(s\) not found/);
  });

  it('rejects an assumption that belongs to a different idea', async () => {
    const ideaA = await makeIdea('A');
    const ideaB = await makeIdea('B');
    const asmB = await makeAssumption(ideaB, 'belongs to B');
    await expect(
      logOutcome(db, vault, {
        idea_id: ideaA,
        text: 'x',
        refutes: [asmB],
      }),
    ).rejects.toThrow(/do not belong to idea/);
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('logOutcome — happy path', () => {
  it('creates outcome row + verdict rows + markdown file', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const result = await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'Project landed. Assumption X failed.',
      refutes: [asmId],
    });

    expect(result.outcome.id).toMatch(/^out-/);
    expect(result.outcome.idea_id).toBe(ideaId);
    expect(result.outcome.vault_path).toMatch(/^outcomes\//);
    expect(result.outcome.undone_at).toBeNull();
    expect(result.refuted).toEqual([asmId]);
    expect(result.validated).toEqual([]);

    const verdicts = db
      .prepare(`SELECT assumption_id, verdict FROM ideas_outcome_verdicts WHERE outcome_id = ?`)
      .all(result.outcome.id);
    expect(verdicts).toEqual([{ assumption_id: asmId, verdict: 'refuted' }]);

    const mdPath = path.join(vault, result.outcome.vault_path);
    const md = await fsp.readFile(mdPath, 'utf8');
    const parsed = matter(md);
    expect(parsed.data.type).toBe('outcome');
    expect(parsed.data.id).toBe(result.outcome.id);
    expect(parsed.data.idea_id).toBe(ideaId);
    expect(parsed.data.refutes).toEqual([asmId]);
    expect(parsed.data.undone_at).toBeNull();
  });

  it('marks refuted assumptions with status=refuted + refuted_at', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const result = await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'X',
      refutes: [asmId],
    });
    const asm = getAssumption(db, asmId);
    expect(asm?.status).toBe('refuted');
    expect(asm?.refuted_at).toBe(result.outcome.landed_at);
  });

  it('marks validated assumptions with status=held', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'X',
      validates: [asmId],
    });
    const asm = getAssumption(db, asmId);
    expect(asm?.status).toBe('held');
  });

  it('syncs assumption markdown frontmatter best-effort', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const asm = getAssumption(db, asmId);
    await logOutcome(db, vault, { idea_id: ideaId, text: 'X', refutes: [asmId] });
    const md = await fsp.readFile(path.join(vault, asm!.vault_path), 'utf8');
    const parsed = matter(md);
    expect(parsed.data.status).toBe('refuted');
  });

  it('validates-only outcome has no flagged_ideas (no propagation)', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const result = await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'X',
      validates: [asmId],
    });
    expect(result.flagged_ideas).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Propagation — the compounding mechanism
// ---------------------------------------------------------------------------

describe('logOutcome — propagation', () => {
  it('flags a single dependent idea when 1 assumption cited by 1 other idea is refuted', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);

    const ideaB = await makeIdea('B');
    stubCitedCouncilSession(ideaB, [asmA]); // idea B's council cited asmA

    const result = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'A shipped, asmA wrong',
      refutes: [asmA],
    });

    expect(result.flagged_ideas).toHaveLength(1);
    expect(result.flagged_ideas[0].id).toBe(ideaB);
    const bRow = db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaB) as
      | { needs_review: number }
      | undefined;
    expect(bRow?.needs_review).toBe(1);
  });

  it('flags multiple dependent ideas across multiple sessions', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);

    const ideaB = await makeIdea('B');
    const ideaC = await makeIdea('C');
    const ideaD = await makeIdea('D');
    stubCitedCouncilSession(ideaB, [asmA]);
    stubCitedCouncilSession(ideaC, [asmA]);
    stubCitedCouncilSession(ideaD, [asmA]);

    const result = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'X',
      refutes: [asmA],
    });

    expect(result.flagged_ideas.map((f) => f.id).sort()).toEqual([ideaB, ideaC, ideaD].sort());
  });

  it('does NOT flag an idea that never cited the refuted assumption', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const ideaB = await makeIdea('B');
    const asmB = await makeAssumption(ideaB);
    stubCitedCouncilSession(ideaB, [asmB]); // B cites ONLY its own asmB

    const result = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'X',
      refutes: [asmA],
    });

    expect(result.flagged_ideas).toHaveLength(0);
  });

  it('flags idea ONCE even when assumption cited across multiple views in same session', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const ideaB = await makeIdea('B');

    // B's council session cites asmA from 2 different views
    const session_id = generateCouncilSessionId();
    db.prepare(
      `INSERT INTO ideas_council_sessions (id, idea_id, depth, mode, started_at, completed_at, synthesis_vault_path)
       VALUES (?, ?, 'light', 'standard', 1, 1, 's')`,
    ).run(session_id, ideaB);
    for (let i = 0; i < 2; i++) {
      const view_id = generateCouncilViewId();
      db.prepare(
        `INSERT INTO ideas_council_views (id, session_id, model, persona, prompt_version, persona_version, model_version, input_hash, initial_stance, stance, self_critique, confidence, content_vault_path, failure_reason, stderr_tail)
         VALUES (?, ?, 'claude', 'risk-pessimist', '1', '1', NULL, 'h', NULL, 's', NULL, 0.5, ?, NULL, NULL)`,
      ).run(view_id, session_id, `p${i}.md`);
      db.prepare(
        `INSERT INTO ideas_assumption_citations (view_id, assumption_id) VALUES (?, ?)`,
      ).run(view_id, asmA);
    }

    const result = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'X',
      refutes: [asmA],
    });
    expect(result.flagged_ideas).toHaveLength(1);
    expect(result.flagged_ideas[0].id).toBe(ideaB);
  });

  it('does NOT flag the idea that owns the refuted assumption (self-refutation)', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    stubCitedCouncilSession(ideaA, [asmA]); // A's own council cited asmA

    const result = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'X',
      refutes: [asmA],
    });
    expect(result.flagged_ideas.find((f) => f.id === ideaA)).toBeUndefined();
    const aRow = db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaA) as
      | { needs_review: number }
      | undefined;
    expect(aRow?.needs_review).toBe(0);
  });

  it('syncs needs_review:true to flagged ideas\' markdown frontmatter (alpha.4 fix 5)', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const ideaB = await makeIdea('B-flagged');
    const ideaC = await makeIdea('C-flagged');
    stubCitedCouncilSession(ideaB, [asmA]);
    stubCitedCouncilSession(ideaC, [asmA]);

    const result = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'A shipped, asmA refuted',
      refutes: [asmA],
    });

    expect(result.flagged_ideas.map((f) => f.id).sort()).toEqual([ideaB, ideaC].sort());

    // Both flagged ideas should now have needs_review: true in frontmatter
    for (const id of [ideaB, ideaC]) {
      const row = db.prepare('SELECT vault_path FROM ideas_notes WHERE id = ?').get(id) as { vault_path: string };
      const raw = await fsp.readFile(path.join(vault, row.vault_path), 'utf8');
      const fm = matter(raw).data;
      expect(fm.needs_review).toBe(true);
    }

    // The owning idea (A) was NOT flagged — frontmatter should not have needs_review or it should be falsy
    const aRow = db.prepare('SELECT vault_path FROM ideas_notes WHERE id = ?').get(ideaA) as { vault_path: string };
    const aRaw = await fsp.readFile(path.join(vault, aRow.vault_path), 'utf8');
    const aFm = matter(aRaw).data;
    expect(aFm.needs_review).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

describe('undoOutcome', () => {
  it('reverses assumption status and clears needs_review on dependent ideas', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const ideaB = await makeIdea('B');
    stubCitedCouncilSession(ideaB, [asmA]);

    const log = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'X',
      refutes: [asmA],
    });
    expect(getAssumption(db, asmA)?.status).toBe('refuted');

    await undoOutcome(db, vault, log.outcome.id);
    expect(getAssumption(db, asmA)?.status).toBe('open');
    expect(getAssumption(db, asmA)?.refuted_at).toBeNull();

    const bRow = db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaB) as
      | { needs_review: number }
      | undefined;
    expect(bRow?.needs_review).toBe(0);

    const outcome = getOutcome(db, log.outcome.id);
    expect(outcome?.undone_at).not.toBeNull();
  });

  it('syncs needs_review:false to cleared idea\'s markdown frontmatter (alpha.4 fix 5)', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const ideaB = await makeIdea('B');
    stubCitedCouncilSession(ideaB, [asmA]);

    const log = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'A shipped, asmA refuted',
      refutes: [asmA],
    });

    // After log, ideaB's frontmatter should have needs_review: true
    const bRow = db.prepare('SELECT vault_path FROM ideas_notes WHERE id = ?').get(ideaB) as { vault_path: string };
    let raw = await fsp.readFile(path.join(vault, bRow.vault_path), 'utf8');
    expect(matter(raw).data.needs_review).toBe(true);

    // After undo, ideaB's frontmatter should have needs_review: false
    await undoOutcome(db, vault, log.outcome.id);
    raw = await fsp.readFile(path.join(vault, bRow.vault_path), 'utf8');
    expect(matter(raw).data.needs_review).toBe(false);
  });

  it('throws OutcomeAlreadyUndoneError on second undo', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const log = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'X',
      refutes: [asmA],
    });
    await undoOutcome(db, vault, log.outcome.id);
    await expect(undoOutcome(db, vault, log.outcome.id)).rejects.toBeInstanceOf(
      OutcomeAlreadyUndoneError,
    );
  });

  it('throws OutcomeNotFoundError for unknown id', async () => {
    await expect(undoOutcome(db, vault, 'out-missing')).rejects.toBeInstanceOf(
      OutcomeNotFoundError,
    );
  });

  it('MULTI-OUTCOME: undoing Y leaves X flagged if Z still refutes asm B that X cites', async () => {
    const ideaA = await makeIdea('A');
    const asmAFirst = await makeAssumption(ideaA, 'first');
    const asmASecond = await makeAssumption(ideaA, 'second');

    const ideaX = await makeIdea('X');
    // X cites BOTH assumptions
    stubCitedCouncilSession(ideaX, [asmAFirst, asmASecond]);

    // Y refutes first, Z refutes second
    const Y = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'Y',
      refutes: [asmAFirst],
    });
    const Z = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'Z',
      refutes: [asmASecond],
    });

    // Both refutes → X flagged
    expect(
      (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaX) as any)
        ?.needs_review,
    ).toBe(1);

    // Undo Y → first reopens, but X cites second which Z still refutes → X stays flagged
    await undoOutcome(db, vault, Y.outcome.id);
    expect(getAssumption(db, asmAFirst)?.status).toBe('open');
    expect(getAssumption(db, asmASecond)?.status).toBe('refuted'); // Z still active
    expect(
      (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaX) as any)
        ?.needs_review,
    ).toBe(1);

    // Now undo Z → second reopens → X clears
    await undoOutcome(db, vault, Z.outcome.id);
    expect(getAssumption(db, asmASecond)?.status).toBe('open');
    expect(
      (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaX) as any)
        ?.needs_review,
    ).toBe(0);
  });

  it('STACKED REFUTATION: 2 outcomes refute same assumption; undoing one keeps it refuted', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);

    const Y = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'Y',
      refutes: [asmA],
    });
    // Small delay before Z so landed_at differs (Y earliest)
    await new Promise((r) => setTimeout(r, 5));
    const Z = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'Z',
      refutes: [asmA],
    });

    // Both refute → status=refuted
    expect(getAssumption(db, asmA)?.status).toBe('refuted');

    // Undo Z → A should still be refuted via Y; refuted_at = Y.landed_at
    await undoOutcome(db, vault, Z.outcome.id);
    const asmAfter = getAssumption(db, asmA);
    expect(asmAfter?.status).toBe('refuted');
    expect(asmAfter?.refuted_at).toBe(Y.outcome.landed_at);

    // Undo Y also → now finally open, refuted_at null
    await undoOutcome(db, vault, Y.outcome.id);
    const asmFinal = getAssumption(db, asmA);
    expect(asmFinal?.status).toBe('open');
    expect(asmFinal?.refuted_at).toBeNull();
  });

  it('refuted_at points at EARLIEST still-active refuter after undo (gemini pass 2 HIGH regression guard)', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const Y = await logOutcome(db, vault, { idea_id: ideaA, text: 'Y', refutes: [asmA] });
    await new Promise((r) => setTimeout(r, 5));
    const Z = await logOutcome(db, vault, { idea_id: ideaA, text: 'Z', refutes: [asmA] });

    // Y was first → assumption.refuted_at == Y.landed_at
    expect(getAssumption(db, asmA)?.refuted_at).toBe(Y.outcome.landed_at);

    // Undo Y → refuted_at should jump to Z's landed_at (since Y no longer active)
    await undoOutcome(db, vault, Y.outcome.id);
    expect(getAssumption(db, asmA)?.status).toBe('refuted');
    expect(getAssumption(db, asmA)?.refuted_at).toBe(Z.outcome.landed_at);
  });
});

// ---------------------------------------------------------------------------
// Property tests (fast-check)
// ---------------------------------------------------------------------------

describe('property tests — propagation + undo invariants', () => {
  it('round-trip: log + undo leaves DB state equivalent (assumption status + needs_review)', async () => {
    const ideaA = await makeIdea('A');
    const asmA = await makeAssumption(ideaA);
    const ideaB = await makeIdea('B');
    stubCitedCouncilSession(ideaB, [asmA]);

    const preStatus = getAssumption(db, asmA)?.status;
    const preReview = (db
      .prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`)
      .get(ideaB) as any)?.needs_review;

    const log = await logOutcome(db, vault, {
      idea_id: ideaA,
      text: 'roundtrip',
      refutes: [asmA],
    });
    await undoOutcome(db, vault, log.outcome.id);

    expect(getAssumption(db, asmA)?.status).toBe(preStatus);
    expect(
      (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaB) as any)
        ?.needs_review,
    ).toBe(preReview);
  });

  it('undo commutativity: any permutation of undos → identical final state (fast-check)', async () => {
    // Seed: 1 owning idea, 3 assumptions, 2 dependent ideas citing different
    // subsets. Then log 3 outcomes refuting overlapping sets. Undo in any
    // permutation → final state (all assumption statuses + needs_review flags)
    // must be identical.
    await fc.assert(
      fc.asyncProperty(
        fc.shuffledSubarray([0, 1, 2], { minLength: 3, maxLength: 3 }),
        async (permutation) => {
          // Fresh DB per property iteration (manual reset)
          db.close();
          deleteIdeasDbFiles(vault);
          await fsp.rm(vault, { recursive: true, force: true });
          vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-prop-'));
          await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
          db = openIdeasDb(vault);
          runMigrations(db);

          const ideaA = await makeIdea('A');
          const asm1 = await makeAssumption(ideaA, 'a1');
          const asm2 = await makeAssumption(ideaA, 'a2');
          const asm3 = await makeAssumption(ideaA, 'a3');
          const ideaX = await makeIdea('X');
          const ideaY = await makeIdea('Y');
          stubCitedCouncilSession(ideaX, [asm1, asm2]);
          stubCitedCouncilSession(ideaY, [asm2, asm3]);

          const O1 = await logOutcome(db, vault, {
            idea_id: ideaA,
            text: 'o1',
            refutes: [asm1],
          });
          const O2 = await logOutcome(db, vault, {
            idea_id: ideaA,
            text: 'o2',
            refutes: [asm2],
          });
          const O3 = await logOutcome(db, vault, {
            idea_id: ideaA,
            text: 'o3',
            refutes: [asm3],
          });

          const outcomes = [O1, O2, O3];
          // Undo in permutation order
          for (const idx of permutation) {
            await undoOutcome(db, vault, outcomes[idx].outcome.id);
          }

          // All undone → all assumptions back to open, both ideas cleared
          expect(getAssumption(db, asm1)?.status).toBe('open');
          expect(getAssumption(db, asm2)?.status).toBe('open');
          expect(getAssumption(db, asm3)?.status).toBe('open');
          expect(
            (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaX) as any)
              ?.needs_review,
          ).toBe(0);
          expect(
            (db.prepare(`SELECT needs_review FROM ideas_notes WHERE id = ?`).get(ideaY) as any)
              ?.needs_review,
          ).toBe(0);
        },
      ),
      { numRuns: 8 },
    );
  }, 60_000);
});

// ---------------------------------------------------------------------------
// list / get / forget
// ---------------------------------------------------------------------------

describe('listOutcomes / getOutcome / forgetOutcome', () => {
  it('listOutcomes returns newest first', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const a = await logOutcome(db, vault, { idea_id: ideaId, text: 'a', refutes: [asmId] });
    // can't reuse refuted assumption → validate it back via another outcome
    // Actually we'll just use a different assumption.
    const asmId2 = await makeAssumption(ideaId, 'second');
    await new Promise((r) => setTimeout(r, 3));
    const b = await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'b',
      validates: [asmId2],
    });
    const { outcomes } = listOutcomes(db, vault, { idea_id: ideaId });
    expect(outcomes.map((o) => o.id)).toEqual([b.outcome.id, a.outcome.id]);
  });

  it('listOutcomes filters stale (file missing)', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const log = await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'x',
      refutes: [asmId],
    });
    await fsp.unlink(path.join(vault, log.outcome.vault_path));
    const { outcomes, stale_hidden } = listOutcomes(db, vault);
    expect(outcomes).toHaveLength(0);
    expect(stale_hidden).toBe(1);
  });

  it('forgetOutcome removes row', async () => {
    const ideaId = await makeIdea();
    const asmId = await makeAssumption(ideaId);
    const log = await logOutcome(db, vault, {
      idea_id: ideaId,
      text: 'x',
      refutes: [asmId],
    });
    expect(forgetOutcome(db, log.outcome.id)).toBe(true);
    expect(getOutcome(db, log.outcome.id)).toBeNull();
  });
});

// Use generateAssumptionId to silence unused-import if tests don't hit it
void generateAssumptionId;
