# Editorial Quality Report

Generated: 2026-06-06T18:22:53.050Z
Overall: passed

## Summary

- Current LEV story status: current
- Public copy warnings: 269
- Reader-task audit: passed (14 passed, 0 issues, 0 warnings)

## Gates

- PASS: Current LEV story is current
  Status is current.
- PASS: Reader-task audit has no issues
  0 issue(s), 0 warning(s).
- PASS: Public copy warnings <= 269
  Current public copy warning count is 269.
- PASS: Reader-task warnings <= 0
  Current reader-task warning count is 0.

## Command Output

### Current LEV story status

Command: `node scripts/current-lev-story.mjs status`
Exit code: 0

### Public copy lint

Command: `node scripts/public-copy-lint.mjs --write`
Exit code: 0

### Reader task audit

Command: `node scripts/reader-task-audit.mjs --write`
Exit code: 0

