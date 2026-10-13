"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { MindState } from "../lib/useMindDriver";
import type { WorldRefs } from "../lib/world";
import { WORLD_RADIUS, type PlacedLobe } from "../lib/layout";
import { consumeSuppressedClick } from "../lib/dragGuard";

export type { PlacedLobe };
export { WORLD_RADIUS };

/**
 * The interior of the mind.
 *
 * A dark volumetric cavern with a wet reflective floor, a drifting
 * neuron cloud, and a connectome of glowing filaments strung between
 * the topic cores. Everything here reacts to the live emotional state.
 */

/** Deterministic PRNG so the layout is identical on every load. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAVERN_RADIUS = WORLD_RADIUS;

/* ------------------------------------------------------------------ */
/*  Floor — dark polished plate with a heartbeat ripple               */
/* ------------------------------------------------------------------ */

export function NeuralFloor() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#38bdf8") },
      uPulse: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.position.y = -0.02;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <circleGeometry args={[CAVERN_RADIUS * 1.6, 128]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={FLOOR_VERT}
        fragmentShader={FLOOR_FRAG}
      />
    </mesh>
  );
}

const FLOOR_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FLOOR_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Cheap value noise for the organic cortical mottle.
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vPos.xy;
    float r = length(p);
    float ang = atan(p.y, p.x);

    // Gyri: warped concentric ridges, like a folded cortex.
    float warp = fbm(p * 0.055 + vec2(uTime * 0.012, -uTime * 0.008));
    float ridges = sin(r * 0.55 - warp * 7.0 + uTime * 0.25);
    ridges = smoothstep(0.35, 0.95, ridges);

    // Fine synaptic grid.
    float grid = 0.0;
    vec2 g = p * 0.5;
    vec2 gf = abs(fract(g) - 0.5);
    float line = smoothstep(0.47, 0.5, max(gf.x, gf.y));
    grid = line * (0.35 + 0.65 * warp);

    // A slow radial pulse travelling outward, on the heartbeat.
    float wave = sin(r * 0.32 - uTime * 1.5) * 0.5 + 0.5;
    wave = pow(wave, 6.0) * uPulse;

    float fade = smoothstep(${(CAVERN_RADIUS * 1.6).toFixed(1)}, 4.0, r);
    float base = (ridges * 0.16 + grid * 0.1 + wave * 0.55);

    vec3 col = uColor * base * 1.5;
    col += vec3(0.02, 0.03, 0.05) * ridges * fade;

    float alpha = clamp(base * fade * 1.6, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ------------------------------------------------------------------ */
/*  Neuron cloud — GPU-animated point field                            */
/* ------------------------------------------------------------------ */

export function NeuronCloud({ mind, count = 5200 }: { mind: React.MutableRefObject<MindState>; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes, seeds, colors } = useMemo(() => {
    const rand = mulberry32(20240517);
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const sd = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cool = new THREE.Color("#334a63");
    const warm = new THREE.Color("#8fd4ff");

    for (let i = 0; i < count; i++) {
      // Shell-biased distribution so there's depth and a hollow centre.
      const r = CAVERN_RADIUS * (0.28 + Math.pow(rand(), 0.55) * 0.72);
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const height = Math.pow(rand(), 1.6);

      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = height * 16 - 1.5 + (rand() - 0.5) * 2.2;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;

      sz[i] = 0.6 + rand() * 2.4;
      sd[i * 3] = rand() * Math.PI * 2;
      sd[i * 3 + 1] = 0.25 + rand() * 0.9;
      sd[i * 3 + 2] = rand();

      const c = cool.clone().lerp(warm, Math.pow(rand(), 2.4));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, sizes: sz, seeds: sd, colors: col };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#38bdf8") },
      uIntensity: { value: 1 },
      uPixelRatio: { value: 1 },
    }),
    []
  );

  useThree((s) => {
    uniforms.uPixelRatio.value = s.viewport.dpr;
  });

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime;
    const state = mind.current;
    uniforms.uColor.value.lerp(state.color, 1 - Math.exp(-2 * delta));
    uniforms.uIntensity.value = 0.6 + state.aura.lightIntensity * 0.5;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.012;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={CLOUD_VERT}
        fragmentShader={CLOUD_FRAG}
      />
    </points>
  );
}

