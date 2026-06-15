import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { type ActivityFeedItem, getActivityFeed, getOverallLastUpdated } from "@/lib/site-data";

type ActivityLensId = "all" | "field-anchors" | "current-movement" | "trial-horizon" | "historical-backfill";

type ActivitySearchParams = {
  lens?: string | string[];
};

type ActivityPageProps = {
  searchParams?: Promise<ActivitySearchParams>;
};

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isActivityLensId(value: string): value is ActivityLensId {
  return ["all", "field-anchors", "current-movement", "trial-horizon", "historical-backfill"].includes(value);
}

function getActivityLensHref(lensId: ActivityLensId) {
  return lensId === "all" ? "/activity" : `/activity?lens=${lensId}`;
}

function getActivityForLens(lensId: ActivityLensId, activity: ActivityFeedItem[]) {
  if (lensId === "field-anchors") {
    return activity.filter((item) => item.noteworthinessTier === "field_anchor");
  }

  if (lensId === "current-movement") {
    return activity.filter((item) => !item.isHistoricalBackfill);
  }

  if (lensId === "trial-horizon") {
    return activity.filter((item) => item.isTrialHorizon);
  }

  if (lensId === "historical-backfill") {
    return activity.filter((item) => item.isHistoricalBackfill);
  }

  return activity;
}

function getNoteworthinessClass(item: ActivityFeedItem) {
  if (item.noteworthinessTier === "field_anchor") {
    return "micro-badge--gold";
  }

  if (item.noteworthinessTier === "material_program") {
    return "micro-badge--mint";
  }

  return "micro-badge--muted";
}

function getActivityCardClass(item: ActivityFeedItem) {
  if (item.isHistoricalBackfill) {
    return "activity-card--historical";
  }

  if (item.noteworthinessTier === "field_anchor") {
    return "activity-card--anchor";
  }

  if (item.isTrialHorizon) {
    return "activity-card--trial";
  }

  return "activity-card--current";
}

function getActivityRoutingBadges(item: ActivityFeedItem) {
  return [
    item.affectsOutlook ? "Changes assessment" : "Activity only",
    item.isFieldActivity ? "Field activity" : "",
    item.isStateOfFieldRelevant ? "State of Field" : "",
    item.isTrialHorizon ? "Trial horizon" : "",
    item.isHistoricalBackfill ? "Historical backfill" : ""
  ].filter(Boolean);
}

function ActivityCard({ item }: { item: ActivityFeedItem }) {
  const routingBadges = getActivityRoutingBadges(item);

  return (
    <article className={`activity-card ${getActivityCardClass(item)}`} key={item.id}>
      <div className="activity-card__top">
        <div className="activity-card__badges">
          <span className="micro-badge micro-badge--outline">{item.lane}</span>
          <span className="micro-badge micro-badge--muted">{item.activityTypeLabel}</span>
          <span className={`micro-badge ${getNoteworthinessClass(item)}`}>{item.noteworthinessLabel}</span>
        </div>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </div>
      <h2>{item.title}</h2>
      <p>{item.summary}</p>
      <div className="activity-card__routing" aria-label="Activity routing">
        {routingBadges.map((badge) => (
          <span key={badge}>{badge}</span>
        ))}
      </div>
      {item.significanceNote ? (
        <p className="activity-card__note">
          <strong>Why it matters</strong>
          {item.significanceNote}
        </p>
      ) : null}
      {item.thresholdBasisLabels.length ? (
        <p className="activity-card__threshold">
          <strong>Threshold</strong>
          {item.thresholdBasisLabels.join(" / ")}
        </p>
      ) : null}
      <div className="activity-card__meta">
        <span>{item.scopeLabel}</span>
        {item.trackNames.length ? <span>{item.trackNames.slice(0, 2).join(" / ")}</span> : null}
        {item.trialActivityKindLabel ? <span>{item.trialActivityKindLabel}</span> : null}
      </div>
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
    </article>
  );
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedLensValue = getSingleSearchParam(resolvedSearchParams.lens);
  const selectedLens = isActivityLensId(selectedLensValue) ? selectedLensValue : "all";
  const [activity, lastUpdated] = await Promise.all([getActivityFeed(), getOverallLastUpdated()]);
  const assessmentChangingCount = activity.filter((item) => item.affectsOutlook).length;
  const evidenceUnchangedCount = activity.length - assessmentChangingCount;
  const fieldAnchors = activity.filter((item) => item.noteworthinessTier === "field_anchor");
  const currentFieldMovement = activity.filter((item) => !item.isHistoricalBackfill);
  const trialHorizon = activity.filter((item) => item.isTrialHorizon);
  const historicalBackfill = activity.filter((item) => item.isHistoricalBackfill);
  const activityLenses: Array<{ id: ActivityLensId; title: string; count: number; summary: string }> = [
    {
      id: "all",
      title: "All activity",
      count: activity.length,
      summary: "Every public activity item, newest first."
    },
    {
      id: "field-anchors",
      title: "Field anchors",
      count: fieldAnchors.length,
      summary: "Major entities, programs, prizes, or funders that shape the field."
    },
    {
      id: "current-movement",
      title: "Current movement",
      count: currentFieldMovement.length,
      summary: "Non-backfill activity surfaced through surveillance or monthly review."
    },
    {
      id: "trial-horizon",
      title: "Trial horizon",
      count: trialHorizon.length,
      summary: "Trial launches, clinical-transition signals, or programs routed to trial watch."
    },
    {
      id: "historical-backfill",
      title: "Historical backfill",
      count: historicalBackfill.length,
      summary: "Older field activity added so the current page has the right context."
    }
  ];
  const visibleActivity = getActivityForLens(selectedLens, activity);
  const selectedLensOption = activityLenses.find((lens) => lens.id === selectedLens) ?? activityLenses[0];

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
          <span>{trialHorizon.length} routed to trial horizon</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell activity-map">
          {activityLenses.map((lens) => (
            <Link
              className={`activity-map-card ${selectedLens === lens.id ? "activity-map-card--selected" : ""}`}
              href={getActivityLensHref(lens.id)}
              aria-current={selectedLens === lens.id ? "page" : undefined}
              key={lens.id}
            >
              <div className="activity-map-card__top">
                <span>{lens.title}</span>
                <strong>{lens.count}</strong>
              </div>
              <p>{lens.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="page-shell activity-section__header">
          <div>
            <span className="section-kicker">Selected lens</span>
            <h2>{selectedLensOption.title}</h2>
            <p>{selectedLensOption.summary}</p>
          </div>
          <span className="section-link section-link--static">{visibleActivity.length} items</span>
        </div>
        <div className="page-shell activity-list">
          {visibleActivity.map((item) => (
            <ActivityCard item={item} key={item.id} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
