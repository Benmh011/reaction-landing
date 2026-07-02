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

    const finalState = () => group.classList.add("mf-final");

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
        group.classList.add("mf-shift"); // the word-space opens while invisible
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
