"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AgentConstellation — the LMAS "contained agent cluster" motif, evolved into a
 * living 3D object. A slowly rotating constellation of agent nodes breathing
 * inside a dashed wireframe boundary (the "walls"); 3 amber nodes pulse as
 * active agents, violet outline nodes idle, and data pulses travel the links.
 *
 * Engineering notes:
 * - three.js is dynamically imported inside useEffect → zero SSR involvement,
 *   zero cost until the component mounts.
 * - devicePixelRatio capped at 1.5; render loop pauses when the canvas is
 *   offscreen or the tab is hidden.
 * - prefers-reduced-motion: renders one composed still frame, no loop.
 * - Mobile (<768px) or no WebGL → static SVG fallback (the original motif).
 * - Decorative: aria-hidden; pointer-events: none (parallax reads window mouse).
 */

const AMBER = 0xf4a22c;
const BLUE = 0x3b78e8;
const BLUE_SOFT = 0x7ea9f2;

// Node layout: hand-placed inside the boundary so the composition is stable
// and art-directed rather than random on every visit. [x, y, z, active?]
const NODES: [number, number, number, boolean][] = [
  [-3.3, 0.7, 0.3, true],
  [-1.1, 1.15, -0.7, false],
  [1.6, 0.9, 0.5, false],
  [3.5, 0.15, -0.4, true],
  [-3.8, -0.55, -0.5, false],
  [-1.6, -0.15, 0.8, false],
  [0.35, -0.75, -0.2, true],
  [2.45, -0.9, 0.6, false],
  [4.0, -0.3, 0.9, false],
  [-2.3, -1.05, -0.8, false],
  [1.4, 0.1, -1.0, false],
  [-0.2, 0.4, 1.1, false],
  [4.6, 1.0, -0.2, false],
  [-4.5, 0.15, 0.5, false],
  [2.9, -0.2, -0.9, true],
  [-0.9, -1.15, 0.2, false],
];

// Connections between node indices — a sparse mesh, mirrors the 2D motif.
const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 5], [5, 6], [6, 7], [7, 3],
  [4, 5], [4, 9], [9, 6], [2, 10], [10, 6], [11, 5], [11, 2], [8, 3], [8, 7],
  [12, 3], [12, 8], [13, 0], [13, 4], [14, 7], [14, 10], [15, 9], [15, 6], [12, 14],
];

function StaticFallback() {
  // The original 2D motif, scaled up — shown on mobile / no-WebGL / errors.
  return (
    <svg
      viewBox="0 0 168 88"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", opacity: 0.35, maxWidth: 720 }}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="1.5" y="1.5" width="165" height="85" rx="12" stroke="var(--reaction-soft)" strokeOpacity="0.4" strokeDasharray="5 5" />
      <path d="M48 32 L92 26 M92 26 L122 54 M48 32 L70 64 M70 64 L122 54" stroke="var(--reaction-soft)" strokeOpacity="0.32" />
      <circle cx="48" cy="32" r="8" fill="var(--action)" />
      <circle cx="92" cy="26" r="6.5" stroke="#c9c3e8" strokeWidth="1.6" />
      <circle cx="122" cy="54" r="8" fill="var(--action)" />
      <circle cx="70" cy="64" r="6.5" stroke="#c9c3e8" strokeWidth="1.6" />
    </svg>
  );
}

