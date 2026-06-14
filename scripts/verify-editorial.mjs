#!/usr/bin/env node

import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function usage() {
  return `Usage:
  npm run verify:editorial [-- --include-build]

Options:
  --include-build  Also run the production build after typecheck.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const knownArgs = new Set(["--help", "-h", "--include-build"]);
  const unknownArgs = args.filter((arg) => !knownArgs.has(arg));

  if (unknownArgs.length > 0) {
    throw new Error(`Unknown option(s): ${unknownArgs.join(", ")}`);
  }

  return {
    help: args.includes("--help") || args.includes("-h"),
    includeBuild: args.includes("--include-build")
  };
}

function npmRun(script, args = []) {
  return ["run", script, ...(args.length > 0 ? ["--", ...args] : [])];
}

function buildSteps(options) {
  const steps = [
    {
      label: "Reconcile State of the Field workflow manifest",
      args: npmRun("state-of-field:reconcile", ["--write"])
    },
    {
      label: "Check State of the Field workflow status",
      args: npmRun("state-of-field:status", ["--strict"])
    },
    {
      label: "Run editorial quality ratchet",
      args: npmRun("audit:editorial:ratchet")
    },
    {
      label: "Validate JSON records",
      args: npmRun("validate:records")
    },
    {
      label: "Audit live data integrity",
      args: npmRun("audit:data")
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

  process.stdout.write(`\nEditorial verification passed (${steps.length} steps).\n`);
}

main().catch((error) => {
  process.stderr.write(`\nEditorial verification failed: ${error.message}\n`);
  process.exit(1);
});
