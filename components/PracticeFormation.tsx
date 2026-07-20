"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The practice formation, drawn as a line.
 *
 * A vertical route with four typographic stations: Ask, Carry, Sign-off,
 * Focus. Each station is a glyph on a hairline — a person, a flight of
 * agents, a person inside a held ring, a person with an agent at their
 * shoulder — with a mono numeral, an italic serif name, and a one-line
 * explanation. A small fluid line of colour flows down the route station
 * to station (dwell, then slide), taking on each station's colour as it
 * arrives, the old hue trailing away along its length as the new one takes
 * the head. At Focus it rides the thin return path up the left margin
 * back to Ask. "IN FORMATION" is set along the way home.
 *
 * Deliberately the same instrument as CampusLoop: no gradients, no gloss,
 * no shadows, no dark panel. Ink, paper, hairlines and the captain colours.
 * Pure SVG throughout — there is no HTML overlay, so labels cannot drift
 * out of position the way the cradle's did.
 *
 * Pauses off-screen; reduced motion shows every station lit and no line.
 */

const LINE_X = 92;
const STATION_Y = [60, 185, 310, 435];
const TEXT_X = 128;
const RETURN_D = "M 92 435 C 48 435 30 414 30 382 L 30 113 C 30 81 48 60 92 60";

const VERM = "#c93a17";
const BLUE = "#2565aa";
const GREEN = "#0d5a40";
const BRASS = "#b08d4a";

const INK = "#1a1713";
const MUTED = "#9a9284";
const HAIR = "#8d8574";
const RULE = "#d8d1c0";
const PAPER = "#f7f4ec";

const STATIONS = [
  { name: "Ask", color: VERM, desc: "Work starts with a person." },
  { name: "Carry", color: BLUE, desc: "The formation takes the weight." },
  { name: "Sign-off", color: BRASS, desc: "Nothing sends itself." },
  { name: "Focus", color: GREEN, desc: "Dedicate your time to the big stuff." },
];

const DWELL = 1600;
const SLIDE = 550;
const RETURN_T = 1400;

const TRAIL_N = 18; // points of history the flowing line carries

