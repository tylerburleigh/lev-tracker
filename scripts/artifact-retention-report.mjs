#!/usr/bin/env node

import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const reportPath = "extra/artifact-retention-report.md";
const artifactRoots = ["data", "research", "ops", "extra"];
const terminalBundleStatuses = new Set(["published", "rejected"]);

const categories = {
  canonical_public_data: {
    label: "Canonical Public Data",
    retention: "retain",
    action: "Keep as the reusable evidence graph and public content layer."
  },
  publication_audit: {
    label: "Publication Audit Trail",
    retention: "retain",
    action: "Keep to explain review, approval, and publication history."
  },
  active_staged_intermediate: {
    label: "Active Staged Intermediate",
    retention: "retain_until_terminal",
    action: "Keep while the bundle is under review; publish or reject before pruning."
  },
  terminal_staged_intermediate: {
    label: "Terminal Staged Intermediate",
    retention: "compress_candidate",
    action: "Retain changed staged bodies; identical live-backed staged files have been pruned after archive verification."
  },
  staged_record_manifest: {
    label: "Staged Record Manifests",
    retention: "retain_for_archive",
    action: "Keep as the hash/index layer required to reconstruct pruned terminal staged JSON."
  },
  staged_record_archive: {
    label: "Staged Record Archives",
    retention: "retain_for_archive",
    action: "Keep packed changed staged bodies required to reconstruct terminal staged records that differ from live records."
  },
  orphan_staged_intermediate: {
    label: "Orphan Staged Intermediate",
    retention: "review",
    action: "Review manually because no candidate bundle owns the staged directory."
  },
  research_session_log: {
    label: "Research Session Logs",
    retention: "retain_then_summarize",
    action: "Keep until source discovery and excluded-source rationale are synthesized elsewhere."
  },
  current_coverage_synthesis: {
    label: "Current Coverage Synthesis",
    retention: "retain",
    action: "Keep as the latest source-completeness judgment for each track."
  },
  superseded_coverage_synthesis: {
    label: "Superseded Coverage Synthesis",
    retention: "compress_candidate",
    action: "Keep for now; later summarize into the latest assessment revision history."
  },
  generated_state: {
    label: "Generated Planning State",
    retention: "current_copy_only",
    action: "Keep current files, but do not preserve old snapshots unless debugging a generation change."
  },
  generated_report: {
    label: "Generated Reports",
    retention: "prunable_regenerable",
    action: "Safe to delete or overwrite when stale because commands can regenerate them."
  },
  draft_work: {
    label: "Draft Work",
    retention: "ephemeral",
    action: "Delete after applied or deliberately promote into durable records."
  },
  handoff_artifact: {
    label: "Handoff Artifacts",
    retention: "review",
    action: "Keep only while they inform future implementation; promote into docs if durable."
  },
  directory_marker: {
    label: "Directory Markers",
    retention: "retain",
    action: "Keep when needed to preserve intentionally empty workflow directories."
  },
  unclassified: {
    label: "Unclassified Artifacts",
    retention: "review",
    action: "Classify before pruning."
  }
};

function usage() {
  return `Usage:
  npm run audit:artifacts [-- --write] [-- --max-unclassified N]

Options:
  --write                 Write ${reportPath}.
  --max-unclassified N    Fail when unclassified artifact count exceeds N.`;
}

