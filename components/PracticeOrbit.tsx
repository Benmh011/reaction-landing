"use client";

import { useEffect, useRef } from "react";

/**
 * The orbit — the practice LMAS's answer to the campus loop.
 *
 * A formation of four specialised agents stationed around one core: the
 * practice's own documents. The core is drawn as an instrument — shaded
 * disc, ink ring, and a fine chronograph ring of tick-marks that never
 * stops turning. One by one each agent sends a comet down its spoke; the
 * core answers with a colour arc swept full circle; the comet carries the
 * answer home, a progress arc closes around the station, and its tick
 * draws in. By the cycle's end the whole formation is grounded. Around
 * everything, a dotted boundary drifts, endlessly — on your
 * infrastructure, nothing leaves.
 *
 * Pauses off-screen; reduced motion shows the formation fully grounded.
 */

const INK = "#1a1713";
const HAIR = "#d8d1bf";
const TICKS = "#cbc3ae";
const MUTED = "#8a8175";
const BOUND = "#0d5a40";

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Newsreader', Georgia, serif";

const CX = 170;
const CY = 170;
const AGENT_DIST = 112;
const AGENT_R = 19;
const SPOKE_IN = 54;
const SPOKE_OUT = AGENT_DIST - AGENT_R - 2; // 91
const SPOKE_LEN = SPOKE_OUT - SPOKE_IN; // 37

const AGENTS = [
  { label: "DIARY", color: "#c93a17", ang: -90 },
  { label: "MESSAGES", color: "#2565aa", ang: 0 },
  { label: "DRAFTS", color: "#1b3656", ang: 90 },
  { label: "APPROVALS", color: "#0d5a40", ang: 180 },
];

const OUT_MS = 600;
const CORE_MS = 420;
const BACK_MS = 600;
const DWELL_MS = 760;
const AGENT_MS = OUT_MS + CORE_MS + BACK_MS + DWELL_MS;
const HOLD_MS = 1500;
const CYCLE_MS = AGENTS.length * AGENT_MS + HOLD_MS;

const TICK_LEN = 24;
const ARC_C = 2 * Math.PI * AGENT_R; // station progress ring
const SWEEP_C = 2 * Math.PI * 44; // core sweep ring

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const pos = (ang: number, dist: number) => ({
  x: CX + Math.cos((ang * Math.PI) / 180) * dist,
  y: CY + Math.sin((ang * Math.PI) / 180) * dist,
});

