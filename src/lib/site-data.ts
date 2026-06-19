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
export type CoverageVerdict = "thin" | "adequate" | "strong";
export type CoverageConfidence = "low" | "moderate" | "high";
export type ObservedResearchDensity = "unknown" | "sparse" | "emerging" | "active" | "dense";
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
  evidence_stage: Stage;
  momentum: Momentum;
  confidence: Confidence;
  main_evidence_gaps?: string[];
  strongest_current_evidence?: string[];
  interpretation_note: string;
  what_would_change_the_rating?: string[];
  supporting_finding_ids?: string[];
  supporting_evidence?: OutlookEvidenceLinkFile[];
  supporting_source_ids?: string[];
  last_updated: string;
  tags?: string[];
};

export type OutlookEvidenceLinkFile = {
  label: string;
  outlook_field?: string;
  conclusion: string;
  support_role: string;
  rationale: string;
  finding_ids: string[];
  source_ids?: string[];
  limitations?: string[];
};

export type SourceRecord = {
  id: string;
  name: string;
  short_name?: string;
  summary?: string;
  source_type: string;
  authors?: string[];
  venue?: string;
  year?: number;
  published_on?: string;
  doi?: string;
  pmid?: string;
  registry_ids?: string[];
  urls?: string[];
};

export type SourceExternalLink = {
  kind: "url" | "doi" | "pubmed" | "registry";
  label: string;
  id?: string;
  url: string;
};

export type SourceAuditOutlookLink = {
  outlook_id: string;
  track_id: string;
  track_name: string;
  href: string;
  stage: Stage;
  stage_label: string;
  confidence: Confidence;
  read_firmness_label: string;
  last_updated: string;
  source_link_type: "supporting_source" | "supporting_evidence_source" | "finding_source";
  label: string;
  outlook_field?: string;
  support_role: string;
  conclusion: string;
  rationale: string;
  finding_ids: string[];
  source_ids: string[];
  limitations: string[];
};

export type EvidenceIndexSort = "strength" | "newest" | "source_reuse" | "track" | "confidence";
export type EvidenceIndexSpeciesFilter = "human" | "animal" | "nonhuman";
export type EvidenceIndexSourceReuseFilter = "multi_track" | "single_track";

export type EvidenceIndexFilters = {
  q?: string;
  hallmark?: string;
  track?: string;
  intervention?: string;
  tier?: string;
  direction?: string;
  confidence?: Confidence | "";
  endpoint?: string;
  source_type?: string;
  species?: EvidenceIndexSpeciesFilter | "";
  source_reuse?: EvidenceIndexSourceReuseFilter | "";
  coverage_confidence?: CoverageConfidence | "";
  sort?: EvidenceIndexSort | "";
  limit?: number;
};

export type TrialCompletionDateKind = "actual" | "estimated" | "unknown";
export type TrialResultsStatus = "posted" | "not_posted" | "pending" | "unknown";
export type TrialResultsTone = "mint" | "gold" | "blue" | "slate";
export type TrialWatchStatus =
  | "active_watch"
  | "late_no_results"
  | "retired_no_results"
  | "results_captured"
  | "not_watchlisted";

export type TrialDetails = {
  registry_last_updated?: string;
  registry_last_checked?: string;
  primary_completion_date?: string;
  study_completion_date?: string;
  completion_date_kind?: TrialCompletionDateKind;
  results_status?: TrialResultsStatus;
  results_first_posted_date?: string;
  results_due_date?: string;
  watch_status?: TrialWatchStatus;
  watch_status_updated?: string;
  watch_status_reason?: string;
  retired_from_active_watch_on?: string;
  retirement_sweep_completed?: boolean;
  next_registry_check_due?: string;
  expected_results_window?: string;
  horizon_note?: string;
  why_it_matters?: string;
};

export type StudyRecord = {
  id: string;
  name: string;
  summary?: string;
  tags?: string[];
  study_type: string;
  status: string;
  phase?: string;
  population?: string;
  model_system?: string;
  sample_size?: number;
  intervention_ids?: string[];
  hallmark_ids?: string[];
  track_ids?: string[];
  endpoint_categories?: string[];
  source_ids: string[];
  registry_ids?: string[];
  dates?: {
    start_date?: string;
    end_date?: string;
  };
  trial_details?: TrialDetails;
};

export type TrialSummary = {
  id: string;
  name: string;
  summary?: string;
  href: string;
  status: string;
  statusLabel: string;
  phase?: string;
  phaseLabel?: string;
  population?: string;
  sampleSize?: number;
  registryIds: string[];
  endpointCategories: string[];
  endpointLabels: string[];
  trackIds: string[];
  trackNames: string[];
  primaryTrackName: string;
  resultsStatus: TrialResultsStatus;
  resultsStatusLabel: string;
  resultsStatusTone: TrialResultsTone;
  watchStatus: TrialWatchStatus;
  watchStatusLabel: string;
  watchStatusTone: TrialResultsTone;
  watchStatusReason?: string;
  nextRegistryCheckDue?: string;
  completionDate?: string;
  completionDateKind?: TrialCompletionDateKind;
  registryLastUpdated?: string;
  registryLastChecked?: string;
  expectedResultsWindow?: string;
  horizonNote?: string;
  whyItMatters?: string;
};

export type InterventionRecord = {
  id: string;
  name: string;
  short_name?: string;
  summary?: string;
  aliases?: string[];
  modalities: string[];
  target_hallmark_ids: string[];
  secondary_hallmark_ids?: string[];
  track_ids?: string[];
  mechanism_summary?: string;
  development_stage: string;
  linked_study_ids?: string[];
  linked_finding_ids?: string[];
  risk_flags?: string[];
  evidence_snapshot?: {
    best_evidence_tier?: string;
    human_data?: boolean;
    open_questions?: string[];
  };
};

export type FindingRecord = {
  id: string;
  name: string;
  summary?: string;
  source_id: string;
  study_id?: string;
  intervention_ids?: string[];
  track_ids?: string[];
  hallmark_ids: string[];
  endpoint_category: string;
  direction: string;
  evidence_tier: string;
  confidence: Confidence;
  statement: string;
  population_or_model?: string;
  time_horizon?: string;
  quantitative_note?: string;
  caveats?: string[];
};

export type OutlookRecord = {
  id: string;
  subjectId: string;
  subjectType: SubjectType;
  name: string;
  stage: Stage;
  momentum: Momentum;
  confidence: Confidence;
  evidenceGap: string;
  strongestEvidence: string;
  interpretation: string;
  lastUpdated: string;
  thinCoverage?: boolean;
};

export type TrackCoverage = {
  stage?: Stage;
  momentum?: Momentum;
  confidence?: Confidence;
  coverageVerdict?: CoverageVerdict;
  coverageConfidence?: CoverageConfidence;
  observedResearchDensity?: ObservedResearchDensity;
  evidenceGap?: string;
  strongestEvidence?: string;
  whatWouldChangeTheRating?: string[];
  interpretation: string;
  lastUpdated: string;
  thinCoverage?: boolean;
  knownGapCount?: number;
  highPriorityGapCount?: number;
  lastCoverageAssessmentId?: string;
  lastCoverageAssessedAt?: string;
  outlookId?: string;
  supportingFindingIds?: string[];
  supportingEvidence?: OutlookEvidenceLinkFile[];
  supportingSourceIds?: string[];
  supportingSources?: SourceRecord[];
};

type CoverageStatusTrack = {
  track_id: string;
  coverage_verdict?: CoverageVerdict;
  coverage_confidence?: CoverageConfidence;
  observed_research_density?: ObservedResearchDensity;
  known_gap_count?: number;
  high_priority_gap_count?: number;
  last_coverage_assessment_id?: string;
  last_coverage_assessed_at?: string;
};

type CoverageStatusFile = {
  tracks: CoverageStatusTrack[];
};

export type EvidenceSupportCard = {
  label: string;
  conclusion: string;
  supportRole: string;
  rationale: string;
  limitations: string[];
  findings: Array<{
    id: string;
    name: string;
    statement: string;
    direction: string;
    evidenceTier: string;
    endpointCategory: string;
    interventionIds: string[];
    confidence: Confidence;
    caveats: string[];
    quantitativeNote?: string;
    source?: SourceRecord;
    study?: StudyRecord;
  }>;
  sources: SourceRecord[];
};

export type ActivityItemRecord = {
  id: string;
  name: string;
  summary: string;
  activity_type: string;
  activity_lane: string;
  occurred_on: string;
  source_ids?: string[];
  external_urls?: string[];
  scope_label?: string;
  noteworthiness_tier?: string;
  threshold_basis?: string[];
  trial_activity_kind?: string;
  hallmark_ids?: string[];
  track_ids?: string[];
  study_ids?: string[];
  intervention_ids?: string[];
  surface_routing?: {
    affected_surfaces?: string[];
    state_of_field_review_required?: boolean;
    current_story_review_required?: boolean;
    rationale?: string;
  };
  affects_outlook?: boolean;
  significance_note?: string;
  tags?: string[];
};

export type ActivityLink = {
  id: string;
  label: string;
  href: string;
  kind: "source" | "study" | "external";
};

export type ActivityFeedItem = {
  id: string;
  date: string;
  lane: string;
  activityType: string;
  activityTypeLabel: string;
  title: string;
  summary: string;
  significanceNote?: string;
  affectsOutlook: boolean;
  scopeLabel: string;
  noteworthinessTier: string;
  noteworthinessLabel: string;
  thresholdBasis: string[];
  thresholdBasisLabels: string[];
  trialActivityKind?: string;
  trialActivityKindLabel?: string;
  surfaceRoutes: string[];
  surfaceRouteLabels: string[];
  isFieldActivity: boolean;
  isHistoricalContext: boolean;
  isStateOfFieldRelevant: boolean;
  isTrialHorizon: boolean;
  hallmarkId: string;
  trackIds: string[];
  trackNames: string[];
  links: ActivityLink[];
  href: string;
};

export type HallmarkInterventionSummary = {
  id: string;
  name: string;
  summary: string;
  findingCount: number;
  findingIds: string[];
  trackIds: string[];
  strongestEvidenceTier: string;
  strongestConfidence: Confidence;
  directions: string[];
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

export type CuratedContentReviewMeta = {
  last_reviewed: string;
  review_reason: string;
  related_publication_event_ids?: string[];
  related_outlook_ids?: string[];
};

export type HallmarkInsight = CuratedContentReviewMeta & {
  hallmark_id: string;
  overview: string;
  next_stage_requirement: string;
  key_question: string;
  related_outlook_ids: string[];
};

export type StateOfFieldEdition = CuratedContentReviewMeta & {
  slug: string;
  title: string;
  summary: string;
  lede: string;
  bottom_line: string;
  field_change_status: StateOfFieldChangeStatus;
  field_change_note: string;
  date: string;
  period_start: string;
  period_end: string;
  period_label: string;
  bullets: string[];
  what_changed: StateOfFieldChangeItem[];
  current_context: StateOfFieldLabeledTextItem[];
  what_did_not_change: string[];
  why_it_matters: string;
  trial_horizon: StateOfFieldTrialHorizonItem[];
  field_activity?: StateOfFieldActivityItem[];
  signals_to_watch: StateOfFieldLabeledTextItem[];
  evidence_gaps: StateOfFieldLabeledTextItem[];
  track_examples: StateOfFieldTrackExample[];
  reader_takeaways: string[];
  review_basis: StateOfFieldReviewBasis;
  revision_history: StateOfFieldRevisionHistoryItem[];
};

export type StateOfFieldChangeKind =
  | "outlook_changed"
  | "field_signal"
  | "context_only"
  | "activity_without_results";

export type StateOfFieldChangeStatus = "material_change" | "mixed" | "no_material_change";

export type StateOfFieldReviewBasisKey =
  | "public_updates"
  | "outlooks"
  | "trial_horizon"
  | "current_context"
  | "field_activity"
  | "other";

export type StateOfFieldReviewBasis = {
  items: StateOfFieldReviewBasisItem[];
  caveats: string[];
};

export type StateOfFieldReviewBasisItem = {
  key: StateOfFieldReviewBasisKey;
  label: string;
  count: number;
  unit_singular: string;
  unit_plural?: string;
  summary: string;
};

export type StateOfFieldChangeItem = {
  change_kind: StateOfFieldChangeKind;
  happened_on: string;
  title: string;
  summary: string;
  interpretation?: string;
  related_publication_event_ids?: string[];
  related_outlook_ids?: string[];
};

export type StateOfFieldLabeledTextItem = {
  label: string;
  summary: string;
  related_publication_event_ids?: string[];
  related_outlook_ids?: string[];
};

export type StateOfFieldTrackExample = {
  label: string;
  title: string;
  summary: string;
  href: string;
  related_outlook_ids?: string[];
};

export type StateOfFieldTrialHorizonItem = {
  label: string;
  summary: string;
  href?: string;
  study_id?: string;
  related_outlook_ids?: string[];
  related_publication_event_ids?: string[];
};

export type StateOfFieldActivityItem = {
  happened_on: string;
  label: string;
  summary: string;
  related_activity_item_ids?: string[];
  related_publication_event_ids?: string[];
};

export type StateOfFieldRevisionKind =
  | "initial_publication"
  | "post_hoc_material_correction"
  | "post_hoc_context_note"
  | "copy_or_structure_revision";

export type StateOfFieldRevisionHistoryItem = {
  reviewed_on: string;
  revision_kind: StateOfFieldRevisionKind;
  period_interpretation_changed: boolean;
  summary: string;
  related_publication_event_ids?: string[];
  related_outlook_ids?: string[];
};

export type EvidenceNeedReason =
  | "clear_next_step"
  | "underbuilt_evidence"
  | "early_promise"
  | "blocking_gap";

export type RecentDevelopment = {
  label: string;
  date?: string;
  summary: string;
  impact_on_outlook: string;
  subject_type: SubjectType;
  subject_id: string;
  related_publication_event_ids?: string[];
  related_outlook_ids?: string[];
};

export type ItemToWatchNext = {
  label: string;
  summary: string;
  what_to_look_for: string;
  subject_type: SubjectType;
  subject_id: string;
  related_outlook_ids?: string[];
};

export type BetterEvidenceNeed = {
  label: string;
  reason: EvidenceNeedReason;
  rationale: string;
  what_better_evidence_would_show: string;
  subject_type: SubjectType;
  subject_id: string;
  related_outlook_ids?: string[];
};

export type StoryStep = {
  label: string;
  title: string;
  summary: string;
};

export type OutlookChangeDirection = "more_optimistic" | "less_optimistic" | "needs_attention";

export type OutlookChangeItem = {
  direction: OutlookChangeDirection;
  label: string;
  summary: string;
  related_outlook_ids?: string[];
};

export type TrackExampleToInspect = {
  label: string;
  title: string;
  summary: string;
  href: string;
  related_outlook_ids?: string[];
};

export type CurrentLevStoryRevisionTrigger = {
  trigger_type:
    | "new_publication_event"
    | "outlook_change"
    | "timing_window_change"
    | "state_of_field_rollup"
    | "review_due"
    | "human_editorial_request";
  description: string;
  threshold?: string;
  related_outlook_ids?: string[];
};

export type CurrentLevStory = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  current_evidence_picture: string;
  what_changed: string;
  before_now_next: StoryStep[];
  recent_developments: RecentDevelopment[];
  what_to_watch_next: ItemToWatchNext[];
  where_better_evidence_is_needed: BetterEvidenceNeed[];
  what_would_change_the_outlook: OutlookChangeItem[];
  track_examples_to_inspect: TrackExampleToInspect[];
  revision: {
    last_reviewed: string;
    review_reason: string;
    review_due: string;
    triggers: CurrentLevStoryRevisionTrigger[];
  };
  related_state_of_field_slug?: string;
  related_publication_event_ids?: string[];
  related_outlook_ids?: string[];
};

