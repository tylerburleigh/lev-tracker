---
name: lev-narrative-rollup
description: Use when revising the public LEV progress narrative, homepage State of LEV story, watchlist, focus priorities, or narrative revision triggers. Compares the current narrative against public outlooks, state-of-the-field editions, publication events, and review due dates without introducing new unreviewed evidence.
---

# LEV Narrative Rollup

Use this after reviewed public records have changed, or when the curator asks whether the homepage story still matches the evidence map.

## Read First

- `data/content/progress-narrative/current.json`
- `schemas/progress-narrative.schema.json`
- latest `data/content/state-of-the-field/*.json`
- `data/outlooks/overall-lev-outlook.json`
- public outlooks named in the narrative `related_outlook_ids`
- `data/publication-events/` newer than `revision.last_reviewed`
- `docs/editorial-rollup.md`
- homepage rendering in `src/components/homepage.tsx`
- `scripts/progress-narrative.mjs`

## Staleness Checks

The narrative needs review when any of these are true:

1. A newer `publication_event` has `affected_outlook_ids`.
2. Overall, hallmark, or track `current_stage`, `momentum`, `confidence`, blocker, best signal, or `scenario_2036_status` changed.
3. A new or revised state-of-the-field edition changes the monthly public interpretation.
4. `revision.review_due` has passed.
5. The curator asks for a story, watchlist, focus-priority, or homepage framing review.

## Workflow

1. Compare the current narrative against the latest public outlooks and publication events.
   - Start with `npm run narrative:progress -- status`.
2. Decide whether the existing story is current, stale, or only needs metadata refresh.
3. If stale, revise only from already reviewed public records:
   - Generate a deterministic plain-language draft with `npm run narrative:progress -- draft --write --style plain` and use it as review input, not automatic truth.
   - `title` and `summary` for the main homepage story
   - `where_we_are_now` and `what_changed_recently` for the hero interpretation
   - `progress_moments` for temporal progress that affected public interpretation
   - `watchlist` for signals that could change the outlook next
   - `focus_priorities` for low-hanging fruit, neglected areas, promising signals, or blocking dependencies
   - `revision` metadata and triggers
4. Keep evidence, interpretation, and forecast distinct. Do not turn activity, funding, recruiting status, or source coverage into proof of LEV progress.
5. If the revision would require new sources, findings, stages, confidence changes, or forecast upgrades, stop and use the surveillance/evidence-review/candidate-bundle workflow instead.

## Writing Rules

- Lead with the aggregate journey, not isolated data points.
- Say what changed and what did not change.
- Use conservative language for speculative areas.
- Prefer plain reader language over internal research language: "early signs in people" instead of "human-facing signals"; "missing-context update" instead of "coverage repair"; "reason to be more optimistic" instead of "forecast upgrade".
- Tie watchlist items to concrete signals that would change interpretation.
- Tie focus priorities to a reason: `low_hanging_fruit`, `neglected_area`, `promising_signal`, or `blocking_dependency`.
- Update `revision.last_reviewed`, `revision.review_reason`, `revision.review_due`, and relevant `related_*_ids`.
- After accepting a reviewed narrative state, run `npm run narrative:progress -- snapshot --write-current` so future checks can diff outlook stages, momentum, confidence, blockers, best signals, and scenario status.

## Checks

Run after edits:

```bash
npm run validate:records
npm run audit:data
npm run typecheck
npm run build
```

If visual layout changed, start the dev server and inspect `/` on desktop and mobile widths.
