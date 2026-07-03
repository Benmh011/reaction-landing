"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Campus Connect loop — post · RSVP · check in · reflect.
 *
 * The product's engine, drawn as a ring: a bright token travels the cycle
 * endlessly, and each node lights as the token arrives, then dims as it
 * leaves. The mechanism, not a screenshot — the same editorial-diagram
 * language as the dial and the flock. Pure SVG + rAF; pauses off-screen;
 * reduced motion shows a still, evenly-lit ring.
 */

const NODES = [
  { label: "Post", color: "#c93a17" },
  { label: "RSVP", color: "#2565aa" },
  { label: "Check in", color: "#0d5a40" },
  { label: "Reflect", color: "#1b3656" },
];
const R = 118; // ring radius
const CX = 170;
const CY = 170;

// angle of node i (starting at top, clockwise)
const nodeAngle = (i: number) => -Math.PI / 2 + (i / NODES.length) * Math.PI * 2;
const pointAt = (a: number, r = R) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;

export default function CampusLoop() {
  const tokenRef = useRef<SVGCircleElement | null>(null);
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    let raf = 0;
    let running = true;
    const host = tokenRef.current?.ownerSVGElement ?? null;
    const t0 = performance.now();
    const PERIOD = 8000; // one full lap

    const tick = (now: number) => {
      if (!running) return;
      const phase = (((now - t0) % PERIOD) / PERIOD) * Math.PI * 2 - Math.PI / 2; // token angle
      const [tx, ty] = pointAt(phase);
      tokenRef.current?.setAttribute("cx", String(tx));
      tokenRef.current?.setAttribute("cy", String(ty));

      // each node's brightness = proximity of the token to that node
      for (let i = 0; i < NODES.length; i++) {
        const a = nodeAngle(i);
        let da = Math.abs(((phase - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const near = Math.max(0, 1 - da / 0.7); // 1 at node, fading over ~40°
        const g = nodeRefs.current[i];
        if (g) {
          const disc = g.querySelector<SVGCircleElement>("[data-disc]");
          const txt = g.querySelector<SVGTextElement>("[data-txt]");
          if (disc) {
            disc.setAttribute("fill-opacity", String(0.12 + near * 0.88));
            disc.setAttribute("r", String(30 + near * 5));
          }
          if (txt) txt.setAttribute("fill", near > 0.5 ? "#f7f4ec" : NODES[i].color);
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

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <svg viewBox="0 0 340 340" width="100%" role="img" aria-label="The Campus Connect loop: post, RSVP, check in, reflect" style={{ display: "block", maxWidth: 380, margin: "0 auto" }}>
      {/* ring track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2dccd" strokeWidth="2.5" />
      {/* faint directional arrows along the track */}
      {NODES.map((_, i) => {
        const a = nodeAngle(i) + Math.PI / NODES.length;
        const [ax, ay] = pointAt(a);
        const rot = (a * 180) / Math.PI + 90;
        return <path key={i} d="M -5 4 L 0 -4 L 5 4" fill="none" stroke="#c8c0ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${ax} ${ay}) rotate(${rot})`} />;
      })}
      {/* the travelling token */}
      <circle ref={tokenRef} cx={CX} cy={CY - R} r="8" fill="#c93a17" style={reduced ? { display: "none" } : undefined} />
      {/* nodes */}
      {NODES.map((n, i) => {
        const [x, y] = pointAt(nodeAngle(i));
        return (
          <g key={n.label} ref={(el) => { nodeRefs.current[i] = el; }}>
            <circle data-disc cx={x} cy={y} r={30} fill={n.color} fillOpacity={reduced ? 0.85 : 0.12} stroke={n.color} strokeWidth="2.5" />
            <text data-txt x={x} y={y + 4} textAnchor="middle" fontSize="12.5" fontWeight={600} fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill={reduced ? "#f7f4ec" : n.color} style={{ letterSpacing: "0.02em" }}>
              {n.label}
            </text>
          </g>
        );
      })}
      {/* centre caption */}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="10" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill="#7a7266" style={{ letterSpacing: "0.16em" }}>THE</text>
      <text x={CX} y={CY + 12} textAnchor="middle" fontSize="14" fontStyle="italic" fontFamily="'Newsreader', Georgia, serif" fill="#4c463c">loop</text>
    </svg>
  );
}
