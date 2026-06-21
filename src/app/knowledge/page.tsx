import Link from "next/link";
import { ArrowRight, Database, FileJson, Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getKnowledgeBaseIndexExport, getOverallLastUpdated } from "@/lib/site-data";

type KnowledgeSearchParams = {
  q?: string | string[];
  entity_type?: string | string[];
  limit?: string | string[];
};

type KnowledgePageProps = {
  searchParams?: Promise<KnowledgeSearchParams>;
};

type KnowledgeEntity = {
  entity_type: string;
  id: string;
  label: string;
  summary?: string;
  aliases?: string[];
  paths: Record<string, string>;
  hallmark_ids?: string[];
  track_ids?: string[];
  source_ids?: string[];
  study_ids?: string[];
  finding_ids?: string[];
  intervention_ids?: string[];
  trial_ids?: string[];
  registry_ids?: string[];
  outlook?: {
    stage_label?: string;
    momentum_label?: string;
    read_firmness_label?: string;
    last_updated?: string;
  } | null;
  coverage?: {
    coverage_verdict_label?: string;
    coverage_confidence_label?: string;
    observed_research_density_label?: string;
    last_coverage_assessed_at?: string;
  } | null;
  evidence_counts?: Record<string, number>;
  claim_boundary?: {
    boundary_class_label?: string;
    overclaim_risks?: Array<{ label: string; value: string }>;
  } | null;
  gap_profile?: {
    severity_labels?: string[];
    known_gap_count?: number;
    high_priority_gap_count?: number;
    trial_sensitive?: boolean;
  } | null;
  source_type?: string;
  year?: number;
  evidence_tier?: string;
  direction?: string;
  confidence?: string;
  is_human_evidence?: boolean;
  status?: string;
  phase?: string;
  results_status?: string;
  watch_status?: string;
  boundary_class_label?: string;
  overclaim_risks?: Array<{ label: string; value: string }>;
  required_caveat_count?: number;
  unsupported_claim_count?: number;
  severity_labels?: string[];
  known_gap_count?: number;
  high_priority_gap_count?: number;
  gap_item_count?: number;
};

type EntityBucket = {
  value: string;
  label: string;
  rows: KnowledgeEntity[];
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatEntityType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getKnowledgePath(filters: { q?: string; entity_type?: string; limit?: number }) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.entity_type && filters.entity_type !== "tracks") {
    params.set("entity_type", filters.entity_type);
  }

  if (filters.limit && filters.limit !== 50) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();
  return query ? `/knowledge?${query}` : "/knowledge";
}

function parseLimit(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(10, Math.min(200, parsed));
}

