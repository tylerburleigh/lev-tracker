import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getActivityFeed, getHallmarkById, getOverallLastUpdated } from "@/lib/site-data";

export default async function ActivityPage() {
  const [activity, lastUpdated] = await Promise.all([getActivityFeed(), getOverallLastUpdated()]);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Activity"
        title="Contextual movement"
        summary="This lane shows trial, company, and other field movement without treating motion as proof."
      />
      <section className="band">
        <div className="page-shell activity-list">
          {activity.map((item) => (
            <article className="activity-card" key={item.id}>
              <div className="activity-card__top">
                <span className="micro-badge micro-badge--outline">{item.lane}</span>
                <time dateTime={item.date}>{formatDate(item.date)}</time>
              </div>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <div className="activity-card__footer">
                <span>{getHallmarkById(item.hallmarkId)?.name ?? item.hallmarkId}</span>
                <span>{item.affectsOutlook ? "Affects outlook" : "Context only"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
