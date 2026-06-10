import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const surveillanceCooldownDays = 14;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
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

function buildDefaultQuestion(trackName, mode) {
  if (mode === "bootstrap") {
    return `What is the current human-relevant evidence landscape for ${trackName}, and what belongs in the first public baseline?`;
  }

  if (mode === "coverage_repair") {
    return `Which known source-completeness gaps for ${trackName} need repair, and does resolving them change the coverage verdict or public boundaries?`;
  }

  return `What changed for ${trackName} since the last meaningful review or publication, and does any change justify a public update?`;
}

function buildBootstrapPhase(track, hasBaselineTrack) {
  if (!hasBaselineTrack && track.canonical_order === 1) {
    return "anchor-uncovered-hallmarks";
  }

  if (hasBaselineTrack && track.canonical_order === 1) {
    return "anchor-covered-hallmarks";
  }

  if (!hasBaselineTrack) {
    return "expand-uncovered-hallmarks";
  }

  return "expand-covered-hallmarks";
}

function buildBootstrapRationale(track, hasBaselineTrack) {
  if (!hasBaselineTrack && track.canonical_order === 1) {
    return "Anchor track for a hallmark that still lacks any track-level baseline.";
  }

  if (hasBaselineTrack && track.canonical_order === 1) {
    return "First canonical track for a hallmark that already has partial coverage through another approach.";
  }

  if (!hasBaselineTrack) {
    return "Follow-on track for a hallmark that still needs broader internal coverage after its anchor track.";
  }

  return "Extend a hallmark that already has one public track so the hallmark view does not overfit a single approach.";
}

function normalizeDateTimeValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
}

function compareDateTimesDescending(left, right) {
  return normalizeDateTimeValue(right).localeCompare(normalizeDateTimeValue(left));
}

function isMoreRecent(left, right) {
  return normalizeDateTimeValue(left).localeCompare(normalizeDateTimeValue(right)) > 0;
}

function timestampValue(value) {
  const parsed = Date.parse(normalizeDateTimeValue(value ?? ""));
  return Number.isNaN(parsed) ? undefined : parsed;
}

function addDaysIso(value, days) {
  const timestamp = timestampValue(value);
  if (timestamp === undefined) {
    return undefined;
  }

  return new Date(timestamp + days * millisecondsPerDay).toISOString();
}

function ageInDays(value, now) {
  const timestamp = timestampValue(value);
  if (timestamp === undefined) {
    return undefined;
  }

  return Math.max(0, Math.floor((now.getTime() - timestamp) / millisecondsPerDay));
}

function buildSurveillanceFreshness(latestSurveillanceSession, now) {
  if (!latestSurveillanceSession?.completed_at) {
    return {
      status: "never_checked"
    };
  }

  const dueAt = addDaysIso(latestSurveillanceSession.completed_at, surveillanceCooldownDays);
  const dueTimestamp = timestampValue(dueAt);
  return {
    status: dueTimestamp !== undefined && dueTimestamp <= now.getTime() ? "due" : "recent",
    dueAt,
    ageDays: ageInDays(latestSurveillanceSession.completed_at, now)
  };
}

function chooseNextMode(latestSession, latestCoverageAssessment, hasPublishedBaseline) {
  const fallbackMode = hasPublishedBaseline ? "surveillance" : "bootstrap";
  const sessionMode = latestSession?.next_recommended_mode;
  const coverageMode = latestCoverageAssessment?.next_recommended_mode;

  if (sessionMode && coverageMode) {
    return isMoreRecent(latestCoverageAssessment.assessed_at, latestSession.completed_at)
      ? coverageMode
      : sessionMode;
  }

  return coverageMode ?? sessionMode ?? fallbackMode;
}

