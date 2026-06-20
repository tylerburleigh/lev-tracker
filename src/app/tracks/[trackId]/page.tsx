import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical, Scale, ShieldCheck, TriangleAlert } from "lucide-react";

import { OutlookAuditPanel } from "@/components/outlook-audit-panel";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getSourceAuditHref, getSourceDisplayName } from "@/lib/evidence-format";
import {
  getActivityForTrack,
  getFindingWeightLabel,
  getFindingsForTrack,
  getHallmarkById,
  getInterventionsByIds,
  getOverallLastUpdated,
  getRecentChangesForSubject,
  getReadFirmnessLabel,
  getStageLabel,
  getStudiesForTrack,
  getTrackEvidenceConsistencyProfile,
  getTrackEvidenceQualityProfile,
  getTrackEvidenceSupport,
  getTrackById,
  getTrackCoverage,
  getTracks
} from "@/lib/site-data";

type TrackDetailPageProps = {
  params: Promise<{
    trackId: string;
  }>;
};

function getEvidenceLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getSupportRoleLabel(role: string) {
  switch (role) {
    case "supports":
      return "Supports";
    case "limits":
      return "Limits";
    case "balances":
      return "Balances";
    case "contextualizes":
      return "Context";
    default:
      return getEvidenceLabel(role);
  }
}

function getSupportRoleTone(role: string) {
  switch (role) {
    case "supports":
      return "micro-badge--mint";
    case "limits":
      return "micro-badge--red";
    case "balances":
      return "micro-badge--gold";
    case "contextualizes":
      return "micro-badge--gold";
    default:
      return "micro-badge--outline";
  }
}

function getDirectionTone(direction: string) {
  switch (direction) {
    case "positive":
      return "evidence-chip--mint";
    case "null":
    case "negative":
      return "evidence-chip--red";
    case "mixed":
    case "inconclusive":
      return "evidence-chip--gold";
    default:
      return "evidence-chip--muted";
  }
}

function getSupportRoleIcon(role: string) {
  switch (role) {
    case "supports":
      return FlaskConical;
    case "limits":
      return TriangleAlert;
    case "balances":
      return Scale;
    case "contextualizes":
      return ShieldCheck;
    default:
      return Scale;
  }
}

const interventionLabelOverrides: Record<string, string> = {
  "fasting-mimicking-diet": "fasting-mimicking diet",
  spermidine: "spermidine"
};

function getInterventionLabel(interventionId: string) {
  if (interventionLabelOverrides[interventionId]) {
    return interventionLabelOverrides[interventionId];
  }

  return interventionId
    .split("-")
    .map((word) => (["fmd", "igf", "nad"].includes(word) ? word.toUpperCase() : word))
    .join(" ");
}

function formatInlineList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const evidenceLadderStages: Array<Parameters<typeof getStageLabel>[0]> = [
  "mechanistic_plausibility",
  "animal_signal",
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
];

