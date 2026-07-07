"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Archive — everything the practice knows, and the formation that
 * works from it.
 *
 * A monolith of strata — fifty-six thin paper layers with ink edges,
 * every one a slightly different cut — turns slowly and breathes at the
 * centre of the frame, suspended against the page. Around it, the
 * captains' folded darts fly inclined orbits: four for a clinic, six for
 * a firm, five for a trade, counter-rotating shells that reform as each
 * archetype gives way to the next. Twice a phase, a dart dives — skims
 * the archive — and a wave of its colour sweeps up through the strata:
 * the answer, read out of the record. Three dashed rings turn slowly
 * around everything, an armillary boundary — on your infrastructure,
 * nothing leaves.
 *
 * Suspended in space: no ground, no floor, no box — generous margins on
 * every side, framed for this component's own aspect. Three.js on the
 * Flock's patterns: import guards, paper MeshBasicMaterials, instanced
 * strata with inverted-hull ink outlines, DPR capped, pauses off-screen,
 * reduced motion holds a still of the clinic formation.
 */

const INKC = 0x1a1713;
const PAPER2C = 0xfdfbf5;
const BOUNDC = 0x0d5a40;
const CAPTAINS = [0xc93a17, 0x2565aa, 0x1b3656, 0x0d5a40];

// ── shared math (validated in preview) ──
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rng = mulberry32(7);

const NLAYER = 56;
const LAYERS = Array.from({ length: NLAYER }, () => ({ r: 0.78 + rng() * 0.16, rot: rng() * Math.PI }));
const L_TH = 0.055, L_GAP = 0.028;
const STACK_H = NLAYER * (L_TH + L_GAP);
const Y0 = -STACK_H / 2;

const PHASES = [
  { caption: "A formation for a clinic", n: 4 },
  { caption: "A formation for a firm", n: 6 },
  { caption: "A formation for a trade", n: 5 },
];
const MAXD = 6;
const T_PHASE = 9.0, T_REFORM = 1.3;
const T_CYCLE = T_PHASE * 3;
const DIVES = [2.4, 5.7];
const DIVE_T = 1.7;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function orbitParams(f: number, d: number, n: number) {
  const az = (d / n) * Math.PI * 2 + f * 0.7;
  const incl = 0.42 + 0.5 * ((d * 2.39) % 1);
  const radius = 2.55 + 0.5 * ((d * 1.71 + f) % 1);
  const speed = (0.55 + 0.3 * ((d * 3.1) % 1)) * (d % 2 ? -1 : 1);
  const phase0 = d * 2.1 + f;
  return { az, incl, radius, speed, phase0 };
}
function orbitBasis(az: number, incl: number) {
  const nx = Math.sin(incl) * Math.cos(az);
  const ny = Math.cos(incl);
  const nz = Math.sin(incl) * Math.sin(az);
  let ex = nz, ey = 0, ez = -nx;
  const l = Math.hypot(ex, ey, ez) || 1;
  ex /= l; ey /= l; ez /= l;
  const fx = ny * ez - nz * ey, fy = nz * ex - nx * ez, fz = nx * ey - ny * ex;
  return { e1: [ex, ey, ez] as const, e2: [fx, fy, fz] as const, n: [nx, ny, nz] as const };
}

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 100" width="100%" aria-hidden="true" style={{ display: "block", opacity: 0.9 }}>
      {Array.from({ length: 9 }, (_, i) => (
        <ellipse key={i} cx="50" cy={30 + i * 5} rx={13 + (i % 3)} ry="2.6" fill="#fdfbf5" stroke="#1a1713" strokeOpacity="0.6" />
      ))}
      <ellipse cx="50" cy="52" rx="40" ry="16" fill="none" stroke="#0d5a40" strokeOpacity="0.5" strokeDasharray="1 4" transform="rotate(-18 50 52)" />
    </svg>
  );
}

