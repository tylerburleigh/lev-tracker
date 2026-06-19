import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Braces,
  CircleAlert,
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
    field: "trials",
    meaning: "Registry-linked human trial summaries with watch status, result status, timing, and mapped tracks."
  }
] as const;

const useCards = [
  {
    title: "Model-readable context",
    summary:
      "Use the export to teach systems the difference between outlook ratings, evidence strength, research density, and map completeness.",
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
        title="Machine-readable evidence map"
        summary="A compact JSON export for researchers, auditors, and language-model workflows that need the tracker as structured evidence-map context rather than page text."
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
            <Link className="section-link" href="/coverage">
              <span>Open coverage dashboard</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
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
