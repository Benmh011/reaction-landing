"use client";

import { useEffect } from "react";

/**
 * RevealFx — site-wide motion choreography as pure progressive enhancement.
 *
 * - Sections below the fold get a staggered fade/translate reveal on first view.
 * - The hero visual gets a light scroll parallax.
 * - Nothing is hidden until JS runs AND the element is below the viewport at
 *   that moment, so content is never invisible if JS fails, and there's no
 *   above-the-fold flash.
 * - prefers-reduced-motion disables everything (CSS + JS both check).
 */
export default function RevealFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
    const toReveal: HTMLElement[] = [];

    for (const s of sections) {
      const rect = s.getBoundingClientRect();
      // Only choreograph what the visitor hasn't seen yet.
      if (rect.top > window.innerHeight * 0.85) {
        const container = s.querySelector<HTMLElement>(":scope > .container") ?? s;
        container.classList.add("rx-reveal");
        // Stagger direct children (capped so long sections don't crawl)
        Array.from(container.children).slice(0, 8).forEach((child, i) => {
          (child as HTMLElement).style.transitionDelay = `${Math.min(i * 70, 420)}ms`;
          child.classList.add("rx-reveal-item");
        });
        toReveal.push(container);
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("rx-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    toReveal.forEach((el) => io.observe(el));

    // Light hero parallax on the constellation chamber
    const chamber = document.querySelector<HTMLElement>("[data-hero-visual]");
    let raf = 0;
    const onScroll = () => {
      if (!chamber) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        chamber.style.transform = `translateY(${y * 0.06}px)`;
      });
    };
    if (chamber) window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      if (chamber) window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
