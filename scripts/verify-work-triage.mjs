#!/usr/bin/env node

import assert from "node:assert/strict";
import { buildEditorialRollupItem } from "./seed-work-triage.mjs";

const currentMonth = new Date().toISOString().slice(0, 7);
const eventDate = `${currentMonth}-15`;
const previousDate = `${currentMonth}-14`;
const latestStateOfFieldDate = `${currentMonth}-12`;
const eventId = "publish-regression-current-period-outlook-update";
const trackOutlookId = "track-regression-outlook";
const trackId = "regression-track";
const hallmarkId = "regression_hallmark";

function baseInputs() {
  return {
    publicationEvents: [
      {
        id: eventId,
        published_at: `${eventDate}T12:00:00.000Z`,
        affected_outlook_ids: [trackOutlookId]
      }
    ],
    stateOfFieldEditions: [
      {
        slug: currentMonth,
        date: latestStateOfFieldDate
      }
    ],
    stateOfFieldWorkflow: {
      editions: [
        {
          slug: currentMonth,
          status: "draft",
          period_start: `${currentMonth}-01`,
          period_end: `${currentMonth}-28`,
          checklist: [
            {
              id: "wait-period-close",
              status: "blocked"
            }
          ],
          observed_public_story: {
            related_publication_event_ids: []
          },
          reconciliation_items: []
        }
      ]
    },
    currentStory: {
      revision: {
        last_reviewed: eventDate
      }
    },
    hallmarkInsights: [
      {
        hallmark_id: hallmarkId,
        last_reviewed: eventDate
      }
    ],
    outlooks: [
      {
        id: "overall-lev-outlook",
        subject_type: "overall",
        subject_id: "overall",
        last_updated: eventDate
      },
      {
        id: trackOutlookId,
        subject_type: "track",
        subject_id: trackId,
        last_updated: eventDate
      }
    ],
    statusByTrack: new Map([[trackId, { hallmark_id: hallmarkId }]]),
    siteShellText: "",
    hasOutlookRoute: true
  };
}

function buildItem(overrides = {}) {
  const inputs = baseInputs();
  const merged = {
    ...inputs,
    ...overrides
  };

  return buildEditorialRollupItem(merged);
}

assert.equal(
  buildItem(),
  undefined,
  "current-period State-of-Field-only updates should be deferred when the active edition is blocked on period close and has no open review work"
);

const staleCurrentStoryItem = buildItem({
  currentStory: {
    revision: {
      last_reviewed: previousDate
    }
  }
});
assert.match(
  staleCurrentStoryItem.rationale,
  /current LEV story review/,
  "a public outlook update after the current-story review should remain actionable"
);

const openDecisionInputs = baseInputs();
openDecisionInputs.stateOfFieldWorkflow.editions[0].reconciliation_items = [
  {
    publication_event_id: eventId,
    decision: "needs_decision"
  }
];
const openDecisionItem = buildEditorialRollupItem(openDecisionInputs);
assert.match(
  openDecisionItem.rationale,
  /state-of-field edition/,
  "open State of the Field reconciliation decisions should remain actionable"
);

const openApprovalInputs = baseInputs();
openApprovalInputs.stateOfFieldWorkflow.editions[0].reconciliation_items = [
  {
    publication_event_id: eventId,
    decision: "include_as_field_signal",
    agent_assessment: {
      human_review_required: true
    },
    human_approval: {
      status: "requested"
    }
  }
];
const openApprovalItem = buildEditorialRollupItem(openApprovalInputs);
assert.match(
  openApprovalItem.rationale,
  /state-of-field edition/,
  "required human approvals should prevent State of the Field triage from being deferred"
);

const staleHallmarkItem = buildItem({
  hallmarkInsights: [
    {
      hallmark_id: hallmarkId,
      last_reviewed: previousDate
    }
  ]
});
assert.match(
  staleHallmarkItem.rationale,
  /hallmark insight/,
  "stale hallmark insight copy should remain actionable"
);

process.stdout.write("Work triage regression checks passed.\n");
