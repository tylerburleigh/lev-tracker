import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarCheck,
  CircleHelp,
  Clock3,
  Compass,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  getHomepageData,
  getMomentumLabel,
  getStageLabel,
  getStagePlainMeaning,
  getTrackCountForHallmark
} from "@/lib/site-data";
import type { Stage } from "@/lib/site-data";
import { formatDate } from "@/lib/date";

const hallmarkStageColumns: Array<{ stage: Stage; label: string }> = [
  { stage: "mechanistic_plausibility", label: "Biology" },
  { stage: "animal_signal", label: "Animal" },
  { stage: "human_biomarker_signal", label: "Human biomarkers" },
  { stage: "human_functional_benefit", label: "Human function" },
  { stage: "durable_disease_or_mortality_relevance", label: "Long-lasting outcomes" }
];

const humanStageSet = new Set<Stage>([
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
]);

function statusTone(value: string) {
  switch (value) {
    case "Accelerating":
    case "On track":
      return "status-chip--mint";
    case "Mixed":
    case "Plausible":
      return "status-chip--gold";
    case "Stalled":
    case "Unsupported":
      return "status-chip--red";
    default:
      return "status-chip--slate";
  }
}

function formatInlineList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

export async function Homepage() {
  const {
    overallOutlook: overview,
    hallmarkOutlooks,
    hallmarks,
    recentChanges,
    snapshot,
    currentLevStory,
    linkedStateOfFieldEdition,
    currentLevStoryStatus
  } = await getHomepageData();
  const visibleRecentChanges = recentChanges.slice(0, 3);
  const primaryWatchItem = currentLevStory.what_to_watch_next[0];
  const primaryEvidenceNeed = currentLevStory.where_better_evidence_is_needed[0];
  const beforeNowNextSteps = currentLevStory.before_now_next;
  const outlookChangeItems = currentLevStory.what_would_change_the_outlook;
  const primaryFieldReviewGap = linkedStateOfFieldEdition?.evidence_gaps[0];
  const primaryFieldReviewSignal = linkedStateOfFieldEdition?.signals_to_watch[0];
  const fieldReviewHeadline =
    linkedStateOfFieldEdition?.field_change_status === "no_material_change"
      ? `${linkedStateOfFieldEdition.period_label}: no field-moving result`
      : (linkedStateOfFieldEdition?.title ?? "Latest field review");
  const fieldReviewSummary = linkedStateOfFieldEdition?.bottom_line ?? currentLevStory.what_changed;
  const trialHorizonItems = linkedStateOfFieldEdition?.trial_horizon ?? [];
  const trialHorizonPreview = formatInlineList(trialHorizonItems.slice(0, 4).map((item) => item.label));
  const trialHorizonText = trialHorizonItems.length
    ? `${trialHorizonItems.length} watched trials still needed posted outcomes or linked publications, including ${trialHorizonPreview}.`
    : "The next useful trial update would be a posted result or linked publication, not another trial listing.";
  const visibleTrackExamples = currentLevStory.track_examples_to_inspect.slice(0, 3);
  const hallmarkRows = hallmarkOutlooks
    .map((outlook) => ({
      outlook,
      hallmark: hallmarks.find((item) => item.id === outlook.subjectId)
    }))
    .filter((item): item is { outlook: (typeof hallmarkOutlooks)[number]; hallmark: (typeof hallmarks)[number] } =>
      Boolean(item.hallmark)
    );
  const humanStageHallmarkCount = hallmarkRows.filter(({ outlook }) => humanStageSet.has(outlook.stage)).length;
  const durableOutcomeHallmarkCount = hallmarkRows.filter(
    ({ outlook }) => outlook.stage === "durable_disease_or_mortality_relevance"
  ).length;
  const stateOfFieldHref = currentLevStory.related_state_of_field_slug
    ? `/state-of-the-field/${currentLevStory.related_state_of_field_slug}`
    : "/state-of-the-field";

  return (
    <>
      <section className="band band--hero">
        <div className="page-shell hero-grid">
          <article className="hero-card">
            <div className="hero-card__eyebrow">State of LEV</div>
            <div className="hero-card__heading">
              <h1>{currentLevStory.title}</h1>
              <p>{currentLevStory.summary}</p>
            </div>
            <div className="status-chip-row">
              <span className="status-chip status-chip--outline">
                Stage: {getStageLabel(overview.stage)}
              </span>
              <span className={`status-chip ${statusTone(getMomentumLabel(overview.momentum))}`}>
                {getMomentumLabel(overview.momentum)}
              </span>
              <Link className="status-chip status-chip--outline" href={stateOfFieldHref}>
                <span>Latest field review</span>
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <Link className="status-chip status-chip--outline" href="/about/lev">
                <span>What LEV means</span>
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <Link className="status-chip status-chip--outline" href="/data">
                <span>Data export</span>
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
            </div>
            <div className="plain-meaning plain-meaning--hero">
              <CircleHelp aria-hidden="true" size={18} />
              <div>
                <strong>Plain meaning</strong>
                <p>{getStagePlainMeaning(overview.stage)}</p>
              </div>
            </div>
            <div className="hero-card__note">
              <h2>Current evidence picture</h2>
              <p>{currentLevStory.current_evidence_picture}</p>
            </div>
          </article>
          <aside className="snapshot-panel">
            <div className="snapshot-panel__header">
              <div>
                <span>Map status</span>
                <p>Freshness and review</p>
              </div>
            </div>
            <div className="snapshot-panel__summary">
              <span className="snapshot-item__label">Current read</span>
              <strong>Current as of {formatDate(currentLevStoryStatus.lastReviewed)}</strong>
              <p>Next story review is due {formatDate(currentLevStoryStatus.reviewDue)}.</p>
            </div>
            <div className="snapshot-metrics" aria-label="Evidence map scope">
              <div className="snapshot-metric">
                <Radar aria-hidden="true" size={17} />
                <div>
                  <span className="snapshot-item__label">Hallmarks</span>
                  <strong>{snapshot.hallmarksTracked}</strong>
                </div>
              </div>
              <div className="snapshot-metric">
                <Sparkles aria-hidden="true" size={17} />
                <div>
                  <span className="snapshot-item__label">Tracks</span>
                  <strong>{snapshot.researchTracks}</strong>
                </div>
              </div>
            </div>
            <div className="snapshot-list">
              <div className="snapshot-item">
                <Clock3 aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Last public update</span>
                  <strong>{formatDate(snapshot.lastPublicUpdate)}</strong>
                </div>
              </div>
              <div className="snapshot-item">
                <CalendarCheck aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Review rhythm</span>
                  <strong>Monthly story check</strong>
                </div>
              </div>
              <div className="snapshot-item">
                <ShieldCheck aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Publication standard</span>
                  <strong>{snapshot.reviewStatus}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="band band--field-story">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Latest field review</span>
            <h2>{fieldReviewHeadline}</h2>
            <p className="section-header__summary">{fieldReviewSummary}</p>
          </div>
          <Link className="section-link" href={stateOfFieldHref}>
            <span>Read full State of the Field</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="page-shell report-ledger report-ledger--field-review">
          <article className="report-ledger-row">
            <span>Trial read</span>
            <div>
              <h3>Results are still missing</h3>
              <p>{trialHorizonText}</p>
            </div>
          </article>
          <article className="report-ledger-row">
            <span>What still blocks the outlook</span>
            <div>
              <h3>{primaryFieldReviewGap?.label ?? primaryEvidenceNeed?.label ?? "The proof gap remains"}</h3>
              <p>{primaryFieldReviewGap?.summary ?? primaryEvidenceNeed?.rationale ?? overview.evidenceGap}</p>
            </div>
          </article>
          <article className="report-ledger-row">
            <span>What would matter next</span>
            <div>
              <h3>{primaryFieldReviewSignal?.label ?? primaryWatchItem?.label ?? "Human results that last"}</h3>
              <p>
                {primaryFieldReviewSignal?.summary ??
                  primaryWatchItem?.what_to_look_for ??
                  "Look for repeated human evidence that changes the outlook."}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="band band--reader">
        <div className="page-shell report-timeline">
          {beforeNowNextSteps.map((step) => (
            <article className="report-timeline-step" key={step.label}>
              <span>{step.label}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.summary}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="page-shell report-duo">
          <section className="report-section-block">
            <span className="section-kicker">Outlook criteria</span>
            <h2>What would change our mind?</h2>
            <div className="outlook-change-list">
              {outlookChangeItems.map((item) => {
                const changeTone =
                  item.direction === "more_optimistic"
                    ? "outlook-change-item--up"
                    : item.direction === "less_optimistic"
                      ? "outlook-change-item--down"
                      : "outlook-change-item--watch";
                const Icon =
                  item.direction === "more_optimistic"
                    ? Sparkles
                    : item.direction === "less_optimistic"
                      ? ShieldCheck
                      : Radar;

                return (
                  <div className={`outlook-change-item ${changeTone}`} key={item.label}>
                    <Icon aria-hidden="true" size={17} />
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="report-section-block">
            <div className="evidence-path__header">
              <div className="evidence-path__title">
                <Compass aria-hidden="true" size={18} />
                <div>
                  <span className="section-kicker">Concrete examples</span>
                  <h2>Three patterns in the evidence</h2>
                  <p>
                    These examples show recurring patterns across the map: early human signal, broad but unproven
                    biology, and human repair evidence that may not yet generalize to aging.
                  </p>
                </div>
              </div>
              <Link className="section-link" href="/tracks">
                <span>Browse all tracks</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
            <div className="track-example-list">
              {visibleTrackExamples.map((example) => (
                <Link className="track-example-card" href={example.href} key={example.href}>
                  <div>
                    <span className="section-kicker">{example.label}</span>
                    <strong>{example.title}</strong>
                    <p>{example.summary}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" size={18} />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="band band--hallmark-glance">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Hallmarks at a glance</span>
            <h2>Where evidence is concentrated</h2>
          </div>
          <Link className="section-link" href="/hallmarks">
            <span>Open full hallmark map</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="page-shell hallmark-glance">
          <div className="hallmark-glance__summary">
            <strong>
              {humanStageHallmarkCount} of {snapshot.hallmarksTracked} hallmarks have reached a human evidence tier.
            </strong>
            <p>
              The map has moved beyond pure biology in many places, but{" "}
              {durableOutcomeHallmarkCount === 0
                ? "none of the hallmarks is at long-lasting human outcome evidence."
                : `${durableOutcomeHallmarkCount} hallmark(s) currently sit at long-lasting human outcome evidence.`}
            </p>
          </div>
          <div className="hallmark-stage-table" aria-label="Hallmark evidence tiers">
            {hallmarkStageColumns.map((column) => {
              const columnRows = hallmarkRows.filter(({ outlook }) => outlook.stage === column.stage);

              return (
                <section className="hallmark-stage-row" key={column.stage}>
                  <div className="hallmark-stage-row__header">
                    <span>{column.label}</span>
                    <strong>{columnRows.length}</strong>
                  </div>
                  <div className="hallmark-stage-row__items">
                    {columnRows.length ? (
                      columnRows.map(({ hallmark, outlook }) => (
                        <Link
                          className="hallmark-stage-link"
                          href={`/hallmarks/${outlook.subjectId}`}
                          key={outlook.subjectId}
                          aria-label={`${hallmark.name}: ${getStageLabel(outlook.stage)}, ${getMomentumLabel(
                            outlook.momentum
                          )}`}
                        >
                          <span className="hallmark-stage-pill__name">{hallmark.name}</span>
                          <span className="hallmark-stage-pill__detail">
                            {getTrackCountForHallmark(outlook.subjectId)} tracks
                          </span>
                        </Link>
                      ))
                    ) : (
                      <span className="hallmark-stage-empty">No hallmark here</span>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="band band--split">
        <div className="page-shell">
          <section className="report-section-block report-section-block--wide">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Recent changes</span>
                <h2>Public movements worth noticing</h2>
              </div>
              <Link className="section-link" href="/activity">
                <span>See activity</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
            <div className="feed-list">
              {visibleRecentChanges.map((change) => (
                <Link className="feed-row" key={change.id} href={change.href}>
                  <div className="feed-item__top">
                    <span className="feed-item__title">{change.title}</span>
                    <time dateTime={change.date}>{formatDate(change.date)}</time>
                  </div>
                  <div className="feed-item__meta">
                    <span className="micro-badge micro-badge--outline">{change.changeType}</span>
                    <span>{change.subject}</span>
                  </div>
                  <p>{change.whyItMatters}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

    </>
  );
}
