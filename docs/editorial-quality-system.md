# Editorial Quality System

The editorial quality system keeps the public LEV story readable, current, and honest without introducing new evidence claims. It covers public narrative copy, homepage reader tasks, and generated review artifacts.

## Reader Jobs

Every public narrative pass should preserve these reader jobs:

- Understand where the field is in the LEV journey.
- See what changed recently and what did not change.
- Tell evidence, interpretation, and forecast apart.
- See what would make the outlook more or less optimistic.
- Find concrete track examples worth inspecting.
- Understand where effort should focus next and why.

## Operating Loop

Run the combined audit before and after reader-facing narrative changes:

```bash
npm run audit:editorial -- --write
```

This command runs:

- `npm run narrative:progress -- status`
- `npm run lint:public-copy -- --write`
- `npm run audit:reader-tasks -- --write`

It writes:

- `extra/editorial-quality-report.md`
- `extra/public-copy-report.md`
- `extra/reader-task-audit.md`

Use stricter thresholds only when a pass is explicitly meant to reduce copy debt:

```bash
npm run audit:editorial -- --write --max-copy-warnings 300 --max-reader-warnings 0
```

The current ratchet command is:

```bash
npm run audit:editorial:ratchet
```

It enforces the current warning ceiling while still allowing planned cleanup passes to lower that ceiling later.

## Cadence

Run the system when any of these happen:

- a publication event changes a public outlook
- a state-of-the-field edition is added or revised
- the progress narrative review date is due
- homepage, hallmark, track, methods, or state-of-field copy changes
- the curator asks whether the story still works for readers

## Gates

The combined audit fails when:

- the progress narrative is stale
- the reader-task audit has an issue
- optional warning thresholds are exceeded

The public copy lint is advisory by default because detailed outlook records still contain useful technical phrasing. Treat the report as a prioritized cleanup queue rather than a blanket rewrite command.

## Source Of Truth

Public copy terms and plain-language replacements live in:

```text
config/public-copy-rules.json
```

Both the narrative generator and public-copy lint read from this file. Add or revise terms there first, then regenerate reports.

## Review Discipline

Use this system to improve presentation, not to change evidence. If a proposed edit would alter a stage, confidence value, forecast status, study interpretation, or supporting evidence mapping, stop and use the evidence-review or surveillance workflow instead.
