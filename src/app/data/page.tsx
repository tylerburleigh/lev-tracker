import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Braces,
  CircleAlert,
  ClipboardList,
  Database,
  Download,
  FileJson,
  GitBranch,
  ListChecks,
  ShieldCheck
} from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getEvidenceMapExport, getOverallLastUpdated } from "@/lib/site-data";

const exportContractRows = [
  {
    field: "schema_url",
    meaning: "Stable public JSON Schema URL for validating the export shape."
  },
  {
    field: "dataset_card",
    meaning:
      "Machine-readable guidance for intended uses, unsuitable uses, interpretation rules, provenance, retrieval order, and limitations."
  },
  {
    field: "summary",
    meaning: "Top-level counts for hallmarks, tracks, sources, studies, findings, trials, and map coverage."
  },
  {
    field: "legends",
    meaning: "Machine-readable labels and plain meanings for stages, momentum, read firmness, coverage, and density."
  },
  {
    field: "hallmarks",
    meaning: "Hallmark taxonomy entries, public outlook summaries, track IDs, and page links."
  },
  {
    field: "tracks",
    meaning: "Track taxonomy entries with outlook ratings, coverage status, evidence counts, and supporting evidence IDs."
  },
  {
    field: "findings",
    meaning: "Atomic evidence statements with source, study, track, hallmark, evidence-tier, direction, and caveat IDs."
  },
  {
    field: "sources",
    meaning: "Bibliographic and registry source metadata used for provenance and source-level retrieval."
  },
  {
    field: "sources[].href / sources[].json_path",
    meaning: "Internal source audit page and source-level JSON graph for each cited paper, registry, or source record."
  },
  {
    field: "trials",
    meaning: "Registry-linked human trial summaries with watch status, result status, timing, and mapped tracks."
  }
] as const;

const useCards = [
  {
    title: "Knowledge-base context",
    summary:
      "Use the exports to retrieve the difference between outlook ratings, evidence strength, research density, and map completeness.",
    icon: Braces
  },
  {
    title: "Expert audit trail",
    summary:
      "Use stable IDs to trace track claims back to findings, studies, sources, trial status, and explicit coverage caveats.",
    icon: ShieldCheck
  },
  {
    title: "Reader guardrails",
    summary:
      "The export carries caveats with the data so downstream summaries do not treat a map rating as clinical proof.",
    icon: FileJson
  }
] as const;

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

const scopedExampleIds = ["senolytics", "rapalogs", "partial-reprogramming"] as const;

const workflowSteps = [
  "Start with the knowledge-base index to discover entity IDs and retrieval paths.",
  "Fetch the scoped track export.",
  "Read legends and caveats before interpreting labels.",
  "Inspect track.outlook and track.coverage together.",
  "Follow track.supporting_evidence[].finding_ids into findings.",
  "Resolve findings[].source_id in sources before citing or summarizing.",
  "Open sources[].json_path when you need the source-level provenance graph.",
  "Use gaps.tracks[].provenance.source_refs when auditing what could change a public rating.",
  "Use coverage_audit.tracks[].assessment to inspect how map coverage was judged.",
  "Use findings[].quality when a workflow needs limitation, study-design, or human-relevance labels before summarizing.",
  "Use conflicts.tracks[].patterns to avoid treating one positive result as field consensus.",
  "Use claim_guardrails.tracks[] before reusing high-level public summaries.",
  "Use claim_consistency_audit.issues[] to review public-copy drift against guardrails.",
  "Use claim_consistency_audit.issues[].resolution to separate new, recurring, fixed, and false-positive audit rows.",
  "Use claim_consistency_review_packet.groups[] when reviewers need grouped decisions instead of individual audit rows."
] as const;

