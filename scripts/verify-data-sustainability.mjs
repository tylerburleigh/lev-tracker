#!/usr/bin/env node

import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function usage() {
  return `Usage:
  npm run verify:data-sustainability
  npm run verify:data-sustainability -- --write [--include-build]

Options:
  --write          Regenerate generated audit reports while verifying.
  --include-build  Also run the production build after typecheck.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const knownArgs = new Set(["--help", "-h", "--write", "--include-build"]);
  const unknownArgs = args.filter((arg) => !knownArgs.has(arg));

  if (unknownArgs.length > 0) {
    throw new Error(`Unknown option(s): ${unknownArgs.join(", ")}`);
  }

  return {
    help: args.includes("--help") || args.includes("-h"),
    write: args.includes("--write"),
    includeBuild: args.includes("--include-build")
  };
}

function npmRun(script, args = []) {
  return ["run", script, ...(args.length > 0 ? ["--", ...args] : [])];
}

function buildSteps(options) {
  const maybeWrite = options.write ? ["--write"] : [];

  const steps = [
    {
      label: "Validate JSON records",
      args: npmRun("validate:records")
    },
    {
      label: "Audit live data integrity",
      args: npmRun("audit:data")
    },
    {
      label: "Audit data sustainability",
      args: npmRun("audit:data:sustainability", [...maybeWrite, "--max-unreferenced-staged", "0"])
    },
    {
      label: "Audit artifact retention",
      args: npmRun("audit:artifacts", [...maybeWrite, "--max-unclassified", "0"])
    },
    {
      label: "Check terminal staged manifest",
      args: npmRun("manifest:staged-records", ["--check"])
    },
    {
      label: "Audit staged archive readiness",
      args: npmRun("audit:staged-archive-readiness", [...maybeWrite, "--max-manifest-drift", "0"])
    },
    {
      label: "Check changed-body staged archive",
      args: npmRun("archive:staged-records", ["--check"])
    },
    {
      label: "Verify staged archive reconstruction",
      args: npmRun("verify:staged-archive", maybeWrite)
    },
    {
      label: "Verify staged prune state",
      args: npmRun("prune:staged-records", ["--dry-run", ...maybeWrite])
    },
    {
      label: "Audit retained staged records",
      args: npmRun("audit:retained-staged-records", maybeWrite)
    },
    {
      label: "Typecheck application",
      args: npmRun("typecheck")
    }
  ];

  if (options.includeBuild) {
    steps.push({
      label: "Build application",
      args: npmRun("build")
    });
  }

  return steps;
}

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${npmCommand} ${args.join(" ")} exited with signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${npmCommand} ${args.join(" ")} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const steps = buildSteps(options);
  for (const [index, step] of steps.entries()) {
    process.stdout.write(`\n[${index + 1}/${steps.length}] ${step.label}\n`);
    await runCommand(step.args);
  }

  process.stdout.write(
    `\nData sustainability verification passed (${steps.length} step${steps.length === 1 ? "" : "s"}).\n`
  );
}

main().catch((error) => {
  process.stderr.write(`\nData sustainability verification failed: ${error.message}\n`);
  process.exit(1);
});
