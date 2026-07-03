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
  { label: "Post", color: "#c93a17", light: "#e8896c" },
  { label: "RSVP", color: "#2565aa", light: "#6f9fd4" },
  { label: "Check in", color: "#0d5a40", light: "#4f9c82" },
  { label: "Reflect", color: "#1b3656", light: "#5a7699" },
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
    const t0 = performance.now();
    const PERIOD = 9000;

    const tick = (now: number) => {
      if (!running) return;
      const phase = (((now - t0) % PERIOD) / PERIOD) * Math.PI * 2 - Math.PI / 2;
      const [tx, ty] = pointAt(phase);
      // dart points along the direction of travel (tangent, clockwise)
      const deg = (phase * 180) / Math.PI + 90;
      dartRef.current?.setAttribute("transform", `translate(${tx} ${ty}) rotate(${deg})`);

      for (let i = 0; i < NODES.length; i++) {
        const a = nodeAngle(i);
        const da = Math.abs(((phase - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const near = Math.max(0, 1 - da / 0.7);
        const g = nodeRefs.current[i];
        if (g) {
          const disc = g.querySelector<SVGCircleElement>("[data-disc]");
          const txt = g.querySelector<SVGTextElement>("[data-txt]");
          const halo = g.querySelector<SVGCircleElement>("[data-halo]");
          if (disc) disc.setAttribute("opacity", String(0.35 + near * 0.65));
          if (halo) halo.setAttribute("opacity", String(near * 0.5));
          if (txt) txt.setAttribute("fill", near > 0.55 ? "#f7f4ec" : NODES[i].color);
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
          <radialGradient key={i} id={`cc-node-${i}`} cx="38%" cy="32%" r="72%">
            <stop offset="0%" stopColor={n.light} />
            <stop offset="55%" stopColor={n.color} />
            <stop offset="100%" stopColor={n.color} />
          </radialGradient>
        ))}
        {/* mask: the ring track is white (visible) everywhere EXCEPT black
            holes punched where the nodes and centre caption sit */}
        <mask id="cc-track-mask">
          <rect x="0" y="0" width="340" height="340" fill="white" />
          {NODES.map((_, i) => {
            const [x, y] = pointAt(nodeAngle(i));
            return <circle key={i} cx={x} cy={y} r={NODE_R + 5} fill="black" />;
          })}
          <rect x={CX - 34} y={CY - 20} width="68" height="40" rx="8" fill="black" />
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

      {/* nodes: glossy disc + top highlight + activity halo */}
      {NODES.map((n, i) => {
        const [x, y] = pointAt(nodeAngle(i));
        return (
          <g key={n.label} ref={(el) => { nodeRefs.current[i] = el; }}>
            <circle data-halo cx={x} cy={y} r={NODE_R + 9} fill={n.color} opacity={0} />
            <circle data-disc cx={x} cy={y} r={NODE_R} fill={`url(#cc-node-${i})`} opacity={reduced ? 1 : 0.35} />
            {/* glass highlight */}
            <ellipse cx={x - 8} cy={y - 11} rx="14" ry="8" fill="#ffffff" opacity="0.28" />
            <circle cx={x} cy={y} r={NODE_R} fill="none" stroke={n.color} strokeWidth="1.5" strokeOpacity="0.4" />
            <text data-txt x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight={600} fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill={reduced ? "#f7f4ec" : n.color} style={{ letterSpacing: "0.01em" }}>
              {n.label}
            </text>
          </g>
        );
      })}

      {/* the travelling dart (matches the page's captain darts) */}
      <g ref={dartRef} transform={`translate(${CX} ${CY - R}) rotate(0)`} style={reduced ? { display: "none" } : undefined}>
        <path d="M 0 -9 L 7 8 L 0 3 L -7 8 Z" fill="#c93a17" />
      </g>

      {/* centre caption (sits in the masked-out hole) */}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="9.5" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill="#7a7266" style={{ letterSpacing: "0.18em" }}>THE</text>
      <text x={CX} y={CY + 12} textAnchor="middle" fontSize="14" fontStyle="italic" fontFamily="'Newsreader', Georgia, serif" fill="#4c463c">loop</text>
    </svg>
  );
}
