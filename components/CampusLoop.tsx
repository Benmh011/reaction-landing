"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Campus Connect loop — post · RSVP · check in · reflect.
 *
 * A glossy ring: a small dart (matching the page's captain darts) travels
 * the cycle, and each node lights as it arrives. The track is masked so it
 * never draws through the node discs or the centre caption. Nodes have a
 * radial-gradient sheen and a soft highlight, not flat fills. rAF-driven,
 * pauses off-screen, reduced-motion shows a still, evenly-lit ring.
 */

const NODES = [
  { label: "Post", color: "#c93a17", light: "#f0a184", dark: "#7c220d" },
  { label: "RSVP", color: "#2565aa", light: "#7fabda", dark: "#143560" },
  { label: "Check in", color: "#0d5a40", light: "#5aa88e", dark: "#073322" },
  { label: "Reflect", color: "#1b3656", light: "#6683a3", dark: "#0e1c2f" },
];
const R = 118;
const CX = 170;
const CY = 170;
const NODE_R = 33;

const nodeAngle = (i: number) => -Math.PI / 2 + (i / NODES.length) * Math.PI * 2;
const pointAt = (a: number, r = R) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;

export default function CampusLoop() {
  const dartRef = useRef<SVGGElement | null>(null);
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    let raf = 0;
    let running = true;
    const host = dartRef.current?.ownerSVGElement ?? null;

    // The hand ticks between the four nodes: a quick sweep, then a dwell.
    const DWELL = 1500; // ms parked on a node
    const SWEEP = 520; // ms to snap to the next
    const STEP = DWELL + SWEEP;
    const t0 = performance.now();
    // ease for a clock-like snap: fast off the mark, settling with a tiny overshoot
    const easeTick = (t: number) => {
      const c = 1.70158;
      const u = t - 1;
      return u * u * ((c + 1) * u + c) + 1; // easeOutBack
    };

    const tick = (now: number) => {
      if (!running) return;
      const elapsed = now - t0;
      const idx = Math.floor(elapsed / STEP) % NODES.length; // node we are leaving
      const local = elapsed % STEP;
      const to = (idx + 1) % NODES.length; // node we are heading to

      let ang: number;
      let lit: number; // which node is currently lit
      if (local < SWEEP) {
        // sweeping from idx -> to
        const p = easeTick(local / SWEEP);
        const a0 = nodeAngle(idx);
        let a1 = nodeAngle(to);
        // always advance clockwise (increasing angle)
        if (a1 <= a0) a1 += Math.PI * 2;
        ang = a0 + (a1 - a0) * p;
        lit = p > 0.6 ? to : idx;
      } else {
        // dwelling on `to`
        ang = nodeAngle(to);
        lit = to;
      }

      // point the hand outward along `ang` (hand pivots from the hub)
      const deg = (ang * 180) / Math.PI + 90;
      dartRef.current?.setAttribute("transform", `translate(${CX} ${CY}) rotate(${deg})`);

      for (let i = 0; i < NODES.length; i++) {
        const on = i === lit ? 1 : 0;
        const g = nodeRefs.current[i];
        if (g) {
          const disc = g.querySelector<SVGCircleElement>("[data-disc]");
          const txt = g.querySelector<SVGTextElement>("[data-txt]");
          const halo = g.querySelector<SVGCircleElement>("[data-halo]");
          // smooth the on/off a touch so it glows rather than blinks
          const cur = disc ? parseFloat(disc.getAttribute("opacity") || "0.35") : 0.35;
          const targetDisc = 0.35 + on * 0.65;
          const nextDisc = cur + (targetDisc - cur) * 0.25;
          if (disc) disc.setAttribute("opacity", String(nextDisc));
          if (halo) {
            const hc = parseFloat(halo.getAttribute("opacity") || "0");
            halo.setAttribute("opacity", String(hc + (on * 0.5 - hc) * 0.25));
          }
          if (txt) txt.setAttribute("fill", nextDisc > 0.72 ? "#f7f4ec" : NODES[i].color);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      (es) => {
        running = es[0]?.isIntersecting ?? false;
        if (running) raf = requestAnimationFrame(tick);
        else cancelAnimationFrame(raf);
      },
      { threshold: 0.1 },
    );
    if (host) io.observe(host);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <svg viewBox="0 0 340 340" width="100%" role="img" aria-label="The Campus Connect loop: post, RSVP, check in, reflect" style={{ display: "block", maxWidth: 380, margin: "0 auto" }}>
      <defs>
        {NODES.map((n, i) => (
          <radialGradient key={i} id={`cc-node-${i}`} cx="36%" cy="30%" r="80%">
            {/* soft-shaded sphere: lit crown -> body -> shadowed base */}
            <stop offset="0%" stopColor={n.light} />
            <stop offset="36%" stopColor={n.color} />
            <stop offset="100%" stopColor={n.dark} />
          </radialGradient>
        ))}
        {/* one large, very soft diffuse highlight, reused on every node */}
        <radialGradient id="cc-sheen" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="cc-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        {/* mask: the ring track is white (visible) everywhere EXCEPT black
            holes punched where the nodes and centre caption sit */}
        <mask id="cc-track-mask">
          <rect x="0" y="0" width="340" height="340" fill="white" />
          {NODES.map((_, i) => {
            const [x, y] = pointAt(nodeAngle(i));
            return <circle key={i} cx={x} cy={y} r={NODE_R + 5} fill="black" />;
          })}
          <rect x={CX - 34} y={CY + 14} width="68" height="34" rx="8" fill="black" />
        </mask>
      </defs>

      {/* ring track (masked so it never crosses nodes or the caption) */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#d8d1c0" strokeWidth="2.5" mask="url(#cc-track-mask)" />

      {/* faint direction chevrons on the open arcs */}
      {NODES.map((_, i) => {
        const a = nodeAngle(i) + Math.PI / NODES.length;
        const [ax, ay] = pointAt(a);
        const rot = (a * 180) / Math.PI + 90;
        return <path key={i} d="M -4 3.5 L 0 -3.5 L 4 3.5" fill="none" stroke="#c8c0ad" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${ax} ${ay}) rotate(${rot})`} />;
      })}

      {/* nodes: soft-shaded spheres — contact shadow, sphere gradient, gentle
          diffuse sheen (no hard glint, no outline) */}
      {NODES.map((n, i) => {
        const [x, y] = pointAt(nodeAngle(i));
        return (
          <g key={n.label} ref={(el) => { nodeRefs.current[i] = el; }}>
            {/* soft contact shadow beneath, offset down */}
            <ellipse cx={x} cy={y + NODE_R * 0.62} rx={NODE_R * 0.82} ry={NODE_R * 0.34} fill="#1a1713" opacity="0.16" filter="url(#cc-shadow)" />
            {/* activity halo (brightens as the dart passes) */}
            <circle data-halo cx={x} cy={y} r={NODE_R + 9} fill={n.color} opacity={0} filter="url(#cc-shadow)" />
            {/* the sphere */}
            <circle data-disc cx={x} cy={y} r={NODE_R} fill={`url(#cc-node-${i})`} opacity={reduced ? 1 : 0.35} />
            {/* broad soft diffuse light in the upper-left — a lit surface, not a glint */}
            <circle cx={x - NODE_R * 0.28} cy={y - NODE_R * 0.34} r={NODE_R * 0.72} fill="url(#cc-sheen)" pointerEvents="none" />
            <text data-txt x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight={600} fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill={reduced ? "#f7f4ec" : n.color} style={{ letterSpacing: "0.01em" }}>
              {n.label}
            </text>
          </g>
        );
      })}

      {/* the clock hand — pivots from the hub, ticks node to node */}
      <g ref={dartRef} transform={`translate(${CX} ${CY}) rotate(0)`} style={reduced ? { display: "none" } : undefined}>
        {/* tail counterweight */}
        <line x1="0" y1="0" x2="0" y2="18" stroke="#1a1713" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        {/* main pointer, tapering to a point just short of the node ring */}
        <path d={`M -3.4 0 L 0 -${R - NODE_R - 6} L 3.4 0 Z`} fill="#1a1713" />
        {/* vermilion tip accent */}
        <path d={`M -2 -${R - NODE_R - 20} L 0 -${R - NODE_R - 6} L 2 -${R - NODE_R - 20} Z`} fill="#c93a17" />
      </g>
      {/* hub cap the hand pivots on */}
      <circle cx={CX} cy={CY} r="6.5" fill="#1a1713" />
      <circle cx={CX} cy={CY} r="2.6" fill="#f7f4ec" />

      {/* centre caption (sits in the masked-out hole) */}
      <text x={CX} y={CY + 26} textAnchor="middle" fontSize="9.5" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill="#7a7266" style={{ letterSpacing: "0.18em" }}>THE</text>
      <text x={CX} y={CY + 40} textAnchor="middle" fontSize="14" fontStyle="italic" fontFamily="'Newsreader', Georgia, serif" fill="#4c463c">loop</text>
    </svg>
  );
}
