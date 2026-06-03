# Surveillance Checklist

Use this checklist for track-level surveillance after baseline bootstrap. Surveillance answers one bounded question: what changed since the last public review for this track?

## Scope

1. Pick exactly one track from `research/backlog/track-priority.v1.json`.
2. Record the track ID, hallmark ID, and reason it is next in the queue.
3. Identify the last relevant publication event, bundle, outlook `last_updated`, and research session.
4. Define the delta window from that prior checkpoint through the current review date.
5. Check whether `research/coverage-assessments/` already has an assessment for the track and note any known gaps.

## Baseline Snapshot

- Current public outlook stage, confidence, momentum, blockers, signals, and forecast note.
- Current supporting finding IDs, source IDs, study IDs, intervention IDs, and activity item IDs.
- Current trial or program records that were explicitly marked no-results, pending, active, recruiting, terminated, or activity-only.
- Known caveats from the latest evidence reviews.
- Current coverage verdict, category-level gaps, and next coverage action when a coverage assessment exists.

## Watch Sources

Check only sources that can plausibly change the public state for the scoped track:

- PubMed and publisher pages for new primary studies, reviews with material synthesis, corrections, or retractions.
- ClinicalTrials.gov or other primary registries for new trials, status changes, completion, posted results, or termination.
- FDA, EMA, sponsor, company, conference, or grant pages when they directly affect a tracked intervention, study, or activity item.
- Existing public source URLs when the prior record was time-sensitive.

Record the search log in `research/sessions/`, including query/source names, date checked, and relevant URLs even when nothing material changed.

## Materiality Decision

Treat surveillance as a sorting pass first. The job is to decide whether the delta belongs in `no_op`, `activity_only`, `outlook_refresh`, or `coverage_repair`, not to force a public update.

Choose one outcome:

- `no_op`: nothing material changed. Write the session record only. Do not create a candidate bundle or staged JSON.
- `activity_only`: a real-world activity changed, but public evidence interpretation does not move. Write the session record; create a bundle only if a public `activity_item` or `source` record is worth publishing.
- `outlook_refresh`: evidence, safety, trial results, taxonomy mapping, or forecast support changed enough to update public records. Create the smallest candidate bundle that captures the change.
- `coverage_repair`: the pass primarily addresses source-completeness gaps from a coverage assessment. Update or create a coverage assessment; only create a public bundle if the repair also changes public records.

Avoid staging records for contextual noise, duplicate sources, unchanged registries, or speculative implications.

If the pass primarily improves confidence about source completeness rather than changing public records, update or create a `coverage_assessment` and keep the public layer unchanged.

Functional endpoints are important for stage upgrades, but they are not the only decision-relevant signal. Safety, durability, null results, registry results, corrections, retractions, mechanism, taxonomy boundaries, and biomarker evidence can be material when they affect the current public claim.

Record a `materiality_decision` in the research session with:

- `material_delta`
- `public_update_needed`
- `activity_only`
- `coverage_assessment_needed`
- `recommended_next_mode`
- `rationale`

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
4. Update outlook support maps only when the public interpretation changes.
5. Keep `data/staged-records/<bundle-id>/` as the bundle's proposed public state; once published, that directory is immutable audit history, not active work.

## Coverage Assessment

Create or update `research/coverage-assessments/<track-id>-coverage-<date>.json` when surveillance:

- changes the outlook or support map
- resolves a known source-completeness gap
- discovers a material missing evidence category
- shows that a track needs `coverage_repair` rather than ordinary delta surveillance

Do not update coverage assessments just to mirror every source or activity item. The assessment is for category-level completeness and known gaps.

Set `next_recommended_mode` in the coverage assessment. Use `surveillance` when normal delta monitoring should continue, and `coverage_repair` when known source-completeness gaps should be repaired before another ordinary surveillance pass.

## Review Lanes

- `no_op`: no evidence review.
- `activity_only`: no evidence review when only a session record is written. If a bundle stages source or activity records, normally require `source_fidelity` only.
- `coverage_repair`: no evidence review when only a coverage assessment changes. If public records change, use the review lanes required by the public change.
- `outlook_refresh`: require `source_fidelity` and `interpretation_forecast`.
- Add `safety_limitations` when adverse events, population limits, disease-specific boundaries, dosing, durability, or risk/benefit framing materially change.
- Add `taxonomy_mapping` when a track, hallmark, intervention, study, or finding link changes.
- Add `forecast_calibration` when scenario or timing language materially changes.

## Verification

After writing a session or bundle:

```bash
npm run sync:research-planning
npm run validate:records
npm run audit:data
```

For a material bundle, also run:

```bash
npm run research:bundle -- validate --bundle <bundle-id>
```

Publishing remains an editorial step and should follow `docs/publication-checklist.md`.
