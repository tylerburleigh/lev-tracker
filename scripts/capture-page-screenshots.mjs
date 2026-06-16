#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const workspaceRoot = process.cwd();
const defaultViewports = [
  { name: "desktop", width: 1440, height: 1200 },
  { name: "mobile", width: 390, height: 1200 }
];

function usage() {
  return `Usage:
  npm run screenshot:page -- --path /state-of-the-field/2026-06 [--out extra/screenshots]
  npm run screenshot:page -- --url http://127.0.0.1:3002/state-of-the-field/2026-06 --no-server

Options:
  --path PATH       App path to capture. Defaults to /.
  --url URL         Full URL to capture. Server startup is skipped when this is provided.
  --out DIR         Output directory. Defaults to extra/screenshots.
  --name NAME       File-name prefix. Defaults to a sanitized path.
  --host HOST       Host for the local server. Defaults to 127.0.0.1.
  --port PORT       Port for the local server. Defaults to 3002.
  --viewports LIST  Comma-separated viewport list like desktop=1440x1200,mobile=390x1200.
  --no-server       Do not start Next; capture the provided --url.
  --skip-build      Do not run npm run build before starting Next.
  --help            Show this help.

Requires Firefox at /usr/bin/firefox or on PATH.`;
}

function readOptionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    help: args.includes("--help") || args.includes("-h"),
    appPath: readOptionValue(args, "--path") ?? "/",
    url: readOptionValue(args, "--url"),
    outDir: readOptionValue(args, "--out") ?? "extra/screenshots",
    name: readOptionValue(args, "--name"),
    host: readOptionValue(args, "--host") ?? "127.0.0.1",
    port: Number(readOptionValue(args, "--port") ?? "3002"),
    viewports: parseViewports(readOptionValue(args, "--viewports")),
    noServer: args.includes("--no-server"),
    skipBuild: args.includes("--skip-build")
  };
}

function parseViewports(value) {
  if (!value) {
    return defaultViewports;
  }

  return value.split(",").map((entry) => {
    const [name, size] = entry.split("=");
    const [width, height] = (size ?? "").split("x").map(Number);
    if (!name || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error(`Invalid viewport "${entry}". Expected name=WIDTHxHEIGHT.`);
    }
    return { name, width, height };
  });
}

function sanitizeName(value) {
  const sanitized = value
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return sanitized || "page";
}

function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn("which", [command], {
      stdio: "ignore"
    });
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function findFirefox() {
  if (process.env.FIREFOX_BIN) {
    return process.env.FIREFOX_BIN;
  }

  if (await commandExists("firefox")) {
    return "firefox";
  }

  throw new Error("Firefox was not found on PATH. Install Firefox or run the screenshot command on a machine that has it.");
}

async function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown error"}`);
}

function startServer({ host, port }) {
  const child = spawn("npm", ["run", "start", "--", "--hostname", host, "--port", String(port)], {
    cwd: workspaceRoot,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => process.stderr.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  return child;
}

function stopServer(child) {
  if (!child || child.killed) {
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env: { ...process.env, MOZ_HEADLESS: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";

    child.stdout.on("data", (chunk) => process.stderr.write(chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`));
      }
    });
  });
}

async function captureViewport({ firefox, url, outPath, width, height }) {
  await runCommand(firefox, [
    "--headless",
    `--window-size=${width},${height}`,
    "--screenshot",
    outPath,
    url
  ]);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!options.noServer && !Number.isInteger(options.port)) {
    throw new Error("--port must be an integer.");
  }

  const firefox = await findFirefox();
  const shouldStartServer = !options.noServer && !options.url;
  const targetUrl = options.url ?? `http://${options.host}:${options.port}${options.appPath.startsWith("/") ? options.appPath : `/${options.appPath}`}`;
  const outputDir = path.join(workspaceRoot, options.outDir);
  const filePrefix = options.name ?? sanitizeName(options.url ?? options.appPath);
  let server;

  await fs.mkdir(outputDir, { recursive: true });

  try {
    if (shouldStartServer) {
      if (!options.skipBuild) {
        await runCommand("npm", ["run", "build"]);
      }
      server = startServer(options);
    }

    await waitForUrl(targetUrl);

    const written = [];
    for (const viewport of options.viewports) {
      const outPath = path.join(outputDir, `${filePrefix}-${viewport.name}.png`);
      await captureViewport({
        firefox,
        url: targetUrl,
        outPath,
        width: viewport.width,
        height: viewport.height
      });
      written.push(path.relative(workspaceRoot, outPath));
    }

    process.stdout.write(["Captured screenshots:", ...written.map((item) => `- ${item}`)].join("\n") + "\n");
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
