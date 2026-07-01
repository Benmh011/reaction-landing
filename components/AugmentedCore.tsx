"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AugmentedCore — the flagship 3D model of the "Our approach" section.
 * The "Augmented over artificial" motif in genuine depth:
 *
 *   two glass-gloss inputs (your team + your tools) stream particles along
 *   converging curves into a radiant amber core — augmented output — wrapped
 *   in a slowly precessing orbit ring.
 *
 * Interactive: the model tilts toward the cursor over its card, and the
 * particle streams quicken on hover. Same fidelity stack as the hero
 * (PMREM RoomEnvironment, ACES tonemapping, fog) so the gloss matches.
 *
 * Engineering: dynamic three import, DPR cap 1.5, offscreen/tab pause,
 * reduced-motion still frame, static SVG fallback when WebGL is unavailable.
 */

const BLUE_GLASS = 0x1a3f8a;
const BLUE_SOFT = 0x7ea9f2;
const AMBER = 0xf4a22c;
const FOG_NAVY = 0x071731;

function StaticFallback() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 168 88" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <circle cx="30" cy="26" r="6.5" stroke="#c6d7ef" strokeWidth="1.6" />
      <circle cx="30" cy="62" r="6.5" stroke="#c6d7ef" strokeWidth="1.6" />
      <path d="M39 28 L98 42 M39 60 L98 46" stroke="var(--reaction-soft)" strokeOpacity="0.45" />
      <circle cx="116" cy="44" r="9" fill="var(--action)" />
    </svg>
  );
}

