# Seed Track Taxonomy

## Purpose

This document defines the initial seeded track layer for the Hallmarks of Aging LEV Tracker.

The track layer exists between `hallmark` and `intervention`:

- `hallmark` is too broad to research or interpret as a single stream
- `intervention` is too narrow to organize the field
- `track` is the stable middle layer used by the public site, the admin workflow, and research automation

The machine-readable source of truth is [track-taxonomy.v1.json](../taxonomies/track-taxonomy.v1.json).

## What A Track Is

A track is:

- broader than one intervention
- narrower than a hallmark
- stable enough to revisit across many sessions
- useful for both evidence review and public explanation

Examples:

- `deregulated_nutrient_sensing / rapalogs`
- `cellular_senescence / senolytics`
- `epigenetic_alterations / partial_reprogramming`

## What A Track Is Not

A track is not:

- a single paper
- a single company
- a single product candidate
- a biomarker or assay by itself
- a funding or regulatory event

Those belong elsewhere in the model.

## Design Rules

The seeded taxonomy follows these rules:

1. Prefer research approaches that already recur across papers, trials, and public discourse.
2. Keep tracks legible to a serious non-expert.
3. Allow cross-hallmark links, but force one primary hallmark.
4. Avoid premature fragmentation when evidence is still thin.
5. Split a track later if it accumulates materially different mechanisms, evidence, or curator judgments.

## Governance

The track list is an editorial taxonomy, not a scientific consensus list. It should be stable enough for public readers and research automation, but it is allowed to change when the evidence map shows that the current boundaries are no longer doing useful work.

Track changes should be deliberate. Do not create, split, merge, rename, or retire a track as a side effect of ordinary source ingestion. Treat taxonomy changes as a separate decision that needs a written rationale and, when public records change, a `taxonomy_mapping` review lane.

### Discovery Triggers

A track taxonomy review is warranted when one or more of these signals appears:

- repeated papers, reviews, trials, registry records, or company programs describe a recurring approach that does not fit the current track list
- a broad track starts accumulating distinct sub-approaches with different search terms, safety questions, evidence maturity, or curator judgments
- a source-discovery or coverage-repair pass repeatedly excludes close sources because the current track boundary is too broad, too narrow, or pointed at the wrong hallmark
- a cross-hallmark intervention family becomes common enough that secondary hallmark links no longer explain the evidence cleanly
- a track becomes empty, stale, misleading, or better represented as an intervention, activity item, measurement method, or alias

### Boundary Test

A candidate track should pass all of these tests before it becomes public:

1. It is broader than one intervention, product, company, paper, assay, or funding event.
2. It is narrower than a hallmark and can be reviewed as one bounded evidence stream.
3. It has one primary hallmark, even if it also has secondary hallmark links.
4. It has recurring search language: names, aliases, exemplar interventions, or review terms that make future surveillance practical.
5. It is useful to readers: the grouping explains evidence better than listing isolated interventions.
6. It is useful to operations: one research pass can reasonably cover its baseline or field-change window.

### Change Types

- **Add:** introduce a new track when the boundary test passes and no existing track can absorb the evidence without becoming confusing.
- **Split:** divide a broad track when sub-approaches now have materially different evidence, risks, search terms, or public interpretation.
- **Merge:** combine tracks when evidence repeatedly treats them as one approach and separate pages would mostly duplicate each other.
- **Rename:** change a track name when public language, search terms, or field usage has shifted, while preserving aliases for old terms.
- **Retire:** remove a track from active public use when it is better modeled elsewhere or no longer supports meaningful review.

### Workflow

1. Record the trigger in the research session, coverage assessment, or candidate bundle that exposed the boundary problem.
2. Write a short taxonomy proposal with the proposed change type, rationale, primary hallmark, secondary hallmarks, affected track IDs, affected source/study/finding/outlook IDs, and migration notes.
3. Check the proposal against the boundary test and design rules above.
4. For additions or splits, define search aliases and exemplar interventions before publishing the new track.
5. For merges, renames, or retirements, preserve enough aliases or migration notes that old links, search terms, and audit history remain understandable.
6. Stage only the public records that need to change. If public links or outlook interpretation change, require `taxonomy_mapping` review before publishing.
7. After publication, run `npm run sync:research-planning` so queues, coverage status, and triage state use the new taxonomy.

### Review Cadence

Ordinary surveillance should flag taxonomy issues when they appear, but should not force taxonomy changes. Coverage repair is the preferred mode for resolving uncertain boundaries because it can inspect seminal anchors, recent reviews, null or limiting evidence, active trials, and excluded-source patterns without overclaiming public movement.

## Current Shape

Version `1.0.0` seeds 38 tracks across the 12 hallmarks.

### Genomic Instability

- DNA Repair Enhancement
- Genome Surveillance and Chromosome Stability
- Transposon and Somatic Mutation Control

### Telomere Attrition

- Telomerase Restoration
- Telomere Protection and Capping

### Epigenetic Alterations

- Partial Reprogramming
- DNA Methylation and Epigenome Restoration
- Chromatin and Histone Modulation

### Loss of Proteostasis

- Chaperone and Heat-Shock Support
- Proteasome Enhancement
- Protein Aggregate Clearance

### Disabled Macroautophagy

- Autophagy Induction
- Lysosomal Restoration
- Selective Autophagy and Organelle Quality Control

### Deregulated Nutrient Sensing

- Rapalogs
- AMPK and Metabolic Modulators
- Caloric Restriction Mimetics
- Insulin and IGF Axis Modulation

### Mitochondrial Dysfunction

- NAD and Redox Restoration
- Mitophagy Enhancers
- Mitochondrial Biogenesis and Dynamics
- Mitochondrial Delivery and Transplantation

### Cellular Senescence

- Senolytics
- Senomorphics
- Immune Clearance of Senescent Cells

### Stem Cell Exhaustion

- Stem Cell Rejuvenation
- Stem Cell Replacement and Transplantation
- Niche Rejuvenation and Support

### Altered Intercellular Communication

- Circulating Factor Modulation
- Extracellular Vesicle and Secretome Therapies
- Neuroendocrine and Systemic Signal Reset

### Chronic Inflammation

- Cytokine and Inflammasome Modulation
- Immune Rejuvenation
- Resolution Pathway and Tissue Repair

### Dysbiosis

- Microbiome Composition Modulation
- Live Biotherapeutics and Engineered Microbes
- Microbiome Metabolite Restoration
- Ecosystem Replacement

## How To Use It

- The public site should use this taxonomy to group interventions and findings under hallmark pages.
- Research automation should use track IDs as the main unit of search, session logging, and surveillance state.
- The curator should be able to split, merge, or retire tracks without changing the hallmark taxonomy.

## Expected Evolution

This seed list is not final. The most likely future changes are:

- splitting broad tracks such as `nad-and-redox-restoration`
- separating clinically active tracks from thinner speculative ones
- adding track-level outlooks where the evidence base becomes deep enough
- normalizing a cross-hallmark group of combination or systems interventions if it becomes necessary later
