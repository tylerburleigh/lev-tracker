#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const workflowPath = "ops/state-of-field-workflow.v1.json";
const currentStoryPath = "data/content/current-lev-story/current.json";
const stateOfFieldRoot = "data/content/state-of-the-field";

function usage() {
  return `Usage:
  npm run state-of-field:status [-- --strict] [--json]

Options:
  --strict  Fail when current-story/public-edition publication-event mismatches are not tracked.
  --json    Print machine-readable status.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("--")) ?? "status";

  return {
    command,
    help: args.includes("--help") || args.includes("-h"),
    strict: args.includes("--strict"),
    json: args.includes("--json")
  };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(workspaceRoot, relativePath), "utf8"));
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

function collectCurrentStoryEventIds(currentStory) {
  return unique([
    ...(currentStory.related_publication_event_ids ?? []),
    ...(currentStory.recent_developments ?? []).flatMap((item) => item.related_publication_event_ids ?? [])
  ]).sort((left, right) => left.localeCompare(right));
}

function summarizeWorkflow(workflow, currentStory, stateOfFieldEditions) {
  const relatedSlug = currentStory.related_state_of_field_slug;
  const latestEdition = stateOfFieldEditions.find((edition) => edition.slug === relatedSlug) ?? latestByDate(stateOfFieldEditions);
  const activeStatuses = new Set(["draft", "reconciling", "needs_surveillance", "in_review", "blocked"]);
  const activeWorkflowEdition = workflow.editions
    .filter((edition) => activeStatuses.has(edition.status))
    .sort((left, right) => String(right.status_updated_at ?? "").localeCompare(String(left.status_updated_at ?? "")))[0];
  const workflowEdition = activeWorkflowEdition ?? workflow.editions.find((edition) => edition.slug === latestEdition?.slug);

  if (!latestEdition) {
    throw new Error("No State of the Field edition exists under data/content/state-of-the-field.");
  }

  if (!workflowEdition) {
    throw new Error(`No workflow state found for State of the Field edition ${latestEdition.slug}.`);
  }

  const currentStoryEventIds = collectCurrentStoryEventIds(currentStory);
  const editionEventIds = new Set(latestEdition.related_publication_event_ids ?? []);
  const trackedEventIds = new Set((workflowEdition.reconciliation_items ?? []).map((item) => item.publication_event_id));
  const missingFromEdition = currentStoryEventIds.filter((eventId) => !editionEventIds.has(eventId));
  const untrackedMissing = missingFromEdition.filter((eventId) => !trackedEventIds.has(eventId));
  const openDecisions = (workflowEdition.reconciliation_items ?? []).filter((item) => item.decision === "needs_decision");
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
    open_checklist_item_count: openChecklist.length,
    missing_from_published_edition: missingFromEdition,
    untracked_missing_publication_event_ids: untrackedMissing,
    open_reconciliation_publication_event_ids: openDecisions.map((item) => item.publication_event_id),
    required_next_action: workflowEdition.required_next_action,
    strict_issues: strictIssues
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

  if (options.command !== "status") {
    throw new Error(`Unknown command: ${options.command}`);
  }

  const [workflow, currentStory, stateOfFieldEditions] = await Promise.all([
    readJson(workflowPath),
    readJson(currentStoryPath),
    readJsonCollection(stateOfFieldRoot)
  ]);
  const summary = summarizeWorkflow(workflow, currentStory, stateOfFieldEditions);

  process.stdout.write(options.json ? `${JSON.stringify(summary, null, 2)}\n` : formatTextSummary(summary));

  if (options.strict && summary.strict_issues.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
