#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const reportPath = "extra/reader-task-audit.md";
const validFocusReasons = new Set([
  "low_hanging_fruit",
  "neglected_area",
  "promising_signal",
  "blocking_dependency"
]);

function usage() {
  return `Usage:
  npm run audit:reader-tasks [-- --write] [-- --max-warnings N]

Options:
  --write           Write ${reportPath}.
  --max-warnings N Fail when warning count is greater than N.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const maxWarningsIndex = args.indexOf("--max-warnings");
  const options = {
    help: args.includes("--help") || args.includes("-h"),
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

  return options;
}

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(workspacePath(relativePath), "utf8"));
}

async function readText(relativePath) {
  return fs.readFile(workspacePath(relativePath), "utf8");
}

async function readJsonCollection(relativeDir) {
  const root = workspacePath(relativeDir);
  const fileNames = (await fs.readdir(root))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(fileNames.map((fileName) => readJson(path.join(relativeDir, fileName))));
}

function trackIdFromHref(href) {
  const match = String(href ?? "").match(/^\/tracks\/([a-z0-9-]+)$/);
  return match?.[1];
}

function hasPlainText(value) {
  return typeof value === "string" && value.trim().length >= 20;
}

function addCheck(checks, task, result, evidence, severity = "issue") {
  checks.push({
    task,
    result,
    evidence,
    severity: result === "pass" ? "pass" : severity
  });
}

function countByResult(checks, result) {
  return checks.filter((check) => check.result === result).length;
}

function formatReport(checks) {
  const issues = checks.filter((check) => check.result === "fail" && check.severity === "issue");
  const warnings = checks.filter((check) => check.result === "fail" && check.severity === "warning");
  const lines = [
    "# Reader Task Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Passed: ${countByResult(checks, "pass")}`,
    `Issues: ${issues.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "## Checks",
    ""
  ];

  for (const check of checks) {
    const status = check.result === "pass" ? "PASS" : check.severity === "warning" ? "WARN" : "FAIL";
    lines.push(`- ${status}: ${check.task}`);
    lines.push(`  ${check.evidence}`);
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

  const [
    narrative,
    trackTaxonomy,
    hallmarkTaxonomy,
    outlooks,
    homepageSource,
    hallmarkDetailSource,
    trackDetailSource,
    tracksIndexSource
  ] = await Promise.all([
    readJson("data/content/progress-narrative/current.json"),
    readJson("taxonomies/track-taxonomy.v1.json"),
    readJson("taxonomies/hallmarks-of-aging.v1.json"),
    readJsonCollection("data/outlooks"),
    readText("src/components/homepage.tsx"),
    readText("src/app/hallmarks/[hallmarkId]/page.tsx"),
    readText("src/app/tracks/[trackId]/page.tsx"),
    readText("src/app/tracks/page.tsx")
  ]);

  const checks = [];
  const trackIds = new Set(
    trackTaxonomy.hallmark_groups.flatMap((group) => group.tracks.map((track) => track.id))
  );
  const hallmarkIds = new Set(hallmarkTaxonomy.hallmarks.map((hallmark) => hallmark.id));
  const hallmarkOutlooks = outlooks.filter((outlook) => outlook.subject_type === "hallmark");
  const nowIsoDate = new Date().toISOString().slice(0, 10);

  addCheck(
    checks,
    "Reader can tell where the LEV journey stands",
    [narrative.title, narrative.summary, narrative.where_we_are_now, narrative.what_changed_recently].every(hasPlainText)
      ? "pass"
      : "fail",
    "Progress narrative needs title, summary, current state, and recent-change copy."
  );

  const journeyLabels = new Set((narrative.journey_steps ?? []).map((step) => String(step.label).toLowerCase()));
  addCheck(
    checks,
    "Reader gets a before-now-next temporal arc",
    narrative.journey_steps?.length >= 3 &&
      journeyLabels.has("before") &&
      journeyLabels.has("now") &&
      journeyLabels.has("next")
      ? "pass"
      : "fail",
    `Journey labels: ${Array.from(journeyLabels).join(", ") || "(missing)"}`
  );

  addCheck(
    checks,
    "Reader can see progress over time",
    narrative.progress_moments?.length >= 3 && narrative.progress_moments.some((moment) => moment.date)
      ? "pass"
      : "fail",
    `${narrative.progress_moments?.length ?? 0} progress moment(s); ${
      narrative.progress_moments?.filter((moment) => moment.date).length ?? 0
    } dated.`
  );

  addCheck(
    checks,
    "Reader can see what would make the outlook more or less optimistic",
    narrative.change_mind_items?.some((item) => item.direction === "more_optimistic") &&
      narrative.change_mind_items?.some((item) => item.direction === "less_optimistic")
      ? "pass"
      : "fail",
    `${narrative.change_mind_items?.length ?? 0} change-mind item(s).`
  );

  addCheck(
    checks,
    "Reader can tell what to watch next",
    narrative.watchlist?.length >= 3 && narrative.watchlist.every((item) => hasPlainText(item.signal_to_watch))
      ? "pass"
      : "fail",
    `${narrative.watchlist?.length ?? 0} watchlist item(s).`
  );

  const focusReasons = new Set((narrative.focus_priorities ?? []).map((priority) => priority.reason));
  addCheck(
    checks,
    "Reader can tell where effort should focus next",
    narrative.focus_priorities?.length >= 3 &&
      Array.from(focusReasons).every((reason) => validFocusReasons.has(reason)) &&
      focusReasons.size >= 2
      ? "pass"
      : "fail",
    `${narrative.focus_priorities?.length ?? 0} focus item(s), ${focusReasons.size} reason type(s).`
  );

  const unresolvedSpotlights = (narrative.spotlight_examples ?? [])
    .map((example) => ({ href: example.href, trackId: trackIdFromHref(example.href) }))
    .filter((example) => !example.trackId || !trackIds.has(example.trackId));
  addCheck(
    checks,
    "Reader gets concrete examples that resolve to track pages",
    narrative.spotlight_examples?.length >= 3 && unresolvedSpotlights.length === 0
      ? "pass"
      : "fail",
    unresolvedSpotlights.length
      ? `Unresolved spotlight href(s): ${unresolvedSpotlights.map((item) => item.href).join(", ")}`
      : `${narrative.spotlight_examples?.length ?? 0} spotlight example(s).`
  );

  addCheck(
    checks,
    "Homepage displays the reader story surfaces",
    ["Plain meaning", "What would change our mind?", "Concrete examples", "journey_steps"].every((marker) =>
      homepageSource.includes(marker)
    )
      ? "pass"
      : "fail",
    "Homepage source should render plain meaning, journey, change-mind criteria, and examples."
  );

  addCheck(
    checks,
    "Hallmark and track pages explain ratings locally",
    [homepageSource, hallmarkDetailSource, trackDetailSource].every((source) => source.includes("getStagePlainMeaning"))
      ? "pass"
      : "fail",
    "Stage plain-meaning helper should be used on homepage, hallmark detail, and track detail pages."
  );

  addCheck(
    checks,
    "Detail pages show what would change the interpretation",
    hallmarkDetailSource.includes("What would change our mind?") &&
      trackDetailSource.includes("What would change this?") &&
      trackDetailSource.includes("What would change this rating?")
      ? "pass"
      : "fail",
    "Hallmark and track detail pages should expose change criteria near forecast evidence."
  );

  addCheck(
    checks,
    "Tracks index uses reader-facing coverage labels",
    !/seeded tracks|baseline coverage/i.test(`${homepageSource}\n${tracksIndexSource}`)
      ? "pass"
      : "fail",
    "Homepage and tracks index should use research tracks / first-pass summaries language."
  );

  const missingHallmarkOutlooks = Array.from(hallmarkIds).filter(
    (hallmarkId) => !hallmarkOutlooks.some((outlook) => outlook.subject_id === hallmarkId)
  );
  const weakHallmarkOutlooks = hallmarkOutlooks.filter(
    (outlook) =>
      !hasPlainText(outlook.forecast_note) ||
      !outlook.main_blockers?.some(hasPlainText) ||
      !outlook.best_current_signals?.some(hasPlainText)
  );
  addCheck(
    checks,
    "Every hallmark has a readable top-level outlook",
    missingHallmarkOutlooks.length === 0 && weakHallmarkOutlooks.length === 0
      ? "pass"
      : "fail",
    missingHallmarkOutlooks.length || weakHallmarkOutlooks.length
      ? `Missing: ${missingHallmarkOutlooks.join(", ") || "none"}; weak: ${
          weakHallmarkOutlooks.map((outlook) => outlook.id).join(", ") || "none"
        }.`
      : `${hallmarkOutlooks.length} hallmark outlook(s) have blocker, signal, and note copy.`
  );

  addCheck(
    checks,
    "Narrative has a current review state",
    narrative.revision?.last_reviewed &&
      narrative.revision?.review_due >= nowIsoDate &&
      narrative.revision?.observed_outlook_states?.length > 0
      ? "pass"
      : "fail",
    `Last reviewed ${narrative.revision?.last_reviewed ?? "(missing)"}; due ${
      narrative.revision?.review_due ?? "(missing)"
    }; ${narrative.revision?.observed_outlook_states?.length ?? 0} observed outlook snapshot(s).`,
    "warning"
  );

  const report = formatReport(checks);
  const issues = checks.filter((check) => check.result === "fail" && check.severity === "issue");
  const warnings = checks.filter((check) => check.result === "fail" && check.severity === "warning");

  process.stdout.write(
    `Reader task audit: ${issues.length ? "failed" : "passed"} (${countByResult(checks, "pass")} passed, ${
      issues.length
    } issue(s), ${warnings.length} warning(s))\n`
  );

  if (options.write) {
    await writeReport(report);
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (options.maxWarnings !== undefined && warnings.length > options.maxWarnings) {
    process.stderr.write(`Reader task warning count ${warnings.length} exceeds --max-warnings ${options.maxWarnings}.\n`);
    process.exit(1);
  }

  if (issues.length > 0) {
    process.stderr.write(report);
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
