import Link from "next/link";
import {
  Clock3,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { StageBadge } from "@/components/stage-badge";
import { formatDate } from "@/lib/date";
import {
  getMomentumLabel,
  getOverallLastUpdated,
  getTracks,
  getTrackCoverage
} from "@/lib/site-data";

export const metadata = {
  title: "LEV by 2036 Scenario | LEV Tracker",
  description:
    "A speculative scenario for what would need to happen across hallmarks and intervention tracks for LEV by 2036 to become plausible."
};

const scenarioChapters = [
  {
    period: "2026",
    title: "The baseline is broad, not decisive",
    summary:
      "The field has early human signals in more places, but LEV still does not look close. The useful shift is that the map becomes easier to judge: which claims are biomarker-only, component-confounded, disease-specific, or narrow functional signals, and which might become aging-relevant if they replicate."
  },
  {
    period: "2027-2028",
    title: "Functional endpoints become the first filter",
    summary:
      "The scenario starts to work only if several watched programs report older-adult function, not just cleaner biomarkers. Rapalogs, NAD/redox and nutrient-sensing programs, mitophagy or autophagy approaches, repair trials, senescence programs, and microbiome programs either produce mobility, frailty, wound, cognition, or immune-function signals, or they fall back into the pile of interesting but non-decisive biology."
  },
  {
    period: "2029-2030",
    title: "Disease wins start crossing into geroscience",
    summary:
      "Inflammation and proteostasis are the most likely places for hard clinical outcomes to keep arriving first, but disease wins are not enough. The scenario needs those wins to teach aging programs how to select populations, measure durability, control safety, and avoid treating narrow disease slowing as broad rejuvenation."
  },
  {
    period: "2030-2032",
    title: "Repair and clearance have to replicate",
    summary:
      "Stem-cell replacement, senescence clearance or suppression, tissue-repair biology, extracellular-vesicle and secretome approaches, and microbiome restoration need to show repeatable benefit in older adults or disease-adjacent aging settings. This is where delivery, manufacturing, product characterization, immune risk, cancer risk, and long-lasting effects become more important than biological excitement."
  },
  {
    period: "2032-2034",
    title: "The frontier tracks need safe human footholds",
    summary:
      "Partial reprogramming, epigenome restoration, telomere biology, genome-stability work, and systemic-signal reset do not need to solve aging outright. For the 2036 scenario, they need bounded human evidence: localized delivery, clear target engagement, no major safety surprise, and a credible path to long-lasting improvement in human function."
  },
  {
    period: "2034-2036",
    title: "The combination problem becomes the LEV test",
    summary:
      "By this point the question is no longer whether isolated interventions can move endpoints. The scenario needs several compatible interventions that can be sequenced or repeated, with benefits lasting long enough and broad enough that health gains plausibly outrun ordinary age-related decline. If the gains remain narrow, short, unsafe, or mutually incompatible, 2036 remains only a thought experiment."
  }
] as const;

const dominoes = [
  {
    title: "Endpoints become trusted",
    summary:
      "Trials converge on older-adult function, frailty, resilience, cognition, tissue repair, immune function, multimorbidity, or disability, with biomarkers treated as support rather than proof."
  },
  {
    title: "Several tracks replicate",
    summary:
      "At least a few independent tracks show repeated human benefit with enough durability to matter, instead of one isolated success carrying the whole story."
  },
  {
    title: "Safety survives prevention",
    summary:
      "Interventions that look useful in disease settings also prove tolerable enough for repeated use in aging-relevant populations."
  },
  {
    title: "Combinations stop being hand-wavy",
    summary:
      "The field learns which interventions can be layered, sequenced, or cycled without canceling each other out or compounding risk."
  }
] as const;

const trackMilestones = [
  {
    trackId: "rapalogs",
    window: "2027-2028",
    scenarioMilestone:
      "A rapalog or adjacent nutrient-sensing program reports repeated older-adult improvement in human function with dosing that looks compatible with preventive geroscience.",
    breakCondition:
      "The field gets only pathway markers, tolerability problems, or effects too small to matter outside carefully selected groups."
  },
  {
    trackId: "selective-autophagy-and-organelle-quality-control",
    window: "2027-2029",
    scenarioMilestone:
      "Mitophagy or selective-organelle quality-control signals tie cleanly to mobility, endurance, frailty, immune resilience, or disease-relevant function.",
    breakCondition:
      "Mitochondrial and autophagy biomarkers keep moving without long-lasting functional meaning."
  },
  {
    trackId: "cytokine-and-inflammasome-modulation",
    window: "2028-2030",
    scenarioMilestone:
      "Targeted inflammatory modulation extends from cardiovascular-risk settings into older-adult function, immune resilience, or multimorbidity without unacceptable infection or metabolic tradeoffs.",
    breakCondition:
      "Benefits remain disease-specific, risk-selected, or offset by safety burdens."
  },
  {
    trackId: "protein-aggregate-clearance",
    window: "2028-2031",
    scenarioMilestone:
      "Disease-specific aggregate programs produce more outcome wins and direct aggregate-depleting approaches begin showing clinically useful function in aging-relevant tissues.",
    breakCondition:
      "The wins stay confined to narrow amyloid diseases or precursor suppression, with no broader proteostasis lesson."
  },
  {
    trackId: "senolytics",
    window: "2028-2031",
    scenarioMilestone:
      "Senolytic programs move beyond early biomarker and mixed functional signals into replicated older-adult function, disease progression, or durability benefits with usable safety.",
    breakCondition:
      "D+Q, fisetin, or adjacent programs keep producing mixed, subgroup-limited, short-course, or biomarker-only reads without a clear preventive-use safety case."
  },
  {
    trackId: "stem-cell-replacement-and-transplantation",
    window: "2029-2031",
    scenarioMilestone:
      "Frailty, repair, Parkinson, retinal, immune, or other replacement programs show long-lasting improvement in human function with mechanism-linked biomarkers and manageable long-term risk.",
    breakCondition:
      "Signals fail replication, graft function is weak, or surgery, immune control, tumor risk, or ectopic-cell risk limits use."
  },
  {
    trackId: "microbiome-metabolite-restoration",
    window: "2029-2031",
    scenarioMilestone:
      "Microbiome metabolite, live-biotherapeutic, or ecosystem-replacement programs move beyond composition and show older-adult function, resilience, or safety at useful duration.",
    breakCondition:
      "Effects remain supplement-sized, short-lived, subjective, or hard to separate from diet and baseline health."
  },
  {
    trackId: "extracellular-vesicle-and-secretome-therapies",
    window: "2029-2032",
    scenarioMilestone:
      "EV or secretome programs isolate product-defined effects from lifestyle, supplement, microneedling, or other combination protocols and show controlled functional or durability benefits.",
    breakCondition:
      "Signals remain cosmetic, biological-age-only, product-heterogeneous, or component-confounded, while disease trials stay small, uncontrolled, mixed, or null."
  },
  {
    trackId: "immune-clearance-of-senescent-cells",
    window: "2030-2032",
    scenarioMilestone:
      "Senescent-cell clearance becomes selective enough to improve tissue function or disease progression over months without disrupting repair, immunity, or cancer surveillance.",
    breakCondition:
      "Clearance is too blunt, too local, too unsafe, or unable to connect senescence markers to long-lasting improvement in human function."
  },
  {
    trackId: "partial-reprogramming",
    window: "2032-2034",
    scenarioMilestone:
      "Partial reprogramming moves beyond today's no-results human registry boundary into bounded human evidence: localized delivery, measurable epigenetic or tissue restoration, no major safety surprise, and a plausible route to function.",
    breakCondition:
      "Delivery, cancer risk, loss of cell identity, immune response, or weak durability keeps it preclinical."
  },
  {
    trackId: "telomerase-restoration",
    window: "2032-2035",
    scenarioMilestone:
      "Telomere or telomerase programs establish safety-bounded human target engagement and a narrow functional or disease-relevant use case.",
    breakCondition:
      "Cancer surveillance, clonal expansion, or biomarker-only evidence prevents a credible aging-relevant role."
  }
] as const;

const failureModes = [
  "Most positive results are short biomarker movements that never become long-lasting function.",
  "Biological-age, skin, or other attractive near-aging signals stay component-confounded or product-heterogeneous.",
  "Disease-specific wins do not generalize to aging-relevant populations.",
  "Delivery and manufacturing make the strongest biological ideas too hard to use repeatedly.",
  "Safety limits appear when interventions move from severe disease into prevention or maintenance.",
  "Combination trials show that useful interventions interfere with each other or compound risk.",
  "The first long-lasting benefits are real but too narrow or too small to plausibly outrun aging by 2036."
] as const;

function getMomentumTone(momentum?: string) {
  switch (momentum) {
    case "accelerating":
    case "steady":
      return "micro-badge--mint";
    case "mixed":
      return "micro-badge--gold";
    case "stalled":
      return "micro-badge--red";
    default:
      return "micro-badge--muted";
  }
}

export default async function LevBy2036ScenarioPage() {
  const tracksById = new Map(getTracks().map((track) => [track.id, track]));
  const [lastUpdated, trackReads] = await Promise.all([
    getOverallLastUpdated(),
    Promise.all(
      trackMilestones.map(async (milestone) => ({
        ...milestone,
        track: tracksById.get(milestone.trackId),
        coverage: await getTrackCoverage(milestone.trackId)
      }))
    )
  ]);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Speculative scenario"
        title="LEV by 2036, if the dominoes fall"
        summary="A deliberately speculative path from today's evidence map to a world where longevity escape velocity by 2036 becomes plausible. This is not the site forecast; it is a stress test of what would have to go right."
      />

      <section className="band band--alt">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">Scenario narrative</span>
            <h2>The short version</h2>
            <p>
              The 2036 path is not one miracle intervention. It is a sequence where several narrow but real human
              results turn into long-lasting older-adult benefit, then into compatible maintenance cycles.
            </p>
          </div>
          <div className="scenario-timeline">
            {scenarioChapters.map((chapter) => (
              <article className="scenario-chapter" key={chapter.period}>
                <span>{chapter.period}</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">Dominoes</span>
            <h2>What has to become true</h2>
            <p>
              These are the enabling shifts. Without them, even impressive one-off results would not make a 2036 LEV
              scenario credible.
            </p>
          </div>
          <div className="scenario-domino-grid">
            {dominoes.map((domino, index) => (
              <article className="scenario-domino" key={domino.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{domino.title}</h3>
                <p>{domino.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">Track milestones</span>
            <h2>Where progress would likely have to show up</h2>
            <p>
              The dates below are scenario pressure points, not predictions. They sketch what “fast enough” would look
              like if today&apos;s most legible tracks carried the early weight.
            </p>
          </div>
          <div className="scenario-track-table">
            <div className="scenario-track-table__head" aria-hidden="true">
              <span>Window</span>
              <span>Track</span>
              <span>Current read</span>
              <span>Scenario milestone</span>
              <span>What breaks it</span>
            </div>
            {trackReads.map(({ track, coverage, window, scenarioMilestone, breakCondition, trackId }) => (
              <Link className="scenario-track-row" href={`/tracks/${trackId}`} key={trackId}>
                <div className="scenario-track-row__window">
                  <Clock3 aria-hidden="true" size={16} />
                  <span>{window}</span>
                </div>
                <div className="scenario-track-row__track">
                  <strong>{track?.name ?? trackId}</strong>
                  <span>{track?.primaryHallmarkId}</span>
                </div>
                <div className="scenario-track-row__read">
                  {coverage.stage ? <StageBadge stage={coverage.stage} /> : null}
                  <span className={`micro-badge ${getMomentumTone(coverage.momentum)}`}>
                    {coverage.momentum ? getMomentumLabel(coverage.momentum) : "Momentum unclear"}
                  </span>
                </div>
                <p>{scenarioMilestone}</p>
                <p>{breakCondition}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="page-shell scenario-split">
          <article className="scenario-panel scenario-panel--lead">
            <Sparkles aria-hidden="true" size={20} />
            <span className="section-kicker">What 2036 would look like</span>
            <h2>Not immortality, and not a single cure</h2>
            <p>
              In the successful version, older adults can receive a small set of evidence-backed maintenance
              interventions: one or two for metabolic and inflammatory risk, one for mitochondrial or proteostasis
              resilience, one for senescence, repair, or cell replacement in vulnerable tissues, and one frontier
              therapy that resets a localized aging program without major safety cost.
            </p>
            <p>
              LEV would still be a live question, not a settled fact. The difference is that the debate would move
              from “where is the human evidence?” to “are the combined gains broad, long-lasting, and repeatable enough to
              outrun the next year of aging?”
            </p>
          </article>
          <article className="scenario-panel">
            <ShieldCheck aria-hidden="true" size={20} />
            <span className="section-kicker">Failure modes</span>
            <h2>How this scenario fails</h2>
            <ul className="state-plain-list">
              {failureModes.map((failure) => (
                <li key={failure}>{failure}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
