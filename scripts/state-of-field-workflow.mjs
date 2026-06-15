#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { datePart } from "./editorial-freshness.mjs";

const workspaceRoot = process.cwd();
const workflowPath = "ops/state-of-field-workflow.v1.json";
const currentStoryPath = "data/content/current-lev-story/current.json";
const stateOfFieldRoot = "data/content/state-of-the-field";
const publicationEventRoot = "data/publication-events";
const activityItemsRoot = "data/activity-items";
const fieldActivityWatchlistPath = "research/backlog/field-activity-watchlist.v1.json";
const trialWatchReportPath = "extra/trial-watch-report.md";
const directActivityPublicationRoute = "direct_activity_publish";
const fieldActivityPacketClassifications = new Set(["capture_now", "research_more"]);
const fieldActivityOpenApprovalStatuses = new Set(["requested", "revise"]);

function usage() {
  return `Usage:
  npm run state-of-field:status [-- --strict] [--json]
  npm run state-of-field:reconcile [-- --write] [--edition YYYY-MM] [--draft-pool PATH] [--include-period-events] [--json]
  npm run state-of-field:packet [-- --edition YYYY-MM] [--all] [--json]
  npm run state-of-field:prep [-- --edition YYYY-MM] [--draft-pool PATH] [--write] [--json]

Options:
  --strict  Fail when current-story/public-edition publication-event mismatches are not tracked.
  --write   Update ${workflowPath} when reconciliation items or observed story metadata are missing.
            With prep, write extra/state-of-field-<edition>-prep.{json,md}.
  --edition Reconcile a specific workflow edition slug. Defaults to the active workflow edition.
  --draft-pool PATH
            Read candidate_public_update_pool event IDs from an internal draft JSON.
            Defaults to extra/state-of-field-<edition>-draft.json when present.
  --include-period-events
            Also seed non-bootstrap publication events with affected outlooks inside the edition period.
  --all     Include closed reconciliation items in the approval packet.
  --json    Print machine-readable status.`;
}

function readOptionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("--")) ?? "status";

  return {
    command,
    help: args.includes("--help") || args.includes("-h"),
    strict: args.includes("--strict"),
    write: args.includes("--write"),
    edition: readOptionValue(args, "--edition"),
    draftPoolPath: readOptionValue(args, "--draft-pool"),
    includePeriodEvents: args.includes("--include-period-events"),
    all: args.includes("--all"),
    json: args.includes("--json")
  };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(workspaceRoot, relativePath), "utf8"));
}

