"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AgentConstellation v3 — the LMAS agent field, free-flowing.
 *
 * Design decisions (validated against composition renders):
 * - No boundary box: the field floats openly in a deep vignette.
 * - Glass-gloss idle agents: MeshPhysicalMaterial (clearcoat) + a PMREM
 *   RoomEnvironment for real reflections — the specular life the flat
 *   wireframes lacked.
 * - Amber actives are emissive with soft sprite halos, arranged on a rising
 *   diagonal kept clear of the headline and the section fold.
 * - Exponential fog + a slow dust layer give genuine depth: far agents dim
 *   into the navy, dust parallaxes at a different rate to the field.
 *
 * Engineering: dynamic three import (zero SSR), DPR capped 1.5, loop pauses
 * offscreen/tab-hidden, reduced-motion renders one still frame, mobile and
 * no-WebGL fall back to the static SVG motif. Decorative; aria-hidden.
 */


const BRONZE = 0xb4966e;
const EMBER = 0xf07a3d;
const FOG_DEEP = 0x14100c;

// Hand-placed field. [x, y, z, active] — actives on a rising diagonal.
const NODES: [number, number, number, boolean][] = [
  [-3.3, 0.7, 0.3, false],
  [-1.1, 1.15, -0.7, false],
  [1.6, 0.9, 0.5, false],
  [3.5, 0.15, -0.4, true],
  [-3.8, -0.55, -0.5, false],
  [-1.6, -0.15, 0.8, false],
  [0.35, -0.45, -0.2, true],
  [2.45, -0.9, 0.6, false],
  [4.0, -0.3, 0.9, false],
  [-2.3, -1.05, -0.8, false],
  [1.4, 0.1, -1.0, false],
  [-0.2, 0.4, 1.1, false],
  [4.6, 1.0, -0.2, true],
  [-4.5, 0.15, 0.5, false],
  [2.9, -0.2, -0.9, false],
  [-0.9, -1.15, 0.2, false],
];

const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 5], [5, 6], [6, 7], [7, 3],
  [4, 5], [4, 9], [9, 6], [2, 10], [10, 6], [11, 5], [11, 2], [8, 3], [8, 7],
  [12, 3], [12, 8], [13, 0], [13, 4], [14, 7], [14, 10], [15, 9], [15, 6], [12, 14],
];

function StaticFallback() {
  return (
    <svg
      viewBox="0 0 168 88"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", opacity: 0.3, maxWidth: 720 }}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M48 32 L92 26 M92 26 L122 54 M48 32 L70 64 M70 64 L122 54" stroke="var(--reaction-soft)" strokeOpacity="0.4" />
      <circle cx="48" cy="32" r="8" fill="var(--action)" />
      <circle cx="92" cy="26" r="6.5" stroke="#d8ccb6" strokeWidth="1.6" />
      <circle cx="122" cy="54" r="8" fill="var(--action)" />
      <circle cx="70" cy="64" r="6.5" stroke="#d8ccb6" strokeWidth="1.6" />
    </svg>
  );
}

// Procedural stone: fractal value noise warped into marble veining, baked to a
// canvas once and reused as albedo variation, bump relief, and roughness map.
function makeStoneTextures(THREE: typeof import("three")) {
  const size = 256;
  const mk = (n: number) => Array.from({ length: n * n }, () => Math.random());
  const grids = [8, 16, 32, 64].map((n) => ({ n, g: mk(n) }));
  const sample = (grid: { n: number; g: number[] }, x: number, y: number) => {
    const fx = (x / size) * grid.n;
    const fy = (y / size) * grid.n;
    const x0 = Math.floor(fx) % grid.n;
    const y0 = Math.floor(fy) % grid.n;
    const x1 = (x0 + 1) % grid.n;
    const y1 = (y0 + 1) % grid.n;
    const tx = fx - Math.floor(fx);
    const ty = fy - Math.floor(fy);
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const v00 = grid.g[y0 * grid.n + x0];
    const v10 = grid.g[y0 * grid.n + x1];
    const v01 = grid.g[y1 * grid.n + x0];
    const v11 = grid.g[y1 * grid.n + x1];
    return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy;
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 1;
      let tot = 0;
      for (const g of grids) {
        v += sample(g, x, y) * amp;
        tot += amp;
        amp *= 0.55;
      }
      v /= tot;
      // marble veining: sine field displaced by the turbulence
      const vein = 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 4 + v * 7);
      const shade = 0.62 * v + 0.38 * Math.pow(vein, 3);
      const c = Math.floor(92 + shade * 163);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const albedo = new THREE.CanvasTexture(canvas);
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.colorSpace = THREE.SRGBColorSpace;
  const relief = new THREE.CanvasTexture(canvas);
  relief.wrapS = relief.wrapT = THREE.RepeatWrapping;
  return { albedo, relief };
}

