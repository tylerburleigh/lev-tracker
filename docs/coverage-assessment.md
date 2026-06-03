# Coverage Assessment

Coverage assessments are internal research-planning records that answer a different question from public outlooks and evidence reviews.

- A public `outlook` says what the tracker currently claims.
- A `research_session` says what one bounded pass did.
- An `evidence_review` says whether a staged bundle is faithful and bounded.
- A `coverage_assessment` says how complete the evidence landscape appears for one track and what known gaps remain.

Coverage assessments live under `research/coverage-assessments/` and validate against `schemas/coverage-assessment.schema.json`.

## Purpose

Use coverage assessments to make source completeness explicit without pretending it is exhaustive. A track can have a published baseline and still have only `adequate` coverage if it lacks a formal seminal-anchor audit, recent review triangulation, or a strong limiting-evidence map.

The goal is not to count every paper. The goal is to document whether the current public claim has enough coverage across the categories that matter.

## Verdicts

- `thin`: enough exists to orient future work, but important evidence categories are missing or not checked.
- `adequate`: enough exists to support the current public claim with clear boundaries, but some important source-completeness gaps remain.
- `strong`: major positive, limiting, human, preclinical, safety, trial, review, and seminal-anchor categories are represented or explicitly ruled out.

## Evidence Categories

Each assessment records category-level coverage:

- `human_interventional`
- `human_observational_or_natural_experiment`
- `animal_lifespan_or_healthspan`
- `mechanistic`
- `null_negative_or_limiting`
- `safety_durability`
- `active_trials_registries`
- `recent_reviews_meta_analyses`
- `seminal_anchors`
- `taxonomy_boundary`

Each category gets a `coverage_level`: `not_checked`, `thin`, `adequate`, `strong`, or `not_applicable`.

## Known Gaps

Known gaps are deliberately broader than missing papers:

- `coverage_gap`: a source-search or synthesis category has not been checked deeply enough.
- `evidence_gap`: the field lacks the kind of evidence needed for a stronger public claim.
- `operational_gap`: the project needs better process or tooling to make future coverage easier to judge.

Use `known_gaps[]` to separate "we have not checked this enough" from "the literature appears to lack this evidence."

## When To Create Or Update

Create or update a coverage assessment when:

- a bootstrap pass creates a first public track baseline
- a surveillance pass materially changes the outlook or support map
- a surveillance pass finds no public delta but meaningfully improves confidence about coverage
- a reviewer identifies a missing evidence category
- a curator intentionally runs a `coverage_repair` pass

Do not update it for every small source or activity record. The artifact should capture coverage judgments, not duplicate session logs.

## Workflow

1. Review the current public outlook and support map.
2. Review the latest relevant research session, bundle, evidence reviews, and publication event.
3. Assign category-level coverage based on what the current public claim depends on.
4. List `covered_source_ids[]` and `covered_finding_ids[]` that anchor the assessment.
5. Record known coverage, evidence, or operational gaps.
6. Set `next_coverage_action` to the smallest useful next step.
7. Run `npm run validate:records`.

## Planning Integration

Coverage assessments are validated internal artifacts. `npm run sync:research-planning` surfaces the latest assessment for each track in `research/state/coverage-status.v1.json`:

- latest coverage assessment ID
- coverage verdict
- known gap count
- high-priority known gap count
- next coverage action

Use these generated fields when deciding whether a track needs ordinary surveillance or a coverage-repair pass. Use `research/coverage-assessments/` directly when you need the category-level rationale and source lists.
