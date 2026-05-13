/**
 * Doc-mode handler module for the `idea` MCP tool.
 *
 * Doc mode is the portable single-file backend: one `.md` per idea, no
 * SQLite. The file format is the contract (`docs/single-doc-format.md`)
 * and the consistency boundary is documented in `docs/consistency.md`.
 *
 * This module owns the read/write side of doc mode for the `idea`
 * tool's create/read/list/transition actions. Pure parser/serializer
 * primitives live in `@velvetmonkey/flywheel-ideas-core` under
 * `doc-mode/format.ts` — this file orchestrates filesystem I/O around
 * them and produces the `{result, next_steps}` envelopes the MCP
 * surface returns.
 *
 * What doc mode deliberately does NOT do (per docs/consistency.md):
 *   - cross-idea features (council, propagation, lineage, SEC tracker)
 *   - markdown ↔ SQLite mirror reconciliation (no SQLite involved)
 *   - lineage walks (no supersession metadata stored in the file format)
 *
 * Doc-mode actions in this file are gated at the register-level
 * dispatch — see register.ts.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  buildDocIdeaPath,
  DOC_MODE_FOLDER,
  DocFormatError,
  generateIdeaId,
  parseDocIdea,
  renderDocIdea,
  slugifyDocTitle,
  type DocAssumption,
  type DocAssumptionStatus,
  type DocIdeaState,
  type DocModeIdea,
  type DocVerdictState,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export type IdeaActionName =
  | 'create'
  | 'read'
  | 'list'
  | 'transition'
  | 'forget'
  | 'freeze'
  | 'list_freezes'
  | 'ancestry'
  | 'descendants'
  | 'shared_assumptions'
  | 'export'
  | 'report';

/**
 * The subset of `idea` actions that doc mode supports. Anything outside
 * this set returns `not_supported_in_doc_mode`. Kept as a `Set` so the
 * dispatch check is a single O(1) lookup.
 */
export const IDEA_DOC_MODE_ACTIONS: ReadonlySet<IdeaActionName> = new Set<IdeaActionName>([
  'create',
  'read',
  'list',
  'transition',
]);

const VALID_TRANSITIONS_BY_STATE: Record<DocIdeaState, ReadonlyArray<DocIdeaState>> = {
  nascent: ['explored', 'killed', 'parked'],
  explored: ['evaluated', 'parked', 'killed'],
  evaluated: ['committed', 'parked', 'killed'],
  committed: ['validated', 'refuted', 'parked', 'killed'],
  validated: ['killed'],
  refuted: ['killed'],
  parked: ['explored', 'killed'],
  killed: [],
};

// ---------------------------------------------------------------------------
// idea.create
// ---------------------------------------------------------------------------

export async function docCreate(
  vaultPath: string,
  args: { title?: string; body?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.title || args.title.trim().length === 0) {
    return mcpError('doc-mode create requires `title`', [
      {
        action: 'idea.create',
        example: 'idea.create({ title: "...", backend: "doc" })',
        why: 'Title becomes both the H1 and the frontmatter title; it is the only required field.',
      },
    ]);
  }

  const id = generateIdeaId();
  const slug = slugifyDocTitle(args.title);
  const relPath = buildDocIdeaPath(slug, id);
  const absPath = path.join(vaultPath, relPath);
  const now = new Date().toISOString();

  const idea: DocModeIdea = {
    id,
    title: args.title.trim(),
    state: 'nascent',
    createdAt: now,
    updatedAt: now,
    claim: args.body?.trim() ?? '',
    testCondition: '',
    assumptions: [],
    evidenceLog: [],
    verdict: null,
    lesson: '',
  };

  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, renderDocIdea(idea), 'utf8');

  return mcpText({
    result: {
      id,
      title: idea.title,
      state: idea.state,
      vault_path: relPath,
      backend: 'doc',
      created_at: idea.createdAt,
    },
    next_steps: buildCreateNextSteps(id),
  });
}

function buildCreateNextSteps(id: string): NextStep[] {
  return [
    {
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${id}", text: "...", backend: "doc" })`,
      why: 'Append a load-bearing assumption to the idea file. Doc mode appends an `### Assumption: <id>` sub-block under `## Assumptions`.',
    },
    {
      action: 'idea.read',
      example: `idea.read({ id: "${id}", backend: "doc" })`,
      why: 'Re-read the file to verify the scaffolded sections look right.',
    },
  ];
}

// ---------------------------------------------------------------------------
// idea.read
// ---------------------------------------------------------------------------

