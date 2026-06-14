#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const reportPath = "extra/data-sustainability-report.md";
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const terminalBundleStatuses = new Set(["published", "rejected"]);

const liveRecordDirectories = [
  "data/activity-items",
  "data/candidate-bundles",
  "data/evidence-reviews",
  "data/findings",
  "data/interventions",
  "data/outlooks",
  "data/publication-events",
  "data/review-comments",
  "data/sources",
  "data/studies"
];

function usage() {
  return `Usage:
  npm run audit:data:sustainability [-- --write] [-- --max-unreferenced-staged N]

Options:
  --write                       Write ${reportPath}.
  --max-unreferenced-staged N    Fail when unreferenced staged JSON files exceed N.`;
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
    maxUnreferencedStaged: parseIntegerOption(args, "--max-unreferenced-staged")
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
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

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

async function pathExists(relativePath) {
  return existsSync(workspacePath(relativePath));
}

async function fileInfo(relativePath) {
  if (!(await pathExists(relativePath))) {
    return {
      exists: false,
      bytes: null,
      sha256: null
    };
  }

  const raw = await fs.readFile(workspacePath(relativePath));
  return {
    exists: true,
    bytes: raw.length,
    sha256: createHash("sha256").update(raw).digest("hex")
  };
}

async function walkFiles(relativeDir) {
  if (!(await pathExists(relativeDir))) {
    return [];
  }

  const root = workspacePath(relativeDir);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(toPosix(entryPath));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function listDirectories(relativeDir) {
  if (!(await pathExists(relativeDir))) {
    return [];
  }

  const entries = await fs.readdir(workspacePath(relativeDir), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(relativePath, issues) {
  try {
    return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
  } catch (error) {
    issues.push(`${relativePath}: could not parse JSON (${error.message})`);
    return undefined;
  }
}

async function summarizeFiles(relativeDir) {
  const files = await walkFiles(relativeDir);
  const fileStats = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      bytes: (await fs.stat(workspacePath(filePath))).size,
      isJson: filePath.endsWith(".json")
    }))
  );

  return {
    relativeDir,
    fileCount: fileStats.length,
    jsonCount: fileStats.filter((file) => file.isJson).length,
    bytes: fileStats.reduce((total, file) => total + file.bytes, 0),
    files: fileStats
  };
}

async function summarizeDataSections() {
  const entries = await fs.readdir(workspacePath("data"), { withFileTypes: true });
  const summaries = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => summarizeFiles(path.join("data", entry.name)))
  );

  return summaries.sort((left, right) => right.bytes - left.bytes || left.relativeDir.localeCompare(right.relativeDir));
}

