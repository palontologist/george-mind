"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD_RADIUS } from "../lib/layout";
import { dragGuard } from "../lib/dragGuard";

/**
 * First-person neural navigator.
 *
 * Pointer-lock mouse look + WASD with real acceleration, head bob that
 * scales with speed, a subtle camera roll into strafes, and soft radial
 * containment so you can never leave the mind.
 *
 * Touch devices get a virtual stick + drag-look fallback, because
 * pointer lock doesn't exist on mobile.
 */

const EYE_HEIGHT = 1.68;
const SPEED = 4.4;
const SPRINT = 9.5;

interface TouchState {
  active: boolean;
  id: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  lookX: number;
  lookY: number;
  moved: boolean;
}

export interface NavigatorState {
  position: THREE.Vector3;
  /** Movement speed normalised 0..1, used for FOV kick and audio. */
  intensity: number;
  locked: boolean;
  isTouch: boolean;
}

export default function FirstPersonRig({
  onMove,
  enabled,
}: {
  onMove?: (position: THREE.Vector3) => void;
  enabled: boolean;
}) {
  const { camera, gl } = useThree();

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const bobPhase = useRef(0);

  const isTouch = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    []
  );

  const touch = useRef<TouchState>({
    active: false,
    id: -1,
    originX: 0,
    originY: 0,
    x: 0,
    y: 0,
    lookX: 0,
    lookY: 0,
    moved: false,
  });

  const state = useMemo<NavigatorState>(
    () => ({
      position: new THREE.Vector3(0, EYE_HEIGHT, WORLD_RADIUS * 0.82),
      intensity: 0,
      locked: false,
      isTouch,
    }),
    [isTouch]
  );

  // --- Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (
        enabled &&
        ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ArrowUp", "ArrowDown"].includes(e.code)
      ) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [enabled]);

  // --- Mouse look (pointer lock), with a drag fallback when lock is denied
  useEffect(() => {
    if (isTouch) return;
    const el = gl.domElement;
    const dragging = { active: false, x: 0, y: 0 };

    const applyLook = (dx: number, dy: number, scale: number) => {
      yaw.current -= dx * scale;
      pitch.current -= dy * scale;
      pitch.current = THREE.MathUtils.clamp(pitch.current, -1.15, 1.05);
    };

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === el) {
        applyLook(e.movementX, e.movementY, 0.0021);
        return;
      }
      // No lock: dragging sweeps the view instead. The click that follows a
      // drag is suppressed by `moved` so it can't select a synapse core.
      if (dragging.active) {
        const dx = e.clientX - dragging.x;
        const dy = e.clientY - dragging.y;
        dragging.x = e.clientX;
        dragging.y = e.clientY;
        dragGuard.moved += Math.abs(dx) + Math.abs(dy);
        applyLook(dx, dy, 0.0042);
      }
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging.active = true;
      dragging.x = e.clientX;
      dragging.y = e.clientY;
      dragGuard.moved = 0;
      dragGuard.suppressClick = false;
    };
    const onUp = () => {
      // Swallow the click that ends a real drag. Cleared on the next press.
      dragGuard.suppressClick = dragGuard.moved > dragGuard.threshold;
      dragging.active = false;
    };

    const onLockChange = () => {
      state.locked = document.pointerLockElement === el;
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [gl, isTouch, state]);

  // --- Touch controls: left half drives movement, right half looks
  useEffect(() => {
    if (!isTouch) return;
    const el = gl.domElement;

    const onStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.45 && !touch.current.active) {
          touch.current = {
            active: true,
            id: t.identifier,
            originX: t.clientX,
            originY: t.clientY,
            x: t.clientX,
            y: t.clientY,
            lookX: 0,
            lookY: 0,
            moved: false,
          };
        } else if (t.clientX >= window.innerWidth * 0.45) {
          const other = touch.current;
          other.lookX = t.clientX;
          other.lookY = t.clientY;
          (other as TouchState & { lookId?: number }).lookId = t.identifier;
        }
      }
    };

    const onMoveEvt = (e: TouchEvent) => {
      const s = touch.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (s.active && t.identifier === s.id) {
          s.x = t.clientX;
          s.y = t.clientY;
          if (Math.hypot(s.x - s.originX, s.y - s.originY) > 8) s.moved = true;
        } else if (
          (s as TouchState & { lookId?: number }).lookId === t.identifier
        ) {
          yaw.current -= (t.clientX - s.lookX) * 0.005;
          pitch.current -= (t.clientY - s.lookY) * 0.005;
          pitch.current = THREE.MathUtils.clamp(pitch.current, -1.15, 1.05);
          s.lookX = t.clientX;
          s.lookY = t.clientY;
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      const s = touch.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === s.id) {
          s.active = false;
          s.id = -1;
          s.x = s.originX;
          s.y = s.originY;
        }
        if ((s as TouchState & { lookId?: number }).lookId === t.identifier) {
          (s as TouchState & { lookId?: number }).lookId = undefined;
        }
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMoveEvt, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMoveEvt);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [gl, isTouch]);

  const move = useMemo(
    () => new THREE.Vector3(),
    []
  );
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const roll = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // --- Desired direction from keys + touch stick
    forward.set(0, 0, 0);
    right.set(0, 0, 0);
    const k = keys.current;
    if (k.KeyW || k.ArrowUp) forward.z -= 1;
    if (k.KeyS || k.ArrowDown) forward.z += 1;
    if (k.KeyA) forward.x -= 1;
    if (k.KeyD) forward.x += 1;

    const s = touch.current;
    if (s.active) {
      const dx = (s.x - s.originX) / 70;
      const dy = (s.y - s.originY) / 70;
      const mag = Math.min(Math.hypot(dx, dy), 1);
      const norm = mag > 0.001 ? mag / Math.hypot(dx, dy) : 0;
      forward.z += dy * norm;
      forward.x += dx * norm;
    }

    const sprint = k.ShiftLeft || k.ShiftRight ? SPRINT : SPEED;
    const hasInput = forward.lengthSq() > 0.0001;
    if (hasInput) {
      forward.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current);
      right.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      move.copy(forward).multiplyScalar(sprint);
    }

    // Critically-damped-ish velocity so starts and stops have weight.
    const accel = 1 - Math.exp(-11 * dt);
    velocity.current.lerp(move, accel);
    if (velocity.current.lengthSq() < 1e-5) velocity.current.set(0, 0, 0);

    const pos = state.position;
    pos.addScaledVector(velocity.current, dt);

    // Soft containment — you feel the boundary before you hit it.
    const dist = Math.hypot(pos.x, pos.z);
    if (dist > WORLD_RADIUS) {
      const pull = (dist - WORLD_RADIUS) * 6;
      pos.x -= (pos.x / dist) * pull * dt;
      pos.z -= (pos.z / dist) * pull * dt;
    }

    // Head bob + strafe roll
    const speed = velocity.current.length();
    state.intensity += (Math.min(speed / SPRINT, 1) - state.intensity) * (1 - Math.exp(-6 * dt));
    bobPhase.current += dt * (6 + speed * 0.85);
    const bobAmount = Math.min(speed / SPRINT, 1);
    const bobY = Math.sin(bobPhase.current * 2) * 0.042 * bobAmount;
    const bobX = Math.sin(bobPhase.current) * 0.03 * bobAmount;

    const strafeRoll = -velocity.current.dot(right) * 0.007;
    roll.current += (strafeRoll - roll.current) * (1 - Math.exp(-7 * dt));

    camera.position.set(pos.x + bobX * 0.4, EYE_HEIGHT + bobY, pos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = roll.current + Math.sin(bobPhase.current) * 0.008 * bobAmount;

    onMove?.(pos);
  });

  useEffect(() => {
    (window as unknown as { __mindRig?: NavigatorState }).__mindRig = state;
  }, [state]);

  return null;
}

export { EYE_HEIGHT };

export function requestPointerLock(el: HTMLElement) {
  el.requestPointerLock?.();
}