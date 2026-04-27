---
title: "7. ADR With No Decision Section"
status: Accepted
---

## Status

Accepted

## Context

This ADR has frontmatter but the Decision section was accidentally omitted
during authoring. The adapter should still emit an idea candidate but
should NOT emit an assumption candidate (no Decision = no load-bearing
claim to extract).

## Consequences

- Idea candidate emitted (full body in `bodyMd`).
- Assumption candidate skipped.
- No outcome (status is Accepted).
