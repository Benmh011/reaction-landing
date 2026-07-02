"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Automation Dial, second machining.
 *
 * A walnut-bodied instrument: procedurally grained wood barrel, cream face,
 * a brass bezel around a recessed gallery sealed under glass. Inside the
 * glass, twelve paper darts live on an annular channel and never leave it.
 * The setting governs them: at Manual a skeleton crew circulates while the
 * rest sit parked at their home stations, dimmed; wind the dial and they
 * wake one by one, the stream quickening. The lead dart is vermilion, as is
 * the needle riding the graduations across the TOP arc (the first machining
 * put them at the bottom; y-up trigonometry, lesson learned).
 *
 * Wood and brass are lit (one soft key + ambient) so the grain and metal
 * read as materials; the darts stay flat sumi-e ink under the glass, whose
 * presence is sold by a tinted disc and a fixed crescent highlight that
 * moves with the dial's idle sway.
 *
 * Draggable with detent snap: Manual · Assisted · Drafted · Automated.
 * Auto-cycles when idle; yields to the visitor's hand. Reduced motion gets
 * a still frame; no WebGL gets an SVG; off-screen pauses everything.
 */

const DETENTS = [0, 1 / 3, 2 / 3, 1];
const LABELS = ["Manual", "Assisted", "Drafted", "Automated"];
const N_DARTS = 12;
const ARC_START = Math.PI * 0.82; // upper-left …
const ARC_SPAN = Math.PI * 0.64; // … sweeping to upper-right

const INK = 0x1a1713;
const CREAM = 0xeee9dc;
const WELL = 0xe2dccb;
const BRASS = 0xb08d4a;
const BRASS_LIGHT = 0xd2af69;
const VERM = 0xc93a17;
const PAPER = { r: 247 / 255, g: 244 / 255, b: 236 / 255 };

