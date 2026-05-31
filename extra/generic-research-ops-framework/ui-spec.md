# UI Spec

## Product Shape

The app should be a research workbench with two surfaces:

- public evidence browser
- private admin review workspace

The public surface should be useful even if the admin workspace is never exposed.

## Public Navigation

Recommended top-level routes:

```text
/
/topics
/topics/[topicId]
/sources/[sourceId]
/artifacts/[artifactId]
/findings/[findingId]
/claims/[claimId]
/activity
/methods
/state-of-the-field
/state-of-the-field/[editionSlug]
```

If the domain has important entities, add routes:

```text
/interventions/[interventionId]
/models/[modelId]
/datasets/[datasetId]
/products/[productId]
```

## Public Homepage

Job:

Give a fast answer to:

- What is the current state of this domain?
- Which topics are covered?
- What changed recently?
- Why should the reader trust the claims?

Sections:

1. Overall domain outlook or summary
2. Topic coverage grid
3. Recent public changes
4. Methods/trust notes
5. Optional scenario or forecast panel

## Topic Detail Page

Job:

Explain one bounded topic with evidence, interpretation, and uncertainty visible.

Sections:

1. Topic summary
2. Current claim or outlook
3. Evidence ladder
4. Support-map cards
5. Findings inventory
6. Related artifacts/studies
7. Sources
8. Recent activity
9. Rating-change criteria

Support-map cards should show:

- rationale label
- conclusion
- support role
- linked findings
- linked sources
- limitations

## Finding Detail Page

Job:

Let a reader inspect one atomic claim.

Fields:

- statement
- source
- artifact/study
- endpoint
- direction
- evidence tier
- confidence
- population or context
- quantitative note
- caveats
- linked public claims

## Methods Page

Job:

Explain the trust model.

Required content:

- evidence vs interpretation vs forecast
- source inclusion rules
- review process
- evidence ladder
- confidence labels
- how updates happen
- what the app is not

## Admin Review Queue

Route:

```text
/admin/review
```

Show:

- bundle status
- scope
- intake mode
- submitted date
- revision number
- required review lanes
- missing lanes
- blocking findings
- promotion readiness
- proposed change count

## Bundle Detail Page

Route:

```text
/admin/review/[bundleId]
```

Show:

- proposed changes
- staged file paths
- target file paths
- scope question
- evidence-review status
- promotion readiness
- review comments
- evidence reviews and findings
- publication events
- approve/publish controls

Actions:

- start review
- request changes
- approve
- reject
- publish
- add comment

## UI Principles

- Make evidence inspectable before asking users to trust conclusions.
- Keep activity visually separate from evidence.
- Keep forecast or recommendation language visibly separate from source facts.
- Show uncertainty near the claim it qualifies.
- Prefer dense, scannable operational UI over marketing-style pages.
- Do not hide staged/public distinction in admin views.

## Empty States

Empty states should distinguish:

- no taxonomy node exists
- taxonomy node exists but has no baseline coverage
- baseline exists but no recent activity
- source exists but no extracted findings yet
- bundle exists but evidence review is missing

This matters because "not researched yet" is different from "researched and no signal found."

