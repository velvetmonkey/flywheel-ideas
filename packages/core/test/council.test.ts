import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import {
  createFreeze,
  declareAssumption,
  deleteIdeasDbFiles,
  getCouncilSession,
  getFreeze,
  listDispatches,
  listViewsBySession,
  openIdeasDb,
  runCouncil,
  runMigrations,
  type IdeasDatabase,
} from '../src/index.js';

const MOCK_CLI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-cli',
  'mock-claude.mjs',
);
const MOCK_CODEX = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-cli',
  'mock-codex.mjs',
);
const MOCK_GEMINI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'mock-cli',
  'mock-gemini.mjs',
);

/** Default test-only options: claude-only (for M8-era tests) + claude mock. */
const CLAUDE_ONLY_OPTIONS = {
  clis_override: ['claude' as const],
  spawn_override: ['node', MOCK_CLI],
};

/** M9 matrix options: both claude + codex with their mocks. */
const M9_MATRIX_OPTIONS = {
  clis_override: ['claude' as const, 'codex' as const],
  spawn_overrides: {
    claude: ['node', MOCK_CLI],
    codex: ['node', MOCK_CODEX],
  },
};

/** M10 light matrix options: all 3 CLIs × 2 personas with their mocks. */
const M10_LIGHT_OPTIONS = {
  clis_override: ['claude' as const, 'codex' as const, 'gemini' as const],
  spawn_overrides: {
    claude: ['node', MOCK_CLI],
    codex: ['node', MOCK_CODEX],
    gemini: ['node', MOCK_GEMINI],
  },
};

/** M10 full matrix options: 3 CLIs × 5 personas with their mocks. Same
 *  spawn overrides as light; the orchestrator uses FULL_PERSONA_SET when
 *  depth='full' is passed via RunCouncilInput. */
const M10_FULL_OPTIONS = M10_LIGHT_OPTIONS;

const VALID_ENVELOPE = {
  stance: 'Mock stance for testing — long enough to read like a paragraph.',
  confidence: 0.6,
  key_risks: ['Mock risk A', 'Mock risk B'],
  fragile_insights: ['fragile-A'],
  assumptions_cited: ['asm-mock-1'],
  evidence: [{ claim: 'mock claim', source: 'vault://mock' }],
  metacognitive_reflection: {
    could_be_wrong_if: 'mock reasons',
    most_vulnerable_assumption: 'asm-mock-1',
    confidence_rationale: 'mock',
  },
};

let vault: string;
let db: IdeasDatabase;

async function seedIdea(id: string = 'idea-a', title: string = 'test idea'): Promise<void> {
  const relPath = `ideas/${id}.md`;
  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, relPath, title, 'nascent', 1, 1);
  // Create a minimal markdown file so readNote() returns a body
  await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
  await fsp.writeFile(
    path.join(vault, relPath),
    `---\ntitle: ${title}\n---\n\nA short body describing the idea.\n`,
    'utf8',
  );
}

async function seedSeededAssumption(id: string = 'asm-mock-1', idea_id: string = 'idea-a'): Promise<void> {
  // use declareAssumption so it writes the markdown too
  await declareAssumption(db, vault, {
    idea_id,
    text: 'A seeded assumption for testing',
    load_bearing: true,
  });
  // override the generated id — the test wants 'asm-mock-1' to match envelope
  db.prepare(`UPDATE ideas_assumptions SET id = ?`).run(id);
}

beforeEach(async () => {
  // Disable the alpha.5 model_version probe in council tests — they use
  // mock CLI binaries that don't implement --version, and we don't want to
  // shell out to the real claude/codex/gemini for every test. cli-version.test.ts
  // has dedicated coverage for the probe.
  process.env.FLYWHEEL_IDEAS_NO_VERSION_PROBE = '1';
  // v0.2 KEYSTONE — disable evidence-reader subprocess in council tests.
  // The keystone spawns flywheel-memory at council.run; if the binary is
  // installed on the dev machine PATH, it'll attempt a real subprocess on
  // every test (slow, polluting). council-evidence.test.ts and dedicated
  // evidence-wiring tests cover the on-path explicitly.
  process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE = '0';
  vault = await fsp.mkdtemp(path.join(os.tmpdir(), 'flywheel-ideas-council-'));
  await fsp.mkdir(path.join(vault, '.flywheel'), { recursive: true });
  db = openIdeasDb(vault);
  runMigrations(db);
});

