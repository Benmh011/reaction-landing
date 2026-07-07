"use client";

import { useEffect, useRef } from "react";

/**
 * The flight deck — the reforming formation in perspective.
 *
 * The orbit tilts into a plane: an instrument deck drawn on paper. At its
 * centre, a standing stack of the practice's documents on a chronograph
 * seat whose tick-ring turns slowly, endlessly. Around it, a formation of
 * specialised agents seated on the deck — nearer stations larger and
 * darker, farther ones lighter, spokes vanishing behind the standing
 * pages. Station by station a comet runs the spoke; the chronograph
 * answers with a swept colour arc and the page's rules flash the same
 * colour — the answer read off the document — the comet carries it home,
 * a colour ring closes around the seat and its tick is engraved into the
 * deck. Held, lit, and then the formation reforms: rings sink to points,
 * glide across the deck into a new arrangement — four for a clinic, six
 * for a firm, five for a trade — and ground themselves again. The core
 * never changes. The formation always does.
 *
 * A dotted boundary drifts around the deck's edge — on your
 * infrastructure, nothing leaves. Pauses off-screen; reduced motion
 * shows the clinic formation fully grounded.
 */

const INK = "#1a1713";
const TICKS = "#c6bda6";
const MUTED = "#8a8175";
const PAPER2 = "#fdfbf5";
const BOUND = "#0d5a40";
const CAPTAINS = ["#c93a17", "#2565aa", "#1b3656", "#0d5a40"];

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const W = 340, H = 320;
const CXp = 170, CYp = 172;
const TILT = 0.42;
const R_BOUND = 148;
const R_AGENT = 106;
const R_GRAT = [66, 86];
const AGENT_R = 15;
const SPOKE_IN = 60, SPOKE_OUT = 89;
const SPOKE_LEN = SPOKE_OUT - SPOKE_IN;
const MAX_SLOTS = 6;

const FORMATIONS = [
  { caption: "A FORMATION FOR A CLINIC", stations: ["DIARY", "RECORDS", "MESSAGES", "APPROVALS"] },
  { caption: "A FORMATION FOR A FIRM", stations: ["RECORDS", "REGULATIONS", "DRAFTS", "DAY BOARD", "EXPORTS", "MESSAGES"] },
  { caption: "A FORMATION FOR A TRADE", stations: ["JOBS", "QUOTES", "SCHEDULE", "INVOICES", "MESSAGES"] },
];

const OUT_MS = 550, CORE_MS = 380, BACK_MS = 550, DWELL_MS = 650;
const AGENT_MS = OUT_MS + CORE_MS + BACK_MS + DWELL_MS;
const HOLD_MS = 1200;
const RETRACT_MS = 320, GLIDE_MS = 400, REGROW_MS = 280;
const MORPH_MS = RETRACT_MS + GLIDE_MS + REGROW_MS;
const SEG = FORMATIONS.map((f) => f.stations.length * AGENT_MS + HOLD_MS + MORPH_MS);
const CYCLE_MS = SEG.reduce((a, b) => a + b, 0);

const TICK_LEN = 22;
const RING_C = 2 * Math.PI * AGENT_R;
const SWEEP_R = 52, SWEEP_C = 2 * Math.PI * SWEEP_R;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const rad = (d: number) => (d * Math.PI) / 180;
const angleOf = (f: number, j: number) => -90 + (j * 360) / FORMATIONS[f].stations.length;
const P = (ang: number, r: number) => ({
  x: CXp + Math.cos(rad(ang)) * r,
  y: CYp + Math.sin(rad(ang)) * r * TILT,
  depth: Math.sin(rad(ang)),
});
const scaleAt = (d: number) => 0.8 + 0.25 * ((d + 1) / 2);
const fadeAt = (d: number) => 0.55 + 0.45 * ((d + 1) / 2);

