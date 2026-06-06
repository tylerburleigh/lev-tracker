import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated } from "@/lib/site-data";

const sections = [
  {
    title: "What the map is",
    body:
      "A public evidence map for longevity escape velocity, organized by the Hallmarks of Aging, with outlooks that summarize how strong each claim looks right now."
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
      "Search and drafting can be assisted by tooling. Public changes are still reviewed before publication."
  }
];

const legendSections = [
  {
    id: "evidence",
    title: "Evidence",
    body:
      "The source, study, and finding records that anchor a claim. Evidence can support, limit, balance, or contextualize a rating."
  },
  {
    id: "interpretation",
    title: "Interpretation",
    body:
      "The judgment layer that turns evidence into a stage, confidence level, evidence gap, or reason not to upgrade a claim."
  },
  {
    id: "outlook",
    title: "Outlook",
    body:
      "The forward-looking judgment layer: what the current record suggests, what would change the outlook, and where uncertainty remains."
  }
];

export default async function MethodsPage() {
  const lastUpdated = await getOverallLastUpdated();

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Methods"
        title="Trust model"
        summary="The site separates evidence, interpretation, and outlook so field movement does not automatically become evidence of progress."
      />
      <section className="band">
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Legend</span>
            <h2>Evidence, interpretation, outlook</h2>
          </div>
        </div>
        <div className="page-shell methods-grid method-anchor-grid">
          {legendSections.map((section) => (
            <article className="method-card method-card--anchor" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="band band--alt">
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
