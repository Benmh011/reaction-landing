"use client";

// ————————————————————————————————————————————————————————————————
// The Salcombe estuary at the end of the day, rendered rather than
// drawn. A low sun over the water, a long swell, three hulls on their
// moorings. It is the place the business is in, not a metaphor for it.
//
// Everything here is cheap on purpose: one water mesh with a small
// vertex shader, a sky dome with a gradient, three low-poly hulls. It
// runs on a phone. Reduced motion freezes the swell.
// ————————————————————————————————————————————————————————————————

import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// The sun sits low and to the right. Every colour on the water comes
// from where this is. On a narrow screen it moves toward the centre,
// because a vertical field of view crops the sides and a sunset with the
// sun off the edge is just an orange stripe.
function sunDirFor(aspect: number): THREE.Vector3 {
  const t = Math.min(Math.max((aspect - 0.45) / (1.6 - 0.45), 0), 1);
  const x = 0.09 + (0.34 - 0.09) * t;
  return new THREE.Vector3(x, 0.085, -1).normalize();
}

function useSunDir(): THREE.Vector3 {
  const { size } = useThree();
  return useMemo(() => sunDirFor(size.width / size.height), [size.width, size.height]);
}

const SKY_ZENITH = "#0d2340";
const SKY_MID = "#3a5f7d";
const SKY_HORIZON = "#e2b48f";
const SUN_CORE = "#ffd9a0";

const WATER_DEEP = "#0f3444";
const WATER_SHALLOW = "#2a6b78";
const WATER_GLINT = "#ffd9a6";

// ————————————————————————— sky —————————————————————————

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunCore;
  uniform vec3 uSunDir;
  varying vec3 vDir;

  void main() {
    float h = clamp(vDir.y, -0.05, 1.0);
    // Warm band at the horizon that gives way to navy overhead.
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
    col = mix(col, uZenith, smoothstep(0.18, 0.75, h));

    // The sun, baked into the sky: a tight core and a wide warm haze.
    float s = max(dot(normalize(vDir), uSunDir), 0.0);
    col += uSunCore * pow(s, 4200.0) * 1.35;
    col += uSunCore * pow(s, 260.0) * 0.28;
    col += uHorizon * pow(s, 14.0) * 0.35;
    col += uHorizon * pow(s, 3.0) * 0.08;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Sky() {
  const sun = useSunDir();
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(SKY_ZENITH) },
      uMid: { value: new THREE.Color(SKY_MID) },
      uHorizon: { value: new THREE.Color(SKY_HORIZON) },
      uSunCore: { value: new THREE.Color(SUN_CORE) },
      uSunDir: { value: sun.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    uniforms.uSunDir.value.copy(sun);
  }, [sun, uniforms]);
  return (
    <mesh>
      <sphereGeometry args={[220, 32, 16]} />
      <shaderMaterial
        vertexShader={skyVert}
        fragmentShader={skyFrag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ————————————————————————— water —————————————————————————

const waterVert = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;

  // Four gentle waves, none of them steep. Estuary water, not open sea.
  float wave(vec2 p, vec2 dir, float freq, float amp, float speed, float t) {
    return sin(dot(p, dir) * freq + t * speed) * amp;
  }

  void main() {
    vec3 p = position;
    float t = uTime;
    vec2 xz = vec2(p.x, p.y);

    float h = 0.0;
    h += wave(xz, normalize(vec2( 1.0,  0.3)), 0.45, 0.11,  0.8, t);
    h += wave(xz, normalize(vec2(-0.6,  1.0)), 0.8,  0.07,  1.2, t);
    h += wave(xz, normalize(vec2( 0.2, -1.0)), 1.6,  0.035, 2.0, t);
    h += wave(xz, normalize(vec2( 1.0,  1.0)), 3.4,  0.014, 3.1, t);

    // Normal by finite difference, so light behaves on the slopes.
    float e = 0.15;
    float hx = 0.0, hy = 0.0;
    vec2 px = xz + vec2(e, 0.0), py = xz + vec2(0.0, e);
    hx += wave(px, normalize(vec2( 1.0,  0.3)), 0.45, 0.11,  0.8, t);
    hx += wave(px, normalize(vec2(-0.6,  1.0)), 0.8,  0.07,  1.2, t);
    hx += wave(px, normalize(vec2( 0.2, -1.0)), 1.6,  0.035, 2.0, t);
    hx += wave(px, normalize(vec2( 1.0,  1.0)), 3.4,  0.014, 3.1, t);
    hy += wave(py, normalize(vec2( 1.0,  0.3)), 0.45, 0.11,  0.8, t);
    hy += wave(py, normalize(vec2(-0.6,  1.0)), 0.8,  0.07,  1.2, t);
    hy += wave(py, normalize(vec2( 0.2, -1.0)), 1.6,  0.035, 2.0, t);
    hy += wave(py, normalize(vec2( 1.0,  1.0)), 3.4,  0.014, 3.1, t);

    vec3 n = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.0));
    p.z += h;

    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uGlint;
  uniform vec3 uHorizon;
  uniform vec3 uMid;
  uniform vec3 uSunDir;
  uniform vec3 uCamera;
  varying vec3 vWorld;
  varying vec3 vNormal;

  // Small, fast ripple that lives only in the normal. It is what breaks
  // the sun's reflection into a field of glints instead of a stripe.
  vec3 ripple(vec3 n, vec3 w, float t) {
    float a = sin(w.x * 6.1 + w.z * 3.7 + t * 2.4) * 0.035;
    float b = cos(w.x * 2.9 - w.z * 7.3 + t * 1.9) * 0.035;
    float c = sin(w.x * 11.0 + w.z * 9.0 - t * 3.7) * 0.018;
    return normalize(n + vec3(a + c, 0.0, b - c));
  }

  void main() {
    vec3 N = ripple(normalize(vNormal), vWorld, uTime);
    vec3 V = normalize(uCamera - vWorld);
    vec3 L = normalize(uSunDir);

    // Looking down into the water it is deep; looking across it, it
    // reflects the sky. Fresnel does both.
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    vec3 skyRef = mix(uShallow, uMid, 0.5);
    vec3 col = mix(uDeep, skyRef, fres * 0.8);

    // The sun's path: tight glints on the crests, a soft reflected band.
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 320.0);
    float band = pow(max(dot(N, H), 0.0), 9.0);
    col += uGlint * spec * 1.6;
    col += uHorizon * band * 0.16;

    // Distance haze into the horizon colour.
    float dist = length(uCamera - vWorld);
    float haze = smoothstep(16.0, 200.0, dist);
    vec3 far = mix(uMid, uHorizon, 0.45);
    col = mix(col, far, haze * 0.8);
    float edge = smoothstep(220.0, 330.0, dist);
    col = mix(col, uHorizon, edge);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Water({ animate }: { animate: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const { camera } = useThree();
  const sun = useSunDir();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(WATER_DEEP) },
      uShallow: { value: new THREE.Color(WATER_SHALLOW) },
      uGlint: { value: new THREE.Color(WATER_GLINT) },
      uHorizon: { value: new THREE.Color(SKY_HORIZON) },
      uMid: { value: new THREE.Color(SKY_MID) },
      uSunDir: { value: sun.clone() },
      uCamera: { value: new THREE.Vector3() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    uniforms.uSunDir.value.copy(sun);
  }, [sun, uniforms]);

  useFrame(({ clock }) => {
    if (animate) mat.current.uniforms.uTime.value = clock.getElapsedTime();
    mat.current.uniforms.uCamera.value.copy(camera.position);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -120]}>
      <planeGeometry args={[700, 700, 220, 220]} />
      <shaderMaterial ref={mat} vertexShader={waterVert} fragmentShader={waterFrag} uniforms={uniforms} />
    </mesh>
  );
}

