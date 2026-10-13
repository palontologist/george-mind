"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";

import FirstPersonRig from "./FirstPersonRig";
import MindBrain from "./MindBrain";
import MindFace, { useHeadModel, HEAD_MODEL_URL } from "./MindFace";
import {
  CavernShell,
  ConnectomeFilaments,
  NeuralFloor,
  NeuronCloud,
  SynapseCore,
} from "./NeuralWorld";
import { createMindState, useMindDriver, type MindState } from "../lib/useMindDriver";
import { createWorldRefs, type WorldRefs } from "../lib/world";
import { placeLobes, WORLD_RADIUS, type PlacedLobe } from "../lib/layout";
import { AURAS, type ExpressionKey } from "../lib/expressions";
import type { Lobe } from "../types/connectome";

export type Quality = "high" | "balanced" | "performance";

interface MindSceneProps {
  activeLobeId: string | null;
  /** Hovered project within the active lobe, or -1. Drives the brain's focus. */
  activeNodeIndex?: number;
  emotion: ExpressionKey;
  onSelect: (lobe: Lobe) => void;
  onHover: (lobe: Lobe | null) => void;
  quality: Quality;
  onFrame?: (refs: WorldRefs) => void;
}

/* ------------------------------------------------------------------ */
/*  Face stage                                                         */
/* ------------------------------------------------------------------ */

function FaceStage({
  lobe,
  mind,
  refs,
  modelUrl,
}: {
  lobe: PlacedLobe;
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  modelUrl: string | null;
}) {
  const group = useRef<THREE.Group>(null);
  const face = useRef<THREE.Group>(null);
  const backdrop = useRef<THREE.Mesh>(null);
  const key = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const bounce = useRef<THREE.AmbientLight>(null);
  const scratch = useMemo(() => new THREE.Color(), []);
  const scratch2 = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const state = mind.current;
    const v = refs.current.appearance;
    const ease = 1 - Math.exp(-4 * delta);

    if (face.current) {
      // MindFace normalises the head to a real 0.42m, which at reading
      // distance is a few dozen pixels. This is a monument, not a mannequin —
      // scale it up until the expression is actually legible.
      face.current.scale.setScalar(4.0 + v * 2.5);
    }
    if (backdrop.current) {
      const m = backdrop.current.material as THREE.ShaderMaterial;
      m.uniforms.uTime.value = clock.elapsedTime;
      m.uniforms.uReveal.value += (v - m.uniforms.uReveal.value) * ease;
      m.uniforms.uColor.value.lerp(state.color, 1 - Math.exp(-3 * delta));
    }

    const flicker = 0.94 + 0.06 * Math.sin(clock.elapsedTime * 3.1);
    if (key.current) {
      key.current.color.lerp(state.color, 1 - Math.exp(-3 * delta));
      key.current.intensity = v * 34 * flicker;
    }
    if (fill.current) {
      scratch2.set(state.aura.fillColor);
      fill.current.color.lerp(scratch2, 1 - Math.exp(-3 * delta));
      fill.current.intensity = v * 13;
    }
    if (rim.current) {
      scratch.copy(state.color);
      rim.current.color.lerp(scratch, 1 - Math.exp(-3 * delta));
      rim.current.intensity = v * 26;
    }
    if (bounce.current) {
      bounce.current.color.lerp(state.color, 1 - Math.exp(-3 * delta));
      bounce.current.intensity = v * 0.5;
    }
  });

  return (
    <group ref={group} position={lobe.stagePosition}>
      {/* Holographic veil the face resolves out of */}
      <mesh ref={backdrop} position={[0, 0.1, -1.1]}>
        <planeGeometry args={[9, 11]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={{
            uTime: { value: 0 },
            uReveal: { value: 0 },
            uColor: { value: new THREE.Color(lobe.color) },
          }}
          vertexShader={VEIL_VERT}
          fragmentShader={VEIL_FRAG}
        />
      </mesh>

      {/* facecap.glb already faces +Z, which is the side a visitor walking in
          from the centre of the cavern is on. */}
      <group ref={face}>
        <MindFace mind={mind} refs={refs} modelUrl={modelUrl} />
      </group>

      {/* Three-point rig that follows the active emotion */}
      <spotLight
        ref={key}
        position={[3.4, 3.2, 4.4]}
        angle={0.75}
        penumbra={0.92}
        intensity={0}
        color="#ffffff"
        distance={40}
        decay={2}
      />
      <pointLight
        ref={fill}
        position={[-4.2, -1.2, 3.4]}
        intensity={0}
        color="#1e3a5f"
        distance={30}
      />
      <pointLight
        ref={rim}
        position={[-1.8, 3.4, -5.0]}
        intensity={0}
        color={lobe.color}
        distance={34}
      />
      <ambientLight ref={bounce} intensity={0} color={lobe.color} />
    </group>
  );
}

