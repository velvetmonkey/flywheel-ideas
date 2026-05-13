import {
  createIdea,
  setIdeaExtension,
  type IdeaContextInput,
  type IdeasDatabase,
} from '@velvetmonkey/flywheel-ideas-core';
import { mcpError, mcpText, type NextStep } from '../../next_steps.js';

export async function handleCreate(
  vaultPath: string,
  db: IdeasDatabase,
  args: {
    title?: string;
    body?: string;
    context?: IdeaContextInput & {
      alternatives_considered?: Array<{ title: string; why_rejected: string }>;
    };
  },
): Promise<ReturnType<typeof mcpText>> {
  if (!args.title) {
    return mcpError('create requires `title`', [
      {
        action: 'idea.create',
        example: 'idea.create({ title: "Your idea, one sentence" })',
        why: 'Title becomes the kebab-slug filename plus the frontmatter title — keep it short and specific.',
      },
    ]);
  }

  const result = await createIdea(db, vaultPath, {
    title: args.title,
    body: args.body,
  });

  if (args.context) {
    setIdeaExtension(db, result.id, {
      context: {
        situational_context: args.context.situational_context,
        mental_or_physical_state: args.context.mental_or_physical_state,
        expected_outcome: args.context.expected_outcome,
        review_date: args.context.review_date,
      },
      alternatives: args.context.alternatives_considered,
    });
  }

  const next_steps: NextStep[] = [
    {
      action: 'assumption.declare',
      example: `assumption.declare({ idea_id: "${result.id}", context: "...", challenge: "...", decision: "...", tradeoff: "..." })`,
      why: 'Y-statement assumptions give the council specific claims to attack later. Declare them before running council so the stress-test is grounded.',
    },
    {
      action: 'idea.read',
      example: `idea.read({ id: "${result.id}" })`,
      why: 'Verify the markdown note was written with the expected frontmatter.',
    },
  ];

  return mcpText({
    result: {
      id: result.id,
      state: result.state,
      title: result.title,
      vault_path: result.vault_path,
      write_path: result.write_path,
      created_at: result.created_at,
      context_recorded: args.context ? true : false,
    },
    next_steps,
  });
}
