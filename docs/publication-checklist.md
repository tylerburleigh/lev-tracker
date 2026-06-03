# Publication Checklist

This checklist covers the file-backed path from a reviewed candidate bundle to public records. It assumes a single human curator remains accountable for approval and publication.

## Inputs

- Candidate bundle: `data/candidate-bundles/<bundle-id>.json`
- Staged records: `data/staged-records/<bundle-id>/`
- Live target records referenced by each proposed change `file_path`
- Evidence reviews in `data/evidence-reviews/`
- Review comments in `data/review-comments/`
- Admin UI route: `/admin/review/<bundle-id>`

## Pre-Publish Checks

1. Confirm the bundle scope and proposed changes match the intended track, hallmark, intervention, or evidence record.
2. Confirm every proposed change has the right `target_record_type`, `target_record_id`, `file_path`, and `staged_file_path`.
3. Compare each staged JSON file with its live target file.
4. Check evidence-review readiness:

   ```bash
   npm run research:review-evidence -- status --bundle <bundle-id>
   ```

5. Resolve every missing required lane before approval.
6. Resolve or supersede any complete review with `blocking: true`, `needs_revision`, or `reject`.
7. Close or supersede open major or critical findings when the bundle's `review_requirement` says they block approval.
8. For track outlook changes, confirm any rating rationale is supported by concrete findings, sources, and limitations when `supporting_evidence[]` is present.
9. Confirm the staged change does not imply a stage, confidence, scenario, or forecast upgrade unless that upgrade is explicitly proposed and reviewed.

## Approval

Approve only when the evidence-review gate is ready and promotion readiness has no file-path or staged-record issues.

Use the admin detail route:

```text
/admin/review/<bundle-id>
```

The `Approve` action moves the bundle to `approved`. The `Publish` action should remain disabled until promotion readiness is clean.

## Publish

Publish through the admin detail route. Do not hand-copy staged JSON into live public record paths.

The publish action:

- promotes each staged record to its target under `data/`
- writes a `publication_event` under `data/publication-events/`
- records approving evidence review IDs when review gates exist
- moves the bundle lifecycle status to `published`
- updates bundle `publication_event_ids[]`

## Post-Publish Checks

1. Confirm the bundle status is `published`.
2. Confirm a publication event exists and lists the promoted targets.
3. Confirm the live public record contains the staged change.
4. Confirm the affected public route renders the promoted content.
5. Regenerate research planning state:

   ```bash
   npm run sync:research-planning
   ```

6. Run data validation and integrity checks:

   ```bash
   npm run validate:records
   npm run audit:data
   ```

7. Run the normal app checks:

   ```bash
   npm run typecheck
   npm run build
   ```

## Expected Outputs

- updated public records under `data/`
- new `data/publication-events/<publication-event-id>.json`
- updated bundle status and `publication_event_ids[]`
- regenerated `research/state/coverage-status.v1.json`
- regenerated `research/backlog/track-priority.v1.json`
- regenerated `ops/triage-state.v1.json`