/** Procedural walnut: horizontal grain streaks that wrap the barrel. */
function makeWoodCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#4a3626";
  ctx.fillRect(0, 0, 512, 256);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tones = ["#5e4630", "#3e2c1e", "#6c5238", "#38281c", "#544029"];
  for (let i = 0; i < 120; i++) {
    const y0 = rand() * 256;
    const amp = 1 + rand() * 4;
    const wl = 40 + rand() * 140;
    const ph = rand() * Math.PI * 2;
    ctx.strokeStyle = tones[(i * 13) % tones.length];
    ctx.globalAlpha = 0.25 + rand() * 0.4;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const y = y0 + Math.sin((x / wl) * Math.PI * 2 + ph) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // a few subtle knots
  for (let k = 0; k < 3; k++) {
    const x = rand() * 512, y = rand() * 256;
    for (let r = 10; r > 1; r -= 2.5) {
      ctx.strokeStyle = k % 2 ? "#38281c" : "#5e4630";
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  return c;
}

function StaticFallback() {
  return (
    <svg viewBox="-120 -120 240 240" width="100%" aria-hidden="true" focusable="false" style={{ display: "block" }}>
      <circle r="110" fill="#4a3626" />
      <circle r="88" fill="#eee9dc" />
      <circle r="62" fill="#b08d4a" />
      <circle r="56" fill="#e2dccb" />
      <path d="M 0 -84 L 6 -60 L -6 -60 Z" fill="#c93a17" transform="rotate(20)" />
      {[...Array(9)].map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <path key={i} d="M0 -7 L4.5 5 L0 2.5 L-4.5 5 Z" transform={`translate(${Math.cos(a) * 40} ${Math.sin(a) * 40}) rotate(${(a * 180) / Math.PI + 180})`} fill={i === 0 ? "#c93a17" : "#1a1713"} />;
      })}
      <circle r="56" fill="#dfe9ee" opacity="0.25" />
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

      // Material light: soft, warm, enough to read grain and brass.
      scene.add(new THREE.AmbientLight(0xfff6e8, 0.95));
      const key = new THREE.DirectionalLight(0xffffff, 0.85);
      key.position.set(2.4, 3.2, 4.5);
      scene.add(key);

      const dial = new THREE.Group();
      dial.rotation.x = -0.4;
      scene.add(dial);

      const mats: import("three").Material[] = [];
      const geos: import("three").BufferGeometry[] = [];
      const texs: import("three").Texture[] = [];
      const G = <T extends import("three").BufferGeometry>(g: T): T => { geos.push(g); return g; };

      // ── Walnut barrel ──
      const woodTex = new THREE.CanvasTexture(makeWoodCanvas());
      woodTex.wrapS = THREE.RepeatWrapping;
      woodTex.colorSpace = THREE.SRGBColorSpace;
      texs.push(woodTex);
      const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0.05 });
      mats.push(woodMat);
      const body = new THREE.Mesh(G(new THREE.CylinderGeometry(2.2, 2.2, 0.55, 96)), woodMat);
      body.rotation.x = Math.PI / 2;
      dial.add(body);

      // grip ridges, carved from the same timber (darker)
      const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x33241a, roughness: 0.8 });
      mats.push(ridgeMat);
      const ridges = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.05, 0.1, 0.57)), ridgeMat, 40);
      const km = new THREE.Matrix4();
      const kq = new THREE.Quaternion();
      const zAxis = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        kq.setFromAxisAngle(zAxis, a);
        km.compose(new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0), kq, new THREE.Vector3(1, 1, 1));
        ridges.setMatrixAt(i, km);
      }
      dial.add(ridges);

      // ── Cream face ──
      const faceMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.9 });
      mats.push(faceMat);
      const face = new THREE.Mesh(G(new THREE.CylinderGeometry(1.94, 1.94, 0.1, 96)), faceMat);
      face.rotation.x = Math.PI / 2;
      face.position.z = 0.3;
      dial.add(face);

      // ── Graduations, TOP arc ──
      const tickMinorMat = new THREE.MeshBasicMaterial({ color: 0x8d8574 });
      const tickMajorMat = new THREE.MeshBasicMaterial({ color: INK });
      mats.push(tickMinorMat, tickMajorMat);
      const tickMinor = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.02, 0.14, 0.02)), tickMinorMat, 21);
      const tickMajor = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.035, 0.24, 0.03)), tickMajorMat, 4);
      let mi = 0, ma = 0;
      for (let i = 0; i < 25; i++) {
        const a = ARC_START - (i / 24) * ARC_SPAN;
        const major = i % 8 === 0;
        const r = major ? 1.66 : 1.71;
        kq.setFromAxisAngle(zAxis, a + Math.PI / 2);
        km.compose(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.37), kq, new THREE.Vector3(1, 1, 1));
        (major ? tickMajor : tickMinor).setMatrixAt(major ? ma++ : mi++, km);
      }
      dial.add(tickMinor, tickMajor);

      // ── Needle ──
      const needleGroup = new THREE.Group();
      const needleMat = new THREE.MeshBasicMaterial({ color: VERM });
      mats.push(needleMat);
      const needle = new THREE.Mesh(G(new THREE.ConeGeometry(0.07, 0.32, 4)), needleMat);
      needle.position.set(0, 1.48, 0.4);
      needle.rotation.z = Math.PI;
      needleGroup.add(needle);
      dial.add(needleGroup);

      // ── Brass bezel around the gallery ──
      const brassMat = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.68, roughness: 0.34 });
      const brassLightMat = new THREE.MeshStandardMaterial({ color: BRASS_LIGHT, metalness: 0.6, roughness: 0.3 });
      mats.push(brassMat, brassLightMat);
      const bezel = new THREE.Mesh(G(new THREE.TorusGeometry(1.26, 0.075, 20, 72)), brassMat);
      bezel.position.z = 0.4;
      const bezelIn = new THREE.Mesh(G(new THREE.TorusGeometry(1.17, 0.028, 16, 72)), brassLightMat);
      bezelIn.position.z = 0.43;
      dial.add(bezel, bezelIn);

      // ── Gallery well + hub ──
      const wellMat = new THREE.MeshStandardMaterial({ color: WELL, roughness: 0.95 });
      mats.push(wellMat);
      const well = new THREE.Mesh(G(new THREE.CylinderGeometry(1.17, 1.17, 0.08, 72)), wellMat);
      well.rotation.x = Math.PI / 2;
      well.position.z = 0.3;
      const hub = new THREE.Mesh(G(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 48)), faceMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.32;
      dial.add(well, hub);

      // ── Darts under glass ──
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
      const HOME = new Float32Array(N_DARTS);
      for (let i = 0; i < N_DARTS; i++) {
        HOME[i] = (i / N_DARTS) * Math.PI * 2;
        phases[i] = HOME[i];
      }

      // ── Glass: tinted disc + crescent highlights riding the dial ──
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xdfe9ee, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0,
      });
      mats.push(glassMat);
      const glass = new THREE.Mesh(G(new THREE.CylinderGeometry(1.165, 1.165, 0.04, 72)), glassMat);
      glass.rotation.x = Math.PI / 2;
      glass.position.z = 0.47;
      dial.add(glass);
      const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
      const hiMat2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
      mats.push(hiMat, hiMat2);
      const hi = new THREE.Mesh(G(new THREE.TorusGeometry(0.98, 0.022, 8, 48, Math.PI * 0.34)), hiMat);
      hi.rotation.z = Math.PI * 0.62;
      hi.position.z = 0.5;
      const hi2 = new THREE.Mesh(G(new THREE.TorusGeometry(0.82, 0.014, 8, 40, Math.PI * 0.2)), hiMat2);
      hi2.rotation.z = Math.PI * 0.7;
      hi2.position.z = 0.5;
      dial.add(hi, hi2);

      // ── Colours for dart activity blend ──
      const col = new THREE.Color();
      const inkC = new THREE.Color(INK);
      const vermC = new THREE.Color(VERM);
      const dimC = new THREE.Color().setRGB(
        inkC.r + (PAPER.r - inkC.r) * 0.58,
        inkC.g + (PAPER.g - inkC.g) * 0.58,
        inkC.b + (PAPER.b - inkC.b) * 0.58,
      );

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

        needleGroup.rotation.z = (ARC_START - v * ARC_SPAN) - Math.PI / 2;

        dial.rotation.y = Math.sin(t * 0.26) * 0.1;
        dial.rotation.x = -0.4 + Math.sin(t * 0.17) * 0.04;

        const activeF = 3 + v * (N_DARTS - 3);
        for (let i = 0; i < N_DARTS; i++) {
          const targetA = Math.min(1, Math.max(0, activeF - i));
          activity[i] += (targetA - activity[i]) * Math.min(1, dt * 3);
          const act = activity[i];
          if (act > 0.05) {
            phases[i] += (0.16 + v * 1.15) * act * dt;
          } else {
            // parked darts glide home to their station
            let dphi = HOME[i] - (phases[i] % (Math.PI * 2));
            while (dphi > Math.PI) dphi -= Math.PI * 2;
            while (dphi < -Math.PI) dphi += Math.PI * 2;
            phases[i] += dphi * Math.min(1, dt * 2);
          }
          const r = 0.82 + Math.sin(phases[i] * 3 + i) * 0.03 * act;
          q.setFromAxisAngle(zAxis, phases[i] + Math.PI);
          const s = 0.15 * (0.74 + 0.26 * act);
          m4.compose(
            new THREE.Vector3(Math.cos(phases[i]) * r, Math.sin(phases[i]) * r, 0.37),
            q,
            new THREE.Vector3(s, s, s),
          );
          darts.setMatrixAt(i, m4);
          col.copy(dimC).lerp(i === 0 ? vermC : inkC, act);
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