const CLOUD_VERT = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aSize;
  // three injects position/normal/uv into ShaderMaterial but not color,
  // so declare it here for the per-neuron tint.
  attribute vec3 color;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntensity;
  varying float vGlow;
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vec3 p = position;

    // Organic drift — each neuron on its own slow Lissajous path.
    float t = uTime * aSeed.y * 0.35 + aSeed.x;
    p.x += sin(t) * 0.55 + sin(t * 0.37) * 0.9;
    p.y += cos(t * 0.8) * 0.5;
    p.z += sin(t * 1.1 + aSeed.z * 6.28) * 0.7;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float d = -mv.z;
    gl_PointSize = aSize * uPixelRatio * (26.0 / max(d, 0.6)) * uIntensity;

    // Twinkle
    vGlow = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed.x * 4.0);
    // Fade near and far so the cloud never looks like flat sprites.
    vFade = smoothstep(0.4, 3.5, d) * smoothstep(70.0, 22.0, d);
    vColor = color;
  }
`;

const CLOUD_FRAG = /* glsl */ `
  precision highp float;
  varying float vGlow;
  varying float vFade;
  varying vec3 vColor;
  uniform vec3 uColor;
  uniform float uIntensity;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float halo = pow(core, 3.5);
    vec3 col = mix(vColor, uColor, 0.55) * (0.6 + halo * 1.9);
    gl_FragColor = vec4(col, core * vGlow * vFade * 0.75 * uIntensity);
  }
