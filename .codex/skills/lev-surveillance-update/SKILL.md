---
name: lev-surveillance-update
description: Use when checking what changed since the last LEV review for one scope. Compares public records, evidence audit trails, PubMed, registries, and other current external sources, then stages JSON plus a surveillance bundle without publishing.
---

# LEV Surveillance Update

Use this for ongoing monitoring after a scope already has baseline coverage.

## Read First

- `docs/research-ops-state.md`
- `research/state/coverage-status.v1.json`
- `research/backlog/track-priority.v1.json`
- `docs/coverage-assessment.md`
- `schemas/research-session.schema.json`
- `schemas/coverage-assessment.schema.json`
- `schemas/source.schema.json`, `schemas/study.schema.json`, `schemas/finding.schema.json`, and `schemas/outlook.schema.json`
- `scripts/research-bundle.mjs`
- the current public record for the scope in `data/outlooks/`, `data/sources/`, `data/studies/`, `data/findings/`, and `data/activity-items/`
- the latest related bundle in `data/candidate-bundles/`
- related `review-comments` and `publication-events`
- if present, the latest session note in `research/sessions/`
- if present, the latest track coverage assessment in `research/coverage-assessments/`

## Workflow

1. Resolve scope before doing any research:
   - if the user names a track, use it
   - if the user names only a hallmark, choose the highest-priority surveillance track for that hallmark from `research/backlog/track-priority.v1.json`
   - if the user is vague, choose the top `surveillance_queue` item whose track is `queue_state: "ready"` and `next_mode: "surveillance"` in `research/state/coverage-status.v1.json`
   - if the user asks for all updates or the whole field, push back and decompose to one track-level delta pass
2. Define the delta window from the last meaningful review or publication event.
3. Read the latest coverage assessment for the track when it exists, and note whether the pass should be ordinary surveillance or coverage repair.
4. Run current external source discovery before deciding materiality:
   - PubMed or NCBI E-utilities is required for biomedical track surveillance.
   - ClinicalTrials.gov API is required when human studies, registries, or trial-watch records could affect the track.
   - Use other official registries, regulator pages, DOI/publisher pages, preprint servers, conference pages, sponsor pages, or broader web search when the track is fast-moving, commercial, preprint-heavy, or likely to have non-PubMed sources.
   - Treat non-primary web hits as leads unless they point to verifiable source data.
   - Record search terms, dates, URLs, and close excluded hits in the session.
5. Look only for changes that can alter:
   - public context
   - outlook wording
   - the evidence audit trail behind stage, momentum, confidence, blockers, or best signals
   - review priority
6. Decide which of these outcomes applies:
   - `no_op`: nothing material changed
   - `activity_only`: context changed without outlook movement
   - `outlook_refresh`: the public wording or emphasis should change
7. Extract source facts before deciding whether the delta matters:
   - population or model, sample size, duration, intervention or exposure, endpoint, quantitative result, safety signal, funding/conflicts, and directness boundary
   - whether the change alters mechanism, biomarker movement, functional benefit, disease-specific benefit, lifespan/mortality, or only context
8. Write one structured session record under `research/sessions/` using `schemas/research-session.schema.json`.
9. Create or update a coverage assessment when surveillance changes category-level confidence, resolves a known gap, discovers a material missing category, or shows the next pass should be `coverage_repair`.
10. For `no_op`, record `outcome: "no_op"` in the session and do not touch public JSON.
11. For a material change, stage only the affected records under `data/staged-records/<bundle-id>/`.
   - If the change affects a rating rationale, update or add the relevant source, study, finding, and outlook support-map records together.
   - If only context changed, do not add rating support that the sources do not justify.
   - Assign a higher stage only when new support-map evidence reaches that stage; increased activity alone affects momentum/context, not evidence stage.
   - For narrow disease benefit in a broad aging track, hold the broader rating lower unless the limitation is explicit and confidence remains conservative.
12. Create or update `data/candidate-bundles/<bundle-id>.json` with:
   - `intake_mode: "surveillance"`
   - the delta question
   - minimal proposed changes
   - explicit uncertainty flags when the change is contextual only
13. Run `npm run research:bundle -- validate --bundle <bundle-id>` and fix any structural, provenance, or support-map issue before handing off.
14. Run `npm run sync:research-planning` after the session record and any bundle edits are written.
15. Run `npm run validate:records` after adding or updating a coverage assessment.
16. Leave publishing to the editorial skill.

## Boundaries

- Do not broaden scope mid-pass.
- Do not rely only on local records for surveillance; current external source discovery is part of the pass.
- Do not move a stage just because activity increased.
- Do not silently overwrite public JSON; all proposed changes go through staged files and a bundle.
- Keep negative, null, stalled, or mixed updates visible when they matter.
- Do not refresh track outlook wording while leaving `supporting_evidence`, `supporting_finding_ids`, `supporting_source_ids`, or `rating_change_criteria` stale.
- Do not turn a surveillance pass into fresh baseline research. Hand it back to bootstrap instead.
- Do not use ordinary surveillance to fill historical source-completeness gaps; record `next_coverage_action` as coverage repair when that is the real need.

## Expected Outputs

- either a recorded no-op `research_session` or one surveillance candidate bundle
- staged source, study, finding, outlook, or activity JSON only for records that materially changed
- an updated `coverage_assessment` when the pass changes confidence about source completeness or known gaps
