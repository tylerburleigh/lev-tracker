type PageHeroProps = {
  kicker: string;
  title: string;
  summary: string;
  children?: React.ReactNode;
};

export function PageHero({ kicker, title, summary, children }: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="page-shell page-hero__inner">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{summary}</p>
        </div>
        {children ? <div className="page-hero__aside">{children}</div> : null}
      </div>
    </section>
  );
}
