"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flock — three formations, on manoeuvres. In three dimensions.
 *
 * This is the original murmuration's machinery, reduced in number but not in
 * kind: true 3D boids (separation, alignment, cohesion) flying inside a soft
 * invisible ellipsoid territory, stirred by a slow sine wind, fleeing the
 * cursor as a presence that eases in and out — all under a fixed perspective
 * camera, so darts genuinely approach and recede, foreshorten, and bank as
 * they turn. Fifteen agents in three squadrons: a vermilion captain with 3
 * ink wingmen, a blue captain with 3, an emerald captain with 6. Cohesion
 * and alignment bind only squadron-mates; separation acts across all
 * fifteen, so the sets part around each other rather than merging.
 *
 * The launch: each squadron lifts off from the coloured tittle of its own
 * lowercase i in the headline — the dot's screen position is unprojected
 * through the camera onto the flock's z=0 plane, so lift-off is pixel-true
 * wherever the headline wraps. Captains tow a short ribbon of their own
 * pigment that dissolves toward the paper.
 *
 * Rendered as flat folded ink darts — sumi-e silhouettes, no lights, no
 * gloss; the fold's changing silhouette is what sells the banking.
 *
 * Engineering: dynamic three import (no SSR), one InstancedMesh for all
 * fifteen darts (per-instance colour), DPR cap 1.5, pauses offscreen and
 * tab-hidden, reduced-motion pre-simulates squadrons on station and renders
 * a single composed frame, no-WebGL falls back to a static SVG flock.
 * Decorative: aria-hidden; pointer events stay on the page.
 */

const INK = 0x1a1713;
const PAPER = 0xf7f4ec;

const SQUADRONS = [
  { pad: "verm", color: 0xc93a17, wings: 3 }, // Intell·i·gence
  { pad: "blue", color: 0x2565aa, wings: 3 }, // ·i·n
  { pad: "green", color: 0x0d5a40, wings: 6 }, // format·i·on
] as const;
const N = SQUADRONS.reduce((s, q) => s + q.wings + 1, 0); // 15

/* ── The murmuration's constants, verbatim where they survive ── */
const SEP_R2 = 0.34 * 0.34; //   personal space within a squadron
const XSEP_R2 = 0.5 * 0.5; //    personal space between squadrons
const NEIGH_R2 = 1.15 * 1.15; // squadron-mate perception radius
const MIN_S = 0.7; //            speed floor — nobody hovers
const MAX_S = 2.3; //            speed ceiling
const W_SEP = 4.2; //            rule strengths
const W_XSEP = 5.2;
const W_ALI = 1.6;
const W_COH = 1.1;
const WIND = { ax: 0.32, fx: 0.21, ay: 0.2, fy: 0.34, py: 2.1 }; // the slow sine wind
const FLEE_R = 1.7; //           the cursor's presence radius
const W_FLEE = 6.5;
const CURSOR_DECAY = 0.35; //    presence eases out at the original rate
const BOUND_K = 3.4; //          soft territory spring, engages from e > 0.85
const BZ = 2.2; //               territory half-depth — where the 3D lives

/* ── Launch choreography (seconds; dots pop via CSS at 1.15/1.30/1.45s) ── */
const T_LAUNCH = 1.75;
const T_SQUAD = 0.38;
const T_PLANE = 0.14;
const T_RAMP = 0.9;
const TRAIL_N = 26;
const DART_K = 0.26; // dart scale (world units); captains ×1.22

