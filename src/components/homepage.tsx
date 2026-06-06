import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  BookMarked,
  CalendarCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Compass,
  Eye,
  Flag,
  Milestone,
  Radar,
  ShieldCheck,
  Sparkles,
  Telescope
} from "lucide-react";

import { StageBadge } from "@/components/stage-badge";
import {
  getConfidenceLabel,
  getEvidenceNeedReasonLabel,
  getHomepageData,
  getMomentumLabel,
  getStageLabel,
  getStagePlainMeaning,
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

function outlookChangeTone(direction: string) {
  switch (direction) {
    case "more_optimistic":
      return "outlook-change-item--up";
    case "less_optimistic":
      return "outlook-change-item--down";
    default:
      return "outlook-change-item--watch";
  }
}

export async function Homepage() {
  const {
    overallOutlook: overview,
    hallmarkOutlooks,
    hallmarks,
    recentChanges,
    snapshot,
    currentLevStory,
    currentLevStoryStatus
  } = await getHomepageData();
  const visibleRecentChanges = recentChanges.slice(0, 3);
  const visibleBeforeNowNextSteps = currentLevStory.before_now_next.slice(0, 3);
  const visibleRecentDevelopments = currentLevStory.recent_developments.slice(0, 3);
  const visibleItemsToWatchNext = currentLevStory.what_to_watch_next.slice(0, 3);
  const visibleBetterEvidenceNeeds = currentLevStory.where_better_evidence_is_needed.slice(0, 3);
  const visibleOutlookChangeItems = currentLevStory.what_would_change_the_outlook.slice(0, 3);
  const visibleTrackExamples = currentLevStory.track_examples_to_inspect.slice(0, 3);
  const stateOfFieldHref = currentLevStory.related_state_of_field_slug
    ? `/state-of-the-field/${currentLevStory.related_state_of_field_slug}`
    : "/state-of-the-field";
  const storyStatusTone =
    currentLevStoryStatus.status === "current" ? "status-chip--mint" : "status-chip--gold";

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
              <span className={`status-chip ${statusTone(getConfidenceLabel(overview.confidence))}`}>
                {getConfidenceLabel(overview.confidence)}
              </span>
              <Link className="status-chip status-chip--outline" href={stateOfFieldHref}>
                <span>Latest note</span>
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
            <div className="hero-card__columns">
              <div>
                <h2>Where we are now</h2>
                <p>{currentLevStory.current_evidence_picture}</p>
              </div>
              <div>
                <h2>What changed recently</h2>
                <p>{currentLevStory.what_changed}</p>
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
                  <span className="snapshot-item__label">Research tracks covered</span>
                  <strong>{snapshot.researchTracks}</strong>
                </div>
              </div>
              <div className="snapshot-item">
                <CalendarCheck aria-hidden="true" size={16} />
                <div>
                  <span className="snapshot-item__label">Story status</span>
                  <strong>{currentLevStoryStatus.label}</strong>
                  <span className="snapshot-item__note">
                    Next check {formatDate(currentLevStoryStatus.reviewDue)}
                  </span>
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
            <span className="section-kicker">Field story</span>
            <h2>Where the picture is moving</h2>
          </div>
          <span className={`status-chip ${storyStatusTone}`}>
            Updated {formatDate(currentLevStoryStatus.lastReviewed)}
          </span>
        </div>
        <div className="page-shell before-now-next-grid">
          {visibleBeforeNowNextSteps.map((step, index) => (
            <article className="before-now-next-step" key={step.label}>
              <div className="before-now-next-step__label">
                <Milestone aria-hidden="true" size={16} />
                <span>{step.label}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.summary}</p>
              {index < visibleBeforeNowNextSteps.length - 1 ? <ArrowRight aria-hidden="true" className="before-now-next-step__arrow" size={18} /> : null}
            </article>
          ))}
        </div>
        <div className="page-shell story-grid">
          <article className="story-panel">
            <div className="story-panel__header">
              <Flag aria-hidden="true" size={18} />
              <h3>What changed</h3>
            </div>
            <div className="story-list">
              {visibleRecentDevelopments.map((moment) => (
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
              <h3>What would matter next</h3>
            </div>
            <div className="story-list">
              {visibleItemsToWatchNext.map((item) => (
                <div className="story-list-item" key={item.label}>
                  <strong>{item.label}</strong>
                  <p>{item.summary}</p>
                  <span className="story-impact">{item.what_to_look_for}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="story-panel">
            <div className="story-panel__header">
              <Compass aria-hidden="true" size={18} />
              <h3>Where proof is thinnest</h3>
            </div>
            <div className="story-list">
              {visibleBetterEvidenceNeeds.map((priority) => (
                <div className="story-list-item" key={priority.label}>
                  <div className="story-list-item__top">
                    <strong>{priority.label}</strong>
                    <span className="micro-badge micro-badge--outline">
                      {getEvidenceNeedReasonLabel(priority.reason)}
                    </span>
                  </div>
                  <p>{priority.rationale}</p>
                  <span className="story-impact">{priority.what_better_evidence_would_show}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="band band--reader">
        <div className="page-shell reader-grid">
          <article className="reader-panel">
            <div className="story-panel__header">
              <Eye aria-hidden="true" size={18} />
              <h2>What would change our mind?</h2>
            </div>
            <div className="outlook-change-list">
              {visibleOutlookChangeItems.map((item) => (
                <div className={`outlook-change-item ${outlookChangeTone(item.direction)}`} key={item.label}>
                  <CheckCircle2 aria-hidden="true" size={18} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="reader-panel">
            <div className="story-panel__header">
              <Compass aria-hidden="true" size={18} />
              <h2>Concrete examples</h2>
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
                <p className="hallmark-card__evidence-gap">{outlook.evidenceGap}</p>
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
              <strong>Evidence, interpretation, outlook</strong>
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