const hexToRgb = (h: string) =>
  [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const lerpHex = (a: string, b: string, t: number) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** A person: head and shoulders, drawn in one weight. */
function Person({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <>
      <circle data-lit cx={cx} cy={cy - 7 * s} r={4.6 * s} fill="none" strokeWidth={2} />
      <path
        data-lit
        d={`M ${cx - 9 * s} ${cy + 9 * s} A ${9 * s} ${9 * s} 0 0 1 ${cx + 9 * s} ${cy + 9 * s}`}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  );
}

/**
 * An agent: the folded paper dart, nose along its heading.
 *
 * `tag` carries the dart's own captain colour, which it wears whenever its
 * station is lit; unlit it falls back to paper and hairline. The explicit
 * fill/stroke matter — without them a dart renders solid black under
 * reduced motion, where the animation loop never runs to colour it.
 */
function Dart({
  cx, cy, r = 0, s = 1, tag, lit,
}: { cx: number; cy: number; r?: number; s?: number; tag?: string; lit?: boolean }) {
  const d = `M ${cx + 7 * s} ${cy} L ${cx - 5 * s} ${cy - 4.6 * s} L ${cx - 2.4 * s} ${cy} L ${cx - 5 * s} ${cy + 4.6 * s} Z`;
  const col = tag ?? INK;
  return (
    <path
      data-dart={tag ?? "true"}
      d={d}
      transform={r ? `rotate(${r} ${cx} ${cy})` : undefined}
      fill={lit ? col : PAPER}
      stroke={lit ? col : HAIR}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  );
}

export default function PracticeFormation() {
  const flowRef = useRef<SVGGElement | null>(null);
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
    const svg = flowRef.current?.ownerSVGElement ?? null;
    const returnPath = returnRef.current;
    const returnLen = returnPath?.getTotalLength() ?? 0;

    // one full cycle: 4 dwells + 3 slides + 1 return
    const CYCLE = 4 * DWELL + 3 * SLIDE + RETURN_T;
    const t0 = performance.now();
    const hist: { x: number; y: number; c: string }[] = [];

    const setStation = (active: number) => {
      for (let i = 0; i < STATIONS.length; i++) {
        const g = stationRefs.current[i];
        if (!g) continue;
        const on = i === active;
        const col = STATIONS[i].color;

        g.querySelectorAll<SVGElement>("[data-lit]").forEach((el) => {
          el.setAttribute("stroke", on ? col : HAIR);
        });
        // the flight at Carry keeps its own captain colours when lit
        g.querySelectorAll<SVGElement>("[data-dart]").forEach((el) => {
          const own = el.getAttribute("data-dart");
          const c = on ? (own && own !== "true" ? own : col) : HAIR;
          el.setAttribute("fill", on ? c : PAPER);
          el.setAttribute("stroke", c);
        });
        const ring = g.querySelector<SVGCircleElement>("[data-hold]");
        if (ring) {
          ring.setAttribute("stroke", on ? col : RULE);
          ring.setAttribute("opacity", on ? "1" : "0.6");
        }
        const num = g.querySelector<SVGTextElement>("[data-num]");
        const name = g.querySelector<SVGTextElement>("[data-name]");
        const desc = g.querySelector<SVGTextElement>("[data-desc]");
        if (num) num.setAttribute("fill", on ? col : MUTED);
        if (name) name.setAttribute("fill", on ? INK : MUTED);
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
        // the return leg: Focus back up to Ask along the curl
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

  // reduced motion: every station lit in its own colour, no travelling line
  const litStroke = (i: number) => (reduced ? STATIONS[i].color : HAIR);

  return (
    <svg
      viewBox="0 0 344 500"
      width="100%"
      role="img"
      aria-label="How the practice formation works: a person asks, agents carry the work, a person signs off, and their time goes to the work that matters"
      style={{ display: "block", maxWidth: 320, margin: "0 auto" }}
    >
      {/* main line */}
      <line x1={LINE_X} y1={STATION_Y[0]} x2={LINE_X} y2={STATION_Y[3]} stroke={RULE} strokeWidth="1.6" />
      {/* the way home: Focus curls up the margin back to Ask */}
      <path ref={returnRef} d={RETURN_D} fill="none" stroke={RULE} strokeWidth="1.6" />
      {/* arrowhead re-entering Ask */}
      <path
        d={`M ${LINE_X - 13} 56 L ${LINE_X - 3} 60 L ${LINE_X - 13} 64`}
        fill="none"
        stroke={MUTED}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* set along the return */}
      <text
        x="18"
        y="248"
        fontSize="9.5"
        fontFamily="'IBM Plex Mono', ui-monospace, monospace"
        fill={MUTED}
        letterSpacing="0.22em"
        transform="rotate(-90 18 248)"
        textAnchor="middle"
      >
        IN FORMATION
      </text>

      {/* stations */}
      {STATIONS.map((s, i) => (
        <g key={s.name} ref={(el) => { stationRefs.current[i] = el; }} stroke={litStroke(i)}>
          {/* a paper well behind each glyph so the hairline doesn't run through it */}
          <circle cx={LINE_X} cy={STATION_Y[i]} r="17" fill={PAPER} stroke="none" />

          {i === 0 && <Person cx={LINE_X} cy={STATION_Y[i]} />}

          {i === 1 && (
            <>
              {/* a flight of three in echelon, noses down the route, with the
                  lead dart ahead — they fly the way the work travels */}
              <Dart cx={LINE_X} cy={STATION_Y[i] + 7} r={90} s={0.95} tag={VERM} lit={reduced} />
              <Dart cx={LINE_X - 8} cy={STATION_Y[i] - 5} r={90} s={0.85} tag={BLUE} lit={reduced} />
              <Dart cx={LINE_X + 8} cy={STATION_Y[i] - 5} r={90} s={0.85} tag={GREEN} lit={reduced} />
            </>
          )}

          {i === 2 && (
            <>
              <circle
                data-hold
                cx={LINE_X}
                cy={STATION_Y[i]}
                r="15"
                fill="none"
                stroke={reduced ? s.color : RULE}
                strokeWidth="1.6"
                strokeDasharray="3 4"
                opacity={reduced ? 1 : 0.6}
              />
              <Person cx={LINE_X} cy={STATION_Y[i]} s={0.82} />
            </>
          )}

          {i === 3 && (
            <>
              <Person cx={LINE_X - 3} cy={STATION_Y[i]} s={0.92} />
              {/* the agent that stayed, at their shoulder */}
              <Dart cx={LINE_X + 13} cy={STATION_Y[i] - 6} r={-32} s={0.72} tag={GREEN} lit={reduced} />
            </>
          )}

          <text
            data-num
            x={TEXT_X}
            y={STATION_Y[i] - 16}
            fontSize="10"
            fontFamily="'IBM Plex Mono', ui-monospace, monospace"
            fill={reduced ? s.color : MUTED}
            letterSpacing="0.16em"
            stroke="none"
          >
            {`0${i + 1}`}
          </text>
          <text
            data-name
            x={TEXT_X}
            y={STATION_Y[i] + 7}
            fontSize="21"
            fontStyle="italic"
            fontWeight="600"
            fontFamily="'Newsreader', Georgia, serif"
            fill={reduced ? INK : MUTED}
            stroke="none"
          >
            {s.name}
          </text>
          <text
            data-desc
            x={TEXT_X}
            y={STATION_Y[i] + 27}
            fontSize="11.5"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#4c463c"
            opacity={reduced ? 1 : 0.55}
            stroke="none"
          >
            {s.desc}
          </text>
        </g>
      ))}

      {/* the flowing line: segments of remembered colour, tapering away */}
      <g ref={flowRef} style={reduced ? { display: "none" } : undefined}>
        {Array.from({ length: TRAIL_N - 1 }).map((_, k) => (
          <line key={k} ref={(el) => { segRefs.current[k] = el; }} strokeLinecap="round" opacity="0" />
        ))}
      </g>
    </svg>
  );
}