`;

/* ------------------------------------------------------------------ */
/*  Synapse cores — the topic beacons you walk up to                   */
/* ------------------------------------------------------------------ */

export function SynapseCore({
  lobe,
  mind,
  refs,
  active,
  onSelect,
  onHover,
}: {
  lobe: PlacedLobe;
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  active: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const colorRef = useRef(new THREE.Color(lobe.color));

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const state = mind.current;
    const t = clock.elapsedTime;
    const prox = THREE.MathUtils.clamp(refs.current.proximity[lobe.id] ?? 0, 0, 1);
    const heat = Math.max(active ? 1 : 0, prox * 0.8, hovered ? 0.5 : 0);

    // Idle float + a faster spin when you're close.
    g.position.y = lobe.worldPosition.y + Math.sin(t * 0.6 + lobe.position[0]) * 0.16;
    g.rotation.y = t * (0.16 + prox * 0.5);

    colorRef.current.set(lobe.color);
    colorRef.current.lerp(state.color, heat * 0.35);

    const pulse = 0.5 + 0.5 * Math.sin(t * (1.4 + state.aura.bpm / 60) * Math.PI);
    const scale = 1 + prox * 0.5 + (active ? 0.18 : 0) + pulse * 0.05 * heat;

    if (core.current) core.current.scale.setScalar(scale);
    if (halo.current) {
      halo.current.scale.setScalar(scale * (1.5 + pulse * 0.4));
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + heat * 0.3 + pulse * 0.05;
    }
    if (ringA.current) ringA.current.rotation.z = t * 0.7;
    if (ringB.current) {
      ringB.current.rotation.x = t * 0.45;
      ringB.current.rotation.y = t * 0.3;
    }
    if (beam.current) {
      const bm = beam.current.material as THREE.ShaderMaterial;
      bm.uniforms.uTime.value = t;
      bm.uniforms.uHeat.value += (heat - bm.uniforms.uHeat.value) * (1 - Math.exp(-4 * delta));
      bm.uniforms.uColor.value.copy(colorRef.current);
    }
    if (light.current) {
      light.current.color.copy(colorRef.current);
      light.current.intensity = (2.4 + heat * 9) * (0.85 + pulse * 0.15);
      light.current.distance = 16 + prox * 16;
    }
  });

  return (
    <group ref={group} position={lobe.worldPosition}>
      {/* Core */}
      <mesh
        ref={core}
        onClick={(e) => {
          e.stopPropagation();
          // A drag-to-look must not count as selecting this core.
          if (consumeSuppressedClick()) return;
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <icosahedronGeometry args={[0.42, 3]} />
        <meshPhysicalMaterial
          color={colorRef.current}
          emissive={colorRef.current}
          emissiveIntensity={1.4}
          roughness={0.15}
          metalness={0.1}
          transmission={0.35}
          thickness={1.2}
          clearcoat={1}
          clearcoatRoughness={0.2}
          iridescence={0.6}
          iridescenceIOR={1.6}
        />
      </mesh>

      {/* Halo */}
      <mesh ref={halo}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial
          color={colorRef.current}
          transparent
          opacity={0.14}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbit rings */}
      <mesh ref={ringA} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[0.95, 0.008, 8, 64]} />
        <meshBasicMaterial color={colorRef.current} transparent opacity={0.55} />
      </mesh>
      <mesh ref={ringB} rotation={[0, 0, Math.PI / 3]}>
        <torusGeometry args={[1.22, 0.005, 8, 64]} />
        <meshBasicMaterial color={colorRef.current} transparent opacity={0.32} />
      </mesh>

      {/* Vertical light column into the fog */}
      <mesh ref={beam} position={[0, 7, 0]}>
        <cylinderGeometry args={[0.34, 0.05, 15, 24, 1, true]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uHeat: { value: 0 },
            uColor: { value: new THREE.Color(lobe.color) },
          }}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM_FRAG}
        />
      </mesh>

      <pointLight ref={light} color={lobe.color} intensity={3} distance={18} decay={2} />

      {/* Floating label. Hidden once the lobe is engaged — the face stages
          itself right where these sit and they would draw straight through
          it, and the drawer already carries the name anyway. */}
      {!active ? (
        <>
          <Text
            position={[0, 1.85, 0]}
            fontSize={0.2}
            color="#e2e8f0"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#000000"
            material-toneMapped={false}
          >
            {lobe.name.toUpperCase()}
          </Text>
          <Text
            position={[0, 1.58, 0]}
            fontSize={0.115}
            color={lobe.color}
            anchorX="center"
            anchorY="middle"
            material-toneMapped={false}
          >
            {lobe.tag}
          </Text>
        </>
      ) : null}
    </group>
  );
}

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const BEAM_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  uniform float uTime;
  uniform float uHeat;
  uniform vec3 uColor;

  void main() {
    // Fresnel-ish rim so the column reads as volume, not a cylinder.
    float rim = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir)));
    rim = pow(rim, 1.6);

    // Signals travelling up the column.
    float flow = fract(vUv.y * 2.5 - uTime * 0.22);
    float pulse = pow(flow, 5.0);

    // Fade in at the base, out at the top.
    float vertical = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.35, vUv.y);

    float a = rim * vertical * (0.16 + pulse * 0.5 + uHeat * 0.45);
    gl_FragColor = vec4(uColor * (1.0 + pulse * 1.6), a);
  }
`;

/* ------------------------------------------------------------------ */
/*  Connectome filaments                                              */
/* ------------------------------------------------------------------ */

