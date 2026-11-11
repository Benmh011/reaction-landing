"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Automation Dial — a circular braiding loom, seen from above.
 *
 * Twelve shuttles ride two concentric tracks, one set turning clockwise, the
 * other anticlockwise, each trailing a thread to the centre where the cord
 * forms. The machine always turns; the dial decides how many shuttles are
 * threaded and how fast it runs:
 *   Manual     three threads, the captain colours, turning slowly
 *   Assisted   their three counter-rotating twins join: the threads cross
 *   Drafted    three ink threads join, the ring quickens
 *   Automated  all twelve threaded, the cord at its thickest
 * Unthreaded shuttles stay on the ring in outline, so winding the dial reads
 * as threads being added to the machine.
 *
 * The housing is an open 270° gauge that fills with vermilion as the setting
 * rises. Draggable with detent snap; auto-cycles when idle and yields to the
 * visitor's hand. Reduced motion gets a still frame; off-screen pauses it.
 */

const DETENTS = [0, 1 / 3, 2 / 3, 1];
const LABELS = ["Manual", "Assisted", "Drafted", "Automated"];
const N = 12;

const INK = "#1a1713";
const VERM = "#c93a17";
const BLUE = "#2565aa";
const GREEN = "#0d5a40";
// even indices ride the outer, clockwise track; odd the inner, anticlockwise.
// Captains sit at 0/4/8 (clockwise) and 3/7/11 (anticlockwise); ink fills the rest.
const COLORS = [VERM, INK, INK, BLUE, GREEN, INK, INK, VERM, BLUE, INK, INK, GREEN];
// threading order: three captains, their counter-rotating twins, then the ink
const ORDER = [0, 4, 8, 3, 7, 11, 2, 6, 10, 1, 5, 9];
const RANK = ORDER.reduce<number[]>((r, idx, pos) => {
  r[idx] = pos;
  return r;
}, []);