export type CurrentLevStoryStatus = {
  status: "current" | "stale";
  label: string;
  reasons: string[];
  lastReviewed: string;
  reviewDue: string;
  latestPublicUpdate?: string;
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
  mechanistic_plausibility: "Based on biology",
  animal_signal: "Animal signal",
  human_biomarker_signal: "Human biomarker signal",
  human_functional_benefit: "Evidence that human function improves",
  durable_disease_or_mortality_relevance: "Long-lasting disease or mortality relevance"
};

const stagePlainMeanings: Record<Stage, string> = {
  mechanistic_plausibility:
    "The idea makes biological sense, but it has not yet shown strong animal or human results.",
  animal_signal:
    "There is animal evidence, but not enough human evidence yet.",
  human_biomarker_signal:
    "There are early human signals, usually biomarkers, but not proof of long-lasting improvements in human health or function.",
  human_functional_benefit:
    "Some human studies show functional improvement, but not enough repeated, long-lasting evidence to prove broad aging benefit.",
  durable_disease_or_mortality_relevance:
    "There are meaningful human outcome signals, but they still need to connect clearly to broad aging benefit."
};

const momentumLabels: Record<Momentum, string> = {
  accelerating: "Accelerating",
  steady: "Steady",
  mixed: "Mixed",
  stalled: "Stalled",
  uncertain: "Uncertain"
};

const momentumPlainMeanings: Record<Momentum, string> = {
  accelerating: "New useful evidence or programs are appearing quickly.",
  steady: "The area is moving, but not fast enough to change the big picture by itself.",
  mixed: "Some signals are encouraging and others still limit the outlook.",
  stalled: "There is little recent public progress that changes interpretation.",
  uncertain: "The public evidence is too thin or uneven to judge momentum clearly."
};

const readFirmnessLabels: Record<Confidence, string> = {
  low: "Tentative",
  moderate: "Provisional",
  high: "Firm"
};

const readFirmnessPlainMeanings: Record<Confidence, string> = {
  low: "This read could change substantially as better evidence arrives.",
  moderate: "The current read has enough support to use, but important gaps remain.",
  high: "The public evidence is consistent enough that this read is less likely to move quickly."
};

const coverageVerdictLabels: Record<CoverageVerdict, string> = {
  thin: "Needs more checking",
  adequate: "Adequate map",
  strong: "Strong map"
};

const coverageVerdictPlainMeanings: Record<CoverageVerdict, string> = {
  thin: "Important evidence categories have not been checked deeply enough yet.",
  adequate: "The map is good enough to support the current public claim, with known gaps still visible.",
  strong: "Major supporting, limiting, safety, trial, review, and boundary categories have been checked or explicitly ruled out."
};

const coverageConfidenceLabels: Record<CoverageConfidence, string> = {
  low: "Low map confidence",
  moderate: "Moderate map confidence",
  high: "High map confidence"
};

const researchDensityLabels: Record<ObservedResearchDensity, string> = {
  unknown: "Density unclear",
  sparse: "Sparse field",
  emerging: "Emerging field",
  active: "Active field",
  dense: "Dense field"
};

const researchDensityPlainMeanings: Record<ObservedResearchDensity, string> = {
  unknown: "Coverage is not yet good enough to tell whether little evidence exists or the tracker has not looked enough.",
  sparse: "The checked literature appears small for this aging-relevant claim.",
  emerging: "Several relevant sources exist, but the area is still early or uneven.",
  active: "There is enough relevant work to compare branches, limits, and human or registry signals.",
  dense: "The area has a large enough evidence base that interpretation, not discovery of basic sources, is the main task."
};

const findingWeightLabels: Record<Confidence, string> = {
  low: "Limited weight",
  moderate: "Moderate weight",
  high: "Strong weight"
};

const evidenceNeedReasonLabels: Record<EvidenceNeedReason, string> = {
  clear_next_step: "Clear next step",
  underbuilt_evidence: "Underbuilt evidence",
  early_promise: "Showing promise",
  blocking_gap: "Blocking gap"
};

const humanEvidenceTiers = new Set([
  "human_biomarker",
  "human_function",
  "human_clinical_outcome",
  "mortality_or_lifespan",
  "durable_disease_or_mortality"
]);

const trialResultsStatusLabels: Record<TrialResultsStatus, string> = {
  posted: "Results posted",
  not_posted: "No posted results",
  pending: "Not expected yet",
  unknown: "Timing unclear"
};

const trialResultsStatusTones: Record<TrialResultsStatus, TrialResultsTone> = {
  posted: "mint",
  not_posted: "gold",
  pending: "blue",
  unknown: "slate"
};

const trialResultsStatusRank: Record<TrialResultsStatus, number> = {
  not_posted: 0,
  pending: 1,
  unknown: 2,
  posted: 3
};

const trialWatchStatusLabels: Record<TrialWatchStatus, string> = {
  active_watch: "Active watch",
  late_no_results: "Late no-results",
  retired_no_results: "Retired archive",
  results_captured: "Results captured",
  not_watchlisted: "Not watchlisted"
};

const trialWatchStatusTones: Record<TrialWatchStatus, TrialResultsTone> = {
  active_watch: "blue",
  late_no_results: "gold",
  retired_no_results: "slate",
  results_captured: "mint",
  not_watchlisted: "slate"
};

const trialWatchStatusRank: Record<TrialWatchStatus, number> = {
  active_watch: 0,
  late_no_results: 1,
  not_watchlisted: 2,
  results_captured: 3,
  retired_no_results: 4
};

const evidenceTierRank: Record<string, number> = {
  mortality_or_lifespan: 6,
  human_clinical_outcome: 5,
  durable_disease_or_mortality: 5,
  human_function: 4,
  human_biomarker: 3,
  animal: 2,
  in_vitro: 1,
  mechanistic: 1,
  safety: 1,
  review_or_meta_analysis: 1,
  regulatory_or_program_update: 0
};

