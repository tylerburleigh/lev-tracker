# Triage Workflow

The roadmap is narrative context. The operational dispatcher is `ops/triage-state.v1.json`.

Use triage when the user asks:

- "what should we work on?"
- "what's next?"
- "go"
- "pick the next thing"

## Regenerate

Run:

```bash
npm run sync:research-planning
```

This regenerates:

- `research/state/coverage-status.v1.json`
- `research/backlog/track-priority.v1.json`
- `ops/triage-state.v1.json`

Use `npm run sync:work-triage` only when research planning state is already current and you need to refresh the unified dispatcher.

## Selection Rule

Default to `ops/triage-state.v1.json` `summary.top_work_item_id` when it is set. If it is null, the dispatcher found no actionable operational work; report the blocked items and do not force work through an external gate.

Before acting, state the assumption if the user was vague. Example:

> I’ll take the top triage item: run surveillance for ecosystem replacement.

Only override the top work item when:

- the user names a mode, track, bundle, or priority
- the ranked item is blocked by external input or a calendar gate
- rank 1 conflicts with an active user instruction
- an active editorial or publication blocker appears after triage was generated

## Priority Order

The dispatcher ranks modes in this order:

1. `publish`
2. `editorial_review`
3. `editorial_rollup`
4. `bootstrap`
5. `coverage_repair`
6. `surveillance`
7. `field_activity`
8. `coverage_assessment_backfill`
9. `data_normalization`
10. `schema_hardening`
11. `docs_sync`
12. `app_surface_check`

The generated surveillance queue contains tracks due for ordinary rotation. Tracks with a successful surveillance or coverage-repair pass inside the current cooldown window stay visible in `surveillance_recent_queue`, but they are not selected by default unless the user explicitly asks for a rapid follow-up.

The generated `field_activity` item is a monthly cross-field sweep. It is suppressed for the current month once a `research_session` with `mode: "field_activity"` has been recorded. When it appears, start from `research/backlog/field-activity-watchlist.v1.json` and report the discovery-channel, blindspot-control, capture-recommended, needs-primary-source, pending field-anchor, and pending material-program counts before broad discovery.

## Work Item Fields

Each `work_items[]` entry includes:

- `mode`
- `domain`
- `priority_tier`
- `title`
- `rationale`
- `default_action`
- `runbook_path`
- `source_paths`
- linked record references and signals when available

Use those fields as the task brief. Do not infer a broader scope than the work item describes.

## Verification

After changing triage logic or source state:

```bash
npm run sync:research-planning
npm run validate:records
npm run audit:data
```

For app or schema changes, also run:

```bash
npm run typecheck
npm run build
```
