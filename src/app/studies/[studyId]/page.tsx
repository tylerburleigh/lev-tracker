import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import {
  getDirectionTone,
  getReadableLabel,
  getSourceDisplayName,
  getSourceHref,
  getTitleFromIdentifier
} from "@/lib/evidence-format";
import { formatDate } from "@/lib/date";
import {
  getConfidenceLabel,
  getFindingsForStudy,
  getHallmarkById,
  getInterventionsByIds,
  getOverallLastUpdated,
  getSourcesByIds,
  getStudyById,
  getTrackById
} from "@/lib/site-data";

type StudyDetailPageProps = {
  params: Promise<{
    studyId: string;
  }>;
};

export default async function StudyDetailPage({ params }: StudyDetailPageProps) {
  const { studyId } = await params;
  const study = await getStudyById(studyId);

  if (!study) {
    notFound();
  }

  const [findings, sources, interventions, lastUpdated] = await Promise.all([
    getFindingsForStudy(study.id),
    getSourcesByIds(study.source_ids),
    getInterventionsByIds(study.intervention_ids ?? []),
    getOverallLastUpdated()
  ]);
  const interventionNameById = new Map(interventions.map((intervention) => [intervention.id, intervention.name]));

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero kicker="Study detail" title={study.name} summary={study.summary ?? "Study record"}>
        <div className="page-hero__stats">
          <span>{getReadableLabel(study.study_type)}</span>
          <span>{getReadableLabel(study.status)}</span>
          {study.phase ? <span>{getReadableLabel(study.phase)}</span> : null}
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Study shape</span>
              <h2>{study.sample_size ? `${study.sample_size} participants` : getReadableLabel(study.study_type)}</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Population</strong>
                <p>{study.population ?? study.model_system ?? "Not specified"}</p>
              </div>
              <div>
                <strong>Endpoint categories</strong>
                <p>{study.endpoint_categories?.map((category) => getReadableLabel(category)).join(" / ") ?? "Not specified"}</p>
              </div>
              <div>
                <strong>Registry IDs</strong>
                <p>{study.registry_ids?.join(" / ") ?? "None recorded"}</p>
              </div>
              <div>
                <strong>Dates</strong>
                <p>
                  {study.dates?.start_date || study.dates?.end_date
                    ? [study.dates.start_date, study.dates.end_date].filter(Boolean).join(" to ")
                    : "Not specified"}
                </p>
              </div>
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Mapped context</span>
              <h2>{findings.length} linked findings</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Interventions</strong>
                <div className="pill-row">
                  {(study.intervention_ids?.length ? study.intervention_ids : ["Not linked"]).map((interventionId) =>
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
                  {(study.track_ids?.length ? study.track_ids : ["Not linked"]).map((trackId) =>
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
                  {(study.hallmark_ids?.length ? study.hallmark_ids : ["Not linked"]).map((hallmarkId) =>
                    hallmarkId === "Not linked" ? (
                      <span className="mini-link" key={hallmarkId}>
                        {hallmarkId}
                      </span>
                    ) : (
                      <Link className="mini-link" href={`/hallmarks/${hallmarkId}`} key={hallmarkId}>
                        {getHallmarkById(hallmarkId)?.name ?? hallmarkId}
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell evidence-inventory">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Findings</span>
              <h2>Findings from this study</h2>
            </div>
            <span className="section-link section-link--static">{findings.length} records</span>
          </div>
          <div className="evidence-inventory-list">
            {findings.length ? (
              findings.map((finding) => (
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
                      {finding.quantitative_note ? <span>{finding.quantitative_note}</span> : null}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>No promoted findings currently link to this study.</p>
            )}
          </div>
        </div>
      </section>

      {sources.length ? (
        <section className="band">
          <div className="page-shell evidence-source-index">
            <div>
              <span className="section-kicker">Sources</span>
              <p>Bibliographic and registry sources linked to this study.</p>
            </div>
            <div className="citation-list">
              {sources.map((source) => {
                const href = getSourceHref(source);

                return href ? (
                  <a className="mini-link" href={href} key={source.id} rel="noreferrer" target="_blank">
                    <span>{getSourceDisplayName(source)}</span>
                    <ExternalLink aria-hidden="true" size={14} />
                  </a>
                ) : (
                  <span className="mini-link" key={source.id}>
                    {getSourceDisplayName(source)}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}
