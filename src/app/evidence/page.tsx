import Link from "next/link";
import { ArrowRight, Database, Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { type EvidenceIndexFilters, getEvidenceIndexExport, getOverallLastUpdated } from "@/lib/site-data";

type EvidenceSearchParams = {
  q?: string | string[];
  hallmark?: string | string[];
  track?: string | string[];
  intervention?: string | string[];
  tier?: string | string[];
  direction?: string | string[];
  confidence?: string | string[];
  endpoint?: string | string[];
  source_type?: string | string[];
  species?: string | string[];
  source_reuse?: string | string[];
  coverage_confidence?: string | string[];
  quality_class?: string | string[];
  limitation?: string | string[];
  human_relevance?: string | string[];
  sort?: string | string[];
};

type EvidenceExplorerPageProps = {
  searchParams?: Promise<EvidenceSearchParams>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getEvidenceFilters(searchParams: EvidenceSearchParams): EvidenceIndexFilters {
  return {
    q: getSingleSearchParam(searchParams.q).trim(),
    hallmark: getSingleSearchParam(searchParams.hallmark),
    track: getSingleSearchParam(searchParams.track),
    intervention: getSingleSearchParam(searchParams.intervention),
    tier: getSingleSearchParam(searchParams.tier),
    direction: getSingleSearchParam(searchParams.direction),
    confidence: getSingleSearchParam(searchParams.confidence) as EvidenceIndexFilters["confidence"],
    endpoint: getSingleSearchParam(searchParams.endpoint),
    source_type: getSingleSearchParam(searchParams.source_type),
    species: getSingleSearchParam(searchParams.species) as EvidenceIndexFilters["species"],
    source_reuse: getSingleSearchParam(searchParams.source_reuse) as EvidenceIndexFilters["source_reuse"],
    coverage_confidence: getSingleSearchParam(
      searchParams.coverage_confidence
    ) as EvidenceIndexFilters["coverage_confidence"],
    quality_class: getSingleSearchParam(searchParams.quality_class) as EvidenceIndexFilters["quality_class"],
    limitation: getSingleSearchParam(searchParams.limitation) as EvidenceIndexFilters["limitation"],
    human_relevance: getSingleSearchParam(searchParams.human_relevance) as EvidenceIndexFilters["human_relevance"],
    sort: getSingleSearchParam(searchParams.sort) as EvidenceIndexFilters["sort"]
  };
}

function visibleList(values: string[], limit = 2) {
  if (values.length <= limit) {
    return values.join(" / ");
  }

  return `${values.slice(0, limit).join(" / ")} +${values.length - limit}`;
}

export default async function EvidenceExplorerPage({ searchParams }: EvidenceExplorerPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = getEvidenceFilters(resolvedSearchParams);
  const [lastUpdated, evidenceIndex] = await Promise.all([
    getOverallLastUpdated(),
    getEvidenceIndexExport(selected)
  ]);
  const { facet_options: facets, summary } = evidenceIndex;

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Evidence"
        title="Cross-cutting evidence explorer"
        summary="A finding-level ledger for scanning evidence statements across hallmarks, tracks, interventions, sources, and coverage context."
      >
        <div className="page-hero__stats">
          <span>{summary.total_finding_count} findings</span>
          <span>{summary.filtered_finding_count} matching</span>
          <span>{summary.human_finding_count} human</span>
          <span>{summary.animal_finding_count} animal</span>
          <span>{summary.source_count} sources</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell data-scoped-layout">
          <div className="data-scoped-main">
            <span className="section-kicker">Saved views</span>
            <h2>Reusable research cuts</h2>
            <p>
              These views expose common expert queries without flattening caveats or replacing source review.
            </p>
            <a className="section-link section-link--block" href={evidenceIndex.canonical_path}>
              <Database aria-hidden="true" size={16} />
              <span>Open matching JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="data-scoped-grid evidence-view-grid">
            {evidenceIndex.saved_views.map((view) => (
              <Link className="data-scoped-card" href={view.path} key={view.id}>
                <strong>{view.label}</strong>
                <span>{view.kind === "evidence" ? "Evidence view" : "Trial view"}</span>
                <p>{view.count} records</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell track-search evidence-search">
          <form className="track-search__form evidence-search__form" action="/evidence">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Finding, source, intervention, endpoint, caveat"
                  defaultValue={selected.q}
                />
              </div>
            </label>
            <label className="track-search__field">
              <span>Hallmark</span>
              <select name="hallmark" defaultValue={selected.hallmark}>
                <option value="">All hallmarks</option>
                {facets.hallmarks.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Track</span>
              <select name="track" defaultValue={selected.track}>
                <option value="">All tracks</option>
                {facets.tracks.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Intervention</span>
              <select name="intervention" defaultValue={selected.intervention}>
                <option value="">All interventions</option>
                {facets.interventions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Tier</span>
              <select name="tier" defaultValue={selected.tier}>
                <option value="">All evidence tiers</option>
                {facets.evidence_tiers.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Direction</span>
              <select name="direction" defaultValue={selected.direction}>
                <option value="">All directions</option>
                {facets.directions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Confidence</span>
              <select name="confidence" defaultValue={selected.confidence}>
                <option value="">All confidence</option>
                {facets.confidences.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Endpoint</span>
              <select name="endpoint" defaultValue={selected.endpoint}>
                <option value="">All endpoints</option>
                {facets.endpoints.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Source</span>
              <select name="source_type" defaultValue={selected.source_type}>
                <option value="">All source types</option>
                {facets.source_types.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Species</span>
              <select name="species" defaultValue={selected.species}>
                <option value="">All species context</option>
                {facets.species.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Coverage</span>
              <select name="coverage_confidence" defaultValue={selected.coverage_confidence}>
                <option value="">All coverage confidence</option>
                {facets.coverage_confidences.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Quality</span>
              <select name="quality_class" defaultValue={selected.quality_class}>
                <option value="">All quality classes</option>
                {facets.quality_classes.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Limitation</span>
              <select name="limitation" defaultValue={selected.limitation}>
                <option value="">All limitation tags</option>
                {facets.limitations.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Human relevance</span>
              <select name="human_relevance" defaultValue={selected.human_relevance}>
                <option value="">All relevance flags</option>
                {facets.human_relevance.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Reuse</span>
              <select name="source_reuse" defaultValue={selected.source_reuse}>
                <option value="">All source reuse</option>
                {facets.source_reuse.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Sort</span>
              <select name="sort" defaultValue={selected.sort || "strength"}>
                {facets.sorts.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="track-search__actions">
              <button className="action-button" type="submit">
                <Search aria-hidden="true" size={16} />
                <span>Apply</span>
              </button>
              <Link className="action-button action-button--secondary" href="/evidence">
                <X aria-hidden="true" size={16} />
                <span>Reset</span>
              </Link>
            </div>
          </form>
          <div className="track-search__summary" aria-live="polite">
            <strong>{summary.filtered_finding_count}</strong>
            <span>of {summary.total_finding_count} findings</span>
          </div>
        </div>

        <div className="page-shell expert-track-scan">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Finding ledger</span>
              <h2>{summary.returned_finding_count} evidence statements</h2>
            </div>
            <a className="section-link" href={evidenceIndex.canonical_path}>
              <span>Filtered JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="expert-track-table-wrap">
            <table className="expert-track-table evidence-index-table">
              <thead>
                <tr>
                  <th scope="col">Finding</th>
                  <th scope="col">Evidence</th>
                  <th scope="col">Biology</th>
                  <th scope="col">Source</th>
                  <th scope="col">Quality</th>
                  <th scope="col">Caveats</th>
                </tr>
              </thead>
              <tbody>
                {evidenceIndex.findings.map((finding) => (
                  <tr key={finding.id}>
                    <th scope="row">
                      <Link href={finding.href}>
                        <strong>{finding.name}</strong>
                        <span>{finding.endpoint_category_label}</span>
                      </Link>
                      <p>{finding.statement}</p>
                    </th>
                    <td>
                      {finding.evidence_tier_label}
                      <span>{finding.direction_label}</span>
                      <span>{finding.read_firmness_label}</span>
                      <span>{finding.species_label}</span>
                    </td>
                    <td>
                      {finding.track_contexts.length ? (
                        <div className="evidence-index-link-list">
                          {finding.track_contexts.slice(0, 3).map((track) => (
                            <Link className="mini-link" href={track.href} key={track.id}>
                              {track.name}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        "No track"
                      )}
                      <span>{visibleList(finding.hallmarks.map((hallmark) => hallmark.name), 2)}</span>
                      {finding.interventions.length ? (
                        <span>{visibleList(finding.interventions.map((intervention) => intervention.name), 2)}</span>
                      ) : null}
                    </td>
                    <td>
                      {finding.source ? (
                        <Link href={finding.source.href}>
                          <strong>{finding.source.short_name ?? finding.source.name}</strong>
                          <span>{finding.source_type_label ?? finding.source.source_type}</span>
                        </Link>
                      ) : (
                        finding.source_id
                      )}
                      {finding.study ? (
                        <Link className="mini-link" href={`/studies/${finding.study.id}`}>
                          {finding.study.name}
                        </Link>
                      ) : null}
                      {finding.source_reuse_track_count > 1 ? (
                        <span>{finding.source_reuse_track_count} track source</span>
                      ) : null}
                    </td>
                    <td className="evidence-quality-cell">
                      <strong>{finding.quality.quality_class_label}</strong>
                      <span>{finding.quality.quality_class_reason}</span>
                      {finding.quality.limitation_labels.length ? (
                        <div className="evidence-quality-tags">
                          {finding.quality.limitation_labels.slice(0, 3).map((label) => (
                            <span className="evidence-chip evidence-chip--gold" key={label}>
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>No limitation tag</span>
                      )}
                    </td>
                    <td>
                      {finding.caveats.length ? (
                        <ul className="evidence-index-caveats">
                          {finding.caveats.slice(0, 2).map((caveat) => (
                            <li key={caveat}>{caveat}</li>
                          ))}
                        </ul>
                      ) : (
                        "No caveat recorded"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!evidenceIndex.findings.length ? (
            <div className="tracks-table__empty">
              <strong>No findings match those filters.</strong>
              <Link className="mini-link" href="/evidence">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
