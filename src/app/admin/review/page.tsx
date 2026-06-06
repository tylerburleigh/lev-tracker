import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getAdminQueueSummary,
  getCandidateBundleEvidenceReviewReadiness,
  getCandidateBundlePromotionReadiness,
  getHallmarkById,
  getOverallLastUpdated,
  getPublicQueue,
  getTrackById
} from "@/lib/site-data";

type QueueBundle = Awaited<ReturnType<typeof getPublicQueue>>[number];
type EvidenceReviewGate = NonNullable<Awaited<ReturnType<typeof getCandidateBundleEvidenceReviewReadiness>>>;
type PromotionGate = NonNullable<Awaited<ReturnType<typeof getCandidateBundlePromotionReadiness>>>;

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
  return getReadableLabel(status);
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

function getReadableLabel(value: string) {
  return value.replace(/_/g, " ");
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getLaneList(lanes: EvidenceReviewGate["requiredLanes"]) {
  return lanes.length ? lanes.map((lane) => getReadableLabel(lane)).join(" / ") : "None";
}

function getBlockingFindingsSummary(evidenceReviewGate: EvidenceReviewGate) {
  if (!evidenceReviewGate.eligible) {
    return "Not required";
  }

  if (evidenceReviewGate.openBlockingFindings.length > 0) {
    const severityCounts = evidenceReviewGate.openBlockingFindings.reduce<Record<string, number>>(
      (counts, finding) => ({
        ...counts,
        [finding.severity]: (counts[finding.severity] ?? 0) + 1
      }),
      {}
    );

    return Object.entries(severityCounts)
      .map(([severity, count]) => pluralize(count, getReadableLabel(severity)))
      .join(" / ");
  }

  if (evidenceReviewGate.blockingReviewIds.length > 0) {
    return pluralize(evidenceReviewGate.blockingReviewIds.length, "blocking review");
  }

  return "None";
}

function getGateStatus(
  bundle: QueueBundle,
  evidenceReviewGate: EvidenceReviewGate | undefined,
  promotion: PromotionGate | undefined
) {
  if (bundle.lifecycle_status === "published") {
    return { label: "Published", tone: "micro-badge--mint" };
  }

  if (bundle.lifecycle_status === "rejected") {
    return { label: "Rejected", tone: "micro-badge--muted" };
  }

  if (evidenceReviewGate?.eligible && !evidenceReviewGate.ready) {
    return { label: "Evidence blocked", tone: "micro-badge--red" };
  }

  if (promotion?.eligible && promotion.issues.length > 0) {
    return { label: "Promotion blocked", tone: "micro-badge--red" };
  }

  if (promotion?.ready) {
    return { label: "Ready to publish", tone: "micro-badge--mint" };
  }

  if (evidenceReviewGate?.eligible && evidenceReviewGate.ready) {
    return { label: "Review complete", tone: "micro-badge--gold" };
  }

  if (evidenceReviewGate?.eligible) {
    return { label: "Review pending", tone: "micro-badge--gold" };
  }

  return { label: "No evidence gate", tone: "micro-badge--muted" };
}

function getPromotionIssues(promotion: PromotionGate) {
  if (promotion.issues.length === 0) {
    return ["None found"];
  }

  const visibleIssues = promotion.issues.slice(0, 2);
  const hiddenIssueCount = promotion.issues.length - visibleIssues.length;

  return hiddenIssueCount > 0 ? [...visibleIssues, `${pluralize(hiddenIssueCount, "more issue")}`] : visibleIssues;
}

function getGateIssueLabel(evidenceReviewGate: EvidenceReviewGate, promotion: PromotionGate) {
  const issueCount = evidenceReviewGate.issues.length + promotion.issues.length;
  return pluralize(issueCount, "gate issue");
}

function summarizeScope(bundle: QueueBundle) {
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
  const readinessEntries = await Promise.all(
    bundles.map(async (bundle) => {
      const [evidenceReviewGate, promotion] = await Promise.all([
        getCandidateBundleEvidenceReviewReadiness(bundle.id),
        getCandidateBundlePromotionReadiness(bundle.id)
      ]);

      return [bundle.id, { evidenceReviewGate, promotion }] as const;
    })
  );
  const readinessByBundleId = new Map(readinessEntries);

  const sortedBundles = [...bundles].sort((left, right) => {
    const statusOrder = statusPriority[left.lifecycle_status] - statusPriority[right.lifecycle_status];
    return statusOrder !== 0 ? statusOrder : right.submitted_at.localeCompare(left.submitted_at);
  });

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Admin review"
        title="Editorial queue"
        summary="Staged updates from the research workflow land here for review, revision requests, approval, and publication."
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
          {sortedBundles.map((bundle) => {
            const readiness = readinessByBundleId.get(bundle.id);
            const evidenceReviewGate = readiness?.evidenceReviewGate;
            const promotion = readiness?.promotion;
            const gateStatus = getGateStatus(bundle, evidenceReviewGate, promotion);

            return (
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
                {evidenceReviewGate && promotion ? (
                  <div className="review-card__gate">
                    <div className="review-gate-summary">
                      <span className={`micro-badge ${gateStatus.tone}`}>{gateStatus.label}</span>
                      <span>{getGateIssueLabel(evidenceReviewGate, promotion)}</span>
                    </div>
                    <dl className="review-gate-grid">
                      <div>
                        <dt>Required lanes</dt>
                        <dd>{getLaneList(evidenceReviewGate.requiredLanes)}</dd>
                      </div>
                      <div>
                        <dt>Missing lanes</dt>
                        <dd>{getLaneList(evidenceReviewGate.missingLanes)}</dd>
                      </div>
                      <div>
                        <dt>Blocking findings</dt>
                        <dd>{getBlockingFindingsSummary(evidenceReviewGate)}</dd>
                      </div>
                    </dl>
                    <div className="review-gate-issues">
                      <strong>Promotion readiness</strong>
                      <ul>
                        {getPromotionIssues(promotion).map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
