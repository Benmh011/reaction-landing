"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The engine block — the engine room as a machine.
 *
 * Five agent modules in a floating rack, each slab keyed with its
 * captain's colour on the end grain: Diary, Messages, Records, Drafting,
 * Compliance. The block hangs suspended against the page, oscillating
 * gently, never boxed. When an agent works, its module slides out of the
 * rack like a drawer, lamp pulsing in its colour, and its status line —
 * crisp DOM text anchored to the module's projected corner — types out
 * the work. Handoffs run as a bead of colour down the rack's spine.
 * Drafts hold the drawer half-out under an amber lamp until the human
 * beat: a ring seals around the whole block, turns green, the lamps go
 * green, and the work is sent. Then the block stands down and the shift
 * begins again.
 *
 * Three.js on the Flock's patterns: import guards, unlit vertex-shaded
 * paper materials with inverted-hull ink outlines, DPR capped, pauses
 * off-screen, reduced motion holds the block at full working state.
 */

const INKC = 0x1a1713;
const PAPER2C = 0xfdfbf5;
const TOPC = 0xefe9da;
const SIDEC = 0xf6f0e2;
const BOTC = 0xe6dfcf;
const GREENC = 0x0d5a40;
const GREEN_SOFTC = 0x46a37e;
const AMBERC = 0xb98a3a;
const HAIRC = 0xc9c2b0;

const AGENTS = [
  { name: "DIARY AGENT", hex: 0xc93a17, css: "#c93a17" },
  { name: "MESSAGES AGENT", hex: 0x2565aa, css: "#2565aa" },
  { name: "RECORDS AGENT", hex: 0x5f93c9, css: "#5f93c9" },
  { name: "DRAFTING AGENT", hex: 0xe8896c, css: "#e8896c" },
  { name: "COMPLIANCE AGENT", hex: 0x0d5a40, css: "#0d5a40" },
];

type St = "idle" | "work" | "amber" | "done";
type Ev = { t: number; a: number; text: string; st: St; pulseTo?: number };

const SCRIPT: Ev[] = [
  { t: 0.3, a: 0, text: "Reading tomorrow's diary", st: "work" },
  { t: 2.7, a: 0, text: "2 conflicts \u2192 rescheduling", st: "work" },
  { t: 5.0, a: 0, text: "Diary clear \u2014 resolved", st: "done", pulseTo: 1 },
  { t: 5.7, a: 1, text: "Drafting 2 reschedule notes", st: "work" },
  { t: 8.0, a: 1, text: "2 drafts \u2192 sign-off queue", st: "amber" },
  { t: 8.5, a: 2, text: "Pulling the Bowden Ltd file", st: "work" },
  { t: 10.7, a: 2, text: "Renewal terms found \u2014 cited", st: "done", pulseTo: 3 },
  { t: 11.4, a: 3, text: "Drafting the renewal letter", st: "work" },
  { t: 13.8, a: 3, text: "Draft ready \u2192 sign-off", st: "amber" },
  { t: 14.3, a: 4, text: "Checking against Policy v3", st: "work" },
  { t: 16.6, a: 4, text: "Grounded \u2014 2 sources cited", st: "done" },
  { t: 18.3, a: 1, text: "Messages signed off \u2014 sent", st: "done" },
  { t: 18.6, a: 3, text: "Letter signed off \u2014 sent", st: "done" },
  { t: 21.0, a: 0, text: "Standing by", st: "idle" },
  { t: 21.3, a: 1, text: "Standing by", st: "idle" },
  { t: 21.6, a: 2, text: "Standing by", st: "idle" },
  { t: 21.9, a: 3, text: "Standing by", st: "idle" },
  { t: 22.2, a: 4, text: "Standing by", st: "idle" },
];
const LOOP = 23.6, CPS = 30;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

