"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Campus Connect loop, drawn as a line.
 *
 * A vertical route with four typographic stations: Post, RSVP, Check in,
 * Reflect. Each station is an open metro-style ring on a hairline, with a
 * mono numeral, an italic serif name, and a one-line explanation. A small
 * fluid line of colour flows down the route station to station (dwell,
 * then slide), taking on each station's colour as it arrives — the old hue
 * trailing away along its length as the new one takes the head. At Reflect
 * it rides the thin return path up the left margin back to Post, gathering
 * itself at the top to begin again. "the loop" is set along the way home.
 *
 * No gradients, no gloss, no shadows. Ink, paper, hairlines, and the
 * captain colours — the same editorial language as the rest of the site.
 * Pauses off-screen; reduced motion shows all stations lit and no dart.
 *
 * Whenever the line arrives at a new station, the loop broadcasts
 * rx:campus-stage with the station index — the CampusPhone beside it
 * listens and turns its screen to match, the two instruments reading
 * from the same clock.
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

const TRAIL_N = 18; // points of history the flowing line carries

const hexToRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const lerpHex = (a: string, b: string, t: number) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function CampusLoop() {
  const dartRef = useRef<SVGGElement | null>(null);
  const segRefs = useRef<(SVGLineElement | null)[]>([]);
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
    const hist: { x: number; y: number; c: string }[] = [];

    // tell the phone which station the line has reached (fires on change only)
    let lastStage = -1;
    const announce = (s: number) => {
      if (s === lastStage) return;
      lastStage = s;
      window.dispatchEvent(new CustomEvent("rx:campus-stage", { detail: { stage: s } }));
    };

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
      let color = STATIONS[0].color;
      let active = 0;

      let placed = false;
      for (let i = 0; i < 4 && !placed; i++) {
        if (t < DWELL) {
          y = STATION_Y[i];
          color = STATIONS[i].color;
          active = i;
          placed = true;
          break;
        }
        t -= DWELL;
        if (i < 3) {
          if (t < SLIDE) {
            const p = easeInOut(t / SLIDE);
            y = STATION_Y[i] + (STATION_Y[i + 1] - STATION_Y[i]) * p;
            color = lerpHex(STATIONS[i].color, STATIONS[i + 1].color, p);
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
        x = pt.x;
        y = pt.y;
        color = lerpHex(STATIONS[3].color, STATIONS[0].color, p);
        active = p > 0.9 ? 0 : 3;
      }

      // the flowing line: a history of positions, each remembering its colour,
      // so a stage change travels visibly along the line's length
      hist.unshift({ x, y, c: color });
      if (hist.length > TRAIL_N) hist.pop();
      for (let k = 0; k < TRAIL_N - 1; k++) {
        const seg = segRefs.current[k];
        if (!seg) continue;
        const a = hist[k], b = hist[k + 1];
        if (!a || !b) { seg.setAttribute("opacity", "0"); continue; }
        seg.setAttribute("x1", String(a.x));
        seg.setAttribute("y1", String(a.y));
        seg.setAttribute("x2", String(b.x));
        seg.setAttribute("y2", String(b.y));
        seg.setAttribute("stroke", a.c);
        const f = 1 - k / (TRAIL_N - 1);
        seg.setAttribute("opacity", String(0.95 * f));
        seg.setAttribute("stroke-width", String(1.6 + 3.2 * f));
      }
      setStation(active);
      announce(active);
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

      {/* the flowing line: segments of remembered colour, tapering away */}
      <g ref={dartRef} style={reduced ? { display: "none" } : undefined}>
        {Array.from({ length: TRAIL_N - 1 }).map((_, k) => (
          <line key={k} ref={(el) => { segRefs.current[k] = el; }} strokeLinecap="round" opacity="0" />
        ))}
      </g>
    </svg>
  );
}
