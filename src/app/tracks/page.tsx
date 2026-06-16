import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Search,
  ShieldCheck,
  Waypoints,
  X
} from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { StageBadge } from "@/components/stage-badge";
import { formatDate } from "@/lib/date";
import {
  type Momentum,
  type Stage,
  getHallmarkById,
  getHallmarks,
  getMomentumLabel,
  getOverallLastUpdated,
  getStageLabel,
  getTracks,
  getTrackCoverage
} from "@/lib/site-data";

type TrackSearchParams = {
  q?: string | string[];
  hallmark?: string | string[];
  stage?: string | string[];
  momentum?: string | string[];
};

type TracksIndexPageProps = {
  searchParams?: Promise<TrackSearchParams>;
};

const stageOptions: Stage[] = [
  "mechanistic_plausibility",
  "animal_signal",
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
];

const momentumOptions: Momentum[] = ["accelerating", "steady", "mixed", "stalled", "uncertain"];

const taxonomyRationaleCards = [
  {
    title: "Why tracks exist",
    summary:
      "A hallmark is too broad to review as one stream, while a single intervention is too narrow to organize the field.",
    icon: Waypoints
  },
  {
    title: "How we draw boundaries",
    summary:
      "A track should recur across sources, have one primary hallmark, and be searchable enough for repeated review.",
    icon: GitBranch
  },
  {
    title: "How tracks can change",
    summary:
      "The taxonomy can add, split, merge, rename, or retire tracks when evidence shows that the current boundary is not useful.",
    icon: ShieldCheck
  }
] as const;

