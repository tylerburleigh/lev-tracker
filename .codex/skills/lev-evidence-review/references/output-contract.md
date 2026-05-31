# Output Contract

Use this file when writing or updating `evidence_review` records.

## Required Outputs

For each review pass:

1. Write `data/evidence-reviews/<review-id>.json`
2. Ensure `data/candidate-bundles/<bundle-id>.json` contains that review ID in `evidence_review_ids[]`
3. If this review replaces an older review in the same `review_lane` and `bundle_revision_number`, mark the older review `status: "superseded"`

Do not publish. Do not edit live public records here.

## Review Unit

One review record should cover:

- one `candidate_bundle_id`
- one `bundle_revision_number`
- one `review_lane`
- one `review_round`

If you need a second pass for the same lane and revision, create a new review record and supersede the older one.
If you are writing multiple lane reviews in the same review pass, keep the same `review_round` across those records.

## ID Pattern

Prefer:

`evidence-review-<bundle-scope-or-short-name>-<lane>-r<revision>`

If another review already exists for the same lane and revision, append:

`-round-<n>`

The ID only needs to be unique and stable enough to track comments and publication history.

## Field Rules

### Top-level record

- `schema_version`: always `"1.0.0"`
- `record_type`: always `"evidence_review"`
- `candidate_bundle_id`: exact bundle ID
- `bundle_revision_number`: use the bundle's current `revision_number` or `1`
- `review_round`: integer review cycle for the bundle. Reuse the current round for parallel lane reviews in the same pass. Increment only when a new evidence-review pass starts after feedback, revision, or re-review.
- `review_lane`: one enum value from schema
- `reviewer_kind`: `agent` or `human`
- `reviewer_id`: set for human reviews when known
- `skill_name`: set to `lev-evidence-review` for agent-generated reviews
- `status`: `complete` for active reviews, `superseded` only for replaced older reviews
- `verdict`: one of:
  - `accept`
  - `needs_revision`
  - `reject`
  - `needs_human_judgment`
- `blocking`: `true` when editorial should not approve yet
- `summary`: one short paragraph, concrete and bounded
- `reviewed_change_ids`: include exact `change_id` values covered by this review
- `findings`: required array, may be empty

### Findings

Each finding must include:

- `finding_id`
- `severity`
- `category`
- `claim_or_issue`
- `why_it_matters`
- `recommended_action`
- `resolution_status`

Use optional linkage when known:

- `applies_to_change_id`
- `applies_to_record`

## Verdict Guidance

- `accept`
  - the proposed claim stays within the cited source boundary
  - no unresolved blocking issue remains
- `needs_revision`
  - the issue is correctable in wording, framing, or caveats
- `reject`
  - the bundle is fundamentally mismatched, out of scope, or unsupported
- `needs_human_judgment`
  - the evidence is bounded correctly, but the public interpretation still needs curator judgment

## Evidence Audit Trail Checks

When reviewing staged track outlooks, sources, studies, or findings:

- Confirm every rating rationale in `supporting_evidence[]` links to concrete `finding_ids` and `source_ids`.
- Confirm each staged finding has source/study provenance, endpoint category, direction, confidence, and caveats.
- Confirm `supporting_finding_ids`, `supporting_source_ids`, and displayed source links agree with the findings used by the outlook.
- Confirm `rating_change_criteria` states what would strengthen or weaken the rating without upgrading current evidence by implication.
- Treat missing caveats, stale support maps, or source lists without rationale mapping as review findings.

## Blocking Guidance

Set `blocking: true` when any of these are true:

- verdict is `needs_revision`
- verdict is `reject`
- an unresolved major or critical finding should prevent approval
- the bundle still overstates the evidence in a way editorial should not waive automatically

Set `blocking: false` when the review is informational only and should not stop approval.

## Resolution Status Guidance

Use:

- `open` for unresolved findings in the current review pass
- `addressed` when a follow-up revision or comment responded, but the review is preserved as a record of the issue
- `closed` when the finding is no longer active and does not block the current state

For a fresh blocking review, default to `open`, not `addressed`.

## Severity Guidance

- `critical`: would materially misstate the evidence or break trust
- `major`: important issue that should usually block approval
- `minor`: valid but not usually blocking
- `note`: contextual caution or reminder

## Category Guidance

Use the narrowest fit:

- `source_mismatch`
- `endpoint_boundary`
- `interpretation_overreach`
- `missing_caveat`
- `activity_vs_evidence`
- `safety_limitation`
- `taxonomy_mapping`
- `forecast_overreach`
- `uncertainty`
- `other`

## Minimal Skeleton

```json
{
  "schema_version": "1.0.0",
  "record_type": "evidence_review",
  "id": "evidence-review-example-source-fidelity-r2",
  "name": "Source fidelity review for example bundle",
  "candidate_bundle_id": "example-bundle-id",
  "bundle_revision_number": 2,
  "review_round": 3,
  "review_lane": "source_fidelity",
  "reviewer_kind": "agent",
  "skill_name": "lev-evidence-review",
  "status": "complete",
  "verdict": "needs_revision",
  "blocking": true,
  "summary": "The staged wording overstates the human relevance of a biomarker-only result.",
  "reviewed_change_ids": [
    "update-example-outlook"
  ],
  "findings": [
    {
      "finding_id": "example-biomarker-overreach",
      "severity": "major",
      "category": "endpoint_boundary",
      "applies_to_change_id": "update-example-outlook",
      "applies_to_record": {
        "record_type": "outlook",
        "record_id": "track-example-outlook"
      },
      "claim_or_issue": "The public note reads like functional benefit despite only biomarker evidence.",
      "why_it_matters": "That would overstate the maturity of the track.",
      "recommended_action": "Rewrite the note to keep the result in the biomarker lane.",
      "resolution_status": "open"
    }
  ]
}
```

## Connective Tissue Into Editorial

The admin review UI already reads `evidence_review` records directly.

Use `review_comment` only when:

- the curator explicitly asks for a discussion note
- you need to attach human feedback to a specific review or finding
- you are responding to a prior editorial request

If you write a `review_comment`, point it at:

- `applies_to_evidence_review_id`
- `applies_to_finding_id`

when that linkage is known.
