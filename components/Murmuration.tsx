"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Murmuration — the site's living centrepiece.
 *
 * A true flock: several hundred autonomous agents running classic boids
 * (separation, alignment, cohesion) inside an invisible ellipsoid boundary —
 * the system holds its territory without a wall in sight. One bird is
 * vermilion. The cursor is a presence the flock avoids: your action,
 * its Reaction.
 *
 * Rendered as flat ink darts on paper — sumi-e, not showroom. No lights,
 * no gloss: silhouettes. The fluctuation IS the spectacle.
 *
 * Engineering: dynamic three import (no SSR), InstancedMesh (one draw call),
 * DPR cap 1.5, pauses offscreen/tab-hidden, reduced-motion pre-simulates the
 * flock and renders a single composed frame, no-WebGL falls back to a static
 * SVG flock. Decorative: aria-hidden; pointer events stay on the page.
 */

const INK = 0x1a1713;
const VERMILION = 0xd43d1a;

function StaticFallback() {
  // A hand-placed ink flock for no-WebGL environments.
  const darts = [
    [62, 26, 20], [70, 22, -5], [78, 25, 15], [84, 30, 40], [74, 33, 25],
    [66, 36, 10], [58, 32, -15], [80, 38, 55], [88, 34, 30], [71, 28, 5],
    [55, 24, -30], [90, 27, 10], [83, 21, -10], [64, 30, 35], [76, 30, 20],
  ];
  return (
    <svg viewBox="0 0 100 60" width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" style={{ display: "block", opacity: 0.85 }}>
      {darts.map(([x, y, r], i) => (
        <path
          key={i}
          d="M0 -1.6 L1 1.2 L0 0.6 L-1 1.2 Z"
          transform={`translate(${x} ${y}) rotate(${r})`}
          fill={i === 7 ? "#d43d1a" : "#1a1713"}
        />
      ))}
    </svg>
  );
}