export async function docRead(
  vaultPath: string,
  args: { id?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('doc-mode read requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({ backend: "doc" })',
        why: 'List doc-mode ideas to find the id you meant to read.',
      },
    ]);
  }

  const located = await locateDocIdea(vaultPath, args.id);
  if (located === null) {
    return mcpError(`doc-mode idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({ backend: "doc" })',
        why: 'List doc-mode ideas — the id may have been renamed externally.',
      },
    ]);
  }

  const { idea, relPath } = located;
  return mcpText({
    result: {
      id: idea.id,
      title: idea.title,
      state: idea.state,
      vault_path: relPath,
      backend: 'doc',
      created_at: idea.createdAt,
      updated_at: idea.updatedAt,
      claim: idea.claim,
      test_condition: idea.testCondition,
      assumptions: idea.assumptions,
      evidence_log: idea.evidenceLog,
      verdict: idea.verdict,
      lesson: idea.lesson,
    },
    next_steps: buildReadNextSteps(idea.id, idea.state),
  });
}

function buildReadNextSteps(id: string, state: DocIdeaState): NextStep[] {
  if (state === 'killed' || state === 'validated' || state === 'refuted') {
    return [
      {
        action: 'idea.list',
        example: 'idea.list({ backend: "doc" })',
        why: 'This idea is in a terminal state; browse the rest of your doc-mode ledger.',
      },
    ];
  }
  const validTargets = VALID_TRANSITIONS_BY_STATE[state];
  if (validTargets.length === 0) {
    return [];
  }
  return [
    {
      action: 'idea.transition',
      example: `idea.transition({ id: "${id}", to: "${validTargets[0]}", backend: "doc" })`,
      why: `Doc-mode transitions update frontmatter state in place. From "${state}", valid targets are: ${validTargets.join(', ')}.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// idea.list
// ---------------------------------------------------------------------------

export async function docList(
  vaultPath: string,
  args: { state?: string; limit?: number },
): Promise<ReturnType<typeof mcpText>> {
  const limit = args.limit ?? 50;
  const folder = path.join(vaultPath, DOC_MODE_FOLDER);

  let entries: string[];
  try {
    entries = await fs.readdir(folder);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return mcpText({
        result: {
          ideas: [],
          count: 0,
          backend: 'doc',
          filter: { state: args.state ?? null, limit },
        },
        next_steps: [
          {
            action: 'idea.create',
            example: 'idea.create({ title: "...", backend: "doc" })',
            why: 'No doc-mode ideas yet. Create the first one.',
          },
        ],
      });
    }
    throw err;
  }

  const ideas: Array<{
    id: string;
    title: string;
    state: DocIdeaState;
    vault_path: string;
    updated_at: string;
  }> = [];
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    const relPath = `${DOC_MODE_FOLDER}/${name}`;
    let parsed: DocModeIdea;
    try {
      const text = await fs.readFile(path.join(folder, name), 'utf8');
      parsed = parseDocIdea(text);
    } catch {
      // Skip files that fail to parse — doctor.consistency with
      // mode: 'doc' is the right place to surface them, not the listing.
      continue;
    }
    if (args.state && parsed.state !== args.state) continue;
    ideas.push({
      id: parsed.id,
      title: parsed.title,
      state: parsed.state,
      vault_path: relPath,
      updated_at: parsed.updatedAt,
    });
  }
  ideas.sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0));
  const trimmed = ideas.slice(0, limit);

  const next_steps: NextStep[] = trimmed.length
    ? [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${trimmed[0].id}", backend: "doc" })`,
          why: 'Dive into the most-recently-updated doc-mode idea.',
        },
      ]
    : [
        {
          action: 'idea.create',
          example: 'idea.create({ title: "...", backend: "doc" })',
          why: 'No doc-mode ideas match the filter. Create one or relax the filter.',
        },
      ];

  return mcpText({
    result: {
      ideas: trimmed,
      count: trimmed.length,
      backend: 'doc',
      filter: { state: args.state ?? null, limit },
    },
    next_steps,
  });
}

// ---------------------------------------------------------------------------
// idea.transition
// ---------------------------------------------------------------------------

