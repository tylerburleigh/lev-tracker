#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const reportPath = "extra/staged-archive-readiness-report.md";

function usage() {
  return `Usage:
  npm run audit:staged-archive-readiness [-- --write] [-- --max-manifest-drift N]

Options:
  --write                 Write ${reportPath}.
  --max-manifest-drift N   Fail when manifest drift count exceeds N.`;
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
    maxManifestDrift: parseIntegerOption(args, "--max-manifest-drift")
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
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

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
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

function percent(part, total) {
  if (total === 0) {
    return "0.0%";
  }
  return `${((part / total) * 100).toFixed(1)}%`;
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

async function classifyChange(change) {
  const stagedInfo = await fileInfo(change.staged_file_path);
  const targetInfo = await fileInfo(change.target_file_path);
  const reconstructsFromLive =
    targetInfo.exists &&
    targetInfo.sha256 === change.staged_file_sha256 &&
    targetInfo.bytes === change.staged_file_bytes;
  const drift = [];

  if (!stagedInfo.exists && !reconstructsFromLive) {
    drift.push("missing_staged_file");
  } else if (stagedInfo.exists) {
    if (stagedInfo.sha256 !== change.staged_file_sha256) {
      drift.push("staged_hash_changed");
    }
    if (stagedInfo.bytes !== change.staged_file_bytes) {
      drift.push("staged_size_changed");
    }
  }

  if (targetInfo.exists !== change.target_file_exists) {
    drift.push("target_existence_changed");
  }
  if (targetInfo.sha256 !== change.target_file_sha256) {
    drift.push("target_hash_changed");
  }
  if (targetInfo.bytes !== change.target_file_bytes) {
    drift.push("target_size_changed");
  }

  let status = "unknown";
  if (!stagedInfo.exists && !reconstructsFromLive) {
    status = "missing_staged_file";
  } else if (!targetInfo.exists) {
    status = "missing_live_target";
  } else if (reconstructsFromLive || stagedInfo.sha256 === targetInfo.sha256) {
    status = "identical_to_live";
  } else {
    status = "differs_from_live";
  }

  return {
    status,
    drift,
    stagedBytes: stagedInfo.bytes ?? change.staged_file_bytes ?? 0,
    targetBytes: targetInfo.bytes ?? change.target_file_bytes ?? 0,
    stagedBodyStorage: stagedInfo.exists ? "staged_file" : "live_target",
    bundleId: change.bundle_id,
    changeId: change.change_id,
    targetRecordType: change.target_record_type,
    targetRecordId: change.target_record_id,
    targetFilePath: change.target_file_path,
    stagedFilePath: change.staged_file_path
  };
}

async function classifyLegacyChange(bundleId, change) {
  const targetInfo = await fileInfo(change.target_file_path);
  const drift = [];
  if (targetInfo.exists !== change.target_file_exists) {
    drift.push("target_existence_changed");
  }
  if (targetInfo.sha256 !== change.target_file_sha256) {
    drift.push("target_hash_changed");
  }
  if (targetInfo.bytes !== change.target_file_bytes) {
    drift.push("target_size_changed");
  }

  return {
    bundleId,
    changeId: change.change_id,
    status: targetInfo.exists ? "legacy_unstaged_live_target" : "legacy_unstaged_missing_target",
    drift,
    targetRecordType: change.target_record_type,
    targetRecordId: change.target_record_id,
    targetFilePath: change.target_file_path,
    targetBytes: targetInfo.bytes ?? change.target_file_bytes ?? 0
  };
}

async function buildReadiness() {
  const manifest = await readJson(manifestPath);
  const statusCounts = new Map();
  const driftCounts = new Map();
  const typeCounts = new Map();
  const bundleDiffCounts = new Map();
  const legacyStatusCounts = new Map();
  const differingExamples = [];
  const missingExamples = [];
  const driftExamples = [];
  const legacyExamples = [];
  const bodyRetentionCandidates = [];

  let stagedBytes = 0;
  let manifestDriftCount = 0;
  let bodyRetentionBytes = 0;
  let bodyRetentionFileCount = 0;
  let liveBackedPrunedCount = 0;

  for (const bundle of manifest.bundles ?? []) {
    for (const change of bundle.changes ?? []) {
      const classified = await classifyChange({ ...change, bundle_id: bundle.bundle_id });
      increment(statusCounts, classified.status);
      increment(typeCounts, classified.targetRecordType);
      stagedBytes += classified.stagedBytes;
      if (classified.stagedBodyStorage === "live_target") {
        liveBackedPrunedCount += 1;
      }

      if (classified.drift.length > 0) {
        manifestDriftCount += 1;
        for (const drift of classified.drift) {
          increment(driftCounts, drift);
        }
        if (driftExamples.length < 12) {
          driftExamples.push(classified);
        }
      }

      if (classified.status === "differs_from_live") {
        increment(bundleDiffCounts, classified.bundleId);
        if (differingExamples.length < 20) {
          differingExamples.push(classified);
        }
        bodyRetentionCandidates.push(classified);
      } else if (classified.status === "missing_live_target" || classified.status === "missing_staged_file") {
        if (missingExamples.length < 20) {
          missingExamples.push(classified);
        }
        bodyRetentionCandidates.push(classified);
      }
    }

    for (const legacyChange of bundle.legacy_unstaged_changes ?? []) {
      const classified = await classifyLegacyChange(bundle.bundle_id, legacyChange);
      increment(legacyStatusCounts, classified.status);
      if (classified.drift.length > 0) {
        manifestDriftCount += 1;
        for (const drift of classified.drift) {
          increment(driftCounts, drift);
        }
        if (driftExamples.length < 12) {
          driftExamples.push(classified);
        }
      }
      if (legacyExamples.length < 20) {
        legacyExamples.push(classified);
      }
    }
  }

  const bodyRetentionPaths = new Set();
  for (const candidate of bodyRetentionCandidates) {
    if (!bodyRetentionPaths.has(candidate.stagedFilePath)) {
      bodyRetentionPaths.add(candidate.stagedFilePath);
      bodyRetentionFileCount += 1;
      bodyRetentionBytes += candidate.stagedBytes;
    }
  }

  const totalStagedFiles = [...statusCounts.values()].reduce((total, count) => total + count, 0);
  const identicalCount = statusCounts.get("identical_to_live") ?? 0;
  const differsCount = statusCounts.get("differs_from_live") ?? 0;
  const missingTargetCount = statusCounts.get("missing_live_target") ?? 0;
  const missingStagedCount = statusCounts.get("missing_staged_file") ?? 0;

  let archive_verdict = "manifest_only_sufficient";
  let recommendation =
    "Manifest-only archival appears sufficient for staged JSON because every staged file matches its live target.";
  if (manifestDriftCount > 0) {
    archive_verdict = "refresh_manifest_before_decision";
    recommendation =
      "Refresh or repair the staged-record manifest before making an archive decision because current files no longer match manifest metadata.";
  } else if (differsCount > 0 || missingTargetCount > 0 || missingStagedCount > 0) {
    archive_verdict = "retain_changed_staged_bodies";
    recommendation =
      "Do not use manifest-only archival. Retain full staged bodies for staged files that differ from current live targets or lack live targets; manifest-only is adequate only for identical staged files.";
  }

  return {
    manifest,
    archive_verdict,
    recommendation,
    summary: {
      total_staged_files: totalStagedFiles,
      identical_to_live_count: identicalCount,
      differs_from_live_count: differsCount,
      missing_live_target_count: missingTargetCount,
      missing_staged_file_count: missingStagedCount,
      identical_to_live_percent: percent(identicalCount, totalStagedFiles),
      manifest_drift_count: manifestDriftCount,
      staged_bytes: stagedBytes,
      body_retention_file_count: bodyRetentionFileCount,
      body_retention_bytes: bodyRetentionBytes,
      live_backed_pruned_count: liveBackedPrunedCount,
      manifest_file_path: manifestPath
    },
    statusCounts,
    driftCounts,
    typeCounts,
    bundleDiffCounts,
    legacyStatusCounts,
    differingExamples,
    missingExamples,
    driftExamples,
    legacyExamples
  };
}

function formatExampleRows(examples) {
  return examples.map((item) => [
    item.bundleId,
    item.changeId,
    item.targetRecordType,
    item.targetRecordId,
    item.status,
    item.stagedFilePath ?? item.targetFilePath
  ]);
}

function buildReport(readiness) {
  const { summary } = readiness;
  const generatedAt = new Date().toISOString();

  return `# Staged Archive Readiness Report

Generated: ${generatedAt}

This report compares terminal staged records against current live target files. It is non-destructive: it decides whether manifest-only archival would preserve enough, or whether some staged JSON bodies still need to be retained.

## Verdict

- Verdict: \`${readiness.archive_verdict}\`
- Recommendation: ${readiness.recommendation}

## Summary

- Staged files checked: ${summary.total_staged_files}
- Identical to current live target: ${summary.identical_to_live_count} (${summary.identical_to_live_percent})
- Different from current live target: ${summary.differs_from_live_count}
- Missing live target: ${summary.missing_live_target_count}
- Missing staged file: ${summary.missing_staged_file_count}
- Manifest drift entries: ${summary.manifest_drift_count}
- Staged body bytes checked: ${formatBytes(summary.staged_bytes)}
- Staged bodies requiring retention: ${summary.body_retention_file_count} file(s), ${formatBytes(summary.body_retention_bytes)}
- Pruned staged bodies reconstructed from live targets: ${summary.live_backed_pruned_count}
- Manifest source: ${summary.manifest_file_path}

## Status Counts

${table(
    ["Status", "Count"],
    sortCounts(readiness.statusCounts).map(([status, count]) => [status, count])
  )}

## Legacy Unstaged Changes

${readiness.legacyStatusCounts.size === 0 ? "- None." : table(
    ["Status", "Count"],
    sortCounts(readiness.legacyStatusCounts).map(([status, count]) => [status, count])
  )}

## Record Types

${table(
    ["Record Type", "Staged File Count"],
    sortCounts(readiness.typeCounts).map(([recordType, count]) => [recordType, count])
  )}

## Bundles With Changed Staged Bodies

${readiness.bundleDiffCounts.size === 0 ? "- None." : table(
    ["Bundle", "Differing Staged File Count"],
    sortCounts(readiness.bundleDiffCounts).slice(0, 20).map(([bundleId, count]) => [bundleId, count])
  )}

## Differing Examples

${readiness.differingExamples.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Type", "Record", "Status", "Path"],
    formatExampleRows(readiness.differingExamples)
  )}

## Missing Examples

${readiness.missingExamples.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Type", "Record", "Status", "Path"],
    formatExampleRows(readiness.missingExamples)
  )}

## Manifest Drift

${readiness.driftCounts.size === 0 ? "- None." : table(
    ["Drift", "Count"],
    sortCounts(readiness.driftCounts).map(([drift, count]) => [drift, count])
  )}

${readiness.driftExamples.length === 0 ? "" : table(
    ["Bundle", "Change", "Type", "Record", "Status", "Path"],
    formatExampleRows(readiness.driftExamples)
  )}

## Legacy Examples

${readiness.legacyExamples.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Type", "Record", "Status", "Path"],
    formatExampleRows(readiness.legacyExamples)
  )}
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

  const readiness = await buildReadiness();
  const report = buildReport(readiness);

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(reportPath)), { recursive: true });
    await fs.writeFile(workspacePath(reportPath), report);
  }

  process.stdout.write(
    [
      `Staged archive readiness: ${readiness.summary.total_staged_files} staged file(s) checked`,
      `${readiness.summary.identical_to_live_count} identical`,
      `${readiness.summary.differs_from_live_count} different`,
      `${readiness.summary.manifest_drift_count} manifest drift entr${readiness.summary.manifest_drift_count === 1 ? "y" : "ies"}`,
      `verdict ${readiness.archive_verdict}`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (
    options.maxManifestDrift !== undefined &&
    readiness.summary.manifest_drift_count > options.maxManifestDrift
  ) {
    process.stderr.write(
      `Staged archive readiness failed: manifest drift count ${readiness.summary.manifest_drift_count} exceeds --max-manifest-drift ${options.maxManifestDrift}.\n`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
