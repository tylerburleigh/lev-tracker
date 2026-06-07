#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const currentLevStoryPath = "data/content/current-lev-story/current.json";
const stateOfFieldRoot = "data/content/state-of-the-field";
const outlookRoot = "data/outlooks";
const publicationEventRoot = "data/publication-events";
const draftJsonPath = "extra/current-lev-story-draft.json";
const draftMarkdownPath = "extra/current-lev-story-draft.md";
const publicCopyRulesPath = "config/public-copy-rules.json";

const stageLabels = {
  mechanistic_plausibility: "mechanistic plausibility",
  animal_signal: "animal signal",
  human_biomarker_signal: "human biomarker signal",
  human_functional_benefit: "human functional benefit",
  durable_disease_or_mortality_relevance: "durable disease or mortality relevance"
};

const momentumLabels = {
  accelerating: "accelerating",
  steady: "steady",
  mixed: "mixed",
  stalled: "stalled",
  uncertain: "uncertain"
};

const readFirmnessLabels = {
  low: "tentative",
  moderate: "provisional",
  high: "firm"
};

const draftStyles = new Set(["plain", "technical"]);
const publicCopyRules = JSON.parse(await fs.readFile(path.join(workspaceRoot, publicCopyRulesPath), "utf8"));
const plainLanguageReplacements = publicCopyRules.plain_language_replacements.map((rule) => [rule.from, rule.to]);
const jargonRules = publicCopyRules.jargon_rules;

function usage() {
  return `Usage:
  npm run story:current -- status [--today YYYY-MM-DD]
  npm run story:current -- draft [--write] [--style plain|technical] [--today YYYY-MM-DD]
  npm run story:current -- snapshot [--write-current]

Commands:
  status    Report whether the current public LEV story needs review.
  draft     Generate a deterministic editorial draft from reviewed public records. Defaults to plain style.
  snapshot  Print or store current outlook fingerprints for future diffing.`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("--")) ?? "status";
  const options = {
    write: args.includes("--write"),
    writeCurrent: args.includes("--write-current"),
    style: "plain",
    today: new Date().toISOString().slice(0, 10)
  };
  const todayIndex = args.indexOf("--today");
  const styleIndex = args.indexOf("--style");

  if (todayIndex >= 0) {
    options.today = args[todayIndex + 1];
  }

  if (styleIndex >= 0) {
    options.style = args[styleIndex + 1];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.today)) {
    throw new Error("--today must be an ISO date such as 2026-06-06.");
  }

  if (!draftStyles.has(options.style)) {
    throw new Error("--style must be either plain or technical.");
  }

  return { command, options };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(workspaceRoot, relativePath), "utf8"));
}

