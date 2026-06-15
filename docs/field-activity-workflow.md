# Field Activity Workflow

Field activity is the public record of external field motion. It is not the evidence layer.

Use this workflow when an agent is deciding whether to add or update `activity_item` records for company formation, program launches, partnerships, prize or funder activity, funding, regulatory events, trial status changes, conference/publication events, corrections, retractions, or other concrete field events.

## Boundary

Create an `activity_item` when all of these are true:

- A concrete external event happened.
- The event has a durable date from a primary or high-quality source.
- The event is materially relevant to aging, LEV, a tracked hallmark, a tracked intervention family, or the field infrastructure around them.
- The public page benefits from showing the event separately from evidence of benefit.

Do not create an `activity_item` for:

- tracker/editorial work, such as adding a watchlist item, finishing a review, or deciding a topic should be tracked
- routine company copy, undated website changes, or promotional claims without a concrete event
- ordinary evidence claims that belong in `source`, `study`, `finding`, and `outlook` records
- old events discovered during a narrow pass unless the historical scope is clear enough to avoid a misleading partial timeline

## Data Roles

- `source`: the canonical document, registry, filing, award page, press release, or publication.
- `study`: a trial, experiment, cohort, or model-system study.
- `finding`: an atomic evidence claim from a source or study.
- `outlook`: the current interpretation of evidence.
- `activity_item`: the dated field event, including whether it changes the current assessment.

For broad company, funder, or institutional activity, set `scope_label` instead of forcing a weak `hallmark_ids` or `track_ids` mapping. Use hallmark, track, intervention, study, or finding IDs only when the event genuinely belongs to those records.

## Materiality Test

Capture the event when at least one of these is true:

- It changes visible field infrastructure, such as a company launch, lab launch, major collaboration, or material funding award.
- It changes development status, such as a trial launch, completion, termination, posted results, or regulatory designation.
- It changes the reader's understanding of who is working on a relevant area, what is funded, or what is likely to produce future evidence.
- It is a correction, retraction, safety signal, or regulatory action that affects how existing public records should be read.

Default `affects_outlook` to `false`. Set it to `true` only when the event changes the public assessment itself, not merely because it is interesting or well funded.

## Noteworthiness Threshold

`/activity` should be curated. A candidate should normally be public only when it is `field_anchor` or `material_program`.

Use `field_anchor` when the event is a field-shaping anchor:

- a major new aging or rejuvenation company, institute, prize, funder, or program
- substantial dedicated capital or prize/funder infrastructure
- a credible organization entering aging biology in a way that changes the field map
- a major partnership, facility, or platform launch that could shape future evidence generation

Examples: Calico's launch, Altos Labs' launch, a major healthspan prize launch, or a large new healthspan grant program.

Use `material_program` when the event is not quite a field anchor but still changes the public read of field activity:

- a large financing or award round tied to aging, healthspan, or a tracked intervention family
- a first-in-human transition, major clinical-program transition, or material competition milestone
- a funder or prize milestone that identifies substantial field participation or funding direction
- a partnership extension or new collaboration that affects a visible aging-biology program

Use `watch_only` when an event may matter later but is too small, too routine, too local, or too weakly sourced for the public feed. Keep it in the watchlist or research session.

Use `below_threshold` when the item is ordinary news churn: routine hiring, ordinary conference attendance, small or generic grants, broad investor commentary, undated promotional copy, or repeated messaging without a concrete new event.

Prize and funder activity belongs in the feed when it creates or redirects meaningful field infrastructure. Do not add every grant, team, milestone, or winner announcement. Prefer program launches, large funding rounds, first milestone cohorts, and awards that materially explain why a domain is on watch.

After approval, live public `activity_item` records must carry `noteworthiness_tier` and `threshold_basis`. Validation rejects live `/activity` records that are `watch_only`, `below_threshold`, or missing a threshold basis.

## Trial Activity Policy

Use `/trials` as the comprehensive trial-watch surface. It should carry registry status, enrollment, completion dates, result status, stale checks, no-results context, and routine registry maintenance.

Use `/activity` only for notable trial field movement:

- a new directly aging-, healthspan-, or tracked-intervention-relevant human trial
- a first-in-human, first older-adult, first functional-endpoint, or first direct target-family trial
- a material status milestone such as recruiting, active-not-recruiting, completed, terminated, suspended, or withdrawn when that milestone changes field expectations
- posted registry results or a linked result publication
- a major phase transition, expansion, or clinical-program milestone

Do not publish ordinary trial maintenance as `/activity`:

- a registry was rechecked and still has no posted results
- the registry `last_updated` date changed without a meaningful status, milestone, or result change
- completion dates shifted modestly
- enrollment estimates changed slightly
- a site opened or closed without changing the broader field read

