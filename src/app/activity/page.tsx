import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getActivityFeed, getOverallLastUpdated } from "@/lib/site-data";

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default async function ActivityPage() {
  const [activity, lastUpdated] = await Promise.all([getActivityFeed(), getOverallLastUpdated()]);
  const assessmentChangingCount = activity.filter((item) => item.affectsOutlook).length;
  const evidenceUnchangedCount = activity.length - assessmentChangingCount;

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Activity"
        title="Field activity"
        summary="Curated trial, funding, company, regulatory, and public updates shown apart from evidence of benefit."
      >
        <div className="page-hero__stats">
          <span>{activity.length} curated events</span>
          <span>{assessmentChangingCount} change the current assessment</span>
          <span>{evidenceUnchangedCount} do not change the evidence assessment</span>
        </div>
      </PageHero>
      <section className="band">
        <div className="page-shell activity-list">
          {activity.map((item) => (
            <article className="activity-card" key={item.id}>
              <div className="activity-card__top">
                <div className="activity-card__badges">
                  <span className="micro-badge micro-badge--outline">{item.lane}</span>
                  <span className="micro-badge micro-badge--muted">{item.activityTypeLabel}</span>
                </div>
                <time dateTime={item.date}>{formatDate(item.date)}</time>
              </div>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              {item.significanceNote ? (
                <p className="activity-card__note">
                  <strong>Why it matters</strong>
                  {item.significanceNote}
                </p>
              ) : null}
              <div className="activity-card__meta">
                <span>{item.scopeLabel}</span>
                {item.trackNames.length ? <span>{item.trackNames.slice(0, 2).join(" / ")}</span> : null}
              </div>
              <div className="activity-card__footer">
                <span>{item.affectsOutlook ? "Changes current assessment" : "No evidence change yet"}</span>
                {item.links.length ? (
                  <div className="activity-card__links">
                    {item.links.slice(0, 3).map((link) =>
                      isExternalHref(link.href) ? (
                        <a href={link.href} target="_blank" rel="noreferrer" key={`${link.kind}-${link.id}`}>
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} key={`${link.kind}-${link.id}`}>
                          {link.label}
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