const agentState = (t: number, a: number) => {
  let ev: Ev | null = null, prev: Ev | null = null;
  for (const e of SCRIPT) {
    if (e.a !== a) continue;
    if (e.t <= t && (!ev || e.t > ev.t)) { prev = ev; ev = e; }
  }
  return { st: (ev?.st ?? "idle") as St, text: ev?.text ?? "Standing by", et: ev?.t ?? 0, prevSt: (prev?.st ?? "idle") as St };
};
const slideTarget = (st: St) => (st === "work" ? 0.55 : st === "amber" ? 0.3 : 0);

const stripState = (t: number) => {
  if (t >= 18.3 && t < 21.0) return { text: "SIGNED OFF \u2713 \u00b7 SENT", color: "#0d5a40", border: "#0d5a40" };
  if (t >= 17.4 && t < 18.3) return { text: "\u2192 SIGN-OFF \u00b7 2 ITEMS", color: "#b98a3a", border: "#b98a3a" };
  if (t >= 13.8 && t < 17.4) return { text: "2 AWAITING SIGN-OFF", color: "#b98a3a", border: "#b98a3a" };
  if (t >= 8.0 && t < 13.8) return { text: "1 AWAITING SIGN-OFF", color: "#b98a3a", border: "#b98a3a" };
  return { text: "HUMAN SIGN-OFF \u2014 YOUR TEAM HOLDS THE DIAL", color: "#8a8175", border: "#d8d1bf" };
};

const MW = 2.5, MH = 0.55, MD = 1.3;
const midY = (i: number) => (2 - i) * 0.92;
const SPINE_LX = -1.02;

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 110" width="100%" aria-hidden="true" style={{ display: "block", opacity: 0.9 }}>
      {AGENTS.map((a, i) => (
        <g key={a.name}>
          <rect x="24" y={16 + i * 17} width="52" height="12" rx="2" fill="#fdfbf5" stroke="#1a1713" strokeOpacity="0.65" />
          <rect x="24" y={16 + i * 17} width="5" height="12" rx="1.5" fill={a.css} />
        </g>
      ))}
    </svg>
  );
}

