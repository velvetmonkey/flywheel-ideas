---
title: "2. Pipeline Service Phase 2"
status: Replaced
superseded_by:
  - "0009"
  - "0032"
topics:
  - kcp
---

## Status

Replaced by [ADR-0009](./0009-pipelines-as-code.md) and ADR-0032.

## Context

The Phase 1 design accepted operational tradeoffs (TaskRun visibility gap,
single-cluster ingress) that proved untenable at scale.

## Decision

Replace the Phase 1 architecture with a simpler model that owns workload
clusters directly via the OpenShift Pipelines Operator.

## Consequences

- Operational complexity reduced.
- Lost: cross-cluster routing.