export default function Murmuration() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let running = false;
    let cleanup: (() => void) | null = null;

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
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        setFallback(true);
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mobile = window.innerWidth < 768;
      const N = mobile ? 170 : 420;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
      camera.position.set(0, 0, 9);

      // ── The agents: flat ink darts, one draw call ──
      const dartGeom = new THREE.ConeGeometry(0.028, 0.11, 4);
      const dartMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.InstancedMesh(dartGeom, dartMat, N);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const ink = new THREE.Color(INK);
      const verm = new THREE.Color(VERMILION);
      for (let i = 0; i < N; i++) mesh.setColorAt(i, i === 0 ? verm : ink);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);

      // ── Boids state ──
      const pos = new Float32Array(N * 3);
      const vel = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 8;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        const a = Math.random() * Math.PI * 2;
        vel[i * 3] = Math.cos(a) * 1.2;
        vel[i * 3 + 1] = Math.sin(a) * 0.5;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      }

      // Territory (locally hosted): a soft ellipsoid the flock never leaves
      const BX = 6.6, BY = 3.1, BZ = 2.4;
      const SEP_R2 = 0.34 * 0.34;
      const NEIGH_R2 = 1.15 * 1.15;
      const MIN_S = 0.7, MAX_S = 2.3;

      // The cursor: a presence in the flock's world (plane z = 0)
      const cursor = new THREE.Vector3(999, 999, 0);
      let cursorLive = 0; // eases toward 1 while the pointer moves
      const ndc = new THREE.Vector3();
      const onMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        ndc.set(nx, ny, 0.5).unproject(camera);
        const dir = ndc.sub(camera.position).normalize();
        const t = -camera.position.z / dir.z;
        cursor.copy(camera.position).addScaledVector(dir, t);
        cursorLive = 1;
      };
      if (!reduceMotion) window.addEventListener("pointermove", onMove, { passive: true });

      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const dirV = new THREE.Vector3();
      const m4 = new THREE.Matrix4();
      const sc = new THREE.Vector3(1, 1, 1);
      const pv = new THREE.Vector3();

      const step = (dt: number, t: number) => {
        cursorLive = Math.max(0, cursorLive - dt * 0.35);
        // Gentle wind so the flock fluctuates even when the pointer rests
        const wx = Math.sin(t * 0.21) * 0.32;
        const wy = Math.sin(t * 0.34 + 2.1) * 0.2;

        for (let i = 0; i < N; i++) {
          const ix = i * 3;
          const px = pos[ix], py = pos[ix + 1], pz = pos[ix + 2];
          let sepX = 0, sepY = 0, sepZ = 0;
          let aliX = 0, aliY = 0, aliZ = 0;
          let cohX = 0, cohY = 0, cohZ = 0;
          let n = 0;

          for (let j = 0; j < N; j++) {
            if (j === i) continue;
            const jx = j * 3;
            const dx = pos[jx] - px, dy = pos[jx + 1] - py, dz = pos[jx + 2] - pz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > NEIGH_R2) continue;
            n++;
            cohX += dx; cohY += dy; cohZ += dz;
            aliX += vel[jx]; aliY += vel[jx + 1]; aliZ += vel[jx + 2];
            if (d2 < SEP_R2 && d2 > 1e-6) {
              const inv = 1 / d2;
              sepX -= dx * inv; sepY -= dy * inv; sepZ -= dz * inv;
            }
          }

          let fx = wx, fy = wy, fz = 0;
          if (n > 0) {
            const invN = 1 / n;
            fx += cohX * invN * 0.5 + aliX * invN * 0.55 + sepX * 0.05;
            fy += cohY * invN * 0.5 + aliY * invN * 0.55 + sepY * 0.05;
            fz += cohZ * invN * 0.5 + aliZ * invN * 0.55 + sepZ * 0.05;
          }

          // Soft containment: spring back once outside the territory
          const ex = px / BX, ey = py / BY, ez = pz / BZ;
          const el = ex * ex + ey * ey + ez * ez;
          if (el > 1) {
            const s = (el - 1) * 2.4;
            fx -= ex * s; fy -= ey * s; fz -= ez * s;
          }

          // The Reaction: flee the pointer
          if (cursorLive > 0.01) {
            const cx = px - cursor.x, cy = py - cursor.y, cz = pz - cursor.z;
            const cd2 = cx * cx + cy * cy + cz * cz;
            if (cd2 < 2.9 && cd2 > 1e-6) {
              const cd = Math.sqrt(cd2);
              const s = ((1.7 - cd) / 1.7) * 4.2 * cursorLive;
              if (s > 0) {
                fx += (cx / cd) * s; fy += (cy / cd) * s; fz += (cz / cd) * s;
              }
            }
          }

          vel[ix] += fx * dt;
          vel[ix + 1] += fy * dt;
          vel[ix + 2] += fz * dt;

          const sp = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]);
          const cl = sp > MAX_S ? MAX_S / sp : sp < MIN_S ? MIN_S / (sp || 1) : 1;
          vel[ix] *= cl; vel[ix + 1] *= cl; vel[ix + 2] *= cl;

          pos[ix] += vel[ix] * dt;
          pos[ix + 1] += vel[ix + 1] * dt;
          pos[ix + 2] += vel[ix + 2] * dt;
        }
      };

      const writeInstances = () => {
        for (let i = 0; i < N; i++) {
          const ix = i * 3;
          dirV.set(vel[ix], vel[ix + 1], vel[ix + 2]).normalize();
          q.setFromUnitVectors(up, dirV);
          pv.set(pos[ix], pos[ix + 1], pos[ix + 2]);
          m4.compose(pv, q, sc);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };

      // ── Sizing ──
      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const clock = new THREE.Clock();
      let simT = 0;
      const frame = () => {
        const dt = Math.min(clock.getDelta(), 0.033);
        simT += dt;
        step(dt, simT);
        writeInstances();
        renderer.render(scene, camera);
      };

      const loop = () => {
        if (!running) return;
        frame();
        raf = requestAnimationFrame(loop);
      };
      const start = () => {
        if (running || reduceMotion) return;
        running = true;
        clock.getDelta();
        raf = requestAnimationFrame(loop);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      if (reduceMotion) {
        // Pre-simulate so the still frame is a formed flock, not confetti
        for (let k = 0; k < 140; k++) {
          simT += 0.03;
          step(0.03, simT);
        }
        writeInstances();
        renderer.render(scene, camera);
      } else {
        const io = new IntersectionObserver(
          (entries) => (entries[0]?.isIntersecting ? start() : stop()),
          { threshold: 0.05 },
        );
        io.observe(host);
        const onVis = () => (document.visibilityState === "hidden" ? stop() : start());
        document.addEventListener("visibilitychange", onVis);
        cleanup = () => {
          io.disconnect();
          document.removeEventListener("visibilitychange", onVis);
        };
      }

      const disposeAll = () => {
        stop();
        cleanup?.();
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        renderer.dispose();
        dartGeom.dispose();
        dartMat.dispose();
        if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      };
      (host as HTMLDivElement & { __rxDispose?: () => void }).__rxDispose = disposeAll;
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
