# LEV Tracker Product Brief

## Working Name

Hallmarks of Aging LEV Tracker

## Product Definition

This product is a public website with a private single-admin curation workspace.

The public site helps a serious non-expert answer two questions quickly:

1. Where are we overall on the path toward longevity escape velocity?
2. For each Hallmark of Aging, are we making real progress, and why?

The private admin workspace supports evidence intake, review, revision, and publication.

## Core Promise

In 30 seconds, a first-time visitor should be able to see:

- the current overall LEV outlook
- the current outlook for all 12 hallmarks
- what changed recently
- why those judgments were made

## Primary User

The primary public user is a technically literate outsider who wants signal, not hype.

Examples:

- founders and operators
- donors and philanthropists
- investors
- journalists
- researchers from adjacent fields
- serious amateurs following longevity science

## Curator Model

Version 1 assumes a single curator and publisher: you.

Automation can search, draft, and revise candidate records, but it does not publish directly. Public judgments remain human-reviewed.

## Editorial Stance

- Trust matters more than provocation.
- The site can be interesting and provocative, but not through false precision.
- Evidence, interpretation, and forecast must be visibly separated.
- Company activity, funding, and regulatory movement are worth tracking, but they should live in an activity lane rather than directly determining scientific progress.

## Non-Goals

- Not a medical advice product
- Not a social network
- Not a raw paper dump
- Not an auto-publishing AI news feed
- Not a precise countdown clock to LEV

## Public Site Model

The public site has three layers:

1. Evidence
   Sources, studies, findings, and activity items
2. Interpretation
   Hallmark stages, track summaries, blockers, and milestone status
3. Forecast
   The curator's current outlook on overall progress and direction

Each public page should make it obvious which layer the user is looking at.

## Forecast Framing

The site is ultimately interested in the question:

Can human lifespan be extended at a rate that exceeds aging?

That is too abstract and uncertain to reduce to a precise public number at launch. The forecast layer should therefore begin as a structured qualitative judgment, not a probability table pretending to know more than it does.

Recommended public forecast fields:

- `overall_state`
- `momentum`
- `confidence`
- `main_blockers`
- `best_current_signals`
- `forecast_note`

The site may also include a clearly labeled `2036 scenario lens` as an editorial device:

- unsupported
- speculative
- plausible
- on_track

This should be framed as a scenario check, not as a precise forecast.

## Progress Model

Public progress is shown in two ways:

1. Overall LEV outlook
2. Hallmark-by-hallmark outlooks

Each hallmark uses the same high-level progression ladder:

1. Mechanistic plausibility
2. Animal signal
3. Human biomarker signal
4. Human functional benefit
5. Durable disease or mortality relevance

Progression should not rely on effect size alone. Stage movement should consider:

- endpoint tier
- effect size
- replication
- durability
- safety
- population relevance

Disease-specific improvement can count as evidence toward a hallmark, but should not automatically dominate the hallmark outlook unless the endpoint and mechanism are clearly aging-relevant.

## Domain Hierarchy

The public content model should be:

- `overall outlook`
- `hallmark`
- `track`
- `intervention`
- `study`
- `finding`
- `activity item`
- `milestone`

### Hallmark

One of the 12 Hallmarks of Aging.

### Track

A stable research approach inside a hallmark. A track is broader than a single intervention and narrower than a hallmark.

Examples:

- `cellular_senescence / senolytics`
- `cellular_senescence / senomorphics`
- `deregulated_nutrient_sensing / rapalogs`
- `deregulated_nutrient_sensing / metformin-ampk`
- `epigenetic_alterations / partial_reprogramming`
- `mitochondrial_dysfunction / mitophagy_enhancers`

Tracks should be seeded in advance, but remain editable as the field changes.

### Intervention

A drug, therapy, modality, or program within a track.

### Study

A trial, experiment, or observational study evaluating one or more interventions.

### Finding

One atomic claim or observation linked to a source and usually a study.

### Activity Item

A non-efficacy update that may matter for context:

- trial launch
- trial completion
- company update
- funding event
- regulatory event

### Milestone

A progress checkpoint used for hallmark and track interpretation.

