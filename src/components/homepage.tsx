import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  CalendarCheck,
  Clock3,
  Compass,
  Flag,
  Radar,
  ShieldCheck,
  Sparkles,
  Telescope
} from "lucide-react";

import { StageBadge } from "@/components/stage-badge";
import {
  getConfidenceLabel,
  getFocusReasonLabel,
  getHomepageData,
  getMomentumLabel,
  getStageLabel,
  getTrackCountForHallmark
} from "@/lib/site-data";
import { formatDate } from "@/lib/date";

function statusTone(value: string) {
  switch (value) {
    case "Accelerating":
    case "High confidence":
    case "On track":
      return "status-chip--mint";
    case "Mixed":
    case "Moderate confidence":
    case "Plausible":
      return "status-chip--gold";
    case "Stalled":
    case "Unsupported":
      return "status-chip--red";
    default:
      return "status-chip--slate";
  }
}

export async function Homepage() {
  const {
    overallOutlook: overview,
    hallmarkOutlooks,
    hallmarks,
    recentChanges,
    snapshot,
    progressNarrative,
    progressNarrativeReviewState
  } = await getHomepageData();
  const visibleRecentChanges = recentChanges.slice(0, 3);
  const visibleProgressMoments = progressNarrative.progress_moments.slice(0, 3);
  const visibleWatchlist = progressNarrative.watchlist.slice(0, 3);
  const visibleFocusPriorities = progressNarrative.focus_priorities.slice(0, 3);
  const stateOfFieldHref = progressNarrative.related_state_of_field_slug
    ? `/state-of-the-field/${progressNarrative.related_state_of_field_slug}`
    : "/state-of-the-field";
  const narrativeReviewTone =
    progressNarrativeReviewState.status === "current" ? "status-chip--mint" : "status-chip--gold";

  return (
    <>
      <section className="band band--hero">
        <div className="page-shell hero-grid">
          <article className="hero-card">
            <div className="hero-card__eyebrow">State of LEV</div>
            <div className="hero-card__heading">
              <h1>{progressNarrative.title}</h1>
              <p>{progressNarrative.summary}</p>
            </div>
            <div className="status-chip-row">
              <span className="status-chip status-chip--outline">
                Stage: {getStageLabel(overview.stage)}
              </span>
              <span className={`status-chip ${statusTone(getMomentumLabel(overview.momentum))}`}>
                {getMomentumLabel(overview.momentum)}
              </span>
              <span className={`status-chip ${statusTone(getConfidenceLabel(overview.confidence))}`}>
                {getConfidenceLabel(overview.confidence)}
              </span>
              <Link className="status-chip status-chip--outline" href={stateOfFieldHref}>
                <span>Latest note</span>
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
            </div>
            <div className="hero-card__columns">
              <div>
                <h2>Where we are now</h2>
                <p>{progressNarrative.where_we_are_now}</p>
              </div>
              <div>
                <h2>What changed recently</h2>
                <p>{progressNarrative.what_changed_recently}</p>
              </div>
            </div>
          </article>
          <aside className="snapshot-panel">
            <div className="snapshot-panel__header">
              <span>Snapshot</span>
              <Link href="/methods">
                <BookMarked aria-hidden="true" size={16} />
                <span>Methods</span>
              </Link>
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
                <Radar aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Hallmarks tracked</span>
                  <strong>{snapshot.hallmarksTracked}</strong>
                </div>
              </div>
              <div className="snapshot-item">
                <Sparkles aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Seeded tracks covered</span>
                  <strong>{snapshot.seededTracks}</strong>
                </div>
              </div>
              <div className="snapshot-item">
                <CalendarCheck aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Narrative review</span>
                  <strong>{progressNarrativeReviewState.label}</strong>
                  <span className="snapshot-item__note">
                    Due {formatDate(progressNarrativeReviewState.reviewDue)}
                  </span>
                </div>
              </div>
              <div className="snapshot-item">
                <ShieldCheck aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Review mode</span>
                  <strong>{snapshot.reviewStatus}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="band band--narrative">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Progress narrative</span>
            <h2>The story to track</h2>
          </div>
          <span className={`status-chip ${narrativeReviewTone}`}>
            Reviewed {formatDate(progressNarrativeReviewState.lastReviewed)}
          </span>
        </div>
        <div className="page-shell story-grid">
          <article className="story-panel">
            <div className="story-panel__header">
              <Flag aria-hidden="true" size={18} />
              <h3>Progress made</h3>
            </div>
            <div className="story-list">
              {visibleProgressMoments.map((moment) => (
                <div className="story-list-item" key={moment.label}>
                  <div className="story-list-item__top">
                    <strong>{moment.label}</strong>
                    {moment.date ? <time dateTime={moment.date}>{formatDate(moment.date)}</time> : null}
                  </div>
                  <p>{moment.summary}</p>
                  <span className="story-impact">{moment.impact_on_outlook}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="story-panel">
            <div className="story-panel__header">
              <Telescope aria-hidden="true" size={18} />
              <h3>Watch next</h3>
            </div>
            <div className="story-list">
              {visibleWatchlist.map((item) => (
                <div className="story-list-item" key={item.label}>
                  <strong>{item.label}</strong>
                  <p>{item.summary}</p>
                  <span className="story-impact">{item.signal_to_watch}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="story-panel">
            <div className="story-panel__header">
              <Compass aria-hidden="true" size={18} />
              <h3>Focus next</h3>
            </div>
            <div className="story-list">
              {visibleFocusPriorities.map((priority) => (
                <div className="story-list-item" key={priority.label}>
                  <div className="story-list-item__top">
                    <strong>{priority.label}</strong>
                    <span className="micro-badge micro-badge--outline">
                      {getFocusReasonLabel(priority.reason)}
                    </span>
                  </div>
                  <p>{priority.rationale}</p>
                  <span className="story-impact">{priority.next_useful_work}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Hallmark outlooks</span>
            <h2>All 12 hallmarks in view</h2>
          </div>
          <Link className="section-link" href="/hallmarks">
            <span>Open hallmarks index</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="page-shell hallmark-grid">
          {hallmarkOutlooks.map((outlook) => {
            const hallmark = hallmarks.find((item) => item.id === outlook.subjectId);
            if (!hallmark) return null;

            return (
              <Link className="hallmark-card" key={outlook.subjectId} href={`/hallmarks/${outlook.subjectId}`}>
                <div className="hallmark-card__top">
                  <span className="hallmark-card__name">{hallmark.name}</span>
                  {outlook.thinCoverage ? (
                    <span className="micro-badge micro-badge--muted">Thin coverage</span>
                  ) : null}
                </div>
                <StageBadge stage={outlook.stage} className="hallmark-card__stage" />
                <div className="hallmark-card__meta">
                  <span className={`micro-badge ${statusTone(getMomentumLabel(outlook.momentum))}`}>
                    {getMomentumLabel(outlook.momentum)}
                  </span>
                  <span className="micro-badge micro-badge--outline">
                    {getConfidenceLabel(outlook.confidence)}
                  </span>
                </div>
                <p className="hallmark-card__blocker">{outlook.blocker}</p>
                <div className="hallmark-card__footer">
                  <span>{getTrackCountForHallmark(outlook.subjectId)} tracks</span>
                  <time dateTime={outlook.lastUpdated}>{formatDate(outlook.lastUpdated)}</time>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="band band--split">
        <div className="page-shell">
          <article className="feed-panel">
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
                <Link className="feed-item" key={change.id} href={change.href}>
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
          </article>
        </div>
      </section>

      <section className="band band--trust">
        <div className="page-shell trust-band">
          <div className="trust-band__item">
            <ShieldCheck aria-hidden="true" size={18} />
            <div>
              <strong>Human-reviewed before publication</strong>
              <p>Automation drafts and revises, but public judgment stays curated.</p>
            </div>
          </div>
          <div className="trust-band__item">
            <Radar aria-hidden="true" size={18} />
            <div>
              <strong>Evidence, interpretation, forecast</strong>
              <p>The site keeps those layers separate so motion does not masquerade as proof.</p>
            </div>
          </div>
          <div className="trust-band__item">
            <BookMarked aria-hidden="true" size={18} />
            <div>
              <strong>Source-backed and inspectable</strong>
              <p>Hallmark and track pages are meant to be read, checked, and argued with.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
