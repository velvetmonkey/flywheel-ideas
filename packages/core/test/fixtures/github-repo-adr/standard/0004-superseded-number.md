---
title: "4. Cluster Lifecycle ADR"
status: Superseded
superseded_by: 11
---

## Status

Superseded by ADR-0011 (numbered as a bare integer in the frontmatter,
which the adapter normalises to "0011").

## Context

How workload clusters are provisioned and torn down.

## Decision

Use a custom controller that watches a CR for cluster lifecycle events and
talks to the cluster-api provider directly.

## Consequences

- Faster than going through Argo.
- Couples the Pipeline Service to cluster-api semantics.
