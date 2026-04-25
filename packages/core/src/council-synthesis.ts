/**
 * Deterministic markdown synthesis of a council session (M8).
 *
 * NOT the LLM-driven synthesis (that's v0.2). This is a pure template: given
 * the session row + view rows, produce a stable markdown string. Same inputs
 * always produce the same bytes.
 *
 * Sections:
 *   1. Frontmatter + title + meta
 *   2. Executive table (persona | confidence | stance snippet | status)
 *   3. Per-view rendering (stance, key risks, assumptions cited, reflection, evidence)
 *   4. Failed cells (failure_reason + stderr tail)
 *   5. Next steps checklist
 *
 * writeSynthesis() writes the rendered content under
 * `<vault>/councils/<idea_id>/session-<index>/SYNTHESIS.md` via writeNote.
 */

import * as path from 'node:path';
import matter from 'gray-matter';
import type { CouncilSessionRow, CouncilViewRow } from './council-sessions.js';
import type { CouncilStance } from './council-parsers.js';
import { writeNote } from './write/index.js';
import type { WriteNoteResult } from './write/direct-fs.js';
import { extractOverlap, type ViewStanceInput } from './council-overlap.js';

export interface SynthesisInput {
  session: CouncilSessionRow;
  views: CouncilViewRow[];
  /** Parsed stance per view id, when available. */
  stances: Map<string, CouncilStance>;
  idea_title: string;
  idea_id: string;
}

/**
 * Render the full SYNTHESIS.md body. Deterministic: sorts views by `rowid`-
 * analog (their slot in the `views` array — caller should pass them in the
 * dispatch order).
 */
export function renderSynthesisMarkdown(input: SynthesisInput): string {
  const { session, views, stances, idea_title, idea_id } = input;

  const succeeded = views.filter((v) => v.failure_reason == null);
  const failed = views.filter((v) => v.failure_reason != null);

  const bodyLines: string[] = [];

  bodyLines.push(`# Council session ${session.id}`);
  bodyLines.push('');
  bodyLines.push(`**Idea:** [[${escapeWikilinkTarget(idea_title)}]] (\`${idea_id}\`)`);
  bodyLines.push(`**Mode:** ${session.mode}`);
  bodyLines.push(`**Depth:** ${session.depth}`);
  bodyLines.push(`**Started:** ${isoOrBlank(session.started_at)}`);
  bodyLines.push(`**Completed:** ${isoOrBlank(session.completed_at)}`);
  if (session.started_at && session.completed_at) {
    bodyLines.push(
      `**Duration:** ${Math.round((session.completed_at - session.started_at) / 100) / 10}s`,
    );
  }
  bodyLines.push('');

  // Executive table
  bodyLines.push('## Executive');
  bodyLines.push('');
  if (succeeded.length === 0) {
    bodyLines.push('_All cells failed — see "Failed cells" below._');
  } else {
    bodyLines.push('| Persona | Model | Confidence | Stance (first line) |');
    bodyLines.push('|---|---|---|---|');
    for (const v of succeeded) {
      const parsed = stances.get(v.id);
      const stance = parsed?.stance ?? v.stance ?? '';
      // Prefer the parsed envelope's confidence (authoritative); fall back to
      // the row's stored value.
      const rawConf = parsed?.confidence ?? v.confidence;
      const conf = rawConf == null ? '—' : rawConf.toFixed(2);
      bodyLines.push(
        `| ${humanPersona(v.persona)} | ${v.model} | ${conf} | ${truncateOneLine(stance, 80)} |`,
      );
    }
  }
  bodyLines.push('');

  // Per-view rendering
  if (succeeded.length > 0) {
    bodyLines.push('## Views');
    bodyLines.push('');
    for (const v of succeeded) {
      const stance = stances.get(v.id);
      bodyLines.push(`### ${humanPersona(v.persona)} (${v.model})`);
      bodyLines.push('');
      bodyLines.push(stance?.stance ?? v.stance ?? '_(no stance)_');
      bodyLines.push('');

      if (stance && stance.key_risks.length > 0) {
        bodyLines.push('**Key risks:**');
        for (const r of stance.key_risks) bodyLines.push(`- ${r}`);
        bodyLines.push('');
      }
      if (stance && stance.fragile_insights.length > 0) {
        bodyLines.push('**Fragile insights:**');
        for (const f of stance.fragile_insights) bodyLines.push(`- ${f}`);
        bodyLines.push('');
      }
      if (stance && stance.assumptions_cited.length > 0) {
        bodyLines.push(
          `**Assumptions cited:** ${stance.assumptions_cited.map((a) => `\`${a}\``).join(', ')}`,
        );
        bodyLines.push('');
      }
      if (stance) {
        bodyLines.push('**Metacognitive reflection:**');
        bodyLines.push(
          `- Could be wrong if: ${stance.metacognitive_reflection.could_be_wrong_if}`,
        );
        bodyLines.push(
          `- Most vulnerable assumption: \`${stance.metacognitive_reflection.most_vulnerable_assumption}\``,
        );
        bodyLines.push(
          `- Confidence rationale: ${stance.metacognitive_reflection.confidence_rationale}`,
        );
        bodyLines.push('');
      }
      if (stance && stance.evidence.length > 0) {
        bodyLines.push('**Evidence:**');
        for (const e of stance.evidence) {
          bodyLines.push(`- "${e.claim}" — ${e.source}`);
        }
        bodyLines.push('');
      }
    }
  }

  // Evidence union (deduped across views)
  const unionEvidence = dedupeEvidence(succeeded, stances);
  if (unionEvidence.length > 0) {
    bodyLines.push('## Evidence (union, deduped)');
    bodyLines.push('');
    for (const e of unionEvidence) {
      bodyLines.push(`- "${e.claim}" — ${e.source}`);
    }
    bodyLines.push('');
  }

  // Agreement / disagreement (M11): sentence-level Jaccard overlap across
  // the successful views' stances. Skipped when there are <2 successful
  // views — no peer to compare against.
  if (succeeded.length >= 2) {
    const overlapInput: ViewStanceInput[] = [];
    for (const v of succeeded) {
      const parsed = stances.get(v.id);
      const stance = parsed?.stance ?? v.stance ?? '';
      if (!stance.trim()) continue;
      overlapInput.push({
        persona: v.persona,
        persona_name: humanPersona(v.persona),
        model: v.model,
        stance,
      });
    }

    const { agreement, disagreement } = extractOverlap(overlapInput);

    bodyLines.push('## Agreement');
    bodyLines.push('');
    if (agreement.length === 0) {
      bodyLines.push('_(no shared claims across views at current threshold)_');
    } else {
      for (const frag of agreement) {
        bodyLines.push(
          `- "${frag.sentence}" _(${frag.persona_names.join(', ')})_`,
        );
      }
    }
    bodyLines.push('');

    bodyLines.push('## Disagreement');
    bodyLines.push('');
    if (disagreement.length === 0) {
      bodyLines.push('_(all claims echoed by another view)_');
    } else {
      for (const bucket of disagreement) {
        bodyLines.push(`### ${bucket.persona_name}`);
        bodyLines.push('');
        for (const s of bucket.sentences) bodyLines.push(`- "${s}"`);
        bodyLines.push('');
      }
    }
  }

  // Failed cells
  bodyLines.push('## Failed cells');
  bodyLines.push('');
  if (failed.length === 0) {
    bodyLines.push('_(none)_');
  } else {
    for (const v of failed) {
      bodyLines.push(`### ${humanPersona(v.persona)} (${v.model}) — ${v.failure_reason}`);
      bodyLines.push('');
      if (v.stderr_tail && v.stderr_tail.trim()) {
        bodyLines.push('```');
        bodyLines.push(v.stderr_tail.trim());
        bodyLines.push('```');
        bodyLines.push('');
      } else {
        bodyLines.push('_(no stderr captured)_');
        bodyLines.push('');
      }
    }
  }

  // Next steps
  bodyLines.push('## Next steps');
  bodyLines.push('');
  bodyLines.push(`- [ ] \`idea.read({ id: "${idea_id}" })\` — re-read with council context`);
  bodyLines.push(
    `- [ ] \`assumption.signposts_due({ idea_id: "${idea_id}" })\` — check any flagged signposts`,
  );
  bodyLines.push(
    '- [ ] `idea.transition({ id, to: ..., reason: "..." })` — if the council changed your view',
  );
  bodyLines.push(
    '- [ ] `assumption.declare(...)` — add any new assumption the council surfaced',
  );
  bodyLines.push('');

  const frontmatter = {
    type: 'council_synthesis',
    session_id: session.id,
    idea_id,
    mode: session.mode,
    depth: session.depth,
  };

  return matter.stringify(bodyLines.join('\n'), frontmatter);
}