const taxonomyChangeSteps = [
  "A research pass, source-completeness check, registry search, or review cluster exposes a boundary problem.",
  "The candidate passes a boundary test: broader than one intervention, narrower than a hallmark, and useful for repeated review.",
  "A taxonomy proposal records the rationale, affected records, hallmark mapping, aliases, and migration notes.",
  "Public record moves require taxonomy-mapping review before the change is published."
] as const;

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeNeedle(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getMomentumTone(momentum?: Momentum) {
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

export default async function TracksIndexPage({ searchParams }: TracksIndexPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = {
    query: getSingleSearchParam(resolvedSearchParams.q).trim(),
    hallmark: getSingleSearchParam(resolvedSearchParams.hallmark),
    stage: getSingleSearchParam(resolvedSearchParams.stage) as Stage | "",
    momentum: getSingleSearchParam(resolvedSearchParams.momentum) as Momentum | ""
  };
  const queryNeedle = normalizeNeedle(selected.query);
  const tracks = getTracks();
  const hallmarks = getHallmarks();
  const [lastUpdated, coverageEntries] = await Promise.all([
    getOverallLastUpdated(),
    Promise.all(tracks.map(async (track) => [track.id, await getTrackCoverage(track.id)] as const))
  ]);
  const coverageByTrackId = new Map(coverageEntries);
  const filteredTracks = tracks.filter((track) => {
    const coverage = coverageByTrackId.get(track.id);
    if (!coverage) return false;

    const trackHallmarkIds = [track.primaryHallmarkId, ...(track.secondary_hallmark_ids ?? [])];
    const searchableText = [
      track.name,
      track.id,
      track.summary,
      ...(track.search_aliases ?? []),
      ...(track.exemplar_interventions ?? []),
      coverage.interpretation,
      coverage.evidenceGap,
      coverage.strongestEvidence,
      ...(coverage.whatWouldChangeTheRating ?? []),
      ...(coverage.supportingFindingIds ?? []),
      ...(coverage.supportingEvidence?.flatMap((item) => [
        item.label,
        item.conclusion,
        item.support_role,
        item.rationale,
        ...(item.limitations ?? []),
        ...item.finding_ids
      ]) ?? [])
    ]
      .filter((item): item is string => Boolean(item))
      .join(" ")
      .toLocaleLowerCase();

    return (
      (!queryNeedle || searchableText.includes(queryNeedle)) &&
      (!selected.hallmark || trackHallmarkIds.includes(selected.hallmark)) &&
      (!selected.stage || coverage.stage === selected.stage) &&
      (!selected.momentum || coverage.momentum === selected.momentum)
    );
  });

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Tracks"
        title="Research approaches across the hallmarks"
        summary="Tracks are our site-specific layer between hallmark theory and specific intervention records: broader than one intervention, narrower than a whole hallmark."
      >
        <div className="state-hero-aside">
          <span className="section-kicker">Editorial taxonomy</span>
          <p>
            Tracks are not a formal layer from the Hallmarks papers. They are a practical scaffold for evidence review.
          </p>
          <Link className="mini-link" href="/hallmarks/paper">
            <span>Read framework guide</span>
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
          <Link className="mini-link" href="/tracks#taxonomy-rationale">
            <span>How tracks change</span>
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </PageHero>
      <section className="band">
        <div className="page-shell track-search">
          <form className="track-search__form" action="/tracks">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Track name or alias"
                  defaultValue={selected.query}
                />
              </div>
            </label>
            <label className="track-search__field">
              <span>Hallmark</span>
              <select name="hallmark" defaultValue={selected.hallmark}>
                <option value="">All hallmarks</option>
                {hallmarks.map((hallmark) => (
                  <option value={hallmark.id} key={hallmark.id}>
                    {hallmark.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Stage</span>
              <select name="stage" defaultValue={selected.stage}>
                <option value="">All stages</option>
                {stageOptions.map((stage) => (
                  <option value={stage} key={stage}>
                    {getStageLabel(stage)}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Momentum</span>
              <select name="momentum" defaultValue={selected.momentum}>
                <option value="">All momentum</option>
                {momentumOptions.map((momentum) => (
                  <option value={momentum} key={momentum}>
                    {getMomentumLabel(momentum)}
                  </option>
                ))}
              </select>
            </label>
            <div className="track-search__actions">
              <button className="action-button" type="submit">
                <Search aria-hidden="true" size={16} />
                <span>Apply</span>
              </button>
              <Link className="action-button action-button--secondary" href="/tracks">
                <X aria-hidden="true" size={16} />
                <span>Reset</span>
              </Link>
            </div>
          </form>
        </div>

        <div className="page-shell tracks-table">
          <div className="tracks-table__head">
            <div>
              <span className="section-kicker">Track list</span>
              <h2>{filteredTracks.length} matching tracks</h2>
            </div>
            <span>Ordered by hallmark taxonomy</span>
          </div>
          {filteredTracks.map((track) => {
            const hallmark = getHallmarkById(track.primaryHallmarkId);
            const coverage = coverageByTrackId.get(track.id);
            if (!coverage) return null;

            return (
              <Link className="tracks-table__row" href={`/tracks/${track.id}`} key={track.id}>
                <div className="tracks-table__main">
                  <div className="tracks-table__topline">
                    <span className="micro-badge micro-badge--outline">
                      {hallmark?.name ?? track.primaryHallmarkId}
                    </span>
                  </div>
                  <strong>{track.name}</strong>
                  <p>{track.summary}</p>
                  {track.search_aliases?.length ? (
                    <div className="tracks-table__aliases" aria-label="Search aliases">
                      {track.search_aliases.slice(0, 3).map((alias) => (
                        <span key={alias}>{alias}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="tracks-table__signals" aria-label="Track status">
                  <time dateTime={coverage.lastUpdated}>Updated {formatDate(coverage.lastUpdated)}</time>
                  <div className="tracks-table__badges">
                    {coverage.stage ? (
                      <StageBadge stage={coverage.stage} />
                    ) : (
                      <span className="micro-badge micro-badge--muted">Not rated yet</span>
                    )}
                    <span className={`micro-badge ${getMomentumTone(coverage.momentum)}`}>
                      {coverage.momentum ? getMomentumLabel(coverage.momentum) : "Not rated"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {!filteredTracks.length ? (
            <div className="tracks-table__empty">
              <strong>No tracks match those filters.</strong>
              <Link className="mini-link" href="/tracks">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="band band--alt" id="taxonomy-rationale">
        <div className="page-shell scenario-section">
          <div className="scenario-section__header">
            <span className="section-kicker">Taxonomy rationale</span>
            <h2>Tracks are stable, but not frozen</h2>
            <p>
              Tracks are a practical evidence-map layer, not a formal claim from the Hallmarks papers. The goal is to
              keep each review small enough to inspect while preserving the broader hallmark context.
            </p>
          </div>

          <div className="report-ledger taxonomy-ledger">
            {taxonomyRationaleCards.map(({ title, summary, icon: Icon }) => (
              <article className="report-ledger-row" key={title}>
                <span>
                  <Icon aria-hidden="true" size={15} />
                  {title}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{summary}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="report-duo">
            <section className="report-section-block">
              <span className="section-kicker">Governance</span>
              <h2>How a track change would happen</h2>
              <ul className="state-plain-list">
                {taxonomyChangeSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
            <section className="report-section-block">
              <span className="section-kicker">Framework boundary</span>
              <h2>Hallmarks are the source framework</h2>
              <p>
                The Hallmarks papers define the biological organizing frame. Tracks are our provisional scaffold for
                following intervention families, studies, findings, and outlook changes inside that frame.
              </p>
              <Link className="section-link section-link--block" href="/hallmarks/paper">
                <span>Read the Hallmarks guide</span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </section>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