export default function AugmentedCore() {
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
      scene.fog = new THREE.FogExp2(FOG_NAVY, 0.04);
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
      camera.position.set(0, 0.1, 6.2);

      scene.add(new THREE.HemisphereLight(0x7ea9f2, 0x081b3d, 0.5));
      const key = new THREE.DirectionalLight(0xdbe8ff, 1.0);
      key.position.set(-3, 4, 5);
      scene.add(key);

      const group = new THREE.Group();
      scene.add(group);

      // ── Two glass inputs ──
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: BLUE_GLASS,
        metalness: 0.05,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.4,
      });
      const inputGeom = new THREE.SphereGeometry(0.42, 40, 28);
      const inputA = new THREE.Mesh(inputGeom, glassMat);
      inputA.position.set(-1.75, 0.6, 0);
      const inputB = new THREE.Mesh(inputGeom, glassMat);
      inputB.position.set(-1.75, -0.6, 0.15);
      group.add(inputA, inputB);

      // ── The radiant core ──
      const coreMat = new THREE.MeshStandardMaterial({
        color: AMBER,
        emissive: AMBER,
        emissiveIntensity: 0.8,
        roughness: 0.28,
        metalness: 0.1,
      });
      const coreGeom = new THREE.SphereGeometry(0.55, 48, 32);
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.position.set(1.55, 0, 0);
      group.add(core);

      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 128;
      const gctx = glowCanvas.getContext("2d");
      if (gctx) {
        const grad = gctx.createRadialGradient(64, 64, 6, 64, 64, 64);
        grad.addColorStop(0, "rgba(244,162,44,0.85)");
        grad.addColorStop(0.4, "rgba(244,162,44,0.22)");
        grad.addColorStop(1, "rgba(244,162,44,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 128, 128);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.9 }));
      glow.scale.setScalar(2.6);
      glow.position.copy(core.position);
      group.add(glow);

      // ── Orbit ring, precessing around the core ──
      const ringGeom = new THREE.TorusGeometry(0.92, 0.012, 12, 96);
      const ringMat = new THREE.MeshBasicMaterial({ color: BLUE_SOFT, transparent: true, opacity: 0.55 });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(core.position);
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);

      // ── Converging particle streams (quadratic curves, blue→amber) ──
      const curveA = new THREE.QuadraticBezierCurve3(
        inputA.position.clone(),
        new THREE.Vector3(-0.1, 1.15, 0.35),
        core.position.clone(),
      );
      const curveB = new THREE.QuadraticBezierCurve3(
        inputB.position.clone(),
        new THREE.Vector3(-0.1, -1.15, 0.35),
        core.position.clone(),
      );

      const streamMat = new THREE.LineBasicMaterial({ color: BLUE_SOFT, transparent: true, opacity: 0.18 });
      const streamGeoms: import("three").BufferGeometry[] = [];
      for (const c of [curveA, curveB]) {
        const g = new THREE.BufferGeometry().setFromPoints(c.getPoints(48));
        streamGeoms.push(g);
        group.add(new THREE.Line(g, streamMat));
      }

      const COLOR_A = new THREE.Color(BLUE_SOFT);
      const COLOR_B = new THREE.Color(AMBER);
      type Particle = { mesh: import("three").Mesh; curve: import("three").QuadraticBezierCurve3; t: number; speed: number };
      const particles: Particle[] = [];
      const partGeom = new THREE.SphereGeometry(0.035, 8, 6);
      for (let i = 0; i < 30; i++) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true });
        const mesh = new THREE.Mesh(partGeom, mat);
        group.add(mesh);
        particles.push({
          mesh,
          curve: i % 2 === 0 ? curveA : curveB,
          t: Math.random(),
          speed: 0.1 + Math.random() * 0.08,
        });
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

      // ── Interaction: tilt toward cursor over the card; streams quicken ──
      const card = host.closest("[data-core-card]") ?? host;
      let targetRX = 0;
      let targetRY = 0;
      let hoverBoost = 0;
      let hovering = false;
      const onMove = (e: PointerEvent) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        targetRY = nx * 0.28;
        targetRX = ny * 0.18;
      };
      const onEnter = () => { hovering = true; };
      const onLeave = () => { hovering = false; targetRX = 0; targetRY = 0; };
      if (!reduceMotion) {
        (card as HTMLElement).addEventListener("pointermove", onMove, { passive: true });
        (card as HTMLElement).addEventListener("pointerenter", onEnter, { passive: true });
        (card as HTMLElement).addEventListener("pointerleave", onLeave, { passive: true });
      }

      const clock = new THREE.Clock();
      const frame = () => {
        const t = clock.getElapsedTime();
        hoverBoost += ((hovering ? 1 : 0) - hoverBoost) * 0.06;

        group.rotation.y += (targetRY - group.rotation.y) * 0.07;
        group.rotation.x += (targetRX - group.rotation.x) * 0.07;

        inputA.position.y = 0.6 + Math.sin(t * 0.7) * 0.06;
        inputB.position.y = -0.6 + Math.sin(t * 0.7 + 1.7) * 0.06;
        inputA.rotation.y = t * 0.2;
        inputB.rotation.y = t * 0.2 + 1;

        const pulse = 1 + 0.05 * Math.sin(t * 1.4);
        core.scale.setScalar(pulse);
        coreMat.emissiveIntensity = 0.7 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.4)) + 0.25 * hoverBoost;
        glow.scale.setScalar(2.5 + 0.35 * Math.sin(t * 1.4) + 0.5 * hoverBoost);

        ring.rotation.z = t * 0.25;
        ring.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.35) * 0.22;

        for (const p of particles) {
          p.t += (p.speed + hoverBoost * 0.12) * 0.016 * 4;
          if (p.t >= 1) p.t = 0;
          p.curve.getPoint(p.t, p.mesh.position);
          const m = p.mesh.material as import("three").MeshBasicMaterial;
          m.color.copy(COLOR_A).lerp(COLOR_B, p.t * 0.9);
          m.opacity = 0.35 + 0.6 * p.t;
          p.mesh.scale.setScalar(0.7 + 0.9 * p.t);
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
          (card as HTMLElement).removeEventListener("pointermove", onMove);
          (card as HTMLElement).removeEventListener("pointerenter", onEnter);
          (card as HTMLElement).removeEventListener("pointerleave", onLeave);
        };
      }

      const disposeAll = () => {
        stop();
        cleanup?.();
        ro.disconnect();
        scene.environment?.dispose();
        renderer.dispose();
        inputGeom.dispose();
        coreGeom.dispose();
        ringGeom.dispose();
        partGeom.dispose();
        for (const g of streamGeoms) g.dispose();
        glowTex.dispose();
        glassMat.dispose();
        coreMat.dispose();
        ringMat.dispose();
        streamMat.dispose();
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
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {fallback ? <StaticFallback /> : <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />}
    </div>
  );
}
