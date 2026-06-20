import Link from "next/link";
import { ArrowRight, Database, Search, ShieldCheck, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { type ClaimGuardrailFilters, getClaimGuardrailsExport, getOverallLastUpdated } from "@/lib/site-data";

type ClaimSearchParams = {
  q?: string | string[];
  track?: string | string[];
  boundary_class?: string | string[];
  overclaim_risk?: string | string[];
};

type ClaimsPageProps = {
  searchParams?: Promise<ClaimSearchParams>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getClaimFilters(searchParams: ClaimSearchParams): ClaimGuardrailFilters {
  return {
    q: getSingleSearchParam(searchParams.q).trim(),
    track: getSingleSearchParam(searchParams.track),
    boundary_class: getSingleSearchParam(searchParams.boundary_class) as ClaimGuardrailFilters["boundary_class"],
    overclaim_risk: getSingleSearchParam(searchParams.overclaim_risk) as ClaimGuardrailFilters["overclaim_risk"]
  };
}

function getClaimsPath(filters: ClaimGuardrailFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `/claims?${query}` : "/claims";
}

function getBoundaryTone(boundaryClass: string) {
  switch (boundaryClass) {
    case "human_claim_bounded":
      return "micro-badge--mint";
    case "early_human_signal_only":
    case "preclinical_or_mechanistic_only":
      return "micro-badge--outline";
    case "coverage_limited_claim":
    case "not_yet_claimable":
      return "micro-badge--gold";
    default:
      return "micro-badge--red";
  }
}

function visibleItems<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export default async function ClaimsPage({ searchParams }: ClaimsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = getClaimFilters(resolvedSearchParams);
  const [lastUpdated, claimGuardrails] = await Promise.all([
    getOverallLastUpdated(),
    getClaimGuardrailsExport(selected)
  ]);
  const { facet_options: facets, summary } = claimGuardrails;
  const topRiskRows = claimGuardrails.summary.overclaim_risk_counts.slice(0, 6);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Claim guardrails"
        title="What the tracker can and cannot claim"
        summary="A track-level scan of supported wording, forbidden inferences, required caveats, and overclaim risks across the longevity evidence map."
      >
        <div className="page-hero__stats">
          <span>{summary.total_track_count} tracks</span>
          <span>{summary.filtered_track_count} matching</span>
          <span>{summary.high_risk_track_count} high-risk phrasing contexts</span>
          <span>{summary.registry_pending_track_count} registry-pending</span>
          <span>{summary.coverage_limited_track_count} coverage-limited</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell data-scoped-layout claims-overview">
          <div className="data-scoped-main">
            <ShieldCheck aria-hidden="true" size={18} />
            <span className="section-kicker">Interpretation layer</span>
            <h2>Bound claims before summarizing tracks</h2>
            <p>
              Boundary classes are derived from outlook stage, coverage, evidence quality, consistency patterns, source
              replication, and registry-result gaps.
            </p>
            <a className="section-link section-link--block" href={claimGuardrails.canonical_path}>
              <Database aria-hidden="true" size={16} />
              <span>Open matching JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link section-link--block" href="/data/claim-guardrails.schema.json">
              <span>Open schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="data-scoped-grid claims-boundary-grid">
            {claimGuardrails.boundary_class_legend.map((item) => (
              <Link
                className="data-scoped-card"
                href={getClaimsPath({ boundary_class: item.value as ClaimGuardrailFilters["boundary_class"] })}
                key={item.value}
              >
                <strong>{formatNumber(summary.boundary_class_counts[item.value])}</strong>
                <span>{item.label}</span>
                <p>{item.plain_meaning}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {topRiskRows.length ? (
        <section className="band band--compact">
          <div className="page-shell claims-risk-strip" aria-label="Top overclaim risks">
            {topRiskRows.map((risk) => (
              <Link
                className="claims-risk-pill"
                href={getClaimsPath({ overclaim_risk: risk.value as ClaimGuardrailFilters["overclaim_risk"] })}
                key={risk.value}
              >
                <strong>{risk.label}</strong>
                <span>{formatNumber(risk.count)} tracks</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="band band--alt">
        <div className="page-shell track-search evidence-search claims-search">
          <form className="track-search__form evidence-search__form" action="/claims">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Track, caveat, risk, supported claim"
                  defaultValue={selected.q}
                />
              </div>
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
              <span>Boundary</span>
              <select name="boundary_class" defaultValue={selected.boundary_class}>
                <option value="">All boundaries</option>
                {facets.boundary_classes.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Risk</span>
              <select name="overclaim_risk" defaultValue={selected.overclaim_risk}>
                <option value="">All overclaim risks</option>
                {facets.overclaim_risks.map((option) => (
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
              <Link className="action-button action-button--secondary" href="/claims">
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

        <div className="page-shell expert-track-scan claims-track-scan">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Claim boundary matrix</span>
              <h2>{summary.returned_track_count} tracks with claim guardrails</h2>
            </div>
            <a className="section-link" href={claimGuardrails.canonical_path}>
              <span>Filtered JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="expert-track-table-wrap">
            <table className="expert-track-table evidence-gaps-table claim-guardrails-table">
              <thead>
                <tr>
                  <th scope="col">Track</th>
                  <th scope="col">Boundary</th>
                  <th scope="col">Can say</th>
                  <th scope="col">Must not imply</th>
                  <th scope="col">Caveats and risks</th>
                  <th scope="col">Evidence links</th>
                </tr>
              </thead>
              <tbody>
                {claimGuardrails.tracks.map((track) => (
                  <tr key={track.id}>
                    <th scope="row">
                      <Link href={track.href}>
                        <strong>{track.name}</strong>
                        <span>{track.primary_hallmark_name}</span>
                      </Link>
                      <p>{track.guardrail_summary}</p>
                    </th>
                    <td>
                      <span className={`micro-badge ${getBoundaryTone(track.boundary_class)}`}>
                        {track.boundary_class_label}
                      </span>
                      <span>{track.boundary_class_meaning}</span>
                      <span>{track.stage_label ?? "Not rated"}</span>
                      <span>{track.read_firmness_label ?? "No read firmness"}</span>
                    </td>
                    <td>
                      <ul className="evidence-index-caveats">
                        {visibleItems(track.supported_claims, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul className="evidence-index-caveats">
                        {visibleItems(track.unsupported_claims, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <div className="claims-risk-tags">
                        {visibleItems(track.overclaim_risks, 4).map((risk) => (
                          <span className="evidence-chip evidence-chip--gold" key={risk.value}>
                            {risk.label}
                          </span>
                        ))}
                        {track.overclaim_risks.length > 4 ? (
                          <span className="evidence-chip evidence-chip--muted">
                            +{track.overclaim_risks.length - 4}
                          </span>
                        ) : null}
                      </div>
                      <ul className="evidence-index-caveats claims-caveat-list">
                        {visibleItems(track.required_caveats, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <div className="evidence-gap-trace claims-link-list">
                        <a href={track.paths.claim_guardrails_path}>Guardrails JSON</a>
                        <a href={track.paths.evidence_conflicts_path}>Conflicts</a>
                        <a href={track.paths.evidence_quality_path}>Quality</a>
                        <a href={track.paths.evidence_index_path}>Evidence index</a>
                        <Link href={track.paths.evidence_page_path}>Explorer</Link>
                      </div>
                      <span>{track.conflict.consistency_class_label}</span>
                      <span>{track.quality_snapshot.finding_count} quality-scored findings</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!claimGuardrails.tracks.length ? (
            <div className="tracks-table__empty">
              <strong>No claim guardrails match those filters.</strong>
              <Link className="mini-link" href="/claims">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
