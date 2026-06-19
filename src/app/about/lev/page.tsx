import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CircleHelp,
  ExternalLink,
  Gauge,
  ListChecks,
  ShieldCheck,
  Waypoints
} from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated } from "@/lib/site-data";

export const metadata = {
  title: "What LEV Means | LEV Tracker",
  description:
    "A plain-language definition of longevity escape velocity, why it is hypothetical, and how the LEV Tracker uses the term."
};

const requirements = [
  {
    title: "Broad healthspan gains",
    summary:
      "Evidence would need to move beyond one disease or one biomarker and show repeatable benefit in older-adult function, resilience, morbidity, or mortality risk."
  },
  {
    title: "Long-lasting and repeatable effects",
    summary:
      "Useful interventions would have to last long enough, or be safe enough to repeat, so that gains do not vanish before the next round of aging damage accumulates."
  },
  {
    title: "Several compatible tracks",
    summary:
      "No single hallmark is likely to carry the whole burden. LEV would require progress across multiple aging mechanisms that can be sequenced or combined."
  },
  {
    title: "A pace faster than aging",
    summary:
      "The key claim is about rate: medicine would need to add healthy remaining life faster than chronological time removes it."
  }
] as const;

const notTheSameAs = [
  "A lifespan extension result in mice.",
  "A biomarker or epigenetic-clock improvement by itself.",
  "A therapy that helps one age-related disease while leaving broader aging risk unchanged.",
  "The 2036 scenario on this site. That page is a stress test, not the tracker forecast.",
  "A claim that aging has already been solved."
] as const;

const trackerUses = [
  {
    title: "It keeps the endpoint honest",
    summary:
      "LEV asks whether progress is broad, long-lasting, and fast enough to change remaining healthy life, not just whether a mechanism is interesting."
  },
  {
    title: "It makes gaps visible",
    summary:
      "The map separates biology-only plausibility, animal signals, human biomarkers, human function, and long-lasting outcomes so weak claims do not look stronger than they are."
  },
  {
    title: "It supports scenario thinking",
    summary:
      "Speculation is useful only when it says which evidence would have to arrive, where, and in what order."
  }
] as const;

export default async function LevExplainerPage() {
  const lastUpdated = await getOverallLastUpdated();

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Definition"
        title="What LEV means"
        summary="Longevity escape velocity is the hypothetical point where biomedical progress adds healthy remaining life faster than aging takes it away. It is a threshold claim about pace, durability, and breadth, not a claim the field has already arrived."
      >
        <div className="state-hero-aside">
          <span className="section-kicker">Plain definition</span>
          <p>
            If each year of progress could add more than one year of healthy remaining life, a person&apos;s expected
            healthy future would stop shrinking with time.
          </p>
        </div>
      </PageHero>

      <section className="band band--alt">
        <div className="page-shell explainer-split">
          <article className="explainer-panel explainer-panel--lead">
            <CircleHelp aria-hidden="true" size={21} />
            <span className="section-kicker">The useful version</span>
            <h2>LEV is a rate-of-progress idea</h2>
            <p>
              The core question is not whether one intervention can extend life. It is whether a sequence of medical
              improvements can keep arriving fast enough, and working broadly enough, that the next round of therapies
              catches up before ordinary age-related decline takes over.
            </p>
            <p>
              That makes LEV a much stronger bar than a promising trial, a disease-specific win, or a cleaner
              biological-age readout.
            </p>
          </article>
          <article className="explainer-panel">
            <Gauge aria-hidden="true" size={21} />
            <span className="section-kicker">Current read</span>
            <h2>The tracker does not treat LEV as near</h2>
            <p>
              Today&apos;s map has early human signals in several places, but the long-lasting outcome layer is still
              thin. That is why the site tracks evidence maturity, gaps, and watch signals instead of presenting LEV
              as a countdown.
            </p>
            <Link className="section-link section-link--block" href="/state-of-the-field">
              <span>Read field reviews</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">What would have to be true</span>
            <h2>The bar is higher than isolated progress</h2>
            <p>
              LEV becomes plausible only if multiple pieces of evidence line up. These are the practical tests the
              tracker uses when deciding whether progress is meaningful for the LEV question.
            </p>
          </div>
          <div className="explainer-grid">
            {requirements.map((requirement) => (
              <article className="explainer-card" key={requirement.title}>
                <ListChecks aria-hidden="true" size={19} />
                <h3>{requirement.title}</h3>
                <p>{requirement.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell explainer-split">
          <article className="explainer-panel">
            <ShieldCheck aria-hidden="true" size={21} />
            <span className="section-kicker">What LEV is not</span>
            <h2>Claims that should stay smaller</h2>
            <ul className="state-plain-list">
              {notTheSameAs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="explainer-panel">
            <Waypoints aria-hidden="true" size={21} />
            <span className="section-kicker">How this site uses the term</span>
            <h2>LEV is the organizing question</h2>
            <div className="explainer-mini-list">
              {trackerUses.map((item) => (
                <div className="explainer-mini-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="page-shell explainer-split">
          <article className="explainer-panel">
            <BookOpenText aria-hidden="true" size={21} />
            <span className="section-kicker">Read next</span>
            <h2>Where the concept meets the map</h2>
            <div className="source-link-list">
              <Link className="source-link" href="/guide">
                <span>How to read the tracker</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link className="source-link" href="/hallmarks/paper">
                <span>The Hallmarks of Aging paper</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link className="source-link" href="/scenarios/lev-by-2036">
                <span>Speculative LEV by 2036 scenario</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link className="source-link" href="/tracks">
                <span>Browse research tracks</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          </article>
          <article className="explainer-panel">
            <ExternalLink aria-hidden="true" size={21} />
            <span className="section-kicker">Source context</span>
            <h2>The phrase predates this tracker</h2>
            <p>
              The escape-velocity framing was popularized in early-2000s life-extension writing. This site uses the
              term conservatively: as a hypothesis to test against evidence, not as a promise.
            </p>
            <div className="source-link-list">
              <a
                className="source-link"
                href="https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.0020187"
                rel="noreferrer"
                target="_blank"
              >
                <span>de Grey, PLOS Biology, 2004</span>
                <ExternalLink aria-hidden="true" size={15} />
              </a>
            </div>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
