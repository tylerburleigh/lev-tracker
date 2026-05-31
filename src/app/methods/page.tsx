import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated } from "@/lib/site-data";

const sections = [
  {
    title: "What the tracker is",
    body:
      "A public evidence map and progress tracker for longevity escape velocity, organized by the Hallmarks of Aging and translated into a curator-facing outlook layer."
  },
  {
    title: "What counts as evidence",
    body:
      "Sources, studies, and findings are the evidence layer. Activity items provide context but stay visually and conceptually separate from efficacy claims."
  },
  {
    title: "How stages move",
    body:
      "Hallmark and track stages move along a shared ladder from mechanistic plausibility to durable disease or mortality relevance. Replication, endpoint quality, safety, and human relevance all matter."
  },
  {
    title: "What gets published",
    body:
      "Automation can search, draft, and revise. Public changes are still human-reviewed before publication."
  }
];

export default async function MethodsPage() {
  const lastUpdated = await getOverallLastUpdated();

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Methods"
        title="Trust model"
        summary="The site separates evidence, interpretation, and forecast so field movement does not automatically become public belief."
      />
      <section className="band">
        <div className="page-shell methods-grid">
          {sections.map((section) => (
            <article className="method-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
