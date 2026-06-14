---
name: lev-state-of-field-update
description: Use when creating or revising LEV State of the Field editions, especially monthly public updates that need to explain what changed, what did not change, why it matters, and whether the evidence makes LEV look closer without introducing unreviewed evidence.
---

# LEV State Of The Field Update

Use this when adding or revising `data/content/state-of-the-field/<YYYY-MM>.json` or the State of the Field page experience.

## Read First

- latest and previous `data/content/state-of-the-field/*.json`
- `schemas/state-of-the-field-edition.schema.json`
- `data/content/current-lev-story/current.json`
- `data/outlooks/overall-lev-outlook.json`
- `ops/state-of-field-workflow.v1.json`
- public outlooks and publication events named by the edition
- `docs/editorial-rollup.md`
- `docs/editorial-quality-system.md`
- `extra/trial-watch-report.md` after running `npm run audit:trials -- --write`
- State of the Field routes under `src/app/state-of-the-field/`
- public copy rules in `config/public-copy-rules.json`

## Workflow

1. Define the assignment: new monthly edition, revision to an existing edition, or page-rendering improvement.
   - Use `ops/state-of-field-workflow.v1.json` for internal in-progress status. Do not add provisional draft fields to public edition JSON.
2. Use only reviewed public records. If the update needs new sources, findings, studies, stages, read-firmness/confidence changes, or outlook upgrades, stop and use the evidence-review or staged-update workflow first.
3. Set the retrospective period before writing.
   - The June edition covers May.
   - The July edition covers June.
   - Use `period_start`, `period_end`, and `period_label` to make this explicit.
4. Run `npm run audit:trials -- --write` and use the report to identify:
   - completed watched trials with no posted results
   - recruiting or active watched trials that were not expected to report during the covered period
   - trials whose registry checks are stale and should be rechecked through surveillance before the field review claims anything current
   - posted trial results that require evidence review before they can change the public conclusion
5. Classify every apparent change before writing:
   - `outlook_changed`: evidence changed a stage, read firmness, main evidence gap, strongest evidence, or LEV 2036 outlook.
   - `field_signal`: reviewed field evidence changed the interpretation, but not the overall outlook.
   - `context_only`: source context or claim boundaries became clearer; this is not field progress.
   - `activity_without_results`: trials, programs, funding, or launches appeared without results that change the evidence read.
6. Draft the edition as a reader brief:
   - `lede`: the month in one plain-language paragraph
   - `bottom_line`: whether LEV looks closer, less close, or unchanged
   - `field_change_status` and `field_change_note`: whether the covered period had material field movement
   - `what_changed`: only actual field events from the covered period, with `happened_on` and an explicit `change_kind`
   - `current_context`: concrete evidence context that matters but did not happen during the covered period
   - `what_did_not_change`: unchanged stage, read firmness, scenario, or proof gap
   - `why_it_matters`: the interpretation, not tracker status
   - `trial_horizon`: registry-linked studies that could plausibly produce useful results, including whether the covered month had a real result expectation
   - `signals_to_watch`: evidence signals that would change interpretation; do not duplicate named trial-watch entries already covered by `trial_horizon`
   - `evidence_gaps`: missing evidence blocking a stronger read
   - `track_examples`: concrete places readers can inspect
   - `reader_takeaways`: short, scannable conclusions
7. Keep field state separate from tracker state. Coverage or context improvements can be named, but only as context; do not frame them as stronger evidence.
8. Update review metadata and related IDs to match the public records reviewed.
   - If reconciliation is not complete, update the workflow manifest with `draft`, `reconciling`, `needs_surveillance`, `in_review`, `blocked`, or `no_op`.
9. Update `revision_history`:
   - `initial_publication` for a new edition.
   - `post_hoc_material_correction` when later-reviewed evidence from the covered period would have changed the period's public conclusion.
   - `post_hoc_context_note` when later-reviewed evidence from the covered period adds useful context but does not change the period's conclusion.
   - `copy_or_structure_revision` for presentation or wording changes that do not change interpretation.
10. If the current LEV story uses this edition, run the narrative rollup workflow afterward.

## Post-Hoc Evidence Rule

When future work finds evidence that happened in an already covered period:

1. Use the evidence-review or staged-update workflow to verify and publish the evidence first.
2. Compare the evidence's actual date to existing `period_start` and `period_end` values.
3. Revise the old State of the Field edition only if a reasonable reader would have reached a different period conclusion with that evidence included.
4. If the conclusion is unchanged, keep the old edition stable unless the missing context would prevent misinterpretation. Mention the evidence in the current edition as "newly reviewed context from <period>", not as new field movement.
5. Record the decision in `revision_history`.

## Writing Rules

- Lead with the state of longevity research, not the site, map, tracker, workflow, or coverage process.
- Do not describe something as a monthly change just because the tracker discovered, reviewed, or published it that month.
- If nothing material happened in the covered period, say so plainly and leave `what_changed` empty.
- Say what changed and what did not change.
- Make the LEV implication explicit: closer, less close, or unchanged.
- Prefer human terms over internal terms: "early human signals", "trials to watch", "long-lasting improvements in human health or function".
- Do not use "confidence" as reader-facing prose. For outlook stability use "read firmness" or write out the idea: "the read remains tentative" / "a firmer read would require..." For finding strength use "evidence weight".
- Avoid public copy such as `candidate bundle`, `bootstrap`, `surveillance`, `coverage repair`, `support map`, raw IDs, or process-only labels.
- Do not treat trial starts, program activity, or missing context as proof.
- Use `trial_horizon` for trial timing, no-result status, and expected-result context; do not describe those items as field changes unless results were actually posted or published during the covered period.
- Build `trial_horizon` from reviewed public study records and the trial watch report. Say plainly when a trial was complete but had no posted results, when no result was expected during the covered month, or when surveillance is needed before making a current claim.
- Use `signals_to_watch` for the kind of evidence that would matter next, such as functional outcomes, durability, replication, safety, or generality across settings. If a named trial already appears in `trial_horizon`, do not repeat it as a signal unless the card explains the broader evidence threshold.
- Keep claims conservative when evidence is biomarker-based, animal-stage, narrow, disease-specific, or safety-limited.

## Checks

Run after edits:

```bash
npm run validate:records
npm run state-of-field:status -- --strict
npm run audit:editorial:ratchet
npm run typecheck
npm run build
```

If rendering changed, inspect `/state-of-the-field` and the edited edition on desktop and mobile widths.
