"use client";

import { useEffect, useRef, useState } from "react";

/**
 * InkBloom — ink, dropped in water.
 *
 * A slow volumetric plume: a few hundred soft billows that spawn near a
 * wandering core, expand as they age, swirl on a gentle flow field, and
 * trail off into tendrils before dissolving back into the paper — every
 * billow born either deep emerald or a lighter, still-deep blue, the two
 * pigments mingling where the cloud is dense. The cursor stirs the water —
 * lightly. Nothing is announced; you find it.
 *
 * Rendering: one InstancedMesh of camera-facing quads (the camera never
 * moves, so planes are free billboards) with a soft irregular ink-blot
 * texture. Because the paper behind is a uniform tone, fading each billow's
 * colour toward the paper is visually identical to an alpha fade — which
 * lets every particle carry its own fade without custom shaders.
 *
 * Engineering: dynamic three import (no SSR), DPR cap 1.5, pauses
 * offscreen/tab-hidden, reduced-motion pre-simulates and renders one formed
 * still, no-WebGL falls back to a static SVG ink blot. Decorative.
 */

const PAPER = { r: 247 / 255, g: 244 / 255, b: 236 / 255 };
// Two pigments share the water: deep emerald and a lighter — still deep — blue.
const EMERALDS = [
  [0x0a / 255, 0x47 / 255, 0x32 / 255],
  [0x0d / 255, 0x5a / 255, 0x40 / 255],
  [0x11 / 255, 0x68 / 255, 0x4b / 255],
] as const;
const BLUES = [
  [0x1d / 255, 0x57 / 255, 0x94 / 255],
  [0x25 / 255, 0x65 / 255, 0xaa / 255],
  [0x2e / 255, 0x73 / 255, 0xba / 255],
] as const;
const LIGHT_FRONT = [0xd6 / 255, 0xe2 / 255, 0xde / 255] as const; // pale sea-glass billow fronts
const DEEP_CORE = [0x07 / 255, 0x38 / 255, 0x2a / 255] as const;   // the darkest heart

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 60" width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" style={{ display: "block", opacity: 0.8 }}>
      <defs>
        <filter id="inkblur"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>
      <g filter="url(#inkblur)">
        <ellipse cx="63" cy="26" rx="14" ry="10" fill="#1d5794" opacity="0.5" />
        <ellipse cx="72" cy="21" rx="9" ry="7" fill="#0d5a40" opacity="0.5" />
        <ellipse cx="55" cy="21" rx="8" ry="6" fill="#2565aa" opacity="0.45" />
        <ellipse cx="66" cy="30" rx="6" ry="4" fill="#11684b" opacity="0.4" />
        <ellipse cx="80" cy="33" rx="5" ry="3.4" fill="#1d5794" opacity="0.35" />
        <ellipse cx="87" cy="40" rx="3.4" ry="2.2" fill="#0d5a40" opacity="0.28" />
        <ellipse cx="92" cy="46" rx="2.2" ry="1.5" fill="#2565aa" opacity="0.2" />
      </g>
    </svg>
  );
}