export default function PracticeArchive() {
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
      const camera = new THREE.PerspectiveCamera(40, 0.92, 0.1, 60);
      camera.position.set(0, 0.7, 14.6);
      camera.lookAt(0, 0, 0);

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

      // ── the monolith: instanced strata + inverted-hull ink edges ──
      const layerGeo = new THREE.CylinderGeometry(1, 1, L_TH, 28);
      const hullGeo = new THREE.CylinderGeometry(1, 1, L_TH + 0.05, 28);
      const layerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const hullMat = new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide });
      const layers = new THREE.InstancedMesh(layerGeo, layerMat, NLAYER);
      const hulls = new THREE.InstancedMesh(hullGeo, hullMat, NLAYER);
      layers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      hulls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const paperCol = new THREE.Color(PAPER2C);
      const scanCol = new THREE.Color();
      const mixCol = new THREE.Color();
      for (let i = 0; i < NLAYER; i++) layers.setColorAt(i, paperCol);
      if (layers.instanceColor) layers.instanceColor.needsUpdate = true;
      scene.add(hulls);
      scene.add(layers);

      // ── the darts: the Flock's fold, orbiting ──
      const dartGeo = new THREE.BufferGeometry();
      dartGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [0, 1.0, 0, -0.62, -0.75, 0.2, 0, -0.45, 0, 0, 1.0, 0, 0, -0.45, 0, 0.62, -0.75, 0.2],
          3,
        ),
      );
      const shade = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78];
      dartGeo.setAttribute("color", new THREE.Float32BufferAttribute(shade, 3));
      const dartMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true });
      const darts = new THREE.InstancedMesh(dartGeo, dartMat, MAXD);
      darts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const col = new THREE.Color();
      for (let d = 0; d < MAXD; d++) {
        col.setHex(CAPTAINS[d % 4]);
        darts.setColorAt(d, col);
      }
      if (darts.instanceColor) darts.instanceColor.needsUpdate = true;
      scene.add(darts);

      // ── the armillary boundary: three oblique dashed rings ──
      const armillary = new THREE.Group();
      const ringGeos: import("three").BufferGeometry[] = [];
      const ringMats: import("three").LineDashedMaterial[] = [];
      [{ tilt: 0.55, az: 2.2 }, { tilt: 1.05, az: 0.6 }, { tilt: 1.05, az: -1.4 }].forEach((rg) => {
        const pts: number[] = [];
        for (let k = 0; k <= 140; k++) {
          const a = (k / 140) * Math.PI * 2;
          pts.push(Math.cos(a) * 4.25, 0, Math.sin(a) * 4.25);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        const m = new THREE.LineDashedMaterial({ color: BOUNDC, transparent: true, opacity: 0.5, dashSize: 0.05, gapSize: 0.5 });
        const line = new THREE.Line(g, m);
        line.computeLineDistances();
        line.rotation.set(rg.tilt, rg.az, 0, "YXZ");
        armillary.add(line);
        ringGeos.push(g); ringMats.push(m);
      });
      scene.add(armillary);

      // ── per-frame ──
      const m4 = new THREE.Matrix4();
      const vP = new THREE.Vector3(), vT = new THREE.Vector3(), vN = new THREE.Vector3(), vX = new THREE.Vector3(), vY = new THREE.Vector3(), vZ = new THREE.Vector3();
      const sV = new THREE.Vector3();

      const writeFrame = (t: number) => {
        const tc = ((t % T_CYCLE) + T_CYCLE) % T_CYCLE;
        const f = Math.floor(tc / T_PHASE);
        const u = tc - f * T_PHASE;
        const n = PHASES[f].n;
        const prevF = (f + 2) % 3;
        const prevN = PHASES[prevF].n;
        const k = smooth(u / T_REFORM);

        armillary.rotation.y = t * 0.04;

        // scan wave from the active dive
        let scanY = Number.NaN, scanPower = 0, scanHex = CAPTAINS[0];
        for (let idx = 0; idx < DIVES.length; idx++) {
          const ds = DIVES[idx];
          if (u >= ds + 0.35 && u < ds + DIVE_T + 0.45) {
            const wp = (u - ds - 0.35) / (DIVE_T + 0.1);
            scanY = Y0 + STACK_H * wp;
            scanPower = Math.sin(Math.PI * Math.min(1, wp));
            scanHex = CAPTAINS[((f + idx * 2 + 1) % n) % 4];
          }
        }
        scanCol.setHex(scanHex);

        // strata: breathe, turn, and take the scan's colour
        const yawM = t * 0.12;
        for (let i = 0; i < NLAYER; i++) {
          const L = LAYERS[i];
          const breathe = Math.sin(t * 0.7 - i * 0.22) * 0.0065;
          const y = Y0 + i * (L_TH + L_GAP) + breathe * i * 0.1;
          m4.makeRotationY(yawM + L.rot);
          sV.set(L.r, 1, L.r);
          m4.scale(sV);
          m4.setPosition(0, y, 0);
          layers.setMatrixAt(i, m4);
          // hull: slightly padded radius
          m4.makeRotationY(yawM + L.rot);
          sV.set(L.r + 0.035, 1, L.r + 0.035);
          m4.scale(sV);
          m4.setPosition(0, y, 0);
          hulls.setMatrixAt(i, m4);

          let mix = 0;
          if (!Number.isNaN(scanY)) {
            const dd = Math.abs(y - scanY);
            if (dd < 0.5) mix = (1 - dd / 0.5) * scanPower;
          }
          mixCol.copy(paperCol).lerp(scanCol, mix * 0.9);
          layers.setColorAt(i, mixCol);
        }
        layers.instanceMatrix.needsUpdate = true;
        hulls.instanceMatrix.needsUpdate = true;
        if (layers.instanceColor) layers.instanceColor.needsUpdate = true;

        // darts on their orbits
        for (let d = 0; d < MAXD; d++) {
          const pNow = orbitParams(f, d, n);
          const pPrev = orbitParams(prevF, d, Math.max(prevN, 1));
          const mixP = (a: number, b: number) => a + (b - a) * k;
          const az = mixP(pPrev.az, pNow.az), incl = mixP(pPrev.incl, pNow.incl);
          let radius = mixP(pPrev.radius, pNow.radius);
          const speed = mixP(pPrev.speed, pNow.speed), phase0 = mixP(pPrev.phase0, pNow.phase0);

          let diveP = 0;
          DIVES.forEach((ds, idx) => {
            if ((f + idx * 2 + 1) % n === d && u >= ds && u < ds + DIVE_T) {
              diveP = Math.sin(Math.PI * ((u - ds) / DIVE_T));
            }
          });
          radius *= 1 - 0.58 * diveP;

          const { e1, e2, n: nrm } = orbitBasis(az, incl);
          const psi = phase0 + speed * t;
          const c = Math.cos(psi), s = Math.sin(psi);
          vP.set(
            radius * (c * e1[0] + s * e2[0]),
            radius * (c * e1[1] + s * e2[1]) * 0.92,
            radius * (c * e1[2] + s * e2[2]),
          );
          const dir = Math.sign(speed || 1);
          vT.set(
            (-s * e1[0] + c * e2[0]) * dir,
            (-s * e1[1] + c * e2[1]) * 0.92 * dir,
            (-s * e1[2] + c * e2[2]) * dir,
          ).normalize();
          vN.set(nrm[0], nrm[1], nrm[2]);

          // presence across the reform
          const inNow = d < n, inPrev = d < prevN;
          const sc = (inNow ? (inPrev ? 1 : k) : inPrev ? 1 - k : 0) * (0.34 + 0.06 * diveP);

          vY.copy(vT);                       // nose along flight
          vZ.copy(vN);
          vX.crossVectors(vY, vZ).normalize();
          vZ.crossVectors(vX, vY);
          m4.makeBasis(vX, vY, vZ);
          sV.set(sc, sc, sc);
          m4.scale(sV);
          m4.setPosition(vP);
          darts.setMatrixAt(d, m4);
        }
        darts.instanceMatrix.needsUpdate = true;

        // caption crossfade
        const cap = captionRef.current;
        if (cap) {
          if (cap.dataset.f !== String(f) && u < 0.3) {
            cap.dataset.f = String(f);
            cap.textContent = PHASES[f].caption;
          }
          const inA = smooth(u / 0.5);
          const outA = 1 - smooth((u - (T_PHASE - 0.5)) / 0.5);
          cap.style.opacity = String(0.8 * Math.min(inA, outA));
        }
      };

      const clock = new THREE.Clock();
      let simT = 4.2; // wake with the clinic formation established
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
        writeFrame(4.6);
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
        layerGeo.dispose(); hullGeo.dispose(); layerMat.dispose(); hullMat.dispose();
        dartGeo.dispose(); dartMat.dispose();
        ringGeos.forEach((g) => g.dispose());
        ringMats.forEach((m) => m.dispose());
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
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
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