export default function AgentConstellation() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
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
      let RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment;
      try {
        THREE = await import("three");
        ({ RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js"));
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(FOG_DEEP, 0.05);

      // Environment: the reflections that make gloss read as glass
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 60);
      camera.position.set(0, 0.15, 9.6);

      // Soft directional shape + cool/warm hemisphere fill
      scene.add(new THREE.HemisphereLight(0xd8c4a8, 0x14100c, 0.55));
      const key = new THREE.DirectionalLight(0xffe8d0, 1.1);
      key.position.set(-4, 5, 6);
      scene.add(key);

      const group = new THREE.Group();
      scene.add(group);
      group.rotation.set(0.12, -0.22, 0);

      // ── Glow sprite (generated radial) ──
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 128;
      const gctx = glowCanvas.getContext("2d");
      if (gctx) {
        const grad = gctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        grad.addColorStop(0, "rgba(240,122,61,0.8)");
        grad.addColorStop(0.35, "rgba(240,122,61,0.25)");
        grad.addColorStop(1, "rgba(240,122,61,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 128, 128);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);

      // ── Materials ──
      const stone = makeStoneTextures(THREE);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x7d7264, // basalt (albedo map multiplies it down) // brightened: the stone albedo map multiplies it back down
        map: stone?.albedo ?? null,
        bumpMap: stone?.relief ?? null,
        bumpScale: 0.55,
        roughnessMap: stone?.relief ?? null,
        roughness: 0.85,
        metalness: 0.0,
        clearcoat: 0.14,          // honed, not polished
        clearcoatRoughness: 0.45,
        envMapIntensity: 0.9,
      });
      const activeMat = new THREE.MeshStandardMaterial({
        color: EMBER,
        emissive: EMBER,
        emissiveIntensity: 0.7,
        bumpMap: stone?.relief ?? null,
        bumpScale: 0.35,
        roughness: 0.5,
        metalness: 0.05,
      });

      // ── Agent nodes (varied radii for an organic field) ──
      type NodeEntry = {
        mesh: import("three").Mesh;
        glow: import("three").Sprite | null;
        base: import("three").Vector3;
        active: boolean;
        phase: number;
        speed: number;
      };
      const nodeEntries: NodeEntry[] = [];
      const geoms: import("three").BufferGeometry[] = [];

      NODES.forEach(([x, y, z, active], i) => {
        const r = active ? 0.18 : 0.11 + (i % 5) * 0.02;
        const geom = new THREE.SphereGeometry(r, 32, 24);
        geoms.push(geom);
        const mesh = new THREE.Mesh(geom, active ? activeMat : glassMat);
        mesh.position.set(x, y, z);
        group.add(mesh);
        let glow: import("three").Sprite | null = null;
        if (active) {
          const smat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.85 });
          glow = new THREE.Sprite(smat);
          glow.scale.setScalar(1.15);
          glow.position.copy(mesh.position);
          group.add(glow);
        }
        nodeEntries.push({
          mesh,
          glow,
          base: new THREE.Vector3(x, y, z),
          active,
          phase: Math.random() * Math.PI * 2,
          speed: 0.55 + Math.random() * 0.5,
        });
      });

      // ── Links ──
      const linkMat = new THREE.LineBasicMaterial({ color: BRONZE, transparent: true, opacity: 0.26 });
      const linkLines: { line: import("three").Line; a: number; b: number }[] = [];
      for (const [a, b] of LINKS) {
        const geom = new THREE.BufferGeometry().setFromPoints([nodeEntries[a].base, nodeEntries[b].base]);
        const line = new THREE.Line(geom, linkMat);
        group.add(line);
        linkLines.push({ line, a, b });
      }

      // ── Data pulses ──
      const pulseGeom = new THREE.SphereGeometry(0.05, 8, 6);
      const pulseMat = new THREE.MeshBasicMaterial({ color: EMBER, transparent: true, opacity: 0.95 });
      type Pulse = { mesh: import("three").Mesh; link: number; t: number; speed: number };
      const pulses: Pulse[] = [];
      for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(pulseGeom, pulseMat.clone());
        group.add(mesh);
        pulses.push({ mesh, link: Math.floor(Math.random() * LINKS.length), t: Math.random(), speed: 0.25 + Math.random() * 0.3 });
      }

      // ── Depth dust: a wider, slower particle layer ──
      const dustCount = 110;
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 15;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 7;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 7;
      }
      const dustGeom = new THREE.BufferGeometry();
      dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({ color: BRONZE, size: 0.035, transparent: true, opacity: 0.4, depthWrite: false });
      const dust = new THREE.Points(dustGeom, dustMat);
      scene.add(dust);
      dust.rotation.copy(group.rotation);

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

      // ── Cursor parallax ──
      let targetRX = group.rotation.x;
      let targetRY = group.rotation.y;
      const onMouse = (e: MouseEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        targetRY = -0.22 + nx * 0.1;
        targetRX = 0.12 + ny * 0.07;
      };
      if (!reduceMotion) window.addEventListener("mousemove", onMouse, { passive: true });

      const clock = new THREE.Clock();
      const tmpA = new THREE.Vector3();
      const tmpB = new THREE.Vector3();

      const frame = () => {
        const t = clock.getElapsedTime();
        targetRY += 0.00045;
        group.rotation.y += (targetRY - group.rotation.y) * 0.05;
        group.rotation.x += (targetRX - group.rotation.x) * 0.05;
        // dust parallaxes at 60% of the field's motion — depth separation
        dust.rotation.y += (targetRY * 0.6 - dust.rotation.y) * 0.04;
        dust.rotation.x += (targetRX * 0.6 - dust.rotation.x) * 0.04;

        for (const n of nodeEntries) {
          const s = 1 + (n.active ? 0.14 : 0.06) * Math.sin(t * n.speed + n.phase);
          n.mesh.scale.setScalar(s);
          n.mesh.position.copy(n.base);
          n.mesh.position.y += Math.sin(t * 0.5 + n.phase) * 0.06;
          n.mesh.rotation.y = t * 0.15 + n.phase; // slow spin catches the env reflections
          if (n.glow) {
            n.glow.position.copy(n.mesh.position);
            n.glow.scale.setScalar(1.05 + 0.3 * (0.5 + 0.5 * Math.sin(t * n.speed + n.phase)));
          }
        }

        for (const l of linkLines) {
          const pos = l.line.geometry.getAttribute("position");
          const pa = nodeEntries[l.a].mesh.position;
          const pb = nodeEntries[l.b].mesh.position;
          pos.setXYZ(0, pa.x, pa.y, pa.z);
          pos.setXYZ(1, pb.x, pb.y, pb.z);
          pos.needsUpdate = true;
        }

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
          (p.mesh.material as import("three").MeshBasicMaterial).opacity = 0.5 + 0.45 * Math.sin(Math.PI * p.t);
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
        scene.environment?.dispose();
        renderer.dispose();
        for (const g of geoms) g.dispose();
        pulseGeom.dispose();
        dustGeom.dispose();
        glowTex.dispose();
        stone?.albedo.dispose();
        stone?.relief.dispose();
        glassMat.dispose();
        activeMat.dispose();
        linkMat.dispose();
        dustMat.dispose();
        for (const l of linkLines) l.line.geometry.dispose();
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
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />}
    </div>
  );
}
