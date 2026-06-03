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
- related `research/coverage-assessments/` when a track outlook or support map changes
- source, study, finding, and outlook schemas when those record types are staged
- `scripts/research-bundle.mjs`
- the current admin workflow implementation in `src/lib/site-data.ts` and `src/app/admin/review/`

## Workflow

1. Run `npm run research:bundle -- status --bundle <bundle-id>` and inspect lifecycle status, proposed changes, prior comments, and the evidence-review gate.
2. Run `npm run research:bundle -- validate --bundle <bundle-id>` before any status change.
3. Check every proposed change for:
   - matching `record_type`
   - matching `id`
   - correct `file_path`
   - valid `staged_file_path`
4. Compare staged JSON to the live public record before changing status.
   - If a track outlook rating changes, confirm the bundle stages or already has the linked source, study, finding, support-map, and rating-change records.
   - If a coverage assessment exists, confirm the staged public claim does not ignore a high-priority known coverage gap.
   - Confirm source extraction covers population/model, sample size, duration, intervention/exposure, endpoint, quantitative result, safety, funding/conflicts, and directness boundary.
   - Confirm stage, momentum, and confidence do not exceed the support-map evidence, especially for narrow disease benefits in broad aging tracks.
5. If the change is not ready, add a review comment and move the bundle to `needs_revision`.
6. If the staged change and evidence-review gate are acceptable, run `npm run research:bundle -- approve --bundle <bundle-id>`.
7. Publish with `npm run research:bundle -- publish --bundle <bundle-id>` so staged JSON is promoted and a `publication_event` is written.
8. Run `npm run sync:research-planning` after publish.
9. Run `npm run research:bundle -- smoke --bundle <bundle-id> --base-url <local-url>` when a dev server is available.
10. After publish, verify:
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
- Prefer the file-backed bundle CLI for approval, publish, and smoke checks; use the app UI only when a human review action is intentionally interactive.

## Expected Outputs

- review comments when a bundle needs work
- valid status transitions
- publication through the file-backed publish workflow, not by direct live-record edits
