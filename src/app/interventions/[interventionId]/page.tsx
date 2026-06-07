import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { getDirectionTone, getReadableLabel, getTitleFromIdentifier } from "@/lib/evidence-format";
import { formatDate } from "@/lib/date";
import {
  getFindingWeightLabel,
  getFindingsByIds,
  getFindingsForIntervention,
  getHallmarkById,
  getInterventionById,
  getOverallLastUpdated,
  getStudiesByIds,
  getStudiesForIntervention,
  getTrackById
} from "@/lib/site-data";

type InterventionDetailPageProps = {
  params: Promise<{
    interventionId: string;
  }>;
};

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export default async function InterventionDetailPage({ params }: InterventionDetailPageProps) {
  const { interventionId } = await params;
  const [intervention, directStudies, directFindings, lastUpdated] = await Promise.all([
    getInterventionById(interventionId),
    getStudiesForIntervention(interventionId),
    getFindingsForIntervention(interventionId),
    getOverallLastUpdated()
  ]);

  if (!intervention && directStudies.length === 0 && directFindings.length === 0) {
    notFound();
  }

  const linkedStudyIds = uniqueValues([
    ...(intervention?.linked_study_ids ?? []),
    ...directStudies.map((study) => study.id)
  ]);
  const linkedFindingIds = uniqueValues([
    ...(intervention?.linked_finding_ids ?? []),
    ...directFindings.map((finding) => finding.id)
  ]);
  const [studies, findings] = await Promise.all([getStudiesByIds(linkedStudyIds), getFindingsByIds(linkedFindingIds)]);
  const hallmarkIds = uniqueValues([
    ...(intervention?.target_hallmark_ids ?? []),
    ...(intervention?.secondary_hallmark_ids ?? []),
    ...studies.flatMap((study) => study.hallmark_ids ?? []),
    ...findings.flatMap((finding) => finding.hallmark_ids)
  ]);
  const trackIds = uniqueValues([
    ...(intervention?.track_ids ?? []),
    ...studies.flatMap((study) => study.track_ids ?? []),
    ...findings.flatMap((finding) => finding.track_ids ?? [])
  ]);
  const title = intervention?.name ?? getTitleFromIdentifier(interventionId);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Intervention detail"
        title={title}
        summary={
          intervention?.summary ??
          "Evidence-linked intervention ID with promoted studies or findings in the public record."
        }
      >
        <div className="page-hero__stats">
          <span>{intervention?.development_stage ? getReadableLabel(intervention.development_stage) : "Record pending"}</span>
          <span>{studies.length} studies</span>
          <span>{findings.length} findings</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Intervention profile</span>
              <h2>{intervention?.short_name ?? title}</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Modalities</strong>
                <p>{intervention?.modalities.map((modality) => getReadableLabel(modality)).join(" / ") ?? "Not normalized yet"}</p>
              </div>
              <div>
                <strong>Mechanism</strong>
                <p>{intervention?.mechanism_summary ?? "Mechanism summary has not been promoted as a normalized intervention record."}</p>
              </div>
              <div>
                <strong>Best evidence tier</strong>
                <p>{intervention?.evidence_snapshot?.best_evidence_tier ? getReadableLabel(intervention.evidence_snapshot.best_evidence_tier) : "Derived from linked findings"}</p>
              </div>
              <div>
                <strong>Human data</strong>
                <p>{intervention?.evidence_snapshot?.human_data === undefined ? "Derived from linked studies" : intervention.evidence_snapshot.human_data ? "Yes" : "No"}</p>
              </div>
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Mapped context</span>
              <h2>{trackIds.length} tracks</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Tracks</strong>
                <div className="pill-row">
                  {(trackIds.length ? trackIds : ["Not linked"]).map((trackId) =>
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
                  {(hallmarkIds.length ? hallmarkIds : ["Not linked"]).map((hallmarkId) =>
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
              {intervention?.risk_flags?.length ? (
                <div>
                  <strong>Risk flags</strong>
                  <ul className="bullet-list">
                    {intervention.risk_flags.map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell evidence-inventory">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Evidence</span>
              <h2>Linked findings</h2>
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
                    <span className="evidence-chip">{getFindingWeightLabel(finding.confidence)}</span>
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
              <p>No promoted findings currently link to this intervention.</p>
            )}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell evidence-inventory">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Studies</span>
              <h2>Linked studies</h2>
            </div>
            <span className="section-link section-link--static">{studies.length} records</span>
          </div>
          <div className="evidence-inventory-list">
            {studies.length ? (
              studies.map((study) => (
                <Link className="evidence-inventory-item" href={`/studies/${study.id}`} key={study.id}>
                  <div className="evidence-finding__meta">
                    <span className="evidence-chip">{getReadableLabel(study.study_type)}</span>
                    <span className="evidence-chip">{getReadableLabel(study.status)}</span>
                    {study.phase ? <span className="evidence-chip">{getReadableLabel(study.phase)}</span> : null}
                  </div>
                  <div className="evidence-inventory-item__body">
                    <div>
                      <strong>{study.name}</strong>
                      <p>{study.summary ?? "No summary recorded."}</p>
                    </div>
                    <div className="evidence-inventory-item__meta">
                      {study.population ? <span>{study.population}</span> : null}
                      {study.sample_size ? <span>{study.sample_size} participants</span> : null}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>No promoted studies currently link to this intervention.</p>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
