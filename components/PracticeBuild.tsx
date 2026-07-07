"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Construction — the LMAS builds itself, differently, forever.
 *
 * Forty-eight paper panels with ink edges drift as a slow cloud around a
 * green core. Then they assemble: a hexagonal tower for a clinic; burst,
 * drift, and reassemble as a two-storey campus grid for a firm; burst
 * again and form a standing colonnade for a trade. During each hold a
 * captain-colour scanline sweeps the structure — the grounding pass —
 * and then the whole thing lets go and becomes something else. Built per
 * practice; no two the same, told as pure motion.
 *
 * A dashed green boundary turns slowly on the ground beneath everything —
 * on your infrastructure, nothing leaves.
 *
 * Three.js on the Flock's patterns: dynamic import with guards, paper
 * MeshBasicMaterials (no lighting, no gloss), instanced panels with an
 * inverted-hull ink outline, DPR capped, pauses off-screen, reduced
 * motion renders the tower standing.
 */

const INKC = 0x1a1713;
const PAPER2 = 0xfdfbf5;
const BOUNDC = 0x0d5a40;
const CAPTAINS = [0xc93a17, 0x2565aa, 0x1b3656, 0x0d5a40];

// ── shared layout math (validated in preview) ──
const NPANEL = 48;
const PANEL_W = 1.0, PANEL_H = 0.62;

const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rng = mulberry32(42);
const CLOUD = Array.from({ length: NPANEL }, () => {
  const a = rng() * Math.PI * 2;
  const r = 3.6 + rng() * 2.0;
  const y = 0.5 + rng() * 3.6;
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, ry: rng() * Math.PI * 2, rx: rng() * Math.PI };
});
const order = Array.from({ length: NPANEL }, (_, i) => i);
for (let i = NPANEL - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
const STAGGER = order.map((o) => o / NPANEL);

type Slot = { c: [number, number, number]; u: [number, number, number]; v: [number, number, number] };
const yawAxis = (a: number, k: number): [number, number, number] => [Math.cos(a) * k, 0, Math.sin(a) * k];

const towerSlots = (): Slot[] => {
  const slots: Slot[] = [];
  const R = 0.92, FH = 0.68;
  for (let fl = 0; fl < 8; fl++) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + (fl % 2 ? Math.PI / 6 : 0);
    slots.push({
      c: [Math.cos(a) * R, 0.34 + fl * FH, Math.sin(a) * R],
      u: yawAxis(a + Math.PI / 2, PANEL_W / 2),
      v: [0, PANEL_H / 2, 0],
    });
  }
  return slots;
};
const gridSlots = (): Slot[] => {
  const slots: Slot[] = [];
  const SX = 1.16, SZ = 0.8;
  for (let lvl = 0; lvl < 2; lvl++) for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 4; iz++) {
    slots.push({
      c: [(ix - 2.5) * SX + (lvl ? SX * 0.5 : 0), lvl ? 1.62 : 0.55, (iz - 1.5) * SZ + (lvl ? SZ * 0.5 : 0)],
      u: [PANEL_W / 2, 0, 0],
      v: [0, 0, PANEL_H / 2],
    });
  }
  return slots;
};
const ringSlots = (): Slot[] => {
  const slots: Slot[] = [];
  const R = 3.35;
  for (let k = 0; k < NPANEL; k++) {
    const a = (k / NPANEL) * Math.PI * 2;
    slots.push({
      c: [Math.cos(a) * R, k % 6 === 0 ? 1.06 : 0.34, Math.sin(a) * R],
      u: yawAxis(a + Math.PI / 2, PANEL_W / 2),
      v: [0, PANEL_H / 2, 0],
    });
  }
  return slots;
};

const ARCHES = [
  { caption: "A formation for a clinic", slots: towerSlots(), scanR: 1.6, scanH: 5.9 },
  { caption: "A formation for a firm", slots: gridSlots(), scanR: 4.1, scanH: 2.4 },
  { caption: "A formation for a trade", slots: ringSlots(), scanR: 3.9, scanH: 2.0 },
];

const T_ASSEMBLE = 2.4, T_HOLD = 3.0, T_BURST = 1.6, T_GAP = 0.6;
const T_ARCH = T_ASSEMBLE + T_HOLD + T_BURST + T_GAP;
const FLIGHT = 0.9;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 100" width="100%" aria-hidden="true" style={{ display: "block", opacity: 0.9 }}>
      {[0, 1, 2, 3].map((fl) => (
        <g key={fl}>
          <rect x={38} y={26 + fl * 14} width={24} height={11} fill="#fdfbf5" stroke="#1a1713" strokeOpacity="0.7" />
        </g>
      ))}
      <ellipse cx="50" cy="88" rx="34" ry="8" fill="none" stroke="#0d5a40" strokeOpacity="0.55" strokeDasharray="1 4" />
    </svg>
  );
}

