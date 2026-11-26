"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendCount } from "@/lib/visitCount";

// First-party analytics beacon, mounted once in the root layout.
// - Records a page view on every route change (excluding private/admin surfaces),
//   with the mailing tag when the address carries one (?m=... from a link in one
//   of our emails: it says which mailing, never which person).
// - On a demo, times the visit and sends the time when the visitor leaves it
//   (route change, tab hidden, unload). Coming back to the tab starts the clock
//   again, so time away is not counted.
// - Records a button or contact link being pressed: what it said and where it led.
// Nothing is sent from a browser that has counting switched off (the Privacy
// page), and the server drops anything from a signed-in admin.
// Everything is best-effort and wrapped so it can never affect the page.

const EXCLUDE = ["/analytics", "/admin", "/api", "/auth"];

const excluded = (path: string) => EXCLUDE.some((p) => path === p || path.startsWith(p + "/"));

function getDevice(): "mobile" | "tablet" | "desktop" {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** Which demo a page is, or null. /demos/tenure -> "tenure"; /articled/... -> "articled".
 *  (/portal and /demo-app/<slug> are where demos used to live; kept so an old link still counts.) */
function demoSlug(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "portal") return "portal";
  if ((parts[0] === "demos" || parts[0] === "demo-app") && parts[1]) return parts[1];
  if (parts[0] === "articled") return "articled";
  return null;
}

/** The tag a mailing put on its link, if this address has one. */
function mailingTag(): string | undefined {
  try {
    const q = new URLSearchParams(window.location.search);
    const tag = q.get("m") || q.get("utm_campaign") || "";
    return /^[A-Za-z0-9_-]{1,64}$/.test(tag) ? tag : undefined;
  } catch {
    return undefined;
  }
}

/** What a pressed thing is called and where it leads, or null if it is not one we count:
 *  anything marked data-track, an email or phone link, and the buttons (class "btn"). */
function pressed(el: Element): { name: string; target?: string } | null {
  const hit = el.closest("a, button");
  // The switch that turns counting off (or on) is never itself counted.
  if (!hit || hit.closest("[data-no-track]")) return null;
  const href = hit instanceof HTMLAnchorElement ? hit.getAttribute("href") ?? "" : "";
  let target: string | undefined;
  if (href.startsWith("mailto:")) target = "email";
  else if (href.startsWith("tel:")) target = "phone";
  else if (href) {
    try {
      const u = new URL(href, window.location.href);
      target = u.origin === window.location.origin ? u.pathname + u.hash : u.host;
    } catch {
      target = undefined;
    }
  }
  const marked = hit.getAttribute("data-track");
  if (marked) return { name: marked.slice(0, 80), target };
  if (target === "email") return { name: "Email link", target };
  if (target === "phone") return { name: "Phone link", target };
  if (!hit.classList.contains("btn")) return null;
  const words = (hit.textContent ?? "").replace(/[→›»]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return words ? { name: words, target } : null;
}

export default function SiteAnalytics() {
  const pathname = usePathname();
  const demo = useRef<{ slug: string; t: number } | null>(null);
  const here = useRef<string>("");

  // Send the time spent in the current demo (if any) and stop its clock.
  const flushDemo = (leaving: boolean) => {
    const d = demo.current;
    if (!d) return;
    demo.current = null;
    const durationMs = Math.min(Date.now() - d.t, 1000 * 60 * 60 * 6);
    if (durationMs < 1000) return; // ignore sub-second bounces
    sendCount({ type: "demo", slug: d.slug, durationMs }, leaving);
  };

  // Page view + demo clock on each route change.
  useEffect(() => {
    if (!pathname) return;
    // A new route means any demo visit in progress has ended.
    flushDemo(false);
    here.current = pathname;
    if (excluded(pathname)) return;

    sendCount({
      type: "pageview",
      path: pathname,
      referrer: document.referrer || undefined,
      device: getDevice(),
      campaign: mailingTag(),
    });

    const slug = demoSlug(pathname);
    if (slug) demo.current = { slug, t: Date.now() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Leaving the tab ends the demo's clock; coming back starts it again.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushDemo(true);
      } else if (!demo.current && !excluded(here.current)) {
        const slug = demoSlug(here.current);
        if (slug) demo.current = { slug, t: Date.now() };
      }
    };
    const onPageHide = () => flushDemo(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buttons and contact links pressed.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      try {
        if (!(e.target instanceof Element) || excluded(here.current)) return;
        const what = pressed(e.target);
        // Sent as the page may be about to go, so it survives the click leading somewhere else.
        if (what) sendCount({ type: "event", name: what.name, target: what.target, path: here.current }, true);
      } catch {
        /* noop */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
