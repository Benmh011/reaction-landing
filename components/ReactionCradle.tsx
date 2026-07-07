"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Reaction cradle, Nocturne — the company's name, as an object at night.
 *
 * A Newton's cradle on a dark field, drawn in light: five balls under a
 * paper-line frame, standing on a base plate edged in green — on your
 * infrastructure. The vermilion ball is the action: a request arriving
 * from the practice, glowing like a lamp. It swings in, and the impulse
 * passes through the three middle balls — the agent chain, each flashing
 * its band as the work moves through it without drama — and the green
 * ball swings out the other side: the Reaction, the finished work. At its
 * apex it is held — an amber ring, sign-off — and only when the ring
 * turns green does it release and carry the impulse home. Nothing sends
 * itself.
 *
 * Every action has an equal and opposite Reaction: the homepage's coda,
 * demonstrated in perpetuity on the products page. The panel shares the
 * PracticeFrame's night materials, so the two sit together as a pair.
 *
 * Three.js on the Flock's patterns: import guards, unlit vertex-shaded
 * spheres, additive glow sprites, DPR capped, pauses off-screen, reduced
 * motion holds the sign-off moment.
 */

/* night materials, shared with the PracticeFrame beside this */
const FIELD = "#1b1712";
const FIELD_LO = "#14110d";
const HAIR = "#3a3833";
const BODY = "#d8d4c8";
const MUTED = "#948e7d";

const LINEC = 0xefe7d6;
const GREENC = 0x479a74;
const GREEN_GLOWC = 0x46caa0;
const AMBERC = 0xd2a757;
const VERMC = 0xc93a17;
const VERM_GLOWC = 0xe8865a;

const BANDS = [0x4f8fd6, 0xe8896c, 0x7ea8d8]; // records → drafting → compliance, lifted for the dark

const R = 0.42;
const XS = [-1.68, -0.84, 0, 0.84, 1.68];
const TOP_Y = 2.6, Z_RAIL = 0.9, L = 2.6;
const BASE_Y = -0.9;

const T_SWING = 0.62, T_PULSE = 0.28, T_HOLD = 1.1, T_LHOLD = 0.35;
const LOOP = T_SWING + T_PULSE + T_SWING + T_HOLD + T_SWING + T_PULSE + T_SWING + T_LHOLD;
const THMAX = 0.5;
const easeQ = (p: number) => Math.sin((p * Math.PI) / 2);

type CradleSt = { thL: number; thR: number; pulse: { dir: 1 | -1; p: number } | null; hold: number };
function cradleState(t: number): CradleSt {
  let a = ((t % LOOP) + LOOP) % LOOP;
  if (a < T_SWING) return { thL: -THMAX * Math.cos((a / T_SWING) * Math.PI / 2), thR: 0, pulse: null, hold: -1 };
  a -= T_SWING;
  if (a < T_PULSE) return { thL: 0, thR: 0, pulse: { dir: 1, p: a / T_PULSE }, hold: -1 };
  a -= T_PULSE;
  if (a < T_SWING) return { thL: 0, thR: THMAX * easeQ(a / T_SWING), pulse: null, hold: -1 };
  a -= T_SWING;
  if (a < T_HOLD) return { thL: 0, thR: THMAX, pulse: null, hold: a / T_HOLD };
  a -= T_HOLD;
  if (a < T_SWING) return { thL: 0, thR: THMAX * Math.cos((a / T_SWING) * Math.PI / 2), pulse: null, hold: -1 };
  a -= T_SWING;
  if (a < T_PULSE) return { thL: 0, thR: 0, pulse: { dir: -1, p: a / T_PULSE }, hold: -1 };
  a -= T_PULSE;
  if (a < T_SWING) return { thL: -THMAX * easeQ(a / T_SWING), thR: 0, pulse: null, hold: -1 };
  return { thL: -THMAX, thR: 0, pulse: null, hold: -1 };
}

const stripState = (st: CradleSt, sent: boolean) => {
  if (st.hold >= 0 && st.hold < 0.78) return { text: "HELD FOR SIGN-OFF", color: "#d2a757", border: "#d2a757" };
  if ((st.hold >= 0.78) || sent) return { text: "SIGNED OFF \u2713 \u00b7 SENT", color: "#6dbe97", border: "#6dbe97" };
  return { text: "HUMAN SIGN-OFF \u2014 YOUR TEAM HOLDS THE DIAL", color: MUTED, border: HAIR };
};

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 70" width="100%" aria-hidden="true" style={{ display: "block", opacity: 0.95 }}>
      <line x1="14" y1="14" x2="86" y2="14" stroke="#efe7d6" strokeOpacity="0.55" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={26 + i * 12} y1="14" x2={26 + i * 12} y2="40" stroke="#efe7d6" strokeOpacity="0.3" strokeWidth="0.8" />
          <circle cx={26 + i * 12} cy="44" r="5.4" fill={i === 0 ? "#c93a17" : i === 4 ? "#479a74" : "#332e28"} stroke="#efe7d6" strokeOpacity="0.35" />
        </g>
      ))}
      <rect x="10" y="54" width="80" height="5" rx="1" fill="#221d17" stroke="#efe7d6" strokeOpacity="0.4" />
    </svg>
  );
}

