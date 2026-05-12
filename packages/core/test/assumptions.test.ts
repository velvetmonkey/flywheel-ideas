import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import fc from 'fast-check';
import matter from 'gray-matter';
import {
  buildAssumptionNextStepsForIdea,
  declareAssumption,
  findDueSignposts,
  forgetAssumption,
  getAssumption,
  IdeaNotFoundError,
  AssumptionInputError,
  AssumptionNotFoundError,
  listAssumptions,
  lockAssumption,
  openIdeasDb,
  openInMemoryIdeasDb,
  renderYStatement,
  runMigrations,
  unlockAssumption,
  type IdeasDatabase,
} from '../src/index.js';

let vault: string;
let db: IdeasDatabase;

function isoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

async function seedIdea(id: string = 'idea-a'): Promise<void> {
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, `ideas/${id}.md`, 'Seed idea', 'nascent', 1, 1);
}

beforeEach(async () => {
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-asm-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  db.close();
  await fsp.rm(vault, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// renderYStatement
// ---------------------------------------------------------------------------

describe('renderYStatement', () => {
  it('produces a recognizable Y-statement body', () => {
    const body = renderYStatement({
      context: 'SMB CRM',
      challenge: 'low retention',
      decision: 'pricing is the blocker',
      tradeoff: 'may be onboarding instead',
    });
    expect(body).toContain('In the context of');
    expect(body).toContain('**SMB CRM**');
    expect(body).toContain('**low retention**');
    expect(body).toContain('**pricing is the blocker**');
    expect(body).toContain('**may be onboarding instead**');
  });

  it('passes values through verbatim (does not escape markdown)', () => {
    const body = renderYStatement({
      context: 'ctx with `code`',
      challenge: '[link](x)',
      decision: '*emphasis*',
      tradeoff: '# h1 symbol',
    });
    expect(body).toContain('`code`');
    expect(body).toContain('[link](x)');
    expect(body).toContain('*emphasis*');
    expect(body).toContain('# h1 symbol');
  });
});

// ---------------------------------------------------------------------------
// declareAssumption — happy paths
// ---------------------------------------------------------------------------

describe('declareAssumption — structured', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('writes the markdown note + DB row with Y-statement body', async () => {
    const now = Date.UTC(2026, 4, 11, 12, 0, 0);
    const signpostAt = Date.UTC(2026, 5, 1, 9, 30, 0);
    const { assumption, write_path } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      structured: {
        context: 'ctx',
        challenge: 'chal',
        decision: 'dec',
        tradeoff: 'trade',
      },
      signpost_at: signpostAt,
      signpost_reason: 'review the leading signal',
      load_bearing: true,
    }, now);

    expect(assumption.id).toMatch(/^asm-[A-Za-z0-9]{8}$/);
    expect(assumption.idea_id).toBe('idea-a');
    expect(assumption.status).toBe('open');
    expect(assumption.load_bearing).toBe(true);
    expect(assumption.context).toBe('ctx');
    expect(assumption.challenge).toBe('chal');
    expect(assumption.decision).toBe('dec');
    expect(assumption.tradeoff).toBe('trade');
    expect(assumption.signpost_at).toBe(signpostAt);
    expect(assumption.signpost_reason).toBe('review the leading signal');
    expect(assumption.declared_at).toBe(now);
    expect(assumption.vault_path).toMatch(/^assumptions\/dec-\d+\.md$/);
    expect(write_path).toBe('direct-fs');

    const row = db
      .prepare(
        `SELECT id, idea_id, text, status, load_bearing, signpost_at,
                signpost_reason, vault_path, declared_at
           FROM ideas_assumptions
          WHERE id = ?`,
      )
      .get(assumption.id) as {
      id: string;
      idea_id: string;
      text: string;
      status: string;
      load_bearing: number;
      signpost_at: number;
      signpost_reason: string;
      vault_path: string;
      declared_at: number;
    };
    expect(row).toEqual({
      id: assumption.id,
      idea_id: assumption.idea_id,
      text: assumption.text,
      status: assumption.status,
      load_bearing: 1,
      signpost_at: signpostAt,
      signpost_reason: 'review the leading signal',
      vault_path: assumption.vault_path,
      declared_at: now,
    });

    const raw = await fsp.readFile(path.join(vault, assumption.vault_path), 'utf8');
    const parsed = matter(raw);
    expect(parsed.data.id).toBe(assumption.id);
    expect(parsed.data.type).toBe('assumption');
    expect(parsed.data.idea_id).toBe('idea-a');
    expect(parsed.data.status).toBe('open');
    expect(parsed.data.load_bearing).toBe(true);
    expect(isoString(parsed.data.declared_at)).toBe(new Date(now).toISOString());
    expect(isoString(parsed.data.signpost_at)).toBe(
      new Date(signpostAt).toISOString(),
    );
    expect(parsed.data.signpost_reason).toBe('review the leading signal');
    expect(parsed.content).toBe(assumption.text);
  });
});

