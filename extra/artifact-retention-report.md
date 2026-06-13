# Artifact Retention Report

Generated: 2026-06-13T16:18:32.984Z

This report classifies file-backed artifacts by retention role. It is non-destructive: it identifies pruning and compression candidates but does not delete or rewrite files.

## Summary

- Artifact roots scanned: data, research, ops, extra.
- Artifact files classified: 2867.
- Artifact footprint: 7.8 MB.
- Unclassified artifacts: 0.
- Active staged intermediate files: 0.
- Terminal staged intermediate files: 1200.
- Orphan staged intermediate files: 0.

## Retention Classes

| Class | Retention | Files | Size | Action |
| --- | --- | --- | --- | --- |
| Canonical Public Data | retain | 1241 | 2.1 MB | Keep as the reusable evidence graph and public content layer. |
| Terminal Staged Intermediate | compress_candidate | 1200 | 2.0 MB | Preserve now; later replace with a manifest/hash archive only after explicit review. |
| Publication Audit Trail | retain | 271 | 1.8 MB | Keep to explain review, approval, and publication history. |
| Research Session Logs | retain_then_summarize | 88 | 843 KB | Keep until source discovery and excluded-source rationale are synthesized elsewhere. |
| Current Coverage Synthesis | retain | 38 | 670 KB | Keep as the latest source-completeness judgment for each track. |
| Superseded Coverage Synthesis | compress_candidate | 16 | 232 KB | Keep for now; later summarize into the latest assessment revision history. |
| Generated Planning State | current_copy_only | 3 | 122 KB | Keep current files, but do not preserve old snapshots unless debugging a generation change. |
| Generated Reports | prunable_regenerable | 8 | 86 KB | Safe to delete or overwrite when stale because commands can regenerate them. |
| Handoff Artifacts | review | 1 | 1 KB | Keep only while they inform future implementation; promote into docs if durable. |
| Directory Markers | retain | 1 | 1 B | Keep when needed to preserve intentionally empty workflow directories. |

## Prunable Now

- 8 generated report file(s), 86 KB.
- Generated planning state should be overwritten in place, not preserved as dated snapshots.

## Compression Candidates

- 1200 terminal staged file(s), 2.0 MB.
- 16 superseded coverage assessment file(s), 232 KB.
- 14 no-op research session(s) and 3 activity-only session(s) could eventually be summarized into per-track review history.

## Staged Records

| Bundle Status | Staged File Count |
| --- | --- |
| published | 1200 |

## Research Sessions

| Outcome | Count |
| --- | --- |
| candidate_bundle_submitted | 54 |
| coverage_assessment_updated | 14 |
| no_op | 14 |
| activity_only | 3 |
| candidate_bundle_revised | 3 |

| Mode | Count |
| --- | --- |
| surveillance | 38 |
| bootstrap | 33 |
| coverage_repair | 17 |

## Superseded Coverage Assessments

| Track | Superseded Assessment Count |
| --- | --- |
| autophagy-induction | 1 |
| caloric-restriction-mimetics | 1 |
| chaperone-and-heat-shock-support | 1 |
| circulating-factor-modulation | 1 |
| dna-repair-enhancement | 1 |
| immune-rejuvenation | 1 |
| insulin-igf-axis-modulation | 1 |
| mitophagy-enhancers | 1 |
| nad-and-redox-restoration | 1 |
| neuroendocrine-and-systemic-signal-reset | 1 |
| partial-reprogramming | 1 |
| rapalogs | 1 |
| senolytics | 1 |
| stem-cell-rejuvenation | 1 |
| telomerase-restoration | 1 |
| transposon-and-somatic-mutation-control | 1 |

## Generated Reports

- extra/artifact-retention-report.md
- extra/current-lev-story-draft.json
- extra/current-lev-story-draft.md
- extra/data-sustainability-report.md
- extra/editorial-quality-report.md
- extra/public-copy-report.md
- extra/reader-task-audit.md
- extra/trial-watch-report.md

## Unclassified Artifacts

- None.
