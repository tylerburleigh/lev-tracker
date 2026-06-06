import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getCandidateBundleById,
  getCandidateBundleEvidenceReviewReadiness,
  getCandidateBundlePromotionReadiness,
  getEvidenceReviewsForBundle,
  getHallmarkById,
  getOverallLastUpdated,
  getPublicationEventsForBundle,
  getReviewCommentsForBundle,
  getTrackById
} from "@/lib/site-data";

import { publishBundleAction, setBundleStatusAction, submitReviewCommentAction } from "../actions";

type BundleDetailPageProps = {
  params: Promise<{
    bundleId: string;
  }>;
};

function getStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function getLaneLabel(lane: string) {
  return lane.replace(/_/g, " ");
}

function getStatusTone(status: string) {
  switch (status) {
    case "approved":
    case "approval":
    case "published":
      return "micro-badge--mint";
    case "needs_revision":
    case "request_changes":
    case "rejected":
    case "rejection":
      return "micro-badge--red";
    case "in_review":
    case "revised":
      return "micro-badge--gold";
    default:
      return "micro-badge--muted";
  }
}

function getEvidenceVerdictTone(verdict: string) {
  switch (verdict) {
    case "accept":
      return "micro-badge--mint";
    case "needs_revision":
    case "reject":
      return "micro-badge--red";
    case "needs_human_judgment":
      return "micro-badge--gold";
    default:
      return "micro-badge--muted";
  }
}

function getFindingTone(severity: string) {
  switch (severity) {
    case "critical":
    case "major":
      return "micro-badge--red";
    case "minor":
      return "micro-badge--gold";
    default:
      return "micro-badge--muted";
  }
}

function canTransitionStatus(current: string, next: string) {
  const transitions: Record<string, string[]> = {
    submitted: ["in_review", "needs_revision", "approved", "rejected"],
    in_review: ["needs_revision", "approved", "rejected"],
    needs_revision: ["revised", "rejected"],
    revised: ["in_review", "approved", "rejected"],
    approved: ["in_review", "rejected", "published"],
    published: [],
    rejected: []
  };

  return current === next || (transitions[current] ?? []).includes(next);
}

function getScopeItems(bundle: NonNullable<Awaited<ReturnType<typeof getCandidateBundleById>>>) {
  return [
    ...(bundle.scope?.hallmark_ids ?? []).map((id) => getHallmarkById(id)?.name ?? id),
    ...(bundle.scope?.track_ids ?? []).map((id) => getTrackById(id)?.name ?? id),
    ...(bundle.scope?.intervention_ids ?? [])
  ];
}

