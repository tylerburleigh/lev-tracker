import Link from "next/link";
import { ArrowRight, BookMarked, Clock3, Radar, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

import {
  getConfidenceLabel,
  getHomepageData,
  getMomentumLabel,
  getScenarioLabel,
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
  const { overallOutlook: overview, hallmarkOutlooks, hallmarks, recentChanges, snapshot } =
    await getHomepageData();

  return (
    <>
      <section className="band band--hero">
        <div className="page-shell hero-grid">
          <article className="hero-card">
            <div className="hero-card__eyebrow">Overall LEV outlook</div>
            <div className="hero-card__heading">
              <h1>{getStageLabel(overview.stage)}</h1>
              <p>{overview.note}</p>
            </div>
            <div className="status-chip-row">
              <span className={`status-chip ${statusTone(getMomentumLabel(overview.momentum))}`}>
                {getMomentumLabel(overview.momentum)}
              </span>
              <span className={`status-chip ${statusTone(getConfidenceLabel(overview.confidence))}`}>
                {getConfidenceLabel(overview.confidence)}
              </span>
              <span className="status-chip status-chip--outline">
                Updated {formatDate(overview.lastUpdated)}
              </span>
            </div>
            <div className="hero-card__columns">
              <div>
                <h2>Main blocker</h2>
                <p>{overview.blocker}</p>
              </div>
              <div>
                <h2>Best current signal</h2>
                <p>{overview.bestSignal}</p>
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
                <div className="hallmark-card__stage">{getStageLabel(outlook.stage)}</div>
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
        <div className="page-shell split-grid">
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
              {recentChanges.map((change) => (
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

          <aside className="scenario-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">2036 scenario lens</span>
              <h2>{getScenarioLabel(overview.scenario2036Status ?? "speculative")}</h2>
            </div>
            <p className="scenario-panel__summary">
              The project uses 2036 as a deliberately provocative checkpoint, not as a precise forecast.
            </p>
            <div className="scenario-panel__box">
              <TriangleAlert aria-hidden="true" size={18} />
              <div>
                <strong>What would need to change</strong>
                <p>
                  Several hallmarks would need to cross from biomarker-heavy progress into replicated human
                  functional benefit, with stronger evidence that gains can stack rather than stall.
                </p>
              </div>
            </div>
            <Link className="section-link section-link--block" href="/state-of-the-field/2026-05">
              <span>Read the current editorial note</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </aside>
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
