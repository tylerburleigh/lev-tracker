import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated, getStateOfTheFieldEditions } from "@/lib/site-data";

const fieldChangeStatusLabels = {
  material_change: "Material field change",
  mixed: "Some movement",
  no_material_change: "No material field change"
};

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function StateOfTheFieldIndexPage() {
  const [editions, lastUpdated] = await Promise.all([getStateOfTheFieldEditions(), getOverallLastUpdated()]);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="State of the Field"
        title="Monthly field reviews"
        summary="Retrospective updates on what actually changed during the covered month, what did not, and whether the evidence made LEV look closer."
      />
      <section className="band">
        <div className="page-shell editorial-list">
          {editions.map((edition) => (
            <Link className="editorial-card" href={`/state-of-the-field/${edition.slug}`} key={edition.slug}>
              <div className="editorial-card__top">
                <h2>{edition.title}</h2>
                <time dateTime={edition.date}>Published {formatDate(edition.date)}</time>
              </div>
              <span className="editorial-card__period">Covers {edition.period_label}</span>
              <div className="editorial-card__meta">
                <span className={`state-status-pill state-status-pill--${edition.field_change_status}`}>
                  {fieldChangeStatusLabels[edition.field_change_status]}
                </span>
                <span>{formatCount(edition.trial_horizon.length, "trial watch item")}</span>
                <span>{formatCount(edition.related_publication_event_ids?.length ?? 0, "linked update")}</span>
              </div>
              <p>{edition.lede}</p>
              <span className="editorial-card__bottom-line">{edition.bottom_line}</span>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
