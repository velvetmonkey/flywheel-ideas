---
title: "1. Pipeline Service Phase 1"
status: Accepted
topics:
  - kcp
  - tekton
applies_to:
  - pipeline-service
---

## Status

Accepted

## Context

The Pipeline Service needs to provide a Tekton-as-a-service abstraction that
spans multiple workload clusters via kcp APIBinding/APIExport.

## Decision

Build the Pipeline Service on top of kcp's APIBinding/APIExport machinery as
the substrate for cross-cluster Tekton orchestration. The control plane sees
PipelineRun objects via kcp APIs; workload clusters execute the actual
TaskRun objects.

## Consequences

- TaskRun objects cannot be synced to KCP, limiting interaction to
  PipelineRun objects only.
- PaC-created PipelineRun objects are not visible on kcp.
- Tekton Results stay on workload clusters.
