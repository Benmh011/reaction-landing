import Link from "next/link";
import SectionDropdown from "@/components/SectionDropdown";
import { auth } from "@/auth";

interface SiteNavProps {
  /** Right-side action shown to LOGGED-OUT visitors. Defaults to "Book a demo". */
  rightAction?: { label: string; href: string };
  /**
   * Force the signed-out signout link (legacy prop, still honoured). Normally
   * leave unset: SiteNav now derives login state from the session itself.
   */
  signOutHref?: string;
  /** Hide the section dropdown (e.g. on pages other than the home landing page) */
  hideSectionDropdown?: boolean;
}

/**
 * Session-aware nav. Reads the Auth.js session on the server so every page —
 * the landing page included — reflects whether the visitor is logged in:
 *   · logged out → the configured right action (default "Book a demo")
 *   · logged in  → "Launch demo" + "Sign out"
 * The session persists via the Auth.js cookie until the user signs out; this
 * component simply renders that state instead of assuming logged-out.
 */
export default async function SiteNav({
  rightAction = { label: "Book a demo", href: "/demo" },
  signOutHref,
  hideSectionDropdown = false,
}: SiteNavProps) {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  return (
    <nav className="nav">
      <div className="nav-inner nav-fullbleed">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!hideSectionDropdown && <SectionDropdown />}
          <Link href="/" className="nav-brand">
            Reaction
          </Link>
        </div>
        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Always visible, regardless of sign-in state, sitting between the
              left brand and the right-hand primary action. */}
          <Link href="/products" className="btn btn-ghost">
            Our products
          </Link>
          {loggedIn ? (
            <>
              <Link href="/auth/signout" className="btn btn-ghost">
                Sign out
              </Link>
              <Link href="/demo" className="btn btn-primary">
                Launch demo
                <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </>
          ) : signOutHref ? (
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
