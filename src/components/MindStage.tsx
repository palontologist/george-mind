"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import MindFace, { useHeadModel, HEAD_MODEL_URL } from "./MindFace";
import { createMindState, useMindDriver, type MindState } from "../lib/useMindDriver";
import { createWorldRefs, type WorldRefs } from "../lib/world";
import type { ExpressionKey } from "../lib/expressions";

/**
 * The portrait: your face, and nothing else competing with it.
 *
 * No world, no walking, no blob overhead. The head is centred, held vertical,
 * and big enough that an eyebrow is legible — which is the entire point, so
 * everything else got out of the way.
 *
 * Framing is expressed as fractions of the viewport height so it holds from a
 * phone to an ultrawide without a separate layout.
 */

/**
 * Framing.
 *
 * The head is measured, not assumed: whatever the .glb actually measures at
 * unit scale, the stage divides through it so the face fills the frame. A
 * fixed multiplier bakes in one model's proportions and leaves the next one
 * (and every phone) looking like a thumbnail hovering in an empty room.
 *
 * `FRAME_H` is the fraction of the frame height the head may occupy, and
 * `FRAME_W` the fraction of its width — whichever binds first wins, so an
 * ultrawide gets a monumental crop and a phone still gets a whole head.
 */
const FRAME_H = 0.95;
const FRAME_W = 0.8;
/**
 * The head sits slightly above the centre of the frame. The model's bounds
 * carry a neck below the chin, so the geometric centre of the head is lower
 * than the centre of the face — aiming at the bounds puts the jaw off the
 * bottom edge.
 */
const FACE_Y = 0.03;
/**
 * How much of the expression's authored head pose to keep. The presets roll
 * and yaw up to ~20 degrees, which reads as character in a close-up and as
 * "broken" when you are trying to read the expression.
 */
const UPRIGHT = 0.3;

interface MindStageProps {
  emotion: ExpressionKey;
  /** Lifts the face a hair while you are choosing. */
  emphasis: number;
}

export default function MindStage({ emotion, emphasis }: MindStageProps) {
  const mind = useRef<MindState>(createMindState());
  const refs = useRef<WorldRefs>(createWorldRefs());

  const emotionRef = useRef<ExpressionKey>(emotion);
  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  const emphasisRef = useRef(emphasis);
  useEffect(() => {
    emphasisRef.current = emphasis;
  }, [emphasis]);

  const head = useHeadModel(HEAD_MODEL_URL);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0, 0, 2.4], fov: 38, near: 0.1, far: 60 }}
      style={{ background: "transparent" }}
    >
      <Contents
        mind={mind}
        refs={refs}
        modelUrl={head.url}
        emphasisRef={emphasisRef}
        emotionRef={emotionRef}
      />
    </Canvas>
  );
}

function Contents({
  mind,
  refs,
  modelUrl,
  emphasisRef,
  emotionRef,
}: {
  mind: React.MutableRefObject<MindState>;
  refs: React.MutableRefObject<WorldRefs>;
  modelUrl: string | null;
  emphasisRef: React.MutableRefObject<number>;
  emotionRef: React.MutableRefObject<ExpressionKey>;
}) {
  const { viewport } = useThree();
  const face = useRef<THREE.Group>(null);
  const box = useMemo(() => new THREE.Box3(), []);

  // Blinks, saccades, breathing, and the emotion settling in. These live in
  // the expression vector, not in the head's transform.
  useMindDriver(mind, emotionRef);

  // The head's own height at unit scale. Measured once per model/resize,
  // because it is a property of the .glb, not of the frame.
  const unitHeight = useRef(0);
  useEffect(() => {
    unitHeight.current = 0;
  }, [modelUrl, viewport.width, viewport.height]);

  const wanted = Math.min(viewport.height * FRAME_H, viewport.width * FRAME_W);

  // Park the gaze straight ahead, once. No pointer parallax — the head holds
  // a single point and only its expression changes.
  useEffect(() => {
    refs.current.lookAt.set(0, viewport.height * FACE_Y, -2.4);
    // Re-park on resize so a layout change never leaves it aimed sideways.
  }, [refs, viewport.height]);

  useFrame((_, delta) => {
    const f = face.current;
    if (!f) return;

    // Measure at unit scale, then fit. Two frames at most, then it holds.
    if (unitHeight.current <= 0) {
      f.scale.setScalar(1);
      f.updateWorldMatrix(true, true);
      box.setFromObject(f, true);
      unitHeight.current = Math.max(box.max.y - box.min.y, 1e-6);
    }

    const faceScale = wanted / unitHeight.current;

    // Scales off the framing value, not off 1 — writing an absolute scale
    // here silently discards the size this component computed.
    const want = faceScale * (1 + emphasisRef.current * 0.03);
    const next = f.scale.x + (want - f.scale.x) * (1 - Math.exp(-6 * delta));
    f.scale.setScalar(next);
  });

  return (
    <>
      <group position={[0, viewport.height * FACE_Y, 0]}>
        <group ref={face}>
          <MindFace mind={mind} refs={refs} modelUrl={modelUrl} upright={UPRIGHT} still />
        </group>
      </group>

      {/* Lit for reading, not for mood: the whole point is that you can see
          what the face is doing. */}
      <ambientLight intensity={0.6} color="#dfe9ff" />
      <hemisphereLight args={["#cfe6ff", "#1a1410", 0.65]} />
      <spotLight
        position={[1.7, 2.3, 2.3]}
        angle={0.62}
        penumbra={1}
        intensity={17}
        color="#fff3e6"
      />
      <spotLight
        position={[-1.9, 0.9, 1.5]}
        angle={0.85}
        penumbra={1}
        intensity={8}
        color="#8ab4ff"
      />
      <pointLight position={[0, -0.9, -1.2]} intensity={2.8} color="#ffb488" />
      {/* Rim from behind picks the head off the background. */}
      <pointLight position={[0.6, 1.4, -2.4]} intensity={5} color="#7dd3fc" distance={9} />
    </>
  );
}
