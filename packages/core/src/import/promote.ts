/**
 * `import.promote` core — dispatch a persisted candidate row to the
 * existing v0.1 writers (createIdea / declareAssumption / logOutcome) and
 * flip the row's state to `imported`.
 *
 * Hard rule: imported notes must be byte-indistinguishable from
 * hand-authored ones. All writes go through the same helpers the MCP
 * handlers call, not through a parallel implementation.
 */

import { createIdea, type CreateIdeaResult } from '../idea-create.js';
import {
  declareAssumption,
  type AssumptionStructured,
  type DeclareAssumptionResult,
} from '../assumptions.js';
import { logOutcome, type OutcomeLogResult } from '../outcome.js';
import type { IdeasDatabase } from '../db.js';
import {
  CandidateStateError,
  getCandidate,
  markCandidateImported,
  parseExtractedFields,
  type ImportCandidateRow,
} from './candidates.js';
import type { CandidateKind } from './adapter.js';

export interface PromoteInput {
  candidate_id: string;
  as: CandidateKind;
  /** Required when `as` is 'assumption' or 'outcome'. */
  target_idea_id?: string;
  /**
   * When the candidate's `state` is 'duplicate', require the caller to
   * explicitly acknowledge — avoids silently creating a dup when the scan
   * flagged one.
   */
  override_duplicate?: boolean;
  /**
   * For outcomes: which assumptions this refutes. Accepted when `as='outcome'`.
   */
  refutes?: string[];
  validates?: string[];
}

export interface PromoteResult {
  candidate_id: string;
  kind: CandidateKind;
  promoted_id: string;
  vault_path: string;
  write_path: string;
  /** Whatever the underlying writer returned — kind-specific extra fields. */
  details: PromoteDetails;
}

export type PromoteDetails =
  | { kind: 'idea'; state: string; title: string; created_at: number }
  | {
      kind: 'assumption';
      idea_id: string;
      text: string;
      load_bearing: boolean;
      status: string;
    }
  | {
      kind: 'outcome';
      idea_id: string;
      refuted: string[];
      validated: string[];
      flagged_count: number;
    };

export class PromoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromoteValidationError';
  }
}

export class PromoteNotFoundError extends Error {
  constructor(id: string) {
    super(`candidate not found: ${id}`);
    this.name = 'PromoteNotFoundError';
  }
}

/**
 * Promote a candidate. Writes a vault note through the same helpers the v0.1
 * MCP handlers use, then atomically flips the candidate row to `imported`.
 */
export async function promoteCandidate(
  db: IdeasDatabase,
  vaultPath: string,
  input: PromoteInput,
): Promise<PromoteResult> {
  const row = getCandidate(db, input.candidate_id);
  if (!row) throw new PromoteNotFoundError(input.candidate_id);

  if (row.state === 'imported') {
    throw new CandidateStateError(
      `candidate ${row.id} already imported to ${row.imported_vault_path ?? '?'}`,
    );
  }
  if (row.state === 'rejected') {
    throw new CandidateStateError(`candidate ${row.id} is rejected`);
  }
  if (row.state === 'duplicate' && !input.override_duplicate) {
    throw new PromoteValidationError(
      `candidate ${row.id} is flagged duplicate of ${row.dedup_match_path ?? '?'}; ` +
        `pass override_duplicate: true to promote anyway`,
    );
  }

  if (input.as !== row.candidate_kind) {
    throw new PromoteValidationError(
      `candidate kind is "${row.candidate_kind}" but promote requested "${input.as}"`,
    );
  }

  if ((input.as === 'assumption' || input.as === 'outcome') && !input.target_idea_id) {
    throw new PromoteValidationError(
      `"${input.as}" promotion requires target_idea_id`,
    );
  }

  if (input.as === 'idea') {
    const idea = await createIdea(db, vaultPath, {
      title: row.title,
      body: row.body_md || `# ${row.title}\n\n`,
    });
    markCandidateImported(db, {
      id: row.id,
      imported_vault_path: idea.vault_path,
      imported_entity_id: idea.id,
    });
    return promoteResultForIdea(row, idea);
  }

  if (input.as === 'assumption') {
    const structured = extractAssumptionStructured(row);
    const assumption = await declareAssumption(db, vaultPath, {
      idea_id: input.target_idea_id!,
      text: structured ? undefined : (row.body_md.trim() || row.title),
      structured: structured ?? undefined,
      load_bearing: (parseExtractedFields(row)?.load_bearing as boolean) ?? false,
    });
    markCandidateImported(db, {
      id: row.id,
      imported_vault_path: assumption.assumption.vault_path,
      imported_entity_id: assumption.assumption.id,
    });
    return promoteResultForAssumption(row, assumption);
  }

  // outcome
  const outcome = await logOutcome(db, vaultPath, {
    idea_id: input.target_idea_id!,
    text: row.body_md.trim() || row.title,
    refutes: input.refutes,
    validates: input.validates,
  });
  markCandidateImported(db, {
    id: row.id,
    imported_vault_path: outcome.outcome.vault_path,
    imported_entity_id: outcome.outcome.id,
  });
  return promoteResultForOutcome(row, outcome);
}

function promoteResultForIdea(
  row: ImportCandidateRow,
  idea: CreateIdeaResult,
): PromoteResult {
  return {
    candidate_id: row.id,
    kind: 'idea',
    promoted_id: idea.id,
    vault_path: idea.vault_path,
    write_path: idea.write_path,
    details: {
      kind: 'idea',
      state: idea.state,
      title: idea.title,
      created_at: idea.created_at,
    },
  };
}

function promoteResultForAssumption(
  row: ImportCandidateRow,
  res: DeclareAssumptionResult,
): PromoteResult {
  return {
    candidate_id: row.id,
    kind: 'assumption',
    promoted_id: res.assumption.id,
    vault_path: res.assumption.vault_path,
    write_path: res.write_path,
    details: {
      kind: 'assumption',
      idea_id: res.assumption.idea_id,
      text: res.assumption.text,
      load_bearing: res.assumption.load_bearing,
      status: res.assumption.status,
    },
  };
}

function promoteResultForOutcome(
  row: ImportCandidateRow,
  res: OutcomeLogResult,
): PromoteResult {
  return {
    candidate_id: row.id,
    kind: 'outcome',
    promoted_id: res.outcome.id,
    vault_path: res.outcome.vault_path,
    write_path: res.write_path,
    details: {
      kind: 'outcome',
      idea_id: res.outcome.idea_id,
      refuted: res.refuted,
      validated: res.validated,
      flagged_count: res.flagged_ideas.length,
    },
  };
}

/**
 * If the extracted fields carry a structured Y-statement mapping, surface it
 * so declareAssumption writes the richer four-field body. Otherwise fall
 * back to the free-text path.
 */
function extractAssumptionStructured(
  row: ImportCandidateRow,
): AssumptionStructured | null {
  const fields = parseExtractedFields(row);
  if (!fields) return null;
  const s = fields.structured;
  if (!s || typeof s !== 'object') return null;
  const rec = s as Record<string, unknown>;
  const context = typeof rec.context === 'string' ? rec.context : null;
  const challenge = typeof rec.challenge === 'string' ? rec.challenge : null;
  const decision = typeof rec.decision === 'string' ? rec.decision : null;
  const tradeoff = typeof rec.tradeoff === 'string' ? rec.tradeoff : null;
  if (context && challenge && decision && tradeoff) {
    return { context, challenge, decision, tradeoff };
  }
  return null;
}
