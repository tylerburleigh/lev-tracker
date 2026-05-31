# Intervention Normalization

Intervention records make the public evidence graph easier to inspect. They sit between broad tracks and specific studies or findings, and should describe what the intervention is without upgrading the evidence beyond the linked records.

## Selection Rules

Normalize an intervention when at least one of these is true:

- a promoted `study` or `finding` links to the intervention ID
- a published candidate bundle scopes work to the intervention ID
- the intervention is a track exemplar that appears repeatedly on public pages
- the intervention is needed to disambiguate related IDs, such as a compound, procedure, vector, or combination

Do not create broad placeholder intervention records just because a track exists. Tracks describe approaches; interventions describe specific modalities, products, procedures, combinations, or experimental constructs.

## ID Rules

- Keep existing intervention IDs stable once they appear in findings, studies, activities, or bundles.
- Prefer lowercase descriptive slugs, matching `intervention_ids[]` already used in promoted records.
- Use combination IDs when the evidence is for the combination rather than either component alone, such as `dasatinib-quercetin`.
- Use vector or construct IDs when the evidence depends on the delivery strategy, such as `aav9-mtert`.
- Do not reuse a track ID as an intervention ID unless the intervention truly has the same scope as the track.

## Minimum Useful Record

Each normalized intervention should include:

- `name`
- `summary`
- `modalities`
- `target_hallmark_ids`
- `track_ids`
- `mechanism_summary`
- `development_stage`
- `linked_study_ids` and/or `linked_finding_ids` when promoted records exist
- `risk_flags` when the public interpretation depends on safety or translation limits
- `evidence_snapshot.best_evidence_tier`
- `evidence_snapshot.human_data`
- `evidence_snapshot.open_questions`

The summary and mechanism should describe the intervention, not the track-level outlook. Evidence strength belongs in the linked findings and outlooks.

## Development Stage Rules

- Use `preclinical` for animal-only or in-vitro constructs.
- Use `clinical` for interventions tested in humans but not approved for the relevant use.
- Use `approved_for_other_indication` when the drug, biologic, procedure, or product is established for another disease or clinical purpose but not for aging.
- Use `approved_for_aging_indication` only if a regulator has approved an aging-specific indication.
- Use `conceptual` or `discovery` only for records that are needed to explain early research but do not yet have promoted interventional evidence.

## Page Behavior

Public pages should prefer normalized intervention names and summaries. Fallback labels are still allowed for older linked IDs that do not yet have intervention records.

The first public normalization batch intentionally focuses on interventions that already have promoted studies, findings, activity records, or track outlooks. Later batches should continue from the most-linked intervention IDs before filling long-tail records.
