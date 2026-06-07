# Homepage Wireframe Spec

## Purpose

This document turns the homepage portion of the public-site IA into an implementation-ready wireframe spec.

It defines:

- section order
- component list
- required data bindings
- desktop layout behavior
- mobile layout behavior
- empty and stale states

## Product Job

Within 30 seconds, a first-time visitor should be able to understand:

- the overall LEV outlook
- the state of all 12 hallmarks
- what changed recently
- why the site believes what it believes

## Design Principles

- This is a working knowledge surface, not a landing page.
- The first viewport must carry the main answer.
- The page should reward scanning before reading.
- Evidence, interpretation, and outlook must remain visibly distinct.
- Activity and progress should never look interchangeable.

## Page Structure

The homepage should render in this order:

1. Global app header
2. Overview band
3. Hallmark outlook grid
4. Recent changes and 2036 scenario band
5. Reader paths into concrete evidence

## Wireframe Overview

```text
DESKTOP

+----------------------------------------------------------------------------------+
| Header: logo/name | nav | search | last updated                                 |
+----------------------------------------------------------------------------------+
| Overview band                                                                    |
| +--------------------------------------+ +-------------------------------------+ |
| | Overall LEV outlook                  | | Snapshot rail                       | |
| | state / stage / momentum / note      | | last change / human review / count | |
| | evidence gaps / strongest evidence   | | of hallmarks / track coverage      | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
| Hallmark outlook grid                                                            |
| [1] [2] [3] [4]                                                                  |
| [5] [6] [7] [8]                                                                  |
| [9] [10] [11] [12]                                                               |
+----------------------------------------------------------------------------------+
| Recent changes                                  | 2036 scenario lens             |
| timeline/list                                   | status / explanation / moves   |
+----------------------------------------------------------------------------------+
| Trust and methods band                                                        -> |
+----------------------------------------------------------------------------------+

MOBILE

+----------------------------------+
| Header                           |
+----------------------------------+
| Overall LEV outlook              |
+----------------------------------+
| Snapshot rail                    |
+----------------------------------+
| Hallmark grid 2 columns          |
+----------------------------------+
| Recent changes                   |
+----------------------------------+
| 2036 scenario lens               |
+----------------------------------+
| Trust and methods                |
+----------------------------------+
```

## Section 1: Global App Header

### Job

Orient the user and expose the site-level controls without taking over the page.

### Elements

- site name
- primary navigation
- search trigger
- last updated timestamp
- legend trigger for `Evidence / Interpretation / Outlook`

### Desktop Layout

- single horizontal row
- site name on the left
- nav centered or left-weighted
- utilities on the right

### Mobile Layout

- compact top bar
- hamburger or sheet navigation
- search and legend as icon buttons
- last updated text moves below the bar if needed

## Section 2: Overview Band

### Job

Give the shortest possible credible answer to the overall question.

### Layout

Desktop:

- 2-column band
- left column is the primary `Overall LEV Outlook`
- right column is a compact `Snapshot Rail`

Mobile:

- stacked
- `Overall LEV Outlook` first
- `Snapshot Rail` second

### Component A: Overall LEV Outlook Card

#### Required Data

Source:

- `outlook` record where `subject_type = overall`

Fields:

- `name`
- `evidence_stage`
- `momentum`
- `confidence`
- `main_evidence_gaps`
- `strongest_current_evidence`
- `interpretation_note`
- `last_updated`
- optional `lev_2036_outlook`

#### Visual Priority

This is the most prominent component on the homepage.

#### Content Blocks

- label: `Overall LEV Outlook`
- evidence stage badge
- momentum badge
- confidence badge
- one-paragraph interpretation note
- 2-3 evidence gaps
- 2-3 strongest current evidence points

#### Interaction

- optional link to latest editorial note

### Component B: Snapshot Rail

#### Job

Provide fast supporting context without forcing the user into prose.

#### Items

- `last public update`
- `hallmarks tracked`
- `seeded tracks covered`
- `recent outlook changes`
- `human-reviewed status`

#### Required Data

Derived from:

- `publication_event`
- `outlook`
- `track taxonomy`
- optional app aggregates

#### Layout

Desktop:

- vertical stack of compact metric rows

Mobile:

- horizontal scroll row or stacked mini-panels

## Section 3: Hallmark Outlook Grid

### Job

Make the 12-hallmark model legible immediately.

### Layout

Desktop:

- 4 columns by 3 rows

Tablet:

- 3 columns by 4 rows

Mobile:

- 2 columns by 6 rows

### Ordering

- fixed canonical hallmark order
- no sorting on the homepage

