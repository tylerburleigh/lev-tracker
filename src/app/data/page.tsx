import Link from "next/link";
import { ArrowRight, Braces, Database, Download, FileJson, ShieldCheck } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getEvidenceMapExport, getOverallLastUpdated } from "@/lib/site-data";

const exportContractRows = [
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

export default async function DataAccessPage() {
  const [lastUpdated, evidenceMap] = await Promise.all([getOverallLastUpdated(), getEvidenceMapExport()]);
  const { summary } = evidenceMap;
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
          <Link className="action-button action-button--secondary" href="/tracks">
            <Database aria-hidden="true" size={16} />
            <span>Compare tracks</span>
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