describe('declareAssumption — free text', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('accepts free text when structured not provided', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'pricing is the blocker',
    });
    expect(assumption.text).toBe('pricing is the blocker');
    expect(assumption.context).toBeNull();
    expect(assumption.decision).toBeNull();
    expect(assumption.vault_path).toContain('pricing-is-the-blocker');
  });

  it('errors when neither text nor structured is provided', async () => {
    await expect(
      declareAssumption(db, vault, { idea_id: 'idea-a' }),
    ).rejects.toThrow(AssumptionInputError);
  });

  it('errors when structured is partial (fallbacks to text, which is missing)', async () => {
    await expect(
      declareAssumption(db, vault, {
        idea_id: 'idea-a',
        structured: {
          context: 'ctx',
          challenge: 'chal',
          decision: '',
          tradeoff: 'trade',
        },
      }),
    ).rejects.toThrow(AssumptionInputError);
  });
});

describe('declareAssumption — rollback paths', () => {
  it('throws IdeaNotFoundError when parent idea is missing (no file created)', async () => {
    await expect(
      declareAssumption(db, vault, {
        idea_id: 'idea-missing',
        text: 'x',
      }),
    ).rejects.toThrow(IdeaNotFoundError);

    // No assumptions/ directory should have been touched — the idea check
    // happens BEFORE writeNote.
    const exists = await fsp
      .access(path.join(vault, 'assumptions'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it('unlinks the orphan markdown when the DB insert fails', async () => {
    await seedIdea();

    // First declare succeeds
    const first = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'first',
    });

    db.exec(`
      CREATE TRIGGER fail_assumption_insert
      BEFORE INSERT ON ideas_assumptions
      BEGIN
        SELECT RAISE(ABORT, 'forced assumption insert failure');
      END;
    `);

    await expect(
      declareAssumption(db, vault, {
        idea_id: 'idea-a',
        text: 'second',
      }),
    ).rejects.toThrow();

    // The FIRST declare's file should still exist (it was committed).
    const firstExists = await fsp
      .access(path.join(vault, first.assumption.vault_path))
      .then(() => true)
      .catch(() => false);
    expect(firstExists).toBe(true);

    // Any second-attempt orphan should have been unlinked. Checking the
    // assumptions directory shouldn't contain stray files beyond the first.
    const files = await fsp.readdir(path.join(vault, 'assumptions'));
    expect(files.length).toBe(1);
    expect(files[0]).toContain('first');

    const rows = db
      .prepare('SELECT id, vault_path FROM ideas_assumptions')
      .all() as Array<{ id: string; vault_path: string }>;
    expect(rows).toEqual([
      { id: first.assumption.id, vault_path: first.assumption.vault_path },
    ]);
  });
});

// ---------------------------------------------------------------------------
// listAssumptions
// ---------------------------------------------------------------------------

describe('listAssumptions', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('returns assumptions in declared order', async () => {
    const a = await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'one' }, 100);
    const b = await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'two' }, 200);
    const c = await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'three' }, 300);

    const { assumptions } = listAssumptions(db, vault, 'idea-a');
    expect(assumptions.map((x) => x.id)).toEqual([
      a.assumption.id,
      b.assumption.id,
      c.assumption.id,
    ]);
  });

  it('filters stale rows by default', async () => {
    const a = await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'kept' });
    const b = await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'stale' });
    await fsp.unlink(path.join(vault, b.assumption.vault_path));

    const result = listAssumptions(db, vault, 'idea-a');
    expect(result.assumptions.map((x) => x.id)).toEqual([a.assumption.id]);
    expect(result.stale_hidden).toBe(1);
  });

  it('surfaces stale when include_stale: true', async () => {
    const a = await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'x' });
    await fsp.unlink(path.join(vault, a.assumption.vault_path));

    const result = listAssumptions(db, vault, 'idea-a', { include_stale: true });
    expect(result.assumptions.length).toBe(1);
    expect(result.assumptions[0].stale).toBe(true);
  });

  it('scopes by idea_id', async () => {
    await seedIdea('idea-b');
    await declareAssumption(db, vault, { idea_id: 'idea-a', text: 'a-one' });
    await declareAssumption(db, vault, { idea_id: 'idea-b', text: 'b-one' });
    const a = listAssumptions(db, vault, 'idea-a');
    expect(a.assumptions.length).toBe(1);
    expect(a.assumptions[0].text).toBe('a-one');
  });
});

