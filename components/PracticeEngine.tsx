"use client";

import { useEffect, useRef } from "react";

/**
 * The engine room — what's working underneath.
 *
 * The PracticeFrame beside this shows what the team sees; this panel
 * shows the crew below decks: five named agents on one rail, each a
 * folded dart in a captain's colour. Their status lines type out real
 * work — the diary read and de-conflicted, messages drafted, the Bowden
 * file pulled and cited, a renewal letter drafted, the draft checked
 * against policy — and the work visibly hands off between them, a colour
 * pulse running down the rail. Nothing sends itself: drafts queue amber
 * for sign-off, a human approves, and only then does the strip turn
 * green. Then the room settles, stands by, and the shift begins again.
 *
 * Every state is a pure function of the clock, so any moment of the loop
 * can be rendered and inspected. Pauses off-screen; reduced motion holds
 * the room at full working state.
 */

const BEZEL = "#14110d";
const INK = "#1b1a18";
const CARD = "#262523";
const HAIR = "#3a3833";
const PAPER = "#f4efe4";
const BODY = "#d8d4c8";
const MUTED = "#948e7d";
const GREEN = "#479a74";
const GREEN_SOFT = "#6dbe97";
const AMBER = "#d2a757";

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Newsreader', Georgia, serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";

const AGENTS = [
  { name: "DIARY AGENT", color: "#c93a17" },
  { name: "MESSAGES AGENT", color: "#2565aa" },
  { name: "RECORDS AGENT", color: "#5f93c9" },
  { name: "DRAFTING AGENT", color: "#e8896c" },
  { name: "COMPLIANCE AGENT", color: "#46a37e" },
];

type St = "idle" | "work" | "amber" | "done";
type Ev = { t: number; a: number; text: string; st: St; pulseTo?: number };

const SCRIPT: Ev[] = [
  { t: 0.3, a: 0, text: "Reading tomorrow's diary — 14 booked", st: "work" },
  { t: 2.7, a: 0, text: "2 conflicts found → rescheduling", st: "work" },
  { t: 5.0, a: 0, text: "Diary clear — conflicts resolved", st: "done", pulseTo: 1 },
  { t: 5.7, a: 1, text: "Drafting 2 reschedule messages", st: "work" },
  { t: 8.0, a: 1, text: "2 drafts → awaiting sign-off", st: "amber" },
  { t: 8.5, a: 2, text: "Pulling the Bowden Ltd file", st: "work" },
  { t: 10.7, a: 2, text: "Renewal terms located — cited", st: "done", pulseTo: 3 },
  { t: 11.4, a: 3, text: "Drafting the renewal letter", st: "work" },
  { t: 13.8, a: 3, text: "Draft ready → awaiting sign-off", st: "amber" },
  { t: 14.3, a: 4, text: "Checking draft against Policy v3", st: "work" },
  { t: 16.6, a: 4, text: "Grounded — 2 sources cited", st: "done" },
  { t: 18.3, a: 1, text: "Messages signed off — sent", st: "done" },
  { t: 18.6, a: 3, text: "Letter signed off — sent", st: "done" },
  { t: 21.0, a: 0, text: "Standing by", st: "idle" },
  { t: 21.3, a: 1, text: "Standing by", st: "idle" },
  { t: 21.6, a: 2, text: "Standing by", st: "idle" },
  { t: 21.9, a: 3, text: "Standing by", st: "idle" },
  { t: 22.2, a: 4, text: "Standing by", st: "idle" },
];
const LOOP = 23.6;
const CPS = 30;

const CARD_Y = (i: number) => 84 + i * 68;
const MID_Y = (i: number) => CARD_Y(i) + 30;
const RAIL_X = 30;

const stripState = (t: number) => {
  if (t >= 18.3 && t < 21.0) return { text: "SIGNED OFF \u2713 \u00b7 SENT", color: GREEN_SOFT, stroke: GREEN, strong: true };
  if (t >= 17.4 && t < 18.3) return { text: "\u2192 SIGN-OFF \u00b7 2 ITEMS", color: AMBER, stroke: AMBER, strong: true };
  if (t >= 13.8 && t < 17.4) return { text: "2 AWAITING SIGN-OFF", color: AMBER, stroke: AMBER, strong: false };
  if (t >= 8.0 && t < 13.8) return { text: "1 AWAITING SIGN-OFF", color: AMBER, stroke: AMBER, strong: false };
  return { text: "HUMAN SIGN-OFF \u2014 YOUR TEAM HOLDS THE DIAL", color: MUTED, stroke: HAIR, strong: false };
};

