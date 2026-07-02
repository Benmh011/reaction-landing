"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Automation Dial, third machining — glass, suspended in space.
 *
 * The woodshop is gone. What floats here is a lens: a thin ink frame ring
 * holding a transparent glass puck, a glare stripe caught across its upper
 * face, faint guide rings marking the channel where twelve paper darts
 * live. The graduations and the vermilion needle sweep the BOTTOM arc.
 * A soft shadow hangs beneath; the whole instrument bobs gently, an object
 * at anchor in open air.
 *
 * The squadron inside carries the site's colours now: reds, blues and
 * greens among the ink, every dart a two-tone fold. The setting still
 * governs them — at Manual a skeleton crew circulates while the rest park
 * at their home stations, dimmed; wind the dial and they wake one by one.
 *
 * Draggable with detent snap: Manual · Assisted · Drafted · Automated.
 * Auto-cycles when idle; yields to the visitor's hand. Reduced motion gets
 * a still frame; no WebGL gets an SVG; off-screen pauses everything.
 */

const DETENTS = [0, 1 / 3, 2 / 3, 1];
const LABELS = ["Manual", "Assisted", "Drafted", "Automated"];
const N_DARTS = 12;
// bottom arc: Manual at lower-left, sweeping to Automated at lower-right
const ARC_START = Math.PI * 1.18;
const ARC_SPAN = Math.PI * 0.64;

const INK = 0x1a1713;
const VERM = 0xc93a17;
const BLUE = 0x2565aa;
const GREEN = 0x0d5a40;
// reds and blues and greens among the ink
const DART_COLORS = [VERM, INK, BLUE, INK, GREEN, INK, VERM, INK, BLUE, INK, GREEN, INK];
const PAPER = { r: 247 / 255, g: 244 / 255, b: 236 / 255 };

