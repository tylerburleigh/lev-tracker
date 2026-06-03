import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const terminalBundleStatuses = new Set(["published", "rejected"]);

const recordDirectories = {
  activity_item: "data/activity-items",
  candidate_bundle: "data/candidate-bundles",
  finding: "data/findings",
  intervention: "data/interventions",
  outlook: "data/outlooks",
  source: "data/sources",
  study: "data/studies",
};

const checkedRecordTypes = new Set([
  "activity_item",
  "finding",
  "outlook",
  "source",
  "study",
]);

const issues = [];
const warnings = [];
const missingOptionalRefs = new Map();
const maxOptionalRefDetails = Number.parseInt(process.env.AUDIT_DATA_MAX_OPTIONAL_DETAILS ?? "100", 10);
let refsChecked = 0;
let sourceExternalIdsChecked = 0;

async function pathExists(relativePath) {
  return existsSync(path.join(workspaceRoot, relativePath));
}

function normalizePath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

async function walkJsonFiles(relativeDir) {
  const absoluteDir = path.join(workspaceRoot, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryRelativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        return walkJsonFiles(entryRelativePath);
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        return [normalizePath(entryRelativePath)];
      }
      return [];
    }),
  );

  return files.flat().sort();
}

async function readJson(relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  try {
    const raw = await readFile(absolutePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    issues.push(`${relativePath}: could not parse JSON (${error.message})`);
    return null;
  }
}

async function readRecords(recordType) {
  const relativeDir = recordDirectories[recordType];
  const files = await walkJsonFiles(relativeDir);
  const records = [];

  for (const filePath of files) {
    const record = await readJson(filePath);
    if (!record) {
      continue;
    }
    records.push({ record, filePath });
  }

  return records;
}

function buildIdSet(records) {
  return new Set(records.map(({ record }) => record.id).filter(Boolean));
}

function addRefIssue(filePath, fieldPath, value, expectedType) {
  issues.push(`${filePath}: ${fieldPath} references missing ${expectedType} "${value}"`);
}

function checkRef(filePath, fieldPath, value, allowedSet, expectedType) {
  if (!value) {
    return;
  }
  refsChecked += 1;
  if (!allowedSet.has(value)) {
    addRefIssue(filePath, fieldPath, value, expectedType);
  }
}

function checkRefArray(filePath, fieldPath, values, allowedSet, expectedType) {
  for (const value of values ?? []) {
    checkRef(filePath, fieldPath, value, allowedSet, expectedType);
  }
}

function checkOptionalRef(filePath, fieldPath, value, allowedSet, expectedType) {
  if (!value) {
    return;
  }
  refsChecked += 1;
  if (allowedSet.has(value)) {
    return;
  }

  const refsById = missingOptionalRefs.get(expectedType) ?? new Map();
  const existing = refsById.get(value) ?? { refs: 0, files: new Set() };
  existing.refs += 1;
  existing.files.add(`${filePath}:${fieldPath}`);
  refsById.set(value, existing);
  missingOptionalRefs.set(expectedType, refsById);
}

function countOptionalRefs(refsById) {
  return [...refsById.values()].reduce((total, summary) => total + summary.refs, 0);
}

function formatOptionalRefDetails(refsById) {
  const details = [...refsById.entries()]
    .map(([id, summary]) => ({ id, refs: summary.refs }))
    .sort((a, b) => b.refs - a.refs || a.id.localeCompare(b.id));

  const visibleDetails = Number.isFinite(maxOptionalRefDetails)
    ? details.slice(0, Math.max(maxOptionalRefDetails, 0))
    : details;

  const lines = visibleDetails.map((detail) => `  - ${detail.id}: ${detail.refs} reference(s)`);
  const remaining = details.length - visibleDetails.length;
  if (remaining > 0) {
    lines.push(`  - ... ${remaining} more ID(s); set AUDIT_DATA_MAX_OPTIONAL_DETAILS higher to show more`);
  }

  return lines;
}

function checkOptionalRefArray(filePath, fieldPath, values, allowedSet, expectedType) {
  for (const value of values ?? []) {
    checkOptionalRef(filePath, fieldPath, value, allowedSet, expectedType);
  }
}

function flushOptionalReferenceWarnings() {
  for (const [expectedType, refsById] of missingOptionalRefs.entries()) {
    warnings.push(
      [
        `${countOptionalRefs(refsById)} reference(s) point to ${refsById.size} non-normalized ${expectedType} ID(s); this is non-blocking until normalization is complete`,
        `  Unnormalized ${expectedType} IDs by reference count:`,
        ...formatOptionalRefDetails(refsById),
      ].join("\n"),
    );
  }
}

function addSourceExternalKey(sourceKeys, key, sourceRecord, filePath) {
  sourceExternalIdsChecked += 1;
  const existing = sourceKeys.get(key) ?? [];
  existing.push({
    id: sourceRecord.id,
    sourceType: sourceRecord.source_type,
    filePath,
  });
  sourceKeys.set(key, existing);
}

function auditSourceExternalIds(sourceRecords, scopeLabel) {
  const sourceKeys = new Map();
  const trialRegistryKeys = new Map();

  for (const { record, filePath } of sourceRecords) {
    if (record.pmid) {
      addSourceExternalKey(sourceKeys, `pmid:${record.pmid}`, record, filePath);
    }
    if (record.doi) {
      addSourceExternalKey(sourceKeys, `doi:${record.doi.trim().toLowerCase()}`, record, filePath);
    }
    for (const registryId of record.registry_ids ?? []) {
      const normalizedRegistryId = registryId.trim().toUpperCase();
      if (!normalizedRegistryId) {
        continue;
      }
      sourceExternalIdsChecked += 1;
      if (record.source_type === "trial_registry") {
        const key = `registry:${normalizedRegistryId}`;
        const existing = trialRegistryKeys.get(key) ?? [];
        existing.push({ id: record.id, sourceType: record.source_type, filePath });
        trialRegistryKeys.set(key, existing);
      }
    }
  }

  for (const [key, matches] of sourceKeys.entries()) {
    const distinctIds = new Set(matches.map((match) => match.id));
    if (distinctIds.size > 1) {
      issues.push(
        `${scopeLabel}: duplicate source external ID ${key} on ${matches
          .map((match) => `${match.id} (${match.filePath})`)
          .join(", ")}`,
      );
    }
  }

  for (const [key, matches] of trialRegistryKeys.entries()) {
    const distinctIds = new Set(matches.map((match) => match.id));
    if (distinctIds.size > 1) {
      issues.push(
        `${scopeLabel}: duplicate canonical trial registry ID ${key} on ${matches
          .map((match) => `${match.id} (${match.filePath})`)
          .join(", ")}`,
      );
    }
  }
}

function auditFinding(record, filePath, sets) {
  checkRef(filePath, "source_id", record.source_id, sets.sourceIds, "source");
  checkRef(filePath, "study_id", record.study_id, sets.studyIds, "study");
  checkOptionalRefArray(
    filePath,
    "intervention_ids[]",
    record.intervention_ids,
    sets.interventionIds,
    "intervention",
  );
  checkRefArray(filePath, "track_ids[]", record.track_ids, sets.trackIds, "track");
  checkRefArray(filePath, "hallmark_ids[]", record.hallmark_ids, sets.hallmarkIds, "hallmark");
  checkRefArray(
    filePath,
    "linked_activity_item_ids[]",
    record.linked_activity_item_ids,
    sets.activityItemIds,
    "activity_item",
  );
}

function auditStudy(record, filePath, sets) {
  checkRefArray(filePath, "source_ids[]", record.source_ids, sets.sourceIds, "source");
  checkOptionalRefArray(
    filePath,
    "intervention_ids[]",
    record.intervention_ids,
    sets.interventionIds,
    "intervention",
  );
  checkRefArray(filePath, "track_ids[]", record.track_ids, sets.trackIds, "track");
  checkRefArray(filePath, "hallmark_ids[]", record.hallmark_ids, sets.hallmarkIds, "hallmark");
}

function auditActivityItem(record, filePath, sets) {
  checkRefArray(filePath, "source_ids[]", record.source_ids, sets.sourceIds, "source");
  checkRefArray(filePath, "track_ids[]", record.track_ids, sets.trackIds, "track");
  checkRefArray(filePath, "hallmark_ids[]", record.hallmark_ids, sets.hallmarkIds, "hallmark");
  checkOptionalRefArray(
    filePath,
    "intervention_ids[]",
    record.intervention_ids,
    sets.interventionIds,
    "intervention",
  );
  checkRefArray(filePath, "study_ids[]", record.study_ids, sets.studyIds, "study");
  checkRefArray(filePath, "finding_ids[]", record.finding_ids, sets.findingIds, "finding");
}

function auditOutlook(record, filePath, sets) {
  if (record.subject_type === "track") {
    checkRef(filePath, "subject_id", record.subject_id, sets.trackIds, "track");
  } else if (record.subject_type === "hallmark") {
    checkRef(filePath, "subject_id", record.subject_id, sets.hallmarkIds, "hallmark");
  } else if (record.subject_type === "intervention") {
    checkRef(filePath, "subject_id", record.subject_id, sets.interventionIds, "intervention");
  }

  checkRefArray(filePath, "supporting_finding_ids[]", record.supporting_finding_ids, sets.findingIds, "finding");
  checkRefArray(
    filePath,
    "supporting_activity_item_ids[]",
    record.supporting_activity_item_ids,
    sets.activityItemIds,
    "activity_item",
  );
  checkRefArray(filePath, "supporting_source_ids[]", record.supporting_source_ids, sets.sourceIds, "source");

  for (const [index, evidence] of (record.supporting_evidence ?? []).entries()) {
    checkRefArray(
      filePath,
      `supporting_evidence[${index}].finding_ids[]`,
      evidence.finding_ids,
      sets.findingIds,
      "finding",
    );
    checkRefArray(
      filePath,
      `supporting_evidence[${index}].source_ids[]`,
      evidence.source_ids,
      sets.sourceIds,
      "source",
    );
  }
}

function auditRecordReferences(recordsByType, sets) {
  for (const { record, filePath } of recordsByType.finding ?? []) {
    auditFinding(record, filePath, sets);
  }
  for (const { record, filePath } of recordsByType.study ?? []) {
    auditStudy(record, filePath, sets);
  }
  for (const { record, filePath } of recordsByType.activity_item ?? []) {
    auditActivityItem(record, filePath, sets);
  }
  for (const { record, filePath } of recordsByType.outlook ?? []) {
    auditOutlook(record, filePath, sets);
  }
}

function buildReferenceSets(recordsByType, taxonomies) {
  return {
    activityItemIds: buildIdSet(recordsByType.activity_item ?? []),
    findingIds: buildIdSet(recordsByType.finding ?? []),
    hallmarkIds: taxonomies.hallmarkIds,
    interventionIds: buildIdSet(recordsByType.intervention ?? []),
    sourceIds: buildIdSet(recordsByType.source ?? []),
    studyIds: buildIdSet(recordsByType.study ?? []),
    trackIds: taxonomies.trackIds,
  };
}

async function readTaxonomies() {
  const trackTaxonomy = await readJson("taxonomies/track-taxonomy.v1.json");
  const hallmarkTaxonomy = await readJson("taxonomies/hallmarks-of-aging.v1.json");

  const trackIds = new Set();
  for (const group of trackTaxonomy?.hallmark_groups ?? []) {
    for (const track of group.tracks ?? []) {
      if (track.id) {
        trackIds.add(track.id);
      }
    }
  }

  const hallmarkIds = new Set();
  for (const hallmark of hallmarkTaxonomy?.hallmarks ?? []) {
    if (hallmark.id) {
      hallmarkIds.add(hallmark.id);
    }
  }

  return { hallmarkIds, trackIds };
}

function cloneRecordsByType(recordsByType) {
  return Object.fromEntries(
    Object.entries(recordsByType).map(([recordType, records]) => [
      recordType,
      records.map((entry) => ({ ...entry })),
    ]),
  );
}

function appendRecord(recordsByType, entry) {
  const recordType = entry.record.record_type;
  const records = recordsByType[recordType] ?? [];
  const existingIndex = records.findIndex(({ record }) => record.id === entry.record.id);
  if (existingIndex >= 0) {
    records[existingIndex] = entry;
  } else {
    records.push(entry);
  }
  recordsByType[recordType] = records;
}

async function listStagedDirectories() {
  const stagedRoot = path.join(workspaceRoot, "data/staged-records");
  if (!existsSync(stagedRoot)) {
    return [];
  }

  const entries = await readdir(stagedRoot);
  const directories = [];
  for (const entry of entries) {
    const absolutePath = path.join(stagedRoot, entry);
    const stats = await stat(absolutePath);
    if (stats.isDirectory()) {
      directories.push(entry);
    }
  }
  return directories.sort();
}

async function auditActiveBundles(candidateBundles, liveRecordsByType) {
  const activeBundles = candidateBundles.filter(
    ({ record }) => !terminalBundleStatuses.has(record.lifecycle_status),
  );
  const activeBundleIds = new Set(activeBundles.map(({ record }) => record.id));
  const activeRecordsByType = cloneRecordsByType(liveRecordsByType);
  const activeStagedRecords = [];

  for (const { record: bundle, filePath: bundlePath } of activeBundles) {
    for (const [index, change] of (bundle.proposed_changes ?? []).entries()) {
      const changePath = `${bundlePath}: proposed_changes[${index}]`;

      if (!change.staged_file_path) {
        issues.push(`${changePath} has no staged_file_path`);
        continue;
      }

      const stagedPath = normalizePath(change.staged_file_path);
      if (!stagedPath.startsWith(`data/staged-records/${bundle.id}/`)) {
        issues.push(`${changePath} staged_file_path is outside data/staged-records/${bundle.id}/`);
      }

      if (!(await pathExists(stagedPath))) {
        issues.push(`${changePath} staged_file_path does not exist: ${stagedPath}`);
        continue;
      }

      const stagedRecord = await readJson(stagedPath);
      if (!stagedRecord) {
        continue;
      }

      if (stagedRecord.record_type !== change.target_record_type) {
        issues.push(
          `${stagedPath}: record_type "${stagedRecord.record_type}" does not match target_record_type "${change.target_record_type}"`,
        );
      }
      if (change.target_record_id && stagedRecord.id !== change.target_record_id) {
        issues.push(
          `${stagedPath}: id "${stagedRecord.id}" does not match target_record_id "${change.target_record_id}"`,
        );
      }

      if (checkedRecordTypes.has(stagedRecord.record_type) || stagedRecord.record_type === "intervention") {
        const entry = { record: stagedRecord, filePath: stagedPath };
        activeStagedRecords.push(entry);
        appendRecord(activeRecordsByType, entry);
      }
    }
  }

  return { activeBundleIds, activeBundles, activeRecordsByType, activeStagedRecords };
}

function countRecords(recordsByType) {
  return Object.values(recordsByType).reduce((total, records) => total + records.length, 0);
}

async function main() {
  const taxonomies = await readTaxonomies();
  const liveRecordsByType = {};

  for (const recordType of Object.keys(recordDirectories)) {
    liveRecordsByType[recordType] = await readRecords(recordType);
  }

  const candidateBundles = liveRecordsByType.candidate_bundle ?? [];
  const { activeBundleIds, activeBundles, activeRecordsByType, activeStagedRecords } =
    await auditActiveBundles(candidateBundles, liveRecordsByType);

  const liveSets = buildReferenceSets(liveRecordsByType, taxonomies);
  const activeSets = buildReferenceSets(activeRecordsByType, taxonomies);

  auditSourceExternalIds(liveRecordsByType.source ?? [], "live records");
  if (activeStagedRecords.some(({ record }) => record.record_type === "source")) {
    auditSourceExternalIds(activeRecordsByType.source ?? [], "live plus active staged records");
  }

  auditRecordReferences(liveRecordsByType, liveSets);

  const activeRecordsToAudit = {};
  for (const entry of activeStagedRecords) {
    const recordType = entry.record.record_type;
    if (!checkedRecordTypes.has(recordType)) {
      continue;
    }
    activeRecordsToAudit[recordType] = [...(activeRecordsToAudit[recordType] ?? []), entry];
  }
  auditRecordReferences(activeRecordsToAudit, activeSets);

  const stagedDirectories = await listStagedDirectories();
  const activeStagedDirectories = stagedDirectories.filter((bundleId) => activeBundleIds.has(bundleId));
  const historicalStagedDirectories = stagedDirectories.filter((bundleId) => !activeBundleIds.has(bundleId));

  for (const stagedDirectory of activeStagedDirectories) {
    const expectedBundle = path.join("data/candidate-bundles", `${stagedDirectory}.json`);
    if (!(await pathExists(expectedBundle))) {
      warnings.push(`data/staged-records/${stagedDirectory}: no matching candidate bundle record found`);
    }
  }

  flushOptionalReferenceWarnings();

  if (issues.length > 0) {
    console.error(`Data integrity audit failed with ${issues.length} issue(s):`);
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    if (warnings.length > 0) {
      console.error(`Warnings (${warnings.length}):`);
      for (const warning of warnings) {
        console.error(`- ${warning}`);
      }
    }
    process.exit(1);
  }

  console.log(
    [
      `Data integrity audit passed: ${countRecords(liveRecordsByType)} live records`,
      `${activeBundles.length} active bundle(s)`,
      `${activeStagedDirectories.length} active staged director${activeStagedDirectories.length === 1 ? "y" : "ies"}`,
      `${historicalStagedDirectories.length} historical staged director${historicalStagedDirectories.length === 1 ? "y" : "ies"}`,
      `${refsChecked} cross-record reference(s) checked`,
      `${sourceExternalIdsChecked} source external identifier(s) checked`,
    ].join(", ") + ".",
  );

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