const fieldPathRows = [
  {
    field: "/data/knowledge-base-index.json",
    meaning:
      "Manifest and entity directory for discovering hallmarks, tracks, interventions, studies, sources, findings, trials, claims, gaps, and review state."
  },
  {
    field: "track.outlook",
    meaning: "Current public read, stage, read firmness, evidence gaps, and rating-change criteria."
  },
  {
    field: "track.coverage",
    meaning: "Map completeness, map confidence, observed research density, and known gap counts."
  },
  {
    field: "track.supporting_evidence[].finding_ids",
    meaning: "IDs for the findings that support, limit, balance, or contextualize the public track read."
  },
  {
    field: "findings[].source_id",
    meaning: "Source-level provenance for each evidence statement."
  },
  {
    field: "/data/evidence-index.json",
    meaning: "Filterable finding-level index enriched with source, study, intervention, track, and coverage context."
  },
  {
    field: "/data/evidence-quality.json",
    meaning:
      "Derived quality and limitation layer for finding-level triage, with quality_class, study-design flags, human-relevance flags, and limitation tags."
  },
  {
    field: "/data/evidence-conflicts.json",
    meaning:
      "Track-level consistency, conflict, and replication map with pattern flags, direction counts, and finding clusters."
  },
  {
    field: "/data/claim-guardrails.json",
    meaning:
      "Track-level supported claims, unsupported claims, required caveats, and overclaim-risk labels for source-grounded summaries."
  },
  {
    field: "/data/claim-consistency-audit.json",
    meaning:
      "Editorial review queue that links potentially drifting public copy to track guardrails, source pages, backing record paths, and resolution metadata."
  },
  {
    field: "/data/claim-consistency-review-packet.json",
    meaning:
      "Grouped claim-audit decision packet with representative excerpts, priority scoring, and suggested resolution-ledger entries."
  },
  {
    field: "/data/evidence-gaps.json",
    meaning: "Track-level gap ledger with outlook gaps, rating-change criteria, coverage gaps, density, and trial horizons."
  },
  {
    field: "/data/coverage-audit.json",
    meaning: "Coverage-method provenance with assessment windows, search logs, reviewed artifacts, category coverage levels, and source-selection notes."
  },
  {
    field: "gaps.tracks[].provenance",
    meaning: "Trace paths from each gap row to outlook records, coverage assessments, scoped track exports, findings, source audits, and trial IDs."
  },
  {
    field: "coverage_audit.tracks[].method_class",
    meaning: "Clear distinction between source-discovery needs, review-due tracks, registry-watch tracks, likely field scarcity, and active mapped fields."
  },
  {
    field: "findings[].quality",
    meaning:
      "Heuristic classification metadata that keeps source quality, study context, limitations, and human relevance attached to each finding."
  },
  {
    field: "findings[].consistency_contexts",
    meaning:
      "Track-level consistency class and pattern labels attached to finding rows for retrieval and anti-cherrypicking filters."
  },
  {
    field: "claim_guardrails.tracks[].supported_claims / unsupported_claims",
    meaning: "Boundaries for what a downstream summary may say and what it must not imply."
  },
  {
    field: "claim_consistency_audit.issues[]",
    meaning:
      "Flagged source text, missing boundary terms, recommended edits, guardrail snapshots, and trace links for knowledge-base review."
  },
  {
    field: "claim_consistency_audit.issues[].fingerprint / resolution",
    meaning:
      "Stable issue key and reviewer-ledger status for tracking whether audit rows are new, recurring, fixed, accepted, deferred, or false positives."
  },
  {
    field: "claim_consistency_review_packet.groups[]",
    meaning:
      "Track, issue, source-record, and source-kind groups that collapse repeated audit rows into reviewer-sized decisions."
  },
  {
    field: "sources[].json_path",
    meaning: "Focused source audit export with linked findings, studies, track outlook links, and retrieval URLs."
  },
  {
    field: "trials[]",
    meaning: "Registry-linked trial context, watch status, result status, timing, and why it matters."
  }
] as const;

