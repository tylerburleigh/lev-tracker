#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const workspaceRoot = process.cwd();
const dataRoot = path.join(workspaceRoot, "data");
const candidateBundlesRoot = path.join(dataRoot, "candidate-bundles");
const evidenceReviewsRoot = path.join(dataRoot, "evidence-reviews");
const publicationEventsRoot = path.join(dataRoot, "publication-events");
const stagedRecordsRoot = path.join(dataRoot, "staged-records");

const recordCollections = {
  source: "sources",
  study: "studies",
  finding: "findings",
  outlook: "outlooks",
  activity_item: "activity-items"
};

const candidateStatusTransitions = {
  submitted: ["in_review", "needs_revision", "approved", "rejected"],
  in_review: ["needs_revision", "approved", "rejected"],
  needs_revision: ["revised", "rejected"],
  revised: ["in_review", "approved", "rejected"],
  approved: ["in_review", "rejected", "published"],
  published: [],
  rejected: []
};

function usage(exitCode = 0) {
  const message = `
Usage:
  npm run research:bundle -- status --bundle <bundle-id>
  npm run research:bundle -- validate --bundle <bundle-id>
  npm run research:bundle -- approve --bundle <bundle-id>
  npm run research:bundle -- publish --bundle <bundle-id>
  npm run research:bundle -- smoke --bundle <bundle-id> [--base-url <url>]

Notes:
  - validate checks staged files, record IDs/types, provenance links, support maps, and published-file drift.
  - approve requires a structurally valid bundle and a clean evidence-review gate when one is configured.
  - publish copies staged JSON into data/, writes a publication event, and marks the bundle published.
`.trim();

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function toPosixRelative(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

function isUnderPath(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveDataPath(relativePath, label, issues) {
  if (typeof relativePath !== "string" || relativePath.trim().length === 0) {
    issues.push(`${label} must be a non-empty path under data/.`);
    return undefined;
  }

  const resolvedPath = path.resolve(workspaceRoot, relativePath);
  if (!isUnderPath(dataRoot, resolvedPath)) {
    issues.push(`${label} must stay under data/: ${relativePath}`);
    return undefined;
  }

  return resolvedPath;
}

function getTargetRecordPath(recordType, recordId) {
  const collection = recordCollections[recordType];
  return collection && recordId ? path.join(dataRoot, collection, `${recordId}.json`) : undefined;
}

function getDerivedStagedFilePath(bundleId, change) {
  const fileName = `${change.target_record_id ?? change.change_id}.json`;
  return path.join(stagedRecordsRoot, bundleId, fileName);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withFileLock(lockPath, fn) {
  let handle;

  try {
    handle = await fs.open(lockPath, "wx");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
      throw new Error(`Lock already exists: ${toPosixRelative(lockPath)}. Retry after the current command finishes.`);
    }

    throw error;
  }

  try {
    return await fn();
  } finally {
    await handle.close();
    await fs.rm(lockPath, { force: true });
  }
}

async function loadJsonCollection(collectionName) {
  const collectionRoot = path.join(dataRoot, collectionName);
  if (!(await fileExists(collectionRoot))) {
    return [];
  }

  const fileNames = (await fs.readdir(collectionRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(collectionRoot, fileName);
      return {
        filePath,
        record: await readJson(filePath)
      };
    })
  );
}

async function loadCandidateBundle(bundleId) {
  const filePath = path.join(candidateBundlesRoot, `${bundleId}.json`);
  if (!(await fileExists(filePath))) {
    throw new Error(`Bundle not found: ${toPosixRelative(filePath)}`);
  }

  return {
    filePath,
    record: await readJson(filePath)
  };
}

async function loadEvidenceReviews() {
  return loadJsonCollection("evidence-reviews");
}

function getCurrentRevision(bundle) {
  return bundle.revision_number ?? 1;
}

function canTransitionCandidateBundleStatus(current, next) {
  return current === next || Boolean(candidateStatusTransitions[current]?.includes(next));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function addIssueForMissingString(record, field, issues, label) {
  if (!nonEmptyString(record[field])) {
    issues.push(`${label} is missing required field ${field}.`);
  }
}

function addUniqueRecord(recordMaps, recordType, record, filePath, origin) {
  if (!recordMaps[recordType]) {
    recordMaps[recordType] = new Map();
  }

  if (nonEmptyString(record.id)) {
    recordMaps[recordType].set(record.id, { record, filePath, origin });
  }
}

async function buildRecordMaps(promotionChanges) {
  const recordMaps = {
    source: new Map(),
    study: new Map(),
    finding: new Map(),
    outlook: new Map(),
    activity_item: new Map()
  };

  for (const [recordType, collectionName] of Object.entries(recordCollections)) {
    const entries = await loadJsonCollection(collectionName);
    for (const entry of entries) {
      addUniqueRecord(recordMaps, recordType, entry.record, entry.filePath, "live");
    }
  }

  for (const change of promotionChanges) {
    if (change.validationRecord && recordMaps[change.targetRecordType]) {
      addUniqueRecord(
        recordMaps,
        change.targetRecordType,
        change.validationRecord,
        change.stagedResolvedPath,
        change.stagedRecord ? "staged" : "live"
      );
    }
  }

  return recordMaps;
}

function recordExists(recordMaps, recordType, recordId) {
  return nonEmptyString(recordId) && Boolean(recordMaps[recordType]?.has(recordId));
}

async function evaluateEvidenceReviewGate(bundle) {
  const currentRevision = getCurrentRevision(bundle);
  const requiredLanes = bundle.required_review_lanes ?? [];
  const minReviewsPerLane = bundle.review_requirement?.min_complete_reviews_per_lane ?? 1;
  const blockOnOpenCriticalFindings = bundle.review_requirement?.block_on_open_critical_findings ?? true;
  const blockOnOpenMajorFindings = bundle.review_requirement?.block_on_open_major_findings ?? false;
  const reviews = (await loadEvidenceReviews()).filter(
    ({ record }) =>
      record.candidate_bundle_id === bundle.id &&
      record.bundle_revision_number === currentRevision &&
      record.status === "complete"
  );

  const laneCounts = new Map();
  for (const { record } of reviews) {
    laneCounts.set(record.review_lane, (laneCounts.get(record.review_lane) ?? 0) + 1);
  }

  const completedLanes = Array.from(laneCounts.keys()).sort();
  const missingLanes = requiredLanes.filter((lane) => (laneCounts.get(lane) ?? 0) < minReviewsPerLane);
  const blockingReviewIds = reviews
    .filter(({ record }) => record.blocking || record.verdict === "needs_revision" || record.verdict === "reject")
    .map(({ record }) => record.id)
    .sort();

  const openBlockingFindings = reviews.flatMap(({ record }) =>
    (record.findings ?? [])
      .filter((finding) => {
        if (finding.resolution_status === "closed") {
          return false;
        }

        if (finding.severity === "critical") {
          return blockOnOpenCriticalFindings;
        }

        if (finding.severity === "major") {
          return blockOnOpenMajorFindings;
        }

        return false;
      })
      .map((finding) => ({
        review_id: record.id,
        finding_id: finding.finding_id,
        severity: finding.severity,
        category: finding.category
      }))
  );

  const issues = [];
  if (missingLanes.length > 0) {
    issues.push(`Missing complete evidence review lanes for revision ${currentRevision}: ${missingLanes.join(", ")}.`);
  }

  if (blockingReviewIds.length > 0) {
    issues.push(`Blocking evidence reviews remain open for revision ${currentRevision}.`);
  }

  if (openBlockingFindings.length > 0) {
    issues.push(`Open blocking findings remain for revision ${currentRevision}.`);
  }

  return {
    eligible: requiredLanes.length > 0,
    ready: requiredLanes.length === 0 || issues.length === 0,
    revision_number: currentRevision,
    required_lanes: requiredLanes,
    completed_lanes: completedLanes,
    min_complete_reviews_per_lane: minReviewsPerLane,
    completed_reviews: reviews
      .map(({ record }) => ({
        id: record.id,
        lane: record.review_lane,
        round: record.review_round,
        verdict: record.verdict,
        blocking: record.blocking
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    missing_lanes: missingLanes,
    blocking_review_ids: blockingReviewIds,
    open_blocking_findings: openBlockingFindings,
    issues,
    reviews: reviews.map(({ record }) => record)
  };
}

function validateBundleShape(bundle, issues) {
  for (const field of ["schema_version", "record_type", "id", "name", "intake_mode", "lifecycle_status", "submitted_at"]) {
    addIssueForMissingString(bundle, field, issues, "Candidate bundle");
  }

  if (bundle.schema_version !== "1.0.0") {
    issues.push("Candidate bundle schema_version must be 1.0.0.");
  }

  if (bundle.record_type !== "candidate_bundle") {
    issues.push("Candidate bundle record_type must be candidate_bundle.");
  }

  if (!Array.isArray(bundle.proposed_changes) || bundle.proposed_changes.length === 0) {
    issues.push("Candidate bundle proposed_changes must contain at least one change.");
    return;
  }

  const seenChangeIds = new Set();
  for (const [index, change] of bundle.proposed_changes.entries()) {
    const label = `Change ${index + 1}`;
    for (const field of ["change_id", "change_type", "target_record_type", "summary", "rationale"]) {
      addIssueForMissingString(change, field, issues, label);
    }

    if (seenChangeIds.has(change.change_id)) {
      issues.push(`Duplicate change_id: ${change.change_id}.`);
    }
    seenChangeIds.add(change.change_id);
  }
}

async function evaluatePromotionFiles(bundle) {
  const issues = [];
  const warnings = [];
  const changes = [];

  for (const change of bundle.proposed_changes ?? []) {
    const changeIssues = [];
    const changeWarnings = [];
    const expectedTargetPath = getTargetRecordPath(change.target_record_type, change.target_record_id);
    let targetFilePath = change.file_path;

    if (!targetFilePath && expectedTargetPath) {
      targetFilePath = toPosixRelative(expectedTargetPath);
    }

    if (!recordCollections[change.target_record_type]) {
      changeIssues.push(`Unsupported target record type: ${change.target_record_type}.`);
    }

    if (!nonEmptyString(change.target_record_id)) {
      changeIssues.push("Promotion requires target_record_id.");
    }

    if (!targetFilePath) {
      changeIssues.push("Promotion requires file_path.");
    }

    const targetResolvedPath = targetFilePath
      ? resolveDataPath(targetFilePath, "Target file path", changeIssues)
      : undefined;

    if (expectedTargetPath && targetResolvedPath && targetResolvedPath !== expectedTargetPath) {
      changeIssues.push(`Target file path must be ${toPosixRelative(expectedTargetPath)}.`);
    }

    const targetExists = targetResolvedPath ? await fileExists(targetResolvedPath) : false;
    let liveRecord;
    if (bundle.lifecycle_status !== "published" && targetResolvedPath) {
      if (change.change_type === "create_record" && targetExists) {
        changeIssues.push(`Create change targets an existing live file: ${toPosixRelative(targetResolvedPath)}.`);
      }

      if (change.change_type === "update_record" && !targetExists) {
        changeIssues.push(`Update change targets a missing live file: ${toPosixRelative(targetResolvedPath)}.`);
      }
    }

    const stagedFilePath = change.staged_file_path ?? toPosixRelative(getDerivedStagedFilePath(bundle.id, change));
    const stagedResolvedPath = resolveDataPath(stagedFilePath, "Staged file path", changeIssues);
    let stagedRecord;

    if (stagedResolvedPath) {
      if (!(await fileExists(stagedResolvedPath))) {
        const message = `Missing staged file at ${stagedFilePath}.`;
        if (bundle.lifecycle_status === "published") {
          changeWarnings.push(message);
        } else {
          changeIssues.push(message);
        }
      } else {
        try {
          stagedRecord = await readJson(stagedResolvedPath);
        } catch (error) {
          changeIssues.push(`Could not parse staged file ${stagedFilePath}: ${error.message}`);
        }
      }
    }

    if (stagedRecord) {
      if (stagedRecord.record_type !== change.target_record_type) {
        changeIssues.push(`Staged record_type must be ${change.target_record_type}.`);
      }

      if (change.target_record_id && stagedRecord.id !== change.target_record_id) {
        changeIssues.push(`Staged record id must be ${change.target_record_id}.`);
      }
    }

    if (bundle.lifecycle_status === "published" && !targetExists) {
      changeIssues.push(`Published bundle target file is missing: ${targetFilePath}.`);
    }

    if (bundle.lifecycle_status === "published" && targetExists && targetResolvedPath) {
      liveRecord = await readJson(targetResolvedPath);
      if (stagedRecord && JSON.stringify(liveRecord) !== JSON.stringify(stagedRecord)) {
        changeWarnings.push(`Published live record differs from staged record: ${targetFilePath}.`);
      }
    }

    const publicChange = {
      change_id: change.change_id,
      change_type: change.change_type,
      target_record_type: change.target_record_type,
      target_record_id: change.target_record_id,
      target_file_path: targetFilePath,
      staged_file_path: stagedFilePath,
      ready: changeIssues.length === 0,
      issues: changeIssues,
      warnings: changeWarnings
    };

    changes.push({
      ...publicChange,
      targetRecordType: change.target_record_type,
      targetRecordId: change.target_record_id,
      targetResolvedPath,
      stagedResolvedPath,
      stagedRecord,
      validationRecord: bundle.lifecycle_status === "published" ? liveRecord ?? stagedRecord : stagedRecord
    });
    issues.push(...changeIssues.map((issue) => `${change.change_id}: ${issue}`));
    warnings.push(...changeWarnings.map((warning) => `${change.change_id}: ${warning}`));
  }

  return { ready: issues.length === 0, issues, warnings, changes };
}

function addReferenceMessage(message, issues, warnings, options) {
  if (options.referenceGapsAreWarnings) {
    warnings.push(message);
  } else {
    issues.push(message);
  }
}

function validateStudyRecord(record, recordMaps, issues, warnings, label, options = {}) {
  for (const field of ["name", "study_type", "status"]) {
    addIssueForMissingString(record, field, issues, label);
  }

  if (!Array.isArray(record.source_ids) || record.source_ids.length === 0) {
    issues.push(`${label} must include at least one source_id.`);
  } else {
    for (const sourceId of record.source_ids) {
      if (!recordExists(recordMaps, "source", sourceId)) {
        addReferenceMessage(`${label} references missing source_id: ${sourceId}.`, issues, warnings, options);
      }
    }
  }
}

function validateFindingRecord(record, recordMaps, issues, warnings, label, options = {}) {
  for (const field of [
    "name",
    "source_id",
    "endpoint_category",
    "direction",
    "evidence_tier",
    "confidence",
    "statement"
  ]) {
    addIssueForMissingString(record, field, issues, label);
  }

  if (!Array.isArray(record.hallmark_ids) || record.hallmark_ids.length === 0) {
    issues.push(`${label} must include at least one hallmark_id.`);
  }

  if (record.source_id && !recordExists(recordMaps, "source", record.source_id)) {
    addReferenceMessage(`${label} references missing source_id: ${record.source_id}.`, issues, warnings, options);
  }

  if (record.study_id && !recordExists(recordMaps, "study", record.study_id)) {
    addReferenceMessage(`${label} references missing study_id: ${record.study_id}.`, issues, warnings, options);
  }
}

function validateOutlookSupportIds(record, recordMaps, issues, warnings, label, options = {}) {
  for (const findingId of record.supporting_finding_ids ?? []) {
    if (!recordExists(recordMaps, "finding", findingId)) {
      addReferenceMessage(`${label} references missing supporting_finding_id: ${findingId}.`, issues, warnings, options);
    }
  }

  for (const sourceId of record.supporting_source_ids ?? []) {
    if (!recordExists(recordMaps, "source", sourceId)) {
      addReferenceMessage(`${label} references missing supporting_source_id: ${sourceId}.`, issues, warnings, options);
    }
  }
}

function validateOutlookEvidenceLinks(record, recordMaps, issues, warnings, label, options = {}) {
  if (!Array.isArray(record.supporting_evidence)) {
    return;
  }

  for (const [index, support] of record.supporting_evidence.entries()) {
    const supportLabel = `${label} supporting_evidence[${index}]`;
    for (const field of ["label", "conclusion", "support_role", "rationale"]) {
      addIssueForMissingString(support, field, issues, supportLabel);
    }

    if (!Array.isArray(support.finding_ids) || support.finding_ids.length === 0) {
      issues.push(`${supportLabel} must include at least one finding_id.`);
    } else {
      for (const findingId of support.finding_ids) {
        if (!recordExists(recordMaps, "finding", findingId)) {
          addReferenceMessage(`${supportLabel} references missing finding_id: ${findingId}.`, issues, warnings, options);
        }
      }
    }

    for (const sourceId of support.source_ids ?? []) {
      if (!recordExists(recordMaps, "source", sourceId)) {
        addReferenceMessage(`${supportLabel} references missing source_id: ${sourceId}.`, issues, warnings, options);
      }
    }
  }
}

function addSupportMapMessage(message, issues, warnings, options) {
  if (options.supportMapGapsAreWarnings) {
    warnings.push(message);
  } else {
    issues.push(message);
  }
}

function validateOutlookRecord(record, recordMaps, issues, warnings, label, options = {}) {
  for (const field of ["name", "subject_type", "subject_id", "current_stage", "momentum", "confidence", "forecast_note", "last_updated"]) {
    addIssueForMissingString(record, field, issues, label);
  }

  validateOutlookSupportIds(record, recordMaps, issues, warnings, label, options);
  validateOutlookEvidenceLinks(record, recordMaps, issues, warnings, label, options);

  if (record.subject_type === "track") {
    if (!Array.isArray(record.supporting_evidence) || record.supporting_evidence.length === 0) {
      addSupportMapMessage(`${label} is a track outlook and must include supporting_evidence[].`, issues, warnings, options);
    }

    if (!Array.isArray(record.supporting_finding_ids) || record.supporting_finding_ids.length === 0) {
      addSupportMapMessage(`${label} is a track outlook and must include supporting_finding_ids[].`, issues, warnings, options);
    }

    if (!Array.isArray(record.rating_change_criteria) || record.rating_change_criteria.length === 0) {
      addSupportMapMessage(`${label} is a track outlook and must include rating_change_criteria[].`, issues, warnings, options);
    }
  }
}

function validateStagedRecordSemantics(promotionChanges, recordMaps, bundleStatus) {
  const issues = [];
  const warnings = [];
  const supportMapGapsAreWarnings = bundleStatus === "published";
  const referenceGapsAreWarnings = bundleStatus === "published";
  const semanticOptions = { supportMapGapsAreWarnings, referenceGapsAreWarnings };

  for (const change of promotionChanges) {
    const record = change.validationRecord;
    if (!record) {
      continue;
    }

    const label = `${change.change_id} (${change.targetRecordType}:${change.targetRecordId})`;
    addIssueForMissingString(record, "name", issues, label);

    switch (change.targetRecordType) {
      case "source":
        addIssueForMissingString(record, "source_type", issues, label);
        if (!record.doi && !record.pmid && !record.urls?.length && !record.registry_ids?.length) {
          warnings.push(`${label} has no DOI, PMID, URL, or registry ID.`);
        }
        break;
      case "study":
        validateStudyRecord(record, recordMaps, issues, warnings, label, semanticOptions);
        break;
      case "finding":
        validateFindingRecord(record, recordMaps, issues, warnings, label, semanticOptions);
        break;
      case "outlook":
        validateOutlookRecord(record, recordMaps, issues, warnings, label, semanticOptions);
        break;
      case "activity_item":
        for (const field of ["summary", "activity_type", "activity_lane", "occurred_on"]) {
          addIssueForMissingString(record, field, issues, label);
        }
        break;
      default:
        break;
    }
  }

  return { ready: issues.length === 0, issues, warnings };
}

async function evaluatePublication(bundle, promotion) {
  const issues = [];
  const warnings = [];
  const publicationEventIds = bundle.publication_event_ids ?? [];

  if (bundle.lifecycle_status !== "published") {
    if (publicationEventIds.length > 0) {
      warnings.push("Bundle has publication_event_ids but is not published.");
    }

    return {
      eligible: false,
      ready: true,
      publication_event_ids: publicationEventIds,
      issues,
      warnings
    };
  }

  if (publicationEventIds.length === 0) {
    issues.push("Published bundle must include at least one publication_event_id.");
  }

  const publicationEvents = [];
  for (const eventId of publicationEventIds) {
    const eventPath = path.join(publicationEventsRoot, `${eventId}.json`);
    if (!(await fileExists(eventPath))) {
      issues.push(`Missing publication event: ${toPosixRelative(eventPath)}.`);
      continue;
    }

    const eventRecord = await readJson(eventPath);
    publicationEvents.push(eventRecord);
    if (eventRecord.record_type !== "publication_event") {
      issues.push(`Publication event ${eventId} has record_type ${eventRecord.record_type}.`);
    }

    if (eventRecord.candidate_bundle_id !== bundle.id) {
      issues.push(`Publication event ${eventId} points at ${eventRecord.candidate_bundle_id}, not ${bundle.id}.`);
    }
  }

  return {
    eligible: true,
    ready: issues.length === 0 && promotion.ready,
    publication_event_ids: publicationEventIds,
    publication_events: publicationEvents.map((event) => ({
      id: event.id,
      published_at: event.published_at,
      published_targets: event.published_targets?.length ?? 0,
      affected_outlook_ids: event.affected_outlook_ids ?? []
    })),
    issues,
    warnings
  };
}

async function buildBundleReport(bundleIdOrRecord) {
  const loaded =
    typeof bundleIdOrRecord === "string"
      ? await loadCandidateBundle(bundleIdOrRecord)
      : {
          filePath: path.join(candidateBundlesRoot, `${bundleIdOrRecord.id}.json`),
          record: bundleIdOrRecord
        };

  const bundle = loaded.record;
  const issues = [];
  const warnings = [];

  validateBundleShape(bundle, issues);

  const promotion = await evaluatePromotionFiles(bundle);
  const recordMaps = await buildRecordMaps(promotion.changes);
  const stagedSemantics = validateStagedRecordSemantics(promotion.changes, recordMaps, bundle.lifecycle_status);
  const evidenceReviewGate = await evaluateEvidenceReviewGate(bundle);
  const publication = await evaluatePublication(bundle, promotion);

  issues.push(...promotion.issues, ...stagedSemantics.issues, ...publication.issues);
  warnings.push(...promotion.warnings, ...stagedSemantics.warnings, ...publication.warnings);

  if (["approved", "published"].includes(bundle.lifecycle_status) && evidenceReviewGate.eligible && !evidenceReviewGate.ready) {
    issues.push(...evidenceReviewGate.issues);
  }

  return {
    bundle,
    bundlePath: loaded.filePath,
    validation: {
      ready: issues.length === 0,
      issues,
      warnings
    },
    promotion,
    staged_semantics: stagedSemantics,
    evidence_review_gate: evidenceReviewGate,
    publication
  };
}

function toPublicReport(report) {
  return {
    bundle_id: report.bundle.id,
    lifecycle_status: report.bundle.lifecycle_status,
    revision_number: getCurrentRevision(report.bundle),
    validation: report.validation,
    evidence_review_gate: {
      eligible: report.evidence_review_gate.eligible,
      ready: report.evidence_review_gate.ready,
      revision_number: report.evidence_review_gate.revision_number,
      required_lanes: report.evidence_review_gate.required_lanes,
      completed_lanes: report.evidence_review_gate.completed_lanes,
      min_complete_reviews_per_lane: report.evidence_review_gate.min_complete_reviews_per_lane,
      completed_reviews: report.evidence_review_gate.completed_reviews,
      missing_lanes: report.evidence_review_gate.missing_lanes,
      blocking_review_ids: report.evidence_review_gate.blocking_review_ids,
      open_blocking_findings: report.evidence_review_gate.open_blocking_findings,
      issues: report.evidence_review_gate.issues
    },
    promotion: {
      ready: report.promotion.ready,
      issues: report.promotion.issues,
      warnings: report.promotion.warnings,
      changes: report.promotion.changes.map((change) => ({
        change_id: change.change_id,
        change_type: change.change_type,
        target_record_type: change.target_record_type,
        target_record_id: change.target_record_id,
        target_file_path: change.target_file_path,
        staged_file_path: change.staged_file_path,
        ready: change.ready,
        issues: change.issues,
        warnings: change.warnings
      }))
    },
    publication: report.publication
  };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function commandStatus(options) {
  if (!options.bundle) {
    fail("status requires --bundle <bundle-id>.");
  }

  printJson(toPublicReport(await buildBundleReport(options.bundle)));
}

async function commandValidate(options) {
  if (!options.bundle) {
    fail("validate requires --bundle <bundle-id>.");
  }

  const report = await buildBundleReport(options.bundle);
  printJson(toPublicReport(report));
  if (!report.validation.ready) {
    process.exit(1);
  }
}

async function commandApprove(options) {
  if (!options.bundle) {
    fail("approve requires --bundle <bundle-id>.");
  }

  const { filePath, record: bundle } = await loadCandidateBundle(options.bundle);
  const result = await withFileLock(`${filePath}.lock`, async () => {
    const latestBundle = await readJson(filePath);
    const report = await buildBundleReport(latestBundle);

    if (!canTransitionCandidateBundleStatus(latestBundle.lifecycle_status, "approved")) {
      throw new Error(`Invalid candidate bundle status transition: ${latestBundle.lifecycle_status} -> approved.`);
    }

    if (!report.validation.ready) {
      throw new Error(`Candidate bundle ${latestBundle.id} is not valid: ${report.validation.issues.join(" ")}`);
    }

    if (report.evidence_review_gate.eligible && !report.evidence_review_gate.ready) {
      throw new Error(
        `Candidate bundle ${latestBundle.id} is not ready for approval: ${report.evidence_review_gate.issues.join(" ")}`
      );
    }

    const updatedBundle = {
      ...latestBundle,
      lifecycle_status: "approved"
    };
    await writeJson(filePath, updatedBundle);

    return {
      action: "approved",
      bundle_id: updatedBundle.id,
      previous_lifecycle_status: latestBundle.lifecycle_status,
      lifecycle_status: updatedBundle.lifecycle_status
    };
  });

  printJson({
    ...result,
    bundle_path: toPosixRelative(filePath),
    requested_bundle_id: bundle.id
  });
}

async function getOutlookIdForSubject(subjectType, subjectId) {
  const outlooks = await loadJsonCollection("outlooks");
  return outlooks.find(({ record }) => record.subject_type === subjectType && record.subject_id === subjectId)?.record.id;
}

async function commandPublish(options) {
  if (!options.bundle) {
    fail("publish requires --bundle <bundle-id>.");
  }

  const { filePath } = await loadCandidateBundle(options.bundle);
  const result = await withFileLock(`${filePath}.lock`, async () => {
    const bundle = await readJson(filePath);
    const report = await buildBundleReport(bundle);

    if (bundle.lifecycle_status === "published") {
      throw new Error(`Candidate bundle ${bundle.id} is already published.`);
    }

    if (bundle.lifecycle_status !== "approved") {
      throw new Error(`Candidate bundle ${bundle.id} must be approved before publication.`);
    }

    if (!report.validation.ready) {
      throw new Error(`Candidate bundle ${bundle.id} is not valid: ${report.validation.issues.join(" ")}`);
    }

    if (report.evidence_review_gate.eligible && !report.evidence_review_gate.ready) {
      throw new Error(
        `Candidate bundle ${bundle.id} is blocked by evidence review: ${report.evidence_review_gate.issues.join(" ")}`
      );
    }

    for (const change of report.promotion.changes) {
      if (!change.targetResolvedPath || !change.stagedResolvedPath || !change.stagedRecord) {
        throw new Error(`Change ${change.change_id} is missing file paths required for promotion.`);
      }

      await writeJson(change.targetResolvedPath, change.stagedRecord);
    }

    const timestamp = new Date().toISOString();
    const publicationEventId = `publish-${bundle.id}-${timestamp.toLowerCase().replace(/[^0-9a-z]+/g, "-")}`;
    const affectedOutlookIds = (
      await Promise.all(
        (bundle.proposed_outlook_implications ?? []).map((implication) =>
          getOutlookIdForSubject(implication.subject_type, implication.subject_id)
        )
      )
    ).filter(Boolean);
    const publicationEvent = {
      schema_version: "1.0.0",
      record_type: "publication_event",
      id: publicationEventId,
      name: `Published ${bundle.name}`,
      summary: bundle.summary,
      candidate_bundle_id: bundle.id,
      event_type: "publish",
      published_at: timestamp,
      published_by: "tyler",
      published_targets: bundle.proposed_changes.map((change) => ({
        record_type: change.target_record_type,
        record_id: change.target_record_id ?? change.change_id,
        action: change.change_type === "create_record" ? "created" : "updated"
      })),
      affected_outlook_ids: affectedOutlookIds,
      approving_evidence_review_ids: report.evidence_review_gate.eligible
        ? report.evidence_review_gate.reviews.map((review) => review.id)
        : undefined,
      change_note:
        bundle.proposed_outlook_implications?.[0]?.note ??
        "A reviewed candidate bundle was published to the public site."
    };

    const publicationEventPath = path.join(publicationEventsRoot, `${publicationEventId}.json`);
    await writeJson(publicationEventPath, publicationEvent);

    const updatedBundle = {
      ...bundle,
      lifecycle_status: "published",
      next_actions: ["Publication complete. Review downstream pages if this change affects shared surfaces."],
      publication_event_ids: Array.from(new Set([...(bundle.publication_event_ids ?? []), publicationEventId]))
    };
    await writeJson(filePath, updatedBundle);

    return {
      action: "published",
      bundle_id: bundle.id,
      publication_event_id: publicationEventId,
      publication_event_path: toPosixRelative(publicationEventPath),
      published_targets: publicationEvent.published_targets,
      affected_outlook_ids: affectedOutlookIds
    };
  });

  printJson(result);
}

async function readTaxonomyLabelMaps() {
  const hallmarksPath = path.join(workspaceRoot, "taxonomies", "hallmarks-of-aging.v1.json");
  const tracksPath = path.join(workspaceRoot, "taxonomies", "track-taxonomy.v1.json");
  const hallmarkLabels = new Map();
  const trackLabels = new Map();

  if (await fileExists(hallmarksPath)) {
    const hallmarks = await readJson(hallmarksPath);
    for (const hallmark of hallmarks.hallmarks ?? []) {
      hallmarkLabels.set(hallmark.id, hallmark.name);
    }
  }

  if (await fileExists(tracksPath)) {
    const taxonomy = await readJson(tracksPath);
    for (const group of taxonomy.hallmark_groups ?? []) {
      for (const track of group.tracks ?? []) {
        trackLabels.set(track.id, track.name);
      }
    }
  }

  return { hallmarkLabels, trackLabels };
}

async function checkRoute(baseUrl, routePath, expectedText) {
  const url = new URL(routePath, baseUrl).toString();
  const response = await fetch(url);
  const body = await response.text();
  const issues = [];

  if (!response.ok) {
    issues.push(`HTTP ${response.status} for ${url}.`);
  }

  if (expectedText && !body.includes(expectedText)) {
    issues.push(`Response for ${url} did not include expected text: ${expectedText}.`);
  }

  return {
    url,
    status: response.status,
    ok: issues.length === 0,
    expected_text: expectedText,
    issues
  };
}

async function commandSmoke(options) {
  if (!options.bundle) {
    fail("smoke requires --bundle <bundle-id>.");
  }

  const report = await buildBundleReport(options.bundle);
  const routeChecks = [];
  const issues = [];

  if (report.bundle.lifecycle_status !== "published") {
    issues.push("Smoke checks require a published bundle.");
  }

  if (!report.validation.ready) {
    issues.push(...report.validation.issues);
  }

  if (options["base-url"]) {
    const { hallmarkLabels, trackLabels } = await readTaxonomyLabelMaps();
    const scope = report.bundle.scope ?? {};

    for (const trackId of scope.track_ids ?? []) {
      const expectedText = trackLabels.get(trackId) ?? trackId;
      routeChecks.push(await checkRoute(options["base-url"], `/tracks/${trackId}`, expectedText));
    }

    for (const hallmarkId of scope.hallmark_ids ?? []) {
      const expectedText = hallmarkLabels.get(hallmarkId) ?? hallmarkId;
      routeChecks.push(await checkRoute(options["base-url"], `/hallmarks/${hallmarkId}`, expectedText));
    }
  }

  for (const routeCheck of routeChecks) {
    issues.push(...routeCheck.issues);
  }

  printJson({
    bundle_id: report.bundle.id,
    lifecycle_status: report.bundle.lifecycle_status,
    file_checks_ready: report.validation.ready,
    route_checks: routeChecks,
    ready: issues.length === 0,
    issues
  });

  if (issues.length > 0) {
    process.exit(1);
  }
}

async function main() {
  const [, , commandName, ...rest] = process.argv;
  if (!commandName || commandName === "--help" || commandName === "-h") {
    usage(0);
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      bundle: { type: "string" },
      "base-url": { type: "string" }
    },
    allowPositionals: false
  });

  switch (commandName) {
    case "status":
      await commandStatus(values);
      break;
    case "validate":
      await commandValidate(values);
      break;
    case "approve":
      await commandApprove(values);
      break;
    case "publish":
      await commandPublish(values);
      break;
    case "smoke":
      await commandSmoke(values);
      break;
    default:
      usage(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
