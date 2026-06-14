#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const archivePath = "data/staged-record-archives/changed-terminal-bodies.v1.json";
const reportPath = "extra/staged-archive-verification-report.md";

function usage() {
  return `Usage:
  npm run verify:staged-archive [-- --write]

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

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function serializedRecord(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
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

async function verifyArchive() {
  const manifest = await readJson(manifestPath);
  const archive = await readJson(archivePath);
  const manifestHash = await fileHash(manifestPath);
  const issues = [];
  const reconstructionCounts = new Map();
  const issueCounts = new Map();
  const examples = [];
  const usedArchivePaths = new Set();
  const archiveEntriesByPath = new Map();

  if (archive.source_manifest_path !== manifestPath) {
    issues.push(`Archive source_manifest_path is ${archive.source_manifest_path}, expected ${manifestPath}`);
    increment(issueCounts, "manifest_path_mismatch");
  }
  if (archive.source_manifest_sha256 !== manifestHash.sha256) {
    issues.push("Archive source_manifest_sha256 does not match current manifest.");
    increment(issueCounts, "manifest_hash_mismatch");
  }

  for (const entry of archive.entries ?? []) {
    if (archiveEntriesByPath.has(entry.staged_file_path)) {
      issues.push(`Archive has duplicate staged body: ${entry.staged_file_path}`);
      increment(issueCounts, "duplicate_archive_entry");
    }
    archiveEntriesByPath.set(entry.staged_file_path, entry);
  }

  let totalChanges = 0;
  let liveReconstructable = 0;
  let archiveReconstructable = 0;
  let legacyUnstagedCount = 0;

  for (const bundle of manifest.bundles ?? []) {
    legacyUnstagedCount += bundle.legacy_unstaged_change_count ?? 0;

    for (const change of bundle.changes ?? []) {
      totalChanges += 1;
      const targetInfo = await fileHash(change.target_file_path);
      const archiveEntry = archiveEntriesByPath.get(change.staged_file_path);

      if (targetInfo.exists && targetInfo.sha256 === change.staged_file_sha256) {
        if (targetInfo.sha256 !== change.target_file_sha256 || targetInfo.bytes !== change.target_file_bytes) {
          issues.push(`${change.staged_file_path}: live target reconstructs staged hash but target manifest metadata drifted.`);
          increment(issueCounts, "target_metadata_drift");
          if (examples.length < 20) {
            examples.push([bundle.bundle_id, change.change_id, "target_metadata_drift", change.staged_file_path]);
          }
        }
        if (archiveEntry) {
          issues.push(`${change.staged_file_path}: archive stores body that is identical to current live target.`);
          increment(issueCounts, "unnecessary_archive_entry");
          if (examples.length < 20) {
            examples.push([bundle.bundle_id, change.change_id, "unnecessary_archive_entry", change.staged_file_path]);
          }
        }
        liveReconstructable += 1;
        increment(reconstructionCounts, "from_live_target");
        continue;
      }

      if (!archiveEntry) {
        issues.push(`${change.staged_file_path}: no archive entry for staged body that cannot be reconstructed from live target.`);
        increment(issueCounts, "missing_archive_entry");
        if (examples.length < 20) {
          examples.push([bundle.bundle_id, change.change_id, "missing_archive_entry", change.staged_file_path]);
        }
        continue;
      }

      usedArchivePaths.add(change.staged_file_path);
      const reconstructed = serializedRecord(archiveEntry.staged_record);
      const reconstructedHash = hashText(reconstructed);
      const reconstructedBytes = Buffer.byteLength(reconstructed);

      const metadataMatches =
        archiveEntry.bundle_id === bundle.bundle_id &&
        archiveEntry.change_id === change.change_id &&
        archiveEntry.target_record_type === change.target_record_type &&
        archiveEntry.target_record_id === change.target_record_id &&
        archiveEntry.target_file_path === change.target_file_path &&
        archiveEntry.staged_file_sha256 === change.staged_file_sha256 &&
        archiveEntry.staged_file_bytes === change.staged_file_bytes;

      if (!metadataMatches) {
        issues.push(`${change.staged_file_path}: archive metadata does not match manifest change metadata.`);
        increment(issueCounts, "archive_metadata_mismatch");
        if (examples.length < 20) {
          examples.push([bundle.bundle_id, change.change_id, "archive_metadata_mismatch", change.staged_file_path]);
        }
      }
      if (reconstructedHash !== change.staged_file_sha256 || reconstructedBytes !== change.staged_file_bytes) {
        issues.push(`${change.staged_file_path}: archived staged body does not reconstruct manifest hash/size.`);
        increment(issueCounts, "archive_body_hash_mismatch");
        if (examples.length < 20) {
          examples.push([bundle.bundle_id, change.change_id, "archive_body_hash_mismatch", change.staged_file_path]);
        }
        continue;
      }

      archiveReconstructable += 1;
      increment(reconstructionCounts, "from_archive_body");
    }
  }

  for (const entry of archive.entries ?? []) {
    if (!usedArchivePaths.has(entry.staged_file_path)) {
      const targetInfo = await fileHash(entry.target_file_path);
      if (!targetInfo.exists || targetInfo.sha256 !== entry.staged_file_sha256) {
        continue;
      }
      issues.push(`${entry.staged_file_path}: archive entry is not needed for reconstruction.`);
      increment(issueCounts, "unused_archive_entry");
      if (examples.length < 20) {
        examples.push([entry.bundle_id, entry.change_id, "unused_archive_entry", entry.staged_file_path]);
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    issueCounts,
    examples,
    reconstructionCounts,
    summary: {
      total_staged_changes: totalChanges,
      reconstructed_from_live_count: liveReconstructable,
      reconstructed_from_archive_count: archiveReconstructable,
      reconstructed_total_count: liveReconstructable + archiveReconstructable,
      archive_entry_count: (archive.entries ?? []).length,
      legacy_unstaged_change_count: legacyUnstagedCount,
      issue_count: issues.length,
      manifest_path: manifestPath,
      archive_path: archivePath
    }
  };
}

function buildReport(result) {
  const status = result.passed ? "pass" : "fail";

  return `# Staged Archive Verification Report

Snapshot: generated by \`npm run verify:staged-archive -- --write\`.

This report verifies whether every terminal staged file can be reconstructed without reading \`data/staged-records/\`: identical staged records come from current live files, and changed staged records come from the archive pack.

## Status

- Status: \`${status}\`
- Issues: ${result.summary.issue_count}

## Summary

- Staged changes checked: ${result.summary.total_staged_changes}
- Reconstructed from live targets: ${result.summary.reconstructed_from_live_count}
- Reconstructed from archive bodies: ${result.summary.reconstructed_from_archive_count}
- Reconstructed total: ${result.summary.reconstructed_total_count}
- Archive entries: ${result.summary.archive_entry_count}
- Legacy unstaged changes: ${result.summary.legacy_unstaged_change_count}
- Manifest: ${result.summary.manifest_path}
- Archive: ${result.summary.archive_path}

## Reconstruction Sources

${table(
    ["Source", "Count"],
    sortCounts(result.reconstructionCounts).map(([source, count]) => [source, count])
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

  const result = await verifyArchive();
  const report = buildReport(result);

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(reportPath)), { recursive: true });
    await fs.writeFile(workspacePath(reportPath), report);
  }

  process.stdout.write(
    [
      `Staged archive verification ${result.passed ? "passed" : "failed"}`,
      `${result.summary.reconstructed_total_count}/${result.summary.total_staged_changes} staged file(s) reconstructed`,
      `${result.summary.reconstructed_from_live_count} from live`,
      `${result.summary.reconstructed_from_archive_count} from archive`,
      `${result.summary.issue_count} issue(s)`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (!result.passed) {
    process.stderr.write(`Staged archive verification failed with ${result.issues.length} issue(s):\n`);
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
