import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { StageBadge } from "@/components/stage-badge";
import { formatDate } from "@/lib/date";
import {
  getHallmarkOutlooks,
  getHallmarks,
  getMomentumLabel,
  getOverallLastUpdated,
  getStageLabel,
  type Momentum,
  type Stage,
  getTrackCountForHallmark
} from "@/lib/site-data";

const evidenceStageOrder: Stage[] = [
  "mechanistic_plausibility",
  "animal_signal",
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
];

const humanEvidenceStages = new Set<Stage>([
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
]);

const stageCardClasses: Record<Stage, string> = {
  mechanistic_plausibility: "hallmark-index-card--mechanistic",
  animal_signal: "hallmark-index-card--animal",
  human_biomarker_signal: "hallmark-index-card--biomarker",
  human_functional_benefit: "hallmark-index-card--functional",
  durable_disease_or_mortality_relevance: "hallmark-index-card--durable"
};

function getMomentumTone(momentum: Momentum) {
  switch (momentum) {
    case "accelerating":
    case "steady":
      return "micro-badge--mint";
    case "mixed":
      return "micro-badge--gold";
    case "stalled":
      return "micro-badge--red";
    default:
      return "micro-badge--muted";
  }
}

export default async function HallmarksIndexPage() {
  const hallmarks = getHallmarks();
  const [outlooks, lastUpdated] = await Promise.all([getHallmarkOutlooks(), getOverallLastUpdated()]);
  const stageCounts = evidenceStageOrder.map((stage) => ({
    stage,
    count: outlooks.filter((outlook) => outlook.stage === stage).length
  }));
  const humanEvidenceCount = outlooks.filter((outlook) => humanEvidenceStages.has(outlook.stage)).length;
  const durableOutcomeCount = outlooks.filter(
    (outlook) => outlook.stage === "durable_disease_or_mortality_relevance"
  ).length;

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Hallmarks"
        title="The field by hallmark"
        summary="A comparative view of all 12 hallmark areas, kept in canonical order so movement is easy to read over time."
      />

      <section className="band band--hallmark-index-overview">
        <div className="page-shell hallmark-index-overview">
          <div className="hallmark-index-overview__copy">
            <span className="section-kicker">Evidence tiers</span>
            <h2>Human evidence is visible, durable outcomes are not</h2>
            <p>
              {humanEvidenceCount} of {outlooks.length} hallmark areas currently sit at a human evidence tier.{" "}
              {durableOutcomeCount === 0
                ? "None has reached durable disease or mortality relevance."
                : `${durableOutcomeCount} have reached durable disease or mortality relevance.`}
            </p>
          </div>
          <div className="hallmark-index-tier-list" aria-label="Hallmarks by current evidence tier">
            {stageCounts.map(({ stage, count }) => (
              <div className={`hallmark-index-tier ${stageCardClasses[stage]}`} key={stage}>
                <span>{getStageLabel(stage)}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--hallmark-index-list">
        <div className="page-shell hallmark-index-grid">
          {outlooks.map((outlook) => {
            const hallmark = hallmarks.find((item) => item.id === outlook.subjectId);
            if (!hallmark) return null;

            return (
              <Link
                className={`hallmark-index-card ${stageCardClasses[outlook.stage]}`}
                href={`/hallmarks/${hallmark.id}`}
                key={hallmark.id}
              >
                <div className="hallmark-index-card__header">
                  <h2>{hallmark.name}</h2>
                  <span className="micro-badge micro-badge--outline hallmark-index-card__track-count">
                    {getTrackCountForHallmark(hallmark.id)} tracks
                  </span>
                </div>
                <p className="hallmark-index-card__description">{hallmark.description}</p>
                <div className="hallmark-index-card__metrics">
                  <StageBadge stage={outlook.stage} />
                  <span className={`micro-badge ${getMomentumTone(outlook.momentum)}`}>
                    {getMomentumLabel(outlook.momentum)}
                  </span>
                </div>
                <p className="hallmark-index-card__interpretation">{outlook.interpretation}</p>
                <div className="hallmark-index-card__footer">
                  <span>Outlook updated</span>
                  <time dateTime={outlook.lastUpdated}>{formatDate(outlook.lastUpdated)}</time>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
