"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flock, fourth movement — the insignia, properly flown.
 *
 * Three captains: vermilion, blue, emerald. Each is invisible until its
 * moment, then grows out of the coloured tittle of its own lowercase i and
 * flies the drill: straight up off the letter, arcing round to the LEFT,
 * then swinging back to approach its station from the left, flying
 * rightward — so the nose is already pointing the way it will dock, and the
 * pose blends in smoothly instead of snapping. The station: a layered pile
 * (red foremost, blue and green tails protruding behind) sitting in line
 * with the hero's buttons, a comfortable distance right of the "Our ethos"
 * button — measured live from the DOM so it tracks the real layout.
 *
 * Trails stream in flight and reel in on docking. Once formed, the mark
 * breathes as one. Reduced motion renders the finished insignia.
 */

const CAPTAINS = [
  { pad: "verm", color: 0xc93a17 },
  { pad: "blue", color: 0x2565aa },
  { pad: "green", color: 0x0d5a40 },
];
const N = 3;
const LAUNCH_AT = 1.7; //  dots fade ≈1.15s; wheels-up after
const STAGGER = 0.14; //   captains leave their letters in sequence
const TRAIL_LEN = 26;
const TRAIL_W = 0.085; // ribbon half-width at the dart, tapering to nothing
const FLY_K = 0.17;
const DOCK_K = 0.26;
const LAYER_DX = 0.12; //  emblem layering: tails protrude behind red
const LAYER_DZ = 0.02;
const ANCHOR_GAP_PX = 44; // air between the mark's nose and the button it points at
const CRUISE = 1.8;
const PAPER = { r: 247 / 255, g: 244 / 255, b: 236 / 255 };

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 60" width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" style={{ display: "block", opacity: 0.95 }}>
      {["#0d5a40", "#2565aa", "#c93a17"].map((c, i) => (
        <path key={c} d="M 8 0 L -5 -3.4 L -2.4 0 L -5 3.4 Z" transform={`translate(${63.6 + i * 3.2} 26)`} fill={c} />
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
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 40);
      camera.position.set(0, 0, 8.4);

      let halfH = 3.56, halfW = 6.8;

      const ndc = new THREE.Vector3();
      const unproject = (px: number, py: number, out: import("three").Vector3) => {
        const rect = host.getBoundingClientRect();
        const nx = ((px - rect.left) / rect.width) * 2 - 1;
        const ny = -(((py - rect.top) / rect.height) * 2 - 1);
        ndc.set(nx, ny, 0.5).unproject(camera);
        const dir = ndc.sub(camera.position).normalize();
        const t = -camera.position.z / dir.z;
        out.copy(camera.position).addScaledVector(dir, t);
      };

      // ── The station: LEFT of the primary button, noses aimed straight at it.
      //    We unproject the point a small gap left of the button's edge, then
      //    back the red dart's centre off so its NOSE TIP lands on that point.
      const anchor = new THREE.Vector3(-2.2, -0.9, 0); // fallback
      const measureAnchor = () => {
        const el = host.closest("section")?.querySelector("[data-flock-anchor]");
        if (!el) return;
        const r = (el as HTMLElement).getBoundingClientRect();
        unproject(r.left - ANCHOR_GAP_PX, r.top + r.height / 2, anchor);
        anchor.x -= DOCK_K * 1.0; // centre sits one nose-length behind the tip
        anchor.x = Math.max(anchor.x, -halfW + 0.9); // never off the page edge
        anchor.z = 0;
      };

      const resize = () => {
        const r = host.getBoundingClientRect();
        const w = Math.max(1, r.width), h = Math.max(1, r.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        halfH = camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
        halfW = halfH * camera.aspect;
        measureAnchor();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const slot = (i: number, out: import("three").Vector3) => {
        out.set(anchor.x + (2 - i) * 0 - i * LAYER_DX, anchor.y, -i * LAYER_DZ);
        return out;
      };

      // ── Darts ──
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [0, 1.0, 0, -0.62, -0.75, 0.2, 0, -0.45, 0, 0, 1.0, 0, 0, -0.45, 0, 0.62, -0.75, 0.2],
          3,
        ),
      );
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.InstancedMesh(geo, mat, N);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const col = new THREE.Color();
      CAPTAINS.forEach((c, i) => {
        col.setHex(c.color);
        mesh.setColorAt(i, col);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);

      // ── State ──
      const pos = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const vel = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const activeAt = [0, 1, 2].map((i) => LAUNCH_AT + i * STAGGER);
      const airborne = [false, false, false];
      const docked = [false, false, false];
      const dockBlend = [0, 0, 0];
      const legIdx = [0, 0, 0];
      const routes: import("three").Vector3[][] = [[], [], []];
      let padsMeasured = false;

      // ── Trails: clean tapered ribbon stripes ──
      //    Centreline history + a quad strip skinned over it each frame:
      //    width tapers from the dart's tail to nothing, colour fades to
      //    paper. A paint stroke, not a flagellum.
      const trails = CAPTAINS.map((c) => {
        const hist = new Float32Array(TRAIL_LEN * 3);
        const positions = new Float32Array(TRAIL_LEN * 2 * 3);
        const colors = new Float32Array(TRAIL_LEN * 2 * 3);
        const cc = new THREE.Color(c.color);
        for (let k = 0; k < TRAIL_LEN; k++) {
          const t = k / (TRAIL_LEN - 1);
          const r = cc.r + (PAPER.r - cc.r) * t;
          const gg = cc.g + (PAPER.g - cc.g) * t;
          const b = cc.b + (PAPER.b - cc.b) * t;
          for (const e of [0, 1]) {
            colors[(k * 2 + e) * 3] = r;
            colors[(k * 2 + e) * 3 + 1] = gg;
            colors[(k * 2 + e) * 3 + 2] = b;
          }
        }
        const index: number[] = [];
        for (let k = 0; k < TRAIL_LEN - 1; k++) {
          const a = k * 2, b = k * 2 + 1, cIdx = k * 2 + 2, d = k * 2 + 3;
          index.push(a, b, cIdx, b, d, cIdx);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        g.setIndex(index);
        const line = new THREE.Mesh(
          g,
          new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }),
        );
        line.frustumCulled = false;
        line.visible = false;
        scene.add(line);
        return { line, positions, hist };
      });

      // Skin the ribbon over a captain's centreline history.
      const skinTrail = (i: number) => {
        const h = trails[i].hist;
        const p = trails[i].positions;
        for (let k = 0; k < TRAIL_LEN; k++) {
          const t = k / (TRAIL_LEN - 1);
          const k0 = Math.max(0, k - 1) * 3;
          const k1 = Math.min(TRAIL_LEN - 1, k + 1) * 3;
          let dx = h[k0] - h[k1];
          let dy = h[k0 + 1] - h[k1 + 1];
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          const half = TRAIL_W * Math.pow(1 - t, 1.25);
          const px = -dy * half, py = dx * half;
          const cx = h[k * 3], cy = h[k * 3 + 1], cz = h[k * 3 + 2] - 0.001;
          p[(k * 2) * 3] = cx + px; p[(k * 2) * 3 + 1] = cy + py; p[(k * 2) * 3 + 2] = cz;
          p[(k * 2 + 1) * 3] = cx - px; p[(k * 2 + 1) * 3 + 1] = cy - py; p[(k * 2 + 1) * 3 + 2] = cz;
        }
        trails[i].line.geometry.getAttribute("position").needsUpdate = true;
      };

      // ── Launch: measure pads, lay out each captain's route ──
      //  dot → straight up → arc out LEFT → swing to left-of-station → dock,
      //  approaching rightward so the nose already matches the final pose.
      const measureAndRoute = () => {
        measureAnchor();
        const tmp = new THREE.Vector3();
        CAPTAINS.forEach((c, i) => {
          const el = host.closest("section")?.querySelector(`[data-captain="${c.pad}"]`);
          if (el) {
            const d = (el as HTMLElement).getBoundingClientRect();
            unproject(d.left + d.width / 2, d.top + d.height / 2, pos[i]);
          } else {
            pos[i].set(-halfW * 0.35 + i * 0.8, halfH * 0.1, 0);
          }
          pos[i].z = -i * LAYER_DZ; // depth order fixed for life
          slot(i, tmp);
          const cl = (x: number) => Math.max(-halfW + 0.55, x);
          routes[i] = [
            new THREE.Vector3(pos[i].x + 0.15, pos[i].y + 1.35 + i * 0.28, pos[i].z), // straight up
            new THREE.Vector3(cl(pos[i].x - 1.9 - i * 0.4), pos[i].y + 2.1 + i * 0.3, pos[i].z), // arc out left
            new THREE.Vector3(cl(tmp.x - 1.9 - i * 0.3), tmp.y + 0.9 + i * 0.22, pos[i].z), // swing above-left of station
            new THREE.Vector3(cl(tmp.x - 1.15), tmp.y + 0.04, pos[i].z), // final approach, flying right at the button
          ];
          legIdx[i] = 0;
        });
        padsMeasured = true;
      };

      // ── Simulation ──
      const tmpT = new THREE.Vector3();
      const desired = new THREE.Vector3();
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const qDock = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
      const qShim = new THREE.Quaternion();
      const qBank = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const dv = new THREE.Vector3();
      const zA = new THREE.Vector3(0, 0, 1);

      const step = (dt: number, t: number) => {
        for (let i = 0; i < N; i++) {
          if (t < activeAt[i]) continue;
          if (!airborne[i]) {
            airborne[i] = true;
            vel[i].set(0.05, 1.3, 0); // straight up off the letter
            trails[i].line.visible = true;
            for (let k = 0; k < TRAIL_LEN; k++) {
              trails[i].hist[k * 3] = pos[i].x;
              trails[i].hist[k * 3 + 1] = pos[i].y;
              trails[i].hist[k * 3 + 2] = pos[i].z;
            }
            skinTrail(i);
          }
          slot(i, tmpT);
          if (!docked[i]) {
            const route = routes[i];
            const onFinal = legIdx[i] >= route.length;
            const goal = onFinal ? tmpT : route[legIdx[i]];
            desired.copy(goal).sub(pos[i]);
            const d = desired.length();
            if (!onFinal && d < 0.55) legIdx[i]++;
            const speed = onFinal ? Math.min(CRUISE, d * 1.6 + 0.06) : CRUISE;
            if (d > 1e-4) desired.multiplyScalar(speed / d);
            desired.sub(vel[i]);
            vel[i].addScaledVector(desired, Math.min(1, dt * 2.6));
            pos[i].addScaledVector(vel[i], dt);
            // pose + scale blend in smoothly on the final approach
            if (onFinal) {
              const dd = pos[i].distanceTo(tmpT);
              dockBlend[i] = Math.max(dockBlend[i], Math.min(1, 1 - dd / 1.4));
              if (dd < 0.05 && vel[i].length() < 0.4) docked[i] = true;
            }
            const h = trails[i].hist;
            for (let k = TRAIL_LEN - 1; k > 0; k--) {
              h[k * 3] = h[(k - 1) * 3];
              h[k * 3 + 1] = h[(k - 1) * 3 + 1];
              h[k * 3 + 2] = h[(k - 1) * 3 + 2];
            }
            h[0] = pos[i].x; h[1] = pos[i].y; h[2] = pos[i].z;
            skinTrail(i);
          } else {
            dockBlend[i] = Math.min(1, dockBlend[i] + dt * 2);
            tmpT.y += Math.sin(t * 0.9) * 0.016; // the mark breathes as one
            pos[i].lerp(tmpT, Math.min(1, dt * 5));
            vel[i].set(1, 0, 0);
            if (trails[i].line.visible) {
              const h = trails[i].hist;
              let maxD = 0;
              for (let k = 0; k < TRAIL_LEN; k++) {
                h[k * 3] += (pos[i].x - h[k * 3]) * Math.min(1, dt * 4);
                h[k * 3 + 1] += (pos[i].y - h[k * 3 + 1]) * Math.min(1, dt * 4);
                const dx = h[k * 3] - pos[i].x, dyy = h[k * 3 + 1] - pos[i].y;
                maxD = Math.max(maxD, dx * dx + dyy * dyy);
              }
              skinTrail(i);
              if (maxD < 0.0004) trails[i].line.visible = false;
            }
          }
        }
      };

      const writeInstances = (t: number) => {
        for (let i = 0; i < N; i++) {
          // invisible until its moment, then grows out of the dot
          const born = Math.min(1, Math.max(0, (t - activeAt[i]) / 0.3));
          dv.copy(vel[i]);
          if (dv.lengthSq() < 1e-6) dv.set(1, 0, 0);
          dv.normalize();
          q.setFromUnitVectors(up, dv);
          qBank.setFromAxisAngle(zA, Math.sin(t * 1.1 + i * 1.7) * 0.02);
          qShim.copy(qDock).multiply(qBank);
          q.slerp(qShim, dockBlend[i]);
          const s = (FLY_K + (DOCK_K - FLY_K) * dockBlend[i]) * born;
          m4.compose(pos[i], q, new THREE.Vector3(s, s, s));
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };

      const clock = new THREE.Clock();
      let simT = 0, raf = 0, running = false;
      const loop = () => {
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.033);
        simT += dt;
        if (!padsMeasured && simT >= LAUNCH_AT - 0.25) measureAndRoute();
        if (padsMeasured) step(dt, simT);
        writeInstances(simT);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      const start = () => { if (!running && !reduceMotion) { running = true; clock.getDelta(); raf = requestAnimationFrame(loop); } };
      const stop = () => { running = false; cancelAnimationFrame(raf); };

      let cleanupObservers: (() => void) | null = null;
      if (reduceMotion) {
        measureAnchor();
        const tmp = new THREE.Vector3();
        for (let i = 0; i < N; i++) {
          slot(i, tmp);
          pos[i].copy(tmp);
          vel[i].set(1, 0, 0);
          docked[i] = true;
          dockBlend[i] = 1;
          airborne[i] = true;
          activeAt[i] = -1;
        }
        writeInstances(0);
        renderer.render(scene, camera);
      } else {
        const ready = (document.fonts?.ready ?? Promise.resolve()) as Promise<unknown>;
        ready.catch(() => undefined).then(() => undefined);
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
        geo.dispose();
        mat.dispose();
        trails.forEach((tr) => {
          tr.line.geometry.dispose();
          (tr.line.material as import("three").Material).dispose();
        });
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
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />}
    </div>
  );
}