export default function PracticeBuild() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

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
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
      camera.position.set(7.8, 5.0, 9.6);
      camera.lookAt(0, 1.55, 0);

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

      // ── the rig: everything that yaws together ──
      const rig = new THREE.Group();
      scene.add(rig);

      // panels: instanced faces + inverted-hull ink outline
      const faceGeo = new THREE.BoxGeometry(PANEL_W, PANEL_H, 0.05);
      const hullGeo = new THREE.BoxGeometry(PANEL_W + 0.055, PANEL_H + 0.055, 0.05 + 0.055);
      const faceMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const hullMat = new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide });
      const faces = new THREE.InstancedMesh(faceGeo, faceMat, NPANEL);
      const hulls = new THREE.InstancedMesh(hullGeo, hullMat, NPANEL);
      faces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      hulls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const col = new THREE.Color();
      for (let i = 0; i < NPANEL; i++) {
        const accent = i % 12 === 5 ? CAPTAINS[Math.floor(i / 12) % 4] : PAPER2;
        col.setHex(accent);
        faces.setColorAt(i, col);
      }
      if (faces.instanceColor) faces.instanceColor.needsUpdate = true;
      rig.add(hulls);
      rig.add(faces);

      // the core: green octahedron with ink hull
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: BOUNDC }));
      const coreHull = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide }));
      core.position.set(0, 1.15, 0);
      coreHull.position.copy(core.position);
      rig.add(coreHull);
      rig.add(core);

      // ground disc + sovereignty boundary
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(5.15, 64),
        new THREE.MeshBasicMaterial({ color: INKC, transparent: true, opacity: 0.045 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.001;
      scene.add(ground);

      const bpts: number[] = [];
      for (let k = 0; k <= 128; k++) {
        const a = (k / 128) * Math.PI * 2;
        bpts.push(Math.cos(a) * 5.0, 0.02, Math.sin(a) * 5.0);
      }
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute("position", new THREE.Float32BufferAttribute(bpts, 3));
      const bMat = new THREE.LineDashedMaterial({ color: BOUNDC, transparent: true, opacity: 0.55, dashSize: 0.06, gapSize: 0.42 });
      const boundary = new THREE.Line(bGeo, bMat);
      boundary.computeLineDistances();
      scene.add(boundary);

      // the scanline: a colour ring that sweeps the structure during hold
      const spts: number[] = [];
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        spts.push(Math.cos(a), 0, Math.sin(a));
      }
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute("position", new THREE.Float32BufferAttribute(spts, 3));
      const sMat = new THREE.LineBasicMaterial({ color: CAPTAINS[0], transparent: true, opacity: 0 });
      const scan = new THREE.Line(sGeo, sMat);
      scene.add(scan);

      // ── per-frame panel state (ported verbatim from the validated preview) ──
      const T_CYCLE = T_ARCH * 3;
      const vU = new THREE.Vector3(), vV = new THREE.Vector3(), vX = new THREE.Vector3(), vY = new THREE.Vector3(), vZ = new THREE.Vector3();
      const m4 = new THREE.Matrix4();
      const pos = new THREE.Vector3();

      const writeFrame = (t: number) => {
        const tc = ((t % T_CYCLE) + T_CYCLE) % T_CYCLE;
        const f = Math.floor(tc / T_ARCH);
        const u = tc - f * T_ARCH;
        const arch = ARCHES[f];

        rig.rotation.y = t * 0.1;
        boundary.rotation.y = -t * 0.05;
        core.rotation.y = t * 0.35;
        core.rotation.x = Math.sin(t * 0.4) * 0.15;
        coreHull.rotation.copy(core.rotation);

        for (let i = 0; i < NPANEL; i++) {
          const slot = arch.slots[i];
          const cl = CLOUD[i];
          const drift = 0.14;
          const cx = cl.x + Math.sin(t * 0.35 + i) * drift;
          const cyy = cl.y + Math.sin(t * 0.28 + i * 2.1) * drift;
          const cz = cl.z + Math.cos(t * 0.31 + i * 1.3) * drift;

          let mix: number;
          if (u < T_ASSEMBLE) {
            const st = STAGGER[i] * (T_ASSEMBLE - FLIGHT);
            mix = smooth((u - st) / FLIGHT);
          } else if (u < T_ASSEMBLE + T_HOLD) {
            mix = 1;
          } else if (u < T_ASSEMBLE + T_HOLD + T_BURST) {
            const st = STAGGER[i] * (T_BURST - FLIGHT * 0.75);
            mix = 1 - smooth((u - T_ASSEMBLE - T_HOLD - st) / (FLIGHT * 0.75));
          } else {
            mix = 0;
          }

          // cloud basis (slow tumble)
          const ca = Math.cos(cl.ry + t * 0.12), sa = Math.sin(cl.ry + t * 0.12);
          const cb = Math.cos(cl.rx), sb = Math.sin(cl.rx);
          const cuX = ca * (PANEL_W / 2), cuY = sa * sb * (PANEL_W / 2), cuZ = sa * cb * (PANEL_W / 2);
          const cvX = -sa * sb * (PANEL_H / 2), cvY = cb * (PANEL_H / 2), cvZ = sa * 0.2 * (PANEL_H / 2);

          pos.set(cx + (slot.c[0] - cx) * mix, cyy + (slot.c[1] - cyy) * mix, cz + (slot.c[2] - cz) * mix);
          vU.set(cuX + (slot.u[0] - cuX) * mix, cuY + (slot.u[1] - cuY) * mix, cuZ + (slot.u[2] - cuZ) * mix);
          vV.set(cvX + (slot.v[0] - cvX) * mix, cvY + (slot.v[1] - cvY) * mix, cvZ + (slot.v[2] - cvZ) * mix);

          vX.copy(vU).normalize();
          vZ.crossVectors(vU, vV);
          if (vZ.lengthSq() < 1e-6) vZ.set(0, 1, 0);
          vZ.normalize();
          vY.crossVectors(vZ, vX);
          m4.makeBasis(vX, vY, vZ);
          m4.setPosition(pos);
          faces.setMatrixAt(i, m4);
          hulls.setMatrixAt(i, m4);
        }
        faces.instanceMatrix.needsUpdate = true;
        hulls.instanceMatrix.needsUpdate = true;

        // scanline during hold
        if (u > T_ASSEMBLE + 0.5 && u < T_ASSEMBLE + 2.6) {
          const sp = (u - T_ASSEMBLE - 0.5) / 2.1;
          scan.position.y = 0.15 + arch.scanH * sp;
          scan.scale.set(arch.scanR, 1, arch.scanR);
          sMat.color.setHex(CAPTAINS[f % 4]);
          sMat.opacity = 0.75 * (1 - Math.abs(sp * 2 - 1) * 0.45);
        } else {
          sMat.opacity = 0;
        }

        // caption crossfade
        const cap = captionRef.current;
        if (cap && cap.dataset.f !== String(f)) {
          const local = u;
          if (local < 0.25 || cap.dataset.f === undefined) {
            cap.dataset.f = String(f);
            cap.textContent = arch.caption;
          }
        }
        if (cap) {
          const inA = smooth(u / 0.5);
          const outA = 1 - smooth((u - (T_ARCH - 0.5)) / 0.5);
          cap.style.opacity = String(0.8 * Math.min(inA, outA));
        }
      };

      const clock = new THREE.Clock();
      let simT = 2.6; // wake mid-first-assembly so the page never opens on an empty cloud
      let raf = 0, running = false;
      const loop = () => {
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.033);
        simT += dt;
        writeFrame(simT);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      const start = () => { if (!running && !reduceMotion) { running = true; clock.getDelta(); raf = requestAnimationFrame(loop); } };
      const stop = () => { running = false; cancelAnimationFrame(raf); };

      let cleanupObservers: (() => void) | null = null;
      if (reduceMotion) {
        writeFrame(3.4); // the tower, standing
        renderer.render(scene, camera);
        if (captionRef.current) captionRef.current.style.opacity = "0.8";
      } else {
        const io = new IntersectionObserver((es) => (es[0]?.isIntersecting ? start() : stop()), { threshold: 0.05 });
        io.observe(host);
        const onVis = () => (document.visibilityState === "hidden" ? stop() : start());
        document.addEventListener("visibilitychange", onVis);
        cleanupObservers = () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
      }

      (host as HTMLDivElement & { __rxDispose?: () => void }).__rxDispose = () => {
        stop();
        cleanupObservers?.();
        ro.disconnect();
        renderer.dispose();
        faceGeo.dispose(); hullGeo.dispose();
        faceMat.dispose(); hullMat.dispose();
        core.geometry.dispose(); (core.material as import("three").Material).dispose();
        coreHull.geometry.dispose(); (coreHull.material as import("three").Material).dispose();
        ground.geometry.dispose(); (ground.material as import("three").Material).dispose();
        bGeo.dispose(); bMat.dispose();
        sGeo.dispose(); sMat.dispose();
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
    <div style={{ width: "100%", maxWidth: 380, margin: "0 auto" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "0.92" }} aria-hidden="true">
        {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />}
      </div>
      <div style={{ textAlign: "center", marginTop: 2 }}>
        <div
          ref={captionRef}
          className="mono"
          style={{ fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text)", opacity: 0.8, transition: "opacity 0.2s linear", minHeight: "1em" }}
        >
          A formation for a clinic
        </div>
        <div className="mono" style={{ fontSize: "0.58rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "#0d5a40", opacity: 0.85, marginTop: 7 }}>
          On your infrastructure
        </div>
      </div>
    </div>
  );
}