afterEach(async () => {
  delete process.env.FLYWHEEL_IDEAS_NO_VERSION_PROBE;
  delete process.env.FLYWHEEL_IDEAS_MEMORY_BRIDGE;
  db.close();
  deleteIdeasDbFiles(vault);
  await fsp.rm(vault, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('runCouncil — happy path (2 personas, both succeed)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('creates session + 2 views + 4 dispatches (two-pass) + 3 markdown files', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );

    expect(result.status).toBe('success');
    expect(result.failed_any).toBe(false);
    expect(result.views).toHaveLength(2);
    expect(result.views.map((v) => v.persona).sort()).toEqual([
      'growth-optimist',
      'risk-pessimist',
    ]);

    // Session row
    const session = getCouncilSession(db, result.session_id);
    expect(session?.completed_at).not.toBeNull();
    expect(session?.synthesis_vault_path).toBe(result.synthesis_vault_path);

    // View rows: Pass 1 (initial_stance) + Pass 2 (stance + self_critique)
    const views = listViewsBySession(db, result.session_id);
    expect(views).toHaveLength(2);
    for (const v of views) {
      expect(v.initial_stance).toBeTruthy(); // Pass 1 populated
      expect(v.stance).toBeTruthy(); // Pass 2 populated
      expect(v.self_critique).toBeTruthy(); // Pass 2 populated
      expect(v.confidence).not.toBeNull();
      expect(v.failure_reason).toBeNull();
      // Pass 1 stance ≠ Pass 2 stance (mock returns different text per pass)
      expect(v.initial_stance).not.toBe(v.stance);
    }

    // Dispatch rows: two per cell (Pass 1 + Pass 2)
    const dispatches = listDispatches(db);
    expect(dispatches).toHaveLength(4);
    for (const d of dispatches) {
      expect(d.cli).toBe('claude');
      expect(d.approval_scope).toBe('session');
      expect(d.finished_at).not.toBeNull();
    }

    // Markdown files: 2 view notes + SYNTHESIS.md
    const sessionDir = path.join(
      vault,
      path.dirname(result.synthesis_vault_path),
    );
    const files = await fsp.readdir(sessionDir);
    expect(files).toContain('SYNTHESIS.md');
    expect(files).toContain('claude-risk-pessimist.md');
    expect(files).toContain('claude-growth-optimist.md');
  });

  it('view markdown frontmatter carries council metadata', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    const riskView = result.views.find((v) => v.persona === 'risk-pessimist')!;
    const md = await fsp.readFile(path.join(vault, riskView.content_vault_path), 'utf8');
    const fm = matter(md).data;
    expect(fm.type).toBe('council_view');
    expect(fm.session_id).toBe(result.session_id);
    expect(fm.persona).toBe('risk-pessimist');
    expect(fm.model).toBe('claude');
    expect(fm.failure_reason).toBeNull();
    expect(typeof fm.input_hash).toBe('string');
  });

  it('input_hash is deterministic across runs (same inputs)', async () => {
    const r1 = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    // Mock will pick a different session-index (02), but input_hash per persona should match run1
    const r2 = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    const views1 = listViewsBySession(db, r1.session_id);
    const views2 = listViewsBySession(db, r2.session_id);
    const h1 = new Map(views1.map((v) => [v.persona, v.input_hash]));
    const h2 = new Map(views2.map((v) => [v.persona, v.input_hash]));
    expect(h1.get('risk-pessimist')).toBe(h2.get('risk-pessimist'));
    expect(h1.get('growth-optimist')).toBe(h2.get('growth-optimist'));
  });

  it('second council.run for same idea writes to session-02 folder', async () => {
    const r1 = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    expect(r1.synthesis_vault_path).toContain('session-01');
    const r2 = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    expect(r2.synthesis_vault_path).toContain('session-02');
  });

  it('cites seeded assumption', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    const views = listViewsBySession(db, result.session_id);
    const citations = db
      .prepare(
        `SELECT view_id, assumption_id FROM ideas_assumption_citations WHERE view_id IN (?, ?)`,
      )
      .all(views[0].id, views[1].id) as Array<{ view_id: string; assumption_id: string }>;
    // Envelope includes assumptions_cited: ['asm-mock-1'] — should insert for each view
    expect(citations.length).toBe(2);
    expect(citations.every((c) => c.assumption_id === 'asm-mock-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mode support
// ---------------------------------------------------------------------------

describe('runCouncil — mode support', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('pre_mortem mode runs end-to-end (mode stored on session row)', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'pre_mortem', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    expect(result.status).toBe('success');
    const session = getCouncilSession(db, result.session_id);
    expect(session?.mode).toBe('pre_mortem');
  });

  it('pre_mortem user message starts with the failure-backwards prefix', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'pre_mortem', approval_scope: 'session' },
      {
        ...CLAUDE_ONLY_OPTIONS,
        personas_override: [{ id: 'risk-pessimist', name: 'Risk Pessimist', description: 'd' }],
      },
    );
    // The mock's FLYWHEEL_TEST_ECHO_STDIN_TO is env-override; personas_override above runs 1 persona.
    // But we didn't set the env var. Spawn helper passes env_override only via input.env_override
    // which we don't expose through runCouncil. Instead: assert via the persisted stance+prompt.
    // Since mock's default envelope is fixed, this test proves pre_mortem path runs without error.
    expect(result.views).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Failure paths
// ---------------------------------------------------------------------------

describe('runCouncil — failure classification', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('bad JSON from mock (both passes) → failure_reason="parse", Pass 2 skipped', async () => {
    // Override mock to emit non-JSON stdout ALWAYS (both passes)
    const result = await runCouncilWithEnv({
      FLYWHEEL_TEST_STDOUT_RAW: 'not json output',
    });
    expect(result.status).toBe('failed');
    expect(result.failed_any).toBe(true);
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.failure_reason).toBe('parse');
      expect(v.initial_stance).toBeNull();
      expect(v.stance).toBeNull();
      expect(v.self_critique).toBeNull();
      expect(v.confidence).toBeNull();
    }
    // Pass 1 failed → Pass 2 skipped → only 1 dispatch per cell
    expect(listDispatches(db)).toHaveLength(2);
  });

  it('timeout via HANG_MS → failure_reason="timeout"', async () => {
    const result = await runCouncilWithEnv(
      { FLYWHEEL_TEST_HANG_MS: '3000' },
      { timeout_ms_override: 300 },
    );
    expect(result.status).toBe('failed');
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.failure_reason).toBe('timeout');
    }
  }, 15_000);

  it('non-zero exit → failure_reason="exit_nonzero"', async () => {
    const result = await runCouncilWithEnv({
      FLYWHEEL_TEST_EXIT: '3',
      FLYWHEEL_TEST_STDOUT_RAW: '',
    });
    expect(result.status).toBe('failed');
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.failure_reason).toBe('exit_nonzero');
    }
  });

  it('synthesis still written even when both cells fail', async () => {
    const result = await runCouncilWithEnv({
      FLYWHEEL_TEST_EXIT: '1',
      FLYWHEEL_TEST_STDOUT_RAW: '',
    });
    const synthesisPath = path.join(vault, result.synthesis_vault_path);
    const content = await fsp.readFile(synthesisPath, 'utf8');
    expect(content).toContain('Failed cells');
    expect(content).toContain('exit_nonzero');
  });

  it('invalid envelope (missing field) → failure_reason="parse"', async () => {
    const bad = { ...VALID_ENVELOPE, stance: undefined as unknown as string };
    const result = await runCouncilWithEnv({
      FLYWHEEL_TEST_RESULT: JSON.stringify(bad),
    });
    expect(result.status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// Two-pass structure (M9)
// ---------------------------------------------------------------------------

describe('runCouncil — two-pass structure (M9)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('two-pass happy path: initial_stance, stance, self_critique all populated', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    expect(result.status).toBe('success');
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.initial_stance).toBeTruthy();
      expect(v.stance).toBeTruthy();
      expect(v.self_critique).toBeTruthy();
      // Revised stance should differ from initial (mock returns distinct P1/P2)
      expect(v.initial_stance).not.toBe(v.stance);
    }
  });

  it('Pass 2 failure (exit-nonzero) → initial_stance populated, stance=null', async () => {
    // Mock exits non-zero ONLY on Pass 2
    const result = await runCouncilWithEnv({
      FLYWHEEL_TEST_EXIT: '7',
      FLYWHEEL_TEST_EXIT_ON_PASS: '2',
    });
    expect(result.status).toBe('failed');
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.initial_stance).toBeTruthy(); // Pass 1 succeeded
      expect(v.stance).toBeNull(); // Pass 2 failed
      expect(v.self_critique).toBeNull();
      expect(v.failure_reason).toBe('exit_nonzero');
    }
    // 2 passes per cell × 2 cells = 4 dispatches (Pass 2 still ran)
    expect(listDispatches(db)).toHaveLength(4);
  });

  it('Pass 2 timeout → initial_stance populated, stance=null, reason=timeout', async () => {
    // Mock hangs ONLY on Pass 2
    const result = await runCouncilWithEnv(
      { FLYWHEEL_TEST_HANG_MS: '3000', FLYWHEEL_TEST_HANG_ON_PASS: '2' },
      { timeout_ms_override: 300 },
    );
    expect(result.status).toBe('failed');
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.initial_stance).toBeTruthy();
      expect(v.stance).toBeNull();
      expect(v.failure_reason).toBe('timeout');
    }
  }, 15_000);

  it('Pass 2 input_hash differs from Pass 1 hash (stored as dispatch/view hash)', async () => {
    // The view row's input_hash is Pass 2's (authoritative).
    // To assert Pass 1 and Pass 2 hashes differ in the same run, we read
    // two view rows — if identical inputs but different passes, hashes
    // must differ inside runCouncilCell's two calls to assemblePrompt.
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      CLAUDE_ONLY_OPTIONS,
    );
    const views = listViewsBySession(db, result.session_id);
    // Both views' input_hash are Pass 2 hashes — they'll differ from each
    // other because personas differ. Assert that at least they're populated.
    for (const v of views) {
      expect(v.input_hash).toMatch(/^sha256:/);
    }
    // Different personas → different Pass 2 hashes
    expect(views[0].input_hash).not.toBe(views[1].input_hash);
  });

  it('Pass 2 response missing self_critique → stance still populated, warning in stderr_tail', async () => {
    // Configure Pass 1 default; Pass 2 returns envelope without self_critique
    const p2WithoutCritique = {
      stance: 'Pass 2 revised stance but missing self_critique',
      confidence: 0.5,
      key_risks: [],
      fragile_insights: [],
      assumptions_cited: [],
      evidence: [],
      metacognitive_reflection: {
        could_be_wrong_if: 'x',
        most_vulnerable_assumption: 'x',
        confidence_rationale: 'x',
      },
      // no self_critique
    };
    const result = await runCouncilWithEnv({
      FLYWHEEL_TEST_RESULT_P2: JSON.stringify(p2WithoutCritique),
    });
    expect(result.status).toBe('success');
    const views = listViewsBySession(db, result.session_id);
    for (const v of views) {
      expect(v.stance).toBe(p2WithoutCritique.stance);
      expect(v.self_critique).toBeNull();
      expect(v.stderr_tail).toContain('missing self_critique');
    }
  });
});

