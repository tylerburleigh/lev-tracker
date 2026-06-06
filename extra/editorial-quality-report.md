# Editorial Quality Report

Generated: 2026-06-06T14:39:12.382Z
Overall: passed

## Summary

- Narrative status: current
- Public copy warnings: 323
- Reader-task audit: passed (13 passed, 0 issues, 0 warnings)
- Top public-copy terms: durable: 103, translation: 58, mechanistic: 47, functional benefit: 39, pathway engagement: 18, trial-watch: 18, support map: 9, translational: 9

## Gates

- PASS: Narrative is current
  Status is current.
- PASS: Reader-task audit has no issues
  0 issue(s), 0 warning(s).

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
Public copy warnings: 323
Top terms: durable: 103, translation: 58, mechanistic: 47, functional benefit: 39, pathway engagement: 18, trial-watch: 18, support map: 9, translational: 9
Wrote extra/public-copy-report.md.
```

### Reader task audit

Command: `node scripts/reader-task-audit.mjs --write`
Exit code: 0

```text
Reader task audit: passed (13 passed, 0 issue(s), 0 warning(s))
Wrote extra/reader-task-audit.md.
```

