/**
 * Expression engine.
 *
 * A single canonical vector describes a face. Every renderer in the app
 * (GLB morph targets, the procedural fallback head, light rigs, post
 * processing, audio) reads from this one vector, so swapping the face
 * never desyncs the rest of the experience.
 */

export interface ExpressionVector {
  browInnerUp: number;
  browOuterUp: number;
  browDown: number;
  eyeWide: number;
  eyeSquint: number;
  eyeBlink: number;
  cheekRaise: number;
  cheekPuff: number;
  noseSneer: number;
  jawOpen: number;
  mouthSmile: number;
  mouthFrown: number;
  mouthPress: number;
  mouthPucker: number;
  mouthFunnel: number;
  headTilt: number;
  headYaw: number;
  headPitch: number;
  breath: number;
  tension: number;
  pupil: number;
  /**
   * -1..1 left/right imbalance for rigs that carry per-side morph targets
   * (ARKit `_L`/`_R`, MetaHuman `Left`/`Right`). 0 is a symmetrical face;
   * positive pushes the expression onto the right half. Rigs without
   * side-specific targets ignore it.
   */
  asym: number;
}

export type ExpressionKey =
  | "neutral"
  | "focus"
  | "contemplation"
  | "joy"
  | "energy"
  | "grit"
  | "wonder"
  | "warmth"
  | "doubt";

const vec = (p: Partial<ExpressionVector>): ExpressionVector => ({
  browInnerUp: 0,
  browOuterUp: 0,
  browDown: 0,
  eyeWide: 0,
  eyeSquint: 0,
  eyeBlink: 0,
  cheekRaise: 0,
  cheekPuff: 0,
  noseSneer: 0,
  jawOpen: 0,
  mouthSmile: 0,
  mouthFrown: 0,
  mouthPress: 0,
  mouthPucker: 0,
  mouthFunnel: 0,
  headTilt: 0,
  headYaw: 0,
  headPitch: 0,
  breath: 0.18,
  tension: 0.1,
  pupil: 0.5,
  asym: 0,
  ...p,
});

/**
 * Emotion presets. Tuned against FACS (Facial Action Coding System)
 * action units so the expressions read as genuine rather than cartoonish.
 */
