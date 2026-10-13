"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import MindFace, {
  HEAD_MODEL_URL,
  useHeadModel,
  type MorphReport,
} from "./MindFace";
import {
  EXPRESSIONS,
  EXPRESSION_KEYS,
  MORPH_LOOKUP,
  type ExpressionKey,
  type ExpressionVector,
} from "../lib/expressions";
import { createWorldRefs } from "../lib/world";
import { createMindState, type MindState } from "../lib/useMindDriver";

/** Every slider the lab exposes, with its range and label. */
const CHANNELS: {
  key: keyof ExpressionVector;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "browInnerUp", label: "Brow inner", min: -1, max: 1 },
  { key: "browOuterUp", label: "Brow outer", min: -1, max: 1 },
  { key: "browDown", label: "Brow down", min: 0, max: 1 },
  { key: "eyeWide", label: "Eye wide", min: -1, max: 1 },
  { key: "eyeSquint", label: "Eye squint", min: 0, max: 1 },
  { key: "eyeBlink", label: "Blink", min: 0, max: 1 },
  { key: "cheekRaise", label: "Cheek raise", min: 0, max: 1 },
  { key: "cheekPuff", label: "Cheek puff", min: 0, max: 1 },
  { key: "noseSneer", label: "Nose sneer", min: 0, max: 1 },
  { key: "jawOpen", label: "Jaw open", min: 0, max: 1 },
  { key: "mouthSmile", label: "Mouth smile", min: 0, max: 1 },
  { key: "mouthFrown", label: "Mouth frown", min: 0, max: 1 },
  { key: "mouthPress", label: "Mouth press", min: -1, max: 1 },
  { key: "mouthPucker", label: "Mouth pucker", min: 0, max: 1 },
  { key: "mouthFunnel", label: "Mouth funnel", min: 0, max: 1 },
  { key: "headTilt", label: "Head tilt", min: -1, max: 1 },
  { key: "headYaw", label: "Head yaw", min: -1, max: 1 },
  { key: "headPitch", label: "Head pitch", min: -1, max: 1 },
  { key: "tension", label: "Tension", min: 0, max: 1 },
  { key: "pupil", label: "Pupil", min: 0, max: 1 },
];

/** Injects the lab's live channel values into the shared mind state. */
function ExpressionInjector({
  mind,
  values,
  auto,
  onPreset,
}: {
  mind: React.MutableRefObject<MindState>;
  values: ExpressionVector;
  auto: boolean;
  onPreset: ExpressionKey | null;
}) {
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += Math.min(delta, 0.05);
    const e = mind.current.expression;
    const goal = onPreset ? EXPRESSIONS[onPreset] : values;

    for (const { key } of CHANNELS) {
      const target = goal[key] ?? 0;
      e[key] += (target - e[key]) * (1 - Math.exp(-9 * delta));
    }
    // Blink is driven by a manual loop when the slider is off.
    if (auto) {
      const cycle = (t.current * 0.42) % 6;
      e.eyeBlink = cycle < 0.12 ? Math.sin((cycle / 0.12) * Math.PI) : 0;
    }
  });

  return null;
}

