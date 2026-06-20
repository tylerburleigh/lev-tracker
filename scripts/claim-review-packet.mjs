#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const ledgerPath = path.join(workspaceRoot, "ops", "claim-consistency-resolutions.v1.json");
const defaultBaseUrl = process.env.LEV_TRACKER_BASE_URL ?? "http://127.0.0.1:3000";
const allowedStatuses = new Set(["accepted", "deferred", "false_positive", "fixed"]);

function usage() {
  return `Usage:
  npm run claim-review:packet -- status [--base-url URL | --packet PATH_OR_URL] [--top N] [--json]
  npm run claim-review:packet -- show --group GROUP_ID [--base-url URL | --packet PATH_OR_URL] [--json]
  npm run claim-review:packet -- apply --group GROUP_ID --status accepted|deferred|false_positive|fixed --note "..." [--base-url URL | --packet PATH_OR_URL] [--force] [--dry-run] [--json]

Packet filters:
  --track ID
  --issue-type TYPE
  --severity critical|warning|review
  --source-kind KIND
  --review-status STATUS
  --lifecycle-state STATE
  --review-freshness unreviewed|current|changed_since_review|resolved
  --limit N

Packet source:
  --base-url URL       Fetch /data/claim-consistency-review-packet.json from a running app.
  --packet PATH_OR_URL Read a saved packet JSON file or URL instead.

Apply options:
  --fingerprint ID     Apply only one fingerprint from the group.
  --reviewer-role ROLE Defaults to human_curator.
  --action-required X  Override the suggested action_required text.
  --force              Replace existing ledger entries for matching fingerprints.
  --dry-run            Print planned entries without writing the ledger.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("-")) ?? "status";
  const values = {};
  const flags = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    if (["json", "force", "dry-run", "help"].includes(key)) {
      flags.add(key);
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}.`);
    }

    values[key] = value;
    index += 1;
  }

  return {
    command,
    help: flags.has("help") || args.includes("-h"),
    json: flags.has("json"),
    force: flags.has("force"),
    dryRun: flags.has("dry-run"),
    values
  };
}

function packetFilters(values) {
  return {
    track: values.track,
    issue_type: values["issue-type"],
    severity: values.severity,
    source_kind: values["source-kind"],
    review_status: values["review-status"],
    lifecycle_state: values["lifecycle-state"],
    review_freshness: values["review-freshness"],
    limit: values.limit
  };
}

