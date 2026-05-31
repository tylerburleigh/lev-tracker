# Data Model

## Design Principle

Claims are first-class records. They should not exist only as prose in a page or report.

Every major public conclusion should be traceable:

```text
claim/outlook
  -> support map
  -> findings
  -> artifacts/studies
  -> sources
  -> research session
  -> candidate bundle
  -> evidence review
  -> publication event
```

## Core Records

### Domain

Describes a configured research domain.

Suggested fields:

- `id`
- `name`
- `summary`
- `taxonomy_id`
- `default_scope_unit`
- `evidence_ladder_id`
- `default_review_lanes`
- `public_claim_language`

### Taxonomy Node

A stable scoping and navigation unit.

In this repo, the closest analogue is a `track`. A generic framework should allow two or three levels:

- domain
- category
- topic or track

Suggested fields:

- `id`
- `name`
- `parent_id`
- `canonical_order`
- `summary`
- `search_aliases`
- `example_entities`
- `scope_notes`
- `retirement_status`

### Source

A bibliographic, registry, report, dataset, webpage, conference, or policy source.

Suggested fields:

- `id`
- `name`
- `source_type`
- `authors`
- `venue`
- `year`
- `published_on`
- `doi`
- `pmid`
- `registry_ids`
- `urls`
- `summary`

### Artifact

A study, trial, paper, dataset, benchmark, conference abstract, report, or experiment.

This generalizes the current `study` record.

Suggested fields:

- `id`
- `name`
- `artifact_type`
- `status`
- `source_ids`
- `population_or_context`
- `sample_size`
- `methods`
- `intervention_or_system_ids`
- `endpoint_categories`
- `taxonomy_node_ids`
- `dates`
- domain-specific extraction fields

### Finding

One atomic observation or claim extracted from a source or artifact.

Suggested fields:

- `id`
- `name`
- `source_id`
- `artifact_id`
- `taxonomy_node_ids`
- `endpoint_category`
- `direction`
- `evidence_tier`
- `confidence`
- `statement`
- `population_or_context`
- `time_horizon`
- `quantitative_note`
- `caveats`
- domain-specific fields

### Claim Or Outlook

A curator or agent-drafted judgment about a topic, intervention, question, or domain state.

This generalizes the current `outlook` record.

Suggested fields:

- `id`
- `name`
- `subject_type`
- `subject_id`
- `current_stage`
- `momentum`
- `confidence`
- `summary`
- `main_blockers`
- `best_current_signals`
- `interpretive_note`
- `forecast_note`
- `rating_change_criteria`
- `supporting_finding_ids`
- `supporting_source_ids`
- `supporting_evidence`
- `last_updated`

`supporting_evidence[]` should map each rationale to concrete findings and limitations:

```json
{
  "label": "Human functional signal",
  "outlook_field": "current_stage",
  "conclusion": "The evidence supports a bounded human-functional signal.",
  "support_role": "supports",
  "rationale": "The finding uses a functional endpoint in the target population.",
  "finding_ids": ["example-finding-id"],
  "source_ids": ["example-source-id"],
  "limitations": ["Short duration", "Small sample", "Narrow population"]
}
```

### Activity Item

A contextual update that may matter but should not automatically count as evidence.

Suggested fields:

- `id`
- `name`
- `summary`
- `activity_type`
- `activity_lane`
- `occurred_on`
- `taxonomy_node_ids`
- `affects_claim`
- `significance_note`
- `source_ids`

### Research Session

One bounded research pass.

Suggested fields:

- `id`
- `mode`
- `started_at`
- `completed_at`
- `scope`
- `selected_via`
- `outcome`
- `summary`
- `candidate_bundle_id`
- `source_ids`
- `source_urls`
- `next_recommended_mode`
- `next_actions`

Modes:

- `bootstrap`
- `surveillance`
- `manual`

Outcomes:

- `candidate_bundle`
- `no_op`
- `activity_only`
- `blocked`

### Candidate Bundle

The reviewable unit of proposed change.

Suggested fields:

- `id`
- `name`
- `intake_mode`
- `lifecycle_status`
- `submitted_at`
- `submitted_by`
- `revision_number`
- `scope`
- `source_ids`
- `source_urls`
- `related_records`
- `proposed_changes`
- `proposed_claim_implications`
- `required_review_lanes`
- `review_requirement`
- `evidence_review_ids`
- `review_comment_ids`
- `publication_event_ids`
- `next_actions`

Lifecycle statuses:

- `submitted`
- `in_review`
- `needs_revision`
- `revised`
- `approved`
- `published`
- `rejected`

### Evidence Review

A structured verification pass for one bundle revision and one lane.

Suggested fields:

- `id`
- `candidate_bundle_id`
- `bundle_revision_number`
- `review_round`
- `review_lane`
- `reviewer_kind`
- `status`
- `verdict`
- `blocking`
- `summary`
- `reviewed_change_ids`
- `findings`

Findings should include:

- `severity`
- `category`
- `claim_or_issue`
- `why_it_matters`
- `recommended_action`
- `resolution_status`

### Review Comment

Editorial conversation around a bundle.

Use this for curator feedback, not source-fidelity verification.

### Publication Event

The immutable record that public data changed.

Suggested fields:

- `id`
- `candidate_bundle_id`
- `event_type`
- `published_at`
- `published_by`
- `published_targets`
- `affected_claim_ids`
- `approving_evidence_review_ids`
- `change_note`

### Coverage Status

Generated planning state for all taxonomy nodes.

Suggested fields:

- `taxonomy_node_id`
- `coverage_status`
- `next_mode`
- `queue_state`
- `last_session_id`
- `last_candidate_bundle_id`
- `last_publication_event_id`
- `default_research_question`
- `notes`

