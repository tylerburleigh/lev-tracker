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
  outlook_changed: "state-change-card--outlook",
  field_signal: "state-change-card--field",
  context_only: "state-change-card--context",
  activity_without_results: "state-change-card--activity"
};

const fieldChangeStatusLabels = {
  material_change: "Material field change",
  mixed: "Some movement",
  no_material_change: "No material field change"
};

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
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
  const linkedPublicUpdateCount = edition.related_publication_event_ids?.length ?? 0;
  const linkedOutlookCount = edition.related_outlook_ids?.length ?? 0;
  const reviewBasisItems = [
    {
      label: "Field updates linked",
      value: formatCount(linkedPublicUpdateCount, "update"),
      summary: "Reviewed public updates connected to this monthly read."
    },
    {
      label: "Outlooks connected",
      value: formatCount(linkedOutlookCount, "outlook"),
      summary: "Current outlook pages used to anchor the interpretation."
    },
    {
      label: "Trial horizon",
      value: formatCount(edition.trial_horizon.length, "item"),
      summary: "Watched studies with result timing, no-result, or registry context."
    },
    {
      label: "Evidence context",
      value: formatCount(edition.current_context.length, "card"),
      summary: "Track and hallmark context carried into the monthly review."
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
          <div className="state-brief-grid" aria-label="Monthly review at a glance">
            <article className="state-brief-panel state-brief-panel--matter">
              <span className="section-kicker">Why it matters</span>
              <p>{edition.why_it_matters}</p>
            </article>
            <article className="state-brief-panel">
              <span className="section-kicker">{fieldChangeStatusLabels[edition.field_change_status]}</span>
              <p>{edition.field_change_note}</p>
            </article>
            <article className="state-brief-panel">
              <span className="section-kicker">Short read</span>
              <ul className="state-plain-list">
                {edition.reader_takeaways.map((takeaway) => (
                  <li key={takeaway}>{takeaway}</li>
                ))}
              </ul>
            </article>
          </div>

          <section className="state-section" aria-labelledby="review-basis">
            <div className="state-section__header">
              <span className="section-kicker">Review basis</span>
              <h2 id="review-basis">Inputs carried into this monthly read</h2>
            </div>
            <div className="state-review-basis">
              {reviewBasisItems.map((item) => (
                <article className="state-review-basis__item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="state-section" aria-labelledby="what-changed">
            <div className="state-section__header">
              <span className="section-kicker">Interpretation</span>
              <h2 id="what-changed">What changed in the field</h2>
            </div>
            {hasFieldChanges ? (
              <div className="state-change-grid">
                {edition.what_changed.map((change) => (
                  <article
                    className={`state-change-card ${changeKindClassNames[change.change_kind]}`}
                    key={`${change.change_kind}-${change.title}`}
                  >
                    <span className="state-kind-pill">{changeKindLabels[change.change_kind]}</span>
                    <time dateTime={change.happened_on}>{formatDate(change.happened_on)}</time>
                    <h3>{change.title}</h3>
                    <p>{change.summary}</p>
                    {change.interpretation ? <p className="state-change-card__interpretation">{change.interpretation}</p> : null}
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

          <section className="state-section" aria-labelledby="current-context">
            <div className="state-section__header">
              <span className="section-kicker">Context as of {edition.period_label}</span>
              <h2 id="current-context">Evidence snapshot</h2>
            </div>
            <div className="state-card-list">
              {edition.current_context.map((context) => (
                <article className="state-watch-card state-watch-card--context" key={context.label}>
                  <h3>{context.label}</h3>
                  <p>{context.summary}</p>
                </article>
              ))}
            </div>
          </section>

          {edition.trial_horizon.length ? (
            <section className="state-section" aria-labelledby="trial-horizon">
              <div className="state-section__header">
                <span className="section-kicker">Trial horizon</span>
                <h2 id="trial-horizon">Trials waiting on results</h2>
              </div>
              <div className="state-card-list state-card-list--three">
                {edition.trial_horizon.map((item) =>
                  item.href ? (
                    <Link className="state-watch-card state-watch-card--trial" href={item.href} key={item.href}>
                      <h3>{item.label}</h3>
                      <p>{item.summary}</p>
                    </Link>
                  ) : (
                    <article className="state-watch-card state-watch-card--trial" key={item.label}>
                      <h3>{item.label}</h3>
                      <p>{item.summary}</p>
                    </article>
                  )
                )}
              </div>
            </section>
          ) : null}

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

          <div className="state-two-column">
            <section className="state-section" aria-labelledby="signals-to-watch">
              <div className="state-section__header">
                <span className="section-kicker">Evidence signals</span>
                <h2 id="signals-to-watch">What would matter next</h2>
              </div>
              <div className="state-card-list">
                {edition.signals_to_watch.map((signal) => (
                  <article className="state-watch-card" key={signal.label}>
                    <h3>{signal.label}</h3>
                    <p>{signal.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="state-section" aria-labelledby="evidence-gaps">
              <div className="state-section__header">
                <span className="section-kicker">Evidence still needed</span>
                <h2 id="evidence-gaps">What still blocks a stronger read</h2>
              </div>
              <div className="state-card-list">
                {edition.evidence_gaps.map((gap) => (
                  <article className="state-watch-card state-watch-card--gap" key={gap.label}>
                    <h3>{gap.label}</h3>
                    <p>{gap.summary}</p>
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
              <div className="state-example-grid">
                {edition.track_examples.map((example) => (
                  <Link className="state-example-card" href={example.href} key={example.href}>
                    <span>{example.label}</span>
                    <h3>{example.title}</h3>
                    <p>{example.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
