# Editorial Quality System

The editorial quality system keeps the public LEV story readable, current, and honest without introducing new evidence claims. It covers public story copy, homepage reader tasks, and generated review artifacts.

## Reader Jobs

Every public story pass should preserve these reader jobs:

- Understand where the field stands now and what would count as the next meaningful step.
- See what changed recently and what did not change.
- Tell evidence, interpretation, and outlook apart.
- See what would make the outlook more or less optimistic.
- Find concrete track examples worth inspecting.
- Understand where effort should focus next and why.

Public story copy should describe the state of the field, not the state of the tracker. Coverage milestones, review status, and source-map completeness can explain why the site is easier to use, but the homepage arc should be about evidence maturity: human results, safety, endpoint quality, whether the main evidence gap moved, and whether LEV looks closer.

## Operating Loop

Run the combined audit before and after reader-facing story changes:

```bash
npm run audit:editorial -- --write
```

This command runs:

- `npm run story:current -- status`
- `npm run state-of-field:status -- --strict`
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

- a public update changes a public outlook
- a state-of-the-field edition is added or revised
- a State of the Field workflow item is opened, reconciled, blocked, or published
- the current LEV story review date is due
- homepage, hallmark, track, methods, or state-of-field copy changes
- the curator asks whether the story still works for readers

## Gates

The combined audit fails when:

- the current LEV story is stale
- current-story/public-edition State of the Field mismatches are not tracked in `ops/state-of-field-workflow.v1.json`
- the reader-task audit has an issue
- optional warning thresholds are exceeded

The reader-task audit also rejects public story fields that lean on tracker/process framing such as first-pass coverage, public-map completeness, reader-facing self-description, or editorial-review language.

The public copy lint is advisory by default because detailed outlook records still contain useful technical phrasing. Treat the report as a prioritized cleanup queue rather than a blanket rewrite command.

## Source Of Truth

Public copy terms and plain-language replacements live in:

```text
config/public-copy-rules.json
```

Both the story generator and public-copy lint read from this file. Add or revise terms there first, then regenerate reports.

## Review Discipline

Use this system to improve presentation, not to change evidence. If a proposed edit would alter a stage, confidence value, outlook status, study interpretation, or supporting evidence mapping, stop and use the evidence-review or field-change workflow instead.
