import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

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

async function main() {
  const hallmarksTaxonomy = await readJson("taxonomies/hallmarks-of-aging.v1.json");
  const trackTaxonomy = await readJson("taxonomies/track-taxonomy.v1.json");
  const [outlooks, bundles, publicationEvents, sessions] = await Promise.all([
    readCollection("data/outlooks"),
    readCollection("data/candidate-bundles"),
    readCollection("data/publication-events"),
    readCollection("research/sessions")
  ]);

  const trackOutlookByTrackId = new Map(
    outlooks
      .filter((outlook) => outlook.subject_type === "track")
      .map((outlook) => [outlook.subject_id, outlook.id])
  );

  const latestBundleByTrackId = new Map();
  for (const bundle of bundles.sort((left, right) => right.submitted_at.localeCompare(left.submitted_at))) {
    for (const trackId of bundle.scope?.track_ids ?? []) {
      if (!latestBundleByTrackId.has(trackId)) {
        latestBundleByTrackId.set(trackId, bundle);
      }
    }
  }

  const latestSessionByTrackId = new Map();
  for (const session of sessions.sort((left, right) => right.completed_at.localeCompare(left.completed_at))) {
    for (const trackId of session.scope?.track_ids ?? []) {
      if (!latestSessionByTrackId.has(trackId)) {
        latestSessionByTrackId.set(trackId, session);
      }
    }
  }

  const bundleById = new Map(bundles.map((bundle) => [bundle.id, bundle]));
  const latestPublicationByTrackId = new Map();
  for (const event of publicationEvents.sort((left, right) => right.published_at.localeCompare(left.published_at))) {
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
      const latestPublication = latestPublicationByTrackId.get(track.id);
      const hasTrackOutlook = trackOutlookByTrackId.has(track.id);
      const activeReview =
        latestBundle && !["published", "rejected"].includes(latestBundle.lifecycle_status);
      const coverageStatus = hasTrackOutlook ? "baseline" : "not_started";
      const nextMode =
        latestSession?.next_recommended_mode ?? (hasTrackOutlook ? "surveillance" : "bootstrap");
      const queueState =
        activeReview ? "active_review" : latestSession?.outcome === "blocked" ? "deferred" : "ready";

      let notes;
      if (activeReview) {
        notes = `Candidate bundle ${latestBundle.id} is still ${latestBundle.lifecycle_status}.`;
      } else if (latestSession) {
        notes = `Latest ${latestSession.mode} session ${latestSession.id} ended as ${latestSession.outcome}.`;
      } else if (latestPublication) {
        notes = `Latest publication event: ${latestPublication.id}.`;
      } else if (latestBundle?.lifecycle_status === "published") {
        notes = `Latest published bundle: ${latestBundle.id}.`;
      } else if (hasTrackOutlook) {
        notes = "Public track outlook exists without bundle history in the local queue.";
      } else {
        notes = "No track-level public baseline has been bootstrapped yet.";
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
        last_candidate_bundle_id: latestBundle?.id,
        last_candidate_bundle_status: latestBundle?.lifecycle_status,
        last_publication_event_id: latestPublication?.id,
        last_published_at: latestPublication?.published_at,
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
        return left.last_session_at.localeCompare(right.last_session_at);
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
      if (Boolean(left.last_session_at || left.last_published_at) !== Boolean(right.last_session_at || right.last_published_at)) {
        return left.last_session_at || left.last_published_at ? 1 : -1;
      }

      const leftRecency = left.last_session_at ?? left.last_published_at;
      const rightRecency = right.last_session_at ?? right.last_published_at;

      if (leftRecency && rightRecency && leftRecency !== rightRecency) {
        return leftRecency.localeCompare(rightRecency);
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

      const leftHallmarkOrder = hallmarkMetaById.get(left.hallmark_id).canonical_order;
      const rightHallmarkOrder = hallmarkMetaById.get(right.hallmark_id).canonical_order;
      return leftHallmarkOrder - rightHallmarkOrder || left.canonical_order - right.canonical_order;
    })
    .map((row, index) => ({
      rank: index + 1,
      phase_id: "surveillance-rotation",
      track_id: row.track_id,
      hallmark_id: row.hallmark_id,
      priority_tier: index < 3 ? "now" : index < 5 ? "soon" : "later",
      default_mode: "surveillance",
      rationale:
        surveillanceRationale[row.track_id] ??
        "Established public baseline exists, so this track should be monitored for meaningful deltas.",
      default_question: row.default_research_question
    }));

  const nextPriorityTrackIdByHallmark = new Map();
  for (const entry of [...bootstrapCandidates, ...surveillanceCandidates]) {
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
      "One bootstrap or surveillance run should cover one track unless the user explicitly narrows further.",
      "Coverage status is planning state, not a claim about scientific maturity."
    ],
    selection_policy: {
      default_unit: "track",
      max_tracks_per_bootstrap_run: 1,
      max_tracks_per_surveillance_run: 1,
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
        "last_candidate_bundle_id",
        "last_candidate_bundle_status",
        "last_publication_event_id",
        "last_published_at"
      ]) {
        if (!output[optionalKey]) {
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
      "Bootstrap priority is front-loaded toward one anchor track per uncovered hallmark.",
      "Surveillance priority applies only to tracks that already have a public baseline and no active review bundle.",
      "The queue is a curator planning tool, not a public forecast."
    ],
    selection_policy: {
      default_unit: "track",
      when_request_is_vague: "Choose the highest-priority ready track from the queue matching the requested mode.",
      when_request_is_too_broad: "Refuse field-wide scope and decompose to one track.",
      when_only_hallmark_is_named: "Choose the highest-ranked track in that hallmark from the requested mode queue."
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
        "The pass begins to broaden into fresh baseline research and should be handed back to bootstrap instead."
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
        goal: "Broaden hallmarks that still need more than one track to avoid a one-track narrative."
      },
      {
        phase_id: "expand-covered-hallmarks",
        label: "Expand Covered Hallmarks",
        goal: "Add breadth to hallmarks that already have at least one baseline track."
      },
      {
        phase_id: "surveillance-rotation",
        label: "Surveillance Rotation",
        goal: "Revisit established tracks for meaningful deltas without redoing full baseline research."
      }
    ],
    bootstrap_queue: bootstrapCandidates,
    surveillance_queue: surveillanceCandidates
  };

  await writeJson("research/state/coverage-status.v1.json", coverageStatus);
  await writeJson("research/backlog/track-priority.v1.json", priorityQueue);
}

await main();
