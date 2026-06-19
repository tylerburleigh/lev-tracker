import Link from "next/link";
import { ArrowRight, Database, Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { type EvidenceGapFilters, getEvidenceGapsExport, getOverallLastUpdated } from "@/lib/site-data";

type GapSearchParams = {
  q?: string | string[];
  hallmark?: string | string[];
  track?: string | string[];
  stage?: string | string[];
  coverage_confidence?: string | string[];
  research_density?: string | string[];
  severity?: string | string[];
  sort?: string | string[];
};

type EvidenceGapsPageProps = {
  searchParams?: Promise<GapSearchParams>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getGapFilters(searchParams: GapSearchParams): EvidenceGapFilters {
  return {
    q: getSingleSearchParam(searchParams.q).trim(),
    hallmark: getSingleSearchParam(searchParams.hallmark),
    track: getSingleSearchParam(searchParams.track),
    stage: getSingleSearchParam(searchParams.stage) as EvidenceGapFilters["stage"],
    coverage_confidence: getSingleSearchParam(
      searchParams.coverage_confidence
    ) as EvidenceGapFilters["coverage_confidence"],
    research_density: getSingleSearchParam(searchParams.research_density) as EvidenceGapFilters["research_density"],
    severity: getSingleSearchParam(searchParams.severity) as EvidenceGapFilters["severity"],
    sort: getSingleSearchParam(searchParams.sort) as EvidenceGapFilters["sort"]
  };
}

function firstItems<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

export default async function EvidenceGapsPage({ searchParams }: EvidenceGapsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = getGapFilters(resolvedSearchParams);
  const [lastUpdated, evidenceGaps] = await Promise.all([getOverallLastUpdated(), getEvidenceGapsExport(selected)]);
  const { facet_options: facets, summary } = evidenceGaps;

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Evidence gaps"
        title="What would change the rating?"
        summary="A track-level gap ledger for separating missing evidence, sparse but checked fields, map work, and trial results that could move interpretation."
      >
        <div className="page-hero__stats">
          <span>{summary.total_track_count} tracks</span>
          <span>{summary.filtered_track_count} matching</span>
          <span>{summary.total_high_priority_gap_count} high-priority gaps</span>
          <span>{summary.map_work_needed_track_count} need map work</span>
          <span>{summary.trial_sensitive_track_count} trial-sensitive</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell data-scoped-layout">
          <div className="data-scoped-main">
            <span className="section-kicker">Decision support</span>
            <h2>From uncertainty to next evidence</h2>
            <p>
              Gap rows combine public outlook gaps, rating-change criteria, coverage-state counts, research density,
              and trial-watch status. Use them to ask what evidence would matter next, not to infer that a field is empty.
            </p>
            <a className="section-link section-link--block" href={evidenceGaps.canonical_path}>
              <Database aria-hidden="true" size={16} />
              <span>Open matching JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="data-scoped-grid evidence-view-grid">
            {evidenceGaps.saved_views.map((view) => (
              <Link className="data-scoped-card" href={view.path} key={view.id}>
                <strong>{view.label}</strong>
                <span>Gap view</span>
                <p>{view.count} tracks</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell track-search evidence-search">
          <form className="track-search__form evidence-search__form" action="/gaps">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Gap, criterion, track, endpoint, or trial"
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
              <span>Stage</span>
              <select name="stage" defaultValue={selected.stage}>
                <option value="">All stages</option>
                {facets.stages.map((option) => (
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
              <span>Density</span>
              <select name="research_density" defaultValue={selected.research_density}>
                <option value="">All research density</option>
                {facets.research_densities.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Gap class</span>
              <select name="severity" defaultValue={selected.severity}>
                <option value="">All gap classes</option>
                {facets.severities.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Sort</span>
              <select name="sort" defaultValue={selected.sort || "severity"}>
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
              <Link className="action-button action-button--secondary" href="/gaps">
                <X aria-hidden="true" size={16} />
                <span>Reset</span>
              </Link>
            </div>
          </form>
          <div className="track-search__summary" aria-live="polite">
            <strong>{summary.filtered_track_count}</strong>
            <span>of {summary.total_track_count} tracks</span>
          </div>
        </div>

        <div className="page-shell expert-track-scan">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Gap ledger</span>
              <h2>{summary.returned_track_count} tracks with gap context</h2>
            </div>
            <a className="section-link" href={evidenceGaps.canonical_path}>
              <span>Filtered JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="expert-track-table-wrap">
            <table className="expert-track-table evidence-gaps-table">
              <thead>
                <tr>
                  <th scope="col">Track</th>
                  <th scope="col">Current read</th>
                  <th scope="col">Gap class</th>
                  <th scope="col">Rating-change criteria</th>
                  <th scope="col">Coverage</th>
                  <th scope="col">Trial horizon</th>
                </tr>
              </thead>
              <tbody>
                {evidenceGaps.tracks.map((track) => {
                  const ratingCriteria = track.gap_items.filter((item) => item.category === "rating_change_criterion");
                  const mainGaps = track.gap_items.filter((item) => item.category === "main_evidence_gap");
                  const sourceRefs = firstItems(track.provenance.source_refs, 2);
                  const remainingSourceCount = Math.max(0, track.provenance.supporting_source_count - sourceRefs.length);

                  return (
                    <tr key={track.id}>
                      <th scope="row">
                        <Link href={track.href}>
                          <strong>{track.name}</strong>
                          <span>{track.primary_hallmark_name}</span>
                        </Link>
                        <p>{track.summary}</p>
                        <div className="evidence-gap-trace">
                          <a href={track.provenance.track_json_path}>Track JSON</a>
                          <a href={track.provenance.gap_json_path}>Gap JSON</a>
                          <a href={track.provenance.evidence_map_path}>Scoped map</a>
                        </div>
                        <span>
                          {track.provenance.supporting_finding_count} findings /{" "}
                          {track.provenance.supporting_source_count} sources /{" "}
                          {track.provenance.supporting_evidence_count} support links
                        </span>
                        {sourceRefs.length ? (
                          <div className="evidence-gap-source-links">
                            {sourceRefs.map((source) => (
                              <a href={source.json_path} key={source.id}>
                                {source.short_name ?? source.name}
                              </a>
                            ))}
                            {remainingSourceCount ? <span>+{remainingSourceCount} source audits in JSON</span> : null}
                          </div>
                        ) : (
                          <span>No source refs</span>
                        )}
                      </th>
                      <td>
                        {track.stage_label ?? "Not rated"}
                        <span>{track.read_firmness_label ?? "No read firmness"}</span>
                        <span>{track.observed_research_density_label ?? "No density"}</span>
                      </td>
                      <td>
                        <div className="evidence-index-link-list">
                          {track.severity_labels.map((label) => (
                            <span className="micro-badge micro-badge--outline" key={label}>
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {ratingCriteria.length ? (
                          <ul className="evidence-index-caveats">
                            {firstItems(ratingCriteria, 3).map((item) => (
                              <li key={item.id}>{item.text}</li>
                            ))}
                          </ul>
                        ) : mainGaps.length ? (
                          <ul className="evidence-index-caveats">
                            {firstItems(mainGaps, 2).map((item) => (
                              <li key={item.id}>{item.text}</li>
                            ))}
                          </ul>
                        ) : (
                          "No explicit criterion recorded"
                        )}
                      </td>
                      <td>
                        {track.coverage_confidence_label ?? "Not assessed"}
                        <span>{track.coverage_verdict_label ?? "No coverage verdict"}</span>
                        <span>
                          {track.known_gap_count} known / {track.high_priority_gap_count} high priority
                        </span>
                      </td>
                      <td>
                        {track.trial_horizon.active_watch_trial_count} active watch
                        <span>{track.trial_horizon.late_no_results_trial_count} late no-results</span>
                        <span>{track.trial_horizon.posted_result_trial_count} posted results</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!evidenceGaps.tracks.length ? (
            <div className="tracks-table__empty">
              <strong>No gap rows match those filters.</strong>
              <Link className="mini-link" href="/gaps">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
