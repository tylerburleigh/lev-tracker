# Field Change Checklist

Use this checklist for track-level field change checks after baseline review. A change check answers one bounded question: what changed since the last public review for this track?

## Scope

1. Pick exactly one track from `research/backlog/track-priority.v1.json`.
2. Record the track ID, hallmark ID, and reason it is next in the queue.
3. Identify the last relevant public update, staged update, outlook `last_updated`, and research session.
4. Define the delta window from that prior checkpoint through the current review date.
5. Check whether `research/coverage-assessments/` already has an assessment for the track and note any known gaps.

## Baseline Snapshot

- Current public outlook evidence stage, confidence, momentum, evidence gaps, strongest evidence, and interpretation note.
- Current supporting finding IDs, source IDs, study IDs, intervention IDs, and activity item IDs.
- Current trial or program records that were explicitly marked no-results, pending, active, recruiting, terminated, or activity-only.
- Current `/trials` watchlist rows for the scoped track, including `trial_details`, completion timing, last registry check, and no-result status.
- Known caveats from the latest evidence reviews.
- Current coverage verdict, category-level gaps, and next coverage action when a coverage assessment exists.

Run `npm run audit:trials -- --track <track-id> --write` before source discovery when the scoped track has human interventional records. Use the report to seed known-trial registry checks and to identify stale registry checks.

## Watch Sources

Check only sources that can plausibly change the public state for the scoped track:

- PubMed or NCBI E-utilities for new primary studies, reviews with material synthesis, corrections, or retractions. This is required for biomedical track change checks.
- ClinicalTrials.gov API or other primary registries for new trials, status changes, completion, posted results, termination, or unposted-results annotations. This is required when human studies, registries, or trial-watch records could affect the track.
- Known watchlist trials first: re-check every NCT or registry ID already attached to scoped public study records before deciding whether nothing changed.
- New registry search second: run broader registry searches for the intervention family, track terms, aging terms, older-adult terms, disease boundary terms, and sponsor/program names to catch new or newly relevant trials.
- DOI, publisher, preprint, conference, FDA, EMA, sponsor, company, grant, or broader web search when the track is fast-moving, commercial, preprint-heavy, or likely to have non-PubMed sources.
- Existing public source URLs when the prior record was time-sensitive.

Treat non-primary web hits as leads unless they point to verifiable source data. Record the search log in `research/sessions/`, including query/source names, date checked, search terms, and relevant URLs even when nothing material changed.

Record every known-trial registry check in `trial_watch_checks[]`. Use `search_log[]` for broader registry queries and source discovery. Use `excluded_sources[]` for close registry records that were wrong-scope, unchanged, duplicate, or no-results-only.

## Materiality Decision

Treat a field change check as a sorting pass first. The job is to decide whether the delta belongs in `no_op`, `activity_only`, `outlook_refresh`, or `coverage_repair`, not to force a public update.

Choose one outcome:

- `no_op`: nothing material changed. Write the session record only. Do not create a staged update or staged JSON.
- `activity_only`: a real-world activity changed, but public evidence interpretation does not move. Write the session record; create a bundle only if a public `activity_item` or `source` record is worth publishing.
- `outlook_refresh`: evidence, safety, trial results, taxonomy mapping, or outlook support changed enough to update public records. Create the smallest staged update that captures the change.
- `coverage_repair`: the pass primarily addresses source-completeness gaps from a coverage assessment. Update or create a coverage assessment; only create a public bundle if the repair also changes public records.

Avoid staging records for contextual noise, duplicate sources, unchanged registries, or speculative implications.

Keep `/activity` as a curated external field-event feed, not an accidental list of whatever the tracker happened to notice. Activity item dates should be the actual event dates when known, not the review or publication date. Historical backfill is allowed only when the scope has been checked enough that the activity layer is not a misleading partial timeline; otherwise keep old trial history on `/trials` and in source/study records.

Do not stage `activity_item` records for tracker/editorial meta-events: adding something to a watchlist, changing our wording, expanding coverage, completing a review, deciding that company activity should be tracked, or otherwise describing the site's workflow. Put those in the research session, `publication_event.change_note`, outlook wording, or an editorial note. A public activity item must point to a concrete external source, study, finding, or URL.

Treat trial changes conservatively:

