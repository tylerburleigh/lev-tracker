---
name: lev-reconciliation-orchestrator
description: Use when coordinating agent-led LEV reconciliation across public updates, State of the Field editions, current LEV story, hallmark insights, track pages, and editorial workflow manifests. Produces structured agent recommendations, asks the curator for approval or revision only when meaningful, then executes approved work through the specialist LEV skills and verification commands.
---

# LEV Reconciliation Orchestrator

Use this before specialist LEV skills when the user asks what should be reconciled, whether public summary pages are current, how to reduce manual judgment, or how an agent should ask for approval before making editorial changes.

## Read First

- `ops/triage-state.v1.json`
- `ops/state-of-field-workflow.v1.json`
- `docs/editorial-rollup.md`
- `docs/editorial-quality-system.md`
- relevant `data/publication-events/`
- relevant public surfaces: current LEV story, State of the Field edition, hallmark insight, track outlook, or overall outlook

Run the deterministic sync before making recommendations:

```bash
npm run state-of-field:reconcile -- --write
npm run state-of-field:status
npm run state-of-field:packet
```

Use `npm run state-of-field:reconcile -- --include-period-events --write` when the curator wants a whole-period sweep rather than only current-story and draft-pool updates.

## Operating Model

Scripts detect and enforce. The agent judges and records. The human approves direction, rejects, or asks for revisions.

1. Detect candidates with deterministic commands and existing public records.
2. For each candidate, write or update `agent_assessment`:
   - `recommended_decision`
   - `confidence`
   - `materiality`
   - `affected_surfaces`
   - `public_copy_action`
   - `human_review_required`
   - `escalation_reason` when review is required
   - `rationale`
   - `reviewed_at`
3. Render the approval packet with `npm run state-of-field:packet`.
4. Ask the curator with a concrete recommendation batch:
   - approve all high-confidence recommendations
   - approve only selected items
   - revise specified recommendations
   - hold until surveillance, evidence review, or period close
5. After approval, execute through the narrowest specialist skill:
   - new or current external evidence: `lev-surveillance-update`
   - candidate bundle evidence fidelity: `lev-evidence-review`
   - approved bundle publish: `lev-editorial-review`
   - current story/homepage rollup: `lev-narrative-rollup`
   - monthly edition work: `lev-state-of-field-update`
6. Record the outcome in `decision` and `human_approval`; keep public copy and workflow state in sync.
7. Run `npm run verify:editorial` and any specialist checks required by the executed skill.

## Escalation Rules

Set `human_review_required: true` when any of these apply:

- confidence is not high
- materiality is high
- the recommendation changes top-level LEV framing, overall outlook, stage, momentum, read firmness, evidence gap, strongest evidence, or LEV 2036 outlook
- the update involves clinical outcomes, safety, lifespan, mortality, adverse events, trial results, or human functional claims
- the update contradicts an existing public story or prior monthly conclusion
- the agent recommends excluding a strongly relevant public update
- a relevant track, hallmark, or public surface cannot be mapped cleanly
- source discovery, surveillance, or evidence review is required before public claims can be current
- the retrospective period has not closed but the user is asking to publish a final edition

If none apply, the agent may mark human review as not required for internal metadata or no-public-copy decisions, then report the action and verification result.

## Recommendation Standard

Do not ask the human to classify raw items from scratch. The agent should first make a conservative recommendation, include the reason, and identify what would change the answer.

Use these State of the Field decisions:

- `include_as_field_signal`: actual reviewed field movement during the covered period
- `include_as_current_context`: useful context or claim-boundary clarification, not field progress
- `include_as_trial_horizon`: registry-linked or trial-timing context that belongs in trial horizon copy
- `omit_process_context`: publication, coverage, or workflow context that does not help the reader
- `needs_surveillance`: current claim cannot be trusted without rechecking external sources or registries
- `defer_to_next_edition`: belongs to a later retrospective period
- `add_post_hoc_context_note`: old-period context should be noted without changing the conclusion
- `post_hoc_material_correction`: old-period conclusion would have changed
- `no_op`: no public surface change is needed

Keep evidence and interpretation separate. Do not turn coverage repair, registry status, trial starts, funding, source-map completeness, or program activity into proof that LEV is closer.

## Approval Packet

The approval message should be compact:

```text
I found N reconciliation candidates.
I recommend: A include_as_field_signal, B current_context, C omit/no-op.
High-confidence low-risk items: ...
Escalations needing your approval: ...
Approve, revise, or hold?
```

When the curator approves, apply the approved decisions and run verification. When the curator rejects or revises, update `agent_assessment` and `human_approval` before executing.

## Boundaries

- Do not publish new evidence claims through this skill.
- Do not bypass candidate-bundle, evidence-review, or editorial-review gates.
- Do not write final public State of the Field copy before the covered period closes.
- Do not leave agent recommendations only in chat; record them in the workflow manifest or the relevant review artifact.
- Do not ask for human judgment when the agent has not provided a recommendation.
