# Editorial Rollup

This runbook reconciles public summary surfaces after reviewed publication activity. It is an editorial/content workflow, not a path for adding new evidence claims.

## Inputs

- `ops/triage-state.v1.json`
- `data/publication-events/`
- `data/outlooks/`
- `data/content/current-lev-story/current.json`
- `data/content/state-of-the-field/`
- `data/content/hallmark-insights.json`
- outlook-method navigation and method surfaces in `src/components/site-shell.tsx` and `src/app/methods/page.tsx`
- `config/public-copy-rules.json`
- `docs/editorial-quality-system.md`

## Triggers

Run the rollup before routine research when any of these are true:

- the latest public update record with affected outlooks is newer than the latest state-of-field edition
- the latest public update record with affected outlooks is newer than `data/content/current-lev-story/current.json` `revision.last_reviewed`
- `overall-lev-outlook` is older than meaningful hallmark or track outlook changes
- the current month has material publication activity but no current-month state-of-field edition
- a hallmark or a track within a hallmark changed and the corresponding hallmark insight copy has not been reviewed
- the current LEV story `revision.review_due` has passed
- navigation or method copy implies an outlook surface that the app does not actually provide

## Review Rules

1. Start from public updates and public outlooks. Do not use this workflow to introduce unreviewed sources, findings, stages, confidence changes, or outlook upgrades.
2. Update `data/outlooks/overall-lev-outlook.json` only when the aggregate public meaning changes. Do not move `last_updated` just to chase every track publication.
3. Add or update a state-of-field edition only when public changes are material enough to summarize for the month.
4. Review `data/content/current-lev-story/current.json` when the current LEV story, what to watch next, or where better evidence is needed no longer matches the latest reviewed outlooks.
5. Review `data/content/hallmark-insights.json` when a hallmark outlook or one of its tracks changed materially. Keep the copy aligned with existing reviewed records.
6. Keep outlook-method UI honest: either link to a methods explanation or provide a real outlook route with a documented data contract.
7. Keep the public story field-facing: the before/now/next arc should describe evidence maturity in longevity research, not tracker coverage, publication workflow, or source-map completeness.

## Content Publish Path

Curated content files are currently published directly through reviewed file edits rather than staged updates. Treat the rollup item, changed source paths, required review metadata, and this checklist as the audit trail.

When updating hallmark insight copy, set:

- `last_reviewed` to the review date
- `review_reason` to the specific outlook or publication activity that prompted review
- `related_outlook_ids` to the hallmark or track outlook records reviewed
- `related_publication_event_ids` when public update records directly prompted the review

When updating a state-of-field edition, set `last_reviewed`, `review_reason`, and any directly related publication or outlook IDs.

When updating the current LEV story, set:

- `revision.last_reviewed` to the review date
- `revision.review_reason` to the public records or editorial request that prompted the review
- `revision.review_due` to the next scheduled review date
- `revision.triggers` to the conditions that should make the story stale
- `revision.observed_outlook_states` to the reviewed evidence stage, momentum, confidence, evidence-gap, strongest-evidence, and LEV 2036 outlook fingerprints
- `related_outlook_ids` and `related_publication_event_ids` to the reviewed records that anchor the story

Use `npm run story:current -- status` to check staleness, `npm run story:current -- draft --write --style plain` to generate a plain-language review draft under `extra/`, and `npm run story:current -- snapshot --write-current` after accepting a reviewed story state.

Use `npm run audit:editorial -- --write` during reader-facing copy reviews. It writes `extra/editorial-quality-report.md`, refreshes the public copy lint report, and checks whether readers can tell where the field stands, what changed, what would change the outlook, where effort should focus, and which concrete examples to inspect. Public copy rules live in `config/public-copy-rules.json`.

Use `npm run audit:editorial:ratchet` when a pass should enforce the current public-copy debt ceiling.

If the review changes evidence records, outlook ratings, evidence stages, confidence, LEV 2036 outlook, or timing windows, stop and use the evidence-review and candidate-bundle workflow instead.

## Expected Outputs

- no-op decision when public summary surfaces are already aligned
- updated `data/content/current-lev-story/current.json` when the homepage story, what_to_watch_next, focus areas, or revision metadata are stale
- updated `data/content/state-of-the-field/<YYYY-MM>.json` when a monthly summary is warranted
- updated `data/content/hallmark-insights.json` when hallmark copy is stale
- updated `data/outlooks/overall-lev-outlook.json` only for aggregate public meaning changes
- navigation or methods copy that accurately describes outlook-method surfaces

## Checks

After any rollup decision or edit, regenerate triage state and run the standard checks:

```bash
npm run sync:work-triage
npm run audit:editorial -- --write
npm run validate:records
npm run audit:data
npm run typecheck
npm run build
```
