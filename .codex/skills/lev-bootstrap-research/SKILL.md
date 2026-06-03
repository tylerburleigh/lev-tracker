---
name: lev-bootstrap-research
description: Use when initializing LEV coverage for one hallmark, track, or intervention family. Stages source/study/finding/outlook evidence-map JSON plus a candidate bundle without publishing.
---

# LEV Bootstrap Research

Use this when a hallmark or track has thin coverage and needs a first serious pass.

## Scope

Work on one bounded unit at a time:

- one hallmark plus one track
- one track only
- one intervention family inside one track

Do not try to initialize the whole field in one run.

## Read First

- `README.md`
- `docs/research-ops-state.md`
- `taxonomies/hallmarks-of-aging.v1.json`
- `taxonomies/track-taxonomy.v1.json`
- `research/state/coverage-status.v1.json`
- `research/backlog/track-priority.v1.json`
- `docs/coverage-assessment.md`
- `schemas/research-session.schema.json`
- `schemas/coverage-assessment.schema.json`
- `schemas/source.schema.json`, `schemas/study.schema.json`, `schemas/finding.schema.json`, and `schemas/outlook.schema.json`
- `scripts/research-bundle.mjs`
- relevant public records in `data/outlooks/`, `data/sources/`, `data/studies/`, `data/findings/`, and `data/activity-items/`
- prior admin history in `data/candidate-bundles/`, `data/review-comments/`, and `data/publication-events/`
- if present, prior notes in `research/sessions/`
- if present, prior coverage assessments in `research/coverage-assessments/`

## Workflow

1. Resolve scope before doing any research:
   - if the user names a track, use it
   - if the user names only a hallmark, choose the highest-priority track for that hallmark from `research/backlog/track-priority.v1.json` or ask the user to pick one
   - if the user is vague, choose the top `bootstrap_queue` item whose track is `queue_state: "ready"` and `next_mode: "bootstrap"` in `research/state/coverage-status.v1.json`
   - if the user asks for a whole hallmark, multiple hallmarks, or the whole field, push back and decompose to one track
2. Confirm the bounded public question being answered.
3. Inspect the current public layer for that scope before doing new research.
4. Check whether a previous candidate bundle or publication event already covered the same change.
5. Extract source facts before drafting claims:
   - population or model, sample size, duration, intervention or exposure, endpoint, quantitative result, safety signal, funding/conflicts, and directness boundary
   - whether the finding supports mechanism, biomarker movement, functional benefit, disease-specific benefit, lifespan/mortality, or only context
6. Write one structured session record under `research/sessions/` using `schemas/research-session.schema.json`.
7. Create or update a coverage assessment under `research/coverage-assessments/` when the pass establishes a first public baseline or materially changes confidence about source-landscape completeness.
   - Use `coverage_verdict: "thin"` when the baseline is intentionally sparse.
   - Use `coverage_verdict: "adequate"` when the public claim is defensible but important categories remain incomplete.
   - Reserve `coverage_verdict: "strong"` for tracks with positive, limiting, human, preclinical, safety, registry, recent-review, and seminal-anchor categories represented or explicitly ruled out.
8. Draft public record changes only as staged JSON under `data/staged-records/<bundle-id>/`.
   - For a first public track baseline, stage source, study, finding, and outlook records together when evidence supports a rating.
   - In track outlooks with stage, momentum, confidence, blocker, or best-signal claims, include support-map fields and `rating_change_criteria`.
   - Each `supporting_evidence[]` item should map one rating rationale to concrete finding IDs, source IDs, a support role, and limitations.
   - Assign the highest stage only when the support map contains current human-relevant evidence for that stage and the outlook text names the boundary.
   - For narrow disease benefit in a broad aging track, hold the broader rating lower unless the limitation is explicit and confidence remains conservative.
9. Create or update `data/candidate-bundles/<bundle-id>.json` with:
   - `intake_mode: "bootstrap"`
   - scoped hallmark and track IDs
   - `proposed_changes[]` using both `file_path` and `staged_file_path`
   - a short `proposed_outlook_implications[]` entry
   - concrete `next_actions`
10. If the pass is a no-op, record `outcome: "no_op"` in the session and do not create a bundle.
11. Run `npm run research:bundle -- validate --bundle <bundle-id>` and fix any structural, provenance, or support-map issue before handing off.
12. Run `npm run sync:research-planning` after the session record and any bundle edits are written.
13. Run `npm run validate:records` after adding or updating a coverage assessment.
14. Leave the bundle in `submitted` or `revised`.

## Boundaries

- Do not set a bundle to `approved` or `published`.
- Keep activity/context separate from efficacy or outlook changes.
- Prefer one tight candidate bundle over many diffuse edits.
- Do not bootstrap more than one track per run unless the user explicitly narrows further inside that track.
- Do not make a public track-rating claim without either source-backed findings and a support map or an explicit thin-coverage caveat.
- If the evidence does not justify a public change, write the session record and stop without editing public JSON.
- Do not treat baseline publication as proof of strong coverage; record known source-completeness gaps in the coverage assessment.

## Expected Outputs

- one bounded `research_session` record
- one `coverage_assessment` when establishing first public baseline coverage or recording material source-landscape confidence
- one candidate bundle
- staged source, study, finding, outlook, or activity JSON whose `id` and `record_type` match the intended target record
- a track-level evidence audit trail when a staged outlook assigns or changes ratings