### Component: Hallmark Outlook Card

#### Required Data

Source:

- one `outlook` per hallmark
- hallmark metadata from the hallmark taxonomy
- track counts derived from the track taxonomy or track records

Fields:

- hallmark name
- hallmark id
- `evidence_stage`
- `momentum`
- `confidence`
- `main_evidence_gaps[0]`
- active track count
- `last_updated`

#### Content Shape

Each card should fit in a stable footprint and include:

- hallmark name
- stage label
- momentum marker
- confidence marker
- one-line evidence gap
- track count
- last updated

#### Interaction

- entire card links to `/hallmarks/{hallmark_id}`

#### States

- normal
- thin coverage
- stale

Thin coverage means the hallmark is public but evidence depth is low. This should be explicit rather than hidden.

## Section 4: Recent Changes and 2036 Scenario Band

### Layout

Desktop:

- 2-column band
- wider left column for `Recent Changes`
- narrower right column for `2036 Scenario Lens`

Mobile:

- stacked
- `Recent Changes` first
- `2036 Scenario Lens` second

### Component A: Recent Changes Feed

#### Job

Show the most important movement on the site without becoming a noisy activity log.

#### Required Data

Primary sources:

- `publication_event`
- `activity_item`
- `outlook`
- `finding`
- `milestone`

#### Include

- published outlook changes
- milestone movements
- newly published findings
- notable contextual activity

#### Exclude

- draft admin actions
- raw ingestion output
- duplicate or low-signal updates

#### Feed Item Shape

Each item should show:

- event title
- change type
- affected subject
- date
- one-line why it matters
- link target

#### Count

- default 5 items on desktop
- default 4 items on mobile

### Component B: 2036 Scenario Lens

#### Job

Provide the provocative frame without letting it dominate the page.

#### Required Data

Preferred:

- field on overall outlook

Fallback:

- app-level configuration with a linked explanation

#### Fields

- 2036 LEV outlook
- short explanation
- `what would need to change`

#### Tone

- explicit that this is a scenario lens
- no pseudo-precision

## Section 5: Reader Paths

### Job

Offer concrete paths into the evidence without adding another interpretive summary block.

### Content

- track examples that illustrate recurring evidence patterns
- short rationale for why those examples are shown
- link to browse all tracks

### Layout

Desktop:

- one horizontal band with short statements and links

Mobile:

- stacked short blocks

## Component Inventory

The homepage needs these reusable components:

- `AppHeader`
- `OverallOutlookCard`
- `SnapshotRail`
- `HallmarkOutlookCard`
- `RecentChangesFeed`
- `ScenarioLensCard`
- `TrustBand`

## Required Data Bundle

The homepage loader should be able to hydrate from a compact bundle like:

- `overall_outlook`
- `hallmark_outlooks[]`
- `hallmark_taxonomy[]`
- `track_counts_by_hallmark`
- `recent_publication_events[]`
- `recent_activity_items[]`
- optional `featured_findings[]`

## Derived Values

The homepage should derive, not store separately:

- active track count per hallmark
- recent changes count
- stale status
- thin coverage status

## Staleness Rules

The homepage should visually mark stale public judgments.

Suggested initial rule:

- if `last_updated` is older than 90 days, show `stale`

This is a product rule, not a schema rule, and can change later.

## Empty and Thin States

### Overall Outlook Missing

Do not render the public homepage without an overall outlook.

This should block publish or render a clearly marked incomplete state in development only.

### Hallmark Outlook Missing

If one hallmark lacks an outlook:

- still render the card
- show `coverage in progress`
- keep the card clickable

### Recent Changes Empty

Show:

- `No recent public changes`
- link to State of the Field

## Accessibility and Readability Constraints

- stage, momentum, and confidence cannot be color-only
- every status needs text
- long evidence-gap text must clamp cleanly
- all 12 hallmark cards need equal visual weight
- the first viewport must remain legible on laptop and mobile widths

## Implementation Notes

- Do not build the homepage as a hero page.
- Do not put the whole homepage inside floating cards.
- Use full-width bands with constrained inner content.
- Keep the hallmark grid dense and stable.
- The strongest visual emphasis belongs to the overall outlook and hallmark grid, not the 2036 lens.

## Open Implementation Questions

These do not block initial frontend scaffolding:

- exact wording of the overall state labels
- whether the snapshot rail uses counts, chips, or compact stat blocks
- whether recent changes includes one featured finding excerpt
- whether hallmark cards expose mini sparklines later

## Next Artifact

After this document, the next build artifact should be:

- homepage seed data spec, or
- actual frontend scaffold for `/`
