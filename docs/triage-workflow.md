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

Default to `ops/triage-state.v1.json` item rank 1.

Before acting, state the assumption if the user was vague. Example:

> I’ll take the top triage item: run surveillance for ecosystem replacement.

Only override rank 1 when:

- the user names a mode, track, bundle, or priority
- rank 1 is blocked by external input
- rank 1 conflicts with an active user instruction
- an active editorial or publication blocker appears after triage was generated

## Priority Order

The dispatcher ranks modes in this order:

1. `publish`
2. `editorial_review`
3. `bootstrap`
4. `coverage_repair`
5. `surveillance`
6. `coverage_assessment_backfill`
7. `data_normalization`
8. `schema_hardening`
9. `docs_sync`
10. `app_surface_check`

The generated research queue can rank a recently surveilled track first. Triage may skip that track to choose the next distinct surveillance target so "go" does not loop on the same area unless the user explicitly asks for a rapid follow-up.

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
