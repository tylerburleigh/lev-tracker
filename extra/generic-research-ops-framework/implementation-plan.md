# Implementation Plan

## Phase 1: Extract The Core Workflow

Goal:

Create a domain-neutral file-backed framework with one sample domain.

Tasks:

- Define core schemas for source, artifact, finding, claim, activity item, research session, candidate bundle, evidence review, review comment, publication event, coverage state, and priority queue.
- Port bundle validation from the LEV repo into domain-neutral names.
- Port evidence-review scaffold/apply workflow.
- Port planning-state sync.
- Keep JSON files as the storage layer.

Acceptance criteria:

- A sample domain can create a candidate bundle with staged records.
- Bundle validation catches broken paths, wrong record IDs, missing references, and missing support maps.
- Evidence-review records can be scaffolded and applied.
- Publication promotes staged records and writes a publication event.

## Phase 2: Domain Pack Loader

Goal:

Make the framework configurable through a domain pack.

Tasks:

- Load `domain.json`, taxonomy, evidence ladder, review lanes, and public copy.
- Expose domain config through the app data layer.
- Make route labels and stage labels domain-driven.
- Make required review lanes domain-driven.

Acceptance criteria:

- The same app can run a supplement domain pack without editing core workflow code.
- The same app can run an edtech synthetic-response domain pack without editing core workflow code.

## Phase 3: Public Evidence Browser

Goal:

Build the inspectable public surface.

Tasks:

- Homepage with domain outlook, topic coverage, recent changes, trust notes.
- Topic index and topic detail pages.
- Source, artifact, finding, and claim detail pages.
- Activity feed.
- Methods page generated partly from domain pack.

Acceptance criteria:

- A user can navigate from a public claim to findings, artifacts, and sources.
- Topic pages show evidence basis and limitations.
- Activity is not presented as proof.

## Phase 4: Admin Review Workspace

Goal:

Build the private curation surface.

Tasks:

- Candidate bundle queue.
- Bundle detail page.
- Promotion readiness display.
- Evidence-review readiness display.
- Comment form.
- Approve, reject, request changes, publish actions.

Acceptance criteria:

- A curator can publish a valid reviewed bundle without using the command line.
- Publish is blocked when evidence gates or promotion checks fail.
- Published bundles produce publication events.

## Phase 5: Agent Skills

Goal:

Provide agent-operable workflows.

Tasks:

- Create core skills:
  - bootstrap
  - surveillance
  - evidence review
  - editorial review
- Create domain adapters for supplements and edtech synthetic responses.
- Add read-first lists and bounded workflow rules.

Acceptance criteria:

- An agent can bootstrap one topic into a candidate bundle.
- A second pass can review source fidelity.
- A third pass can review interpretation.
- A curator or editorial agent can publish after gates pass.

## Phase 6: Validation Hardening

Goal:

Make the framework reliable enough for repeated use.

Tasks:

- Add broad schema validation for all JSON records.
- Add support-map validation for claims.
- Add taxonomy-reference validation.
- Add stale-coverage detection.
- Add smoke checks for affected routes.

Acceptance criteria:

- `npm run validate` catches schema and cross-reference issues.
- `npm run build` passes with sample domain data.
- Published public routes render expected topic labels and claim text.

## Phase 7: Optional Database Migration

Do not start here.

Only migrate to SQLite or Postgres after:

- record shapes stabilize
- admin workflow is proven
- multiple domains or many records make file-backed operation painful

Even after a database migration, keep exportable JSON snapshots for review and agent workflows.

## First Build Recommendation

Build the generic framework by porting from the current LEV repo, not by starting from scratch.

Suggested first target:

1. Rename LEV-specific concepts to domain-neutral concepts.
2. Keep the candidate bundle and evidence-review CLI logic.
3. Keep the Next.js app structure.
4. Add a domain-pack loader.
5. Implement one small supplement pack as the first proof.
6. Implement one small edtech synthetic-response pack as the second proof.

If both packs work without changing core workflow code, the architecture is probably correctly separated.

