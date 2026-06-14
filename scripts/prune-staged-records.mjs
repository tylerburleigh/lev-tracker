#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const archivePath = "data/staged-record-archives/changed-terminal-bodies.v1.json";
const reportPath = "extra/staged-prune-dry-run-report.md";

function usage() {
  return `Usage:
  npm run prune:staged-records -- --dry-run [--write]
  npm run prune:staged-records -- --apply --confirm-prune-terminal-staged-records [--write]

Options:
  --dry-run   Required. Report safe removals without deleting files.
  --apply     Delete safe removal candidates after all checks pass.
  --confirm-prune-terminal-staged-records
              Required with --apply.
  --write     Write ${reportPath}.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    help: args.includes("--help") || args.includes("-h"),
    dryRun: args.includes("--dry-run"),
    apply: args.includes("--apply"),
    confirmApply: args.includes("--confirm-prune-terminal-staged-records"),
    write: args.includes("--write")
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

async function pathExists(relativePath) {
  return existsSync(workspacePath(relativePath));
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

async function fileHash(relativePath) {
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

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function pathDirectory(filePath) {
  return filePath.split("/").slice(0, -1).join("/");
}

async function buildPlan() {
  const manifest = await readJson(manifestPath);
  const archive = await readJson(archivePath);
  const manifestHash = await fileHash(manifestPath);
  const issues = [];
  const archivedPaths = new Set((archive.entries ?? []).map((entry) => entry.staged_file_path));
  const safeRemovals = [];
  const alreadyPruned = [];
  const retained = [];
  const bundleRemovalCounts = new Map();
  const retainedReasonCounts = new Map();
  const alreadyPrunedCounts = new Map();
  let removableBytes = 0;

  if (archive.source_manifest_path !== manifestPath) {
    issues.push(`Archive source_manifest_path is ${archive.source_manifest_path}, expected ${manifestPath}`);
  }
  if (archive.source_manifest_sha256 !== manifestHash.sha256) {
    issues.push("Archive source_manifest_sha256 does not match current manifest.");
  }

  for (const bundle of manifest.bundles ?? []) {
    for (const change of bundle.changes ?? []) {
      const stagedInfo = await fileHash(change.staged_file_path);
      const targetInfo = await fileHash(change.target_file_path);

      const isLiveBacked =
        targetInfo.exists &&
        targetInfo.sha256 === change.staged_file_sha256 &&
        targetInfo.bytes === change.staged_file_bytes;

      if (!stagedInfo.exists) {
        if (isLiveBacked && !archivedPaths.has(change.staged_file_path)) {
          alreadyPruned.push({
            bundleId: bundle.bundle_id,
            changeId: change.change_id,
            path: change.staged_file_path,
            bytes: change.staged_file_bytes ?? 0,
            targetPath: change.target_file_path
          });
          increment(alreadyPrunedCounts, bundle.bundle_id);
          continue;
        }

        issues.push(`${change.staged_file_path}: staged file is missing and cannot be reconstructed from the live target.`);
        retained.push({ bundleId: bundle.bundle_id, path: change.staged_file_path, reason: "missing_staged_file" });
        increment(retainedReasonCounts, "missing_staged_file");
        continue;
      }
      if (stagedInfo.sha256 !== change.staged_file_sha256 || stagedInfo.bytes !== change.staged_file_bytes) {
        issues.push(`${change.staged_file_path}: staged file no longer matches manifest.`);
        retained.push({ bundleId: bundle.bundle_id, path: change.staged_file_path, reason: "staged_manifest_drift" });
        increment(retainedReasonCounts, "staged_manifest_drift");
        continue;
      }

      if (isLiveBacked && !archivedPaths.has(change.staged_file_path)) {
        safeRemovals.push({
          bundleId: bundle.bundle_id,
          changeId: change.change_id,
          path: change.staged_file_path,
          bytes: stagedInfo.bytes ?? 0,
          targetPath: change.target_file_path
        });
        removableBytes += stagedInfo.bytes ?? 0;
        increment(bundleRemovalCounts, bundle.bundle_id);
        continue;
      }

      const reason = archivedPaths.has(change.staged_file_path)
        ? "archived_changed_body"
        : targetInfo.exists
          ? "differs_from_live_without_archive"
          : "missing_live_target";
      retained.push({ bundleId: bundle.bundle_id, path: change.staged_file_path, reason });
      increment(retainedReasonCounts, reason);
      if (reason !== "archived_changed_body") {
        issues.push(`${change.staged_file_path}: retained because ${reason}.`);
      }
    }
  }

  const candidateDirectories = new Set(safeRemovals.map((item) => pathDirectory(item.path)));

  return {
    passed: issues.length === 0,
    issues,
    safeRemovals: safeRemovals.sort((left, right) => left.path.localeCompare(right.path)),
    alreadyPruned: alreadyPruned.sort((left, right) => left.path.localeCompare(right.path)),
    retained: retained.sort((left, right) => left.path.localeCompare(right.path)),
    bundleRemovalCounts,
    alreadyPrunedCounts,
    retainedReasonCounts,
    summary: {
      total_staged_files: safeRemovals.length + alreadyPruned.length + retained.length,
      safe_removal_count: safeRemovals.length,
      already_pruned_count: alreadyPruned.length,
      retained_count: retained.length,
      removable_bytes: removableBytes,
      candidate_directory_count: candidateDirectories.size,
      issue_count: issues.length,
      manifest_path: manifestPath,
      archive_path: archivePath
    }
  };
}

function buildReport(plan, options = {}) {
  const status = plan.passed ? "pass" : "fail";
  const mode = options.appliedRemovalCount === undefined ? "dry-run" : "apply";

  return `# Staged Prune Dry-Run Report

Snapshot: generated by \`npm run prune:staged-records -- --dry-run --write\`.

This report lists terminal staged JSON files that can be removed because staged archive verification proves they can be reconstructed from current live records. Dry-run mode does not delete files; apply mode deletes only the safe-removal candidates after the same checks pass.

## Status

- Status: \`${status}\`
- Mode: \`${mode}\`
- Issues: ${plan.summary.issue_count}
- Removed this run: ${options.appliedRemovalCount ?? 0}

## Summary

- Total staged files considered: ${plan.summary.total_staged_files}
- Safe to remove: ${plan.summary.safe_removal_count}
- Already pruned: ${plan.summary.already_pruned_count}
- Retained: ${plan.summary.retained_count}
- Estimated removable staged bytes: ${formatBytes(plan.summary.removable_bytes)}
- Candidate staged directories touched: ${plan.summary.candidate_directory_count}
- Manifest: ${plan.summary.manifest_path}
- Archive: ${plan.summary.archive_path}

## Retained Reasons

${plan.retainedReasonCounts.size === 0 ? "- None." : table(
    ["Reason", "Count"],
    sortCounts(plan.retainedReasonCounts).map(([reason, count]) => [reason, count])
  )}

## Top Bundles By Removable Files

${plan.bundleRemovalCounts.size === 0 ? "- None." : table(
    ["Bundle", "Safe Removal Count"],
    sortCounts(plan.bundleRemovalCounts).slice(0, 30).map(([bundleId, count]) => [bundleId, count])
  )}

## Top Bundles Already Pruned

${plan.alreadyPrunedCounts.size === 0 ? "- None." : table(
    ["Bundle", "Already Pruned Count"],
    sortCounts(plan.alreadyPrunedCounts).slice(0, 30).map(([bundleId, count]) => [bundleId, count])
  )}

## Safe Removal Paths

${plan.safeRemovals.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Bytes", "Staged Path", "Live Reconstruction Path"],
    plan.safeRemovals.map((item) => [
      item.bundleId,
      item.changeId,
      item.bytes,
      item.path,
      item.targetPath
    ])
  )}

## Already Pruned Paths

${plan.alreadyPruned.length === 0 ? "- None." : table(
    ["Bundle", "Change", "Bytes", "Staged Path", "Live Reconstruction Path"],
    plan.alreadyPruned.map((item) => [
      item.bundleId,
      item.changeId,
      item.bytes,
      item.path,
      item.targetPath
    ])
  )}

## Retained Paths

${plan.retained.length === 0 ? "- None." : table(
    ["Bundle", "Reason", "Staged Path"],
    plan.retained.map((item) => [item.bundleId, item.reason, item.path])
  )}

## Issues

${plan.issues.length === 0 ? "- None." : plan.issues.map((issue) => `- ${issue}`).join("\n")}
`;
}