Live trial activity records must carry `trial_activity_kind`. Validation rejects `routine_registry_maintenance` from `/activity`. Put routine maintenance in `trial_details`, `trial_watch_checks[]`, research sessions, or `/trials` instead.

## Agent-Led Process

1. Define the scope: one track, one intervention family, one entity, one funding program, one regulator, or one recurring field sweep.
2. Pull current local context: existing sources, studies, findings, outlooks, activity items, coverage assessments, and research sessions.
3. Start with `research/backlog/field-activity-watchlist.v1.json`, then search primary sources: registries, FDA/EMA, sponsor press pages, funder award pages, company news pages, conference pages, official blogs, competition guidelines, and PubMed only when a publication event is being treated as activity.
4. Classify each candidate as `capture_now`, `research_more`, `exclude`, `evidence_path`, `captured`, or `captured_by_related_item`.
5. Recommend the candidate list to the human only when the choice is meaningful. Include the proposed activity type, lane, scope label, date, source, surface routing, and whether it affects the outlook.
6. After approval, add the smallest public records needed: usually one `source`, one `activity_item`, and one `publication_event` with `publication_route: "direct_activity_publish"` when the activity is published outside a candidate bundle.
7. Record excluded near-misses in the research session when they are likely to be rediscovered.
8. Run validation and data audits before considering the pass complete.

After publishing approved activity records, run a residual-queue check for the same entity, funder, program, competition, or source family. Mark remaining candidates as still-needed, `research_more`, `exclude`, or `captured_by_related_item`. Do not leave a narrower `capture_now` item open when a broader approved field-anchor record already carries the public significance.

Use a `research_session` with `mode: "field_activity"` for entity, funder, program, or monthly cross-field sweeps. Set `field_activity_sweep_type` so the dispatcher can distinguish `entity`, `funder_prize`, `government_program`, `registry_regulatory`, and `monthly_cross_field` passes. Only a completed `monthly_cross_field` session satisfies the monthly dispatcher item. Use `scope.scope_label` and `scope.entity_names` when the scope is broader than one hallmark or track.

## Discovery Inputs

Use a watchlist because broad web search alone has poor recall and inconsistent source quality. The watchlist should include:

- discovery channels that state where to look and which blindspots they cover
- blindspot controls that state the risk, mitigation, cadence, and success signal
- company, nonprofit, funder, prize, regulator, and program entities
- official home pages, press pages, blogs, award databases, competition pages, guidelines, registries, and regulatory databases
- candidate events classified as `capture_now`, `research_more`, `exclude`, `evidence_path`, `captured`, or `captured_by_related_item`
- candidate noteworthiness tiers: `field_anchor`, `material_program`, `watch_only`, or `below_threshold`
- source quality labels: `primary_dated`, `primary_undated`, `secondary_dated`, `secondary_undated`, or `not_found`

During a sweep, review `capture_now` plus `field_anchor` or `material_program` first, then `research_more`, then new broad-search leads. Do not let broad search replace the watchlist; use it to add new watchlist entries or source URLs.

Use `captured_by_related_item` when a relevant narrower event is intentionally consolidated into a broader public activity item. Include `related_activity_item_ids` and a short `consolidation_note`. This is not an exclusion: it records that the candidate mattered, but a separate public item would duplicate the field read.

## Blindspot Mitigation

Every monthly sweep should explicitly cover these failure modes:

- entity recall: major organizations missed because they are not tied to a current track
- source-type gaps: prize, funder, guideline, award, registry, or regulatory pages missed because the search only checks company press releases
- threshold noise: routine news items crowding out genuinely notable field activity
- source quality: secondary, undated, or social-only sources treated as durable public anchors
- activity/evidence boundary drift: financing or launch posts treated as evidence of benefit
- track tunnel vision: field-wide events forced into weak hallmark or track mappings

The controls for these risks live in `research/backlog/field-activity-watchlist.v1.json`. If a sweep finds a new blindspot, update the watchlist controls before adding more public activity records.

## Learning Loop

Treat the field-activity process as a pilot until it has completed at least three different sweeps: one entity/company sweep, one funder or prize sweep, and one registry or regulatory sweep. The pilot state, open learning questions, required metrics, and revision triggers live in `research/backlog/field-activity-watchlist.v1.json`.

After every `mode: "field_activity"` sweep, record what the process learned before calling the pass complete:

- What did the watchlist find before broad search?
- What did broad search find that the watchlist or discovery channels missed?
- Which candidates were downgraded to `watch_only`, `below_threshold`, or `research_more`, and why?
- Which source-quality problems prevented publication?
- Did the human approve the recommendation packet, reject it, or request revisions?
- Did the sweep expose a new blindspot, source type, threshold problem, schema gap, or runbook gap?