async function main() {
  const now = new Date();
  const hallmarksTaxonomy = await readJson("taxonomies/hallmarks-of-aging.v1.json");
  const trackTaxonomy = await readJson("taxonomies/track-taxonomy.v1.json");
  const [outlooks, bundles, publicationEvents, sessions, coverageAssessments] = await Promise.all([
    readCollection("data/outlooks"),
    readCollection("data/candidate-bundles"),
    readCollection("data/publication-events"),
    readCollection("research/sessions"),
    readCollection("research/coverage-assessments")
  ]);

  const trackOutlookByTrackId = new Map(
    outlooks
      .filter((outlook) => outlook.subject_type === "track")
      .map((outlook) => [outlook.subject_id, outlook.id])
  );

  const latestBundleByTrackId = new Map();
  for (const bundle of bundles.sort((left, right) => compareDateTimesDescending(left.submitted_at, right.submitted_at))) {
    for (const trackId of bundle.scope?.track_ids ?? []) {
      if (!latestBundleByTrackId.has(trackId)) {
        latestBundleByTrackId.set(trackId, bundle);
      }
    }
  }

  const latestSessionByTrackId = new Map();
  for (const session of sessions.sort((left, right) => compareDateTimesDescending(left.completed_at, right.completed_at))) {
    for (const trackId of session.scope?.track_ids ?? []) {
      if (!latestSessionByTrackId.has(trackId)) {
        latestSessionByTrackId.set(trackId, session);
      }
    }
  }

  const latestSurveillanceSessionByTrackId = new Map();
  for (const session of sessions
    .filter((session) => ["surveillance", "coverage_repair"].includes(session.mode) && session.outcome !== "blocked")
    .sort((left, right) => compareDateTimesDescending(left.completed_at, right.completed_at))) {
    for (const trackId of session.scope?.track_ids ?? []) {
      if (!latestSurveillanceSessionByTrackId.has(trackId)) {
        latestSurveillanceSessionByTrackId.set(trackId, session);
      }
    }
  }

  const latestCoverageAssessmentByTrackId = new Map();
  for (const assessment of coverageAssessments.sort((left, right) =>
    compareDateTimesDescending(left.assessed_at, right.assessed_at)
  )) {
    if (!latestCoverageAssessmentByTrackId.has(assessment.track_id)) {
      latestCoverageAssessmentByTrackId.set(assessment.track_id, assessment);
    }
  }

  const bundleById = new Map(bundles.map((bundle) => [bundle.id, bundle]));
  const latestPublicationByTrackId = new Map();
  for (const event of publicationEvents.sort((left, right) => compareDateTimesDescending(left.published_at, right.published_at))) {
    const bundle = bundleById.get(event.candidate_bundle_id);
    for (const trackId of bundle?.scope?.track_ids ?? []) {
      if (!latestPublicationByTrackId.has(trackId)) {
        latestPublicationByTrackId.set(trackId, event);
      }
    }
  }

  const hallmarkMetaById = new Map(
    hallmarksTaxonomy.hallmarks.map((hallmark) => [hallmark.id, hallmark])
  );

  const trackRows = trackTaxonomy.hallmark_groups.flatMap((group) =>
    group.tracks.map((track) => {
      const latestBundle = latestBundleByTrackId.get(track.id);
      const latestSession = latestSessionByTrackId.get(track.id);
      const latestSurveillanceSession = latestSurveillanceSessionByTrackId.get(track.id);
      const latestCoverageAssessment = latestCoverageAssessmentByTrackId.get(track.id);
      const latestPublication = latestPublicationByTrackId.get(track.id);
      const hasTrackOutlook = trackOutlookByTrackId.has(track.id);
      const hasPublishedBaseline =
        hasTrackOutlook || latestBundle?.lifecycle_status === "published" || Boolean(latestPublication);
      const activeReview =
        latestBundle && !["published", "rejected"].includes(latestBundle.lifecycle_status);
      const coverageStatus = hasPublishedBaseline ? "baseline" : "not_started";
      const nextMode = chooseNextMode(latestSession, latestCoverageAssessment, hasPublishedBaseline);
      const queueState =
        activeReview ? "active_review" : latestSession?.outcome === "blocked" ? "deferred" : "ready";
      const surveillanceFreshness = buildSurveillanceFreshness(latestSurveillanceSession, now);

      let notes;
      if (activeReview) {
        notes = `Staged update ${latestBundle.id} is still ${latestBundle.lifecycle_status}.`;
      } else if (
        latestPublication &&
        (!latestSession || isMoreRecent(latestPublication.published_at, latestSession.completed_at))
      ) {
        notes = `Latest public update: ${latestPublication.id}.`;
      } else if (latestSession) {
        notes = `Latest ${latestSession.mode} session ${latestSession.id} ended as ${latestSession.outcome}.`;
      } else if (latestBundle?.lifecycle_status === "published") {
        notes = `Latest published staged update: ${latestBundle.id}.`;
      } else if (hasTrackOutlook) {
        notes = "Public track outlook exists without staged-update history in the local queue.";
      } else {
        notes = "No track-level public baseline has been reviewed yet.";
      }

      return {
        track_id: track.id,
        hallmark_id: group.hallmark_id,
        canonical_order: track.canonical_order,
        name: track.name,
        coverage_status: coverageStatus,
        next_mode: nextMode,
        queue_state: queueState,
        last_session_id: latestSession?.id,
        last_session_at: latestSession?.completed_at,
        last_session_mode: latestSession?.mode,
        last_session_outcome: latestSession?.outcome,
        last_surveillance_session_id: latestSurveillanceSession?.id,
        last_surveillance_at: latestSurveillanceSession?.completed_at,
        last_surveillance_mode: latestSurveillanceSession?.mode,
        last_surveillance_outcome: latestSurveillanceSession?.outcome,
        surveillance_freshness_status: hasPublishedBaseline ? surveillanceFreshness.status : undefined,
        surveillance_due_at: surveillanceFreshness.dueAt,
        surveillance_age_days: surveillanceFreshness.ageDays,
        last_candidate_bundle_id: latestBundle?.id,
        last_candidate_bundle_status: latestBundle?.lifecycle_status,
        last_publication_event_id: latestPublication?.id,
        last_published_at: latestPublication?.published_at,
        last_coverage_assessment_id: latestCoverageAssessment?.id,
        last_coverage_assessed_at: latestCoverageAssessment?.assessed_at,
        coverage_verdict: latestCoverageAssessment?.coverage_verdict,
        known_gap_count: latestCoverageAssessment?.known_gaps?.length,
        high_priority_gap_count: latestCoverageAssessment?.known_gaps?.filter((gap) => gap.priority === "high").length,
        next_coverage_action: latestCoverageAssessment?.next_coverage_action,
        last_coverage_recommended_mode: latestCoverageAssessment?.next_recommended_mode,
        default_research_question: buildDefaultQuestion(track.name, nextMode),
        notes
      };
    })
  );

  const baselineTrackCountByHallmark = new Map();
  for (const row of trackRows) {
    if (row.coverage_status !== "not_started") {
      baselineTrackCountByHallmark.set(
        row.hallmark_id,
        (baselineTrackCountByHallmark.get(row.hallmark_id) ?? 0) + 1
      );
    }
  }

  const bootstrapCandidates = [...trackRows]
    .filter((row) => row.next_mode === "bootstrap")
    .sort((left, right) => {
      const leftHasBaselineTrack = (baselineTrackCountByHallmark.get(left.hallmark_id) ?? 0) > 0;
      const rightHasBaselineTrack = (baselineTrackCountByHallmark.get(right.hallmark_id) ?? 0) > 0;

      const leftGroup =
        !leftHasBaselineTrack && left.canonical_order === 1
          ? 0
          : leftHasBaselineTrack && left.canonical_order === 1
            ? 1
            : !leftHasBaselineTrack
              ? 2
              : 3;
      const rightGroup =
        !rightHasBaselineTrack && right.canonical_order === 1
          ? 0
          : rightHasBaselineTrack && right.canonical_order === 1
            ? 1
            : !rightHasBaselineTrack
              ? 2
              : 3;

      if (leftGroup !== rightGroup) {
        return leftGroup - rightGroup;
      }

      const leftHallmarkOrder = hallmarkMetaById.get(left.hallmark_id).canonical_order;
      const rightHallmarkOrder = hallmarkMetaById.get(right.hallmark_id).canonical_order;

      if (Boolean(left.last_session_at) !== Boolean(right.last_session_at)) {
        return left.last_session_at ? 1 : -1;
      }

      if (left.last_session_at && right.last_session_at && left.last_session_at !== right.last_session_at) {
        return compareDateTimesDescending(left.last_session_at, right.last_session_at);
      }

      if (left.canonical_order !== right.canonical_order) {
        return left.canonical_order - right.canonical_order;
      }

      return leftHallmarkOrder - rightHallmarkOrder;
    })
    .map((row, index) => {
      const hasBaselineTrack = (baselineTrackCountByHallmark.get(row.hallmark_id) ?? 0) > 0;
      const rank = index + 1;
      return {
        rank,
        phase_id: buildBootstrapPhase(row, hasBaselineTrack),
        track_id: row.track_id,
        hallmark_id: row.hallmark_id,
        priority_tier: rank <= 8 ? "now" : rank <= 18 ? "soon" : "later",
        default_mode: "bootstrap",
        rationale: buildBootstrapRationale(row, hasBaselineTrack),
        default_question: row.default_research_question
      };
    });

  const surveillancePriority = [
    "immune-rejuvenation",
    "rapalogs",
    "senolytics",
    "mitophagy-enhancers",
    "microbiome-composition-modulation"
  ];
  const surveillanceRationale = {
    "immune-rejuvenation": "Human-functional endpoints make delta review relatively legible and high value.",
    rapalogs: "High public interest and recurring trial context make this track worth regular delta checks.",
    senolytics: "This is a visible public track where mixed signals and endpoint discipline need regular maintenance.",
    "mitophagy-enhancers": "The track is thin and likely to move through contextual updates before stronger human evidence.",
    "microbiome-composition-modulation": "This area changes quickly and needs regular sorting of activity versus evidence."
  };

  const surveillanceCandidates = [...trackRows]
    .filter((row) => row.next_mode === "surveillance" && row.queue_state === "ready")
    .sort((left, right) => {
      const freshnessRank = {
        never_checked: 0,
        due: 1,
        recent: 2
      };
      const leftFreshnessRank = freshnessRank[left.surveillance_freshness_status] ?? 3;
      const rightFreshnessRank = freshnessRank[right.surveillance_freshness_status] ?? 3;
      if (leftFreshnessRank !== rightFreshnessRank) {
        return leftFreshnessRank - rightFreshnessRank;
      }

      const leftIndex = surveillancePriority.indexOf(left.track_id);
      const rightIndex = surveillancePriority.indexOf(right.track_id);

      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) {
          return 1;
        }
        if (rightIndex === -1) {
          return -1;
        }
        return leftIndex - rightIndex;
      }

      if (left.surveillance_due_at && right.surveillance_due_at && left.surveillance_due_at !== right.surveillance_due_at) {
        return left.surveillance_due_at.localeCompare(right.surveillance_due_at);
      }

      const leftHallmarkOrder = hallmarkMetaById.get(left.hallmark_id).canonical_order;
      const rightHallmarkOrder = hallmarkMetaById.get(right.hallmark_id).canonical_order;
      return leftHallmarkOrder - rightHallmarkOrder || left.canonical_order - right.canonical_order;
    })
    .map((row) => ({
      row,
      entry: {
        phase_id: "surveillance-rotation",
        track_id: row.track_id,
        hallmark_id: row.hallmark_id,
        default_mode: "surveillance",
        freshness_status: row.surveillance_freshness_status,
        last_reviewed_at: row.last_surveillance_at,
        next_due_at: row.surveillance_due_at,
        cooldown_days: surveillanceCooldownDays,
        rationale:
          surveillanceRationale[row.track_id] ??
          "Established public baseline exists, so this track should be monitored for meaningful deltas.",
        default_question: row.default_research_question
      }
    }));

  const dueSurveillanceCandidates = surveillanceCandidates
    .filter(({ row }) => row.surveillance_freshness_status !== "recent")
    .map(({ entry }, index) => ({
      rank: index + 1,
      ...entry,
      priority_tier: index < 3 ? "now" : index < 5 ? "soon" : "later"
    }));

  const recentSurveillanceCandidates = surveillanceCandidates
    .filter(({ row }) => row.surveillance_freshness_status === "recent")
    .map(({ entry }, index) => ({
      rank: index + 1,
      ...entry,
      priority_tier: "later",
      notes: entry.next_due_at
        ? `Recently handled; ordinary rotation is due after ${entry.next_due_at.slice(0, 10)}.`
        : "Recently handled; ordinary rotation is not due yet."
    }));

  const coverageRepairCandidates = [...trackRows]
    .filter((row) => row.next_mode === "coverage_repair" && row.queue_state === "ready")
    .sort((left, right) => {
      const highPriorityGapDifference =
        (right.high_priority_gap_count ?? 0) - (left.high_priority_gap_count ?? 0);
      if (highPriorityGapDifference !== 0) {
        return highPriorityGapDifference;
      }

      const knownGapDifference = (right.known_gap_count ?? 0) - (left.known_gap_count ?? 0);
      if (knownGapDifference !== 0) {
        return knownGapDifference;
      }

      const leftAssessedAt = left.last_coverage_assessed_at ?? left.last_session_at ?? left.last_published_at;
      const rightAssessedAt = right.last_coverage_assessed_at ?? right.last_session_at ?? right.last_published_at;
      if (leftAssessedAt && rightAssessedAt && leftAssessedAt !== rightAssessedAt) {
        return compareDateTimesDescending(rightAssessedAt, leftAssessedAt);
      }

      const leftHallmarkOrder = hallmarkMetaById.get(left.hallmark_id).canonical_order;
      const rightHallmarkOrder = hallmarkMetaById.get(right.hallmark_id).canonical_order;
      return leftHallmarkOrder - rightHallmarkOrder || left.canonical_order - right.canonical_order;
    })
    .map((row, index) => ({
      rank: index + 1,
      phase_id: "coverage-repair",
      track_id: row.track_id,
      hallmark_id: row.hallmark_id,
      priority_tier: index < 3 ? "now" : index < 8 ? "soon" : "later",
      default_mode: "coverage_repair",
      rationale:
        row.next_coverage_action ??
        (row.last_coverage_assessment_id
          ? "Latest coverage assessment recommends source-completeness repair before an ordinary field change check."
          : "Latest research session recommends source-completeness repair before an ordinary field change check."),
      default_question: row.default_research_question,
      notes: row.last_coverage_assessment_id
        ? `Latest coverage assessment: ${row.last_coverage_assessment_id}.`
        : row.last_session_id
          ? `Latest session: ${row.last_session_id}.`
          : undefined
    }));

  const nextPriorityTrackIdByHallmark = new Map();
  for (const entry of [...bootstrapCandidates, ...coverageRepairCandidates, ...dueSurveillanceCandidates]) {
    if (!nextPriorityTrackIdByHallmark.has(entry.hallmark_id)) {
      nextPriorityTrackIdByHallmark.set(entry.hallmark_id, entry.track_id);
    }
  }

  const hallmarkRows = hallmarksTaxonomy.hallmarks.map((hallmark) => {
    const trackedPublicOutlookCount = baselineTrackCountByHallmark.get(hallmark.id) ?? 0;
    const hallmarkBootstrapStatus = trackedPublicOutlookCount > 0 ? "baseline" : "stubbed";
    return {
      hallmark_id: hallmark.id,
      canonical_order: hallmark.canonical_order,
      hallmark_bootstrap_status: hallmarkBootstrapStatus,
      tracked_public_outlook_count: trackedPublicOutlookCount,
      next_priority_track_id:
        nextPriorityTrackIdByHallmark.get(hallmark.id) ??
        trackTaxonomy.hallmark_groups.find((group) => group.hallmark_id === hallmark.id).tracks[0].id,
      notes:
        trackedPublicOutlookCount > 0
          ? "At least one track-level public baseline exists."
          : "Hallmark outlook exists, but track-level coverage has not started."
    };
  });

  const coverageStatus = {
    schema_version: "1.0.0",
    state_type: "coverage_status",
    track_taxonomy_version: trackTaxonomy.taxonomy_version,
    updated_at: new Date().toISOString(),
    notes: [
      "The unit of research work is a track, not a hallmark.",
      "One baseline-review, field-change, or coverage-repair run should cover one track unless the user explicitly narrows further.",
      "Coverage status is planning state, not a claim about scientific maturity."
    ],
    selection_policy: {
      default_unit: "track",
      max_tracks_per_bootstrap_run: 1,
      max_tracks_per_surveillance_run: 1,
      max_tracks_per_coverage_repair_run: 1,
      surveillance_cooldown_days: surveillanceCooldownDays,
      when_request_is_vague: "Choose the highest-priority ready track from the matching queue and state the assumption.",
      when_request_is_too_broad: "Push back and decompose the request to one track-level pass.",
      when_only_hallmark_is_named: "Choose the highest-priority track within that hallmark, or ask the user to pick one if there is no clear anchor."
    },
    hallmarks: hallmarkRows,
    tracks: trackRows.map((row) => {
      const output = { ...row };
      for (const optionalKey of [
        "last_session_id",
        "last_session_at",
        "last_session_mode",
        "last_session_outcome",
        "last_surveillance_session_id",
        "last_surveillance_at",
        "last_surveillance_mode",
        "last_surveillance_outcome",
        "surveillance_freshness_status",
        "surveillance_due_at",
        "surveillance_age_days",
        "last_candidate_bundle_id",
        "last_candidate_bundle_status",
        "last_publication_event_id",
        "last_published_at",
        "last_coverage_assessment_id",
        "last_coverage_assessed_at",
        "coverage_verdict",
        "known_gap_count",
        "high_priority_gap_count",
        "next_coverage_action",
        "last_coverage_recommended_mode"
      ]) {
        if (output[optionalKey] === undefined || output[optionalKey] === null) {
          delete output[optionalKey];
        }
      }
      return output;
    })
  };

  const priorityQueue = {
    schema_version: "1.0.0",
    queue_type: "track_priority_queue",
    track_taxonomy_version: trackTaxonomy.taxonomy_version,
    updated_at: new Date().toISOString(),
    notes: [
      "Baseline-review priority is front-loaded toward one anchor track per uncovered hallmark.",
      "Field-change priority applies only to tracks that already have a public baseline and no active staged update.",
      "Ordinary field-change rotation suppresses tracks with a successful surveillance or coverage-repair pass inside the cooldown window.",
      "Coverage-repair priority applies when the latest coverage assessment recommends repairing source-completeness gaps before an ordinary field change check.",
      "The queue is a curator planning tool, not a public outlook."
    ],
    selection_policy: {
      default_unit: "track",
      when_request_is_vague: "Choose the highest-priority ready track from the queue matching the requested mode.",
      when_request_is_too_broad: "Refuse field-wide scope and decompose to one track.",
      when_only_hallmark_is_named: "Choose the highest-ranked track in that hallmark from the requested mode queue.",
      surveillance_cooldown_days: surveillanceCooldownDays
    },
    bootstrap_defaults: {
      stop_after: [
        "A first public baseline can be written without pretending the track is deeper than it is.",
        "The pass supports either a no-op, an activity-only update, or one track-level outlook update.",
        "Scope begins to spill beyond one track or intervention family."
      ]
    },
    surveillance_defaults: {
      stop_after: [
        "The delta window has been checked and either nothing material changed or one bounded update is ready.",
        "The evidence stays in activity-only territory and does not justify outlook movement.",
        "The pass begins to broaden into fresh baseline research and should be handed back to baseline review instead."
      ]
    },
    coverage_repair_defaults: {
      stop_after: [
        "The known source-completeness gaps named in the latest coverage assessment have been checked.",
        "The coverage verdict, known gaps, and next coverage action can be updated without changing public claims.",
        "New evidence materially changes the outlook and should move into a bounded field change check or outlook-refresh staged update."
      ]
    },
    phases: [
      {
        phase_id: "anchor-uncovered-hallmarks",
        label: "Anchor Uncovered Hallmarks",
        goal: "Give each uncovered hallmark one track-level baseline before expanding breadth."
      },
      {
        phase_id: "anchor-covered-hallmarks",
        label: "Anchor Covered Hallmarks",
        goal: "Fill the first canonical track in hallmarks where coverage started through a different approach."
      },
      {
        phase_id: "expand-uncovered-hallmarks",
        label: "Expand Uncovered Hallmarks",
        goal: "Broaden hallmarks that still need more than one track to avoid a one-track view."
      },
      {
        phase_id: "expand-covered-hallmarks",
        label: "Expand Covered Hallmarks",
        goal: "Add breadth to hallmarks that already have at least one baseline track."
      },
      {
        phase_id: "surveillance-rotation",
        label: "Field Change Rotation",
        goal: "Revisit established tracks for meaningful changes without redoing full baseline research."
      },
      {
        phase_id: "coverage-repair",
        label: "Coverage Repair",
        goal: "Repair known source-completeness gaps without treating historical completeness work as an ordinary field change check."
      }
    ],
    bootstrap_queue: bootstrapCandidates,
    surveillance_queue: dueSurveillanceCandidates,
    surveillance_recent_queue: recentSurveillanceCandidates,
    coverage_repair_queue: coverageRepairCandidates.map((entry) => {
      const output = { ...entry };
      if (output.notes === undefined || output.notes === null) {
        delete output.notes;
      }
      return output;
    })
  };

  await writeJson("research/state/coverage-status.v1.json", coverageStatus);
  await writeJson("research/backlog/track-priority.v1.json", priorityQueue);
}

await main();
