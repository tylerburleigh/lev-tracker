#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { datePart } from "./editorial-freshness.mjs";

const workspaceRoot = process.cwd();
const watchlistPath = "research/backlog/field-activity-watchlist.v1.json";
const activityItemsRoot = "data/activity-items";
const sessionsRoot = "research/sessions";
const monthlySweepTypes = new Set(["monthly_cross_field"]);
const openApprovalStatuses = new Set(["requested", "revise"]);
const resolvedApprovalStatuses = new Set(["approved", "rejected", "not_required"]);

function usage() {
  return `Usage:
  npm run field-activity:status [-- --json]
  npm run field-activity:packet [-- --all] [--json]

Options:
  --all   Include captured and consolidated items in packet detail.
  --json  Print machine-readable output.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("--")) ?? "status";

  return {
    command,
    all: args.includes("--all"),
    help: args.includes("--help") || args.includes("-h"),
    json: args.includes("--json")
  };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(workspaceRoot, relativePath), "utf8"));
}

async function readCollection(relativeDir) {
  const directoryPath = path.join(workspaceRoot, relativeDir);
  const fileNames = (await fs.readdir(directoryPath))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(fileNames.map((fileName) => readJson(path.join(relativeDir, fileName))));
}

function flattenCandidateEvents(watchlist) {
  return (watchlist.entries ?? []).flatMap((entry) =>
    (entry.candidate_events ?? []).map((event) => ({
      entry,
      event
    }))
  );
}

function publicCopyAction(event) {
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

function humanApprovalNeeded(event) {
  const approvalStatus = event.human_approval?.status;
  return (
    openApprovalStatuses.has(approvalStatus) ||
    (event.agent_assessment?.human_review_required === true && approvalStatus !== "approved")
  );
}

function publicationReady(event) {
  const approvalStatus = event.human_approval?.status;
  return (
    event.classification === "capture_now" &&
    !humanApprovalNeeded(event) &&
    (resolvedApprovalStatuses.has(approvalStatus) || event.agent_assessment?.human_review_required === false)
  );
}

function sourceWorkHold(event) {
  return event.classification === "research_more" && publicCopyAction(event) === "hold_for_source";
}

function stateOfFieldRouted(event) {
  return event.surface_routing?.state_of_field_review_required || event.surface_routing?.current_story_review_required;
}

function missingSurfaceRouting(event) {
  return ["capture_now", "research_more"].includes(event.classification) && !event.surface_routing;
}

function monthPart(value) {
  return datePart(value)?.slice(0, 7);
}

function timestampValue(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestBy(records, accessor) {
  return records
    .filter((record) => accessor(record))
    .sort((left, right) => timestampValue(accessor(right)) - timestampValue(accessor(left)))[0];
}

function firstDayOfNextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

function buildSummary({ watchlist, activityItems, sessions }) {
  const candidateRows = flattenCandidateEvents(watchlist);
  const candidateEvents = candidateRows.map(({ event }) => event);
  const fieldActivitySessions = sessions.filter((session) => session.mode === "field_activity");
  const latestFieldActivitySession = latestBy(fieldActivitySessions, (session) => session.completed_at);
  const latestMonthlySweepSession = latestBy(
    fieldActivitySessions.filter((session) => monthlySweepTypes.has(session.field_activity_sweep_type)),
    (session) => session.completed_at
  );
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthlySweepCompleteForCurrentMonth = monthPart(latestMonthlySweepSession?.completed_at) === currentMonth;
  const learningLoop = watchlist.learning_loop ?? {};
  const learningQuestions = learningLoop.current_learning_questions ?? [];
  const revisionTriggers = learningLoop.revision_triggers ?? [];

  return {
    watchlist_path: watchlistPath,
    updated_at: watchlist.updated_at,
    entry_count: watchlist.entries?.length ?? 0,
    discovery_channel_count: watchlist.discovery_channels?.length ?? 0,
    blindspot_control_count: watchlist.blindspot_controls?.length ?? 0,
    live_activity_item_count: activityItems.length,
    live_field_activity_item_count: activityItems.filter((item) => (item.tags ?? []).includes("field-activity")).length,
    candidate_count: candidateEvents.length,
    captured_item_count: candidateEvents.filter((event) => event.classification === "captured").length,
    capture_now_count: candidateEvents.filter((event) => event.classification === "capture_now").length,
    source_work_candidate_count: candidateEvents.filter(sourceWorkHold).length,
    human_approval_required_count: candidateEvents.filter(humanApprovalNeeded).length,
    publication_ready_count: candidateEvents.filter(publicationReady).length,
    consolidated_item_count: candidateEvents.filter((event) => event.classification === "captured_by_related_item").length,
    state_of_field_routed_item_count: candidateEvents.filter(stateOfFieldRouted).length,
    missing_surface_routing_count: candidateEvents.filter(missingSurfaceRouting).length,
    nonblocking_watch_item_count: candidateEvents.filter(
      (event) =>
        !humanApprovalNeeded(event) &&
        (sourceWorkHold(event) || ["watch_only", "below_threshold"].includes(event.noteworthiness_tier))
    ).length,
    learning_phase: learningLoop.phase ?? "unknown",
    learning_cadence: learningLoop.cadence ?? "unknown",
    learning_completed_pilot_sweeps: learningLoop.completed_pilot_sweeps ?? 0,
    learning_minimum_pilot_sweeps: learningLoop.minimum_pilot_sweeps ?? 0,
    learning_open_question_count: learningQuestions.filter((question) => question.status === "open").length,
    active_revision_trigger_count: revisionTriggers.filter((trigger) => trigger.status !== "resolved").length,
    latest_field_activity_session_at: latestFieldActivitySession?.completed_at ?? null,
    latest_field_activity_sweep_type: latestFieldActivitySession?.field_activity_sweep_type ?? null,
    latest_monthly_cross_field_sweep_at: latestMonthlySweepSession?.completed_at ?? null,
    monthly_sweep_complete_for_current_month: monthlySweepCompleteForCurrentMonth,
    next_monthly_sweep_due_on: monthlySweepCompleteForCurrentMonth ? firstDayOfNextMonth(now) : now.toISOString().slice(0, 10)
  };
}

function packetRow({ entry, event }, index) {
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
    public_copy_action: publicCopyAction(event),
    human_approval_needed: humanApprovalNeeded(event),
    human_approval_status: event.human_approval?.status ?? "not_recorded",
    human_approval_notes: event.human_approval?.notes ?? null,
    agent_assessment: event.agent_assessment ?? null,
    rationale: event.rationale,
    recommended_public_action: event.recommended_public_action ?? null,
    surface_routing: event.surface_routing ?? null,
    related_activity_item_ids: event.related_activity_item_ids ?? [],
    consolidation_note: event.consolidation_note ?? null
  };
}

function buildPacket({ watchlist, includeAll }) {
  const rows = flattenCandidateEvents(watchlist);
  const humanApprovalItems = rows.filter(({ event }) => humanApprovalNeeded(event));
  const publicationReadyItems = rows.filter(({ event }) => publicationReady(event));
  const sourceWorkItems = rows.filter(({ event }) => sourceWorkHold(event));
  const consolidatedItems = rows.filter(({ event }) => event.classification === "captured_by_related_item");
  const capturedItems = rows.filter(({ event }) => event.classification === "captured");

  return {
    generated_at: new Date().toISOString(),
    watchlist_path: watchlistPath,
    updated_at: watchlist.updated_at,
    human_approval_required_count: humanApprovalItems.length,
    publication_ready_count: publicationReadyItems.length,
    source_work_candidate_count: sourceWorkItems.length,
    consolidated_item_count: consolidatedItems.length,
    captured_item_count: capturedItems.length,
    human_approval_items: humanApprovalItems.map(packetRow),
    publication_ready_items: publicationReadyItems.map(packetRow),
    source_work_items: sourceWorkItems.map(packetRow),
    consolidated_items: consolidatedItems.map(packetRow),
    captured_items: includeAll ? capturedItems.map(packetRow) : []
  };
}

function formatStatus(summary) {
  return `${[
    "Field Activity Status",
    "",
    `Watchlist: ${summary.watchlist_path}`,
    `Updated: ${summary.updated_at}`,
    `Watch entries: ${summary.entry_count}`,
    `Discovery channels: ${summary.discovery_channel_count}`,
    `Blindspot controls: ${summary.blindspot_control_count}`,
    `Live activity items: ${summary.live_activity_item_count}`,
    `Live field-activity items: ${summary.live_field_activity_item_count}`,
    "",
    "Queue",
    `Captured watchlist items: ${summary.captured_item_count}`,
    `Capture-now items: ${summary.capture_now_count}`,
    `Publication-ready items: ${summary.publication_ready_count}`,
    `Human approval required: ${summary.human_approval_required_count}`,
    `Source-work candidates: ${summary.source_work_candidate_count}`,
    `Nonblocking watch items: ${summary.nonblocking_watch_item_count}`,
    `Consolidated items: ${summary.consolidated_item_count}`,
    `State-of-Field routed items: ${summary.state_of_field_routed_item_count}`,
    `Missing surface routing: ${summary.missing_surface_routing_count}`,
    "",
    "Cadence",
    `Latest field-activity session: ${summary.latest_field_activity_session_at ?? "none"}`,
    `Latest field-activity sweep type: ${summary.latest_field_activity_sweep_type ?? "none"}`,
    `Latest monthly cross-field sweep: ${summary.latest_monthly_cross_field_sweep_at ?? "none"}`,
    `Current month satisfied: ${summary.monthly_sweep_complete_for_current_month ? "yes" : "no"}`,
    `Next monthly sweep due: ${summary.next_monthly_sweep_due_on}`,
    "",
    "Learning",
    `Phase: ${summary.learning_phase}`,
    `Cadence: ${summary.learning_cadence}`,
    `Pilot sweeps: ${summary.learning_completed_pilot_sweeps}/${summary.learning_minimum_pilot_sweeps}`,
    `Open learning questions: ${summary.learning_open_question_count}`,
    `Active revision triggers: ${summary.active_revision_trigger_count}`
  ].join("\n")}\n`;
}

function formatItem(item) {
  const lines = [
    `### ${item.index}. ${item.event_label}`,
    "",
    `- Watch entry: ${item.watch_entry_name} (${item.watch_entry_id})`,
    `- Event ID: ${item.event_id}`,
    `- Event date: ${item.occurred_on ?? "unknown"}`,
    `- Classification: ${item.classification}`,
    `- Activity: ${item.activity_type} / ${item.activity_lane}`,
    `- Scope: ${item.scope_label ?? "unspecified"}`,
    `- Noteworthiness: ${item.noteworthiness_tier}`,
    `- Threshold basis: ${item.threshold_basis.join(", ") || "none"}`,
    `- Source quality: ${item.source_quality}`,
    `- Public copy action: ${item.public_copy_action}`,
    `- Human approval needed: ${item.human_approval_needed ? "yes" : "no"}`,
    `- Human approval status: ${item.human_approval_status}`,
    `- Rationale: ${item.rationale}`
  ];

  if (item.agent_assessment) {
    lines.push(`- Agent rationale: ${item.agent_assessment.rationale}`);
  }
  if (item.human_approval_notes) {
    lines.push(`- Human approval notes: ${item.human_approval_notes}`);
  }
  if (item.source_url) {
    lines.push(`- Source URL: ${item.source_url}`);
  }
  if (item.recommended_public_action) {
    lines.push(`- Recommended public action: ${item.recommended_public_action}`);
  }
  if (item.surface_routing) {
    lines.push(
      `- Surface routing: ${(item.surface_routing.affected_surfaces ?? []).join(", ") || "none"}; State of Field ${item.surface_routing.state_of_field_review_required ? "yes" : "no"}; Current Story ${item.surface_routing.current_story_review_required ? "yes" : "no"}`
    );
  }
  if (item.related_activity_item_ids.length > 0) {
    lines.push(`- Related activity items: ${item.related_activity_item_ids.join(", ")}`);
  }
  if (item.consolidation_note) {
    lines.push(`- Consolidation note: ${item.consolidation_note}`);
  }

  return lines.join("\n");
}

