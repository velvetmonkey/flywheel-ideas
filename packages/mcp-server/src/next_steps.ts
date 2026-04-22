/**
 * Shared `next_steps` builder for flywheel-ideas tool responses.
 *
 * Every tool response is `{result, next_steps}` stringified into an MCP
 * text-content envelope. The `next_steps` array is an ordered list of
 * `{action, example, why}` items the calling LLM uses to pick a sensible next
 * move. This makes the tool surface self-documenting — the lifecycle UX lives
 * in the responses, not in external docs.
 *
 * Keep items short, concrete (include a copy-pasteable `example`), and
 * justified (`why` explains the value, not the mechanics).
 */

export interface NextStep {
  action: string;
  example: string;
  why: string;
}

export interface ToolResponseEnvelope<TResult> {
  result: TResult;
  next_steps: NextStep[];
}

/**
 * Format a typed result + next_steps array into the MCP content envelope
 * (`{content: [{type: 'text', text: <json>}]}`). The text is JSON so the
 * caller can cleanly parse it; the LLM consuming the text can then surface
 * next_steps to the user.
 */
export function mcpText<T>(envelope: ToolResponseEnvelope<T>): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
  };
}

/** Same as mcpText but marks the response as an error. */
export function mcpError(message: string, nextSteps: NextStep[] = []): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, next_steps: nextSteps }, null, 2),
      },
    ],
    isError: true,
  };
}