export function ConnectomeFilaments({
  lobes,
  mind,
}: {
  lobes: PlacedLobe[];
  mind: React.MutableRefObject<MindState>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < lobes.length; i++) {
      const a = lobes[i].worldPosition;
      for (let j = i + 1; j < lobes.length; j++) {
        const b = lobes[j].worldPosition;
        const dist = a.distanceTo(b);
        if (dist > 22) continue;
        // Arc the filament outward from the centre so it reads as depth.
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const lift = mid.clone().setY(0).normalize().multiplyScalar(dist * 0.13);
        lift.y += 2.4 + Math.random() * 2.4;
        const c1 = a
          .clone()
          .lerp(mid, 0.45)
          .add(lift.clone().multiplyScalar(0.6));
        const c2 = mid.clone().lerp(b, 0.55).add(lift.clone().multiplyScalar(0.6));
        curves.push(new THREE.CatmullRomCurve3([a, c1, mid, c2, b], false, "catmullrom", 0.5));
      }
    }
    // Hub spokes from the core.
    const hub = new THREE.Vector3(0, 2.2, 0);
    lobes.forEach((l) => {
      const a = l.worldPosition;
      const mid = a.clone().lerp(hub, 0.5);
      mid.y += a.distanceTo(hub) * 0.18 + 1.2;
      curves.push(new THREE.CatmullRomCurve3([hub, mid, a], false, "catmullrom", 0.5));
    });

    const geos = curves.map((c) => new THREE.TubeGeometry(c, 48, 0.014, 5, false));
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    return merged;
  }, [lobes]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#38bdf8") },
      uEnergy: { value: 1 },
    }),
    []
  );

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime;
    const s = mind.current;
    uniforms.uColor.value.lerp(s.color, 1 - Math.exp(-2 * delta));
    uniforms.uEnergy.value += (0.4 + s.aura.lightIntensity * 0.6 - uniforms.uEnergy.value) *
      (1 - Math.exp(-2 * delta));
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={FILAMENT_VERT}
          fragmentShader={FILAMENT_FRAG}
        />
      </mesh>
    </group>
  );
}

const FILAMENT_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vProgress;
  uniform float uTime;
  void main() {
    vUv = uv;
    vProgress = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FILAMENT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uEnergy;

  void main() {
    // Action potentials running along each filament.
    float head = fract(vUv.x * 3.0 - uTime * 0.32 + vUv.y * 0.1);
    float spike = pow(head, 14.0) + pow(fract(head + 0.5), 26.0) * 0.5;

    float base = 0.1 + uEnergy * 0.14;
    float a = (base + spike * 0.75) * (0.35 + 0.65 * sin(vUv.x * 3.14159));
    gl_FragColor = vec4(uColor * (0.7 + spike * 3.0), clamp(a, 0.0, 1.0));
  }
`;

/* ------------------------------------------------------------------ */
/*  Minimal geometry merge (avoids pulling in an addon)               */
/* ------------------------------------------------------------------ */

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let offset = 0;

  for (const g of geometries) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const u = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      if (n) normals.push(n.getX(i), n.getY(i), n.getZ(i));
      if (u) uvs.push(u.getX(i), u.getY(i));
    }
    const idx = g.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    } else {
      for (let i = 0; i < p.count; i++) indices.push(i + offset);
    }
    offset += p.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length)
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  if (uvs.length === (positions.length / 3) * 2)
    merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

/* ------------------------------------------------------------------ */
/*  Cavern shell                                                       */
/* ------------------------------------------------------------------ */

export function CavernShell({ mind }: { mind: React.MutableRefObject<MindState> }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#0a1628") },
    }),
    []
  );

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uColor.value.lerp(mind.current.color, 1 - Math.exp(-1.5 * delta) * 0.35);
  });

  return (
    <mesh scale={[1, 0.62, 1]}>
      <sphereGeometry args={[CAVERN_RADIUS * 1.5, 64, 48]} />
      <shaderMaterial
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={SHELL_VERT}
        fragmentShader={SHELL_FRAG}
      />
    </mesh>
  );
}

const SHELL_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SHELL_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  uniform float uTime;
  uniform vec3 uColor;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos) * 2.2;
    float w = fbm(p + vec3(0.0, uTime * 0.02, uTime * 0.012));
    float veins = smoothstep(0.52, 0.78, w);

    float rim = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.4);

    vec3 col = mix(vec3(0.006, 0.010, 0.022), uColor * 0.06, w);
    col += uColor * veins * 0.05;
    col += uColor * rim * 0.16;

    gl_FragColor = vec4(col, 1.0);
  }
`;