export const EXPRESSIONS: Record<ExpressionKey, ExpressionVector> = {
  neutral: vec({
    headPitch: -0.04,
    breath: 0.16,
    tension: 0.08,
    pupil: 0.5,
  }),

  // Locked in. Eyebrows draw together and slightly down, eyes narrow,
  // lips press flat. Almost no movement outside the brow.
  focus: vec({
    browInnerUp: -0.1,
    browOuterUp: -0.32,
    browDown: 0.62,
    eyeSquint: 0.42,
    eyeWide: -0.2,
    mouthPress: 0.44,
    mouthFrown: 0.12,
    jawOpen: -0.12,
    noseSneer: 0.1,
    headPitch: 0.18,
    headYaw: -0.06,
    breath: 0.22,
    tension: 0.86,
    pupil: 0.28,
  }),

  // Chin down, eyes scanning, brows relaxed but high inner. Lips parted.
  contemplation: vec({
    browInnerUp: 0.46,
    browOuterUp: 0.18,
    browDown: -0.24,
    eyeWide: 0.12,
    eyeSquint: 0.08,
    mouthPress: 0.16,
    jawOpen: 0.16,
    headPitch: 0.34,
    headTilt: 0.18,
    headYaw: 0.22,
    breath: 0.14,
    tension: 0.3,
    pupil: 0.62,
  }),

  // Duchenne smile: cheek raise carries the eyes, not just the mouth.
  joy: vec({
    browInnerUp: 0.2,
    browOuterUp: -0.12,
    eyeSquint: 0.56,
    eyeWide: -0.34,
    cheekRaise: 0.82,
    mouthSmile: 0.88,
    jawOpen: 0.3,
    mouthFunnel: 0.12,
    headPitch: -0.12,
    headTilt: 0.1,
    breath: 0.26,
    tension: 0.06,
    pupil: 0.44,
  }),

  // High arousal. Wide eyes, raised brows, open mouth mid-sentence.
  energy: vec({
    browInnerUp: 0.54,
    browOuterUp: 0.62,
    eyeWide: 0.78,
    eyeSquint: -0.2,
    jawOpen: 0.68,
    mouthSmile: 0.52,
    mouthFunnel: 0.22,
    cheekRaise: 0.34,
    headPitch: -0.24,
    headYaw: -0.14,
    breath: 0.42,
    tension: 0.74,
    pupil: 0.86,
  }),

  // Exhausted euphoria. Breath heavy, eyes narrowed against the effort,
  // but the mouth still lifted. Tension high in the brow only.
  grit: vec({
    browInnerUp: 0.1,
    browOuterUp: -0.2,
    browDown: 0.44,
    eyeSquint: 0.66,
    eyeWide: -0.4,
    noseSneer: 0.34,
    cheekRaise: 0.22,
    mouthPress: 0.28,
    mouthSmile: 0.24,
    jawOpen: 0.42,
    headPitch: 0.26,
    headTilt: -0.16,
    breath: 0.72,
    tension: 0.92,
    pupil: 0.24,
  }),

  // Awestruck. Brows peaked, mouth slightly open, eyes wide and soft.
  wonder: vec({
    browInnerUp: 0.82,
    browOuterUp: 0.54,
    eyeWide: 0.66,
    eyeSquint: -0.16,
    jawOpen: 0.22,
    mouthFunnel: 0.16,
    headPitch: -0.34,
    headTilt: -0.2,
    breath: 0.24,
    tension: 0.04,
    pupil: 0.92,
  }),

  // Genuine fondness. Soft Duchenne, heavy-lidded, head tilted in.
  warmth: vec({
    browInnerUp: 0.16,
    browOuterUp: 0.1,
    eyeSquint: 0.38,
    eyeWide: -0.16,
    cheekRaise: 0.54,
    mouthSmile: 0.62,
    mouthPress: -0.1,
    headTilt: 0.28,
    headYaw: 0.14,
    headPitch: 0.08,
    breath: 0.2,
    tension: 0.02,
    pupil: 0.4,
  }),

  // One brow up, asymmetry everywhere. Used for "this doesn't add up".
  doubt: vec({
    browInnerUp: 0.58,
    browOuterUp: -0.44,
    browDown: 0.2,
    eyeSquint: 0.34,
    eyeWide: -0.12,
    mouthPress: 0.36,
    mouthFrown: 0.34,
    headTilt: 0.34,
    headYaw: -0.24,
    headPitch: 0.1,
    breath: 0.18,
    tension: 0.44,
    pupil: 0.34,
    // One brow up, the other down — the tell for "this doesn't add up".
    asym: 0.44,
  }),
};

export const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as ExpressionKey[];

/** Per-emotion light rig + colour grade + audio character. */
export interface EmotionAura {
  keyColor: string;
  fillColor: string;
  rimColor: string;
  lightIntensity: number;
  bloomIntensity: number;
  fogDensity: number;
  /** Heart rate in BPM — drives the audio pulse and the ambient light throb. */
  bpm: number;
  /** Drone character for the audio engine. */
  drone: { root: number; cutoff: number; detune: number; shimmer: number };
}

export const AURAS: Record<ExpressionKey, EmotionAura> = {
  neutral: {
    keyColor: "#7dd3fc",
    fillColor: "#1e3a5f",
    rimColor: "#38bdf8",
    lightIntensity: 1.0,
    bloomIntensity: 0.5,
    fogDensity: 0.019,
    bpm: 62,
    drone: { root: 55, cutoff: 420, detune: 3, shimmer: 0.12 },
  },
  focus: {
    keyColor: "#fbbf24",
    fillColor: "#3b1d02",
    rimColor: "#f97316",
    lightIntensity: 1.35,
    bloomIntensity: 0.66,
    fogDensity: 0.023,
    bpm: 128,
    drone: { root: 73.42, cutoff: 300, detune: 6, shimmer: 0.08 },
  },
  contemplation: {
    keyColor: "#67e8f9",
    fillColor: "#083344",
    rimColor: "#06b6d4",
    lightIntensity: 1.1,
    bloomIntensity: 0.58,
    fogDensity: 0.026,
    bpm: 58,
    drone: { root: 51.91, cutoff: 240, detune: 2, shimmer: 0.2 },
  },
  joy: {
    keyColor: "#f9a8d4",
    fillColor: "#500724",
    rimColor: "#ec4899",
    lightIntensity: 1.45,
    bloomIntensity: 0.82,
    fogDensity: 0.017,
    bpm: 104,
    drone: { root: 65.41, cutoff: 760, detune: 8, shimmer: 0.36 },
  },
  energy: {
    keyColor: "#fde047",
    fillColor: "#4a3208",
    rimColor: "#eab308",
    lightIntensity: 1.6,
    bloomIntensity: 0.9,
    fogDensity: 0.015,
    bpm: 132,
    drone: { root: 82.41, cutoff: 980, detune: 12, shimmer: 0.44 },
  },
  grit: {
    keyColor: "#fca5a5",
    fillColor: "#450a0a",
    rimColor: "#ef4444",
    lightIntensity: 1.3,
    bloomIntensity: 0.72,
    fogDensity: 0.028,
    bpm: 148,
    drone: { root: 41.2, cutoff: 520, detune: 4, shimmer: 0.1 },
  },
  wonder: {
    keyColor: "#d8b4fe",
    fillColor: "#2e1065",
    rimColor: "#a855f7",
    lightIntensity: 1.4,
    bloomIntensity: 0.95,
    fogDensity: 0.013,
    bpm: 76,
    drone: { root: 98, cutoff: 1240, detune: 16, shimmer: 0.6 },
  },
  warmth: {
    keyColor: "#6ee7b7",
    fillColor: "#04392a",
    rimColor: "#10b981",
    lightIntensity: 1.2,
    bloomIntensity: 0.68,
    fogDensity: 0.018,
    bpm: 70,
    drone: { root: 58.27, cutoff: 640, detune: 5, shimmer: 0.28 },
  },
  doubt: {
    keyColor: "#a5b4fc",
    fillColor: "#1e1b4b",
    rimColor: "#6366f1",
    lightIntensity: 1.05,
    bloomIntensity: 0.46,
    fogDensity: 0.024,
    bpm: 84,
    drone: { root: 61.74, cutoff: 340, detune: 9, shimmer: 0.18 },
  },
};

