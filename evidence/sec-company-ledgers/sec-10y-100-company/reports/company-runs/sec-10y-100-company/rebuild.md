---
id: company-run-sec-10y-100-company-rebuild
type: report
report_kind: company_ledger_rebuild_instructions
schema: sec-company-ledger-markdown-v1
run_id: sec-10y-100-company
entity_id: company-run-sec-10y-100-company-rebuild
entity_type: company_ledger_rebuild_instructions
source: flywheel-ideas
---
# Rebuild Instructions sec-10y-100-company

The committed evidence snapshot is Markdown-only by policy.

To rebuild operational state, parse Markdown files that contain `flywheel-audit-json` blocks and restore entities by `entity_id`, `entity_type`, `run_id`, and source hashes.

Do not expect SQLite, JSON, JSONL, WAL/SHM, or raw SEC cache files in git evidence snapshots.

## Flywheel Audit

```flywheel-audit-json
{
  "schema": "sec-company-ledger-markdown-v1",
  "run_id": "sec-10y-100-company",
  "entity_id": "company-run-sec-10y-100-company-rebuild",
  "entity_type": "company_ledger_rebuild_instructions",
  "path": "reports/company-runs/sec-10y-100-company/rebuild.md"
}
```
