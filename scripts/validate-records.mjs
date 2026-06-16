#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const workspaceRoot = process.cwd();
const schemaRoot = path.join(workspaceRoot, "schemas");
const validationRoots = ["data", "examples", "taxonomies", "research", "ops"];

const schemaByRecordType = {
  activity_item: "./activity-item.schema.json",
  candidate_bundle: "./candidate-bundle.schema.json",
  coverage_assessment: "./coverage-assessment.schema.json",
  evidence_review: "./evidence-review.schema.json",
  finding: "./finding.schema.json",
  intervention: "./intervention.schema.json",
  milestone: "./milestone.schema.json",
  outlook: "./outlook.schema.json",
  publication_event: "./publication-event.schema.json",
  research_session: "./research-session.schema.json",
  review_comment: "./review-comment.schema.json",
  source: "./source.schema.json",
  study: "./study.schema.json",
  track: "./track.schema.json"
};

const schemaByExactPath = {
  "data/content/hallmark-insights.json": "./hallmark-insights.schema.json",
  "data/staged-record-archives/changed-terminal-bodies.v1.json": "./staged-records-archive.schema.json",
  "data/staged-record-manifests/terminal-bundles.v1.json": "./staged-records-manifest.schema.json",
  "ops/state-of-field-workflow.v1.json": "./state-of-field-workflow.schema.json",
  "research/backlog/field-activity-watchlist.v1.json": "./field-activity-watchlist.schema.json",
  "research/backlog/track-priority.v1.json": "./research-priority-queue.schema.json",
  "research/state/coverage-status.v1.json": "./research-coverage-status.schema.json",
  "ops/triage-state.v1.json": "./work-triage.schema.json",
  "taxonomies/hallmarks-of-aging.v1.json": "./hallmarks-taxonomy.schema.json",
  "taxonomies/track-taxonomy.v1.json": "./track-taxonomy.schema.json"
};

const schemaByPathPrefix = [
  {
    prefix: "data/content/current-lev-story/",
    schemaId: "./current-lev-story.schema.json"
  },
  {
    prefix: "data/content/state-of-the-field/",
    schemaId: "./state-of-the-field-edition.schema.json"
  }
];

function toPosixRelative(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkJsonFiles(rootPath) {
  if (!(await fileExists(rootPath))) {
    return [];
  }

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => toPosixRelative(left).localeCompare(toPosixRelative(right)));
}

async function loadSchemas() {
  const schemaFiles = await walkJsonFiles(schemaRoot);
  return Promise.all(
    schemaFiles.map(async (filePath) => ({
      filePath,
      schema: JSON.parse(await fs.readFile(filePath, "utf8"))
    }))
  );
}

function getPathSchemaId(relativePath) {
  if (schemaByExactPath[relativePath]) {
    return schemaByExactPath[relativePath];
  }

  return schemaByPathPrefix.find((rule) => relativePath.startsWith(rule.prefix))?.schemaId;
}

function getSchemaId(relativePath, value) {
  return getPathSchemaId(relativePath) ?? schemaByRecordType[value?.record_type];
}

function formatError(error) {
  const location = error.instancePath || "/";
  const property = error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : "";
  return `${location} ${error.message}${property}`;
}

const publicActivityMetaPattern =
  /\b(tracker|activity lane|watch lane|public watchlist|watchlist expanded|added to watchlist|tracked separately|contextual movement|contextual activity|field signal|evidence-weighted)\b/i;
const publicActivityAllowedNoteworthinessTiers = new Set([
  "field_anchor",
  "material_program",
  "watch_only",
  "below_threshold"
]);
const publicActivityPublishingTiers = new Set(["field_anchor", "material_program"]);
const publicTrialActivityTypes = new Set([
  "trial_launch",
  "trial_status_update",
  "trial_completion",
  "results_posted"
]);
const publicTrialActivityPublishingKinds = new Set([
  "new_direct_human_trial",
  "first_in_human_or_older_adult",
  "material_status_change",
  "completion_or_termination",
  "results_posted_or_published",
  "major_phase_or_program_transition",
  "trial_watch_anchor"
]);
const directActivityPublicationRoute = "direct_activity_publish";
const directActivityPublicationTargetTypes = new Set(["activity_item", "source"]);
const requiredStateOfFieldReviewBasisKeys = new Set([
  "public_updates",
  "outlooks",
  "trial_horizon",
  "current_context"
]);
const stateOfFieldTrialBoundaryPattern =
  /\b(no posted results?|posted results?|no results?|not expected|waiting|registry|completion|completed|recruiting|active|planned|terminated|ended|trial status)\b/i;

function getActivityText(value) {
  return [value.name, value.summary, value.significance_note].filter((item) => typeof item === "string").join(" ");
}

