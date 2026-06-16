import Link from "next/link";
import { Search, X } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import {
  type TrialResultsStatus,
  type TrialSummary,
  getOverallLastUpdated,
  getTrials
} from "@/lib/site-data";

type TrialSearchParams = {
  q?: string | string[];
  result?: string | string[];
  status?: string | string[];
  scope?: string | string[];
};

type TrialsIndexPageProps = {
  searchParams?: Promise<TrialSearchParams>;
};

type TrialScope = "active" | "late" | "archive" | "all";

const resultStatusOptions: Array<{ value: TrialResultsStatus; label: string }> = [
  { value: "not_posted", label: "No posted results" },
  { value: "pending", label: "Pending" },
  { value: "posted", label: "Posted results" },
  { value: "unknown", label: "Timing unclear" }
];

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeNeedle(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isResultStatus(value: string): value is TrialResultsStatus {
  return resultStatusOptions.some((option) => option.value === value);
}

function isTrialScope(value: string): value is TrialScope {
  return value === "active" || value === "late" || value === "archive" || value === "all";
}

function getTrialScope(trials: TrialSummary[], scope: TrialScope) {
  if (scope === "active") {
    return trials.filter((trial) => trial.watchStatus === "active_watch");
  }

  if (scope === "late") {
    return trials.filter((trial) => trial.watchStatus === "late_no_results");
  }

  if (scope === "archive") {
    return trials.filter((trial) => trial.watchStatus === "retired_no_results");
  }

  return trials;
}

function getCompletionQualifier(trial: TrialSummary) {
  if (trial.completionDateKind === "estimated") {
    return "Estimated completion";
  }

  if (trial.completionDateKind === "actual" || trial.status === "completed") {
    return "Completed";
  }

  return "Completion listed";
}

function getTrialTimingSummary(trial: TrialSummary) {
  if (trial.expectedResultsWindow) {
    return trial.expectedResultsWindow;
  }

  if (trial.completionDate) {
    return `${getCompletionQualifier(trial)} ${formatDate(trial.completionDate)}.`;
  }

  if (trial.registryLastUpdated) {
    return `Registry last updated ${formatDate(trial.registryLastUpdated)}.`;
  }

  if (trial.registryLastChecked) {
    return `Registry last checked ${formatDate(trial.registryLastChecked)}.`;
  }

  return "Result timing is not recorded here.";
}

function getSearchableTrialText(trial: TrialSummary) {
  return [
    trial.name,
    trial.summary,
    trial.population,
    trial.statusLabel,
    trial.phaseLabel,
    trial.resultsStatusLabel,
    trial.watchStatusLabel,
    trial.expectedResultsWindow,
    trial.horizonNote,
    trial.whyItMatters,
    trial.watchStatusReason,
    ...trial.registryIds,
    ...trial.trackNames,
    ...trial.endpointLabels
  ]
    .filter((item): item is string => Boolean(item))
    .join(" ")
    .toLocaleLowerCase();
}

export default async function TrialsIndexPage({ searchParams }: TrialsIndexPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedResultValue = getSingleSearchParam(resolvedSearchParams.result);
  const selectedScopeValue = getSingleSearchParam(resolvedSearchParams.scope);
  const trials = await getTrials();
  const activeWatchTrials = trials.filter((trial) => trial.watchStatus === "active_watch");
  const lateNoResultsTrials = trials.filter((trial) => trial.watchStatus === "late_no_results");
  const retiredArchiveTrials = trials.filter((trial) => trial.watchStatus === "retired_no_results");
  const statusOptions = Array.from(new Set(trials.map((trial) => trial.status)))
    .sort((left, right) => left.localeCompare(right))
    .map((status) => ({
      value: status,
      label: trials.find((trial) => trial.status === status)?.statusLabel ?? status
    }));
  const selected = {
    query: getSingleSearchParam(resolvedSearchParams.q).trim(),
    result: isResultStatus(selectedResultValue) ? selectedResultValue : "",
    status: getSingleSearchParam(resolvedSearchParams.status),
    scope: isTrialScope(selectedScopeValue) ? selectedScopeValue : "active"
  };
  const queryNeedle = normalizeNeedle(selected.query);
  const scopedTrials = getTrialScope(trials, selected.scope);
  const filteredTrials = scopedTrials.filter((trial) => {
    return (
      (!queryNeedle || getSearchableTrialText(trial).includes(queryNeedle)) &&
      (!selected.result || trial.resultsStatus === selected.result) &&
      (!selected.status || trial.status === selected.status)
    );
  });
  const [lastUpdated] = await Promise.all([getOverallLastUpdated()]);
  const withoutPostedResultsCount = trials.filter(
    (trial) => trial.resultsStatus === "not_posted" || trial.resultsStatus === "pending"
  ).length;
  const postedResultsCount = trials.filter((trial) => trial.resultsStatus === "posted").length;
  const highlightedTrials = activeWatchTrials
    .filter((trial) => Boolean(trial.whyItMatters))
    .slice(0, 4);

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="Trials"
        title="Human trials to watch"
        summary="Registry-linked human studies that could change the evidence picture if results appear. The default view focuses on active result-watch records, with late no-results and retired archive records separated."
      >
        <div className="page-hero__stats">
          <span>{trials.length} registry-linked trials</span>
          <span>{activeWatchTrials.length} active watch</span>
          <span>{lateNoResultsTrials.length} late no-results</span>
          <span>{retiredArchiveTrials.length} retired archive</span>
          <span>{withoutPostedResultsCount} without posted results</span>
          <span>{postedResultsCount} with posted results</span>
        </div>
      </PageHero>

      <section className="band">
        <div className="page-shell state-report-list trial-watch-ledger">
          {highlightedTrials.map((trial) => (
            <Link className="state-report-row state-report-row--linked" href={trial.href} key={trial.id}>
              <div className="state-report-row__meta">
                <span className={`trial-result-pill trial-result-pill--${trial.resultsStatusTone}`}>
                  {trial.resultsStatusLabel}
                </span>
                <span>{trial.primaryTrackName}</span>
              </div>
              <div className="state-report-row__body">
                <h3>{trial.name}</h3>
                <p>{trial.whyItMatters}</p>
                <p className="state-report-row__interpretation">{getTrialTimingSummary(trial)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="band band--alt">
        <div className="page-shell track-search">
          <form className="track-search__form" action="/trials">
            <label className="track-search__field track-search__field--wide">
              <span>Search</span>
              <div className="track-search__input-wrap">
                <Search aria-hidden="true" size={17} />
                <input
                  type="search"
                  name="q"
                  placeholder="Trial, registry ID, endpoint, or track"
                  defaultValue={selected.query}
                />
              </div>
            </label>
            <label className="track-search__field">
              <span>Scope</span>
              <select name="scope" defaultValue={selected.scope}>
                <option value="active">Active watch</option>
                <option value="late">Late no-results</option>
                <option value="archive">Retired archive</option>
                <option value="all">All registry-linked</option>
              </select>
            </label>
            <label className="track-search__field">
              <span>Results</span>
              <select name="result" defaultValue={selected.result}>
                <option value="">All result states</option>
                {resultStatusOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="track-search__field">
              <span>Status</span>
              <select name="status" defaultValue={selected.status}>
                <option value="">All study statuses</option>
                {statusOptions.map((option) => (
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
              <Link className="action-button action-button--secondary" href="/trials">
                <X aria-hidden="true" size={16} />
                <span>Reset</span>
              </Link>
            </div>
          </form>
          <div className="track-search__summary" aria-live="polite">
            <strong>{filteredTrials.length}</strong>
            <span>of {scopedTrials.length} {selected.scope === "all" ? "trials" : "scoped trials"}</span>
          </div>
        </div>

        <div className="page-shell trials-table">
          <div className="trials-table__head">
            <span>Trial</span>
            <span>Track</span>
            <span>Design</span>
            <span>Population</span>
            <span>Endpoints</span>
            <span>Results</span>
            <span>Timing</span>
          </div>
          {filteredTrials.map((trial) => (
            <Link className="trials-table__row" href={trial.href} key={trial.id}>
              <div>
                <strong>{trial.name}</strong>
                {trial.summary ? <p>{trial.summary}</p> : null}
                {trial.registryIds.length ? (
                  <span className="tracks-table__aliases">{trial.registryIds.join(" | ")}</span>
                ) : null}
              </div>
              <span>{trial.trackNames.slice(0, 2).join(" / ") || "Unmapped track"}</span>
              <span>
                {[trial.phaseLabel, trial.statusLabel, trial.sampleSize ? `${trial.sampleSize} participants` : undefined]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              <span>{trial.population ?? "Not specified"}</span>
              <span>{trial.endpointLabels.slice(0, 3).join(" / ") || "Not specified"}</span>
              <span>
                <span className="trial-pill-stack">
                  <span className={`trial-result-pill trial-result-pill--${trial.resultsStatusTone}`}>
                    {trial.resultsStatusLabel}
                  </span>
                  <span className={`trial-result-pill trial-result-pill--${trial.watchStatusTone}`}>
                    {trial.watchStatusLabel}
                  </span>
                </span>
              </span>
              <span>{getTrialTimingSummary(trial)}</span>
            </Link>
          ))}
          {!filteredTrials.length ? (
            <div className="tracks-table__empty">
              <strong>No trials match those filters.</strong>
              <Link className="mini-link" href="/trials">
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
