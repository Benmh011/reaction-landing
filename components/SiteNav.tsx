"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SiteNavProps {
  /** Right-side action: defaults to "Book a demo" linking to /demo */
  rightAction?: { label: string; href: string };
  /** Show a "Sign out" link instead of the right action */
  signOutHref?: string;
}

export default function SiteNav({
  rightAction = { label: "Book a demo", href: "/demo" },
  signOutHref,
}: SiteNavProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(t);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("reaction-theme", next);
    } catch {}
  };

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand">
          Reaction
        </Link>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
            type="button"
          >
            <span className="icon icon-sun" aria-hidden="true">☀</span>
            <span className="icon icon-moon" aria-hidden="true">☾</span>
          </button>
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
