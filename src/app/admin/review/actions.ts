"use server";

import { redirect } from "next/navigation";

import {
  appendReviewComment,
  publishCandidateBundle,
  updateCandidateBundleStatus,
  type CandidateStatus,
  type ReviewCommentRecord
} from "@/lib/site-data";

const allowedStatuses = new Set<CandidateStatus>([
  "submitted",
  "in_review",
  "needs_revision",
  "revised",
  "approved",
  "published",
  "rejected"
]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBundlePath(bundleId: string) {
  return `/admin/review/${bundleId}`;
}

export async function setBundleStatusAction(formData: FormData) {
  const bundleId = getString(formData, "bundleId");
  const status = getString(formData, "status") as CandidateStatus;

  if (!bundleId || !allowedStatuses.has(status)) {
    throw new Error("Invalid review action.");
  }

  await updateCandidateBundleStatus(bundleId, status);
  redirect(getBundlePath(bundleId));
}

export async function submitReviewCommentAction(formData: FormData) {
  const bundleId = getString(formData, "bundleId");
  const body = getString(formData, "body");
  const appliesToChangeId = getString(formData, "appliesToChangeId");
  const appliesToEvidenceReviewId = getString(formData, "appliesToEvidenceReviewId");
  const appliesToFindingId = getString(formData, "appliesToFindingId");
  const intent = getString(formData, "intent");

  if (!bundleId || !body) {
    throw new Error("Bundle and comment body are required.");
  }

  let commentType: ReviewCommentRecord["comment_type"] = "note";

  if (intent === "request_changes") {
    commentType = "request_changes";
  }

  await appendReviewComment({
    bundleId,
    commentType,
    body,
    appliesToChangeId: appliesToChangeId || undefined,
    appliesToEvidenceReviewId: appliesToEvidenceReviewId || undefined,
    appliesToFindingId: appliesToFindingId || undefined
  });

  if (intent === "request_changes") {
    await updateCandidateBundleStatus(bundleId, "needs_revision");
  }

  redirect(getBundlePath(bundleId));
}

export async function publishBundleAction(formData: FormData) {
  const bundleId = getString(formData, "bundleId");

  if (!bundleId) {
    throw new Error("Bundle ID is required.");
  }

  await publishCandidateBundle(bundleId);
  redirect(getBundlePath(bundleId));
}
