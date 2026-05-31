# Hallmarks-Based Longevity Tracker Schema

This repository starts with a source-of-truth data schema for a longevity tracker built on the expanded Hallmarks of Aging framework.

The first pass is intentionally small:

- `taxonomies/` holds canonical framework data.
- `docs/` holds product and taxonomy rationale documents.
- `research/` holds persistent planning state, backlog queues, and session journals for multi-pass research work.
- `schemas/` defines JSON Schema contracts for core record types.
- `examples/` shows how records should look in practice.
- `data/` now holds the file-backed public records, review queue records, and staged promotion artifacts used by the prototype app.

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
- `track_priority_queue`: the ordered internal queue that bootstrap and surveillance consult when scope is vague.
- `research_session`: one bounded bootstrap or surveillance pass, including no-op outcomes.

## Editorial Flow

1. Research ops produce a `candidate_bundle`.
2. Proposed record revisions are staged under `data/staged-records/<bundle-id>/`.
3. Evidence reviewers add one or more `evidence_review` records for the current bundle revision.
4. The admin review UI adds `review_comment` records, references evidence-review findings when needed, and updates bundle lifecycle status.
5. Publishing promotes staged JSON into the public record paths under `data/` and writes a `publication_event` that records the approving evidence reviews.

## Research Planning State

- `research/state/coverage-status.v1.json` is the persistent answer to “what already has coverage?”
- `research/backlog/track-priority.v1.json` is the persistent answer to “what should bootstrap or surveillance do next?”
- `research/sessions/*.json` records what each bounded research pass actually did, even when it produced no bundle.
- The default research work unit is one `track` per run.
- Run `npm run sync:research-planning` after a research pass to regenerate state and queue files.

## Research Commands

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
- Keep `research/state/coverage-status.v1.json` and `research/backlog/track-priority.v1.json` as the generated source of truth for research coverage and next track selection.
- Run `npm run sync:research-planning` after research sessions, bundle changes, or publication events.
