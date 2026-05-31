import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getConfidenceLabel,
  getHallmarkById,
  getHallmarkInsight,
  getHallmarkOutlook,
  getHallmarkTrackGroup,
  getOverallLastUpdated,
  getMomentumLabel,
  getStageLabel,
  getTrackCoverage
} from "@/lib/site-data";

type HallmarkPageProps = {
  params: Promise<{
    hallmarkId: string;
  }>;
};

export default async function HallmarkDetailPage({ params }: HallmarkPageProps) {
  const { hallmarkId } = await params;
  const hallmark = getHallmarkById(hallmarkId);
  const trackGroup = getHallmarkTrackGroup(hallmarkId);
  const [outlook, insight, lastUpdated, trackCoverage] = await Promise.all([
    getHallmarkOutlook(hallmarkId),
    getHallmarkInsight(hallmarkId),
    getOverallLastUpdated(),
    Promise.all((trackGroup?.tracks ?? []).map(async (track) => [track.id, await getTrackCoverage(track.id)] as const))
  ]);

  if (!hallmark || !outlook || !trackGroup || !insight) {
    notFound();
  }

  const coverageByTrackId = new Map(trackCoverage);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Hallmark detail"
        title={hallmark.name}
        summary={hallmark.description}
      >
        <div className="page-hero__stats">
          <span>{getStageLabel(outlook.stage)}</span>
          <span>{getMomentumLabel(outlook.momentum)}</span>
          <span>{getConfidenceLabel(outlook.confidence)}</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Outlook</span>
              <h2>Current reading</h2>
            </div>
            <p>{outlook.note}</p>
            <div className="detail-list">
              <div>
                <strong>Main blocker</strong>
                <p>{outlook.blocker}</p>
              </div>
              <div>
                <strong>Best current signal</strong>
                <p>{outlook.bestSignal}</p>
              </div>
              <div>
                <strong>What the next stage needs</strong>
                <p>{insight.next_stage_requirement}</p>
              </div>
              <div>
                <strong>Open question</strong>
                <p>{insight.key_question}</p>
              </div>
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Progress ladder</span>
              <h2>{getStageLabel(outlook.stage)}</h2>
            </div>
            <ol className="stage-list">
              {[
                "mechanistic_plausibility",
                "animal_signal",
                "human_biomarker_signal",
                "human_functional_benefit",
                "durable_disease_or_mortality_relevance"
              ].map((stage) => (
                <li
                  className={`stage-list__item ${stage === outlook.stage ? "stage-list__item--active" : ""}`}
                  key={stage}
                >
                  {getStageLabel(stage as Parameters<typeof getStageLabel>[0])}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Tracks</span>
            <h2>Underlying research approaches</h2>
          </div>
          <span className="section-link section-link--static">{trackGroup.tracks.length} seeded tracks</span>
        </div>
        <div className="page-shell track-card-grid">
          {trackGroup.tracks.map((track) => {
            const coverage = coverageByTrackId.get(track.id);
            if (!coverage) return null;

            return (
              <Link className="track-card" href={`/tracks/${track.id}`} key={track.id}>
                <div className="track-card__top">
                  <strong>{track.name}</strong>
                  {coverage.thinCoverage ? (
                    <span className="micro-badge micro-badge--muted">Coverage in progress</span>
                  ) : null}
                </div>
                <p>{track.summary}</p>
                <div className="track-card__meta">
                  <span>{coverage.stage ? getStageLabel(coverage.stage) : coverage.statusLabel}</span>
                  <span>{coverage.momentum ? getMomentumLabel(coverage.momentum) : "Thin public layer"}</span>
                </div>
                <div className="track-card__footer">
                  <span>{coverage.blocker ?? coverage.note}</span>
                  <time dateTime={coverage.lastUpdated}>{formatDate(coverage.lastUpdated)}</time>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
