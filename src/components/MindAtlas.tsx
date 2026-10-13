"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { createMindState, useMindDriver, type MindState } from "../lib/useMindDriver";
import { createWorldRefs, type WorldRefs } from "../lib/world";
import { placeLobes } from "../lib/layout";
import { AURAS, type ExpressionKey } from "../lib/expressions";

/**
 * The connectome.
 *
 * 14,481 synapses from victors1681/3dbrain, rendered as the point cloud that
 * project actually built it as — not a smooth mesh. Points are the right unit
 * here: each one is a synapse, so a topic can light exactly the population
 * that fires for it and leave the rest dark, which a single opaque mesh can
 * never do.
 *
 * Vertex data from `brain_vertex_low.obj`, centred and normalised to radius 1
 * with +Y up and +Z forward, then baked to JSON.
 */

const REGION_SLOTS = 7;
const POINTS_URL = "/models/brain-points.json";

interface Cloud {
  positions: Float32Array;
  /** Which topic each point sits closest to, for cheap per-point lookup. */
  regions: Float32Array;
  count: number;
}

interface MindAtlasProps {
  lobeId: string | null;
  nodeIndex: number;
  expression: ExpressionKey;
}

export default function MindAtlas({ lobeId, nodeIndex, expression }: MindAtlasProps) {
  const mind = useRef<MindState>(createMindState());
  const refs = useRef<WorldRefs>(createWorldRefs());
  const lobes = useMemo(() => placeLobes(), []);

  const emotionRef = useRef<ExpressionKey>(expression);
  useEffect(() => {
    emotionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    refs.current.activeId = lobeId;
  }, [lobeId, refs]);

  useEffect(() => {
    refs.current.activeNodeIndex = nodeIndex;
  }, [nodeIndex, refs]);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0, 0.18, 3.02], fov: 40, near: 0.1, far: 30 }}
      style={{ background: "transparent" }}
    >
      <Connectome mind={mind} refs={refs} lobes={lobes} emotionRef={emotionRef} />
    </Canvas>
  );
}