export default function AgentConstellation() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Mobile → static motif (per brief: graceful fallback, keep the page fast).
    if (window.innerWidth < 768) {
      setFallback(true);
      return;
    }

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

      // WebGL support check
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        setFallback(true);
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 60);
      camera.position.set(0, 0.15, 9.6);

      const group = new THREE.Group();
      scene.add(group);
      group.rotation.set(0.12, -0.22, 0);

      // ── The walls: dashed wireframe boundary ──
      const boundaryGeom = new THREE.BoxGeometry(10.4, 4.4, 3.4);
      const edges = new THREE.EdgesGeometry(boundaryGeom);
      const boundaryMat = new THREE.LineDashedMaterial({
        color: BLUE_SOFT,
        transparent: true,
        opacity: 0.38,
        dashSize: 0.14,
        gapSize: 0.11,
      });
      const boundary = new THREE.LineSegments(edges, boundaryMat);
      boundary.computeLineDistances();
      group.add(boundary);

      // ── Glow sprite texture (radial gradient, generated — no assets) ──
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 128;
      const gctx = glowCanvas.getContext("2d");
      if (gctx) {
        const grad = gctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        grad.addColorStop(0, "rgba(244,162,44,0.85)");
        grad.addColorStop(0.35, "rgba(244,162,44,0.28)");
        grad.addColorStop(1, "rgba(244,162,44,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 128, 128);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);

      // ── Agent nodes ──
      type NodeEntry = {
        mesh: import("three").Mesh;
        glow: import("three").Sprite | null;
        base: import("three").Vector3;
        active: boolean;
        phase: number;
        speed: number;
      };
      const nodeEntries: NodeEntry[] = [];
      const activeGeom = new THREE.SphereGeometry(0.16, 20, 16);
      const idleGeom = new THREE.SphereGeometry(0.13, 10, 7);
      const activeMat = new THREE.MeshBasicMaterial({ color: AMBER });
      const idleMat = new THREE.MeshBasicMaterial({ color: BLUE_SOFT, wireframe: true, transparent: true, opacity: 0.85 });

      for (const [x, y, z, active] of NODES) {
        const mesh = new THREE.Mesh(active ? activeGeom : idleGeom, active ? activeMat : idleMat);
        mesh.position.set(x, y, z);
        group.add(mesh);
        let glow: import("three").Sprite | null = null;
        if (active) {
          const smat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.9 });
          glow = new THREE.Sprite(smat);
          glow.scale.setScalar(1.1);
          glow.position.copy(mesh.position);
          group.add(glow);
        }
        nodeEntries.push({
          mesh,
          glow,
          base: new THREE.Vector3(x, y, z),
          active,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 0.5,
        });
      }

      // ── Links ──
      const linkMat = new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.28 });
      const linkLines: { line: import("three").Line; a: number; b: number }[] = [];
      for (const [a, b] of LINKS) {
        const geom = new THREE.BufferGeometry().setFromPoints([nodeEntries[a].base, nodeEntries[b].base]);
        const line = new THREE.Line(geom, linkMat);
        group.add(line);
        linkLines.push({ line, a, b });
      }

      // ── Data pulses travelling the links ──
      const pulseGeom = new THREE.SphereGeometry(0.05, 8, 6);
      const pulseMat = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.95 });
      type Pulse = { mesh: import("three").Mesh; link: number; t: number; speed: number };
      const pulses: Pulse[] = [];
      for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(pulseGeom, pulseMat);
        group.add(mesh);
        pulses.push({ mesh, link: Math.floor(Math.random() * LINKS.length), t: Math.random(), speed: 0.25 + Math.random() * 0.3 });
      }

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

      // ── Cursor parallax (window-level; canvas keeps pointer-events none) ──
      let targetRX = group.rotation.x;
      let targetRY = group.rotation.y;
      const onMouse = (e: MouseEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        targetRY = -0.22 + nx * 0.1;
        targetRX = 0.14 + ny * 0.08;
      };
      if (!reduceMotion) window.addEventListener("mousemove", onMouse, { passive: true });

      // ── Animation ──
      const clock = new THREE.Clock();
      const tmpA = new THREE.Vector3();
      const tmpB = new THREE.Vector3();

      const frame = () => {
        const t = clock.getElapsedTime();

        // slow autonomous rotation + eased parallax
        targetRY += 0.00045;
        group.rotation.y += (targetRY - group.rotation.y) * 0.05;
        group.rotation.x += (targetRX - group.rotation.x) * 0.05;

        // nodes breathe and drift
        for (const n of nodeEntries) {
          const s = 1 + (n.active ? 0.16 : 0.07) * Math.sin(t * n.speed + n.phase);
          n.mesh.scale.setScalar(s);
          n.mesh.position.copy(n.base);
          n.mesh.position.y += Math.sin(t * 0.5 + n.phase) * 0.06;
          if (n.glow) {
            n.glow.position.copy(n.mesh.position);
            n.glow.scale.setScalar(1.0 + 0.35 * (0.5 + 0.5 * Math.sin(t * n.speed + n.phase)));
          }
        }

        // links follow their endpoints
        for (const l of linkLines) {
          const pos = l.line.geometry.getAttribute("position");
          const pa = nodeEntries[l.a].mesh.position;
          const pb = nodeEntries[l.b].mesh.position;
          pos.setXYZ(0, pa.x, pa.y, pa.z);
          pos.setXYZ(1, pb.x, pb.y, pb.z);
          pos.needsUpdate = true;
        }

        // pulses travel; on arrival, hop to a new link
        for (const p of pulses) {
          p.t += p.speed * 0.016;
          if (p.t >= 1) {
            p.t = 0;
            p.link = Math.floor(Math.random() * LINKS.length);
          }
          const [a, b] = LINKS[p.link];
          tmpA.copy(nodeEntries[a].mesh.position);
          tmpB.copy(nodeEntries[b].mesh.position);
          p.mesh.position.lerpVectors(tmpA, tmpB, p.t);
          (p.mesh.material as import("three").MeshBasicMaterial).opacity = 0.55 + 0.4 * Math.sin(Math.PI * p.t);
        }

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
        clock.start();
        raf = requestAnimationFrame(loop);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      // Reduced motion: one composed still frame; otherwise run when visible.
      if (reduceMotion) {
        frame();
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
        window.removeEventListener("mousemove", onMouse);
        ro.disconnect();
        renderer.dispose();
        boundaryGeom.dispose();
        edges.dispose();
        activeGeom.dispose();
        idleGeom.dispose();
        pulseGeom.dispose();
        glowTex.dispose();
        for (const l of linkLines) l.line.geometry.dispose();
        if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      };

      // Stash for the outer cleanup
      (host as HTMLDivElement & { __rxDispose?: () => void }).__rxDispose = disposeAll;
    })();

    return () => {
      disposed = true;
      const h = hostRef.current as (HTMLDivElement & { __rxDispose?: () => void }) | null;
      h?.__rxDispose?.();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: fallback ? 28 : 0,
      }}
    >
      {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />}
    </div>
  );
}
