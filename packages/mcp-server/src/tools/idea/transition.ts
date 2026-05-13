import {
  IDEA_STATES,
  isIdeaState,
  patchFrontmatter,
  recordTransitionEnforced,
  TransitionPrereqError,
  type IdeasDatabase,
  type IdeaState,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export async function handleTransition(
  vaultPath: string,
  db: IdeasDatabase,
  args: { id?: string; to?: string; reason?: string; bypass_enforcement?: boolean },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.id) {
    return mcpError('transition requires `id`', [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'List ideas to find the id you want to transition.',
      },
    ]);
  }
  if (!args.to) {
    return mcpError('transition requires `to`', [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${args.id}" })`,
        why: `Check the current state before picking a target (valid states: ${IDEA_STATES.join(', ')}).`,
      },
    ]);
  }
  if (!isIdeaState(args.to)) {
    return mcpError(
      `invalid target state "${args.to}" — must be one of ${IDEA_STATES.join(', ')}`,
      [
        {
          action: 'idea.read',
          example: `idea.read({ id: "${args.id}" })`,
          why: 'Re-read the idea and pick a valid target state from the list above.',
        },
      ],
    );
  }

  // Capture the full pre-transition row so we can roll back if the fs patch
  // fails. Without state_changed_at we couldn't restore the previous
  // "transitioned at" timestamp after a rollback.
  const row = db
    .prepare(
      'SELECT vault_path, state, state_changed_at FROM ideas_notes WHERE id = ?',
    )
    .get(args.id) as
    | { vault_path: string; state: string; state_changed_at: number }
    | undefined;
  if (!row) {
    return mcpError(`idea not found: ${args.id}`, [
      {
        action: 'idea.list',
        example: 'idea.list({})',
        why: 'The id was not found in the database. List existing ideas to locate the right one.',
      },
    ]);
  }

  // Transition has two side effects that must stay consistent: DB row + fs
  // frontmatter. The DB insert+update is itself transactional, but if the fs
  // patch fails we would orphan the DB change — so we record, attempt, and
  // on fs failure roll back the DB transition.
  //
  // recordTransitionEnforced runs the canTransition prereq check first;
  // TransitionPrereqError carries a recovery_hint we surface as next_steps.
  let transition;
  try {
    transition = recordTransitionEnforced(db, args.id, args.to, {
      reason: args.reason,
      bypass_enforcement: args.bypass_enforcement,
    });
  } catch (err) {
    if (err instanceof TransitionPrereqError) {
      const hint: NextStep[] = err.recovery_hint
        ? [
            {
              action: 'idea.read',
              example: `idea.read({ id: "${args.id}" })`,
              why: `Prereq blocked the transition (${err.reason_code}). ${err.recovery_hint}`,
            },
            {
              action: 'idea.transition',
              example: `idea.transition({ id: "${args.id}", to: "${args.to}", reason: "<...>", bypass_enforcement: true })`,
              why: 'Override the gate explicitly if you have a reason (cleanup, migration, manual recovery). The discipline gate exists for a reason — use bypass sparingly.',
            },
          ]
        : [
            {
              action: 'idea.read',
              example: `idea.read({ id: "${args.id}" })`,
              why: 'Re-inspect the idea state — the transition was blocked.',
            },
          ];
      return mcpError(`transition blocked: ${err.reason_code} — ${err.reason}`, hint);
    }
    throw err;
  }

  let patchResult;
  try {
    patchResult = await patchFrontmatter(vaultPath, row.vault_path, {
      state: args.to,
      state_changed_at: new Date(transition.at).toISOString(),
    });
  } catch (err) {
    // Compensating rollback: remove the transition row, restore the previous
    // state + state_changed_at on ideas_notes. Wrapped in its own transaction
    // so either the full rollback applies or neither does.
    const rollback = db.transaction(() => {
      db.prepare('DELETE FROM ideas_transitions WHERE id = ?').run(transition.id);
      db.prepare('UPDATE ideas_notes SET state = ?, state_changed_at = ? WHERE id = ?').run(
        transition.from_state,
        row.state_changed_at,
        args.id,
      );
    });
    try {
      rollback();
    } catch {
      /* best effort; we still want to surface the original error */
    }
    const message = err instanceof Error ? err.message : String(err);
    return mcpError(`transition failed mid-flight (rolled back): ${message}`, [
      {
        action: 'idea.read',
        example: `idea.read({ id: "${args.id}" })`,
        why: 'Verify the idea is back to its pre-transition state. The fs write failed; the database transition was rolled back to match.',
      },
    ]);
  }

  const next_steps = buildTransitionNextSteps(args.id, args.to);

  return mcpText({
    result: {
      id: args.id,
      from_state: transition.from_state,
      to_state: transition.to_state,
      at: transition.at,
      reason: transition.reason,
      vault_path: row.vault_path,
      write_path: patchResult.write_path,
    },
    next_steps,
  });
}

function buildTransitionNextSteps(id: string, to: IdeaState): NextStep[] {
  const steps: NextStep[] = [
    {
      action: 'idea.read',
      example: `idea.read({ id: "${id}" })`,
      why: 'Confirm the state change is reflected in both the markdown frontmatter and the transition log.',
    },
  ];

  if (to === 'committed') {
    steps.push({
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${id}", context: "...", signpost_at: <unix-ms>, load_bearing: true })`,
      why: 'For committed ideas, declare load-bearing assumptions with signposts so the system can surface them for re-evaluation later.',
    });
  }

  if (to === 'validated' || to === 'refuted') {
    steps.push({
      action: 'outcome.log',
      example: `outcome.log({ idea_id: "${id}", text: "...", refutes: [], validates: [] })`,
      why: 'Record the outcome and which declared assumptions it validated or refuted — this is the compounding mechanism that flags dependent ideas.',
    });
  }

  return steps;
}
