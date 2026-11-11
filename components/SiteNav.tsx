import Link from "next/link";
import { auth } from "@/auth";

interface SiteNavProps {
  /** Right-side action shown to LOGGED-OUT visitors. Defaults to "Book a demo". */
  rightAction?: { label: string; href: string };
  /**
   * Force the signed-out signout link (legacy prop, still honoured). Normally
   * leave unset: SiteNav derives login state from the session itself.
   */
  signOutHref?: string;
  /** Legacy prop from the dropdown era; accepted and ignored. */
  hideSectionDropdown?: boolean;
}

/**
 * Session-aware nav, restyled for the Loom landing: the wordmark lives in the
 * true top-left corner, quiet text links sit right, and the one loud thing is
 * the vermilion action pill.
 *   · logged out → Sign in + the configured right action (default "Book a demo")
 *   · logged in  → Sign out + "Launch demo"
 */
export default async function SiteNav({
  rightAction = { label: "Book a demo", href: "/demo" },
  signOutHref,
}: SiteNavProps) {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  return (
    <nav className="nav">
      <div className="nav-inner nav-fullbleed">
        <Link href="/" className="nav-brand">
          Reaction
        </Link>
        <div className="nav-links">
          <Link href="/products" className="nav-link nav-link-wide">
            Products
          </Link>
          <Link href="/#ethos" className="nav-link nav-link-wide">
            Ethos
          </Link>
          <Link href="/demo" className="nav-link nav-link-wide">
            Demos
          </Link>
          <a href="mailto:info@reaction.org.uk" className="nav-link nav-link-wide">
            Contact
          </a>
          {loggedIn ? (
            <>
              <Link href="/auth/signout" className="nav-link">
                Sign out
              </Link>
              <Link href="/demo" className="btn btn-nav-verm">
                Launch demo
                <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </>
          ) : signOutHref ? (
            <Link href={signOutHref} className="nav-link">
              Sign out
            </Link>
          ) : (
            <>
              <Link href="/auth/signin" className="nav-link">
                Sign in
              </Link>
              <Link href={rightAction.href} className="btn btn-nav-verm">
                {rightAction.label}
                <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
