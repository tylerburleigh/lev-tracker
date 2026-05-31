import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import hallmarksTaxonomy from "../../taxonomies/hallmarks-of-aging.v1.json";
import trackTaxonomy from "../../taxonomies/track-taxonomy.v1.json";

export type Stage =
  | "mechanistic_plausibility"
  | "animal_signal"
  | "human_biomarker_signal"
  | "human_functional_benefit"
  | "durable_disease_or_mortality_relevance";

export type Momentum = "accelerating" | "steady" | "mixed" | "stalled" | "uncertain";
export type Confidence = "low" | "moderate" | "high";
export type ScenarioStatus = "unsupported" | "speculative" | "plausible" | "on_track";
export type SubjectType = "overall" | "hallmark" | "track" | "intervention";
export type EvidenceReviewLane =
  | "source_fidelity"
  | "interpretation_forecast"
  | "safety_limitations"
  | "taxonomy_mapping"
  | "forecast_calibration";
export type CandidateStatus =
  | "submitted"
  | "in_review"
  | "needs_revision"
  | "revised"
  | "approved"
  | "published"
  | "rejected";
export type EvidenceReviewStatus = "complete" | "superseded";
export type EvidenceReviewVerdict = "accept" | "needs_revision" | "reject" | "needs_human_judgment";
export type EvidenceReviewerKind = "agent" | "human";
export type EvidenceReviewFindingSeverity = "critical" | "major" | "minor" | "note";
export type EvidenceReviewFindingCategory =
  | "source_mismatch"
  | "endpoint_boundary"
  | "interpretation_overreach"
  | "missing_caveat"
  | "activity_vs_evidence"
  | "safety_limitation"
  | "taxonomy_mapping"
  | "forecast_overreach"
  | "uncertainty"
  | "other";
export type EvidenceReviewFindingResolution = "open" | "addressed" | "closed";

export type Hallmark = (typeof hallmarksTaxonomy.hallmarks)[number];
export type TrackGroup = (typeof trackTaxonomy.hallmark_groups)[number];
export type TaxonomyTrack = TrackGroup["tracks"][number];

export type OutlookFile = {
  id: string;
  name: string;
  subject_type: SubjectType;
  subject_id: string;
  current_stage: Stage;
  momentum: Momentum;
  confidence: Confidence;
  main_blockers?: string[];
  best_current_signals?: string[];
  forecast_note: string;
  last_updated: string;
  scenario_2036_status?: ScenarioStatus;
  tags?: string[];
};

export type OutlookRecord = {
  id: string;
  subjectId: string;
  subjectType: SubjectType;
  name: string;
  stage: Stage;
  momentum: Momentum;
  confidence: Confidence;
  blocker: string;
  bestSignal: string;
  note: string;
  lastUpdated: string;
  thinCoverage?: boolean;
  scenario2036Status?: ScenarioStatus;
};

export type TrackCoverage = {
  stage?: Stage;
  momentum?: Momentum;
  confidence?: Confidence;
  blocker?: string;
  bestSignal?: string;
  note: string;
  lastUpdated: string;
  thinCoverage?: boolean;
  statusLabel?: string;
  outlookId?: string;
};

export type ActivityItemRecord = {
  id: string;
  name: string;
  summary: string;
  activity_type: string;
  activity_lane: string;
  occurred_on: string;
  hallmark_ids?: string[];
  track_ids?: string[];
  affects_outlook?: boolean;
  significance_note?: string;
};

export type ActivityFeedItem = {
  id: string;
  date: string;
  lane: string;
  title: string;
  summary: string;
  affectsOutlook: boolean;
  hallmarkId: string;
  href: string;
};

export type PublicationEventRecord = {
  id: string;
  name: string;
  summary?: string;
  candidate_bundle_id: string;
  event_type: string;
  published_at: string;
  published_by: string;
  published_targets: Array<{
    record_type: string;
    record_id: string;
    action: string;
  }>;
  affected_outlook_ids?: string[];
  approving_evidence_review_ids?: string[];
  change_note?: string;
};

export type RecentChange = {
  id: string;
  date: string;
  title: string;
  changeType: "outlook" | "milestone" | "finding" | "activity";
  subject: string;
  whyItMatters: string;
  href: string;
};

export type CandidateBundleChange = {
  change_id: string;
  change_type: string;
  target_record_type: string;
  target_record_id?: string;
  file_path?: string;
  staged_file_path?: string;
  summary: string;
  rationale: string;
  uncertainty_flags?: string[];
};