export default async function BundleDetailPage({ params }: BundleDetailPageProps) {
  const { bundleId } = await params;
  const [bundle, promotion, evidenceReviewGate, evidenceReviews, reviewComments, publicationEvents, lastUpdated] =
    await Promise.all([
    getCandidateBundleById(bundleId),
    getCandidateBundlePromotionReadiness(bundleId),
    getCandidateBundleEvidenceReviewReadiness(bundleId),
    getEvidenceReviewsForBundle(bundleId),
    getReviewCommentsForBundle(bundleId),
    getPublicationEventsForBundle(bundleId),
    getOverallLastUpdated()
    ]);

  if (!bundle || !promotion || !evidenceReviewGate) {
    notFound();
  }

  const scopeItems = getScopeItems(bundle);
  const reviewLocked = ["published", "rejected"].includes(bundle.lifecycle_status);
  const approveLocked =
    !canTransitionStatus(bundle.lifecycle_status, "approved") ||
    (evidenceReviewGate.eligible && !evidenceReviewGate.ready);
  const publishLocked = !promotion.ready || (evidenceReviewGate.eligible && !evidenceReviewGate.ready);
  const promotionByChangeId = new Map(promotion.changes.map((change) => [change.changeId, change]));
  const currentRevision = bundle.revision_number ?? 1;
  const evidenceReviewState = !evidenceReviewGate.eligible
    ? "Not required"
    : evidenceReviewGate.ready
      ? "Complete"
      : "Blocking issues";
  const promotionState =
    bundle.lifecycle_status === "published"
      ? "Published"
      : promotion.ready
        ? "Ready to publish"
        : promotion.eligible
          ? "Approved but blocked"
          : "Not yet eligible";

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Admin review"
        title={bundle.name}
        summary={bundle.summary ?? "Staged update awaiting editorial handling."}
      >
        <div className="page-hero__stats">
          <span>{getStatusLabel(bundle.lifecycle_status)}</span>
          <span>{bundle.intake_mode}</span>
          <span>Revision {bundle.revision_number ?? 1}</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell admin-detail-grid">
          <article className="detail-panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Proposed changes</span>
                <h2>{bundle.proposed_changes.length} items in this bundle</h2>
              </div>
              <Link className="mini-link" href="/admin/review">
                Back to queue
              </Link>
            </div>
            <div className="admin-change-list">
              {bundle.proposed_changes.map((change) => (
                <article className="admin-change-item" key={change.change_id}>
                  <div className="admin-change-item__header">
                    <span className="micro-badge micro-badge--outline">{change.change_type}</span>
                    <span className="micro-badge micro-badge--outline">{change.target_record_type}</span>
                  </div>
                  <strong>{change.summary}</strong>
                  <p>{change.rationale}</p>
                  {promotionByChangeId.get(change.change_id)?.targetFilePath ? (
                    <code>{promotionByChangeId.get(change.change_id)?.targetFilePath}</code>
                  ) : null}
                  {promotionByChangeId.get(change.change_id)?.stagedFilePath ? (
                    <code>{promotionByChangeId.get(change.change_id)?.stagedFilePath}</code>
                  ) : null}
                  {change.uncertainty_flags?.length ? (
                    <ul className="bullet-list">
                      {change.uncertainty_flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  ) : null}
                  {promotionByChangeId.get(change.change_id)?.issues.length ? (
                    <ul className="bullet-list">
                      {promotionByChangeId.get(change.change_id)?.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted admin-sidebar">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Editorial controls</span>
              <h2>
                <span className={`micro-badge ${getStatusTone(bundle.lifecycle_status)}`}>
                  {getStatusLabel(bundle.lifecycle_status)}
                </span>
              </h2>
            </div>

            <div className="detail-list">
              <div>
                <strong>Scope</strong>
                <p>{scopeItems.length ? scopeItems.join(" / ") : "No explicit scope recorded."}</p>
              </div>
              <div>
                <strong>Question</strong>
                <p>{bundle.scope?.question ?? "No scoped question recorded."}</p>
              </div>
              <div>
                <strong>Next actions</strong>
                <p>{bundle.next_actions?.join(" ") ?? "No next actions recorded."}</p>
              </div>
              <div>
                <strong>Promotion state</strong>
                <p>{promotionState}</p>
              </div>
              <div>
                <strong>Evidence review state</strong>
                <p>{evidenceReviewState}</p>
              </div>
              {evidenceReviewGate.eligible ? (
                <div>
                  <strong>Required lanes</strong>
                  <p>{evidenceReviewGate.requiredLanes.map((lane) => getLaneLabel(lane)).join(" / ")}</p>
                </div>
              ) : null}
            </div>

            {promotion.issues.length ? (
              <ul className="bullet-list">
                {promotion.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}

            {evidenceReviewGate.issues.length ? (
              <ul className="bullet-list">
                {evidenceReviewGate.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}

            <div className="admin-button-row">
              <form action={setBundleStatusAction}>
                <input name="bundleId" type="hidden" value={bundle.id} />
                <input name="status" type="hidden" value="in_review" />
                <button
                  className="action-button"
                  disabled={!canTransitionStatus(bundle.lifecycle_status, "in_review")}
                  type="submit"
                >
                  Start review
                </button>
              </form>
              <form action={setBundleStatusAction}>
                <input name="bundleId" type="hidden" value={bundle.id} />
                <input name="status" type="hidden" value="approved" />
                <button className="action-button" disabled={approveLocked} type="submit">
                  Approve
                </button>
              </form>
              <form action={setBundleStatusAction}>
                <input name="bundleId" type="hidden" value={bundle.id} />
                <input name="status" type="hidden" value="rejected" />
                <button
                  className="action-button action-button--danger"
                  disabled={!canTransitionStatus(bundle.lifecycle_status, "rejected")}
                  type="submit"
                >
                  Reject
                </button>
              </form>
              <form action={publishBundleAction}>
                <input name="bundleId" type="hidden" value={bundle.id} />
                <button className="action-button" disabled={publishLocked} type="submit">
                  Publish
                </button>
              </form>
            </div>

            <form action={submitReviewCommentAction} className="admin-form">
              <input name="bundleId" type="hidden" value={bundle.id} />
              <label className="admin-field">
                <span>Reviewer comment</span>
                <textarea
                  className="admin-textarea"
                  disabled={reviewLocked}
                  name="body"
                  placeholder="Add a note or request a revision."
                  required
                  rows={6}
                />
              </label>

              <label className="admin-field">
                <span>Applies to change</span>
                <select className="admin-select" defaultValue="" disabled={reviewLocked} name="appliesToChangeId">
                  <option value="">General bundle comment</option>
                  {bundle.proposed_changes.map((change) => (
                    <option key={change.change_id} value={change.change_id}>
                      {change.summary}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Applies to evidence review</span>
                <select
                  className="admin-select"
                  defaultValue=""
                  disabled={reviewLocked}
                  name="appliesToEvidenceReviewId"
                >
                  <option value="">No specific evidence review</option>
                  {evidenceReviews.map((review) => (
                    <option key={review.id} value={review.id}>
                      {getLaneLabel(review.review_lane)} / revision {review.bundle_revision_number} / round{" "}
                      {review.review_round}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Applies to finding</span>
                <select className="admin-select" defaultValue="" disabled={reviewLocked} name="appliesToFindingId">
                  <option value="">No specific finding</option>
                  {evidenceReviews.flatMap((review) =>
                    review.findings.map((finding) => (
                      <option key={`${review.id}:${finding.finding_id}`} value={finding.finding_id}>
                        {getLaneLabel(review.review_lane)} / {finding.finding_id}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="admin-button-row">
                <button className="action-button" disabled={reviewLocked} name="intent" type="submit" value="note">
                  Save note
                </button>
                <button
                  className="action-button action-button--danger"
                  disabled={reviewLocked}
                  name="intent"
                  type="submit"
                  value="request_changes"
                >
                  Request changes
                </button>
              </div>
            </form>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Evidence reviews</span>
              <h2>{evidenceReviews.length} review records</h2>
            </div>
            <div className="admin-comment-list">
              {evidenceReviews.length ? (
                evidenceReviews.map((review) => (
                  <article className="admin-comment" key={review.id}>
                    <div className="admin-comment__header">
                      <div className="review-card__meta">
                        <span className="micro-badge micro-badge--outline">{getLaneLabel(review.review_lane)}</span>
                        <span className={`micro-badge ${getEvidenceVerdictTone(review.verdict)}`}>
                          {getStatusLabel(review.verdict)}
                        </span>
                        {review.status === "superseded" ? (
                          <span className="micro-badge micro-badge--muted">superseded</span>
                        ) : null}
                        {review.blocking ? <span className="micro-badge micro-badge--red">blocking</span> : null}
                      </div>
                      <time dateTime={review.created_at ?? bundle.submitted_at}>
                        {formatDate(review.created_at ?? bundle.submitted_at)}
                      </time>
                    </div>
                    <strong>{review.name}</strong>
                    <p>{review.summary}</p>
                    <div className="review-card__meta">
                      <span>{review.reviewer_kind === "human" ? review.reviewer_id ?? "human reviewer" : review.skill_name ?? "agent review"}</span>
                      <span>Revision {review.bundle_revision_number}</span>
                      <span>Round {review.review_round}</span>
                      {review.bundle_revision_number === currentRevision ? <span>current revision</span> : null}
                    </div>
                    {review.findings.length ? (
                      <ul className="bullet-list">
                        {review.findings.map((finding) => (
                          <li key={finding.finding_id}>
                            <span className={`micro-badge ${getFindingTone(finding.severity)}`}>
                              {getStatusLabel(finding.severity)}
                            </span>{" "}
                            <span className="micro-badge micro-badge--outline">
                              {getStatusLabel(finding.category)}
                            </span>{" "}
                            {finding.claim_or_issue} Resolution: {getStatusLabel(finding.resolution_status)}.{" "}
                            {finding.recommended_action}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No findings recorded.</p>
                    )}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <p className="section-kicker">No evidence reviews</p>
                  <h1>No structured verification has been recorded yet.</h1>
                </div>
              )}
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="admin-section-stack">
              <div>
                <div className="panel-header panel-header--stacked">
                  <span className="section-kicker">Review thread</span>
                  <h2>{reviewComments.length} comments</h2>
                </div>
                <div className="admin-comment-list">
                  {reviewComments.length ? (
                    reviewComments.map((comment) => (
                  <article className="admin-comment" key={comment.id}>
                    <div className="admin-comment__header">
                      <span className={`micro-badge ${getStatusTone(comment.comment_type)}`}>
                        {comment.comment_type.replace(/_/g, " ")}
                      </span>
                      <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
                    </div>
                    <p>{comment.body}</p>
                    <div className="review-card__meta">
                      <span>{comment.author_role.replace(/_/g, " ")}</span>
                      {comment.applies_to_change_id ? <span>{comment.applies_to_change_id}</span> : null}
                      {comment.applies_to_evidence_review_id ? (
                        <span>{comment.applies_to_evidence_review_id}</span>
                      ) : null}
                      {comment.applies_to_finding_id ? <span>{comment.applies_to_finding_id}</span> : null}
                      <span>{comment.resolution_status.replace(/_/g, " ")}</span>
                    </div>
                  </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p className="section-kicker">No comments</p>
                      <h1>Review has not started yet.</h1>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="panel-header panel-header--stacked">
                  <span className="section-kicker">Publication history</span>
                  <h2>{publicationEvents.length} events</h2>
                </div>
                <div className="admin-comment-list">
                  {publicationEvents.length ? (
                    publicationEvents.map((event) => (
                  <article className="admin-comment" key={event.id}>
                    <div className="admin-comment__header">
                      <span className="micro-badge micro-badge--mint">{event.event_type}</span>
                      <time dateTime={event.published_at}>{formatDate(event.published_at)}</time>
                    </div>
                    <strong>{event.name}</strong>
                    <p>{event.change_note ?? event.summary ?? "Published change."}</p>
                    {event.approving_evidence_review_ids?.length ? (
                      <div className="review-card__meta">
                        <span>{event.approving_evidence_review_ids.length} evidence reviews recorded</span>
                      </div>
                    ) : null}
                  </article>
                    ))
                  ) : (
                    <p>No public updates yet.</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