export default function PracticeOrbit() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boundaryRef = useRef<SVGEllipseElement | null>(null);
  const chronoRef = useRef<SVGGElement | null>(null);
  const sweepRef = useRef<SVGCircleElement | null>(null);
  const flashRef = useRef<SVGCircleElement | null>(null);
  const rulesRef = useRef<SVGGElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const captionRef = useRef<SVGTextElement | null>(null);

  const posRefs = useRef<(SVGGElement | null)[]>([]);      // translate
  const squashRefs = useRef<(SVGGElement | null)[]>([]);   // scale(s*k, s*TILT*k)
  const baseRefs = useRef<(SVGCircleElement | null)[]>([]);
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]); // colour arc
  const tickRefs = useRef<(SVGPathElement | null)[]>([]);
  const hairRefs = useRef<(SVGLineElement | null)[]>([]);
  const groundRefs = useRef<(SVGLineElement | null)[]>([]);
  const outRefs = useRef<(SVGLineElement | null)[]>([]);
  const backRefs = useRef<(SVGLineElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);
  const gradOutRefs = useRef<(SVGLinearGradientElement | null)[]>([]);
  const gradBackRefs = useRef<(SVGLinearGradientElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setAttrs = (el: Element | null, attrs: Record<string, string | number>) => {
      if (!el) return;
      for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    };

    const slotGeom = (f: number, j: number) => {
      const ang = angleOf(f, j);
      const p = P(ang, R_AGENT);
      const inner = P(ang, SPOKE_IN);
      const outer = P(ang, SPOKE_OUT);
      const s = scaleAt(p.depth);
      const tone = fadeAt(p.depth);
      const r = AGENT_R * s;
      const cos = Math.cos(rad(ang));
      const label = Math.abs(cos) <= 0.55
        ? { x: p.x + r + 8, y: p.y + 2.5, anchor: "start" }
        : { x: p.x, y: p.y + r * TILT + 14, anchor: "middle" };
      return { ang, p, inner, outer, s, tone, r, label };
    };

    const place = (j: number, x: number, y: number, s: number, k: number) => {
      setAttrs(posRefs.current[j], { transform: `translate(${x} ${y})` });
      setAttrs(squashRefs.current[j], { transform: `scale(${s * k} ${s * TILT * k})` });
    };

    const applyGeom = (f: number) => {
      const n = FORMATIONS[f].stations.length;
      for (let j = 0; j < n; j++) {
        const g = slotGeom(f, j);
        place(j, g.p.x, g.p.y, g.s, 1);
        setAttrs(hairRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y, "stroke-opacity": 0.55 * g.tone });
        setAttrs(groundRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(outRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(backRefs.current[j], { x1: g.inner.x, y1: g.inner.y, x2: g.outer.x, y2: g.outer.y });
        setAttrs(gradOutRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(gradBackRefs.current[j], { x1: g.inner.x, y1: g.inner.y, x2: g.outer.x, y2: g.outer.y });
        setAttrs(baseRefs.current[j], { "stroke-opacity": 0.3 * g.tone });
        const lb = labelRefs.current[j];
        if (lb) {
          lb.setAttribute("x", String(g.label.x));
          lb.setAttribute("y", String(g.label.y));
          lb.setAttribute("text-anchor", g.label.anchor);
          lb.textContent = FORMATIONS[f].stations[j];
        }
      }
    };

    const lineState = (el: SVGLineElement | null, drawn: number, opacity: number) =>
      setAttrs(el, { "stroke-dashoffset": SPOKE_LEN * (1 - drawn), opacity });
    const ringState = (j: number, p: number, opacity: number) =>
      setAttrs(ringRefs.current[j], { "stroke-dashoffset": RING_C * (1 - p), opacity });
    const tickState = (j: number, p: number) =>
      setAttrs(tickRefs.current[j], { "stroke-dashoffset": TICK_LEN * (1 - p), opacity: p > 0 ? 1 : 0 });
    const labelState = (j: number, lit: boolean, opacity: number, tone = 1) => {
      const el = labelRefs.current[j];
      if (el) { el.setAttribute("fill", lit ? INK : MUTED); el.setAttribute("opacity", String(opacity * tone)); }
    };
    const slotVisible = (j: number, on: boolean) =>
      setAttrs(posRefs.current[j], { opacity: on ? 1 : 0 });
    const hairState = (j: number, opacity: number) =>
      setAttrs(hairRefs.current[j], { opacity });

    const hideSlot = (j: number) => {
      slotVisible(j, false); hairState(j, 0);
      lineState(outRefs.current[j], 0, 0); lineState(backRefs.current[j], 0, 0);
      setAttrs(groundRefs.current[j], { opacity: 0 });
      ringState(j, 0, 0); tickState(j, 0); labelState(j, false, 0);
    };
    const idleSlot = (j: number, f: number) => {
      const g = slotGeom(f, j);
      slotVisible(j, true); place(j, g.p.x, g.p.y, g.s, 1); hairState(j, 1);
      lineState(outRefs.current[j], 0, 1); lineState(backRefs.current[j], 0, 1);
      setAttrs(groundRefs.current[j], { opacity: 0 });
      ringState(j, 0, 0); tickState(j, 0); labelState(j, false, 1, g.tone);
    };
    const groundedSlot = (j: number, f: number) => {
      const g = slotGeom(f, j);
      slotVisible(j, true); place(j, g.p.x, g.p.y, g.s, 1); hairState(j, 1);
      lineState(outRefs.current[j], 1, 0); lineState(backRefs.current[j], 1, 0);
      setAttrs(groundRefs.current[j], { opacity: 0.5 * g.tone });
      ringState(j, 1, 0.95 * g.tone); tickState(j, 1); labelState(j, true, 1, g.tone);
    };

    if (reduced) {
      applyGeom(0);
      const n = FORMATIONS[0].stations.length;
      for (let j = 0; j < MAX_SLOTS; j++) (j < n ? groundedSlot(j, 0) : hideSlot(j));
      if (captionRef.current) captionRef.current.textContent = FORMATIONS[0].caption;
      return;
    }

    let raf = 0;
    let running = true;
    let lastT = -1;
    let appliedFor = 0;
    const start = performance.now();

    applyGeom(0);

    const io = new IntersectionObserver((es) => {
      running = es[0]?.isIntersecting ?? false;
    }, { threshold: 0.15 });
    if (hostRef.current) io.observe(hostRef.current);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!running) return;

      // ambient — the chronograph turns on the plane, the boundary drifts
      chronoRef.current?.setAttribute("transform", `rotate(${((now / 1000) * (360 / 80)) % 360})`);
      boundaryRef.current?.setAttribute("stroke-dashoffset", String(-((now / 70) % 8.9)));

      const t = (now - start) % CYCLE_MS;
      if (t < lastT) {
        applyGeom(0);
        appliedFor = 0;
        if (captionRef.current) { captionRef.current.textContent = FORMATIONS[0].caption; captionRef.current.setAttribute("opacity", "0.7"); }
      }
      lastT = t;

      let f = 0, u = t;
      while (u >= SEG[f]) { u -= SEG[f]; f++; }
      const n = FORMATIONS[f].stations.length;
      const nextF = (f + 1) % FORMATIONS.length;
      const nextN = FORMATIONS[nextF].stations.length;
      const groundDur = n * AGENT_MS;

      const dot = dotRef.current, glow = glowRef.current;
      const sweep = sweepRef.current, flash = flashRef.current, rules = rulesRef.current;
      if (!dot || !glow || !sweep || !flash || !rules) return;
      const hidePulse = () => {
        setAttrs(dot, { opacity: 0 }); setAttrs(glow, { opacity: 0 });
        setAttrs(sweep, { opacity: 0 }); setAttrs(flash, { opacity: 0 });
        rules.setAttribute("opacity", "0");
      };

      if (u < groundDur + HOLD_MS) {
        if (appliedFor !== f) { applyGeom(f); appliedFor = f; }
        const holding = u >= groundDur;
        const i = holding ? n : Math.floor(u / AGENT_MS);
        const ph = holding ? 0 : u - i * AGENT_MS;

        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= n) { hideSlot(j); continue; }
          if (j < i) { groundedSlot(j, f); continue; }
          if (j > i || holding) { idleSlot(j, f); continue; }
        }
        captionRef.current?.setAttribute("opacity", "0.7");
        if (holding) { hidePulse(); return; }

        const color = CAPTAINS[i % 4];
        const g = slotGeom(f, i);
        slotVisible(i, true); place(i, g.p.x, g.p.y, g.s, 1); hairState(i, 1);
        setAttrs(baseRefs.current[i], { "stroke-opacity": 0.3 * g.tone });
        labelState(i, true, 1, g.tone);
        dot.setAttribute("fill", color); glow.setAttribute("fill", color);
        sweep.setAttribute("stroke", color); flash.setAttribute("stroke", color);
        rules.querySelectorAll("line").forEach((l) => l.setAttribute("stroke", color));

        const moveHead = (x: number, y: number, s: number) => {
          setAttrs(dot, { cx: x, cy: y, r: 3.1 * s, opacity: 1 });
          setAttrs(glow, { cx: x, cy: y, r: 5.5 * s, opacity: 0.5 });
        };

        if (ph < OUT_MS) {
          const p = ease(ph / OUT_MS);
          const s = g.s;
          moveHead(g.outer.x + (g.inner.x - g.outer.x) * p, g.outer.y + (g.inner.y - g.outer.y) * p, s);
          lineState(outRefs.current[i], p, 1);
          lineState(backRefs.current[i], 0, 1);
          ringState(i, 0, 0); tickState(i, 0);
          setAttrs(groundRefs.current[i], { opacity: 0 });
          setAttrs(sweep, { opacity: 0 }); setAttrs(flash, { opacity: 0 }); rules.setAttribute("opacity", "0");
        } else if (ph < OUT_MS + CORE_MS) {
          const p = (ph - OUT_MS) / CORE_MS;
          setAttrs(dot, { opacity: 0 }); setAttrs(glow, { opacity: 0 });
          lineState(outRefs.current[i], 1, 1 - 0.6 * p);
          setAttrs(sweep, {
            transform: `rotate(${-90 + 360 * ease(p)})`,
            opacity: p < 0.7 ? 0.9 : 0.9 * (1 - (p - 0.7) / 0.3),
          });
          setAttrs(flash, { r: SWEEP_R + 9 * p, opacity: 0.26 * (1 - p) });
          rules.setAttribute("opacity", String(p < 0.6 ? 0.85 : 0.85 * (1 - (p - 0.6) / 0.4)));
        } else if (ph < OUT_MS + CORE_MS + BACK_MS) {
          const p = ease((ph - OUT_MS - CORE_MS) / BACK_MS);
          moveHead(g.inner.x + (g.outer.x - g.inner.x) * p, g.inner.y + (g.outer.y - g.inner.y) * p, g.s);
          lineState(backRefs.current[i], p, 1);
          setAttrs(sweep, { opacity: 0 }); setAttrs(flash, { opacity: 0 }); rules.setAttribute("opacity", "0");
        } else {
          const p = (ph - OUT_MS - CORE_MS - BACK_MS) / DWELL_MS;
          hidePulse();
          const fade = clamp01(p / 0.4);
          lineState(outRefs.current[i], 1, 1 - fade);
          lineState(backRefs.current[i], 1, 1 - fade);
          setAttrs(groundRefs.current[i], { opacity: 0.5 * g.tone * fade });
          ringState(i, ease(clamp01(p / 0.55)), 0.95 * g.tone);
          tickState(i, ease(clamp01((p - 0.35) / 0.5)));
        }
        return;
      }

      // ── morph ──
      hidePulse();
      const m = u - groundDur - HOLD_MS;

      if (m < RETRACT_MS) {
        const p = ease(m / RETRACT_MS);
        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= n) { hideSlot(j); continue; }
          const g = slotGeom(f, j);
          slotVisible(j, true);
          place(j, g.p.x, g.p.y, g.s, 1 - (1 - 5 / AGENT_R) * p);
          hairState(j, 1 - p);
          setAttrs(groundRefs.current[j], { opacity: 0.5 * g.tone * (1 - p) });
          ringState(j, 0, 0); tickState(j, 0);
          lineState(outRefs.current[j], 0, 0); lineState(backRefs.current[j], 0, 0);
          labelState(j, false, 1 - p, g.tone);
        }
        captionRef.current?.setAttribute("opacity", String(0.7 * (1 - p)));
      } else if (m < RETRACT_MS + GLIDE_MS) {
        const p = ease((m - RETRACT_MS) / GLIDE_MS);
        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= n && j >= nextN) { hideSlot(j); continue; }
          if (j >= nextN) {
            const g = slotGeom(f, j);
            slotVisible(j, true);
            place(j, g.p.x, g.p.y, g.s, (5 / AGENT_R) * (1 - p));
            continue;
          }
          if (j >= n) { hideSlot(j); continue; }
          const a0 = angleOf(f, j), a1 = angleOf(nextF, j);
          const d = ((a1 - a0 + 540) % 360) - 180;
          const a = a0 + d * p;
          const gp = P(a, R_AGENT);
          slotVisible(j, true);
          place(j, gp.x, gp.y, scaleAt(gp.depth), 5 / AGENT_R);
        }
        if (p >= 0.5 && captionRef.current && captionRef.current.textContent !== FORMATIONS[nextF].caption) {
          captionRef.current.textContent = FORMATIONS[nextF].caption;
        }
        captionRef.current?.setAttribute("opacity", "0");
      } else {
        const p = ease((m - RETRACT_MS - GLIDE_MS) / REGROW_MS);
        if (appliedFor !== nextF) { applyGeom(nextF); appliedFor = nextF; }
        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= nextN) { hideSlot(j); continue; }
          const g = slotGeom(nextF, j);
          const wasThere = j < n;
          slotVisible(j, true);
          const k = wasThere ? 5 / AGENT_R + (1 - 5 / AGENT_R) * p : p;
          place(j, g.p.x, g.p.y, g.s, k);
          hairState(j, p);
          lineState(outRefs.current[j], 0, 1); lineState(backRefs.current[j], 0, 1);
          ringState(j, 0, 0); tickState(j, 0);
          setAttrs(groundRefs.current[j], { opacity: 0 });
          labelState(j, false, p, g.tone);
        }
        captionRef.current?.setAttribute("opacity", String(0.7 * p));
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  const grat = R_GRAT.map((r) => (
    <ellipse key={r} cx={CXp} cy={CYp} rx={r} ry={r * TILT} fill="none" stroke={INK} strokeOpacity="0.14" strokeWidth="1" strokeDasharray="0.1 6.5" strokeLinecap="round" />
  ));

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H + 4}`}
        width="100%"
        role="img"
        aria-label="A reforming formation of specialised agents on a tilted deck — four for a clinic, six for a firm, five for a trade — each grounding its answers in the practice's own documents, inside a boundary marked on your infrastructure"
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id="pf-deck" cx="0.5" cy="0.42" r="0.62">
            <stop offset="0%" stopColor={INK} stopOpacity="0.045" />
            <stop offset="72%" stopColor={INK} stopOpacity="0.018" />
            <stop offset="100%" stopColor={INK} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pf-seat" cx="0.45" cy="0.4" r="0.8">
            <stop offset="0%" stopColor="#fffef9" /><stop offset="60%" stopColor="#fbf7ec" /><stop offset="100%" stopColor="#efe8d6" />
          </radialGradient>
          <filter id="pf-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.4" /></filter>
          <filter id="pf-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.6" /></filter>
          <filter id="pf-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.10 0 0 0 0 0.09 0 0 0 0 0.07 0 0 0 0.05 0" />
          </filter>
          {Array.from({ length: MAX_SLOTS }, (_, j) => {
            const c = CAPTAINS[j % 4];
            return (
              <g key={j}>
                <linearGradient ref={(el) => { gradOutRefs.current[j] = el; }} id={`pf-out-${j}`} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={c} stopOpacity="0" /><stop offset="55%" stopColor={c} stopOpacity="0.4" /><stop offset="100%" stopColor={c} stopOpacity="1" />
                </linearGradient>
                <linearGradient ref={(el) => { gradBackRefs.current[j] = el; }} id={`pf-back-${j}`} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={c} stopOpacity="0" /><stop offset="55%" stopColor={c} stopOpacity="0.4" /><stop offset="100%" stopColor={c} stopOpacity="1" />
                </linearGradient>
              </g>
            );
          })}
        </defs>

        {/* the deck */}
        <ellipse cx={CXp} cy={CYp} rx={R_BOUND} ry={R_BOUND * TILT} fill="url(#pf-deck)" />
        {grat}
        <ellipse ref={boundaryRef} cx={CXp} cy={CYp} rx={R_BOUND} ry={R_BOUND * TILT} fill="none" stroke={BOUND} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="0.1 8.8" strokeLinecap="round" />
        <path id="pf-barc" d={`M ${CXp - R_BOUND + 10} ${CYp} A ${R_BOUND - 10} ${(R_BOUND - 10) * TILT} 0 0 1 ${CXp + R_BOUND - 10} ${CYp}`} fill="none" />
        <text fontSize="7" fontFamily={MONO} fill={BOUND} letterSpacing="0.3em">
          <textPath href="#pf-barc" startOffset="50%" textAnchor="middle">ON YOUR INFRASTRUCTURE</textPath>
        </text>

        {/* spokes + trails (behind the standing stack) */}
        {Array.from({ length: MAX_SLOTS }, (_, j) => {
          const c = CAPTAINS[j % 4];
          return (
            <g key={j}>
              <line ref={(el) => { hairRefs.current[j] = el; }} stroke={INK} strokeWidth="1" opacity="0" strokeOpacity="0.35" />
              <line ref={(el) => { groundRefs.current[j] = el; }} stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0" />
              <line ref={(el) => { outRefs.current[j] = el; }} stroke={`url(#pf-out-${j})`} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN} opacity="0" />
              <line ref={(el) => { backRefs.current[j] = el; }} stroke={`url(#pf-back-${j})`} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN} opacity="0" />
            </g>
          );
        })}

        {/* the comet head (behind the stack, above the spokes) */}
        <circle ref={glowRef} r="5.5" opacity="0" filter="url(#pf-glow)" />
        <circle ref={dotRef} r="3.1" opacity="0" />

        {/* the stations — seated on the deck via nested squash */}
        {Array.from({ length: MAX_SLOTS }, (_, j) => {
          const c = CAPTAINS[j % 4];
          return (
            <g key={j} ref={(el) => { posRefs.current[j] = el; }} opacity="0">
              <g ref={(el) => { squashRefs.current[j] = el; }}>
                <circle ref={(el) => { baseRefs.current[j] = el; }} r={AGENT_R} fill="none" stroke={INK} strokeWidth="1.1" strokeOpacity="0.3" />
                <circle ref={(el) => { ringRefs.current[j] = el; }} r={AGENT_R} fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={RING_C} opacity="0" transform="rotate(-90)" />
                <path ref={(el) => { tickRefs.current[j] = el; }} d="M -5.5 0 L -1.5 5 L 6.5 -4.5" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={TICK_LEN} strokeDashoffset={TICK_LEN} opacity="0" />
              </g>
            </g>
          );
        })}

        {/* the core — chronograph seat + standing stack */}
        <ellipse cx={CXp} cy={CYp + 6} rx="47" ry="17" fill={INK} opacity="0.13" filter="url(#pf-soft)" />
        <g transform={`translate(${CXp} ${CYp}) scale(1 ${TILT})`}>
          <g ref={chronoRef}>
            {Array.from({ length: 48 }, (_, k) => {
              const a = rad(k * 7.5);
              const c1 = Math.cos(a), s1 = Math.sin(a);
              return <line key={k} x1={c1 * 50} y1={s1 * 50} x2={c1 * 54.5} y2={s1 * 54.5} stroke={TICKS} strokeWidth="0.8" />;
            })}
          </g>
          <circle ref={sweepRef} r={SWEEP_R} fill="none" strokeWidth="2.4" strokeDasharray={`${SWEEP_C * 0.3} ${SWEEP_C * 0.7}`} strokeLinecap="round" opacity="0" />
          <circle r="48" fill="none" stroke={INK} strokeWidth="1" strokeOpacity="0.6" />
          <circle ref={flashRef} r={SWEEP_R} fill="none" strokeWidth="1.25" opacity="0" />
          <circle r="44" fill="url(#pf-seat)" />
        </g>

        {/* the standing documents */}
        <g transform={`translate(${CXp - 8} ${CYp + 5}) rotate(-7)`}>
          <rect x="-13.5" y="-35" width="27" height="35" rx="1.5" fill={PAPER2} stroke={INK} strokeOpacity="0.3" strokeWidth="1" />
        </g>
        <g transform={`translate(${CXp + 6} ${CYp + 5}) rotate(5)`}>
          <rect x="-13.5" y="-35" width="27" height="35" rx="1.5" fill={PAPER2} stroke={INK} strokeOpacity="0.38" strokeWidth="1" />
        </g>
        <g transform={`translate(${CXp - 1} ${CYp + 5}) rotate(-1.5)`}>
          <rect x="-15" y="-40" width="30" height="40" rx="1.5" fill={PAPER2} stroke={INK} strokeOpacity="0.7" strokeWidth="1" />
          <line x1="-10" y1="-31" x2="6" y2="-31" stroke={INK} strokeWidth="1.4" strokeOpacity="0.75" strokeLinecap="round" />
          <line x1="-10" y1="-24" x2="10" y2="-24" stroke={INK} strokeWidth="0.9" strokeOpacity="0.45" strokeLinecap="round" />
          <line x1="-10" y1="-18" x2="10" y2="-18" stroke={INK} strokeWidth="0.9" strokeOpacity="0.45" strokeLinecap="round" />
          <line x1="-10" y1="-12" x2="4" y2="-12" stroke={INK} strokeWidth="0.9" strokeOpacity="0.45" strokeLinecap="round" />
          {/* the answer, read off the page */}
          <g ref={rulesRef} opacity="0">
            <line x1="-10" y1="-31" x2="6" y2="-31" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="-10" y1="-24" x2="10" y2="-24" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="-10" y1="-18" x2="10" y2="-18" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="-10" y1="-12" x2="4" y2="-12" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </g>
        <text x={CXp} y={CYp + 31} textAnchor="middle" fontSize="5.6" fontFamily={MONO} fill={INK} fillOpacity="0.55" letterSpacing="0.27em">YOUR DOCUMENTS</text>

        {/* station labels — billboarded above everything on the deck */}
        {Array.from({ length: MAX_SLOTS }, (_, j) => (
          <text key={j} ref={(el) => { labelRefs.current[j] = el; }} fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em" opacity="0" />
        ))}

        {/* the archetype caption */}
        <text ref={captionRef} x={CXp} y={H - 6} textAnchor="middle" fontSize="7.5" fontFamily={MONO} fill={INK} opacity="0.7" letterSpacing="0.24em">
          A FORMATION FOR A CLINIC
        </text>

        {/* paper grain */}
        <rect width={W} height={H + 4} filter="url(#pf-grain)" pointerEvents="none" />
      </svg>
    </div>
  );
}