// drawing space: a 360-unit square, scaled to whatever the host measures
const U = 360;
const C = U / 2;
const R = 138; // gauge arc radius
const R0 = 92; // mean track radius
const AMP = 8; // half the gap between the two tracks
const GAUGE_START = Math.PI * 0.75;
const GAUGE_SPAN = Math.PI * 1.5;

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export default function AutomationDial() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [detent, setDetent] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(host);
    const ground = css.getPropertyValue("--bg").trim() || "#e9e2d0";
    const groove = css.getPropertyValue("--rule").trim() || "#d5ccb5";

    const HOME = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 - Math.PI / 2);
    const phases = HOME.slice();
    const act = new Array<number>(N).fill(0);
    const dirOf = (i: number) => (i % 2 === 0 ? 1 : -1);
    const radiusOf = (i: number) => R0 + dirOf(i) * AMP;

    let v = DETENTS[1];
    let target = v;
    let rotor = 0;
    let autoIdx = 1;
    let autoTimer = 2.2;
    let holdOff = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartV = 0;

    const snap = (x: number) => {
      let best = 0;
      for (let i = 1; i < DETENTS.length; i++) if (Math.abs(DETENTS[i] - x) < Math.abs(DETENTS[best] - x)) best = i;
      return best;
    };

    const step = (dt: number) => {
      if (!dragging && !reduceMotion) {
        if (holdOff > 0) holdOff -= dt;
        else {
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoIdx = (autoIdx + 1) % DETENTS.length;
            target = DETENTS[autoIdx];
            setDetent(autoIdx);
            autoTimer = 3.8;
          }
        }
      }
      v += (target - v) * Math.min(1, dt * 4.5);
      // one rotor drives every shuttle, so their spacing never drifts
      rotor += (0.2 + v * 1.45) * dt;
      const activeF = 3 + v * (N - 3);
      for (let i = 0; i < N; i++) {
        const want = Math.min(1, Math.max(0, activeF - RANK[i]));
        act[i] += (want - act[i]) * Math.min(1, dt * 3);
        phases[i] = HOME[i] + dirOf(i) * rotor;
      }
    };

    const capsule = (w: number, h: number) => {
      const r = h / 2;
      g.beginPath();
      g.moveTo(-w / 2 + r, -r);
      g.lineTo(w / 2 - r, -r);
      g.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
      g.lineTo(-w / 2 + r, r);
      g.arc(-w / 2 + r, 0, r, Math.PI / 2, -Math.PI / 2);
      g.closePath();
    };

    let scale = 1;
    const draw = () => {
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.clearRect(0, 0, U, U);

      // the two tracks
      g.strokeStyle = rgba(INK, 0.12);
      g.lineWidth = 0.8;
      for (const dir of [1, -1]) {
        g.beginPath();
        g.arc(C, C, R0 + dir * AMP, 0, Math.PI * 2);
        g.stroke();
      }

      // threads: the faster the ring turns, the further each one swirls
      const lag = 0.18 + 1.15 * v;
      g.lineCap = "round";
      for (let i = 0; i < N; i++) {
        if (act[i] < 0.03) continue;
        const dir = dirOf(i);
        const r = radiusOf(i);
        const isInk = COLORS[i] === INK;
        g.beginPath();
        for (let s = 0; s <= 30; s++) {
          const u = s / 30; // 0 at the centre, 1 at the shuttle
          const a = phases[i] - dir * lag * Math.pow(1 - u, 1.6) * act[i] * 1.85;
          const rr = 5 + (r - 5) * u;
          const x = C + Math.cos(a) * rr;
          const y = C + Math.sin(a) * rr;
          if (s) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.strokeStyle = rgba(COLORS[i], (isInk ? 0.42 : 0.9) * act[i]);
        g.lineWidth = isInk ? 0.9 : 1.25;
        g.stroke();
      }

      // the fell: where the cord forms. It thickens as threads arrive.
      g.beginPath();
      g.arc(C, C, 4.5 + 4.5 * v, 0, Math.PI * 2);
      g.fillStyle = INK;
      g.fill();
      g.beginPath();
      g.arc(C, C, 1.6 + 1.2 * v, 0, Math.PI * 2);
      g.fillStyle = ground;
      g.fill();

      // shuttles, turned to their direction of travel
      for (let i = 0; i < N; i++) {
        const r = radiusOf(i);
        g.save();
        g.translate(C + Math.cos(phases[i]) * r, C + Math.sin(phases[i]) * r);
        g.rotate(phases[i] + Math.PI / 2);
        capsule(12, 4.6);
        if (act[i] > 0.5) {
          g.fillStyle = COLORS[i];
          g.fill();
        } else {
          g.strokeStyle = rgba(INK, 0.3 + 0.4 * act[i]);
          g.lineWidth = 1;
          g.stroke();
        }
        g.restore();
      }

      // the gauge: groove, vermilion fill, detent notches
      g.lineCap = "round";
      g.beginPath();
      g.arc(C, C, R, GAUGE_START, GAUGE_START + GAUGE_SPAN);
      g.strokeStyle = groove;
      g.lineWidth = 5;
      g.stroke();
      g.beginPath();
      g.arc(C, C, R, GAUGE_START, GAUGE_START + Math.max(0.001, GAUGE_SPAN * v));
      g.strokeStyle = VERM;
      g.lineWidth = 5;
      g.stroke();
      for (const d of DETENTS) {
        const a = GAUGE_START + GAUGE_SPAN * d;
        g.beginPath();
        g.arc(C + Math.cos(a) * R, C + Math.sin(a) * R, 1.5, 0, Math.PI * 2);
        g.fillStyle = d <= v + 0.02 ? "#f5f1e6" : "#8d8574";
        g.fill();
      }
    };

    const resize = () => {
      const w = Math.max(1, host.getBoundingClientRect().width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      scale = (w * dpr) / U;
      draw();
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      holdOff = 8;
      dragStartX = e.clientX;
      dragStartV = v;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      target = Math.min(1, Math.max(0, dragStartV + (e.clientX - dragStartX) / 240));
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = "grab";
      const d = snap(target);
      target = DETENTS[d];
      autoIdx = d;
      setDetent(d);
    };

    let raf = 0;
    let running = false;
    let last = 0;
    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let cleanup = () => {};
    if (reduceMotion) {
      // a settled still at Drafted
      v = target = DETENTS[2];
      setDetent(2);
      for (let k = 0; k < 240; k++) step(0.033);
      resize();
    } else {
      // settle the opening pose before the first frame is shown
      for (let k = 0; k < 90; k++) step(0.033);
      autoTimer = 2.2;
      resize();
      canvas.style.cursor = "grab";
      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
      const io = new IntersectionObserver((es) => (es[0]?.isIntersecting ? start() : stop()), { threshold: 0.1 });
      io.observe(host);
      const onVis = () => (document.visibilityState === "hidden" ? stop() : start());
      document.addEventListener("visibilitychange", onVis);
      cleanup = () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }

    return () => {
      stop();
      ro.disconnect();
      cleanup();
    };
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div ref={hostRef} style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "pan-y" }}
        />
      </div>
      <div
        className="mono"
        aria-live="polite"
        style={{ position: "relative", display: "flex", justifyContent: "center", gap: 18, marginTop: "-9%", fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase" }}
      >
        {LABELS.map((l, i) => (
          <span key={l} style={{ color: i === detent ? "var(--reaction)" : "var(--text-muted)", transition: "color .3s ease" }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
