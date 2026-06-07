import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  ExternalLink,
  Layers3,
  ListChecks,
  Sigma,
  Sparkles
} from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  getHallmarks,
  getOverallLastUpdated
} from "@/lib/site-data";

export const metadata = {
  title: "The Hallmarks of Aging Paper | LEV Tracker",
  description:
    "A plain-language guide to the 2013 Hallmarks of Aging paper, its criteria, the original nine hallmarks, and the 2023 expansion used by this tracker."
};

const criteria = [
  {
    title: "It appears with normal aging",
    summary: "The feature should be detectable as organisms age, not only in unusual disease models."
  },
  {
    title: "Making it worse accelerates aging",
    summary: "Experimental aggravation should make aging phenotypes appear sooner or more severely."
  },
  {
    title: "Targeting it can improve aging",
    summary:
      "An intervention against the hallmark should be able to slow, prevent, or reverse relevant aging phenotypes."
  }
] as const;

const originalGroups = [
  {
    label: "Primary hallmarks",
    summary:
      "Damage sources or maintenance failures that are treated as upstream causes of age-related decline.",
    hallmarks: [
      "Genomic instability",
      "Telomere attrition",
      "Epigenetic alterations",
      "Loss of proteostasis"
    ]
  },
  {
    label: "Antagonistic hallmarks",
    summary:
      "Responses that can be beneficial at low levels or in the short term, but become damaging when chronic or excessive.",
    hallmarks: [
      "Deregulated nutrient sensing",
      "Mitochondrial dysfunction",
      "Cellular senescence"
    ]
  },
  {
    label: "Integrative hallmarks",
    summary:
      "System-level consequences that connect tissue failure, regeneration, and communication across the organism.",
    hallmarks: [
      "Stem cell exhaustion",
      "Altered intercellular communication"
    ]
  }
] as const;

const trackerUses = [
  {
    title: "Hallmarks are starting points",
    summary:
      "The site uses them to organize biology, not to imply that every hallmark already has a credible intervention path."
  },
  {
    title: "Tracks are the working layer",
    summary:
      "Each hallmark is broken into intervention tracks because evidence usually accumulates around specific approaches, not around a whole hallmark at once."
  },
  {
    title: "Evidence tiers keep the interpretation modest",
    summary:
      "A hallmark can be biologically important while still lacking human-function or long-lasting outcome evidence."
  }
] as const;

const sourceLinks = [
  {
    label: "2013 Cell paper DOI",
    href: "https://doi.org/10.1016/j.cell.2013.05.039"
  },
  {
    label: "2013 PubMed record",
    href: "https://pubmed.ncbi.nlm.nih.gov/23746838/"
  },
  {
    label: "2023 Cell expansion DOI",
    href: "https://doi.org/10.1016/j.cell.2022.11.001"
  },
  {
    label: "2023 PubMed record",
    href: "https://pubmed.ncbi.nlm.nih.gov/36599349/"
  }
] as const;

