import "server-only";

import { createHash } from "crypto";
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
export type EvidenceQualityClass =
  | "stronger_human_signal"
  | "human_biomarker_or_limited_function"
  | "preclinical_or_mechanistic"
  | "review_or_context"
  | "registry_or_no_results"
  | "limiting_or_null";
export type EvidenceStudyDesignFlag =
  | "randomized"
  | "controlled"
  | "registry_linked"
  | "result_posted"
  | "no_results_registry"
  | "review_or_meta_analysis"
  | "preclinical"
  | "human_interventional"
  | "observational_or_real_world"
  | "animal_or_model"
  | "mechanistic_or_in_vitro";
export type EvidenceHumanRelevanceFlag =
  | "older_adults"
  | "healthy_adults"
  | "disease_cohort"
  | "human_biomarker"
  | "functional_endpoint"
  | "clinical_or_healthspan_endpoint"
  | "safety_endpoint"
  | "animal_only"
  | "nonhuman_model";
export type EvidenceLimitationTag =
  | "low_confidence"
  | "surrogate_or_biomarker_endpoint"
  | "animal_only"
  | "short_duration"
  | "small_sample"
  | "underpowered_or_exploratory"
  | "confounded_or_observational"
  | "mixed_or_null_direction"
  | "no_posted_results"
  | "safety_unresolved"
  | "review_not_primary_evidence"
  | "industry_or_conflict_caveat";
export type EvidenceConsistencyClass =
  | "consistent_positive_signal"
  | "mixed_or_conflicting_signal"
  | "animal_positive_human_limited"
  | "biomarker_positive_function_mixed"
  | "single_source_or_unreplicated"
  | "registry_results_gap"
  | "insufficient_mapped_evidence";
export type EvidenceConsistencyPattern =
  | "positive_and_null_or_negative"
  | "animal_positive_human_null_or_mixed"
  | "biomarker_positive_function_mixed_or_null"
  | "single_source_positive_signal"
  | "registry_no_results_with_positive_claims"
  | "preclinical_positive_no_human"
  | "review_context_without_primary"
  | "mixed_direction_findings"
  | "replicated_human_positive_signal";
export type ClaimBoundaryClass =
  | "human_claim_bounded"
  | "early_human_signal_only"
  | "preclinical_or_mechanistic_only"
  | "conflicted_or_mixed_claim"
  | "registry_pending_claim"
  | "coverage_limited_claim"
  | "not_yet_claimable";
export type ClaimOverclaimRisk =
  | "human_lifespan_extension"
  | "clinical_use_or_medical_advice"
  | "class_wide_generalization"
  | "dose_schedule_transfer"
  | "biomarker_surrogate_leap"
  | "preclinical_translation_leap"
  | "single_study_or_source_overweight"
  | "safety_or_durability_overclaim"
  | "registry_results_absent"
  | "coverage_completeness_overclaim";
export type ClaimConsistencyIssueType =
  | "possible_unsupported_inference"
  | "medical_advice_language"
  | "missing_registry_boundary"
  | "missing_conflict_boundary"
  | "missing_biomarker_boundary"
  | "missing_preclinical_boundary"
  | "missing_coverage_boundary"
  | "missing_safety_or_durability_boundary";
export type ClaimConsistencySeverity = "critical" | "warning" | "review";
export type ClaimConsistencySourceKind =
  | "track_outlook"
  | "track_supporting_evidence"
  | "track_taxonomy"
  | "current_story"
  | "state_of_field";
export type ClaimConsistencyReviewStatus = "open" | "accepted" | "false_positive" | "fixed" | "deferred";
export type ClaimConsistencyLifecycleState = "new" | "recurring" | "resolved";

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
  quality_class?: EvidenceQualityClass | "";
  limitation?: EvidenceLimitationTag | "";
  human_relevance?: EvidenceHumanRelevanceFlag | "";
  consistency_pattern?: EvidenceConsistencyPattern | "";
  sort?: EvidenceIndexSort | "";
  limit?: number;
};

export type EvidenceGapSeverity = "high_priority" | "human_endpoint" | "trial_sensitive" | "sparse_checked" | "map_work_needed";
export type EvidenceGapResearchDensityFilter = ObservedResearchDensity | "active_or_dense" | "sparse_or_emerging";
export type EvidenceGapSort = "severity" | "high_priority" | "density" | "track" | "stage";
export type CoverageMethodClass =
  | "needs_source_discovery"
  | "recent_activity_review_due"
  | "needs_registry_check"
  | "likely_field_scarcity"
  | "active_mapped";

export type EvidenceGapFilters = {
  q?: string;
  hallmark?: string;
  track?: string;
  stage?: Stage | "";
  coverage_confidence?: CoverageConfidence | "";
  research_density?: EvidenceGapResearchDensityFilter | "";
  severity?: EvidenceGapSeverity | "";
  sort?: EvidenceGapSort | "";
  limit?: number;
};

export type CoverageAuditFilters = {
  track?: string;
  method_class?: CoverageMethodClass | "";
  limit?: number;
};

export type EvidenceQualityFilters = {
  track?: string;
  quality_class?: EvidenceQualityClass | "";
  limitation?: EvidenceLimitationTag | "";
  human_relevance?: EvidenceHumanRelevanceFlag | "";
  source_type?: string;
  limit?: number;
};

export type EvidenceConflictFilters = {
  track?: string;
  consistency_class?: EvidenceConsistencyClass | "";
  pattern?: EvidenceConsistencyPattern | "";
  limit?: number;
};

export type ClaimGuardrailFilters = {
  q?: string;
  track?: string;
  boundary_class?: ClaimBoundaryClass | "";
  overclaim_risk?: ClaimOverclaimRisk | "";
  limit?: number;
};

export type ClaimConsistencyAuditFilters = {
  q?: string;
  track?: string;
  issue_type?: ClaimConsistencyIssueType | "";
  severity?: ClaimConsistencySeverity | "";
  source_kind?: ClaimConsistencySourceKind | "";
  review_status?: ClaimConsistencyReviewStatus | "";
  lifecycle_state?: ClaimConsistencyLifecycleState | "";
  limit?: number;
};
export type ClaimConsistencyReviewPacketFilters = ClaimConsistencyAuditFilters;

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
  hallmark_id?: string;
  name?: string;
  coverage_status?: "not_started" | "stubbed" | "baseline" | "deepened";
  next_mode?: "bootstrap" | "surveillance" | "coverage_repair";
  queue_state?: "ready" | "active_review" | "deferred";
  last_session_id?: string;
  last_session_at?: string;
  last_session_mode?: "bootstrap" | "surveillance" | "coverage_repair";
  last_session_outcome?: string;
  last_surveillance_session_id?: string;
  last_surveillance_at?: string;
  last_surveillance_mode?: "surveillance" | "coverage_repair";
  last_surveillance_outcome?: string;
  surveillance_freshness_status?: "never_checked" | "due" | "recent";
  surveillance_due_at?: string;
  surveillance_age_days?: number;
  last_candidate_bundle_id?: string;
  last_candidate_bundle_status?: CandidateStatus;
  last_publication_event_id?: string;
  last_published_at?: string;
  coverage_verdict?: CoverageVerdict;
  coverage_confidence?: CoverageConfidence;
  observed_research_density?: ObservedResearchDensity;
  known_gap_count?: number;
  high_priority_gap_count?: number;
  last_coverage_assessment_id?: string;
  last_coverage_assessed_at?: string;
  next_coverage_action?: string;
  last_coverage_recommended_mode?: "bootstrap" | "surveillance" | "coverage_repair";
  default_research_question?: string;
  notes?: string;
};

type CoverageStatusFile = {
  updated_at?: string;
  notes?: string[];
  tracks: CoverageStatusTrack[];
};

type CoverageAssessmentFile = {
  id: string;
  name: string;
  short_name?: string;
  track_id: string;
  hallmark_id: string;
  assessment_type: "bootstrap" | "surveillance" | "coverage_repair" | "manual";
  assessed_at: string;
  assessment_window?: {
    from?: string;
    to?: string;
    basis: string;
  };
  coverage_verdict: CoverageVerdict;
  coverage_confidence?: CoverageConfidence;
  observed_research_density?: Exclude<ObservedResearchDensity, "unknown">;
  summary: string;
  reviewed_artifacts?: {
    research_session_ids?: string[];
    candidate_bundle_ids?: string[];
    evidence_review_ids?: string[];
    publication_event_ids?: string[];
    outlook_ids?: string[];
  };
  evidence_categories: Array<{
    category: string;
    coverage_level: "not_checked" | "thin" | "adequate" | "strong" | "not_applicable";
    rationale: string;
    source_ids?: string[];
    finding_ids?: string[];
    gap_note?: string;
  }>;
  covered_source_ids: string[];
  covered_finding_ids?: string[];
  search_log_summary?: string;
  source_selection_notes?: string[];
  known_gaps: Array<{
    gap_id: string;
    gap_type: "coverage_gap" | "evidence_gap" | "operational_gap";
    category: string;
    description: string;
    priority: "low" | "medium" | "high";
    suggested_action: string;
  }>;
  next_coverage_action: string;
  next_recommended_mode: "bootstrap" | "surveillance" | "coverage_repair";
  tags?: string[];
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

const coverageMethodClassLabels: Record<CoverageMethodClass, string> = {
  needs_source_discovery: "Needs source discovery",
  recent_activity_review_due: "Review due",
  needs_registry_check: "Registry watch",
  likely_field_scarcity: "Likely field scarcity",
  active_mapped: "Active mapped field"
};

const coverageMethodClassPlainMeanings: Record<CoverageMethodClass, string> = {
  needs_source_discovery:
    "Coverage is thin, low-confidence, or missing, so sparse evidence should not be interpreted as a sparse field yet.",
  recent_activity_review_due:
    "The map is usable, but surveillance is due or has not been checked recently enough for a confident current read.",
  needs_registry_check:
    "The map is usable, but active or no-results registry records are a live source of possible rating changes.",
  likely_field_scarcity:
    "The map is usable and the observed research density is sparse or emerging, so low counts more likely reflect field scarcity.",
  active_mapped:
    "The map is usable and the field is active or dense enough that interpretation, not basic source discovery, is the main task."
};

const evidenceQualityClassLabels: Record<EvidenceQualityClass, string> = {
  stronger_human_signal: "Stronger human signal",
  human_biomarker_or_limited_function: "Human biomarker or limited function",
  preclinical_or_mechanistic: "Preclinical or mechanistic",
  review_or_context: "Review or context",
  registry_or_no_results: "Registry or no-results",
  limiting_or_null: "Limiting or null"
};

const evidenceQualityClasses: EvidenceQualityClass[] = [
  "stronger_human_signal",
  "human_biomarker_or_limited_function",
  "preclinical_or_mechanistic",
  "review_or_context",
  "registry_or_no_results",
  "limiting_or_null"
];

const evidenceQualityClassPlainMeanings: Record<EvidenceQualityClass, string> = {
  stronger_human_signal:
    "Human evidence with functional, clinical, healthspan, mortality, or safety relevance and no dominant limiting/null classification.",
  human_biomarker_or_limited_function:
    "Human evidence where interpretation still depends heavily on biomarkers, short duration, small samples, or other limits.",
  preclinical_or_mechanistic:
    "Animal, in vitro, or mechanism-heavy evidence that should not be treated as direct human aging evidence.",
  review_or_context:
    "Review, meta-analysis, regulatory, company, or other context source rather than a direct primary-result record.",
  registry_or_no_results:
    "Registry-linked or trial-watch evidence where posted results are absent, pending, or central to interpretation.",
  limiting_or_null:
    "A finding whose direction or caveats primarily limit, balance, or weaken the claim."
};

const evidenceStudyDesignFlagLabels: Record<EvidenceStudyDesignFlag, string> = {
  randomized: "Randomized",
  controlled: "Controlled",
  registry_linked: "Registry linked",
  result_posted: "Result posted",
  no_results_registry: "No posted registry results",
  review_or_meta_analysis: "Review or meta-analysis",
  preclinical: "Preclinical",
  human_interventional: "Human interventional",
  observational_or_real_world: "Observational or real-world",
  animal_or_model: "Animal or model system",
  mechanistic_or_in_vitro: "Mechanistic or in vitro"
};

const evidenceStudyDesignFlags: EvidenceStudyDesignFlag[] = [
  "randomized",
  "controlled",
  "registry_linked",
  "result_posted",
  "no_results_registry",
  "review_or_meta_analysis",
  "preclinical",
  "human_interventional",
  "observational_or_real_world",
  "animal_or_model",
  "mechanistic_or_in_vitro"
];

const evidenceHumanRelevanceFlagLabels: Record<EvidenceHumanRelevanceFlag, string> = {
  older_adults: "Older adults",
  healthy_adults: "Healthy adults",
  disease_cohort: "Disease cohort",
  human_biomarker: "Human biomarker",
  functional_endpoint: "Functional endpoint",
  clinical_or_healthspan_endpoint: "Clinical or healthspan endpoint",
  safety_endpoint: "Safety endpoint",
  animal_only: "Animal only",
  nonhuman_model: "Nonhuman model"
};

const evidenceHumanRelevanceFlags: EvidenceHumanRelevanceFlag[] = [
  "older_adults",
  "healthy_adults",
  "disease_cohort",
  "human_biomarker",
  "functional_endpoint",
  "clinical_or_healthspan_endpoint",
  "safety_endpoint",
  "animal_only",
  "nonhuman_model"
];

const evidenceLimitationTagLabels: Record<EvidenceLimitationTag, string> = {
  low_confidence: "Low confidence",
  surrogate_or_biomarker_endpoint: "Surrogate or biomarker endpoint",
  animal_only: "Animal only",
  short_duration: "Short duration",
  small_sample: "Small sample",
  underpowered_or_exploratory: "Underpowered or exploratory",
  confounded_or_observational: "Confounded or observational",
  mixed_or_null_direction: "Mixed, null, or negative direction",
  no_posted_results: "No posted results",
  safety_unresolved: "Safety unresolved",
  review_not_primary_evidence: "Review is not primary evidence",
  industry_or_conflict_caveat: "Industry or conflict caveat"
};

const evidenceLimitationTags: EvidenceLimitationTag[] = [
  "low_confidence",
  "surrogate_or_biomarker_endpoint",
  "animal_only",
  "short_duration",
  "small_sample",
  "underpowered_or_exploratory",
  "confounded_or_observational",
  "mixed_or_null_direction",
  "no_posted_results",
  "safety_unresolved",
  "review_not_primary_evidence",
  "industry_or_conflict_caveat"
];

const evidenceConsistencyClassLabels: Record<EvidenceConsistencyClass, string> = {
  consistent_positive_signal: "Consistent positive signal",
  mixed_or_conflicting_signal: "Mixed or conflicting signal",
  animal_positive_human_limited: "Animal-positive, human-limited",
  biomarker_positive_function_mixed: "Biomarker-positive, function mixed",
  single_source_or_unreplicated: "Single-source or unreplicated",
  registry_results_gap: "Registry results gap",
  insufficient_mapped_evidence: "Insufficient mapped evidence"
};

const evidenceConsistencyClasses: EvidenceConsistencyClass[] = [
  "consistent_positive_signal",
  "mixed_or_conflicting_signal",
  "animal_positive_human_limited",
  "biomarker_positive_function_mixed",
  "single_source_or_unreplicated",
  "registry_results_gap",
  "insufficient_mapped_evidence"
];

const evidenceConsistencyClassPlainMeanings: Record<EvidenceConsistencyClass, string> = {
  consistent_positive_signal:
    "Mapped findings lean positive across more than one source or study without a dominant contradiction pattern.",
  mixed_or_conflicting_signal:
    "Positive findings coexist with mixed, null, negative, or inconclusive findings in the same track.",
  animal_positive_human_limited:
    "Animal-positive evidence exists, but human evidence is absent, mixed, null, or otherwise limiting.",
  biomarker_positive_function_mixed:
    "Human biomarker findings look positive while functional, clinical, or healthspan outcomes remain mixed, null, or absent.",
  single_source_or_unreplicated:
    "The positive signal currently rests on one source or study, so replication is a central limitation.",
  registry_results_gap:
    "Positive or promising claims coexist with registry-linked trials that have no posted results or pending results.",
  insufficient_mapped_evidence:
    "Too few promoted findings are mapped to judge consistency or replication."
};

const evidenceConsistencyPatternLabels: Record<EvidenceConsistencyPattern, string> = {
  positive_and_null_or_negative: "Positive plus null/negative",
  animal_positive_human_null_or_mixed: "Animal positive, human null/mixed",
  biomarker_positive_function_mixed_or_null: "Biomarker positive, function mixed/null",
  single_source_positive_signal: "Single-source positive signal",
  registry_no_results_with_positive_claims: "No-results registry with positive claims",
  preclinical_positive_no_human: "Preclinical positive, no human evidence",
  review_context_without_primary: "Review context without primary result",
  mixed_direction_findings: "Mixed-direction findings",
  replicated_human_positive_signal: "Replicated human positive signal"
};

const evidenceConsistencyPatterns: EvidenceConsistencyPattern[] = [
  "positive_and_null_or_negative",
  "animal_positive_human_null_or_mixed",
  "biomarker_positive_function_mixed_or_null",
  "single_source_positive_signal",
  "registry_no_results_with_positive_claims",
  "preclinical_positive_no_human",
  "review_context_without_primary",
  "mixed_direction_findings",
  "replicated_human_positive_signal"
];

const claimBoundaryClassLabels: Record<ClaimBoundaryClass, string> = {
  human_claim_bounded: "Human claim, bounded",
  early_human_signal_only: "Early human signal only",
  preclinical_or_mechanistic_only: "Preclinical or mechanistic only",
  conflicted_or_mixed_claim: "Conflicted or mixed claim",
  registry_pending_claim: "Registry-pending claim",
  coverage_limited_claim: "Coverage-limited claim",
  not_yet_claimable: "Not yet claimable"
};

const claimBoundaryClasses: ClaimBoundaryClass[] = [
  "human_claim_bounded",
  "early_human_signal_only",
  "preclinical_or_mechanistic_only",
  "conflicted_or_mixed_claim",
  "registry_pending_claim",
  "coverage_limited_claim",
  "not_yet_claimable"
];

const claimBoundaryClassPlainMeanings: Record<ClaimBoundaryClass, string> = {
  human_claim_bounded:
    "The tracker can make a narrow human-evidence statement, but caveats must stay attached.",
  early_human_signal_only:
    "The tracker can describe early human biomarker or limited-function signals, not durable healthspan or lifespan benefit.",
  preclinical_or_mechanistic_only:
    "The tracker can describe biological plausibility or nonhuman signals, not direct human benefit.",
  conflicted_or_mixed_claim:
    "The tracker must emphasize mixed, null, or conflicting evidence when summarizing this track.",
  registry_pending_claim:
    "The tracker must emphasize unresolved registry results before treating the evidence as settled.",
  coverage_limited_claim:
    "The tracker must qualify claims because map coverage is not strong enough to separate field scarcity from missing review work.",
  not_yet_claimable:
    "The tracker should avoid a substantive efficacy claim until more promoted evidence or coverage is available."
};

const claimOverclaimRiskLabels: Record<ClaimOverclaimRisk, string> = {
  human_lifespan_extension: "Human lifespan extension",
  clinical_use_or_medical_advice: "Clinical use or medical advice",
  class_wide_generalization: "Class-wide generalization",
  dose_schedule_transfer: "Dose or schedule transfer",
  biomarker_surrogate_leap: "Biomarker surrogate leap",
  preclinical_translation_leap: "Preclinical translation leap",
  single_study_or_source_overweight: "Single-study or source overweight",
  safety_or_durability_overclaim: "Safety or durability overclaim",
  registry_results_absent: "Registry results absent",
  coverage_completeness_overclaim: "Coverage completeness overclaim"
};

const claimOverclaimRisks: ClaimOverclaimRisk[] = [
  "human_lifespan_extension",
  "clinical_use_or_medical_advice",
  "class_wide_generalization",
  "dose_schedule_transfer",
  "biomarker_surrogate_leap",
  "preclinical_translation_leap",
  "single_study_or_source_overweight",
  "safety_or_durability_overclaim",
  "registry_results_absent",
  "coverage_completeness_overclaim"
];

const claimConsistencyIssueTypeLabels: Record<ClaimConsistencyIssueType, string> = {
  possible_unsupported_inference: "Possible unsupported inference",
  medical_advice_language: "Medical-advice language",
  missing_registry_boundary: "Missing registry boundary",
  missing_conflict_boundary: "Missing conflict boundary",
  missing_biomarker_boundary: "Missing biomarker boundary",
  missing_preclinical_boundary: "Missing preclinical boundary",
  missing_coverage_boundary: "Missing coverage boundary",
  missing_safety_or_durability_boundary: "Missing safety or durability boundary"
};

const claimConsistencyIssueTypes: ClaimConsistencyIssueType[] = [
  "possible_unsupported_inference",
  "medical_advice_language",
  "missing_registry_boundary",
  "missing_conflict_boundary",
  "missing_biomarker_boundary",
  "missing_preclinical_boundary",
  "missing_coverage_boundary",
  "missing_safety_or_durability_boundary"
];

const claimConsistencySeverityLabels: Record<ClaimConsistencySeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  review: "Review"
};

const claimConsistencySeverities: ClaimConsistencySeverity[] = ["critical", "warning", "review"];

const claimConsistencySourceKindLabels: Record<ClaimConsistencySourceKind, string> = {
  track_outlook: "Track outlook",
  track_supporting_evidence: "Track supporting evidence",
  track_taxonomy: "Track taxonomy",
  current_story: "Current LEV story",
  state_of_field: "State of the Field"
};

const claimConsistencySourceKinds: ClaimConsistencySourceKind[] = [
  "track_outlook",
  "track_supporting_evidence",
  "track_taxonomy",
  "current_story",
  "state_of_field"
];

const claimConsistencyReviewStatusLabels: Record<ClaimConsistencyReviewStatus, string> = {
  open: "Open",
  accepted: "Accepted issue",
  false_positive: "False positive",
  fixed: "Fixed",
  deferred: "Deferred"
};

const claimConsistencyReviewStatuses: ClaimConsistencyReviewStatus[] = [
  "open",
  "accepted",
  "deferred",
  "fixed",
  "false_positive"
];

const claimConsistencyLifecycleStateLabels: Record<ClaimConsistencyLifecycleState, string> = {
  new: "New",
  recurring: "Recurring",
  resolved: "Resolved"
};

const claimConsistencyLifecycleStates: ClaimConsistencyLifecycleState[] = ["new", "recurring", "resolved"];

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
const opsRoot = path.join(process.cwd(), "ops");
const researchRoot = path.join(process.cwd(), "research");
const hallmarkInsightsPath = path.join(dataRoot, "content", "hallmark-insights.json");
const editionsRoot = path.join(dataRoot, "content", "state-of-the-field");
const currentLevStoryPath = path.join(dataRoot, "content", "current-lev-story", "current.json");
const coverageStatusPath = path.join(researchRoot, "state", "coverage-status.v1.json");
const claimConsistencyResolutionsPath = path.join(opsRoot, "claim-consistency-resolutions.v1.json");

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function readOptionalJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
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