async function removeIfEmpty(relativeDirectory) {
  const stagedRoot = workspacePath("data/staged-records");
  let current = workspacePath(relativeDirectory);

  while (current.startsWith(stagedRoot) && current !== stagedRoot) {
    try {
      await fs.rmdir(current);
    } catch (error) {
      if (error.code === "ENOTEMPTY" || error.code === "ENOENT") {
        return;
      }
      throw error;
    }
    current = path.dirname(current);
  }
}

async function applyRemovals(plan) {
  let removedCount = 0;
  for (const item of plan.safeRemovals) {
    await fs.rm(workspacePath(item.path));
    removedCount += 1;
    await removeIfEmpty(pathDirectory(item.path));
  }
  return removedCount;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (options.dryRun === options.apply) {
    process.stderr.write("Choose exactly one of --dry-run or --apply.\n");
    process.stderr.write(`${usage()}\n`);
    process.exit(1);
  }
  if (options.apply && !options.confirmApply) {
    process.stderr.write("Refusing to apply without --confirm-prune-terminal-staged-records.\n");
    process.stderr.write(`${usage()}\n`);
    process.exit(1);
  }

  const plan = await buildPlan();
  let appliedRemovalCount;

  if (options.apply) {
    if (!plan.passed) {
      process.stderr.write("Refusing to apply because the staged prune plan has issues.\n");
      process.exit(1);
    }
    appliedRemovalCount = await applyRemovals(plan);
  }

  const reportPlan = options.apply ? await buildPlan() : plan;
  const report = buildReport(reportPlan, { appliedRemovalCount });

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(reportPath)), { recursive: true });
    await fs.writeFile(workspacePath(reportPath), report);
  }

  process.stdout.write(
    [
      `Staged prune ${options.apply ? "apply" : "dry run"} ${plan.passed ? "passed" : "failed"}`,
      `${plan.summary.safe_removal_count} safe removal candidate(s)`,
      `${reportPlan.summary.already_pruned_count} already pruned staged file(s)`,
      `${reportPlan.summary.retained_count} retained staged file(s)`,
      `${reportPlan.summary.issue_count} issue(s)`,
      `${formatBytes(plan.summary.removable_bytes)} removable`,
      `${appliedRemovalCount ?? 0} removed this run`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (!plan.passed) {
    process.stderr.write(`Staged prune dry run failed with ${plan.issues.length} issue(s):\n`);
    for (const issue of plan.issues) {
      process.stderr.write(`- ${issue}\n`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
