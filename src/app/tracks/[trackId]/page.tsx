import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getConfidenceLabel,
  getHallmarkById,
  getMomentumLabel,
  getOverallLastUpdated,
  getStageLabel,
  getTrackById,
  getTrackCoverage,
  getTracks
} from "@/lib/site-data";

type TrackDetailPageProps = {
  params: Promise<{
    trackId: string;
  }>;
};

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { trackId } = await params;
  const trackWithGroup = getTracks().find((item) => item.id === trackId);
  const taxonomyTrack = getTrackById(trackId);
  const [coverage, lastUpdated] = await Promise.all([getTrackCoverage(trackId), getOverallLastUpdated()]);

  if (!trackWithGroup || !taxonomyTrack) {
    notFound();
  }

  const hallmark = getHallmarkById(trackWithGroup.primaryHallmarkId);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Track detail"
        title={taxonomyTrack.name}
        summary={taxonomyTrack.summary}
      >
        <div className="page-hero__stats">
          <span>{hallmark?.name ?? trackWithGroup.primaryHallmarkId}</span>
          <span>{coverage.stage ? getStageLabel(coverage.stage) : coverage.statusLabel}</span>
          {coverage.confidence ? <span>{getConfidenceLabel(coverage.confidence)}</span> : null}
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Track outlook</span>
              <h2>{coverage.stage ? getStageLabel(coverage.stage) : coverage.statusLabel}</h2>
            </div>
            <p>{coverage.note}</p>
            <div className="detail-list">
              <div>
                <strong>Momentum</strong>
                <p>{coverage.momentum ? getMomentumLabel(coverage.momentum) : "Uncertain"}</p>
              </div>
              <div>
                <strong>Main blocker</strong>
                <p>{coverage.blocker ?? "Coverage is still thin in the public layer."}</p>
              </div>
              <div>
                <strong>Best current signal</strong>
                <p>{coverage.bestSignal ?? "The track is seeded, but still light on public evidence summaries."}</p>
              </div>
            </div>
          </article>
          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Representative interventions</span>
              <h2>{taxonomyTrack.exemplar_interventions?.length ?? 0} examples</h2>
            </div>
            <ul className="bullet-list">
              {(taxonomyTrack.exemplar_interventions?.length
                ? taxonomyTrack.exemplar_interventions
                : ["No intervention exemplars have been promoted yet."]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Search aliases</span>
              <h2>Research operations hooks</h2>
            </div>
            <ul className="bullet-list">
              {taxonomyTrack.search_aliases.map((alias) => (
                <li key={alias}>{alias}</li>
              ))}
            </ul>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Cross-hallmark links</span>
              <h2>Related areas</h2>
            </div>
            <div className="pill-row">
              {(taxonomyTrack.secondary_hallmark_ids?.length
                ? taxonomyTrack.secondary_hallmark_ids
                : [trackWithGroup.primaryHallmarkId]
              ).map((id) => {
                const related = getHallmarkById(id);
                return (
                  <Link className="mini-link" href={`/hallmarks/${id}`} key={id}>
                    {related?.name ?? id}
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