async function readLiveRecords(issues) {
  const records = [];

  for (const directory of liveRecordDirectories) {
    for (const filePath of (await walkFiles(directory)).filter((file) => file.endsWith(".json"))) {
      const record = await readJson(filePath, issues);
      if (!record) {
        continue;
      }
      records.push({ filePath, record });
    }
  }

  return records;
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function countsBy(records, field) {
  const counts = new Map();
  for (const { record } of records) {
    increment(counts, record[field] ?? "unknown");
  }
  return counts;
}

function sortCounts(counts) {
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function stagedDirectoryFromPath(filePath) {
  const match = filePath.match(/^data\/staged-records\/([^/]+)\//);
  return match?.[1];
}

async function readManifestChangesByPath(issues) {
  if (!(await pathExists(manifestPath))) {
    return new Map();
  }

  const manifest = await readJson(manifestPath, issues);
  const changes = new Map();
  for (const bundle of manifest?.bundles ?? []) {
    for (const change of bundle.changes ?? []) {
      changes.set(change.staged_file_path, {
        bundleId: bundle.bundle_id,
        ...change
      });
    }
  }
  return changes;
}

async function isLiveBackedPrunedStagedFile(stagedFilePath, manifestChangesByPath) {
  const change = manifestChangesByPath.get(stagedFilePath);
  if (!change) {
    return false;
  }

  const targetInfo = await fileInfo(change.target_file_path);
  return (
    targetInfo.exists &&
    targetInfo.sha256 === change.staged_file_sha256 &&
    targetInfo.bytes === change.staged_file_bytes
  );
}

async function summarizeStagedRecords(candidateBundles, issues) {
  const stagedDirectories = await listDirectories("data/staged-records");
  const stagedFiles = (await walkFiles("data/staged-records")).filter((file) => file.endsWith(".json"));
  const manifestChangesByPath = await readManifestChangesByPath(issues);
  const bundleById = new Map(candidateBundles.map(({ record }) => [record.id, record]));
  const activeBundleIds = new Set(
    candidateBundles
      .filter(({ record }) => !terminalBundleStatuses.has(record.lifecycle_status))
      .map(({ record }) => record.id)
  );

  const stagedFileRefs = new Set();
  const missingReferencedFiles = [];
  const prunedReferencedFiles = [];
  for (const { record: bundle } of candidateBundles) {
    for (const change of bundle.proposed_changes ?? []) {
      if (!change.staged_file_path) {
        continue;
      }
      const stagedFilePath = toPosix(change.staged_file_path);
      stagedFileRefs.add(stagedFilePath);
      if (!(await pathExists(stagedFilePath))) {
        if (await isLiveBackedPrunedStagedFile(stagedFilePath, manifestChangesByPath)) {
          prunedReferencedFiles.push(stagedFilePath);
        } else {
          missingReferencedFiles.push(stagedFilePath);
        }
      }
    }
  }

  const unreferencedFiles = stagedFiles.filter((filePath) => !stagedFileRefs.has(filePath));
  const unreferencedByDirectory = new Map();
  for (const filePath of unreferencedFiles) {
    increment(unreferencedByDirectory, stagedDirectoryFromPath(filePath) ?? "unknown");
  }

  const directorySummaries = await Promise.all(
    stagedDirectories.map(async (directory) => {
      const summary = await summarizeFiles(path.join("data/staged-records", directory));
      const bundle = bundleById.get(directory);
      return {
        directory,
        fileCount: summary.fileCount,
        jsonCount: summary.jsonCount,
        bytes: summary.bytes,
        bundleStatus: bundle?.lifecycle_status ?? "missing_bundle",
        hasBundle: Boolean(bundle),
        isActive: activeBundleIds.has(directory)
      };
    })
  );

  return {
    stagedDirectories,
    stagedFiles,
    stagedFileRefs,
    missingReferencedFiles,
    prunedReferencedFiles,
    logicalStagedFileCount: stagedFileRefs.size,
    unreferencedFiles,
    unreferencedByDirectory,
    activeDirectoryCount: directorySummaries.filter((entry) => entry.isActive).length,
    historicalDirectoryCount: directorySummaries.filter(
      (entry) => entry.hasBundle && terminalBundleStatuses.has(entry.bundleStatus)
    ).length,
    missingBundleDirectoryCount: directorySummaries.filter((entry) => !entry.hasBundle).length,
    directorySummaries: directorySummaries.sort((left, right) => right.bytes - left.bytes || left.directory.localeCompare(right.directory)),
    issues
  };
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

function buildReport({ dataSummary, liveRecords, candidateBundles, stagedSummary, largestFiles, warnings }) {
  const totalDataBytes = dataSummary.reduce((total, section) => total + section.bytes, 0);
  const totalDataFiles = dataSummary.reduce((total, section) => total + section.fileCount, 0);
  const stagedSection = dataSummary.find((section) => section.relativeDir === "data/staged-records");
  const stagedShare = stagedSection && totalDataBytes > 0 ? stagedSection.bytes / totalDataBytes : 0;
  const recordTypeCounts = sortCounts(countsBy(liveRecords, "record_type"));
  const lifecycleCounts = sortCounts(countsBy(candidateBundles, "lifecycle_status"));

  return `# Data Sustainability Report

Snapshot: generated by \`npm run audit:data:sustainability -- --write\`.

This report summarizes the file-backed data estate so growth pressure, staged-history drift, and lifecycle shape are visible before they become maintenance work.

## Summary

- Data footprint: ${totalDataFiles} files, ${formatBytes(totalDataBytes)}.
- Tracked record files: ${liveRecords.length}.
- Candidate bundles: ${candidateBundles.length}.
- Physical staged history: ${stagedSummary.stagedFiles.length} JSON files across ${stagedSummary.stagedDirectories.length} directories.
- Logical staged history: ${stagedSummary.logicalStagedFileCount} candidate-bundle staged_file_path reference(s).
- Manifest-backed pruned staged JSON files: ${stagedSummary.prunedReferencedFiles.length}.
- Staged share of data bytes: ${formatPercent(stagedShare)}.
- Active staged directories: ${stagedSummary.activeDirectoryCount}.
- Historical staged directories: ${stagedSummary.historicalDirectoryCount}.
- Staged directories without a candidate bundle: ${stagedSummary.missingBundleDirectoryCount}.
- Staged JSON files not referenced by candidate-bundle proposed changes: ${stagedSummary.unreferencedFiles.length}.

## Watch Items

${bulletList(warnings)}

## Data Sections

${table(
    ["Section", "Files", "JSON", "Size"],
    dataSummary.map((section) => [
      section.relativeDir,
      section.fileCount,
      section.jsonCount,
      formatBytes(section.bytes)
    ])
  )}

## Tracked Records

${table(
    ["Record Type", "Count"],
    recordTypeCounts.map(([recordType, count]) => [recordType, count])
  )}

## Candidate Bundle Lifecycle

${table(
    ["Lifecycle Status", "Count"],
    lifecycleCounts.map(([status, count]) => [status, count])
  )}

## Largest Data Files

${table(
    ["File", "Size"],
    largestFiles.map((file) => [file.filePath, formatBytes(file.bytes)])
  )}

## Staged History

${table(
    ["Staged Directory", "Status", "JSON", "Size"],
    stagedSummary.directorySummaries.slice(0, 15).map((entry) => [
      entry.directory,
      entry.bundleStatus,
      entry.jsonCount,
      formatBytes(entry.bytes)
    ])
  )}

## Unreferenced Staged Files

${stagedSummary.unreferencedFiles.length === 0 ? "- None." : table(
    ["Staged Directory", "Unreferenced JSON Files"],
    sortCounts(stagedSummary.unreferencedByDirectory).map(([directory, count]) => [directory, count])
  )}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const issues = [];
  const dataSummary = await summarizeDataSections();
  const liveRecords = await readLiveRecords(issues);
  const candidateBundles = liveRecords.filter(({ record }) => record.record_type === "candidate_bundle");
  const stagedSummary = await summarizeStagedRecords(candidateBundles, issues);
  const allDataFiles = dataSummary.flatMap((section) => section.files);
  const largestFiles = [...allDataFiles]
    .sort((left, right) => right.bytes - left.bytes || left.filePath.localeCompare(right.filePath))
    .slice(0, 10);

  const warnings = [];
  if (stagedSummary.missingBundleDirectoryCount > 0) {
    warnings.push(`${stagedSummary.missingBundleDirectoryCount} staged director${stagedSummary.missingBundleDirectoryCount === 1 ? "y has" : "ies have"} no matching candidate bundle.`);
  }
  if (stagedSummary.missingReferencedFiles.length > 0) {
    warnings.push(`${stagedSummary.missingReferencedFiles.length} candidate-bundle staged_file_path reference(s) point to missing files.`);
  }
  if (stagedSummary.unreferencedFiles.length > 0) {
    warnings.push(`${stagedSummary.unreferencedFiles.length} staged JSON file(s) are not listed in candidate-bundle proposed_changes[].`);
  }

  if (
    options.maxUnreferencedStaged !== undefined &&
    stagedSummary.unreferencedFiles.length > options.maxUnreferencedStaged
  ) {
    issues.push(
      `unreferenced staged JSON files (${stagedSummary.unreferencedFiles.length}) exceed --max-unreferenced-staged ${options.maxUnreferencedStaged}`
    );
  }

  const report = buildReport({
    dataSummary,
    liveRecords,
    candidateBundles,
    stagedSummary,
    largestFiles,
    warnings
  });

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(reportPath)), { recursive: true });
    await fs.writeFile(workspacePath(reportPath), report);
  }

  process.stdout.write(
    [
      `Data sustainability report: ${liveRecords.length} tracked record file(s)`,
      `${stagedSummary.stagedFiles.length} physical staged JSON file(s)`,
      `${stagedSummary.prunedReferencedFiles.length} pruned staged JSON file(s)`,
      `${stagedSummary.unreferencedFiles.length} unreferenced staged JSON file(s)`,
      `${warnings.length} warning(s)`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (warnings.length > 0) {
    process.stdout.write("Warnings:\n");
    for (const warning of warnings) {
      process.stdout.write(`- ${warning}\n`);
    }
  }

  if (issues.length > 0) {
    process.stderr.write(`Data sustainability report failed with ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      process.stderr.write(`- ${issue}\n`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
