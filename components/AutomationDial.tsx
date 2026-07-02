"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Automation Dial — tenet 02, made physical.
 *
 * A machined control dial, face-on with a gentle tilt. Inside the dial's
 * recessed gallery, fourteen paper darts live on an annular channel — they
 * never leave the instrument. The dial's setting governs them: at Manual a
 * skeleton crew circulates slowly while the rest sit parked and dimmed; wind
 * it toward Automated and, one by one, the parked darts wake, the stream
 * quickens, the formation tightens. The lead dart is vermilion.
 *
 * Four detents: Manual · Assisted · Drafted · Automated. The dial cycles
 * between them on its own — until the visitor grabs it. Dragging turns the
 * dial live; release snaps to the nearest detent. That's the pitch in one
 * gesture: you hold the dial.
 *
 * Flat ink materials, no lights — the same sumi-e language as the flock.
 * Reduced motion renders a single mid-setting frame. No WebGL falls back to
 * a static SVG. Pauses off-screen. Decorative; the caption strip below the
 * canvas carries the state for everyone, screen readers included.
 */

const DETENTS = [0, 1 / 3, 2 / 3, 1];
const LABELS = ["Manual", "Assisted", "Drafted", "Automated"];
const N_DARTS = 14;
const ARC_START = Math.PI * 1.18; // graduation arc across the top of the face
const ARC_SPAN = Math.PI * 0.64;

const INK = 0x1a1713;
const INK_SOFT = 0x3a352c;
const FACE = 0xeee9dc;
const WELL = 0xe2dccb;
const RULE = 0xcdc5b2;
const VERM = 0xc93a17;
const PAPER = { r: 247 / 255, g: 244 / 255, b: 236 / 255 };

