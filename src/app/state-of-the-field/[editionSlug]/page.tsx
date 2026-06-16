import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { formatDate } from "@/lib/date";
import { getOverallLastUpdated, getStateOfTheFieldEdition } from "@/lib/site-data";

const changeKindLabels = {
  outlook_changed: "LEV picture changed",
  field_signal: "Evidence signal",
  context_only: "Clearer boundaries",
  activity_without_results: "Activity, no proof yet"
};

const changeKindClassNames = {
  outlook_changed: "state-change-row--outlook",
  field_signal: "state-change-row--field",
  context_only: "state-change-row--context",
  activity_without_results: "state-change-row--activity"
};

const fieldChangeStatusLabels = {
  material_change: "Material field change",
  mixed: "Some movement",
  no_material_change: "No material field change"
};

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatReviewBasisCount(item: { count: number; unit_singular: string; unit_plural?: string }) {
  return formatCount(item.count, item.unit_singular, item.unit_plural);
}

function truncateSummary(summary: string, maxLength = 170) {
  if (summary.length <= maxLength) {
    return summary;
  }

  return `${summary.slice(0, maxLength - 1).trimEnd()}...`;
}

type EditionPageProps = {
  params: Promise<{
    editionSlug: string;
  }>;
};

export default async function EditionPage({ params }: EditionPageProps) {
  const { editionSlug } = await params;
  const [edition, lastUpdated] = await Promise.all([
    getStateOfTheFieldEdition(editionSlug),
    getOverallLastUpdated()
  ]);

  if (!edition) {
    notFound();
  }

  const hasFieldChanges = edition.what_changed.length > 0;
  const noFieldChangeSummary =
    edition.field_change_status === "no_material_change"
      ? `No field result from ${edition.period_label} met the threshold for a material change.`
      : edition.field_change_note;
  const fieldActivityItems = edition.field_activity ?? [];
  const fieldActivityBasis = edition.review_basis.items.find((item) => item.key === "field_activity");
  const firstBoundary = edition.what_did_not_change[0];
  const firstTrial = edition.trial_horizon[0];
  const firstSignal = edition.signals_to_watch[0];
  const scanCards = [
    {
      label: "Field movement",
      value: fieldChangeStatusLabels[edition.field_change_status],
      summary: edition.field_change_note,
      href: "#what-changed",
      className: "state-scan-card--movement"
    },
    {
      label: "What changed",
      value: hasFieldChanges ? formatCount(edition.what_changed.length, "field item") : "No field-changing result",
      summary: hasFieldChanges ? edition.what_changed[0].summary : noFieldChangeSummary,
      href: "#what-changed",
      className: "state-scan-card--change"
    },
    {
      label: "Activity, not proof",
      value: fieldActivityBasis ? formatReviewBasisCount(fieldActivityBasis) : "Not separated",
      summary: fieldActivityBasis?.summary ?? "No separate field-activity review-basis item is recorded for this edition.",
      href: fieldActivityItems.length ? "#field-activity" : "#review-basis",
      className: "state-scan-card--activity"
    },
    {
      label: "Trials waiting",
      value: formatCount(edition.trial_horizon.length, "trial watch item"),
      summary: firstTrial?.summary ?? "No trial-horizon items were carried into this monthly read.",
      href: edition.trial_horizon.length ? "#trial-horizon" : "#monthly-readout",
      className: "state-scan-card--trial"
    },
    {
      label: "What did not change",
      value: formatCount(edition.what_did_not_change.length, "boundary", "boundaries"),
      summary: firstBoundary ?? "No unchanged boundaries were recorded for this edition.",
      href: edition.what_did_not_change.length ? "#what-did-not-change" : "#monthly-readout",
      className: "state-scan-card--boundary"
    },
    {
      label: "What would matter",
      value: formatCount(edition.signals_to_watch.length, "signal"),
      summary: firstSignal?.summary ?? "No evidence-signal cards were recorded for this edition.",
      href: edition.signals_to_watch.length ? "#signals-to-watch" : "#monthly-readout",
      className: "state-scan-card--signal"
    }
  ];

  return (
    <SiteShell lastUpdated={formatDate(lastUpdated)}>
      <PageHero
        kicker="State of the Field"
        title={edition.title}
        summary={edition.lede}
      >
        <div className="state-hero-aside">
          <span className="section-kicker">Bottom line</span>
          <p>{edition.bottom_line}</p>
          <span className="state-hero-aside__period">Covers {edition.period_label}</span>
          <time dateTime={edition.date}>Published {formatDate(edition.date)}</time>
        </div>
      </PageHero>
      <section className="band">
        <div className="page-shell state-article">
          <section className="state-readout" aria-labelledby="monthly-readout">
            <div className="state-readout-grid">
              <article className="state-readout-primary">
                <div className="state-readout-primary__meta">
                  <span className={`state-status-pill state-status-pill--${edition.field_change_status}`}>
                    {fieldChangeStatusLabels[edition.field_change_status]}
                  </span>
                  <span>{edition.period_label}</span>
                </div>
                <h2 id="monthly-readout">Monthly readout</h2>
                <p className="state-readout-primary__bottom-line">{edition.bottom_line}</p>
                <p>{edition.why_it_matters}</p>
                <ul className="state-readout-takeaways state-plain-list">
                  {edition.reader_takeaways.map((takeaway) => (
                    <li key={takeaway}>{takeaway}</li>
                  ))}
                </ul>
              </article>
              <div className="state-scan-grid" aria-label="Monthly review scan">
                {scanCards.map((card) => (
                  <a className={`state-scan-card ${card.className}`} href={card.href} key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{truncateSummary(card.summary)}</p>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="state-section" aria-labelledby="what-changed">
            <div className="state-section__header">
              <span className="section-kicker">Interpretation</span>
              <h2 id="what-changed">What changed in the field</h2>
            </div>
            {hasFieldChanges ? (
              <div className="state-report-list state-report-list--changes">
                {edition.what_changed.map((change) => (
                  <article
                    className={`state-report-row state-report-row--change ${changeKindClassNames[change.change_kind]}`}
                    key={`${change.change_kind}-${change.title}`}
                  >
                    <div className="state-report-row__meta">
                      <span className="state-kind-pill">{changeKindLabels[change.change_kind]}</span>
                      <time dateTime={change.happened_on}>{formatDate(change.happened_on)}</time>
                    </div>
                    <div className="state-report-row__body">
                      <h3>{change.title}</h3>
                      <p>{change.summary}</p>
                      {change.interpretation ? (
                        <p className="state-report-row__interpretation">{change.interpretation}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="state-no-change state-no-change--lead">
                <strong>{fieldChangeStatusLabels[edition.field_change_status]}</strong>
                <p>{noFieldChangeSummary}</p>
              </div>
            )}
          </section>

          {edition.what_did_not_change.length ? (
            <section className="state-section state-section--split" aria-labelledby="what-did-not-change">
              <div className="state-section__header">
                <span className="section-kicker">Boundaries</span>
                <h2 id="what-did-not-change">What did not change</h2>
              </div>
              <ul className="state-plain-list state-plain-list--panel">
                {edition.what_did_not_change.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {edition.trial_horizon.length ? (
            <section className="state-section" aria-labelledby="trial-horizon">
              <div className="state-section__header">
                <span className="section-kicker">Trial horizon</span>
                <h2 id="trial-horizon">Trials waiting on results</h2>
              </div>
              <div className="state-report-list">
                {edition.trial_horizon.map((item) =>
                  item.href ? (
                    <Link className="state-report-row state-report-row--linked" href={item.href} key={item.href}>
                      <div className="state-report-row__meta">
                        <span>Trial watch</span>
                      </div>
                      <div className="state-report-row__body">
                        <h3>{item.label}</h3>
                        <p>{item.summary}</p>
                      </div>
                    </Link>
                  ) : (
                    <article className="state-report-row" key={item.label}>
                      <div className="state-report-row__meta">
                        <span>Trial watch</span>
                      </div>
                      <div className="state-report-row__body">
                        <h3>{item.label}</h3>
                        <p>{item.summary}</p>
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          ) : null}

          {fieldActivityItems.length ? (
            <section className="state-section" aria-labelledby="field-activity">
              <div className="state-section__header">
                <span className="section-kicker">Activity, not proof</span>
                <h2 id="field-activity">Field activity that did not change the evidence read</h2>
              </div>
              <div className="state-report-list">
                {fieldActivityItems.map((item) => (
                  <article className="state-report-row" key={`${item.happened_on}-${item.label}`}>
                    <div className="state-report-row__meta">
                      <span>Field activity</span>
                      <time dateTime={item.happened_on}>{formatDate(item.happened_on)}</time>
                    </div>
                    <div className="state-report-row__body">
                      <h3>{item.label}</h3>
                      <p>{item.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="state-section" aria-labelledby="current-context">
            <div className="state-section__header">
              <span className="section-kicker">Context as of {edition.period_label}</span>
              <h2 id="current-context">Evidence snapshot</h2>
            </div>
            <div className="state-report-list">
              {edition.current_context.map((context) => (
                <article className="state-report-row" key={context.label}>
                  <div className="state-report-row__meta">
                    <span>Context</span>
                  </div>
                  <div className="state-report-row__body">
                    <h3>{context.label}</h3>
                    <p>{context.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="state-two-column">
            <section className="state-section" aria-labelledby="signals-to-watch">
              <div className="state-section__header">
                <span className="section-kicker">Evidence signals</span>
                <h2 id="signals-to-watch">What would matter next</h2>
              </div>
              <div className="state-report-list state-report-list--compact">
                {edition.signals_to_watch.map((signal) => (
                  <article className="state-report-row" key={signal.label}>
                    <div className="state-report-row__body">
                      <h3>{signal.label}</h3>
                      <p>{signal.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="state-section" aria-labelledby="evidence-gaps">
              <div className="state-section__header">
                <span className="section-kicker">Evidence still needed</span>
                <h2 id="evidence-gaps">What still blocks a stronger read</h2>
              </div>
              <div className="state-report-list state-report-list--compact">
                {edition.evidence_gaps.map((gap) => (
                  <article className="state-report-row state-report-row--gap" key={gap.label}>
                    <div className="state-report-row__body">
                      <h3>{gap.label}</h3>
                      <p>{gap.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {edition.track_examples.length ? (
            <section className="state-section" aria-labelledby="track-examples">
              <div className="state-section__header">
                <span className="section-kicker">Examples</span>
                <h2 id="track-examples">Tracks behind the summary</h2>
              </div>
              <div className="state-reference-list">
                {edition.track_examples.map((example) => (
                  <Link className="state-reference-row" href={example.href} key={example.href}>
                    <span>{example.label}</span>
                    <strong>{example.title}</strong>
                    <p>{example.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="state-section" aria-labelledby="review-basis">
            <div className="state-section__header">
              <span className="section-kicker">Audit trail</span>
              <h2 id="review-basis">Inputs carried into this monthly read</h2>
            </div>
            <div className="state-review-basis">
              {edition.review_basis.items.map((item) => (
                <article className="state-review-basis__item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{formatReviewBasisCount(item)}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
            <ul className="state-review-basis__caveats state-plain-list">
              {edition.review_basis.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
