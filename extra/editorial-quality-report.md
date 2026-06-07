# Editorial Quality Report

Generated: 2026-06-06T22:05:16.125Z
Overall: needs attention

## Summary

- Current LEV story status: current
- Public copy warnings: 277
- Reader-task audit: failed (13 passed, 1 issues, 0 warnings)

## Gates

- PASS: Current LEV story is current
  Status is current.
- FAIL: Reader-task audit has no issues
  1 issue(s), 0 warning(s).
- FAIL: Public copy warnings <= 269
  Current public copy warning count is 277.
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
Exit code: 1

