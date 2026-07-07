"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The engine block, second cut — the engine room as a machine, repaired.
 *
 * Five agent drawers seated in an open ink chassis — four posts, top and
 * bottom rails — each drawer keyed with its captain's colour on the end
 * grain and on a strip down its front face. The block hangs suspended
 * against the page, swaying gently. When an agent works its drawer
 * slides out of the chassis, lamp pulsing; handoffs run as a bead of
 * colour down the spine; drafts hold half-out under amber until the seal
 * ring closes green around the whole block and the work is sent.
 *
 * The lesson of the first cut, engineered in: labels live in a fixed
 * right-hand column that the rack's projection can never reach — the
 * clearance is verified numerically across the full sway range — and
 * thin leader lines carry the connection to the moving geometry, so all
 * the motion is absorbed by the lines and never the text. Ink outlines
 * are true EdgesGeometry hairlines, not hull smears.
 *
 * Three.js on the Flock's patterns: import guards, unlit vertex-shaded
 * paper, DPR capped, pauses off-screen, reduced motion holds the block
 * at full working state.
 */

const INKC = 0x1a1713;
const PAPER2C = 0xfdfbf5;
const TOPC = 0xefe9da;
const BOTC = 0xe6dfcf;
const GREENC = 0x0d5a40;
const GREEN_SOFTC = 0x46a37e;
const AMBERC = 0xb98a3a;
const HAIRC = 0xc9c2b0;