export default function PracticeEngine() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(SVGTextElement | null)[]>([]);
  const nameRefs = useRef<(SVGTextElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const tickRefs = useRef<(SVGPathElement | null)[]>([]);
  const pulseRef = useRef<SVGCircleElement | null>(null);
  const pulseGlowRef = useRef<SVGCircleElement | null>(null);
  const stripRectRef = useRef<SVGRectElement | null>(null);
  const stripTextRef = useRef<SVGTextElement | null>(null);
  const counterRef = useRef<SVGTextElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const apply = (t: number, blink: boolean) => {
      // per-agent latest event
      for (let a = 0; a < AGENTS.length; a++) {
        let ev: Ev | null = null;
        for (const e of SCRIPT) if (e.a === a && e.t <= t && (!ev || e.t > ev.t)) ev = e;
        const st: St = ev?.st ?? "idle";
        const full = ev?.text ?? "Standing by";
        const chars = ev ? Math.floor((t - ev.t) * CPS) : full.length;
        const typing = chars < full.length;
        const line = lineRefs.current[a];
        if (line) {
          line.textContent = full.slice(0, Math.max(0, chars)) + (typing && blink ? "\u258f" : "");
          line.setAttribute("fill", st === "idle" ? MUTED : BODY);
        }
        nameRefs.current[a]?.setAttribute("fill", st === "idle" ? MUTED : PAPER);
        const dot = dotRefs.current[a];
        const tick = tickRefs.current[a];
        if (dot && tick) {
          if (st === "done") {
            dot.setAttribute("opacity", "0");
            tick.setAttribute("opacity", "1");
          } else {
            tick.setAttribute("opacity", "0");
            dot.setAttribute("opacity", "1");
            dot.setAttribute("fill", st === "idle" ? HAIR : st === "amber" ? AMBER : AGENTS[a].color);
            dot.setAttribute("r", st === "work" ? String(3 + Math.sin(t * 5 + a) * 0.7) : "3");
          }
        }
      }

      // handoff pulse on the rail
      const pulse = pulseRef.current, glow = pulseGlowRef.current;
      if (pulse && glow) {
        let on = false;
        for (const e of SCRIPT) {
          if (e.pulseTo === undefined) continue;
          const p = (t - e.t) / 0.9;
          if (p >= 0 && p < 1) {
            const ps = p * p * (3 - 2 * p);
            const y = MID_Y(e.a) + (MID_Y(e.pulseTo) - MID_Y(e.a)) * ps;
            pulse.setAttribute("cy", String(y));
            glow.setAttribute("cy", String(y));
            pulse.setAttribute("fill", AGENTS[e.a].color);
            glow.setAttribute("fill", AGENTS[e.a].color);
            pulse.setAttribute("opacity", "1");
            glow.setAttribute("opacity", "0.25");
            on = true;
          }
        }
        if (!on) { pulse.setAttribute("opacity", "0"); glow.setAttribute("opacity", "0"); }
      }

      // the sign-off strip
      const s = stripState(t);
      stripTextRef.current && (stripTextRef.current.textContent = s.text);
      stripTextRef.current?.setAttribute("fill", s.color);
      stripRectRef.current?.setAttribute("stroke", s.stroke);
      stripRectRef.current?.setAttribute("stroke-opacity", s.strong ? "0.8" : "0.45");

      // tasks-today counter
      let dones = 0;
      for (const e of SCRIPT) if (e.st === "done" && e.t <= t) dones++;
      counterRef.current && (counterRef.current.textContent = `TASKS TODAY \u00b7 ${21 + dones}`);
    };

    if (reduced) {
      apply(17.0, false);
      return;
    }

    let raf = 0;
    let running = true;
    const start = performance.now();
    const io = new IntersectionObserver((es) => {
      running = es[0]?.isIntersecting ?? false;
    }, { threshold: 0.15 });
    if (hostRef.current) io.observe(hostRef.current);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const t = ((now - start) / 1000) % LOOP;
      apply(t, Math.floor(now / 400) % 2 === 0);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <svg
        viewBox="0 0 340 470"
        width="100%"
        role="img"
        aria-label="The engine room: five named agents — diary, messages, records, drafting, compliance — working a practice's day, handing tasks between each other, with drafts held for human sign-off"
        style={{ display: "block", filter: "drop-shadow(0 24px 40px rgba(26,23,19,0.18))" }}
      >
        {/* panel */}
        <rect x="4" y="4" width="332" height="462" rx="16" fill={BEZEL} />
        <rect x="12" y="12" width="316" height="446" rx="10" fill={INK} />

        {/* masthead */}
        <text x="28" y="38" fontSize="14.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={PAPER}>
          The engine room<tspan fill={GREEN}>.</tspan>
        </text>
        <circle cx="278" cy="33" r="2.5" fill={GREEN_SOFT} />
        <text x="316" y="36" textAnchor="end" fontSize="6.5" fontFamily={MONO} fill={GREEN_SOFT} letterSpacing="0.1em">ON-SITE</text>
        <line x1="12" y1="50" x2="328" y2="50" stroke={HAIR} strokeWidth="1" />

        {/* sub-line */}
        <text x="28" y="68" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.14em">FIVE AGENTS &middot; ONE PRACTICE</text>
        <text ref={counterRef} x="316" y="68" textAnchor="end" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.12em">TASKS TODAY &middot; 21</text>

        {/* the rail */}
        <line x1={RAIL_X} y1={MID_Y(0)} x2={RAIL_X} y2={MID_Y(4)} stroke={HAIR} strokeWidth="1.25" />
        {AGENTS.map((_, i) => (
          <circle key={i} cx={RAIL_X} cy={MID_Y(i)} r="2.25" fill={HAIR} />
        ))}
        <circle ref={pulseGlowRef} cx={RAIL_X} r="6.5" opacity="0" />
        <circle ref={pulseRef} cx={RAIL_X} r="3" opacity="0" />

        {/* agent cards */}
        {AGENTS.map((ag, i) => {
          const y = CARD_Y(i);
          return (
            <g key={ag.name}>
              <line x1={RAIL_X} y1={MID_Y(i)} x2="40" y2={MID_Y(i)} stroke={HAIR} strokeWidth="1" />
              <rect x="40" y={y} width="288" height="60" rx="10" fill={CARD} />
              {/* the agent: a folded dart in its captain's colour */}
              <path
                d="M 8 0 L -5 -3.4 L -2.4 0 L -5 3.4 Z"
                transform={`translate(58 ${y + 21}) scale(1.25)`}
                fill={ag.color}
              />
              <text ref={(el) => { nameRefs.current[i] = el; }} x="76" y={y + 24} fontSize="7.5" fontFamily={MONO} fill={MUTED} letterSpacing="0.15em">{ag.name}</text>
              <circle ref={(el) => { dotRefs.current[i] = el; }} cx="308" cy={y + 21} r="3" fill={HAIR} />
              <path
                ref={(el) => { tickRefs.current[i] = el; }}
                d={`M 302 ${y + 21} L 306.5 ${y + 25.5} L 314 ${y + 16.5}`}
                fill="none" stroke={GREEN_SOFT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0"
              />
              <text ref={(el) => { lineRefs.current[i] = el; }} x="58" y={y + 45} fontSize="9.5" fontFamily={SANS} fill={MUTED}>Standing by</text>
            </g>
          );
        })}

        {/* the sign-off strip — the human's hand on the dial */}
        <rect ref={stripRectRef} x="24" y="424" width="304" height="26" rx="13" fill={CARD} stroke={HAIR} strokeOpacity="0.45" strokeWidth="1" />
        <text ref={stripTextRef} x="176" y="440.5" textAnchor="middle" fontSize="6.8" fontFamily={MONO} fill={MUTED} letterSpacing="0.12em">
          HUMAN SIGN-OFF &mdash; YOUR TEAM HOLDS THE DIAL
        </text>
      </svg>
    </div>
  );
}
