import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  computeHallmarkInsightFreshness,
  datePart,
  isAfterDate
} from "./editorial-freshness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const terminalBundleStatuses = new Set(["published", "rejected"]);

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readTextIfExists(relativePath) {
  const filePath = path.join(repoRoot, relativePath);

  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function pathExists(relativePath) {
  const filePath = path.join(repoRoot, relativePath);

  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function writeJson(relativePath, value) {
  const filePath = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readCollection(relativePath) {
  const directoryPath = path.join(repoRoot, relativePath);

  try {
    const fileNames = (await fs.readdir(directoryPath))
      .filter((name) => name.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(fileNames.map((name) => readJson(path.join(relativePath, name))));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
  );
}

function monthPart(value) {
  return datePart(value)?.slice(0, 7);
}

function timestampValue(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestBy(records, accessor) {
  return records
    .filter((record) => accessor(record))
    .sort((left, right) => timestampValue(accessor(right)) - timestampValue(accessor(left)))[0];
}

function buildStatusByTrack(coverageStatus) {
  return new Map(coverageStatus.tracks.map((track) => [track.track_id, track]));
}

function describeTrack(entry, statusByTrack) {
  const row = statusByTrack.get(entry.track_id);
  return row?.name ?? entry.track_id;
}

function buildQueueReference(entry) {
  return compactObject({
    track_id: entry.track_id,
    hallmark_id: entry.hallmark_id,
    references: [
      {
        record_type: "track",
        record_id: entry.track_id
      },
      {
        record_type: "hallmark",
        record_id: entry.hallmark_id
      }
    ]
  });
}

function buildEditorialItems(activeBundles) {
  return activeBundles.map((bundle) => {
    const isPublishReady = bundle.lifecycle_status === "approved";
    const isRevision = bundle.lifecycle_status === "needs_revision";
    const mode = isPublishReady ? "publish" : "editorial_review";
    const title = isPublishReady
      ? `Publish approved staged update ${bundle.id}`
      : isRevision
        ? `Revise staged update ${bundle.id}`
        : `Review active staged update ${bundle.id}`;

    return compactObject({
      item_id: `${mode}-${bundle.id}`,
      mode,
      domain: "editorial",
      priority_tier: "now",
      status: "ready",
      title,
      rationale: `Staged update ${bundle.id} is ${bundle.lifecycle_status}, so editorial work takes precedence over new research.`,
      default_action: isPublishReady
        ? "Run the publication checklist and publish if promotion checks pass."
        : "Open the admin review workflow, inspect evidence reviews and staged records, then approve, revise, or reject.",
      candidate_bundle_id: bundle.id,
      runbook_path: isPublishReady ? "docs/publication-checklist.md" : "docs/admin-review.md",
      command: `npm run research:bundle -- validate --bundle ${bundle.id}`,
      source_paths: [
        "data/candidate-bundles",
        isPublishReady ? "docs/publication-checklist.md" : "docs/admin-review.md"
      ],
      references: [
        {
          record_type: "candidate_bundle",
          record_id: bundle.id
        }
      ],
      signals: [
        {
          name: "lifecycle_status",
          value: bundle.lifecycle_status
        },
        {
          name: "proposed_change_count",
          value: bundle.proposed_changes?.length ?? 0
        }
      ]
    });
  });
}

function buildEditorialRollupItem({
  publicationEvents,
  stateOfFieldEditions,
  hallmarkInsights,
  outlooks,
  statusByTrack,
  siteShellText,
  hasOutlookRoute
}) {
  const meaningfulPublicationEvents = publicationEvents
    .filter((event) => (event.affected_outlook_ids?.length ?? 0) > 0)
    .sort((left, right) => timestampValue(right.published_at) - timestampValue(left.published_at));
  const latestAffectedPublicationEvent = meaningfulPublicationEvents[0];
  const latestStateOfFieldEdition = latestBy(stateOfFieldEditions, (edition) => edition.date);
  const latestStateOfFieldDate = latestStateOfFieldEdition?.date;
  const overallOutlook = outlooks.find((outlook) => outlook.subject_type === "overall");
  const latestNonOverallOutlook = latestBy(
    outlooks.filter((outlook) => outlook.subject_type !== "overall"),
    (outlook) => outlook.last_updated
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const hasCurrentMonthStateOfField = stateOfFieldEditions.some(
    (edition) => monthPart(edition.date) === currentMonth || edition.slug === currentMonth
  );
  const hasCurrentMonthPublicationActivity = meaningfulPublicationEvents.some(
    (event) => monthPart(event.published_at) === currentMonth
  );
  const hallmarkInsightFreshness = computeHallmarkInsightFreshness({
    hallmarkInsights,
    outlooks,
    publicationEvents,
    statusByTrack,
    afterDate: latestStateOfFieldDate
  });
  const staleHallmarkInsightIds = hallmarkInsightFreshness.stale.map((row) => row.hallmarkId);
  const outlookMethodSurfaceGap = siteShellText.includes('label: "Forecast"') && !hasOutlookRoute;
  const triggerMessages = [
    latestAffectedPublicationEvent &&
    isAfterDate(latestAffectedPublicationEvent.published_at, latestStateOfFieldDate)
      ? `Latest affected public update ${latestAffectedPublicationEvent.id} is newer than the latest state-of-field edition.`
      : undefined,
    overallOutlook &&
    latestNonOverallOutlook &&
    isAfterDate(latestNonOverallOutlook.last_updated, overallOutlook.last_updated)
      ? `Overall outlook last_updated ${overallOutlook.last_updated} is older than the latest hallmark or track outlook change ${latestNonOverallOutlook.last_updated}.`
      : undefined,
    hasCurrentMonthPublicationActivity && !hasCurrentMonthStateOfField
      ? `No ${currentMonth} state-of-field edition exists after current-month publication activity.`
      : undefined,
    staleHallmarkInsightIds.length > 0
      ? `${staleHallmarkInsightIds.length} hallmark insight(s) are unreviewed or older than affected outlook changes.`
      : undefined,
    outlookMethodSurfaceGap
      ? "The shell presents Forecast as a public surface instead of a clearer outlook method surface."
      : undefined
  ].filter(Boolean);

  if (triggerMessages.length === 0) {
    return undefined;
  }

  return compactObject({
    item_id: "editorial-rollup-public-summary-surfaces",
    mode: "editorial_rollup",
    domain: "editorial",
    priority_tier: "now",
    status: "ready",
    title: "Review public editorial rollup surfaces",
    rationale: triggerMessages.join(" "),
    default_action:
      "Review overall outlook, state-of-field edition, hallmark insight copy, and outlook method links; update public content only when the reviewed record warrants it.",
    runbook_path: "docs/editorial-rollup.md",
    source_paths: [
      "data/publication-events",
      "data/outlooks",
      "data/content/state-of-the-field",
      "data/content/hallmark-insights.json",
      "src/components/site-shell.tsx",
      "docs/editorial-rollup.md"
    ],
    references: [
      latestAffectedPublicationEvent
        ? {
            record_type: "publication_event",
            record_id: latestAffectedPublicationEvent.id
          }
        : undefined,
      overallOutlook
        ? {
            record_type: "outlook",
            record_id: overallOutlook.id
          }
        : undefined
    ].filter(Boolean),
    signals: [
      {
        name: "trigger_count",
        value: triggerMessages.length
      },
      {
        name: "latest_affected_publication_event_id",
        value: latestAffectedPublicationEvent?.id ?? "none"
      },
      {
        name: "latest_affected_publication_event_date",
        value: datePart(latestAffectedPublicationEvent?.published_at) ?? "none"
      },
      {
        name: "latest_state_of_field_date",
        value: latestStateOfFieldDate ?? "none"
      },
      {
        name: "overall_outlook_last_updated",
        value: overallOutlook?.last_updated ?? "none"
      },
      {
        name: "latest_non_overall_outlook_updated",
        value: latestNonOverallOutlook?.last_updated ?? "none"
      },
      {
        name: "stale_hallmark_insight_count",
        value: staleHallmarkInsightIds.length
      },
      {
        name: "first_stale_hallmark_insight_id",
        value: staleHallmarkInsightIds[0] ?? "none"
      },
      {
        name: "no_current_month_state_of_field",
        value: hasCurrentMonthPublicationActivity && !hasCurrentMonthStateOfField
      },
      {
        name: "outlook_method_surface_gap",
        value: outlookMethodSurfaceGap
      }
    ]
  });
}

function buildStateOfFieldWorkflowItems(stateOfFieldWorkflow) {
  const activeStatuses = new Set(["draft", "reconciling", "needs_surveillance", "in_review", "blocked"]);

  return (stateOfFieldWorkflow.editions ?? [])
    .filter((edition) => activeStatuses.has(edition.status))
    .map((edition) => {
      const openReconciliationItems = (edition.reconciliation_items ?? []).filter(
        (item) => item.decision === "needs_decision"
      );
      const openChecklistItems = (edition.checklist ?? []).filter((item) =>
        ["pending", "in_progress", "blocked"].includes(item.status)
      );

      return compactObject({
        item_id: `state-of-field-${edition.slug}`,
        mode: "editorial_rollup",
        domain: "editorial",
        priority_tier: "now",
        status: edition.status === "blocked" ? "blocked" : "active",
        title: `Resolve State of the Field workflow for ${edition.period_label}`,
        rationale: `${edition.status_note} ${openReconciliationItems.length} reconciliation decision(s) and ${openChecklistItems.length} checklist item(s) remain open.`,
        default_action: edition.required_next_action,
        runbook_path: "docs/editorial-rollup.md",
        command: "npm run state-of-field:status -- --strict",
        source_paths: [
          "ops/state-of-field-workflow.v1.json",
          edition.published_edition_path,
          "data/content/current-lev-story/current.json",
          "docs/editorial-rollup.md"
        ],
        references: openReconciliationItems.map((item) => ({
          record_type: "publication_event",
          record_id: item.publication_event_id
        })),
        signals: [
          {
            name: "workflow_status",
            value: edition.status
          },
          {
            name: "open_reconciliation_decision_count",
            value: openReconciliationItems.length
          },
          {
            name: "open_checklist_item_count",
            value: openChecklistItems.length
          },
          {
            name: "latest_observed_public_update",
            value: edition.observed_public_story.latest_publication_event_id
          }
        ]
      });
    });
}

function buildBootstrapItems(bootstrapQueue, statusByTrack) {
  return bootstrapQueue.slice(0, 3).map((entry) =>
    compactObject({
      item_id: `bootstrap-${entry.track_id}`,
      mode: "bootstrap",
      domain: "research",
      priority_tier: entry.priority_tier,
      status: "ready",
      title: `Baseline review for ${describeTrack(entry, statusByTrack)}`,
      rationale: entry.rationale,
      default_action: "Run one track-level baseline review and stage an update only if a public baseline can be supported.",
      ...buildQueueReference(entry),
      runbook_path: "docs/research-ops-state.md",
      source_paths: [
        "research/backlog/track-priority.v1.json",
        "research/state/coverage-status.v1.json",
        "docs/research-ops-state.md"
      ],
      signals: [
        {
          name: "generated_queue_rank",
          value: entry.rank
        }
      ]
    })
  );
}

function buildCoverageRepairItems(coverageRepairQueue, statusByTrack) {
  return coverageRepairQueue.slice(0, 3).map((entry) =>
    compactObject({
      item_id: `coverage-repair-${entry.track_id}`,
      mode: "coverage_repair",
      domain: "research",
      priority_tier: entry.priority_tier,
      status: "ready",
      title: `Repair coverage for ${describeTrack(entry, statusByTrack)}`,
      rationale: entry.rationale,
      default_action: "Run a coverage-repair pass against the latest assessment gaps; update public records only if the repair changes public boundaries.",
      ...buildQueueReference(entry),
      runbook_path: "docs/coverage-assessment.md",
      source_paths: [
        "research/backlog/track-priority.v1.json",
        "research/state/coverage-status.v1.json",
        "research/coverage-assessments",
        "docs/coverage-assessment.md"
      ],
      signals: [
        {
          name: "generated_queue_rank",
          value: entry.rank
        }
      ]
    })
  );
}

function buildSurveillanceItem(surveillanceQueue, statusByTrack) {
  const entry = surveillanceQueue[0];
  if (!entry) {
    return undefined;
  }

  const row = statusByTrack.get(entry.track_id);

  return compactObject({
    item_id: `surveillance-${entry.track_id}`,
    mode: "surveillance",
    domain: "research",
    priority_tier: "now",
    status: "ready",
    title: `Run field change check for ${describeTrack(entry, statusByTrack)}`,
    rationale: entry.rationale,
    default_action: "Run one track-level field change check, record materiality, excluded sources, and a session; create a staged update only for a material public change.",
    ...buildQueueReference(entry),
    runbook_path: "docs/surveillance-checklist.md",
    source_paths: [
      "research/backlog/track-priority.v1.json",
      "research/state/coverage-status.v1.json",
      "docs/surveillance-checklist.md"
    ],
    signals: [
      {
        name: "generated_queue_rank",
        value: entry.rank
      },
      {
        name: "surveillance_freshness_status",
        value: row?.surveillance_freshness_status ?? "unknown"
      },
      {
        name: "last_surveillance_mode",
        value: row?.last_surveillance_mode ?? "none"
      },
      {
        name: "last_surveillance_at",
        value: row?.last_surveillance_at ?? "never"
      },
      {
        name: "surveillance_due_at",
        value: row?.surveillance_due_at ?? "now"
      },
      {
        name: "has_coverage_assessment",
        value: Boolean(row?.last_coverage_assessment_id)
      }
    ]
  });
}

function buildCoverageBackfillItem(surveillanceQueue, statusByTrack) {
  const backfillCandidate = surveillanceQueue.find((entry) => {
    const row = statusByTrack.get(entry.track_id);
    return row?.coverage_status === "baseline" && !row.last_coverage_assessment_id;
  });

  if (!backfillCandidate) {
    return undefined;
  }

  const row = statusByTrack.get(backfillCandidate.track_id);
  const backlogCount = [...statusByTrack.values()].filter(
    (track) => track.coverage_status === "baseline" && !track.last_coverage_assessment_id
  ).length;

  return compactObject({
    item_id: `coverage-assessment-backfill-${backfillCandidate.track_id}`,
    mode: "coverage_assessment_backfill",
    domain: "research",
    priority_tier: "soon",
    status: "ready",
    title: `Backfill coverage assessment for ${describeTrack(backfillCandidate, statusByTrack)}`,
    rationale: `${backlogCount} published baseline track(s) still lack internal coverage assessments; this is the highest-ranked unassessed track in the field-change queue.`,
    default_action: "Review the published outlook, session, staged update, evidence reviews, and public update, then create a coverage assessment without changing public records.",
    ...buildQueueReference(backfillCandidate),
    runbook_path: "docs/coverage-assessment.md",
    source_paths: [
      "research/backlog/track-priority.v1.json",
      "research/state/coverage-status.v1.json",
      "docs/coverage-assessment.md"
    ],
    signals: [
      {
        name: "coverage_assessment_backlog_count",
        value: backlogCount
      },
      {
        name: "generated_surveillance_queue_rank",
        value: backfillCandidate.rank
      },
      {
        name: "track_next_mode",
        value: row?.next_mode ?? "unknown"
      }
    ]
  });
}

function collectReferencedInterventions(recordsByType) {
  const refs = new Map();
  const addRef = (interventionId) => {
    if (!interventionId) {
      return;
    }
    refs.set(interventionId, (refs.get(interventionId) ?? 0) + 1);
  };

  for (const record of recordsByType.findings) {
    for (const interventionId of record.intervention_ids ?? []) {
      addRef(interventionId);
    }
  }

  for (const record of recordsByType.studies) {
    for (const interventionId of record.intervention_ids ?? []) {
      addRef(interventionId);
    }
  }

  for (const record of recordsByType.activityItems) {
    for (const interventionId of record.intervention_ids ?? []) {
      addRef(interventionId);
    }
  }

  for (const record of recordsByType.outlooks) {
    if (record.subject_type === "intervention") {
      addRef(record.subject_id);
    }
  }

  return refs;
}

function summarizeMissingInterventions(recordsByType) {
  const knownInterventionIds = new Set(recordsByType.interventions.map((record) => record.id));
  const referencedInterventions = collectReferencedInterventions(recordsByType);
  const missingEntries = [...referencedInterventions.entries()]
    .filter(([interventionId]) => !knownInterventionIds.has(interventionId))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  return {
    missingIdCount: missingEntries.length,
    missingReferenceCount: missingEntries.reduce((total, [, count]) => total + count, 0),
    topMissingIds: missingEntries.slice(0, 8).map(([id, count]) => ({ id, count }))
  };
}

function buildDataNormalizationItem(missingInterventions) {
  if (missingInterventions.missingIdCount === 0) {
    return undefined;
  }

  return {
    item_id: "data-normalization-intervention-refs",
    mode: "data_normalization",
    domain: "data",
    priority_tier: "soon",
    status: "ready",
    title: `Normalize ${missingInterventions.missingIdCount} intervention ID(s)`,
    rationale: `${missingInterventions.missingReferenceCount} live reference(s) point to non-normalized intervention IDs. The data audit treats this as non-blocking, but it remains the main known data-hardening backlog.`,
    default_action: "Continue the intervention-normalization backlog in small reviewed batches, then rerun audit and planning sync.",
    runbook_path: "docs/intervention-normalization.md",
    command: "npm run audit:data",
    source_paths: [
      "docs/intervention-normalization.md",
      "scripts/audit-data-integrity.mjs"
    ],
    signals: [
      {
        name: "missing_intervention_id_count",
        value: missingInterventions.missingIdCount
      },
      {
        name: "missing_intervention_reference_count",
        value: missingInterventions.missingReferenceCount
      },
      ...missingInterventions.topMissingIds.map((entry) => ({
        name: `missing_intervention:${entry.id}`,
        value: entry.count
      }))
    ]
  };
}

function rankWorkItems(items) {
  return items
    .filter(Boolean)
    .map((item, index) => ({
      rank: index + 1,
      ...item
    }));
}

async function main() {
  const [
    coverageStatus,
    priorityQueue,
    bundles,
    interventions,
    findings,
    studies,
    activityItems,
    outlooks,
    publicationEvents,
    stateOfFieldEditions,
    stateOfFieldWorkflow,
    hallmarkInsights,
    siteShellText,
    hasOutlookRoute
  ] = await Promise.all([
    readJson("research/state/coverage-status.v1.json"),
    readJson("research/backlog/track-priority.v1.json"),
    readCollection("data/candidate-bundles"),
    readCollection("data/interventions"),
    readCollection("data/findings"),
    readCollection("data/studies"),
    readCollection("data/activity-items"),
    readCollection("data/outlooks"),
    readCollection("data/publication-events"),
    readCollection("data/content/state-of-the-field"),
    readJson("ops/state-of-field-workflow.v1.json"),
    readJson("data/content/hallmark-insights.json"),
    readTextIfExists("src/components/site-shell.tsx"),
    pathExists("src/app/outlook/page.tsx")
  ]);

  const statusByTrack = buildStatusByTrack(coverageStatus);
  const activeBundles = bundles
    .filter((bundle) => !terminalBundleStatuses.has(bundle.lifecycle_status))
    .sort((left, right) => left.submitted_at.localeCompare(right.submitted_at));
  const missingInterventions = summarizeMissingInterventions({
    interventions,
    findings,
    studies,
    activityItems,
    outlooks
  });
  const coverageAssessmentBacklogCount = coverageStatus.tracks.filter(
    (track) => track.coverage_status === "baseline" && !track.last_coverage_assessment_id
  ).length;

  const editorialItems = buildEditorialItems(activeBundles);
  const stateOfFieldWorkflowItems = buildStateOfFieldWorkflowItems(stateOfFieldWorkflow);
  const editorialRollupItem = buildEditorialRollupItem({
    publicationEvents,
    stateOfFieldEditions,
    hallmarkInsights,
    outlooks,
    statusByTrack,
    siteShellText,
    hasOutlookRoute
  });
  const bootstrapItems = buildBootstrapItems(priorityQueue.bootstrap_queue, statusByTrack);
  const coverageRepairItems = buildCoverageRepairItems(priorityQueue.coverage_repair_queue, statusByTrack);
  const surveillanceItem = buildSurveillanceItem(priorityQueue.surveillance_queue, statusByTrack);
  const coverageBackfillItem = buildCoverageBackfillItem(
    [...priorityQueue.surveillance_queue, ...(priorityQueue.surveillance_recent_queue ?? [])],
    statusByTrack
  );
  const dataNormalizationItem = buildDataNormalizationItem(missingInterventions);

  const workItems = rankWorkItems([
    ...editorialItems,
    ...stateOfFieldWorkflowItems,
    editorialRollupItem,
    ...bootstrapItems,
    ...coverageRepairItems,
    surveillanceItem,
    coverageBackfillItem,
    dataNormalizationItem
  ]);
  const topItem = workItems[0];

  const triageState = {
    schema_version: "1.0.0",
    state_type: "work_triage",
    generated_at: new Date().toISOString(),
    source_state: {
      research_coverage_status_updated_at: coverageStatus.updated_at,
      research_priority_queue_updated_at: priorityQueue.updated_at,
      active_candidate_bundle_count: activeBundles.length,
      bootstrap_queue_count: priorityQueue.bootstrap_queue.length,
      surveillance_queue_count: priorityQueue.surveillance_queue.length,
      surveillance_recent_queue_count: priorityQueue.surveillance_recent_queue?.length ?? 0,
      coverage_repair_queue_count: priorityQueue.coverage_repair_queue.length,
      coverage_assessment_backlog_count: coverageAssessmentBacklogCount,
      unnormalized_intervention_id_count: missingInterventions.missingIdCount,
      unnormalized_intervention_reference_count: missingInterventions.missingReferenceCount
    },
    selection_policy: {
      default_instruction: "When the user asks what to work on, consult rank 1 first and state the assumption before acting.",
      when_user_asks_whats_next: "Summarize the top ranked item plus any active editorial blockers or data-hardening warnings.",
      when_user_says_go: "Proceed with rank 1 unless the user has named a different mode, track, bundle, or priority.",
      priority_order: [
        "publish",
        "editorial_review",
        "editorial_rollup",
        "bootstrap",
        "coverage_repair",
        "surveillance",
        "coverage_assessment_backfill",
        "data_normalization",
        "schema_hardening",
        "docs_sync",
        "app_surface_check"
      ]
    },
    summary: {
      top_work_item_id: topItem?.item_id ?? null,
      top_mode: topItem?.mode ?? null,
      active_editorial_count: editorialItems.length + stateOfFieldWorkflowItems.length + (editorialRollupItem ? 1 : 0),
      ready_research_count:
        priorityQueue.bootstrap_queue.length +
        priorityQueue.surveillance_queue.length +
        priorityQueue.coverage_repair_queue.length,
      data_hardening_count: missingInterventions.missingIdCount > 0 ? 1 : 0,
      notes: [
        "Roadmap remains narrative context; this file is the operational dispatcher.",
        `${priorityQueue.surveillance_recent_queue?.length ?? 0} surveillance track(s) are hidden from ordinary rotation until their cooldown expires.`,
        ...(topItem ? [] : ["No ready operational work items are currently queued."])
      ]
    },
    work_items: workItems
  };

  await writeJson("ops/triage-state.v1.json", triageState);
}

await main();