export async function docTransition(
  vaultPath: string,
  args: { id?: string; to?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('doc-mode transition requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({ backend: "doc" })',
        why: 'List doc-mode ideas to find the id you meant to transition.',
      },
    ]);
  }
  if (!args.to) {
    return mcpError('doc-mode transition requires `to`', []);
  }

  const located = await locateDocIdea(vaultPath, args.id);
  if (located === null) {
    return mcpError(`doc-mode idea not found: ${args.id}`, []);
  }

  const { idea, relPath } = located;
  const validTargets = VALID_TRANSITIONS_BY_STATE[idea.state];
  if (!validTargets.includes(args.to as DocIdeaState)) {
    return mcpError(
      `invalid transition: ${idea.state} → ${args.to}. Valid targets from "${idea.state}": ${validTargets.join(', ') || 'none (terminal)'}.`,
      [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${idea.id}", backend: "doc" })`,
          why: 'Re-read the idea and pick a valid target state.',
        },
      ],
    );
  }

  const updated: DocModeIdea = {
    ...idea,
    state: args.to as DocIdeaState,
    updatedAt: new Date().toISOString(),
  };
  const absPath = path.join(vaultPath, relPath);
  await fs.writeFile(absPath, renderDocIdea(updated), 'utf8');

  return mcpText({
    result: {
      id: updated.id,
      from_state: idea.state,
      to_state: updated.state,
      vault_path: relPath,
      backend: 'doc',
      updated_at: updated.updatedAt,
    },
    next_steps: [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${updated.id}", backend: "doc" })`,
        why: 'Confirm the new state is reflected in the file.',
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface LocatedDocIdea {
  idea: DocModeIdea;
  relPath: string;
}

/**
 * Find a doc-mode idea by id by scanning the ideas-doc/ folder. Skips
 * files that fail to parse; the doctor surfaces those separately.
 *
 * For small vaults this O(n) scan is fine. If doc mode ever grows past
 * the "embeddable single-file lifecycle" scope, an index would be
 * justified — but that's a different product (probably with SQLite),
 * so we accept the linear scan here.
 */
async function locateDocIdea(vaultPath: string, id: string): Promise<LocatedDocIdea | null> {
  const folder = path.join(vaultPath, DOC_MODE_FOLDER);
  let entries: string[];
  try {
    entries = await fs.readdir(folder);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    const relPath = `${DOC_MODE_FOLDER}/${name}`;
    const text = await fs.readFile(path.join(folder, name), 'utf8');
    let parsed: DocModeIdea;
    try {
      parsed = parseDocIdea(text);
    } catch (err) {
      if (err instanceof DocFormatError) continue;
      throw err;
    }
    if (parsed.id === id) return { idea: parsed, relPath };
  }
  return null;
}

/**
 * Append an assumption to the `## Assumptions` section of an existing
 * doc-mode idea file. Used by `assumption.declare({ backend: "doc" })`.
 */
export async function docDeclareAssumption(
  vaultPath: string,
  args: {
    idea_id?: string;
    text?: string;
    load_bearing?: boolean;
    /**
     * Unix milliseconds, matching the SQLite-mode signature. Converted
     * to ISO-8601 UTC inside the file (the format is human-readable;
     * unix-ms timestamps in a markdown file are unreadable).
     */
    signpost_at?: number;
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.idea_id) {
    return mcpError('doc-mode assumption.declare requires `idea_id`', []);
  }
  if (!args.text || args.text.trim().length === 0) {
    return mcpError('doc-mode assumption.declare requires `text`', []);
  }
  const located = await locateDocIdea(vaultPath, args.idea_id);
  if (located === null) {
    return mcpError(`doc-mode idea not found: ${args.idea_id}`, []);
  }
  const { idea, relPath } = located;
  const assumptionId = `asm-${randomNanoid(8)}`;
  const updated: DocModeIdea = {
    ...idea,
    updatedAt: new Date().toISOString(),
    assumptions: [
      ...idea.assumptions,
      {
        id: assumptionId,
        text: args.text.trim(),
        loadBearing: args.load_bearing === true,
        signpostAt:
          typeof args.signpost_at === 'number'
            ? new Date(args.signpost_at).toISOString()
            : null,
        status: 'open',
      },
    ],
  };
  await fs.writeFile(path.join(vaultPath, relPath), renderDocIdea(updated), 'utf8');
  return mcpText({
    result: {
      id: assumptionId,
      idea_id: idea.id,
      vault_path: relPath,
      backend: 'doc',
    },
    next_steps: [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${idea.id}", backend: "doc" })`,
        why: 'Re-read the file to verify the new assumption block was appended cleanly.',
      },
    ],
  });
}

/**
 * Set the `## Verdict` block on a doc-mode idea. Used by
 * `outcome.log({ backend: "doc" })`. Doc-mode does not propagate, does
 * not cascade `needs_review`, and does not link to refuted/validated
 * assumption ids — see docs/single-doc-format.md.
 */
export async function docLogVerdict(
  vaultPath: string,
  args: { idea_id?: string; text?: string; verdict?: string },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.idea_id) {
    return mcpError('doc-mode outcome.log requires `idea_id`', []);
  }
  if (!args.text || args.text.trim().length === 0) {
    return mcpError('doc-mode outcome.log requires `text` (the rationale)', []);
  }
  if (args.verdict === undefined) {
    return mcpError(
      'doc-mode outcome.log requires a verdict. Pass `verdict: "pass" | "fail" | "parked"` explicitly, or pass a non-empty `refutes` array (infers fail) or `validates` array (infers pass).',
      [],
    );
  }
  const verdict = args.verdict;
  if (verdict !== 'pass' && verdict !== 'fail' && verdict !== 'parked') {
    return mcpError(`doc-mode outcome.log: verdict must be pass | fail | parked, got "${verdict}"`, []);
  }
  const located = await locateDocIdea(vaultPath, args.idea_id);
  if (located === null) {
    return mcpError(`doc-mode idea not found: ${args.idea_id}`, []);
  }
  const { idea, relPath } = located;
  const newState: DocIdeaState =
    verdict === 'pass' ? 'validated' : verdict === 'fail' ? 'refuted' : 'parked';
  const updated: DocModeIdea = {
    ...idea,
    state: newState,
    updatedAt: new Date().toISOString(),
    verdict: { state: verdict, rationale: args.text.trim() },
  };
  await fs.writeFile(path.join(vaultPath, relPath), renderDocIdea(updated), 'utf8');
  return mcpText({
    result: {
      idea_id: idea.id,
      verdict: updated.verdict,
      state: updated.state,
      vault_path: relPath,
      backend: 'doc',
    },
    next_steps: [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${idea.id}", backend: "doc" })`,
        why: 'Re-read the file to verify the verdict block landed and the state moved.',
      },
    ],
  });
}

