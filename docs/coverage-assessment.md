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

## Coverage Confidence And Research Density

Coverage assessments should separate "how well we checked" from "how much relevant research exists."

Use `coverage_confidence` for confidence in the source map itself:

- `low`: the assessment still has major source-search or category gaps, so absence of evidence should not be interpreted strongly.
- `moderate`: the main categories needed for the current public claim were checked, but meaningful completeness gaps remain.
- `high`: major positive, limiting, human, preclinical, safety, trial, review, and taxonomy-boundary categories were checked or explicitly ruled out.

Use `observed_research_density` for how much relevant research was found after the coverage pass:

- `sparse`: the checked literature appears small for this aging-relevant claim.
- `emerging`: several relevant sources exist, but the area is still early or uneven.
- `active`: enough relevant work exists to compare branches, limits, and human or registry signals.
- `dense`: the evidence base is large enough that interpretation, not discovery of basic sources, is the main task.

Do not use `sparse` just because the current public claim is weak. A field can be active or dense and still have weak aging-relevant evidence if the work is mostly mechanistic, animal-stage, disease-specific, biomarker-heavy, short-term, null, or safety-limited. If coverage is still `thin`, leave density unset unless the research pass directly established that the field itself is sparse.

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
- a field change check materially changes the outlook or evidence map
- a field change check finds no public delta but meaningfully improves confidence about coverage
- a reviewer identifies a missing evidence category
- a curator intentionally runs a `coverage_repair` pass

Do not update it for every small source or activity record. The artifact should capture coverage judgments, not duplicate session logs.

## Workflow

1. Review the current public outlook and evidence map.
2. Review the latest relevant research session, staged update, evidence reviews, and public update.
3. Assign category-level coverage based on what the current public claim depends on.
4. List `covered_source_ids[]` and `covered_finding_ids[]` that anchor the assessment.
5. Record known coverage, evidence, or operational gaps.
6. Set `coverage_confidence` and `observed_research_density` when the pass has enough search context to distinguish incomplete coverage from a genuinely sparse field.
7. Set `next_coverage_action` to the smallest useful next step.
8. Set `next_recommended_mode` to `surveillance` when normal delta monitoring should continue, or `coverage_repair` when source-completeness gaps should be repaired before ordinary surveillance.
9. Run `npm run validate:records`.

## Planning Integration

Coverage assessments are validated internal artifacts. `npm run sync:research-planning` surfaces the latest assessment for each track in `research/state/coverage-status.v1.json`:

- latest coverage assessment ID
- coverage verdict
- coverage confidence
- observed research density
- known gap count
- high-priority known gap count
- next coverage action
- last coverage recommended mode, and the resulting track `next_mode`

Use these generated fields when deciding whether a track needs ordinary surveillance or a coverage-repair pass. Use `research/coverage-assessments/` directly when you need the category-level rationale and source lists.