// ————————————————————————— moorings —————————————————————————
//
// Three hulls a long way off, dark against the light. Generic boats on
// their moorings — the estuary always has them — kept small and distant
// so they are part of the water rather than a subject of their own.

function Hull({
  at,
  scale = 1,
  phase = 0,
  animate,
}: {
  at: [number, number, number];
  scale?: number;
  phase?: number;
  animate: boolean;
}) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.getElapsedTime();
    g.current.position.y = at[1] + Math.sin(t * 0.8 + phase) * 0.04;
    g.current.rotation.z = Math.sin(t * 0.6 + phase) * 0.035;
    g.current.rotation.x = Math.cos(t * 0.5 + phase) * 0.02;
  });
  return (
    <group ref={g} position={at} scale={scale}>
      {/* Hull: a lathe with a pointed bow, sitting low. */}
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.34, 1, 0.5]}>
        <capsuleGeometry args={[0.5, 2.0, 4, 10]} />
        <meshStandardMaterial color="#14283f" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[-0.35, 0.72, 0]}>
        <cylinderGeometry args={[0.016, 0.022, 1.3, 6]} />
        <meshStandardMaterial color="#e6dcc6" roughness={0.8} />
      </mesh>
    </group>
  );
}

function SunLight() {
  const sun = useSunDir();
  const p = useMemo(() => sun.clone().multiplyScalar(60), [sun]);
  return <directionalLight position={[p.x, p.y, p.z]} intensity={1.6} color="#ffd6a3" />;
}

// ————————————————————————— rig —————————————————————————

function Rig({ animate }: { animate: boolean }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.55, -40));
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!animate) return;
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [animate]);

  useFrame(() => {
    // A few degrees of parallax, eased. Enough to feel the scene is
    // there, not enough to make anyone seasick.
    const tx = mouse.current.x * 0.35;
    const ty = 1.15 - mouse.current.y * 0.12;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.lookAt(target.current);
  });
  return null;
}

// ————————————————————————— scene —————————————————————————

export default function EstuaryScene() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const animate = !reduced;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.15, 4], fov: 38, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      frameloop={animate ? "always" : "demand"}
    >
      <Sky />
      <ambientLight intensity={0.35} color="#9fb6c8" />
      <SunLight />
      <Water animate={animate} />
      <Hull at={[9.0, 0.0, -48]} scale={1.1} phase={0.4} animate={animate} />
      <Hull at={[-11.0, 0.0, -62]} scale={1.0} phase={1.9} animate={animate} />
      <Hull at={[18.0, 0.0, -80]} scale={1.0} phase={3.1} animate={animate} />
      <Hull at={[-3.0, 0.0, -95]} scale={0.9} phase={2.4} animate={animate} />
      <Rig animate={animate} />
    </Canvas>
  );
}