export type CandidateBundleRecord = {
  id: string;
  name: string;
  summary?: string;
  intake_mode: "bootstrap" | "surveillance" | "manual";
  lifecycle_status: CandidateStatus;
  submitted_at: string;
  submitted_by?: string;
  revision_number?: number;
  review_comment_ids?: string[];
  evidence_review_ids?: string[];
  required_review_lanes?: EvidenceReviewLane[];
  review_requirement?: {
    min_complete_reviews_per_lane?: number;
    block_on_open_critical_findings?: boolean;
    block_on_open_major_findings?: boolean;
  };
  publication_event_ids?: string[];
  related_records?: Array<{
    record_type: string;
    record_id: string;
  }>;
  proposed_changes: CandidateBundleChange[];
  proposed_outlook_implications?: Array<{
    subject_type: SubjectType;
    subject_id: string;
    note: string;
    confidence?: Confidence;
  }>;
  next_actions?: string[];
  scope?: {
    question?: string;
    hallmark_ids?: string[];
    track_ids?: string[];
    intervention_ids?: string[];
  };
};

export type ReviewCommentRecord = {
  id: string;
  name: string;
  candidate_bundle_id: string;
  author_role: "agent" | "human_reviewer";
  comment_type: "note" | "question" | "request_changes" | "approval" | "rejection" | "response";
  body: string;
  created_at: string;
  resolution_status: "open" | "addressed" | "closed";
  parent_comment_id?: string;
  applies_to_change_id?: string;
  applies_to_evidence_review_id?: string;
  applies_to_finding_id?: string;
  applies_to_record?: {
    record_type: string;
    record_id: string;
  };
};

export type EvidenceReviewFindingRecord = {
  finding_id: string;
  severity: EvidenceReviewFindingSeverity;
  category: EvidenceReviewFindingCategory;
  applies_to_change_id?: string;
  applies_to_record?: {
    record_type: string;
    record_id: string;
  };
  claim_or_issue: string;
  why_it_matters: string;
  recommended_action: string;
  resolution_status: EvidenceReviewFindingResolution;
};

export type EvidenceReviewRecord = {
  id: string;
  name: string;
  candidate_bundle_id: string;
  bundle_revision_number: number;
  review_round: number;
  review_lane: EvidenceReviewLane;
  reviewer_kind: EvidenceReviewerKind;
  reviewer_id?: string;
  skill_name?: string;
  status: EvidenceReviewStatus;
  verdict: EvidenceReviewVerdict;
  blocking: boolean;
  summary: string;
  created_at?: string;
  updated_at?: string;
  reviewed_change_ids?: string[];
  findings: EvidenceReviewFindingRecord[];
};

export type HallmarkInsight = {
  hallmark_id: string;
  overview: string;
  next_stage_requirement: string;
  key_question: string;
};

export type StateOfFieldEdition = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  bullets: string[];
};

export type BundlePromotionChange = {
  changeId: string;
  summary: string;
  targetRecordType: string;
  targetRecordId?: string;
  targetFilePath?: string;
  stagedFilePath?: string;
  ready: boolean;
  issues: string[];
};

export type BundlePromotionReadiness = {
  eligible: boolean;
  ready: boolean;
  issues: string[];
  changes: BundlePromotionChange[];
};

export type BundleEvidenceReviewReadiness = {
  eligible: boolean;
  ready: boolean;
  requiredLanes: EvidenceReviewLane[];
  completedLanes: EvidenceReviewLane[];
  missingLanes: EvidenceReviewLane[];
  blockingReviewIds: string[];
  openBlockingFindings: Array<{
    reviewId: string;
    findingId: string;
    severity: EvidenceReviewFindingSeverity;
    category: EvidenceReviewFindingCategory;
  }>;
  issues: string[];
  reviews: EvidenceReviewRecord[];
};

const stageLabels: Record<Stage, string> = {
  mechanistic_plausibility: "Mechanistic plausibility",
  animal_signal: "Animal signal",
  human_biomarker_signal: "Human biomarker signal",
  human_functional_benefit: "Human functional benefit",
  durable_disease_or_mortality_relevance: "Durable disease or mortality relevance"
};

const momentumLabels: Record<Momentum, string> = {
  accelerating: "Accelerating",
  steady: "Steady",
  mixed: "Mixed",
  stalled: "Stalled",
  uncertain: "Uncertain"
};

const confidenceLabels: Record<Confidence, string> = {
  low: "Low confidence",
  moderate: "Moderate confidence",
  high: "High confidence"
};

const scenarioLabels: Record<ScenarioStatus, string> = {
  unsupported: "Unsupported",
  speculative: "Speculative",
  plausible: "Plausible",
  on_track: "On track"
};

