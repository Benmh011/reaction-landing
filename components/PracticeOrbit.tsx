"use client";

import { useEffect, useRef } from "react";

/**
 * The orbit — the reforming formation.
 *
 * No two practices get the same LMAS, so the formation never settles.
 * Around a single core — the practice's own documents, drawn as a fanned
 * stack inside a slowly turning chronograph ring — a formation of
 * specialised agents grounds itself station by station: a comet down the
 * spoke, the core answering with a swept colour arc and a flash across
 * the page's rules, the answer carried home, a progress arc closing, a
 * tick drawing in. Then, held for a beat, the whole formation gracefully
 * reforms: spokes retract, stations shrink to points and glide around
 * the ring into a new arrangement — four stations for a clinic, six for
 * a firm, five for a trade — relabels, and grounds itself again.
 * The core never changes. The formation always does. That is the product.
 *
 * A dotted boundary drifts around everything, endlessly — on your
 * infrastructure, nothing leaves. Pauses off-screen; reduced motion
 * shows the clinic formation fully grounded.
 */

const INK = "#1a1713";
const HAIR = "#d8d1bf";
const TICKS = "#cbc3ae";
const MUTED = "#8a8175";
const PAPER2 = "#fdfbf5";
const BOUND = "#0d5a40";

const CAPTAINS = ["#c93a17", "#2565aa", "#1b3656", "#0d5a40"];

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Newsreader', Georgia, serif";

const CX = 170;
const CY = 170;
const AGENT_DIST = 104;
const AGENT_R = 17;
const SPOKE_IN = 54;
const SPOKE_OUT = AGENT_DIST - AGENT_R - 2; // 85
const SPOKE_LEN = SPOKE_OUT - SPOKE_IN; // 31
const MAX_SLOTS = 6;

const FORMATIONS = [
  { caption: "A FORMATION FOR A CLINIC", stations: ["DIARY", "RECORDS", "MESSAGES", "APPROVALS"] },
  { caption: "A FORMATION FOR A FIRM", stations: ["RECORDS", "REGULATIONS", "DRAFTS", "DAY BOARD", "EXPORTS", "MESSAGES"] },
  { caption: "A FORMATION FOR A TRADE", stations: ["JOBS", "QUOTES", "SCHEDULE", "INVOICES", "MESSAGES"] },
];

const OUT_MS = 550;
const CORE_MS = 380;
const BACK_MS = 550;
const DWELL_MS = 650;
const AGENT_MS = OUT_MS + CORE_MS + BACK_MS + DWELL_MS;
const HOLD_MS = 1200;
const RETRACT_MS = 320;
const GLIDE_MS = 400;
const REGROW_MS = 280;
const MORPH_MS = RETRACT_MS + GLIDE_MS + REGROW_MS;

const TICK_LEN = 22;
const ARC_C = 2 * Math.PI * AGENT_R;
const SWEEP_C = 2 * Math.PI * 44;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

const angleOf = (f: number, j: number) => -90 + (j * 360) / FORMATIONS[f].stations.length;
const pos = (ang: number, dist: number) => ({
  x: CX + Math.cos((ang * Math.PI) / 180) * dist,
  y: CY + Math.sin((ang * Math.PI) / 180) * dist,
});

// formation segment lengths and cycle total
const SEG = FORMATIONS.map((f) => f.stations.length * AGENT_MS + HOLD_MS + MORPH_MS);
const CYCLE_MS = SEG.reduce((a, b) => a + b, 0);