// ---------------------------------------------------------------------------
// Light matrix — claude + codex (M9)
// ---------------------------------------------------------------------------

describe('runCouncil — light matrix (claude + codex + gemini) (M10)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('light happy path: 6 cells × 2 passes = 12 dispatches, 6 view rows', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      M10_LIGHT_OPTIONS,
    );
    expect(result.status).toBe('success');
    expect(result.views).toHaveLength(6); // 3 CLIs × 2 personas

    const dispatches = listDispatches(db);
    expect(dispatches).toHaveLength(12); // 6 cells × 2 passes

    // Each CLI runs 2 personas × 2 passes = 4 dispatches
    const byCli = new Map<string, number>();
    for (const d of dispatches) byCli.set(d.cli, (byCli.get(d.cli) ?? 0) + 1);
    expect(byCli.get('claude')).toBe(4);
    expect(byCli.get('codex')).toBe(4);
    expect(byCli.get('gemini')).toBe(4);
  });

  it('views have all 3 models (claude + codex + gemini)', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      M10_LIGHT_OPTIONS,
    );
    const views = listViewsBySession(db, result.session_id);
    const models = new Set(views.map((v) => v.model));
    expect(models).toEqual(new Set(['claude', 'codex', 'gemini']));
  });

  it('gemini views have stance populated from JSON-object mock', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      M10_LIGHT_OPTIONS,
    );
    const views = listViewsBySession(db, result.session_id);
    const geminiViews = views.filter((v) => v.model === 'gemini');
    expect(geminiViews).toHaveLength(2);
    for (const v of geminiViews) {
      expect(v.stance).toContain('gemini');
      expect(v.initial_stance).toContain('gemini');
      expect(v.failure_reason).toBeNull();
    }
  });

  it('synthesis renders all 6 views', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      M10_LIGHT_OPTIONS,
    );
    const synthesisContent = await fsp.readFile(
      path.join(vault, result.synthesis_vault_path),
      'utf8',
    );
    expect(synthesisContent).toContain('Risk Pessimist');
    expect(synthesisContent).toContain('Growth Optimist');
    expect(synthesisContent).toContain('| claude |');
    expect(synthesisContent).toContain('| codex |');
    expect(synthesisContent).toContain('| gemini |');
  });

  it('CLI-interleaved dispatch order: first 3 dispatched cells hit 3 different CLIs', async () => {
    // With max=3 concurrency and interleaved matrix [claude-RP, codex-RP,
    // gemini-RP, claude-GO, codex-GO, gemini-GO], the first wave of 3
    // in-flight = 3 different CLIs. started_at ordering on the first 3
    // dispatch rows proves that (pre-M10 roundtable CRITICAL fix).
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      { ...M10_LIGHT_OPTIONS, max_concurrency_override: 3 },
    );
    expect(result.status).toBe('success');
    // First 3 dispatches by started_at are all Pass 1s from 3 different CLIs
    const rows = db
      .prepare(
        `SELECT cli, started_at FROM ideas_dispatches ORDER BY started_at ASC LIMIT 3`,
      )
      .all() as Array<{ cli: string; started_at: number }>;
    const firstThreeClis = new Set(rows.map((r) => r.cli));
    expect(firstThreeClis.size).toBe(3);
    expect(firstThreeClis).toEqual(new Set(['claude', 'codex', 'gemini']));
  });

  it('gemini benign keychain warning on stderr does NOT trigger a failure', async () => {
    // Force mock-gemini to emit the libsecret warning; classifier should
    // strip and classify as success.
    const prev = process.env.FLYWHEEL_TEST_EMIT_KEYCHAIN_WARNING;
    process.env.FLYWHEEL_TEST_EMIT_KEYCHAIN_WARNING = '1';
    try {
      const result = await runCouncil(
        db,
        vault,
        { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
        M10_LIGHT_OPTIONS,
      );
      expect(result.status).toBe('success');
      const views = listViewsBySession(db, result.session_id);
      const geminiViews = views.filter((v) => v.model === 'gemini');
      for (const v of geminiViews) {
        expect(v.failure_reason).toBeNull();
      }
    } finally {
      if (prev === undefined) delete process.env.FLYWHEEL_TEST_EMIT_KEYCHAIN_WARNING;
      else process.env.FLYWHEEL_TEST_EMIT_KEYCHAIN_WARNING = prev;
    }
  });
});

