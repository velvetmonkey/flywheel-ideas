---
title: "5. SnapshotEnvironmentBinding Local Cache"
status: Deprecated
---

## Status

Deprecated; we no longer cache SEB state at the controller level (replaced
with direct API queries).

## Context

Earlier versions cached SEB state in-memory at each controller, which led
to stale-read bugs across replicas.

## Decision

Cache SEB state in-memory at each controller for 30 seconds before
re-fetching.

## Consequences

- Reduced API server load.
- Stale-read window during cache expiry.