export default function EngineBlock() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const labelHostRef = useRef<HTMLDivElement | null>(null);
  const nameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement | null>(null);
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
      const camera = new THREE.PerspectiveCamera(34, 0.8, 0.1, 60);
      camera.position.set(0.6, 0.9, 9.6);
      camera.lookAt(-0.1, 0, 0);

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

      // ── the rig ──
      const rig = new THREE.Group();
      rig.position.x = -0.55;
      scene.add(rig);

      // module geometry with per-face vertex colours (unlit shading)
      const c = new THREE.Color();
      const faceCols = (agentHex: number) => {
        // BoxGeometry face order: +x, -x, +y, -y, +z, -z
        const cols = [SIDEC, agentHex, TOPC, BOTC, PAPER2C, TOPC];
        const arr = new Float32Array(24 * 3);
        for (let f = 0; f < 6; f++) {
          c.setHex(cols[f]);
          for (let v2 = 0; v2 < 4; v2++) {
            const k = (f * 4 + v2) * 3;
            arr[k] = c.r; arr[k + 1] = c.g; arr[k + 2] = c.b;
          }
        }
        return arr;
      };
      const hullGeo = new THREE.BoxGeometry(MW + 0.05, MH + 0.05, MD + 0.05);
      const hullMat = new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide });
      const faceMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const lampGeo = new THREE.CircleGeometry(0.055, 20);

      const modules: import("three").Group[] = [];
      const lampMats: import("three").MeshBasicMaterial[] = [];
      const anchors: import("three").Object3D[] = [];
      const disposables: { dispose(): void }[] = [hullGeo, hullMat, faceMat, lampGeo];

      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        const geo = new THREE.BoxGeometry(MW, MH, MD);
        geo.setAttribute("color", new THREE.BufferAttribute(faceCols(AGENTS[i].hex), 3));
        disposables.push(geo);
        g.add(new THREE.Mesh(hullGeo, hullMat));
        g.add(new THREE.Mesh(geo, faceMat));
        const lampMat = new THREE.MeshBasicMaterial({ color: HAIRC });
        disposables.push(lampMat);
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(MW / 2 - 0.3, 0, MD / 2 + 0.006);
        g.add(lamp);
        lampMats.push(lampMat);
        const anchor = new THREE.Object3D();
        anchor.position.set(MW / 2, MH / 2, MD / 2);
        g.add(anchor);
        anchors.push(anchor);
        g.position.set(0, midY(i), 0);
        rig.add(g);
        modules.push(g);
      }

      // spine + bead
      const spineGeo = new THREE.CylinderGeometry(0.016, 0.016, midY(0) - midY(4) + 0.3, 8);
      const spineMat = new THREE.MeshBasicMaterial({ color: INKC, transparent: true, opacity: 0.35 });
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.set(SPINE_LX, 0, 0);
      rig.add(spine);
      const beadGeo = new THREE.SphereGeometry(0.055, 12, 12);
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xc93a17 });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.visible = false;
      bead.position.x = SPINE_LX;
      rig.add(bead);
      const beadGlowMat = new THREE.MeshBasicMaterial({ color: 0xc93a17, transparent: true, opacity: 0.22 });
      const beadGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), beadGlowMat);
      beadGlow.visible = false;
      beadGlow.position.x = SPINE_LX;
      rig.add(beadGlow);
      disposables.push(spineGeo, spineMat, beadGeo, beadMat, beadGlowMat, beadGlow.geometry as unknown as { dispose(): void });

      // the seal ring
      const rpts: number[] = [];
      for (let k = 0; k <= 110; k++) {
        const a = (k / 110) * Math.PI * 2;
        rpts.push(Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05);
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(rpts, 3));
      const ringMat = new THREE.LineDashedMaterial({ color: AMBERC, transparent: true, opacity: 0, dashSize: 0.12, gapSize: 0.2 });
      const ring = new THREE.Line(ringGeo, ringMat);
      ring.computeLineDistances();
      ring.position.y = -0.2;
      rig.add(ring);
      disposables.push(ringGeo, ringMat);

      // ── per-frame ──
      const wv = new THREE.Vector3();
      const writeFrame = (t: number, blink: boolean) => {
        rig.rotation.y = -0.5 + 0.16 * Math.sin(t * 0.4);
        rig.rotation.x = -0.1;
        rig.position.y = 0.06 * Math.sin(t * 0.7);

        for (let i = 0; i < 5; i++) {
          const s = agentState(t, i);
          const from = slideTarget(s.prevSt);
          const to = slideTarget(s.st);
          modules[i].position.z = from + (to - from) * smooth((t - s.et) / 0.45);
          const lm = lampMats[i];
          if (s.st === "idle") lm.color.setHex(HAIRC);
          else if (s.st === "amber") lm.color.setHex(AMBERC);
          else if (s.st === "done") lm.color.setHex(GREEN_SOFTC);
          else lm.color.setHex(AGENTS[i].hex);
          const lampScale = s.st === "work" ? 1 + 0.25 * Math.sin(t * 5 + i) : 1;
          const lampMesh = modules[i].children[2] as import("three").Mesh;
          lampMesh.scale.setScalar(lampScale);

          // label
          const w = wrapRefs.current[i];
          const nm = nameRefs.current[i];
          const ln = lineRefs.current[i];
          if (w && nm && ln && labelHostRef.current) {
            anchors[i].getWorldPosition(wv);
            wv.project(camera);
            const r = labelHostRef.current.getBoundingClientRect();
            const px = (wv.x * 0.5 + 0.5) * r.width;
            const py = (-wv.y * 0.5 + 0.5) * r.height;
            w.style.transform = `translate(${(px + 10).toFixed(1)}px, ${(py - 4).toFixed(1)}px)`;
            const chars = Math.floor((t - s.et) * CPS);
            const typing = chars < s.text.length;
            ln.textContent = s.text.slice(0, Math.max(0, chars)) + (typing && blink ? "\u258f" : "");
            const idle = s.st === "idle";
            nm.style.color = idle ? "#8a8175" : "#1a1713";
            ln.style.color = idle ? "#8a8175" : "#3d3a33";
          }
        }

        // bead
        let beadOn = false;
        for (const e of SCRIPT) {
          if (e.pulseTo === undefined) continue;
          const p = (t - e.t) / 0.9;
          if (p >= 0 && p < 1) {
            const y = midY(e.a) + (midY(e.pulseTo) - midY(e.a)) * smooth(p);
            bead.position.y = y; beadGlow.position.y = y;
            beadMat.color.setHex(AGENTS[e.a].hex);
            beadGlowMat.color.setHex(AGENTS[e.a].hex);
            beadOn = true;
          }
        }
        bead.visible = beadOn;
        beadGlow.visible = beadOn;

        // seal ring
        if (t >= 17.4 && t < 21.0) {
          const amber = t < 18.3;
          ringMat.color.setHex(amber ? AMBERC : GREENC);
          ringMat.dashSize = amber ? 0.12 : 60;
          ringMat.gapSize = amber ? 0.2 : 0.001;
          const fadeIn = smooth((t - 17.4) / 0.3);
          const fadeOut = 1 - smooth((t - 20.4) / 0.6);
          ringMat.opacity = 0.8 * Math.min(fadeIn, fadeOut);
          ring.rotation.y = t * (amber ? 0.6 : 0.15);
        } else {
          ringMat.opacity = 0;
        }

        // strip
        const st = stripState(t);
        const strip = stripRef.current;
        if (strip) {
          strip.textContent = st.text;
          strip.style.color = st.color;
          strip.style.borderColor = st.border;
        }
      };

      const clock = new THREE.Clock();
      let simT = 1.2;
      let raf = 0, running = false;
      const loop = () => {
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.033);
        simT += dt;
        writeFrame(simT % LOOP, Math.floor(simT / 0.4) % 2 === 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      const start = () => { if (!running && !reduceMotion) { running = true; clock.getDelta(); raf = requestAnimationFrame(loop); } };
      const stop = () => { running = false; cancelAnimationFrame(raf); };

      let cleanupObservers: (() => void) | null = null;
      if (reduceMotion) {
        writeFrame(16.8, false);
        renderer.render(scene, camera);
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
        disposables.forEach((d) => d.dispose());
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
    <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
      <div className="mono" style={{ textAlign: "center", fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
        The engine room · five agents, one practice
      </div>
      <div ref={labelHostRef} style={{ position: "relative", width: "100%", aspectRatio: "0.8" }} aria-hidden="true">
        {fallback ? (
          <StaticFallback />
        ) : (
          <>
            <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
            {AGENTS.map((a, i) => (
              <div
                key={a.name}
                ref={(el) => { wrapRefs.current[i] = el; }}
                style={{ position: "absolute", top: 0, left: 0, willChange: "transform", pointerEvents: "none", whiteSpace: "nowrap" }}
              >
                <div ref={(el) => { nameRefs.current[i] = el; }} className="mono" style={{ fontSize: "0.52rem", letterSpacing: "0.16em", color: "#8a8175" }}>
                  {a.name}
                </div>
                <div ref={(el) => { lineRefs.current[i] = el; }} style={{ fontSize: "0.66rem", lineHeight: 1.3, color: "#8a8175", fontFamily: "ui-sans-serif, system-ui, sans-serif", marginTop: 2 }}>
                  Standing by
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div
        ref={stripRef}
        className="mono"
        style={{ margin: "12px auto 0", maxWidth: 320, textAlign: "center", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8175", border: "1px solid #d8d1bf", borderRadius: 999, padding: "7px 12px", transition: "color 0.3s, border-color 0.3s" }}
      >
        HUMAN SIGN-OFF — YOUR TEAM HOLDS THE DIAL
      </div>
    </div>
  );
}
