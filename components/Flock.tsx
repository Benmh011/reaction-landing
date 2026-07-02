"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flock, sixth movement — the flypast.
 *
 * The headline opens slightly condensed so "Intelligence, information."
 * holds one line. Red, blue, green rise off their tittles in sequence and
 * glide onto an invisible carrier travelling smoothly rightward just above
 * the text — each dart a single eased slide onto its moving slot, noses
 * right from birth, nothing ever rotating, so the merge cannot snap.
 *
 * As the assembled mark PASSES OVER the word, we fire rx:mark-formed and
 * the page vaporises "formation" in the mark's wake, reforming it on its
 * own line while the headline grows to full size — the original design,
 * revealed. The mark exits right, re-enters on the button's line (the
 * station is re-measured there, since the reveal reflows the page), and
 * decelerates onto its pointing station: nose-tip aimed at the button.
 *
 * No ribbon trails. Behind the travelling mark: three short, dead-straight
 * ink speed lines with fading tips — they record no history, so they can
 * never wobble. The darts themselves are two-tone folds: each wing a
 * slightly different shade of its captain's colour. Paper, not polygons.
 */

const CAPTAINS = [
  { pad: "verm", color: 0xc93a17 },
  { pad: "blue", color: 0x2565aa },
  { pad: "green", color: 0x0d5a40 },
];
const N = 3;
const LAUNCH_AT = 1.7;
const STAGGER = 0.34;
const ASSEMBLE_T = 0.85;
const CRUISE = 2.3;
const FLY_K = 0.17;
const DOCK_K = 0.26;
const LAYER_DX = 0.12;
const LAYER_DZ = 0.02;
const ANCHOR_GAP_PX = 44;

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

      // ── Darts: two-tone origami fold (per-wing shading × instance colour) ──
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [0, 1.0, 0, -0.62, -0.75, 0.2, 0, -0.45, 0, 0, 1.0, 0, 0, -0.45, 0, 0.62, -0.75, 0.2],
          3,
        ),
      );
      // wing 1 full tone, wing 2 caught in shadow of the fold
      const shade = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78, 0.78];
      geo.setAttribute("color", new THREE.Float32BufferAttribute(shade, 3));
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true });
      const mesh = new THREE.InstancedMesh(geo, mat, N);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const col = new THREE.Color();
      CAPTAINS.forEach((c, i) => {
        col.setHex(c.color);
        mesh.setColorAt(i, col);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);

      // ── Speed lines: three dead-straight ink strokes with fading tips ──
      const lineMats: import("three").MeshBasicMaterial[] = [];
      const speedGroup = new THREE.Group();
      const SPEC = [
        { len: 0.55, dy: 0.1 },
        { len: 0.82, dy: 0 },
        { len: 0.55, dy: -0.1 },
      ];
      const speedLines = SPEC.map((s) => {
        const g = new THREE.PlaneGeometry(s.len, 0.016);
        const ink = new THREE.Color(0x1a1713);
        const paper = new THREE.Color(0xf7f4ec);
        // left pair fades to paper, right pair solid ink
        const cols = new Float32Array([
          paper.r, paper.g, paper.b,
          ink.r, ink.g, ink.b,
          paper.r, paper.g, paper.b,
          ink.r, ink.g, ink.b,
        ]);
        g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 });
        lineMats.push(m);
        const mesh2 = new THREE.Mesh(g, m);
        mesh2.position.set(-s.len / 2, s.dy, -0.06);
        speedGroup.add(mesh2);
        return { mesh: mesh2, spec: s };
      });
      speedGroup.visible = false;
      scene.add(speedGroup);

      // ── The carrier and its journey ──
      // phases: 0 pre-launch · 1 rightward (assemble, flypast, exit) · 2 return · 3 docked
      let phase = 0;
      const carrier = new THREE.Vector3();
      let assembled = false;
      let passedFired = false;
      let dockBlend = 0;
      let groupLeftX = 0; // world x of the word that will vaporise

      const dots = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const pos = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const activeAt = [0, 1, 2].map((i) => LAUNCH_AT + i * STAGGER);

      const slotOf = (i: number, out: import("three").Vector3) => {
        out.set(carrier.x - i * LAYER_DX, carrier.y, -i * LAYER_DZ);
        return out;
      };

      let padsMeasured = false;
      const measureAndArm = () => {
        measureAnchor();
        CAPTAINS.forEach((c, i) => {
          const el = host.closest("section")?.querySelector(`[data-captain="${c.pad}"]`);
          if (el) {
            const d = (el as HTMLElement).getBoundingClientRect();
            unproject(d.left + d.width / 2, d.top + d.height / 2, dots[i]);
          } else {
            dots[i].set(-halfW * 0.35 + i * 0.6, halfH * 0.15, 0);
          }
          dots[i].z = -i * LAYER_DZ;
          pos[i].copy(dots[i]);
        });
        const grp = host.closest("section")?.querySelector("[data-mf-group]");
        if (grp) {
          const gr = (grp as HTMLElement).getBoundingClientRect();
          const tmp2 = new THREE.Vector3();
          unproject(gr.left, gr.top + gr.height / 2, tmp2);
          groupLeftX = tmp2.x;
        } else {
          groupLeftX = dots[1].x + 0.4;
        }
        const topY = Math.max(dots[0].y, dots[1].y, dots[2].y);
        carrier.set(dots[0].x + 0.4, topY + 0.62, 0);
        phase = 1;
        padsMeasured = true;
      };

      const tmp = new THREE.Vector3();
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const qDock = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
      const qBank = new THREE.Quaternion();
      const zA = new THREE.Vector3(0, 0, 1);
      let lineFade = 0; // speed-line intensity

      const step = (dt: number, t: number) => {
        if (phase === 1) {
          carrier.x += CRUISE * dt;
          if (!assembled && t > activeAt[N - 1] + ASSEMBLE_T) {
            assembled = true;
            speedGroup.visible = true;
          }
          // the flypast: the word vaporises in the mark's wake
          if (assembled && !passedFired && carrier.x + DOCK_K > groupLeftX) {
            passedFired = true;
            window.dispatchEvent(new Event("rx:mark-formed"));
          }
          if (assembled && carrier.x > halfW + 2.0) {
            phase = 2;
            measureAnchor(); // the reveal reflowed the page — re-fix the station
            carrier.set(-halfW - 1.8, anchor.y, 0);
            for (let i = 0; i < N; i++) {
              slotOf(i, tmp);
              pos[i].copy(tmp);
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
          carrier.y = anchor.y + Math.sin(t * 0.9) * 0.016;
        }

        for (let i = 0; i < N; i++) {
          if (t < activeAt[i]) continue;
          const s = smooth(Math.min(1, (t - activeAt[i]) / ASSEMBLE_T));
          slotOf(i, tmp);
          if (s < 1 && phase === 1) pos[i].lerpVectors(dots[i], tmp, s);
          else pos[i].copy(tmp);
        }

        // speed lines ride the tail; intensity follows motion, dies on docking
        const target = assembled && phase !== 3 ? 1 : 0;
        lineFade += (target - lineFade) * Math.min(1, dt * (target ? 3 : 4));
        speedGroup.position.set(carrier.x - 2 * LAYER_DX - 0.18, carrier.y, 0);
        lineMats.forEach((m2, k) => {
          m2.opacity = lineFade * (k === 1 ? 0.85 : 0.6);
        });
        if (lineFade < 0.01 && phase === 3) speedGroup.visible = false;
      };

      const writeInstances = (t: number) => {
        for (let i = 0; i < N; i++) {
          const born = Math.min(1, Math.max(0, (t - activeAt[i]) / 0.3));
          qBank.setFromAxisAngle(zA, Math.sin(t * 1.1 + i * 1.7) * 0.02);
          q.copy(qDock).multiply(qBank);
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
        speedLines.forEach((sl) => sl.mesh.geometry.dispose());
        lineMats.forEach((m2) => m2.dispose());
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
