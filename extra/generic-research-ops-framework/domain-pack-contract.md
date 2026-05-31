# Domain Pack Contract

## Purpose

A domain pack lets the framework run the same research operations workflow in a new field without hardcoding that field into the core app.

The domain pack should answer:

- What are the stable research units?
- What counts as evidence?
- What fields must be extracted?
- What review lanes are required?
- How should public claims be worded and bounded?
- What should agents read before acting?

## Required Files

```text
domain-packs/<domain-id>/
  domain.json
  taxonomy.v1.json
  evidence-ladder.v1.json
  extraction-schema.v1.json
  review-lanes.v1.json
  public-copy.v1.json
  skills/
    bootstrap.md
    surveillance.md
    evidence-review.md
    editorial-review.md
```

## `domain.json`

Suggested shape:

```json
{
  "id": "supplements",
  "name": "Supplement Evidence Research",
  "summary": "Evidence tracking for supplement benefits, risks, mechanisms, and longevity relevance.",
  "default_scope_unit": "topic",
  "taxonomy_file": "taxonomy.v1.json",
  "evidence_ladder_file": "evidence-ladder.v1.json",
  "default_review_lanes": [
    "source_fidelity",
    "benefit_interpretation",
    "safety_limitations",
    "taxonomy_mapping"
  ]
}
```

## Taxonomy

The taxonomy should define the stable units of work and navigation.

For supplements:

```text
category: metabolic health
  topic: berberine
  topic: creatine
  topic: omega-3
category: sleep and recovery
  topic: magnesium
  topic: glycine
```

For edtech synthetic student responses:

```text
category: validity and measurement
  topic: construct representation
  topic: score comparability
category: synthetic data generation
  topic: prompt-based response generation
  topic: fine-tuned response simulators
category: fairness and privacy
  topic: demographic fairness
  topic: disclosure and data leakage
```

Each topic should include:

- stable ID
- name
- summary
- aliases
- canonical order
- parent category
- example entities or methods
- scope notes

## Evidence Ladder

The evidence ladder is domain-specific.

The core framework should not assume the LEV ladder.

### Supplement Example

```text
mechanistic_plausibility
preclinical_or_ex_vivo_signal
human_biomarker_signal
human_symptom_or_function_signal
replicated_clinical_benefit
durable_benefit_with_safety_margin
```

### Edtech Synthetic-Response Example

```text
conceptual_rationale
prototype_generation
human_similarity_evidence
task_validity_evidence
score_or_inference_validity_evidence
multi-context_replication
operational_use_with_governance
```

Each stage should define:

- label
- description
- minimum support expected
- common overclaim risk
- what moves a claim to the next stage

## Extraction Schema

Each domain pack should specify fields that agent skills must extract.

### Supplement Fields

- compound or product family
- formulation
- dose
- route
- duration
- population
- comparator
- endpoint
- quantitative result
- adverse events
- interaction risk
- funding or conflicts
- directness to user question
- longevity relevance boundary

### Edtech Synthetic-Response Fields

- education domain
- learner population
- assessment type
- construct being represented
- model family
- generation method
- prompt or tuning strategy
- source data
- evaluation metric
- human comparison method
- validity evidence
- fairness evidence
- privacy or leakage concern
- intended research use
- boundary on operational use

## Review Lanes

Review lanes should be explicit and domain-configurable.

Core lanes worth preserving:

- `source_fidelity`: do source metadata and extracted facts match the cited source?
- `interpretation`: do findings support the public claim?
- `safety_limitations`: are risks, populations, endpoints, and caveats visible?
- `taxonomy_mapping`: are records mapped to the right domain topics?
- `forecast_calibration`: does the outlook avoid false precision or overreach?

Domain-specific lanes can be added.

Supplement-specific examples:

- `dose_formulation_boundary`
- `interaction_and_contraindication_risk`
- `human_relevance`

Edtech-specific examples:

- `validity_argument`
- `fairness_and_bias`
- `privacy_and_data_leakage`
- `construct_boundary`

## Public Copy

The domain pack should provide labels for public pages.

Examples:

- evidence layer label
- interpretation layer label
- forecast or recommendation layer label
- empty-state language
- stage labels
- confidence labels
- warning labels

Avoid encoding this copy only in React components.

## Agent Skill Overrides

Domain skills should not duplicate the core workflow. They should add domain discipline.

For example, a supplement bootstrap skill should say:

- extract dose and formulation before drafting a claim
- keep disease-treatment evidence separate from healthy-user benefit
- do not imply longevity benefit from a biomarker alone
- include interaction and adverse-event caveats near benefit claims

An edtech synthetic-response skill should say:

- identify the construct and intended inference before evaluating results
- separate surface similarity from validity evidence
- flag demographic fairness and data leakage risks
- do not generalize across grade bands, tasks, or scoring uses without evidence

