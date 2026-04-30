# Trigger 1 Workflow

This is the exact operator path for Trigger 1 dogfood: run a real decision through the new queue, produce a shareable artifact, and capture feedback from one named human.

## Goal

Prove that the newly landed queue is usable end to end:

1. capture private decision context
2. log a refuting outcome
3. run a retrospective anti-portfolio council pass
4. accept or revise the memo draft
5. produce a redacted artifact for someone else to read
6. capture their written feedback

## Workflow

1. Create the idea with private context.

```json
idea.create({
  "title": "Decide whether to ship the internal beta",
  "body": "# Decision\n\nWhy now, what we know, and what we need to decide.",
  "context": {
    "situational_context": "Planning week before launch review",
    "mental_or_physical_state": "Tired but deadline-aware",
    "expected_outcome": "Choose a path before Friday",
    "review_date": "2026-05-07",
    "alternatives_considered": [
      { "title": "Wait one sprint", "why_rejected": "Would miss the launch window" }
    ]
  }
})
```

2. Verify that `idea.read` returns `context`, and that the markdown note itself does not contain that private data.

3. Declare the load-bearing assumptions.

4. When reality refutes the decision, log the outcome.

```json
outcome.log({
  "idea_id": "<idea_id>",
  "text": "Reality contradicted the key assumption after the rollout test.",
  "refutes": ["<assumption_id>"]
})
```

5. Run the retrospective council pass.

```json
council.run({
  "mode": "anti_portfolio",
  "outcome_id": "<outcome_id>",
  "confirm": true
})
```

6. Review the returned `proposed_memo`. If you accept it, persist it explicitly.

```json
outcome.memo_upsert({
  "outcome_id": "<outcome_id>",
  "memo": <proposed_memo>
})
```

7. Run the internal effectiveness report for the relevant time window.

```json
council.effectiveness_report({
  "from_ms": 0,
  "to_ms": 9999999999999
})
```

8. Export the shareable artifact twice:
   - default export for the external human
   - private-context export for internal review only

```json
idea.export({
  "idea_ids": ["<idea_id>"],
  "output_path": "exports/trigger-1-default.md"
})
```

```json
idea.export({
  "idea_ids": ["<idea_id>"],
  "include_private_context": true,
  "output_path": "exports/trigger-1-private.md"
})
```

9. Hand only the default export to one named human and capture their written feedback against issue `#38`.

## Verification points

- `idea.read.context` is populated, but the note file contains no private context.
- Default export omits private context completely.
- Private export includes the context section.
- `council.run(mode: "anti_portfolio")` returns a draft but does not mutate the stored memo by itself.
- `outcome.read` shows the canonical memo only after `outcome.memo_upsert`.
- `council.effectiveness_report` excludes retrospective sessions.
