# Public Site Information Architecture

## Purpose

This document defines the first public-site information architecture for the Hallmarks of Aging LEV Tracker.

It assumes:

- the public product is a website
- the site is high-trust first, provocative second
- the visitor should understand the overall LEV outlook and the state of all 12 hallmarks within 30 seconds
- the site is driven by the current product brief and seeded hallmark/track taxonomy

## Primary User Task

A first-time visitor should be able to answer:

1. Where are we overall on the path to LEV?
2. Which hallmarks appear to be progressing, stalled, or thin?
3. Why do those judgments exist?
4. What changed recently?

## Site Model

The public site is a hybrid dashboard and report.

It has:

- a persistent navigation shell
- a scan-first homepage
- inspectable detail pages for hallmarks, tracks, interventions, and evidence
- a separate activity lane
- a readable editorial layer for outlook and interpretation

## Navigation

Top-level navigation:

- `Overview`
- `Hallmarks`
- `Tracks`
- `Trials`
- `Activity`
- `Field Reviews`

Global utilities:

- search
- latest update timestamp

The site should not lead with a conventional marketing nav. It should feel like an operational knowledge product.

## Route Map

- `/`
  Homepage / Overview
- `/hallmarks`
  Hallmarks index
- `/hallmarks/{hallmark_id}`
  Hallmark detail page
- `/tracks`
  Track index
- `/tracks/{track_id}`
  Track detail page
- `/interventions/{intervention_id}`
  Intervention detail page
- `/studies/{study_id}`
  Study detail page
- `/findings/{finding_id}`
  Finding detail page
- `/activity`
  Activity feed
- `/state-of-the-field`
  Editorial archive index
- `/state-of-the-field/{edition_slug}`
  One editorial note

## Homepage

### Job

Give a fast, legible answer to the entire product promise.

### First Viewport

The first viewport should contain four things, in this order:

1. `Overall LEV outlook`
2. `12 hallmark outlook grid`
3. `Last updated / recent movement`
4. `Latest field review or optional scenario link`

The first viewport should not require scrolling to find the hallmark grid.

### Homepage Sections

#### 1. Overall LEV Outlook

Fields:

- overall state
- evidence stage
- momentum
- confidence
- main evidence gaps
- strongest current evidence
- short interpretation note

This is the main answer to "where are we overall?"

#### 2. Hallmark Outlook Grid

Twelve fixed cards in canonical hallmark order, not sorted by momentum.

Reason:

- a first-time user needs orientation more than ranking
- canonical ordering is stable and easier to learn
- ranking can be added later as a secondary view

Each card should show:

- hallmark name
- evidence stage
- momentum
- confidence
- top evidence gap
- number of active tracks
- last meaningful update

Click target:

- hallmark detail page

#### 3. Recent Changes

Compact feed of the most important recent public changes.

Include:

- outlook changes
- milestone changes
- newly published findings
- notable activity items

Do not show raw ingestion noise.

#### 4. Speculative Scenario Page

This is a distinct opt-in page, not the primary framing of the entire site.

Fields:

- scenario premise
- dated milestone sequence
- track or hallmark progress that would need to happen
- failure modes and evidence thresholds

The homepage may link to this page, but routine outlook records should not carry a date-specific status.

#### 5. Evidence Paths

Compact links to concrete track pages that illustrate the current field picture.

Must communicate why those examples are shown, without turning the homepage into a methods explainer.

## Hallmarks Index

### Job

Show all 12 hallmarks together in a more comparative view than the homepage.

### Default View

Canonical grid in hallmark order, with a view toggle for:

- `grid`
- `table`

The table view should support scanning by:

- stage
- momentum
- confidence
- number of tracks
- number of human-signal findings

## Hallmark Detail Page

### Job

Explain one hallmark in a way that combines structure, evidence, and judgment.

### Page Order

1. Hallmark outlook
2. Progress ladder and evidence stage
3. Tracks in this hallmark
4. Leading interventions
5. Strongest findings
6. Recent activity
7. Interpretation note and evidence gaps

### Hero Block

Fields:

- hallmark name
- one-sentence description
- evidence stage
- momentum
- confidence
- main evidence gap
- strongest current evidence
- last updated

### Progress Ladder Module

Show the shared five-stage ladder:

1. mechanistic plausibility
2. animal signal
3. human biomarker signal
4. human functional benefit
5. durable disease or mortality relevance

The page should clearly mark:

- evidence stage
- what evidence supports that stage
- what evidence is missing for the next stage

### Tracks Module

This is the main content block on the page.

Each track row or card should show:

- track name
- short summary
- stage
- momentum
- confidence
- top interventions
- strongest evidence
- main evidence gap

Default sort:

