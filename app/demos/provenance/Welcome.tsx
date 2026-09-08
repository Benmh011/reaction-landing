"use client";

// ————————————————————————————————————————————————————————————————
// The welcome page. One scene, one name, one button.
//
// The water is the whole design; everything else is kept quiet so it
// stays that way. Navy and off-white are the house colours, taken from
// the way the business names its own assets. Gold appears once, on
// the button, because that is where their gift boxes put it.
// ————————————————————————————————————————————————————————————————

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The scene is WebGL and has no business on the server. Loading it
// client-side only also keeps three out of every bundle but this one.
const EstuaryScene = dynamic(() => import("./EstuaryScene"), {
  ssr: false,
  loading: () => null,
});

const NAVY = "#10284a";
const CREAM = "#f3eee2";
const GOLD = "#c9a24a";

const serif: React.CSSProperties = {
  fontFamily: "var(--font-serif, Georgia), Georgia, 'Times New Roman', serif",
};

export default function Welcome({ onEnter }: { onEnter: () => void }) {
  // One orchestrated entrance, once. The scene fades in, then the words.
  const [in_, setIn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setIn(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        background: NAVY,
        color: CREAM,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: in_ ? 1 : 0,
          transition: "opacity 1400ms ease",
        }}
        aria-hidden
      >
        <EstuaryScene />
      </div>

      {/* A gentle darkening low-left so the words sit on water, not fight it. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, rgba(8,22,42,0.62) 0%, rgba(8,22,42,0.28) 38%, rgba(8,22,42,0) 62%), linear-gradient(0deg, rgba(8,22,42,0.55) 0%, rgba(8,22,42,0) 42%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          padding: "clamp(22px, 3.4vw, 44px) clamp(22px, 4.5vw, 64px)",
          opacity: in_ ? 1 : 0,
          transform: in_ ? "none" : "translateY(6px)",
          transition: "opacity 900ms ease 500ms, transform 900ms ease 500ms",
        }}
      >
        <header>
          <p style={{ ...serif, fontWeight: 500, fontSize: "clamp(20px, 1.6vw, 24px)", letterSpacing: "0.005em", margin: 0 }}>
            Salcombe Dairy
          </p>
        </header>

        <section
          style={{
            alignSelf: "end",
            maxWidth: 560,
            paddingBottom: "clamp(28px, 6vh, 72px)",
          }}
        >
          <button
            onClick={onEnter}
            style={{
              font: "inherit",
              fontSize: 15,
              fontWeight: 600,
              color: NAVY,
              background: GOLD,
              border: "none",
              borderRadius: 999,
              padding: "13px 26px",
              cursor: "pointer",
              boxShadow: "0 1px 0 rgba(255,255,255,0.25) inset, 0 10px 30px rgba(0,0,0,0.28)",
            }}
          >
            Open the desk
          </button>
        </section>

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12.5,
            color: "rgba(243,238,226,0.6)",
          }}
        >
          <span>A demonstration. All figures are sample data.</span>
          <span>Powered by Reaction</span>
        </footer>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          main * { transition: none !important; }
        }
        button:focus-visible { outline: 3px solid ${CREAM}; outline-offset: 3px; }
      `}</style>
    </main>
  );
}
