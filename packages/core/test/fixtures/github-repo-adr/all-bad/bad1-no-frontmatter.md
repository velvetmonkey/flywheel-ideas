# An ADR Without Any Frontmatter

This file has a markdown heading but no YAML frontmatter at all. The adapter
should reject it.

## Decision

Even though the markdown body is well-formed, the adapter requires
frontmatter and should skip this file.
