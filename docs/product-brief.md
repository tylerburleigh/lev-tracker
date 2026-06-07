# LEV Tracker Product Brief

## Working Name

Hallmarks of Aging LEV Tracker

## Product Definition

This product is a public website with a private single-admin curation workspace.

The public site helps a serious non-expert answer two questions quickly:

1. Where are we overall on the path toward longevity escape velocity?
2. For each Hallmark of Aging, are we making real progress, and why?

The private admin workspace supports evidence intake, review, revision, and publication.

## Implementation State

The current alpha has the core public and editorial surfaces in place:

- public routes for overview, hallmarks, tracks, interventions, studies, findings, activity, methods, state-of-the-field notes, and admin review
- file-backed records for sources, studies, findings, outlooks, activity items, staged updates, review comments, evidence reviews, and public updates
- staged promotion artifacts under `data/staged-records/<bundle-id>/`
- research planning state under `research/state/` and `research/backlog/`

The product brief remains the intent document. Use `docs/project-roadmap.md` for the current task list and implementation status.

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
- Evidence, interpretation, and outlook must be visibly separated.
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
   Hallmark stages, track summaries, evidence gaps, and milestone status
3. Outlook
   The curator's current outlook on overall progress and direction

Each public page should make it obvious which layer the user is looking at.

## Outlook Framing

The site is ultimately interested in the question:

Can human lifespan be extended at a rate that exceeds aging?

That is too abstract and uncertain to reduce to a precise public number at launch. The outlook layer should therefore begin as a structured qualitative judgment, not a probability table pretending to know more than it does.

Recommended public outlook fields:

- `overall_state`
- `momentum`
- `confidence`
- `main_evidence_gaps`
- `strongest_current_evidence`
- `interpretation_note`

The site may also include a clearly labeled standalone scenario page, such as a speculative `LEV by 2036` path. This should be framed as an opt-in scenario essay and milestone stress test, not as a precise prediction or as a status field repeated across normal outlook records.

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
- optional speculative scenario link
- methodology and trust notes

### 2. Hallmarks Index

Purpose:
Show all 12 hallmarks together with evidence stage, momentum, and evidence gaps.

### 3. Hallmark Detail Page

Purpose:
Explain how one hallmark is progressing.

Sections:

- hallmark outlook
- milestones and evidence stage
- underlying tracks
- leading interventions
- strongest findings
- recent activity
- interpretation note

Tracks should appear before raw recent evidence because the page should help users understand the structure of the field, not just the latest paper stream.

### 4. Track Detail Page

Purpose:
Show one research approach in a way that can accumulate over time.

Sections:

- track summary
- target rationale
- interventions in the track
- evidence ladder
- strongest evidence
- evidence gaps
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

## Public Outlook Object

An `outlook` is the curator's current judgment about a thing. The current public data set includes:

- one overall outlook
- one outlook per hallmark
- track outlooks for covered tracks

Current schema fields include:

- `subject_type`
- `subject_id`
- `evidence_stage`
- `momentum`
- `confidence`
- `main_evidence_gaps`
- `strongest_current_evidence`
- `interpretation_note`
- `what_would_change_the_rating`
- `supporting_finding_ids`
- `supporting_source_ids`
- `supporting_activity_item_ids`
- `supporting_evidence`
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
2. Evidence reviewers complete the required review lanes for the current bundle revision.
3. Human reviewer inspects proposed changes, staged files, review findings, and promotion readiness.
4. Candidate may be sent back for revision.
5. Agent revises and resubmits with a new revision when needed.
6. Human approves and publishes after the evidence gate and promotion checks are clean.

This should feel closer to editorial peer review than to a CMS form.

### Candidate Bundle Should Include

- source links
- proposed structured records
- rationale for classification
- related existing records
- uncertainty flags
- proposed milestone or outlook implications
- required evidence-review lanes and review requirements
- revision comments and history
- public update references after publishing

## Research Ops Integration

Research automation supports the admin workflow in three modes:

- `bootstrap`
  Build initial coverage for a hallmark, track, or evidence question.
- `surveillance`
  Recheck known areas for changes since the last search.
- `coverage_repair`
  Repair known source-completeness gaps from coverage assessments without treating historical completeness work as ordinary surveillance.

`ops/triage-state.v1.json` sits above those modes as the dispatcher for vague "what's next?" requests. It can also surface editorial, publication, data-normalization, documentation, schema, or app-surface work when those should take precedence over new research.

Each session should leave durable artifacts:

- session journal
- zero or one staged update
- staged records only for material changes
- structured materiality decision and excluded-source trail when applicable
- next actions
- regenerated planning state after session, bundle, or publication changes

## Current Schema State And Remaining Gaps

The core product-level schemas and validation baseline now exist for:

- `source`
- `study`
- `finding`
- `track`
- `intervention`
- `activity_item`
- `outlook`
- `candidate_bundle`
- `review_comment`
- `evidence_review`
- `publication_event`
- research planning state

Remaining schema and data hardening work:

- add app-level schemas where public pages rely on implicit aggregate contracts that become standalone records
- continue normalizing intervention records so intervention detail pages cover the long tail without fallback derivation

Source ingestion rules for PubMed, ClinicalTrials.gov, and manual curator entry are documented in `docs/source-ingestion-rules.md`.
Intervention normalization rules are documented in `docs/intervention-normalization.md`.

## Version 1 Scope

Version 1 alpha should continue to prioritize:

- all 12 hallmarks visible
- thin coverage accepted where necessary
- seeded track taxonomy
- overall outlook and hallmark outlooks
- track outlooks where baseline coverage exists
- clear evidence versus interpretation versus outlook separation
- single-admin review queue with evidence-review gates
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