function validatePublicActivityItem(relativePath, value, issues) {
  if (!relativePath.startsWith("data/activity-items/") || value?.record_type !== "activity_item") {
    return;
  }

  const hasConcreteAnchor = [
    value.source_ids,
    value.external_urls,
    value.study_ids,
    value.finding_ids
  ].some((items) => Array.isArray(items) && items.length > 0);

  if (!hasConcreteAnchor) {
    issues.push(
      `${relativePath}: public activity items must link to a concrete source, study, finding, or external URL. Tracker/editorial-only updates do not belong on /activity.`
    );
  }

  if (publicActivityMetaPattern.test(getActivityText(value))) {
    issues.push(
      `${relativePath}: public activity copy appears to describe tracker/editorial process rather than an external field event. Use /activity only for field events with actual event dates.`
    );
  }

  if (!value.noteworthiness_tier) {
    issues.push(`${relativePath}: live public activity items must include noteworthiness_tier.`);
  } else if (!publicActivityAllowedNoteworthinessTiers.has(value.noteworthiness_tier)) {
    issues.push(`${relativePath}: noteworthiness_tier is not recognized: ${value.noteworthiness_tier}.`);
  } else if (!publicActivityPublishingTiers.has(value.noteworthiness_tier)) {
    issues.push(
      `${relativePath}: live public activity items must clear the field_anchor or material_program threshold; ${value.noteworthiness_tier} belongs in the watchlist or a research session.`
    );
  }

  if (!Array.isArray(value.threshold_basis) || value.threshold_basis.length === 0) {
    issues.push(`${relativePath}: live public activity items must include threshold_basis.`);
  }

  if (publicTrialActivityTypes.has(value.activity_type)) {
    if (!value.trial_activity_kind) {
      issues.push(`${relativePath}: live trial activity items must include trial_activity_kind.`);
    } else if (!publicTrialActivityPublishingKinds.has(value.trial_activity_kind)) {
      issues.push(
        `${relativePath}: trial_activity_kind ${value.trial_activity_kind} does not clear the public /activity threshold; put routine registry maintenance in trial details or research sessions.`
      );
    }
  } else if (value.trial_activity_kind) {
    issues.push(`${relativePath}: trial_activity_kind should only be set on trial activity records.`);
  }
}

function validatePublicationEventRecord(relativePath, value, issues) {
  if (!relativePath.startsWith("data/publication-events/") || value?.record_type !== "publication_event") {
    return;
  }

  if (!value.candidate_bundle_id && value.publication_route !== directActivityPublicationRoute) {
    issues.push(
      `${relativePath}: publication events without candidate_bundle_id must declare publication_route "${directActivityPublicationRoute}".`
    );
  }

  if (value.publication_route === directActivityPublicationRoute) {
    const targets = value.published_targets ?? [];
    const activityTargets = targets.filter((target) => target.record_type === "activity_item");

    if (activityTargets.length === 0) {
      issues.push(`${relativePath}: direct activity publication events must target at least one activity_item.`);
    }

    for (const [index, target] of targets.entries()) {
      if (!directActivityPublicationTargetTypes.has(target.record_type)) {
        issues.push(
          `${relativePath}: direct activity publication target ${index} uses ${target.record_type}; only activity_item and source targets belong on this route.`
        );
      }
    }
  }
}

function validatePublicActivityPublicationEvents(publicActivityItems, publicationEvents, issues) {
  const publicationEventIdsByActivityId = new Map();

  for (const { value: event } of publicationEvents) {
    for (const target of event.published_targets ?? []) {
      if (target.record_type !== "activity_item") {
        continue;
      }

      const eventIds = publicationEventIdsByActivityId.get(target.record_id) ?? [];
      eventIds.push(event.id);
      publicationEventIdsByActivityId.set(target.record_id, eventIds);
    }
  }

  for (const { relativePath, value: activityItem } of publicActivityItems) {
    if (!publicationEventIdsByActivityId.has(activityItem.id)) {
      issues.push(
        `${relativePath}: live public activity items must be targeted by a publication_event so State of the Field and current-story reconciliation can detect the publish.`
      );
    }
  }
}

