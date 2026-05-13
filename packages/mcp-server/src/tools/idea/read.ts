import {
  buildAssumptionNextStepsForIdea,
  getActiveWritePath,
  getIdeaContext,
  listTransitions,
  readNote,
  type IdeasDatabase,
  type IdeaState,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export function handleRead(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string },
): ReturnType<typeof mcpText> {
  if (!args.id) {
    return mcpError('read requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List existing ideas to find the id you meant to read.',
      },
    ]);
  }

  const row = db
    .prepare(
      `SELECT id, vault_path, title, state, needs_review, created_at, state_changed_at
       FROM ideas_notes WHERE id = ?`,
    )
    .get(args.id) as
    | {
        id: string;
        vault_path: string;
        title: string;
        state: string;
        needs_review: number;
        created_at: number;
        state_changed_at: number;
      }
    | undefined;

  if (!row) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List existing ideas to find the one you meant.',
      },
    ]);
  }

  const note = readNote(vaultPath, row.vault_path);
  const history = listTransitions(db, row.id);

  if (!note.exists) {
    return mcpText({
      result: {
        id: row.id,
        state: row.state,
        title: row.title,
        vault_path: row.vault_path,
        write_path: getActiveWritePath(),
        stale_row: true,
        note: 'Markdown file missing from vault — database row kept. The note may have been renamed or deleted outside flywheel-ideas.',
      },
      next_steps: [
        {
          action: 'idea.forget',
          example: `idea.forget({ id: "${row.id}" })`,
          why: 'If the idea is truly gone (deleted intentionally), remove the database pointer so it stops appearing in listings.',
        },
        {
          action: 'idea.list',
          example: 'idea.list({ include_stale: true })',
          why: 'Show all ideas INCLUDING stale ones to check if the file was renamed elsewhere. Stale ideas are filtered from the default listing.',
        },
      ],
    });
  }

  const next_steps = buildReadNextSteps(row.id, row.state as IdeaState, history.length === 0);

  const assumptionHints = buildAssumptionNextStepsForIdea(db, row.id);
  next_steps.push(...assumptionHints);

  return mcpText({
    result: {
      id: row.id,
      state: row.state,
      title: row.title,
      vault_path: row.vault_path,
      write_path: getActiveWritePath(),
      needs_review: Boolean(row.needs_review),
      created_at: row.created_at,
      state_changed_at: row.state_changed_at,
      frontmatter: note.frontmatter,
      body: note.body,
      context: getIdeaContext(db, row.id),
      transition_count: history.length,
    },
    next_steps,
  });
}

function buildReadNextSteps(id: string, state: IdeaState, noTransitionsYet: boolean): NextStep[] {
  const steps: NextStep[] = [];

  switch (state) {
    case 'nascent':
      steps.push(
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
          why: 'Declaring Y-statement assumptions is the prerequisite for a useful council run — the council attacks specific load-bearing claims.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "explored", reason: "initial exploration complete" })`,
          why: 'Move the idea forward once you have rough framing — this records the state change in the transition log.',
        },
      );
      break;

    case 'explored':
      steps.push(
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
          why: 'If you have not declared assumptions yet, do it now — the council needs load-bearing claims to attack.',
        },
        {
          action: 'council.run',
          example: `council.run({ id: "${id}", depth: "light", mode: "pre_mortem" })`,
          why: 'Pre-mortem mode asks the council to assume the idea has already failed and reconstruct why — counters founder optimism before commitment.',
        },
      );
      break;

    case 'evaluated':
      steps.push(
        {
          action: 'council.run',
          example: `council.run({ id: "${id}", depth: "full", mode: "standard" })`,
          why: 'A full-depth standard-mode council is appropriate once the idea is well-framed. Pairs with any prior pre-mortem run.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "committed", reason: "council surfaced no fatal risks; committing" })`,
          why: 'Commit the idea so you can later log outcomes against it. Requires a human rationale.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "parked", reason: "revisit after <signpost>" })`,
          why: 'Park the idea if the council raised risks that are not yet resolvable. Parked ideas come back via signpost surfacing (v0.2).',
        },
      );
      break;

    case 'committed':
      steps.push(
        {
          action: 'assumption.declare',
          example: `assumption.declare({ idea_id: "${id}", context: "...", signpost_at: <unix-ms>, load_bearing: true })`,
          why: 'For committed ideas, declare load-bearing assumptions with signposts so the system can surface them for re-evaluation later.',
        },
        {
          action: 'outcome.log',
          example: `outcome.log({ idea_id: "${id}", text: "...", refutes: [], validates: [] })`,
          why: 'When reality arrives, log the outcome and which declared assumptions it validated or refuted. This is the compounding mechanism.',
        },
      );
      break;

    case 'validated':
      steps.push(
        {
          action: 'idea.list',
          example: 'idea.list({ state: "committed" })',
          why: 'Browse other committed ideas — a validated outcome often invalidates or reinforces assumptions for them too.',
        },
        {
          action: 'idea.create',
          example: 'idea.create({ title: "Next bet building on this result" })',
          why: 'Validated outcomes are often springboards — create a follow-on idea that branches from this learning.',
        },
      );
      break;

    case 'refuted':
      steps.push(
        {
          action: 'idea.list',
          example: 'idea.list({ state: "committed" })',
          why: 'Browse other committed ideas — a refuted outcome often flags assumptions shared across the roadmap. (Assumption-propagation automation ships in v0.2.)',
        },
        {
          action: 'outcome.log',
          example: `outcome.log({ idea_id: "${id}", text: "post-mortem: what specifically broke, what we learned" })`,
          why: 'If the refutation log is sparse, expand it — the learning is the value of a failed bet.',
        },
      );
      break;

    case 'parked':
      steps.push(
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "explored", reason: "<why-now>" })`,
          why: 'Un-park the idea when conditions have changed — this creates a new transition record and restarts the loop.',
        },
        {
          action: 'idea.transition',
          example: `idea.transition({ id: "${id}", to: "killed", reason: "permanently wrong fit" })`,
          why: 'If the idea is truly dead, move it to killed. The transition log preserves history for future reference.',
        },
      );
      break;

    case 'killed':
      steps.push(
        {
          action: 'idea.list',
          example: 'idea.list({ state: "committed" })',
          why: 'Killed is terminal — there is nothing to do here. Browse active ideas instead.',
        },
        {
          action: 'idea.forget',
          example: `idea.forget({ id: "${id}" })`,
          why: 'If the killed idea is truly dead to you (no future reference value), forget it to clean up the ledger.',
        },
      );
      break;
  }

  if (!noTransitionsYet && state === 'nascent') {
    return steps.filter((s) => !s.example.includes('to: "explored"'));
  }

  return steps;
}
