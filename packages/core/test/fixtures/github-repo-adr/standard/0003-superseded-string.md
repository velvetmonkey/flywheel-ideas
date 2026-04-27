---
title: "3. Initial Result Storage Strategy"
status: Superseded
superseded_by: "0017"
---

## Status

Superseded by ADR-0017.

## Context

Where to persist Tekton Results across multiple workload clusters.

## Decision

Store Tekton Results on each workload cluster locally and federate via a
read-only aggregator at the control-plane layer.

## Consequences

- Results queryable across clusters (read-only).
- No write-through — workload-cluster failure means lost Results.
