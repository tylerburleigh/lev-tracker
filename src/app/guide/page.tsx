import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Gauge,
  ListChecks,
  Radar,
  SearchCheck,
  ShieldCheck,
  Signal,
  TriangleAlert
} from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  type Confidence,
  type CoverageVerdict,
  type Momentum,
  type ObservedResearchDensity,
  type Stage,
  getCoverageVerdictLabel,
  getCoverageVerdictPlainMeaning,
  getMomentumLabel,
  getMomentumPlainMeaning,
  getOverallLastUpdated,
  getReadFirmnessLabel,
  getReadFirmnessPlainMeaning,
  getResearchDensityLabel,
  getResearchDensityPlainMeaning,
  getStageLabel,
  getStagePlainMeaning
} from "@/lib/site-data";

export const metadata = {
  title: "How to Read the LEV Tracker | LEV Tracker",
  description:
    "A reader guide to evidence stages, momentum, read firmness, coverage confidence, research density, and common misreads in the LEV Tracker."
};

const evidenceStages: Stage[] = [
  "mechanistic_plausibility",
  "animal_signal",
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
];

const momentumValues: Momentum[] = ["accelerating", "steady", "mixed", "stalled", "uncertain"];
const readFirmnessValues: Confidence[] = ["low", "moderate", "high"];
const coverageValues: CoverageVerdict[] = ["thin", "adequate", "strong"];
const densityValues: ObservedResearchDensity[] = ["unknown", "sparse", "emerging", "active", "dense"];

const readingSteps = [
  {
    label: "Start with the overall read",
    title: "Ask whether the field moved, not whether something interesting happened",
    summary:
      "The homepage and latest State of the Field separate ordinary activity from evidence that changes the LEV outlook."
  },
  {
    label: "Check the evidence stage",
    title: "Biology, animals, biomarkers, function, and durable outcomes are different claims",
    summary:
      "A track can be scientifically important while still sitting far below durable human health or mortality relevance."
  },
  {
    label: "Read firmness and momentum together",
    title: "A fast-moving field can still have a tentative read",
    summary:
      "Momentum says whether useful evidence is arriving. Read firmness says how likely the current interpretation is to change."
  },
  {
    label: "Separate map coverage from evidence strength",
    title: "A good map is not the same thing as strong science",
    summary:
      "Coverage confidence says whether the tracker has checked enough categories. Evidence strength is judged from findings, endpoints, and limitations."
  },
  {
    label: "Look for the rating-change criteria",
    title: "The most useful question is what would change the read",
    summary:
      "Track pages list the evidence, trial, replication, safety, or endpoint signals that would make the rating more or less optimistic."
  }
] as const;

const readerRoutes = [
  {
    title: "I want the short answer",
    summary: "Start with the current State of LEV and the latest field review.",
    href: "/",
    icon: Radar
  },
  {
    title: "I want to inspect an area",
    summary: "Use tracks to compare intervention families within the Hallmarks framework.",
    href: "/tracks",
    icon: ListChecks
  },
  {
    title: "I want to know if the map is complete",
    summary: "Use coverage to separate source-map confidence from observed research density.",
    href: "/coverage",
    icon: SearchCheck
  },
  {
    title: "I want structured data",
    summary: "Use the JSON export for IDs, legends, caveats, and provenance-linked records.",
    href: "/data",
    icon: BookOpenText
  }
] as const;

const commonMisreads = [
  {
    title: "Human biomarker signal does not mean human healthspan benefit",
    summary:
      "Biomarker movement can show pathway engagement or risk-factor movement without proving durable function, disease, or mortality impact."
  },
  {
    title: "Active field does not mean strong evidence",
    summary:
      "Research density describes how much relevant work appears to exist. It does not say the results are positive or clinically decisive."
  },
  {
    title: "Adequate map does not mean settled science",
    summary:
      "A track can be mapped well enough to discuss while still carrying high-priority gaps, conflicting evidence, or weak endpoints."
  },
  {
    title: "Trial watch does not mean trial success",
    summary:
      "A registry-linked trial matters when results, linked publications, or interpretable endpoints appear. Trial existence alone is not evidence of benefit."
  },
  {
    title: "The 2036 scenario is not the tracker forecast",
    summary:
      "Scenario pages stress-test what would have to happen. The current outlook remains anchored in published evidence and explicit caveats."
  }
] as const;

