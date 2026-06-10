# Editorial Quality Report

Generated: 2026-06-10T16:09:44.239Z
Overall: passed

## Summary

- Current LEV story status: current
- Public copy warnings: 14
- Reader-task audit: passed (14 passed, 0 issues, 0 warnings)
- Top public-copy terms: durable: 4, functional benefit: 2, mechanistic: 2, biomarker-heavy: 1, coverage repair: 1, low confidence: 1, public map: 1, support map: 1

## Gates

- PASS: Current LEV story is current
  Status is current.
- PASS: Reader-task audit has no issues
  0 issue(s), 0 warning(s).

## Command Output

### Current LEV story status

Command: `node scripts/current-lev-story.mjs status`
Exit code: 0

```text
Current LEV story status: current
Last reviewed: 2026-06-10
Review due: 2026-07-10
Watched outlooks: 15
Changed or missing snapshots: 0
New outlook-changing public updates: 0
```

### Public copy lint

Command: `node scripts/public-copy-lint.mjs --write`
Exit code: 0

```text
Public copy warnings: 14
Top terms: durable: 4, functional benefit: 2, mechanistic: 2, biomarker-heavy: 1, coverage repair: 1, low confidence: 1, public map: 1, support map: 1
Wrote extra/public-copy-report.md.
```

### Reader task audit

Command: `node scripts/reader-task-audit.mjs --write`
Exit code: 0

```text
Reader task audit: passed (14 passed, 0 issue(s), 0 warning(s))
Wrote extra/reader-task-audit.md.
```

