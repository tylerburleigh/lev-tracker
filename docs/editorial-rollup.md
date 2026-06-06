# Editorial Rollup

This runbook reconciles public summary surfaces after reviewed publication activity. It is an editorial/content workflow, not a path for adding new evidence claims.

## Inputs

- `ops/triage-state.v1.json`
- `data/publication-events/`
- `data/outlooks/`
- `data/content/progress-narrative/current.json`
- `data/content/state-of-the-field/`
- `data/content/hallmark-insights.json`
- forecast-facing navigation and method surfaces in `src/components/site-shell.tsx` and `src/app/methods/page.tsx`

## Triggers

Run the rollup before routine research when any of these are true:

- the latest `publication_event` with affected outlooks is newer than the latest state-of-field edition
- the latest `publication_event` with affected outlooks is newer than `data/content/progress-narrative/current.json` `revision.last_reviewed`
- `overall-lev-outlook` is older than meaningful hallmark or track outlook changes
- the current month has material publication activity but no current-month state-of-field edition
- a hallmark or a track within a hallmark changed and the corresponding hallmark insight copy has not been reviewed
- the progress narrative `revision.review_due` has passed
- navigation or method copy implies a forecast surface that the app does not actually provide

## Review Rules

1. Start from the publication events and public outlooks. Do not use this workflow to introduce unreviewed sources, findings, stages, confidence changes, or forecast upgrades.
2. Update `data/outlooks/overall-lev-outlook.json` only when the aggregate public meaning changes. Do not move `last_updated` just to chase every track publication.
3. Add or update a state-of-field edition only when public changes are material enough to summarize for the month.
4. Review `data/content/progress-narrative/current.json` when the public story, watchlist, or focus priorities no longer match the latest reviewed outlooks.
5. Review `data/content/hallmark-insights.json` when a hallmark outlook or one of its tracks changed materially. Keep the copy aligned with existing reviewed records.
6. Keep forecast-facing UI honest: either link to a methods explanation or provide a real forecast route with a documented data contract.

## Content Publish Path

Curated content files are currently published directly through reviewed file edits rather than candidate bundles. Treat the rollup item, changed source paths, required review metadata, and this checklist as the audit trail.

When updating hallmark insight copy, set:

- `last_reviewed` to the review date
- `review_reason` to the specific outlook or publication activity that prompted review
- `related_outlook_ids` to the hallmark or track outlook records reviewed
- `related_publication_event_ids` when publication events directly prompted the review

When updating a state-of-field edition, set `last_reviewed`, `review_reason`, and any directly related publication or outlook IDs.

When updating the progress narrative, set:

- `revision.last_reviewed` to the review date
- `revision.review_reason` to the public records or editorial request that prompted the review
- `revision.review_due` to the next scheduled review date
- `revision.triggers` to the conditions that should make the story stale
- `revision.observed_outlook_states` to the reviewed stage, momentum, confidence, blocker, best-signal, and scenario fingerprints
- `related_outlook_ids` and `related_publication_event_ids` to the reviewed records that anchor the story

Use `npm run narrative:progress -- status` to check staleness, `npm run narrative:progress -- draft --write --style plain` to generate a plain-language review draft under `extra/`, and `npm run narrative:progress -- snapshot --write-current` after accepting a reviewed narrative state.

If the review changes evidence records, outlook ratings, stages, confidence, scenario status, or forecast windows, stop and use the evidence-review and candidate-bundle workflow instead.

## Expected Outputs

- no-op decision when public summary surfaces are already aligned
- updated `data/content/progress-narrative/current.json` when the homepage story, watchlist, focus areas, or revision metadata are stale
- updated `data/content/state-of-the-field/<YYYY-MM>.json` when a monthly summary is warranted
- updated `data/content/hallmark-insights.json` when hallmark copy is stale
- updated `data/outlooks/overall-lev-outlook.json` only for aggregate public meaning changes
- navigation or methods copy that accurately describes forecast-facing surfaces

## Checks

After any rollup decision or edit, regenerate triage state and run the standard checks:

```bash
npm run sync:work-triage
npm run validate:records
npm run audit:data
npm run typecheck
npm run build
```
