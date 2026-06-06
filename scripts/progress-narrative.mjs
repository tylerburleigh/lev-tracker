#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const narrativePath = "data/content/progress-narrative/current.json";
const stateOfFieldRoot = "data/content/state-of-the-field";
const outlookRoot = "data/outlooks";
const publicationEventRoot = "data/publication-events";
const draftJsonPath = "extra/progress-narrative-draft.json";
const draftMarkdownPath = "extra/progress-narrative-draft.md";

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

const confidenceLabels = {
  low: "low confidence",
  moderate: "moderate confidence",
  high: "high confidence"
};

const draftStyles = new Set(["plain", "technical"]);

const plainLanguageReplacements = [
  ["mechanistic plausibility", "biological plausibility"],
  ["replicated aging-directed human functional benefit", "repeated human studies showing that people function better for longer"],
  ["aging-directed human functional benefit", "human evidence that people function better for longer"],
  ["human functional benefit", "signs that people function better"],
  ["human-facing signals", "early signs in people"],
  ["human-facing entries", "human evidence entries"],
  ["disease-outcome", "disease-result"],
  ["trial-watch", "trials to watch"],
  ["target-engagement", "evidence that the intervention changed its intended target"],
  ["pathway engagement", "evidence that the intervention changed its intended biological target"],
  ["support map", "evidence map"],
  ["support maps", "evidence maps"],
  ["branch boundaries", "which claims are in scope and which are not"],
  ["forecast upgrade", "reason to be more optimistic"],
  ["forecast movement", "reason to be more or less optimistic"],
  ["outlook-affecting", "outlook-changing"],
  ["source completeness", "missing source context"],
  ["coverage repair", "missing-context update"],
  ["coverage repairs", "missing-context updates"],
  ["coverage-repair", "missing-context"],
  ["baseline coverage", "first-pass public summaries"],
  ["baseline outlooks", "first-pass outlooks"],
  ["seeded tracks", "research tracks"],
  ["inspectable map", "clearer map"],
  ["durable", "long-lasting"],
  ["biomarker-heavy", "mostly based on biomarkers"],
  ["low-confidence", "still uncertain"],
  ["low confidence", "low confidence"],
  ["directness", "relevance to aging"],
  ["human-adjacent", "near human evidence, but not direct proof in people"],
  ["translational", "moving toward useful human results"],
  ["translation gaps", "gaps between lab work and useful human results"],
  ["translation", "moving from lab work to useful human results"],
  ["mechanistic", "based on biology"]
];

const jargonRules = [
  { term: "human-facing", suggestion: "early signs in people" },
  { term: "coverage repair", suggestion: "missing-context update" },
  { term: "support map", suggestion: "evidence map" },
  { term: "branch boundaries", suggestion: "which claims are in scope and which are not" },
  { term: "forecast upgrade", suggestion: "reason to be more optimistic" },
  { term: "forecast movement", suggestion: "reason to be more or less optimistic" },
  { term: "aging-directed", suggestion: "about aging itself" },
  { term: "functional benefit", suggestion: "people function better" },
  { term: "trial-watch", suggestion: "trials to watch" },
  { term: "biomarker-heavy", suggestion: "mostly based on biomarkers" },
  { term: "directness", suggestion: "relevance to aging" },
  { term: "baseline coverage", suggestion: "first-pass public summary" },
  { term: "seeded tracks", suggestion: "research tracks" },
  { term: "durable", suggestion: "long-lasting" },
  { term: "human-adjacent", suggestion: "near human evidence, but not direct proof in people" },
  { term: "translational", suggestion: "moving toward useful human results" },
  { term: "translation", suggestion: "moving from lab work to useful human results" },
  { term: "pathway engagement", suggestion: "evidence that the intervention changed its intended biological target" },
  { term: "mechanistic", suggestion: "based on biology" }
];

