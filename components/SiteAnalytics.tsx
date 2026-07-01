"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// First-party analytics beacon, mounted once in the root layout.
// - Records a page view on every route change (excluding private/admin surfaces).
// - On demo surfaces (/portal, /demo-app/*), times the visit and flushes the
//   duration when the visitor leaves the demo (route change, tab hidden, unload).
// Everything is best-effort and wrapped so it can never affect the page.

const EXCLUDE = ["/analytics", "/admin", "/api", "/auth"];
const DEMO_PREFIXES = ["/portal", "/demo-app"];

function getSessionId(): string {
  try {
    const KEY = "rx_sid";
    let sid = localStorage.getItem(KEY);
    if (!sid) {
      sid =
        (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) +
        Date.now().toString(36);
      localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return "anon-" + Date.now().toString(36);
  }
}

function getDevice(): "mobile" | "tablet" | "desktop" {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function isDemo(path: string): boolean {
  return DEMO_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function demoSlug(path: string): string {
  if (path === "/portal" || path.startsWith("/portal/")) return "portal";
  const parts = path.split("/").filter(Boolean); // ["demo-app", "<slug>"]
  return parts[1] ?? parts[0] ?? "demo";
}

export default function SiteAnalytics() {
  const pathname = usePathname();
  const demoStart = useRef<{ slug: string; t: number } | null>(null);

  // Flush the current demo session (if any) to the beacon endpoint.
  const flushDemo = (useBeacon: boolean) => {
    const d = demoStart.current;
    if (!d) return;
    demoStart.current = null;
    const durationMs = Math.min(Date.now() - d.t, 1000 * 60 * 60 * 6);
    if (durationMs < 1000) return; // ignore sub-second bounces
    const payload = JSON.stringify({
      type: "demo",
      slug: d.slug,
      durationMs,
      sessionId: getSessionId(),
    });
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        fetch("/api/track", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* noop */
    }
  };

  // Page-view + demo-timer lifecycle on each route change.
  useEffect(() => {
    if (!pathname) return;
    // A new route means any in-progress demo visit ended.
    flushDemo(false);

    if (EXCLUDE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return;
    }

    // Record the page view (fire-and-forget).
    try {
      fetch("/api/track", {
        method: "POST",
        body: JSON.stringify({
          type: "pageview",
          path: pathname,
          referrer: document.referrer || undefined,
          device: getDevice(),
          sessionId: getSessionId(),
        }),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* noop */
    }

    // Start the demo timer if this is a demo surface.
    if (isDemo(pathname)) {
      demoStart.current = { slug: demoSlug(pathname), t: Date.now() };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Flush on tab-hide / unload so we don't lose the final demo session.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushDemo(true);
    };
    const onPageHide = () => flushDemo(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
