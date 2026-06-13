# Hallmarks-Based Longevity Tracker Schema

This repository starts with a source-of-truth data schema for a longevity tracker built on the expanded Hallmarks of Aging framework.

The first pass is intentionally small:

- `taxonomies/` holds canonical framework data.
- `docs/` holds product and taxonomy rationale documents.
- `research/` holds persistent planning state, backlog queues, and session journals for multi-pass research work.
- `schemas/` defines JSON Schema contracts for core record types.
- `examples/` shows how records should look in practice.
- `data/` now holds the file-backed public records, review queue records, and staged promotion artifacts used by the prototype app.

## Key Docs

- [Project roadmap](docs/project-roadmap.md): active product, research, data, and docs task tracker.
- [Product brief](docs/product-brief.md): product intent and domain model.
- [Research ops state](docs/research-ops-state.md): default research work unit and queue rules.
- [Coverage assessment](docs/coverage-assessment.md): internal rubric for source-landscape completeness and known evidence gaps.
- [Admin review](docs/admin-review.md): candidate lifecycle, promotion readiness, and publication behavior.
- [Evidence review](docs/evidence-review.md): review lanes, findings, and evidence-gate workflow.
- [Publication checklist](docs/publication-checklist.md): pre-publish and post-publish checklist.
- [Source ingestion rules](docs/source-ingestion-rules.md): PubMed, ClinicalTrials.gov, and manual source conventions.
- [Intervention normalization](docs/intervention-normalization.md): rules for turning intervention IDs into public records.
- [Data sustainability](docs/data-sustainability.md): rules and checks for keeping file-backed records maintainable as the tracker grows.
- [Artifact retention](docs/artifact-retention.md): retention classes for canonical data, staged intermediates, generated state, reports, drafts, and compression candidates.

## Design Principles

- Hallmarks are the primary organizing axis.
- Interventions, studies, findings, and milestones can map to one or more hallmarks.
- Findings stay atomic and source-backed.
- Milestones capture progress toward clinically meaningful aging interventions instead of raw activity.

## Core Entities

- `hallmarks taxonomy`: the canonical list of hallmark IDs and descriptions.
- `track taxonomy`: the seeded list of stable track IDs grouped under hallmarks.
- `source`: a bibliographic or registry record.
- `track`: a stable research approach within a hallmark.
- `intervention`: a therapy, modality, or program being tracked.
- `study`: a trial, experiment, or observational study.
- `finding`: one atomic observation or claim from a source or study.
- `milestone`: a project-level progress checkpoint tied to one or more hallmarks.
- `activity_item`: a contextual update such as trial, company, funding, or regulatory movement.
- `outlook`: a curator judgment for the overall field, a hallmark, or a track.
- `candidate_bundle`: a reviewable package of proposed changes from research ops.
- `evidence_review`: a structured verification pass against a bundle revision and review lane.
- `review_comment`: feedback exchanged during admin review.
- `publication_event`: a record of what was published to the public site.
- `coverage_status`: persistent internal state for what has baseline coverage and what mode comes next.
- `coverage_assessment`: internal track-level assessment of source completeness, evidence categories, and known gaps.
- `track_priority_queue`: the ordered internal queue that bootstrap, surveillance, and coverage repair consult when scope is vague.
- `work_triage`: unified generated dispatcher for what the agent should work on next.
- `research_session`: one bounded bootstrap, surveillance, or coverage-repair pass, including no-op and coverage-assessment-only outcomes.

## Editorial Flow

1. Research ops produce a `candidate_bundle`.
2. Proposed record revisions are staged under `data/staged-records/<bundle-id>/`.
3. Evidence reviewers add one or more `evidence_review` records for the current bundle revision.
4. The admin review UI adds `review_comment` records, references evidence-review findings when needed, and updates bundle lifecycle status.
5. Publishing promotes staged JSON into the public record paths under `data/` and writes a `publication_event` that records the approving evidence reviews.