export default async function HallmarksPaperPage() {
  const lastUpdated = await getOverallLastUpdated();
  const hallmarks = getHallmarks();
  const expandedHallmarks = hallmarks.slice(0, 12);
  const addedIn2023 = expandedHallmarks.filter((hallmark) =>
    ["disabled_macroautophagy", "chronic_inflammation", "dysbiosis"].includes(hallmark.id)
  );

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Framework source"
        title="The Hallmarks of Aging paper"
        summary="The 2013 Cell paper gave aging research a shared framework for talking about biological mechanisms of aging. This tracker uses the later 2023 expansion, but the original paper is still the conceptual anchor."
      >
        <div className="state-hero-aside">
          <span className="section-kicker">Seminal paper</span>
          <p>Lopez-Otin, Blasco, Partridge, Serrano, and Kroemer. Cell, 2013.</p>
          <a
            className="mini-link"
            href="https://doi.org/10.1016/j.cell.2013.05.039"
            rel="noreferrer"
            target="_blank"
          >
            <span>Open DOI</span>
            <ExternalLink aria-hidden="true" size={15} />
          </a>
        </div>
      </PageHero>

      <section className="band band--alt">
        <div className="page-shell explainer-split">
          <article className="explainer-panel explainer-panel--lead">
            <BookOpenText aria-hidden="true" size={21} />
            <span className="section-kicker">Why it mattered</span>
            <h2>It turned aging biology into a testable framework</h2>
            <p>
              Before the Hallmarks paper, aging research had many mechanisms but less shared structure. The paper
              proposed a way to ask whether a biological process is merely associated with aging, causally important,
              and potentially useful as an intervention target.
            </p>
            <p>
              That distinction still matters for LEV: a mechanism can be central to aging without yet having evidence
              that an intervention improves human healthspan in people.
            </p>
          </article>
          <article className="explainer-panel">
            <ListChecks aria-hidden="true" size={21} />
            <span className="section-kicker">Three criteria</span>
            <h2>What makes something a hallmark?</h2>
            <div className="explainer-mini-list">
              {criteria.map((criterion) => (
                <div className="explainer-mini-item" key={criterion.title}>
                  <strong>{criterion.title}</strong>
                  <p>{criterion.summary}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">The original nine</span>
            <h2>The 2013 paper grouped hallmarks by role</h2>
            <p>
              The grouping is useful because it distinguishes upstream damage, compensatory responses that can turn
              harmful, and organism-level consequences.
            </p>
          </div>
          <div className="paper-group-grid">
            {originalGroups.map((group) => (
              <article className="paper-group" key={group.label}>
                <Layers3 aria-hidden="true" size={20} />
                <h3>{group.label}</h3>
                <p>{group.summary}</p>
                <ul className="paper-hallmark-list">
                  {group.hallmarks.map((hallmark) => (
                    <li key={hallmark}>{hallmark}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">2023 expansion</span>
            <h2>This tracker follows the expanded 12-hallmark taxonomy</h2>
            <p>
              A 2023 Cell update refreshed the framework and expanded the list from nine to twelve. The tracker&apos;s
              Hallmarks page uses that expanded version because it better matches the current field map.
            </p>
          </div>
          <div className="expanded-hallmark-grid">
            {expandedHallmarks.map((hallmark) => (
              <Link className="expanded-hallmark-card" href={`/hallmarks/${hallmark.id}`} key={hallmark.id}>
                <span>{hallmark.canonical_order.toString().padStart(2, "0")}</span>
                <strong>{hallmark.name}</strong>
                <p>{hallmark.description}</p>
              </Link>
            ))}
          </div>
          <div className="state-no-change">
            <Sparkles aria-hidden="true" size={18} />
            <strong>Added in the 2023 expansion</strong>
            <p>
              {addedIn2023.map((hallmark) => hallmark.name).join(", ")} were added to the framework and now appear as
              first-class hallmark areas in this tracker.
            </p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell explainer-split">
          <article className="explainer-panel">
            <Sigma aria-hidden="true" size={21} />
            <span className="section-kicker">How the tracker uses it</span>
            <h2>Framework first, evidence second</h2>
            <div className="explainer-mini-list">
              {trackerUses.map((item) => (
                <div className="explainer-mini-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="explainer-panel">
            <ExternalLink aria-hidden="true" size={21} />
            <span className="section-kicker">Source links</span>
            <h2>Primary records</h2>
            <div className="source-link-list">
              {sourceLinks.map((source) => (
                <a className="source-link" href={source.href} key={source.href} rel="noreferrer" target="_blank">
                  <span>{source.label}</span>
                  <ExternalLink aria-hidden="true" size={15} />
                </a>
              ))}
            </div>
            <Link className="section-link section-link--block" href="/hallmarks">
              <span>Open hallmark map</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
