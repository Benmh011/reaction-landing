"use client";

import { useEffect } from "react";

/**
 * Watches the #build section and flips it "on" the first time it enters the
 * viewport — CSS then staggers the three segments in and draws the thread.
 * Renders nothing; reduced-motion users get everything visible via CSS.
 */
export default function BuildReveal() {
  useEffect(() => {
    const el = document.getElementById("build");
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("on");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.classList.add("on");
          io.disconnect();
        }
      },
      { threshold: 0.22 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}
