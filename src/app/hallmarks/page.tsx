import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { StageBadge } from "@/components/stage-badge";
import { formatDate } from "@/lib/date";
import {
  getConfidenceLabel,
  getHallmarkOutlooks,
  getHallmarks,
  getOverallLastUpdated,
  getMomentumLabel,
  getTrackCountForHallmark
} from "@/lib/site-data";

export default async function HallmarksIndexPage() {
  const hallmarks = getHallmarks();
  const [outlooks, lastUpdated] = await Promise.all([getHallmarkOutlooks(), getOverallLastUpdated()]);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Hallmarks"
        title="The field by hallmark"
        summary="A comparative view of all 12 hallmark areas, kept in canonical order so movement is easy to read over time."
      />
      <section className="band">
        <div className="page-shell hallmark-index-grid">
          {outlooks.map((outlook) => {
            const hallmark = hallmarks.find((item) => item.id === outlook.subjectId);
            if (!hallmark) return null;

            return (
              <Link className="hallmark-index-card" href={`/hallmarks/${hallmark.id}`} key={hallmark.id}>
                <div className="hallmark-index-card__header">
                  <h2>{hallmark.name}</h2>
                  <span>{getTrackCountForHallmark(hallmark.id)} tracks</span>
                </div>
                <div className="hallmark-index-card__metrics">
                  <StageBadge stage={outlook.stage} />
                  <span>{getMomentumLabel(outlook.momentum)}</span>
                  <span>{getConfidenceLabel(outlook.confidence)}</span>
                </div>
                <p>{outlook.note}</p>
                <div className="hallmark-index-card__footer">
                  <span>{outlook.blocker}</span>
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