const VEIL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const VEIL_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uColor;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

  void main() {
    vec2 p = vUv - 0.5;

    // Elliptical falloff around the head.
    float d = length(vec2(p.x * 1.15, p.y * 0.85)) * 2.0;
    float mask = smoothstep(1.0, 0.15, d);

    // Horizontal scan sweep that resolves upward as the face appears.
    float sweep = fract(uTime * 0.14);
    float band = smoothstep(0.0, 0.03, sweep - vUv.y + 0.02)
               * smoothstep(0.14, 0.06, sweep - vUv.y);
    float reveal = smoothstep(0.0, 0.35, uReveal + band * 0.55);

    // Grain + faint interference lines.
    float grain = hash(floor(vUv * 220.0) + floor(uTime * 14.0)) * 0.16;
    float lines = sin(vUv.y * 260.0 + uTime * 1.4) * 0.5 + 0.5;

    float a = mask * reveal * (0.11 + lines * 0.05 + grain) * uReveal;
    vec3 col = uColor * (1.1 + band * 2.4);
    gl_FragColor = vec4(col, a);
  }
`;

/* ------------------------------------------------------------------ */
/*  Atmosphere                                                         */
/* ------------------------------------------------------------------ */

function Atmosphere({
  mind,
  quality,
}: {
  mind: React.MutableRefObject<MindState>;
  quality: Quality;
}) {
  const { scene } = useThree();
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const core = useRef<THREE.PointLight>(null);

  useFrame(({ clock }, delta) => {
    const state = mind.current;
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.density += (state.aura.fogDensity - fog.density) * (1 - Math.exp(-2 * delta));
    }
    if (ambient.current) {
      ambient.current.intensity = 0.14 + state.aura.lightIntensity * 0.1;
      ambient.current.color.lerp(state.color, 1 - Math.exp(-1.5 * delta));
    }
    if (key.current) {
      key.current.color.lerp(state.color, 1 - Math.exp(-1.5 * delta));
      key.current.intensity = 0.3 + state.aura.lightIntensity * 0.3;
    }
    if (core.current) {
      // The central thalamus throbs with the current heart rate.
      const bpm = state.aura.bpm;
      const beat = Math.pow(Math.sin(clock.elapsedTime * (bpm / 60) * Math.PI * 2) * 0.5 + 0.5, 3);
      core.current.color.lerp(state.color, 1 - Math.exp(-1.5 * delta));
      core.current.intensity = 4 + beat * 14;
    }
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.22} color="#4a6f96" />
      <directionalLight ref={key} position={[8, 14, 6]} intensity={0.5} color="#8ab4d8" />
      <hemisphereLight args={["#1d3a58", "#04060a", 0.35]} />
      <pointLight
        ref={core}
        position={[0, 2.2, 0]}
        intensity={8}
        distance={26}
        decay={2}
        color="#7dd3fc"
      />
      {quality === "high" ? <pointLight position={[0, 12, 0]} intensity={20} distance={40} color="#cfe9ff" /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Post-processing                                                    */
/* ------------------------------------------------------------------ */

function Effects({ mind, quality }: { mind: React.MutableRefObject<MindState>; quality: Quality }) {
  const caOffset = useMemo(() => new THREE.Vector2(0.0006, 0.0004), []);

  useFrame((_, delta) => {
    const s = mind.current;
    caOffset.set(
      0.0003 + s.aura.bpm * 0.0000014 + s.expression.eyeBlink * 0.0009,
      0.0002 + s.expression.eyeBlink * 0.0012
    );
    void delta;
  });

  if (quality === "performance") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.24}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.72}
        />
        <Vignette offset={0.28} darkness={0.85} eskil={false} />
        <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 2} enableNormalPass={false}>
      <Bloom
        intensity={1.1}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.35}
        mipmapBlur
        radius={0.8}
      />
      {/* focusDistance is normalised against the camera's near-far span, and
          the cavern is ~26 units deep with lobes read from 8-15 units out.
          The old 0.011 put the sharp plane at ~2.5 units — arm's length —
          so every face and brain the visitor actually walks up to was
          rendered through the blur. 0.045 lands it at ~10 units. */}
      <DepthOfField focusDistance={0.045} focalLength={0.06} bokehScale={0.9} height={480} />
      <ChromaticAberration
        offset={caOffset}
        radialModulation
        modulationOffset={0.4}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette offset={0.22} darkness={0.92} eskil={false} />
      <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
      {quality === "high" ? <SMAA /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene contents                                                     */
/* ------------------------------------------------------------------ */

function SceneContents({
  activeLobeId,
  activeNodeIndex,
  emotion,
  onSelect,
  onHover,
  quality,
  mind,
  lobes,
  refs,
  onFrame,
}: {
  activeLobeId: string | null;
  activeNodeIndex: number;
  emotion: ExpressionKey;
  onSelect: (lobe: Lobe) => void;
  onHover: (lobe: Lobe | null) => void;
  quality: Quality;
  mind: React.MutableRefObject<MindState>;
  lobes: PlacedLobe[];
  refs: React.MutableRefObject<WorldRefs>;
  onFrame?: (refs: WorldRefs) => void;
}) {
  const emotionRef = useRef<ExpressionKey>(emotion);
  const head = useHeadModel(HEAD_MODEL_URL);
  const frameCount = useRef(0);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  useEffect(() => {
    refs.current.activeId = activeLobeId;
  }, [activeLobeId, refs]);

  // The brain reads this to move its light onto the project being hovered.
  useEffect(() => {
    refs.current.activeNodeIndex = activeNodeIndex;
  }, [activeNodeIndex, refs]);

  useMindDriver(mind, emotionRef);

  useFrame(({ camera }) => {
    const r = refs.current;
    const active = activeLobeId ? lobes.find((l) => l.id === activeLobeId) : null;

    // Where the visitor is looking, flattened to head height.
    const dir = camera.getWorldDirection(SCAN_DIR);
    r.lookAt.set(
      camera.position.x + dir.x * 10,
      camera.position.y + dir.y * 10,
      camera.position.z + dir.z * 10
    );

    for (const lobe of lobes) {
      const d = camera.position.distanceTo(lobe.worldPosition);
      // Reaches well past the core. The face and the brain are staged for a
      // reading distance of ~8 units, so proximity has to still be paying
      // off there or the visitor gets a half-formed face for their trouble.
      r.proximity[lobe.id] = THREE.MathUtils.clamp(1 - (d - 4) / 12, 0, 1);
    }

    const targetAppearance = active ? 0.45 + r.proximity[active.id] * 0.55 : 0;
    r.appearance += (targetAppearance - r.appearance) * 0.06;

    // Report the nearest lobe to the HUD without re-rendering the tree.
    if (frameCount.current++ % 6 === 0) onFrame?.(r);
  });

  const activePlaced = activeLobeId ? (lobes.find((l) => l.id === activeLobeId) ?? null) : null;

  return (
    <>
      <fogExp2 attach="fog" args={["#04070d", AURAS.neutral.fogDensity]} />
      <Atmosphere mind={mind} quality={quality} />
      <CavernShell mind={mind} />
      <NeuralFloor />
      <NeuronCloud mind={mind} count={quality === "performance" ? 1600 : 5200} />
      <ConnectomeFilaments lobes={lobes} mind={mind} />

      {lobes.map((lobe) => (
        <SynapseCore
          key={lobe.id}
          lobe={lobe}
          mind={mind}
          refs={refs}
          active={lobe.id === activeLobeId}
          onSelect={() => onSelect(lobe)}
          onHover={(h) => onHover(h ? lobe : null)}
        />
      ))}

      {activePlaced ? (
        <FaceStage
          key={activePlaced.id}
          lobe={activePlaced}
          mind={mind}
          refs={refs}
          modelUrl={head.url}
        />
      ) : null}

      <MindBrain
        lobes={lobes}
        mind={mind}
        refs={refs}
        detail={quality === "performance" ? 4 : quality === "balanced" ? 5 : 6}
        regionLabel={activePlaced?.region?.label ?? null}
      />

      <FirstPersonRig enabled />
      <Effects mind={mind} quality={quality} />
    </>
  );
}

const SCAN_DIR = new THREE.Vector3();

/* ------------------------------------------------------------------ */

export default function MindScene({
  activeLobeId,
  activeNodeIndex = -1,
  emotion,
  onSelect,
  onHover,
  quality,
  onFrame,
}: MindSceneProps) {
  const mind = useRef<MindState>(createMindState());
  const lobes = useMemo(() => placeLobes(), []);
  const refs = useRef<WorldRefs>(createWorldRefs());

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={quality === "high" ? [1, 2] : [1, 1.5]}
        gl={{
          antialias: quality === "high",
          powerPreference: "high-performance",
          toneMapping: THREE.NoToneMapping,
          stencil: false,
        }}
        camera={{ position: [0, 1.68, WORLD_RADIUS * 0.82], fov: 68, near: 0.1, far: 220 }}
        shadows={quality === "high"}
      >
        <SceneContents
          activeLobeId={activeLobeId}
          activeNodeIndex={activeNodeIndex}
          emotion={emotion}
          onSelect={onSelect}
          onHover={onHover}
          quality={quality}
          mind={mind}
          lobes={lobes}
          refs={refs}
          onFrame={onFrame}
        />
      </Canvas>
    </div>
  );
}

export type { WorldRefs };