"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flock — three formations, on manoeuvres.
 *
 * Fifteen ink darts in three squadrons: a vermilion captain with 3 ink
 * wingmen, a blue captain with 3, an emerald captain with 6. The physics is
 * the original murmuration's, unchanged in kind: true boids — separation,
 * alignment, cohesion — inside a soft invisible territory, stirred by a slow
 * sine wind so the sky never holds still, fleeing the cursor as a presence
 * that eases in and out (your action, its Reaction). Cohesion and alignment
 * bind only squadron-mates; separation acts across all fifteen, so the three
 * sets part around each other rather than merging.
 *
 * The launch: each squadron lifts off from the coloured tittle of its own
 * lowercase i in the headline — vermilion from Intelligence, blue from in,
 * emerald from formation — measured live from the DOM ([data-captain]), so
 * the launch point is pixel-true wherever the headline wraps. Captains tow a
 * short ribbon of their own colour that dissolves toward the paper.
 *
 * Engineering: plain 2D canvas (fifteen agents need no GPU), DPR cap 1.5,
 * pauses offscreen/tab-hidden, reduced-motion renders squadrons already on
 * station as a single still, no-canvas falls back to a static SVG.
 * Decorative: aria-hidden; pointer events stay on the page.
 */

const PAPER = "#f7f4ec";
const INK = "#1a1713";

const SQUADRONS = [
  { pad: "verm", color: "#c93a17", wings: 3 }, // Intell·i·gence
  { pad: "blue", color: "#2565aa", wings: 3 }, // ·i·n
  { pad: "green", color: "#0d5a40", wings: 6 }, // format·i·on
] as const;

/* ── Physics — the murmuration's constants, in its original world units.
      The old flock lived in a world 13.2 units wide (territory BX = 6.6);
      S = canvasWidth / WORLD_W converts units → pixels at any size. ── */
const WORLD_W = 13.2;
const NEIGH_R = 1.15; // squadron-mate perception radius (world units)
const SEP_R = 0.34; //   personal space within a squadron
const XSEP_R = 0.5; //   personal space between squadrons
const MIN_S = 0.7; //    speed floor — nobody hovers (world units / s)
const MAX_S = 2.3; //    speed ceiling
const SPEED_TUNE = 0.72; // 15 large darts read calmer than 420 specks
const W_SEP = 5.2; //    rule weights (steering, Reynolds-style)
const W_XSEP = 6.0;
const W_ALI = 1.7;
const W_COH = 1.15;
const WIND = { ax: 0.32, fx: 0.21, ay: 0.2, fy: 0.34, py: 2.1 }; // the slow sine wind, verbatim
const CURSOR_R = 1.6; // the cursor's presence radius (world units)
const W_FLEE = 7.0;
const CURSOR_DECAY = 0.35; // presence eases out at the original rate
const BOUND_K = 4.5; //  soft territory spring
const TEXT_K = 2.6; //   gentle repulsion off the headline block

/* ── Launch choreography (seconds; dots pop via CSS at 1.15/1.30/1.45s) ── */
const T_LAUNCH = 1.75; // first captain lifts off
const T_SQUAD = 0.38; //  stagger between squadrons
const T_PLANE = 0.14; //  wingmen stream out behind their captain
const T_RAMP = 0.9; //    flocking forces fade in over each dart's first flight
const TRAIL_N = 26; //    captain ribbon length (frames)

type Dart = {
  sq: number;
  cap: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  at: number; // launch time (s)
  live: boolean;
  trail: { x: number; y: number }[] | null;
};