export default function PracticeOrbit() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boundaryRef = useRef<SVGCircleElement | null>(null);
  const chronoRef = useRef<SVGGElement | null>(null);
  const sweepRef = useRef<SVGCircleElement | null>(null);
  const flashRef = useRef<SVGCircleElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const arcRefs = useRef<(SVGCircleElement | null)[]>([]);
  const tickRefs = useRef<(SVGPathElement | null)[]>([]);
  const outRefs = useRef<(SVGLineElement | null)[]>([]);
  const backRefs = useRef<(SVGLineElement | null)[]>([]);
  const groundRefs = useRef<(SVGLineElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setLabel = (i: number, lit: boolean) =>
      labelRefs.current[i]?.setAttribute("fill", lit ? INK : MUTED);
    const setArc = (i: number, p: number) => {
      const el = arcRefs.current[i];
      if (el) {
        el.setAttribute("opacity", p > 0 ? "1" : "0");
        el.setAttribute("stroke-dashoffset", String(ARC_C * (1 - p)));
      }
    };
    const setTick = (i: number, p: number) => {
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
    const setGround = (i: number, opacity: number) =>
      groundRefs.current[i]?.setAttribute("opacity", String(opacity));

    if (reduced) {
      AGENTS.forEach((_, i) => {
        setLabel(i, true); setArc(i, 1); setTick(i, 1); setGround(i, 0.5);
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

      // ambient — the chronograph turns, the boundary drifts, always
      chronoRef.current?.setAttribute("transform", `rotate(${((now / 1000) * (360 / 80)) % 360} ${CX} ${CY})`);
      boundaryRef.current?.setAttribute("stroke-dashoffset", String(-((now / 70) % 9.6)));

      const t = (now - start) % CYCLE_MS;

      if (t < lastT) {
        AGENTS.forEach((_, i) => {
          setLabel(i, false); setArc(i, 0); setTick(i, 0); setGround(i, 0);
          setLine(outRefs.current[i], 0, 1);
          setLine(backRefs.current[i], 0, 1);
        });
      }
      lastT = t;

      const dot = dotRef.current;
      const glow = glowRef.current;
      const sweep = sweepRef.current;
      const flash = flashRef.current;
      if (!dot || !glow || !sweep || !flash) return;

      const hide = (el: SVGElement) => el.setAttribute("opacity", "0");

      if (t >= AGENTS.length * AGENT_MS) {
        hide(dot); hide(glow); hide(sweep); hide(flash);
        return;
      }

      const i = Math.floor(t / AGENT_MS);
      const ph = t - i * AGENT_MS;
      const a = AGENTS[i];
      const inner = pos(a.ang, SPOKE_IN);
      const outer = pos(a.ang, SPOKE_OUT);

      setLabel(i, true);
      dot.setAttribute("fill", a.color);
      glow.setAttribute("fill", a.color);
      sweep.setAttribute("stroke", a.color);
      flash.setAttribute("stroke", a.color);

      const moveHead = (x: number, y: number) => {
        dot.setAttribute("cx", String(x)); dot.setAttribute("cy", String(y)); dot.setAttribute("opacity", "1");
        glow.setAttribute("cx", String(x)); glow.setAttribute("cy", String(y)); glow.setAttribute("opacity", "0.55");
      };

      if (ph < OUT_MS) {
        // the question — a comet in: agent → core
        const p = ease(ph / OUT_MS);
        moveHead(outer.x + (inner.x - outer.x) * p, outer.y + (inner.y - outer.y) * p);
        setLine(outRefs.current[i], p, 1);
        hide(sweep); hide(flash);
      } else if (ph < OUT_MS + CORE_MS) {
        // the core answers — a colour arc swept full circle
        const p = (ph - OUT_MS) / CORE_MS;
        hide(dot); hide(glow);
        setLine(outRefs.current[i], 1, 1 - 0.6 * p);
        sweep.setAttribute("transform", `rotate(${-90 + 360 * ease(p)} ${CX} ${CY})`);
        sweep.setAttribute("opacity", p < 0.7 ? "0.9" : String(0.9 * (1 - (p - 0.7) / 0.3)));
        flash.setAttribute("r", String(48 + 9 * p));
        flash.setAttribute("opacity", String(0.28 * (1 - p)));
      } else if (ph < OUT_MS + CORE_MS + BACK_MS) {
        // the answer — a comet home: core → agent
        const p = ease((ph - OUT_MS - CORE_MS) / BACK_MS);
        moveHead(inner.x + (outer.x - inner.x) * p, inner.y + (outer.y - inner.y) * p);
        setLine(backRefs.current[i], p, 1);
        hide(sweep); hide(flash);
      } else {
        // grounded — the station's arc closes, the tick draws in
        const p = (ph - OUT_MS - CORE_MS - BACK_MS) / DWELL_MS;
        hide(dot); hide(glow); hide(sweep); hide(flash);
        const fade = Math.min(1, p / 0.4);
        setLine(outRefs.current[i], 1, 1 - fade);
        setLine(backRefs.current[i], 1, 1 - fade);
        setGround(i, 0.5 * fade);
        setArc(i, ease(Math.min(1, p / 0.55)));
        setTick(i, ease(Math.max(0, Math.min(1, (p - 0.35) / 0.5))));
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
          <path id="pf-orbit-arc" d="M 30 170 A 140 140 0 0 1 310 170" fill="none" />
          <radialGradient id="pf-core-shade" cx="0.42" cy="0.36" r="0.85">
            <stop offset="0%" stopColor="#fffef9" />
            <stop offset="55%" stopColor="#fcf9f1" />
            <stop offset="100%" stopColor="#efe8d8" />
          </radialGradient>
          <filter id="pf-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="pf-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          {AGENTS.map((a, i) => {
            const inner = pos(a.ang, SPOKE_IN);
            const outer = pos(a.ang, SPOKE_OUT);
            return (
              <g key={a.label}>
                <linearGradient id={`pf-out-${i}`} gradientUnits="userSpaceOnUse" x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}>
                  <stop offset="0%" stopColor={a.color} stopOpacity="0" />
                  <stop offset="55%" stopColor={a.color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={a.color} stopOpacity="1" />
                </linearGradient>
                <linearGradient id={`pf-back-${i}`} gradientUnits="userSpaceOnUse" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}>
                  <stop offset="0%" stopColor={a.color} stopOpacity="0" />
                  <stop offset="55%" stopColor={a.color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={a.color} stopOpacity="1" />
                </linearGradient>
              </g>
            );
          })}
        </defs>

        {/* the sovereignty boundary — fine drifting dots, never crossed */}
        <circle ref={boundaryRef} cx={CX} cy={CY} r="150" fill="none" stroke={BOUND} strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="0.1 9.5" strokeLinecap="round" />
        <text fontSize="7" fontFamily={MONO} fill={BOUND} letterSpacing="0.3em">
          <textPath href="#pf-orbit-arc" startOffset="50%" textAnchor="middle">ON YOUR INFRASTRUCTURE</textPath>
        </text>

        {/* spokes — hairline beneath; comet trails; grounded lines */}
        {AGENTS.map((a, i) => {
          const inner = pos(a.ang, SPOKE_IN);
          const outer = pos(a.ang, SPOKE_OUT);
          return (
            <g key={a.label}>
              <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={HAIR} strokeWidth="1" />
              <line
                ref={(el) => { groundRefs.current[i] = el; }}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={a.color} strokeWidth="1.4" strokeLinecap="round" opacity="0"
              />
              <line
                ref={(el) => { outRefs.current[i] = el; }}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={`url(#pf-out-${i})`} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN}
              />
              <line
                ref={(el) => { backRefs.current[i] = el; }}
                x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke={`url(#pf-back-${i})`} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN}
              />
            </g>
          );
        })}

        {/* the core — an instrument: shadow, shaded disc, ink ring, chronograph */}
        <ellipse cx={CX} cy={CY + 47} rx="27" ry="5" fill={INK} opacity="0.08" filter="url(#pf-soft)" />
        <circle ref={flashRef} cx={CX} cy={CY} r="48" fill="none" strokeWidth="1.25" opacity="0" />
        <g ref={chronoRef}>
          {Array.from({ length: 48 }, (_, k) => {
            const ang = (k * 7.5 * Math.PI) / 180;
            const c = Math.cos(ang), s = Math.sin(ang);
            return (
              <line
                key={k}
                x1={CX + c * 45.5} y1={CY + s * 45.5}
                x2={CX + c * 48} y2={CY + s * 48}
                stroke={TICKS} strokeWidth="0.75"
              />
            );
          })}
        </g>
        <circle ref={sweepRef} cx={CX} cy={CY} r="44" fill="none" strokeWidth="2"
          strokeDasharray={`${SWEEP_C * 0.3} ${SWEEP_C * 0.7}`} strokeLinecap="round" opacity="0" />
        <circle cx={CX} cy={CY} r="44" fill="none" stroke={INK} strokeWidth="1" strokeOpacity="0.65" />
        <circle cx={CX} cy={CY} r="40" fill="url(#pf-core-shade)" />
        <circle cx={CX} cy={CY} r="34" fill="none" stroke={HAIR} strokeWidth="0.75" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="12" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={INK}>Your</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="12" fontStyle="italic" fontWeight="600" fontFamily={SERIF} fill={INK}>documents</text>

        {/* the stations — fine rings; a colour arc closes as each grounds */}
        {AGENTS.map((a, i) => {
          const p = pos(a.ang, AGENT_DIST);
          return (
            <g key={a.label}>
              <circle cx={p.x} cy={p.y} r={AGENT_R} fill="none" stroke={HAIR} strokeWidth="1" />
              <circle
                ref={(el) => { arcRefs.current[i] = el; }}
                cx={p.x} cy={p.y} r={AGENT_R}
                fill="none" stroke={a.color} strokeWidth="1.9" strokeLinecap="round"
                strokeDasharray={ARC_C} strokeDashoffset={ARC_C} opacity="0"
                transform={`rotate(-90 ${p.x} ${p.y})`}
              />
              <path
                ref={(el) => { tickRefs.current[i] = el; }}
                d={`M ${p.x - 6} ${p.y} L ${p.x - 1.5} ${p.y + 5.5} L ${p.x + 7} ${p.y - 5}`}
                fill="none" stroke={a.color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={TICK_LEN} strokeDashoffset={TICK_LEN} opacity="0"
              />
            </g>
          );
        })}

        {/* agent labels */}
        <text ref={(el) => { labelRefs.current[0] = el; }} x={CX + 27} y={62} fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">DIARY</text>
        <text ref={(el) => { labelRefs.current[1] = el; }} x={CX + AGENT_DIST} y={CY + AGENT_R + 17} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">MESSAGES</text>
        <text ref={(el) => { labelRefs.current[2] = el; }} x={CX} y={CY + AGENT_DIST + 35} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">DRAFTS</text>
        <text ref={(el) => { labelRefs.current[3] = el; }} x={CX - AGENT_DIST} y={CY + AGENT_R + 17} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em">APPROVALS</text>

        {/* the comet head — glow beneath, bright dot above */}
        <circle ref={glowRef} r="5.5" opacity="0" filter="url(#pf-glow)" />
        <circle ref={dotRef} r="3.25" opacity="0" />
      </svg>
    </div>
  );
}