- editorial importance first
- then evidence density

Not all 38 tracks need to be equally prominent on day one, but every seeded track under the hallmark should be reachable.

### Leading Interventions Module

A secondary grouping derived from tracks.

Each intervention card should show:

- intervention name
- track
- evidence snapshot
- modality
- latest notable finding or activity

### Strongest Findings Module

This is not a raw paper list.

Each item should show:

- finding statement
- evidence tier
- direction
- confidence
- linked source or study
- caveat

### Recent Activity Module

Only contextual items:

- trial launches
- trial completions
- company updates
- funding events
- regulatory events

This section should be visually distinct from findings so users do not confuse motion with proof.

## Track Index

### Job

Give a cross-hallmark view of the 38 seeded tracks.

### Default Controls

- filter by hallmark
- filter by stage
- filter by momentum
- filter by modality
- search by track name or alias

### Default Layout

Dense table or list, not a card wall.

Each row should show:

- track
- primary hallmark
- evidence stage
- momentum
- confidence
- number of interventions
- number of linked studies
- last update

## Track Detail Page

### Job

This is the operational center of the public site.

If a user wants to understand what is actually happening in the field, they will often end up here.

### Page Order

1. Track outlook
2. Target rationale
3. Interventions
4. Evidence ladder
5. Strongest evidence
6. Evidence gaps and open questions
7. Recent changes
8. Related hallmarks

### Track Outlook Hero

Fields:

- track name
- primary hallmark
- summary
- evidence stage
- momentum
- confidence
- main evidence gap
- strongest current evidence
- earliest plausible window or timing caveat if relevant

### Evidence Ladder Module

Show the best evidence accumulated within the track across:

- mechanistic
- animal
- human biomarker
- human functional
- durable outcome relevance

This should make thin tracks visibly thin.

### Blockers Module

Explicitly list the reasons a promising track has not advanced:

- safety
- replication
- durability
- endpoint weakness
- population mismatch
- lack of human data

## Intervention Detail Page

### Job

Show one intervention without losing the context of its track.

### Page Order

1. Intervention summary
2. Primary and secondary hallmarks
3. Track membership
4. Evidence snapshot
5. Linked studies
6. Key findings
7. Risks and open questions
8. Related activity

## Study Detail Page

### Job

Show one study as a structured evidence object.

Fields:

- title
- study type
- status
- population or model
- intervention links
- hallmark links
- track links
- endpoint categories
- source links
- linked findings

## Finding Detail Page

### Job

Show one atomic observation with its interpretation boundary.

Fields:

- plain-language statement
- evidence tier
- direction
- confidence
- study and source
- linked hallmark and track
- caveats
- linked outlook or milestone impact

## Activity Feed

### Job

Track movement without implying efficacy.

### Controls

- filter by lane
- filter by hallmark
- filter by track
- filter by activity type

### Lanes

- scientific
- commercial
- regulatory

Each activity item should always show whether it affects outlook.

## State of the Field

### Job

Provide a recurring editorial artifact for users who want interpretation without inspecting every record.

### Format

Monthly editions with:

- what changed
- what did not change
- which outlooks moved
- what remains uncertain

This is where the site can be more narrative without weakening the trust model.

The public app intentionally does not include a standalone methodology page. Credibility should come from clear claims, source-backed detail pages, field reviews, and inspectable evidence paths rather than a separate trust explainer.
- known limitations

## Shared UI Objects

### Outlook Card

Used on homepage, hallmark pages, and track pages.

Fields:

- name
- stage
- momentum
- confidence
- evidence gap
- strongest evidence
- last updated

### Stage Ladder

Shared component used at overall, hallmark, and track levels.

### Evidence Table

Shared dense component for findings and studies.

### Activity Rail

Shared component for contextual updates.

## Ordering Rules

These rules should be consistent across the public site:

- hallmarks use canonical framework order
- tracks default to editorial importance within a hallmark
- findings default to strongest and most decision-relevant first
- activity defaults to newest first

## Data Dependencies

The public site depends on these record types:

- `hallmark taxonomy`
- `track taxonomy`
- `track`
- `intervention`
- `study`
- `finding`
- `milestone`
- `activity_item`
- `outlook`
- `publication_event`

The public site does not depend directly on `candidate_bundle` or `review_comment`, though those support the admin workflow that produces public records.

## Immediate Design Consequences

Before the frontend is scaffolded, the data layer should support:

- one overall outlook record
- one outlook per hallmark
- optional outlook per track
- track records derived from the seeded taxonomy
- public updates that drive recent changes

## Next Build Step

The next build artifact should be a homepage wireframe spec:

- exact sections
- component list
- required data bindings
- desktop and mobile layout behavior
