# Editorial Rollup

This runbook reconciles public summary surfaces after reviewed publication activity. It is an editorial/content workflow, not a path for adding new evidence claims.

## Inputs

- `ops/triage-state.v1.json`
- `data/publication-events/`
- `data/outlooks/`
- `data/content/current-lev-story/current.json`
- `data/content/state-of-the-field/`
- `data/content/hallmark-insights.json`
- public navigation and summary surfaces in `src/components/site-shell.tsx` and `src/components/homepage.tsx`
- `config/public-copy-rules.json`
- `extra/trial-watch-report.md` from `npm run audit:trials -- --write`
- `docs/editorial-quality-system.md`

## Triggers

Run the rollup before routine research when any of these are true:

- the latest public update record with affected outlooks is newer than the latest state-of-field edition
- the latest public update record with affected outlooks is newer than `data/content/current-lev-story/current.json` `revision.last_reviewed`
- `overall-lev-outlook` is older than meaningful hallmark or track outlook changes
- the current month has material publication activity but no current-month state-of-field edition
- a hallmark or a track within a hallmark changed and the corresponding hallmark insight copy has not been reviewed
- the current LEV story `revision.review_due` has passed
- navigation or public explanatory copy implies an outlook surface that the app does not actually provide

## Review Rules

1. Start from public updates and public outlooks. Do not use this workflow to introduce unreviewed sources, findings, stages, confidence changes, or outlook upgrades.
2. Update `data/outlooks/overall-lev-outlook.json` only when the aggregate public meaning changes. Do not move `last_updated` just to chase every track publication.
3. Add or update a state-of-field edition only when public changes are material enough to summarize for the month.
4. Review `data/content/current-lev-story/current.json` when the current LEV story, what to watch next, or where better evidence is needed no longer matches the latest reviewed outlooks.
5. Review `data/content/hallmark-insights.json` when a hallmark outlook or one of its tracks changed materially. Keep the copy aligned with existing reviewed records.
6. Keep outlook UI honest: only add public explanatory links when they point to a real reader-facing route or in-page surface with a documented data contract.
7. Keep the public story field-facing: the before/now/next arc should describe evidence maturity in longevity research, not tracker coverage, publication workflow, or source-map completeness.

Use the `lev-state-of-field-update` skill for State of the Field editions. Each edition is retrospective: the June edition covers May, the July edition covers June, and so on. Separate actual field changes during the covered period from evidence context that the tracker reviewed or published later.

## Content Publish Path

Curated content files are currently published directly through reviewed file edits rather than staged updates. Treat the rollup item, changed source paths, required review metadata, and this checklist as the audit trail.

When updating hallmark insight copy, set:

- `last_reviewed` to the review date
- `review_reason` to the specific outlook or publication activity that prompted review
- `related_outlook_ids` to the hallmark or track outlook records reviewed
- `related_publication_event_ids` when public update records directly prompted the review

When updating a state-of-field edition, set `last_reviewed`, `review_reason`, and any directly related publication or outlook IDs. Fill the reader brief fields (`period_start`, `period_end`, `period_label`, `lede`, `bottom_line`, `field_change_status`, `field_change_note`, `what_changed`, `current_context`, `what_did_not_change`, `why_it_matters`, `trial_horizon`, `signals_to_watch`, `evidence_gaps`, `track_examples`, and `reader_takeaways`) rather than relying on summary bullets alone. Leave `what_changed` empty when the covered period had no material field-changing result.

Before drafting `trial_horizon`, run `npm run audit:trials -- --write`. Use `trial_horizon` for registry-linked studies that could plausibly produce meaningful results. Include whether the covered month had a real result expectation, whether results were posted, and why a result would matter. Do not count a trial listing, a recruiting status, or a no-result registry check as field progress. If the report shows stale registry checks, run surveillance before making current claims about those trials.

Keep `signals_to_watch` distinct from `trial_horizon`. `trial_horizon` names concrete registry-linked trials and their result timing. `signals_to_watch` should describe the evidence thresholds that would change interpretation, such as functional outcomes, durability, replication, safety, or generality across settings. Do not repeat a named trial in both sections unless the signal card explains the broader threshold rather than the trial status.

When later-reviewed evidence belongs to a prior covered period, do not automatically rewrite the old monthly edition. First publish or verify the evidence through the normal evidence-review path, then decide whether the old period's public conclusion would have changed. If yes, revise that edition and add a `revision_history` entry with `post_hoc_material_correction`. If no, leave the conclusion stable or add only `post_hoc_context_note` when the context prevents a misleading read. Newly reviewed old evidence can appear in the current edition as context, but not as current field movement.

When updating the current LEV story, set:

- `revision.last_reviewed` to the review date
- `revision.review_reason` to the public records or editorial request that prompted the review
- `revision.review_due` to the next scheduled review date
- `revision.triggers` to the conditions that should make the story stale
- `revision.observed_outlook_states` to the reviewed evidence stage, momentum, confidence, evidence-gap, strongest-evidence, and timing-window fingerprints
- `related_outlook_ids` and `related_publication_event_ids` to the reviewed records that anchor the story

Use `npm run story:current -- status` to check staleness, `npm run story:current -- draft --write --style plain` to generate a plain-language review draft under `extra/`, and `npm run story:current -- snapshot --write-current` after accepting a reviewed story state.

Use `npm run audit:editorial -- --write` during reader-facing copy reviews. It writes `extra/editorial-quality-report.md`, refreshes the public copy lint report, and checks whether readers can tell where the field stands, what changed, what would change the outlook, where effort should focus, and which concrete examples to inspect. Public copy rules live in `config/public-copy-rules.json`.

Use `npm run audit:editorial:ratchet` when a pass should enforce the current public-copy debt ceiling.

If the review changes evidence records, outlook ratings, evidence stages, confidence, or timing windows, stop and use the evidence-review and candidate-bundle workflow instead.

## Expected Outputs

- no-op decision when public summary surfaces are already aligned
- updated `data/content/current-lev-story/current.json` when the homepage story, what_to_watch_next, focus areas, or revision metadata are stale
- updated `data/content/state-of-the-field/<YYYY-MM>.json` when a monthly summary is warranted
- updated `data/content/hallmark-insights.json` when hallmark copy is stale
- updated `data/outlooks/overall-lev-outlook.json` only for aggregate public meaning changes
- navigation or public summary copy that accurately describes available outlook surfaces

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
