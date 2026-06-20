import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCheck, Database, Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  type ClaimConsistencyAuditFilters,
  getClaimConsistencyAuditExport,
  getClaimConsistencyReviewPacketExport,
  getOverallLastUpdated
} from "@/lib/site-data";

type ClaimAuditSearchParams = {
  q?: string | string[];
  track?: string | string[];
  issue_type?: string | string[];
  severity?: string | string[];
  source_kind?: string | string[];
  review_status?: string | string[];
  lifecycle_state?: string | string[];
  review_freshness?: string | string[];
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
    review_status: getSingleSearchParam(searchParams.review_status) as ClaimConsistencyAuditFilters["review_status"],
    lifecycle_state: getSingleSearchParam(
      searchParams.lifecycle_state
    ) as ClaimConsistencyAuditFilters["lifecycle_state"],
    review_freshness: getSingleSearchParam(
      searchParams.review_freshness
    ) as ClaimConsistencyAuditFilters["review_freshness"],
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

function getClaimPacketJsonPath(filters: ClaimConsistencyAuditFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `/data/claim-consistency-review-packet.json?${query}` : "/data/claim-consistency-review-packet.json";
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

function getReviewStatusTone(status: string) {
  switch (status) {
    case "fixed":
    case "false_positive":
      return "micro-badge--mint";
    case "accepted":
    case "deferred":
      return "micro-badge--gold";
    default:
      return "micro-badge--outline";
  }
}

function getReviewFreshnessTone(freshness: string) {
  switch (freshness) {
    case "changed_since_review":
      return "micro-badge--red";
    case "current":
      return "micro-badge--mint";
    case "resolved":
      return "micro-badge--muted";
    default:
      return "micro-badge--outline";
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0
  }).format(value);
}

function firstItems<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

export default async function ClaimsAuditPage({ searchParams }: ClaimsAuditPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = getClaimAuditFilters(resolvedSearchParams);
  const tableFilters = { ...selected, limit: selected.limit ?? 50 };
  const packetFilters = { ...selected, review_status: selected.review_status || "open", limit: 6 };
  const [lastUpdated, claimAudit, reviewPacket] = await Promise.all([
    getOverallLastUpdated(),
    getClaimConsistencyAuditExport(tableFilters),
    getClaimConsistencyReviewPacketExport(packetFilters)
  ]);
  const { facet_options: facets, summary } = claimAudit;
  const reviewRows = claimAudit.summary.review_status_counts;
  const lifecycleRows = claimAudit.summary.lifecycle_state_counts;
  const sourceRows = claimAudit.summary.source_kind_counts;
  const progress = claimAudit.summary.review_progress;
  const progressCards = [
    {
      label: "Reviewed",
      value: formatPercent(progress.reviewed_ratio),
      count: `${formatNumber(progress.reviewed_issue_count)} of ${formatNumber(progress.current_issue_count)} current rows`,
      ratio: progress.reviewed_ratio
    },
    {
      label: "Open backlog",
      value: formatNumber(progress.unreviewed_issue_count),
      count: `${formatNumber(progress.unresolved_issue_count)} unresolved rows still visible`,
      ratio: progress.current_issue_count ? progress.unreviewed_issue_count / progress.current_issue_count : 0
    },
    {
      label: "Needs re-check",
      value: formatNumber(progress.changed_since_review_count),
      count: `${formatNumber(progress.current_review_count)} current reviewed rows`,
      ratio: progress.current_issue_count ? progress.changed_since_review_count / progress.current_issue_count : 0
    },
    {
      label: "Suppressed",
      value: formatPercent(progress.suppressed_ratio),
      count: `${formatNumber(progress.suppressed_issue_count)} fixed or false-positive rows`,
      ratio: progress.suppressed_ratio
    },
    {
      label: "Resolved drift",
      value: formatNumber(progress.resolved_issue_count),
      count: `${formatNumber(progress.resolution_entry_count)} ledger entries tracked`,
      ratio: progress.resolution_entry_count ? progress.resolved_issue_count / progress.resolution_entry_count : 0
    }
  ];
  const summaryRows = [
    ...reviewRows.map((row) => ({
      ...row,
      href: getClaimAuditPath({
        ...selected,
        review_status: row.value as ClaimConsistencyAuditFilters["review_status"]
      }),
      summary: "Review-status issue rows"
    })),
    ...lifecycleRows.map((row) => ({
      ...row,
      href: getClaimAuditPath({
        ...selected,
        lifecycle_state: row.value as ClaimConsistencyAuditFilters["lifecycle_state"]
      }),
      summary: "Lifecycle issue rows"
    })),
    ...sourceRows.map((row) => ({
      ...row,
      href: getClaimAuditPath({
        ...selected,
        source_kind: row.value as ClaimConsistencyAuditFilters["source_kind"]
      }),
      summary: "Source-linked issue rows"
    }))
  ].slice(0, 6);

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
          <span>{formatNumber(summary.unresolved_issue_count)} unresolved</span>
          <span>{formatNumber(summary.affected_track_count)} affected tracks</span>
          <span>{formatNumber(summary.new_issue_count)} new</span>
          <span>{formatNumber(summary.recurring_issue_count)} recurring</span>
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
              nearby. Resolution metadata comes from a file-backed reviewer ledger.
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
            {summaryRows.map((row) => (
              <Link className="data-scoped-card" href={row.href} key={`${row.summary}:${row.value}`}>
                <strong>{formatNumber(row.count)}</strong>
                <span>{row.label}</span>
                <p>{row.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--compact">
        <div className="page-shell claim-review-progress">
          <div className="tracks-table__head">
            <div>
              <BarChart3 aria-hidden="true" size={18} />
              <span className="section-kicker">Review progress</span>
              <h2>{formatPercent(progress.reviewed_ratio)} of matching rows have reviewer state</h2>
              <p className="claim-audit-subhead">
                {formatNumber(progress.unreviewed_issue_count)} open rows /{" "}
                {formatNumber(progress.changed_since_review_count)} changed since review /{" "}
                {formatNumber(progress.recurring_issue_count)} recurring rows /{" "}
                {formatNumber(progress.resolved_issue_count)} ledger-only resolved rows
              </p>
            </div>
            <a className="section-link" href={claimAudit.canonical_path}>
              <span>Progress JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="claim-review-progress-grid">
            {progressCards.map((card) => (
              <article className="claim-progress-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.count}</p>
                <div className="claim-progress-meter" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, Math.round(card.ratio * 100))}%` }} />
                </div>
              </article>
            ))}
          </div>
          <div className="claim-priority-list">
            {claimAudit.summary.priority_track_queue.slice(0, 6).map((track) => (
              <article className="claim-priority-row" key={track.track_id}>
                <div>
                  <Link href={track.audit_path}>
                    <strong>{track.track_name}</strong>
                  </Link>
                  <p>
                    {track.top_issue_type?.label ?? "Mixed issue types"} ·{" "}
                    {track.top_source_kind?.label ?? "Mixed sources"}
                  </p>
                </div>
                <div className="claim-priority-row__metrics">
                  <span className="micro-badge micro-badge--gold">
                    {formatNumber(track.unresolved_issue_count)} unresolved
                  </span>
                  {track.changed_since_review_count ? (
                    <span className="micro-badge micro-badge--red">
                      {formatNumber(track.changed_since_review_count)} changed
                    </span>
                  ) : null}
                  <span className="micro-badge micro-badge--outline">
                    {formatNumber(track.warning_issue_count)} warning
                  </span>
                  <span className="micro-badge micro-badge--muted">Priority {track.priority_score}</span>
                </div>
                <div className="evidence-gap-trace claims-link-list">
                  <Link href={track.track_href}>Track</Link>
                  <Link href={track.audit_path}>Rows</Link>
                  <a href={track.review_packet_path}>Packet</a>
                </div>
              </article>
            ))}
          </div>
          {!claimAudit.summary.priority_track_queue.length ? (
            <div className="tracks-table__empty">
              <strong>No priority tracks match those filters.</strong>
              <Link className="mini-link" href="/claims/audit">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="band band--compact">
        <div className="page-shell claim-review-packet">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Review packet</span>
              <h2>{formatNumber(reviewPacket.summary.returned_group_count)} grouped decisions</h2>
              <p className="claim-audit-subhead">
                {formatNumber(reviewPacket.summary.reviewable_issue_count)} rows collapsed into{" "}
                {formatNumber(reviewPacket.summary.total_group_count)} groups
              </p>
            </div>
            <a className="section-link" href={reviewPacket.canonical_path}>
              <span>Packet JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="claim-review-packet-grid">
            {reviewPacket.groups.map((group) => {
              const auditHref = getClaimAuditPath({
                ...selected,
                track: group.track_id,
                issue_type: group.issue_type,
                source_kind: group.source_kind,
                review_status: selected.review_status || "open"
              });
              const firstExcerpt = group.representative_excerpts[0];

              return (
                <article className="claim-review-packet-card" key={group.id}>
                  <div className="claim-review-packet-card__topline">
                    <span className="micro-badge micro-badge--gold">{group.highest_severity_label}</span>
                    <span className="micro-badge micro-badge--outline">{group.issue_count} rows</span>
                    <span className="micro-badge micro-badge--muted">Priority {group.priority_score}</span>
                  </div>
                  <h3>{group.track_name}</h3>
                  <p>{group.issue_type_label}</p>
                  {firstExcerpt ? <p className="claim-audit-text">{firstExcerpt.text_excerpt}</p> : null}
                  <code className="claim-audit-path">{group.source_record_path}</code>
                  <div className="evidence-gap-trace claims-link-list">
                    <Link href={auditHref}>Rows</Link>
                    <a href={group.trace_paths.claim_guardrails_path}>Guardrails</a>
                    <Link href={group.trace_paths.evidence_page_path}>Explorer</Link>
                  </div>
                </article>
              );
            })}
          </div>
          {!reviewPacket.groups.length ? (
            <div className="tracks-table__empty">
              <strong>No grouped review decisions match those filters.</strong>
              <a className="mini-link" href={getClaimPacketJsonPath({ ...selected, limit: 25 })}>
                Open packet JSON
              </a>
            </div>
          ) : null}
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
            <label className="track-search__field">
              <span>Review</span>
              <select name="review_status" defaultValue={selected.review_status}>
                <option value="">All review states</option>
                {facets.review_statuses.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Lifecycle</span>
              <select name="lifecycle_state" defaultValue={selected.lifecycle_state}>
                <option value="">All lifecycle states</option>
                {facets.lifecycle_states.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Freshness</span>
              <select name="review_freshness" defaultValue={selected.review_freshness}>
                <option value="">All freshness states</option>
                {facets.review_freshnesses.map((option) => (
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
              <p className="claim-audit-subhead">
                {formatNumber(summary.unresolved_issue_count)} unresolved /{" "}
                {formatNumber(summary.new_issue_count)} new / {formatNumber(summary.recurring_issue_count)} recurring
              </p>
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
                      <span className={`micro-badge ${getReviewStatusTone(issue.resolution.review_status)}`}>
                        {issue.resolution.review_status_label}
                      </span>
                      <span className="micro-badge micro-badge--muted">
                        {issue.resolution.lifecycle_state_label}
                      </span>
                      <span className={`micro-badge ${getReviewFreshnessTone(issue.resolution.review_freshness)}`}>
                        {issue.resolution.review_freshness_label}
                      </span>
                      <strong>{issue.issue_type_label}</strong>
                      <span>{issue.source_kind_label}</span>
                      <span>{issue.source_label}</span>
                      {issue.resolution.note ? <p className="claim-audit-note">{issue.resolution.note}</p> : null}
                      {issue.resolution.previous_review ? (
                        <p className="claim-audit-note">
                          Previous review: {issue.resolution.previous_review.review_status_label} (
                          {issue.resolution.previous_review.fingerprint})
                        </p>
                      ) : null}
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
                      <code className="claim-audit-path">{issue.fingerprint}</code>
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