const AGENTS = [
  { name: "DIARY AGENT", hex: 0xc93a17 },
  { name: "MESSAGES AGENT", hex: 0x2565aa },
  { name: "RECORDS AGENT", hex: 0x5f93c9 },
  { name: "DRAFTING AGENT", hex: 0xe8896c },
  { name: "COMPLIANCE AGENT", hex: 0x0d5a40 },
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
const SPINE_LX = -MW / 2 - 0.34;
const YAW0 = -0.42, SWAY = 0.1, TILT = -0.09;
const LABEL_FRAC = 0.63;

function StaticFallback() {
  return (
    <svg viewBox="0 0 100 110" width="100%" aria-hidden="true" style={{ display: "block", opacity: 0.9 }}>
      {AGENTS.map((a, i) => (
        <g key={a.name}>
          <rect x="24" y={16 + i * 17} width="52" height="12" rx="2" fill="#fdfbf5" stroke="#1a1713" strokeOpacity="0.65" />
          <rect x="24" y={16 + i * 17} width="5" height="12" rx="1.5" fill={`#${a.hex.toString(16).padStart(6, "0")}`} />
        </g>
      ))}
    </svg>
  );
}

export default function EngineBlock() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const leaderSvgRef = useRef<SVGSVGElement | null>(null);
  const leaderRefs = useRef<(SVGLineElement | null)[]>([]);
  const leaderDotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const nameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
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
      const camera = new THREE.PerspectiveCamera(34, 0.8, 0.1, 60);
      camera.position.set(0.3, 0.7, 13.6);
      camera.lookAt(-0.25, 0, 0);

      // ── rig ──
      const rig = new THREE.Group();
      rig.position.x = -1.25;
      scene.add(rig);

      const disposables: { dispose(): void }[] = [];
      const c = new THREE.Color();

      // drawers with per-face vertex colours (±x end grain = agent colour)
      const faceCols = (agentHex: number) => {
        const cols = [agentHex, agentHex, TOPC, BOTC, PAPER2C, TOPC]; // +x,-x,+y,-y,+z,-z
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
      const faceMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const edgeMat = new THREE.LineBasicMaterial({ color: INKC, transparent: true, opacity: 0.7 });
      const lampGeo = new THREE.CircleGeometry(0.055, 20);
      const stripGeo = new THREE.BoxGeometry(0.2, MH, 0.015);
      disposables.push(faceMat, edgeMat, lampGeo, stripGeo);

      const modules: import("three").Group[] = [];
      const lampMats: import("three").MeshBasicMaterial[] = [];
      const lampMeshes: import("three").Mesh[] = [];
      const leadAnchors: import("three").Object3D[] = [];
      const rowAnchors: import("three").Object3D[] = [];

      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        const geo = new THREE.BoxGeometry(MW, MH, MD);
        geo.setAttribute("color", new THREE.BufferAttribute(faceCols(AGENTS[i].hex), 3));
        const edges = new THREE.EdgesGeometry(geo);
        disposables.push(geo, edges);
        g.add(new THREE.Mesh(geo, faceMat));
        g.add(new THREE.LineSegments(edges, edgeMat));

        const stripMat = new THREE.MeshBasicMaterial({ color: AGENTS[i].hex });
        disposables.push(stripMat);
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(-MW / 2 + 0.1, 0, MD / 2 + 0.008);
        g.add(strip);

        const lampMat = new THREE.MeshBasicMaterial({ color: HAIRC });
        disposables.push(lampMat);
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(MW / 2 - 0.3, 0, MD / 2 + 0.01);
        g.add(lamp);
        lampMats.push(lampMat);
        lampMeshes.push(lamp);

        const lead = new THREE.Object3D();
        lead.position.set(MW * 0.275, 0, MD / 2);
        g.add(lead);
        leadAnchors.push(lead);

        g.position.set(0, midY(i), 0);
        rig.add(g);
        modules.push(g);

        // row anchor: seated position, immune to slides — child of the rig
        const row = new THREE.Object3D();
        row.position.set(0, midY(i), 0);
        rig.add(row);
        rowAnchors.push(row);
      }

      // chassis: four posts + top/bottom rail frames, all ink
      const POX = MW / 2 + 0.12, POZ = MD / 2 + 0.12;
      const postTop = midY(0) + 0.52, postBot = midY(4) - 0.52;
      const inkMat = new THREE.MeshBasicMaterial({ color: INKC });
      const postGeo = new THREE.BoxGeometry(0.06, postTop - postBot, 0.06);
      const railXGeo = new THREE.BoxGeometry(POX * 2 + 0.06, 0.05, 0.05);
      const railZGeo = new THREE.BoxGeometry(0.05, 0.05, POZ * 2 + 0.06);
      disposables.push(inkMat, postGeo, railXGeo, railZGeo);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, inkMat);
        post.position.set(sx * POX, (postTop + postBot) / 2, sz * POZ);
        rig.add(post);
      }
      for (const yy of [postTop, postBot]) {
        for (const sz of [-1, 1]) {
          const r = new THREE.Mesh(railXGeo, inkMat);
          r.position.set(0, yy, sz * POZ);
          rig.add(r);
        }
        for (const sx of [-1, 1]) {
          const r = new THREE.Mesh(railZGeo, inkMat);
          r.position.set(sx * POX, yy, 0);
          rig.add(r);
        }
      }

      // spine + bead
      const spineGeo = new THREE.CylinderGeometry(0.016, 0.016, postTop - postBot, 8);
      const spineMat = new THREE.MeshBasicMaterial({ color: INKC, transparent: true, opacity: 0.3 });
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.set(SPINE_LX, 0, 0);
      rig.add(spine);
      const beadGeo = new THREE.SphereGeometry(0.055, 12, 12);
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xc93a17 });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      const beadGlowGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const beadGlowMat = new THREE.MeshBasicMaterial({ color: 0xc93a17, transparent: true, opacity: 0.22 });
      const beadGlow = new THREE.Mesh(beadGlowGeo, beadGlowMat);
      bead.visible = beadGlow.visible = false;
      bead.position.x = beadGlow.position.x = SPINE_LX;
      rig.add(bead); rig.add(beadGlow);
      disposables.push(spineGeo, spineMat, beadGeo, beadMat, beadGlowGeo, beadGlowMat);

      // seal ring
      const rpts: number[] = [];
      for (let k = 0; k <= 110; k++) {
        const a = (k / 110) * Math.PI * 2;
        rpts.push(Math.cos(a) * 2.15, 0, Math.sin(a) * 2.15);
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(rpts, 3));
      const ringMat = new THREE.LineDashedMaterial({ color: AMBERC, transparent: true, opacity: 0, dashSize: 0.12, gapSize: 0.2 });
      const ring = new THREE.Line(ringGeo, ringMat);
      ring.computeLineDistances();
      ring.position.y = -0.2;
      rig.add(ring);
      disposables.push(ringGeo, ringMat);

      // ── fixed label column layout (recomputed on resize, base pose) ──
      const wv = new THREE.Vector3();
      const labelYs: number[] = [0, 0, 0, 0, 0];
      const layoutLabels = () => {
        const r = frameEl.getBoundingClientRect();
        rig.rotation.set(TILT, YAW0, 0);
        rig.position.y = 0;
        modules.forEach((m) => { m.position.z = 0; });
        rig.updateMatrixWorld(true);
        const lx = r.width * LABEL_FRAC;
        for (let i = 0; i < 5; i++) {
          rowAnchors[i].getWorldPosition(wv);
          wv.project(camera);
          const py = (-wv.y * 0.5 + 0.5) * r.height;
          labelYs[i] = py;
          const w = wrapRefs.current[i];
          if (w) w.style.transform = `translate(${lx.toFixed(1)}px, ${(py - 12).toFixed(1)}px)`;
        }
        leaderSvgRef.current?.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
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
      const writeFrame = (t: number, blink: boolean) => {
        rig.rotation.y = YAW0 + SWAY * Math.sin(t * 0.4);
        rig.rotation.x = TILT;
        rig.position.y = 0.04 * Math.sin(t * 0.7);

        const fr = frameEl.getBoundingClientRect();
        const lx = fr.width * LABEL_FRAC;

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
          lampMeshes[i].scale.setScalar(s.st === "work" ? 1 + 0.25 * Math.sin(t * 5 + i) : 1);

          // typed line
          const nm = nameRefs.current[i];
          const ln = lineRefs.current[i];
          if (nm && ln) {
            const chars = Math.floor((t - s.et) * CPS);
            const typing = chars < s.text.length;
            ln.textContent = s.text.slice(0, Math.max(0, chars)) + (typing && blink ? "\u258f" : "");
            const idle = s.st === "idle";
            nm.style.color = idle ? "#8a8175" : "#1a1713";
            ln.style.color = idle ? "#8a8175" : "#3d3a33";
          }

          // leader: fixed label edge → live geometry point
          rig.updateMatrixWorld();
          leadAnchors[i].getWorldPosition(wv);
          wv.project(camera);
          const gx = (wv.x * 0.5 + 0.5) * fr.width;
          const gy = (-wv.y * 0.5 + 0.5) * fr.height;
          const rowY = labelYs[i];
          const lead = leaderRefs.current[i];
          const dot = leaderDotRefs.current[i];
          lead?.setAttribute("x1", String(lx - 9));
          lead?.setAttribute("y1", String(rowY));
          lead?.setAttribute("x2", String(gx));
          lead?.setAttribute("y2", String(gy));
          dot?.setAttribute("cx", String(gx));
          dot?.setAttribute("cy", String(gy));
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
        bead.visible = beadGlow.visible = beadOn;

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
      <div className="mono" style={{ textAlign: "center", fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
        The engine room · five agents, one practice
      </div>
      <div ref={frameRef} style={{ position: "relative", width: "100%", aspectRatio: "0.8" }} aria-hidden="true">
        {fallback ? (
          <StaticFallback />
        ) : (
          <>
            <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
            <svg ref={leaderSvgRef} viewBox="0 0 340 425" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {AGENTS.map((a, i) => (
                <g key={a.name}>
                  <line ref={(el) => { leaderRefs.current[i] = el; }} stroke="#1a1713" strokeOpacity="0.3" strokeWidth="1" />
                  <circle ref={(el) => { leaderDotRefs.current[i] = el; }} r="1.8" fill="#1a1713" fillOpacity="0.45" />
                </g>
              ))}
            </svg>
            {AGENTS.map((a, i) => (
              <div
                key={a.name}
                ref={(el) => { wrapRefs.current[i] = el; }}
                style={{ position: "absolute", top: 0, left: 0, willChange: "transform", pointerEvents: "none", whiteSpace: "nowrap" }}
              >
                <div ref={(el) => { nameRefs.current[i] = el; }} className="mono" style={{ fontSize: "0.52rem", letterSpacing: "0.16em", color: "#8a8175" }}>
                  {a.name}
                </div>
                <div ref={(el) => { lineRefs.current[i] = el; }} style={{ fontSize: "0.62rem", lineHeight: 1.35, color: "#8a8175", fontFamily: "ui-sans-serif, system-ui, sans-serif", marginTop: 2 }}>
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
        style={{ margin: "10px auto 0", maxWidth: 320, textAlign: "center", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8175", border: "1px solid #d8d1bf", borderRadius: 999, padding: "7px 12px", transition: "color 0.3s, border-color 0.3s" }}
      >
        HUMAN SIGN-OFF — YOUR TEAM HOLDS THE DIAL
      </div>
    </div>
  );
}