## Research Planning State

- `ops/triage-state.v1.json` is the persistent answer to “what should the agent work on next?”
- `research/state/coverage-status.v1.json` is the persistent answer to “what already has coverage?”
- `research/backlog/track-priority.v1.json` is the persistent answer to “what should bootstrap, surveillance, or coverage repair do next?”
- `research/sessions/*.json` records what each bounded research pass actually did, even when it produced no bundle.
- `research/coverage-assessments/*.json` records how complete a track's source and evidence landscape appears, plus known gaps.
- `npm run sync:research-planning` surfaces the latest coverage assessment verdict, gap counts, next action, and recommended next mode in `coverage-status.v1.json`.
- `npm run sync:research-planning` also regenerates `ops/triage-state.v1.json`.
- The default research work unit is one `track` per run.
- Run `npm run sync:research-planning` after a research pass to regenerate state and queue files.

## Validation Commands

- `npm run validate:records`
  Validates every JSON file under `data/`, `examples/`, `taxonomies/`, `research/`, and `ops/` against the repository JSON Schema contracts.
- `npm run audit:data:sustainability`
  Reports data footprint, staged-history pressure, candidate-bundle lifecycle shape, and staged files that are not linked from bundle metadata.
- `npm run audit:artifacts`
  Classifies file-backed artifacts by retention role and identifies prunable or compressible categories without deleting anything.
- `npm run audit:staged-archive-readiness`
  Compares terminal staged JSON with current live records to decide whether manifest-only archival would lose historical staged bodies.
- `npm run manifest:staged-records`
  Generates or checks the hash manifest for terminal staged records before any future staged JSON compression.

## Research Commands

- `npm run research:bundle -- status --bundle <bundle-id>`
  Prints bundle validation, evidence-review gate, promotion readiness, and publication state.
- `npm run research:bundle -- validate --bundle <bundle-id>`
  Runs the same bundle checks and exits nonzero if the bundle is not publishable in its current state.
- `npm run research:bundle -- approve --bundle <bundle-id>`
  Moves a valid, review-ready bundle to `approved`.
- `npm run research:bundle -- publish --bundle <bundle-id>`
  Promotes staged records, writes a `publication_event`, and moves the bundle to `published`.
- `npm run research:review-evidence -- status --bundle <bundle-id>`
  Prints the current evidence-review state for a bundle revision, including missing lanes and blocking findings.
- `npm run research:review-evidence -- scaffold --bundle <bundle-id> --lane <lane>`
  Creates a draft review JSON under `research/drafts/evidence-reviews/` with derived revision, round, and ID metadata.
- `npm run research:review-evidence -- apply --file <draft-path>`
  Promotes a completed review into `data/evidence-reviews/`, updates `candidate_bundle.evidence_review_ids[]`, and supersedes older same-lane reviews for the same bundle revision.

## Relationship Pattern

1. A `source` documents one or more `studies`.
2. A `track` groups related `interventions`, `studies`, and `findings`.
3. A `study` evaluates one or more `interventions`.
4. A `finding` points back to a `source`, and usually to a `study`.
5. `Interventions`, `studies`, `findings`, and `milestones` all carry `hallmark_ids` and may also link to `track_ids`.
6. `Outlooks` and `publication_events` sit above the evidence layer and expose editorial judgment and publishing history.

## Next Steps

- Use [docs/project-roadmap.md](docs/project-roadmap.md) as the current product and research roadmap.
- Use [docs/triage-workflow.md](docs/triage-workflow.md) and `ops/triage-state.v1.json` when deciding what to work on next.
- Keep `research/state/coverage-status.v1.json` and `research/backlog/track-priority.v1.json` as the generated source of truth for research coverage and next track selection.
- Run `npm run validate:records`, `npm run typecheck`, and `npm run build` before treating roadmap implementation work as complete.
- Run `npm run sync:research-planning` after research sessions, bundle changes, or publication events.
