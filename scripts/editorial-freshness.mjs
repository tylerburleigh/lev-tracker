export function datePart(value) {
  if (!value) {
    return undefined;
  }

  const text = String(value);
  const directDate = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (directDate) {
    return directDate[0];
  }

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.valueOf())) {
    return undefined;
  }

  return parsedDate.toISOString().slice(0, 10);
}

export function isAfterDate(left, right) {
  const leftDate = datePart(left);
  const rightDate = datePart(right);

  if (!leftDate) {
    return false;
  }

  if (!rightDate) {
    return true;
  }

  return leftDate > rightDate;
}

export function buildTrackHallmarkMap(trackTaxonomy) {
  const trackHallmarkById = new Map();

  for (const group of trackTaxonomy.hallmark_groups ?? []) {
    for (const track of group.tracks ?? []) {
      trackHallmarkById.set(track.id, group.hallmark_id);
    }
  }

  return trackHallmarkById;
}

function updateLatestHallmarkEvent(latestByHallmarkId, hallmarkId, eventDate, event) {
  if (!hallmarkId || !eventDate) {
    return;
  }

  const previous = latestByHallmarkId.get(hallmarkId);
  if (!previous || eventDate > previous.latestEventDate) {
    latestByHallmarkId.set(hallmarkId, {
      hallmarkId,
      latestEventDate: eventDate,
      latestPublicationEventId: event.id,
      latestAffectedOutlookIds: event.affected_outlook_ids ?? []
    });
  }
}

function getHallmarkIdForOutlook(outlook, { statusByTrack, trackHallmarkById }) {
  if (!outlook) {
    return undefined;
  }

  if (outlook.subject_type === "hallmark") {
    return outlook.subject_id;
  }

  if (outlook.subject_type === "track") {
    return statusByTrack?.get(outlook.subject_id)?.hallmark_id ?? trackHallmarkById?.get(outlook.subject_id);
  }

  return undefined;
}

export function latestAffectedHallmarkEvents({
  publicationEvents,
  outlooks,
  statusByTrack,
  trackHallmarkById,
  afterDate
}) {
  const latestByHallmarkId = new Map();
  const outlookById = new Map(outlooks.map((outlook) => [outlook.id, outlook]));

  for (const event of publicationEvents) {
    const eventDate = datePart(event.published_at);
    if (afterDate && !isAfterDate(eventDate, afterDate)) {
      continue;
    }

    for (const outlookId of event.affected_outlook_ids ?? []) {
      const hallmarkId = getHallmarkIdForOutlook(outlookById.get(outlookId), {
        statusByTrack,
        trackHallmarkById
      });
      updateLatestHallmarkEvent(latestByHallmarkId, hallmarkId, eventDate, event);
    }
  }

  return latestByHallmarkId;
}

export function computeHallmarkInsightFreshness({
  hallmarkInsights,
  outlooks,
  publicationEvents,
  statusByTrack,
  trackHallmarkById,
  afterDate
}) {
  const latestByHallmarkId = latestAffectedHallmarkEvents({
    publicationEvents,
    outlooks,
    statusByTrack,
    trackHallmarkById,
    afterDate
  });

  const stale = hallmarkInsights
    .map((insight) => {
      const latest = latestByHallmarkId.get(insight.hallmark_id);
      return {
        hallmarkId: insight.hallmark_id,
        lastReviewed: insight.last_reviewed,
        latestEventDate: latest?.latestEventDate,
        latestPublicationEventId: latest?.latestPublicationEventId,
        latestAffectedOutlookIds: latest?.latestAffectedOutlookIds ?? [],
        stale: Boolean(latest?.latestEventDate && latest.latestEventDate > insight.last_reviewed)
      };
    })
    .filter((row) => row.stale)
    .sort((left, right) => left.hallmarkId.localeCompare(right.hallmarkId));

  return {
    staleCount: stale.length,
    stale
  };
}