export default function ReactionCradle() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const reactionRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const frameEl = frameRef.current;
    if (!host || !frameEl) return;
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
      const camera = new THREE.PerspectiveCamera(34, 460 / 420, 0.1, 60);
      camera.position.set(3.6, 1.9, 10.1);
      camera.lookAt(0.18, 0.72, 0);

      const rig = new THREE.Group();
      scene.add(rig);
      const disposables: { dispose(): void }[] = [];
      const cA = new THREE.Color(), cB = new THREE.Color(), cM = new THREE.Color();

      // vertically shaded sphere geometry (unlit, hand-shaded like the darts)
      const shadedSphere = (lightHex: number, darkHex: number) => {
        const g = new THREE.SphereGeometry(R, 30, 22);
        const pos = g.getAttribute("position");
        const cols = new Float32Array(pos.count * 3);
        cA.setHex(lightHex); cB.setHex(darkHex);
        for (let k = 0; k < pos.count; k++) {
          const tone = (pos.getY(k) / R + 1) / 2;
          cM.copy(cB).lerp(cA, tone);
          cols[k * 3] = cM.r; cols[k * 3 + 1] = cM.g; cols[k * 3 + 2] = cM.b;
        }
        g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        disposables.push(g);
        return g;
      };
      const ballMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      // inverted hull, now a whisper of light instead of ink
      const rimGeo = new THREE.SphereGeometry(R * 1.04, 30, 22);
      const rimMat = new THREE.MeshBasicMaterial({ color: LINEC, side: THREE.BackSide, transparent: true, opacity: 0.3 });
      disposables.push(ballMat, rimGeo, rimMat);

      // white radial glow texture, tinted per sprite
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 128;
      const gctx = glowCanvas.getContext("2d");
      if (gctx) {
        const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, "rgba(255,255,255,0.55)");
        grad.addColorStop(0.55, "rgba(255,255,255,0.16)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 128, 128);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      disposables.push(glowTex);
      const makeGlow = (hex: number, scale: number) => {
        const m = new THREE.SpriteMaterial({ map: glowTex, color: hex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        disposables.push(m);
        const s = new THREE.Sprite(m);
        s.scale.setScalar(scale);
        rig.add(s);
        return s;
      };
      const glowVerm = makeGlow(VERM_GLOWC, R * 5.4);
      const glowGreen = makeGlow(GREEN_GLOWC, R * 5.4);
      const glowRing = makeGlow(AMBERC, R * 4.4);
      glowRing.material.opacity = 0;

      const ballSpecs: [number, number][] = [
        [0xf0754a, 0x6e1c06],
        [0x57514a, 0x1d1913],
        [0x57514a, 0x1d1913],
        [0x57514a, 0x1d1913],
        [0x7cd3ab, 0x0e3a28],
      ];
      const balls: import("three").Group[] = [];
      const bandMats: import("three").MeshBasicMaterial[] = [];
      const bandGeo = new THREE.TorusGeometry(R * 0.99, 0.026, 8, 44);
      disposables.push(bandGeo);

      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(rimGeo, rimMat));
        g.add(new THREE.Mesh(shadedSphere(...ballSpecs[i]), ballMat));
        if (i >= 1 && i <= 3) {
          const bm = new THREE.MeshBasicMaterial({ color: BANDS[i - 1], transparent: true, opacity: 0.35 });
          disposables.push(bm);
          const band = new THREE.Mesh(bandGeo, bm);
          band.rotation.x = Math.PI / 2;
          g.add(band);
          bandMats.push(bm);
        }
        rig.add(g);
        balls.push(g);
      }

      // strings: two per ball, light thread, endpoints updated each frame
      const stringMat = new THREE.LineBasicMaterial({ color: LINEC, transparent: true, opacity: 0.34 });
      disposables.push(stringMat);
      const stringGeos: import("three").BufferGeometry[] = [];
      for (let i = 0; i < 5; i++) {
        for (const zr of [-Z_RAIL, Z_RAIL]) {
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute([XS[i], TOP_Y + 0.1, zr, XS[i], TOP_Y - L, 0], 3));
          rig.add(new THREE.Line(g, stringMat));
          stringGeos.push(g);
          disposables.push(g);
        }
      }

      // frame: rails and legs, paper light
      const lineMat = new THREE.MeshBasicMaterial({ color: LINEC, transparent: true, opacity: 0.62 });
      const backLineMat = new THREE.MeshBasicMaterial({ color: LINEC, transparent: true, opacity: 0.34 });
      const railGeo = new THREE.CylinderGeometry(0.045, 0.045, 4.6, 10);
      const legGeo = new THREE.CylinderGeometry(0.042, 0.042, TOP_Y + 0.12 - BASE_Y, 10);
      disposables.push(lineMat, backLineMat, railGeo, legGeo);
      for (const zr of [-Z_RAIL, Z_RAIL]) {
        const m = zr < 0 ? backLineMat : lineMat;
        const rail = new THREE.Mesh(railGeo, m);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(0, TOP_Y + 0.12, zr);
        rig.add(rail);
        for (const lx of [-2.3, 2.3]) {
          const leg = new THREE.Mesh(legGeo, m);
          leg.position.set(lx, (TOP_Y + 0.12 + BASE_Y) / 2, zr);
          rig.add(leg);
        }
      }

      // base plate: dark slab, light edges, green sovereignty border
      const baseGeo = new THREE.BoxGeometry(5.7, 0.14, 2.7);
      {
        const cols = [0x1e1a14, 0x1e1a14, 0x221d17, 0x15110c, 0x191510, 0x191510];
        const arr = new Float32Array(24 * 3);
        for (let f = 0; f < 6; f++) {
          cM.setHex(cols[f]);
          for (let v2 = 0; v2 < 4; v2++) {
            const k = (f * 4 + v2) * 3;
            arr[k] = cM.r; arr[k + 1] = cM.g; arr[k + 2] = cM.b;
          }
        }
        baseGeo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
      }
      const baseMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = BASE_Y - 0.07;
      rig.add(base);
      const baseEdges = new THREE.EdgesGeometry(baseGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: LINEC, transparent: true, opacity: 0.45 });
      const baseLines = new THREE.LineSegments(baseEdges, edgeMat);
      baseLines.position.copy(base.position);
      rig.add(baseLines);
      disposables.push(baseGeo, baseMat, baseEdges, edgeMat);

      const bx = 5.7 / 2 - 0.16, bz = 2.7 / 2 - 0.16;
      const bordGeo = new THREE.BufferGeometry();
      bordGeo.setAttribute("position", new THREE.Float32BufferAttribute([-bx, 0, bz, bx, 0, bz, bx, 0, -bz, -bx, 0, -bz, -bx, 0, bz], 3));
      const bordMat = new THREE.LineDashedMaterial({ color: GREENC, transparent: true, opacity: 0.85, dashSize: 0.05, gapSize: 0.22 });
      const border = new THREE.Line(bordGeo, bordMat);
      border.computeLineDistances();
      border.position.y = BASE_Y + 0.002;
      rig.add(border);
      disposables.push(bordGeo, bordMat);

      // sign-off ring around the held reaction ball (in the swing plane)
      const ringPts: number[] = [];
      for (let k = 0; k <= 90; k++) {
        const a = (k / 90) * Math.PI * 2;
        ringPts.push(Math.cos(a) * (R + 0.14), Math.sin(a) * (R + 0.14), 0);
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(ringPts, 3));
      const ringMat = new THREE.LineDashedMaterial({ color: AMBERC, transparent: true, opacity: 0, dashSize: 0.09, gapSize: 0.09 });
      const ring = new THREE.Line(ringGeo, ringMat);
      ring.computeLineDistances();
      rig.add(ring);
      disposables.push(ringGeo, ringMat);

      // ── static label anchoring (ACTION / REACTION under the end balls) ──
      const wv = new THREE.Vector3();
      const layoutLabels = () => {
        const r = frameEl.getBoundingClientRect();
        const place = (el: HTMLDivElement | null, x: number) => {
          if (!el) return;
          wv.set(x, BASE_Y + 0.05, Z_RAIL);
          wv.project(camera);
          el.style.transform = `translate(${(((wv.x * 0.5 + 0.5) * r.width)).toFixed(1)}px, ${(((-wv.y * 0.5 + 0.5) * r.height) + 12).toFixed(1)}px) translateX(-50%)`;
        };
        place(actionRef.current, XS[0]);
        place(reactionRef.current, XS[4]);
      };

      const resize = () => {
        const r = host.getBoundingClientRect();
        const w = Math.max(1, r.width), h = Math.max(1, r.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        layoutLabels();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      // ── per-frame ──
      let sentUntil = -1;
      const writeFrame = (t: number) => {
        const st = cradleState(t);
        rig.rotation.y = 0.045 * Math.sin(t * 0.23);

        const ths = [st.thL, 0, 0, 0, st.thR];
        for (let i = 0; i < 5; i++) {
          const th = ths[i];
          const bx2 = XS[i] + L * Math.sin(th);
          const by = TOP_Y - L * Math.cos(th);
          balls[i].position.set(bx2, by, 0);
          // strings
          for (let s2 = 0; s2 < 2; s2++) {
            const g = stringGeos[i * 2 + s2];
            const attr = g.getAttribute("position") as import("three").BufferAttribute;
            attr.setXYZ(1, bx2, by, 0);
            attr.needsUpdate = true;
          }
        }
        // the lamps follow their balls
        glowVerm.position.copy(balls[0].position);
        glowGreen.position.copy(balls[4].position);
        // the reaction burns a little brighter as it carries the work
        glowGreen.material.opacity = st.thR > 0.02 || st.hold >= 0 ? 0.85 : 0.6;
        glowVerm.material.opacity = st.thL < -0.02 ? 0.85 : 0.6;

        // chain bands flash as the impulse passes
        for (let b = 0; b < 3; b++) {
          let glow = 0.35;
          if (st.pulse) {
            const seq = st.pulse.dir === 1 ? b : 2 - b;
            const local = st.pulse.p * 3 - seq;
            if (local > 0 && local < 1.4) glow = 0.35 + 0.65 * Math.sin(Math.min(1, local / 1.2) * Math.PI);
          }
          bandMats[b].opacity = glow;
        }

        // sign-off ring
        if (st.hold >= 0) {
          const amber = st.hold < 0.78;
          ringMat.color.setHex(amber ? AMBERC : GREEN_GLOWC);
          ringMat.dashSize = amber ? 0.09 : 40;
          ringMat.gapSize = amber ? 0.09 : 0.001;
          ringMat.opacity = 0.9 * Math.min(1, st.hold / 0.12);
          ring.position.copy(balls[4].position);
          ring.rotation.z = t * 0.8;
          glowRing.position.copy(balls[4].position);
          glowRing.material.color.setHex(amber ? AMBERC : GREEN_GLOWC);
          glowRing.material.opacity = 0.5 * Math.min(1, st.hold / 0.12);
          if (!amber) sentUntil = t + 1.4;
        } else {
          ringMat.opacity = 0;
          glowRing.material.opacity = 0;
        }

        // strip
        const s = stripState(st, t < sentUntil);
        const strip = stripRef.current;
        if (strip) {
          strip.textContent = s.text;
          strip.style.color = s.color;
          strip.style.borderColor = s.border;
        }
      };

      const clock = new THREE.Clock();
      let simT = 0;
      let raf = 0, running = false;
      const loop = () => {
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.033);
        simT += dt;
        writeFrame(simT);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      const start = () => { if (!running && !reduceMotion) { running = true; clock.getDelta(); raf = requestAnimationFrame(loop); } };
      const stop = () => { running = false; cancelAnimationFrame(raf); };

      let cleanupObservers: (() => void) | null = null;
      if (reduceMotion) {
        writeFrame(T_SWING + T_PULSE + T_SWING + T_HOLD * 0.4);
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
    <div
      style={{
        width: "100%",
        maxWidth: 380,
        margin: "0 auto",
        padding: "22px 18px 20px",
        borderRadius: 18,
        border: `1px solid ${HAIR}`,
        background: `radial-gradient(120% 90% at 50% 38%, ${FIELD} 0%, ${FIELD_LO} 100%)`,
        boxShadow: "0 18px 50px rgba(20, 15, 8, 0.28)",
      }}
    >
      <div ref={frameRef} style={{ position: "relative", width: "100%", aspectRatio: "1.095" }} aria-hidden="true">
        {fallback ? (
          <StaticFallback />
        ) : (
          <>
            <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
            <div ref={actionRef} className="mono" style={{ position: "absolute", top: 0, left: 0, fontSize: "0.56rem", letterSpacing: "0.26em", color: "#e8865a", pointerEvents: "none" }}>ACTION</div>
            <div ref={reactionRef} className="mono" style={{ position: "absolute", top: 0, left: 0, fontSize: "0.56rem", letterSpacing: "0.26em", color: "#46caa0", pointerEvents: "none" }}>REACTION</div>
          </>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "0.95rem", color: BODY }}>
          Every action has an equal and opposite Reaction.
        </div>
        <div className="mono" style={{ fontSize: "0.58rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "#479a74", marginTop: 7 }}>
          On your infrastructure
        </div>
      </div>
      <div
        ref={stripRef}
        className="mono"
        style={{ margin: "13px auto 0", maxWidth: 320, textAlign: "center", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, border: `1px solid ${HAIR}`, borderRadius: 999, padding: "7px 12px", transition: "color 0.3s, border-color 0.3s" }}
      >
        HUMAN SIGN-OFF — YOUR TEAM HOLDS THE DIAL
      </div>
    </div>
  );
}
