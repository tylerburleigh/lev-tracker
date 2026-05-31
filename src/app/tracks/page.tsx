import Link from "next/link";
import { Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  type Confidence,
  type Momentum,
  type Stage,
  getHallmarkById,
  getHallmarks,
  getConfidenceLabel,
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
  confidence?: string | string[];
  coverage?: string | string[];
};

type TracksIndexPageProps = {
  searchParams?: Promise<TrackSearchParams>;
};

type CoverageStatus = "covered" | "thin" | "in_progress";

const stageOptions: Stage[] = [
  "mechanistic_plausibility",
  "animal_signal",
  "human_biomarker_signal",
  "human_functional_benefit",
  "durable_disease_or_mortality_relevance"
];

const momentumOptions: Momentum[] = ["accelerating", "steady", "mixed", "stalled", "uncertain"];
const confidenceOptions: Confidence[] = ["low", "moderate", "high"];

const coverageOptions: Array<{ value: CoverageStatus; label: string }> = [
  { value: "covered", label: "Baseline coverage" },
  { value: "thin", label: "Thin coverage" },
  { value: "in_progress", label: "Coverage in progress" }
];

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeNeedle(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getCoverageStatus(coverage: Awaited<ReturnType<typeof getTrackCoverage>>): CoverageStatus {
  if (!coverage.stage) {
    return "in_progress";
  }

  if (coverage.thinCoverage) {
    return "thin";
  }

  return "covered";
}

function getCoverageStatusLabel(status: CoverageStatus) {
  return coverageOptions.find((option) => option.value === status)?.label ?? status;
}

export default async function TracksIndexPage({ searchParams }: TracksIndexPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selected = {
    query: getSingleSearchParam(resolvedSearchParams.q).trim(),
    hallmark: getSingleSearchParam(resolvedSearchParams.hallmark),
    stage: getSingleSearchParam(resolvedSearchParams.stage) as Stage | "",
    momentum: getSingleSearchParam(resolvedSearchParams.momentum) as Momentum | "",
    confidence: getSingleSearchParam(resolvedSearchParams.confidence) as Confidence | "",
    coverage: getSingleSearchParam(resolvedSearchParams.coverage) as CoverageStatus | ""
  };
  const queryNeedle = normalizeNeedle(selected.query);
  const tracks = getTracks();
  const hallmarks = getHallmarks();
  const [lastUpdated, coverageEntries] = await Promise.all([
    getOverallLastUpdated(),
    Promise.all(tracks.map(async (track) => [track.id, await getTrackCoverage(track.id)] as const))
  ]);
  const coverageByTrackId = new Map(coverageEntries);
  const coveredCount = coverageEntries.filter(([, coverage]) => Boolean(coverage.stage)).length;
  const inProgressCount = tracks.length - coveredCount;
  const filteredTracks = tracks.filter((track) => {
    const coverage = coverageByTrackId.get(track.id);
    if (!coverage) return false;

    const trackHallmarkIds = [track.primaryHallmarkId, ...(track.secondary_hallmark_ids ?? [])];
    const coverageStatus = getCoverageStatus(coverage);
    const searchableText = [
      track.name,
      track.id,
      track.summary,
      ...(track.search_aliases ?? []),
      ...(track.exemplar_interventions ?? []),
      coverage.note,
      coverage.blocker,
      coverage.bestSignal,
      ...(coverage.ratingChangeCriteria ?? []),
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
      (!selected.momentum || coverage.momentum === selected.momentum) &&
      (!selected.confidence || coverage.confidence === selected.confidence) &&
      (!selected.coverage || coverageStatus === selected.coverage)
    );
  });

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Tracks"
        title="Research approaches across the hallmarks"
        summary="Tracks are the stable layer between hallmark theory and specific intervention records."
      >
        <div className="page-hero__stats">
          <span>{tracks.length} seeded tracks</span>
          <span>{coveredCount} with baseline coverage</span>
          <span>{inProgressCount} in progress</span>
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
            <label className="track-search__field">
              <span>Confidence</span>
              <select name="confidence" defaultValue={selected.confidence}>
                <option value="">All confidence</option>
                {confidenceOptions.map((confidence) => (
                  <option value={confidence} key={confidence}>
                    {getConfidenceLabel(confidence)}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Coverage</span>
              <select name="coverage" defaultValue={selected.coverage}>
                <option value="">All coverage</option>
                {coverageOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
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
          <div className="track-search__summary" aria-live="polite">
            <strong>{filteredTracks.length}</strong>
            <span>of {tracks.length} tracks</span>
          </div>
        </div>

        <div className="page-shell tracks-table">
          <div className="tracks-table__head">
            <span>Track</span>
            <span>Primary hallmark</span>
            <span>Current stage</span>
            <span>Momentum</span>
            <span>Confidence</span>
            <span>Coverage</span>
            <span>Last updated</span>
          </div>
          {filteredTracks.map((track) => {
            const hallmark = getHallmarkById(track.primaryHallmarkId);
            const coverage = coverageByTrackId.get(track.id);
            if (!coverage) return null;
            const coverageStatus = getCoverageStatus(coverage);

            return (
              <Link className="tracks-table__row" href={`/tracks/${track.id}`} key={track.id}>
                <div>
                  <strong>{track.name}</strong>
                  <p>{track.summary}</p>
                  {track.search_aliases?.length ? (
                    <span className="tracks-table__aliases">
                      {track.search_aliases.slice(0, 3).join(" | ")}
                    </span>
                  ) : null}
                </div>
                <span>{hallmark?.name ?? track.primaryHallmarkId}</span>
                <span>{coverage.stage ? getStageLabel(coverage.stage) : coverage.statusLabel}</span>
                <span>{coverage.momentum ? getMomentumLabel(coverage.momentum) : "Not rated"}</span>
                <span>{coverage.confidence ? getConfidenceLabel(coverage.confidence) : "Not rated"}</span>
                <span>{getCoverageStatusLabel(coverageStatus)}</span>
                <time dateTime={coverage.lastUpdated}>{formatDate(coverage.lastUpdated)}</time>
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
    </SiteShell>
  );
}
