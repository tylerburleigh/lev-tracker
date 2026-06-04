import Link from "next/link";
import { Activity, BookOpenText, ClipboardCheck, Compass, Microscope, Search, Sigma, Waypoints } from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/hallmarks", label: "Hallmarks", icon: Sigma },
  { href: "/tracks", label: "Tracks", icon: Waypoints },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/state-of-the-field", label: "State of the Field", icon: BookOpenText }
] as const;

const legendItems = [
  { href: "/methods#evidence", label: "Evidence", icon: Microscope },
  { href: "/methods#interpretation", label: "Interpretation", icon: Compass },
  { href: "/methods#forecast", label: "Forecast Method", icon: Waypoints }
] as const;

type SiteShellProps = {
  children: React.ReactNode;
  lastUpdated: string;
};

export function SiteShell({ children, lastUpdated }: SiteShellProps) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="site-mark" href="/">
            <span className="site-mark__eyebrow">Hallmarks of Aging</span>
            <span className="site-mark__name">LEV Tracker</span>
          </Link>
          <nav className="site-nav" aria-label="Primary">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} className="site-nav__link" href={href}>
                <Icon aria-hidden="true" size={15} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="site-tools">
            <Link className="tool-button" href="/tracks" title="Search tracks">
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </Link>
            <Link className="tool-button" href="/admin/review" title="Open review queue">
              <ClipboardCheck aria-hidden="true" size={16} />
              <span>Review</span>
            </Link>
            <div className="site-status">
              <span className="site-status__label">Last updated</span>
              <span className="site-status__value">{lastUpdated}</span>
            </div>
          </div>
        </div>
        <div className="legend-bar">
          {legendItems.map(({ href, label, icon: Icon }) => (
            <Link className="legend-item" href={href} key={href}>
              <Icon aria-hidden="true" size={15} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