const confidenceRank: Record<Confidence, number> = {
  high: 3,
  moderate: 2,
  low: 1
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
const researchRoot = path.join(process.cwd(), "research");
const hallmarkInsightsPath = path.join(dataRoot, "content", "hallmark-insights.json");
const editionsRoot = path.join(dataRoot, "content", "state-of-the-field");
const currentLevStoryPath = path.join(dataRoot, "content", "current-lev-story", "current.json");
const coverageStatusPath = path.join(researchRoot, "state", "coverage-status.v1.json");

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function withFileLock<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;

  try {
    handle = await fs.open(lockPath, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Lock already exists: ${toWorkspaceRelativePath(lockPath)}.`);
    }

    throw error;
  }

  try {
    return await fn();
  } finally {
    if (handle) {
      await handle.close();
    }

    await fs.rm(lockPath, { force: true });
  }
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

function getSourcesRoot() {
  return path.join(dataRoot, "sources");
}

function getStudiesRoot() {
  return path.join(dataRoot, "studies");
}

function getInterventionsRoot() {
  return path.join(dataRoot, "interventions");
}

function getFindingsRoot() {
  return path.join(dataRoot, "findings");
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

function getCandidateBundleLockPath(bundleId: string) {
  return `${getCandidateBundlePath(bundleId)}.lock`;
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

async function withCandidateBundleLock<T>(bundleId: string, fn: () => Promise<T>) {
  return withFileLock(getCandidateBundleLockPath(bundleId), fn);
}

function normalizeDateTimeValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
}

function compareDateTimesDescending(left: string, right: string) {
  return normalizeDateTimeValue(right).localeCompare(normalizeDateTimeValue(left));
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
    case "source":
      return getSourcesRoot();
    case "study":
      return getStudiesRoot();
    case "intervention":
      return getInterventionsRoot();
    case "finding":
      return getFindingsRoot();
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
    stage: outlook.evidence_stage,
    momentum: outlook.momentum,
    confidence: outlook.confidence,
    evidenceGap: outlook.main_evidence_gaps?.[0] ?? "No main evidence gap has been published yet.",
    strongestEvidence: outlook.strongest_current_evidence?.[0] ?? "No strongest-evidence summary has been published yet.",
    interpretation: outlook.interpretation_note,
    lastUpdated: outlook.last_updated,
    thinCoverage: outlook.tags?.includes("thin_coverage")
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

function titleizeIdentifier(identifier: string) {
  return identifier
    .split("-")
    .map((word) => (["fmd", "igf", "nad", "osk"].includes(word) ? word.toUpperCase() : word))
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function getReadableDataLabel(value: string) {
  if (value === "na") {
    return "N/A";
  }

  const phaseMatch = /^phase([1-4])$/.exec(value);
  if (phaseMatch) {
    return `Phase ${phaseMatch[1]}`;
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function uniqueSorted(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function isHumanEvidenceTier(evidenceTier: string) {
  return humanEvidenceTiers.has(evidenceTier);
}

function getTrialCompletionDate(study: StudyRecord) {
  return (
    study.trial_details?.primary_completion_date ??
    study.trial_details?.study_completion_date ??
    study.dates?.end_date
  );
}

function getTrialResultsStatus(study: StudyRecord): TrialResultsStatus {
  if (study.trial_details?.results_status) {
    return study.trial_details.results_status;
  }

  const tags = study.tags ?? [];
  if (tags.includes("posted-results")) {
    return "posted";
  }

  if (
    tags.includes("no-posted-results") ||
    tags.includes("completed-no-results") ||
    tags.includes("no-results")
  ) {
    return "not_posted";
  }

  if (["planned", "recruiting", "active"].includes(study.status)) {
    return "pending";
  }

  return "unknown";
}

function getTrialWatchStatus(study: StudyRecord, resultsStatus: TrialResultsStatus): TrialWatchStatus {
  if (study.trial_details?.watch_status) {
    return study.trial_details.watch_status;
  }

  if (resultsStatus === "posted") {
    return "results_captured";
  }

  if (resultsStatus === "pending" || ["planned", "recruiting", "active"].includes(study.status)) {
    return "active_watch";
  }

  if (resultsStatus === "not_posted") {
    return ["completed", "terminated", "withdrawn", "suspended"].includes(study.status)
      ? "late_no_results"
      : "active_watch";
  }

  return "not_watchlisted";
}

function normalizeTrial(study: StudyRecord): TrialSummary {
  const resultsStatus = getTrialResultsStatus(study);
  const watchStatus = getTrialWatchStatus(study, resultsStatus);
  const trackNames = (study.track_ids ?? []).map((trackId) => getTrackById(trackId)?.name ?? titleizeIdentifier(trackId));
  const endpointCategories = study.endpoint_categories ?? [];

  return {
    id: study.id,
    name: study.name,
    summary: study.summary,
    href: `/studies/${study.id}`,
    status: study.status,
    statusLabel: getReadableDataLabel(study.status),
    phase: study.phase,
    phaseLabel: study.phase ? getReadableDataLabel(study.phase) : undefined,
    population: study.population ?? study.model_system,
    sampleSize: study.sample_size,
    registryIds: study.registry_ids ?? [],
    endpointCategories,
    endpointLabels: endpointCategories.map(getReadableDataLabel),
    trackIds: study.track_ids ?? [],
    trackNames,
    primaryTrackName: trackNames[0] ?? "Unmapped track",
    resultsStatus,
    resultsStatusLabel: trialResultsStatusLabels[resultsStatus],
    resultsStatusTone: trialResultsStatusTones[resultsStatus],
    watchStatus,
    watchStatusLabel: trialWatchStatusLabels[watchStatus],
    watchStatusTone: trialWatchStatusTones[watchStatus],
    watchStatusReason: study.trial_details?.watch_status_reason,
    nextRegistryCheckDue: study.trial_details?.next_registry_check_due,
    completionDate: getTrialCompletionDate(study),
    completionDateKind: study.trial_details?.completion_date_kind,
    registryLastUpdated: study.trial_details?.registry_last_updated,
    registryLastChecked: study.trial_details?.registry_last_checked,
    expectedResultsWindow: study.trial_details?.expected_results_window,
    horizonNote: study.trial_details?.horizon_note,
    whyItMatters: study.trial_details?.why_it_matters
  };
}

function compareTrials(left: TrialSummary, right: TrialSummary) {
  const watchOrder = trialWatchStatusRank[left.watchStatus] - trialWatchStatusRank[right.watchStatus];
  if (watchOrder !== 0) {
    return watchOrder;
  }

  const statusOrder = trialResultsStatusRank[left.resultsStatus] - trialResultsStatusRank[right.resultsStatus];
  if (statusOrder !== 0) {
    return statusOrder;
  }

  const leftDate = left.completionDate ?? "9999-12-31";
  const rightDate = right.completionDate ?? "9999-12-31";
  const dateOrder = leftDate.localeCompare(rightDate);
  if (dateOrder !== 0) {
    return dateOrder;
  }

  return left.name.localeCompare(right.name);
}

function getFindingStrength(finding: Pick<FindingRecord, "evidence_tier" | "confidence">) {
  return (evidenceTierRank[finding.evidence_tier] ?? 0) * 10 + confidenceRank[finding.confidence];
}

function compareFindingsByStrength(left: FindingRecord, right: FindingRecord) {
  const strengthOrder = getFindingStrength(right) - getFindingStrength(left);
  if (strengthOrder !== 0) {
    return strengthOrder;
  }

  return left.name.localeCompare(right.name);
}

function getExternalLinkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "External link";
  }
}

function getClinicalTrialsUrl(sourceId: string) {
  if (!/^nct-?\d+$/i.test(sourceId)) {
    return undefined;
  }

  return `https://clinicaltrials.gov/study/NCT${sourceId.replace(/\D/g, "")}`;
}

function getPubMedUrl(pmid: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

function getDoiUrl(doi: string) {
  return `https://doi.org/${doi}`;
}

function normalizeRoutedSourceId(sourceId: string) {
  return decodeURIComponent(sourceId).trim().replace(/\.json$/i, "");
}

function getSourcePagePath(sourceId: string) {
  return `/sources/${encodeURIComponent(sourceId)}`;
}

function getSourceJsonPath(sourceId: string) {
  return `/data/sources/${encodeURIComponent(sourceId)}.json`;
}

function getSourceExternalLinks(source: SourceRecord): SourceExternalLink[] {
  const links: SourceExternalLink[] = [];
  const seenUrls = new Set<string>();
  const addLink = (link: SourceExternalLink) => {
    if (seenUrls.has(link.url)) {
      return;
    }

    links.push(link);
    seenUrls.add(link.url);
  };

  for (const url of source.urls ?? []) {
    addLink({
      kind: "url",
      label: getExternalLinkLabel(url),
      url
    });
  }

  if (source.doi) {
    addLink({
      kind: "doi",
      label: "DOI",
      id: source.doi,
      url: getDoiUrl(source.doi)
    });
  }

  const sourceIdPmid = source.id.match(/^pmid-([0-9]+)$/i)?.[1];
  const pmid = source.pmid ?? sourceIdPmid;
  if (pmid) {
    addLink({
      kind: "pubmed",
      label: "PubMed",
      id: pmid,
      url: getPubMedUrl(pmid)
    });
  }

  const registryIds = uniqueSorted([
    ...(source.registry_ids ?? []),
    /^nct-?\d+$/i.test(source.id) ? source.id : undefined
  ]);
  for (const registryId of registryIds) {
    const registryUrl = getClinicalTrialsUrl(registryId);
    if (registryUrl) {
      addLink({
        kind: "registry",
        label: registryId.replace(/^nct-?/i, "NCT").toUpperCase(),
        id: registryId,
        url: registryUrl
      });
    }
  }

  return links;
}

function formatSourceForEvidenceMap(source: SourceRecord) {
  return {
    id: source.id,
    href: getSourcePagePath(source.id),
    json_path: getSourceJsonPath(source.id),
    name: source.name,
    short_name: source.short_name,
    summary: source.summary,
    source_type: source.source_type,
    authors: source.authors ?? [],
    venue: source.venue,
    year: source.year,
    published_on: source.published_on,
    doi: source.doi,
    pmid: source.pmid,
    registry_ids: source.registry_ids ?? [],
    urls: source.urls ?? []
  };
}

function buildActivityLinks(item: ActivityItemRecord): ActivityLink[] {
  const links: ActivityLink[] = [];
  const seenHrefs = new Set<string>();

  for (const studyId of item.study_ids ?? []) {
    const href = `/studies/${studyId}`;
    links.push({
      id: studyId,
      label: titleizeIdentifier(studyId),
      href,
      kind: "study"
    });
    seenHrefs.add(href);
  }

  for (const url of item.external_urls ?? []) {
    if (seenHrefs.has(url)) {
      continue;
    }

    links.push({
      id: url,
      label: getExternalLinkLabel(url),
      href: url,
      kind: "external"
    });
    seenHrefs.add(url);
  }

  for (const sourceId of item.source_ids ?? []) {
    const href = getClinicalTrialsUrl(sourceId);
    if (!href || seenHrefs.has(href)) {
      continue;
    }

    links.push({
      id: sourceId,
      label: sourceId.replace(/^nct-?/i, "NCT").toUpperCase(),
      href,
      kind: "source"
    });
    seenHrefs.add(href);
  }

  return links;
}

function normalizeActivityItem(item: ActivityItemRecord): ActivityFeedItem {
  const trackIds = item.track_ids ?? [];
  const hallmarkId = item.hallmark_ids?.[0] ?? "";
  const hallmarkLabel = hallmarkId ? getHallmarkById(hallmarkId)?.name ?? titleizeIdentifier(hallmarkId) : undefined;
  const scopeLabel = item.scope_label ?? hallmarkLabel ?? "Field-wide";
  const tags = item.tags ?? [];
  const thresholdBasis = item.threshold_basis ?? [];
  const surfaceRoutes = item.surface_routing?.affected_surfaces ?? ["activity_feed"];
  const trialActivityKindLabel = item.trial_activity_kind ? getReadableDataLabel(item.trial_activity_kind) : undefined;

  return {
    id: item.id,
    date: item.occurred_on,
    lane: item.activity_lane[0].toUpperCase() + item.activity_lane.slice(1),
    activityType: item.activity_type,
    activityTypeLabel: getReadableDataLabel(item.activity_type),
    title: item.name,
    summary: item.summary ?? item.significance_note ?? "",
    significanceNote: item.significance_note,
    affectsOutlook: Boolean(item.affects_outlook),
    scopeLabel,
    noteworthinessTier: item.noteworthiness_tier ?? "uncategorized",
    noteworthinessLabel: getReadableDataLabel(item.noteworthiness_tier ?? "uncategorized"),
    thresholdBasis,
    thresholdBasisLabels: thresholdBasis.map(getReadableDataLabel),
    trialActivityKind: item.trial_activity_kind,
    trialActivityKindLabel,
    surfaceRoutes,
    surfaceRouteLabels: surfaceRoutes.map(getReadableDataLabel),
    isFieldActivity: tags.includes("field-activity"),
    isHistoricalContext: tags.includes("historical-backfill"),
    isStateOfFieldRelevant:
      Boolean(item.surface_routing?.state_of_field_review_required) || surfaceRoutes.includes("state_of_field"),
    isTrialHorizon: surfaceRoutes.includes("trial_horizon") || Boolean(item.trial_activity_kind),
    hallmarkId,
    trackIds,
    trackNames: trackIds.map((trackId) => getTrackById(trackId)?.name ?? titleizeIdentifier(trackId)),
    links: buildActivityLinks(item),
    href: "/activity"
  };
}

function buildActivityFeed(items: ActivityItemRecord[]): ActivityFeedItem[] {
  return items
    .map(normalizeActivityItem)
    .sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title));
}

function buildCurrentLevStoryStatus(
  narrative: CurrentLevStory,
  publicationEvents: PublicationEventRecord[]
): CurrentLevStoryStatus {
  const latestOutlookEvent = publicationEvents.find((event) => event.affected_outlook_ids?.length);
  const latestPublicUpdate =
    latestOutlookEvent?.published_at.slice(0, 10) ?? publicationEvents[0]?.published_at.slice(0, 10);
  const reasons: string[] = [];

  if (latestOutlookEvent && latestOutlookEvent.published_at.slice(0, 10) > narrative.revision.last_reviewed) {
    reasons.push("New outlook-changing publication activity exists after the last story review.");
  }

  if (getTodayIsoDate() > narrative.revision.review_due) {
    reasons.push("The scheduled story review date has passed.");
  }

  return {
    status: reasons.length > 0 ? "stale" : "current",
    label: reasons.length > 0 ? "Story update due" : "Story current",
    reasons,
    lastReviewed: narrative.revision.last_reviewed,
    reviewDue: narrative.revision.review_due,
    latestPublicUpdate
  };
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

const loadSources = cache(async () => {
  try {
    return await readCollection<SourceRecord>(getSourcesRoot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
});

const loadStudies = cache(async () => {
  try {
    return await readCollection<StudyRecord>(getStudiesRoot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
});

const loadInterventions = cache(async () => {
  try {
    return await readCollection<InterventionRecord>(getInterventionsRoot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
});

const loadFindings = cache(async () => {
  try {
    return await readCollection<FindingRecord>(getFindingsRoot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
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
  return events.sort((left, right) => compareDateTimesDescending(left.published_at, right.published_at));
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

const loadCurrentLevStory = cache(async () => readJsonFile<CurrentLevStory>(currentLevStoryPath));

const loadCoverageStatus = cache(async () => {
  try {
    return await readJsonFile<CoverageStatusFile>(coverageStatusPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
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
  const [publicationEvents, outlooks] = await Promise.all([loadPublicationEvents(), loadOutlooks()]);

  if (publicationEvents.length > 0) {
    return publicationEvents[0].published_at;
  }

  const latestOutlook = [...outlooks].sort((left, right) =>
    compareDateTimesDescending(left.last_updated, right.last_updated)
  )[0];

  if (latestOutlook) {
    return latestOutlook.last_updated;
  }

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
  const [outlooks, sources, coverageStatus] = await Promise.all([
    loadOutlooks(),
    loadSources(),
    loadCoverageStatus()
  ]);
  const planningCoverage = coverageStatus?.tracks.find((item) => item.track_id === trackId);
  const trackOutlook = outlooks.find(
    (item) => item.subject_type === "track" && item.subject_id === trackId
  );

  if (!trackOutlook) {
    return {
      interpretation: "This track is listed because it is part of the aging biology map, but the site has not yet published a track-level evidence summary for it.",
      lastUpdated: "2026-05-01",
      thinCoverage: true,
      coverageVerdict: planningCoverage?.coverage_verdict,
      coverageConfidence: planningCoverage?.coverage_confidence,
      observedResearchDensity: planningCoverage?.observed_research_density,
      knownGapCount: planningCoverage?.known_gap_count,
      highPriorityGapCount: planningCoverage?.high_priority_gap_count,
      lastCoverageAssessmentId: planningCoverage?.last_coverage_assessment_id,
      lastCoverageAssessedAt: planningCoverage?.last_coverage_assessed_at
    };
  }

  return {
    outlookId: trackOutlook.id,
    stage: trackOutlook.evidence_stage,
    momentum: trackOutlook.momentum,
    confidence: trackOutlook.confidence,
    coverageVerdict: planningCoverage?.coverage_verdict,
    coverageConfidence: planningCoverage?.coverage_confidence,
    observedResearchDensity: planningCoverage?.observed_research_density,
    evidenceGap: trackOutlook.main_evidence_gaps?.[0],
    strongestEvidence: trackOutlook.strongest_current_evidence?.[0],
    whatWouldChangeTheRating: trackOutlook.what_would_change_the_rating,
    interpretation: trackOutlook.interpretation_note,
    lastUpdated: trackOutlook.last_updated,
    thinCoverage: trackOutlook.tags?.includes("thin_coverage"),
    knownGapCount: planningCoverage?.known_gap_count,
    highPriorityGapCount: planningCoverage?.high_priority_gap_count,
    lastCoverageAssessmentId: planningCoverage?.last_coverage_assessment_id,
    lastCoverageAssessedAt: planningCoverage?.last_coverage_assessed_at,
    supportingFindingIds: trackOutlook.supporting_finding_ids,
    supportingEvidence: trackOutlook.supporting_evidence,
    supportingSourceIds: trackOutlook.supporting_source_ids,
    supportingSources: trackOutlook.supporting_source_ids
      ?.map((sourceId) => sources.find((source) => source.id === sourceId))
      .filter((source): source is SourceRecord => Boolean(source))
  };
}

export async function getTrackEvidenceSupport(trackId: string): Promise<EvidenceSupportCard[]> {
  noStore();
  const [outlooks, findings, studies, sources] = await Promise.all([
    loadOutlooks(),
    loadFindings(),
    loadStudies(),
    loadSources()
  ]);
  const trackOutlook = outlooks.find((item) => item.subject_type === "track" && item.subject_id === trackId);

  if (!trackOutlook?.supporting_evidence?.length) {
    return [];
  }

  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const studyById = new Map(studies.map((study) => [study.id, study]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return trackOutlook.supporting_evidence.map((link) => {
    const linkedFindings = link.finding_ids
      .map((findingId) => findingById.get(findingId))
      .filter((finding): finding is FindingRecord => Boolean(finding));
    const linkedSources = Array.from(
      new Set([...(link.source_ids ?? []), ...linkedFindings.map((finding) => finding.source_id)])
    )
      .map((sourceId) => sourceById.get(sourceId))
      .filter((source): source is SourceRecord => Boolean(source));

    return {
      label: link.label,
      conclusion: link.conclusion,
      supportRole: link.support_role,
      rationale: link.rationale,
      limitations: link.limitations ?? [],
      findings: linkedFindings.map((finding) => ({
        id: finding.id,
        name: finding.name,
        statement: finding.statement,
        direction: finding.direction,
        evidenceTier: finding.evidence_tier,
        endpointCategory: finding.endpoint_category,
        interventionIds: finding.intervention_ids ?? [],
        confidence: finding.confidence,
        caveats: finding.caveats ?? [],
        quantitativeNote: finding.quantitative_note,
        source: sourceById.get(finding.source_id),
        study: finding.study_id ? studyById.get(finding.study_id) : undefined
      })),
      sources: linkedSources
    };
  });
}

export async function getSourceById(sourceId: string): Promise<SourceRecord | undefined> {
  noStore();
  return (await loadSources()).find((source) => source.id === sourceId);
}

export async function getSourcesByIds(sourceIds: string[]): Promise<SourceRecord[]> {
  noStore();
  const sourceById = new Map((await loadSources()).map((source) => [source.id, source]));
  return Array.from(new Set(sourceIds))
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source): source is SourceRecord => Boolean(source));
}

export async function getStudyById(studyId: string): Promise<StudyRecord | undefined> {
  noStore();
  return (await loadStudies()).find((study) => study.id === studyId);
}

export async function getStudiesByIds(studyIds: string[]): Promise<StudyRecord[]> {
  noStore();
  const studyById = new Map((await loadStudies()).map((study) => [study.id, study]));
  return Array.from(new Set(studyIds))
    .map((studyId) => studyById.get(studyId))
    .filter((study): study is StudyRecord => Boolean(study));
}

export async function getTrials(): Promise<TrialSummary[]> {
  noStore();
  return (await loadStudies())
    .filter((study) => study.study_type === "interventional" && (study.registry_ids?.length ?? 0) > 0)
    .map(normalizeTrial)
    .sort(compareTrials);
}

export async function getStudiesForIntervention(interventionId: string): Promise<StudyRecord[]> {
  noStore();
  return (await loadStudies()).filter((study) => study.intervention_ids?.includes(interventionId));
}

export async function getStudiesForTrack(trackId: string): Promise<StudyRecord[]> {
  noStore();
  return (await loadStudies())
    .filter((study) => study.track_ids?.includes(trackId))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getFindingById(findingId: string): Promise<FindingRecord | undefined> {
  noStore();
  return (await loadFindings()).find((finding) => finding.id === findingId);
}

export async function getFindingsByIds(findingIds: string[]): Promise<FindingRecord[]> {
  noStore();
  const findingById = new Map((await loadFindings()).map((finding) => [finding.id, finding]));
  return Array.from(new Set(findingIds))
    .map((findingId) => findingById.get(findingId))
    .filter((finding): finding is FindingRecord => Boolean(finding));
}

export async function getFindingsForStudy(studyId: string): Promise<FindingRecord[]> {
  noStore();
  return (await loadFindings()).filter((finding) => finding.study_id === studyId);
}

export async function getFindingsForIntervention(interventionId: string): Promise<FindingRecord[]> {
  noStore();
  return (await loadFindings()).filter((finding) => finding.intervention_ids?.includes(interventionId));
}

export async function getFindingsForTrack(trackId: string): Promise<FindingRecord[]> {
  noStore();
  return (await loadFindings())
    .filter((finding) => finding.track_ids?.includes(trackId))
    .sort(compareFindingsByStrength);
}

export async function getFindingsForHallmark(hallmarkId: string): Promise<FindingRecord[]> {
  noStore();
  return (await loadFindings())
    .filter((finding) => finding.hallmark_ids.includes(hallmarkId))
    .sort(compareFindingsByStrength);
}

export async function getStrongestFindingsForHallmark(hallmarkId: string, limit = 4): Promise<FindingRecord[]> {
  noStore();
  return (await getFindingsForHallmark(hallmarkId)).slice(0, limit);
}

export async function getInterventionById(interventionId: string): Promise<InterventionRecord | undefined> {
  noStore();
  return (await loadInterventions()).find((intervention) => intervention.id === interventionId);
}

export async function getInterventionsByIds(interventionIds: string[]): Promise<InterventionRecord[]> {
  noStore();
  const interventionById = new Map((await loadInterventions()).map((intervention) => [intervention.id, intervention]));
  return Array.from(new Set(interventionIds))
    .map((interventionId) => interventionById.get(interventionId))
    .filter((intervention): intervention is InterventionRecord => Boolean(intervention));
}

export async function getLeadingInterventionsForHallmark(
  hallmarkId: string,
  limit = 4
): Promise<HallmarkInterventionSummary[]> {
  noStore();
  const [findings, interventions] = await Promise.all([getFindingsForHallmark(hallmarkId), loadInterventions()]);
  const interventionById = new Map(interventions.map((intervention) => [intervention.id, intervention]));
  const summaryById = new Map<
    string,
    {
      findingIds: Set<string>;
      trackIds: Set<string>;
      directions: Set<string>;
      strongestFinding: FindingRecord;
    }
  >();

  for (const finding of findings) {
    for (const interventionId of finding.intervention_ids ?? []) {
      const existing = summaryById.get(interventionId);

      if (existing) {
        existing.findingIds.add(finding.id);
        finding.track_ids?.forEach((trackId) => existing.trackIds.add(trackId));
        existing.directions.add(finding.direction);

        if (compareFindingsByStrength(finding, existing.strongestFinding) < 0) {
          existing.strongestFinding = finding;
        }
      } else {
        summaryById.set(interventionId, {
          findingIds: new Set([finding.id]),
          trackIds: new Set(finding.track_ids ?? []),
          directions: new Set([finding.direction]),
          strongestFinding: finding
        });
      }
    }
  }

  return Array.from(summaryById.entries())
    .map(([interventionId, summary]) => {
      const intervention = interventionById.get(interventionId);

      return {
        id: interventionId,
        name: intervention?.name ?? titleizeIdentifier(interventionId),
        summary: intervention?.summary ?? summary.strongestFinding.summary ?? summary.strongestFinding.statement,
        findingCount: summary.findingIds.size,
        findingIds: Array.from(summary.findingIds),
        trackIds: Array.from(summary.trackIds),
        strongestEvidenceTier: summary.strongestFinding.evidence_tier,
        strongestConfidence: summary.strongestFinding.confidence,
        directions: Array.from(summary.directions)
      };
    })
    .sort((left, right) => {
      const strongestLeft = findings.find((finding) => finding.id === left.findingIds[0]);
      const strongestRight = findings.find((finding) => finding.id === right.findingIds[0]);
      const strengthOrder =
        (strongestRight ? getFindingStrength(strongestRight) : 0) -
        (strongestLeft ? getFindingStrength(strongestLeft) : 0);

      if (strengthOrder !== 0) {
        return strengthOrder;
      }

      const countOrder = right.findingCount - left.findingCount;
      if (countOrder !== 0) {
        return countOrder;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export async function getActivityForHallmark(hallmarkId: string, limit = 4): Promise<ActivityFeedItem[]> {
  noStore();
  const items = (await loadActivityItems()).filter((item) => item.hallmark_ids?.includes(hallmarkId));
  return buildActivityFeed(items).slice(0, limit);
}

export async function getActivityForTrack(trackId: string, limit = 4): Promise<ActivityFeedItem[]> {
  noStore();
  const items = (await loadActivityItems()).filter((item) => item.track_ids?.includes(trackId));
  return buildActivityFeed(items).slice(0, limit);
}

export async function getActivityFeed(): Promise<ActivityFeedItem[]> {
  noStore();
  return buildActivityFeed(await loadActivityItems());
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

export async function getRecentChangesForSubject(
  subjectType: SubjectType,
  subjectId: string,
  limit = 4
): Promise<RecentChange[]> {
  noStore();
  const subjectHref = getSubjectHref(subjectType, subjectId);
  return (await getRecentChanges()).filter((change) => change.href === subjectHref).slice(0, limit);
}

export async function getStateOfTheFieldEditions(): Promise<StateOfFieldEdition[]> {
  noStore();
  return loadStateOfFieldEditions();
}

export async function getStateOfTheFieldEdition(slug: string): Promise<StateOfFieldEdition | undefined> {
  noStore();
  return (await loadStateOfFieldEditions()).find((edition) => edition.slug === slug);
}

export async function getCurrentLevStory(): Promise<CurrentLevStory> {
  noStore();
  return loadCurrentLevStory();
}

export async function getCurrentLevStoryStatus(): Promise<CurrentLevStoryStatus> {
  noStore();
  const [narrative, publicationEvents] = await Promise.all([loadCurrentLevStory(), loadPublicationEvents()]);
  return buildCurrentLevStoryStatus(narrative, publicationEvents);
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

export function getStagePlainMeaning(stage: Stage) {
  return stagePlainMeanings[stage];
}

export function getMomentumLabel(momentum: Momentum) {
  return momentumLabels[momentum];
}

export function getMomentumPlainMeaning(momentum: Momentum) {
  return momentumPlainMeanings[momentum];
}

export function getReadFirmnessLabel(confidence: Confidence) {
  return readFirmnessLabels[confidence];
}

export function getReadFirmnessPlainMeaning(confidence: Confidence) {
  return readFirmnessPlainMeanings[confidence];
}

export function getCoverageVerdictLabel(verdict: CoverageVerdict) {
  return coverageVerdictLabels[verdict];
}

export function getCoverageVerdictPlainMeaning(verdict: CoverageVerdict) {
  return coverageVerdictPlainMeanings[verdict];
}

export function getCoverageConfidenceLabel(confidence: CoverageConfidence) {
  return coverageConfidenceLabels[confidence];
}

export function getResearchDensityLabel(density: ObservedResearchDensity) {
  return researchDensityLabels[density];
}

export function getResearchDensityPlainMeaning(density: ObservedResearchDensity) {
  return researchDensityPlainMeanings[density];
}

export function getFindingWeightLabel(confidence: Confidence) {
  return findingWeightLabels[confidence];
}

export function getEvidenceNeedReasonLabel(reason: EvidenceNeedReason) {
  return evidenceNeedReasonLabels[reason];
}

export async function getEvidenceMapExport() {
  noStore();
  const [outlooks, sources, studies, findings, interventions, trials, publicationEvents, coverageStatus] =
    await Promise.all([
      loadOutlooks(),
      loadSources(),
      loadStudies(),
      loadFindings(),
      loadInterventions(),
      getTrials(),
      loadPublicationEvents(),
      loadCoverageStatus()
    ]);
  const latestOutlook = [...outlooks].sort((left, right) =>
    compareDateTimesDescending(left.last_updated, right.last_updated)
  )[0];
  const lastUpdated = publicationEvents[0]?.published_at ?? latestOutlook?.last_updated ?? new Date().toISOString();
  const tracks = getTracks();
  const hallmarks = getHallmarks();
  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const trackOutlookById = new Map(
    outlooks
      .filter((outlook) => outlook.subject_type === "track")
      .map((outlook) => [outlook.subject_id, outlook])
  );
  const hallmarkOutlookById = new Map(
    outlooks
      .filter((outlook) => outlook.subject_type === "hallmark")
      .map((outlook) => [outlook.subject_id, outlook])
  );
  const coverageByTrackId = new Map((coverageStatus?.tracks ?? []).map((entry) => [entry.track_id, entry]));
  const studyByTrackId = new Map<string, StudyRecord[]>();
  const findingByTrackId = new Map<string, FindingRecord[]>();
  const interventionByTrackId = new Map<string, InterventionRecord[]>();
  const trialByTrackId = new Map<string, TrialSummary[]>();

  for (const study of studies) {
    for (const trackId of study.track_ids ?? []) {
      studyByTrackId.set(trackId, [...(studyByTrackId.get(trackId) ?? []), study]);
    }
  }

  for (const finding of findings) {
    for (const trackId of finding.track_ids ?? []) {
      findingByTrackId.set(trackId, [...(findingByTrackId.get(trackId) ?? []), finding]);
    }
  }

  for (const intervention of interventions) {
    for (const trackId of intervention.track_ids ?? []) {
      interventionByTrackId.set(trackId, [...(interventionByTrackId.get(trackId) ?? []), intervention]);
    }
  }

  for (const trial of trials) {
    for (const trackId of trial.trackIds) {
      trialByTrackId.set(trackId, [...(trialByTrackId.get(trackId) ?? []), trial]);
    }
  }

  const trackEntries = tracks.map((track) => {
    const outlook = trackOutlookById.get(track.id);
    const coverage = coverageByTrackId.get(track.id);
    const trackFindings = findingByTrackId.get(track.id) ?? [];
    const trackStudies = studyByTrackId.get(track.id) ?? [];
    const trackInterventions = interventionByTrackId.get(track.id) ?? [];
    const trackTrials = trialByTrackId.get(track.id) ?? [];
    const supportingFindingIds = outlook?.supporting_finding_ids ?? [];
    const supportingSourceIds = uniqueSorted([
      ...(outlook?.supporting_source_ids ?? []),
      ...(outlook?.supporting_evidence?.flatMap((item) => item.source_ids ?? []) ?? []),
      ...supportingFindingIds.map((findingId) => findingById.get(findingId)?.source_id)
    ]);
    const trackSourceIds = uniqueSorted([
      ...trackFindings.map((finding) => finding.source_id),
      ...trackStudies.flatMap((study) => study.source_ids),
      ...supportingSourceIds
    ]);

    return {
      id: track.id,
      name: track.name,
      href: `/tracks/${track.id}`,
      summary: track.summary,
      primary_hallmark_id: track.primaryHallmarkId,
      primary_hallmark_name: getHallmarkById(track.primaryHallmarkId)?.name ?? track.primaryHallmarkId,
      secondary_hallmark_ids: track.secondary_hallmark_ids ?? [],
      search_aliases: track.search_aliases ?? [],
      exemplar_interventions: track.exemplar_interventions ?? [],
      outlook: outlook
        ? {
            outlook_id: outlook.id,
            stage: outlook.evidence_stage,
            stage_label: getStageLabel(outlook.evidence_stage),
            momentum: outlook.momentum,
            momentum_label: getMomentumLabel(outlook.momentum),
            confidence: outlook.confidence,
            read_firmness_label: getReadFirmnessLabel(outlook.confidence),
            interpretation: outlook.interpretation_note,
            main_evidence_gaps: outlook.main_evidence_gaps ?? [],
            strongest_current_evidence: outlook.strongest_current_evidence ?? [],
            what_would_change_the_rating: outlook.what_would_change_the_rating ?? [],
            supporting_finding_ids: supportingFindingIds,
            supporting_source_ids: supportingSourceIds,
            last_updated: outlook.last_updated
          }
        : null,
      coverage: coverage
        ? {
            coverage_verdict: coverage.coverage_verdict,
            coverage_verdict_label: coverage.coverage_verdict
              ? getCoverageVerdictLabel(coverage.coverage_verdict)
              : undefined,
            coverage_confidence: coverage.coverage_confidence,
            coverage_confidence_label: coverage.coverage_confidence
              ? getCoverageConfidenceLabel(coverage.coverage_confidence)
              : undefined,
            observed_research_density: coverage.observed_research_density,
            observed_research_density_label: coverage.observed_research_density
              ? getResearchDensityLabel(coverage.observed_research_density)
              : undefined,
            known_gap_count: coverage.known_gap_count ?? 0,
            high_priority_gap_count: coverage.high_priority_gap_count ?? 0,
            last_coverage_assessment_id: coverage.last_coverage_assessment_id,
            last_coverage_assessed_at: coverage.last_coverage_assessed_at
          }
        : null,
      evidence_counts: {
        finding_count: trackFindings.length,
        human_finding_count: trackFindings.filter((finding) => isHumanEvidenceTier(finding.evidence_tier)).length,
        positive_finding_count: trackFindings.filter((finding) => finding.direction === "positive").length,
        null_or_negative_finding_count: trackFindings.filter(
          (finding) => finding.direction === "null" || finding.direction === "negative"
        ).length,
        source_count: trackSourceIds.length,
        study_count: trackStudies.length,
        intervention_count: trackInterventions.length,
        registry_linked_trial_count: trackTrials.length,
        active_watch_trial_count: trackTrials.filter((trial) => trial.watchStatus === "active_watch").length,
        late_no_results_trial_count: trackTrials.filter((trial) => trial.watchStatus === "late_no_results").length,
        posted_result_trial_count: trackTrials.filter((trial) => trial.resultsStatus === "posted").length
      },
      source_ids: trackSourceIds,
      supporting_evidence:
        outlook?.supporting_evidence?.map((item) => ({
          label: item.label,
          outlook_field: item.outlook_field,
          support_role: item.support_role,
          conclusion: item.conclusion,
          rationale: item.rationale,
          finding_ids: item.finding_ids,
          source_ids: uniqueSorted([
            ...(item.source_ids ?? []),
            ...item.finding_ids.map((findingId) => findingById.get(findingId)?.source_id)
          ]),
          limitations: item.limitations ?? []
        })) ?? []
    };
  });

  const datasetCard = {
    name: "LEV Tracker evidence map",
    version: "1.3.0",
    schema_urls: {
      full_export: "/data/evidence-map.schema.json",
      scoped_track_export: "/data/scoped-evidence-map.schema.json",
      source_audit: "/data/source-audit.schema.json"
    },
    unit_of_analysis:
      "Hallmarks organize aging biology, tracks organize intervention families, and findings are the atomic evidence statements linked to sources, studies, and trials.",
    update_cadence:
      "Generated dynamically from repository records; last_public_update identifies the latest public publication event or outlook update represented in the export.",
    intended_uses: [
      "Retrieval-augmented context for longevity-science question answering.",
      "Expert audit of how public track reads connect to findings, studies, sources, trials, and coverage state.",
      "Training or evaluation examples that need structured distinctions between evidence stage, read firmness, map completeness, and research density.",
      "Gap analysis for deciding whether a field appears sparse or whether the tracker still needs source-discovery work."
    ],
    unsuitable_uses: [
      "Medical advice, treatment selection, dosing, or individual risk assessment.",
      "A leaderboard of interventions ranked by likelihood of extending human life.",
      "A substitute for reading the cited papers, trial records, and caveats.",
      "A complete corpus of longevity science outside the tracker scope and public review queue."
    ],
    interpretation_rules: [
      "Evidence stage describes the strongest public evidence claim; it is not the same as clinical readiness.",
      "Read firmness describes how likely the current interpretation is to move as better evidence arrives.",
      "Coverage verdict and coverage confidence describe tracker map completeness, not whether the intervention works.",
      "Observed research density describes how much relevant public work appears to exist after coverage checking.",
      "Trial watch status records why a registry matters; trial existence alone is not evidence of benefit."
    ],
    provenance_model: [
      "Track outlooks expose supporting_finding_ids and supporting_source_ids for the public rating rationale.",
      "Findings carry source_id, optional study_id, track_ids, hallmark_ids, evidence_tier, direction, confidence, and caveats.",
      "Sources carry bibliographic, registry, DOI, PMID, and URL metadata for retrieval and citation.",
      "Trials are registry-linked summaries mapped back to tracks with result and watch status.",
      "source_file_patterns identify the repository record families behind the compact export."
    ],
    recommended_retrieval_order: [
      "Start with legends and caveats so labels are interpreted correctly.",
      "Retrieve the relevant track outlook and coverage block.",
      "Follow supporting_finding_ids to findings, then source_id and study_id for provenance.",
      "Check trials for registry status, result status, and watch rationale.",
      "Use source_file_patterns when a workflow needs the repository source of truth rather than the compact export."
    ],
    example_requests: [
      {
        label: "Full evidence map",
        method: "GET",
        path: "/data/evidence-map.json",
        returns: "Complete evidence-map export with all tracks, findings, sources, trials, legends, caveats, and dataset-card metadata."
      },
      {
        label: "Scoped track query",
        method: "GET",
        path: "/data/evidence-map.json?track=senolytics",
        returns: "Track-scoped evidence map for Senolytics using the query-filter route."
      },
      {
        label: "Scoped track URL",
        method: "GET",
        path: "/data/tracks/senolytics.json",
        returns: "Track-scoped evidence map for Senolytics using the direct per-track route."
      },
      {
        label: "Source audit",
        method: "GET",
        path: "/data/sources/pmid-19587680.json",
        returns: "Source-level provenance graph showing how one source is used across findings, studies, track outlooks, and public pages."
      }
    ],
    known_limitations: [
      "The export reflects public tracker records and coverage-state summaries, not every paper in longevity science.",
      "Coverage assessments are editorial map-quality records and may lag newly published literature.",
      "Labels are intentionally conservative summaries and should be read with caveats and source links.",
      "Generated timestamps change on request; last_public_update is the field to use for public content freshness."
    ]
  };

  return {
    schema_version: datasetCard.version,
    schema_url: datasetCard.schema_urls.full_export,
    export_type: "lev_tracker_evidence_map",
    generated_at: new Date().toISOString(),
    last_public_update: lastUpdated,
    canonical_path: "/data/evidence-map.json",
    dataset_card: datasetCard,
    caveats: [
      "This is an evidence-map export, not medical advice or a claim that an intervention extends human life.",
      "Coverage confidence describes how complete the tracker map appears, not how strong the underlying scientific evidence is.",
      "Observed research density separates sparse fields from areas where the tracker may still need deeper source discovery.",
      "Use source, study, finding, outlook, and track IDs for provenance; labels are editorial summaries and may change."
    ],
    legends: {
      evidence_stage: Object.entries(stageLabels).map(([value, label]) => ({
        value,
        label,
        plain_meaning: stagePlainMeanings[value as Stage]
      })),
      momentum: Object.entries(momentumLabels).map(([value, label]) => ({
        value,
        label,
        plain_meaning: momentumPlainMeanings[value as Momentum]
      })),
      read_firmness: Object.entries(readFirmnessLabels).map(([value, label]) => ({
        value,
        label,
        plain_meaning: readFirmnessPlainMeanings[value as Confidence]
      })),
      coverage_verdict: Object.entries(coverageVerdictLabels).map(([value, label]) => ({
        value,
        label,
        plain_meaning: coverageVerdictPlainMeanings[value as CoverageVerdict]
      })),
      observed_research_density: Object.entries(researchDensityLabels).map(([value, label]) => ({
        value,
        label,
        plain_meaning: researchDensityPlainMeanings[value as ObservedResearchDensity]
      }))
    },
    summary: {
      hallmark_count: hallmarks.length,
      track_count: tracks.length,
      track_outlook_count: trackEntries.filter((track) => track.outlook).length,
      coverage_assessed_track_count: trackEntries.filter((track) => track.coverage).length,
      adequate_or_strong_map_count: trackEntries.filter((track) =>
        ["adequate", "strong"].includes(track.coverage?.coverage_verdict ?? "")
      ).length,
      active_or_dense_research_count: trackEntries.filter((track) =>
        ["active", "dense"].includes(track.coverage?.observed_research_density ?? "")
      ).length,
      source_count: sources.length,
      study_count: studies.length,
      finding_count: findings.length,
      intervention_count: interventions.length,
      registry_linked_trial_count: trials.length,
      active_watch_trial_count: trials.filter((trial) => trial.watchStatus === "active_watch").length,
      late_no_results_trial_count: trials.filter((trial) => trial.watchStatus === "late_no_results").length,
      posted_result_trial_count: trials.filter((trial) => trial.resultsStatus === "posted").length
    },
    hallmarks: hallmarks.map((hallmark) => {
      const outlook = hallmarkOutlookById.get(hallmark.id);
      const hallmarkTracks = tracks.filter((track) => track.primaryHallmarkId === hallmark.id);

      return {
        id: hallmark.id,
        name: hallmark.name,
        href: `/hallmarks/${hallmark.id}`,
        canonical_order: hallmark.canonical_order,
        description: hallmark.description,
        track_ids: hallmarkTracks.map((track) => track.id),
        outlook: outlook
          ? {
              outlook_id: outlook.id,
              stage: outlook.evidence_stage,
              stage_label: getStageLabel(outlook.evidence_stage),
              momentum: outlook.momentum,
              momentum_label: getMomentumLabel(outlook.momentum),
              confidence: outlook.confidence,
              read_firmness_label: getReadFirmnessLabel(outlook.confidence),
              interpretation: outlook.interpretation_note,
              main_evidence_gaps: outlook.main_evidence_gaps ?? [],
              strongest_current_evidence: outlook.strongest_current_evidence ?? [],
              last_updated: outlook.last_updated
            }
          : null
      };
    }),
    tracks: trackEntries,
    findings: findings.map(formatFindingForEvidenceMap),
    sources: sources.map(formatSourceForEvidenceMap),
    trials: trials.map(formatTrialForEvidenceMap),
    source_file_patterns: {
      taxonomy: ["taxonomies/hallmarks-of-aging.v1.json", "taxonomies/track-taxonomy.v1.json"],
      public_records: [
        "data/outlooks/*.json",
        "data/sources/*.json",
        "data/studies/*.json",
        "data/findings/*.json",
        "data/interventions/*.json"
      ],
      planning_records: ["research/state/coverage-status.v1.json", "research/coverage-assessments/*.json"]
    }
  };
}

function normalizeScopedTrackId(trackId: string) {
  return decodeURIComponent(trackId).trim().replace(/\.json$/i, "");
}

function formatStudyForEvidenceMap(study: StudyRecord) {
  return {
    id: study.id,
    name: study.name,
    summary: study.summary,
    study_type: study.study_type,
    status: study.status,
    phase: study.phase,
    population: study.population,
    model_system: study.model_system,
    sample_size: study.sample_size,
    intervention_ids: study.intervention_ids ?? [],
    hallmark_ids: study.hallmark_ids ?? [],
    track_ids: study.track_ids ?? [],
    endpoint_categories: study.endpoint_categories ?? [],
    source_ids: study.source_ids,
    registry_ids: study.registry_ids ?? [],
    dates: study.dates,
    trial_details: study.trial_details
  };
}

function formatFindingForEvidenceMap(finding: FindingRecord) {
  return {
    id: finding.id,
    name: finding.name,
    statement: finding.statement,
    summary: finding.summary,
    source_id: finding.source_id,
    study_id: finding.study_id,
    intervention_ids: finding.intervention_ids ?? [],
    track_ids: finding.track_ids ?? [],
    hallmark_ids: finding.hallmark_ids,
    endpoint_category: finding.endpoint_category,
    direction: finding.direction,
    evidence_tier: finding.evidence_tier,
    is_human_evidence: isHumanEvidenceTier(finding.evidence_tier),
    confidence: finding.confidence,
    population_or_model: finding.population_or_model,
    time_horizon: finding.time_horizon,
    quantitative_note: finding.quantitative_note,
    caveats: finding.caveats ?? []
  };
}

function formatInterventionForEvidenceMap(intervention: InterventionRecord) {
  return {
    id: intervention.id,
    name: intervention.name,
    short_name: intervention.short_name,
    summary: intervention.summary,
    aliases: intervention.aliases ?? [],
    modalities: intervention.modalities,
    target_hallmark_ids: intervention.target_hallmark_ids,
    secondary_hallmark_ids: intervention.secondary_hallmark_ids ?? [],
    track_ids: intervention.track_ids ?? [],
    mechanism_summary: intervention.mechanism_summary,
    development_stage: intervention.development_stage,
    linked_study_ids: intervention.linked_study_ids ?? [],
    linked_finding_ids: intervention.linked_finding_ids ?? [],
    risk_flags: intervention.risk_flags ?? [],
    evidence_snapshot: intervention.evidence_snapshot
  };
}

function formatTrialForEvidenceMap(trial: TrialSummary) {
  return {
    id: trial.id,
    name: trial.name,
    href: trial.href,
    status: trial.status,
    status_label: trial.statusLabel,
    phase: trial.phase,
    phase_label: trial.phaseLabel,
    population: trial.population,
    sample_size: trial.sampleSize,
    registry_ids: trial.registryIds,
    endpoint_categories: trial.endpointCategories,
    track_ids: trial.trackIds,
    results_status: trial.resultsStatus,
    results_status_label: trial.resultsStatusLabel,
    watch_status: trial.watchStatus,
    watch_status_label: trial.watchStatusLabel,
    completion_date: trial.completionDate,
    completion_date_kind: trial.completionDateKind,
    registry_last_updated: trial.registryLastUpdated,
    registry_last_checked: trial.registryLastChecked,
    expected_results_window: trial.expectedResultsWindow,
    horizon_note: trial.horizonNote,
    why_it_matters: trial.whyItMatters
  };
}

function getEvidenceSpecies(finding: Pick<FindingRecord, "evidence_tier" | "population_or_model">) {
  if (
    finding.evidence_tier === "animal" ||
    /\b(animal|mouse|mice|murine|rat|rats|worm|worms|drosophila|fly|flies|macaque|monkey|primate)\b/i.test(
      finding.population_or_model ?? ""
    )
  ) {
    return "animal";
  }

  if (isHumanEvidenceTier(finding.evidence_tier)) {
    return "human";
  }

  return "nonhuman";
}

function cleanEvidenceIndexFilters(filters: EvidenceIndexFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(1000, filters.limit)) : undefined;

  return {
    q: filters.q?.trim() ?? "",
    hallmark: filters.hallmark ?? "",
    track: filters.track ?? "",
    intervention: filters.intervention ?? "",
    tier: filters.tier ?? "",
    direction: filters.direction ?? "",
    confidence: filters.confidence ?? "",
    endpoint: filters.endpoint ?? "",
    source_type: filters.source_type ?? "",
    species: filters.species ?? "",
    source_reuse: filters.source_reuse ?? "",
    coverage_confidence: filters.coverage_confidence ?? "",
    sort: filters.sort || "strength",
    limit
  };
}

function getEvidenceIndexQueryPath(path: string, filters: EvidenceIndexFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanEvidenceIndexFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value || key === "sort" && value === "strength") {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getEvidenceIndexSearchText(row: {
  id: string;
  name: string;
  statement: string;
  summary?: string;
  endpoint_category: string;
  direction: string;
  evidence_tier: string;
  confidence: string;
  population_or_model?: string;
  time_horizon?: string;
  quantitative_note?: string;
  caveats: string[];
  source?: { id: string; name: string; short_name?: string; source_type: string; venue?: string; year?: number };
  study?: { id: string; name: string; summary?: string; population?: string; model_system?: string };
  interventions: Array<{ id: string; name: string; short_name?: string }>;
  track_contexts: Array<{ id: string; name: string; primary_hallmark_name: string }>;
  hallmarks: Array<{ id: string; name: string }>;
}) {
  return [
    row.id,
    row.name,
    row.statement,
    row.summary,
    row.endpoint_category,
    row.direction,
    row.evidence_tier,
    row.confidence,
    row.population_or_model,
    row.time_horizon,
    row.quantitative_note,
    row.source?.id,
    row.source?.name,
    row.source?.short_name,
    row.source?.source_type,
    row.source?.venue,
    row.source?.year?.toString(),
    row.study?.id,
    row.study?.name,
    row.study?.summary,
    row.study?.population,
    row.study?.model_system,
    ...row.interventions.flatMap((intervention) => [intervention.id, intervention.name, intervention.short_name]),
    ...row.track_contexts.flatMap((track) => [track.id, track.name, track.primary_hallmark_name]),
    ...row.hallmarks.flatMap((hallmark) => [hallmark.id, hallmark.name]),
    ...row.caveats
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
}

function applyEvidenceIndexFilters<
  T extends {
    searchable_text: string;
    hallmark_ids: string[];
    track_ids: string[];
    intervention_ids: string[];
    evidence_tier: string;
    direction: string;
    confidence: Confidence;
    endpoint_category: string;
    source_type?: string;
    species: string;
    source_reuse_track_count: number;
    track_contexts: Array<{ coverage_confidence?: CoverageConfidence }>;
  }
>(rows: T[], filters: EvidenceIndexFilters) {
  const selected = cleanEvidenceIndexFilters(filters);
  const queryNeedle = selected.q.toLocaleLowerCase();

  return rows.filter((row) => {
    return (
      (!queryNeedle || row.searchable_text.includes(queryNeedle)) &&
      (!selected.hallmark || row.hallmark_ids.includes(selected.hallmark)) &&
      (!selected.track || row.track_ids.includes(selected.track)) &&
      (!selected.intervention || row.intervention_ids.includes(selected.intervention)) &&
      (!selected.tier || row.evidence_tier === selected.tier) &&
      (!selected.direction || row.direction === selected.direction) &&
      (!selected.confidence || row.confidence === selected.confidence) &&
      (!selected.endpoint || row.endpoint_category === selected.endpoint) &&
      (!selected.source_type || row.source_type === selected.source_type) &&
      (!selected.species || row.species === selected.species) &&
      (!selected.coverage_confidence ||
        row.track_contexts.some((track) => track.coverage_confidence === selected.coverage_confidence)) &&
      (!selected.source_reuse ||
        (selected.source_reuse === "multi_track"
          ? row.source_reuse_track_count > 1
          : row.source_reuse_track_count <= 1))
    );
  });
}

function sortEvidenceIndexRows<
  T extends {
    name: string;
    evidence_strength_score: number;
    confidence: Confidence;
    source_year?: number;
    source_published_on?: string;
    source_reuse_track_count: number;
    track_contexts: Array<{ name: string }>;
  }
>(rows: T[], sort: EvidenceIndexSort) {
  return [...rows].sort((left, right) => {
    if (sort === "newest") {
      const leftDate = left.source_published_on ?? left.source_year?.toString() ?? "";
      const rightDate = right.source_published_on ?? right.source_year?.toString() ?? "";
      const dateOrder = rightDate.localeCompare(leftDate);
      if (dateOrder !== 0) {
        return dateOrder;
      }
    }

    if (sort === "source_reuse") {
      const reuseOrder = right.source_reuse_track_count - left.source_reuse_track_count;
      if (reuseOrder !== 0) {
        return reuseOrder;
      }
    }

    if (sort === "track") {
      const trackOrder = (left.track_contexts[0]?.name ?? "").localeCompare(right.track_contexts[0]?.name ?? "");
      if (trackOrder !== 0) {
        return trackOrder;
      }
    }

    if (sort === "confidence") {
      const confidenceOrder = confidenceRank[right.confidence] - confidenceRank[left.confidence];
      if (confidenceOrder !== 0) {
        return confidenceOrder;
      }
    }

    const strengthOrder = right.evidence_strength_score - left.evidence_strength_score;
    if (strengthOrder !== 0) {
      return strengthOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function getScopedEvidenceMapExport(trackId: string) {
  noStore();
  const normalizedTrackId = normalizeScopedTrackId(trackId);
  const [evidenceMap, studies, interventions] = await Promise.all([
    getEvidenceMapExport(),
    loadStudies(),
    loadInterventions()
  ]);
  const track = evidenceMap.tracks.find((item) => item.id === normalizedTrackId);

  if (!track) {
    return undefined;
  }

  const supportingFindingIds = new Set([
    ...(track.outlook?.supporting_finding_ids ?? []),
    ...track.supporting_evidence.flatMap((item) => item.finding_ids)
  ]);
  const trackFindings = evidenceMap.findings
    .filter((finding) => finding.track_ids.includes(track.id) || supportingFindingIds.has(finding.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const studyIds = new Set([
    ...trackFindings.map((finding) => finding.study_id).filter((value): value is string => Boolean(value)),
    ...studies.filter((study) => study.track_ids?.includes(track.id)).map((study) => study.id)
  ]);
  const trackStudies = studies
    .filter((study) => studyIds.has(study.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const interventionIds = new Set([
    ...trackFindings.flatMap((finding) => finding.intervention_ids),
    ...trackStudies.flatMap((study) => study.intervention_ids ?? []),
    ...interventions.filter((intervention) => intervention.track_ids?.includes(track.id)).map((intervention) => intervention.id)
  ]);
  const trackInterventions = interventions
    .filter((intervention) => interventionIds.has(intervention.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const sourceIds = new Set([
    ...track.source_ids,
    ...(track.outlook?.supporting_source_ids ?? []),
    ...track.supporting_evidence.flatMap((item) => item.source_ids),
    ...trackFindings.map((finding) => finding.source_id),
    ...trackStudies.flatMap((study) => study.source_ids)
  ]);
  const trackSources = evidenceMap.sources
    .filter((source) => sourceIds.has(source.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const trackTrials = evidenceMap.trials
    .filter((trial) => trial.track_ids.includes(track.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const hallmarkIds = new Set([
    track.primary_hallmark_id,
    ...track.secondary_hallmark_ids,
    ...trackFindings.flatMap((finding) => finding.hallmark_ids)
  ]);
  const scopedHallmarks = evidenceMap.hallmarks
    .filter((hallmark) => hallmarkIds.has(hallmark.id))
    .sort((left, right) => left.canonical_order - right.canonical_order);

  return {
    schema_version: "1.2.0",
    schema_url: evidenceMap.dataset_card.schema_urls.scoped_track_export,
    export_type: "lev_tracker_scoped_evidence_map",
    generated_at: evidenceMap.generated_at,
    last_public_update: evidenceMap.last_public_update,
    scope: {
      type: "track",
      track_id: track.id,
      track_name: track.name,
      canonical_path: `/data/tracks/${track.id}.json`,
      query_path: `${evidenceMap.canonical_path}?track=${track.id}`,
      full_export_path: evidenceMap.canonical_path
    },
    dataset_card: evidenceMap.dataset_card,
    caveats: evidenceMap.caveats,
    legends: evidenceMap.legends,
    summary: {
      hallmark_count: scopedHallmarks.length,
      finding_count: trackFindings.length,
      study_count: trackStudies.length,
      source_count: trackSources.length,
      intervention_count: trackInterventions.length,
      registry_linked_trial_count: trackTrials.length,
      active_watch_trial_count: trackTrials.filter((trial) => trial.watch_status === "active_watch").length,
      posted_result_trial_count: trackTrials.filter((trial) => trial.results_status === "posted").length
    },
    track,
    hallmarks: scopedHallmarks,
    findings: trackFindings,
    studies: trackStudies.map(formatStudyForEvidenceMap),
    sources: trackSources,
    interventions: trackInterventions.map(formatInterventionForEvidenceMap),
    trials: trackTrials,
    source_file_patterns: evidenceMap.source_file_patterns
  };
}

function getEvidenceFilterOption(value: string, label?: string) {
  return {
    value,
    label: label ?? getReadableDataLabel(value)
  };
}

function uniqueEvidenceFilterOptions(values: Array<{ value: string; label?: string }>) {
  return Array.from(new Map(values.filter((item) => item.value).map((item) => [item.value, getEvidenceFilterOption(item.value, item.label)])).values()).sort(
    (left, right) => left.label.localeCompare(right.label)
  );
}

function getAppliedEvidenceFilters(filters: ReturnType<typeof cleanEvidenceIndexFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([key, value]) => Boolean(value) && !(key === "sort" && value === "strength"))
      .map(([key, value]) => [key, String(value)])
  );
}

export async function getEvidenceIndexExport(filters: EvidenceIndexFilters = {}) {
  noStore();
  const selected = cleanEvidenceIndexFilters(filters);
  const [evidenceMap, studies, interventions] = await Promise.all([
    getEvidenceMapExport(),
    loadStudies(),
    loadInterventions()
  ]);
  const studyById = new Map(studies.map((study) => [study.id, study]));
  const interventionById = new Map(interventions.map((intervention) => [intervention.id, intervention]));
  const sourceById = new Map(evidenceMap.sources.map((source) => [source.id, source]));
  const trackById = new Map(evidenceMap.tracks.map((track) => [track.id, track]));
  const hallmarkById = new Map(evidenceMap.hallmarks.map((hallmark) => [hallmark.id, hallmark]));
  const sourceTrackIds = new Map<string, Set<string>>();

  const addSourceTrackIds = (sourceId: string | undefined, trackIds: string[]) => {
    if (!sourceId) {
      return;
    }

    const existing = sourceTrackIds.get(sourceId) ?? new Set<string>();
    trackIds.forEach((trackId) => existing.add(trackId));
    sourceTrackIds.set(sourceId, existing);
  };

  for (const finding of evidenceMap.findings) {
    addSourceTrackIds(finding.source_id, finding.track_ids);
  }

  for (const study of studies) {
    for (const sourceId of study.source_ids) {
      addSourceTrackIds(sourceId, study.track_ids ?? []);
    }
  }

  const allRows = evidenceMap.findings.map((finding) => {
    const source = sourceById.get(finding.source_id);
    const study = finding.study_id ? studyById.get(finding.study_id) : undefined;
    const rowInterventions = (finding.intervention_ids ?? [])
      .map((interventionId) => interventionById.get(interventionId))
      .filter((intervention): intervention is InterventionRecord => Boolean(intervention))
      .map(formatInterventionForEvidenceMap);
    const trackContexts = (finding.track_ids ?? [])
      .map((trackId) => trackById.get(trackId))
      .filter((track): track is NonNullable<typeof track> => Boolean(track))
      .map((track) => ({
        id: track.id,
        name: track.name,
        href: track.href,
        primary_hallmark_id: track.primary_hallmark_id,
        primary_hallmark_name: track.primary_hallmark_name,
        stage: track.outlook?.stage,
        stage_label: track.outlook?.stage_label,
        confidence: track.outlook?.confidence,
        read_firmness_label: track.outlook?.read_firmness_label,
        coverage_verdict: track.coverage?.coverage_verdict,
        coverage_verdict_label: track.coverage?.coverage_verdict_label,
        coverage_confidence: track.coverage?.coverage_confidence,
        coverage_confidence_label: track.coverage?.coverage_confidence_label,
        observed_research_density: track.coverage?.observed_research_density,
        observed_research_density_label: track.coverage?.observed_research_density_label
      }));
    const hallmarks = finding.hallmark_ids
      .map((hallmarkId) => hallmarkById.get(hallmarkId))
      .filter((hallmark): hallmark is NonNullable<typeof hallmark> => Boolean(hallmark))
      .map((hallmark) => ({
        id: hallmark.id,
        name: hallmark.name,
        href: hallmark.href
      }));
    const sourceReuseTrackIds = Array.from(sourceTrackIds.get(finding.source_id) ?? []).sort((left, right) =>
      left.localeCompare(right)
    );
    const species = getEvidenceSpecies(finding);
    const row = {
      ...finding,
      href: `/findings/${finding.id}`,
      evidence_tier_label: getReadableDataLabel(finding.evidence_tier),
      direction_label: getReadableDataLabel(finding.direction),
      endpoint_category_label: getReadableDataLabel(finding.endpoint_category),
      read_firmness_label: getFindingWeightLabel(finding.confidence),
      evidence_strength_score: getFindingStrength(finding),
      species,
      species_label: getReadableDataLabel(species),
      source_type: source?.source_type,
      source_type_label: source?.source_type ? getReadableDataLabel(source.source_type) : undefined,
      source_year: source?.year,
      source_published_on: source?.published_on,
      source_reuse_track_count: sourceReuseTrackIds.length,
      source_reuse_track_ids: sourceReuseTrackIds,
      source: source ?? null,
      study: study ? formatStudyForEvidenceMap(study) : null,
      interventions: rowInterventions,
      track_contexts: trackContexts,
      hallmarks
    };

    return {
      ...row,
      searchable_text: getEvidenceIndexSearchText({
        ...row,
        source: source
          ? {
              id: source.id,
              name: source.name,
              short_name: source.short_name,
              source_type: source.source_type,
              venue: source.venue,
              year: source.year
            }
          : undefined,
        study: study
          ? {
              id: study.id,
              name: study.name,
              summary: study.summary,
              population: study.population,
              model_system: study.model_system
            }
          : undefined
      })
    };
  });
  const filteredRows = sortEvidenceIndexRows(
    applyEvidenceIndexFilters(allRows, selected),
    selected.sort as EvidenceIndexSort
  );
  const visibleRows = selected.limit ? filteredRows.slice(0, selected.limit) : filteredRows;
  const exportedRows = visibleRows.map(({ searchable_text: _searchableText, ...row }) => row);
  const savedViewDefinitions: Array<{
    id: string;
    label: string;
    summary: string;
    kind: "evidence" | "trials";
    filters?: EvidenceIndexFilters;
    path?: string;
  }> = [
    {
      id: "human-biomarker-signals",
      label: "Human biomarker signals",
      summary: "Evidence statements where the strongest direct signal is a human biomarker.",
      kind: "evidence",
      filters: { tier: "human_biomarker" }
    },
    {
      id: "positive-animal-lifespan",
      label: "Positive animal lifespan",
      summary: "Positive lifespan or mortality findings that are still animal evidence.",
      kind: "evidence",
      filters: { tier: "mortality_or_lifespan", direction: "positive", species: "animal" }
    },
    {
      id: "active-trials-no-results",
      label: "Active trials without posted results",
      summary: "Registry-linked trial watch records that have not posted results.",
      kind: "trials",
      path: "/trials?scope=active&result=not_posted"
    },
    {
      id: "low-confidence-high-coverage",
      label: "Low-confidence claims in well-mapped areas",
      summary: "Low-confidence findings attached to at least one high-confidence coverage map.",
      kind: "evidence",
      filters: { confidence: "low", coverage_confidence: "high" }
    },
    {
      id: "multi-track-sources",
      label: "Sources reused across tracks",
      summary: "Findings whose source appears in more than one track context.",
      kind: "evidence",
      filters: { source_reuse: "multi_track", sort: "source_reuse" }
    }
  ];
  const savedViews = savedViewDefinitions.map((view) => ({
    id: view.id,
    label: view.label,
    summary: view.summary,
    kind: view.kind,
    path:
      view.path ??
      getEvidenceIndexQueryPath("/evidence", {
        ...view.filters
      }),
    data_path:
      view.kind === "evidence"
        ? getEvidenceIndexQueryPath("/data/evidence-index.json", {
            ...view.filters
          })
        : undefined,
    count:
      view.kind === "evidence"
        ? applyEvidenceIndexFilters(allRows, view.filters ?? {}).length
        : evidenceMap.trials.filter(
            (trial) => trial.watch_status === "active_watch" && trial.results_status === "not_posted"
          ).length
  }));
  const sourceIds = new Set(exportedRows.map((row) => row.source_id));
  const trackIds = new Set(exportedRows.flatMap((row) => row.track_ids));
  const interventionIds = new Set(exportedRows.flatMap((row) => row.intervention_ids));
  const multiTrackSourceIds = new Set(
    exportedRows.filter((row) => row.source_reuse_track_count > 1).map((row) => row.source_id)
  );

  return {
    schema_version: "1.0.0",
    schema_url: "/data/evidence-index.schema.json",
    export_type: "lev_tracker_evidence_index",
    generated_at: new Date().toISOString(),
    last_public_update: evidenceMap.last_public_update,
    canonical_path: getEvidenceIndexQueryPath("/data/evidence-index.json", selected),
    page_path: getEvidenceIndexQueryPath("/evidence", selected),
    applied_filters: getAppliedEvidenceFilters(selected),
    caveats: [
      "This is an index of promoted tracker findings, not a comprehensive literature search.",
      "Evidence-tier labels and confidence labels are tracker summaries; inspect source and study records before citing a claim.",
      "Source reuse means the same source is mapped to more than one tracker track, not that it independently validates multiple claims."
    ],
    summary: {
      total_finding_count: allRows.length,
      filtered_finding_count: filteredRows.length,
      returned_finding_count: exportedRows.length,
      human_finding_count: exportedRows.filter((row) => row.species === "human").length,
      animal_finding_count: exportedRows.filter((row) => row.species === "animal").length,
      positive_finding_count: exportedRows.filter((row) => row.direction === "positive").length,
      null_or_negative_finding_count: exportedRows.filter(
        (row) => row.direction === "null" || row.direction === "negative"
      ).length,
      source_count: sourceIds.size,
      multi_track_source_count: multiTrackSourceIds.size,
      track_count: trackIds.size,
      intervention_count: interventionIds.size
    },
    facet_options: {
      hallmarks: evidenceMap.hallmarks.map((hallmark) => ({ value: hallmark.id, label: hallmark.name })),
      tracks: evidenceMap.tracks.map((track) => ({ value: track.id, label: track.name })),
      interventions: interventions
        .map((intervention) => ({ value: intervention.id, label: intervention.name }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      evidence_tiers: uniqueEvidenceFilterOptions(
        allRows.map((row) => ({ value: row.evidence_tier, label: row.evidence_tier_label }))
      ),
      directions: uniqueEvidenceFilterOptions(
        allRows.map((row) => ({ value: row.direction, label: row.direction_label }))
      ),
      confidences: [
        { value: "low", label: getFindingWeightLabel("low") },
        { value: "moderate", label: getFindingWeightLabel("moderate") },
        { value: "high", label: getFindingWeightLabel("high") }
      ],
      endpoints: uniqueEvidenceFilterOptions(
        allRows.map((row) => ({ value: row.endpoint_category, label: row.endpoint_category_label }))
      ),
      source_types: uniqueEvidenceFilterOptions(
        allRows
          .filter((row) => row.source_type)
          .map((row) => ({ value: row.source_type ?? "", label: row.source_type_label }))
      ),
      coverage_confidences: [
        { value: "low", label: getCoverageConfidenceLabel("low") },
        { value: "moderate", label: getCoverageConfidenceLabel("moderate") },
        { value: "high", label: getCoverageConfidenceLabel("high") }
      ],
      species: [
        { value: "human", label: "Human" },
        { value: "animal", label: "Animal" },
        { value: "nonhuman", label: "Nonhuman mechanistic" }
      ],
      source_reuse: [
        { value: "multi_track", label: "Multi-track sources" },
        { value: "single_track", label: "Single-track sources" }
      ],
      sorts: [
        { value: "strength", label: "Evidence strength" },
        { value: "newest", label: "Newest source" },
        { value: "source_reuse", label: "Source reuse" },
        { value: "track", label: "Track" },
        { value: "confidence", label: "Finding confidence" }
      ]
    },
    saved_views: savedViews,
    findings: exportedRows
  };
}

function normalizeRegistryLookupId(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export async function getSourceAuditById(sourceId: string) {
  noStore();
  const normalizedSourceId = normalizeRoutedSourceId(sourceId);
  const [outlooks, sources, studies, findings, interventions, trials, activityItems, publicationEvents] =
    await Promise.all([
      loadOutlooks(),
      loadSources(),
      loadStudies(),
      loadFindings(),
      loadInterventions(),
      getTrials(),
      loadActivityItems(),
      loadPublicationEvents()
    ]);
  const source = sources.find((item) => item.id === normalizedSourceId);

  if (!source) {
    return undefined;
  }

  const latestOutlook = [...outlooks].sort((left, right) =>
    compareDateTimesDescending(left.last_updated, right.last_updated)
  )[0];
  const lastUpdated = publicationEvents[0]?.published_at ?? latestOutlook?.last_updated ?? new Date().toISOString();
  const sourceFindings = findings
    .filter((finding) => finding.source_id === source.id)
    .sort(compareFindingsByStrength);
  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const sourceFindingIds = new Set(sourceFindings.map((finding) => finding.id));
  const directStudyIds = new Set([
    ...sourceFindings.map((finding) => finding.study_id).filter((value): value is string => Boolean(value)),
    ...studies.filter((study) => study.source_ids.includes(source.id)).map((study) => study.id)
  ]);
  const sourceStudies = studies
    .filter((study) => directStudyIds.has(study.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const sourceStudyIds = new Set(sourceStudies.map((study) => study.id));
  const outlookLinks: SourceAuditOutlookLink[] = outlooks
    .filter((outlook) => outlook.subject_type === "track")
    .flatMap((outlook): SourceAuditOutlookLink[] => {
      const track = getTrackById(outlook.subject_id);
      const supportingLinks = (outlook.supporting_evidence ?? []).filter(
        (item) =>
          item.source_ids?.includes(source.id) ||
          item.finding_ids.some((findingId) => sourceFindingIds.has(findingId))
      );
      const isDirectSource = outlook.supporting_source_ids?.includes(source.id) ?? false;

      if (!supportingLinks.length && !isDirectSource) {
        return [];
      }

      const common = {
        outlook_id: outlook.id,
        track_id: outlook.subject_id,
        track_name: track?.name ?? titleizeIdentifier(outlook.subject_id),
        href: `/tracks/${outlook.subject_id}`,
        stage: outlook.evidence_stage,
        stage_label: getStageLabel(outlook.evidence_stage),
        confidence: outlook.confidence,
        read_firmness_label: getReadFirmnessLabel(outlook.confidence),
        last_updated: outlook.last_updated
      };

      if (!supportingLinks.length) {
        return [
          {
            ...common,
            source_link_type: "supporting_source",
            label: "Supporting source",
            outlook_field: undefined,
            support_role: "contextualizes",
            conclusion: "Listed as a supporting source for the public track read.",
            rationale: outlook.interpretation_note,
            finding_ids: [],
            source_ids: [source.id],
            limitations: []
          }
        ];
      }

      return supportingLinks.map((link) => ({
        ...common,
        source_link_type: link.source_ids?.includes(source.id) ? "supporting_evidence_source" : "finding_source",
        label: link.label,
        outlook_field: link.outlook_field,
        support_role: link.support_role,
        conclusion: link.conclusion,
        rationale: link.rationale,
        finding_ids: link.finding_ids,
        source_ids: uniqueSorted([
          ...(link.source_ids ?? []),
          ...link.finding_ids.map((id) => findingById.get(id)?.source_id)
        ]),
        limitations: link.limitations ?? []
      }));
    })
    .sort((left, right) => left.track_name.localeCompare(right.track_name) || left.label.localeCompare(right.label));
  const trackIds = uniqueSorted([
    ...sourceFindings.flatMap((finding) => finding.track_ids ?? []),
    ...sourceStudies.flatMap((study) => study.track_ids ?? []),
    ...outlookLinks.map((link) => link.track_id)
  ]);
  const trackWithGroupById = new Map(getTracks().map((track) => [track.id, track]));
  const sourceTracks = trackIds.map((trackId) => {
    const track = getTrackById(trackId);
    const primaryHallmarkId = trackWithGroupById.get(trackId)?.primaryHallmarkId ?? "";

    return {
      id: trackId,
      name: track?.name ?? titleizeIdentifier(trackId),
      href: `/tracks/${trackId}`,
      primary_hallmark_id: primaryHallmarkId,
      primary_hallmark_name: primaryHallmarkId
        ? getHallmarkById(primaryHallmarkId)?.name ?? primaryHallmarkId
        : undefined
    };
  });
  const interventionIds = uniqueSorted([
    ...sourceFindings.flatMap((finding) => finding.intervention_ids ?? []),
    ...sourceStudies.flatMap((study) => study.intervention_ids ?? [])
  ]);
  const sourceInterventions = interventions
    .filter((intervention) => interventionIds.includes(intervention.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const hallmarkIds = uniqueSorted([
    ...sourceFindings.flatMap((finding) => finding.hallmark_ids),
    ...sourceStudies.flatMap((study) => study.hallmark_ids ?? []),
    ...sourceTracks.flatMap((track) => [
      track.primary_hallmark_id,
      ...(getTrackById(track.id)?.secondary_hallmark_ids ?? [])
    ])
  ]);
  const sourceRegistryLookupIds = new Set(
    [source.id, ...(source.registry_ids ?? [])].map(normalizeRegistryLookupId)
  );
  const sourceTrials = trials
    .filter(
      (trial) =>
        sourceStudyIds.has(trial.id) ||
        trial.registryIds.some((registryId) => sourceRegistryLookupIds.has(normalizeRegistryLookupId(registryId)))
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const directActivityItems = activityItems
    .filter((item) => item.source_ids?.includes(source.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      summary: item.summary,
      occurred_on: item.occurred_on,
      activity_type: item.activity_type,
      activity_lane: item.activity_lane,
      source_ids: item.source_ids ?? [],
      study_ids: item.study_ids ?? [],
      track_ids: item.track_ids ?? [],
      href: "/activity"
    }));

  return {
    schema_version: "1.0.0",
    schema_url: "/data/source-audit.schema.json",
    export_type: "lev_tracker_source_audit",
    generated_at: new Date().toISOString(),
    last_public_update: lastUpdated,
    scope: {
      type: "source",
      source_id: source.id,
      canonical_path: getSourceJsonPath(source.id),
      page_path: getSourcePagePath(source.id),
      full_export_path: "/data/evidence-map.json"
    },
    caveats: [
      "This endpoint shows how the tracker uses a source; it is not a full paper annotation or substitute for the source itself.",
      "Findings are promoted evidence statements and may not include every result in the source.",
      "Track outlook links show rating rationale connections, not independent confirmation that an intervention works."
    ],
    source: formatSourceForEvidenceMap(source),
    external_links: getSourceExternalLinks(source),
    summary: {
      finding_count: sourceFindings.length,
      study_count: sourceStudies.length,
      track_count: sourceTracks.length,
      hallmark_count: hallmarkIds.length,
      intervention_count: sourceInterventions.length,
      outlook_link_count: outlookLinks.length,
      registry_linked_trial_count: sourceTrials.length,
      activity_item_count: directActivityItems.length
    },
    findings: sourceFindings.map(formatFindingForEvidenceMap),
    studies: sourceStudies.map(formatStudyForEvidenceMap),
    tracks: sourceTracks,
    hallmarks: hallmarkIds.map((hallmarkId) => {
      const hallmark = getHallmarkById(hallmarkId);

      return {
        id: hallmarkId,
        name: hallmark?.name ?? titleizeIdentifier(hallmarkId),
        href: `/hallmarks/${hallmarkId}`
      };
    }),
    interventions: sourceInterventions.map(formatInterventionForEvidenceMap),
    trials: sourceTrials.map(formatTrialForEvidenceMap),
    outlook_links: outlookLinks,
    activity_items: directActivityItems,
    source_file_patterns: {
      source: [`data/sources/${source.id}.json`],
      linked_records: Array.from(
        new Set([
          ...sourceFindings.map((finding) => `data/findings/${finding.id}.json`),
          ...sourceStudies.map((study) => `data/studies/${study.id}.json`),
          ...sourceInterventions.map((intervention) => `data/interventions/${intervention.id}.json`),
          ...outlookLinks.map((link) => `data/outlooks/${link.outlook_id}.json`)
        ])
      ).sort((left, right) => left.localeCompare(right))
    }
  };
}

export async function getOverallSnapshot() {
  noStore();
  const [recentChanges, overallOutlook] = await Promise.all([getRecentChanges(), getOverallOutlook()]);

  return {
    lastPublicUpdate: recentChanges[0]?.date ?? overallOutlook.lastUpdated,
    hallmarksTracked: hallmarksTaxonomy.hallmarks.length,
    researchTracks: getTracks().length,
    recentOutlookChanges: recentChanges.filter((item) => item.changeType === "outlook").length,
    reviewStatus: "Reviewed before publishing"
  };
}

export async function getHomepageData() {
  noStore();
  const [
    overallOutlook,
    hallmarkOutlooks,
    hallmarks,
    recentChanges,
    snapshot,
    currentLevStory,
    publicationEvents,
    stateOfFieldEditions
  ] =
    await Promise.all([
      getOverallOutlook(),
      getHallmarkOutlooks(),
      Promise.resolve(getHallmarks()),
      getRecentChanges(),
      getOverallSnapshot(),
      loadCurrentLevStory(),
      loadPublicationEvents(),
      loadStateOfFieldEditions()
    ]);
  const linkedStateOfFieldEdition =
    stateOfFieldEditions.find((edition) => edition.slug === currentLevStory.related_state_of_field_slug) ??
    stateOfFieldEditions[0];

  return {
    overallOutlook,
    hallmarkOutlooks,
    hallmarks,
    recentChanges,
    snapshot,
    currentLevStory,
    linkedStateOfFieldEdition,
    currentLevStoryStatus: buildCurrentLevStoryStatus(currentLevStory, publicationEvents)
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
  await withCandidateBundleLock(bundleId, async () => {
    const bundle = await readCandidateBundleFile(bundleId);

    if (!bundle) {
      throw new Error(`Unknown staged update: ${bundleId}`);
    }

    if (!canTransitionCandidateBundleStatus(bundle.lifecycle_status, status)) {
      throw new Error(`Invalid staged update status transition: ${bundle.lifecycle_status} -> ${status}`);
    }

    if (status === "approved") {
      const evidenceReviewGate = await evaluateBundleEvidenceReviews(bundle);

      if (evidenceReviewGate.eligible && !evidenceReviewGate.ready) {
        throw new Error(
          `Staged update ${bundleId} is not ready for approval: ${evidenceReviewGate.issues.join(" ")}`
        );
      }
    }

    await writeJsonFile(getCandidateBundlePath(bundleId), {
      ...bundle,
      lifecycle_status: status
    });
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
  await withCandidateBundleLock(input.bundleId, async () => {
    const bundle = await readCandidateBundleFile(input.bundleId);

    if (!bundle) {
      throw new Error(`Unknown staged update: ${input.bundleId}`);
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
      review_comment_ids: Array.from(new Set([...(bundle.review_comment_ids ?? []), commentId]))
    });
  });
}

export async function publishCandidateBundle(bundleId: string) {
  await withCandidateBundleLock(bundleId, async () => {
    const bundle = await readCandidateBundleFile(bundleId);

    if (!bundle) {
      throw new Error(`Unknown staged update: ${bundleId}`);
    }

    if (bundle.lifecycle_status === "published") {
      throw new Error(`Staged update ${bundleId} is already published.`);
    }

    const promotion = await evaluateBundlePromotion(bundle);

    if (!promotion.eligible) {
      throw new Error(`Staged update ${bundleId} must be approved before publication.`);
    }

    if (!promotion.ready) {
      throw new Error(`Staged update ${bundleId} is not ready to publish: ${promotion.issues.join(" ")}`);
    }

    const evidenceReviewGate = await evaluateBundleEvidenceReviews(bundle);

    if (evidenceReviewGate.eligible && !evidenceReviewGate.ready) {
      throw new Error(
        `Staged update ${bundleId} is blocked by evidence review: ${evidenceReviewGate.issues.join(" ")}`
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
        "A reviewed staged update was published to the public site."
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
      publication_event_ids: Array.from(new Set([...(bundle.publication_event_ids ?? []), publicationEventId]))
    });
  });
}
