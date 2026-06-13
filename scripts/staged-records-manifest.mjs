#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = "data/staged-record-manifests/terminal-bundles.v1.json";
const terminalBundleStatuses = new Set(["published", "rejected"]);

const typeDirs = {
  activity_item: "activity-items",
  candidate_bundle: "candidate-bundles",
  evidence_review: "evidence-reviews",
  finding: "findings",
  intervention: "interventions",
  outlook: "outlooks",
  publication_event: "publication-events",
  review_comment: "review-comments",
  source: "sources",
  study: "studies"
};

function usage() {
  return `Usage:
  npm run manifest:staged-records [-- --write] [-- --check]

Options:
  --write   Write ${manifestPath}.
  --check   Fail if ${manifestPath} is missing or differs from the generated manifest.`;
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

async function listDirectories(relativePath) {
  if (!(await pathExists(relativePath))) {
    return [];
  }

  const entries = await fs.readdir(workspacePath(relativePath), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

async function readJsonCollection(relativeDir) {
  const files = (await walkFiles(relativeDir)).filter((filePath) => filePath.endsWith(".json"));
  return Promise.all(
    files.map(async (filePath) => ({
      filePath,
      record: await readJson(filePath)
    }))
  );
}

async function fileInfo(relativePath) {
  if (!(await pathExists(relativePath))) {
    return {
      exists: false,
      bytes: null,
      sha256: null
    };
  }

  const absolutePath = workspacePath(relativePath);
  const raw = await fs.readFile(absolutePath);
  return {
    exists: true,
    bytes: raw.length,
    sha256: createHash("sha256").update(raw).digest("hex")
  };
}

function targetFilePath(change) {
  if (change.file_path) {
    return toPosix(change.file_path);
  }

  const typeDir = typeDirs[change.target_record_type];
  if (!typeDir) {
    return undefined;
  }

  return `data/${typeDir}/${change.target_record_id}.json`;
}

function changeKey(bundleId, change) {
  return `${bundleId}\0${change.change_id}\0${change.staged_file_path}`;
}

async function readExistingManifestChanges() {
  if (!(await pathExists(manifestPath))) {
    return new Map();
  }

  const manifest = await readJson(manifestPath);
  const changes = new Map();
  for (const bundle of manifest.bundles ?? []) {
    for (const change of bundle.changes ?? []) {
      changes.set(changeKey(bundle.bundle_id, change), change);
    }
  }
  return changes;
}

function stagedDirectoryStats(bundleId, changes) {
  const stagedDirectory = `data/staged-records/${bundleId}`;
  const sortedChanges = [...changes].sort((left, right) =>
    left.staged_file_path.localeCompare(right.staged_file_path)
  );
  const directoryHash = createHash("sha256");
  for (const entry of sortedChanges) {
    directoryHash.update(entry.staged_file_path);
    directoryHash.update("\0");
    directoryHash.update(entry.staged_file_sha256 ?? "");
    directoryHash.update("\0");
    directoryHash.update(String(entry.staged_file_bytes ?? ""));
    directoryHash.update("\n");
  }

  return {
    stagedDirectory,
    stagedFiles: sortedChanges.map((entry) => entry.staged_file_path),
    stagedTotalBytes: sortedChanges.reduce((total, entry) => total + (entry.staged_file_bytes ?? 0), 0),
    stagedDirectorySha256: directoryHash.digest("hex")
  };
}

async function buildManifest() {
  const issues = [];
  const existingManifestChanges = await readExistingManifestChanges();
  const candidateBundleEntries = await readJsonCollection("data/candidate-bundles");
  const publicationEventEntries = await readJsonCollection("data/publication-events");
  const stagedDirectories = await listDirectories("data/staged-records");
  const stagedFiles = (await walkFiles("data/staged-records")).filter((filePath) => filePath.endsWith(".json"));

  const bundlesById = new Map(candidateBundleEntries.map(({ record }) => [record.id, record]));
  const publicationEventsByBundle = new Map();
  for (const { record } of publicationEventEntries) {
    const events = publicationEventsByBundle.get(record.candidate_bundle_id) ?? [];
    events.push(record);
    publicationEventsByBundle.set(record.candidate_bundle_id, events);
  }

  const terminalBundles = candidateBundleEntries
    .filter(({ record }) => terminalBundleStatuses.has(record.lifecycle_status))
    .sort((left, right) => left.record.id.localeCompare(right.record.id));
  const activeBundles = candidateBundleEntries.filter(
    ({ record }) => !terminalBundleStatuses.has(record.lifecycle_status)
  );

  let missingStagedFileReferenceCount = 0;
  let legacyUnstagedChangeCount = 0;
  const manifestedStagedPaths = new Set();
  const bundleManifests = [];

  for (const { record: bundle } of terminalBundles) {
    const changes = [];
    const legacyUnstagedChanges = [];

    for (const change of bundle.proposed_changes ?? []) {
      const stagedFilePath = change.staged_file_path ? toPosix(change.staged_file_path) : undefined;
      const targetPath = targetFilePath(change);

      if (!targetPath) {
        issues.push(`${bundle.id}: proposed change ${change.change_id} has no target file path`);
        continue;
      }
      if (!stagedFilePath) {
        const targetInfo = await fileInfo(targetPath);
        legacyUnstagedChangeCount += 1;
        legacyUnstagedChanges.push({
          change_id: change.change_id,
          change_type: change.change_type,
          target_record_type: change.target_record_type,
          target_record_id: change.target_record_id,
          target_file_path: targetPath,
          target_file_exists: targetInfo.exists,
          target_file_sha256: targetInfo.sha256,
          target_file_bytes: targetInfo.bytes
        });
        continue;
      }
      if (manifestedStagedPaths.has(stagedFilePath)) {
        issues.push(`${bundle.id}: duplicate staged file reference ${stagedFilePath}`);
      }

      const targetInfo = await fileInfo(targetPath);
      const stagedInfo = await fileInfo(stagedFilePath);
      let stagedRecord;
      let stagedFileSha256 = stagedInfo.sha256;
      let stagedFileBytes = stagedInfo.bytes;

      if (stagedInfo.exists) {
        stagedRecord = await readJson(stagedFilePath);
      } else {
        const existingChange = existingManifestChanges.get(
          changeKey(bundle.id, { change_id: change.change_id, staged_file_path: stagedFilePath })
        );
        const reconstructsFromLive =
          existingChange &&
          targetInfo.exists &&
          targetInfo.sha256 === existingChange.staged_file_sha256 &&
          targetInfo.bytes === existingChange.staged_file_bytes;

        if (!reconstructsFromLive) {
          missingStagedFileReferenceCount += 1;
          issues.push(`${bundle.id}: proposed change ${change.change_id} missing staged file ${stagedFilePath}`);
          continue;
        }

        stagedRecord = await readJson(targetPath);
        stagedFileSha256 = existingChange.staged_file_sha256;
        stagedFileBytes = existingChange.staged_file_bytes;
      }

      if (stagedRecord.record_type !== change.target_record_type || stagedRecord.id !== change.target_record_id) {
        issues.push(
          `${bundle.id}: ${stagedFilePath} is ${stagedRecord.record_type}:${stagedRecord.id}, expected ${change.target_record_type}:${change.target_record_id}`
        );
      }

      if (bundle.lifecycle_status === "published" && !targetInfo.exists) {
        issues.push(`${bundle.id}: published target file is missing: ${targetPath}`);
      }

      manifestedStagedPaths.add(stagedFilePath);
      changes.push({
        change_id: change.change_id,
        change_type: change.change_type,
        target_record_type: change.target_record_type,
        target_record_id: change.target_record_id,
        target_file_path: targetPath,
        target_file_exists: targetInfo.exists,
        target_file_sha256: targetInfo.sha256,
        target_file_bytes: targetInfo.bytes,
        staged_file_path: stagedFilePath,
        staged_file_sha256: stagedFileSha256,
        staged_file_bytes: stagedFileBytes,
        staged_record_type: stagedRecord.record_type,
        staged_record_id: stagedRecord.id,
        staged_record_name: stagedRecord.name ?? ""
      });
    }

    const { stagedDirectory, stagedFiles: bundleStagedFiles, stagedTotalBytes, stagedDirectorySha256 } =
      stagedDirectoryStats(bundle.id, changes);

    const publicationEventIds = (publicationEventsByBundle.get(bundle.id) ?? [])
      .sort((left, right) => {
        const dateCompare = String(left.published_at ?? "").localeCompare(String(right.published_at ?? ""));
        return dateCompare || left.id.localeCompare(right.id);
      })
      .map((event) => event.id);

    bundleManifests.push({
      bundle_id: bundle.id,
      lifecycle_status: bundle.lifecycle_status,
      revision_number: bundle.revision_number ?? 1,
      submitted_at: bundle.submitted_at,
      staged_directory: stagedDirectory,
      proposed_change_count: (bundle.proposed_changes ?? []).length,
      staged_file_count: bundleStagedFiles.length,
      staged_total_bytes: stagedTotalBytes,
      staged_directory_sha256: stagedDirectorySha256,
      evidence_review_ids: [...(bundle.evidence_review_ids ?? [])].sort((left, right) => left.localeCompare(right)),
      publication_event_ids: publicationEventIds,
      legacy_unstaged_change_count: legacyUnstagedChanges.length,
      legacy_unstaged_changes: legacyUnstagedChanges.sort((left, right) =>
        left.change_id.localeCompare(right.change_id)
      ),
      changes: changes.sort((left, right) => left.staged_file_path.localeCompare(right.staged_file_path))
    });
  }

  const missingBundleDirectoryCount = stagedDirectories.filter((directory) => !bundlesById.has(directory)).length;
  const unreferencedStagedFileCount = stagedFiles.filter((filePath) => !manifestedStagedPaths.has(filePath)).length;
  const logicalStagedDirectoryCount = bundleManifests.filter((bundle) => bundle.staged_file_count > 0).length;
  const logicalStagedFileCount = bundleManifests.reduce((total, bundle) => total + bundle.staged_file_count, 0);
  const logicalStagedBytes = bundleManifests.reduce((total, bundle) => total + bundle.staged_total_bytes, 0);

  if (missingBundleDirectoryCount > 0) {
    issues.push(`${missingBundleDirectoryCount} staged director${missingBundleDirectoryCount === 1 ? "y has" : "ies have"} no matching candidate bundle`);
  }
  if (unreferencedStagedFileCount > 0) {
    issues.push(`${unreferencedStagedFileCount} staged file(s) are not represented in the manifest`);
  }

  const manifest = {
    schema_version: "1.0.0",
    manifest_type: "terminal_staged_records",
    generated_by: "scripts/staged-records-manifest.mjs",
    source_roots: {
      candidate_bundles: "data/candidate-bundles",
      staged_records: "data/staged-records",
      publication_events: "data/publication-events"
    },
    summary: {
      terminal_bundle_count: terminalBundles.length,
      active_bundle_count: activeBundles.length,
      staged_directory_count: logicalStagedDirectoryCount,
      staged_file_count: logicalStagedFileCount,
      manifested_staged_file_count: manifestedStagedPaths.size,
      missing_bundle_directory_count: missingBundleDirectoryCount,
      missing_staged_file_reference_count: missingStagedFileReferenceCount,
      legacy_unstaged_change_count: legacyUnstagedChangeCount,
      unreferenced_staged_file_count: unreferencedStagedFileCount,
      total_staged_bytes: logicalStagedBytes
    },
    bundles: bundleManifests
  };

  return { manifest, issues };
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const { manifest, issues } = await buildManifest();
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

  if (issues.length > 0) {
    process.stderr.write(`Staged-record manifest failed with ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      process.stderr.write(`- ${issue}\n`);
    }
    process.exit(1);
  }

  if (options.check) {
    if (!(await pathExists(manifestPath))) {
      process.stderr.write(`Staged-record manifest is missing: ${manifestPath}\n`);
      process.exit(1);
    }
    const existing = await fs.readFile(workspacePath(manifestPath), "utf8");
    if (existing !== serialized) {
      process.stderr.write(`Staged-record manifest is out of date: ${manifestPath}\n`);
      process.exit(1);
    }
  }

  if (options.write) {
    await fs.mkdir(workspacePath(path.dirname(manifestPath)), { recursive: true });
    await fs.writeFile(workspacePath(manifestPath), serialized);
  }

  process.stdout.write(
    [
      `Staged-record manifest: ${manifest.summary.terminal_bundle_count} terminal bundle(s)`,
      `${manifest.summary.manifested_staged_file_count} staged file(s) manifested`,
      `${manifest.summary.unreferenced_staged_file_count} unreferenced staged file(s)`
    ].join(", ") + ".\n"
  );

  if (options.write) {
    process.stdout.write(`Wrote ${manifestPath}.\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
