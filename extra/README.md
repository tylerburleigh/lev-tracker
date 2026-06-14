# Extra Notes

This directory holds exploratory or handoff documentation that is related to the repo but not part of the live LEV Tracker product docs.

## Contents

- [generic-research-ops-framework](generic-research-ops-framework/README.md): a domain-neutral framework spec derived from this repo's research workflow. It is intended as a handoff package for building a reusable research ops tool in another session.
- [current-lev-story-draft.md](current-lev-story-draft.md): generated editorial draft from `npm run story:current -- draft --write --style plain`.
- [public-copy-report.md](public-copy-report.md): generated public copy lint report from `npm run lint:public-copy -- --write`.
- [reader-task-audit.md](reader-task-audit.md): generated reader-task audit from `npm run audit:reader-tasks -- --write`.
- [retained-staged-records-report.md](retained-staged-records-report.md): generated retained physical staged JSON audit from `npm run audit:retained-staged-records -- --write`.
- [editorial-quality-report.md](editorial-quality-report.md): generated combined quality report from `npm run audit:editorial -- --write`.
- [data-sustainability-report.md](data-sustainability-report.md): generated data footprint and staged-history report from `npm run audit:data:sustainability -- --write`.
- [artifact-retention-report.md](artifact-retention-report.md): generated artifact classification and retention report from `npm run audit:artifacts -- --write`.
- [staged-archive-readiness-report.md](staged-archive-readiness-report.md): generated staged-vs-live comparison report from `npm run audit:staged-archive-readiness -- --write`.
- [staged-archive-verification-report.md](staged-archive-verification-report.md): generated reconstruction report from `npm run verify:staged-archive -- --write`.
- [staged-prune-dry-run-report.md](staged-prune-dry-run-report.md): generated staged prune state report from `npm run prune:staged-records -- --dry-run --write`.

## Status

Files in this directory are design artifacts. They may inform future implementation work, but they should not be treated as live product documentation unless promoted into `docs/`.