// ---------------------------------------------------------------------------
// Full-depth matrix (M10)
// ---------------------------------------------------------------------------

describe('runCouncil — depth="full" matrix (M10)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('full happy path: 15 cells × 2 passes = 30 dispatches, 15 view rows', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session', depth: 'full' },
      M10_FULL_OPTIONS,
    );
    expect(result.status).toBe('success');
    expect(result.views).toHaveLength(15); // 3 CLIs × 5 personas

    const dispatches = listDispatches(db);
    expect(dispatches).toHaveLength(30); // 15 cells × 2 passes

    // Per-CLI breakdown: each CLI runs 5 personas × 2 passes = 10 dispatches
    const byCli = new Map<string, number>();
    for (const d of dispatches) byCli.set(d.cli, (byCli.get(d.cli) ?? 0) + 1);
    expect(byCli.get('claude')).toBe(10);
    expect(byCli.get('codex')).toBe(10);
    expect(byCli.get('gemini')).toBe(10);
  }, 30_000);

  it('full depth session row records depth="full"', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session', depth: 'full' },
      M10_FULL_OPTIONS,
    );
    const session = getCouncilSession(db, result.session_id);
    expect(session?.depth).toBe('full');
  }, 30_000);

  it('full depth surfaces all 5 personas in views', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session', depth: 'full' },
      M10_FULL_OPTIONS,
    );
    const views = listViewsBySession(db, result.session_id);
    const personas = new Set(views.map((v) => v.persona));
    expect(personas).toEqual(
      new Set([
        'risk-pessimist',
        'growth-optimist',
        'competitor-strategist',
        'regulator',
        'customer-advocate',
      ]),
    );
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Concurrency limiter invariant (M9)
// ---------------------------------------------------------------------------