If the answer exposes a process weakness, update the system artifact that should prevent the weakness from recurring: the watchlist entry, discovery channel, blindspot control, threshold guidance, schema, triage script, or runbook. Do not leave the learning only in chat.

During the pilot phase, the agent should recommend system edits when learning signals repeat. The human should be asked to approve the concrete change, not to classify raw leads from scratch.

After the pilot questions are answered, move the watchlist `learning_loop.phase` to `stable`. Keep revision triggers as ongoing controls, but close active learning questions unless a new source type, threshold problem, approval-loop burden, or schema/runbook gap appears. Stable monthly sweeps should record a learning note only when a trigger fires, the human requests a revision, or broad discovery exposes a blindspot that the watchlist did not cover.

## Source Quality

Prefer a primary dated source. Officially syndicated company releases, official blogs, funder award pages, competition guidelines, registry records, and regulatory pages can count as primary sources.

Use `research_more` instead of publishing when:

- only secondary coverage gives the date or funding amount
- the official page is current but undated
- the event comes from social media without a durable official page
- the source mixes concrete activity with unverified claims that require trial, registry, or evidence-path checking

Secondary sources can be search leads, but publishing from them should be a human-approved exception.

## Candidate Packet

Use the dedicated commands before asking the human to resolve field-activity work:

```bash
npm run field-activity:status
npm run field-activity:packet
```

`field-activity:status` separates publication-ready items, human approvals, source-work candidates, nonblocking watch items, consolidated items, State-of-Field-routed items, and the next monthly sweep due date. `field-activity:packet` is the approval/source-work packet; it should be preferred over State of the Field status when the question is field-activity workflow health.

For each recommended event, give the human:

- event label and date
- proposed `activity_type`, `activity_lane`, and `scope_label`
- noteworthiness tier and threshold basis
- source URL and source quality
- why the event is field activity rather than evidence
- whether the event should affect outlook, usually `false`
- recommended public action: add now, research more, exclude, or route to evidence review
- surface routing: affected public surfaces, State of the Field review need, Current LEV Story review need, and the no-surface-change reason when applicable
- agent assessment and approval state when the decision should enter an approval packet

Add a short learning summary when the packet closes: candidates reviewed, capture-now count, research-more count, watch-only or below-threshold count, source-quality exceptions, new watchlist entries, new blindspot controls, human revisions, and any schema or workflow edits made.

When the human approves a broader field-anchor item, explicitly ask whether narrower same-entity candidates should remain separate, be deferred for source work, or be marked `captured_by_related_item`. If the agent has high confidence that the broader item covers the narrower one, recommend consolidation rather than asking the human to classify it from scratch.

## Cadence

- Track surveillance: check activity while reviewing a track, but do not let track surveillance be the only discovery route.
- Monthly State of the Field prep: run a short cross-field activity sweep from the watchlist for major company, funder, partnership, regulatory, and trial-watch changes.
- Quarterly backfill: pick one entity, funder, or program family from the watchlist and add selected historical anchor events only after checking enough of that scope to make the timeline defensible.
- Event-triggered: when a source or user names a missing entity, run an entity-scoped sweep before adding a single isolated item.

When the monthly State of the Field workflow reviews the field-activity watchlist, also check the learning-loop state. If open learning questions or revision triggers remain, include them in the agent recommendation packet rather than waiting for a separate human prompt.

The State of the Field workflow also prints a live public-activity lens summary. Use that summary to reconcile `/activity` with monthly editorial copy:

- field anchors can provide field-map context, but they are not automatically current-period progress
- current movement can be considered for `what_changed` or `current_context`
- trial horizon items can support `trial_horizon` copy only when the registry or program boundary is explicit
- historical backfill should usually be `add_post_hoc_context_note` or omitted from the monthly narrative unless it prevents a misleading field read

Keep the watchlist queue health separate from the public activity lens summary: the watchlist tells the agent what still needs work, while the public lens summary tells the agent what already-public activity the State of the Field edition may need to explain.

## Historical Backfill

Historical activity should be labeled with the `historical-backfill` tag. It should capture selected anchor events, not every news item. The source and significance note should make clear why the old event matters now.

For example, Google's 2013 Calico announcement is a field-wide commercial activity item because it marks a major technology-company entry into aging biology. It is not a finding and it does not change the evidence assessment.

## Verification

Run at least:

```bash
npm run field-activity:status
npm run field-activity:packet
npm run validate:records
npm run audit:data
```

When UI or TypeScript mappings change, also run:

```bash
npm run typecheck
npm run build
```
