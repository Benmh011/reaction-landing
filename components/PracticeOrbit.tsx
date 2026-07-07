"use client";

import { useEffect, useRef } from "react";

/**
 * The orbit — the practice LMAS's answer to the campus loop.
 *
 * Where Campus Connect runs a circuit, the LMAS holds a formation: four
 * small, specialised agents stationed around a single core — the
 * practice's own documents. One by one, each agent sends a pulse to the
 * core and carries the answer back, earning its tick: every lane of the
 * working day, grounded in the same place. Around it all, a dashed
 * boundary closes the story — on your infrastructure, nothing leaves.
 *
 * Ink, paper, hairlines and the station colours — the same editorial
 * language as the loop. Pauses off-screen; reduced motion shows the
 * formation fully grounded.
 */

const INK = "#1a1713";
const HAIR = "#d8d1bf";
const MUTED = "#8a8175";
const PAPER2 = "#fdfbf5";
const BOUND = "#0d5a40";

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Newsreader', Georgia, serif";

const CX = 170;
const CY = 165;
const CORE_R = 36;
const AGENT_DIST = 98;
const AGENT_R = 15;

const AGENTS = [
  { label: "DIARY", color: "#c93a17", ang: -90 },
  { label: "MESSAGES", color: "#2565aa", ang: 0 },
  { label: "DRAFTS", color: "#1b3656", ang: 90 },
  { label: "APPROVALS", color: "#0d5a40", ang: 180 },
];

const OUT_MS = 650;
const CORE_MS = 350;
const BACK_MS = 650;
const DWELL_MS = 750;
const AGENT_MS = OUT_MS + CORE_MS + BACK_MS + DWELL_MS;
const HOLD_MS = 1400;
const CYCLE_MS = AGENTS.length * AGENT_MS + HOLD_MS;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const pos = (ang: number, dist: number) => ({
  x: CX + Math.cos((ang * Math.PI) / 180) * dist,
  y: CY + Math.sin((ang * Math.PI) / 180) * dist,
});