export default function FaceLab() {
  const mind = useRef<MindState>(createMindState());
  const refs = useRef(createWorldRefs());
  const head = useHeadModel(HEAD_MODEL_URL);

  const [values, setValues] = useState<ExpressionVector>({ ...EXPRESSIONS.neutral });
  const [preset, setPreset] = useState<ExpressionKey | null>("joy");
  const [auto, setAuto] = useState(true);
  const [report, setReport] = useState<MorphReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const set = (key: keyof ExpressionVector, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setPreset(null);
    setAuto(false);
  };

  const loading = !head.checked;

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0c] text-zinc-100">
      {/* ---------------- viewport ---------------- */}
      <div className="relative flex-1">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0.05, 1.15], fov: 35 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#0a0a0c"]} />

          {/* Studio rig so skin and materials read properly. */}
          <ambientLight intensity={0.45} />
          <hemisphereLight args={["#cfe6ff", "#1a1410", 0.5]} />
          <spotLight
            position={[2.2, 3, 3]}
            angle={0.5}
            penumbra={1}
            intensity={22}
            color="#fff3e6"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <spotLight position={[-2.6, 1, 2]} angle={0.7} penumbra={1} intensity={9} color="#8ab4ff" />
          <pointLight position={[0, -1, -2]} intensity={5} color="#ffb488" />

          <MindFace
            mind={mind}
            refs={refs}
            modelUrl={head.url}
            onReport={setReport}
          />

          <ExpressionInjector mind={mind} values={values} auto={auto} onPreset={preset} />

          <ContactShadows position={[0, -1.1, 0]} opacity={0.55} scale={5} blur={2.5} far={3} />
          <OrbitControls
            enablePan={false}
            minDistance={0.6}
            maxDistance={3}
            target={[0, 0, 0]}
            makeDefault
          />
        </Canvas>

        <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur">
          <p className="text-zinc-200">
            {loading ? "loading…" : head.url ? "GLB model" : "procedural fallback"}
          </p>
          {report && (
            <p className="mt-1 text-zinc-500">
              {report.meshCount} meshes · {report.available.length} morphs
            </p>
          )}
        </div>

        {report && (
          <button
            onClick={() => setShowReport((v) => !v)}
            className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
          >
            {showReport ? "hide" : "show"} morph map
          </button>
        )}
      </div>

      {/* ---------------- controls ---------------- */}
      <aside className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#0d0d10]">
        <header className="border-b border-white/10 p-5">
          <h1 className="text-lg font-light">Face Lab</h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Tune the expression engine against your head model. Drop the file at{" "}
            <code className="text-cyan-400/80">{HEAD_MODEL_URL}</code>.
          </p>
        </header>

        {showReport && report && <MorphMap report={report} />}

        <section className="border-b border-white/10 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Presets
            </h2>
            <button
              onClick={() => {
                setPreset(null);
                setAuto(false);
              }}
              className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-600 transition-colors hover:text-cyan-400"
            >
              manual
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {EXPRESSION_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => {
                  setPreset(key);
                  setAuto(true);
                }}
                className={`rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  preset === key && auto
                    ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200"
                    : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </section>

        <section className="flex-1 space-y-3 p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Channels
          </h2>
          {CHANNELS.map(({ key, label, min, max }) => (
            <label key={key} className="block">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-zinc-400">{label}</span>
                <span className="font-mono text-[10px] text-zinc-600">
                  {(preset && auto ? EXPRESSIONS[preset][key] : values[key]).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={0.01}
                value={preset && auto ? EXPRESSIONS[preset][key] : values[key]}
                onChange={(e) => set(key, parseFloat(e.target.value))}
                className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
              />
              <span className="font-mono text-[8px] text-zinc-700">
                {MORPH_LOOKUP[key]?.[0] ?? "node transform"}
              </span>
            </label>
          ))}
        </section>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MorphMap({ report }: { report: MorphReport }) {
  const rows = useMemo(
    () =>
      (Object.keys(EXPRESSIONS.neutral) as (keyof ExpressionVector)[]).map((key) => ({
        key,
        bound: report.bound[key] ?? null,
      })),
    [report]
  );

  return (
    <section className="border-b border-white/10 bg-black/30 p-5">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        Morph map · {report.headNodeName}
      </h2>

      <div className="mt-3 space-y-1">
        {rows.map(({ key, bound }) => (
          <div key={key} className="flex items-baseline gap-2 text-[11px]">
            <span className="w-28 shrink-0 font-mono text-zinc-600">{key}</span>
            <span
              className={
                bound
                  ? "truncate font-mono text-emerald-400/80"
                  : "font-mono text-amber-500/60"
              }
            >
              {bound ?? "— no match —"}
            </span>
          </div>
        ))}
      </div>

      {report.missing.length > 0 && (
        <p className="mt-3 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] leading-relaxed text-amber-300/80">
          {report.missing.length} channel(s) have no matching morph:{" "}
          {report.missing.join(", ")}. These channels drive the procedural head only —
          rename or add them in your model, or they will have no visible effect.
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600 hover:text-zinc-400">
          {report.available.length} morph targets in model
        </summary>
        <p className="mt-2 max-h-40 overflow-y-auto font-mono text-[10px] leading-relaxed text-zinc-600">
          {report.available.join(", ") || "none — this model has no morph targets"}
        </p>
      </details>
    </section>
  );
}