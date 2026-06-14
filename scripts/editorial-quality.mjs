#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildTrackHallmarkMap,
  computeHallmarkInsightFreshness,
  datePart
} from "./editorial-freshness.mjs";

const workspaceRoot = process.cwd();
const reportPath = "extra/editorial-quality-report.md";
const currentLevStoryPath = "data/content/current-lev-story/current.json";
const outlookRoot = "data/outlooks";
const publicationEventRoot = "data/publication-events";
const stateOfFieldRoot = "data/content/state-of-the-field";
const hallmarkInsightsPath = "data/content/hallmark-insights.json";
const trackTaxonomyPath = "taxonomies/track-taxonomy.v1.json";
const publicCopyReportPath = "extra/public-copy-report.md";
const readerTaskReportPath = "extra/reader-task-audit.md";

function usage() {
  return `Usage:
  npm run audit:editorial [-- --write] [-- --max-copy-warnings N] [-- --max-reader-warnings N]

Options:
  --write                 Write ${reportPath} and underlying extra/*.md reports.
  --max-copy-warnings N   Fail when public copy warnings are greater than N.
  --max-reader-warnings N Fail when reader-task warnings are greater than N.`;
}

function parseIntegerOption(args, name) {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

function parseArgs(argv) {
  const args = argv.slice(2);

  return {
    help: args.includes("--help") || args.includes("-h"),
    write: args.includes("--write"),
    maxCopyWarnings: parseIntegerOption(args, "--max-copy-warnings"),
    maxReaderWarnings: parseIntegerOption(args, "--max-reader-warnings")
  };
}

function runCommand(label, args) {
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), {
      cwd: workspaceRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("close", (exitCode) => {
      resolve({
        label,
        args,
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
  });
}

function commandLine(result) {
  return result.args.join(" ");
}

function parseNarrativeStatus(output) {
  return output.match(/(?:Current LEV story|Progress narrative) status:\s*([a-z]+)/)?.[1];
}

function parseCopyWarnings(output) {
  const match = output.match(/Public copy warnings:\s*(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function parseTopTerms(output) {
  return output.match(/Top terms:\s*(.+)/)?.[1];
}

function parseReaderAudit(output) {
  const match = output.match(/Reader task audit:\s*([^(]+)\((\d+) passed, (\d+) issue\(s\), (\d+) warning\(s\)\)/);

  if (!match) {
    return undefined;
  }

  return {
    status: match[1].trim(),
    passed: Number(match[2]),
    issues: Number(match[3]),
    warnings: Number(match[4])
  };
}

function parseReaderAuditReport(output) {
  const passed = output.match(/Passed:\s*(\d+)/);
  const issues = output.match(/Issues:\s*(\d+)/);
  const warnings = output.match(/Warnings:\s*(\d+)/);

  if (!passed || !issues || !warnings) {
    return undefined;
  }

  return {
    status: Number(issues[1]) > 0 ? "failed" : "passed",
    passed: Number(passed[1]),
    issues: Number(issues[1]),
    warnings: Number(warnings[1])
  };
}

function parseStateOfFieldWorkflow(output) {
  const status = output.match(/State of Field workflow status:\s*([a-z_]+)/)?.[1];
  const untracked = output.match(/Untracked missing updates:\s*(\d+)/);
  const openDecisions = output.match(/Open reconciliation decisions:\s*(\d+)/);

  if (!status) {
    return undefined;
  }

  return {
    status,
    untrackedMissingUpdates: untracked ? Number(untracked[1]) : undefined,
    openReconciliationDecisions: openDecisions ? Number(openDecisions[1]) : undefined
  };
}

function parseCopyReport(output) {
  const match = output.match(/Warnings:\s*(\d+)/);
  return match ? Number(match[1]) : undefined;
}

async function readTextIfExists(relativePath) {
  try {
    return await fs.readFile(path.join(workspaceRoot, relativePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(workspaceRoot, relativePath), "utf8"));
}

async function readJsonCollection(relativeDir) {
  const directoryPath = path.join(workspaceRoot, relativeDir);
  const fileNames = (await fs.readdir(directoryPath))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(fileNames.map((fileName) => readJson(path.join(relativeDir, fileName))));
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
  );
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function computeWorkspaceHallmarkInsightFreshness() {
  const [hallmarkInsights, outlooks, publicationEvents, trackTaxonomy] = await Promise.all([
    readJson(hallmarkInsightsPath),
    readJsonCollection(outlookRoot),
    readJsonCollection(publicationEventRoot),
    readJson(trackTaxonomyPath)
  ]);

  return computeHallmarkInsightFreshness({
    hallmarkInsights,
    outlooks,
    publicationEvents,
    trackHallmarkById: buildTrackHallmarkMap(trackTaxonomy)
  });
}

function getOutlookSnapshotPayload(outlook) {
  return compact({
    evidence_stage: outlook.evidence_stage,
    momentum: outlook.momentum,
    confidence: outlook.confidence,
    evidence_gap: outlook.main_evidence_gaps?.[0],
    strongest_evidence: outlook.strongest_current_evidence?.[0]
  });
}

function fingerprintOutlook(outlook) {
  return createHash("sha256")
    .update(JSON.stringify(getOutlookSnapshotPayload(outlook)))
    .digest("hex")
    .slice(0, 16);
}

function snapshotOutlook(outlook) {
  return compact({
    outlook_id: outlook.id,
    subject_type: outlook.subject_type,
    subject_id: outlook.subject_id,
    ...getOutlookSnapshotPayload(outlook),
    last_updated: outlook.last_updated,
    fingerprint: fingerprintOutlook(outlook)
  });
}

function collectNarrativeOutlookIds(narrative) {
  return unique([
    ...(narrative.related_outlook_ids ?? []),
    ...(narrative.recent_developments ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.what_to_watch_next ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.where_better_evidence_is_needed ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.what_would_change_the_outlook ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.track_examples_to_inspect ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.revision?.triggers ?? []).flatMap((item) => item.related_outlook_ids ?? [])
  ]).sort((left, right) => left.localeCompare(right));
}

async function computeNarrativeStatus() {
  const [narrative, outlooks, publicationEvents, stateOfFieldEditions] = await Promise.all([
    readJson(currentLevStoryPath),
    readJsonCollection(outlookRoot),
    readJsonCollection(publicationEventRoot),
    readJsonCollection(stateOfFieldRoot)
  ]);
  const outlookById = new Map(outlooks.map((outlook) => [outlook.id, outlook]));
  const currentSnapshots = new Map(
    collectNarrativeOutlookIds(narrative)
      .map((outlookId) => outlookById.get(outlookId))
      .filter(Boolean)
      .map(snapshotOutlook)
      .map((snapshot) => [snapshot.outlook_id, snapshot])
  );
  const storedSnapshots = new Map(
    (narrative.revision?.observed_outlook_states ?? []).map((snapshot) => [snapshot.outlook_id, snapshot])
  );
  const snapshotChanged = collectNarrativeOutlookIds(narrative).some((outlookId) => {
    const current = currentSnapshots.get(outlookId);
    const stored = storedSnapshots.get(outlookId);

    return !current || !stored || current.fingerprint !== stored.fingerprint;
  });
  const hasNewOutlookEvent = publicationEvents.some(
    (event) => event.affected_outlook_ids?.length && datePart(event.published_at) > narrative.revision.last_reviewed
  );
  const latestStateOfField = stateOfFieldEditions.sort((left, right) => right.date.localeCompare(left.date))[0];
  const stateOfFieldChanged =
    latestStateOfField && latestStateOfField.slug !== narrative.revision.observed_state_of_field_slug;
  const reviewDue = new Date().toISOString().slice(0, 10) > narrative.revision.review_due;

  return snapshotChanged || hasNewOutlookEvent || stateOfFieldChanged || reviewDue ? "stale" : "current";
}

function formatCommandBlock(result) {
  const lines = [
    `### ${result.label}`,
    "",
    `Command: \`${commandLine(result)}\``,
    `Exit code: ${result.exitCode}`,
    ""
  ];
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n\n");

  if (output) {
    lines.push("```text", output, "```", "");
  }

  return lines;
}

function formatReport({
  results,
  checks,
  copyWarnings,
  topTerms,
  readerAudit,
  narrativeStatus,
  stateOfFieldWorkflow,
  hallmarkInsightFreshness
}) {
  const failedChecks = checks.filter((check) => check.result === "fail");
  const lines = [
    "# Editorial Quality Report",
    "",
    "Snapshot: generated by `npm run audit:editorial -- --write`.",
    `Overall: ${failedChecks.length ? "needs attention" : "passed"}`,
    "",
    "## Summary",
    "",
    `- Current LEV story status: ${narrativeStatus ?? "unknown"}`,
    `- Public copy warnings: ${copyWarnings ?? "unknown"}`,
    `- Reader-task audit: ${
      readerAudit
        ? `${readerAudit.status} (${readerAudit.passed} passed, ${readerAudit.issues} issues, ${readerAudit.warnings} warnings)`
        : "unknown"
    }`,
    `- State of the Field workflow: ${
      stateOfFieldWorkflow
        ? `${stateOfFieldWorkflow.status} (${stateOfFieldWorkflow.openReconciliationDecisions ?? "unknown"} open decision(s), ${
            stateOfFieldWorkflow.untrackedMissingUpdates ?? "unknown"
          } untracked mismatch(es))`
        : "unknown"
    }`,
    `- Hallmark insight freshness: ${
      hallmarkInsightFreshness
        ? `${hallmarkInsightFreshness.staleCount} stale hallmark insight(s)`
        : "unknown"
    }`
  ];

  if (topTerms) {
    lines.push(`- Top public-copy terms: ${topTerms}`);
  }

  lines.push("", "## Gates", "");

  if (checks.length === 0) {
    lines.push("- No gates were evaluated.");
  } else {
    for (const check of checks) {
      lines.push(`- ${check.result === "pass" ? "PASS" : "FAIL"}: ${check.label}`);
      lines.push(`  ${check.detail}`);
    }
  }

  if (hallmarkInsightFreshness?.stale?.length) {
    lines.push("", "## Hallmark Insight Freshness", "");

    for (const row of hallmarkInsightFreshness.stale) {
      lines.push(
        `- ${row.hallmarkId}: last reviewed ${row.lastReviewed}; latest affected update ${row.latestPublicationEventId} on ${row.latestEventDate}.`
      );
    }
  }

  lines.push("", "## Command Output", "");

  for (const result of results) {
    lines.push(...formatCommandBlock(result));
  }

  return `${lines.join("\n")}\n`;
}

async function writeReport(markdown) {
  const fullPath = path.join(workspaceRoot, reportPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, markdown, "utf8");
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const publicCopyArgs = ["node", "scripts/public-copy-lint.mjs"];
  const readerTaskArgs = ["node", "scripts/reader-task-audit.mjs"];

  if (options.write) {
    publicCopyArgs.push("--write");
    readerTaskArgs.push("--write");
  }

  const results = await Promise.all([
    runCommand("Current LEV story status", ["node", "scripts/current-lev-story.mjs", "status"]),
    runCommand("State of the Field workflow status", [
      "node",
      "scripts/state-of-field-workflow.mjs",
      "status",
      "--strict"
    ]),
    runCommand("Public copy lint", publicCopyArgs),
    runCommand("Reader task audit", readerTaskArgs)
  ]);
  const narrativeResult = results[0];
  const stateOfFieldResult = results[1];
  const copyResult = results[2];
  const readerResult = results[3];
  const publicCopyReport = options.write ? await readTextIfExists(publicCopyReportPath) : undefined;
  const readerTaskReport = options.write ? await readTextIfExists(readerTaskReportPath) : undefined;
  const narrativeStatus = parseNarrativeStatus(narrativeResult.stdout) ?? (await computeNarrativeStatus());
  const copyWarnings = parseCopyWarnings(copyResult.stdout) ?? (publicCopyReport ? parseCopyReport(publicCopyReport) : undefined);
  const topTerms = parseTopTerms(copyResult.stdout);
  const readerAudit = parseReaderAudit(readerResult.stdout) ?? (readerTaskReport ? parseReaderAuditReport(readerTaskReport) : undefined);
  const stateOfFieldWorkflow = parseStateOfFieldWorkflow(stateOfFieldResult.stdout);
  const hallmarkInsightFreshness = await computeWorkspaceHallmarkInsightFreshness();
  const checks = [];

  checks.push({
    label: "Current LEV story is current",
    result: narrativeStatus === "current" && narrativeResult.exitCode === 0 ? "pass" : "fail",
    detail: `Status is ${narrativeStatus ?? "unknown"}.`
  });

  checks.push({
    label: "State-of-field reconciliation mismatches are tracked",
    result: stateOfFieldResult.exitCode === 0 ? "pass" : "fail",
    detail: stateOfFieldWorkflow
      ? `${stateOfFieldWorkflow.untrackedMissingUpdates ?? "unknown"} untracked mismatch(es), ${
          stateOfFieldWorkflow.openReconciliationDecisions ?? "unknown"
        } open reconciliation decision(s).`
      : "State-of-field workflow output could not be parsed."
  });

  checks.push({
    label: "Reader-task audit has no issues",
    result: readerResult.exitCode === 0 && (!readerAudit || readerAudit.issues === 0) ? "pass" : "fail",
    detail: readerAudit
      ? `${readerAudit.issues} issue(s), ${readerAudit.warnings} warning(s).`
      : "Reader audit output could not be parsed."
  });

  checks.push({
    label: "Hallmark insight summaries are reviewed after affected outlook changes",
    result: hallmarkInsightFreshness.staleCount === 0 ? "pass" : "fail",
    detail:
      hallmarkInsightFreshness.staleCount === 0
        ? "No hallmark insight summaries are older than their latest affected public update."
        : `${hallmarkInsightFreshness.staleCount} stale hallmark insight(s): ${hallmarkInsightFreshness.stale
            .map((row) => row.hallmarkId)
            .join(", ")}.`
  });

  if (options.maxCopyWarnings !== undefined) {
    checks.push({
      label: `Public copy warnings <= ${options.maxCopyWarnings}`,
      result: copyWarnings !== undefined && copyWarnings <= options.maxCopyWarnings ? "pass" : "fail",
      detail: `Current public copy warning count is ${copyWarnings ?? "unknown"}.`
    });
  }

  if (options.maxReaderWarnings !== undefined) {
    checks.push({
      label: `Reader-task warnings <= ${options.maxReaderWarnings}`,
      result: readerAudit !== undefined && readerAudit.warnings <= options.maxReaderWarnings ? "pass" : "fail",
      detail: `Current reader-task warning count is ${readerAudit?.warnings ?? "unknown"}.`
    });
  }

  const report = formatReport({
    results,
    checks,
    copyWarnings,
    topTerms,
    readerAudit,
    narrativeStatus,
    stateOfFieldWorkflow,
    hallmarkInsightFreshness
  });
  const failedChecks = checks.filter((check) => check.result === "fail");

  process.stdout.write(
    `Editorial quality audit: ${failedChecks.length ? "needs attention" : "passed"}; current LEV story ${
      narrativeStatus ?? "unknown"
    }; state-of-field ${stateOfFieldWorkflow?.status ?? "unknown"}; copy warnings ${
      copyWarnings ?? "unknown"
    }; reader issues ${readerAudit?.issues ?? "unknown"}; stale hallmark insights ${
      hallmarkInsightFreshness.staleCount
    }.\n`
  );

  if (options.write) {
    await writeReport(report);
    process.stdout.write(`Wrote ${reportPath}.\n`);
  }

  if (copyResult.exitCode !== 0 || failedChecks.length > 0) {
    if (!options.write) {
      process.stderr.write(report);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