function matchesQuery(entity: KnowledgeEntity, query: string) {
  if (!query) {
    return true;
  }

  const haystack = JSON.stringify(entity).toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function firstItems<T>(items: T[] | undefined, limit: number) {
  return (items ?? []).slice(0, limit);
}

function getPrimaryHref(entity: KnowledgeEntity) {
  return entity.paths.page ?? entity.paths.primary_data ?? Object.values(entity.paths)[0] ?? "#";
}

function getPathLabel(key: string) {
  const labels: Record<string, string> = {
    primary_data: "Data",
    evidence_map: "Map",
    evidence_index: "Evidence",
    source_audit: "Source audit",
    scoped_track: "Track JSON",
    claim_guardrails: "Guardrails",
    claim_audit: "Claim audit",
    review_packet: "Review packet",
    evidence_gaps: "Gaps",
    coverage_audit: "Coverage"
  };

  return labels[key] ?? formatEntityType(key);
}

function getEntityBadges(entity: KnowledgeEntity) {
  return [
    formatEntityType(entity.entity_type),
    entity.outlook?.stage_label,
    entity.outlook?.read_firmness_label,
    entity.coverage?.coverage_verdict_label,
    entity.coverage?.observed_research_density_label,
    entity.claim_boundary?.boundary_class_label,
    entity.boundary_class_label,
    entity.source_type,
    entity.evidence_tier,
    entity.direction,
    entity.confidence,
    entity.watch_status,
    entity.results_status,
    entity.gap_profile?.severity_labels?.[0],
    entity.severity_labels?.[0]
  ].filter(Boolean) as string[];
}

function getLinkedIdGroups(entity: KnowledgeEntity) {
  return [
    { label: "Hallmarks", values: entity.hallmark_ids },
    { label: "Tracks", values: entity.track_ids },
    { label: "Sources", values: entity.source_ids },
    { label: "Studies", values: entity.study_ids },
    { label: "Findings", values: entity.finding_ids },
    { label: "Interventions", values: entity.intervention_ids },
    { label: "Trials", values: entity.trial_ids },
    { label: "Registries", values: entity.registry_ids }
  ].filter((group) => (group.values?.length ?? 0) > 0);
}

function getContextRows(entity: KnowledgeEntity) {
  const rows: string[] = [];

  if (entity.evidence_counts) {
    const countRows = Object.entries(entity.evidence_counts)
      .filter(([, count]) => count > 0)
      .slice(0, 4)
      .map(([key, count]) => `${formatEntityType(key.replace(/_count$/, ""))}: ${formatNumber(count)}`);

    if (countRows.length) {
      rows.push(countRows.join(" / "));
    }
  }

  if (entity.claim_boundary?.overclaim_risks?.length) {
    rows.push(`Risks: ${firstItems(entity.claim_boundary.overclaim_risks, 2).map((risk) => risk.label).join(" / ")}`);
  }

  if (entity.overclaim_risks?.length) {
    rows.push(`Risks: ${firstItems(entity.overclaim_risks, 2).map((risk) => risk.label).join(" / ")}`);
  }

  if (entity.gap_profile) {
    rows.push(
      `${formatNumber(entity.gap_profile.known_gap_count ?? 0)} gaps / ${formatNumber(
        entity.gap_profile.high_priority_gap_count ?? 0
      )} high priority`
    );
  }

  if (typeof entity.known_gap_count === "number") {
    rows.push(
      `${formatNumber(entity.known_gap_count)} gaps / ${formatNumber(
        entity.high_priority_gap_count ?? 0
      )} high priority`
    );
  }

  if (entity.source_type || entity.year) {
    rows.push([entity.source_type, entity.year].filter(Boolean).join(" / "));
  }

  if (entity.is_human_evidence) {
    rows.push("Human evidence");
  }

  if (entity.status || entity.phase || entity.results_status) {
    rows.push([entity.status, entity.phase, entity.results_status].filter(Boolean).join(" / "));
  }

  if (typeof entity.required_caveat_count === "number" || typeof entity.unsupported_claim_count === "number") {
    rows.push(
      `${formatNumber(entity.required_caveat_count ?? 0)} caveats / ${formatNumber(
        entity.unsupported_claim_count ?? 0
      )} unsupported claims`
    );
  }

  return rows;
}

function getPathEntries(entity: KnowledgeEntity) {
  return Object.entries(entity.paths).filter(([key]) => key !== "page");
}

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [lastUpdated, knowledgeBase] = await Promise.all([getOverallLastUpdated(), getKnowledgeBaseIndexExport()]);
  const requestedType = getSingleSearchParam(resolvedSearchParams.entity_type) || "tracks";
  const selectedQuery = getSingleSearchParam(resolvedSearchParams.q).trim();
  const selectedLimit = parseLimit(getSingleSearchParam(resolvedSearchParams.limit));
  const entityBuckets: EntityBucket[] = [
    { value: "hallmarks", label: "Hallmarks", rows: knowledgeBase.entity_indexes.hallmarks as KnowledgeEntity[] },
    { value: "tracks", label: "Tracks", rows: knowledgeBase.entity_indexes.tracks as KnowledgeEntity[] },
    { value: "interventions", label: "Interventions", rows: knowledgeBase.entity_indexes.interventions as KnowledgeEntity[] },
    { value: "studies", label: "Studies", rows: knowledgeBase.entity_indexes.studies as KnowledgeEntity[] },
    { value: "sources", label: "Sources", rows: knowledgeBase.entity_indexes.sources as KnowledgeEntity[] },
    { value: "findings", label: "Findings", rows: knowledgeBase.entity_indexes.findings as KnowledgeEntity[] },
    { value: "trials", label: "Trials", rows: knowledgeBase.entity_indexes.trials as KnowledgeEntity[] },
    { value: "claim_guardrails", label: "Claim guardrails", rows: knowledgeBase.entity_indexes.claim_guardrails as KnowledgeEntity[] },
    {
      value: "evidence_gap_profiles",
      label: "Gap profiles",
      rows: knowledgeBase.entity_indexes.evidence_gap_profiles as KnowledgeEntity[]
    }
  ];
  const selectedType =
    requestedType === "all" || entityBuckets.some((bucket) => bucket.value === requestedType) ? requestedType : "tracks";
  const allEntities = entityBuckets.flatMap((bucket) => bucket.rows);
  const selectedBucket = entityBuckets.find((bucket) => bucket.value === selectedType);
  const rawRows = selectedType === "all" ? allEntities : selectedBucket?.rows ?? knowledgeBase.entity_indexes.tracks;
  const filteredRows = (rawRows as KnowledgeEntity[]).filter((entity) => matchesQuery(entity, selectedQuery));
  const visibleRows = filteredRows.slice(0, selectedLimit);
  const reviewFreshnessCounts = knowledgeBase.review_state.review_freshness_counts.filter((item) => item.count > 0);
  const priorityTracks = knowledgeBase.review_state.priority_track_queue.slice(0, 4);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Knowledge base"
        title="Browse the LEV knowledge base"
        summary="A human-facing directory for tracker entities, provenance paths, claim boundaries, evidence gaps, and review state."
      >
        <div className="page-hero__stats">
          <span>{formatNumber(knowledgeBase.summary.track_count)} tracks</span>
          <span>{formatNumber(knowledgeBase.summary.finding_count)} findings</span>
          <span>{formatNumber(knowledgeBase.summary.source_count)} sources</span>
          <span>{formatNumber(knowledgeBase.summary.study_count)} studies</span>
          <span>{formatNumber(knowledgeBase.summary.trial_count)} trials</span>
          <span>{formatNumber(knowledgeBase.summary.claim_review_issue_count)} review issues</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell data-scoped-layout knowledge-overview">
          <div className="data-scoped-main">
            <FileJson aria-hidden="true" size={18} />
            <span className="section-kicker">Discovery layer</span>
            <h2>One index for public pages and structured records</h2>
            <p>
              The browser is generated from the same index as the JSON endpoint, so each row keeps stable IDs, public
              page links, scoped data exports, claim-safety metadata, and evidence-gap context together.
            </p>
            <a className="section-link section-link--block" href={knowledgeBase.canonical_path}>
              <Database aria-hidden="true" size={16} />
              <span>Open knowledge-base JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a className="section-link section-link--block" href={knowledgeBase.schema_url}>
              <span>Open schema</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="data-scoped-grid knowledge-endpoint-grid">
            {knowledgeBase.manifest.endpoints.slice(0, 6).map((endpoint) => (
              <a className="data-scoped-card" href={endpoint.path} key={endpoint.id}>
                <strong>{endpoint.label}</strong>
                <span>{endpoint.path}</span>
                <p>{endpoint.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--compact">
        <div className="page-shell knowledge-review-strip" aria-label="Knowledge-base review state">
          <div className="knowledge-review-strip__main">
            <span className="section-kicker">Review state</span>
            <h2>Claim freshness stays attached to the directory</h2>
          </div>
          <div className="knowledge-review-strip__counts">
            {reviewFreshnessCounts.map((item) => (
              <a className="claims-risk-pill" href={knowledgeBase.review_state.claim_audit_path} key={item.value}>
                <strong>{item.label}</strong>
                <span>{formatNumber(item.count)} issues</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {priorityTracks.length ? (
        <section className="band">
          <div className="page-shell data-scoped-layout knowledge-priority-layout">
            <div className="data-scoped-main">
              <span className="section-kicker">Priority queue</span>
              <h2>Tracks that most need claim review</h2>
              <p>
                The queue is pulled from the claim audit summary and keeps reviewer-facing paths next to the affected
                track pages.
              </p>
            </div>
            <div className="claim-priority-list">
              {priorityTracks.map((track) => (
                <Link className="claim-priority-row" href={track.review_packet_path} key={track.track_id}>
                  <div>
                    <strong>{track.track_name}</strong>
                    <p>{track.track_id}</p>
                  </div>
                  <div className="claim-priority-row__metrics">
                    <span className="micro-badge micro-badge--gold">{track.priority_score} priority</span>
                    <span className="micro-badge micro-badge--outline">{track.unresolved_issue_count} unresolved</span>
                    <span className="micro-badge micro-badge--outline">
                      {track.changed_since_review_count} changed
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="band band--alt">
        <div className="page-shell track-search evidence-search knowledge-search">
          <div className="knowledge-type-tabs" aria-label="Knowledge entity types">
            <Link
              className={selectedType === "all" ? "knowledge-type-tabs__item is-active" : "knowledge-type-tabs__item"}
              href={getKnowledgePath({ q: selectedQuery, entity_type: "all", limit: selectedLimit })}
            >
              <strong>{formatNumber(allEntities.length)}</strong>
              <span>All</span>
            </Link>
            {entityBuckets.map((bucket) => (
              <Link
                className={
                  selectedType === bucket.value ? "knowledge-type-tabs__item is-active" : "knowledge-type-tabs__item"
                }
                href={getKnowledgePath({ q: selectedQuery, entity_type: bucket.value, limit: selectedLimit })}
                key={bucket.value}
              >
                <strong>{formatNumber(bucket.rows.length)}</strong>
                <span>{bucket.label}</span>
              </Link>
            ))}
          </div>

          <form className="track-search__form evidence-search__form knowledge-search__form" action="/knowledge">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Track, source, finding, study, gap, claim, ID, or path"
                  defaultValue={selectedQuery}
                />
              </div>
            </label>
            <label className="track-search__field">
              <span>Entity type</span>
              <select name="entity_type" defaultValue={selectedType}>
                <option value="all">All entities</option>
                {entityBuckets.map((bucket) => (
                  <option value={bucket.value} key={bucket.value}>
                    {bucket.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Rows</span>
              <select name="limit" defaultValue={String(selectedLimit)}>
                <option value="25">25 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
                <option value="200">200 rows</option>
              </select>
            </label>
            <div className="track-search__actions">
              <button className="action-button" type="submit">
                <Search aria-hidden="true" size={16} />
                <span>Filter</span>
              </button>
              <Link className="action-button action-button--secondary" href="/knowledge">
                <X aria-hidden="true" size={16} />
                <span>Reset</span>
              </Link>
            </div>
          </form>

          <div className="track-search__summary">
            <strong>{formatNumber(filteredRows.length)}</strong>
            <span>
              matching {selectedType === "all" ? "entities" : selectedBucket?.label.toLowerCase() ?? "tracks"}
            </span>
          </div>

          <div className="expert-track-scan knowledge-entity-scan">
            <div className="expert-track-table-wrap">
              <table className="expert-track-table knowledge-entity-table">
                <thead>
                  <tr>
                    <th scope="col">Entity</th>
                    <th scope="col">Metadata</th>
                    <th scope="col">Provenance paths</th>
                    <th scope="col">Linked IDs</th>
                    <th scope="col">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((entity) => {
                    const pathEntries = getPathEntries(entity);
                    const badges = getEntityBadges(entity);
                    const linkedIdGroups = getLinkedIdGroups(entity);
                    const contextRows = getContextRows(entity);

                    return (
                      <tr key={`${entity.entity_type}-${entity.id}`}>
                        <th scope="row">
                          <Link href={getPrimaryHref(entity)}>
                            <strong>{entity.label}</strong>
                            <span>{entity.id}</span>
                          </Link>
                          {entity.summary ? <p>{entity.summary}</p> : null}
                          {entity.aliases?.length ? (
                            <div className="knowledge-alias-row">
                              {firstItems(entity.aliases, 4).map((alias) => (
                                <span className="micro-badge micro-badge--outline" key={alias}>
                                  {alias}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </th>
                        <td>
                          <div className="knowledge-badge-list">
                            {firstItems(badges, 6).map((badge) => (
                              <span className="micro-badge micro-badge--outline" key={badge}>
                                {badge}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="knowledge-path-list">
                            {pathEntries.map(([key, path]) => (
                              <a href={path} key={`${entity.id}-${key}`}>
                                <span>{getPathLabel(key)}</span>
                                <code>{path}</code>
                              </a>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="knowledge-id-list">
                            {linkedIdGroups.map((group) => (
                              <div key={`${entity.id}-${group.label}`}>
                                <strong>{group.label}</strong>
                                <span>
                                  {firstItems(group.values, 3).join(" / ")}
                                  {(group.values?.length ?? 0) > 3 ? ` +${(group.values?.length ?? 0) - 3}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="knowledge-context-list">
                            {contextRows.length ? (
                              contextRows.map((row) => <span key={row}>{row}</span>)
                            ) : (
                              <span>Directory entry</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleRows.length < filteredRows.length ? (
              <p className="knowledge-result-note">
                Showing {formatNumber(visibleRows.length)} of {formatNumber(filteredRows.length)} matching rows.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
