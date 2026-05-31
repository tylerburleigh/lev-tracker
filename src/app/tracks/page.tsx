import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getHallmarkById,
  getOverallLastUpdated,
  getStageLabel,
  getTracks,
  getTrackCoverage
} from "@/lib/site-data";

export default async function TracksIndexPage() {
  const tracks = getTracks();
  const [lastUpdated, coverageEntries] = await Promise.all([
    getOverallLastUpdated(),
    Promise.all(tracks.map(async (track) => [track.id, await getTrackCoverage(track.id)] as const))
  ]);
  const coverageByTrackId = new Map(coverageEntries);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Tracks"
        title="Research approaches across the hallmarks"
        summary="Tracks are the stable layer between hallmark theory and specific intervention records."
      />
      <section className="band">
        <div className="page-shell tracks-table">
          <div className="tracks-table__head">
            <span>Track</span>
            <span>Primary hallmark</span>
            <span>Current stage</span>
            <span>Last updated</span>
          </div>
          {tracks.map((track) => {
            const hallmark = getHallmarkById(track.primaryHallmarkId);
            const coverage = coverageByTrackId.get(track.id);
            if (!coverage) return null;

            return (
              <Link className="tracks-table__row" href={`/tracks/${track.id}`} key={track.id}>
                <div>
                  <strong>{track.name}</strong>
                  <p>{track.summary}</p>
                </div>
                <span>{hallmark?.name ?? track.primaryHallmarkId}</span>
                <span>{coverage.stage ? getStageLabel(coverage.stage) : coverage.statusLabel}</span>
                <time dateTime={coverage.lastUpdated}>{formatDate(coverage.lastUpdated)}</time>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