function StaticFallback() {
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
            <path key={i} d={dart} transform={`translate(${wx} ${wy}) rotate(${wr})`} fill="#1a1713" />
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
      renderer.setClearColor(0x000000, 0); // the paper shows through
      host.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 40);
      camera.position.set(0, 0, 8.4);

      // Territory (locally hosted): a soft ellipsoid the flock never leaves.
      // Sized from the visible frustum at z=0 so it fits every viewport,
      // biased up and slightly right — the sky above the headline.
      let halfH = 3.56, halfW = 6.8;
      const terr = { cx: 0, cy: 0, rx: 5, ry: 2, rz: BZ };
      let pxPerWorld = 100;
      let textBox: { x0: number; x1: number; y0: number; y1: number } | null = null;

      const resize = () => {
        const r = host.getBoundingClientRect();
        const w = Math.max(1, r.width), h = Math.max(1, r.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        halfH = camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
        halfW = halfH * camera.aspect;
        terr.cx = halfW * 0.08;
        terr.cy = halfH * 0.24;
        terr.rx = halfW * 0.86;
        terr.ry = halfH * 0.58;
        pxPerWorld = h / (2 * halfH);
        // The headline block in world xy at z=0, inflated — cruised around once airborne.
        const h1 = host.parentElement?.querySelector("h1");
        if (h1) {
          const hr = h1.getBoundingClientRect();
          const toWX = (px: number) => ((px - r.left) / w) * 2 * halfW - halfW;
          const toWY = (py: number) => -((py - r.top) / h) * 2 * halfH + halfH;
          textBox = { x0: toWX(hr.left - 20), x1: toWX(hr.right + 20), y0: toWY(hr.bottom + 20), y1: toWY(hr.top - 20) };
        }
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      // ── The fifteen darts: one InstancedMesh, per-instance colour ──
      // A folded paper dart, nose along +Y, wings raised off the crease —
      // the fold's silhouette is what makes the banking legible.
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [
            0, 1.0, 0, -0.62, -0.75, 0.2, 0, -0.45, 0, // left wing
            0, 1.0, 0, 0, -0.45, 0, 0.62, -0.75, 0.2, //  right wing
          ],
          3,
        ),
      );
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.InstancedMesh(geo, mat, N);
      mesh.frustumCulled = false;
      const ink = new THREE.Color(INK);
      const sqOf: number[] = [];
      const isCap: boolean[] = [];
      {
        let i = 0;
        SQUADRONS.forEach((cfg, sq) => {
          for (let k = 0; k <= cfg.wings; k++, i++) {
            sqOf[i] = sq;
            isCap[i] = k === 0;
            mesh.setColorAt(i, k === 0 ? new THREE.Color(cfg.color) : ink);
          }
        });
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);

      // ── Boids state ──
      const pos = new Float32Array(N * 3);
      const vel = new Float32Array(N * 3);
      const born = new Float32Array(N).fill(-1); // sim time of lift-off; -1 = not yet
      let launched = [false, false, false];

      // Captain ribbons: short pigment trails dissolving toward the paper.
      const paper = new THREE.Color(PAPER);
      const trails = SQUADRONS.map((cfg) => {
        const g = new THREE.BufferGeometry();
        const verts = new Float32Array(TRAIL_N * 2 * 3);
        const cols = new Float32Array(TRAIL_N * 2 * 3);
        g.setAttribute("position", new THREE.BufferAttribute(verts, 3).setUsage(THREE.DynamicDrawUsage));
        g.setAttribute("color", new THREE.BufferAttribute(cols, 3).setUsage(THREE.DynamicDrawUsage));
        const idx: number[] = [];
        for (let i = 0; i < TRAIL_N - 1; i++) {
          const a = i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        g.setIndex(idx);
        const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, depthWrite: false });
        const t = new THREE.Mesh(g, m);
        t.frustumCulled = false;
        t.renderOrder = -1;
        scene.add(t);
        const pigment = new THREE.Color(cfg.color);
        return { mesh: t, geo: g, verts, cols, pts: [] as number[][], pigment };
      });

      // The cursor: a presence in the flock's world (plane z = 0). (Original.)
      const cursor = new THREE.Vector3(999, 999, 0);
      let cursorLive = 0;
      const ndc = new THREE.Vector3();
      const unprojectToPlane = (clientX: number, clientY: number, out: import("three").Vector3) => {
        const rect = host.getBoundingClientRect();
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
        ndc.set(nx, ny, 0.5).unproject(camera);
        const dir = ndc.sub(camera.position).normalize();
        const t = -camera.position.z / dir.z;
        out.copy(camera.position).addScaledVector(dir, t);
      };
      const onMove = (e: PointerEvent) => {
        unprojectToPlane(e.clientX, e.clientY, cursor);
        cursorLive = 1;
      };
      if (!reduceMotion) window.addEventListener("pointermove", onMove, { passive: true });

      // A squadron lifts off from the coloured tittle of its own i.
      const dotWorld = new THREE.Vector3();
      const spawnSquadron = (sq: number, simT: number) => {
        const cfg = SQUADRONS[sq];
        const el = host.parentElement?.querySelector(`[data-captain="${cfg.pad}"]`);
        if (el) {
          const d = el.getBoundingClientRect();
          unprojectToPlane(d.left + d.width / 2, d.top + d.height / 2, dotWorld);
        } else {
          dotWorld.set(-halfW * 0.4, -halfH * 0.4, 0);
        }
        let i = 0;
        for (let s = 0; s < sq; s++) i += SQUADRONS[s].wings + 1;
        const aim = Math.atan2(terr.cy - dotWorld.y, terr.cx - dotWorld.x);
        for (let k = 0; k <= cfg.wings; k++) {
          const ix = (i + k) * 3;
          pos[ix] = dotWorld.x;
          pos[ix + 1] = dotWorld.y;
          pos[ix + 2] = (Math.random() - 0.5) * 0.3;
          const a = aim + (Math.random() - 0.5) * 0.7;
          const v0 = MIN_S * 1.3;
          vel[ix] = Math.cos(a) * v0;
          vel[ix + 1] = Math.sin(a) * v0;
          vel[ix + 2] = (Math.random() - 0.5) * 0.3;
          born[i + k] = simT + k * T_PLANE;
        }
      };

      const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

      const step = (dt: number, t: number) => {
        cursorLive = Math.max(0, cursorLive - dt * CURSOR_DECAY);
        // Gentle wind so the flock fluctuates even when the pointer rests. (Original.)
        const wx = Math.sin(t * WIND.fx) * WIND.ax;
        const wy = Math.sin(t * WIND.fy + WIND.py) * WIND.ay;

        for (let i = 0; i < N; i++) {
          if (born[i] < 0 || t < born[i]) continue;
          const ix = i * 3;
          const px = pos[ix], py = pos[ix + 1], pz = pos[ix + 2];
          const age = t - born[i];
          const ramp = smooth(age / T_RAMP);

          let sepX = 0, sepY = 0, sepZ = 0;
          let aliX = 0, aliY = 0, aliZ = 0;
          let cohX = 0, cohY = 0, cohZ = 0;
          let n = 0;

          for (let j = 0; j < N; j++) {
            if (j === i || born[j] < 0 || t < born[j]) continue;
            const jx = j * 3;
            const dx = pos[jx] - px, dy = pos[jx + 1] - py, dz = pos[jx + 2] - pz;
            const d2 = Math.max(dx * dx + dy * dy + dz * dz, 1e-6);
            if (sqOf[j] === sqOf[i]) {
              if (d2 > NEIGH_R2) continue;
              n++;
              cohX += dx; cohY += dy; cohZ += dz;
              aliX += vel[jx]; aliY += vel[jx + 1]; aliZ += vel[jx + 2];
              if (d2 < SEP_R2) {
                sepX -= dx / d2; sepY -= dy / d2; sepZ -= dz / d2;
              }
            } else if (d2 < XSEP_R2) {
              const w = W_XSEP / W_SEP;
              sepX -= (dx / d2) * w; sepY -= (dy / d2) * w; sepZ -= (dz / d2) * w;
            }
          }

          let fx = wx, fy = wy, fz = 0;
          fx += sepX * W_SEP * ramp; fy += sepY * W_SEP * ramp; fz += sepZ * W_SEP * ramp;
          if (n > 0) {
            fx += (aliX / n - vel[ix]) * W_ALI * ramp;
            fy += (aliY / n - vel[ix + 1]) * W_ALI * ramp;
            fz += (aliZ / n - vel[ix + 2]) * W_ALI * ramp;
            fx += (cohX / n) * W_COH * ramp;
            fy += (cohY / n) * W_COH * ramp;
            fz += (cohZ / n) * W_COH * ramp;
          }
          // Territory: the soft ellipsoid. (Original.)
          const ex = (px - terr.cx) / terr.rx, ey = (py - terr.cy) / terr.ry, ez = pz / terr.rz;
          const e = ex * ex + ey * ey + ez * ez;
          if (e > 0.85) {
            const k = BOUND_K * (e - 0.85);
            fx += (terr.cx - px) * k;
            fy += (terr.cy - py) * k;
            fz += -pz * k;
          }
          // The headline is solid ground — cruise around it once airborne.
          if (age > 1.3 && textBox && px > textBox.x0 && px < textBox.x1 && py > textBox.y0 && py < textBox.y1) {
            const rcx = (textBox.x0 + textBox.x1) / 2, rcy = (textBox.y0 + textBox.y1) / 2;
            const tdx = px - rcx, tdy = py - rcy;
            const td = Math.hypot(tdx, tdy) || 1;
            fx += (tdx / td) * 2.4;
            fy += (tdy / td) * 2.4;
          }
          // The cursor: flee the presence, scaled by how alive it is. (Original.)
          const cdx = px - cursor.x, cdy = py - cursor.y, cdz = pz - cursor.z;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
          if (cd < FLEE_R && cd > 0.01 && cursorLive > 0) {
            const f = (W_FLEE * (1 - cd / FLEE_R) * cursorLive) / cd;
            fx += cdx * f; fy += cdy * f; fz += cdz * f;
          }

          vel[ix] += fx * dt;
          vel[ix + 1] += fy * dt;
          vel[ix + 2] += fz * dt;
          const v = Math.sqrt(vel[ix] ** 2 + vel[ix + 1] ** 2 + vel[ix + 2] ** 2) || 1e-6;
          const vmin = MIN_S * (0.4 + 0.6 * ramp);
          if (v > MAX_S) {
            const s = MAX_S / v;
            vel[ix] *= s; vel[ix + 1] *= s; vel[ix + 2] *= s;
          } else if (v < vmin) {
            const s = vmin / v;
            vel[ix] *= s; vel[ix + 1] *= s; vel[ix + 2] *= s;
          }
          pos[ix] += vel[ix] * dt;
          pos[ix + 1] += vel[ix + 1] * dt;
          pos[ix + 2] += vel[ix + 2] * dt;
        }

        // Captain ribbons
        let base = 0;
        SQUADRONS.forEach((cfg, sq) => {
          const capI = base;
          base += cfg.wings + 1;
          if (born[capI] < 0 || t < born[capI]) return;
          const tr = trails[sq];
          tr.pts.push([pos[capI * 3], pos[capI * 3 + 1], pos[capI * 3 + 2]]);
          if (tr.pts.length > TRAIL_N) tr.pts.shift();
        });
      };

      // ── Rendering ──
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const dirV = new THREE.Vector3();
      const m4 = new THREE.Matrix4();
      const sc = new THREE.Vector3();
      const pv = new THREE.Vector3();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      const cA = new THREE.Color(), cB = new THREE.Color();

      const render = (t: number) => {
        for (let i = 0; i < N; i++) {
          if (born[i] < 0 || t < born[i]) {
            mesh.setMatrixAt(i, zero);
            continue;
          }
          const ix = i * 3;
          pv.set(pos[ix], pos[ix + 1], pos[ix + 2]);
          dirV.set(vel[ix], vel[ix + 1], vel[ix + 2]).normalize();
          q.setFromUnitVectors(up, dirV);
          const grow = Math.min(1, (t - born[i]) / 0.3);
          const k = DART_K * (isCap[i] ? 1.22 : 1) * grow;
          sc.set(k, k, k);
          m4.compose(pv, q, sc);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;

        for (const tr of trails) {
          const nP = tr.pts.length;
          const verts = tr.verts, cols = tr.cols;
          for (let i = 0; i < TRAIL_N; i++) {
            const p = nP > 0 ? tr.pts[Math.min(i, nP - 1)] : [0, 0, -30];
            const a = nP > 1 ? Math.min(i, nP - 1) / (nP - 1) : 0;
            // width tapers toward the tail; perpendicular taken in the view plane
            const nxt = nP > 1 ? tr.pts[Math.min(Math.min(i, nP - 1) + 1, nP - 1)] : p;
            let dx = nxt[0] - p[0], dy = nxt[1] - p[1];
            const dl = Math.hypot(dx, dy) || 1;
            dx /= dl; dy /= dl;
            const hw = 0.016 + a * 0.052;
            const o = i * 6;
            verts[o] = p[0] - dy * hw; verts[o + 1] = p[1] + dx * hw; verts[o + 2] = p[2] - 0.03;
            verts[o + 3] = p[0] + dy * hw; verts[o + 4] = p[1] - dx * hw; verts[o + 5] = p[2] - 0.03;
            // pigment dissolving toward the paper along the ribbon
            cA.copy(paper).lerp(tr.pigment, a * 0.6);
            cols[o] = cA.r; cols[o + 1] = cA.g; cols[o + 2] = cA.b;
            cols[o + 3] = cA.r; cols[o + 4] = cA.g; cols[o + 5] = cA.b;
          }
          (tr.geo.attributes.position as import("three").BufferAttribute).needsUpdate = true;
          (tr.geo.attributes.color as import("three").BufferAttribute).needsUpdate = true;
          tr.mesh.visible = nP > 1;
        }
        renderer.render(scene, camera);
      };

      // ── Loop ──
      let raf = 0;
      let running = false;
      let simT = 0;
      let last = performance.now();

      const frame = (now: number) => {
        if (disposed) return;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        simT += dt;
        for (let i = 0; i < 3; i++) {
          if (!launched[i] && simT > T_LAUNCH + i * T_SQUAD) {
            launched[i] = true;
            resize(); // fonts may have swapped; measure the tittle fresh
            spawnSquadron(i, simT);
          }
        }
        step(dt, simT);
        render(simT);
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

      let cleanup: (() => void) | null = null;

      if (reduceMotion) {
        // No theatre: squadrons already on station, one composed frame.
        const stations = [
          [-0.35, 0.35], [0.1, 0.55], [0.45, 0.15],
        ];
        let i = 0;
        SQUADRONS.forEach((cfg, sq) => {
          const [sx, sy] = stations[sq];
          for (let k = 0; k <= cfg.wings; k++, i++) {
            const ix = i * 3;
            pos[ix] = terr.cx + sx * terr.rx + (Math.random() - 0.5) * 0.9;
            pos[ix + 1] = terr.cy + sy * terr.ry + (Math.random() - 0.5) * 0.6;
            pos[ix + 2] = (Math.random() - 0.5) * 1.6;
            const a = -0.3 + sq * 0.25;
            vel[ix] = Math.cos(a); vel[ix + 1] = Math.sin(a); vel[ix + 2] = 0;
            born[i] = -5;
          }
        });
        // Let the rules settle them into formation, then hold the frame.
        for (let s = 0; s < 90; s++) step(1 / 60, s / 60);
        render(10);
      } else {
        start();
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
        geo.dispose();
        mat.dispose();
        for (const tr of trails) {
          tr.geo.dispose();
          (tr.mesh.material as import("three").Material).dispose();
        }
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
