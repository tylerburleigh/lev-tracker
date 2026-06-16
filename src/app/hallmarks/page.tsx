import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      >
        <div className="state-hero-aside">
          <span className="section-kicker">Framework source</span>
          <p>The tracker follows the 2023 expanded Hallmarks of Aging framework.</p>
          <Link className="mini-link" href="/hallmarks/paper">
            <span>Read the paper guide</span>
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </PageHero>

      <section className="band band--hallmark-index-overview">
        <div className="page-shell hallmark-index-overview">
          <div className="report-section-block">
            <span className="section-kicker">Evidence tiers</span>
            <h2>Human evidence is visible, long-lasting outcomes are not</h2>
            <p>
              {humanEvidenceCount} of {outlooks.length} hallmark areas currently sit at a human evidence tier.{" "}
              {durableOutcomeCount === 0
                ? "None has reached long-lasting disease or mortality relevance."
                : `${durableOutcomeCount} have reached long-lasting disease or mortality relevance.`}
            </p>
          </div>
          <div className="hallmark-tier-ledger" aria-label="Hallmarks by current evidence tier">
            {stageCounts.map(({ stage, count }) => (
              <div className="hallmark-tier-row" key={stage}>
                <span>{getStageLabel(stage)}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--hallmark-index-list">
        <div className="page-shell hallmark-report-list">
          {outlooks.map((outlook) => {
            const hallmark = hallmarks.find((item) => item.id === outlook.subjectId);
            if (!hallmark) return null;

            return (
              <Link
                className="hallmark-report-row"
                href={`/hallmarks/${hallmark.id}`}
                key={hallmark.id}
              >
                <div className="hallmark-report-row__meta">
                  <span>{getTrackCountForHallmark(hallmark.id)} tracks</span>
                  <time dateTime={outlook.lastUpdated}>Updated {formatDate(outlook.lastUpdated)}</time>
                </div>
                <div className="hallmark-report-row__body">
                  <h2>{hallmark.name}</h2>
                  <p className="hallmark-report-row__description">{hallmark.description}</p>
                  <p className="hallmark-report-row__interpretation">{outlook.interpretation}</p>
                </div>
                <div className="hallmark-report-row__signals">
                  <StageBadge stage={outlook.stage} />
                  <span className={`micro-badge ${getMomentumTone(outlook.momentum)}`}>
                    {getMomentumLabel(outlook.momentum)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
