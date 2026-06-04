import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, FlaskConical, ListChecks, TriangleAlert } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { StageBadge } from "@/components/stage-badge";
import { formatDate } from "@/lib/date";
import { getDirectionTone, getReadableLabel } from "@/lib/evidence-format";
import {
  getActivityForHallmark,
  getConfidenceLabel,
  getHallmarkById,
  getHallmarkInsight,
  getHallmarkOutlook,
  getHallmarkTrackGroup,
  getLeadingInterventionsForHallmark,
  getOverallLastUpdated,
  getMomentumLabel,
  getStageLabel,
  getStrongestFindingsForHallmark,
  getTrackById,
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
  const [outlook, insight, lastUpdated, trackCoverage, leadingInterventions, strongestFindings, recentActivity] =
    await Promise.all([
    getHallmarkOutlook(hallmarkId),
    getHallmarkInsight(hallmarkId),
    getOverallLastUpdated(),
      Promise.all((trackGroup?.tracks ?? []).map(async (track) => [track.id, await getTrackCoverage(track.id)] as const)),
      getLeadingInterventionsForHallmark(hallmarkId),
      getStrongestFindingsForHallmark(hallmarkId),
      getActivityForHallmark(hallmarkId)
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
          <StageBadge stage={outlook.stage} />
          <span>{getMomentumLabel(outlook.momentum)}</span>
          <span>{getConfidenceLabel(outlook.confidence)}</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell hallmark-outlook-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Forecast note</span>
              <h2>{getStageLabel(outlook.stage)}</h2>
            </div>
            <p>{outlook.note}</p>
            <div className="detail-list">
              <div>
                <strong>Momentum</strong>
                <p>{getMomentumLabel(outlook.momentum)}</p>
              </div>
              <div>
                <strong>Confidence</strong>
                <p>{getConfidenceLabel(outlook.confidence)}</p>
              </div>
            </div>
          </article>

          <article className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Blockers</span>
              <h2>What still has to move</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Main blocker</strong>
                <p>{outlook.blocker}</p>
              </div>
              <div>
                <strong>Open question</strong>
                <p>{insight.key_question}</p>
              </div>
              <div>
                <strong>Best current signal</strong>
                <p>{outlook.bestSignal}</p>
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
            <div className="evidence-scope-note">
              <strong>What the next stage needs</strong>
              <p>{insight.next_stage_requirement}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Leading interventions</span>
            <h2>Promoted signals in this hallmark</h2>
          </div>
          <span className="section-link section-link--static">{leadingInterventions.length} intervention IDs</span>
        </div>
        <div className="page-shell hallmark-module-grid">
          {leadingInterventions.length ? (
            leadingInterventions.map((intervention) => (
              <Link className="hallmark-module-card" href={`/interventions/${intervention.id}`} key={intervention.id}>
                <div className="hallmark-module-card__icon">
                  <FlaskConical aria-hidden="true" size={18} />
                </div>
                <div className="hallmark-module-card__body">
                  <div className="hallmark-module-card__header">
                    <strong>{intervention.name}</strong>
                    <span>{intervention.findingCount} findings</span>
                  </div>
                  <p>{intervention.summary}</p>
                  <div className="evidence-finding__meta">
                    <span className="evidence-chip">{getReadableLabel(intervention.strongestEvidenceTier)}</span>
                    <span className="evidence-chip">{getConfidenceLabel(intervention.strongestConfidence)}</span>
                    {intervention.directions.slice(0, 2).map((direction) => (
                      <span className={`evidence-chip ${getDirectionTone(direction)}`} key={direction}>
                        {getReadableLabel(direction)}
                      </span>
                    ))}
                  </div>
                  {intervention.trackIds.length ? (
                    <div className="pill-row">
                      {intervention.trackIds.slice(0, 3).map((trackId) => (
                        <span className="mini-link" key={trackId}>
                          {getTrackById(trackId)?.name ?? trackId}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))
          ) : (
            <div className="hallmark-empty-module">
              <strong>No promoted intervention findings yet.</strong>
              <p>This hallmark is seeded, but its intervention evidence has not been promoted into the public finding layer.</p>
            </div>
          )}
        </div>
      </section>

      <section className="band">
        <div className="page-shell evidence-inventory">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Strongest findings</span>
              <h2>Evidence anchors</h2>
            </div>
            <span className="section-link section-link--static">{strongestFindings.length} records</span>
          </div>
          <div className="evidence-inventory-list">
            {strongestFindings.length ? (
              strongestFindings.map((finding) => (
                <Link className="evidence-inventory-item" href={`/findings/${finding.id}`} key={finding.id}>
                  <div className="evidence-finding__meta">
                    <span className="evidence-chip">{getReadableLabel(finding.evidence_tier)}</span>
                    <span className={`evidence-chip ${getDirectionTone(finding.direction)}`}>
                      {getReadableLabel(finding.direction)}
                    </span>
                    <span className="evidence-chip">{getConfidenceLabel(finding.confidence)}</span>
                  </div>
                  <div className="evidence-inventory-item__body">
                    <div>
                      <strong>{finding.name}</strong>
                      <p>{finding.statement}</p>
                    </div>
                    <div className="evidence-inventory-item__meta">
                      <span>{getReadableLabel(finding.endpoint_category)}</span>
                      {finding.population_or_model ? <span>{finding.population_or_model}</span> : null}
                      {finding.quantitative_note ? <span>{finding.quantitative_note}</span> : null}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>No promoted findings currently map to this hallmark.</p>
            )}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Recent activity</span>
            <h2>Contextual movement</h2>
          </div>
          <Link className="section-link" href="/activity">
            Full activity
          </Link>
        </div>
        <div className="page-shell hallmark-activity-grid">
          {recentActivity.length ? (
            recentActivity.map((item) => (
              <Link className="hallmark-activity-card" href={item.href} key={item.id}>
                <div className="hallmark-module-card__icon">
                  {item.affectsOutlook ? <ListChecks aria-hidden="true" size={18} /> : <Activity aria-hidden="true" size={18} />}
                </div>
                <div>
                  <div className="activity-card__top">
                    <span className="micro-badge micro-badge--outline">{item.lane}</span>
                    <time dateTime={item.date}>{formatDate(item.date)}</time>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="evidence-chip">
                    {item.affectsOutlook ? "Affects outlook" : "Context only"}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="hallmark-empty-module">
              <div className="hallmark-module-card__icon">
                <TriangleAlert aria-hidden="true" size={18} />
              </div>
              <div>
                <strong>No public activity items yet.</strong>
                <p>Research coverage can still exist here through tracks and outlook records.</p>
              </div>
            </div>
          )}
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
                    <span className="micro-badge micro-badge--muted">Thin coverage</span>
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