function StaticFallback() {
  // Hand-placed squadrons for no-canvas environments.
  const dart = "M2.4 0 L-1.8 1.4 L-1 0 L-1.8 -1.4 Z";
  const squads: [number, number, number, string, [number, number, number][]][] = [
    [30, 22, -12, "#c93a17", [[-5, 4, -18], [-5, -4, -4], [-9, 7, -20]]],
    [55, 15, 6, "#2565aa", [[-5, 4, 12], [-5, -4, 0], [-9, -7, 8]]],
    [78, 27, 18, "#0d5a40", [[-5, 4, 24], [-5, -4, 12], [-9, 7, 26], [-9, -7, 14], [-13, 10, 28], [-13, -10, 12]]],
  ];
  return (
    <svg viewBox="0 0 100 60" width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" style={{ display: "block", opacity: 0.9 }}>
      {squads.map(([cx, cy, rot, col, wings], s) => (
        <g key={s} transform={`translate(${cx} ${cy}) rotate(${rot})`}>
          {wings.map(([wx, wy, wr], i) => (
            <path key={i} d={dart} transform={`translate(${wx} ${wy}) rotate(${wr})`} fill={INK} />
          ))}
          <path d={dart} transform="scale(1.2)" fill={col} />
        </g>
      ))}
    </svg>
  );
}

