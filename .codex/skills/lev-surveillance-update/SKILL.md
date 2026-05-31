---
name: lev-surveillance-update
description: Use when checking what changed since the last LEV review for one scope. Compares public records and evidence audit trails, then stages JSON plus a surveillance bundle without publishing.
---

# LEV Surveillance Update

Use this for ongoing monitoring after a scope already has baseline coverage.

## Read First

- `docs/research-ops-state.md`
- `research/state/coverage-status.v1.json`
- `research/backlog/track-priority.v1.json`
- `schemas/research-session.schema.json`
- `schemas/source.schema.json`, `schemas/study.schema.json`, `schemas/finding.schema.json`, and `schemas/outlook.schema.json`
- `scripts/research-bundle.mjs`
- the current public record for the scope in `data/outlooks/`, `data/sources/`, `data/studies/`, `data/findings/`, and `data/activity-items/`
- the latest related bundle in `data/candidate-bundles/`
- related `review-comments` and `publication-events`
- if present, the latest session note in `research/sessions/`

## Workflow

1. Resolve scope before doing any research:
   - if the user names a track, use it
   - if the user names only a hallmark, choose the highest-priority surveillance track for that hallmark from `research/backlog/track-priority.v1.json`
   - if the user is vague, choose the top `surveillance_queue` item whose track is `queue_state: "ready"` and `next_mode: "surveillance"` in `research/state/coverage-status.v1.json`
   - if the user asks for all updates or the whole field, push back and decompose to one track-level delta pass
2. Define the delta window from the last meaningful review or publication event.
3. Look only for changes that can alter:
   - public context
   - outlook wording
   - the evidence audit trail behind stage, momentum, confidence, blockers, or best signals
   - review priority
4. Decide which of these outcomes applies:
   - `no_op`: nothing material changed
   - `activity_only`: context changed without outlook movement
   - `outlook_refresh`: the public wording or emphasis should change
5. Extract source facts before deciding whether the delta matters:
   - population or model, sample size, duration, intervention or exposure, endpoint, quantitative result, safety signal, funding/conflicts, and directness boundary
   - whether the change alters mechanism, biomarker movement, functional benefit, disease-specific benefit, lifespan/mortality, or only context
6. Write one structured session record under `research/sessions/` using `schemas/research-session.schema.json`.
7. For `no_op`, record `outcome: "no_op"` in the session and do not touch public JSON.
8. For a material change, stage only the affected records under `data/staged-records/<bundle-id>/`.
   - If the change affects a rating rationale, update or add the relevant source, study, finding, and outlook support-map records together.
   - If only context changed, do not add rating support that the sources do not justify.
   - Assign a higher stage only when new support-map evidence reaches that stage; increased activity alone affects momentum/context, not evidence stage.
   - For narrow disease benefit in a broad aging track, hold the broader rating lower unless the limitation is explicit and confidence remains conservative.
9. Create or update `data/candidate-bundles/<bundle-id>.json` with:
   - `intake_mode: "surveillance"`
   - the delta question
   - minimal proposed changes
   - explicit uncertainty flags when the change is contextual only
10. Run `npm run research:bundle -- validate --bundle <bundle-id>` and fix any structural, provenance, or support-map issue before handing off.
11. Run `npm run sync:research-planning` after the session record and any bundle edits are written.
12. Leave publishing to the editorial skill.

## Boundaries

- Do not broaden scope mid-pass.
- Do not move a stage just because activity increased.
- Do not silently overwrite public JSON; all proposed changes go through staged files and a bundle.
- Keep negative, null, stalled, or mixed updates visible when they matter.
- Do not refresh track outlook wording while leaving `supporting_evidence`, `supporting_finding_ids`, `supporting_source_ids`, or `rating_change_criteria` stale.
- Do not turn a surveillance pass into fresh baseline research. Hand it back to bootstrap instead.

## Expected Outputs

- either a recorded no-op `research_session` or one surveillance candidate bundle
- staged source, study, finding, outlook, or activity JSON only for records that materially changed