async function writeJson(relativePath, value) {
  const filePath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(relativePath, value) {
  const filePath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

async function readCollection(relativeDir) {
  const directoryPath = path.join(workspaceRoot, relativeDir);

  try {
    const fileNames = (await fs.readdir(directoryPath))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(fileNames.map((fileName) => readJson(path.join(relativeDir, fileName))));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function datePart(value) {
  return String(value ?? "").slice(0, 10);
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compareDateTimesDescending(left, right) {
  return String(right ?? "").localeCompare(String(left ?? ""));
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
  );
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function readableOutlookName(outlook) {
  return outlook.name.replace(/ Outlook$/, "");
}

function getOutlookSnapshotPayload(outlook) {
  return compact({
    evidence_stage: outlook.evidence_stage,
    momentum: outlook.momentum,
    confidence: outlook.confidence,
    evidence_gap: outlook.main_evidence_gaps?.[0],
    strongest_evidence: outlook.strongest_current_evidence?.[0],
    lev_2036_outlook: outlook.lev_2036_outlook
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

function buildSnapshots(narrative, outlookById) {
  return collectNarrativeOutlookIds(narrative)
    .map((outlookId) => outlookById.get(outlookId))
    .filter(Boolean)
    .map(snapshotOutlook);
}

function fieldChanges(stored, current) {
  const fields = [
    "evidence_stage",
    "momentum",
    "confidence",
    "evidence_gap",
    "strongest_evidence",
    "lev_2036_outlook"
  ];

  return fields
    .filter((field) => (stored[field] ?? null) !== (current[field] ?? null))
    .map((field) => ({
      field,
      from: stored[field],
      to: current[field]
    }));
}

function scorePublicationEvent(event, outlookById) {
  const text = `${event.name ?? ""} ${event.summary ?? ""} ${event.change_note ?? ""}`.toLowerCase();
  const affectedOutlooks = (event.affected_outlook_ids ?? [])
    .map((outlookId) => outlookById.get(outlookId))
    .filter(Boolean);
  const targets = event.published_targets ?? [];
  let score = 0;
  const reasons = [];

  if (affectedOutlooks.some((outlook) => outlook.subject_type === "overall")) {
    score += 100;
    reasons.push("overall outlook");
  }

  if (affectedOutlooks.some((outlook) => outlook.subject_type === "hallmark")) {
    score += 70;
    reasons.push("hallmark outlook");
  }

  if (affectedOutlooks.some((outlook) => outlook.subject_type === "track")) {
    score += 45;
    reasons.push("track outlook");
  }

  if (targets.some((target) => target.record_type === "outlook")) {
    score += 45;
    reasons.push("outlook record");
  }

  if (targets.some((target) => target.record_type === "finding")) {
    score += 30;
    reasons.push("finding");
  }

  if (targets.some((target) => target.record_type === "study")) {
    score += 20;
    reasons.push("study");
  }

  if (targets.some((target) => target.record_type === "activity_item")) {
    score += 8;
    reasons.push("activity");
  }

  const keywordScores = [
    { pattern: /stage|evidence_stage/, score: 45, reason: "stage change" },
    { pattern: /confidence/, score: 40, reason: "read firmness change" },
    { pattern: /momentum/, score: 35, reason: "momentum change" },
    { pattern: /scenario|2036/, score: 45, reason: "scenario change" },
    { pattern: /human.*functional|functional.*human|6-minute|6mwt|mobility|frailty|exercise capacity/, score: 35, reason: "human function" },
    { pattern: /human/, score: 20, reason: "human evidence" },
    { pattern: /result|reported|posted|completed/, score: 25, reason: "result" },
    { pattern: /safety|adverse|null|negative|failed|terminated/, score: 25, reason: "safety or null signal" },
    { pattern: /trial|recruiting|registry/, score: 12, reason: "trial lane" },
    { pattern: /coverage repair|source completeness|branch boundaries/, score: 8, reason: "missing-context update" },
    { pattern: /funding|award|program/, score: 5, reason: "program activity" }
  ];

  for (const item of keywordScores) {
    if (item.pattern.test(text)) {
      score += item.score;
      reasons.push(item.reason);
    }
  }

  return {
    event,
    score,
    reasons: unique(reasons)
  };
}

function rankPublicationEvents(events, outlookById) {
  return events
    .map((event) => scorePublicationEvent(event, outlookById))
    .sort((left, right) => right.score - left.score || compareDateTimesDescending(left.event.published_at, right.event.published_at));
}

function applyPlainLanguage(text) {
  return plainLanguageReplacements.reduce((currentText, [from, to]) => {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return currentText.replace(new RegExp(escaped, "gi"), to);
  }, text);
}

function lintPlainLanguage(value, pathName = "$") {
  const findings = [];

  if (pathName.startsWith("$.revision.observed_outlook_states")) {
    return findings;
  }

  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();
    for (const rule of jargonRules) {
      if (lowerValue.includes(rule.term)) {
        findings.push({ path: pathName, term: rule.term, suggestion: rule.suggestion });
      }
    }
    return findings;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => lintPlainLanguage(item, `${pathName}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entryValue]) => lintPlainLanguage(entryValue, `${pathName}.${key}`));
  }

  return findings;
}

function plainRecentDevelopment(moment) {
  return {
    ...moment,
    label: applyPlainLanguage(moment.label),
    summary: applyPlainLanguage(moment.summary),
    impact_on_outlook: applyPlainLanguage(moment.impact_on_outlook)
  };
}

function plainItemToWatchNext(item) {
  return {
    ...item,
    label: applyPlainLanguage(item.label),
    summary: applyPlainLanguage(item.summary),
    what_to_look_for: applyPlainLanguage(item.what_to_look_for)
  };
}

function plainBetterEvidenceNeed(priority) {
  return {
    ...priority,
    label: applyPlainLanguage(priority.label),
    rationale: applyPlainLanguage(priority.rationale),
    what_better_evidence_would_show: applyPlainLanguage(priority.what_better_evidence_would_show)
  };
}

function plainStoryStep(step) {
  return {
    ...step,
    label: applyPlainLanguage(step.label),
    title: applyPlainLanguage(step.title),
    summary: applyPlainLanguage(step.summary)
  };
}

function plainOutlookChangeItem(item) {
  return {
    ...item,
    label: applyPlainLanguage(item.label),
    summary: applyPlainLanguage(item.summary)
  };
}

function plainTrackExampleToInspect(example) {
  return {
    ...example,
    label: applyPlainLanguage(example.label),
    title: applyPlainLanguage(example.title),
    summary: applyPlainLanguage(example.summary)
  };
}

function plainDraft(draft) {
  return {
    ...draft,
    title: applyPlainLanguage(draft.title),
    summary: applyPlainLanguage(draft.summary),
    current_evidence_picture: applyPlainLanguage(draft.current_evidence_picture),
    what_changed: applyPlainLanguage(draft.what_changed),
    before_now_next: draft.before_now_next.map(plainStoryStep),
    recent_developments: draft.recent_developments.map(plainRecentDevelopment),
    what_to_watch_next: draft.what_to_watch_next.map(plainItemToWatchNext),
    where_better_evidence_is_needed: draft.where_better_evidence_is_needed.map(plainBetterEvidenceNeed),
    what_would_change_the_outlook: draft.what_would_change_the_outlook.map(plainOutlookChangeItem),
    track_examples_to_inspect: draft.track_examples_to_inspect.map(plainTrackExampleToInspect)
  };
}

function analyzeNarrative({ narrative, outlooks, publicationEvents, stateOfFieldEditions, today }) {
  const outlookById = new Map(outlooks.map((outlook) => [outlook.id, outlook]));
  const latestPublicationEvent = publicationEvents[0];
  const latestOutlookEvent = publicationEvents.find((event) => event.affected_outlook_ids?.length);
  const latestStateOfField = stateOfFieldEditions[0];
  const watchedOutlookIds = collectNarrativeOutlookIds(narrative);
  const currentSnapshots = buildSnapshots(narrative, outlookById);
  const storedSnapshots = new Map(
    (narrative.revision.observed_outlook_states ?? []).map((snapshot) => [snapshot.outlook_id, snapshot])
  );
  const currentSnapshotById = new Map(currentSnapshots.map((snapshot) => [snapshot.outlook_id, snapshot]));
  const recentOutlookEvents = publicationEvents.filter(
    (event) => event.affected_outlook_ids?.length && datePart(event.published_at) > narrative.revision.last_reviewed
  );
  const rankedRecentOutlookEvents = rankPublicationEvents(recentOutlookEvents, outlookById);
  const changedOutlooks = watchedOutlookIds.flatMap((outlookId) => {
    const current = currentSnapshotById.get(outlookId);
    const stored = storedSnapshots.get(outlookId);

    if (!current) {
      return [
        {
          outlook_id: outlookId,
          name: outlookId,
          reason: "missing_current_outlook",
          changes: []
        }
      ];
    }

    if (!stored) {
      return [
        {
          outlook_id: outlookId,
          name: outlookById.has(outlookId) ? readableOutlookName(outlookById.get(outlookId)) : outlookId,
          reason: "missing_snapshot",
          changes: []
        }
      ];
    }

    if (stored.fingerprint === current.fingerprint) {
      return [];
    }

    return [
      {
        outlook_id: outlookId,
        name: outlookById.has(outlookId) ? readableOutlookName(outlookById.get(outlookId)) : outlookId,
        reason: "field_change",
        changes: fieldChanges(stored, current)
      }
    ];
  });
  const reasons = [];

  if (recentOutlookEvents.length > 0) {
    reasons.push(`${recentOutlookEvents.length} outlook-changing public update(s) are newer than the current story.`);
  }

  if (changedOutlooks.length > 0) {
    reasons.push(`${changedOutlooks.length} watched outlook snapshot(s) changed or are missing.`);
  }

  if (latestStateOfField && latestStateOfField.slug !== narrative.revision.observed_state_of_field_slug) {
    reasons.push(`Latest state-of-field edition is ${latestStateOfField.slug}, not the observed edition.`);
  }

  if (today > narrative.revision.review_due) {
    reasons.push(`Narrative review due date has passed (${narrative.revision.review_due}).`);
  }

  return {
    status: reasons.length > 0 ? "stale" : "current",
    reasons,
    watchedOutlookIds,
    currentSnapshots,
    changedOutlooks,
    recentOutlookEvents,
    rankedRecentOutlookEvents,
    latestPublicationEvent,
    latestOutlookEvent,
    latestStateOfField,
    outlookById
  };
}

function subjectFromEvent(event, outlookById) {
  const affectedOutlook = event.affected_outlook_ids?.[0] ? outlookById.get(event.affected_outlook_ids[0]) : undefined;

  return {
    subject_type: affectedOutlook?.subject_type ?? "overall",
    subject_id: affectedOutlook?.subject_id ?? "overall",
    related_outlook_ids: event.affected_outlook_ids ?? []
  };
}

function buildRecentDevelopments(narrative, analysis) {
  if (analysis.rankedRecentOutlookEvents.length === 0) {
    return narrative.recent_developments;
  }

  return analysis.rankedRecentOutlookEvents.slice(0, 3).map(({ event, score, reasons }) => {
    const subject = subjectFromEvent(event, analysis.outlookById);

    return {
      label: event.name.replace(/^Published /, ""),
      date: datePart(event.published_at),
      summary: event.summary ?? event.change_note ?? "A reviewed field update changed.",
      impact_on_outlook:
        score >= 100
          ? "This may affect the overall field read only if it changes human outcomes, safety, read firmness, or the main evidence gap."
          : "This matters only if it changes the strength or relevance of evidence; activity alone is not proof of LEV progress.",
      ...subject,
      related_publication_event_ids: [event.id]
    };
  });
}

function buildDraft({ narrative, overallOutlook, analysis, today, style }) {
  const latestStateOfField = analysis.latestStateOfField;
  const rankedEventNames = analysis.rankedRecentOutlookEvents
    .slice(0, 3)
    .map(({ event }) => event.name.replace(/^Published /, ""));
  const overallStage = stageLabels[overallOutlook.evidence_stage] ?? overallOutlook.evidence_stage;
  const overallMomentum = momentumLabels[overallOutlook.momentum] ?? overallOutlook.momentum;
  const overallReadFirmness = readFirmnessLabels[overallOutlook.confidence] ?? overallOutlook.confidence;
  const draft = JSON.parse(JSON.stringify(narrative));

  draft.date = today;

  if (analysis.status === "stale") {
    draft.title =
      analysis.changedOutlooks.some((item) => item.outlook_id === overallOutlook.id)
        ? `The field now reads as ${overallStage}`
        : "Field activity changed; the LEV proof gap needs checking";
    draft.summary = latestStateOfField
      ? `${latestStateOfField.summary} The important question is whether the evidence makes LEV look closer, or only clarifies where evidence remains thin.`
      : `The overall field read is ${overallStage}, with ${overallMomentum} momentum and a ${overallReadFirmness} read. The important question is whether recent evidence makes LEV look closer.`;
    draft.current_evidence_picture = `The overall field read is ${overallStage}, with ${overallMomentum} momentum and a ${overallReadFirmness} read. The main evidence gap remains: ${overallOutlook.main_evidence_gaps?.[0] ?? "the field still needs stronger human evidence."}`;
    draft.what_changed =
      rankedEventNames.length > 0
        ? `Recent field updates include: ${rankedEventNames.join("; ")}. Their importance depends on whether they change human outcomes, safety, read firmness, or the main evidence gap; more activity by itself is not progress toward LEV.`
        : `The field story needs a scheduled recheck because ${analysis.reasons.join(" ")}`;
    draft.recent_developments = buildRecentDevelopments(narrative, analysis);
  }

  draft.revision = {
    ...draft.revision,
    last_reviewed: today,
    review_reason:
      analysis.status === "stale"
        ? `Generated draft after current LEV story staleness check: ${analysis.reasons.join(" ")}`
        : "Generated draft confirmed the current LEV story against observed public outlook snapshots.",
    review_due: addDays(today, 30),
    observed_state_of_field_slug: latestStateOfField?.slug,
    observed_latest_publication_event_id: analysis.latestPublicationEvent?.id,
    observed_outlook_states: analysis.currentSnapshots
  };
  draft.related_state_of_field_slug = latestStateOfField?.slug ?? draft.related_state_of_field_slug;
  draft.related_publication_event_ids =
    analysis.recentOutlookEvents.length > 0
      ? analysis.recentOutlookEvents.map((event) => event.id)
      : draft.related_publication_event_ids;
  draft.related_outlook_ids = unique([
    ...(draft.related_outlook_ids ?? []),
    ...analysis.recentOutlookEvents.flatMap((event) => event.affected_outlook_ids ?? [])
  ]);

  return style === "plain" ? plainDraft(draft) : draft;
}

function formatStatus({ narrative, analysis }) {
  const lines = [
    `Current LEV story status: ${analysis.status}`,
    `Last reviewed: ${narrative.revision.last_reviewed}`,
    `Review due: ${narrative.revision.review_due}`,
    `Watched outlooks: ${analysis.watchedOutlookIds.length}`,
    `Changed or missing snapshots: ${analysis.changedOutlooks.length}`,
    `New outlook-changing public updates: ${analysis.recentOutlookEvents.length}`
  ];

  if (analysis.reasons.length > 0) {
    lines.push("", "Reasons:");
    lines.push(...analysis.reasons.map((reason) => `- ${reason}`));
  }

  if (analysis.changedOutlooks.length > 0) {
    lines.push("", "Outlook snapshot changes:");
    for (const item of analysis.changedOutlooks) {
      lines.push(`- ${item.name} (${item.outlook_id}): ${item.reason}`);
      for (const change of item.changes) {
        lines.push(`  ${change.field}: ${change.from ?? "(empty)"} -> ${change.to ?? "(empty)"}`);
      }
    }
  }

  if (analysis.recentOutlookEvents.length > 0) {
    lines.push("", "Ranked outlook-changing public updates:");
    for (const { event, score, reasons } of analysis.rankedRecentOutlookEvents.slice(0, 5)) {
      lines.push(`- ${datePart(event.published_at)} ${event.name} [score ${score}: ${reasons.join(", ")}]`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatDraftMarkdown(draft, analysis, style) {
  const jargonFindings = style === "plain" ? lintPlainLanguage(draft) : [];
  const lines = [
    "# Current LEV Story Draft",
    "",
    `Status: ${analysis.status}`,
    `Style: ${style}`,
    `Generated for review: ${draft.date}`,
    "",
    "## Homepage Story",
    "",
    `Title: ${draft.title}`,
    "",
    draft.summary,
    "",
    "## Where We Are Now",
    "",
    draft.current_evidence_picture,
    "",
    "## What Changed Recently",
    "",
    draft.what_changed,
    "",
    "## Review Reasons",
    ""
  ];

  if (analysis.reasons.length === 0) {
    lines.push("- No staleness reasons detected.");
  } else {
    lines.push(...analysis.reasons.map((reason) => `- ${reason}`));
  }

  lines.push("", "## Recent Developments", "");
  lines.push(...draft.recent_developments.map((item) => `- ${item.label}: ${item.impact_on_outlook}`));

  lines.push("", "## Before / Now / Next", "");
  lines.push(...draft.before_now_next.map((item) => `- ${item.label} / ${item.title}: ${item.summary}`));

  lines.push("", "## What Would Change Our Mind", "");
  lines.push(...draft.what_would_change_the_outlook.map((item) => `- ${item.label}: ${item.summary}`));

  lines.push("", "## Concrete Examples", "");
  lines.push(...draft.track_examples_to_inspect.map((item) => `- ${item.title}: ${item.summary} (${item.href})`));

  lines.push("", "## Ranked Changes", "");
  if (analysis.rankedRecentOutlookEvents.length === 0) {
    lines.push("- No newer outlook-changing public updates.");
  } else {
    lines.push(
      ...analysis.rankedRecentOutlookEvents
        .slice(0, 8)
        .map(({ event, score, reasons }) => `- ${score}: ${event.name} (${reasons.join(", ")})`)
    );
  }

  if (style === "plain") {
    lines.push("", "## Plain-Language Warnings", "");
    if (jargonFindings.length === 0) {
      lines.push("- No tracked jargon terms found.");
    } else {
      lines.push(
        ...jargonFindings
          .slice(0, 20)
          .map((finding) => `- ${finding.path}: "${finding.term}" -> consider "${finding.suggestion}"`)
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

async function loadInputs(options) {
  const [narrative, outlooks, publicationEvents, stateOfFieldEditions] = await Promise.all([
    readJson(currentLevStoryPath),
    readCollection(outlookRoot),
    readCollection(publicationEventRoot),
    readCollection(stateOfFieldRoot)
  ]);
  const sortedEvents = publicationEvents.sort((left, right) =>
    compareDateTimesDescending(left.published_at, right.published_at)
  );
  const sortedEditions = stateOfFieldEditions.sort((left, right) => right.date.localeCompare(left.date));
  const analysis = analyzeNarrative({
    narrative,
    outlooks,
    publicationEvents: sortedEvents,
    stateOfFieldEditions: sortedEditions,
    today: options.today
  });
  const overallOutlook = outlooks.find((outlook) => outlook.subject_type === "overall");

  if (!overallOutlook) {
    throw new Error("Missing overall outlook.");
  }

  return { narrative, overallOutlook, analysis };
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  const { narrative, overallOutlook, analysis } = await loadInputs(options);

  if (command === "status") {
    process.stdout.write(formatStatus({ narrative, analysis }));
    return;
  }

  if (command === "snapshot") {
    if (options.writeCurrent) {
      const updatedNarrative = {
        ...narrative,
        revision: {
          ...narrative.revision,
          observed_state_of_field_slug: analysis.latestStateOfField?.slug,
          observed_latest_publication_event_id: analysis.latestPublicationEvent?.id,
          observed_outlook_states: analysis.currentSnapshots
        }
      };

      await writeJson(currentLevStoryPath, updatedNarrative);
      process.stdout.write(`Updated ${currentLevStoryPath} with ${analysis.currentSnapshots.length} outlook snapshot(s).\n`);
      return;
    }

    process.stdout.write(`${JSON.stringify(analysis.currentSnapshots, null, 2)}\n`);
    return;
  }

  if (command === "draft") {
    const draft = buildDraft({ narrative, overallOutlook, analysis, today: options.today, style: options.style });

    if (options.write) {
      await writeJson(draftJsonPath, draft);
      await writeText(draftMarkdownPath, formatDraftMarkdown(draft, analysis, options.style));
      process.stdout.write(`Wrote ${draftJsonPath} and ${draftMarkdownPath}.\n`);
      return;
    }

    process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
    return;
  }

  process.stderr.write(`${usage()}\n`);
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
