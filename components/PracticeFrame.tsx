"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The practice LMAS, on glass — a hand-built desktop frame.
 *
 * A dark, green-signed workspace (the third captain's colour) cycling
 * through three scenes of the same working day: Ask — a question answered
 * from the practice's own documents, sources cited beneath; Run the day —
 * the diary, the team and a draft waiting for sign-off; Trust — the agent
 * viewer, where answers, clarifications and refusals sit in plain sight.
 * The chrome never changes: locally hosted, on the practice's own
 * infrastructure, whichever screen is up.
 *
 * Every pixel is invented, generic material — the interaction patterns of
 * a practice assistant, belonging to no practice in particular. Reduced
 * motion holds the Ask scene.
 */

const INK = "#1b1a18";
const BEZEL = "#14110d";
const SIDE = "#191816";
const CARD = "#262523";
const CHIPBG = "#161513";
const HAIR = "#3a3833";
const PAPER = "#f4efe4";
const BODY = "#d8d4c8";
const MUTED = "#948e7d";

const GREEN = "#479a74";
const GREEN_SOFT = "#6dbe97";
const GREEN_DEEP = "#153828";
const AMBER = "#d2a757";

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Newsreader', Georgia, serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";

const NAV = ["Assistant", "Messages", "Team", "Agent viewer", "File search", "Approvals"];
const ACTIVE_NAV = [0, 2, 3]; // per scene
const TABS = [
  { label: "ASK", w: 28 },
  { label: "RUN THE DAY", w: 80 },
  { label: "TRUST", w: 42 },
];
const SCENE_MS = 4200;

const DIARY = [
  { time: "09:30", tag: "REVIEW", name: "Hartley & Co", desc: "Q3 accounts sign-off" },
  { time: "11:00", tag: "SITE VISIT", name: "Meadow Barn", desc: "Measured survey" },
  { time: "14:30", tag: "RENEWAL", name: "Bowden Ltd", desc: "Contract terms" },
];

const TEAM = [
  { name: "You", chip: "IN", kind: "in" },
  { name: "T. Weller", chip: "ON CALL", kind: "oncall" },
  { name: "P. Nair", chip: "OFF", kind: "off" },
];

const LOG = [
  { badge: "ANSWERED", bw: 64, q: "Draft a renewal reminder for Bowden Ltd", t: "14:02", kind: "ok" },
  { badge: "ASKED TO CLARIFY", bw: 100, q: "Notice period — which version?", t: "11:37", kind: "clarify" },
  { badge: "REFUSED · UNGROUNDED", bw: 120, q: "Figures the practice doesn't hold", t: "10:20", kind: "refused" },
];

export default function PracticeFrame() {
  const [scene, setScene] = useState(0);
  const [reduced, setReduced] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const io = new IntersectionObserver((es) => {
      visibleRef.current = es[0]?.isIntersecting ?? false;
    }, { threshold: 0.15 });
    if (hostRef.current) io.observe(hostRef.current);
    const id = window.setInterval(() => {
      if (visibleRef.current) setScene((s) => (s + 1) % 3);
    }, SCENE_MS);
    return () => { window.clearInterval(id); io.disconnect(); };
  }, []);

  const cls = (i: number) => `pf-screen${(reduced ? i === 0 : scene === i) ? " pf-on" : ""}`;
  const el = (d: number) => ({ className: "pf-el", style: { animationDelay: `${d}s` } });
  const activeNav = reduced ? 0 : ACTIVE_NAV[scene];

  let tabX = 239;

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", maxWidth: 760, margin: 0 }}>
      <svg
        viewBox="0 0 560 380"
        width="100%"
        role="img"
        aria-label="A practice assistant workspace: questions answered from the practice's own documents, the working day organised, and every answer, clarification and refusal logged in plain sight"
        style={{ display: "block", filter: "drop-shadow(0 24px 40px rgba(26,23,19,0.18))" }}
      >
        {/* device */}
        <rect x="4" y="4" width="552" height="372" rx="16" fill={BEZEL} />
        <rect x="12" y="12" width="536" height="356" rx="10" fill={INK} />

        {/* top bar */}
        <circle cx="30" cy="28" r="3" fill={HAIR} />
        <circle cx="42" cy="28" r="3" fill={HAIR} />
        <circle cx="54" cy="28" r="3" fill={HAIR} />
        <text x="76" y="33" fontSize="14.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={PAPER}>
          Practice Assistant<tspan fill={GREEN}>.</tspan>
        </text>
        <circle cx="424" cy="28" r="2.5" fill={GREEN_SOFT} />
        <text x="534" y="31" textAnchor="end" fontSize="7" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.1em">ON YOUR INFRASTRUCTURE</text>
        <line x1="12" y1="44" x2="548" y2="44" stroke={HAIR} strokeWidth="1" />

        {/* sidebar */}
        <rect x="12" y="44" width="120" height="324" fill={SIDE} />
        <line x1="132" y1="44" x2="132" y2="368" stroke={HAIR} strokeWidth="1" />
        {NAV.map((item, i) => {
          const y = 64 + i * 27;
          const on = i === activeNav;
          return (
            <g key={item}>
              {on && <rect x="18" y={y - 13} width="108" height="21" rx="6" fill="#1e2822" />}
              {on && <rect x="18" y={y - 13} width="2.5" height="21" rx="1.25" fill={GREEN} />}
              <text x="30" y={y + 2} fontSize="10" fontFamily={SANS} fill={on ? PAPER : MUTED}>{item}</text>
            </g>
          );
        })}

        {/* ── SCENE 1 · ASK — answered from source ── */}
        <g className={cls(0)}>
          <text {...el(0.05)} x="152" y="84" fontSize="17" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={PAPER}>How can I help today?</text>
          <g {...el(0.15)}>
            <rect x="292" y="96" width="240" height="24" rx="12" fill={GREEN_DEEP} />
            <text x="412" y="111.5" textAnchor="middle" fontSize="9.5" fontFamily={SANS} fill="#cfe8db">What&rsquo;s our policy on late cancellations?</text>
          </g>
          <g {...el(0.35)}>
            <rect x="152" y="132" width="380" height="122" rx="12" fill={CARD} />
            <text x="168" y="154" fontSize="7.5" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.14em">ANSWERED FROM SOURCE</text>
            <text x="168" y="176" fontSize="10.5" fontFamily={SANS} fill={BODY}>Clients may cancel up to 24 hours ahead without charge.</text>
            <text x="168" y="193" fontSize="10.5" fontFamily={SANS} fill={BODY}>Inside 24 hours a 50% fee applies &mdash; waived once per</text>
            <text x="168" y="210" fontSize="10.5" fontFamily={SANS} fill={BODY}>client per year at the team&rsquo;s discretion.</text>
            <rect x="168" y="222" width="170" height="19" rx="9.5" fill={CHIPBG} stroke={HAIR} strokeWidth="1" />
            <text x="253" y="235" textAnchor="middle" fontSize="7.5" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.06em">POLICY &mdash; CANCELLATIONS V3</text>
            <rect x="348" y="222" width="126" height="19" rx="9.5" fill={CHIPBG} stroke={HAIR} strokeWidth="1" />
            <text x="411" y="235" textAnchor="middle" fontSize="7.5" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.06em">CLIENT TERMS &middot; 2026</text>
          </g>
          <g {...el(0.55)}>
            <rect x="152" y="266" width="380" height="27" rx="13.5" fill={CARD} />
            <text x="168" y="283" fontSize="10" fontFamily={SANS} fill={MUTED}>Message the assistant&hellip;</text>
            <circle cx="519" cy="279.5" r="9.5" fill={GREEN} />
            <path d="M 519 284 L 519 276.5 M 515.5 279.5 L 519 275.5 L 522.5 279.5" stroke="#f7f4ec" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* ── SCENE 2 · RUN THE DAY — diary, team, sign-off ── */}
        <g className={cls(1)}>
          <text {...el(0.05)} x="152" y="84" fontSize="16.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={PAPER}>The working day.</text>
          <g {...el(0.1)}>
            <rect x="392" y="68" width="140" height="21" rx="10.5" fill={CARD} />
            <circle cx="404" cy="78.5" r="2.5" fill={GREEN_SOFT} />
            <text x="412" y="81.5" fontSize="7" fontFamily={MONO} fill={BODY} letterSpacing="0.08em">UP NEXT &middot; HARTLEY &amp; CO</text>
          </g>
          {DIARY.map((d, i) => (
            <g key={d.name} {...el(0.2 + i * 0.12)}>
              <rect x="152" y={98 + i * 56} width="260" height="48" rx="10" fill={CARD} />
              <text x="166" y={116 + i * 56} fontSize="9" fontFamily={MONO} fill={MUTED}>{d.time}</text>
              <text x="206" y={116 + i * 56} fontSize="7.5" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.1em">{d.tag}</text>
              <text x="166" y={134 + i * 56} fontSize="11.5" fontWeight="600" fontFamily={SANS} fill={PAPER}>{d.name}
                <tspan fontWeight="400" fontSize="9.5" fill={MUTED}> &mdash; {d.desc}</tspan>
              </text>
            </g>
          ))}
          <g {...el(0.45)}>
            <text x="424" y="106" fontSize="7.5" fontFamily={MONO} fill={MUTED} letterSpacing="0.14em">TEAM</text>
            {TEAM.map((m, i) => (
              <g key={m.name}>
                <circle cx="432" cy={126 + i * 29} r="7.5" fill={m.kind === "in" ? "#3fa375" : m.kind === "oncall" ? GREEN_DEEP : "#2a2926"} />
                <text x="448" y={129 + i * 29} fontSize="9.5" fontFamily={SANS} fill={BODY}>{m.name}</text>
                <text x="532" y={129 + i * 29} textAnchor="end" fontSize="6.5" fontFamily={MONO} fill={m.kind === "off" ? MUTED : GREEN_SOFT} letterSpacing="0.06em">{m.chip}</text>
              </g>
            ))}
          </g>
          <g {...el(0.6)}>
            <rect x="152" y="268" width="380" height="26" rx="13" fill={CARD} stroke={AMBER} strokeOpacity="0.35" strokeWidth="1" />
            <circle cx="168" cy="281" r="2.5" fill={AMBER} />
            <text x="178" y="284" fontSize="7.5" fontFamily={MONO} fill={AMBER} letterSpacing="0.06em">1 DRAFT AWAITING SIGN-OFF &middot; RENEWAL REMINDER &mdash; BOWDEN LTD</text>
          </g>
        </g>

        {/* ── SCENE 3 · TRUST — the agent viewer ── */}
        <g className={cls(2)}>
          <text {...el(0.05)} x="152" y="84" fontSize="15.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={PAPER}>Every answer shows its working.</text>
          {[
            { n: "14", l: "INTERACTIONS" },
            { n: "11", l: "FROM SOURCE" },
            { n: "2", l: "CLARIFIED" },
            { n: "1", l: "REFUSED" },
          ].map((s, i) => (
            <g key={s.l} {...el(0.15 + i * 0.08)}>
              <rect x={152 + i * 97} y="96" width="89" height="46" rx="10" fill={CARD} />
              <text x={166 + i * 97} y="118" fontSize="16" fontWeight="600" fontFamily={SANS} fill={PAPER}>{s.n}</text>
              <text x={166 + i * 97} y="133" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.06em">{s.l}</text>
            </g>
          ))}
          {LOG.map((r, i) => (
            <g key={r.q} {...el(0.45 + i * 0.12)}>
              <rect x="152" y={156 + i * 40} width="380" height="32" rx="8" fill={CARD} />
              <rect x="164" y={162 + i * 40} width={r.bw} height="19" rx="9.5"
                fill={r.kind === "ok" ? GREEN_DEEP : r.kind === "clarify" ? "#2a241a" : "#2a2926"} />
              <text x={164 + r.bw / 2} y={175 + i * 40} textAnchor="middle" fontSize="6.5"
                fontFamily={MONO} letterSpacing="0.04em"
                fill={r.kind === "ok" ? GREEN_SOFT : r.kind === "clarify" ? AMBER : MUTED}>{r.badge}</text>
              <text x={296} y={176 + i * 40} fontSize="9.5" fontFamily={SANS} fill={BODY}>{r.q}</text>
              <text x="520" y={176 + i * 40} textAnchor="end" fontSize="7.5" fontFamily={MONO} fill={MUTED}>{r.t}</text>
            </g>
          ))}
          <text {...el(0.85)} x="152" y="292" fontSize="7.5" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.12em">
            ANSWERS ONLY FROM YOUR DOCUMENTS &mdash; DECLINES WHEN IT CAN&rsquo;T CITE
          </text>
        </g>

        {/* scene tabs — the frame's own clock */}
        {TABS.map((t, i) => {
          const x = tabX;
          tabX += t.w + 26;
          const on = (reduced ? 0 : scene) === i;
          return (
            <g key={t.label}>
              <text x={x + t.w / 2} y="349" textAnchor="middle" fontSize="7.5" fontFamily={MONO}
                fill={on ? GREEN_SOFT : MUTED} letterSpacing="0.12em" style={{ transition: "fill 0.45s ease" }}>{t.label}</text>
              <rect x={x} y="355" width={t.w} height="2" rx="1"
                fill={on ? GREEN : HAIR} style={{ transition: "fill 0.45s ease" }} />
            </g>
          );
        })}
      </svg>

      <style>{`
        .pf-screen { opacity: 0; transition: opacity 0.45s ease; }
        .pf-screen.pf-on { opacity: 1; }
        .pf-on .pf-el { opacity: 0; animation: pfRise 0.55s ease forwards; }
        @keyframes pfRise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-screen { transition: none; }
          .pf-on .pf-el { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