// ---------------------------------------------------------------------------
// lockAssumption / unlockAssumption
// ---------------------------------------------------------------------------

describe('lockAssumption / unlockAssumption', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('sets locked_at on DB + frontmatter', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'lockable',
    });
    const locked = await lockAssumption(db, vault, assumption.id, 555_000);
    expect(locked.locked_at).toBe(555_000);

    const raw = await fsp.readFile(path.join(vault, locked.vault_path), 'utf8');
    expect(raw).toMatch(/locked_at:\s*"?\d{4}-\d{2}-\d{2}T/);
  });

  it('unlocking writes locked_at: null into frontmatter', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'lockable',
    });
    await lockAssumption(db, vault, assumption.id);
    const unlocked = await unlockAssumption(db, vault, assumption.id);
    expect(unlocked.locked_at).toBeNull();

    const raw = await fsp.readFile(path.join(vault, assumption.vault_path), 'utf8');
    expect(raw).toMatch(/locked_at:\s*null/);
  });

  it('double-lock is a no-op (retains original lock time)', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'x',
    });
    const first = await lockAssumption(db, vault, assumption.id, 100);
    const second = await lockAssumption(db, vault, assumption.id, 200);
    expect(second.locked_at).toBe(first.locked_at);
  });

  it('throws on unknown id', async () => {
    await expect(lockAssumption(db, vault, 'asm-missing')).rejects.toThrow(
      AssumptionNotFoundError,
    );
    await expect(unlockAssumption(db, vault, 'asm-missing')).rejects.toThrow(
      AssumptionNotFoundError,
    );
  });
});

// ---------------------------------------------------------------------------
// findDueSignposts
// ---------------------------------------------------------------------------

describe('findDueSignposts', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('returns load-bearing + open + elapsed signposts only', async () => {
    // Due: load-bearing, open, elapsed
    const due = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'due',
      load_bearing: true,
      signpost_at: 1000,
    });
    // Not load-bearing
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'not-load-bearing',
      load_bearing: false,
      signpost_at: 1000,
    });
    // Load-bearing but no signpost
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'no-signpost',
      load_bearing: true,
    });
    // Load-bearing + signpost but in the future
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'future',
      load_bearing: true,
      signpost_at: 10_000,
    });

    const result = findDueSignposts(db, 5000);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(due.assumption.id);
    expect(result[0].elapsed_ms).toBe(4000);
  });

  it('extends the horizon with window_ms', async () => {
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'near-future',
      load_bearing: true,
      signpost_at: 6000,
    });
    const zeroWindow = findDueSignposts(db, 5000);
    expect(zeroWindow.length).toBe(0);
    const withWindow = findDueSignposts(db, 5000, { window_ms: 2000 });
    expect(withWindow.length).toBe(1);
  });

  it('includes locked assumptions (signpost is independent of council lock)', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'locked-but-signpost',
      load_bearing: true,
      signpost_at: 1000,
    });
    await lockAssumption(db, vault, assumption.id, 2000);

    const result = findDueSignposts(db, 5000);
    expect(result.length).toBe(1);
    expect(result[0].locked_at).not.toBeNull();
  });

  it('excludes refuted and held assumptions', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'will-be-refuted',
      load_bearing: true,
      signpost_at: 1000,
    });
    db.prepare('UPDATE ideas_assumptions SET status = ? WHERE id = ?').run(
      'refuted',
      assumption.id,
    );
    const result = findDueSignposts(db, 5000);
    expect(result.length).toBe(0);
  });

  it('scopes by idea_id', async () => {
    await seedIdea('idea-b');
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'a',
      load_bearing: true,
      signpost_at: 1000,
    });
    await declareAssumption(db, vault, {
      idea_id: 'idea-b',
      text: 'b',
      load_bearing: true,
      signpost_at: 1000,
    });
    const a = findDueSignposts(db, 5000, { idea_id: 'idea-a' });
    expect(a.length).toBe(1);
    expect(a[0].idea_id).toBe('idea-a');
  });
});

