import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated } from "@/lib/site-data";

export default async function NotFound() {
  const lastUpdated = await getOverallLastUpdated();

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <section className="band">
        <div className="page-shell empty-state">
          <p className="section-kicker">Not found</p>
          <h1>This page is not in the public map yet.</h1>
          <Link className="section-link section-link--block" href="/">
            Return to overview
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