export default function Flock() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setFallback(true);
      return;
    }
    host.appendChild(canvas);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let S = 100; // px per world unit
    let raf = 0;
    let running = false;
    let disposed = false;
    let started = performance.now();
    let last = started;
    let textRect: { x: number; y: number; w: number; h: number } | null = null;

    const darts: Dart[] = [];
    const rings: { x: number; y: number; t: number; c: string; r: number }[] = [];

    const resize = () => {
      const r = host.getBoundingClientRect();
      W = r.width;
      H = r.height;
      S = W / WORLD_W;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // The headline block, inflated: launches begin inside it, cruising avoids it.
      const h1 = host.parentElement?.querySelector("h1");
      if (h1) {
        const hr = h1.getBoundingClientRect();
        textRect = { x: hr.left - r.left - 20, y: hr.top - r.top - 20, w: hr.width + 40, h: hr.height + 40 };
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // The cursor: a presence that eases in while the pointer moves. (Original.)
    const cursor = { x: -9999, y: -9999 };
    let cursorLive = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      cursor.x = e.clientX - r.left;
      cursor.y = e.clientY - r.top;
      cursorLive = 1;
    };
    if (!reduceMotion) window.addEventListener("pointermove", onMove, { passive: true });

    const dotPoint = (pad: string) => {
      const el = host.parentElement?.querySelector(`[data-captain="${pad}"]`);
      const r = host.getBoundingClientRect();
      if (!el) return { x: W * 0.3, y: H * 0.6 }; // never strand a squadron
      const d = el.getBoundingClientRect();
      return { x: d.left + d.width / 2 - r.left, y: d.top + d.height / 2 - r.top };
    };

    const territory = () => ({ cx: W * 0.52, cy: H * 0.36, rx: W * 0.44, ry: H * 0.3 });

    const spawnSquadron = (sq: number, at: number) => {
      const cfg = SQUADRONS[sq];
      const p = dotPoint(cfg.pad);
      const t = territory();
      const aim = Math.atan2(t.cy - p.y, t.cx - p.x);
      for (let k = 0; k <= cfg.wings; k++) {
        const a = aim + (Math.random() - 0.5) * 0.7;
        const v0 = MIN_S * S * SPEED_TUNE * 1.15;
        darts.push({
          sq,
          cap: k === 0,
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * v0,
          vy: Math.sin(a) * v0,
          at: at + k * T_PLANE,
          live: false,
          trail: k === 0 ? [] : null,
        });
      }
    };

    const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

    const step = (dt: number, el: number) => {
      cursorLive = Math.max(0, cursorLive - dt * CURSOR_DECAY);
      const t = el;
      // Gentle wind so the flock fluctuates even when the pointer rests. (Original.)
      const wx = Math.sin(t * WIND.fx) * WIND.ax * S;
      const wy = Math.sin(t * WIND.fy + WIND.py) * WIND.ay * S;

      const vmax = MAX_S * S * SPEED_TUNE;
      const vminFull = MIN_S * S * SPEED_TUNE;
      const neighR2 = NEIGH_R * S * (NEIGH_R * S);
      const sepR2 = SEP_R * S * (SEP_R * S);
      const xsepR2 = XSEP_R * S * (XSEP_R * S);
      const terr = territory();

      for (let i = 0; i < darts.length; i++) {
        const p = darts[i];
        if (el * 1000 < p.at * 1000) continue;
        if (!p.live) {
          p.live = true;
          rings.push({ x: p.x, y: p.y, t: el, c: p.cap ? SQUADRONS[p.sq].color : INK, r: p.cap ? 4 : 7 });
        }
        const age = el - p.at;
        const ramp = smooth(age / T_RAMP);

        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, n = 0;
        for (let j = 0; j < darts.length; j++) {
          if (i === j) continue;
          const q = darts[j];
          if (!q.live) continue;
          const dx = p.x - q.x, dy = p.y - q.y;
          const d2 = Math.max(dx * dx + dy * dy, 1e-4);
          if (q.sq === p.sq) {
            if (d2 < neighR2) {
              n++;
              cohX += q.x; cohY += q.y;
              aliX += q.vx; aliY += q.vy;
              if (d2 < sepR2) { sepX += dx / d2; sepY += dy / d2; }
            }
          } else if (d2 < xsepR2) {
            sepX += (dx / d2) * (W_XSEP / W_SEP);
            sepY += (dy / d2) * (W_XSEP / W_SEP);
          }
        }

        let fx = 0, fy = 0;
        const sepM = Math.hypot(sepX, sepY);
        if (sepM > 1e-6) {
          fx += ((sepX / sepM) * vmax - p.vx) * W_SEP * ramp;
          fy += ((sepY / sepM) * vmax - p.vy) * W_SEP * ramp;
        }
        if (n > 0) {
          const aM = Math.hypot(aliX, aliY);
          if (aM > 1e-6) {
            fx += ((aliX / aM) * vmax - p.vx) * W_ALI * ramp;
            fy += ((aliY / aM) * vmax - p.vy) * W_ALI * ramp;
          }
          const gx = cohX / n - p.x, gy = cohY / n - p.y;
          const gM = Math.hypot(gx, gy);
          if (gM > 1e-6) {
            fx += ((gx / gM) * vmax - p.vx) * W_COH * ramp;
            fy += ((gy / gM) * vmax - p.vy) * W_COH * ramp;
          }
        }
        // Wind
        fx += wx; fy += wy;
        // Territory (locally hosted): a soft ellipse the flock never leaves. (Original, one axis fewer.)
        const ex = (p.x - terr.cx) / terr.rx, ey = (p.y - terr.cy) / terr.ry;
        const e = ex * ex + ey * ey;
        if (e > 0.82) {
          const k = BOUND_K * (e - 0.82);
          fx += (terr.cx - p.x) * k;
          fy += (terr.cy - p.y) * k;
        }
        // The headline is solid ground — cruise around it once airborne.
        if (age > 1.3 && textRect && p.x > textRect.x && p.x < textRect.x + textRect.w && p.y > textRect.y && p.y < textRect.y + textRect.h) {
          const rcx = textRect.x + textRect.w / 2, rcy = textRect.y + textRect.h / 2;
          const tdx = p.x - rcx, tdy = p.y - rcy;
          const td = Math.hypot(tdx, tdy) || 1;
          fx += (tdx / td) * TEXT_K * vmax;
          fy += (tdy / td) * TEXT_K * vmax;
        }
        // The cursor: flee the presence, scaled by how alive it is. (Original.)
        const cr = CURSOR_R * S;
        const mdx = p.x - cursor.x, mdy = p.y - cursor.y;
        const md = Math.hypot(mdx, mdy);
        if (md < cr && md > 0.1 && cursorLive > 0) {
          const f = W_FLEE * (1 - md / cr) * cursorLive * vmax;
          fx += (mdx / md) * f;
          fy += (mdy / md) * f;
        }

        p.vx += fx * dt;
        p.vy += fy * dt;
        const v = Math.hypot(p.vx, p.vy) || 1e-4;
        const vmin = vminFull * ramp + vminFull * 0.4 * (1 - ramp);
        if (v > vmax) { p.vx *= vmax / v; p.vy *= vmax / v; }
        else if (v < vmin) { p.vx *= vmin / v; p.vy *= vmin / v; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 6) p.x = 6; if (p.x > W - 6) p.x = W - 6;
        if (p.y < 6) p.y = 6; if (p.y > H - 6) p.y = H - 6;
        if (p.trail) {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > TRAIL_N) p.trail.shift();
        }
      }
    };

    const drawDart = (x: number, y: number, ang: number, k: number, col: string) => {
      if (k <= 0.01) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(k, k);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-9, 7);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-9, -7);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-5, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const draw = (el: number) => {
      ctx.clearRect(0, 0, W, H);
      const size = 1.35 * Math.min(1.25, Math.max(0.85, W / 1200));
      // Launch ripples
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        const q = (el - r.t) / 0.65;
        if (q >= 1) { rings.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r + q * 26, 0, Math.PI * 2);
        ctx.strokeStyle = r.c;
        ctx.globalAlpha = (1 - q) * 0.5;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Captain ribbons — pigment dissolving toward the paper
      ctx.lineCap = "round";
      for (const p of darts) {
        if (!p.live || !p.trail) continue;
        const nT = p.trail.length;
        for (let j = 1; j < nT; j++) {
          const a = j / nT;
          ctx.beginPath();
          ctx.moveTo(p.trail[j - 1].x, p.trail[j - 1].y);
          ctx.lineTo(p.trail[j].x, p.trail[j].y);
          ctx.strokeStyle = SQUADRONS[p.sq].color;
          ctx.globalAlpha = a * 0.42;
          ctx.lineWidth = a * 3.2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // Wingmen beneath, captains above
      for (const p of darts) {
        if (!p.live || p.cap) continue;
        drawDart(p.x, p.y, Math.atan2(p.vy, p.vx), size * 0.95 * Math.min(1, (el - p.at) / 0.26), INK);
      }
      for (const p of darts) {
        if (!p.live || !p.cap) continue;
        drawDart(p.x, p.y, Math.atan2(p.vy, p.vx), size * 1.15 * Math.min(1, (el - p.at) / 0.3), SQUADRONS[p.sq].color);
      }
    };

    if (reduceMotion) {
      // No theatre: squadrons already on station, one composed frame.
      const stations = [
        [0.32, 0.3, -0.25],
        [0.56, 0.22, 0.1],
        [0.78, 0.38, 0.35],
      ];
      SQUADRONS.forEach((cfg, sq) => {
        const [sx, sy, h] = stations[sq];
        for (let k = 0; k <= cfg.wings; k++) {
          const back = Math.ceil(k / 2) * 0.028 * W;
          const side = (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.02 * W;
          darts.push({
            sq,
            cap: k === 0,
            x: sx * W - Math.cos(h) * back - Math.sin(h) * side,
            y: sy * H - Math.sin(h) * back + Math.cos(h) * side,
            vx: Math.cos(h + (Math.random() - 0.5) * 0.2),
            vy: Math.sin(h + (Math.random() - 0.5) * 0.2),
            at: -9,
            live: true,
            trail: null,
          });
        }
      });
      draw(10);
      const disposeStill = () => {
        ro.disconnect();
        if (canvas.parentElement === host) host.removeChild(canvas);
      };
      (host as HTMLDivElement & { __rxDispose?: () => void }).__rxDispose = disposeStill;
      return () => {
        (hostRef.current as (HTMLDivElement & { __rxDispose?: () => void }) | null)?.__rxDispose?.();
      };
    }

    let spawned = [false, false, false];
    const frame = (now: number) => {
      if (disposed) return;
      const el = (now - started) / 1000;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      for (let i = 0; i < 3; i++) {
        const at = T_LAUNCH + i * T_SQUAD;
        if (el > at && !spawned[i]) {
          spawned[i] = true;
          resize(); // measure fresh — fonts may have swapped, headline may have wrapped
          spawnSquadron(i, at);
        }
      }
      step(dt, el);
      draw(el);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || disposed) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver((entries) => (entries[0]?.isIntersecting ? start() : stop()), { threshold: 0.05 });
    io.observe(host);
    const onVis = () => (document.visibilityState === "hidden" ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();

    const disposeAll = () => {
      disposed = true;
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      if (canvas.parentElement === host) host.removeChild(canvas);
    };
    (host as HTMLDivElement & { __rxDispose?: () => void }).__rxDispose = disposeAll;

    return () => {
      (hostRef.current as (HTMLDivElement & { __rxDispose?: () => void }) | null)?.__rxDispose?.();
    };
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />}
    </div>
  );
}
