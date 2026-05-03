# Evidence

This directory contains checked-in evidence bundles from real dogfood runs.

## SEC Lifecycle Runs

- `sec-lifecycle-runs/2026-05-03T16-00-58-257Z/` is the expanded full real SEC + LLM lifecycle E2E run from 2026-05-03.
- `sec-lifecycle-runs/2026-05-03T14-04-54-838Z/` is the full real SEC + LLM lifecycle E2E run from 2026-05-03.

Those bundles include:

- `README.md` and `manifest.json` for the run summary and machine-readable assertions.
- `vault/reports/company-runs/<run-id>/index.md` as the top-level Flywheel-linked report table of contents.
- Generated company, sector, theme, pattern, review queue, accepted lesson, [[thesis]] delta, and run delta Markdown.
- Council output Markdown under `vault/councils/`.
- Raw SQLite state under `vault/.flywheel/ideas.db`.

Transient SQLite `-wal` and `-shm` files are intentionally omitted because they are process-local lock/journal artifacts, not durable evidence.