- unchanged registry or no posted result: `no_op`, unless the public source/study record needs a factual refresh
- recruiting, active, completed, terminated, suspended, or withdrawn status change without results: usually `activity_only`
- newly posted registry results or linked publication results: usually `outlook_refresh` and evidence review
- discovery of relevant missing active-trial context: usually `coverage_repair` or a staged source/study update, depending on whether it changes the public layer

If the pass primarily improves confidence about source completeness rather than changing public records, update or create a `coverage_assessment` and keep the public layer unchanged.

Functional endpoints are important for stage upgrades, but they are not the only decision-relevant signal. Safety, durability, null results, registry results, corrections, retractions, mechanism, taxonomy boundaries, and biomarker evidence can be material when they affect the current public claim.

## Taxonomy Boundary Flags

Flag a track-taxonomy review when source discovery finds a recurring approach that does not fit the scoped track, when close excluded sources keep exposing the same boundary problem, or when a broad track appears to contain separable evidence streams.

Do not create or move tracks inside an ordinary surveillance pass unless the user explicitly asked for taxonomy work. Record the boundary issue in the research session or coverage assessment, recommend `coverage_repair` when the boundary needs more source review, and require `taxonomy_mapping` review if public records later move between tracks.

Record a `materiality_decision` in the research session with:

- `material_delta`
- `public_update_needed`
- `activity_only`
- `coverage_assessment_needed`
- `recommended_next_mode`
- `rationale`

Record `trial_watch_checks[]` entries with:

- `registry_id`, plus local `study_id` and `source_id` when known
- `checked_at`, current registry status, current result status, completion dates, and first posted results date when present
- booleans for status, result, and completion-date changes
- `materiality`, `public_action`, and a plain-language `summary`

## Excluded Sources

Record reviewed-but-excluded sources in `excluded_sources[]` when they are close enough that a future reviewer might otherwise re-check them. Include the PMID, registry ID, URL, or other reference; the exclusion decision; and the reason.

Use excluded-source records for:

- method-limited studies that look relevant but cannot support a causal or public claim
- protocols, registry entries, or conference records with no results
- duplicate or unchanged registry/publication records
- wrong-scope papers that overlap terms but not the track
- context that informed boundaries but did not merit a public source or finding record

## Record Changes

For `activity_only` or `outlook_refresh` bundles:

1. Add or update only the records needed for the material change.
2. Keep source summaries factual and non-interpretive.
3. Keep each finding atomic and linked to source, study, track, hallmark, and intervention IDs when applicable.
4. Update outlook evidence maps only when the public interpretation changes.
5. Keep `data/staged-records/<bundle-id>/` as the bundle's proposed public state; once published, that directory is immutable audit history, not active work.

## Coverage Assessment

Create or update `research/coverage-assessments/<track-id>-coverage-<date>.json` when a field change check:

- changes the outlook or evidence map
- resolves a known source-completeness gap
- discovers a material missing evidence category
- shows that a track needs `coverage_repair` rather than an ordinary field change check

Do not update coverage assessments just to mirror every source or activity item. The assessment is for category-level completeness and known gaps.

Set `next_recommended_mode` in the coverage assessment. Use `surveillance` when normal delta monitoring should continue, and `coverage_repair` when known source-completeness gaps should be repaired before another ordinary field change check.

## Review Lanes

- `no_op`: no evidence review.
- `activity_only`: no evidence review when only a session record is written. If a bundle stages source or activity records, normally require `source_fidelity` only.
- `coverage_repair`: no evidence review when only a coverage assessment changes. If public records change, use the review lanes required by the public change.
- `outlook_refresh`: require `source_fidelity` and `interpretation_forecast`.
- Add `safety_limitations` when adverse events, population limits, disease-specific boundaries, dosing, durability, or risk/benefit framing materially change.
- Add `taxonomy_mapping` when a track, hallmark, intervention, study, or finding link changes.
- Add `forecast_calibration` when scenario, timing, or outlook language materially changes.

## Verification

After writing a session or bundle:

```bash
npm run audit:trials -- --track <track-id> --write
npm run sync:research-planning
npm run validate:records
npm run audit:data
```

For a material bundle, also run:

```bash
npm run research:bundle -- validate --bundle <bundle-id>
```

Publishing remains an editorial step and should follow `docs/publication-checklist.md`.
