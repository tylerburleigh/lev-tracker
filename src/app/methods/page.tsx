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
      "The curator judgment that turns evidence into a stage, confidence level, blocker, or reason not to upgrade a claim."
  },
  {
    id: "forecast",
    title: "Forecast",
    body:
      "The forward-looking outlook layer: what the current record suggests, what would change it, and where uncertainty remains."
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
        <div className="page-shell section-header">
          <div>
            <span className="section-kicker">Legend</span>
            <h2>Evidence, interpretation, forecast</h2>
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
