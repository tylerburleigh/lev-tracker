import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated, getStateOfTheFieldEdition, getStateOfTheFieldEditions } from "@/lib/site-data";

type EditionPageProps = {
  params: Promise<{
    editionSlug: string;
  }>;
};

export default async function EditionPage({ params }: EditionPageProps) {
  const { editionSlug } = await params;
  const [edition, lastUpdated] = await Promise.all([
    getStateOfTheFieldEdition(editionSlug),
    getOverallLastUpdated()
  ]);

  if (!edition) {
    notFound();
  }

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="State of the Field"
        title={edition.title}
        summary={edition.summary}
      />
      <section className="band">
        <div className="page-shell detail-panel">
          <ul className="bullet-list">
            {edition.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </section>
    </SiteShell>
  );
}
