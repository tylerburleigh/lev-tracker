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
  }

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
