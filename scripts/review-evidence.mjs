#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const workspaceRoot = process.cwd();
const candidateBundlesRoot = path.join(workspaceRoot, "data", "candidate-bundles");
const evidenceReviewsRoot = path.join(workspaceRoot, "data", "evidence-reviews");
const draftEvidenceReviewsRoot = path.join(workspaceRoot, "research", "drafts", "evidence-reviews");

const reviewLanes = new Set([
  "source_fidelity",
  "interpretation_forecast",
  "safety_limitations",
  "taxonomy_mapping",
  "forecast_calibration"
]);

const reviewerKinds = new Set(["agent", "human"]);
const reviewStatuses = new Set(["complete", "superseded"]);
const reviewVerdicts = new Set(["accept", "needs_revision", "reject", "needs_human_judgment"]);
const findingSeverities = new Set(["critical", "major", "minor", "note"]);
const findingCategories = new Set([
  "source_mismatch",
  "endpoint_boundary",
  "interpretation_overreach",
  "missing_caveat",
  "activity_vs_evidence",
  "safety_limitation",
  "taxonomy_mapping",
  "forecast_overreach",
  "uncertainty",
  "other"
]);
const findingResolutionStates = new Set(["open", "addressed", "closed"]);

function usage(exitCode = 0) {
  const message = `
Usage:
  npm run research:review-evidence -- status --bundle <bundle-id>
  npm run research:review-evidence -- scaffold --bundle <bundle-id> --lane <lane> [--reviewer-kind agent|human] [--reviewer-id <id>] [--review-round <n>] [--output <path>] [--dry-run]
  npm run research:review-evidence -- apply --file <draft-path> [--keep-draft]

Notes:
  - scaffold writes a draft review JSON under research/drafts/evidence-reviews/ by default.
  - apply promotes a completed review into data/evidence-reviews/ and updates bundle metadata.
  - lanes: source_fidelity, interpretation_forecast, safety_limitations, taxonomy_mapping, forecast_calibration
`.trim();

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function titleCaseFromIdentifier(value) {
  return value
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPosixRelative(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

function isPlaceholderText(value) {
  return typeof value === "string" && value.includes("TODO:");
}

function parseInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fail(`${label} must be a positive integer.`);
  }

  return parsed;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withFileLock(lockPath, fn) {
  let handle;

  try {
    handle = await fs.open(lockPath, "wx");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
      fail(`Lock already exists: ${toPosixRelative(lockPath)}. Retry after the current apply finishes.`);
    }

    throw error;
  }

  try {
    return await fn();
  } finally {
    await handle.close();
    await fs.rm(lockPath, { force: true });
  }
}

async function loadCandidateBundle(bundleId) {
  const bundlePath = path.join(candidateBundlesRoot, `${bundleId}.json`);
  if (!(await fileExists(bundlePath))) {
    fail(`Bundle not found: ${toPosixRelative(bundlePath)}`);
  }

  return {
    filePath: bundlePath,
    record: await readJson(bundlePath)
  };
}

async function loadEvidenceReviews() {
  if (!(await fileExists(evidenceReviewsRoot))) {
    return [];
  }

  const fileNames = (await fs.readdir(evidenceReviewsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => ({
      filePath: path.join(evidenceReviewsRoot, fileName),
      record: await readJson(path.join(evidenceReviewsRoot, fileName))
    }))
  );
}

function getBundleScopeSlug(bundle) {
  const trackId = bundle.scope?.track_ids?.[0];
  if (trackId) {
    return trackId;
  }

  const hallmarkId = bundle.scope?.hallmark_ids?.[0];
  if (hallmarkId) {
    return hallmarkId;
  }

  return bundle.id;
}

function getCurrentRevision(bundle) {
  return bundle.revision_number ?? 1;
}

function getMatchingReviews(reviews, bundleId, revisionNumber) {
  return reviews.filter(
    ({ record }) =>
      record.candidate_bundle_id === bundleId && record.bundle_revision_number === revisionNumber
  );
}

function deriveReviewRound(revisionReviews, laneReviews, explicitReviewRound) {
  if (explicitReviewRound) {
    return explicitReviewRound;
  }

  if (laneReviews.length > 0) {
    return Math.max(...revisionReviews.map(({ record }) => record.review_round ?? 1)) + 1;
  }

  if (revisionReviews.length > 0) {
    return Math.max(...revisionReviews.map(({ record }) => record.review_round ?? 1));
  }

  return 1;
}

function deriveReviewId(bundle, lane, revisionNumber, reviewRound, laneReviews) {
  const laneSlug = lane.replaceAll("_", "-");
  const base = `evidence-review-${bundle.id}-${laneSlug}-r${revisionNumber}`;
  return laneReviews.length > 0 ? `${base}-round-${reviewRound}` : base;
}

function deriveReviewName(bundle, lane) {
  const laneName = titleCaseFromIdentifier(lane);
  const scopeName = titleCaseFromIdentifier(getBundleScopeSlug(bundle));
  return `${laneName} review for ${scopeName} bundle`;
}

function buildDraftReview({
  bundle,
  lane,
  reviewerKind,
  reviewerId,
  reviewRound,
  existingLaneReviews
}) {
  const revisionNumber = getCurrentRevision(bundle);
  const reviewId = deriveReviewId(bundle, lane, revisionNumber, reviewRound, existingLaneReviews);
  const draftReview = {
    __draft: {
      generated_at: new Date().toISOString(),
      generated_by: "scripts/review-evidence.mjs",
      output_path: `data/evidence-reviews/${reviewId}.json`,
      supersedes_review_ids: existingLaneReviews
        .filter(({ record }) => record.status === "complete")
        .map(({ record }) => record.id),
      instructions: [
        "Replace placeholder summary, verdict, blocking flag, and findings after completing the review.",
        "Keep reviewed_change_ids aligned with the bundle changes actually covered by this pass."
      ]
    },
    schema_version: "1.0.0",
    record_type: "evidence_review",
    id: reviewId,
    name: deriveReviewName(bundle, lane),
    candidate_bundle_id: bundle.id,
    bundle_revision_number: revisionNumber,
    review_round: reviewRound,
    review_lane: lane,
    reviewer_kind: reviewerKind,
    status: "complete",
    verdict: "needs_human_judgment",
    blocking: true,
    summary: "TODO: replace with a bounded evidence-review summary.",
    reviewed_change_ids: bundle.proposed_changes.map((change) => change.change_id),
    findings: []
  };

  if (reviewerKind === "human") {
    draftReview.reviewer_id = reviewerId ?? "tyler";
  } else {
    draftReview.skill_name = "lev-evidence-review";
    if (reviewerId) {
      draftReview.reviewer_id = reviewerId;
    }
  }

  return draftReview;
}

function validateReviewShape(review, bundle) {
  const requiredStringFields = [
    "schema_version",
    "record_type",
    "id",
    "name",
    "candidate_bundle_id",
    "review_lane",
    "reviewer_kind",
    "status",
    "verdict",
    "summary"
  ];

  for (const field of requiredStringFields) {
    if (typeof review[field] !== "string" || review[field].trim().length === 0) {
      fail(`Review field ${field} must be a non-empty string.`);
    }
  }

  if (review.schema_version !== "1.0.0") {
    fail("Review schema_version must be 1.0.0.");
  }

  if (review.record_type !== "evidence_review") {
    fail("Review record_type must be evidence_review.");
  }

  if (review.candidate_bundle_id !== bundle.id) {
    fail("Review candidate_bundle_id does not match the target bundle.");
  }

  const revisionNumber = getCurrentRevision(bundle);
  if (!Number.isInteger(review.bundle_revision_number) || review.bundle_revision_number !== revisionNumber) {
    fail(`Review bundle_revision_number must match the bundle revision (${revisionNumber}).`);
  }

  if (!Number.isInteger(review.review_round) || review.review_round < 1) {
    fail("Review review_round must be a positive integer.");
  }

  if (!reviewLanes.has(review.review_lane)) {
    fail(`Unsupported review lane: ${review.review_lane}`);
  }

  if (!reviewerKinds.has(review.reviewer_kind)) {
    fail(`Unsupported reviewer kind: ${review.reviewer_kind}`);
  }

  if (!reviewStatuses.has(review.status)) {
    fail(`Unsupported review status: ${review.status}`);
  }

  if (!reviewVerdicts.has(review.verdict)) {
    fail(`Unsupported review verdict: ${review.verdict}`);
  }

  if (typeof review.blocking !== "boolean") {
    fail("Review blocking must be a boolean.");
  }

  if (review.reviewer_kind === "agent" && typeof review.skill_name !== "string") {
    fail("Agent review must include skill_name.");
  }

  if (review.reviewer_kind === "human" && typeof review.reviewer_id !== "string") {
    fail("Human review must include reviewer_id.");
  }

  if (isPlaceholderText(review.summary)) {
    fail("Review summary still contains a TODO placeholder.");
  }

  if (!Array.isArray(review.reviewed_change_ids) || review.reviewed_change_ids.length === 0) {
    fail("Review reviewed_change_ids must contain at least one bundle change.");
  }

  const validChangeIds = new Set(bundle.proposed_changes.map((change) => change.change_id));
  for (const changeId of review.reviewed_change_ids) {
    if (!validChangeIds.has(changeId)) {
      fail(`Review references unknown change_id: ${changeId}`);
    }
  }

  if (!Array.isArray(review.findings)) {
    fail("Review findings must be an array.");
  }

  review.findings.forEach((finding, index) => {
    if (typeof finding.finding_id !== "string" || finding.finding_id.length === 0) {
      fail(`Finding ${index + 1} is missing finding_id.`);
    }

    if (!findingSeverities.has(finding.severity)) {
      fail(`Finding ${finding.finding_id} has unsupported severity: ${finding.severity}`);
    }

    if (!findingCategories.has(finding.category)) {
      fail(`Finding ${finding.finding_id} has unsupported category: ${finding.category}`);
    }

    if (!findingResolutionStates.has(finding.resolution_status)) {
      fail(
        `Finding ${finding.finding_id} has unsupported resolution_status: ${finding.resolution_status}`
      );
    }

    for (const field of ["claim_or_issue", "why_it_matters", "recommended_action"]) {
      if (typeof finding[field] !== "string" || finding[field].trim().length === 0) {
        fail(`Finding ${finding.finding_id} is missing ${field}.`);
      }

      if (isPlaceholderText(finding[field])) {
        fail(`Finding ${finding.finding_id} still contains a TODO placeholder in ${field}.`);
      }
    }

    if (finding.applies_to_change_id && !validChangeIds.has(finding.applies_to_change_id)) {
      fail(
        `Finding ${finding.finding_id} references unknown applies_to_change_id: ${finding.applies_to_change_id}`
      );
    }
  });
}

function summarizeReviewState(bundle, reviews) {
  const revisionNumber = getCurrentRevision(bundle);
  const revisionReviews = getMatchingReviews(reviews, bundle.id, revisionNumber).filter(
    ({ record }) => record.status === "complete"
  );
  const requiredLanes = bundle.required_review_lanes ?? [];
  const minReviewsPerLane = bundle.review_requirement?.min_complete_reviews_per_lane ?? 1;
  const blockOnOpenCriticalFindings = bundle.review_requirement?.block_on_open_critical_findings ?? true;
  const blockOnOpenMajorFindings = bundle.review_requirement?.block_on_open_major_findings ?? false;

  const laneCounts = new Map();
  for (const { record } of revisionReviews) {
    laneCounts.set(record.review_lane, (laneCounts.get(record.review_lane) ?? 0) + 1);
  }

  const missingLanes = requiredLanes.filter((lane) => (laneCounts.get(lane) ?? 0) < minReviewsPerLane);
  const blockingReviewIds = revisionReviews
    .filter(({ record }) => record.blocking || record.verdict === "needs_revision" || record.verdict === "reject")
    .map(({ record }) => record.id);

  const openBlockingFindings = revisionReviews.flatMap(({ record }) =>
    record.findings
      .filter((finding) => {
        if (finding.resolution_status === "closed") {
          return false;
        }

        if (finding.severity === "critical") {
          return blockOnOpenCriticalFindings;
        }

        if (finding.severity === "major") {
          return blockOnOpenMajorFindings;
        }

        return false;
      })
      .map((finding) => ({
        review_id: record.id,
        finding_id: finding.finding_id,
        severity: finding.severity,
        category: finding.category
      }))
  );

  return {
    bundle_id: bundle.id,
    lifecycle_status: bundle.lifecycle_status,
    revision_number: revisionNumber,
    required_lanes: requiredLanes,
    completed_reviews: revisionReviews.map(({ record }) => ({
      id: record.id,
      lane: record.review_lane,
      round: record.review_round,
      verdict: record.verdict,
      blocking: record.blocking,
      status: record.status
    })),
    missing_lanes: missingLanes,
    blocking_review_ids: blockingReviewIds,
    open_blocking_findings: openBlockingFindings,
    ready: requiredLanes.length > 0 && missingLanes.length === 0 && blockingReviewIds.length === 0 && openBlockingFindings.length === 0
  };
}

async function commandStatus(options) {
  const bundleId = options.bundle;
  if (!bundleId) {
    fail("status requires --bundle <bundle-id>.");
  }

  const { record: bundle } = await loadCandidateBundle(bundleId);
  const reviews = await loadEvidenceReviews();
  process.stdout.write(`${JSON.stringify(summarizeReviewState(bundle, reviews), null, 2)}\n`);
}

async function commandScaffold(options) {
  const bundleId = options.bundle;
  const lane = options.lane;
  if (!bundleId || !lane) {
    fail("scaffold requires --bundle <bundle-id> and --lane <lane>.");
  }

  if (!reviewLanes.has(lane)) {
    fail(`Unsupported lane: ${lane}`);
  }

  const reviewerKind = options["reviewer-kind"] ?? "agent";
  if (!reviewerKinds.has(reviewerKind)) {
    fail(`Unsupported reviewer kind: ${reviewerKind}`);
  }

  const explicitReviewRound = options["review-round"]
    ? parseInteger(options["review-round"], "--review-round")
    : undefined;

  const { record: bundle } = await loadCandidateBundle(bundleId);
  const reviews = await loadEvidenceReviews();
  const revisionReviews = getMatchingReviews(reviews, bundle.id, getCurrentRevision(bundle));
  const laneReviews = revisionReviews.filter(({ record }) => record.review_lane === lane);
  const reviewRound = deriveReviewRound(revisionReviews, laneReviews, explicitReviewRound);
  const draftReview = buildDraftReview({
    bundle,
    lane,
    reviewerKind,
    reviewerId: options["reviewer-id"],
    reviewRound,
    existingLaneReviews: laneReviews
  });

  if (options["dry-run"]) {
    process.stdout.write(`${JSON.stringify(draftReview, null, 2)}\n`);
    return;
  }

  const outputPath = options.output
    ? path.resolve(workspaceRoot, options.output)
    : path.join(draftEvidenceReviewsRoot, `${draftReview.id}.json`);

  await writeJson(outputPath, draftReview);

  process.stdout.write(
    `${JSON.stringify(
      {
        action: "scaffolded",
        bundle_id: bundle.id,
        lane,
        output_path: toPosixRelative(outputPath),
        review_id: draftReview.id,
        review_round: draftReview.review_round
      },
      null,
      2
    )}\n`
  );
}

async function commandApply(options) {
  const filePathOption = options.file;
  if (!filePathOption) {
    fail("apply requires --file <draft-path>.");
  }

  const sourceFilePath = path.resolve(workspaceRoot, filePathOption);
  if (!(await fileExists(sourceFilePath))) {
    fail(`Review file not found: ${toPosixRelative(sourceFilePath)}`);
  }

  const draftReview = await readJson(sourceFilePath);
  const bundleId = draftReview.candidate_bundle_id;
  if (typeof bundleId !== "string" || bundleId.length === 0) {
    fail("Review file must include candidate_bundle_id.");
  }

  const { filePath: bundlePath, record: bundle } = await loadCandidateBundle(bundleId);
  validateReviewShape(draftReview, bundle);

  const reviews = await loadEvidenceReviews();
  const revisionNumber = getCurrentRevision(bundle);
  const sameLaneReviews = getMatchingReviews(reviews, bundle.id, revisionNumber).filter(
    ({ record }) => record.review_lane === draftReview.review_lane && record.id !== draftReview.id && record.status === "complete"
  );

  const timestamp = new Date().toISOString();
  for (const existingReview of sameLaneReviews) {
    const supersededReview = {
      ...existingReview.record,
      status: "superseded",
      updated_at: timestamp
    };

    await writeJson(existingReview.filePath, supersededReview);
  }

  const finalReview = { ...draftReview };
  delete finalReview.__draft;

  if (!finalReview.created_at) {
    finalReview.created_at = timestamp;
  }
  finalReview.updated_at = timestamp;

  const finalReviewPath = path.join(evidenceReviewsRoot, `${finalReview.id}.json`);
  if (await fileExists(finalReviewPath)) {
    const existingReview = await readJson(finalReviewPath);
    if (existingReview.candidate_bundle_id !== bundleId) {
      fail(
        `Refusing to overwrite ${toPosixRelative(finalReviewPath)}: existing review belongs to ${existingReview.candidate_bundle_id}, not ${bundleId}.`
      );
    }
  }

  await writeJson(finalReviewPath, finalReview);

  await withFileLock(`${bundlePath}.lock`, async () => {
    const { record: latestBundle } = await loadCandidateBundle(bundleId);
    const nextReviewIds = Array.from(new Set([...(latestBundle.evidence_review_ids ?? []), finalReview.id]));
    const updatedBundle = {
      ...latestBundle,
      evidence_review_ids: nextReviewIds
    };
    await writeJson(bundlePath, updatedBundle);
  });

  if (!options["keep-draft"] && sourceFilePath.startsWith(`${draftEvidenceReviewsRoot}${path.sep}`)) {
    await fs.rm(sourceFilePath);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        action: "applied",
        bundle_id: bundle.id,
        review_id: finalReview.id,
        review_lane: finalReview.review_lane,
        superseded_review_ids: sameLaneReviews.map(({ record }) => record.id),
        final_review_path: toPosixRelative(finalReviewPath)
      },
      null,
      2
    )}\n`
  );
}

async function main() {
  const [, , commandName, ...rest] = process.argv;
  if (!commandName || commandName === "--help" || commandName === "-h") {
    usage(0);
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      bundle: { type: "string" },
      lane: { type: "string" },
      file: { type: "string" },
      output: { type: "string" },
      "reviewer-kind": { type: "string" },
      "reviewer-id": { type: "string" },
      "review-round": { type: "string" },
      "keep-draft": { type: "boolean" },
      "dry-run": { type: "boolean" }
    },
    allowPositionals: false
  });

  switch (commandName) {
    case "status":
      await commandStatus(values);
      break;
    case "scaffold":
      await commandScaffold(values);
      break;
    case "apply":
      await commandApply(values);
      break;
    default:
      usage(1);
  }
}

await main();
