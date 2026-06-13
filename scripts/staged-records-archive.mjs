#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const archivePath = "data/staged-record-archives/changed-terminal-bodies.v1.json";

function usage() {
  return `Usage:
  npm run archive:staged-records [-- --write] [-- --check]

Options:
  --write   Write ${archivePath}.
  --check   Fail if ${archivePath} is missing or differs from the generated archive.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    help: args.includes("--help") || args.includes("-h"),
    write: args.includes("--write"),
    check: args.includes("--check")
  };
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

async function pathExists(relativePath) {
  return existsSync(workspacePath(relativePath));
}

async function readFileBuffer(relativePath) {
  return fs.readFile(workspacePath(relativePath));
}

async function fileInfo(relativePath) {
  if (!(await pathExists(relativePath))) {
    return {
      exists: false,
      bytes: null,
      sha256: null
    };
  }

  const raw = await readFileBuffer(relativePath);
  return {
    exists: true,
    bytes: raw.length,
    sha256: createHash("sha256").update(raw).digest("hex")
  };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

function hasManifestDrift(change, stagedInfo, targetInfo) {
  return (
    !stagedInfo.exists ||
    stagedInfo.sha256 !== change.staged_file_sha256 ||
    stagedInfo.bytes !== change.staged_file_bytes ||
    targetInfo.exists !== change.target_file_exists ||
    targetInfo.sha256 !== change.target_file_sha256 ||
    targetInfo.bytes !== change.target_file_bytes
  );
}

async function buildArchive() {
  const issues = [];
  const manifest = await readJson(manifestPath);
  const manifestInfo = await fileInfo(manifestPath);
  const entries = [];
  let totalStagedFileCount = 0;
  let identicalToLiveCount = 0;
  let missingLiveTargetCount = 0;
  let manifestDriftCount = 0;
  let archivedBodyBytes = 0;

  for (const bundle of manifest.bundles ?? []) {
    for (const change of bundle.changes ?? []) {
      totalStagedFileCount += 1;
      const stagedInfo = await fileInfo(change.staged_file_path);
      const targetInfo = await fileInfo(change.target_file_path);

      if (hasManifestDrift(change, stagedInfo, targetInfo)) {
        manifestDriftCount += 1;
        if (!stagedInfo.exists) {
          issues.push(`${bundle.bundle_id}: missing staged file ${change.staged_file_path}`);
        } else if (stagedInfo.sha256 !== change.staged_file_sha256 || stagedInfo.bytes !== change.staged_file_bytes) {
          issues.push(`${bundle.bundle_id}: staged file drift ${change.staged_file_path}`);
        } else {
          issues.push(`${bundle.bundle_id}: target file drift ${change.target_file_path}`);
        }
        continue;
      }

      if (targetInfo.exists && stagedInfo.sha256 === targetInfo.sha256) {
        identicalToLiveCount += 1;
        continue;
      }

      if (!targetInfo.exists) {
        missingLiveTargetCount += 1;
      }

      const stagedRecord = await readJson(change.staged_file_path);
      archivedBodyBytes += stagedInfo.bytes ?? 0;
      entries.push({
        bundle_id: bundle.bundle_id,
        change_id: change.change_id,
        archive_reason: targetInfo.exists ? "differs_from_live" : "missing_live_target",
        target_record_type: change.target_record_type,
        target_record_id: change.target_record_id,
        target_file_path: change.target_file_path,
        target_file_exists: targetInfo.exists,
        target_file_sha256: targetInfo.sha256,
        target_file_bytes: targetInfo.bytes,
        staged_file_path: change.staged_file_path,
        staged_file_sha256: stagedInfo.sha256,
        staged_file_bytes: stagedInfo.bytes,
        staged_record: stagedRecord
      });
    }
  }

  if (manifestDriftCount > 0) {
    issues.unshift(
      `${manifestDriftCount} manifest drift entr${manifestDriftCount === 1 ? "y" : "ies"} found; regenerate or repair ${manifestPath} before writing archive`
    );
  }

  const archive = {
    schema_version: "1.0.0",
    archive_type: "changed_terminal_staged_bodies",
    generated_by: "scripts/staged-records-archive.mjs",
    source_manifest_path: manifestPath,
    source_manifest_sha256: manifestInfo.sha256,
    summary: {
      terminal_bundle_count: manifest.summary?.terminal_bundle_count ?? 0,
      total_staged_file_count: totalStagedFileCount,
      identical_to_live_count: identicalToLiveCount,
      archived_body_count: entries.length,
      archived_body_bytes: archivedBodyBytes,
      missing_live_target_count: missingLiveTargetCount,
      manifest_drift_count: manifestDriftCount,
      legacy_unstaged_change_count: manifest.summary?.legacy_unstaged_change_count ?? 0
    },
    entries: entries.sort((left, right) => {
      const bundleCompare = left.bundle_id.localeCompare(right.bundle_id);
      return bundleCompare || left.staged_file_path.localeCompare(right.staged_file_path);
    })
  };

  return { archive, issues };
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

  const { archive, issues } = await buildArchive();
  const serialized = `${JSON.stringify(archive, null, 2)}\n`;

  if (issues.length > 0) {
    process.stderr.write(`Staged-record archive failed with ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      process.stderr.write(`- ${issue}\n`);
    }
    process.exit(1);
  }

  if (options.check) {
    if (!(await pathExists(archivePath))) {
      process.stderr.write(`Staged-record archive is missing: ${archivePath}\n`);
      process.exit(1);
    }
    const existing = await fs.readFile(workspacePath(archivePath), "utf8");
    if (existing !== serialized) {
      process.stderr.write(`Staged-record archive is out of date: ${archivePath}\n`);
      process.exit(1);
    }
  }

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(archivePath)), { recursive: true });
    await fs.writeFile(workspacePath(archivePath), serialized);
  }

  process.stdout.write(
    [
      `Staged-record archive: ${archive.summary.archived_body_count} changed bod${archive.summary.archived_body_count === 1 ? "y" : "ies"}`,
      `${archive.summary.identical_to_live_count} identical staged file(s) omitted`,
      `${archive.summary.manifest_drift_count} manifest drift entr${archive.summary.manifest_drift_count === 1 ? "y" : "ies"}`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${archivePath}.\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
