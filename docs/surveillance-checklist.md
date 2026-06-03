# Surveillance Checklist

Use this checklist for track-level surveillance after baseline bootstrap. Surveillance answers one bounded question: what changed since the last public review for this track?

## Scope

1. Pick exactly one track from `research/backlog/track-priority.v1.json`.
2. Record the track ID, hallmark ID, and reason it is next in the queue.
3. Identify the last relevant publication event, bundle, outlook `last_updated`, and research session.
4. Define the delta window from that prior checkpoint through the current review date.

## Baseline Snapshot

- Current public outlook stage, confidence, momentum, blockers, signals, and forecast note.
- Current supporting finding IDs, source IDs, study IDs, intervention IDs, and activity item IDs.
- Current trial or program records that were explicitly marked no-results, pending, active, recruiting, terminated, or activity-only.
- Known caveats from the latest evidence reviews.

## Watch Sources

Check only sources that can plausibly change the public state for the scoped track:

- PubMed and publisher pages for new primary studies, reviews with material synthesis, corrections, or retractions.
- ClinicalTrials.gov or other primary registries for new trials, status changes, completion, posted results, or termination.
- FDA, EMA, sponsor, company, conference, or grant pages when they directly affect a tracked intervention, study, or activity item.
- Existing public source URLs when the prior record was time-sensitive.

Record the search log in `research/sessions/`, including query/source names, date checked, and relevant URLs even when nothing material changed.

## Materiality Decision

Choose one outcome:

- `no_op`: nothing material changed. Write the session record only. Do not create a candidate bundle or staged JSON.
- `activity_only`: a real-world activity changed, but public evidence interpretation does not move. Write the session record; create a bundle only if a public `activity_item` or `source` record is worth publishing.
- `outlook_refresh`: evidence, safety, trial results, taxonomy mapping, or forecast support changed enough to update public records. Create the smallest candidate bundle that captures the change.

Avoid staging records for contextual noise, duplicate sources, unchanged registries, or speculative implications.

## Record Changes

For `activity_only` or `outlook_refresh` bundles:

1. Add or update only the records needed for the material change.
2. Keep source summaries factual and non-interpretive.
3. Keep each finding atomic and linked to source, study, track, hallmark, and intervention IDs when applicable.
4. Update outlook support maps only when the public interpretation changes.
5. Keep `data/staged-records/<bundle-id>/` as the bundle's proposed public state; once published, that directory is immutable audit history, not active work.

## Review Lanes

- `no_op`: no evidence review.
- `activity_only`: no evidence review when only a session record is written. If a bundle stages source or activity records, normally require `source_fidelity` only.
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
