import Link from "next/link";

interface SiteNavProps {
  /** Right-side action: defaults to "Book a demo" linking to /demo */
  rightAction?: { label: string; href: string };
  /** Show a "Sign out" link instead of the right action */
  signOutHref?: string;
}

// SiteNav is now a server component — no theme toggle, no client state.
// Dark mode is disabled site-wide; data-theme="light" is set in layout.tsx.
export default function SiteNav({
  rightAction = { label: "Book a demo", href: "/demo" },
  signOutHref,
}: SiteNavProps) {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand">
          Reaction
        </Link>
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