// ---------------------------------------------------------------------------
// forgetAssumption
// ---------------------------------------------------------------------------

describe('forgetAssumption', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('removes the DB row but leaves markdown on disk', async () => {
    const { assumption } = await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'forgettable',
    });
    const forgotten = forgetAssumption(db, assumption.id);
    expect(forgotten.id).toBe(assumption.id);

    expect(getAssumption(db, assumption.id)).toBeNull();
    const exists = await fsp
      .access(path.join(vault, assumption.vault_path))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('throws on unknown id', () => {
    expect(() => forgetAssumption(db, 'asm-missing')).toThrow(AssumptionNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// buildAssumptionNextStepsForIdea
// ---------------------------------------------------------------------------

describe('buildAssumptionNextStepsForIdea', () => {
  beforeEach(async () => {
    await seedIdea();
  });

  it('suggests declare when no assumptions exist', () => {
    const hints = buildAssumptionNextStepsForIdea(db, 'idea-a');
    expect(hints.length).toBe(1);
    expect(hints[0].action).toBe('assumption.declare');
  });

  it('returns empty when assumptions exist and none are due', async () => {
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'quiet',
      load_bearing: true,
      signpost_at: Date.now() + 60_000,
    });
    const hints = buildAssumptionNextStepsForIdea(db, 'idea-a');
    expect(hints.length).toBe(0);
  });

  it('surfaces a review-nudge when signposts are due', async () => {
    await declareAssumption(db, vault, {
      idea_id: 'idea-a',
      text: 'due',
      load_bearing: true,
      signpost_at: 1000,
    });
    const hints = buildAssumptionNextStepsForIdea(db, 'idea-a', 5000);
    expect(hints.length).toBe(1);
    expect(hints[0].action).toBe('assumption.list');
    expect(hints[0].why).toMatch(/elapsed signpost/);
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('assumptions — property', () => {
  it('findDueSignposts never returns a row that fails its own predicate', () => {
    const d = openInMemoryIdeasDb();
    runMigrations(d);
    d.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-p', 'ideas/idea-p.md', 't', 'nascent', 1, 1);

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            load_bearing: fc.boolean(),
            has_signpost: fc.boolean(),
            signpost_at: fc.integer({ min: 0, max: 100_000 }),
            status: fc.constantFrom<'open' | 'held' | 'refuted'>('open', 'held', 'refuted'),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        fc.integer({ min: 0, max: 100_000 }),
        (seeds, now) => {
          d.exec('DELETE FROM ideas_assumptions');
          for (let i = 0; i < seeds.length; i++) {
            const s = seeds[i];
            d.prepare(
              `INSERT INTO ideas_assumptions
               (id, idea_id, text, status, load_bearing, signpost_at,
                vault_path, declared_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              `asm-${i.toString().padStart(8, '0')}`,
              'idea-p',
              `t${i}`,
              s.status,
              s.load_bearing ? 1 : 0,
              s.has_signpost ? s.signpost_at : null,
              `assumptions/t${i}.md`,
              0,
            );
          }
          const rows = findDueSignposts(d, now);
          for (const r of rows) {
            expect(r.load_bearing).toBe(true);
            expect(r.status).toBe('open');
            expect(r.signpost_at).not.toBeNull();
            expect(r.signpost_at!).toBeLessThanOrEqual(now);
          }
        },
      ),
      { numRuns: 40 },
    );
    d.close();
  });
});