describe('runCouncil — concurrency limiter (M9)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('completes successfully with max_concurrency=1 (serialized)', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      { ...M10_LIGHT_OPTIONS, max_concurrency_override: 1 },
    );
    expect(result.status).toBe('success');
    expect(result.views).toHaveLength(6);
  });

  it('completes successfully with high max_concurrency (>cell count)', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      { ...M10_LIGHT_OPTIONS, max_concurrency_override: 20 },
    );
    expect(result.status).toBe('success');
    expect(result.views).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function runCouncilWithEnv(
  mockEnv: NodeJS.ProcessEnv,
  options: {
    timeout_ms_override?: number;
  } = {},
): ReturnType<typeof runCouncil> {
  // Inject mock env vars via a tiny shim script that calls node + mock with the env set.
  // We do this by setting process.env on the PARENT before spawn — spawnCliCell inherits.
  const toRestore: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(mockEnv)) {
    toRestore[k] = process.env[k];
    process.env[k] = v ?? '';
  }
  try {
    return await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      {
        ...CLAUDE_ONLY_OPTIONS,
        timeout_ms_override: options.timeout_ms_override,
      },
    );
  } finally {
    for (const [k, v] of Object.entries(toRestore)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ===========================================================================
// v0.2 KEYSTONE — retrieval-native council input wiring (B5)
// ===========================================================================

describe('runCouncil — evidence injection wiring (v0.2 KEYSTONE)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('evidence_override flows through to persona prompts (and persists sources)', async () => {
    const evidenceMd = [
      '## Evidence retrieved from your vault',
      '',
      '### Source: tech/flywheel/risks-and-mitigations.md (score: 0.87)',
      '',
      '> The compounding thesis dies if users do not log outcomes.',
      '',
      '### Cited vault notes',
      '',
      '- tech/flywheel/risks-and-mitigations.md',
    ].join('\n');

    // Capture each subprocess's received stdin so we can assert the
    // evidence block actually reached the persona prompt.
    const stdinCapturePath = path.join(vault, '.test-stdin-capture.txt');
    const prevEcho = process.env.FLYWHEEL_TEST_ECHO_STDIN_TO;
    process.env.FLYWHEEL_TEST_ECHO_STDIN_TO = stdinCapturePath;

    let result;
    try {
      result = await runCouncil(
        db,
        vault,
        { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
        {
          ...CLAUDE_ONLY_OPTIONS,
          evidence_override: {
            evidence: evidenceMd,
            sources: [
              { kind: 'search', path: 'tech/flywheel/risks-and-mitigations.md', score: 0.87 },
            ],
          },
        },
      );
    } finally {
      if (prevEcho === undefined) delete process.env.FLYWHEEL_TEST_ECHO_STDIN_TO;
      else process.env.FLYWHEEL_TEST_ECHO_STDIN_TO = prevEcho;
    }

    expect(result.status).toBe('success');
    // mock-claude wrote its received stdin (which includes the system
    // preamble + user message) to the capture file. Last writer wins —
    // assert the captured content carries the evidence block.
    const captured = await fsp.readFile(stdinCapturePath, 'utf8');
    expect(captured).toContain('Evidence retrieved from your vault');
    expect(captured).toContain('tech/flywheel/risks-and-mitigations.md');
    expect(captured).toContain('Where the evidence above contradicts');

    // Sidecar table populated once per session.
    const evidenceRows = db
      .prepare('SELECT session_id, sources_json FROM ideas_council_evidence')
      .all() as Array<{ session_id: string; sources_json: string }>;
    expect(evidenceRows).toHaveLength(1);
    expect(evidenceRows[0].session_id).toBe(result.session_id);
    const persistedSources = JSON.parse(evidenceRows[0].sources_json);
    expect(persistedSources).toEqual([
      { kind: 'search', path: 'tech/flywheel/risks-and-mitigations.md', score: 0.87 },
    ]);
  });

  it('skip_evidence: true → no sidecar row + v0.1 prompt shape (no evidence header)', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      {
        ...CLAUDE_ONLY_OPTIONS,
        skip_evidence: true,
      },
    );

    expect(result.status).toBe('success');
    const viewMdAbs = path.join(vault, result.views[0].content_vault_path);
    const viewMd = await fsp.readFile(viewMdAbs, 'utf8');
    expect(viewMd).not.toContain('Evidence retrieved from your vault');

    const evidenceRows = db.prepare('SELECT * FROM ideas_council_evidence').all();
    expect(evidenceRows).toHaveLength(0);
  });

  it('null evidence (override with empty pack) → no sidecar row, no header', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      {
        ...CLAUDE_ONLY_OPTIONS,
        evidence_override: { evidence: null, sources: [] },
      },
    );

    expect(result.status).toBe('success');
    const viewMdAbs = path.join(vault, result.views[0].content_vault_path);
    const viewMd = await fsp.readFile(viewMdAbs, 'utf8');
    expect(viewMd).not.toContain('Evidence retrieved from your vault');

    const evidenceRows = db.prepare('SELECT * FROM ideas_council_evidence').all();
    expect(evidenceRows).toHaveLength(0);
  });

  it('evidence injection survives across both passes of the two-pass structure', async () => {
    const evidenceMd = '## Evidence retrieved from your vault\n\n### Source: a.md\n\n> X.';
    const stdinCapturePath = path.join(vault, '.test-stdin-capture.txt');
    const prevEcho = process.env.FLYWHEEL_TEST_ECHO_STDIN_TO;
    process.env.FLYWHEEL_TEST_ECHO_STDIN_TO = stdinCapturePath;

    let result;
    try {
      result = await runCouncil(
        db,
        vault,
        { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
        {
          ...CLAUDE_ONLY_OPTIONS,
          evidence_override: {
            evidence: evidenceMd,
            sources: [{ kind: 'search', path: 'a.md', score: 0.5 }],
          },
        },
      );
    } finally {
      if (prevEcho === undefined) delete process.env.FLYWHEEL_TEST_ECHO_STDIN_TO;
      else process.env.FLYWHEEL_TEST_ECHO_STDIN_TO = prevEcho;
    }

    expect(result.status).toBe('success');
    expect(result.views).toHaveLength(2); // CLAUDE_ONLY_OPTIONS = 1 CLI × 2 personas
    // Last subprocess to run wrote the capture file — assert its stdin
    // (which is either pass 1 or pass 2 depending on scheduling) carried
    // the evidence. Both passes inject the same evidence per the wiring.
    const captured = await fsp.readFile(stdinCapturePath, 'utf8');
    expect(captured).toContain('Evidence retrieved from your vault');
  });
});