function usage() {
  return `Usage:
  npm run narrative:progress -- status [--today YYYY-MM-DD]
  npm run narrative:progress -- draft [--write] [--style plain|technical] [--today YYYY-MM-DD]
  npm run narrative:progress -- snapshot [--write-current]

Commands:
  status    Report whether the current public narrative needs review.
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
    current_stage: outlook.current_stage,
    momentum: outlook.momentum,
    confidence: outlook.confidence,
    blocker: outlook.main_blockers?.[0],
    best_signal: outlook.best_current_signals?.[0],
    scenario_2036_status: outlook.scenario_2036_status
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
    ...narrative.progress_moments.flatMap((item) => item.related_outlook_ids ?? []),
    ...narrative.watchlist.flatMap((item) => item.related_outlook_ids ?? []),
    ...narrative.focus_priorities.flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.change_mind_items ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...(narrative.spotlight_examples ?? []).flatMap((item) => item.related_outlook_ids ?? []),
    ...narrative.revision.triggers.flatMap((item) => item.related_outlook_ids ?? [])
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
    "current_stage",
    "momentum",
    "confidence",
    "blocker",
    "best_signal",
    "scenario_2036_status"
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
    { pattern: /stage|current_stage/, score: 45, reason: "stage change" },
    { pattern: /confidence/, score: 40, reason: "confidence change" },
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

function plainProgressMoment(moment) {
  return {
    ...moment,
    label: applyPlainLanguage(moment.label),
    summary: applyPlainLanguage(moment.summary),
    impact_on_outlook: applyPlainLanguage(moment.impact_on_outlook)
  };
}

function plainWatchItem(item) {
  return {
    ...item,
    label: applyPlainLanguage(item.label),
    summary: applyPlainLanguage(item.summary),
    signal_to_watch: applyPlainLanguage(item.signal_to_watch)
  };
}

function plainFocusPriority(priority) {
  return {
    ...priority,
    label: applyPlainLanguage(priority.label),
    rationale: applyPlainLanguage(priority.rationale),
    next_useful_work: applyPlainLanguage(priority.next_useful_work)
  };
}

function plainJourneyStep(step) {
  return {
    ...step,
    label: applyPlainLanguage(step.label),
    title: applyPlainLanguage(step.title),
    summary: applyPlainLanguage(step.summary)
  };
}

function plainChangeMindItem(item) {
  return {
    ...item,
    label: applyPlainLanguage(item.label),
    summary: applyPlainLanguage(item.summary)
  };
}

function plainSpotlightExample(example) {
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
    where_we_are_now: applyPlainLanguage(draft.where_we_are_now),
    what_changed_recently: applyPlainLanguage(draft.what_changed_recently),
    journey_steps: draft.journey_steps.map(plainJourneyStep),
    progress_moments: draft.progress_moments.map(plainProgressMoment),
    watchlist: draft.watchlist.map(plainWatchItem),
    focus_priorities: draft.focus_priorities.map(plainFocusPriority),
    change_mind_items: draft.change_mind_items.map(plainChangeMindItem),
    spotlight_examples: draft.spotlight_examples.map(plainSpotlightExample)
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
    reasons.push(`${recentOutlookEvents.length} outlook-affecting publication event(s) are newer than the narrative.`);
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

function buildProgressMoments(narrative, analysis) {
  if (analysis.rankedRecentOutlookEvents.length === 0) {
    return narrative.progress_moments;
  }

  return analysis.rankedRecentOutlookEvents.slice(0, 3).map(({ event, score, reasons }) => {
    const subject = subjectFromEvent(event, analysis.outlookById);

    return {
      label: event.name.replace(/^Published /, ""),
      date: datePart(event.published_at),
      summary: event.summary ?? event.change_note ?? "A reviewed public record changed.",
      impact_on_outlook:
        event.change_note ??
        `This ranked ${score} for narrative review because it touched ${reasons.join(", ")}.`,
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
  const overallStage = stageLabels[overallOutlook.current_stage] ?? overallOutlook.current_stage;
  const overallMomentum = momentumLabels[overallOutlook.momentum] ?? overallOutlook.momentum;
  const overallConfidence = confidenceLabels[overallOutlook.confidence] ?? overallOutlook.confidence;
  const draft = JSON.parse(JSON.stringify(narrative));

  draft.date = today;

  if (analysis.status === "stale") {
    draft.title =
      analysis.changedOutlooks.some((item) => item.outlook_id === overallOutlook.id)
        ? `Overall outlook reviewed at ${overallStage}`
        : "Public activity changed; the LEV bottleneck needs review";
    draft.summary = latestStateOfField
      ? `${latestStateOfField.summary} Editorial review should decide whether this changes the public story or only updates the support map.`
      : `The overall outlook is ${overallStage} with ${overallMomentum} momentum and ${overallConfidence}. Editorial review should decide whether recent public activity changes the story.`;
    draft.where_we_are_now = `The overall public outlook is ${overallStage}, with ${overallMomentum} momentum and ${overallConfidence}. The main blocker remains: ${overallOutlook.main_blockers?.[0] ?? "review required."}`;
    draft.what_changed_recently =
      rankedEventNames.length > 0
        ? `Since the last narrative review, the most story-relevant public changes are: ${rankedEventNames.join("; ")}. Review these changes before treating them as forecast movement.`
        : `No newer outlook-affecting publication events were found, but the narrative still needs review because ${analysis.reasons.join(" ")}`;
    draft.progress_moments = buildProgressMoments(narrative, analysis);
  }

  draft.revision = {
    ...draft.revision,
    last_reviewed: today,
    review_reason:
      analysis.status === "stale"
        ? `Generated draft after narrative staleness check: ${analysis.reasons.join(" ")}`
        : "Generated draft confirmed the current narrative against observed public outlook snapshots.",
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
    `Progress narrative status: ${analysis.status}`,
    `Last reviewed: ${narrative.revision.last_reviewed}`,
    `Review due: ${narrative.revision.review_due}`,
    `Watched outlooks: ${analysis.watchedOutlookIds.length}`,
    `Changed or missing snapshots: ${analysis.changedOutlooks.length}`,
    `New outlook-affecting publication events: ${analysis.recentOutlookEvents.length}`
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
    lines.push("", "Ranked outlook-affecting events:");
    for (const { event, score, reasons } of analysis.rankedRecentOutlookEvents.slice(0, 5)) {
      lines.push(`- ${datePart(event.published_at)} ${event.name} [score ${score}: ${reasons.join(", ")}]`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatDraftMarkdown(draft, analysis, style) {
  const jargonFindings = style === "plain" ? lintPlainLanguage(draft) : [];
  const lines = [
    "# Progress Narrative Draft",
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
    draft.where_we_are_now,
    "",
    "## What Changed Recently",
    "",
    draft.what_changed_recently,
    "",
    "## Review Reasons",
    ""
  ];

  if (analysis.reasons.length === 0) {
    lines.push("- No staleness reasons detected.");
  } else {
    lines.push(...analysis.reasons.map((reason) => `- ${reason}`));
  }

  lines.push("", "## Progress Moments", "");
  lines.push(...draft.progress_moments.map((item) => `- ${item.label}: ${item.impact_on_outlook}`));

  lines.push("", "## Journey", "");
  lines.push(...draft.journey_steps.map((item) => `- ${item.label} / ${item.title}: ${item.summary}`));

  lines.push("", "## What Would Change Our Mind", "");
  lines.push(...draft.change_mind_items.map((item) => `- ${item.label}: ${item.summary}`));

  lines.push("", "## Concrete Examples", "");
  lines.push(...draft.spotlight_examples.map((item) => `- ${item.title}: ${item.summary} (${item.href})`));

  lines.push("", "## Ranked Changes", "");
  if (analysis.rankedRecentOutlookEvents.length === 0) {
    lines.push("- No newer outlook-changing publication events.");
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
    readJson(narrativePath),
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

      await writeJson(narrativePath, updatedNarrative);
      process.stdout.write(`Updated ${narrativePath} with ${analysis.currentSnapshots.length} outlook snapshot(s).\n`);
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