function packetUrl(baseUrl, values) {
  const url = new URL("/data/claim-consistency-review-packet.json", baseUrl);

  for (const [key, value] of Object.entries(packetFilters(values))) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadPacket(values) {
  const source = values.packet;
  const packetSource = source ?? packetUrl(values["base-url"] ?? defaultBaseUrl, values);

  if (/^https?:\/\//.test(packetSource)) {
    let response;
    try {
      response = await fetch(packetSource);
    } catch (error) {
      throw new Error(`Could not fetch packet from ${packetSource}: ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(`Could not fetch packet from ${packetSource}: HTTP ${response.status}`);
    }

    return {
      packet: await response.json(),
      source: packetSource
    };
  }

  const resolvedPath = path.resolve(workspaceRoot, packetSource);
  return {
    packet: await readJsonFile(resolvedPath),
    source: path.relative(workspaceRoot, resolvedPath).split(path.sep).join("/")
  };
}

function assertPacket(packet) {
  if (packet?.export_type !== "lev_tracker_claim_consistency_review_packet" || !Array.isArray(packet.groups)) {
    throw new Error("Input is not a claim consistency review packet export.");
  }
}

function findGroup(packet, groupId) {
  const group = packet.groups.find((item) => item.id === groupId);
  if (!group) {
    throw new Error(`Group not found in packet: ${groupId}`);
  }
  return group;
}

function formatStatus(packet, source, topCount) {
  const lines = [
    "Claim Review Packet",
    `Source: ${source}`,
    `Groups: ${packet.summary.returned_group_count} returned / ${packet.summary.total_group_count} total`,
    `Rows: ${packet.summary.reviewable_issue_count} reviewable from ${packet.summary.source_issue_count} source issues`,
    `Suggested ledger entries in packet: ${packet.summary.suggested_ledger_entry_count}`,
    "",
    `Top ${Math.min(topCount, packet.groups.length)} groups:`
  ];

  for (const group of packet.groups.slice(0, topCount)) {
    lines.push(
      `- ${group.id} | ${group.track_id} | ${group.issue_type} | ${group.issue_count} rows | priority ${group.priority_score}`
    );
    lines.push(`  ${group.source_record_path}`);
  }

  return `${lines.join("\n")}\n`;
}

function formatGroup(group) {
  const lines = [
    `${group.id}`,
    `${group.track_name} (${group.track_id})`,
    `${group.issue_type_label} / ${group.source_kind_label}`,
    `Rows: ${group.issue_count}; unresolved: ${group.unresolved_issue_count}; priority: ${group.priority_score}`,
    `Source record: ${group.source_record_path}`,
    `Recommendation: ${group.recommendation}`,
    ""
  ];

  if (group.priority_reasons.length) {
    lines.push("Priority reasons:");
    for (const reason of group.priority_reasons) {
      lines.push(`- ${reason}`);
    }
    lines.push("");
  }

  if (group.missing_terms.length) {
    lines.push(`Missing terms: ${group.missing_terms.join(", ")}`);
  }

  if (group.matched_terms.length) {
    lines.push(`Matched terms: ${group.matched_terms.join(", ")}`);
  }

  lines.push("", "Representative excerpts:");
  for (const excerpt of group.representative_excerpts) {
    lines.push(`- ${excerpt.fingerprint} | ${excerpt.field_path}`);
    lines.push(`  ${excerpt.text_excerpt}`);
  }

  lines.push("", "Suggested ledger entries:");
  lines.push(JSON.stringify(group.suggested_resolution_entries, null, 2));

  return `${lines.join("\n")}\n`;
}

function defaultLedger() {
  return {
    schema_version: "1.0.0",
    state_type: "claim_consistency_resolutions",
    updated_at: new Date().toISOString(),
    source_export: "/data/claim-consistency-audit.json",
    policy: {
      default_status: "open",
      fingerprint_basis: [
        "track_id",
        "issue_type",
        "source_kind",
        "source_record_path",
        "field_path",
        "boundary_class",
        "normalized_text"
      ],
      status_definitions: []
    },
    resolutions: []
  };
}

async function loadLedger() {
  try {
    return await readJsonFile(ledgerPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultLedger();
    }

    throw error;
  }
}

function buildEntry({ suggestedEntry, status, note, actionRequired, reviewerRole, now, existing }) {
  return {
    fingerprint: suggestedEntry.fingerprint,
    review_status: status,
    reviewed_at: now,
    reviewer_role: reviewerRole ?? existing?.reviewer_role ?? "human_curator",
    note: note ?? existing?.note ?? suggestedEntry.note,
    action_required: actionRequired ?? existing?.action_required ?? suggestedEntry.action_required,
    last_seen_at: now,
    applies_to: suggestedEntry.applies_to ?? existing?.applies_to
  };
}

async function applyGroup({ group, values, force, dryRun }) {
  const status = values.status;
  if (!allowedStatuses.has(status)) {
    throw new Error(`--status must be one of: ${Array.from(allowedStatuses).join(", ")}`);
  }

  const selectedEntries = values.fingerprint
    ? group.suggested_resolution_entries.filter((entry) => entry.fingerprint === values.fingerprint)
    : group.suggested_resolution_entries;

  if (selectedEntries.length === 0) {
    throw new Error(values.fingerprint ? `Fingerprint not found in group: ${values.fingerprint}` : "Group has no suggested entries.");
  }

  const ledger = await loadLedger();
  const existingByFingerprint = new Map(ledger.resolutions.map((entry) => [entry.fingerprint, entry]));
  const conflictingEntries = selectedEntries.filter((entry) => existingByFingerprint.has(entry.fingerprint));

  if (conflictingEntries.length > 0 && !force) {
    throw new Error(
      [
        "Refusing to overwrite existing ledger entries without --force.",
        ...conflictingEntries.map((entry) => `- ${entry.fingerprint}`)
      ].join("\n")
    );
  }

  const now = new Date().toISOString();
  const nextEntries = selectedEntries.map((entry) =>
    buildEntry({
      suggestedEntry: entry,
      status,
      note: values.note,
      actionRequired: values["action-required"],
      reviewerRole: values["reviewer-role"],
      now,
      existing: existingByFingerprint.get(entry.fingerprint)
    })
  );

  if (dryRun) {
    return {
      dry_run: true,
      ledger_path: path.relative(workspaceRoot, ledgerPath).split(path.sep).join("/"),
      applied_count: nextEntries.length,
      entries: nextEntries
    };
  }

  const nextByFingerprint = new Map(ledger.resolutions.map((entry) => [entry.fingerprint, entry]));
  for (const entry of nextEntries) {
    nextByFingerprint.set(entry.fingerprint, entry);
  }

  const nextLedger = {
    ...ledger,
    updated_at: now,
    resolutions: Array.from(nextByFingerprint.values()).sort((left, right) => left.fingerprint.localeCompare(right.fingerprint))
  };

  await writeJsonFile(ledgerPath, nextLedger);

  return {
    dry_run: false,
    ledger_path: path.relative(workspaceRoot, ledgerPath).split(path.sep).join("/"),
    applied_count: nextEntries.length,
    entries: nextEntries
  };
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!["status", "show", "apply"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}\n\n${usage()}`);
  }

  const { packet, source } = await loadPacket(options.values);
  assertPacket(packet);

  if (options.command === "status") {
    const topCount = Number(options.values.top ?? 10);
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ source, summary: packet.summary, groups: packet.groups.slice(0, topCount) }, null, 2)}\n`
      );
      return;
    }

    process.stdout.write(formatStatus(packet, source, topCount));
    return;
  }

  const groupId = options.values.group;
  if (!groupId) {
    throw new Error(`${options.command} requires --group GROUP_ID.`);
  }

  const group = findGroup(packet, groupId);

  if (options.command === "show") {
    process.stdout.write(options.json ? `${JSON.stringify(group, null, 2)}\n` : formatGroup(group));
    return;
  }

  const result = await applyGroup({
    group,
    values: options.values,
    force: options.force,
    dryRun: options.dryRun
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `${result.dry_run ? "Dry run" : "Applied"} ${result.applied_count} ledger entr${result.applied_count === 1 ? "y" : "ies"} to ${result.ledger_path}.\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
