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
