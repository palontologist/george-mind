"use client";

import { useEffect, useMemo, useRef, useState as useReactState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { KTX2Loader } from "three-stdlib";
import * as THREE from "three";
import {
  EXPRESSIONS,
  bindGaze,
  bindMorphs,
  describeBinding,
  type ExpressionVector,
  type GazeMap,
  type MorphMap,
} from "../lib/expressions";
import type { MindState } from "../lib/useMindDriver";
import type { WorldRefs } from "../lib/world";

/* ------------------------------------------------------------------ */
/*  Model resolution                                                   */
/* ------------------------------------------------------------------ */

/**
 * Drop your head model at /public/models/facecap.glb and it is picked
 * up automatically. Until (and unless) that file is actually reachable,
 * a fully expressive procedural head renders instead — so a missing asset
 * degrades the look, never the experience.
 */
export const HEAD_MODEL_URL = "/models/facecap.glb";

/** Substrings that identify the head node inside a full-body rig. */
const HEAD_HINTS = ["head", "face", "skull", "biped_head", "mdl_head"];

/**
 * The head is normalised to this in world units — roughly life-size, so the
 * callers decide how monumental to make it.
 */
const HEAD_SIZE = 0.42;

/**
 * facecap.glb ships a Basis/KTX2 compressed base colour map, so GLTFLoader
 * needs a transcoder before it will parse the file at all. The transcoder
 * pair is copied into /public/basis so this works with no third-party origin.
 */
function useHeadGLTF(gl: THREE.WebGLRenderer, url: string) {
  return useGLTF(url, true, true, (loader) => {
    const ktx2 = new KTX2Loader();
    ktx2.setTranscoderPath("/basis/");
    ktx2.detectSupport(gl);
    loader.setKTX2Loader(ktx2);
  }) as unknown as { scene: THREE.Group };
}

export function useHeadModel(url: string) {
  const [resolved, setResolved] = useStateSafe<string | null>(null);
  const [checked, setChecked] = useStateSafe(false);

  useEffect(() => {
    let alive = true;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (!alive) return;
        setResolved(r.ok ? url : null);
        setChecked(true);
      })
      .catch(() => {
        if (!alive) return;
        setResolved(null);
        setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [url, setResolved, setChecked]);

  return { url: resolved, checked };
}

function useStateSafe<T>(initial: T) {
  const ref = useRef(initial);
  const [value, setValue] = useReactState(ref.current);
  return [
    value,
    (v: T) => {
      ref.current = v;
      setValue(v);
    },
  ] as const;
}

/* ------------------------------------------------------------------ */
/*  Eyes                                                               */
/* ------------------------------------------------------------------ */

function EyeUnit({
  position,
  mind,
  look,
}: {
  position: [number, number, number];
  mind: React.MutableRefObject<MindState>;
  look: THREE.Vector3;
}) {
  const group = useRef<THREE.Group>(null);
  const pupil = useRef<THREE.Mesh>(null);
  const lid = useRef<THREE.Mesh>(null);
  const irisMat = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const state = mind.current;
    const blink = state.expression.eyeBlink;

    g.lookAt(look);

    if (pupil.current) {
      const s = 1 - blink * 0.18;
      pupil.current.scale.set(s, s, 1);
    }
    if (lid.current) {
      lid.current.rotation.x = THREE.MathUtils.lerp(0, -1.95, blink);
      lid.current.visible = blink > 0.015;
    }
    if (irisMat.current) {
      irisMat.current.emissiveIntensity = 0.3 + state.settle * 0.45;
      irisMat.current.emissive.lerp(state.color, 1);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 28, 24]} />
        <meshPhysicalMaterial
          color="#e7e1d8"
          roughness={0.16}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transmission={0.06}
          thickness={0.4}
        />
      </mesh>

      {/* Iris — takes a wash of the current emotion colour */}
      <mesh ref={pupil} position={[0, 0, 0.128]}>
        <sphereGeometry args={[0.068, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
        <meshPhysicalMaterial
          ref={irisMat}
          color="#43301f"
          emissive="#2a1c12"
          emissiveIntensity={0.4}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.02}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, 0, 0.172]}>
        <circleGeometry args={[0.029, 24]} />
        <meshBasicMaterial color="#04050a" toneMapped={false} />
      </mesh>
      {/* Catchlight keeps the eye alive */}
      <mesh position={[-0.022, 0.026, 0.168]}>
        <circleGeometry args={[0.013, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} toneMapped={false} />
      </mesh>

      {/* Upper lid */}
      <mesh ref={lid} visible={false}>
        <sphereGeometry args={[0.158, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial color="#7d5039" roughness={0.6} clearcoat={0.28} />
      </mesh>
      {/* Lid creases */}
      <mesh position={[0, 0.093, 0.086]} rotation={[-0.62, 0, 0]}>
        <torusGeometry args={[0.093, 0.012, 8, 22, Math.PI]} />
        <meshPhysicalMaterial color="#7a4d3a" roughness={0.6} clearcoat={0.25} />
      </mesh>
      <mesh position={[0, -0.078, 0.086]} rotation={[0.52, 0, 0]}>
        <torusGeometry args={[0.092, 0.014, 8, 22, Math.PI]} />
        <meshPhysicalMaterial color="#734a37" roughness={0.62} clearcoat={0.25} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  GLB path — real morph targets                                      */
/* ------------------------------------------------------------------ */

interface MorphTarget {
  mesh: THREE.Mesh;
  map: MorphMap;
  gaze: GazeMap;
  base: number[];
}

/** Drives one gaze axis: `pos` follows a positive offset, `neg` a negative. */
function setAxis(
  infl: number[],
  base: number[],
  amount: number,
  pos?: number,
  neg?: number
) {
  const p = Math.max(0, amount);
  const n = Math.max(0, -amount);
  if (pos !== undefined) infl[pos] = (base[pos] ?? 0) + p;
  if (neg !== undefined) infl[neg] = (base[neg] ?? 0) + n;
}

export interface MorphReport {
  /** Every morph target name the model actually carries. */
  available: string[];
  /** Channel -> the morph name that was bound to it. */
  bound: Partial<Record<keyof ExpressionVector, string>>;
  /** Channels with no compatible morph in this model. */
  missing: (keyof ExpressionVector)[];
  meshCount: number;
  headNodeName: string;
  /** Approximate head height in metres, from the model bounds. */
  height: number;
}

/** Channels that are driven on the node transform, not by morphs. */
const NON_MORPH_CHANNELS: (keyof ExpressionVector)[] = [
  "headTilt",
  "headYaw",
  "headPitch",
  "breath",
  "tension",
  "pupil",
];

function buildMorphReport(
  targets: MorphTarget[],
  headNodeName: string,
  size: THREE.Vector3
): MorphReport {
  const available: string[] = [];
  const bound: Partial<Record<keyof ExpressionVector, string>> = {};
  for (const { mesh, map } of targets) {
    const dict = mesh.morphTargetDictionary ?? {};
    Object.keys(dict).forEach((n) => available.push(n));
    for (const key of Object.keys(map) as (keyof ExpressionVector)[]) {
      const label = describeBinding(dict, map[key]);
      if (!bound[key] && label !== "?") bound[key] = label;
    }
  }
  const missing = (Object.keys(EXPRESSIONS.neutral) as (keyof ExpressionVector)[]).filter(
    (k) => !bound[k] && !NON_MORPH_CHANNELS.includes(k)
  );
  return {
    available: Array.from(new Set(available)).sort(),
    bound,
    missing,
    meshCount: targets.length,
    headNodeName,
    height: Math.max(size.x, size.y, size.z),
  };
}

/**
 * The head gets re-parented below so it can be scaled and centred, which
 * drops whatever parent chain it came with. Bake its world transform in
 * first: otherwise the rig's own scale node is measured (small bounds) but
 * not rendered, and the normalisation below divides by a size that no longer
 * applies — which is what blows the head up by ~10x.
 *
 * The detach is destructive, and the glTF is shared between mounts, so the
 * result is stashed on the scene. Without this, opening a second lobe
 * re-runs this, fails to find a head that is no longer under the scene, and
 * renders the face's teeth with nothing behind them.
 */
interface PreparedHead {
  node: THREE.Object3D;
  size: THREE.Vector3;
  center: THREE.Vector3;
  scale: number;
  targets: MorphTarget[];
}

function prepareHead(scene: THREE.Group): PreparedHead {
  const cached = scene.userData.__mindHead as PreparedHead | undefined;
  if (cached) return cached;

  let head: THREE.Object3D | null = null;
  scene.traverse((o) => {
    if (head) return;
    const n = o.name.toLowerCase();
    if (HEAD_HINTS.some((h) => n.includes(h))) head = o;
  });
  if (!head) head = scene;

  const targets: MorphTarget[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.morphTargetDictionary) return;
    targets.push({
      mesh,
      map: bindMorphs(mesh.morphTargetDictionary),
      gaze: bindGaze(mesh.morphTargetDictionary),
      base: mesh.morphTargetInfluences ? Array.from(mesh.morphTargetInfluences) : [],
    });
  });

  // The rig's own materials carry a baked skin texture; keep them. facecap's
  // albedo is a near-white clay render, which reads as a mannequin under a
  // cold key light, so tint it toward skin unless the author set a colour.
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of list) {
      if (!mat) continue;
      const tinted = mat as THREE.Material & { color?: THREE.Color };
      if (tinted.color && tinted.color.getHex() === 0xffffff) tinted.color.set("#e6c0a6");
      mat.needsUpdate = true;
    }
  });

  head.updateWorldMatrix(true, false);
  head.matrix.copy(head.matrixWorld);
  head.matrix.decompose(head.position, head.quaternion, head.scale);
  head.parent?.remove(head);

  const box = new THREE.Box3().setFromObject(head);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = HEAD_SIZE / (Math.max(size.x, size.y, size.z) || 1);

  const prepared: PreparedHead = { node: head, size, center, scale, targets };
  scene.userData.__mindHead = prepared;
  return prepared;
}

