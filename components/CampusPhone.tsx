"use client";

/**
 * Campus Connect phone mockup — a hand-built SVG device showing the live
 * feed in the product's vermilion-on-ink skin: masthead, filter chips, and
 * event cards with an "I'm in" RSVP button. The active filter chip and the
 * cards fade in on a gentle stagger so it feels alive without a screenshot.
 */

const CARDS = [
  { title: "Freshers' Fair", meta: "Great Hall · 18:00", tag: "Campus" },
  { title: "Hockey — 1st XI", meta: "Wed · fixtures", tag: "Sport" },
  { title: "Film Society", meta: "Thu 19:30 · social", tag: "Social" },
];
const CHIPS = ["All", "Societies", "Sport", "Social"];

export default function CampusPhone() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 260, margin: "0 auto" }}>
      <svg viewBox="0 0 260 520" width="100%" role="img" aria-label="Campus Connect app preview" style={{ display: "block", filter: "drop-shadow(0 24px 40px rgba(26,23,19,0.18))" }}>
        {/* device body */}
        <rect x="8" y="4" width="244" height="512" rx="36" fill="#1a1713" />
        <rect x="16" y="14" width="228" height="492" rx="28" fill="#141210" />
        {/* notch */}
        <rect x="104" y="22" width="52" height="9" rx="4.5" fill="#2a2724" />

        {/* masthead: Campus Connect. */}
        <text x="30" y="58" fontSize="15" fontStyle="italic" fontWeight="600" fontFamily="'Newsreader', Georgia, serif" fill="#f4efe4">
          Campus Connect<tspan fill="#c93a17">.</tspan>
        </text>

        {/* filter chips */}
        {CHIPS.map((c, i) => {
          const x = 30 + i * 52;
          const active = i === 0;
          return (
            <g key={c} className="cc-chip" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
              <rect x={x} y="76" width={c.length * 6 + 16} height="22" rx="11" fill={active ? "#c93a17" : "none"} stroke={active ? "none" : "#3a352c"} strokeWidth="1.5" />
              <text x={x + (c.length * 6 + 16) / 2} y="91" textAnchor="middle" fontSize="10" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill={active ? "#f7f4ec" : "#8a8175"}>{c}</text>
            </g>
          );
        })}

        {/* event cards */}
        {CARDS.map((card, i) => {
          const y = 118 + i * 116;
          return (
            <g key={card.title} className="cc-card" style={{ animationDelay: `${0.4 + i * 0.14}s` }}>
              <rect x="30" y={y} width="200" height="100" rx="14" fill="#211e1a" />
              <text x="44" y={y + 26} fontSize="8" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill="#c93a17" style={{ letterSpacing: "0.1em" }}>{card.tag.toUpperCase()}</text>
              <text x="44" y={y + 48} fontSize="13" fontWeight="600" fontFamily="'Newsreader', Georgia, serif" fontStyle="italic" fill="#f4efe4">{card.title}</text>
              <text x="44" y={y + 66} fontSize="10" fontFamily="ui-sans-serif, system-ui" fill="#8a8175">{card.meta}</text>
              <rect x="160" y={y + 70} width="56" height="22" rx="11" fill="#c93a17" />
              <text x="188" y={y + 85} textAnchor="middle" fontSize="10" fontWeight="600" fontFamily="ui-sans-serif, system-ui" fill="#f7f4ec">I&rsquo;m in</text>
            </g>
          );
        })}

        {/* home indicator */}
        <rect x="105" y="494" width="50" height="5" rx="2.5" fill="#3a352c" />
      </svg>

      <style>{`
        .cc-chip, .cc-card { opacity: 0; animation: ccIn 0.6s ease forwards; }
        @keyframes ccIn { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .cc-chip, .cc-card { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
