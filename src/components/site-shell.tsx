import Link from "next/link";
import {
  Activity,
  BookOpenText,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Radar,
  Search,
  Sigma,
  Waypoints
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/guide", label: "Guide", icon: CircleHelp },
  { href: "/hallmarks", label: "Hallmarks", icon: Sigma },
  { href: "/tracks", label: "Tracks", icon: Waypoints },
  { href: "/trials", label: "Trials", icon: ClipboardList },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/state-of-the-field", label: "Field Reviews", icon: BookOpenText },
  { href: "/scenarios/lev-by-2036", label: "Scenario", icon: Radar }
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
      </header>
      <main>{children}</main>
    </div>
  );
}
