# Staged Archive Readiness Report

Generated: 2026-06-14T10:28:10.613Z

This report compares terminal staged records against current live target files. It is non-destructive: it decides whether manifest-only archival would preserve enough, or whether some staged JSON bodies still need to be retained.

## Verdict

- Verdict: `retain_changed_staged_bodies`
- Recommendation: Do not use manifest-only archival. Retain full staged bodies for staged files that differ from current live targets or lack live targets; manifest-only is adequate only for identical staged files.

## Summary

- Staged files checked: 1200
- Identical to current live target: 1008 (84.0%)
- Different from current live target: 192
- Missing live target: 0
- Missing staged file: 0
- Manifest drift entries: 0
- Staged body bytes checked: 2.0 MB
- Staged bodies requiring retention: 192 file(s), 599 KB
- Pruned staged bodies reconstructed from live targets: 1008
- Manifest source: data/staged-record-manifests/terminal-bundles.v1.json

## Status Counts

| Status | Count |
| --- | --- |
| identical_to_live | 1008 |
| differs_from_live | 192 |

## Legacy Unstaged Changes

| Status | Count |
| --- | --- |
| legacy_unstaged_live_target | 4 |
| legacy_unstaged_missing_target | 1 |

## Record Types

| Record Type | Staged File Count |
| --- | --- |
| finding | 366 |
| source | 354 |
| study | 351 |
| intervention | 71 |
| outlook | 54 |
| activity_item | 4 |

## Bundles With Changed Staged Bodies

| Bundle | Differing Staged File Count |
| --- | --- |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | 12 |
| selective-autophagy-and-organelle-quality-control-bootstrap-2026-06-02 | 12 |
| circulating-factor-modulation-bootstrap-2026-05-31 | 10 |
| microbiome-metabolite-restoration-bootstrap-2026-06-02 | 9 |
| nad-and-redox-restoration-bootstrap-2026-05-31 | 9 |
| protein-aggregate-clearance-bootstrap-2026-06-02 | 9 |
| stem-cell-replacement-and-transplantation-bootstrap-2026-06-01 | 9 |
| cytokine-and-inflammasome-modulation-bootstrap-2026-05-31 | 8 |
| live-biotherapeutics-and-engineered-microbes-bootstrap-2026-06-01 | 8 |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | 7 |
| dna-repair-enhancement-bootstrap-2026-05-31 | 7 |
| senomorphics-bootstrap-2026-06-01 | 7 |
| transposon-and-somatic-mutation-control-coverage-repair-2026-06-06 | 7 |
| dna-methylation-and-epigenome-restoration-bootstrap-2026-05-31 | 6 |
| extracellular-vesicle-and-secretome-therapies-bootstrap-2026-06-01 | 5 |
| mitochondrial-biogenesis-and-dynamics-bootstrap-2026-06-02 | 5 |
| resolution-pathway-and-tissue-repair-bootstrap-2026-06-02 | 5 |
| chaperone-and-heat-shock-support-bootstrap-2026-05-31 | 4 |
| ecosystem-replacement-bootstrap-2026-06-03 | 4 |
| lysosomal-restoration-bootstrap-2026-06-01 | 4 |

## Differing Examples