export default function InkBloom() {
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
      const N = mobile ? 130 : 260;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
      camera.position.set(0, 0, 9);

      // ── The billow texture: an irregular soft blot (three offset lobes) ──
      const size = 160;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (ctx) {
        const lobe = (x: number, y: number, r: number, a: number) => {
          const g = ctx.createRadialGradient(x, y, r * 0.06, x, y, r);
          g.addColorStop(0, `rgba(255,255,255,${a})`);
          g.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, size, size);
        };
        lobe(size * 0.5, size * 0.5, size * 0.46, 0.85);
        lobe(size * 0.36, size * 0.4, size * 0.3, 0.5);
        lobe(size * 0.62, size * 0.58, size * 0.32, 0.5);
      }
      const blotTex = new THREE.CanvasTexture(c);

      const quad = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: blotTex,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });
      const mesh = new THREE.InstancedMesh(quad, mat, N);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // ── Particle state ──
      const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
      const vx = new Float32Array(N), vy = new Float32Array(N);
      const age = new Float32Array(N), maxAge = new Float32Array(N);
      const grow = new Float32Array(N), spin = new Float32Array(N), rot = new Float32Array(N);
      const colR = new Float32Array(N), colG = new Float32Array(N), colB = new Float32Array(N);

      // The cloud's heart wanders slowly around here
      const HOME = { x: 2.5, y: 0.85 };
      const heart = { x: HOME.x, y: HOME.y };

      const seed = (i: number, initial: boolean) => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.abs(gauss()) * 0.55;
        px[i] = heart.x + Math.cos(a) * r * 1.3;
        py[i] = heart.y + Math.sin(a) * r * 0.85;
        pz[i] = (i / N - 0.5) * 0.9; // stable, distinct depths — no popping
        const oa = Math.random() * Math.PI * 2;
        const os = 0.05 + Math.random() * 0.1;
        vx[i] = Math.cos(oa) * os;
        vy[i] = Math.sin(oa) * os;
        maxAge[i] = 13 + Math.random() * 9;
        age[i] = initial ? Math.random() * maxAge[i] : 0;
        grow[i] = 0.09 + Math.random() * 0.1;
        spin[i] = (Math.random() - 0.5) * 0.24;
        rot[i] = Math.random() * Math.PI * 2;
        // colour: mostly ink shades; occasional light billow-front;
        // a rare vermilion smoulder, only born deep in the core
        const roll = Math.random();
        let col: readonly number[];
        if (roll < 0.45) col = EMERALDS[Math.floor(Math.random() * EMERALDS.length)];
        else if (roll < 0.9) col = BLUES[Math.floor(Math.random() * BLUES.length)];
        else if (roll < 0.97 || r > 0.4) col = LIGHT_FRONT;
        else col = DEEP_CORE;
        colR[i] = col[0]; colG[i] = col[1]; colB[i] = col[2];
      };
      const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5);
      for (let i = 0; i < N; i++) seed(i, true);

      // ── The water: cursor as a light stirring presence ──
      const cursor = { x: 999, y: 999, live: 0 };
      const ndc = new THREE.Vector3();
      const onMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        ndc.set(nx, ny, 0.5).unproject(camera);
        const dir = ndc.sub(camera.position).normalize();
        const t = -camera.position.z / dir.z;
        cursor.x = camera.position.x + dir.x * t;
        cursor.y = camera.position.y + dir.y * t;
        cursor.live = 1;
      };
      if (!reduceMotion) window.addEventListener("pointermove", onMove, { passive: true });

      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const zAxis = new THREE.Vector3(0, 0, 1);
      const p3 = new THREE.Vector3();
      const s3 = new THREE.Vector3();
      const col = new THREE.Color();

      const step = (dt: number, t: number) => {
        cursor.live = Math.max(0, cursor.live - dt * 0.4);
        heart.x = HOME.x + Math.sin(t * 0.05) * 0.55;
        heart.y = HOME.y + Math.sin(t * 0.073 + 1.4) * 0.35;

        for (let i = 0; i < N; i++) {
          age[i] += dt;
          if (age[i] >= maxAge[i]) seed(i, false);

          const dx = px[i] - heart.x;
          const dy = py[i] - heart.y;
          const d = Math.hypot(dx, dy) + 1e-4;

          // slow expansion from the heart, weakening with distance
          const expand = 0.085 / (0.5 + d);
          let fx = (dx / d) * expand;
          let fy = (dy / d) * expand;

          // the water's own motion: layered sine flow (curl-ish swirl)
          fx += (Math.sin(py[i] * 1.4 + t * 0.18) + Math.sin(py[i] * 0.53 - t * 0.11)) * 0.016;
          fy += (Math.sin(px[i] * 1.2 - t * 0.14) + Math.sin(px[i] * 0.47 + t * 0.09)) * 0.013;

          // far billows sink into tendrils, drifting down and away
          if (d > 1.6) {
            fx += 0.012;
            fy -= 0.02 * ((d - 1.6) / 2);
          }

          // the stir: light, swirling, honest to "lightly interactable"
          if (cursor.live > 0.01) {
            const cx = px[i] - cursor.x;
            const cy = py[i] - cursor.y;
            const cd = Math.hypot(cx, cy);
            if (cd < 1.7 && cd > 1e-3) {
              const s = ((1.7 - cd) / 1.7) * 0.5 * cursor.live;
              fx += ((cx / cd) * 0.6 - (cy / cd) * 0.8) * s;
              fy += ((cy / cd) * 0.6 + (cx / cd) * 0.8) * s;
            }
          }

          vx[i] = (vx[i] + fx * dt * 2.4) * 0.985; // viscosity
          vy[i] = (vy[i] + fy * dt * 2.4) * 0.985;
          px[i] += vx[i] * dt * 2.2;
          py[i] += vy[i] * dt * 2.2;
          rot[i] += spin[i] * dt;
        }
      };

      const writeInstances = () => {
        for (let i = 0; i < N; i++) {
          const life = age[i] / maxAge[i];
          const scale = 0.5 + age[i] * grow[i];
          // fade = lerp toward paper (uniform bg makes this equal to alpha)
          const fade =
            life < 0.12 ? life / 0.12 :
            life > 0.72 ? Math.max(0, 1 - (life - 0.72) / 0.28) : 1;
          col.setRGB(
            PAPER.r + (colR[i] - PAPER.r) * fade,
            PAPER.g + (colG[i] - PAPER.g) * fade,
            PAPER.b + (colB[i] - PAPER.b) * fade,
          );
          mesh.setColorAt(i, col);
          q.setFromAxisAngle(zAxis, rot[i]);
          p3.set(px[i], py[i], pz[i]);
          s3.set(scale, scale, 1);
          m4.compose(p3, q, s3);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      };

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
        for (let k = 0; k < 320; k++) {
          simT += 0.033;
          step(0.033, simT);
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
        quad.dispose();
        mat.dispose();
        blotTex.dispose();
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
