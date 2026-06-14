#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const archivePath = "data/staged-record-archives/changed-terminal-bodies.v1.json";
const reportPath = "extra/retained-staged-records-report.md";
const terminalBundleStatuses = new Set(["published", "rejected"]);

function usage() {
  return `Usage:
  npm run audit:retained-staged-records [-- --write]

Options:
  --write   Write ${reportPath}.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    help: args.includes("--help") || args.includes("-h"),
    write: args.includes("--write")
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
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

async function fileHash(relativePath) {
  if (!(await pathExists(relativePath))) {
    return {
      exists: false,
      bytes: null,
      sha256: null,
      text: null
    };
  }

  const raw = await fs.readFile(workspacePath(relativePath));
  return {
    exists: true,
    bytes: raw.length,
    sha256: createHash("sha256").update(raw).digest("hex"),
    text: raw.toString("utf8")
  };
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function serializedRecord(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
}

function stagedDirectory(filePath) {
  return filePath.match(/^data\/staged-records\/([^/]+)\//)?.[1] ?? "";
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

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

async function buildBundleStatusById() {
  const bundleFiles = (await walkFiles("data/candidate-bundles")).filter((filePath) => filePath.endsWith(".json"));
  const statuses = new Map();
  for (const filePath of bundleFiles) {
    const bundle = await readJson(filePath);
    statuses.set(bundle.id, bundle.lifecycle_status ?? "unknown");
  }
  return statuses;
}

function buildManifestChangeMap(manifest) {
  const changes = new Map();
  for (const bundle of manifest.bundles ?? []) {
    for (const change of bundle.changes ?? []) {
      changes.set(change.staged_file_path, {
        bundle_id: bundle.bundle_id,
        lifecycle_status: bundle.lifecycle_status,
        ...change
      });
    }
  }
  return changes;
}

function buildArchiveEntryMap(archive, issues, issueCounts) {
  const entries = new Map();
  for (const entry of archive.entries ?? []) {
    if (entries.has(entry.staged_file_path)) {
      issues.push(`${entry.staged_file_path}: duplicate archive entry.`);
      increment(issueCounts, "duplicate_archive_entry");
    }
    entries.set(entry.staged_file_path, entry);
  }
  return entries;
}

function metadataMatchesArchive(manifestChange, archiveEntry) {
  return (
    archiveEntry.bundle_id === manifestChange.bundle_id &&
    archiveEntry.change_id === manifestChange.change_id &&
    archiveEntry.target_record_type === manifestChange.target_record_type &&
    archiveEntry.target_record_id === manifestChange.target_record_id &&
    archiveEntry.target_file_path === manifestChange.target_file_path &&
    archiveEntry.staged_file_sha256 === manifestChange.staged_file_sha256 &&
    archiveEntry.staged_file_bytes === manifestChange.staged_file_bytes
  );
}

async function auditRetainedStagedRecords() {
  const manifest = await readJson(manifestPath);
  const archive = await readJson(archivePath);
  const manifestInfo = await fileHash(manifestPath);
  const bundleStatusById = await buildBundleStatusById();
  const manifestChangesByPath = buildManifestChangeMap(manifest);
  const issues = [];
  const issueCounts = new Map();
  const retainedReasonCounts = new Map();
  const bundleCounts = new Map();
  const examples = [];
  const retainedRows = [];
  const terminalPhysicalPaths = [];
  let activePhysicalCount = 0;
  let orphanPhysicalCount = 0;
  let matchingRetainedCount = 0;
  let retainedBytes = 0;

  if (archive.source_manifest_path !== manifestPath) {
    issues.push(`Archive source_manifest_path is ${archive.source_manifest_path}, expected ${manifestPath}`);
    increment(issueCounts, "manifest_path_mismatch");
  }
  if (archive.source_manifest_sha256 !== manifestInfo.sha256) {
    issues.push("Archive source_manifest_sha256 does not match current manifest.");
    increment(issueCounts, "manifest_hash_mismatch");
  }

  const archiveEntriesByPath = buildArchiveEntryMap(archive, issues, issueCounts);
  const physicalStagedFiles = (await walkFiles("data/staged-records")).filter((filePath) => filePath.endsWith(".json"));

  for (const filePath of physicalStagedFiles) {
    const bundleId = stagedDirectory(filePath);
    const bundleStatus = bundleStatusById.get(bundleId);
    if (!bundleStatus) {
      orphanPhysicalCount += 1;
      issues.push(`${filePath}: staged file has no matching candidate bundle.`);
      increment(issueCounts, "orphan_physical_staged_file");
      continue;
    }
    if (!terminalBundleStatuses.has(bundleStatus)) {
      activePhysicalCount += 1;
      continue;
    }

    terminalPhysicalPaths.push(filePath);
    const manifestChange = manifestChangesByPath.get(filePath);
    const archiveEntry = archiveEntriesByPath.get(filePath);
    const physicalInfo = await fileHash(filePath);

    if (!manifestChange) {
      issues.push(`${filePath}: terminal physical staged file is not in the terminal manifest.`);
      increment(issueCounts, "physical_staged_missing_manifest_entry");
      continue;
    }
    if (!archiveEntry) {
      issues.push(`${filePath}: terminal physical staged file has no changed-body archive entry.`);
      increment(issueCounts, "physical_staged_missing_archive_entry");
      continue;
    }
    if (physicalInfo.sha256 !== manifestChange.staged_file_sha256 || physicalInfo.bytes !== manifestChange.staged_file_bytes) {
      issues.push(`${filePath}: physical staged file no longer matches manifest hash/size.`);
      increment(issueCounts, "physical_manifest_mismatch");
      continue;
    }
    if (!metadataMatchesArchive(manifestChange, archiveEntry)) {
      issues.push(`${filePath}: archive metadata does not match manifest metadata.`);
      increment(issueCounts, "archive_metadata_mismatch");
      continue;
    }

    const archivedText = serializedRecord(archiveEntry.staged_record);
    const archivedHash = hashText(archivedText);
    const archivedBytes = Buffer.byteLength(archivedText);
    if (
      archivedHash !== manifestChange.staged_file_sha256 ||
      archivedBytes !== manifestChange.staged_file_bytes ||
      archivedText !== physicalInfo.text
    ) {
      issues.push(`${filePath}: archived body does not exactly match the physical staged JSON.`);
      increment(issueCounts, "archive_body_mismatch");
      continue;
    }

    const targetInfo = await fileHash(manifestChange.target_file_path);
    if (targetInfo.exists && targetInfo.sha256 === manifestChange.staged_file_sha256) {
      issues.push(`${filePath}: retained staged file is now identical to the current live target.`);
      increment(issueCounts, "retained_file_now_live_backed");
      continue;
    }

    matchingRetainedCount += 1;
    retainedBytes += physicalInfo.bytes ?? 0;
    increment(retainedReasonCounts, archiveEntry.archive_reason);
    increment(bundleCounts, manifestChange.bundle_id);
    if (retainedRows.length < 250) {
      retainedRows.push([
        manifestChange.bundle_id,
        manifestChange.change_id,
        archiveEntry.archive_reason,
        physicalInfo.bytes ?? 0,
        filePath,
        manifestChange.target_file_path
      ]);
    }
  }

  for (const [filePath, archiveEntry] of archiveEntriesByPath.entries()) {
    if (!manifestChangesByPath.has(filePath)) {
      issues.push(`${filePath}: archive entry has no matching terminal manifest change.`);
      increment(issueCounts, "archive_entry_missing_manifest_change");
      if (examples.length < 20) {
        examples.push([archiveEntry.bundle_id, archiveEntry.change_id, "archive_entry_missing_manifest_change", filePath]);
      }
      continue;
    }
    if (!terminalPhysicalPaths.includes(filePath)) {
      issues.push(`${filePath}: archive entry has no retained physical staged file.`);
      increment(issueCounts, "archive_entry_missing_physical_staged_file");
      if (examples.length < 20) {
        examples.push([archiveEntry.bundle_id, archiveEntry.change_id, "archive_entry_missing_physical_staged_file", filePath]);
      }
    }
  }

  for (const issue of issues) {
    if (examples.length >= 20) {
      break;
    }
    const pathMatch = issue.match(/^(data\/[^:]+):/);
    examples.push(["", "", "issue", pathMatch?.[1] ?? issue]);
  }

  return {
    passed: issues.length === 0,
    issues,
    issueCounts,
    examples,
    retainedReasonCounts,
    bundleCounts,
    retainedRows,
    summary: {
      physical_staged_json_count: physicalStagedFiles.length,
      active_physical_staged_json_count: activePhysicalCount,
      terminal_physical_staged_json_count: terminalPhysicalPaths.length,
      orphan_physical_staged_json_count: orphanPhysicalCount,
      archive_entry_count: archiveEntriesByPath.size,
      matching_retained_count: matchingRetainedCount,
      retained_bytes: retainedBytes,
      issue_count: issues.length,
      manifest_path: manifestPath,
      archive_path: archivePath
    }
  };
}

function buildReport(result) {
  const status = result.passed ? "pass" : "fail";

  return `# Retained Staged Records Report

Snapshot: generated by \`npm run audit:retained-staged-records -- --write\`.

This report verifies that every remaining physical terminal staged JSON file is intentionally retained because it exactly matches a changed-body archive entry.

## Status

- Status: \`${status}\`
- Issues: ${result.summary.issue_count}

## Summary

- Physical staged JSON files: ${result.summary.physical_staged_json_count}
- Active physical staged JSON files ignored by this audit: ${result.summary.active_physical_staged_json_count}
- Terminal physical staged JSON files checked: ${result.summary.terminal_physical_staged_json_count}
- Matching retained terminal staged JSON files: ${result.summary.matching_retained_count}
- Changed-body archive entries: ${result.summary.archive_entry_count}
- Retained physical staged bytes: ${formatBytes(result.summary.retained_bytes)}
- Manifest: ${result.summary.manifest_path}
- Archive: ${result.summary.archive_path}

## Retained Reasons

${result.retainedReasonCounts.size === 0 ? "- None." : table(
    ["Archive Reason", "Count"],
    sortCounts(result.retainedReasonCounts).map(([reason, count]) => [reason, count])
  )}

## Top Bundles By Retained Files

${result.bundleCounts.size === 0 ? "- None." : table(
    ["Bundle", "Retained Count"],
    sortCounts(result.bundleCounts).slice(0, 30).map(([bundleId, count]) => [bundleId, count])
  )}

## Retained Paths

${result.retainedRows.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Reason", "Bytes", "Staged Path", "Target Path"],
    result.retainedRows
  )}

## Issue Counts

${result.issueCounts.size === 0 ? "- None." : table(
    ["Issue", "Count"],
    sortCounts(result.issueCounts).map(([issue, count]) => [issue, count])
  )}

## Issue Examples

${result.examples.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Issue", "Path"],
    result.examples
  )}

## Issues

${bulletList(result.issues)}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!(await pathExists(manifestPath))) {
    process.stderr.write(`Missing staged-record manifest: ${manifestPath}\n`);
    process.exit(1);
  }
  if (!(await pathExists(archivePath))) {
    process.stderr.write(`Missing staged-record archive: ${archivePath}\n`);
    process.exit(1);
  }

  const result = await auditRetainedStagedRecords();
  const report = buildReport(result);

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(reportPath)), { recursive: true });
    await fs.writeFile(workspacePath(reportPath), report);
  }

  process.stdout.write(
    [
      `Retained staged records audit ${result.passed ? "passed" : "failed"}`,
      `${result.summary.matching_retained_count} retained physical staged file(s) matched archive entries`,
      `${result.summary.archive_entry_count} archive entr${result.summary.archive_entry_count === 1 ? "y" : "ies"}`,
      `${result.summary.issue_count} issue(s)`,
      `${formatBytes(result.summary.retained_bytes)} retained`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (!result.passed) {
    process.stderr.write(`Retained staged records audit failed with ${result.issues.length} issue(s):\n`);
    for (const issue of result.issues) {
      process.stderr.write(`- ${issue}\n`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