function GLBMindFace({
  url,
  mind,
  refs,
  onReport,
  upright = 1,
  still = false,
}: {
  url: string;
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  onReport?: (report: MorphReport) => void;
  /**
   * 0..1 — how much of the expression's authored head pose to keep. The
   * presets carry real tilt and yaw, which reads as character in close-up
   * but tips the portrait off vertical and makes it hard to read the face.
   * The portrait stage pulls this down; /face leaves it at full.
   */
  upright?: number;
  /**
   * Pins the head. Kills the idle sine drift and the cursor lean so the only
   * thing that changes is the expression itself — the portrait is a still
   * that reacts, not a head that wanders.
   */
  still?: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const gltf = useHeadGLTF(gl, url);
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const t = useRef(0);

  const { headNode, targets, gazeTargets, scale, offset, size } = useMemo(() => {
    const prepared = prepareHead(gltf.scene);
    return {
      headNode: prepared.node,
      targets: prepared.targets,
      gazeTargets: prepared.targets.filter((f) =>
        [f.gaze.xL, f.gaze.xR, f.gaze.yL, f.gaze.yR].some(
          (a) => a.pos !== undefined || a.neg !== undefined
        )
      ),
      scale: prepared.scale,
      offset: prepared.center.clone().multiplyScalar(-prepared.scale),
      size: prepared.size,
    };
  }, [gltf.scene]);

  const scratch = useMemo(() => new THREE.Vector3(), []);
  const held = upright;

  useEffect(() => {
    onReport?.(buildMorphReport(targets, headNode.name || "(unnamed)", size));
    // Report once per model, not per frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, headNode]);

  useFrame((_, delta) => {
    t.current += delta;
    const e = mind.current.expression;
    const asym = e.asym ?? 0;
    const lGain = THREE.MathUtils.clamp(1 - asym, 0, 1.6);
    const rGain = THREE.MathUtils.clamp(1 + asym, 0, 1.6);

    for (const { mesh, map, base } of targets) {
      const infl = mesh.morphTargetInfluences;
      if (!infl) continue;
      for (const key of Object.keys(map) as (keyof ExpressionVector)[]) {
        const binding = map[key];
        if (!binding) continue;
        const v = e[key];
        const l = binding.l ?? binding.c;
        const r = binding.r ?? binding.c;
        // A rig with genuine per-side targets takes the asymmetry; a
        // symmetric one takes the value whole, or a lopsided face would read
        // as a bug rather than a squint.
        const sided = binding.l !== undefined && binding.r !== undefined && l !== r;
        if (sided) {
          if (l !== undefined) infl[l] = (base[l] ?? 0) + v * lGain;
          if (r !== undefined) infl[r] = (base[r] ?? 0) + v * rGain;
        } else if (l !== undefined) {
          infl[l] = (base[l] ?? 0) + v;
        }
      }
    }

    // Gaze rides the same saccades the head rotation uses, so the eyes lead
    // the head the way real saccades do rather than tracking independently.
    const gx = THREE.MathUtils.clamp(mind.current.gaze.x, -1, 1);
    const gy = THREE.MathUtils.clamp(mind.current.gaze.y, -1, 1);
    for (const { mesh, gaze, base } of gazeTargets) {
      const infl = mesh.morphTargetInfluences;
      if (!infl) continue;
      // World-right is inward on the character's left eye and outward on
      // its right; vertical is the same on both.
      setAxis(infl, base, gx, gaze.xL.neg, gaze.xL.pos);
      setAxis(infl, base, gx, gaze.xR.pos, gaze.xR.neg);
      setAxis(infl, base, gy, gaze.yL.pos, gaze.yL.neg);
      setAxis(infl, base, gy, gaze.yR.pos, gaze.yR.neg);
    }

    const g = group.current;
    if (g) {
      // `held` damps the authored pose, micro-motion included — a face that
      // drifts with the saccades is the point, a face that rolls 20 degrees
      // is not. `still` removes the drift outright.
      const drift = still ? 0 : 1;
      g.rotation.y = (e.headYaw + Math.sin(t.current * 0.31) * 0.035 * drift) * held;
      g.rotation.x = e.headPitch * held + Math.sin(t.current * 1.4) * 0.008 * drift;
      g.rotation.z = e.headTilt * held + Math.sin(t.current * 0.47) * 0.01 * drift;

      if (!still) {
        // Track the visitor with a small, damped offset.
        scratch.copy(refs.current.lookAt);
        g.worldToLocal(scratch);
        g.rotation.y += THREE.MathUtils.clamp(scratch.x * 0.09, -0.05, 0.05) * held;
        g.rotation.x += THREE.MathUtils.clamp(-scratch.y * 0.07, -0.05, 0.05) * held;
      }
      g.rotation.y = THREE.MathUtils.clamp(g.rotation.y, -0.22, 0.22);
      g.rotation.x = THREE.MathUtils.clamp(g.rotation.x, -0.22, 0.22);
      g.rotation.z = THREE.MathUtils.clamp(g.rotation.z, -0.18, 0.18);
    }

    if (inner.current) {
      const a = refs.current.appearance;
      inner.current.scale.setScalar(scale * (0.88 + a * 0.12));
    }
  });

  return (
    <group ref={group}>
      <group ref={inner} position={offset}>
        <primitive object={headNode} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Procedural fallback head                                           */
/* ------------------------------------------------------------------ */

function buildHeadGeometry(widthSeg = 140, heightSeg = 100) {
  const geo = new THREE.SphereGeometry(1, widthSeg, heightSeg);
  const pos = geo.getAttribute("position");
  const n = geo.getAttribute("normal");
  const tangent = new Float32Array(pos.count * 3);
  const bitangent = new Float32Array(pos.count * 3);
  const t = new THREE.Vector3();
  const b = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < pos.count; i++) {
    nrm.fromBufferAttribute(n, i).normalize();
    t.crossVectors(up, nrm);
    if (t.lengthSq() < 1e-6) t.set(1, 0, 0);
    t.normalize();
    b.crossVectors(nrm, t).normalize();
    tangent.set(t.toArray(), i * 3);
    bitangent.set(b.toArray(), i * 3);
  }

  geo.setAttribute("aTangent", new THREE.BufferAttribute(tangent, 3));
  geo.setAttribute("aBitangent", new THREE.BufferAttribute(bitangent, 3));
  geo.deleteAttribute("uv");
  return geo;
}

const HEAD_VERT_COMMON = /* glsl */ `
  attribute vec3 aTangent;
  attribute vec3 aBitangent;

  uniform vec4 uExprA;  // browInnerUp, browOuterUp, browDown, eyeWide
  uniform vec4 uExprB;  // eyeSquint, eyeBlink, cheekRaise, noseSneer
  uniform vec4 uExprC;  // jawOpen, mouthSmile, mouthFrown, mouthPress
  uniform vec4 uExprD;  // mouthPucker, mouthFunnel, _, _

  float falloff(float d, float w) {
    return exp(-(d * d) / (w * w));
  }
  float ang(vec3 dir, vec3 landmark) {
    return 1.0 - dot(normalize(dir), normalize(landmark));
  }

  float headRadius(vec3 base) {
    vec3 d = normalize(base);

    // --- Base skull: taller than wide, deeper than wide, flattened at the back.
    vec3 axes = vec3(0.76, 1.0, 0.90);
    float r = 1.0 / length(vec3(d.x / axes.x, d.y / axes.y, d.z / axes.z));
    r -= 0.055 * smoothstep(0.1, -0.9, d.z);
    r -= 0.17 * smoothstep(-0.05, -1.0, d.y) * smoothstep(-0.35, 0.75, abs(d.x));

    // --- Cranium / forehead mass
    r += 0.030 * falloff(ang(d, vec3(0.0, 0.95, -0.10)), 0.75);

    // --- Brow ridge
    r += 0.055 * (falloff(ang(d, vec3(-0.34, 0.30, 0.80)), 0.17)
                 + falloff(ang(d, vec3( 0.34, 0.30, 0.80)), 0.17));

    // --- Eye sockets
    r -= 0.085 * (falloff(ang(d, vec3(-0.33, 0.15, 0.82)), 0.16)
                + falloff(ang(d, vec3( 0.33, 0.15, 0.82)), 0.16));

    // --- Nose: bridge, tip, wings
    r += 0.130 * (falloff(ang(d, vec3(0.0, 0.24, 0.90)), 0.16)
                 + falloff(ang(d, vec3(0.0, 0.05, 0.95)), 0.13));
    r += 0.100 * falloff(ang(d, vec3(0.0, -0.10, 0.96)), 0.11);
    r += 0.050 * (falloff(ang(d, vec3(-0.11, -0.15, 0.93)), 0.09)
                + falloff(ang(d, vec3( 0.11, -0.15, 0.93)), 0.09));

    // --- Cheekbones and the hollow beneath them
    r += 0.055 * (falloff(ang(d, vec3(-0.55, 0.02, 0.70)), 0.24)
                + falloff(ang(d, vec3( 0.55, 0.02, 0.70)), 0.24));
    r -= 0.040 * (falloff(ang(d, vec3(-0.52, -0.26, 0.66)), 0.20)
                + falloff(ang(d, vec3( 0.52, -0.26, 0.66)), 0.20));

    // --- Mouth: valley between two lips
    r -= 0.035 * falloff(ang(d, vec3(0.0, -0.345, 0.90)), 0.10);
    r += 0.030 * falloff(ang(d, vec3(0.0, -0.295, 0.92)), 0.10);
    r += 0.035 * falloff(ang(d, vec3(0.0, -0.410, 0.90)), 0.11);

    // --- Chin and jaw corners
    r += 0.050 * falloff(ang(d, vec3(0.0, -0.72, 0.55)), 0.26);
    r += 0.045 * (falloff(ang(d, vec3(-0.66, -0.48, 0.28)), 0.22)
                + falloff(ang(d, vec3( 0.66, -0.48, 0.28)), 0.22));

    // --- Ears
    r += 0.090 * (falloff(ang(d, vec3(-0.99, -0.02, -0.06)), 0.14)
                + falloff(ang(d, vec3( 0.99, -0.02, -0.06)), 0.14));

    // ===================== EXPRESSION =====================

    float browInner = falloff(ang(d, vec3(-0.20, 0.32, 0.85)), 0.13)
                    + falloff(ang(d, vec3( 0.20, 0.32, 0.85)), 0.13);
    float browOuter = falloff(ang(d, vec3(-0.46, 0.30, 0.74)), 0.16)
                    + falloff(ang(d, vec3( 0.46, 0.30, 0.74)), 0.16);
    float wholeBrow = falloff(ang(d, vec3(-0.34, 0.30, 0.80)), 0.21)
                    + falloff(ang(d, vec3( 0.34, 0.30, 0.80)), 0.21);

    // Inner brow rises; outer brow rises independently; a frown pulls both
    // down and drags the inner ends together.
    r += 0.055 * (browInner * uExprA.x + browOuter * uExprA.y - wholeBrow * uExprA.z);
    float browConverge = falloff(ang(d, vec3(-0.15, 0.31, 0.85)), 0.11)
                       + falloff(ang(d, vec3( 0.15, 0.31, 0.85)), 0.11);
    r -= 0.030 * browConverge * max(uExprA.z, 0.0);

    // Lids.
    float upperLid = falloff(ang(d, vec3(-0.33, 0.205, 0.84)), 0.125)
                   + falloff(ang(d, vec3( 0.33, 0.205, 0.84)), 0.125);
    float lowerLid = falloff(ang(d, vec3(-0.33, 0.09, 0.84)), 0.125)
                   + falloff(ang(d, vec3( 0.33, 0.09, 0.84)), 0.125);
    r += 0.050 * upperLid * (uExprA.w - uExprB.y * 1.35);
    r += 0.035 * lowerLid * uExprB.x;
    r -= 0.022 * (upperLid + lowerLid) * uExprB.y;

    // Duchenne cheek raise tucks the lower lid up under the cheekbone.
    r += 0.040 * (falloff(ang(d, vec3(-0.44, 0.02, 0.80)), 0.14)
                + falloff(ang(d, vec3( 0.44, 0.02, 0.80)), 0.14)) * uExprB.z;

    // Nose wrinkle.
    r += 0.022 * falloff(ang(d, vec3(0.0, -0.18, 0.93)), 0.14) * uExprB.w;

    // Jaw drop.
    float jawRegion = smoothstep(-0.26, -0.72, d.y) * smoothstep(-0.35, 0.5, d.z);
    r += 0.150 * jawRegion * uExprC.x;

    // Smile / frown at the corners.
    float cornerL = falloff(ang(d, vec3(-0.19, -0.35, 0.88)), 0.11);
    float cornerR = falloff(ang(d, vec3( 0.19, -0.35, 0.88)), 0.11);
    r += 0.055 * (cornerL + cornerR) * uExprC.y;
    r -= 0.035 * (cornerL + cornerR) * uExprC.z;
    r -= 0.015 * falloff(ang(d, vec3(0.0, -0.52, 0.82)), 0.16) * uExprC.z;

    // Lips pressed, puckered, funnelled.
    float lips = falloff(ang(d, vec3(0.0, -0.35, 0.90)), 0.15);
    r -= 0.040 * lips * uExprC.w;
    r += 0.075 * lips * uExprD.x;
    r += 0.050 * lips * uExprD.y;
    r -= 0.018 * (cornerL + cornerR) * (uExprD.x + uExprD.y);

    return r;
  }

  vec3 place(vec3 base) {
    return normalize(base) * headRadius(base);
  }
`;

function ProceduralMindFace({
  mind,
  refs,
}: {
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
}) {
  const group = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const geometry = useMemo(() => buildHeadGeometry(), []);
  const t = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      uExprA: { value: new THREE.Vector4() },
      uExprB: { value: new THREE.Vector4() },
      uExprC: { value: new THREE.Vector4() },
      uExprD: { value: new THREE.Vector4() },
    }),
    []
  );

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${HEAD_VERT_COMMON}`)
        .replace(
          "#include <beginnormal_vertex>",
          /* glsl */ `
          vec3 sphN = normalize(position);
          vec3 dirP = place(sphN);
          vec3 dirT = place(normalize(position + aTangent * 0.025));
          vec3 dirB = place(normalize(position + aBitangent * 0.025));
          vec3 objectNormal = cross(dirT - dirP, dirB - dirP);
          objectNormal *= -sign(dot(objectNormal, sphN));
          objectNormal = normalize(objectNormal);
          `
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          vec3 transformed = place(normalize(position));
          `
        );
    };
    mat.needsUpdate = true;
  }, [uniforms]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    t.current += delta;
    const e = mind.current.expression;
    const dt = Math.min(delta, 0.05);

    uniforms.uExprA.value.set(e.browInnerUp, e.browOuterUp, e.browDown, e.eyeWide);
    uniforms.uExprB.value.set(e.eyeSquint, e.eyeBlink, e.cheekRaise, e.noseSneer);
    uniforms.uExprC.value.set(e.jawOpen, e.mouthSmile, e.mouthFrown, e.mouthPress);
    uniforms.uExprD.value.set(e.mouthPucker, e.mouthFunnel, 0, 0);

    const g = group.current;
    if (g) {
      g.rotation.y = e.headYaw + Math.sin(t.current * 0.31) * 0.035;
      g.rotation.x = e.headPitch + Math.sin(t.current * 1.4) * 0.01;
      g.rotation.z = e.headTilt + Math.sin(t.current * 0.47) * 0.014;

      scratch.copy(refs.current.lookAt);
      g.worldToLocal(scratch);
      g.rotation.y += THREE.MathUtils.clamp(scratch.x * 0.06, -0.04, 0.04);
      g.rotation.x += THREE.MathUtils.clamp(-scratch.y * 0.05, -0.035, 0.035);
      g.rotation.y = THREE.MathUtils.clamp(g.rotation.y, -0.6, 0.6);
      g.rotation.x = THREE.MathUtils.clamp(g.rotation.x, -0.6, 0.6);
    }

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.05 + mind.current.settle * 0.1;
    }
  });

  return (
    <group ref={group} scale={0.6}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={materialRef}
          color="#8a5740"
          roughness={0.6}
          metalness={0}
          clearcoat={0.3}
          clearcoatRoughness={0.62}
          sheen={0.45}
          sheenColor="#d8a07a"
          sheenRoughness={0.9}
          emissive="#2a0f06"
          emissiveIntensity={0.08}
        />
      </mesh>

      <EyeUnit position={[-0.255, 0.145, 0.50]} mind={mind} look={look} />
      <EyeUnit position={[0.255, 0.145, 0.50]} mind={mind} look={look} />
    </group>
  );
}

/* ------------------------------------------------------------------ */

export default function MindFace({
  mind,
  refs,
  modelUrl,
  onReport,
  upright = 1,
  still = false,
}: {
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  modelUrl: string | null;
  onReport?: (report: MorphReport) => void;
  /**
   * 0..1 — how much of the expression's authored head pose to keep. The
   * presets carry real tilt and yaw, which reads as character in close-up
   * but tips the portrait off vertical and makes it hard to read the face.
   * The portrait stage pulls this down; /face leaves it at full.
   */
  upright?: number;
  /** Pins the head — no idle drift, no cursor lean. */
  still?: boolean;
}) {
  if (modelUrl) {
    return (
      <GLBMindFace
        url={modelUrl}
        mind={mind}
        refs={refs}
        onReport={onReport}
        upright={upright}
        still={still}
      />
    );
  }
  return <ProceduralMindFace mind={mind} refs={refs} />;
}