async function readJsonIfExists(relativePath) {
  try {
    return await readJson(relativePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function readTextIfExists(relativePath) {
  try {
    return await fs.readFile(path.join(workspaceRoot, relativePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function writeJson(relativePath, value) {
  const filePath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(relativePath, value) {
  const filePath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

async function readJsonCollection(relativeDir) {
  const directoryPath = path.join(workspaceRoot, relativeDir);
  const fileNames = (await fs.readdir(directoryPath))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(fileNames.map((fileName) => readJson(path.join(relativeDir, fileName))));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function flattenFieldActivityCandidateEvents(fieldActivityWatchlist) {
  return (fieldActivityWatchlist?.entries ?? []).flatMap((entry) =>
    (entry.candidate_events ?? []).map((event) => ({
      entry,
      event
    }))
  );
}

function fieldActivityCandidateNeedsApprovalPacket(event, includeAll) {
  if (includeAll) {
    return true;
  }

  const approvalStatus = event.human_approval?.status;
  return (
    fieldActivityOpenApprovalStatuses.has(approvalStatus) ||
    (event.agent_assessment?.human_review_required === true && approvalStatus !== "approved") ||
    (!event.agent_assessment && event.classification === "capture_now" && approvalStatus !== "approved")
  );
}

function fieldActivityMateriality(event) {
  if (event.noteworthiness_tier === "field_anchor") {
    return "high";
  }
  if (event.noteworthiness_tier === "material_program") {
    return "moderate";
  }
  if (event.noteworthiness_tier === "watch_only") {
    return "low";
  }
  return "none";
}

function fieldActivityPublicCopyAction(event) {
  if (event.agent_assessment?.public_copy_action) {
    return event.agent_assessment.public_copy_action;
  }
  if (event.classification === "capture_now") {
    return "add_activity_item";
  }
  if (event.classification === "research_more") {
    return "hold_for_source";
  }
  if (event.classification === "captured_by_related_item") {
    return "consolidate_with_related_item";
  }
  return "no_public_copy";
}

function latestByDate(records) {
  return [...records].sort((left, right) => String(right.date ?? "").localeCompare(String(left.date ?? "")))[0];
}

function summarizeFieldActivityWatchlist(fieldActivityWatchlist) {
  if (!fieldActivityWatchlist) {
    return {
      path: fieldActivityWatchlistPath,
      available: false,
      entry_count: 0,
      discovery_channel_count: 0,
      blindspot_control_count: 0,
      capture_recommended_count: 0,
      needs_primary_source_count: 0,
      pending_field_anchor_count: 0,
      pending_material_program_count: 0,
      watch_only_count: 0,
      below_threshold_count: 0,
      consolidated_candidate_count: 0,
      approval_candidate_count: 0,
      human_review_required_candidate_count: 0,
      surface_routing_required_candidate_count: 0,
      learning_phase: "unknown",
      learning_cadence: "unknown",
      learning_completed_pilot_sweeps: 0,
      learning_minimum_pilot_sweeps: 0,
      learning_open_question_count: 0,
      learning_revision_trigger_count: 0
    };
  }

  const candidateEvents = flattenFieldActivityCandidateEvents(fieldActivityWatchlist).map(({ event }) => event);
  const pendingEvents = candidateEvents.filter((event) => ["capture_now", "research_more"].includes(event.classification));
  const learningLoop = fieldActivityWatchlist.learning_loop ?? {};
  const learningQuestions = learningLoop.current_learning_questions ?? [];
  const revisionTriggers = learningLoop.revision_triggers ?? [];
  const approvalCandidates = candidateEvents.filter((event) => fieldActivityPacketClassifications.has(event.classification));
  const humanReviewRequiredCandidates = candidateEvents.filter(
    (event) =>
      fieldActivityCandidateNeedsApprovalPacket(event, false) &&
      (event.agent_assessment?.human_review_required ?? fieldActivityPacketClassifications.has(event.classification))
  );
  const sourceWorkCandidates = candidateEvents.filter(
    (event) =>
      event.classification === "research_more" &&
      (event.agent_assessment?.public_copy_action ?? fieldActivityPublicCopyAction(event)) === "hold_for_source"
  );
  const stateOfFieldRoutedItems = candidateEvents.filter(
    (event) => event.surface_routing?.state_of_field_review_required || event.surface_routing?.current_story_review_required
  );
  const surfaceRoutingRequiredCandidates = candidateEvents.filter(
    (event) =>
      (fieldActivityPacketClassifications.has(event.classification) && !event.surface_routing) ||
      event.surface_routing?.state_of_field_review_required ||
      event.surface_routing?.current_story_review_required
  );
  const missingSurfaceRoutingCandidates = candidateEvents.filter(
    (event) => fieldActivityPacketClassifications.has(event.classification) && !event.surface_routing
  );
  const nonblockingWatchItems = candidateEvents.filter(
    (event) =>
      !fieldActivityCandidateNeedsApprovalPacket(event, false) &&
      (sourceWorkCandidates.includes(event) || ["watch_only", "below_threshold"].includes(event.noteworthiness_tier))
  );

  return {
    path: fieldActivityWatchlistPath,
    available: true,
    updated_at: fieldActivityWatchlist.updated_at,
    entry_count: fieldActivityWatchlist.entries?.length ?? 0,
    discovery_channel_count: fieldActivityWatchlist.discovery_channels?.length ?? 0,
    blindspot_control_count: fieldActivityWatchlist.blindspot_controls?.length ?? 0,
    capture_recommended_count: candidateEvents.filter((event) => event.classification === "capture_now").length,
    needs_primary_source_count: candidateEvents.filter((event) => event.classification === "research_more").length,
    pending_field_anchor_count: pendingEvents.filter((event) => event.noteworthiness_tier === "field_anchor").length,
    pending_material_program_count: pendingEvents.filter((event) => event.noteworthiness_tier === "material_program").length,
    watch_only_count: candidateEvents.filter((event) => event.noteworthiness_tier === "watch_only").length,
    below_threshold_count: candidateEvents.filter((event) => event.noteworthiness_tier === "below_threshold").length,
    consolidated_candidate_count: candidateEvents.filter((event) => event.classification === "captured_by_related_item").length,
    approval_candidate_count: approvalCandidates.length,
    human_review_required_candidate_count: humanReviewRequiredCandidates.length,
    surface_routing_required_candidate_count: surfaceRoutingRequiredCandidates.length,
    source_work_candidate_count: sourceWorkCandidates.length,
    human_approval_required_count: humanReviewRequiredCandidates.length,
    state_of_field_routed_item_count: stateOfFieldRoutedItems.length,
    missing_surface_routing_count: missingSurfaceRoutingCandidates.length,
    nonblocking_watch_item_count: nonblockingWatchItems.length,
    learning_phase: learningLoop.phase ?? "unknown",
    learning_cadence: learningLoop.cadence ?? "unknown",
    learning_completed_pilot_sweeps: learningLoop.completed_pilot_sweeps ?? 0,
    learning_minimum_pilot_sweeps: learningLoop.minimum_pilot_sweeps ?? 0,
    learning_open_question_count: learningQuestions.filter((question) => question.status === "open").length,
    learning_revision_trigger_count: revisionTriggers.filter((trigger) => trigger.status !== "resolved").length
  };
}

function hasActivityRoute(activityItem, route) {
  return (activityItem.surface_routing?.affected_surfaces ?? []).includes(route);
}

function hasActivityTag(activityItem, tag) {
  return (activityItem.tags ?? []).includes(tag);
}

function isTrialHorizonActivity(activityItem) {
  return hasActivityRoute(activityItem, "trial_horizon") || Boolean(activityItem.trial_activity_kind);
}

function summarizePublicActivityLenses(activityItems) {
  const publicActivityItems = activityItems.filter((item) => item.record_type === "activity_item");
  const stateOfFieldRoutedItems = publicActivityItems.filter(
    (item) => hasActivityRoute(item, "state_of_field") || item.surface_routing?.state_of_field_review_required
  );
  const activityOnlyItems = publicActivityItems.filter((item) => !item.affects_outlook);
  const assessmentChangingItems = publicActivityItems.filter((item) => item.affects_outlook);
  const fieldAnchorItems = publicActivityItems.filter((item) => item.noteworthiness_tier === "field_anchor");
  const currentMovementItems = publicActivityItems.filter((item) => !hasActivityTag(item, "historical-backfill"));
  const trialHorizonItems = publicActivityItems.filter(isTrialHorizonActivity);
  const historicalContextItems = publicActivityItems.filter((item) => hasActivityTag(item, "historical-backfill"));

  return {
    public_activity_item_count: publicActivityItems.length,
    activity_only_count: activityOnlyItems.length,
    assessment_changing_count: assessmentChangingItems.length,
    field_anchor_count: fieldAnchorItems.length,
    current_movement_count: currentMovementItems.length,
    trial_horizon_count: trialHorizonItems.length,
    historical_context_count: historicalContextItems.length,
    state_of_field_routed_count: stateOfFieldRoutedItems.length,
    state_of_field_routed_field_anchor_count: stateOfFieldRoutedItems.filter(
      (item) => item.noteworthiness_tier === "field_anchor"
    ).length,
    state_of_field_routed_current_movement_count: stateOfFieldRoutedItems.filter(
      (item) => !hasActivityTag(item, "historical-backfill")
    ).length,
    state_of_field_routed_trial_horizon_count: stateOfFieldRoutedItems.filter(isTrialHorizonActivity).length,
    state_of_field_routed_historical_context_count: stateOfFieldRoutedItems.filter((item) =>
      hasActivityTag(item, "historical-backfill")
    ).length,
    state_of_field_routed_activity_only_count: stateOfFieldRoutedItems.filter((item) => !item.affects_outlook).length,
    state_of_field_routed_activity_ids: stateOfFieldRoutedItems
      .map((item) => item.id)
      .sort((left, right) => left.localeCompare(right))
  };
}

function compareEventDate(left, right) {
  const leftDate = datePart(left.published_at) ?? "";
  const rightDate = datePart(right.published_at) ?? "";
  return leftDate.localeCompare(rightDate) || String(left.id).localeCompare(String(right.id));
}

function collectCurrentStoryEventIds(currentStory) {
  return unique([
    ...(currentStory.related_publication_event_ids ?? []),
    ...(currentStory.recent_developments ?? []).flatMap((item) => item.related_publication_event_ids ?? [])
  ]);
}

function selectWorkflowEdition({ workflow, currentStory, stateOfFieldEditions, editionSlug }) {
  const relatedSlug = currentStory.related_state_of_field_slug;
  const latestEdition =
    stateOfFieldEditions.find((edition) => edition.slug === relatedSlug) ?? latestByDate(stateOfFieldEditions);
  const activeStatuses = new Set(["draft", "reconciling", "needs_surveillance", "in_review", "blocked"]);
  const activeWorkflowEdition = workflow.editions
    .filter((edition) => activeStatuses.has(edition.status))
    .sort((left, right) => String(right.status_updated_at ?? "").localeCompare(String(left.status_updated_at ?? "")))[0];
  const workflowEdition = editionSlug
    ? workflow.editions.find((edition) => edition.slug === editionSlug)
    : activeWorkflowEdition ?? workflow.editions.find((edition) => edition.slug === latestEdition?.slug);

  if (!latestEdition) {
    throw new Error("No State of the Field edition exists under data/content/state-of-the-field.");
  }

  if (!workflowEdition) {
    const label = editionSlug ?? latestEdition.slug;
    throw new Error(`No workflow state found for State of the Field edition ${label}.`);
  }

  return {
    latestEdition,
    workflowEdition
  };
}

const classificationChecklistIdPattern = /^classify-[a-z0-9-]+-updates$/;
const requiredPublicationChecklistChecks = [
  {
    purpose: "trial audit",
    matches: (item) => item.id === "run-trial-audit"
  },
  {
    purpose: "field-activity review",
    matches: (item) => item.id === "review-field-activity-watchlist"
  },
  {
    purpose: "period update classification",
    matches: (item) => item.id === "classify-missing-events" || classificationChecklistIdPattern.test(item.id)
  },
  {
    purpose: "public edition write or revision",
    matches: (item) => item.id === "write-public-edition" || item.id === "revise-edition-if-needed"
  },
  {
    purpose: "final validation checks",
    matches: (item) => item.id === "run-final-checks" || item.id === "run-editorial-checks"
  }
];

function findChecklistItem(workflowEdition, matches) {
  return (workflowEdition.checklist ?? []).find(matches);
}

function isChecklistStatusClosed(status) {
  return ["complete", "not_applicable"].includes(status);
}

function evaluatePublicationGate({ workflowEdition, publicEdition, openDecisions, decidedItemsMissingAgentAssessment, unresolvedRequiredHumanApprovals, openChecklist }) {
  const gateApplies = ["in_review", "published"].includes(workflowEdition.status);
  const issues = [];
  const today = new Date().toISOString().slice(0, 10);

  if (today <= workflowEdition.period_end) {
    issues.push(
      `Retrospective period ${workflowEdition.period_label} is still open through ${workflowEdition.period_end}.`
    );
  }

  if ((workflowEdition.blockers ?? []).length > 0) {
    issues.push(`${workflowEdition.blockers.length} workflow blocker(s) remain open.`);
  }

  if (openDecisions.length > 0) {
    issues.push(`${openDecisions.length} reconciliation item(s) still need decisions.`);
  }

  if (decidedItemsMissingAgentAssessment.length > 0) {
    issues.push(`${decidedItemsMissingAgentAssessment.length} decided reconciliation item(s) lack agent assessment metadata.`);
  }

  if (unresolvedRequiredHumanApprovals.length > 0) {
    issues.push(`${unresolvedRequiredHumanApprovals.length} reconciliation item(s) require unresolved human approval.`);
  }

  if (openChecklist.length > 0) {
    issues.push(`${openChecklist.length} checklist item(s) are still open.`);
  }

  for (const check of requiredPublicationChecklistChecks) {
    const item = findChecklistItem(workflowEdition, check.matches);
    const status = item?.status;
    if (!isChecklistStatusClosed(status)) {
      const suffix = item ? ` (${item.id})` : "";
      issues.push(`Required checklist purpose "${check.purpose}" is ${status ?? "missing"}${suffix}.`);
    }
  }

  if (!publicEdition) {
    issues.push(`No public edition JSON exists for ${workflowEdition.slug} at ${workflowEdition.published_edition_path}.`);
  } else {
    for (const field of ["period_start", "period_end", "period_label"]) {
      if (publicEdition[field] !== workflowEdition[field]) {
        issues.push(`Public edition ${field} (${publicEdition[field]}) does not match workflow (${workflowEdition[field]}).`);
      }
    }

    if (!publicEdition.review_basis) {
      issues.push("Public edition is missing review_basis.");
    }
  }

  return {
    status: issues.length === 0 ? "pass" : gateApplies ? "blocked" : "not_ready",
    applies: gateApplies,
    issue_count: issues.length,
    issues
  };
}

function summarizeWorkflow(workflow, currentStory, stateOfFieldEditions, fieldActivityWatchlist, activityItems, editionSlug) {
  const { latestEdition, workflowEdition } = selectWorkflowEdition({
    workflow,
    currentStory,
    stateOfFieldEditions,
    editionSlug
  });
  const publicEdition = stateOfFieldEditions.find((edition) => edition.slug === workflowEdition.slug);

  const currentStoryEventIds = collectCurrentStoryEventIds(currentStory);
  const editionEventIds = new Set(latestEdition.related_publication_event_ids ?? []);
  const trackedEventIds = new Set((workflowEdition.reconciliation_items ?? []).map((item) => item.publication_event_id));
  const missingFromEdition = currentStoryEventIds.filter((eventId) => !editionEventIds.has(eventId));
  const untrackedMissing = missingFromEdition.filter((eventId) => !trackedEventIds.has(eventId));
  const openDecisions = (workflowEdition.reconciliation_items ?? []).filter((item) => item.decision === "needs_decision");
  const decidedItems = (workflowEdition.reconciliation_items ?? []).filter((item) => item.decision !== "needs_decision");
  const decidedItemsMissingAgentAssessment = decidedItems.filter((item) => !item.agent_assessment);
  const unresolvedRequiredHumanApprovals = (workflowEdition.reconciliation_items ?? []).filter(
    (item) => item.agent_assessment?.human_review_required === true && item.human_approval?.status !== "approved"
  );
  const openChecklist = (workflowEdition.checklist ?? []).filter((item) =>
    ["pending", "in_progress", "blocked"].includes(item.status)
  );
  const strictIssues = [];
  const publicationGate = evaluatePublicationGate({
    workflowEdition,
    publicEdition,
    openDecisions,
    decidedItemsMissingAgentAssessment,
    unresolvedRequiredHumanApprovals,
    openChecklist
  });

  if (untrackedMissing.length > 0) {
    strictIssues.push(
      `${untrackedMissing.length} current-story public update(s) are missing from the published edition and untracked in ${workflowPath}.`
    );
  }

  if (workflowEdition.status === "published" && (openDecisions.length > 0 || openChecklist.length > 0)) {
    strictIssues.push("Workflow status is published but reconciliation decisions or checklist items are still open.");
  }

  if (["in_review", "published"].includes(workflowEdition.status)) {
    if (publicationGate.issue_count > 0) {
      strictIssues.push(
        `Publication gate is ${publicationGate.status}: ${publicationGate.issues.join(" ")}`
      );
    }

    if (openDecisions.length > 0) {
      strictIssues.push(
        `${openDecisions.length} reconciliation item(s) still need decisions before the edition can be treated as in review.`
      );
    }

    if (decidedItemsMissingAgentAssessment.length > 0) {
      strictIssues.push(
        `${decidedItemsMissingAgentAssessment.length} decided reconciliation item(s) lack recorded agent assessment metadata.`
      );
    }

    if (unresolvedRequiredHumanApprovals.length > 0) {
      strictIssues.push(
        `${unresolvedRequiredHumanApprovals.length} reconciliation item(s) require human approval but are not approved.`
      );
    }
  }

  return {
    workflow_path: workflowPath,
    status: workflowEdition.status,
    edition_slug: workflowEdition.slug,
    edition_title: workflowEdition.title ?? latestEdition.title,
    period_label: workflowEdition.period_label ?? latestEdition.period_label,
    published_reference_slug: latestEdition.slug,
    published_reference_title: latestEdition.title,
    current_story_latest_publication_event_id: currentStory.revision?.observed_latest_publication_event_id ?? null,
    current_story_event_count: currentStoryEventIds.length,
    edition_event_count: editionEventIds.size,
    missing_from_published_edition_count: missingFromEdition.length,
    tracked_missing_event_count: missingFromEdition.length - untrackedMissing.length,
    untracked_missing_event_count: untrackedMissing.length,
    open_reconciliation_decision_count: openDecisions.length,
    decided_without_agent_assessment_count: decidedItemsMissingAgentAssessment.length,
    unresolved_required_human_approval_count: unresolvedRequiredHumanApprovals.length,
    open_checklist_item_count: openChecklist.length,
    missing_from_published_edition: missingFromEdition,
    untracked_missing_publication_event_ids: untrackedMissing,
    open_reconciliation_publication_event_ids: openDecisions.map((item) => item.publication_event_id),
    decided_without_agent_assessment_publication_event_ids: decidedItemsMissingAgentAssessment.map(
      (item) => item.publication_event_id
    ),
    unresolved_required_human_approval_publication_event_ids: unresolvedRequiredHumanApprovals.map(
      (item) => item.publication_event_id
    ),
    field_activity_watchlist: summarizeFieldActivityWatchlist(fieldActivityWatchlist),
    public_activity_lenses: summarizePublicActivityLenses(activityItems),
    publication_gate: publicationGate,
    required_next_action: workflowEdition.required_next_action,
    strict_issues: strictIssues
  };
}

function flattenDraftPoolEventIds(draftPool) {
  const pool = draftPool?.candidate_public_update_pool;
  if (!pool || typeof pool !== "object") {
    return [];
  }

  return unique(
    Object.values(pool).flatMap((value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []))
  );
}

function periodEventIds(publicationEvents, workflowEdition, includePeriodEvents) {
  if (!includePeriodEvents) {
    return [];
  }

  return publicationEvents
    .filter((event) => {
      const eventDate = datePart(event.published_at);
      return (
        eventDate &&
        eventDate >= workflowEdition.period_start &&
        eventDate <= workflowEdition.period_end &&
        (event.affected_outlook_ids?.length ?? 0) > 0 &&
        !String(event.id).includes("-bootstrap-")
      );
    })
    .sort(compareEventDate)
    .map((event) => event.id);
}

function directFieldActivityEventIds(publicationEvents, workflowEdition) {
  return publicationEvents
    .filter((event) => {
      const eventDate = datePart(event.published_at);
      return (
        eventDate &&
        eventDate >= workflowEdition.period_start &&
        eventDate <= workflowEdition.period_end &&
        event.publication_route === directActivityPublicationRoute
      );
    })
    .sort(compareEventDate)
    .map((event) => event.id);
}

function addCandidateIds(candidateIds, ids, source) {
  for (const id of ids) {
    if (!candidateIds.has(id)) {
      candidateIds.set(id, source);
    }
  }
}

function buildSeededReconciliationItem(event, source) {
  return {
    publication_event_id: event.id,
    event_date: datePart(event.published_at),
    related_outlook_ids: event.affected_outlook_ids ?? [],
    decision: "needs_decision",
    rationale: `Auto-seeded from ${source}; classify this reviewed public update before finalizing the State of the Field edition.`,
    next_action:
      "Decide whether this update is a field signal, context only, activity without results, post-hoc context, material correction, or no-op for the covered period."
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function itemNeedsApprovalPacket(item, includeAll) {
  if (includeAll) {
    return true;
  }

  const approvalStatus = item.human_approval?.status;
  return (
    item.decision === "needs_decision" ||
    approvalStatus === "requested" ||
    approvalStatus === "revise" ||
    (item.agent_assessment?.human_review_required === true && approvalStatus !== "approved")
  );
}

function buildFieldActivityPacketItems(fieldActivityWatchlist, options) {
  return flattenFieldActivityCandidateEvents(fieldActivityWatchlist)
    .filter(({ event }) => fieldActivityCandidateNeedsApprovalPacket(event, options.all))
    .map(({ entry, event }, index) => {
      const humanReviewRequired =
        event.agent_assessment?.human_review_required ?? fieldActivityPacketClassifications.has(event.classification);

      return {
        index: index + 1,
        watch_entry_id: entry.id,
        watch_entry_name: entry.name,
        event_id: event.event_id,
        event_label: event.event_label,
        classification: event.classification,
        occurred_on: event.occurred_on ?? null,
        activity_type: event.activity_type,
        activity_lane: event.activity_lane,
        scope_label: event.scope_label ?? null,
        noteworthiness_tier: event.noteworthiness_tier,
        threshold_basis: event.threshold_basis ?? [],
        source_quality: event.source_quality,
        source_url: event.source_url ?? null,
        recommended_public_action: event.recommended_public_action ?? null,
        rationale: event.rationale,
        surface_routing: event.surface_routing ?? null,
        agent_assessment: event.agent_assessment ?? null,
        derived_recommendation: {
          recommended_classification: event.classification,
          materiality: fieldActivityMateriality(event),
          affected_surfaces: event.surface_routing?.affected_surfaces ?? ["activity_feed"],
          public_copy_action: fieldActivityPublicCopyAction(event),
          human_review_required: humanReviewRequired,
          rationale: event.rationale
        },
        human_approval: event.human_approval ?? null,
        human_review_required: humanReviewRequired,
        escalation_reason:
          event.agent_assessment?.escalation_reason ??
          (event.classification === "capture_now"
            ? "Candidate would add or update public field activity."
            : event.classification === "research_more"
              ? "Candidate may be material but needs better source support before publication."
              : null)
      };
    });
}

function buildApprovalPacket({
  workflow,
  currentStory,
  stateOfFieldEditions,
  publicationEvents,
  fieldActivityWatchlist,
  activityItems,
  options
}) {
  const { workflowEdition } = selectWorkflowEdition({
    workflow,
    currentStory,
    stateOfFieldEditions,
    editionSlug: options.edition
  });
  const eventById = new Map(publicationEvents.map((event) => [event.id, event]));
  const reconciliationItems = (workflowEdition.reconciliation_items ?? []).filter((item) =>
    itemNeedsApprovalPacket(item, options.all)
  );
  const packetItems = reconciliationItems.map((item, index) => {
    const event = eventById.get(item.publication_event_id);
    const assessment = item.agent_assessment ?? null;
    const humanApproval = item.human_approval ?? null;

    return {
      index: index + 1,
      publication_event_id: item.publication_event_id,
      event_date: item.event_date,
      event_name: event?.name ?? null,
      event_summary: event?.summary ?? null,
      event_change_note: event?.change_note ?? null,
      candidate_bundle_id: event?.candidate_bundle_id ?? null,
      affected_outlook_ids: item.related_outlook_ids ?? event?.affected_outlook_ids ?? [],
      current_decision: item.decision,
      current_rationale: item.rationale,
      next_action: item.next_action,
      agent_assessment: assessment,
      human_approval: humanApproval,
      human_review_required: assessment?.human_review_required ?? true,
      escalation_reason: assessment?.escalation_reason ?? (assessment ? null : "No agent assessment recorded.")
    };
  });
  const itemsRequiringHumanReview = packetItems.filter((item) => item.human_review_required);
  const itemsWithoutAgentAssessment = packetItems.filter((item) => !item.agent_assessment);
  const fieldActivityItems = buildFieldActivityPacketItems(fieldActivityWatchlist, options);
  const fieldActivityItemsRequiringHumanReview = fieldActivityItems.filter((item) => item.human_review_required);
  const fieldActivityItemsWithoutAgentAssessment = fieldActivityItems.filter((item) => !item.agent_assessment);

  return {
    generated_at: new Date().toISOString(),
    workflow_path: workflowPath,
    edition_slug: workflowEdition.slug,
    edition_title: workflowEdition.title,
    period_label: workflowEdition.period_label,
    period_start: workflowEdition.period_start,
    period_end: workflowEdition.period_end,
    status: workflowEdition.status,
    required_next_action: workflowEdition.required_next_action,
    blocker_count: (workflowEdition.blockers ?? []).length,
    total_reconciliation_item_count: (workflowEdition.reconciliation_items ?? []).length,
    packet_item_count: packetItems.length,
    human_review_required_count: itemsRequiringHumanReview.length,
    missing_agent_assessment_count: itemsWithoutAgentAssessment.length,
    field_activity_packet_item_count: fieldActivityItems.length,
    field_activity_human_review_required_count: fieldActivityItemsRequiringHumanReview.length,
    field_activity_missing_agent_assessment_count: fieldActivityItemsWithoutAgentAssessment.length,
    field_activity_watchlist: summarizeFieldActivityWatchlist(fieldActivityWatchlist),
    public_activity_lenses: summarizePublicActivityLenses(activityItems),
    items: packetItems,
    field_activity_items: fieldActivityItems
  };
}

function formatAssessment(assessment) {
  if (!assessment) {
    return [
      "- Agent recommendation: not recorded",
      "- Human review: required",
      "- Escalation: No agent assessment recorded."
    ];
  }

  return [
    `- Agent recommendation: ${assessment.recommended_decision}`,
    `- Confidence: ${assessment.confidence}`,
    `- Materiality: ${assessment.materiality}`,
    `- Affected surfaces: ${(assessment.affected_surfaces ?? []).join(", ") || "none"}`,
    `- Public copy action: ${assessment.public_copy_action}`,
    `- Human review: ${assessment.human_review_required ? "required" : "not required"}`,
    ...(assessment.escalation_reason ? [`- Escalation: ${assessment.escalation_reason}`] : []),
    `- Agent rationale: ${assessment.rationale}`
  ];
}

function formatFieldActivityAssessment(item) {
  const assessment = item.agent_assessment;
  const recommendation = assessment ?? item.derived_recommendation;

  return [
    `- Agent recommendation: ${recommendation.recommended_classification}`,
    `- Materiality: ${recommendation.materiality}`,
    `- Affected surfaces: ${(recommendation.affected_surfaces ?? []).join(", ") || "none"}`,
    `- Public copy action: ${recommendation.public_copy_action}`,
    `- Human review: ${recommendation.human_review_required ? "required" : "not required"}`,
    ...(item.escalation_reason ? [`- Escalation: ${item.escalation_reason}`] : []),
    `- Agent rationale: ${recommendation.rationale}`,
    ...(assessment ? [] : ["- Agent assessment: derived from watchlist classification; record explicit agent_assessment before closing the candidate."])
  ];
}

function formatApprovalPacket(packet) {
  const lines = [
    "# State of the Field Reconciliation Approval Packet",
    "",
    `Edition: ${packet.edition_slug} (${packet.period_label})`,
    `Status: ${packet.status}`,
    `Period: ${packet.period_start} to ${packet.period_end}`,
    `Next action: ${packet.required_next_action}`,
    "",
    "## Summary",
    "",
    `- Reconciliation items in workflow: ${packet.total_reconciliation_item_count}`,
    `- Items in packet: ${packet.packet_item_count}`,
    `- Human review required: ${packet.human_review_required_count}`,
    `- Missing agent assessments: ${packet.missing_agent_assessment_count}`,
    `- Blockers recorded: ${packet.blocker_count}`,
    `- Field-activity watchlist entries: ${packet.field_activity_watchlist.entry_count}`,
    `- Field-activity capture recommended: ${packet.field_activity_watchlist.capture_recommended_count}`,
    `- Field-activity source-work candidates: ${packet.field_activity_watchlist.source_work_candidate_count}`,
    `- Field-activity publication-ready: ${packet.field_activity_watchlist.capture_recommended_count}`,
    `- Field-activity human approval required: ${packet.field_activity_human_review_required_count}`,
    `- Field-activity missing agent assessments: ${packet.field_activity_missing_agent_assessment_count}`,
    `- Field-activity State-of-Field routed items: ${packet.field_activity_watchlist.state_of_field_routed_item_count}`,
    `- Field-activity missing surface routing: ${packet.field_activity_watchlist.missing_surface_routing_count}`,
    `- Field-activity nonblocking watch items: ${packet.field_activity_watchlist.nonblocking_watch_item_count}`,
    `- Field-activity consolidated candidates: ${packet.field_activity_watchlist.consolidated_candidate_count}`,
    `- Field-activity learning phase: ${packet.field_activity_watchlist.learning_phase} (${packet.field_activity_watchlist.learning_completed_pilot_sweeps}/${packet.field_activity_watchlist.learning_minimum_pilot_sweeps} pilot sweeps)`,
    `- Field-activity open learning questions: ${packet.field_activity_watchlist.learning_open_question_count}`,
    `- Public activity items: ${packet.public_activity_lenses.public_activity_item_count} (${packet.public_activity_lenses.activity_only_count} activity-only, ${packet.public_activity_lenses.assessment_changing_count} assessment-changing)`,
    `- Public activity lenses: ${packet.public_activity_lenses.field_anchor_count} field anchors; ${packet.public_activity_lenses.current_movement_count} current movement; ${packet.public_activity_lenses.trial_horizon_count} trial horizon; ${packet.public_activity_lenses.historical_context_count} historical context`,
    `- Public activity routed to State of Field: ${packet.public_activity_lenses.state_of_field_routed_count} (${packet.public_activity_lenses.state_of_field_routed_field_anchor_count} field anchors; ${packet.public_activity_lenses.state_of_field_routed_current_movement_count} current movement; ${packet.public_activity_lenses.state_of_field_routed_trial_horizon_count} trial horizon; ${packet.public_activity_lenses.state_of_field_routed_historical_context_count} historical context)`
  ];

  if (packet.items.length === 0 && packet.field_activity_items.length === 0) {
    lines.push("", "No reconciliation items need approval packet review.");
    return `${lines.join("\n")}\n`;
  }

  if (packet.items.length > 0) {
    lines.push("", "## Reconciliation Items");

    for (const item of packet.items) {
      lines.push(
        "",
        `### ${item.index}. ${item.event_name ?? item.publication_event_id}`,
        "",
        `- Event ID: ${item.publication_event_id}`,
        `- Event date: ${item.event_date}`,
        `- Candidate bundle: ${item.candidate_bundle_id ?? "unknown"}`,
        `- Affected outlooks: ${item.affected_outlook_ids.join(", ") || "none"}`,
        `- Current decision: ${item.current_decision}`,
        ...formatAssessment(item.agent_assessment),
        `- Current rationale: ${item.current_rationale}`,
        `- Proposed next action: ${item.next_action}`
      );

      if (item.event_summary) {
        lines.push(`- Event summary: ${item.event_summary}`);
      }

      if (item.event_change_note) {
        lines.push(`- Event change note: ${item.event_change_note}`);
      }

      if (item.human_approval) {
        lines.push(`- Human approval status: ${item.human_approval.status}`);
        if (item.human_approval.notes) {
          lines.push(`- Human approval notes: ${item.human_approval.notes}`);
        }
      }
    }
  }

  if (packet.field_activity_items.length > 0) {
    lines.push("", "## Field Activity Candidates");

    for (const item of packet.field_activity_items) {
      lines.push(
        "",
        `### ${item.index}. ${item.event_label}`,
        "",
        `- Watch entry: ${item.watch_entry_name} (${item.watch_entry_id})`,
        `- Candidate event ID: ${item.event_id}`,
        `- Event date: ${item.occurred_on ?? "unknown"}`,
        `- Classification: ${item.classification}`,
        `- Activity: ${item.activity_type} / ${item.activity_lane}`,
        `- Scope: ${item.scope_label ?? "unspecified"}`,
        `- Noteworthiness: ${item.noteworthiness_tier}`,
        `- Threshold basis: ${item.threshold_basis.join(", ") || "none"}`,
        `- Source quality: ${item.source_quality}`,
        ...formatFieldActivityAssessment(item),
        `- Watchlist rationale: ${item.rationale}`
      );

      if (item.source_url) {
        lines.push(`- Source URL: ${item.source_url}`);
      }

      if (item.recommended_public_action) {
        lines.push(`- Recommended public action: ${item.recommended_public_action}`);
      }

      if (item.surface_routing) {
        lines.push(
          `- Surface routing: ${(item.surface_routing.affected_surfaces ?? []).join(", ") || "none"}; State of Field review ${item.surface_routing.state_of_field_review_required ? "required" : "not required"}; Current story review ${item.surface_routing.current_story_review_required ? "required" : "not required"}`
        );
      }

      if (item.human_approval) {
        lines.push(`- Human approval status: ${item.human_approval.status}`);
        if (item.human_approval.notes) {
          lines.push(`- Human approval notes: ${item.human_approval.notes}`);
        }
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

const prepDecisionSections = [
  {
    decision: "include_as_field_signal",
    title: "Include as field signals",
    guidance: "Use for reviewed period events that changed the visible field read without resolving the overall LEV proof gap."
  },
  {
    decision: "include_as_current_context",
    title: "Include as current context",
    guidance: "Use for claim boundaries, clearer evidence accounting, or field context that helps readers interpret the month."
  },
  {
    decision: "include_as_trial_horizon",
    title: "Use in trial horizon",
    guidance: "Use for registry-linked or trial-timing context, with result/no-result/status boundaries explicit."
  },
  {
    decision: "omit_process_context",
    title: "Omit or fold into another item",
    guidance: "Use when the update is process-like, duplicative, or too narrow for a separate public monthly item."
  },
  {
    decision: "add_post_hoc_context_note",
    title: "Historical or post-period context",
    guidance: "Use only when older activity prevents a misleading read; do not frame it as current-period progress."
  },
  {
    decision: "needs_surveillance",
    title: "Needs surveillance first",
    guidance: "Do not write current claims until external sources or registries are rechecked."
  },
  {
    decision: "defer_to_next_edition",
    title: "Defer to a later edition",
    guidance: "Use when the event belongs outside the covered retrospective period."
  },
  {
    decision: "post_hoc_material_correction",
    title: "Post-hoc material correction",
    guidance: "Use only when later-reviewed evidence would have changed the covered period's conclusion."
  },
  {
    decision: "no_op",
    title: "No public copy action",
    guidance: "Use when no State of the Field or related public surface should change."
  }
];

function compactLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sentencePreview(value, maxLength = 220) {
  const text = compactLine(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}

function approvalStatus(item) {
  return item.human_approval?.status ?? (item.agent_assessment?.human_review_required ? "missing" : "not_required");
}

function prepReconciliationItem(item, event) {
  return {
    publication_event_id: item.publication_event_id,
    event_name: event?.name ?? item.publication_event_id,
    event_date: item.event_date,
    event_summary: event?.summary ?? null,
    event_change_note: event?.change_note ?? null,
    decision: item.decision,
    materiality: item.agent_assessment?.materiality ?? null,
    confidence: item.agent_assessment?.confidence ?? null,
    public_copy_action: item.agent_assessment?.public_copy_action ?? null,
    affected_surfaces: item.agent_assessment?.affected_surfaces ?? [],
    human_review_required: item.agent_assessment?.human_review_required ?? false,
    human_approval_status: approvalStatus(item),
    rationale: item.rationale,
    next_action: item.next_action
  };
}

function activityLensLabels(activityItem) {
  return [
    activityItem.noteworthiness_tier === "field_anchor" ? "field_anchor" : null,
    hasActivityTag(activityItem, "historical-backfill") ? "historical_context" : "current_movement",
    isTrialHorizonActivity(activityItem) ? "trial_horizon" : null,
    activityItem.affects_outlook ? "assessment_changing" : "activity_only"
  ].filter(Boolean);
}

function suggestedActivityUse(activityItem) {
  if (activityItem.affects_outlook) {
    return "Review as possible evidence-context support, but do not treat activity alone as proof.";
  }
  if (hasActivityTag(activityItem, "historical-backfill")) {
    return "Use only as historical field-map context if it prevents a misleading monthly read.";
  }
  if (isTrialHorizonActivity(activityItem)) {
    return "Use as trial-horizon or future-evidence context only when status/result boundaries are explicit.";
  }
  return "Use as field-activity context, not evidence of benefit or LEV progress.";
}

function buildPublicActivityPrep(activityItems) {
  return activityItems
    .filter((item) => item.record_type === "activity_item")
    .filter((item) => hasActivityRoute(item, "state_of_field") || item.surface_routing?.state_of_field_review_required)
    .sort((left, right) => String(left.occurred_on ?? "").localeCompare(String(right.occurred_on ?? "")) || left.id.localeCompare(right.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      occurred_on: item.occurred_on ?? null,
      activity_type: item.activity_type ?? null,
      activity_lane: item.activity_lane ?? null,
      noteworthiness_tier: item.noteworthiness_tier ?? null,
      affects_outlook: Boolean(item.affects_outlook),
      lenses: activityLensLabels(item),
      suggested_use: suggestedActivityUse(item)
    }));
}

function buildDraftSeedSummary(draftPool) {
  const seed = draftPool?.candidate_public_edition_seed;
  if (!seed || typeof seed !== "object") {
    return {
      available: false,
      field_change_status: null,
      what_changed_count: 0,
      current_context_count: 0,
      trial_horizon_count: 0,
      signal_count: 0,
      evidence_gap_count: 0,
      track_example_count: 0,
      reader_takeaway_count: 0,
      open_questions: [],
      field_activity_guidance: []
    };
  }

  return {
    available: true,
    slug: seed.slug ?? null,
    title: seed.title ?? null,
    field_change_status: seed.field_change_status ?? null,
    bottom_line: seed.bottom_line ?? null,
    what_changed_count: seed.what_changed?.length ?? 0,
    current_context_count: seed.current_context?.length ?? 0,
    trial_horizon_count: seed.trial_horizon?.length ?? 0,
    signal_count: seed.signals_to_watch?.length ?? 0,
    evidence_gap_count: seed.evidence_gaps?.length ?? 0,
    track_example_count: seed.track_examples?.length ?? 0,
    reader_takeaway_count: seed.reader_takeaways?.length ?? 0,
    open_questions: draftPool.open_questions ?? [],
    field_activity_guidance: draftPool.field_activity_lens_review?.state_of_field_guidance ?? [],
    do_not_publish_before: draftPool.do_not_publish_before ?? seed.publish_gate?.do_not_publish_before ?? null
  };
}

function parseTrialWatchReportSummary(text) {
  if (!text) {
    return {
      available: false,
      path: trialWatchReportPath,
      generated_on: null,
      summary_lines: [],
      surveillance_use_lines: []
    };
  }

  const generatedOn = text.match(/Generated from reviewed local records on ([0-9-]+)\./)?.[1] ?? null;
  const summaryMatch = text.match(/## Summary\n\n([\s\S]*?)(?:\n### |\n## |$)/);
  const surveillanceUseMatch = text.match(/## Surveillance Use\n\n([\s\S]*?)(?:\n## |$)/);
  const toBulletLines = (value) =>
    (value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));

  return {
    available: true,
    path: trialWatchReportPath,
    generated_on: generatedOn,
    summary_lines: toBulletLines(summaryMatch?.[1]),
    surveillance_use_lines: toBulletLines(surveillanceUseMatch?.[1])
  };
}

function buildPrepRecommendations({ summary, packet, draftSeedSummary, trialWatchReport }) {
  const recommendations = [];

  if (summary.publication_gate.status !== "pass") {
    recommendations.push(
      "Keep the edition internal until the publication gate passes; do not move it to in_review or published while gate issues remain."
    );
  }

  if (summary.open_reconciliation_decision_count === 0 && packet.packet_item_count === 0) {
    recommendations.push("Use the recorded agent decisions as the starting classification set; no raw reconciliation decisions are currently waiting for curator classification.");
  }

  if (packet.human_review_required_count === 0 && packet.field_activity_human_review_required_count === 0) {
    recommendations.push("Do not ask for approval unless new evidence, surveillance, or field-activity candidates appear; the current approval packet is empty.");
  }

  if (summary.field_activity_watchlist.source_work_candidate_count > 0) {
    recommendations.push("Keep source-work field-activity candidates out of public monthly copy unless a durable source is found or a curator approves an exception.");
  }

  if (summary.field_activity_watchlist.state_of_field_routed_item_count > 0) {
    recommendations.push("Review the State-of-Field-routed field activity lens before drafting; treat activity as context or trial horizon unless reviewed evidence changes an outlook.");
  }

  if (trialWatchReport.available) {
    recommendations.push("Rerun the trial audit after the covered period closes and refresh any registry-status claims before final trial_horizon copy.");
  }

  if (draftSeedSummary.available) {
    recommendations.push("Use the draft seed as scaffolding only; final public JSON should be written from reviewed records after period close.");
  }

  return recommendations;
}

function buildPrepPacket({
  workflow,
  currentStory,
  stateOfFieldEditions,
  publicationEvents,
  fieldActivityWatchlist,
  activityItems,
  draftPool,
  draftPoolPath,
  trialWatchReportText,
  options
}) {
  const { workflowEdition } = selectWorkflowEdition({
    workflow,
    currentStory,
    stateOfFieldEditions,
    editionSlug: options.edition
  });
  const eventById = new Map(publicationEvents.map((event) => [event.id, event]));
  const summary = summarizeWorkflow(workflow, currentStory, stateOfFieldEditions, fieldActivityWatchlist, activityItems, workflowEdition.slug);
  const approvalPacket = buildApprovalPacket({
    workflow,
    currentStory,
    stateOfFieldEditions,
    publicationEvents,
    fieldActivityWatchlist,
    activityItems,
    options: { ...options, edition: workflowEdition.slug }
  });
  const reconciliationItems = (workflowEdition.reconciliation_items ?? []).map((item) =>
    prepReconciliationItem(item, eventById.get(item.publication_event_id))
  );
  const itemsByDecision = groupBy(reconciliationItems, (item) => item.decision);
  const decision_sections = prepDecisionSections.map((section) => ({
    ...section,
    count: itemsByDecision.get(section.decision)?.length ?? 0,
    items: itemsByDecision.get(section.decision) ?? []
  }));
  const draftSeedSummary = buildDraftSeedSummary(draftPool);
  const trialWatchReport = parseTrialWatchReportSummary(trialWatchReportText);

  const prep = {
    generated_at: new Date().toISOString(),
    workflow_path: workflowPath,
    edition_slug: workflowEdition.slug,
    edition_title: workflowEdition.title,
    status: workflowEdition.status,
    period_label: workflowEdition.period_label,
    period_start: workflowEdition.period_start,
    period_end: workflowEdition.period_end,
    required_next_action: workflowEdition.required_next_action,
    blockers: workflowEdition.blockers ?? [],
    open_checklist_items: (workflowEdition.checklist ?? []).filter((item) =>
      ["pending", "in_progress", "blocked"].includes(item.status)
    ),
    publication_gate: summary.publication_gate,
    approval_packet_summary: {
      reconciliation_items_in_packet: approvalPacket.packet_item_count,
      human_review_required: approvalPacket.human_review_required_count,
      missing_agent_assessments: approvalPacket.missing_agent_assessment_count,
      field_activity_items_in_packet: approvalPacket.field_activity_packet_item_count,
      field_activity_human_review_required: approvalPacket.field_activity_human_review_required_count,
      field_activity_missing_agent_assessments: approvalPacket.field_activity_missing_agent_assessment_count
    },
    decision_sections,
    public_activity_lenses: summary.public_activity_lenses,
    public_activity_items_for_state_of_field: buildPublicActivityPrep(activityItems),
    field_activity_watchlist: summary.field_activity_watchlist,
    draft_pool_path: draftPool ? draftPoolPath : null,
    draft_seed: draftSeedSummary,
    trial_watch_report: trialWatchReport,
    source_artifacts: [
      workflowPath,
      currentStoryPath,
      draftPool ? draftPoolPath : null,
      fieldActivityWatchlist ? fieldActivityWatchlistPath : null,
      trialWatchReport.available ? trialWatchReportPath : null
    ].filter(Boolean)
  };

  return {
    ...prep,
    agent_recommendations: buildPrepRecommendations({
      summary,
      packet: approvalPacket,
      draftSeedSummary,
      trialWatchReport
    })
  };
}

function formatDecisionItem(item) {
  return [
    `- ${item.event_name} (${item.event_date})`,
    `  - Event ID: ${item.publication_event_id}`,
    `  - Materiality: ${item.materiality ?? "unknown"}; approval: ${item.human_approval_status}`,
    `  - Rationale: ${sentencePreview(item.rationale)}`,
    `  - Next action: ${sentencePreview(item.next_action)}`
  ].join("\n");
}

function formatPrepPacket(prep) {
  const lines = [
    "# State of the Field Prep Packet",
    "",
    `Edition: ${prep.edition_slug} (${prep.period_label})`,
    `Status: ${prep.status}`,
    `Period: ${prep.period_start} to ${prep.period_end}`,
    `Generated: ${prep.generated_at}`,
    `Next action: ${prep.required_next_action}`,
    "",
    "## Agent Recommendation",
    "",
    ...prep.agent_recommendations.map((recommendation) => `- ${recommendation}`),
    "",
    "## Publication Gate",
    "",
    `- Gate status: ${prep.publication_gate.status} (${prep.publication_gate.issue_count} issue(s))`,
    `- Approval packet items: ${prep.approval_packet_summary.reconciliation_items_in_packet}`,
    `- Human approvals needed: ${prep.approval_packet_summary.human_review_required}`,
    `- Field-activity packet items: ${prep.approval_packet_summary.field_activity_items_in_packet}`,
    `- Field-activity approvals needed: ${prep.approval_packet_summary.field_activity_human_review_required}`
  ];

  if (prep.publication_gate.issues.length > 0) {
    lines.push("", "Gate issues:");
    for (const issue of prep.publication_gate.issues) {
      lines.push(`- ${issue}`);
    }
  }

  if (prep.blockers.length > 0) {
    lines.push("", "Workflow blockers:");
    for (const blocker of prep.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  if (prep.open_checklist_items.length > 0) {
    lines.push("", "Open checklist:");
    for (const item of prep.open_checklist_items) {
      lines.push(`- ${item.id}: ${item.status} - ${item.label}`);
    }
  }

  lines.push("", "## Decision Buckets");

  for (const section of prep.decision_sections.filter((item) => item.count > 0)) {
    lines.push("", `### ${section.title} (${section.count})`, "", section.guidance, "");
    for (const item of section.items) {
      lines.push(formatDecisionItem(item), "");
    }
  }

  lines.push(
    "",
    "## Field Activity",
    "",
    `- Watchlist entries: ${prep.field_activity_watchlist.entry_count}`,
    `- Source-work candidates: ${prep.field_activity_watchlist.source_work_candidate_count}`,
    `- State-of-Field-routed watchlist items: ${prep.field_activity_watchlist.state_of_field_routed_item_count}`,
    `- Live public activity routed to State of Field: ${prep.public_activity_lenses.state_of_field_routed_count}`,
    `- Public activity lenses: ${prep.public_activity_lenses.field_anchor_count} field anchors; ${prep.public_activity_lenses.current_movement_count} current movement; ${prep.public_activity_lenses.trial_horizon_count} trial horizon; ${prep.public_activity_lenses.historical_context_count} historical context`
  );

  if (prep.public_activity_items_for_state_of_field.length > 0) {
    lines.push("", "Live activity items to reconcile:");
    for (const item of prep.public_activity_items_for_state_of_field) {
      lines.push(`- ${item.name} (${item.occurred_on ?? "date unknown"}): ${item.lenses.join(", ")}. ${item.suggested_use}`);
    }
  }

  lines.push("", "## Draft Seed");
  if (prep.draft_seed.available) {
    lines.push(
      "",
      `- Draft pool: ${prep.draft_pool_path}`,
      `- Seed status: ${prep.draft_seed.field_change_status ?? "unknown"}`,
      `- Seed what_changed: ${prep.draft_seed.what_changed_count}`,
      `- Seed current_context: ${prep.draft_seed.current_context_count}`,
      `- Seed trial_horizon: ${prep.draft_seed.trial_horizon_count}`,
      `- Seed signals_to_watch: ${prep.draft_seed.signal_count}`,
      `- Do not publish before: ${prep.draft_seed.do_not_publish_before ?? "not specified"}`
    );

    if (prep.draft_seed.field_activity_guidance.length > 0) {
      lines.push("", "Field-activity guidance from draft seed:");
      for (const item of prep.draft_seed.field_activity_guidance) {
        lines.push(`- ${item}`);
      }
    }

    if (prep.draft_seed.open_questions.length > 0) {
      lines.push("", "Open draft questions:");
      for (const question of prep.draft_seed.open_questions) {
        lines.push(`- ${question}`);
      }
    }
  } else {
    lines.push("", "- No draft seed artifact found.");
  }

  lines.push("", "## Trial Watch Input");
  if (prep.trial_watch_report.available) {
    lines.push("", `- Report: ${prep.trial_watch_report.path}`, `- Generated on: ${prep.trial_watch_report.generated_on ?? "unknown"}`);
    for (const item of prep.trial_watch_report.summary_lines) {
      lines.push(`- ${item}`);
    }
    if (prep.trial_watch_report.surveillance_use_lines.length > 0) {
      lines.push("", "Surveillance use:");
      for (const item of prep.trial_watch_report.surveillance_use_lines) {
        lines.push(`- ${item}`);
      }
    }
  } else {
    lines.push("", `- No ${trialWatchReportPath} artifact found; run npm run audit:trials -- --write before final monthly copy.`);
  }

  lines.push("", "## Source Artifacts", "");
  for (const artifact of prep.source_artifacts) {
    lines.push(`- ${artifact}`);
  }

  if (prep.written_paths?.length > 0) {
    lines.push("", "## Written Artifacts", "");
    for (const artifact of prep.written_paths) {
      lines.push(`- ${artifact}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function reconcileWorkflow({ workflow, currentStory, stateOfFieldEditions, publicationEvents, options }) {
  const { workflowEdition } = selectWorkflowEdition({
    workflow,
    currentStory,
    stateOfFieldEditions,
    editionSlug: options.edition
  });
  const eventById = new Map(publicationEvents.map((event) => [event.id, event]));
  const existingIds = new Set((workflowEdition.reconciliation_items ?? []).map((item) => item.publication_event_id));
  const candidateIds = new Map();

  addCandidateIds(candidateIds, collectCurrentStoryEventIds(currentStory), "current story");

  const defaultDraftPoolPath = `extra/state-of-field-${workflowEdition.slug}-draft.json`;
  const draftPoolPath = options.draftPoolPath ?? defaultDraftPoolPath;
  const draftPool = await readJsonIfExists(draftPoolPath);
  addCandidateIds(candidateIds, flattenDraftPoolEventIds(draftPool), draftPool ? `draft pool ${draftPoolPath}` : "draft pool");
  addCandidateIds(candidateIds, directFieldActivityEventIds(publicationEvents, workflowEdition), "direct field-activity publication");
  addCandidateIds(
    candidateIds,
    periodEventIds(publicationEvents, workflowEdition, options.includePeriodEvents),
    "non-bootstrap period event"
  );

  const addedItems = [...candidateIds.entries()]
    .filter(([eventId]) => !existingIds.has(eventId))
    .map(([eventId, source]) => {
      const event = eventById.get(eventId);
      if (!event) {
        return undefined;
      }
      return buildSeededReconciliationItem(event, source);
    })
    .filter(Boolean)
    .sort((left, right) => left.event_date.localeCompare(right.event_date) || left.publication_event_id.localeCompare(right.publication_event_id));

  const observedPublicStory = {
    path: currentStoryPath,
    last_reviewed: currentStory.revision.last_reviewed,
    latest_publication_event_id: currentStory.revision.observed_latest_publication_event_id,
    related_publication_event_ids: collectCurrentStoryEventIds(currentStory)
  };
  const observedStoryChanged = !sameJson(workflowEdition.observed_public_story, observedPublicStory);
  const changed = addedItems.length > 0 || observedStoryChanged;

  if (changed) {
    workflowEdition.reconciliation_items = [...(workflowEdition.reconciliation_items ?? []), ...addedItems];
    workflowEdition.observed_public_story = observedPublicStory;
    workflow.updated_at = new Date().toISOString();
  }

  return {
    workflow,
    changed,
    edition_slug: workflowEdition.slug,
    draft_pool_path: draftPool ? draftPoolPath : null,
    candidate_event_count: candidateIds.size,
    added_reconciliation_item_count: addedItems.length,
    added_publication_event_ids: addedItems.map((item) => item.publication_event_id),
    observed_public_story_updated: observedStoryChanged,
    include_period_events: options.includePeriodEvents
  };
}

function formatTextSummary(summary) {
  const lines = [
    `State of Field workflow status: ${summary.status}`,
    `Edition: ${summary.edition_slug} (${summary.period_label})`,
    `Current story latest public update: ${summary.current_story_latest_publication_event_id ?? "unknown"}`,
    `Current-story public updates: ${summary.current_story_event_count}`,
    `Published-edition public updates: ${summary.edition_event_count}`,
    `Missing from published edition: ${summary.missing_from_published_edition_count}`,
    `Tracked missing updates: ${summary.tracked_missing_event_count}`,
    `Untracked missing updates: ${summary.untracked_missing_event_count}`,
    `Open reconciliation decisions: ${summary.open_reconciliation_decision_count}`,
    `Decided without agent assessment: ${summary.decided_without_agent_assessment_count}`,
    `Required human approvals unresolved: ${summary.unresolved_required_human_approval_count}`,
    `Open checklist items: ${summary.open_checklist_item_count}`,
    `Field-activity watchlist entries: ${summary.field_activity_watchlist.entry_count}`,
    `Field-activity discovery channels: ${summary.field_activity_watchlist.discovery_channel_count}`,
    `Field-activity blindspot controls: ${summary.field_activity_watchlist.blindspot_control_count}`,
    `Field-activity capture recommended: ${summary.field_activity_watchlist.capture_recommended_count}`,
    `Field-activity source-work candidates: ${summary.field_activity_watchlist.source_work_candidate_count}`,
    `Field-activity publication-ready: ${summary.field_activity_watchlist.capture_recommended_count}`,
    `Field-activity human approval required: ${summary.field_activity_watchlist.human_approval_required_count}`,
    `Field-activity State-of-Field routed items: ${summary.field_activity_watchlist.state_of_field_routed_item_count}`,
    `Field-activity missing surface routing: ${summary.field_activity_watchlist.missing_surface_routing_count}`,
    `Field-activity nonblocking watch items: ${summary.field_activity_watchlist.nonblocking_watch_item_count}`,
    `Field-activity consolidated candidates: ${summary.field_activity_watchlist.consolidated_candidate_count}`,
    `Field-activity learning phase: ${summary.field_activity_watchlist.learning_phase} (${summary.field_activity_watchlist.learning_completed_pilot_sweeps}/${summary.field_activity_watchlist.learning_minimum_pilot_sweeps} pilot sweeps)`,
    `Field-activity open learning questions: ${summary.field_activity_watchlist.learning_open_question_count}`,
    `Public activity items: ${summary.public_activity_lenses.public_activity_item_count} (${summary.public_activity_lenses.activity_only_count} activity-only, ${summary.public_activity_lenses.assessment_changing_count} assessment-changing)`,
    `Public activity lenses: ${summary.public_activity_lenses.field_anchor_count} field anchors; ${summary.public_activity_lenses.current_movement_count} current movement; ${summary.public_activity_lenses.trial_horizon_count} trial horizon; ${summary.public_activity_lenses.historical_context_count} historical context`,
    `Public activity routed to State of Field: ${summary.public_activity_lenses.state_of_field_routed_count} (${summary.public_activity_lenses.state_of_field_routed_field_anchor_count} field anchors; ${summary.public_activity_lenses.state_of_field_routed_current_movement_count} current movement; ${summary.public_activity_lenses.state_of_field_routed_trial_horizon_count} trial horizon; ${summary.public_activity_lenses.state_of_field_routed_historical_context_count} historical context)`,
    `Publication gate: ${summary.publication_gate.status} (${summary.publication_gate.issue_count} issue(s))`,
    `Next action: ${summary.required_next_action}`
  ];

  if (summary.open_reconciliation_publication_event_ids.length > 0) {
    lines.push("", "Open reconciliation items:");
    for (const eventId of summary.open_reconciliation_publication_event_ids) {
      lines.push(`- ${eventId}`);
    }
  }

  if (summary.strict_issues.length > 0) {
    lines.push("", "Strict issues:");
    for (const issue of summary.strict_issues) {
      lines.push(`- ${issue}`);
    }
  }

  if (summary.publication_gate.issues.length > 0) {
    lines.push("", "Publication gate issues:");
    for (const issue of summary.publication_gate.issues) {
      lines.push(`- ${issue}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!["status", "reconcile", "packet", "prep"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }

  const [workflow, currentStory, stateOfFieldEditions, fieldActivityWatchlist, activityItems] = await Promise.all([
    readJson(workflowPath),
    readJson(currentStoryPath),
    readJsonCollection(stateOfFieldRoot),
    readJsonIfExists(fieldActivityWatchlistPath),
    readJsonCollection(activityItemsRoot)
  ]);

  if (options.command === "status") {
    const summary = summarizeWorkflow(
      workflow,
      currentStory,
      stateOfFieldEditions,
      fieldActivityWatchlist,
      activityItems,
      options.edition
    );

    process.stdout.write(options.json ? `${JSON.stringify(summary, null, 2)}\n` : formatTextSummary(summary));

    if (options.strict && summary.strict_issues.length > 0) {
      process.exit(1);
    }

    return;
  }

  const publicationEvents = await readJsonCollection(publicationEventRoot);

  if (options.command === "prep") {
    const { workflowEdition } = selectWorkflowEdition({
      workflow,
      currentStory,
      stateOfFieldEditions,
      editionSlug: options.edition
    });
    const defaultDraftPoolPath = `extra/state-of-field-${workflowEdition.slug}-draft.json`;
    const draftPoolPath = options.draftPoolPath ?? defaultDraftPoolPath;
    const [draftPool, trialWatchReportText] = await Promise.all([
      readJsonIfExists(draftPoolPath),
      readTextIfExists(trialWatchReportPath)
    ]);
    const prep = buildPrepPacket({
      workflow,
      currentStory,
      stateOfFieldEditions,
      publicationEvents,
      fieldActivityWatchlist,
      activityItems,
      draftPool,
      draftPoolPath,
      trialWatchReportText,
      options: { ...options, edition: workflowEdition.slug }
    });

    if (options.write) {
      const jsonPath = `extra/state-of-field-${prep.edition_slug}-prep.json`;
      const markdownPath = `extra/state-of-field-${prep.edition_slug}-prep.md`;
      prep.written_paths = [jsonPath, markdownPath];
      await writeJson(jsonPath, prep);
      await writeText(markdownPath, formatPrepPacket(prep));
    }

    process.stdout.write(options.json ? `${JSON.stringify(prep, null, 2)}\n` : formatPrepPacket(prep));
    return;
  }

  if (options.command === "packet") {
    const packet = buildApprovalPacket({
      workflow,
      currentStory,
      stateOfFieldEditions,
      publicationEvents,
      fieldActivityWatchlist,
      activityItems,
      options
    });

    process.stdout.write(options.json ? `${JSON.stringify(packet, null, 2)}\n` : formatApprovalPacket(packet));
    return;
  }

  const reconciliation = await reconcileWorkflow({
    workflow,
    currentStory,
    stateOfFieldEditions,
    publicationEvents,
    options
  });

  if (options.write && reconciliation.changed) {
    await writeJson(workflowPath, reconciliation.workflow);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ ...reconciliation, workflow: undefined }, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `State of Field reconciliation: ${reconciliation.changed ? "updated" : "current"}`,
      `Edition: ${reconciliation.edition_slug}`,
      `Candidate public updates: ${reconciliation.candidate_event_count}`,
      `Added reconciliation items: ${reconciliation.added_reconciliation_item_count}`,
      `Observed public story updated: ${reconciliation.observed_public_story_updated}`,
      `Draft pool: ${reconciliation.draft_pool_path ?? "none"}`,
      `Period event sweep: ${reconciliation.include_period_events ? "enabled" : "disabled"}`,
      options.write
        ? reconciliation.changed
          ? `Wrote ${workflowPath}.`
          : "No write needed."
        : "Dry run only; pass --write to update the workflow manifest.",
      ...(reconciliation.added_publication_event_ids.length > 0
        ? ["", "Added publication events:", ...reconciliation.added_publication_event_ids.map((eventId) => `- ${eventId}`)]
        : [])
    ].join("\n") + "\n"
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
