import Link from "next/link";
import SectionDropdown from "@/components/SectionDropdown";

interface SiteNavProps {
  /** Right-side action: defaults to "Book a demo" linking to /demo */
  rightAction?: { label: string; href: string };
  /** Show a "Sign out" link instead of the right action */
  signOutHref?: string;
  /** Hide the section dropdown (e.g. on pages other than the home landing page) */
  hideSectionDropdown?: boolean;
}

// SiteNav is now a server component — no theme toggle, no client state.
// Dark mode is disabled site-wide; data-theme="light" is set in layout.tsx.
// The section dropdown is a client component, composed in here for the landing page.
export default function SiteNav({
  rightAction = { label: "Book a demo", href: "/demo" },
  signOutHref,
  hideSectionDropdown = false,
}: SiteNavProps) {
  return (
    <nav className="nav">
      <div className="nav-inner nav-fullbleed">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!hideSectionDropdown && <SectionDropdown />}
          <Link href="/" className="nav-brand">
            Reaction
          </Link>
        </div>
        <div className="nav-actions">
          {signOutHref ? (
            <Link href={signOutHref} className="btn btn-ghost">
              Sign out
            </Link>
          ) : (
            <Link href={rightAction.href} className="btn btn-primary">
              {rightAction.label}
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
