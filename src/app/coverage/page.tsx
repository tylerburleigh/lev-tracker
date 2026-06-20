import Link from "next/link";
import { ArrowRight, CheckCircle2, ListChecks, SearchCheck, Signal, TriangleAlert } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getCoverageAuditExport, getEvidenceMapExport, getOverallLastUpdated } from "@/lib/site-data";

type EvidenceMapExport = Awaited<ReturnType<typeof getEvidenceMapExport>>;
type EvidenceMapTrack = EvidenceMapExport["tracks"][number];
type CoverageAuditExport = Awaited<ReturnType<typeof getCoverageAuditExport>>;
type CoverageAuditTrack = CoverageAuditExport["tracks"][number];
type CoverageBucket = "active_mapped" | "sparse_checked" | "needs_map_work" | "gap_heavy";

const bucketConfig: Record<
  CoverageBucket,
  {
    title: string;
    label: string;
    summary: string;
  }
> = {
  active_mapped: {
    title: "Active and mapped",
    label: "Enough field activity to compare",
    summary:
      "The tracker has an adequate or strong map, and the observed literature is active or dense. Interpretation, not basic discovery, is the main task."
  },
  sparse_checked: {
    title: "Sparse but checked",
    label: "Likely little research",
    summary:
      "The tracker has an adequate or strong map, but observed research density is sparse or emerging. Low counts are more likely to reflect the field than a missing search pass."
  },
  needs_map_work: {
    title: "Map work needed",
    label: "Do not infer scarcity yet",
    summary:
      "The map is thin, low-confidence, or missing. A low source count here means the tracker needs more checking before judging the field."
  },
  gap_heavy: {
    title: "Known gaps remain",
    label: "Covered but caveated",
    summary:
      "The map is usable, but high-priority evidence categories remain unresolved. Treat these tracks as mapped enough to discuss, not settled."
  }
};

const bucketOrder: CoverageBucket[] = ["needs_map_work", "gap_heavy", "sparse_checked", "active_mapped"];

function isActiveOrDense(density?: string) {
  return density === "active" || density === "dense";
}

function isSparseOrEmerging(density?: string) {
  return density === "sparse" || density === "emerging";
}

function hasUsableMap(track: EvidenceMapTrack) {
  const verdict = track.coverage?.coverage_verdict;
  const confidence = track.coverage?.coverage_confidence;

  return Boolean(track.coverage) && (verdict === "adequate" || verdict === "strong") && confidence !== "low";
}

