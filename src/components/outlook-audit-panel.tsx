import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  type EvidenceSupportCard,
  type TrackCoverage,
  getCoverageConfidenceLabel,
  getCoverageVerdictLabel,
  getCoverageVerdictPlainMeaning,
  getMomentumLabel,
  getMomentumPlainMeaning,
  getReadFirmnessLabel,
  getReadFirmnessPlainMeaning,
  getResearchDensityLabel,
  getResearchDensityPlainMeaning,
  getStageLabel,
  getStagePlainMeaning
} from "@/lib/site-data";

type OutlookAuditPanelProps = {
  coverage: TrackCoverage;
  evidenceSupport: EvidenceSupportCard[];
};

const limitingRoles = new Set(["limits", "balances"]);

function getRoleLabel(role: string) {
  switch (role) {
    case "limits":
      return "Limit";
    case "balances":
      return "Balance";
    case "contextualizes":
      return "Context";
    case "supports":
      return "Support";
    default:
      return role.replace(/_/g, " ");
  }
}

function getRoleTone(role: string) {
  switch (role) {
    case "limits":
      return "micro-badge--red";
    case "balances":
    case "contextualizes":
      return "micro-badge--gold";
    case "supports":
      return "micro-badge--mint";
    default:
      return "micro-badge--outline";
  }
}

export function OutlookAuditPanel({ coverage, evidenceSupport }: OutlookAuditPanelProps) {
  const limitingEvidence = evidenceSupport
    .filter((item) => limitingRoles.has(item.supportRole))
    .slice(0, 3);
  const ratingChangeCriteria = coverage.whatWouldChangeTheRating?.slice(0, 4) ?? [];

  return (
    <div className="page-shell outlook-audit-grid">
      <article className="detail-panel outlook-audit-panel outlook-audit-panel--primary">
        <div className="panel-header panel-header--stacked">
          <span className="section-kicker">Outlook audit</span>
          <h2>{coverage.stage ? getStageLabel(coverage.stage) : "Not rated yet"}</h2>
        </div>
        <p>{coverage.interpretation}</p>
        {coverage.stage ? (
          <div className="plain-meaning">
            <strong>Plain meaning</strong>
            <p>{getStagePlainMeaning(coverage.stage)}</p>
          </div>
        ) : null}
        <Link className="mini-link outlook-audit-guide-link" href="/guide">
          <span>How to read these labels</span>
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
        <div className="detail-list outlook-audit-metrics">
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

      <article className="detail-panel outlook-audit-panel">
        <div className="panel-header panel-header--stacked">
          <span className="section-kicker">Why not higher?</span>
          <h2>What still blocks the rating</h2>
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
        {ratingChangeCriteria.length ? (
          <div className="outlook-audit-criteria">
            <strong>What would change this rating?</strong>
            <ul>
              {ratingChangeCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      <article className="detail-panel outlook-audit-panel">
        <div className="panel-header panel-header--stacked">
          <span className="section-kicker">Limiting evidence</span>
          <h2>What keeps the read bounded</h2>
        </div>
        <div className="outlook-audit-limit-list">
          {limitingEvidence.length ? (
            limitingEvidence.map((item) => (
              <section className="outlook-audit-limit" key={`${item.label}-${item.conclusion}`}>
                <div>
                  <span className={`micro-badge ${getRoleTone(item.supportRole)}`}>
                    {getRoleLabel(item.supportRole)}
                  </span>
                  <strong>{item.label}</strong>
                </div>
                <p>{item.conclusion}</p>
                <span>{item.rationale}</span>
              </section>
            ))
          ) : (
            <p>No limiting rationale has been promoted yet.</p>
          )}
        </div>
      </article>
    </div>
  );
}
