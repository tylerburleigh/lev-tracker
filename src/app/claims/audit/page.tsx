import Link from "next/link";
import { ArrowRight, ClipboardCheck, Database, Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  type ClaimConsistencyAuditFilters,
  getClaimConsistencyAuditExport,
  getOverallLastUpdated
} from "@/lib/site-data";

type ClaimAuditSearchParams = {
  q?: string | string[];
  track?: string | string[];
  issue_type?: string | string[];
  severity?: string | string[];
  source_kind?: string | string[];
  limit?: string | string[];
};

type ClaimsAuditPageProps = {
  searchParams?: Promise<ClaimAuditSearchParams>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getClaimAuditFilters(searchParams: ClaimAuditSearchParams): ClaimConsistencyAuditFilters {
  const limitValue = getSingleSearchParam(searchParams.limit);
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    q: getSingleSearchParam(searchParams.q).trim(),
    track: getSingleSearchParam(searchParams.track),
    issue_type: getSingleSearchParam(searchParams.issue_type) as ClaimConsistencyAuditFilters["issue_type"],
    severity: getSingleSearchParam(searchParams.severity) as ClaimConsistencyAuditFilters["severity"],
    source_kind: getSingleSearchParam(searchParams.source_kind) as ClaimConsistencyAuditFilters["source_kind"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

function getClaimAuditPath(filters: ClaimConsistencyAuditFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `/claims/audit?${query}` : "/claims/audit";
}

function getSeverityTone(severity: string) {
  switch (severity) {
    case "critical":
      return "micro-badge--red";
    case "warning":
      return "micro-badge--gold";
    default:
      return "micro-badge--outline";
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function firstItems<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

export default async function ClaimsAuditPage({ searchParams }: ClaimsAuditPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = getClaimAuditFilters(resolvedSearchParams);
  const tableFilters = { ...selected, limit: selected.limit ?? 50 };
  const [lastUpdated, claimAudit] = await Promise.all([
    getOverallLastUpdated(),
    getClaimConsistencyAuditExport(tableFilters)
  ]);
  const { facet_options: facets, summary } = claimAudit;
  const severityRows = claimAudit.summary.severity_counts;
  const sourceRows = claimAudit.summary.source_kind_counts;

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Claim audit"
        title="Where public copy may drift from guardrails"
        summary="A review queue that compares track-linked public text against the tracker claim guardrails, with source paths for editors, researchers, and language-model workflows."
      >
        <div className="page-hero__stats">
          <span>{formatNumber(summary.scanned_context_count)} text contexts scanned</span>
          <span>{formatNumber(summary.filtered_issue_count)} matching issues</span>
          <span>{formatNumber(summary.affected_track_count)} affected tracks</span>
          <span>{formatNumber(summary.critical_issue_count)} critical</span>
          <span>{formatNumber(summary.warning_issue_count)} warning</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell data-scoped-layout claims-overview">
          <div className="data-scoped-main">
            <ClipboardCheck aria-hidden="true" size={18} />
            <span className="section-kicker">Editorial QA layer</span>
            <h2>Review copy before it becomes training signal</h2>
            <p>
              Each issue links the flagged text excerpt, the public source page, the backing record path, the track
              guardrail, and the evidence explorer so reviewers can decide whether the caveat is missing or supplied
              nearby.
            </p>
            <a className="section-link section-link--block" href={claimAudit.canonical_path}>
              <Database aria-hidden="true" size={16} />
              <span>Open matching JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link section-link--block" href="/data/claim-consistency-audit.schema.json">
              <span>Open schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="data-scoped-grid claim-audit-summary-grid">
            {severityRows.map((row) => (
              <Link
                className="data-scoped-card"
                href={getClaimAuditPath({
                  ...selected,
                  severity: row.value as ClaimConsistencyAuditFilters["severity"]
                })}
                key={row.value}
              >
                <strong>{formatNumber(row.count)}</strong>
                <span>{row.label}</span>
                <p>Severity-filtered issue rows</p>
              </Link>
            ))}
            {sourceRows.slice(0, Math.max(0, 6 - severityRows.length)).map((row) => (
              <Link
                className="data-scoped-card"
                href={getClaimAuditPath({
                  ...selected,
                  source_kind: row.value as ClaimConsistencyAuditFilters["source_kind"]
                })}
                key={row.value}
              >
                <strong>{formatNumber(row.count)}</strong>
                <span>{row.label}</span>
                <p>Source-linked issue rows</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell track-search evidence-search claims-search">
          <form className="track-search__form evidence-search__form" action="/claims/audit">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Track, issue, excerpt, source, recommendation"
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
              <span>Issue</span>
              <select name="issue_type" defaultValue={selected.issue_type}>
                <option value="">All issues</option>
                {facets.issue_types.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Severity</span>
              <select name="severity" defaultValue={selected.severity}>
                <option value="">All severities</option>
                {facets.severities.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Source</span>
              <select name="source_kind" defaultValue={selected.source_kind}>
                <option value="">All source types</option>
                {facets.source_kinds.map((option) => (
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
              <Link className="action-button action-button--secondary" href="/claims/audit">
                <X aria-hidden="true" size={16} />
                <span>Reset</span>
              </Link>
            </div>
          </form>
          <div className="track-search__summary" aria-live="polite">
            <strong>{formatNumber(summary.filtered_issue_count)}</strong>
            <span>of {formatNumber(summary.total_issue_count)} issues</span>
          </div>
        </div>

        <div className="page-shell expert-track-scan claims-track-scan">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Consistency queue</span>
              <h2>
                Showing {formatNumber(summary.returned_issue_count)} of{" "}
                {formatNumber(summary.filtered_issue_count)} issue rows
              </h2>
            </div>
            <a className="section-link" href={claimAudit.canonical_path}>
              <span>Filtered JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="expert-track-table-wrap">
            <table className="expert-track-table evidence-gaps-table claim-audit-table">
              <thead>
                <tr>
                  <th scope="col">Track</th>
                  <th scope="col">Issue</th>
                  <th scope="col">Source text</th>
                  <th scope="col">Recommendation</th>
                  <th scope="col">Guardrail</th>
                  <th scope="col">Trace</th>
                </tr>
              </thead>
              <tbody>
                {claimAudit.issues.map((issue) => (
                  <tr key={issue.id}>
                    <th scope="row">
                      <Link href={issue.track_href}>
                        <strong>{issue.track_name}</strong>
                        <span>{issue.track_id}</span>
                      </Link>
                      <p>{issue.guardrail.guardrail_summary}</p>
                    </th>
                    <td>
                      <span className={`micro-badge ${getSeverityTone(issue.severity)}`}>{issue.severity_label}</span>
                      <strong>{issue.issue_type_label}</strong>
                      <span>{issue.source_kind_label}</span>
                      <span>{issue.source_label}</span>
                    </td>
                    <td>
                      <p className="claim-audit-text">{issue.text_excerpt}</p>
                      <code className="claim-audit-path">{issue.field_path}</code>
                      {issue.matched_terms.length ? (
                        <div className="claims-risk-tags claim-audit-token-list">
                          {firstItems(issue.matched_terms, 4).map((term) => (
                            <span className="evidence-chip evidence-chip--gold" key={term}>
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <p className="claim-audit-text">{issue.recommendation}</p>
                      {issue.missing_terms.length ? (
                        <ul className="evidence-index-caveats">
                          {firstItems(issue.missing_terms, 4).map((term) => (
                            <li key={term}>{term}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td>
                      <span className="micro-badge micro-badge--outline">
                        {issue.guardrail.boundary_class_label}
                      </span>
                      <ul className="evidence-index-caveats claims-caveat-list">
                        {firstItems(issue.guardrail.required_caveats, 2).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <div className="claims-risk-tags">
                        {firstItems(issue.guardrail.overclaim_risks, 3).map((risk) => (
                          <span className="evidence-chip evidence-chip--muted" key={risk.value}>
                            {risk.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="evidence-gap-trace claims-link-list">
                        <a href={issue.paths.source_page_path}>Source page</a>
                        <a href={issue.paths.claim_guardrails_path}>Guardrails</a>
                        <Link href={issue.paths.evidence_page_path}>Explorer</Link>
                        <Link href={issue.paths.track_page_path}>Track</Link>
                      </div>
                      <code className="claim-audit-path">{issue.paths.source_record_path}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!claimAudit.issues.length ? (
            <div className="tracks-table__empty">
              <strong>No claim consistency issues match those filters.</strong>
              <Link className="mini-link" href="/claims/audit">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
