import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FlaskConical, Scale, ShieldCheck, TriangleAlert } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getConfidenceLabel,
  getHallmarkById,
  getMomentumLabel,
  getOverallLastUpdated,
  getStageLabel,
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

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { trackId } = await params;
  const trackWithGroup = getTracks().find((item) => item.id === trackId);
  const taxonomyTrack = getTrackById(trackId);
  const [coverage, evidenceSupport, lastUpdated] = await Promise.all([
    getTrackCoverage(trackId),
    getTrackEvidenceSupport(trackId),
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
  const citedInterventionLabels = Array.from(
    new Set(
      uniqueFindings
        .flatMap((finding) => finding.interventionIds)
        .map((interventionId) => getInterventionLabel(interventionId))
    )
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

      {evidenceSupport.length ? (
        <section className="band band--alt">
          <div className="page-shell section-header evidence-section-header">
            <div>
              <span className="section-kicker">Evidence basis</span>
              <h2>Why these ratings?</h2>
            </div>
            <div className="evidence-summary-strip">
              <span>{coverage.stage ? getStageLabel(coverage.stage) : coverage.statusLabel}</span>
              {coverage.confidence ? <span>{getConfidenceLabel(coverage.confidence)}</span> : null}
              <span>{evidenceSupport.length} rating rationales</span>
              <span>{uniqueFindings.length} unique findings</span>
              <span>{uniqueSources.length} sources</span>
            </div>
          </div>
          <div className="page-shell evidence-bridge">
            {coverage.ratingChangeCriteria?.length ? (
              <article className="evidence-next-card">
                <div>
                  <span className="section-kicker">Evidence bar</span>
                  <h3>What would change this rating?</h3>
                </div>
                <ul>
                  {coverage.ratingChangeCriteria.map((criterion) => (
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
                      <a className="evidence-finding-chip" href={`#${finding.id}`} key={finding.id}>
                        <span className={`evidence-chip ${getDirectionTone(finding.direction)}`}>
                          {getEvidenceLabel(finding.direction)}
                        </span>
                        <strong>{finding.name}</strong>
                      </a>
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
                    <span className="evidence-chip">{getConfidenceLabel(finding.confidence)}</span>
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
                      {finding.study ? <span>{finding.study.name}</span> : null}
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
