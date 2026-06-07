# Editorial Quality Report

Generated: 2026-06-07T13:57:29.139Z
Overall: passed

## Summary

- Current LEV story status: current
- Public copy warnings: 347
- Reader-task audit: passed (14 passed, 0 issues, 0 warnings)
- Top public-copy terms: durable: 110, functional benefit: 84, mechanistic: 49, translation: 49, trial-watch: 16, pathway engagement: 13, biomarker-heavy: 7, translational: 6

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
Last reviewed: 2026-06-07
Review due: 2026-07-07
Watched outlooks: 11
Changed or missing snapshots: 0
New outlook-changing public updates: 0
```

### Public copy lint

Command: `node scripts/public-copy-lint.mjs --write`
Exit code: 0

```text
Public copy warnings: 347
Top terms: durable: 110, functional benefit: 84, mechanistic: 49, translation: 49, trial-watch: 16, pathway engagement: 13, biomarker-heavy: 7, translational: 6
Wrote extra/public-copy-report.md.
```

### Reader task audit

Command: `node scripts/reader-task-audit.mjs --write`
Exit code: 0

```text
Reader task audit: passed (14 passed, 0 issue(s), 0 warning(s))
Wrote extra/reader-task-audit.md.
```

