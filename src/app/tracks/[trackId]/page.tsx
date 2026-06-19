import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FlaskConical, Scale, ShieldCheck, TriangleAlert } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getActivityForTrack,
  getCoverageConfidenceLabel,
  getCoverageVerdictLabel,
  getCoverageVerdictPlainMeaning,
  getFindingWeightLabel,
  getFindingsForTrack,
  getHallmarkById,
  getInterventionsByIds,
  getMomentumLabel,
  getMomentumPlainMeaning,
  getOverallLastUpdated,
  getRecentChangesForSubject,
  getReadFirmnessLabel,
  getReadFirmnessPlainMeaning,
  getResearchDensityLabel,
  getResearchDensityPlainMeaning,
  getStageLabel,
  getStagePlainMeaning,
  getStudiesForTrack,
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

function getSourceHref(sourceId: string) {
  const pubmedMatch = sourceId.match(/^pmid-([0-9]+)$/i);
  if (pubmedMatch) {
    return `https://pubmed.ncbi.nlm.nih.gov/${pubmedMatch[1]}/`;
  }

  const nctMatch = sourceId.match(/^(nct[0-9]+)$/i);
  if (nctMatch) {
    return `https://clinicaltrials.gov/study/${nctMatch[1].toUpperCase()}`;
  }

  return undefined;
}

function getSourceDisplayName(source: { id: string; short_name?: string; name: string; year?: number }) {
  return source.short_name ? `${source.short_name}${source.year ? ` (${source.year})` : ""}` : source.name;
}

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
  const [coverage, evidenceSupport, trackFindings, trackStudies, recentChanges, trackActivity, lastUpdated] =
    await Promise.all([
      getTrackCoverage(trackId),
      getTrackEvidenceSupport(trackId),
      getFindingsForTrack(trackId),
      getStudiesForTrack(trackId),
      getRecentChangesForSubject("track", trackId),
      getActivityForTrack(trackId),
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
        <div className="page-shell hallmark-outlook-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Interpretation note</span>
              <h2>{coverage.stage ? getStageLabel(coverage.stage) : "Not rated yet"}</h2>
            </div>
            <p>{coverage.interpretation}</p>
            {coverage.stage ? (
              <div className="plain-meaning">
                <strong>Plain meaning</strong>
                <p>{getStagePlainMeaning(coverage.stage)}</p>
              </div>
            ) : null}
            <div className="detail-list">
              <div>
                <strong>Momentum</strong>
                <p>{coverage.momentum ? getMomentumLabel(coverage.momentum) : "Uncertain"}</p>
                {coverage.momentum ? <span>{getMomentumPlainMeaning(coverage.momentum)}</span> : null}
              </div>
              <div>
                <strong>How firm is this read?</strong>
                <p>{coverage.confidence ? getReadFirmnessLabel(coverage.confidence) : "Not rated yet"}</p>
                {coverage.confidence ? <span>{getReadFirmnessPlainMeaning(coverage.confidence)}</span> : null}
              </div>
              <div>
                <strong>Map completeness</strong>
                <p>{coverage.coverageVerdict ? getCoverageVerdictLabel(coverage.coverageVerdict) : "Not assessed yet"}</p>
                {coverage.coverageVerdict ? <span>{getCoverageVerdictPlainMeaning(coverage.coverageVerdict)}</span> : null}
              </div>
              <div>
                <strong>Research density</strong>
                <p>
                  {coverage.observedResearchDensity
                    ? getResearchDensityLabel(coverage.observedResearchDensity)
                    : "Not assessed yet"}
                </p>
                {coverage.observedResearchDensity ? (
                  <span>{getResearchDensityPlainMeaning(coverage.observedResearchDensity)}</span>
                ) : null}
              </div>
            </div>
          </article>
          <article className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Evidence gaps and questions</span>
              <h2>What would change this?</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Main evidence gap</strong>
                <p>{coverage.evidenceGap ?? "Not enough promoted evidence has been summarized for this track yet."}</p>
              </div>
              <div>
                <strong>Strongest current evidence</strong>
                <p>{coverage.strongestEvidence ?? "No strongest evidence summary has been promoted yet."}</p>
              </div>
              <div>
                <strong>Open rating questions</strong>
                {coverage.whatWouldChangeTheRating?.length ? (
                  <ul className="bullet-list">
                    {coverage.whatWouldChangeTheRating.slice(0, 3).map((criterion) => (
                      <li key={criterion}>{criterion}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No explicit rating-change criteria have been promoted yet.</p>
                )}
              </div>
              {coverage.coverageConfidence || coverage.knownGapCount !== undefined ? (
                <div>
                  <strong>Coverage read</strong>
                  <p>
                    {coverage.coverageConfidence ? getCoverageConfidenceLabel(coverage.coverageConfidence) : "Map confidence not recorded"}
                    {coverage.knownGapCount !== undefined ? ` with ${coverage.knownGapCount} known gap${coverage.knownGapCount === 1 ? "" : "s"}` : ""}
                    {coverage.highPriorityGapCount ? `, including ${coverage.highPriorityGapCount} high-priority gap${coverage.highPriorityGapCount === 1 ? "" : "s"}` : ""}
                    .
                  </p>
                </div>
              ) : null}
            </div>
          </article>
          <aside className="detail-panel detail-panel--muted">
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
                    {item.sources.map((source) => {
                      const href = source.urls?.[0] ?? getSourceHref(source.id);

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
                        <a
                          className="mini-link"
                          href={finding.source.urls?.[0] ?? getSourceHref(finding.source.id)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span>{getSourceDisplayName(finding.source)}</span>
                          <ExternalLink aria-hidden="true" size={14} />
                        </a>
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
                {uniqueSources.map((source) => {
                  const href = source.urls?.[0] ?? getSourceHref(source.id);

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
