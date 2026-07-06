"use client";

import { useEffect, useState } from "react";

/**
 * Campus Connect phone mockup — the loop's second display.
 *
 * The hand-built SVG device no longer shows one static feed: it listens for
 * rx:campus-stage from the CampusLoop beside it and turns its screen to
 * match the station the line has reached. Post shows an event going up;
 * RSVP shows the "I'm in" moment; Check in shows the arrival recorded;
 * Reflect shows the moment captured. Screens crossfade, and each one's
 * elements settle in on a gentle stagger — what the loop describes in the
 * abstract, the phone shows on glass.
 *
 * Reduced motion (or a loop that never speaks) holds the Post feed —
 * the phone must always show something true.
 */

const INK = "#141210";
const CARD = "#211e1a";
const PAPER = "#f4efe4";
const MUTED = "#8a8175";
const HAIR = "#3a352c";

/* The stations' colours, lifted for legibility on the dark screen.
   Same hues as the loop's paper rendering, tuned for ink. */
const ON_INK = ["#e8896c", "#5f93c9", "#46a37e", "#93aecf"];

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Newsreader', Georgia, serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";

const starPoints = (cx: number, cy: number, R: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
};

/** A dimmed feed card — context behind whichever moment is on screen. */
function GhostCard({ y, title, meta }: { y: number; title: string; meta: string }) {
  return (
    <g opacity="0.42">
      <rect x="30" y={y} width="200" height="58" rx="12" fill={CARD} />
      <text x="44" y={y + 26} fontSize="12" fontWeight="600" fontStyle="italic" fontFamily={SERIF} fill={PAPER}>{title}</text>
      <text x="44" y={y + 43} fontSize="9.5" fontFamily={SANS} fill={MUTED}>{meta}</text>
    </g>
  );
}

