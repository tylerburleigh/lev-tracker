#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const reportPath = "extra/trial-watch-report.md";
const studyRoot = "data/studies";
const sourceRoot = "data/sources";
const trackTaxonomyPath = "taxonomies/track-taxonomy.v1.json";

const resultStatusLabels = {
  posted: "posted results",
  not_posted: "no posted results",
  pending: "not expected yet",
  unknown: "unknown result status"
};

const studyStatusLabels = {
  planned: "planned",
  recruiting: "recruiting",
  active: "active",
  completed: "completed",
  terminated: "terminated",
  withdrawn: "withdrawn",
  suspended: "suspended",
  unknown: "unknown"
};

function usage() {
  return `Usage:
  npm run audit:trials [-- --write] [-- --track TRACK_ID] [-- --today YYYY-MM-DD] [-- --stale-days N]

Options:
  --write         Write ${reportPath}.
  --track ID     Limit the report to one track.
  --today DATE   Date used for stale-check calculations. Defaults to today's date.
  --stale-days N Mark registry checks older than N days as stale. Defaults to 90.`;
}

function parseIntegerOption(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) {
    return fallback;
  }

  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

function parseStringOption(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const today = parseStringOption(args, "--today") ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error("--today must be an ISO date such as 2026-06-06.");
  }

  return {
    help: args.includes("--help") || args.includes("-h"),
    write: args.includes("--write"),
    track: parseStringOption(args, "--track"),
    today,
    staleDays: parseIntegerOption(args, "--stale-days", 90)
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

async function readCollection(relativeDir) {
  const dirPath = workspacePath(relativeDir);

  try {
    const fileNames = (await fs.readdir(dirPath))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(
      fileNames.map(async (fileName) => ({
        relativePath: path.posix.join(relativeDir, fileName),
        value: await readJson(path.join(relativeDir, fileName))
      }))
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeText(relativePath, value) {
  const filePath = workspacePath(relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

function daysBetween(leftIsoDate, rightIsoDate) {
  const left = Date.parse(`${leftIsoDate}T00:00:00Z`);
  const right = Date.parse(`${rightIsoDate}T00:00:00Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return undefined;
  }

  return Math.floor((right - left) / 86_400_000);
}

function normalizeResultStatus(study) {
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

function completionDate(study) {
  return (
    study.trial_details?.primary_completion_date ??
    study.trial_details?.study_completion_date ??
    study.dates?.end_date
  );
}

function latestRegistryDate(study) {
  return study.trial_details?.registry_last_checked ?? study.trial_details?.registry_last_updated;
}

function buildTrackNames(trackTaxonomy) {
  const namesById = new Map();

  for (const group of trackTaxonomy.hallmark_groups ?? []) {
    for (const track of group.tracks ?? []) {
      namesById.set(track.id, track.name);
    }
  }

  return namesById;
}

function buildSourcesByRegistryId(sourceRecords) {
  const byRegistryId = new Map();

  for (const { value: source } of sourceRecords) {
    for (const registryId of source.registry_ids ?? []) {
      const normalizedRegistryId = registryId.trim().toUpperCase();
      const list = byRegistryId.get(normalizedRegistryId) ?? [];
      list.push(source);
      byRegistryId.set(normalizedRegistryId, list);
    }
  }

  return byRegistryId;
}

function decorateTrial({ study, filePath, sourceRecords, options }) {
  const resultStatus = normalizeResultStatus(study);
  const registryDate = latestRegistryDate(study);
  const registryAgeDays = registryDate ? daysBetween(registryDate, options.today) : undefined;
  const staleRegistryCheck =
    registryAgeDays === undefined || registryAgeDays > options.staleDays;
  const date = completionDate(study);
  const completeOrPastCompletion =
    study.status === "completed" || (date ? date <= options.today : false);
  const completedNoResults = completeOrPastCompletion && resultStatus === "not_posted";
  const resultsPosted = resultStatus === "posted";
  const horizonCandidate =
    !resultsPosted &&
    (completedNoResults ||
      study.trial_details?.expected_results_window ||
      study.trial_details?.horizon_note ||
      ["recruiting", "active", "planned"].includes(study.status));

  return {
    study,
    filePath,
    sourceRecords,
    resultStatus,
    completionDate: date,
    registryDate,
    registryAgeDays,
    staleRegistryCheck,
    completedNoResults,
    resultsPosted,
    horizonCandidate,
    missingTrialDetails: !study.trial_details,
    missingWhyItMatters: !study.trial_details?.why_it_matters,
    missingExpectedWindow: !study.trial_details?.expected_results_window
  };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function countBy(items, getKey) {
  const counts = new Map();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

function trialSort(left, right) {
  const leftStatus = left.completedNoResults ? 0 : left.staleRegistryCheck ? 1 : 2;
  const rightStatus = right.completedNoResults ? 0 : right.staleRegistryCheck ? 1 : 2;
  if (leftStatus !== rightStatus) {
    return leftStatus - rightStatus;
  }

  const leftDate = left.completionDate ?? "9999-12-31";
  const rightDate = right.completionDate ?? "9999-12-31";
  return leftDate.localeCompare(rightDate) || left.study.name.localeCompare(right.study.name);
}

function sourceSummary(trial) {
  const summaries = unique(trial.sourceRecords.map((source) => source.summary).filter(Boolean));
  return summaries[0];
}

function registryUrl(trial) {
  return trial.sourceRecords.flatMap((source) => source.urls ?? [])[0];
}

function formatDate(value) {
  return value ?? "not recorded";
}

function formatRegistryAge(trial) {
  if (!trial.registryDate) {
    return "no local check date";
  }

  if (trial.registryAgeDays === undefined) {
    return trial.registryDate;
  }

  return `${trial.registryDate} (${trial.registryAgeDays} days old)`;
}

function trialLine(trial) {
  const study = trial.study;
  const ncts = (study.registry_ids ?? []).join(", ");
  const status = studyStatusLabels[study.status] ?? study.status;
  const result = resultStatusLabels[trial.resultStatus] ?? trial.resultStatus;
  const completion = formatDate(trial.completionDate);
  const registry = formatRegistryAge(trial);
  const href = registryUrl(trial);
  const name = href ? `[${study.name}](${href})` : study.name;

  return `- ${name} (${ncts}): ${status}; ${result}; completion ${completion}; registry ${registry}.`;
}

function trackLabel(trackId, trackNames) {
  return trackNames.get(trackId) ?? trackId;
}

function renderSection(title, lines, emptyText) {
  if (lines.length === 0) {
    return `## ${title}\n\n${emptyText}\n`;
  }

  return `## ${title}\n\n${lines.join("\n")}\n`;
}

function renderReport(trials, options, trackNames) {
  const lines = [];
  const scopedLabel = options.track ? ` for ${trackLabel(options.track, trackNames)}` : "";
  const missingDetails = trials.filter((trial) => trial.missingTrialDetails);
  const staleChecks = trials.filter((trial) => trial.staleRegistryCheck);
  const openStaleChecks = staleChecks.filter((trial) => trial.resultStatus !== "posted");
  const completedNoResults = trials.filter((trial) => trial.completedNoResults);
  const horizonCandidates = trials.filter((trial) => trial.horizonCandidate);
  const postedResults = trials.filter((trial) => trial.resultsPosted);

  lines.push(`# Trial Watch Report${scopedLabel}`);
  lines.push("");
  lines.push(`Generated from reviewed local records on ${options.today}.`);
  lines.push(
    `Stale registry threshold: ${options.staleDays} days. This report does not fetch current registry data.`
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Registry-linked interventional studies: ${trials.length}`);
  lines.push(`- With \`trial_details\`: ${trials.length - missingDetails.length}`);
  lines.push(`- Missing \`trial_details\`: ${missingDetails.length}`);
  lines.push(`- Completed or past-completion records with no posted results: ${completedNoResults.length}`);
  lines.push(`- Registry checks missing or stale: ${staleChecks.length}`);
  lines.push(`- Open watchlist records with missing or stale registry checks: ${openStaleChecks.length}`);
  lines.push(`- Posted results recorded locally: ${postedResults.length}`);
  lines.push("");
  lines.push("### Result Status");
  lines.push("");
  for (const [status, count] of countBy(trials, (trial) => trial.resultStatus)) {
    lines.push(`- ${resultStatusLabels[status] ?? status}: ${count}`);
  }
  lines.push("");
  lines.push("### Trial Status");
  lines.push("");
  for (const [status, count] of countBy(trials, (trial) => trial.study.status)) {
    lines.push(`- ${studyStatusLabels[status] ?? status}: ${count}`);
  }
  lines.push("");

  lines.push(
    renderSection(
      "Field-Review Watchlist",
      horizonCandidates.sort(trialSort).slice(0, 30).map(trialLine),
      "No current local trial watch candidates."
    )
  );

  lines.push(
    renderSection(
      "Completed Or Past-Completion With No Posted Results",
      completedNoResults.sort(trialSort).map(trialLine),
      "No completed or past-completion local trial records are marked as no posted results."
    )
  );

  lines.push(
    renderSection(
      "Stale Or Missing Registry Checks",
      staleChecks.sort(trialSort).slice(0, 40).map(trialLine),
      "No local registry checks are stale under the configured threshold."
    )
  );

  lines.push(
    renderSection(
      "Missing Trial Details",
      missingDetails
        .sort((left, right) => left.study.name.localeCompare(right.study.name))
        .slice(0, 60)
        .map((trial) => {
          const tracks = (trial.study.track_ids ?? [])
            .map((trackId) => trackLabel(trackId, trackNames))
            .join(", ");
          return `- ${trial.study.name} (${(trial.study.registry_ids ?? []).join(", ")}): ${tracks || "unmapped track"}.`;
        }),
      "All scoped registry-linked interventional studies have trial details."
    )
  );

  const missingWhy = trials.filter((trial) => !trial.missingTrialDetails && trial.missingWhyItMatters);
  const missingWindow = trials.filter(
    (trial) => !trial.missingTrialDetails && trial.missingExpectedWindow && !trial.resultsPosted
  );

  lines.push("## Detail Quality");
  lines.push("");
  lines.push(`- With \`trial_details\` but missing \`why_it_matters\`: ${missingWhy.length}`);
  lines.push(
    `- With \`trial_details\` but missing \`expected_results_window\` and not posted: ${missingWindow.length}`
  );
  lines.push("");

  lines.push("## Surveillance Use");
  lines.push("");
  lines.push("- Re-check every NCT in the field-review watchlist before a scoped surveillance no-op.");
  lines.push("- Treat unchanged no-result registries as surveillance facts, not field progress.");
  lines.push("- Treat status-only changes as activity unless they alter the public interpretation.");
  lines.push("- Send posted trial results through staged evidence review before changing an outlook.");
  lines.push("");

  const exampleSource = horizonCandidates.map(sourceSummary).find(Boolean);
  if (exampleSource) {
    lines.push("## Source Context Example");
    lines.push("");
    lines.push(exampleSource);
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const [studyRecords, sourceRecords, trackTaxonomy] = await Promise.all([
    readCollection(studyRoot),
    readCollection(sourceRoot),
    readJson(trackTaxonomyPath)
  ]);

  const trackNames = buildTrackNames(trackTaxonomy);
  const sourcesByRegistryId = buildSourcesByRegistryId(sourceRecords);
  const trials = studyRecords
    .filter(({ value: study }) => study.study_type === "interventional")
    .filter(({ value: study }) => (study.registry_ids ?? []).length > 0)
    .filter(({ value: study }) => !options.track || (study.track_ids ?? []).includes(options.track))
    .map(({ value: study, relativePath }) => {
      const sourceMatches = (study.registry_ids ?? []).flatMap(
        (registryId) => sourcesByRegistryId.get(registryId.trim().toUpperCase()) ?? []
      );

      return decorateTrial({
        study,
        filePath: relativePath,
        sourceRecords: sourceMatches,
        options
      });
    })
    .sort(trialSort);

  const report = renderReport(trials, options, trackNames);

  if (options.write) {
    await writeText(reportPath, report);
    process.stdout.write(`Wrote ${reportPath}\n`);
  } else {
    process.stdout.write(report);
  }

  process.stdout.write(
    `Trial watch report: ${trials.length} trial(s), ${trials.filter((trial) => trial.missingTrialDetails).length} missing detail record(s), ${trials.filter((trial) => trial.staleRegistryCheck).length} stale or missing registry check(s), ${trials.filter((trial) => trial.staleRegistryCheck && trial.resultStatus !== "posted").length} open stale watch item(s).\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
