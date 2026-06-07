#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const reportPath = "extra/public-copy-report.md";
const publicCopyRulesPath = "config/public-copy-rules.json";
const textFileRoots = ["src/app", "src/components"];
const textFileExtensions = new Set([".tsx", ".ts"]);

const publicCopyRules = JSON.parse(await fs.readFile(path.join(workspaceRoot, publicCopyRulesPath), "utf8"));
const jargonRules = publicCopyRules.jargon_rules;

function usage() {
  return `Usage:
  npm run lint:public-copy [-- --write] [-- --max-warnings N]

Options:
  --write           Write ${reportPath}.
  --max-warnings N Fail when warning count is greater than N.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const maxWarningsIndex = args.indexOf("--max-warnings");
  const options = {
    write: args.includes("--write"),
    maxWarnings: undefined
  };

  if (maxWarningsIndex >= 0) {
    const value = Number(args[maxWarningsIndex + 1]);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("--max-warnings must be a non-negative integer.");
    }

    options.maxWarnings = value;
  }

  if (args.includes("--help") || args.includes("-h")) {
    options.help = true;
  }

  return options;
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

async function readJsonCollection(relativeDir) {
  try {
    const fileNames = (await fs.readdir(workspacePath(relativeDir)))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(
      fileNames.map(async (fileName) => ({
        relativePath: path.join(relativeDir, fileName),
        value: await readJson(path.join(relativeDir, fileName))
      }))
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function addText(records, source, fieldPath, value) {
  if (typeof value === "string" && value.trim()) {
    records.push({ source, fieldPath, value });
  }
}

function addTextArray(records, source, fieldPath, values) {
  for (const [index, value] of (values ?? []).entries()) {
    addText(records, source, `${fieldPath}[${index}]`, value);
  }
}

function collectCurrentLevStory(records, source, narrative) {
  for (const field of ["title", "summary", "current_evidence_picture", "what_changed"]) {
    addText(records, source, `$.${field}`, narrative[field]);
  }

  for (const [index, step] of (narrative.before_now_next ?? []).entries()) {
    addText(records, source, `$.before_now_next[${index}].label`, step.label);
    addText(records, source, `$.before_now_next[${index}].title`, step.title);
    addText(records, source, `$.before_now_next[${index}].summary`, step.summary);
  }

  for (const [index, moment] of (narrative.recent_developments ?? []).entries()) {
    addText(records, source, `$.recent_developments[${index}].label`, moment.label);
    addText(records, source, `$.recent_developments[${index}].summary`, moment.summary);
    addText(records, source, `$.recent_developments[${index}].impact_on_outlook`, moment.impact_on_outlook);
  }

  for (const [index, item] of (narrative.what_to_watch_next ?? []).entries()) {
    addText(records, source, `$.what_to_watch_next[${index}].label`, item.label);
    addText(records, source, `$.what_to_watch_next[${index}].summary`, item.summary);
    addText(records, source, `$.what_to_watch_next[${index}].what_to_look_for`, item.what_to_look_for);
  }

  for (const [index, priority] of (narrative.where_better_evidence_is_needed ?? []).entries()) {
    addText(records, source, `$.where_better_evidence_is_needed[${index}].label`, priority.label);
    addText(records, source, `$.where_better_evidence_is_needed[${index}].rationale`, priority.rationale);
    addText(records, source, `$.where_better_evidence_is_needed[${index}].what_better_evidence_would_show`, priority.what_better_evidence_would_show);
  }

  for (const [index, item] of (narrative.what_would_change_the_outlook ?? []).entries()) {
    addText(records, source, `$.what_would_change_the_outlook[${index}].label`, item.label);
    addText(records, source, `$.what_would_change_the_outlook[${index}].summary`, item.summary);
  }

  for (const [index, example] of (narrative.track_examples_to_inspect ?? []).entries()) {
    addText(records, source, `$.track_examples_to_inspect[${index}].label`, example.label);
    addText(records, source, `$.track_examples_to_inspect[${index}].title`, example.title);
    addText(records, source, `$.track_examples_to_inspect[${index}].summary`, example.summary);
  }
}

function collectStateOfField(records, source, edition) {
  addText(records, source, "$.title", edition.title);
  addText(records, source, "$.summary", edition.summary);
  addText(records, source, "$.lede", edition.lede);
  addText(records, source, "$.bottom_line", edition.bottom_line);
  addText(records, source, "$.field_change_note", edition.field_change_note);
  addText(records, source, "$.period_label", edition.period_label);
  addTextArray(records, source, "$.bullets", edition.bullets);
  addText(records, source, "$.why_it_matters", edition.why_it_matters);
  addTextArray(records, source, "$.what_did_not_change", edition.what_did_not_change);
  addTextArray(records, source, "$.reader_takeaways", edition.reader_takeaways);

  for (const [index, change] of (edition.what_changed ?? []).entries()) {
    addText(records, source, `$.what_changed[${index}].title`, change.title);
    addText(records, source, `$.what_changed[${index}].summary`, change.summary);
    addText(records, source, `$.what_changed[${index}].interpretation`, change.interpretation);
  }

  for (const [index, context] of (edition.current_context ?? []).entries()) {
    addText(records, source, `$.current_context[${index}].label`, context.label);
    addText(records, source, `$.current_context[${index}].summary`, context.summary);
  }

  for (const [index, signal] of (edition.signals_to_watch ?? []).entries()) {
    addText(records, source, `$.signals_to_watch[${index}].label`, signal.label);
    addText(records, source, `$.signals_to_watch[${index}].summary`, signal.summary);
  }

  for (const [index, item] of (edition.trial_horizon ?? []).entries()) {
    addText(records, source, `$.trial_horizon[${index}].label`, item.label);
    addText(records, source, `$.trial_horizon[${index}].summary`, item.summary);
  }

  for (const [index, gap] of (edition.evidence_gaps ?? []).entries()) {
    addText(records, source, `$.evidence_gaps[${index}].label`, gap.label);
    addText(records, source, `$.evidence_gaps[${index}].summary`, gap.summary);
  }

  for (const [index, example] of (edition.track_examples ?? []).entries()) {
    addText(records, source, `$.track_examples[${index}].label`, example.label);
    addText(records, source, `$.track_examples[${index}].title`, example.title);
    addText(records, source, `$.track_examples[${index}].summary`, example.summary);
  }

  for (const [index, revision] of (edition.revision_history ?? []).entries()) {
    addText(records, source, `$.revision_history[${index}].summary`, revision.summary);
  }
}

function collectHallmarkInsights(records, source, insights) {
  for (const [index, insight] of insights.entries()) {
    addText(records, source, `$[${index}].overview`, insight.overview);
    addText(records, source, `$[${index}].next_stage_requirement`, insight.next_stage_requirement);
    addText(records, source, `$[${index}].key_question`, insight.key_question);
  }
}

function collectOutlook(records, source, outlook) {
  addText(records, source, "$.name", outlook.name);
  addTextArray(records, source, "$.main_evidence_gaps", outlook.main_evidence_gaps);
  addTextArray(records, source, "$.strongest_current_evidence", outlook.strongest_current_evidence);
  addText(records, source, "$.interpretation_note", outlook.interpretation_note);
  addTextArray(records, source, "$.what_would_change_the_rating", outlook.what_would_change_the_rating);

  for (const [index, evidence] of (outlook.supporting_evidence ?? []).entries()) {
    addText(records, source, `$.supporting_evidence[${index}].label`, evidence.label);
    addText(records, source, `$.supporting_evidence[${index}].conclusion`, evidence.conclusion);
    addText(records, source, `$.supporting_evidence[${index}].rationale`, evidence.rationale);
    addTextArray(records, source, `$.supporting_evidence[${index}].limitations`, evidence.limitations);
  }
}

function collectActivityItem(records, source, item) {
  addText(records, source, "$.name", item.name);
  addText(records, source, "$.summary", item.summary);
  addText(records, source, "$.significance_note", item.significance_note);
}

function collectPublicationEvent(records, source, event) {
  addText(records, source, "$.name", event.name);
  addText(records, source, "$.summary", event.summary);
  addText(records, source, "$.change_note", event.change_note);
}

function collectHallmarkTaxonomy(records, source, taxonomy) {
  for (const [index, hallmark] of (taxonomy.hallmarks ?? []).entries()) {
    addText(records, source, `$.hallmarks[${index}].name`, hallmark.name);
    addText(records, source, `$.hallmarks[${index}].description`, hallmark.description);
  }
}

function collectTrackTaxonomy(records, source, taxonomy) {
  for (const [groupIndex, group] of (taxonomy.hallmark_groups ?? []).entries()) {
    addText(records, source, `$.hallmark_groups[${groupIndex}].summary`, group.summary);

    for (const [trackIndex, track] of (group.tracks ?? []).entries()) {
      addText(records, source, `$.hallmark_groups[${groupIndex}].tracks[${trackIndex}].name`, track.name);
      addText(records, source, `$.hallmark_groups[${groupIndex}].tracks[${trackIndex}].summary`, track.summary);
      addTextArray(
        records,
        source,
        `$.hallmark_groups[${groupIndex}].tracks[${trackIndex}].exemplar_interventions`,
        track.exemplar_interventions
      );
    }
  }
}

async function collectStructuredRecords() {
  const records = [];
  const narrativePath = "data/content/current-lev-story/current.json";
  const hallmarkInsightsPath = "data/content/hallmark-insights.json";
  const hallmarkTaxonomyPath = "taxonomies/hallmarks-of-aging.v1.json";
  const trackTaxonomyPath = "taxonomies/track-taxonomy.v1.json";

  collectCurrentLevStory(records, narrativePath, await readJson(narrativePath));
  collectHallmarkInsights(records, hallmarkInsightsPath, await readJson(hallmarkInsightsPath));
  collectHallmarkTaxonomy(records, hallmarkTaxonomyPath, await readJson(hallmarkTaxonomyPath));
  collectTrackTaxonomy(records, trackTaxonomyPath, await readJson(trackTaxonomyPath));

  for (const { relativePath, value } of await readJsonCollection("data/content/state-of-the-field")) {
    collectStateOfField(records, relativePath, value);
  }

  for (const { relativePath, value } of await readJsonCollection("data/outlooks")) {
    collectOutlook(records, relativePath, value);
  }

  for (const { relativePath, value } of await readJsonCollection("data/activity-items")) {
    collectActivityItem(records, relativePath, value);
  }

  for (const { relativePath, value } of await readJsonCollection("data/publication-events")) {
    collectPublicationEvent(records, relativePath, value);
  }

  return records;
}

async function listTextFiles(relativeRoot) {
  const root = workspacePath(relativeRoot);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeRoot, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listTextFiles(relativePath)));
    } else if (textFileExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

async function collectStaticUiRecords() {
  const records = [];

  for (const root of textFileRoots) {
    for (const relativePath of await listTextFiles(root)) {
      const lines = (await fs.readFile(workspacePath(relativePath), "utf8")).split("\n");
      for (const [index, line] of lines.entries()) {
        const trimmed = line.trim();

        if (
          trimmed.includes("mechanistic_plausibility") ||
          trimmed.includes("durable_disease_or_mortality") ||
          trimmed.includes("trial-watch-") ||
          trimmed.includes("durableOutcome")
        ) {
          continue;
        }

        addText(records, relativePath, `line ${index + 1}`, trimmed);
      }
    }
  }

  return records;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerpt(value, term) {
  const lowerValue = value.toLowerCase();
  const startIndex = lowerValue.indexOf(term.toLowerCase());
  if (startIndex < 0) {
    return value.slice(0, 160);
  }

  const start = Math.max(0, startIndex - 70);
  const end = Math.min(value.length, startIndex + term.length + 70);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < value.length ? "..." : "";

  return `${prefix}${value.slice(start, end)}${suffix}`.replace(/\s+/g, " ");
}

function lintRecords(records) {
  const findings = [];

  for (const record of records) {
    for (const rule of jargonRules) {
      const expression = new RegExp(escapeRegex(rule.term), "i");
      if (expression.test(record.value)) {
        findings.push({
          ...record,
          term: rule.term,
          suggestion: rule.suggestion,
          excerpt: excerpt(record.value, rule.term)
        });
      }
    }
  }

  return findings.sort((left, right) =>
    left.source.localeCompare(right.source) ||
    left.fieldPath.localeCompare(right.fieldPath) ||
    left.term.localeCompare(right.term)
  );
}

function summarizeTerms(findings) {
  const counts = new Map();

  for (const finding of findings) {
    const entry = counts.get(finding.term) ?? { term: finding.term, suggestion: finding.suggestion, count: 0 };
    entry.count += 1;
    counts.set(finding.term, entry);
  }

  return Array.from(counts.values()).sort((left, right) => right.count - left.count || left.term.localeCompare(right.term));
}

function formatReport(findings) {
  const termSummary = summarizeTerms(findings);
  const lines = [
    "# Public Copy Lint Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Warnings: ${findings.length}`,
    "",
    "## Highest-Volume Terms",
    ""
  ];

  if (termSummary.length === 0) {
    lines.push("- No tracked jargon terms found.");
  } else {
    lines.push(
      ...termSummary
        .slice(0, 20)
        .map((item) => `- ${item.term}: ${item.count} warning(s); consider "${item.suggestion}"`)
    );
  }

  lines.push("", "## Findings", "");

  if (findings.length === 0) {
    lines.push("- No tracked jargon terms found.");
  } else {
    for (const finding of findings) {
      lines.push(
        `- ${finding.source} ${finding.fieldPath}: "${finding.term}" -> consider "${finding.suggestion}"`,
        `  Excerpt: ${finding.excerpt}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

async function writeReport(markdown) {
  const fullPath = workspacePath(reportPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, markdown, "utf8");
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const [structuredRecords, staticUiRecords] = await Promise.all([
    collectStructuredRecords(),
    collectStaticUiRecords()
  ]);
  const findings = lintRecords([...structuredRecords, ...staticUiRecords]);
  const report = formatReport(findings);
  const termSummary = summarizeTerms(findings)
    .slice(0, 8)
    .map((item) => `${item.term}: ${item.count}`)
    .join(", ");

  process.stdout.write(`Public copy warnings: ${findings.length}\n`);
  process.stdout.write(termSummary ? `Top terms: ${termSummary}\n` : "No tracked jargon terms found.\n");

  if (options.write) {
    await writeReport(report);
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (options.maxWarnings !== undefined && findings.length > options.maxWarnings) {
    process.stderr.write(`Public copy warning count ${findings.length} exceeds --max-warnings ${options.maxWarnings}.\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
