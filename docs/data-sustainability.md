# Data Sustainability

This repo is intentionally file-backed. That makes research work easy to inspect, but it also means the data layer can become hard to maintain if every pass adds records without clear ownership, review state, and audit links.

Use this document with:

- `npm run validate:records`
- `npm run verify:data-sustainability`
- `npm run audit:data`
- `npm run audit:data:sustainability`
- `npm run audit:artifacts`
- `npm run audit:staged-archive-readiness`
- `npm run manifest:staged-records`
- `npm run archive:staged-records`
- `npm run verify:staged-archive`
- `npm run prune:staged-records -- --dry-run`
- `npm run audit:retained-staged-records`
- `docs/artifact-retention.md`
- `docs/source-ingestion-rules.md`
- `docs/intervention-normalization.md`
- `docs/research-ops-state.md`

## Goals

- Keep live public records small, source-backed, and reusable.
- Keep staged records auditable without treating historical staged directories as active work.
- Make generated planning state reproducible and visibly separate from curated records.
- Prefer one bounded update over broad data expansion.
- Surface growth pressure early enough that cleanup can be planned.

## File Roles

### Live Records

Live records under `data/sources`, `data/studies`, `data/findings`, `data/interventions`, `data/outlooks`, `data/activity-items`, and `data/content` are the public data layer.

Live records should be promoted through a candidate bundle unless the change is a narrow schema/content maintenance edit. They should carry only durable facts, curated interpretation, or public copy that the app needs now.

### Candidate Bundles

`data/candidate-bundles` is the lifecycle ledger for proposed changes. A bundle should explain the bounded scope, list proposed changes, point to staged files, and preserve evidence-review state.

For sustainability, every staged JSON file that belongs to a bundle should appear in `proposed_changes[].staged_file_path`. If a staged file is useful but not part of a proposed public change, it usually belongs in a research session, coverage assessment, or `extra/` handoff note instead.

### Staged Records

`data/staged-records/<bundle-id>/` is the proposed public state for one bundle. While a bundle is active, staged records are working files. After a bundle is `published` or `rejected`, the directory is immutable audit history.

Do not use published staged directories as backlog. Do not quietly delete historical staged files just because they duplicate live records. If staged history needs cleanup, make it an explicit audit-maintenance task and preserve the reason.

### Research State

`research/sessions`, `research/coverage-assessments`, `research/state`, and `research/backlog` are internal operating records. They should capture search logs, materiality decisions, source-completeness gaps, field-activity watchlists, and generated queue state without becoming public evidence records.

A research run should usually produce one session record, zero or one staged bundle, and at most one coverage assessment update.

### Generated Reports

Reports under `extra/` are design or audit artifacts. They can guide implementation and review, but they are not public product data unless promoted into `docs/` or `data/`.

Committed generated reports should be stable snapshots: rerunning a report should not create a timestamp-only diff. If a report changes, the diff should reflect changed data, changed audit output, or changed report format.

## Sustainability Checks

Run these before treating a data-maintenance pass as complete:

```bash
npm run verify:data-sustainability -- --write
```

The command runs the maintenance chain in order:

```bash
npm run validate:records
npm run audit:data
npm run audit:data:sustainability -- --write
npm run audit:artifacts -- --write
npm run manifest:staged-records -- --write
npm run audit:staged-archive-readiness -- --write
npm run archive:staged-records -- --write
npm run verify:staged-archive -- --write
npm run prune:staged-records -- --dry-run --write
npm run audit:retained-staged-records -- --write
```

Use `npm run verify:data-sustainability -- --write --include-build` when a maintenance pass should also prove the production app still builds.

Use `npm run audit:data:sustainability -- --max-unreferenced-staged 0` to enforce staged-history hygiene after historical bundle metadata repair.

## Review Signals

The sustainability report should be reviewed when:

- staged history is growing faster than live records
- staged directories exist without matching candidate bundles
- staged JSON files are not referenced from candidate-bundle proposed changes
- candidate bundles accumulate outside terminal lifecycle states
- large individual JSON files start carrying prose that should be split into source, finding, outlook, review, or report records
- generated planning files are changed without a corresponding research, bundle, publication, or sync reason

These are signals, not automatic failures. Broken schemas, missing required references, duplicate canonical source identifiers, and active staged-bundle inconsistencies remain hard failures in validation or integrity audit.

## Default Maintenance Loop

1. Regenerate planning state only when the source state changed or the current task needs fresh triage.
2. Run validation and integrity audit to catch hard data failures.
3. Run the sustainability report to inspect growth pressure.
4. If the report surfaces drift, prefer adding or tightening an audit rule over manual cleanup.
5. If historical staged records need repair, make a small maintenance task that updates bundle metadata or documents why the artifact is intentionally unreferenced.

## Data Creation Rules

- Add a `source` only for a canonical citation, registry, official update, or primary document.
- Add a `study` only when the source supports a distinct trial, experiment, observational cohort, or model-system study.
- Add a `finding` only for an atomic, source-backed claim that public pages or outlooks need.
- Add an `activity_item` only for an external field event, not tracker process.
- When an `activity_item` is published directly rather than through a candidate bundle, add a matching `publication_event` with `publication_route: "direct_activity_publish"` and a published target for the activity item.
- For prize, funder, company, and program news, add an `activity_item` only when the event clears the `field_anchor` or `material_program` threshold in `docs/field-activity-workflow.md`.
- For trial news, add an `activity_item` only when it has a public `trial_activity_kind`; keep routine registry checks and unchanged no-results status in `/trials`, `trial_details`, `trial_watch_checks[]`, or research sessions.
- Use `scope_label` for field-wide activity that should not be forced into a weak hallmark or track mapping.
- Add an `intervention` when a promoted record references the intervention or the page needs normalized naming.
- Add an `outlook` update only when interpretation changes or public evidence framing needs repair.
- Put close-but-excluded material in `research/sessions[].excluded_sources`, not in public records.

## Current State

The staged-history metadata repair has eliminated unreferenced staged JSON files. Terminal staged records now have a reviewed manifest, a changed-body archive, archive reconstruction verification, an explicit prune command, and a retained-staged audit. The identical live-backed staged JSON files have been pruned: the repo now keeps 192 physical staged JSON files, 1008 manifest-backed pruned staged paths, and 1200 logical staged references.
