#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { datePart } from "./editorial-freshness.mjs";

const workspaceRoot = process.cwd();
const workflowPath = "ops/state-of-field-workflow.v1.json";
const currentStoryPath = "data/content/current-lev-story/current.json";
const stateOfFieldRoot = "data/content/state-of-the-field";
const publicationEventRoot = "data/publication-events";

function usage() {
  return `Usage:
  npm run state-of-field:status [-- --strict] [--json]
  npm run state-of-field:reconcile [-- --write] [--edition YYYY-MM] [--draft-pool PATH] [--include-period-events] [--json]
  npm run state-of-field:packet [-- --edition YYYY-MM] [--all] [--json]

Options:
  --strict  Fail when current-story/public-edition publication-event mismatches are not tracked.
  --write   Update ${workflowPath} when reconciliation items or observed story metadata are missing.
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

async function writeJson(relativePath, value) {
  const filePath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function latestByDate(records) {
  return [...records].sort((left, right) => String(right.date ?? "").localeCompare(String(left.date ?? "")))[0];
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

function summarizeWorkflow(workflow, currentStory, stateOfFieldEditions) {
  const { latestEdition, workflowEdition } = selectWorkflowEdition({
    workflow,
    currentStory,
    stateOfFieldEditions
  });

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

  if (untrackedMissing.length > 0) {
    strictIssues.push(
      `${untrackedMissing.length} current-story public update(s) are missing from the published edition and untracked in ${workflowPath}.`
    );
  }

  if (workflowEdition.status === "published" && (openDecisions.length > 0 || openChecklist.length > 0)) {
    strictIssues.push("Workflow status is published but reconciliation decisions or checklist items are still open.");
  }

  if (["in_review", "published"].includes(workflowEdition.status)) {
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

function buildApprovalPacket({ workflow, currentStory, stateOfFieldEditions, publicationEvents, options }) {
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
    items: packetItems
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
    `- Blockers recorded: ${packet.blocker_count}`
  ];

  if (packet.items.length === 0) {
    lines.push("", "No reconciliation items need approval packet review.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("", "## Items");

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

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!["status", "reconcile", "packet"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }

  const [workflow, currentStory, stateOfFieldEditions] = await Promise.all([
    readJson(workflowPath),
    readJson(currentStoryPath),
    readJsonCollection(stateOfFieldRoot)
  ]);

  if (options.command === "status") {
    const summary = summarizeWorkflow(workflow, currentStory, stateOfFieldEditions);

    process.stdout.write(options.json ? `${JSON.stringify(summary, null, 2)}\n` : formatTextSummary(summary));

    if (options.strict && summary.strict_issues.length > 0) {
      process.exit(1);
    }

    return;
  }

  const publicationEvents = await readJsonCollection(publicationEventRoot);

  if (options.command === "packet") {
    const packet = buildApprovalPacket({
      workflow,
      currentStory,
      stateOfFieldEditions,
      publicationEvents,
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