export default function PracticeOrbit() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const agentRefs = useRef<(SVGCircleElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);
  const tickRefs = useRef<(SVGPathElement | null)[]>([]);
  const spokeRefs = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setAgentLit = (i: number, lit: boolean) => {
      const a = AGENTS[i];
      agentRefs.current[i]?.setAttribute("stroke", lit ? a.color : HAIR);
      agentRefs.current[i]?.setAttribute("stroke-width", lit ? "1.5" : "1.25");
      labelRefs.current[i]?.setAttribute("fill", lit ? INK : MUTED);
    };
    const setTick = (i: number, on: boolean) => {
      tickRefs.current[i]?.setAttribute("opacity", on ? "1" : "0");
    };
    const setSpoke = (i: number, drawn: number) => {
      spokeRefs.current[i]?.setAttribute("stroke-dashoffset", String(41 * (1 - drawn)));
    };

    if (reduced) {
      AGENTS.forEach((_, i) => { setAgentLit(i, true); setTick(i, true); setSpoke(i, 1); });
      if (dotRef.current) dotRef.current.setAttribute("opacity", "0");
      return;
    }

    let raf = 0;
    let running = true;
    let lastT = -1;
    const start = performance.now();

    const io = new IntersectionObserver((es) => {
      running = es[0]?.isIntersecting ?? false;
    }, { threshold: 0.15 });
    if (hostRef.current) io.observe(hostRef.current);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const t = (now - start) % CYCLE_MS;

      // new cycle — clear the formation
      if (t < lastT) {
        AGENTS.forEach((_, i) => { setAgentLit(i, false); setTick(i, false); setSpoke(i, 0); });
      }
      lastT = t;

      const dot = dotRef.current;
      const ring = ringRef.current;
      if (!dot || !ring) return;

      if (t >= AGENTS.length * AGENT_MS) {
        // hold — everything grounded, dot resting
        dot.setAttribute("opacity", "0");
        ring.setAttribute("opacity", "0");
        return;
      }

      const i = Math.floor(t / AGENT_MS);
      const ph = t - i * AGENT_MS;
      const a = AGENTS[i];
      const inner = pos(a.ang, CORE_R + 4);
      const outer = pos(a.ang, AGENT_DIST - AGENT_R - 2);

      setAgentLit(i, true);
      dot.setAttribute("fill", a.color);
      ring.setAttribute("opacity", "0");

      if (ph < OUT_MS) {
        // question travels in: agent → core
        const p = ease(ph / OUT_MS);
        dot.setAttribute("opacity", "1");
        dot.setAttribute("cx", String(outer.x + (inner.x - outer.x) * p));
        dot.setAttribute("cy", String(outer.y + (inner.y - outer.y) * p));
        setSpoke(i, p);
      } else if (ph < OUT_MS + CORE_MS) {
        // the core answers
        const p = (ph - OUT_MS) / CORE_MS;
        dot.setAttribute("opacity", "0");
        ring.setAttribute("opacity", String(0.6 * (1 - p)));
        ring.setAttribute("r", String(CORE_R + 12 * p));
      } else if (ph < OUT_MS + CORE_MS + BACK_MS) {
        // answer travels back: core → agent
        const p = ease((ph - OUT_MS - CORE_MS) / BACK_MS);
        dot.setAttribute("opacity", "1");
        dot.setAttribute("cx", String(inner.x + (outer.x - inner.x) * p));
        dot.setAttribute("cy", String(inner.y + (outer.y - inner.y) * p));
      } else {
        // grounded — the agent earns its tick
        dot.setAttribute("opacity", "0");
        setTick(i, true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", maxWidth: 330, margin: "0 auto" }}>
      <svg
        viewBox="0 0 340 330"
        width="100%"
        role="img"
        aria-label="A formation of four specialised agents — diary, messages, drafts, approvals — each grounding its answers in the practice's own documents, inside a boundary marked on your infrastructure"
        style={{ display: "block" }}
      >
        <defs>
          <path id="pf-orbit-arc" d="M 38 165 A 132 132 0 0 1 302 165" fill="none" />
        </defs>

        {/* the sovereignty boundary */}
        <circle cx={CX} cy={CY} r="138" fill="none" stroke={BOUND} strokeOpacity="0.5" strokeWidth="1.25" strokeDasharray="2.5 7" />
        <text fontSize="6.5" fontFamily={MONO} fill={BOUND} letterSpacing="0.28em">
          <textPath href="#pf-orbit-arc" startOffset="50%" textAnchor="middle">ON YOUR INFRASTRUCTURE</textPath>
        </text>

        {/* spokes — hairline always, colour drawn as each agent grounds */}
        {AGENTS.map((a, i) => {
          const inner = pos(a.ang, CORE_R + 4);
          const outer = pos(a.ang, AGENT_DIST - AGENT_R - 2);
          return (
            <g key={a.label}>
              <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={HAIR} strokeWidth="1" />
              <line
                ref={(el) => { spokeRefs.current[i] = el; }}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={a.color} strokeWidth="1.5" strokeLinecap="round"
                strokeDasharray="41" strokeDashoffset="41"
              />
            </g>
          );
        })}

        {/* the core — your documents */}
        <circle ref={ringRef} cx={CX} cy={CY} r={CORE_R} fill="none" stroke={BOUND} strokeWidth="1.5" opacity="0" />
        <circle cx={CX} cy={CY} r={CORE_R} fill={PAPER2} stroke={HAIR} strokeWidth="1.25" />
        <text x={CX} y={CY - 3} textAnchor="middle" fontSize="11.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={INK}>Your</text>
        <text x={CX} y={CY + 11} textAnchor="middle" fontSize="11.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={INK}>documents</text>

        {/* the agents in formation */}
        {AGENTS.map((a, i) => {
          const p = pos(a.ang, AGENT_DIST);
          return (
            <g key={a.label}>
              <circle
                ref={(el) => { agentRefs.current[i] = el; }}
                cx={p.x} cy={p.y} r={AGENT_R}
                fill={PAPER2} stroke={HAIR} strokeWidth="1.25"
              />
              <path
                ref={(el) => { tickRefs.current[i] = el; }}
                d={`M ${p.x - 5} ${p.y} L ${p.x - 1} ${p.y + 4.5} L ${p.x + 5.5} ${p.y - 4}`}
                fill="none" stroke={a.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                opacity="0"
              />
            </g>
          );
        })}

        {/* agent labels — placed clear of the arc label */}
        <text ref={(el) => { labelRefs.current[0] = el; }} x={CX + 22} y={70} fontSize="6.5" fontFamily={MONO} fill={MUTED} letterSpacing="0.14em">DIARY</text>
        <text ref={(el) => { labelRefs.current[1] = el; }} x={CX + AGENT_DIST + 20} y={CY + 3} fontSize="6.5" fontFamily={MONO} fill={MUTED} letterSpacing="0.14em">MESSAGES</text>
        <text ref={(el) => { labelRefs.current[2] = el; }} x={CX} y={CY + AGENT_DIST + 31} textAnchor="middle" fontSize="6.5" fontFamily={MONO} fill={MUTED} letterSpacing="0.14em">DRAFTS</text>
        <text ref={(el) => { labelRefs.current[3] = el; }} x={CX - AGENT_DIST - 20} y={CY + 3} textAnchor="end" fontSize="6.5" fontFamily={MONO} fill={MUTED} letterSpacing="0.14em">APPROVALS</text>

        {/* the travelling pulse */}
        <circle ref={dotRef} r="3.25" fill={INK} opacity="0" />
      </svg>
    </div>
  );
}
