"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  AURAS,
  EXPRESSIONS,
  type EmotionAura,
  type ExpressionKey,
  type ExpressionVector,
} from "./expressions";

/**
 * Drives a live ExpressionVector from a target emotion.
 *
 * Adds the things a still image can't: asymmetric blinks, breathing,
 * saccadic eye darts, micro head drift and a slow settle when the
 * emotion changes. Reads/writes a shared mutable ref so the render loop
 * never triggers a React re-render.
 */

export interface MindState {
  expression: ExpressionVector;
  aura: EmotionAura;
  /** 0..1, how strongly the current emotion is settled in. */
  settle: number;
  color: THREE.Color;
  /**
   * Saccadic gaze target, roughly -1..1 on each axis. Rigs with eye-look
   * morph targets read this directly; the procedural head steers its own
   * eye meshes from it.
   */
  gaze: THREE.Vector2;
}

const scratch = new THREE.Color();

export function createMindState(): MindState {
  return {
    expression: { ...EXPRESSIONS.neutral },
    aura: AURAS.neutral,
    settle: 0,
    color: new THREE.Color(AURAS.neutral.keyColor),
    gaze: new THREE.Vector2(),
  };
}

export function useMindDriver(
  mind: React.MutableRefObject<MindState>,
  target: React.MutableRefObject<ExpressionKey>,
) {
  const blink = useRef({ next: 2 + Math.random() * 3, t: -1, lid: 0, double: false });
  const gaze = useRef({ next: 0.6 + Math.random(), x: 0, y: 0, tx: 0, ty: 0 });
  const t = useRef(0);
  const settleRate = useRef(0.6);

  useEffect(() => {
    settleRate.current = 0.6;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt;
    const state = mind.current;
    const goal = EXPRESSIONS[target.current];
    const goalAura = AURAS[target.current];
    const k = 1 - Math.exp(-settleRate.current * dt);

    for (const key of Object.keys(goal) as (keyof ExpressionVector)[]) {
      state.expression[key] += (goal[key] - state.expression[key]) * k;
    }
    state.settle += (1 - state.settle) * (1 - Math.exp(-1.4 * dt));
    state.aura = goalAura;

    // --- Blink: mostly 90–200ms closures, occasional doubles, rarer when
    // the emotion demands wide eyes.
    const b = blink.current;
    b.next -= dt;
    if (b.t >= 0) {
      b.t += dt;
      const dur = b.double ? 0.26 : 0.13;
      const p = Math.min(b.t / dur, 1);
      b.lid = Math.sin(p * Math.PI) ** 0.7;
      if (p >= 1) {
        b.t = -1;
        b.lid = 0;
        b.next = 1.6 + Math.random() * 4.2;
        b.double = Math.random() < 0.18;
      }
    } else if (b.next <= 0) {
      b.t = 0;
      b.next = 99;
    }
    state.expression.eyeBlink = Math.min(1, b.lid * 1.15);

    // --- Saccades: quick dart, slow hold, occasional long linger.
    const g = gaze.current;
    g.next -= dt;
    if (g.next <= 0) {
      g.tx = (Math.random() - 0.5) * 1.5;
      g.ty = (Math.random() - 0.5) * 0.8;
      g.next = 0.35 + Math.random() * 1.9;
    }
    const gk = 1 - Math.exp(-11 * dt);
    g.x += (g.tx - g.x) * gk;
    g.y += (g.ty - g.y) * gk;
    state.gaze.set(g.x, g.y);

    const time = t.current;
    const breathRate = 0.22 + state.expression.breath * 0.42;
    const breath = Math.sin(time * breathRate * Math.PI * 2);
    const micro = Math.sin(time * 0.83) * 0.5 + Math.sin(time * 1.37 + 1.1) * 0.3;

    state.expression.headYaw += g.x * 0.035 + micro * 0.014;
    state.expression.headPitch += g.y * 0.028 + breath * 0.006;
    state.expression.headTilt += Math.sin(time * 0.41) * 0.012;

    scratch.set(goalAura.keyColor);
    state.color.lerp(scratch, 1 - Math.exp(-2.2 * dt));
  });
}