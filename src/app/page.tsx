import { Homepage } from "@/components/homepage";
import { SiteShell } from "@/components/site-shell";
import { getOverallLastUpdated } from "@/lib/site-data";
import { formatDate } from "@/lib/date";

export default async function HomePage() {
  const lastUpdated = await getOverallLastUpdated();

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <Homepage />
    </SiteShell>
  );
}
