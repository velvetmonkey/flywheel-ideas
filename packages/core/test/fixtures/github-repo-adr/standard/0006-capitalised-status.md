---
Title: "6. Capitalised Frontmatter Field Names"
Status: accepted
---

## Status

Accepted (the frontmatter has `Title:` and `Status:` with capital first
letters and lowercase status value — the adapter normalises both).

## Context

Real-world frontmatter drift: contributors paste from ADR templates that
use different field-name casing.

## Decision

Adapter accepts case-insensitive field names AND case-insensitive status
values. Both are normalised to canonical form before storage.

## Consequences

- More forgiving of contributor variance.
- `extractedFields.normalised: true` flags the rescue so reviewers know
  the source isn't pristine.