| Bundle | Change | Type | Record | Status | Path |
| --- | --- | --- | --- | --- | --- |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-anthem-metformin-aging-study | study | anthem-metformin-aging-study | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/anthem-metformin-aging-study.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-berberine-aged-rat-ampk-muscle-cognition | study | berberine-aged-rat-ampk-muscle-cognition | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/berberine-aged-rat-ampk-muscle-cognition.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-finding-berberine-improved-aged-rat-cognition-muscle-ampk-signaling | finding | berberine-improved-aged-rat-cognition-muscle-ampk-signaling | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/berberine-improved-aged-rat-cognition-muscle-ampk-signaling.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-intervention-berberine | intervention | berberine | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/berberine.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-met-prevent-metformin-sarcopenia-frailty | study | met-prevent-metformin-sarcopenia-frailty | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/met-prevent-metformin-sarcopenia-frailty.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-metforaging-metformin-hiv-epigenetic-age | study | metforaging-metformin-hiv-epigenetic-age | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/metforaging-metformin-hiv-epigenetic-age.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-metformin-aerobic-exercise-older-adults | study | metformin-aerobic-exercise-older-adults | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/metformin-aerobic-exercise-older-adults.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-finding-metformin-blunted-exercise-mitochondrial-adaptations-older-adults | finding | metformin-blunted-exercise-mitochondrial-adaptations-older-adults | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/metformin-blunted-exercise-mitochondrial-adaptations-older-adults.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-metformin-frailty-prevention-high-risk-older-adults | study | metformin-frailty-prevention-high-risk-older-adults | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/metformin-frailty-prevention-high-risk-older-adults.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-intervention-metformin | intervention | metformin | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/metformin.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-study-miles-metformin-older-adults-transcriptomics | study | miles-metformin-older-adults-transcriptomics | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/miles-metformin-older-adults-transcriptomics.json |
| ampk-and-metabolic-modulators-bootstrap-2026-06-01 | create-track-ampk-and-metabolic-modulators-outlook | outlook | track-ampk-and-metabolic-modulators-outlook | differs_from_live | data/staged-records/ampk-and-metabolic-modulators-bootstrap-2026-06-01/track-ampk-and-metabolic-modulators-outlook.json |
| autophagy-induction-surveillance-2026-06-11 | update-outlook-track-autophagy-induction | outlook | track-autophagy-induction-outlook | differs_from_live | data/staged-records/autophagy-induction-surveillance-2026-06-11/track-autophagy-induction-outlook.json |
| autophagy-induction-track-scan-2026-05-30 | create-autophagy-induction-outlook | outlook | track-autophagy-induction-outlook | differs_from_live | data/staged-records/autophagy-induction-track-scan-2026-05-30/track-autophagy-induction-outlook.json |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | create-finding-acarbose-extended-het3-mouse-lifespan-sex-dependent | finding | acarbose-extended-het3-mouse-lifespan-sex-dependent | differs_from_live | data/staged-records/caloric-restriction-mimetics-bootstrap-2026-06-02/acarbose-extended-het3-mouse-lifespan-sex-dependent.json |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | create-study-acarbose-het3-mouse-lifespan-dose-study | study | acarbose-het3-mouse-lifespan-dose-study | differs_from_live | data/staged-records/caloric-restriction-mimetics-bootstrap-2026-06-02/acarbose-het3-mouse-lifespan-dose-study.json |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | create-intervention-acarbose | intervention | acarbose | differs_from_live | data/staged-records/caloric-restriction-mimetics-bootstrap-2026-06-02/acarbose.json |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | create-study-fmd-aging-risk-factor-rct | study | fmd-aging-risk-factor-rct | differs_from_live | data/staged-records/caloric-restriction-mimetics-bootstrap-2026-06-02/fmd-aging-risk-factor-rct.json |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | create-study-fmd-biological-age-risk-marker-analysis | study | fmd-biological-age-risk-marker-analysis | differs_from_live | data/staged-records/caloric-restriction-mimetics-bootstrap-2026-06-02/fmd-biological-age-risk-marker-analysis.json |
| caloric-restriction-mimetics-bootstrap-2026-06-02 | create-finding-fmd-reduced-aging-risk-markers-rct | finding | fmd-reduced-aging-risk-markers-rct | differs_from_live | data/staged-records/caloric-restriction-mimetics-bootstrap-2026-06-02/fmd-reduced-aging-risk-markers-rct.json |

## Missing Examples

- None.

## Manifest Drift

- None.



## Legacy Examples

| Bundle | Change | Type | Record | Status | Path |
| --- | --- | --- | --- | --- | --- |
| mitophagy-track-scan-2026-05-24 | update-mitophagy-outlook | outlook | track-mitophagy-enhancers-outlook | legacy_unstaged_live_target | data/outlooks/track-mitophagy-enhancers-outlook.json |
| rapalogs-update-2026-05-30 | add-trial-update-activity-item | activity_item | sirolimus-older-adults-trial-update | legacy_unstaged_live_target | data/activity-items/sirolimus-older-adults-trial-update.json |
| rapalogs-update-2026-05-30 | update-rapalogs-outlook | outlook | track-rapalogs-outlook | legacy_unstaged_live_target | data/outlooks/track-rapalogs-outlook.json |
| senescence-watch-update-2026-05-25 | create-senescence-activity | activity_item | senescence-trial-watch-expansion | legacy_unstaged_missing_target | data/activity-items/senescence-trial-watch-expansion.json |
| senescence-watch-update-2026-05-25 | update-senescence-outlook | outlook | hallmark-cellular-senescence-outlook | legacy_unstaged_live_target | data/outlooks/hallmark-cellular-senescence-outlook.json |
