# Research Ops State

This project treats the `track` as the default unit of research work.

That is deliberate. A language model can usually do one bounded track pass well enough to be useful. It cannot reliably do “research longevity” or “bootstrap all hallmarks” in one session without getting diffuse.

## The Split

- `research/state/coverage-status.v1.json`
  Persistent state about what has baseline coverage, what is in active review, and what mode comes next.
- `research/backlog/track-priority.v1.json`
  The ordered queue that bootstrap and surveillance should consult when the user is vague.
- `research/sessions/*.json`
  One structured record per research pass, including no-op passes that do not produce a bundle.
- `research/coverage-assessments/*.json`
  Internal track-level assessments of source-landscape completeness, category coverage, known gaps, and the next coverage action.
- `docs/surveillance-checklist.md`
  The operating checklist for post-bootstrap surveillance passes.
- `docs/coverage-assessment.md`
  The rubric for judging whether a track is thin, adequate, or strong from a coverage standpoint.

## Default Behavior

- If the user names a `track`, use that track.
- If the user names only a `hallmark`, choose the highest-priority track inside that hallmark or ask the user to pick one.
- If the user says something too broad like `go find research`, decompose to one track-level pass.
- If the user is vague but clearly wants `bootstrap` or `surveillance`, choose the top ready item from the matching queue and state the assumption.
- If the user is vague but the selected track's latest coverage assessment recommends `coverage_repair`, run coverage repair before ordinary surveillance.

## What One Research Run Should Produce

- one bounded scope
- one structured session record under `research/sessions/`
- zero or one candidate bundle
- staged JSON only for records that materially changed
- a coverage assessment when the pass materially changes source-landscape confidence or creates a first track baseline

After a session is recorded or a bundle changes, run:

`npm run sync:research-planning`

That command regenerates `coverage-status.v1.json` and `track-priority.v1.json` from taxonomy, sessions, bundles, and publication history.

Coverage assessments are validated internal artifacts and are folded into generated planning state. `coverage-status.v1.json` surfaces the latest assessment ID, verdict, known gap counts, next coverage action, and latest coverage-recommended mode for each track that has an assessment. Use the full assessment record when deciding whether the next pass should be ordinary surveillance or a `coverage_repair` pass.

## Surveillance Outcomes

Surveillance is a sorting pass. It has four valid outcomes:

- `no_op`: the pass found no material public change. Write the session record, preserve the search log, and do not create a candidate bundle or staged JSON.
- `activity_only`: a trial, company, regulatory, conference, or program event changed, but evidence interpretation does not. Write the session record; create a bundle only when the public activity or source layer should change.
- `outlook_refresh`: evidence, safety, trial results, support maps, or forecast language changed enough to update public records. Create a minimal candidate bundle and staged JSON for the changed records only.
- `coverage_repair`: the pass mainly checks source-completeness gaps identified by a coverage assessment. Update the assessment; create public staged JSON only if the repair changes public claims.

No-op sessions are successful surveillance work. They keep the review clock visible without growing the candidate-bundle backlog.

Research session records should make the sorting decision explicit with `materiality_decision`, `search_log`, and `excluded_sources` when relevant. Reviewed-but-excluded sources are part of the audit trail, not clutter.

## Coverage Repair

Coverage repair is not normal delta surveillance. Use it when the question is whether the track has covered the right seminal anchors, recent reviews, null or limiting evidence, safety/durability evidence, active trials, or taxonomy boundaries.

A coverage-repair run should usually produce:

- a `research_session` with `mode: "coverage_repair"`
- a new or updated `coverage_assessment`
- no public bundle unless the repair changes the public outlook, source layer, or support map

`npm run sync:research-planning` emits `coverage_repair_queue` when a latest coverage assessment recommends that mode.

## Active vs Historical Artifacts

`data/staged-records/<bundle-id>/` is active only while the matching bundle is non-terminal. After a bundle is `published` or `rejected`, the staged directory is immutable audit history and should not be treated as pending work.

## What A Research Run Should Not Do

- cover multiple hallmarks by default
- silently broaden from one track into the whole field
- publish directly
- confuse contextual activity with evidence
- treat a published baseline as proof that source coverage is strong
