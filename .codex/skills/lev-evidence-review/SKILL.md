---
name: lev-evidence-review
description: Use when verifying a LEV candidate bundle. Checks source fidelity, interpretation, and evidence-audit mappings; writes evidence-review records without publishing.
---

# LEV Evidence Review

Use this after research has produced a candidate bundle and before editorial approval or publish.

## Read First

- `data/candidate-bundles/<bundle-id>.json`
- staged files under `data/staged-records/<bundle-id>/`
- live target files referenced by each `file_path`
- existing `data/evidence-reviews/` records for the same bundle
- related `data/review-comments/` when they affect the current revision
- `schemas/evidence-review.schema.json`
- `schemas/candidate-bundle.schema.json`
- `schemas/source.schema.json`, `schemas/study.schema.json`, `schemas/finding.schema.json`, and `schemas/outlook.schema.json` when those records are staged
- `src/lib/site-data.ts` if publish or approval behavior matters

Read [references/output-contract.md](references/output-contract.md) before writing anything.

## Workflow

1. Work on one bundle revision and one review lane at a time.
2. Confirm the lane:
   - `source_fidelity`
   - `interpretation_forecast`
   - `safety_limitations`
   - `taxonomy_mapping`
   - `forecast_calibration`
3. Compare the staged change against the live record and the claimed evidence boundaries.
   - For track outlooks, verify that `supporting_evidence[]` maps each rating rationale to concrete findings, sources, support roles, and limitations.
   - For staged findings, verify that each finding has source/study provenance, endpoint boundaries, confidence, direction, and caveats.
   - Verify `rating_change_criteria` describes what would move the rating without implying the current evidence is stronger than it is.
4. Write one `evidence_review` record under `data/evidence-reviews/`.
5. Ensure the bundle lists that review ID in `evidence_review_ids[]`.
6. If the new record replaces an older review in the same lane for the same revision, mark the older record `superseded`.
7. Stop after the evidence-review layer is updated. Editorial comments, approval, and publish belong to other skills.

## Review Standard

- Treat the bundle as potentially wrong or overstated.
- Distinguish `activity` from `evidence`.
- Distinguish biomarker movement from functional benefit.
- Default to narrower claims when the source boundary is ambiguous.
- A source list is not sufficient support by itself; require explicit source -> study -> finding -> outlook rationale mapping when rating claims are public.
- Keep caveats near the claim they qualify, including sponsor, duration, population, endpoint, and attribution limits.
- Use `needs_human_judgment` when the evidence is bounded but the public wording still depends on curator judgment.

## Boundaries

- Do not do new source discovery in this skill.
- Do not change public live records or staged record contents unless the task explicitly includes revising the bundle after review.
- Do not approve or publish bundles.
- Do not leave findings implied in prose only. Put them in structured `findings[]`.
- Do not accept a track outlook rating change if its evidence audit trail is missing or materially stale.

## Expected Outputs

- one new or revised `data/evidence-reviews/<review-id>.json`
- bundle metadata updated so `evidence_review_ids[]` includes the review
- older same-lane review records marked `superseded` when replaced