## Public Information Architecture

### 1. Homepage

Purpose:
Give a fast, trustworthy snapshot of the field.

Sections:

- overall LEV outlook
- 12 hallmark outlook grid
- recent changes
- 2036 scenario lens
- methodology and trust notes

### 2. Hallmarks Index

Purpose:
Show all 12 hallmarks together with current stage, momentum, and blockers.

### 3. Hallmark Detail Page

Purpose:
Explain how one hallmark is progressing.

Sections:

- hallmark outlook
- milestones and current stage
- underlying tracks
- leading interventions
- strongest findings
- recent activity
- forecast note

Tracks should appear before raw recent evidence because the page should help users understand the structure of the field, not just the latest paper stream.

### 4. Track Detail Page

Purpose:
Show one research approach in a way that can accumulate over time.

Sections:

- track summary
- target rationale
- interventions in the track
- evidence ladder
- best signals
- blockers
- recent changes

### 5. Intervention Detail Page

Purpose:
Show what a specific intervention targets, what evidence exists, and what remains unresolved.

### 6. Study / Finding Pages

Purpose:
Allow inspection of individual evidence records and their links.

### 7. Activity Feed

Purpose:
Show contextual movement in companies, trials, and regulation without overstating its scientific significance.

### 8. Methods Page

Purpose:
Explain the schema, sourcing rules, review process, and how forecast judgments are made.

## Public Outlook Object

An `outlook` is the curator's current judgment about a thing. At minimum, the site needs:

- one overall outlook
- one outlook per hallmark
- optionally one outlook per track

Recommended outlook fields:

- `subject_type`
- `subject_id`
- `current_stage`
- `momentum`
- `confidence`
- `main_blocker`
- `best_current_signal`
- `forecast_note`
- `last_updated`

## Admin Workflow

The admin area is an editorial review system for incoming candidate evidence and proposed interpretation changes.

### Intake Sources

- bootstrap research sessions
- surveillance sessions
- manual curator entry

### Candidate Lifecycle

1. `submitted`
2. `in_review`
3. `needs_revision`
4. `revised`
5. `approved`
6. `published`
7. `rejected`

### Review Loop

1. Agent submits candidate records and proposed diffs.
2. Human reviewer inspects evidence and comments.
3. Candidate may be sent back for revision.
4. Agent revises and resubmits.
5. Human approves and publishes.

This should feel closer to editorial peer review than to a CMS form.

### Candidate Bundle Should Include

- source links
- proposed structured records
- rationale for classification
- related existing records
- uncertainty flags
- proposed milestone or outlook implications
- revision comments and history

## Research Ops Integration

Research automation supports the admin workflow in two modes:

- `bootstrap`
  Build initial coverage for a hallmark, track, or evidence question.
- `surveillance`
  Recheck known areas for changes since the last search.

Each session should leave durable artifacts:

- session journal
- updated track state
- candidate bundle
- next actions

## Implications For The Existing Schema

The current schema foundation is good, but it is still missing product-level objects needed by the site:

- `track`
- `activity_item`
- `outlook`
- `candidate_bundle`
- `review_comment`
- `publication_event`

Those should be added before app scaffolding hardens around the current data model.

## Version 1 Scope

Version 1 should launch with:

- all 12 hallmarks visible
- thin coverage accepted where necessary
- seeded track taxonomy
- overall outlook and hallmark outlooks
- clear evidence versus interpretation versus forecast separation
- single-admin review queue
- continuous record updates plus a recurring editorial summary

## Recurring Public Artifact

In addition to live dashboard updates, publish a recurring editorial note such as:

- `State of the Field`

Recommended cadence:

- monthly

Purpose:

- summarize what changed
- explain any outlook changes
- highlight disagreements or uncertainty
- keep the project readable for users who do not inspect raw records

## Open Questions

These are important, but they do not block the first product brief:

- exact visual style of the public site
- exact initial seeded track taxonomy for all 12 hallmarks
- whether to show track-level outlooks in v1 or only hallmark-level outlooks
- precise rubric for moving a hallmark from one stage to the next
- whether the homepage hallmark grid is fixed-order or sorted by momentum
