"use client";

import { useEffect } from "react";

/**
 * The headline's trick: "information" → "in formation".
 *
 * Waits for the mark to assemble (rx:mark-formed from the Flock), then
 * evaporates the "formation…" letters inside "information", opens a word
 * space while they're gone, and reforms them one gap to the right. Reduced
 * motion (or a missing WebGL flock) applies the final state directly —
 * the headline must always END as "in formation".
 */
export default function HeadlineMorph() {
  useEffect(() => {
    const group = document.querySelector("[data-mf-group]");
    if (!group) return;

    const h1 = group.closest("h1") as HTMLElement | null;

    // Guarantee the one-line opening: if "information" has wrapped below the
    // first line (font metrics, zoom, odd viewports), shrink until it holds.
    const fitOneLine = () => {
      if (!h1) return;
      const wrapped = () =>
        group.getBoundingClientRect().top - h1.getBoundingClientRect().top >
        parseFloat(getComputedStyle(h1).fontSize) * 0.6;
      if (!wrapped()) return;
      const prevTransition = h1.style.transition;
      h1.style.transition = "none";
      let size = parseFloat(getComputedStyle(h1).fontSize);
      let guard = 24;
      while (wrapped() && size > 17 && guard-- > 0) {
        size *= 0.96;
        h1.style.fontSize = `${size}px`;
      }
      h1.style.transition = prevTransition;
    };
    const fontsReady = (document.fonts?.ready ?? Promise.resolve()) as Promise<unknown>;
    fontsReady.catch(() => undefined).then(() => fitOneLine());

    const grow = () => {
      if (!h1) return;
      h1.style.fontSize = ""; // hand control back to the CSS clamp
      h1.classList.add("mf-grown");
    };
    const finalState = () => {
      group.classList.add("mf-final");
      grow();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finalState();
      return;
    }

    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      group.classList.add("mf-out"); // letters evaporate, staggered
      window.setTimeout(() => {
        group.classList.add("mf-shift"); // formation drops to its own line while invisible
        grow(); // …and the headline swells to the original size
        group.classList.remove("mf-out");
        group.classList.add("mf-in"); // letters reform, staggered
      }, 720);
    };

    window.addEventListener("rx:mark-formed", run, { once: true });
    const fallback = window.setTimeout(run, 7000); // WebGL failed? Perform anyway.
    return () => {
      window.removeEventListener("rx:mark-formed", run);
      window.clearTimeout(fallback);
    };
  }, []);
  return null;
}