function validateStateOfFieldEdition(relativePath, value, issues) {
  if (!relativePath.startsWith("data/content/state-of-the-field/")) {
    return;
  }

  if (value.field_change_status === "no_material_change" && (value.what_changed?.length ?? 0) > 0) {
    issues.push(`${relativePath}: no_material_change editions must leave what_changed empty.`);
  }

  if (value.field_change_status === "material_change" && (value.what_changed?.length ?? 0) === 0) {
    issues.push(`${relativePath}: material_change editions must include at least one what_changed item.`);
  }

  for (const [index, change] of (value.what_changed ?? []).entries()) {
    if (change.happened_on < value.period_start || change.happened_on > value.period_end) {
      issues.push(
        `${relativePath}: what_changed[${index}].happened_on ${change.happened_on} falls outside ${value.period_start} to ${value.period_end}.`
      );
    }
  }

  for (const [index, item] of (value.field_activity ?? []).entries()) {
    if (item.happened_on < value.period_start || item.happened_on > value.period_end) {
      issues.push(
        `${relativePath}: field_activity[${index}].happened_on ${item.happened_on} falls outside ${value.period_start} to ${value.period_end}.`
      );
    }
  }

  for (const [index, item] of (value.trial_horizon ?? []).entries()) {
    if (!stateOfFieldTrialBoundaryPattern.test(`${item.label} ${item.summary}`)) {
      issues.push(
        `${relativePath}: trial_horizon[${index}] must state a result, no-result, registry, completion, or current-status boundary.`
      );
    }
  }

  const reviewBasisItems = Array.isArray(value.review_basis?.items) ? value.review_basis.items : [];
  const reviewBasisItemsByKey = new Map();

  for (const item of reviewBasisItems) {
    if (!item || typeof item.key !== "string") {
      continue;
    }

    if (reviewBasisItemsByKey.has(item.key)) {
      issues.push(`${relativePath}: review_basis.items contains duplicate key "${item.key}".`);
    }

    reviewBasisItemsByKey.set(item.key, item);
  }

  for (const key of requiredStateOfFieldReviewBasisKeys) {
    if (!reviewBasisItemsByKey.has(key)) {
      issues.push(`${relativePath}: review_basis.items must include key "${key}".`);
    }
  }

  const expectedCounts = new Map([
    ["public_updates", value.related_publication_event_ids?.length ?? 0],
    ["outlooks", value.related_outlook_ids?.length ?? 0],
    ["trial_horizon", value.trial_horizon?.length ?? 0],
    ["current_context", value.current_context?.length ?? 0],
    ["field_activity", value.field_activity?.length ?? 0]
  ]);

  for (const [key, expectedCount] of expectedCounts.entries()) {
    const item = reviewBasisItemsByKey.get(key);
    if (item && item.count !== expectedCount) {
      issues.push(
        `${relativePath}: review_basis item "${key}" count is ${item.count}, expected ${expectedCount}.`
      );
    }
  }

  if ((value.field_activity?.length ?? 0) > 0 && !reviewBasisItemsByKey.has("field_activity")) {
    issues.push(`${relativePath}: review_basis.items must include key "field_activity" when field_activity cards are present.`);
  }
}

async function main() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: true
  });
  addFormats(ajv);

  const schemas = await loadSchemas();
  for (const { schema } of schemas) {
    const schemaKey = schema.$id?.startsWith("./") ? schema.$id.slice(2) : undefined;
    ajv.addSchema(schema, schemaKey);
  }

  const files = (
    await Promise.all(validationRoots.map((root) => walkJsonFiles(path.join(workspaceRoot, root))))
  )
    .flat()
    .sort((left, right) => toPosixRelative(left).localeCompare(toPosixRelative(right)));

  const issues = [];
  const usedSchemaIds = new Set();
  const publicActivityItems = [];
  const publicationEvents = [];

  for (const filePath of files) {
    const relativePath = toPosixRelative(filePath);
    let value;

    try {
      value = JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      issues.push(`${relativePath}: invalid JSON: ${error.message}`);
      continue;
    }

    const schemaId = getSchemaId(relativePath, value);
    if (!schemaId) {
      issues.push(`${relativePath}: no schema mapping for JSON file.`);
      continue;
    }

    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      issues.push(`${relativePath}: schema not loaded: ${schemaId}.`);
      continue;
    }

    usedSchemaIds.add(schemaId);

    if (!validate(value)) {
      for (const error of validate.errors ?? []) {
        issues.push(`${relativePath}: ${formatError(error)}`);
      }
    }

    validatePublicActivityItem(relativePath, value, issues);
    validatePublicationEventRecord(relativePath, value, issues);
    validateStateOfFieldEdition(relativePath, value, issues);

    if (relativePath.startsWith("data/activity-items/") && value?.record_type === "activity_item") {
      publicActivityItems.push({ relativePath, value });
    }

    if (relativePath.startsWith("data/publication-events/") && value?.record_type === "publication_event") {
      publicationEvents.push({ relativePath, value });
    }
  }

  validatePublicActivityPublicationEvents(publicActivityItems, publicationEvents, issues);

  if (issues.length > 0) {
    process.stderr.write(`Record validation failed with ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      process.stderr.write(`- ${issue}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    `Validated ${files.length} JSON files against ${usedSchemaIds.size} schema mappings.\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
