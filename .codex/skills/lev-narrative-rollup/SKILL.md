---
name: lev-narrative-rollup
description: Use when revising the public current LEV story, homepage State of LEV story, what to watch next, where better evidence is needed, or story revision triggers. Compares the current story against public outlooks, state-of-the-field editions, public updates, and review due dates without introducing new unreviewed evidence.
---

# LEV Narrative Rollup

Use this after reviewed public records have changed, or when the curator asks whether the homepage story still matches the evidence map.

## Read First

- `data/content/current-lev-story/current.json`
- `schemas/current-lev-story.schema.json`
- latest `data/content/state-of-the-field/*.json`
- `data/outlooks/overall-lev-outlook.json`
- public outlooks named in the narrative `related_outlook_ids`
- `data/publication-events/` newer than `revision.last_reviewed`
- `docs/editorial-rollup.md`
- `docs/editorial-quality-system.md`
- homepage rendering in `src/components/homepage.tsx`
- `scripts/current-lev-story.mjs`

## Staleness Checks

The narrative needs review when any of these are true:

1. A newer public update record has `affected_outlook_ids`.
2. Overall, hallmark, or track evidence stage, momentum, confidence, evidence gap, strongest evidence, or LEV 2036 outlook changed.
3. A new or revised state-of-the-field edition changes the monthly public interpretation.
4. `revision.review_due` has passed.
5. The curator asks for a story, watchlist, focus-priority, or homepage framing review.

## Workflow

1. Compare the current story against the latest public outlooks and public updates.
   - Start with `npm run story:current -- status`.
2. Decide whether the existing story is current, stale, or only needs metadata refresh.
3. If stale, revise only from already reviewed public records:
   - Generate a deterministic plain-language draft with `npm run story:current -- draft --write --style plain` and use it as review input, not automatic truth.
   - `title` and `summary` for the main homepage story
   - `current_evidence_picture` and `what_changed` for the hero interpretation
   - `recent_developments` for temporal progress that affected public interpretation
   - `what_to_watch_next` for signals that could change the outlook next
   - `where_better_evidence_is_needed` for clear next steps, underbuilt evidence, early promise, or blocking gaps
   - `before_now_next`, `what_would_change_the_outlook`, and `track_examples_to_inspect` when the homepage needs a clearer reader path
   - `revision` metadata and triggers
4. Keep evidence, interpretation, and outlook distinct. Do not turn activity, funding, recruiting status, or source coverage into proof of LEV progress.
5. If the revision would require new sources, findings, stages, confidence changes, or outlook upgrades, stop and use the field-change-check/evidence-review/staged-update workflow instead.

## Writing Rules

- Lead with the aggregate field story, not isolated data points.
- Say what changed and what did not change.
- Use conservative language for speculative areas.
- Prefer plain reader language over internal research language: "early signs in people" instead of "human-facing signals"; "missing-context update" instead of "coverage repair"; "reason to be more optimistic" instead of "forecast upgrade".
- Tie what-to-watch-next items to concrete signals that would change interpretation.
- Tie better-evidence needs to a reason: `clear_next_step`, `underbuilt_evidence`, `early_promise`, or `blocking_gap`.
- Update `revision.last_reviewed`, `revision.review_reason`, `revision.review_due`, and relevant `related_*_ids`.
- After accepting a reviewed story state, run `npm run story:current -- snapshot --write-current` so future checks can diff outlook evidence stages, field momentum, rating confidence, evidence gaps, strongest evidence, and LEV 2036 outlook.

## Checks

Run after edits:

```bash
npm run audit:editorial -- --write
npm run validate:records
npm run audit:data
npm run typecheck
npm run build
```

If visual layout changed, start the dev server and inspect `/` on desktop and mobile widths.
