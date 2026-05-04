# Evidence

This directory contains checked-in, browsable proof surfaces from dogfood runs.

## Python Decision Pilot

The Python 2 to 3 [[pilot]] evidence remains the baseline non-SEC corpus:

- [`../pilot/RESULT.md`](../pilot/RESULT.md)
- [`../pilot/RESULT.wedges.md`](../pilot/RESULT.wedges.md)
- [`../docs/pilot.md`](../docs/pilot.md)

## SEC Company Ledgers

SEC evidence now uses a stable compounding ledger instead of dated run folders.

The target corpus is:

```text
evidence/sec-company-ledgers/sec-10y-100-company/
```

Generate it with:

```bash
export FLYWHEEL_IDEAS_IMPORT_NETWORK=1
export FLYWHEEL_IDEAS_SEC_USER_AGENT="your-app-name contact: you@example.com"
npm run build -w @velvetmonkey/flywheel-ideas-core
node scripts/sec-sector-lifecycle-bundle.mjs
```

That runner scans a 10-year SEC 10-K/10-Q window for the sector cohort, compounds refreshes into the same ledger id, and exports the generated vault Markdown as repository evidence.

## Commit Policy

Commit Markdown artifacts only. Do not commit SQLite databases, JSON/JSONL reports, raw SEC caches, WAL/SHM journals, or backup files.

The local working ledger under `/home/ben/sec-dogfood/company-ledgers/` may contain runtime state needed for refreshes. The committed evidence directory is the public, rebuildable Markdown corpus.
