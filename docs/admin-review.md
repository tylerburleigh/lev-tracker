# Admin Review

The admin review workspace is the file-backed editorial layer between research output and public records. It is intentionally single-curator: automation can draft and revise, but publication remains a human action.

## Surfaces

- Queue: `/admin/review`
- Bundle detail: `/admin/review/<bundle-id>`
- Bundle records: `data/candidate-bundles/<bundle-id>.json`
- Staged records: `data/staged-records/<bundle-id>/`
- Review comments: `data/review-comments/`
- Evidence reviews: `data/evidence-reviews/`
- Publication events: `data/publication-events/`

The queue shows lifecycle status, scope, revision number, required review lanes, missing lanes, blocking findings, and promotion-readiness issues. The detail view shows proposed changes, staged paths, evidence reviews, comments, publication history, and the approve/publish controls.

## Candidate Lifecycle

Valid lifecycle states are:

1. `submitted`
2. `in_review`
3. `needs_revision`
4. `revised`
5. `approved`
6. `published`
7. `rejected`

Allowed transitions are enforced by the admin actions and bundle script. `published` and `rejected` are terminal states.

Normal path:

1. Research submits a bundle with proposed changes and staged JSON.
2. Curator starts review or leaves the bundle in `submitted`.
3. Evidence-review lanes are completed for the current revision.
4. Curator adds comments or requests changes.
5. Revised bundles return as `revised` or with a new revision number.
6. Curator approves once gates are clean.
7. Curator publishes, which promotes staged records and writes a publication event.

## Promotion Readiness

Promotion readiness checks whether a bundle can safely move staged records into public data paths.

The checks cover:

- every proposed change has a valid `target_record_type`, `target_record_id`, `file_path`, and `staged_file_path`
- staged paths remain under `data/staged-records/<bundle-id>/`
- target paths resolve to the canonical collection for the record type
- staged JSON parses and has the expected `record_type` and `id`
- create/update changes match whether the live target file exists
- staged source, study, finding, outlook, and activity records pass semantic checks used by `scripts/research-bundle.mjs`

Use:

```bash
npm run research:bundle -- status --bundle <bundle-id>
npm run research:bundle -- validate --bundle <bundle-id>
```

Approval requires a structurally valid bundle and a clean evidence-review gate when one is configured. Publication additionally requires the bundle to be `approved`.

## Publication

Publish through the admin detail route or:

```bash
npm run research:bundle -- publish --bundle <bundle-id>
```

Publishing:

- copies each staged record to its live `data/` target
- writes a `publication_event`
- records approving evidence review IDs when review gates exist
- moves the bundle to `published`
- appends the publication event ID to the bundle

Publication events should include the bundle ID, event type, timestamp, publisher, promoted target records, affected outlook IDs when available, approving evidence review IDs when available, and a concise change note.

After publishing, run:

```bash
npm run sync:research-planning
npm run research:bundle -- validate --bundle <bundle-id>
```

If a local app server is available, smoke-check affected public routes with:

```bash
npm run research:bundle -- smoke --bundle <bundle-id> --base-url <url>
```
