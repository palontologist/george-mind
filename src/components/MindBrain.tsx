"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedLobe } from "./NeuralWorld";
import { AURAS } from "../lib/expressions";
import type { MindState } from "../lib/useMindDriver";
import type { WorldRefs } from "../lib/world";

/**
 * The mind, rendered.
 *
 * A gyri-displaced mesh carrying one hotspot per topic and one per project.
 * The brain rests over the cavern's centre while the visitor wanders, then
 * glides in above whichever lobe they have entered, so the face and the mind
 * are legible in the same glance.
 *
 * Regions live in the brain's own object space (see `region.dir` in
 * connectome.json), so they turn with it as it rotates.
 */

/** Topics get the first block of slots; a topic's focused project the second. */
const TOPIC_SLOTS = 7;
const REGION_SLOTS = TOPIC_SLOTS * 2;

export const BRAIN_RADIUS = 2.8;
/** Where the brain waits when no lobe is engaged. */
const HOME = new THREE.Vector3(0, 6.4, 0);
/**
 * Once engaged the brain hangs beside the face rather than above or behind
 * it. Stacked on the same radial line it either covers the face or hides
 * behind it, and neither reads. Offset to the visitor's left, because the
 * topic drawer covers the right of the screen.
 */
const HOVER_SIDE = 4.2;
const HOVER_BACK = 0.4;
const HOVER_UP = 0.3;

/* ------------------------------------------------------------------ */
/*  Shaders                                                            */
/* ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dot(hash3(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
            dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
        mix(dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
            dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
            dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
        mix(dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
            dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}

// Octave count has to be a compile-time constant — GLSL ES 1.00 forbids a
// variable loop bound — so these are three explicit cases rather than one
// parameterised function. They exist because five octaves at every base
// frequency puts the top band above ~40 cycles across the sphere, which at
// blob size is well past Nyquist and aliases into hard rings.
float fbm2(vec3 p) {
  float s = gnoise(p) * 0.5;
  return s + gnoise(p * 2.03) * 0.25;
}

float fbm3(vec3 p) {
  float s = gnoise(p) * 0.5;
  p *= 2.03;
  s += gnoise(p) * 0.25;
  p *= 2.03;
  return s + gnoise(p) * 0.125;
}

float fbm4(vec3 p) {
  float s = gnoise(p) * 0.5;
  p *= 2.03;
  s += gnoise(p) * 0.25;
  p *= 2.03;
  s += gnoise(p) * 0.125;
  p *= 2.03;
  return s + gnoise(p) * 0.0625;
}
`;

const BRAIN_VERT = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uBreath;

varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vWorldN;
varying float vFolds;
varying float vFissure;

/**
 * The cortical surface. Displaces a sphere into gyri and sulci, so it has to
 * be called for the base point *and* for two neighbours — the caller turns
 * the three results into a normal, which is the only way the folds shade
 * properly without a baked normal map.
 */
vec3 shape(vec3 base, out float folds, out float fissure) {
  vec3 scaled = vec3(base.x, base.y * 0.76, base.z * 1.16);
  vec3 dir = normalize(scaled);

  // Three scales. The ridged terms are the important ones: 1 - |2n-1|
  // creases along the noise's zero crossings, which is what makes sulci read
  // as folds instead of the brain reading as a lumpy ball.
  float n = fbm4(dir * 2.6 + vec3(0.0, uTime * 0.012, 0.0));
  float n2 = fbm3(dir * 5.0 + vec3(11.0, -uTime * 0.018, 3.0));
  float n3 = fbm2(dir * 8.5 + vec3(5.0, 2.0, -7.0));
  float ridge = 1.0 - abs(n2 * 2.0 - 1.0);
  float ridge2 = 1.0 - abs(n3 * 2.0 - 1.0);

  float disp = n * 0.21;
  disp -= pow(ridge, 2.6) * 0.16;
  disp += pow(ridge2, 3.0) * 0.055;

  // Longitudinal fissure, and a hint of the central sulcus either side of it.
  fissure = 1.0 - smoothstep(0.0, 0.055, abs(base.x));
  float central = (1.0 - smoothstep(0.0, 0.09, abs(base.x + 0.30)))
                * smoothstep(-0.15, 0.45, base.y);
  disp -= fissure * 0.30 + central * 0.12;

  // Breathing: the organ swells slightly with the visitor's pulse.
  disp += sin(uTime * 0.9) * uBreath * 0.04;

  folds = n * 0.55 + pow(ridge, 2.6) * 0.45;
  return scaled + dir * disp;
}