function parseIntegerOption(args, name) {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    help: args.includes("--help") || args.includes("-h"),
    write: args.includes("--write"),
    maxUnclassified: parseIntegerOption(args, "--max-unclassified")
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

async function pathExists(relativePath) {
  return existsSync(workspacePath(relativePath));
}

async function walkFiles(relativePath) {
  if (!(await pathExists(relativePath))) {
    return [];
  }

  const entries = await fs.readdir(workspacePath(relativePath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(toPosix(entryPath));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

async function readJsonFiles(relativeDir) {
  const files = (await walkFiles(relativeDir)).filter((file) => file.endsWith(".json"));
  const records = [];

  for (const filePath of files) {
    records.push({ filePath, record: await readJson(filePath) });
  }

  return records;
}

async function fileStats(filePath) {
  const stats = await fs.stat(workspacePath(filePath));
  return { filePath, bytes: stats.size };
}

async function summarizePaths(paths) {
  const stats = await Promise.all(paths.map(fileStats));
  return {
    fileCount: stats.length,
    bytes: stats.reduce((total, file) => total + file.bytes, 0),
    files: stats
  };
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortCounts(counts) {
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function table(headers, rows) {
  const escapeCell = (value) => String(value).replace(/\|/g, "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function bulletList(items) {
  if (items.length === 0) {
    return "- None.";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function stagedDirectory(filePath) {
  return filePath.match(/^data\/staged-records\/([^/]+)\//)?.[1];
}

function coverageSortKey(entry) {
  return `${entry.record.assessed_at ?? ""} ${entry.record.id ?? entry.filePath}`;
}

function latestCoverageAssessments(records) {
  const byTrack = new Map();
  for (const entry of records) {
    const trackId = entry.record.track_id ?? "unknown";
    const entries = byTrack.get(trackId) ?? [];
    entries.push(entry);
    byTrack.set(trackId, entries);
  }

  const latest = new Set();
  const superseded = new Set();
  const supersededByTrack = new Map();

  for (const [trackId, entries] of byTrack.entries()) {
    const sorted = [...entries].sort((left, right) => coverageSortKey(left).localeCompare(coverageSortKey(right)));
    const latestEntry = sorted.at(-1);
    if (latestEntry) {
      latest.add(latestEntry.filePath);
    }
    for (const entry of sorted.slice(0, -1)) {
      superseded.add(entry.filePath);
      increment(supersededByTrack, trackId);
    }
  }

  return { latest, superseded, supersededByTrack };
}

async function classifyArtifacts() {
  const allArtifactFiles = (await Promise.all(artifactRoots.map(walkFiles))).flat();
  const classified = new Map();
  const details = {
    staged: {
      activeFiles: [],
      terminalFiles: [],
      orphanFiles: [],
      byStatus: new Map()
    },
    generatedReports: [],
    supersededCoverageByTrack: new Map(),
    researchSessionOutcomes: new Map(),
    researchSessionModes: new Map()
  };

  const add = (category, paths) => {
    for (const filePath of paths) {
      classified.set(filePath, category);
    }
  };

  add("canonical_public_data", [
    ...(await walkFiles("data/activity-items")),
    ...(await walkFiles("data/content")),
    ...(await walkFiles("data/findings")),
    ...(await walkFiles("data/interventions")),
    ...(await walkFiles("data/outlooks")),
    ...(await walkFiles("data/sources")),
    ...(await walkFiles("data/studies"))
  ]);

  add("publication_audit", [
    ...(await walkFiles("data/candidate-bundles")),
    ...(await walkFiles("data/evidence-reviews")),
    ...(await walkFiles("data/publication-events")),
    ...(await walkFiles("data/review-comments"))
  ]);

  const candidateBundles = await readJsonFiles("data/candidate-bundles");
  const bundleStatusById = new Map(
    candidateBundles.map(({ record }) => [record.id, record.lifecycle_status ?? "unknown"])
  );

  for (const filePath of await walkFiles("data/staged-records")) {
    const directory = stagedDirectory(filePath);
    const status = directory ? bundleStatusById.get(directory) : undefined;
    if (!status) {
      classified.set(filePath, "orphan_staged_intermediate");
      details.staged.orphanFiles.push(filePath);
      continue;
    }

    increment(details.staged.byStatus, status);
    if (terminalBundleStatuses.has(status)) {
      classified.set(filePath, "terminal_staged_intermediate");
      details.staged.terminalFiles.push(filePath);
    } else {
      classified.set(filePath, "active_staged_intermediate");
      details.staged.activeFiles.push(filePath);
    }
  }

  const researchSessions = await readJsonFiles("research/sessions");
  add("research_session_log", researchSessions.map(({ filePath }) => filePath));
  for (const { record } of researchSessions) {
    increment(details.researchSessionOutcomes, record.outcome ?? "unknown");
    increment(details.researchSessionModes, record.mode ?? "unknown");
  }

  const coverageAssessments = await readJsonFiles("research/coverage-assessments");
  const coverageState = latestCoverageAssessments(coverageAssessments);
  details.supersededCoverageByTrack = coverageState.supersededByTrack;
  add("current_coverage_synthesis", [...coverageState.latest]);
  add("superseded_coverage_synthesis", [...coverageState.superseded]);

  add("generated_state", [
    "ops/triage-state.v1.json",
    "research/backlog/track-priority.v1.json",
    "research/state/coverage-status.v1.json"
  ].filter((filePath) => existsSync(workspacePath(filePath))));

  add("staged_record_manifest", await walkFiles("data/staged-record-manifests"));
  add("staged_record_archive", await walkFiles("data/staged-record-archives"));

  const generatedReportPaths = [
    "extra/artifact-retention-report.md",
    "extra/current-lev-story-draft.json",
    "extra/current-lev-story-draft.md",
    "extra/data-sustainability-report.md",
    "extra/editorial-quality-report.md",
    "extra/public-copy-report.md",
    "extra/reader-task-audit.md",
    "extra/retained-staged-records-report.md",
    "extra/staged-archive-readiness-report.md",
    "extra/staged-archive-verification-report.md",
    "extra/staged-prune-dry-run-report.md",
    "extra/trial-watch-report.md"
  ].filter((filePath) => existsSync(workspacePath(filePath)));
  add("generated_report", generatedReportPaths);
  details.generatedReports = generatedReportPaths;

  add("draft_work", await walkFiles("research/drafts"));
  add("directory_marker", allArtifactFiles.filter((filePath) => filePath.endsWith("/.gitkeep")));
  add("handoff_artifact", (await walkFiles("extra")).filter((filePath) => !classified.has(filePath)));

  const unclassified = allArtifactFiles.filter((filePath) => !classified.has(filePath));
  add("unclassified", unclassified);

  return { allArtifactFiles, classified, details };
}

async function buildSummaries(classified) {
  const byCategory = new Map();
  for (const [filePath, category] of classified.entries()) {
    const paths = byCategory.get(category) ?? [];
    paths.push(filePath);
    byCategory.set(category, paths);
  }

  const summaries = [];
  for (const [category, paths] of byCategory.entries()) {
    const summary = await summarizePaths(paths);
    summaries.push({ category, ...summary });
  }

  return summaries.sort((left, right) => right.bytes - left.bytes || left.category.localeCompare(right.category));
}

function buildReport({ summaries, details, allArtifactFiles, unclassifiedCount }) {
  const totalBytes = summaries.reduce((total, summary) => total + summary.bytes, 0);
  const generatedReportSummary = summaries.find((summary) => summary.category === "generated_report");
  const terminalStagedSummary = summaries.find((summary) => summary.category === "terminal_staged_intermediate");
  const supersededCoverageSummary = summaries.find((summary) => summary.category === "superseded_coverage_synthesis");
  const now = new Date().toISOString();
  const unclassifiedSummary = summaries.find((summary) => summary.category === "unclassified");

  const categoryRows = summaries.map((summary) => {
    const definition = categories[summary.category];
    return [
      definition.label,
      definition.retention,
      summary.fileCount,
      formatBytes(summary.bytes),
      definition.action
    ];
  });

  const compressionCandidates = [
    terminalStagedSummary
      ? `${terminalStagedSummary.fileCount} terminal staged file(s), ${formatBytes(terminalStagedSummary.bytes)}.`
      : undefined,
    supersededCoverageSummary
      ? `${supersededCoverageSummary.fileCount} superseded coverage assessment file(s), ${formatBytes(supersededCoverageSummary.bytes)}.`
      : undefined,
    `${details.researchSessionOutcomes.get("no_op") ?? 0} no-op research session(s) and ${details.researchSessionOutcomes.get("activity_only") ?? 0} activity-only session(s) could eventually be summarized into per-track review history.`
  ].filter(Boolean);

  const prunableNow = [
    generatedReportSummary
      ? `${generatedReportSummary.fileCount} generated report file(s), ${formatBytes(generatedReportSummary.bytes)}.`
      : undefined,
    "Generated planning state should be overwritten in place, not preserved as dated snapshots."
  ].filter(Boolean);

  return `# Artifact Retention Report

Generated: ${now}

This report classifies file-backed artifacts by retention role. It is non-destructive: it identifies pruning and compression candidates but does not delete or rewrite files.

## Summary

- Artifact roots scanned: ${artifactRoots.join(", ")}.
- Artifact files classified: ${allArtifactFiles.length}.
- Artifact footprint: ${formatBytes(totalBytes)}.
- Unclassified artifacts: ${unclassifiedCount}.
- Active staged intermediate files: ${details.staged.activeFiles.length}.
- Terminal staged intermediate files: ${details.staged.terminalFiles.length}.
- Orphan staged intermediate files: ${details.staged.orphanFiles.length}.

## Retention Classes

${table(["Class", "Retention", "Files", "Size", "Action"], categoryRows)}

## Prunable Now

${bulletList(prunableNow)}

## Compression Candidates

${bulletList(compressionCandidates)}

## Staged Records

${table(
    ["Bundle Status", "Staged File Count"],
    sortCounts(details.staged.byStatus).map(([status, count]) => [status, count])
  )}

## Research Sessions

${table(
    ["Outcome", "Count"],
    sortCounts(details.researchSessionOutcomes).map(([outcome, count]) => [outcome, count])
  )}

${table(
    ["Mode", "Count"],
    sortCounts(details.researchSessionModes).map(([mode, count]) => [mode, count])
  )}

## Superseded Coverage Assessments

${details.supersededCoverageByTrack.size === 0 ? "- None." : table(
    ["Track", "Superseded Assessment Count"],
    sortCounts(details.supersededCoverageByTrack).map(([trackId, count]) => [trackId, count])
  )}

## Generated Reports

${bulletList(details.generatedReports)}

## Unclassified Artifacts

${unclassifiedSummary ? bulletList(unclassifiedSummary.files.map((file) => file.filePath)) : "- None."}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const { allArtifactFiles, classified, details } = await classifyArtifacts();
  const summaries = await buildSummaries(classified);
  const unclassifiedCount = summaries.find((summary) => summary.category === "unclassified")?.fileCount ?? 0;
  const report = buildReport({ summaries, details, allArtifactFiles, unclassifiedCount });

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(reportPath)), { recursive: true });
    await fs.writeFile(workspacePath(reportPath), report);
  }

  process.stdout.write(
    [
      `Artifact retention report: ${allArtifactFiles.length} file(s) classified`,
      `${details.staged.terminalFiles.length} terminal staged intermediate file(s)`,
      `${unclassifiedCount} unclassified file(s)`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (options.maxUnclassified !== undefined && unclassifiedCount > options.maxUnclassified) {
    process.stderr.write(
      `Artifact retention report failed: unclassified artifact count ${unclassifiedCount} exceeds --max-unclassified ${options.maxUnclassified}.\n`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