const candidateStatusTransitions: Record<CandidateStatus, CandidateStatus[]> = {
  submitted: ["in_review", "needs_revision", "approved", "rejected"],
  in_review: ["needs_revision", "approved", "rejected"],
  needs_revision: ["revised", "rejected"],
  revised: ["in_review", "approved", "rejected"],
  approved: ["in_review", "rejected", "published"],
  published: [],
  rejected: []
};

const dataRoot = path.join(process.cwd(), "data");
const hallmarkInsightsPath = path.join(dataRoot, "content", "hallmark-insights.json");
const editionsRoot = path.join(dataRoot, "content", "state-of-the-field");

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readCollection<T>(collectionPath: string): Promise<T[]> {
  const fileNames = (await fs.readdir(collectionPath))
    .filter((entry) => entry.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(fileNames.map((fileName) => readJsonFile<T>(path.join(collectionPath, fileName))));
}

function getOutlooksRoot() {
  return path.join(dataRoot, "outlooks");
}

function getActivityItemsRoot() {
  return path.join(dataRoot, "activity-items");
}

function getCandidateBundlesRoot() {
  return path.join(dataRoot, "candidate-bundles");
}

function getReviewCommentsRoot() {
  return path.join(dataRoot, "review-comments");
}

function getPublicationEventsRoot() {
  return path.join(dataRoot, "publication-events");
}

function getEvidenceReviewsRoot() {
  return path.join(dataRoot, "evidence-reviews");
}

function getStagedRecordsRoot() {
  return path.join(dataRoot, "staged-records");
}

function getCandidateBundlePath(bundleId: string) {
  return path.join(getCandidateBundlesRoot(), `${bundleId}.json`);
}

function getReviewCommentPath(commentId: string) {
  return path.join(getReviewCommentsRoot(), `${commentId}.json`);
}

function getPublicationEventPath(publicationEventId: string) {
  return path.join(getPublicationEventsRoot(), `${publicationEventId}.json`);
}

function getEvidenceReviewPath(evidenceReviewId: string) {
  return path.join(getEvidenceReviewsRoot(), `${evidenceReviewId}.json`);
}

async function readCandidateBundleFile(bundleId: string): Promise<CandidateBundleRecord | undefined> {
  try {
    return await readJsonFile<CandidateBundleRecord>(getCandidateBundlePath(bundleId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toWorkspaceRelativePath(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

function resolveDataPath(relativePath: string, label: string) {
  const resolvedPath = path.resolve(process.cwd(), relativePath);

  if (resolvedPath !== dataRoot && !resolvedPath.startsWith(`${dataRoot}${path.sep}`)) {
    throw new Error(`${label} must stay under data/.`);
  }

  return resolvedPath;
}

function getPromotableRecordRoot(recordType: string) {
  switch (recordType) {
    case "outlook":
      return getOutlooksRoot();
    case "activity_item":
      return getActivityItemsRoot();
    default:
      return undefined;
  }
}

function getDerivedStagedFilePath(bundleId: string, change: CandidateBundleChange) {
  const fileName = `${change.target_record_id ?? change.change_id}.json`;
  return path.join(getStagedRecordsRoot(), bundleId, fileName);
}

async function buildPromotionChange(
  bundleId: string,
  change: CandidateBundleChange,
  options: { requireStagedFile: boolean }
): Promise<BundlePromotionChange> {
  const issues: string[] = [];
  const promotableRoot = getPromotableRecordRoot(change.target_record_type);

  if (!promotableRoot) {
    issues.push(`Unsupported target record type: ${change.target_record_type}.`);
  }

  if (!change.target_record_id) {
    issues.push("Promotion requires a target record ID.");
  }

  let targetFilePath = change.file_path;

  if (!targetFilePath && promotableRoot && change.target_record_id) {
    targetFilePath = toWorkspaceRelativePath(path.join(promotableRoot, `${change.target_record_id}.json`));
  }

  if (!targetFilePath) {
    issues.push("Promotion requires a target file path.");
  }

  if (targetFilePath && promotableRoot && change.target_record_id) {
    const expectedTargetPath = path.join(promotableRoot, `${change.target_record_id}.json`);

    try {
      const resolvedTargetPath = resolveDataPath(targetFilePath, "Target file path");

      if (resolvedTargetPath !== expectedTargetPath) {
        issues.push(`Target file path must be ${toWorkspaceRelativePath(expectedTargetPath)}.`);
      }
    } catch (error) {
      issues.push((error as Error).message);
    }
  }

  const stagedFilePath = change.staged_file_path
    ? change.staged_file_path
    : options.requireStagedFile
      ? toWorkspaceRelativePath(getDerivedStagedFilePath(bundleId, change))
      : undefined;

  let stagedRecord: Record<string, unknown> | undefined;

  if (options.requireStagedFile && stagedFilePath) {
    try {
      const resolvedStagedPath = resolveDataPath(stagedFilePath, "Staged file path");

      if (!(await fileExists(resolvedStagedPath))) {
        issues.push(`Missing staged file at ${stagedFilePath}.`);
      } else {
        stagedRecord = await readJsonFile<Record<string, unknown>>(resolvedStagedPath);
      }
    } catch (error) {
      issues.push((error as Error).message);
    }
  }

  if (stagedRecord) {
    if (stagedRecord.record_type !== change.target_record_type) {
      issues.push(`Staged record type must be ${change.target_record_type}.`);
    }

    if (change.target_record_id && stagedRecord.id !== change.target_record_id) {
      issues.push(`Staged record ID must be ${change.target_record_id}.`);
    }
  }

  return {
    changeId: change.change_id,
    summary: change.summary,
    targetRecordType: change.target_record_type,
    targetRecordId: change.target_record_id,
    targetFilePath,
    stagedFilePath,
    ready: issues.length === 0,
    issues
  };
}

async function evaluateBundleEvidenceReviews(
  bundle: CandidateBundleRecord
): Promise<BundleEvidenceReviewReadiness> {
  const currentRevision = bundle.revision_number ?? 1;
  const requiredLanes = bundle.required_review_lanes ?? [];
  const minReviewsPerLane = bundle.review_requirement?.min_complete_reviews_per_lane ?? 1;
  const blockOnOpenCriticalFindings = bundle.review_requirement?.block_on_open_critical_findings ?? true;
  const blockOnOpenMajorFindings = bundle.review_requirement?.block_on_open_major_findings ?? false;

  const reviews = (await loadEvidenceReviews()).filter(
    (review) =>
      review.candidate_bundle_id === bundle.id &&
      review.bundle_revision_number === currentRevision &&
      review.status === "complete"
  );

  const laneCounts = new Map<EvidenceReviewLane, number>();
  for (const review of reviews) {
    laneCounts.set(review.review_lane, (laneCounts.get(review.review_lane) ?? 0) + 1);
  }

  const completedLanes = Array.from(laneCounts.keys());
  const missingLanes = requiredLanes.filter((lane) => (laneCounts.get(lane) ?? 0) < minReviewsPerLane);

  const blockingReviewIds = reviews
    .filter((review) => review.blocking || review.verdict === "needs_revision" || review.verdict === "reject")
    .map((review) => review.id);

  const openBlockingFindings = reviews.flatMap((review) =>
    review.findings
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
        reviewId: review.id,
        findingId: finding.finding_id,
        severity: finding.severity,
        category: finding.category
      }))
  );

  const issues: string[] = [];

  if (missingLanes.length > 0) {
    issues.push(`Missing complete evidence review lanes for revision ${currentRevision}: ${missingLanes.join(", ")}.`);
  }

  if (blockingReviewIds.length > 0) {
    issues.push(`Blocking evidence reviews remain open for revision ${currentRevision}.`);
  }

  if (openBlockingFindings.length > 0) {
    issues.push(`Open blocking findings remain for revision ${currentRevision}.`);
  }

  return {
    eligible: requiredLanes.length > 0,
    ready: issues.length === 0,
    requiredLanes,
    completedLanes,
    missingLanes,
    blockingReviewIds,
    openBlockingFindings,
    issues,
    reviews
  };
}

async function evaluateBundlePromotion(bundle: CandidateBundleRecord): Promise<BundlePromotionReadiness> {
  const requireStagedFile = bundle.lifecycle_status !== "published";
  const changes = await Promise.all(
    bundle.proposed_changes.map((change) => buildPromotionChange(bundle.id, change, { requireStagedFile }))
  );
  const issues = changes.flatMap((change) => change.issues);

  return {
    eligible: bundle.lifecycle_status === "approved",
    ready: bundle.lifecycle_status === "approved" && changes.length > 0 && issues.length === 0,
    issues,
    changes
  };
}

function canTransitionCandidateBundleStatus(current: CandidateStatus, next: CandidateStatus) {
  return current === next || candidateStatusTransitions[current].includes(next);
}

function normalizeOutlook(outlook: OutlookFile): OutlookRecord {
  return {
    id: outlook.id,
    subjectId: outlook.subject_id,
    subjectType: outlook.subject_type,
    name: outlook.name,
    stage: outlook.current_stage,
    momentum: outlook.momentum,
    confidence: outlook.confidence,
    blocker: outlook.main_blockers?.[0] ?? "Coverage in progress.",
    bestSignal: outlook.best_current_signals?.[0] ?? "Coverage in progress.",
    note: outlook.forecast_note,
    lastUpdated: outlook.last_updated,
    thinCoverage: outlook.tags?.includes("thin_coverage"),
    scenario2036Status: outlook.scenario_2036_status
  };
}

function getSubjectHref(subjectType: SubjectType, subjectId: string) {
  if (subjectType === "overall") {
    return "/";
  }

  if (subjectType === "hallmark") {
    return `/hallmarks/${subjectId}`;
  }

  if (subjectType === "track") {
    return `/tracks/${subjectId}`;
  }

  return "/";
}

function getPublicationTargetHref(recordType: string, recordId: string) {
  if (recordType === "activity_item") {
    return "/activity";
  }

  if (recordType === "outlook") {
    return "/";
  }

  return "/";
}

function getTrackGroupMap(): Map<string, TrackGroup> {
  return new Map<string, TrackGroup>(
    trackTaxonomy.hallmark_groups.map((group: TrackGroup) => [group.hallmark_id, group])
  );
}

const trackGroupMap = getTrackGroupMap();
const trackById = new Map<string, TaxonomyTrack>();

for (const group of trackTaxonomy.hallmark_groups as TrackGroup[]) {
  for (const track of group.tracks as TaxonomyTrack[]) {
    trackById.set(track.id, track);
  }
}

const loadOutlooks = cache(async () => {
  const records = await readCollection<OutlookFile>(getOutlooksRoot());
  return records;
});

const loadOutlookMap = cache(async () => {
  const map = new Map<string, OutlookFile>();
  for (const outlook of await loadOutlooks()) {
    map.set(outlook.id, outlook);
  }
  return map;
});

const loadActivityItems = cache(async () => {
  const items = await readCollection<ActivityItemRecord>(getActivityItemsRoot());
  return items.sort((left, right) => right.occurred_on.localeCompare(left.occurred_on));
});

const loadCandidateBundles = cache(async () => {
  const bundles = await readCollection<CandidateBundleRecord>(getCandidateBundlesRoot());
  return bundles.sort((left, right) => right.submitted_at.localeCompare(left.submitted_at));
});

const loadReviewComments = cache(async () => {
  const comments = await readCollection<ReviewCommentRecord>(getReviewCommentsRoot());
  return comments.sort((left, right) => left.created_at.localeCompare(right.created_at));
});

const loadPublicationEvents = cache(async () => {
  const events = await readCollection<PublicationEventRecord>(getPublicationEventsRoot());
  return events.sort((left, right) => right.published_at.localeCompare(left.published_at));
});

const loadEvidenceReviews = cache(async () => {
  let reviews: EvidenceReviewRecord[];

  try {
    reviews = await readCollection<EvidenceReviewRecord>(getEvidenceReviewsRoot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return reviews.sort((left, right) => {
    const bundleOrder = right.bundle_revision_number - left.bundle_revision_number;
    if (bundleOrder !== 0) {
      return bundleOrder;
    }

    const roundOrder = right.review_round - left.review_round;
    if (roundOrder !== 0) {
      return roundOrder;
    }

    return (right.created_at ?? "").localeCompare(left.created_at ?? "");
  });
});

const loadHallmarkInsights = cache(async () => readJsonFile<HallmarkInsight[]>(hallmarkInsightsPath));

const loadStateOfFieldEditions = cache(async () => {
  const entries = await readCollection<StateOfFieldEdition>(editionsRoot);
  return entries.sort((left, right) => right.date.localeCompare(left.date));
});

export function getHallmarks(): Hallmark[] {
  return hallmarksTaxonomy.hallmarks;
}

export function getHallmarkById(hallmarkId: string): Hallmark | undefined {
  return hallmarksTaxonomy.hallmarks.find((hallmark: Hallmark) => hallmark.id === hallmarkId);
}

export function getHallmarkTrackGroup(hallmarkId: string): TrackGroup | undefined {
  return trackGroupMap.get(hallmarkId);
}

export function getTrackById(trackId: string): TaxonomyTrack | undefined {
  return trackById.get(trackId);
}

export function getTracks(): Array<TaxonomyTrack & { primaryHallmarkId: string }> {
  return trackTaxonomy.hallmark_groups.flatMap((group: TrackGroup) =>
    group.tracks.map((track: TaxonomyTrack) => ({
      ...track,
      primaryHallmarkId: group.hallmark_id
    }))
  );
}

export async function getOverallOutlook(): Promise<OutlookRecord> {
  noStore();
  const overall = (await loadOutlooks()).find((outlook) => outlook.subject_type === "overall");

  if (!overall) {
    throw new Error("Missing overall outlook record.");
  }

  return normalizeOutlook(overall);
}

export async function getOverallLastUpdated(): Promise<string> {
  noStore();
  return (await getOverallOutlook()).lastUpdated;
}

export async function getHallmarkOutlook(hallmarkId: string): Promise<OutlookRecord | undefined> {
  noStore();
  const outlook = (await loadOutlooks()).find(
    (item) => item.subject_type === "hallmark" && item.subject_id === hallmarkId
  );

  return outlook ? normalizeOutlook(outlook) : undefined;
}

export async function getHallmarkOutlooks(): Promise<OutlookRecord[]> {
  noStore();
  const outlooks = await loadOutlooks();
  const bySubject = new Map(
    outlooks
      .filter((item) => item.subject_type === "hallmark")
      .map((item) => [item.subject_id, normalizeOutlook(item)])
  );

  return hallmarksTaxonomy.hallmarks
    .map((hallmark: Hallmark) => bySubject.get(hallmark.id))
    .filter((item): item is OutlookRecord => Boolean(item));
}

export async function getTrackCoverage(trackId: string): Promise<TrackCoverage> {
  noStore();
  const trackOutlook = (await loadOutlooks()).find(
    (item) => item.subject_type === "track" && item.subject_id === trackId
  );

  if (!trackOutlook) {
    return {
      note: "Coverage in progress. This track is seeded in the taxonomy but still thin in the public evidence map.",
      lastUpdated: "2026-05-01",
      thinCoverage: true,
      statusLabel: "Coverage in progress"
    };
  }

  return {
    outlookId: trackOutlook.id,
    stage: trackOutlook.current_stage,
    momentum: trackOutlook.momentum,
    confidence: trackOutlook.confidence,
    blocker: trackOutlook.main_blockers?.[0],
    bestSignal: trackOutlook.best_current_signals?.[0],
    note: trackOutlook.forecast_note,
    lastUpdated: trackOutlook.last_updated,
    thinCoverage: trackOutlook.tags?.includes("thin_coverage")
  };
}

export async function getActivityFeed(): Promise<ActivityFeedItem[]> {
  noStore();
  const items = await loadActivityItems();

  return items.map((item) => ({
    id: item.id,
    date: item.occurred_on,
    lane: item.activity_lane[0].toUpperCase() + item.activity_lane.slice(1),
    title: item.name,
    summary: item.summary ?? item.significance_note ?? "",
    affectsOutlook: Boolean(item.affects_outlook),
    hallmarkId: item.hallmark_ids?.[0] ?? "genomic_instability",
    href: "/activity"
  }));
}

export async function getRecentChanges(): Promise<RecentChange[]> {
  noStore();
  const [events, outlookMap] = await Promise.all([loadPublicationEvents(), loadOutlookMap()]);

  return events.map((event) => {
    const affectedOutlook = event.affected_outlook_ids?.[0]
      ? outlookMap.get(event.affected_outlook_ids[0])
      : undefined;

    const fallbackTarget = event.published_targets[0];
    let changeType: RecentChange["changeType"] = "activity";
    let subject = event.name;
    let href = fallbackTarget ? getPublicationTargetHref(fallbackTarget.record_type, fallbackTarget.record_id) : "/";

    if (affectedOutlook) {
      changeType = "outlook";
      subject = affectedOutlook.name.replace(/ Outlook$/, "");
      href = getSubjectHref(affectedOutlook.subject_type, affectedOutlook.subject_id);
    } else if (fallbackTarget?.record_type === "activity_item") {
      changeType = "activity";
      subject = "Activity";
      href = "/activity";
    }

    return {
      id: event.id,
      date: event.published_at.slice(0, 10),
      title: event.name,
      changeType,
      subject,
      whyItMatters: event.change_note ?? event.summary ?? "Public records were updated.",
      href
    };
  });
}

export async function getStateOfTheFieldEditions(): Promise<StateOfFieldEdition[]> {
  noStore();
  return loadStateOfFieldEditions();
}

export async function getStateOfTheFieldEdition(slug: string): Promise<StateOfFieldEdition | undefined> {
  noStore();
  return (await loadStateOfFieldEditions()).find((edition) => edition.slug === slug);
}

export async function getHallmarkInsight(hallmarkId: string): Promise<HallmarkInsight | undefined> {
  noStore();
  return (await loadHallmarkInsights()).find((item) => item.hallmark_id === hallmarkId);
}

export function getTrackCountForHallmark(hallmarkId: string) {
  return trackGroupMap.get(hallmarkId)?.tracks.length ?? 0;
}

export function getStageLabel(stage: Stage) {
  return stageLabels[stage];
}

export function getMomentumLabel(momentum: Momentum) {
  return momentumLabels[momentum];
}

export function getConfidenceLabel(confidence: Confidence) {
  return confidenceLabels[confidence];
}

export function getScenarioLabel(status: ScenarioStatus) {
  return scenarioLabels[status];
}

export async function getOverallSnapshot() {
  noStore();
  const [recentChanges, overallOutlook] = await Promise.all([getRecentChanges(), getOverallOutlook()]);

  return {
    lastPublicUpdate: recentChanges[0]?.date ?? overallOutlook.lastUpdated,
    hallmarksTracked: hallmarksTaxonomy.hallmarks.length,
    seededTracks: getTracks().length,
    recentOutlookChanges: recentChanges.filter((item) => item.changeType === "outlook").length,
    reviewStatus: "Human-reviewed before publication"
  };
}

export async function getHomepageData() {
  noStore();
  const [overallOutlook, hallmarkOutlooks, hallmarks, recentChanges, snapshot] = await Promise.all([
    getOverallOutlook(),
    getHallmarkOutlooks(),
    Promise.resolve(getHallmarks()),
    getRecentChanges(),
    getOverallSnapshot()
  ]);

  return {
    overallOutlook,
    hallmarkOutlooks,
    hallmarks,
    recentChanges,
    snapshot
  };
}

export async function getCandidateBundles(): Promise<CandidateBundleRecord[]> {
  noStore();
  return loadCandidateBundles();
}

export async function getCandidateBundleById(bundleId: string): Promise<CandidateBundleRecord | undefined> {
  noStore();
  return (await loadCandidateBundles()).find((bundle) => bundle.id === bundleId);
}

export async function getCandidateBundlePromotionReadiness(
  bundleId: string
): Promise<BundlePromotionReadiness | undefined> {
  noStore();
  const bundle = await readCandidateBundleFile(bundleId);
  return bundle ? evaluateBundlePromotion(bundle) : undefined;
}

export async function getCandidateBundleEvidenceReviewReadiness(
  bundleId: string
): Promise<BundleEvidenceReviewReadiness | undefined> {
  noStore();
  const bundle = await readCandidateBundleFile(bundleId);
  return bundle ? evaluateBundleEvidenceReviews(bundle) : undefined;
}

export async function getReviewCommentsForBundle(bundleId: string): Promise<ReviewCommentRecord[]> {
  noStore();
  return (await loadReviewComments()).filter((comment) => comment.candidate_bundle_id === bundleId);
}

export async function getEvidenceReviewsForBundle(bundleId: string): Promise<EvidenceReviewRecord[]> {
  noStore();
  return (await loadEvidenceReviews()).filter((review) => review.candidate_bundle_id === bundleId);
}

export async function getPublicationEventsForBundle(bundleId: string): Promise<PublicationEventRecord[]> {
  noStore();
  return (await loadPublicationEvents()).filter((event) => event.candidate_bundle_id === bundleId);
}

export async function getPublicQueue() {
  noStore();
  const bundles = await loadCandidateBundles();
  return bundles;
}

export async function getAdminQueueSummary() {
  noStore();
  const bundles = await loadCandidateBundles();

  const byStatus = bundles.reduce<Record<CandidateStatus, number>>(
    (accumulator, bundle) => {
      accumulator[bundle.lifecycle_status] += 1;
      return accumulator;
    },
    {
      submitted: 0,
      in_review: 0,
      needs_revision: 0,
      revised: 0,
      approved: 0,
      published: 0,
      rejected: 0
    }
  );

  return {
    total: bundles.length,
    open: bundles.filter((bundle) => !["published", "rejected"].includes(bundle.lifecycle_status)).length,
    byStatus
  };
}

export async function getOutlookIdForSubject(subjectType: SubjectType, subjectId: string) {
  noStore();
  const outlook = (await loadOutlooks()).find(
    (item) => item.subject_type === subjectType && item.subject_id === subjectId
  );
  return outlook?.id;
}

export async function updateCandidateBundleStatus(bundleId: string, status: CandidateStatus) {
  const bundle = await readCandidateBundleFile(bundleId);

  if (!bundle) {
    throw new Error(`Unknown candidate bundle: ${bundleId}`);
  }

  if (!canTransitionCandidateBundleStatus(bundle.lifecycle_status, status)) {
    throw new Error(`Invalid candidate bundle status transition: ${bundle.lifecycle_status} -> ${status}`);
  }

  if (status === "approved") {
    const evidenceReviewGate = await evaluateBundleEvidenceReviews(bundle);

    if (evidenceReviewGate.eligible && !evidenceReviewGate.ready) {
      throw new Error(
        `Candidate bundle ${bundleId} is not ready for approval: ${evidenceReviewGate.issues.join(" ")}`
      );
    }
  }

  await writeJsonFile(getCandidateBundlePath(bundleId), {
    ...bundle,
    lifecycle_status: status
  });
}

export async function appendReviewComment(input: {
  bundleId: string;
  commentType: ReviewCommentRecord["comment_type"];
  body: string;
  appliesToChangeId?: string;
  appliesToEvidenceReviewId?: string;
  appliesToFindingId?: string;
}) {
  const bundle = await readCandidateBundleFile(input.bundleId);

  if (!bundle) {
    throw new Error(`Unknown candidate bundle: ${input.bundleId}`);
  }

  const timestamp = new Date().toISOString();
  const commentId = `review-${input.bundleId}-${timestamp.toLowerCase().replace(/[^0-9a-z]+/g, "-")}`;

  const comment: ReviewCommentRecord = {
    id: commentId,
    name: `Review comment for ${bundle.name}`,
    candidate_bundle_id: input.bundleId,
    author_role: "human_reviewer",
    comment_type: input.commentType,
    body: input.body.trim(),
    created_at: timestamp,
    resolution_status: "open",
    applies_to_change_id: input.appliesToChangeId,
    applies_to_evidence_review_id: input.appliesToEvidenceReviewId,
    applies_to_finding_id: input.appliesToFindingId
  };

  await writeJsonFile(getReviewCommentPath(commentId), {
    schema_version: "1.0.0",
    record_type: "review_comment",
    ...comment
  });

  await writeJsonFile(getCandidateBundlePath(bundle.id), {
    ...bundle,
    review_comment_ids: [...(bundle.review_comment_ids ?? []), commentId]
  });
}

export async function publishCandidateBundle(bundleId: string) {
  const bundle = await readCandidateBundleFile(bundleId);

  if (!bundle) {
    throw new Error(`Unknown candidate bundle: ${bundleId}`);
  }

  if (bundle.lifecycle_status === "published") {
    throw new Error(`Candidate bundle ${bundleId} is already published.`);
  }

  const promotion = await evaluateBundlePromotion(bundle);

  if (!promotion.eligible) {
    throw new Error(`Candidate bundle ${bundleId} must be approved before publication.`);
  }

  if (!promotion.ready) {
    throw new Error(`Candidate bundle ${bundleId} is not ready to publish: ${promotion.issues.join(" ")}`);
  }

  const evidenceReviewGate = await evaluateBundleEvidenceReviews(bundle);

  if (evidenceReviewGate.eligible && !evidenceReviewGate.ready) {
    throw new Error(
      `Candidate bundle ${bundleId} is blocked by evidence review: ${evidenceReviewGate.issues.join(" ")}`
    );
  }

  for (const change of promotion.changes) {
    if (!change.targetFilePath || !change.stagedFilePath) {
      throw new Error(`Change ${change.changeId} is missing file paths required for promotion.`);
    }

    const stagedRecord = await readJsonFile<Record<string, unknown>>(
      resolveDataPath(change.stagedFilePath, "Staged file path")
    );

    await writeJsonFile(resolveDataPath(change.targetFilePath, "Target file path"), stagedRecord);
  }

  const timestamp = new Date().toISOString();
  const publicationEventId = `publish-${bundle.id}-${timestamp.toLowerCase().replace(/[^0-9a-z]+/g, "-")}`;
  const affectedOutlookIds = (
    await Promise.all(
      (bundle.proposed_outlook_implications ?? []).map((implication) =>
        getOutlookIdForSubject(implication.subject_type, implication.subject_id)
      )
    )
  ).filter((id): id is string => Boolean(id));

  const publicationEvent: PublicationEventRecord = {
    id: publicationEventId,
    name: `Published ${bundle.name}`,
    summary: bundle.summary,
    candidate_bundle_id: bundle.id,
    event_type: "publish",
    published_at: timestamp,
    published_by: "tyler",
    published_targets: bundle.proposed_changes.map((change) => ({
      record_type: change.target_record_type,
      record_id: change.target_record_id ?? change.change_id,
      action: change.change_type === "create_record" ? "created" : "updated"
    })),
    affected_outlook_ids: affectedOutlookIds,
    approving_evidence_review_ids: evidenceReviewGate.eligible
      ? evidenceReviewGate.reviews.map((review) => review.id)
      : undefined,
    change_note:
      bundle.proposed_outlook_implications?.[0]?.note ??
      "A reviewed candidate bundle was published to the public site."
  };

  await writeJsonFile(getPublicationEventPath(publicationEventId), {
    schema_version: "1.0.0",
    record_type: "publication_event",
    ...publicationEvent
  });

  await writeJsonFile(getCandidateBundlePath(bundle.id), {
    ...bundle,
    lifecycle_status: "published",
    next_actions: ["Publication complete. Review downstream pages if this change affects shared surfaces."],
    publication_event_ids: [...(bundle.publication_event_ids ?? []), publicationEventId]
  });
}