export default function PracticeOrbit() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boundaryRef = useRef<SVGCircleElement | null>(null);
  const chronoRef = useRef<SVGGElement | null>(null);
  const sweepRef = useRef<SVGCircleElement | null>(null);
  const flashRef = useRef<SVGCircleElement | null>(null);
  const rulesRef = useRef<SVGGElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const captionRef = useRef<SVGTextElement | null>(null);

  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const hairRefs = useRef<(SVGLineElement | null)[]>([]);
  const outRefs = useRef<(SVGLineElement | null)[]>([]);
  const backRefs = useRef<(SVGLineElement | null)[]>([]);
  const groundRefs = useRef<(SVGLineElement | null)[]>([]);
  const arcRefs = useRef<(SVGCircleElement | null)[]>([]);
  const tickRefs = useRef<(SVGPathElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);
  const gradOutRefs = useRef<(SVGLinearGradientElement | null)[]>([]);
  const gradBackRefs = useRef<(SVGLinearGradientElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setAttrs = (el: Element | null, attrs: Record<string, string | number>) => {
      if (!el) return;
      for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    };

    /** Point geometry and label placement for slot j in formation f. */
    const slotGeom = (f: number, j: number) => {
      const ang = angleOf(f, j);
      const p = pos(ang, AGENT_DIST);
      const inner = pos(ang, SPOKE_IN);
      const outer = pos(ang, SPOKE_OUT);
      const beside = Math.abs(Math.cos((ang * Math.PI) / 180)) <= 0.55;
      const label = beside
        ? { x: p.x + AGENT_R + 9, y: p.y + 2.5, anchor: "start" }
        : { x: p.x, y: p.y + AGENT_R + 14, anchor: "middle" };
      return { ang, p, inner, outer, label };
    };

    /** Lay every slot of formation f into place (positions, gradients, ticks, labels). */
    const applyGeom = (f: number) => {
      const n = FORMATIONS[f].stations.length;
      for (let j = 0; j < MAX_SLOTS; j++) {
        if (j >= n) continue;
        const g = slotGeom(f, j);
        setAttrs(ringRefs.current[j], { cx: g.p.x, cy: g.p.y });
        setAttrs(hairRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(groundRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(outRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(backRefs.current[j], { x1: g.inner.x, y1: g.inner.y, x2: g.outer.x, y2: g.outer.y });
        setAttrs(gradOutRefs.current[j], { x1: g.outer.x, y1: g.outer.y, x2: g.inner.x, y2: g.inner.y });
        setAttrs(gradBackRefs.current[j], { x1: g.inner.x, y1: g.inner.y, x2: g.outer.x, y2: g.outer.y });
        setAttrs(arcRefs.current[j], { cx: g.p.x, cy: g.p.y, transform: `rotate(-90 ${g.p.x} ${g.p.y})` });
        setAttrs(tickRefs.current[j], { d: `M ${g.p.x - 5.5} ${g.p.y} L ${g.p.x - 1.5} ${g.p.y + 5} L ${g.p.x + 6.5} ${g.p.y - 4.5}` });
        const lb = labelRefs.current[j];
        if (lb) {
          lb.setAttribute("x", String(g.label.x));
          lb.setAttribute("y", String(g.label.y));
          lb.setAttribute("text-anchor", g.label.anchor);
          lb.textContent = FORMATIONS[f].stations[j];
        }
      }
    };

    // slot visual states, applied idempotently
    const ringState = (j: number, r: number, opacity: number) =>
      setAttrs(ringRefs.current[j], { r, opacity });
    const hairState = (j: number, opacity: number) =>
      setAttrs(hairRefs.current[j], { opacity });
    const lineState = (el: SVGLineElement | null, drawn: number, opacity: number) =>
      setAttrs(el, { "stroke-dashoffset": SPOKE_LEN * (1 - drawn), opacity });
    const arcState = (j: number, p: number) =>
      setAttrs(arcRefs.current[j], { "stroke-dashoffset": ARC_C * (1 - p), opacity: p > 0 ? 1 : 0 });
    const tickState = (j: number, p: number) =>
      setAttrs(tickRefs.current[j], { "stroke-dashoffset": TICK_LEN * (1 - p), opacity: p > 0 ? 1 : 0 });
    const groundState = (j: number, opacity: number) =>
      setAttrs(groundRefs.current[j], { opacity });
    const labelState = (j: number, lit: boolean, opacity = 1) => {
      const el = labelRefs.current[j];
      if (el) { el.setAttribute("fill", lit ? INK : MUTED); el.setAttribute("opacity", String(opacity)); }
    };
    const hideSlot = (j: number) => {
      ringState(j, AGENT_R, 0); hairState(j, 0);
      lineState(outRefs.current[j], 0, 0); lineState(backRefs.current[j], 0, 0);
      arcState(j, 0); tickState(j, 0); groundState(j, 0); labelState(j, false, 0);
    };
    const idleSlot = (j: number) => {
      ringState(j, AGENT_R, 1); hairState(j, 1);
      lineState(outRefs.current[j], 0, 1); lineState(backRefs.current[j], 0, 1);
      arcState(j, 0); tickState(j, 0); groundState(j, 0); labelState(j, false, 1);
    };
    const groundedSlot = (j: number) => {
      ringState(j, AGENT_R, 1); hairState(j, 1);
      lineState(outRefs.current[j], 1, 0); lineState(backRefs.current[j], 1, 0);
      arcState(j, 1); tickState(j, 1); groundState(j, 0.45); labelState(j, true, 1);
    };

    if (reduced) {
      applyGeom(0);
      const n = FORMATIONS[0].stations.length;
      for (let j = 0; j < MAX_SLOTS; j++) (j < n ? groundedSlot : hideSlot)(j);
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

      // ambient — the chronograph turns, the boundary drifts, always
      chronoRef.current?.setAttribute("transform", `rotate(${((now / 1000) * (360 / 80)) % 360} ${CX} ${CY})`);
      boundaryRef.current?.setAttribute("stroke-dashoffset", String(-((now / 70) % 9.6)));

      const t = (now - start) % CYCLE_MS;
      if (t < lastT) {
        applyGeom(0);
        appliedFor = 0;
        if (captionRef.current) { captionRef.current.textContent = FORMATIONS[0].caption; captionRef.current.setAttribute("opacity", "0.7"); }
      }
      lastT = t;

      // locate the formation segment
      let f = 0;
      let u = t;
      while (u >= SEG[f]) { u -= SEG[f]; f++; }
      const n = FORMATIONS[f].stations.length;
      const nextF = (f + 1) % FORMATIONS.length;
      const nextN = FORMATIONS[nextF].stations.length;
      const groundDur = n * AGENT_MS;

      const dot = dotRef.current, glow = glowRef.current;
      const sweep = sweepRef.current, flash = flashRef.current, rules = rulesRef.current;
      if (!dot || !glow || !sweep || !flash || !rules) return;
      const hidePulse = () => {
        dot.setAttribute("opacity", "0"); glow.setAttribute("opacity", "0");
        sweep.setAttribute("opacity", "0"); flash.setAttribute("opacity", "0");
        rules.setAttribute("opacity", "0");
      };

      if (u < groundDur + HOLD_MS) {
        // ── grounding + hold ──
        if (appliedFor !== f) { applyGeom(f); appliedFor = f; }
        const holding = u >= groundDur;
        const i = holding ? n : Math.floor(u / AGENT_MS);
        const ph = holding ? 0 : u - i * AGENT_MS;

        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= n) { hideSlot(j); continue; }
          if (j < i) { groundedSlot(j); continue; }
          if (j > i || holding) { idleSlot(j); continue; }
        }
        if (captionRef.current) captionRef.current.setAttribute("opacity", "0.7");

        if (holding) { hidePulse(); return; }

        // the active slot's pulse
        const color = CAPTAINS[i % 4];
        const g = slotGeom(f, i);
        ringState(i, AGENT_R, 1); hairState(i, 1); labelState(i, true, 1);
        dot.setAttribute("fill", color); glow.setAttribute("fill", color);
        sweep.setAttribute("stroke", color); flash.setAttribute("stroke", color);
        rules.querySelectorAll("line").forEach((l) => l.setAttribute("stroke", color));

        const moveHead = (x: number, y: number) => {
          setAttrs(dot, { cx: x, cy: y, opacity: 1 });
          setAttrs(glow, { cx: x, cy: y, opacity: 0.55 });
        };

        if (ph < OUT_MS) {
          const p = ease(ph / OUT_MS);
          moveHead(g.outer.x + (g.inner.x - g.outer.x) * p, g.outer.y + (g.inner.y - g.outer.y) * p);
          lineState(outRefs.current[i], p, 1);
          setAttrs(sweep, { opacity: 0 }); setAttrs(flash, { opacity: 0 }); rules.setAttribute("opacity", "0");
          arcState(i, 0); tickState(i, 0); groundState(i, 0);
          lineState(backRefs.current[i], 0, 1);
        } else if (ph < OUT_MS + CORE_MS) {
          const p = (ph - OUT_MS) / CORE_MS;
          setAttrs(dot, { opacity: 0 }); setAttrs(glow, { opacity: 0 });
          lineState(outRefs.current[i], 1, 1 - 0.6 * p);
          setAttrs(sweep, {
            transform: `rotate(${-90 + 360 * ease(p)} ${CX} ${CY})`,
            opacity: p < 0.7 ? 0.9 : 0.9 * (1 - (p - 0.7) / 0.3),
          });
          setAttrs(flash, { r: 48 + 9 * p, opacity: 0.28 * (1 - p) });
          rules.setAttribute("opacity", String(p < 0.6 ? 0.85 : 0.85 * (1 - (p - 0.6) / 0.4)));
        } else if (ph < OUT_MS + CORE_MS + BACK_MS) {
          const p = ease((ph - OUT_MS - CORE_MS) / BACK_MS);
          moveHead(g.inner.x + (g.outer.x - g.inner.x) * p, g.inner.y + (g.outer.y - g.inner.y) * p);
          lineState(backRefs.current[i], p, 1);
          setAttrs(sweep, { opacity: 0 }); setAttrs(flash, { opacity: 0 }); rules.setAttribute("opacity", "0");
        } else {
          const p = (ph - OUT_MS - CORE_MS - BACK_MS) / DWELL_MS;
          hidePulse();
          const fade = clamp01(p / 0.4);
          lineState(outRefs.current[i], 1, 1 - fade);
          lineState(backRefs.current[i], 1, 1 - fade);
          groundState(i, 0.45 * fade);
          arcState(i, ease(clamp01(p / 0.55)));
          tickState(i, ease(clamp01((p - 0.35) / 0.5)));
        }
        return;
      }

      // ── morph: retract → glide → regrow ──
      hidePulse();
      const m = u - groundDur - HOLD_MS;

      if (m < RETRACT_MS) {
        const p = ease(m / RETRACT_MS);
        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= n) { hideSlot(j); continue; }
          ringState(j, AGENT_R - (AGENT_R - 5) * p, 1);
          hairState(j, 1 - p);
          groundState(j, 0.45 * (1 - p));
          arcState(j, 0); tickState(j, 0);
          lineState(outRefs.current[j], 0, 0); lineState(backRefs.current[j], 0, 0);
          labelState(j, false, 1 - p);
        }
        captionRef.current?.setAttribute("opacity", String(0.7 * (1 - p)));
      } else if (m < RETRACT_MS + GLIDE_MS) {
        const p = ease((m - RETRACT_MS) / GLIDE_MS);
        for (let j = 0; j < MAX_SLOTS; j++) {
          if (j >= n && j >= nextN) { hideSlot(j); continue; }
          if (j >= nextN) {
            // departing station — fades out where it stands
            const g = slotGeom(f, j);
            setAttrs(ringRefs.current[j], { cx: g.p.x, cy: g.p.y, r: 5 * (1 - p), opacity: 1 - p });
            continue;
          }
          if (j >= n) { hideSlot(j); continue; } // arrives at regrow
          // persisting station — glides around the ring
          const a0 = angleOf(f, j);
          const a1 = angleOf(nextF, j);
          const d = ((a1 - a0 + 540) % 360) - 180;
          const gp = pos(a0 + d * p, AGENT_DIST);
          setAttrs(ringRefs.current[j], { cx: gp.x, cy: gp.y, r: 5, opacity: 1 });
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
          const wasThere = j < n;
          ringState(j, wasThere ? 5 + (AGENT_R - 5) * p : AGENT_R * p, 1);
          hairState(j, p);
          lineState(outRefs.current[j], 0, 1); lineState(backRefs.current[j], 0, 1);
          arcState(j, 0); tickState(j, 0); groundState(j, 0);
          labelState(j, false, p);
        }
        captionRef.current?.setAttribute("opacity", String(0.7 * p));
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <svg
        viewBox="0 0 340 352"
        width="100%"
        role="img"
        aria-label="A reforming formation of specialised agents — four for a clinic, six for a firm, five for a trade — each grounding its answers in the practice's own documents, inside a boundary marked on your infrastructure"
        style={{ display: "block" }}
      >
        <defs>
          <path id="pf-orbit-arc" d="M 30 170 A 140 140 0 0 1 310 170" fill="none" />
          <filter id="pf-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="pf-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          {Array.from({ length: MAX_SLOTS }, (_, j) => {
            const c = CAPTAINS[j % 4];
            return (
              <g key={j}>
                <linearGradient ref={(el) => { gradOutRefs.current[j] = el; }} id={`pf-out-${j}`} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={c} stopOpacity="0" />
                  <stop offset="55%" stopColor={c} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={c} stopOpacity="1" />
                </linearGradient>
                <linearGradient ref={(el) => { gradBackRefs.current[j] = el; }} id={`pf-back-${j}`} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={c} stopOpacity="0" />
                  <stop offset="55%" stopColor={c} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={c} stopOpacity="1" />
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

        {/* the slots — spokes beneath, stations above */}
        {Array.from({ length: MAX_SLOTS }, (_, j) => {
          const c = CAPTAINS[j % 4];
          return (
            <g key={j}>
              <line ref={(el) => { hairRefs.current[j] = el; }} stroke={HAIR} strokeWidth="1" opacity="0" />
              <line ref={(el) => { groundRefs.current[j] = el; }} stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0" />
              <line ref={(el) => { outRefs.current[j] = el; }} stroke={`url(#pf-out-${j})`} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN} opacity="0" />
              <line ref={(el) => { backRefs.current[j] = el; }} stroke={`url(#pf-back-${j})`} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={SPOKE_LEN} strokeDashoffset={SPOKE_LEN} opacity="0" />
            </g>
          );
        })}

        {/* the core — an instrument around a drawn stack of documents */}
        <ellipse cx={CX} cy={CY + 47} rx="27" ry="5" fill={INK} opacity="0.08" filter="url(#pf-soft)" />
        <circle ref={flashRef} cx={CX} cy={CY} r="48" fill="none" strokeWidth="1.25" opacity="0" />
        <g ref={chronoRef}>
          {Array.from({ length: 48 }, (_, k) => {
            const ang = (k * 7.5 * Math.PI) / 180;
            const c = Math.cos(ang), s = Math.sin(ang);
            return (
              <line key={k} x1={CX + c * 45.5} y1={CY + s * 45.5} x2={CX + c * 48} y2={CY + s * 48} stroke={TICKS} strokeWidth="0.75" />
            );
          })}
        </g>
        <circle ref={sweepRef} cx={CX} cy={CY} r="44" fill="none" strokeWidth="2" strokeDasharray={`${SWEEP_C * 0.3} ${SWEEP_C * 0.7}`} strokeLinecap="round" opacity="0" />
        <circle cx={CX} cy={CY} r="44" fill="none" stroke={INK} strokeWidth="1" strokeOpacity="0.65" />

        {/* the stack — two sheets behind, one before, rules on the page */}
        <g transform={`translate(${CX} ${CY - 3})`}>
          <rect x="-15" y="-19" width="30" height="38" rx="2.5" fill={PAPER2} stroke={INK} strokeOpacity="0.4" strokeWidth="0.9" transform="rotate(-9)" />
          <rect x="-15" y="-19" width="30" height="38" rx="2.5" fill={PAPER2} stroke={INK} strokeOpacity="0.45" strokeWidth="0.9" transform="rotate(6)" />
          <rect x="-16" y="-20" width="32" height="40" rx="2.5" fill={PAPER2} stroke={INK} strokeOpacity="0.7" strokeWidth="1" />
          {/* the page's rules */}
          <line x1="-10" y1="-11" x2="7" y2="-11" stroke={INK} strokeWidth="1.4" strokeOpacity="0.75" strokeLinecap="round" />
          <line x1="-10" y1="-4" x2="10" y2="-4" stroke={INK} strokeWidth="0.9" strokeOpacity="0.45" strokeLinecap="round" />
          <line x1="-10" y1="2" x2="10" y2="2" stroke={INK} strokeWidth="0.9" strokeOpacity="0.45" strokeLinecap="round" />
          <line x1="-10" y1="8" x2="5" y2="8" stroke={INK} strokeWidth="0.9" strokeOpacity="0.45" strokeLinecap="round" />
          {/* the answer, read off the page */}
          <g ref={rulesRef} opacity="0">
            <line x1="-10" y1="-11" x2="7" y2="-11" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="-10" y1="-4" x2="10" y2="-4" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="-10" y1="2" x2="10" y2="2" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="-10" y1="8" x2="5" y2="8" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </g>
        <text x={CX} y={CY + 34} textAnchor="middle" fontSize="5.5" fontFamily={MONO} fill={INK} fillOpacity="0.55" letterSpacing="0.24em">YOUR DOCUMENTS</text>

        {/* the stations */}
        {Array.from({ length: MAX_SLOTS }, (_, j) => {
          const c = CAPTAINS[j % 4];
          return (
            <g key={j}>
              <circle ref={(el) => { ringRefs.current[j] = el; }} r={AGENT_R} fill="none" stroke={HAIR} strokeWidth="1" opacity="0" />
              <circle ref={(el) => { arcRefs.current[j] = el; }} r={AGENT_R} fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeDasharray={ARC_C} strokeDashoffset={ARC_C} opacity="0" />
              <path ref={(el) => { tickRefs.current[j] = el; }} fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={TICK_LEN} strokeDashoffset={TICK_LEN} opacity="0" />
              <text ref={(el) => { labelRefs.current[j] = el; }} fontSize="7" fontFamily={MONO} fill={MUTED} letterSpacing="0.16em" opacity="0" />
            </g>
          );
        })}

        {/* the archetype caption */}
        <text ref={captionRef} x={CX} y="344" textAnchor="middle" fontSize="7.5" fontFamily={MONO} fill={INK} opacity="0.7" letterSpacing="0.22em">
          A FORMATION FOR A CLINIC
        </text>

        {/* the comet head — glow beneath, bright dot above */}
        <circle ref={glowRef} r="5.5" opacity="0" filter="url(#pf-glow)" />
        <circle ref={dotRef} r="3.25" opacity="0" />
      </svg>
    </div>
  );
}