function getCoverageAssessmentsRoot() {
  return path.join(researchRoot, "coverage-assessments");
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

const loadCoverageAssessments = cache(async () => {
  try {
    return await readCollection<CoverageAssessmentFile>(getCoverageAssessmentsRoot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
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

export function getCoverageMethodClassLabel(methodClass: CoverageMethodClass) {
  return coverageMethodClassLabels[methodClass];
}

export function getCoverageMethodClassPlainMeaning(methodClass: CoverageMethodClass) {
  return coverageMethodClassPlainMeanings[methodClass];
}

export function getEvidenceQualityClassLabel(qualityClass: EvidenceQualityClass) {
  return evidenceQualityClassLabels[qualityClass];
}

export function getEvidenceQualityClassPlainMeaning(qualityClass: EvidenceQualityClass) {
  return evidenceQualityClassPlainMeanings[qualityClass];
}

export function getEvidenceLimitationTagLabel(limitation: EvidenceLimitationTag) {
  return evidenceLimitationTagLabels[limitation];
}

export function getEvidenceHumanRelevanceFlagLabel(flag: EvidenceHumanRelevanceFlag) {
  return evidenceHumanRelevanceFlagLabels[flag];
}

export function getEvidenceConsistencyClassLabel(consistencyClass: EvidenceConsistencyClass) {
  return evidenceConsistencyClassLabels[consistencyClass];
}

export function getEvidenceConsistencyPatternLabel(pattern: EvidenceConsistencyPattern) {
  return evidenceConsistencyPatternLabels[pattern];
}

export function getClaimBoundaryClassLabel(boundaryClass: ClaimBoundaryClass) {
  return claimBoundaryClassLabels[boundaryClass];
}

export function getClaimOverclaimRiskLabel(risk: ClaimOverclaimRisk) {
  return claimOverclaimRiskLabels[risk];
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

type EvidenceQualityFindingInput = Pick<
  FindingRecord,
  | "id"
  | "name"
  | "summary"
  | "source_id"
  | "study_id"
  | "endpoint_category"
  | "direction"
  | "evidence_tier"
  | "confidence"
  | "statement"
  | "population_or_model"
  | "time_horizon"
  | "quantitative_note"
  | "caveats"
>;

type EvidenceQualitySourceInput = Pick<
  SourceRecord,
  "id" | "name" | "summary" | "source_type" | "venue" | "year" | "published_on" | "doi" | "pmid" | "registry_ids"
>;

type EvidenceQualityStudyInput = Pick<
  StudyRecord,
  | "id"
  | "name"
  | "summary"
  | "tags"
  | "study_type"
  | "status"
  | "phase"
  | "population"
  | "model_system"
  | "sample_size"
  | "registry_ids"
  | "trial_details"
>;

function getEvidenceQualityHaystack({
  finding,
  source,
  study
}: {
  finding: EvidenceQualityFindingInput;
  source?: EvidenceQualitySourceInput;
  study?: EvidenceQualityStudyInput;
}) {
  return [
    finding.name,
    finding.summary,
    finding.statement,
    finding.endpoint_category,
    finding.direction,
    finding.evidence_tier,
    finding.population_or_model,
    finding.time_horizon,
    finding.quantitative_note,
    ...(finding.caveats ?? []),
    source?.name,
    source?.summary,
    source?.source_type,
    source?.venue,
    study?.name,
    study?.summary,
    study?.study_type,
    study?.status,
    study?.phase,
    study?.population,
    study?.model_system,
    ...(study?.tags ?? []),
    study?.trial_details?.watch_status_reason,
    study?.trial_details?.horizon_note,
    study?.trial_details?.why_it_matters
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
}

function getOrderedEvidenceValues<T extends string>(values: Set<T>, order: T[]) {
  return order.filter((value) => values.has(value));
}

function hasShortEvidenceDuration(finding: EvidenceQualityFindingInput, haystack: string) {
  const durationText = [finding.time_horizon, ...(finding.caveats ?? [])].filter(Boolean).join(" ").toLocaleLowerCase();
  const monthMatch = /\b(\d+(?:\.\d+)?)\s*(?:month|months|mo)\b/.exec(durationText);
  const weekMatch = /\b(\d+(?:\.\d+)?)\s*(?:week|weeks|wk|wks)\b/.exec(durationText);
  const dayMatch = /\b(\d+(?:\.\d+)?)\s*(?:day|days)\b/.exec(durationText);

  return (
    Boolean(monthMatch && Number(monthMatch[1]) < 12) ||
    Boolean(weekMatch && Number(weekMatch[1]) <= 52) ||
    Boolean(dayMatch && Number(dayMatch[1]) <= 365) ||
    /\b(short|short-term|acute|transient|single-dose|single dose|brief)\b/.test(durationText || haystack)
  );
}

function hasSmallSample(study: EvidenceQualityStudyInput | undefined, haystack: string) {
  return Boolean(
    (study?.sample_size !== undefined && study.sample_size > 0 && study.sample_size < 100) ||
      /\b(pilot|small sample|small cohort|underpowered|n\s*=\s*\d{1,2}\b)\b/.test(haystack)
  );
}

function isEvidenceReviewOrContext({
  finding,
  source,
  study,
  haystack
}: {
  finding: EvidenceQualityFindingInput;
  source?: EvidenceQualitySourceInput;
  study?: EvidenceQualityStudyInput;
  haystack: string;
}) {
  return (
    finding.evidence_tier === "review_or_meta_analysis" ||
    finding.evidence_tier === "regulatory_or_program_update" ||
    source?.source_type === "review" ||
    source?.source_type === "company_update" ||
    source?.source_type === "regulatory_filing" ||
    study?.study_type === "review" ||
    study?.study_type === "meta_analysis" ||
    /\b(systematic review|meta-analysis|meta analysis|narrative review|regulatory|company update)\b/.test(haystack)
  );
}

function getEvidenceQualityClass({
  finding,
  studyDesignFlags,
  humanRelevanceFlags,
  limitationTags,
  haystack
}: {
  finding: EvidenceQualityFindingInput;
  studyDesignFlags: EvidenceStudyDesignFlag[];
  humanRelevanceFlags: EvidenceHumanRelevanceFlag[];
  limitationTags: EvidenceLimitationTag[];
  haystack: string;
}): EvidenceQualityClass {
  if (limitationTags.includes("no_posted_results") || studyDesignFlags.includes("no_results_registry")) {
    return "registry_or_no_results";
  }

  if (limitationTags.includes("mixed_or_null_direction")) {
    return "limiting_or_null";
  }

  if (studyDesignFlags.includes("review_or_meta_analysis") || finding.evidence_tier === "regulatory_or_program_update") {
    return "review_or_context";
  }

  if (
    studyDesignFlags.includes("preclinical") ||
    studyDesignFlags.includes("mechanistic_or_in_vitro") ||
    humanRelevanceFlags.includes("animal_only") ||
    humanRelevanceFlags.includes("nonhuman_model")
  ) {
    return "preclinical_or_mechanistic";
  }

  if (
    finding.evidence_tier === "human_biomarker" ||
    limitationTags.some((tag) =>
      [
        "surrogate_or_biomarker_endpoint",
        "short_duration",
        "small_sample",
        "underpowered_or_exploratory",
        "confounded_or_observational",
        "safety_unresolved"
      ].includes(tag)
    )
  ) {
    return "human_biomarker_or_limited_function";
  }

  if (
    isHumanEvidenceTier(finding.evidence_tier) ||
    humanRelevanceFlags.some((flag) =>
      ["functional_endpoint", "clinical_or_healthspan_endpoint", "safety_endpoint"].includes(flag)
    ) ||
    /\b(human|patient|participant|adult|trial)\b/.test(haystack)
  ) {
    return "stronger_human_signal";
  }

  return "preclinical_or_mechanistic";
}

function getEvidenceQualityReason({
  qualityClass,
  studyDesignFlags,
  humanRelevanceFlags,
  limitationTags
}: {
  qualityClass: EvidenceQualityClass;
  studyDesignFlags: EvidenceStudyDesignFlag[];
  humanRelevanceFlags: EvidenceHumanRelevanceFlag[];
  limitationTags: EvidenceLimitationTag[];
}) {
  const designLabels = studyDesignFlags.slice(0, 2).map((flag) => evidenceStudyDesignFlagLabels[flag]);
  const relevanceLabels = humanRelevanceFlags.slice(0, 2).map((flag) => evidenceHumanRelevanceFlagLabels[flag]);
  const limitationLabels = limitationTags.slice(0, 2).map((tag) => evidenceLimitationTagLabels[tag]);
  const parts = [
    designLabels.length ? `Design: ${designLabels.join(", ")}` : undefined,
    relevanceLabels.length ? `Relevance: ${relevanceLabels.join(", ")}` : undefined,
    limitationLabels.length ? `Limitations: ${limitationLabels.join(", ")}` : undefined
  ].filter((value): value is string => Boolean(value));

  return parts.length
    ? `${evidenceQualityClassLabels[qualityClass]}. ${parts.join(". ")}.`
    : evidenceQualityClassPlainMeanings[qualityClass];
}

function buildEvidenceQualityProfile({
  finding,
  source,
  study
}: {
  finding: EvidenceQualityFindingInput;
  source?: EvidenceQualitySourceInput;
  study?: EvidenceQualityStudyInput;
}) {
  const haystack = getEvidenceQualityHaystack({ finding, source, study });
  const species = getEvidenceSpecies(finding);
  const studyDesignFlags = new Set<EvidenceStudyDesignFlag>();
  const humanRelevanceFlags = new Set<EvidenceHumanRelevanceFlag>();
  const limitationTags = new Set<EvidenceLimitationTag>();
  const reviewOrContext = isEvidenceReviewOrContext({ finding, source, study, haystack });
  const trialResultsStatus = study ? getTrialResultsStatus(study as StudyRecord) : undefined;
  const trialWatchStatus = study && trialResultsStatus ? getTrialWatchStatus(study as StudyRecord, trialResultsStatus) : undefined;
  const registryLinked = Boolean(
    (study?.registry_ids?.length ?? 0) > 0 ||
      (source?.registry_ids?.length ?? 0) > 0 ||
      source?.source_type === "trial_registry"
  );
  const noPostedResults = Boolean(
    source?.source_type === "trial_registry" ||
      trialResultsStatus === "not_posted" ||
      trialWatchStatus === "late_no_results" ||
      /\b(no posted results?|without posted results?|results not posted|late no-results)\b/.test(haystack)
  );
  const shortDuration = hasShortEvidenceDuration(finding, haystack);
  const smallSample = hasSmallSample(study, haystack);
  const observational = Boolean(
    study?.study_type === "observational" || /\b(observational|real-world|real world|retrospective|cohort)\b/.test(haystack)
  );
  const mechanisticOrInVitro = Boolean(
    study?.study_type === "in_vitro" ||
      finding.evidence_tier === "in_vitro" ||
      finding.endpoint_category === "mechanistic" ||
      /\b(in vitro|cell culture|mechanistic|assay)\b/.test(haystack)
  );
  const animalOrModel = Boolean(
    species === "animal" ||
      study?.study_type === "animal" ||
      Boolean(study?.model_system) ||
      /\b(mouse|mice|murine|rat|rats|worm|worms|drosophila|macaque|monkey|model system)\b/.test(haystack)
  );

  if (/\b(randomi[sz]ed|rct)\b/.test(haystack)) {
    studyDesignFlags.add("randomized");
  }

  if (/\b(controlled|placebo|control group|vehicle-controlled|active comparator)\b/.test(haystack)) {
    studyDesignFlags.add("controlled");
  }

  if (registryLinked) {
    studyDesignFlags.add("registry_linked");
  }

  if (trialResultsStatus === "posted" || /\b(results posted|published results|journal_article)\b/.test(haystack)) {
    studyDesignFlags.add("result_posted");
  }

  if (noPostedResults) {
    studyDesignFlags.add("no_results_registry");
    limitationTags.add("no_posted_results");
  }

  if (reviewOrContext) {
    studyDesignFlags.add("review_or_meta_analysis");
    limitationTags.add("review_not_primary_evidence");
  }

  if (animalOrModel || species === "nonhuman") {
    studyDesignFlags.add("preclinical");
  }

  if (isHumanEvidenceTier(finding.evidence_tier) && study?.study_type === "interventional") {
    studyDesignFlags.add("human_interventional");
  }

  if (observational) {
    studyDesignFlags.add("observational_or_real_world");
    limitationTags.add("confounded_or_observational");
  }

  if (animalOrModel) {
    studyDesignFlags.add("animal_or_model");
  }

  if (mechanisticOrInVitro) {
    studyDesignFlags.add("mechanistic_or_in_vitro");
  }

  if (/\b(older adult|older adults|elderly|aged human|aged adults|frail older|middle-aged|middle aged)\b/.test(haystack)) {
    humanRelevanceFlags.add("older_adults");
  }

  if (/\b(healthy adult|healthy adults|healthy volunteer|healthy participants|community-dwelling)\b/.test(haystack)) {
    humanRelevanceFlags.add("healthy_adults");
  }

  if (
    /\b(patient|patients|disease|cancer|diabetes|alzheimer|parkinson|als|heart failure|sarcopenia|frailty|dialysis|stroke|npc|attr)\b/.test(
      haystack
    )
  ) {
    humanRelevanceFlags.add("disease_cohort");
  }

  if (finding.evidence_tier === "human_biomarker" || finding.endpoint_category === "biomarker") {
    humanRelevanceFlags.add("human_biomarker");
    limitationTags.add("surrogate_or_biomarker_endpoint");
  }

  if (
    finding.endpoint_category === "functional" ||
    /\b(function|functional|frailty|walk|walking|strength|grip|physical performance|cognitive|memory)\b/.test(haystack)
  ) {
    humanRelevanceFlags.add("functional_endpoint");
  }

  if (
    ["healthspan", "lifespan"].includes(finding.endpoint_category) ||
    ["human_clinical_outcome", "mortality_or_lifespan"].includes(finding.evidence_tier) ||
    /\b(clinical|healthspan|mortality|lifespan|survival|hospital|disease outcome)\b/.test(haystack)
  ) {
    humanRelevanceFlags.add("clinical_or_healthspan_endpoint");
  }

  if (finding.endpoint_category === "safety" || /\b(safety|adverse|toxicity|tolerability|side effect)\b/.test(haystack)) {
    humanRelevanceFlags.add("safety_endpoint");
  }

  if (species === "animal") {
    humanRelevanceFlags.add("animal_only");
    limitationTags.add("animal_only");
  } else if (species === "nonhuman") {
    humanRelevanceFlags.add("nonhuman_model");
  }

  if (finding.confidence === "low") {
    limitationTags.add("low_confidence");
  }

  if (shortDuration) {
    limitationTags.add("short_duration");
  }

  if (smallSample) {
    limitationTags.add("small_sample");
  }

  if (/\b(underpowered|exploratory|pilot|hypothesis-generating|hypothesis generating)\b/.test(haystack)) {
    limitationTags.add("underpowered_or_exploratory");
  }

  if (["mixed", "null", "negative", "inconclusive"].includes(finding.direction)) {
    limitationTags.add("mixed_or_null_direction");
  }

  if (/\b(safety unresolved|safety remains|toxicity|tolerability|adverse event|adverse events|risk unresolved)\b/.test(haystack)) {
    limitationTags.add("safety_unresolved");
  }

  if (/\b(industry|sponsor|company|conflict|shareholder|employee|employees|commercial)\b/.test(haystack)) {
    limitationTags.add("industry_or_conflict_caveat");
  }

  const orderedStudyDesignFlags = getOrderedEvidenceValues(studyDesignFlags, evidenceStudyDesignFlags);
  const orderedHumanRelevanceFlags = getOrderedEvidenceValues(humanRelevanceFlags, evidenceHumanRelevanceFlags);
  const orderedLimitationTags = getOrderedEvidenceValues(limitationTags, evidenceLimitationTags);
  const qualityClass = getEvidenceQualityClass({
    finding,
    studyDesignFlags: orderedStudyDesignFlags,
    humanRelevanceFlags: orderedHumanRelevanceFlags,
    limitationTags: orderedLimitationTags,
    haystack
  });

  return {
    quality_class: qualityClass,
    quality_class_label: evidenceQualityClassLabels[qualityClass],
    quality_class_meaning: evidenceQualityClassPlainMeanings[qualityClass],
    quality_class_reason: getEvidenceQualityReason({
      qualityClass,
      studyDesignFlags: orderedStudyDesignFlags,
      humanRelevanceFlags: orderedHumanRelevanceFlags,
      limitationTags: orderedLimitationTags
    }),
    evidence_strength_score: getFindingStrength(finding),
    study_design_flags: orderedStudyDesignFlags,
    study_design_flag_labels: orderedStudyDesignFlags.map((flag) => evidenceStudyDesignFlagLabels[flag]),
    human_relevance_flags: orderedHumanRelevanceFlags,
    human_relevance_flag_labels: orderedHumanRelevanceFlags.map((flag) => evidenceHumanRelevanceFlagLabels[flag]),
    limitation_tags: orderedLimitationTags,
    limitation_labels: orderedLimitationTags.map((tag) => evidenceLimitationTagLabels[tag]),
    source_quality: source
      ? {
          source_id: source.id,
          source_type: source.source_type,
          source_type_label: getReadableDataLabel(source.source_type),
          year: source.year,
          published_on: source.published_on,
          registry_ids: source.registry_ids ?? [],
          doi: source.doi,
          pmid: source.pmid
        }
      : null,
    study_quality: study
      ? {
          study_id: study.id,
          study_type: study.study_type,
          study_type_label: getReadableDataLabel(study.study_type),
          status: study.status,
          status_label: getReadableDataLabel(study.status),
          phase: study.phase,
          phase_label: study.phase ? getReadableDataLabel(study.phase) : undefined,
          population: study.population,
          model_system: study.model_system,
          sample_size: study.sample_size,
          registry_ids: study.registry_ids ?? [],
          results_status: trialResultsStatus,
          results_status_label: trialResultsStatus ? trialResultsStatusLabels[trialResultsStatus] : undefined,
          watch_status: trialWatchStatus,
          watch_status_label: trialWatchStatus ? trialWatchStatusLabels[trialWatchStatus] : undefined
        }
      : null
  };
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
    quality_class: filters.quality_class ?? "",
    limitation: filters.limitation ?? "",
    human_relevance: filters.human_relevance ?? "",
    consistency_pattern: filters.consistency_pattern ?? "",
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
  quality?: {
    quality_class: string;
    quality_class_label: string;
    study_design_flags: string[];
    study_design_flag_labels: string[];
    human_relevance_flags: string[];
    human_relevance_flag_labels: string[];
    limitation_tags: string[];
    limitation_labels: string[];
  };
  consistency_contexts?: Array<{
    consistency_class: string;
    consistency_class_label: string;
    patterns: string[];
    pattern_labels: string[];
  }>;
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
    row.quality?.quality_class,
    row.quality?.quality_class_label,
    ...(row.quality?.study_design_flags ?? []),
    ...(row.quality?.study_design_flag_labels ?? []),
    ...(row.quality?.human_relevance_flags ?? []),
    ...(row.quality?.human_relevance_flag_labels ?? []),
    ...(row.quality?.limitation_tags ?? []),
    ...(row.quality?.limitation_labels ?? []),
    ...(row.consistency_contexts ?? []).flatMap((context) => [
      context.consistency_class,
      context.consistency_class_label,
      ...context.patterns,
      ...context.pattern_labels
    ]),
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
    quality: {
      quality_class: EvidenceQualityClass;
      limitation_tags: EvidenceLimitationTag[];
      human_relevance_flags: EvidenceHumanRelevanceFlag[];
    };
    consistency_contexts?: Array<{
      patterns: EvidenceConsistencyPattern[];
    }>;
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
      (!selected.quality_class || row.quality.quality_class === selected.quality_class) &&
      (!selected.limitation || row.quality.limitation_tags.includes(selected.limitation)) &&
      (!selected.human_relevance || row.quality.human_relevance_flags.includes(selected.human_relevance)) &&
      (!selected.consistency_pattern ||
        (row.consistency_contexts ?? []).some((context) =>
          context.patterns.includes(selected.consistency_pattern as EvidenceConsistencyPattern)
        )) &&
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

function getEvidenceQualityClassCounts(rows: Array<{ quality: { quality_class: EvidenceQualityClass } }>) {
  return Object.fromEntries(
    evidenceQualityClasses.map((qualityClass) => [
      qualityClass,
      rows.filter((row) => row.quality.quality_class === qualityClass).length
    ])
  ) as Record<EvidenceQualityClass, number>;
}

function getEvidenceQualityTagCountRows<T extends string, R extends { quality: unknown }>({
  rows,
  order,
  labels,
  getValues
}: {
  rows: R[];
  order: T[];
  labels: Record<T, string>;
  getValues: (row: R) => T[];
}) {
  return order
    .map((value) => ({
      value,
      label: labels[value],
      count: rows.filter((row) => getValues(row).includes(value)).length
    }))
    .filter((item) => item.count > 0);
}

type EvidenceConsistencyIndexRow = {
  id: string;
  name: string;
  href: string;
  source_id: string;
  study_id?: string;
  track_ids: string[];
  direction: string;
  direction_label: string;
  evidence_tier: string;
  evidence_tier_label: string;
  endpoint_category: string;
  endpoint_category_label: string;
  confidence: Confidence;
  species: string;
  source_type?: string;
  quality: {
    quality_class: EvidenceQualityClass;
    limitation_tags: EvidenceLimitationTag[];
    study_design_flags: EvidenceStudyDesignFlag[];
    human_relevance_flags: EvidenceHumanRelevanceFlag[];
  };
  source: {
    id: string;
    name: string;
    short_name?: string;
    source_type: string;
    href?: string;
  } | null;
  study: {
    id: string;
    name: string;
  } | null;
};

function getEvidenceConsistencyFindingRef(row: EvidenceConsistencyIndexRow) {
  return {
    id: row.id,
    name: row.name,
    href: row.href,
    direction: row.direction,
    direction_label: row.direction_label,
    evidence_tier: row.evidence_tier,
    evidence_tier_label: row.evidence_tier_label,
    endpoint_category: row.endpoint_category,
    endpoint_category_label: row.endpoint_category_label,
    source_id: row.source_id,
    source_name: row.source?.short_name ?? row.source?.name,
    study_id: row.study_id,
    study_name: row.study?.name
  };
}

function getEvidenceDirectionCountRows(rows: EvidenceConsistencyIndexRow[]) {
  const directionOrder = ["positive", "mixed", "inconclusive", "null", "negative", "not_applicable"];

  return directionOrder
    .map((value) => ({
      value,
      label: getReadableDataLabel(value),
      count: rows.filter((row) => row.direction === value).length
    }))
    .filter((item) => item.count > 0);
}

function getEvidenceTierCountRows(rows: EvidenceConsistencyIndexRow[]) {
  return uniqueSorted(rows.map((row) => row.evidence_tier)).map((value) => ({
    value,
    label: getReadableDataLabel(value),
    count: rows.filter((row) => row.evidence_tier === value).length
  }));
}

function hasFunctionOrClinicalEndpoint(row: EvidenceConsistencyIndexRow) {
  return (
    ["functional", "healthspan", "lifespan", "safety"].includes(row.endpoint_category) ||
    ["human_function", "human_clinical_outcome", "mortality_or_lifespan"].includes(row.evidence_tier)
  );
}

function getEvidenceConsistencyPatternRows(patterns: EvidenceConsistencyPattern[]) {
  return patterns.map((pattern) => ({
    value: pattern,
    label: evidenceConsistencyPatternLabels[pattern]
  }));
}

function getEvidenceConsistencyClassCounts(rows: Array<{ consistency_class: EvidenceConsistencyClass }>) {
  return Object.fromEntries(
    evidenceConsistencyClasses.map((consistencyClass) => [
      consistencyClass,
      rows.filter((row) => row.consistency_class === consistencyClass).length
    ])
  ) as Record<EvidenceConsistencyClass, number>;
}

function getEvidenceConsistencyPatternCounts(rows: Array<{ patterns: EvidenceConsistencyPattern[] }>) {
  return evidenceConsistencyPatterns
    .map((pattern) => ({
      value: pattern,
      label: evidenceConsistencyPatternLabels[pattern],
      count: rows.filter((row) => row.patterns.includes(pattern)).length
    }))
    .filter((item) => item.count > 0);
}

function getEvidenceConsistencyClass({
  findingCount,
  positiveRows,
  limitingRows,
  patterns
}: {
  findingCount: number;
  positiveRows: EvidenceConsistencyIndexRow[];
  limitingRows: EvidenceConsistencyIndexRow[];
  patterns: EvidenceConsistencyPattern[];
}): EvidenceConsistencyClass {
  if (findingCount < 2) {
    return "insufficient_mapped_evidence";
  }

  if (patterns.includes("registry_no_results_with_positive_claims")) {
    return "registry_results_gap";
  }

  if (patterns.includes("biomarker_positive_function_mixed_or_null")) {
    return "biomarker_positive_function_mixed";
  }

  if (
    patterns.includes("animal_positive_human_null_or_mixed") ||
    patterns.includes("preclinical_positive_no_human")
  ) {
    return "animal_positive_human_limited";
  }

  if (patterns.includes("positive_and_null_or_negative") || patterns.includes("mixed_direction_findings")) {
    return "mixed_or_conflicting_signal";
  }

  if (patterns.includes("single_source_positive_signal")) {
    return "single_source_or_unreplicated";
  }

  if (positiveRows.length > 0 && limitingRows.length <= Math.max(1, Math.floor(positiveRows.length / 3))) {
    return "consistent_positive_signal";
  }

  return limitingRows.length > 0 ? "mixed_or_conflicting_signal" : "insufficient_mapped_evidence";
}

function getEvidenceConsistencyReason({
  consistencyClass,
  positiveRows,
  limitingRows,
  sourceCount,
  studyCount,
  patternLabels
}: {
  consistencyClass: EvidenceConsistencyClass;
  positiveRows: EvidenceConsistencyIndexRow[];
  limitingRows: EvidenceConsistencyIndexRow[];
  sourceCount: number;
  studyCount: number;
  patternLabels: string[];
}) {
  const parts = [
    `${positiveRows.length} positive and ${limitingRows.length} limiting/mixed finding(s)`,
    `${sourceCount} source(s)`,
    `${studyCount} study link(s)`
  ];

  if (patternLabels.length) {
    parts.push(`patterns: ${patternLabels.slice(0, 3).join(", ")}`);
  }

  return `${evidenceConsistencyClassLabels[consistencyClass]}. ${parts.join("; ")}.`;
}

function getEvidenceConsistencyTrackRows({
  evidenceMap,
  rows
}: {
  evidenceMap: Awaited<ReturnType<typeof getEvidenceMapExport>>;
  rows: EvidenceConsistencyIndexRow[];
}) {
  return evidenceMap.tracks.map((track) => {
    const trackRows = rows.filter((row) => row.track_ids.includes(track.id));
    const positiveRows = trackRows.filter((row) => row.direction === "positive");
    const nullOrNegativeRows = trackRows.filter((row) => row.direction === "null" || row.direction === "negative");
    const mixedRows = trackRows.filter((row) => row.direction === "mixed" || row.direction === "inconclusive");
    const limitingRows = [...nullOrNegativeRows, ...mixedRows];
    const humanRows = trackRows.filter((row) => row.species === "human");
    const humanPositiveRows = positiveRows.filter((row) => row.species === "human");
    const humanLimitingRows = limitingRows.filter((row) => row.species === "human");
    const animalPositiveRows = positiveRows.filter((row) => row.species === "animal");
    const biomarkerPositiveRows = positiveRows.filter(
      (row) => row.evidence_tier === "human_biomarker" || row.endpoint_category === "biomarker"
    );
    const functionOrClinicalRows = trackRows.filter(hasFunctionOrClinicalEndpoint);
    const functionOrClinicalLimitingRows = limitingRows.filter(hasFunctionOrClinicalEndpoint);
    const registryNoResultsRows = trackRows.filter((row) => row.quality.limitation_tags.includes("no_posted_results"));
    const reviewContextRows = trackRows.filter(
      (row) =>
        row.quality.study_design_flags.includes("review_or_meta_analysis") ||
        row.evidence_tier === "review_or_meta_analysis" ||
        row.evidence_tier === "regulatory_or_program_update"
    );
    const primaryResultRows = trackRows.filter(
      (row) =>
        !row.quality.study_design_flags.includes("review_or_meta_analysis") &&
        row.evidence_tier !== "review_or_meta_analysis" &&
        row.evidence_tier !== "regulatory_or_program_update"
    );
    const sourceIds = uniqueSorted(trackRows.map((row) => row.source_id));
    const studyIds = uniqueSorted(trackRows.map((row) => row.study_id));
    const positiveSourceIds = uniqueSorted(positiveRows.map((row) => row.source_id));
    const positiveStudyIds = uniqueSorted(positiveRows.map((row) => row.study_id));
    const humanPositiveSourceIds = uniqueSorted(humanPositiveRows.map((row) => row.source_id));
    const humanPositiveStudyIds = uniqueSorted(humanPositiveRows.map((row) => row.study_id));
    const patternSet = new Set<EvidenceConsistencyPattern>();

    if (positiveRows.length > 0 && nullOrNegativeRows.length > 0) {
      patternSet.add("positive_and_null_or_negative");
    }

    if (mixedRows.length > 0) {
      patternSet.add("mixed_direction_findings");
    }

    if (animalPositiveRows.length > 0 && (humanLimitingRows.length > 0 || humanPositiveRows.length === 0)) {
      patternSet.add("animal_positive_human_null_or_mixed");
    }

    if (
      biomarkerPositiveRows.length > 0 &&
      (functionOrClinicalLimitingRows.length > 0 || functionOrClinicalRows.length === 0)
    ) {
      patternSet.add("biomarker_positive_function_mixed_or_null");
    }

    if (positiveRows.length > 0 && positiveSourceIds.length <= 1) {
      patternSet.add("single_source_positive_signal");
    }

    if (registryNoResultsRows.length > 0 && positiveRows.length > 0) {
      patternSet.add("registry_no_results_with_positive_claims");
    }

    if (animalPositiveRows.length > 0 && humanRows.length === 0) {
      patternSet.add("preclinical_positive_no_human");
    }

    if (reviewContextRows.length > 0 && primaryResultRows.length === 0) {
      patternSet.add("review_context_without_primary");
    }

    if (humanPositiveRows.length >= 2 && humanPositiveSourceIds.length >= 2 && humanPositiveStudyIds.length >= 2) {
      patternSet.add("replicated_human_positive_signal");
    }

    const patterns = getOrderedEvidenceValues(patternSet, evidenceConsistencyPatterns);
    const patternLabels = patterns.map((pattern) => evidenceConsistencyPatternLabels[pattern]);
    const consistencyClass = getEvidenceConsistencyClass({
      findingCount: trackRows.length,
      positiveRows,
      limitingRows,
      patterns
    });

    return {
      id: track.id,
      name: track.name,
      href: track.href,
      primary_hallmark_id: track.primary_hallmark_id,
      primary_hallmark_name: track.primary_hallmark_name,
      stage: track.outlook?.stage,
      stage_label: track.outlook?.stage_label,
      read_firmness: track.outlook?.confidence,
      read_firmness_label: track.outlook?.read_firmness_label,
      coverage_verdict: track.coverage?.coverage_verdict,
      coverage_verdict_label: track.coverage?.coverage_verdict_label,
      coverage_confidence: track.coverage?.coverage_confidence,
      coverage_confidence_label: track.coverage?.coverage_confidence_label,
      consistency_class: consistencyClass,
      consistency_class_label: evidenceConsistencyClassLabels[consistencyClass],
      consistency_class_meaning: evidenceConsistencyClassPlainMeanings[consistencyClass],
      consistency_reason: getEvidenceConsistencyReason({
        consistencyClass,
        positiveRows,
        limitingRows,
        sourceCount: sourceIds.length,
        studyCount: studyIds.length,
        patternLabels
      }),
      patterns,
      pattern_labels: patternLabels,
      direction_counts: getEvidenceDirectionCountRows(trackRows),
      evidence_tier_counts: getEvidenceTierCountRows(trackRows),
      counts: {
        finding_count: trackRows.length,
        source_count: sourceIds.length,
        study_count: studyIds.length,
        positive_finding_count: positiveRows.length,
        limiting_or_mixed_finding_count: limitingRows.length,
        human_positive_finding_count: humanPositiveRows.length,
        human_limiting_or_mixed_finding_count: humanLimitingRows.length,
        animal_positive_finding_count: animalPositiveRows.length,
        biomarker_positive_finding_count: biomarkerPositiveRows.length,
        function_or_clinical_limiting_count: functionOrClinicalLimitingRows.length,
        registry_no_results_count: registryNoResultsRows.length,
        positive_source_count: positiveSourceIds.length,
        positive_study_count: positiveStudyIds.length
      },
      finding_clusters: {
        positive: positiveRows.map(getEvidenceConsistencyFindingRef),
        limiting_or_mixed: limitingRows.map(getEvidenceConsistencyFindingRef),
        animal_positive: animalPositiveRows.map(getEvidenceConsistencyFindingRef),
        human_limiting_or_mixed: humanLimitingRows.map(getEvidenceConsistencyFindingRef),
        biomarker_positive: biomarkerPositiveRows.map(getEvidenceConsistencyFindingRef),
        function_or_clinical_limiting: functionOrClinicalLimitingRows.map(getEvidenceConsistencyFindingRef),
        registry_no_results: registryNoResultsRows.map(getEvidenceConsistencyFindingRef)
      },
      paths: {
        track_page_path: track.href,
        evidence_page_path: `/evidence?track=${encodeURIComponent(track.id)}`,
        evidence_conflicts_path: `/data/evidence-conflicts.json?track=${encodeURIComponent(track.id)}`,
        evidence_quality_path: `/data/evidence-quality.json?track=${encodeURIComponent(track.id)}`,
        evidence_index_path: `/data/evidence-index.json?track=${encodeURIComponent(track.id)}`
      }
    };
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

function cleanCoverageAuditFilters(filters: CoverageAuditFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(200, filters.limit)) : undefined;

  return {
    track: filters.track ?? "",
    method_class: filters.method_class ?? "",
    limit
  };
}

function getCoverageAuditQueryPath(path: string, filters: CoverageAuditFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanCoverageAuditFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getAppliedCoverageAuditFilters(filters: ReturnType<typeof cleanCoverageAuditFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, String(value)])
  );
}

function hasUsableCoverageAuditMap(track: {
  coverage: {
    coverage_verdict?: CoverageVerdict;
    coverage_confidence?: CoverageConfidence;
  } | null;
}) {
  return (
    Boolean(track.coverage) &&
    (track.coverage?.coverage_verdict === "adequate" || track.coverage?.coverage_verdict === "strong") &&
    track.coverage?.coverage_confidence !== "low"
  );
}

function getReviewedArtifactPaths(reviewedArtifacts?: CoverageAssessmentFile["reviewed_artifacts"]) {
  return {
    research_sessions: (reviewedArtifacts?.research_session_ids ?? []).map((id) => `research/sessions/${id}.json`),
    candidate_bundles: (reviewedArtifacts?.candidate_bundle_ids ?? []).map((id) => `data/candidate-bundles/${id}.json`),
    evidence_reviews: (reviewedArtifacts?.evidence_review_ids ?? []).map((id) => `data/evidence-reviews/${id}.json`),
    publication_events: (reviewedArtifacts?.publication_event_ids ?? []).map(
      (id) => `data/publication-events/${id}.json`
    ),
    outlooks: (reviewedArtifacts?.outlook_ids ?? []).map((id) => getOutlookRecordPath(id) ?? "")
  };
}

function getCoverageAuditMethodClass({
  track,
  status,
  assessment
}: {
  track: Awaited<ReturnType<typeof getEvidenceMapExport>>["tracks"][number];
  status?: CoverageStatusTrack;
  assessment?: CoverageAssessmentFile;
}): CoverageMethodClass {
  const registryCategory = assessment?.evidence_categories.find((item) => item.category === "active_trials_registries");
  const hasRegistryGap = assessment?.known_gaps.some(
    (gap) => gap.category === "active_trials_registries" && gap.priority !== "low"
  );

  if (!hasUsableCoverageAuditMap(track)) {
    return "needs_source_discovery";
  }

  if (
    status?.surveillance_freshness_status === "due" ||
    status?.surveillance_freshness_status === "never_checked"
  ) {
    return "recent_activity_review_due";
  }

  if (
    track.evidence_counts.active_watch_trial_count > 0 ||
    hasRegistryGap ||
    registryCategory?.coverage_level === "thin" ||
    registryCategory?.coverage_level === "not_checked"
  ) {
    return "needs_registry_check";
  }

  if (isSparseOrEmergingGapDensity(track.coverage?.observed_research_density)) {
    return "likely_field_scarcity";
  }

  return "active_mapped";
}

function getCoverageAuditMethodReason({
  methodClass,
  track,
  status
}: {
  methodClass: CoverageMethodClass;
  track: Awaited<ReturnType<typeof getEvidenceMapExport>>["tracks"][number];
  status?: CoverageStatusTrack;
}) {
  if (methodClass === "needs_source_discovery") {
    return "The tracker should not treat low source counts as field scarcity until coverage confidence improves.";
  }

  if (methodClass === "recent_activity_review_due") {
    return status?.surveillance_due_at
      ? `Surveillance is due as of ${status.surveillance_due_at}; refresh recent activity before relying on the current coverage read.`
      : "Surveillance freshness is not recent enough to treat the current coverage read as fully current.";
  }

  if (methodClass === "needs_registry_check") {
    return track.evidence_counts.active_watch_trial_count > 0
      ? `${track.evidence_counts.active_watch_trial_count} active-watch trial record(s) could change the map if status, results, or linked publications move.`
      : "Registry or no-results watch items remain important enough that status, results, or linked publications could change the map.";
  }

  if (methodClass === "likely_field_scarcity") {
    return "Coverage is usable and observed density is sparse or emerging, so low counts are more likely about the field than missing map work.";
  }

  return "Coverage is usable and observed density is active or dense, so interpretation and limitations matter more than basic source discovery.";
}

function getCoverageAuditTrackRows({
  evidenceMap,
  coverageStatus,
  coverageAssessments
}: {
  evidenceMap: Awaited<ReturnType<typeof getEvidenceMapExport>>;
  coverageStatus?: CoverageStatusFile;
  coverageAssessments: CoverageAssessmentFile[];
}) {
  const statusByTrackId = new Map((coverageStatus?.tracks ?? []).map((entry) => [entry.track_id, entry]));
  const latestAssessmentByTrackId = new Map<string, CoverageAssessmentFile>();
  const sourceById = new Map(evidenceMap.sources.map((source) => [source.id, source]));
  const findingById = new Map(evidenceMap.findings.map((finding) => [finding.id, finding]));

  for (const assessment of [...coverageAssessments].sort((left, right) =>
    compareDateTimesDescending(left.assessed_at, right.assessed_at)
  )) {
    if (!latestAssessmentByTrackId.has(assessment.track_id)) {
      latestAssessmentByTrackId.set(assessment.track_id, assessment);
    }
  }

  return evidenceMap.tracks.map((track) => {
    const status = statusByTrackId.get(track.id);
    const assessment = latestAssessmentByTrackId.get(track.id);
    const methodClass = getCoverageAuditMethodClass({ track, status, assessment });
    const coveredSourceIds = uniqueSorted([
      ...(assessment?.covered_source_ids ?? []),
      ...(assessment?.evidence_categories.flatMap((item) => item.source_ids ?? []) ?? [])
    ]);
    const coveredFindingIds = uniqueSorted([
      ...(assessment?.covered_finding_ids ?? []),
      ...(assessment?.evidence_categories.flatMap((item) => item.finding_ids ?? []) ?? [])
    ]);

    return {
      id: track.id,
      name: track.name,
      href: track.href,
      primary_hallmark_id: track.primary_hallmark_id,
      primary_hallmark_name: track.primary_hallmark_name,
      secondary_hallmark_ids: track.secondary_hallmark_ids,
      stage: track.outlook?.stage,
      stage_label: track.outlook?.stage_label,
      read_firmness: track.outlook?.confidence,
      read_firmness_label: track.outlook?.read_firmness_label,
      coverage_verdict: track.coverage?.coverage_verdict,
      coverage_verdict_label: track.coverage?.coverage_verdict_label,
      coverage_confidence: track.coverage?.coverage_confidence,
      coverage_confidence_label: track.coverage?.coverage_confidence_label,
      observed_research_density: track.coverage?.observed_research_density,
      observed_research_density_label: track.coverage?.observed_research_density_label,
      known_gap_count: track.coverage?.known_gap_count ?? 0,
      high_priority_gap_count: track.coverage?.high_priority_gap_count ?? 0,
      evidence_counts: track.evidence_counts,
      method_class: methodClass,
      method_class_label: getCoverageMethodClassLabel(methodClass),
      method_class_meaning: getCoverageMethodClassPlainMeaning(methodClass),
      method_class_reason: getCoverageAuditMethodReason({ methodClass, track, status }),
      status: {
        coverage_status: status?.coverage_status,
        queue_state: status?.queue_state,
        next_mode: status?.next_mode,
        last_session_id: status?.last_session_id,
        last_session_at: status?.last_session_at,
        last_session_mode: status?.last_session_mode,
        last_session_outcome: status?.last_session_outcome,
        last_surveillance_session_id: status?.last_surveillance_session_id,
        last_surveillance_at: status?.last_surveillance_at,
        last_surveillance_mode: status?.last_surveillance_mode,
        last_surveillance_outcome: status?.last_surveillance_outcome,
        surveillance_freshness_status: status?.surveillance_freshness_status,
        surveillance_due_at: status?.surveillance_due_at,
        surveillance_age_days: status?.surveillance_age_days,
        last_candidate_bundle_id: status?.last_candidate_bundle_id,
        last_candidate_bundle_status: status?.last_candidate_bundle_status,
        last_publication_event_id: status?.last_publication_event_id,
        last_published_at: status?.last_published_at,
        default_research_question: status?.default_research_question,
        notes: status?.notes
      },
      assessment: assessment
        ? {
            id: assessment.id,
            name: assessment.name,
            short_name: assessment.short_name,
            assessment_type: assessment.assessment_type,
            assessed_at: assessment.assessed_at,
            assessment_path: getCoverageAssessmentPath(assessment.id),
            assessment_window: assessment.assessment_window,
            coverage_verdict: assessment.coverage_verdict,
            coverage_confidence: assessment.coverage_confidence ?? track.coverage?.coverage_confidence,
            observed_research_density:
              assessment.observed_research_density ?? track.coverage?.observed_research_density,
            summary: assessment.summary,
            search_log_summary: assessment.search_log_summary,
            source_selection_notes: assessment.source_selection_notes ?? [],
            reviewed_artifacts: assessment.reviewed_artifacts ?? {},
            reviewed_artifact_paths: getReviewedArtifactPaths(assessment.reviewed_artifacts),
            evidence_categories: assessment.evidence_categories.map((category) => ({
              category: category.category,
              category_label: getReadableDataLabel(category.category),
              coverage_level: category.coverage_level,
              coverage_level_label: getReadableDataLabel(category.coverage_level),
              rationale: category.rationale,
              source_count: category.source_ids?.length ?? 0,
              finding_count: category.finding_ids?.length ?? 0,
              source_ids: category.source_ids ?? [],
              finding_ids: category.finding_ids ?? [],
              gap_note: category.gap_note
            })),
            covered_source_count: coveredSourceIds.length,
            covered_finding_count: coveredFindingIds.length,
            covered_source_ids: coveredSourceIds,
            covered_finding_ids: coveredFindingIds,
            covered_source_refs: getEvidenceGapSourceRefs(coveredSourceIds, sourceById),
            covered_finding_refs: getEvidenceGapFindingRefs(coveredFindingIds, findingById),
            known_gaps: assessment.known_gaps,
            high_priority_gap_count: assessment.known_gaps.filter((gap) => gap.priority === "high").length,
            next_coverage_action: assessment.next_coverage_action,
            next_recommended_mode: assessment.next_recommended_mode,
            tags: assessment.tags ?? []
          }
        : null,
      paths: {
        track_page_path: track.href,
        track_json_path: `/data/tracks/${encodeURIComponent(track.id)}.json`,
        coverage_audit_path: `/data/coverage-audit.json?track=${encodeURIComponent(track.id)}`,
        evidence_map_path: `/data/evidence-map.json?track=${encodeURIComponent(track.id)}`,
        coverage_status_path: "research/state/coverage-status.v1.json",
        coverage_assessment_path: getCoverageAssessmentPath(assessment?.id),
        last_session_path: status?.last_session_id ? `research/sessions/${status.last_session_id}.json` : undefined,
        last_surveillance_session_path: status?.last_surveillance_session_id
          ? `research/sessions/${status.last_surveillance_session_id}.json`
          : undefined,
        last_candidate_bundle_path: status?.last_candidate_bundle_id
          ? `data/candidate-bundles/${status.last_candidate_bundle_id}.json`
          : undefined,
        last_publication_event_path: status?.last_publication_event_id
          ? `data/publication-events/${status.last_publication_event_id}.json`
          : undefined
      }
    };
  });
}

function applyCoverageAuditFilters<
  T extends {
    id: string;
    method_class: CoverageMethodClass;
  }
>(rows: T[], filters: CoverageAuditFilters) {
  const selected = cleanCoverageAuditFilters(filters);

  return rows.filter(
    (row) =>
      (!selected.track || row.id === selected.track) &&
      (!selected.method_class || row.method_class === selected.method_class)
  );
}

export async function getCoverageAuditExport(filters: CoverageAuditFilters = {}) {
  noStore();
  const selected = cleanCoverageAuditFilters(filters);
  const [evidenceMap, coverageStatus, coverageAssessments] = await Promise.all([
    getEvidenceMapExport(),
    loadCoverageStatus(),
    loadCoverageAssessments()
  ]);
  const allRows = getCoverageAuditTrackRows({ evidenceMap, coverageStatus, coverageAssessments }).sort(
    (left, right) =>
      left.method_class.localeCompare(right.method_class) ||
      right.high_priority_gap_count - left.high_priority_gap_count ||
      left.name.localeCompare(right.name)
  );
  const filteredRows = applyCoverageAuditFilters(allRows, selected);
  const exportedRows = selected.limit ? filteredRows.slice(0, selected.limit) : filteredRows;
  const methodClassCounts = Object.fromEntries(
    (Object.keys(coverageMethodClassLabels) as CoverageMethodClass[]).map((methodClass) => [
      methodClass,
      exportedRows.filter((row) => row.method_class === methodClass).length
    ])
  ) as Record<CoverageMethodClass, number>;

  return {
    schema_version: "1.0.0",
    schema_url: "/data/coverage-audit.schema.json",
    export_type: "lev_tracker_coverage_audit",
    generated_at: new Date().toISOString(),
    last_public_update: evidenceMap.last_public_update,
    canonical_path: getCoverageAuditQueryPath("/data/coverage-audit.json", selected),
    page_path: "/coverage",
    applied_filters: getAppliedCoverageAuditFilters(selected),
    caveats: [
      "Coverage audit records describe tracker map methods and reviewed artifacts; they are not claims that an intervention works.",
      "A sparse or emerging field label is only meaningful when the coverage map is usable.",
      "Recent activity and registry-watch labels can change without changing the current evidence-stage rating."
    ],
    summary: {
      total_track_count: allRows.length,
      filtered_track_count: filteredRows.length,
      returned_track_count: exportedRows.length,
      coverage_assessed_track_count: exportedRows.filter((row) => row.assessment).length,
      coverage_status_updated_at: coverageStatus?.updated_at,
      source_provenance_track_count: exportedRows.filter((row) => (row.assessment?.covered_source_count ?? 0) > 0)
        .length,
      finding_provenance_track_count: exportedRows.filter((row) => (row.assessment?.covered_finding_count ?? 0) > 0)
        .length,
      due_or_never_surveillance_track_count: exportedRows.filter((row) =>
        ["due", "never_checked"].includes(row.status.surveillance_freshness_status ?? "")
      ).length,
      active_watch_trial_track_count: exportedRows.filter(
        (row) => row.evidence_counts.active_watch_trial_count > 0
      ).length,
      high_priority_gap_count: exportedRows.reduce((sum, row) => sum + row.high_priority_gap_count, 0),
      method_class_counts: methodClassCounts
    },
    method_class_legend: (Object.keys(coverageMethodClassLabels) as CoverageMethodClass[]).map((methodClass) => ({
      value: methodClass,
      label: getCoverageMethodClassLabel(methodClass),
      plain_meaning: getCoverageMethodClassPlainMeaning(methodClass)
    })),
    facet_options: {
      method_classes: (Object.keys(coverageMethodClassLabels) as CoverageMethodClass[]).map((methodClass) => ({
        value: methodClass,
        label: getCoverageMethodClassLabel(methodClass)
      })),
      tracks: evidenceMap.tracks.map((track) => ({ value: track.id, label: track.name }))
    },
    source_file_patterns: {
      coverage_status: ["research/state/coverage-status.v1.json"],
      coverage_assessments: ["research/coverage-assessments/*.json"],
      linked_public_records: [
        "data/outlooks/*.json",
        "data/findings/*.json",
        "data/sources/*.json",
        "data/candidate-bundles/*.json",
        "data/publication-events/*.json",
        "data/evidence-reviews/*.json"
      ]
    },
    tracks: exportedRows
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

  const baseRows = evidenceMap.findings.map((finding) => {
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
    const quality = buildEvidenceQualityProfile({ finding, source, study });
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
      hallmarks,
      quality
    };

    return row;
  });
  const consistencyRows = getEvidenceConsistencyTrackRows({ evidenceMap, rows: baseRows });
  const consistencyByTrackId = new Map(consistencyRows.map((track) => [track.id, track]));
  const allRows = baseRows.map((row) => {
    const rowStudy = row.study_id ? studyById.get(row.study_id) : undefined;
    const consistencyContexts = row.track_ids
      .map((trackId) => consistencyByTrackId.get(trackId))
      .filter((track): track is NonNullable<typeof track> => Boolean(track))
      .map((track) => ({
        track_id: track.id,
        track_name: track.name,
        href: track.href,
        consistency_class: track.consistency_class,
        consistency_class_label: track.consistency_class_label,
        consistency_class_meaning: track.consistency_class_meaning,
        consistency_reason: track.consistency_reason,
        patterns: track.patterns,
        pattern_labels: track.pattern_labels
      }));

    return {
      ...row,
      consistency_contexts: consistencyContexts,
      searchable_text: getEvidenceIndexSearchText({
        ...row,
        consistency_contexts: consistencyContexts,
        source: row.source
          ? {
              id: row.source.id,
              name: row.source.name,
              short_name: row.source.short_name,
              source_type: row.source.source_type,
              venue: row.source.venue,
              year: row.source.year
            }
          : undefined,
        study: rowStudy
          ? {
              id: rowStudy.id,
              name: rowStudy.name,
              summary: rowStudy.summary,
              population: rowStudy.population,
              model_system: rowStudy.model_system
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
      id: "human-signals-with-limits",
      label: "Human signals with limits",
      summary: "Human biomarker or limited-function signals where design or endpoint limitations should stay visible.",
      kind: "evidence",
      filters: { quality_class: "human_biomarker_or_limited_function" }
    },
    {
      id: "no-results-registry-evidence",
      label: "No-results registry evidence",
      summary: "Registry-linked findings where absent or pending results are central to interpretation.",
      kind: "evidence",
      filters: { quality_class: "registry_or_no_results" }
    },
    {
      id: "animal-positive-human-limited",
      label: "Animal positive, human limited",
      summary: "Findings in tracks where animal-positive signals outpace direct or consistent human evidence.",
      kind: "evidence",
      filters: { consistency_pattern: "animal_positive_human_null_or_mixed" }
    },
    {
      id: "biomarker-positive-function-mixed",
      label: "Biomarker positive, function mixed",
      summary: "Findings in tracks where biomarker-positive signals do not yet align cleanly with functional outcomes.",
      kind: "evidence",
      filters: { consistency_pattern: "biomarker_positive_function_mixed_or_null" }
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
      quality_class_counts: getEvidenceQualityClassCounts(exportedRows),
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
      quality_classes: evidenceQualityClasses.map((qualityClass) => ({
        value: qualityClass,
        label: evidenceQualityClassLabels[qualityClass]
      })),
      limitations: evidenceLimitationTags.map((limitation) => ({
        value: limitation,
        label: evidenceLimitationTagLabels[limitation]
      })),
      human_relevance: evidenceHumanRelevanceFlags.map((flag) => ({
        value: flag,
        label: evidenceHumanRelevanceFlagLabels[flag]
      })),
      consistency_patterns: evidenceConsistencyPatterns.map((pattern) => ({
        value: pattern,
        label: evidenceConsistencyPatternLabels[pattern]
      })),
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

function cleanEvidenceQualityFilters(filters: EvidenceQualityFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(1000, filters.limit)) : undefined;

  return {
    track: filters.track ?? "",
    quality_class: filters.quality_class ?? "",
    limitation: filters.limitation ?? "",
    human_relevance: filters.human_relevance ?? "",
    source_type: filters.source_type ?? "",
    limit
  };
}

function getEvidenceQualityQueryPath(path: string, filters: EvidenceQualityFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanEvidenceQualityFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getAppliedEvidenceQualityFilters(filters: ReturnType<typeof cleanEvidenceQualityFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, String(value)])
  );
}

function getEvidenceQualityLegend() {
  return evidenceQualityClasses.map((qualityClass) => ({
    value: qualityClass,
    label: evidenceQualityClassLabels[qualityClass],
    plain_meaning: evidenceQualityClassPlainMeanings[qualityClass]
  }));
}

export async function getEvidenceQualityExport(filters: EvidenceQualityFilters = {}) {
  noStore();
  const selected = cleanEvidenceQualityFilters(filters);
  const baseIndex = await getEvidenceIndexExport({
    track: selected.track,
    source_type: selected.source_type,
    sort: "strength"
  });
  const qualityFilteredRows = baseIndex.findings.filter(
    (row) =>
      (!selected.quality_class || row.quality.quality_class === selected.quality_class) &&
      (!selected.limitation || row.quality.limitation_tags.includes(selected.limitation)) &&
      (!selected.human_relevance || row.quality.human_relevance_flags.includes(selected.human_relevance))
  );
  const exportedRows = selected.limit ? qualityFilteredRows.slice(0, selected.limit) : qualityFilteredRows;
  const sourceIds = new Set(exportedRows.map((row) => row.source_id));
  const studyIds = new Set(exportedRows.map((row) => row.study_id).filter((value): value is string => Boolean(value)));
  const trackIds = new Set(exportedRows.flatMap((row) => row.track_ids));

  return {
    schema_version: "1.0.0",
    schema_url: "/data/evidence-quality.schema.json",
    export_type: "lev_tracker_evidence_quality",
    generated_at: new Date().toISOString(),
    last_public_update: baseIndex.last_public_update,
    canonical_path: getEvidenceQualityQueryPath("/data/evidence-quality.json", selected),
    page_path: getEvidenceQualityQueryPath("/evidence", {
      track: selected.track,
      source_type: selected.source_type,
      quality_class: selected.quality_class,
      limitation: selected.limitation,
      human_relevance: selected.human_relevance
    }),
    applied_filters: getAppliedEvidenceQualityFilters(selected),
    methodology: {
      classification_basis:
        "Quality classes and limitation tags are derived from structured tracker metadata, source type, study type, registry status, endpoint category, direction, confidence, and explicit caveat text.",
      not_risk_of_bias:
        "This is not a formal Cochrane, GRADE, or trial-level risk-of-bias adjudication; use it as a triage and retrieval layer before reading source records.",
      primary_uses: [
        "Find findings whose interpretation depends on biomarker, sample-size, duration, registry, or review-context limits.",
        "Audit whether expert-facing summaries keep source and study limitations visible.",
        "Give language-model workflows compact labels that prevent treating all evidence tiers as equally strong."
      ]
    },
    caveats: [
      "Quality labels are heuristic tracker metadata, not independent peer review or clinical guidance.",
      "A stronger human signal label does not mean an intervention extends human lifespan or is appropriate for use.",
      "Limitation tags intentionally over-surface caution signals so expert and AI workflows can inspect the underlying source and study records."
    ],
    quality_class_legend: getEvidenceQualityLegend(),
    study_design_flag_legend: evidenceStudyDesignFlags.map((flag) => ({
      value: flag,
      label: evidenceStudyDesignFlagLabels[flag]
    })),
    human_relevance_legend: evidenceHumanRelevanceFlags.map((flag) => ({
      value: flag,
      label: evidenceHumanRelevanceFlagLabels[flag]
    })),
    limitation_legend: evidenceLimitationTags.map((tag) => ({
      value: tag,
      label: evidenceLimitationTagLabels[tag]
    })),
    summary: {
      total_finding_count: baseIndex.summary.total_finding_count,
      scoped_finding_count: baseIndex.findings.length,
      filtered_finding_count: qualityFilteredRows.length,
      returned_finding_count: exportedRows.length,
      source_count: sourceIds.size,
      study_count: studyIds.size,
      track_count: trackIds.size,
      quality_class_counts: getEvidenceQualityClassCounts(qualityFilteredRows),
      limitation_tag_counts: getEvidenceQualityTagCountRows({
        rows: qualityFilteredRows,
        order: evidenceLimitationTags,
        labels: evidenceLimitationTagLabels,
        getValues: (row) => row.quality.limitation_tags
      }),
      human_relevance_counts: getEvidenceQualityTagCountRows({
        rows: qualityFilteredRows,
        order: evidenceHumanRelevanceFlags,
        labels: evidenceHumanRelevanceFlagLabels,
        getValues: (row) => row.quality.human_relevance_flags
      }),
      study_design_flag_counts: getEvidenceQualityTagCountRows({
        rows: qualityFilteredRows,
        order: evidenceStudyDesignFlags,
        labels: evidenceStudyDesignFlagLabels,
        getValues: (row) => row.quality.study_design_flags
      })
    },
    facet_options: {
      tracks: baseIndex.facet_options.tracks,
      source_types: baseIndex.facet_options.source_types,
      quality_classes: evidenceQualityClasses.map((qualityClass) => ({
        value: qualityClass,
        label: evidenceQualityClassLabels[qualityClass]
      })),
      limitations: evidenceLimitationTags.map((tag) => ({
        value: tag,
        label: evidenceLimitationTagLabels[tag]
      })),
      human_relevance: evidenceHumanRelevanceFlags.map((flag) => ({
        value: flag,
        label: evidenceHumanRelevanceFlagLabels[flag]
      }))
    },
    source_file_patterns: {
      public_records: ["data/sources/*.json", "data/studies/*.json", "data/findings/*.json"],
      derived_from: ["/data/evidence-index.json", "/data/evidence-map.json"]
    },
    findings: exportedRows
  };
}

export async function getTrackEvidenceQualityProfile(trackId: string) {
  noStore();
  const qualityExport = await getEvidenceQualityExport({ track: trackId });

  return {
    track_id: trackId,
    finding_count: qualityExport.summary.filtered_finding_count,
    quality_classes: evidenceQualityClasses
      .map((qualityClass) => ({
        value: qualityClass,
        label: evidenceQualityClassLabels[qualityClass],
        count: qualityExport.summary.quality_class_counts[qualityClass],
        plain_meaning: evidenceQualityClassPlainMeanings[qualityClass]
      }))
      .filter((item) => item.count > 0),
    limitations: qualityExport.summary.limitation_tag_counts.slice(0, 6),
    human_relevance: qualityExport.summary.human_relevance_counts.slice(0, 6),
    data_path: `/data/evidence-quality.json?track=${encodeURIComponent(trackId)}`,
    page_path: `/evidence?track=${encodeURIComponent(trackId)}`
  };
}

function cleanEvidenceConflictFilters(filters: EvidenceConflictFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(200, filters.limit)) : undefined;

  return {
    track: filters.track ?? "",
    consistency_class: filters.consistency_class ?? "",
    pattern: filters.pattern ?? "",
    limit
  };
}

function getEvidenceConflictQueryPath(path: string, filters: EvidenceConflictFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanEvidenceConflictFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getAppliedEvidenceConflictFilters(filters: ReturnType<typeof cleanEvidenceConflictFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, String(value)])
  );
}

function getEvidenceConsistencyLegend() {
  return evidenceConsistencyClasses.map((consistencyClass) => ({
    value: consistencyClass,
    label: evidenceConsistencyClassLabels[consistencyClass],
    plain_meaning: evidenceConsistencyClassPlainMeanings[consistencyClass]
  }));
}

function applyEvidenceConflictFilters<
  T extends {
    id: string;
    consistency_class: EvidenceConsistencyClass;
    patterns: EvidenceConsistencyPattern[];
  }
>(rows: T[], filters: EvidenceConflictFilters) {
  const selected = cleanEvidenceConflictFilters(filters);

  return rows.filter(
    (row) =>
      (!selected.track || row.id === selected.track) &&
      (!selected.consistency_class || row.consistency_class === selected.consistency_class) &&
      (!selected.pattern || row.patterns.includes(selected.pattern))
  );
}

export async function getEvidenceConflictsExport(filters: EvidenceConflictFilters = {}) {
  noStore();
  const selected = cleanEvidenceConflictFilters(filters);
  const [evidenceMap, evidenceIndex] = await Promise.all([
    getEvidenceMapExport(),
    getEvidenceIndexExport({ sort: "strength" })
  ]);
  const allRows = getEvidenceConsistencyTrackRows({ evidenceMap, rows: evidenceIndex.findings }).sort(
    (left, right) =>
      right.counts.limiting_or_mixed_finding_count - left.counts.limiting_or_mixed_finding_count ||
      right.patterns.length - left.patterns.length ||
      left.name.localeCompare(right.name)
  );
  const filteredRows = applyEvidenceConflictFilters(allRows, selected);
  const exportedRows = selected.limit ? filteredRows.slice(0, selected.limit) : filteredRows;

  return {
    schema_version: "1.0.0",
    schema_url: "/data/evidence-conflicts.schema.json",
    export_type: "lev_tracker_evidence_conflicts",
    generated_at: new Date().toISOString(),
    last_public_update: evidenceMap.last_public_update,
    canonical_path: getEvidenceConflictQueryPath("/data/evidence-conflicts.json", selected),
    page_path: selected.track ? `/tracks/${encodeURIComponent(selected.track)}` : "/evidence",
    applied_filters: getAppliedEvidenceConflictFilters(selected),
    methodology: {
      classification_basis:
        "Consistency classes and patterns are derived from promoted finding directions, evidence tiers, endpoint categories, species context, quality limitation tags, source IDs, study IDs, and registry no-results flags.",
      not_meta_analysis:
        "This export is a tracker-level conflict and replication triage map; it is not a statistical meta-analysis or formal systematic-review synthesis.",
      primary_uses: [
        "Find tracks where positive signals coexist with null, negative, mixed, or no-results evidence.",
        "Identify animal-positive or biomarker-positive areas that lack aligned human functional or clinical replication.",
        "Give expert and language-model workflows explicit guardrails against cherry-picking a single positive finding."
      ]
    },
    caveats: [
      "Consistency labels describe promoted tracker findings and may miss unpublished, unmapped, or newly published literature.",
      "A conflict pattern does not prove an intervention fails; it marks where interpretation needs source-level review.",
      "A consistent positive signal is still not medical advice or proof of lifespan extension."
    ],
    consistency_class_legend: getEvidenceConsistencyLegend(),
    pattern_legend: getEvidenceConsistencyPatternRows(evidenceConsistencyPatterns),
    summary: {
      total_track_count: allRows.length,
      filtered_track_count: filteredRows.length,
      returned_track_count: exportedRows.length,
      track_with_patterns_count: exportedRows.filter((row) => row.patterns.length > 0).length,
      mixed_or_conflicting_track_count: exportedRows.filter(
        (row) =>
          row.consistency_class === "mixed_or_conflicting_signal" ||
          row.consistency_class === "animal_positive_human_limited" ||
          row.consistency_class === "biomarker_positive_function_mixed" ||
          row.consistency_class === "registry_results_gap"
      ).length,
      consistency_class_counts: getEvidenceConsistencyClassCounts(filteredRows),
      pattern_counts: getEvidenceConsistencyPatternCounts(filteredRows)
    },
    facet_options: {
      tracks: evidenceMap.tracks.map((track) => ({ value: track.id, label: track.name })),
      consistency_classes: evidenceConsistencyClasses.map((consistencyClass) => ({
        value: consistencyClass,
        label: evidenceConsistencyClassLabels[consistencyClass]
      })),
      patterns: evidenceConsistencyPatterns.map((pattern) => ({
        value: pattern,
        label: evidenceConsistencyPatternLabels[pattern]
      }))
    },
    source_file_patterns: {
      public_records: ["data/sources/*.json", "data/studies/*.json", "data/findings/*.json"],
      derived_from: ["/data/evidence-index.json", "/data/evidence-quality.json", "/data/evidence-map.json"]
    },
    tracks: exportedRows
  };
}

export async function getTrackEvidenceConsistencyProfile(trackId: string) {
  noStore();
  const conflictExport = await getEvidenceConflictsExport({ track: trackId });
  const track = conflictExport.tracks[0];

  if (!track) {
    return undefined;
  }

  return {
    track_id: track.id,
    consistency_class: track.consistency_class,
    consistency_class_label: track.consistency_class_label,
    consistency_class_meaning: track.consistency_class_meaning,
    consistency_reason: track.consistency_reason,
    patterns: track.patterns.map((pattern) => ({
      value: pattern,
      label: evidenceConsistencyPatternLabels[pattern]
    })),
    counts: track.counts,
    direction_counts: track.direction_counts,
    data_path: `/data/evidence-conflicts.json?track=${encodeURIComponent(track.id)}`,
    page_path: `/evidence?track=${encodeURIComponent(track.id)}`
  };
}

type ClaimGuardrailEvidenceMapTrack = Awaited<ReturnType<typeof getEvidenceMapExport>>["tracks"][number];
type ClaimGuardrailConflictTrack = Awaited<ReturnType<typeof getEvidenceConflictsExport>>["tracks"][number];
type ClaimGuardrailQualityFinding = Awaited<ReturnType<typeof getEvidenceQualityExport>>["findings"][number];
type ClaimRiskReasonMap = Partial<Record<ClaimOverclaimRisk, string>>;

function uniqueTextRows(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function formatClaimItems(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function hasCoverageLimit(track: ClaimGuardrailEvidenceMapTrack) {
  return (
    !track.coverage ||
    track.coverage.coverage_verdict === "thin" ||
    track.coverage.coverage_confidence === "low"
  );
}

function getClaimBoundaryClass({
  track,
  conflictTrack
}: {
  track: ClaimGuardrailEvidenceMapTrack;
  conflictTrack: ClaimGuardrailConflictTrack;
}): ClaimBoundaryClass {
  if (!track.outlook || track.evidence_counts.finding_count === 0) {
    return "not_yet_claimable";
  }

  if (hasCoverageLimit(track)) {
    return "coverage_limited_claim";
  }

  if (
    conflictTrack.consistency_class === "registry_results_gap" ||
    conflictTrack.counts.registry_no_results_count > 0
  ) {
    return "registry_pending_claim";
  }

  if (
    conflictTrack.consistency_class === "mixed_or_conflicting_signal" ||
    conflictTrack.consistency_class === "animal_positive_human_limited" ||
    conflictTrack.consistency_class === "biomarker_positive_function_mixed"
  ) {
    return "conflicted_or_mixed_claim";
  }

  switch (track.outlook.stage) {
    case "durable_disease_or_mortality_relevance":
    case "human_functional_benefit":
      return "human_claim_bounded";
    case "human_biomarker_signal":
      return "early_human_signal_only";
    case "animal_signal":
    case "mechanistic_plausibility":
      return "preclinical_or_mechanistic_only";
    default:
      return "not_yet_claimable";
  }
}

function getClaimRiskRows(risks: Set<ClaimOverclaimRisk>, reasons: ClaimRiskReasonMap) {
  return claimOverclaimRisks
    .filter((risk) => risks.has(risk))
    .map((risk) => ({
      value: risk,
      label: claimOverclaimRiskLabels[risk],
      reason: reasons[risk] ?? "This risk should remain explicit when this track is summarized."
    }));
}

function getClaimBoundaryLegend() {
  return claimBoundaryClasses.map((boundaryClass) => ({
    value: boundaryClass,
    label: claimBoundaryClassLabels[boundaryClass],
    plain_meaning: claimBoundaryClassPlainMeanings[boundaryClass]
  }));
}

function getClaimBoundaryClassCounts(rows: Array<{ boundary_class: ClaimBoundaryClass }>) {
  return Object.fromEntries(
    claimBoundaryClasses.map((boundaryClass) => [
      boundaryClass,
      rows.filter((row) => row.boundary_class === boundaryClass).length
    ])
  ) as Record<ClaimBoundaryClass, number>;
}

function getClaimOverclaimRiskCounts(rows: Array<{ overclaim_risks: Array<{ value: ClaimOverclaimRisk }> }>) {
  return claimOverclaimRisks
    .map((risk) => ({
      value: risk,
      label: claimOverclaimRiskLabels[risk],
      count: rows.filter((row) => row.overclaim_risks.some((item) => item.value === risk)).length
    }))
    .filter((item) => item.count > 0);
}

function getClaimGuardrailSupportedClaims({
  track,
  boundaryClass
}: {
  track: ClaimGuardrailEvidenceMapTrack;
  boundaryClass: ClaimBoundaryClass;
}) {
  if (!track.outlook) {
    return [
      `The tracker has not promoted a current public efficacy read for ${track.name}.`,
      `The appropriate use is provenance review, not a substantive benefit claim.`
    ];
  }

  const stageLabel = track.outlook.stage_label;
  const readFirmness = track.outlook.read_firmness_label.toLocaleLowerCase();
  const claims = [
    `The current tracker read for ${track.name} is ${stageLabel} with ${readFirmness} read firmness.`
  ];

  switch (track.outlook.stage) {
    case "durable_disease_or_mortality_relevance":
      claims.push(
        `${track.name} has human disease, mortality, or durable-outcome relevance in the tracker, but that remains narrower than a LEV or clinical-use claim.`
      );
      break;
    case "human_functional_benefit":
      claims.push(
        `${track.name} has some human functional evidence in the tracker, with interpretation bounded by limitations, safety, and durability.`
      );
      break;
    case "human_biomarker_signal":
      claims.push(
        `${track.name} has early human biomarker or limited-function signals, not established durable healthspan or lifespan benefit.`
      );
      break;
    case "animal_signal":
      claims.push(
        `${track.name} has promoted animal or preclinical signals, not established direct human benefit.`
      );
      break;
    case "mechanistic_plausibility":
      claims.push(
        `${track.name} has biological rationale or mechanistic plausibility in the tracker, not demonstrated human benefit.`
      );
      break;
  }

  if (boundaryClass === "coverage_limited_claim") {
    claims.push(`Any summary should say that map coverage is not strong enough to treat low counts as field scarcity.`);
  }

  if (boundaryClass === "registry_pending_claim") {
    claims.push(`Any summary should say that unresolved or absent registry results could change the read.`);
  }

  if (boundaryClass === "conflicted_or_mixed_claim") {
    claims.push(`Any summary should keep mixed, null, limiting, or unreplicated evidence visible.`);
  }

  return uniqueTextRows(claims);
}

function getClaimGuardrailUnsupportedClaims({
  track,
  boundaryClass,
  conflictTrack
}: {
  track: ClaimGuardrailEvidenceMapTrack;
  boundaryClass: ClaimBoundaryClass;
  conflictTrack: ClaimGuardrailConflictTrack;
}) {
  const claims = [
    `${track.name} extends human lifespan, reverses aging, or delivers LEV.`,
    `${track.name} is safe or effective for personal use.`,
    `A favorable finding for ${track.name} establishes clinical readiness, dosing guidance, or medical advice.`,
    `All interventions in ${track.name} share the same benefit-risk profile.`,
    `Animal, mechanistic, or biomarker results for ${track.name} prove durable human healthspan benefit.`
  ];

  if (boundaryClass === "registry_pending_claim" || conflictTrack.counts.registry_no_results_count > 0) {
    claims.push(`Pending or absent trial results for ${track.name} can be treated as positive evidence.`);
  }

  if (boundaryClass === "coverage_limited_claim") {
    claims.push(`Low mapped evidence for ${track.name} proves the field itself is empty.`);
  }

  return uniqueTextRows(claims);
}

function getClaimGuardrailCaveats({
  track,
  conflictTrack,
  qualityRows,
  topLimitations
}: {
  track: ClaimGuardrailEvidenceMapTrack;
  conflictTrack: ClaimGuardrailConflictTrack;
  qualityRows: ClaimGuardrailQualityFinding[];
  topLimitations: Array<{ value: EvidenceLimitationTag; label: string; count: number }>;
}) {
  const coverageCaveat = track.coverage
    ? `Coverage: ${track.coverage.coverage_verdict_label ?? "Unrated map"}; ${
        track.coverage.coverage_confidence_label ?? "unrated map confidence"
      }.`
    : "Coverage has not been assessed enough to separate field scarcity from incomplete map work.";
  const limitationLabels = topLimitations.slice(0, 4).map((item) => item.label.toLocaleLowerCase());
  const limitationCaveat = limitationLabels.length
    ? `Top derived limitations include ${formatClaimItems(limitationLabels)}.`
    : undefined;
  const qualityCaveat = qualityRows.length
    ? `Quality labels summarize ${qualityRows.length} promoted finding(s), not a formal risk-of-bias review.`
    : undefined;

  return uniqueTextRows([
    "Not medical advice; do not convert tracker labels into dosing, treatment, or personal-use guidance.",
    "Track-level claims may not apply to every exemplar intervention in the family.",
    coverageCaveat,
    conflictTrack.consistency_reason,
    limitationCaveat,
    qualityCaveat,
    ...(track.outlook?.main_evidence_gaps ?? []),
    ...(track.outlook?.strongest_current_evidence ?? []).map((item) => `Strongest current evidence: ${item}.`)
  ]).slice(0, 10);
}

function getClaimGuardrailUpgradeConditions({
  track,
  boundaryClass
}: {
  track: ClaimGuardrailEvidenceMapTrack;
  boundaryClass: ClaimBoundaryClass;
}) {
  const conditions = [
    ...(track.outlook?.what_would_change_the_rating ?? []),
    "Independent human functional or clinical replication with acceptable safety and durability.",
    "Source-level review that resolves the main limitation tags without introducing stronger counterevidence."
  ];

  if (boundaryClass === "registry_pending_claim") {
    conditions.push("Posted registry results resolving the active or no-results trial uncertainty.");
  }

  if (boundaryClass === "coverage_limited_claim") {
    conditions.push("Higher-confidence coverage assessment showing the map is adequate or strong.");
  }

  return uniqueTextRows(conditions).slice(0, 8);
}

function getClaimGuardrailWeakenConditions({
  boundaryClass
}: {
  boundaryClass: ClaimBoundaryClass;
}) {
  const conditions = [
    "Null, negative, or mixed human functional or clinical results.",
    "Safety or durability signals dominate the benefit interpretation.",
    "Independent replication fails or shows materially smaller effects.",
    "Coverage repair finds missing limiting evidence."
  ];

  if (boundaryClass === "registry_pending_claim") {
    conditions.push("Registry trials remain unpublished or report null, negative, or safety-limiting results.");
  }

  if (boundaryClass === "coverage_limited_claim") {
    conditions.push("A stronger map shows the current positive read was missing important counterevidence.");
  }

  return uniqueTextRows(conditions);
}

function getClaimGuardrailTrackRows({
  evidenceMap,
  conflictsExport,
  qualityExport
}: {
  evidenceMap: Awaited<ReturnType<typeof getEvidenceMapExport>>;
  conflictsExport: Awaited<ReturnType<typeof getEvidenceConflictsExport>>;
  qualityExport: Awaited<ReturnType<typeof getEvidenceQualityExport>>;
}) {
  const conflictByTrackId = new Map(conflictsExport.tracks.map((track) => [track.id, track]));
  const qualityRowsByTrackId = new Map<string, ClaimGuardrailQualityFinding[]>();

  for (const row of qualityExport.findings) {
    for (const trackId of row.track_ids) {
      qualityRowsByTrackId.set(trackId, [...(qualityRowsByTrackId.get(trackId) ?? []), row]);
    }
  }

  return evidenceMap.tracks.map((track) => {
    const conflictTrack = conflictByTrackId.get(track.id);

    if (!conflictTrack) {
      throw new Error(`Missing evidence consistency row for track ${track.id}`);
    }

    const qualityRows = qualityRowsByTrackId.get(track.id) ?? [];
    const limitationSet = new Set(qualityRows.flatMap((row) => row.quality.limitation_tags));
    const topLimitations = getEvidenceQualityTagCountRows({
      rows: qualityRows,
      order: evidenceLimitationTags,
      labels: evidenceLimitationTagLabels,
      getValues: (row) => row.quality.limitation_tags
    }).slice(0, 6);
    const boundaryClass = getClaimBoundaryClass({ track, conflictTrack });
    const risks = new Set<ClaimOverclaimRisk>();
    const riskReasons: ClaimRiskReasonMap = {};
    const addRisk = (risk: ClaimOverclaimRisk, reason: string) => {
      risks.add(risk);
      riskReasons[risk] = reason;
    };

    addRisk(
      "human_lifespan_extension",
      "Evidence stages below LEV do not establish generalized human lifespan extension."
    );
    addRisk(
      "clinical_use_or_medical_advice",
      "Tracker labels are evidence-map summaries, not treatment recommendations."
    );
    addRisk(
      "class_wide_generalization",
      "Track families group heterogeneous interventions that may not share one benefit-risk profile."
    );
    addRisk(
      "dose_schedule_transfer",
      "Source findings do not automatically transfer across dose, schedule, formulation, or population."
    );

    if (
      track.outlook?.stage === "human_biomarker_signal" ||
      limitationSet.has("surrogate_or_biomarker_endpoint") ||
      conflictTrack.patterns.includes("biomarker_positive_function_mixed_or_null")
    ) {
      addRisk(
        "biomarker_surrogate_leap",
        "Biomarker or limited-function signals should not be rewritten as durable healthspan outcomes."
      );
    }

    if (
      track.outlook?.stage === "mechanistic_plausibility" ||
      track.outlook?.stage === "animal_signal" ||
      limitationSet.has("animal_only") ||
      conflictTrack.patterns.includes("preclinical_positive_no_human") ||
      conflictTrack.patterns.includes("animal_positive_human_null_or_mixed")
    ) {
      addRisk(
        "preclinical_translation_leap",
        "Preclinical or mechanism-heavy evidence should not be treated as direct human benefit."
      );
    }

    if (
      conflictTrack.patterns.includes("single_source_positive_signal") ||
      (conflictTrack.counts.positive_finding_count > 0 && conflictTrack.counts.positive_source_count <= 1)
    ) {
      addRisk(
        "single_study_or_source_overweight",
        "The positive signal is not yet independently replicated across enough mapped sources."
      );
    }

    if (
      track.outlook?.stage !== "durable_disease_or_mortality_relevance" ||
      limitationSet.has("safety_unresolved") ||
      conflictTrack.counts.function_or_clinical_limiting_count > 0
    ) {
      addRisk(
        "safety_or_durability_overclaim",
        "Safety, durability, and functional endpoint limits should remain attached to the claim."
      );
    }

    if (
      conflictTrack.patterns.includes("registry_no_results_with_positive_claims") ||
      conflictTrack.counts.registry_no_results_count > 0
    ) {
      addRisk(
        "registry_results_absent",
        "No-results or unresolved registry records should not be counted as positive evidence."
      );
    }

    if (hasCoverageLimit(track)) {
      addRisk(
        "coverage_completeness_overclaim",
        "Map coverage is not strong enough to infer that low mapped evidence means the field is empty."
      );
    }

    const supportedClaims = getClaimGuardrailSupportedClaims({ track, boundaryClass });
    const unsupportedClaims = getClaimGuardrailUnsupportedClaims({ track, boundaryClass, conflictTrack });
    const requiredCaveats = getClaimGuardrailCaveats({
      track,
      conflictTrack,
      qualityRows,
      topLimitations
    });
    const limitationPhrase = topLimitations.length
      ? ` Key caveats include ${formatClaimItems(
          topLimitations
            .slice(0, 3)
            .map((item) => item.label.toLocaleLowerCase())
        )}.`
      : "";
    const stageLabel = track.outlook?.stage_label ?? "Not rated yet";
    const readFirmness = track.outlook?.read_firmness_label ?? "Unrated";
    const guardrailSummary = `${claimBoundaryClassLabels[boundaryClass]}. The tracker currently reads ${
      track.name
    } as ${stageLabel} with ${readFirmness.toLocaleLowerCase()} read firmness; ${
      conflictTrack.consistency_class_label
    } and map-coverage caveats must stay attached.${limitationPhrase}`;

    return {
      id: track.id,
      name: track.name,
      href: track.href,
      primary_hallmark_id: track.primary_hallmark_id,
      primary_hallmark_name: track.primary_hallmark_name,
      stage: track.outlook?.stage,
      stage_label: track.outlook?.stage_label,
      read_firmness: track.outlook?.confidence,
      read_firmness_label: track.outlook?.read_firmness_label,
      coverage_verdict: track.coverage?.coverage_verdict,
      coverage_verdict_label: track.coverage?.coverage_verdict_label,
      coverage_confidence: track.coverage?.coverage_confidence,
      coverage_confidence_label: track.coverage?.coverage_confidence_label,
      boundary_class: boundaryClass,
      boundary_class_label: claimBoundaryClassLabels[boundaryClass],
      boundary_class_meaning: claimBoundaryClassPlainMeanings[boundaryClass],
      guardrail_summary: guardrailSummary,
      supported_claims: supportedClaims,
      unsupported_claims: unsupportedClaims,
      must_not_infer: unsupportedClaims,
      allowed_summary_phrasing: uniqueTextRows([
        `The tracker currently reads ${track.name} as ${stageLabel} with ${readFirmness.toLocaleLowerCase()} read firmness.`,
        `A fair summary should mention ${claimBoundaryClassLabels[boundaryClass].toLocaleLowerCase()} and ${conflictTrack.consistency_class_label.toLocaleLowerCase()}.`,
        topLimitations.length
          ? `Key caveats include ${formatClaimItems(
              topLimitations
                .slice(0, 3)
                .map((item) => item.label.toLocaleLowerCase())
            )}.`
          : undefined
      ]),
      required_caveats: requiredCaveats,
      overclaim_risks: getClaimRiskRows(risks, riskReasons),
      claim_upgrade_conditions: getClaimGuardrailUpgradeConditions({ track, boundaryClass }),
      claim_weaken_conditions: getClaimGuardrailWeakenConditions({ boundaryClass }),
      conflict: {
        consistency_class: conflictTrack.consistency_class,
        consistency_class_label: conflictTrack.consistency_class_label,
        consistency_reason: conflictTrack.consistency_reason,
        patterns: conflictTrack.patterns,
        pattern_labels: conflictTrack.pattern_labels,
        counts: conflictTrack.counts
      },
      quality_snapshot: {
        finding_count: qualityRows.length,
        quality_class_counts: getEvidenceQualityClassCounts(qualityRows),
        top_limitations: topLimitations
      },
      paths: {
        track_page_path: track.href,
        claim_guardrails_path: `/data/claim-guardrails.json?track=${encodeURIComponent(track.id)}`,
        evidence_conflicts_path: `/data/evidence-conflicts.json?track=${encodeURIComponent(track.id)}`,
        evidence_quality_path: `/data/evidence-quality.json?track=${encodeURIComponent(track.id)}`,
        evidence_index_path: `/data/evidence-index.json?track=${encodeURIComponent(track.id)}`,
        evidence_page_path: `/evidence?track=${encodeURIComponent(track.id)}`
      }
    };
  });
}

function cleanClaimGuardrailFilters(filters: ClaimGuardrailFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(200, filters.limit)) : undefined;

  return {
    q: filters.q?.trim() ?? "",
    track: filters.track ?? "",
    boundary_class: filters.boundary_class ?? "",
    overclaim_risk: filters.overclaim_risk ?? "",
    limit
  };
}

function getClaimGuardrailQueryPath(path: string, filters: ClaimGuardrailFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanClaimGuardrailFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getAppliedClaimGuardrailFilters(filters: ReturnType<typeof cleanClaimGuardrailFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, String(value)])
  );
}

function applyClaimGuardrailFilters<
  T extends {
    id: string;
    name: string;
    primary_hallmark_name: string;
    stage_label?: string;
    read_firmness_label?: string;
    boundary_class: ClaimBoundaryClass;
    boundary_class_label: string;
    guardrail_summary: string;
    supported_claims: string[];
    unsupported_claims: string[];
    required_caveats: string[];
    overclaim_risks: Array<{ value: ClaimOverclaimRisk; label?: string; reason?: string }>;
  }
>(rows: T[], filters: ClaimGuardrailFilters) {
  const selected = cleanClaimGuardrailFilters(filters);
  const query = selected.q.toLocaleLowerCase();

  return rows.filter(
    (row) => {
      const searchableText = [
        row.id,
        row.name,
        row.primary_hallmark_name,
        row.stage_label,
        row.read_firmness_label,
        row.boundary_class,
        row.boundary_class_label,
        row.guardrail_summary,
        ...row.supported_claims,
        ...row.unsupported_claims,
        ...row.required_caveats,
        ...row.overclaim_risks.flatMap((risk) => [risk.value, risk.label, risk.reason])
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLocaleLowerCase();

      return (
        (!query || searchableText.includes(query)) &&
        (!selected.track || row.id === selected.track) &&
        (!selected.boundary_class || row.boundary_class === selected.boundary_class) &&
        (!selected.overclaim_risk || row.overclaim_risks.some((risk) => risk.value === selected.overclaim_risk))
      );
    }
  );
}

export async function getClaimGuardrailsExport(filters: ClaimGuardrailFilters = {}) {
  noStore();
  const selected = cleanClaimGuardrailFilters(filters);
  const [evidenceMap, conflictsExport, qualityExport] = await Promise.all([
    getEvidenceMapExport(),
    getEvidenceConflictsExport(),
    getEvidenceQualityExport()
  ]);
  const boundaryRank = new Map(claimBoundaryClasses.map((boundaryClass, index) => [boundaryClass, index]));
  const allRows = getClaimGuardrailTrackRows({ evidenceMap, conflictsExport, qualityExport }).sort(
    (left, right) =>
      (boundaryRank.get(left.boundary_class) ?? 0) - (boundaryRank.get(right.boundary_class) ?? 0) ||
      right.overclaim_risks.length - left.overclaim_risks.length ||
      left.name.localeCompare(right.name)
  );
  const filteredRows = applyClaimGuardrailFilters(allRows, selected);
  const exportedRows = selected.limit ? filteredRows.slice(0, selected.limit) : filteredRows;

  return {
    schema_version: "1.0.0",
    schema_url: "/data/claim-guardrails.schema.json",
    export_type: "lev_tracker_claim_guardrails",
    generated_at: new Date().toISOString(),
    last_public_update: evidenceMap.last_public_update,
    canonical_path: getClaimGuardrailQueryPath("/data/claim-guardrails.json", selected),
    page_path: selected.track ? `/tracks/${encodeURIComponent(selected.track)}` : "/data",
    applied_filters: getAppliedClaimGuardrailFilters(selected),
    methodology: {
      classification_basis:
        "Claim boundary classes and overclaim risks are derived from public outlook stage, read firmness, map coverage, finding-level quality tags, track-level consistency patterns, source replication counts, and registry no-results flags.",
      not_claim_adjudication:
        "This export is a phrasing and interpretation guardrail layer. It is not medical advice, a formal guideline, or a systematic-review certainty grade.",
      primary_uses: [
        "Keep expert-facing summaries attached to the evidence boundary that the tracker can actually support.",
        "Give language-model workflows explicit supported-claim and unsupported-claim lists before generating prose.",
        "Audit whether track pages, data exports, and downstream summaries overstate biomarker, preclinical, registry, safety, durability, or lifespan claims."
      ]
    },
    caveats: [
      "Claim guardrails are conservative heuristic metadata derived from tracker records and should be checked against source records before citation.",
      "A bounded human claim is still not a clinical-use recommendation or evidence of human lifespan extension.",
      "Coverage-limited labels mean the tracker may need more source discovery; they do not prove the research field is empty."
    ],
    boundary_class_legend: getClaimBoundaryLegend(),
    overclaim_risk_legend: claimOverclaimRisks.map((risk) => ({
      value: risk,
      label: claimOverclaimRiskLabels[risk]
    })),
    summary: {
      total_track_count: allRows.length,
      filtered_track_count: filteredRows.length,
      returned_track_count: exportedRows.length,
      boundary_class_counts: getClaimBoundaryClassCounts(filteredRows),
      overclaim_risk_counts: getClaimOverclaimRiskCounts(filteredRows),
      high_risk_track_count: filteredRows.filter((row) => row.overclaim_risks.length >= 6).length,
      coverage_limited_track_count: filteredRows.filter((row) => row.boundary_class === "coverage_limited_claim").length,
      registry_pending_track_count: filteredRows.filter((row) => row.boundary_class === "registry_pending_claim").length
    },
    facet_options: {
      tracks: evidenceMap.tracks.map((track) => ({ value: track.id, label: track.name })),
      boundary_classes: claimBoundaryClasses.map((boundaryClass) => ({
        value: boundaryClass,
        label: claimBoundaryClassLabels[boundaryClass]
      })),
      overclaim_risks: claimOverclaimRisks.map((risk) => ({
        value: risk,
        label: claimOverclaimRiskLabels[risk]
      }))
    },
    source_file_patterns: {
      public_records: ["data/outlooks/*.json", "data/coverage-status/*.json", "data/sources/*.json", "data/studies/*.json", "data/findings/*.json"],
      derived_from: [
        "/data/evidence-map.json",
        "/data/evidence-index.json",
        "/data/evidence-quality.json",
        "/data/evidence-conflicts.json"
      ]
    },
    tracks: exportedRows
  };
}

export async function getTrackClaimGuardrailProfile(trackId: string) {
  noStore();
  const guardrailsExport = await getClaimGuardrailsExport({ track: trackId });
  const track = guardrailsExport.tracks[0];

  if (!track) {
    return undefined;
  }

  return {
    track_id: track.id,
    boundary_class: track.boundary_class,
    boundary_class_label: track.boundary_class_label,
    boundary_class_meaning: track.boundary_class_meaning,
    guardrail_summary: track.guardrail_summary,
    supported_claims: track.supported_claims,
    unsupported_claims: track.unsupported_claims,
    must_not_infer: track.must_not_infer,
    required_caveats: track.required_caveats,
    overclaim_risks: track.overclaim_risks,
    data_path: track.paths.claim_guardrails_path,
    page_path: track.paths.evidence_page_path
  };
}

type ClaimConsistencyGuardrailTrack = Awaited<ReturnType<typeof getClaimGuardrailsExport>>["tracks"][number];
type ClaimConsistencyContextRow = {
  id: string;
  track_id: string;
  track_name: string;
  source_kind: ClaimConsistencySourceKind;
  source_kind_label: string;
  source_label: string;
  field_path: string;
  text: string;
  href: string;
  record_path: string;
};
type ClaimConsistencyResolutionEntry = {
  fingerprint: string;
  review_status: ClaimConsistencyReviewStatus;
  reviewed_at?: string;
  reviewer_role?: string;
  note?: string;
  action_required?: string;
  last_seen_at?: string;
  applies_to?: {
    track_id?: string;
    issue_type?: ClaimConsistencyIssueType;
    source_record_path?: string;
    field_path?: string;
  };
};
type ClaimConsistencyResolutionLedger = {
  schema_version: "1.0.0";
  state_type: "claim_consistency_resolutions";
  updated_at: string;
  source_export: string;
  policy: {
    default_status: ClaimConsistencyReviewStatus;
    fingerprint_basis: string[];
    status_definitions: Array<{
      value: ClaimConsistencyReviewStatus;
      label: string;
      meaning: string;
      suppresses_unresolved_count: boolean;
    }>;
  };
  resolutions: ClaimConsistencyResolutionEntry[];
};

function getEmptyClaimConsistencyResolutionLedger(): ClaimConsistencyResolutionLedger {
  return {
    schema_version: "1.0.0",
    state_type: "claim_consistency_resolutions",
    updated_at: new Date(0).toISOString(),
    source_export: "/data/claim-consistency-audit.json",
    policy: {
      default_status: "open",
      fingerprint_basis: [
        "track_id",
        "issue_type",
        "source_kind",
        "source_record_path",
        "field_path",
        "boundary_class",
        "normalized_text"
      ],
      status_definitions: []
    },
    resolutions: []
  };
}

async function loadClaimConsistencyResolutionLedger() {
  return readOptionalJsonFile<ClaimConsistencyResolutionLedger>(
    claimConsistencyResolutionsPath,
    getEmptyClaimConsistencyResolutionLedger()
  );
}

function normalizeClaimAuditText(text: string) {
  return text.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function createClaimConsistencyFingerprint({
  trackId,
  issueType,
  sourceKind,
  sourceRecordPath,
  fieldPath,
  boundaryClass,
  text
}: {
  trackId: string;
  issueType: ClaimConsistencyIssueType;
  sourceKind: ClaimConsistencySourceKind;
  sourceRecordPath: string;
  fieldPath: string;
  boundaryClass: ClaimBoundaryClass;
  text: string;
}) {
  const basis = [
    trackId,
    issueType,
    sourceKind,
    sourceRecordPath,
    fieldPath,
    boundaryClass,
    normalizeClaimAuditText(text)
  ].join("\u001f");

  return `cca_${createHash("sha256").update(basis).digest("hex").slice(0, 20)}`;
}

function hasClaimAuditTerm(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getClaimAuditMatchedTerms(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

function hasNegatedClaimLanguage(text: string) {
  return /\b(does not|did not|doesn't|isn't|aren't|wasn't|not|no|without|lacks?|still lacked|short of|not proof|not enough|not established|cannot|should not|must not|none|unproven)\b/.test(
    text
  );
}

function hasClaimBearingText(text: string) {
  return (
    text.length >= 70 &&
    /\b(evidence|signal|benefit|improve|improved|improves|supports?|show|shows|showing|claim|read|rating|outlook|result|results|trial|human|biomarker|function|disease|safety|lifespan|healthspan|LEV)\b/i.test(
      text
    )
  );
}

function addClaimConsistencyContext(
  contexts: ClaimConsistencyContextRow[],
  input: {
    trackId: string;
    trackName: string;
    sourceKind: ClaimConsistencySourceKind;
    sourceLabel: string;
    fieldPath: string;
    text?: string;
    href: string;
    recordPath: string;
  }
) {
  const text = input.text?.trim();

  if (!text || !hasClaimBearingText(text)) {
    return;
  }

  contexts.push({
    id: `${input.trackId}:${input.sourceKind}:${contexts.length + 1}`,
    track_id: input.trackId,
    track_name: input.trackName,
    source_kind: input.sourceKind,
    source_kind_label: claimConsistencySourceKindLabels[input.sourceKind],
    source_label: input.sourceLabel,
    field_path: input.fieldPath,
    text,
    href: input.href,
    record_path: input.recordPath
  });
}

function getTrackIdsFromStoryRefs({
  subjectType,
  subjectId,
  relatedOutlookIds,
  trackIdByOutlookId
}: {
  subjectType?: SubjectType;
  subjectId?: string;
  relatedOutlookIds?: string[];
  trackIdByOutlookId: Map<string, string>;
}) {
  const trackIds = new Set<string>();

  if (subjectType === "track" && subjectId) {
    trackIds.add(subjectId);
  }

  for (const outlookId of relatedOutlookIds ?? []) {
    const trackId = trackIdByOutlookId.get(outlookId);
    if (trackId) {
      trackIds.add(trackId);
    }
  }

  return Array.from(trackIds);
}

function addClaimConsistencyStoryContext(
  contexts: ClaimConsistencyContextRow[],
  input: {
    trackIds: string[];
    trackNameById: Map<string, string>;
    sourceKind: ClaimConsistencySourceKind;
    sourceLabel: string;
    fieldPath: string;
    text?: string;
    href: string;
    recordPath: string;
  }
) {
  for (const trackId of input.trackIds) {
    addClaimConsistencyContext(contexts, {
      trackId,
      trackName: input.trackNameById.get(trackId) ?? titleizeIdentifier(trackId),
      sourceKind: input.sourceKind,
      sourceLabel: input.sourceLabel,
      fieldPath: input.fieldPath,
      text: input.text,
      href: input.href,
      recordPath: input.recordPath
    });
  }
}

function collectClaimConsistencyContexts({
  guardrails,
  evidenceMap,
  currentLevStory,
  stateOfFieldEditions
}: {
  guardrails: Awaited<ReturnType<typeof getClaimGuardrailsExport>>;
  evidenceMap: Awaited<ReturnType<typeof getEvidenceMapExport>>;
  currentLevStory: CurrentLevStory;
  stateOfFieldEditions: StateOfFieldEdition[];
}) {
  const contexts: ClaimConsistencyContextRow[] = [];
  const trackNameById = new Map(guardrails.facet_options.tracks.map((track) => [track.value, track.label]));
  const trackIdByOutlookId = new Map(
    evidenceMap.tracks
      .map((track) => [track.outlook?.outlook_id, track.id] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0]))
  );

  for (const track of evidenceMap.tracks) {
    addClaimConsistencyContext(contexts, {
      trackId: track.id,
      trackName: track.name,
      sourceKind: "track_taxonomy",
      sourceLabel: "Track summary",
      fieldPath: "track.summary",
      text: track.summary,
      href: track.href,
      recordPath: "taxonomies/track-taxonomy.v1.json"
    });

    if (track.outlook) {
      const outlookPath = `data/outlooks/${track.outlook.outlook_id}.json`;
      addClaimConsistencyContext(contexts, {
        trackId: track.id,
        trackName: track.name,
        sourceKind: "track_outlook",
        sourceLabel: "Interpretation note",
        fieldPath: "track.outlook.interpretation",
        text: track.outlook.interpretation,
        href: track.href,
        recordPath: outlookPath
      });

      for (const [index, text] of track.outlook.main_evidence_gaps.entries()) {
        addClaimConsistencyContext(contexts, {
          trackId: track.id,
          trackName: track.name,
          sourceKind: "track_outlook",
          sourceLabel: "Main evidence gap",
          fieldPath: `track.outlook.main_evidence_gaps[${index}]`,
          text,
          href: track.href,
          recordPath: outlookPath
        });
      }

      for (const [index, text] of track.outlook.strongest_current_evidence.entries()) {
        addClaimConsistencyContext(contexts, {
          trackId: track.id,
          trackName: track.name,
          sourceKind: "track_outlook",
          sourceLabel: "Strongest current evidence",
          fieldPath: `track.outlook.strongest_current_evidence[${index}]`,
          text,
          href: track.href,
          recordPath: outlookPath
        });
      }

      for (const [index, text] of track.outlook.what_would_change_the_rating.entries()) {
        addClaimConsistencyContext(contexts, {
          trackId: track.id,
          trackName: track.name,
          sourceKind: "track_outlook",
          sourceLabel: "Rating-change condition",
          fieldPath: `track.outlook.what_would_change_the_rating[${index}]`,
          text,
          href: track.href,
          recordPath: outlookPath
        });
      }
    }

    for (const [index, evidence] of track.supporting_evidence.entries()) {
      const baseField = `track.supporting_evidence[${index}]`;
      for (const field of ["conclusion", "rationale"] as const) {
        addClaimConsistencyContext(contexts, {
          trackId: track.id,
          trackName: track.name,
          sourceKind: "track_supporting_evidence",
          sourceLabel: evidence.label,
          fieldPath: `${baseField}.${field}`,
          text: evidence[field],
          href: track.href,
          recordPath: track.outlook ? `data/outlooks/${track.outlook.outlook_id}.json` : "data/outlooks/*.json"
        });
      }

      for (const [limitationIndex, text] of evidence.limitations.entries()) {
        addClaimConsistencyContext(contexts, {
          trackId: track.id,
          trackName: track.name,
          sourceKind: "track_supporting_evidence",
          sourceLabel: evidence.label,
          fieldPath: `${baseField}.limitations[${limitationIndex}]`,
          text,
          href: track.href,
          recordPath: track.outlook ? `data/outlooks/${track.outlook.outlook_id}.json` : "data/outlooks/*.json"
        });
      }
    }
  }

  for (const [index, item] of currentLevStory.recent_developments.entries()) {
    const trackIds = getTrackIdsFromStoryRefs({
      subjectType: item.subject_type,
      subjectId: item.subject_id,
      relatedOutlookIds: item.related_outlook_ids,
      trackIdByOutlookId
    });
    addClaimConsistencyStoryContext(contexts, {
      trackIds,
      trackNameById,
      sourceKind: "current_story",
      sourceLabel: item.label,
      fieldPath: `recent_developments[${index}].summary`,
      text: item.summary,
      href: "/",
      recordPath: "data/content/current-lev-story/current.json"
    });
    addClaimConsistencyStoryContext(contexts, {
      trackIds,
      trackNameById,
      sourceKind: "current_story",
      sourceLabel: item.label,
      fieldPath: `recent_developments[${index}].impact_on_outlook`,
      text: item.impact_on_outlook,
      href: "/",
      recordPath: "data/content/current-lev-story/current.json"
    });
  }

  for (const [index, item] of currentLevStory.what_to_watch_next.entries()) {
    const trackIds = getTrackIdsFromStoryRefs({
      subjectType: item.subject_type,
      subjectId: item.subject_id,
      relatedOutlookIds: item.related_outlook_ids,
      trackIdByOutlookId
    });
    addClaimConsistencyStoryContext(contexts, {
      trackIds,
      trackNameById,
      sourceKind: "current_story",
      sourceLabel: item.label,
      fieldPath: `what_to_watch_next[${index}].summary`,
      text: item.summary,
      href: "/",
      recordPath: "data/content/current-lev-story/current.json"
    });
    addClaimConsistencyStoryContext(contexts, {
      trackIds,
      trackNameById,
      sourceKind: "current_story",
      sourceLabel: item.label,
      fieldPath: `what_to_watch_next[${index}].what_to_look_for`,
      text: item.what_to_look_for,
      href: "/",
      recordPath: "data/content/current-lev-story/current.json"
    });
  }

  for (const [index, item] of currentLevStory.where_better_evidence_is_needed.entries()) {
    const trackIds = getTrackIdsFromStoryRefs({
      subjectType: item.subject_type,
      subjectId: item.subject_id,
      relatedOutlookIds: item.related_outlook_ids,
      trackIdByOutlookId
    });
    addClaimConsistencyStoryContext(contexts, {
      trackIds,
      trackNameById,
      sourceKind: "current_story",
      sourceLabel: item.label,
      fieldPath: `where_better_evidence_is_needed[${index}].rationale`,
      text: item.rationale,
      href: "/",
      recordPath: "data/content/current-lev-story/current.json"
    });
  }

  for (const edition of stateOfFieldEditions) {
    const editionHref = `/state-of-the-field/${edition.slug}`;
    const recordPath = `data/content/state-of-the-field/${edition.slug}.json`;
    const addEditionItem = ({
      items,
      fieldName
    }: {
      items: Array<{
        label?: string;
        title?: string;
        summary?: string;
        interpretation?: string;
        related_outlook_ids?: string[];
      }>;
      fieldName: string;
    }) => {
      for (const [index, item] of items.entries()) {
        const trackIds = getTrackIdsFromStoryRefs({
          relatedOutlookIds: item.related_outlook_ids,
          trackIdByOutlookId
        });
        const sourceLabel = item.title ?? item.label ?? `${edition.title} item`;
        for (const field of ["summary", "interpretation"] as const) {
          addClaimConsistencyStoryContext(contexts, {
            trackIds,
            trackNameById,
            sourceKind: "state_of_field",
            sourceLabel,
            fieldPath: `${fieldName}[${index}].${field}`,
            text: item[field],
            href: editionHref,
            recordPath
          });
        }
      }
    };

    addEditionItem({ items: edition.what_changed, fieldName: "what_changed" });
    addEditionItem({ items: edition.current_context, fieldName: "current_context" });
    addEditionItem({ items: edition.signals_to_watch, fieldName: "signals_to_watch" });
    addEditionItem({ items: edition.evidence_gaps, fieldName: "evidence_gaps" });
    addEditionItem({ items: edition.track_examples, fieldName: "track_examples" });
    addEditionItem({ items: edition.trial_horizon, fieldName: "trial_horizon" });
  }

  return contexts;
}

function getClaimConsistencyIssueRows({
  context,
  guardrail
}: {
  context: ClaimConsistencyContextRow;
  guardrail: ClaimConsistencyGuardrailTrack;
}) {
  const text = normalizeClaimAuditText(context.text);
  const issues: Array<{
    issue_type: ClaimConsistencyIssueType;
    severity: ClaimConsistencySeverity;
    recommendation: string;
    matched_terms: string[];
    missing_terms: string[];
  }> = [];
  const addIssue = (
    issue_type: ClaimConsistencyIssueType,
    severity: ClaimConsistencySeverity,
    recommendation: string,
    matched_terms: string[],
    missing_terms: string[]
  ) => {
    issues.push({ issue_type, severity, recommendation, matched_terms, missing_terms });
  };
  const overclaimTerms = [
    "human lifespan extension",
    "extends human lifespan",
    "extend human lifespan",
    "reverses aging",
    "reversed aging",
    "aging reversal",
    "broad aging reversal",
    "make lev look closer",
    "lev looks close",
    "safe and effective"
  ];
  const matchedOverclaimTerms = getClaimAuditMatchedTerms(text, overclaimTerms);

  if (matchedOverclaimTerms.length && !hasNegatedClaimLanguage(text)) {
    addIssue(
      "possible_unsupported_inference",
      "critical",
      "Reword this context so it does not imply human lifespan extension, LEV progress, broad aging reversal, or clinical readiness beyond the guardrail-supported claims.",
      matchedOverclaimTerms,
      guardrail.unsupported_claims.slice(0, 3)
    );
  }

  const medicalAdviceTerms = [
    "recommended for",
    "should take",
    "should use",
    "dosing guidance",
    "treatment recommendation",
    "prescribe",
    "prescribed",
    "personal use"
  ];
  const matchedMedicalAdviceTerms = getClaimAuditMatchedTerms(text, medicalAdviceTerms);
  if (matchedMedicalAdviceTerms.length && !hasNegatedClaimLanguage(text)) {
    addIssue(
      "medical_advice_language",
      "critical",
      "Remove treatment, dosing, or personal-use implications; the tracker must remain an evidence map, not clinical guidance.",
      matchedMedicalAdviceTerms,
      ["not medical advice", "no dosing guidance", "not a treatment recommendation"]
    );
  }

  if (guardrail.boundary_class === "registry_pending_claim") {
    const requiredTerms = ["registry", "trial", "posted result", "posted outcome", "no posted", "pending", "recruiting", "results gap"];
    if (!hasClaimAuditTerm(text, requiredTerms)) {
      addIssue(
        "missing_registry_boundary",
        "warning",
        "Mention unresolved or absent registry results before summarizing this track as settled or positive.",
        [],
        requiredTerms.slice(0, 5)
      );
    }
  }

  if (guardrail.boundary_class === "conflicted_or_mixed_claim") {
    const requiredTerms = ["mixed", "null", "negative", "limiting", "uneven", "failed", "missed", "unresolved", "uncertain", "not enough"];
    if (!hasClaimAuditTerm(text, requiredTerms)) {
      addIssue(
        "missing_conflict_boundary",
        "warning",
        "Attach the mixed, null, limiting, or unreplicated evidence boundary to this public copy.",
        [],
        requiredTerms.slice(0, 5)
      );
    }
  }

  if (guardrail.boundary_class === "coverage_limited_claim") {
    const requiredTerms = ["coverage", "map", "checked", "source discovery", "field scarcity", "thin", "sparse", "missing review"];
    if (!hasClaimAuditTerm(text, requiredTerms)) {
      addIssue(
        "missing_coverage_boundary",
        "warning",
        "Qualify the copy so sparse mapped evidence is not treated as proof that the research field is empty.",
        [],
        requiredTerms.slice(0, 5)
      );
    }
  }

  if (
    guardrail.boundary_class === "preclinical_or_mechanistic_only" ||
    guardrail.overclaim_risks.some((risk) => risk.value === "preclinical_translation_leap")
  ) {
    const requiredTerms = ["animal", "mouse", "mice", "preclinical", "mechanistic", "nonhuman", "no human", "human-cell"];
    if (!hasClaimAuditTerm(text, requiredTerms)) {
      addIssue(
        "missing_preclinical_boundary",
        "review",
        "Make the animal, preclinical, or mechanistic boundary explicit before this copy is reused as a human-evidence summary.",
        [],
        requiredTerms.slice(0, 5)
      );
    }
  }

  if (guardrail.overclaim_risks.some((risk) => risk.value === "biomarker_surrogate_leap")) {
    const requiredTerms = ["biomarker", "marker", "surrogate", "target engagement", "functional", "clinical", "durable", "long-lasting", "limited"];
    if (!hasClaimAuditTerm(text, requiredTerms)) {
      addIssue(
        "missing_biomarker_boundary",
        "review",
        "Mention that biomarker or target-engagement evidence does not establish durable functional or clinical benefit.",
        [],
        requiredTerms.slice(0, 5)
      );
    }
  }

  if (guardrail.overclaim_risks.some((risk) => risk.value === "safety_or_durability_overclaim")) {
    const requiredTerms = ["safety", "durability", "durable", "long-term", "long-lasting", "risk", "adverse", "tolerability"];
    if (!hasClaimAuditTerm(text, requiredTerms)) {
      addIssue(
        "missing_safety_or_durability_boundary",
        "review",
        "Keep safety or durability uncertainty visible when summarizing this track.",
        [],
        requiredTerms.slice(0, 5)
      );
    }
  }

  return issues.map((issue) => {
    const fingerprint = createClaimConsistencyFingerprint({
      trackId: context.track_id,
      issueType: issue.issue_type,
      sourceKind: context.source_kind,
      sourceRecordPath: context.record_path,
      fieldPath: context.field_path,
      boundaryClass: guardrail.boundary_class,
      text: context.text
    });

    return {
      id: fingerprint,
      fingerprint,
      track_id: context.track_id,
      track_name: context.track_name,
      track_href: `/tracks/${context.track_id}`,
      issue_type: issue.issue_type,
      issue_type_label: claimConsistencyIssueTypeLabels[issue.issue_type],
      severity: issue.severity,
      severity_label: claimConsistencySeverityLabels[issue.severity],
      source_kind: context.source_kind,
      source_kind_label: context.source_kind_label,
      source_label: context.source_label,
      field_path: context.field_path,
      text_excerpt: context.text.length > 520 ? `${context.text.slice(0, 517)}...` : context.text,
      matched_terms: issue.matched_terms,
      missing_terms: issue.missing_terms,
      recommendation: issue.recommendation,
      guardrail: {
        boundary_class: guardrail.boundary_class,
        boundary_class_label: guardrail.boundary_class_label,
        guardrail_summary: guardrail.guardrail_summary,
        required_caveats: guardrail.required_caveats.slice(0, 4),
        unsupported_claims: guardrail.unsupported_claims.slice(0, 3),
        overclaim_risks: guardrail.overclaim_risks.map((risk) => ({
          value: risk.value,
          label: risk.label
        }))
      },
      paths: {
        source_page_path: context.href,
        source_record_path: context.record_path,
        track_page_path: `/tracks/${context.track_id}`,
        claim_guardrails_path: guardrail.paths.claim_guardrails_path,
        evidence_page_path: guardrail.paths.evidence_page_path
      }
    };
  });
}

function getClaimConsistencyIssueTypeCounts(rows: Array<{ issue_type: ClaimConsistencyIssueType }>) {
  return claimConsistencyIssueTypes
    .map((issueType) => ({
      value: issueType,
      label: claimConsistencyIssueTypeLabels[issueType],
      count: rows.filter((row) => row.issue_type === issueType).length
    }))
    .filter((item) => item.count > 0);
}

function getClaimConsistencySeverityCounts(rows: Array<{ severity: ClaimConsistencySeverity }>) {
  return claimConsistencySeverities
    .map((severity) => ({
      value: severity,
      label: claimConsistencySeverityLabels[severity],
      count: rows.filter((row) => row.severity === severity).length
    }))
    .filter((item) => item.count > 0);
}

function getClaimConsistencySourceKindCounts(rows: Array<{ source_kind: ClaimConsistencySourceKind }>) {
  return claimConsistencySourceKinds
    .map((sourceKind) => ({
      value: sourceKind,
      label: claimConsistencySourceKindLabels[sourceKind],
      count: rows.filter((row) => row.source_kind === sourceKind).length
    }))
    .filter((item) => item.count > 0);
}

function isClaimConsistencyUnresolvedStatus(status: ClaimConsistencyReviewStatus) {
  return !["fixed", "false_positive"].includes(status);
}

function getClaimConsistencyReviewStatusCounts(
  rows: Array<{ resolution: { review_status: ClaimConsistencyReviewStatus } }>
) {
  return claimConsistencyReviewStatuses
    .map((status) => ({
      value: status,
      label: claimConsistencyReviewStatusLabels[status],
      count: rows.filter((row) => row.resolution.review_status === status).length
    }))
    .filter((item) => item.count > 0);
}

function getClaimConsistencyLifecycleStateCounts(
  rows: Array<{ resolution: { lifecycle_state: ClaimConsistencyLifecycleState } }>,
  resolvedIssueCount = 0
) {
  return claimConsistencyLifecycleStates
    .map((state) => ({
      value: state,
      label: claimConsistencyLifecycleStateLabels[state],
      count:
        state === "resolved"
          ? resolvedIssueCount
          : rows.filter((row) => row.resolution.lifecycle_state === state).length
    }))
    .filter((item) => item.count > 0);
}

function enrichClaimConsistencyRowsWithResolution<
  T extends {
    fingerprint: string;
    track_id: string;
    issue_type: ClaimConsistencyIssueType;
    paths: {
      source_record_path: string;
    };
    field_path: string;
  }
>(rows: T[], ledger: ClaimConsistencyResolutionLedger) {
  const resolutionByFingerprint = new Map(ledger.resolutions.map((entry) => [entry.fingerprint, entry]));

  return rows.map((row) => {
    const entry = resolutionByFingerprint.get(row.fingerprint);
    const reviewStatus = entry?.review_status ?? ledger.policy.default_status;
    const lifecycleState: ClaimConsistencyLifecycleState = entry ? "recurring" : "new";

    return {
      ...row,
      resolution: {
        fingerprint: row.fingerprint,
        review_status: reviewStatus,
        review_status_label: claimConsistencyReviewStatusLabels[reviewStatus],
        lifecycle_state: lifecycleState,
        lifecycle_state_label: claimConsistencyLifecycleStateLabels[lifecycleState],
        unresolved: isClaimConsistencyUnresolvedStatus(reviewStatus),
        ledger_entry_present: Boolean(entry),
        reviewed_at: entry?.reviewed_at,
        reviewer_role: entry?.reviewer_role,
        note: entry?.note,
        action_required: entry?.action_required,
        last_seen_at: entry?.last_seen_at,
        resolution_path: toWorkspaceRelativePath(claimConsistencyResolutionsPath)
      }
    };
  });
}

function getResolvedClaimConsistencyRecords({
  ledger,
  currentFingerprints,
  filters
}: {
  ledger: ClaimConsistencyResolutionLedger;
  currentFingerprints: Set<string>;
  filters: ReturnType<typeof cleanClaimConsistencyAuditFilters>;
}) {
  return ledger.resolutions
    .filter((entry) => !currentFingerprints.has(entry.fingerprint))
    .filter((entry) => {
      const appliesTo = entry.applies_to;
      return (
        (!filters.track || appliesTo?.track_id === filters.track) &&
        (!filters.issue_type || appliesTo?.issue_type === filters.issue_type) &&
        (!filters.review_status || entry.review_status === filters.review_status) &&
        (!filters.lifecycle_state || filters.lifecycle_state === "resolved")
      );
    })
    .map((entry) => ({
      fingerprint: entry.fingerprint,
      review_status: entry.review_status,
      review_status_label: claimConsistencyReviewStatusLabels[entry.review_status],
      lifecycle_state: "resolved" as const,
      lifecycle_state_label: claimConsistencyLifecycleStateLabels.resolved,
      reviewed_at: entry.reviewed_at,
      reviewer_role: entry.reviewer_role,
      note: entry.note,
      action_required: entry.action_required,
      last_seen_at: entry.last_seen_at,
      applies_to: entry.applies_to,
      resolution_path: toWorkspaceRelativePath(claimConsistencyResolutionsPath)
    }));
}

function cleanClaimConsistencyAuditFilters(filters: ClaimConsistencyAuditFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(500, filters.limit)) : undefined;

  return {
    q: filters.q?.trim() ?? "",
    track: filters.track ?? "",
    issue_type: filters.issue_type ?? "",
    severity: filters.severity ?? "",
    source_kind: filters.source_kind ?? "",
    review_status: filters.review_status ?? "",
    lifecycle_state: filters.lifecycle_state ?? "",
    limit
  };
}

function getClaimConsistencyAuditQueryPath(path: string, filters: ClaimConsistencyAuditFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanClaimConsistencyAuditFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value) {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getAppliedClaimConsistencyAuditFilters(filters: ReturnType<typeof cleanClaimConsistencyAuditFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, String(value)])
  );
}

function applyClaimConsistencyAuditFilters<
  T extends {
    track_id: string;
    track_name: string;
    issue_type: ClaimConsistencyIssueType;
    issue_type_label: string;
    severity: ClaimConsistencySeverity;
    severity_label: string;
    source_kind: ClaimConsistencySourceKind;
    source_kind_label: string;
    source_label: string;
    field_path: string;
    text_excerpt: string;
    recommendation: string;
    resolution: {
      fingerprint: string;
      review_status: ClaimConsistencyReviewStatus;
      review_status_label: string;
      lifecycle_state: ClaimConsistencyLifecycleState;
      lifecycle_state_label: string;
      note?: string;
      action_required?: string;
    };
  }
>(rows: T[], filters: ClaimConsistencyAuditFilters) {
  const selected = cleanClaimConsistencyAuditFilters(filters);
  const query = selected.q.toLocaleLowerCase();

  return rows.filter((row) => {
    const searchableText = [
      row.track_id,
      row.track_name,
      row.issue_type,
      row.issue_type_label,
      row.severity,
      row.severity_label,
      row.source_kind,
      row.source_kind_label,
      row.source_label,
      row.field_path,
      row.text_excerpt,
      row.recommendation,
      row.resolution.fingerprint,
      row.resolution.review_status,
      row.resolution.review_status_label,
      row.resolution.lifecycle_state,
      row.resolution.lifecycle_state_label,
      row.resolution.note,
      row.resolution.action_required
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLocaleLowerCase();

    return (
      (!query || searchableText.includes(query)) &&
      (!selected.track || row.track_id === selected.track) &&
      (!selected.issue_type || row.issue_type === selected.issue_type) &&
      (!selected.severity || row.severity === selected.severity) &&
      (!selected.source_kind || row.source_kind === selected.source_kind) &&
      (!selected.review_status || row.resolution.review_status === selected.review_status) &&
      (!selected.lifecycle_state || row.resolution.lifecycle_state === selected.lifecycle_state)
    );
  });
}

export async function getClaimConsistencyAuditExport(filters: ClaimConsistencyAuditFilters = {}) {
  noStore();
  const selected = cleanClaimConsistencyAuditFilters(filters);
  const [guardrails, evidenceMap, currentLevStory, stateOfFieldEditions, resolutionLedger] = await Promise.all([
    getClaimGuardrailsExport(),
    getEvidenceMapExport(),
    loadCurrentLevStory(),
    loadStateOfFieldEditions(),
    loadClaimConsistencyResolutionLedger()
  ]);
  const guardrailByTrackId = new Map(guardrails.tracks.map((track) => [track.id, track]));
  const contexts = collectClaimConsistencyContexts({
    guardrails,
    evidenceMap,
    currentLevStory,
    stateOfFieldEditions
  });
  const allRows = contexts.flatMap((context) => {
    const guardrail = guardrailByTrackId.get(context.track_id);
    return guardrail ? getClaimConsistencyIssueRows({ context, guardrail }) : [];
  });
  const enrichedRows = enrichClaimConsistencyRowsWithResolution(allRows, resolutionLedger);
  const severityRank = new Map<ClaimConsistencySeverity, number>([
    ["critical", 0],
    ["warning", 1],
    ["review", 2]
  ]);
  const reviewStatusRank = new Map<ClaimConsistencyReviewStatus, number>([
    ["open", 0],
    ["accepted", 1],
    ["deferred", 2],
    ["fixed", 3],
    ["false_positive", 4]
  ]);
  const sortedRows = enrichedRows.sort(
    (left, right) =>
      (reviewStatusRank.get(left.resolution.review_status) ?? 99) -
        (reviewStatusRank.get(right.resolution.review_status) ?? 99) ||
      (severityRank.get(left.severity) ?? 99) - (severityRank.get(right.severity) ?? 99) ||
      left.track_name.localeCompare(right.track_name) ||
      left.source_kind.localeCompare(right.source_kind)
  );
  const filteredRows = applyClaimConsistencyAuditFilters(sortedRows, selected);
  const exportedRows = selected.limit ? filteredRows.slice(0, selected.limit) : filteredRows;
  const affectedTrackIds = new Set(filteredRows.map((row) => row.track_id));
  const currentFingerprints = new Set(enrichedRows.map((row) => row.fingerprint));
  const resolvedIssueRecords = getResolvedClaimConsistencyRecords({
    ledger: resolutionLedger,
    currentFingerprints,
    filters: selected
  });
  const unresolvedRows = filteredRows.filter((row) => row.resolution.unresolved);

  return {
    schema_version: "1.0.0",
    schema_url: "/data/claim-consistency-audit.schema.json",
    export_type: "lev_tracker_claim_consistency_audit",
    generated_at: new Date().toISOString(),
    last_public_update: evidenceMap.last_public_update,
    canonical_path: getClaimConsistencyAuditQueryPath("/data/claim-consistency-audit.json", selected),
    page_path: getClaimConsistencyAuditQueryPath("/claims/audit", selected),
    applied_filters: getAppliedClaimConsistencyAuditFilters(selected),
    methodology: {
      classification_basis:
        "Issue rows are derived by comparing track-linked public copy against the claim guardrail export for that track. Checks look for missing boundary cues and obvious forbidden inference language.",
      not_fact_checking:
        "This is an editorial triage layer, not a source-level fact check, medical review, or formal natural-language entailment model.",
      primary_uses: [
        "Find public summaries that may need registry, conflict, biomarker, preclinical, coverage, safety, or durability caveats.",
        "Give editors a track-by-track QA queue before publishing new summaries.",
        "Give language-model workflows negative examples and boundary checks before final prose generation."
      ]
    },
    caveats: [
      "A flagged row is a review prompt, not proof that the public copy is wrong.",
      "Short copy can be acceptable when a nearby page section supplies the caveat; editors should inspect the source page and record path.",
      "The audit intentionally favors conservative recall over precision for expert and AI-safety review.",
      "Resolution statuses are curator workflow metadata from the ledger file; they do not change source-level evidence strength."
    ],
    summary: {
      scanned_context_count: contexts.length,
      total_issue_count: sortedRows.length,
      filtered_issue_count: filteredRows.length,
      returned_issue_count: exportedRows.length,
      affected_track_count: affectedTrackIds.size,
      critical_issue_count: filteredRows.filter((row) => row.severity === "critical").length,
      warning_issue_count: filteredRows.filter((row) => row.severity === "warning").length,
      review_issue_count: filteredRows.filter((row) => row.severity === "review").length,
      unresolved_issue_count: unresolvedRows.length,
      new_issue_count: filteredRows.filter((row) => row.resolution.lifecycle_state === "new").length,
      recurring_issue_count: filteredRows.filter((row) => row.resolution.lifecycle_state === "recurring").length,
      resolved_issue_count: resolvedIssueRecords.length,
      open_issue_count: filteredRows.filter((row) => row.resolution.review_status === "open").length,
      accepted_issue_count: filteredRows.filter((row) => row.resolution.review_status === "accepted").length,
      deferred_issue_count: filteredRows.filter((row) => row.resolution.review_status === "deferred").length,
      fixed_issue_count: filteredRows.filter((row) => row.resolution.review_status === "fixed").length,
      false_positive_issue_count: filteredRows.filter((row) => row.resolution.review_status === "false_positive").length,
      resolution_entry_count: resolutionLedger.resolutions.length,
      issue_type_counts: getClaimConsistencyIssueTypeCounts(filteredRows),
      severity_counts: getClaimConsistencySeverityCounts(filteredRows),
      source_kind_counts: getClaimConsistencySourceKindCounts(filteredRows),
      review_status_counts: getClaimConsistencyReviewStatusCounts(filteredRows),
      lifecycle_state_counts: getClaimConsistencyLifecycleStateCounts(filteredRows, resolvedIssueRecords.length)
    },
    facet_options: {
      tracks: guardrails.facet_options.tracks,
      issue_types: claimConsistencyIssueTypes.map((issueType) => ({
        value: issueType,
        label: claimConsistencyIssueTypeLabels[issueType]
      })),
      severities: claimConsistencySeverities.map((severity) => ({
        value: severity,
        label: claimConsistencySeverityLabels[severity]
      })),
      source_kinds: claimConsistencySourceKinds.map((sourceKind) => ({
        value: sourceKind,
        label: claimConsistencySourceKindLabels[sourceKind]
      })),
      review_statuses: claimConsistencyReviewStatuses.map((status) => ({
        value: status,
        label: claimConsistencyReviewStatusLabels[status]
      })),
      lifecycle_states: claimConsistencyLifecycleStates.map((state) => ({
        value: state,
        label: claimConsistencyLifecycleStateLabels[state]
      }))
    },
    source_file_patterns: {
      public_records: [
        "taxonomies/track-taxonomy.v1.json",
        "data/outlooks/*.json",
        "data/content/current-lev-story/current.json",
        "data/content/state-of-the-field/*.json"
      ],
      resolution_state: [toWorkspaceRelativePath(claimConsistencyResolutionsPath)],
      derived_from: ["/data/claim-guardrails.json", "/data/evidence-map.json"]
    },
    resolution_policy: {
      path: toWorkspaceRelativePath(claimConsistencyResolutionsPath),
      updated_at: resolutionLedger.updated_at,
      default_status: resolutionLedger.policy.default_status,
      fingerprint_basis: resolutionLedger.policy.fingerprint_basis,
      status_definitions: resolutionLedger.policy.status_definitions
    },
    resolved_issues: resolvedIssueRecords,
    issues: exportedRows
  };
}

type ClaimConsistencyAuditIssueRow = Awaited<ReturnType<typeof getClaimConsistencyAuditExport>>["issues"][number];

function getClaimConsistencyReviewPacketQueryPath(path: string, filters: ClaimConsistencyReviewPacketFilters) {
  return getClaimConsistencyAuditQueryPath(path, filters);
}

function getClaimConsistencyReviewGroupId(groupKey: string) {
  return `ccrp_${createHash("sha256").update(groupKey).digest("hex").slice(0, 16)}`;
}

function getClaimConsistencyReviewGroupPriority(rows: ClaimConsistencyAuditIssueRow[]) {
  const severityWeight = rows.some((row) => row.severity === "critical")
    ? 1000
    : rows.some((row) => row.severity === "warning")
      ? 500
      : 100;
  const unresolvedWeight = rows.filter((row) => row.resolution.unresolved).length * 4;
  const repeatWeight = Math.min(250, rows.length * 10);
  const recurringWeight = rows.filter((row) => row.resolution.lifecycle_state === "recurring").length * 8;

  return severityWeight + unresolvedWeight + repeatWeight + recurringWeight;
}

function getClaimConsistencyReviewGroupPriorityReasons(rows: ClaimConsistencyAuditIssueRow[]) {
  const reasons = [];
  const severityLabels = Array.from(new Set(rows.map((row) => row.severity_label)));
  const unresolvedCount = rows.filter((row) => row.resolution.unresolved).length;
  const recurringCount = rows.filter((row) => row.resolution.lifecycle_state === "recurring").length;

  if (severityLabels.length) {
    reasons.push(`${severityLabels.join(" / ")} severity`);
  }

  if (unresolvedCount) {
    reasons.push(`${unresolvedCount} unresolved issue${unresolvedCount === 1 ? "" : "s"}`);
  }

  if (rows.length > 1) {
    reasons.push(`${rows.length} repeated rows`);
  }

  if (recurringCount) {
    reasons.push(`${recurringCount} recurring row${recurringCount === 1 ? "" : "s"}`);
  }

  return reasons;
}

function getClaimConsistencyReviewPacketGroups(
  rows: ClaimConsistencyAuditIssueRow[],
  generatedAt: string
) {
  const groupedRows = new Map<string, ClaimConsistencyAuditIssueRow[]>();

  for (const row of rows) {
    const groupKey = [
      row.track_id,
      row.issue_type,
      row.source_kind,
      row.paths.source_record_path
    ].join("\u001f");
    groupedRows.set(groupKey, [...(groupedRows.get(groupKey) ?? []), row]);
  }

  return Array.from(groupedRows.entries()).map(([groupKey, groupRows]) => {
    const sortedRows = [...groupRows].sort(
      (left, right) =>
        left.field_path.localeCompare(right.field_path) ||
        left.fingerprint.localeCompare(right.fingerprint)
    );
    const first = sortedRows[0];
    const fieldPaths = Array.from(new Set(sortedRows.map((row) => row.field_path))).sort();
    const fingerprints = sortedRows.map((row) => row.fingerprint);
    const unresolvedRows = sortedRows.filter((row) => row.resolution.unresolved);
    const matchedTerms = Array.from(new Set(sortedRows.flatMap((row) => row.matched_terms))).sort();
    const missingTerms = Array.from(new Set(sortedRows.flatMap((row) => row.missing_terms))).sort();
    const sourcePagePaths = Array.from(new Set(sortedRows.map((row) => row.paths.source_page_path))).sort();
    const severityRank = new Map<ClaimConsistencySeverity, number>([
      ["critical", 0],
      ["warning", 1],
      ["review", 2]
    ]);
    const highestSeverityRow = sortedRows.reduce((highest, row) =>
      (severityRank.get(row.severity) ?? 99) < (severityRank.get(highest.severity) ?? 99) ? row : highest
    );
    const priorityScore = getClaimConsistencyReviewGroupPriority(sortedRows);

    return {
      id: getClaimConsistencyReviewGroupId(groupKey),
      group_key: {
        track_id: first.track_id,
        issue_type: first.issue_type,
        source_kind: first.source_kind,
        source_record_path: first.paths.source_record_path
      },
      track_id: first.track_id,
      track_name: first.track_name,
      track_href: first.track_href,
      issue_type: first.issue_type,
      issue_type_label: first.issue_type_label,
      source_kind: first.source_kind,
      source_kind_label: first.source_kind_label,
      source_record_path: first.paths.source_record_path,
      highest_severity: highestSeverityRow.severity,
      highest_severity_label: highestSeverityRow.severity_label,
      review_statuses: claimConsistencyReviewStatuses
        .map((status) => ({
          value: status,
          label: claimConsistencyReviewStatusLabels[status],
          count: sortedRows.filter((row) => row.resolution.review_status === status).length
        }))
        .filter((item) => item.count > 0),
      lifecycle_states: claimConsistencyLifecycleStates
        .map((state) => ({
          value: state,
          label: claimConsistencyLifecycleStateLabels[state],
          count: sortedRows.filter((row) => row.resolution.lifecycle_state === state).length
        }))
        .filter((item) => item.count > 0),
      issue_count: sortedRows.length,
      unresolved_issue_count: unresolvedRows.length,
      affected_field_count: fieldPaths.length,
      priority_score: priorityScore,
      priority_reasons: getClaimConsistencyReviewGroupPriorityReasons(sortedRows),
      recommendation: first.recommendation,
      matched_terms: matchedTerms,
      missing_terms: missingTerms,
      field_paths: fieldPaths,
      fingerprints,
      guardrail: {
        boundary_class: first.guardrail.boundary_class,
        boundary_class_label: first.guardrail.boundary_class_label,
        guardrail_summary: first.guardrail.guardrail_summary,
        required_caveats: first.guardrail.required_caveats,
        unsupported_claims: first.guardrail.unsupported_claims,
        overclaim_risks: first.guardrail.overclaim_risks
      },
      representative_excerpts: sortedRows.slice(0, 3).map((row) => ({
        fingerprint: row.fingerprint,
        field_path: row.field_path,
        source_label: row.source_label,
        source_page_path: row.paths.source_page_path,
        text_excerpt: row.text_excerpt,
        severity: row.severity,
        severity_label: row.severity_label,
        review_status: row.resolution.review_status,
        review_status_label: row.resolution.review_status_label,
        lifecycle_state: row.resolution.lifecycle_state,
        lifecycle_state_label: row.resolution.lifecycle_state_label
      })),
      trace_paths: {
        source_page_paths: sourcePagePaths,
        source_record_path: first.paths.source_record_path,
        track_page_path: first.paths.track_page_path,
        claim_guardrails_path: first.paths.claim_guardrails_path,
        evidence_page_path: first.paths.evidence_page_path,
        resolution_path: first.resolution.resolution_path
      },
      suggested_resolution_entries: sortedRows.map((row) => ({
        fingerprint: row.fingerprint,
        review_status: "accepted" as const,
        reviewed_at: generatedAt,
        reviewer_role: "human_curator",
        note: `Grouped review packet ${getClaimConsistencyReviewGroupId(groupKey)}; replace status or note if this row is fixed, deferred, or a false positive.`,
        action_required: row.recommendation,
        last_seen_at: generatedAt,
        applies_to: {
          track_id: row.track_id,
          issue_type: row.issue_type,
          source_record_path: row.paths.source_record_path,
          field_path: row.field_path
        }
      }))
    };
  });
}

function getClaimConsistencyReviewGroupCounts(rows: Array<{ issue_type: ClaimConsistencyIssueType }>) {
  return claimConsistencyIssueTypes
    .map((issueType) => ({
      value: issueType,
      label: claimConsistencyIssueTypeLabels[issueType],
      count: rows.filter((row) => row.issue_type === issueType).length
    }))
    .filter((item) => item.count > 0);
}

export async function getClaimConsistencyReviewPacketExport(filters: ClaimConsistencyReviewPacketFilters = {}) {
  noStore();
  const selected = cleanClaimConsistencyAuditFilters(filters);
  const auditFilters = { ...selected, limit: undefined };
  const audit = await getClaimConsistencyAuditExport(auditFilters);
  const generatedAt = new Date().toISOString();
  const rowsForGrouping =
    selected.review_status || selected.lifecycle_state
      ? audit.issues
      : audit.issues.filter((row) => row.resolution.unresolved);
  const allGroups = getClaimConsistencyReviewPacketGroups(rowsForGrouping, generatedAt).sort(
    (left, right) =>
      right.priority_score - left.priority_score ||
      right.issue_count - left.issue_count ||
      left.track_name.localeCompare(right.track_name) ||
      left.issue_type.localeCompare(right.issue_type)
  );
  const exportedGroups = selected.limit ? allGroups.slice(0, selected.limit) : allGroups;
  const affectedTrackIds = new Set(allGroups.map((group) => group.track_id));
  const unresolvedGroupCount = allGroups.filter((group) => group.unresolved_issue_count > 0).length;

  return {
    schema_version: "1.0.0",
    schema_url: "/data/claim-consistency-review-packet.schema.json",
    export_type: "lev_tracker_claim_consistency_review_packet",
    generated_at: generatedAt,
    last_public_update: audit.last_public_update,
    canonical_path: getClaimConsistencyReviewPacketQueryPath("/data/claim-consistency-review-packet.json", selected),
    page_path: getClaimConsistencyAuditQueryPath("/claims/audit", selected),
    applied_filters: getAppliedClaimConsistencyAuditFilters(selected),
    methodology: {
      grouping_basis:
        "Rows are grouped by track_id, issue_type, source_kind, and source_record_path so reviewers can make one decision for repeated public-copy findings from the same source record.",
      priority_basis:
        "Priority score favors critical and warning severities, unresolved rows, recurring rows, and repeated issue count.",
      primary_uses: [
        "Review a smaller set of editorial decisions before editing public copy.",
        "Prepare ledger entries for recurring accepted issues, deferrals, fixes, or false-positive decisions.",
        "Give language-model workflows group-level negative examples instead of thousands of near-duplicate rows."
      ]
    },
    caveats: [
      "A review group is a triage unit, not proof that every included row needs the same final disposition.",
      "Suggested ledger entries default to accepted and should be edited by a reviewer when a row is fixed, deferred, or a false positive.",
      "Filtering by review_status or lifecycle_state changes which rows are eligible for grouping."
    ],
    summary: {
      source_issue_count: audit.summary.filtered_issue_count,
      reviewable_issue_count: rowsForGrouping.length,
      total_group_count: allGroups.length,
      returned_group_count: exportedGroups.length,
      unresolved_group_count: unresolvedGroupCount,
      affected_track_count: affectedTrackIds.size,
      critical_group_count: allGroups.filter((group) => group.highest_severity === "critical").length,
      warning_group_count: allGroups.filter((group) => group.highest_severity === "warning").length,
      review_group_count: allGroups.filter((group) => group.highest_severity === "review").length,
      suggested_ledger_entry_count: exportedGroups.reduce(
        (total, group) => total + group.suggested_resolution_entries.length,
        0
      ),
      issue_type_group_counts: getClaimConsistencyReviewGroupCounts(allGroups),
      source_kind_group_counts: claimConsistencySourceKinds
        .map((sourceKind) => ({
          value: sourceKind,
          label: claimConsistencySourceKindLabels[sourceKind],
          count: allGroups.filter((group) => group.source_kind === sourceKind).length
        }))
        .filter((item) => item.count > 0)
    },
    facet_options: audit.facet_options,
    source_exports: {
      audit_json: audit.canonical_path,
      audit_schema: audit.schema_url,
      resolution_ledger: audit.resolution_policy.path
    },
    groups: exportedGroups
  };
}

function cleanEvidenceGapFilters(filters: EvidenceGapFilters = {}) {
  const limit = filters.limit && Number.isFinite(filters.limit) ? Math.max(1, Math.min(200, filters.limit)) : undefined;

  return {
    q: filters.q?.trim() ?? "",
    hallmark: filters.hallmark ?? "",
    track: filters.track ?? "",
    stage: filters.stage ?? "",
    coverage_confidence: filters.coverage_confidence ?? "",
    research_density: filters.research_density ?? "",
    severity: filters.severity ?? "",
    sort: filters.sort || "severity",
    limit
  };
}

function getEvidenceGapQueryPath(path: string, filters: EvidenceGapFilters) {
  const params = new URLSearchParams();
  const cleaned = cleanEvidenceGapFilters(filters);

  for (const [key, value] of Object.entries(cleaned)) {
    if (!value || key === "sort" && value === "severity") {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getAppliedEvidenceGapFilters(filters: ReturnType<typeof cleanEvidenceGapFilters>) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([key, value]) => Boolean(value) && !(key === "sort" && value === "severity"))
      .map(([key, value]) => [key, String(value)])
  );
}

function hasUsableGapMap(track: {
  coverage: {
    coverage_verdict?: CoverageVerdict;
    coverage_confidence?: CoverageConfidence;
  } | null;
}) {
  return (
    Boolean(track.coverage) &&
    (track.coverage?.coverage_verdict === "adequate" || track.coverage?.coverage_verdict === "strong") &&
    track.coverage?.coverage_confidence !== "low"
  );
}

function isActiveOrDenseGapDensity(density?: string) {
  return density === "active" || density === "dense";
}

function isSparseOrEmergingGapDensity(density?: string) {
  return density === "sparse" || density === "emerging";
}

function getGapTextMatchesHumanEndpoint(text: string) {
  return /\b(clinical outcome|clinical outcomes|older adult|older adults|patient|patients|functional|function|frailty|disability|morbidity|mortality|disease|healthspan|lifespan|physical function|cognitive|cardiovascular|age-related disease|age-related diseases)\b/i.test(
    text
  );
}

function getOutlookRecordPath(outlookId?: string) {
  return outlookId ? `data/outlooks/${outlookId}.json` : undefined;
}

function getCoverageAssessmentPath(coverageAssessmentId?: string) {
  return coverageAssessmentId ? `research/coverage-assessments/${coverageAssessmentId}.json` : undefined;
}

function getFindingRecordPath(findingId: string) {
  return `data/findings/${findingId}.json`;
}

function getSourceRecordPath(sourceId: string) {
  return `data/sources/${sourceId}.json`;
}

function getEvidenceGapSourceRefs(
  sourceIds: string[],
  sourceById: Map<
    string,
    {
      id: string;
      name: string;
      short_name?: string;
      source_type: string;
      year?: number;
      published_on?: string;
    }
  >
) {
  return uniqueSorted(sourceIds)
    .map((sourceId) => {
      const source = sourceById.get(sourceId);

      return {
        id: sourceId,
        name: source?.name ?? titleizeIdentifier(sourceId),
        short_name: source?.short_name,
        href: getSourcePagePath(sourceId),
        json_path: getSourceJsonPath(sourceId),
        record_path: getSourceRecordPath(sourceId),
        source_type: source?.source_type,
        year: source?.year,
        published_on: source?.published_on
      };
    })
    .sort((left, right) => (left.short_name ?? left.name).localeCompare(right.short_name ?? right.name));
}

function getEvidenceGapFindingRefs(
  findingIds: string[],
  findingById: Map<
    string,
    {
      id: string;
      name: string;
      source_id: string;
    }
  >
) {
  return uniqueSorted(findingIds)
    .map((findingId) => {
      const finding = findingById.get(findingId);

      return {
        id: findingId,
        name: finding?.name ?? titleizeIdentifier(findingId),
        href: `/findings/${findingId}`,
        record_path: getFindingRecordPath(findingId),
        source_id: finding?.source_id,
        source_json_path: finding?.source_id ? getSourceJsonPath(finding.source_id) : undefined
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getEvidenceGapItemProvenance({
  recordType,
  recordId,
  recordPath,
  outlookField,
  itemIndex,
  coverageFields,
  coverageAssessmentId,
  trialIds,
  supportingEvidenceScope
}: {
  recordType: "outlook" | "coverage_status" | "trial_watch";
  recordId?: string;
  recordPath?: string;
  outlookField?: string;
  itemIndex?: number;
  coverageFields?: string[];
  coverageAssessmentId?: string;
  trialIds?: string[];
  supportingEvidenceScope?: "field_specific" | "track_outlook";
}) {
  return {
    record_type: recordType,
    record_id: recordId,
    record_path: recordPath,
    outlook_field: outlookField,
    item_index: itemIndex,
    coverage_fields: coverageFields,
    coverage_assessment_id: coverageAssessmentId,
    coverage_assessment_path: getCoverageAssessmentPath(coverageAssessmentId),
    trial_ids: trialIds,
    supporting_evidence_scope: supportingEvidenceScope
  };
}

function getEvidenceGapSearchText(row: {
  id: string;
  name: string;
  summary: string;
  primary_hallmark_name: string;
  stage_label?: string;
  read_firmness_label?: string;
  coverage_confidence_label?: string;
  observed_research_density_label?: string;
  gap_items: Array<{ text: string; category_label: string; severity_label: string }>;
}) {
  return [
    row.id,
    row.name,
    row.summary,
    row.primary_hallmark_name,
    row.stage_label,
    row.read_firmness_label,
    row.coverage_confidence_label,
    row.observed_research_density_label,
    ...row.gap_items.flatMap((item) => [item.text, item.category_label, item.severity_label])
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
}

function applyEvidenceGapFilters<
  T extends {
    searchable_text: string;
    primary_hallmark_id: string;
    secondary_hallmark_ids: string[];
    id: string;
    stage?: Stage;
    coverage_confidence?: CoverageConfidence;
    observed_research_density?: ObservedResearchDensity;
    severity_tags: EvidenceGapSeverity[];
  }
>(rows: T[], filters: EvidenceGapFilters) {
  const selected = cleanEvidenceGapFilters(filters);
  const queryNeedle = selected.q.toLocaleLowerCase();

  return rows.filter((row) => {
    const hallmarkIds = [row.primary_hallmark_id, ...row.secondary_hallmark_ids];
    const matchesDensity =
      !selected.research_density ||
      row.observed_research_density === selected.research_density ||
      (selected.research_density === "active_or_dense" && isActiveOrDenseGapDensity(row.observed_research_density)) ||
      (selected.research_density === "sparse_or_emerging" &&
        isSparseOrEmergingGapDensity(row.observed_research_density));

    return (
      (!queryNeedle || row.searchable_text.includes(queryNeedle)) &&
      (!selected.hallmark || hallmarkIds.includes(selected.hallmark)) &&
      (!selected.track || row.id === selected.track) &&
      (!selected.stage || row.stage === selected.stage) &&
      (!selected.coverage_confidence || row.coverage_confidence === selected.coverage_confidence) &&
      matchesDensity &&
      (!selected.severity || row.severity_tags.includes(selected.severity))
    );
  });
}

const gapSeverityRank: Record<EvidenceGapSeverity, number> = {
  high_priority: 5,
  trial_sensitive: 4,
  human_endpoint: 3,
  map_work_needed: 2,
  sparse_checked: 1
};

function getMaxGapSeverityRank(tags: EvidenceGapSeverity[]) {
  return tags.reduce((rank, tag) => Math.max(rank, gapSeverityRank[tag] ?? 0), 0);
}

function sortEvidenceGapRows<
  T extends {
    name: string;
    stage?: Stage;
    observed_research_density?: ObservedResearchDensity;
    high_priority_gap_count: number;
    severity_tags: EvidenceGapSeverity[];
  }
>(rows: T[], sort: EvidenceGapSort) {
  return [...rows].sort((left, right) => {
    if (sort === "high_priority") {
      const highPriorityOrder = right.high_priority_gap_count - left.high_priority_gap_count;
      if (highPriorityOrder !== 0) {
        return highPriorityOrder;
      }
    }

    if (sort === "density") {
      const densityOrder = (right.observed_research_density ?? "").localeCompare(left.observed_research_density ?? "");
      if (densityOrder !== 0) {
        return densityOrder;
      }
    }

    if (sort === "stage") {
      const stageOrder = (right.stage ?? "").localeCompare(left.stage ?? "");
      if (stageOrder !== 0) {
        return stageOrder;
      }
    }

    if (sort === "track") {
      return left.name.localeCompare(right.name);
    }

    const severityOrder = getMaxGapSeverityRank(right.severity_tags) - getMaxGapSeverityRank(left.severity_tags);
    if (severityOrder !== 0) {
      return severityOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function getEvidenceGapsExport(filters: EvidenceGapFilters = {}) {
  noStore();
  const selected = cleanEvidenceGapFilters(filters);
  const evidenceMap = await getEvidenceMapExport();
  const trialsByTrackId = new Map<string, typeof evidenceMap.trials>();
  const sourceById = new Map(evidenceMap.sources.map((source) => [source.id, source]));
  const findingById = new Map(evidenceMap.findings.map((finding) => [finding.id, finding]));

  for (const trial of evidenceMap.trials) {
    for (const trackId of trial.track_ids) {
      trialsByTrackId.set(trackId, [...(trialsByTrackId.get(trackId) ?? []), trial]);
    }
  }

  const allRows = evidenceMap.tracks.map((track) => {
    const trackTrials = trialsByTrackId.get(track.id) ?? [];
    const supportingFindingIds = uniqueSorted([
      ...(track.outlook?.supporting_finding_ids ?? []),
      ...track.supporting_evidence.flatMap((item) => item.finding_ids)
    ]);
    const supportingSourceIds = uniqueSorted([
      ...(track.outlook?.supporting_source_ids ?? []),
      ...track.supporting_evidence.flatMap((item) => item.source_ids),
      ...supportingFindingIds.map((findingId) => findingById.get(findingId)?.source_id)
    ]);
    const sourceRefs = getEvidenceGapSourceRefs(
      supportingSourceIds.length ? supportingSourceIds : track.source_ids,
      sourceById
    );
    const findingRefs = getEvidenceGapFindingRefs(supportingFindingIds, findingById);
    const supportingEvidenceRefs = track.supporting_evidence.map((item, index) => ({
      id: `${track.id}-supporting-evidence-${index + 1}`,
      label: item.label,
      outlook_field: item.outlook_field,
      support_role: item.support_role,
      conclusion: item.conclusion,
      rationale: item.rationale,
      finding_ids: item.finding_ids,
      source_ids: item.source_ids,
      source_json_paths: item.source_ids.map(getSourceJsonPath),
      limitations: item.limitations
    }));
    const gapTexts = [
      ...(track.outlook?.main_evidence_gaps ?? []),
      ...(track.outlook?.what_would_change_the_rating ?? []),
      track.outlook?.interpretation ?? ""
    ].join(" ");
    const usableMap = hasUsableGapMap(track);
    const highPriorityGapCount = track.coverage?.high_priority_gap_count ?? 0;
    const knownGapCount = track.coverage?.known_gap_count ?? 0;
    const trialSensitive =
      track.evidence_counts.active_watch_trial_count > 0 &&
      (track.evidence_counts.posted_result_trial_count === 0 ||
        /\b(trial|result|endpoint|readout|clinical|human)\b/i.test(gapTexts));
    const severityTags = new Set<EvidenceGapSeverity>();

    if (highPriorityGapCount > 0) {
      severityTags.add("high_priority");
    }

    if (getGapTextMatchesHumanEndpoint(gapTexts)) {
      severityTags.add("human_endpoint");
    }

    if (trialSensitive) {
      severityTags.add("trial_sensitive");
    }

    if (usableMap && isSparseOrEmergingGapDensity(track.coverage?.observed_research_density)) {
      severityTags.add("sparse_checked");
    }

    if (!usableMap) {
      severityTags.add("map_work_needed");
    }

    const severityTagList = Array.from(severityTags).sort(
      (left, right) => gapSeverityRank[right] - gapSeverityRank[left] || left.localeCompare(right)
    );
    const outlookRecordPath = getOutlookRecordPath(track.outlook?.outlook_id);
    const coverageAssessmentId = track.coverage?.last_coverage_assessment_id;
    const gapItems = [
      ...(track.outlook?.main_evidence_gaps ?? []).map((text, index) => ({
        id: `${track.id}-main-gap-${index + 1}`,
        category: "main_evidence_gap",
        category_label: "Main evidence gap",
        severity: getGapTextMatchesHumanEndpoint(text) ? "human_endpoint" : highPriorityGapCount > 0 ? "high_priority" : "map_work_needed",
        severity_label: getReadableDataLabel(
          getGapTextMatchesHumanEndpoint(text) ? "human_endpoint" : highPriorityGapCount > 0 ? "high_priority" : "map_work_needed"
        ),
        provenance: getEvidenceGapItemProvenance({
          recordType: "outlook",
          recordId: track.outlook?.outlook_id,
          recordPath: outlookRecordPath,
          outlookField: "main_evidence_gaps",
          itemIndex: index,
          supportingEvidenceScope: track.supporting_evidence.some(
            (item) => item.outlook_field === "main_evidence_gaps"
          )
            ? "field_specific"
            : "track_outlook"
        }),
        text
      })),
      ...(track.outlook?.what_would_change_the_rating ?? []).map((text, index) => ({
        id: `${track.id}-rating-change-${index + 1}`,
        category: "rating_change_criterion",
        category_label: "Rating-change criterion",
        severity: getGapTextMatchesHumanEndpoint(text) ? "human_endpoint" : trialSensitive ? "trial_sensitive" : "high_priority",
        severity_label: getReadableDataLabel(
          getGapTextMatchesHumanEndpoint(text) ? "human_endpoint" : trialSensitive ? "trial_sensitive" : "high_priority"
        ),
        provenance: getEvidenceGapItemProvenance({
          recordType: "outlook",
          recordId: track.outlook?.outlook_id,
          recordPath: outlookRecordPath,
          outlookField: "what_would_change_the_rating",
          itemIndex: index,
          supportingEvidenceScope: "track_outlook"
        }),
        text
      }))
    ];

    if (knownGapCount > 0 || highPriorityGapCount > 0) {
      gapItems.push({
        id: `${track.id}-coverage-gap-summary`,
        category: "coverage_gap_summary",
        category_label: "Coverage gap summary",
        severity: highPriorityGapCount > 0 ? "high_priority" : "map_work_needed",
        severity_label: getReadableDataLabel(highPriorityGapCount > 0 ? "high_priority" : "map_work_needed"),
        provenance: getEvidenceGapItemProvenance({
          recordType: "coverage_status",
          recordId: "coverage-status.v1",
          recordPath: "research/state/coverage-status.v1.json",
          coverageFields: ["known_gap_count", "high_priority_gap_count"],
          coverageAssessmentId
        }),
        text: `${knownGapCount} known coverage gaps; ${highPriorityGapCount} marked high priority.`
      });
    }

    if (trialSensitive) {
      gapItems.push({
        id: `${track.id}-trial-horizon`,
        category: "trial_result_horizon",
        category_label: "Trial result horizon",
        severity: "trial_sensitive",
        severity_label: getReadableDataLabel("trial_sensitive"),
        provenance: getEvidenceGapItemProvenance({
          recordType: "trial_watch",
          recordId: track.id,
          recordPath: `/data/evidence-map.json?track=${encodeURIComponent(track.id)}`,
          trialIds: trackTrials.filter((trial) => trial.watch_status === "active_watch").map((trial) => trial.id)
        }),
        text: `${track.evidence_counts.active_watch_trial_count} active-watch trial records could change interpretation if interpretable results appear.`
      });
    }

    const row = {
      id: track.id,
      name: track.name,
      href: track.href,
      summary: track.summary,
      primary_hallmark_id: track.primary_hallmark_id,
      primary_hallmark_name: track.primary_hallmark_name,
      secondary_hallmark_ids: track.secondary_hallmark_ids,
      stage: track.outlook?.stage,
      stage_label: track.outlook?.stage_label,
      read_firmness: track.outlook?.confidence,
      read_firmness_label: track.outlook?.read_firmness_label,
      interpretation: track.outlook?.interpretation,
      last_updated: track.outlook?.last_updated,
      coverage_verdict: track.coverage?.coverage_verdict,
      coverage_verdict_label: track.coverage?.coverage_verdict_label,
      coverage_confidence: track.coverage?.coverage_confidence,
      coverage_confidence_label: track.coverage?.coverage_confidence_label,
      observed_research_density: track.coverage?.observed_research_density,
      observed_research_density_label: track.coverage?.observed_research_density_label,
      known_gap_count: knownGapCount,
      high_priority_gap_count: highPriorityGapCount,
      usable_map: usableMap,
      severity_tags: severityTagList,
      severity_labels: severityTagList.map(getReadableDataLabel),
      gap_items: gapItems,
      evidence_counts: track.evidence_counts,
      provenance: {
        track_page_path: track.href,
        track_json_path: `/data/tracks/${encodeURIComponent(track.id)}.json`,
        gap_json_path: `/data/evidence-gaps.json?track=${encodeURIComponent(track.id)}`,
        evidence_map_path: `/data/evidence-map.json?track=${encodeURIComponent(track.id)}`,
        outlook_id: track.outlook?.outlook_id,
        outlook_record_path: outlookRecordPath,
        coverage_status_path: "research/state/coverage-status.v1.json",
        coverage_assessment_id: coverageAssessmentId,
        coverage_assessment_path: getCoverageAssessmentPath(coverageAssessmentId),
        supporting_evidence_count: supportingEvidenceRefs.length,
        supporting_finding_count: findingRefs.length,
        supporting_source_count: sourceRefs.length,
        supporting_finding_ids: supportingFindingIds,
        supporting_source_ids: supportingSourceIds,
        source_audit_paths: sourceRefs.map((source) => source.json_path),
        supporting_evidence: supportingEvidenceRefs,
        finding_refs: findingRefs,
        source_refs: sourceRefs,
        trial_ids: trackTrials.map((trial) => trial.id),
        active_watch_trial_ids: trackTrials
          .filter((trial) => trial.watch_status === "active_watch")
          .map((trial) => trial.id)
      },
      trial_horizon: {
        active_watch_trial_count: track.evidence_counts.active_watch_trial_count,
        late_no_results_trial_count: track.evidence_counts.late_no_results_trial_count,
        posted_result_trial_count: track.evidence_counts.posted_result_trial_count,
        trial_ids: trackTrials.map((trial) => trial.id),
        active_watch_trial_ids: trackTrials
          .filter((trial) => trial.watch_status === "active_watch")
          .map((trial) => trial.id)
      }
    };

    return {
      ...row,
      searchable_text: getEvidenceGapSearchText(row)
    };
  });
  const filteredRows = sortEvidenceGapRows(applyEvidenceGapFilters(allRows, selected), selected.sort as EvidenceGapSort);
  const visibleRows = selected.limit ? filteredRows.slice(0, selected.limit) : filteredRows;
  const exportedRows = visibleRows.map(({ searchable_text: _searchableText, ...row }) => row);
  const savedViewDefinitions: Array<{
    id: string;
    label: string;
    summary: string;
    filters: EvidenceGapFilters;
  }> = [
    {
      id: "high-priority-active-fields",
      label: "High-priority gaps in active fields",
      summary: "Tracks with high-priority gaps where observed research density is active or dense.",
      filters: { severity: "high_priority", research_density: "active_or_dense", sort: "high_priority" }
    },
    {
      id: "sparse-adequately-mapped",
      label: "Sparse but adequately mapped",
      summary: "Tracks where low counts are more likely field scarcity than missing map work.",
      filters: { severity: "sparse_checked", sort: "density" }
    },
    {
      id: "trial-sensitive-sparse-fields",
      label: "Trial-sensitive sparse fields",
      summary: "Sparse or emerging tracks where active-watch trials could clarify whether low counts reflect field infancy.",
      filters: { severity: "trial_sensitive", research_density: "sparse_or_emerging" }
    },
    {
      id: "trial-sensitive-tracks",
      label: "Trial-sensitive tracks",
      summary: "Tracks where active-watch trial readouts could change interpretation.",
      filters: { severity: "trial_sensitive" }
    }
  ];
  const savedViews = savedViewDefinitions.map((view) => ({
    ...view,
    path: getEvidenceGapQueryPath("/gaps", view.filters),
    data_path: getEvidenceGapQueryPath("/data/evidence-gaps.json", view.filters),
    count: applyEvidenceGapFilters(allRows, view.filters).length
  }));

  return {
    schema_version: "1.0.0",
    schema_url: "/data/evidence-gaps.schema.json",
    export_type: "lev_tracker_evidence_gaps",
    generated_at: new Date().toISOString(),
    last_public_update: evidenceMap.last_public_update,
    canonical_path: getEvidenceGapQueryPath("/data/evidence-gaps.json", selected),
    page_path: getEvidenceGapQueryPath("/gaps", selected),
    applied_filters: getAppliedEvidenceGapFilters(selected),
    caveats: [
      "This export summarizes tracker gap records and rating-change criteria; it is not a claim that a field is scientifically empty.",
      "Coverage confidence describes tracker map completeness, while observed research density describes how much relevant public work appears to exist.",
      "Trial-sensitive means a tracked trial result could affect interpretation; trial existence alone is not evidence of benefit."
    ],
    summary: {
      total_track_count: allRows.length,
      filtered_track_count: filteredRows.length,
      returned_track_count: exportedRows.length,
      high_priority_gap_track_count: exportedRows.filter((row) => row.severity_tags.includes("high_priority")).length,
      human_endpoint_gap_track_count: exportedRows.filter((row) => row.severity_tags.includes("human_endpoint")).length,
      trial_sensitive_track_count: exportedRows.filter((row) => row.severity_tags.includes("trial_sensitive")).length,
      sparse_checked_track_count: exportedRows.filter((row) => row.severity_tags.includes("sparse_checked")).length,
      map_work_needed_track_count: exportedRows.filter((row) => row.severity_tags.includes("map_work_needed")).length,
      total_known_gap_count: exportedRows.reduce((sum, row) => sum + row.known_gap_count, 0),
      total_high_priority_gap_count: exportedRows.reduce((sum, row) => sum + row.high_priority_gap_count, 0),
      rating_change_criterion_count: exportedRows.reduce(
        (sum, row) => sum + row.gap_items.filter((item) => item.category === "rating_change_criterion").length,
        0
      ),
      source_provenance_track_count: exportedRows.filter((row) => row.provenance.supporting_source_count > 0).length,
      supporting_evidence_link_count: exportedRows.reduce(
        (sum, row) => sum + row.provenance.supporting_evidence_count,
        0
      ),
      supporting_finding_ref_count: exportedRows.reduce(
        (sum, row) => sum + row.provenance.supporting_finding_count,
        0
      ),
      supporting_source_ref_count: exportedRows.reduce((sum, row) => sum + row.provenance.supporting_source_count, 0)
    },
    facet_options: {
      hallmarks: evidenceMap.hallmarks.map((hallmark) => ({ value: hallmark.id, label: hallmark.name })),
      tracks: evidenceMap.tracks.map((track) => ({ value: track.id, label: track.name })),
      stages: [
        "mechanistic_plausibility",
        "animal_signal",
        "human_biomarker_signal",
        "human_functional_benefit",
        "durable_disease_or_mortality_relevance"
      ].map((stage) => ({ value: stage, label: getStageLabel(stage as Stage) })),
      coverage_confidences: [
        { value: "low", label: getCoverageConfidenceLabel("low") },
        { value: "moderate", label: getCoverageConfidenceLabel("moderate") },
        { value: "high", label: getCoverageConfidenceLabel("high") }
      ],
      research_densities: [
        { value: "active_or_dense", label: "Active or dense" },
        { value: "sparse_or_emerging", label: "Sparse or emerging" },
        { value: "unknown", label: getResearchDensityLabel("unknown") },
        { value: "sparse", label: getResearchDensityLabel("sparse") },
        { value: "emerging", label: getResearchDensityLabel("emerging") },
        { value: "active", label: getResearchDensityLabel("active") },
        { value: "dense", label: getResearchDensityLabel("dense") }
      ],
      severities: [
        { value: "high_priority", label: "High priority" },
        { value: "human_endpoint", label: "Human endpoint" },
        { value: "trial_sensitive", label: "Trial sensitive" },
        { value: "sparse_checked", label: "Sparse but checked" },
        { value: "map_work_needed", label: "Map work needed" }
      ],
      sorts: [
        { value: "severity", label: "Severity" },
        { value: "high_priority", label: "High-priority gaps" },
        { value: "density", label: "Research density" },
        { value: "track", label: "Track" },
        { value: "stage", label: "Evidence stage" }
      ]
    },
    saved_views: savedViews,
    tracks: exportedRows
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