function ScaleList({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="guide-scale-panel">
      <h2>{title}</h2>
      <div className="guide-scale-list">{children}</div>
    </section>
  );
}

export default async function ReaderGuidePage() {
  const lastUpdated = await getOverallLastUpdated();

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Reader guide"
        title="How to read the LEV Tracker"
        summary="A practical guide to interpreting stages, momentum, coverage, research density, gaps, and trial signals without treating early evidence as stronger than it is."
      >
        <div className="state-hero-aside">
          <span className="section-kicker">Core rule</span>
          <p>
            Read every claim in three layers: what the evidence says, how complete the tracker map is, and what result
            would change the outlook.
          </p>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell report-ledger guide-reading-steps">
          {readingSteps.map((step) => (
            <article className="report-ledger-row" key={step.label}>
              <span>{step.label}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell guide-scale-grid">
          <ScaleList title="Evidence stage">
            {evidenceStages.map((stage) => (
              <div className="guide-scale-row" key={stage}>
                <strong>{getStageLabel(stage)}</strong>
                <p>{getStagePlainMeaning(stage)}</p>
              </div>
            ))}
          </ScaleList>

          <ScaleList title="Momentum">
            {momentumValues.map((momentum) => (
              <div className="guide-scale-row" key={momentum}>
                <strong>{getMomentumLabel(momentum)}</strong>
                <p>{getMomentumPlainMeaning(momentum)}</p>
              </div>
            ))}
          </ScaleList>

          <ScaleList title="Read firmness">
            {readFirmnessValues.map((confidence) => (
              <div className="guide-scale-row" key={confidence}>
                <strong>{getReadFirmnessLabel(confidence)}</strong>
                <p>{getReadFirmnessPlainMeaning(confidence)}</p>
              </div>
            ))}
          </ScaleList>
        </div>
      </section>

      <section className="band">
        <div className="page-shell explainer-split">
          <article className="explainer-panel explainer-panel--lead">
            <Gauge aria-hidden="true" size={21} />
            <span className="section-kicker">Coverage vs evidence</span>
            <h2>Coverage tells you how much to trust the map</h2>
            <p>
              The tracker can have good coverage of a weak area, or thin coverage of an area that might be richer than
              the public map shows. That is why the coverage dashboard keeps map completeness separate from observed
              research density.
            </p>
            <Link className="section-link section-link--block" href="/coverage">
              <span>Open coverage dashboard</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
          <article className="explainer-panel">
            <Signal aria-hidden="true" size={21} />
            <span className="section-kicker">Density labels</span>
            <h2>How much research appears to exist?</h2>
            <div className="explainer-mini-list">
              {densityValues.map((density) => (
                <div className="explainer-mini-item" key={density}>
                  <strong>{getResearchDensityLabel(density)}</strong>
                  <p>{getResearchDensityPlainMeaning(density)}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell explainer-split">
          <article className="explainer-panel">
            <ShieldCheck aria-hidden="true" size={21} />
            <span className="section-kicker">Map completeness</span>
            <h2>Coverage labels are about curation, not clinical proof</h2>
            <div className="explainer-mini-list">
              {coverageValues.map((coverage) => (
                <div className="explainer-mini-item" key={coverage}>
                  <strong>{getCoverageVerdictLabel(coverage)}</strong>
                  <p>{getCoverageVerdictPlainMeaning(coverage)}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="explainer-panel">
            <TriangleAlert aria-hidden="true" size={21} />
            <span className="section-kicker">Common misreads</span>
            <h2>Keep these claims smaller</h2>
            <div className="guide-misread-list">
              {commonMisreads.map((item) => (
                <section key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="page-shell guide-route-grid">
          {readerRoutes.map(({ title, summary, href, icon: Icon }) => (
            <Link className="guide-route-card" href={href} key={href}>
              <Icon aria-hidden="true" size={18} />
              <strong>{title}</strong>
              <p>{summary}</p>
              <span>
                Open
                <ArrowRight aria-hidden="true" size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