function getStageForEvidenceTier(evidenceTier: string): Parameters<typeof getStageLabel>[0] {
  switch (evidenceTier) {
    case "mortality_or_lifespan":
    case "human_clinical_outcome":
    case "durable_disease_or_mortality":
      return "durable_disease_or_mortality_relevance";
    case "human_function":
      return "human_functional_benefit";
    case "human_biomarker":
      return "human_biomarker_signal";
    case "animal":
      return "animal_signal";
    default:
      return "mechanistic_plausibility";
  }
}

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { trackId } = await params;
  const trackWithGroup = getTracks().find((item) => item.id === trackId);
  const taxonomyTrack = getTrackById(trackId);
  const [
    coverage,
    evidenceSupport,
    trackFindings,
    trackStudies,
    recentChanges,
    trackActivity,
    trackQualityProfile,
    trackConsistencyProfile,
    lastUpdated
  ] =
    await Promise.all([
      getTrackCoverage(trackId),
      getTrackEvidenceSupport(trackId),
      getFindingsForTrack(trackId),
      getStudiesForTrack(trackId),
      getRecentChangesForSubject("track", trackId),
      getActivityForTrack(trackId),
      getTrackEvidenceQualityProfile(trackId),
      getTrackEvidenceConsistencyProfile(trackId),
      getOverallLastUpdated()
    ]);

  if (!trackWithGroup || !taxonomyTrack) {
    notFound();
  }

  const hallmark = getHallmarkById(trackWithGroup.primaryHallmarkId);
  const uniqueFindings = Array.from(
    new Map(evidenceSupport.flatMap((item) => item.findings).map((finding) => [finding.id, finding])).values()
  );
  const uniqueSources = Array.from(
    new Map(evidenceSupport.flatMap((item) => item.sources).map((source) => [source.id, source])).values()
  );
  const citedInterventionIds = Array.from(new Set(uniqueFindings.flatMap((finding) => finding.interventionIds)));
  const citedInterventions = await getInterventionsByIds(citedInterventionIds);
  const interventionNameById = new Map(citedInterventions.map((intervention) => [intervention.id, intervention.name]));
  const getInterventionDisplayName = (interventionId: string) =>
    interventionNameById.get(interventionId) ?? getInterventionLabel(interventionId);
  const citedInterventionLabels = Array.from(
    new Set(citedInterventionIds.map((interventionId) => getInterventionDisplayName(interventionId)))
  );

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Track detail"
        title={taxonomyTrack.name}
        summary={taxonomyTrack.summary}
      >
        <div className="page-hero__stats">
          <span>{hallmark?.name ?? trackWithGroup.primaryHallmarkId}</span>
          <span>{coverage.stage ? getStageLabel(coverage.stage) : "Not rated yet"}</span>
        </div>
      </PageHero>

      <section className="band">
        <OutlookAuditPanel coverage={coverage} evidenceSupport={evidenceSupport} />
      </section>

      <section className="band band--compact">
        <div className="page-shell track-scope-strip">
          <aside className="detail-panel detail-panel--muted track-scope-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Track scope</span>
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
            {citedInterventionLabels.length ? (
              <div className="evidence-scope-note">
                <strong>Evidence shown below</strong>
                <p>
                  Cited findings on this page currently cover {formatInlineList(citedInterventionLabels)}. Examples
                  above define the track scope; they count as support only when they appear in the evidence audit.
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {trackQualityProfile.finding_count ? (
        <section className="band band--compact">
          <div className="page-shell evidence-quality-profile">
            <div className="evidence-quality-profile__main">
              <span className="section-kicker">Evidence quality</span>
              <h2>Limitation profile</h2>
              <p>
                Derived from the promoted finding records for this track: source type, study design, endpoint category,
                registry status, direction, confidence, and recorded caveats.
              </p>
              <div className="evidence-source-row">
                <Link className="mini-link" href={trackQualityProfile.page_path}>
                  Open filtered evidence
                </Link>
                <a className="mini-link" href={trackQualityProfile.data_path}>
                  Quality JSON
                </a>
              </div>
            </div>
            <div className="evidence-quality-profile__grid">
              <article>
                <h3>Quality classes</h3>
                <div className="evidence-quality-profile__rows">
                  {trackQualityProfile.quality_classes.map((item) => (
                    <div key={item.value}>
                      <strong>{item.label}</strong>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </article>
              <article>
                <h3>Top limitations</h3>
                <div className="evidence-quality-profile__rows">
                  {trackQualityProfile.limitations.length ? (
                    trackQualityProfile.limitations.map((item) => (
                      <div key={item.value}>
                        <strong>{item.label}</strong>
                        <span>{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p>No limitation tags are currently derived.</p>
                  )}
                </div>
              </article>
              <article>
                <h3>Human relevance</h3>
                <div className="evidence-quality-profile__rows">
                  {trackQualityProfile.human_relevance.length ? (
                    trackQualityProfile.human_relevance.map((item) => (
                      <div key={item.value}>
                        <strong>{item.label}</strong>
                        <span>{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p>No human-relevance flags are currently derived.</p>
                  )}
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      {trackConsistencyProfile ? (
        <section className="band band--compact">
          <div className="page-shell evidence-quality-profile evidence-consistency-profile">
            <div className="evidence-quality-profile__main">
              <span className="section-kicker">Evidence consistency</span>
              <h2>{trackConsistencyProfile.consistency_class_label}</h2>
              <p>{trackConsistencyProfile.consistency_reason}</p>
              <div className="evidence-source-row">
                <Link className="mini-link" href={trackConsistencyProfile.page_path}>
                  Open filtered evidence
                </Link>
                <a className="mini-link" href={trackConsistencyProfile.data_path}>
                  Conflicts JSON
                </a>
              </div>
            </div>
            <div className="evidence-quality-profile__grid">
              <article>
                <h3>Class</h3>
                <div className="evidence-consistency-summary">
                  <strong>{trackConsistencyProfile.consistency_class_label}</strong>
                  <p>{trackConsistencyProfile.consistency_class_meaning}</p>
                </div>
              </article>
              <article>
                <h3>Pattern flags</h3>
                <div className="evidence-quality-profile__rows">
                  {trackConsistencyProfile.patterns.length ? (
                    trackConsistencyProfile.patterns.map((item) => (
                      <div key={item.value}>
                        <strong>{item.label}</strong>
                      </div>
                    ))
                  ) : (
                    <p>No conflict or replication pattern is currently derived.</p>
                  )}
                </div>
              </article>
              <article>
                <h3>Direction mix</h3>
                <div className="evidence-quality-profile__rows">
                  {trackConsistencyProfile.direction_counts.map((item) => (
                    <div key={item.value}>
                      <strong>{item.label}</strong>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      <section className="band band--alt">
        <div className="page-shell section-header evidence-section-header">
          <div>
            <span className="section-kicker">Evidence ladder</span>
            <h2>Promoted findings by stage</h2>
          </div>
          <div className="evidence-summary-strip">
            <span>{trackFindings.length} findings</span>
            <span>{trackStudies.length} studies</span>
            <span>{coverage.stage ? getStageLabel(coverage.stage) : "Not rated yet"}</span>
          </div>
        </div>
        <div className="page-shell evidence-ladder">
          {evidenceLadderStages.map((stage) => {
            const findingsForStage = trackFindings.filter((finding) => getStageForEvidenceTier(finding.evidence_tier) === stage);

            return (
              <article
                className={`evidence-ladder-stage ${coverage.stage === stage ? "evidence-ladder-stage--active" : ""}`}
                key={stage}
              >
                <div className="evidence-ladder-stage__header">
                  <h3>{getStageLabel(stage)}</h3>
                  <span>{findingsForStage.length}</span>
                </div>
                <div className="evidence-ladder-stage__body">
                  {findingsForStage.length ? (
                    findingsForStage.map((finding) => (
                      <Link className="evidence-ladder-finding" href={`/findings/${finding.id}`} key={finding.id}>
                        <span className={`evidence-chip ${getDirectionTone(finding.direction)}`}>
                          {getEvidenceLabel(finding.direction)}
                        </span>
                        <strong>{finding.name}</strong>
                      </Link>
                    ))
                  ) : (
                    <p>No promoted findings at this level.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {evidenceSupport.length ? (
        <section className="band band--alt">
          <div className="page-shell section-header evidence-section-header">
            <div>
              <span className="section-kicker">Evidence basis</span>
              <h2>Why these ratings?</h2>
            </div>
            <div className="evidence-summary-strip">
              <span>{coverage.stage ? getStageLabel(coverage.stage) : "Not rated yet"}</span>
              {coverage.confidence ? <span>Read: {getReadFirmnessLabel(coverage.confidence)}</span> : null}
              <span>{evidenceSupport.length} rating rationales</span>
              <span>{uniqueFindings.length} unique findings</span>
              <span>{uniqueSources.length} sources</span>
            </div>
          </div>
          <div className="page-shell evidence-bridge">
            {coverage.whatWouldChangeTheRating?.length ? (
              <article className="evidence-next-card">
                <div>
                  <span className="section-kicker">Evidence bar</span>
                  <h3>What would change this rating?</h3>
                </div>
                <ul>
                  {coverage.whatWouldChangeTheRating.map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
              </article>
            ) : null}
            {evidenceSupport.map((item) => {
              const RoleIcon = getSupportRoleIcon(item.supportRole);

              return (
                <article className={`evidence-card evidence-card--${item.supportRole}`} key={item.label}>
                  <div className="evidence-card__header">
                    <div className="evidence-card__title">
                      <span className="evidence-card__icon">
                        <RoleIcon aria-hidden="true" size={18} />
                      </span>
                      <div>
                        <span className="section-kicker">{item.label}</span>
                        <h3>{item.conclusion}</h3>
                      </div>
                    </div>
                    <span className={`micro-badge ${getSupportRoleTone(item.supportRole)}`}>
                      {getSupportRoleLabel(item.supportRole)}
                    </span>
                  </div>
                  <div className="evidence-impact">
                    <span>Impact</span>
                    <p>{item.rationale}</p>
                  </div>
                  <div className="evidence-chip-grid">
                    {item.findings.map((finding) => (
                      <Link className="evidence-finding-chip" href={`/findings/${finding.id}`} key={finding.id}>
                        <span className={`evidence-chip ${getDirectionTone(finding.direction)}`}>
                          {getEvidenceLabel(finding.direction)}
                        </span>
                        <strong>{finding.name}</strong>
                      </Link>
                    ))}
                  </div>
                  {item.limitations.length ? (
                    <div className="evidence-limits">
                      <strong>Limits</strong>
                      <ul>
                        {item.limitations.map((limitation) => (
                          <li key={limitation}>{limitation}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="evidence-source-row">
                    {item.sources.map((source) => (
                      <Link className="mini-link" href={getSourceAuditHref(source)} key={source.id}>
                        {getSourceDisplayName(source)}
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="page-shell evidence-inventory">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Evidence inventory</span>
                <h2>Findings used on this page</h2>
              </div>
              <span className="section-link section-link--static">{uniqueFindings.length} unique findings</span>
            </div>
            <div className="evidence-inventory-list">
              {uniqueFindings.map((finding) => (
                <article className="evidence-inventory-item" id={finding.id} key={finding.id}>
                  <div className="evidence-finding__meta">
                    <span className="evidence-chip">{getEvidenceLabel(finding.evidenceTier)}</span>
                    <span className={`evidence-chip ${getDirectionTone(finding.direction)}`}>
                      {getEvidenceLabel(finding.direction)}
                    </span>
                    <span className="evidence-chip">{getFindingWeightLabel(finding.confidence)}</span>
                  </div>
                  <div className="evidence-inventory-item__body">
                    <div>
                      <strong>{finding.name}</strong>
                      <p>{finding.statement}</p>
                      {finding.quantitativeNote ? (
                        <p className="evidence-finding__quant">{finding.quantitativeNote}</p>
                      ) : null}
                    </div>
                    <div className="evidence-inventory-item__meta">
                      {finding.study ? (
                        <Link className="mini-link" href={`/studies/${finding.study.id}`}>
                          {finding.study.name}
                        </Link>
                      ) : null}
                      {finding.interventionIds.length ? (
                        <div className="pill-row">
                          {finding.interventionIds.map((interventionId) => (
                            <Link className="mini-link" href={`/interventions/${interventionId}`} key={interventionId}>
                              {getInterventionDisplayName(interventionId)}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      {finding.source ? (
                        <Link className="mini-link" href={getSourceAuditHref(finding.source)}>
                          {getSourceDisplayName(finding.source)}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {finding.caveats.length ? (
                    <div className="evidence-limits">
                      <strong>Caveats</strong>
                      <ul>
                        {finding.caveats.map((caveat) => (
                          <li key={caveat}>{caveat}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
          {uniqueSources.length ? (
            <div className="page-shell evidence-source-index">
              <div>
                <span className="section-kicker">Sources cited on this page</span>
                <p>These are the papers linked from the rating audit and finding inventory above.</p>
              </div>
              <div className="citation-list">
                {uniqueSources.map((source) => (
                  <Link className="mini-link" href={getSourceAuditHref(source)} key={source.id}>
                    {getSourceDisplayName(source)}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="band band--alt">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Recent changes</span>
            <h2>Published movement</h2>
          </div>
          <span className="section-link section-link--static">{recentChanges.length + trackActivity.length} items</span>
        </div>
        <div className="page-shell hallmark-activity-grid">
          {[...recentChanges, ...trackActivity].length ? (
            <>
              {recentChanges.map((change) => (
                <Link className="hallmark-activity-card" href={change.href} key={change.id}>
                  <div className="hallmark-module-card__icon">
                    <ShieldCheck aria-hidden="true" size={18} />
                  </div>
                  <div>
                    <div className="activity-card__top">
                      <span className="micro-badge micro-badge--mint">{change.changeType}</span>
                      <time dateTime={change.date}>{formatDate(change.date)}</time>
                    </div>
                    <h3>{change.title}</h3>
                    <p>{change.whyItMatters}</p>
                  </div>
                </Link>
              ))}
              {trackActivity.map((item) => (
                <Link className="hallmark-activity-card" href={item.href} key={item.id}>
                  <div className="hallmark-module-card__icon">
                    <FlaskConical aria-hidden="true" size={18} />
                  </div>
                  <div>
                    <div className="activity-card__top">
                      <span className="micro-badge micro-badge--outline">{item.lane}</span>
                      <time dateTime={item.date}>{formatDate(item.date)}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <span className="evidence-chip">{item.affectsOutlook ? "Affects outlook" : "Context only"}</span>
                  </div>
                </Link>
              ))}
            </>
          ) : (
            <div className="hallmark-empty-module">
              <div className="hallmark-module-card__icon">
                <TriangleAlert aria-hidden="true" size={18} />
              </div>
              <div>
                <strong>No recent public movement.</strong>
                <p>This track is listed in the taxonomy, but no recent activity item has been promoted.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="band">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Related records</span>
            <h2>Studies and findings</h2>
          </div>
          <div className="evidence-summary-strip">
            <span>{trackStudies.length} studies</span>
            <span>{trackFindings.length} findings</span>
          </div>
        </div>
        <div className="page-shell related-record-grid">
          <div className="related-record-column">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Studies</span>
                <h3>Promoted study links</h3>
              </div>
            </div>
            <div className="related-record-list">
              {trackStudies.length ? (
                trackStudies.map((study) => (
                  <Link className="related-record-link" href={`/studies/${study.id}`} key={study.id}>
                    <strong>{study.name}</strong>
                    <span>{study.population ?? getEvidenceLabel(study.study_type)}</span>
                  </Link>
                ))
              ) : (
                <p>No promoted studies currently link to this track.</p>
              )}
            </div>
          </div>
          <div className="related-record-column">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Findings</span>
                <h3>Promoted finding links</h3>
              </div>
            </div>
            <div className="related-record-list">
              {trackFindings.length ? (
                trackFindings.map((finding) => (
                  <Link className="related-record-link" href={`/findings/${finding.id}`} key={finding.id}>
                    <strong>{finding.name}</strong>
                    <span>{getEvidenceLabel(finding.evidence_tier)} / {getEvidenceLabel(finding.direction)}</span>
                  </Link>
                ))
              ) : (
                <p>No promoted findings currently link to this track.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell">
          <aside className="detail-panel detail-panel--muted related-panel">
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