void main() {
  float folds, fissure, foldsA, fissureA, foldsB, fissureB;
  vec3 p0 = shape(position, folds, fissure);

  // Neighbour samples to recover the displaced normal. The cross product
  // flips across the equator, so orient it outward afterwards.
  vec3 dir0 = normalize(position);
  vec3 tangent = normalize(cross(dir0, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
  vec3 bitangent = normalize(cross(dir0, tangent));
  vec3 p1 = shape(position + tangent * 0.05, foldsA, fissureA);
  vec3 p2 = shape(position + bitangent * 0.05, foldsB, fissureB);
  vec3 nrm = normalize(cross(p1 - p0, p2 - p0));
  if (dot(nrm, normalize(p0)) < 0.0) nrm = -nrm;

  vObj = normalize(p0);
  vFolds = folds;
  vFissure = fissure;

  vec4 world = modelMatrix * vec4(p0, 1.0);
  vWorld = world.xyz;
  vWorldN = normalize(mat3(modelMatrix) * nrm);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const BRAIN_FRAG = /* glsl */ `
uniform vec4 uRegions[${REGION_SLOTS}];
uniform vec3 uColors[${REGION_SLOTS}];
uniform vec3 uBase;
uniform vec3 uRim;
uniform float uTime;
uniform float uHeat;
uniform float uPresence;

varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vWorldN;
varying float vFolds;
varying float vFissure;

void main() {
  vec3 dir = normalize(vObj);
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);

  // A ShaderMaterial receives no scene lights, so the form is carried by a
  // fixed two-point rig that turns with the brain.
  vec3 keyDir = normalize(vec3(0.55, 0.78, 0.42));
  vec3 fillDir = normalize(vec3(-0.62, 0.18, -0.48));
  float key = max(dot(N, keyDir), 0.0);
  float wrap = dot(N, keyDir) * 0.5 + 0.5;
  float fill = max(dot(N, fillDir), 0.0);

  vec3 col = uBase * (0.22 + 0.85 * key + 0.38 * wrap);
  col += uRim * fill * 0.40;
  // Valleys read darker, which is most of what sells the folds.
  col *= 1.0 - vFissure * 0.66;
  col *= 0.70 + 0.46 * smoothstep(-0.3, 0.7, vFolds);

  float heat = 0.0;
  vec3 hot = vec3(0.0);
  for (int i = 0; i < ${REGION_SLOTS}; i++) {
    float act = uRegions[i].w;
    // Wide wash for the region itself, tight core for whatever is focused.
    float d = dot(dir, normalize(uRegions[i].xyz));
    float wash = smoothstep(0.52, 0.94, d);
    float core = smoothstep(0.90, 0.995, d);
    float pulse = 0.74 + 0.26 * sin(uTime * 2.4 - d * 6.0);
    float w = act * (wash * 0.75 + core * act * 1.25) * pulse;
    heat += w;
    hot += uColors[i] * w;
  }

  col += hot * (0.75 + 2.1 * uHeat);
  col += uRim * fres * (0.35 + heat * 1.9 + uHeat * 0.6);

  // A faint travelling shimmer, kept very low — as a plane wave this reads
  // as hard diagonal banding once the blob is only a couple of hundred
  // pixels across.
  float shimmer = sin(dir.y * 9.0 + dir.x * 5.0 + uTime * 0.5);
  col += uRim * smoothstep(0.93, 1.0, shimmer) * (0.02 + heat * 0.22);

  gl_FragColor = vec4(col, uPresence);
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface MindBrainProps {
  lobes: PlacedLobe[];
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  detail: number;
  /** Shown under the MIND title; changes only when a lobe is opened. */
  regionLabel: string | null;
  /**
   * Pins the brain to a fixed spot instead of letting it roam the cavern.
   * The portrait stage uses this — the blob sits still above the face and
   * only its lighting moves.
   */
  anchor?: [number, number, number];
  /** Uniform scale for the pinned mode. The roam mode sizes itself. */
  scale?: number;
  /** Radians per second. Pinned mode spins slower so it reads as "settled". */
  spin?: number;
  /** Hide the MIND title, for layouts that label it in DOM instead. */
  showTitle?: boolean;
  /**
   * Pins a small marker on every topic's region — the connectome read, where
   * the map itself is the content rather than a decoration above it.
   */
  showMarkers?: boolean;
}

export default function MindBrain({
  lobes,
  mind,
  refs,
  detail,
  regionLabel,
  anchor,
  scale,
  spin,
  showTitle = true,
  showMarkers = false,
}: MindBrainProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const tether = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0.3 },
      uHeat: { value: 0 },
      uPresence: { value: 0 },
      // Ambient low enough that the key light still models the folds — raise it
      // and the gyri flatten into a grey ball, which is the failure mode
      // here. three also linearises this into the working colour space.
      uBase: { value: new THREE.Color("#5c7590") },
      uRim: { value: new THREE.Color("#7dd3fc") },
      uRegions: {
        value: Array.from({ length: REGION_SLOTS }, () => new THREE.Vector4(0, 1, 0, 0)),
      },
      uColors: {
        value: Array.from({ length: REGION_SLOTS }, () => new THREE.Color("#38bdf8")),
      },
    }),
    []
  );

  /** Baked once: each topic's region, its projects' regions, and the colours. */
  const slots = useMemo(
    () =>
      lobes.slice(0, TOPIC_SLOTS).map((lobe) => ({
        id: lobe.id,
        color: new THREE.Color(lobe.color),
        region: new THREE.Vector3(...(lobe.region?.dir ?? [0, 1, 0])),
        nodes: lobe.nodes.map(
          (node) =>
            new THREE.Vector3(...(node.region?.dir ?? lobe.region?.dir ?? [0, 1, 0]))
        ),
        nodeColors: lobe.nodes.map((node) =>
          node.mood ? new THREE.Color(AURAS[node.mood.expression].rimColor) : new THREE.Color(lobe.color)
        ),
      })),
    [lobes]
  );

  // Scratch, hoisted: the frame loop must not allocate.
  const target = useMemo(() => new THREE.Vector3(), []);
  const scratchA = useMemo(() => new THREE.Vector3(), []);
  const scratchB = useMemo(() => new THREE.Vector3(), []);
  const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const heat = useRef(0);
  // One marker mesh per topic slot, driven in the same loop as the shading.
  const markers = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = refs.current;
    const state = mind.current;
    const time = clock.elapsedTime;
    const g = group.current;
    if (!g) return;

    // R3F copies the `uniforms` object onto the material rather than keeping
    // the reference, so the object built above goes stale after mount and
    // every write to it is silently dropped. Drive the material's own copy.
    // This has to include uRegions/uColors — those are cloned too, so holding
    // the pre-clone arrays would mean writing vectors nothing ever reads.
    const u = material.current?.uniforms;
    if (!u) return;

    u.uTime.value = time;
    u.uBreath.value = 0.25 + state.aura.bpm / 60;
    u.uRim.value.lerp(state.color, 1 - Math.exp(-2.2 * dt));

    const active = lobes.find((l) => l.id === r.activeId) ?? null;

    /* --- Where should it be? ------------------------------------- */
    if (anchor) {
      // Pinned. A slow float keeps it alive without making it feel mobile.
      target.set(anchor[0], anchor[1] + Math.sin(time * 0.45) * 0.012, anchor[2]);
    } else if (active) {
      // Outward from the ring centre: a visitor stands inside the ring, so
      // this is the axis running away from them.
      scratchA.copy(active.worldPosition).setY(0);
      if (scratchA.lengthSq() < 1e-6) scratchA.set(0, 0, -1);
      scratchA.normalize();
      // With outward = (0,0,-1) — a visitor facing the far side of the ring —
      // this basis resolves to -X, which is their left. The drawer owns the
      // right of the screen, so that is the side the mind belongs on.
      scratchB.set(scratchA.z, 0, -scratchA.x);

      target.copy(active.stagePosition);
      target.addScaledVector(scratchB, HOVER_SIDE);
      target.addScaledVector(scratchA, HOVER_BACK);
      target.y += HOVER_UP;
    } else {
      target.copy(HOME);
    }
    const arrive = 1 - Math.exp(-(active && !anchor ? 2.6 : 1.5) * dt);
    g.position.lerp(target, arrive);

    // Monumental over the cavern's centre, but scaled back once it is
    // hovering over a face — at reading distance a full-size brain swallows
    // the face it is supposed to be contextualising. The pinned stage
    // overrides it outright.
    const wantScale = anchor ? (scale ?? 1) : active ? 0.62 : 1;
    const nextScale = g.scale.x + (wantScale - g.scale.x) * arrive;
    g.scale.setScalar(nextScale);

    // Slow idle drift, damped once a lobe is engaged so the brain settles into
    // a readable pose instead of spinning while it talks.
    // Pinned it keeps turning (slowly) so its lit region comes round into
    // view; roaming it drifts freely and damps as the visitor arrives.
    const drift = anchor ? 1 : 1 - Math.min(1, r.appearance);
    const rate = anchor ? (spin ?? 0.16) : 0.085;
    g.rotation.y = time * rate * drift + Math.sin(time * 0.21) * 0.05 * drift;
    g.rotation.x = Math.sin(time * 0.17) * 0.06 * drift + (anchor ? 0.04 : 0.1);
    // Bow toward the visitor rather than tracking them outright.
    scratchA.copy(camera.position).sub(g.position);
    g.rotation.z = THREE.MathUtils.clamp(Math.atan2(scratchA.x, scratchA.z) * 0.06, -0.25, 0.25);

    /* --- Which regions are lit? ----------------------------------- */
    const regionUniforms = u.uRegions.value;
    const colorUniforms = u.uColors.value;
    let maxHeat = 0;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const prox = THREE.MathUtils.clamp(r.proximity[slot.id] ?? 0, 0, 1);
      const isActive = slot.id === r.activeId;
      const topicHeat = isActive ? 1 : prox * prox * 0.5;
      const nodeIdx = isActive ? r.activeNodeIndex : -1;
      const focused = nodeIdx >= 0 && nodeIdx < slot.nodes.length;

      const topic = regionUniforms[i];
      topic.set(slot.region.x, slot.region.y, slot.region.z, focused ? 0.3 : topicHeat);
      colorUniforms[i].copy(slot.color);

      const node = regionUniforms[TOPIC_SLOTS + i];
      if (focused) {
        const dir = slot.nodes[nodeIdx];
        node.set(dir.x, dir.y, dir.z, 1);
        colorUniforms[TOPIC_SLOTS + i].copy(slot.nodeColors[nodeIdx]);
      } else {
        node.set(0, 1, 0, 0);
      }

      maxHeat = Math.max(maxHeat, focused ? 1 : topicHeat);

      const marker = markers.current[i];
      if (marker) {
        const mat = marker.material as THREE.MeshBasicMaterial;
        const on = Math.max(focused ? 1 : 0, topicHeat);
        // The pins stay legible as a map whether or not they are lit; the
        // brain behind them carries the heat.
        mat.opacity = 0.62 + on * 0.38;
        marker.scale.setScalar(0.1 + on * 0.12);
      }
    }

    heat.current += (maxHeat - heat.current) * (1 - Math.exp(-3.4 * dt));
    u.uHeat.value = heat.current;
    u.uPresence.value +=
      ((active ? 1 : 0.74) - u.uPresence.value) * (1 - Math.exp(-2.6 * dt));

    /* --- Halo + light follow the heat ----------------------------- */
    if (halo.current) {
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 + heat.current * 0.16;
      halo.current.scale.setScalar(1.06 + heat.current * 0.04);
    }
    if (light.current) {
      light.current.intensity = 4 + heat.current * 26 + state.aura.bpm * 0.06;
      light.current.color.lerp(state.color, 1 - Math.exp(-2 * dt));
    }

    /* --- Tether back to the face ---------------------------------- */
    const th = tether.current;
    if (th) {
      if (!active || anchor) {
        // Anchored, there is no lobe stage for the tether to reach.
        th.visible = false;
      } else {
        th.visible = true;
        scratchA.copy(active.stagePosition);
        const mid = scratchB.copy(g.position).add(scratchA).multiplyScalar(0.5);
        th.position.copy(mid);
        th.scale.set(1, Math.max(g.position.distanceTo(scratchA), 0.001), 1);
        // The cylinder runs along +Y with unit height; aim it down the axis.
        th.quaternion.setFromUnitVectors(UP, scratchA.sub(g.position).normalize());
        const mat = th.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.05 + heat.current * 0.22;
        mat.color.lerp(state.color, 1 - Math.exp(-2 * dt));
      }
    }
  });

  return (
    <>
      <group ref={group} position={HOME.toArray()}>
        <mesh>
          <icosahedronGeometry args={[BRAIN_RADIUS, detail]} />
          <shaderMaterial
            ref={material}
            vertexShader={BRAIN_VERT}
            fragmentShader={BRAIN_FRAG}
            uniforms={uniforms}
            transparent
          />
        </mesh>

        {/* Additive shell — the volumetric read, and what the bloom eats. */}
        <mesh ref={halo} scale={1.06}>
          <icosahedronGeometry args={[BRAIN_RADIUS, 3]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        <pointLight ref={light} intensity={4} distance={26} decay={2} color="#7dd3fc" />

        {showMarkers
          ? slots.slice(0, TOPIC_SLOTS).map((slot, i) => (
              <mesh
                key={slot.id}
                ref={(m) => {
                  markers.current[i] = m;
                }}
                position={[
                  slot.region.x * BRAIN_RADIUS * 1.012,
                  slot.region.y * BRAIN_RADIUS * 1.012,
                  slot.region.z * BRAIN_RADIUS * 1.012,
                ]}
              >
                <sphereGeometry args={[1, 14, 12]} />
                <meshBasicMaterial
                  color={slot.color}
                  transparent
                  opacity={0.5}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            ))
          : null}

        {showTitle ? (
          <Text
            position={[0, BRAIN_RADIUS * 1.34, 0]}
            fontSize={0.44}
            color="#e2e8f0"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#000"
            material-toneMapped={false}
          >
            MIND
          </Text>
        ) : null}
        {showTitle && regionLabel ? (
          <Text
            position={[0, BRAIN_RADIUS * 1.12, 0]}
            fontSize={0.26}
            color="#7dd3fc"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000"
            material-toneMapped={false}
            maxWidth={BRAIN_RADIUS * 2}
          >
            {regionLabel.toUpperCase()}
          </Text>
        ) : null}
      </group>

      {/* Tether sits outside the rotating group so it never inherits the spin. */}
      <mesh ref={tether} visible={false}>
        <cylinderGeometry args={[0.035, 0.035, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}