function StaticFallback() {
  return (
    <svg viewBox="-120 -120 240 240" width="100%" aria-hidden="true" focusable="false" style={{ display: "block" }}>
      <circle r="110" fill="#1a1713" />
      <circle r="92" fill="#eee9dc" />
      <path d="M 0 -86 L 6 -62 L -6 -62 Z" fill="#c93a17" transform="rotate(24)" />
      <circle r="58" fill="#e2dccb" />
      <circle r="26" fill="#eee9dc" />
      {[...Array(10)].map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const x = Math.cos(a) * 42, y = Math.sin(a) * 42;
        return <path key={i} d="M0 -7 L4.5 5 L0 2.5 L-4.5 5 Z" transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 180})`} fill={i === 0 ? "#c93a17" : "#1a1713"} />;
      })}
    </svg>
  );
}

export default function AutomationDial() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);
  const [detent, setDetent] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    (async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        setFallback(true);
        return;
      }
      if (disposed || !hostRef.current) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFallback(true);
        return;
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
      camera.position.set(0, 0, 8.2);

      const dial = new THREE.Group();
      dial.rotation.x = -0.42; // the tilt that makes it an object, not a diagram
      scene.add(dial);

      const flat = (color: number) => new THREE.MeshBasicMaterial({ color });
      const mats: import("three").Material[] = [];
      const geos: import("three").BufferGeometry[] = [];
      const M = (c: number) => { const m = flat(c); mats.push(m); return m; };
      const G = <T extends import("three").BufferGeometry>(g: T): T => { geos.push(g); return g; };

      // ── Body: ink cylinder, knurled rim ──
      const body = new THREE.Mesh(G(new THREE.CylinderGeometry(2.2, 2.2, 0.5, 72)), M(INK));
      body.rotation.x = Math.PI / 2;
      dial.add(body);
      const knurl = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.055, 0.09, 0.52)), M(INK_SOFT), 48);
      const km = new THREE.Matrix4();
      const kq = new THREE.Quaternion();
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        kq.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
        km.compose(new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0), kq, new THREE.Vector3(1, 1, 1));
        knurl.setMatrixAt(i, km);
      }
      dial.add(knurl);

      // ── Face plate ──
      const face = new THREE.Mesh(G(new THREE.CylinderGeometry(1.98, 1.98, 0.1, 72)), M(FACE));
      face.rotation.x = Math.PI / 2;
      face.position.z = 0.26;
      dial.add(face);

      // ── Graduations across the top arc: 4 majors (detents), minors between ──
      const tickMinor = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.02, 0.14, 0.02)), M(0x8d8574), 21);
      const tickMajor = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.035, 0.24, 0.03)), M(INK), 4);
      let mi = 0, ma = 0;
      for (let i = 0; i < 25; i++) {
        const t = i / 24;
        const a = ARC_START + t * ARC_SPAN;
        const major = i % 8 === 0;
        const r = major ? 1.7 : 1.75;
        kq.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a + Math.PI / 2);
        km.compose(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.33), kq, new THREE.Vector3(1, 1, 1));
        if (major) tickMajor.setMatrixAt(ma++, km);
        else tickMinor.setMatrixAt(mi++, km);
      }
      dial.add(tickMinor, tickMajor);

      // ── Needle: vermilion pointer riding the arc ──
      const needleGroup = new THREE.Group();
      const needle = new THREE.Mesh(G(new THREE.ConeGeometry(0.075, 0.34, 4)), M(VERM));
      needle.position.set(0, 1.52, 0.36);
      needle.rotation.z = Math.PI; // point outward at the graduations
      needleGroup.add(needle);
      dial.add(needleGroup);

      // ── The gallery: recessed annular channel where the darts live ──
      const wellOuter = new THREE.Mesh(G(new THREE.CylinderGeometry(1.24, 1.24, 0.09, 64)), M(RULE));
      wellOuter.rotation.x = Math.PI / 2;
      wellOuter.position.z = 0.3;
      const well = new THREE.Mesh(G(new THREE.CylinderGeometry(1.18, 1.18, 0.1, 64)), M(WELL));
      well.rotation.x = Math.PI / 2;
      well.position.z = 0.31;
      const hub = new THREE.Mesh(G(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 48)), M(FACE));
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.33;
      dial.add(wellOuter, well, hub);

      // ── The darts: folded paper, tangential on the annulus, never leaving it ──
      const dartGeo = G(new THREE.BufferGeometry());
      dartGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [0, 1, 0, -0.62, -0.75, 0.2, 0, -0.45, 0, 0, 1, 0, 0, -0.45, 0, 0.62, -0.75, 0.2],
          3,
        ),
      );
      const dartMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      mats.push(dartMat);
      const darts = new THREE.InstancedMesh(dartGeo, dartMat, N_DARTS);
      darts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      dial.add(darts);
      const phases = new Float32Array(N_DARTS);
      const activity = new Float32Array(N_DARTS);
      for (let i = 0; i < N_DARTS; i++) phases[i] = (i / N_DARTS) * Math.PI * 2;

      const col = new THREE.Color();
      const inkC = new THREE.Color(INK);
      const vermC = new THREE.Color(VERM);
      const dimC = new THREE.Color().setRGB(
        inkC.r + (PAPER.r - inkC.r) * 0.62,
        inkC.g + (PAPER.g - inkC.g) * 0.62,
        inkC.b + (PAPER.b - inkC.b) * 0.62,
      );

      // ── Dial state: current value chases a target; detents snap ──
      let v = DETENTS[1];
      let target = v;
      let autoIdx = 1;
      let autoTimer = 2.2;
      let holdOff = 0; // seconds of auto-pause after user interaction
      let dragging = false;
      let dragStartX = 0;
      let dragStartV = 0;

      const snap = (x: number) => {
        let best = 0;
        for (let i = 1; i < DETENTS.length; i++) if (Math.abs(DETENTS[i] - x) < Math.abs(DETENTS[best] - x)) best = i;
        return best;
      };

      const onDown = (e: PointerEvent) => {
        dragging = true;
        holdOff = 8;
        dragStartX = e.clientX;
        dragStartV = v;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dv = (e.clientX - dragStartX) / 240;
        target = Math.min(1, Math.max(0, dragStartV + dv));
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        const d = snap(target);
        target = DETENTS[d];
        autoIdx = d;
        setDetent(d);
      };
      if (!reduceMotion) {
        renderer.domElement.style.pointerEvents = "auto";
        renderer.domElement.style.cursor = "grab";
        renderer.domElement.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
      }

      const step = (dt: number, t: number) => {
        // auto-cycle when idle
        if (!dragging) {
          if (holdOff > 0) holdOff -= dt;
          else {
            autoTimer -= dt;
            if (autoTimer <= 0) {
              autoIdx = (autoIdx + 1) % DETENTS.length;
              target = DETENTS[autoIdx];
              setDetent(autoIdx);
              autoTimer = 3.6;
            }
          }
        }
        v += (target - v) * Math.min(1, dt * 4.5);

        // needle rides the arc
        const a = ARC_START + v * ARC_SPAN;
        needleGroup.rotation.z = a - Math.PI / 2;

        // idle sway — an object on a desk, not a static diagram
        dial.rotation.y = Math.sin(t * 0.3) * 0.14;
        dial.rotation.x = -0.42 + Math.sin(t * 0.19) * 0.05;

        // darts: each has a wake threshold along the dial's travel
        const activeF = 3 + v * (N_DARTS - 3); // continuous headcount
        const m4 = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const zAxis = new THREE.Vector3(0, 0, 1);
        for (let i = 0; i < N_DARTS; i++) {
          const target_a = Math.min(1, Math.max(0, activeF - i)); // 0 parked … 1 flying
          activity[i] += (target_a - activity[i]) * Math.min(1, dt * 3);
          const act = activity[i];
          const speed = (0.18 + v * 1.25) * act;
          phases[i] += speed * dt;
          const r = 0.85 + Math.sin(phases[i] * 3 + i) * 0.035 * act;
          const px = Math.cos(phases[i]) * r;
          const py = Math.sin(phases[i]) * r;
          q.setFromAxisAngle(zAxis, phases[i] + Math.PI); // nose along the direction of travel
          const s = 0.16 * (0.72 + 0.28 * act);
          m4.compose(new THREE.Vector3(px, py, 0.37 + 0.02 * Math.sin(phases[i] * 2)), q, new THREE.Vector3(s, s, s));
          darts.setMatrixAt(i, m4);
          const base = i === 0 ? vermC : inkC;
          col.copy(dimC).lerp(base, act);
          darts.setColorAt(i, col);
        }
        darts.instanceMatrix.needsUpdate = true;
        if (darts.instanceColor) darts.instanceColor.needsUpdate = true;
      };

      const resize = () => {
        const r = host.getBoundingClientRect();
        const w = Math.max(1, r.width), h = Math.max(1, r.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const clock = new THREE.Clock();
      let simT = 0;
      let raf = 0;
      let running = false;
      const loop = () => {
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.033);
        simT += dt;
        step(dt, simT);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      const start = () => { if (!running && !reduceMotion) { running = true; clock.getDelta(); raf = requestAnimationFrame(loop); } };
      const stop = () => { running = false; cancelAnimationFrame(raf); };

      let cleanupObservers: (() => void) | null = null;
      if (reduceMotion) {
        v = target = DETENTS[2];
        setDetent(2);
        step(0.016, 0);
        renderer.render(scene, camera);
      } else {
        const io = new IntersectionObserver((es) => (es[0]?.isIntersecting ? start() : stop()), { threshold: 0.1 });
        io.observe(host);
        const onVis = () => (document.visibilityState === "hidden" ? stop() : start());
        document.addEventListener("visibilitychange", onVis);
        cleanupObservers = () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
      }

      (host as HTMLDivElement & { __rxDispose?: () => void }).__rxDispose = () => {
        stop();
        cleanupObservers?.();
        renderer.domElement.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        ro.disconnect();
        renderer.dispose();
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
        if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      const h = hostRef.current as (HTMLDivElement & { __rxDispose?: () => void }) | null;
      h?.__rxDispose?.();
    };
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
        {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />}
      </div>
      <div
        className="mono"
        aria-live="polite"
        style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 6, fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase" }}
      >
        {LABELS.map((l, i) => (
          <span key={l} style={{ color: i === detent ? "var(--reaction)" : "var(--text-muted)", transition: "color .3s ease" }}>
            {l}
          </span>
        ))}
      </div>
      <div className="mono" style={{ textAlign: "center", marginTop: 8, fontSize: "0.62rem", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
        fig. 2 — the dial. drag it.
      </div>
    </div>
  );
}