export interface WriteSynthesisInput {
  vault_path: string;
  session_id: string;
  idea_id: string;
  session_index: number; // 1-based index within idea's sessions
  content: string;
}

export async function writeSynthesis(
  input: WriteSynthesisInput,
): Promise<{ relative_path: string; write_path: WriteNoteResult['write_path'] }> {
  const folder = buildSessionFolder(input.idea_id, input.session_index);
  const rel = path.posix.join(folder, 'SYNTHESIS.md');
  const result = await writeNote(
    input.vault_path,
    rel,
    {}, // body already has frontmatter from renderSynthesisMarkdown
    input.content,
    { overwrite: true },
  );
  return { relative_path: result.vault_path, write_path: result.write_path };
}

/** Council view markdown path. Used by orchestrator to write per-cell notes. */
export function buildViewNotePath(
  idea_id: string,
  session_index: number,
  cli: string,
  persona_id: string,
): string {
  const folder = buildSessionFolder(idea_id, session_index);
  return path.posix.join(folder, `${cli}-${persona_id}.md`);
}

function buildSessionFolder(idea_id: string, session_index: number): string {
  const padded = String(session_index).padStart(2, '0');
  return path.posix.join('councils', idea_id, `session-${padded}`);
}

// ---------- tiny helpers ----------

function escapeWikilinkTarget(title: string): string {
  // Obsidian wikilinks: `[[target]]`. Pipe and ] are reserved.
  return title.replace(/[\[\]|]/g, '').trim() || 'Untitled';
}

function isoOrBlank(ms: number | null): string {
  if (ms == null) return '_(not completed)_';
  return new Date(ms).toISOString();
}

function truncateOneLine(s: string, max: number): string {
  const firstLine = s.split('\n')[0] ?? s;
  const cleaned = firstLine.replace(/\|/g, '\\|');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function humanPersona(persona_id: string): string {
  return persona_id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dedupeEvidence(
  views: CouncilViewRow[],
  stances: Map<string, CouncilStance>,
): Array<{ claim: string; source: string }> {
  const seen = new Set<string>();
  const out: Array<{ claim: string; source: string }> = [];
  for (const v of views) {
    const stance = stances.get(v.id);
    if (!stance) continue;
    for (const e of stance.evidence) {
      const key = `${e.claim} ${e.source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}