function getCoverageBucket(track: EvidenceMapTrack): CoverageBucket {
  if (!hasUsableMap(track)) {
    return "needs_map_work";
  }

  if ((track.coverage?.high_priority_gap_count ?? 0) > 0) {
    return "gap_heavy";
  }

  if (isSparseOrEmerging(track.coverage?.observed_research_density)) {
    return "sparse_checked";
  }

  return "active_mapped";
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function getTrackSortValue(track: EvidenceMapTrack) {
  const bucketIndex = bucketOrder.indexOf(getCoverageBucket(track));
  const highPriorityGapCount = track.coverage?.high_priority_gap_count ?? 0;
  const sourceCount = track.evidence_counts.source_count;

  return `${bucketIndex.toString().padStart(2, "0")}:${(999 - highPriorityGapCount)
    .toString()
    .padStart(3, "0")}:${sourceCount.toString().padStart(4, "0")}:${track.name}`;
}

function getAuditTrackMetric(track: CoverageAuditTrack) {
  return `${track.assessment?.covered_source_count ?? 0} sources / ${
    track.assessment?.covered_finding_count ?? 0
  } findings`;
}

export default async function CoveragePage() {
  const [lastUpdated, evidenceMap, coverageAudit] = await Promise.all([
    getOverallLastUpdated(),
    getEvidenceMapExport(),
    getCoverageAuditExport()
  ]);
  const tracks = [...evidenceMap.tracks].sort((left, right) =>
    getTrackSortValue(left).localeCompare(getTrackSortValue(right))
  );
  const auditByTrackId = new Map(coverageAudit.tracks.map((track) => [track.id, track]));
  const likelyFieldScarcityTracks = coverageAudit.tracks.filter(
    (track) => track.method_class === "likely_field_scarcity"
  );
  const registryWatchTracks = coverageAudit.tracks.filter((track) => track.method_class === "needs_registry_check");
  const reviewDueTracks = coverageAudit.tracks.filter(
    (track) => track.method_class === "recent_activity_review_due" || track.method_class === "needs_source_discovery"
  );
  const activeOrDenseTracks = tracks.filter((track) => isActiveOrDense(track.coverage?.observed_research_density));
  const sparseCheckedTracks = tracks.filter(
    (track) => hasUsableMap(track) && isSparseOrEmerging(track.coverage?.observed_research_density)
  );
  const needsMapWorkTracks = tracks.filter((track) => getCoverageBucket(track) === "needs_map_work");
  const highPriorityGapTracks = tracks.filter((track) => (track.coverage?.high_priority_gap_count ?? 0) > 0);
  const bucketCounts: Record<CoverageBucket, number> = {
    active_mapped: activeOrDenseTracks.filter(hasUsableMap).length,
    sparse_checked: sparseCheckedTracks.length,
    needs_map_work: needsMapWorkTracks.length,
    gap_heavy: highPriorityGapTracks.length
  };
  const totalHighPriorityGaps = tracks.reduce(
    (count, track) => count + (track.coverage?.high_priority_gap_count ?? 0),
    0
  );

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Coverage"
        title="Coverage confidence vs research density"
        summary="A public dashboard for separating tracker map completeness from how much research appears to exist in each longevity track."
      >
        <div className="page-hero__stats">
          <span>{evidenceMap.summary.track_count} tracks</span>
          <span>{evidenceMap.summary.coverage_assessed_track_count} assessed maps</span>
          <span>{activeOrDenseTracks.length} active or dense fields</span>
          <span>{coverageAudit.summary.due_or_never_surveillance_track_count} review due</span>
          <span>{totalHighPriorityGaps} high-priority gaps</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell coverage-read-grid">
          <article className="coverage-read-card coverage-read-card--primary">
            <SearchCheck aria-hidden="true" size={18} />
            <h2>How to read coverage</h2>
            <p>
              Map completeness answers whether the tracker has checked the right evidence categories. Research density
              answers whether the checked field appears small, emerging, active, or dense. Evidence strength is a third
              question handled by the outlook stage and supporting findings.
            </p>
            <a className="section-link section-link--block" href="/data/coverage-audit.json">
              <span>Coverage audit JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            <Link className="section-link section-link--block" href="/guide">
              <span>Open reader guide</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
          {bucketOrder.map((bucket) => {
            const item = bucketConfig[bucket];

            return (
              <article className="coverage-read-card" key={bucket}>
                <strong>{bucketCounts[bucket]}</strong>
                <span>{item.title}</span>
                <p>{item.summary}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell coverage-diagnostic-grid">
          <section className="coverage-diagnostic-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Likely field scarcity</span>
              <h2>Sparse but checked</h2>
            </div>
            {likelyFieldScarcityTracks.length ? (
              <div className="coverage-mini-list">
                {likelyFieldScarcityTracks.slice(0, 5).map((track) => (
                  <Link href={track.href} key={track.id}>
                    <strong>{track.name}</strong>
                    <span>{getAuditTrackMetric(track)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p>No track is currently classified as sparse after a usable, current method audit.</p>
            )}
          </section>

          <section className="coverage-diagnostic-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Registry watch</span>
              <h2>Results could move the map</h2>
            </div>
            {registryWatchTracks.length ? (
              <div className="coverage-mini-list">
                {registryWatchTracks.slice(0, 5).map((track) => (
                  <Link href={track.href} key={track.id}>
                    <strong>{track.name}</strong>
                    <span>
                      {track.evidence_counts.active_watch_trial_count
                        ? `${track.evidence_counts.active_watch_trial_count} active-watch trials`
                        : "registry/no-results watch"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p>No track is currently classified as registry-sensitive by the method audit.</p>
            )}
          </section>

          <section className="coverage-diagnostic-panel">
            <div className="panel-header panel-header--stacked">
              <span className="section-kicker">Refresh needed</span>
              <h2>Review due or source discovery</h2>
            </div>
            {reviewDueTracks.length ? (
              <div className="coverage-mini-list">
                {reviewDueTracks.slice(0, 5).map((track) => (
                  <Link href={track.href} key={track.id}>
                    <strong>{track.name}</strong>
                    <span>{track.method_class_label}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p>No track currently needs source discovery, and no method audit is overdue.</p>
            )}
          </section>
        </div>
      </section>

      <section className="band">
        <div className="page-shell coverage-table-section">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Track coverage matrix</span>
              <h2>Where map confidence and field density differ</h2>
            </div>
            <Link className="section-link" href="/data/evidence-map.json">
              <span>JSON export</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <a className="section-link" href="/data/coverage-audit.json">
              <span>Coverage audit JSON</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="expert-track-table-wrap">
            <table className="expert-track-table coverage-track-table">
              <thead>
                <tr>
                  <th scope="col">Track</th>
                  <th scope="col">Read</th>
                  <th scope="col">Map</th>
                  <th scope="col">Density</th>
                  <th scope="col">Diagnostic</th>
                  <th scope="col">Gaps</th>
                  <th scope="col">Evidence</th>
                  <th scope="col">Trials</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track) => {
                  const bucket = getCoverageBucket(track);
                  const bucketItem = bucketConfig[bucket];
                  const audit = auditByTrackId.get(track.id);

                  return (
                    <tr key={track.id}>
                      <th scope="row">
                        <Link href={track.href}>
                          <strong>{track.name}</strong>
                          <span>{track.primary_hallmark_name}</span>
                        </Link>
                        {audit ? (
                          <div className="coverage-audit-link-row">
                            <a href={audit.paths.coverage_audit_path}>Audit JSON</a>
                            {audit.assessment?.assessment_path ? <span>{audit.assessment.assessment_path}</span> : null}
                          </div>
                        ) : null}
                      </th>
                      <td>
                        {track.outlook?.stage_label ?? "Not rated"}
                        <span>{track.outlook?.read_firmness_label ?? "No read firmness"}</span>
                      </td>
                      <td>
                        {track.coverage?.coverage_verdict_label ?? "Not assessed"}
                        <span>{track.coverage?.coverage_confidence_label ?? "No confidence recorded"}</span>
                      </td>
                      <td>{track.coverage?.observed_research_density_label ?? "Not assessed"}</td>
                      <td>
                        {audit?.method_class_label ?? bucketItem.title}
                        <span>{audit?.method_class_reason ?? bucketItem.label}</span>
                      </td>
                      <td>
                        {formatNumber(track.coverage?.known_gap_count ?? 0)}
                        <span>{formatNumber(track.coverage?.high_priority_gap_count ?? 0)} high priority</span>
                      </td>
                      <td>
                        {formatNumber(track.evidence_counts.finding_count)} findings
                        <span>{formatNumber(track.evidence_counts.human_finding_count)} human</span>
                        {audit?.assessment ? (
                          <span>{formatNumber(audit.assessment.covered_source_count)} audited sources</span>
                        ) : null}
                      </td>
                      <td>
                        {formatNumber(track.evidence_counts.active_watch_trial_count)} active
                        <span>{formatNumber(track.evidence_counts.posted_result_trial_count)} posted</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell coverage-method-grid">
          <article>
            <CheckCircle2 aria-hidden="true" size={18} />
            <h2>Good coverage does not mean strong evidence</h2>
            <p>
              A track can have an adequate map and still be early, negative, or mixed. Coverage says the tracker has
              looked broadly enough to make the current read usable.
            </p>
          </article>
          <article>
            <Signal aria-hidden="true" size={18} />
            <h2>Sparse density is only meaningful when coverage is usable</h2>
            <p>
              If map confidence is low, a small record count may mean the tracker has not checked enough. If map
              confidence is moderate or high, sparse density is evidence about the field.
            </p>
          </article>
          <article>
            <TriangleAlert aria-hidden="true" size={18} />
            <h2>Known gaps stay visible</h2>
            <p>
              High-priority gaps keep caveats attached to otherwise usable maps, especially when human outcomes, safety,
              replication, or registry results remain thin.
            </p>
          </article>
          <article>
            <ListChecks aria-hidden="true" size={18} />
            <h2>Use this with the track audit</h2>
            <p>
              The coverage matrix is the overview. Individual track pages still show the outlook audit, limiting
              evidence, and specific criteria that would change a rating.
            </p>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
