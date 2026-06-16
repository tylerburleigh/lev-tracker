#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { datePart } from "./editorial-freshness.mjs";

const workspaceRoot = process.cwd();
const directActivityPublicationRoute = "direct_activity_publish";
const outputJsonPath = "extra/state-of-field-event-date-audit.json";
const outputMarkdownPath = "extra/state-of-field-event-date-audit.md";

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    write: args.includes("--write"),
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h")
  };
}

function usage() {
  return `Usage:
  npm run state-of-field:dates [-- --write] [--json]

Audits State of the Field period-date inputs:
- direct activity publications use activity_item.occurred_on
- candidate-bundle publications report available source/study/finding date signals for agent judgment`;
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function recordMap(records) {
  return new Map(records.map((record) => [record.id, record]));
}

function monthKey(value) {
  return value?.slice(0, 7) ?? null;
}

function isBeforeMonth(leftDate, rightDate) {
  const leftMonth = monthKey(leftDate);
  const rightMonth = monthKey(rightDate);
  return Boolean(leftMonth && rightMonth && leftMonth < rightMonth);
}

function directActivityTargets(event, activityItemsById) {
  return (event.published_targets ?? [])
    .filter((target) => target.record_type === "activity_item")
    .map((target) => activityItemsById.get(target.record_id))
    .filter(Boolean);
}

function collectDateSignalsFromTarget(target, maps) {
  if (target.record_type === "activity_item") {
    const activityItem = maps.activityItemsById.get(target.record_id);
    return activityItem?.occurred_on
      ? [
          {
            record_type: "activity_item",
            record_id: target.record_id,
            date: activityItem.occurred_on,
            basis: "activity_item.occurred_on"
          }
        ]
      : [];
  }

  if (target.record_type === "source") {
    const source = maps.sourcesById.get(target.record_id);
    return source?.published_on
      ? [
          {
            record_type: "source",
            record_id: target.record_id,
            date: source.published_on,
            basis: "source.published_on"
          }
        ]
      : [];
  }

  if (target.record_type === "study") {
    const study = maps.studiesById.get(target.record_id);
    if (!study) {
      return [];
    }

    return [
      ["study.trial_details.results_first_posted_date", study.trial_details?.results_first_posted_date],
      ["study.trial_details.registry_last_updated", study.trial_details?.registry_last_updated],
      ["study.trial_details.primary_completion_date", study.trial_details?.primary_completion_date],
      ["study.trial_details.study_completion_date", study.trial_details?.study_completion_date],
      ["study.dates.end_date", study.dates?.end_date],
      ["study.dates.start_date", study.dates?.start_date]
    ]
      .filter(([, value]) => Boolean(value))
      .map(([basis, date]) => ({
        record_type: "study",
        record_id: target.record_id,
        date,
        basis
      }));
  }

  if (target.record_type === "finding") {
    const finding = maps.findingsById.get(target.record_id);
    if (!finding) {
      return [];
    }

    return [
      ...collectDateSignalsFromTarget({ record_type: "source", record_id: finding.source_id }, maps),
      ...(finding.study_id ? collectDateSignalsFromTarget({ record_type: "study", record_id: finding.study_id }, maps) : [])
    ].map((signal) => ({
      ...signal,
      via_record_type: "finding",
      via_record_id: target.record_id
    }));
  }

  return [];
}

function summarizeSignals(signals) {
  const dates = unique(signals.map((signal) => signal.date)).sort((left, right) => left.localeCompare(right));
  return {
    date_signal_count: signals.length,
    distinct_date_count: dates.length,
    earliest_date_signal: dates[0] ?? null,
    latest_date_signal: dates.at(-1) ?? null,
    bases: unique(signals.map((signal) => signal.basis)).sort((left, right) => left.localeCompare(right))
  };
}

function auditDirectActivityEvent(event, activityItemsById) {
  const trackerDate = datePart(event.published_at);
  const activityTargets = directActivityTargets(event, activityItemsById);
  const activityDates = unique(activityTargets.map((item) => item.occurred_on)).sort((left, right) =>
    left.localeCompare(right)
  );

  return {
    publication_event_id: event.id,
    tracker_published_on: trackerDate,
    field_event_dates: activityDates,
    field_event_date: activityDates[0] ?? null,
    date_basis: activityDates.length > 0 ? "activity_item.occurred_on" : "missing_activity_item.occurred_on",
    date_month_differs_from_tracker_month: activityDates.some((date) => monthKey(date) !== monthKey(trackerDate)),
    activity_item_ids: activityTargets.map((item) => item.id),
    state_of_field_routed_activity_item_ids: activityTargets
      .filter((item) => (item.surface_routing?.affected_surfaces ?? []).includes("state_of_field") || item.surface_routing?.state_of_field_review_required)
      .map((item) => item.id)
  };
}

function auditCandidateBundleEvent(event, maps) {
  const trackerDate = datePart(event.published_at);
  const signals = (event.published_targets ?? []).flatMap((target) => collectDateSignalsFromTarget(target, maps));
  const summary = summarizeSignals(signals);
  const olderThanTrackerMonth = signals.filter((signal) => isBeforeMonth(signal.date, trackerDate));

  return {
    publication_event_id: event.id,
    candidate_bundle_id: event.candidate_bundle_id ?? null,
    tracker_published_on: trackerDate,
    date_basis: "publication_event.published_at",
    ...summary,
    target_date_signals_before_tracker_month: olderThanTrackerMonth.length,
    needs_agent_date_judgment:
      olderThanTrackerMonth.length > 0 || summary.distinct_date_count > 1 || summary.date_signal_count === 0,
    note:
      summary.date_signal_count === 0
        ? "No target source/study/finding date signal was available; use tracker publication date unless the agent records a better basis."
        : "Candidate-bundle updates may combine source dates, trial registry dates, and outlook edits; an agent must decide whether any signal is the field-event date for monthly placement.",
    sample_signals: signals
      .sort((left, right) => left.date.localeCompare(right.date) || left.record_id.localeCompare(right.record_id))
      .slice(0, 8)
  };
}

function buildAudit({ publicationEvents, activityItems, sources, studies, findings }) {
  const maps = {
    activityItemsById: recordMap(activityItems),
    sourcesById: recordMap(sources),
    studiesById: recordMap(studies),
    findingsById: recordMap(findings)
  };
  const direct_activity_publications = publicationEvents
    .filter((event) => event.publication_route === directActivityPublicationRoute)
    .map((event) => auditDirectActivityEvent(event, maps.activityItemsById))
    .sort((left, right) =>
      String(left.field_event_date ?? "").localeCompare(String(right.field_event_date ?? "")) ||
      left.publication_event_id.localeCompare(right.publication_event_id)
    );
  const candidate_bundle_publications = publicationEvents
    .filter((event) => event.publication_route !== directActivityPublicationRoute)
    .map((event) => auditCandidateBundleEvent(event, maps))
    .sort((left, right) =>
      String(left.tracker_published_on ?? "").localeCompare(String(right.tracker_published_on ?? "")) ||
      left.publication_event_id.localeCompare(right.publication_event_id)
    );

  return {
    generated_at: new Date().toISOString(),
    summary: {
      publication_event_count: publicationEvents.length,
      direct_activity_publication_count: direct_activity_publications.length,
      direct_activity_month_mismatch_count: direct_activity_publications.filter(
        (item) => item.date_month_differs_from_tracker_month
      ).length,
      candidate_bundle_publication_count: candidate_bundle_publications.length,
      candidate_bundle_needs_agent_date_judgment_count: candidate_bundle_publications.filter(
        (item) => item.needs_agent_date_judgment
      ).length,
      candidate_bundle_no_target_date_signal_count: candidate_bundle_publications.filter(
        (item) => item.date_signal_count === 0
      ).length
    },
    direct_activity_publications,
    candidate_bundle_publications
  };
}

function formatAudit(audit) {
  const lines = [
    "# State of Field Event-Date Audit",
    "",
    `Generated: ${audit.generated_at}`,
    "",
    "## Summary",
    "",
    `- Publication events: ${audit.summary.publication_event_count}`,
    `- Direct activity publications: ${audit.summary.direct_activity_publication_count}`,
    `- Direct activity events whose field month differs from tracker publication month: ${audit.summary.direct_activity_month_mismatch_count}`,
    `- Candidate-bundle publications: ${audit.summary.candidate_bundle_publication_count}`,
    `- Candidate-bundle updates needing agent date judgment: ${audit.summary.candidate_bundle_needs_agent_date_judgment_count}`,
    `- Candidate-bundle updates with no target date signal: ${audit.summary.candidate_bundle_no_target_date_signal_count}`,
    "",
    "## Direct Activity Publications",
    "",
    "These should use `activity_item.occurred_on` for monthly placement; tracker `published_at` is audit metadata.",
    ""
  ];

  for (const item of audit.direct_activity_publications) {
    lines.push(
      `- ${item.publication_event_id}: field date ${item.field_event_date ?? "missing"}; tracker date ${item.tracker_published_on ?? "missing"}; activity ${item.activity_item_ids.join(", ") || "none"}${item.date_month_differs_from_tracker_month ? " [month differs]" : ""}`
    );
  }

  lines.push(
    "",
    "## Candidate-Bundle Publications",
    "",
    "These currently use `publication_event.published_at` for workflow seeding. Source, study, and finding date signals are listed for agent judgment because a bundle can contain multiple underlying field dates.",
    ""
  );

  for (const item of audit.candidate_bundle_publications.filter((entry) => entry.needs_agent_date_judgment)) {
    lines.push(
      `- ${item.publication_event_id}: tracker date ${item.tracker_published_on ?? "missing"}; date signals ${item.date_signal_count}; range ${item.earliest_date_signal ?? "none"} to ${item.latest_date_signal ?? "none"}; bases ${item.bases.join(", ") || "none"}`
    );
  }

  return `${lines.join("\n")}\n`;
}

function formatAuditSummary(audit) {
  return [
    "State of Field event-date audit: wrote artifacts",
    `Publication events: ${audit.summary.publication_event_count}`,
    `Direct activity publications: ${audit.summary.direct_activity_publication_count}`,
    `Direct activity month mismatches: ${audit.summary.direct_activity_month_mismatch_count}`,
    `Candidate-bundle updates needing agent date judgment: ${audit.summary.candidate_bundle_needs_agent_date_judgment_count}`,
    `Candidate-bundle updates with no target date signal: ${audit.summary.candidate_bundle_no_target_date_signal_count}`,
    `Artifacts: ${outputJsonPath}, ${outputMarkdownPath}`
  ].join("\n");
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const [publicationEvents, activityItems, sources, studies, findings] = await Promise.all([
    readJsonCollection("data/publication-events"),
    readJsonCollection("data/activity-items"),
    readJsonCollection("data/sources"),
    readJsonCollection("data/studies"),
    readJsonCollection("data/findings")
  ]);
  const audit = buildAudit({ publicationEvents, activityItems, sources, studies, findings });

  if (options.write) {
    await writeJson(outputJsonPath, audit);
    await writeText(outputMarkdownPath, formatAudit(audit));
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  } else if (options.write) {
    process.stdout.write(`${formatAuditSummary(audit)}\n`);
  } else {
    process.stdout.write(formatAudit(audit));
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