export default function CampusPhone() {
  const [stage, setStage] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const onStage = (e: Event) => {
      const s = (e as CustomEvent<{ stage?: number }>).detail?.stage;
      if (typeof s === "number" && s >= 0 && s <= 3) setStage(s);
    };
    window.addEventListener("rx:campus-stage", onStage);
    return () => window.removeEventListener("rx:campus-stage", onStage);
  }, []);

  const cls = (i: number) => `cc-screen${(reduced ? i === 0 : stage === i) ? " cc-on" : ""}`;
  const el = (d: number) => ({ className: "cc-el", style: { animationDelay: `${d}s` } });

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 260, margin: "0 auto" }}>
      <svg
        viewBox="0 0 260 520"
        width="100%"
        role="img"
        aria-label="Campus Connect app preview, showing each stage of the loop: post, RSVP, check in, reflect"
        style={{ display: "block", filter: "drop-shadow(0 24px 40px rgba(26,23,19,0.18))" }}
      >
        {/* device body */}
        <rect x="8" y="4" width="244" height="512" rx="36" fill="#1a1713" />
        <rect x="16" y="14" width="228" height="492" rx="28" fill={INK} />
        {/* notch */}
        <rect x="104" y="22" width="52" height="9" rx="4.5" fill="#2a2724" />

        {/* masthead: Campus Connect. */}
        <text x="30" y="58" fontSize="15" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={PAPER}>
          Campus Connect<tspan fill="#c93a17">.</tspan>
        </text>

        {/* ── 01 · POST — an event goes up ── */}
        <g className={cls(0)}>
          <text {...el(0.05)} x="30" y="88" fontSize="8" fontFamily={MONO} fill={ON_INK[0]} letterSpacing="0.16em">NEW EVENT</text>
          <g {...el(0.15)}>
            <rect x="30" y="98" width="200" height="106" rx="14" fill={CARD} stroke={ON_INK[0]} strokeOpacity="0.35" strokeWidth="1" />
            <text x="44" y="124" fontSize="8" fontFamily={MONO} fill="#c93a17" letterSpacing="0.1em">CAMPUS</text>
            <text x="44" y="146" fontSize="14" fontWeight="600" fontStyle="italic" fontFamily={SERIF} fill={PAPER}>Freshers&rsquo; Fair</text>
            <text x="44" y="164" fontSize="10" fontFamily={SANS} fill={MUTED}>Great Hall &middot; Thu 18:00</text>
            <rect x="152" y="168" width="64" height="22" rx="11" fill="#c93a17" />
            <text x="184" y="183" textAnchor="middle" fontSize="10" fontWeight="600" fontFamily={SANS} fill="#f7f4ec">Post it</text>
          </g>
          <g {...el(0.3)}><GhostCard y={222} title="Hockey — 1st XI" meta="Wed · fixtures" /></g>
          <g {...el(0.4)}><GhostCard y={292} title="Film Society" meta="Thu 19:30 · social" /></g>
        </g>

        {/* ── 02 · RSVP — students say I'm in ── */}
        <g className={cls(1)}>
          <text {...el(0.05)} x="30" y="88" fontSize="8" fontFamily={MONO} fill={ON_INK[1]} letterSpacing="0.16em">ON THE FEED</text>
          <g {...el(0.15)}>
            <rect x="30" y="98" width="200" height="140" rx="14" fill={CARD} />
            <text x="44" y="124" fontSize="8" fontFamily={MONO} fill="#c93a17" letterSpacing="0.1em">CAMPUS</text>
            <text x="44" y="147" fontSize="15" fontWeight="600" fontStyle="italic" fontFamily={SERIF} fill={PAPER}>Freshers&rsquo; Fair</text>
            <text x="44" y="165" fontSize="10" fontFamily={SANS} fill={MUTED}>Great Hall &middot; Thu 18:00</text>
            <text x="44" y="186" fontSize="10" fontFamily={SANS} fill={MUTED}>128 going <tspan fill={ON_INK[1]} fontWeight="600">+1</tspan></text>
          </g>
          <g {...el(0.35)}>
            <rect x="44" y="198" width="78" height="26" rx="13" fill="#2565aa" />
            <text x="83" y="215" textAnchor="middle" fontSize="10.5" fontWeight="600" fontFamily={SANS} fill="#f7f4ec">I&rsquo;m in &#10003;</text>
          </g>
          <g {...el(0.45)}><GhostCard y={256} title="Hockey — 1st XI" meta="Wed · fixtures" /></g>
        </g>

        {/* ── 03 · CHECK IN — they turn up, it's recorded ── */}
        <g className={cls(2)}>
          <g {...el(0.1)}>
            <circle cx="130" cy="182" r="36" fill="none" stroke={ON_INK[2]} strokeWidth="2.5" />
            <path d="M 114 182 L 126 194 L 148 168" fill="none" stroke={ON_INK[2]} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <text {...el(0.25)} x="130" y="256" textAnchor="middle" fontSize="18" fontWeight="600" fontStyle="italic" fontFamily={SERIF} fill={PAPER}>You&rsquo;re here.</text>
          <text {...el(0.35)} x="130" y="278" textAnchor="middle" fontSize="10.5" fontFamily={SANS} fill={MUTED}>Great Hall &middot; 18:02</text>
          <text {...el(0.5)} x="130" y="306" textAnchor="middle" fontSize="8" fontFamily={MONO} fill={ON_INK[2]} letterSpacing="0.18em">ATTENDANCE RECORDED</text>
        </g>

        {/* ── 04 · REFLECT — the moment is captured ── */}
        <g className={cls(3)}>
          <text {...el(0.05)} x="30" y="104" fontSize="16" fontWeight="600" fontStyle="italic" fontFamily={SERIF} fill={PAPER}>How was it?</text>
          <g {...el(0.2)}>
            {[0, 1, 2, 3, 4].map((i) => (
              <polygon
                key={i}
                points={starPoints(42 + i * 26, 130, 9, 3.8)}
                fill={i < 4 ? ON_INK[3] : "none"}
                stroke={i < 4 ? "none" : HAIR}
                strokeWidth="1.5"
              />
            ))}
          </g>
          <g {...el(0.35)}>
            <rect x="30" y="156" width="200" height="78" rx="14" fill={CARD} />
            <text x="44" y="186" fontSize="12" fontStyle="italic" fontFamily={SERIF} fill="#d8d1c0">&ldquo;Best night of freshers</text>
            <text x="44" y="204" fontSize="12" fontStyle="italic" fontFamily={SERIF} fill="#d8d1c0">so far.&rdquo;</text>
            <line x1="44" y1="218" x2="216" y2="218" stroke={HAIR} strokeWidth="1" />
          </g>
          <text {...el(0.5)} x="30" y="262" fontSize="8" fontFamily={MONO} fill={ON_INK[3]} letterSpacing="0.18em">MOMENT SAVED &#10003;</text>
        </g>

        {/* stage dots — the phone's own little map of the loop */}
        {[0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={112 + i * 12}
            cy="478"
            r="3"
            fill={(reduced ? i === 0 : stage === i) ? ON_INK[i] : HAIR}
            style={{ transition: "fill 0.45s ease" }}
          />
        ))}

        {/* home indicator */}
        <rect x="105" y="494" width="50" height="5" rx="2.5" fill={HAIR} />
      </svg>

      <style>{`
        .cc-screen { opacity: 0; transition: opacity 0.45s ease; }
        .cc-screen.cc-on { opacity: 1; }
        .cc-on .cc-el { opacity: 0; animation: ccRise 0.55s ease forwards; }
        @keyframes ccRise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-screen { transition: none; }
          .cc-on .cc-el { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
