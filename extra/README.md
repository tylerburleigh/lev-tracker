# Extra Notes

This directory holds exploratory or handoff documentation that is related to the repo but not part of the live LEV Tracker product docs.

## Contents

- [generic-research-ops-framework](generic-research-ops-framework/README.md): a domain-neutral framework spec derived from this repo's research workflow. It is intended as a handoff package for building a reusable research ops tool in another session.
- [current-lev-story-draft.md](current-lev-story-draft.md): generated editorial draft from `npm run story:current -- draft --write --style plain`.
- [public-copy-report.md](public-copy-report.md): generated public copy lint report from `npm run lint:public-copy -- --write`.
- [reader-task-audit.md](reader-task-audit.md): generated reader-task audit from `npm run audit:reader-tasks -- --write`.
- [editorial-quality-report.md](editorial-quality-report.md): generated combined quality report from `npm run audit:editorial -- --write`.

## Status

Files in this directory are design artifacts. They may inform future implementation work, but they should not be treated as live product documentation unless promoted into `docs/`.
