import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getAdminQueueSummary, getHallmarkById, getOverallLastUpdated, getPublicQueue, getTrackById } from "@/lib/site-data";

const statusPriority = {
  submitted: 0,
  in_review: 1,
  needs_revision: 2,
  revised: 3,
  approved: 4,
  published: 5,
  rejected: 6
} as const;

function getStatusLabel(status: keyof typeof statusPriority) {
  return status.replace(/_/g, " ");
}

function getStatusTone(status: keyof typeof statusPriority) {
  switch (status) {
    case "approved":
    case "published":
      return "micro-badge--mint";
    case "needs_revision":
      return "micro-badge--red";
    case "in_review":
    case "revised":
      return "micro-badge--gold";
    default:
      return "micro-badge--muted";
  }
}

function summarizeScope(bundle: Awaited<ReturnType<typeof getPublicQueue>>[number]) {
  const labels = [
    ...(bundle.scope?.hallmark_ids ?? []).map((id) => getHallmarkById(id)?.name ?? id),
    ...(bundle.scope?.track_ids ?? []).map((id) => getTrackById(id)?.name ?? id),
    ...(bundle.scope?.intervention_ids ?? [])
  ];

  return labels.length ? labels.join(" / ") : "Unscoped bundle";
}

export default async function AdminReviewQueuePage() {
  const [bundles, summary, lastUpdated] = await Promise.all([
    getPublicQueue(),
    getAdminQueueSummary(),
    getOverallLastUpdated()
  ]);

  const sortedBundles = [...bundles].sort((left, right) => {
    const statusOrder = statusPriority[left.lifecycle_status] - statusPriority[right.lifecycle_status];
    return statusOrder !== 0 ? statusOrder : right.submitted_at.localeCompare(left.submitted_at);
  });

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Admin review"
        title="Editorial queue"
        summary="Candidate bundles from the research workflow land here for review, revision requests, approval, and publication."
      >
        <div className="page-hero__stats">
          <span>{summary.open} open</span>
          <span>{summary.byStatus.published} published</span>
          <span>{summary.byStatus.needs_revision} need revision</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell review-summary-grid">
          <article className="review-summary-card">
            <span className="section-kicker">Open</span>
            <strong>{summary.open}</strong>
            <p>Bundles still in editorial motion.</p>
          </article>
          <article className="review-summary-card">
            <span className="section-kicker">Submitted</span>
            <strong>{summary.byStatus.submitted}</strong>
            <p>Fresh intake that has not been reviewed yet.</p>
          </article>
          <article className="review-summary-card">
            <span className="section-kicker">Published</span>
            <strong>{summary.byStatus.published}</strong>
            <p>Changes already reflected in the public layer.</p>
          </article>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell review-queue">
          {sortedBundles.map((bundle) => (
            <Link className="review-card" href={`/admin/review/${bundle.id}`} key={bundle.id}>
              <div className="review-card__header">
                <div>
                  <span className={`micro-badge ${getStatusTone(bundle.lifecycle_status)}`}>
                    {getStatusLabel(bundle.lifecycle_status)}
                  </span>
                  <h2>{bundle.name}</h2>
                </div>
                <time dateTime={bundle.submitted_at}>{formatDate(bundle.submitted_at)}</time>
              </div>
              <p>{bundle.summary ?? "No summary provided."}</p>
              <div className="review-card__meta">
                <span>{bundle.intake_mode}</span>
                <span>{bundle.proposed_changes.length} proposed changes</span>
                <span>Revision {bundle.revision_number ?? 1}</span>
              </div>
              <div className="review-card__scope">{summarizeScope(bundle)}</div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