/**
 * Local nanoid generator for doc-mode assumption ids. Avoids depending
 * on the core ids module's id-counter state — doc mode is filesystem-
 * authoritative and does not coordinate with the SQLite id sequence.
 */
function randomNanoid(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// ---------------------------------------------------------------------------
// idea.export_doc — SQLite → doc-mode migration
// ---------------------------------------------------------------------------

const SQLITE_TO_DOC_STATE: Record<string, DocIdeaState> = {
  nascent: 'nascent',
  explored: 'explored',
  evaluated: 'evaluated',
  committed: 'committed',
  validated: 'validated',
  refuted: 'refuted',
  parked: 'parked',
  killed: 'killed',
};

const SQLITE_TO_DOC_ASSUMPTION_STATUS: Record<string, DocAssumptionStatus> = {
  open: 'open',
  refuted: 'refuted',
  held: 'validated',
};

/**
 * Read an existing SQLite-mode idea and write it out as a doc-mode
 * portable `.md` file. One-way: import-back from doc to SQLite is
 * deliberately deferred (see docs/single-doc-format.md).
 *
 * What carries over:
 *   - frontmatter: id, title, state, created_at, updated_at
 *   - claim (from the idea body)
 *   - assumptions (text, load_bearing, signpost_at, status)
 *   - verdict (derived from the most recent outcome's refutes/validates)
 *   - lesson (from the outcome's memo lesson field if present)
 *
 * What does NOT carry over (doc mode does not model these):
 *   - council sessions / dispatches
 *   - lineage (ancestry / descendants / supersedes)
 *   - cross-idea citations
 *   - propagation flags
 *   - private decision-journal context
 *
 * The destination file is `<vault>/ideas-doc/<slug>-<id>.md` by
 * default; override with `output_path` (relative paths resolve under
 * the vault).
 */
export async function docExportFromSqlite(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string; output_path?: string; overwrite?: boolean },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('idea.export_doc requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List sqlite-mode ideas to find the id you want to export to doc format.',
      },
    ]);
  }

  const row = db
    .prepare(
      `SELECT id, vault_path, title, state, created_at, state_changed_at
         FROM ideas_notes WHERE id = ?`,
    )
    .get(args.id) as
    | {
        id: string;
        vault_path: string;
        title: string;
        state: string;
        created_at: number;
        state_changed_at: number;
      }
    | undefined;
  if (!row) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to confirm the id.',
      },
    ]);
  }

  const docState = SQLITE_TO_DOC_STATE[row.state];
  if (docState === undefined) {
    return mcpError(`unknown sqlite-mode state "${row.state}" cannot be mapped to a doc-mode state`, []);
  }

  // Idea markdown body becomes the claim. Strip frontmatter cheaply
  // (we already have authoritative frontmatter in the DB row).
  let claim = '';
  try {
    const md = await fs.readFile(path.join(vaultPath, row.vault_path), 'utf8');
    claim = stripFrontmatter(md).trim();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // Stale row (markdown missing); just emit empty claim.
  }

  const assumptionRows = db
    .prepare(
      `SELECT id, text, decision, status, load_bearing, signpost_at
         FROM ideas_assumptions
        WHERE idea_id = ?
        ORDER BY declared_at ASC`,
    )
    .all(args.id) as Array<{
    id: string;
    text: string;
    decision: string | null;
    status: string;
    load_bearing: number;
    signpost_at: number | null;
  }>;

  const assumptions: DocAssumption[] = assumptionRows.map((r) => ({
    id: r.id,
    // Prefer the decision clause of the Y-statement (the actionable
    // claim) over the free-form text when both exist. Falls back to
    // text. Always normalized to single-line for doc-mode parser.
    text: (r.decision?.trim() || r.text.trim()).replace(/\s+/gu, ' '),
    loadBearing: r.load_bearing === 1,
    signpostAt: r.signpost_at == null ? null : new Date(r.signpost_at).toISOString(),
    status: SQLITE_TO_DOC_ASSUMPTION_STATUS[r.status] ?? 'open',
  }));

  // Latest non-undone outcome → verdict block (+ optional lesson from memo).
  const outcome = db
    .prepare(
      `SELECT id, landed_at
         FROM ideas_outcomes
        WHERE idea_id = ? AND undone_at IS NULL
        ORDER BY landed_at DESC
        LIMIT 1`,
    )
    .get(args.id) as { id: string; landed_at: number } | undefined;

  let verdict: { state: DocVerdictState; rationale: string } | null = null;
  let lesson = '';
  if (outcome) {
    const verdictRows = db
      .prepare(
        `SELECT verdict FROM ideas_outcome_verdicts WHERE outcome_id = ?`,
      )
      .all(outcome.id) as Array<{ verdict: string }>;
    const refutes = verdictRows.filter((v) => v.verdict === 'refuted').length;
    const validates = verdictRows.filter((v) => v.verdict === 'validated').length;
    const verdictState: DocVerdictState =
      refutes > 0 ? 'fail' : validates > 0 ? 'pass' : 'parked';
    const outcomeRow = db
      .prepare(`SELECT text FROM ideas_outcomes WHERE id = ?`)
      .get(outcome.id) as { text: string } | undefined;
    if (outcomeRow) {
      verdict = {
        state: verdictState,
        rationale: outcomeRow.text.trim().replace(/\s+/gu, ' '),
      };
    }
    const memo = db
      .prepare(`SELECT memo_json FROM ideas_outcome_memos WHERE outcome_id = ?`)
      .get(outcome.id) as { memo_json: string } | undefined;
    if (memo?.memo_json) {
      try {
        const parsed = JSON.parse(memo.memo_json) as { lesson?: string };
        if (typeof parsed.lesson === 'string') lesson = parsed.lesson.trim();
      } catch {
        // memo blob is opaque to doc-mode; if it doesn't parse, the
        // outcome still has its rationale in the verdict block.
      }
    }
  }

  const idea: DocModeIdea = {
    id: row.id,
    title: row.title,
    state: docState,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.state_changed_at).toISOString(),
    claim,
    testCondition: '',
    assumptions,
    evidenceLog: [],
    verdict,
    lesson,
  };

  const slug = slugifyDocTitle(row.title);
  const relPath = args.output_path ?? buildDocIdeaPath(slug, row.id);
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(vaultPath, relPath);

  if (!args.overwrite) {
    try {
      await fs.access(absPath);
      return mcpError(`refusing to overwrite existing file at ${relPath}; pass overwrite: true to force`, []);
    } catch {
      // ENOENT — fine, proceed.
    }
  }
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, renderDocIdea(idea), 'utf8');

  return mcpText({
    result: {
      sqlite_id: row.id,
      doc_path: relPath,
      assumptions_count: assumptions.length,
      has_verdict: verdict !== null,
      backend_source: 'sqlite',
      backend_target: 'doc',
    },
    next_steps: [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${row.id}", backend: "doc" })`,
        why: 'Read the exported doc-mode idea to verify the export landed cleanly.',
      },
      {
        action: 'doctor.consistency',
        example: 'doctor.consistency({ mode: "doc" })',
        why: 'Validate the doc-mode file against the format invariants (round-trip, state/verdict, transition order, section shape).',
      },
    ],
  });
}

function stripFrontmatter(md: string): string {
  if (!md.startsWith('---\n')) return md;
  const end = md.indexOf('\n---\n', 4);
  if (end < 0) return md;
  return md.slice(end + 5);
}