/**
 * Canonical vector -> morph target names.
 *
 * Kept side-agnostic: each entry is the *base* name, and side variants are
 * derived by suffix. That covers the three conventions in circulation —
 * ARKit/ARKit-blendshape (`browDown_L`), MetaHuman & Mixamo
 * (`browDownLeft`), and symmetric rigs that ship only `browDown` — without
 * the alias table exploding into two names per channel per convention.
 */
const MORPH_BASE: Record<keyof ExpressionVector, string[]> = {
  browInnerUp: ["browInnerUp", "InnerBrowUp", "brow_inner_up", "FACS.BrowInnerUp"],
  browOuterUp: ["browOuterUp", "OuterBrowUp", "brow_outer_up", "FACS.BrowUpperOuter"],
  browDown: ["browDown", "BrowLowerer", "brow_down", "FACS.BrowLowerer"],
  eyeWide: ["eyeWide", "EyeWidener", "eye_wide", "FACS.EyeWidener"],
  eyeSquint: ["eyeSquint", "eye_squint", "FACS.EyeSquint"],
  eyeBlink: ["eyeBlink", "blink", "Blink", "eye_blink", "FACS.EyeClosure"],
  cheekRaise: ["cheekSquint", "CheekSquint", "cheek_squint", "FACS.CheekSquint"],
  cheekPuff: ["cheekPuff", "CheekPuff", "cheek_puff", "FACS.CheekPuff"],
  noseSneer: ["noseSneer", "NoseWrinkle", "nose_sneer", "FACS.NoseWrinkle"],
  jawOpen: ["jawOpen", "JawOpen", "jaw_open", "FACS.JawDrop"],
  mouthSmile: ["mouthSmile", "MouthSmile", "mouth_smile", "FACS.MouthSmile"],
  mouthFrown: ["mouthFrown", "MouthFrown", "mouth_frown", "FACS.MouthFrown"],
  mouthPress: ["mouthPress", "MouthPressor", "mouth_press", "FACS.MouthPressor"],
  mouthPucker: ["mouthPucker", "MouthPucker", "mouth_pucker", "FACS.MouthPucker"],
  mouthFunnel: ["mouthFunnel", "MouthFunnel", "mouth_funnel", "FACS.MouthFunnel"],
  headTilt: ["HeadTilt", "headTilt", "Head.Roll"],
  headYaw: ["HeadTurn", "headYaw", "Head.Yaw"],
  headPitch: ["HeadNod", "headPitch", "Head.Pitch"],
  breath: [],
  tension: [],
  pupil: [],
  asym: [],
};

/** Eye-gaze morphs, resolved separately — gaze is a driver output, not a channel. */
const GAZE_BASES = {
  /** [outward, inward] */
  x: ["eyeLookOut", "eyeLookIn"],
  /** [up, down] */
  y: ["eyeLookUp", "eyeLookDown"],
} as const;

