---
name: lev-editorial-review
description: Use when reviewing or publishing approved LEV candidate bundles. Compares staged JSON to live records and evidence-audit mappings, then uses the file-backed publish workflow.
---

# LEV Editorial Review

Use this for the admin side of the tracker after research has already produced a candidate bundle.

## Read First

- `data/candidate-bundles/<bundle-id>.json`
- staged files under `data/staged-records/<bundle-id>/`
- live target files referenced by each `file_path`
- related `data/review-comments/` and `data/publication-events/`
- source, study, finding, and outlook schemas when those record types are staged
- the current admin workflow implementation in `src/lib/site-data.ts` and `src/app/admin/review/`

## Workflow

1. Inspect bundle scope, lifecycle status, proposed changes, and prior comments.
2. Check every proposed change for:
   - matching `record_type`
   - matching `id`
   - correct `file_path`
   - valid `staged_file_path`
3. Compare staged JSON to the live public record before changing status.
   - If a track outlook rating changes, confirm the bundle stages or already has the linked source, study, finding, support-map, and rating-change records.
4. If the change is not ready, add a review comment and move the bundle to `needs_revision`.
5. If the staged change is acceptable, move the bundle to `approved`.
6. Publish only through the existing publish workflow so staged JSON is promoted and a `publication_event` is written.
7. After publish, verify:
   - bundle status is `published`
   - a `publication_event` exists
   - the affected public route reflects the promoted record
   - track pages with audit data show the `Evidence basis`, finding inventory, and cited-source sections

## Boundaries

- Do not do new literature research in this skill.
- Do not hand-edit live public records around the publish path.
- Do not reopen `published` or `rejected` bundles.
- Do not publish a bundle whose staged files fail validation or whose status is not `approved`.
- Do not publish track-rating changes whose public support map would be absent, broken, or misleading.

## Expected Outputs

- review comments when a bundle needs work
- valid status transitions
- publication through the app workflow, not by bypassing it
