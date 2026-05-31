import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated, getStateOfTheFieldEditions } from "@/lib/site-data";

export default async function StateOfTheFieldIndexPage() {
  const [editions, lastUpdated] = await Promise.all([getStateOfTheFieldEditions(), getOverallLastUpdated()]);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="State of the Field"
        title="Editorial notes"
        summary="Monthly notes that summarize what changed, what did not, and how the curator’s public outlook moved."
      />
      <section className="band">
        <div className="page-shell editorial-list">
          {editions.map((edition) => (
            <Link className="editorial-card" href={`/state-of-the-field/${edition.slug}`} key={edition.slug}>
              <div className="editorial-card__top">
                <h2>{edition.title}</h2>
                <time dateTime={edition.date}>{formatDate(edition.date)}</time>
              </div>
              <p>{edition.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
