"use client";

import { useEffect, useRef } from "react";

/**
 * The orbit — the practice LMAS's answer to the campus loop.
 *
 * Where Campus Connect runs a circuit, the LMAS holds a formation: four
 * small, specialised agents stationed around a single core — the
 * practice's own documents. One by one, each agent sends a pulse down
 * its spoke; the core answers with an expanding ring; the pulse carries
 * the answer home, and the agent earns its tick, its spoke left drawn
 * in its colour. By the cycle's end the whole formation is grounded.
 * Around it all, a dashed boundary drifts slowly, endlessly — on your
 * infrastructure, nothing leaves.
 *
 * Ink, paper, hairlines and the station colours — the same flowing
 * treatment as the loop. Pauses off-screen; reduced motion shows the
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
const CY = 170;
const CORE_R = 40;
const AGENT_DIST = 108;
const AGENT_R = 19;
const SPOKE_IN = CORE_R + 6; // 46
const SPOKE_OUT = AGENT_DIST - AGENT_R - 2; // 87
const SPOKE_LEN = SPOKE_OUT - SPOKE_IN; // 41

const AGENTS = [
  { label: "DIARY", color: "#c93a17", ang: -90 },
  { label: "MESSAGES", color: "#2565aa", ang: 0 },
  { label: "DRAFTS", color: "#1b3656", ang: 90 },
  { label: "APPROVALS", color: "#0d5a40", ang: 180 },
];

const OUT_MS = 600;
const CORE_MS = 380;
const BACK_MS = 600;
const DWELL_MS = 700;
const AGENT_MS = OUT_MS + CORE_MS + BACK_MS + DWELL_MS;
const HOLD_MS = 1500;
const CYCLE_MS = AGENTS.length * AGENT_MS + HOLD_MS;
const TICK_LEN = 24;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const pos = (ang: number, dist: number) => ({
  x: CX + Math.cos((ang * Math.PI) / 180) * dist,
  y: CY + Math.sin((ang * Math.PI) / 180) * dist,
});

export default function PracticeOrbit() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boundaryRef = useRef<SVGCircleElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const ring1Ref = useRef<SVGCircleElement | null>(null);
  const ring2Ref = useRef<SVGCircleElement | null>(null);
  const agentRefs = useRef<(SVGCircleElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);
  const tickRefs = useRef<(SVGPathElement | null)[]>([]);
  const outRefs = useRef<(SVGLineElement | null)[]>([]);
  const backRefs = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setAgent = (i: number, lit: boolean) => {
      const a = AGENTS[i];
      const c = agentRefs.current[i];
      if (c) {
        c.setAttribute("stroke", lit ? a.color : HAIR);
        c.setAttribute("stroke-width", lit ? "2" : "1.25");
        c.setAttribute("fill", lit ? a.color : PAPER2);
        c.setAttribute("fill-opacity", lit ? "0.08" : "1");
      }
      labelRefs.current[i]?.setAttribute("fill", lit ? INK : MUTED);
    };
    const setTickDraw = (i: number, p: number) => {
      const el = tickRefs.current[i];
      if (el) {
        el.setAttribute("opacity", p > 0 ? "1" : "0");
        el.setAttribute("stroke-dashoffset", String(TICK_LEN * (1 - p)));
      }
    };
    const setLine = (el: SVGLineElement | null, drawn: number, opacity: number) => {
      if (el) {
        el.setAttribute("stroke-dashoffset", String(SPOKE_LEN * (1 - drawn)));
        el.setAttribute("opacity", String(opacity));
      }
    };

    if (reduced) {
      AGENTS.forEach((_, i) => {
        setAgent(i, true);
        setTickDraw(i, 1);
        setLine(outRefs.current[i], 1, 0.4);
      });
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

      // ambient: the boundary drifts, always
      boundaryRef.current?.setAttribute("stroke-dashoffset", String(-((now / 55) % 13.5)));

      const t = (now - start) % CYCLE_MS;

      if (t < lastT) {
        // new cycle — clear the formation
        AGENTS.forEach((_, i) => {
          setAgent(i, false);
          setTickDraw(i, 0);
          setLine(outRefs.current[i], 0, 1);
          setLine(backRefs.current[i], 0, 1);
        });
      }
      lastT = t;

      const dot = dotRef.current;
      const glow = glowRef.current;
      const r1 = ring1Ref.current;
      const r2 = ring2Ref.current;
      if (!dot || !glow || !r1 || !r2) return;

      const hide = (el: SVGCircleElement) => el.setAttribute("opacity", "0");

      if (t >= AGENTS.length * AGENT_MS) {
        // hold — the whole formation grounded
        hide(dot); hide(glow); hide(r1); hide(r2);
        return;
      }

      const i = Math.floor(t / AGENT_MS);
      const ph = t - i * AGENT_MS;
      const a = AGENTS[i];
      const inner = pos(a.ang, SPOKE_IN);
      const outer = pos(a.ang, SPOKE_OUT);

      setAgent(i, true);
      dot.setAttribute("fill", a.color);
      glow.setAttribute("fill", a.color);
      r1.setAttribute("stroke", a.color);
      r2.setAttribute("stroke", a.color);

      const moveHead = (x: number, y: number) => {
        dot.setAttribute("cx", String(x)); dot.setAttribute("cy", String(y)); dot.setAttribute("opacity", "1");
        glow.setAttribute("cx", String(x)); glow.setAttribute("cy", String(y)); glow.setAttribute("opacity", "0.16");
      };

      if (ph < OUT_MS) {
        // the question travels in: agent → core, trail drawing behind
        const p = ease(ph / OUT_MS);
        moveHead(outer.x + (inner.x - outer.x) * p, outer.y + (inner.y - outer.y) * p);
        setLine(outRefs.current[i], p, 1);
        hide(r1); hide(r2);
      } else if (ph < OUT_MS + CORE_MS) {
        // the core answers — expanding rings in the agent's colour
        const p = (ph - OUT_MS) / CORE_MS;
        hide(dot); hide(glow);
        setLine(outRefs.current[i], 1, 1 - 0.5 * p);
        r1.setAttribute("r", String(CORE_R + 5 + 17 * p));
        r1.setAttribute("opacity", String(0.55 * (1 - p)));
        const p2 = Math.max(0, (p - 0.3) / 0.7);
        r2.setAttribute("r", String(CORE_R + 4 + 13 * p2));
        r2.setAttribute("opacity", p2 > 0 ? String(0.35 * (1 - p2)) : "0");
      } else if (ph < OUT_MS + CORE_MS + BACK_MS) {
        // the answer carries home: core → agent
        const p = ease((ph - OUT_MS - CORE_MS) / BACK_MS);
        moveHead(inner.x + (outer.x - inner.x) * p, inner.y + (outer.y - inner.y) * p);
        setLine(backRefs.current[i], p, 1);
        hide(r1); hide(r2);
      } else {
        // grounded — the tick draws itself in
        const p = Math.min(1, (ph - OUT_MS - CORE_MS - BACK_MS) / 320);
        hide(dot); hide(glow); hide(r1); hide(r2);
        setLine(outRefs.current[i], 1, 0.4);
        setLine(backRefs.current[i], 1, 0.4);
        setTickDraw(i, ease(p));
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <svg
        viewBox="0 0 340 340"
        width="100%"
        role="img"
        aria-label="A formation of four specialised agents — diary, messages, drafts, approvals — each grounding its answers in the practice's own documents, inside a boundary marked on your infrastructure"
        style={{ display: "block" }}
      >
        <defs>
          <path id="pf-orbit-arc" d="M 32 170 A 138 138 0 0 1 308 170" fill="none" />
        </defs>

        {/* the sovereignty boundary — always drifting, never crossed */}
        <circle ref={boundaryRef} cx={CX} cy={CY} r="148" fill="none" stroke={BOUND} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 9.5" />
        <text fontSize="7" fontFamily={MONO} fill={BOUND} letterSpacing="0.3em">
          <textPath href="#pf-orbit-arc" startOffset="50%" textAnchor="middle">ON YOUR INFRASTRUCTURE</textPath>
        </text>

        {/* spokes — hairline beneath, colour trails drawn above */}
        {AGENTS.map((a, i) => {
          const inner = pos(a.ang, SPOKE_IN);
          const outer = pos(a.ang, SPOKE_OUT);
          return (
            <g key={a.label}>
              <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={HAIR} strokeWidth="1" />
              <line
                ref={(el) => { outRefs.current[i] = el; }}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={a.color} strokeWidth="2.25" strokeLinecap="round"
                strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN}
              />
              <line
                ref={(el) => { backRefs.current[i] = el; }}
                x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke={a.color} strokeWidth="2.25" strokeLinecap="round"
                strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN}
              />
            </g>
          );
        })}

        {/* the core — your documents */}
        <circle ref={ring1Ref} cx={CX} cy={CY} r={CORE_R + 5} fill="none" strokeWidth="1.75" opacity="0" />
        <circle ref={ring2Ref} cx={CX} cy={CY} r={CORE_R + 4} fill="none" strokeWidth="1.25" opacity="0" />
        <circle cx={CX} cy={CY} r={CORE_R + 5} fill="none" stroke={HAIR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={CORE_R} fill={PAPER2} stroke={HAIR} strokeWidth="1.25" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="12.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={INK}>Your</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="12.5" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={INK}>documents</text>

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
                d={`M ${p.x - 6} ${p.y} L ${p.x - 1.5} ${p.y + 5.5} L ${p.x + 7} ${p.y - 5}`}
                fill="none" stroke={a.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={TICK_LEN} strokeDashoffset={TICK_LEN} opacity="0"
              />
            </g>
          );
        })}

        {/* agent labels — clear of the arc and the spokes */}
        <text ref={(el) => { labelRefs.current[0] = el; }} x={CX + 26} y={68} fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">DIARY</text>
        <text ref={(el) => { labelRefs.current[1] = el; }} x={CX + AGENT_DIST} y={CY + AGENT_R + 16} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">MESSAGES</text>
        <text ref={(el) => { labelRefs.current[2] = el; }} x={CX} y={CY + AGENT_DIST + 34} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">DRAFTS</text>
        <text ref={(el) => { labelRefs.current[3] = el; }} x={CX - AGENT_DIST} y={CY + AGENT_R + 16} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">APPROVALS</text>

        {/* the travelling pulse — head and soft glow */}
        <circle ref={glowRef} r="7.5" opacity="0" />
        <circle ref={dotRef} r="3.75" opacity="0" />
      </svg>
    </div>
  );
}