function pushSection(lines, title, items, emptyText) {
  lines.push("", `## ${title}`);
  if (items.length === 0) {
    lines.push("", emptyText);
    return;
  }

  for (const item of items) {
    lines.push("", formatItem(item));
  }
}

function formatPacket(packet) {
  const lines = [
    "# Field Activity Packet",
    "",
    `Updated: ${packet.updated_at}`,
    "",
    "## Summary",
    "",
    `- Human approval required: ${packet.human_approval_required_count}`,
    `- Publication-ready: ${packet.publication_ready_count}`,
    `- Source-work candidates: ${packet.source_work_candidate_count}`,
    `- Consolidated items: ${packet.consolidated_item_count}`,
    `- Captured items: ${packet.captured_item_count}`
  ];

  pushSection(lines, "Needs Human Approval", packet.human_approval_items, "No field-activity candidates need human approval.");
  pushSection(lines, "Publication-Ready", packet.publication_ready_items, "No approved capture-now items are waiting for publication.");
  pushSection(lines, "Source-Work Holds", packet.source_work_items, "No source-work holds are queued.");
  pushSection(lines, "Consolidated Items", packet.consolidated_items, "No consolidated field-activity candidates are recorded.");

  if (packet.captured_items.length > 0) {
    pushSection(lines, "Captured Items", packet.captured_items, "No captured items are recorded.");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!["status", "packet"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }

  const [watchlist, activityItems, sessions] = await Promise.all([
    readJson(watchlistPath),
    readCollection(activityItemsRoot),
    readCollection(sessionsRoot)
  ]);

  if (options.command === "status") {
    const summary = buildSummary({ watchlist, activityItems, sessions });
    process.stdout.write(options.json ? `${JSON.stringify(summary, null, 2)}\n` : formatStatus(summary));
    return;
  }

  const packet = buildPacket({ watchlist, includeAll: options.all });
  process.stdout.write(options.json ? `${JSON.stringify(packet, null, 2)}\n` : formatPacket(packet));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