function StaticFallback() {
  return (
    <svg viewBox="-120 -120 240 240" width="100%" aria-hidden="true" focusable="false" style={{ display: "block" }}>
      <ellipse cx="0" cy="108" rx="78" ry="12" fill="#1a1713" opacity="0.12" />
      <circle r="100" fill="none" stroke="#1a1713" strokeWidth="5" />
      <circle r="92" fill="#eef4f6" opacity="0.25" />
      <circle r="58" fill="none" stroke="#1a1713" strokeWidth="1" opacity="0.3" />
      <circle r="30" fill="none" stroke="#1a1713" strokeWidth="1" opacity="0.3" />
      <path d="M 0 84 L 6 60 L -6 60 Z" fill="#c93a17" transform="rotate(-24)" />
      {[...Array(9)].map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const cols = ["#c93a17", "#1a1713", "#2565aa", "#1a1713", "#0d5a40", "#1a1713", "#c93a17", "#1a1713", "#2565aa"];
        return <path key={i} d="M0 -7 L4.5 5 L0 2.5 L-4.5 5 Z" transform={`translate(${Math.cos(a) * 44} ${Math.sin(a) * 44}) rotate(${(a * 180) / Math.PI + 180})`} fill={cols[i]} />;
      })}
      <rect x="-64" y="-70" width="66" height="9" rx="4.5" fill="#ffffff" opacity="0.35" transform="rotate(-32)" />
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
      dial.rotation.x = -0.34;
      scene.add(dial);

      const mats: import("three").Material[] = [];
      const geos: import("three").BufferGeometry[] = [];
      const texs: import("three").Texture[] = [];
      const G = <T extends import("three").BufferGeometry>(g: T): T => { geos.push(g); return g; };
      const M = <T extends import("three").Material>(m: T): T => { mats.push(m); return m; };

      // ── The frame: one thin ink ring — a lens mount, nothing more ──
      const frame = new THREE.Mesh(
        G(new THREE.TorusGeometry(1.92, 0.055, 20, 96)),
        M(new THREE.MeshBasicMaterial({ color: INK })),
      );
      dial.add(frame);

      // ── The glass puck ──
      const glass = new THREE.Mesh(
        G(new THREE.CylinderGeometry(1.9, 1.9, 0.16, 96)),
        M(new THREE.MeshBasicMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.16 })),
      );
      glass.rotation.x = Math.PI / 2;
      dial.add(glass);
      // glass edge catch-light: a whisper-bright rim just inside the frame
      const rimLight = new THREE.Mesh(
        G(new THREE.TorusGeometry(1.84, 0.014, 12, 96)),
        M(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })),
      );
      rimLight.position.z = 0.06;
      dial.add(rimLight);
      // glare: two soft stripes caught across the upper face, safely inside
      // the disc radius (the old floating crescents are gone for good)
      const glareMat = M(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }));
      const glare1 = new THREE.Mesh(G(new THREE.PlaneGeometry(1.55, 0.17)), glareMat);
      glare1.position.set(-0.42, 0.62, 0.1);
      glare1.rotation.z = -0.58;
      const glareMat2 = M(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
      const glare2 = new THREE.Mesh(G(new THREE.PlaneGeometry(0.95, 0.07)), glareMat2);
      glare2.position.set(-0.18, 0.4, 0.1);
      glare2.rotation.z = -0.58;
      dial.add(glare1, glare2);

      // ── Guide rings: the channel the squadron lives in, drawn faintly ──
      const guideMat = M(new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.22 }));
      const guideOuter = new THREE.Mesh(G(new THREE.TorusGeometry(1.14, 0.008, 8, 80)), guideMat);
      const guideInner = new THREE.Mesh(G(new THREE.TorusGeometry(0.52, 0.008, 8, 64)), guideMat);
      guideOuter.position.z = 0.02;
      guideInner.position.z = 0.02;
      dial.add(guideOuter, guideInner);

      // ── Graduations: BOTTOM arc, Manual lower-left → Automated lower-right ──
      const km = new THREE.Matrix4();
      const kq = new THREE.Quaternion();
      const zAxis = new THREE.Vector3(0, 0, 1);
      const tickMinor = new THREE.InstancedMesh(
        G(new THREE.BoxGeometry(0.02, 0.13, 0.02)),
        M(new THREE.MeshBasicMaterial({ color: 0x8d8574 })),
        21,
      );
      const tickMajor = new THREE.InstancedMesh(
        G(new THREE.BoxGeometry(0.034, 0.22, 0.03)),
        M(new THREE.MeshBasicMaterial({ color: INK })),
        4,
      );
      let mi = 0, ma = 0;
      for (let i = 0; i < 25; i++) {
        const a = ARC_START + (i / 24) * ARC_SPAN;
        const major = i % 8 === 0;
        const r = major ? 1.6 : 1.65;
        kq.setFromAxisAngle(zAxis, a + Math.PI / 2);
        km.compose(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.1), kq, new THREE.Vector3(1, 1, 1));
        (major ? tickMajor : tickMinor).setMatrixAt(major ? ma++ : mi++, km);
      }
      dial.add(tickMinor, tickMajor);

      // ── Needle: vermilion, riding the bottom arc ──
      const needleGroup = new THREE.Group();
      const needle = new THREE.Mesh(
        G(new THREE.ConeGeometry(0.068, 0.3, 4)),
        M(new THREE.MeshBasicMaterial({ color: VERM })),
      );
      needle.position.set(0, 1.42, 0.12);
      needle.rotation.z = Math.PI;
      needleGroup.add(needle);
      dial.add(needleGroup);

      // ── The squadron: two-tone folds in the site's colours ──
      const dartGeo = G(new THREE.BufferGeometry());
      dartGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [0, 1, 0, -0.62, -0.75, 0.2, 0, -0.45, 0, 0, 1, 0, 0, -0.45, 0, 0.62, -0.75, 0.2],
          3,
        ),
      );
      const shade = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78];
      dartGeo.setAttribute("color", new THREE.Float32BufferAttribute(shade, 3));
      const darts = new THREE.InstancedMesh(
        dartGeo,
        M(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true })),
        N_DARTS,
      );
      darts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      dial.add(darts);
      const phases = new Float32Array(N_DARTS);
      const activity = new Float32Array(N_DARTS);
      const HOME = new Float32Array(N_DARTS);
      for (let i = 0; i < N_DARTS; i++) {
        HOME[i] = (i / N_DARTS) * Math.PI * 2;
        phases[i] = HOME[i];
      }
      const baseCols = DART_COLORS.map((c) => new THREE.Color(c));
      const dimOf = baseCols.map((c) =>
        new THREE.Color().setRGB(
          c.r + (PAPER.r - c.r) * 0.6,
          c.g + (PAPER.g - c.g) * 0.6,
          c.b + (PAPER.b - c.b) * 0.6,
        ),
      );
      const col = new THREE.Color();

      // ── The shadow beneath: a soft breath of ink on the paper ──
      const shCanvas = document.createElement("canvas");
      shCanvas.width = 256;
      shCanvas.height = 64;
      const shCtx = shCanvas.getContext("2d")!;
      const grad = shCtx.createRadialGradient(128, 32, 4, 128, 32, 120);
      grad.addColorStop(0, "rgba(26,23,19,0.55)");
      grad.addColorStop(0.55, "rgba(26,23,19,0.18)");
      grad.addColorStop(1, "rgba(26,23,19,0)");
      shCtx.save();
      shCtx.scale(1, 0.26);
      shCtx.translate(0, 96);
      shCtx.fillStyle = grad;
      shCtx.fillRect(0, -128, 256, 320);
      shCtx.restore();
      const shTex = new THREE.CanvasTexture(shCanvas);
      texs.push(shTex);
      const shadow = new THREE.Mesh(
        G(new THREE.PlaneGeometry(3.6, 0.9)),
        M(new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.5, depthWrite: false })),
      );
      shadow.position.set(0, -2.45, -0.4);
      scene.add(shadow);

      // ── Dial state ──
      let v = DETENTS[1];
      let target = v;
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
      const onDown = (e: PointerEvent) => {
        dragging = true; holdOff = 8; dragStartX = e.clientX; dragStartV = v;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        target = Math.min(1, Math.max(0, dragStartV + (e.clientX - dragStartX) / 240));
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        const d = snap(target);
        target = DETENTS[d]; autoIdx = d; setDetent(d);
      };
      if (!reduceMotion) {
        renderer.domElement.style.pointerEvents = "auto";
        renderer.domElement.style.cursor = "grab";
        renderer.domElement.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
      }

      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const step = (dt: number, t: number) => {
        if (!dragging) {
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

        needleGroup.rotation.z = (ARC_START + v * ARC_SPAN) - Math.PI / 2;

        // suspended: a slow bob and sway, the shadow answering underneath
        const bob = Math.sin(t * 0.5) * 0.05;
        dial.position.y = bob;
        dial.rotation.y = Math.sin(t * 0.26) * 0.12;
        dial.rotation.x = -0.34 + Math.sin(t * 0.17) * 0.04;
        const shBreathe = 1 - (bob + 0.05) * 1.6;
        shadow.scale.set(shBreathe, shBreathe, 1);
        (shadow.material as import("three").MeshBasicMaterial).opacity = 0.36 + shBreathe * 0.14;

        const activeF = 3 + v * (N_DARTS - 3);
        for (let i = 0; i < N_DARTS; i++) {
          const targetA = Math.min(1, Math.max(0, activeF - i));
          activity[i] += (targetA - activity[i]) * Math.min(1, dt * 3);
          const act = activity[i];
          if (act > 0.05) {
            phases[i] -= (0.16 + v * 1.15) * act * dt; // clockwise, noses forward
          } else {
            let dphi = HOME[i] - (phases[i] % (Math.PI * 2));
            while (dphi > Math.PI) dphi -= Math.PI * 2;
            while (dphi < -Math.PI) dphi += Math.PI * 2;
            phases[i] += dphi * Math.min(1, dt * 2);
          }
          const r = 0.83 + Math.sin(phases[i] * 3 + i) * 0.03 * act;
          q.setFromAxisAngle(zAxis, phases[i] + Math.PI);
          const s = 0.15 * (0.74 + 0.26 * act);
          m4.compose(
            new THREE.Vector3(Math.cos(phases[i]) * r, Math.sin(phases[i]) * r, 0.04),
            q,
            new THREE.Vector3(s, s, s),
          );
          darts.setMatrixAt(i, m4);
          col.copy(dimOf[i]).lerp(baseCols[i], act);
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
      let simT = 0, raf = 0, running = false;
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
        for (let k = 0; k < 60; k++) step(0.033, k * 0.033);
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
        texs.forEach((tx) => tx.dispose());
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
        fig. 2 · the dial. drag it.
      </div>
    </div>
  );
}