function Connectome({
  mind,
  refs,
  lobes,
  emotionRef,
}: {
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  lobes: ReturnType<typeof placeLobes>;
  emotionRef: React.MutableRefObject<ExpressionKey>;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const points = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  useMindDriver(mind, emotionRef);

  // Topic regions, in the brain's own space. Topics without an explicit
  // region fall back to a spread so the map still lights.
  const topics = useMemo(
    () =>
      lobes.slice(0, REGION_SLOTS).map((lobe, i) => ({
        id: lobe.id,
        color: new THREE.Color(lobe.color),
        dir: new THREE.Vector3(...(lobe.region?.dir ?? [0, 1, 0])).normalize(),
        label: lobe.region?.label ?? lobe.tag,
        slot: i,
      })),
    [lobes]
  );

  const [cloud, setCloud] = useState<Cloud | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(POINTS_URL)
      .then((r) => r.json())
      .then((data: { count: number; points: number[] }) => {
        if (!alive) return;
        const positions = new Float32Array(data.points);
        // Classify each point against the topic regions once, on the CPU.
        // Doing this per frame in the vertex shader would mean 14k dot
        // products every frame for a value that never changes.
        const regions = new Float32Array(data.count);
        const v = new THREE.Vector3();
        const best = new Float32Array(data.count);
        for (let i = 0; i < data.count; i++) {
          v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]).normalize();
          let top = -1;
          let topDot = -2;
          for (const t of topics) {
            const d = v.dot(t.dir);
            if (d > topDot) {
              topDot = d;
              top = t.slot;
            }
          }
          regions[i] = top;
          best[i] = Math.max(0, topDot);
        }
        setCloud({ positions, regions, count: data.count });
      })
      .catch(() => setCloud(null));
    return () => {
      alive = false;
    };
  }, [topics]);

  const uniforms = useMemo(
    () => ({
      uRegions: {
        value: Array.from({ length: REGION_SLOTS }, () => new THREE.Vector4(0, 1, 0, 0)),
      },
      uColors: {
        value: Array.from({ length: REGION_SLOTS }, () => new THREE.Color("#38bdf8")),
      },
      uBase: { value: new THREE.Color("#8fa6bd") },
      uRim: { value: new THREE.Color("#c9452c") },
      uSize: { value: 2.6 },
      uPixelRatio: { value: 1 },
    }),
    []
  );

  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uPixelRatio.value = dpr;
    u.uRim.value.lerp(mind.current.color, 1 - Math.exp(-2.2 * Math.min(delta, 0.05)));

    const active = lobes.find((l) => l.id === refs.current.activeId) ?? null;
    const nodeIdx = refs.current.activeNodeIndex;

    topics.forEach((t, i) => {
      const prox = THREE.MathUtils.clamp(refs.current.proximity[t.id] ?? 0, 0, 1);
      const isActive = t.id === refs.current.activeId;
      u.uRegions.value[i].set(t.dir.x, t.dir.y, t.dir.z, isActive ? 1 : prox * prox * 0.4);
      u.uColors.value[i].copy(t.color);
    });

    // The focused project's own region, if it has one, overrides its topic.
    if (active && nodeIdx >= 0 && nodeIdx < active.nodes.length) {
      const node = active.nodes[nodeIdx];
      const d = new THREE.Vector3(...(node.region?.dir ?? active.region?.dir ?? [0, 1, 0]));
      const slot = topics.findIndex((t) => t.id === active.id);
      if (slot >= 0) {
        u.uRegions.value[slot].set(d.x, d.y, d.z, 1.6);
        u.uColors.value[slot].set(AURAS[node.mood?.expression ?? active.mood.expression].rimColor);
      }
    }

    // Held still, like the face. A turning brain reads as an object on a
    // turntable; a fixed one reads as a specimen.
    if (points.current) {
      points.current.rotation.set(0.2, 0.34, 0);
    }
  });

  return (
    <>
      {cloud ? (
        <points ref={points}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[cloud.positions, 3]}
            />
            <bufferAttribute
              attach="attributes-aRegion"
              args={[cloud.regions, 1]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={material}
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ) : (
        <mesh>
          <sphereGeometry args={[1, 24, 18]} />
          <meshBasicMaterial color="#1b2430" wireframe transparent opacity={0.4} />
        </mesh>
      )}
    </>
  );
}

const VERT = /* glsl */ `
attribute float aRegion;
uniform vec4 uRegions[${REGION_SLOTS}];
uniform vec3 uColors[${REGION_SLOTS}];
uniform float uSize;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vHeat;
varying float vDepth;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;

  // Hottest region containing this point wins, so an overlapping region
  // cannot double-count and wash the map out.
  float heat = 0.0;
  vec3 col = vec3(0.0);
  int mine = int(aRegion + 0.5);
  for (int i = 0; i < ${REGION_SLOTS}; i++) {
    if (i != mine) continue;
    float a = uRegions[i].w;
    if (a <= 0.0) continue;
    float d = dot(normalize(position), uRegions[i].xyz);
    float wash = smoothstep(0.66, 0.97, d) * min(a, 1.0);
    float core = smoothstep(0.93, 0.999, d) * min(a, 1.0);
    float w = wash + core;
    if (w > heat) {
      heat = w;
      col = uColors[i];
    }
  }

  vHeat = heat;
  vColor = col;
  gl_PointSize = uSize * uPixelRatio * (0.7 + heat * 0.85) * (5.0 / vDepth);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uRim;

varying vec3 vColor;
varying float vHeat;
varying float vDepth;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.08, r);

  vec3 col = uBase * (0.34 + 0.66 * soft);
  col = mix(col, vColor * 1.0, clamp(vHeat * 1.2, 0.0, 1.0));
  col += uRim * pow(vHeat, 3.0) * 0.2;

  float a = soft * (0.3 + vHeat * 0.5) * (0.5 + 0.5 * smoothstep(4.0, 1.2, vDepth));
  gl_FragColor = vec4(col, a);
}
`;
