#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const reportPath = "extra/editorial-quality-report.md";

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
  return output.match(/Progress narrative status:\s*([a-z]+)/)?.[1];
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

function formatReport({ results, checks, copyWarnings, topTerms, readerAudit, narrativeStatus }) {
  const failedChecks = checks.filter((check) => check.result === "fail");
  const lines = [
    "# Editorial Quality Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Overall: ${failedChecks.length ? "needs attention" : "passed"}`,
    "",
    "## Summary",
    "",
    `- Narrative status: ${narrativeStatus ?? "unknown"}`,
    `- Public copy warnings: ${copyWarnings ?? "unknown"}`,
    `- Reader-task audit: ${
      readerAudit
        ? `${readerAudit.status} (${readerAudit.passed} passed, ${readerAudit.issues} issues, ${readerAudit.warnings} warnings)`
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
    runCommand("Narrative status", ["node", "scripts/progress-narrative.mjs", "status"]),
    runCommand("Public copy lint", publicCopyArgs),
    runCommand("Reader task audit", readerTaskArgs)
  ]);
  const narrativeResult = results[0];
  const copyResult = results[1];
  const readerResult = results[2];
  const narrativeStatus = parseNarrativeStatus(narrativeResult.stdout);
  const copyWarnings = parseCopyWarnings(copyResult.stdout);
  const topTerms = parseTopTerms(copyResult.stdout);
  const readerAudit = parseReaderAudit(readerResult.stdout);
  const checks = [];

  checks.push({
    label: "Narrative is current",
    result: narrativeStatus === "current" && narrativeResult.exitCode === 0 ? "pass" : "fail",
    detail: `Status is ${narrativeStatus ?? "unknown"}.`
  });

  checks.push({
    label: "Reader-task audit has no issues",
    result: readerResult.exitCode === 0 && (!readerAudit || readerAudit.issues === 0) ? "pass" : "fail",
    detail: readerAudit
      ? `${readerAudit.issues} issue(s), ${readerAudit.warnings} warning(s).`
      : "Reader audit output could not be parsed."
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

  const report = formatReport({ results, checks, copyWarnings, topTerms, readerAudit, narrativeStatus });
  const failedChecks = checks.filter((check) => check.result === "fail");

  process.stdout.write(
    `Editorial quality audit: ${failedChecks.length ? "needs attention" : "passed"}; narrative ${narrativeStatus ?? "unknown"}; copy warnings ${
      copyWarnings ?? "unknown"
    }; reader issues ${readerAudit?.issues ?? "unknown"}.\n`
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
