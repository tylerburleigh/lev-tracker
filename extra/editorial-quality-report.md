# Editorial Quality Report

Generated: 2026-06-12T01:43:22.393Z
Overall: passed

## Summary

- Current LEV story status: current
- Public copy warnings: 42
- Reader-task audit: passed (14 passed, 0 issues, 0 warnings)
- Top public-copy terms: durable: 12, functional benefit: 7, mechanistic: 6, coverage repair: 4, translation: 4, biomarker-heavy: 2, support map: 2, trial-watch: 2

## Gates

- PASS: Current LEV story is current
  Status is current.
- PASS: Reader-task audit has no issues
  0 issue(s), 0 warning(s).
- PASS: Public copy warnings <= 269
  Current public copy warning count is 42.
- PASS: Reader-task warnings <= 0
  Current reader-task warning count is 0.

## Command Output

### Current LEV story status

Command: `node scripts/current-lev-story.mjs status`
Exit code: 0

```text
Current LEV story status: current
Last reviewed: 2026-06-12
Review due: 2026-07-12
Watched outlooks: 18
Changed or missing snapshots: 0
New outlook-changing public updates: 0
```

### Public copy lint

Command: `node scripts/public-copy-lint.mjs --write`
Exit code: 0

```text
Public copy warnings: 42
Top terms: durable: 12, functional benefit: 7, mechanistic: 6, coverage repair: 4, translation: 4, biomarker-heavy: 2, support map: 2, trial-watch: 2
Wrote extra/public-copy-report.md.
```

### Reader task audit

Command: `node scripts/reader-task-audit.mjs --write`
Exit code: 0

```text
Reader task audit: passed (14 passed, 0 issue(s), 0 warning(s))
Wrote extra/reader-task-audit.md.
```

