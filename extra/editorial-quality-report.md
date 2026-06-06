# Editorial Quality Report

Generated: 2026-06-06T14:45:13.925Z
Overall: passed

## Summary

- Narrative status: current
- Public copy warnings: 277
- Reader-task audit: passed (13 passed, 0 issues, 0 warnings)
- Top public-copy terms: durable: 87, translation: 51, mechanistic: 46, functional benefit: 36, pathway engagement: 13, trial-watch: 12, support map: 8, biomarker-heavy: 7

## Gates

- PASS: Narrative is current
  Status is current.
- PASS: Reader-task audit has no issues
  0 issue(s), 0 warning(s).
- PASS: Public copy warnings <= 280
  Current public copy warning count is 277.
- PASS: Reader-task warnings <= 0
  Current reader-task warning count is 0.

## Command Output

### Narrative status

Command: `node scripts/progress-narrative.mjs status`
Exit code: 0

```text
Progress narrative status: current
Last reviewed: 2026-06-06
Review due: 2026-07-06
Watched outlooks: 11
Changed or missing snapshots: 0
New outlook-affecting publication events: 0
```

### Public copy lint

Command: `node scripts/public-copy-lint.mjs --write`
Exit code: 0

```text
Public copy warnings: 277
Top terms: durable: 87, translation: 51, mechanistic: 46, functional benefit: 36, pathway engagement: 13, trial-watch: 12, support map: 8, biomarker-heavy: 7
Wrote extra/public-copy-report.md.
```

### Reader task audit

Command: `node scripts/reader-task-audit.mjs --write`
Exit code: 0

```text
Reader task audit: passed (13 passed, 0 issue(s), 0 warning(s))
Wrote extra/reader-task-audit.md.
```

