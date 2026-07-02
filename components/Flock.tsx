"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flock, fifth movement — information, in formation.
 *
 * Three captains, born from the coloured tittles of the headline. Red first,
 * then blue, then green, each shooting SIDEWAYS off its dot — no climb, no
 * turn — and easing onto its layer of a moving pile. The pile is carried by
 * an invisible carrier travelling smoothly rightward: each dart's target is
 * its slot on that carrier, so the conjoining is one continuous, symmetric
 * glide with zero rotation anywhere. No waypoints, no snapping.
 *
 * When the mark completes, we tell the page (rx:mark-formed) so the headline
 * can perform its trick. The mark then continues dead straight off the right
 * edge, re-enters from the left on the primary button's line, decelerates,
 * and lands at its pointing station: nose-tip a small gap left of the
 * button, aimed straight at it.
 *
 * Trails are tapered ribbon stripes that reel in on landing. Reduced motion
 * renders the finished mark at its station.
 */

const CAPTAINS = [
  { pad: "verm", color: 0xc93a17 },
  { pad: "blue", color: 0x2565aa },
  { pad: "green", color: 0x0d5a40 },
];
const N = 3;
const LAUNCH_AT = 1.7; //   dots settle ≈1.15s
const STAGGER = 0.34; //    red, then blue, then green
const ASSEMBLE_T = 0.85; // each dart's glide from dot to its moving slot
const CRUISE = 2.3;
const TRAIL_LEN = 26;
const TRAIL_W = 0.085;
const FLY_K = 0.17;
const DOCK_K = 0.26;
const LAYER_DX = 0.12;
const LAYER_DZ = 0.02;
const ANCHOR_GAP_PX = 44;
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

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

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

      // The pointing station: nose-tip a gap left of the primary button.
      const anchor = new THREE.Vector3(-2.2, -0.9, 0);
      const measureAnchor = () => {
        const el = host.closest("section")?.querySelector("[data-flock-anchor]");
        if (!el) return;
        const r = (el as HTMLElement).getBoundingClientRect();
        unproject(r.left - ANCHOR_GAP_PX, r.top + r.height / 2, anchor);
        anchor.x -= DOCK_K * 1.0;
        anchor.x = Math.max(anchor.x, -halfW + 0.9);
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

      // ── The carrier: one point whose journey the whole mark shares ──
      // phases: 0 pre-launch · 1 rightward (assemble + exit) · 2 return · 3 docked
      let phase = 0;
      const carrier = new THREE.Vector3();
      let markFormedFired = false;
      let dockBlend = 0;

      const dots = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const pos = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const activeAt = [0, 1, 2].map((i) => LAUNCH_AT + i * STAGGER);

      const slotOf = (i: number, out: import("three").Vector3) => {
        out.set(carrier.x - i * LAYER_DX, carrier.y, -i * LAYER_DZ);
        return out;
      };

      // ── Trails: tapered ribbon stripes ──
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
          const a = k * 2, b = k * 2 + 1, cI = k * 2 + 2, d = k * 2 + 3;
          index.push(a, b, cI, b, d, cI);
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
      const resetTrail = (i: number, to: import("three").Vector3) => {
        const h = trails[i].hist;
        for (let k = 0; k < TRAIL_LEN; k++) {
          h[k * 3] = to.x; h[k * 3 + 1] = to.y; h[k * 3 + 2] = to.z;
        }
      };
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
          p[(k * 2) * 3] = h[k * 3] + px; p[(k * 2) * 3 + 1] = h[k * 3 + 1] + py; p[(k * 2) * 3 + 2] = h[k * 3 + 2] - 0.001;
          p[(k * 2 + 1) * 3] = h[k * 3] - px; p[(k * 2 + 1) * 3 + 1] = h[k * 3 + 1] - py; p[(k * 2 + 1) * 3 + 2] = h[k * 3 + 2] - 0.001;
        }
        trails[i].line.geometry.getAttribute("position").needsUpdate = true;
      };
      const pushTrail = (i: number) => {
        const h = trails[i].hist;
        for (let k = TRAIL_LEN - 1; k > 0; k--) {
          h[k * 3] = h[(k - 1) * 3];
          h[k * 3 + 1] = h[(k - 1) * 3 + 1];
          h[k * 3 + 2] = h[(k - 1) * 3 + 2];
        }
        h[0] = pos[i].x; h[1] = pos[i].y; h[2] = pos[i].z;
        skinTrail(i);
      };

      // ── Launch: measure the tittles, set the carrier on the merge line ──
      let padsMeasured = false;
      const measureAndArm = () => {
        measureAnchor();
        CAPTAINS.forEach((c, i) => {
          const el = host.closest("section")?.querySelector(`[data-captain="${c.pad}"]`);
          if (el) {
            const d = (el as HTMLElement).getBoundingClientRect();
            unproject(d.left + d.width / 2, d.top + d.height / 2, dots[i]);
          } else {
            dots[i].set(-halfW * 0.35 + i * 0.6, halfH * 0.15 - i * 0.2, 0);
          }
          dots[i].z = -i * LAYER_DZ;
          pos[i].copy(dots[i]);
        });
        // merge line: between the headline's two rows of dots
        carrier.set(dots[0].x + 0.5, (dots[0].y + dots[1].y) / 2, 0);
        phase = 1;
        padsMeasured = true;
      };

      const tmp = new THREE.Vector3();
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const qDock = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
      const qBank = new THREE.Quaternion();
      const zA = new THREE.Vector3(0, 0, 1);

      const step = (dt: number, t: number) => {
        // ── carrier motion ──
        if (phase === 1) {
          carrier.x += CRUISE * dt;
          const allAssembled = t > activeAt[N - 1] + ASSEMBLE_T;
          if (allAssembled && !markFormedFired) {
            markFormedFired = true;
            window.dispatchEvent(new Event("rx:mark-formed"));
          }
          if (allAssembled && carrier.x > halfW + 2.0) {
            // off the right edge, trails included — re-enter left on the button's line
            phase = 2;
            carrier.set(-halfW - 1.8, anchor.y, 0);
            for (let i = 0; i < N; i++) {
              slotOf(i, tmp);
              pos[i].copy(tmp);
              resetTrail(i, tmp);
            }
          }
        } else if (phase === 2) {
          const d = anchor.x - carrier.x;
          const v = Math.min(CRUISE, d * 1.4 + 0.05);
          carrier.x += v * dt;
          carrier.y = anchor.y;
          dockBlend = Math.max(dockBlend, Math.min(1, 1 - d / 1.8));
          if (d < 0.015) {
            phase = 3;
            carrier.x = anchor.x;
          }
        } else if (phase === 3) {
          dockBlend = Math.min(1, dockBlend + dt * 2);
          carrier.x = anchor.x;
          carrier.y = anchor.y + Math.sin(t * 0.9) * 0.016; // the mark breathes as one
        }

        // ── darts ride the carrier; each glides on from its dot ──
        for (let i = 0; i < N; i++) {
          if (t < activeAt[i]) continue;
          const s = smooth(Math.min(1, (t - activeAt[i]) / ASSEMBLE_T));
          slotOf(i, tmp);
          if (s < 1 && phase === 1) {
            pos[i].lerpVectors(dots[i], tmp, s);
          } else {
            pos[i].copy(tmp);
          }
          if (!trails[i].line.visible && phase <= 1) {
            trails[i].line.visible = true;
            resetTrail(i, pos[i]);
          }
          if (phase === 3) {
            // reel the ribbon in
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
          } else {
            pushTrail(i);
          }
        }
      };

      const writeInstances = (t: number) => {
        for (let i = 0; i < N; i++) {
          const born = Math.min(1, Math.max(0, (t - activeAt[i]) / 0.3));
          qBank.setFromAxisAngle(zA, Math.sin(t * 1.1 + i * 1.7) * 0.02);
          q.copy(qDock).multiply(qBank); // nose right, always — sideways by design
          const s = (FLY_K + (DOCK_K - FLY_K) * dockBlend) * born;
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
        if (!padsMeasured && simT >= LAUNCH_AT - 0.25) measureAndArm();
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
        carrier.copy(anchor);
        phase = 3;
        dockBlend = 1;
        for (let i = 0; i < N; i++) {
          slotOf(i, pos[i]);
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
