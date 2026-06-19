import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import {
  getDirectionTone,
  getReadableLabel,
  getSourceAuditHref,
  getSourceDisplayName,
  getTitleFromIdentifier
} from "@/lib/evidence-format";
import { formatDate } from "@/lib/date";
import {
  getFindingWeightLabel,
  getFindingById,
  getHallmarkById,
  getInterventionsByIds,
  getOverallLastUpdated,
  getSourceById,
  getStudyById,
  getTrackById
} from "@/lib/site-data";

type FindingDetailPageProps = {
  params: Promise<{
    findingId: string;
  }>;
};

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { findingId } = await params;
  const finding = await getFindingById(findingId);

  if (!finding) {
    notFound();
  }

  const [source, study, interventions, lastUpdated] = await Promise.all([
    getSourceById(finding.source_id),
    finding.study_id ? getStudyById(finding.study_id) : Promise.resolve(undefined),
    getInterventionsByIds(finding.intervention_ids ?? []),
    getOverallLastUpdated()
  ]);
  const interventionNameById = new Map(interventions.map((intervention) => [intervention.id, intervention.name]));

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero kicker="Finding detail" title={finding.name} summary={finding.summary ?? finding.statement}>
        <div className="page-hero__stats">
          <span>{getReadableLabel(finding.evidence_tier)}</span>
          <span>{getReadableLabel(finding.direction)}</span>
          <span>{getFindingWeightLabel(finding.confidence)}</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Evidence statement</span>
              <h2>{getReadableLabel(finding.endpoint_category)}</h2>
            </div>
            <p>{finding.statement}</p>
            {finding.quantitative_note ? <p className="evidence-finding__quant">{finding.quantitative_note}</p> : null}
            <div className="detail-list">
              <div>
                <strong>Direction</strong>
                <p>
                  <span className={`evidence-chip ${getDirectionTone(finding.direction)}`}>
                    {getReadableLabel(finding.direction)}
                  </span>
                </p>
              </div>
              <div>
                <strong>Evidence weight</strong>
                <p>{getFindingWeightLabel(finding.confidence)}</p>
              </div>
              <div>
                <strong>Population or model</strong>
                <p>{finding.population_or_model ?? "Not specified"}</p>
              </div>
              <div>
                <strong>Time horizon</strong>
                <p>{finding.time_horizon ?? "Not specified"}</p>
              </div>
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Provenance</span>
              <h2>{source ? getSourceDisplayName(source) : finding.source_id}</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Source</strong>
                <p>
                  {source ? (
                    <Link className="mini-link" href={getSourceAuditHref(source)}>
                      {getSourceDisplayName(source)}
                    </Link>
                  ) : (
                    finding.source_id
                  )}
                </p>
              </div>
              <div>
                <strong>Study</strong>
                <p>
                  {study ? (
                    <Link className="mini-link" href={`/studies/${study.id}`}>
                      {study.name}
                    </Link>
                  ) : (
                    finding.study_id ?? "Not linked"
                  )}
                </p>
              </div>
              <div>
                <strong>Interventions</strong>
                <div className="pill-row">
                  {(finding.intervention_ids?.length ? finding.intervention_ids : ["Not linked"]).map((interventionId) =>
                    interventionId === "Not linked" ? (
                      <span className="mini-link" key={interventionId}>
                        {interventionId}
                      </span>
                    ) : (
                      <Link className="mini-link" href={`/interventions/${interventionId}`} key={interventionId}>
                        {interventionNameById.get(interventionId) ?? getTitleFromIdentifier(interventionId)}
                      </Link>
                    )
                  )}
                </div>
              </div>
              <div>
                <strong>Tracks</strong>
                <div className="pill-row">
                  {(finding.track_ids?.length ? finding.track_ids : ["Not linked"]).map((trackId) =>
                    trackId === "Not linked" ? (
                      <span className="mini-link" key={trackId}>
                        {trackId}
                      </span>
                    ) : (
                      <Link className="mini-link" href={`/tracks/${trackId}`} key={trackId}>
                        {getTrackById(trackId)?.name ?? trackId}
                      </Link>
                    )
                  )}
                </div>
              </div>
              <div>
                <strong>Hallmarks</strong>
                <div className="pill-row">
                  {finding.hallmark_ids.map((hallmarkId) => (
                    <Link className="mini-link" href={`/hallmarks/${hallmarkId}`} key={hallmarkId}>
                      {getHallmarkById(hallmarkId)?.name ?? hallmarkId}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {finding.caveats?.length ? (
        <section className="band band--alt">
          <div className="page-shell">
            <article className="detail-panel">
              <div className="panel-header panel-header--stacked">
                <span className="section-kicker">Limits</span>
                <h2>Caveats</h2>
              </div>
              <ul className="bullet-list">
                {finding.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}
