/**
 * Pure helper for creating an idea — writes the markdown note + inserts the
 * `ideas_notes` row. Shared between the `idea.create` MCP handler and
 * `import.promote(as: 'idea')` so imported ideas are byte-indistinguishable
 * from hand-authored ones.
 *
 * Callers own id + created_at generation so the tests can pin them for
 * deterministic assertions. Defaults mirror the v0.1 handler behaviour.
 */

import type { IdeasDatabase } from './db.js';
import { generateIdeaId } from './ids.js';
import { INITIAL_STATE } from './lifecycle.js';
import { buildIdeaPath } from './idea-paths.js';
import { writeNote } from './write/index.js';
import type { WriteNoteResult } from './write/direct-fs.js';

export interface CreateIdeaInput {
  title: string;
  /** Markdown body. Defaults to a single `# <title>` heading. */
  body?: string;
  /** Additional frontmatter keys merged in before id/type/state/title/created_at. */
  extraFrontmatter?: Record<string, unknown>;
  /** Pre-seeded id. Defaults to `generateIdeaId()`. */
  id?: string;
  /** Pre-seeded ms timestamp. Defaults to `Date.now()`. */
  now?: number;
}

export interface CreateIdeaResult {
  id: string;
  state: string;
  title: string;
  vault_path: string;
  write_path: WriteNoteResult['write_path'];
  created_at: number;
}

export async function createIdea(
  db: IdeasDatabase,
  vaultPath: string,
  input: CreateIdeaInput,
): Promise<CreateIdeaResult> {
  const id = input.id ?? generateIdeaId();
  const now = input.now ?? Date.now();
  const relPath = buildIdeaPath(input.title, now);
  const body = input.body ?? `# ${input.title}\n\n`;
  const frontmatter: Record<string, unknown> = {
    ...(input.extraFrontmatter ?? {}),
    id,
    type: 'idea',
    state: INITIAL_STATE,
    title: input.title,
    created_at: new Date(now).toISOString(),
  };

  const writeResult = await writeNote(vaultPath, relPath, frontmatter, body);

  db.prepare(
    `INSERT INTO ideas_notes (id, vault_path, title, state, created_at, state_changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, writeResult.vault_path, input.title, INITIAL_STATE, now, now);

  return {
    id,
    state: INITIAL_STATE,
    title: input.title,
    vault_path: writeResult.vault_path,
    write_path: writeResult.write_path,
    created_at: now,
  };
}
