# Source Ingestion Rules

This document defines the default rules for adding `source` records during bootstrap, surveillance, and manual curator work. Source records are citation anchors. Interpretation belongs in `finding`, `outlook`, `candidate_bundle`, and `evidence_review` records.

## General Rules

- Add one `source` record per canonical source.
- Use stable IDs:
  - PubMed articles: `pmid-<digits>`
  - ClinicalTrials.gov records: `nct-<digits>`
  - Manual sources without a stable identifier: `<issuer-or-venue>-<short-topic>-<yyyy-mm-dd>`
- Use the closest schema `source_type`: `journal_article`, `review`, `preprint`, `trial_registry`, `company_update`, `regulatory_filing`, `database`, `conference_abstract`, or `other`.
- Keep `name` close to the source title. Use `short_name` for curator-friendly labels.
- Keep `summary` factual and bounded to what the source is. Do not put outcome interpretation, rating movement, or outlook language in the source summary.
- Use `authors` for paper authors, trial sponsors, database stewards, companies, or agencies.
- Use `venue` for the journal, registry, agency page, company site, database, or meeting.
- Use `year` for the publication, posting, registration, or announcement year.
- Use `published_on` only when the source gives a day-level date. Do not coerce month-only, quarter-only, or year-only dates into fake day-level dates.
- Put canonical URLs first, then DOI or secondary full-text URLs when useful.
- Use tags for track IDs, intervention names, source class, and important modalities.

## PubMed

For PubMed-indexed literature:

- Set `source_type` to `journal_article` unless the source is clearly a `review`.
- Set `id` to `pmid-<digits>` and `pmid` to the numeric PMID string.
- Use the PubMed article title as `name`.
- Use the journal name as `venue`.
- Add DOI when present.
- Include the PubMed URL. Include the DOI URL when present.
- If a full-text PMC page is used to verify details not visible in the PubMed abstract, include that URL as an additional URL and make the evidence review explicit about which claims came from full text.
- Keep study design, population, model system, sample size, and endpoints in linked `study` records when the source supports a study-level record.
- Keep each extracted claim atomic in linked `finding` records.

## ClinicalTrials.gov

For ClinicalTrials.gov records:

- Set `source_type` to `trial_registry`.
- Set `id` to the lowercase NCT slug, such as `nct-05021835`.
- Put the uppercase NCT identifier in `registry_ids`.
- Use the public registry title as `name`.
- Use the responsible party, sponsor, or collaborators in `authors`.
- Set `venue` to `ClinicalTrials.gov`.
- Use the first posted or submitted year for `year` when available.
- Use `published_on` only when the registry gives a day-level first-posted date.
- Include the canonical `https://clinicaltrials.gov/study/<NCTID>` URL.
- Because registry status can change, include an as-of date in `summary` whenever recruitment status, posted results, or last-update timing is material.
- Create or update a linked `study` record when the registry describes a trial relevant to the public evidence layer.
- Do not create a positive or negative `finding` from a registry entry unless the registry has posted results or another linked source reports results.

## Manual Curator Sources

Manual source records are acceptable for official or otherwise useful sources that are not PubMed articles or trial registries, including regulatory announcements, company updates, conference abstracts, databases, and primary documents.

- Prefer the most specific `source_type` over `other`.
- Use the issuing organization or venue in `authors`.
- Include a day-level `published_on` date when the page or document provides one.
- Make the source ID include the issuer and date when no durable external identifier exists.
- Use the original source URL rather than a press aggregator or secondary summary.
- Keep the source summary descriptive: what the document is, who issued it, and what record or announcement it anchors.
- Put curator interpretation in linked `finding` records or in the staged update rationale, not in the source record.

## Candidate Bundle Checks

Before submitting or publishing a bundle that adds sources:

1. Every new source appears in `source_ids`, `source_urls`, and `proposed_changes`.
2. Every linked `study` and `finding` references the relevant `source_id`.
3. Time-sensitive registry, regulatory, and company claims include an as-of or publication date.
4. Source-fidelity evidence review checks titles, identifiers, URLs, dates, population/model boundaries, endpoint language, and quantitative claims.
5. `npm run validate:records` passes after staged or promoted source records are added.
