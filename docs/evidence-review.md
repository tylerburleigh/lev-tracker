# Evidence Review

Evidence reviews are structured verification passes against a candidate bundle revision. They are separate from admin comments: comments drive editorial conversation, while evidence reviews decide whether staged changes are source-faithful, bounded, and publishable.

When a bundle changes a track outlook, reviewers should also check the latest relevant `coverage_assessment` when one exists. The assessment does not replace source fidelity or support-map review, but it helps identify whether the bundle is making a public claim while a major evidence category remains knowingly thin.

## Lanes

Supported review lanes are:

- `source_fidelity`: source identifiers, quoted facts, study metadata, and staged claims match the cited source or registry.
- `interpretation_forecast`: findings support the proposed stage, momentum, confidence, blockers, signals, and forecast language.
- `safety_limitations`: safety caveats, population boundaries, disease-specific limits, durability limits, and adverse signals are represented.
- `taxonomy_mapping`: hallmark, track, intervention, study, and finding links are mapped to the right taxonomy IDs.
- `forecast_calibration`: scenario and forecast claims are qualitatively calibrated and do not imply false precision.

A bundle lists its required lanes in `required_review_lanes[]`. The evidence gate is ready when each required lane has the configured number of complete reviews, no complete review is blocking, no complete review has `needs_revision` or `reject`, and no configured blocking findings remain open.

## Surveillance Scope

Surveillance does not always need a candidate bundle or evidence review:

- `no_op`: no evidence review. The research session is the audit record.
- `activity_only`: no evidence review when only a session record is written. If a bundle stages public source or activity records, normally require `source_fidelity` only.
- `outlook_refresh`: require `source_fidelity` and `interpretation_forecast`.
- Add `safety_limitations` when new safety, dosing, population, disease-specific, or durability boundaries could affect public interpretation.
- Add `taxonomy_mapping` when track, hallmark, intervention, study, or finding links materially change.
- Add `forecast_calibration` when timing, scenario, or forecast language materially changes.

## Workflow

Check current review state:

```bash
npm run research:review-evidence -- status --bundle <bundle-id>
```

Scaffold a draft for one lane:

```bash
npm run research:review-evidence -- scaffold --bundle <bundle-id> --lane <lane>
```

Edit the generated draft under `research/drafts/evidence-reviews/`:

- replace every `TODO` placeholder
- set `verdict` to `accept`, `needs_revision`, `reject`, or `needs_human_judgment`
- set `blocking` to `true` only when the bundle should not advance
- keep `reviewed_change_ids[]` limited to the bundle changes actually reviewed
- add findings for concrete issues, boundaries, or caveats
- note any coverage-assessment gap that should block or qualify the proposed interpretation

Apply a completed review:

```bash
npm run research:review-evidence -- apply --file <draft-path>
```

Applying a review writes it to `data/evidence-reviews/`, adds the review ID to the candidate bundle, and supersedes older complete reviews for the same bundle, revision, and lane.

## Findings

Findings should be specific enough for an author or curator to act on. Each finding records:

- `severity`: `critical`, `major`, `minor`, or `note`
- `category`: `source_mismatch`, `endpoint_boundary`, `interpretation_overreach`, `missing_caveat`, `activity_vs_evidence`, `safety_limitation`, `taxonomy_mapping`, `forecast_overreach`, `uncertainty`, or `other`
- `claim_or_issue`
- `why_it_matters`
- `recommended_action`
- `resolution_status`: `open`, `addressed`, or `closed`

By default, open critical findings block approval. Open major findings block approval only when the bundle review requirement says they do.

Use `critical` for issues that would make publication materially misleading or structurally invalid. Use `major` for issues that materially weaken a proposed interpretation but can be repaired. Use `minor` for local corrections. Use `note` for boundaries the curator should preserve without requiring a revision.

## Revision Rules

Evidence reviews are tied to `bundle_revision_number`. If staged records or proposed interpretations materially change, increment the bundle revision and run the required lanes again for that revision.

When a lane is rerun for the same revision, the apply command marks older complete reviews for that lane as `superseded`. Superseded reviews remain audit history, but they do not satisfy the active evidence gate.