const SIDE_SUFFIX = {
  l: ["Left", "_L", "_left", ".l", "L"],
  r: ["Right", "_R", "_right", ".r", "R"],
} as const;

/** Every name this rig might use for `base` on `side`, most idiomatic first. */
function sideNames(base: string, side: "l" | "r"): string[] {
  const out: string[] = [];
  for (const suffix of SIDE_SUFFIX[side]) out.push(base + suffix);
  return out;
}

/**
 * A resolved morph binding: indices into `mesh.morphTargetInfluences`.
 * `c` is the symmetric target; `l`/`r` are the per-side ones. When a rig
 * has no per-side targets, `l` and `r` stay undefined and the renderer
 * falls back to `c` for both halves.
 */
export interface MorphBinding {
  c?: number;
  l?: number;
  r?: number;
}

export type MorphMap = Partial<Record<keyof ExpressionVector, MorphBinding>>;

function lookup(dict: Record<string, number> | undefined, name: string): number | undefined {
  if (!dict) return undefined;
  const direct = dict[name];
  if (direct !== undefined) return direct;
  // Tolerate case differences in imported rigs without a linear scan.
  const lower = name.toLowerCase();
  for (const key in dict) {
    if (key.toLowerCase() === lower) return dict[key];
  }
  return undefined;
}

function firstHit(dict: Record<string, number> | undefined, names: string[]): number | undefined {
  for (const name of names) {
    const hit = lookup(dict, name);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/**
 * Binds every expression channel against one mesh's morph dictionary.
 * Side variants are only claimed when the rig actually carries them, so a
 * symmetric rig never binds its centre target twice with conflicting gains.
 */
export function bindMorphs(dict: Record<string, number> | undefined): MorphMap {
  const map: MorphMap = {};
  for (const key of Object.keys(MORPH_BASE) as (keyof ExpressionVector)[]) {
    const bases = MORPH_BASE[key];
    if (!bases.length) continue;
    const c = firstHit(dict, bases);
    const l = firstHit(dict, bases.flatMap((b) => sideNames(b, "l")));
    const r = firstHit(dict, bases.flatMap((b) => sideNames(b, "r")));
    if (c === undefined && l === undefined && r === undefined) continue;
    map[key] = { c, l: l ?? c, r: r ?? c };
  }
  return map;
}

/**
 * One gaze axis for one eye: `pos` is the target driven by a positive
 * offset, `neg` the one driven by a negative offset. Either may be absent
 * on rigs that only ship a partial eye-look set.
 */
export interface GazeAxis {
  pos?: number;
  neg?: number;
}

export type GazeMap = { xL: GazeAxis; xR: GazeAxis; yL: GazeAxis; yR: GazeAxis };

function resolveAxis(
  dict: Record<string, number> | undefined,
  [posBase, negBase]: readonly [string, string],
  side: "l" | "r"
): GazeAxis {
  return {
    pos: firstHit(dict, sideNames(posBase, side)) ?? firstHit(dict, [posBase]),
    neg: firstHit(dict, sideNames(negBase, side)) ?? firstHit(dict, [negBase]),
  };
}

/**
 * Resolves the four eye-gaze axes. Horizontal axes are mirrored by the
 * caller, not here — both eyes share one world-space gaze vector, and it is
 * the renderer's job to know that "right" is inward on the left eye.
 */
export function bindGaze(dict: Record<string, number> | undefined): GazeMap {
  return {
    xL: resolveAxis(dict, GAZE_BASES.x, "l"),
    xR: resolveAxis(dict, GAZE_BASES.x, "r"),
    yL: resolveAxis(dict, GAZE_BASES.y, "l"),
    yR: resolveAxis(dict, GAZE_BASES.y, "r"),
  };
}

/** Human-readable morph names a channel bound to, for the /face inspector. */
export function describeBinding(
  dict: Record<string, number> | undefined,
  binding: MorphBinding | undefined
): string {
  if (!dict || !binding) return "?";
  const names = Object.keys(dict);
  const pick = (i?: number) => (i === undefined ? undefined : names[i]);
  const c = pick(binding.c);
  if (c) return c;
  const [l, r] = [pick(binding.l), pick(binding.r)];
  return l && r ? `${l} / ${r}` : (l ?? r ?? "?");
}

/** Legacy flat alias list, kept for callers that only need name candidates. */
export const MORPH_LOOKUP = MORPH_BASE;

export const cloneExpression = (v: ExpressionVector): ExpressionVector => ({ ...v });