export default async function DataAccessPage() {
  const [lastUpdated, evidenceMap] = await Promise.all([getOverallLastUpdated(), getEvidenceMapExport()]);
  const { summary } = evidenceMap;
  const datasetCard = evidenceMap.dataset_card;
  const scopedExamples = scopedExampleIds
    .map((trackId) => evidenceMap.tracks.find((track) => track.id === trackId))
    .filter((track): track is NonNullable<typeof track> => Boolean(track));
  const statItems = [
    { label: "Hallmarks", value: summary.hallmark_count },
    { label: "Tracks", value: summary.track_count },
    { label: "Track outlooks", value: summary.track_outlook_count },
    { label: "Assessed maps", value: summary.coverage_assessed_track_count },
    { label: "Sources", value: summary.source_count },
    { label: "Studies", value: summary.study_count },
    { label: "Findings", value: summary.finding_count },
    { label: "Registry trials", value: summary.registry_linked_trial_count }
  ];

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Data"
        title="Knowledge-base data exports"
        summary="Compact JSON exports for researchers, auditors, and retrieval workflows that need the tracker as structured evidence-map context rather than page text."
      >
        <div className="data-hero-actions">
          <a className="action-button" href={evidenceMap.canonical_path}>
            <Download aria-hidden="true" size={16} />
            <span>Open JSON export</span>
          </a>
          <Link className="action-button action-button--secondary" href="/coverage">
            <Database aria-hidden="true" size={16} />
            <span>Coverage dashboard</span>
          </Link>
          <Link className="action-button action-button--secondary" href="/knowledge">
            <Braces aria-hidden="true" size={16} />
            <span>Knowledge browser</span>
          </Link>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell data-use-grid">
          {useCards.map(({ title, summary: cardSummary, icon: Icon }) => (
            <article className="data-use-card" key={title}>
              <Icon aria-hidden="true" size={18} />
              <h2>{title}</h2>
              <p>{cardSummary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell data-export-layout">
          <div className="data-export-main">
            <span className="section-kicker">Export snapshot</span>
            <h2>Structured for provenance, not persuasion</h2>
            <p>
              The file is built from public records and internal coverage-state summaries. Each track keeps evidence
              counts separate from coverage confidence so sparse research areas are not confused with weak curation.
            </p>
            <a className="section-link" href={evidenceMap.canonical_path}>
              <span>{evidenceMap.canonical_path}</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/knowledge-base-index.json">
              <span>Knowledge-base index JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <Link className="section-link" href="/knowledge">
              <span>Open knowledge browser</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="section-link" href="/coverage">
              <span>Open coverage dashboard</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="section-link" href="/evidence">
              <span>Open evidence explorer</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="section-link" href="/gaps">
              <span>Open gap ledger</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <a className="section-link" href="/data/evidence-index.json">
              <span>Evidence index JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-quality.json">
              <span>Evidence quality JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-conflicts.json">
              <span>Evidence conflicts JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/claim-guardrails.json">
              <span>Claim guardrails JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/claim-consistency-audit.json">
              <span>Claim consistency audit JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/claim-consistency-review-packet.json">
              <span>Claim review packet JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-gaps.json">
              <span>Evidence gaps JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/coverage-audit.json">
              <span>Coverage audit JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href={evidenceMap.schema_url}>
              <span>Full export schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/knowledge-base-index.schema.json">
              <span>Knowledge-base index schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href={datasetCard.schema_urls.scoped_track_export}>
              <span>Scoped export schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-index.schema.json">
              <span>Evidence index schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-quality.schema.json">
              <span>Evidence quality schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-conflicts.schema.json">
              <span>Evidence conflicts schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/claim-guardrails.schema.json">
              <span>Claim guardrails schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/claim-consistency-audit.schema.json">
              <span>Claim consistency audit schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/claim-consistency-review-packet.schema.json">
              <span>Claim review packet schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/evidence-gaps.schema.json">
              <span>Evidence gaps schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href="/data/coverage-audit.schema.json">
              <span>Coverage audit schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link" href={datasetCard.schema_urls.source_audit}>
              <span>Source audit schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="data-stat-grid" aria-label="Evidence-map export counts">
            {statItems.map((item) => (
              <div className="data-stat" key={item.label}>
                <span>{item.label}</span>
                <strong>{formatNumber(item.value)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell data-scoped-layout">
          <div className="data-scoped-main">
            <span className="section-kicker">Scoped exports</span>
            <h2>Load one track with its evidence context</h2>
            <p>
              Scoped exports keep the global legends and caveats, then return one track plus linked findings, studies,
              sources, interventions, and registry trials. They are meant for retrieval pipelines and focused expert
              audits that do not need the full dataset in memory.
            </p>
            <div className="data-endpoint-list">
              <a href="/data/evidence-map.json?track=senolytics">
                <strong>Query filter</strong>
                <span>/data/evidence-map.json?track=senolytics</span>
              </a>
              <a href="/data/tracks/senolytics.json">
                <strong>Track file URL</strong>
                <span>/data/tracks/senolytics.json</span>
              </a>
            </div>
          </div>
          <div className="data-scoped-grid">
            {scopedExamples.map((track) => (
              <a className="data-scoped-card" href={`/data/tracks/${track.id}.json`} key={track.id}>
                <strong>{track.name}</strong>
                <span>
                  {track.outlook?.stage_label ?? "Not rated"} /{" "}
                  {track.coverage?.coverage_verdict_label ?? "Map not assessed"}
                </span>
                <p>
                  {formatNumber(track.evidence_counts.finding_count)} findings,{" "}
                  {formatNumber(track.evidence_counts.study_count)} studies,{" "}
                  {formatNumber(track.evidence_counts.registry_linked_trial_count)} trials
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell data-usage-layout">
          <div className="data-usage-main">
            <span className="section-kicker">Usage examples</span>
            <h2>Follow labels back to evidence</h2>
            <p>
              The safest workflow is to retrieve a focused track package, interpret labels through the legends, then
              follow finding IDs to sources before using a claim in a summary, notebook, or retrieval pipeline.
            </p>
            <div className="data-command-list">
              {datasetCard.example_requests.map((request) => (
                <a href={request.path} key={request.path}>
                  <span>{request.label}</span>
                  <code>{`curl -s "$BASE_URL${request.path}"`}</code>
                  <p>{request.returns}</p>
                </a>
              ))}
            </div>
          </div>
          <div className="data-usage-panel">
            <article>
              <ClipboardList aria-hidden="true" size={18} />
              <h3>Retrieval workflow</h3>
              <ol>
                {workflowSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
            <article>
              <ListChecks aria-hidden="true" size={18} />
              <h3>Field paths to follow</h3>
              <div className="data-field-path-list">
                {fieldPathRows.map((row) => (
                  <div key={row.field}>
                    <code>{row.field}</code>
                    <p>{row.meaning}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell data-card-layout">
          <div className="data-card-main">
            <span className="section-kicker">Dataset card</span>
            <h2>{datasetCard.name}</h2>
            <p>{datasetCard.unit_of_analysis}</p>
            <div className="data-card-meta">
              <div>
                <span>Schema</span>
                <strong>{datasetCard.version}</strong>
              </div>
              <div>
                <span>Update cadence</span>
                <strong>{datasetCard.update_cadence}</strong>
              </div>
            </div>
          </div>
          <div className="data-card-grid">
            <article className="data-card-panel">
              <BookOpenCheck aria-hidden="true" size={18} />
              <h3>Intended uses</h3>
              <ul>
                {datasetCard.intended_uses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="data-card-panel">
              <CircleAlert aria-hidden="true" size={18} />
              <h3>Do not use it for</h3>
              <ul>
                {datasetCard.unsuitable_uses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="data-card-panel">
              <ListChecks aria-hidden="true" size={18} />
              <h3>Interpretation rules</h3>
              <ul>
                {datasetCard.interpretation_rules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="data-card-panel">
              <GitBranch aria-hidden="true" size={18} />
              <h3>Provenance model</h3>
              <ul>
                {datasetCard.provenance_model.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="data-card-panel">
              <Braces aria-hidden="true" size={18} />
              <h3>Retrieval order</h3>
              <ul>
                {datasetCard.recommended_retrieval_order.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="data-card-panel">
              <FileJson aria-hidden="true" size={18} />
              <h3>Known limitations</h3>
              <ul>
                {datasetCard.known_limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell data-contract">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">JSON contract</span>
              <h2>What the export contains</h2>
            </div>
            <span>Schema {evidenceMap.schema_version}</span>
          </div>
          <div className="expert-track-table-wrap">
            <table className="expert-track-table data-contract-table">
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {exportContractRows.map((row) => (
                  <tr key={row.field}>
                    <th scope="row">{row.field}</th>
                    <td>{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell report-duo">
          <section className="report-section-block">
            <span className="section-kicker">Caveats</span>
            <h2>Use the labels as map metadata</h2>
            <ul className="state-plain-list">
              {evidenceMap.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </section>
          <section className="report-section-block">
            <span className="section-kicker">Raw sources</span>
            <h2>Deeper records stay file-backed</h2>
            <p>
              The export lists source file patterns for raw records, coverage assessments, and taxonomy files so
              downstream tools can reconcile the compact snapshot against the repository source of truth.
            </p>
            <a className="section-link section-link--block" href={evidenceMap.canonical_path}>
              <span>Read export JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