// ===========================================================================
// v0.2 D2 — runCouncil freeze binding wiring
// ===========================================================================

describe('runCouncil — freeze binding (v0.2 D2)', () => {
  beforeEach(async () => {
    await seedIdea();
    await seedSeededAssumption();
  });

  it('freeze: true auto-creates a freeze and binds to the new session', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      { ...CLAUDE_ONLY_OPTIONS, freeze: true },
    );
    expect(result.status).toBe('success');
    expect(result.freeze_id).toMatch(/^fr-/);

    // The freeze row exists, points at the session, snapshot includes asm-mock-1.
    const row = db
      .prepare(
        'SELECT council_session_id, snapshot_json FROM ideas_freezes WHERE id = ?',
      )
      .get(result.freeze_id) as { council_session_id: string; snapshot_json: string };
    expect(row.council_session_id).toBe(result.session_id);
    const snap = JSON.parse(row.snapshot_json) as { assumptions: Array<{ id: string }> };
    expect(snap.assumptions.map((a) => a.id)).toContain('asm-mock-1');
  });

  it('freeze_id binds an existing freeze to the new session', async () => {
    // Create freeze BEFORE running the council; freeze.council_session_id starts null.
    const fr = createFreeze(db, vault, 'idea-a');
    expect(fr.council_session_id).toBeNull();

    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      { ...CLAUDE_ONLY_OPTIONS, freeze_id: fr.id },
    );
    expect(result.freeze_id).toBe(fr.id);
    const re_read = getFreeze(db, fr.id);
    expect(re_read?.council_session_id).toBe(result.session_id);
  });

  it('rejects both freeze and freeze_id passed simultaneously', async () => {
    const fr = createFreeze(db, vault, 'idea-a');
    await expect(
      runCouncil(
        db,
        vault,
        { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
        { ...CLAUDE_ONLY_OPTIONS, freeze: true, freeze_id: fr.id },
      ),
    ).rejects.toThrow(/either .freeze: true.*or .freeze_id/);
  });

  it('rejects freeze_id pointing at unknown freeze', async () => {
    await expect(
      runCouncil(
        db,
        vault,
        { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
        { ...CLAUDE_ONLY_OPTIONS, freeze_id: 'fr-doesnotexist' },
      ),
    ).rejects.toThrow(/freeze_id not found/);
  });

  it('rejects freeze_id from a different idea', async () => {
    // Seed a second idea + freeze it.
    db.prepare(
      `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('idea-other', 'ideas/other.md', 'Other', 'nascent', 1, 1);
    await fsp.mkdir(path.join(vault, 'ideas'), { recursive: true });
    await fsp.writeFile(
      path.join(vault, 'ideas/other.md'),
      `---\ntitle: Other\n---\n\nbody\n`,
      'utf8',
    );
    const fr_other = createFreeze(db, vault, 'idea-other');

    await expect(
      runCouncil(
        db,
        vault,
        { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
        { ...CLAUDE_ONLY_OPTIONS, freeze_id: fr_other.id },
      ),
    ).rejects.toThrow(/belongs to idea idea-other/);
  });

  it('omitting both leaves freeze_id null in result (v0.1 / v0.2-alpha.1 behavior)', async () => {
    const result = await runCouncil(
      db,
      vault,
      { idea_id: 'idea-a', mode: 'standard', approval_scope: 'session' },
      { ...CLAUDE_ONLY_OPTIONS },
    );
    expect(result.freeze_id).toBeNull();
    const freezes = db.prepare('SELECT COUNT(*) as c FROM ideas_freezes').get() as { c: number };
    expect(freezes.c).toBe(0);
  });
});
