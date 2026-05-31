# Research Ops State

This project treats the `track` as the default unit of research work.

That is deliberate. A language model can usually do one bounded track pass well enough to be useful. It cannot reliably do “research longevity” or “bootstrap all hallmarks” in one session without getting diffuse.

## The Split

- `research/state/coverage-status.v1.json`
  Persistent state about what has baseline coverage, what is in active review, and what mode comes next.
- `research/backlog/track-priority.v1.json`
  The ordered queue that bootstrap and surveillance should consult when the user is vague.
- `research/sessions/*.json`
  One structured record per research pass, including no-op passes that do not produce a bundle.

## Default Behavior

- If the user names a `track`, use that track.
- If the user names only a `hallmark`, choose the highest-priority track inside that hallmark or ask the user to pick one.
- If the user says something too broad like `go find research`, decompose to one track-level pass.
- If the user is vague but clearly wants `bootstrap` or `surveillance`, choose the top ready item from the matching queue and state the assumption.

## What One Research Run Should Produce

- one bounded scope
- one structured session record under `research/sessions/`
- zero or one candidate bundle
- staged JSON only for records that materially changed

After a session is recorded or a bundle changes, run:

`npm run sync:research-planning`

That command regenerates `coverage-status.v1.json` and `track-priority.v1.json` from taxonomy, sessions, bundles, and publication history.

## What A Research Run Should Not Do

- cover multiple hallmarks by default
- silently broaden from one track into the whole field
- publish directly
- confuse contextual activity with evidence
