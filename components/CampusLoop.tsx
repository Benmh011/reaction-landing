"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Campus Connect loop, drawn as a line.
 *
 * A vertical route with four typographic stations: Post, RSVP, Check in,
 * Reflect. Each station is an open metro-style ring on a hairline, with a
 * mono numeral, an italic serif name, and a one-line explanation. A small
 * flat vermilion dart ticks down the line station to station (dwell, then
 * slide), and when it reaches Reflect it rides a thin return path that curls
 * up the left margin back to Post — the line literally loops, with
 * "the loop" set vertically along the way home.
 *
 * No gradients, no gloss, no shadows. Ink, paper, hairlines, and the
 * captain colours — the same editorial language as the rest of the site.
 * Pauses off-screen; reduced motion shows all stations lit and no dart.
 */

const LINE_X = 92;
const STATION_Y = [60, 185, 310, 435];
const TEXT_X = 120;
const RETURN_D = "M 92 435 C 48 435 30 414 30 382 L 30 113 C 30 81 48 60 92 60";

const STATIONS = [
  { name: "Post", color: "#c93a17", desc: "An event goes up." },
  { name: "RSVP", color: "#2565aa", desc: "Students say I\u2019m in." },
  { name: "Check in", color: "#0d5a40", desc: "They turn up. It\u2019s recorded." },
  { name: "Reflect", color: "#1b3656", desc: "The moment is captured." },
];

const DWELL = 1600;
const SLIDE = 550;
const RETURN_T = 1400;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function CampusLoop() {
  const dartRef = useRef<SVGGElement | null>(null);
  const returnRef = useRef<SVGPathElement | null>(null);
  const stationRefs = useRef<(SVGGElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    let raf = 0;
    let running = true;
    const svg = dartRef.current?.ownerSVGElement ?? null;
    const returnPath = returnRef.current;
    const returnLen = returnPath?.getTotalLength() ?? 0;

    // one full cycle: 4 dwells + 3 slides + 1 return
    const CYCLE = 4 * DWELL + 3 * SLIDE + RETURN_T;
    const t0 = performance.now();

    const setStation = (active: number) => {
      for (let i = 0; i < STATIONS.length; i++) {
        const g = stationRefs.current[i];
        if (!g) continue;
        const on = i === active;
        const ring = g.querySelector<SVGCircleElement>("[data-ring]");
        const num = g.querySelector<SVGTextElement>("[data-num]");
        const name = g.querySelector<SVGTextElement>("[data-name]");
        const desc = g.querySelector<SVGTextElement>("[data-desc]");
        if (ring) ring.setAttribute("fill", on ? STATIONS[i].color : "#f7f4ec");
        if (ring) ring.setAttribute("stroke", on ? STATIONS[i].color : "#8d8574");
        if (num) num.setAttribute("fill", on ? STATIONS[i].color : "#9a9284");
        if (name) name.setAttribute("fill", on ? "#1a1713" : "#9a9284");
        if (desc) desc.setAttribute("opacity", on ? "1" : "0.55");
      }
    };

    const tick = (now: number) => {
      if (!running) return;
      let t = (now - t0) % CYCLE;
      let x = LINE_X;
      let y = STATION_Y[0];
      let ang = 180; // nose down while descending
      let active = 0;

      let placed = false;
      for (let i = 0; i < 4 && !placed; i++) {
        if (t < DWELL) {
          y = STATION_Y[i];
          active = i;
          placed = true;
          break;
        }
        t -= DWELL;
        if (i < 3) {
          if (t < SLIDE) {
            const p = easeInOut(t / SLIDE);
            y = STATION_Y[i] + (STATION_Y[i + 1] - STATION_Y[i]) * p;
            active = p > 0.6 ? i + 1 : i;
            placed = true;
            break;
          }
          t -= SLIDE;
        }
      }
      if (!placed) {
        // the return leg: Reflect back up to Post along the curl
        const p = easeInOut(Math.min(1, t / RETURN_T));
        const pt = returnPath!.getPointAtLength(returnLen * p);
        const ahead = returnPath!.getPointAtLength(Math.min(returnLen, returnLen * p + 2));
        x = pt.x;
        y = pt.y;
        ang = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI + 90;
        active = p > 0.9 ? 0 : 3;
      }

      dartRef.current?.setAttribute("transform", `translate(${x} ${y}) rotate(${ang})`);
      setStation(active);
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
    if (svg) io.observe(svg);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <svg
      viewBox="0 0 320 500"
      width="100%"
      role="img"
      aria-label="The Campus Connect loop: post, RSVP, check in, reflect, and back around"
      style={{ display: "block", maxWidth: 300, margin: "0 auto" }}
    >
      {/* main line */}
      <line x1={LINE_X} y1={STATION_Y[0]} x2={LINE_X} y2={STATION_Y[3]} stroke="#d8d1c0" strokeWidth="1.6" />
      {/* the way home: Reflect curls up the margin back to Post */}
      <path ref={returnRef} d={RETURN_D} fill="none" stroke="#d8d1c0" strokeWidth="1.6" />
      {/* arrowhead re-entering Post */}
      <path d={`M ${LINE_X - 13} 56 L ${LINE_X - 3} 60 L ${LINE_X - 13} 64`} fill="none" stroke="#9a9284" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* the loop, labelled along the return */}
      <text x="18" y="248" fontSize="9.5" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill="#9a9284" letterSpacing="0.22em" transform="rotate(-90 18 248)" textAnchor="middle">
        THE LOOP
      </text>

      {/* stations */}
      {STATIONS.map((s, i) => (
        <g key={s.name} ref={(el) => { stationRefs.current[i] = el; }}>
          <circle data-ring cx={LINE_X} cy={STATION_Y[i]} r="7" fill={reduced ? s.color : "#f7f4ec"} stroke={reduced ? s.color : "#8d8574"} strokeWidth="2" />
          <text data-num x={TEXT_X} y={STATION_Y[i] - 16} fontSize="10" fontFamily="'IBM Plex Mono', ui-monospace, monospace" fill={reduced ? s.color : "#9a9284"} letterSpacing="0.16em">
            {`0${i + 1}`}
          </text>
          <text data-name x={TEXT_X} y={STATION_Y[i] + 7} fontSize="21" fontStyle="italic" fontWeight="600" fontFamily="'Newsreader', Georgia, serif" fill={reduced ? "#1a1713" : "#9a9284"}>
            {s.name}
          </text>
          <text data-desc x={TEXT_X} y={STATION_Y[i] + 27} fontSize="11.5" fontFamily="ui-sans-serif, system-ui, sans-serif" fill="#4c463c" opacity={reduced ? 1 : 0.55}>
            {s.desc}
          </text>
        </g>
      ))}

      {/* the dart: flat fold, nose leading */}
      <g ref={dartRef} transform={`translate(${LINE_X} ${STATION_Y[0]}) rotate(180)`} style={reduced ? { display: "none" } : undefined}>
        <path d="M 0 -9 L 7 6 L 0 1.5 L -7 6 Z" fill="#c93a17" />
      </g>
    </svg>
  );
}
