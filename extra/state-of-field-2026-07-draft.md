# July 2026 State of the Field Draft

Status: internal draft only.
As of: 2026-06-14.
Covered period: June 1-30, 2026.
Do not publish before: 2026-07-01.

## Working Bottom Line

Through June 12, LEV still does not look closer. The reviewed June updates make the field easier to judge and add several bounded signals, but they do not resolve the central proof gap: repeated human evidence that health or function improves for longer.

## Candidate Reader Framing

June looks broader and better bounded rather than decisively stronger. Early June baseline work made many tracks easier to compare. Later updates added no-results registry context, safety context, review context, clearer claim boundaries, and narrow signals in microbiome-related tracks, senomorphics, DNA repair, autophagy induction, rapalogs, immune rejuvenation, senolytics, and partial reprogramming.

## Candidate Items To Classify

- Field signal: microbiome-related tracks gained bounded human signals, including disease-specific synbiotic, PA53 older-adult well-being/gut-health, and null healthy-older-adult exercise/microbiome context.
- Field signal: senomorphics gained mianserin/Ca2+ animal lifespan and human-cell senescence support.
- Field signal: DNA repair gained DREAM repression mechanism context without tested systemic human repair-enhancement evidence.
- Field signal: autophagy induction gained a small older-adult spermidine vaccine-response signal.
- Outlook boundary: rapalogs moved to a tentative human functional read, while immune rejuvenation stayed human-functional but became more clearly mixed and branch-specific.
- Context only: transposon control, NAD/redox, stem-cell rejuvenation, mitophagy, chaperone support, senolytics, and partial reprogramming gained clearer boundaries without changing the overall LEV read.
- Activity without results: stem-cell replacement exPDite-2 remained recruiting with no posted results.

## Rewrite Process

Before publication:

1. Rerun the trial audit after June 30.
2. Refresh current-story and public-update event IDs.
3. Close each `needs_decision` item in `ops/state-of-field-workflow.v1.json`.
4. Copy only final public copy from `candidate_public_edition_seed` in the JSON draft into `data/content/state-of-the-field/2026-07.json`.
5. Run validation, state-of-field status, editorial ratchet, typecheck, and build.

## Provisional Classification Matrix

| Date | Update | Working kind | Likely placement |
| --- | --- | --- | --- |
| 2026-06-03 | Microbiome composition modulation | Field signal | `what_changed` |
| 2026-06-06 | Transposon and somatic mutation control | Context only | `current_context` |
| 2026-06-06 | Live biotherapeutics and engineered microbes | Field signal | `what_changed` |
| 2026-06-07 | Stem-cell replacement exPDite-2 registry refresh | Activity without results | `trial_horizon` or omit |
| 2026-06-07 | Senomorphics mianserin/Ca2+ update | Field signal | `what_changed` |
| 2026-06-09 | NAD/redox missing context | Context only | `current_context` or `trial_horizon` |
| 2026-06-10 | Stem-cell rejuvenation missing context | Context only | `current_context` or `trial_horizon` |
| 2026-06-10 | Mitophagy missing context | Context only | `current_context` or `trial_horizon` |
| 2026-06-10 | DNA repair DREAM evidence | Field signal | `what_changed` |
| 2026-06-11 | Chaperone and heat-shock support | Context only | `current_context` |
| 2026-06-11 | Autophagy spermidine vaccine-response pilot | Field signal | `what_changed` |
| 2026-06-11 | Autophagy registry and review boundaries | Context only | Fold into autophagy or `trial_horizon` |
| 2026-06-11 | Immune rejuvenation boundaries | Outlook boundary | `what_changed` or `current_context` |
| 2026-06-11 | Rapalogs evidence read | Outlook boundary | `what_changed` |
| 2026-06-12 | Senolytics boundaries | Context only | `current_context` |
| 2026-06-12 | Partial reprogramming animal-to-human boundary | Context only | `current_context` |

## Candidate Public Copy Seed

Working summary: June made the longevity field broader and better bounded, with several narrow signals and clearer limits, but it did not make LEV look closer.

Working bottom line: LEV did not look closer after the reviewed June updates. A stronger read would still require repeated human studies showing long-lasting improvements in health or function.

Working `what_changed` set:

- Microbiome-related tracks added bounded human signals.
- Senomorphics gained a preclinical signal.
- DNA repair gained a stronger mechanism anchor.
- Autophagy induction gained a narrow human signal.
- Rapalogs and immune rejuvenation got clearer but mixed human reads.

## Trial Horizon Notes

The June 14 trial audit found 143 registry-linked interventional studies, 24 completed or past-completion records with no posted results, 69 stale or missing registry checks, and 4 open stale watchlist records. The final edition should avoid fresh registry-status claims unless the local reviewed record supports them or the stale status is explicit.

Candidate trials to review before finalizing:

- Spermidine elderly coronary artery disease registry
- Everolimus Aging geroprotection registry
- Sirolimus in Older Adults
- REVERSE rapamycin and ProLon registry
- Fisetin vascular function trial in older adults
- Rapa and cMRI older-adults registry
- Urolithin A frail older adult mitochondrial-quality registry study
- MIB-626 plus exercise phase 2 registry
- Nicotinamide riboside older Veterans muscle registry
- NMN middle-aged and elderly registry

## Publication Event Pool

Current-story events already carried forward:

- publish-transposon-and-somatic-mutation-control-coverage-repair-2026-06-06-2026-06-06t12-22-33-769z
- publish-stem-cell-replacement-and-transplantation-surveillance-2026-06-06-2026-06-07t13-49-41-422z
- publish-senomorphics-surveillance-2026-06-07-2026-06-07t16-41-34-635z
- publish-nad-and-redox-restoration-coverage-repair-2026-06-08-2026-06-09t10-39-49-637z
- publish-stem-cell-rejuvenation-coverage-repair-2026-06-09-2026-06-10t10-17-06-414z
- publish-mitophagy-enhancers-coverage-repair-2026-06-10-2026-06-10t14-26-07-178z
- publish-chaperone-and-heat-shock-support-coverage-repair-2026-06-10-2026-06-11t01-11-08-627z
- publish-autophagy-induction-surveillance-2026-06-11-2026-06-11t10-25-04-657z
- publish-senolytics-coverage-repair-2026-06-11-2026-06-12t00-05-23-406z
- publish-partial-reprogramming-coverage-repair-2026-06-12-2026-06-12t13-29-16-586z

Additional June events to consider before final publication:

- publish-live-biotherapeutics-and-engineered-microbes-surveillance-2026-06-06-2026-06-06t13-25-18-048z
- publish-microbiome-composition-modulation-surveillance-2026-06-03-2026-06-03t16-38-15-119z
- publish-dna-repair-enhancement-surveillance-2026-06-10-2026-06-10t17-34-21-637z
- publish-immune-rejuvenation-coverage-repair-2026-06-11-2026-06-11t13-12-57-339z
- publish-rapalogs-coverage-repair-2026-06-11-2026-06-11t18-24-35-790z
- publish-autophagy-induction-coverage-repair-2026-06-11-2026-06-11t11-44-04-048z

## Open Questions

- After June 30, decide which June public updates belong in `what_changed` versus `current_context`.
- Decide whether rapalogs should be a prominent June item.
- Re-check stale registry claims before writing final trial horizon copy.
- Run the narrative rollup after publishing the July edition if it becomes the current story's observed State of the Field edition.
