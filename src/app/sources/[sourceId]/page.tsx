import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Database, ExternalLink, GitBranch } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getDirectionTone, getReadableLabel, getTitleFromIdentifier } from "@/lib/evidence-format";
import { getFindingWeightLabel, getSourceAuditById } from "@/lib/site-data";

type SourceDetailPageProps = {
  params: Promise<{
    sourceId: string;
  }>;
};

function formatYearOrDate(source: { published_on?: string; year?: number }) {
  if (source.published_on) {
    return formatDate(source.published_on);
  }

  return source.year?.toString() ?? "Date not recorded";
}

function formatList(values: string[], fallback: string) {
  return values.length ? values.join(" / ") : fallback;
}

export default async function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { sourceId } = await params;
  const audit = await getSourceAuditById(sourceId);

  if (!audit) {
    notFound();
  }

  return (
    <SiteShell lastUpdated={formatDate(audit.last_public_update)}>
      <PageHero
        kicker="Source audit"
        title={audit.source.name}
        summary={audit.source.summary ?? "Source record used in the public evidence map."}
      >
        <div className="page-hero__stats">
          <span>{getReadableLabel(audit.source.source_type)}</span>
          <span>{formatYearOrDate(audit.source)}</span>
          <span>{audit.summary.finding_count} findings</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell detail-grid">
          <article className="detail-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Source metadata</span>
              <h2>{audit.source.short_name ?? getReadableLabel(audit.source.source_type)}</h2>
            </div>
            <div className="detail-list">
              <div>
                <strong>Venue</strong>
                <p>{audit.source.venue ?? "Not recorded"}</p>
              </div>
              <div>
                <strong>Authors</strong>
                <p>{formatList(audit.source.authors.slice(0, 8), "Not recorded")}</p>
              </div>
              <div>
                <strong>Identifiers</strong>
                <p>
                  {formatList(
                    [
                      audit.source.doi ? `DOI ${audit.source.doi}` : undefined,
                      audit.source.pmid ? `PMID ${audit.source.pmid}` : undefined,
                      ...audit.source.registry_ids
                    ].filter((value): value is string => Boolean(value)),
                    audit.source.id
                  )}
                </p>
              </div>
              <div>
                <strong>Tracker source ID</strong>
                <p>{audit.source.id}</p>
              </div>
            </div>
          </article>

          <aside className="detail-panel detail-panel--muted">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Retrieval</span>
              <h2>{audit.external_links.length} external links</h2>
            </div>
            <div className="citation-list">
              {audit.external_links.length ? (
                audit.external_links.map((link) => (
                  <a className="mini-link" href={link.url} key={link.url} rel="noreferrer" target="_blank">
                    <span>{link.id ? `${link.label}: ${link.id}` : link.label}</span>
                    <ExternalLink aria-hidden="true" size={14} />
                  </a>
                ))
              ) : (
                <span className="mini-link">No external retrieval URL recorded</span>
              )}
            </div>
            <a className="section-link section-link--block" href={audit.scope.canonical_path}>
              <span>Open source JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </aside>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Tracker usage</span>
            <h2>Where this source is used</h2>
          </div>
          <div className="evidence-summary-strip">
            <span>{audit.summary.finding_count} findings</span>
            <span>{audit.summary.study_count} studies</span>
            <span>{audit.summary.track_count} tracks</span>
            <span>{audit.summary.outlook_link_count} outlook links</span>
          </div>
        </div>
        <div className="page-shell related-record-grid">
          <div className="related-record-column">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Tracks</span>
                <h3>Track context</h3>
              </div>
            </div>
            <div className="related-record-list">
              {audit.tracks.length ? (
                audit.tracks.map((track) => (
                  <Link className="related-record-link" href={track.href} key={track.id}>
                    <strong>{track.name}</strong>
                    <span>{track.primary_hallmark_name ?? track.primary_hallmark_id}</span>
                  </Link>
                ))
              ) : (
                <p>No public track currently links to this source.</p>
              )}
            </div>
          </div>
          <div className="related-record-column">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Mapped biology</span>
                <h3>Hallmarks and interventions</h3>
              </div>
            </div>
            <div className="detail-list">
              <div>
                <strong>Hallmarks</strong>
                <div className="pill-row">
                  {audit.hallmarks.length ? (
                    audit.hallmarks.map((hallmark) => (
                      <Link className="mini-link" href={hallmark.href} key={hallmark.id}>
                        {hallmark.name}
                      </Link>
                    ))
                  ) : (
                    <span className="mini-link">Not linked</span>
                  )}
                </div>
              </div>
              <div>
                <strong>Interventions</strong>
                <div className="pill-row">
                  {audit.interventions.length ? (
                    audit.interventions.map((intervention) => (
                      <Link className="mini-link" href={`/interventions/${intervention.id}`} key={intervention.id}>
                        {intervention.name}
                      </Link>
                    ))
                  ) : (
                    <span className="mini-link">Not linked</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell evidence-inventory">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Findings</span>
              <h2>Evidence statements using this source</h2>
            </div>
            <span className="section-link section-link--static">{audit.findings.length} records</span>
          </div>
          <div className="evidence-inventory-list">
            {audit.findings.length ? (
              audit.findings.map((finding) => (
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
                      {finding.study_id ? <span>{getTitleFromIdentifier(finding.study_id)}</span> : null}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>No promoted findings currently cite this source.</p>
            )}
          </div>
        </div>
      </section>

      {audit.outlook_links.length ? (
        <section className="band band--alt">
          <div className="page-shell evidence-inventory">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Outlook rationale</span>
                <h2>Track reads connected to this source</h2>
              </div>
              <span className="section-link section-link--static">{audit.outlook_links.length} links</span>
            </div>
            <div className="evidence-inventory-list">
              {audit.outlook_links.map((link) => (
                <article className="evidence-inventory-item" key={`${link.outlook_id}-${link.label}`}>
                  <div className="evidence-finding__meta">
                    <span className="evidence-chip">{getReadableLabel(link.support_role)}</span>
                    <span className="evidence-chip">{link.stage_label}</span>
                    <span className="evidence-chip">{link.read_firmness_label}</span>
                  </div>
                  <div className="evidence-inventory-item__body">
                    <div>
                      <strong>{link.conclusion}</strong>
                      <p>{link.rationale}</p>
                    </div>
                    <div className="evidence-inventory-item__meta">
                      <Link className="mini-link" href={link.href}>
                        {link.track_name}
                      </Link>
                      <span>{link.label}</span>
                    </div>
                  </div>
                  {link.limitations.length ? (
                    <div className="evidence-limits">
                      <strong>Limits</strong>
                      <ul>
                        {link.limitations.map((limitation) => (
                          <li key={limitation}>{limitation}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="band">
        <div className="page-shell related-record-grid">
          <div className="related-record-column">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Studies</span>
                <h3>Study records using this source</h3>
              </div>
            </div>
            <div className="related-record-list">
              {audit.studies.length ? (
                audit.studies.map((study) => (
                  <Link className="related-record-link" href={`/studies/${study.id}`} key={study.id}>
                    <strong>{study.name}</strong>
                    <span>{study.population ?? study.model_system ?? getReadableLabel(study.study_type)}</span>
                  </Link>
                ))
              ) : (
                <p>No promoted study currently links to this source.</p>
              )}
            </div>
          </div>
          <div className="related-record-column">
            <div className="panel-header">
              <div>
                <span className="section-kicker">Machine access</span>
                <h3>Use the audit graph directly</h3>
              </div>
            </div>
            <div className="data-endpoint-list">
              <a href={audit.scope.canonical_path}>
                <Database aria-hidden="true" size={16} />
                <strong>Source audit JSON</strong>
                <span>{audit.scope.canonical_path}</span>
              </a>
              <a href="/data/source-audit.schema.json">
                <GitBranch aria-hidden="true" size={16} />
                <strong>Source audit schema</strong>
                <span>/data/source-audit.schema.json</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
